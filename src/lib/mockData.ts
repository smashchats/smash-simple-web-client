import { MessageStatus, SmashConversation, SmashMessage } from './types';

// Helper function to create a timestamp within the last 24 hours
const getRecentTimestamp = (hoursAgo: number) => {
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);
    return date;
};

// Helper function to create a message
const createMessage = (
    id: string,
    conversationId: string,
    content: string,
    sender: string,
    hoursAgo: number,
    status: MessageStatus = 'delivered',
): SmashMessage => ({
    id,
    conversationId,
    content,
    sender,
    timestamp: getRecentTimestamp(hoursAgo),
    status,
});

// Mock messages for each conversation
export const mockMessages: { [key: string]: SmashMessage[] } = {
    conv1: [
        createMessage(
            'msg1_1',
            'conv1',
            "Hi there! How's your day going?",
            'Alice',
            2.5,
        ),
        createMessage(
            'msg1_2',
            'conv1',
            'Pretty good, thanks! Just working on that new feature we discussed',
            'You',
            2.4,
            'read',
        ),
        createMessage(
            'msg1_3',
            'conv1',
            "Oh nice! How's it coming along?",
            'Alice',
            2.3,
        ),
        createMessage(
            'msg1_4',
            'conv1',
            'Making good progress. The basic functionality is working',
            'You',
            2.2,
            'read',
        ),
        createMessage(
            'msg1_5',
            'conv1',
            "That's great to hear! Let me know if you need any help with testing",
            'Alice',
            2.1,
        ),
        createMessage(
            'msg1_6',
            'conv1',
            'Will do, thanks! 👍',
            'You',
            2.0,
            'read',
        ),
        createMessage(
            'msg1_7',
            'conv1',
            'Hey, how are you doing? 👋',
            'Alice',
            0.5,
        ),
    ],
    conv2: [
        createMessage(
            'msg2_1',
            'conv2',
            "Team, I've pushed the latest changes to the repo",
            'Bob',
            5,
        ),
        createMessage(
            'msg2_2',
            'conv2',
            "Thanks Bob! I'll take a look",
            'You',
            4.8,
            'read',
        ),
        createMessage(
            'msg2_3',
            'conv2',
            'The new UI looks much better!',
            'Charlie',
            4.5,
        ),
        createMessage(
            'msg2_4',
            'conv2',
            'Agreed! The animations are smooth',
            'Diana',
            4.2,
        ),
        createMessage('msg2_5', 'conv2', 'Thanks everyone! 🎉', 'Bob', 4),
        createMessage(
            'msg2_6',
            'conv2',
            'Should we schedule a demo for the stakeholders?',
            'Charlie',
            3.5,
        ),
        createMessage(
            'msg2_7',
            'conv2',
            'Good idea! How about next Tuesday?',
            'You',
            3.2,
            'read',
        ),
        createMessage('msg2_8', 'conv2', 'Works for me!', 'Diana', 3),
        createMessage(
            'msg2_9',
            'conv2',
            'Great progress everyone! The demo looks fantastic.',
            'Bob',
            2,
        ),
    ],
    conv3: [
        createMessage(
            'msg3_1',
            'conv3',
            'Hey Bob, could you review my PR when you have a moment?',
            'You',
            6,
            'read',
        ),
        createMessage(
            'msg3_2',
            'conv3',
            "Sure thing! I'll look at it now",
            'Bob',
            5.8,
        ),
        createMessage(
            'msg3_3',
            'conv3',
            'Just finished the review. Left a few comments',
            'Bob',
            5.2,
        ),
        createMessage(
            'msg3_4',
            'conv3',
            "Thanks! Those are good points. I'll make the changes",
            'You',
            5,
            'read',
        ),
        createMessage(
            'msg3_5',
            'conv3',
            "Perfect! Let me know when it's ready for another look",
            'Bob',
            4.8,
        ),
        createMessage(
            'msg3_6',
            'conv3',
            'Changes are done. Much cleaner now!',
            'You',
            4.5,
            'read',
        ),
        createMessage(
            'msg3_7',
            'conv3',
            'Looks great! Approved and merged 👍',
            'Bob',
            4.2,
        ),
        createMessage(
            'msg3_8',
            'conv3',
            'Thanks for the help with the code review!',
            'You',
            4,
            'read',
        ),
    ],
    conv4: [
        createMessage(
            'msg4_1',
            'conv4',
            "Hi team, I've started working on the new design system",
            'Eva',
            12,
        ),
        createMessage(
            'msg4_2',
            'conv4',
            'Looking forward to seeing it!',
            'You',
            11.8,
            'read',
        ),
        createMessage(
            'msg4_3',
            'conv4',
            'Will this include dark mode?',
            'Frank',
            11.5,
        ),
        createMessage(
            'msg4_4',
            'conv4',
            'Yes, dark mode is a priority',
            'Eva',
            11.2,
        ),
        createMessage(
            'msg4_5',
            'conv4',
            'Awesome! Our users will love that',
            'Grace',
            11,
        ),
        createMessage(
            'msg4_6',
            'conv4',
            'Updated the mockups in Figma, please check when you can.',
            'Eva',
            6,
        ),
    ],
    conv5: [
        createMessage(
            'msg5_1',
            'conv5',
            'Morning! Quick question about the API',
            'You',
            24,
            'read',
        ),
        createMessage('msg5_2', 'conv5', "Sure, what's up?", 'Charlie', 23.8),
        createMessage(
            'msg5_3',
            'conv5',
            'Are we using GraphQL for the new endpoints?',
            'You',
            23.5,
            'read',
        ),
        createMessage(
            'msg5_4',
            'conv5',
            "Yes, that's the plan. It'll give us more flexibility",
            'Charlie',
            23.2,
        ),
        createMessage('msg5_5', 'conv5', 'Got it, thanks!', 'You', 23, 'read'),
        createMessage(
            'msg5_6',
            'conv5',
            'No problem! Let me know if you need any help',
            'Charlie',
            22.5,
        ),
        createMessage('msg5_7', 'conv5', 'Will do!', 'You', 22, 'read'),
        createMessage(
            'msg5_8',
            'conv5',
            'See you at the standup tomorrow!',
            'Charlie',
            12,
            'read',
        ),
    ],
};

export const mockConversations: SmashConversation[] = [
    {
        id: 'conv1',
        title: 'Alice',
        unreadCount: 2,
        participants: ['You', 'Alice'],
        type: 'direct',
        lastMessage: createMessage(
            'msg1',
            'conv1',
            'Hey, how are you doing? 👋',
            'Alice',
            0.5,
        ),
    },
    {
        id: 'conv2',
        title: 'Project Team',
        unreadCount: 5,
        participants: ['You', 'Bob', 'Charlie', 'Diana'],
        type: 'group',
        lastMessage: createMessage(
            'msg2',
            'conv2',
            'Great progress everyone! The demo looks fantastic.',
            'Bob',
            2,
        ),
    },
    {
        id: 'conv3',
        title: 'Bob',
        unreadCount: 0,
        participants: ['You', 'Bob'],
        type: 'direct',
        lastMessage: createMessage(
            'msg3',
            'conv3',
            'Thanks for the help with the code review!',
            'You',
            4,
            'read',
        ),
    },
    {
        id: 'conv4',
        title: 'Design Team',
        unreadCount: 1,
        participants: ['You', 'Eva', 'Frank', 'Grace'],
        type: 'group',
        lastMessage: createMessage(
            'msg4',
            'conv4',
            'Updated the mockups in Figma, please check when you can.',
            'Eva',
            6,
        ),
    },
    {
        id: 'conv5',
        title: 'Charlie',
        unreadCount: 0,
        participants: ['You', 'Charlie'],
        type: 'direct',
        lastMessage: createMessage(
            'msg5',
            'conv5',
            'See you at the standup tomorrow!',
            'Charlie',
            12,
            'read',
        ),
    },
];
