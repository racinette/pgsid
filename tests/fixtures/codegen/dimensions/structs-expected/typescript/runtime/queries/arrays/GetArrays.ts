import type { GetArraysParams, GetArraysRow } from "../../../types/queries/arrays/GetArrays.js";
export type { GetArraysParams, GetArraysRow } from "../../../types/queries/arrays/GetArrays.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function decodeInt(value: string | null): number | null {
    return value === null ? null : Number(value);
}
function encodeInt(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "number" || !Number.isSafeInteger(value))
        return encodeInvalid(name, "integer");
    return String(value);
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
export const getArraysSql = "SELECT ordinary, matrix, cube, flexible, optional_flexible, owners FROM arrays WHERE id = $1;";
export async function getArrays(db: pgsid.Queryable, params: GetArraysParams): Promise<GetArraysRow | undefined> {
    const result = await db.queryText(getArraysSql, [encodeInt(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "ordinary": decodeArray(values[0], decodeInt, ",", [1], "the default of one array dimension"), "matrix": decodeArray(values[1], decodeInt, ",", [2], "sql.codegen.typescript.mappings.column[\"public.arrays.matrix\"].dimensions"), "cube": decodeArray(values[2], decodeInt, ",", [3], "sql.codegen.typescript.mappings.column[\"public.arrays.cube\"].dimensions"), "flexible": decodeArray(values[3], decodeInt, ",", [1, 2], "sql.codegen.typescript.mappings.column[\"public.arrays.flexible\"].dimensions"), "optional_flexible": decodeArray(values[4], decodeInt, ",", [1, 2], "sql.codegen.typescript.mappings.column[\"public.arrays.optional_flexible\"].dimensions"), "owners": decodeArray(values[5], decodeInt, ",", [2], "sql.codegen.typescript.mappings.column[\"public.arrays.owners\"].dimensions") };
    return row as GetArraysRow;
}
