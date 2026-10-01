import * as checkruntime from "../checkruntime/runtime.js";
import * as langruntime from "../langruntime/runtime.js";
export function int48lt65ji(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            const wideLeft: bigint = BigInt(langruntime.checkedI32(leftValue));
            return { kind: "Value", value: wideLeft < rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int84ltZ0bo(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const wideRight: bigint = BigInt(langruntime.checkedI32(rightValue));
            return { kind: "Value", value: leftValue < wideRight };
        }
    }
    return { kind: "Unknown" };
}
export function int8ltCryd(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue < rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int48le532p(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            const wideLeft: bigint = BigInt(langruntime.checkedI32(leftValue));
            return { kind: "Value", value: wideLeft <= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int84le0gdr(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const wideRight: bigint = BigInt(langruntime.checkedI32(rightValue));
            return { kind: "Value", value: leftValue <= wideRight };
        }
    }
    return { kind: "Unknown" };
}
export function int8le9fr4(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue <= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int48neInar(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            const wideLeft: bigint = BigInt(langruntime.checkedI32(leftValue));
            return { kind: "Value", value: !(wideLeft === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int84ne6b8h(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const wideRight: bigint = BigInt(langruntime.checkedI32(rightValue));
            return { kind: "Value", value: !(leftValue === wideRight) };
        }
    }
    return { kind: "Unknown" };
}
export function int8neUr2k(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int48eq7ot5(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            const wideLeft: bigint = BigInt(langruntime.checkedI32(leftValue));
            return { kind: "Value", value: wideLeft === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int84eqBnoq(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const wideRight: bigint = BigInt(langruntime.checkedI32(rightValue));
            return { kind: "Value", value: leftValue === wideRight };
        }
    }
    return { kind: "Unknown" };
}
export function int8eqJdhd(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int48gtSrgr(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            const wideLeft: bigint = BigInt(langruntime.checkedI32(leftValue));
            return { kind: "Value", value: wideLeft > rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int84gtP7f5(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const wideRight: bigint = BigInt(langruntime.checkedI32(rightValue));
            return { kind: "Value", value: leftValue > wideRight };
        }
    }
    return { kind: "Unknown" };
}
export function int8gt3ehj(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue > rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int48geD53z(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            const wideLeft: bigint = BigInt(langruntime.checkedI32(leftValue));
            return { kind: "Value", value: wideLeft >= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int84geBiti(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const wideRight: bigint = BigInt(langruntime.checkedI32(rightValue));
            return { kind: "Value", value: leftValue >= wideRight };
        }
    }
    return { kind: "Unknown" };
}
export function int8geQfhv(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue >= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function booleqY6qu(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    left = checkruntime.copyBoolValue(left);
    right = checkruntime.copyBoolValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Unknown" }) || checkruntime.equalBoolValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Null" }) || checkruntime.equalBoolValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: boolean = langruntime.checkedBool(left.value);
        if (right.kind === "Value") {
            const rightValue: boolean = langruntime.checkedBool(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function boolneZlce(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    left = checkruntime.copyBoolValue(left);
    right = checkruntime.copyBoolValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Unknown" }) || checkruntime.equalBoolValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Null" }) || checkruntime.equalBoolValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: boolean = langruntime.checkedBool(left.value);
        if (right.kind === "Value") {
            const rightValue: boolean = langruntime.checkedBool(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function boolltCgkk(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    left = checkruntime.copyBoolValue(left);
    right = checkruntime.copyBoolValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Unknown" }) || checkruntime.equalBoolValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Null" }) || checkruntime.equalBoolValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: boolean = langruntime.checkedBool(left.value);
        if (right.kind === "Value") {
            const rightValue: boolean = langruntime.checkedBool(right.value);
            return { kind: "Value", value: leftValue === false && rightValue === true };
        }
    }
    return { kind: "Unknown" };
}
export function boolle0cme(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    left = checkruntime.copyBoolValue(left);
    right = checkruntime.copyBoolValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Unknown" }) || checkruntime.equalBoolValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Null" }) || checkruntime.equalBoolValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: boolean = langruntime.checkedBool(left.value);
        if (right.kind === "Value") {
            const rightValue: boolean = langruntime.checkedBool(right.value);
            return { kind: "Value", value: leftValue === false || rightValue === true };
        }
    }
    return { kind: "Unknown" };
}
export function boolgt6vb2(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    left = checkruntime.copyBoolValue(left);
    right = checkruntime.copyBoolValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Unknown" }) || checkruntime.equalBoolValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Null" }) || checkruntime.equalBoolValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: boolean = langruntime.checkedBool(left.value);
        if (right.kind === "Value") {
            const rightValue: boolean = langruntime.checkedBool(right.value);
            return { kind: "Value", value: leftValue === true && rightValue === false };
        }
    }
    return { kind: "Unknown" };
}
export function boolgeGviq(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    left = checkruntime.copyBoolValue(left);
    right = checkruntime.copyBoolValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Unknown" }) || checkruntime.equalBoolValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(left, { kind: "Null" }) || checkruntime.equalBoolValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: boolean = langruntime.checkedBool(left.value);
        if (right.kind === "Value") {
            const rightValue: boolean = langruntime.checkedBool(right.value);
            return { kind: "Value", value: leftValue === true || rightValue === false };
        }
    }
    return { kind: "Unknown" };
}
export function makeDateZ9pv(year: checkruntime.Int4Value, month: checkruntime.Int4Value, day: checkruntime.Int4Value): checkruntime.DateValue {
    year = checkruntime.copyInt4Value(year);
    month = checkruntime.copyInt4Value(month);
    day = checkruntime.copyInt4Value(day);
    if (year.kind === "Error") {
        const error: checkruntime.SqlError = year.value;
        return { kind: "Error", value: error };
    }
    if (month.kind === "Error") {
        const error: checkruntime.SqlError = month.value;
        return { kind: "Error", value: error };
    }
    if (day.kind === "Error") {
        const error: checkruntime.SqlError = day.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(year, { kind: "Unknown" }) || checkruntime.equalInt4Value(month, { kind: "Unknown" }) || checkruntime.equalInt4Value(day, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(year, { kind: "Null" }) || checkruntime.equalInt4Value(month, { kind: "Null" }) || checkruntime.equalInt4Value(day, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (year.kind === "Value") {
        const yearValue: number = langruntime.checkedI32(year.value);
        if (month.kind === "Value") {
            const monthValue: number = langruntime.checkedI32(month.value);
            if (day.kind === "Value") {
                const dayValue: number = langruntime.checkedI32(day.value);
                return checkruntime.dateFromYmd(yearValue, monthValue, dayValue);
            }
        }
    }
    return { kind: "Unknown" };
}
export function dateEqD4us(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    left = checkruntime.copyDateValue(left);
    right = checkruntime.copyDateValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function dateNeNpdb(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    left = checkruntime.copyDateValue(left);
    right = checkruntime.copyDateValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function dateLt843e(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    left = checkruntime.copyDateValue(left);
    right = checkruntime.copyDateValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue < rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function dateLe5cqw(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    left = checkruntime.copyDateValue(left);
    right = checkruntime.copyDateValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue <= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function dateGt5025(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    left = checkruntime.copyDateValue(left);
    right = checkruntime.copyDateValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue > rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function dateGe8wil(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    left = checkruntime.copyDateValue(left);
    right = checkruntime.copyDateValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue >= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function enumEqW63e(left: checkruntime.EnumValue, right: checkruntime.EnumValue): checkruntime.BoolValue {
    left = checkruntime.copyEnumValue(left);
    right = checkruntime.copyEnumValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalEnumValue(left, { kind: "Unknown" }) || checkruntime.equalEnumValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalEnumValue(left, { kind: "Null" }) || checkruntime.equalEnumValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function enumNeTph2(left: checkruntime.EnumValue, right: checkruntime.EnumValue): checkruntime.BoolValue {
    left = checkruntime.copyEnumValue(left);
    right = checkruntime.copyEnumValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalEnumValue(left, { kind: "Unknown" }) || checkruntime.equalEnumValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalEnumValue(left, { kind: "Null" }) || checkruntime.equalEnumValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int4gt5vlv(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue > rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int4eqLrxe(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int4ge2xvk(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue >= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int4le9wb6(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue <= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int4lt9gej(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: leftValue < rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function int4neQhun(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
const sqlstateNumericValueOutOfRange = 3452547;
export function int4plSj3s(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const minValue: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1);
            if (rightValue > 0 && leftValue > langruntime.checkedSignedSubtract(2147483647, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (rightValue < 0 && leftValue < langruntime.checkedSignedSubtract(minValue, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedSignedAdd(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int4miDtqk(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt4Value(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const minValue: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1);
            if (rightValue < 0 && leftValue > langruntime.checkedSignedAdd(2147483647, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (rightValue > 0 && leftValue < langruntime.checkedSignedAdd(minValue, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedSignedSubtract(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
function textHasPrefix(text: string, prefix: string): boolean {
    text = langruntime.checkedString(text);
    prefix = langruntime.checkedString(prefix);
    const textChars: string[] = Array.from(text);
    const prefixChars: string[] = Array.from(prefix);
    if (prefixChars.length > textChars.length) {
        return false;
    }
    let index: number = 0;
    while (index < prefixChars.length) {
        const textCode: number = langruntime.checkedChar(langruntime.indexChar(textChars, langruntime.checkedIndex(index))).codePointAt(0)!;
        const prefixCode: number = langruntime.checkedChar(langruntime.indexChar(prefixChars, langruntime.checkedIndex(index))).codePointAt(0)!;
        if (!(textCode === prefixCode)) {
            return false;
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return true;
}
function textCodepointBefore(left: string, right: string): boolean {
    left = langruntime.checkedString(left);
    right = langruntime.checkedString(right);
    const leftChars: string[] = Array.from(left);
    const rightChars: string[] = Array.from(right);
    let index: number = 0;
    while (index < leftChars.length && index < rightChars.length) {
        const leftCode: number = langruntime.checkedChar(langruntime.indexChar(leftChars, langruntime.checkedIndex(index))).codePointAt(0)!;
        const rightCode: number = langruntime.checkedChar(langruntime.indexChar(rightChars, langruntime.checkedIndex(index))).codePointAt(0)!;
        if (leftCode < rightCode) {
            return true;
        }
        if (leftCode > rightCode) {
            return false;
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return leftChars.length < rightChars.length;
}
export function lengthEhpe(value: checkruntime.TextValue): checkruntime.Int4Value {
    value = checkruntime.copyTextValue(value);
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const text: string = langruntime.checkedString(value.value);
        const chars: string[] = Array.from(text);
        let index: number = 0;
        let length: number = 0;
        while (index < chars.length) {
            index = langruntime.checkedIndex(langruntime.checkedAdd(index, 1));
            length = langruntime.checkedIndex(langruntime.checkedAdd(length, 1));
        }
        return { kind: "Value", value: length };
    }
    return { kind: "Unknown" };
}
export function texteqAet8(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    left = checkruntime.copyTextValue(left);
    right = checkruntime.copyTextValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(left, { kind: "Unknown" }) || checkruntime.equalTextValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(left, { kind: "Null" }) || checkruntime.equalTextValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function textne1urq(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    left = checkruntime.copyTextValue(left);
    right = checkruntime.copyTextValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(left, { kind: "Unknown" }) || checkruntime.equalTextValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(left, { kind: "Null" }) || checkruntime.equalTextValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function textLtZinq(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    left = checkruntime.copyTextValue(left);
    right = checkruntime.copyTextValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(left, { kind: "Unknown" }) || checkruntime.equalTextValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(left, { kind: "Null" }) || checkruntime.equalTextValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: textCodepointBefore(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function textLeWb3z(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    left = checkruntime.copyTextValue(left);
    right = checkruntime.copyTextValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(left, { kind: "Unknown" }) || checkruntime.equalTextValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(left, { kind: "Null" }) || checkruntime.equalTextValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: textCodepointBefore(leftValue, rightValue) || leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function textGtRb7n(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    left = checkruntime.copyTextValue(left);
    right = checkruntime.copyTextValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(left, { kind: "Unknown" }) || checkruntime.equalTextValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(left, { kind: "Null" }) || checkruntime.equalTextValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: textCodepointBefore(rightValue, leftValue) };
        }
    }
    return { kind: "Unknown" };
}
export function startsWith6ctf(text: checkruntime.TextValue, prefix: checkruntime.TextValue): checkruntime.BoolValue {
    text = checkruntime.copyTextValue(text);
    prefix = checkruntime.copyTextValue(prefix);
    if (text.kind === "Error") {
        const error: checkruntime.SqlError = text.value;
        return { kind: "Error", value: error };
    }
    if (prefix.kind === "Error") {
        const error: checkruntime.SqlError = prefix.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(text, { kind: "Unknown" }) || checkruntime.equalTextValue(prefix, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(text, { kind: "Null" }) || checkruntime.equalTextValue(prefix, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (text.kind === "Value") {
        const textValue: string = langruntime.checkedString(text.value);
        if (prefix.kind === "Value") {
            const prefixValue: string = langruntime.checkedString(prefix.value);
            return { kind: "Value", value: textHasPrefix(textValue, prefixValue) };
        }
    }
    return { kind: "Unknown" };
}
export function textGeT8pg(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    left = checkruntime.copyTextValue(left);
    right = checkruntime.copyTextValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(left, { kind: "Unknown" }) || checkruntime.equalTextValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(left, { kind: "Null" }) || checkruntime.equalTextValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: textCodepointBefore(rightValue, leftValue) || leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestampEqJd79(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestampValue(left);
    right = checkruntime.copyTimestampValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestampGe80hi(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestampValue(left);
    right = checkruntime.copyTimestampValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue >= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestampGtHxfo(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestampValue(left);
    right = checkruntime.copyTimestampValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue > rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestampLe1qj4(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestampValue(left);
    right = checkruntime.copyTimestampValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue <= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestampLtOgss(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestampValue(left);
    right = checkruntime.copyTimestampValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue < rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestampNeQsye(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestampValue(left);
    right = checkruntime.copyTimestampValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzEqK4n3(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestamptzValue(left);
    right = checkruntime.copyTimestamptzValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalTimestamptzValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalTimestamptzValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue === rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzGeP2rz(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestamptzValue(left);
    right = checkruntime.copyTimestamptzValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalTimestamptzValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalTimestamptzValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue >= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzGt89jo(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestamptzValue(left);
    right = checkruntime.copyTimestamptzValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalTimestamptzValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalTimestamptzValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue > rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzLe0urp(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestamptzValue(left);
    right = checkruntime.copyTimestamptzValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalTimestamptzValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalTimestamptzValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue <= rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzLtB2w5(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestamptzValue(left);
    right = checkruntime.copyTimestamptzValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalTimestamptzValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalTimestamptzValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: leftValue < rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzNe4iy1(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.BoolValue {
    left = checkruntime.copyTimestamptzValue(left);
    right = checkruntime.copyTimestamptzValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalTimestamptzValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalTimestamptzValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: !(leftValue === rightValue) };
        }
    }
    return { kind: "Unknown" };
}
const invalidTimezoneName = 3452619;
interface TimezoneText {
    chars: string[];
}
function copyTimezoneText(value: TimezoneText): TimezoneText {
    return { chars: langruntime.checkedChars(value.chars) };
}
interface TimezoneNumber {
    next: number;
    value: number;
    valid: boolean;
}
function copyTimezoneNumber(value: TimezoneNumber): TimezoneNumber {
    return { next: langruntime.checkedIndex(value.next), value: langruntime.checkedI32(value.value), valid: langruntime.checkedBool(value.valid) };
}
function timezoneDigit(value: string): number {
    value = langruntime.checkedChar(value);
    if (value === "0") {
        return 0;
    }
    if (value === "1") {
        return 1;
    }
    if (value === "2") {
        return 2;
    }
    if (value === "3") {
        return 3;
    }
    if (value === "4") {
        return 4;
    }
    if (value === "5") {
        return 5;
    }
    if (value === "6") {
        return 6;
    }
    if (value === "7") {
        return 7;
    }
    if (value === "8") {
        return 8;
    }
    if (value === "9") {
        return 9;
    }
    return langruntime.checkedSignedNegate(1);
}
function readTimezoneNumber(text: TimezoneText, start: number, maximum: number): TimezoneNumber {
    text = copyTimezoneText(text);
    start = langruntime.checkedIndex(start);
    maximum = langruntime.checkedI32(maximum);
    let index: number = start;
    let value: number = 0;
    let valid: boolean = false;
    while (index < text.chars.length && timezoneDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index))) >= 0) {
        valid = langruntime.checkedBool(true);
        value = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(value, 10), timezoneDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)))));
        if (value > maximum) {
            return { next: index, value: 0, valid: false };
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return { next: index, value: value, valid: valid };
}
function timezoneFixedOffset(name: string): checkruntime.Int4Value {
    name = langruntime.checkedString(name);
    const chars: string[] = Array.from(name);
    if (chars.length > 128) {
        return { kind: "Unknown" };
    }
    const text: TimezoneText = { chars: chars };
    let index: number = 0;
    if (text.chars.length >= 3) {
        const utc: boolean = langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(0))) === "u" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(1))) === "t" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(2))) === "c";
        const gmt: boolean = langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(0))) === "g" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(1))) === "m" && langruntime.asciiLowercase(langruntime.indexChar(text.chars, langruntime.checkedIndex(2))) === "t";
        if (utc || gmt) {
            index = langruntime.checkedIndex(3);
            if (index === text.chars.length) {
                return { kind: "Value", value: 0 };
            }
        }
    }
    if (index < text.chars.length && timezoneDigit(langruntime.indexChar(text.chars, langruntime.checkedIndex(index))) < 0 && !(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "+") && !(langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-")) {
        return { kind: "Unknown" };
    }
    let scan: number = index;
    while (scan < text.chars.length) {
        const character: string = langruntime.indexChar(text.chars, langruntime.checkedIndex(scan));
        if (timezoneDigit(character) < 0 && !(character === "+") && !(character === "-") && !(character === ":")) {
            return { kind: "Unknown" };
        }
        scan = langruntime.checkedAdd(scan, 1);
    }
    let sign: number = 1;
    if (index < text.chars.length && (langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "+" || langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-")) {
        if (langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === "-") {
            sign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        }
        index = langruntime.checkedAdd(index, 1);
    }
    const hour: TimezoneNumber = readTimezoneNumber(text, index, 167);
    if (hour.valid === false) {
        return { kind: "Error", value: { state: invalidTimezoneName } };
    }
    index = langruntime.checkedIndex(hour.next);
    let minute: number = 0;
    let second: number = 0;
    if (index < text.chars.length && langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ":") {
        index = langruntime.checkedAdd(index, 1);
        const number: TimezoneNumber = readTimezoneNumber(text, index, 59);
        if (number.valid === false) {
            return { kind: "Error", value: { state: invalidTimezoneName } };
        }
        minute = langruntime.checkedI32(number.value);
        index = langruntime.checkedIndex(number.next);
        if (index < text.chars.length && langruntime.indexChar(text.chars, langruntime.checkedIndex(index)) === ":") {
            index = langruntime.checkedAdd(index, 1);
            const number: TimezoneNumber = readTimezoneNumber(text, index, 60);
            if (number.valid === false) {
                return { kind: "Error", value: { state: invalidTimezoneName } };
            }
            second = langruntime.checkedI32(number.value);
            index = langruntime.checkedIndex(number.next);
        }
    }
    if (index < text.chars.length) {
        return { kind: "Unknown" };
    }
    return { kind: "Value", value: langruntime.checkedSignedMultiply(sign, (langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(hour.value, 3600), langruntime.checkedSignedMultiply(minute, 60)), second))) };
}
export function timezone9nbk(zone: checkruntime.TextValue, value: checkruntime.TimestampValue): checkruntime.TimestamptzValue {
    zone = checkruntime.copyTextValue(zone);
    value = checkruntime.copyTimestampValue(value);
    if (zone.kind === "Error") {
        const error: checkruntime.SqlError = zone.value;
        return { kind: "Error", value: error };
    }
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(zone, { kind: "Unknown" }) || checkruntime.equalTimestampValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(zone, { kind: "Null" }) || checkruntime.equalTimestampValue(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const microseconds: bigint = langruntime.checkedI64(value.value);
        if (microseconds === -9223372036854775808n || microseconds === 9223372036854775807n) {
            return checkruntime.makeTimestamptzValue(microseconds);
        }
        if (zone.kind === "Value") {
            const name: string = langruntime.checkedString(zone.value);
            const offset: checkruntime.Int4Value = checkruntime.copyInt4Value(timezoneFixedOffset(name));
            if (offset.kind === "Error") {
                const error: checkruntime.SqlError = offset.value;
                return { kind: "Error", value: error };
            }
            if (offset.kind === "Value") {
                const seconds: number = langruntime.checkedI32(offset.value);
                const wide: bigint = BigInt(langruntime.checkedI32(seconds));
                return checkruntime.makeTimestamptzValue(langruntime.checkedI64Add(microseconds, langruntime.checkedI64Multiply(wide, 1000000n)));
            }
        }
    }
    return { kind: "Unknown" };
}
export function timezoneBlof(zone: checkruntime.TextValue, value: checkruntime.TimestamptzValue): checkruntime.TimestampValue {
    zone = checkruntime.copyTextValue(zone);
    value = checkruntime.copyTimestamptzValue(value);
    if (zone.kind === "Error") {
        const error: checkruntime.SqlError = zone.value;
        return { kind: "Error", value: error };
    }
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(zone, { kind: "Unknown" }) || checkruntime.equalTimestamptzValue(value, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(zone, { kind: "Null" }) || checkruntime.equalTimestamptzValue(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const microseconds: bigint = langruntime.checkedI64(value.value);
        if (microseconds === -9223372036854775808n || microseconds === 9223372036854775807n) {
            return checkruntime.makeTimestampValue(microseconds);
        }
        if (zone.kind === "Value") {
            const name: string = langruntime.checkedString(zone.value);
            const offset: checkruntime.Int4Value = checkruntime.copyInt4Value(timezoneFixedOffset(name));
            if (offset.kind === "Error") {
                const error: checkruntime.SqlError = offset.value;
                return { kind: "Error", value: error };
            }
            if (offset.kind === "Value") {
                const seconds: number = langruntime.checkedI32(offset.value);
                const wide: bigint = BigInt(langruntime.checkedI32(seconds));
                return checkruntime.makeTimestampValue(langruntime.checkedI64Subtract(microseconds, langruntime.checkedI64Multiply(wide, 1000000n)));
            }
        }
    }
    return { kind: "Unknown" };
}
