type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue };
interface PgsidJson<T = PgsidJsonValue> { readonly text: string; value(): T; safeValue(): { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Error } }
import type { ListEventsParams, ListEventsRow } from "../../../types/queries/events/ListEvents.js";
export type { ListEventsParams, ListEventsRow } from "../../../types/queries/events/ListEvents.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function decodeBigint(value: string | null): bigint | null {
    return value === null ? null : BigInt(value);
}
function decodeText(value: string | null): string | null {
    return value;
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
export const listEventsSql = "WITH selected AS (SELECT id, payload, note FROM public.events)\nSELECT id, payload, note FROM selected ORDER BY id;";
export function isListEventsPayload(value: unknown): value is NonNullable<ListEventsRow["payload"]> extends PgsidJson<infer T> ? T : never {
    return _jsonSchemas.isEventPayload(value);
}
export function validateListEventsPayload(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return _jsonSchemas.validateEventPayload(value);
}
export async function listEvents(db: pgsid.Queryable): Promise<ListEventsRow[]> {
    const result = await db.queryText(listEventsSql, []);
    return result.rows.map(values => {
        const row = { "id": decodeBigint(values[0]), "payload": decodeJson(values[1]), "note": decodeText(values[2]) };
        row["payload"] = checkedJson(row["payload"], (value: unknown) => isListEventsPayload(value) ? null : new pgsid.QueryValidationError("ListEvents", "payload", validateListEventsPayload(value).issues));
        return row as ListEventsRow;
    });
}
