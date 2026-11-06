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
export const returnManySql = "UPDATE arrays SET flexible = $1 RETURNING flexible;";
export async function returnMany(db: pgsid.Queryable, params: ReturnManyParams): Promise<ReturnManyRow[]> {
    const result = await db.queryText(returnManySql, [encodeArray(params["flexible"], encodeInt, ",", "flexible")]);
    return result.rows.map(values => {
        const row = { "flexible": decodeArray(values[0], decodeInt, ",") };
        return row as ReturnManyRow;
    });
}
