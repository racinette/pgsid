import type { GetEventParams, GetEventRow } from "../../../types/queries/events/GetEvent.js";
export type { GetEventParams, GetEventRow } from "../../../types/queries/events/GetEvent.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
export const getEventSql = "WITH selected AS (\n  SELECT id, account_id, payload, state, created_at\n  FROM public.events\n  WHERE id = $1\n)\nSELECT\n  selected.id,\n  selected.payload,\n  selected.payload -> 'actor' AS actor,\n  selected.state,\n  selected.created_at,\n  accounts.id AS joined_account_id,\n  accounts.display_name\nFROM selected\nLEFT JOIN public.accounts AS accounts ON accounts.id = selected.account_id;";
export function isGetEventPayload(value: unknown): value is GetEventRow["payload"] {
    return _jsonSchemas.isEventPayload(value);
}
export function validateGetEventPayload(value: unknown): {
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
export function isGetEventActor(value: unknown): value is GetEventRow["actor"] {
    return value === null || _jsonSchemas.isEventPayloadActor(value);
}
export function validateGetEventActor(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    return value === null ? { valid: true, issues: [] } : _jsonSchemas.validateEventPayloadActor(value);
}
export async function getEvent(db: pgsid.Queryable, params: GetEventParams): Promise<GetEventRow | undefined> {
    const result = await db.query(getEventSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    if (!isGetEventPayload(row["payload"]))
        throw new pgsid.QueryValidationError("GetEvent", "payload", validateGetEventPayload(row["payload"]).issues);
    if (!isGetEventActor(row["actor"]))
        throw new pgsid.QueryValidationError("GetEvent", "actor", validateGetEventActor(row["actor"]).issues);
    return row as GetEventRow;
}
