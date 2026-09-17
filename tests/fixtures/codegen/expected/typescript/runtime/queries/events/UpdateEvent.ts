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
    const valid = value === null || _jsonSchemas.jsonSchemaHelpers._check(typeof value === "string", value, [], "type", "string", _issues);
    return { valid, issues: _issues };
}
export function isUpdateEventParamsPayloadPublicEventsPayload(value: unknown): value is UpdateEventParams["payload"] {
    return _jsonSchemas.isEventPayload(value);
}
export function validateUpdateEventParamsPayloadPublicEventsPayload(value: unknown): {
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
export async function updateEvent(db: pgsid.Queryable, params: UpdateEventParams): Promise<UpdateEventRow | undefined> {
    const jsonInput1 = JSON.stringify(params["payload"]);
    if (jsonInput1 === undefined)
        throw new pgsid.QueryValidationError("UpdateEvent", "payload", [{ path: [], keyword: "json", expected: "JSON value", received: "undefined", message: "Value has no JSON representation" }]);
    const jsonInput1Value = jsonInput1 === null ? null : JSON.parse(jsonInput1);
    if (jsonInput1 !== null) {
        if (!isUpdateEventParamsPayloadPublicEventsPayload(jsonInput1Value))
            throw new pgsid.QueryValidationError("UpdateEvent", "payload", validateUpdateEventParamsPayloadPublicEventsPayload(jsonInput1Value).issues);
    }
    const result = await db.query(updateEventSql, [jsonInput1, params["note"], params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    if (!isUpdateEventPayload(row["payload"]))
        throw new pgsid.QueryValidationError("UpdateEvent", "payload", validateUpdateEventPayload(row["payload"]).issues);
    if (!isUpdateEventScore(row["score"]))
        throw new pgsid.QueryValidationError("UpdateEvent", "score", validateUpdateEventScore(row["score"]).issues);
    return row as UpdateEventRow;
}
