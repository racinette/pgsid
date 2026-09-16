import type { GetEventTypesParams, GetEventTypesRow } from "../../../types/queries/events/GetEventTypes.js";
export type { GetEventTypesParams, GetEventTypesRow } from "../../../types/queries/events/GetEventTypes.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getEventTypesSql = "SELECT id, default_id, state, states, ARRAY[1, NULL]::int4[] AS numbers\nFROM public.events WHERE id = $1;";
export async function getEventTypes(db: pgsid.Queryable, params: GetEventTypesParams): Promise<GetEventTypesRow | undefined> {
    const result = await db.query(getEventTypesSql, [params["id"]]);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetEventTypesRow;
}
