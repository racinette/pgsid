import type { GetNestedParams, GetNestedRow } from "../../../types/queries/arrays/GetNested.js";
export type { GetNestedParams, GetNestedRow } from "../../../types/queries/arrays/GetNested.js";
import type * as pgsid from "./pgsid/queryable.js";
function decodeInt(value: string | null): number | null {
    return value === null ? null : Number(value);
}
function arrayDimensionError(depth: number, dimensions: readonly number[], setting: string): never {
    throw new Error("The server returned an array of " + depth + " dimensions where " + setting + " allows " + dimensions.join(" or "));
}
function decodeArray(value: string | null, element: (item: string | null) => unknown, delimiter: string, dimensions: readonly number[], setting: string): unknown {
    if (value === null)
        return null;
    const malformed = (): never => {
        throw new TypeError("Malformed array text: " + JSON.stringify(value));
    };
    let index = value.startsWith("[") ? value.indexOf("=") + 1 : 0;
    if (value[index] !== "{")
        malformed();
    let depth = 0;
    while (value[index + depth] === "{")
        depth++;
    if (value[index + depth] === "}" && depth === 1)
        depth = 0;
    if (depth && !dimensions.includes(depth))
        arrayDimensionError(depth, dimensions, setting);
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
                for (index++; value[index] !== "\""; index++) {
                    if (index >= value.length)
                        malformed();
                    text += value[index] === "\\" ? value[++index] : value[index];
                }
                index++;
                items.push(element(text));
            }
            else {
                const start = index;
                while (value[index] !== delimiter && value[index] !== "}")
                    if (++index > value.length)
                        malformed();
                const text = value.slice(start, index);
                items.push(element(text === "NULL" ? null : text));
            }
            if (value[index] !== delimiter && value[index] !== "}")
                malformed();
            if (value[index++] === "}")
                return items;
        }
    };
    const elements = list();
    return dimensions.length === 1 ? elements : { dimensions: depth || dimensions[0], elements };
}
export const getNestedSql = "WITH first AS (SELECT matrix, flexible FROM arrays),\nsecond AS (SELECT matrix AS renamed, flexible FROM first)\nSELECT renamed, flexible FROM second;";
export async function getNested(db: pgsid.Queryable): Promise<GetNestedRow | undefined> {
    const result = await db.queryText(getNestedSql, []);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "renamed": decodeArray(values[0], decodeInt, ",", [2], "sql.codegen.typescript.mappings.column[\"public.arrays.matrix\"].dimensions"), "flexible": decodeArray(values[1], decodeInt, ",", [1, 2], "sql.codegen.typescript.mappings.column[\"public.arrays.flexible\"].dimensions") };
    return row as GetNestedRow;
}
