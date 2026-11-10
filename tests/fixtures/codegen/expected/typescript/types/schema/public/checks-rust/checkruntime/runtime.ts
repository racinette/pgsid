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
export type Int8Value = {
    readonly kind: "Unknown";
} | {
    readonly kind: "Unimplemented";
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
    readonly kind: "Unimplemented";
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
export function checkFromBool(value: BoolValue): CheckOutcome {
    let unresolvedFlavor: number = 0;
    if (value.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (value.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor8484: number = unresolvedFlavor;
    if (value.kind === "Unknown") {
        if (conditionFlavor8484 < 1) {
            conditionFlavor8484 = langruntime.checkedI32(1);
        }
    }
    if (value.kind === "Unimplemented") {
        conditionFlavor8484 = langruntime.checkedI32(2);
    }
    if (equalBoolValue(value, { kind: "Unknown" }) || equalBoolValue(value, { kind: "Unimplemented" })) {
        return checkUnresolved(conditionFlavor8484);
    }
    if (equalBoolValue(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (equalBoolValue(value, { kind: "Value", value: false })) {
        return { kind: "False" };
    }
    return { kind: "True" };
}
export function int4IsNull(value: Int4Value): BoolValue {
    let unresolvedFlavor: number = 0;
    if (value.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (value.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor8694: number = unresolvedFlavor;
    if (value.kind === "Unknown") {
        if (conditionFlavor8694 < 1) {
            conditionFlavor8694 = langruntime.checkedI32(1);
        }
    }
    if (value.kind === "Unimplemented") {
        conditionFlavor8694 = langruntime.checkedI32(2);
    }
    if (equalInt4Value(value, { kind: "Unknown" }) || equalInt4Value(value, { kind: "Unimplemented" })) {
        return boolUnresolved(conditionFlavor8694);
    }
    return { kind: "Value", value: equalInt4Value(value, { kind: "Null" }) };
}
export function int8IsNull(value: Int8Value): BoolValue {
    let unresolvedFlavor: number = 0;
    if (value.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (value.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor8824: number = unresolvedFlavor;
    if (value.kind === "Unknown") {
        if (conditionFlavor8824 < 1) {
            conditionFlavor8824 = langruntime.checkedI32(1);
        }
    }
    if (value.kind === "Unimplemented") {
        conditionFlavor8824 = langruntime.checkedI32(2);
    }
    if (equalInt8Value(value, { kind: "Unknown" }) || equalInt8Value(value, { kind: "Unimplemented" })) {
        return boolUnresolved(conditionFlavor8824);
    }
    return { kind: "Value", value: equalInt8Value(value, { kind: "Null" }) };
}
export function boolIsNull(value: BoolValue): BoolValue {
    let unresolvedFlavor: number = 0;
    if (value.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (value.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (value.kind === "Error") {
        const error: SqlError = value.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor9084: number = unresolvedFlavor;
    if (value.kind === "Unknown") {
        if (conditionFlavor9084 < 1) {
            conditionFlavor9084 = langruntime.checkedI32(1);
        }
    }
    if (value.kind === "Unimplemented") {
        conditionFlavor9084 = langruntime.checkedI32(2);
    }
    if (equalBoolValue(value, { kind: "Unknown" }) || equalBoolValue(value, { kind: "Unimplemented" })) {
        return boolUnresolved(conditionFlavor9084);
    }
    return { kind: "Value", value: equalBoolValue(value, { kind: "Null" }) };
}
export function boolUnresolved(flavor: number): BoolValue {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 1) {
        return { kind: "Unknown" };
    }
    return { kind: "Unimplemented" };
}
export function checkUnresolved(flavor: number): CheckOutcome {
    flavor = langruntime.checkedI32(flavor);
    if (flavor === 1) {
        return { kind: "Unknown" };
    }
    return { kind: "Unimplemented" };
}
export function arrayValueValidity(input: BoolValue, unknownValid: boolean): CheckOutcome {
    let unresolvedFlavor: number = 0;
    if (input.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (input.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (input.kind === "Error") {
        const error: SqlError = input.value;
        return { kind: "Error", value: error };
    }
    let conditionFlavor544: number = unresolvedFlavor;
    if (input.kind === "Unknown") {
        if (conditionFlavor544 < 1) {
            conditionFlavor544 = langruntime.checkedI32(1);
        }
    }
    if (input.kind === "Unimplemented") {
        conditionFlavor544 = langruntime.checkedI32(2);
    }
    if ((equalBoolValue(input, { kind: "Unknown" }) || equalBoolValue(input, { kind: "Unimplemented" })) && unknownValid === false) {
        return checkUnresolved(conditionFlavor544);
    }
    return { kind: "True" };
}
export function arrayValidityFinish(left: CheckOutcome, right: CheckOutcome): CheckOutcome {
    if (equalCheckOutcome(left, { kind: "Unknown" }) && equalCheckOutcome(right, { kind: "Unimplemented" })) {
        return right;
    }
    if (equalCheckOutcome(left, { kind: "Unknown" }) || equalCheckOutcome(left, { kind: "Unimplemented" })) {
        return left;
    }
    if (left.kind === "Error") {
        return left;
    }
    return right;
}
export function arrayValidityResult(validity: CheckOutcome, result: CheckOutcome): CheckOutcome {
    if (equalCheckOutcome(validity, { kind: "Unknown" }) && equalCheckOutcome(result, { kind: "Unimplemented" })) {
        return result;
    }
    if (caseGuardStops(validity)) {
        return validity;
    }
    return result;
}
export function orFinish(left: CheckOutcome, right: CheckOutcome): CheckOutcome {
    let unresolvedFlavor: number = 0;
    if (left.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (right.kind === "Unknown") {
        unresolvedFlavor = langruntime.checkedI32(1);
    }
    if (left.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
    if (right.kind === "Unimplemented") {
        unresolvedFlavor = langruntime.checkedI32(2);
    }
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
    let conditionFlavor604: number = unresolvedFlavor;
    if (left.kind === "Unknown") {
        if (conditionFlavor604 < 1) {
            conditionFlavor604 = langruntime.checkedI32(1);
        }
    }
    if (left.kind === "Unimplemented") {
        conditionFlavor604 = langruntime.checkedI32(2);
    }
    if (right.kind === "Unknown") {
        if (conditionFlavor604 < 1) {
            conditionFlavor604 = langruntime.checkedI32(1);
        }
    }
    if (right.kind === "Unimplemented") {
        conditionFlavor604 = langruntime.checkedI32(2);
    }
    if ((equalCheckOutcome(left, { kind: "Unknown" }) || equalCheckOutcome(left, { kind: "Unimplemented" })) || (equalCheckOutcome(right, { kind: "Unknown" }) || equalCheckOutcome(right, { kind: "Unimplemented" }))) {
        return checkUnresolved(conditionFlavor604);
    }
    if (equalCheckOutcome(left, { kind: "Null" }) || equalCheckOutcome(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "False" };
}
export function caseGuardStops(value: CheckOutcome): boolean {
    if (equalCheckOutcome(value, { kind: "Unknown" }) || equalCheckOutcome(value, { kind: "Unimplemented" })) {
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
