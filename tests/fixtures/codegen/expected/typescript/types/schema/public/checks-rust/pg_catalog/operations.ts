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
export function int8pl1v1h(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
            if (rightValue > 0n && leftValue > langruntime.checkedI64Subtract(9223372036854775807n, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (rightValue < 0n && leftValue < langruntime.checkedI64Subtract(-9223372036854775808n, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedI64Add(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int8miJasl(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
            if (rightValue < 0n && leftValue > langruntime.checkedI64Add(9223372036854775807n, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (rightValue > 0n && leftValue < langruntime.checkedI64Add(-9223372036854775808n, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedI64Subtract(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int8umCthl(input: checkruntime.Int8Value): checkruntime.Int8Value {
    if (input.kind === "Value") {
        const payload: bigint = langruntime.checkedI64(input.value);
        if (payload === -9223372036854775808n) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        return { kind: "Value", value: langruntime.checkedI64Subtract(0n, payload) };
    }
    return input;
}
export function int8up9qey(input: checkruntime.Int8Value): checkruntime.Int8Value {
    return input;
}
export function int8absCmj6(input: checkruntime.Int8Value): checkruntime.Int8Value {
    if (input.kind === "Value") {
        const payload: bigint = langruntime.checkedI64(input.value);
        if (payload < 0n) {
            return int8umCthl(input);
        }
    }
    return input;
}
export function abs36t4(input: checkruntime.Int8Value): checkruntime.Int8Value {
    return int8absCmj6(input);
}
export function int28plBh5j(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt2Value(left);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8pl1v1h(widened, right);
}
export function int82plE0uq(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    right = checkruntime.copyInt2Value(right);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8pl1v1h(left, widened);
}
export function int28miUjbh(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt2Value(left);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8miJasl(widened, right);
}
export function int82miUovj(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    right = checkruntime.copyInt2Value(right);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8miJasl(left, widened);
}
export function int48plY1r4(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt4Value(left);
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8pl1v1h(widened, right);
}
export function int84pl2n77(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
    right = checkruntime.copyInt4Value(right);
    const widened: checkruntime.Int8Value = int8Mzac(right);
    return int8pl1v1h(left, widened);
}
export function int48miNeop(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt4Value(left);
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8miJasl(widened, right);
}
export function int84mi867a(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
    right = checkruntime.copyInt4Value(right);
    const widened: checkruntime.Int8Value = int8Mzac(right);
    return int8miJasl(left, widened);
}
export function int8mul6t1m(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
            if (leftValue > 0n && rightValue > 0n && leftValue > langruntime.checkedI64Divide(9223372036854775807n, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (leftValue > 0n && rightValue < 0n && rightValue < langruntime.checkedI64Divide(-9223372036854775808n, leftValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (leftValue < 0n && rightValue > 0n && leftValue < langruntime.checkedI64Divide(-9223372036854775808n, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (leftValue < 0n && rightValue < 0n && leftValue < langruntime.checkedI64Divide(9223372036854775807n, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedI64Multiply(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int8div8s66(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
            if (rightValue === 0n) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
            }
            if (leftValue === -9223372036854775808n && rightValue === -1n) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedI64Divide(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int8mod2t8f(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
            if (rightValue === 0n) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
            }
            if (rightValue === -1n) {
                return { kind: "Value", value: 0n };
            }
            return { kind: "Value", value: langruntime.checkedI64Remainder(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int28mulLmrp(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt2Value(left);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8mul6t1m(widened, right);
}
export function int28divYfcw(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt2Value(left);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8div8s66(widened, right);
}
export function int82mul60eu(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    right = checkruntime.copyInt2Value(right);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8mul6t1m(left, widened);
}
export function int82divBfmp(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    right = checkruntime.copyInt2Value(right);
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8div8s66(left, widened);
}
export function int48mulKykj(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt4Value(left);
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8mul6t1m(widened, right);
}
export function int48divXx1r(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    left = checkruntime.copyInt4Value(left);
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8div8s66(widened, right);
}
export function int84mul636w(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
    right = checkruntime.copyInt4Value(right);
    const widened: checkruntime.Int8Value = int8Mzac(right);
    return int8mul6t1m(left, widened);
}
export function int84divW65p(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
    right = checkruntime.copyInt4Value(right);
    const widened: checkruntime.Int8Value = int8Mzac(right);
    return int8div8s66(left, widened);
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
function bpcharCodepointCompare(left: string, right: string): number {
    left = langruntime.checkedString(left);
    right = langruntime.checkedString(right);
    const leftChars: string[] = Array.from(left);
    const rightChars: string[] = Array.from(right);
    let leftLength: number = leftChars.length;
    let rightLength: number = rightChars.length;
    while (leftLength > 0) {
        if (!(langruntime.indexChar(leftChars, langruntime.checkedIndex(langruntime.checkedSubtract(leftLength, 1))) === " ")) {
            break;
        }
        leftLength = langruntime.checkedIndex(langruntime.checkedSubtract(leftLength, 1));
    }
    while (rightLength > 0) {
        if (!(langruntime.indexChar(rightChars, langruntime.checkedIndex(langruntime.checkedSubtract(rightLength, 1))) === " ")) {
            break;
        }
        rightLength = langruntime.checkedIndex(langruntime.checkedSubtract(rightLength, 1));
    }
    let index: number = 0;
    while (index < leftLength && index < rightLength) {
        const leftCode: number = langruntime.checkedChar(langruntime.indexChar(leftChars, langruntime.checkedIndex(index))).codePointAt(0)!;
        const rightCode: number = langruntime.checkedChar(langruntime.indexChar(rightChars, langruntime.checkedIndex(index))).codePointAt(0)!;
        if (leftCode < rightCode) {
            return langruntime.checkedSignedNegate(1);
        }
        if (leftCode > rightCode) {
            return 1;
        }
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 1));
    }
    if (leftLength < rightLength) {
        return langruntime.checkedSignedNegate(1);
    }
    if (leftLength > rightLength) {
        return 1;
    }
    return 0;
}
export function bpchareqNpys(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
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
            const comparison: number = bpcharCodepointCompare(leftValue, rightValue);
            return { kind: "Value", value: comparison === 0 };
        }
    }
    return { kind: "Unknown" };
}
export function bpchargeO6oj(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
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
            const comparison: number = bpcharCodepointCompare(leftValue, rightValue);
            return { kind: "Value", value: comparison >= 0 };
        }
    }
    return { kind: "Unknown" };
}
export function bpchargtKxc4(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
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
            const comparison: number = bpcharCodepointCompare(leftValue, rightValue);
            return { kind: "Value", value: comparison > 0 };
        }
    }
    return { kind: "Unknown" };
}
export function bpcharle0rch(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
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
            const comparison: number = bpcharCodepointCompare(leftValue, rightValue);
            return { kind: "Value", value: comparison <= 0 };
        }
    }
    return { kind: "Unknown" };
}
export function bpcharltQrb5(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
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
            const comparison: number = bpcharCodepointCompare(leftValue, rightValue);
            return { kind: "Value", value: comparison < 0 };
        }
    }
    return { kind: "Unknown" };
}
export function bpcharneQkuu(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
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
            const comparison: number = bpcharCodepointCompare(leftValue, rightValue);
            return { kind: "Value", value: !(comparison === 0) };
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
const sqlstateDivisionByZero = 3452582;
export function int4mul284v(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
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
            if (leftValue > 0 && rightValue > 0 && leftValue > langruntime.checkedSignedDivide(2147483647, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (leftValue > 0 && rightValue < 0 && rightValue < langruntime.checkedSignedDivide(minValue, leftValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (leftValue < 0 && rightValue > 0 && leftValue < langruntime.checkedSignedDivide(minValue, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            if (leftValue < 0 && rightValue < 0 && leftValue < langruntime.checkedSignedDivide(2147483647, rightValue)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedSignedMultiply(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int4div8ogr(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
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
            if (rightValue === 0) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
            }
            if (leftValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) && rightValue === langruntime.checkedSignedNegate(1)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
            }
            return { kind: "Value", value: langruntime.checkedSignedDivide(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function int4modJ4pe(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
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
            if (rightValue === 0) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
            }
            if (rightValue === langruntime.checkedSignedNegate(1)) {
                return { kind: "Value", value: 0 };
            }
            return { kind: "Value", value: langruntime.checkedSignedRemainder(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function abs5ajw(input: checkruntime.Int4Value): checkruntime.Int4Value {
    input = checkruntime.copyInt4Value(input);
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        if (value === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        if (value < 0) {
            return { kind: "Value", value: langruntime.checkedSignedSubtract(0, value) };
        }
    }
    return input;
}
export function int41z1k(input: checkruntime.Int2Value): checkruntime.Int4Value {
    input = checkruntime.copyInt2Value(input);
    return checkruntime.int2ToInt4(input);
}
export function int8Sxtp(input: checkruntime.Int2Value): checkruntime.Int8Value {
    input = checkruntime.copyInt2Value(input);
    return checkruntime.int2ToInt8(input);
}
export function int215a3(input: checkruntime.Int4Value): checkruntime.Int2Value {
    input = checkruntime.copyInt4Value(input);
    return smallintResult(input);
}
export function int8Mzac(input: checkruntime.Int4Value): checkruntime.Int8Value {
    input = checkruntime.copyInt4Value(input);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const payload: number = langruntime.checkedI32(input.value);
        const widened: bigint = BigInt(langruntime.checkedI32(payload));
        return { kind: "Value", value: widened };
    }
    return { kind: "Unknown" };
}
export function int45ywh(input: checkruntime.Int8Value): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const payload: bigint = langruntime.checkedI64(input.value);
        if (payload < -2147483648n || payload > 2147483647n) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        const narrowed: number = Number(BigInt.asIntN(32, langruntime.checkedI64(payload)));
        return { kind: "Value", value: narrowed };
    }
    return { kind: "Unknown" };
}
export function int2Gmpv(input: checkruntime.Int8Value): checkruntime.Int2Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const payload: bigint = langruntime.checkedI64(input.value);
        if (payload < -32768n || payload > 32767n) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        const narrowed: number = Number(BigInt.asIntN(32, langruntime.checkedI64(payload)));
        return { kind: "Value", value: narrowed };
    }
    return { kind: "Unknown" };
}
function numericCompare(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.Int4Value {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(left, { kind: "Unknown" }) || checkruntime.equalNumericValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(left, { kind: "Null" }) || checkruntime.equalNumericValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const rightValue: string = langruntime.checkedString(right.value);
            const a: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(leftValue));
            const b: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(rightValue));
            if (a.valid === false || b.valid === false) {
                return { kind: "Unknown" };
            }
            if (a.special < b.special) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (a.special > b.special) {
                return { kind: "Value", value: 1 };
            }
            if (!(a.special === 1)) {
                return { kind: "Value", value: 0 };
            }
            if (a.sign < b.sign) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (a.sign > b.sign) {
                return { kind: "Value", value: 1 };
            }
            if (a.sign === 0) {
                return { kind: "Value", value: 0 };
            }
            if (a.weight < b.weight) {
                return { kind: "Value", value: langruntime.checkedSignedSubtract(0, a.sign) };
            }
            if (a.weight > b.weight) {
                return { kind: "Value", value: a.sign };
            }
            const leftChars: string[] = Array.from(leftValue);
            const rightChars: string[] = Array.from(rightValue);
            let i: number = a.first;
            let j: number = b.first;
            while (i < a.end || j < b.end) {
                while (i < a.end && (langruntime.indexChar(leftChars, langruntime.checkedIndex(i)) === "." || langruntime.indexChar(leftChars, langruntime.checkedIndex(i)) === "_")) {
                    i = langruntime.checkedAdd(i, 1);
                }
                while (j < b.end && (langruntime.indexChar(rightChars, langruntime.checkedIndex(j)) === "." || langruntime.indexChar(rightChars, langruntime.checkedIndex(j)) === "_")) {
                    j = langruntime.checkedAdd(j, 1);
                }
                let x: string = "0";
                let y: string = "0";
                if (i < a.end) {
                    x = langruntime.checkedChar(langruntime.indexChar(leftChars, langruntime.checkedIndex(i)));
                    i = langruntime.checkedAdd(i, 1);
                }
                if (j < b.end) {
                    y = langruntime.checkedChar(langruntime.indexChar(rightChars, langruntime.checkedIndex(j)));
                    j = langruntime.checkedAdd(j, 1);
                }
                const xCode: number = langruntime.checkedChar(x).codePointAt(0)!;
                const yCode: number = langruntime.checkedChar(y).codePointAt(0)!;
                if (xCode < yCode) {
                    return { kind: "Value", value: langruntime.checkedSignedSubtract(0, a.sign) };
                }
                if (xCode > yCode) {
                    return { kind: "Value", value: a.sign };
                }
            }
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Unknown" };
}
export function numericEqFw7r(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(numericCompare(left, right));
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const order: number = langruntime.checkedI32(result.value);
        return { kind: "Value", value: order === 0 };
    }
    return { kind: "Unknown" };
}
export function numericGeW8pw(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(numericCompare(left, right));
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const order: number = langruntime.checkedI32(result.value);
        return { kind: "Value", value: order >= 0 };
    }
    return { kind: "Unknown" };
}
export function numericGtH1pi(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(numericCompare(left, right));
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const order: number = langruntime.checkedI32(result.value);
        return { kind: "Value", value: order > 0 };
    }
    return { kind: "Unknown" };
}
export function numericLeBbpc(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(numericCompare(left, right));
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const order: number = langruntime.checkedI32(result.value);
        return { kind: "Value", value: order <= 0 };
    }
    return { kind: "Unknown" };
}
export function numericLtZl16(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(numericCompare(left, right));
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const order: number = langruntime.checkedI32(result.value);
        return { kind: "Value", value: order < 0 };
    }
    return { kind: "Unknown" };
}
export function numericNeGyip(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.BoolValue {
    left = checkruntime.copyNumericValue(left);
    right = checkruntime.copyNumericValue(right);
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(numericCompare(left, right));
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const order: number = langruntime.checkedI32(result.value);
        return { kind: "Value", value: !(order === 0) };
    }
    return { kind: "Unknown" };
}
export function int24eqCfkl(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4eqLrxe(leftWide, right);
}
export function int24geHurd(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4ge2xvk(leftWide, right);
}
export function int24gt98sb(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4gt5vlv(leftWide, right);
}
export function int24le56y6(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4le9wb6(leftWide, right);
}
export function int24ltGuxt(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4lt9gej(leftWide, right);
}
export function int24ne11ts(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4neQhun(leftWide, right);
}
export function int28eq47dr(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8eqJdhd(leftWide, right);
}
export function int28geXhie(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8geQfhv(leftWide, right);
}
export function int28gtXmpc(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8gt3ehj(leftWide, right);
}
export function int28leJsoj(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8le9fr4(leftWide, right);
}
export function int28ltF4ka(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8ltCryd(leftWide, right);
}
export function int28ne4fh8(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8neUr2k(leftWide, right);
}
export function int2eqU7zv(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4eqLrxe(leftWide, rightWide);
}
export function int2geLd2i(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4ge2xvk(leftWide, rightWide);
}
export function int2gt681i(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4gt5vlv(leftWide, rightWide);
}
export function int2leEp4u(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4le9wb6(leftWide, rightWide);
}
export function int2ltQvze(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4lt9gej(leftWide, rightWide);
}
export function int2neUz14(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4neQhun(leftWide, rightWide);
}
export function int42eqRd78(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4eqLrxe(left, rightWide);
}
export function int42geT5ib(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4ge2xvk(left, rightWide);
}
export function int42gtBicd(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4gt5vlv(left, rightWide);
}
export function int42le570s(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4le9wb6(left, rightWide);
}
export function int42ltEtdm(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4lt9gej(left, rightWide);
}
export function int42neBeca(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4neQhun(left, rightWide);
}
export function int82eqJdpt(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8eqJdhd(left, rightWide);
}
export function int82geEh8t(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8geQfhv(left, rightWide);
}
export function int82gt7e3o(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8gt3ehj(left, rightWide);
}
export function int82leJth3(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8le9fr4(left, rightWide);
}
export function int82ltXt99(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8ltCryd(left, rightWide);
}
export function int82ne6rol(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8neUr2k(left, rightWide);
}
function smallintResult(value: checkruntime.Int4Value): checkruntime.Int2Value {
    value = checkruntime.copyInt4Value(value);
    if (value.kind === "Value") {
        const payload: number = langruntime.checkedI32(value.value);
        if (payload < langruntime.checkedSignedNegate(32768) || payload > 32767) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        return { kind: "Value", value: payload };
    }
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(value, { kind: "Null" })) {
        return { kind: "Null" };
    }
    return { kind: "Unknown" };
}
export function int2plYujm(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(int4plSj3s(leftWide, rightWide));
    return smallintResult(result);
}
export function int2miUxzm(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(int4miDtqk(leftWide, rightWide));
    return smallintResult(result);
}
export function int2mulK2lr(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(int4mul284v(leftWide, rightWide));
    return smallintResult(result);
}
export function int2divFnwp(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(int4div8ogr(leftWide, rightWide));
    return smallintResult(result);
}
export function int2modZds7(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(int4modJ4pe(leftWide, rightWide));
    return smallintResult(result);
}
export function int2absTyad(input: checkruntime.Int2Value): checkruntime.Int2Value {
    input = checkruntime.copyInt2Value(input);
    const wide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(input));
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(abs5ajw(wide));
    return smallintResult(result);
}
export function abs43i0(input: checkruntime.Int2Value): checkruntime.Int2Value {
    input = checkruntime.copyInt2Value(input);
    return int2absTyad(input);
}
export function modMzjb(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt2Value(right);
    return int2modZds7(left, right);
}
export function int2um8puj(input: checkruntime.Int2Value): checkruntime.Int2Value {
    input = checkruntime.copyInt2Value(input);
    const zero: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.makeInt4Value(0));
    const wide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(input));
    const result: checkruntime.Int4Value = checkruntime.copyInt4Value(int4miDtqk(zero, wide));
    return smallintResult(result);
}
export function int2upNe4g(input: checkruntime.Int2Value): checkruntime.Int2Value {
    input = checkruntime.copyInt2Value(input);
    return input;
}
export function int24plIpr8(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4plSj3s(leftWide, right);
}
export function int42plCx9n(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4plSj3s(left, rightWide);
}
export function int24miClza(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4miDtqk(leftWide, right);
}
export function int42miNaln(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4miDtqk(left, rightWide);
}
export function int24mulRdky(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4mul284v(leftWide, right);
}
export function int42mulDh4o(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4mul284v(left, rightWide);
}
export function int24divY2zx(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    left = checkruntime.copyInt2Value(left);
    right = checkruntime.copyInt4Value(right);
    const leftWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(left));
    return int4div8ogr(leftWide, right);
}
export function int42div0fx0(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    left = checkruntime.copyInt4Value(left);
    right = checkruntime.copyInt2Value(right);
    const rightWide: checkruntime.Int4Value = checkruntime.copyInt4Value(checkruntime.int2ToInt4(right));
    return int4div8ogr(left, rightWide);
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
