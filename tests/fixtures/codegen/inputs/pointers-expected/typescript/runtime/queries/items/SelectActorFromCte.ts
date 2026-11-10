type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { SelectActorFromCteParams, SelectActorFromCteRow } from "../../../types/queries/items/SelectActorFromCte.js";
export type { SelectActorFromCteParams, SelectActorFromCteRow } from "../../../types/queries/items/SelectActorFromCte.js";
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
export const selectActorFromCteSql = "WITH source AS (SELECT payload FROM items WHERE id = $1),\nprojected AS (SELECT payload -> 'actor' AS actor FROM source)\nSELECT actor FROM projected;";
export function isSelectActorFromCteActor(value: unknown): value is NonNullable<SelectActorFromCteRow["actor"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].is(value);
}
export function validateSelectActorFromCteActor(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.jsonSchemaValidators["Event"]["/properties/actor"].validate(value);
}
export async function selectActorFromCte(db: pgsid.Queryable, params: SelectActorFromCteParams): Promise<SelectActorFromCteRow | undefined> {
    const result = await db.queryText(selectActorFromCteSql, [encodeInt(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "actor": decodeJson(values[0]) };
    row["actor"] = checkedJson(row["actor"], (value: unknown) => isSelectActorFromCteActor(value) ? null : new pgsid.QueryValidationError("SelectActorFromCte", "actor", validateSelectActorFromCteActor(value).issues));
    return row as SelectActorFromCteRow;
}
