import type { SharedDimensionsParams } from "../../../types/queries/arrays/SharedDimensions.js";
export type { SharedDimensionsParams } from "../../../types/queries/arrays/SharedDimensions.js";
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
export const sharedDimensionsSql = "INSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nVALUES (1, ARRAY[1], $1, $1, ARRAY[1]::user_id[]);";
export async function sharedDimensions(db: pgsid.Queryable, params: SharedDimensionsParams): Promise<void> {
    await db.queryText(sharedDimensionsSql, [encodeArray(params["shared"], encodeInt, ",", "shared")]);
}
