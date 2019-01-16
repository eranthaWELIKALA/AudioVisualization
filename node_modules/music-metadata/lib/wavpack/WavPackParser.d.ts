import { BasicParser } from '../common/BasicParser';
/**
 * WavPack Parser
 */
export declare class WavPackParser extends BasicParser {
    parse(): Promise<void>;
    parseWavPackBlocks(): Promise<void>;
    private parseMetadataSubBlock;
}
