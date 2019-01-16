'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const initDebug = require("debug");
const assert = require("assert");
const BasicParser_1 = require("../../common/BasicParser");
const SV8 = require("./StreamVersion8");
const APEv2Parser_1 = require("../../apev2/APEv2Parser");
const FourCC_1 = require("../../common/FourCC");
const debug = initDebug('music-metadata:parser:musepack');
class MpcSv8Parser extends BasicParser_1.BasicParser {
    constructor() {
        super(...arguments);
        this.audioLength = 0;
    }
    parse() {
        return __awaiter(this, void 0, void 0, function* () {
            const signature = yield this.tokenizer.readToken(FourCC_1.FourCcToken);
            assert.equal(signature, 'MPCK', 'Magic number');
            this.metadata.setFormat('dataformat', 'Musepack, SV8');
            return this.parsePacket();
        });
    }
    parsePacket() {
        return __awaiter(this, void 0, void 0, function* () {
            const sv8reader = new SV8.StreamReader(this.tokenizer);
            do {
                const header = yield sv8reader.readPacketHeader();
                debug(`packet-header key=${header.key}, payloadLength=${header.payloadLength}`);
                switch (header.key) {
                    case 'SH': // Stream Header
                        const sh = yield sv8reader.readStreamHeader(header.payloadLength);
                        this.metadata.setFormat('numberOfSamples', sh.sampleCount);
                        this.metadata.setFormat('sampleRate', sh.sampleFrequency);
                        this.metadata.setFormat('duration', sh.sampleCount / sh.sampleFrequency);
                        this.metadata.setFormat('numberOfChannels', sh.channelCount);
                        break;
                    case 'AP': // Audio Packet
                        this.audioLength += header.payloadLength;
                        yield this.tokenizer.ignore(header.payloadLength);
                        break;
                    case 'RG': // Replaygain
                    case 'EI': // Encoder Info
                    case 'SO': // Seek Table Offset
                    case 'ST': // Seek Table
                    case 'CT': // Chapter-Tag
                        yield this.tokenizer.ignore(header.payloadLength);
                        break;
                    case 'SE': // Stream End
                        this.metadata.setFormat('bitrate', this.audioLength * 8 / this.metadata.format.duration);
                        return APEv2Parser_1.APEv2Parser.parseTagHeader(this.metadata, this.tokenizer, this.options);
                    default:
                        throw new Error(`Unexpected header: ${header.key}`);
                }
            } while (true);
        });
    }
}
exports.MpcSv8Parser = MpcSv8Parser;
