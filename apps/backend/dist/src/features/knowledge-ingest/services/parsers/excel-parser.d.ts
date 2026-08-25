import { ExtractedProductDto } from '../../dto/extracted-product.dto';
import { AgentSharedService } from '../../../../core/agent-shared/agent-shared.service';
export declare class ExcelParser {
    private readonly agentSharedService;
    private readonly logger;
    constructor(agentSharedService: AgentSharedService);
    parseBuffer(buffer: Buffer): Promise<ExtractedProductDto[]>;
}
