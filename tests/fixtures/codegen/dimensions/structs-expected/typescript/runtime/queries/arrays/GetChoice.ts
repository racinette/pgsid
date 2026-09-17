import type { GetChoiceParams, GetChoiceRow } from "../../../types/queries/arrays/GetChoice.js";
export type { GetChoiceParams, GetChoiceRow } from "../../../types/queries/arrays/GetChoice.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getChoiceSql = "SELECT CASE WHEN id > 0 THEN matrix ELSE ordinary END AS mixed FROM arrays;";
export async function getChoice(db: pgsid.Queryable): Promise<GetChoiceRow | undefined> {
    const result = await db.query(getChoiceSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetChoiceRow;
}
