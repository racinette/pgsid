import type { ValidationIssue as _ValidationIssue, ValidationResult as _ValidationResult } from "./pgsid/validation.js";
import { _check } from "./pgsid/json-schema.js";
function _is0(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return Array.isArray(value) && (!Array.isArray(value) || (value as unknown[]).slice(0).every(item => typeof item === "number" && Number.isInteger(item) && (typeof item !== "number" || item as number >= 1)));
}
function _validate0(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(Array.isArray(value), value, path, "type", "array", _issues) && (!Array.isArray(value) || (value as unknown[]).slice(0).map((item, index) => _check(typeof item === "number" && Number.isInteger(item), item, [...path, index], "type", "integer", _issues) && (typeof item !== "number" || _check(item as number >= 1, item, [...path, index], "minimum", 1, _issues))).every(valid => valid));
}
function _is1(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "number" && Number.isInteger(value) && (typeof value !== "number" || value as number >= 1);
}
function _validate1(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "number" && Number.isInteger(value), value, path, "type", "integer", _issues) && (typeof value !== "number" || _check(value as number >= 1, value, path, "minimum", 1, _issues));
}
const _schema0 = {
    is: (value: unknown): boolean => _is0(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate0(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
const _schema1 = {
    is: (value: unknown): boolean => _is1(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate1(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
export const schemaValidators = {
    "": _schema0,
    "/items": _schema1
};
export function isNumbers(value: unknown): value is import("../../types/jsonschemas/Numbers.js").Numbers {
    return _schema0.is(value);
}
export function validateNumbers(value: unknown): _ValidationResult {
    return _schema0.validate(value);
}
