import type { ValidationIssue as _ValidationIssue } from "./validation.js";
export const _hasOwn = (object: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);
export const _deepEqual = (left: unknown, right: unknown): boolean => {
    if (Object.is(left, right))
        return true;
    if (typeof left !== "object" || left === null || typeof right !== "object" || right === null)
        return false;
    if (Array.isArray(left) || Array.isArray(right))
        return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => _deepEqual(item, right[index]));
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = Object.keys(leftRecord);
    return keys.length === Object.keys(rightRecord).length && keys.every(key => _hasOwn(rightRecord, key) && _deepEqual(leftRecord[key], rightRecord[key]));
};
export function _check(valid: boolean, value: unknown, path: readonly (string | number)[], keyword: string, expected: unknown, _issues: _ValidationIssue[]): boolean {
    if (valid)
        return true;
    const received = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    _issues.push({ path: [...path], keyword, expected, received, message: keyword === "type" ? "Expected " + (typeof expected === "string" ? expected : JSON.stringify(expected)) + ", received " + received : ({ required: "Missing required property", dependentRequired: "Missing dependent property", additionalProperties: "Unexpected property", falseSchema: "Value is forbidden by the schema", items: "Additional array item is forbidden", prefixItems: "Array item is forbidden", propertyNames: "Property name is forbidden", uniqueItems: "Array items must be unique", not: "Value matches a forbidden schema", anyOf: "No alternative matches", oneOf: "Expected exactly one matching alternative" } as Record<string, string>)[keyword] ?? keyword + ": expected " + (typeof expected === "string" ? expected : JSON.stringify(expected)) + ", received " + received });
    return false;
}
export function _probe(test: () => boolean, _issues: _ValidationIssue[]): boolean {
    const start = _issues.length;
    try {
        return test();
    }
    finally {
        _issues.length = start;
    }
}
export function _union(tests: (() => boolean)[], value: unknown, path: readonly (string | number)[], keyword: string, _issues: _ValidationIssue[]): boolean {
    const start = _issues.length;
    let matches = 0;
    for (const test of tests) {
        if (test()) {
            matches++;
            if (keyword === "anyOf") {
                _issues.length = start;
                return true;
            }
        }
    }
    if (matches === 1) {
        _issues.length = start;
        return true;
    }
    if (matches > 0)
        _issues.length = start;
    return _check(false, value, path, keyword, keyword === "oneOf" ? "exactly one matching alternative" : "at least one matching alternative", _issues);
}
export function _include(result: {
    valid: boolean;
    issues: {
        path: readonly (string | number)[];
        keyword: string;
        expected: unknown;
        received: string;
        message: string;
    }[];
}, path: readonly (string | number)[], _issues: _ValidationIssue[]): boolean {
    _issues.push(...result.issues.map(issue => ({ ...issue, path: [...path, ...issue.path] })));
    return result.valid;
}
