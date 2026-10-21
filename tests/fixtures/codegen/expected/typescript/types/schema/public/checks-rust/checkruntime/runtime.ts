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
export function equalCheckOutcome(left: CheckOutcome, right: CheckOutcome): boolean {
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
const sqlErrorNotNullViolation = 3505682;
const sqlErrorCheckViolation = 3505720;
const sqlErrorCardinalityViolation = 3405888;
const sqlErrorNullValueNotAllowed = 3452548;
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
function copyNumericValue(value: NumericValue): NumericValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedString(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
    readonly kind: "ConvertedError";
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
        case "ConvertedError": return { kind: "ConvertedError", value: value.value };
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
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Values";
    readonly value: JsonbArgumentPayload;
};
export function copyJsonbArguments(value: JsonbArguments): JsonbArguments {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Error": return { kind: "Error", value: value.value };
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
export function copyFloat8Value(value: Float8Value): Float8Value {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedI64(value.value) };
        case "Error": return { kind: "Error", value: value.value };
        case "UnspecifiedNan": return { kind: "UnspecifiedNan" };
    }
}
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
export function equalPointPayload(left: PointPayload, right: PointPayload): boolean {
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
export function networkCidrHostBitsZero(address: NetworkAddress): boolean {
    let remaining: number = address.prefix;
    let wordIndex: number = 0;
    let wordCount: number = 8;
    if (address.family === 4) {
        wordCount = langruntime.checkedIndex(2);
    }
    else if (!(address.family === 6)) {
        return false;
    }
    if (remaining < 0 || remaining > langruntime.checkedSignedMultiply((langruntime.checkedI32(langruntime.checkedIndex(wordCount))), 16)) {
        return false;
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
            return false;
        }
        wordIndex = langruntime.checkedAdd(wordIndex, 1);
    }
    return true;
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
    if (cidr && networkCidrHostBitsZero(address) === false) {
        return { kind: "Error", value: makeSqlError(sqlErrorInvalidTextRepresentation) };
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
    return jsonReadDecodeStringContext(source, token, false);
}
function jsonReadDecodeStringContext(source: JsonSyntaxSource, token: JsonReadToken, utf8: boolean): TextValue {
    token = copyJsonReadToken(token);
    utf8 = langruntime.checkedBool(utf8);
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
interface JsonArrayPathNode {
    kind: number;
    start: number;
    end: number;
    child: number;
    next: number;
    keyStart: number;
    keyEnd: number;
}
function copyJsonArrayPathNode(value: JsonArrayPathNode): JsonArrayPathNode {
    return { kind: langruntime.checkedI32(value.kind), start: langruntime.checkedIndex(value.start), end: langruntime.checkedIndex(value.end), child: langruntime.checkedIndex(value.child), next: langruntime.checkedIndex(value.next), keyStart: langruntime.checkedIndex(value.keyStart), keyEnd: langruntime.checkedIndex(value.keyEnd) };
}
interface JsonArrayPathFrame {
    node: number;
    tail: number;
    state: number;
    keyStart: number;
    keyEnd: number;
}
function copyJsonArrayPathFrame(value: JsonArrayPathFrame): JsonArrayPathFrame {
    return { node: langruntime.checkedIndex(value.node), tail: langruntime.checkedIndex(value.tail), state: langruntime.checkedI32(value.state), keyStart: langruntime.checkedIndex(value.keyStart), keyEnd: langruntime.checkedIndex(value.keyEnd) };
}
interface JsonArrayPathDocument {
    characters: string[];
    names: string[];
    nodes: JsonArrayPathNode[];
    root: number;
    state: number;
    error: SqlError;
}
function copyJsonArrayPathDocument(value: JsonArrayPathDocument): JsonArrayPathDocument {
    return { characters: langruntime.checkedChars(value.characters), names: langruntime.checkedChars(value.names), nodes: langruntime.checkedStructs(value.nodes, copyJsonArrayPathNode), root: langruntime.checkedIndex(value.root), state: langruntime.checkedI32(value.state), error: value.error };
}
interface JsonArrayPathCandidates {
    nodes: number[];
    state: number;
}
function copyJsonArrayPathCandidates(value: JsonArrayPathCandidates): JsonArrayPathCandidates {
    return { nodes: langruntime.checkedIndices(value.nodes), state: langruntime.checkedI32(value.state) };
}
export function jsonArrayPathState(input: ArrayValue): Int4Value {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        if (!(value.elementType === "pg_catalog.text") || !(value.elementKind === 8)) {
            return { kind: "Unknown" };
        }
        let position: number = 0;
        while (position < value.elements.length) {
            const element: ArrayElement = copyArrayElement(langruntime.indexStruct(value.elements, langruntime.checkedIndex(position), copyArrayElement));
            if (element.kind === "Null") {
                return { kind: "Null" };
            }
            position = langruntime.checkedAdd(position, 1);
        }
        return makeInt4Value(langruntime.checkedI32(langruntime.checkedIndex(value.elements.length)));
    }
    return { kind: "Unknown" };
}
export function jsonArrayPathIndex(input: string): Int4Value {
    const characters: string[] = Array.from(input);
    let position: number = 0;
    while (position < characters.length) {
        const ch: string = langruntime.indexChar(characters, langruntime.checkedIndex(position));
        if (!(ch === " ") && !(ch === "\t") && !(ch === "\n") && !(ch === "\r") && !(ch === "\v") && !(ch === "\f")) {
            break;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    let negative: boolean = false;
    if (position < characters.length) {
        if (langruntime.indexChar(characters, langruntime.checkedIndex(position)) === "-") {
            negative = langruntime.checkedBool(true);
            position = langruntime.checkedAdd(position, 1);
        }
        else if (langruntime.indexChar(characters, langruntime.checkedIndex(position)) === "+") {
            position = langruntime.checkedAdd(position, 1);
        }
    }
    const start: number = position;
    let magnitude: bigint = 0n;
    let limit: bigint = 2147483647n;
    if (negative) {
        limit = langruntime.checkedI64(2147483648n);
    }
    while (position < characters.length) {
        const digit: number = langruntime.checkedSignedSubtract(langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(position))).codePointAt(0)!, 48);
        if (digit < 0 || digit > 9 || magnitude > langruntime.checkedI64Divide((langruntime.checkedI64Subtract(limit, (BigInt(langruntime.checkedI32(digit))))), 10n)) {
            return { kind: "Null" };
        }
        magnitude = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(magnitude, 10n), (BigInt(langruntime.checkedI32(digit)))));
        position = langruntime.checkedAdd(position, 1);
    }
    if (position === start) {
        return { kind: "Null" };
    }
    if (negative) {
        magnitude = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, magnitude));
    }
    return makeInt4Value(Number(BigInt.asIntN(32, langruntime.checkedI64(magnitude))));
}
function jsonArrayPathEmpty(state: number, error: SqlError): JsonArrayPathDocument {
    state = langruntime.checkedI32(state);
    const characters: string[] = [];
    const names: string[] = [];
    const nodes: JsonArrayPathNode[] = [];
    return { characters: characters, names: names, nodes: nodes, root: 0, state: state, error: error };
}
function jsonArrayPathNodeChild(node: JsonArrayPathNode, value: number): JsonArrayPathNode {
    node = copyJsonArrayPathNode(node);
    value = langruntime.checkedIndex(value);
    return { kind: node.kind, start: node.start, end: node.end, child: value, next: node.next, keyStart: node.keyStart, keyEnd: node.keyEnd };
}
function jsonArrayPathNodeNext(node: JsonArrayPathNode, value: number): JsonArrayPathNode {
    node = copyJsonArrayPathNode(node);
    value = langruntime.checkedIndex(value);
    return { kind: node.kind, start: node.start, end: node.end, child: node.child, next: value, keyStart: node.keyStart, keyEnd: node.keyEnd };
}
function jsonArrayPathNodeEnd(node: JsonArrayPathNode, value: number): JsonArrayPathNode {
    node = copyJsonArrayPathNode(node);
    value = langruntime.checkedIndex(value);
    return { kind: node.kind, start: node.start, end: value, child: node.child, next: node.next, keyStart: node.keyStart, keyEnd: node.keyEnd };
}
function parseJsonArrayPathDocument(input: string, utf8: boolean): JsonArrayPathDocument {
    input = langruntime.checkedString(input);
    utf8 = langruntime.checkedBool(utf8);
    const source: JsonSyntaxSource = { characters: Array.from(input) };
    let nodes: JsonArrayPathNode[] = [];
    langruntime.pushStruct(nodes, { kind: langruntime.checkedSignedNegate(1), start: 0, end: 0, child: 0, next: 0, keyStart: 0, keyEnd: 0 }, copyJsonArrayPathNode);
    let names: string[] = [];
    let frames: JsonArrayPathFrame[] = [];
    let depth: number = 0;
    let position: number = 0;
    let root: number = 0;
    while (position < source.characters.length) {
        const token: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, position));
        if (token.kind === jsonReadEnd) {
            break;
        }
        if (token.syntax === jsonSyntaxInvalid) {
            return jsonArrayPathEmpty(langruntime.checkedSignedNegate(2), makeSqlError(jsonReadInvalidText));
        }
        let decoded: TextValue = { kind: "Null" };
        if (token.kind === jsonReadQuote) {
            decoded = jsonReadDecodeStringContext(source, token, utf8);
            if (decoded.kind === "Error") {
                const error: SqlError = decoded.value;
                return jsonArrayPathEmpty(langruntime.checkedSignedNegate(2), error);
            }
            if (equalTextValue(decoded, { kind: "Unknown" })) {
                return jsonArrayPathEmpty(langruntime.checkedSignedNegate(1), makeSqlError(0));
            }
        }
        let key: boolean = false;
        if (depth > 0) {
            const frame: JsonArrayPathFrame = copyJsonArrayPathFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1)), copyJsonArrayPathFrame));
            if (langruntime.indexStruct(nodes, langruntime.checkedIndex(frame.node), copyJsonArrayPathNode).kind === 6 && frame.state === 0 && token.kind === jsonReadQuote) {
                const begin: number = names.length;
                if (decoded.kind === "Value") {
                    const text: string = langruntime.checkedString(decoded.value);
                    const characters: string[] = Array.from(text);
                    let index: number = 0;
                    while (index < characters.length) {
                        langruntime.pushChar(names, langruntime.indexChar(characters, langruntime.checkedIndex(index)));
                        index = langruntime.checkedAdd(index, 1);
                    }
                }
                frames[langruntime.checkedIndexIn(frames, langruntime.checkedSubtract(depth, 1))] = copyJsonArrayPathFrame({ node: frame.node, tail: frame.tail, state: 1, keyStart: begin, keyEnd: names.length });
                key = langruntime.checkedBool(true);
            }
        }
        if (key === false) {
            if (token.kind === jsonReadColon || token.kind === jsonReadComma) {
                if (depth > 0) {
                    const frame: JsonArrayPathFrame = copyJsonArrayPathFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1)), copyJsonArrayPathFrame));
                    let state: number = 0;
                    if (token.kind === jsonReadColon || langruntime.indexStruct(nodes, langruntime.checkedIndex(frame.node), copyJsonArrayPathNode).kind === 5) {
                        state = langruntime.checkedI32(2);
                    }
                    frames[langruntime.checkedIndexIn(frames, langruntime.checkedSubtract(depth, 1))] = copyJsonArrayPathFrame({ node: frame.node, tail: frame.tail, state: state, keyStart: frame.keyStart, keyEnd: frame.keyEnd });
                }
            }
            else if (token.kind === jsonReadObjectClose || token.kind === jsonReadArrayClose) {
                if (depth === 0) {
                    return jsonArrayPathEmpty(langruntime.checkedSignedNegate(2), makeSqlError(jsonReadInvalidText));
                }
                const frame: JsonArrayPathFrame = copyJsonArrayPathFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1)), copyJsonArrayPathFrame));
                nodes[langruntime.checkedIndexIn(nodes, frame.node)] = copyJsonArrayPathNode(jsonArrayPathNodeEnd(langruntime.indexStruct(nodes, langruntime.checkedIndex(frame.node), copyJsonArrayPathNode), token.end));
                depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
            }
            else {
                let kind: number = 3;
                if (token.kind === jsonReadObjectOpen) {
                    kind = langruntime.checkedI32(6);
                }
                else if (token.kind === jsonReadArrayOpen) {
                    kind = langruntime.checkedI32(5);
                }
                else if (token.kind === jsonReadQuote) {
                    kind = langruntime.checkedI32(4);
                }
                else if (langruntime.indexChar(source.characters, langruntime.checkedIndex(token.start)) === "n") {
                    kind = langruntime.checkedI32(0);
                }
                else if (langruntime.indexChar(source.characters, langruntime.checkedIndex(token.start)) === "t") {
                    kind = langruntime.checkedI32(1);
                }
                else if (langruntime.indexChar(source.characters, langruntime.checkedIndex(token.start)) === "f") {
                    kind = langruntime.checkedI32(2);
                }
                let keyStart: number = 0;
                let keyEnd: number = 0;
                const index: number = nodes.length;
                if (depth > 0) {
                    const frame: JsonArrayPathFrame = copyJsonArrayPathFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1)), copyJsonArrayPathFrame));
                    keyStart = langruntime.checkedIndex(frame.keyStart);
                    keyEnd = langruntime.checkedIndex(frame.keyEnd);
                    if (frame.tail > 0) {
                        nodes[langruntime.checkedIndexIn(nodes, frame.tail)] = copyJsonArrayPathNode(jsonArrayPathNodeNext(langruntime.indexStruct(nodes, langruntime.checkedIndex(frame.tail), copyJsonArrayPathNode), index));
                    }
                    else {
                        nodes[langruntime.checkedIndexIn(nodes, frame.node)] = copyJsonArrayPathNode(jsonArrayPathNodeChild(langruntime.indexStruct(nodes, langruntime.checkedIndex(frame.node), copyJsonArrayPathNode), index));
                    }
                    frames[langruntime.checkedIndexIn(frames, langruntime.checkedSubtract(depth, 1))] = copyJsonArrayPathFrame({ node: frame.node, tail: index, state: 3, keyStart: frame.keyStart, keyEnd: frame.keyEnd });
                }
                else {
                    root = langruntime.checkedIndex(index);
                }
                langruntime.pushStruct(nodes, { kind: kind, start: token.start, end: token.end, child: 0, next: 0, keyStart: keyStart, keyEnd: keyEnd }, copyJsonArrayPathNode);
                if (kind === 5 || kind === 6) {
                    let state: number = 0;
                    if (kind === 5) {
                        state = langruntime.checkedI32(2);
                    }
                    const frame: JsonArrayPathFrame = copyJsonArrayPathFrame({ node: index, tail: 0, state: state, keyStart: 0, keyEnd: 0 });
                    if (depth < frames.length) {
                        frames[langruntime.checkedIndexIn(frames, depth)] = copyJsonArrayPathFrame(frame);
                    }
                    else {
                        langruntime.pushStruct(frames, frame, copyJsonArrayPathFrame);
                    }
                    depth = langruntime.checkedAdd(depth, 1);
                }
            }
        }
        position = langruntime.checkedIndex(token.end);
    }
    return { characters: source.characters, names: names, nodes: nodes, root: root, state: 1, error: makeSqlError(0) };
}
function jsonArrayPathKeyMatches(source: JsonArrayPathDocument, node: JsonArrayPathNode, key: JsonSyntaxSource): boolean {
    node = copyJsonArrayPathNode(node);
    if (!(langruntime.checkedSubtract(node.keyEnd, node.keyStart) === key.characters.length)) {
        return false;
    }
    let position: number = 0;
    while (position < key.characters.length) {
        if (!(langruntime.indexChar(source.names, langruntime.checkedIndex(langruntime.checkedAdd(node.keyStart, position))) === langruntime.indexChar(key.characters, langruntime.checkedIndex(position)))) {
            return false;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return true;
}
function jsonArrayPathNext(source: JsonArrayPathDocument, current: JsonArrayPathCandidates, key: TextValue): JsonArrayPathCandidates {
    current = copyJsonArrayPathCandidates(current);
    let output: number[] = [];
    if (key.kind === "Value") {
        const text: string = langruntime.checkedString(key.value);
        const characters: JsonSyntaxSource = { characters: Array.from(text) };
        const index: Int4Value = jsonArrayPathIndex(text);
        let position: number = 0;
        while (position < current.nodes.length) {
            const node: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(langruntime.indexNumber(current.nodes, langruntime.checkedIndex(position))), copyJsonArrayPathNode));
            if (node.kind === 6) {
                let child: number = node.child;
                while (child > 0) {
                    const field: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonArrayPathNode));
                    if (jsonArrayPathKeyMatches(source, field, characters)) {
                        langruntime.pushIndex(output, child);
                    }
                    child = langruntime.checkedIndex(field.next);
                }
            }
            else if (node.kind === 5) {
                if (index.kind === "Value") {
                    const number: number = langruntime.checkedI32(index.value);
                    let count: bigint = 0n;
                    let child: number = node.child;
                    while (child > 0) {
                        count = langruntime.checkedI64(langruntime.checkedI64Add(count, 1n));
                        child = langruntime.checkedIndex(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonArrayPathNode).next);
                    }
                    let wanted: bigint = BigInt(langruntime.checkedI32(number));
                    if (wanted < 0n) {
                        wanted = langruntime.checkedI64(langruntime.checkedI64Add(count, wanted));
                    }
                    let offset: bigint = 0n;
                    child = langruntime.checkedIndex(node.child);
                    while (child > 0) {
                        if (offset === wanted) {
                            langruntime.pushIndex(output, child);
                            break;
                        }
                        offset = langruntime.checkedI64(langruntime.checkedI64Add(offset, 1n));
                        child = langruntime.checkedIndex(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonArrayPathNode).next);
                    }
                }
            }
            position = langruntime.checkedAdd(position, 1);
        }
        return { nodes: output, state: 1 };
    }
    let position: number = 0;
    while (position < current.nodes.length) {
        const node: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(langruntime.indexNumber(current.nodes, langruntime.checkedIndex(position))), copyJsonArrayPathNode));
        if ((node.kind === 5 || node.kind === 6) && node.child > 0) {
            return { nodes: output, state: langruntime.checkedSignedNegate(1) };
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return { nodes: output, state: 1 };
}
export function jsonReadArrayPath(input: JsonValue, path: ArrayValue, asText: boolean, utf8: boolean): TextValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    const pathState: Int4Value = jsonArrayPathState(copyArrayValue(path));
    if (pathState.kind === "Error") {
        const error: SqlError = pathState.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (equalInt4Value(pathState, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (equalInt4Value(pathState, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (input.kind === "Value") {
        const value: JsonPayload = input.value;
        if (path.kind === "Value") {
            const keys: ArrayPayload = copyArrayPayload(path.value);
            let uncertain: boolean = false;
            let index: number = 0;
            while (index < keys.elements.length) {
                const key: ArrayElement = copyArrayElement(langruntime.indexStruct(keys.elements, langruntime.checkedIndex(index), copyArrayElement));
                if (key.kind === "Unknown") {
                    uncertain = langruntime.checkedBool(true);
                }
                index = langruntime.checkedAdd(index, 1);
            }
            const document: JsonArrayPathDocument = parseJsonArrayPathDocument(value.source, utf8);
            if (document.state === langruntime.checkedSignedNegate(2)) {
                if (uncertain) {
                    return { kind: "Unknown" };
                }
                return { kind: "Error", value: document.error };
            }
            if (!(document.state === 1) || document.root === 0) {
                return { kind: "Unknown" };
            }
            let initial: number[] = [];
            langruntime.pushIndex(initial, document.root);
            let candidates: JsonArrayPathCandidates = { nodes: initial, state: 1 };
            index = langruntime.checkedIndex(0);
            while (index < keys.elements.length) {
                const key: TextValue = arrayElementToText(copyArrayElement(langruntime.indexStruct(keys.elements, langruntime.checkedIndex(index), copyArrayElement)));
                candidates = copyJsonArrayPathCandidates(jsonArrayPathNext(document, candidates, key));
                if (!(candidates.state === 1)) {
                    return { kind: "Unknown" };
                }
                if (candidates.nodes.length === 0) {
                    return { kind: "Null" };
                }
                index = langruntime.checkedAdd(index, 1);
            }
            const selected: number = langruntime.indexNumber(candidates.nodes, langruntime.checkedIndex(langruntime.checkedSubtract(candidates.nodes.length, 1)));
            const node: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(document.nodes, langruntime.checkedIndex(selected), copyJsonArrayPathNode));
            const source: JsonSyntaxSource = { characters: document.characters };
            if (asText && node.kind === 0) {
                return { kind: "Null" };
            }
            if (asText && node.kind === 4) {
                const token: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, node.start));
                return jsonReadDecodeStringContext(source, token, utf8);
            }
            if (keys.elements.length === 0 && node.kind < 5) {
                return jsonReadSlice(source, 0, node.end);
            }
            return jsonReadSlice(source, node.start, node.end);
        }
    }
    return { kind: "Unknown" };
}
export function jsonQuoteString(input: string): string {
    input = langruntime.checkedString(input);
    const characters: string[] = Array.from(input);
    const hex: string[] = Array.from("0123456789abcdef");
    let output: string = "";
    output = output + langruntime.checkedChar("\"");
    let position: number = 0;
    while (position < characters.length) {
        const character: string = langruntime.indexChar(characters, langruntime.checkedIndex(position));
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
interface JsonStripFrame {
    node: number;
    child: number;
    first: boolean;
}
function copyJsonStripFrame(value: JsonStripFrame): JsonStripFrame {
    return { node: langruntime.checkedIndex(value.node), child: langruntime.checkedIndex(value.child), first: langruntime.checkedBool(value.first) };
}
export function jsonStripNullsContext(input: JsonValue, arrays: BoolValue, utf8: boolean): JsonValue {
    utf8 = langruntime.checkedBool(utf8);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (arrays.kind === "Error") {
        const error: SqlError = arrays.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (equalBoolValue(arrays, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: JsonPayload = input.value;
        if (arrays.kind === "Value") {
            const remove: boolean = langruntime.checkedBool(arrays.value);
            const document: JsonArrayPathDocument = parseJsonArrayPathDocument(value.source, utf8);
            if (document.state === langruntime.checkedSignedNegate(2)) {
                return { kind: "Error", value: document.error };
            }
            if (!(document.state === 1)) {
                return { kind: "Unknown" };
            }
            const source: JsonSyntaxSource = { characters: document.characters };
            let output: string = "";
            let frames: JsonStripFrame[] = [];
            let depth: number = 0;
            let current: number = document.root;
            let visiting: boolean = true;
            while (visiting || depth > 0) {
                if (visiting) {
                    const node: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(document.nodes, langruntime.checkedIndex(current), copyJsonArrayPathNode));
                    if (node.kind >= 5) {
                        if (node.kind === 6) {
                            output = output + langruntime.checkedChar("{");
                        }
                        else {
                            output = output + langruntime.checkedChar("[");
                        }
                        const frame: JsonStripFrame = copyJsonStripFrame({ node: current, child: node.child, first: true });
                        if (depth === frames.length) {
                            langruntime.pushStruct(frames, frame, copyJsonStripFrame);
                        }
                        else {
                            frames[langruntime.checkedIndexIn(frames, depth)] = copyJsonStripFrame(frame);
                        }
                        depth = langruntime.checkedAdd(depth, 1);
                    }
                    else if (node.kind === 4) {
                        const token: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, node.start));
                        const decoded: TextValue = jsonReadDecodeStringContext(source, token, utf8);
                        if (decoded.kind === "Error") {
                            const error: SqlError = decoded.value;
                            return { kind: "Error", value: error };
                        }
                        let ready: boolean = false;
                        if (decoded.kind === "Value") {
                            const text: string = langruntime.checkedString(decoded.value);
                            const quoted: string = jsonQuoteString(text);
                            output = output + quoted;
                            ready = langruntime.checkedBool(true);
                        }
                        if (ready === false) {
                            return { kind: "Unknown" };
                        }
                    }
                    else {
                        let position: number = node.start;
                        while (position < node.end) {
                            output = output + langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)));
                            position = langruntime.checkedAdd(position, 1);
                        }
                    }
                    visiting = langruntime.checkedBool(false);
                }
                else {
                    const frame: JsonStripFrame = copyJsonStripFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1)), copyJsonStripFrame));
                    const parent: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(document.nodes, langruntime.checkedIndex(frame.node), copyJsonArrayPathNode));
                    let child: number = frame.child;
                    while (child > 0) {
                        const node: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(document.nodes, langruntime.checkedIndex(child), copyJsonArrayPathNode));
                        if (!(node.kind === 0) || (!(parent.kind === 6) && remove === false)) {
                            break;
                        }
                        child = langruntime.checkedIndex(node.next);
                    }
                    if (child === 0) {
                        if (parent.kind === 6) {
                            output = output + langruntime.checkedChar("}");
                        }
                        else {
                            output = output + langruntime.checkedChar("]");
                        }
                        depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
                    }
                    else {
                        const node: JsonArrayPathNode = copyJsonArrayPathNode(langruntime.indexStruct(document.nodes, langruntime.checkedIndex(child), copyJsonArrayPathNode));
                        if (frame.first === false) {
                            output = output + langruntime.checkedChar(",");
                        }
                        if (parent.kind === 6) {
                            let key: string = "";
                            let position: number = node.keyStart;
                            while (position < node.keyEnd) {
                                key = key + langruntime.checkedChar(langruntime.indexChar(document.names, langruntime.checkedIndex(position)));
                                position = langruntime.checkedAdd(position, 1);
                            }
                            const quoted: string = jsonQuoteString(key);
                            output = output + quoted;
                            output = output + langruntime.checkedChar(":");
                        }
                        frames[langruntime.checkedIndexIn(frames, langruntime.checkedSubtract(depth, 1))] = copyJsonStripFrame({ node: frame.node, child: node.next, first: false });
                        current = langruntime.checkedIndex(child);
                        visiting = langruntime.checkedBool(true);
                    }
                }
            }
            return makeJsonValue(output);
        }
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
function jsonbScalarReady(source: JsonSyntaxSource, token: JsonReadToken, utf8: boolean): BoolValue {
    token = copyJsonReadToken(token);
    utf8 = langruntime.checkedBool(utf8);
    const following: JsonReadToken = copyJsonReadToken(jsonReadNextToken(source, token.end));
    if (following.start < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(following.start)) === "\"") {
        const decoded: TextValue = jsonReadDecodeStringContext(source, following, utf8);
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
function jsonbNumberText(source: JsonSyntaxSource, token: JsonReadToken, utf8: boolean): TextValue {
    token = copyJsonReadToken(token);
    utf8 = langruntime.checkedBool(utf8);
    const ready: BoolValue = jsonbScalarReady(source, token, utf8);
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
function jsonbParseTextContext(input: TextValue, admission: boolean, utf8: boolean): JsonbValue {
    admission = langruntime.checkedBool(admission);
    utf8 = langruntime.checkedBool(utf8);
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
                        decoded = jsonbNumberText(source, token, utf8);
                        if (decoded.kind === "Error") {
                            const error: SqlError = decoded.value;
                            return { kind: "Error", value: error };
                        }
                        if (decoded.kind === "Unknown") {
                            return { kind: "Unknown" };
                        }
                    }
                    if (admission && token.kind === jsonReadQuote) {
                        const ready: BoolValue = jsonbScalarReady(source, token, utf8);
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
export function jsonbFromTextContext(input: TextValue, utf8: boolean): JsonbValue {
    utf8 = langruntime.checkedBool(utf8);
    return jsonbParseTextContext(input, true, utf8);
}
function jsonbParseText(input: TextValue, admission: boolean): JsonbValue {
    admission = langruntime.checkedBool(admission);
    return jsonbParseTextContext(input, admission, false);
}
export function jsonbToOrderedText(input: JsonbValue): TextValue {
    input = copyJsonbValue(input);
    return jsonbRender(input, false, false);
}
export function jsonbToOrderedPrettyText(input: JsonbValue): TextValue {
    input = copyJsonbValue(input);
    return jsonbRender(input, false, true);
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
export interface JsonbArrayInputPayload {
    readonly state: number;
    readonly error: SqlError;
    readonly dimensions: ArrayDimension[];
    readonly elements: ArrayElement[];
    readonly values: JsonbInput[];
    readonly position: number;
}
export function copyJsonbArrayInputPayload(value: JsonbArrayInputPayload): JsonbArrayInputPayload {
    return { state: langruntime.checkedI32(value.state), error: value.error, dimensions: langruntime.checkedStructs(value.dimensions, copyArrayDimension), elements: langruntime.checkedStructs(value.elements, copyArrayElement), values: langruntime.checkedStructs(value.values, copyJsonbInput), position: langruntime.checkedIndex(value.position) };
}
export type JsonbArrayInputPlan = {
    readonly kind: "Value";
    readonly value: JsonbArrayInputPayload;
};
export function copyJsonbArrayInputPlan(value: JsonbArrayInputPlan): JsonbArrayInputPlan {
    switch (value.kind) {
        case "Value": return { kind: "Value", value: copyJsonbArrayInputPayload(value.value) };
    }
}
export function prepareJsonbArrayInput(input: ArrayValue): JsonbArrayInputPayload {
    const prepared: ArrayOutputPayload = prepareArrayOutput(input);
    const values: JsonbInput[] = [];
    return { state: prepared.state, error: prepared.error, dimensions: prepared.dimensions, elements: prepared.elements, values: values, position: 0 };
}
export function jsonbArrayInputContinues(input: JsonbArrayInputPayload): boolean {
    return input.state === 1 && input.position < input.elements.length;
}
export function jsonbArrayInputIsKey(input: JsonbArrayInputPayload): boolean {
    return langruntime.checkedSignedRemainder((langruntime.checkedI32(langruntime.checkedIndex(input.position))), 2) === 0;
}
export function jsonbArrayInputElement(input: JsonbArrayInputPayload): ArrayElement {
    if (input.position < input.elements.length) {
        return copyArrayElement(langruntime.indexStruct(input.elements, langruntime.checkedIndex(input.position), copyArrayElement));
    }
    return { kind: "Unknown" };
}
export function appendJsonbArrayInput(input: JsonbArrayInputPayload, value: JsonbInput): JsonbArrayInputPayload {
    let values: JsonbInput[] = input.values;
    langruntime.pushStruct(values, value, copyJsonbInput);
    return { state: input.state, error: input.error, dimensions: input.dimensions, elements: input.elements, values: values, position: langruntime.checkedAdd(input.position, 1) };
}
export function jsonbArrayInputArguments(input: JsonbArrayInputPayload): JsonbArguments {
    if (input.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: input.error };
    }
    if (input.state === 0) {
        return { kind: "Null" };
    }
    if (!(input.state === 1) || !(input.values.length === input.elements.length)) {
        return { kind: "Unknown" };
    }
    return { kind: "Values", value: { values: input.values } };
}
export function jsonbArrayFloat4Input(input: Float4Value, key: boolean): JsonbInput {
    if (key) {
        return jsonbKeyInputFromFloat4(input);
    }
    return jsonbInputFromFloat4(input);
}
export function jsonbArrayFloat8Input(input: Float8Value, key: boolean): JsonbInput {
    if (key) {
        return jsonbKeyInputFromFloat8(input);
    }
    return jsonbInputFromFloat8(input);
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
    utf8Extra: number[];
}
function copyJsonbStorageCharacters(value: JsonbStorageCharacters): JsonbStorageCharacters {
    return { nonAscii: langruntime.checkedIndices(value.nonAscii), utf8Extra: langruntime.checkedIndices(value.utf8Extra) };
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
                        if (decision.kind === "Unknown") {
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
    sizes[langruntime.checkedIndexIn(sizes, source.root)] = copyJsonbStorageSize(root);
    return sizes;
}
function jsonbStorageLayout(source: JsonbPayload): JsonbStorageSize {
    const characters: JsonbStorageCharacters = jsonbStorageCharacterIndex(source);
    const sizes: JsonbStorageSize[] = jsonbStorageExtents(source, characters, false);
    return langruntime.indexStruct(sizes, langruntime.checkedIndex(source.root), copyJsonbStorageSize);
}
export function jsonbOrderedObjectOffsets(source: JsonbPayload, utf8: boolean): NumericValue[] {
    source = copyJsonbPayload(source);
    utf8 = langruntime.checkedBool(utf8);
    const characters: JsonbStorageCharacters = jsonbStorageCharacterIndex(source);
    const sizes: JsonbStorageSize[] = jsonbStorageExtents(source, characters, utf8);
    let offsets: JsonbStorageSize[] = [];
    let result: NumericValue[] = [];
    let index: number = 0;
    while (index < source.nodes.length) {
        langruntime.pushStruct(offsets, { low: 0n, high: 0n, reachable: false }, copyJsonbStorageSize);
        langruntime.pushStruct(result, { kind: "Unknown" }, copyNumericValue);
        index = langruntime.checkedAdd(index, 1);
    }
    offsets[langruntime.checkedIndexIn(offsets, source.root)] = copyJsonbStorageSize(jsonbStorageBounds(0n, 0n));
    index = langruntime.checkedIndex(1);
    while (index < source.nodes.length) {
        const node: JsonbNode = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(index), copyJsonbNode);
        const offset: JsonbStorageSize = copyJsonbStorageSize(langruntime.indexStruct(offsets, langruntime.checkedIndex(index), copyJsonbStorageSize));
        if (offset.reachable) {
            if (node.kind === 6 && offset.low === offset.high) {
                result[langruntime.checkedIndexIn(result, index)] = { kind: "Value", value: textSignedNumber(offset.low) };
            }
            if (node.kind >= 5) {
                let header: bigint = 4n;
                let keys: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageBounds(0n, 0n));
                let nonempty: number = 0;
                let unicode: boolean = false;
                let child: number = node.child;
                while (child > 0) {
                    header = langruntime.checkedI64(langruntime.checkedI64Add(header, 4n));
                    if (node.kind === 6) {
                        header = langruntime.checkedI64(langruntime.checkedI64Add(header, 4n));
                        const entry: JsonbNode = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonbNode);
                        if (entry.keyEnd > entry.keyStart) {
                            nonempty = langruntime.checkedAdd(nonempty, 1);
                        }
                        const key: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageSpan(characters, entry.keyStart, entry.keyEnd, utf8));
                        if (!(key.high === key.low)) {
                            unicode = langruntime.checkedBool(true);
                        }
                        keys = copyJsonbStorageSize(jsonbStorageAppend(keys, key, false, true));
                    }
                    child = langruntime.checkedIndex(langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonbNode).next);
                }
                const ordered: boolean = utf8 || unicode === false || nonempty <= 1;
                let current: JsonbStorageSize = copyJsonbStorageSize(jsonbStorageBounds(langruntime.checkedI64Add(header, keys.low), langruntime.checkedI64Add(header, keys.high)));
                child = langruntime.checkedIndex(node.child);
                while (child > 0) {
                    const entry: JsonbNode = langruntime.indexStruct(source.nodes, langruntime.checkedIndex(child), copyJsonbNode);
                    const aligned: boolean = entry.kind === 3 || entry.kind >= 5;
                    let begin: JsonbStorageSize = copyJsonbStorageSize(current);
                    if (aligned) {
                        if (ordered) {
                            begin = copyJsonbStorageSize(jsonbStorageBounds(jsonbStorageAligned(current.low), jsonbStorageAligned(current.high)));
                        }
                        else {
                            begin = copyJsonbStorageSize(jsonbStorageBounds(current.low, langruntime.checkedI64Add(current.high, 3n)));
                        }
                    }
                    if (ordered) {
                        offsets[langruntime.checkedIndexIn(offsets, child)] = copyJsonbStorageSize(jsonbStorageBounds(langruntime.checkedI64Add(offset.low, begin.low), langruntime.checkedI64Add(offset.high, begin.high)));
                    }
                    else {
                        offsets[langruntime.checkedIndexIn(offsets, child)] = copyJsonbStorageSize(jsonbStorageBounds(langruntime.checkedI64Add(langruntime.checkedI64Add(offset.low, header), keys.low), langruntime.checkedI64Add(offset.high, langruntime.indexStruct(sizes, langruntime.checkedIndex(index), copyJsonbStorageSize).high)));
                    }
                    current = copyJsonbStorageSize(jsonbStorageAppend(current, langruntime.indexStruct(sizes, langruntime.checkedIndex(child), copyJsonbStorageSize), aligned, ordered));
                    child = langruntime.checkedIndex(entry.next);
                }
            }
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return result;
}
export function jsonbStorageAdmission(source: JsonbPayload): BoolValue {
    source = copyJsonbPayload(source);
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
export type ArrayElement = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Int2";
    readonly value: number;
} | {
    readonly kind: "Int4";
    readonly value: number;
} | {
    readonly kind: "Int8";
    readonly value: bigint;
} | {
    readonly kind: "Timestamp";
    readonly value: bigint;
} | {
    readonly kind: "Timestamptz";
    readonly value: bigint;
} | {
    readonly kind: "Enum";
    readonly value: EnumPayload;
} | {
    readonly kind: "Date";
    readonly value: number;
} | {
    readonly kind: "Text";
    readonly value: string;
} | {
    readonly kind: "Bool";
    readonly value: boolean;
} | {
    readonly kind: "Numeric";
    readonly value: string;
} | {
    readonly kind: "Json";
    readonly value: JsonPayload;
} | {
    readonly kind: "Jsonb";
    readonly value: JsonbPayload;
} | {
    readonly kind: "Network";
    readonly value: NetworkAddress;
} | {
    readonly kind: "Bit";
    readonly value: string;
} | {
    readonly kind: "Bytea";
    readonly value: string;
} | {
    readonly kind: "Macaddr";
    readonly value: MacAddress;
} | {
    readonly kind: "Macaddr8";
    readonly value: MacAddress;
} | {
    readonly kind: "Uuid";
    readonly value: Uuid;
} | {
    readonly kind: "Float4";
    readonly value: number;
} | {
    readonly kind: "Float8";
    readonly value: bigint;
} | {
    readonly kind: "Time";
    readonly value: bigint;
} | {
    readonly kind: "Timetz";
    readonly value: TimetzPayload;
} | {
    readonly kind: "Interval";
    readonly value: IntervalPayload;
} | {
    readonly kind: "Point";
    readonly value: PointPayload;
} | {
    readonly kind: "Line";
    readonly value: LinePayload;
} | {
    readonly kind: "Lseg";
    readonly value: LsegPayload;
} | {
    readonly kind: "Box";
    readonly value: BoxPayload;
} | {
    readonly kind: "Path";
    readonly value: PathPayload;
} | {
    readonly kind: "Polygon";
    readonly value: PolygonPayload;
} | {
    readonly kind: "Circle";
    readonly value: CirclePayload;
} | {
    readonly kind: "Money";
    readonly value: bigint;
} | {
    readonly kind: "InternalChar";
    readonly value: number;
} | {
    readonly kind: "Oid";
    readonly value: bigint;
} | {
    readonly kind: "Xid";
    readonly value: bigint;
} | {
    readonly kind: "Cid";
    readonly value: bigint;
} | {
    readonly kind: "Snapshot";
    readonly value: SnapshotPayload;
} | {
    readonly kind: "Xid8";
    readonly value: bigint;
} | {
    readonly kind: "PgLsn";
    readonly value: bigint;
} | {
    readonly kind: "Tid";
    readonly value: bigint;
} | {
    readonly kind: "Jsonpath";
    readonly value: JsonpathPayload;
} | {
    readonly kind: "JsonpathStoredText";
    readonly value: string;
} | {
    readonly kind: "Array";
    readonly value: ArrayPayload;
} | {
    readonly kind: "Float4UnspecifiedNan";
} | {
    readonly kind: "Float8UnspecifiedNan";
} | {
    readonly kind: "ByteaUnspecified";
    readonly value: number;
} | {
    readonly kind: "BoxNonNull";
} | {
    readonly kind: "Range";
    readonly value: RangePayload;
} | {
    readonly kind: "Multirange";
    readonly value: MultirangePayload;
};
export function copyArrayElement(value: ArrayElement): ArrayElement {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Error": return { kind: "Error", value: value.value };
        case "Int2": return { kind: "Int2", value: langruntime.checkedI32(value.value) };
        case "Int4": return { kind: "Int4", value: langruntime.checkedI32(value.value) };
        case "Int8": return { kind: "Int8", value: langruntime.checkedI64(value.value) };
        case "Timestamp": return { kind: "Timestamp", value: langruntime.checkedI64(value.value) };
        case "Timestamptz": return { kind: "Timestamptz", value: langruntime.checkedI64(value.value) };
        case "Enum": return { kind: "Enum", value: value.value };
        case "Date": return { kind: "Date", value: langruntime.checkedI32(value.value) };
        case "Text": return { kind: "Text", value: langruntime.checkedString(value.value) };
        case "Bool": return { kind: "Bool", value: langruntime.checkedBool(value.value) };
        case "Numeric": return { kind: "Numeric", value: langruntime.checkedString(value.value) };
        case "Json": return { kind: "Json", value: value.value };
        case "Jsonb": return { kind: "Jsonb", value: copyJsonbPayload(value.value) };
        case "Network": return { kind: "Network", value: value.value };
        case "Bit": return { kind: "Bit", value: langruntime.checkedString(value.value) };
        case "Bytea": return { kind: "Bytea", value: langruntime.checkedString(value.value) };
        case "Macaddr": return { kind: "Macaddr", value: value.value };
        case "Macaddr8": return { kind: "Macaddr8", value: value.value };
        case "Uuid": return { kind: "Uuid", value: value.value };
        case "Float4": return { kind: "Float4", value: langruntime.checkedI32(value.value) };
        case "Float8": return { kind: "Float8", value: langruntime.checkedI64(value.value) };
        case "Time": return { kind: "Time", value: langruntime.checkedI64(value.value) };
        case "Timetz": return { kind: "Timetz", value: value.value };
        case "Interval": return { kind: "Interval", value: value.value };
        case "Point": return { kind: "Point", value: value.value };
        case "Line": return { kind: "Line", value: value.value };
        case "Lseg": return { kind: "Lseg", value: value.value };
        case "Box": return { kind: "Box", value: value.value };
        case "Path": return { kind: "Path", value: copyPathPayload(value.value) };
        case "Polygon": return { kind: "Polygon", value: copyPolygonPayload(value.value) };
        case "Circle": return { kind: "Circle", value: value.value };
        case "Money": return { kind: "Money", value: langruntime.checkedI64(value.value) };
        case "InternalChar": return { kind: "InternalChar", value: langruntime.checkedI32(value.value) };
        case "Oid": return { kind: "Oid", value: langruntime.checkedI64(value.value) };
        case "Xid": return { kind: "Xid", value: langruntime.checkedI64(value.value) };
        case "Cid": return { kind: "Cid", value: langruntime.checkedI64(value.value) };
        case "Snapshot": return { kind: "Snapshot", value: copySnapshotPayload(value.value) };
        case "Xid8": return { kind: "Xid8", value: langruntime.checkedI64(value.value) };
        case "PgLsn": return { kind: "PgLsn", value: langruntime.checkedI64(value.value) };
        case "Tid": return { kind: "Tid", value: langruntime.checkedI64(value.value) };
        case "Jsonpath": return { kind: "Jsonpath", value: copyJsonpathPayload(value.value) };
        case "JsonpathStoredText": return { kind: "JsonpathStoredText", value: langruntime.checkedString(value.value) };
        case "Array": return { kind: "Array", value: copyArrayPayload(value.value) };
        case "Float4UnspecifiedNan": return { kind: "Float4UnspecifiedNan" };
        case "Float8UnspecifiedNan": return { kind: "Float8UnspecifiedNan" };
        case "ByteaUnspecified": return { kind: "ByteaUnspecified", value: langruntime.checkedI32(value.value) };
        case "BoxNonNull": return { kind: "BoxNonNull" };
        case "Range": return { kind: "Range", value: copyRangePayload(value.value) };
        case "Multirange": return { kind: "Multirange", value: copyMultirangePayload(value.value) };
    }
}
export function arrayElementFamily(input: ArrayElement): number {
    input = copyArrayElement(input);
    if (input.kind === "Multirange") {
        return 43;
    }
    if (input.kind === "Range") {
        return 42;
    }
    if (input.kind === "Array") {
        return 41;
    }
    if (input.kind === "Int2") {
        return 1;
    }
    if (input.kind === "Int4") {
        return 2;
    }
    if (input.kind === "Int8") {
        return 3;
    }
    if (input.kind === "Timestamp") {
        return 4;
    }
    if (input.kind === "Timestamptz") {
        return 5;
    }
    if (input.kind === "Enum") {
        return 6;
    }
    if (input.kind === "Date") {
        return 7;
    }
    if (input.kind === "Text") {
        return 8;
    }
    if (input.kind === "Bool") {
        return 9;
    }
    if (input.kind === "Numeric") {
        return 10;
    }
    if (input.kind === "Json") {
        return 11;
    }
    if (input.kind === "Jsonb") {
        return 12;
    }
    if (input.kind === "Network") {
        return 13;
    }
    if (input.kind === "Bit") {
        return 14;
    }
    if (input.kind === "Bytea") {
        return 15;
    }
    if (input.kind === "Macaddr") {
        return 16;
    }
    if (input.kind === "Macaddr8") {
        return 17;
    }
    if (input.kind === "Uuid") {
        return 18;
    }
    if (input.kind === "Float4") {
        return 19;
    }
    if (input.kind === "Float8") {
        return 20;
    }
    if (input.kind === "Time") {
        return 21;
    }
    if (input.kind === "Timetz") {
        return 22;
    }
    if (input.kind === "Interval") {
        return 23;
    }
    if (input.kind === "Point") {
        return 24;
    }
    if (input.kind === "Line") {
        return 25;
    }
    if (input.kind === "Lseg") {
        return 26;
    }
    if (input.kind === "Box") {
        return 27;
    }
    if (input.kind === "Path") {
        return 28;
    }
    if (input.kind === "Polygon") {
        return 29;
    }
    if (input.kind === "Circle") {
        return 30;
    }
    if (input.kind === "Money") {
        return 31;
    }
    if (input.kind === "InternalChar") {
        return 32;
    }
    if (input.kind === "Oid") {
        return 33;
    }
    if (input.kind === "Xid") {
        return 34;
    }
    if (input.kind === "Cid") {
        return 35;
    }
    if (input.kind === "Snapshot") {
        return 36;
    }
    if (input.kind === "Xid8") {
        return 37;
    }
    if (input.kind === "PgLsn") {
        return 38;
    }
    if (input.kind === "Tid") {
        return 39;
    }
    if (input.kind === "JsonpathStoredText") {
        return 40;
    }
    if (input.kind === "Jsonpath") {
        return 40;
    }
    if (input.kind === "Float4UnspecifiedNan") {
        return 19;
    }
    if (input.kind === "Float8UnspecifiedNan") {
        return 20;
    }
    if (input.kind === "ByteaUnspecified") {
        return 15;
    }
    if (input.kind === "BoxNonNull") {
        return 27;
    }
    return 0;
}
export function arrayElementFromArray(input: ArrayValue): ArrayElement {
    input = copyArrayValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        return { kind: "Array", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToArray(input: ArrayElement): ArrayValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Array") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromInt2(input: Int2Value): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Int2", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToInt2(input: ArrayElement): Int2Value {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Int2") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromInt4(input: Int4Value): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Int4", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToInt4(input: ArrayElement): Int4Value {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Int4") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromInt8(input: Int8Value): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Int8", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToInt8(input: ArrayElement): Int8Value {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Int8") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromTimestamp(input: TimestampValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Timestamp", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToTimestamp(input: ArrayElement): TimestampValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Timestamp") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromTimestamptz(input: TimestamptzValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Timestamptz", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToTimestamptz(input: ArrayElement): TimestamptzValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Timestamptz") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromEnum(input: EnumValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: EnumPayload = input.value;
        return { kind: "Enum", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToEnum(input: ArrayElement): EnumValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Enum") {
        const value: EnumPayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromDate(input: DateValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Date", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToDate(input: ArrayElement): DateValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Date") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromText(input: TextValue): ArrayElement {
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
export function arrayElementToText(input: ArrayElement): TextValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Text") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromBool(input: BoolValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: boolean = langruntime.checkedBool(input.value);
        return { kind: "Bool", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToBool(input: ArrayElement): BoolValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Bool") {
        const value: boolean = langruntime.checkedBool(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromNumeric(input: NumericValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Numeric", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToNumeric(input: ArrayElement): NumericValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Numeric") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromJson(input: JsonValue): ArrayElement {
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
export function arrayElementToJson(input: ArrayElement): JsonValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Json") {
        const value: JsonPayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromJsonb(input: JsonbValue): ArrayElement {
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
export function arrayElementToJsonb(input: ArrayElement): JsonbValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Jsonb") {
        const value: JsonbPayload = copyJsonbPayload(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromNetwork(input: NetworkValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: NetworkAddress = input.value;
        return { kind: "Network", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToNetwork(input: ArrayElement): NetworkValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Network") {
        const value: NetworkAddress = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromBit(input: BitValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Bit", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToBit(input: ArrayElement): BitValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Bit") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromBytea(input: ByteaValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Bytea", value: value };
    }
    if (input.kind === "Unspecified") {
        const length: number = langruntime.checkedI32(input.value);
        return { kind: "ByteaUnspecified", value: length };
    }
    return { kind: "Unknown" };
}
export function arrayElementToBytea(input: ArrayElement): ByteaValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Bytea") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "Value", value: value };
    }
    if (input.kind === "ByteaUnspecified") {
        const length: number = langruntime.checkedI32(input.value);
        return { kind: "Unspecified", value: length };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromMacaddr(input: MacaddrValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: MacAddress = input.value;
        return { kind: "Macaddr", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToMacaddr(input: ArrayElement): MacaddrValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Macaddr") {
        const value: MacAddress = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromMacaddr8(input: Macaddr8Value): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: MacAddress = input.value;
        return { kind: "Macaddr8", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToMacaddr8(input: ArrayElement): Macaddr8Value {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Macaddr8") {
        const value: MacAddress = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromUuid(input: UuidValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: Uuid = input.value;
        return { kind: "Uuid", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToUuid(input: ArrayElement): UuidValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Uuid") {
        const value: Uuid = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromFloat4(input: Float4Value): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Float4", value: value };
    }
    if (input.kind === "UnspecifiedNan") {
        return { kind: "Float4UnspecifiedNan" };
    }
    return { kind: "Unknown" };
}
export function arrayElementToFloat4(input: ArrayElement): Float4Value {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Float4") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Value", value: value };
    }
    if (input.kind === "Float4UnspecifiedNan") {
        return { kind: "UnspecifiedNan" };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromFloat8(input: Float8Value): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Float8", value: value };
    }
    if (input.kind === "UnspecifiedNan") {
        return { kind: "Float8UnspecifiedNan" };
    }
    return { kind: "Unknown" };
}
export function arrayElementToFloat8(input: ArrayElement): Float8Value {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Float8") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    if (input.kind === "Float8UnspecifiedNan") {
        return { kind: "UnspecifiedNan" };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromTime(input: TimeValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Time", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToTime(input: ArrayElement): TimeValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Time") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromTimetz(input: TimetzValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: TimetzPayload = input.value;
        return { kind: "Timetz", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToTimetz(input: ArrayElement): TimetzValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Timetz") {
        const value: TimetzPayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromInterval(input: IntervalValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: IntervalPayload = input.value;
        return { kind: "Interval", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToInterval(input: ArrayElement): IntervalValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Interval") {
        const value: IntervalPayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromPoint(input: PointValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: PointPayload = input.value;
        return { kind: "Point", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToPoint(input: ArrayElement): PointValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Point") {
        const value: PointPayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromLine(input: LineValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: LinePayload = input.value;
        return { kind: "Line", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToLine(input: ArrayElement): LineValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Line") {
        const value: LinePayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromLseg(input: LsegValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: LsegPayload = input.value;
        return { kind: "Lseg", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToLseg(input: ArrayElement): LsegValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Lseg") {
        const value: LsegPayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromBox(input: BoxValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: BoxPayload = input.value;
        return { kind: "Box", value: value };
    }
    if (input.kind === "NonNull") {
        return { kind: "BoxNonNull" };
    }
    return { kind: "Unknown" };
}
export function arrayElementToBox(input: ArrayElement): BoxValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Box") {
        const value: BoxPayload = input.value;
        return { kind: "Value", value: value };
    }
    if (input.kind === "BoxNonNull") {
        return { kind: "NonNull" };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromPath(input: PathValue): ArrayElement {
    input = copyPathValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: PathPayload = copyPathPayload(input.value);
        return { kind: "Path", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToPath(input: ArrayElement): PathValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Path") {
        const value: PathPayload = copyPathPayload(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromPolygon(input: PolygonValue): ArrayElement {
    input = copyPolygonValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: PolygonPayload = copyPolygonPayload(input.value);
        return { kind: "Polygon", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToPolygon(input: ArrayElement): PolygonValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Polygon") {
        const value: PolygonPayload = copyPolygonPayload(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromCircle(input: CircleValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: CirclePayload = input.value;
        return { kind: "Circle", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToCircle(input: ArrayElement): CircleValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Circle") {
        const value: CirclePayload = input.value;
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromMoney(input: MoneyValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Money", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToMoney(input: ArrayElement): MoneyValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Money") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromInternalChar(input: InternalCharValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "InternalChar", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToInternalChar(input: ArrayElement): InternalCharValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "InternalChar") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromOid(input: OidValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Oid", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToOid(input: ArrayElement): OidValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Oid") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromXid(input: XidValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Xid", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToXid(input: ArrayElement): XidValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Xid") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromCid(input: CidValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Cid", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToCid(input: ArrayElement): CidValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Cid") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromSnapshot(input: SnapshotValue): ArrayElement {
    input = copySnapshotValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: SnapshotPayload = copySnapshotPayload(input.value);
        return { kind: "Snapshot", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToSnapshot(input: ArrayElement): SnapshotValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Snapshot") {
        const value: SnapshotPayload = copySnapshotPayload(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromXid8(input: Xid8Value): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Xid8", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToXid8(input: ArrayElement): Xid8Value {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Xid8") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromPgLsn(input: PgLsnValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "PgLsn", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToPgLsn(input: ArrayElement): PgLsnValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "PgLsn") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromTid(input: TidValue): ArrayElement {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Tid", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToTid(input: ArrayElement): TidValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Tid") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromJsonpath(input: JsonpathValue): ArrayElement {
    input = copyJsonpathValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "StoredText") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "JsonpathStoredText", value: value };
    }
    if (input.kind === "Value") {
        const value: JsonpathPayload = copyJsonpathPayload(input.value);
        return { kind: "Jsonpath", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToJsonpath(input: ArrayElement): JsonpathValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "JsonpathStoredText") {
        const value: string = langruntime.checkedString(input.value);
        return { kind: "StoredText", value: value };
    }
    if (input.kind === "Jsonpath") {
        const value: JsonpathPayload = copyJsonpathPayload(input.value);
        return { kind: "Value", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementFromRange(input: RangeValue): ArrayElement {
    input = copyRangeValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: RangePayload = copyRangePayload(input.value);
        return { kind: "Range", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToRange(input: ArrayElement): RangeValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Range") {
        const value: RangePayload = copyRangePayload(input.value);
        return makeCoercedRangeValue(value);
    }
    return { kind: "Unknown" };
}
export function arrayElementFromMultirange(input: MultirangeValue): ArrayElement {
    input = copyMultirangeValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: MultirangePayload = copyMultirangePayload(input.value);
        return { kind: "Multirange", value: value };
    }
    return { kind: "Unknown" };
}
export function arrayElementToMultirange(input: ArrayElement): MultirangeValue {
    input = copyArrayElement(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Multirange") {
        const value: MultirangePayload = copyMultirangePayload(input.value);
        return makeCoercedMultirangeValue(value);
    }
    return { kind: "Unknown" };
}
export interface RangeSupport {
    readonly comparison: number;
    readonly canonical: number;
}
export function makeRangeSupport(comparison: number, canonical: number): RangeSupport {
    comparison = langruntime.checkedI32(comparison);
    canonical = langruntime.checkedI32(canonical);
    return { comparison: comparison, canonical: canonical };
}
export interface RangeTextPayload {
    empty: boolean;
    lowerPresent: boolean;
    upperPresent: boolean;
    lower: string;
    upper: string;
    flags: string;
}
export function copyRangeTextPayload(value: RangeTextPayload): RangeTextPayload {
    return { empty: langruntime.checkedBool(value.empty), lowerPresent: langruntime.checkedBool(value.lowerPresent), upperPresent: langruntime.checkedBool(value.upperPresent), lower: langruntime.checkedString(value.lower), upper: langruntime.checkedString(value.upper), flags: langruntime.checkedString(value.flags) };
}
export type RangeTextPlan = {
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Error";
    value: SqlError;
} | {
    kind: "Value";
    value: RangeTextPayload;
};
export function copyRangeTextPlan(value: RangeTextPlan): RangeTextPlan {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Error": return { kind: "Error", value: value.value };
        case "Value": return { kind: "Value", value: copyRangeTextPayload(value.value) };
    }
}
export function rangeUnknownSupport(): RangeSupport {
    return { comparison: 0, canonical: 0 };
}
export function rangeBuiltinSupport(typeName: string, elementType: string, kind: number): RangeSupport {
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    kind = langruntime.checkedI32(kind);
    if (typeName === "pg_catalog.int4range" && elementType === "pg_catalog.int4" && kind === 2) {
        return { comparison: 2, canonical: 2 };
    }
    if (typeName === "pg_catalog.int8range" && elementType === "pg_catalog.int8" && kind === 3) {
        return { comparison: 3, canonical: 3 };
    }
    if (typeName === "pg_catalog.daterange" && elementType === "pg_catalog.date" && kind === 7) {
        return { comparison: 7, canonical: 7 };
    }
    if (typeName === "pg_catalog.numrange" && elementType === "pg_catalog.\"numeric\"" && kind === 10) {
        return { comparison: 10, canonical: 1 };
    }
    if (typeName === "pg_catalog.tsrange" && elementType === "pg_catalog.\"timestamp\"" && kind === 4) {
        return { comparison: 4, canonical: 1 };
    }
    if (typeName === "pg_catalog.tstzrange" && elementType === "pg_catalog.timestamptz" && kind === 5) {
        return { comparison: 5, canonical: 1 };
    }
    return rangeUnknownSupport();
}
export function rangeSupportEqual(left: RangeSupport, right: RangeSupport): boolean {
    return left.comparison === right.comparison && left.canonical === right.canonical;
}
export function rangeSupportValid(input: RangeSupport, kind: number): boolean {
    kind = langruntime.checkedI32(kind);
    const comparison: boolean = input.comparison === 0 || (kind === 12 && input.comparison === 120) || (kind === 13 && rangeSupportIsCidr(input)) || (kind === 33 && rangeOidAliasMode(input, "") > 0) || (kind === 8 && (input.comparison === 108 || input.comparison === 200 || input.comparison === 208)) || (input.comparison === kind && (kind === 2 || kind === 3 || kind === 4 || kind === 5 || kind === 7 || kind === 8 || kind === 10 || kind === 1 || kind === 9 || kind === 12 || kind === 13 || kind === 14 || kind === 15 || kind === 16 || kind === 17 || kind === 18 || kind === 19 || kind === 20 || kind === 21 || kind === 22 || kind === 23 || kind === 31 || kind === 32 || kind === 33 || kind === 37 || kind === 38 || kind === 39));
    const canonical: boolean = input.canonical === 0 || input.canonical === 1 || (input.canonical === kind && (kind === 2 || kind === 3 || kind === 7));
    return comparison && canonical;
}
export function rangeSupportIsCidr(input: RangeSupport): boolean {
    return input.comparison === 100 || input.comparison === 113;
}
export function rangeSupportJsonbUtf8(input: RangeSupport): boolean {
    return input.comparison === 12 || input.comparison === 120;
}
export function rangeOidAliasMode(input: RangeSupport, elementType: string): number {
    elementType = langruntime.checkedString(elementType);
    if (input.comparison >= 331 && input.comparison <= 335) {
        return langruntime.checkedSignedSubtract(input.comparison, 330);
    }
    if (input.comparison >= 301 && input.comparison <= 305) {
        return langruntime.checkedSignedSubtract(input.comparison, 300);
    }
    if (elementType === "pg_catalog.regoper") {
        return 2;
    }
    if (elementType === "pg_catalog.regoperator") {
        return 4;
    }
    if (elementType === "pg_catalog.regprocedure") {
        return 3;
    }
    if (elementType === "pg_catalog.regtype") {
        return 5;
    }
    if (elementType === "pg_catalog.regclass" || elementType === "pg_catalog.regcollation" || elementType === "pg_catalog.regconfig" || elementType === "pg_catalog.regdictionary" || elementType === "pg_catalog.regnamespace" || elementType === "pg_catalog.regproc" || elementType === "pg_catalog.regrole") {
        return 1;
    }
    return 0;
}
export interface RangePayload {
    readonly typeName: string;
    readonly elementType: string;
    readonly elementKind: number;
    readonly support: RangeSupport;
    readonly empty: boolean;
    readonly lowerInclusive: boolean;
    readonly upperInclusive: boolean;
    readonly bounds: ArrayElement[];
}
export function copyRangePayload(value: RangePayload): RangePayload {
    return { typeName: langruntime.checkedString(value.typeName), elementType: langruntime.checkedString(value.elementType), elementKind: langruntime.checkedI32(value.elementKind), support: value.support, empty: langruntime.checkedBool(value.empty), lowerInclusive: langruntime.checkedBool(value.lowerInclusive), upperInclusive: langruntime.checkedBool(value.upperInclusive), bounds: langruntime.checkedStructs(value.bounds, copyArrayElement) };
}
export type RangeValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Value";
    readonly value: RangePayload;
};
export function copyRangeValue(value: RangeValue): RangeValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Error": return { kind: "Error", value: value.value };
        case "Value": return { kind: "Value", value: copyRangePayload(value.value) };
    }
}
export function rangeUnknown(): RangeValue {
    return { kind: "Unknown" };
}
export function rangeNull(): RangeValue {
    return { kind: "Null" };
}
function rangePayloadWithSupport(input: RangePayload, support: RangeSupport): RangePayload {
    input = copyRangePayload(input);
    return { typeName: input.typeName, elementType: input.elementType, elementKind: input.elementKind, support: support, empty: input.empty, lowerInclusive: input.lowerInclusive, upperInclusive: input.upperInclusive, bounds: input.bounds };
}
function rangeBoundWordValid(value: number): boolean {
    value = langruntime.checkedI32(value);
    return value >= 0 && value <= 65535;
}
function rangeBoundValueValid(input: ArrayElement, cidr: boolean): boolean {
    input = copyArrayElement(input);
    cidr = langruntime.checkedBool(cidr);
    if (input.kind === "Int2") {
        const value: number = langruntime.checkedI32(input.value);
        return !(equalInt2Value(makeInt2Value(value), { kind: "Unknown" }));
    }
    if (input.kind === "Bit") {
        const value: string = langruntime.checkedString(input.value);
        return !(equalBitValue(makeBitValue(value), { kind: "Unknown" }));
    }
    if (input.kind === "Bytea") {
        const value: string = langruntime.checkedString(input.value);
        const parsed: ByteaValue = makeByteaValue(value);
        if (parsed.kind === "Value") {
            const canonical: string = langruntime.checkedString(parsed.value);
            return canonical === value;
        }
        return false;
    }
    if (input.kind === "Time") {
        const value: bigint = langruntime.checkedI64(input.value);
        return !(equalTimeValue(makeTimeValue(value), { kind: "Unknown" }));
    }
    if (input.kind === "Timetz") {
        const value: TimetzPayload = input.value;
        return !(equalTimetzValue(makeTimetzValue(value.time, value.zone), { kind: "Unknown" }));
    }
    if (input.kind === "InternalChar") {
        const value: number = langruntime.checkedI32(input.value);
        return !(equalInternalCharValue(makeInternalCharValue(value), { kind: "Unknown" }));
    }
    if (input.kind === "Oid") {
        const value: bigint = langruntime.checkedI64(input.value);
        return !(equalOidValue(makeOidValue(value), { kind: "Unknown" }));
    }
    if (input.kind === "Tid") {
        const value: bigint = langruntime.checkedI64(input.value);
        return !(equalTidValue(makeTidValue(value), { kind: "Unknown" }));
    }
    if (input.kind === "Network") {
        const value: NetworkAddress = input.value;
        if (!(value.family === 4) && !(value.family === 6)) {
            return false;
        }
        if (value.prefix < 0 || value.prefix > 128) {
            return false;
        }
        if (value.family === 4) {
            if (value.prefix > 32 || !(value.word2 === 0) || !(value.word3 === 0) || !(value.word4 === 0) || !(value.word5 === 0) || !(value.word6 === 0) || !(value.word7 === 0)) {
                return false;
            }
        }
        return (cidr === false || networkCidrHostBitsZero(value)) && rangeBoundWordValid(value.word0) && rangeBoundWordValid(value.word1) && rangeBoundWordValid(value.word2) && rangeBoundWordValid(value.word3) && rangeBoundWordValid(value.word4) && rangeBoundWordValid(value.word5) && rangeBoundWordValid(value.word6) && rangeBoundWordValid(value.word7);
    }
    if (input.kind === "Macaddr") {
        const value: MacAddress = input.value;
        return value.word3 === 0 && rangeBoundWordValid(value.word0) && rangeBoundWordValid(value.word1) && rangeBoundWordValid(value.word2);
    }
    if (input.kind === "Macaddr8") {
        const value: MacAddress = input.value;
        return rangeBoundWordValid(value.word0) && rangeBoundWordValid(value.word1) && rangeBoundWordValid(value.word2) && rangeBoundWordValid(value.word3);
    }
    if (input.kind === "Uuid") {
        const value: Uuid = input.value;
        return rangeBoundWordValid(value.word0) && rangeBoundWordValid(value.word1) && rangeBoundWordValid(value.word2) && rangeBoundWordValid(value.word3) && rangeBoundWordValid(value.word4) && rangeBoundWordValid(value.word5) && rangeBoundWordValid(value.word6) && rangeBoundWordValid(value.word7);
    }
    return true;
}
export function makeCoercedRangeValue(input: RangePayload): RangeValue {
    input = copyRangePayload(input);
    let value: RangePayload = input;
    let support: RangeSupport = value.support;
    if (value.typeName === "" || value.elementType === "" || value.elementKind < 1) {
        return { kind: "Unknown" };
    }
    if (rangeSupportEqual(support, rangeUnknownSupport())) {
        support = rangeBuiltinSupport(value.typeName, value.elementType, value.elementKind);
    }
    if (rangeSupportValid(support, value.elementKind) === false) {
        return { kind: "Unknown" };
    }
    const expected: RangeSupport = rangeBuiltinSupport(value.typeName, value.elementType, value.elementKind);
    if (rangeSupportEqual(expected, rangeUnknownSupport()) === false && rangeSupportEqual(support, expected) === false) {
        return { kind: "Unknown" };
    }
    if (value.empty) {
        if (!(value.bounds.length === 0) || value.lowerInclusive || value.upperInclusive) {
            return { kind: "Unknown" };
        }
        return { kind: "Value", value: rangePayloadWithSupport(value, support) };
    }
    if (!(value.bounds.length === 2)) {
        return { kind: "Unknown" };
    }
    let index: number = 0;
    while (index < value.bounds.length) {
        const bound: ArrayElement = copyArrayElement(langruntime.indexStruct(value.bounds, langruntime.checkedIndex(index), copyArrayElement));
        if (bound.kind === "Error") {
            const error: SqlError = bound.value;
            return { kind: "Error", value: error };
        }
        const kind: number = arrayElementFamily(copyArrayElement(bound));
        if (!(kind === 0) && !(kind === value.elementKind)) {
            return { kind: "Unknown" };
        }
        if (rangeBoundValueValid(copyArrayElement(bound), rangeSupportIsCidr(support) || value.elementType === "pg_catalog.cidr") === false) {
            return { kind: "Unknown" };
        }
        if (bound.kind === "Null") {
            if ((index === 0 && value.lowerInclusive) || (index === 1 && value.upperInclusive)) {
                return { kind: "Unknown" };
            }
        }
        if (bound.kind === "Jsonb") {
            const payload: JsonbPayload = copyJsonbPayload(bound.value);
            const normalized: JsonbValue = jsonbFromCoercedValue({ kind: "Value", value: payload });
            let known: boolean = false;
            if (normalized.kind === "Value") {
                const payload1: JsonbPayload = copyJsonbPayload(normalized.value);
                value.bounds[langruntime.checkedIndexIn(value.bounds, index)] = copyArrayElement({ kind: "Jsonb", value: payload1 });
                known = langruntime.checkedBool(true);
            }
            if (known === false) {
                return { kind: "Unknown" };
            }
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { kind: "Value", value: rangePayloadWithSupport(value, support) };
}
export function rangeFromCoercedBounds(typeName: string, elementType: string, elementKind: number, empty: boolean, lowerInclusive: boolean, upperInclusive: boolean, lower: ArrayElement, upper: ArrayElement): RangeValue {
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    empty = langruntime.checkedBool(empty);
    lowerInclusive = langruntime.checkedBool(lowerInclusive);
    upperInclusive = langruntime.checkedBool(upperInclusive);
    lower = copyArrayElement(lower);
    upper = copyArrayElement(upper);
    const support: RangeSupport = rangeBuiltinSupport(typeName, elementType, elementKind);
    return rangeFromProfiledBounds(typeName, elementType, elementKind, empty, lowerInclusive, upperInclusive, lower, upper, support);
}
export function rangeFromProfiledBounds(typeName: string, elementType: string, elementKind: number, empty: boolean, lowerInclusive: boolean, upperInclusive: boolean, lower: ArrayElement, upper: ArrayElement, support: RangeSupport): RangeValue {
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    empty = langruntime.checkedBool(empty);
    lowerInclusive = langruntime.checkedBool(lowerInclusive);
    upperInclusive = langruntime.checkedBool(upperInclusive);
    lower = copyArrayElement(lower);
    upper = copyArrayElement(upper);
    let bounds: ArrayElement[] = [];
    if (empty === false) {
        langruntime.pushStruct(bounds, lower, copyArrayElement);
        langruntime.pushStruct(bounds, upper, copyArrayElement);
    }
    return makeCoercedRangeValue({ typeName: typeName, elementType: elementType, elementKind: elementKind, support: support, empty: empty, lowerInclusive: lowerInclusive, upperInclusive: upperInclusive, bounds: bounds });
}
export function rangeRequireType(input: RangeValue, typeName: string, elementType: string, elementKind: number): RangeValue {
    input = copyRangeValue(input);
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    if (input.kind === "Value") {
        const value: RangePayload = copyRangePayload(input.value);
        if (!(value.typeName === typeName) || !(value.elementType === elementType) || !(value.elementKind === elementKind)) {
            return { kind: "Unknown" };
        }
        const expected: RangeSupport = rangeBuiltinSupport(typeName, elementType, elementKind);
        if (rangeSupportEqual(expected, rangeUnknownSupport()) === false && rangeSupportEqual(value.support, expected) === false) {
            return { kind: "Unknown" };
        }
        return { kind: "Value", value: value };
    }
    return input;
}
export function rangeFromCoercedProfile(input: RangeValue, typeName: string, elementType: string, elementKind: number, comparison: number, canonical: number): RangeValue {
    input = copyRangeValue(input);
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    comparison = langruntime.checkedI32(comparison);
    canonical = langruntime.checkedI32(canonical);
    if (input.kind === "Value") {
        const payload: RangePayload = copyRangePayload(input.value);
        if (!(payload.typeName === typeName) || !(payload.elementType === elementType) || !(payload.elementKind === elementKind)) {
            return { kind: "Unknown" };
        }
        const support: RangeSupport = { comparison: comparison, canonical: canonical };
        return makeCoercedRangeValue(rangePayloadWithSupport(payload, support));
    }
    return input;
}
export function rangeRequireSupport(input: RangeValue, expected: RangeSupport): RangeValue {
    input = copyRangeValue(input);
    if (input.kind === "Value") {
        const value: RangePayload = copyRangePayload(input.value);
        if (rangeSupportEqual(value.support, expected) === false) {
            return { kind: "Unknown" };
        }
        return { kind: "Value", value: value };
    }
    return input;
}
export function rangeIsNull(input: RangeValue): BoolValue {
    input = copyRangeValue(input);
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
export function rangeFromCaseGuard(input: CheckOutcome): RangeValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function rangeEmptyState(input: RangeValue): BoolValue {
    input = copyRangeValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: RangePayload = copyRangePayload(input.value);
        return { kind: "Value", value: value.empty };
    }
    return { kind: "Unknown" };
}
export function rangeBound(input: RangeValue, upper: boolean): ArrayElement {
    input = copyRangeValue(input);
    upper = langruntime.checkedBool(upper);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: RangePayload = copyRangePayload(input.value);
        if (value.empty) {
            return { kind: "Null" };
        }
        let index: number = 0;
        if (upper) {
            index = langruntime.checkedIndex(1);
        }
        return copyArrayElement(langruntime.indexStruct(value.bounds, langruntime.checkedIndex(index), copyArrayElement));
    }
    return { kind: "Unknown" };
}
export function rangeBoundFlag(input: RangeValue, upper: boolean, infinite: boolean): BoolValue {
    input = copyRangeValue(input);
    upper = langruntime.checkedBool(upper);
    infinite = langruntime.checkedBool(infinite);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: RangePayload = copyRangePayload(input.value);
        if (value.empty) {
            return { kind: "Value", value: false };
        }
        if (infinite) {
            let index: number = 0;
            if (upper) {
                index = langruntime.checkedIndex(1);
            }
            const bound: ArrayElement = copyArrayElement(langruntime.indexStruct(value.bounds, langruntime.checkedIndex(index), copyArrayElement));
            if (bound.kind === "Null") {
                return { kind: "Value", value: true };
            }
            return { kind: "Value", value: false };
        }
        if (upper) {
            return { kind: "Value", value: value.upperInclusive };
        }
        return { kind: "Value", value: value.lowerInclusive };
    }
    return { kind: "Unknown" };
}
export interface MultirangePayload {
    readonly typeName: string;
    readonly rangeType: string;
    readonly elementType: string;
    readonly elementKind: number;
    readonly support: RangeSupport;
    readonly ranges: RangeValue[];
}
export function copyMultirangePayload(value: MultirangePayload): MultirangePayload {
    return { typeName: langruntime.checkedString(value.typeName), rangeType: langruntime.checkedString(value.rangeType), elementType: langruntime.checkedString(value.elementType), elementKind: langruntime.checkedI32(value.elementKind), support: value.support, ranges: langruntime.checkedStructs(value.ranges, copyRangeValue) };
}
export type MultirangeValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Value";
    readonly value: MultirangePayload;
};
export function copyMultirangeValue(value: MultirangeValue): MultirangeValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Error": return { kind: "Error", value: value.value };
        case "Value": return { kind: "Value", value: copyMultirangePayload(value.value) };
    }
}
export interface MultirangeTextPayload {
    characters: string[];
    position: number;
    member: string;
    started: boolean;
    ranges: RangeValue[];
    state: number;
    error: SqlError;
}
export function copyMultirangeTextPayload(value: MultirangeTextPayload): MultirangeTextPayload {
    return { characters: langruntime.checkedChars(value.characters), position: langruntime.checkedIndex(value.position), member: langruntime.checkedString(value.member), started: langruntime.checkedBool(value.started), ranges: langruntime.checkedStructs(value.ranges, copyRangeValue), state: langruntime.checkedI32(value.state), error: value.error };
}
export type MultirangeTextPlan = {
    kind: "Value";
    value: MultirangeTextPayload;
};
function copyMultirangeTextPlan(value: MultirangeTextPlan): MultirangeTextPlan {
    switch (value.kind) {
        case "Value": return { kind: "Value", value: copyMultirangeTextPayload(value.value) };
    }
}
export function multirangeUnknown(): MultirangeValue {
    return { kind: "Unknown" };
}
export function multirangeNull(): MultirangeValue {
    return { kind: "Null" };
}
function multirangeComponent(input: MultirangePayload, position: number, support: RangeSupport): RangeValue {
    position = langruntime.checkedIndex(position);
    let span: RangeValue = copyRangeValue(langruntime.indexStruct(input.ranges, langruntime.checkedIndex(position), copyRangeValue));
    if (span.kind === "Value") {
        const payload: RangePayload = copyRangePayload(span.value);
        span = copyRangeValue(makeCoercedRangeValue(payload));
    }
    const typed: RangeValue = rangeRequireType(span, input.rangeType, input.elementType, input.elementKind);
    const supported: RangeValue = rangeRequireSupport(typed, support);
    if (supported.kind === "Error") {
        const error: SqlError = supported.value;
        return { kind: "Error", value: error };
    }
    if (supported.kind === "Value") {
        const payload: RangePayload = copyRangePayload(supported.value);
        if (payload.empty) {
            return { kind: "Unknown" };
        }
        return { kind: "Value", value: payload };
    }
    return { kind: "Unknown" };
}
export function makeCoercedMultirangeValue(input: MultirangePayload): MultirangeValue {
    input = copyMultirangePayload(input);
    const payload: MultirangePayload = input;
    let support: RangeSupport = payload.support;
    if (payload.typeName === "" || payload.rangeType === "" || payload.elementType === "" || payload.elementKind < 1) {
        return { kind: "Unknown" };
    }
    const expected: RangeSupport = rangeBuiltinSupport(payload.rangeType, payload.elementType, payload.elementKind);
    if (rangeSupportEqual(support, rangeUnknownSupport())) {
        support = expected;
    }
    if (rangeSupportValid(support, payload.elementKind) === false) {
        return { kind: "Unknown" };
    }
    if (rangeSupportEqual(expected, rangeUnknownSupport()) === false && rangeSupportEqual(support, expected) === false) {
        return { kind: "Unknown" };
    }
    let ranges: RangeValue[] = [];
    let index: number = 0;
    while (index < payload.ranges.length) {
        const member: RangeValue = multirangeComponent(payload, index, support);
        if (member.kind === "Error") {
            const error: SqlError = member.value;
            return { kind: "Error", value: error };
        }
        let known: boolean = false;
        if (member.kind === "Value") {
            const span: RangePayload = copyRangePayload(member.value);
            langruntime.pushStruct(ranges, { kind: "Value", value: span }, copyRangeValue);
            known = langruntime.checkedBool(true);
        }
        if (known === false) {
            return { kind: "Unknown" };
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { kind: "Value", value: { typeName: payload.typeName, rangeType: payload.rangeType, elementType: payload.elementType, elementKind: payload.elementKind, support: support, ranges: ranges } };
}
export function multirangeFromProfiledRanges(typeName: string, rangeType: string, elementType: string, elementKind: number, ranges: RangeValue[], support: RangeSupport): MultirangeValue {
    typeName = langruntime.checkedString(typeName);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    ranges = langruntime.checkedStructs(ranges, copyRangeValue);
    return makeCoercedMultirangeValue({ typeName: typeName, rangeType: rangeType, elementType: elementType, elementKind: elementKind, support: support, ranges: ranges });
}
export function multirangeFromCoercedProfile(input: MultirangeValue, typeName: string, rangeType: string, elementType: string, elementKind: number, comparison: number, canonical: number): MultirangeValue {
    input = copyMultirangeValue(input);
    typeName = langruntime.checkedString(typeName);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    comparison = langruntime.checkedI32(comparison);
    canonical = langruntime.checkedI32(canonical);
    if (input.kind === "Value") {
        const payload: MultirangePayload = copyMultirangePayload(input.value);
        if (!(payload.typeName === typeName) || !(payload.rangeType === rangeType) || !(payload.elementType === elementType) || !(payload.elementKind === elementKind)) {
            return { kind: "Unknown" };
        }
        let ranges: RangeValue[] = payload.ranges;
        let index: number = 0;
        while (index < ranges.length) {
            ranges[langruntime.checkedIndexIn(ranges, index)] = copyRangeValue(rangeFromCoercedProfile(copyRangeValue(langruntime.indexStruct(ranges, langruntime.checkedIndex(index), copyRangeValue)), rangeType, elementType, elementKind, comparison, canonical));
            index = langruntime.checkedAdd(index, 1);
        }
        return multirangeFromProfiledRanges(typeName, rangeType, elementType, elementKind, ranges, { comparison: comparison, canonical: canonical });
    }
    return input;
}
export function multirangeRequireSupport(input: MultirangeValue, expected: RangeSupport): MultirangeValue {
    input = copyMultirangeValue(input);
    if (input.kind === "Value") {
        const payload: MultirangePayload = copyMultirangePayload(input.value);
        if (rangeSupportEqual(payload.support, expected) === false) {
            return { kind: "Unknown" };
        }
        return { kind: "Value", value: payload };
    }
    return input;
}
export function multirangeRequireType(input: MultirangeValue, typeName: string, rangeType: string, elementType: string, elementKind: number): MultirangeValue {
    input = copyMultirangeValue(input);
    typeName = langruntime.checkedString(typeName);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    if (input.kind === "Value") {
        const payload: MultirangePayload = copyMultirangePayload(input.value);
        if (!(payload.typeName === typeName) || !(payload.rangeType === rangeType) || !(payload.elementType === elementType) || !(payload.elementKind === elementKind)) {
            return { kind: "Unknown" };
        }
        return makeCoercedMultirangeValue(payload);
    }
    return input;
}
export function multirangeIsNull(input: MultirangeValue): BoolValue {
    input = copyMultirangeValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Value", value: true };
    }
    if (input.kind === "Value") {
        return { kind: "Value", value: false };
    }
    return { kind: "Unknown" };
}
export function multirangeFromCaseGuard(input: CheckOutcome): MultirangeValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function multirangeEmptyState(input: MultirangeValue): BoolValue {
    input = copyMultirangeValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const payload: MultirangePayload = copyMultirangePayload(input.value);
        return { kind: "Value", value: payload.ranges.length === 0 };
    }
    return { kind: "Unknown" };
}
function multirangeBoundaryAt(input: MultirangePayload, upper: boolean): RangeValue {
    upper = langruntime.checkedBool(upper);
    if (input.ranges.length === 0) {
        return { kind: "Null" };
    }
    let position: number = 0;
    if (upper) {
        position = langruntime.checkedIndex(langruntime.checkedSubtract(input.ranges.length, 1));
    }
    return copyRangeValue(langruntime.indexStruct(input.ranges, langruntime.checkedIndex(position), copyRangeValue));
}
export function multirangeBoundary(input: MultirangeValue, upper: boolean): RangeValue {
    input = copyMultirangeValue(input);
    upper = langruntime.checkedBool(upper);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const payload: MultirangePayload = copyMultirangePayload(input.value);
        return multirangeBoundaryAt(payload, upper);
    }
    return { kind: "Unknown" };
}
export function multirangeBound(input: MultirangeValue, upper: boolean): ArrayElement {
    input = copyMultirangeValue(input);
    upper = langruntime.checkedBool(upper);
    const boundary: RangeValue = multirangeBoundary(input, upper);
    return rangeBound(boundary, upper);
}
export function multirangeBoundFlag(input: MultirangeValue, upper: boolean, infinite: boolean): BoolValue {
    input = copyMultirangeValue(input);
    upper = langruntime.checkedBool(upper);
    infinite = langruntime.checkedBool(infinite);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const payload: MultirangePayload = copyMultirangePayload(input.value);
        if (payload.ranges.length === 0) {
            return { kind: "Value", value: false };
        }
        const boundary: RangeValue = multirangeBoundaryAt(payload, upper);
        return rangeBoundFlag(boundary, upper, infinite);
    }
    return { kind: "Unknown" };
}
export function domainConversionStart(input: BoolValue, notNull: boolean): CheckOutcome {
    notNull = langruntime.checkedBool(notNull);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (!(equalBoolValue(input, { kind: "Value", value: true })) && !(equalBoolValue(input, { kind: "Value", value: false }))) {
        return { kind: "Unknown" };
    }
    if (notNull) {
        if (equalBoolValue(input, { kind: "Value", value: true })) {
            return { kind: "Error", value: makeSqlError(sqlErrorNotNullViolation) };
        }
    }
    return { kind: "True" };
}
export function domainConversionContinues(input: CheckOutcome): boolean {
    return equalCheckOutcome(input, { kind: "True" });
}
export function domainConversionCheck(input: CheckOutcome, result: CheckOutcome): CheckOutcome {
    if (!(equalCheckOutcome(input, { kind: "True" }))) {
        return input;
    }
    if (equalCheckOutcome(result, { kind: "False" })) {
        return { kind: "Error", value: makeSqlError(sqlErrorCheckViolation) };
    }
    if (equalCheckOutcome(result, { kind: "Null" })) {
        return { kind: "True" };
    }
    return result;
}
export function finishDomainConversion(input: ArrayElement, result: CheckOutcome): ArrayElement {
    input = copyArrayElement(input);
    if (result.kind === "Error") {
        const error: SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return input;
}
export function finishDomainArrayInput(input: ArrayTextPayload, converted: ArrayArguments): ArrayValue {
    input = copyArrayTextPayload(input);
    converted = copyArrayArguments(converted);
    if (converted.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    return finishPreparedArrayText(input, converted);
}
export function finishArrayDomainConversion(input: ArrayValue, result: CheckOutcome): ArrayValue {
    input = copyArrayValue(input);
    if (result.kind === "Error") {
        const error: SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return input;
}
export function finishRangeDomainConversion(input: RangeValue, result: CheckOutcome): RangeValue {
    input = copyRangeValue(input);
    if (result.kind === "Error") {
        const error: SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return input;
}
export function finishMultirangeDomainConversion(input: MultirangeValue, result: CheckOutcome): MultirangeValue {
    input = copyMultirangeValue(input);
    if (result.kind === "Error") {
        const error: SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return input;
}
export interface ArrayDimension {
    readonly lower: number;
    readonly length: number;
}
export function copyArrayDimension(value: ArrayDimension): ArrayDimension {
    return { lower: langruntime.checkedI32(value.lower), length: langruntime.checkedI32(value.length) };
}
export interface ArrayPayload {
    readonly nullBitmap: BoolValue;
    readonly elementType: string;
    readonly elementKind: number;
    readonly dimensions: ArrayDimension[];
    readonly elements: ArrayElement[];
}
export function copyArrayPayload(value: ArrayPayload): ArrayPayload {
    return { nullBitmap: value.nullBitmap, elementType: langruntime.checkedString(value.elementType), elementKind: langruntime.checkedI32(value.elementKind), dimensions: langruntime.checkedStructs(value.dimensions, copyArrayDimension), elements: langruntime.checkedStructs(value.elements, copyArrayElement) };
}
export type ArrayValue = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Null";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Value";
    readonly value: ArrayPayload;
};
export function copyArrayValue(value: ArrayValue): ArrayValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Error": return { kind: "Error", value: value.value };
        case "Value": return { kind: "Value", value: copyArrayPayload(value.value) };
    }
}
export type ArrayArguments = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Error";
    readonly value: SqlError;
} | {
    readonly kind: "Value";
    readonly value: ArrayPayload;
};
export function copyArrayArguments(value: ArrayArguments): ArrayArguments {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Error": return { kind: "Error", value: value.value };
        case "Value": return { kind: "Value", value: copyArrayPayload(value.value) };
    }
}
export interface ArrayOutputPayload {
    nullBitmap: BoolValue;
    state: number;
    error: SqlError;
    dimensions: ArrayDimension[];
    elements: ArrayElement[];
}
export function copyArrayOutputPayload(value: ArrayOutputPayload): ArrayOutputPayload {
    return { nullBitmap: value.nullBitmap, state: langruntime.checkedI32(value.state), error: value.error, dimensions: langruntime.checkedStructs(value.dimensions, copyArrayDimension), elements: langruntime.checkedStructs(value.elements, copyArrayElement) };
}
export type ArrayOutputPlan = {
    kind: "Value";
    value: ArrayOutputPayload;
};
function copyArrayOutputPlan(value: ArrayOutputPlan): ArrayOutputPlan {
    switch (value.kind) {
        case "Value": return { kind: "Value", value: copyArrayOutputPayload(value.value) };
    }
}
export function arrayValueValidity(input: BoolValue, unknownValid: boolean): CheckOutcome {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (equalBoolValue(input, { kind: "Unknown" }) && unknownValid === false) {
        return { kind: "Unknown" };
    }
    return { kind: "True" };
}
export function arrayValidityFinish(left: CheckOutcome, right: CheckOutcome): CheckOutcome {
    if (equalCheckOutcome(left, { kind: "Unknown" })) {
        return left;
    }
    if (left.kind === "Error") {
        return left;
    }
    return right;
}
export function arrayValidityUnknown(input: CheckOutcome): boolean {
    return equalCheckOutcome(input, { kind: "Unknown" });
}
export function arrayValidityPossible(input: CheckOutcome): CheckOutcome {
    if (equalCheckOutcome(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (input.kind === "Error") {
        return { kind: "Unknown" };
    }
    return { kind: "True" };
}
export function arrayConstructorFromValidity(input: ArrayValue, validity: CheckOutcome): ArrayValue {
    if (validity.kind === "Error") {
        const error: SqlError = validity.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(validity, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return input;
}
export function arrayCastValidity(input: ArrayElement, source: string, target: string, alwaysValid: boolean): CheckOutcome {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "True" };
    }
    if (alwaysValid) {
        return { kind: "True" };
    }
    let temporal: boolean = false;
    let lowerOnly: boolean = false;
    let timestamp: bigint = 0n;
    if (source === "pg_catalog.date" && target === "pg_catalog.timestamptz") {
        if (input.kind === "Date") {
            const value: number = langruntime.checkedI32(input.value);
            if (value === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) || value === 2147483647) {
                return { kind: "True" };
            }
            if (value >= 106751983) {
                return { kind: "Error", value: makeSqlError(timestampFieldOverflow) };
            }
            timestamp = langruntime.checkedI64(langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(value))), 86400000000n));
            temporal = langruntime.checkedBool(true);
        }
    }
    if (source === "pg_catalog.\"timestamp\"" && target === "pg_catalog.timestamptz") {
        if (input.kind === "Timestamp") {
            const value: bigint = langruntime.checkedI64(input.value);
            timestamp = langruntime.checkedI64(value);
            temporal = langruntime.checkedBool(true);
        }
    }
    if (source === "pg_catalog.timestamptz" && (target === "pg_catalog.\"timestamp\"" || target === "pg_catalog.date")) {
        if (input.kind === "Timestamptz") {
            const value: bigint = langruntime.checkedI64(input.value);
            timestamp = langruntime.checkedI64(value);
            temporal = langruntime.checkedBool(true);
            lowerOnly = langruntime.checkedBool(target === "pg_catalog.date");
        }
    }
    if (temporal) {
        if (timestamp === -9223372036854775808n || timestamp === 9223372036854775807n) {
            return { kind: "True" };
        }
        if (timestamp >= langruntime.checkedI64Add(-211813488000000000n, 2147483648000000n) && (lowerOnly || timestamp < langruntime.checkedI64Subtract(9223371331200000000n, 2147483648000000n))) {
            return { kind: "True" };
        }
    }
    return { kind: "Unknown" };
}
export function appendArrayCastConversion(input: ArrayOutputPayload, element: ArrayElement, validity: CheckOutcome): ArrayOutputPayload {
    if (element.kind === "Unknown") {
        if (validity.kind === "Error") {
            const error: SqlError = validity.value;
            return appendArrayConversion(input, { kind: "Error", value: error }, true);
        }
        return appendArrayConversion(input, element, equalCheckOutcome(validity, { kind: "True" }));
    }
    return appendArrayConversion(input, element, true);
}
export function makeArrayConversion(): ArrayOutputPayload {
    const dimensions: ArrayDimension[] = [];
    const elements: ArrayElement[] = [];
    return { nullBitmap: { kind: "Value", value: false }, state: 1, error: makeSqlError(0), dimensions: dimensions, elements: elements };
}
export function appendArrayConversion(input: ArrayOutputPayload, element: ArrayElement, unknownValid: boolean): ArrayOutputPayload {
    let state: number = input.state;
    let error: SqlError = input.error;
    if (state === 1) {
        if (element.kind === "Error") {
            const value: SqlError = element.value;
            state = langruntime.checkedI32(langruntime.checkedSignedNegate(2));
            error = value;
        }
    }
    if (state === 1 && unknownValid === false) {
        if (element.kind === "Unknown") {
            state = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        }
    }
    let elements: ArrayElement[] = input.elements;
    let nullBitmap: BoolValue = input.nullBitmap;
    if (state === 1) {
        nullBitmap = arrayBitmapUnion(nullBitmap, arrayElementBitmap(copyArrayElement(element)));
        langruntime.pushStruct(elements, element, copyArrayElement);
    }
    return { nullBitmap: nullBitmap, state: state, error: error, dimensions: input.dimensions, elements: elements };
}
export function arrayConversionArguments(input: ArrayOutputPayload, elementType: string, elementKind: number): ArrayArguments {
    if (input.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: input.error };
    }
    if (!(input.state === 1)) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: { nullBitmap: input.nullBitmap, elementType: elementType, elementKind: elementKind, dimensions: input.dimensions, elements: input.elements } };
}
export function prepareArrayOutput(input: ArrayValue): ArrayOutputPayload {
    input = copyArrayValue(input);
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        return { nullBitmap: value.nullBitmap, state: 1, error: makeSqlError(0), dimensions: value.dimensions, elements: value.elements };
    }
    let state: number = langruntime.checkedSignedNegate(1);
    let error: SqlError = makeSqlError(0);
    if (input.kind === "Null") {
        state = langruntime.checkedI32(0);
    }
    if (input.kind === "Error") {
        const value: SqlError = input.value;
        state = langruntime.checkedI32(langruntime.checkedSignedNegate(2));
        error = value;
    }
    const dimensions: ArrayDimension[] = [];
    const elements: ArrayElement[] = [];
    return { nullBitmap: { kind: "Unknown" }, state: state, error: error, dimensions: dimensions, elements: elements };
}
export function arrayOutputHasElement(input: ArrayOutputPayload, index: Int4Value): boolean {
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        const position: number = langruntime.indexFromI32(offset, input.elements.length);
        return input.state === 1 && offset >= 0 && position < input.elements.length;
    }
    return false;
}
export function arrayOutputElementAt(input: ArrayOutputPayload, index: Int4Value): ArrayElement {
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        const position: number = langruntime.indexFromI32(offset, input.elements.length);
        if (offset >= 0 && position < input.elements.length) {
            return copyArrayElement(langruntime.indexStruct(input.elements, langruntime.checkedIndex(position), copyArrayElement));
        }
    }
    return { kind: "Unknown" };
}
export function arrayUnknown(): ArrayValue {
    return { kind: "Unknown" };
}
export function arrayNull(): ArrayValue {
    return { kind: "Null" };
}
export function arrayIsNull(input: ArrayValue): BoolValue {
    input = copyArrayValue(input);
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
export function arrayFromCaseGuard(input: CheckOutcome): ArrayValue {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
function arrayCoercedOwnedElement(element: ArrayElement): ArrayElement {
    element = copyArrayElement(element);
    if (element.kind === "Array") {
        const nested: ArrayPayload = copyArrayPayload(element.value);
        return arrayElementFromArray(makeArrayValue(nested));
    }
    if (element.kind === "Range") {
        const payload: RangePayload = copyRangePayload(element.value);
        return arrayElementFromRange(makeCoercedRangeValue(payload));
    }
    if (element.kind === "Multirange") {
        const payload: MultirangePayload = copyMultirangePayload(element.value);
        return arrayElementFromMultirange(makeCoercedMultirangeValue(payload));
    }
    return element;
}
export function makeArrayValue(input: ArrayPayload): ArrayValue {
    input = copyArrayPayload(input);
    let elements: ArrayElement[] = input.elements;
    let position: number = 0;
    while (position < elements.length) {
        const checked: ArrayElement = arrayCoercedOwnedElement(copyArrayElement(langruntime.indexStruct(elements, langruntime.checkedIndex(position), copyArrayElement)));
        if (checked.kind === "Error") {
            const error: SqlError = checked.value;
            return { kind: "Error", value: error };
        }
        if (checked.kind === "Unknown") {
            if (arrayElementFamily(copyArrayElement(langruntime.indexStruct(elements, langruntime.checkedIndex(position), copyArrayElement))) >= 41) {
                return { kind: "Unknown" };
            }
        }
        elements[langruntime.checkedIndexIn(elements, position)] = copyArrayElement(checked);
        position = langruntime.checkedAdd(position, 1);
    }
    const identity: string[] = Array.from(input.elementType);
    if (identity.length === 0 || input.elementKind < 1 || input.elementKind > 43) {
        return { kind: "Unknown" };
    }
    position = langruntime.checkedIndex(0);
    while (position < identity.length) {
        if (langruntime.indexChar(identity, langruntime.checkedIndex(position)) === "\0") {
            return { kind: "Unknown" };
        }
        position = langruntime.checkedAdd(position, 1);
    }
    if (input.dimensions.length > 6) {
        return { kind: "Unknown" };
    }
    let count: bigint = 0n;
    if (input.dimensions.length > 0) {
        count = langruntime.checkedI64(1n);
    }
    position = langruntime.checkedIndex(0);
    while (position < input.dimensions.length) {
        const dimension: ArrayDimension = langruntime.indexStruct(input.dimensions, langruntime.checkedIndex(position), copyArrayDimension);
        if (dimension.length <= 0) {
            return { kind: "Unknown" };
        }
        const length: bigint = BigInt(langruntime.checkedI32(dimension.length));
        const end: bigint = langruntime.checkedI64Add((BigInt(langruntime.checkedI32(dimension.lower))), length);
        if (end > 2147483648n || count > langruntime.checkedI64Divide(2147483647n, length)) {
            return { kind: "Unknown" };
        }
        count = langruntime.checkedI64(langruntime.checkedI64Multiply(count, length));
        position = langruntime.checkedAdd(position, 1);
    }
    if (!(count === BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(elements.length))))))) {
        return { kind: "Unknown" };
    }
    position = langruntime.checkedIndex(0);
    while (position < elements.length) {
        const kind: number = arrayElementFamily(copyArrayElement(langruntime.indexStruct(elements, langruntime.checkedIndex(position), copyArrayElement)));
        if (!(kind === 0) && !(kind === input.elementKind)) {
            return { kind: "Unknown" };
        }
        position = langruntime.checkedAdd(position, 1);
    }
    let nullBitmap: BoolValue = input.nullBitmap;
    if (equalBoolValue(nullBitmap, { kind: "Null" })) {
        return { kind: "Unknown" };
    }
    if (nullBitmap.kind === "Error") {
        return { kind: "Unknown" };
    }
    position = langruntime.checkedIndex(0);
    while (position < elements.length) {
        const element: ArrayElement = copyArrayElement(langruntime.indexStruct(elements, langruntime.checkedIndex(position), copyArrayElement));
        if (element.kind === "Null") {
            if (equalBoolValue(nullBitmap, { kind: "Value", value: false })) {
                return { kind: "Unknown" };
            }
            nullBitmap = { kind: "Value", value: true };
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return { kind: "Value", value: { elementType: input.elementType, elementKind: input.elementKind, dimensions: input.dimensions, elements: elements, nullBitmap: nullBitmap } };
}
export function arrayFromCoercedValue(input: ArrayValue, elementType: string, elementKind: number): ArrayValue {
    input = copyArrayValue(input);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        if (!(value.elementType === elementType) || !(value.elementKind === elementKind)) {
            return { kind: "Unknown" };
        }
        return makeArrayValue(value);
    }
    return input;
}
function arrayTreeTypeAt(types: string, level: number): string {
    types = langruntime.checkedString(types);
    level = langruntime.checkedIndex(level);
    const characters: string[] = Array.from(types);
    let current: number = 0;
    let position: number = 0;
    let result: string = "";
    while (position < characters.length) {
        const character: string = langruntime.indexChar(characters, langruntime.checkedIndex(position));
        if (character === "\0") {
            if (current === level) {
                return result;
            }
            current = langruntime.checkedAdd(current, 1);
        }
        else if (current === level) {
            result = result + langruntime.checkedChar(character);
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return result;
}
function arrayTreeIdentityValid(input: ArrayPayload, types: string, kinds: string, level: number): boolean {
    types = langruntime.checkedString(types);
    kinds = langruntime.checkedString(kinds);
    level = langruntime.checkedIndex(level);
    const families: string[] = Array.from(kinds);
    if (level >= families.length) {
        return false;
    }
    const family: number = langruntime.checkedChar(langruntime.indexChar(families, langruntime.checkedIndex(level))).codePointAt(0)!;
    const expectedType: string = arrayTreeTypeAt(types, level);
    if (!(input.elementType === expectedType) || !(input.elementKind === family)) {
        return false;
    }
    if (!(family === 41)) {
        return langruntime.checkedAdd(level, 1) === families.length;
    }
    if (langruntime.checkedAdd(level, 1) >= families.length) {
        return false;
    }
    let index: number = 0;
    while (index < input.elements.length) {
        const element: ArrayElement = copyArrayElement(langruntime.indexStruct(input.elements, langruntime.checkedIndex(index), copyArrayElement));
        if (element.kind === "Array") {
            const nested: ArrayPayload = copyArrayPayload(element.value);
            if (arrayTreeIdentityValid(nested, types, kinds, langruntime.checkedAdd(level, 1)) === false) {
                return false;
            }
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return true;
}
export function arrayFromCoercedTree(input: ArrayValue, types: string, kinds: string): ArrayValue {
    input = copyArrayValue(input);
    types = langruntime.checkedString(types);
    kinds = langruntime.checkedString(kinds);
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        if (arrayTreeIdentityValid(value, types, kinds, 0) === false) {
            return { kind: "Unknown" };
        }
        return makeArrayValue(value);
    }
    return input;
}
function arrayRangeElementIdentity(input: ArrayPayload, position: number, typeName: string, elementType: string, elementKind: number): boolean {
    position = langruntime.checkedIndex(position);
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    const element: ArrayElement = copyArrayElement(langruntime.indexStruct(input.elements, langruntime.checkedIndex(position), copyArrayElement));
    if (element.kind === "Array") {
        const nested: ArrayPayload = copyArrayPayload(element.value);
        return arrayRangeIdentityValid(nested, typeName, elementType, elementKind);
    }
    if (element.kind === "Range") {
        const payload: RangePayload = copyRangePayload(element.value);
        return payload.typeName === typeName && payload.elementType === elementType && payload.elementKind === elementKind;
    }
    return true;
}
function arrayRangeIdentityValid(input: ArrayPayload, typeName: string, elementType: string, elementKind: number): boolean {
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    let position: number = 0;
    while (position < input.elements.length) {
        if (arrayRangeElementIdentity(input, position, typeName, elementType, elementKind) === false) {
            return false;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return true;
}
export function arrayFromCoercedRangeTree(input: ArrayValue, types: string, kinds: string, typeName: string, elementType: string, elementKind: number): ArrayValue {
    input = copyArrayValue(input);
    types = langruntime.checkedString(types);
    kinds = langruntime.checkedString(kinds);
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    if (input.kind === "Value") {
        const payload: ArrayPayload = copyArrayPayload(input.value);
        if (arrayTreeIdentityValid(payload, types, kinds, 0) === false || arrayRangeIdentityValid(payload, typeName, elementType, elementKind) === false) {
            return { kind: "Unknown" };
        }
        return makeArrayValue(payload);
    }
    return input;
}
function arrayMultirangeElementIdentity(input: ArrayPayload, position: number, typeName: string, rangeType: string, elementType: string, elementKind: number): boolean {
    position = langruntime.checkedIndex(position);
    typeName = langruntime.checkedString(typeName);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    const element: ArrayElement = copyArrayElement(langruntime.indexStruct(input.elements, langruntime.checkedIndex(position), copyArrayElement));
    if (element.kind === "Array") {
        const nested: ArrayPayload = copyArrayPayload(element.value);
        return arrayMultirangeIdentityValid(nested, typeName, rangeType, elementType, elementKind);
    }
    if (element.kind === "Multirange") {
        const payload: MultirangePayload = copyMultirangePayload(element.value);
        if (!(payload.typeName === typeName) || !(payload.rangeType === rangeType) || !(payload.elementType === elementType) || !(payload.elementKind === elementKind)) {
            return false;
        }
        let member: number = 0;
        while (member < payload.ranges.length) {
            const span: RangeValue = copyRangeValue(langruntime.indexStruct(payload.ranges, langruntime.checkedIndex(member), copyRangeValue));
            if (span.kind === "Value") {
                const value: RangePayload = copyRangePayload(span.value);
                if (!(value.typeName === rangeType) || !(value.elementType === elementType) || !(value.elementKind === elementKind)) {
                    return false;
                }
            }
            member = langruntime.checkedAdd(member, 1);
        }
    }
    return true;
}
function arrayMultirangeIdentityValid(input: ArrayPayload, typeName: string, rangeType: string, elementType: string, elementKind: number): boolean {
    typeName = langruntime.checkedString(typeName);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    let position: number = 0;
    while (position < input.elements.length) {
        if (arrayMultirangeElementIdentity(input, position, typeName, rangeType, elementType, elementKind) === false) {
            return false;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return true;
}
export function arrayFromCoercedMultirangeTree(input: ArrayValue, types: string, kinds: string, typeName: string, rangeType: string, elementType: string, elementKind: number): ArrayValue {
    input = copyArrayValue(input);
    types = langruntime.checkedString(types);
    kinds = langruntime.checkedString(kinds);
    typeName = langruntime.checkedString(typeName);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    if (input.kind === "Value") {
        const payload: ArrayPayload = copyArrayPayload(input.value);
        if (arrayTreeIdentityValid(payload, types, kinds, 0) === false || arrayMultirangeIdentityValid(payload, typeName, rangeType, elementType, elementKind) === false) {
            return { kind: "Unknown" };
        }
        return makeArrayValue(payload);
    }
    return input;
}
function arrayElementWithRangeProfile(input: ArrayElement, multirangeType: string, rangeType: string, elementType: string, elementKind: number, comparison: number, canonical: number): ArrayElement {
    input = copyArrayElement(input);
    multirangeType = langruntime.checkedString(multirangeType);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    comparison = langruntime.checkedI32(comparison);
    canonical = langruntime.checkedI32(canonical);
    if (input.kind === "Array") {
        const nested: ArrayPayload = copyArrayPayload(input.value);
        const converted: ArrayValue = arrayWithRangeProfile({ kind: "Value", value: nested }, multirangeType, rangeType, elementType, elementKind, comparison, canonical);
        return arrayElementFromArray(converted);
    }
    if (input.kind === "Range") {
        const span: RangePayload = copyRangePayload(input.value);
        const converted: RangeValue = rangeFromCoercedProfile({ kind: "Value", value: span }, rangeType, elementType, elementKind, comparison, canonical);
        return arrayElementFromRange(converted);
    }
    if (input.kind === "Multirange") {
        const spans: MultirangePayload = copyMultirangePayload(input.value);
        const converted: MultirangeValue = multirangeFromCoercedProfile({ kind: "Value", value: spans }, multirangeType, rangeType, elementType, elementKind, comparison, canonical);
        return arrayElementFromMultirange(converted);
    }
    return input;
}
function arrayWithRangeProfile(input: ArrayValue, multirangeType: string, rangeType: string, elementType: string, elementKind: number, comparison: number, canonical: number): ArrayValue {
    input = copyArrayValue(input);
    multirangeType = langruntime.checkedString(multirangeType);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    comparison = langruntime.checkedI32(comparison);
    canonical = langruntime.checkedI32(canonical);
    if (input.kind === "Value") {
        const payload: ArrayPayload = copyArrayPayload(input.value);
        let elements: ArrayElement[] = payload.elements;
        let position: number = 0;
        while (position < elements.length) {
            const element: ArrayElement = copyArrayElement(langruntime.indexStruct(elements, langruntime.checkedIndex(position), copyArrayElement));
            let convert: boolean = true;
            if (element.kind === "Unknown") {
                convert = langruntime.checkedBool(false);
            }
            if (convert) {
                const converted: ArrayElement = arrayElementWithRangeProfile(element, multirangeType, rangeType, elementType, elementKind, comparison, canonical);
                if (converted.kind === "Error") {
                    const error: SqlError = converted.value;
                    return { kind: "Error", value: error };
                }
                if (converted.kind === "Unknown") {
                    return { kind: "Unknown" };
                }
                elements[langruntime.checkedIndexIn(elements, position)] = copyArrayElement(converted);
            }
            position = langruntime.checkedAdd(position, 1);
        }
        return makeArrayValue({ nullBitmap: payload.nullBitmap, elementType: payload.elementType, elementKind: payload.elementKind, dimensions: payload.dimensions, elements: elements });
    }
    return input;
}
export function arrayFromCoercedRangeProfileTree(input: ArrayValue, types: string, kinds: string, typeName: string, elementType: string, elementKind: number, comparison: number, canonical: number): ArrayValue {
    input = copyArrayValue(input);
    types = langruntime.checkedString(types);
    kinds = langruntime.checkedString(kinds);
    typeName = langruntime.checkedString(typeName);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    comparison = langruntime.checkedI32(comparison);
    canonical = langruntime.checkedI32(canonical);
    if (input.kind === "Value") {
        const payload: ArrayPayload = copyArrayPayload(input.value);
        if (arrayTreeIdentityValid(payload, types, kinds, 0) === false || arrayRangeIdentityValid(payload, typeName, elementType, elementKind) === false) {
            return { kind: "Unknown" };
        }
        return arrayWithRangeProfile({ kind: "Value", value: payload }, "", typeName, elementType, elementKind, comparison, canonical);
    }
    return input;
}
export function arrayFromCoercedMultirangeProfileTree(input: ArrayValue, types: string, kinds: string, typeName: string, rangeType: string, elementType: string, elementKind: number, comparison: number, canonical: number): ArrayValue {
    input = copyArrayValue(input);
    types = langruntime.checkedString(types);
    kinds = langruntime.checkedString(kinds);
    typeName = langruntime.checkedString(typeName);
    rangeType = langruntime.checkedString(rangeType);
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    comparison = langruntime.checkedI32(comparison);
    canonical = langruntime.checkedI32(canonical);
    if (input.kind === "Value") {
        const payload: ArrayPayload = copyArrayPayload(input.value);
        if (arrayTreeIdentityValid(payload, types, kinds, 0) === false || arrayMultirangeIdentityValid(payload, typeName, rangeType, elementType, elementKind) === false) {
            return { kind: "Unknown" };
        }
        return arrayWithRangeProfile({ kind: "Value", value: payload }, typeName, rangeType, elementType, elementKind, comparison, canonical);
    }
    return input;
}
export function makeArrayArguments(elementType: string, elementKind: number): ArrayArguments {
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    const dimensions: ArrayDimension[] = [];
    const elements: ArrayElement[] = [];
    return { kind: "Value", value: { nullBitmap: { kind: "Value", value: false }, elementType: elementType, elementKind: elementKind, dimensions: dimensions, elements: elements } };
}
export function appendArrayDimension(input: ArrayArguments, lower: number, length: number): ArrayArguments {
    input = copyArrayArguments(input);
    lower = langruntime.checkedI32(lower);
    length = langruntime.checkedI32(length);
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        let dimensions: ArrayDimension[] = value.dimensions;
        langruntime.pushStruct(dimensions, { lower: lower, length: length }, copyArrayDimension);
        return { kind: "Value", value: { nullBitmap: value.nullBitmap, elementType: value.elementType, elementKind: value.elementKind, dimensions: dimensions, elements: value.elements } };
    }
    return input;
}
export function appendArrayArgument(input: ArrayArguments, element: ArrayElement): ArrayArguments {
    input = copyArrayArguments(input);
    element = copyArrayElement(element);
    if (input.kind === "Error") {
        return input;
    }
    if (element.kind === "Error") {
        const error: SqlError = element.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        const nullBitmap: BoolValue = arrayBitmapUnion(value.nullBitmap, arrayElementBitmap(copyArrayElement(element)));
        let elements: ArrayElement[] = value.elements;
        langruntime.pushStruct(elements, element, copyArrayElement);
        return { kind: "Value", value: { nullBitmap: nullBitmap, elementType: value.elementType, elementKind: value.elementKind, dimensions: value.dimensions, elements: elements } };
    }
    return input;
}
export function finishArrayArguments(input: ArrayArguments): ArrayValue {
    input = copyArrayArguments(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        return makeArrayValue(value);
    }
    return { kind: "Unknown" };
}
export function arrayFlatElement(input: ArrayValue, offset: Int4Value): ArrayElement {
    input = copyArrayValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (offset.kind === "Error") {
        const error: SqlError = offset.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (offset.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        if (offset.kind === "Value") {
            const index: number = langruntime.checkedI32(offset.value);
            if (index < 0) {
                return { kind: "Null" };
            }
            const position: number = langruntime.indexFromI32(index, 0);
            if (position >= value.elements.length) {
                return { kind: "Null" };
            }
            return copyArrayElement(langruntime.indexStruct(value.elements, langruntime.checkedIndex(position), copyArrayElement));
        }
    }
    return { kind: "Unknown" };
}
export function finishArrayConstructor(input: ArrayArguments): ArrayValue {
    input = copyArrayArguments(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        let dimensions: ArrayDimension[] = [];
        if (value.elements.length > 0) {
            langruntime.pushStruct(dimensions, { lower: 1, length: langruntime.checkedI32(langruntime.checkedIndex(value.elements.length)) }, copyArrayDimension);
        }
        return makeArrayValue({ nullBitmap: value.nullBitmap, elementType: value.elementType, elementKind: value.elementKind, dimensions: dimensions, elements: value.elements });
    }
    return { kind: "Unknown" };
}
export interface ArrayChildrenPayload {
    elementType: string;
    elementKind: number;
    arrays: ArrayValue[];
}
function copyArrayChildrenPayload(value: ArrayChildrenPayload): ArrayChildrenPayload {
    return { elementType: langruntime.checkedString(value.elementType), elementKind: langruntime.checkedI32(value.elementKind), arrays: langruntime.checkedStructs(value.arrays, copyArrayValue) };
}
export type ArrayChildrenArguments = {
    kind: "Unknown";
} | {
    kind: "Error";
    value: SqlError;
} | {
    kind: "Value";
    value: ArrayChildrenPayload;
};
function copyArrayChildrenArguments(value: ArrayChildrenArguments): ArrayChildrenArguments {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Error": return { kind: "Error", value: value.value };
        case "Value": return { kind: "Value", value: copyArrayChildrenPayload(value.value) };
    }
}
export function makeArrayChildren(elementType: string, elementKind: number): ArrayChildrenArguments {
    elementType = langruntime.checkedString(elementType);
    elementKind = langruntime.checkedI32(elementKind);
    const arrays: ArrayValue[] = [];
    return { kind: "Value", value: { elementType: elementType, elementKind: elementKind, arrays: arrays } };
}
export function appendArrayChild(input: ArrayChildrenArguments, child: ArrayValue): ArrayChildrenArguments {
    input = copyArrayChildrenArguments(input);
    child = copyArrayValue(child);
    if (input.kind === "Error") {
        return input;
    }
    if (child.kind === "Error") {
        const error: SqlError = child.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Value") {
        const value: ArrayChildrenPayload = copyArrayChildrenPayload(input.value);
        let arrays: ArrayValue[] = value.arrays;
        langruntime.pushStruct(arrays, child, copyArrayValue);
        return { kind: "Value", value: { elementType: value.elementType, elementKind: value.elementKind, arrays: arrays } };
    }
    return input;
}
export function finishArrayChildren(input: ArrayChildrenArguments): ArrayValue {
    input = copyArrayChildrenArguments(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Value") {
        const value: ArrayChildrenPayload = copyArrayChildrenPayload(input.value);
        let position: number = 0;
        while (position < value.arrays.length) {
            const child: ArrayValue = copyArrayValue(langruntime.indexStruct(value.arrays, langruntime.checkedIndex(position), copyArrayValue));
            if (child.kind === "Unknown") {
                return { kind: "Unknown" };
            }
            position = langruntime.checkedAdd(position, 1);
        }
        let dimensions: ArrayDimension[] = [];
        let elements: ArrayElement[] = [];
        let empty: boolean = false;
        let nullBitmap: BoolValue = { kind: "Value", value: false };
        position = langruntime.checkedIndex(0);
        while (position < value.arrays.length) {
            const child: ArrayValue = copyArrayValue(langruntime.indexStruct(value.arrays, langruntime.checkedIndex(position), copyArrayValue));
            if (child.kind === "Null") {
                empty = langruntime.checkedBool(true);
            }
            if (child.kind === "Value") {
                const array: ArrayPayload = copyArrayPayload(child.value);
                if (!(array.elementType === value.elementType) || !(array.elementKind === value.elementKind)) {
                    return { kind: "Error", value: makeSqlError(arrayConstructorTypeMismatch) };
                }
                if (array.dimensions.length === 0) {
                    empty = langruntime.checkedBool(true);
                }
                else {
                    nullBitmap = arrayBitmapUnion(nullBitmap, array.nullBitmap);
                    if (dimensions.length === 0) {
                        if (array.dimensions.length >= 6) {
                            return { kind: "Error", value: makeSqlError(sqlErrorProgramLimit) };
                        }
                        langruntime.pushStruct(dimensions, { lower: 1, length: langruntime.checkedI32(langruntime.checkedIndex(value.arrays.length)) }, copyArrayDimension);
                        let index: number = 0;
                        while (index < array.dimensions.length) {
                            langruntime.pushStruct(dimensions, langruntime.indexStruct(array.dimensions, langruntime.checkedIndex(index), copyArrayDimension), copyArrayDimension);
                            index = langruntime.checkedAdd(index, 1);
                        }
                    }
                    else {
                        if (!(dimensions.length === langruntime.checkedAdd(array.dimensions.length, 1))) {
                            return { kind: "Error", value: makeSqlError(sqlErrorArraySubscript) };
                        }
                        let index: number = 0;
                        while (index < array.dimensions.length) {
                            const expected: ArrayDimension = langruntime.indexStruct(dimensions, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)), copyArrayDimension);
                            const actual: ArrayDimension = langruntime.indexStruct(array.dimensions, langruntime.checkedIndex(index), copyArrayDimension);
                            if (!(expected.lower === actual.lower) || !(expected.length === actual.length)) {
                                return { kind: "Error", value: makeSqlError(sqlErrorArraySubscript) };
                            }
                            index = langruntime.checkedAdd(index, 1);
                        }
                    }
                    if (langruntime.checkedI64Add(BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(elements.length))))), BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(array.elements.length)))))) > 2147483647n) {
                        return { kind: "Error", value: makeSqlError(sqlErrorProgramLimit) };
                    }
                    let index: number = 0;
                    while (index < array.elements.length) {
                        langruntime.pushStruct(elements, copyArrayElement(langruntime.indexStruct(array.elements, langruntime.checkedIndex(index), copyArrayElement)), copyArrayElement);
                        index = langruntime.checkedAdd(index, 1);
                    }
                }
            }
            position = langruntime.checkedAdd(position, 1);
        }
        if (empty && dimensions.length > 0) {
            return { kind: "Error", value: makeSqlError(sqlErrorArraySubscript) };
        }
        let axis: number = 0;
        while (axis < dimensions.length) {
            const dimension: ArrayDimension = langruntime.indexStruct(dimensions, langruntime.checkedIndex(axis), copyArrayDimension);
            if (langruntime.checkedI64Add((BigInt(langruntime.checkedI32(dimension.lower))), (BigInt(langruntime.checkedI32(dimension.length)))) > 2147483647n) {
                return { kind: "Error", value: makeSqlError(sqlErrorProgramLimit) };
            }
            axis = langruntime.checkedAdd(axis, 1);
        }
        return makeArrayValue({ nullBitmap: nullBitmap, elementType: value.elementType, elementKind: value.elementKind, dimensions: dimensions, elements: elements });
    }
    return { kind: "Unknown" };
}
const arrayConstructorTypeMismatch = 6822148;
interface ArrayTextSource {
    characters: string[];
}
function copyArrayTextSource(value: ArrayTextSource): ArrayTextSource {
    return { characters: langruntime.checkedChars(value.characters) };
}
export interface ArrayTextPayload {
    state: number;
    dimensions: ArrayDimension[];
    events: ArrayTextEvent[];
}
export function copyArrayTextPayload(value: ArrayTextPayload): ArrayTextPayload {
    return { state: langruntime.checkedI32(value.state), dimensions: langruntime.checkedStructs(value.dimensions, copyArrayDimension), events: langruntime.checkedStructs(value.events, copyArrayTextEvent) };
}
export type ArrayTextPlan = {
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: ArrayTextPayload;
};
function copyArrayTextPlan(value: ArrayTextPlan): ArrayTextPlan {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: copyArrayTextPayload(value.value) };
    }
}
export type ArrayTextEvent = {
    kind: "Text";
    value: string;
} | {
    kind: "Null";
} | {
    kind: "Unknown";
} | {
    kind: "Error";
    value: SqlError;
};
export function copyArrayTextEvent(value: ArrayTextEvent): ArrayTextEvent {
    switch (value.kind) {
        case "Text": return { kind: "Text", value: langruntime.checkedString(value.value) };
        case "Null": return { kind: "Null" };
        case "Unknown": return { kind: "Unknown" };
        case "Error": return { kind: "Error", value: value.value };
    }
}
interface ArrayTextToken {
    next: number;
    kind: number;
    text: string;
}
function copyArrayTextToken(value: ArrayTextToken): ArrayTextToken {
    return { next: langruntime.checkedIndex(value.next), kind: langruntime.checkedI32(value.kind), text: langruntime.checkedString(value.text) };
}
interface ArrayTextBound {
    next: number;
    value: bigint;
    found: boolean;
    overflow: boolean;
}
function copyArrayTextBound(value: ArrayTextBound): ArrayTextBound {
    return { next: langruntime.checkedIndex(value.next), value: langruntime.checkedI64(value.value), found: langruntime.checkedBool(value.found), overflow: langruntime.checkedBool(value.overflow) };
}
const arrayTextInvalid = 3484946;
function arrayTextSpace(ch: string): boolean {
    ch = langruntime.checkedChar(ch);
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\v" || ch === "\f";
}
function arrayTextDigit(ch: string): boolean {
    ch = langruntime.checkedChar(ch);
    const code: number = langruntime.checkedChar(ch).codePointAt(0)!;
    return code >= 48 && code <= 57;
}
function arrayTextSkipSpace(source: ArrayTextSource, start: number): number {
    start = langruntime.checkedIndex(start);
    let position: number = start;
    while (position < source.characters.length && arrayTextSpace(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
        position = langruntime.checkedAdd(position, 1);
    }
    return position;
}
function arrayTextReadBound(source: ArrayTextSource, start: number): ArrayTextBound {
    start = langruntime.checkedIndex(start);
    let position: number = start;
    let negative: boolean = false;
    if (position < source.characters.length && (langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "-" || langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "+")) {
        negative = langruntime.checkedBool(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "-");
        position = langruntime.checkedAdd(position, 1);
    }
    const digits: number = position;
    let value: bigint = 0n;
    let overflow: boolean = false;
    while (position < source.characters.length && arrayTextDigit(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)))) {
        if (value > 2147483648n) {
            overflow = langruntime.checkedBool(true);
        }
        else {
            value = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(value, 10n), (BigInt(langruntime.checkedI32((langruntime.checkedSignedSubtract(langruntime.checkedChar(langruntime.indexChar(source.characters, langruntime.checkedIndex(position))).codePointAt(0)!, 48)))))));
        }
        position = langruntime.checkedAdd(position, 1);
    }
    if (negative) {
        value = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, value));
    }
    if (value < -2147483648n || value > 2147483647n) {
        overflow = langruntime.checkedBool(true);
    }
    if (position === digits) {
        return { next: start, value: 0n, found: false, overflow: false };
    }
    return { next: position, value: value, found: true, overflow: overflow };
}
function arrayTextReadToken(source: ArrayTextSource, start: number, delimiter: string): ArrayTextToken {
    start = langruntime.checkedIndex(start);
    delimiter = langruntime.checkedChar(delimiter);
    let position: number = arrayTextSkipSpace(source, start);
    if (position >= source.characters.length) {
        return { next: position, kind: 0, text: "" };
    }
    const first: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
    if (first === "{") {
        return { next: langruntime.checkedAdd(position, 1), kind: 1, text: "" };
    }
    if (first === "}") {
        return { next: langruntime.checkedAdd(position, 1), kind: 2, text: "" };
    }
    if (first === delimiter) {
        return { next: langruntime.checkedAdd(position, 1), kind: 3, text: "" };
    }
    const quoted: boolean = first === "\"";
    if (quoted) {
        position = langruntime.checkedAdd(position, 1);
    }
    let characters: string[] = [];
    let retained: number = 0;
    let escaped: boolean = false;
    let finished: boolean = false;
    while (position < source.characters.length && finished === false) {
        const ch: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
        if (ch === "\\") {
            position = langruntime.checkedAdd(position, 1);
            if (position >= source.characters.length) {
                return { next: position, kind: 0, text: "" };
            }
            langruntime.pushChar(characters, langruntime.indexChar(source.characters, langruntime.checkedIndex(position)));
            retained = langruntime.checkedIndex(characters.length);
            escaped = langruntime.checkedBool(true);
            position = langruntime.checkedAdd(position, 1);
        }
        else if (quoted && ch === "\"") {
            position = langruntime.checkedIndex(arrayTextSkipSpace(source, langruntime.checkedAdd(position, 1)));
            if (position >= source.characters.length) {
                return { next: position, kind: 0, text: "" };
            }
            const following: string = langruntime.indexChar(source.characters, langruntime.checkedIndex(position));
            if (!(following === delimiter) && !(following === "}") && !(following === "{")) {
                return { next: position, kind: 0, text: "" };
            }
            retained = langruntime.checkedIndex(characters.length);
            finished = langruntime.checkedBool(true);
        }
        else if (quoted === false && (ch === delimiter || ch === "}")) {
            finished = langruntime.checkedBool(true);
        }
        else if (quoted === false && (ch === "\"" || ch === "{")) {
            return { next: position, kind: 0, text: "" };
        }
        else {
            langruntime.pushChar(characters, ch);
            if (arrayTextSpace(ch) === false) {
                retained = langruntime.checkedIndex(characters.length);
            }
            position = langruntime.checkedAdd(position, 1);
        }
    }
    if (finished === false) {
        return { next: position, kind: 0, text: "" };
    }
    let text: string = "";
    let index: number = 0;
    while (index < retained) {
        text = text + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    let nullToken: boolean = false;
    if (quoted === false && escaped === false && retained === 4) {
        nullToken = langruntime.checkedBool((langruntime.indexChar(characters, langruntime.checkedIndex(0)) === "N" || langruntime.indexChar(characters, langruntime.checkedIndex(0)) === "n") && (langruntime.indexChar(characters, langruntime.checkedIndex(1)) === "U" || langruntime.indexChar(characters, langruntime.checkedIndex(1)) === "u") && (langruntime.indexChar(characters, langruntime.checkedIndex(2)) === "L" || langruntime.indexChar(characters, langruntime.checkedIndex(2)) === "l") && (langruntime.indexChar(characters, langruntime.checkedIndex(3)) === "L" || langruntime.indexChar(characters, langruntime.checkedIndex(3)) === "l"));
    }
    if (nullToken) {
        return { next: position, kind: 5, text: text };
    }
    return { next: position, kind: 4, text: text };
}
function arrayTextResult(dimensions: ArrayDimension[], input: ArrayTextEvent[], error: number): ArrayTextPlan {
    dimensions = langruntime.checkedStructs(dimensions, copyArrayDimension);
    input = langruntime.checkedStructs(input, copyArrayTextEvent);
    error = langruntime.checkedIndex(error);
    let events: ArrayTextEvent[] = input;
    if (!(error === 0)) {
        langruntime.pushStruct(events, { kind: "Error", value: makeSqlError(error) }, copyArrayTextEvent);
    }
    return { kind: "Value", value: { state: 1, dimensions: dimensions, events: events } };
}
export function parseArrayText(input: TextValue, delimiter: string, nulls: number): ArrayTextPlan {
    delimiter = langruntime.checkedChar(delimiter);
    nulls = langruntime.checkedI32(nulls);
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    let dimensions: ArrayDimension[] = [];
    let events: ArrayTextEvent[] = [];
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        langruntime.pushStruct(events, { kind: "Error", value: error }, copyArrayTextEvent);
        return arrayTextResult(dimensions, events, 0);
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const characters: string[] = Array.from(value);
        const source: ArrayTextSource = { characters: characters };
        let index: number = 0;
        let levels: ArrayDimension[] = [];
        while (index < 6) {
            langruntime.pushStruct(dimensions, { lower: 1, length: langruntime.checkedSignedNegate(1) }, copyArrayDimension);
            langruntime.pushStruct(levels, { lower: 1, length: 0 }, copyArrayDimension);
            index = langruntime.checkedAdd(index, 1);
        }
        let position: number = arrayTextSkipSpace(source, 0);
        let rank: number = 0;
        while (position < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "[") {
            if (rank >= 6) {
                return arrayTextResult(dimensions, events, sqlErrorProgramLimit);
            }
            const first: ArrayTextBound = copyArrayTextBound(arrayTextReadBound(source, langruntime.checkedAdd(position, 1)));
            if (first.overflow) {
                return arrayTextResult(dimensions, events, sqlErrorProgramLimit);
            }
            if (first.found === false) {
                return arrayTextResult(dimensions, events, arrayTextInvalid);
            }
            position = langruntime.checkedIndex(first.next);
            let lower: bigint = 1n;
            let upper: bigint = first.value;
            if (position < source.characters.length && langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === ":") {
                lower = langruntime.checkedI64(first.value);
                const last: ArrayTextBound = copyArrayTextBound(arrayTextReadBound(source, langruntime.checkedAdd(position, 1)));
                if (last.overflow) {
                    return arrayTextResult(dimensions, events, sqlErrorProgramLimit);
                }
                if (last.found === false) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                upper = langruntime.checkedI64(last.value);
                position = langruntime.checkedIndex(last.next);
            }
            if (position >= source.characters.length || !(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "]")) {
                return arrayTextResult(dimensions, events, arrayTextInvalid);
            }
            if (upper < lower) {
                return arrayTextResult(dimensions, events, sqlErrorArraySubscript);
            }
            const length: bigint = langruntime.checkedI64Add(langruntime.checkedI64Subtract(upper, lower), 1n);
            if (upper === 2147483647n || length > 2147483647n) {
                return arrayTextResult(dimensions, events, sqlErrorProgramLimit);
            }
            dimensions[langruntime.checkedIndexIn(dimensions, rank)] = { lower: Number(BigInt.asIntN(32, langruntime.checkedI64(lower))), length: Number(BigInt.asIntN(32, langruntime.checkedI64(length))) };
            rank = langruntime.checkedAdd(rank, 1);
            position = langruntime.checkedIndex(arrayTextSkipSpace(source, langruntime.checkedAdd(position, 1)));
        }
        let frozen: boolean = rank > 0;
        if (frozen) {
            if (position >= source.characters.length || !(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "=")) {
                return arrayTextResult(dimensions, events, arrayTextInvalid);
            }
            position = langruntime.checkedIndex(arrayTextSkipSpace(source, langruntime.checkedAdd(position, 1)));
        }
        if (position >= source.characters.length || !(langruntime.indexChar(source.characters, langruntime.checkedIndex(position)) === "{")) {
            return arrayTextResult(dimensions, events, arrayTextInvalid);
        }
        let nesting: number = 0;
        let count: number = 0;
        let expectDelimiter: boolean = false;
        let completed: boolean = false;
        while (completed === false) {
            const token: ArrayTextToken = arrayTextReadToken(source, position, delimiter);
            position = langruntime.checkedIndex(token.next);
            const kind: number = token.kind;
            if (kind === 0) {
                return arrayTextResult(dimensions, events, arrayTextInvalid);
            }
            if (kind === 1) {
                if (expectDelimiter) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                if (nesting >= 6) {
                    return arrayTextResult(dimensions, events, sqlErrorProgramLimit);
                }
                levels[langruntime.checkedIndexIn(levels, nesting)] = { lower: 1, length: 0 };
                nesting = langruntime.checkedAdd(nesting, 1);
                if (nesting > rank) {
                    if (frozen) {
                        return arrayTextResult(dimensions, events, arrayTextInvalid);
                    }
                    rank = langruntime.checkedIndex(nesting);
                }
            }
            if (kind === 2) {
                const level: ArrayDimension = langruntime.indexStruct(levels, langruntime.checkedIndex(langruntime.checkedSubtract(nesting, 1)), copyArrayDimension);
                if (level.length > 0 && expectDelimiter === false) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                nesting = langruntime.checkedIndex(langruntime.checkedSubtract(nesting, 1));
                if (nesting > 0) {
                    const outer: ArrayDimension = langruntime.indexStruct(levels, langruntime.checkedIndex(langruntime.checkedSubtract(nesting, 1)), copyArrayDimension);
                    levels[langruntime.checkedIndexIn(levels, langruntime.checkedSubtract(nesting, 1))] = { lower: 1, length: langruntime.checkedSignedAdd(outer.length, 1) };
                }
                const dimension: ArrayDimension = langruntime.indexStruct(dimensions, langruntime.checkedIndex(nesting), copyArrayDimension);
                if (dimension.length < 0) {
                    dimensions[langruntime.checkedIndexIn(dimensions, nesting)] = { lower: dimension.lower, length: level.length };
                }
                else if (!(dimension.length === level.length)) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                expectDelimiter = langruntime.checkedBool(true);
                completed = langruntime.checkedBool(nesting === 0);
            }
            if (kind === 3) {
                if (expectDelimiter === false) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                expectDelimiter = langruntime.checkedBool(false);
            }
            let element: boolean = false;
            if (kind === 4) {
                const text: string = langruntime.checkedString(token.text);
                if (expectDelimiter) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                langruntime.pushStruct(events, { kind: "Text", value: text }, copyArrayTextEvent);
                element = langruntime.checkedBool(true);
            }
            if (kind === 5) {
                const text: string = token.text;
                if (expectDelimiter) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                if (nulls === 1) {
                    langruntime.pushStruct(events, { kind: "Null" }, copyArrayTextEvent);
                }
                else if (nulls === 0) {
                    langruntime.pushStruct(events, { kind: "Text", value: text }, copyArrayTextEvent);
                }
                else {
                    langruntime.pushStruct(events, { kind: "Unknown" }, copyArrayTextEvent);
                    return arrayTextResult(dimensions, events, 0);
                }
                element = langruntime.checkedBool(true);
            }
            if (element) {
                count = langruntime.checkedAdd(count, 1);
                frozen = langruntime.checkedBool(true);
                if (!(nesting === rank)) {
                    return arrayTextResult(dimensions, events, arrayTextInvalid);
                }
                const level: ArrayDimension = langruntime.indexStruct(levels, langruntime.checkedIndex(langruntime.checkedSubtract(nesting, 1)), copyArrayDimension);
                levels[langruntime.checkedIndexIn(levels, langruntime.checkedSubtract(nesting, 1))] = { lower: 1, length: langruntime.checkedSignedAdd(level.length, 1) };
                expectDelimiter = langruntime.checkedBool(true);
            }
        }
        position = langruntime.checkedIndex(arrayTextSkipSpace(source, position));
        if (!(position === source.characters.length)) {
            return arrayTextResult(dimensions, events, arrayTextInvalid);
        }
        let resultDimensions: ArrayDimension[] = [];
        if (count > 0) {
            index = langruntime.checkedIndex(0);
            while (index < rank) {
                langruntime.pushStruct(resultDimensions, langruntime.indexStruct(dimensions, langruntime.checkedIndex(index), copyArrayDimension), copyArrayDimension);
                index = langruntime.checkedAdd(index, 1);
            }
        }
        return arrayTextResult(resultDimensions, events, 0);
    }
    return { kind: "Unknown" };
}
export function arrayTextEventCount(input: ArrayTextPayload): Int4Value {
    return { kind: "Value", value: langruntime.checkedI32(langruntime.checkedIndex(input.events.length)) };
}
export function arrayTextEventAt(input: ArrayTextPayload, index: Int4Value): TextValue {
    if (index.kind === "Error") {
        const error: SqlError = index.value;
        return { kind: "Error", value: error };
    }
    if (index.kind === "Value") {
        const position: number = langruntime.checkedI32(index.value);
        if (position < 0) {
            return { kind: "Unknown" };
        }
        const offset: number = langruntime.indexFromI32(position, 0);
        if (offset >= input.events.length) {
            return { kind: "Unknown" };
        }
        const event: ArrayTextEvent = copyArrayTextEvent(langruntime.indexStruct(input.events, langruntime.checkedIndex(offset), copyArrayTextEvent));
        if (event.kind === "Text") {
            const text: string = langruntime.checkedString(event.value);
            return { kind: "Value", value: text };
        }
        if (event.kind === "Null") {
            return { kind: "Null" };
        }
        if (event.kind === "Error") {
            const error: SqlError = event.value;
            return { kind: "Error", value: error };
        }
    }
    return { kind: "Unknown" };
}
export function finishArrayText(plan: ArrayTextPlan, converted: ArrayArguments): ArrayValue {
    plan = copyArrayTextPlan(plan);
    converted = copyArrayArguments(converted);
    if (converted.kind === "Error") {
        const error: SqlError = converted.value;
        return { kind: "Error", value: error };
    }
    if (plan.kind === "Null") {
        return { kind: "Null" };
    }
    if (plan.kind === "Value") {
        const payload: ArrayTextPayload = copyArrayTextPayload(plan.value);
        let index: number = 0;
        while (index < payload.events.length) {
            const event: ArrayTextEvent = copyArrayTextEvent(langruntime.indexStruct(payload.events, langruntime.checkedIndex(index), copyArrayTextEvent));
            if (event.kind === "Error") {
                const error: SqlError = event.value;
                return { kind: "Error", value: error };
            }
            index = langruntime.checkedAdd(index, 1);
        }
        if (converted.kind === "Value") {
            const value: ArrayPayload = copyArrayPayload(converted.value);
            index = langruntime.checkedIndex(0);
            while (index < value.elements.length) {
                const element: ArrayElement = copyArrayElement(langruntime.indexStruct(value.elements, langruntime.checkedIndex(index), copyArrayElement));
                if (element.kind === "Unknown") {
                    if (!(value.elementType === "pg_catalog.name")) {
                        return { kind: "Unknown" };
                    }
                }
                index = langruntime.checkedAdd(index, 1);
            }
            return makeArrayValue({ nullBitmap: value.nullBitmap, elementType: value.elementType, elementKind: value.elementKind, dimensions: payload.dimensions, elements: value.elements });
        }
    }
    return { kind: "Unknown" };
}
export function prepareArrayText(input: TextValue, boxDelimiter: boolean, nulls: number): ArrayTextPayload {
    boxDelimiter = langruntime.checkedBool(boxDelimiter);
    nulls = langruntime.checkedI32(nulls);
    let delimiter: string = ",";
    if (boxDelimiter) {
        delimiter = langruntime.checkedChar(";");
    }
    const plan: ArrayTextPlan = parseArrayText(input, delimiter, nulls);
    if (plan.kind === "Value") {
        const payload: ArrayTextPayload = copyArrayTextPayload(plan.value);
        return payload;
    }
    let state: number = langruntime.checkedSignedNegate(1);
    if (plan.kind === "Null") {
        state = langruntime.checkedI32(0);
    }
    const dimensions: ArrayDimension[] = [];
    const events: ArrayTextEvent[] = [];
    return { state: state, dimensions: dimensions, events: events };
}
export function arrayTextHasEvent(input: ArrayTextPayload, index: Int4Value): boolean {
    if (!(input.state === 1)) {
        return false;
    }
    if (index.kind === "Value") {
        const position: number = langruntime.checkedI32(index.value);
        return position >= 0 && ((BigInt(langruntime.checkedI32(position))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.events.length)))))));
    }
    return false;
}
export function arrayTextEventNeedsInput(input: ArrayTextPayload, index: Int4Value): boolean {
    input = copyArrayTextPayload(input);
    if (index.kind === "Value") {
        const position: number = langruntime.checkedI32(index.value);
        if (position >= 0 && (BigInt(langruntime.checkedI32(position))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.events.length))))))) {
            const event: ArrayTextEvent = copyArrayTextEvent(langruntime.indexStruct(input.events, langruntime.checkedIndex(langruntime.indexFromI32(position, 0)), copyArrayTextEvent));
            if (event.kind === "Error") {
                return false;
            }
            return true;
        }
    }
    return false;
}
export function arrayTextNextIndex(input: Int4Value): Int4Value {
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        if (value < 2147483647) {
            return { kind: "Value", value: langruntime.checkedSignedAdd(value, 1) };
        }
    }
    return { kind: "Unknown" };
}
export function finishPreparedArrayText(input: ArrayTextPayload, converted: ArrayArguments): ArrayValue {
    input = copyArrayTextPayload(input);
    converted = copyArrayArguments(converted);
    if (input.state === 0) {
        return { kind: "Null" };
    }
    if (!(input.state === 1)) {
        return { kind: "Unknown" };
    }
    return finishArrayText({ kind: "Value", value: input }, converted);
}
export interface ArraySubscriptBound {
    provided: boolean;
    state: number;
    value: number;
}
function copyArraySubscriptBound(value: ArraySubscriptBound): ArraySubscriptBound {
    return { provided: langruntime.checkedBool(value.provided), state: langruntime.checkedI32(value.state), value: langruntime.checkedI32(value.value) };
}
export interface ArraySubscriptPayload {
    upper: ArraySubscriptBound[];
    lower: ArraySubscriptBound[];
}
function copyArraySubscriptPayload(value: ArraySubscriptPayload): ArraySubscriptPayload {
    return { upper: langruntime.checkedStructs(value.upper, copyArraySubscriptBound), lower: langruntime.checkedStructs(value.lower, copyArraySubscriptBound) };
}
export type ArraySubscripts = {
    kind: "Error";
    value: SqlError;
} | {
    kind: "Value";
    value: ArraySubscriptPayload;
};
export function copyArraySubscripts(value: ArraySubscripts): ArraySubscripts {
    switch (value.kind) {
        case "Error": return { kind: "Error", value: value.value };
        case "Value": return { kind: "Value", value: copyArraySubscriptPayload(value.value) };
    }
}
export function makeArraySubscripts(): ArraySubscripts {
    const upper: ArraySubscriptBound[] = [];
    const lower: ArraySubscriptBound[] = [];
    return { kind: "Value", value: { upper: upper, lower: lower } };
}
export function appendArraySubscript(input: ArraySubscripts, index: Int4Value, isLower: boolean, provided: boolean): ArraySubscripts {
    input = copyArraySubscripts(input);
    isLower = langruntime.checkedBool(isLower);
    provided = langruntime.checkedBool(provided);
    if (input.kind === "Error") {
        return input;
    }
    if (index.kind === "Error") {
        const error: SqlError = index.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Value") {
        const payload: ArraySubscriptPayload = copyArraySubscriptPayload(input.value);
        let state: number = langruntime.checkedSignedNegate(1);
        let value: number = 0;
        if (index.kind === "Null") {
            state = langruntime.checkedI32(0);
        }
        if (index.kind === "Value") {
            const number: number = langruntime.checkedI32(index.value);
            state = langruntime.checkedI32(1);
            value = langruntime.checkedI32(number);
        }
        const bound: ArraySubscriptBound = copyArraySubscriptBound({ provided: provided, state: state, value: value });
        let upper: ArraySubscriptBound[] = payload.upper;
        let lower: ArraySubscriptBound[] = payload.lower;
        if (isLower) {
            langruntime.pushStruct(lower, bound, copyArraySubscriptBound);
        }
        else {
            langruntime.pushStruct(upper, bound, copyArraySubscriptBound);
        }
        return { kind: "Value", value: { upper: upper, lower: lower } };
    }
    return input;
}
export function arraySubscriptContinues(input: ArrayValue): boolean {
    input = copyArrayValue(input);
    if (input.kind === "Value") {
        return true;
    }
    return false;
}
export function arraySubscriptInitial(input: ArrayValue): ArrayElement {
    input = copyArrayValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    return { kind: "Unknown" };
}
function arraySubscriptState(input: ArraySubscriptPayload): number {
    let state: number = 1;
    let position: number = 0;
    while (position < langruntime.checkedAdd(input.upper.length, input.lower.length)) {
        let bound: ArraySubscriptBound = copyArraySubscriptBound({ provided: false, state: 1, value: 0 });
        if (position < input.upper.length) {
            bound = copyArraySubscriptBound(langruntime.indexStruct(input.upper, langruntime.checkedIndex(position), copyArraySubscriptBound));
        }
        else {
            bound = copyArraySubscriptBound(langruntime.indexStruct(input.lower, langruntime.checkedIndex(langruntime.checkedSubtract(position, input.upper.length)), copyArraySubscriptBound));
        }
        if (bound.provided) {
            if (bound.state === langruntime.checkedSignedNegate(1)) {
                state = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
            }
            if (bound.state === 0 && !(state === langruntime.checkedSignedNegate(1))) {
                state = langruntime.checkedI32(0);
            }
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return state;
}
export function arrayFetchSubscript(input: ArrayValue, indices: ArraySubscripts): ArrayElement {
    input = copyArrayValue(input);
    indices = copyArraySubscripts(indices);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (indices.kind === "Error") {
        const error: SqlError = indices.value;
        return { kind: "Error", value: error };
    }
    if (indices.kind === "Value") {
        const bounds: ArraySubscriptPayload = copyArraySubscriptPayload(indices.value);
        const state: number = arraySubscriptState(bounds);
        if (state === langruntime.checkedSignedNegate(1)) {
            return { kind: "Unknown" };
        }
        if (state === 0) {
            return { kind: "Null" };
        }
        if (input.kind === "Value") {
            const payload: ArrayPayload = copyArrayPayload(input.value);
            if (!(bounds.upper.length === payload.dimensions.length) || bounds.upper.length === 0 || !(bounds.lower.length === 0)) {
                return { kind: "Null" };
            }
            let offset: bigint = 0n;
            let depth: number = 0;
            while (depth < payload.dimensions.length) {
                const dimension: ArrayDimension = langruntime.indexStruct(payload.dimensions, langruntime.checkedIndex(depth), copyArrayDimension);
                const index: ArraySubscriptBound = copyArraySubscriptBound(langruntime.indexStruct(bounds.upper, langruntime.checkedIndex(depth), copyArraySubscriptBound));
                if (index.provided === false) {
                    return { kind: "Unknown" };
                }
                if (langruntime.checkedI64Add((BigInt(langruntime.checkedI32(dimension.lower))), (BigInt(langruntime.checkedI32(dimension.length)))) > 2147483647n) {
                    return { kind: "Null" };
                }
                const relative: bigint = langruntime.checkedI64Subtract((BigInt(langruntime.checkedI32(index.value))), (BigInt(langruntime.checkedI32(dimension.lower))));
                if (relative < 0n || relative >= BigInt(langruntime.checkedI32(dimension.length))) {
                    return { kind: "Null" };
                }
                offset = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(offset, (BigInt(langruntime.checkedI32(dimension.length)))), relative));
                depth = langruntime.checkedAdd(depth, 1);
            }
            const position: number = langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64(offset))), payload.elements.length);
            if (position < payload.elements.length) {
                return copyArrayElement(langruntime.indexStruct(payload.elements, langruntime.checkedIndex(position), copyArrayElement));
            }
        }
    }
    return { kind: "Unknown" };
}
interface ArraySliceAxis {
    start: number;
    length: number;
    position: number;
}
function copyArraySliceAxis(value: ArraySliceAxis): ArraySliceAxis {
    return { start: langruntime.checkedI32(value.start), length: langruntime.checkedI32(value.length), position: langruntime.checkedI32(value.position) };
}
function arrayEmptyLike(input: ArrayPayload): ArrayValue {
    const identity: string = input.elementType;
    const dimensions: ArrayDimension[] = [];
    const elements: ArrayElement[] = [];
    return makeArrayValue({ nullBitmap: { kind: "Value", value: false }, elementType: identity, elementKind: input.elementKind, dimensions: dimensions, elements: elements });
}
export function arraySliceSubscript(input: ArrayValue, indices: ArraySubscripts): ArrayValue {
    input = copyArrayValue(input);
    indices = copyArraySubscripts(indices);
    if (input.kind === "Error") {
        return input;
    }
    if (input.kind === "Null") {
        return input;
    }
    if (input.kind === "Unknown") {
        return input;
    }
    if (indices.kind === "Error") {
        const error: SqlError = indices.value;
        return { kind: "Error", value: error };
    }
    if (indices.kind === "Value") {
        const bounds: ArraySubscriptPayload = copyArraySubscriptPayload(indices.value);
        const state: number = arraySubscriptState(bounds);
        if (state === langruntime.checkedSignedNegate(1)) {
            return { kind: "Unknown" };
        }
        if (state === 0) {
            return { kind: "Null" };
        }
        if (input.kind === "Value") {
            const payload: ArrayPayload = copyArrayPayload(input.value);
            if (!(bounds.upper.length === bounds.lower.length) || bounds.upper.length === 0) {
                return { kind: "Unknown" };
            }
            if (bounds.upper.length > payload.dimensions.length || payload.dimensions.length === 0) {
                return arrayEmptyLike(payload);
            }
            let axes: ArraySliceAxis[] = [];
            let dimensions: ArrayDimension[] = [];
            let depth: number = 0;
            let count: number = 1;
            while (depth < payload.dimensions.length) {
                const dimension: ArrayDimension = langruntime.indexStruct(payload.dimensions, langruntime.checkedIndex(depth), copyArrayDimension);
                let low: bigint = BigInt(langruntime.checkedI32(dimension.lower));
                let high: bigint = langruntime.checkedI64Subtract(langruntime.checkedI64Add(low, (BigInt(langruntime.checkedI32(dimension.length)))), 1n);
                if (depth < bounds.upper.length) {
                    const first: ArraySubscriptBound = copyArraySubscriptBound(langruntime.indexStruct(bounds.lower, langruntime.checkedIndex(depth), copyArraySubscriptBound));
                    const last: ArraySubscriptBound = copyArraySubscriptBound(langruntime.indexStruct(bounds.upper, langruntime.checkedIndex(depth), copyArraySubscriptBound));
                    if (first.provided && (BigInt(langruntime.checkedI32(first.value))) > low) {
                        low = langruntime.checkedI64(BigInt(langruntime.checkedI32(first.value)));
                    }
                    if (last.provided && langruntime.checkedI64Add((BigInt(langruntime.checkedI32(dimension.lower))), (BigInt(langruntime.checkedI32(dimension.length)))) <= 2147483647n && (BigInt(langruntime.checkedI32(last.value))) < high) {
                        high = langruntime.checkedI64(BigInt(langruntime.checkedI32(last.value)));
                    }
                }
                if (low > high) {
                    return arrayEmptyLike(payload);
                }
                const length: number = Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Add(langruntime.checkedI64Subtract(high, low), 1n)))));
                const start: number = Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Subtract(low, (BigInt(langruntime.checkedI32(dimension.lower))))))));
                langruntime.pushStruct(axes, { start: start, length: length, position: 0 }, copyArraySliceAxis);
                langruntime.pushStruct(dimensions, { lower: 1, length: length }, copyArrayDimension);
                count = langruntime.checkedI32(langruntime.checkedSignedMultiply(count, length));
                depth = langruntime.checkedAdd(depth, 1);
            }
            let elements: ArrayElement[] = [];
            let position: number = 0;
            while (position < count) {
                let offset: bigint = 0n;
                depth = langruntime.checkedIndex(0);
                while (depth < axes.length) {
                    const axis: ArraySliceAxis = copyArraySliceAxis(langruntime.indexStruct(axes, langruntime.checkedIndex(depth), copyArraySliceAxis));
                    offset = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(offset, (BigInt(langruntime.checkedI32(langruntime.indexStruct(payload.dimensions, langruntime.checkedIndex(depth), copyArrayDimension).length)))), (BigInt(langruntime.checkedI32((langruntime.checkedSignedAdd(axis.start, axis.position)))))));
                    depth = langruntime.checkedAdd(depth, 1);
                }
                const index: number = langruntime.indexFromI32(Number(BigInt.asIntN(32, langruntime.checkedI64(offset))), payload.elements.length);
                if (index >= payload.elements.length) {
                    return { kind: "Unknown" };
                }
                langruntime.pushStruct(elements, copyArrayElement(langruntime.indexStruct(payload.elements, langruntime.checkedIndex(index), copyArrayElement)), copyArrayElement);
                position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
                depth = langruntime.checkedIndex(axes.length);
                while (depth > 0) {
                    depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
                    const axis: ArraySliceAxis = copyArraySliceAxis(langruntime.indexStruct(axes, langruntime.checkedIndex(depth), copyArraySliceAxis));
                    const next: number = langruntime.checkedSignedAdd(axis.position, 1);
                    if (next < axis.length) {
                        axes[langruntime.checkedIndexIn(axes, depth)] = copyArraySliceAxis({ start: axis.start, length: axis.length, position: next });
                        break;
                    }
                    axes[langruntime.checkedIndexIn(axes, depth)] = copyArraySliceAxis({ start: axis.start, length: axis.length, position: 0 });
                }
            }
            return makeArrayValue({ nullBitmap: payload.nullBitmap, elementType: payload.elementType, elementKind: payload.elementKind, dimensions: dimensions, elements: elements });
        }
    }
    return { kind: "Unknown" };
}
const arrayComparisonUndefined = 6822435;
const arrayComparisonTypeMismatch = 6822148;
export interface ArrayComparisonPayload {
    left: ArrayElement[];
    right: ArrayElement[];
    limit: number;
    state: number;
    error: SqlError;
    tail: number;
    value: number;
}
function copyArrayComparisonPayload(value: ArrayComparisonPayload): ArrayComparisonPayload {
    return { left: langruntime.checkedStructs(value.left, copyArrayElement), right: langruntime.checkedStructs(value.right, copyArrayElement), limit: langruntime.checkedIndex(value.limit), state: langruntime.checkedI32(value.state), error: value.error, tail: langruntime.checkedI32(value.tail), value: langruntime.checkedI32(value.value) };
}
export type ArrayComparisonPlan = {
    kind: "Value";
    value: ArrayComparisonPayload;
};
function copyArrayComparisonPlan(value: ArrayComparisonPlan): ArrayComparisonPlan {
    switch (value.kind) {
        case "Value": return { kind: "Value", value: copyArrayComparisonPayload(value.value) };
    }
}
function arrayComparisonState(state: number, error: SqlError, value: number): ArrayComparisonPayload {
    state = langruntime.checkedI32(state);
    value = langruntime.checkedI32(value);
    const left: ArrayElement[] = [];
    const right: ArrayElement[] = [];
    return { left: left, right: right, limit: 0, state: state, error: error, tail: 0, value: value };
}
function arrayShapeOrder(left: ArrayPayload, right: ArrayPayload): number {
    if (left.elements.length < right.elements.length) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.elements.length > right.elements.length) {
        return 1;
    }
    if (left.dimensions.length < right.dimensions.length) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.dimensions.length > right.dimensions.length) {
        return 1;
    }
    let position: number = 0;
    while (position < left.dimensions.length) {
        if (langruntime.indexStruct(left.dimensions, langruntime.checkedIndex(position), copyArrayDimension).length < langruntime.indexStruct(right.dimensions, langruntime.checkedIndex(position), copyArrayDimension).length) {
            return langruntime.checkedSignedNegate(1);
        }
        if (langruntime.indexStruct(left.dimensions, langruntime.checkedIndex(position), copyArrayDimension).length > langruntime.indexStruct(right.dimensions, langruntime.checkedIndex(position), copyArrayDimension).length) {
            return 1;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    position = langruntime.checkedIndex(0);
    while (position < left.dimensions.length) {
        if (langruntime.indexStruct(left.dimensions, langruntime.checkedIndex(position), copyArrayDimension).lower < langruntime.indexStruct(right.dimensions, langruntime.checkedIndex(position), copyArrayDimension).lower) {
            return langruntime.checkedSignedNegate(1);
        }
        if (langruntime.indexStruct(left.dimensions, langruntime.checkedIndex(position), copyArrayDimension).lower > langruntime.indexStruct(right.dimensions, langruntime.checkedIndex(position), copyArrayDimension).lower) {
            return 1;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    return 0;
}
export function prepareArrayComparison(left: ArrayValue, right: ArrayValue, equality: boolean, available: boolean): ArrayComparisonPayload {
    left = copyArrayValue(left);
    right = copyArrayValue(right);
    equality = langruntime.checkedBool(equality);
    available = langruntime.checkedBool(available);
    if (left.kind === "Error") {
        const error: SqlError = left.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (right.kind === "Error") {
        const error: SqlError = right.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (left.kind === "Unknown") {
        return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
    }
    if (right.kind === "Unknown") {
        return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
    }
    if (left.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 0);
    }
    if (right.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 0);
    }
    if (left.kind === "Value") {
        const a: ArrayPayload = copyArrayPayload(left.value);
        if (right.kind === "Value") {
            const b: ArrayPayload = copyArrayPayload(right.value);
            if (!(a.elementType === b.elementType) || !(a.elementKind === b.elementKind)) {
                return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayComparisonTypeMismatch), 0);
            }
            const tail: number = arrayShapeOrder(a, b);
            if (equality && !(tail === 0)) {
                return arrayComparisonState(2, makeSqlError(0), 1);
            }
            if (available === false) {
                return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayComparisonUndefined), 0);
            }
            let limit: number = a.elements.length;
            if (b.elements.length < limit) {
                limit = langruntime.checkedIndex(b.elements.length);
            }
            return { left: a.elements, right: b.elements, limit: limit, state: 1, error: makeSqlError(0), tail: tail, value: 0 };
        }
    }
    return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
}
export function arrayComparisonInitial(input: ArrayComparisonPayload): Int4Value {
    if (input.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: input.error };
    }
    if (input.state === langruntime.checkedSignedNegate(1)) {
        return { kind: "Unknown" };
    }
    if (input.state === 0) {
        return { kind: "Null" };
    }
    return { kind: "Value", value: input.value };
}
export function arrayComparisonContinues(input: ArrayComparisonPayload, index: Int4Value, result: Int4Value): boolean {
    if (result.kind === "Value") {
        const comparison: number = langruntime.checkedI32(result.value);
        if (index.kind === "Value") {
            const offset: number = langruntime.checkedI32(index.value);
            return input.state === 1 && comparison === 0 && offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.limit))))));
        }
    }
    return false;
}
export function arrayComparisonElementAt(input: ArrayComparisonPayload, index: Int4Value, right: boolean): ArrayElement {
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        const position: number = langruntime.indexFromI32(offset, input.limit);
        if (offset >= 0 && position < input.limit) {
            if (right) {
                return copyArrayElement(langruntime.indexStruct(input.right, langruntime.checkedIndex(position), copyArrayElement));
            }
            return copyArrayElement(langruntime.indexStruct(input.left, langruntime.checkedIndex(position), copyArrayElement));
        }
    }
    return { kind: "Unknown" };
}
export function arrayComparisonPair(left: ArrayElement, right: ArrayElement, equality: boolean): Int4Value {
    left = copyArrayElement(left);
    right = copyArrayElement(right);
    equality = langruntime.checkedBool(equality);
    if (left.kind === "Error") {
        const error: SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (left.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (right.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    let leftNull: boolean = false;
    let rightNull: boolean = false;
    if (left.kind === "Null") {
        leftNull = langruntime.checkedBool(true);
    }
    if (right.kind === "Null") {
        rightNull = langruntime.checkedBool(true);
    }
    if (leftNull && rightNull) {
        return { kind: "Value", value: 0 };
    }
    if (leftNull) {
        return { kind: "Value", value: 1 };
    }
    if (rightNull) {
        if (equality) {
            return { kind: "Value", value: 1 };
        }
        return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
    }
    return { kind: "Null" };
}
export function arrayPairRequiresScalar(input: Int4Value): boolean {
    if (input.kind === "Null") {
        return true;
    }
    return false;
}
export function arrayEqualityStep(input: BoolValue): Int4Value {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Value") {
        const value: boolean = langruntime.checkedBool(input.value);
        if (value) {
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Value", value: 1 };
}
export function arrayOrderStep(input: Int4Value): Int4Value {
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        if (value < 0) {
            return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
        }
        if (value > 0) {
            return { kind: "Value", value: 1 };
        }
        return { kind: "Value", value: 0 };
    }
    if (input.kind === "Null") {
        return { kind: "Unknown" };
    }
    return input;
}
export function arrayOrderFromEquality(input: BoolValue): Int4Value {
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Value") {
        const value: boolean = langruntime.checkedBool(input.value);
        if (value) {
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Unknown" };
}
export function finishArrayComparison(input: ArrayComparisonPayload, result: Int4Value): Int4Value {
    if (input.state === 1) {
        if (result.kind === "Value") {
            const value: number = langruntime.checkedI32(result.value);
            if (value === 0) {
                return { kind: "Value", value: input.tail };
            }
        }
    }
    return result;
}
export function prepareArrayMembership(left: ArrayValue, right: ArrayValue, reverse: boolean, available: boolean): ArrayComparisonPayload {
    left = copyArrayValue(left);
    right = copyArrayValue(right);
    reverse = langruntime.checkedBool(reverse);
    available = langruntime.checkedBool(available);
    const payload: ArrayComparisonPayload = prepareArrayComparison(left, right, false, available);
    if (payload.state === 1 && reverse) {
        return { left: payload.right, right: payload.left, limit: payload.limit, state: payload.state, error: payload.error, tail: payload.tail, value: payload.value };
    }
    return payload;
}
export function arrayMembershipInitial(input: ArrayComparisonPayload, all: boolean): BoolValue {
    input = copyArrayComparisonPayload(input);
    all = langruntime.checkedBool(all);
    if (input.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: input.error };
    }
    if (input.state === langruntime.checkedSignedNegate(1)) {
        return { kind: "Unknown" };
    }
    if (input.state === 0) {
        return { kind: "Null" };
    }
    return { kind: "Value", value: all };
}
export function arrayMembershipContinues(input: ArrayComparisonPayload, index: Int4Value, result: BoolValue, all: boolean): boolean {
    input = copyArrayComparisonPayload(input);
    all = langruntime.checkedBool(all);
    if (!(input.state === 1)) {
        return false;
    }
    const outcome: CheckOutcome = checkFromBool(result);
    if (all && andStops(outcome)) {
        return false;
    }
    if (all === false && orStops(outcome)) {
        return false;
    }
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        return offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.left.length))))));
    }
    return false;
}
export function arrayMembershipElementAt(input: ArrayComparisonPayload, index: Int4Value, right: boolean): ArrayElement {
    input = copyArrayComparisonPayload(input);
    right = langruntime.checkedBool(right);
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        if (right) {
            const position: number = langruntime.indexFromI32(offset, input.right.length);
            if (offset >= 0 && position < input.right.length) {
                return copyArrayElement(langruntime.indexStruct(input.right, langruntime.checkedIndex(position), copyArrayElement));
            }
        }
        else {
            const position: number = langruntime.indexFromI32(offset, input.left.length);
            if (offset >= 0 && position < input.left.length) {
                return copyArrayElement(langruntime.indexStruct(input.left, langruntime.checkedIndex(position), copyArrayElement));
            }
        }
    }
    return { kind: "Unknown" };
}
export function arrayMembershipMatchInitial(input: ArrayComparisonPayload, index: Int4Value): BoolValue {
    input = copyArrayComparisonPayload(input);
    const source: ArrayElement = arrayMembershipElementAt(input, index, false);
    if (source.kind === "Error") {
        const error: SqlError = source.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Value", value: false };
}
export function arrayMembershipScanContinues(input: ArrayComparisonPayload, sourceIndex: Int4Value, index: Int4Value, matched: BoolValue): boolean {
    input = copyArrayComparisonPayload(input);
    if (orStops(checkFromBool(matched))) {
        return false;
    }
    const source: ArrayElement = arrayMembershipElementAt(input, sourceIndex, false);
    if (source.kind === "Null") {
        return false;
    }
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        return offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.right.length))))));
    }
    return false;
}
export function arrayMembershipPair(left: ArrayElement, right: ArrayElement): Int4Value {
    left = copyArrayElement(left);
    right = copyArrayElement(right);
    if (left.kind === "Null") {
        return { kind: "Value", value: 1 };
    }
    if (right.kind === "Null") {
        return { kind: "Value", value: 1 };
    }
    return arrayComparisonPair(left, right, true);
}
export function arrayMembershipMatchStep(matched: BoolValue, comparison: Int4Value): BoolValue {
    let value: BoolValue = { kind: "Unknown" };
    if (comparison.kind === "Value") {
        const result: number = langruntime.checkedI32(comparison.value);
        value = { kind: "Value", value: result === 0 };
    }
    if (comparison.kind === "Error") {
        const error: SqlError = comparison.value;
        value = { kind: "Error", value: error };
    }
    return boolFromCheck(orFinish(checkFromBool(matched), checkFromBool(value)));
}
export function arrayMembershipFinishStep(result: BoolValue, matched: BoolValue, all: boolean): BoolValue {
    all = langruntime.checkedBool(all);
    if (all) {
        return boolFromCheck(andFinish(checkFromBool(result), checkFromBool(matched)));
    }
    return boolFromCheck(orFinish(checkFromBool(result), checkFromBool(matched)));
}
export function arrayCoercionDeferred(input: ArrayElement): ArrayElement {
    input = copyArrayElement(input);
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Unknown" };
}
export function finishArrayCoercion(input: ArrayOutputPayload, converted: ArrayArguments, binary: boolean): ArrayValue {
    input = copyArrayOutputPayload(input);
    converted = copyArrayArguments(converted);
    binary = langruntime.checkedBool(binary);
    if (input.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: input.error };
    }
    if (input.state === langruntime.checkedSignedNegate(1)) {
        return { kind: "Unknown" };
    }
    if (input.state === 0) {
        return { kind: "Null" };
    }
    if (converted.kind === "Error") {
        const error: SqlError = converted.value;
        return { kind: "Error", value: error };
    }
    if (converted.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(converted.value);
        if (!(value.elements.length === input.elements.length)) {
            return { kind: "Unknown" };
        }
        let nullBitmap: BoolValue = value.nullBitmap;
        if (binary) {
            nullBitmap = input.nullBitmap;
        }
        return makeArrayValue({ nullBitmap: nullBitmap, elementType: value.elementType, elementKind: value.elementKind, dimensions: input.dimensions, elements: value.elements });
    }
    return { kind: "Unknown" };
}
const arraySearchMultidimensional = 466560;
const arraySearchNullStart = 3452548;
const arrayBucketMultidimensional = 3452630;
const arrayBucketNullElement = 3452548;
export function prepareArrayBucket(needle: ArrayElement, input: ArrayValue, available: boolean): ArrayComparisonPayload {
    if (needle.kind === "Error") {
        const error: SqlError = needle.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (needle.kind === "Unknown") {
        return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
    }
    if (input.kind === "Unknown") {
        return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
    }
    if (needle.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 0);
    }
    if (input.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 0);
    }
    if (input.kind === "Value") {
        const array: ArrayPayload = copyArrayPayload(input.value);
        if (array.dimensions.length > 1) {
            return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayBucketMultidimensional), 0);
        }
        let knownNull: boolean = false;
        let unknownNull: boolean = false;
        let position: number = 0;
        while (position < array.elements.length) {
            const cell: ArrayElement = copyArrayElement(langruntime.indexStruct(array.elements, langruntime.checkedIndex(position), copyArrayElement));
            if (cell.kind === "Error") {
                const error: SqlError = cell.value;
                return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
            }
            if (cell.kind === "Null") {
                knownNull = langruntime.checkedBool(true);
            }
            if (cell.kind === "Unknown") {
                unknownNull = langruntime.checkedBool(true);
            }
            position = langruntime.checkedAdd(position, 1);
        }
        if (knownNull) {
            return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayBucketNullElement), 0);
        }
        if (unknownNull) {
            return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
        }
        if (available === false) {
            return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayComparisonUndefined), 0);
        }
        let needles: ArrayElement[] = [];
        langruntime.pushStruct(needles, needle, copyArrayElement);
        return { limit: array.elements.length, left: array.elements, right: needles, state: 1, error: makeSqlError(0), tail: 0, value: 0 };
    }
    return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
}
export function arrayBucketLimit(input: ArrayComparisonPayload): Int4Value {
    if (input.state === 1) {
        return { kind: "Value", value: langruntime.checkedI32(langruntime.checkedIndex(input.limit)) };
    }
    return arrayComparisonInitial(input);
}
export function arrayBucketOperand(input: ArrayComparisonPayload): ArrayElement {
    if (input.state === 1 && input.right.length === 1) {
        return copyArrayElement(langruntime.indexStruct(input.right, langruntime.checkedIndex(0), copyArrayElement));
    }
    return { kind: "Unknown" };
}
export function arrayBucketContinues(low: Int4Value, high: Int4Value): boolean {
    if (low.kind === "Value") {
        const left: number = langruntime.checkedI32(low.value);
        if (high.kind === "Value") {
            const right: number = langruntime.checkedI32(high.value);
            return left >= 0 && left < right;
        }
    }
    return false;
}
export function arrayBucketMidpoint(low: Int4Value, high: Int4Value): Int4Value {
    if (low.kind === "Value") {
        const left: number = langruntime.checkedI32(low.value);
        if (high.kind === "Value") {
            const right: number = langruntime.checkedI32(high.value);
            if (left >= 0 && left <= right) {
                return { kind: "Value", value: langruntime.checkedSignedAdd(left, langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(right, left)), 2)) };
            }
        }
    }
    return { kind: "Unknown" };
}
export function arrayBucketLower(low: Int4Value, high: Int4Value, compared: Int4Value): Int4Value {
    if (compared.kind === "Error") {
        const error: SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        if (order < 0) {
            return low;
        }
        const position: Int4Value = arrayBucketMidpoint(low, high);
        if (position.kind === "Value") {
            const midpoint: number = langruntime.checkedI32(position.value);
            if (midpoint < 2147483647) {
                return { kind: "Value", value: langruntime.checkedSignedAdd(midpoint, 1) };
            }
        }
    }
    return { kind: "Unknown" };
}
export function arrayBucketUpper(low: Int4Value, high: Int4Value, compared: Int4Value): Int4Value {
    if (compared.kind === "Error") {
        const error: SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        if (order >= 0) {
            return high;
        }
        return arrayBucketMidpoint(low, high);
    }
    return { kind: "Unknown" };
}
export function prepareArraySearch(input: ArrayValue, needle: ArrayElement, start: Int4Value, provided: boolean, available: boolean): ArrayComparisonPayload {
    input = copyArrayValue(input);
    needle = copyArrayElement(needle);
    provided = langruntime.checkedBool(provided);
    available = langruntime.checkedBool(available);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (needle.kind === "Error") {
        const error: SqlError = needle.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (start.kind === "Error") {
        const error: SqlError = start.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (input.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 0);
    }
    if (input.kind === "Value") {
        const array: ArrayPayload = copyArrayPayload(input.value);
        if (array.dimensions.length > 1) {
            return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arraySearchMultidimensional), 0);
        }
        if (array.dimensions.length === 0) {
            return arrayComparisonState(2, makeSqlError(0), 0);
        }
        let needleNull: boolean = false;
        let needleUnknown: boolean = false;
        if (needle.kind === "Null") {
            needleNull = langruntime.checkedBool(true);
        }
        if (needle.kind === "Unknown") {
            needleUnknown = langruntime.checkedBool(true);
        }
        let knownNull: boolean = false;
        let unknownNull: boolean = false;
        let position: number = 0;
        while (position < array.elements.length) {
            const element: ArrayElement = copyArrayElement(langruntime.indexStruct(array.elements, langruntime.checkedIndex(position), copyArrayElement));
            if (element.kind === "Null") {
                knownNull = langruntime.checkedBool(true);
            }
            if (element.kind === "Unknown") {
                unknownNull = langruntime.checkedBool(true);
            }
            position = langruntime.checkedAdd(position, 1);
        }
        if (needleNull && knownNull === false && unknownNull === false) {
            return arrayComparisonState(2, makeSqlError(0), 0);
        }
        if (provided) {
            if (equalInt4Value(start, { kind: "Unknown" })) {
                return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
            }
            if (equalInt4Value(start, { kind: "Null" })) {
                if (knownNull === false && (needleUnknown || (needleNull && unknownNull))) {
                    return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
                }
                return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arraySearchNullStart), 0);
            }
        }
        if (available === false) {
            if (knownNull === false && (needleUnknown || (needleNull && unknownNull))) {
                return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
            }
            return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayComparisonUndefined), 0);
        }
        const lower: number = langruntime.indexStruct(array.dimensions, langruntime.checkedIndex(0), copyArrayDimension).lower;
        let offset: bigint = 0n;
        if (provided) {
            if (start.kind === "Value") {
                const value: number = langruntime.checkedI32(start.value);
                offset = langruntime.checkedI64(langruntime.checkedI64Subtract((BigInt(langruntime.checkedI32(value))), (BigInt(langruntime.checkedI32(lower)))));
                if (offset < 0n) {
                    offset = langruntime.checkedI64(0n);
                }
                if (offset > BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(array.elements.length)))))) {
                    offset = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(array.elements.length))))));
                }
            }
        }
        let needles: ArrayElement[] = [];
        langruntime.pushStruct(needles, needle, copyArrayElement);
        return { limit: array.elements.length, left: array.elements, right: needles, state: 1, error: makeSqlError(0), tail: lower, value: Number(BigInt.asIntN(32, langruntime.checkedI64(offset))) };
    }
    return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
}
export function arraySearchInitial(input: ArrayComparisonPayload): Int4Value {
    input = copyArrayComparisonPayload(input);
    if (input.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: input.error };
    }
    if (input.state === langruntime.checkedSignedNegate(1)) {
        return { kind: "Unknown" };
    }
    return { kind: "Null" };
}
export function arraySearchStart(input: ArrayComparisonPayload): Int4Value {
    input = copyArrayComparisonPayload(input);
    return { kind: "Value", value: input.value };
}
export function arraySearchContinues(input: ArrayComparisonPayload, index: Int4Value, result: Int4Value, all: boolean): boolean {
    input = copyArrayComparisonPayload(input);
    all = langruntime.checkedBool(all);
    if (!(input.state === 1)) {
        return false;
    }
    if (result.kind === "Error") {
        return false;
    }
    if (equalInt4Value(result, { kind: "Unknown" })) {
        return false;
    }
    if (all === false) {
        if (result.kind === "Value") {
            return false;
        }
    }
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        return offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.limit))))));
    }
    return false;
}
export function arraySearchNeedle(input: ArrayComparisonPayload): ArrayElement {
    input = copyArrayComparisonPayload(input);
    if (input.state === 1 && input.right.length === 1) {
        return copyArrayElement(langruntime.indexStruct(input.right, langruntime.checkedIndex(0), copyArrayElement));
    }
    return { kind: "Unknown" };
}
export function arraySearchResultStep(input: ArrayComparisonPayload, index: Int4Value, compared: Int4Value): Int4Value {
    input = copyArrayComparisonPayload(input);
    if (compared.kind === "Error") {
        const error: SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        if (!(value === 0)) {
            return { kind: "Null" };
        }
        if (index.kind === "Value") {
            const offset: number = langruntime.checkedI32(index.value);
            const position: bigint = langruntime.checkedI64Add((BigInt(langruntime.checkedI32(input.tail))), (BigInt(langruntime.checkedI32(offset))));
            return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(position))) };
        }
    }
    return { kind: "Unknown" };
}
export function arraySearchAppend(input: ArrayArguments, result: Int4Value): ArrayArguments {
    input = copyArrayArguments(input);
    if (result.kind === "Value") {
        const value: number = langruntime.checkedI32(result.value);
        return appendArrayArgument(input, arrayElementFromInt4(makeInt4Value(value)));
    }
    return input;
}
export function finishArraySearchPositions(input: ArrayComparisonPayload, values: ArrayArguments, result: Int4Value): ArrayValue {
    input = copyArrayComparisonPayload(input);
    values = copyArrayArguments(values);
    if (input.state === 0) {
        return { kind: "Null" };
    }
    if (result.kind === "Error") {
        const error: SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (equalInt4Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return finishArrayConstructor(values);
}
export function prepareArrayRewrite(input: ArrayValue, needle: ArrayElement, replacement: ArrayElement, remove: boolean, available: boolean): ArrayComparisonPayload {
    input = copyArrayValue(input);
    needle = copyArrayElement(needle);
    replacement = copyArrayElement(replacement);
    remove = langruntime.checkedBool(remove);
    available = langruntime.checkedBool(available);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (needle.kind === "Error") {
        const error: SqlError = needle.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (replacement.kind === "Error") {
        const error: SqlError = replacement.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (input.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 0);
    }
    if (input.kind === "Value") {
        const array: ArrayPayload = copyArrayPayload(input.value);
        if (array.dimensions.length === 0) {
            return arrayComparisonState(2, makeSqlError(0), 0);
        }
        if (remove && array.dimensions.length > 1) {
            return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arraySearchMultidimensional), 0);
        }
        if (available === false) {
            return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayComparisonUndefined), 0);
        }
        let queries: ArrayElement[] = [];
        langruntime.pushStruct(queries, needle, copyArrayElement);
        langruntime.pushStruct(queries, replacement, copyArrayElement);
        return { limit: array.elements.length, left: array.elements, right: queries, state: 1, error: makeSqlError(0), tail: 0, value: 0 };
    }
    return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
}
export function arrayRewriteNeedle(input: ArrayComparisonPayload): ArrayElement {
    input = copyArrayComparisonPayload(input);
    if (input.state === 1 && input.right.length === 2) {
        return copyArrayElement(langruntime.indexStruct(input.right, langruntime.checkedIndex(0), copyArrayElement));
    }
    return { kind: "Unknown" };
}
export function arrayRewriteContinues(input: ArrayComparisonPayload, index: Int4Value, result: Int4Value): boolean {
    input = copyArrayComparisonPayload(input);
    if (!(input.state === 1)) {
        return false;
    }
    if (result.kind === "Error") {
        return false;
    }
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        return offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.limit))))));
    }
    return false;
}
export function arrayRewriteStep(input: ArrayArguments, plan: ArrayComparisonPayload, index: Int4Value, compared: Int4Value, remove: boolean): ArrayArguments {
    input = copyArrayArguments(input);
    plan = copyArrayComparisonPayload(plan);
    remove = langruntime.checkedBool(remove);
    if (input.kind === "Error") {
        return input;
    }
    if (compared.kind === "Error") {
        const error: SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    const source: ArrayElement = arrayMembershipElementAt(plan, index, false);
    if (equalInt4Value(compared, { kind: "Unknown" })) {
        if (remove) {
            return { kind: "Unknown" };
        }
        if (source.kind === "Null") {
            const replacement: ArrayElement = copyArrayElement(langruntime.indexStruct(plan.right, langruntime.checkedIndex(1), copyArrayElement));
            if (replacement.kind === "Null") {
                return appendArrayArgument(input, { kind: "Null" });
            }
        }
        return appendArrayArgument(input, { kind: "Unknown" });
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        if (value === 0) {
            if (remove) {
                return input;
            }
            return appendArrayArgument(input, copyArrayElement(langruntime.indexStruct(plan.right, langruntime.checkedIndex(1), copyArrayElement)));
        }
        return appendArrayArgument(input, source);
    }
    return { kind: "Unknown" };
}
export function arrayRewriteChanged(input: ArrayComparisonPayload, compared: Int4Value, remove: boolean): BoolValue {
    input = copyArrayComparisonPayload(input);
    remove = langruntime.checkedBool(remove);
    if (remove === false && input.right.length === 2) {
        const needle: ArrayElement = copyArrayElement(langruntime.indexStruct(input.right, langruntime.checkedIndex(0), copyArrayElement));
        const replacement: ArrayElement = copyArrayElement(langruntime.indexStruct(input.right, langruntime.checkedIndex(1), copyArrayElement));
        if (needle.kind === "Null") {
            if (replacement.kind === "Null") {
                return { kind: "Value", value: false };
            }
        }
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value === 0 };
    }
    return { kind: "Unknown" };
}
export function finishArrayRewrite(original: ArrayValue, plan: ArrayComparisonPayload, values: ArrayArguments, remove: boolean, changed: BoolValue): ArrayValue {
    original = copyArrayValue(original);
    plan = copyArrayComparisonPayload(plan);
    values = copyArrayArguments(values);
    remove = langruntime.checkedBool(remove);
    if (plan.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: plan.error };
    }
    if (plan.state === langruntime.checkedSignedNegate(1)) {
        return { kind: "Unknown" };
    }
    if (plan.state === 0) {
        return { kind: "Null" };
    }
    if (plan.state === 2) {
        return original;
    }
    if (values.kind === "Error") {
        const error: SqlError = values.value;
        return { kind: "Error", value: error };
    }
    if (original.kind === "Value") {
        const source: ArrayPayload = copyArrayPayload(original.value);
        if (values.kind === "Value") {
            const output: ArrayPayload = copyArrayPayload(values.value);
            if (!(source.elementType === output.elementType) || !(source.elementKind === output.elementKind)) {
                return { kind: "Error", value: makeSqlError(arrayComparisonTypeMismatch) };
            }
            let dimensions: ArrayDimension[] = [];
            if (remove) {
                if (output.elements.length > 0) {
                    langruntime.pushStruct(dimensions, { lower: langruntime.indexStruct(source.dimensions, langruntime.checkedIndex(0), copyArrayDimension).lower, length: langruntime.checkedI32(langruntime.checkedIndex(output.elements.length)) }, copyArrayDimension);
                }
            }
            else {
                let position: number = 0;
                while (position < source.dimensions.length) {
                    langruntime.pushStruct(dimensions, langruntime.indexStruct(source.dimensions, langruntime.checkedIndex(position), copyArrayDimension), copyArrayDimension);
                    position = langruntime.checkedAdd(position, 1);
                }
            }
            let nullBitmap: BoolValue = output.nullBitmap;
            if (equalBoolValue(changed, { kind: "Value", value: false })) {
                nullBitmap = source.nullBitmap;
            }
            else if (!(equalBoolValue(changed, { kind: "Value", value: true }))) {
                nullBitmap = arrayBitmapChoice(nullBitmap, source.nullBitmap);
            }
            return makeArrayValue({ nullBitmap: nullBitmap, elementType: output.elementType, elementKind: output.elementKind, dimensions: dimensions, elements: output.elements });
        }
    }
    return { kind: "Unknown" };
}
export interface ArraySortPayload {
    nullBitmap: BoolValue;
    elementType: string;
    elementKind: number;
    dimensions: ArrayDimension[];
    elements: ArrayElement[];
    order: number[];
    buffer: number[];
    ties: number[];
    rows: number;
    width: number;
    run: number;
    segment: number;
    left: number;
    right: number;
    output: number;
    phase: number;
    tie: number;
    state: number;
    error: SqlError;
    descending: boolean;
    nullsFirst: boolean;
}
function copyArraySortPayload(value: ArraySortPayload): ArraySortPayload {
    return { nullBitmap: value.nullBitmap, elementType: langruntime.checkedString(value.elementType), elementKind: langruntime.checkedI32(value.elementKind), dimensions: langruntime.checkedStructs(value.dimensions, copyArrayDimension), elements: langruntime.checkedStructs(value.elements, copyArrayElement), order: langruntime.checkedIndices(value.order), buffer: langruntime.checkedIndices(value.buffer), ties: langruntime.checkedIndices(value.ties), rows: langruntime.checkedI32(value.rows), width: langruntime.checkedI32(value.width), run: langruntime.checkedI32(value.run), segment: langruntime.checkedI32(value.segment), left: langruntime.checkedI32(value.left), right: langruntime.checkedI32(value.right), output: langruntime.checkedI32(value.output), phase: langruntime.checkedI32(value.phase), tie: langruntime.checkedI32(value.tie), state: langruntime.checkedI32(value.state), error: value.error, descending: langruntime.checkedBool(value.descending), nullsFirst: langruntime.checkedBool(value.nullsFirst) };
}
export type ArraySortPlan = {
    kind: "Value";
    value: ArraySortPayload;
};
function copyArraySortPlan(value: ArraySortPlan): ArraySortPlan {
    switch (value.kind) {
        case "Value": return { kind: "Value", value: copyArraySortPayload(value.value) };
    }
}
export function prepareArrayHash(input: ArrayValue, seed: Int8Value, available: boolean): ArrayComparisonPayload {
    input = copyArrayValue(input);
    available = langruntime.checkedBool(available);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 1);
    }
    if (seed.kind === "Error") {
        const error: SqlError = seed.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 1);
    }
    if (input.kind === "Unknown") {
        return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 1);
    }
    if (equalInt8Value(seed, { kind: "Unknown" })) {
        return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 1);
    }
    if (input.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 1);
    }
    if (equalInt8Value(seed, { kind: "Null" })) {
        return arrayComparisonState(0, makeSqlError(0), 1);
    }
    if (available === false) {
        return arrayComparisonState(langruntime.checkedSignedNegate(2), makeSqlError(arrayComparisonUndefined), 1);
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        const limit: number = value.elements.length;
        const right: ArrayElement[] = [];
        return { left: value.elements, right: right, limit: limit, state: 1, error: makeSqlError(0), tail: 0, value: 1 };
    }
    return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 1);
}
export function arrayHashInitial64(input: ArrayComparisonPayload): Int8Value {
    const initial: Int4Value = arrayComparisonInitial(input);
    if (initial.kind === "Error") {
        const error: SqlError = initial.value;
        return { kind: "Error", value: error };
    }
    if (equalInt4Value(initial, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (equalInt4Value(initial, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "Value", value: 1n };
}
export function arrayHashContinues32(input: ArrayComparisonPayload, index: Int4Value, first: Int4Value, second: Int4Value): boolean {
    if (first.kind === "Value") {
        if (second.kind === "Value") {
            if (index.kind === "Value") {
                const offset: number = langruntime.checkedI32(index.value);
                return input.state === 1 && offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.limit))))));
            }
        }
    }
    return false;
}
export function arrayHashContinues64(input: ArrayComparisonPayload, index: Int4Value, first: Int8Value, second: Int8Value): boolean {
    if (first.kind === "Value") {
        if (second.kind === "Value") {
            if (index.kind === "Value") {
                const offset: number = langruntime.checkedI32(index.value);
                return input.state === 1 && offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.limit))))));
            }
        }
    }
    return false;
}
export function arrayBitmapUnion(left: BoolValue, right: BoolValue): BoolValue {
    if (equalBoolValue(left, { kind: "Value", value: true }) || equalBoolValue(right, { kind: "Value", value: true })) {
        return { kind: "Value", value: true };
    }
    if (equalBoolValue(left, { kind: "Value", value: false }) && equalBoolValue(right, { kind: "Value", value: false })) {
        return { kind: "Value", value: false };
    }
    return { kind: "Unknown" };
}
export function arrayElementBitmap(input: ArrayElement): BoolValue {
    input = copyArrayElement(input);
    if (input.kind === "Unknown") {
        return { kind: "Unknown" };
    }
    if (input.kind === "Null") {
        return { kind: "Value", value: true };
    }
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    return { kind: "Value", value: false };
}
export function arrayElementsBitmap(input: ArrayPayload): BoolValue {
    input = copyArrayPayload(input);
    let result: BoolValue = { kind: "Value", value: false };
    let index: number = 0;
    while (index < input.elements.length) {
        result = arrayBitmapUnion(result, arrayElementBitmap(copyArrayElement(langruntime.indexStruct(input.elements, langruntime.checkedIndex(index), copyArrayElement))));
        index = langruntime.checkedAdd(index, 1);
    }
    return result;
}
export function arrayReconstructionBitmap(input: ArrayPayload): BoolValue {
    input = copyArrayPayload(input);
    if (equalBoolValue(input.nullBitmap, { kind: "Value", value: false })) {
        return input.nullBitmap;
    }
    return arrayElementsBitmap(input);
}
export function arrayBitmapChoice(left: BoolValue, right: BoolValue): BoolValue {
    if (equalBoolValue(left, right)) {
        return left;
    }
    return { kind: "Unknown" };
}
export function arrayNullBitmap(input: ArrayValue): BoolValue {
    input = copyArrayValue(input);
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Null") {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        return value.nullBitmap;
    }
    return { kind: "Unknown" };
}
export function prepareArrayQuantifier(scalar: BoolValue, input: ArrayValue, strict: boolean): ArrayComparisonPayload {
    input = copyArrayValue(input);
    strict = langruntime.checkedBool(strict);
    if (scalar.kind === "Error") {
        const error: SqlError = scalar.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return arrayComparisonState(langruntime.checkedSignedNegate(2), error, 0);
    }
    if (input.kind === "Null") {
        return arrayComparisonState(0, makeSqlError(0), 0);
    }
    if (input.kind === "Value") {
        const value: ArrayPayload = copyArrayPayload(input.value);
        const limit: number = value.elements.length;
        if (limit > 0 && strict && equalBoolValue(scalar, { kind: "Value", value: true })) {
            return arrayComparisonState(0, makeSqlError(0), 0);
        }
        const right: ArrayElement[] = [];
        return { left: value.elements, right: right, limit: limit, state: 1, error: makeSqlError(0), tail: 0, value: 0 };
    }
    return arrayComparisonState(langruntime.checkedSignedNegate(1), makeSqlError(0), 0);
}
export function arrayQuantifierInitial(input: ArrayComparisonPayload, any: boolean): CheckOutcome {
    if (input.state === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: input.error };
    }
    if (input.state === langruntime.checkedSignedNegate(1)) {
        return { kind: "Unknown" };
    }
    if (input.state === 0) {
        return { kind: "Null" };
    }
    if (any) {
        return { kind: "False" };
    }
    return { kind: "True" };
}
export function arrayQuantifierContinues(input: ArrayComparisonPayload, index: Int4Value, result: CheckOutcome, any: boolean, safe: boolean): boolean {
    if (result.kind === "Error") {
        return false;
    }
    if (equalCheckOutcome(result, { kind: "Unknown" }) && safe === false) {
        return false;
    }
    if (any && equalCheckOutcome(result, { kind: "True" })) {
        return false;
    }
    if (any === false && equalCheckOutcome(result, { kind: "False" })) {
        return false;
    }
    if (index.kind === "Value") {
        const offset: number = langruntime.checkedI32(index.value);
        return input.state === 1 && offset >= 0 && (BigInt(langruntime.checkedI32(offset))) < (BigInt(langruntime.checkedI32((langruntime.checkedI32(langruntime.checkedIndex(input.limit))))));
    }
    return false;
}
export function arrayQuantifierCell(nullness: BoolValue, strict: boolean): BoolValue {
    strict = langruntime.checkedBool(strict);
    if (nullness.kind === "Error") {
        const error: SqlError = nullness.value;
        return { kind: "Error", value: error };
    }
    if (strict && equalBoolValue(nullness, { kind: "Value", value: true })) {
        return { kind: "Null" };
    }
    return { kind: "Value", value: true };
}
export function arrayQuantifierNeedsCall(input: BoolValue): boolean {
    return equalBoolValue(input, { kind: "Value", value: true });
}
export function arrayQuantifierStep(left: CheckOutcome, right: BoolValue, any: boolean): CheckOutcome {
    any = langruntime.checkedBool(any);
    const value: CheckOutcome = checkFromBool(right);
    if (any) {
        return orFinish(left, value);
    }
    return andFinish(left, value);
}
export function arrayQuantifierFinish(input: CheckOutcome, validity: CheckOutcome): BoolValue {
    if (validity.kind === "Error") {
        const error: SqlError = validity.value;
        return { kind: "Error", value: error };
    }
    if (equalCheckOutcome(validity, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    return boolFromCheck(input);
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
function hashBytesState(bytes: HashByte[], seed: bigint, bigEndian: boolean): HashState {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    seed = langruntime.checkedI64(seed);
    bigEndian = langruntime.checkedBool(bigEndian);
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
        if (bigEndian) {
            place = langruntime.checkedI64(16777216n);
        }
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
            if (bigEndian) {
                place = langruntime.checkedI64(langruntime.checkedI64Divide(place, 256n));
            }
            else {
                place = langruntime.checkedI64(langruntime.checkedI64Multiply(place, 256n));
            }
            if (position === 4 || position === 8) {
                if (bigEndian) {
                    place = langruntime.checkedI64(16777216n);
                }
                else {
                    place = langruntime.checkedI64(1n);
                }
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
    if (bigEndian) {
        place = langruntime.checkedI64(16777216n);
    }
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
        if (bigEndian) {
            place = langruntime.checkedI64(langruntime.checkedI64Divide(place, 256n));
            if (position === 4 || position === 8) {
                place = langruntime.checkedI64(16777216n);
            }
        }
        else {
            place = langruntime.checkedI64(langruntime.checkedI64Multiply(place, 256n));
            if (position === 4) {
                place = langruntime.checkedI64(1n);
            }
            if (position === 8) {
                place = langruntime.checkedI64(256n);
            }
        }
    }
    return hashFinal({ a: a, b: b, c: c });
}
export function hashBytes32(bytes: HashByte[]): number {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    const state: HashState = copyHashState(hashBytesState(bytes, 0n, false));
    return Number(BigInt.asIntN(32, langruntime.checkedI64(state.c)));
}
export function hashBytes64(bytes: HashByte[], seed: bigint): bigint {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    seed = langruntime.checkedI64(seed);
    const state: HashState = copyHashState(hashBytesState(bytes, seed, false));
    return hashState64(state);
}
function hashState64(state: HashState): bigint {
    state = copyHashState(state);
    let high: bigint = state.b;
    if (high >= 2147483648n) {
        high = langruntime.checkedI64(langruntime.checkedI64Subtract(high, 4294967296n));
    }
    return langruntime.checkedI64Add(langruntime.checkedI64Multiply(high, 4294967296n), state.c);
}
function hashBigEndianBytes(bytes: HashBytes): HashByte[] {
    let result: HashByte[] = [];
    let index: number = 0;
    while (index < bytes.bytes.length) {
        let end: number = langruntime.checkedAdd(index, 1);
        if (bytes.unit > 1) {
            end = langruntime.checkedIndex(langruntime.checkedAdd(index, bytes.unit));
        }
        let source: number = end;
        while (source > index) {
            source = langruntime.checkedIndex(langruntime.checkedSubtract(source, 1));
            langruntime.pushStruct(result, langruntime.indexStruct(bytes.bytes, langruntime.checkedIndex(source), copyHashByte), copyHashByte);
        }
        index = langruntime.checkedIndex(end);
    }
    return result;
}
interface HashBytes {
    bytes: HashByte[];
    unit: number;
}
function copyHashBytes(value: HashBytes): HashBytes {
    return { bytes: langruntime.checkedStructs(value.bytes, copyHashByte), unit: langruntime.checkedIndex(value.unit) };
}
export function hashNative32(bytes: HashByte[], byteOrder: number, unit: number): Int4Value {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    byteOrder = langruntime.checkedI32(byteOrder);
    unit = langruntime.checkedIndex(unit);
    if (byteOrder === 1) {
        return { kind: "Value", value: hashBytes32(bytes) };
    }
    const input: HashBytes = { bytes: bytes, unit: unit };
    const bigBytes: HashByte[] = hashBigEndianBytes(input);
    const bigState: HashState = copyHashState(hashBytesState(bigBytes, 0n, true));
    const big: number = Number(BigInt.asIntN(32, langruntime.checkedI64(bigState.c)));
    if (byteOrder === 2) {
        return { kind: "Value", value: big };
    }
    const little: number = hashBytes32(input.bytes);
    if (byteOrder === 0 && little === big) {
        return { kind: "Value", value: little };
    }
    return { kind: "Unknown" };
}
export function hashNative64(bytes: HashByte[], seed: bigint, byteOrder: number, unit: number): Int8Value {
    bytes = langruntime.checkedStructs(bytes, copyHashByte);
    seed = langruntime.checkedI64(seed);
    byteOrder = langruntime.checkedI32(byteOrder);
    unit = langruntime.checkedIndex(unit);
    if (byteOrder === 1) {
        return { kind: "Value", value: hashBytes64(bytes, seed) };
    }
    const input: HashBytes = { bytes: bytes, unit: unit };
    const bigBytes: HashByte[] = hashBigEndianBytes(input);
    const bigState: HashState = copyHashState(hashBytesState(bigBytes, seed, true));
    const big: bigint = hashState64(bigState);
    if (byteOrder === 2) {
        return { kind: "Value", value: big };
    }
    const little: bigint = hashBytes64(input.bytes, seed);
    if (byteOrder === 0 && little === big) {
        return { kind: "Value", value: little };
    }
    return { kind: "Unknown" };
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
