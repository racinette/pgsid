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
export const getArraysSql = "SELECT ordinary, matrix, cube, flexible, optional_flexible, owners FROM arrays WHERE id = $1;";
export async function getArrays(db: pgsid.Queryable, params: GetArraysParams): Promise<GetArraysRow | undefined> {
    const result = await db.queryText(getArraysSql, [encodeInt(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "ordinary": decodeArray(values[0], decodeInt, ","), "matrix": decodeArray(values[1], decodeInt, ","), "cube": decodeArray(values[2], decodeInt, ","), "flexible": decodeArray(values[3], decodeInt, ","), "optional_flexible": decodeArray(values[4], decodeInt, ","), "owners": decodeArray(values[5], decodeInt, ",") };
    return row as GetArraysRow;
}
