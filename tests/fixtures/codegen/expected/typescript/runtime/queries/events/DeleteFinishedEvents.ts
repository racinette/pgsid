import type { DeleteFinishedEventsParams } from "../../../types/queries/events/DeleteFinishedEvents.js";
export type { DeleteFinishedEventsParams } from "../../../types/queries/events/DeleteFinishedEvents.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeText(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "string")
        return encodeInvalid(name, "text");
    return value;
}
export const deleteFinishedEventsSql = "DELETE FROM public.events\nWHERE state = $1;";
export async function deleteFinishedEvents(db: pgsid.Queryable, params: DeleteFinishedEventsParams): Promise<number> {
    const result = await db.queryText(deleteFinishedEventsSql, [encodeText(params["state"], "state")]);
    return result.rowCount ?? 0;
}
