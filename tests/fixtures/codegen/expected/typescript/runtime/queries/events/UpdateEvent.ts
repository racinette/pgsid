import type { UpdateEventParams, UpdateEventRow } from "../../../types/queries/events/UpdateEvent.js";
export type { UpdateEventParams, UpdateEventRow } from "../../../types/queries/events/UpdateEvent.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const updateEventSql = "UPDATE public.events\nSET payload = $1, note = $2\nWHERE id = $3\nRETURNING id, payload, payload ->> 'score' AS score, note;";
export function isUpdateEventPayload(value: unknown): value is UpdateEventRow["payload"] {
    return _jsonSchemas.isEventPayload(value);
}
export function validateUpdateEventPayload(value: unknown): {
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
export function isUpdateEventScore(value: unknown): value is UpdateEventRow["score"] {
    return value === null || typeof value === "string";
}
export function validateUpdateEventScore(value: unknown): {
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
    function _check(valid: boolean, value: unknown, path: readonly (string | number)[], keyword: string, expected: unknown): boolean {
        if (valid)
            return true;
        const received = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
        _issues.push({ path: [...path], keyword, expected, received, message: keyword === "type" ? "Expected " + (typeof expected === "string" ? expected : JSON.stringify(expected)) + ", received " + received : ({ required: "Missing required property", dependentRequired: "Missing dependent property", additionalProperties: "Unexpected property", falseSchema: "Value is forbidden by the schema", items: "Additional array item is forbidden", prefixItems: "Array item is forbidden", propertyNames: "Property name is forbidden", uniqueItems: "Array items must be unique", not: "Value matches a forbidden schema", anyOf: "No alternative matches", oneOf: "Expected exactly one matching alternative" } as Record<string, string>)[keyword] ?? keyword + ": expected " + (typeof expected === "string" ? expected : JSON.stringify(expected)) + ", received " + received });
        return false;
    }
    const valid = value === null || _check(typeof value === "string", value, [], "type", "string");
    return { valid, issues: _issues };
}
export async function updateEvent(db: pgsid.Queryable, params: UpdateEventParams): Promise<UpdateEventRow | undefined> {
    const result = await db.query(updateEventSql, [params["payload"], params["note"], params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    if (!isUpdateEventPayload(row["payload"]))
        throw new pgsid.QueryValidationError("UpdateEvent", "payload", validateUpdateEventPayload(row["payload"]).issues);
    if (!isUpdateEventScore(row["score"]))
        throw new pgsid.QueryValidationError("UpdateEvent", "score", validateUpdateEventScore(row["score"]).issues);
    return row as UpdateEventRow;
}
