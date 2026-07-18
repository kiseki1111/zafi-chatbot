import { ChatsService } from './chats.service';
export declare class ChatsController {
    private readonly chatsService;
    constructor(chatsService: ChatsService);
    getConversations(instanceName?: string): Promise<{
        contactName: string;
        contactNumber: string;
        contact: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            email: string | null;
            phone: string;
        };
        messages: {
            id: string;
            content: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            status: string;
            wahaMessageId: string | null;
            senderType: string;
            messageType: string;
            conversationId: string;
            senderId: string | null;
        }[];
        assignedTo: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        id: string;
        createdAt: Date;
        status: string;
        instanceName: string;
        contactId: string;
        unreadCount: number;
        assignedToId: string | null;
        lastMessageAt: Date;
    }[]>;
    getMessages(id: string, skip: number, take: number): Promise<({
        sender: {
            id: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        content: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        status: string;
        wahaMessageId: string | null;
        senderType: string;
        messageType: string;
        conversationId: string;
        senderId: string | null;
    })[]>;
}
