import type { ValidationIssue as _ValidationIssue, ValidationResult as _ValidationResult } from "./pgsid/validation.js";
import { _check, _hasOwn } from "./pgsid/json-schema.js";
function _is0(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? (!_hasOwn(value as Record<string, unknown>, "source") || _is1((value as Record<string, unknown>)["source"], _active)) && Object.entries(value as Record<string, unknown>).every(([key, _item]) => ["source"].includes(key)) : true);
}
function _validate0(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "object" && value !== null && !Array.isArray(value), value, path, "type", "object", _issues) && (typeof value === "object" && value !== null && !Array.isArray(value) ? [!_hasOwn(value as Record<string, unknown>, "source") || _validate1((value as Record<string, unknown>)["source"], [...path, "source"], _active, _issues), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["source"].includes(key) || _check(false, item, [...path, key], "additionalProperties", false, _issues)).every(valid => valid)].every(valid => valid) : true);
}
function _is1(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "string";
}
function _validate1(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "string", value, path, "type", "string", _issues);
}
function _is2(_value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return false;
}
function _validate2(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(false, value, path, "falseSchema", false, _issues);
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
export const schemaValidators = {
    "": _schema0,
    "/properties/source": _schema1,
    "/additionalProperties": _schema2
};
export function isEventAudit(value: unknown): value is import("../../types/jsonschemas/EventAudit.js").EventAudit {
    return _schema0.is(value);
}
export function validateEventAudit(value: unknown): _ValidationResult {
    return _schema0.validate(value);
}
