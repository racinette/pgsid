import * as _checkRust from "./checks-rust/checks.js";
import type { DefaultEventId, EventId } from "./domains.js";
type EvalValue<T> = {
    readonly certain: false;
} | {
    readonly certain: true;
    readonly value: T | null;
};
type EvalBool = EvalValue<boolean>;
function evalBoolCertain(value: boolean | null): EvalBool { return { certain: true, value }; }
function evalBoolUncertain(): EvalBool { return { certain: false }; }
function checkRawInput(row: object, name: string): unknown {
    return Object.hasOwn(row, name) ? Reflect.get(row, name) : undefined;
}
function checkInputInteger(row: object, name: string): EvalValue<bigint> {
    const value = checkRawInput(row, name);
    if (value === null)
        return { certain: true, value: null };
    if (typeof value === "bigint")
        return { certain: true, value };
    if (typeof value === "number" && Number.isSafeInteger(value))
        return { certain: true, value: BigInt(value) };
    return { certain: false };
}
function checkInputInt8(row: object, name: string): EvalValue<bigint> {
    const value = checkRawInput(row, name);
    if (typeof value !== "string")
        return checkInputInteger(row, name);
    if (!/^-?(?:0|[1-9][0-9]{0,18})$/.test(value))
        return { certain: false };
    const integer = BigInt(value);
    if (integer < -9223372036854775808n || integer > 9223372036854775807n)
        return { certain: false };
    return { certain: true, value: integer };
}
type CheckResult = EvalBool | {
    readonly certain: true;
    readonly error: string;
    readonly message?: string;
    readonly value?: never;
};
type CheckEvaluation = {
    readonly owner: string;
    readonly constraint: string;
    readonly result: CheckResult;
    readonly message?: string;
};
function checkEvaluation(owner: string, constraint: string, evaluate: () => CheckResult, unknownMessage: string): CheckEvaluation {
    let result: CheckResult;
    try {
        result = evaluate();
    }
    catch (error) {
        if (!(error instanceof Error) || !("code" in error) || typeof error.code !== "string" || !/^[A-Z0-9]{5}$/.test(error.code))
            throw error;
        result = { certain: true, error: error.code, message: error.message };
    }
    if (!result.certain)
        return { owner, constraint, result, message: unknownMessage };
    if ("error" in result)
        return {
            owner,
            constraint,
            result: { certain: true, error: result.error },
            message: result.message ?? "SQL evaluation failed",
        };
    return { owner, constraint, result };
}
function checkRustInt8(row: object, name: string): _checkRust.Int8Value {
    const input = checkInputInt8(row, name);
    if (!input.certain)
        return _checkRust.int8Unknown();
    if (input.value === null)
        return _checkRust.int8Null();
    if (input.value < -9223372036854775808n || input.value > 9223372036854775807n)
        return _checkRust.int8Unknown();
    return _checkRust.makeInt8Value(input.value);
}
function checkRustOutcome(value: _checkRust.CheckOutcome): CheckResult {
    switch (value.kind) {
        case "True": return evalBoolCertain(true);
        case "False": return evalBoolCertain(false);
        case "Null": return evalBoolCertain(null);
        case "Unknown": return evalBoolUncertain();
        case "Error": return {
            certain: true,
            error: value.value.state.toString(36).toUpperCase().padStart(5, "0"),
            message: _checkRust.sqlErrorMessage(value.value).message,
        };
    }
    throw new Error("invalid Rust CHECK outcome");
}
export type PublicDefaultEventIdCheckInput = {
    value?: DefaultEventId | null;
};
export type PublicEventIdCheckInput = {
    value?: EventId | null;
};
export function evaluatePublicDefaultEventIdDomainChecks(row: PublicDefaultEventIdCheckInput) {
    return [
        checkEvaluation("public.event_id", "event_id_check", () => checkRustOutcome(_checkRust.evaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(checkRustInt8(row, "value"))), "A required input is unavailable, or its value or an evaluated expression is not supported.")
    ];
}
export function evaluatePublicEventIdDomainChecks(row: PublicEventIdCheckInput) {
    return [
        checkEvaluation("public.event_id", "event_id_check", () => checkRustOutcome(_checkRust.evaluateCheckPublicDomainEventIdEventIdCheckHcydw(checkRustInt8(row, "value"))), "A required input is unavailable, or its value or an evaluated expression is not supported.")
    ];
}
