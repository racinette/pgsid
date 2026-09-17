import type { ValidationIssue as _ValidationIssue, ValidationResult as _ValidationResult } from "./pgsid/validation.js";
import { _check, _hasOwn } from "./pgsid/json-schema.js";
function _is0(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    const active = _active.get(0) ?? new Set<unknown>();
    if (active.has(value))
        return false;
    _active.set(0, active);
    active.add(value);
    try {
        return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? _hasOwn(value as Record<string, unknown>, "actor") && _hasOwn(value as Record<string, unknown>, "label") && (!_hasOwn(value as Record<string, unknown>, "actor") || _is1((value as Record<string, unknown>)["actor"], _active)) && (!_hasOwn(value as Record<string, unknown>, "label") || _is2((value as Record<string, unknown>)["label"], _active)) && (!_hasOwn(value as Record<string, unknown>, "next") || _is3((value as Record<string, unknown>)["next"], _active)) && Object.entries(value as Record<string, unknown>).every(([key, _item]) => ["actor", "label", "next"].includes(key)) : true);
    }
    finally {
        active.delete(value);
    }
}
function _validate0(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    const active = _active.get(0) ?? new Set<unknown>();
    if (active.has(value))
        return _check(false, value, path, "$ref", "acyclic value", _issues);
    _active.set(0, active);
    active.add(value);
    try {
        return _check(typeof value === "object" && value !== null && !Array.isArray(value), value, path, "type", "object", _issues) && (typeof value === "object" && value !== null && !Array.isArray(value) ? [_check(_hasOwn(value as Record<string, unknown>, "actor"), (value as Record<string, unknown>)["actor"], [...path, "actor"], "required", "present property", _issues), _check(_hasOwn(value as Record<string, unknown>, "label"), (value as Record<string, unknown>)["label"], [...path, "label"], "required", "present property", _issues), !_hasOwn(value as Record<string, unknown>, "actor") || _validate1((value as Record<string, unknown>)["actor"], [...path, "actor"], _active, _issues), !_hasOwn(value as Record<string, unknown>, "label") || _validate2((value as Record<string, unknown>)["label"], [...path, "label"], _active, _issues), !_hasOwn(value as Record<string, unknown>, "next") || _validate3((value as Record<string, unknown>)["next"], [...path, "next"], _active, _issues), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["actor", "label", "next"].includes(key) || _check(false, item, [...path, key], "additionalProperties", false, _issues)).every(valid => valid)].every(valid => valid) : true);
    }
    finally {
        active.delete(value);
    }
}
function _is1(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "number" && Number.isInteger(value) && (typeof value !== "number" || value as number <= 10);
}
function _validate1(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "number" && Number.isInteger(value), value, path, "type", "integer", _issues) && (typeof value !== "number" || _check(value as number <= 10, value, path, "maximum", 10, _issues));
}
function _is2(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "string";
}
function _validate2(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "string", value, path, "type", "string", _issues);
}
function _is3(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    const active = _active.get(3) ?? new Set<unknown>();
    if (active.has(value))
        return false;
    _active.set(3, active);
    active.add(value);
    try {
        return _is0(value, _active);
    }
    finally {
        active.delete(value);
    }
}
function _validate3(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    const active = _active.get(3) ?? new Set<unknown>();
    if (active.has(value))
        return _check(false, value, path, "$ref", "acyclic value", _issues);
    _active.set(3, active);
    active.add(value);
    try {
        return _validate0(value, path, _active, _issues);
    }
    finally {
        active.delete(value);
    }
}
function _is4(_value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return false;
}
function _validate4(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
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
const _schema3 = {
    is: (value: unknown): boolean => _is3(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate3(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
const _schema4 = {
    is: (value: unknown): boolean => _is4(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate4(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
export const schemaValidators = {
    "": _schema0,
    "/properties/actor": _schema1,
    "/properties/label": _schema2,
    "/properties/next": _schema3,
    "/additionalProperties": _schema4
};
export function isAudit(value: unknown): value is import("../../types/jsonschemas/Audit.js").Audit {
    return _schema0.is(value);
}
export function validateAudit(value: unknown): _ValidationResult {
    return _schema0.validate(value);
}
