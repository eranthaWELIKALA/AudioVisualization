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
const Util_1 = require("../common/Util");
const Token = require("token-types");
const Vorbis_1 = require("../ogg/vorbis/Vorbis");
const AbstractID3Parser_1 = require("../id3v2/AbstractID3Parser");
const FourCC_1 = require("../common/FourCC");
const _debug = require("debug");
const debug = _debug('music-metadata:parser:FLAC');
/**
 * FLAC supports up to 128 kinds of metadata blocks; currently the following are defined:
 * ref: https://xiph.org/flac/format.html#metadata_block
 */
var BlockType;
(function (BlockType) {
    BlockType[BlockType["STREAMINFO"] = 0] = "STREAMINFO";
    BlockType[BlockType["PADDING"] = 1] = "PADDING";
    BlockType[BlockType["APPLICATION"] = 2] = "APPLICATION";
    BlockType[BlockType["SEEKTABLE"] = 3] = "SEEKTABLE";
    BlockType[BlockType["VORBIS_COMMENT"] = 4] = "VORBIS_COMMENT";
    BlockType[BlockType["CUESHEET"] = 5] = "CUESHEET";
    BlockType[BlockType["PICTURE"] = 6] = "PICTURE";
})(BlockType || (BlockType = {}));
class FlacParser extends AbstractID3Parser_1.AbstractID3Parser {
    constructor() {
        super(...arguments);
        this.padding = 0;
    }
    static getInstance() {
        return new FlacParser();
    }
    _parse() {
        return __awaiter(this, void 0, void 0, function* () {
            const fourCC = yield this.tokenizer.readToken(FourCC_1.FourCcToken);
            if (fourCC.toString() !== 'fLaC') {
                throw new Error('Invalid FLAC preamble');
            }
            let blockHeader;
            do {
                // Read block header
                blockHeader = yield this.tokenizer.readToken(Metadata.BlockHeader);
                // Parse block data
                yield this.parseDataBlock(blockHeader);
            } while (!blockHeader.lastBlock);
            if (this.tokenizer.fileSize && this.metadata.format.duration) {
                const dataSize = this.tokenizer.fileSize - this.tokenizer.position;
                this.metadata.setFormat('bitrate', 8 * dataSize / this.metadata.format.duration);
            }
        });
    }
    addTag(id, value) {
        this.metadata.addTag('vorbis', id, value);
    }
    parseDataBlock(blockHeader) {
        debug(`blockHeader type=${blockHeader.type}, length=${blockHeader.length}`);
        switch (blockHeader.type) {
            case BlockType.STREAMINFO:
                return this.parseBlockStreamInfo(blockHeader.length);
            case BlockType.PADDING:
                this.padding += blockHeader.length;
                break;
            case BlockType.APPLICATION:
                break;
            case BlockType.SEEKTABLE:
                break;
            case BlockType.VORBIS_COMMENT:
                return this.parseComment(blockHeader.length);
            case BlockType.CUESHEET:
                break;
            case BlockType.PICTURE:
                return this.parsePicture(blockHeader.length);
            default:
                this.warnings.push('Unknown block type: ' + blockHeader.type);
        }
        // Ignore data block
        return this.tokenizer.readToken(new Token.IgnoreType(blockHeader.length));
    }
    /**
     * Parse STREAMINFO
     */
    parseBlockStreamInfo(dataLen) {
        return __awaiter(this, void 0, void 0, function* () {
            if (dataLen !== Metadata.BlockStreamInfo.len)
                throw new Error('Unexpected block-stream-info length');
            const streamInfo = yield this.tokenizer.readToken(Metadata.BlockStreamInfo);
            this.metadata.setFormat('dataformat', 'flac');
            this.metadata.setFormat('lossless', true);
            this.metadata.setFormat('numberOfChannels', streamInfo.channels);
            this.metadata.setFormat('bitsPerSample', streamInfo.bitsPerSample);
            this.metadata.setFormat('sampleRate', streamInfo.sampleRate);
            this.metadata.setFormat('duration', streamInfo.totalSamples / streamInfo.sampleRate);
        });
    }
    /**
     * Parse VORBIS_COMMENT
     * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
     */
    parseComment(dataLen) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.tokenizer.readToken(new Token.BufferType(dataLen));
            const decoder = new DataDecoder(data);
            decoder.readStringUtf8(); // vendor (skip)
            const commentListLength = decoder.readInt32();
            for (let i = 0; i < commentListLength; i++) {
                const comment = decoder.readStringUtf8();
                const split = comment.split('=');
                this.addTag(split[0].toUpperCase(), split.splice(1).join('='));
            }
        });
    }
    parsePicture(dataLen) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.skipCovers) {
                return this.tokenizer.ignore(dataLen);
            }
            else {
                const picture = yield this.tokenizer.readToken(new Vorbis_1.VorbisPictureToken(dataLen));
                this.addTag('METADATA_BLOCK_PICTURE', picture);
            }
        });
    }
}
exports.FlacParser = FlacParser;
class Metadata {
}
Metadata.BlockHeader = {
    len: 4,
    get: (buf, off) => {
        return {
            lastBlock: Util_1.default.strtokBITSET.get(buf, off, 7),
            type: Util_1.default.getBitAllignedNumber(buf, off, 1, 7),
            length: Token.UINT24_BE.get(buf, off + 1)
        };
    }
};
/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
Metadata.BlockStreamInfo = {
    len: 34,
    get: (buf, off) => {
        return {
            // The minimum block size (in samples) used in the stream.
            minimumBlockSize: Token.UINT16_BE.get(buf, off),
            // The maximum block size (in samples) used in the stream.
            // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
            maximumBlockSize: Token.UINT16_BE.get(buf, off + 2) / 1000,
            // The minimum frame size (in bytes) used in the stream.
            // May be 0 to imply the value is not known.
            minimumFrameSize: Token.UINT24_BE.get(buf, off + 4),
            // The maximum frame size (in bytes) used in the stream.
            // May be 0 to imply the value is not known.
            maximumFrameSize: Token.UINT24_BE.get(buf, off + 7),
            // Sample rate in Hz. Though 20 bits are available,
            // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
            // Also, a value of 0 is invalid.
            sampleRate: Token.UINT24_BE.get(buf, off + 10) >> 4,
            // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
            // (number of channels)-1. FLAC supports from 1 to 8 channels
            channels: Util_1.default.getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
            // bits per sample)-1.
            // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
            bitsPerSample: Util_1.default.getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
            // Total samples in stream.
            // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
            // A value of zero here means the number of total samples is unknown.
            totalSamples: Util_1.default.getBitAllignedNumber(buf, off + 13, 4, 36),
            // the MD5 hash of the file (see notes for usage... it's a littly tricky)
            fileMD5: new Token.BufferType(16).get(buf, off + 18)
        };
    }
};
class DataDecoder {
    constructor(data) {
        this.data = data;
        this.offset = 0;
    }
    readInt32() {
        const value = Token.UINT32_LE.get(this.data, this.offset);
        this.offset += 4;
        return value;
    }
    readStringUtf8() {
        const len = this.readInt32();
        const value = this.data.toString('utf8', this.offset, this.offset + len);
        this.offset += len;
        return value;
    }
}
