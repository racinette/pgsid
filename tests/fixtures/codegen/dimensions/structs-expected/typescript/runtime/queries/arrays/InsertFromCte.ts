import type { InsertFromCteParams } from "../../../types/queries/arrays/InsertFromCte.js";
export type { InsertFromCteParams } from "../../../types/queries/arrays/InsertFromCte.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function encodeInt(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "number" || !Number.isSafeInteger(value))
        return encodeInvalid(name, "integer");
    return String(value);
}
function encodeArray(value: unknown, element: (item: unknown, name: string) => string | null, delimiter: string, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    const list = (items: unknown): string => {
        if (!Array.isArray(items))
            return encodeInvalid(name, "array");
        return "{" + items.map(item => {
            if (Array.isArray(item))
                return list(item);
            const text = element(item, name);
            return text === null ? "NULL" : "\"" + text.replace(/[\\"]/gu, "\\$&") + "\"";
        }).join(delimiter) + "}";
    };
    return list(value);
}
export const insertFromCteSql = "WITH input AS (SELECT $1::integer[] AS matrix, $2::integer[] AS flexible)\nINSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nSELECT 1, ARRAY[1], matrix, flexible, ARRAY[1]::user_id[] FROM input;";
export async function insertFromCte(db: pgsid.Queryable, params: InsertFromCteParams): Promise<void> {
    await db.queryText(insertFromCteSql, [encodeArray(params["matrix"], encodeInt, ",", "matrix"), encodeArray(params["flexible"], encodeInt, ",", "flexible")]);
}
