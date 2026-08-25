import { DataAgentService } from './data-agent.service';
export declare class KnowledgeController {
    private readonly dataAgentService;
    constructor(dataAgentService: DataAgentService);
    syncVectorKnowledge(): Promise<{
        inserted: number;
        errors: number;
    }>;
}
