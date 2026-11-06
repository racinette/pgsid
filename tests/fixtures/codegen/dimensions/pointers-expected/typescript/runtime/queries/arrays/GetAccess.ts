import type { GetAccessParams, GetAccessRow } from "../../../types/queries/arrays/GetAccess.js";
export type { GetAccessParams, GetAccessRow } from "../../../types/queries/arrays/GetAccess.js";
import type * as pgsid from "./pgsid/queryable.js";
function decodeInt(value: string | null): number | null {
    return value === null ? null : Number(value);
}
function decodeArray(value: string | null, element: (item: string | null) => unknown, delimiter: string): unknown {
    if (value === null)
        return null;
    let index = value.startsWith("[") ? value.indexOf("=") + 1 : 0;
    const list = (): unknown[] => {
        index++;
        const items: unknown[] = [];
        if (value[index] === "}") {
            index++;
            return items;
        }
        for (;;) {
            if (value[index] === "{")
                items.push(list());
            else if (value[index] === "\"") {
                let text = "";
                for (index++; value[index] !== "\""; index++)
                    text += value[index] === "\\" ? value[++index] : value[index];
                index++;
                items.push(element(text));
            }
            else {
                const start = index;
                while (value[index] !== delimiter && value[index] !== "}")
                    index++;
                const text = value.slice(start, index);
                items.push(element(text === "NULL" ? null : text));
            }
            if (value[index++] === "}")
                return items;
        }
    };
    return list();
}
export const getAccessSql = "SELECT matrix[1][2] AS element, matrix[1] AS incomplete,\nmatrix[1:2][1:2] AS sliced, flexible[1:2] AS flexible_slice FROM arrays;";
export async function getAccess(db: pgsid.Queryable): Promise<GetAccessRow | undefined> {
    const result = await db.queryText(getAccessSql, []);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "element": decodeInt(values[0]), "incomplete": decodeInt(values[1]), "sliced": decodeArray(values[2], decodeInt, ","), "flexible_slice": decodeArray(values[3], decodeInt, ",") };
    return row as GetAccessRow;
}
