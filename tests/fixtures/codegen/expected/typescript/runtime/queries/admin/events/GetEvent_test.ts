import type { GetEventTestParams, GetEventTestRow } from "../../../../types/queries/admin/events/GetEvent_test.js";
export type { GetEventTestParams, GetEventTestRow } from "../../../../types/queries/admin/events/GetEvent_test.js";
import type * as pgsid from "./pgsid/queryable.js";
export const getEventTestSql = "SELECT 2 AS value;";
export async function getEventTest(db: pgsid.Queryable): Promise<GetEventTestRow | undefined> {
    const result = await db.query(getEventTestSql, []);
    const row = result.rows[0];
    if (row === undefined)
        return undefined;
    return row as GetEventTestRow;
}
