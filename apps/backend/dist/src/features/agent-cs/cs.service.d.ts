import { PrismaService } from '../../core/prisma/prisma.service';
import { IncomingMessage, AgentResponse } from '../../core/omnichannel/interfaces/incoming-message.interface';
import { AgentSharedService } from '../../core/agent-shared/agent-shared.service';
export declare class CsService {
    private readonly prisma;
    private readonly agentSharedService;
    private readonly logger;
    constructor(prisma: PrismaService, agentSharedService: AgentSharedService);
    handleMessage(message: IncomingMessage, onChunk?: (chunk: string) => void): Promise<AgentResponse>;
}
