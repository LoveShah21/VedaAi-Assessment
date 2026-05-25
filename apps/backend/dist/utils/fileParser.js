"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileContent = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const parseFileContent = async (file) => {
    if (file.mimetype === 'text/plain') {
        return file.buffer.toString('utf-8');
    }
    else if (file.mimetype === 'application/pdf') {
        const data = await (0, pdf_parse_1.default)(file.buffer);
        return data.text;
    }
    throw new Error('Unsupported file type. Only .txt and .pdf are supported.');
};
exports.parseFileContent = parseFileContent;
