import * as pg_catalog from "./pg_catalog/operations.js";
import * as checkruntime from "./checkruntime/runtime.js";
export type { Int8Value, CheckOutcome, SqlError } from "./checkruntime/runtime.js";
export { int8Unknown, int8Null, makeInt8Value, makeSqlError, sqlErrorMessage } from "./checkruntime/runtime.js";
export function evaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(inputValue: checkruntime.Int8Value): checkruntime.CheckOutcome {
    const expressionValidityStart0: checkruntime.BoolValue = checkruntime.makeBoolValue(true);
    let expressionValidity1: checkruntime.CheckOutcome = checkruntime.checkFromBool(expressionValidityStart0);
    const arrayValueNullness2: checkruntime.BoolValue = checkruntime.int8IsNull(inputValue);
    const arrayValueValidity3: checkruntime.CheckOutcome = checkruntime.arrayValueValidity(arrayValueNullness2, true);
    expressionValidity1 = checkruntime.arrayValidityFinish(expressionValidity1, arrayValueValidity3);
    const value4: checkruntime.Int4Value = checkruntime.makeInt4Value(0);
    const strictCallStart6: checkruntime.BoolValue = checkruntime.makeBoolValue(false);
    let strictCallNull5: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictCallStart6);
    const strictArgumentNull7: checkruntime.BoolValue = checkruntime.int8IsNull(inputValue);
    const strictArgumentState8: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictArgumentNull7);
    strictCallNull5 = checkruntime.orFinish(strictCallNull5, strictArgumentState8);
    const strictArgumentNull9: checkruntime.BoolValue = checkruntime.int4IsNull(value4);
    const strictArgumentState10: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictArgumentNull9);
    strictCallNull5 = checkruntime.orFinish(strictCallNull5, strictArgumentState10);
    let strictCall14: checkruntime.BoolValue = checkruntime.boolNull();
    if (checkruntime.caseGuardTakes(strictCallNull5) === false) {
        const value11: checkruntime.BoolValue = pg_catalog.int84gtP7f5(inputValue, value4);
        const arrayValueNullness12: checkruntime.BoolValue = checkruntime.boolIsNull(value11);
        const arrayValueValidity13: checkruntime.CheckOutcome = checkruntime.arrayValueValidity(arrayValueNullness12, true);
        expressionValidity1 = checkruntime.arrayValidityFinish(expressionValidity1, arrayValueValidity13);
        strictCall14 = value11;
    }
    const arrayValueNullness15: checkruntime.BoolValue = checkruntime.boolIsNull(strictCall14);
    const arrayValueValidity16: checkruntime.CheckOutcome = checkruntime.arrayValueValidity(arrayValueNullness15, true);
    expressionValidity1 = checkruntime.arrayValidityFinish(expressionValidity1, arrayValueValidity16);
    const scalarResult17: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictCall14);
    let validatedExpression18: checkruntime.CheckOutcome = scalarResult17;
    if (checkruntime.caseGuardStops(expressionValidity1)) {
        validatedExpression18 = checkruntime.arrayValidityResult(expressionValidity1, validatedExpression18);
    }
    return validatedExpression18;
}
export function evaluateCheckPublicDomainEventIdEventIdCheckHcydw(inputValue: checkruntime.Int8Value): checkruntime.CheckOutcome {
    const expressionValidityStart0: checkruntime.BoolValue = checkruntime.makeBoolValue(true);
    let expressionValidity1: checkruntime.CheckOutcome = checkruntime.checkFromBool(expressionValidityStart0);
    const arrayValueNullness2: checkruntime.BoolValue = checkruntime.int8IsNull(inputValue);
    const arrayValueValidity3: checkruntime.CheckOutcome = checkruntime.arrayValueValidity(arrayValueNullness2, true);
    expressionValidity1 = checkruntime.arrayValidityFinish(expressionValidity1, arrayValueValidity3);
    const value4: checkruntime.Int4Value = checkruntime.makeInt4Value(0);
    const strictCallStart6: checkruntime.BoolValue = checkruntime.makeBoolValue(false);
    let strictCallNull5: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictCallStart6);
    const strictArgumentNull7: checkruntime.BoolValue = checkruntime.int8IsNull(inputValue);
    const strictArgumentState8: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictArgumentNull7);
    strictCallNull5 = checkruntime.orFinish(strictCallNull5, strictArgumentState8);
    const strictArgumentNull9: checkruntime.BoolValue = checkruntime.int4IsNull(value4);
    const strictArgumentState10: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictArgumentNull9);
    strictCallNull5 = checkruntime.orFinish(strictCallNull5, strictArgumentState10);
    let strictCall14: checkruntime.BoolValue = checkruntime.boolNull();
    if (checkruntime.caseGuardTakes(strictCallNull5) === false) {
        const value11: checkruntime.BoolValue = pg_catalog.int84gtP7f5(inputValue, value4);
        const arrayValueNullness12: checkruntime.BoolValue = checkruntime.boolIsNull(value11);
        const arrayValueValidity13: checkruntime.CheckOutcome = checkruntime.arrayValueValidity(arrayValueNullness12, true);
        expressionValidity1 = checkruntime.arrayValidityFinish(expressionValidity1, arrayValueValidity13);
        strictCall14 = value11;
    }
    const arrayValueNullness15: checkruntime.BoolValue = checkruntime.boolIsNull(strictCall14);
    const arrayValueValidity16: checkruntime.CheckOutcome = checkruntime.arrayValueValidity(arrayValueNullness15, true);
    expressionValidity1 = checkruntime.arrayValidityFinish(expressionValidity1, arrayValueValidity16);
    const scalarResult17: checkruntime.CheckOutcome = checkruntime.checkFromBool(strictCall14);
    let validatedExpression18: checkruntime.CheckOutcome = scalarResult17;
    if (checkruntime.caseGuardStops(expressionValidity1)) {
        validatedExpression18 = checkruntime.arrayValidityResult(expressionValidity1, validatedExpression18);
    }
    return validatedExpression18;
}
