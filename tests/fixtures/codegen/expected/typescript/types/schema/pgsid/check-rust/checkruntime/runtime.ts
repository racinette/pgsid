import * as langruntime from "../langruntime/runtime.js";
export type Int4Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Unimplemented";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: number;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalInt4Value(left: Int4Value, right: Int4Value): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export type TextValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Unimplemented";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: string;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "NonNull";
};
export function equalTextValue(left: TextValue, right: TextValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function makeInt4Value(value: number): Int4Value {
    value = langruntime.checkedI32(value);
    return { kind: "Value", value: value };
}
export function makeTextValue(value: string): TextValue {
    value = langruntime.checkedString(value);
    return { kind: "Value", value: value };
}
export interface SqlError {
    readonly state: number;
}
export function equalSqlError(left: SqlError, right: SqlError): boolean {
    return left.state === right.state;
}
export function makeSqlError(state: number): SqlError {
    state = langruntime.checkedIndex(state);
    return { state: state };
}
export interface SqlErrorDescription {
    message: string;
}
const sqlErrorNumericOutOfRange = 3452547;
const sqlErrorNotNullViolation = 3505682;
const sqlErrorCheckViolation = 3505720;
const sqlErrorDatatypeMismatch = 6822148;
const sqlErrorCardinalityViolation = 3405888;
const sqlErrorNullValueNotAllowed = 3452548;
const sqlErrorInvalidDatetimeFormat = 3452551;
const sqlErrorDatetimeFieldOverflow = 3452552;
const sqlErrorTimezoneDisplacement = 3452553;
const sqlErrorInvalidUseOfEscape = 3452556;
const sqlErrorZeroLengthCharacterString = 3452559;
const sqlErrorInvalidXmlDocument = 3452566;
const sqlErrorNotXmlDocument = 3452565;
const sqlErrorInvalidXmlContent = 3452567;
const sqlErrorInvalidXmlComment = 3452572;
const sqlErrorInvalidXmlProcessingInstruction = 3452573;
const sqlErrorDivisionByZero = 3452582;
const sqlErrorInvalidFrameSize = 3452583;
const sqlErrorSubstring = 3452581;
const sqlErrorInvalidRegex = 3452591;
const sqlErrorInvalidLogarithm = 3452594;
const sqlErrorInvalidPower = 3452595;
const sqlErrorInvalidWidthBucket = 3452596;
const sqlErrorInvalidParameter = 3452619;
const sqlErrorInvalidEscape = 3452621;
const sqlErrorInvalidTextRepresentation = 3484946;
const sqlErrorUndefinedObject = 6820852;
const sqlErrorSyntax = 6819553;
const sqlErrorStringLengthMismatch = 3452622;
const sqlErrorStringRightTruncation = 3452545;
const sqlErrorArraySubscript = 3452630;
const sqlErrorFeatureNotSupported = 466560;
const sqlErrorProgramLimit = 8584704;
const sqlErrorInternal = 56966976;
const sqlErrorObjectNotReady = 8631360;
const sqlErrorJsonDatetime = 3452653;
const sqlErrorJsonNonNumeric = 3452658;
const sqlErrorJsonSubscript = 3452655;
const sqlErrorJsonArray = 3452661;
const sqlErrorJsonMember = 3452662;
const sqlErrorJsonNumber = 3452663;
const sqlErrorJsonObject = 3452664;
const sqlErrorJsonSingleton = 3452660;
export function sqlErrorMessage(error: SqlError): SqlErrorDescription {
    if (error.state === sqlErrorDatatypeMismatch) {
        return { message: "could not convert row type" };
    }
    if (error.state === sqlErrorZeroLengthCharacterString) {
        return { message: "zero-length character string" };
    }
    if (error.state === sqlErrorInvalidXmlProcessingInstruction) {
        return { message: "invalid XML processing instruction" };
    }
    if (error.state === sqlErrorNotXmlDocument) {
        return { message: "not an XML document" };
    }
    if (error.state === sqlErrorInvalidXmlDocument) {
        return { message: "invalid XML document" };
    }
    if (error.state === sqlErrorInvalidXmlContent) {
        return { message: "invalid XML content" };
    }
    if (error.state === sqlErrorInvalidXmlComment) {
        return { message: "invalid XML comment" };
    }
    if (error.state === sqlErrorCardinalityViolation) {
        return { message: "cardinality violation" };
    }
    if (error.state === sqlErrorNotNullViolation) {
        return { message: "not-null constraint violation" };
    }
    if (error.state === sqlErrorCheckViolation) {
        return { message: "check constraint violation" };
    }
    if (error.state === sqlErrorObjectNotReady) {
        return { message: "object not in prerequisite state" };
    }
    if (error.state === sqlErrorNullValueNotAllowed) {
        return { message: "null value not allowed" };
    }
    if (error.state === sqlErrorJsonDatetime) {
        return { message: "invalid argument for SQL/JSON datetime function" };
    }
    if (error.state === sqlErrorJsonNonNumeric) {
        return { message: "non-numeric SQL/JSON item" };
    }
    if (error.state === sqlErrorJsonSubscript) {
        return { message: "invalid SQL/JSON subscript" };
    }
    if (error.state === sqlErrorJsonArray) {
        return { message: "SQL/JSON array not found" };
    }
    if (error.state === sqlErrorJsonMember) {
        return { message: "SQL/JSON member not found" };
    }
    if (error.state === sqlErrorJsonNumber) {
        return { message: "SQL/JSON number not found" };
    }
    if (error.state === sqlErrorJsonObject) {
        return { message: "SQL/JSON object not found" };
    }
    if (error.state === sqlErrorJsonSingleton) {
        return { message: "singleton SQL/JSON item required" };
    }
    if (error.state === sqlErrorSyntax) {
        return { message: "syntax error" };
    }
    if (error.state === sqlErrorUndefinedObject) {
        return { message: "undefined object" };
    }
    if (error.state === sqlErrorFeatureNotSupported) {
        return { message: "feature not supported" };
    }
    if (error.state === sqlErrorInvalidFrameSize) {
        return { message: "invalid preceding or following size" };
    }
    if (error.state === sqlErrorInvalidEscape) {
        return { message: "invalid escape sequence" };
    }
    if (error.state === sqlErrorInvalidUseOfEscape) {
        return { message: "invalid use of escape character" };
    }
    if (error.state === sqlErrorInternal) {
        return { message: "internal error" };
    }
    if (error.state === sqlErrorSubstring) {
        return { message: "substring error" };
    }
    if (error.state === sqlErrorArraySubscript) {
        return { message: "array subscript error" };
    }
    if (error.state === sqlErrorProgramLimit) {
        return { message: "program limit exceeded" };
    }
    if (error.state === sqlErrorStringRightTruncation) {
        return { message: "string data right truncation" };
    }
    if (error.state === sqlErrorStringLengthMismatch) {
        return { message: "string data length mismatch" };
    }
    if (error.state === sqlErrorInvalidTextRepresentation) {
        return { message: "invalid text representation" };
    }
    if (error.state === sqlErrorNumericOutOfRange) {
        return { message: "numeric value out of range" };
    }
    if (error.state === sqlErrorInvalidDatetimeFormat) {
        return { message: "invalid date/time format" };
    }
    if (error.state === sqlErrorDatetimeFieldOverflow) {
        return { message: "date/time field value out of range" };
    }
    if (error.state === sqlErrorTimezoneDisplacement) {
        return { message: "time zone displacement out of range" };
    }
    if (error.state === sqlErrorDivisionByZero) {
        return { message: "division by zero" };
    }
    if (error.state === sqlErrorInvalidLogarithm) {
        return { message: "invalid argument for logarithm" };
    }
    if (error.state === sqlErrorInvalidPower) {
        return { message: "invalid argument for power function" };
    }
    if (error.state === sqlErrorInvalidWidthBucket) {
        return { message: "invalid argument for width_bucket function" };
    }
    if (error.state === sqlErrorInvalidRegex) {
        return { message: "invalid regular expression" };
    }
    if (error.state === sqlErrorInvalidParameter) {
        return { message: "invalid parameter value" };
    }
    return { message: "SQL evaluation failed" };
}
export type BoolValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Unimplemented";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: boolean;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalBoolValue(left: BoolValue, right: BoolValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export type NumericValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Unimplemented";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: string;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalNumericValue(left: NumericValue, right: NumericValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function makeNumericValue(value: string): NumericValue {
    value = langruntime.checkedString(value);
    const unresolvedFlavor: number = 0;
    const parts: NumericLayout = copyNumericLayout(numericParts(value));
    if (parts.valid === false) {
        return numericUnresolved(unresolvedFlavor);
    }
    return { kind: "Value", value: value };
}
export interface JsonbNode {
    readonly kind: number;
    readonly child: number;
    readonly next: number;
    readonly keyStart: number;
    readonly keyEnd: number;
    readonly textStart: number;
    readonly textEnd: number;
}
export function copyJsonbNode(value: JsonbNode): JsonbNode {
    return { kind: langruntime.checkedI32(value.kind), child: langruntime.checkedIndex(value.child), next: langruntime.checkedIndex(value.next), keyStart: langruntime.checkedIndex(value.keyStart), keyEnd: langruntime.checkedIndex(value.keyEnd), textStart: langruntime.checkedIndex(value.textStart), textEnd: langruntime.checkedIndex(value.textEnd) };
}
export interface JsonbPayload {
    readonly characters: string[];
    readonly nodes: JsonbNode[];
    readonly root: number;
}
export function copyJsonbPayload(value: JsonbPayload): JsonbPayload {
    return { characters: langruntime.checkedChars(value.characters), nodes: langruntime.checkedStructs(value.nodes, copyJsonbNode), root: langruntime.checkedIndex(value.root) };
}
export interface JsonbKnowledge {
    readonly maximum: bigint;
    readonly kind: number;
    readonly length: number;
    readonly shape: JsonbPayload;
}
export function copyJsonbKnowledge(value: JsonbKnowledge): JsonbKnowledge {
    return { maximum: langruntime.checkedI64(value.maximum), kind: langruntime.checkedI32(value.kind), length: langruntime.checkedI32(value.length), shape: copyJsonbPayload(value.shape) };
}
export type JsonbValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Unimplemented";
} | {
    readonly kind: "NonNull";
    readonly value: JsonbKnowledge;
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: JsonbPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function copyJsonbValue(value: JsonbValue): JsonbValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Unimplemented": return { kind: "Unimplemented" };
        case "NonNull": return { kind: "NonNull", value: copyJsonbKnowledge(value.value) };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: copyJsonbPayload(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
export function boolUnresolved(flavor: number): BoolValue {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 1) {
        return { kind: "Unknown" };
    }
    return { kind: "Unimplemented" };
}
export function int4Unresolved(flavor: number): Int4Value {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 1) {
        return { kind: "Unknown" };
    }
    return { kind: "Unimplemented" };
}
export function jsonbUnresolved(flavor: number): JsonbValue {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 1) {
        return { kind: "Unknown" };
    }
    return { kind: "Unimplemented" };
}
export function numericUnresolved(flavor: number): NumericValue {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 1) {
        return { kind: "Unknown" };
    }
    return { kind: "Unimplemented" };
}
export function textUnresolved(flavor: number): TextValue {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 1) {
        return { kind: "Unknown" };
    }
    return { kind: "Unimplemented" };
}
export function resolutionContext(flavor: number): number {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 2) {
        return 2;
    }
    return 1;
}
export interface NumericLayout {
    valid: boolean;
    special: number;
    sign: number;
    weight: number;
    first: number;
    end: number;
}
export function copyNumericLayout(value: NumericLayout): NumericLayout {
    return { valid: langruntime.checkedBool(value.valid), special: langruntime.checkedI32(value.special), sign: langruntime.checkedI32(value.sign), weight: langruntime.checkedI32(value.weight), first: langruntime.checkedIndex(value.first), end: langruntime.checkedIndex(value.end) };
}
function invalidNumericParts(): NumericLayout {
    return { valid: false, special: 1, sign: 0, weight: 0, first: 0, end: 0 };
}
export function numericSpace(value: string): boolean {
    value = langruntime.checkedChar(value);
    return value === " " || value === "\t" || value === "\n" || value === "\r" || value === "\v" || value === "\f";
}
function numericDigit(value: string): number {
    value = langruntime.checkedChar(value);
    if (value === "0") {
        return 0;
    }
    if (value === "1") {
        return 1;
    }
    if (value === "2") {
        return 2;
    }
    if (value === "3") {
        return 3;
    }
    if (value === "4") {
        return 4;
    }
    if (value === "5") {
        return 5;
    }
    if (value === "6") {
        return 6;
    }
    if (value === "7") {
        return 7;
    }
    if (value === "8") {
        return 8;
    }
    if (value === "9") {
        return 9;
    }
    return langruntime.checkedSignedNegate(1);
}
export function numericParts(value: string): NumericLayout {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    if (chars.length > 1000000) {
        return invalidNumericParts();
    }
    let begin: number = 0;
    let end: number = chars.length;
    while (begin < end && numericSpace(langruntime.indexChar(chars, langruntime.checkedIndex(begin)))) {
        begin = langruntime.checkedAdd(begin, 1);
    }
    while (end > begin && numericSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    if (begin === end) {
        return invalidNumericParts();
    }
    let index: number = begin;
    let sign: number = 1;
    if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-") {
        sign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        index = langruntime.checkedAdd(index, 1);
    }
    else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "+") {
        index = langruntime.checkedAdd(index, 1);
    }
    if (index === end) {
        return invalidNumericParts();
    }
    if (langruntime.checkedSubtract(end, begin) === 3 && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(begin))) === "n" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(begin, 1)))) === "a" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(begin, 2)))) === "n") {
        return { valid: true, special: 3, sign: 0, weight: 0, first: 0, end: 0 };
    }
    if ((langruntime.checkedSubtract(end, index) === 3 || langruntime.checkedSubtract(end, index) === 8) && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(index))) === "i" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)))) === "n" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 2)))) === "f") {
        if (langruntime.checkedSubtract(end, index) === 8 && (!(langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 3)))) === "i") || !(langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 4)))) === "n") || !(langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 5)))) === "i") || !(langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 6)))) === "t") || !(langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 7)))) === "y"))) {
            return invalidNumericParts();
        }
        let special: number = 2;
        if (sign < 0) {
            special = langruntime.checkedI32(0);
        }
        return { valid: true, special: special, sign: 0, weight: 0, first: 0, end: 0 };
    }
    let point: boolean = false;
    let digits: number = 0;
    let before: number = 0;
    let fractional: number = 0;
    let first: number = end;
    let last: number = 0;
    let leading: number = 0;
    while (index < end) {
        const digit: number = numericDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        if (digit >= 0) {
            if (first === end && digit === 0) {
                leading = langruntime.checkedI32(langruntime.checkedSignedAdd(leading, 1));
            }
            if (!(digit === 0)) {
                if (first === end) {
                    first = langruntime.checkedIndex(index);
                }
                last = langruntime.checkedIndex(langruntime.checkedAdd(index, 1));
            }
            digits = langruntime.checkedI32(langruntime.checkedSignedAdd(digits, 1));
            if (point) {
                fractional = langruntime.checkedI32(langruntime.checkedSignedAdd(fractional, 1));
            }
            else {
                before = langruntime.checkedI32(langruntime.checkedSignedAdd(before, 1));
            }
            index = langruntime.checkedAdd(index, 1);
        }
        else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".") {
            if (point) {
                return invalidNumericParts();
            }
            point = langruntime.checkedBool(true);
            index = langruntime.checkedAdd(index, 1);
            if (index < end && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "_") {
                return invalidNumericParts();
            }
        }
        else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "_") {
            if (index === begin || numericDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(index, 1)))) < 0 || langruntime.checkedAdd(index, 1) === end || numericDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)))) < 0) {
                return invalidNumericParts();
            }
            index = langruntime.checkedAdd(index, 1);
        }
        else {
            break;
        }
    }
    if (digits === 0) {
        return invalidNumericParts();
    }
    let exponent: number = 0;
    if (index < end && (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "e" || langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "E")) {
        index = langruntime.checkedAdd(index, 1);
        let negative: boolean = false;
        if (index < end && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-") {
            negative = langruntime.checkedBool(true);
            index = langruntime.checkedAdd(index, 1);
        }
        else if (index < end && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "+") {
            index = langruntime.checkedAdd(index, 1);
        }
        const start: number = index;
        if (index === end || numericDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) < 0) {
            return invalidNumericParts();
        }
        while (index < end) {
            const digit: number = numericDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            if (digit >= 0) {
                if (exponent > 107374182 || (exponent === 107374182 && digit > 3)) {
                    return invalidNumericParts();
                }
                exponent = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(exponent, 10), digit));
                index = langruntime.checkedAdd(index, 1);
            }
            else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "_") {
                if (index === start || numericDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(index, 1)))) < 0 || langruntime.checkedAdd(index, 1) === end || numericDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)))) < 0) {
                    return invalidNumericParts();
                }
                index = langruntime.checkedAdd(index, 1);
            }
            else {
                break;
            }
        }
        if (negative) {
            exponent = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, exponent));
        }
    }
    if (!(index === end) || langruntime.checkedSignedSubtract(fractional, exponent) > 16383) {
        return invalidNumericParts();
    }
    const weight: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(before, leading), 1), exponent);
    if (first === end) {
        return { valid: true, special: 1, sign: 0, weight: 0, first: 0, end: 0 };
    }
    if (weight > 131071 || weight < langruntime.checkedSignedNegate(131072)) {
        return invalidNumericParts();
    }
    return { valid: true, special: 1, sign: sign, weight: weight, first: first, end: last };
}
interface JsonSyntaxSource {
    characters: string[];
}
interface JsonSyntaxToken {
    kind: number;
    end: number;
}
function copyJsonSyntaxToken(value: JsonSyntaxToken): JsonSyntaxToken {
    return { kind: langruntime.checkedI32(value.kind), end: langruntime.checkedIndex(value.end) };
}
const jsonSyntaxInvalid = 12;
const jsonSyntaxEnd = 0;
const jsonSyntaxString = 1;
const jsonSyntaxNumber = 2;
const jsonSyntaxTrue = 3;
const jsonSyntaxFalse = 4;
const jsonSyntaxNull = 5;
const jsonSyntaxObjectStart = 6;
const jsonSyntaxObjectEnd = 7;
const jsonSyntaxArrayStart = 8;
const jsonSyntaxArrayEnd = 9;
const jsonSyntaxColon = 10;
const jsonSyntaxComma = 11;
const jsonSyntaxRootValue = 0;
const jsonSyntaxRootEnd = 1;
const jsonSyntaxArrayFirst = 2;
const jsonSyntaxArrayNext = 3;
const jsonSyntaxArrayValue = 4;
const jsonSyntaxObjectFirst = 5;
const jsonSyntaxObjectColon = 6;
const jsonSyntaxObjectValue = 7;
const jsonSyntaxObjectNext = 8;
const jsonSyntaxObjectKey = 9;
function jsonSyntaxSpace(character: string): boolean {
    character = langruntime.checkedChar(character);
    return character === " " || character === "\t" || character === "\n" || character === "\r";
}
function jsonSyntaxDigit(character: string): boolean {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    return code >= 48 && code <= 57;
}
function jsonSyntaxAlphanumeric(character: string): boolean {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    return jsonSyntaxDigit(character) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code >= 128 || character === "_";
}
function jsonSyntaxHex(character: string): boolean {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    return (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
}
function jsonSyntaxBadToken(end: number): JsonSyntaxToken {
    end = langruntime.checkedIndex(end);
    return { kind: jsonSyntaxInvalid, end: end };
}
function jsonSyntaxReadString(source: JsonSyntaxSource, begin: number): JsonSyntaxToken {
    begin = langruntime.checkedIndex(begin);
    let position: number = langruntime.checkedAdd(begin, 1);
    while (position < source.characters.length) {
        const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
        position = langruntime.checkedAdd(position, 1);
        if (character === "\"") {
            return { kind: jsonSyntaxString, end: position };
        }
        const code: number = langruntime.checkedChar(character).codePointAt(0)!;
        if (code < 32) {
            return jsonSyntaxBadToken(position);
        }
        if (character === "\\") {
            if (position >= source.characters.length) {
                return jsonSyntaxBadToken(position);
            }
            const escape: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
            position = langruntime.checkedAdd(position, 1);
            if (escape === "u") {
                let digit: number = 0;
                while (digit < 4) {
                    if (position >= source.characters.length || jsonSyntaxHex(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))) === false) {
                        return jsonSyntaxBadToken(position);
                    }
                    position = langruntime.checkedAdd(position, 1);
                    digit = langruntime.checkedAdd(digit, 1);
                }
            }
            else if (!(escape === "\"") && !(escape === "\\") && !(escape === "/") && !(escape === "b") && !(escape === "f") && !(escape === "n") && !(escape === "r") && !(escape === "t")) {
                return jsonSyntaxBadToken(position);
            }
        }
    }
    return jsonSyntaxBadToken(position);
}
function jsonSyntaxReadNumber(source: JsonSyntaxSource, begin: number): JsonSyntaxToken {
    begin = langruntime.checkedIndex(begin);
    let position: number = begin;
    if (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "-") {
        position = langruntime.checkedAdd(position, 1);
    }
    if (position >= source.characters.length || jsonSyntaxDigit(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))) === false) {
        return jsonSyntaxBadToken(position);
    }
    if (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "0") {
        position = langruntime.checkedAdd(position, 1);
    }
    else {
        while (position < source.characters.length && jsonSyntaxDigit(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
            position = langruntime.checkedAdd(position, 1);
        }
    }
    if (position < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === ".") {
        position = langruntime.checkedAdd(position, 1);
        const first: number = position;
        while (position < source.characters.length && jsonSyntaxDigit(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
            position = langruntime.checkedAdd(position, 1);
        }
        if (position === first) {
            return jsonSyntaxBadToken(position);
        }
    }
    if (position < source.characters.length && (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "e" || langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "E")) {
        position = langruntime.checkedAdd(position, 1);
        if (position < source.characters.length && (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "+" || langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "-")) {
            position = langruntime.checkedAdd(position, 1);
        }
        const first: number = position;
        while (position < source.characters.length && jsonSyntaxDigit(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
            position = langruntime.checkedAdd(position, 1);
        }
        if (position === first) {
            return jsonSyntaxBadToken(position);
        }
    }
    if (position < source.characters.length && jsonSyntaxAlphanumeric(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
        return jsonSyntaxBadToken(position);
    }
    return { kind: jsonSyntaxNumber, end: position };
}
function jsonSyntaxKeyword(source: JsonSyntaxSource, begin: number, word: string, kind: number): JsonSyntaxToken {
    begin = langruntime.checkedIndex(begin);
    word = langruntime.checkedString(word);
    kind = langruntime.checkedI32(kind);
    const expected: string[] = Array.from(word);
    let index: number = 0;
    let position: number = begin;
    while (index < expected.length) {
        if (position >= source.characters.length || !(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === langruntime.indexChar(expected, langruntime.checkedIndex(index)))) {
            return jsonSyntaxBadToken(position);
        }
        position = langruntime.checkedAdd(position, 1);
        index = langruntime.checkedAdd(index, 1);
    }
    if (position < source.characters.length && jsonSyntaxAlphanumeric(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
        return jsonSyntaxBadToken(position);
    }
    return { kind: kind, end: position };
}
function jsonSyntaxReadToken(source: JsonSyntaxSource, begin: number): JsonSyntaxToken {
    begin = langruntime.checkedIndex(begin);
    let position: number = begin;
    while (position < source.characters.length && jsonSyntaxSpace(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
        position = langruntime.checkedAdd(position, 1);
    }
    if (position === source.characters.length) {
        return { kind: jsonSyntaxEnd, end: position };
    }
    const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
    if (character === "\"") {
        return jsonSyntaxReadString(source, position);
    }
    if (character === "-" || jsonSyntaxDigit(character)) {
        return jsonSyntaxReadNumber(source, position);
    }
    if (character === "t") {
        return jsonSyntaxKeyword(source, position, "true", jsonSyntaxTrue);
    }
    if (character === "f") {
        return jsonSyntaxKeyword(source, position, "false", jsonSyntaxFalse);
    }
    if (character === "n") {
        return jsonSyntaxKeyword(source, position, "null", jsonSyntaxNull);
    }
    let kind: number = jsonSyntaxInvalid;
    if (character === "{") {
        kind = langruntime.checkedI32(jsonSyntaxObjectStart);
    }
    else if (character === "}") {
        kind = langruntime.checkedI32(jsonSyntaxObjectEnd);
    }
    else if (character === "[") {
        kind = langruntime.checkedI32(jsonSyntaxArrayStart);
    }
    else if (character === "]") {
        kind = langruntime.checkedI32(jsonSyntaxArrayEnd);
    }
    else if (character === ":") {
        kind = langruntime.checkedI32(jsonSyntaxColon);
    }
    else if (character === ",") {
        kind = langruntime.checkedI32(jsonSyntaxComma);
    }
    return { kind: kind, end: langruntime.checkedAdd(position, 1) };
}
function jsonSyntaxRootKind(token: number): number {
    token = langruntime.checkedI32(token);
    if (token === jsonSyntaxNull) {
        return 0;
    }
    if (token === jsonSyntaxFalse) {
        return 1;
    }
    if (token === jsonSyntaxTrue) {
        return 2;
    }
    if (token === jsonSyntaxNumber) {
        return 3;
    }
    if (token === jsonSyntaxString) {
        return 4;
    }
    if (token === jsonSyntaxArrayStart) {
        return 5;
    }
    if (token === jsonSyntaxObjectStart) {
        return 6;
    }
    return langruntime.checkedSignedNegate(1);
}
interface JsonSyntaxTransition {
    state: number;
    action: number;
}
function copyJsonSyntaxTransition(value: JsonSyntaxTransition): JsonSyntaxTransition {
    return { state: langruntime.checkedI32(value.state), action: langruntime.checkedI32(value.action) };
}
const jsonSyntaxReject = 7;
const jsonSyntaxContinue = 0;
const jsonSyntaxFinish = 1;
const jsonSyntaxClose = 2;
const jsonSyntaxKey = 3;
const jsonSyntaxValue = 4;
const jsonSyntaxOpenArray = 5;
const jsonSyntaxOpenObject = 6;
function jsonSyntaxStep(state: number, token: number): JsonSyntaxTransition {
    state = langruntime.checkedI32(state);
    token = langruntime.checkedI32(token);
    let next: number = state;
    let action: number = jsonSyntaxReject;
    if (state === jsonSyntaxRootEnd) {
        if (token === jsonSyntaxEnd) {
            action = langruntime.checkedI32(jsonSyntaxFinish);
        }
    }
    else if (state === jsonSyntaxArrayNext || state === jsonSyntaxObjectNext) {
        let close: number = jsonSyntaxArrayEnd;
        let continuation: number = jsonSyntaxArrayValue;
        if (state === jsonSyntaxObjectNext) {
            close = langruntime.checkedI32(jsonSyntaxObjectEnd);
            continuation = langruntime.checkedI32(jsonSyntaxObjectKey);
        }
        if (token === close) {
            action = langruntime.checkedI32(jsonSyntaxClose);
        }
        else if (token === jsonSyntaxComma) {
            next = langruntime.checkedI32(continuation);
            action = langruntime.checkedI32(jsonSyntaxContinue);
        }
    }
    else if (state === jsonSyntaxObjectColon) {
        if (token === jsonSyntaxColon) {
            next = langruntime.checkedI32(jsonSyntaxObjectValue);
            action = langruntime.checkedI32(jsonSyntaxContinue);
        }
    }
    else if (state === jsonSyntaxObjectFirst || state === jsonSyntaxObjectKey) {
        if (state === jsonSyntaxObjectFirst && token === jsonSyntaxObjectEnd) {
            action = langruntime.checkedI32(jsonSyntaxClose);
        }
        else if (token === jsonSyntaxString) {
            next = langruntime.checkedI32(jsonSyntaxObjectColon);
            action = langruntime.checkedI32(jsonSyntaxKey);
        }
    }
    else if (state === jsonSyntaxArrayFirst && token === jsonSyntaxArrayEnd) {
        action = langruntime.checkedI32(jsonSyntaxClose);
    }
    else if (jsonSyntaxRootKind(token) >= 0) {
        action = langruntime.checkedI32(jsonSyntaxValue);
        if (token === jsonSyntaxArrayStart) {
            action = langruntime.checkedI32(jsonSyntaxOpenArray);
        }
        else if (token === jsonSyntaxObjectStart) {
            action = langruntime.checkedI32(jsonSyntaxOpenObject);
        }
        next = langruntime.checkedI32(jsonSyntaxArrayNext);
        if (state === jsonSyntaxRootValue) {
            next = langruntime.checkedI32(jsonSyntaxRootEnd);
        }
        else if (state === jsonSyntaxObjectValue) {
            next = langruntime.checkedI32(jsonSyntaxObjectNext);
        }
    }
    return { state: next, action: action };
}
interface JsonReadToken {
    start: number;
    end: number;
    kind: number;
    syntax: number;
}
function copyJsonReadToken(value: JsonReadToken): JsonReadToken {
    return { start: langruntime.checkedIndex(value.start), end: langruntime.checkedIndex(value.end), kind: langruntime.checkedI32(value.kind), syntax: langruntime.checkedI32(value.syntax) };
}
const jsonReadEnd = 0;
const jsonReadQuote = 1;
const jsonReadAtom = 2;
const jsonReadObjectOpen = 3;
const jsonReadObjectClose = 4;
const jsonReadArrayOpen = 5;
const jsonReadArrayClose = 6;
const jsonReadColon = 7;
const jsonReadComma = 8;
const jsonReadZero = 3484949;
const jsonReadInvalidText = 3484946;
function jsonReadNextToken(source: JsonSyntaxSource, begin: number): JsonReadToken {
    begin = langruntime.checkedIndex(begin);
    let start: number = begin;
    while (start < source.characters.length && jsonSyntaxSpace(langruntime.indexChar(source.characters, langruntime.checkedIndex(start)))) {
        start = langruntime.checkedAdd(start, 1);
    }
    const token: JsonSyntaxToken = copyJsonSyntaxToken(jsonSyntaxReadToken(source, start));
    let kind: number = jsonReadAtom;
    if (token.kind === jsonSyntaxString) {
        kind = langruntime.checkedI32(jsonReadQuote);
    }
    else if (token.kind === jsonSyntaxObjectStart) {
        kind = langruntime.checkedI32(jsonReadObjectOpen);
    }
    else if (token.kind === jsonSyntaxObjectEnd) {
        kind = langruntime.checkedI32(jsonReadObjectClose);
    }
    else if (token.kind === jsonSyntaxArrayStart) {
        kind = langruntime.checkedI32(jsonReadArrayOpen);
    }
    else if (token.kind === jsonSyntaxArrayEnd) {
        kind = langruntime.checkedI32(jsonReadArrayClose);
    }
    else if (token.kind === jsonSyntaxColon) {
        kind = langruntime.checkedI32(jsonReadColon);
    }
    else if (token.kind === jsonSyntaxComma) {
        kind = langruntime.checkedI32(jsonReadComma);
    }
    else if (token.kind === jsonSyntaxEnd) {
        kind = langruntime.checkedI32(jsonReadEnd);
    }
    return { start: start, end: token.end, kind: kind, syntax: token.kind };
}
function jsonReadHex(character: string): number {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    if (code >= 48 && code <= 57) {
        return langruntime.checkedSignedSubtract(code, 48);
    }
    if (code >= 65 && code <= 70) {
        return langruntime.checkedSignedSubtract(code, 55);
    }
    return langruntime.checkedSignedSubtract(code, 87);
}
function jsonReadDecodeStringContext(source: JsonSyntaxSource, token: JsonReadToken, utf8: boolean): TextValue {
    token = copyJsonReadToken(token);
    utf8 = langruntime.checkedBool(utf8);
    const unresolvedFlavor: number = 0;
    let position: number = langruntime.checkedAdd(token.start, 1);
    let high: number = langruntime.checkedSignedNegate(1);
    let output: string = "";
    while (position < source.characters.length) {
        const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
        position = langruntime.checkedAdd(position, 1);
        if (character === "\"") {
            if (high >= 0) {
                return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
            }
            return { kind: "Value", value: output };
        }
        if ((langruntime.checkedChar(character).codePointAt(0)!) < 32) {
            return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
        }
        if (character === "\\") {
            if (position === source.characters.length) {
                return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
            }
            const escape: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
            position = langruntime.checkedAdd(position, 1);
            if (escape === "u") {
                let code: number = 0;
                let digit: number = 0;
                while (digit < 4) {
                    if (position === source.characters.length || jsonSyntaxHex(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))) === false) {
                        return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
                    }
                    code = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(code, 16), jsonReadHex(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))));
                    position = langruntime.checkedAdd(position, 1);
                    digit = langruntime.checkedAdd(digit, 1);
                }
                if (code >= 55296 && code <= 56319) {
                    if (high >= 0) {
                        return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
                    }
                    high = langruntime.checkedI32(code);
                }
                else {
                    if (code >= 56320 && code <= 57343) {
                        if (high < 0) {
                            return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
                        }
                        code = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(65536, langruntime.checkedSignedMultiply((langruntime.checkedSignedSubtract(high, 55296)), 1024)), code), 56320));
                        high = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                    }
                    if (high >= 0) {
                        return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
                    }
                    if (code === 0) {
                        return { kind: "Error", value: makeSqlError(jsonReadZero) };
                    }
                    if (code > 127 && utf8 === false) {
                        return textUnresolved(resolutionContext(unresolvedFlavor));
                    }
                    output = output + langruntime.checkedChar(langruntime.characterFromI32(code, " "));
                }
            }
            else {
                if (high >= 0) {
                    return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
                }
                let decoded: string = escape;
                if (escape === "b") {
                    decoded = langruntime.checkedChar("\b");
                }
                else if (escape === "f") {
                    decoded = langruntime.checkedChar("\f");
                }
                else if (escape === "n") {
                    decoded = langruntime.checkedChar("\n");
                }
                else if (escape === "r") {
                    decoded = langruntime.checkedChar("\r");
                }
                else if (escape === "t") {
                    decoded = langruntime.checkedChar("\t");
                }
                else if (!(escape === "\"") && !(escape === "\\") && !(escape === "/")) {
                    return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
                }
                output = output + langruntime.checkedChar(decoded);
            }
        }
        else {
            if (high >= 0) {
                return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
            }
            output = output + langruntime.checkedChar(character);
        }
    }
    return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
}
interface JsonbFrame {
    state: number;
    node: number;
    tail: number;
    keyStart: number;
    keyEnd: number;
}
function copyJsonbFrame(value: JsonbFrame): JsonbFrame {
    return { state: langruntime.checkedI32(value.state), node: langruntime.checkedIndex(value.node), tail: langruntime.checkedIndex(value.tail), keyStart: langruntime.checkedIndex(value.keyStart), keyEnd: langruntime.checkedIndex(value.keyEnd) };
}
interface JsonbCharacters {
    characters: string[];
}
const jsonbNumericRange = 3452547;
function jsonbNodeLink(node: JsonbNode, next: number): JsonbNode {
    next = langruntime.checkedIndex(next);
    return { kind: node.kind, child: node.child, next: next, keyStart: node.keyStart, keyEnd: node.keyEnd, textStart: node.textStart, textEnd: node.textEnd };
}
function jsonbNodeChild(node: JsonbNode, child: number): JsonbNode {
    child = langruntime.checkedIndex(child);
    return { kind: node.kind, child: child, next: node.next, keyStart: node.keyStart, keyEnd: node.keyEnd, textStart: node.textStart, textEnd: node.textEnd };
}
function jsonbScalarReady(source: JsonSyntaxSource, token: JsonReadToken, utf8: boolean): BoolValue {
    token = copyJsonReadToken(token);
    utf8 = langruntime.checkedBool(utf8);
    const unresolvedFlavor: number = 0;
    const following: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, token.end));
    if (following.start < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(following.start)) === "\"") {
        const decoded: TextValue = jsonReadDecodeStringContext(source, following, utf8);
        if (decoded.kind === "Error") {
            const error: SqlError = decoded.value;
            return { kind: "Error", value: error };
        }
        let conditionFlavor498: number = unresolvedFlavor;
        if (decoded.kind === "Unknown") {
            if (conditionFlavor498 < 1) {
                conditionFlavor498 = langruntime.checkedI32(1);
            }
        }
        if (decoded.kind === "Unimplemented") {
            conditionFlavor498 = langruntime.checkedI32(2);
        }
        if ((equalTextValue(decoded, { kind: "Unknown" }) || equalTextValue(decoded, { kind: "Unimplemented" })) || equalTextValue(decoded, { kind: "NonNull" })) {
            return boolUnresolved(conditionFlavor498);
        }
    }
    if (following.syntax === jsonSyntaxInvalid) {
        return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
    }
    return { kind: "Value", value: true };
}
function jsonbNumberText(source: JsonSyntaxSource, token: JsonReadToken, utf8: boolean): TextValue {
    token = copyJsonReadToken(token);
    utf8 = langruntime.checkedBool(utf8);
    const unresolvedFlavor: number = 0;
    const ready: BoolValue = jsonbScalarReady(source, token, utf8);
    if (ready.kind === "Error") {
        const error: SqlError = ready.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor654: number = unresolvedFlavor;
    if (ready.kind === "Unknown") {
        if (conditionFlavor654 < 1) {
            conditionFlavor654 = langruntime.checkedI32(1);
        }
    }
    if (ready.kind === "Unimplemented") {
        conditionFlavor654 = langruntime.checkedI32(2);
    }
    if (equalBoolValue(ready, { kind: "Unknown" }) || equalBoolValue(ready, { kind: "Unimplemented" })) {
        return textUnresolved(conditionFlavor654);
    }
    let position: number = token.start;
    const negative: boolean = langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "-";
    if (negative) {
        position = langruntime.checkedAdd(position, 1);
    }
    let digits: string[] = [];
    let before: number = 0;
    let point: boolean = false;
    let first: number = langruntime.checkedSignedNegate(1);
    while (position < token.end && !(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "e") && !(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "E")) {
        const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
        if (character === ".") {
            point = langruntime.checkedBool(true);
        }
        else {
            if (first < 0 && !(character === "0")) {
                first = langruntime.checkedI32(langruntime.checkedI32(langruntime.checkedIndex(digits.length)));
            }
            langruntime.pushChar(digits, character);
            if (point === false) {
                before = langruntime.checkedI32(langruntime.checkedSignedAdd(before, 1));
            }
        }
        position = langruntime.checkedAdd(position, 1);
    }
    let exponent: number = 0;
    if (position < token.end) {
        position = langruntime.checkedAdd(position, 1);
        let sign: number = 1;
        if (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "-") {
            sign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
            position = langruntime.checkedAdd(position, 1);
        }
        else if (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "+") {
            position = langruntime.checkedAdd(position, 1);
        }
        while (position < token.end) {
            const digit: number = langruntime.checkedSignedSubtract(langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))).codePointAt(0)!, 48);
            if (exponent > 107374182 || (exponent === 107374182 && digit > 3)) {
                return { kind: "Error", value: makeSqlError(jsonbNumericRange) };
            }
            exponent = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(exponent, 10), digit));
            position = langruntime.checkedAdd(position, 1);
        }
        exponent = langruntime.checkedI32(langruntime.checkedSignedMultiply(exponent, sign));
    }
    const count: number = langruntime.checkedI32(langruntime.checkedIndex(digits.length));
    let scale: bigint = langruntime.checkedI64Subtract(BigInt(langruntime.checkedI32((langruntime.checkedSignedSubtract(count, before)))), BigInt(langruntime.checkedI32(exponent)));
    if (scale < 0n) {
        scale = langruntime.checkedI64(0n);
    }
    const boundary: bigint = langruntime.checkedI64Add(BigInt(langruntime.checkedI32(before)), BigInt(langruntime.checkedI32(exponent)));
    const weight: bigint = langruntime.checkedI64Subtract(langruntime.checkedI64Subtract(boundary, BigInt(langruntime.checkedI32(first))), 1n);
    if (scale > 16383n || (first >= 0 && weight > 131071n)) {
        return { kind: "Error", value: makeSqlError(jsonbNumericRange) };
    }
    let output: string = "";
    if (first >= 0 && negative) {
        output = output + langruntime.checkedChar("-");
    }
    let place: bigint = 0n;
    if (first >= 0 && weight > 0n) {
        place = langruntime.checkedI64(weight);
    }
    while (place >= 0n) {
        const index: bigint = langruntime.checkedI64Subtract(langruntime.checkedI64Subtract(boundary, place), 1n);
        let digit: string = "0";
        if (first >= 0 && index >= 0n && index < BigInt(langruntime.checkedI32(count))) {
            digit = langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64(index))), 0))));
        }
        output = output + langruntime.checkedChar(digit);
        place = langruntime.checkedI64(langruntime.checkedI64Subtract(place, 1n));
    }
    if (scale > 0n) {
        output = output + langruntime.checkedChar(".");
    }
    let fraction: bigint = 0n;
    while (fraction < scale) {
        const index: bigint = langruntime.checkedI64Add(boundary, fraction);
        let digit: string = "0";
        if (first >= 0 && index >= 0n && index < BigInt(langruntime.checkedI32(count))) {
            digit = langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64(index))), 0))));
        }
        output = output + langruntime.checkedChar(digit);
        fraction = langruntime.checkedI64(langruntime.checkedI64Add(fraction, 1n));
    }
    const numeric: NumericLayout = copyNumericLayout(numericParts(output));
    if (numeric.valid === false) {
        return { kind: "Error", value: makeSqlError(jsonbNumericRange) };
    }
    return { kind: "Value", value: output };
}
function jsonbKeyCompare(source: JsonbCharacters, left: JsonbNode, right: JsonbNode): number {
    const a: number = langruntime.checkedSubtract(left.keyEnd, left.keyStart);
    const b: number = langruntime.checkedSubtract(right.keyEnd, right.keyStart);
    if (a < b) {
        return langruntime.checkedSignedNegate(1);
    }
    if (a > b) {
        return 1;
    }
    let offset: number = 0;
    while (offset < a) {
        const x: number = langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedAdd(left.keyStart, offset)))).codePointAt(0)!;
        const y: number = langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedAdd(right.keyStart, offset)))).codePointAt(0)!;
        if (x < y) {
            return langruntime.checkedSignedNegate(1);
        }
        if (x > y) {
            return 1;
        }
        offset = langruntime.checkedAdd(offset, 1);
    }
    return 0;
}
function jsonbNormalizeObjects(input: JsonbPayload): JsonbPayload {
    input = copyJsonbPayload(input);
    const source: JsonbCharacters = { characters: input.characters };
    let nodes: JsonbNode[] = input.nodes;
    let index: number = 1;
    while (index < nodes.length) {
        const parent: JsonbNode = langruntime.indexStruct(nodes, langruntime.checkedIndex(index), copyJsonbNode);
        if (parent.kind === 6) {
            let entries: number[] = [];
            let scratch: number[] = [];
            let child: number = parent.child;
            while (child > 0) {
                langruntime.pushIndex(entries, child);
                langruntime.pushIndex(scratch, 0);
                child = langruntime.checkedIndex(langruntime.indexStruct(nodes, langruntime.checkedIndex(child), copyJsonbNode).next);
            }
            let width: number = 1;
            while (width < entries.length) {
                let begin: number = 0;
                while (begin < entries.length) {
                    let middle: number = langruntime.checkedAdd(begin, width);
                    if (middle > entries.length) {
                        middle = langruntime.checkedIndex(entries.length);
                    }
                    let end: number = langruntime.checkedAdd(middle, width);
                    if (end > entries.length) {
                        end = langruntime.checkedIndex(entries.length);
                    }
                    let a: number = begin;
                    let b: number = middle;
                    let out: number = begin;
                    while (out < end) {
                        let takeLeft: boolean = b === end;
                        if (a < middle && b < end) {
                            const comparison: number = jsonbKeyCompare(source, langruntime.indexStruct(nodes, langruntime.checkedIndex(langruntime.indexNumber(entries, langruntime.checkedIndex(a))), copyJsonbNode), langruntime.indexStruct(nodes, langruntime.checkedIndex(langruntime.indexNumber(entries, langruntime.checkedIndex(b))), copyJsonbNode));
                            takeLeft = langruntime.checkedBool(comparison < 0 || (comparison === 0 && langruntime.indexNumber(entries, langruntime.checkedIndex(a)) > langruntime.indexNumber(entries, langruntime.checkedIndex(b))));
                        }
                        if (a < middle && takeLeft) {
                            scratch[langruntime.checkedIndexIn(scratch, out)] = langruntime.checkedIndex(langruntime.indexNumber(entries, langruntime.checkedIndex(a)));
                            a = langruntime.checkedAdd(a, 1);
                        }
                        else {
                            scratch[langruntime.checkedIndexIn(scratch, out)] = langruntime.checkedIndex(langruntime.indexNumber(entries, langruntime.checkedIndex(b)));
                            b = langruntime.checkedAdd(b, 1);
                        }
                        out = langruntime.checkedAdd(out, 1);
                    }
                    begin = langruntime.checkedIndex(end);
                }
                let out: number = 0;
                while (out < entries.length) {
                    entries[langruntime.checkedIndexIn(entries, out)] = langruntime.checkedIndex(langruntime.indexNumber(scratch, langruntime.checkedIndex(out)));
                    out = langruntime.checkedAdd(out, 1);
                }
                width = langruntime.checkedIndex(langruntime.checkedAdd(width, width));
            }
            let first: number = 0;
            let last: number = 0;
            let out: number = 0;
            while (out < entries.length) {
                const current: number = langruntime.indexNumber(entries, langruntime.checkedIndex(out));
                if (last === 0 || !(jsonbKeyCompare(source, langruntime.indexStruct(nodes, langruntime.checkedIndex(last), copyJsonbNode), langruntime.indexStruct(nodes, langruntime.checkedIndex(current), copyJsonbNode)) === 0)) {
                    if (last === 0) {
                        first = langruntime.checkedIndex(current);
                    }
                    else {
                        nodes[langruntime.checkedIndexIn(nodes, last)] = jsonbNodeLink(langruntime.indexStruct(nodes, langruntime.checkedIndex(last), copyJsonbNode), current);
                    }
                    last = langruntime.checkedIndex(current);
                }
                out = langruntime.checkedAdd(out, 1);
            }
            if (last > 0) {
                nodes[langruntime.checkedIndexIn(nodes, last)] = jsonbNodeLink(langruntime.indexStruct(nodes, langruntime.checkedIndex(last), copyJsonbNode), 0);
            }
            nodes[langruntime.checkedIndexIn(nodes, index)] = jsonbNodeChild(parent, first);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { characters: source.characters, nodes: nodes, root: input.root };
}
function jsonbParseTextContext(input: TextValue, admission: boolean, utf8: boolean): JsonbValue {
    admission = langruntime.checkedBool(admission);
    utf8 = langruntime.checkedBool(utf8);
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "NonNull") {
        if (unresolvedFlavor < 1) {
            unresolvedFlavor = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const source: JsonSyntaxSource = { characters: Array.from(value) };
        let characters: string[] = [];
        let nodes: JsonbNode[] = [];
        langruntime.pushStruct(nodes, { kind: langruntime.checkedSignedNegate(1), child: 0, next: 0, keyStart: 0, keyEnd: 0, textStart: 0, textEnd: 0 }, copyJsonbNode);
        let frames: JsonbFrame[] = [];
        langruntime.pushStruct(frames, { state: jsonSyntaxRootValue, node: 0, tail: 0, keyStart: 0, keyEnd: 0 }, copyJsonbFrame);
        let depth: number = 1;
        let position: number = 0;
        let root: number = 0;
        while (depth > 0) {
            const token: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, position));
            let decoded: TextValue = { kind: "Null" };
            if (token.start < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(token.start)) === "\"") {
                decoded = jsonReadDecodeStringContext(source, token, utf8);
                if (decoded.kind === "Error") {
                    const error: SqlError = decoded.value;
                    return { kind: "Error", value: error };
                }
                let conditionFlavor31716: number = unresolvedFlavor;
                if (decoded.kind === "Unknown") {
                    if (conditionFlavor31716 < 1) {
                        conditionFlavor31716 = langruntime.checkedI32(1);
                    }
                }
                if (decoded.kind === "Unimplemented") {
                    conditionFlavor31716 = langruntime.checkedI32(2);
                }
                if ((equalTextValue(decoded, { kind: "Unknown" }) || equalTextValue(decoded, { kind: "Unimplemented" })) || equalTextValue(decoded, { kind: "NonNull" })) {
                    return jsonbUnresolved(conditionFlavor31716);
                }
            }
            if (token.syntax === jsonSyntaxInvalid) {
                return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
            }
            const frame: JsonbFrame = copyJsonbFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1)), copyJsonbFrame));
            if (admission && frame.state === jsonSyntaxObjectValue) {
                let low: bigint = 0n;
                let high: bigint = 0n;
                let key: number = frame.keyStart;
                while (key < frame.keyEnd) {
                    low = langruntime.checkedI64(langruntime.checkedI64Add(low, 1n));
                    high = langruntime.checkedI64(langruntime.checkedI64Add(high, 1n));
                    if (langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(key))).codePointAt(0)! > 127) {
                        high = langruntime.checkedI64(langruntime.checkedI64Add(high, 3n));
                    }
                    key = langruntime.checkedAdd(key, 1);
                }
                const decision: BoolValue = jsonbStorageDecision(jsonbStorageBounds(low, high));
                if (decision.kind === "Error") {
                    const error: SqlError = decision.value;
                    return { kind: "Error", value: error };
                }
                let conditionFlavor34116: number = unresolvedFlavor;
                if (decision.kind === "Unknown") {
                    if (conditionFlavor34116 < 1) {
                        conditionFlavor34116 = langruntime.checkedI32(1);
                    }
                }
                if (decision.kind === "Unimplemented") {
                    conditionFlavor34116 = langruntime.checkedI32(2);
                }
                if (equalBoolValue(decision, { kind: "Unknown" }) || equalBoolValue(decision, { kind: "Unimplemented" })) {
                    return jsonbUnresolved(conditionFlavor34116);
                }
            }
            const transition: JsonSyntaxTransition = copyJsonSyntaxTransition(jsonSyntaxStep(frame.state, token.syntax));
            if (transition.action === jsonSyntaxReject) {
                return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
            }
            if (transition.action === jsonSyntaxFinish) {
                const payload: JsonbPayload = { characters: characters, nodes: nodes, root: root };
                const normalized: JsonbPayload = jsonbNormalizeObjects(payload);
                if (admission) {
                    const decision: BoolValue = jsonbStorageAdmission(normalized);
                    if (decision.kind === "Error") {
                        const error: SqlError = decision.value;
                        return { kind: "Error", value: error };
                    }
                    let conditionFlavor36120: number = unresolvedFlavor;
                    if (decision.kind === "Unknown") {
                        if (conditionFlavor36120 < 1) {
                            conditionFlavor36120 = langruntime.checkedI32(1);
                        }
                    }
                    if (decision.kind === "Unimplemented") {
                        conditionFlavor36120 = langruntime.checkedI32(2);
                    }
                    if (equalBoolValue(decision, { kind: "Unknown" }) || equalBoolValue(decision, { kind: "Unimplemented" })) {
                        return jsonbUnresolved(conditionFlavor36120);
                    }
                }
                return { kind: "Value", value: normalized };
            }
            let keyStart: number = frame.keyStart;
            let keyEnd: number = frame.keyEnd;
            let tail: number = frame.tail;
            if (transition.action === jsonSyntaxClose) {
                depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
            }
            else {
                if (transition.action === jsonSyntaxKey) {
                    keyStart = langruntime.checkedIndex(characters.length);
                    if (decoded.kind === "Value") {
                        const key: string = langruntime.checkedString(decoded.value);
                        const content: string[] = Array.from(key);
                        let i: number = 0;
                        while (i < content.length) {
                            langruntime.pushChar(characters, langruntime.indexChar(content, langruntime.checkedIndex(i)));
                            i = langruntime.checkedAdd(i, 1);
                        }
                    }
                    keyEnd = langruntime.checkedIndex(characters.length);
                }
                else if (transition.action === jsonSyntaxValue || transition.action === jsonSyntaxOpenArray || transition.action === jsonSyntaxOpenObject) {
                    if (token.syntax === jsonSyntaxNumber) {
                        decoded = jsonbNumberText(source, token, utf8);
                        if (decoded.kind === "Error") {
                            const error: SqlError = decoded.value;
                            return { kind: "Error", value: error };
                        }
                        let conditionFlavor39324: number = unresolvedFlavor;
                        if (decoded.kind === "Unknown") {
                            if (conditionFlavor39324 < 1) {
                                conditionFlavor39324 = langruntime.checkedI32(1);
                            }
                        }
                        if (decoded.kind === "Unimplemented") {
                            conditionFlavor39324 = langruntime.checkedI32(2);
                        }
                        if ((equalTextValue(decoded, { kind: "Unknown" }) || equalTextValue(decoded, { kind: "Unimplemented" })) || equalTextValue(decoded, { kind: "NonNull" })) {
                            return jsonbUnresolved(conditionFlavor39324);
                        }
                    }
                    if (admission && token.kind === jsonReadQuote) {
                        const ready: BoolValue = jsonbScalarReady(source, token, utf8);
                        if (ready.kind === "Error") {
                            const error: SqlError = ready.value;
                            return { kind: "Error", value: error };
                        }
                        let conditionFlavor40224: number = unresolvedFlavor;
                        if (ready.kind === "Unknown") {
                            if (conditionFlavor40224 < 1) {
                                conditionFlavor40224 = langruntime.checkedI32(1);
                            }
                        }
                        if (ready.kind === "Unimplemented") {
                            conditionFlavor40224 = langruntime.checkedI32(2);
                        }
                        if (equalBoolValue(ready, { kind: "Unknown" }) || equalBoolValue(ready, { kind: "Unimplemented" })) {
                            return jsonbUnresolved(conditionFlavor40224);
                        }
                        const sizeText: TextValue = decoded;
                        if (sizeText.kind === "Value") {
                            const text: string = langruntime.checkedString(sizeText.value);
                            const content: string[] = Array.from(text);
                            let low: bigint = 0n;
                            let high: bigint = 0n;
                            let position1: number = 0;
                            while (position1 < content.length) {
                                low = langruntime.checkedI64(langruntime.checkedI64Add(low, 1n));
                                high = langruntime.checkedI64(langruntime.checkedI64Add(high, 1n));
                                if (langruntime.checkedChar(langruntime.indexChar(content, langruntime.checkedIndex(position1))).codePointAt(0)! > 127) {
                                    high = langruntime.checkedI64(langruntime.checkedI64Add(high, 3n));
                                }
                                position1 = langruntime.checkedAdd(position1, 1);
                            }
                            const decision: BoolValue = jsonbStorageDecision(jsonbStorageBounds(low, high));
                            if (decision.kind === "Error") {
                                const error: SqlError = decision.value;
                                return { kind: "Error", value: error };
                            }
                            let conditionFlavor42328: number = unresolvedFlavor;
                            if (decision.kind === "Unknown") {
                                if (conditionFlavor42328 < 1) {
                                    conditionFlavor42328 = langruntime.checkedI32(1);
                                }
                            }
                            if (decision.kind === "Unimplemented") {
                                conditionFlavor42328 = langruntime.checkedI32(2);
                            }
                            if (equalBoolValue(decision, { kind: "Unknown" }) || equalBoolValue(decision, { kind: "Unimplemented" })) {
                                return jsonbUnresolved(conditionFlavor42328);
                            }
                        }
                    }
                    const textStart: number = characters.length;
                    if (decoded.kind === "Value") {
                        const text: string = langruntime.checkedString(decoded.value);
                        const content: string[] = Array.from(text);
                        let i: number = 0;
                        while (i < content.length) {
                            langruntime.pushChar(characters, langruntime.indexChar(content, langruntime.checkedIndex(i)));
                            i = langruntime.checkedAdd(i, 1);
                        }
                    }
                    const current: number = nodes.length;
                    langruntime.pushStruct(nodes, { kind: jsonSyntaxRootKind(token.syntax), child: 0, next: 0, keyStart: keyStart, keyEnd: keyEnd, textStart: textStart, textEnd: characters.length }, copyJsonbNode);
                    if (frame.node === 0) {
                        root = langruntime.checkedIndex(current);
                    }
                    else if (tail === 0) {
                        nodes[langruntime.checkedIndexIn(nodes, frame.node)] = jsonbNodeChild(langruntime.indexStruct(nodes, langruntime.checkedIndex(frame.node), copyJsonbNode), current);
                    }
                    else {
                        nodes[langruntime.checkedIndexIn(nodes, tail)] = jsonbNodeLink(langruntime.indexStruct(nodes, langruntime.checkedIndex(tail), copyJsonbNode), current);
                    }
                    tail = langruntime.checkedIndex(current);
                }
                frames[langruntime.checkedIndexIn(frames, langruntime.checkedSubtract(depth, 1))] = copyJsonbFrame({ state: transition.state, node: frame.node, tail: tail, keyStart: keyStart, keyEnd: keyEnd });
                if (transition.action === jsonSyntaxOpenArray || transition.action === jsonSyntaxOpenObject) {
                    let state: number = jsonSyntaxArrayFirst;
                    if (transition.action === jsonSyntaxOpenObject) {
                        state = langruntime.checkedI32(jsonSyntaxObjectFirst);
                    }
                    const child: JsonbFrame = copyJsonbFrame({ state: state, node: tail, tail: 0, keyStart: 0, keyEnd: 0 });
                    if (depth < frames.length) {
                        frames[langruntime.checkedIndexIn(frames, depth)] = copyJsonbFrame(child);
                    }
                    else {
                        langruntime.pushStruct(frames, child, copyJsonbFrame);
                    }
                    depth = langruntime.checkedAdd(depth, 1);
                }
            }
            position = langruntime.checkedIndex(token.end);
        }
    }
    return jsonbUnresolved(unresolvedFlavor);
}
function jsonbQuote(source: JsonbPayload, begin: number, end: number): string {
    begin = langruntime.checkedIndex(begin);
    end = langruntime.checkedIndex(end);
    let output: string = "";
    output = output + langruntime.checkedChar("\"");
    const hex: string[] = Array.from("0123456789abcdef");
    let position: number = begin;
    while (position < end) {
        const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
        const code: number = langruntime.checkedChar(character).codePointAt(0)!;
        if (character === "\"") {
            output = output + "\\\"";
        }
        else if (character === "\\") {
            output = output + "\\\\";
        }
        else if (character === "\b") {
            output = output + "\\b";
        }
        else if (character === "\f") {
            output = output + "\\f";
        }
        else if (character === "\n") {
            output = output + "\\n";
        }
        else if (character === "\r") {
            output = output + "\\r";
        }
        else if (character === "\t") {
            output = output + "\\t";
        }
        else if (code < 32) {
            output = output + "\\u00";
            output = output + langruntime.checkedChar(langruntime.indexChar(hex, langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedDivide(code, 16), 0))));
            output = output + langruntime.checkedChar(langruntime.indexChar(hex, langruntime.checkedIndex(langruntime.indexFromI32(langruntime.checkedSignedRemainder(code, 16), 0))));
        }
        else {
            output = output + langruntime.checkedChar(character);
        }
        position = langruntime.checkedAdd(position, 1);
    }
    output = output + langruntime.checkedChar("\"");
    return output;
}
interface JsonbOutputFrame {
    node: number;
    child: number;
}
function copyJsonbOutputFrame(value: JsonbOutputFrame): JsonbOutputFrame {
    return { node: langruntime.checkedIndex(value.node), child: langruntime.checkedIndex(value.child) };
}
function jsonbRender(input: JsonbValue, requireOrder: boolean, pretty: boolean): TextValue {
    input = copyJsonbValue(input);
    requireOrder = langruntime.checkedBool(requireOrder);
    pretty = langruntime.checkedBool(pretty);
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "NonNull") {
        const maximum: JsonbKnowledge = copyJsonbKnowledge(input.value);
        if (pretty) {
            return textUnresolved(unresolvedFlavor);
        }
        return { kind: "NonNull" };
    }
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: JsonbPayload = copyJsonbPayload(input.value);
        let output: string = "";
        let frames: JsonbOutputFrame[] = [];
        let depth: number = 0;
        let current: number = value.root;
        let visiting: boolean = true;
        while (visiting || depth > 0) {
            if (visiting) {
                const node: JsonbNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(current), copyJsonbNode);
                if (node.kind === 0) {
                    output = output + "null";
                }
                else if (node.kind === 1) {
                    output = output + "false";
                }
                else if (node.kind === 2) {
                    output = output + "true";
                }
                else if (node.kind === 3) {
                    let position: number = node.textStart;
                    while (position < node.textEnd) {
                        output = output + langruntime.checkedChar(langruntime.indexChar(value.characters, langruntime.checkedIndex(position)));
                        position = langruntime.checkedAdd(position, 1);
                    }
                }
                else if (node.kind === 4) {
                    const quoted: string = jsonbQuote(value, node.textStart, node.textEnd);
                    output = output + quoted;
                }
                else {
                    if (node.kind === 6 && requireOrder) {
                        let member: number = node.child;
                        let nonempty: number = 0;
                        let unicode: boolean = false;
                        while (member > 0) {
                            const entry: JsonbNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(member), copyJsonbNode);
                            if (entry.keyEnd > entry.keyStart) {
                                nonempty = langruntime.checkedAdd(nonempty, 1);
                            }
                            let position: number = entry.keyStart;
                            while (position < entry.keyEnd) {
                                if (langruntime.checkedChar(langruntime.indexChar(value.characters, langruntime.checkedIndex(position))).codePointAt(0)! > 127) {
                                    unicode = langruntime.checkedBool(true);
                                }
                                position = langruntime.checkedAdd(position, 1);
                            }
                            member = langruntime.checkedIndex(entry.next);
                        }
                        if (unicode && nonempty > 1) {
                            return textUnresolved(resolutionContext(unresolvedFlavor));
                        }
                    }
                    if (node.kind === 5) {
                        output = output + langruntime.checkedChar("[");
                    }
                    else {
                        output = output + langruntime.checkedChar("{");
                    }
                    const frame: JsonbOutputFrame = copyJsonbOutputFrame({ node: current, child: node.child });
                    if (depth < frames.length) {
                        frames[langruntime.checkedIndexIn(frames, depth)] = copyJsonbOutputFrame(frame);
                    }
                    else {
                        langruntime.pushStruct(frames, frame, copyJsonbOutputFrame);
                    }
                    depth = langruntime.checkedAdd(depth, 1);
                }
                visiting = langruntime.checkedBool(false);
            }
            else {
                const frame: JsonbOutputFrame = copyJsonbOutputFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1)), copyJsonbOutputFrame));
                const node: JsonbNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(frame.node), copyJsonbNode);
                if (frame.child === 0) {
                    if (pretty) {
                        output = output + langruntime.checkedChar("\n");
                        let level: number = 0;
                        while (langruntime.checkedAdd(level, 1) < depth) {
                            output = output + "    ";
                            level = langruntime.checkedAdd(level, 1);
                        }
                    }
                    if (node.kind === 5) {
                        output = output + langruntime.checkedChar("]");
                    }
                    else {
                        output = output + langruntime.checkedChar("}");
                    }
                    depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
                }
                else {
                    const child: JsonbNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(frame.child), copyJsonbNode);
                    if (!(frame.child === node.child)) {
                        if (pretty) {
                            output = output + langruntime.checkedChar(",");
                        }
                        else {
                            output = output + ", ";
                        }
                    }
                    if (pretty) {
                        output = output + langruntime.checkedChar("\n");
                        let level: number = 0;
                        while (level < depth) {
                            output = output + "    ";
                            level = langruntime.checkedAdd(level, 1);
                        }
                    }
                    if (node.kind === 6) {
                        const key: string = jsonbQuote(value, child.keyStart, child.keyEnd);
                        output = output + key;
                        output = output + ": ";
                    }
                    frames[langruntime.checkedIndexIn(frames, langruntime.checkedSubtract(depth, 1))] = copyJsonbOutputFrame({ node: frame.node, child: child.next });
                    current = langruntime.checkedIndex(frame.child);
                    visiting = langruntime.checkedBool(true);
                }
            }
        }
        return { kind: "Value", value: output };
    }
    return textUnresolved(unresolvedFlavor);
}
export function jsonbToText(input: JsonbValue): TextValue {
    input = copyJsonbValue(input);
    return jsonbRender(input, true, false);
}
export function jsonbFromText(input: TextValue): JsonbValue {
    return jsonbParseText(input, true);
}
function jsonbParseText(input: TextValue, admission: boolean): JsonbValue {
    admission = langruntime.checkedBool(admission);
    return jsonbParseTextContext(input, admission, false);
}
interface JsonbStorageSize {
    low: bigint;
    high: bigint;
    reachable: boolean;
}
function copyJsonbStorageSize(value: JsonbStorageSize): JsonbStorageSize {
    return { low: langruntime.checkedI64(value.low), high: langruntime.checkedI64(value.high), reachable: langruntime.checkedBool(value.reachable) };
}
const jsonbStorageLimit = 268435455n;
const jsonbStorageError = 8584704;
function jsonbStorageBounds(low: bigint, high: bigint): JsonbStorageSize {
    low = langruntime.checkedI64(low);
    high = langruntime.checkedI64(high);
    const ceiling: bigint = langruntime.checkedI64Add(jsonbStorageLimit, 4n);
    let a: bigint = low;
    let b: bigint = high;
    if (a > ceiling) {
        a = langruntime.checkedI64(ceiling);
    }
    if (b > ceiling) {
        b = langruntime.checkedI64(ceiling);
    }
    return { low: a, high: b, reachable: true };
}
function jsonbStorageDecision(size: JsonbStorageSize): BoolValue {
    size = copyJsonbStorageSize(size);
    const unresolvedFlavor: number = 0;
    if (size.low > jsonbStorageLimit) {
        return { kind: "Error", value: makeSqlError(jsonbStorageError) };
    }
    if (size.high > jsonbStorageLimit) {
        return boolUnresolved(resolutionContext(unresolvedFlavor));
    }
    return { kind: "Value", value: true };
}
function jsonbStorageAligned(value: bigint): bigint {
    value = langruntime.checkedI64(value);
    return langruntime.checkedI64Multiply((langruntime.checkedI64Divide((langruntime.checkedI64Add(value, 3n)), 4n)), 4n);
}
function jsonbStorageAppend(current: JsonbStorageSize, child: JsonbStorageSize, align: boolean, ordered: boolean): JsonbStorageSize {
    current = copyJsonbStorageSize(current);
    child = copyJsonbStorageSize(child);
    align = langruntime.checkedBool(align);
    ordered = langruntime.checkedBool(ordered);
    if (align) {
        if (ordered) {
            return jsonbStorageBounds(langruntime.checkedI64Add(jsonbStorageAligned(current.low), child.low), langruntime.checkedI64Add(jsonbStorageAligned(current.high), child.high));
        }
        return jsonbStorageBounds(langruntime.checkedI64Add(current.low, child.low), langruntime.checkedI64Add(langruntime.checkedI64Add(current.high, child.high), 3n));
    }
    return jsonbStorageBounds(langruntime.checkedI64Add(current.low, child.low), langruntime.checkedI64Add(current.high, child.high));
}
function jsonbStoragePadding(current: JsonbStorageSize, ordered: boolean): JsonbStorageSize {
    current = copyJsonbStorageSize(current);
    ordered = langruntime.checkedBool(ordered);
    if (ordered && current.low === current.high) {
        const padding: bigint = langruntime.checkedI64Subtract(jsonbStorageAligned(current.low), current.low);
        return jsonbStorageBounds(padding, padding);
    }
    return jsonbStorageBounds(0n, 3n);
}
interface JsonbStorageCharacters {
    nonAscii: number[];
    utf8Extra: number[];
}
function jsonbStorageUnicodeBefore(source: JsonbStorageCharacters, end: number): number {
    end = langruntime.checkedIndex(end);
    let low: number = 0;
    let high: number = source.nonAscii.length;
    while (low < high) {
        const distance: number = langruntime.checkedI32(langruntime.checkedIndex((langruntime.checkedSubtract(high, low))));
        const middle: number = langruntime.checkedAdd(low, langruntime.indexFromI32(langruntime.checkedSignedDivide(distance, 2), 0));
        if (langruntime.indexNumber(source.nonAscii, langruntime.checkedIndex(middle)) < end) {
            low = langruntime.checkedIndex(langruntime.checkedAdd(middle, 1));
        }
        else {
            high = langruntime.checkedIndex(middle);
        }
    }
    return low;
}
function jsonbStorageSpan(source: JsonbStorageCharacters, begin: number, end: number, utf8: boolean): JsonbStorageSize {
    begin = langruntime.checkedIndex(begin);
    end = langruntime.checkedIndex(end);
    utf8 = langruntime.checkedBool(utf8);
    const length: number = langruntime.checkedI32(langruntime.checkedIndex((langruntime.checkedSubtract(end, begin))));
    const first: number = jsonbStorageUnicodeBefore(source, begin);
    const last: number = jsonbStorageUnicodeBefore(source, end);
    const unicode: number = langruntime.checkedI32(langruntime.checkedIndex((langruntime.checkedSubtract(last, first))));
    const low: bigint = BigInt(langruntime.checkedI32(length));
    if (utf8) {
        const extra: number = langruntime.checkedSubtract(langruntime.indexNumber(source.utf8Extra, langruntime.checkedIndex(last)), langruntime.indexNumber(source.utf8Extra, langruntime.checkedIndex(first)));
        const bytes: bigint = langruntime.checkedI64Add(low, BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(extra))))));
        return jsonbStorageBounds(bytes, bytes);
    }
    return jsonbStorageBounds(low, langruntime.checkedI64Add(low, langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(unicode))), 3n)));
}
function jsonbStorageGroup(weight: number): number {
    weight = langruntime.checkedI32(weight);
    let group: number = langruntime.checkedSignedDivide(weight, 4);
    if (weight < 0 && !(langruntime.checkedSignedRemainder(weight, 4) === 0)) {
        group = langruntime.checkedI32(langruntime.checkedSignedSubtract(group, 1));
    }
    return group;
}
function jsonbStorageNumeric(source: JsonbPayload, node: JsonbNode): JsonbStorageSize {
    let number: string = "";
    let position: number = node.textStart;
    let fractional: boolean = false;
    let scale: number = 0;
    while (position < node.textEnd) {
        const character: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
        number = number + langruntime.checkedChar(character);
        if (fractional) {
            scale = langruntime.checkedI32(langruntime.checkedSignedAdd(scale, 1));
        }
        if (character === ".") {
            fractional = langruntime.checkedBool(true);
        }
        position = langruntime.checkedAdd(position, 1);
    }
    const layout: NumericLayout = copyNumericLayout(numericParts(number));
    let first: number = 0;
    let groups: number = 0;
    if (!(layout.sign === 0)) {
        first = langruntime.checkedI32(jsonbStorageGroup(layout.weight));
        let significant: number = 0;
        position = langruntime.checkedIndex(layout.first);
        while (position < layout.end) {
            if (!(langruntime.indexChar(source.characters, langruntime.checkedIndex(langruntime.checkedAdd(node.textStart, position))) === ".")) {
                significant = langruntime.checkedI32(langruntime.checkedSignedAdd(significant, 1));
            }
            position = langruntime.checkedAdd(position, 1);
        }
        const last: number = jsonbStorageGroup(langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(layout.weight, significant), 1));
        groups = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(first, last), 1));
    }
    let header: bigint = 8n;
    if (scale <= 63 && first >= langruntime.checkedSignedNegate(64) && first <= 63) {
        header = langruntime.checkedI64(6n);
    }
    const size: bigint = langruntime.checkedI64Add(header, langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(groups))), 2n));
    return jsonbStorageBounds(size, size);
}
function jsonbStorageCharacterIndex(source: JsonbPayload): JsonbStorageCharacters {
    let nonAscii: number[] = [];
    let utf8Extra: number[] = [];
    let totalExtra: number = 0;
    langruntime.pushIndex(utf8Extra, 0);
    let position: number = 0;
    while (position < source.characters.length) {
        if (langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))).codePointAt(0)! > 127) {
            langruntime.pushIndex(nonAscii, position);
            const character: number = langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))).codePointAt(0)!;
            totalExtra = langruntime.checkedAdd(totalExtra, 1);
            if (character >= 2048) {
                totalExtra = langruntime.checkedAdd(totalExtra, 1);
            }
            if (character >= 65536) {
                totalExtra = langruntime.checkedAdd(totalExtra, 1);
            }
            langruntime.pushIndex(utf8Extra, totalExtra);
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return { nonAscii: nonAscii, utf8Extra: utf8Extra };
}
function jsonbStorageExtents(source: JsonbPayload, characters: JsonbStorageCharacters, utf8: boolean): JsonbStorageSize[] {
    utf8 = langruntime.checkedBool(utf8);
    let sizes: JsonbStorageSize[] = [];
    let index: number = 0;
    while (index < source.nodes.length) {
        langruntime.pushStruct(sizes, { low: 0n, high: 0n, reachable: false }, copyJsonbStorageSize);
        index = langruntime.checkedAdd(index, 1);
    }
    sizes[langruntime.checkedIndexIn(sizes, source.root)] = copyJsonbStorageSize(jsonbStorageBounds(0n, 0n));
    index = langruntime.checkedIndex(1);
    while (index < source.nodes.length) {
        if (langruntime.indexStruct(sizes, langruntime.checkedIndex(index), copyJsonbStorageSize).reachable) {
            let child: number = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(index), copyJsonbNode).child;
            while (child > 0) {
                sizes[langruntime.checkedIndexIn(sizes, child)] = copyJsonbStorageSize(jsonbStorageBounds(0n, 0n));
                child = langruntime.checkedIndex(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonbNode).next);
            }
        }
        index = langruntime.checkedAdd(index, 1);
    }
    let uncertain: boolean = false;
    index = langruntime.checkedIndex(source.nodes.length);
    while (index > 1) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        if (langruntime.indexStruct(sizes, langruntime.checkedIndex(index), copyJsonbStorageSize).reachable) {
            const node: JsonbNode = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(index), copyJsonbNode);
            let size: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageBounds(0n, 0n));
            if (node.kind === 3) {
                if (node.textStart === node.textEnd) {
                    size = copyJsonbStorageSize(jsonbStorageBounds(6n, 16n));
                }
                else {
                    size = copyJsonbStorageSize(jsonbStorageNumeric(source, node));
                }
            }
            else if (node.kind === 4) {
                size = copyJsonbStorageSize(jsonbStorageSpan(characters, node.textStart, node.textEnd, utf8));
            }
            else if (node.kind >= 5) {
                let count: bigint = 0n;
                let keys: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageBounds(0n, 0n));
                let nonempty: number = 0;
                let unicode: boolean = false;
                let child: number = node.child;
                while (child > 0) {
                    count = langruntime.checkedI64(langruntime.checkedI64Add(count, 1n));
                    if (node.kind === 6) {
                        const entry: JsonbNode = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonbNode);
                        const key: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageSpan(characters, entry.keyStart, entry.keyEnd, utf8));
                        if (!(key.high === key.low)) {
                            unicode = langruntime.checkedBool(true);
                        }
                        if (entry.keyEnd > entry.keyStart) {
                            nonempty = langruntime.checkedAdd(nonempty, 1);
                        }
                        keys = copyJsonbStorageSize(jsonbStorageAppend(keys, key, false, true));
                    }
                    child = langruntime.checkedIndex(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonbNode).next);
                }
                const ordered: boolean = utf8 || unicode === false || nonempty <= 1;
                let entries: bigint = 4n;
                if (node.kind === 6) {
                    entries = langruntime.checkedI64(8n);
                }
                const header: bigint = langruntime.checkedI64Add(4n, langruntime.checkedI64Multiply(count, entries));
                size = copyJsonbStorageSize(jsonbStorageAppend(jsonbStorageBounds(header, header), keys, false, true));
                child = langruntime.checkedIndex(node.child);
                while (child > 0) {
                    const entry: JsonbNode = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonbNode);
                    const childSize: JsonbStorageSize = copyJsonbStorageSize(langruntime.indexStruct(sizes, langruntime.checkedIndex(child), copyJsonbStorageSize));
                    const align: boolean = entry.kind === 3 || entry.kind >= 5;
                    if (entry.kind >= 5) {
                        const padding: JsonbStorageSize = copyJsonbStorageSize(jsonbStoragePadding(size, ordered));
                        const total: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageBounds(langruntime.checkedI64Add(childSize.low, padding.low), langruntime.checkedI64Add(childSize.high, padding.high)));
                        const decision: BoolValue = jsonbStorageDecision(total);
                        if (decision.kind === "Error") {
                            sizes[langruntime.checkedIndexIn(sizes, source.root)] = copyJsonbStorageSize(jsonbStorageBounds(langruntime.checkedI64Add(jsonbStorageLimit, 1n), langruntime.checkedI64Add(jsonbStorageLimit, 1n)));
                            return sizes;
                        }
                        if (equalBoolValue(decision, { kind: "Unknown" }) || equalBoolValue(decision, { kind: "Unimplemented" })) {
                            uncertain = langruntime.checkedBool(true);
                        }
                    }
                    size = copyJsonbStorageSize(jsonbStorageAppend(size, childSize, align, ordered));
                    child = langruntime.checkedIndex(entry.next);
                }
                const decision: BoolValue = jsonbStorageDecision(size);
                if (decision.kind === "Error") {
                    sizes[langruntime.checkedIndexIn(sizes, source.root)] = copyJsonbStorageSize(jsonbStorageBounds(langruntime.checkedI64Add(jsonbStorageLimit, 1n), langruntime.checkedI64Add(jsonbStorageLimit, 1n)));
                    return sizes;
                }
                if (equalBoolValue(decision, { kind: "Unknown" }) || equalBoolValue(decision, { kind: "Unimplemented" })) {
                    uncertain = langruntime.checkedBool(true);
                }
            }
            sizes[langruntime.checkedIndexIn(sizes, index)] = copyJsonbStorageSize(size);
        }
    }
    let root: JsonbStorageSize = copyJsonbStorageSize(langruntime.indexStruct(sizes, langruntime.checkedIndex(source.root), copyJsonbStorageSize));
    if (langruntime.indexStruct(source.nodes, langruntime.checkedIndex(source.root), copyJsonbNode).kind < 5) {
        root = copyJsonbStorageSize(jsonbStorageAppend(jsonbStorageBounds(8n, 8n), root, false, true));
    }
    if (uncertain && root.high <= jsonbStorageLimit) {
        root = copyJsonbStorageSize(jsonbStorageBounds(root.low, langruntime.checkedI64Add(jsonbStorageLimit, 1n)));
    }
    sizes[langruntime.checkedIndexIn(sizes, source.root)] = copyJsonbStorageSize(root);
    return sizes;
}
function jsonbStorageLayout(source: JsonbPayload): JsonbStorageSize {
    const characters: JsonbStorageCharacters = jsonbStorageCharacterIndex(source);
    const sizes: JsonbStorageSize[] = jsonbStorageExtents(source, characters, false);
    return langruntime.indexStruct(sizes, langruntime.checkedIndex(source.root), copyJsonbStorageSize);
}
export function jsonbStorageAdmission(source: JsonbPayload): BoolValue {
    source = copyJsonbPayload(source);
    return jsonbStorageDecision(jsonbStorageLayout(source));
}
