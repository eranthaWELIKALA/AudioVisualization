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
const FileType = require("file-type");
const Token = require("token-types");
const assert = require("assert");
const Util_1 = require("../common/Util");
const BasicParser_1 = require("../common/BasicParser");
const APEv2Token_1 = require("./APEv2Token");
const debug = initDebug('music-metadata:parser:APEv2');
const tagFormat = 'APEv2';
const preamble = 'APETAGEX';
class APEv2Parser extends BasicParser_1.BasicParser {
    constructor() {
        super(...arguments);
        this.ape = {};
    }
    /**
     * Calculate the media file duration
     * @param ah ApeHeader
     * @return {number} duration in seconds
     */
    static calculateDuration(ah) {
        let duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0;
        duration += ah.finalFrameBlocks;
        return duration / ah.sampleRate;
    }
    /**
     * @param {INativeMetadataCollector} metadata
     * @param {ITokenizer} tokenizer
     * @param {IOptions} options
     * @returns {Promise<boolean>} True if tags have been found
     */
    static parseTagHeader(metadata, tokenizer, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const footer = yield tokenizer.peekToken(APEv2Token_1.TagFooter);
            if (footer.ID === preamble) {
                yield tokenizer.ignore(APEv2Token_1.TagFooter.len);
                const tags = yield tokenizer.readToken(APEv2Token_1.TagField(footer));
                APEv2Parser.parseTags(metadata, footer, tags, 0, !options.skipCovers);
            }
            else {
                debug(`APEv2 header not found at offset=${tokenizer.position}`);
                if (tokenizer.fileSize) {
                    // Try to read the APEv2 header using just the footer-header
                    const remaining = tokenizer.fileSize - tokenizer.position; // ToDo: take ID3v1 into account
                    const buffer = Buffer.alloc(remaining);
                    yield tokenizer.readBuffer(buffer);
                    return APEv2Parser.parseTagFooter(metadata, buffer, !options.skipCovers);
                }
            }
        });
    }
    static parseTagFooter(metadata, buffer, includeCovers) {
        const footer = APEv2Token_1.TagFooter.get(buffer, buffer.length - APEv2Token_1.TagFooter.len);
        assert.equal(footer.ID, preamble, 'APEv2 Footer preamble');
        this.parseTags(metadata, footer, buffer, buffer.length - footer.size, includeCovers);
    }
    static parseTags(metadata, footer, buffer, offset, includeCovers) {
        for (let i = 0; i < footer.fields; i++) {
            // Only APEv2 tag has tag item headers
            const tagItemHeader = APEv2Token_1.TagItemHeader.get(buffer, offset);
            offset += APEv2Token_1.TagItemHeader.len;
            let zero = Util_1.default.findZero(buffer, offset, buffer.length);
            const key = buffer.toString('ascii', offset, zero);
            offset = zero + 1;
            switch (tagItemHeader.flags.dataType) {
                case APEv2Token_1.DataType.text_utf8: { // utf-8 textstring
                    const value = buffer.toString('utf8', offset, offset += tagItemHeader.size);
                    const values = value.split(/\x00/g);
                    /*jshint loopfunc:true */
                    for (const val of values) {
                        metadata.addTag(tagFormat, key, val);
                    }
                    break;
                }
                case APEv2Token_1.DataType.binary: // binary (probably artwork)
                    if (includeCovers) {
                        const picData = buffer.slice(offset, offset + tagItemHeader.size);
                        let off = 0;
                        zero = Util_1.default.findZero(picData, off, picData.length);
                        const description = picData.toString('utf8', off, zero);
                        off = zero + 1;
                        const data = Buffer.from(picData.slice(off));
                        const fileType = FileType(data);
                        if (fileType) {
                            if (fileType.mime.indexOf('image/') === 0) {
                                const picture = {
                                    description,
                                    data,
                                    format: fileType.mime
                                };
                                offset += tagItemHeader.size;
                                metadata.addTag(tagFormat, key, picture);
                            }
                            else {
                                debug(`Unexpected binary tag of type': ${fileType.mime}`);
                            }
                        }
                        else {
                            debug(`Failed to determine file type for binary tag: ${key}`);
                        }
                    }
                    break;
                case APEv2Token_1.DataType.external_info:
                    debug(`Ignore external info ${key}`);
                    break;
                default:
                    throw new Error(`Unexpected data-type: ${tagItemHeader.flags.dataType}`);
            }
        }
    }
    parse() {
        return __awaiter(this, void 0, void 0, function* () {
            const descriptor = yield this.tokenizer.readToken(APEv2Token_1.DescriptorParser);
            assert.equal(descriptor.ID, 'MAC ', 'descriptor.ID');
            this.ape.descriptor = descriptor;
            const lenExp = descriptor.descriptorBytes - APEv2Token_1.DescriptorParser.len;
            const header = yield (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());
            yield this.tokenizer.readToken(new Token.IgnoreType(header.forwardBytes));
            return APEv2Parser.parseTagHeader(this.metadata, this.tokenizer, this.options);
        });
    }
    parseDescriptorExpansion(lenExp) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.tokenizer.readToken(new Token.IgnoreType(lenExp));
            return this.parseHeader();
        });
    }
    parseHeader() {
        return __awaiter(this, void 0, void 0, function* () {
            const header = yield this.tokenizer.readToken(APEv2Token_1.Header);
            // ToDo before
            this.metadata.setFormat('lossless', true);
            this.metadata.setFormat('dataformat', 'Monkey\'s Audio');
            this.metadata.setFormat('bitsPerSample', header.bitsPerSample);
            this.metadata.setFormat('sampleRate', header.sampleRate);
            this.metadata.setFormat('numberOfChannels', header.channel);
            this.metadata.setFormat('duration', APEv2Parser.calculateDuration(header));
            return {
                forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes +
                    this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
            };
        });
    }
}
exports.APEv2Parser = APEv2Parser;
