import type { GetEventStatesParams, GetEventStatesRow } from "../../../types/queries/events/GetEventStates.js";
export type { GetEventStatesParams, GetEventStatesRow } from "../../../types/queries/events/GetEventStates.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getEventStatesSql = "SELECT states FROM public.events WHERE id = $1;";
export async function getEventStates(db: pgsid.Queryable, params: GetEventStatesParams): Promise<GetEventStatesRow | undefined> {
    const result = await db.query(getEventStatesSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetEventStatesRow;
}
