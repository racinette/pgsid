import type { GetEventParams, GetEventRow } from "../../../../types/queries/admin/events/GetEvent.js";
export type { GetEventParams, GetEventRow } from "../../../../types/queries/admin/events/GetEvent.js";
import type * as pgsid from "./pgsid/queryable.js";
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
export const getEventSql = "SELECT id, source_id, state, metadata FROM billing.events WHERE id = $1;";
export async function getEvent(db: pgsid.Queryable, params: GetEventParams): Promise<GetEventRow | undefined> {
    const result = await db.queryText(getEventSql, [encodeBigint(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "id": decodeBigint(values[0]), "source_id": decodeBigint(values[1]), "state": decodeText(values[2]), "metadata": decodeText(values[3]) };
    return row as GetEventRow;
}
