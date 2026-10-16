import * as langruntime from "../langruntime/runtime.js";
export type Int2Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: number;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalInt2Value(left: Int2Value, right: Int2Value): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function int2Unknown(): Int2Value {
    return { kind: "Unknown" };
}
export function int2Null(): Int2Value {
    return { kind: "Null" };
}
export function makeInt2Value(value: number): Int2Value {
    value = langruntime.checkedI32(value);
    if (value < langruntime.checkedSignedNegate(32768) || value > 32767) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: value };
}
export function int2IsNull(value: Int2Value): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalInt2Value(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalInt2Value(value, { kind: "Null" }) };
}
export function int2FromCaseGuard(value: CheckOutcome): Int2Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function int2ToInt4(value: Int2Value): Int4Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalInt2Value(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const number: number = langruntime.checkedI32(value.value);
        return { kind: "Value", value: number };
    }
    return { kind: "Unknown" };
}
export function int2ToInt8(value: Int2Value): Int8Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalInt2Value(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const number: number = langruntime.checkedI32(value.value);
        const widened: bigint = BigInt(langruntime.checkedI32(number));
        return { kind: "Value", value: widened };
    }
    return { kind: "Unknown" };
}
export type Int4Value = {
    readonly kind: "Unknown";
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
export type Int8Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalInt8Value(left: Int8Value, right: Int8Value): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
const timestampFieldOverflow = 3452552;
function timestampMicrosecondsValid(value: bigint): boolean {
    value = langruntime.checkedI64(value);
    return value === -9223372036854775808n || value === 9223372036854775807n || (value >= -211813488000000000n && value < 9223371331200000000n);
}
export type TimestampValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalTimestampValue(left: TimestampValue, right: TimestampValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function timestampUnknown(): TimestampValue {
    return { kind: "Unknown" };
}
export function timestampNull(): TimestampValue {
    return { kind: "Null" };
}
export function makeTimestampValue(value: bigint): TimestampValue {
    value = langruntime.checkedI64(value);
    if (timestampMicrosecondsValid(value) === false) {
        return { kind: "Error", value: { state: timestampFieldOverflow } };
    }
    return { kind: "Value", value: value };
}
export function timestampIsNull(value: TimestampValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalTimestampValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalTimestampValue(value, { kind: "Null" }) };
}
export function timestampFromCaseGuard(value: CheckOutcome): TimestampValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type TimestamptzValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalTimestamptzValue(left: TimestamptzValue, right: TimestamptzValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function timestamptzUnknown(): TimestamptzValue {
    return { kind: "Unknown" };
}
export function timestamptzNull(): TimestamptzValue {
    return { kind: "Null" };
}
export function makeTimestamptzValue(value: bigint): TimestamptzValue {
    value = langruntime.checkedI64(value);
    if (timestampMicrosecondsValid(value) === false) {
        return { kind: "Error", value: { state: timestampFieldOverflow } };
    }
    return { kind: "Value", value: value };
}
export function timestamptzIsNull(value: TimestamptzValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalTimestamptzValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalTimestamptzValue(value, { kind: "Null" }) };
}
export function timestamptzFromCaseGuard(value: CheckOutcome): TimestamptzValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface EnumPayload {
    readonly ordinal: number;
    readonly labelOid: bigint;
}
function equalEnumPayload(left: EnumPayload, right: EnumPayload): boolean {
    return left.ordinal === right.ordinal && left.labelOid === right.labelOid;
}
export type EnumValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: EnumPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalEnumValue(left: EnumValue, right: EnumValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalEnumPayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function enumUnknown(): EnumValue {
    return { kind: "Unknown" };
}
export function enumNull(): EnumValue {
    return { kind: "Null" };
}
export function makeEnumValue(value: number): EnumValue {
    value = langruntime.checkedI32(value);
    return { kind: "Value", value: { ordinal: value, labelOid: 0n } };
}
export function makeCatalogEnumValue(ordinal: number, labelOid: bigint): EnumValue {
    ordinal = langruntime.checkedI32(ordinal);
    labelOid = langruntime.checkedI64(labelOid);
    if (ordinal < 0 || labelOid < 1n || labelOid > 4294967295n) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: { ordinal: ordinal, labelOid: labelOid } };
}
export function enumIsNull(value: EnumValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalEnumValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalEnumValue(value, { kind: "Null" }) };
}
export function enumFromCaseGuard(value: CheckOutcome): EnumValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type DateValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: number;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalDateValue(left: DateValue, right: DateValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function dateUnknown(): DateValue {
    return { kind: "Unknown" };
}
export function dateNull(): DateValue {
    return { kind: "Null" };
}
export function makeDateValue(value: number): DateValue {
    value = langruntime.checkedI32(value);
    if (!(value === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) && !(value === 2147483647)) {
        if (value < langruntime.checkedSignedNegate(2451545) || value >= 2145031949) {
            return { kind: "Error", value: { state: dateFieldOverflow } };
        }
    }
    return { kind: "Value", value: value };
}
export function dateIsNull(value: DateValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalDateValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalDateValue(value, { kind: "Null" }) };
}
export function dateFromCaseGuard(value: CheckOutcome): DateValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type TextValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: string;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
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
export function int4Unknown(): Int4Value {
    return { kind: "Unknown" };
}
export function int4Null(): Int4Value {
    return { kind: "Null" };
}
export function makeInt4Value(value: number): Int4Value {
    value = langruntime.checkedI32(value);
    return { kind: "Value", value: value };
}
export function int8Unknown(): Int8Value {
    return { kind: "Unknown" };
}
export function int8Null(): Int8Value {
    return { kind: "Null" };
}
export function makeInt8Value(value: bigint): Int8Value {
    value = langruntime.checkedI64(value);
    return { kind: "Value", value: value };
}
export function textUnknown(): TextValue {
    return { kind: "Unknown" };
}
export function textNull(): TextValue {
    return { kind: "Null" };
}
export function makeNameTextValue(value: string): TextValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let index: number = 0;
    while (index < chars.length) {
        const code: number = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index))).codePointAt(0)!;
        if (code === 0 || (code >= 55296 && code <= 57343)) {
            return { kind: "Unknown" };
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { kind: "Value", value: value };
}
export function makeRefcursorTextValue(value: string): TextValue {
    value = langruntime.checkedString(value);
    return makeNameTextValue(value);
}
export function makeTextValue(value: string): TextValue {
    value = langruntime.checkedString(value);
    return { kind: "Value", value: value };
}
export function boolUnknown(): BoolValue {
    return { kind: "Unknown" };
}
export function boolNull(): BoolValue {
    return { kind: "Null" };
}
export function makeBoolValue(value: boolean): BoolValue {
    value = langruntime.checkedBool(value);
    return { kind: "Value", value: value };
}
export type CheckOutcome = {
    readonly kind: "True";
} | {
    readonly kind: "False";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Unknown";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
function equalCheckOutcome(left: CheckOutcome, right: CheckOutcome): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export interface SqlError {
    readonly state: number;
}
function equalSqlError(left: SqlError, right: SqlError): boolean {
    return left.state === right.state;
}
export function makeSqlError(state: number): SqlError {
    state = langruntime.checkedIndex(state);
    return { state: state };
}
export interface SqlErrorDescription {
    message: string;
}
function copySqlErrorDescription(value: SqlErrorDescription): SqlErrorDescription {
    return { message: langruntime.checkedString(value.message) };
}
function equalSqlErrorDescription(left: SqlErrorDescription, right: SqlErrorDescription): boolean {
    return left.message === right.message;
}
const sqlErrorNumericOutOfRange = 3452547;
const sqlErrorInvalidDatetimeFormat = 3452551;
const sqlErrorDatetimeFieldOverflow = 3452552;
const sqlErrorTimezoneDisplacement = 3452553;
const sqlErrorInvalidUseOfEscape = 3452556;
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
const sqlErrorJsonSubscript = 3452655;
const sqlErrorJsonArray = 3452661;
const sqlErrorJsonMember = 3452662;
const sqlErrorJsonObject = 3452664;
const sqlErrorJsonSingleton = 3452660;
export function sqlErrorMessage(error: SqlError): SqlErrorDescription {
    if (error.state === sqlErrorJsonSubscript) {
        return { message: "invalid SQL/JSON subscript" };
    }
    if (error.state === sqlErrorJsonArray) {
        return { message: "SQL/JSON array not found" };
    }
    if (error.state === sqlErrorJsonMember) {
        return { message: "SQL/JSON member not found" };
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
export function checkFromBool(value: BoolValue): CheckOutcome {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalBoolValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalBoolValue(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (equalBoolValue(value, { kind: "Value", value: false })) {
        return { kind: "False" };
    }
    return { kind: "True" };
}
export function checkUnknown(): CheckOutcome {
    return { kind: "Unknown" };
}
export function int4IsNull(value: Int4Value): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalInt4Value(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalInt4Value(value, { kind: "Null" }) };
}
export function int8IsNull(value: Int8Value): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalInt8Value(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalInt8Value(value, { kind: "Null" }) };
}
export function textIsNull(value: TextValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalTextValue(value, { kind: "Null" }) };
}
export function boolIsNull(value: BoolValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalBoolValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalBoolValue(value, { kind: "Null" }) };
}
export function boolNotValue(value: BoolValue): BoolValue {
    if (value.kind === "Value") {
        const result: boolean = langruntime.checkedBool(value.value);
        if (result) {
            return { kind: "Value", value: false };
        }
        return { kind: "Value", value: true };
    }
    return value;
}
export function boolFromCheck(value: CheckOutcome): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalCheckOutcome(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "Value", value: equalCheckOutcome(value, { kind: "True" }) };
}
export function int4FromCaseGuard(value: CheckOutcome): Int4Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function int8FromCaseGuard(value: CheckOutcome): Int8Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function textFromCaseGuard(value: CheckOutcome): TextValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type NumericValue = {
    readonly kind: "Unknown";
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
export function numericUnknown(): NumericValue {
    return { kind: "Unknown" };
}
export function numericNull(): NumericValue {
    return { kind: "Null" };
}
export function numericIsNull(value: NumericValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalNumericValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalNumericValue(value, { kind: "Null" }) };
}
export function numericFromCaseGuard(value: CheckOutcome): NumericValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeNumericValue(value: string): NumericValue {
    value = langruntime.checkedString(value);
    const parts: NumericLayout = copyNumericLayout(numericParts(value));
    if (parts.valid === false) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: value };
}
export interface JsonPayload {
    readonly source: string;
    readonly kind: number;
    readonly depth: number;
}
export type JsonValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: JsonPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function jsonUnknown(): JsonValue {
    return { kind: "Unknown" };
}
export function jsonNull(): JsonValue {
    return { kind: "Null" };
}
export function makeJsonValue(source: string): JsonValue {
    source = langruntime.checkedString(source);
    const syntax: JsonSyntaxLayout = copyJsonSyntaxLayout(jsonSyntaxScan(source));
    if (syntax.valid === false) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: { source: source, kind: syntax.kind, depth: syntax.maxDepth } };
}
export function jsonFromCoercedText(input: TextValue): JsonValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return makeJsonValue(value);
    }
    return { kind: "Unknown" };
}
export function jsonIsNull(input: JsonValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return { kind: "Value", value: true };
    }
    return { kind: "Value", value: false };
}
export function jsonFromCaseGuard(value: CheckOutcome): JsonValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
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
export type JsonbValue = {
    readonly kind: "Unknown";
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
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: copyJsonbPayload(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
export type JsonbInput = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Boolean";
    readonly value: boolean;
} | {
    readonly kind: "Number";
    readonly value: string;
} | {
    readonly kind: "Text";
    readonly value: string;
} | {
    readonly kind: "Json";
    readonly value: JsonPayload;
} | {
    readonly kind: "Jsonb";
    readonly value: JsonbPayload;
};
export function copyJsonbInput(value: JsonbInput): JsonbInput {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Error": return { kind: "Error", value: value.value };
        case "Boolean": return { kind: "Boolean", value: langruntime.checkedBool(value.value) };
        case "Number": return { kind: "Number", value: langruntime.checkedString(value.value) };
        case "Text": return { kind: "Text", value: langruntime.checkedString(value.value) };
        case "Json": return { kind: "Json", value: value.value };
        case "Jsonb": return { kind: "Jsonb", value: copyJsonbPayload(value.value) };
    }
}
export interface JsonbArgumentPayload {
    readonly values: JsonbInput[];
}
export function copyJsonbArgumentPayload(value: JsonbArgumentPayload): JsonbArgumentPayload {
    return { values: langruntime.checkedStructs(value.values, copyJsonbInput) };
}
export type JsonbArguments = {
    readonly kind: "Values";
    readonly value: JsonbArgumentPayload;
};
export function copyJsonbArguments(value: JsonbArguments): JsonbArguments {
    switch (value.kind) {
        case "Values": return { kind: "Values", value: copyJsonbArgumentPayload(value.value) };
    }
}
export function makeJsonbArguments(): JsonbArguments {
    const values: JsonbInput[] = [];
    return { kind: "Values", value: { values: values } };
}
export function appendJsonbArgument(input: JsonbArguments, value: JsonbInput): JsonbArguments {
    input = copyJsonbArguments(input);
    value = copyJsonbInput(value);
    if (input.kind === "Values") {
        const batch: JsonbArgumentPayload = copyJsonbArgumentPayload(input.value);
        let values: JsonbInput[] = batch.values;
        langruntime.pushStruct(values, value, copyJsonbInput);
        return { kind: "Values", value: { values: values } };
    }
    return input;
}
export function jsonbKeyInputFromFloat4(input: Float4Value): JsonbInput {
    if (input.kind === "Value") {
        const bits: number = langruntime.checkedI32(input.value);
        if (bits === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) {
            return { kind: "Number", value: "-0" };
        }
    }
    return jsonbInputFromFloat4(input);
}
export function jsonbKeyInputFromFloat8(input: Float8Value): JsonbInput {
    if (input.kind === "Value") {
        const bits: bigint = langruntime.checkedI64(input.value);
        if (bits === -9223372036854775808n) {
            return { kind: "Number", value: "-0" };
        }
    }
    return jsonbInputFromFloat8(input);
}
export function jsonbInputFromBool(input: BoolValue): JsonbInput {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: boolean = langruntime.checkedBool(input.value);
        return { kind: "Boolean", value: value };
    }
    return { kind: "Unknown" };
}
export function jsonbInputFromNumeric(input: NumericValue): JsonbInput {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Number", value: value };
    }
    return { kind: "Unknown" };
}
export function jsonbInputFromText(input: TextValue): JsonbInput {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Text", value: value };
    }
    return { kind: "Unknown" };
}
export function jsonbInputFromJson(input: JsonValue): JsonbInput {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: JsonPayload = input.value;
        return { kind: "Json", value: value };
    }
    return { kind: "Unknown" };
}
export function jsonbInputFromJsonb(input: JsonbValue): JsonbInput {
    input = copyJsonbValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: JsonbPayload = copyJsonbPayload(input.value);
        return { kind: "Jsonb", value: value };
    }
    return { kind: "Unknown" };
}
function jsonbInputFloat(number: number): JsonbInput {
    number = langruntime.checkedF64(number);
    if (!(number === number)) {
        return { kind: "Number", value: "NaN" };
    }
    const infinity: number = langruntime.f64Divide(1.0, 0.0);
    if (number === infinity) {
        return { kind: "Number", value: "Infinity" };
    }
    if (number === langruntime.f64Subtract(0.0, infinity)) {
        return { kind: "Number", value: "-Infinity" };
    }
    if (number === 0.0) {
        return { kind: "Number", value: "0" };
    }
    const absolute: number = langruntime.f64Abs(number);
    if (absolute >= 1.0 && absolute <= 9.0) {
        const digit: number = langruntime.f64ToI32(absolute);
        if ((Number(langruntime.checkedI32(digit))) === absolute) {
            let output: string = "";
            if (number < 0.0) {
                output = output + langruntime.checkedChar("-");
            }
            output = output + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(digit, 48)), "0"));
            return { kind: "Number", value: output };
        }
    }
    return { kind: "Unknown" };
}
export function jsonbInputFromFloat4(input: Float4Value): JsonbInput {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalFloat4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (equalFloat4Value(input, { kind: "UnspecifiedNan" })) {
        return { kind: "Number", value: "NaN" };
    }
    if (input.kind === "Value") {
        const bits: number = langruntime.checkedI32(input.value);
        const number: number = float4Number(bits);
        return jsonbInputFloat(number);
    }
    return { kind: "Unknown" };
}
export function jsonbInputFromFloat8(input: Float8Value): JsonbInput {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalFloat8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (equalFloat8Value(input, { kind: "UnspecifiedNan" })) {
        return { kind: "Number", value: "NaN" };
    }
    if (input.kind === "Value") {
        const bits: bigint = langruntime.checkedI64(input.value);
        const number: number = float8Number(bits);
        return jsonbInputFloat(number);
    }
    return { kind: "Unknown" };
}
export function makeJsonbValue(source: string): JsonbValue {
    source = langruntime.checkedString(source);
    const parsed: JsonbValue = jsonbParseText({ kind: "Value", value: source }, false);
    if (parsed.kind === "Error") {
        return { kind: "Unknown" };
    }
    return parsed;
}
export function jsonbUnknown(): JsonbValue {
    return { kind: "Unknown" };
}
export function jsonbNull(): JsonbValue {
    return { kind: "Null" };
}
export function jsonbFromCaseGuard(value: CheckOutcome): JsonbValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function jsonbIsNull(input: JsonbValue): BoolValue {
    input = copyJsonbValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return { kind: "Value", value: true };
    }
    return { kind: "Value", value: false };
}
export function jsonbFromCoercedValue(input: JsonbValue): JsonbValue {
    input = copyJsonbValue(input);
    if (input.kind === "Value") {
        const value: JsonbPayload = copyJsonbPayload(input.value);
        if (jsonbInputValid(value) === false) {
            return { kind: "Unknown" };
        }
        const source: TextValue = jsonbRender({ kind: "Value", value: value }, false, false);
        if (source.kind === "Value") {
            const text: string = langruntime.checkedString(source.value);
            return makeJsonbValue(text);
        }
        return { kind: "Unknown" };
    }
    return input;
}
export interface NetworkAddress {
    readonly family: number;
    readonly prefix: number;
    readonly word0: number;
    readonly word1: number;
    readonly word2: number;
    readonly word3: number;
    readonly word4: number;
    readonly word5: number;
    readonly word6: number;
    readonly word7: number;
}
function equalNetworkAddress(left: NetworkAddress, right: NetworkAddress): boolean {
    return left.family === right.family && left.prefix === right.prefix && left.word0 === right.word0 && left.word1 === right.word1 && left.word2 === right.word2 && left.word3 === right.word3 && left.word4 === right.word4 && left.word5 === right.word5 && left.word6 === right.word6 && left.word7 === right.word7;
}
export type NetworkValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: NetworkAddress;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalNetworkValue(left: NetworkValue, right: NetworkValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalNetworkAddress(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function networkUnknown(): NetworkValue {
    return { kind: "Unknown" };
}
export function networkNull(): NetworkValue {
    return { kind: "Null" };
}
export function networkIsNull(value: NetworkValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalNetworkValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalNetworkValue(value, { kind: "Null" }) };
}
export function networkFromCaseGuard(value: CheckOutcome): NetworkValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeNetworkValue(value: string): NetworkValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    if (chars.length > 256) {
        return { kind: "Unknown" };
    }
    const parsed: NetworkValue = networkParse(value, false);
    if (parsed.kind === "Error") {
        return { kind: "Unknown" };
    }
    return parsed;
}
export function makeCidrValue(value: string): NetworkValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    if (chars.length > 256) {
        return { kind: "Unknown" };
    }
    const parsed: NetworkValue = networkParse(value, true);
    if (parsed.kind === "Error") {
        return { kind: "Unknown" };
    }
    return parsed;
}
export type BitValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: string;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalBitValue(left: BitValue, right: BitValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function bitUnknown(): BitValue {
    return { kind: "Unknown" };
}
export function bitNull(): BitValue {
    return { kind: "Null" };
}
export function bitIsNull(value: BitValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalBitValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalBitValue(value, { kind: "Null" }) };
}
export function bitFromCaseGuard(value: CheckOutcome): BitValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeBitValue(value: string): BitValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    if (chars.length > 2147483640) {
        return { kind: "Unknown" };
    }
    let index: number = 0;
    while (index < chars.length) {
        if (!(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "0") && !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "1")) {
            return { kind: "Unknown" };
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { kind: "Value", value: value };
}
export type ByteaValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: string;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Unspecified";
    readonly value: number;
};
export function equalByteaValue(left: ByteaValue, right: ByteaValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    if (left.kind === "Unspecified" && right.kind === "Unspecified")
        return left.value === right.value;
    return true;
}
export function byteaUnknown(): ByteaValue {
    return { kind: "Unknown" };
}
export function byteaNull(): ByteaValue {
    return { kind: "Null" };
}
export function byteaIsNull(value: ByteaValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalByteaValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalByteaValue(value, { kind: "Null" }) };
}
export function byteaFromCaseGuard(value: CheckOutcome): ByteaValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeByteaValue(value: string): ByteaValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let even: boolean = true;
    let output: string = "";
    let index: number = 0;
    while (index < chars.length) {
        const character: string = langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        const code: number = langruntime.checkedChar(character).codePointAt(0)!;
        if ((code < 48 || code > 57) && (code < 97 || code > 102)) {
            return { kind: "Unknown" };
        }
        output = output + langruntime.checkedChar(character);
        even = langruntime.checkedBool(even === false);
        index = langruntime.checkedAdd(index, 1);
    }
    if (even === false) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: output };
}
export interface MacAddress {
    readonly word0: number;
    readonly word1: number;
    readonly word2: number;
    readonly word3: number;
}
function equalMacAddress(left: MacAddress, right: MacAddress): boolean {
    return left.word0 === right.word0 && left.word1 === right.word1 && left.word2 === right.word2 && left.word3 === right.word3;
}
export type MacaddrValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: MacAddress;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalMacaddrValue(left: MacaddrValue, right: MacaddrValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalMacAddress(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function macaddrUnknown(): MacaddrValue {
    return { kind: "Unknown" };
}
export function macaddrNull(): MacaddrValue {
    return { kind: "Null" };
}
export function macaddrIsNull(value: MacaddrValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalMacaddrValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalMacaddrValue(value, { kind: "Null" }) };
}
export function macaddrFromCaseGuard(value: CheckOutcome): MacaddrValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeMacaddrValue(value: string): MacaddrValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    if (chars.length > 256) {
        return { kind: "Unknown" };
    }
    const text: MacText = { chars: chars };
    const parsed: MacParsed = copyMacParsed(macaddrParse(text));
    if (parsed.valid === false) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: parsed.address };
}
export type Macaddr8Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: MacAddress;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalMacaddr8Value(left: Macaddr8Value, right: Macaddr8Value): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalMacAddress(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function macaddr8Unknown(): Macaddr8Value {
    return { kind: "Unknown" };
}
export function macaddr8Null(): Macaddr8Value {
    return { kind: "Null" };
}
export function macaddr8IsNull(value: Macaddr8Value): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalMacaddr8Value(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalMacaddr8Value(value, { kind: "Null" }) };
}
export function macaddr8FromCaseGuard(value: CheckOutcome): Macaddr8Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeMacaddr8Value(value: string): Macaddr8Value {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    if (chars.length > 256) {
        return { kind: "Unknown" };
    }
    const text: MacText = { chars: chars };
    const parsed: MacParsed = copyMacParsed(macaddr8Parse(text));
    if (parsed.valid === false) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: parsed.address };
}
export interface Uuid {
    readonly word0: number;
    readonly word1: number;
    readonly word2: number;
    readonly word3: number;
    readonly word4: number;
    readonly word5: number;
    readonly word6: number;
    readonly word7: number;
}
function equalUuid(left: Uuid, right: Uuid): boolean {
    return left.word0 === right.word0 && left.word1 === right.word1 && left.word2 === right.word2 && left.word3 === right.word3 && left.word4 === right.word4 && left.word5 === right.word5 && left.word6 === right.word6 && left.word7 === right.word7;
}
export type UuidValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: Uuid;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalUuidValue(left: UuidValue, right: UuidValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalUuid(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function uuidUnknown(): UuidValue {
    return { kind: "Unknown" };
}
export function uuidNull(): UuidValue {
    return { kind: "Null" };
}
export function uuidIsNull(value: UuidValue): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalUuidValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalUuidValue(value, { kind: "Null" }) };
}
export function uuidFromCaseGuard(value: CheckOutcome): UuidValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeUuidValue(value: string): UuidValue {
    value = langruntime.checkedString(value);
    const parsed: UuidValue = uuidParse(value);
    if (parsed.kind === "Error") {
        return { kind: "Unknown" };
    }
    return parsed;
}
export type Float4Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: number;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "UnspecifiedNan";
};
export function equalFloat4Value(left: Float4Value, right: Float4Value): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function makeFloat4LiteralBits(bits: number): Float4Value {
    bits = langruntime.checkedI32(bits);
    const number: number = langruntime.f32FromI32Bits(bits);
    if (!(number === number)) {
        return { kind: "UnspecifiedNan" };
    }
    return makeFloat4Bits(bits);
}
export function float4Unknown(): Float4Value {
    return { kind: "Unknown" };
}
export function float4Null(): Float4Value {
    return { kind: "Null" };
}
export function makeFloat4Bits(bits: number): Float4Value {
    bits = langruntime.checkedI32(bits);
    return { kind: "Value", value: bits };
}
export function float4Number(bits: number): number {
    bits = langruntime.checkedI32(bits);
    return langruntime.f32FromI32Bits(bits);
}
export function makeFloat4Value(value: number): Float4Value {
    value = langruntime.checkedF64(value);
    const bits: number = langruntime.f32ToI32Bits(value);
    const rounded: number = float4Number(bits);
    if (value === value && !(rounded === value)) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: bits };
}
export function float4IsNull(value: Float4Value): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalFloat4Value(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalFloat4Value(value, { kind: "Null" }) };
}
export function float4FromCaseGuard(value: CheckOutcome): Float4Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type Float8Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "UnspecifiedNan";
};
export function equalFloat8Value(left: Float8Value, right: Float8Value): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function float8Semantic(input: Float8Value): Float8Value {
    if (equalFloat8Value(input, { kind: "UnspecifiedNan" })) {
        return makeFloat8Bits(9221120237041090560n);
    }
    return input;
}
export function makeFloat8LiteralBits(bits: bigint): Float8Value {
    bits = langruntime.checkedI64(bits);
    const number: number = langruntime.f64FromI64Bits(bits);
    if (!(number === number)) {
        return { kind: "UnspecifiedNan" };
    }
    return makeFloat8Bits(bits);
}
export function float8Unknown(): Float8Value {
    return { kind: "Unknown" };
}
export function float8Null(): Float8Value {
    return { kind: "Null" };
}
export function makeFloat8Bits(bits: bigint): Float8Value {
    bits = langruntime.checkedI64(bits);
    return { kind: "Value", value: bits };
}
export function float8Number(bits: bigint): number {
    bits = langruntime.checkedI64(bits);
    return langruntime.f64FromI64Bits(bits);
}
export function makeFloat8Value(value: number): Float8Value {
    value = langruntime.checkedF64(value);
    const bits: bigint = langruntime.f64ToI64Bits(value);
    return { kind: "Value", value: bits };
}
export function float8IsNull(value: Float8Value): BoolValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalFloat8Value(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalFloat8Value(value, { kind: "Null" }) };
}
export function float8FromCaseGuard(value: CheckOutcome): Float8Value {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type TimeValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalTimeValue(left: TimeValue, right: TimeValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function timeUnknown(): TimeValue {
    return { kind: "Unknown" };
}
export function timeNull(): TimeValue {
    return { kind: "Null" };
}
export function makeTimeValue(time: bigint): TimeValue {
    time = langruntime.checkedI64(time);
    if (time < 0n || time > 86400000000n) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: time };
}
export function timeIsNull(input: TimeValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTimeValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalTimeValue(input, { kind: "Null" }) };
}
export function timeFromCaseGuard(input: CheckOutcome): TimeValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface TimetzPayload {
    readonly time: bigint;
    readonly zone: number;
}
function equalTimetzPayload(left: TimetzPayload, right: TimetzPayload): boolean {
    return left.time === right.time && left.zone === right.zone;
}
export type TimetzValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: TimetzPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalTimetzValue(left: TimetzValue, right: TimetzValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalTimetzPayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function timetzUnknown(): TimetzValue {
    return { kind: "Unknown" };
}
export function timetzNull(): TimetzValue {
    return { kind: "Null" };
}
export function makeTimetzValue(time: bigint, zone: number): TimetzValue {
    time = langruntime.checkedI64(time);
    zone = langruntime.checkedI32(zone);
    if (time < 0n || time > 86400000000n) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: { time: time, zone: zone } };
}
export function timetzIsNull(input: TimetzValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTimetzValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalTimetzValue(input, { kind: "Null" }) };
}
export function timetzFromCaseGuard(input: CheckOutcome): TimetzValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface IntervalPayload {
    readonly months: number;
    readonly days: number;
    readonly time: bigint;
}
function equalIntervalPayload(left: IntervalPayload, right: IntervalPayload): boolean {
    return left.months === right.months && left.days === right.days && left.time === right.time;
}
export type IntervalValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: IntervalPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalIntervalValue(left: IntervalValue, right: IntervalValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalIntervalPayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function intervalUnknown(): IntervalValue {
    return { kind: "Unknown" };
}
export function intervalNull(): IntervalValue {
    return { kind: "Null" };
}
export function makeIntervalValue(months: number, days: number, time: bigint): IntervalValue {
    months = langruntime.checkedI32(months);
    days = langruntime.checkedI32(days);
    time = langruntime.checkedI64(time);
    return { kind: "Value", value: { months: months, days: days, time: time } };
}
export function intervalIsNull(input: IntervalValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalIntervalValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: equalIntervalValue(input, { kind: "Null" }) };
}
export function intervalFromCaseGuard(input: CheckOutcome): IntervalValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface PointPayload {
    readonly x: bigint;
    readonly y: bigint;
    readonly wireKnown: boolean;
}
export function copyPointPayload(value: PointPayload): PointPayload {
    return { x: langruntime.checkedI64(value.x), y: langruntime.checkedI64(value.y), wireKnown: langruntime.checkedBool(value.wireKnown) };
}
function equalPointPayload(left: PointPayload, right: PointPayload): boolean {
    return left.x === right.x && left.y === right.y && left.wireKnown === right.wireKnown;
}
export type PointValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: PointPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalPointValue(left: PointValue, right: PointValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalPointPayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function pointUnknown(): PointValue {
    return { kind: "Unknown" };
}
export function pointNull(): PointValue {
    return { kind: "Null" };
}
export function makePointBits(x: bigint, y: bigint): PointValue {
    x = langruntime.checkedI64(x);
    y = langruntime.checkedI64(y);
    return { kind: "Value", value: { x: x, y: y, wireKnown: true } };
}
export function makePointValue(x: number, y: number): PointValue {
    x = langruntime.checkedF64(x);
    y = langruntime.checkedF64(y);
    const xBits: bigint = langruntime.f64ToI64Bits(x);
    const yBits: bigint = langruntime.f64ToI64Bits(y);
    return makePointBits(xBits, yBits);
}
export function pointIsNull(input: PointValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalPointValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalPointValue(input, { kind: "Null" }));
}
export function pointFromCaseGuard(input: CheckOutcome): PointValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface LinePayload {
    readonly a: bigint;
    readonly b: bigint;
    readonly c: bigint;
    readonly wireKnown: boolean;
}
function equalLinePayload(left: LinePayload, right: LinePayload): boolean {
    return left.a === right.a && left.b === right.b && left.c === right.c && left.wireKnown === right.wireKnown;
}
export type LineValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: LinePayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalLineValue(left: LineValue, right: LineValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalLinePayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function lineUnknown(): LineValue {
    return { kind: "Unknown" };
}
export function lineNull(): LineValue {
    return { kind: "Null" };
}
export function makeLineBits(a: bigint, b: bigint, c: bigint): LineValue {
    a = langruntime.checkedI64(a);
    b = langruntime.checkedI64(b);
    c = langruntime.checkedI64(c);
    const first: number = float8Number(a);
    const second: number = float8Number(b);
    if (langruntime.f64Abs(first) <= 0.000001 && langruntime.f64Abs(second) <= 0.000001) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: { a: a, b: b, c: c, wireKnown: true } };
}
export function lineIsNull(input: LineValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalLineValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalLineValue(input, { kind: "Null" }));
}
export function lineFromCaseGuard(input: CheckOutcome): LineValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface LsegPayload {
    readonly x1: bigint;
    readonly y1: bigint;
    readonly x2: bigint;
    readonly y2: bigint;
    readonly wireKnown: boolean;
}
function equalLsegPayload(left: LsegPayload, right: LsegPayload): boolean {
    return left.x1 === right.x1 && left.y1 === right.y1 && left.x2 === right.x2 && left.y2 === right.y2 && left.wireKnown === right.wireKnown;
}
export type LsegValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: LsegPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalLsegValue(left: LsegValue, right: LsegValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalLsegPayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function lsegUnknown(): LsegValue {
    return { kind: "Unknown" };
}
export function lsegNull(): LsegValue {
    return { kind: "Null" };
}
export function makeLsegBits(x1: bigint, y1: bigint, x2: bigint, y2: bigint): LsegValue {
    x1 = langruntime.checkedI64(x1);
    y1 = langruntime.checkedI64(y1);
    x2 = langruntime.checkedI64(x2);
    y2 = langruntime.checkedI64(y2);
    return { kind: "Value", value: { x1: x1, y1: y1, x2: x2, y2: y2, wireKnown: true } };
}
export function lsegIsNull(input: LsegValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalLsegValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalLsegValue(input, { kind: "Null" }));
}
export function lsegFromCaseGuard(input: CheckOutcome): LsegValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface BoxPayload {
    readonly highX: bigint;
    readonly highY: bigint;
    readonly lowX: bigint;
    readonly lowY: bigint;
    readonly wireKnown: boolean;
}
function equalBoxPayload(left: BoxPayload, right: BoxPayload): boolean {
    return left.highX === right.highX && left.highY === right.highY && left.lowX === right.lowX && left.lowY === right.lowY && left.wireKnown === right.wireKnown;
}
export type BoxValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: BoxPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "NonNull";
};
export function equalBoxValue(left: BoxValue, right: BoxValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalBoxPayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function boxUnknown(): BoxValue {
    return { kind: "Unknown" };
}
export function boxNull(): BoxValue {
    return { kind: "Null" };
}
export function makeBoxBits(highX: bigint, highY: bigint, lowX: bigint, lowY: bigint): BoxValue {
    highX = langruntime.checkedI64(highX);
    highY = langruntime.checkedI64(highY);
    lowX = langruntime.checkedI64(lowX);
    lowY = langruntime.checkedI64(lowY);
    return { kind: "Value", value: { highX: highX, highY: highY, lowX: lowX, lowY: lowY, wireKnown: true } };
}
export function boxIsNull(input: BoxValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalBoxValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalBoxValue(input, { kind: "Null" }));
}
export function boxFromCaseGuard(input: CheckOutcome): BoxValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface CirclePayload {
    readonly x: bigint;
    readonly y: bigint;
    readonly radius: bigint;
    readonly wireKnown: boolean;
}
function equalCirclePayload(left: CirclePayload, right: CirclePayload): boolean {
    return left.x === right.x && left.y === right.y && left.radius === right.radius && left.wireKnown === right.wireKnown;
}
export interface PathPayload {
    readonly closed: boolean;
    readonly points: PointPayload[];
}
export function copyPathPayload(value: PathPayload): PathPayload {
    return { closed: langruntime.checkedBool(value.closed), points: langruntime.checkedStructs(value.points, copyPointPayload) };
}
export type PathValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: PathPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function copyPathValue(value: PathValue): PathValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: copyPathPayload(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
export function pathUnknown(): PathValue {
    return { kind: "Unknown" };
}
export function pathNull(): PathValue {
    return { kind: "Null" };
}
export function makePathValue(payload: PathPayload): PathValue {
    payload = copyPathPayload(payload);
    if (payload.points.length === 0) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: payload };
}
export function pathIsNull(input: PathValue): BoolValue {
    input = copyPathValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return makeBoolValue(true);
    }
    return makeBoolValue(false);
}
export function pathFromCaseGuard(input: CheckOutcome): PathValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface PolygonPayload {
    readonly points: PointPayload[];
    readonly bounds: BoxValue;
}
export function copyPolygonPayload(value: PolygonPayload): PolygonPayload {
    return { points: langruntime.checkedStructs(value.points, copyPointPayload), bounds: value.bounds };
}
export type PolygonValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: PolygonPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function copyPolygonValue(value: PolygonValue): PolygonValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: copyPolygonPayload(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
function polygonCoordinateLess(left: bigint, right: bigint): boolean {
    left = langruntime.checkedI64(left);
    right = langruntime.checkedI64(right);
    const a: number = float8Number(left);
    const b: number = float8Number(right);
    if (!(b === b)) {
        return a === a;
    }
    return a < b;
}
function polygonCoordinateEqual(left: bigint, right: bigint): boolean {
    left = langruntime.checkedI64(left);
    right = langruntime.checkedI64(right);
    const a: number = float8Number(left);
    const b: number = float8Number(right);
    return a === b || (!(a === a) && !(b === b));
}
function polygonCoordinateKnown(point: PointPayload, y: boolean): boolean {
    y = langruntime.checkedBool(y);
    let bits: bigint = point.x;
    if (y) {
        bits = langruntime.checkedI64(point.y);
    }
    const value: number = float8Number(bits);
    return point.wireKnown || value === value;
}
function polygonCalculatedBounds(payload: PolygonPayload): BoxPayload {
    payload = copyPolygonPayload(payload);
    const first: PointPayload = langruntime.indexStruct(payload.points, langruntime.checkedIndex(0), copyPointPayload);
    let highX: bigint = first.x;
    let highY: bigint = first.y;
    let lowX: bigint = first.x;
    let lowY: bigint = first.y;
    let highXKnown: boolean = polygonCoordinateKnown(first, false);
    let highYKnown: boolean = polygonCoordinateKnown(first, true);
    let lowXKnown: boolean = highXKnown;
    let lowYKnown: boolean = highYKnown;
    let index: number = 1;
    while (index < payload.points.length) {
        const point: PointPayload = langruntime.indexStruct(payload.points, langruntime.checkedIndex(index), copyPointPayload);
        if (polygonCoordinateLess(point.x, lowX)) {
            lowX = langruntime.checkedI64(point.x);
            lowXKnown = langruntime.checkedBool(polygonCoordinateKnown(point, false));
        }
        if (polygonCoordinateLess(highX, point.x)) {
            highX = langruntime.checkedI64(point.x);
            highXKnown = langruntime.checkedBool(polygonCoordinateKnown(point, false));
        }
        if (polygonCoordinateLess(point.y, lowY)) {
            lowY = langruntime.checkedI64(point.y);
            lowYKnown = langruntime.checkedBool(polygonCoordinateKnown(point, true));
        }
        if (polygonCoordinateLess(highY, point.y)) {
            highY = langruntime.checkedI64(point.y);
            highYKnown = langruntime.checkedBool(polygonCoordinateKnown(point, true));
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { highX: highX, highY: highY, lowX: lowX, lowY: lowY, wireKnown: highXKnown && highYKnown && lowXKnown && lowYKnown };
}
function polygonBoundsAmbiguous(payload: PolygonPayload, bounds: BoxPayload): boolean {
    payload = copyPolygonPayload(payload);
    if (bounds.wireKnown === false) {
        return true;
    }
    let index: number = 0;
    while (index < payload.points.length) {
        const point: PointPayload = langruntime.indexStruct(payload.points, langruntime.checkedIndex(index), copyPointPayload);
        if ((polygonCoordinateEqual(point.x, bounds.highX) && !(point.x === bounds.highX)) || (polygonCoordinateEqual(point.x, bounds.lowX) && !(point.x === bounds.lowX)) || (polygonCoordinateEqual(point.y, bounds.highY) && !(point.y === bounds.highY)) || (polygonCoordinateEqual(point.y, bounds.lowY) && !(point.y === bounds.lowY))) {
            return true;
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return false;
}
export function makePolygonValue(payload: PolygonPayload): PolygonValue {
    payload = copyPolygonPayload(payload);
    const maximumPoints: number = 134217725;
    const fallback: number = 0;
    const maximum: number = langruntime.indexFromI32(maximumPoints, fallback);
    if (payload.points.length === 0 || payload.points.length > maximum) {
        return { kind: "Unknown" };
    }
    const calculated: BoxPayload = polygonCalculatedBounds(copyPolygonPayload(payload));
    let bounds: BoxValue = payload.bounds;
    if (equalBoxValue(bounds, { kind: "Unknown" })) {
        bounds = { kind: "NonNull" };
        if (polygonBoundsAmbiguous(copyPolygonPayload(payload), calculated) === false) {
            bounds = { kind: "Value", value: calculated };
        }
    }
    if (bounds.kind === "Value") {
        const actual: BoxPayload = bounds.value;
        if (polygonCoordinateEqual(actual.highX, calculated.highX) === false || polygonCoordinateEqual(actual.highY, calculated.highY) === false || polygonCoordinateEqual(actual.lowX, calculated.lowX) === false || polygonCoordinateEqual(actual.lowY, calculated.lowY) === false) {
            return { kind: "Unknown" };
        }
    }
    if (equalBoxValue(bounds, { kind: "Null" })) {
        return { kind: "Unknown" };
    }
    if (bounds.kind === "Error") {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: { points: payload.points, bounds: bounds } };
}
export function makePolygonPoints(payload: PolygonPayload): PolygonValue {
    payload = copyPolygonPayload(payload);
    const maximumPoints: number = 134217725;
    const fallback: number = 0;
    const maximum: number = langruntime.indexFromI32(maximumPoints, fallback);
    if (payload.points.length === 0 || payload.points.length > maximum) {
        return { kind: "Unknown" };
    }
    const bounds: BoxPayload = polygonCalculatedBounds(copyPolygonPayload(payload));
    return { kind: "Value", value: { points: payload.points, bounds: { kind: "Value", value: bounds } } };
}
export function polygonUnknown(): PolygonValue {
    return { kind: "Unknown" };
}
export function polygonNull(): PolygonValue {
    return { kind: "Null" };
}
export function polygonIsNull(input: PolygonValue): BoolValue {
    input = copyPolygonValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return makeBoolValue(true);
    }
    return makeBoolValue(false);
}
export function polygonFromCaseGuard(input: CheckOutcome): PolygonValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type CircleValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: CirclePayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalCircleValue(left: CircleValue, right: CircleValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return equalCirclePayload(left.value, right.value);
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function circleUnknown(): CircleValue {
    return { kind: "Unknown" };
}
export function circleNull(): CircleValue {
    return { kind: "Null" };
}
export function makeCircleBits(x: bigint, y: bigint, radius: bigint): CircleValue {
    x = langruntime.checkedI64(x);
    y = langruntime.checkedI64(y);
    radius = langruntime.checkedI64(radius);
    return { kind: "Value", value: { x: x, y: y, radius: radius, wireKnown: true } };
}
export function circleIsNull(input: CircleValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalCircleValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalCircleValue(input, { kind: "Null" }));
}
export function circleFromCaseGuard(input: CheckOutcome): CircleValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type MoneyValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalMoneyValue(left: MoneyValue, right: MoneyValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function moneyUnknown(): MoneyValue {
    return { kind: "Unknown" };
}
export function moneyNull(): MoneyValue {
    return { kind: "Null" };
}
export function makeMoneyValue(units: bigint): MoneyValue {
    units = langruntime.checkedI64(units);
    return { kind: "Value", value: units };
}
export function moneyIsNull(input: MoneyValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalMoneyValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalMoneyValue(input, { kind: "Null" }));
}
export function moneyFromCaseGuard(input: CheckOutcome): MoneyValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type InternalCharValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: number;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalInternalCharValue(left: InternalCharValue, right: InternalCharValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function internalCharUnknown(): InternalCharValue {
    return { kind: "Unknown" };
}
export function internalCharNull(): InternalCharValue {
    return { kind: "Null" };
}
export function makeInternalCharValue(units: number): InternalCharValue {
    units = langruntime.checkedI32(units);
    if (units < 0 || units > 255) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: units };
}
export function internalCharIsNull(input: InternalCharValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalInternalCharValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalInternalCharValue(input, { kind: "Null" }));
}
export function internalCharFromCaseGuard(input: CheckOutcome): InternalCharValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type OidValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalOidValue(left: OidValue, right: OidValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function oidUnknown(): OidValue {
    return { kind: "Unknown" };
}
export function oidNull(): OidValue {
    return { kind: "Null" };
}
export function makeOidValue(units: bigint): OidValue {
    units = langruntime.checkedI64(units);
    if (units < 0n || units > 4294967295n) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: units };
}
export function oidIsNull(input: OidValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalOidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalOidValue(input, { kind: "Null" }));
}
export function oidFromCaseGuard(input: CheckOutcome): OidValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type XidValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalXidValue(left: XidValue, right: XidValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function xidUnknown(): XidValue {
    return { kind: "Unknown" };
}
export function xidNull(): XidValue {
    return { kind: "Null" };
}
export function makeXidValue(units: bigint): XidValue {
    units = langruntime.checkedI64(units);
    if (units < 0n || units > 4294967295n) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: units };
}
export function xidIsNull(input: XidValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalXidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalXidValue(input, { kind: "Null" }));
}
export function xidFromCaseGuard(input: CheckOutcome): XidValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type CidValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalCidValue(left: CidValue, right: CidValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function cidUnknown(): CidValue {
    return { kind: "Unknown" };
}
export function cidNull(): CidValue {
    return { kind: "Null" };
}
export function makeCidValue(units: bigint): CidValue {
    units = langruntime.checkedI64(units);
    if (units < 0n || units > 4294967295n) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: units };
}
export function cidIsNull(input: CidValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalCidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalCidValue(input, { kind: "Null" }));
}
export function cidFromCaseGuard(input: CheckOutcome): CidValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export interface SnapshotXid {
    readonly bits: bigint;
}
export function copySnapshotXid(value: SnapshotXid): SnapshotXid {
    return { bits: langruntime.checkedI64(value.bits) };
}
export interface SnapshotPayload {
    readonly xmin: bigint;
    readonly xmax: bigint;
    readonly xip: SnapshotXid[];
}
export function copySnapshotPayload(value: SnapshotPayload): SnapshotPayload {
    return { xmin: langruntime.checkedI64(value.xmin), xmax: langruntime.checkedI64(value.xmax), xip: langruntime.checkedStructs(value.xip, copySnapshotXid) };
}
export type SnapshotValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: SnapshotPayload;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function copySnapshotValue(value: SnapshotValue): SnapshotValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: copySnapshotPayload(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
export function snapshotXidOrder(left: bigint, right: bigint): number {
    left = langruntime.checkedI64(left);
    right = langruntime.checkedI64(right);
    if (left < 0n && right >= 0n) {
        return 1;
    }
    if (left >= 0n && right < 0n) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left < right) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left > right) {
        return 1;
    }
    return 0;
}
export function snapshotUnknown(): SnapshotValue {
    return { kind: "Unknown" };
}
export function snapshotNull(): SnapshotValue {
    return { kind: "Null" };
}
export function snapshotCountFits(count: number): boolean {
    count = langruntime.checkedIndex(count);
    return count <= 134217724;
}
export function makeSnapshotValue(payload: SnapshotPayload): SnapshotValue {
    payload = copySnapshotPayload(payload);
    if (snapshotCountFits(payload.xip.length) === false) {
        return { kind: "Unknown" };
    }
    if (payload.xmin === 0n || payload.xmax === 0n || snapshotXidOrder(payload.xmin, payload.xmax) > 0) {
        return { kind: "Unknown" };
    }
    let index: number = 0;
    let previous: bigint = 0n;
    while (index < payload.xip.length) {
        const bits: bigint = langruntime.indexStruct(payload.xip, langruntime.checkedIndex(index), copySnapshotXid).bits;
        if (snapshotXidOrder(bits, payload.xmin) < 0 || snapshotXidOrder(bits, payload.xmax) > 0 || snapshotXidOrder(bits, previous) <= 0) {
            return { kind: "Unknown" };
        }
        previous = langruntime.checkedI64(bits);
        index = langruntime.checkedAdd(index, 1);
    }
    return { kind: "Value", value: payload };
}
export function snapshotIsNull(input: SnapshotValue): BoolValue {
    input = copySnapshotValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return makeBoolValue(true);
    }
    return makeBoolValue(false);
}
export function snapshotFromCaseGuard(input: CheckOutcome): SnapshotValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type Xid8Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalXid8Value(left: Xid8Value, right: Xid8Value): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function xid8Unknown(): Xid8Value {
    return { kind: "Unknown" };
}
export function xid8Null(): Xid8Value {
    return { kind: "Null" };
}
export function makeXid8Bits(units: bigint): Xid8Value {
    units = langruntime.checkedI64(units);
    return { kind: "Value", value: units };
}
export function xid8IsNull(input: Xid8Value): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalXid8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalXid8Value(input, { kind: "Null" }));
}
export function xid8FromCaseGuard(input: CheckOutcome): Xid8Value {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type PgLsnValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalPgLsnValue(left: PgLsnValue, right: PgLsnValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function pgLsnUnknown(): PgLsnValue {
    return { kind: "Unknown" };
}
export function pgLsnNull(): PgLsnValue {
    return { kind: "Null" };
}
export function makePgLsnBits(units: bigint): PgLsnValue {
    units = langruntime.checkedI64(units);
    return { kind: "Value", value: units };
}
export function pgLsnIsNull(input: PgLsnValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalPgLsnValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalPgLsnValue(input, { kind: "Null" }));
}
export function pgLsnFromCaseGuard(input: CheckOutcome): PgLsnValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export type TidValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: bigint;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function equalTidValue(left: TidValue, right: TidValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
    return true;
}
export function tidUnknown(): TidValue {
    return { kind: "Unknown" };
}
export function tidNull(): TidValue {
    return { kind: "Null" };
}
export function makeTidValue(units: bigint): TidValue {
    units = langruntime.checkedI64(units);
    if (units < 0n || units > 281474976710655n) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: units };
}
export function tidIsNull(input: TidValue): BoolValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return makeBoolValue(equalTidValue(input, { kind: "Null" }));
}
export function tidFromCaseGuard(input: CheckOutcome): TidValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function makeTidParts(block: bigint, offset: number): TidValue {
    block = langruntime.checkedI64(block);
    offset = langruntime.checkedI32(offset);
    if (block < 0n || block > 4294967295n || offset < 0 || offset > 65535) {
        return { kind: "Unknown" };
    }
    const low: bigint = BigInt(langruntime.checkedI32(offset));
    return makeTidValue(langruntime.checkedI64Add(langruntime.checkedI64Multiply(block, 65536n), low));
}
export function jsonpathUnknown(): JsonpathValue {
    return { kind: "Unknown" };
}
export function jsonpathNull(): JsonpathValue {
    return { kind: "Null" };
}
export function jsonpathIsNull(input: JsonpathValue): BoolValue {
    input = copyJsonpathValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return { kind: "Value", value: true };
    }
    return { kind: "Value", value: false };
}
export function jsonpathFromCaseGuard(input: CheckOutcome): JsonpathValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function jsonpathFromCoercedValue(input: JsonpathValue): JsonpathValue {
    input = copyJsonpathValue(input);
    if (input.kind === "StoredText") {
        const text: string = langruntime.checkedString(input.value);
        const characters: string[] = Array.from(text);
        if (characters.length === 0) {
            return { kind: "Unknown" };
        }
        let index: number = 0;
        while (index < characters.length) {
            if (langruntime.indexChar(characters, langruntime.checkedIndex(index)) === "\0") {
                return { kind: "Unknown" };
            }
            index = langruntime.checkedAdd(index, 1);
        }
        return { kind: "StoredText", value: text };
    }
    if (input.kind === "Value") {
        const value: JsonpathPayload = copyJsonpathPayload(input.value);
        if (value.root === 0 || value.root >= value.nodes.length) {
            return { kind: "Unknown" };
        }
        let index: number = 0;
        while (index < value.characters.length) {
            if (langruntime.indexChar(value.characters, langruntime.checkedIndex(index)) === "\0") {
                return { kind: "Unknown" };
            }
            index = langruntime.checkedAdd(index, 1);
        }
        let visited: number[] = [];
        langruntime.pushIndex(visited, 0);
        index = langruntime.checkedIndex(1);
        while (index < value.nodes.length) {
            if (jsonpathPayloadNodeValid(value, index) === false) {
                return { kind: "Unknown" };
            }
            langruntime.pushIndex(visited, 0);
            index = langruntime.checkedAdd(index, 1);
        }
        let pending: JsonpathBoundaryVisit[] = [];
        langruntime.pushStruct(pending, { node: value.root, filters: 0, subscript: false, accessor: false, list: false }, copyJsonpathBoundaryVisit);
        let depth: number = 1;
        while (depth > 0) {
            depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
            const visit: JsonpathBoundaryVisit = copyJsonpathBoundaryVisit(langruntime.indexStruct(pending, langruntime.checkedIndex(depth), copyJsonpathBoundaryVisit));
            if (!(langruntime.indexNumber(visited, langruntime.checkedIndex(visit.node)) === 0)) {
                return { kind: "Unknown" };
            }
            visited[langruntime.checkedIndexIn(visited, visit.node)] = langruntime.checkedIndex(1);
            const node: JsonpathNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(visit.node), copyJsonpathNode);
            if (!((node.kind === jsonpathNodeSubscript) === visit.list)) {
                return { kind: "Unknown" };
            }
            if (visit.list === false && !(jsonpathAccessorKind(node.kind) === visit.accessor)) {
                return { kind: "Unknown" };
            }
            if (node.kind === jsonpathNodeCurrent && visit.filters === 0) {
                return { kind: "Unknown" };
            }
            if (node.kind === jsonpathNodeLast && visit.subscript === false) {
                return { kind: "Unknown" };
            }
            let child: number = 0;
            while (child < 3) {
                let next: number = node.next;
                let filters: number = visit.filters;
                let subscript: boolean = visit.subscript;
                let accessor: boolean = true;
                let list: boolean = node.kind === jsonpathNodeSubscript;
                if (child === 1) {
                    next = langruntime.checkedIndex(node.left);
                    accessor = langruntime.checkedBool(false);
                    list = langruntime.checkedBool(node.kind === jsonpathNodeIndex);
                    if (node.kind === jsonpathNodeFilter) {
                        filters = langruntime.checkedAdd(filters, 1);
                    }
                    if (node.kind === jsonpathNodeIndex || node.kind === jsonpathNodeSubscript) {
                        subscript = langruntime.checkedBool(true);
                    }
                }
                if (child === 2) {
                    next = langruntime.checkedIndex(node.right);
                    accessor = langruntime.checkedBool(false);
                    list = langruntime.checkedBool(false);
                    if (node.kind === jsonpathNodeSubscript) {
                        subscript = langruntime.checkedBool(true);
                    }
                }
                if (next > 0) {
                    const task: JsonpathBoundaryVisit = copyJsonpathBoundaryVisit({ node: next, filters: filters, subscript: subscript, accessor: accessor, list: list });
                    if (depth < pending.length) {
                        pending[langruntime.checkedIndexIn(pending, depth)] = copyJsonpathBoundaryVisit(task);
                    }
                    else {
                        langruntime.pushStruct(pending, task, copyJsonpathBoundaryVisit);
                    }
                    depth = langruntime.checkedAdd(depth, 1);
                }
                child = langruntime.checkedAdd(child, 1);
            }
        }
        return { kind: "Value", value: value };
    }
    return input;
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
export interface NetworkWord {
    value: number;
}
export function copyNetworkWord(value: NetworkWord): NetworkWord {
    return { value: langruntime.checkedI32(value.value) };
}
export function networkAddressWord(address: NetworkAddress, index: number): number {
    index = langruntime.checkedIndex(index);
    if (index === 0) {
        return address.word0;
    }
    if (index === 1) {
        return address.word1;
    }
    if (index === 2) {
        return address.word2;
    }
    if (index === 3) {
        return address.word3;
    }
    if (index === 4) {
        return address.word4;
    }
    if (index === 5) {
        return address.word5;
    }
    if (index === 6) {
        return address.word6;
    }
    return address.word7;
}
export function networkAddressByte(address: NetworkAddress, index: number, high: boolean): number {
    index = langruntime.checkedIndex(index);
    high = langruntime.checkedBool(high);
    const word: number = networkAddressWord(address, index);
    if (high) {
        return langruntime.checkedSignedDivide(word, 256);
    }
    return langruntime.checkedSignedRemainder(word, 256);
}
export function networkPrefixCompare(left: NetworkAddress, right: NetworkAddress, bits: number): number {
    bits = langruntime.checkedI32(bits);
    let index: number = 0;
    let remaining: number = bits;
    let high: boolean = true;
    while (remaining >= 8) {
        const a: number = networkAddressByte(left, index, high);
        const b: number = networkAddressByte(right, index, high);
        if (!(a === b)) {
            return langruntime.checkedSignedSubtract(a, b);
        }
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 8));
        if (high) {
            high = langruntime.checkedBool(false);
        }
        else {
            high = langruntime.checkedBool(true);
            index = langruntime.checkedAdd(index, 1);
        }
    }
    if (remaining > 0) {
        let padding: number = langruntime.checkedSignedSubtract(8, remaining);
        let divisor: number = 1;
        while (padding > 0) {
            divisor = langruntime.checkedI32(langruntime.checkedSignedMultiply(divisor, 2));
            padding = langruntime.checkedI32(langruntime.checkedSignedSubtract(padding, 1));
        }
        const a: number = langruntime.checkedSignedDivide(networkAddressByte(left, index, high), divisor);
        const b: number = langruntime.checkedSignedDivide(networkAddressByte(right, index, high), divisor);
        if (a < b) {
            return langruntime.checkedSignedNegate(1);
        }
        if (a > b) {
            return 1;
        }
    }
    return 0;
}
function networkParse(value: string, cidr: boolean): NetworkValue {
    value = langruntime.checkedString(value);
    cidr = langruntime.checkedBool(cidr);
    const chars: string[] = Array.from(value);
    if (chars.length === 0) {
        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
    }
    let end: number = chars.length;
    let family: number = 4;
    let scan: number = 0;
    while (scan < chars.length) {
        if (langruntime.indexChar(chars, langruntime.checkedIndex(scan)) === ":") {
            family = langruntime.checkedIndex(6);
        }
        if (langruntime.indexChar(chars, langruntime.checkedIndex(scan)) === "/") {
            if (!(end === chars.length)) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            end = langruntime.checkedIndex(scan);
        }
        scan = langruntime.checkedAdd(scan, 1);
    }
    let prefix: number = 32;
    if (family === 6) {
        prefix = langruntime.checkedI32(128);
    }
    if (!(end === chars.length)) {
        let index: number = langruntime.checkedAdd(end, 1);
        if (index === chars.length) {
            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
        }
        if (family === 6 && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "0" && langruntime.checkedAdd(index, 1) < chars.length) {
            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
        }
        prefix = langruntime.checkedI32(0);
        while (index < chars.length) {
            const digit: number = hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            if (digit > 9) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            if (family === 4) {
                const widePrefix: bigint = BigInt(langruntime.checkedI32(prefix));
                const wideDigit: bigint = BigInt(langruntime.checkedI32(digit));
                const nextPrefix: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply(widePrefix, 10n), wideDigit);
                prefix = langruntime.checkedI32(Number(BigInt.asIntN(32, langruntime.checkedI64(nextPrefix))));
            }
            else {
                prefix = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(prefix, 10), digit));
                if (prefix > 128) {
                    return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                }
            }
            index = langruntime.checkedAdd(index, 1);
        }
        if (prefix < 0 || (family === 4 && prefix > 32)) {
            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
        }
    }
    let words: NetworkWord[] = [];
    let index: number = 0;
    if (family === 4) {
        let octets: NetworkWord[] = [];
        let octetCount: number = 0;
        if (cidr && end > 2 && langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "0" && (langruntime.indexChar(chars, langruntime.checkedIndex(1)) === "x" || langruntime.indexChar(chars, langruntime.checkedIndex(1)) === "X")) {
            index = langruntime.checkedIndex(2);
            while (index < end) {
                const high: number = hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                if (high > 15 || octets.length === 4) {
                    return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                }
                index = langruntime.checkedAdd(index, 1);
                let low: number = 0;
                if (index < end) {
                    low = langruntime.checkedI32(hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))));
                    if (low > 15) {
                        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                    }
                    index = langruntime.checkedAdd(index, 1);
                }
                langruntime.pushStruct(octets, { value: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low) }, copyNetworkWord);
                octetCount = langruntime.checkedI32(langruntime.checkedSignedAdd(octetCount, 1));
            }
        }
        else {
            while (index < end) {
                const begin: number = index;
                let octet: number = 0;
                while (index < end && !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".")) {
                    const digit: number = hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                    if (digit > 9) {
                        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                    }
                    octet = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(octet, 10), digit));
                    if (octet > 255) {
                        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                    }
                    index = langruntime.checkedAdd(index, 1);
                }
                if (begin === index || octets.length === 4) {
                    return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                }
                langruntime.pushStruct(octets, { value: octet }, copyNetworkWord);
                octetCount = langruntime.checkedI32(langruntime.checkedSignedAdd(octetCount, 1));
                if (index < end) {
                    index = langruntime.checkedAdd(index, 1);
                    if (index === end && cidr) {
                        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                    }
                }
            }
        }
        if (octets.length === 0) {
            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
        }
        if (end === chars.length) {
            if (cidr) {
                prefix = langruntime.checkedI32(8);
                if (langruntime.indexStruct(octets, langruntime.checkedIndex(0), copyNetworkWord).value >= 240) {
                    prefix = langruntime.checkedI32(32);
                }
                else if (langruntime.indexStruct(octets, langruntime.checkedIndex(0), copyNetworkWord).value >= 224) {
                    prefix = langruntime.checkedI32(8);
                }
                else if (langruntime.indexStruct(octets, langruntime.checkedIndex(0), copyNetworkWord).value >= 192) {
                    prefix = langruntime.checkedI32(24);
                }
                else if (langruntime.indexStruct(octets, langruntime.checkedIndex(0), copyNetworkWord).value >= 128) {
                    prefix = langruntime.checkedI32(16);
                }
                if (prefix < langruntime.checkedSignedMultiply(octetCount, 8)) {
                    prefix = langruntime.checkedI32(langruntime.checkedSignedMultiply(octetCount, 8));
                }
                if (prefix === 8 && langruntime.indexStruct(octets, langruntime.checkedIndex(0), copyNetworkWord).value === 224) {
                    prefix = langruntime.checkedI32(4);
                }
            }
            else if (!(octets.length === 4)) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
        }
        else if (cidr === false && langruntime.checkedSignedDivide(prefix, 8) > octetCount) {
            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
        }
        while (octets.length < 4) {
            langruntime.pushStruct(octets, { value: 0 }, copyNetworkWord);
        }
        langruntime.pushStruct(words, { value: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(octets, langruntime.checkedIndex(0), copyNetworkWord).value, 256), langruntime.indexStruct(octets, langruntime.checkedIndex(1), copyNetworkWord).value) }, copyNetworkWord);
        langruntime.pushStruct(words, { value: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(octets, langruntime.checkedIndex(2), copyNetworkWord).value, 256), langruntime.indexStruct(octets, langruntime.checkedIndex(3), copyNetworkWord).value) }, copyNetworkWord);
    }
    else {
        let compression: number = 9;
        if (end > 0 && langruntime.indexChar(chars, langruntime.checkedIndex(0)) === ":") {
            if (end < 2 || !(langruntime.indexChar(chars, langruntime.checkedIndex(1)) === ":")) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            compression = langruntime.checkedIndex(0);
            index = langruntime.checkedIndex(2);
        }
        while (index < end) {
            const begin: number = index;
            let stop: number = index;
            let dotted: boolean = false;
            while (stop < end && !(langruntime.indexChar(chars, langruntime.checkedIndex(stop)) === ":")) {
                if (langruntime.indexChar(chars, langruntime.checkedIndex(stop)) === ".") {
                    dotted = langruntime.checkedBool(true);
                }
                stop = langruntime.checkedAdd(stop, 1);
            }
            if (dotted) {
                if (!(stop === end) || words.length > 6) {
                    return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                }
                let octets: NetworkWord[] = [];
                while (index < end) {
                    const start: number = index;
                    let octet: number = 0;
                    while (index < end && !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".")) {
                        const digit: number = hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                        if (digit > 9 || (index > start && langruntime.indexChar(chars, langruntime.checkedIndex(start)) === "0")) {
                            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                        }
                        octet = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(octet, 10), digit));
                        if (octet > 255) {
                            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                        }
                        index = langruntime.checkedAdd(index, 1);
                    }
                    if (octets.length === 4) {
                        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                    }
                    langruntime.pushStruct(octets, { value: octet }, copyNetworkWord);
                    if (index < end) {
                        index = langruntime.checkedAdd(index, 1);
                        if (index === end) {
                            if (end === chars.length || octets.length === 4) {
                                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                            }
                            langruntime.pushStruct(octets, { value: 0 }, copyNetworkWord);
                        }
                    }
                }
                while (octets.length < 4) {
                    langruntime.pushStruct(octets, { value: 0 }, copyNetworkWord);
                }
                langruntime.pushStruct(words, { value: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(octets, langruntime.checkedIndex(0), copyNetworkWord).value, 256), langruntime.indexStruct(octets, langruntime.checkedIndex(1), copyNetworkWord).value) }, copyNetworkWord);
                langruntime.pushStruct(words, { value: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(octets, langruntime.checkedIndex(2), copyNetworkWord).value, 256), langruntime.indexStruct(octets, langruntime.checkedIndex(3), copyNetworkWord).value) }, copyNetworkWord);
            }
            else {
                if (stop === begin || langruntime.checkedSubtract(stop, begin) > 4 || words.length === 8) {
                    return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                }
                let word: number = 0;
                while (index < stop) {
                    const digit: number = hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                    if (digit > 15) {
                        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                    }
                    word = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(word, 16), digit));
                    index = langruntime.checkedAdd(index, 1);
                }
                langruntime.pushStruct(words, { value: word }, copyNetworkWord);
                if (index < end) {
                    index = langruntime.checkedAdd(index, 1);
                    if (index < end && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ":") {
                        if (!(compression === 9)) {
                            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                        }
                        compression = langruntime.checkedIndex(words.length);
                        index = langruntime.checkedAdd(index, 1);
                    }
                    else if (index === end && end === chars.length) {
                        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
                    }
                }
            }
        }
        if (!(compression === 9)) {
            const wordCount: number = words.length;
            if (wordCount >= 8) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            while (words.length < 8) {
                langruntime.pushStruct(words, { value: 0 }, copyNetworkWord);
            }
            let source: number = wordCount;
            let dest: number = 8;
            while (source > compression) {
                source = langruntime.checkedIndex(langruntime.checkedSubtract(source, 1));
                dest = langruntime.checkedIndex(langruntime.checkedSubtract(dest, 1));
                words[langruntime.checkedIndexIn(words, dest)] = copyNetworkWord(langruntime.indexStruct(words, langruntime.checkedIndex(source), copyNetworkWord));
                words[langruntime.checkedIndexIn(words, source)] = copyNetworkWord({ value: 0 });
            }
        }
        if (!(words.length === 8)) {
            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
        }
    }
    while (words.length < 8) {
        langruntime.pushStruct(words, { value: 0 }, copyNetworkWord);
    }
    const address: NetworkAddress = { family: family, prefix: prefix, word0: langruntime.indexStruct(words, langruntime.checkedIndex(0), copyNetworkWord).value, word1: langruntime.indexStruct(words, langruntime.checkedIndex(1), copyNetworkWord).value, word2: langruntime.indexStruct(words, langruntime.checkedIndex(2), copyNetworkWord).value, word3: langruntime.indexStruct(words, langruntime.checkedIndex(3), copyNetworkWord).value, word4: langruntime.indexStruct(words, langruntime.checkedIndex(4), copyNetworkWord).value, word5: langruntime.indexStruct(words, langruntime.checkedIndex(5), copyNetworkWord).value, word6: langruntime.indexStruct(words, langruntime.checkedIndex(6), copyNetworkWord).value, word7: langruntime.indexStruct(words, langruntime.checkedIndex(7), copyNetworkWord).value };
    if (cidr) {
        let remaining: number = prefix;
        let wordIndex: number = 0;
        let wordCount: number = 8;
        if (family === 4) {
            wordCount = langruntime.checkedIndex(2);
        }
        while (wordIndex < wordCount) {
            let bits: number = remaining;
            if (bits > 16) {
                bits = langruntime.checkedI32(16);
            }
            remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, bits));
            let divisor: number = 1;
            let padding: number = langruntime.checkedSignedSubtract(16, bits);
            while (padding > 0) {
                divisor = langruntime.checkedI32(langruntime.checkedSignedMultiply(divisor, 2));
                padding = langruntime.checkedI32(langruntime.checkedSignedSubtract(padding, 1));
            }
            if (!(langruntime.checkedSignedRemainder(networkAddressWord(address, wordIndex), divisor) === 0)) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            wordIndex = langruntime.checkedAdd(wordIndex, 1);
        }
    }
    return { kind: "Value", value: address };
}
export function networkFromText(input: TextValue): NetworkValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return networkParse(value, false);
    }
    return { kind: "Unknown" };
}
export function cidrFromText(input: TextValue): NetworkValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return networkParse(value, true);
    }
    return { kind: "Unknown" };
}
interface MacText {
    chars: string[];
}
function copyMacText(value: MacText): MacText {
    return { chars: langruntime.checkedChars(value.chars) };
}
interface MacByte {
    value: number;
}
function copyMacByte(value: MacByte): MacByte {
    return { value: langruntime.checkedI32(value.value) };
}
interface MacParsed {
    valid: boolean;
    state: number;
    address: MacAddress;
}
function copyMacParsed(value: MacParsed): MacParsed {
    return { valid: langruntime.checkedBool(value.valid), state: langruntime.checkedIndex(value.state), address: value.address };
}
interface MacScanned {
    valid: boolean;
    value: number;
    end: number;
}
function copyMacScanned(value: MacScanned): MacScanned {
    return { valid: langruntime.checkedBool(value.valid), value: langruntime.checkedI32(value.value), end: langruntime.checkedIndex(value.end) };
}
function macInvalid(): MacParsed {
    return { valid: false, state: sqlErrorInvalidTextRepresentation, address: { word0: 0, word1: 0, word2: 0, word3: 0 } };
}
function macSpace(ch: string): boolean {
    ch = langruntime.checkedChar(ch);
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\v" || ch === "\f";
}
function macScanHex(text: MacText, start: number, width: number): MacScanned {
    start = langruntime.checkedIndex(start);
    width = langruntime.checkedIndex(width);
    let index: number = start;
    while (index < text.chars.length && macSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
        index = langruntime.checkedAdd(index, 1);
    }
    const begin: number = index;
    let negative: boolean = false;
    if (index < text.chars.length && (langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "+" || langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-")) {
        negative = langruntime.checkedBool(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-");
        index = langruntime.checkedAdd(index, 1);
    }
    let digits: boolean = false;
    if (langruntime.checkedAdd(index, 1) < text.chars.length && (width === 0 || langruntime.checkedSubtract(langruntime.checkedAdd(index, 1), begin) < width) && langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "0" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)))) === "x") {
        index = langruntime.checkedAdd(index, 2);
    }
    let value: bigint = 0n;
    let significant: number = 0;
    let overflow: boolean = false;
    while (index < text.chars.length && (width === 0 || langruntime.checkedSubtract(index, begin) < width)) {
        const digit: number = hexDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)));
        if (digit === 16) {
            break;
        }
        digits = langruntime.checkedBool(true);
        if (significant > 0 || !(digit === 0)) {
            significant = langruntime.checkedAdd(significant, 1);
        }
        if (significant > 16) {
            overflow = langruntime.checkedBool(true);
        }
        const wideDigit: bigint = BigInt(langruntime.checkedI32(digit));
        value = langruntime.checkedI64(langruntime.checkedI64Remainder((langruntime.checkedI64Add(langruntime.checkedI64Multiply(value, 16n), wideDigit)), 4294967296n));
        index = langruntime.checkedAdd(index, 1);
    }
    if (overflow) {
        value = langruntime.checkedI64(4294967295n);
    }
    else if (negative && !(value === 0n)) {
        value = langruntime.checkedI64(langruntime.checkedI64Subtract(4294967296n, value));
    }
    return { valid: digits, value: Number(BigInt.asIntN(32, langruntime.checkedI64(value))), end: index };
}
function macaddrFormat(text: MacText, format: number): MacParsed {
    format = langruntime.checkedIndex(format);
    let index: number = 0;
    let byteIndex: number = 0;
    let bytes: MacByte[] = [];
    let outOfRange: boolean = false;
    let width: number = 2;
    if (format < 2) {
        width = langruntime.checkedIndex(0);
    }
    while (byteIndex < 6) {
        const scanned: MacScanned = copyMacScanned(macScanHex(text, index, width));
        if (scanned.valid === false) {
            return macInvalid();
        }
        if (scanned.value < 0 || scanned.value > 255) {
            outOfRange = langruntime.checkedBool(true);
        }
        langruntime.pushStruct(bytes, { value: scanned.value }, copyMacByte);
        index = langruntime.checkedIndex(scanned.end);
        byteIndex = langruntime.checkedAdd(byteIndex, 1);
        let separator: string = "\0";
        if (byteIndex < 6) {
            if (format === 0) {
                separator = langruntime.checkedChar(":");
            }
            else if (format === 1) {
                separator = langruntime.checkedChar("-");
            }
            else if (format === 2 && byteIndex === 3) {
                separator = langruntime.checkedChar(":");
            }
            else if (format === 3 && byteIndex === 3) {
                separator = langruntime.checkedChar("-");
            }
            else if (format === 4 && (byteIndex === 2 || byteIndex === 4)) {
                separator = langruntime.checkedChar(".");
            }
            else if (format === 5 && (byteIndex === 2 || byteIndex === 4)) {
                separator = langruntime.checkedChar("-");
            }
        }
        if (!(separator === "\0")) {
            if (index >= text.chars.length || !(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === separator)) {
                return macInvalid();
            }
            index = langruntime.checkedAdd(index, 1);
        }
    }
    while (index < text.chars.length && macSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
        index = langruntime.checkedAdd(index, 1);
    }
    if (!(index === text.chars.length)) {
        return macInvalid();
    }
    if (outOfRange) {
        return { valid: false, state: sqlErrorNumericOutOfRange, address: { word0: 0, word1: 0, word2: 0, word3: 0 } };
    }
    return { valid: true, state: 0, address: { word0: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(0), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(1), copyMacByte).value), word1: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(2), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(3), copyMacByte).value), word2: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(4), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(5), copyMacByte).value), word3: 0 } };
}
function macaddrParse(text: MacText): MacParsed {
    let format: number = 0;
    while (format < 7) {
        const parsed: MacParsed = copyMacParsed(macaddrFormat(text, format));
        if (parsed.valid || parsed.state === sqlErrorNumericOutOfRange) {
            return parsed;
        }
        format = langruntime.checkedAdd(format, 1);
    }
    return macInvalid();
}
function macaddr8Parse(text: MacText): MacParsed {
    let index: number = 0;
    let separator: string = "\0";
    let bytes: MacByte[] = [];
    while (index < text.chars.length && macSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
        index = langruntime.checkedAdd(index, 1);
    }
    while (langruntime.checkedAdd(index, 1) < text.chars.length) {
        if (bytes.length === 8) {
            return macInvalid();
        }
        const high: number = hexDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)));
        const low: number = hexDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        if (high === 16 || low === 16) {
            return macInvalid();
        }
        langruntime.pushStruct(bytes, { value: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low) }, copyMacByte);
        index = langruntime.checkedAdd(index, 2);
        if (index < text.chars.length && (langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ":" || langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-" || langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ".")) {
            if (!(separator === "\0") && !(separator === langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
                return macInvalid();
            }
            separator = langruntime.checkedChar(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
        }
        if ((bytes.length === 6 || bytes.length === 8) && index < text.chars.length && macSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
            while (index < text.chars.length && macSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
                index = langruntime.checkedAdd(index, 1);
            }
            if (!(index === text.chars.length)) {
                return macInvalid();
            }
        }
    }
    if (index < text.chars.length) {
        const finalCode: number = langruntime.checkedChar(langruntime.indexChar(text.chars, langruntime.checkedIndex(index))).codePointAt(0)!;
        if (finalCode > 127 || finalCode === 0) {
            return macInvalid();
        }
    }
    if (bytes.length === 6) {
        const insertedHigh: number = 254;
        return { valid: true, state: 0, address: { word0: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(0), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(1), copyMacByte).value), word1: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(2), copyMacByte).value, 256), 255), word2: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(insertedHigh, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(3), copyMacByte).value), word3: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(4), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(5), copyMacByte).value) } };
    }
    if (!(bytes.length === 8)) {
        return macInvalid();
    }
    return { valid: true, state: 0, address: { word0: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(0), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(1), copyMacByte).value), word1: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(2), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(3), copyMacByte).value), word2: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(4), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(5), copyMacByte).value), word3: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(6), copyMacByte).value, 256), langruntime.indexStruct(bytes, langruntime.checkedIndex(7), copyMacByte).value) } };
}
export function macAddressCompare(left: MacAddress, right: MacAddress): number {
    if (left.word0 < right.word0) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.word0 > right.word0) {
        return 1;
    }
    if (left.word1 < right.word1) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.word1 > right.word1) {
        return 1;
    }
    if (left.word2 < right.word2) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.word2 > right.word2) {
        return 1;
    }
    if (left.word3 < right.word3) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.word3 > right.word3) {
        return 1;
    }
    return 0;
}
export function macaddrFromText(input: TextValue): MacaddrValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        if (chars.length > 256) {
            return { kind: "Unknown" };
        }
        const text: MacText = { chars: chars };
        const parsed: MacParsed = copyMacParsed(macaddrParse(text));
        if (parsed.valid === false) {
            return { kind: "Error", value: makeSqlError(parsed.state) };
        }
        return { kind: "Value", value: parsed.address };
    }
    return { kind: "Unknown" };
}
export function macaddr8FromText(input: TextValue): Macaddr8Value {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        if (chars.length > 256) {
            return { kind: "Unknown" };
        }
        const text: MacText = { chars: chars };
        const parsed: MacParsed = copyMacParsed(macaddr8Parse(text));
        if (parsed.valid === false) {
            return { kind: "Error", value: makeSqlError(parsed.state) };
        }
        return { kind: "Value", value: parsed.address };
    }
    return { kind: "Unknown" };
}
function uuidParse(value: string): UuidValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    if (chars.length < 32 || chars.length > 41) {
        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
    }
    let index: number = 0;
    const braces: boolean = langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "{";
    if (braces) {
        index = langruntime.checkedAdd(index, 1);
    }
    let word0: number = 0;
    let word1: number = 0;
    let word2: number = 0;
    let word3: number = 0;
    let word4: number = 0;
    let word5: number = 0;
    let word6: number = 0;
    let word7: number = 0;
    let group: number = 0;
    while (group < 8) {
        let word: number = 0;
        let digitIndex: number = 0;
        while (digitIndex < 4) {
            if (index >= chars.length) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            const digit: number = hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            if (digit === 16) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            word = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(word, 16), digit));
            index = langruntime.checkedAdd(index, 1);
            digitIndex = langruntime.checkedAdd(digitIndex, 1);
        }
        if (group === 0) {
            word0 = langruntime.checkedI32(word);
        }
        else if (group === 1) {
            word1 = langruntime.checkedI32(word);
        }
        else if (group === 2) {
            word2 = langruntime.checkedI32(word);
        }
        else if (group === 3) {
            word3 = langruntime.checkedI32(word);
        }
        else if (group === 4) {
            word4 = langruntime.checkedI32(word);
        }
        else if (group === 5) {
            word5 = langruntime.checkedI32(word);
        }
        else if (group === 6) {
            word6 = langruntime.checkedI32(word);
        }
        else {
            word7 = langruntime.checkedI32(word);
        }
        group = langruntime.checkedAdd(group, 1);
        if (group < 8 && index < chars.length && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-") {
            index = langruntime.checkedAdd(index, 1);
        }
    }
    if (braces) {
        if (index >= chars.length || !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "}")) {
            return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
        }
        index = langruntime.checkedAdd(index, 1);
    }
    if (!(index === chars.length)) {
        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
    }
    return { kind: "Value", value: { word0: word0, word1: word1, word2: word2, word3: word3, word4: word4, word5: word5, word6: word6, word7: word7 } };
}
export function uuidFromText(input: TextValue): UuidValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return uuidParse(value);
    }
    return { kind: "Unknown" };
}
export function uuidWord(value: Uuid, index: number): number {
    index = langruntime.checkedI32(index);
    if (index === 0) {
        return value.word0;
    }
    if (index === 1) {
        return value.word1;
    }
    if (index === 2) {
        return value.word2;
    }
    if (index === 3) {
        return value.word3;
    }
    if (index === 4) {
        return value.word4;
    }
    if (index === 5) {
        return value.word5;
    }
    if (index === 6) {
        return value.word6;
    }
    return value.word7;
}
interface JsonSyntaxSource {
    characters: string[];
}
function copyJsonSyntaxSource(value: JsonSyntaxSource): JsonSyntaxSource {
    return { characters: langruntime.checkedChars(value.characters) };
}
interface JsonSyntaxToken {
    kind: number;
    end: number;
}
function copyJsonSyntaxToken(value: JsonSyntaxToken): JsonSyntaxToken {
    return { kind: langruntime.checkedI32(value.kind), end: langruntime.checkedIndex(value.end) };
}
interface JsonSyntaxFrame {
    state: number;
}
function copyJsonSyntaxFrame(value: JsonSyntaxFrame): JsonSyntaxFrame {
    return { state: langruntime.checkedI32(value.state) };
}
export interface JsonSyntaxLayout {
    valid: boolean;
    kind: number;
    maxDepth: number;
}
function copyJsonSyntaxLayout(value: JsonSyntaxLayout): JsonSyntaxLayout {
    return { valid: langruntime.checkedBool(value.valid), kind: langruntime.checkedI32(value.kind), maxDepth: langruntime.checkedIndex(value.maxDepth) };
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
function jsonSyntaxInvalidLayout(depth: number): JsonSyntaxLayout {
    depth = langruntime.checkedIndex(depth);
    return { valid: false, kind: langruntime.checkedSignedNegate(1), maxDepth: depth };
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
export function jsonSyntaxScan(value: string): JsonSyntaxLayout {
    value = langruntime.checkedString(value);
    const source: JsonSyntaxSource = { characters: Array.from(value) };
    let frames: JsonSyntaxFrame[] = [];
    langruntime.pushStruct(frames, { state: jsonSyntaxRootValue }, copyJsonSyntaxFrame);
    let depth: number = 1;
    let maximum: number = 0;
    let position: number = 0;
    let rootKind: number = langruntime.checkedSignedNegate(1);
    while (depth > 0) {
        const token: JsonSyntaxToken = copyJsonSyntaxToken(jsonSyntaxReadToken(source, position));
        if (token.kind === jsonSyntaxInvalid) {
            return jsonSyntaxInvalidLayout(maximum);
        }
        const frame: number = langruntime.checkedSubtract(depth, 1);
        const state: number = langruntime.indexStruct(frames, langruntime.checkedIndex(frame), copyJsonSyntaxFrame).state;
        const transition: JsonSyntaxTransition = copyJsonSyntaxTransition(jsonSyntaxStep(state, token.kind));
        if (transition.action === jsonSyntaxReject) {
            return jsonSyntaxInvalidLayout(maximum);
        }
        if (transition.action === jsonSyntaxFinish) {
            return { valid: true, kind: rootKind, maxDepth: maximum };
        }
        if (transition.action === jsonSyntaxClose) {
            depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
        }
        else {
            frames[langruntime.checkedIndexIn(frames, frame)] = copyJsonSyntaxFrame({ state: transition.state });
            if (state === jsonSyntaxRootValue) {
                rootKind = langruntime.checkedI32(jsonSyntaxRootKind(token.kind));
            }
            if (transition.action === jsonSyntaxOpenArray || transition.action === jsonSyntaxOpenObject) {
                let child: number = jsonSyntaxArrayFirst;
                if (transition.action === jsonSyntaxOpenObject) {
                    child = langruntime.checkedI32(jsonSyntaxObjectFirst);
                }
                if (depth > maximum) {
                    maximum = langruntime.checkedIndex(depth);
                }
                if (depth < frames.length) {
                    frames[langruntime.checkedIndexIn(frames, depth)] = copyJsonSyntaxFrame({ state: child });
                }
                else {
                    langruntime.pushStruct(frames, { state: child }, copyJsonSyntaxFrame);
                }
                depth = langruntime.checkedAdd(depth, 1);
            }
        }
        position = langruntime.checkedIndex(token.end);
    }
    return jsonSyntaxInvalidLayout(maximum);
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
const jsonReadNonArray = 3452619;
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
function jsonReadDecodeString(source: JsonSyntaxSource, token: JsonReadToken): TextValue {
    token = copyJsonReadToken(token);
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
                    if (code > 127) {
                        return { kind: "Unknown" };
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
function jsonReadSlice(source: JsonSyntaxSource, start: number, end: number): TextValue {
    start = langruntime.checkedIndex(start);
    end = langruntime.checkedIndex(end);
    let output: string = "";
    let position: number = start;
    while (position < end) {
        output = output + langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)));
        position = langruntime.checkedAdd(position, 1);
    }
    return { kind: "Value", value: output };
}
function jsonReadArrayCount(source: JsonSyntaxSource): bigint {
    let depth: number = 0;
    let position: number = 0;
    let count: bigint = 0n;
    let expecting: boolean = true;
    while (position < source.characters.length) {
        const token: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, position));
        if (token.kind === jsonReadEnd) {
            return count;
        }
        if (depth === 1) {
            if (token.kind === jsonReadComma) {
                expecting = langruntime.checkedBool(true);
            }
            else if (expecting && (token.kind === jsonReadQuote || token.kind === jsonReadAtom || token.kind === jsonReadArrayOpen || token.kind === jsonReadObjectOpen)) {
                count = langruntime.checkedI64(langruntime.checkedI64Add(count, 1n));
                expecting = langruntime.checkedBool(false);
            }
        }
        if (token.kind === jsonReadObjectOpen || token.kind === jsonReadArrayOpen) {
            depth = langruntime.checkedAdd(depth, 1);
        }
        else if (token.kind === jsonReadObjectClose || token.kind === jsonReadArrayClose) {
            depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
        }
        position = langruntime.checkedIndex(token.end);
    }
    return count;
}
function jsonReadSelect(value: string, key: string, index: number, object: boolean, asText: boolean): TextValue {
    value = langruntime.checkedString(value);
    key = langruntime.checkedString(key);
    index = langruntime.checkedI32(index);
    object = langruntime.checkedBool(object);
    asText = langruntime.checkedBool(asText);
    const source: JsonSyntaxSource = { characters: Array.from(value) };
    const root: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, 0));
    const rootObject: boolean = root.kind === jsonReadObjectOpen;
    const rootArray: boolean = root.kind === jsonReadArrayOpen;
    let wanted: bigint = BigInt(langruntime.checkedI32(index));
    if (wanted < 0n && rootArray) {
        wanted = langruntime.checkedI64(langruntime.checkedI64Add(jsonReadArrayCount(source), wanted));
    }
    let depth: number = 0;
    let position: number = 0;
    let state: number = 0;
    if (rootArray) {
        state = langruntime.checkedI32(2);
    }
    let matched: boolean = false;
    let element: bigint = 0n;
    let capture: boolean = false;
    let captureDepth: number = 0;
    let captureStart: number = 0;
    let result: TextValue = { kind: "Null" };
    while (position < source.characters.length) {
        const token: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, position));
        if (token.kind === jsonReadEnd) {
            return result;
        }
        let decoded: TextValue = { kind: "Null" };
        if (token.kind === jsonReadQuote) {
            decoded = jsonReadDecodeString(source, token);
            if (decoded.kind === "Error") {
                const error: SqlError = decoded.value;
                return { kind: "Error", value: error };
            }
            if (decoded.kind === "Unknown") {
                return { kind: "Unknown" };
            }
        }
        if (depth === 1) {
            if (rootObject && state === 0 && token.kind === jsonReadQuote) {
                const decodedName: TextValue = decoded;
                if (decodedName.kind === "Value") {
                    const name: string = langruntime.checkedString(decodedName.value);
                    matched = langruntime.checkedBool(name === key);
                }
                state = langruntime.checkedI32(1);
            }
            else if (token.kind === jsonReadColon && rootObject) {
                state = langruntime.checkedI32(2);
            }
            else if (token.kind === jsonReadComma) {
                state = langruntime.checkedI32(0);
                if (rootArray) {
                    state = langruntime.checkedI32(2);
                }
            }
            else if (state === 2 && (token.kind === jsonReadQuote || token.kind === jsonReadAtom || token.kind === jsonReadArrayOpen || token.kind === jsonReadObjectOpen)) {
                const selected: boolean = (object && rootObject && matched) || (object === false && rootArray && element === wanted);
                element = langruntime.checkedI64(langruntime.checkedI64Add(element, 1n));
                state = langruntime.checkedI32(3);
                if (selected) {
                    if (token.kind === jsonReadArrayOpen || token.kind === jsonReadObjectOpen) {
                        capture = langruntime.checkedBool(true);
                        captureDepth = langruntime.checkedIndex(depth);
                        captureStart = langruntime.checkedIndex(token.start);
                    }
                    else if (asText && token.kind === jsonReadQuote) {
                        result = decoded;
                    }
                    else if (asText && token.kind === jsonReadAtom && langruntime.indexChar(source.characters, langruntime.checkedIndex(token.start)) === "n") {
                        result = { kind: "Null" };
                    }
                    else {
                        result = jsonReadSlice(source, token.start, token.end);
                    }
                }
            }
        }
        if (token.kind === jsonReadObjectOpen || token.kind === jsonReadArrayOpen) {
            depth = langruntime.checkedAdd(depth, 1);
        }
        else if (token.kind === jsonReadObjectClose || token.kind === jsonReadArrayClose) {
            depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
            if (capture && depth === captureDepth) {
                result = jsonReadSlice(source, captureStart, token.end);
                capture = langruntime.checkedBool(false);
            }
        }
        position = langruntime.checkedIndex(token.end);
    }
    return result;
}
export function jsonReadField(input: JsonValue, key: TextValue, asText: boolean): TextValue {
    asText = langruntime.checkedBool(asText);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (key.kind === "Error") {
        const error: SqlError = key.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (key.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (key.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: JsonPayload = input.value;
        if (key.kind === "Value") {
            const name: string = langruntime.checkedString(key.value);
            return jsonReadSelect(value.source, name, 0, true, asText);
        }
    }
    return { kind: "Unknown" };
}
export function jsonReadElement(input: JsonValue, index: Int4Value, asText: boolean): TextValue {
    asText = langruntime.checkedBool(asText);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (index.kind === "Error") {
        const error: SqlError = index.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (index.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (index.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: JsonPayload = input.value;
        if (index.kind === "Value") {
            const number: number = langruntime.checkedI32(index.value);
            return jsonReadSelect(value.source, "", number, false, asText);
        }
    }
    return { kind: "Unknown" };
}
export function jsonReadLength(input: JsonValue): Int4Value {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: JsonPayload = input.value;
        if (!(value.kind === 5)) {
            return { kind: "Error", value: makeSqlError(jsonReadNonArray) };
        }
        const source: JsonSyntaxSource = { characters: Array.from(value.source) };
        const count: bigint = jsonReadArrayCount(source);
        return makeInt4Value(Number(BigInt.asIntN(32, langruntime.checkedI64(count))));
    }
    return { kind: "Unknown" };
}
export function jsonKindText(kind: number): TextValue {
    kind = langruntime.checkedI32(kind);
    if (kind === 0) {
        return makeTextValue("null");
    }
    if (kind === 1 || kind === 2) {
        return makeTextValue("boolean");
    }
    if (kind === 3) {
        return makeTextValue("number");
    }
    if (kind === 4) {
        return makeTextValue("string");
    }
    if (kind === 5) {
        return makeTextValue("array");
    }
    if (kind === 6) {
        return makeTextValue("object");
    }
    return { kind: "Unknown" };
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
function copyJsonbCharacters(value: JsonbCharacters): JsonbCharacters {
    return { characters: langruntime.checkedChars(value.characters) };
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
function jsonbScalarReady(source: JsonSyntaxSource, token: JsonReadToken): BoolValue {
    token = copyJsonReadToken(token);
    const following: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, token.end));
    if (following.start < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(following.start)) === "\"") {
        const decoded: TextValue = jsonReadDecodeString(source, following);
        if (decoded.kind === "Error") {
            const error: SqlError = decoded.value;
            return { kind: "Error", value: error };
        }
        if (decoded.kind === "Unknown") {
            return { kind: "Unknown" };
        }
    }
    if (following.syntax === jsonSyntaxInvalid) {
        return { kind: "Error", value: makeSqlError(jsonReadInvalidText) };
    }
    return { kind: "Value", value: true };
}
function jsonbNumberText(source: JsonSyntaxSource, token: JsonReadToken): TextValue {
    token = copyJsonReadToken(token);
    const ready: BoolValue = jsonbScalarReady(source, token);
    if (ready.kind === "Error") {
        const error: SqlError = ready.value;
        return { kind: "Error", value: error };
    }
    if (ready.kind === "Unknown") {
        return { kind: "Unknown" };
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
function jsonbParseText(input: TextValue, admission: boolean): JsonbValue {
    admission = langruntime.checkedBool(admission);
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
                decoded = jsonReadDecodeString(source, token);
                if (decoded.kind === "Error") {
                    const error: SqlError = decoded.value;
                    return { kind: "Error", value: error };
                }
                if (decoded.kind === "Unknown") {
                    return { kind: "Unknown" };
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
                if (decision.kind === "Unknown") {
                    return { kind: "Unknown" };
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
                    if (decision.kind === "Unknown") {
                        return { kind: "Unknown" };
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
                        decoded = jsonbNumberText(source, token);
                        if (decoded.kind === "Error") {
                            const error: SqlError = decoded.value;
                            return { kind: "Error", value: error };
                        }
                        if (decoded.kind === "Unknown") {
                            return { kind: "Unknown" };
                        }
                    }
                    if (admission && token.kind === jsonReadQuote) {
                        const ready: BoolValue = jsonbScalarReady(source, token);
                        if (ready.kind === "Error") {
                            const error: SqlError = ready.value;
                            return { kind: "Error", value: error };
                        }
                        if (ready.kind === "Unknown") {
                            return { kind: "Unknown" };
                        }
                        const sizeText: TextValue = decoded;
                        if (sizeText.kind === "Value") {
                            const text: string = langruntime.checkedString(sizeText.value);
                            const content: string[] = Array.from(text);
                            let low: bigint = 0n;
                            let high: bigint = 0n;
                            let position: number = 0;
                            while (position < content.length) {
                                low = langruntime.checkedI64(langruntime.checkedI64Add(low, 1n));
                                high = langruntime.checkedI64(langruntime.checkedI64Add(high, 1n));
                                if (langruntime.checkedChar(langruntime.indexChar(content, langruntime.checkedIndex(position))).codePointAt(0)! > 127) {
                                    high = langruntime.checkedI64(langruntime.checkedI64Add(high, 3n));
                                }
                                position = langruntime.checkedAdd(position, 1);
                            }
                            const decision: BoolValue = jsonbStorageDecision(jsonbStorageBounds(low, high));
                            if (decision.kind === "Error") {
                                const error: SqlError = decision.value;
                                return { kind: "Error", value: error };
                            }
                            if (decision.kind === "Unknown") {
                                return { kind: "Unknown" };
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
    return { kind: "Unknown" };
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
                            return { kind: "Unknown" };
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
    return { kind: "Unknown" };
}
export function jsonbToPrettyText(input: JsonbValue): TextValue {
    input = copyJsonbValue(input);
    return jsonbRender(input, true, true);
}
export function jsonbToText(input: JsonbValue): TextValue {
    input = copyJsonbValue(input);
    return jsonbRender(input, true, false);
}
interface JsonbInputVisit {
    node: number;
    parent: number;
}
function copyJsonbInputVisit(value: JsonbInputVisit): JsonbInputVisit {
    return { node: langruntime.checkedIndex(value.node), parent: langruntime.checkedI32(value.parent) };
}
function jsonbInputSpan(source: JsonbPayload, begin: number, end: number): boolean {
    begin = langruntime.checkedIndex(begin);
    end = langruntime.checkedIndex(end);
    if (end < begin || end > source.characters.length) {
        return false;
    }
    let position: number = begin;
    while (position < end) {
        if (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "\0") {
            return false;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return true;
}
function jsonbInputValid(source: JsonbPayload): boolean {
    let seen: number[] = [];
    let index: number = 0;
    while (index < source.nodes.length) {
        langruntime.pushIndex(seen, 0);
        index = langruntime.checkedAdd(index, 1);
    }
    let pending: JsonbInputVisit[] = [];
    langruntime.pushStruct(pending, { node: source.root, parent: langruntime.checkedSignedNegate(1) }, copyJsonbInputVisit);
    let depth: number = 1;
    while (depth > 0) {
        depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
        const visit: JsonbInputVisit = copyJsonbInputVisit(langruntime.indexStruct(pending, langruntime.checkedIndex(depth), copyJsonbInputVisit));
        if (visit.node === 0 || visit.node >= source.nodes.length) {
            return false;
        }
        if (!(langruntime.indexNumber(seen, langruntime.checkedIndex(visit.node)) === 0)) {
            return false;
        }
        seen[langruntime.checkedIndexIn(seen, visit.node)] = langruntime.checkedIndex(1);
        const node: JsonbNode = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(visit.node), copyJsonbNode);
        if (node.kind < 0 || node.kind > 6) {
            return false;
        }
        if (jsonbInputSpan(source, node.textStart, node.textEnd) === false) {
            return false;
        }
        if (visit.parent === 6 && jsonbInputSpan(source, node.keyStart, node.keyEnd) === false) {
            return false;
        }
        if (node.kind < 5 && !(node.child === 0)) {
            return false;
        }
        if (node.kind === 3) {
            let number: string = "";
            let position: number = node.textStart;
            while (position < node.textEnd) {
                number = number + langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)));
                position = langruntime.checkedAdd(position, 1);
            }
            const syntax: JsonSyntaxLayout = copyJsonSyntaxLayout(jsonSyntaxScan(number));
            if (syntax.valid === false || !(syntax.kind === 3)) {
                return false;
            }
        }
        if (visit.parent >= 0 && node.next > 0) {
            const sibling: JsonbInputVisit = copyJsonbInputVisit({ node: node.next, parent: visit.parent });
            if (depth < pending.length) {
                pending[langruntime.checkedIndexIn(pending, depth)] = copyJsonbInputVisit(sibling);
            }
            else {
                langruntime.pushStruct(pending, sibling, copyJsonbInputVisit);
            }
            depth = langruntime.checkedAdd(depth, 1);
        }
        if (node.kind >= 5 && node.child > 0) {
            const child: JsonbInputVisit = copyJsonbInputVisit({ node: node.child, parent: node.kind });
            if (depth < pending.length) {
                pending[langruntime.checkedIndexIn(pending, depth)] = copyJsonbInputVisit(child);
            }
            else {
                langruntime.pushStruct(pending, child, copyJsonbInputVisit);
            }
            depth = langruntime.checkedAdd(depth, 1);
        }
    }
    return true;
}
export function jsonbFromText(input: TextValue): JsonbValue {
    return jsonbParseText(input, true);
}
function jsonbPreorder(input: JsonbPayload): JsonbPayload {
    input = copyJsonbPayload(input);
    let links: number[] = [];
    let position: number = 0;
    while (position < input.nodes.length) {
        langruntime.pushIndex(links, 0);
        position = langruntime.checkedAdd(position, 1);
    }
    let nodes: JsonbNode[] = [];
    langruntime.pushStruct(nodes, { kind: langruntime.checkedSignedNegate(1), child: 0, next: 0, keyStart: 0, keyEnd: 0, textStart: 0, textEnd: 0 }, copyJsonbNode);
    let pending: JsonbInputVisit[] = [];
    langruntime.pushStruct(pending, { node: input.root, parent: langruntime.checkedSignedNegate(1) }, copyJsonbInputVisit);
    let depth: number = 1;
    while (depth > 0) {
        depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
        const visit: JsonbInputVisit = copyJsonbInputVisit(langruntime.indexStruct(pending, langruntime.checkedIndex(depth), copyJsonbInputVisit));
        let node: JsonbNode = langruntime.indexStruct(input.nodes, langruntime.checkedIndex(visit.node), copyJsonbNode);
        if (visit.parent < 0) {
            node = jsonbNodeLink(node, 0);
        }
        links[langruntime.checkedIndexIn(links, visit.node)] = langruntime.checkedIndex(nodes.length);
        langruntime.pushStruct(nodes, node, copyJsonbNode);
        if (node.next > 0) {
            const sibling: JsonbInputVisit = copyJsonbInputVisit({ node: node.next, parent: visit.parent });
            if (depth === pending.length) {
                langruntime.pushStruct(pending, sibling, copyJsonbInputVisit);
            }
            else {
                pending[langruntime.checkedIndexIn(pending, depth)] = copyJsonbInputVisit(sibling);
            }
            depth = langruntime.checkedAdd(depth, 1);
        }
        if (node.child > 0) {
            const child: JsonbInputVisit = copyJsonbInputVisit({ node: node.child, parent: node.kind });
            if (depth === pending.length) {
                langruntime.pushStruct(pending, child, copyJsonbInputVisit);
            }
            else {
                pending[langruntime.checkedIndexIn(pending, depth)] = copyJsonbInputVisit(child);
            }
            depth = langruntime.checkedAdd(depth, 1);
        }
    }
    position = langruntime.checkedIndex(1);
    while (position < nodes.length) {
        const node: JsonbNode = langruntime.indexStruct(nodes, langruntime.checkedIndex(position), copyJsonbNode);
        nodes[langruntime.checkedIndexIn(nodes, position)] = { kind: node.kind, child: langruntime.indexNumber(links, langruntime.checkedIndex(node.child)), next: langruntime.indexNumber(links, langruntime.checkedIndex(node.next)), keyStart: node.keyStart, keyEnd: node.keyEnd, textStart: node.textStart, textEnd: node.textEnd };
        position = langruntime.checkedAdd(position, 1);
    }
    return { characters: input.characters, nodes: nodes, root: 1 };
}
export function jsonbRebuild(input: JsonbValue, admission: boolean): JsonbValue {
    input = copyJsonbValue(input);
    admission = langruntime.checkedBool(admission);
    if (input.kind === "Value") {
        const value: JsonbPayload = copyJsonbPayload(input.value);
        const normalized: JsonbPayload = jsonbNormalizeObjects(jsonbPreorder(value));
        if (admission) {
            const admitted: BoolValue = jsonbStorageAdmission(normalized);
            if (admitted.kind === "Error") {
                const error: SqlError = admitted.value;
                return { kind: "Error", value: error };
            }
            if (admitted.kind === "Unknown") {
                return { kind: "Unknown" };
            }
        }
        return { kind: "Value", value: normalized };
    }
    return input;
}
export function jsonbFromString(input: TextValue): JsonbValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const characters: string[] = Array.from(value);
        let position: number = 0;
        while (position < characters.length) {
            if (langruntime.indexChar(characters, langruntime.checkedIndex(position)) === "\0") {
                return { kind: "Unknown" };
            }
            position = langruntime.checkedAdd(position, 1);
        }
        let nodes: JsonbNode[] = [];
        langruntime.pushStruct(nodes, { kind: langruntime.checkedSignedNegate(1), child: 0, next: 0, keyStart: 0, keyEnd: 0, textStart: 0, textEnd: 0 }, copyJsonbNode);
        langruntime.pushStruct(nodes, { kind: 4, child: 0, next: 0, keyStart: 0, keyEnd: 0, textStart: 0, textEnd: characters.length }, copyJsonbNode);
        const result: JsonbValue = { kind: "Value", value: { characters: characters, nodes: nodes, root: 1 } };
        return jsonbRebuild(result, true);
    }
    return { kind: "Unknown" };
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
    if (size.low > jsonbStorageLimit) {
        return { kind: "Error", value: makeSqlError(jsonbStorageError) };
    }
    if (size.high > jsonbStorageLimit) {
        return { kind: "Unknown" };
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
}
function copyJsonbStorageCharacters(value: JsonbStorageCharacters): JsonbStorageCharacters {
    return { nonAscii: langruntime.checkedIndices(value.nonAscii) };
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
function jsonbStorageSpan(source: JsonbStorageCharacters, begin: number, end: number): JsonbStorageSize {
    begin = langruntime.checkedIndex(begin);
    end = langruntime.checkedIndex(end);
    const length: number = langruntime.checkedI32(langruntime.checkedIndex((langruntime.checkedSubtract(end, begin))));
    const first: number = jsonbStorageUnicodeBefore(source, begin);
    const last: number = jsonbStorageUnicodeBefore(source, end);
    const unicode: number = langruntime.checkedI32(langruntime.checkedIndex((langruntime.checkedSubtract(last, first))));
    const low: bigint = BigInt(langruntime.checkedI32(length));
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
function jsonbStorageLayout(source: JsonbPayload): JsonbStorageSize {
    let nonAscii: number[] = [];
    let position: number = 0;
    while (position < source.characters.length) {
        if (langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))).codePointAt(0)! > 127) {
            langruntime.pushIndex(nonAscii, position);
        }
        position = langruntime.checkedAdd(position, 1);
    }
    const characters: JsonbStorageCharacters = { nonAscii: nonAscii };
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
                size = copyJsonbStorageSize(jsonbStorageNumeric(source, node));
            }
            else if (node.kind === 4) {
                size = copyJsonbStorageSize(jsonbStorageSpan(characters, node.textStart, node.textEnd));
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
                        const key: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageSpan(characters, entry.keyStart, entry.keyEnd));
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
                const ordered: boolean = unicode === false || nonempty <= 1;
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
                            return jsonbStorageBounds(langruntime.checkedI64Add(jsonbStorageLimit, 1n), langruntime.checkedI64Add(jsonbStorageLimit, 1n));
                        }
                        if (decision.kind === "Unknown") {
                            uncertain = langruntime.checkedBool(true);
                        }
                    }
                    size = copyJsonbStorageSize(jsonbStorageAppend(size, childSize, align, ordered));
                    child = langruntime.checkedIndex(entry.next);
                }
                const decision: BoolValue = jsonbStorageDecision(size);
                if (decision.kind === "Error") {
                    return jsonbStorageBounds(langruntime.checkedI64Add(jsonbStorageLimit, 1n), langruntime.checkedI64Add(jsonbStorageLimit, 1n));
                }
                if (decision.kind === "Unknown") {
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
    return root;
}
function jsonbStorageAdmission(source: JsonbPayload): BoolValue {
    return jsonbStorageDecision(jsonbStorageLayout(source));
}
export const jsonpathNodeRoot = 1;
export const jsonpathNodeCurrent = 2;
export const jsonpathNodeLast = 3;
export const jsonpathNodeString = 4;
export const jsonpathNodeNumber = 5;
export const jsonpathNodeVariable = 6;
export const jsonpathNodeNull = 7;
export const jsonpathNodeTrue = 8;
export const jsonpathNodeFalse = 9;
export const jsonpathNodeKey = 10;
export const jsonpathNodeAnyKey = 11;
export const jsonpathNodeAnyArray = 12;
export const jsonpathNodeIndex = 13;
export const jsonpathNodeSubscript = 14;
export const jsonpathNodeDescendant = 15;
export const jsonpathNodeFilter = 16;
export const jsonpathNodeExists = 17;
export const jsonpathNodeNot = 18;
export const jsonpathNodeIsUnknown = 19;
export const jsonpathNodePlus = 20;
export const jsonpathNodeMinus = 21;
export const jsonpathNodeAdd = 22;
export const jsonpathNodeSub = 23;
export const jsonpathNodeMul = 24;
export const jsonpathNodeDiv = 25;
export const jsonpathNodeMod = 26;
export const jsonpathNodeEq = 27;
export const jsonpathNodeNe = 28;
export const jsonpathNodeLt = 29;
export const jsonpathNodeLe = 30;
export const jsonpathNodeGt = 31;
export const jsonpathNodeGe = 32;
export const jsonpathNodeAnd = 33;
export const jsonpathNodeOr = 34;
export const jsonpathNodeStarts = 35;
export const jsonpathNodeRegex = 36;
export const jsonpathNodeMethod = 100;
export interface JsonpathNode {
    readonly kind: number;
    readonly next: number;
    readonly left: number;
    readonly right: number;
    readonly textStart: number;
    readonly textEnd: number;
    readonly first: number;
    readonly last: number;
    readonly flags: number;
}
export function copyJsonpathNode(value: JsonpathNode): JsonpathNode {
    return { kind: langruntime.checkedI32(value.kind), next: langruntime.checkedIndex(value.next), left: langruntime.checkedIndex(value.left), right: langruntime.checkedIndex(value.right), textStart: langruntime.checkedIndex(value.textStart), textEnd: langruntime.checkedIndex(value.textEnd), first: langruntime.checkedI32(value.first), last: langruntime.checkedI32(value.last), flags: langruntime.checkedI32(value.flags) };
}
export interface JsonpathPayload {
    readonly characters: string[];
    readonly nodes: JsonpathNode[];
    readonly root: number;
    readonly lax: boolean;
}
export function copyJsonpathPayload(value: JsonpathPayload): JsonpathPayload {
    return { characters: langruntime.checkedChars(value.characters), nodes: langruntime.checkedStructs(value.nodes, copyJsonpathNode), root: langruntime.checkedIndex(value.root), lax: langruntime.checkedBool(value.lax) };
}
export type JsonpathValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Value";
    readonly value: JsonpathPayload;
} | {
    readonly kind: "StoredText";
    readonly value: string;
} | {
    readonly kind: "Error";
    readonly value: SqlError;
};
export function copyJsonpathValue(value: JsonpathValue): JsonpathValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: copyJsonpathPayload(value.value) };
        case "StoredText": return { kind: "StoredText", value: langruntime.checkedString(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
function jsonpathAccessorKind(kind: number): boolean {
    kind = langruntime.checkedI32(kind);
    return (kind >= jsonpathNodeKey && kind <= jsonpathNodeIndex) || kind === jsonpathNodeDescendant || kind === jsonpathNodeFilter || kind >= jsonpathNodeMethod;
}
function jsonpathMethodArity(kind: number): number {
    kind = langruntime.checkedI32(kind);
    if (kind === 102 || kind === 108 || kind === 111 || kind === 114 || kind === 116 || kind === 123 || kind === 129 || kind === 115 || kind === 122 || kind === 104 || kind === 125 || kind === 118 || kind === 121) {
        return 0;
    }
    if (kind === 128) {
        return 1;
    }
    if (kind === 109 || kind === 126 || kind === 130 || kind === 132) {
        return 2;
    }
    if (kind === 124) {
        return 3;
    }
    return langruntime.checkedSignedNegate(1);
}
function jsonpathPayloadNodeValid(value: JsonpathPayload, index: number): boolean {
    index = langruntime.checkedIndex(index);
    const node: JsonpathNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(index), copyJsonpathNode);
    if (node.next >= value.nodes.length || node.left >= value.nodes.length || node.right >= value.nodes.length || node.textStart > node.textEnd || node.textEnd > value.characters.length) {
        return false;
    }
    const kind: number = node.kind;
    if (kind < jsonpathNodeRoot || (kind > jsonpathNodeRegex && kind < jsonpathNodeMethod)) {
        return false;
    }
    if (kind === jsonpathNodeNumber) {
        let text: string = "";
        let position: number = node.textStart;
        let negative: boolean = false;
        if (position < node.textEnd && langruntime.indexChar(value.characters, langruntime.checkedIndex(position)) === "-") {
            negative = langruntime.checkedBool(true);
            text = text + langruntime.checkedChar("-");
            position = langruntime.checkedAdd(position, 1);
        }
        const begin: number = position;
        let point: boolean = false;
        let nonzero: boolean = false;
        let fraction: number = 0;
        while (position < node.textEnd) {
            const character: string = langruntime.indexChar(value.characters, langruntime.checkedIndex(position));
            if (character === ".") {
                if (point || position === begin || langruntime.checkedAdd(position, 1) === node.textEnd) {
                    return false;
                }
                point = langruntime.checkedBool(true);
            }
            else if (langruntime.checkedChar(character).codePointAt(0)! >= 48 && langruntime.checkedChar(character).codePointAt(0)! <= 57) {
                if (!(character === "0")) {
                    nonzero = langruntime.checkedBool(true);
                }
                if (point) {
                    fraction = langruntime.checkedAdd(fraction, 1);
                }
                if (position === begin && character === "0" && langruntime.checkedAdd(position, 1) < node.textEnd && !(langruntime.indexChar(value.characters, langruntime.checkedIndex(langruntime.checkedAdd(position, 1))) === ".")) {
                    return false;
                }
            }
            else {
                return false;
            }
            text = text + langruntime.checkedChar(character);
            position = langruntime.checkedAdd(position, 1);
        }
        if (begin === node.textEnd || (negative && nonzero === false) || fraction > 16383) {
            return false;
        }
        const parts: NumericLayout = copyNumericLayout(numericParts(text));
        if (parts.valid === false || !(parts.special === 1) || parts.weight > 131072) {
            return false;
        }
    }
    if (kind === jsonpathNodeRegex) {
        return node.left > 0 && node.right === 0 && node.flags >= 0 && node.flags <= 31 && (langruntime.checkedSignedRemainder((langruntime.checkedSignedDivide(node.flags, 8)), 2) === 0 || node.flags >= 16);
    }
    if (kind >= jsonpathNodeMethod) {
        const arity: number = jsonpathMethodArity(kind);
        if (arity < 0) {
            return false;
        }
        if (arity === 0) {
            return node.left === 0 && node.right === 0;
        }
        if (arity < 3 && !(node.right === 0)) {
            return false;
        }
        if (node.left === 0) {
            return node.right === 0;
        }
        const left: JsonpathNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(node.left), copyJsonpathNode);
        let argumentKind: number = jsonpathNodeNumber;
        if (arity === 1) {
            argumentKind = langruntime.checkedI32(jsonpathNodeString);
        }
        if (!(left.kind === argumentKind) || !(left.next === 0)) {
            return false;
        }
        if (node.right > 0) {
            const right: JsonpathNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(node.right), copyJsonpathNode);
            if (!(right.kind === jsonpathNodeNumber) || !(right.next === 0)) {
                return false;
            }
        }
        return true;
    }
    if (kind >= jsonpathNodeAdd && kind <= jsonpathNodeStarts) {
        return node.left > 0 && node.right > 0;
    }
    if (kind === jsonpathNodeSubscript) {
        return node.left > 0;
    }
    if (kind === jsonpathNodeIndex || (kind >= jsonpathNodeFilter && kind <= jsonpathNodeMinus)) {
        if ((kind === jsonpathNodePlus || kind === jsonpathNodeMinus) && node.left > 0) {
            const child: JsonpathNode = langruntime.indexStruct(value.nodes, langruntime.checkedIndex(node.left), copyJsonpathNode);
            if (child.kind === jsonpathNodeNumber && child.next === 0) {
                return false;
            }
        }
        return node.left > 0 && node.right === 0;
    }
    if (kind === jsonpathNodeDescendant && (node.first < langruntime.checkedSignedNegate(1) || node.last < langruntime.checkedSignedNegate(1))) {
        return false;
    }
    return node.left === 0 && node.right === 0;
}
interface JsonpathBoundaryVisit {
    node: number;
    filters: number;
    subscript: boolean;
    accessor: boolean;
    list: boolean;
}
function copyJsonpathBoundaryVisit(value: JsonpathBoundaryVisit): JsonpathBoundaryVisit {
    return { node: langruntime.checkedIndex(value.node), filters: langruntime.checkedIndex(value.filters), subscript: langruntime.checkedBool(value.subscript), accessor: langruntime.checkedBool(value.accessor), list: langruntime.checkedBool(value.list) };
}
export function bitFromLiteral(value: string): BitValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let index: number = 0;
    let hexadecimal: boolean = false;
    if (chars.length > 0) {
        if (langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "b" || langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "B") {
            index = langruntime.checkedIndex(1);
        }
        if (langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "x" || langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "X") {
            index = langruntime.checkedIndex(1);
            hexadecimal = langruntime.checkedBool(true);
        }
    }
    if (chars.length > 536870910) {
        return { kind: "Unknown" };
    }
    let output: string = "";
    while (index < chars.length) {
        const ch: string = langruntime.indexChar(chars, langruntime.checkedIndex(index));
        if (hexadecimal) {
            const digit: number = hexDigit(ch);
            if (digit === 16) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            let weight: number = 8;
            while (weight > 0) {
                if (langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(digit, weight), 2) === 0) {
                    output = output + langruntime.checkedChar("0");
                }
                else {
                    output = output + langruntime.checkedChar("1");
                }
                weight = langruntime.checkedI32(langruntime.checkedSignedDivide(weight, 2));
            }
        }
        else {
            if (!(ch === "0") && !(ch === "1")) {
                return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
            }
            output = output + langruntime.checkedChar(ch);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { kind: "Value", value: output };
}
export function bitPayloadLength(value: string): number {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let index: number = 0;
    let length: number = 0;
    while (index < chars.length) {
        index = langruntime.checkedAdd(index, 1);
        length = langruntime.checkedI32(langruntime.checkedSignedAdd(length, 1));
    }
    return length;
}
export function bitFromText(input: TextValue): BitValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return bitFromLiteral(value);
    }
    return { kind: "Unknown" };
}
export function bitToText(input: BitValue): TextValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalBitValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalBitValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export interface HashByte {
    value: bigint;
}
export function copyHashByte(value: HashByte): HashByte {
    return { value: langruntime.checkedI64(value.value) };
}
function equalHashByte(left: HashByte, right: HashByte): boolean {
    return left.value === right.value;
}
interface HashState {
    a: bigint;
    b: bigint;
    c: bigint;
}
function copyHashState(value: HashState): HashState {
    return { a: langruntime.checkedI64(value.a), b: langruntime.checkedI64(value.b), c: langruntime.checkedI64(value.c) };
}
function equalHashState(left: HashState, right: HashState): boolean {
    return left.a === right.a && left.b === right.b && left.c === right.c;
}
function hashWrap(value: bigint): bigint {
    value = langruntime.checkedI64(value);
    let result: bigint = langruntime.checkedI64Remainder(value, 4294967296n);
    if (result < 0n) {
        result = langruntime.checkedI64(langruntime.checkedI64Add(result, 4294967296n));
    }
    return result;
}
export function hashXor(left: bigint, right: bigint): bigint {
    left = langruntime.checkedI64(left);
    right = langruntime.checkedI64(right);
    let a: bigint = left;
    let b: bigint = right;
    let place: bigint = 1n;
    let result: bigint = 0n;
    while (place < 4294967296n) {
        if (!(langruntime.checkedI64Remainder(a, 2n) === langruntime.checkedI64Remainder(b, 2n))) {
            result = langruntime.checkedI64(langruntime.checkedI64Add(result, place));
        }
        a = langruntime.checkedI64(langruntime.checkedI64Divide(a, 2n));
        b = langruntime.checkedI64(langruntime.checkedI64Divide(b, 2n));
        place = langruntime.checkedI64(langruntime.checkedI64Multiply(place, 2n));
    }
    return result;
}
function hashRotate(value: bigint, bits: number): bigint {
    value = langruntime.checkedI64(value);
    bits = langruntime.checkedI32(bits);
    let multiplier: bigint = 1n;
    let divisor: bigint = 4294967296n;
    let remaining: number = bits;
    while (remaining > 0) {
        multiplier = langruntime.checkedI64(langruntime.checkedI64Multiply(multiplier, 2n));
        divisor = langruntime.checkedI64(langruntime.checkedI64Divide(divisor, 2n));
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
    }
    return langruntime.checkedI64Add(langruntime.checkedI64Remainder(langruntime.checkedI64Multiply(value, multiplier), 4294967296n), langruntime.checkedI64Divide(value, divisor));
}
function hashMix(state: HashState): HashState {
    state = copyHashState(state);
    let a: bigint = state.a;
    let b: bigint = state.b;
    let c: bigint = state.c;
    a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(a, c)));
    const rotated0: bigint = hashRotate(c, 4);
    a = langruntime.checkedI64(hashXor(a, rotated0));
    c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(c, b)));
    b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(b, a)));
    const rotated1: bigint = hashRotate(a, 6);
    b = langruntime.checkedI64(hashXor(b, rotated1));
    a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(a, c)));
    c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(c, b)));
    const rotated2: bigint = hashRotate(b, 8);
    c = langruntime.checkedI64(hashXor(c, rotated2));
    b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(b, a)));
    a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(a, c)));
    const rotated3: bigint = hashRotate(c, 16);
    a = langruntime.checkedI64(hashXor(a, rotated3));
    c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(c, b)));
    b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(b, a)));
    const rotated4: bigint = hashRotate(a, 19);
    b = langruntime.checkedI64(hashXor(b, rotated4));
    a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(a, c)));
    c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(c, b)));
    const rotated5: bigint = hashRotate(b, 4);
    c = langruntime.checkedI64(hashXor(c, rotated5));
    b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(b, a)));
    return { a: a, b: b, c: c };
}
function hashFinal(state: HashState): HashState {
    state = copyHashState(state);
    let a: bigint = state.a;
    let b: bigint = state.b;
    let c: bigint = state.c;
    c = langruntime.checkedI64(hashXor(c, b));
    const rotated0: bigint = hashRotate(b, 14);
    c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(c, rotated0)));
    a = langruntime.checkedI64(hashXor(a, c));
    const rotated1: bigint = hashRotate(c, 11);
    a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(a, rotated1)));
    b = langruntime.checkedI64(hashXor(b, a));
    const rotated2: bigint = hashRotate(a, 25);
    b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(b, rotated2)));
    c = langruntime.checkedI64(hashXor(c, b));
    const rotated3: bigint = hashRotate(b, 16);
    c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(c, rotated3)));
    a = langruntime.checkedI64(hashXor(a, c));
    const rotated4: bigint = hashRotate(c, 4);
    a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(a, rotated4)));
    b = langruntime.checkedI64(hashXor(b, a));
    const rotated5: bigint = hashRotate(a, 14);
    b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(b, rotated5)));
    c = langruntime.checkedI64(hashXor(c, b));
    const rotated6: bigint = hashRotate(b, 24);
    c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Subtract(c, rotated6)));
    return { a: a, b: b, c: c };
}
function hashBytesState(bytes: HashByte[], seed: bigint): HashState {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    seed = langruntime.checkedI64(seed);
    let length: bigint = 0n;
    let scan: number = 0;
    while (scan < bytes.length) {
        length = langruntime.checkedI64(langruntime.checkedI64Add(length, 1n));
        scan = langruntime.checkedAdd(scan, 1);
    }
    const initial: bigint = langruntime.checkedI64Add(langruntime.checkedI64Add(2654435769n, length), 3923095n);
    let stateA: bigint = initial;
    let stateB: bigint = initial;
    let stateC: bigint = initial;
    if (!(seed === 0n)) {
        const low: bigint = hashWrap(seed);
        let high: bigint = langruntime.checkedI64Divide((langruntime.checkedI64Subtract(seed, low)), 4294967296n);
        if (high < 0n) {
            high = langruntime.checkedI64(langruntime.checkedI64Add(high, 4294967296n));
        }
        const a: bigint = hashWrap(langruntime.checkedI64Add(stateA, high));
        const b: bigint = hashWrap(langruntime.checkedI64Add(stateB, low));
        const mixed: HashState = copyHashState(hashMix({ a: a, b: b, c: stateC }));
        stateA = langruntime.checkedI64(mixed.a);
        stateB = langruntime.checkedI64(mixed.b);
        stateC = langruntime.checkedI64(mixed.c);
    }
    let index: number = 0;
    let remaining: bigint = length;
    while (remaining >= 12n) {
        let a: bigint = stateA;
        let b: bigint = stateB;
        let c: bigint = stateC;
        let position: number = 0;
        let place: bigint = 1n;
        while (position < 12) {
            const value: bigint = langruntime.checkedI64Multiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(index), copyHashByte).value, place);
            if (position < 4) {
                a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(a, value)));
            }
            else if (position < 8) {
                b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(b, value)));
            }
            else {
                c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(c, value)));
            }
            position = langruntime.checkedAdd(position, 1);
            index = langruntime.checkedAdd(index, 1);
            place = langruntime.checkedI64(langruntime.checkedI64Multiply(place, 256n));
            if (position === 4 || position === 8) {
                place = langruntime.checkedI64(1n);
            }
        }
        const mixed: HashState = copyHashState(hashMix({ a: a, b: b, c: c }));
        stateA = langruntime.checkedI64(mixed.a);
        stateB = langruntime.checkedI64(mixed.b);
        stateC = langruntime.checkedI64(mixed.c);
        remaining = langruntime.checkedI64(langruntime.checkedI64Subtract(remaining, 12n));
    }
    let a: bigint = stateA;
    let b: bigint = stateB;
    let c: bigint = stateC;
    let position: number = 0;
    let place: bigint = 1n;
    while (index < bytes.length) {
        const value: bigint = langruntime.checkedI64Multiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(index), copyHashByte).value, place);
        if (position < 4) {
            a = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(a, value)));
        }
        else if (position < 8) {
            b = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(b, value)));
        }
        else {
            c = langruntime.checkedI64(hashWrap(langruntime.checkedI64Add(c, value)));
        }
        position = langruntime.checkedAdd(position, 1);
        index = langruntime.checkedAdd(index, 1);
        place = langruntime.checkedI64(langruntime.checkedI64Multiply(place, 256n));
        if (position === 4) {
            place = langruntime.checkedI64(1n);
        }
        if (position === 8) {
            place = langruntime.checkedI64(256n);
        }
    }
    return hashFinal({ a: a, b: b, c: c });
}
export function hashBytes32(bytes: HashByte[]): number {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    const state: HashState = copyHashState(hashBytesState(bytes, 0n));
    return Number(BigInt.asIntN(32, langruntime.checkedI64(state.c)));
}
export function hashBytes64(bytes: HashByte[], seed: bigint): bigint {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    seed = langruntime.checkedI64(seed);
    const state: HashState = copyHashState(hashBytesState(bytes, seed));
    let high: bigint = state.b;
    if (high >= 2147483648n) {
        high = langruntime.checkedI64(langruntime.checkedI64Subtract(high, 4294967296n));
    }
    return langruntime.checkedI64Add(langruntime.checkedI64Multiply(high, 4294967296n), state.c);
}
export function textNumber(value: number, base: number): string {
    value = langruntime.checkedI32(value);
    base = langruntime.checkedI32(base);
    const digits: string[] = Array.from("0123456789abcdef");
    let reversed: string[] = [];
    let remaining: number = value;
    if (remaining === 0) {
        langruntime.pushChar(reversed, "0");
    }
    while (remaining > 0) {
        let digit: number = langruntime.checkedSignedRemainder(remaining, base);
        let index: number = 0;
        while (digit > 0) {
            index = langruntime.checkedAdd(index, 1);
            digit = langruntime.checkedI32(langruntime.checkedSignedSubtract(digit, 1));
        }
        langruntime.pushChar(reversed, langruntime.indexChar(digits, langruntime.checkedIndex(index)));
        remaining = langruntime.checkedI32(langruntime.checkedSignedDivide(remaining, base));
    }
    let output: string = "";
    let position: number = reversed.length;
    while (position > 0) {
        position = langruntime.checkedIndex(langruntime.checkedSubtract(position, 1));
        output = output + langruntime.checkedChar(langruntime.indexChar(reversed, langruntime.checkedIndex(position)));
    }
    return output;
}
export function byteaAppendByte(value: string, byte: number): string {
    value = langruntime.checkedString(value);
    byte = langruntime.checkedI32(byte);
    const digits: string[] = Array.from("0123456789abcdef");
    let high: number = langruntime.checkedSignedDivide(byte, 16);
    let low: number = langruntime.checkedSignedRemainder(byte, 16);
    let highIndex: number = 0;
    let lowIndex: number = 0;
    while (high > 0) {
        highIndex = langruntime.checkedAdd(highIndex, 1);
        high = langruntime.checkedI32(langruntime.checkedSignedSubtract(high, 1));
    }
    while (low > 0) {
        lowIndex = langruntime.checkedAdd(lowIndex, 1);
        low = langruntime.checkedI32(langruntime.checkedSignedSubtract(low, 1));
    }
    let output: string = value;
    output = output + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(highIndex)));
    output = output + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(lowIndex)));
    return output;
}
export function hexDigit(ch: string): number {
    ch = langruntime.checkedChar(ch);
    if (ch === "0") {
        return 0;
    }
    if (ch === "1") {
        return 1;
    }
    if (ch === "2") {
        return 2;
    }
    if (ch === "3") {
        return 3;
    }
    if (ch === "4") {
        return 4;
    }
    if (ch === "5") {
        return 5;
    }
    if (ch === "6") {
        return 6;
    }
    if (ch === "7") {
        return 7;
    }
    if (ch === "8") {
        return 8;
    }
    if (ch === "9") {
        return 9;
    }
    const lower: string = langruntime.asciiLowercase(ch);
    if (lower === "a") {
        return 10;
    }
    if (lower === "b") {
        return 11;
    }
    if (lower === "c") {
        return 12;
    }
    if (lower === "d") {
        return 13;
    }
    if (lower === "e") {
        return 14;
    }
    if (lower === "f") {
        return 15;
    }
    return 16;
}
export function textSignedNumber(value: bigint): string {
    value = langruntime.checkedI64(value);
    const digits: string[] = Array.from("0123456789");
    let reversed: string[] = [];
    let remaining: bigint = value;
    if (remaining > 0n) {
        remaining = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, remaining));
    }
    if (remaining === 0n) {
        langruntime.pushChar(reversed, "0");
    }
    while (remaining < 0n) {
        let digit: bigint = langruntime.checkedI64Subtract(0n, (langruntime.checkedI64Remainder(remaining, 10n)));
        let index: number = 0;
        while (digit > 0n) {
            index = langruntime.checkedAdd(index, 1);
            digit = langruntime.checkedI64(langruntime.checkedI64Subtract(digit, 1n));
        }
        langruntime.pushChar(reversed, langruntime.indexChar(digits, langruntime.checkedIndex(index)));
        remaining = langruntime.checkedI64(langruntime.checkedI64Divide(remaining, 10n));
    }
    let output: string = "";
    if (value < 0n) {
        output = output + langruntime.checkedChar("-");
    }
    let position: number = reversed.length;
    while (position > 0) {
        position = langruntime.checkedIndex(langruntime.checkedSubtract(position, 1));
        output = output + langruntime.checkedChar(langruntime.indexChar(reversed, langruntime.checkedIndex(position)));
    }
    return output;
}
const dateFieldOverflow = 3452552;
const invalidDateText = 3452551;
function dateTextSpace(value: string): boolean {
    value = langruntime.checkedChar(value);
    return value === " " || value === "\t" || value === "\n" || value === "\r" || value === "\v" || value === "\f";
}
function dateTextDigit(value: string): number {
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
export function dateFromText(value: TextValue): DateValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const text: string = langruntime.checkedString(value.value);
        const chars: string[] = Array.from(text);
        if (chars.length > 128) {
            return { kind: "Unknown" };
        }
        let start: number = 0;
        let end: number = chars.length;
        while (start < end && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(start)))) {
            start = langruntime.checkedAdd(start, 1);
        }
        while (start < end && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        if (start === end) {
            return { kind: "Error", value: { state: invalidDateText } };
        }
        let bc: boolean = false;
        if (langruntime.checkedSubtract(end, start) >= 2 && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))) === "c" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 2)))) === "b") {
            if (langruntime.checkedSubtract(end, start) > 2 && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) === false && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) < 0) {
                return { kind: "Unknown" };
            }
            bc = langruntime.checkedBool(true);
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 2));
        }
        else if (langruntime.checkedSubtract(end, start) >= 2 && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))) === "d" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 2)))) === "a") {
            if (langruntime.checkedSubtract(end, start) > 2 && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) === false && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) < 0) {
                return { kind: "Unknown" };
            }
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 2));
        }
        while (start < end && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        if (langruntime.checkedSubtract(end, start) === 5 && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(start))) === "e" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 1)))) === "p" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 2)))) === "o" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 3)))) === "c" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 4)))) === "h") {
            return dateFromYmd(1970, 1, 1);
        }
        let infinityStart: number = start;
        let negative: boolean = false;
        if (infinityStart < end && langruntime.indexChar(chars, langruntime.checkedIndex(infinityStart)) === "-") {
            negative = langruntime.checkedBool(true);
            infinityStart = langruntime.checkedAdd(infinityStart, 1);
        }
        else if (infinityStart < end && langruntime.indexChar(chars, langruntime.checkedIndex(infinityStart)) === "+") {
            infinityStart = langruntime.checkedAdd(infinityStart, 1);
        }
        if (langruntime.checkedSubtract(end, infinityStart) === 8) {
            const infinity: string[] = Array.from("infinity");
            let index: number = 0;
            let matches: boolean = true;
            while (index < infinity.length) {
                if (!(langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(infinityStart, index)))) === langruntime.indexChar(infinity, langruntime.checkedIndex(index)))) {
                    matches = langruntime.checkedBool(false);
                }
                index = langruntime.checkedAdd(index, 1);
            }
            if (matches) {
                if (negative) {
                    return { kind: "Value", value: langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) };
                }
                return { kind: "Value", value: 2147483647 };
            }
        }
        let index: number = start;
        let year: number = 0;
        let yearDigits: number = 0;
        while (index < end && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) >= 0) {
            if (year < 5874898) {
                year = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(year, 10), dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)))));
            }
            yearDigits = langruntime.checkedAdd(yearDigits, 1);
            index = langruntime.checkedAdd(index, 1);
        }
        if (yearDigits < 4 || index === end || !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-")) {
            return { kind: "Unknown" };
        }
        index = langruntime.checkedAdd(index, 1);
        let month: number = 0;
        let monthDigits: number = 0;
        while (index < end && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) >= 0) {
            if (monthDigits < 2) {
                month = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(month, 10), dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)))));
            }
            monthDigits = langruntime.checkedAdd(monthDigits, 1);
            index = langruntime.checkedAdd(index, 1);
        }
        if (monthDigits < 1 || monthDigits > 2 || index === end || !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-")) {
            return { kind: "Unknown" };
        }
        index = langruntime.checkedAdd(index, 1);
        let day: number = 0;
        let dayDigits: number = 0;
        while (index < end && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) >= 0) {
            if (dayDigits < 2) {
                day = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(day, 10), dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)))));
            }
            dayDigits = langruntime.checkedAdd(dayDigits, 1);
            index = langruntime.checkedAdd(index, 1);
        }
        if (dayDigits === 0 && index === end) {
            return { kind: "Error", value: { state: invalidDateText } };
        }
        if (dayDigits < 1 || dayDigits > 2 || !(index === end)) {
            return { kind: "Unknown" };
        }
        if (bc) {
            year = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, year));
        }
        return dateFromYmd(year, month, day);
    }
    return { kind: "Unknown" };
}
export function dateFromYmd(year: number, month: number, day: number): DateValue {
    year = langruntime.checkedI32(year);
    month = langruntime.checkedI32(month);
    day = langruntime.checkedI32(day);
    const days: Int4Value = calendarDaysFromYmd(year, month, day);
    if (days.kind === "Error") {
        const error: SqlError = days.value;
        return { kind: "Error", value: error };
    }
    if (days.kind === "Value") {
        const value: number = langruntime.checkedI32(days.value);
        return makeDateValue(value);
    }
    return { kind: "Unknown" };
}
function calendarDaysFromYmd(year: number, month: number, day: number): Int4Value {
    year = langruntime.checkedI32(year);
    month = langruntime.checkedI32(month);
    day = langruntime.checkedI32(day);
    if (year === 0 || year === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) {
        return { kind: "Error", value: { state: dateFieldOverflow } };
    }
    let calendarYear: number = year;
    if (year < 0) {
        calendarYear = langruntime.checkedI32(langruntime.checkedSignedAdd(year, 1));
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return { kind: "Error", value: { state: dateFieldOverflow } };
    }
    let monthDays: number = 31;
    if (month === 4 || month === 6 || month === 9 || month === 11) {
        monthDays = langruntime.checkedI32(30);
    }
    else if (month === 2) {
        monthDays = langruntime.checkedI32(28);
        if (langruntime.checkedSignedRemainder(calendarYear, 4) === 0 && (!(langruntime.checkedSignedRemainder(calendarYear, 100) === 0) || langruntime.checkedSignedRemainder(calendarYear, 400) === 0)) {
            monthDays = langruntime.checkedI32(29);
        }
    }
    if (day > monthDays || calendarYear < langruntime.checkedSignedNegate(4713) || calendarYear > 5874897) {
        return { kind: "Error", value: { state: dateFieldOverflow } };
    }
    let julianYear: number = langruntime.checkedSignedAdd(calendarYear, 4799);
    let julianMonth: number = langruntime.checkedSignedAdd(month, 13);
    if (month > 2) {
        julianYear = langruntime.checkedI32(langruntime.checkedSignedAdd(calendarYear, 4800));
        julianMonth = langruntime.checkedI32(langruntime.checkedSignedAdd(month, 1));
    }
    const century: number = langruntime.checkedSignedDivide(julianYear, 100);
    const base: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedMultiply(julianYear, 365), 32167);
    const leapAdjustment: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(langruntime.checkedSignedDivide(julianYear, 4), century), langruntime.checkedSignedDivide(century, 4));
    const monthAdjustment: number = langruntime.checkedSignedAdd(langruntime.checkedSignedDivide(langruntime.checkedSignedMultiply(7834, julianMonth), 256), day);
    const julian: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(base, leapAdjustment), monthAdjustment);
    return makeInt4Value(langruntime.checkedSignedSubtract(julian, 2451545));
}
const invalidTimestampText = 3452551;
const invalidTimestampZone = 3452553;
interface TimestampText {
    chars: string[];
}
function copyTimestampText(value: TimestampText): TimestampText {
    return { chars: langruntime.checkedChars(value.chars) };
}
interface TimestampNumber {
    next: number;
    digits: number;
    value: number;
    overflow: boolean;
}
function copyTimestampNumber(value: TimestampNumber): TimestampNumber {
    return { next: langruntime.checkedIndex(value.next), digits: langruntime.checkedIndex(value.digits), value: langruntime.checkedI32(value.value), overflow: langruntime.checkedBool(value.overflow) };
}
function readTimestampNumber(text: TimestampText, start: number, end: number): TimestampNumber {
    start = langruntime.checkedIndex(start);
    end = langruntime.checkedIndex(end);
    let index: number = start;
    let value: number = 0;
    let overflow: boolean = false;
    while (index < end && dateTextDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index))) >= 0) {
        if (value < 214748364 || (value === 214748364 && dateTextDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index))) <= 7)) {
            value = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(value, 10), dateTextDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))));
        }
        else {
            value = langruntime.checkedI32(2147483647);
            overflow = langruntime.checkedBool(true);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { next: index, digits: langruntime.checkedSubtract(index, start), value: value, overflow: overflow };
}
function timestampCalendarMicroseconds(year: number, month: number, day: number, hour: number, minute: number, second: number, microsecond: number, offsetSeconds: number, withTimezone: boolean, allowFractionCarry: boolean): Int8Value {
    year = langruntime.checkedI32(year);
    month = langruntime.checkedI32(month);
    day = langruntime.checkedI32(day);
    hour = langruntime.checkedI32(hour);
    minute = langruntime.checkedI32(minute);
    second = langruntime.checkedI32(second);
    microsecond = langruntime.checkedI32(microsecond);
    offsetSeconds = langruntime.checkedI32(offsetSeconds);
    withTimezone = langruntime.checkedBool(withTimezone);
    allowFractionCarry = langruntime.checkedBool(allowFractionCarry);
    let maxFraction: number = 999999;
    if (allowFractionCarry) {
        maxFraction = langruntime.checkedI32(1000000);
    }
    if (hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 || microsecond < 0 || microsecond > maxFraction) {
        return { kind: "Error", value: { state: timestampFieldOverflow } };
    }
    const clockSeconds: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply((langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(hour, 60), minute)), 60), second);
    const clockWide: bigint = BigInt(langruntime.checkedI32(clockSeconds));
    const fractionWide: bigint = BigInt(langruntime.checkedI32(microsecond));
    const clock: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply(clockWide, 1000000n), fractionWide);
    if (clock > 86400000000n) {
        return { kind: "Error", value: { state: timestampFieldOverflow } };
    }
    if (offsetSeconds < langruntime.checkedSignedNegate(57599) || offsetSeconds > 57599) {
        return { kind: "Error", value: { state: invalidTimestampZone } };
    }
    const days: Int4Value = calendarDaysFromYmd(year, month, day);
    if (days.kind === "Error") {
        const error: SqlError = days.value;
        return { kind: "Error", value: error };
    }
    if (days.kind === "Value") {
        const dayValue: number = langruntime.checkedI32(days.value);
        if ((year === langruntime.checkedSignedNegate(4714) && month < 11) || dayValue < langruntime.checkedSignedNegate(2451546) || dayValue > 106751983) {
            return { kind: "Error", value: { state: timestampFieldOverflow } };
        }
        const daysWide: bigint = BigInt(langruntime.checkedI32(dayValue));
        const local: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply(daysWide, 86400000000n), clock);
        const offsetWide: bigint = BigInt(langruntime.checkedI32(offsetSeconds));
        let microseconds: bigint = local;
        if (withTimezone) {
            microseconds = langruntime.checkedI64(langruntime.checkedI64Subtract(local, langruntime.checkedI64Multiply(offsetWide, 1000000n)));
        }
        if (timestampMicrosecondsValid(microseconds) === false) {
            return { kind: "Error", value: { state: timestampFieldOverflow } };
        }
        return { kind: "Value", value: microseconds };
    }
    return { kind: "Unknown" };
}
function parseTimestampText(value: TextValue, withTimezone: boolean): Int8Value {
    withTimezone = langruntime.checkedBool(withTimezone);
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const input: string = langruntime.checkedString(value.value);
        const chars: string[] = Array.from(input);
        if (chars.length > 128) {
            return { kind: "Unknown" };
        }
        const text: TimestampText = { chars: chars };
        let start: number = 0;
        let end: number = text.chars.length;
        while (start < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(start)))) {
            start = langruntime.checkedAdd(start, 1);
        }
        while (start < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        if (start === end) {
            return { kind: "Error", value: { state: invalidTimestampText } };
        }
        let bc: boolean = false;
        if (langruntime.checkedSubtract(end, start) >= 2 && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))) === "c" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 2)))) === "b") {
            if (langruntime.checkedSubtract(end, start) > 2 && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) === false && dateTextDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) < 0) {
                return { kind: "Unknown" };
            }
            bc = langruntime.checkedBool(true);
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 2));
        }
        else if (langruntime.checkedSubtract(end, start) >= 2 && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))) === "d" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 2)))) === "a") {
            if (langruntime.checkedSubtract(end, start) > 2 && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) === false && dateTextDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 3)))) < 0) {
                return { kind: "Unknown" };
            }
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 2));
        }
        while (start < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        if (langruntime.checkedSubtract(end, start) === 5 && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(start))) === "e" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 1)))) === "p" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 2)))) === "o" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 3)))) === "c" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedAdd(start, 4)))) === "h") {
            return timestampCalendarMicroseconds(1970, 1, 1, 0, 0, 0, 0, 0, withTimezone, false);
        }
        let infinityStart: number = start;
        let negative: boolean = false;
        if (infinityStart < end && langruntime.indexChar(text.chars, langruntime.checkedIndex(infinityStart)) === "-") {
            negative = langruntime.checkedBool(true);
            infinityStart = langruntime.checkedAdd(infinityStart, 1);
        }
        else if (infinityStart < end && langruntime.indexChar(text.chars, langruntime.checkedIndex(infinityStart)) === "+") {
            infinityStart = langruntime.checkedAdd(infinityStart, 1);
        }
        if (langruntime.checkedSubtract(end, infinityStart) === 8) {
            const infinity: string[] = Array.from("infinity");
            let index: number = 0;
            let matches: boolean = true;
            while (index < infinity.length) {
                if (!(langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedAdd(infinityStart, index)))) === langruntime.indexChar(infinity, langruntime.checkedIndex(index)))) {
                    matches = langruntime.checkedBool(false);
                }
                index = langruntime.checkedAdd(index, 1);
            }
            if (matches) {
                if (negative) {
                    return makeInt8Value(-9223372036854775808n);
                }
                return makeInt8Value(9223372036854775807n);
            }
        }
        const yearField: TimestampNumber = readTimestampNumber(text, start, end);
        let index: number = yearField.next;
        if (yearField.digits < 4 || index === end || !(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-")) {
            return { kind: "Unknown" };
        }
        const month: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
        index = langruntime.checkedIndex(month.next);
        if (month.digits < 1 || month.digits > 2 || index === end || !(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-")) {
            return { kind: "Unknown" };
        }
        const day: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
        index = langruntime.checkedIndex(day.next);
        if (day.digits < 1 || day.digits > 2) {
            return { kind: "Unknown" };
        }
        if (index === end) {
            if (withTimezone) {
                return { kind: "Unknown" };
            }
            if (yearField.overflow) {
                return { kind: "Error", value: { state: timestampFieldOverflow } };
            }
            let year: number = yearField.value;
            if (bc) {
                year = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, year));
            }
            return timestampCalendarMicroseconds(year, month.value, day.value, 0, 0, 0, 0, 0, false, false);
        }
        if (langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(index))) === "t") {
            index = langruntime.checkedAdd(index, 1);
        }
        else if (dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
            while (index < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
                index = langruntime.checkedAdd(index, 1);
            }
        }
        else {
            return { kind: "Unknown" };
        }
        const hour: TimestampNumber = readTimestampNumber(text, index, end);
        index = langruntime.checkedIndex(hour.next);
        if (hour.digits < 1 || index === end || !(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ":")) {
            return { kind: "Unknown" };
        }
        const minute: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
        index = langruntime.checkedIndex(minute.next);
        if (minute.digits < 1) {
            return { kind: "Unknown" };
        }
        let second: number = 0;
        let fraction: number = 0;
        if (index < end && langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ":") {
            const seconds: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
            index = langruntime.checkedIndex(seconds.next);
            if (seconds.digits < 1) {
                return { kind: "Unknown" };
            }
            second = langruntime.checkedI32(seconds.value);
            if (index < end && langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ".") {
                const fractionStart: number = langruntime.checkedAdd(index, 1);
                const digits: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
                index = langruntime.checkedIndex(digits.next);
                if (digits.digits < 1) {
                    return { kind: "Unknown" };
                }
                if (digits.digits <= 6) {
                    fraction = langruntime.checkedI32(digits.value);
                    let fractionDigits: number = digits.digits;
                    while (fractionDigits < 6) {
                        fraction = langruntime.checkedI32(langruntime.checkedSignedMultiply(fraction, 10));
                        fractionDigits = langruntime.checkedAdd(fractionDigits, 1);
                    }
                }
                else {
                    let fractionText: string = "";
                    fractionText = fractionText + langruntime.checkedChar("0");
                    fractionText = fractionText + langruntime.checkedChar(".");
                    let digitIndex: number = fractionStart;
                    while (digitIndex < index) {
                        fractionText = fractionText + langruntime.checkedChar(langruntime.indexChar(text.chars, langruntime.checkedIndex(digitIndex)));
                        digitIndex = langruntime.checkedAdd(digitIndex, 1);
                    }
                    const parsed: number = langruntime.f64FromText(fractionText, 0.0);
                    const scaled: number = langruntime.f64Multiply(parsed, 1000000.0);
                    fraction = langruntime.checkedI32(langruntime.f64ToI32(scaled));
                    const integral: number = Number(langruntime.checkedI32(fraction));
                    const remainder: number = langruntime.f64Subtract(scaled, integral);
                    if (remainder > 0.5 || (remainder === 0.5 && !(langruntime.checkedSignedRemainder(fraction, 2) === 0))) {
                        fraction = langruntime.checkedI32(langruntime.checkedSignedAdd(fraction, 1));
                    }
                }
            }
        }
        while (index < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))) {
            index = langruntime.checkedAdd(index, 1);
        }
        let offset: number = 0;
        if (index < end && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(index))) === "z") {
            index = langruntime.checkedAdd(index, 1);
        }
        else if (index < end && (langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "+" || langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-")) {
            const sign: string = langruntime.indexChar(text.chars, langruntime.checkedIndex(index));
            const zoneHour: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
            index = langruntime.checkedIndex(zoneHour.next);
            if (zoneHour.digits < 1 || zoneHour.digits > 4) {
                return { kind: "Unknown" };
            }
            let hours: number = zoneHour.value;
            let minutes: number = 0;
            let seconds: number = 0;
            if (index < end && langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ":") {
                if (zoneHour.digits > 2) {
                    return { kind: "Unknown" };
                }
                const zoneMinute: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
                index = langruntime.checkedIndex(zoneMinute.next);
                if (zoneMinute.digits < 1) {
                    return { kind: "Unknown" };
                }
                minutes = langruntime.checkedI32(zoneMinute.value);
                if (index < end && langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ":") {
                    const zoneSecond: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
                    index = langruntime.checkedIndex(zoneSecond.next);
                    if (zoneSecond.digits < 1) {
                        return { kind: "Unknown" };
                    }
                    seconds = langruntime.checkedI32(zoneSecond.value);
                }
            }
            else if (zoneHour.digits > 2) {
                hours = langruntime.checkedI32(langruntime.checkedSignedDivide(zoneHour.value, 100));
                minutes = langruntime.checkedI32(langruntime.checkedSignedRemainder(zoneHour.value, 100));
            }
            if (!(index === end)) {
                return { kind: "Unknown" };
            }
            if (hours > 15 || minutes > 59 || seconds > 59) {
                offset = langruntime.checkedI32(57600);
            }
            else {
                offset = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply((langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(hours, 60), minutes)), 60), seconds));
                if (sign === "-") {
                    offset = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, offset));
                }
            }
        }
        else if (withTimezone || !(index === end)) {
            return { kind: "Unknown" };
        }
        if (!(index === end)) {
            return { kind: "Unknown" };
        }
        if (yearField.overflow) {
            return { kind: "Error", value: { state: timestampFieldOverflow } };
        }
        let year: number = yearField.value;
        if (bc) {
            year = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, year));
        }
        return timestampCalendarMicroseconds(year, month.value, day.value, hour.value, minute.value, second, fraction, offset, withTimezone, true);
    }
    return { kind: "Unknown" };
}
function timestampFromMicroseconds(value: Int8Value): TimestampValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (value.kind === "Value") {
        const microseconds: bigint = langruntime.checkedI64(value.value);
        return makeTimestampValue(microseconds);
    }
    if (equalInt8Value(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "Unknown" };
}
export function timestampFromCalendar(year: number, month: number, day: number, hour: number, minute: number, second: number, microsecond: number): TimestampValue {
    year = langruntime.checkedI32(year);
    month = langruntime.checkedI32(month);
    day = langruntime.checkedI32(day);
    hour = langruntime.checkedI32(hour);
    minute = langruntime.checkedI32(minute);
    second = langruntime.checkedI32(second);
    microsecond = langruntime.checkedI32(microsecond);
    const parsed: Int8Value = timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, 0, false, false);
    return timestampFromMicroseconds(parsed);
}
export function timestampFromText(value: TextValue): TimestampValue {
    const parsed: Int8Value = parseTimestampText(value, false);
    return timestampFromMicroseconds(parsed);
}
function timestamptzFromMicroseconds(value: Int8Value): TimestamptzValue {
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (value.kind === "Value") {
        const microseconds: bigint = langruntime.checkedI64(value.value);
        return makeTimestamptzValue(microseconds);
    }
    if (equalInt8Value(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "Unknown" };
}
export function timestamptzFromCalendar(year: number, month: number, day: number, hour: number, minute: number, second: number, microsecond: number, offsetSeconds: number): TimestamptzValue {
    year = langruntime.checkedI32(year);
    month = langruntime.checkedI32(month);
    day = langruntime.checkedI32(day);
    hour = langruntime.checkedI32(hour);
    minute = langruntime.checkedI32(minute);
    second = langruntime.checkedI32(second);
    microsecond = langruntime.checkedI32(microsecond);
    offsetSeconds = langruntime.checkedI32(offsetSeconds);
    const parsed: Int8Value = timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, offsetSeconds, true, false);
    return timestamptzFromMicroseconds(parsed);
}
export function timestamptzFromText(value: TextValue): TimestamptzValue {
    const parsed: Int8Value = parseTimestampText(value, true);
    return timestamptzFromMicroseconds(parsed);
}
const clockInputSyntax = 3452551;
const clockInputRange = 3452552;
function clockGrammarNormalized(input: TextValue): TextValue {
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let start: number = 0;
        let end: number = chars.length;
        while (start < end && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(start)))) {
            start = langruntime.checkedAdd(start, 1);
        }
        while (end > start && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        let position: number = start;
        while (position < end && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(position))) >= 0) {
            position = langruntime.checkedAdd(position, 1);
        }
        if (langruntime.checkedSubtract(position, start) >= 4 && position < end && langruntime.indexChar(chars, langruntime.checkedIndex(position)) === "-") {
            position = langruntime.checkedAdd(position, 1);
            while (position < end && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(position))) >= 0) {
                position = langruntime.checkedAdd(position, 1);
            }
            if (position < end && langruntime.indexChar(chars, langruntime.checkedIndex(position)) === "-") {
                position = langruntime.checkedAdd(position, 1);
                while (position < end && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(position))) >= 0) {
                    position = langruntime.checkedAdd(position, 1);
                }
                if (position < end && (dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(position))) || langruntime.indexChar(chars, langruntime.checkedIndex(position)) === "T" || langruntime.indexChar(chars, langruntime.checkedIndex(position)) === "t")) {
                    if (dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(position))) === false) {
                        return { kind: "Error", value: makeSqlError(clockInputSyntax) };
                    }
                    let date: string = "";
                    let index: number = start;
                    while (index < position) {
                        date = date + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                        index = langruntime.checkedAdd(index, 1);
                    }
                    const parsed: DateValue = dateFromText({ kind: "Value", value: date });
                    if (parsed.kind === "Error") {
                        const error: SqlError = parsed.value;
                        return { kind: "Error", value: error };
                    }
                    if (equalDateValue(parsed, { kind: "Unknown" })) {
                        return { kind: "Unknown" };
                    }
                    start = langruntime.checkedIndex(langruntime.checkedAdd(position, 1));
                    while (start < end && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(start)))) {
                        start = langruntime.checkedAdd(start, 1);
                    }
                }
            }
        }
        let clock: string = "";
        let meridian: number = 0;
        position = langruntime.checkedIndex(start);
        while (position < end) {
            let consumed: boolean = false;
            const letter: string = langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(position)));
            if (langruntime.checkedAdd(position, 1) < end && (letter === "a" || letter === "p") && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(position, 1)))) === "m") {
                let before: boolean = true;
                let after: boolean = true;
                if (position > start) {
                    before = langruntime.checkedBool(dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(position, 1)))) || dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(position, 1)))) >= 0);
                }
                if (langruntime.checkedAdd(position, 2) < end) {
                    after = langruntime.checkedBool(dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(position, 2)))) || langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(position, 2))) === "+" || langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(position, 2))) === "-");
                }
                if (before && after) {
                    if (!(meridian === 0)) {
                        return { kind: "Error", value: makeSqlError(clockInputSyntax) };
                    }
                    meridian = langruntime.checkedI32(1);
                    if (letter === "p") {
                        meridian = langruntime.checkedI32(2);
                    }
                    position = langruntime.checkedAdd(position, 2);
                    consumed = langruntime.checkedBool(true);
                }
            }
            if (consumed === false) {
                clock = clock + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(position)));
                position = langruntime.checkedAdd(position, 1);
            }
        }
        const raw: string[] = Array.from(clock);
        start = langruntime.checkedIndex(0);
        while (start < raw.length && dateTextSpace(langruntime.indexChar(raw, langruntime.checkedIndex(start)))) {
            start = langruntime.checkedAdd(start, 1);
        }
        position = langruntime.checkedIndex(start);
        while (position < raw.length && dateTextDigit(langruntime.indexChar(raw, langruntime.checkedIndex(position))) >= 0) {
            position = langruntime.checkedAdd(position, 1);
        }
        const digits: number = langruntime.checkedSubtract(position, start);
        let normalized: string = "";
        if ((digits === 4 || digits === 6) && (position === raw.length || !(langruntime.indexChar(raw, langruntime.checkedIndex(position)) === ":"))) {
            normalized = normalized + langruntime.checkedChar(langruntime.indexChar(raw, langruntime.checkedIndex(start)));
            normalized = normalized + langruntime.checkedChar(langruntime.indexChar(raw, langruntime.checkedIndex(langruntime.checkedAdd(start, 1))));
            normalized = normalized + langruntime.checkedChar(":");
            normalized = normalized + langruntime.checkedChar(langruntime.indexChar(raw, langruntime.checkedIndex(langruntime.checkedAdd(start, 2))));
            normalized = normalized + langruntime.checkedChar(langruntime.indexChar(raw, langruntime.checkedIndex(langruntime.checkedAdd(start, 3))));
            normalized = normalized + langruntime.checkedChar(":");
            if (digits === 6) {
                normalized = normalized + langruntime.checkedChar(langruntime.indexChar(raw, langruntime.checkedIndex(langruntime.checkedAdd(start, 4))));
                normalized = normalized + langruntime.checkedChar(langruntime.indexChar(raw, langruntime.checkedIndex(langruntime.checkedAdd(start, 5))));
            }
            else {
                normalized = normalized + langruntime.checkedChar("0");
                normalized = normalized + langruntime.checkedChar("0");
            }
        }
        else {
            let clockEnd: number = position;
            if (position < raw.length && langruntime.indexChar(raw, langruntime.checkedIndex(position)) === ":") {
                clockEnd = langruntime.checkedAdd(clockEnd, 1);
                while (clockEnd < raw.length && dateTextDigit(langruntime.indexChar(raw, langruntime.checkedIndex(clockEnd))) >= 0) {
                    clockEnd = langruntime.checkedAdd(clockEnd, 1);
                }
                if (clockEnd < raw.length && langruntime.indexChar(raw, langruntime.checkedIndex(clockEnd)) === ".") {
                    normalized = normalized + "00:";
                }
            }
            position = langruntime.checkedIndex(start);
        }
        while (position < raw.length) {
            normalized = normalized + langruntime.checkedChar(langruntime.indexChar(raw, langruntime.checkedIndex(position)));
            position = langruntime.checkedAdd(position, 1);
        }
        if (!(meridian === 0)) {
            normalized = normalized + langruntime.checkedChar(" ");
            if (meridian === 1) {
                normalized = normalized + "AM";
            }
            else {
                normalized = normalized + "PM";
            }
        }
        return { kind: "Value", value: normalized };
    }
    return input;
}
function clockInputText(rawInput: TextValue): TextValue {
    const input: TextValue = clockGrammarNormalized(rawInput);
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const text: TimestampText = { chars: Array.from(value) };
        let start: number = 0;
        let end: number = text.chars.length;
        while (start < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(start)))) {
            start = langruntime.checkedAdd(start, 1);
        }
        while (start < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        if (start === end || langruntime.indexChar(text.chars, langruntime.checkedIndex(start)) === "+" || langruntime.indexChar(text.chars, langruntime.checkedIndex(start)) === "-") {
            return { kind: "Error", value: makeSqlError(clockInputSyntax) };
        }
        let meridian: number = 0;
        if (langruntime.checkedSubtract(end, start) >= 2 && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))) === "m") {
            const initial: string = langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 2))));
            if (initial === "a" || initial === "p") {
                meridian = langruntime.checkedI32(1);
                if (initial === "p") {
                    meridian = langruntime.checkedI32(2);
                }
                end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 2));
                while (start < end && dateTextSpace(langruntime.indexChar(text.chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
                    end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
                }
            }
        }
        let output: string = "2000-01-01 ";
        if (!(meridian === 0)) {
            const hours: TimestampNumber = readTimestampNumber(text, start, end);
            if (hours.digits === 0 || hours.next === end || !(langruntime.indexChar(text.chars, langruntime.checkedIndex(hours.next)) === ":")) {
                return { kind: "Unknown" };
            }
            if (hours.overflow || hours.value > 12) {
                return { kind: "Error", value: makeSqlError(clockInputRange) };
            }
            let hour: number = hours.value;
            if (hour === 12) {
                hour = langruntime.checkedI32(0);
            }
            if (meridian === 2) {
                hour = langruntime.checkedI32(langruntime.checkedSignedAdd(hour, 12));
            }
            const symbols: string[] = Array.from("0123456789");
            const tens: number = langruntime.indexFromI32(langruntime.checkedSignedDivide(hour, 10), 0);
            const ones: number = langruntime.indexFromI32(langruntime.checkedSignedRemainder(hour, 10), 0);
            output = output + langruntime.checkedChar(langruntime.indexChar(symbols, langruntime.checkedIndex(tens)));
            output = output + langruntime.checkedChar(langruntime.indexChar(symbols, langruntime.checkedIndex(ones)));
            start = langruntime.checkedIndex(hours.next);
        }
        while (start < end) {
            output = output + langruntime.checkedChar(langruntime.indexChar(text.chars, langruntime.checkedIndex(start)));
            start = langruntime.checkedAdd(start, 1);
        }
        return { kind: "Value", value: output };
    }
    return input;
}
export function timeFromText(input: TextValue): TimeValue {
    const parsed: Int8Value = parseTimestampText(clockInputText(input), false);
    if (parsed.kind === "Error") {
        const error: SqlError = parsed.value;
        return { kind: "Error", value: error };
    }
    if (equalInt8Value(parsed, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (parsed.kind === "Value") {
        const time: bigint = langruntime.checkedI64(parsed.value);
        return makeTimeValue(time);
    }
    return { kind: "Unknown" };
}
export function timetzFromText(input: TextValue): TimetzValue {
    const normalized: TextValue = clockInputText(input);
    const local: Int8Value = parseTimestampText(normalized, false);
    const utc: Int8Value = parseTimestampText(normalized, true);
    if (local.kind === "Error") {
        const error: SqlError = local.value;
        return { kind: "Error", value: error };
    }
    if (utc.kind === "Error") {
        const error: SqlError = utc.value;
        return { kind: "Error", value: error };
    }
    if (equalInt8Value(local, { kind: "Null" }) || equalInt8Value(utc, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (local.kind === "Value") {
        const time: bigint = langruntime.checkedI64(local.value);
        if (utc.kind === "Value") {
            const instant: bigint = langruntime.checkedI64(utc.value);
            const zone: bigint = langruntime.checkedI64Divide((langruntime.checkedI64Subtract(instant, time)), 1000000n);
            return makeTimetzValue(time, Number(BigInt.asIntN(32, langruntime.checkedI64(zone))));
        }
    }
    return { kind: "Unknown" };
}
const intervalInputSyntax = 3452551;
const intervalInputRange = 3452585;
const intervalInputFinalRange = 3452552;
interface IntervalInputToken {
    start: number;
    end: number;
}
function copyIntervalInputToken(value: IntervalInputToken): IntervalInputToken {
    return { start: langruntime.checkedIndex(value.start), end: langruntime.checkedIndex(value.end) };
}
interface IntervalInputText {
    chars: string[];
}
function copyIntervalInputText(value: IntervalInputText): IntervalInputText {
    return { chars: langruntime.checkedChars(value.chars) };
}
function intervalTokenText(input: IntervalInputText, token: IntervalInputToken): string {
    token = copyIntervalInputToken(token);
    let index: number = token.start;
    let text: string = "";
    while (index < token.end) {
        text = text + langruntime.checkedChar(langruntime.asciiLowercase(langruntime.indexChar(input.chars, langruntime.checkedIndex(index))));
        index = langruntime.checkedAdd(index, 1);
    }
    return text;
}
interface IntervalInputAcc {
    years: number;
    months: number;
    days: number;
    time: bigint;
    mask: number;
    error: number;
}
function copyIntervalInputAcc(value: IntervalInputAcc): IntervalInputAcc {
    return { years: langruntime.checkedI32(value.years), months: langruntime.checkedI32(value.months), days: langruntime.checkedI32(value.days), time: langruntime.checkedI64(value.time), mask: langruntime.checkedI32(value.mask), error: langruntime.checkedIndex(value.error) };
}
function intervalInputFail(input: IntervalInputAcc, error: number): IntervalInputAcc {
    input = copyIntervalInputAcc(input);
    error = langruntime.checkedIndex(error);
    return { years: input.years, months: input.months, days: input.days, time: input.time, mask: input.mask, error: error };
}
function intervalInputUnit(text: string): number {
    text = langruntime.checkedString(text);
    const letters: string[] = Array.from(text);
    let prefix: string = "";
    let index: number = 0;
    while (index < letters.length && index < 10) {
        prefix = prefix + langruntime.checkedChar(langruntime.indexChar(letters, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    if (prefix === "microsecon" || text === "usec" || text === "usecond" || text === "useconds" || text === "usecs") {
        return 0;
    }
    if (prefix === "millisecon" || text === "mseconds") {
        return 1;
    }
    if (text === "yr" || text === "yrs") {
        return 8;
    }
    if (text === "microsecond" || text === "microseconds" || text === "us") {
        return 0;
    }
    if (text === "millisecond" || text === "milliseconds" || text === "ms" || text === "msec" || text === "msecs") {
        return 1;
    }
    if (text === "second" || text === "seconds" || text === "sec" || text === "secs" || text === "s") {
        return 2;
    }
    if (text === "minute" || text === "minutes" || text === "min" || text === "mins" || text === "m") {
        return 3;
    }
    if (text === "hour" || text === "hours" || text === "hr" || text === "hrs" || text === "h") {
        return 4;
    }
    if (text === "day" || text === "days" || text === "d") {
        return 5;
    }
    if (text === "week" || text === "weeks" || text === "w") {
        return 6;
    }
    if (text === "month" || text === "months" || text === "mon" || text === "mons") {
        return 7;
    }
    if (text === "year" || text === "years" || text === "y") {
        return 8;
    }
    if (text === "decade" || text === "decades" || text === "dec" || text === "decs") {
        return 9;
    }
    if (text === "century" || text === "centuries" || text === "cent" || text === "c") {
        return 10;
    }
    if (text === "millennium" || text === "millennia" || text === "mil" || text === "mils") {
        return 11;
    }
    return langruntime.checkedSignedNegate(1);
}
function intervalInputWhole(text: string): Int8Value {
    text = langruntime.checkedString(text);
    const chars: string[] = Array.from(text);
    let index: number = 0;
    let negative: boolean = false;
    if (index < chars.length && (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-" || langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "+")) {
        negative = langruntime.checkedBool(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-");
        index = langruntime.checkedAdd(index, 1);
    }
    const start: number = index;
    let whole: bigint = 0n;
    while (index < chars.length && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) >= 0) {
        const digit: number = dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        if (whole < -922337203685477580n || (whole === -922337203685477580n && digit > 8)) {
            return { kind: "Error", value: makeSqlError(intervalInputRange) };
        }
        whole = langruntime.checkedI64(langruntime.checkedI64Subtract(langruntime.checkedI64Multiply(whole, 10n), (BigInt(langruntime.checkedI32(digit)))));
        index = langruntime.checkedAdd(index, 1);
    }
    const integerDigits: number = langruntime.checkedSubtract(index, start);
    if (integerDigits === 0 && start > 0) {
        return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
    }
    let fractionDigits: number = 0;
    if (index < chars.length && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".") {
        index = langruntime.checkedAdd(index, 1);
        const fractionStart: number = index;
        while (index < chars.length && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) >= 0) {
            index = langruntime.checkedAdd(index, 1);
        }
        fractionDigits = langruntime.checkedIndex(langruntime.checkedSubtract(index, fractionStart));
    }
    if (!(index === chars.length) || langruntime.checkedAdd(integerDigits, fractionDigits) === 0) {
        return { kind: "Unknown" };
    }
    if (negative) {
        return { kind: "Value", value: whole };
    }
    if (whole === -9223372036854775808n) {
        return { kind: "Error", value: makeSqlError(intervalInputRange) };
    }
    return { kind: "Value", value: langruntime.checkedI64Subtract(0n, whole) };
}
function intervalInputFraction(text: string): number {
    text = langruntime.checkedString(text);
    const chars: string[] = Array.from(text);
    let index: number = 0;
    while (index < chars.length && !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".")) {
        index = langruntime.checkedAdd(index, 1);
    }
    let fraction: string = "0";
    while (index < chars.length) {
        fraction = fraction + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    const parsed: number = langruntime.f64FromText(fraction, 0.0);
    if (chars.length > 0 && langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "-") {
        return langruntime.f64Subtract(0.0, parsed);
    }
    return parsed;
}
function intervalInputFractionMicros(fraction: number, scale: number): bigint {
    fraction = langruntime.checkedF64(fraction);
    scale = langruntime.checkedF64(scale);
    const scaled: number = langruntime.f64Multiply(fraction, scale);
    const high: number = langruntime.f64ToI32((langruntime.f64Divide(scaled, 1000000.0)));
    const rest: number = langruntime.f64Subtract(scaled, langruntime.f64Multiply((Number(langruntime.checkedI32(high))), 1000000.0));
    let low: number = langruntime.f64ToI32(rest);
    const extra: number = langruntime.f64Subtract(rest, (Number(langruntime.checkedI32(low))));
    if (extra > 0.5) {
        low = langruntime.checkedI32(langruntime.checkedSignedAdd(low, 1));
    }
    if (extra < -0.5) {
        low = langruntime.checkedI32(langruntime.checkedSignedSubtract(low, 1));
    }
    return langruntime.checkedI64Add(langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(high))), 1000000n), (BigInt(langruntime.checkedI32(low))));
}
function intervalInputYearFraction(fraction: number, scale: number): number {
    fraction = langruntime.checkedF64(fraction);
    scale = langruntime.checkedF64(scale);
    const scaled: number = langruntime.f64Multiply(langruntime.f64Multiply(fraction, scale), 12.0);
    let whole: number = langruntime.f64ToI32(scaled);
    const remainder: number = langruntime.f64Subtract(scaled, (Number(langruntime.checkedI32(whole))));
    if (remainder > 0.5 || (remainder === 0.5 && !(langruntime.checkedSignedRemainder(whole, 2) === 0))) {
        whole = langruntime.checkedI32(langruntime.checkedSignedAdd(whole, 1));
    }
    if (remainder < -0.5 || (remainder === -0.5 && !(langruntime.checkedSignedRemainder(whole, 2) === 0))) {
        whole = langruntime.checkedI32(langruntime.checkedSignedSubtract(whole, 1));
    }
    return whole;
}
function intervalInputAdd(input: IntervalInputAcc, whole: bigint, fraction: number, unit: number): IntervalInputAcc {
    input = copyIntervalInputAcc(input);
    whole = langruntime.checkedI64(whole);
    fraction = langruntime.checkedF64(fraction);
    unit = langruntime.checkedI32(unit);
    if (!(input.error === 0)) {
        return input;
    }
    let bit: number = 1;
    let index: number = 0;
    while (index < unit) {
        bit = langruntime.checkedI32(langruntime.checkedSignedMultiply(bit, 2));
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    let mask: number = bit;
    if (unit === 2 && !(fraction === 0.0)) {
        mask = langruntime.checkedI32(7);
    }
    let check: number = mask;
    let stored: number = input.mask;
    while (check > 0) {
        if (!(langruntime.checkedSignedRemainder(check, 2) === 0) && !(langruntime.checkedSignedRemainder(stored, 2) === 0)) {
            return intervalInputFail(input, intervalInputSyntax);
        }
        check = langruntime.checkedI32(langruntime.checkedSignedDivide(check, 2));
        stored = langruntime.checkedI32(langruntime.checkedSignedDivide(stored, 2));
    }
    let years: bigint = BigInt(langruntime.checkedI32(input.years));
    let months: bigint = BigInt(langruntime.checkedI32(input.months));
    let days: bigint = BigInt(langruntime.checkedI32(input.days));
    let micros: bigint = input.time;
    let fractionalMicros: bigint = 0n;
    if (unit <= 4) {
        let scale: bigint = 1n;
        let floatScale: number = 1.0;
        if (unit === 1) {
            scale = langruntime.checkedI64(1000n);
            floatScale = langruntime.checkedF64(1000.0);
        }
        if (unit === 2) {
            scale = langruntime.checkedI64(1000000n);
            floatScale = langruntime.checkedF64(1000000.0);
        }
        if (unit === 3) {
            scale = langruntime.checkedI64(60000000n);
            floatScale = langruntime.checkedF64(60000000.0);
        }
        if (unit === 4) {
            scale = langruntime.checkedI64(3600000000n);
            floatScale = langruntime.checkedF64(3600000000.0);
        }
        if (whole > langruntime.checkedI64Divide(9223372036854775807n, scale) || whole < langruntime.checkedI64Divide((-9223372036854775808n), scale)) {
            return intervalInputFail(input, intervalInputRange);
        }
        const product: bigint = langruntime.checkedI64Multiply(whole, scale);
        if ((product > 0n && micros > langruntime.checkedI64Subtract(9223372036854775807n, product)) || (product < 0n && micros < langruntime.checkedI64Subtract((-9223372036854775808n), product))) {
            return intervalInputFail(input, intervalInputRange);
        }
        micros = langruntime.checkedI64(langruntime.checkedI64Add(micros, product));
        fractionalMicros = langruntime.checkedI64(intervalInputFractionMicros(fraction, floatScale));
    }
    else if (unit === 5 || unit === 6 || unit === 7) {
        let scale: bigint = 1n;
        if (unit === 6) {
            scale = langruntime.checkedI64(7n);
        }
        if (whole > langruntime.checkedI64Divide(2147483647n, scale) || whole < langruntime.checkedI64Divide((-2147483648n), scale)) {
            return intervalInputFail(input, intervalInputRange);
        }
        if (unit === 7) {
            months = langruntime.checkedI64(langruntime.checkedI64Add(months, whole));
            const scaled: number = langruntime.f64Multiply(fraction, 30.0);
            const extraDays: number = langruntime.f64ToI32(scaled);
            days = langruntime.checkedI64(langruntime.checkedI64Add(days, (BigInt(langruntime.checkedI32(extraDays)))));
            fractionalMicros = langruntime.checkedI64(intervalInputFractionMicros(langruntime.f64Subtract(scaled, (Number(langruntime.checkedI32(extraDays)))), 86400000000.0));
        }
        else {
            days = langruntime.checkedI64(langruntime.checkedI64Add(days, langruntime.checkedI64Multiply(whole, scale)));
            let scaled: number = fraction;
            if (unit === 6) {
                scaled = langruntime.checkedF64(langruntime.f64Multiply(fraction, 7.0));
            }
            const extraDays: number = langruntime.f64ToI32(scaled);
            days = langruntime.checkedI64(langruntime.checkedI64Add(days, (BigInt(langruntime.checkedI32(extraDays)))));
            fractionalMicros = langruntime.checkedI64(intervalInputFractionMicros(langruntime.f64Subtract(scaled, (Number(langruntime.checkedI32(extraDays)))), 86400000000.0));
        }
    }
    else {
        let scale: bigint = 1n;
        let floatScale: number = 1.0;
        if (unit === 9) {
            scale = langruntime.checkedI64(10n);
            floatScale = langruntime.checkedF64(10.0);
        }
        if (unit === 10) {
            scale = langruntime.checkedI64(100n);
            floatScale = langruntime.checkedF64(100.0);
        }
        if (unit === 11) {
            scale = langruntime.checkedI64(1000n);
            floatScale = langruntime.checkedF64(1000.0);
        }
        if (whole > langruntime.checkedI64Divide(2147483647n, scale) || whole < langruntime.checkedI64Divide((-2147483648n), scale)) {
            return intervalInputFail(input, intervalInputRange);
        }
        years = langruntime.checkedI64(langruntime.checkedI64Add(years, langruntime.checkedI64Multiply(whole, scale)));
        months = langruntime.checkedI64(langruntime.checkedI64Add(months, (BigInt(langruntime.checkedI32(intervalInputYearFraction(fraction, floatScale))))));
    }
    if ((fractionalMicros > 0n && micros > langruntime.checkedI64Subtract(9223372036854775807n, fractionalMicros)) || (fractionalMicros < 0n && micros < langruntime.checkedI64Subtract((-9223372036854775808n), fractionalMicros))) {
        return intervalInputFail(input, intervalInputRange);
    }
    micros = langruntime.checkedI64(langruntime.checkedI64Add(micros, fractionalMicros));
    if (years < (-2147483648n) || years > 2147483647n || months < (-2147483648n) || months > 2147483647n || days < (-2147483648n) || days > 2147483647n) {
        return intervalInputFail(input, intervalInputRange);
    }
    return { years: Number(BigInt.asIntN(32, langruntime.checkedI64(years))), months: Number(BigInt.asIntN(32, langruntime.checkedI64(months))), days: Number(BigInt.asIntN(32, langruntime.checkedI64(days))), time: micros, mask: langruntime.checkedSignedAdd(input.mask, mask), error: 0 };
}
function intervalUnitsFromText(input: TextValue, fieldMask: number): IntervalValue {
    fieldMask = langruntime.checkedI32(fieldMask);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        const normalized: string = intervalInputNormalized(text);
        const buffer: IntervalInputText = { chars: Array.from(normalized) };
        if (buffer.chars.length > 255) {
            return { kind: "Unknown" };
        }
        let tokens: IntervalInputToken[] = [];
        let tokenStart: number = 0;
        let index: number = 0;
        while (index < buffer.chars.length) {
            if (dateTextSpace(langruntime.indexChar(buffer.chars, langruntime.checkedIndex(index)))) {
                if (tokenStart < index) {
                    langruntime.pushStruct(tokens, { start: tokenStart, end: index }, copyIntervalInputToken);
                }
                tokenStart = langruntime.checkedIndex(langruntime.checkedAdd(index, 1));
            }
            index = langruntime.checkedAdd(index, 1);
        }
        if (tokenStart < index) {
            langruntime.pushStruct(tokens, { start: tokenStart, end: index }, copyIntervalInputToken);
        }
        if (tokens.length === 0) {
            return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
        }
        const firstToken: string = intervalTokenText(buffer, langruntime.indexStruct(tokens, langruntime.checkedIndex(0), copyIntervalInputToken));
        if (tokens.length === 1) {
            if (firstToken === "infinity" || firstToken === "+infinity") {
                return makeIntervalValue(2147483647, 2147483647, 9223372036854775807n);
            }
            if (firstToken === "-infinity") {
                return makeIntervalValue(langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1), langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1), -9223372036854775808n);
            }
        }
        let acc: IntervalInputAcc = copyIntervalInputAcc({ years: 0, months: 0, days: 0, time: 0n, mask: 0, error: 0 });
        let end: number = tokens.length;
        let ago: boolean = false;
        const lastToken: string = intervalTokenText(buffer, langruntime.indexStruct(tokens, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)), copyIntervalInputToken));
        if (lastToken === "ago") {
            ago = langruntime.checkedBool(true);
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        let start: number = 0;
        if (firstToken === "@") {
            start = langruntime.checkedIndex(1);
        }
        let unit: number = langruntime.checkedSignedNegate(1);
        let pending: boolean = false;
        let implicitUnit: number = 2;
        if (fieldMask === 4) {
            implicitUnit = langruntime.checkedI32(8);
        }
        if (fieldMask === 2 || fieldMask === 6) {
            implicitUnit = langruntime.checkedI32(7);
        }
        if (fieldMask === 8) {
            implicitUnit = langruntime.checkedI32(5);
        }
        if (fieldMask === 1024 || fieldMask === 1032) {
            implicitUnit = langruntime.checkedI32(4);
        }
        if (fieldMask === 2048 || fieldMask === 3072 || fieldMask === 3080) {
            implicitUnit = langruntime.checkedI32(3);
        }
        let numbers: number = 0;
        let additionalSign: boolean = false;
        while (end > start) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
            const token: string = intervalTokenText(buffer, langruntime.indexStruct(tokens, langruntime.checkedIndex(end), copyIntervalInputToken));
            const tokenChars: string[] = Array.from(token);
            let colon: boolean = false;
            let position: number = 0;
            while (position < tokenChars.length) {
                if (langruntime.indexChar(tokenChars, langruntime.checkedIndex(position)) === ":") {
                    colon = langruntime.checkedBool(true);
                }
                position = langruntime.checkedAdd(position, 1);
            }
            const found: number = intervalInputUnit(token);
            if (colon) {
                if (pending) {
                    return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
                }
                acc = copyIntervalInputAcc(intervalInputClock(acc, token, fieldMask));
                if (!(acc.error === 0)) {
                    return { kind: "Error", value: makeSqlError(acc.error) };
                }
                numbers = langruntime.checkedI32(langruntime.checkedSignedAdd(numbers, 1));
                if (end > start && tokenChars.length > 0 && (langruntime.indexChar(tokenChars, langruntime.checkedIndex(0)) === "-" || langruntime.indexChar(tokenChars, langruntime.checkedIndex(0)) === "+")) {
                    additionalSign = langruntime.checkedBool(true);
                }
                implicitUnit = langruntime.checkedI32(5);
            }
            else if (found >= 0) {
                if (pending) {
                    return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
                }
                unit = langruntime.checkedI32(found);
                pending = langruntime.checkedBool(true);
            }
            else {
                if (tokenChars.length > 0 && intervalInputAlpha(langruntime.indexChar(tokenChars, langruntime.checkedIndex(0)))) {
                    return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
                }
                let whole: Int8Value = intervalInputWhole(token);
                let yearMonth: boolean = false;
                if (equalInt8Value(whole, { kind: "Unknown" })) {
                    whole = intervalInputYearMonth(token);
                    yearMonth = langruntime.checkedBool(true);
                }
                if (yearMonth) {
                    unit = langruntime.checkedI32(7);
                }
                if (whole.kind === "Error") {
                    const error: SqlError = whole.value;
                    return { kind: "Error", value: error };
                }
                if (equalInt8Value(whole, { kind: "Unknown" })) {
                    return { kind: "Unknown" };
                }
                if (whole.kind === "Value") {
                    const number: bigint = langruntime.checkedI64(whole.value);
                    const fraction: number = intervalInputFraction(token);
                    if (unit < 0) {
                        unit = langruntime.checkedI32(implicitUnit);
                    }
                    acc = copyIntervalInputAcc(intervalInputAdd(acc, number, fraction, unit));
                    if (!(acc.error === 0)) {
                        return { kind: "Error", value: makeSqlError(acc.error) };
                    }
                    implicitUnit = langruntime.checkedI32(unit);
                    if (unit === 4) {
                        implicitUnit = langruntime.checkedI32(5);
                    }
                    unit = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                    pending = langruntime.checkedBool(false);
                    numbers = langruntime.checkedI32(langruntime.checkedSignedAdd(numbers, 1));
                    const numberChars: string[] = Array.from(token);
                    if (end > start && numberChars.length > 0 && (langruntime.indexChar(numberChars, langruntime.checkedIndex(0)) === "-" || langruntime.indexChar(numberChars, langruntime.checkedIndex(0)) === "+")) {
                        additionalSign = langruntime.checkedBool(true);
                    }
                }
            }
        }
        if (pending || numbers === 0) {
            return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
        }
        const firstNumber: string = intervalTokenText(buffer, langruntime.indexStruct(tokens, langruntime.checkedIndex(start), copyIntervalInputToken));
        const first: string[] = Array.from(firstNumber);
        if (numbers > 1 && first.length > 0 && langruntime.indexChar(first, langruntime.checkedIndex(0)) === "-" && additionalSign === false) {
            return { kind: "Unknown" };
        }
        const months: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(acc.years))), 12n), (BigInt(langruntime.checkedI32(acc.months))));
        if (months < (-2147483648n) || months > 2147483647n) {
            return { kind: "Error", value: makeSqlError(intervalInputFinalRange) };
        }
        if (ago) {
            if (months === (-2147483648n) || acc.days === (langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) || acc.time === (-9223372036854775808n)) {
                return { kind: "Error", value: makeSqlError(intervalInputRange) };
            }
            return makeIntervalValue(Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Subtract(0n, months))))), langruntime.checkedSignedSubtract(0, acc.days), langruntime.checkedI64Subtract(0n, acc.time));
        }
        return makeIntervalValue(Number(BigInt.asIntN(32, langruntime.checkedI64(months))), acc.days, acc.time);
    }
    return { kind: "Unknown" };
}
function intervalClockErrorState(error: SqlError, fallback: number): number {
    fallback = langruntime.checkedIndex(fallback);
    if (fallback === intervalInputSyntax) {
        return fallback;
    }
    return error.state;
}
function intervalInputClock(input: IntervalInputAcc, text: string, fieldMask: number): IntervalInputAcc {
    input = copyIntervalInputAcc(input);
    text = langruntime.checkedString(text);
    fieldMask = langruntime.checkedI32(fieldMask);
    const buffer: IntervalInputText = { chars: Array.from(text) };
    let start: number = 0;
    let negative: boolean = false;
    let rangeError: number = intervalInputRange;
    if (buffer.chars.length > 0 && (langruntime.indexChar(buffer.chars, langruntime.checkedIndex(0)) === "-" || langruntime.indexChar(buffer.chars, langruntime.checkedIndex(0)) === "+")) {
        negative = langruntime.checkedBool(langruntime.indexChar(buffer.chars, langruntime.checkedIndex(0)) === "-");
        start = langruntime.checkedIndex(1);
        rangeError = langruntime.checkedIndex(intervalInputSyntax);
    }
    let fields: IntervalInputToken[] = [];
    let index: number = start;
    while (index < buffer.chars.length) {
        if (langruntime.indexChar(buffer.chars, langruntime.checkedIndex(index)) === ":") {
            langruntime.pushStruct(fields, { start: start, end: index }, copyIntervalInputToken);
            start = langruntime.checkedIndex(langruntime.checkedAdd(index, 1));
        }
        index = langruntime.checkedAdd(index, 1);
    }
    langruntime.pushStruct(fields, { start: start, end: index }, copyIntervalInputToken);
    if (fields.length < 2 || fields.length > 3) {
        return intervalInputFail(input, intervalInputSyntax);
    }
    const firstText: string = intervalTokenText(buffer, langruntime.indexStruct(fields, langruntime.checkedIndex(0), copyIntervalInputToken));
    const secondText: string = intervalTokenText(buffer, langruntime.indexStruct(fields, langruntime.checkedIndex(1), copyIntervalInputToken));
    const firstNumber: Int8Value = intervalInputWhole(firstText);
    const secondNumber: Int8Value = intervalInputWhole(secondText);
    if (firstNumber.kind === "Error") {
        const error: SqlError = firstNumber.value;
        return intervalInputFail(input, intervalClockErrorState(error, rangeError));
    }
    if (secondNumber.kind === "Error") {
        const error: SqlError = secondNumber.value;
        return intervalInputFail(input, intervalClockErrorState(error, rangeError));
    }
    if (equalInt8Value(firstNumber, { kind: "Unknown" }) || equalInt8Value(secondNumber, { kind: "Unknown" })) {
        return intervalInputFail(input, intervalInputSyntax);
    }
    let hours: bigint = 0n;
    let minutes: bigint = 0n;
    let seconds: bigint = 0n;
    if (firstNumber.kind === "Value") {
        const number: bigint = langruntime.checkedI64(firstNumber.value);
        hours = langruntime.checkedI64(number);
    }
    if (secondNumber.kind === "Value") {
        const number: bigint = langruntime.checkedI64(secondNumber.value);
        minutes = langruntime.checkedI64(number);
    }
    const firstChars: string[] = Array.from(firstText);
    index = langruntime.checkedIndex(0);
    while (index < firstChars.length) {
        if (dateTextDigit(langruntime.indexChar(firstChars, langruntime.checkedIndex(index))) < 0) {
            return intervalInputFail(input, intervalInputSyntax);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    const secondChars: string[] = Array.from(secondText);
    let fractionText: string = "0";
    let secondPoint: boolean = false;
    index = langruntime.checkedIndex(0);
    while (index < secondChars.length) {
        if (langruntime.indexChar(secondChars, langruntime.checkedIndex(index)) === ".") {
            secondPoint = langruntime.checkedBool(true);
        }
        if (fields.length === 3 && dateTextDigit(langruntime.indexChar(secondChars, langruntime.checkedIndex(index))) < 0) {
            return intervalInputFail(input, intervalInputSyntax);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    if (fields.length === 3) {
        fractionText = langruntime.checkedString(intervalTokenText(buffer, langruntime.indexStruct(fields, langruntime.checkedIndex(2), copyIntervalInputToken)));
        const lastNumber: Int8Value = intervalInputWhole(fractionText);
        if (lastNumber.kind === "Error") {
            const error: SqlError = lastNumber.value;
            return intervalInputFail(input, intervalClockErrorState(error, rangeError));
        }
        if (equalInt8Value(lastNumber, { kind: "Unknown" })) {
            return intervalInputFail(input, intervalInputSyntax);
        }
        if (lastNumber.kind === "Value") {
            const number: bigint = langruntime.checkedI64(lastNumber.value);
            seconds = langruntime.checkedI64(number);
        }
    }
    else if (secondPoint || fieldMask === 6144) {
        seconds = langruntime.checkedI64(minutes);
        minutes = langruntime.checkedI64(hours);
        hours = langruntime.checkedI64(0n);
        fractionText = langruntime.checkedString(secondText);
    }
    if (hours < 0n || minutes < 0n || minutes > 59n || seconds < 0n || seconds > 60n || hours > langruntime.checkedI64Divide(9223372036854775807n, 3600000000n)) {
        return intervalInputFail(input, rangeError);
    }
    const fraction: number = langruntime.f64Multiply(intervalInputFraction(fractionText), 1000000.0);
    let rounded: number = langruntime.f64ToI32(fraction);
    const extra: number = langruntime.f64Subtract(fraction, (Number(langruntime.checkedI32(rounded))));
    if (extra > 0.5 || (extra === 0.5 && !(langruntime.checkedSignedRemainder(rounded, 2) === 0))) {
        rounded = langruntime.checkedI32(langruntime.checkedSignedAdd(rounded, 1));
    }
    let micros: bigint = BigInt(langruntime.checkedI32(rounded));
    const hoursMicroseconds: bigint = langruntime.checkedI64Multiply(hours, 3600000000n);
    if (micros > langruntime.checkedI64Subtract(9223372036854775807n, hoursMicroseconds)) {
        return intervalInputFail(input, rangeError);
    }
    micros = langruntime.checkedI64(langruntime.checkedI64Add(micros, hoursMicroseconds));
    const minutesMicroseconds: bigint = langruntime.checkedI64Multiply(minutes, 60000000n);
    if (micros > langruntime.checkedI64Subtract(9223372036854775807n, minutesMicroseconds)) {
        return intervalInputFail(input, rangeError);
    }
    micros = langruntime.checkedI64(langruntime.checkedI64Add(micros, minutesMicroseconds));
    const secondsMicroseconds: bigint = langruntime.checkedI64Multiply(seconds, 1000000n);
    if (micros > langruntime.checkedI64Subtract(9223372036854775807n, secondsMicroseconds)) {
        return intervalInputFail(input, rangeError);
    }
    micros = langruntime.checkedI64(langruntime.checkedI64Add(micros, secondsMicroseconds));
    if (negative) {
        micros = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, micros));
    }
    let bit: number = 1;
    while (bit <= 16) {
        if (!(langruntime.checkedSignedRemainder((langruntime.checkedSignedDivide(input.mask, bit)), 2) === 0)) {
            return intervalInputFail(input, intervalInputSyntax);
        }
        bit = langruntime.checkedI32(langruntime.checkedSignedMultiply(bit, 2));
    }
    return { years: input.years, months: input.months, days: input.days, time: micros, mask: langruntime.checkedSignedAdd(input.mask, 31), error: 0 };
}
interface IntervalIsoNumber {
    whole: bigint;
    fractionBits: bigint;
    next: number;
    width: number;
    error: number;
}
function copyIntervalIsoNumber(value: IntervalIsoNumber): IntervalIsoNumber {
    return { whole: langruntime.checkedI64(value.whole), fractionBits: langruntime.checkedI64(value.fractionBits), next: langruntime.checkedIndex(value.next), width: langruntime.checkedIndex(value.width), error: langruntime.checkedIndex(value.error) };
}
function intervalIsoNumberFail(next: number, width: number, error: number): IntervalIsoNumber {
    next = langruntime.checkedIndex(next);
    width = langruntime.checkedIndex(width);
    error = langruntime.checkedIndex(error);
    return { whole: 0n, fractionBits: 0n, next: next, width: width, error: error };
}
function intervalIsoRead(input: IntervalInputText, start: number): IntervalIsoNumber {
    start = langruntime.checkedIndex(start);
    let index: number = start;
    let number: string = "";
    if (index < input.chars.length && langruntime.indexChar(input.chars, langruntime.checkedIndex(index)) === "-") {
        number = number + langruntime.checkedChar("-");
        index = langruntime.checkedAdd(index, 1);
    }
    let width: number = 0;
    while (index < input.chars.length && dateTextDigit(langruntime.indexChar(input.chars, langruntime.checkedIndex(index))) >= 0) {
        number = number + langruntime.checkedChar(langruntime.indexChar(input.chars, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
        width = langruntime.checkedAdd(width, 1);
    }
    let digits: number = width;
    if (index < input.chars.length && langruntime.indexChar(input.chars, langruntime.checkedIndex(index)) === ".") {
        number = number + langruntime.checkedChar(".");
        index = langruntime.checkedAdd(index, 1);
        while (index < input.chars.length && dateTextDigit(langruntime.indexChar(input.chars, langruntime.checkedIndex(index))) >= 0) {
            number = number + langruntime.checkedChar(langruntime.indexChar(input.chars, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
            digits = langruntime.checkedAdd(digits, 1);
        }
    }
    if (digits === 0) {
        return intervalIsoNumberFail(index, width, intervalInputSyntax);
    }
    if (index < input.chars.length && (langruntime.indexChar(input.chars, langruntime.checkedIndex(index)) === "e" || langruntime.indexChar(input.chars, langruntime.checkedIndex(index)) === "E")) {
        number = number + langruntime.checkedChar(langruntime.indexChar(input.chars, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
        if (index < input.chars.length && (langruntime.indexChar(input.chars, langruntime.checkedIndex(index)) === "-" || langruntime.indexChar(input.chars, langruntime.checkedIndex(index)) === "+")) {
            number = number + langruntime.checkedChar(langruntime.indexChar(input.chars, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
        }
        const exponent: number = index;
        while (index < input.chars.length && dateTextDigit(langruntime.indexChar(input.chars, langruntime.checkedIndex(index))) >= 0) {
            number = number + langruntime.checkedChar(langruntime.indexChar(input.chars, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
        }
        if (index === exponent) {
            return intervalIsoNumberFail(index, width, intervalInputSyntax);
        }
    }
    const spelling: string = number;
    const value: number = langruntime.f64FromText(spelling, 1.0e16);
    const infinity: number = langruntime.f64Divide(1.0, 0.0);
    if (langruntime.f64Abs(value) === infinity) {
        return intervalIsoNumberFail(index, width, intervalInputSyntax);
    }
    if (value < -1.0e15 || value > 1.0e15 || !(value === value)) {
        return intervalIsoNumberFail(index, width, intervalInputRange);
    }
    const letters: string[] = Array.from(number);
    let digitIndex: number = 0;
    let nonzero: boolean = false;
    while (digitIndex < letters.length && !(langruntime.indexChar(letters, langruntime.checkedIndex(digitIndex)) === "e") && !(langruntime.indexChar(letters, langruntime.checkedIndex(digitIndex)) === "E")) {
        if (dateTextDigit(langruntime.indexChar(letters, langruntime.checkedIndex(digitIndex))) > 0) {
            nonzero = langruntime.checkedBool(true);
        }
        digitIndex = langruntime.checkedAdd(digitIndex, 1);
    }
    if ((value === 0.0 && nonzero) || (!(value === 0.0) && langruntime.f64Abs(value) < 2.2250738585072014e-308)) {
        return intervalIsoNumberFail(index, width, intervalInputSyntax);
    }
    const high: number = langruntime.f64ToI32((langruntime.f64Divide(value, 1000000000.0)));
    const rest: number = langruntime.f64Subtract(value, langruntime.f64Multiply((Number(langruntime.checkedI32(high))), 1000000000.0));
    const low: number = langruntime.f64ToI32(rest);
    const fraction: number = langruntime.f64Subtract(rest, (Number(langruntime.checkedI32(low))));
    const fractionBits: bigint = langruntime.f64ToI64Bits(fraction);
    return { whole: langruntime.checkedI64Add(langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(high))), 1000000000n), (BigInt(langruntime.checkedI32(low)))), fractionBits: fractionBits, next: index, width: width, error: 0 };
}
function intervalIsoApply(input: IntervalInputAcc, whole: bigint, fraction: number, unit: number): IntervalInputAcc {
    input = copyIntervalInputAcc(input);
    whole = langruntime.checkedI64(whole);
    fraction = langruntime.checkedF64(fraction);
    unit = langruntime.checkedI32(unit);
    const clean: IntervalInputAcc = copyIntervalInputAcc({ years: input.years, months: input.months, days: input.days, time: input.time, mask: 0, error: input.error });
    return intervalInputAdd(clean, whole, fraction, unit);
}
interface IntervalIsoStep {
    acc: IntervalInputAcc;
    next: number;
    timepart: boolean;
    finished: boolean;
}
function copyIntervalIsoStep(value: IntervalIsoStep): IntervalIsoStep {
    return { acc: copyIntervalInputAcc(value.acc), next: langruntime.checkedIndex(value.next), timepart: langruntime.checkedBool(value.timepart), finished: langruntime.checkedBool(value.finished) };
}
function intervalIsoMakeStep(acc: IntervalInputAcc, next: number, timepart: boolean, finished: boolean): IntervalIsoStep {
    acc = copyIntervalInputAcc(acc);
    next = langruntime.checkedIndex(next);
    timepart = langruntime.checkedBool(timepart);
    finished = langruntime.checkedBool(finished);
    return { acc: copyIntervalInputAcc(acc), next: next, timepart: timepart, finished: finished };
}
function intervalIsoStepFail(acc: IntervalInputAcc, error: number): IntervalIsoStep {
    acc = copyIntervalInputAcc(acc);
    error = langruntime.checkedIndex(error);
    if (!(acc.error === 0)) {
        return intervalIsoMakeStep(acc, 0, false, true);
    }
    return intervalIsoMakeStep(intervalInputFail(acc, error), 0, false, true);
}
function intervalIsoAlternative(input: IntervalInputText, acc: IntervalInputAcc, number: IntervalIsoNumber, next: number, datepart: boolean, designator: string, ended: boolean): IntervalIsoStep {
    acc = copyIntervalInputAcc(acc);
    number = copyIntervalIsoNumber(number);
    next = langruntime.checkedIndex(next);
    datepart = langruntime.checkedBool(datepart);
    designator = langruntime.checkedChar(designator);
    ended = langruntime.checkedBool(ended);
    let result: IntervalInputAcc = copyIntervalInputAcc(acc);
    if (datepart) {
        if (number.width === 8 && (ended || designator === "T")) {
            result = copyIntervalInputAcc(intervalIsoApply(result, langruntime.checkedI64Divide(number.whole, 10000n), 0.0, 8));
            result = copyIntervalInputAcc(intervalIsoApply(result, langruntime.checkedI64Remainder((langruntime.checkedI64Divide(number.whole, 100n)), 100n), 0.0, 7));
            result = copyIntervalInputAcc(intervalIsoApply(result, langruntime.checkedI64Remainder(number.whole, 100n), float8Number(number.fractionBits), 5));
            return intervalIsoMakeStep(result, next, true, ended);
        }
        result = copyIntervalInputAcc(intervalIsoApply(result, number.whole, float8Number(number.fractionBits), 8));
        if (ended || designator === "T") {
            return intervalIsoMakeStep(result, next, true, ended);
        }
        const month: IntervalIsoNumber = copyIntervalIsoNumber(intervalIsoRead(input, next));
        if (!(month.error === 0)) {
            return intervalIsoStepFail(result, month.error);
        }
        result = copyIntervalInputAcc(intervalIsoApply(result, month.whole, float8Number(month.fractionBits), 7));
        if (month.next === input.chars.length) {
            return intervalIsoMakeStep(result, month.next, false, true);
        }
        if (langruntime.indexChar(input.chars, langruntime.checkedIndex(month.next)) === "T") {
            return intervalIsoMakeStep(result, month.next, true, false);
        }
        if (!(langruntime.indexChar(input.chars, langruntime.checkedIndex(month.next)) === "-")) {
            return intervalIsoStepFail(result, intervalInputSyntax);
        }
        const day: IntervalIsoNumber = copyIntervalIsoNumber(intervalIsoRead(input, langruntime.checkedAdd(month.next, 1)));
        if (!(day.error === 0)) {
            return intervalIsoStepFail(result, day.error);
        }
        result = copyIntervalInputAcc(intervalIsoApply(result, day.whole, float8Number(day.fractionBits), 5));
        if (day.next === input.chars.length) {
            return intervalIsoMakeStep(result, day.next, false, true);
        }
        if (langruntime.indexChar(input.chars, langruntime.checkedIndex(day.next)) === "T") {
            return intervalIsoMakeStep(result, day.next, true, false);
        }
        return intervalIsoStepFail(result, intervalInputSyntax);
    }
    if (number.width === 6 && ended) {
        result = copyIntervalInputAcc(intervalIsoApply(result, langruntime.checkedI64Divide(number.whole, 10000n), 0.0, 4));
        result = copyIntervalInputAcc(intervalIsoApply(result, langruntime.checkedI64Remainder((langruntime.checkedI64Divide(number.whole, 100n)), 100n), 0.0, 3));
        result = copyIntervalInputAcc(intervalIsoApply(result, langruntime.checkedI64Remainder(number.whole, 100n), 0.0, 2));
        result = copyIntervalInputAcc(intervalIsoApply(result, 0n, float8Number(number.fractionBits), 0));
        return intervalIsoMakeStep(result, next, true, true);
    }
    result = copyIntervalInputAcc(intervalIsoApply(result, number.whole, float8Number(number.fractionBits), 4));
    if (ended) {
        return intervalIsoMakeStep(result, next, true, true);
    }
    const minute: IntervalIsoNumber = copyIntervalIsoNumber(intervalIsoRead(input, next));
    if (!(minute.error === 0)) {
        return intervalIsoStepFail(result, minute.error);
    }
    result = copyIntervalInputAcc(intervalIsoApply(result, minute.whole, float8Number(minute.fractionBits), 3));
    if (minute.next === input.chars.length) {
        return intervalIsoMakeStep(result, minute.next, true, true);
    }
    if (!(langruntime.indexChar(input.chars, langruntime.checkedIndex(minute.next)) === ":")) {
        return intervalIsoStepFail(result, intervalInputSyntax);
    }
    const second: IntervalIsoNumber = copyIntervalIsoNumber(intervalIsoRead(input, langruntime.checkedAdd(minute.next, 1)));
    if (!(second.error === 0)) {
        return intervalIsoStepFail(result, second.error);
    }
    result = copyIntervalInputAcc(intervalIsoApply(result, second.whole, float8Number(second.fractionBits), 2));
    if (second.next === input.chars.length) {
        return intervalIsoMakeStep(result, second.next, true, true);
    }
    return intervalIsoStepFail(result, intervalInputSyntax);
}
function intervalIsoFinish(acc: IntervalInputAcc): IntervalValue {
    acc = copyIntervalInputAcc(acc);
    if (!(acc.error === 0)) {
        return { kind: "Error", value: makeSqlError(acc.error) };
    }
    const months: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(acc.years))), 12n), (BigInt(langruntime.checkedI32(acc.months))));
    if (months < (-2147483648n) || months > 2147483647n) {
        return { kind: "Error", value: makeSqlError(intervalInputFinalRange) };
    }
    return makeIntervalValue(Number(BigInt.asIntN(32, langruntime.checkedI64(months))), acc.days, acc.time);
}
function intervalInputIso(text: string): IntervalValue {
    text = langruntime.checkedString(text);
    const input: IntervalInputText = { chars: Array.from(text) };
    if (input.chars.length < 2 || !(langruntime.indexChar(input.chars, langruntime.checkedIndex(0)) === "P")) {
        return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
    }
    let acc: IntervalInputAcc = copyIntervalInputAcc({ years: 0, months: 0, days: 0, time: 0n, mask: 0, error: 0 });
    let datepart: boolean = true;
    let havefield: boolean = false;
    let index: number = 1;
    while (index < input.chars.length) {
        if (langruntime.indexChar(input.chars, langruntime.checkedIndex(index)) === "T") {
            datepart = langruntime.checkedBool(false);
            havefield = langruntime.checkedBool(false);
            index = langruntime.checkedAdd(index, 1);
        }
        else {
            const number: IntervalIsoNumber = copyIntervalIsoNumber(intervalIsoRead(input, index));
            if (!(number.error === 0)) {
                return { kind: "Error", value: makeSqlError(number.error) };
            }
            index = langruntime.checkedIndex(number.next);
            const ended: boolean = index === input.chars.length;
            let designator: string = "?";
            if (ended === false) {
                designator = langruntime.checkedChar(langruntime.indexChar(input.chars, langruntime.checkedIndex(index)));
                index = langruntime.checkedAdd(index, 1);
            }
            let unit: number = langruntime.checkedSignedNegate(1);
            if (datepart) {
                if (designator === "Y") {
                    unit = langruntime.checkedI32(8);
                }
                if (designator === "M") {
                    unit = langruntime.checkedI32(7);
                }
                if (designator === "W") {
                    unit = langruntime.checkedI32(6);
                }
                if (designator === "D") {
                    unit = langruntime.checkedI32(5);
                }
            }
            else {
                if (designator === "H") {
                    unit = langruntime.checkedI32(4);
                }
                if (designator === "M") {
                    unit = langruntime.checkedI32(3);
                }
                if (designator === "S") {
                    unit = langruntime.checkedI32(2);
                }
            }
            if (unit >= 0) {
                acc = copyIntervalInputAcc(intervalIsoApply(acc, number.whole, float8Number(number.fractionBits), unit));
                havefield = langruntime.checkedBool(true);
            }
            else {
                const alternative: boolean = ended || (datepart && (designator === "-" || designator === "T")) || (datepart === false && designator === ":");
                if (alternative) {
                    if (havefield) {
                        return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
                    }
                    const step: IntervalIsoStep = copyIntervalIsoStep(intervalIsoAlternative(input, acc, number, index, datepart, designator, ended));
                    acc = copyIntervalInputAcc(step.acc);
                    if (step.finished) {
                        return intervalIsoFinish(acc);
                    }
                    index = langruntime.checkedIndex(step.next);
                    datepart = langruntime.checkedBool(step.timepart === false);
                    havefield = langruntime.checkedBool(false);
                }
                else {
                    if (designator === "x" || designator === "X") {
                        return { kind: "Unknown" };
                    }
                    return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
                }
            }
            if (!(acc.error === 0)) {
                return { kind: "Error", value: makeSqlError(acc.error) };
            }
        }
    }
    return intervalIsoFinish(acc);
}
export function intervalFromTextFields(input: TextValue, fields: Int4Value): IntervalValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (fields.kind === "Error") {
        const error: SqlError = fields.value;
        return { kind: "Error", value: error };
    }
    if (equalTextValue(input, { kind: "Unknown" }) || equalInt4Value(fields, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalTextValue(input, { kind: "Null" }) || equalInt4Value(fields, { kind: "Null" })) {
        return { kind: "Null" };
    }
    let fieldMask: number = 32767;
    if (fields.kind === "Value") {
        const value: number = langruntime.checkedI32(fields.value);
        fieldMask = langruntime.checkedI32(value);
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(text);
        let start: number = 0;
        while (start < chars.length && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(start)))) {
            start = langruntime.checkedAdd(start, 1);
        }
        if (start < chars.length && langruntime.indexChar(chars, langruntime.checkedIndex(start)) === "P") {
            if (chars.length > 255) {
                return { kind: "Unknown" };
            }
            return intervalInputIso(text);
        }
        return intervalUnitsFromText({ kind: "Value", value: text }, fieldMask);
    }
    return intervalUnitsFromText(input, fieldMask);
}
function intervalInputAlpha(character: string): boolean {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(langruntime.asciiLowercase(character)).codePointAt(0)!;
    return code >= 97 && code <= 122;
}
function intervalInputNormalized(text: string): string {
    text = langruntime.checkedString(text);
    const chars: string[] = Array.from(text);
    let index: number = 0;
    let previous: string = " ";
    let dateField: boolean = false;
    let word: boolean = false;
    let output: string = "";
    while (index < chars.length) {
        const current: string = langruntime.indexChar(chars, langruntime.checkedIndex(index));
        if (dateTextSpace(current)) {
            dateField = langruntime.checkedBool(false);
            word = langruntime.checkedBool(false);
        }
        if (dateField && (current === "." || current === "+")) {
            output = output + langruntime.checkedChar(" ");
            dateField = langruntime.checkedBool(false);
            word = langruntime.checkedBool(false);
        }
        if (current === "-" && dateTextDigit(previous) >= 0 && word === false) {
            dateField = langruntime.checkedBool(true);
        }
        if ((dateTextDigit(previous) >= 0 && intervalInputAlpha(current)) || previous === "@") {
            output = output + langruntime.checkedChar(" ");
            dateField = langruntime.checkedBool(false);
        }
        if (intervalInputAlpha(current)) {
            word = langruntime.checkedBool(true);
        }
        output = output + langruntime.checkedChar(current);
        previous = langruntime.checkedChar(current);
        index = langruntime.checkedAdd(index, 1);
    }
    return output;
}
function intervalInputYearMonth(text: string): Int8Value {
    text = langruntime.checkedString(text);
    const chars: string[] = Array.from(text);
    let index: number = 0;
    let negative: boolean = false;
    if (index < chars.length && (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-" || langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "+")) {
        negative = langruntime.checkedBool(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-");
        index = langruntime.checkedAdd(index, 1);
    }
    const start: number = index;
    while (index < chars.length && dateTextDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) >= 0) {
        index = langruntime.checkedAdd(index, 1);
    }
    if (index === start || index === chars.length || !(langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-")) {
        return { kind: "Unknown" };
    }
    const separator: number = index;
    let first: string = "";
    index = langruntime.checkedIndex(0);
    while (index < separator) {
        first = first + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    let second: string = "";
    index = langruntime.checkedIndex(langruntime.checkedAdd(separator, 1));
    while (index < chars.length) {
        if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".") {
            return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
        }
        second = second + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    const years: Int8Value = intervalInputWhole(first);
    let months: Int8Value = intervalInputWhole(second);
    if (langruntime.checkedAdd(separator, 1) === chars.length) {
        months = { kind: "Value", value: 0n };
    }
    if (years.kind === "Error") {
        const error: SqlError = years.value;
        return { kind: "Error", value: error };
    }
    if (months.kind === "Error") {
        const error: SqlError = months.value;
        return { kind: "Error", value: error };
    }
    if (years.kind === "Value") {
        const year: bigint = langruntime.checkedI64(years.value);
        if (months.kind === "Value") {
            const month: bigint = langruntime.checkedI64(months.value);
            if (month < 0n || month > 11n || year > langruntime.checkedI64Divide(9223372036854775807n, 12n) || year < langruntime.checkedI64Divide((-9223372036854775808n), 12n)) {
                return { kind: "Error", value: makeSqlError(intervalInputRange) };
            }
            const product: bigint = langruntime.checkedI64Multiply(year, 12n);
            let value: bigint = 0n;
            if (negative) {
                if (product < langruntime.checkedI64Add((-9223372036854775808n), month)) {
                    return { kind: "Error", value: makeSqlError(intervalInputRange) };
                }
                value = langruntime.checkedI64(langruntime.checkedI64Subtract(product, month));
            }
            else {
                if (product > langruntime.checkedI64Subtract(9223372036854775807n, month)) {
                    return { kind: "Error", value: makeSqlError(intervalInputRange) };
                }
                value = langruntime.checkedI64(langruntime.checkedI64Add(product, month));
            }
            return { kind: "Value", value: value };
        }
    }
    return { kind: "Error", value: makeSqlError(intervalInputSyntax) };
}
export function intervalFromText(input: TextValue): IntervalValue {
    return intervalFromTextFields(input, makeInt4Value(32767));
}
export function andStops(left: CheckOutcome): boolean {
    if (equalCheckOutcome(left, { kind: "False" })) {
        return true;
    }
    if (left.kind === "Error") {
        return true;
    }
    return false;
}
export function andFinish(left: CheckOutcome, right: CheckOutcome): CheckOutcome {
    if (left.kind === "Error") {
        const error: SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(left, { kind: "False" }) || equalCheckOutcome(right, { kind: "False" })) {
        return { kind: "False" };
    }
    if (equalCheckOutcome(left, { kind: "Unknown" }) || equalCheckOutcome(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalCheckOutcome(left, { kind: "Null" }) || equalCheckOutcome(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "True" };
}
export function orStops(left: CheckOutcome): boolean {
    if (equalCheckOutcome(left, { kind: "True" })) {
        return true;
    }
    if (left.kind === "Error") {
        return true;
    }
    return false;
}
export function orFinish(left: CheckOutcome, right: CheckOutcome): CheckOutcome {
    if (left.kind === "Error") {
        const error: SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(left, { kind: "True" }) || equalCheckOutcome(right, { kind: "True" })) {
        return { kind: "True" };
    }
    if (equalCheckOutcome(left, { kind: "Unknown" }) || equalCheckOutcome(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalCheckOutcome(left, { kind: "Null" }) || equalCheckOutcome(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "False" };
}
export function notFinish(value: CheckOutcome): CheckOutcome {
    if (equalCheckOutcome(value, { kind: "True" })) {
        return { kind: "False" };
    }
    if (equalCheckOutcome(value, { kind: "False" })) {
        return { kind: "True" };
    }
    return value;
}
function booleanTestFinish(value: CheckOutcome, matched: boolean): CheckOutcome {
    matched = langruntime.checkedBool(matched);
    if (caseGuardStops(value)) {
        return value;
    }
    if (matched) {
        return { kind: "True" };
    }
    return { kind: "False" };
}
export function isTrueFinish(value: CheckOutcome): CheckOutcome {
    return booleanTestFinish(value, equalCheckOutcome(value, { kind: "True" }));
}
export function isFalseFinish(value: CheckOutcome): CheckOutcome {
    return booleanTestFinish(value, equalCheckOutcome(value, { kind: "False" }));
}
export function isUnknownFinish(value: CheckOutcome): CheckOutcome {
    return booleanTestFinish(value, equalCheckOutcome(value, { kind: "Null" }));
}
export function distinctNeedsComparison(leftNull: BoolValue, rightNull: BoolValue): boolean {
    return equalBoolValue(leftNull, { kind: "Value", value: false }) && equalBoolValue(rightNull, { kind: "Value", value: false });
}
export function distinctNullsFinish(leftNull: BoolValue, rightNull: BoolValue): CheckOutcome {
    if (leftNull.kind === "Error") {
        const error: SqlError = leftNull.value;
        return { kind: "Error", value: error };
    }
    if (rightNull.kind === "Error") {
        const error: SqlError = rightNull.value;
        return { kind: "Error", value: error };
    }
    if (leftNull.kind === "Value") {
        const left: boolean = langruntime.checkedBool(leftNull.value);
        if (rightNull.kind === "Value") {
            const right: boolean = langruntime.checkedBool(rightNull.value);
            if (left && right) {
                return { kind: "False" };
            }
            if (left || right) {
                return { kind: "True" };
            }
        }
    }
    return { kind: "Unknown" };
}
export function caseGuardStops(value: CheckOutcome): boolean {
    if (equalCheckOutcome(value, { kind: "Unknown" })) {
        return true;
    }
    if (value.kind === "Error") {
        return true;
    }
    return false;
}
export function minmaxNullsChooseRight(leftNull: BoolValue, rightNull: BoolValue): CheckOutcome {
    if (leftNull.kind === "Error") {
        const error: SqlError = leftNull.value;
        return { kind: "Error", value: error };
    }
    if (rightNull.kind === "Error") {
        const error: SqlError = rightNull.value;
        return { kind: "Error", value: error };
    }
    if (leftNull.kind === "Value") {
        const left: boolean = langruntime.checkedBool(leftNull.value);
        if (rightNull.kind === "Value") {
            const right: boolean = langruntime.checkedBool(rightNull.value);
            if (left && right === false) {
                return { kind: "True" };
            }
            return { kind: "False" };
        }
    }
    return { kind: "Unknown" };
}
export function caseGuardTakes(value: CheckOutcome): boolean {
    return equalCheckOutcome(value, { kind: "True" });
}
export function rowCompareContinues(value: Int4Value): boolean {
    if (value.kind === "Value") {
        const ordering: number = langruntime.checkedI32(value.value);
        return ordering === 0;
    }
    return false;
}
export function rowCompareFinish(value: Int4Value, strategy: number): BoolValue {
    strategy = langruntime.checkedI32(strategy);
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (equalInt4Value(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const ordering: number = langruntime.checkedI32(value.value);
        if (strategy === 1) {
            return { kind: "Value", value: ordering < 0 };
        }
        if (strategy === 2) {
            return { kind: "Value", value: ordering <= 0 };
        }
        if (strategy === 4) {
            return { kind: "Value", value: ordering >= 0 };
        }
        if (strategy === 5) {
            return { kind: "Value", value: ordering > 0 };
        }
    }
    return { kind: "Unknown" };
}
export function constantFinish(left: CheckOutcome, right: CheckOutcome): CheckOutcome {
    if (left.kind === "Error") {
        const error: SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(left, { kind: "Unknown" }) || equalCheckOutcome(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return { kind: "True" };
}
