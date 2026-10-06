import * as pg_catalog from "./pg_catalog/operations.js";
import * as checkruntime from "./checkruntime/runtime.js";
export type { Int2Value, Int4Value, Int8Value, TimestampValue, TimestamptzValue, EnumValue, DateValue, TextValue, CheckOutcome, SqlError, SqlErrorDescription, BoolValue, NumericValue, NetworkAddress, NetworkValue, BitValue, ByteaValue, MacAddress, MacaddrValue, Macaddr8Value, Uuid, UuidValue, NumericLayout, NetworkWord, HashByte } from "./checkruntime/runtime.js";
export { int2Unknown, int2Null, makeInt2Value, int2IsNull, int2FromCaseGuard, int2ToInt4, int2ToInt8, timestampUnknown, timestampNull, makeTimestampValue, timestampIsNull, timestampFromCaseGuard, timestamptzUnknown, timestamptzNull, makeTimestamptzValue, timestamptzIsNull, timestamptzFromCaseGuard, enumUnknown, enumNull, makeEnumValue, enumIsNull, enumFromCaseGuard, dateUnknown, dateNull, makeDateValue, dateIsNull, dateFromCaseGuard, int4Unknown, int4Null, makeInt4Value, int8Unknown, int8Null, makeInt8Value, textUnknown, textNull, makeTextValue, boolUnknown, boolNull, makeBoolValue, makeSqlError, sqlErrorMessage, checkFromBool, checkUnknown, int4IsNull, int8IsNull, textIsNull, boolIsNull, boolNotValue, boolFromCheck, int4FromCaseGuard, int8FromCaseGuard, textFromCaseGuard, numericUnknown, numericNull, numericIsNull, numericFromCaseGuard, makeNumericValue, networkUnknown, networkNull, networkIsNull, networkFromCaseGuard, makeNetworkValue, makeCidrValue, bitUnknown, bitNull, bitIsNull, bitFromCaseGuard, makeBitValue, byteaUnknown, byteaNull, byteaIsNull, byteaFromCaseGuard, makeByteaValue, macaddrUnknown, macaddrNull, macaddrIsNull, macaddrFromCaseGuard, makeMacaddrValue, macaddr8Unknown, macaddr8Null, macaddr8IsNull, macaddr8FromCaseGuard, makeMacaddr8Value, uuidUnknown, uuidNull, uuidIsNull, uuidFromCaseGuard, makeUuidValue } from "./checkruntime/runtime.js";
export function evaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(inputValue: checkruntime.Int8Value): checkruntime.CheckOutcome {
    const value0: checkruntime.Int4Value = checkruntime.makeInt4Value(0);
    const value1: checkruntime.BoolValue = pg_catalog.int84gtP7f5(inputValue, value0);
    const scalarResult2: checkruntime.CheckOutcome = checkruntime.checkFromBool(value1);
    return scalarResult2;
}
export function evaluateCheckPublicDomainEventIdEventIdCheckHcydw(inputValue: checkruntime.Int8Value): checkruntime.CheckOutcome {
    const value0: checkruntime.Int4Value = checkruntime.makeInt4Value(0);
    const value1: checkruntime.BoolValue = pg_catalog.int84gtP7f5(inputValue, value0);
    const scalarResult2: checkruntime.CheckOutcome = checkruntime.checkFromBool(value1);
    return scalarResult2;
}
