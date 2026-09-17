import type { ValidationIssue as _ValidationIssue, ValidationResult as _ValidationResult } from "./pgsid/validation.js";
import { _check, _hasOwn } from "./pgsid/json-schema.js";
function _is0(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return (typeof value === "object" && value !== null && !Array.isArray(value) || value === null) && (typeof value === "object" && value !== null && !Array.isArray(value) ? (!_hasOwn(value as Record<string, unknown>, "actor") || _is1((value as Record<string, unknown>)["actor"], _active)) && Object.entries(value as Record<string, unknown>).every(([key, _item]) => ["actor"].includes(key)) : true);
}
function _validate0(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "object" && value !== null && !Array.isArray(value) || value === null, value, path, "type", ["object", "null"], _issues) && (typeof value === "object" && value !== null && !Array.isArray(value) ? [!_hasOwn(value as Record<string, unknown>, "actor") || _validate1((value as Record<string, unknown>)["actor"], [...path, "actor"], _active, _issues), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["actor"].includes(key) || _check(false, item, [...path, key], "additionalProperties", false, _issues)).every(valid => valid)].every(valid => valid) : true);
}
function _is1(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "number" && Number.isInteger(value) && (typeof value !== "number" || value as number >= 1);
}
function _validate1(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "number" && Number.isInteger(value), value, path, "type", "integer", _issues) && (typeof value !== "number" || _check(value as number >= 1, value, path, "minimum", 1, _issues));
}
function _is2(_value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return false;
}
function _validate2(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(false, value, path, "falseSchema", false, _issues);
}
function _is3(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? (!_hasOwn(value as Record<string, unknown>, "actor") || _is1((value as Record<string, unknown>)["actor"], _active)) && Object.entries(value as Record<string, unknown>).every(([key, _item]) => ["actor"].includes(key)) : true);
}
function _validate3(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "object" && value !== null && !Array.isArray(value), value, path, "type", "object", _issues) && (typeof value === "object" && value !== null && !Array.isArray(value) ? [!_hasOwn(value as Record<string, unknown>, "actor") || _validate1((value as Record<string, unknown>)["actor"], [...path, "actor"], _active, _issues), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["actor"].includes(key) || _check(false, item, [...path, key], "additionalProperties", false, _issues)).every(valid => valid)].every(valid => valid) : true);
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
const _schema2 = {
    is: (value: unknown): boolean => _is2(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate2(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
const _schema3 = {
    is: (value: unknown): boolean => _is3(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate3(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
export const schemaValidators = {
    "": _schema0,
    "/properties/actor": _schema1,
    "/additionalProperties": _schema2
};
export function isMaybe(value: unknown): value is import("../../types/jsonschemas/Maybe.js").Maybe {
    return _schema0.is(value);
}
export function validateMaybe(value: unknown): _ValidationResult {
    return _schema0.validate(value);
}
export function isMaybeObject(value: unknown): value is import("../../types/jsonschemas/Maybe.js").MaybeObject {
    return _schema3.is(value);
}
export function validateMaybeObject(value: unknown): _ValidationResult {
    return _schema3.validate(value);
}
