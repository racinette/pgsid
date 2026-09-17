export type ValidationIssue = {
    path: readonly (string | number)[];
    keyword: string;
    expected: unknown;
    received: string;
    message: string;
};
export type ValidationResult = {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
};
export class QueryValidationError extends TypeError {
    constructor(readonly query: string, readonly column: string, readonly issues: readonly ValidationIssue[]) {
        super("Invalid " + query + "." + column + ": " + issues.map(issue => (issue.path.length ? issue.path.join(".") + ": " : "") + issue.message).join("; "));
        this.name = "QueryValidationError";
    }
}
