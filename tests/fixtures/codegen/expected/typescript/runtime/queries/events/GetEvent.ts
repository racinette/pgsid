import type { GetEventParams, GetEventRow } from "../../../types/queries/events/GetEvent.js";
export type { GetEventParams, GetEventRow } from "../../../types/queries/events/GetEvent.js";
import * as pgsid from "./pgsid/queryable.js";
export { QueryValidationError } from "./pgsid/queryable.js";
import * as _jsonSchemas from "../../jsonschemas/index.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function decodeBigint(value: string | null): bigint | null {
    return value === null ? null : BigInt(value);
}
function encodeBigint(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "bigint")
        return encodeInvalid(name, "bigint");
    return String(value);
}
function decodeText(value: string | null): string | null {
    return value;
}
function decodeJson(value: string | null): unknown {
    return value === null ? null : JSON.parse(value);
}
function temporalOutput(type: string, value: string): never {
    throw new TypeError("Unexpected " + type + " output " + JSON.stringify(value) + "; generated code reads the ISO DateStyle and the postgres or iso_8601 IntervalStyle");
}
function civilDays(year: number, month: number, day: number): number {
    const shifted = month <= 2 ? year - 1 : year;
    const era = Math.floor(shifted / 400);
    const yearOfEra = shifted - era * 400;
    const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
    return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear - 719468;
}
function readTimestamp(value: string, type: string, zoned: boolean): bigint | {
    infinity: 1 | -1;
} {
    if (value === "infinity")
        return { infinity: 1 };
    if (value === "-infinity")
        return { infinity: -1 };
    const match = /^([0-9]{4,})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,6}))?(?:([+-])([0-9]{2})(?::([0-9]{2}))?(?::([0-9]{2}))?)?( BC)?$/u.exec(value);
    if (!match || Boolean(match[8]) !== zoned)
        return temporalOutput(type, value);
    const year = match[12] ? 1 - Number(match[1]) : Number(match[1]);
    const seconds = Number(match[4]) * 3600 + Number(match[5]) * 60 + Number(match[6]);
    const offset = match[8] ? (match[8] === "-" ? -1 : 1) * (Number(match[9]) * 3600 + Number(match[10] ?? 0) * 60 + Number(match[11] ?? 0)) : 0;
    return BigInt(civilDays(year, Number(match[2]), Number(match[3]))) * 86400000000n + BigInt(seconds - offset) * 1000000n + BigInt((match[7] ?? "").padEnd(6, "0"));
}
function decodeTimestamptz(value: string | null): unknown {
    if (value === null)
        return null;
    const read = readTimestamp(value, "timestamptz", true);
    return typeof read === "bigint" ? { epochMicroseconds: read } : read;
}
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
    const result = await db.queryText(getEventSql, [encodeBigint(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "id": decodeBigint(values[0]), "payload": decodeJson(values[1]), "actor": decodeJson(values[2]), "state": decodeText(values[3]), "created_at": decodeTimestamptz(values[4]), "joined_account_id": decodeBigint(values[5]), "display_name": decodeText(values[6]) };
    if (!isGetEventPayload(row["payload"]))
        throw new pgsid.QueryValidationError("GetEvent", "payload", validateGetEventPayload(row["payload"]).issues);
    if (!isGetEventActor(row["actor"]))
        throw new pgsid.QueryValidationError("GetEvent", "actor", validateGetEventActor(row["actor"]).issues);
    return row as GetEventRow;
}
