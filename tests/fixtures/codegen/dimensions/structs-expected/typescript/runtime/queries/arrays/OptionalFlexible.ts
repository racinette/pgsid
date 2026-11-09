import type { OptionalFlexibleParams, OptionalFlexibleRow } from "../../../types/queries/arrays/OptionalFlexible.js";
export type { OptionalFlexibleParams, OptionalFlexibleRow } from "../../../types/queries/arrays/OptionalFlexible.js";
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
    let index = value.startsWith("[") ? value.indexOf("=") + 1 : 0;
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
    const elements = list();
    return dimensions.length === 1 ? elements : { dimensions: depth || dimensions[0], elements };
}
export const optionalFlexibleSql = "SELECT optional_flexible FROM arrays;";
export async function optionalFlexible(db: pgsid.Queryable): Promise<OptionalFlexibleRow | undefined> {
    const result = await db.queryText(optionalFlexibleSql, []);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "optional_flexible": decodeArray(values[0], decodeInt, ",", [1, 2], "sql.codegen.typescript.mappings.column[\"public.arrays.optional_flexible\"].dimensions") };
    return row as OptionalFlexibleRow;
}
