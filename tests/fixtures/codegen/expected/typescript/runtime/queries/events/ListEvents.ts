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
function decodeJson(value: string | null): unknown {
    return value === null ? null : JSON.parse(value);
}
export const listEventsSql = "WITH selected AS (SELECT id, payload, note FROM public.events)\nSELECT id, payload, note FROM selected ORDER BY id;";
export function isListEventsPayload(value: unknown): value is ListEventsRow["payload"] {
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
        if (!isListEventsPayload(row["payload"]))
            throw new pgsid.QueryValidationError("ListEvents", "payload", validateListEventsPayload(row["payload"]).issues);
        return row as ListEventsRow;
    });
}
