import { KnowledgeService } from './knowledge.service';
import { DataAgentService } from './data-agent.service';
export declare class KnowledgeController {
    private readonly knowledgeService;
    private readonly dataAgentService;
    constructor(knowledgeService: KnowledgeService, dataAgentService: DataAgentService);
    syncGoogleSheet(): Promise<any>;
    syncVectorKnowledge(): Promise<{
        inserted: number;
        errors: number;
    }>;
}
