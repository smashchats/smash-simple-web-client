import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { DIDDocument, IIMPeerIdentity } from 'smash-node-lib';

import { logger } from './logger';

interface SmashDBSchema extends DBSchema {
    messages: {
        key: string;
        value: StoredMessage;
        indexes: {
            'by-conversation': string;
            'by-timestamp': string;
        };
    };
    conversations: {
        key: string;
        value: StoredConversation;
        indexes: {
            'by-updated': string;
        };
    };
    identity: {
        key: 'current';
        value: {
            serializedIdentity: IIMPeerIdentity;
            profile: StoredProfile | null;
            smeConfig: SMEConfig | null;
        };
    };
    didDocuments: {
        key: string;
        value: DIDDocument;
    };
}

export interface StoredMessage {
    id: string;
    conversationId: string;
    content: string;
    sender: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read' | 'error';
}

export interface StoredProfile {
    title: string;
    description: string;
    avatar: string;
}

export interface SMEConfig {
    url: string;
    smePublicKey: string;
}

export interface StoredConversation {
    id: string;
    title: string;
    lastMessage?: StoredMessage;
    unreadCount: number;
    participants: string[];
    type: 'direct' | 'group';
    updatedAt: string;
}

export async function initDB() {
    return SmashDB.getInstance().init();
}

class SmashDB {
    private static instance: SmashDB;
    private db: IDBPDatabase<SmashDBSchema> | null = null;
    private dbName = 'smash-db';
    private version = 1; // Simplified versioning

    private constructor() {}

    static getInstance(): SmashDB {
        if (!SmashDB.instance) {
            SmashDB.instance = new SmashDB();
        }
        return SmashDB.instance;
    }

    async init(): Promise<void> {
        if (this.db) return;

        this.db = await openDB<SmashDBSchema>(this.dbName, this.version, {
            upgrade(db) {
                // Create all stores in one go
                const messageStore = db.createObjectStore('messages', {
                    keyPath: 'id',
                });
                messageStore.createIndex('by-conversation', 'conversationId');
                messageStore.createIndex('by-timestamp', 'timestamp');

                const conversationsStore = db.createObjectStore(
                    'conversations',
                    {
                        keyPath: 'id',
                    },
                );
                conversationsStore.createIndex('by-updated', 'updatedAt');

                db.createObjectStore('identity');

                // Add DID documents store
                db.createObjectStore('didDocuments', {
                    keyPath: 'id',
                });
            },
        });
    }

    // Identity management
    async getIdentity(): Promise<{
        serializedIdentity: IIMPeerIdentity;
        profile: StoredProfile | null;
        smeConfig: SMEConfig | null;
    } | null> {
        if (!this.db) throw new Error('Database not initialized');
        const result = await this.db.get('identity', 'current');
        return result || null;
    }

    async setIdentity(
        serializedIdentity: IIMPeerIdentity,
        profile: StoredProfile | null = null,
        smeConfig: SMEConfig | null = null,
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.put(
            'identity',
            { serializedIdentity, profile, smeConfig },
            'current',
        );
    }

    async updateProfile(profile: StoredProfile): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        const current = await this.getIdentity();
        if (!current) throw new Error('No identity found');
        await this.setIdentity(
            current.serializedIdentity,
            profile,
            current.smeConfig,
        );
    }

    async updateSMEConfig(smeConfig: SMEConfig): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        const current = await this.getIdentity();
        if (!current) throw new Error('No identity found');
        await this.setIdentity(
            current.serializedIdentity,
            current.profile,
            smeConfig,
        );
    }

    async clearIdentity(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        // Clear all stores
        const tx = this.db.transaction(
            ['identity', 'conversations', 'messages'],
            'readwrite',
        );
        await Promise.all([
            tx.objectStore('identity').clear(),
            tx.objectStore('conversations').clear(),
            tx.objectStore('messages').clear(),
        ]);
        await tx.done;
    }

    async addMessage(message: StoredMessage): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.put('messages', message);

        // Update conversation
        const conversation = (await this.db.get(
            'conversations',
            message.conversationId,
        )) || {
            id: message.conversationId,
            title: `Chat with ${message.sender}`,
            unreadCount: 0,
            participants: [message.sender],
            type: 'direct' as const,
            lastMessage: message,
            updatedAt: message.timestamp,
        };

        conversation.lastMessage = message;
        conversation.updatedAt = message.timestamp;

        await this.db.put('conversations', conversation);
    }

    async addConversation(conversation: StoredConversation): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');
        const tx = this.db.transaction('conversations', 'readwrite');
        await tx.store.put(conversation);
        await tx.done;
    }

    async updateConversation(conversation: StoredConversation): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');
        const tx = this.db.transaction('conversations', 'readwrite');
        await tx.store.put(conversation);
        await tx.done;
    }

    async updateMessageStatus(
        messageId: string,
        status: StoredMessage['status'],
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const message = await this.db.get('messages', messageId);
        if (!message) return;

        message.status = status;
        await this.db.put('messages', message);

        // Update conversation if it's the last message
        const conversation = await this.db.get(
            'conversations',
            message.conversationId,
        );
        if (conversation?.lastMessage?.id === messageId) {
            conversation.lastMessage = message;
            await this.db.put('conversations', conversation);
        }
    }

    async getMessages(
        conversationId: string,
        limit = 50,
    ): Promise<StoredMessage[]> {
        if (!this.db) throw new Error('Database not initialized');

        logger.debug('Getting messages for conversation', { conversationId });

        const messages = await this.db.getAllFromIndex(
            'messages',
            'by-conversation',
            conversationId,
        );

        logger.debug('Retrieved messages', {
            conversationId,
            count: messages.length,
        });

        // Sort by timestamp
        return messages
            .sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            )
            .slice(0, limit);
    }

    async getConversations(): Promise<StoredConversation[]> {
        if (!this.db) throw new Error('Database not initialized');
        logger.debug('Getting all conversations');
        const conversations = await this.db.getAllFromIndex(
            'conversations',
            'by-updated',
        );
        logger.debug('Retrieved conversations', {
            count: conversations.length,
        });
        return conversations;
    }

    async getConversation(id: string): Promise<StoredConversation | undefined> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');
        logger.debug('Getting conversation', { conversationId: id });
        const conversation = await this.db.get('conversations', id);
        if (conversation) {
            logger.debug('Found conversation', { conversationId: id });
        } else {
            logger.debug('Conversation not found', { conversationId: id });
        }
        return conversation;
    }

    async markConversationAsRead(conversationId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        logger.debug('Marking conversation as read', { conversationId });
        const conversation = await this.db.get('conversations', conversationId);
        if (!conversation) {
            logger.warn('Conversation not found for marking as read', {
                conversationId,
            });
            return;
        }

        conversation.unreadCount = 0;
        await this.db.put('conversations', conversation);
        logger.debug('Conversation marked as read', { conversationId });
    }

    async close(): Promise<void> {
        if (!this.db) return;
        logger.info('Closing database connection');
        this.db.close();
        this.db = null;
        logger.debug('Database connection closed');
    }

    // DID Document management
    async addDIDDocument(didDocument: DIDDocument): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.put('didDocuments', didDocument);
    }

    async getDIDDocument(did: string): Promise<DIDDocument | undefined> {
        if (!this.db) throw new Error('Database not initialized');
        return this.db.get('didDocuments', did);
    }

    async getAllDIDDocuments(): Promise<DIDDocument[]> {
        if (!this.db) throw new Error('Database not initialized');
        return this.db.getAll('didDocuments');
    }

    async clearDIDDocuments(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.clear('didDocuments');
    }
}

export const db = SmashDB.getInstance();
