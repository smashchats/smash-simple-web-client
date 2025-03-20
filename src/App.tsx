import { MessageSquare, Settings as SettingsIcon, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    DID,
    DIDDocument,
    IM_DID_DOCUMENT,
    IM_PROFILE,
    SmashMessaging,
} from 'smash-node-lib';

import { WelcomeGuide } from './components/WelcomeGuide';
import { ChatHeader } from './components/chat/ChatHeader';
import { ChatInput } from './components/chat/ChatInput';
import { ChatList } from './components/chat/ChatList';
import { ChatMessage } from './components/chat/ChatMessage';
import { Settings } from './components/settings/Settings';
import { CURRENT_USER, DEFAULT_SME_CONFIG, View } from './config/constants';
import { useConversationHandling } from './hooks/useConversationHandling';
import { useMessageHandling } from './hooks/useMessageHandling';
import { StoredConversation, db, initDB } from './lib/db';
import { useSmashIdentity } from './lib/hooks/useSmashIdentity';
import { logger } from './lib/logger';
import { getDidDocumentManager } from './lib/smash/smash-init';

function App() {
    const {
        identity,
        clearIdentity,
        profile,
        updateProfile,
        smeConfig,
        updateSMEConfig,
        isInitialized,
        setIdentity,
        smashUser,
    } = useSmashIdentity();

    const [selectedChat, setSelectedChat] = useState<string>();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('messages');
    const [isLoading, setIsLoading] = useState(false);
    const [peerProfiles, setPeerProfiles] = useState<
        Record<string, { title: string; description: string; avatar: string }>
    >({});

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        conversations,
        error: conversationError,
        updateConversationWithMessage,
        refreshConversations,
        addNewConversation,
    } = useConversationHandling();

    const {
        messages,
        error: messageError,
        sendMessage,
    } = useMessageHandling({
        selectedChat,
        onConversationUpdate: updateConversationWithMessage,
    });

    const [peerDidDocument, setPeerDidDocument] = useState<DIDDocument | null>(
        null,
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const initializeDatabase = async () => {
            try {
                logger.debug('Initializing database');
                await initDB();
                logger.debug('Database initialized successfully');

                if (identity) {
                    const didDocuments = await db.getAllDIDDocuments();
                    const didDocManager = getDidDocumentManager();

                    logger.debug('Loading cached DID documents', {
                        count: didDocuments.length,
                    });

                    didDocuments.forEach((doc) => didDocManager.set(doc));
                }
            } catch (err) {
                logger.error(
                    'Failed to initialize database or load DID documents',
                    err,
                );
            }
        };

        initializeDatabase();
    }, [identity]);

    useEffect(() => {
        const loadPeerProfiles = async () => {
            try {
                if (identity) {
                    logger.debug('Loading cached peer profiles');
                    const profiles = await db.getAllPeerProfiles();
                    setPeerProfiles(profiles);
                    logger.debug('Loaded peer profiles', {
                        count: Object.keys(profiles).length,
                    });
                }
            } catch (err) {
                logger.error('Failed to load peer profiles', err);
            }
        };

        loadPeerProfiles();
    }, [identity]);

    useEffect(() => {
        if (!identity || !smashUser) return;

        const handleDIDDocument = async (
            sender: string,
            message: { data: DIDDocument },
        ) => {
            try {
                logger.debug('Received DID document', {
                    from: sender,
                    did: message.data.id,
                });

                // Set in memory manager
                await getDidDocumentManager().set(message.data);
                // Persist to database
                await db.addDIDDocument(message.data);

                logger.debug('DID document cached successfully', {
                    did: message.data.id,
                });
            } catch (err) {
                logger.error('Failed to handle DID document', err);
            }
        };

        const handleProfile = async (
            sender: string,
            message: {
                data: { title: string; description: string; avatar: string };
            },
        ) => {
            try {
                logger.debug('Received profile update', {
                    from: sender,
                    title: message.data.title,
                });

                setPeerProfiles((prev) => ({
                    ...prev,
                    [sender]: message.data,
                }));

                await db.setPeerProfile(sender, message.data);

                const conversation = conversations.find((c) => c.id === sender);
                if (conversation && conversation.type === 'direct') {
                    const updatedConversation: StoredConversation = {
                        ...conversation,
                        title: message.data.title || sender.slice(0, 8) + '...',
                        updatedAt: new Date().toISOString(),
                        lastMessage: conversation.lastMessage
                            ? {
                                  ...conversation.lastMessage,
                                  timestamp:
                                      conversation.lastMessage.timestamp.toISOString(),
                                  status: conversation.lastMessage.status as
                                      | 'error'
                                      | 'sent'
                                      | 'delivered'
                                      | 'read',
                              }
                            : undefined,
                    };
                    await db.updateConversation(updatedConversation);
                    refreshConversations();
                }
            } catch (err) {
                logger.error('Failed to handle profile update', err);
            }
        };

        smashUser.on(IM_DID_DOCUMENT, handleDIDDocument);
        smashUser.on(IM_PROFILE, handleProfile);

        return () => {
            smashUser.off(IM_DID_DOCUMENT, handleDIDDocument);
            smashUser.off(IM_PROFILE, handleProfile);
        };
    }, [identity, smashUser, conversations, refreshConversations]);

    useEffect(() => {
        const loadPeerDidDocument = async () => {
            if (selectedChat) {
                try {
                    logger.debug('Loading peer DID document', { selectedChat });
                    // First try to get from local DB
                    let doc = await db.getDIDDocument(selectedChat);
                    if (!doc) {
                        // If not in DB, try to resolve
                        doc = await getDidDocumentManager().resolve(
                            selectedChat as DID,
                        );
                        if (doc) {
                            // Store for future use
                            await db.addDIDDocument(doc);
                        }
                    }
                    setPeerDidDocument(doc || null);
                } catch (err) {
                    logger.error('Failed to load peer DID document', err);
                    setPeerDidDocument(null);
                }
            } else {
                setPeerDidDocument(null);
            }
        };

        loadPeerDidDocument();
    }, [selectedChat]);

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        logger.info('Starting conversation creation process', {
            didId: didDoc.id,
        });

        try {
            const conversation: StoredConversation = {
                id: didDoc.id,
                title: `Chat with ${didDoc.id.slice(0, 8)}...`,
                participants: [CURRENT_USER, didDoc.id],
                type: 'direct',
                unreadCount: 0,
                updatedAt: new Date().toISOString(),
                lastMessage: undefined,
            };

            logger.debug('Adding conversation to database', {
                conversationId: conversation.id,
            });

            await db.addConversation(conversation);
            addNewConversation(conversation);
            setSelectedChat(conversation.id);

            logger.debug('Resolving DID document in SmashMessaging', {
                didId: didDoc.id,
            });
            SmashMessaging.resolve(didDoc);

            logger.info('Conversation creation completed successfully', {
                conversationId: conversation.id,
            });
        } catch (err) {
            logger.error('Failed to create conversation', err);
            throw err;
        }
    };

    const handleSelectChat = async (chatId: string) => {
        logger.debug('Selecting chat', { chatId });
        setSelectedChat(chatId);
        setIsMobileMenuOpen(false);
    };

    const handleLogout = async () => {
        logger.info('Logging out user');
        await clearIdentity();
    };

    if (!isInitialized) {
        logger.debug('Application not initialized, showing loading state');
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </div>
        );
    }

    if (!identity && isInitialized) {
        logger.debug('No identity found, showing welcome guide');
        return (
            <WelcomeGuide
                onCreateIdentity={async (newIdentity) => {
                    setIsLoading(true);
                    try {
                        await setIdentity(newIdentity, DEFAULT_SME_CONFIG);
                        logger.info(
                            'New identity created and set successfully',
                        );
                    } finally {
                        setIsLoading(false);
                    }
                }}
                isLoading={isLoading}
                error={conversationError || messageError}
            />
        );
    }

    logger.debug('Rendering main application view', {
        currentView,
        selectedChat,
        conversationCount: conversations.length,
    });

    const selectedConversation = conversations.find(
        (c) => c.id === selectedChat,
    );
    const peerProfile = selectedConversation
        ? peerProfiles[selectedConversation.id]
        : null;

    return (
        <div className="app-container">
            <nav className="sidebar">
                <button
                    className={`sidebar-button ${currentView === 'messages' ? 'active' : ''}`}
                    onClick={() => {
                        logger.debug('Switching to messages view');
                        setCurrentView('messages');
                    }}
                >
                    <MessageSquare size={24} />
                </button>
                <button
                    className={`sidebar-button ${currentView === 'explore' ? 'active' : ''}`}
                    onClick={() => {
                        logger.debug('Switching to explore view');
                        setCurrentView('explore');
                    }}
                >
                    <Users size={24} />
                </button>
                <button
                    className={`sidebar-button ${currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => {
                        logger.debug('Switching to settings view');
                        setCurrentView('settings');
                    }}
                >
                    <SettingsIcon size={24} />
                </button>
            </nav>

            {currentView === 'messages' && (
                <main className="chat-container">
                    <div
                        className={`chat-list-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}
                    >
                        <ChatList
                            conversations={conversations}
                            selectedChat={selectedChat}
                            onSelectChat={handleSelectChat}
                            onCreateConversation={handleCreateConversation}
                            peerProfiles={peerProfiles}
                        />
                    </div>

                    <div className="flex-1 flex flex-col">
                        {selectedChat ? (
                            <>
                                {peerDidDocument && (
                                    <ChatHeader
                                        didDocument={peerDidDocument}
                                        profile={peerProfile}
                                    />
                                )}
                                <div className="chat-messages-container">
                                    <div className="messages-container">
                                        {messages.map((message) => (
                                            <ChatMessage
                                                key={message.id}
                                                message={message}
                                                isOwnMessage={
                                                    message.sender ===
                                                    CURRENT_USER
                                                }
                                                peerProfile={
                                                    peerProfiles[message.sender]
                                                }
                                            />
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <ChatInput onSendMessage={sendMessage} />
                                </div>
                            </>
                        ) : (
                            <div className="no-chat-selected">
                                <p>Select a chat to start messaging</p>
                            </div>
                        )}
                    </div>
                </main>
            )}

            {currentView === 'explore' && (
                <main className="main-area">
                    <div className="explore-container">
                        <h2>Explore your neighborhood</h2>
                        <p>Coming soon...</p>
                    </div>
                </main>
            )}

            {currentView === 'settings' && (
                <main className="main-area">
                    <Settings
                        onLogout={handleLogout}
                        profile={profile}
                        onUpdateProfile={updateProfile}
                        smeConfig={smeConfig}
                        onUpdateSME={updateSMEConfig}
                        identity={identity}
                        smashUser={smashUser}
                    />
                </main>
            )}

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden"
                    onClick={() => {
                        logger.debug('Closing mobile menu');
                        setIsMobileMenuOpen(false);
                    }}
                />
            )}

            {(conversationError || messageError) && (
                <div className="error-toast">
                    <p>{(conversationError || messageError)?.message}</p>
                    <button
                        onClick={() => {
                            logger.debug(
                                'Refreshing conversations to clear errors',
                            );
                            refreshConversations();
                        }}
                        className="error-toast-close"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
