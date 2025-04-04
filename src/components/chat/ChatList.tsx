import { DIDDocument } from 'smash-node-lib';

import { logger } from '../../lib/logger';
import { SmashConversation } from '../../lib/types';
import { NewConversationDialog } from './NewConversationDialog';

interface ChatListProps {
    conversations: SmashConversation[];
    selectedChat?: string;
    onSelectChat: (chatId: string) => void;
    onCreateConversation: (didDoc: DIDDocument) => void;
    peerProfiles: Record<
        string,
        { title: string; description: string; avatar: string }
    >;
}

interface ChatItemProps {
    chat: SmashConversation;
    isSelected: boolean;
    onSelect: (chatId: string) => void;
    peerProfile?: { title: string; description: string; avatar: string } | null;
}

function ChatItem({ chat, isSelected, onSelect, peerProfile }: ChatItemProps) {
    const getParticipantNames = () => {
        if (chat.type === 'direct') {
            return (
                peerProfile?.title ||
                chat.participants.find((p) => p !== 'You') ||
                'Unknown'
            );
        }
        return chat.participants.filter((p) => p !== 'You').join(', ');
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getMediaTypePreview = (mimeType: string) => {
        if (mimeType.startsWith('image/')) {
            return '📷 Image';
        } else if (mimeType.startsWith('video/')) {
            return '🎬 Video';
        } else if (mimeType.startsWith('audio/')) {
            return '🎵 Audio';
        } else {
            return '📎 Attachment';
        }
    };

    const getMessagePreview = () => {
        if (!chat.lastMessage) return 'No messages yet';

        if (chat.lastMessage.type === 'im.chat.media.embedded') {
            const mediaContent = chat.lastMessage.content;
            return getMediaTypePreview(mediaContent.mimeType);
        }

        return typeof chat.lastMessage.content === 'string'
            ? chat.lastMessage.content
            : 'Message';
    };

    return (
        <button
            onClick={() => onSelect(chat.id)}
            className={`chat-item ${isSelected ? 'selected' : ''}`}
        >
            <div className="chat-item-header">
                <span className="chat-item-name">{getParticipantNames()}</span>
                <div className="chat-item-meta">
                    {chat.unreadCount > 0 && (
                        <span className="chat-badge">{chat.unreadCount}</span>
                    )}
                    {chat.lastMessage && (
                        <span className="chat-item-time">
                            {formatTime(chat.lastMessage.timestamp)}
                        </span>
                    )}
                </div>
            </div>
            <p className="chat-item-preview">{getMessagePreview()}</p>
        </button>
    );
}

export function ChatList({
    conversations,
    selectedChat,
    onSelectChat,
    onCreateConversation,
    peerProfiles,
}: ChatListProps) {
    const handleSelectChat = (chatId: string) => {
        logger.debug('Selecting chat', { chatId });
        onSelectChat(chatId);
    };

    const handleCreateConversation = (didDoc: DIDDocument) => {
        logger.info('Creating new conversation', { didId: didDoc.id });
        onCreateConversation(didDoc);
    };

    return (
        <div className="chat-list-container">
            <NewConversationDialog
                onCreateConversation={handleCreateConversation}
            />
            <div className="overflow-y-auto flex-1">
                {conversations.map((chat) => (
                    <ChatItem
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChat === chat.id}
                        onSelect={handleSelectChat}
                        peerProfile={
                            chat.type === 'direct'
                                ? peerProfiles[chat.id]
                                : null
                        }
                    />
                ))}
            </div>
        </div>
    );
}
