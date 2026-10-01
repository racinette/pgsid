import * as langruntime from "../langruntime/runtime.js";
export type Int4Value = {
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: number;
} | {
    kind: "Error";
    value: SqlError;
};
export function copyInt4Value(value: Int4Value): Int4Value {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedI32(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: bigint;
} | {
    kind: "Error";
    value: SqlError;
};
export function copyTimestampValue(value: TimestampValue): TimestampValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedI64(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
    value = copyTimestampValue(value);
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
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: bigint;
} | {
    kind: "Error";
    value: SqlError;
};
export function copyTimestamptzValue(value: TimestamptzValue): TimestamptzValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedI64(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
    value = copyTimestamptzValue(value);
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
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: number;
} | {
    kind: "Error";
    value: SqlError;
};
export function copyEnumValue(value: EnumValue): EnumValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedI32(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
    value = copyEnumValue(value);
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
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: number;
} | {
    kind: "Error";
    value: SqlError;
};
export function copyDateValue(value: DateValue): DateValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedI32(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
    value = copyDateValue(value);
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
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: string;
} | {
    kind: "Error";
    value: SqlError;
};
export function copyTextValue(value: TextValue): TextValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedString(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
export type BoolValue = {
    kind: "Unknown";
} | {
    kind: "Null";
} | {
    kind: "Value";
    value: boolean;
} | {
    kind: "Error";
    value: SqlError;
};
export function copyBoolValue(value: BoolValue): BoolValue {
    switch (value.kind) {
        case "Unknown": return { kind: "Unknown" };
        case "Null": return { kind: "Null" };
        case "Value": return { kind: "Value", value: langruntime.checkedBool(value.value) };
        case "Error": return { kind: "Error", value: value.value };
    }
}
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
    value = copyBoolValue(value);
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
    value = copyInt4Value(value);
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
    value = copyTextValue(value);
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
    value = copyBoolValue(value);
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
    value = copyBoolValue(value);
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
    value = copyTextValue(value);
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
    const days: Int4Value = copyInt4Value(calendarDaysFromYmd(year, month, day));
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
    const days: Int4Value = copyInt4Value(calendarDaysFromYmd(year, month, day));
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
    value = copyTextValue(value);
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
    value = copyTextValue(value);
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
    value = copyTextValue(value);
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
