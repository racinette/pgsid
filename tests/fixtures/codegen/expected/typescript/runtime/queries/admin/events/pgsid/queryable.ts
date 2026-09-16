export interface Queryable {
    query(sql: string, values?: unknown[]): Promise<{
        rows: Record<string, unknown>[];
        rowCount?: number | null;
    }>;
}
export { QueryValidationError, type ValidationIssue } from "../../../../jsonschemas/pgsid/validation.js";
