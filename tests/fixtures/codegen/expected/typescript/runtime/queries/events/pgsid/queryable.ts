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
