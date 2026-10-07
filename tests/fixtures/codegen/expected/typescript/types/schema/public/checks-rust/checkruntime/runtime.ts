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
function equalInt2Value(left: Int2Value, right: Int2Value): boolean {
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
export type EnumValue = {
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
export function equalEnumValue(left: EnumValue, right: EnumValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
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
    return { kind: "Value", value: value };
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
const sqlErrorDivisionByZero = 3452582;
const sqlErrorSubstring = 3452581;
const sqlErrorInvalidRegex = 3452591;
const sqlErrorInvalidParameter = 3452619;
const sqlErrorInvalidTextRepresentation = 3484946;
const sqlErrorStringLengthMismatch = 3452622;
const sqlErrorStringRightTruncation = 3452545;
const sqlErrorArraySubscript = 3452630;
const sqlErrorProgramLimit = 8584704;
export function sqlErrorMessage(error: SqlError): SqlErrorDescription {
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
};
export function equalByteaValue(left: ByteaValue, right: ByteaValue): boolean {
    if (left.kind !== right.kind)
        return false;
    if (left.kind === "Value" && right.kind === "Value")
        return left.value === right.value;
    if (left.kind === "Error" && right.kind === "Error")
        return equalSqlError(left.value, right.value);
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
function numericSpace(value: string): boolean {
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
    text = copyMacText(text);
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
    text = copyMacText(text);
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
    text = copyMacText(text);
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
    text = copyMacText(text);
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
function hashXor(left: bigint, right: bigint): bigint {
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
            bc = langruntime.checkedBool(true);
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 2));
        }
        else if (langruntime.checkedSubtract(end, start) >= 2 && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)))) === "d" && langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 2)))) === "a") {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 2));
        }
        while (start < end && dateTextSpace(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))))) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
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
    text = copyTimestampText(text);
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
function timestampCalendarMicroseconds(year: number, month: number, day: number, hour: number, minute: number, second: number, microsecond: number, offsetSeconds: number, withTimezone: boolean): Int8Value {
    year = langruntime.checkedI32(year);
    month = langruntime.checkedI32(month);
    day = langruntime.checkedI32(day);
    hour = langruntime.checkedI32(hour);
    minute = langruntime.checkedI32(minute);
    second = langruntime.checkedI32(second);
    microsecond = langruntime.checkedI32(microsecond);
    offsetSeconds = langruntime.checkedI32(offsetSeconds);
    withTimezone = langruntime.checkedBool(withTimezone);
    if (hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 || microsecond < 0 || microsecond > 999999) {
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
            return timestampCalendarMicroseconds(year, month.value, day.value, 0, 0, 0, 0, 0, false);
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
                const digits: TimestampNumber = readTimestampNumber(text, langruntime.checkedAdd(index, 1), end);
                index = langruntime.checkedIndex(digits.next);
                if (digits.digits < 1 || digits.digits > 6) {
                    return { kind: "Unknown" };
                }
                fraction = langruntime.checkedI32(digits.value);
                let fractionDigits: number = digits.digits;
                while (fractionDigits < 6) {
                    fraction = langruntime.checkedI32(langruntime.checkedSignedMultiply(fraction, 10));
                    fractionDigits = langruntime.checkedAdd(fractionDigits, 1);
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
        return timestampCalendarMicroseconds(year, month.value, day.value, hour.value, minute.value, second, fraction, offset, withTimezone);
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
    const parsed: Int8Value = timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, 0, false);
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
    const parsed: Int8Value = timestampCalendarMicroseconds(year, month, day, hour, minute, second, microsecond, offsetSeconds, true);
    return timestamptzFromMicroseconds(parsed);
}
export function timestamptzFromText(value: TextValue): TimestamptzValue {
    const parsed: Int8Value = parseTimestampText(value, true);
    return timestamptzFromMicroseconds(parsed);
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
export function caseGuardStops(value: CheckOutcome): boolean {
    if (equalCheckOutcome(value, { kind: "Unknown" })) {
        return true;
    }
    if (value.kind === "Error") {
        return true;
    }
    return false;
}
export function caseGuardTakes(value: CheckOutcome): boolean {
    return equalCheckOutcome(value, { kind: "True" });
}
