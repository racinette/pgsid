export type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | {
    [key: string]: PgsidJsonValue;
};
export interface PgsidJson<T = PgsidJsonValue> {
    readonly text: string;
    value(): T;
    safeValue(): {
        readonly ok: true;
        readonly value: T;
    } | {
        readonly ok: false;
        readonly error: Error;
    };
}
export function json<T = PgsidJsonValue>(value: T): PgsidJson<T> {
    const text = JSON.stringify(value);
    if (typeof text !== "string")
        throw new TypeError("A JSON value cannot be undefined, a function or a symbol");
    return jsonText<T>(text);
}
export function jsonText<T = PgsidJsonValue>(text: string): PgsidJson<T> {
    if (typeof text !== "string")
        throw new TypeError("JSON text must be a string");
    let read: {
        value: T;
    } | {
        error: Error;
    } | undefined;
    const parsed = () => {
        if (!read)
            try {
                read = { value: JSON.parse(text) as T };
            }
            catch (error) {
                read = { error: error instanceof Error ? error : new Error(String(error)) };
            }
        return read;
    };
    return Object.assign(Object.create(null), {
        [Symbol.for("pgsid.json")]: true,
        text,
        value(): T {
            const result = parsed();
            if ("error" in result)
                throw result.error;
            return result.value;
        },
        safeValue() {
            const result = parsed();
            return "error" in result ? { ok: false as const, error: result.error } : { ok: true as const, value: result.value };
        },
    }) as PgsidJson<T>;
}
export interface Queryable {
    queryText(sql: string, values: readonly (string | null)[]): Promise<{
        rows: readonly (readonly (string | null)[])[];
        rowCount?: number | null;
    }>;
}
const textParser = (value: string): string => value;
export function fromPg(client: {
    query(config: {
        text: string;
        values: (string | null)[];
        rowMode: "array";
        types: {
            getTypeParser: (...args: never[]) => (value: string) => string;
        };
    }): Promise<{
        rows: unknown[];
        rowCount: number | null;
    }>;
}): Queryable {
    const types = { getTypeParser: () => textParser };
    return {
        async queryText(text, values) {
            const result = await client.query({ text, values: [...values], rowMode: "array", types });
            return { rows: result.rows as (string | null)[][], rowCount: result.rowCount };
        },
    };
}
const pgliteText: Record<number, (value: string) => string> = {};
for (let oid = 1; oid < 16384; oid++)
    pgliteText[oid] = textParser;
export function fromPglite(db: {
    query(sql: string, params: unknown[], options: {
        rowMode: "array";
        parsers: Record<number, (value: string) => string>;
        serializers: Record<number, (value: unknown) => string>;
    }): Promise<{
        rows: unknown[];
        affectedRows?: number;
    }>;
}): Queryable {
    return {
        async queryText(sql, values) {
            const result = await db.query(sql, [...values], { rowMode: "array", parsers: pgliteText, serializers: pgliteText as Record<number, (value: unknown) => string> });
            return { rows: result.rows as (string | null)[][], rowCount: result.affectedRows ?? null };
        },
    };
}
export { QueryValidationError, type ValidationIssue } from "../../../jsonschemas/pgsid/validation.js";
