export function isEventAudit(value: unknown): value is import("../../types/jsonschemas/EventAudit.js").EventAudit {
    const _hasOwn = (object: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);
    return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? (!_hasOwn(value as Record<string, unknown>, "source") || typeof (value as Record<string, unknown>)["source"] === "string") && Object.entries(value as Record<string, unknown>).every(([key, item]) => ["source"].includes(key)) : true);
}
export function validateEventAudit(value: unknown): {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
} {
    const _issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[] = [];
    function _check(valid: boolean, value: unknown, path: readonly (string | number)[], keyword: string, expected: unknown): boolean {
        if (valid)
            return true;
        const received = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
        _issues.push({ path: [...path], keyword, expected, received, message: keyword === "type" ? "Expected " + (typeof expected === "string" ? expected : JSON.stringify(expected)) + ", received " + received : ({ required: "Missing required property", dependentRequired: "Missing dependent property", additionalProperties: "Unexpected property", falseSchema: "Value is forbidden by the schema", items: "Additional array item is forbidden", prefixItems: "Array item is forbidden", propertyNames: "Property name is forbidden", uniqueItems: "Array items must be unique", not: "Value matches a forbidden schema", anyOf: "No alternative matches", oneOf: "Expected exactly one matching alternative" } as Record<string, string>)[keyword] ?? keyword + ": expected " + (typeof expected === "string" ? expected : JSON.stringify(expected)) + ", received " + received });
        return false;
    }
    const _hasOwn = (object: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);
    const valid = _check(typeof value === "object" && value !== null && !Array.isArray(value), value, [], "type", "object") && (typeof value === "object" && value !== null && !Array.isArray(value) ? [!_hasOwn(value as Record<string, unknown>, "source") || _check(typeof (value as Record<string, unknown>)["source"] === "string", (value as Record<string, unknown>)["source"], ["source"], "type", "string"), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["source"].includes(key) || _check(false, item, [key], "additionalProperties", false)).every(valid => valid)].every(valid => valid) : true);
    return { valid, issues: _issues };
}
