import type { GetEventParams, GetEventRow } from "../../../../types/queries/admin/events/GetEvent.js";
export type { GetEventParams, GetEventRow } from "../../../../types/queries/admin/events/GetEvent.js";
import type * as pgsid from "./pgsid/queryable.js";
function encodeInvalid(name: string, type: string): never {
    throw new TypeError("Parameter " + name + " holds a malformed " + type + " value");
}
function decodeBigint(value: string | null): bigint | null {
    return value === null ? null : BigInt(value);
}
function encodeBigint(value: unknown, name: string): string | null {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== "bigint")
        return encodeInvalid(name, "bigint");
    return String(value);
}
function decodeText(value: string | null): string | null {
    return value;
}
function decodeComposite(value: string | null, fields: readonly (readonly [
    string,
    (item: string | null) => unknown
])[]): unknown {
    if (value === null)
        return null;
    const row: Record<string, unknown> = {};
    let index = 1;
    for (const [name, element] of fields) {
        if (value[index] === "," || value[index] === ")")
            row[name] = element(null);
        else {
            let text = "";
            let quoted = false;
            while (index < value.length) {
                const character = value[index]!;
                if (character === "\"") {
                    if (quoted && value[index + 1] === "\"") {
                        text += "\"";
                        index += 2;
                    }
                    else {
                        quoted = !quoted;
                        index++;
                    }
                }
                else if (character === "\\") {
                    text += value[index + 1];
                    index += 2;
                }
                else if (!quoted && (character === "," || character === ")"))
                    break;
                else {
                    text += character;
                    index++;
                }
            }
            row[name] = element(text);
        }
        index++;
    }
    return row;
}
export const getEventSql = "SELECT id, source_id, state, metadata FROM billing.events WHERE id = $1;";
export async function getEvent(db: pgsid.Queryable, params: GetEventParams): Promise<GetEventRow | undefined> {
    const result = await db.queryText(getEventSql, [encodeBigint(params["id"], "id")]);
    const values = result.rows[0];
    if (values === undefined)
        return undefined;
    const row = { "id": decodeBigint(values[0]), "source_id": decodeBigint(values[1]), "state": decodeText(values[2]), "metadata": decodeComposite(values[3], [["event", decodeBigint]]) };
    return row as GetEventRow;
}
