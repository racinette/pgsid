import * as pg_catalog from "./pg_catalog/operations.js";
import * as checkruntime from "./checkruntime/runtime.js";
export type { Int4Value, Int8Value, TimestamptzValue, EnumValue, DateValue, TextValue, CheckOutcome, SqlError, BoolValue } from "./checkruntime/runtime.js";
export { timestamptzUnknown, timestamptzNull, makeTimestamptzValue, timestamptzIsNull, timestamptzFromCaseGuard, enumUnknown, enumNull, makeEnumValue, enumIsNull, enumFromCaseGuard, dateUnknown, dateNull, makeDateValue, dateIsNull, dateFromCaseGuard, int4Unknown, int4Null, makeInt4Value, int8Unknown, int8Null, makeInt8Value, textUnknown, textNull, makeTextValue, boolUnknown, boolNull, makeBoolValue, makeSqlError, checkFromBool, checkUnknown, int4IsNull, int8IsNull, textIsNull, boolIsNull, boolNotValue, boolFromCheck, int4FromCaseGuard, int8FromCaseGuard, textFromCaseGuard } from "./checkruntime/runtime.js";
export function evaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(inputValue: checkruntime.Int8Value): checkruntime.CheckOutcome {
    const value0: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.makeInt4Value(0));
    const value1: checkruntime.BoolValue = checkruntime.copyBoolValue(pg_catalog.int84gtP7f5(inputValue, value0));
    const scalarResult2: checkruntime.CheckOutcome = checkruntime.checkFromBool(value1);
    return scalarResult2;
}
export function evaluateCheckPublicDomainEventIdEventIdCheckHcydw(inputValue: checkruntime.Int8Value): checkruntime.CheckOutcome {
    const value0: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.makeInt4Value(0));
    const value1: checkruntime.BoolValue = checkruntime.copyBoolValue(pg_catalog.int84gtP7f5(inputValue, value0));
    const scalarResult2: checkruntime.CheckOutcome = checkruntime.checkFromBool(value1);
    return scalarResult2;
}
