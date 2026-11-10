type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { SelectActorChoiceParams, SelectActorChoiceRow } from "../../../types/queries/items/SelectActorChoice.js";
export type { SelectActorChoiceParams, SelectActorChoiceRow } from "../../../types/queries/items/SelectActorChoice.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeInt(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "number" || !Number.isSafeInteger(value))
        return encodeInvalid(name, "integer");
    return String(value);
}
function jsonContainer(text: string, validate?: (value: unknown) => Error | null): PgsidJson<unknown> {
    let read: {
        value: unknown;
    } | {
        error: Error;
    } | undefined;
    const parsed = () => {
        if (!read)
            try {
                const value: unknown = JSON.parse(text);
                const error = validate?.(value) ?? null;
                read = error ? { error } : { value };
            }
            catch (error) {
                read = { error: error instanceof Error ? error : new Error(String(error)) };
            }
        return read;
    };
    return Object.assign(Object.create(null), {
        [Symbol.for("pgsid.json")]: true,
        text,
        value() {
            const result = parsed();
            if ("error" in result)
                throw result.error;
            return result.value;
        },
        safeValue() {
            const result = parsed();
            return "error" in result ? { ok: false, error: result.error } : { ok: true, value: result.value };
        },
    }) as PgsidJson<unknown>;
}
function isJson(value: unknown): value is PgsidJson<unknown> {
    return typeof value === "object" && value !== null && (value as Record<symbol, unknown>)[Symbol.for("pgsid.json")] === true && typeof (value as {
        text?: unknown;
    }).text === "string";
}
function decodeJson(value: string | null): unknown {
    return value === null ? null : jsonContainer(value);
}
function checkedJson(value: unknown, validate: (value: unknown) => Error | null): unknown {
    return isJson(value) ? jsonContainer(value.text, validate) : value;
}
export const selectActorChoiceSql = "SELECT CASE WHEN id > 0 THEN payload -> 'actor' ELSE audit -> 'actor' END AS actor\nFROM items WHERE id = $1;";
export function isSelectActorChoiceActor(value: unknown): value is NonNullable<SelectActorChoiceRow["actor"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].is(value) || _jsonSchemas.jsonSchemaValidators["Audit"]["/properties/actor"].is(value);
}
export function validateSelectActorChoiceActor(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    const _issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[] = [];
    const valid = _jsonSchemas.jsonSchemaHelpers._union([() => _jsonSchemas.jsonSchemaHelpers._include(_jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].validate(value), [], _issues), () => _jsonSchemas.jsonSchemaHelpers._include(_jsonSchemas.jsonSchemaValidators["Audit"]["/properties/actor"].validate(value), [], _issues)], value, [], "anyOf", _issues);
    return { valid, issues: _issues };
}
export async function selectActorChoice(db: pgsid.Queryable, params: SelectActorChoiceParams): Promise<SelectActorChoiceRow | undefined> {
    const result = await db.queryText(selectActorChoiceSql, [encodeInt(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "actor": decodeJson(values[0]) };
    row["actor"] = checkedJson(row["actor"], (value: unknown) => isSelectActorChoiceActor(value) ? null : new pgsid.QueryValidationError("SelectActorChoice", "actor", validateSelectActorChoiceActor(value).issues));
    return row as SelectActorChoiceRow;
}
