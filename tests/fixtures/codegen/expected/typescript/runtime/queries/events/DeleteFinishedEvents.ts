import type { DeleteFinishedEventsParams } from "../../../types/queries/events/DeleteFinishedEvents.js";
export type { DeleteFinishedEventsParams } from "../../../types/queries/events/DeleteFinishedEvents.js";
import type * as pgsid from "./pgsid/queryable.js";
export const deleteFinishedEventsSql = "DELETE FROM public.events\nWHERE state = $1;";
export async function deleteFinishedEvents(db: pgsid.Queryable, params: DeleteFinishedEventsParams): Promise<number> {
    const result = await db.query(deleteFinishedEventsSql, [params["state"]]);
    return result.rowCount ?? 0;
}
