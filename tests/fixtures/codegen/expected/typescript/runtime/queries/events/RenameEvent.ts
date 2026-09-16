import type { RenameEventParams } from "../../../types/queries/events/RenameEvent.js";
export type { RenameEventParams } from "../../../types/queries/events/RenameEvent.js";
import type * as pgsid from "./pgsid/queryable.js";
export const renameEventSql = "UPDATE public.events SET note = $1 WHERE id = $2;";
export async function renameEvent(db: pgsid.Queryable, params: RenameEventParams): Promise<void> {
    await db.query(renameEventSql, [params["note"], params["id"]]);
}
