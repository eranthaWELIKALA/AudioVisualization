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
const GUID_1 = require("./GUID");
const AsfObject = require("./AsfObject");
const _debug = require("debug");
const BasicParser_1 = require("../common/BasicParser");
const debug = _debug('music-metadata:parser:ASF');
const headerType = 'asf';
/**
 * Windows Media Metadata Usage Guidelines
 *   Ref: https://msdn.microsoft.com/en-us/library/ms867702.aspx
 *
 * Ref:
 *   https://tools.ietf.org/html/draft-fleischman-asf-01
 *   https://hwiegman.home.xs4all.nl/fileformats/asf/ASF_Specification.pdf
 *   http://drang.s4.xrea.com/program/tips/id3tag/wmp/index.html
 *   https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575(v=vs.85).aspx
 */
class AsfParser extends BasicParser_1.BasicParser {
    parse() {
        return __awaiter(this, void 0, void 0, function* () {
            const header = yield this.tokenizer.readToken(AsfObject.TopLevelHeaderObjectToken);
            if (!header.objectId.equals(GUID_1.default.HeaderObject)) {
                throw new Error('expected asf header; but was not found; got: ' + header.objectId.str);
            }
            try {
                yield this.parseObjectHeader(header.numberOfHeaderObjects);
            }
            catch (err) {
                debug('Error while parsing ASF: %s', err);
            }
        });
    }
    parseObjectHeader(numberOfObjectHeaders) {
        return __awaiter(this, void 0, void 0, function* () {
            let tags;
            do {
                // Parse common header of the ASF Object (3.1)
                const header = yield this.tokenizer.readToken(AsfObject.HeaderObjectToken);
                // Parse data part of the ASF Object
                debug('header GUID=%s', header.objectId.str);
                switch (header.objectId.str) {
                    case AsfObject.FilePropertiesObject.guid.str: // 3.2
                        const fpo = yield this.tokenizer.readToken(new AsfObject.FilePropertiesObject(header));
                        this.metadata.setFormat('duration', fpo.playDuration / 10000000);
                        this.metadata.setFormat('bitrate', fpo.maximumBitrate);
                        break;
                    case AsfObject.StreamPropertiesObject.guid.str: // 3.3
                        const spo = yield this.tokenizer.readToken(new AsfObject.StreamPropertiesObject(header));
                        this.metadata.setFormat('dataformat', 'ASF/' + spo.streamType);
                        break;
                    case AsfObject.HeaderExtensionObject.guid.str: // 3.4
                        const extHeader = yield this.tokenizer.readToken(new AsfObject.HeaderExtensionObject());
                        yield this.parseExtensionObject(extHeader.extensionDataSize);
                        break;
                    case AsfObject.ContentDescriptionObjectState.guid.str: // 3.10
                        tags = yield this.tokenizer.readToken(new AsfObject.ContentDescriptionObjectState(header));
                        this.addTags(tags);
                        break;
                    case AsfObject.ExtendedContentDescriptionObjectState.guid.str: // 3.11
                        tags = yield this.tokenizer.readToken(new AsfObject.ExtendedContentDescriptionObjectState(header));
                        this.addTags(tags);
                        break;
                    case GUID_1.default.CodecListObject.str:
                        // ToDo?
                        yield this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                        break;
                    case GUID_1.default.StreamBitratePropertiesObject.str:
                        // ToDo?
                        yield this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                        break;
                    case GUID_1.default.PaddingObject.str:
                        // ToDo: register bytes pad
                        debug('Padding: %s bytes', header.objectSize - AsfObject.HeaderObjectToken.len);
                        yield this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                        break;
                    default:
                        this.warnings.push('Ignore ASF-Object-GUID: ' + header.objectId.str);
                        debug('Ignore ASF-Object-GUID: %s', header.objectId.str);
                        yield this.tokenizer.readToken(new AsfObject.IgnoreObjectState(header));
                }
            } while (--numberOfObjectHeaders);
            // done
        });
    }
    addTags(tags) {
        tags.forEach(tag => {
            this.metadata.addTag(headerType, tag.id, tag.value);
        });
    }
    parseExtensionObject(extensionSize) {
        return __awaiter(this, void 0, void 0, function* () {
            do {
                // Parse common header of the ASF Object (3.1)
                const header = yield this.tokenizer.readToken(AsfObject.HeaderObjectToken);
                // Parse data part of the ASF Object
                switch (header.objectId.str) {
                    case AsfObject.ExtendedStreamPropertiesObjectState.guid.str: // 4.1
                        const cd = yield this.tokenizer.readToken(new AsfObject.ExtendedStreamPropertiesObjectState(header));
                        break;
                    case AsfObject.MetadataObjectState.guid.str: // 4.7
                        const moTags = yield this.tokenizer.readToken(new AsfObject.MetadataObjectState(header));
                        this.addTags(moTags);
                        break;
                    case AsfObject.MetadataLibraryObjectState.guid.str: // 4.8
                        const mlTags = yield this.tokenizer.readToken(new AsfObject.MetadataLibraryObjectState(header));
                        this.addTags(mlTags);
                        break;
                    case GUID_1.default.PaddingObject.str:
                        // ToDo: register bytes pad
                        yield this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                        break;
                    case GUID_1.default.CompatibilityObject.str:
                        this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                        break;
                    case GUID_1.default.ASF_Index_Placeholder_Object.str:
                        yield this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                        break;
                    default:
                        this.warnings.push('Ignore ASF-Object-GUID: ' + header.objectId.str);
                        // console.log("Ignore ASF-Object-GUID: %s", header.objectId.str);
                        yield this.tokenizer.readToken(new AsfObject.IgnoreObjectState(header));
                        break;
                }
                extensionSize -= header.objectSize;
            } while (extensionSize > 0);
        });
    }
}
exports.AsfParser = AsfParser;
