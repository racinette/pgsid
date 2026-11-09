import type { ReturnManyParams, ReturnManyRow } from "../../../types/queries/arrays/ReturnMany.js";
export type { ReturnManyParams, ReturnManyRow } from "../../../types/queries/arrays/ReturnMany.js";
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
function encodeArray(value: unknown, element: (item: unknown, name: string) => string | null, delimiter: string, dimensions: readonly number[], name: string): string | null {
    if (value === null || value === undefined)
        return null;
    let depth = dimensions[0]!;
    if (dimensions.length > 1) {
        if (!value || typeof value !== "object" || !("dimensions" in value) || !("elements" in value) || typeof value.dimensions !== "number" || !dimensions.includes(value.dimensions))
            return encodeInvalid(name, "array");
        depth = value.dimensions;
        value = value.elements;
    }
    const list = (items: unknown, level: number): string => {
        if (!Array.isArray(items))
            return encodeInvalid(name, "array");
        return "{" + items.map(item => {
            if (level > 1)
                return list(item, level - 1);
            const text = item === null ? null : element(item, name);
            return text === null ? "NULL" : "\"" + text.replace(/[\\"]/gu, "\\$&") + "\"";
        }).join(delimiter) + "}";
    };
    return list(value, depth);
}
export const returnManySql = "UPDATE arrays SET flexible = $1 RETURNING flexible;";
export async function returnMany(db: pgsid.Queryable, params: ReturnManyParams): Promise<ReturnManyRow[]> {
    const result = await db.queryText(returnManySql, [encodeArray(params["flexible"], encodeInt, ",", [1, 2], "flexible")]);
    return result.rows.map(values => {
        const row = { "flexible": decodeArray(values[0], decodeInt, ",", [1, 2], "sql.codegen.typescript.mappings.column[\"public.arrays.flexible\"].dimensions") };
        return row as ReturnManyRow;
    });
}
