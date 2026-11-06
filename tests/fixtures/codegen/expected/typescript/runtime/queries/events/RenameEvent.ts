import type { RenameEventParams } from "../../../types/queries/events/RenameEvent.js";
export type { RenameEventParams } from "../../../types/queries/events/RenameEvent.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeBigint(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "bigint")
        return encodeInvalid(name, "bigint");
    return String(value);
}
function encodeText(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "string")
        return encodeInvalid(name, "text");
    return value;
}
export const renameEventSql = "UPDATE public.events SET note = $1 WHERE id = $2;";
export async function renameEvent(db: pgsid.Queryable, params: RenameEventParams): Promise<void> {
    await db.queryText(renameEventSql, [encodeText(params["note"], "note"), encodeBigint(params["id"], "id")]);
}
