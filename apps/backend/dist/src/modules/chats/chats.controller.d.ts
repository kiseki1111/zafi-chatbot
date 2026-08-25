import { ChatsService } from './chats.service';
export declare class ChatsController {
    private readonly chatsService;
    constructor(chatsService: ChatsService);
    getConversations(instanceName?: string): Promise<{
        contactName: string;
        contactNumber: string;
        contact: {
            status: string;
            id: string;
            name: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
        };
        messages: {
            status: string;
            id: string;
            createdAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            content: string;
            wahaMessageId: string | null;
            conversationId: string;
            senderType: string;
            senderId: string | null;
            messageType: string;
        }[];
        assignedTo: {
            id: string;
            name: string | null;
            email: string;
        } | null;
        status: string;
        id: string;
        createdAt: Date;
        contactId: string;
        instanceName: string;
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
        status: string;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
        wahaMessageId: string | null;
        conversationId: string;
        senderType: string;
        senderId: string | null;
        messageType: string;
    })[]>;
}
