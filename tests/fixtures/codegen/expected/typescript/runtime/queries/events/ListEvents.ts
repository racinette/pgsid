import type { ListEventsParams, ListEventsRow } from "../../../types/queries/events/ListEvents.js";
export type { ListEventsParams, ListEventsRow } from "../../../types/queries/events/ListEvents.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
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
    const result = await db.query(listEventsSql, []);
    return result.rows.map(row => {
        if (!isListEventsPayload(row["payload"]))
            throw new pgsid.QueryValidationError("ListEvents", "payload", validateListEventsPayload(row["payload"]).issues);
        return row as ListEventsRow;
    });
}
