export function isEventPayload(value: unknown): value is import("../../types/jsonschemas/EventPayload.js").EventPayload {
    const _hasOwn = (object: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);
    const _ref1Active = new Set<unknown>();
    function _ref1(value: unknown): boolean {
        if (_ref1Active.has(value))
            return false;
        _ref1Active.add(value);
        try {
            return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? _hasOwn(value as Record<string, unknown>, "actor") && _hasOwn(value as Record<string, unknown>, "flags") && (!_hasOwn(value as Record<string, unknown>, "actor") || typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]) && (typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]) ? _hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id") && (!_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id") || typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"] === "number" && Number.isInteger(((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"])) && (!_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "displayName") || typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["displayName"] === "string") && Object.entries((value as Record<string, unknown>)["actor"] as Record<string, unknown>).every(([key, item]) => ["id", "displayName"].includes(key)) : true)) && (!_hasOwn(value as Record<string, unknown>, "flags") || Array.isArray((value as Record<string, unknown>)["flags"]) && (!Array.isArray((value as Record<string, unknown>)["flags"]) || ((value as Record<string, unknown>)["flags"] as unknown[]).slice(0).every(item => typeof item === "string"))) && (!_hasOwn(value as Record<string, unknown>, "score") || (typeof (value as Record<string, unknown>)["score"] === "number" && Number.isFinite((value as Record<string, unknown>)["score"]) || (value as Record<string, unknown>)["score"] === null)) && (!_hasOwn(value as Record<string, unknown>, "next") || _ref1((value as Record<string, unknown>)["next"])) && Object.entries(value as Record<string, unknown>).every(([key, item]) => ["actor", "flags", "score", "next"].includes(key)) : true);
        }
        finally {
            _ref1Active.delete(value);
        }
    }
    return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? _hasOwn(value as Record<string, unknown>, "actor") && _hasOwn(value as Record<string, unknown>, "flags") && (!_hasOwn(value as Record<string, unknown>, "actor") || typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]) && (typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]) ? _hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id") && (!_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id") || typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"] === "number" && Number.isInteger(((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"])) && (!_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "displayName") || typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["displayName"] === "string") && Object.entries((value as Record<string, unknown>)["actor"] as Record<string, unknown>).every(([key, item]) => ["id", "displayName"].includes(key)) : true)) && (!_hasOwn(value as Record<string, unknown>, "flags") || Array.isArray((value as Record<string, unknown>)["flags"]) && (!Array.isArray((value as Record<string, unknown>)["flags"]) || ((value as Record<string, unknown>)["flags"] as unknown[]).slice(0).every(item => typeof item === "string"))) && (!_hasOwn(value as Record<string, unknown>, "score") || (typeof (value as Record<string, unknown>)["score"] === "number" && Number.isFinite((value as Record<string, unknown>)["score"]) || (value as Record<string, unknown>)["score"] === null)) && (!_hasOwn(value as Record<string, unknown>, "next") || _ref1((value as Record<string, unknown>)["next"])) && Object.entries(value as Record<string, unknown>).every(([key, item]) => ["actor", "flags", "score", "next"].includes(key)) : true);
}
export function validateEventPayload(value: unknown): {
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
    const _ref1Active = new Set<unknown>();
    function _ref1(value: unknown, path: readonly (string | number)[]): boolean {
        if (_ref1Active.has(value))
            return _check(false, value, path, "$ref", "acyclic value");
        _ref1Active.add(value);
        try {
            return _check(typeof value === "object" && value !== null && !Array.isArray(value), value, path, "type", "object") && (typeof value === "object" && value !== null && !Array.isArray(value) ? [_check(_hasOwn(value as Record<string, unknown>, "actor"), (value as Record<string, unknown>)["actor"], [...path, "actor"], "required", "present property"), _check(_hasOwn(value as Record<string, unknown>, "flags"), (value as Record<string, unknown>)["flags"], [...path, "flags"], "required", "present property"), !_hasOwn(value as Record<string, unknown>, "actor") || _check(typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]), (value as Record<string, unknown>)["actor"], [...path, "actor"], "type", "object") && (typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]) ? [_check(_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id"), ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"], [...path, "actor", "id"], "required", "present property"), !_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id") || _check(typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"] === "number" && Number.isInteger(((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"]), ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"], [...path, "actor", "id"], "type", "integer"), !_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "displayName") || _check(typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["displayName"] === "string", ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["displayName"], [...path, "actor", "displayName"], "type", "string"), Object.entries((value as Record<string, unknown>)["actor"] as Record<string, unknown>).map(([key, item]) => ["id", "displayName"].includes(key) || _check(false, item, [...path, "actor", key], "additionalProperties", false)).every(valid => valid)].every(valid => valid) : true), !_hasOwn(value as Record<string, unknown>, "flags") || _check(Array.isArray((value as Record<string, unknown>)["flags"]), (value as Record<string, unknown>)["flags"], [...path, "flags"], "type", "array") && (!Array.isArray((value as Record<string, unknown>)["flags"]) || ((value as Record<string, unknown>)["flags"] as unknown[]).slice(0).map((item, index) => _check(typeof item === "string", item, [...path, "flags", index], "type", "string")).every(valid => valid)), !_hasOwn(value as Record<string, unknown>, "score") || _check(typeof (value as Record<string, unknown>)["score"] === "number" && Number.isFinite((value as Record<string, unknown>)["score"]) || (value as Record<string, unknown>)["score"] === null, (value as Record<string, unknown>)["score"], [...path, "score"], "type", ["number", "null"]), !_hasOwn(value as Record<string, unknown>, "next") || _ref1((value as Record<string, unknown>)["next"], [...path, "next"]), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["actor", "flags", "score", "next"].includes(key) || _check(false, item, [...path, key], "additionalProperties", false)).every(valid => valid)].every(valid => valid) : true);
        }
        finally {
            _ref1Active.delete(value);
        }
    }
    const valid = _check(typeof value === "object" && value !== null && !Array.isArray(value), value, [], "type", "object") && (typeof value === "object" && value !== null && !Array.isArray(value) ? [_check(_hasOwn(value as Record<string, unknown>, "actor"), (value as Record<string, unknown>)["actor"], ["actor"], "required", "present property"), _check(_hasOwn(value as Record<string, unknown>, "flags"), (value as Record<string, unknown>)["flags"], ["flags"], "required", "present property"), !_hasOwn(value as Record<string, unknown>, "actor") || _check(typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]), (value as Record<string, unknown>)["actor"], ["actor"], "type", "object") && (typeof (value as Record<string, unknown>)["actor"] === "object" && (value as Record<string, unknown>)["actor"] !== null && !Array.isArray((value as Record<string, unknown>)["actor"]) ? [_check(_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id"), ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"], ["actor", "id"], "required", "present property"), !_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "id") || _check(typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"] === "number" && Number.isInteger(((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"]), ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["id"], ["actor", "id"], "type", "integer"), !_hasOwn((value as Record<string, unknown>)["actor"] as Record<string, unknown>, "displayName") || _check(typeof ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["displayName"] === "string", ((value as Record<string, unknown>)["actor"] as Record<string, unknown>)["displayName"], ["actor", "displayName"], "type", "string"), Object.entries((value as Record<string, unknown>)["actor"] as Record<string, unknown>).map(([key, item]) => ["id", "displayName"].includes(key) || _check(false, item, ["actor", key], "additionalProperties", false)).every(valid => valid)].every(valid => valid) : true), !_hasOwn(value as Record<string, unknown>, "flags") || _check(Array.isArray((value as Record<string, unknown>)["flags"]), (value as Record<string, unknown>)["flags"], ["flags"], "type", "array") && (!Array.isArray((value as Record<string, unknown>)["flags"]) || ((value as Record<string, unknown>)["flags"] as unknown[]).slice(0).map((item, index) => _check(typeof item === "string", item, ["flags", index], "type", "string")).every(valid => valid)), !_hasOwn(value as Record<string, unknown>, "score") || _check(typeof (value as Record<string, unknown>)["score"] === "number" && Number.isFinite((value as Record<string, unknown>)["score"]) || (value as Record<string, unknown>)["score"] === null, (value as Record<string, unknown>)["score"], ["score"], "type", ["number", "null"]), !_hasOwn(value as Record<string, unknown>, "next") || _ref1((value as Record<string, unknown>)["next"], ["next"]), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["actor", "flags", "score", "next"].includes(key) || _check(false, item, [key], "additionalProperties", false)).every(valid => valid)].every(valid => valid) : true);
    return { valid, issues: _issues };
}
export function isEventPayloadActor(value: unknown): value is import("../../types/jsonschemas/EventPayload.js").EventPayloadActor {
    const _hasOwn = (object: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);
    return typeof value === "object" && value !== null && !Array.isArray(value) && (typeof value === "object" && value !== null && !Array.isArray(value) ? _hasOwn(value as Record<string, unknown>, "id") && (!_hasOwn(value as Record<string, unknown>, "id") || typeof (value as Record<string, unknown>)["id"] === "number" && Number.isInteger((value as Record<string, unknown>)["id"])) && (!_hasOwn(value as Record<string, unknown>, "displayName") || typeof (value as Record<string, unknown>)["displayName"] === "string") && Object.entries(value as Record<string, unknown>).every(([key, item]) => ["id", "displayName"].includes(key)) : true);
}
export function validateEventPayloadActor(value: unknown): {
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
    const valid = _check(typeof value === "object" && value !== null && !Array.isArray(value), value, [], "type", "object") && (typeof value === "object" && value !== null && !Array.isArray(value) ? [_check(_hasOwn(value as Record<string, unknown>, "id"), (value as Record<string, unknown>)["id"], ["id"], "required", "present property"), !_hasOwn(value as Record<string, unknown>, "id") || _check(typeof (value as Record<string, unknown>)["id"] === "number" && Number.isInteger((value as Record<string, unknown>)["id"]), (value as Record<string, unknown>)["id"], ["id"], "type", "integer"), !_hasOwn(value as Record<string, unknown>, "displayName") || _check(typeof (value as Record<string, unknown>)["displayName"] === "string", (value as Record<string, unknown>)["displayName"], ["displayName"], "type", "string"), Object.entries(value as Record<string, unknown>).map(([key, item]) => ["id", "displayName"].includes(key) || _check(false, item, [key], "additionalProperties", false)).every(valid => valid)].every(valid => valid) : true);
    return { valid, issues: _issues };
}
export function isEventPayloadFlags(value: unknown): value is import("../../types/jsonschemas/EventPayload.js").EventPayloadFlags {
    return Array.isArray(value) && (!Array.isArray(value) || (value as unknown[]).slice(0).every(item => typeof item === "string"));
}
export function validateEventPayloadFlags(value: unknown): {
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
    const valid = _check(Array.isArray(value), value, [], "type", "array") && (!Array.isArray(value) || (value as unknown[]).slice(0).map((item, index) => _check(typeof item === "string", item, [index], "type", "string")).every(valid => valid));
    return { valid, issues: _issues };
}
