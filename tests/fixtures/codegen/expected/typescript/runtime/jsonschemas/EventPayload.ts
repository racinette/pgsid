import type { ValidationIssue as _ValidationIssue, ValidationResult as _ValidationResult } from "./pgsid/validation.js";
import { _check, _hasOwn } from "./pgsid/json-schema.js";
function _is0(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    const active = _active.get(0) ?? new Set<unknown>();
    if (active.has(value))
        return false;
    _active.set(0, active);
    active.add(value);
    try {
        return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? _hasOwn(value as Record<string, unknown>, "actor") && _hasOwn(value as Record<string, unknown>, "flags") && (!_hasOwn(value as Record<string, unknown>, "actor") || _is1((value as Record<string, unknown>)["actor"], _active)) && (!_hasOwn(value as Record<string, unknown>, "flags") || _is5((value as Record<string, unknown>)["flags"], _active)) && (!_hasOwn(value as Record<string, unknown>, "score") || _is7((value as Record<string, unknown>)["score"], _active)) && (!_hasOwn(value as Record<string, unknown>, "next") || _is8((value as Record<string, unknown>)["next"], _active)) && Object.entries(value as Record<string, unknown>).every(([key, _item]) => ["actor", "flags", "score", "next"].includes(key)) : true);
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
        return _check(typeof value === "object" && value !== null && !Array.isArray(value), value, path, "type", "object", _issues) && (typeof value === "object" && value !== null && !Array.isArray(value) ? [_check(_hasOwn(value as Record<string, unknown>, "actor"), (value as Record<string, unknown>)["actor"], [...path, "actor"], "required", "present property", _issues), _check(_hasOwn(value as Record<string, unknown>, "flags"), (value as Record<string, unknown>)["flags"], [...path, "flags"], "required", "present property", _issues), !_hasOwn(value as Record<string, unknown>, "actor") || _validate1((value as Record<string, unknown>)["actor"], [...path, "actor"], _active, _issues), !_hasOwn(value as Record<string, unknown>, "flags") || _validate5((value as Record<string, unknown>)["flags"], [...path, "flags"], _active, _issues), !_hasOwn(value as Record<string, unknown>, "score") || _validate7((value as Record<string, unknown>)["score"], [...path, "score"], _active, _issues), !_hasOwn(value as Record<string, unknown>, "next") || _validate8((value as Record<string, unknown>)["next"], [...path, "next"], _active, _issues), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["actor", "flags", "score", "next"].includes(key) || _check(false, item, [...path, key], "additionalProperties", false, _issues)).every(valid => valid)].every(valid => valid) : true);
    }
    finally {
        active.delete(value);
    }
}
function _is1(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? _hasOwn(value as Record<string, unknown>, "id") && (!_hasOwn(value as Record<string, unknown>, "id") || _is2((value as Record<string, unknown>)["id"], _active)) && (!_hasOwn(value as Record<string, unknown>, "displayName") || _is3((value as Record<string, unknown>)["displayName"], _active)) && Object.entries(value as Record<string, unknown>).every(([key, _item]) => ["id", "displayName"].includes(key)) : true);
}
function _validate1(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "object" && value !== null && !Array.isArray(value), value, path, "type", "object", _issues) && (typeof value === "object" && value !== null && !Array.isArray(value) ? [_check(_hasOwn(value as Record<string, unknown>, "id"), (value as Record<string, unknown>)["id"], [...path, "id"], "required", "present property", _issues), !_hasOwn(value as Record<string, unknown>, "id") || _validate2((value as Record<string, unknown>)["id"], [...path, "id"], _active, _issues), !_hasOwn(value as Record<string, unknown>, "displayName") || _validate3((value as Record<string, unknown>)["displayName"], [...path, "displayName"], _active, _issues), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["id", "displayName"].includes(key) || _check(false, item, [...path, key], "additionalProperties", false, _issues)).every(valid => valid)].every(valid => valid) : true);
}
function _is2(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "number" && Number.isInteger(value);
}
function _validate2(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "number" && Number.isInteger(value), value, path, "type", "integer", _issues);
}
function _is3(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "string";
}
function _validate3(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "string", value, path, "type", "string", _issues);
}
function _is4(_value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return false;
}
function _validate4(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(false, value, path, "falseSchema", false, _issues);
}
function _is5(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return Array.isArray(value) && (!Array.isArray(value) || (value as unknown[]).slice(0).every(item => typeof item === "string"));
}
function _validate5(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(Array.isArray(value), value, path, "type", "array", _issues) && (!Array.isArray(value) || (value as unknown[]).slice(0).map((item, index) => _check(typeof item === "string", item, [...path, index], "type", "string", _issues)).every(valid => valid));
}
function _is6(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "string";
}
function _validate6(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "string", value, path, "type", "string", _issues);
}
function _is7(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    return typeof value === "number" && Number.isFinite(value) || value === null;
}
function _validate7(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    return _check(typeof value === "number" && Number.isFinite(value) || value === null, value, path, "type", ["number", "null"], _issues);
}
function _is8(value: unknown, _active: Map<number, Set<unknown>>): boolean {
    const active = _active.get(8) ?? new Set<unknown>();
    if (active.has(value))
        return false;
    _active.set(8, active);
    active.add(value);
    try {
        return _is0(value, _active);
    }
    finally {
        active.delete(value);
    }
}
function _validate8(value: unknown, path: readonly (string | number)[], _active: Map<number, Set<unknown>>, _issues: _ValidationIssue[]): boolean {
    const active = _active.get(8) ?? new Set<unknown>();
    if (active.has(value))
        return _check(false, value, path, "$ref", "acyclic value", _issues);
    _active.set(8, active);
    active.add(value);
    try {
        return _validate0(value, path, _active, _issues);
    }
    finally {
        active.delete(value);
    }
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
const _schema5 = {
    is: (value: unknown): boolean => _is5(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate5(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
const _schema6 = {
    is: (value: unknown): boolean => _is6(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate6(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
const _schema7 = {
    is: (value: unknown): boolean => _is7(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate7(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
const _schema8 = {
    is: (value: unknown): boolean => _is8(value, new Map<number, Set<unknown>>()),
    validate: (value: unknown): _ValidationResult => {
        const _issues: _ValidationIssue[] = [];
        const valid = _validate8(value, [], new Map<number, Set<unknown>>(), _issues);
        return { valid, issues: _issues };
    }
};
export const schemaValidators = {
    "": _schema0,
    "/properties/actor": _schema1,
    "/properties/actor/properties/id": _schema2,
    "/properties/actor/properties/displayName": _schema3,
    "/properties/actor/additionalProperties": _schema4,
    "/properties/flags": _schema5,
    "/properties/flags/items": _schema6,
    "/properties/score": _schema7,
    "/properties/next": _schema8,
    "/additionalProperties": _schema4
};
export function isEventPayload(value: unknown): value is import("../../types/jsonschemas/EventPayload.js").EventPayload {
    return _schema0.is(value);
}
export function validateEventPayload(value: unknown): _ValidationResult {
    return _schema0.validate(value);
}
export function isEventPayloadActor(value: unknown): value is import("../../types/jsonschemas/EventPayload.js").EventPayloadActor {
    return _schema1.is(value);
}
export function validateEventPayloadActor(value: unknown): _ValidationResult {
    return _schema1.validate(value);
}
export function isEventPayloadFlags(value: unknown): value is import("../../types/jsonschemas/EventPayload.js").EventPayloadFlags {
    return _schema5.is(value);
}
export function validateEventPayloadFlags(value: unknown): _ValidationResult {
    return _schema5.validate(value);
}
