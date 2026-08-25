export interface AgentResponse {
    text: string;
    images: {
        url: string;
        caption: string;
    }[];
    order?: any;
}
export interface IncomingMessage {
    senderId: string;
    text: string;
    provider: 'TELEGRAM' | 'WAHA';
    mediaUrls?: string[];
    sessionName?: string;
    tenantId?: string;
    replyCallback: (response: AgentResponse) => Promise<void>;
}
