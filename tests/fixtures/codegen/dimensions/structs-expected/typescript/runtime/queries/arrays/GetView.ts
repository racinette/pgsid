import type { GetViewParams, GetViewRow } from "../../../types/queries/arrays/GetView.js";
export type { GetViewParams, GetViewRow } from "../../../types/queries/arrays/GetView.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getViewSql = "SELECT matrix, flexible FROM array_view;";
export async function getView(db: pgsid.Queryable): Promise<GetViewRow | undefined> {
    const result = await db.query(getViewSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetViewRow;
}
