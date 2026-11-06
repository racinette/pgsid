import type { GetEventTestParams, GetEventTestRow } from "../../../../types/queries/admin/events/GetEvent_test.js";
export type { GetEventTestParams, GetEventTestRow } from "../../../../types/queries/admin/events/GetEvent_test.js";
import type * as pgsid from "./pgsid/queryable.js";
function decodeInt(value: string | null): number | null {
    return value === null ? null : Number(value);
}
export const getEventTestSql = "SELECT 2 AS value;";
export async function getEventTest(db: pgsid.Queryable): Promise<GetEventTestRow | undefined> {
    const result = await db.queryText(getEventTestSql, []);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "value": decodeInt(values[0]) };
    return row as GetEventTestRow;
}
