import type { Response } from 'express';
import { AgentAssistantService } from '../agent-assistant/agent-assistant.service';
import { CsService } from '../agent-cs/cs.service';
import { PrismaService } from '../../core/prisma/prisma.service';
export declare class SimulatorController {
    private readonly agentAssistantService;
    private readonly csService;
    private readonly prisma;
    private readonly logger;
    private readonly INSTANCE_NAME;
    constructor(agentAssistantService: AgentAssistantService, csService: CsService, prisma: PrismaService);
    private saveMessageToDb;
    getHistory(chatId: string): Promise<{
        messages: {
            id: string;
            sender: string;
            text: string;
        }[];
    }>;
    chatSimulator(body: {
        message: string;
        simulateAs: 'customer' | 'owner';
        tenantId: string;
        chatId: string;
    }, res: Response): Promise<void>;
}
