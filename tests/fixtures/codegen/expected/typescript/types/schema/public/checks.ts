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
function checkRustOutcome(value: _checkRust.CheckOutcome): EvalBool {
    switch (value.kind) {
        case "True": return evalBoolCertain(true);
        case "False": return evalBoolCertain(false);
        case "Null": return evalBoolCertain(null);
        case "Unknown": return evalBoolUncertain();
        case "Error": throw Object.assign(new Error("check constraint evaluation failed"), {
            code: value.value.state.toString(36).toUpperCase().padStart(5, "0"),
        });
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
        { owner: "public.event_id", constraint: "event_id_check", result: checkRustOutcome(_checkRust.evaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(checkRustInt8(row, "value"))) }
    ];
}
export function evaluatePublicEventIdDomainChecks(row: PublicEventIdCheckInput) {
    return [
        { owner: "public.event_id", constraint: "event_id_check", result: checkRustOutcome(_checkRust.evaluateCheckPublicDomainEventIdEventIdCheckHcydw(checkRustInt8(row, "value"))) }
    ];
}
