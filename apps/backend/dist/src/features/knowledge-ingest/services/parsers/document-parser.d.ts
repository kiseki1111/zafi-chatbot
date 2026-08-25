export declare class DocumentParser {
    parsePdf(buffer: Buffer): Promise<string>;
    parseDocx(buffer: Buffer): Promise<string>;
}
