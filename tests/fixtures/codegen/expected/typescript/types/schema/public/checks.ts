type EvalValue<T> = {
    readonly certain: false;
} | {
    readonly certain: true;
    readonly value: T | null;
};
class SqlIntegerError extends Error {
    readonly code = "22003";
    constructor() { super("integer out of range"); }
}
function sqlIntegerRange(value: bigint | null, min: bigint, max: bigint): bigint | null {
    if (value === null)
        return null;
    if (value < min || value > max)
        throw new SqlIntegerError();
    return value;
}
function sqlIntegerInput(value: string | null, min: bigint, max: bigint): bigint | null {
    return sqlIntegerRange(value === null ? null : BigInt(value), min, max);
}
function int4Input(value: string | null): bigint | null { return sqlIntegerInput(value, -2147483648n, 2147483647n); }
function integerGt(left: bigint | null, right: bigint | null): boolean | null {
    return left === null || right === null ? null : left > right;
}
function evalValueCertain<T>(value: T | null): EvalValue<T> {
    return { certain: true, value };
}
function evalValueUncertain<T>(): EvalValue<T> {
    return { certain: false };
}
function checkRawInput(row: object, name: string): unknown {
    return Object.hasOwn(row, name) ? Reflect.get(row, name) : undefined;
}
function checkTextKnown(row: object, name: string): boolean {
    const value = checkRawInput(row, name);
    return value === null || typeof value === "string";
}
function checkTextValue(row: object, name: string): string | null {
    const value = checkRawInput(row, name);
    return typeof value === "string" ? value : null;
}
function checkInputText(row: object, name: string): EvalValue<string> {
    return checkTextKnown(row, name) ? { certain: true, value: checkTextValue(row, name) } : { certain: false };
}
function checkInputBoolean(row: object, name: string): EvalValue<boolean> {
    const value = checkRawInput(row, name);
    return value === null || typeof value === "boolean" ? { certain: true, value } : { certain: false };
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
function checkInputFloat(row: object, name: string): EvalValue<number> {
    const value = checkRawInput(row, name);
    return value === null || typeof value === "number" ? { certain: true, value } : { certain: false };
}
export function evaluatePublicDefaultEventIdDomainChecks(row: object) {
    return [
        { owner: "public.event_id", constraint: "event_id_check", result: (() => {
                const argument0 = checkInputInteger(row, "value");
                const argument1 = int4Input("0");
                if (!argument0.certain) {
                    return evalValueUncertain<boolean>();
                }
                return evalValueCertain(integerGt(argument0.value, argument1));
            })() }
    ];
}
export function evaluatePublicEventIdDomainChecks(row: object) {
    return [
        { owner: "public.event_id", constraint: "event_id_check", result: (() => {
                const argument0 = checkInputInteger(row, "value");
                const argument1 = int4Input("0");
                if (!argument0.certain) {
                    return evalValueUncertain<boolean>();
                }
                return evalValueCertain(integerGt(argument0.value, argument1));
            })() }
    ];
}
