import * as checkruntime from "../checkruntime/runtime.js";
import * as langruntime from "../langruntime/runtime.js";
function addressAndWord(left: number, right: number): number {
    left = langruntime.checkedI32(left);
    right = langruntime.checkedI32(right);
    let a: number = left;
    let b: number = right;
    let place: number = 1;
    let result: number = 0;
    while (place < 65536) {
        if (langruntime.checkedSignedRemainder(a, 2) === 1 && langruntime.checkedSignedRemainder(b, 2) === 1) {
            result = langruntime.checkedI32(langruntime.checkedSignedAdd(result, place));
        }
        a = langruntime.checkedI32(langruntime.checkedSignedDivide(a, 2));
        b = langruntime.checkedI32(langruntime.checkedSignedDivide(b, 2));
        place = langruntime.checkedI32(langruntime.checkedSignedMultiply(place, 2));
    }
    return result;
}
export function int48lt65ji(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
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
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8pl1v1h(widened, right);
}
export function int82plE0uq(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8pl1v1h(left, widened);
}
export function int28miUjbh(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8miJasl(widened, right);
}
export function int82miUovj(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8miJasl(left, widened);
}
export function int48plY1r4(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8pl1v1h(widened, right);
}
export function int84pl2n77(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(right);
    return int8pl1v1h(left, widened);
}
export function int48miNeop(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8miJasl(widened, right);
}
export function int84mi867a(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
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
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8mul6t1m(widened, right);
}
export function int28divYfcw(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8div8s66(widened, right);
}
export function int82mul60eu(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8mul6t1m(left, widened);
}
export function int82divBfmp(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8div8s66(left, widened);
}
export function int48mulKykj(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8mul6t1m(widened, right);
}
export function int48divXx1r(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(left);
    return int8div8s66(widened, right);
}
export function int84mul636w(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(right);
    return int8mul6t1m(left, widened);
}
export function int84divW65p(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(right);
    return int8div8s66(left, widened);
}
export function byteaeqZ0yh(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Unknown" }) || checkruntime.equalByteaValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Null" }) || checkruntime.equalByteaValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: a === b };
        }
    }
    return { kind: "Unknown" };
}
export function byteaneVolo(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Unknown" }) || checkruntime.equalByteaValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Null" }) || checkruntime.equalByteaValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            return { kind: "Value", value: !(a === b) };
        }
    }
    return { kind: "Unknown" };
}
function bitComparePayload(left: string, right: string): number {
    left = langruntime.checkedString(left);
    right = langruntime.checkedString(right);
    const a: string[] = Array.from(left);
    const b: string[] = Array.from(right);
    let index: number = 0;
    while (index < a.length && index < b.length) {
        let leftByte: number = 0;
        let rightByte: number = 0;
        let weight: number = 128;
        while (weight > 0) {
            if (index < a.length) {
                if (langruntime.indexChar(a, langruntime.checkedIndex(index)) === "1") {
                    leftByte = langruntime.checkedI32(langruntime.checkedSignedAdd(leftByte, weight));
                }
            }
            if (index < b.length) {
                if (langruntime.indexChar(b, langruntime.checkedIndex(index)) === "1") {
                    rightByte = langruntime.checkedI32(langruntime.checkedSignedAdd(rightByte, weight));
                }
            }
            weight = langruntime.checkedI32(langruntime.checkedSignedDivide(weight, 2));
            index = langruntime.checkedAdd(index, 1);
        }
        if (!(leftByte === rightByte)) {
            return langruntime.checkedSignedSubtract(leftByte, rightByte);
        }
    }
    if (a.length < b.length) {
        return langruntime.checkedSignedNegate(1);
    }
    if (a.length > b.length) {
        return 1;
    }
    return 0;
}
function bitCompare(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(left, { kind: "Unknown" }) || checkruntime.equalBitValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(left, { kind: "Null" }) || checkruntime.equalBitValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const borrowedA: string = a;
            const borrowedB: string = b;
            const result: number = bitComparePayload(borrowedA, borrowedB);
            return { kind: "Value", value: result };
        }
    }
    return { kind: "Unknown" };
}
function bitLength(input: checkruntime.BitValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const borrowed: string = value;
        const result: number = checkruntime.bitPayloadLength(borrowed);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function bitLengthE2i8(input: checkruntime.BitValue): checkruntime.Int4Value {
    return bitLength(input);
}
export function bitcmp2r1v(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.Int4Value {
    return bitCompare(left, right);
}
export function biteq320u(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value === 0 };
    }
    return { kind: "Unknown" };
}
export function bitgePy56(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value >= 0 };
    }
    return { kind: "Unknown" };
}
export function bitgt2srl(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value > 0 };
    }
    return { kind: "Unknown" };
}
export function bitleY0d7(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value <= 0 };
    }
    return { kind: "Unknown" };
}
export function bitlt6ybn(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value < 0 };
    }
    return { kind: "Unknown" };
}
export function bitneXjg3(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: !(value === 0) };
    }
    return { kind: "Unknown" };
}
export function lengthR5f9(input: checkruntime.BitValue): checkruntime.Int4Value {
    return bitLength(input);
}
export function octetLengthAcdm(input: checkruntime.BitValue): checkruntime.Int4Value {
    const length: checkruntime.Int4Value = bitLength(input);
    if (length.kind === "Value") {
        const value: number = langruntime.checkedI32(length.value);
        let result: number = langruntime.checkedSignedDivide(value, 8);
        if (!(langruntime.checkedSignedRemainder(value, 8) === 0)) {
            result = langruntime.checkedI32(langruntime.checkedSignedAdd(result, 1));
        }
        return { kind: "Value", value: result };
    }
    return length;
}
export function varbitcmpVqwo(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.Int4Value {
    return bitCompare(left, right);
}
export function varbiteqD8r9(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value === 0 };
    }
    return { kind: "Unknown" };
}
export function varbitge3izz(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value >= 0 };
    }
    return { kind: "Unknown" };
}
export function varbitgt31v4(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value > 0 };
    }
    return { kind: "Unknown" };
}
export function varbitle42o0(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value <= 0 };
    }
    return { kind: "Unknown" };
}
export function varbitltXsv2(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: value < 0 };
    }
    return { kind: "Unknown" };
}
export function varbitneSbck(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = bitCompare(left, right);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const value: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: !(value === 0) };
    }
    return { kind: "Unknown" };
}
const bitStringLengthMismatch = 3452622;
const bitMaxLength = 2147483640;
const bitCombineAnd = 0;
const bitCombineOr = 1;
const bitCombineXor = 2;
function bitCombine(left: checkruntime.BitValue, right: checkruntime.BitValue, operation: number): checkruntime.BitValue {
    operation = langruntime.checkedI32(operation);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(left, { kind: "Unknown" }) || checkruntime.equalBitValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(left, { kind: "Null" }) || checkruntime.equalBitValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const first: string[] = Array.from(a);
            const second: string[] = Array.from(b);
            if (!(first.length === second.length)) {
                return { kind: "Error", value: checkruntime.makeSqlError(bitStringLengthMismatch) };
            }
            let output: string = "";
            let index: number = 0;
            while (index < first.length) {
                const leftSet: boolean = langruntime.indexChar(first, langruntime.checkedIndex(index)) === "1";
                const rightSet: boolean = langruntime.indexChar(second, langruntime.checkedIndex(index)) === "1";
                let set: boolean = leftSet && rightSet;
                if (operation === bitCombineOr) {
                    set = langruntime.checkedBool(leftSet || rightSet);
                }
                if (operation === bitCombineXor) {
                    set = langruntime.checkedBool(!(leftSet === rightSet));
                }
                if (set) {
                    output = output + langruntime.checkedChar("1");
                }
                else {
                    output = output + langruntime.checkedChar("0");
                }
                index = langruntime.checkedAdd(index, 1);
            }
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
function bitShift(input: checkruntime.BitValue, distance: checkruntime.Int4Value, leftwards: boolean): checkruntime.BitValue {
    leftwards = langruntime.checkedBool(leftwards);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (distance.kind === "Error") {
        const error: checkruntime.SqlError = distance.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(distance, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(distance, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (distance.kind === "Value") {
            const amount: number = langruntime.checkedI32(distance.value);
            const chars: string[] = Array.from(value);
            let magnitude: number = amount;
            let towardsLeft: boolean = leftwards;
            if (magnitude < 0) {
                towardsLeft = langruntime.checkedBool(leftwards === false);
                if (magnitude < langruntime.checkedSignedSubtract(0, bitMaxLength)) {
                    magnitude = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, bitMaxLength));
                }
                magnitude = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, magnitude));
            }
            let offset: number = 0;
            let counted: number = 0;
            while (offset < chars.length && counted < magnitude) {
                offset = langruntime.checkedAdd(offset, 1);
                counted = langruntime.checkedI32(langruntime.checkedSignedAdd(counted, 1));
            }
            let output: string = "";
            let index: number = 0;
            while (index < chars.length) {
                let ch: string = "0";
                if (towardsLeft) {
                    if (offset < langruntime.checkedSubtract(chars.length, index)) {
                        ch = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, offset))));
                    }
                }
                else if (index >= offset) {
                    ch = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(index, offset))));
                }
                output = output + langruntime.checkedChar(ch);
                index = langruntime.checkedAdd(index, 1);
            }
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
export function bitandMal6(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BitValue {
    return bitCombine(left, right, bitCombineAnd);
}
export function bitorEs93(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BitValue {
    return bitCombine(left, right, bitCombineOr);
}
export function bitxorAl74(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BitValue {
    return bitCombine(left, right, bitCombineXor);
}
export function bitnotXgta(input: checkruntime.BitValue): checkruntime.BitValue {
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let output: string = "";
        let index: number = 0;
        while (index < chars.length) {
            if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "1") {
                output = output + langruntime.checkedChar("0");
            }
            else {
                output = output + langruntime.checkedChar("1");
            }
            index = langruntime.checkedAdd(index, 1);
        }
        return { kind: "Value", value: output };
    }
    return input;
}
export function bitshiftleftQf9d(input: checkruntime.BitValue, distance: checkruntime.Int4Value): checkruntime.BitValue {
    return bitShift(input, distance, true);
}
export function bitshiftrightHgyn(input: checkruntime.BitValue, distance: checkruntime.Int4Value): checkruntime.BitValue {
    return bitShift(input, distance, false);
}
const bitStringRightTruncation = 3452545;
function bitCoerce(input: checkruntime.BitValue, width: checkruntime.Int4Value, explicit: checkruntime.BoolValue, varying: boolean): checkruntime.BitValue {
    varying = langruntime.checkedBool(varying);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (width.kind === "Error") {
        const error: checkruntime.SqlError = width.value;
        return { kind: "Error", value: error };
    }
    if (explicit.kind === "Error") {
        const error: checkruntime.SqlError = explicit.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(width, { kind: "Unknown" }) || checkruntime.equalBoolValue(explicit, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(width, { kind: "Null" }) || checkruntime.equalBoolValue(explicit, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (width.kind === "Value") {
            const length: number = langruntime.checkedI32(width.value);
            if (explicit.kind === "Value") {
                const isExplicit: boolean = langruntime.checkedBool(explicit.value);
                const current: number = checkruntime.bitPayloadLength(value);
                if (length <= 0 || length > bitMaxLength || length === current) {
                    return { kind: "Value", value: value };
                }
                if (varying && length > current) {
                    return { kind: "Value", value: value };
                }
                if (isExplicit === false) {
                    if (varying) {
                        return { kind: "Error", value: checkruntime.makeSqlError(bitStringRightTruncation) };
                    }
                    return { kind: "Error", value: checkruntime.makeSqlError(bitStringLengthMismatch) };
                }
                const chars: string[] = Array.from(value);
                let output: string = "";
                let index: number = 0;
                let count: number = 0;
                while (count < length) {
                    let ch: string = "0";
                    if (index < chars.length) {
                        ch = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                    }
                    output = output + langruntime.checkedChar(ch);
                    index = langruntime.checkedAdd(index, 1);
                    count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
                }
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
export function bitEqck(input: checkruntime.BitValue, width: checkruntime.Int4Value, explicit: checkruntime.BoolValue): checkruntime.BitValue {
    return bitCoerce(input, width, explicit, false);
}
export function varbit7ap7(input: checkruntime.BitValue, width: checkruntime.Int4Value, explicit: checkruntime.BoolValue): checkruntime.BitValue {
    return bitCoerce(input, width, explicit, true);
}
export function bitCountFri1(input: checkruntime.BitValue): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let index: number = 0;
        let count: bigint = 0n;
        while (index < chars.length) {
            if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "1") {
                count = langruntime.checkedI64(langruntime.checkedI64Add(count, 1n));
            }
            index = langruntime.checkedAdd(index, 1);
        }
        return { kind: "Value", value: count };
    }
    return { kind: "Unknown" };
}
const bitArraySubscriptError = 3452630;
const bitProgramLimitExceeded = 8584704;
function bitConcatLength(left: number, right: number): checkruntime.Int4Value {
    left = langruntime.checkedI32(left);
    right = langruntime.checkedI32(right);
    if (left > langruntime.checkedSignedSubtract(bitMaxLength, right)) {
        return { kind: "Error", value: checkruntime.makeSqlError(bitProgramLimitExceeded) };
    }
    return { kind: "Value", value: langruntime.checkedSignedAdd(left, right) };
}
export function bitcatT5mn(left: checkruntime.BitValue, right: checkruntime.BitValue): checkruntime.BitValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(left, { kind: "Unknown" }) || checkruntime.equalBitValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(left, { kind: "Null" }) || checkruntime.equalBitValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const first: number = checkruntime.bitPayloadLength(a);
            const second: number = checkruntime.bitPayloadLength(b);
            const length: checkruntime.Int4Value = bitConcatLength(first, second);
            if (length.kind === "Error") {
                const error: checkruntime.SqlError = length.value;
                return { kind: "Error", value: error };
            }
            let output: string = a;
            output = output + b;
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
export function getBitYgqy(input: checkruntime.BitValue, position: checkruntime.Int4Value): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const offset: number = langruntime.checkedI32(position.value);
            if (offset < 0) {
                return { kind: "Error", value: checkruntime.makeSqlError(bitArraySubscriptError) };
            }
            const chars: string[] = Array.from(value);
            let index: number = 0;
            let current: number = 0;
            while (index < chars.length) {
                if (current === offset) {
                    if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "1") {
                        return { kind: "Value", value: 1 };
                    }
                    return { kind: "Value", value: 0 };
                }
                index = langruntime.checkedAdd(index, 1);
                current = langruntime.checkedI32(langruntime.checkedSignedAdd(current, 1));
            }
            return { kind: "Error", value: checkruntime.makeSqlError(bitArraySubscriptError) };
        }
    }
    return { kind: "Unknown" };
}
export function setBit2mfa(input: checkruntime.BitValue, position: checkruntime.Int4Value, replacement: checkruntime.Int4Value): checkruntime.BitValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (replacement.kind === "Error") {
        const error: checkruntime.SqlError = replacement.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(replacement, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(replacement, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const offset: number = langruntime.checkedI32(position.value);
            if (replacement.kind === "Value") {
                const bit: number = langruntime.checkedI32(replacement.value);
                const length: number = checkruntime.bitPayloadLength(value);
                if (offset < 0 || offset >= length) {
                    return { kind: "Error", value: checkruntime.makeSqlError(bitArraySubscriptError) };
                }
                if (!(bit === 0) && !(bit === 1)) {
                    return { kind: "Error", value: checkruntime.makeSqlError(sqlstateInvalidParameterValue) };
                }
                const chars: string[] = Array.from(value);
                let output: string = "";
                let index: number = 0;
                let current: number = 0;
                while (index < chars.length) {
                    let ch: string = langruntime.indexChar(chars, langruntime.checkedIndex(index));
                    if (current === offset) {
                        ch = langruntime.checkedChar("0");
                        if (bit === 1) {
                            ch = langruntime.checkedChar("1");
                        }
                    }
                    output = output + langruntime.checkedChar(ch);
                    index = langruntime.checkedAdd(index, 1);
                    current = langruntime.checkedI32(langruntime.checkedSignedAdd(current, 1));
                }
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
function bitIntegerEncode(input: bigint, requested: number): string {
    input = langruntime.checkedI64(input);
    requested = langruntime.checkedI32(requested);
    let width: number = requested;
    if (width <= 0 || width > bitMaxLength) {
        width = langruntime.checkedI32(1);
    }
    let remaining: bigint = input;
    let reversed: string = "";
    let count: number = 0;
    while (count < width) {
        const odd: boolean = !(langruntime.checkedI64Remainder(remaining, 2n) === 0n);
        if (odd) {
            reversed = reversed + langruntime.checkedChar("1");
        }
        else {
            reversed = reversed + langruntime.checkedChar("0");
        }
        const negative: boolean = remaining < 0n;
        remaining = langruntime.checkedI64(langruntime.checkedI64Divide(remaining, 2n));
        if (negative && odd) {
            remaining = langruntime.checkedI64(langruntime.checkedI64Subtract(remaining, 1n));
        }
        count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
    }
    const chars: string[] = Array.from(reversed);
    let index: number = chars.length;
    let output: string = "";
    while (index > 0) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
    }
    return output;
}
function bitIntegerDecode(input: string, signedWidth: number): bigint {
    input = langruntime.checkedString(input);
    signedWidth = langruntime.checkedIndex(signedWidth);
    const chars: string[] = Array.from(input);
    let result: bigint = 0n;
    let index: number = 0;
    if (chars.length === signedWidth) {
        if (langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "1") {
            result = langruntime.checkedI64(-1n);
        }
        index = langruntime.checkedIndex(1);
    }
    while (index < chars.length) {
        result = langruntime.checkedI64(langruntime.checkedI64Multiply(result, 2n));
        if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "1") {
            result = langruntime.checkedI64(langruntime.checkedI64Add(result, 1n));
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return result;
}
export function bitM5gi(input: checkruntime.Int4Value, width: checkruntime.Int4Value): checkruntime.BitValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (width.kind === "Error") {
        const error: checkruntime.SqlError = width.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(width, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" }) || checkruntime.equalInt4Value(width, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        if (width.kind === "Value") {
            const length: number = langruntime.checkedI32(width.value);
            const widened: bigint = BigInt(langruntime.checkedI32(value));
            return { kind: "Value", value: bitIntegerEncode(widened, length) };
        }
    }
    return { kind: "Unknown" };
}
export function bit1ahy(input: checkruntime.Int8Value, width: checkruntime.Int4Value): checkruntime.BitValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (width.kind === "Error") {
        const error: checkruntime.SqlError = width.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(width, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" }) || checkruntime.equalInt4Value(width, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        if (width.kind === "Value") {
            const length: number = langruntime.checkedI32(width.value);
            return { kind: "Value", value: bitIntegerEncode(value, length) };
        }
    }
    return { kind: "Unknown" };
}
export function int4Lp2l(input: checkruntime.BitValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (checkruntime.bitPayloadLength(value) > 32) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        const result: bigint = bitIntegerDecode(value, 32);
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(result))) };
    }
    return { kind: "Unknown" };
}
export function int809r6(input: checkruntime.BitValue): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (checkruntime.bitPayloadLength(value) > 64) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        return { kind: "Value", value: bitIntegerDecode(value, 64) };
    }
    return { kind: "Unknown" };
}
export function bitSend1fyo(input: checkruntime.BitValue): checkruntime.ByteaValue {
    return varbitSendYt0j(input);
}
export function varbitSendYt0j(input: checkruntime.BitValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const length: number = checkruntime.bitPayloadLength(value);
        let output: string = "";
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedDivide(length, 16777216)));
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(length, 65536), 256)));
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(length, 256), 256)));
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedRemainder(length, 256)));
        const chars: string[] = Array.from(value);
        let index: number = 0;
        while (index < chars.length) {
            let byte: number = 0;
            let bit: number = 0;
            while (bit < 8) {
                byte = langruntime.checkedI32(langruntime.checkedSignedMultiply(byte, 2));
                if (index < chars.length) {
                    if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "1") {
                        byte = langruntime.checkedI32(langruntime.checkedSignedAdd(byte, 1));
                    }
                    index = langruntime.checkedIndex(langruntime.checkedAdd(index, 1));
                }
                bit = langruntime.checkedIndex(langruntime.checkedAdd(bit, 1));
            }
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, byte));
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
function bitOverlay(input: checkruntime.BitValue, replacement: checkruntime.BitValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value, hasLength: boolean): checkruntime.BitValue {
    hasLength = langruntime.checkedBool(hasLength);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (replacement.kind === "Error") {
        const error: checkruntime.SqlError = replacement.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" }) || checkruntime.equalBitValue(replacement, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" }) || checkruntime.equalBitValue(replacement, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (replacement.kind === "Value") {
        const bits: string = langruntime.checkedString(replacement.value);
        if (position.kind === "Value") {
            const start: number = langruntime.checkedI32(position.value);
            if (length.kind === "Value") {
                const supplied: number = langruntime.checkedI32(length.value);
                if (start <= 0) {
                    return { kind: "Error", value: checkruntime.makeSqlError(bitSubstringError) };
                }
                let count: number = supplied;
                if (hasLength === false) {
                    count = langruntime.checkedI32(checkruntime.bitPayloadLength(bits));
                }
                if (count > 0 && start > langruntime.checkedSignedSubtract(2147483647, count)) {
                    return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
                }
                const end: number = langruntime.checkedSignedAdd(start, count);
                const prefix: checkruntime.BitValue = bitSubstring(input, { kind: "Value", value: 1 }, { kind: "Value", value: langruntime.checkedSignedSubtract(start, 1) }, true);
                const suffix: checkruntime.BitValue = bitSubstring(input, { kind: "Value", value: end }, { kind: "Value", value: 0 }, false);
                const combined: checkruntime.BitValue = bitcatT5mn(prefix, { kind: "Value", value: bits });
                return bitcatT5mn(combined, suffix);
            }
        }
    }
    return { kind: "Unknown" };
}
export function overlayDac4(input: checkruntime.BitValue, replacement: checkruntime.BitValue, position: checkruntime.Int4Value): checkruntime.BitValue {
    return bitOverlay(input, replacement, position, { kind: "Value", value: 0 }, false);
}
export function overlayMoi0(input: checkruntime.BitValue, replacement: checkruntime.BitValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value): checkruntime.BitValue {
    return bitOverlay(input, replacement, position, length, true);
}
export function position93b9(input: checkruntime.BitValue, pattern: checkruntime.BitValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (pattern.kind === "Error") {
        const error: checkruntime.SqlError = pattern.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" }) || checkruntime.equalBitValue(pattern, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" }) || checkruntime.equalBitValue(pattern, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (pattern.kind === "Value") {
            const needle: string = langruntime.checkedString(pattern.value);
            const length: number = checkruntime.bitPayloadLength(value);
            const patternLength: number = checkruntime.bitPayloadLength(needle);
            if (length === 0 || patternLength > length) {
                return { kind: "Value", value: 0 };
            }
            if (patternLength === 0) {
                return { kind: "Value", value: 1 };
            }
            const chars: string[] = Array.from(value);
            const patternChars: string[] = Array.from(needle);
            const last: number = langruntime.checkedSubtract(chars.length, patternChars.length);
            let start: number = 0;
            let position: number = 1;
            while (start <= last) {
                let index: number = 0;
                let matches: boolean = true;
                while (index < patternChars.length && matches) {
                    if (!(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(start, index))) === langruntime.indexChar(patternChars, langruntime.checkedIndex(index)))) {
                        matches = langruntime.checkedBool(false);
                    }
                    index = langruntime.checkedAdd(index, 1);
                }
                if (matches) {
                    return { kind: "Value", value: position };
                }
                start = langruntime.checkedAdd(start, 1);
                position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
            }
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Unknown" };
}
const bitSubstringError = 3452581;
function bitSubstring(input: checkruntime.BitValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value, hasLength: boolean): checkruntime.BitValue {
    hasLength = langruntime.checkedBool(hasLength);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBitValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBitValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const start: number = langruntime.checkedI32(position.value);
            if (length.kind === "Value") {
                const count: number = langruntime.checkedI32(length.value);
                if (hasLength && count < 0) {
                    return { kind: "Error", value: checkruntime.makeSqlError(bitSubstringError) };
                }
                const bitlen: number = checkruntime.bitPayloadLength(value);
                let first: number = start;
                if (first < 1) {
                    first = langruntime.checkedI32(1);
                }
                let end: number = langruntime.checkedSignedAdd(bitlen, 1);
                if (hasLength && start <= langruntime.checkedSignedSubtract(2147483647, count)) {
                    end = langruntime.checkedI32(langruntime.checkedSignedAdd(start, count));
                    if (end > langruntime.checkedSignedAdd(bitlen, 1)) {
                        end = langruntime.checkedI32(langruntime.checkedSignedAdd(bitlen, 1));
                    }
                }
                let output: string = "";
                if (first > bitlen || end <= first) {
                    return { kind: "Value", value: output };
                }
                const chars: string[] = Array.from(value);
                let index: number = 0;
                let current: number = 1;
                while (index < chars.length && current < end) {
                    if (current >= first) {
                        output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                    }
                    index = langruntime.checkedAdd(index, 1);
                    current = langruntime.checkedI32(langruntime.checkedSignedAdd(current, 1));
                }
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
export function substringDfdi(input: checkruntime.BitValue, position: checkruntime.Int4Value): checkruntime.BitValue {
    return bitSubstring(input, position, { kind: "Value", value: 0 }, false);
}
export function substringPr1e(input: checkruntime.BitValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value): checkruntime.BitValue {
    return bitSubstring(input, position, length, true);
}
export function booleqY6qu(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
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
function byteaAsciiCharacter(value: number): string {
    value = langruntime.checkedI32(value);
    const chars: string[] = Array.from("\0\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\v\f\r\u000E\u000F\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
    let index: number = 0;
    let count: number = value;
    while (count > 0) {
        index = langruntime.checkedAdd(index, 1);
        count = langruntime.checkedI32(langruntime.checkedSignedSubtract(count, 1));
    }
    return langruntime.indexChar(chars, langruntime.checkedIndex(index));
}
const byteaMaxLength = 1073741819;
const byteaAllocationError = 56966976;
function byteaConcatLength(left: number, right: number): checkruntime.Int4Value {
    left = langruntime.checkedI32(left);
    right = langruntime.checkedI32(right);
    if (left > langruntime.checkedSignedSubtract(byteaMaxLength, right)) {
        return { kind: "Error", value: checkruntime.makeSqlError(byteaAllocationError) };
    }
    return { kind: "Value", value: langruntime.checkedSignedAdd(left, right) };
}
export function byteacatZitv(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.ByteaValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Unknown" }) || checkruntime.equalByteaValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Null" }) || checkruntime.equalByteaValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const first: number = byteaPayloadLength(a);
            const second: number = byteaPayloadLength(b);
            const length: checkruntime.Int4Value = byteaConcatLength(first, second);
            if (length.kind === "Error") {
                const error: checkruntime.SqlError = length.value;
                return { kind: "Error", value: error };
            }
            let output: string = a;
            output = output + b;
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
function byteaCompare(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Unknown" }) || checkruntime.equalByteaValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(left, { kind: "Null" }) || checkruntime.equalByteaValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const first: string[] = Array.from(a);
            const second: string[] = Array.from(b);
            let index: number = 0;
            while (index < first.length && index < second.length) {
                const highA: number = checkruntime.hexDigit(langruntime.indexChar(first, langruntime.checkedIndex(index)));
                const lowA: number = checkruntime.hexDigit(langruntime.indexChar(first, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
                const highB: number = checkruntime.hexDigit(langruntime.indexChar(second, langruntime.checkedIndex(index)));
                const lowB: number = checkruntime.hexDigit(langruntime.indexChar(second, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
                const aByte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(highA, 16), lowA);
                const bByte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(highB, 16), lowB);
                if (!(aByte === bByte)) {
                    return { kind: "Value", value: langruntime.checkedSignedSubtract(aByte, bByte) };
                }
                index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
            }
            if (first.length < second.length) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (first.length > second.length) {
                return { kind: "Value", value: 1 };
            }
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Unknown" };
}
export function byteacmp2x4q(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.Int4Value {
    return byteaCompare(left, right);
}
export function bytealtBe6e(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = byteaCompare(left, right);
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
export function bytealeVi7d(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = byteaCompare(left, right);
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
export function byteagt221r(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = byteaCompare(left, right);
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
export function byteagePaor(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = byteaCompare(left, right);
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
export function byteaLargerIqg1(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.ByteaValue {
    const result: checkruntime.Int4Value = byteaCompare(left, right);
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
        if (order > 0) {
            return left;
        }
        return right;
    }
    return { kind: "Unknown" };
}
export function byteaSmallerIook(left: checkruntime.ByteaValue, right: checkruntime.ByteaValue): checkruntime.ByteaValue {
    const result: checkruntime.Int4Value = byteaCompare(left, right);
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
        if (order < 0) {
            return left;
        }
        return right;
    }
    return { kind: "Unknown" };
}
function byteaLength(input: checkruntime.ByteaValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let index: number = 0;
        let length: number = 0;
        while (index < chars.length) {
            index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
            length = langruntime.checkedI32(langruntime.checkedSignedAdd(length, 1));
        }
        return { kind: "Value", value: length };
    }
    return { kind: "Unknown" };
}
export function lengthJ2mn(input: checkruntime.ByteaValue): checkruntime.Int4Value {
    return byteaLength(input);
}
export function octetLengthEml7(input: checkruntime.ByteaValue): checkruntime.Int4Value {
    return byteaLength(input);
}
export function bitLengthGryu(input: checkruntime.ByteaValue): checkruntime.Int4Value {
    const length: checkruntime.Int4Value = byteaLength(input);
    if (length.kind === "Value") {
        const value: number = langruntime.checkedI32(length.value);
        return int4mul284v({ kind: "Value", value: value }, { kind: "Value", value: 8 });
    }
    return length;
}
export function bitCountU0pl(input: checkruntime.ByteaValue): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let index: number = 0;
        let count: bigint = 0n;
        while (index < chars.length) {
            let digit: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            while (digit > 0) {
                if (langruntime.checkedSignedRemainder(digit, 2) === 1) {
                    count = langruntime.checkedI64(langruntime.checkedI64Add(count, 1n));
                }
                digit = langruntime.checkedI32(langruntime.checkedSignedDivide(digit, 2));
            }
            index = langruntime.checkedIndex(langruntime.checkedAdd(index, 1));
        }
        return { kind: "Value", value: count };
    }
    return { kind: "Unknown" };
}
export function reverseW0od(input: checkruntime.ByteaValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return input;
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let index: number = chars.length;
        let output: string = "";
        while (index > 0) {
            index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 2));
            output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function byteasend3q2t(input: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return input;
}
const byteaArraySubscriptError = 3452630;
function byteaPayloadLength(input: string): number {
    input = langruntime.checkedString(input);
    const chars: string[] = Array.from(input);
    let index: number = 0;
    let length: number = 0;
    while (index < chars.length) {
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
        length = langruntime.checkedI32(langruntime.checkedSignedAdd(length, 1));
    }
    return length;
}
function byteaReadByte(input: string, position: number): number {
    input = langruntime.checkedString(input);
    position = langruntime.checkedI32(position);
    const chars: string[] = Array.from(input);
    let index: number = 0;
    let current: number = 0;
    while (current < position) {
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
        current = langruntime.checkedI32(langruntime.checkedSignedAdd(current, 1));
    }
    const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
    const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
    return langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
}
function byteaPatchByte(input: string, position: number, replacement: number): string {
    input = langruntime.checkedString(input);
    position = langruntime.checkedI32(position);
    replacement = langruntime.checkedI32(replacement);
    const chars: string[] = Array.from(input);
    let index: number = 0;
    let current: number = 0;
    let output: string = "";
    while (index < chars.length) {
        if (current === position) {
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, replacement));
        }
        else {
            output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        }
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
        current = langruntime.checkedI32(langruntime.checkedSignedAdd(current, 1));
    }
    return output;
}
function byteaBitMask(position: number): number {
    position = langruntime.checkedI32(position);
    let remaining: number = position;
    let mask: number = 1;
    while (remaining > 0) {
        mask = langruntime.checkedI32(langruntime.checkedSignedMultiply(mask, 2));
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
    }
    return mask;
}
export function getByte48am(input: checkruntime.ByteaValue, position: checkruntime.Int4Value): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const offset: number = langruntime.checkedI32(position.value);
            const length: number = byteaPayloadLength(value);
            if (offset < 0 || offset >= length) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaArraySubscriptError) };
            }
            const byte: number = byteaReadByte(value, offset);
            return { kind: "Value", value: byte };
        }
    }
    return { kind: "Unknown" };
}
export function getBitThv7(input: checkruntime.ByteaValue, position: checkruntime.Int8Value): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalInt8Value(position, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalInt8Value(position, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const offset: bigint = langruntime.checkedI64(position.value);
            const length: number = byteaPayloadLength(value);
            const wideLength: bigint = BigInt(langruntime.checkedI32(length));
            const bitLength: bigint = langruntime.checkedI64Multiply(wideLength, 8n);
            if (offset < 0n || offset >= bitLength) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaArraySubscriptError) };
            }
            const wideByte: bigint = langruntime.checkedI64Divide(offset, 8n);
            const bytePosition: number = Number(BigInt.asIntN(32, langruntime.checkedI64(wideByte)));
            const wideBit: bigint = langruntime.checkedI64Remainder(offset, 8n);
            const bitPosition: number = Number(BigInt.asIntN(32, langruntime.checkedI64(wideBit)));
            const byte: number = byteaReadByte(value, bytePosition);
            const mask: number = byteaBitMask(bitPosition);
            return { kind: "Value", value: langruntime.checkedSignedRemainder((langruntime.checkedSignedDivide(byte, mask)), 2) };
        }
    }
    return { kind: "Unknown" };
}
export function setByte8mtw(input: checkruntime.ByteaValue, position: checkruntime.Int4Value, replacement: checkruntime.Int4Value): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (replacement.kind === "Error") {
        const error: checkruntime.SqlError = replacement.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(replacement, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(replacement, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const offset: number = langruntime.checkedI32(position.value);
            if (replacement.kind === "Value") {
                const newValue: number = langruntime.checkedI32(replacement.value);
                const length: number = byteaPayloadLength(value);
                if (offset < 0 || offset >= length) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaArraySubscriptError) };
                }
                let newByte: number = langruntime.checkedSignedRemainder(newValue, 256);
                if (newByte < 0) {
                    newByte = langruntime.checkedI32(langruntime.checkedSignedAdd(newByte, 256));
                }
                const output: string = byteaPatchByte(value, offset, newByte);
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
export function setBit06f4(input: checkruntime.ByteaValue, position: checkruntime.Int8Value, replacement: checkruntime.Int4Value): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (replacement.kind === "Error") {
        const error: checkruntime.SqlError = replacement.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalInt8Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(replacement, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalInt8Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(replacement, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const offset: bigint = langruntime.checkedI64(position.value);
            if (replacement.kind === "Value") {
                const newValue: number = langruntime.checkedI32(replacement.value);
                const length: number = byteaPayloadLength(value);
                const wideLength: bigint = BigInt(langruntime.checkedI32(length));
                const bitLength: bigint = langruntime.checkedI64Multiply(wideLength, 8n);
                if (offset < 0n || offset >= bitLength) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaArraySubscriptError) };
                }
                if (!(newValue === 0) && !(newValue === 1)) {
                    return { kind: "Error", value: checkruntime.makeSqlError(sqlstateInvalidParameterValue) };
                }
                const wideByte: bigint = langruntime.checkedI64Divide(offset, 8n);
                const bytePosition: number = Number(BigInt.asIntN(32, langruntime.checkedI64(wideByte)));
                const wideBit: bigint = langruntime.checkedI64Remainder(offset, 8n);
                const bitPosition: number = Number(BigInt.asIntN(32, langruntime.checkedI64(wideBit)));
                const byte: number = byteaReadByte(value, bytePosition);
                const mask: number = byteaBitMask(bitPosition);
                const oldBit: number = langruntime.checkedSignedRemainder((langruntime.checkedSignedDivide(byte, mask)), 2);
                const difference: number = langruntime.checkedSignedMultiply((langruntime.checkedSignedSubtract(newValue, oldBit)), mask);
                const newByte: number = langruntime.checkedSignedAdd(byte, difference);
                const output: string = byteaPatchByte(value, bytePosition, newByte);
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
const byteaEncodingError = 3452619;
const byteaSyntaxError = 3484946;
const byteaCodecLimit = 8584704;
function byteaCodecLengthFits(length: bigint): boolean {
    length = langruntime.checkedI64(length);
    return length <= 1073741819n;
}
function byteaBase64EncodedLength(length: bigint): bigint {
    length = langruntime.checkedI64(length);
    return langruntime.checkedI64Add(langruntime.checkedI64Multiply(langruntime.checkedI64Divide((langruntime.checkedI64Add(length, 2n)), 3n), 4n), langruntime.checkedI64Divide(length, 57n));
}
function byteaCodecUtf8Length(value: string): bigint {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let index: number = 0;
    let length: bigint = 0n;
    while (index < chars.length) {
        const codepoint: number = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index))).codePointAt(0)!;
        if (codepoint <= 127) {
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 1n));
        }
        else if (codepoint <= 2047) {
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 2n));
        }
        else if (codepoint <= 65535) {
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 3n));
        }
        else {
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 4n));
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return length;
}
function byteaEscapeEncodedLength(value: string): bigint {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let index: number = 0;
    let length: bigint = 0n;
    while (index < chars.length) {
        const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        const byte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
        if (byte === 0 || byte >= 128) {
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 4n));
        }
        else if (byte === 92) {
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 2n));
        }
        else {
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 1n));
        }
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
    }
    return length;
}
function byteaFormatIs(input: string, expected: string): boolean {
    input = langruntime.checkedString(input);
    expected = langruntime.checkedString(expected);
    const chars: string[] = Array.from(input);
    const spelling: string[] = Array.from(expected);
    if (!(chars.length === spelling.length)) {
        return false;
    }
    let index: number = 0;
    while (index < chars.length) {
        if (!(langruntime.asciiLowercase(langruntime.indexChar(chars, langruntime.checkedIndex(index))) === langruntime.indexChar(spelling, langruntime.checkedIndex(index)))) {
            return false;
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return true;
}
function byteaCodecSpace(value: string): boolean {
    value = langruntime.checkedChar(value);
    return value === " " || value === "\t" || value === "\r" || value === "\n";
}
function byteaBase64Digit(value: string): number {
    value = langruntime.checkedChar(value);
    const alphabet: string[] = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
    let index: number = 0;
    let number: number = 0;
    while (index < alphabet.length) {
        if (langruntime.indexChar(alphabet, langruntime.checkedIndex(index)) === value) {
            return number;
        }
        index = langruntime.checkedAdd(index, 1);
        number = langruntime.checkedI32(langruntime.checkedSignedAdd(number, 1));
    }
    return langruntime.checkedSignedNegate(1);
}
function byteaBase64Character(value: number): string {
    value = langruntime.checkedI32(value);
    const alphabet: string[] = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
    let index: number = 0;
    let remaining: number = value;
    while (remaining > 0) {
        index = langruntime.checkedAdd(index, 1);
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
    }
    return langruntime.indexChar(alphabet, langruntime.checkedIndex(index));
}
function byteaBase64Encode(value: string): string {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let output: string = "";
    let index: number = 0;
    let packed: number = 0;
    let count: number = 0;
    let line: number = 0;
    while (index < chars.length) {
        const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        const byte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
        packed = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(packed, 256), byte));
        count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
        if (count === 3) {
            const a: string = byteaBase64Character(langruntime.checkedSignedDivide(packed, 262144));
            const b: string = byteaBase64Character(langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(packed, 4096), 64));
            const c: string = byteaBase64Character(langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(packed, 64), 64));
            const d: string = byteaBase64Character(langruntime.checkedSignedRemainder(packed, 64));
            output = output + langruntime.checkedChar(a);
            output = output + langruntime.checkedChar(b);
            output = output + langruntime.checkedChar(c);
            output = output + langruntime.checkedChar(d);
            packed = langruntime.checkedI32(0);
            count = langruntime.checkedI32(0);
            line = langruntime.checkedI32(langruntime.checkedSignedAdd(line, 4));
            if (line === 76) {
                output = output + langruntime.checkedChar("\n");
                line = langruntime.checkedI32(0);
            }
        }
    }
    if (!(count === 0)) {
        if (count === 1) {
            packed = langruntime.checkedI32(langruntime.checkedSignedMultiply(packed, 65536));
        }
        else {
            packed = langruntime.checkedI32(langruntime.checkedSignedMultiply(packed, 256));
        }
        const a: string = byteaBase64Character(langruntime.checkedSignedDivide(packed, 262144));
        const b: string = byteaBase64Character(langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(packed, 4096), 64));
        output = output + langruntime.checkedChar(a);
        output = output + langruntime.checkedChar(b);
        if (count === 2) {
            const c: string = byteaBase64Character(langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(packed, 64), 64));
            output = output + langruntime.checkedChar(c);
        }
        else {
            output = output + langruntime.checkedChar("=");
        }
        output = output + langruntime.checkedChar("=");
    }
    return output;
}
function byteaBase64Decode(value: string): checkruntime.ByteaValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let output: string = "";
    let index: number = 0;
    let packed: number = 0;
    let count: number = 0;
    let end: number = 0;
    while (index < chars.length) {
        const character: string = langruntime.indexChar(chars, langruntime.checkedIndex(index));
        index = langruntime.checkedAdd(index, 1);
        if (byteaCodecSpace(character) === false) {
            let digit: number = 0;
            if (character === "=") {
                if (end === 0) {
                    if (count === 2) {
                        end = langruntime.checkedI32(1);
                    }
                    else if (count === 3) {
                        end = langruntime.checkedI32(2);
                    }
                    else {
                        return { kind: "Error", value: checkruntime.makeSqlError(byteaEncodingError) };
                    }
                }
            }
            else {
                digit = langruntime.checkedI32(byteaBase64Digit(character));
                if (digit < 0) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaEncodingError) };
                }
            }
            packed = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(packed, 64), digit));
            count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
            if (count === 4) {
                output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(packed, 65536), 256)));
                if (end === 0 || end > 1) {
                    output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(packed, 256), 256)));
                }
                if (end === 0 || end > 2) {
                    output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedRemainder(packed, 256)));
                }
                packed = langruntime.checkedI32(0);
                count = langruntime.checkedI32(0);
            }
        }
    }
    if (!(count === 0)) {
        return { kind: "Error", value: checkruntime.makeSqlError(byteaEncodingError) };
    }
    return { kind: "Value", value: output };
}
function byteaHexDecode(value: string): checkruntime.ByteaValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let output: string = "";
    let index: number = 0;
    while (index < chars.length) {
        if (byteaCodecSpace(langruntime.indexChar(chars, langruntime.checkedIndex(index)))) {
            index = langruntime.checkedAdd(index, 1);
        }
        else {
            const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
            if (high > 15 || index >= chars.length) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaEncodingError) };
            }
            const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
            if (low > 15) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaEncodingError) };
            }
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low)));
        }
    }
    return { kind: "Value", value: output };
}
function byteaOctalDigit(value: string): number {
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
    return 8;
}
function byteaEscapeDecodedLength(value: string): checkruntime.Int8Value {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let index: number = 0;
    let length: bigint = 0n;
    while (index < chars.length) {
        const character: string = langruntime.indexChar(chars, langruntime.checkedIndex(index));
        index = langruntime.checkedAdd(index, 1);
        if (!(character === "\\")) {
            const codepoint: number = langruntime.checkedChar(character).codePointAt(0)!;
            if (codepoint <= 127) {
                length = langruntime.checkedI64(langruntime.checkedI64Add(length, 1n));
            }
            else if (codepoint <= 2047) {
                length = langruntime.checkedI64(langruntime.checkedI64Add(length, 2n));
            }
            else if (codepoint <= 65535) {
                length = langruntime.checkedI64(langruntime.checkedI64Add(length, 3n));
            }
            else {
                length = langruntime.checkedI64(langruntime.checkedI64Add(length, 4n));
            }
        }
        else if (langruntime.checkedAdd(index, 2) < chars.length && byteaOctalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index))) <= 3 && byteaOctalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)))) <= 7 && byteaOctalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 2)))) <= 7) {
            index = langruntime.checkedIndex(langruntime.checkedAdd(index, 3));
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 1n));
        }
        else if (index < chars.length && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "\\") {
            index = langruntime.checkedAdd(index, 1);
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, 1n));
        }
        else {
            return { kind: "Error", value: checkruntime.makeSqlError(byteaSyntaxError) };
        }
    }
    return { kind: "Value", value: length };
}
function byteaEscapeDecode(value: string): checkruntime.ByteaValue {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let output: string = "";
    let index: number = 0;
    while (index < chars.length) {
        const character: string = langruntime.indexChar(chars, langruntime.checkedIndex(index));
        index = langruntime.checkedAdd(index, 1);
        if (!(character === "\\")) {
            output = langruntime.checkedString(byteaUtf8Character(output, character));
        }
        else if (index < chars.length && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "\\") {
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, 92));
            index = langruntime.checkedAdd(index, 1);
        }
        else if (langruntime.checkedAdd(index, 2) < chars.length) {
            const a: number = byteaOctalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            const b: number = byteaOctalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
            const c: number = byteaOctalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 2))));
            if (a > 3 || b > 7 || c > 7) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaSyntaxError) };
            }
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(a, 64), langruntime.checkedSignedMultiply(b, 8)), c)));
            index = langruntime.checkedIndex(langruntime.checkedAdd(index, 3));
        }
        else {
            return { kind: "Error", value: checkruntime.makeSqlError(byteaSyntaxError) };
        }
    }
    return { kind: "Value", value: output };
}
function byteaEscapeEncode(value: string): string {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let output: string = "";
    let index: number = 0;
    while (index < chars.length) {
        const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        const byte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
        if (byte === 0 || byte >= 128) {
            output = output + langruntime.checkedChar("\\");
            const a: string = byteaAsciiCharacter(langruntime.checkedSignedAdd(langruntime.checkedSignedDivide(byte, 64), 48));
            const b: string = byteaAsciiCharacter(langruntime.checkedSignedAdd(langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(byte, 8), 8), 48));
            const c: string = byteaAsciiCharacter(langruntime.checkedSignedAdd(langruntime.checkedSignedRemainder(byte, 8), 48));
            output = output + langruntime.checkedChar(a);
            output = output + langruntime.checkedChar(b);
            output = output + langruntime.checkedChar(c);
        }
        else if (byte === 92) {
            output = output + langruntime.checkedChar("\\");
            output = output + langruntime.checkedChar("\\");
        }
        else {
            const character: string = byteaAsciiCharacter(byte);
            output = output + langruntime.checkedChar(character);
        }
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
    }
    return output;
}
export function encodeBvkp(input: checkruntime.ByteaValue, format: checkruntime.TextValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (format.kind === "Error") {
        const error: checkruntime.SqlError = format.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalTextValue(format, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalTextValue(format, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (format.kind === "Value") {
            const name: string = langruntime.checkedString(format.value);
            if (byteaFormatIs(name, "hex")) {
                const length: number = byteaPayloadLength(value);
                const encoded: bigint = BigInt(langruntime.checkedI32(length));
                if (byteaCodecLengthFits(langruntime.checkedI64Multiply(encoded, 2n)) === false) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaCodecLimit) };
                }
                return { kind: "Value", value: value };
            }
            if (byteaFormatIs(name, "base64")) {
                const length: number = byteaPayloadLength(value);
                const bytes: bigint = BigInt(langruntime.checkedI32(length));
                const encoded: bigint = byteaBase64EncodedLength(bytes);
                if (byteaCodecLengthFits(encoded) === false) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaCodecLimit) };
                }
                const result: string = byteaBase64Encode(value);
                return { kind: "Value", value: result };
            }
            if (byteaFormatIs(name, "escape")) {
                const encoded: bigint = byteaEscapeEncodedLength(value);
                if (byteaCodecLengthFits(encoded) === false) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaCodecLimit) };
                }
                const result: string = byteaEscapeEncode(value);
                return { kind: "Value", value: result };
            }
            return { kind: "Error", value: checkruntime.makeSqlError(byteaEncodingError) };
        }
    }
    return { kind: "Unknown" };
}
export function decodeB6gt(input: checkruntime.TextValue, format: checkruntime.TextValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (format.kind === "Error") {
        const error: checkruntime.SqlError = format.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" }) || checkruntime.equalTextValue(format, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" }) || checkruntime.equalTextValue(format, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (format.kind === "Value") {
            const name: string = langruntime.checkedString(format.value);
            if (byteaFormatIs(name, "hex")) {
                const bytes: bigint = byteaCodecUtf8Length(value);
                if (byteaCodecLengthFits(langruntime.checkedI64Divide(bytes, 2n)) === false) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaCodecLimit) };
                }
                return byteaHexDecode(value);
            }
            if (byteaFormatIs(name, "base64")) {
                const bytes: bigint = byteaCodecUtf8Length(value);
                if (byteaCodecLengthFits(langruntime.checkedI64Divide(langruntime.checkedI64Multiply(bytes, 3n), 4n)) === false) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaCodecLimit) };
                }
                return byteaBase64Decode(value);
            }
            if (byteaFormatIs(name, "escape")) {
                const estimate: checkruntime.Int8Value = byteaEscapeDecodedLength(value);
                if (estimate.kind === "Error") {
                    const error: checkruntime.SqlError = estimate.value;
                    return { kind: "Error", value: error };
                }
                if (estimate.kind === "Value") {
                    const length: bigint = langruntime.checkedI64(estimate.value);
                    if (byteaCodecLengthFits(length) === false) {
                        return { kind: "Error", value: checkruntime.makeSqlError(byteaCodecLimit) };
                    }
                }
                return byteaEscapeDecode(value);
            }
            return { kind: "Error", value: checkruntime.makeSqlError(byteaEncodingError) };
        }
    }
    return { kind: "Unknown" };
}
function byteaHashBytes(value: string): checkruntime.HashByte[] {
    value = langruntime.checkedString(value);
    const chars: string[] = Array.from(value);
    let bytes: checkruntime.HashByte[] = [];
    let index: number = 0;
    while (index < chars.length) {
        const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        const byte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
        langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(byte)) }, checkruntime.copyHashByte);
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
    }
    return bytes;
}
export function hashbyteaMypt(input: checkruntime.ByteaValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const bytes: checkruntime.HashByte[] = byteaHashBytes(value);
        const hash: number = checkruntime.hashBytes32(bytes);
        return { kind: "Value", value: hash };
    }
    return { kind: "Unknown" };
}
export function hashbyteaextendedU1vz(input: checkruntime.ByteaValue, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (seed.kind === "Error") {
        const error: checkruntime.SqlError = seed.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalInt8Value(seed, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalInt8Value(seed, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (seed.kind === "Value") {
            const salt: bigint = langruntime.checkedI64(seed.value);
            const bytes: checkruntime.HashByte[] = byteaHashBytes(value);
            const hash: bigint = checkruntime.hashBytes64(bytes, salt);
            return { kind: "Value", value: hash };
        }
    }
    return { kind: "Unknown" };
}
function byteaCrc(input: checkruntime.ByteaValue, polynomial: bigint): checkruntime.Int8Value {
    polynomial = langruntime.checkedI64(polynomial);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let crc: bigint = 4294967295n;
        let index: number = 0;
        while (index < chars.length) {
            const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
            const byte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
            const wideByte: bigint = BigInt(langruntime.checkedI32(byte));
            crc = langruntime.checkedI64(checkruntime.hashXor(crc, wideByte));
            let bit: number = 0;
            while (bit < 8) {
                const lowBit: bigint = langruntime.checkedI64Remainder(crc, 2n);
                crc = langruntime.checkedI64(langruntime.checkedI64Divide(crc, 2n));
                if (lowBit === 1n) {
                    crc = langruntime.checkedI64(checkruntime.hashXor(crc, polynomial));
                }
                bit = langruntime.checkedI32(langruntime.checkedSignedAdd(bit, 1));
            }
            index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
        }
        const result: bigint = langruntime.checkedI64Subtract(4294967295n, crc);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function crc320obw(input: checkruntime.ByteaValue): checkruntime.Int8Value {
    return byteaCrc(input, 3988292384n);
}
export function crc32cF1hu(input: checkruntime.ByteaValue): checkruntime.Int8Value {
    return byteaCrc(input, 2197175160n);
}
export function byteaFromText(input: checkruntime.TextValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        if (chars.length >= 2 && langruntime.indexChar(chars, langruntime.checkedIndex(0)) === "\\" && langruntime.indexChar(chars, langruntime.checkedIndex(1)) === "x") {
            const length: bigint = langruntime.checkedI64Divide((langruntime.checkedI64Subtract(byteaCodecUtf8Length(value), 2n)), 2n);
            if (byteaCodecLengthFits(length) === false) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaAllocationError) };
            }
            let payload: string = "";
            let index: number = 2;
            while (index < chars.length) {
                payload = payload + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                index = langruntime.checkedAdd(index, 1);
            }
            return byteaHexDecode(payload);
        }
        const estimate: checkruntime.Int8Value = byteaEscapeDecodedLength(value);
        if (estimate.kind === "Error") {
            const error: checkruntime.SqlError = estimate.value;
            return { kind: "Error", value: error };
        }
        if (estimate.kind === "Value") {
            const length: bigint = langruntime.checkedI64(estimate.value);
            if (byteaCodecLengthFits(length) === false) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaAllocationError) };
            }
        }
        return byteaEscapeDecode(value);
    }
    return { kind: "Unknown" };
}
function byteaIntegerValue(input: checkruntime.ByteaValue, width: number): checkruntime.Int8Value {
    width = langruntime.checkedI32(width);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const length: number = byteaPayloadLength(value);
        if (length > width) {
            return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
        }
        const chars: string[] = Array.from(value);
        let index: number = 0;
        let result: bigint = 0n;
        while (index < chars.length) {
            const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
            let byte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
            if (index === 0 && length === width && byte >= 128) {
                byte = langruntime.checkedI32(langruntime.checkedSignedSubtract(byte, 256));
            }
            const wideByte: bigint = BigInt(langruntime.checkedI32(byte));
            result = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(result, 256n), wideByte));
            index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
        }
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
function byteaIntegerSend(value: bigint, width: number): string {
    value = langruntime.checkedI64(value);
    width = langruntime.checkedI32(width);
    let remaining: bigint = value;
    let bytes: checkruntime.HashByte[] = [];
    let index: number = 0;
    while (index < width) {
        let wideByte: bigint = langruntime.checkedI64Remainder(remaining, 256n);
        if (wideByte < 0n) {
            wideByte = langruntime.checkedI64(langruntime.checkedI64Add(wideByte, 256n));
        }
        langruntime.pushStruct(bytes, { value: wideByte }, checkruntime.copyHashByte);
        remaining = langruntime.checkedI64(langruntime.checkedI64Divide((langruntime.checkedI64Subtract(remaining, wideByte)), 256n));
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    let output: string = "";
    let position: number = bytes.length;
    while (position > 0) {
        position = langruntime.checkedIndex(langruntime.checkedSubtract(position, 1));
        const byte: number = Number(BigInt.asIntN(32, langruntime.checkedI64(langruntime.indexStruct(bytes, langruntime.checkedIndex(position), checkruntime.copyHashByte).value)));
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, byte));
    }
    return output;
}
export function int2Hj0w(input: checkruntime.ByteaValue): checkruntime.Int2Value {
    const result: checkruntime.Int8Value = byteaIntegerValue(input, 2);
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const value: bigint = langruntime.checkedI64(result.value);
        const narrowed: number = Number(BigInt.asIntN(32, langruntime.checkedI64(value)));
        return { kind: "Value", value: narrowed };
    }
    return { kind: "Unknown" };
}
export function int4Lvgc(input: checkruntime.ByteaValue): checkruntime.Int4Value {
    const result: checkruntime.Int8Value = byteaIntegerValue(input, 4);
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const value: bigint = langruntime.checkedI64(result.value);
        const narrowed: number = Number(BigInt.asIntN(32, langruntime.checkedI64(value)));
        return { kind: "Value", value: narrowed };
    }
    return { kind: "Unknown" };
}
export function int8Ih14(input: checkruntime.ByteaValue): checkruntime.Int8Value {
    return byteaIntegerValue(input, 8);
}
export function int2send5wzj(input: checkruntime.Int2Value): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt2Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt2Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        const wideValue: bigint = BigInt(langruntime.checkedI32(value));
        const output: string = byteaIntegerSend(wideValue, 2);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function byteaMcxl(input: checkruntime.Int2Value): checkruntime.ByteaValue {
    return int2send5wzj(input);
}
export function int4sendFjzt(input: checkruntime.Int4Value): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        const wideValue: bigint = BigInt(langruntime.checkedI32(value));
        const output: string = byteaIntegerSend(wideValue, 4);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function bytea4poi(input: checkruntime.Int4Value): checkruntime.ByteaValue {
    return int4sendFjzt(input);
}
export function int8sendPjz0(input: checkruntime.Int8Value): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        const wideValue: bigint = value;
        const output: string = byteaIntegerSend(wideValue, 8);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function bytea0om8(input: checkruntime.Int8Value): checkruntime.ByteaValue {
    return int8sendPjz0(input);
}
export function dateSendI2tv(input: checkruntime.DateValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        const wideValue: bigint = BigInt(langruntime.checkedI32(value));
        const output: string = byteaIntegerSend(wideValue, 4);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function timestampSend3syx(input: checkruntime.TimestampValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        const wideValue: bigint = value;
        const output: string = byteaIntegerSend(wideValue, 8);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function timestamptzSendJyu1(input: checkruntime.TimestamptzValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        const wideValue: bigint = value;
        const output: string = byteaIntegerSend(wideValue, 8);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function boolsendOo82(input: checkruntime.BoolValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: boolean = langruntime.checkedBool(input.value);
        let byte: number = 0;
        if (value) {
            byte = langruntime.checkedI32(1);
        }
        const output: string = checkruntime.byteaAppendByte("", byte);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
const byteaEscapeError = 3452621;
interface ByteaLikeFrame {
    text: number;
    pattern: number;
    searching: boolean;
    firstHigh: string;
    firstLow: string;
}
function copyByteaLikeFrame(value: ByteaLikeFrame): ByteaLikeFrame {
    return { text: langruntime.checkedIndex(value.text), pattern: langruntime.checkedIndex(value.pattern), searching: langruntime.checkedBool(value.searching), firstHigh: langruntime.checkedChar(value.firstHigh), firstLow: langruntime.checkedChar(value.firstLow) };
}
function equalByteaLikeFrame(left: ByteaLikeFrame, right: ByteaLikeFrame): boolean {
    return left.text === right.text && left.pattern === right.pattern && left.searching === right.searching && left.firstHigh === right.firstHigh && left.firstLow === right.firstLow;
}
function byteaLikeMatch(input: string, pattern: string): checkruntime.Int4Value {
    input = langruntime.checkedString(input);
    pattern = langruntime.checkedString(pattern);
    const text: string[] = Array.from(input);
    const chars: string[] = Array.from(pattern);
    let frames: ByteaLikeFrame[] = [];
    langruntime.pushStruct(frames, { text: 0, pattern: 0, searching: false, firstHigh: "0", firstLow: "0" }, copyByteaLikeFrame);
    let depth: number = 1;
    while (depth > 0) {
        const current: number = langruntime.checkedSubtract(depth, 1);
        const frame: ByteaLikeFrame = copyByteaLikeFrame(langruntime.indexStruct(frames, langruntime.checkedIndex(current), copyByteaLikeFrame));
        let t: number = frame.text;
        let p: number = frame.pattern;
        let searching: boolean = frame.searching;
        let firstHigh: string = frame.firstHigh;
        let firstLow: string = frame.firstLow;
        let failed: boolean = false;
        if (searching) {
            while (t < text.length && (!(langruntime.indexChar(text, langruntime.checkedIndex(t)) === firstHigh) || !(langruntime.indexChar(text, langruntime.checkedIndex(langruntime.checkedAdd(t, 1))) === firstLow))) {
                t = langruntime.checkedIndex(langruntime.checkedAdd(t, 2));
            }
            if (t >= text.length) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            frames[langruntime.checkedIndexIn(frames, current)] = copyByteaLikeFrame({ text: langruntime.checkedAdd(t, 2), pattern: p, searching: true, firstHigh: firstHigh, firstLow: firstLow });
            const child: ByteaLikeFrame = copyByteaLikeFrame({ text: t, pattern: p, searching: false, firstHigh: "0", firstLow: "0" });
            if (depth < frames.length) {
                frames[langruntime.checkedIndexIn(frames, depth)] = copyByteaLikeFrame(child);
            }
            else {
                langruntime.pushStruct(frames, child, copyByteaLikeFrame);
            }
            depth = langruntime.checkedAdd(depth, 1);
        }
        else {
            if (t < text.length && p < chars.length) {
                if (langruntime.indexChar(chars, langruntime.checkedIndex(p)) === "2" && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))) === "5") {
                    p = langruntime.checkedIndex(langruntime.checkedAdd(p, 2));
                    let wildcards: boolean = true;
                    while (p < chars.length && wildcards) {
                        if (langruntime.indexChar(chars, langruntime.checkedIndex(p)) === "2" && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))) === "5") {
                            p = langruntime.checkedIndex(langruntime.checkedAdd(p, 2));
                        }
                        else if (langruntime.indexChar(chars, langruntime.checkedIndex(p)) === "5" && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))) === "f") {
                            if (t >= text.length) {
                                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
                            }
                            t = langruntime.checkedIndex(langruntime.checkedAdd(t, 2));
                            p = langruntime.checkedIndex(langruntime.checkedAdd(p, 2));
                        }
                        else {
                            wildcards = langruntime.checkedBool(false);
                        }
                    }
                    if (p >= chars.length) {
                        return { kind: "Value", value: 1 };
                    }
                    let literal: number = p;
                    if (langruntime.indexChar(chars, langruntime.checkedIndex(p)) === "5" && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))) === "c") {
                        literal = langruntime.checkedIndex(langruntime.checkedAdd(literal, 2));
                        if (literal >= chars.length) {
                            return { kind: "Error", value: checkruntime.makeSqlError(byteaEscapeError) };
                        }
                    }
                    firstHigh = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(literal)));
                    firstLow = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(literal, 1))));
                    searching = langruntime.checkedBool(true);
                }
                else if (langruntime.indexChar(chars, langruntime.checkedIndex(p)) === "5" && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))) === "f") {
                    t = langruntime.checkedIndex(langruntime.checkedAdd(t, 2));
                    p = langruntime.checkedIndex(langruntime.checkedAdd(p, 2));
                }
                else {
                    if (langruntime.indexChar(chars, langruntime.checkedIndex(p)) === "5" && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))) === "c") {
                        p = langruntime.checkedIndex(langruntime.checkedAdd(p, 2));
                        if (p >= chars.length) {
                            return { kind: "Error", value: checkruntime.makeSqlError(byteaEscapeError) };
                        }
                    }
                    if (!(langruntime.indexChar(text, langruntime.checkedIndex(t)) === langruntime.indexChar(chars, langruntime.checkedIndex(p))) || !(langruntime.indexChar(text, langruntime.checkedIndex(langruntime.checkedAdd(t, 1))) === langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))))) {
                        failed = langruntime.checkedBool(true);
                    }
                    else {
                        t = langruntime.checkedIndex(langruntime.checkedAdd(t, 2));
                        p = langruntime.checkedIndex(langruntime.checkedAdd(p, 2));
                    }
                }
            }
            else if (t < text.length) {
                failed = langruntime.checkedBool(true);
            }
            else {
                while (p < chars.length && langruntime.indexChar(chars, langruntime.checkedIndex(p)) === "2" && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(p, 1))) === "5") {
                    p = langruntime.checkedIndex(langruntime.checkedAdd(p, 2));
                }
                if (p >= chars.length) {
                    return { kind: "Value", value: 1 };
                }
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (failed) {
                depth = langruntime.checkedIndex(langruntime.checkedSubtract(depth, 1));
            }
            else {
                frames[langruntime.checkedIndexIn(frames, current)] = copyByteaLikeFrame({ text: t, pattern: p, searching: searching, firstHigh: firstHigh, firstLow: firstLow });
            }
        }
    }
    return { kind: "Value", value: 0 };
}
function byteaLike(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue, negate: boolean): checkruntime.BoolValue {
    negate = langruntime.checkedBool(negate);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (pattern.kind === "Error") {
        const error: checkruntime.SqlError = pattern.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalByteaValue(pattern, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalByteaValue(pattern, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (pattern.kind === "Value") {
            const pat: string = langruntime.checkedString(pattern.value);
            const result: checkruntime.Int4Value = byteaLikeMatch(value, pat);
            if (result.kind === "Error") {
                const error: checkruntime.SqlError = result.value;
                return { kind: "Error", value: error };
            }
            if (result.kind === "Value") {
                const matched: number = langruntime.checkedI32(result.value);
                const value: boolean = matched === 1;
                return { kind: "Value", value: !(value === negate) };
            }
        }
    }
    return { kind: "Unknown" };
}
export function bytealikeJhpm(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.BoolValue {
    return byteaLike(input, pattern, false);
}
export function like9b5r(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.BoolValue {
    return byteaLike(input, pattern, false);
}
export function byteanlikeQodo(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.BoolValue {
    return byteaLike(input, pattern, true);
}
export function notlikeCy7a(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.BoolValue {
    return byteaLike(input, pattern, true);
}
export function likeEscapeHk4j(input: checkruntime.ByteaValue, escape: checkruntime.ByteaValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (escape.kind === "Error") {
        const error: checkruntime.SqlError = escape.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalByteaValue(escape, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalByteaValue(escape, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (escape.kind === "Value") {
            const esc: string = langruntime.checkedString(escape.value);
            const length: number = byteaPayloadLength(value);
            const allocated: checkruntime.Int4Value = byteaConcatLength(length, length);
            if (allocated.kind === "Error") {
                const error: checkruntime.SqlError = allocated.value;
                return { kind: "Error", value: error };
            }
            const chars: string[] = Array.from(value);
            const escapeChars: string[] = Array.from(esc);
            if (escapeChars.length > 2) {
                return { kind: "Error", value: checkruntime.makeSqlError(byteaEscapeError) };
            }
            if (escapeChars.length === 2 && langruntime.indexChar(escapeChars, langruntime.checkedIndex(0)) === "5" && langruntime.indexChar(escapeChars, langruntime.checkedIndex(1)) === "c") {
                return { kind: "Value", value: value };
            }
            let output: string = "";
            let index: number = 0;
            let afterEscape: boolean = false;
            while (index < chars.length) {
                const high: string = langruntime.indexChar(chars, langruntime.checkedIndex(index));
                const low: string = langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)));
                let isEscape: boolean = false;
                if (escapeChars.length === 2) {
                    isEscape = langruntime.checkedBool(high === langruntime.indexChar(escapeChars, langruntime.checkedIndex(0)) && low === langruntime.indexChar(escapeChars, langruntime.checkedIndex(1)) && afterEscape === false);
                }
                if (isEscape) {
                    output = output + "5c";
                    afterEscape = langruntime.checkedBool(true);
                }
                else {
                    if (high === "5" && low === "c" && afterEscape === false) {
                        output = output + "5c";
                    }
                    output = output + langruntime.checkedChar(high);
                    output = output + langruntime.checkedChar(low);
                    afterEscape = langruntime.checkedBool(false);
                }
                index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
            }
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
const digestMd5K: ReadonlyArray<bigint> = [3614090360n, 3905402710n, 606105819n, 3250441966n, 4118548399n, 1200080426n, 2821735955n, 4249261313n, 1770035416n, 2336552879n, 4294925233n, 2304563134n, 1804603682n, 4254626195n, 2792965006n, 1236535329n, 4129170786n, 3225465664n, 643717713n, 3921069994n, 3593408605n, 38016083n, 3634488961n, 3889429448n, 568446438n, 3275163606n, 4107603335n, 1163531501n, 2850285829n, 4243563512n, 1735328473n, 2368359562n, 4294588738n, 2272392833n, 1839030562n, 4259657740n, 2763975236n, 1272893353n, 4139469664n, 3200236656n, 681279174n, 3936430074n, 3572445317n, 76029189n, 3654602809n, 3873151461n, 530742520n, 3299628645n, 4096336452n, 1126891415n, 2878612391n, 4237533241n, 1700485571n, 2399980690n, 4293915773n, 2240044497n, 1873313359n, 4264355552n, 2734768916n, 1309151649n, 4149444226n, 3174756917n, 718787259n, 3951481745n];
const digestMd5Shifts: ReadonlyArray<number> = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
function digestMd5Select(round: number, b: bigint, c: bigint, d: bigint): bigint {
    round = langruntime.checkedIndex(round);
    b = langruntime.checkedI64(b);
    c = langruntime.checkedI64(c);
    d = langruntime.checkedI64(d);
    if (round < 16) {
        const chosen: bigint = digestAnd(b, c);
        const unchosen: bigint = digestAnd(langruntime.checkedI64Subtract(4294967295n, b), d);
        return checkruntime.hashXor(chosen, unchosen);
    }
    if (round < 32) {
        const chosen: bigint = digestAnd(b, d);
        const unchosen: bigint = digestAnd(c, langruntime.checkedI64Subtract(4294967295n, d));
        return checkruntime.hashXor(chosen, unchosen);
    }
    if (round < 48) {
        return digestXor3(b, c, d);
    }
    const opposite: bigint = langruntime.checkedI64Subtract(4294967295n, d);
    const exclusive: bigint = checkruntime.hashXor(b, opposite);
    const common: bigint = digestAnd(b, opposite);
    return checkruntime.hashXor(c, langruntime.checkedI64Add(exclusive, common));
}
function digestMd5Hex(input: string): string {
    input = langruntime.checkedString(input);
    let stateA: bigint = 1732584193n;
    let stateB: bigint = 4023233417n;
    let stateC: bigint = 2562383102n;
    let stateD: bigint = 271733878n;
    const bytes: checkruntime.HashByte[] = digestPadding(input, false, true);
    let offset: number = 0;
    while (offset < bytes.length) {
        let words: checkruntime.HashByte[] = [];
        let index: number = 0;
        while (index < 16) {
            let word: bigint = 0n;
            let place: bigint = 1n;
            let octet: number = 0;
            while (octet < 4) {
                word = langruntime.checkedI64(langruntime.checkedI64Add(word, langruntime.checkedI64Multiply(langruntime.indexStruct(bytes, langruntime.checkedIndex(offset), checkruntime.copyHashByte).value, place)));
                place = langruntime.checkedI64(langruntime.checkedI64Multiply(place, 256n));
                offset = langruntime.checkedAdd(offset, 1);
                octet = langruntime.checkedAdd(octet, 1);
            }
            langruntime.pushStruct(words, { value: word }, checkruntime.copyHashByte);
            index = langruntime.checkedAdd(index, 1);
        }
        let a: bigint = stateA;
        let b: bigint = stateB;
        let c: bigint = stateC;
        let d: bigint = stateD;
        let round: number = 0;
        let roundNumber: number = 0;
        while (round < 64) {
            const selected: bigint = digestMd5Select(round, b, c, d);
            let needed: number = roundNumber;
            if (round >= 48) {
                needed = langruntime.checkedI32(langruntime.checkedSignedRemainder(langruntime.checkedSignedMultiply(roundNumber, 7), 16));
            }
            else if (round >= 32) {
                needed = langruntime.checkedI32(langruntime.checkedSignedRemainder((langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(roundNumber, 3), 5)), 16));
            }
            else if (round >= 16) {
                needed = langruntime.checkedI32(langruntime.checkedSignedRemainder((langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(roundNumber, 5), 1)), 16));
            }
            let position: number = 0;
            while (needed > 0) {
                position = langruntime.checkedAdd(position, 1);
                needed = langruntime.checkedI32(langruntime.checkedSignedSubtract(needed, 1));
            }
            const sum: bigint = digestWrap(langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Add(a, selected), langruntime.indexStatic(digestMd5K, langruntime.checkedIndex(round))), langruntime.indexStruct(words, langruntime.checkedIndex(position), checkruntime.copyHashByte).value));
            const rotated: bigint = digestRight(sum, langruntime.checkedSignedSubtract(32, langruntime.indexStatic(digestMd5Shifts, langruntime.checkedIndex(round))), true);
            const next: bigint = digestWrap(langruntime.checkedI64Add(b, rotated));
            a = langruntime.checkedI64(d);
            d = langruntime.checkedI64(c);
            c = langruntime.checkedI64(b);
            b = langruntime.checkedI64(next);
            round = langruntime.checkedAdd(round, 1);
            roundNumber = langruntime.checkedI32(langruntime.checkedSignedAdd(roundNumber, 1));
        }
        stateA = langruntime.checkedI64(digestWrap(langruntime.checkedI64Add(stateA, a)));
        stateB = langruntime.checkedI64(digestWrap(langruntime.checkedI64Add(stateB, b)));
        stateC = langruntime.checkedI64(digestWrap(langruntime.checkedI64Add(stateC, c)));
        stateD = langruntime.checkedI64(digestWrap(langruntime.checkedI64Add(stateD, d)));
    }
    let output: string = "";
    let index: number = 0;
    while (index < 4) {
        let word: bigint = stateA;
        if (index === 1) {
            word = langruntime.checkedI64(stateB);
        }
        else if (index === 2) {
            word = langruntime.checkedI64(stateC);
        }
        else if (index === 3) {
            word = langruntime.checkedI64(stateD);
        }
        let octet: number = 0;
        while (octet < 4) {
            const byte: bigint = langruntime.checkedI64Remainder(word, 256n);
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, Number(BigInt.asIntN(32, langruntime.checkedI64(byte)))));
            word = langruntime.checkedI64(langruntime.checkedI64Divide(word, 256n));
            octet = langruntime.checkedAdd(octet, 1);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return output;
}
export function md5Vpfl(input: checkruntime.ByteaValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const result: string = digestMd5Hex(value);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function md5Kt50(input: checkruntime.TextValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let encoded: string = "";
        let index: number = 0;
        while (index < chars.length) {
            encoded = langruntime.checkedString(byteaUtf8Character(encoded, langruntime.indexChar(chars, langruntime.checkedIndex(index))));
            index = langruntime.checkedAdd(index, 1);
        }
        const result: string = digestMd5Hex(encoded);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
function byteaOverlay(input: checkruntime.ByteaValue, replacement: checkruntime.ByteaValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value, hasLength: boolean): checkruntime.ByteaValue {
    hasLength = langruntime.checkedBool(hasLength);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (replacement.kind === "Error") {
        const error: checkruntime.SqlError = replacement.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalByteaValue(replacement, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalByteaValue(replacement, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (replacement.kind === "Value") {
        const bytes: string = langruntime.checkedString(replacement.value);
        if (position.kind === "Value") {
            const start: number = langruntime.checkedI32(position.value);
            if (length.kind === "Value") {
                const supplied: number = langruntime.checkedI32(length.value);
                if (start <= 0) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaSubstringError) };
                }
                let count: number = supplied;
                if (hasLength === false) {
                    count = langruntime.checkedI32(byteaPayloadLength(bytes));
                }
                if (count > 0 && start > langruntime.checkedSignedSubtract(2147483647, count)) {
                    return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
                }
                const end: number = langruntime.checkedSignedAdd(start, count);
                const prefix: checkruntime.ByteaValue = byteaSubstring(input, { kind: "Value", value: 1 }, { kind: "Value", value: langruntime.checkedSignedSubtract(start, 1) }, true);
                const suffix: checkruntime.ByteaValue = byteaSubstring(input, { kind: "Value", value: end }, { kind: "Value", value: 0 }, false);
                const combined: checkruntime.ByteaValue = byteacatZitv(prefix, { kind: "Value", value: bytes });
                return byteacatZitv(combined, suffix);
            }
        }
    }
    return { kind: "Unknown" };
}
export function overlay9neg(input: checkruntime.ByteaValue, replacement: checkruntime.ByteaValue, position: checkruntime.Int4Value): checkruntime.ByteaValue {
    return byteaOverlay(input, replacement, position, { kind: "Value", value: 0 }, false);
}
export function overlay72ov(input: checkruntime.ByteaValue, replacement: checkruntime.ByteaValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value): checkruntime.ByteaValue {
    return byteaOverlay(input, replacement, position, length, true);
}
export function position9w14(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (pattern.kind === "Error") {
        const error: checkruntime.SqlError = pattern.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalByteaValue(pattern, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalByteaValue(pattern, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (pattern.kind === "Value") {
            const needle: string = langruntime.checkedString(pattern.value);
            const length: number = byteaPayloadLength(value);
            const patternLength: number = byteaPayloadLength(needle);
            if (patternLength === 0) {
                return { kind: "Value", value: 1 };
            }
            if (patternLength > length) {
                return { kind: "Value", value: 0 };
            }
            const chars: string[] = Array.from(value);
            const patternChars: string[] = Array.from(needle);
            const last: number = langruntime.checkedSubtract(chars.length, patternChars.length);
            let start: number = 0;
            let position: number = 1;
            while (start <= last) {
                let index: number = 0;
                let matches: boolean = true;
                while (index < patternChars.length && matches) {
                    if (!(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(start, index))) === langruntime.indexChar(patternChars, langruntime.checkedIndex(index)))) {
                        matches = langruntime.checkedBool(false);
                    }
                    index = langruntime.checkedAdd(index, 1);
                }
                if (matches) {
                    return { kind: "Value", value: position };
                }
                start = langruntime.checkedIndex(langruntime.checkedAdd(start, 2));
                position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
            }
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Unknown" };
}
const digestSha256K: ReadonlyArray<bigint> = [1116352408n, 1899447441n, 3049323471n, 3921009573n, 961987163n, 1508970993n, 2453635748n, 2870763221n, 3624381080n, 310598401n, 607225278n, 1426881987n, 1925078388n, 2162078206n, 2614888103n, 3248222580n, 3835390401n, 4022224774n, 264347078n, 604807628n, 770255983n, 1249150122n, 1555081692n, 1996064986n, 2554220882n, 2821834349n, 2952996808n, 3210313671n, 3336571891n, 3584528711n, 113926993n, 338241895n, 666307205n, 773529912n, 1294757372n, 1396182291n, 1695183700n, 1986661051n, 2177026350n, 2456956037n, 2730485921n, 2820302411n, 3259730800n, 3345764771n, 3516065817n, 3600352804n, 4094571909n, 275423344n, 430227734n, 506948616n, 659060556n, 883997877n, 958139571n, 1322822218n, 1537002063n, 1747873779n, 1955562222n, 2024104815n, 2227730452n, 2361852424n, 2428436474n, 2756734187n, 3204031479n, 3329325298n];
const digestSha224Initial: ReadonlyArray<bigint> = [3238371032n, 914150663n, 812702999n, 4144912697n, 4290775857n, 1750603025n, 1694076839n, 3204075428n];
const digestSha256Initial: ReadonlyArray<bigint> = [1779033703n, 3144134277n, 1013904242n, 2773480762n, 1359893119n, 2600822924n, 528734635n, 1541459225n];
function digestWrap(value: bigint): bigint {
    value = langruntime.checkedI64(value);
    return langruntime.checkedI64Remainder(value, 4294967296n);
}
function digestAnd(left: bigint, right: bigint): bigint {
    left = langruntime.checkedI64(left);
    right = langruntime.checkedI64(right);
    const unequal: bigint = checkruntime.hashXor(left, right);
    return langruntime.checkedI64Divide((langruntime.checkedI64Subtract(langruntime.checkedI64Add(left, right), unequal)), 2n);
}
function digestRight(value: bigint, bits: number, rotate: boolean): bigint {
    value = langruntime.checkedI64(value);
    bits = langruntime.checkedI32(bits);
    rotate = langruntime.checkedBool(rotate);
    let divisor: bigint = 1n;
    let remaining: number = bits;
    while (remaining > 0) {
        divisor = langruntime.checkedI64(langruntime.checkedI64Multiply(divisor, 2n));
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
    }
    let result: bigint = langruntime.checkedI64Divide(value, divisor);
    if (rotate) {
        result = langruntime.checkedI64(langruntime.checkedI64Add(result, langruntime.checkedI64Multiply(langruntime.checkedI64Remainder(value, divisor), (langruntime.checkedI64Divide(4294967296n, divisor)))));
    }
    return result;
}
function digestXor3(a: bigint, b: bigint, c: bigint): bigint {
    a = langruntime.checkedI64(a);
    b = langruntime.checkedI64(b);
    c = langruntime.checkedI64(c);
    const pair: bigint = checkruntime.hashXor(a, b);
    return checkruntime.hashXor(pair, c);
}
function digestSigma(value: bigint, first: number, second: number, last: number, rotateLast: boolean): bigint {
    value = langruntime.checkedI64(value);
    first = langruntime.checkedI32(first);
    second = langruntime.checkedI32(second);
    last = langruntime.checkedI32(last);
    rotateLast = langruntime.checkedBool(rotateLast);
    const a: bigint = digestRight(value, first, true);
    const b: bigint = digestRight(value, second, true);
    const c: bigint = digestRight(value, last, rotateLast);
    return digestXor3(a, b, c);
}
function digestPadding(input: string, wide: boolean, little: boolean): checkruntime.HashByte[] {
    input = langruntime.checkedString(input);
    wide = langruntime.checkedBool(wide);
    little = langruntime.checkedBool(little);
    const chars: string[] = Array.from(input);
    let bytes: checkruntime.HashByte[] = [];
    let bits: bigint = 0n;
    let index: number = 0;
    let position: number = 0;
    let width: number = 64;
    let limit: number = 56;
    if (wide) {
        width = langruntime.checkedI32(128);
        limit = langruntime.checkedI32(112);
    }
    while (index < chars.length) {
        const high: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        const low: number = checkruntime.hexDigit(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
        const byte: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(high, 16), low);
        langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(byte)) }, checkruntime.copyHashByte);
        bits = langruntime.checkedI64(langruntime.checkedI64Add(bits, 8n));
        index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
        position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
        if (position === width) {
            position = langruntime.checkedI32(0);
        }
    }
    langruntime.pushStruct(bytes, { value: 128n }, checkruntime.copyHashByte);
    position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
    if (position === width) {
        position = langruntime.checkedI32(0);
    }
    while (!(position === limit)) {
        langruntime.pushStruct(bytes, { value: 0n }, checkruntime.copyHashByte);
        position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
        if (position === width) {
            position = langruntime.checkedI32(0);
        }
    }
    if (wide) {
        let zeros: number = 0;
        while (zeros < 8) {
            langruntime.pushStruct(bytes, { value: 0n }, checkruntime.copyHashByte);
            zeros = langruntime.checkedAdd(zeros, 1);
        }
    }
    let count: number = 0;
    let divisor: bigint = 72057594037927936n;
    while (count < 8) {
        if (little) {
            langruntime.pushStruct(bytes, { value: langruntime.checkedI64Remainder(bits, 256n) }, checkruntime.copyHashByte);
            bits = langruntime.checkedI64(langruntime.checkedI64Divide(bits, 256n));
        }
        else {
            langruntime.pushStruct(bytes, { value: langruntime.checkedI64Remainder(langruntime.checkedI64Divide(bits, divisor), 256n) }, checkruntime.copyHashByte);
            divisor = langruntime.checkedI64(langruntime.checkedI64Divide(divisor, 256n));
        }
        count = langruntime.checkedAdd(count, 1);
    }
    return bytes;
}
function digestSha256Hex(input: string, short: boolean): string {
    input = langruntime.checkedString(input);
    short = langruntime.checkedBool(short);
    let state: checkruntime.HashByte[] = [];
    let initial: number = 0;
    while (initial < 8) {
        let value: bigint = langruntime.indexStatic(digestSha256Initial, langruntime.checkedIndex(initial));
        if (short) {
            value = langruntime.checkedI64(langruntime.indexStatic(digestSha224Initial, langruntime.checkedIndex(initial)));
        }
        langruntime.pushStruct(state, { value: value }, checkruntime.copyHashByte);
        initial = langruntime.checkedAdd(initial, 1);
    }
    const bytes: checkruntime.HashByte[] = digestPadding(input, false, false);
    let offset: number = 0;
    while (offset < bytes.length) {
        let words: checkruntime.HashByte[] = [];
        let index: number = 0;
        while (index < 16) {
            let word: bigint = 0n;
            let octet: number = 0;
            while (octet < 4) {
                word = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(word, 256n), langruntime.indexStruct(bytes, langruntime.checkedIndex(offset), checkruntime.copyHashByte).value));
                offset = langruntime.checkedAdd(offset, 1);
                octet = langruntime.checkedAdd(octet, 1);
            }
            langruntime.pushStruct(words, { value: word }, checkruntime.copyHashByte);
            index = langruntime.checkedAdd(index, 1);
        }
        while (index < 64) {
            const a: bigint = digestSigma(langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 15)), checkruntime.copyHashByte).value, 7, 18, 3, false);
            const b: bigint = digestSigma(langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 2)), checkruntime.copyHashByte).value, 17, 19, 10, false);
            const sum: bigint = langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 16)), checkruntime.copyHashByte).value, a), langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 7)), checkruntime.copyHashByte).value), b);
            const word: bigint = digestWrap(sum);
            langruntime.pushStruct(words, { value: word }, checkruntime.copyHashByte);
            index = langruntime.checkedAdd(index, 1);
        }
        let a: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(0), checkruntime.copyHashByte).value;
        let b: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(1), checkruntime.copyHashByte).value;
        let c: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(2), checkruntime.copyHashByte).value;
        let d: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(3), checkruntime.copyHashByte).value;
        let e: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(4), checkruntime.copyHashByte).value;
        let f: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(5), checkruntime.copyHashByte).value;
        let g: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(6), checkruntime.copyHashByte).value;
        let h: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(7), checkruntime.copyHashByte).value;
        let round: number = 0;
        while (round < 64) {
            const sigmaE: bigint = digestSigma(e, 6, 11, 25, true);
            const chosen: bigint = digestAnd(e, f);
            const unchosen: bigint = digestAnd(langruntime.checkedI64Subtract(4294967295n, e), g);
            const choice: bigint = checkruntime.hashXor(chosen, unchosen);
            const t1: bigint = digestWrap(langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Add(h, sigmaE), choice), langruntime.indexStatic(digestSha256K, langruntime.checkedIndex(round))), langruntime.indexStruct(words, langruntime.checkedIndex(round), checkruntime.copyHashByte).value));
            const sigmaA: bigint = digestSigma(a, 2, 13, 22, true);
            const ab: bigint = digestAnd(a, b);
            const ac: bigint = digestAnd(a, c);
            const bc: bigint = digestAnd(b, c);
            const majority: bigint = digestXor3(ab, ac, bc);
            const t2: bigint = digestWrap(langruntime.checkedI64Add(sigmaA, majority));
            h = langruntime.checkedI64(g);
            g = langruntime.checkedI64(f);
            f = langruntime.checkedI64(e);
            e = langruntime.checkedI64(digestWrap(langruntime.checkedI64Add(d, t1)));
            d = langruntime.checkedI64(c);
            c = langruntime.checkedI64(b);
            b = langruntime.checkedI64(a);
            a = langruntime.checkedI64(digestWrap(langruntime.checkedI64Add(t1, t2)));
            round = langruntime.checkedAdd(round, 1);
        }
        state[langruntime.checkedIndexIn(state, 0)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(0), checkruntime.copyHashByte).value, a)) });
        state[langruntime.checkedIndexIn(state, 1)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(1), checkruntime.copyHashByte).value, b)) });
        state[langruntime.checkedIndexIn(state, 2)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(2), checkruntime.copyHashByte).value, c)) });
        state[langruntime.checkedIndexIn(state, 3)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(3), checkruntime.copyHashByte).value, d)) });
        state[langruntime.checkedIndexIn(state, 4)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(4), checkruntime.copyHashByte).value, e)) });
        state[langruntime.checkedIndexIn(state, 5)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(5), checkruntime.copyHashByte).value, f)) });
        state[langruntime.checkedIndexIn(state, 6)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(6), checkruntime.copyHashByte).value, g)) });
        state[langruntime.checkedIndexIn(state, 7)] = checkruntime.copyHashByte({ value: digestWrap(langruntime.checkedI64Add(langruntime.indexStruct(state, langruntime.checkedIndex(7), checkruntime.copyHashByte).value, h)) });
    }
    let output: string = "";
    let index: number = 0;
    let count: number = 8;
    if (short) {
        count = langruntime.checkedIndex(7);
    }
    while (index < count) {
        let divisor: bigint = 16777216n;
        let octet: number = 0;
        while (octet < 4) {
            const value: bigint = langruntime.checkedI64Remainder(langruntime.checkedI64Divide(langruntime.indexStruct(state, langruntime.checkedIndex(index), checkruntime.copyHashByte).value, divisor), 256n);
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, Number(BigInt.asIntN(32, langruntime.checkedI64(value)))));
            divisor = langruntime.checkedI64(langruntime.checkedI64Divide(divisor, 256n));
            octet = langruntime.checkedAdd(octet, 1);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return output;
}
function digestSha256(input: checkruntime.ByteaValue, short: boolean): checkruntime.ByteaValue {
    short = langruntime.checkedBool(short);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const result: string = digestSha256Hex(value, short);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function sha224S7oo(input: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return digestSha256(input, true);
}
export function sha25619zu(input: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return digestSha256(input, false);
}
const digestSha512KHigh: ReadonlyArray<bigint> = [1116352408n, 1899447441n, 3049323471n, 3921009573n, 961987163n, 1508970993n, 2453635748n, 2870763221n, 3624381080n, 310598401n, 607225278n, 1426881987n, 1925078388n, 2162078206n, 2614888103n, 3248222580n, 3835390401n, 4022224774n, 264347078n, 604807628n, 770255983n, 1249150122n, 1555081692n, 1996064986n, 2554220882n, 2821834349n, 2952996808n, 3210313671n, 3336571891n, 3584528711n, 113926993n, 338241895n, 666307205n, 773529912n, 1294757372n, 1396182291n, 1695183700n, 1986661051n, 2177026350n, 2456956037n, 2730485921n, 2820302411n, 3259730800n, 3345764771n, 3516065817n, 3600352804n, 4094571909n, 275423344n, 430227734n, 506948616n, 659060556n, 883997877n, 958139571n, 1322822218n, 1537002063n, 1747873779n, 1955562222n, 2024104815n, 2227730452n, 2361852424n, 2428436474n, 2756734187n, 3204031479n, 3329325298n, 3391569614n, 3515267271n, 3940187606n, 4118630271n, 116418474n, 174292421n, 289380356n, 460393269n, 685471733n, 852142971n, 1017036298n, 1126000580n, 1288033470n, 1501505948n, 1607167915n, 1816402316n];
const digestSha512KLow: ReadonlyArray<bigint> = [3609767458n, 602891725n, 3964484399n, 2173295548n, 4081628472n, 3053834265n, 2937671579n, 3664609560n, 2734883394n, 1164996542n, 1323610764n, 3590304994n, 4068182383n, 991336113n, 633803317n, 3479774868n, 2666613458n, 944711139n, 2341262773n, 2007800933n, 1495990901n, 1856431235n, 3175218132n, 2198950837n, 3999719339n, 766784016n, 2566594879n, 3203337956n, 1034457026n, 2466948901n, 3758326383n, 168717936n, 1188179964n, 1546045734n, 1522805485n, 2643833823n, 2343527390n, 1014477480n, 1206759142n, 344077627n, 1290863460n, 3158454273n, 3505952657n, 106217008n, 3606008344n, 1432725776n, 1467031594n, 851169720n, 3100823752n, 1363258195n, 3750685593n, 3785050280n, 3318307427n, 3812723403n, 2003034995n, 3602036899n, 1575990012n, 1125592928n, 2716904306n, 442776044n, 593698344n, 3733110249n, 2999351573n, 3815920427n, 3928383900n, 566280711n, 3454069534n, 4000239992n, 1914138554n, 2731055270n, 3203993006n, 320620315n, 587496836n, 1086792851n, 365543100n, 2618297676n, 3409855158n, 4234509866n, 987167468n, 1246189591n];
const digestSha384InitialHigh: ReadonlyArray<bigint> = [3418070365n, 1654270250n, 2438529370n, 355462360n, 1731405415n, 2394180231n, 3675008525n, 1203062813n];
const digestSha384InitialLow: ReadonlyArray<bigint> = [3238371032n, 914150663n, 812702999n, 4144912697n, 4290775857n, 1750603025n, 1694076839n, 3204075428n];
const digestSha512InitialHigh: ReadonlyArray<bigint> = [1779033703n, 3144134277n, 1013904242n, 2773480762n, 1359893119n, 2600822924n, 528734635n, 1541459225n];
const digestSha512InitialLow: ReadonlyArray<bigint> = [4089235720n, 2227873595n, 4271175723n, 1595750129n, 2917565137n, 725511199n, 4215389547n, 327033209n];
interface DigestWord {
    high: bigint;
    low: bigint;
}
function copyDigestWord(value: DigestWord): DigestWord {
    return { high: langruntime.checkedI64(value.high), low: langruntime.checkedI64(value.low) };
}
function equalDigestWord(left: DigestWord, right: DigestWord): boolean {
    return left.high === right.high && left.low === right.low;
}
function digestWideAdd(left: DigestWord, right: DigestWord): DigestWord {
    left = copyDigestWord(left);
    right = copyDigestWord(right);
    const sum: bigint = langruntime.checkedI64Add(left.low, right.low);
    const low: bigint = digestWrap(sum);
    const high: bigint = digestWrap(langruntime.checkedI64Add(langruntime.checkedI64Add(left.high, right.high), langruntime.checkedI64Divide(sum, 4294967296n)));
    return { high: high, low: low };
}
function digestWideAnd(left: DigestWord, right: DigestWord): DigestWord {
    left = copyDigestWord(left);
    right = copyDigestWord(right);
    const high: bigint = digestAnd(left.high, right.high);
    const low: bigint = digestAnd(left.low, right.low);
    return { high: high, low: low };
}
function digestWideXor(left: DigestWord, right: DigestWord): DigestWord {
    left = copyDigestWord(left);
    right = copyDigestWord(right);
    const high: bigint = checkruntime.hashXor(left.high, right.high);
    const low: bigint = checkruntime.hashXor(left.low, right.low);
    return { high: high, low: low };
}
function digestWideNot(value: DigestWord): DigestWord {
    value = copyDigestWord(value);
    return { high: langruntime.checkedI64Subtract(4294967295n, value.high), low: langruntime.checkedI64Subtract(4294967295n, value.low) };
}
function digestWideRight(value: DigestWord, bits: number, rotate: boolean): DigestWord {
    value = copyDigestWord(value);
    bits = langruntime.checkedI32(bits);
    rotate = langruntime.checkedBool(rotate);
    let remaining: number = bits;
    let high: bigint = value.high;
    let low: bigint = value.low;
    if (remaining >= 32) {
        low = langruntime.checkedI64(value.high);
        high = langruntime.checkedI64(0n);
        if (rotate) {
            high = langruntime.checkedI64(value.low);
        }
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 32));
    }
    if (remaining === 0) {
        return { high: high, low: low };
    }
    let divisor: bigint = 1n;
    while (remaining > 0) {
        divisor = langruntime.checkedI64(langruntime.checkedI64Multiply(divisor, 2n));
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
    }
    const multiplier: bigint = langruntime.checkedI64Divide(4294967296n, divisor);
    const shiftedLow: bigint = langruntime.checkedI64Add(langruntime.checkedI64Divide(low, divisor), langruntime.checkedI64Multiply(langruntime.checkedI64Remainder(high, divisor), multiplier));
    let shiftedHigh: bigint = langruntime.checkedI64Divide(high, divisor);
    if (rotate) {
        shiftedHigh = langruntime.checkedI64(langruntime.checkedI64Add(shiftedHigh, langruntime.checkedI64Multiply(langruntime.checkedI64Remainder(low, divisor), multiplier)));
    }
    return { high: shiftedHigh, low: shiftedLow };
}
function digestWideSigma(value: DigestWord, first: number, second: number, last: number, rotateLast: boolean): DigestWord {
    value = copyDigestWord(value);
    first = langruntime.checkedI32(first);
    second = langruntime.checkedI32(second);
    last = langruntime.checkedI32(last);
    rotateLast = langruntime.checkedBool(rotateLast);
    const a: DigestWord = copyDigestWord(digestWideRight(value, first, true));
    const b: DigestWord = copyDigestWord(digestWideRight(value, second, true));
    const c: DigestWord = copyDigestWord(digestWideRight(value, last, rotateLast));
    const pair: DigestWord = copyDigestWord(digestWideXor(a, b));
    return digestWideXor(pair, c);
}
function digestSha512Hex(input: string, short: boolean): string {
    input = langruntime.checkedString(input);
    short = langruntime.checkedBool(short);
    let state: DigestWord[] = [];
    let initial: number = 0;
    while (initial < 8) {
        let high: bigint = langruntime.indexStatic(digestSha512InitialHigh, langruntime.checkedIndex(initial));
        let low: bigint = langruntime.indexStatic(digestSha512InitialLow, langruntime.checkedIndex(initial));
        if (short) {
            high = langruntime.checkedI64(langruntime.indexStatic(digestSha384InitialHigh, langruntime.checkedIndex(initial)));
            low = langruntime.checkedI64(langruntime.indexStatic(digestSha384InitialLow, langruntime.checkedIndex(initial)));
        }
        langruntime.pushStruct(state, { high: high, low: low }, copyDigestWord);
        initial = langruntime.checkedAdd(initial, 1);
    }
    const bytes: checkruntime.HashByte[] = digestPadding(input, true, false);
    let offset: number = 0;
    while (offset < bytes.length) {
        let words: DigestWord[] = [];
        let index: number = 0;
        while (index < 16) {
            let high: bigint = 0n;
            let low: bigint = 0n;
            let octet: number = 0;
            while (octet < 4) {
                high = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(high, 256n), langruntime.indexStruct(bytes, langruntime.checkedIndex(offset), checkruntime.copyHashByte).value));
                offset = langruntime.checkedAdd(offset, 1);
                octet = langruntime.checkedAdd(octet, 1);
            }
            octet = langruntime.checkedIndex(0);
            while (octet < 4) {
                low = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(low, 256n), langruntime.indexStruct(bytes, langruntime.checkedIndex(offset), checkruntime.copyHashByte).value));
                offset = langruntime.checkedAdd(offset, 1);
                octet = langruntime.checkedAdd(octet, 1);
            }
            langruntime.pushStruct(words, { high: high, low: low }, copyDigestWord);
            index = langruntime.checkedAdd(index, 1);
        }
        while (index < 80) {
            const a: DigestWord = copyDigestWord(digestWideSigma(langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 15)), copyDigestWord), 1, 8, 7, false));
            const b: DigestWord = copyDigestWord(digestWideSigma(langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 2)), copyDigestWord), 19, 61, 6, false));
            const first: DigestWord = copyDigestWord(digestWideAdd(langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 16)), copyDigestWord), a));
            const second: DigestWord = copyDigestWord(digestWideAdd(langruntime.indexStruct(words, langruntime.checkedIndex(langruntime.checkedSubtract(index, 7)), copyDigestWord), b));
            const word: DigestWord = copyDigestWord(digestWideAdd(first, second));
            langruntime.pushStruct(words, word, copyDigestWord);
            index = langruntime.checkedAdd(index, 1);
        }
        let working: DigestWord[] = [];
        let copied: number = 0;
        while (copied < 8) {
            langruntime.pushStruct(working, langruntime.indexStruct(state, langruntime.checkedIndex(copied), copyDigestWord), copyDigestWord);
            copied = langruntime.checkedAdd(copied, 1);
        }
        let round: number = 0;
        while (round < 80) {
            const a: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(0), copyDigestWord));
            const b: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(1), copyDigestWord));
            const c: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(2), copyDigestWord));
            const d: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(3), copyDigestWord));
            const e: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(4), copyDigestWord));
            const f: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(5), copyDigestWord));
            const g: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(6), copyDigestWord));
            const h: DigestWord = copyDigestWord(langruntime.indexStruct(working, langruntime.checkedIndex(7), copyDigestWord));
            const sigmaE: DigestWord = copyDigestWord(digestWideSigma(e, 14, 18, 41, true));
            const chosen: DigestWord = copyDigestWord(digestWideAnd(e, f));
            const opposite: DigestWord = copyDigestWord(digestWideNot(e));
            const unchosen: DigestWord = copyDigestWord(digestWideAnd(opposite, g));
            const choice: DigestWord = copyDigestWord(digestWideXor(chosen, unchosen));
            const constant: DigestWord = copyDigestWord({ high: langruntime.indexStatic(digestSha512KHigh, langruntime.checkedIndex(round)), low: langruntime.indexStatic(digestSha512KLow, langruntime.checkedIndex(round)) });
            const first: DigestWord = copyDigestWord(digestWideAdd(h, sigmaE));
            const second: DigestWord = copyDigestWord(digestWideAdd(choice, constant));
            const combined: DigestWord = copyDigestWord(digestWideAdd(first, second));
            const t1: DigestWord = copyDigestWord(digestWideAdd(combined, langruntime.indexStruct(words, langruntime.checkedIndex(round), copyDigestWord)));
            const sigmaA: DigestWord = copyDigestWord(digestWideSigma(a, 28, 34, 39, true));
            const ab: DigestWord = copyDigestWord(digestWideAnd(a, b));
            const ac: DigestWord = copyDigestWord(digestWideAnd(a, c));
            const bc: DigestWord = copyDigestWord(digestWideAnd(b, c));
            const pair: DigestWord = copyDigestWord(digestWideXor(ab, ac));
            const majority: DigestWord = copyDigestWord(digestWideXor(pair, bc));
            const t2: DigestWord = copyDigestWord(digestWideAdd(sigmaA, majority));
            working[langruntime.checkedIndexIn(working, 7)] = copyDigestWord(g);
            working[langruntime.checkedIndexIn(working, 6)] = copyDigestWord(f);
            working[langruntime.checkedIndexIn(working, 5)] = copyDigestWord(e);
            working[langruntime.checkedIndexIn(working, 4)] = copyDigestWord(digestWideAdd(d, t1));
            working[langruntime.checkedIndexIn(working, 3)] = copyDigestWord(c);
            working[langruntime.checkedIndexIn(working, 2)] = copyDigestWord(b);
            working[langruntime.checkedIndexIn(working, 1)] = copyDigestWord(a);
            working[langruntime.checkedIndexIn(working, 0)] = copyDigestWord(digestWideAdd(t1, t2));
            round = langruntime.checkedAdd(round, 1);
        }
        let merged: number = 0;
        while (merged < 8) {
            state[langruntime.checkedIndexIn(state, merged)] = copyDigestWord(digestWideAdd(langruntime.indexStruct(state, langruntime.checkedIndex(merged), copyDigestWord), langruntime.indexStruct(working, langruntime.checkedIndex(merged), copyDigestWord)));
            merged = langruntime.checkedAdd(merged, 1);
        }
    }
    let output: string = "";
    let index: number = 0;
    let count: number = 8;
    if (short) {
        count = langruntime.checkedIndex(6);
    }
    while (index < count) {
        let half: number = 0;
        while (half < 2) {
            let value: bigint = langruntime.indexStruct(state, langruntime.checkedIndex(index), copyDigestWord).high;
            if (half === 1) {
                value = langruntime.checkedI64(langruntime.indexStruct(state, langruntime.checkedIndex(index), copyDigestWord).low);
            }
            let divisor: bigint = 16777216n;
            let octet: number = 0;
            while (octet < 4) {
                const byte: bigint = langruntime.checkedI64Remainder(langruntime.checkedI64Divide(value, divisor), 256n);
                output = langruntime.checkedString(checkruntime.byteaAppendByte(output, Number(BigInt.asIntN(32, langruntime.checkedI64(byte)))));
                divisor = langruntime.checkedI64(langruntime.checkedI64Divide(divisor, 256n));
                octet = langruntime.checkedAdd(octet, 1);
            }
            half = langruntime.checkedAdd(half, 1);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return output;
}
function digestSha512(input: checkruntime.ByteaValue, short: boolean): checkruntime.ByteaValue {
    short = langruntime.checkedBool(short);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const result: string = digestSha512Hex(value, short);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function sha38441g6(input: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return digestSha512(input, true);
}
export function sha512Si49(input: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return digestSha512(input, false);
}
const byteaSubstringError = 3452581;
function byteaSubstring(input: checkruntime.ByteaValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value, hasLength: boolean): checkruntime.ByteaValue {
    hasLength = langruntime.checkedBool(hasLength);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const start: number = langruntime.checkedI32(position.value);
            if (length.kind === "Value") {
                const count: number = langruntime.checkedI32(length.value);
                if (hasLength && count < 0) {
                    return { kind: "Error", value: checkruntime.makeSqlError(byteaSubstringError) };
                }
                const byteLength: number = byteaPayloadLength(value);
                let first: number = start;
                if (first < 1) {
                    first = langruntime.checkedI32(1);
                }
                let end: number = langruntime.checkedSignedAdd(byteLength, 1);
                if (hasLength && start <= langruntime.checkedSignedSubtract(2147483647, count)) {
                    end = langruntime.checkedI32(langruntime.checkedSignedAdd(start, count));
                    if (end > langruntime.checkedSignedAdd(byteLength, 1)) {
                        end = langruntime.checkedI32(langruntime.checkedSignedAdd(byteLength, 1));
                    }
                }
                let output: string = "";
                if (first > byteLength || end <= first) {
                    return { kind: "Value", value: output };
                }
                const chars: string[] = Array.from(value);
                let index: number = 0;
                let current: number = 1;
                while (index < chars.length && current < end) {
                    if (current >= first) {
                        output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                        output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1))));
                    }
                    index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
                    current = langruntime.checkedI32(langruntime.checkedSignedAdd(current, 1));
                }
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
export function substring2f07(input: checkruntime.ByteaValue, position: checkruntime.Int4Value): checkruntime.ByteaValue {
    return byteaSubstring(input, position, { kind: "Value", value: 0 }, false);
}
export function substringB44k(input: checkruntime.ByteaValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value): checkruntime.ByteaValue {
    return byteaSubstring(input, position, length, true);
}
export function substrXbdy(input: checkruntime.ByteaValue, position: checkruntime.Int4Value): checkruntime.ByteaValue {
    return byteaSubstring(input, position, { kind: "Value", value: 0 }, false);
}
export function substrJkup(input: checkruntime.ByteaValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value): checkruntime.ByteaValue {
    return byteaSubstring(input, position, length, true);
}
function byteaTrim(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue, trimLeft: boolean, trimRight: boolean): checkruntime.ByteaValue {
    trimLeft = langruntime.checkedBool(trimLeft);
    trimRight = langruntime.checkedBool(trimRight);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (pattern.kind === "Error") {
        const error: checkruntime.SqlError = pattern.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Unknown" }) || checkruntime.equalByteaValue(pattern, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalByteaValue(input, { kind: "Null" }) || checkruntime.equalByteaValue(pattern, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (pattern.kind === "Value") {
            const set: string = langruntime.checkedString(pattern.value);
            const chars: string[] = Array.from(value);
            const patternChars: string[] = Array.from(set);
            let first: number = 0;
            let last: number = chars.length;
            while (trimLeft && first < last) {
                let index: number = 0;
                let matches: boolean = false;
                while (index < patternChars.length && matches === false) {
                    if (langruntime.indexChar(chars, langruntime.checkedIndex(first)) === langruntime.indexChar(patternChars, langruntime.checkedIndex(index)) && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedAdd(first, 1))) === langruntime.indexChar(patternChars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)))) {
                        matches = langruntime.checkedBool(true);
                    }
                    index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
                }
                if (matches === false) {
                    break;
                }
                first = langruntime.checkedIndex(langruntime.checkedAdd(first, 2));
            }
            while (trimRight && first < last) {
                let index: number = 0;
                let matches: boolean = false;
                while (index < patternChars.length && matches === false) {
                    if (langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(last, 2))) === langruntime.indexChar(patternChars, langruntime.checkedIndex(index)) && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(last, 1))) === langruntime.indexChar(patternChars, langruntime.checkedIndex(langruntime.checkedAdd(index, 1)))) {
                        matches = langruntime.checkedBool(true);
                    }
                    index = langruntime.checkedIndex(langruntime.checkedAdd(index, 2));
                }
                if (matches === false) {
                    break;
                }
                last = langruntime.checkedIndex(langruntime.checkedSubtract(last, 2));
            }
            let output: string = "";
            let index: number = first;
            while (index < last) {
                output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                index = langruntime.checkedAdd(index, 1);
            }
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
export function btrimRiux(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return byteaTrim(input, pattern, true, true);
}
export function ltrimP5mp(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return byteaTrim(input, pattern, true, false);
}
export function rtrim33rv(input: checkruntime.ByteaValue, pattern: checkruntime.ByteaValue): checkruntime.ByteaValue {
    return byteaTrim(input, pattern, false, true);
}
function byteaUtf8Character(output: string, character: string): string {
    output = langruntime.checkedString(output);
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    let result: string = output;
    if (code < 128) {
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, code));
    }
    else if (code < 2048) {
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(192, langruntime.checkedSignedDivide(code, 64))));
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(128, langruntime.checkedSignedRemainder(code, 64))));
    }
    else if (code < 65536) {
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(224, langruntime.checkedSignedDivide(code, 4096))));
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(128, langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(code, 64), 64))));
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(128, langruntime.checkedSignedRemainder(code, 64))));
    }
    else {
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(240, langruntime.checkedSignedDivide(code, 262144))));
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(128, langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(code, 4096), 64))));
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(128, langruntime.checkedSignedRemainder(langruntime.checkedSignedDivide(code, 64), 64))));
        result = langruntime.checkedString(checkruntime.byteaAppendByte(result, langruntime.checkedSignedAdd(128, langruntime.checkedSignedRemainder(code, 64))));
    }
    return result;
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
export function textVc4r(input: checkruntime.TextValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        let end: number = chars.length;
        while (end > 0 && langruntime.indexChar(chars, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === " ") {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
        let output: string = "";
        let index: number = 0;
        while (index < end) {
            output = output + langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
const chrInvalidParameter = 3452619;
const chrProgramLimit = 8584704;
export function chr23bn(input: checkruntime.Int4Value): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        if (value < 0) {
            return { kind: "Error", value: checkruntime.makeSqlError(chrInvalidParameter) };
        }
        if (value === 0 || value > 1114111 || (value >= 55296 && value <= 57343)) {
            return { kind: "Error", value: checkruntime.makeSqlError(chrProgramLimit) };
        }
        const character: string = langruntime.characterFromI32(value, "\0");
        let output: string = "";
        output = output + langruntime.checkedChar(character);
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function makeDateZ9pv(year: checkruntime.Int4Value, month: checkruntime.Int4Value, day: checkruntime.Int4Value): checkruntime.DateValue {
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
interface IntegerBits {
    high: bigint;
    low: bigint;
}
function copyIntegerBits(value: IntegerBits): IntegerBits {
    return { high: langruntime.checkedI64(value.high), low: langruntime.checkedI64(value.low) };
}
function integerBitsFromValue(value: bigint): IntegerBits {
    value = langruntime.checkedI64(value);
    const lower: number = Number(BigInt.asIntN(32, langruntime.checkedI64(value)));
    let low: bigint = BigInt(langruntime.checkedI32(lower));
    if (low < 0n) {
        low = langruntime.checkedI64(langruntime.checkedI64Add(low, 4294967296n));
    }
    let high: bigint = langruntime.checkedI64Divide(value, 4294967296n);
    if (value < 0n && !(langruntime.checkedI64Remainder(value, 4294967296n) === 0n)) {
        high = langruntime.checkedI64(langruntime.checkedI64Subtract(high, 1n));
    }
    if (high < 0n) {
        high = langruntime.checkedI64(langruntime.checkedI64Add(high, 4294967296n));
    }
    return { high: high, low: low };
}
function integerBitsValue(bits: IntegerBits): bigint {
    bits = copyIntegerBits(bits);
    let high: bigint = bits.high;
    if (high >= 2147483648n) {
        high = langruntime.checkedI64(langruntime.checkedI64Subtract(high, 4294967296n));
    }
    return langruntime.checkedI64Add(langruntime.checkedI64Multiply(high, 4294967296n), bits.low);
}
function integerBitsCombine(left: bigint, right: bigint, operation: number): bigint {
    left = langruntime.checkedI64(left);
    right = langruntime.checkedI64(right);
    operation = langruntime.checkedI32(operation);
    const xor: bigint = checkruntime.hashXor(left, right);
    if (operation === 2) {
        return xor;
    }
    const both: bigint = langruntime.checkedI64Divide((langruntime.checkedI64Subtract(langruntime.checkedI64Add(left, right), xor)), 2n);
    if (operation === 0) {
        return both;
    }
    return langruntime.checkedI64Subtract(langruntime.checkedI64Add(left, right), both);
}
function integerBitwise(left: checkruntime.Int8Value, right: checkruntime.Int8Value, operation: number): checkruntime.Int8Value {
    operation = langruntime.checkedI32(operation);
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
        const first: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const second: bigint = langruntime.checkedI64(right.value);
            const a: IntegerBits = copyIntegerBits(integerBitsFromValue(first));
            const b: IntegerBits = copyIntegerBits(integerBitsFromValue(second));
            const high: bigint = integerBitsCombine(a.high, b.high, operation);
            const low: bigint = integerBitsCombine(a.low, b.low, operation);
            return { kind: "Value", value: integerBitsValue({ high: high, low: low }) };
        }
    }
    return { kind: "Unknown" };
}
function integerComplement(input: checkruntime.Int8Value): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: langruntime.checkedI64Subtract(-1n, value) };
    }
    return { kind: "Unknown" };
}
function integerShift(input: checkruntime.Int8Value, amount: checkruntime.Int4Value, width: number, left: boolean): checkruntime.Int8Value {
    width = langruntime.checkedI32(width);
    left = langruntime.checkedBool(left);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (amount.kind === "Error") {
        const error: checkruntime.SqlError = amount.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(amount, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" }) || checkruntime.equalInt4Value(amount, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        if (amount.kind === "Value") {
            const distance: number = langruntime.checkedI32(amount.value);
            const bits: IntegerBits = copyIntegerBits(integerBitsFromValue(value));
            let high: bigint = bits.high;
            let low: bigint = bits.low;
            let remaining: number = langruntime.checkedSignedRemainder(distance, width);
            if (remaining < 0) {
                remaining = langruntime.checkedI32(langruntime.checkedSignedAdd(remaining, width));
            }
            while (remaining > 0) {
                if (left) {
                    const carry: bigint = langruntime.checkedI64Divide(low, 2147483648n);
                    low = langruntime.checkedI64(langruntime.checkedI64Remainder(langruntime.checkedI64Multiply(low, 2n), 4294967296n));
                    high = langruntime.checkedI64(langruntime.checkedI64Remainder((langruntime.checkedI64Add(langruntime.checkedI64Multiply(high, 2n), carry)), 4294967296n));
                }
                else {
                    const carry: bigint = langruntime.checkedI64Remainder(high, 2n);
                    low = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Divide(low, 2n), langruntime.checkedI64Multiply(carry, 2147483648n)));
                    let sign: bigint = 0n;
                    if (high >= 2147483648n) {
                        sign = langruntime.checkedI64(2147483648n);
                    }
                    high = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Divide(high, 2n), sign));
                }
                remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
            }
            return { kind: "Value", value: integerBitsValue({ high: high, low: low }) };
        }
    }
    return { kind: "Unknown" };
}
function integerBitsInt4(input: checkruntime.Int8Value): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(value))) };
    }
    return { kind: "Unknown" };
}
function integerBitsInt2(input: checkruntime.Int8Value): checkruntime.Int2Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        let remainder: bigint = langruntime.checkedI64Remainder(value, 65536n);
        if (remainder < 0n) {
            remainder = langruntime.checkedI64(langruntime.checkedI64Add(remainder, 65536n));
        }
        if (remainder >= 32768n) {
            remainder = langruntime.checkedI64(langruntime.checkedI64Subtract(remainder, 65536n));
        }
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(remainder))) };
    }
    return { kind: "Unknown" };
}
export function int2andEtfs(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    const first: checkruntime.Int8Value = int8Sxtp(left);
    const second: checkruntime.Int8Value = int8Sxtp(right);
    const result: checkruntime.Int8Value = integerBitwise(first, second, 0);
    return integerBitsInt2(result);
}
export function int2orIy76(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    const first: checkruntime.Int8Value = int8Sxtp(left);
    const second: checkruntime.Int8Value = int8Sxtp(right);
    const result: checkruntime.Int8Value = integerBitwise(first, second, 1);
    return integerBitsInt2(result);
}
export function int2xorT18e(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    const first: checkruntime.Int8Value = int8Sxtp(left);
    const second: checkruntime.Int8Value = int8Sxtp(right);
    const result: checkruntime.Int8Value = integerBitwise(first, second, 2);
    return integerBitsInt2(result);
}
export function int2notN5dv(input: checkruntime.Int2Value): checkruntime.Int2Value {
    const widened: checkruntime.Int8Value = int8Sxtp(input);
    const result: checkruntime.Int8Value = integerComplement(widened);
    return integerBitsInt2(result);
}
export function int2shl0kk0(input: checkruntime.Int2Value, amount: checkruntime.Int4Value): checkruntime.Int2Value {
    const widened: checkruntime.Int8Value = int8Sxtp(input);
    const result: checkruntime.Int8Value = integerShift(widened, amount, 32, true);
    return integerBitsInt2(result);
}
export function int2shrSejt(input: checkruntime.Int2Value, amount: checkruntime.Int4Value): checkruntime.Int2Value {
    const widened: checkruntime.Int8Value = int8Sxtp(input);
    const result: checkruntime.Int8Value = integerShift(widened, amount, 32, false);
    return integerBitsInt2(result);
}
export function int4andJkbd(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const first: checkruntime.Int8Value = int8Mzac(left);
    const second: checkruntime.Int8Value = int8Mzac(right);
    const result: checkruntime.Int8Value = integerBitwise(first, second, 0);
    return integerBitsInt4(result);
}
export function int4orBxn6(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const first: checkruntime.Int8Value = int8Mzac(left);
    const second: checkruntime.Int8Value = int8Mzac(right);
    const result: checkruntime.Int8Value = integerBitwise(first, second, 1);
    return integerBitsInt4(result);
}
export function int4xor6j8h(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const first: checkruntime.Int8Value = int8Mzac(left);
    const second: checkruntime.Int8Value = int8Mzac(right);
    const result: checkruntime.Int8Value = integerBitwise(first, second, 2);
    return integerBitsInt4(result);
}
export function int4notVcqn(input: checkruntime.Int4Value): checkruntime.Int4Value {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    const result: checkruntime.Int8Value = integerComplement(widened);
    return integerBitsInt4(result);
}
export function int4shl31iu(input: checkruntime.Int4Value, amount: checkruntime.Int4Value): checkruntime.Int4Value {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    const result: checkruntime.Int8Value = integerShift(widened, amount, 32, true);
    return integerBitsInt4(result);
}
export function int4shr3uh0(input: checkruntime.Int4Value, amount: checkruntime.Int4Value): checkruntime.Int4Value {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    const result: checkruntime.Int8Value = integerShift(widened, amount, 32, false);
    return integerBitsInt4(result);
}
export function int8andEa1e(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const first: checkruntime.Int8Value = left;
    const second: checkruntime.Int8Value = right;
    const result: checkruntime.Int8Value = integerBitwise(first, second, 0);
    return result;
}
export function int8or37oj(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const first: checkruntime.Int8Value = left;
    const second: checkruntime.Int8Value = right;
    const result: checkruntime.Int8Value = integerBitwise(first, second, 1);
    return result;
}
export function int8xor4v56(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    const first: checkruntime.Int8Value = left;
    const second: checkruntime.Int8Value = right;
    const result: checkruntime.Int8Value = integerBitwise(first, second, 2);
    return result;
}
export function int8not62wp(input: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = input;
    const result: checkruntime.Int8Value = integerComplement(widened);
    return result;
}
export function int8shlZi4n(input: checkruntime.Int8Value, amount: checkruntime.Int4Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = input;
    const result: checkruntime.Int8Value = integerShift(widened, amount, 64, true);
    return result;
}
export function int8shrXhle(input: checkruntime.Int8Value, amount: checkruntime.Int4Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = input;
    const result: checkruntime.Int8Value = integerShift(widened, amount, 64, false);
    return result;
}
export function int41z1k(input: checkruntime.Int2Value): checkruntime.Int4Value {
    return checkruntime.int2ToInt4(input);
}
export function int8Sxtp(input: checkruntime.Int2Value): checkruntime.Int8Value {
    return checkruntime.int2ToInt8(input);
}
export function int215a3(input: checkruntime.Int4Value): checkruntime.Int2Value {
    return smallintResult(input);
}
export function int8Mzac(input: checkruntime.Int4Value): checkruntime.Int8Value {
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
function integerBaseText(input: checkruntime.Int8Value, fullWidth: boolean, radix: bigint): checkruntime.TextValue {
    fullWidth = langruntime.checkedBool(fullWidth);
    radix = langruntime.checkedI64(radix);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        const bits: IntegerBits = copyIntegerBits(integerBitsFromValue(value));
        let high: bigint = bits.high;
        let low: bigint = bits.low;
        if (fullWidth === false) {
            high = langruntime.checkedI64(0n);
        }
        const alphabet: string[] = Array.from("0123456789abcdef");
        let digits: string[] = [];
        if (high === 0n && low === 0n) {
            return { kind: "Value", value: "0" };
        }
        while (!(high === 0n) || !(low === 0n)) {
            let number: bigint = langruntime.checkedI64Remainder(low, radix);
            let index: number = 0;
            while (number > 0n) {
                index = langruntime.checkedAdd(index, 1);
                number = langruntime.checkedI64(langruntime.checkedI64Subtract(number, 1n));
            }
            langruntime.pushChar(digits, langruntime.indexChar(alphabet, langruntime.checkedIndex(index)));
            const carry: bigint = langruntime.checkedI64Remainder(high, radix);
            low = langruntime.checkedI64(langruntime.checkedI64Divide((langruntime.checkedI64Add(langruntime.checkedI64Multiply(carry, 4294967296n), low)), radix));
            high = langruntime.checkedI64(langruntime.checkedI64Divide(high, radix));
        }
        let output: string = "";
        let remaining: number = digits.length;
        while (remaining > 0) {
            remaining = langruntime.checkedIndex(langruntime.checkedSubtract(remaining, 1));
            output = output + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(remaining)));
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function toBinW0oh(input: checkruntime.Int8Value): checkruntime.TextValue {
    const widened: checkruntime.Int8Value = input;
    return integerBaseText(widened, true, 2n);
}
export function toBinYzqy(input: checkruntime.Int4Value): checkruntime.TextValue {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    return integerBaseText(widened, false, 2n);
}
export function toOct1exr(input: checkruntime.Int8Value): checkruntime.TextValue {
    const widened: checkruntime.Int8Value = input;
    return integerBaseText(widened, true, 8n);
}
export function toOct7a24(input: checkruntime.Int4Value): checkruntime.TextValue {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    return integerBaseText(widened, false, 8n);
}
export function toHexKz7h(input: checkruntime.Int8Value): checkruntime.TextValue {
    const widened: checkruntime.Int8Value = input;
    return integerBaseText(widened, true, 16n);
}
export function toHexP0fx(input: checkruntime.Int4Value): checkruntime.TextValue {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    return integerBaseText(widened, false, 16n);
}
function integerHashFold(value: bigint): bigint {
    value = langruntime.checkedI64(value);
    const lower: number = Number(BigInt.asIntN(32, langruntime.checkedI64(value)));
    let low: bigint = BigInt(langruntime.checkedI32(lower));
    if (low < 0n) {
        low = langruntime.checkedI64(langruntime.checkedI64Add(low, 4294967296n));
    }
    let high: bigint = langruntime.checkedI64Divide(value, 4294967296n);
    if (value < 0n && !(langruntime.checkedI64Remainder(value, 4294967296n) === 0n)) {
        high = langruntime.checkedI64(langruntime.checkedI64Subtract(high, 1n));
    }
    if (high < 0n) {
        high = langruntime.checkedI64(langruntime.checkedI64Add(high, 4294967296n));
    }
    if (value < 0n) {
        high = langruntime.checkedI64(langruntime.checkedI64Subtract(4294967295n, high));
    }
    return checkruntime.hashXor(low, high);
}
function integerHashExtended(input: checkruntime.Int8Value, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (seed.kind === "Error") {
        const error: checkruntime.SqlError = seed.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" }) || checkruntime.equalInt8Value(seed, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" }) || checkruntime.equalInt8Value(seed, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        if (seed.kind === "Value") {
            const initial: bigint = langruntime.checkedI64(seed.value);
            let folded: bigint = integerHashFold(value);
            let bytes: checkruntime.HashByte[] = [];
            let count: number = 0;
            while (count < 4) {
                const byte: bigint = langruntime.checkedI64Remainder(folded, 256n);
                langruntime.pushStruct(bytes, { value: byte }, checkruntime.copyHashByte);
                folded = langruntime.checkedI64(langruntime.checkedI64Divide(folded, 256n));
                count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
            }
            return { kind: "Value", value: checkruntime.hashBytes64(bytes, initial) };
        }
    }
    return { kind: "Unknown" };
}
function integerHash(input: checkruntime.Int8Value): checkruntime.Int4Value {
    const result: checkruntime.Int8Value = integerHashExtended(input, { kind: "Value", value: 0n });
    if (result.kind === "Error") {
        const error: checkruntime.SqlError = result.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(result, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(result, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (result.kind === "Value") {
        const value: bigint = langruntime.checkedI64(result.value);
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(value))) };
    }
    return { kind: "Unknown" };
}
export function hashint2076p(input: checkruntime.Int2Value): checkruntime.Int4Value {
    const widened: checkruntime.Int8Value = int8Sxtp(input);
    return integerHash(widened);
}
export function hashint2extendedU33n(input: checkruntime.Int2Value, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Sxtp(input);
    return integerHashExtended(widened, seed);
}
export function hashint4Zr00(input: checkruntime.Int4Value): checkruntime.Int4Value {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    return integerHash(widened);
}
export function hashint4extendedXf6v(input: checkruntime.Int4Value, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(input);
    return integerHashExtended(widened, seed);
}
export function hashint83wid(input: checkruntime.Int8Value): checkruntime.Int4Value {
    const widened: checkruntime.Int8Value = input;
    return integerHash(widened);
}
export function hashint8extendedFrvh(input: checkruntime.Int8Value, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = input;
    return integerHashExtended(widened, seed);
}
export function hashbool82il(input: checkruntime.BoolValue): checkruntime.Int4Value {
    const widened: checkruntime.Int8Value = int8Mzac(int4I3jf(input));
    return integerHash(widened);
}
export function hashboolextendedHsk8(input: checkruntime.BoolValue, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    const widened: checkruntime.Int8Value = int8Mzac(int4I3jf(input));
    return integerHashExtended(widened, seed);
}
export function gistTranslateCmptypeCommonAi1r(input: checkruntime.Int4Value): checkruntime.Int2Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        if (value === 1) {
            return { kind: "Value", value: 20 };
        }
        if (value === 2) {
            return { kind: "Value", value: 21 };
        }
        if (value === 3) {
            return { kind: "Value", value: 18 };
        }
        if (value === 4) {
            return { kind: "Value", value: 23 };
        }
        if (value === 5) {
            return { kind: "Value", value: 22 };
        }
        if (value === 7) {
            return { kind: "Value", value: 3 };
        }
        if (value === 8) {
            return { kind: "Value", value: 8 };
        }
        return { kind: "Value", value: 0 };
    }
    return { kind: "Unknown" };
}
export function pgEncodingMaxLengthAj1r(input: checkruntime.Int4Value): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        if (value < 0 || value >= 42) {
            return { kind: "Null" };
        }
        if (value === 4 || value === 6 || value === 7 || value === 39) {
            return { kind: "Value", value: 4 };
        }
        if (value === 1 || value === 2 || value === 3 || value === 5 || value === 40) {
            return { kind: "Value", value: 3 };
        }
        if (value >= 35) {
            return { kind: "Value", value: 2 };
        }
        return { kind: "Value", value: 1 };
    }
    return { kind: "Unknown" };
}
const integerSizeUnits: ReadonlyArray<string> = ["bytes", "kB", "MB", "GB", "TB", "PB"];
export function pgSizePretty24qt(input: checkruntime.Int8Value): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        let amount: bigint = value;
        let unit: number = 0;
        if (amount <= -10240n || amount >= 10240n) {
            amount = langruntime.checkedI64(langruntime.checkedI64Divide(amount, 512n));
            unit = langruntime.checkedIndex(1);
            while (unit < 5 && (amount <= -20479n || amount >= 20479n)) {
                amount = langruntime.checkedI64(langruntime.checkedI64Divide(amount, 1024n));
                unit = langruntime.checkedAdd(unit, 1);
            }
            if (amount < 0n) {
                amount = langruntime.checkedI64(langruntime.checkedI64Divide((langruntime.checkedI64Subtract(amount, 1n)), 2n));
            }
            else {
                amount = langruntime.checkedI64(langruntime.checkedI64Divide((langruntime.checkedI64Add(amount, 1n)), 2n));
            }
        }
        let output: string = "";
        if (amount < 0n) {
            output = output + langruntime.checkedChar("-");
            amount = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, amount));
        }
        const number: number = Number(BigInt.asIntN(32, langruntime.checkedI64(amount)));
        const formatted: string = checkruntime.textNumber(number, 10);
        output = output + formatted;
        output = output + langruntime.checkedChar(" ");
        output = output + langruntime.indexStatic(integerSizeUnits, langruntime.checkedIndex(unit));
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
const integerInvalidFrameSize = 3452583;
function integerInRange(value: checkruntime.Int8Value, base: checkruntime.Int8Value, offset: checkruntime.Int8Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (base.kind === "Error") {
        const error: checkruntime.SqlError = base.value;
        return { kind: "Error", value: error };
    }
    if (offset.kind === "Error") {
        const error: checkruntime.SqlError = offset.value;
        return { kind: "Error", value: error };
    }
    if (subtract.kind === "Error") {
        const error: checkruntime.SqlError = subtract.value;
        return { kind: "Error", value: error };
    }
    if (less.kind === "Error") {
        const error: checkruntime.SqlError = less.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(value, { kind: "Unknown" }) || checkruntime.equalInt8Value(base, { kind: "Unknown" }) || checkruntime.equalInt8Value(offset, { kind: "Unknown" }) || checkruntime.equalBoolValue(subtract, { kind: "Unknown" }) || checkruntime.equalBoolValue(less, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(value, { kind: "Null" }) || checkruntime.equalInt8Value(base, { kind: "Null" }) || checkruntime.equalInt8Value(offset, { kind: "Null" }) || checkruntime.equalBoolValue(subtract, { kind: "Null" }) || checkruntime.equalBoolValue(less, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const input: bigint = langruntime.checkedI64(value.value);
        if (base.kind === "Value") {
            const center: bigint = langruntime.checkedI64(base.value);
            if (offset.kind === "Value") {
                const distance: bigint = langruntime.checkedI64(offset.value);
                if (subtract.kind === "Value") {
                    const sub: boolean = langruntime.checkedBool(subtract.value);
                    if (less.kind === "Value") {
                        const lower: boolean = langruntime.checkedBool(less.value);
                        if (distance < 0n) {
                            return { kind: "Error", value: checkruntime.makeSqlError(integerInvalidFrameSize) };
                        }
                        if (sub && center < langruntime.checkedI64Add(-9223372036854775808n, distance)) {
                            return { kind: "Value", value: lower === false };
                        }
                        if (sub === false && center > langruntime.checkedI64Subtract(9223372036854775807n, distance)) {
                            return { kind: "Value", value: lower };
                        }
                        let delta: bigint = distance;
                        if (sub) {
                            delta = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, distance));
                        }
                        const boundary: bigint = langruntime.checkedI64Add(center, delta);
                        if (lower) {
                            return { kind: "Value", value: input <= boundary };
                        }
                        return { kind: "Value", value: input >= boundary };
                    }
                }
            }
        }
    }
    return { kind: "Unknown" };
}
export function inRangeL5vd(value: checkruntime.Int8Value, base: checkruntime.Int8Value, offset: checkruntime.Int8Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    const valueWide: checkruntime.Int8Value = value;
    const baseWide: checkruntime.Int8Value = base;
    const offsetWide: checkruntime.Int8Value = offset;
    return integerInRange(valueWide, baseWide, offsetWide, subtract, less);
}
export function inRangeEl6v(value: checkruntime.Int4Value, base: checkruntime.Int4Value, offset: checkruntime.Int8Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    const valueWide: checkruntime.Int8Value = int8Mzac(value);
    const baseWide: checkruntime.Int8Value = int8Mzac(base);
    const offsetWide: checkruntime.Int8Value = offset;
    return integerInRange(valueWide, baseWide, offsetWide, subtract, less);
}
export function inRangeO7dg(value: checkruntime.Int4Value, base: checkruntime.Int4Value, offset: checkruntime.Int4Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    const valueWide: checkruntime.Int8Value = int8Mzac(value);
    const baseWide: checkruntime.Int8Value = int8Mzac(base);
    const offsetWide: checkruntime.Int8Value = int8Mzac(offset);
    return integerInRange(valueWide, baseWide, offsetWide, subtract, less);
}
export function inRangeMzmm(value: checkruntime.Int4Value, base: checkruntime.Int4Value, offset: checkruntime.Int2Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    const valueWide: checkruntime.Int8Value = int8Mzac(value);
    const baseWide: checkruntime.Int8Value = int8Mzac(base);
    const offsetWide: checkruntime.Int8Value = int8Sxtp(offset);
    return integerInRange(valueWide, baseWide, offsetWide, subtract, less);
}
export function inRangeC3nd(value: checkruntime.Int2Value, base: checkruntime.Int2Value, offset: checkruntime.Int8Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    const valueWide: checkruntime.Int8Value = int8Sxtp(value);
    const baseWide: checkruntime.Int8Value = int8Sxtp(base);
    const offsetWide: checkruntime.Int8Value = offset;
    return integerInRange(valueWide, baseWide, offsetWide, subtract, less);
}
export function inRangeVdmm(value: checkruntime.Int2Value, base: checkruntime.Int2Value, offset: checkruntime.Int4Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    const valueWide: checkruntime.Int8Value = int8Sxtp(value);
    const baseWide: checkruntime.Int8Value = int8Sxtp(base);
    const offsetWide: checkruntime.Int8Value = int8Mzac(offset);
    return integerInRange(valueWide, baseWide, offsetWide, subtract, less);
}
export function inRangeGcyn(value: checkruntime.Int2Value, base: checkruntime.Int2Value, offset: checkruntime.Int2Value, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    const valueWide: checkruntime.Int8Value = int8Sxtp(value);
    const baseWide: checkruntime.Int8Value = int8Sxtp(base);
    const offsetWide: checkruntime.Int8Value = int8Sxtp(offset);
    return integerInRange(valueWide, baseWide, offsetWide, subtract, less);
}
function integerSupportCompare(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int4Value {
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
        const a: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const b: bigint = langruntime.checkedI64(right.value);
            if (a < b) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (a > b) {
                return { kind: "Value", value: 1 };
            }
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Unknown" };
}
export function btint24cmp3e3r(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = int8Sxtp(left);
    const rightValue: checkruntime.Int8Value = int8Mzac(right);
    return integerSupportCompare(leftValue, rightValue);
}
export function btint28cmpZz4j(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = int8Sxtp(left);
    const rightValue: checkruntime.Int8Value = right;
    return integerSupportCompare(leftValue, rightValue);
}
export function btint2cmp2zqn(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int4Value = int41z1k(left);
    const rightValue: checkruntime.Int4Value = int41z1k(right);
    return int4miDtqk(leftValue, rightValue);
}
export function btint42cmpOgrx(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = int8Mzac(left);
    const rightValue: checkruntime.Int8Value = int8Sxtp(right);
    return integerSupportCompare(leftValue, rightValue);
}
export function btint48cmp9ntl(left: checkruntime.Int4Value, right: checkruntime.Int8Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = int8Mzac(left);
    const rightValue: checkruntime.Int8Value = right;
    return integerSupportCompare(leftValue, rightValue);
}
export function btint4cmpE3r7(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = int8Mzac(left);
    const rightValue: checkruntime.Int8Value = int8Mzac(right);
    return integerSupportCompare(leftValue, rightValue);
}
export function btint82cmpGl3p(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = left;
    const rightValue: checkruntime.Int8Value = int8Sxtp(right);
    return integerSupportCompare(leftValue, rightValue);
}
export function btint84cmp4vgw(left: checkruntime.Int8Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = left;
    const rightValue: checkruntime.Int8Value = int8Mzac(right);
    return integerSupportCompare(leftValue, rightValue);
}
export function btint8cmpTevi(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int4Value {
    const leftValue: checkruntime.Int8Value = left;
    const rightValue: checkruntime.Int8Value = right;
    return integerSupportCompare(leftValue, rightValue);
}
export function int4absZd8f(input: checkruntime.Int4Value): checkruntime.Int4Value {
    return abs5ajw(input);
}
export function int4incF5m2(input: checkruntime.Int4Value): checkruntime.Int4Value {
    return int4plSj3s(input, { kind: "Value", value: 1 });
}
export function int8incKe95(input: checkruntime.Int8Value): checkruntime.Int8Value {
    return int8pl1v1h(input, { kind: "Value", value: 1n });
}
export function int8decRhae(input: checkruntime.Int8Value): checkruntime.Int8Value {
    return int8miJasl(input, { kind: "Value", value: 1n });
}
export function mod2som(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    return int8mod2t8f(left, right);
}
export function modWchm(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    return int4modJ4pe(left, right);
}
function integerBooleanMerge(left: checkruntime.BoolValue, right: checkruntime.BoolValue, conjunction: boolean): checkruntime.BoolValue {
    conjunction = langruntime.checkedBool(conjunction);
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
        const a: boolean = langruntime.checkedBool(left.value);
        if (right.kind === "Value") {
            const b: boolean = langruntime.checkedBool(right.value);
            if (conjunction) {
                return { kind: "Value", value: a && b };
            }
            return { kind: "Value", value: a || b };
        }
    }
    return { kind: "Unknown" };
}
export function boolandStatefuncDxg8(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    return integerBooleanMerge(left, right, true);
}
export function boolorStatefunc1p3g(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.BoolValue {
    return integerBooleanMerge(left, right, false);
}
export function int2larger9kfl(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt2Value(left, { kind: "Unknown" }) || checkruntime.equalInt2Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt2Value(left, { kind: "Null" }) || checkruntime.equalInt2Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const b: number = langruntime.checkedI32(right.value);
            if (a > b) {
                return left;
            }
            return right;
        }
    }
    return { kind: "Unknown" };
}
export function int2smallerNg6s(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt2Value(left, { kind: "Unknown" }) || checkruntime.equalInt2Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt2Value(left, { kind: "Null" }) || checkruntime.equalInt2Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const b: number = langruntime.checkedI32(right.value);
            if (a < b) {
                return left;
            }
            return right;
        }
    }
    return { kind: "Unknown" };
}
export function int4largerFm8j(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
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
        const a: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const b: number = langruntime.checkedI32(right.value);
            if (a > b) {
                return left;
            }
            return right;
        }
    }
    return { kind: "Unknown" };
}
export function int4smallerIp0x(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
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
        const a: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const b: number = langruntime.checkedI32(right.value);
            if (a < b) {
                return left;
            }
            return right;
        }
    }
    return { kind: "Unknown" };
}
export function int8largerUf9y(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
        const a: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const b: bigint = langruntime.checkedI64(right.value);
            if (a > b) {
                return left;
            }
            return right;
        }
    }
    return { kind: "Unknown" };
}
export function int8smallerWeow(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
        const a: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const b: bigint = langruntime.checkedI64(right.value);
            if (a < b) {
                return left;
            }
            return right;
        }
    }
    return { kind: "Unknown" };
}
export function boolGxv7(input: checkruntime.Int4Value): checkruntime.BoolValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        return { kind: "Value", value: !(value === 0) };
    }
    return { kind: "Unknown" };
}
export function int4I3jf(input: checkruntime.BoolValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: boolean = langruntime.checkedBool(input.value);
        if (value) {
            return { kind: "Value", value: 1 };
        }
        return { kind: "Value", value: 0 };
    }
    return { kind: "Unknown" };
}
export function btboolcmpI7aj(left: checkruntime.BoolValue, right: checkruntime.BoolValue): checkruntime.Int4Value {
    const first: checkruntime.Int4Value = int4I3jf(left);
    const second: checkruntime.Int4Value = int4I3jf(right);
    return int4miDtqk(first, second);
}
export function int4up8u1c(input: checkruntime.Int4Value): checkruntime.Int4Value {
    return input;
}
export function int4umShsd(input: checkruntime.Int4Value): checkruntime.Int4Value {
    return int4miDtqk({ kind: "Value", value: 0 }, input);
}
function integerSupportGcd(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
        const first: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const second: bigint = langruntime.checkedI64(right.value);
            let a: bigint = first;
            let b: bigint = second;
            if (a > 0n) {
                a = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, a));
            }
            if (b > 0n) {
                b = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, b));
            }
            if (a > b) {
                const swap: bigint = a;
                a = langruntime.checkedI64(b);
                b = langruntime.checkedI64(swap);
            }
            if (a === -9223372036854775808n) {
                if (b === 0n || b === -9223372036854775808n) {
                    return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
                }
                if (b === -1n) {
                    return { kind: "Value", value: 1n };
                }
            }
            while (!(b === 0n)) {
                const remainder: bigint = langruntime.checkedI64Remainder(a, b);
                a = langruntime.checkedI64(b);
                b = langruntime.checkedI64(remainder);
            }
            return { kind: "Value", value: langruntime.checkedI64Subtract(0n, a) };
        }
    }
    return { kind: "Unknown" };
}
export function gcdIh0m(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    return integerSupportGcd(left, right);
}
export function gcd5cjb(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const first: checkruntime.Int8Value = int8Mzac(left);
    const second: checkruntime.Int8Value = int8Mzac(right);
    const result: checkruntime.Int8Value = integerSupportGcd(first, second);
    return int45ywh(result);
}
export function lcmWnc0(left: checkruntime.Int8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
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
        const first: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const second: bigint = langruntime.checkedI64(right.value);
            if (first === 0n || second === 0n) {
                return { kind: "Value", value: 0n };
            }
            const divisor: checkruntime.Int8Value = integerSupportGcd(left, right);
            const reduced: checkruntime.Int8Value = int8div8s66(left, divisor);
            const product: checkruntime.Int8Value = int8mul6t1m(reduced, right);
            return abs36t4(product);
        }
    }
    return { kind: "Unknown" };
}
export function lcm90j8(left: checkruntime.Int4Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const first: checkruntime.Int8Value = int8Mzac(left);
    const second: checkruntime.Int8Value = int8Mzac(right);
    const result: checkruntime.Int8Value = lcmWnc0(first, second);
    return int45ywh(result);
}
const macConversionOutOfRange = 3452547;
function macaddrCompare(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddrValue(left, { kind: "Unknown" }) || checkruntime.equalMacaddrValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddrValue(left, { kind: "Null" }) || checkruntime.equalMacaddrValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.MacAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.MacAddress = right.value;
            return { kind: "Value", value: checkruntime.macAddressCompare(a, b) };
        }
    }
    return { kind: "Unknown" };
}
export function macaddrEqUthl(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddrCompare(left, right);
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
export function macaddrNeEtmb(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddrCompare(left, right);
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
export function macaddrLt8vk5(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddrCompare(left, right);
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
export function macaddrLe6qq0(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddrCompare(left, right);
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
export function macaddrGt4kss(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddrCompare(left, right);
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
export function macaddrGeIuvk(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddrCompare(left, right);
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
export function macaddrCmpJv7y(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.Int4Value {
    return macaddrCompare(left, right);
}
function macaddr8Compare(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddr8Value(left, { kind: "Unknown" }) || checkruntime.equalMacaddr8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddr8Value(left, { kind: "Null" }) || checkruntime.equalMacaddr8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.MacAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.MacAddress = right.value;
            return { kind: "Value", value: checkruntime.macAddressCompare(a, b) };
        }
    }
    return { kind: "Unknown" };
}
export function macaddr8EqWy3p(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddr8Compare(left, right);
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
export function macaddr8NeJ20a(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddr8Compare(left, right);
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
export function macaddr8Lt5tsr(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddr8Compare(left, right);
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
export function macaddr8LeDmol(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddr8Compare(left, right);
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
export function macaddr8GtO95h(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddr8Compare(left, right);
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
export function macaddr8Ge054u(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = macaddr8Compare(left, right);
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
export function macaddr8CmpId7f(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.Int4Value {
    return macaddr8Compare(left, right);
}
export function macaddrNot4gjk(input: checkruntime.MacaddrValue): checkruntime.MacaddrValue {
    if (input.kind === "Value") {
        const a: checkruntime.MacAddress = input.value;
        return { kind: "Value", value: { word0: langruntime.checkedSignedSubtract(65535, a.word0), word1: langruntime.checkedSignedSubtract(65535, a.word1), word2: langruntime.checkedSignedSubtract(65535, a.word2), word3: 0 } };
    }
    return input;
}
export function truncBgg8(input: checkruntime.MacaddrValue): checkruntime.MacaddrValue {
    if (input.kind === "Value") {
        const a: checkruntime.MacAddress = input.value;
        return { kind: "Value", value: { word0: a.word0, word1: langruntime.checkedSignedMultiply(langruntime.checkedSignedDivide(a.word1, 256), 256), word2: 0, word3: 0 } };
    }
    return input;
}
function macaddrBitwise(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue, union: boolean): checkruntime.MacaddrValue {
    union = langruntime.checkedBool(union);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddrValue(left, { kind: "Unknown" }) || checkruntime.equalMacaddrValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddrValue(left, { kind: "Null" }) || checkruntime.equalMacaddrValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.MacAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.MacAddress = right.value;
            let word0: number = addressAndWord(a.word0, b.word0);
            if (union) {
                word0 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word0, b.word0), word0));
            }
            let word1: number = addressAndWord(a.word1, b.word1);
            if (union) {
                word1 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word1, b.word1), word1));
            }
            let word2: number = addressAndWord(a.word2, b.word2);
            if (union) {
                word2 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word2, b.word2), word2));
            }
            let word3: number = addressAndWord(a.word3, b.word3);
            if (union) {
                word3 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word3, b.word3), word3));
            }
            return { kind: "Value", value: { word0: word0, word1: word1, word2: word2, word3: word3 } };
        }
    }
    return { kind: "Unknown" };
}
export function macaddrAndKy45(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.MacaddrValue {
    return macaddrBitwise(left, right, false);
}
export function macaddrOrWqx0(left: checkruntime.MacaddrValue, right: checkruntime.MacaddrValue): checkruntime.MacaddrValue {
    return macaddrBitwise(left, right, true);
}
export function macaddr8NotUfi9(input: checkruntime.Macaddr8Value): checkruntime.Macaddr8Value {
    if (input.kind === "Value") {
        const a: checkruntime.MacAddress = input.value;
        return { kind: "Value", value: { word0: langruntime.checkedSignedSubtract(65535, a.word0), word1: langruntime.checkedSignedSubtract(65535, a.word1), word2: langruntime.checkedSignedSubtract(65535, a.word2), word3: langruntime.checkedSignedSubtract(65535, a.word3) } };
    }
    return input;
}
export function truncY4rb(input: checkruntime.Macaddr8Value): checkruntime.Macaddr8Value {
    if (input.kind === "Value") {
        const a: checkruntime.MacAddress = input.value;
        return { kind: "Value", value: { word0: a.word0, word1: langruntime.checkedSignedMultiply(langruntime.checkedSignedDivide(a.word1, 256), 256), word2: 0, word3: 0 } };
    }
    return input;
}
function macaddr8Bitwise(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value, union: boolean): checkruntime.Macaddr8Value {
    union = langruntime.checkedBool(union);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddr8Value(left, { kind: "Unknown" }) || checkruntime.equalMacaddr8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddr8Value(left, { kind: "Null" }) || checkruntime.equalMacaddr8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.MacAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.MacAddress = right.value;
            let word0: number = addressAndWord(a.word0, b.word0);
            if (union) {
                word0 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word0, b.word0), word0));
            }
            let word1: number = addressAndWord(a.word1, b.word1);
            if (union) {
                word1 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word1, b.word1), word1));
            }
            let word2: number = addressAndWord(a.word2, b.word2);
            if (union) {
                word2 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word2, b.word2), word2));
            }
            let word3: number = addressAndWord(a.word3, b.word3);
            if (union) {
                word3 = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word3, b.word3), word3));
            }
            return { kind: "Value", value: { word0: word0, word1: word1, word2: word2, word3: word3 } };
        }
    }
    return { kind: "Unknown" };
}
export function macaddr8AndCeah(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.Macaddr8Value {
    return macaddr8Bitwise(left, right, false);
}
export function macaddr8Or6kdp(left: checkruntime.Macaddr8Value, right: checkruntime.Macaddr8Value): checkruntime.Macaddr8Value {
    return macaddr8Bitwise(left, right, true);
}
export function macaddr8Set7bit2kgh(input: checkruntime.Macaddr8Value): checkruntime.Macaddr8Value {
    if (input.kind === "Value") {
        const a: checkruntime.MacAddress = input.value;
        const intersection: number = addressAndWord(a.word0, 512);
        return { kind: "Value", value: { word0: langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(a.word0, 512), intersection), word1: a.word1, word2: a.word2, word3: a.word3 } };
    }
    return input;
}
export function macaddr8Ta7j(input: checkruntime.MacaddrValue): checkruntime.Macaddr8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const a: checkruntime.MacAddress = input.value;
        const insertedHigh: number = 254;
        return { kind: "Value", value: { word0: a.word0, word1: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.checkedSignedDivide(a.word1, 256), 256), 255), word2: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(insertedHigh, 256), langruntime.checkedSignedRemainder(a.word1, 256)), word3: a.word2 } };
    }
    return { kind: "Unknown" };
}
export function macaddrXnt6(input: checkruntime.Macaddr8Value): checkruntime.MacaddrValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const a: checkruntime.MacAddress = input.value;
        if (!(langruntime.checkedSignedRemainder(a.word1, 256) === 255) || !(langruntime.checkedSignedDivide(a.word2, 256) === 254)) {
            return { kind: "Error", value: checkruntime.makeSqlError(macConversionOutOfRange) };
        }
        return { kind: "Value", value: { word0: a.word0, word1: langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.checkedSignedDivide(a.word1, 256), 256), langruntime.checkedSignedRemainder(a.word2, 256)), word2: a.word3, word3: 0 } };
    }
    return { kind: "Unknown" };
}
function macAddressByte(address: checkruntime.MacAddress, index: number): number {
    index = langruntime.checkedI32(index);
    let word: number = address.word0;
    if (index >= 6) {
        word = langruntime.checkedI32(address.word3);
    }
    else if (index >= 4) {
        word = langruntime.checkedI32(address.word2);
    }
    else if (index >= 2) {
        word = langruntime.checkedI32(address.word1);
    }
    if (langruntime.checkedSignedRemainder(index, 2) === 0) {
        return langruntime.checkedSignedDivide(word, 256);
    }
    return langruntime.checkedSignedRemainder(word, 256);
}
function macOutputText(address: checkruntime.MacAddress, size: number): string {
    size = langruntime.checkedI32(size);
    let output: string = "";
    let index: number = 0;
    while (index < size) {
        if (index > 0) {
            output = output + langruntime.checkedChar(":");
        }
        const byte: number = macAddressByte(address, index);
        if (byte < 16) {
            output = output + langruntime.checkedChar("0");
        }
        const number: string = checkruntime.textNumber(byte, 16);
        output = output + number;
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    return output;
}
function macOutputBytes(address: checkruntime.MacAddress, size: number): string {
    size = langruntime.checkedI32(size);
    let output: string = "";
    let index: number = 0;
    while (index < size) {
        const byte: number = macAddressByte(address, index);
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, byte));
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    return output;
}
function macHashBytes(address: checkruntime.MacAddress, size: number): checkruntime.HashByte[] {
    size = langruntime.checkedI32(size);
    let bytes: checkruntime.HashByte[] = [];
    let index: number = 0;
    while (index < size) {
        const byte: number = macAddressByte(address, index);
        langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(byte)) }, checkruntime.copyHashByte);
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    return bytes;
}
export function macaddrToText(input: checkruntime.MacaddrValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.MacAddress = input.value;
        const result: string = macOutputText(address, 6);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function macaddrSendFk4p(input: checkruntime.MacaddrValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.MacAddress = input.value;
        const result: string = macOutputBytes(address, 6);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function hashmacaddrIh2y(input: checkruntime.MacaddrValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddrValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.MacAddress = input.value;
        const bytes: checkruntime.HashByte[] = macHashBytes(address, 6);
        const result: number = checkruntime.hashBytes32(bytes);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function hashmacaddrextended94rh(left: checkruntime.MacaddrValue, right: checkruntime.Int8Value): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddrValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddrValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const address: checkruntime.MacAddress = left.value;
        if (right.kind === "Value") {
            const seed: bigint = langruntime.checkedI64(right.value);
            const bytes: checkruntime.HashByte[] = macHashBytes(address, 6);
            const result: bigint = checkruntime.hashBytes64(bytes, seed);
            return { kind: "Value", value: result };
        }
    }
    return { kind: "Unknown" };
}
export function macaddr8ToText(input: checkruntime.Macaddr8Value): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.MacAddress = input.value;
        const result: string = macOutputText(address, 8);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function macaddr8SendQten(input: checkruntime.Macaddr8Value): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.MacAddress = input.value;
        const result: string = macOutputBytes(address, 8);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function hashmacaddr872kw(input: checkruntime.Macaddr8Value): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddr8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.MacAddress = input.value;
        const bytes: checkruntime.HashByte[] = macHashBytes(address, 8);
        const result: number = checkruntime.hashBytes32(bytes);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function hashmacaddr8extended63o8(left: checkruntime.Macaddr8Value, right: checkruntime.Int8Value): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalMacaddr8Value(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalMacaddr8Value(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const address: checkruntime.MacAddress = left.value;
        if (right.kind === "Value") {
            const seed: bigint = langruntime.checkedI64(right.value);
            const bytes: checkruntime.HashByte[] = macHashBytes(address, 8);
            const result: bigint = checkruntime.hashBytes64(bytes, seed);
            return { kind: "Value", value: result };
        }
    }
    return { kind: "Unknown" };
}
const sqlstateInvalidParameterValue = 3452619;
function networkCompare(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.NetworkAddress = right.value;
            if (a.family < b.family) {
                return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
            }
            if (a.family > b.family) {
                return { kind: "Value", value: 1 };
            }
            let bits: number = a.prefix;
            if (b.prefix < bits) {
                bits = langruntime.checkedI32(b.prefix);
            }
            const order: number = checkruntime.networkPrefixCompare(a, b, bits);
            if (!(order === 0)) {
                return { kind: "Value", value: order };
            }
            const prefixOrder: number = langruntime.checkedSignedSubtract(a.prefix, b.prefix);
            if (!(prefixOrder === 0)) {
                return { kind: "Value", value: prefixOrder };
            }
            let width: number = 32;
            if (a.family === 6) {
                width = langruntime.checkedI32(128);
            }
            const fullOrder: number = checkruntime.networkPrefixCompare(a, b, width);
            return { kind: "Value", value: fullOrder };
        }
    }
    return { kind: "Unknown" };
}
export function networkEqI7hn(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = networkCompare(left, right);
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
export function networkNeVmql(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = networkCompare(left, right);
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
export function networkLt0kbr(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = networkCompare(left, right);
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
export function networkLeN61s(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = networkCompare(left, right);
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
export function networkGtI6x7(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = networkCompare(left, right);
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
export function networkGeQ7pc(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = networkCompare(left, right);
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
function networkContains(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue, strict: boolean): checkruntime.BoolValue {
    strict = langruntime.checkedBool(strict);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.NetworkAddress = right.value;
            if (!(a.family === b.family) || a.prefix < b.prefix) {
                return { kind: "Value", value: false };
            }
            if (strict && a.prefix === b.prefix) {
                return { kind: "Value", value: false };
            }
            const order: number = checkruntime.networkPrefixCompare(a, b, b.prefix);
            return { kind: "Value", value: order === 0 };
        }
    }
    return { kind: "Unknown" };
}
export function networkSubY7j2(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    return networkContains(left, right, true);
}
export function networkSubeq9psu(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    return networkContains(left, right, false);
}
export function networkSup1zu4(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    return networkContains(right, left, true);
}
export function networkSupeqUtj6(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    return networkContains(right, left, false);
}
export function networkOverlapZbdv(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.NetworkAddress = right.value;
            if (!(a.family === b.family)) {
                return { kind: "Value", value: false };
            }
            let bits: number = a.prefix;
            if (b.prefix < bits) {
                bits = langruntime.checkedI32(b.prefix);
            }
            const order: number = checkruntime.networkPrefixCompare(a, b, bits);
            return { kind: "Value", value: order === 0 };
        }
    }
    return { kind: "Unknown" };
}
function networkResultAddress(family: number, prefix: number, words: checkruntime.NetworkWord[]): checkruntime.NetworkAddress {
    family = langruntime.checkedIndex(family);
    prefix = langruntime.checkedI32(prefix);
    words = langruntime.checkedStructs(words, checkruntime.copyNetworkWord);
    return { family: family, prefix: prefix, word0: langruntime.indexStruct(words, langruntime.checkedIndex(0), checkruntime.copyNetworkWord).value, word1: langruntime.indexStruct(words, langruntime.checkedIndex(1), checkruntime.copyNetworkWord).value, word2: langruntime.indexStruct(words, langruntime.checkedIndex(2), checkruntime.copyNetworkWord).value, word3: langruntime.indexStruct(words, langruntime.checkedIndex(3), checkruntime.copyNetworkWord).value, word4: langruntime.indexStruct(words, langruntime.checkedIndex(4), checkruntime.copyNetworkWord).value, word5: langruntime.indexStruct(words, langruntime.checkedIndex(5), checkruntime.copyNetworkWord).value, word6: langruntime.indexStruct(words, langruntime.checkedIndex(6), checkruntime.copyNetworkWord).value, word7: langruntime.indexStruct(words, langruntime.checkedIndex(7), checkruntime.copyNetworkWord).value };
}
function networkAddOffset(address: checkruntime.NetworkAddress, offset: bigint): checkruntime.NetworkValue {
    offset = langruntime.checkedI64(offset);
    let words: checkruntime.NetworkWord[] = [];
    while (words.length < 8) {
        langruntime.pushStruct(words, { value: 0 }, checkruntime.copyNetworkWord);
    }
    let index: number = 8;
    if (address.family === 4) {
        index = langruntime.checkedIndex(2);
    }
    let remaining: bigint = offset;
    let carry: number = 0;
    while (index > 0) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        let digit: bigint = langruntime.checkedI64Remainder(remaining, 65536n);
        remaining = langruntime.checkedI64(langruntime.checkedI64Divide(remaining, 65536n));
        if (digit < 0n) {
            digit = langruntime.checkedI64(langruntime.checkedI64Add(digit, 65536n));
            remaining = langruntime.checkedI64(langruntime.checkedI64Subtract(remaining, 1n));
        }
        const narrowDigit: number = Number(BigInt.asIntN(32, langruntime.checkedI64(digit)));
        const sum: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(checkruntime.networkAddressWord(address, index), narrowDigit), carry);
        words[langruntime.checkedIndexIn(words, index)] = checkruntime.copyNetworkWord({ value: langruntime.checkedSignedRemainder(sum, 65536) });
        carry = langruntime.checkedI32(langruntime.checkedSignedDivide(sum, 65536));
    }
    if ((!(remaining === 0n) || !(carry === 0)) && (!(remaining === -1n) || !(carry === 1))) {
        return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
    }
    const result: checkruntime.NetworkAddress = networkResultAddress(address.family, address.prefix, words);
    return { kind: "Value", value: result };
}
export function inetplEu7x(left: checkruntime.NetworkValue, right: checkruntime.Int8Value): checkruntime.NetworkValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const address: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const offset: bigint = langruntime.checkedI64(right.value);
            return networkAddOffset(address, offset);
        }
    }
    return { kind: "Unknown" };
}
export function int8plInet3uh7(left: checkruntime.Int8Value, right: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (right.kind === "Value") {
        const address: checkruntime.NetworkAddress = right.value;
        if (left.kind === "Value") {
            const offset: bigint = langruntime.checkedI64(left.value);
            return networkAddOffset(address, offset);
        }
    }
    return { kind: "Unknown" };
}
export function inetmiInt8Z4fj(left: checkruntime.NetworkValue, right: checkruntime.Int8Value): checkruntime.NetworkValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const address: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const offset: bigint = langruntime.checkedI64(right.value);
            if (offset === -9223372036854775808n) {
                return networkAddOffset(address, offset);
            }
            const negated: bigint = langruntime.checkedI64Subtract(0n, offset);
            return networkAddOffset(address, negated);
        }
    }
    return { kind: "Unknown" };
}
export function inetmiJocm(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.NetworkAddress = right.value;
            if (!(a.family === b.family)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateInvalidParameterValue) };
            }
            let wordCount: number = 8;
            if (a.family === 4) {
                wordCount = langruntime.checkedIndex(2);
            }
            let words: checkruntime.NetworkWord[] = [];
            while (words.length < wordCount) {
                langruntime.pushStruct(words, { value: 0 }, checkruntime.copyNetworkWord);
            }
            let index: number = wordCount;
            let borrow: number = 0;
            while (index > 0) {
                index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
                let difference: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(checkruntime.networkAddressWord(a, index), checkruntime.networkAddressWord(b, index)), borrow);
                borrow = langruntime.checkedI32(0);
                if (difference < 0) {
                    difference = langruntime.checkedI32(langruntime.checkedSignedAdd(difference, 65536));
                    borrow = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                words[langruntime.checkedIndexIn(words, index)] = checkruntime.copyNetworkWord({ value: difference });
            }
            if (a.family === 4) {
                const high: bigint = BigInt(langruntime.checkedI32(langruntime.indexStruct(words, langruntime.checkedIndex(0), checkruntime.copyNetworkWord).value));
                const low: bigint = BigInt(langruntime.checkedI32(langruntime.indexStruct(words, langruntime.checkedIndex(1), checkruntime.copyNetworkWord).value));
                let result: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply(high, 65536n), low);
                if (borrow < 0) {
                    result = langruntime.checkedI64(langruntime.checkedI64Subtract(result, 4294967296n));
                }
                return { kind: "Value", value: result };
            }
            let expected: number = 0;
            let high: number = langruntime.indexStruct(words, langruntime.checkedIndex(4), checkruntime.copyNetworkWord).value;
            if (high >= 32768) {
                expected = langruntime.checkedI32(65535);
                high = langruntime.checkedI32(langruntime.checkedSignedSubtract(high, 65536));
            }
            let upperIndex: number = 0;
            while (upperIndex < 4) {
                if (!(langruntime.indexStruct(words, langruntime.checkedIndex(upperIndex), checkruntime.copyNetworkWord).value === expected)) {
                    return { kind: "Error", value: checkruntime.makeSqlError(sqlstateNumericValueOutOfRange) };
                }
                upperIndex = langruntime.checkedAdd(upperIndex, 1);
            }
            let result: bigint = BigInt(langruntime.checkedI32(high));
            let lowerIndex: number = 5;
            while (lowerIndex < 8) {
                const word: bigint = BigInt(langruntime.checkedI32(langruntime.indexStruct(words, langruntime.checkedIndex(lowerIndex), checkruntime.copyNetworkWord).value));
                result = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Multiply(result, 65536n), word));
                lowerIndex = langruntime.checkedAdd(lowerIndex, 1);
            }
            return { kind: "Value", value: result };
        }
    }
    return { kind: "Unknown" };
}
function networkMaxBits(address: checkruntime.NetworkAddress): number {
    if (address.family === 4) {
        return 32;
    }
    return 128;
}
function networkHostDivisor(bits: number): number {
    bits = langruntime.checkedI32(bits);
    let remaining: number = langruntime.checkedSignedSubtract(16, bits);
    let divisor: number = 1;
    while (remaining > 0) {
        divisor = langruntime.checkedI32(langruntime.checkedSignedMultiply(divisor, 2));
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
    }
    return divisor;
}
function networkApplyPrefix(address: checkruntime.NetworkAddress, prefix: number, fillHost: boolean): checkruntime.NetworkAddress {
    prefix = langruntime.checkedI32(prefix);
    fillHost = langruntime.checkedBool(fillHost);
    let words: checkruntime.NetworkWord[] = [];
    let remaining: number = prefix;
    let index: number = 0;
    while (index < 8) {
        let bits: number = remaining;
        if (bits > 16) {
            bits = langruntime.checkedI32(16);
        }
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, bits));
        const divisor: number = networkHostDivisor(bits);
        const source: number = checkruntime.networkAddressWord(address, index);
        let word: number = langruntime.checkedSignedMultiply(langruntime.checkedSignedDivide(source, divisor), divisor);
        if (fillHost) {
            word = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(word, divisor), 1));
        }
        if (address.family === 4 && index >= 2) {
            word = langruntime.checkedI32(0);
        }
        langruntime.pushStruct(words, { value: word }, checkruntime.copyNetworkWord);
        index = langruntime.checkedAdd(index, 1);
    }
    return networkResultAddress(address.family, prefix, words);
}
function networkMask(address: checkruntime.NetworkAddress, host: boolean): checkruntime.NetworkAddress {
    host = langruntime.checkedBool(host);
    let words: checkruntime.NetworkWord[] = [];
    let remaining: number = address.prefix;
    let index: number = 0;
    while (index < 8) {
        let bits: number = remaining;
        if (bits > 16) {
            bits = langruntime.checkedI32(16);
        }
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, bits));
        const divisor: number = networkHostDivisor(bits);
        let word: number = langruntime.checkedSignedSubtract(65536, divisor);
        if (host) {
            word = langruntime.checkedI32(langruntime.checkedSignedSubtract(divisor, 1));
        }
        if (address.family === 4 && index >= 2) {
            word = langruntime.checkedI32(0);
        }
        langruntime.pushStruct(words, { value: word }, checkruntime.copyNetworkWord);
        index = langruntime.checkedAdd(index, 1);
    }
    const width: number = networkMaxBits(address);
    return networkResultAddress(address.family, width, words);
}
function networkSetMasklen(left: checkruntime.NetworkValue, right: checkruntime.Int4Value, clearHost: boolean): checkruntime.NetworkValue {
    clearHost = langruntime.checkedBool(clearHost);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const address: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const requested: number = langruntime.checkedI32(right.value);
            const width: number = networkMaxBits(address);
            let prefix: number = requested;
            if (prefix === langruntime.checkedSignedNegate(1)) {
                prefix = langruntime.checkedI32(width);
            }
            if (prefix < 0 || prefix > width) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateInvalidParameterValue) };
            }
            if (clearHost) {
                const result: checkruntime.NetworkAddress = networkApplyPrefix(address, prefix, false);
                return { kind: "Value", value: result };
            }
            let words: checkruntime.NetworkWord[] = [];
            let index: number = 0;
            while (index < 8) {
                const word: number = checkruntime.networkAddressWord(address, index);
                langruntime.pushStruct(words, { value: word }, checkruntime.copyNetworkWord);
                index = langruntime.checkedAdd(index, 1);
            }
            const result: checkruntime.NetworkAddress = networkResultAddress(address.family, prefix, words);
            return { kind: "Value", value: result };
        }
    }
    return { kind: "Unknown" };
}
export function family2lcf(input: checkruntime.NetworkValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        if (address.family === 4) {
            return { kind: "Value", value: 4 };
        }
        return { kind: "Value", value: 6 };
    }
    return { kind: "Unknown" };
}
export function masklenKk20(input: checkruntime.NetworkValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        return { kind: "Value", value: address.prefix };
    }
    return { kind: "Unknown" };
}
export function networkO215(input: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        const result: checkruntime.NetworkAddress = networkApplyPrefix(address, address.prefix, false);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function cidr6idb(input: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        const result: checkruntime.NetworkAddress = networkApplyPrefix(address, address.prefix, false);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function broadcastIlgu(input: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        const result: checkruntime.NetworkAddress = networkApplyPrefix(address, address.prefix, true);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function netmaskBt5i(input: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        const result: checkruntime.NetworkAddress = networkMask(address, false);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function hostmaskVz12(input: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        const result: checkruntime.NetworkAddress = networkMask(address, true);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function setMasklenA6b0(left: checkruntime.NetworkValue, right: checkruntime.Int4Value): checkruntime.NetworkValue {
    return networkSetMasklen(left, right, false);
}
export function setMasklen00t7(left: checkruntime.NetworkValue, right: checkruntime.Int4Value): checkruntime.NetworkValue {
    return networkSetMasklen(left, right, true);
}
export function inetSameFamilyOgv6(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.NetworkAddress = right.value;
            return { kind: "Value", value: a.family === b.family };
        }
    }
    return { kind: "Unknown" };
}
export function inetMergeIflm(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.NetworkAddress = right.value;
            if (!(a.family === b.family)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateInvalidParameterValue) };
            }
            let limit: number = a.prefix;
            if (b.prefix < limit) {
                limit = langruntime.checkedI32(b.prefix);
            }
            let common: number = 0;
            while (common < limit) {
                const next: number = langruntime.checkedSignedAdd(common, 1);
                const order: number = checkruntime.networkPrefixCompare(a, b, next);
                if (!(order === 0)) {
                    break;
                }
                common = langruntime.checkedI32(next);
            }
            const result: checkruntime.NetworkAddress = networkApplyPrefix(a, common, false);
            return { kind: "Value", value: result };
        }
    }
    return { kind: "Unknown" };
}
function networkBitwise(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue, union: boolean): checkruntime.NetworkValue {
    union = langruntime.checkedBool(union);
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalNetworkValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalNetworkValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.NetworkAddress = right.value;
            if (!(a.family === b.family)) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateInvalidParameterValue) };
            }
            let prefix: number = a.prefix;
            if (b.prefix > prefix) {
                prefix = langruntime.checkedI32(b.prefix);
            }
            let words: checkruntime.NetworkWord[] = [];
            let index: number = 0;
            while (index < 8) {
                const first: number = checkruntime.networkAddressWord(a, index);
                const second: number = checkruntime.networkAddressWord(b, index);
                const intersection: number = addressAndWord(first, second);
                let word: number = intersection;
                if (union) {
                    word = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(first, second), intersection));
                }
                langruntime.pushStruct(words, { value: word }, checkruntime.copyNetworkWord);
                index = langruntime.checkedAdd(index, 1);
            }
            const result: checkruntime.NetworkAddress = networkResultAddress(a.family, prefix, words);
            return { kind: "Value", value: result };
        }
    }
    return { kind: "Unknown" };
}
export function inetandQxb6(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.NetworkValue {
    return networkBitwise(left, right, false);
}
export function inetorKw39(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.NetworkValue {
    return networkBitwise(left, right, true);
}
export function inetnot8bow(input: checkruntime.NetworkValue): checkruntime.NetworkValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        let words: checkruntime.NetworkWord[] = [];
        let index: number = 0;
        while (index < 8) {
            const source: number = checkruntime.networkAddressWord(address, index);
            let word: number = langruntime.checkedSignedSubtract(65535, source);
            if (address.family === 4 && index >= 2) {
                word = langruntime.checkedI32(0);
            }
            langruntime.pushStruct(words, { value: word }, checkruntime.copyNetworkWord);
            index = langruntime.checkedAdd(index, 1);
        }
        const result: checkruntime.NetworkAddress = networkResultAddress(address.family, address.prefix, words);
        return { kind: "Value", value: result };
    }
    return { kind: "Unknown" };
}
export function networkCmp7dun(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.Int4Value {
    return networkCompare(left, right);
}
function networkSelect(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue, larger: boolean): checkruntime.NetworkValue {
    larger = langruntime.checkedBool(larger);
    const result: checkruntime.Int4Value = networkCompare(left, right);
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
        if ((larger && order > 0) || (larger === false && order < 0)) {
            return left;
        }
        return right;
    }
    return { kind: "Unknown" };
}
export function networkLargerWb5u(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.NetworkValue {
    return networkSelect(left, right, true);
}
export function networkSmallerNmw8(left: checkruntime.NetworkValue, right: checkruntime.NetworkValue): checkruntime.NetworkValue {
    return networkSelect(left, right, false);
}
function networkHashBytes(address: checkruntime.NetworkAddress): checkruntime.HashByte[] {
    let bytes: checkruntime.HashByte[] = [];
    let family: bigint = 2n;
    let wordCount: number = 2;
    if (address.family === 6) {
        family = langruntime.checkedI64(3n);
        wordCount = langruntime.checkedIndex(8);
    }
    langruntime.pushStruct(bytes, { value: family }, checkruntime.copyHashByte);
    const prefix: bigint = BigInt(langruntime.checkedI32(address.prefix));
    langruntime.pushStruct(bytes, { value: prefix }, checkruntime.copyHashByte);
    let index: number = 0;
    while (index < wordCount) {
        const word: number = checkruntime.networkAddressWord(address, index);
        const high: number = langruntime.checkedSignedDivide(word, 256);
        const low: number = langruntime.checkedSignedRemainder(word, 256);
        const highByte: bigint = BigInt(langruntime.checkedI32(high));
        const lowByte: bigint = BigInt(langruntime.checkedI32(low));
        langruntime.pushStruct(bytes, { value: highByte }, checkruntime.copyHashByte);
        langruntime.pushStruct(bytes, { value: lowByte }, checkruntime.copyHashByte);
        index = langruntime.checkedAdd(index, 1);
    }
    return bytes;
}
export function hashinetFhly(input: checkruntime.NetworkValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        const bytes: checkruntime.HashByte[] = networkHashBytes(address);
        const hash: number = checkruntime.hashBytes32(bytes);
        return { kind: "Value", value: hash };
    }
    return { kind: "Unknown" };
}
export function hashinetextendedN7xh(left: checkruntime.NetworkValue, right: checkruntime.Int8Value): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const address: checkruntime.NetworkAddress = left.value;
        if (right.kind === "Value") {
            const seed: bigint = langruntime.checkedI64(right.value);
            const bytes: checkruntime.HashByte[] = networkHashBytes(address);
            const hash: bigint = checkruntime.hashBytes64(bytes, seed);
            return { kind: "Value", value: hash };
        }
    }
    return { kind: "Unknown" };
}
function networkIpv4Text(address: checkruntime.NetworkAddress, start: number, octets: number): string {
    start = langruntime.checkedIndex(start);
    octets = langruntime.checkedI32(octets);
    let output: string = "";
    let index: number = start;
    let high: boolean = true;
    let remaining: number = octets;
    while (remaining > 0) {
        if (!(remaining === octets)) {
            output = output + langruntime.checkedChar(".");
        }
        const byte: number = checkruntime.networkAddressByte(address, index, high);
        const number: string = checkruntime.textNumber(byte, 10);
        output = output + number;
        if (high) {
            high = langruntime.checkedBool(false);
        }
        else {
            high = langruntime.checkedBool(true);
            index = langruntime.checkedAdd(index, 1);
        }
        remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
    }
    return output;
}
function networkHostText(address: checkruntime.NetworkAddress): string {
    if (address.family === 4) {
        return networkIpv4Text(address, 0, 4);
    }
    let bestStart: number = 0;
    let bestLength: number = 0;
    let currentStart: number = 0;
    let currentLength: number = 0;
    let index: number = 0;
    while (index < 8) {
        if (checkruntime.networkAddressWord(address, index) === 0) {
            if (currentLength === 0) {
                currentStart = langruntime.checkedIndex(index);
            }
            currentLength = langruntime.checkedAdd(currentLength, 1);
        }
        else {
            if (currentLength > bestLength) {
                bestStart = langruntime.checkedIndex(currentStart);
                bestLength = langruntime.checkedIndex(currentLength);
            }
            currentLength = langruntime.checkedIndex(0);
        }
        index = langruntime.checkedAdd(index, 1);
    }
    if (currentLength > bestLength) {
        bestStart = langruntime.checkedIndex(currentStart);
        bestLength = langruntime.checkedIndex(currentLength);
    }
    if (bestLength < 2) {
        bestLength = langruntime.checkedIndex(0);
    }
    let output: string = "";
    let position: number = 0;
    while (position < 8) {
        if (!(bestLength === 0) && position >= bestStart && position < langruntime.checkedAdd(bestStart, bestLength)) {
            if (position === bestStart) {
                output = output + langruntime.checkedChar(":");
            }
        }
        else {
            if (!(position === 0)) {
                output = output + langruntime.checkedChar(":");
            }
            if (position === 6 && bestStart === 0 && (bestLength === 6 || (bestLength === 7 && !(address.word7 === 1)) || (bestLength === 5 && address.word5 === 65535))) {
                const dotted: string = networkIpv4Text(address, 6, 4);
                output = output + dotted;
                break;
            }
            const word: number = checkruntime.networkAddressWord(address, position);
            const number: string = checkruntime.textNumber(word, 16);
            output = output + number;
        }
        position = langruntime.checkedAdd(position, 1);
    }
    if (!(bestLength === 0) && langruntime.checkedAdd(bestStart, bestLength) === 8) {
        output = output + langruntime.checkedChar(":");
    }
    return output;
}
function networkCidrText(address: checkruntime.NetworkAddress): string {
    let output: string = "";
    if (address.family === 4) {
        if (address.prefix === 0) {
            output = output + langruntime.checkedChar("0");
        }
        else {
            const octets: number = langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(address.prefix, 7)), 8);
            output = langruntime.checkedString(networkIpv4Text(address, 0, octets));
        }
    }
    else if (address.prefix === 0) {
        output = output + "::";
    }
    else {
        let words: number = langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(address.prefix, 15)), 16);
        if (words === 1) {
            words = langruntime.checkedI32(2);
        }
        let zeroStart: number = 0;
        let zeroLength: number = 0;
        let currentStart: number = 0;
        let currentLength: number = 0;
        let index: number = 0;
        let remaining: number = words;
        while (remaining > 0) {
            if (checkruntime.networkAddressWord(address, index) === 0) {
                if (currentLength === 0) {
                    currentStart = langruntime.checkedIndex(index);
                }
                currentLength = langruntime.checkedAdd(currentLength, 1);
            }
            else if (!(currentLength === 0) && zeroLength < currentLength) {
                zeroStart = langruntime.checkedIndex(currentStart);
                zeroLength = langruntime.checkedIndex(currentLength);
                currentLength = langruntime.checkedIndex(0);
            }
            index = langruntime.checkedAdd(index, 1);
            remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
        }
        if (!(currentLength === 0) && zeroLength < currentLength) {
            zeroStart = langruntime.checkedIndex(currentStart);
            zeroLength = langruntime.checkedIndex(currentLength);
        }
        const ipv4: boolean = !(zeroLength === index) && zeroStart === 0 && (zeroLength === 6 || (zeroLength === 5 && address.word5 === 65535) || (zeroLength === 7 && !(langruntime.checkedSignedDivide(address.word7, 256) === 0) && !(langruntime.checkedSignedRemainder(address.word7, 256) === 1)));
        let position: number = 0;
        let printed: boolean = false;
        while (position < index) {
            if (!(zeroLength === 0) && position >= zeroStart && position < langruntime.checkedAdd(zeroStart, zeroLength)) {
                if (position === zeroStart) {
                    output = output + langruntime.checkedChar(":");
                    printed = langruntime.checkedBool(true);
                }
                if (position === langruntime.checkedSubtract(index, 1)) {
                    output = output + langruntime.checkedChar(":");
                }
            }
            else if (ipv4 && position > 5) {
                if (position === 6) {
                    output = output + langruntime.checkedChar(":");
                }
                else {
                    output = output + langruntime.checkedChar(".");
                }
                const high: number = checkruntime.networkAddressByte(address, position, true);
                const number: string = checkruntime.textNumber(high, 10);
                output = output + number;
                if (!(position === 7) || address.prefix > 120) {
                    output = output + langruntime.checkedChar(".");
                    const low: number = checkruntime.networkAddressByte(address, position, false);
                    const lowNumber: string = checkruntime.textNumber(low, 10);
                    output = output + lowNumber;
                }
                printed = langruntime.checkedBool(true);
            }
            else {
                if (printed) {
                    output = output + langruntime.checkedChar(":");
                }
                const word: number = checkruntime.networkAddressWord(address, position);
                const number: string = checkruntime.textNumber(word, 16);
                output = output + number;
                printed = langruntime.checkedBool(true);
            }
            position = langruntime.checkedAdd(position, 1);
        }
    }
    output = output + langruntime.checkedChar("/");
    const prefix: string = checkruntime.textNumber(address.prefix, 10);
    output = output + prefix;
    return output;
}
function networkOutput(input: checkruntime.NetworkValue, mode: number): checkruntime.TextValue {
    mode = langruntime.checkedI32(mode);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        if (mode === 3) {
            return { kind: "Value", value: networkCidrText(address) };
        }
        let output: string = networkHostText(address);
        if (mode === 1 || (mode === 2 && !(address.prefix === networkMaxBits(address)))) {
            output = output + langruntime.checkedChar("/");
            const prefix: string = checkruntime.textNumber(address.prefix, 10);
            output = output + prefix;
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function hostH4jb(input: checkruntime.NetworkValue): checkruntime.TextValue {
    return networkOutput(input, 0);
}
export function text99pc(input: checkruntime.NetworkValue): checkruntime.TextValue {
    return networkOutput(input, 1);
}
export function abbrevXdee(input: checkruntime.NetworkValue): checkruntime.TextValue {
    return networkOutput(input, 2);
}
export function abbrev5tby(input: checkruntime.NetworkValue): checkruntime.TextValue {
    return networkOutput(input, 3);
}
function networkSend(input: checkruntime.NetworkValue, cidr: boolean): checkruntime.ByteaValue {
    cidr = langruntime.checkedBool(cidr);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNetworkValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const address: checkruntime.NetworkAddress = input.value;
        let family: number = 2;
        let size: number = 4;
        let cidrFlag: number = 0;
        if (address.family === 6) {
            family = langruntime.checkedI32(3);
            size = langruntime.checkedI32(16);
        }
        if (cidr) {
            cidrFlag = langruntime.checkedI32(1);
        }
        let output: string = "";
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, family));
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, address.prefix));
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, cidrFlag));
        output = langruntime.checkedString(checkruntime.byteaAppendByte(output, size));
        let index: number = 0;
        let high: boolean = true;
        let remaining: number = size;
        while (remaining > 0) {
            const byte: number = checkruntime.networkAddressByte(address, index, high);
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, byte));
            if (high) {
                high = langruntime.checkedBool(false);
            }
            else {
                high = langruntime.checkedBool(true);
                index = langruntime.checkedAdd(index, 1);
            }
            remaining = langruntime.checkedI32(langruntime.checkedSignedSubtract(remaining, 1));
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function inetSendZ9ng(input: checkruntime.NetworkValue): checkruntime.ByteaValue {
    return networkSend(input, false);
}
export function cidrSendS007(input: checkruntime.NetworkValue): checkruntime.ByteaValue {
    return networkSend(input, true);
}
function numericCompare(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.Int4Value {
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
    const result: checkruntime.Int4Value = numericCompare(left, right);
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
    const result: checkruntime.Int4Value = numericCompare(left, right);
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
    const result: checkruntime.Int4Value = numericCompare(left, right);
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
    const result: checkruntime.Int4Value = numericCompare(left, right);
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
    const result: checkruntime.Int4Value = numericCompare(left, right);
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
    const result: checkruntime.Int4Value = numericCompare(left, right);
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
function numericWorkMagnitude(left: NumericWork, right: NumericWork): number {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    if (left.sign === 0) {
        if (right.sign === 0) {
            return 0;
        }
        return langruntime.checkedSignedNegate(1);
    }
    if (right.sign === 0) {
        return 1;
    }
    if (left.weight < right.weight) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.weight > right.weight) {
        return 1;
    }
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let index: number = 0;
    while (index < first.length || index < second.length) {
        let a: number = 0;
        let b: number = 0;
        if (index < first.length) {
            a = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(index))));
        }
        if (index < second.length) {
            b = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(index))));
        }
        if (a < b) {
            return langruntime.checkedSignedNegate(1);
        }
        if (a > b) {
            return 1;
        }
        index = langruntime.checkedAdd(index, 1);
    }
    return 0;
}
function numericWorkSum(left: NumericWork, right: NumericWork, subtract: boolean): NumericWork {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    subtract = langruntime.checkedBool(subtract);
    let scale: number = left.scale;
    if (right.scale > scale) {
        scale = langruntime.checkedI32(right.scale);
    }
    let sign: number = left.sign;
    let otherSign: number = right.sign;
    if (subtract) {
        otherSign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, otherSign));
    }
    const adding: boolean = sign === otherSign;
    let swap: boolean = false;
    if (adding === false) {
        const order: number = numericWorkMagnitude(copyNumericWork(left), copyNumericWork(right));
        if (order < 0) {
            swap = langruntime.checkedBool(true);
            sign = langruntime.checkedI32(otherSign);
        }
        if (order === 0) {
            sign = langruntime.checkedI32(0);
        }
    }
    let weight: number = left.weight;
    if (right.weight > weight) {
        weight = langruntime.checkedI32(right.weight);
    }
    weight = langruntime.checkedI32(langruntime.checkedSignedAdd(weight, 1));
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let aIndex: number = 0;
    let bIndex: number = 0;
    let aDigits: NumericWireDigit[] = [];
    let bDigits: NumericWireDigit[] = [];
    let position: number = weight;
    while (position >= langruntime.checkedSignedSubtract(0, scale)) {
        let a: number = 0;
        let b: number = 0;
        if (position <= left.weight && aIndex < first.length) {
            a = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(aIndex))));
            aIndex = langruntime.checkedAdd(aIndex, 1);
        }
        if (position <= right.weight && bIndex < second.length) {
            b = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(bIndex))));
            bIndex = langruntime.checkedAdd(bIndex, 1);
        }
        langruntime.pushStruct(aDigits, { value: a }, copyNumericWireDigit);
        langruntime.pushStruct(bDigits, { value: b }, copyNumericWireDigit);
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    let result: NumericWireDigit[] = [];
    let index: number = 0;
    while (index < aDigits.length) {
        langruntime.pushStruct(result, { value: 0 }, copyNumericWireDigit);
        index = langruntime.checkedAdd(index, 1);
    }
    let carry: number = 0;
    while (index > 0) {
        index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
        let a: number = langruntime.indexStruct(aDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value;
        let b: number = langruntime.indexStruct(bDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value;
        if (swap) {
            a = langruntime.checkedI32(langruntime.indexStruct(bDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value);
            b = langruntime.checkedI32(langruntime.indexStruct(aDigits, langruntime.checkedIndex(index), copyNumericWireDigit).value);
        }
        let digit: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(a, b), carry);
        if (adding) {
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(digit, 10));
            digit = langruntime.checkedI32(langruntime.checkedSignedRemainder(digit, 10));
        }
        else {
            digit = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(a, b), carry));
            carry = langruntime.checkedI32(0);
            if (digit < 0) {
                digit = langruntime.checkedI32(langruntime.checkedSignedAdd(digit, 10));
                carry = langruntime.checkedI32(1);
            }
        }
        result[langruntime.checkedIndexIn(result, index)] = copyNumericWireDigit({ value: digit });
    }
    let end: number = result.length;
    while (end > 0 && langruntime.indexStruct(result, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)), copyNumericWireDigit).value === 0) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let start: number = 0;
    while (start < end && langruntime.indexStruct(result, langruntime.checkedIndex(start), copyNumericWireDigit).value === 0) {
        start = langruntime.checkedAdd(start, 1);
        weight = langruntime.checkedI32(langruntime.checkedSignedSubtract(weight, 1));
    }
    let digits: string = "";
    index = langruntime.checkedIndex(start);
    while (index < end) {
        digits = digits + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(langruntime.indexStruct(result, langruntime.checkedIndex(index), copyNumericWireDigit).value, 48)), "0"));
        index = langruntime.checkedAdd(index, 1);
    }
    if (start === end) {
        sign = langruntime.checkedI32(0);
        weight = langruntime.checkedI32(0);
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: digits };
}
function numericWorkAdd(left: NumericWork, right: NumericWork, subtract: boolean): checkruntime.NumericValue {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    subtract = langruntime.checkedBool(subtract);
    const work: NumericWork = numericWorkSum(left, right, subtract);
    if (work.weight > 131071) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
    }
    return { kind: "Value", value: numericWorkText(work) };
}
function numericProductWords(characters: string[]): NumericWireDigit[] {
    characters = langruntime.checkedChars(characters);
    let words: NumericWireDigit[] = [];
    let end: number = characters.length;
    while (end > 0) {
        let value: number = 0;
        let factor: number = 1;
        let width: number = 0;
        while (end > 0 && width < 4) {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
            value = langruntime.checkedI32(langruntime.checkedSignedAdd(value, langruntime.checkedSignedMultiply(numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(end))), factor)));
            factor = langruntime.checkedI32(langruntime.checkedSignedMultiply(factor, 10));
            width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 1));
        }
        langruntime.pushStruct(words, { value: value }, copyNumericWireDigit);
    }
    return words;
}
function numericWorkProduct(left: NumericWork, right: NumericWork): NumericWork {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    const scale: number = langruntime.checkedSignedAdd(left.scale, right.scale);
    const sign: number = langruntime.checkedSignedMultiply(left.sign, right.sign);
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let aCount: number = 0;
    let bCount: number = 0;
    let index: number = 0;
    while (index < first.length) {
        aCount = langruntime.checkedI32(langruntime.checkedSignedAdd(aCount, 1));
        index = langruntime.checkedAdd(index, 1);
    }
    index = langruntime.checkedIndex(0);
    while (index < second.length) {
        bCount = langruntime.checkedI32(langruntime.checkedSignedAdd(bCount, 1));
        index = langruntime.checkedAdd(index, 1);
    }
    const a: NumericWireDigit[] = numericProductWords(first);
    const b: NumericWireDigit[] = numericProductWords(second);
    let result: NumericWireDigit[] = [];
    index = langruntime.checkedIndex(0);
    while (index < langruntime.checkedAdd(langruntime.checkedAdd(a.length, b.length), 1)) {
        langruntime.pushStruct(result, { value: 0 }, copyNumericWireDigit);
        index = langruntime.checkedAdd(index, 1);
    }
    let aIndex: number = 0;
    while (aIndex < a.length) {
        let bIndex: number = 0;
        let carry: number = 0;
        while (bIndex < b.length) {
            const offset: number = langruntime.checkedAdd(aIndex, bIndex);
            const product: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(a, langruntime.checkedIndex(aIndex), copyNumericWireDigit).value, langruntime.indexStruct(b, langruntime.checkedIndex(bIndex), copyNumericWireDigit).value), langruntime.indexStruct(result, langruntime.checkedIndex(offset), copyNumericWireDigit).value), carry);
            result[langruntime.checkedIndexIn(result, offset)] = copyNumericWireDigit({ value: langruntime.checkedSignedRemainder(product, 10000) });
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(product, 10000));
            bIndex = langruntime.checkedAdd(bIndex, 1);
        }
        let offset: number = langruntime.checkedAdd(aIndex, bIndex);
        while (carry > 0) {
            const word: number = langruntime.checkedSignedAdd(langruntime.indexStruct(result, langruntime.checkedIndex(offset), copyNumericWireDigit).value, carry);
            result[langruntime.checkedIndexIn(result, offset)] = copyNumericWireDigit({ value: langruntime.checkedSignedRemainder(word, 10000) });
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(word, 10000));
            offset = langruntime.checkedAdd(offset, 1);
        }
        aIndex = langruntime.checkedAdd(aIndex, 1);
    }
    let end: number = result.length;
    while (end > 0 && langruntime.indexStruct(result, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1)), copyNumericWireDigit).value === 0) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let coefficient: string = "";
    let count: number = 0;
    while (end > 0) {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        let word: number = langruntime.indexStruct(result, langruntime.checkedIndex(end), copyNumericWireDigit).value;
        let place: number = 1000;
        while (place > 0) {
            const digit: number = langruntime.checkedSignedDivide(word, place);
            word = langruntime.checkedI32(langruntime.checkedSignedRemainder(word, place));
            if (!(coefficient === "") || !(digit === 0)) {
                coefficient = coefficient + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(digit, 48)), "0"));
                count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
            }
            place = langruntime.checkedI32(langruntime.checkedSignedDivide(place, 10));
        }
    }
    let weight: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(left.weight, right.weight), count), aCount), bCount), 1);
    const characters: string[] = Array.from(coefficient);
    end = langruntime.checkedIndex(characters.length);
    while (end > 0 && langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === "0") {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let digits: string = "";
    index = langruntime.checkedIndex(0);
    while (index < end) {
        digits = digits + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
    }
    if (sign === 0) {
        weight = langruntime.checkedI32(0);
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: digits };
}
function numericWorkMultiply(left: NumericWork, right: NumericWork): checkruntime.NumericValue {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    const work: NumericWork = numericWorkProduct(left, right);
    const scale: number = work.scale;
    return numericWorkRound(work, scale, 1);
}
function numericArithmetic(left: checkruntime.NumericValue, right: checkruntime.NumericValue, mode: number): checkruntime.NumericValue {
    mode = langruntime.checkedI32(mode);
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
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const first: NumericWork = numericWorkFromValue(a);
            const second: NumericWork = numericWorkFromValue(b);
            if (first.valid === false || second.valid === false) {
                return { kind: "Unknown" };
            }
            if (first.special === 3 || second.special === 3) {
                return checkruntime.makeNumericValue("NaN");
            }
            if (!(first.special === 1) || !(second.special === 1)) {
                let leftSign: number = first.sign;
                let rightSign: number = second.sign;
                if (first.special === 0) {
                    leftSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                if (first.special === 2) {
                    leftSign = langruntime.checkedI32(1);
                }
                if (second.special === 0) {
                    rightSign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                if (second.special === 2) {
                    rightSign = langruntime.checkedI32(1);
                }
                if (mode === 1) {
                    rightSign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, rightSign));
                }
                let resultSign: number = leftSign;
                if (mode === 2) {
                    resultSign = langruntime.checkedI32(langruntime.checkedSignedMultiply(leftSign, rightSign));
                }
                else if (first.special === 1) {
                    resultSign = langruntime.checkedI32(rightSign);
                }
                else if (!(second.special === 1) && !(leftSign === rightSign)) {
                    resultSign = langruntime.checkedI32(0);
                }
                if (resultSign === 0) {
                    return checkruntime.makeNumericValue("NaN");
                }
                if (resultSign < 0) {
                    return checkruntime.makeNumericValue("-Infinity");
                }
                return checkruntime.makeNumericValue("Infinity");
            }
            if (mode === 2) {
                return numericWorkMultiply(first, second);
            }
            return numericWorkAdd(first, second, mode === 1);
        }
    }
    return { kind: "Unknown" };
}
export function numericAddO3d7(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericArithmetic(left, right, 0);
}
export function numericSubYs09(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericArithmetic(left, right, 1);
}
export function numericMulBj4l(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericArithmetic(left, right, 2);
}
export function numericInc6dcf(input: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericAddO3d7(input, checkruntime.makeNumericValue("1"));
}
const numericBucketInvalidArgument = 3452596;
function numericBucketOrder(left: NumericWork, right: NumericWork): number {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    if (left.special === 0) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.special === 2) {
        return 1;
    }
    if (left.sign < right.sign) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left.sign > right.sign) {
        return 1;
    }
    const order: number = numericWorkMagnitude(copyNumericWork(left), right);
    if (left.sign < 0) {
        return langruntime.checkedSignedSubtract(0, order);
    }
    return order;
}
function numericBucket(value: string, lower: string, upper: string, count: number): checkruntime.Int4Value {
    value = langruntime.checkedString(value);
    lower = langruntime.checkedString(lower);
    upper = langruntime.checkedString(upper);
    count = langruntime.checkedI32(count);
    const operand: NumericWork = numericWorkFromValue(value);
    const first: NumericWork = numericWorkFromValue(lower);
    const last: NumericWork = numericWorkFromValue(upper);
    if (operand.valid === false || first.valid === false || last.valid === false) {
        return { kind: "Unknown" };
    }
    if (count <= 0 || operand.special === 3 || !(first.special === 1) || !(last.special === 1)) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericBucketInvalidArgument) };
    }
    const direction: number = numericBucketOrder(copyNumericWork(first), copyNumericWork(last));
    if (direction === 0) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericBucketInvalidArgument) };
    }
    const start: number = numericBucketOrder(copyNumericWork(operand), copyNumericWork(first));
    const end: number = numericBucketOrder(copyNumericWork(operand), copyNumericWork(last));
    if ((direction < 0 && start < 0) || (direction > 0 && start > 0)) {
        return { kind: "Value", value: 0 };
    }
    if ((direction < 0 && end >= 0) || (direction > 0 && end <= 0)) {
        if (count === 2147483647) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
        }
        return { kind: "Value", value: langruntime.checkedSignedAdd(count, 1) };
    }
    const distance: NumericWork = numericWorkSum(operand, copyNumericWork(first), true);
    const span: NumericWork = numericWorkSum(last, first, true);
    const multiplier: NumericWork = numericWorkFromValue(checkruntime.textNumber(count, 10));
    const scaled: NumericWork = numericWorkProduct(distance, multiplier);
    const quotient: NumericWork = numericDivisionWork(scaled, span, 0, false);
    const integer: checkruntime.Int8Value = numericIntegerValue({ kind: "Value", value: numericWorkText(quotient) });
    if (integer.kind === "Error") {
        const error: checkruntime.SqlError = integer.value;
        return { kind: "Error", value: error };
    }
    if (integer.kind === "Value") {
        const number: bigint = langruntime.checkedI64(integer.value);
        if (number < 0n || number >= 2147483647n) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
        }
        const bucket: number = Number(BigInt.asIntN(32, langruntime.checkedI64(number)));
        return { kind: "Value", value: langruntime.checkedSignedAdd(bucket, 1) };
    }
    return { kind: "Unknown" };
}
export function widthBucketMx75(value: checkruntime.NumericValue, lower: checkruntime.NumericValue, upper: checkruntime.NumericValue, count: checkruntime.Int4Value): checkruntime.Int4Value {
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (lower.kind === "Error") {
        const error: checkruntime.SqlError = lower.value;
        return { kind: "Error", value: error };
    }
    if (upper.kind === "Error") {
        const error: checkruntime.SqlError = upper.value;
        return { kind: "Error", value: error };
    }
    if (count.kind === "Error") {
        const error: checkruntime.SqlError = count.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(value, { kind: "Unknown" }) || checkruntime.equalNumericValue(lower, { kind: "Unknown" }) || checkruntime.equalNumericValue(upper, { kind: "Unknown" }) || checkruntime.equalInt4Value(count, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(value, { kind: "Null" }) || checkruntime.equalNumericValue(lower, { kind: "Null" }) || checkruntime.equalNumericValue(upper, { kind: "Null" }) || checkruntime.equalInt4Value(count, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const input: string = langruntime.checkedString(value.value);
        if (lower.kind === "Value") {
            const first: string = langruntime.checkedString(lower.value);
            if (upper.kind === "Value") {
                const last: string = langruntime.checkedString(upper.value);
                if (count.kind === "Value") {
                    const buckets: number = langruntime.checkedI32(count.value);
                    return numericBucket(input, first, last, buckets);
                }
            }
        }
    }
    return { kind: "Unknown" };
}
function numericCommonWork(work: NumericWork, scale: number): NumericWork {
    work = copyNumericWork(work);
    scale = langruntime.checkedI32(scale);
    let sign: number = work.sign;
    if (sign < 0) {
        sign = langruntime.checkedI32(1);
    }
    return { valid: work.valid, special: work.special, sign: sign, weight: work.weight, scale: scale, digits: work.digits };
}
function numericCommon(left: checkruntime.NumericValue, right: checkruntime.NumericValue, multiple: boolean): checkruntime.NumericValue {
    multiple = langruntime.checkedBool(multiple);
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
        const first: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const second: string = langruntime.checkedString(right.value);
            const a: NumericWork = numericWorkFromValue(first);
            const b: NumericWork = numericWorkFromValue(second);
            if (a.valid === false || b.valid === false) {
                return { kind: "Unknown" };
            }
            if (!(a.special === 1) || !(b.special === 1)) {
                return { kind: "Value", value: "NaN" };
            }
            let scale: number = a.scale;
            if (scale < b.scale) {
                scale = langruntime.checkedI32(b.scale);
            }
            if (multiple && (a.sign === 0 || b.sign === 0)) {
                return { kind: "Value", value: numericWorkText(numericCommonWork(numericWorkFromValue("0"), scale)) };
            }
            let dividend: string = numericWorkText(numericCommonWork(copyNumericWork(a), scale));
            let divisor: string = numericWorkText(numericCommonWork(copyNumericWork(b), scale));
            let active: boolean = !(b.sign === 0);
            while (active) {
                const remainder: checkruntime.NumericValue = numericDivision(checkruntime.makeNumericValue(dividend), checkruntime.makeNumericValue(divisor), 2);
                if (remainder.kind === "Error") {
                    const error: checkruntime.SqlError = remainder.value;
                    return { kind: "Error", value: error };
                }
                if (checkruntime.equalNumericValue(remainder, { kind: "Unknown" })) {
                    return { kind: "Unknown" };
                }
                dividend = langruntime.checkedString(langruntime.checkedString(divisor));
                if (remainder.kind === "Value") {
                    const value: string = langruntime.checkedString(remainder.value);
                    const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
                    active = langruntime.checkedBool(!(layout.sign === 0));
                    divisor = langruntime.checkedString(value);
                }
            }
            if (multiple) {
                const quotient: NumericWork = numericDivisionWork(a, numericWorkFromValue(dividend), 0, false);
                const product: checkruntime.NumericValue = numericWorkMultiply(quotient, b);
                if (product.kind === "Value") {
                    const value: string = langruntime.checkedString(product.value);
                    return { kind: "Value", value: numericWorkText(numericCommonWork(numericWorkFromValue(value), scale)) };
                }
                return product;
            }
            return { kind: "Value", value: numericWorkText(numericCommonWork(numericWorkFromValue(dividend), scale)) };
        }
    }
    return { kind: "Unknown" };
}
export function gcdBke6(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericCommon(left, right, false);
}
export function lcmPjls(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericCommon(left, right, true);
}
function numericDivisionScale(left: NumericWork, right: NumericWork): number {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    let firstWeight: number = 0;
    let secondWeight: number = 0;
    let firstDigit: number = 0;
    let secondDigit: number = 0;
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    if (!(left.sign === 0)) {
        firstWeight = langruntime.checkedI32(langruntime.checkedSignedDivide(left.weight, 4));
        let width: number = langruntime.checkedSignedRemainder(left.weight, 4);
        if (width < 0) {
            firstWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(firstWeight, 1));
            width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 4));
        }
        width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 1));
        let index: number = 0;
        while (width > 0) {
            firstDigit = langruntime.checkedI32(langruntime.checkedSignedMultiply(firstDigit, 10));
            if (index < first.length) {
                firstDigit = langruntime.checkedI32(langruntime.checkedSignedAdd(firstDigit, numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(index)))));
            }
            index = langruntime.checkedAdd(index, 1);
            width = langruntime.checkedI32(langruntime.checkedSignedSubtract(width, 1));
        }
    }
    if (!(right.sign === 0)) {
        secondWeight = langruntime.checkedI32(langruntime.checkedSignedDivide(right.weight, 4));
        let width: number = langruntime.checkedSignedRemainder(right.weight, 4);
        if (width < 0) {
            secondWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(secondWeight, 1));
            width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 4));
        }
        width = langruntime.checkedI32(langruntime.checkedSignedAdd(width, 1));
        let index: number = 0;
        while (width > 0) {
            secondDigit = langruntime.checkedI32(langruntime.checkedSignedMultiply(secondDigit, 10));
            if (index < second.length) {
                secondDigit = langruntime.checkedI32(langruntime.checkedSignedAdd(secondDigit, numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(index)))));
            }
            index = langruntime.checkedAdd(index, 1);
            width = langruntime.checkedI32(langruntime.checkedSignedSubtract(width, 1));
        }
    }
    let quotientWeight: number = langruntime.checkedSignedSubtract(firstWeight, secondWeight);
    if (firstDigit <= secondDigit) {
        quotientWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(quotientWeight, 1));
    }
    let scale: number = langruntime.checkedSignedSubtract(16, langruntime.checkedSignedMultiply(quotientWeight, 4));
    if (scale < left.scale) {
        scale = langruntime.checkedI32(left.scale);
    }
    if (scale < right.scale) {
        scale = langruntime.checkedI32(right.scale);
    }
    if (scale < 0) {
        scale = langruntime.checkedI32(0);
    }
    if (scale > 1000) {
        scale = langruntime.checkedI32(1000);
    }
    return scale;
}
function numericDivisionWork(left: NumericWork, right: NumericWork, scale: number, rounding: boolean): NumericWork {
    left = copyNumericWork(left);
    right = copyNumericWork(right);
    scale = langruntime.checkedI32(scale);
    rounding = langruntime.checkedBool(rounding);
    const first: string[] = Array.from(left.digits);
    const second: string[] = Array.from(right.digits);
    let denominator: NumericWireDigit[] = [];
    let remainder: NumericWireDigit[] = [];
    langruntime.pushStruct(remainder, { value: 0 }, copyNumericWireDigit);
    let secondExponent: number = langruntime.checkedSignedAdd(right.weight, 1);
    let index: number = 0;
    while (index < second.length) {
        langruntime.pushStruct(denominator, { value: numericWireDecimalDigit(langruntime.indexChar(second, langruntime.checkedIndex(index))) }, copyNumericWireDigit);
        langruntime.pushStruct(remainder, { value: 0 }, copyNumericWireDigit);
        secondExponent = langruntime.checkedI32(langruntime.checkedSignedSubtract(secondExponent, 1));
        index = langruntime.checkedAdd(index, 1);
    }
    let position: number = langruntime.checkedSignedSubtract(left.weight, secondExponent);
    let boundary: number = langruntime.checkedSignedSubtract(0, scale);
    if (rounding) {
        boundary = langruntime.checkedI32(langruntime.checkedSignedSubtract(boundary, 1));
    }
    let coefficient: string = "";
    let weight: number = 0;
    let sign: number = 0;
    index = langruntime.checkedIndex(0);
    while (position >= boundary && !(left.sign === 0)) {
        let cursor: number = 0;
        while (langruntime.checkedAdd(cursor, 1) < remainder.length) {
            remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit(langruntime.indexStruct(remainder, langruntime.checkedIndex(langruntime.checkedAdd(cursor, 1)), copyNumericWireDigit));
            cursor = langruntime.checkedAdd(cursor, 1);
        }
        let digit: number = 0;
        if (index < first.length) {
            digit = langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(first, langruntime.checkedIndex(index))));
        }
        remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit({ value: digit });
        index = langruntime.checkedAdd(index, 1);
        let quotient: number = 0;
        let subtract: boolean = true;
        while (subtract) {
            subtract = langruntime.checkedBool(!(langruntime.indexStruct(remainder, langruntime.checkedIndex(0), copyNumericWireDigit).value === 0));
            if (subtract === false) {
                let order: number = 0;
                cursor = langruntime.checkedIndex(0);
                while (cursor < denominator.length && order === 0) {
                    if (langruntime.indexStruct(remainder, langruntime.checkedIndex(langruntime.checkedAdd(cursor, 1)), copyNumericWireDigit).value < langruntime.indexStruct(denominator, langruntime.checkedIndex(cursor), copyNumericWireDigit).value) {
                        order = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                    }
                    if (langruntime.indexStruct(remainder, langruntime.checkedIndex(langruntime.checkedAdd(cursor, 1)), copyNumericWireDigit).value > langruntime.indexStruct(denominator, langruntime.checkedIndex(cursor), copyNumericWireDigit).value) {
                        order = langruntime.checkedI32(1);
                    }
                    cursor = langruntime.checkedAdd(cursor, 1);
                }
                subtract = langruntime.checkedBool(order >= 0);
            }
            if (subtract) {
                let borrow: number = 0;
                cursor = langruntime.checkedIndex(denominator.length);
                while (cursor > 0) {
                    let difference: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value, langruntime.indexStruct(denominator, langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1)), copyNumericWireDigit).value), borrow);
                    borrow = langruntime.checkedI32(0);
                    if (difference < 0) {
                        difference = langruntime.checkedI32(langruntime.checkedSignedAdd(difference, 10));
                        borrow = langruntime.checkedI32(1);
                    }
                    remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit({ value: difference });
                    cursor = langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1));
                }
                remainder[langruntime.checkedIndexIn(remainder, 0)] = copyNumericWireDigit({ value: langruntime.checkedSignedSubtract(langruntime.indexStruct(remainder, langruntime.checkedIndex(0), copyNumericWireDigit).value, borrow) });
                quotient = langruntime.checkedI32(langruntime.checkedSignedAdd(quotient, 1));
            }
        }
        if (!(quotient === 0) && sign === 0) {
            sign = langruntime.checkedI32(langruntime.checkedSignedMultiply(left.sign, right.sign));
            weight = langruntime.checkedI32(position);
        }
        if (!(sign === 0)) {
            coefficient = coefficient + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(quotient, 48)), "0"));
        }
        let nonzero: boolean = false;
        cursor = langruntime.checkedIndex(0);
        while (cursor < remainder.length) {
            if (!(langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value === 0)) {
                nonzero = langruntime.checkedBool(true);
            }
            cursor = langruntime.checkedAdd(cursor, 1);
        }
        if (index >= first.length && nonzero === false) {
            position = langruntime.checkedI32(boundary);
        }
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: coefficient };
}
function numericDivision(left: checkruntime.NumericValue, right: checkruntime.NumericValue, mode: number): checkruntime.NumericValue {
    mode = langruntime.checkedI32(mode);
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
        const first: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const second: string = langruntime.checkedString(right.value);
            const a: NumericWork = numericWorkFromValue(first);
            const b: NumericWork = numericWorkFromValue(second);
            if (a.valid === false || b.valid === false) {
                return { kind: "Unknown" };
            }
            if (a.special === 3 || b.special === 3) {
                return { kind: "Value", value: "NaN" };
            }
            if (b.special === 1 && b.sign === 0) {
                return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
            }
            if (!(a.special === 1)) {
                if (mode === 2 || !(b.special === 1)) {
                    return { kind: "Value", value: "NaN" };
                }
                let sign: number = b.sign;
                if (a.special === 0) {
                    sign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, sign));
                }
                if (sign < 0) {
                    return { kind: "Value", value: "-Infinity" };
                }
                return { kind: "Value", value: "Infinity" };
            }
            if (!(b.special === 1)) {
                if (mode === 2) {
                    return { kind: "Value", value: first };
                }
                return { kind: "Value", value: "0" };
            }
            if (mode === 2) {
                const quotient: NumericWork = numericDivisionWork(copyNumericWork(a), copyNumericWork(b), 0, false);
                const product: checkruntime.NumericValue = numericWorkMultiply(quotient, b);
                if (product.kind === "Value") {
                    const multiplied: string = langruntime.checkedString(product.value);
                    return numericWorkAdd(a, numericWorkFromValue(multiplied), true);
                }
                return product;
            }
            let scale: number = 0;
            let rounding: boolean = false;
            if (mode === 0) {
                scale = langruntime.checkedI32(numericDivisionScale(copyNumericWork(a), copyNumericWork(b)));
                rounding = langruntime.checkedBool(true);
            }
            const quotient: NumericWork = numericDivisionWork(a, b, scale, rounding);
            let roundMode: number = 0;
            if (rounding) {
                roundMode = langruntime.checkedI32(1);
            }
            return numericWorkRound(quotient, scale, roundMode);
        }
    }
    return { kind: "Unknown" };
}
export function numericDivPnzm(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericDivision(left, right, 0);
}
export function numericDivTrunc5o9b(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericDivision(left, right, 1);
}
export function divN5y4(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericDivision(left, right, 1);
}
export function numericMod8ywz(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericDivision(left, right, 2);
}
export function mod4p6l(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericDivision(left, right, 2);
}
const numericExpLog10E = 0.434294481903252;
function numericExponentialScale(input: NumericWork): number {
    input = copyNumericWork(input);
    const value: string = numericWorkText(copyNumericWork(input));
    const parsed: number = langruntime.f64FromText(value, 0.0);
    let estimate: number = langruntime.f64Multiply(parsed, numericExpLog10E);
    if (estimate < -2000.0) {
        estimate = langruntime.checkedF64(-2000.0);
    }
    if (estimate > 2000.0) {
        estimate = langruntime.checkedF64(2000.0);
    }
    let scale: number = langruntime.checkedSignedSubtract(16, langruntime.f64ToI32(estimate));
    if (scale < input.scale) {
        scale = langruntime.checkedI32(input.scale);
    }
    if (scale < 0) {
        scale = langruntime.checkedI32(0);
    }
    if (scale > 1000) {
        scale = langruntime.checkedI32(1000);
    }
    return scale;
}
function numericExponentialWork(input: NumericWork, scale: number): NumericWork {
    input = copyNumericWork(input);
    scale = langruntime.checkedI32(scale);
    const text: string = numericWorkText(copyNumericWork(input));
    let estimate: number = langruntime.f64FromText(text, 0.0);
    if (langruntime.f64Abs(estimate) >= 6000.0) {
        if (estimate > 0.0) {
            return { valid: false, special: 1, sign: 0, weight: 0, scale: scale, digits: "" };
        }
        return numericWorkRounded(numericWorkFromValue("0"), scale, 1);
    }
    const weight: number = langruntime.f64ToI32((langruntime.f64Multiply(estimate, numericExpLog10E)));
    let divisions: number = 0;
    let divisor: number = 1;
    let x: NumericWork = input;
    while (langruntime.f64Abs(estimate) > 0.01) {
        divisions = langruntime.checkedI32(langruntime.checkedSignedAdd(divisions, 1));
        divisor = langruntime.checkedI32(langruntime.checkedSignedMultiply(divisor, 2));
        estimate = langruntime.checkedF64(langruntime.f64Divide(estimate, 2.0));
    }
    if (divisions > 0) {
        const localScale: number = langruntime.checkedSignedAdd(x.scale, divisions);
        const denominator: NumericWork = numericWorkFromValue(checkruntime.textNumber(divisor, 10));
        x = copyNumericWork(numericWorkRounded(numericDivisionWork(x, denominator, localScale, true), localScale, 1));
    }
    const extra: number = langruntime.f64ToI32((langruntime.f64Multiply(Number(langruntime.checkedI32(divisions)), 0.301029995663981)));
    let significant: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(1, weight), scale), extra);
    if (significant < 0) {
        significant = langruntime.checkedI32(0);
    }
    significant = langruntime.checkedI32(langruntime.checkedSignedAdd(significant, 8));
    const localScale: number = langruntime.checkedSignedSubtract(significant, 1);
    let result: NumericWork = numericWorkSum(numericWorkFromValue("1"), copyNumericWork(x), false);
    const product: NumericWork = numericWorkProduct(copyNumericWork(x), copyNumericWork(x));
    let term: NumericWork = numericWorkRounded(product, localScale, 1);
    let number: number = 2;
    term = copyNumericWork(numericWorkRounded(numericDivisionWork(term, numericWorkFromValue("2"), localScale, true), localScale, 1));
    while (!(term.sign === 0)) {
        result = copyNumericWork(numericWorkSum(result, copyNumericWork(term), false));
        term = copyNumericWork(numericWorkRounded(numericWorkProduct(term, copyNumericWork(x)), localScale, 1));
        number = langruntime.checkedI32(langruntime.checkedSignedAdd(number, 1));
        const denominator: NumericWork = numericWorkFromValue(checkruntime.textNumber(number, 10));
        term = copyNumericWork(numericWorkRounded(numericDivisionWork(term, denominator, localScale, true), localScale, 1));
    }
    while (divisions > 0) {
        let squareScale: number = langruntime.checkedSignedSubtract(significant, langruntime.checkedSignedMultiply(numericMathGroupWeight(copyNumericWork(result)), 8));
        if (squareScale < 0) {
            squareScale = langruntime.checkedI32(0);
        }
        result = copyNumericWork(numericWorkRounded(numericWorkProduct(copyNumericWork(result), result), squareScale, 1));
        divisions = langruntime.checkedI32(langruntime.checkedSignedSubtract(divisions, 1));
    }
    return numericWorkRounded(result, scale, 1);
}
export function numericExpFi9j(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (work.special === 0) {
            return { kind: "Value", value: "0" };
        }
        if (!(work.special === 1)) {
            return { kind: "Value", value: numericWorkText(work) };
        }
        const scale: number = numericExponentialScale(copyNumericWork(work));
        const result: NumericWork = numericExponentialWork(work, scale);
        if (result.valid === false) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
        }
        return numericWorkRound(result, scale, 1);
    }
    return { kind: "Unknown" };
}
export function expAo9b(input: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericExpFi9j(input);
}
export function factorialTah6(input: checkruntime.Int8Value): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        if (value < 0n || value > 32177n) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
        }
        const limit: number = Number(BigInt.asIntN(32, langruntime.checkedI64(value)));
        let words: NumericWireDigit[] = [];
        langruntime.pushStruct(words, { value: 1 }, copyNumericWireDigit);
        let factor: number = 2;
        while (factor <= limit) {
            let carry: number = 0;
            let index: number = 0;
            while (index < words.length) {
                const product: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(words, langruntime.checkedIndex(index), copyNumericWireDigit).value, factor), carry);
                words[langruntime.checkedIndexIn(words, index)] = copyNumericWireDigit({ value: langruntime.checkedSignedRemainder(product, 10000) });
                carry = langruntime.checkedI32(langruntime.checkedSignedDivide(product, 10000));
                index = langruntime.checkedAdd(index, 1);
            }
            while (carry > 0) {
                langruntime.pushStruct(words, { value: langruntime.checkedSignedRemainder(carry, 10000) }, copyNumericWireDigit);
                carry = langruntime.checkedI32(langruntime.checkedSignedDivide(carry, 10000));
            }
            factor = langruntime.checkedI32(langruntime.checkedSignedAdd(factor, 1));
        }
        let index: number = words.length;
        let output: string = "";
        while (index > 0) {
            index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
            const word: number = langruntime.indexStruct(words, langruntime.checkedIndex(index), copyNumericWireDigit).value;
            if (langruntime.checkedAdd(index, 1) === words.length) {
                output = output + checkruntime.textNumber(word, 10);
            }
            else {
                const thousands: number = langruntime.checkedSignedDivide(word, 1000);
                const hundreds: number = langruntime.checkedSignedRemainder((langruntime.checkedSignedDivide(word, 100)), 10);
                const tens: number = langruntime.checkedSignedRemainder((langruntime.checkedSignedDivide(word, 10)), 10);
                const ones: number = langruntime.checkedSignedRemainder(word, 10);
                output = output + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(thousands, 48)), "0"));
                output = output + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(hundreds, 48)), "0"));
                output = output + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(tens, 48)), "0"));
                output = output + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(ones, 48)), "0"));
            }
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
function numericHashDigits(value: string): checkruntime.HashByte[] {
    value = langruntime.checkedString(value);
    const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
    const characters: string[] = Array.from(value);
    let remainder: number = langruntime.checkedSignedRemainder(layout.weight, 4);
    if (remainder < 0) {
        remainder = langruntime.checkedI32(langruntime.checkedSignedAdd(remainder, 4));
    }
    let position: number = langruntime.checkedSignedSubtract(3, remainder);
    let group: number = 0;
    let index: number = layout.first;
    let bytes: checkruntime.HashByte[] = [];
    while (index < layout.end) {
        const digit: number = numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
        if (digit >= 0) {
            group = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(group, 10), digit));
            position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
            if (position === 4) {
                const low: number = langruntime.checkedSignedRemainder(group, 256);
                const high: number = langruntime.checkedSignedDivide(group, 256);
                langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(low)) }, checkruntime.copyHashByte);
                langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(high)) }, checkruntime.copyHashByte);
                position = langruntime.checkedI32(0);
                group = langruntime.checkedI32(0);
            }
        }
        index = langruntime.checkedAdd(index, 1);
    }
    if (position > 0) {
        while (position < 4) {
            group = langruntime.checkedI32(langruntime.checkedSignedMultiply(group, 10));
            position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
        }
        const low: number = langruntime.checkedSignedRemainder(group, 256);
        const high: number = langruntime.checkedSignedDivide(group, 256);
        langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(low)) }, checkruntime.copyHashByte);
        langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(high)) }, checkruntime.copyHashByte);
    }
    return bytes;
}
export function hashNumeric0e7w(input: checkruntime.NumericValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
        if (layout.valid === false) {
            return { kind: "Unknown" };
        }
        if (!(layout.special === 1)) {
            return { kind: "Value", value: 0 };
        }
        if (layout.sign === 0) {
            return { kind: "Value", value: langruntime.checkedSignedNegate(1) };
        }
        let weight: number = langruntime.checkedSignedDivide(layout.weight, 4);
        if (langruntime.checkedSignedRemainder(layout.weight, 4) < 0) {
            weight = langruntime.checkedI32(langruntime.checkedSignedSubtract(weight, 1));
        }
        const bytes: checkruntime.HashByte[] = numericHashDigits(value);
        const hash: number = checkruntime.hashBytes32(bytes);
        return int4xor6j8h({ kind: "Value", value: hash }, { kind: "Value", value: weight });
    }
    return { kind: "Unknown" };
}
export function hashNumericExtendedOglu(input: checkruntime.NumericValue, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (seed.kind === "Error") {
        const error: checkruntime.SqlError = seed.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalInt8Value(seed, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" }) || checkruntime.equalInt8Value(seed, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (seed.kind === "Value") {
            const salt: bigint = langruntime.checkedI64(seed.value);
            const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
            if (layout.valid === false) {
                return { kind: "Unknown" };
            }
            if (!(layout.special === 1)) {
                return { kind: "Value", value: salt };
            }
            if (layout.sign === 0) {
                if (salt === -9223372036854775808n) {
                    return { kind: "Value", value: 9223372036854775807n };
                }
                return { kind: "Value", value: langruntime.checkedI64Subtract(salt, 1n) };
            }
            let weight: number = langruntime.checkedSignedDivide(layout.weight, 4);
            if (langruntime.checkedSignedRemainder(layout.weight, 4) < 0) {
                weight = langruntime.checkedI32(langruntime.checkedSignedSubtract(weight, 1));
            }
            const wideWeight: bigint = BigInt(langruntime.checkedI32(weight));
            const bytes: checkruntime.HashByte[] = numericHashDigits(value);
            const hash: bigint = checkruntime.hashBytes64(bytes, salt);
            return int8xor4v56({ kind: "Value", value: hash }, { kind: "Value", value: wideWeight });
        }
    }
    return { kind: "Unknown" };
}
export function absM5ih(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        let special: number = work.special;
        let sign: number = work.sign;
        const outputScale: number = work.scale;
        if (sign < 0) {
            sign = langruntime.checkedI32(1);
        }
        if (special === 0) {
            special = langruntime.checkedI32(2);
        }
        return { kind: "Value", value: numericWorkText({ valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits }) };
    }
    return { kind: "Unknown" };
}
export function minScaleB8o1(input: checkruntime.NumericValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (!(work.special === 1)) {
            return { kind: "Null" };
        }
        return { kind: "Value", value: numericWorkMinScale(work) };
    }
    return { kind: "Unknown" };
}
export function numericAbs6g5e(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        let special: number = work.special;
        let sign: number = work.sign;
        const outputScale: number = work.scale;
        if (sign < 0) {
            sign = langruntime.checkedI32(1);
        }
        if (special === 0) {
            special = langruntime.checkedI32(2);
        }
        return { kind: "Value", value: numericWorkText({ valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits }) };
    }
    return { kind: "Unknown" };
}
export function numericCmp6h4s(input: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.Int4Value {
    const result: checkruntime.Int4Value = numericCompare(input, right);
    return result;
}
export function numericLarger4j2h(input: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    const result: checkruntime.Int4Value = numericCompare(input, right);
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
        if (order > 0) {
            return input;
        }
        return right;
    }
    return { kind: "Unknown" };
}
export function numericSmallerB9i1(input: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    const result: checkruntime.Int4Value = numericCompare(input, right);
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
        if (order < 0) {
            return input;
        }
        return right;
    }
    return { kind: "Unknown" };
}
export function numericUminusWcmy(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        let special: number = work.special;
        let sign: number = work.sign;
        const outputScale: number = work.scale;
        sign = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, sign));
        if (special === 0) {
            special = langruntime.checkedI32(2);
        }
        else if (special === 2) {
            special = langruntime.checkedI32(0);
        }
        return { kind: "Value", value: numericWorkText({ valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits }) };
    }
    return { kind: "Unknown" };
}
export function numericUplus2a0z(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        const special: number = work.special;
        const sign: number = work.sign;
        const outputScale: number = work.scale;
        return { kind: "Value", value: numericWorkText({ valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits }) };
    }
    return { kind: "Unknown" };
}
export function scaleSvql(input: checkruntime.NumericValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (!(work.special === 1)) {
            return { kind: "Null" };
        }
        return { kind: "Value", value: work.scale };
    }
    return { kind: "Unknown" };
}
export function sign2rsu(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (work.special === 3) {
            return { kind: "Value", value: "NaN" };
        }
        if (work.special === 0 || work.sign < 0) {
            return { kind: "Value", value: "-1" };
        }
        if (work.special === 2 || work.sign > 0) {
            return { kind: "Value", value: "1" };
        }
        return { kind: "Value", value: "0" };
    }
    return { kind: "Unknown" };
}
export function trimScale3rbp(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        const special: number = work.special;
        const sign: number = work.sign;
        const outputScale: number = numericWorkMinScale(copyNumericWork(work));
        return { kind: "Value", value: numericWorkText({ valid: true, special: special, sign: sign, weight: work.weight, scale: outputScale, digits: work.digits }) };
    }
    return { kind: "Unknown" };
}
const numericIntegerRangeError = 3452547;
const numericIntegerSpecialError = 466560;
function numericIntegerValue(input: checkruntime.NumericValue): checkruntime.Int8Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(text);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (!(work.special === 1)) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericIntegerSpecialError) };
        }
        if (!(work.sign === 0) && work.weight > 18) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericIntegerRangeError) };
        }
        const rounded: checkruntime.NumericValue = numericWorkRound(work, 0, 1);
        if (rounded.kind === "Error") {
            const error: checkruntime.SqlError = rounded.value;
            return { kind: "Error", value: error };
        }
        if (rounded.kind === "Value") {
            const value: string = langruntime.checkedString(rounded.value);
            const parts: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
            if (parts.sign === 0) {
                return { kind: "Value", value: 0n };
            }
            if (parts.weight > 18) {
                return { kind: "Error", value: checkruntime.makeSqlError(numericIntegerRangeError) };
            }
            const characters: string[] = Array.from(value);
            let result: bigint = 0n;
            let index: number = parts.first;
            let position: number = 0;
            while (position <= parts.weight) {
                let digit: bigint = 0n;
                if (index < parts.end) {
                    digit = langruntime.checkedI64(BigInt(langruntime.checkedI32(numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(index))))));
                    index = langruntime.checkedAdd(index, 1);
                }
                if (result < -922337203685477580n || (result === -922337203685477580n && digit > 8n)) {
                    return { kind: "Error", value: checkruntime.makeSqlError(numericIntegerRangeError) };
                }
                result = langruntime.checkedI64(langruntime.checkedI64Subtract(langruntime.checkedI64Multiply(result, 10n), digit));
                position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
            }
            if (parts.sign < 0) {
                return { kind: "Value", value: result };
            }
            if (result === -9223372036854775808n) {
                return { kind: "Error", value: checkruntime.makeSqlError(numericIntegerRangeError) };
            }
            return { kind: "Value", value: langruntime.checkedI64Subtract(0n, result) };
        }
    }
    return { kind: "Unknown" };
}
export function int2Zpjn(input: checkruntime.NumericValue): checkruntime.Int2Value {
    const converted: checkruntime.Int8Value = numericIntegerValue(input);
    if (converted.kind === "Error") {
        const error: checkruntime.SqlError = converted.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(converted, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(converted, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (converted.kind === "Value") {
        const value: bigint = langruntime.checkedI64(converted.value);
        if (value < -32768n || value > 32767n) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericIntegerRangeError) };
        }
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(value))) };
    }
    return { kind: "Unknown" };
}
export function int4Z4rh(input: checkruntime.NumericValue): checkruntime.Int4Value {
    const converted: checkruntime.Int8Value = numericIntegerValue(input);
    if (converted.kind === "Error") {
        const error: checkruntime.SqlError = converted.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(converted, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(converted, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (converted.kind === "Value") {
        const value: bigint = langruntime.checkedI64(converted.value);
        if (value < -2147483648n || value > 2147483647n) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericIntegerRangeError) };
        }
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(value))) };
    }
    return { kind: "Unknown" };
}
export function int8Xy54(input: checkruntime.NumericValue): checkruntime.Int8Value {
    return numericIntegerValue(input);
}
export function numericItt9(input: checkruntime.Int2Value): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt2Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt2Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        const integer: bigint = BigInt(langruntime.checkedI32(value));
        return { kind: "Value", value: checkruntime.textSignedNumber(integer) };
    }
    return { kind: "Unknown" };
}
export function numericNcrk(input: checkruntime.Int4Value): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: number = langruntime.checkedI32(input.value);
        const integer: bigint = BigInt(langruntime.checkedI32(value));
        return { kind: "Value", value: checkruntime.textSignedNumber(integer) };
    }
    return { kind: "Unknown" };
}
export function numeric11bc(input: checkruntime.Int8Value): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt8Value(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: bigint = langruntime.checkedI64(input.value);
        const integer: bigint = value;
        return { kind: "Value", value: checkruntime.textSignedNumber(integer) };
    }
    return { kind: "Unknown" };
}
const numericLogInvalidArgument = 3452594;
const numericLnTenEstimate = 2.302585092994046;
function numericMathGroupWeight(work: NumericWork): number {
    work = copyNumericWork(work);
    let group: number = langruntime.checkedSignedDivide(work.weight, 4);
    if (langruntime.checkedSignedRemainder(work.weight, 4) < 0) {
        group = langruntime.checkedI32(langruntime.checkedSignedSubtract(group, 1));
    }
    return group;
}
function numericLogarithmWeight(work: NumericWork): number {
    work = copyNumericWork(work);
    const lower: NumericWork = numericWorkFromValue("0.9");
    const upper: NumericWork = numericWorkFromValue("1.1");
    if (numericWorkMagnitude(copyNumericWork(work), lower) >= 0 && numericWorkMagnitude(copyNumericWork(work), upper) <= 0) {
        const difference: NumericWork = numericWorkSum(work, numericWorkFromValue("1"), true);
        if (difference.sign === 0) {
            return 0;
        }
        return difference.weight;
    }
    const groupWeight: number = numericMathGroupWeight(copyNumericWork(work));
    let width: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(work.weight, langruntime.checkedSignedMultiply(groupWeight, 4)), 1);
    let exponent: number = langruntime.checkedSignedMultiply(groupWeight, 4);
    const characters: string[] = Array.from(work.digits);
    let index: number = 0;
    let leading: number = 0;
    while (width > 0) {
        leading = langruntime.checkedI32(langruntime.checkedSignedMultiply(leading, 10));
        if (index < characters.length) {
            leading = langruntime.checkedI32(langruntime.checkedSignedAdd(leading, numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(index)))));
            index = langruntime.checkedAdd(index, 1);
        }
        width = langruntime.checkedI32(langruntime.checkedSignedSubtract(width, 1));
    }
    if (index < characters.length) {
        width = langruntime.checkedI32(4);
        exponent = langruntime.checkedI32(langruntime.checkedSignedSubtract(exponent, 4));
        while (width > 0) {
            leading = langruntime.checkedI32(langruntime.checkedSignedMultiply(leading, 10));
            if (index < characters.length) {
                leading = langruntime.checkedI32(langruntime.checkedSignedAdd(leading, numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(index)))));
                index = langruntime.checkedAdd(index, 1);
            }
            width = langruntime.checkedI32(langruntime.checkedSignedSubtract(width, 1));
        }
    }
    const coefficient: number = Number(langruntime.checkedI32(leading));
    const decimalWeight: number = Number(langruntime.checkedI32(exponent));
    const estimate: number = langruntime.f64Add(langruntime.f64Ln(coefficient), langruntime.f64Multiply(decimalWeight, numericLnTenEstimate));
    return langruntime.f64ToI32(langruntime.f64Log10(langruntime.f64Abs(estimate)));
}
function numericLogarithmWork(input: NumericWork, scale: number): NumericWork {
    input = copyNumericWork(input);
    scale = langruntime.checkedI32(scale);
    const one: NumericWork = numericWorkFromValue("1");
    const lower: NumericWork = numericWorkFromValue("0.9");
    const upper: NumericWork = numericWorkFromValue("1.1");
    let work: NumericWork = input;
    let roots: number = 0;
    let factor: number = 2;
    while (numericWorkMagnitude(copyNumericWork(work), copyNumericWork(lower)) <= 0) {
        const localScale: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(scale, langruntime.checkedSignedMultiply(numericMathGroupWeight(copyNumericWork(work)), 2)), 8);
        work = copyNumericWork(numericSquareRootScaled(work, localScale));
        factor = langruntime.checkedI32(langruntime.checkedSignedMultiply(factor, 2));
        roots = langruntime.checkedI32(langruntime.checkedSignedAdd(roots, 1));
    }
    while (numericWorkMagnitude(copyNumericWork(work), copyNumericWork(upper)) >= 0) {
        const localScale: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(scale, langruntime.checkedSignedMultiply(numericMathGroupWeight(copyNumericWork(work)), 2)), 8);
        work = copyNumericWork(numericSquareRootScaled(work, localScale));
        factor = langruntime.checkedI32(langruntime.checkedSignedMultiply(factor, 2));
        roots = langruntime.checkedI32(langruntime.checkedSignedAdd(roots, 1));
    }
    const extra: number = langruntime.f64ToI32((langruntime.f64Multiply(Number(langruntime.checkedI32((langruntime.checkedSignedAdd(roots, 1)))), 0.301029995663981)));
    const localScale: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(scale, extra), 8);
    const numerator: NumericWork = numericWorkSum(copyNumericWork(work), copyNumericWork(one), true);
    const denominator: NumericWork = numericWorkSum(work, one, false);
    const quotient: NumericWork = numericDivisionWork(numerator, denominator, localScale, true);
    let result: NumericWork = numericWorkRounded(quotient, localScale, 1);
    let term: NumericWork = copyNumericWork(result);
    const product: NumericWork = numericWorkProduct(copyNumericWork(result), copyNumericWork(result));
    const square: NumericWork = numericWorkRounded(product, localScale, 1);
    let divisor: number = 1;
    let advancing: boolean = true;
    while (advancing) {
        divisor = langruntime.checkedI32(langruntime.checkedSignedAdd(divisor, 2));
        const product: NumericWork = numericWorkProduct(term, copyNumericWork(square));
        term = copyNumericWork(numericWorkRounded(product, localScale, 1));
        const denominator: NumericWork = numericWorkFromValue(checkruntime.textNumber(divisor, 10));
        const quotient: NumericWork = numericDivisionWork(copyNumericWork(term), denominator, localScale, true);
        const element: NumericWork = numericWorkRounded(quotient, localScale, 1);
        if (element.sign === 0) {
            advancing = langruntime.checkedBool(false);
        }
        else {
            result = copyNumericWork(numericWorkSum(result, copyNumericWork(element), false));
            if (numericMathGroupWeight(element) < langruntime.checkedSignedSubtract(numericMathGroupWeight(copyNumericWork(result)), langruntime.checkedSignedDivide(langruntime.checkedSignedMultiply(localScale, 2), 4))) {
                advancing = langruntime.checkedBool(false);
            }
        }
    }
    const multiplier: NumericWork = numericWorkFromValue(checkruntime.textNumber(factor, 10));
    return numericWorkRounded(numericWorkProduct(result, multiplier), scale, 1);
}
export function numericLnOkv6(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (work.special === 0 || (work.special === 1 && work.sign <= 0)) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericLogInvalidArgument) };
        }
        if (!(work.special === 1)) {
            return { kind: "Value", value: numericWorkText(work) };
        }
        let scale: number = langruntime.checkedSignedSubtract(16, numericLogarithmWeight(copyNumericWork(work)));
        if (scale < work.scale) {
            scale = langruntime.checkedI32(work.scale);
        }
        if (scale < 0) {
            scale = langruntime.checkedI32(0);
        }
        if (scale > 1000) {
            scale = langruntime.checkedI32(1000);
        }
        return { kind: "Value", value: numericWorkText(numericLogarithmWork(work, scale)) };
    }
    return { kind: "Unknown" };
}
export function ln05bs(input: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericLnOkv6(input);
}
function numericBaseLogarithm(base: NumericWork, input: NumericWork): checkruntime.NumericValue {
    base = copyNumericWork(base);
    input = copyNumericWork(input);
    if (base.special === 3 || input.special === 3) {
        return { kind: "Value", value: "NaN" };
    }
    if (base.special === 0 || input.special === 0 || (base.special === 1 && base.sign <= 0) || (input.special === 1 && input.sign <= 0)) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericLogInvalidArgument) };
    }
    if (base.special === 2) {
        if (input.special === 2) {
            return { kind: "Value", value: "NaN" };
        }
        return { kind: "Value", value: "0" };
    }
    if (input.special === 2) {
        return { kind: "Value", value: "Infinity" };
    }
    const baseWeight: number = numericLogarithmWeight(copyNumericWork(base));
    const inputWeight: number = numericLogarithmWeight(copyNumericWork(input));
    const resultWeight: number = langruntime.checkedSignedSubtract(inputWeight, baseWeight);
    let scale: number = langruntime.checkedSignedSubtract(16, resultWeight);
    if (scale < base.scale) {
        scale = langruntime.checkedI32(base.scale);
    }
    if (scale < input.scale) {
        scale = langruntime.checkedI32(input.scale);
    }
    if (scale < 0) {
        scale = langruntime.checkedI32(0);
    }
    if (scale > 1000) {
        scale = langruntime.checkedI32(1000);
    }
    let baseScale: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(scale, resultWeight), baseWeight), 8);
    if (baseScale < 0) {
        baseScale = langruntime.checkedI32(0);
    }
    let inputScale: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(langruntime.checkedSignedAdd(scale, resultWeight), inputWeight), 8);
    if (inputScale < 0) {
        inputScale = langruntime.checkedI32(0);
    }
    const denominator: NumericWork = numericLogarithmWork(base, baseScale);
    const numerator: NumericWork = numericLogarithmWork(input, inputScale);
    if (denominator.sign === 0) {
        return { kind: "Error", value: checkruntime.makeSqlError(sqlstateDivisionByZero) };
    }
    const quotient: NumericWork = numericDivisionWork(numerator, denominator, scale, true);
    return numericWorkRound(quotient, scale, 1);
}
export function numericLog8gwh(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
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
        const base: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const input: string = langruntime.checkedString(right.value);
            const first: NumericWork = numericWorkFromValue(base);
            const second: NumericWork = numericWorkFromValue(input);
            if (first.valid === false || second.valid === false) {
                return { kind: "Unknown" };
            }
            return numericBaseLogarithm(first, second);
        }
    }
    return { kind: "Unknown" };
}
export function log94cu(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericLog8gwh(left, right);
}
export function logWnnd(input: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericLog8gwh({ kind: "Value", value: "10" }, input);
}
export function log10Dgh7(input: checkruntime.NumericValue): checkruntime.NumericValue {
    return logWnnd(input);
}
const numericPowerInvalidArgument = 3452595;
function numericPowerSign(work: NumericWork): number {
    work = copyNumericWork(work);
    if (work.special === 0) {
        return langruntime.checkedSignedNegate(1);
    }
    if (work.special === 2) {
        return 1;
    }
    return work.sign;
}
function numericPowerIntegral(work: NumericWork): boolean {
    work = copyNumericWork(work);
    if (work.special === 3) {
        return false;
    }
    if (!(work.special === 1)) {
        return true;
    }
    return numericWorkMinScale(work) === 0;
}
function numericPowerOdd(work: NumericWork): boolean {
    work = copyNumericWork(work);
    const characters: string[] = Array.from(work.digits);
    let position: number = work.weight;
    let index: number = 0;
    while (index < characters.length) {
        if (position === 0) {
            return !(langruntime.checkedSignedRemainder(numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(index))), 2) === 0);
        }
        index = langruntime.checkedAdd(index, 1);
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    return false;
}
function numericPowerPositive(work: NumericWork): NumericWork {
    work = copyNumericWork(work);
    let sign: number = work.sign;
    if (sign < 0) {
        sign = langruntime.checkedI32(1);
    }
    return { valid: work.valid, special: work.special, sign: sign, weight: work.weight, scale: work.scale, digits: work.digits };
}
function numericPowerDecimalEstimate(work: NumericWork): number {
    work = copyNumericWork(work);
    if (work.sign === 0) {
        return 0.0;
    }
    const characters: string[] = Array.from(work.digits);
    const groupWeight: number = numericMathGroupWeight(copyNumericWork(work));
    let exponent: number = langruntime.checkedSignedMultiply(groupWeight, 4);
    let width: number = langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(work.weight, exponent), 1);
    let index: number = 0;
    let leading: number = 0.0;
    let groups: number = 0;
    let advancing: boolean = true;
    while (advancing) {
        let digit: number = 0;
        while (width > 0) {
            digit = langruntime.checkedI32(langruntime.checkedSignedMultiply(digit, 10));
            if (index < characters.length) {
                digit = langruntime.checkedI32(langruntime.checkedSignedAdd(digit, numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(index)))));
                index = langruntime.checkedAdd(index, 1);
            }
            width = langruntime.checkedI32(langruntime.checkedSignedSubtract(width, 1));
        }
        leading = langruntime.checkedF64(langruntime.f64Add(langruntime.f64Multiply(leading, 10000.0), Number(langruntime.checkedI32(digit))));
        groups = langruntime.checkedI32(langruntime.checkedSignedAdd(groups, 1));
        if (index < characters.length && groups < 4) {
            width = langruntime.checkedI32(4);
            exponent = langruntime.checkedI32(langruntime.checkedSignedSubtract(exponent, 4));
        }
        else {
            advancing = langruntime.checkedBool(false);
        }
    }
    return langruntime.f64Add(langruntime.f64Log10(leading), Number(langruntime.checkedI32(exponent)));
}
function numericPowerScale(estimate: number, baseScale: number, exponentScale: number): number {
    estimate = langruntime.checkedF64(estimate);
    baseScale = langruntime.checkedI32(baseScale);
    exponentScale = langruntime.checkedI32(exponentScale);
    let scale: number = langruntime.checkedSignedSubtract(16, langruntime.f64ToI32(estimate));
    if (scale < baseScale) {
        scale = langruntime.checkedI32(baseScale);
    }
    if (scale < exponentScale) {
        scale = langruntime.checkedI32(exponentScale);
    }
    if (scale < 0) {
        scale = langruntime.checkedI32(0);
    }
    if (scale > 1000) {
        scale = langruntime.checkedI32(1000);
    }
    return scale;
}
function numericPowerInteger(base: NumericWork, exponent: number, exponentScale: number): checkruntime.NumericValue {
    base = copyNumericWork(base);
    exponent = langruntime.checkedI32(exponent);
    exponentScale = langruntime.checkedI32(exponentScale);
    const estimate: number = langruntime.f64Multiply(Number(langruntime.checkedI32(exponent)), numericPowerDecimalEstimate(copyNumericWork(base)));
    if (estimate > 131072.0) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
    }
    if (langruntime.f64Add(estimate, 1.0) < -1000.0) {
        return { kind: "Value", value: numericWorkText(numericWorkRounded(numericWorkFromValue("0"), 1000, 1)) };
    }
    const scale: number = numericPowerScale(estimate, base.scale, exponentScale);
    if (exponent === 0) {
        return numericWorkRound(numericWorkFromValue("1"), scale, 1);
    }
    if (exponent === 1) {
        return numericWorkRound(base, scale, 1);
    }
    if (exponent === langruntime.checkedSignedNegate(1)) {
        return numericWorkRound(numericDivisionWork(numericWorkFromValue("1"), base, scale, true), scale, 1);
    }
    if (exponent === 2) {
        return numericWorkRound(numericWorkProduct(copyNumericWork(base), base), scale, 1);
    }
    if (base.sign === 0) {
        return numericWorkRound(base, scale, 1);
    }
    let significant: number = langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(1, scale), langruntime.f64ToI32(estimate));
    significant = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedAdd(significant, langruntime.f64ToI32((langruntime.f64Ln(langruntime.f64Abs((Number(langruntime.checkedI32(exponent)))))))), 8));
    let negative: boolean = exponent < 0;
    let mask: bigint = BigInt(langruntime.checkedI32(exponent));
    if (negative) {
        mask = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, mask));
    }
    let product: NumericWork = copyNumericWork(base);
    let result: NumericWork = numericWorkFromValue("1");
    if (!(langruntime.checkedI64Remainder(mask, 2n) === 0n)) {
        result = copyNumericWork(base);
    }
    mask = langruntime.checkedI64(langruntime.checkedI64Divide(mask, 2n));
    while (mask > 0n) {
        let localScale: number = langruntime.checkedSignedSubtract(significant, langruntime.checkedSignedMultiply(numericMathGroupWeight(copyNumericWork(product)), 8));
        if (localScale > langruntime.checkedSignedMultiply(product.scale, 2)) {
            localScale = langruntime.checkedI32(langruntime.checkedSignedMultiply(product.scale, 2));
        }
        if (localScale < 0) {
            localScale = langruntime.checkedI32(0);
        }
        product = copyNumericWork(numericWorkRounded(numericWorkProduct(copyNumericWork(product), product), localScale, 1));
        if (!(langruntime.checkedI64Remainder(mask, 2n) === 0n)) {
            localScale = langruntime.checkedI32(langruntime.checkedSignedSubtract(significant, langruntime.checkedSignedMultiply((langruntime.checkedSignedAdd(numericMathGroupWeight(copyNumericWork(product)), numericMathGroupWeight(copyNumericWork(result)))), 4)));
            if (localScale > langruntime.checkedSignedAdd(product.scale, result.scale)) {
                localScale = langruntime.checkedI32(langruntime.checkedSignedAdd(product.scale, result.scale));
            }
            if (localScale < 0) {
                localScale = langruntime.checkedI32(0);
            }
            result = copyNumericWork(numericWorkRounded(numericWorkProduct(copyNumericWork(product), result), localScale, 1));
        }
        if (numericMathGroupWeight(copyNumericWork(product)) > 32767 || numericMathGroupWeight(copyNumericWork(result)) > 32767) {
            if (negative === false) {
                return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
            }
            result = copyNumericWork(numericWorkFromValue("0"));
            negative = langruntime.checkedBool(false);
            mask = langruntime.checkedI64(0n);
        }
        mask = langruntime.checkedI64(langruntime.checkedI64Divide(mask, 2n));
    }
    if (negative) {
        return numericWorkRound(numericDivisionWork(numericWorkFromValue("1"), result, scale, true), scale, 1);
    }
    return numericWorkRound(result, scale, 1);
}
function numericPowerFractional(base: NumericWork, exponent: NumericWork): checkruntime.NumericValue {
    base = copyNumericWork(base);
    exponent = copyNumericWork(exponent);
    if (base.sign === 0) {
        return numericWorkRound(base, 16, 1);
    }
    const negative: boolean = base.sign < 0 && numericPowerOdd(copyNumericWork(exponent));
    const positive: NumericWork = numericPowerPositive(base);
    const logarithmWeight: number = numericLogarithmWeight(copyNumericWork(positive));
    let localScale: number = langruntime.checkedSignedSubtract(8, logarithmWeight);
    if (localScale < 0) {
        localScale = langruntime.checkedI32(0);
    }
    const preliminaryLogarithm: NumericWork = numericLogarithmWork(copyNumericWork(positive), localScale);
    const preliminary: NumericWork = numericWorkRounded(numericWorkProduct(preliminaryLogarithm, copyNumericWork(exponent)), localScale, 1);
    const text: string = numericWorkText(preliminary);
    let estimate: number = langruntime.f64FromText(text, 0.0);
    if (langruntime.f64Abs(estimate) > 6020.0) {
        if (estimate > 0.0) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
        }
        return numericWorkRound(numericWorkFromValue("0"), 1000, 1);
    }
    estimate = langruntime.checkedF64(langruntime.f64Multiply(estimate, numericExpLog10E));
    const scale: number = numericPowerScale(estimate, positive.scale, exponent.scale);
    let significant: number = langruntime.checkedSignedAdd(scale, langruntime.f64ToI32(estimate));
    if (significant < 0) {
        significant = langruntime.checkedI32(0);
    }
    localScale = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(significant, logarithmWeight), 8));
    if (localScale < 0) {
        localScale = langruntime.checkedI32(0);
    }
    const logarithm: NumericWork = numericLogarithmWork(positive, localScale);
    const argument: NumericWork = numericWorkRounded(numericWorkProduct(logarithm, exponent), localScale, 1);
    const result: NumericWork = numericExponentialWork(argument, scale);
    if (result.valid === false) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
    }
    let sign: number = result.sign;
    if (negative && !(sign === 0)) {
        sign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
    }
    const signed: NumericWork = { valid: true, special: 1, sign: sign, weight: result.weight, scale: result.scale, digits: result.digits };
    return numericWorkRound(signed, scale, 1);
}
function numericPowerValues(base: NumericWork, exponent: NumericWork): checkruntime.NumericValue {
    base = copyNumericWork(base);
    exponent = copyNumericWork(exponent);
    const one: NumericWork = numericWorkFromValue("1");
    if (base.special === 3) {
        if (exponent.special === 1 && exponent.sign === 0) {
            return { kind: "Value", value: "1" };
        }
        return { kind: "Value", value: "NaN" };
    }
    if (exponent.special === 3) {
        if (base.special === 1 && base.sign === 1 && numericWorkMagnitude(copyNumericWork(base), copyNumericWork(one)) === 0) {
            return { kind: "Value", value: "1" };
        }
        return { kind: "Value", value: "NaN" };
    }
    const baseSign: number = numericPowerSign(copyNumericWork(base));
    const exponentSign: number = numericPowerSign(copyNumericWork(exponent));
    if ((baseSign === 0 && exponentSign < 0) || (baseSign < 0 && numericPowerIntegral(copyNumericWork(exponent)) === false)) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericPowerInvalidArgument) };
    }
    if (!(base.special === 1) || !(exponent.special === 1)) {
        if ((base.special === 1 && baseSign === 1 && numericWorkMagnitude(copyNumericWork(base), copyNumericWork(one)) === 0) || exponentSign === 0) {
            return { kind: "Value", value: "1" };
        }
        if (baseSign === 0 && exponentSign > 0) {
            return { kind: "Value", value: "0" };
        }
        if (!(exponent.special === 1)) {
            if (base.special === 1 && numericWorkMagnitude(copyNumericWork(base), copyNumericWork(one)) === 0) {
                return { kind: "Value", value: "1" };
            }
            const greater: boolean = !(base.special === 1) || numericWorkMagnitude(base, one) > 0;
            if (greater === (exponentSign > 0)) {
                return { kind: "Value", value: "Infinity" };
            }
            return { kind: "Value", value: "0" };
        }
        if (exponentSign < 0) {
            return { kind: "Value", value: "0" };
        }
        if (base.special === 0 && numericPowerOdd(exponent)) {
            return { kind: "Value", value: "-Infinity" };
        }
        return { kind: "Value", value: "Infinity" };
    }
    if (numericPowerIntegral(copyNumericWork(exponent)) && (exponent.sign === 0 || exponent.weight <= 9)) {
        const converted: checkruntime.Int8Value = numericIntegerValue({ kind: "Value", value: numericWorkText(copyNumericWork(exponent)) });
        if (converted.kind === "Value") {
            const value: bigint = langruntime.checkedI64(converted.value);
            if (value >= -2147483648n && value <= 2147483647n) {
                return numericPowerInteger(base, Number(BigInt.asIntN(32, langruntime.checkedI64(value))), exponent.scale);
            }
        }
    }
    return numericPowerFractional(base, exponent);
}
export function numericPowerN7g8(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
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
        const base: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const exponent: string = langruntime.checkedString(right.value);
            const first: NumericWork = numericWorkFromValue(base);
            const second: NumericWork = numericWorkFromValue(exponent);
            if (first.valid === false || second.valid === false) {
                return { kind: "Unknown" };
            }
            return numericPowerValues(first, second);
        }
    }
    return { kind: "Unknown" };
}
export function powerJfdf(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericPowerN7g8(left, right);
}
export function pow8fdt(left: checkruntime.NumericValue, right: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericPowerN7g8(left, right);
}
function numericRangeValues(value: string, base: string, offset: string, subtract: boolean, less: boolean): checkruntime.BoolValue {
    value = langruntime.checkedString(value);
    base = langruntime.checkedString(base);
    offset = langruntime.checkedString(offset);
    subtract = langruntime.checkedBool(subtract);
    less = langruntime.checkedBool(less);
    const input: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
    const center: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(base));
    const distance: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(offset));
    if (input.valid === false || center.valid === false || distance.valid === false) {
        return { kind: "Unknown" };
    }
    if (distance.special === 3 || distance.special === 0 || distance.sign < 0) {
        return { kind: "Error", value: checkruntime.makeSqlError(integerInvalidFrameSize) };
    }
    if (input.special === 3) {
        return { kind: "Value", value: center.special === 3 || less === false };
    }
    if (center.special === 3) {
        return { kind: "Value", value: less };
    }
    if (distance.special === 2) {
        if ((subtract && center.special === 2) || (subtract === false && center.special === 0)) {
            return { kind: "Value", value: true };
        }
        if (subtract) {
            return { kind: "Value", value: less === false || input.special === 0 };
        }
        return { kind: "Value", value: less || input.special === 2 };
    }
    if (input.special === 0 || input.special === 2) {
        if (input.special === center.special) {
            return { kind: "Value", value: true };
        }
        if (input.special === 0) {
            return { kind: "Value", value: less };
        }
        return { kind: "Value", value: less === false };
    }
    if (center.special === 0 || center.special === 2) {
        if (center.special === 0) {
            return { kind: "Value", value: less === false };
        }
        return { kind: "Value", value: less };
    }
    let mode: number = 0;
    if (subtract) {
        mode = langruntime.checkedI32(1);
    }
    const boundary: checkruntime.NumericValue = numericArithmetic(checkruntime.makeNumericValue(base), checkruntime.makeNumericValue(offset), mode);
    if (boundary.kind === "Error") {
        const error: checkruntime.SqlError = boundary.value;
        if (error.state === numericSupportRangeError) {
            return { kind: "Value", value: !(less === subtract) };
        }
        return { kind: "Error", value: error };
    }
    const compared: checkruntime.Int4Value = numericCompare(checkruntime.makeNumericValue(value), boundary);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        if (less) {
            return { kind: "Value", value: order <= 0 };
        }
        return { kind: "Value", value: order >= 0 };
    }
    return { kind: "Unknown" };
}
export function inRangeFhht(value: checkruntime.NumericValue, base: checkruntime.NumericValue, offset: checkruntime.NumericValue, subtract: checkruntime.BoolValue, less: checkruntime.BoolValue): checkruntime.BoolValue {
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (base.kind === "Error") {
        const error: checkruntime.SqlError = base.value;
        return { kind: "Error", value: error };
    }
    if (offset.kind === "Error") {
        const error: checkruntime.SqlError = offset.value;
        return { kind: "Error", value: error };
    }
    if (subtract.kind === "Error") {
        const error: checkruntime.SqlError = subtract.value;
        return { kind: "Error", value: error };
    }
    if (less.kind === "Error") {
        const error: checkruntime.SqlError = less.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(value, { kind: "Unknown" }) || checkruntime.equalNumericValue(base, { kind: "Unknown" }) || checkruntime.equalNumericValue(offset, { kind: "Unknown" }) || checkruntime.equalBoolValue(subtract, { kind: "Unknown" }) || checkruntime.equalBoolValue(less, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(value, { kind: "Null" }) || checkruntime.equalNumericValue(base, { kind: "Null" }) || checkruntime.equalNumericValue(offset, { kind: "Null" }) || checkruntime.equalBoolValue(subtract, { kind: "Null" }) || checkruntime.equalBoolValue(less, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const input: string = langruntime.checkedString(value.value);
        if (base.kind === "Value") {
            const center: string = langruntime.checkedString(base.value);
            if (offset.kind === "Value") {
                const distance: string = langruntime.checkedString(offset.value);
                if (subtract.kind === "Value") {
                    const sub: boolean = langruntime.checkedBool(subtract.value);
                    if (less.kind === "Value") {
                        const lower: boolean = langruntime.checkedBool(less.value);
                        return numericRangeValues(input, center, distance, sub, lower);
                    }
                }
            }
        }
    }
    return { kind: "Unknown" };
}
export function ceil8geh(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        return numericWorkRound(work, 0, 2);
    }
    return { kind: "Unknown" };
}
export function ceilingPr5v(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        return numericWorkRound(work, 0, 2);
    }
    return { kind: "Unknown" };
}
export function floorX7mh(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        return numericWorkRound(work, 0, 3);
    }
    return { kind: "Unknown" };
}
export function roundMmpo(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        return numericWorkRound(work, 0, 1);
    }
    return { kind: "Unknown" };
}
export function roundOtcq(input: checkruntime.NumericValue, scale: checkruntime.Int4Value): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (scale.kind === "Error") {
        const error: checkruntime.SqlError = scale.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(scale, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(scale, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (scale.kind === "Value") {
            const precision: number = langruntime.checkedI32(scale.value);
            return numericWorkRound(work, precision, 1);
        }
    }
    return { kind: "Unknown" };
}
export function truncDghz(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        return numericWorkRound(work, 0, 0);
    }
    return { kind: "Unknown" };
}
export function truncHay3(input: checkruntime.NumericValue, scale: checkruntime.Int4Value): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (scale.kind === "Error") {
        const error: checkruntime.SqlError = scale.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(scale, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(scale, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (scale.kind === "Value") {
            const precision: number = langruntime.checkedI32(scale.value);
            return numericWorkRound(work, precision, 0);
        }
    }
    return { kind: "Unknown" };
}
interface NumericWireDigit {
    value: number;
}
function copyNumericWireDigit(value: NumericWireDigit): NumericWireDigit {
    return { value: langruntime.checkedI32(value.value) };
}
function numericWireDecimalDigit(character: string): number {
    character = langruntime.checkedChar(character);
    const code: number = langruntime.checkedChar(character).codePointAt(0)!;
    if (code >= 48 && code <= 57) {
        return langruntime.checkedSignedSubtract(code, 48);
    }
    return langruntime.checkedSignedNegate(1);
}
function numericWireScale(input: string): number {
    input = langruntime.checkedString(input);
    const chars: string[] = Array.from(input);
    let index: number = 0;
    let point: boolean = false;
    let power: boolean = false;
    let fractional: number = 0;
    let exponent: number = 0;
    let sign: number = 1;
    while (index < chars.length) {
        const digit: number = numericWireDecimalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
        if (digit >= 0) {
            if (power) {
                exponent = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(exponent, 10), digit));
            }
            else if (point) {
                fractional = langruntime.checkedI32(langruntime.checkedSignedAdd(fractional, 1));
            }
        }
        else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === ".") {
            point = langruntime.checkedBool(true);
        }
        else if (langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "e" || langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "E") {
            power = langruntime.checkedBool(true);
        }
        else if (power && langruntime.indexChar(chars, langruntime.checkedIndex(index)) === "-") {
            sign = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
        }
        index = langruntime.checkedAdd(index, 1);
    }
    const scale: number = langruntime.checkedSignedSubtract(fractional, langruntime.checkedSignedMultiply(exponent, sign));
    if (scale < 0) {
        return 0;
    }
    return scale;
}
function numericWireWord(output: string, word: number): string {
    output = langruntime.checkedString(output);
    word = langruntime.checkedI32(word);
    let unsigned: number = word;
    if (word < 0) {
        unsigned = langruntime.checkedI32(langruntime.checkedSignedAdd(word, 65536));
    }
    const result: string = checkruntime.byteaAppendByte(output, langruntime.checkedSignedDivide(unsigned, 256));
    return checkruntime.byteaAppendByte(result, langruntime.checkedSignedRemainder(unsigned, 256));
}
export function numericSend3mnb(input: checkruntime.NumericValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
        if (layout.valid === false) {
            return { kind: "Unknown" };
        }
        let sign: number = 0;
        if (layout.special === 0) {
            sign = langruntime.checkedI32(61440);
        }
        else if (layout.special === 2) {
            sign = langruntime.checkedI32(53248);
        }
        else if (layout.special === 3) {
            sign = langruntime.checkedI32(49152);
        }
        else if (layout.sign < 0) {
            sign = langruntime.checkedI32(16384);
        }
        let scale: number = 0;
        if (layout.special === 0 || layout.special === 2) {
            scale = langruntime.checkedI32(32);
        }
        let weight: number = 0;
        let count: number = 0;
        let words: NumericWireDigit[] = [];
        if (layout.special === 1) {
            scale = langruntime.checkedI32(numericWireScale(value));
            if (!(layout.sign === 0)) {
                weight = langruntime.checkedI32(langruntime.checkedSignedDivide(layout.weight, 4));
                let remainder: number = langruntime.checkedSignedRemainder(layout.weight, 4);
                if (remainder < 0) {
                    weight = langruntime.checkedI32(langruntime.checkedSignedSubtract(weight, 1));
                    remainder = langruntime.checkedI32(langruntime.checkedSignedAdd(remainder, 4));
                }
                const chars: string[] = Array.from(value);
                let index: number = layout.first;
                let position: number = langruntime.checkedSignedSubtract(3, remainder);
                let group: number = 0;
                while (index < layout.end) {
                    const digit: number = numericWireDecimalDigit(langruntime.indexChar(chars, langruntime.checkedIndex(index)));
                    if (digit >= 0) {
                        group = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(group, 10), digit));
                        position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
                        if (position === 4) {
                            langruntime.pushStruct(words, { value: group }, copyNumericWireDigit);
                            count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
                            position = langruntime.checkedI32(0);
                            group = langruntime.checkedI32(0);
                        }
                    }
                    index = langruntime.checkedAdd(index, 1);
                }
                if (position > 0) {
                    while (position < 4) {
                        group = langruntime.checkedI32(langruntime.checkedSignedMultiply(group, 10));
                        position = langruntime.checkedI32(langruntime.checkedSignedAdd(position, 1));
                    }
                    langruntime.pushStruct(words, { value: group }, copyNumericWireDigit);
                    count = langruntime.checkedI32(langruntime.checkedSignedAdd(count, 1));
                }
            }
        }
        let output: string = "";
        output = langruntime.checkedString(numericWireWord(output, count));
        output = langruntime.checkedString(numericWireWord(output, weight));
        output = langruntime.checkedString(numericWireWord(output, sign));
        output = langruntime.checkedString(numericWireWord(output, scale));
        let index: number = 0;
        while (index < words.length) {
            output = langruntime.checkedString(numericWireWord(output, langruntime.indexStruct(words, langruntime.checkedIndex(index), copyNumericWireDigit).value));
            index = langruntime.checkedAdd(index, 1);
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
function numericSizeBelow(value: string, limit: string): boolean {
    value = langruntime.checkedString(value);
    limit = langruntime.checkedString(limit);
    return numericWorkMagnitude(numericWorkFromValue(value), numericWorkFromValue(limit)) < 0;
}
export function pgSizePrettyAxtn(input: checkruntime.NumericValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        let amount: string = numericWorkText(copyNumericWork(work));
        let unit: number = 0;
        if (!(work.special === 1)) {
            unit = langruntime.checkedIndex(5);
        }
        else if (numericSizeBelow(amount, "10240") === false) {
            const divided: checkruntime.NumericValue = numericDivision(checkruntime.makeNumericValue(amount), checkruntime.makeNumericValue("512"), 1);
            if (divided.kind === "Error") {
                const error: checkruntime.SqlError = divided.value;
                return { kind: "Error", value: error };
            }
            if (divided.kind === "Value") {
                const number: string = langruntime.checkedString(divided.value);
                amount = langruntime.checkedString(number);
            }
            unit = langruntime.checkedIndex(1);
            while (unit < 5 && numericSizeBelow(amount, "20479") === false) {
                const divided: checkruntime.NumericValue = numericDivision(checkruntime.makeNumericValue(amount), checkruntime.makeNumericValue("1024"), 1);
                if (divided.kind === "Error") {
                    const error: checkruntime.SqlError = divided.value;
                    return { kind: "Error", value: error };
                }
                if (divided.kind === "Value") {
                    const number: string = langruntime.checkedString(divided.value);
                    amount = langruntime.checkedString(number);
                }
                unit = langruntime.checkedAdd(unit, 1);
            }
            const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(amount));
            let subtract: number = 0;
            if (layout.sign < 0) {
                subtract = langruntime.checkedI32(1);
            }
            const adjusted: checkruntime.NumericValue = numericArithmetic(checkruntime.makeNumericValue(amount), checkruntime.makeNumericValue("1"), subtract);
            const rounded: checkruntime.NumericValue = numericDivision(adjusted, checkruntime.makeNumericValue("2"), 1);
            if (rounded.kind === "Error") {
                const error: checkruntime.SqlError = rounded.value;
                return { kind: "Error", value: error };
            }
            if (rounded.kind === "Value") {
                const number: string = langruntime.checkedString(rounded.value);
                amount = langruntime.checkedString(number);
            }
        }
        amount = amount + langruntime.checkedChar(" ");
        amount = amount + langruntime.indexStatic(integerSizeUnits, langruntime.checkedIndex(unit));
        return { kind: "Value", value: amount };
    }
    return { kind: "Unknown" };
}
const numericSqrtInvalidArgument = 3452595;
function numericSquareRootScaled(work: NumericWork, scale: number): NumericWork {
    work = copyNumericWork(work);
    scale = langruntime.checkedI32(scale);
    let weight: number = langruntime.checkedSignedDivide(work.weight, 2);
    if (langruntime.checkedSignedRemainder(work.weight, 2) < 0) {
        weight = langruntime.checkedI32(langruntime.checkedSignedSubtract(weight, 1));
    }
    const characters: string[] = Array.from(work.digits);
    let inputIndex: number = 0;
    let root: NumericWireDigit[] = [];
    langruntime.pushStruct(root, { value: 0 }, copyNumericWireDigit);
    let remainder: NumericWireDigit[] = [];
    langruntime.pushStruct(remainder, { value: 0 }, copyNumericWireDigit);
    let remainderLength: number = 1;
    let coefficient: string = "";
    let position: number = weight;
    while (position >= langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(0, scale), 1) && !(work.sign === 0)) {
        let pair: number = 0;
        let sourcePosition: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(position, 2), 1);
        let step: number = 0;
        while (step < 2) {
            pair = langruntime.checkedI32(langruntime.checkedSignedMultiply(pair, 10));
            if (sourcePosition <= work.weight && inputIndex < characters.length) {
                pair = langruntime.checkedI32(langruntime.checkedSignedAdd(pair, numericWireDecimalDigit(langruntime.indexChar(characters, langruntime.checkedIndex(inputIndex)))));
                inputIndex = langruntime.checkedAdd(inputIndex, 1);
            }
            sourcePosition = langruntime.checkedI32(langruntime.checkedSignedSubtract(sourcePosition, 1));
            step = langruntime.checkedI32(langruntime.checkedSignedAdd(step, 1));
        }
        let carry: number = pair;
        let cursor: number = 0;
        while (cursor < remainderLength) {
            const word: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value, 100), carry);
            remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit({ value: langruntime.checkedSignedRemainder(word, 10000) });
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(word, 10000));
            cursor = langruntime.checkedAdd(cursor, 1);
        }
        if (carry > 0) {
            if (remainderLength === remainder.length) {
                langruntime.pushStruct(remainder, { value: carry }, copyNumericWireDigit);
            }
            else {
                remainder[langruntime.checkedIndexIn(remainder, remainderLength)] = copyNumericWireDigit({ value: carry });
            }
            remainderLength = langruntime.checkedAdd(remainderLength, 1);
        }
        let digit: number = 9;
        let searching: boolean = true;
        while (searching) {
            let candidate: NumericWireDigit[] = [];
            carry = langruntime.checkedI32(langruntime.checkedSignedMultiply(digit, digit));
            cursor = langruntime.checkedIndex(0);
            while (cursor < root.length) {
                const word: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(root, langruntime.checkedIndex(cursor), copyNumericWireDigit).value, (langruntime.checkedSignedMultiply(20, digit))), carry);
                langruntime.pushStruct(candidate, { value: langruntime.checkedSignedRemainder(word, 10000) }, copyNumericWireDigit);
                carry = langruntime.checkedI32(langruntime.checkedSignedDivide(word, 10000));
                cursor = langruntime.checkedAdd(cursor, 1);
            }
            if (carry > 0) {
                langruntime.pushStruct(candidate, { value: carry }, copyNumericWireDigit);
            }
            let candidateLength: number = candidate.length;
            while (candidateLength > 1 && langruntime.indexStruct(candidate, langruntime.checkedIndex(langruntime.checkedSubtract(candidateLength, 1)), copyNumericWireDigit).value === 0) {
                candidateLength = langruntime.checkedIndex(langruntime.checkedSubtract(candidateLength, 1));
            }
            let order: number = 0;
            if (remainderLength < candidateLength) {
                order = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
            }
            if (remainderLength > candidateLength) {
                order = langruntime.checkedI32(1);
            }
            cursor = langruntime.checkedIndex(candidateLength);
            while (order === 0 && cursor > 0) {
                cursor = langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1));
                if (langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value < langruntime.indexStruct(candidate, langruntime.checkedIndex(cursor), copyNumericWireDigit).value) {
                    order = langruntime.checkedI32(langruntime.checkedSignedNegate(1));
                }
                if (langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value > langruntime.indexStruct(candidate, langruntime.checkedIndex(cursor), copyNumericWireDigit).value) {
                    order = langruntime.checkedI32(1);
                }
            }
            if (order >= 0) {
                let borrow: number = 0;
                cursor = langruntime.checkedIndex(0);
                while (cursor < remainderLength) {
                    let word: number = langruntime.checkedSignedSubtract(langruntime.indexStruct(remainder, langruntime.checkedIndex(cursor), copyNumericWireDigit).value, borrow);
                    if (cursor < candidateLength) {
                        word = langruntime.checkedI32(langruntime.checkedSignedSubtract(word, langruntime.indexStruct(candidate, langruntime.checkedIndex(cursor), copyNumericWireDigit).value));
                    }
                    borrow = langruntime.checkedI32(0);
                    if (word < 0) {
                        word = langruntime.checkedI32(langruntime.checkedSignedAdd(word, 10000));
                        borrow = langruntime.checkedI32(1);
                    }
                    remainder[langruntime.checkedIndexIn(remainder, cursor)] = copyNumericWireDigit({ value: word });
                    cursor = langruntime.checkedAdd(cursor, 1);
                }
                while (remainderLength > 1 && langruntime.indexStruct(remainder, langruntime.checkedIndex(langruntime.checkedSubtract(remainderLength, 1)), copyNumericWireDigit).value === 0) {
                    remainderLength = langruntime.checkedIndex(langruntime.checkedSubtract(remainderLength, 1));
                }
                searching = langruntime.checkedBool(false);
            }
            else {
                digit = langruntime.checkedI32(langruntime.checkedSignedSubtract(digit, 1));
            }
        }
        carry = langruntime.checkedI32(digit);
        cursor = langruntime.checkedIndex(0);
        while (cursor < root.length) {
            const word: number = langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply(langruntime.indexStruct(root, langruntime.checkedIndex(cursor), copyNumericWireDigit).value, 10), carry);
            root[langruntime.checkedIndexIn(root, cursor)] = copyNumericWireDigit({ value: langruntime.checkedSignedRemainder(word, 10000) });
            carry = langruntime.checkedI32(langruntime.checkedSignedDivide(word, 10000));
            cursor = langruntime.checkedAdd(cursor, 1);
        }
        if (carry > 0) {
            langruntime.pushStruct(root, { value: carry }, copyNumericWireDigit);
        }
        coefficient = coefficient + langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(digit, 48)), "0"));
        if (inputIndex >= characters.length && remainderLength === 1 && langruntime.indexStruct(remainder, langruntime.checkedIndex(0), copyNumericWireDigit).value === 0) {
            position = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(0, scale), 1));
        }
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    let sign: number = 1;
    if (coefficient === "") {
        sign = langruntime.checkedI32(0);
        weight = langruntime.checkedI32(0);
    }
    return numericWorkRounded({ valid: true, special: 1, sign: sign, weight: weight, scale: scale, digits: coefficient }, scale, 1);
}
function numericSquareRoot(work: NumericWork): checkruntime.NumericValue {
    work = copyNumericWork(work);
    let groupWeight: number = langruntime.checkedSignedDivide(work.weight, 4);
    if (langruntime.checkedSignedRemainder(work.weight, 4) < 0) {
        groupWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(groupWeight, 1));
    }
    let scale: number = langruntime.checkedSignedSubtract(15, langruntime.checkedSignedMultiply(groupWeight, 2));
    if (scale < work.scale) {
        scale = langruntime.checkedI32(work.scale);
    }
    if (scale < 0) {
        scale = langruntime.checkedI32(0);
    }
    if (scale > 1000) {
        scale = langruntime.checkedI32(1000);
    }
    const rounded: NumericWork = numericSquareRootScaled(work, scale);
    return { kind: "Value", value: numericWorkText(rounded) };
}
export function numericSqrtT0uy(input: checkruntime.NumericValue): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (work.special === 0 || (work.special === 1 && work.sign < 0)) {
            return { kind: "Error", value: checkruntime.makeSqlError(numericSqrtInvalidArgument) };
        }
        if (!(work.special === 1)) {
            return { kind: "Value", value: numericWorkText(work) };
        }
        return numericSquareRoot(work);
    }
    return { kind: "Unknown" };
}
export function sqrt2lic(input: checkruntime.NumericValue): checkruntime.NumericValue {
    return numericSqrtT0uy(input);
}
export function numeric879l(input: checkruntime.NumericValue, modifier: checkruntime.Int4Value): checkruntime.NumericValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (modifier.kind === "Error") {
        const error: checkruntime.SqlError = modifier.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(modifier, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalNumericValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(modifier, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const work: NumericWork = numericWorkFromValue(value);
        if (work.valid === false) {
            return { kind: "Unknown" };
        }
        if (modifier.kind === "Value") {
            const typmod: number = langruntime.checkedI32(modifier.value);
            if (typmod < 4 || work.special === 3) {
                return { kind: "Value", value: value };
            }
            if (!(work.special === 1)) {
                return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
            }
            const packed: number = langruntime.checkedSignedSubtract(typmod, 4);
            const precision: number = langruntime.checkedSignedDivide(packed, 65536);
            let scale: number = langruntime.checkedSignedRemainder(packed, 2048);
            if (scale >= 1024) {
                scale = langruntime.checkedI32(langruntime.checkedSignedSubtract(scale, 2048));
            }
            const rounded: checkruntime.NumericValue = numericWorkRound(work, scale, 1);
            if (rounded.kind === "Value") {
                const result: string = langruntime.checkedString(rounded.value);
                const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(result));
                if (!(layout.sign === 0) && langruntime.checkedSignedAdd(layout.weight, 1) > langruntime.checkedSignedSubtract(precision, scale)) {
                    return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
                }
                return { kind: "Value", value: result };
            }
            return rounded;
        }
    }
    return { kind: "Unknown" };
}
const numericSupportRangeError = 3452547;
interface NumericWork {
    valid: boolean;
    special: number;
    sign: number;
    weight: number;
    scale: number;
    digits: string;
}
function copyNumericWork(value: NumericWork): NumericWork {
    return { valid: langruntime.checkedBool(value.valid), special: langruntime.checkedI32(value.special), sign: langruntime.checkedI32(value.sign), weight: langruntime.checkedI32(value.weight), scale: langruntime.checkedI32(value.scale), digits: langruntime.checkedString(value.digits) };
}
function numericWorkFromValue(value: string): NumericWork {
    value = langruntime.checkedString(value);
    const layout: checkruntime.NumericLayout = checkruntime.copyNumericLayout(checkruntime.numericParts(value));
    let digits: string = "";
    let scale: number = 0;
    if (layout.valid && layout.special === 1) {
        scale = langruntime.checkedI32(numericWireScale(value));
        const characters: string[] = Array.from(value);
        let index: number = layout.first;
        while (index < layout.end) {
            const character: string = langruntime.indexChar(characters, langruntime.checkedIndex(index));
            if (numericWireDecimalDigit(character) >= 0) {
                digits = digits + langruntime.checkedChar(character);
            }
            index = langruntime.checkedAdd(index, 1);
        }
    }
    return { valid: layout.valid, special: layout.special, sign: layout.sign, weight: layout.weight, scale: scale, digits: digits };
}
function numericWorkZeros(count: number): string {
    count = langruntime.checkedI32(count);
    let remaining: number = count;
    let block: string = "0";
    let output: string = "";
    while (remaining > 0) {
        if (langruntime.checkedSignedRemainder(remaining, 2) === 1) {
            output = output + block;
        }
        remaining = langruntime.checkedI32(langruntime.checkedSignedDivide(remaining, 2));
        if (remaining > 0) {
            const copy: string = langruntime.checkedString(block);
            block = block + copy;
        }
    }
    return output;
}
function numericWorkText(work: NumericWork): string {
    work = copyNumericWork(work);
    if (work.special === 0) {
        return "-Infinity";
    }
    if (work.special === 2) {
        return "Infinity";
    }
    if (work.special === 3) {
        return "NaN";
    }
    const digits: string[] = Array.from(work.digits);
    let output: string = "";
    if (work.sign < 0) {
        output = output + langruntime.checkedChar("-");
    }
    if (work.sign === 0) {
        output = output + langruntime.checkedChar("0");
        if (work.scale > 0) {
            output = output + langruntime.checkedChar(".");
            output = output + numericWorkZeros(work.scale);
        }
        return output;
    }
    let index: number = 0;
    if (work.weight >= 0) {
        let length: number = 0;
        while (index < digits.length) {
            length = langruntime.checkedI32(langruntime.checkedSignedAdd(length, 1));
            index = langruntime.checkedAdd(index, 1);
        }
        index = langruntime.checkedIndex(0);
        let positions: number = langruntime.checkedSignedAdd(work.weight, 1);
        if (length <= positions) {
            output = output + work.digits;
            output = output + numericWorkZeros(langruntime.checkedSignedSubtract(positions, length));
            index = langruntime.checkedIndex(digits.length);
        }
        else {
            while (positions > 0) {
                output = output + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(index)));
                index = langruntime.checkedAdd(index, 1);
                positions = langruntime.checkedI32(langruntime.checkedSignedSubtract(positions, 1));
            }
        }
    }
    else {
        output = output + langruntime.checkedChar("0");
    }
    if (work.scale > 0) {
        output = output + langruntime.checkedChar(".");
        let positions: number = work.scale;
        if (work.weight < langruntime.checkedSignedNegate(1)) {
            let leading: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(0, work.weight), 1);
            if (leading > positions) {
                leading = langruntime.checkedI32(positions);
            }
            output = output + numericWorkZeros(leading);
            positions = langruntime.checkedI32(langruntime.checkedSignedSubtract(positions, leading));
        }
        while (positions > 0 && index < digits.length) {
            output = output + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(index)));
            index = langruntime.checkedAdd(index, 1);
            positions = langruntime.checkedI32(langruntime.checkedSignedSubtract(positions, 1));
        }
        output = output + numericWorkZeros(positions);
    }
    return output;
}
function numericWorkMinScale(work: NumericWork): number {
    work = copyNumericWork(work);
    if (work.sign === 0) {
        return 0;
    }
    const digits: string[] = Array.from(work.digits);
    let position: number = work.weight;
    let index: number = 0;
    while (index < digits.length) {
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
        index = langruntime.checkedAdd(index, 1);
    }
    const scale: number = langruntime.checkedSignedSubtract(langruntime.checkedSignedSubtract(0, position), 1);
    if (scale < 0) {
        return 0;
    }
    return scale;
}
function numericWorkRounded(work: NumericWork, scale: number, mode: number): NumericWork {
    work = copyNumericWork(work);
    scale = langruntime.checkedI32(scale);
    mode = langruntime.checkedI32(mode);
    const original: string[] = Array.from(work.digits);
    const boundary: number = langruntime.checkedSignedSubtract(0, scale);
    let digits: string[] = [];
    let position: number = work.weight;
    let index: number = 0;
    while (index < original.length && position >= boundary) {
        langruntime.pushChar(digits, langruntime.indexChar(original, langruntime.checkedIndex(index)));
        index = langruntime.checkedAdd(index, 1);
        position = langruntime.checkedI32(langruntime.checkedSignedSubtract(position, 1));
    }
    let increase: boolean = false;
    if (index < original.length) {
        if (mode === 1 && position === langruntime.checkedSignedSubtract(boundary, 1) && numericWireDecimalDigit(langruntime.indexChar(original, langruntime.checkedIndex(index))) >= 5) {
            increase = langruntime.checkedBool(true);
        }
        if (mode === 2 && work.sign > 0) {
            increase = langruntime.checkedBool(true);
        }
        if (mode === 3 && work.sign < 0) {
            increase = langruntime.checkedBool(true);
        }
    }
    let weight: number = work.weight;
    let leadingCarry: boolean = false;
    if (increase) {
        if (digits.length === 0) {
            langruntime.pushChar(digits, "1");
            weight = langruntime.checkedI32(boundary);
        }
        else {
            let carry: boolean = true;
            let cursor: number = digits.length;
            const symbols: string[] = Array.from("0123456789");
            while (cursor > 0 && carry) {
                cursor = langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1));
                if (langruntime.indexChar(digits, langruntime.checkedIndex(cursor)) === "9") {
                    digits[langruntime.checkedIndexIn(digits, cursor)] = langruntime.checkedChar("0");
                }
                else {
                    let symbol: number = 0;
                    while (!(langruntime.indexChar(symbols, langruntime.checkedIndex(symbol)) === langruntime.indexChar(digits, langruntime.checkedIndex(cursor)))) {
                        symbol = langruntime.checkedAdd(symbol, 1);
                    }
                    digits[langruntime.checkedIndexIn(digits, cursor)] = langruntime.checkedChar(langruntime.indexChar(symbols, langruntime.checkedIndex(langruntime.checkedAdd(symbol, 1))));
                    carry = langruntime.checkedBool(false);
                }
            }
            if (carry) {
                leadingCarry = langruntime.checkedBool(true);
                weight = langruntime.checkedI32(langruntime.checkedSignedAdd(weight, 1));
            }
        }
    }
    let end: number = digits.length;
    while (end > 0 && langruntime.indexChar(digits, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === "0") {
        end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
    }
    let coefficient: string = "";
    let cursor: number = 0;
    if (leadingCarry) {
        coefficient = coefficient + langruntime.checkedChar("1");
    }
    else {
        while (cursor < end) {
            coefficient = coefficient + langruntime.checkedChar(langruntime.indexChar(digits, langruntime.checkedIndex(cursor)));
            cursor = langruntime.checkedAdd(cursor, 1);
        }
    }
    let sign: number = work.sign;
    if (end === 0 && leadingCarry === false) {
        sign = langruntime.checkedI32(0);
        weight = langruntime.checkedI32(0);
    }
    let outputScale: number = scale;
    if (outputScale < 0) {
        outputScale = langruntime.checkedI32(0);
    }
    return { valid: true, special: 1, sign: sign, weight: weight, scale: outputScale, digits: coefficient };
}
function numericWorkRound(work: NumericWork, requested: number, mode: number): checkruntime.NumericValue {
    work = copyNumericWork(work);
    requested = langruntime.checkedI32(requested);
    mode = langruntime.checkedI32(mode);
    if (work.valid === false) {
        return { kind: "Unknown" };
    }
    if (!(work.special === 1)) {
        return { kind: "Value", value: numericWorkText(work) };
    }
    let scale: number = requested;
    let minimum: number = langruntime.checkedSignedNegate(131072);
    if (mode === 1) {
        minimum = langruntime.checkedI32(langruntime.checkedSignedSubtract(minimum, 1));
    }
    if (scale < minimum) {
        scale = langruntime.checkedI32(minimum);
    }
    if (scale > 16383) {
        scale = langruntime.checkedI32(16383);
    }
    const rounded: NumericWork = numericWorkRounded(work, scale, mode);
    if (rounded.weight > 131071) {
        return { kind: "Error", value: checkruntime.makeSqlError(numericSupportRangeError) };
    }
    return { kind: "Value", value: numericWorkText(rounded) };
}
export function int24eqCfkl(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4eqLrxe(leftWide, right);
}
export function int24geHurd(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4ge2xvk(leftWide, right);
}
export function int24gt98sb(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4gt5vlv(leftWide, right);
}
export function int24le56y6(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4le9wb6(leftWide, right);
}
export function int24ltGuxt(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4lt9gej(leftWide, right);
}
export function int24ne11ts(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4neQhun(leftWide, right);
}
export function int28eq47dr(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8eqJdhd(leftWide, right);
}
export function int28geXhie(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8geQfhv(leftWide, right);
}
export function int28gtXmpc(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8gt3ehj(leftWide, right);
}
export function int28leJsoj(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8le9fr4(leftWide, right);
}
export function int28ltF4ka(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8ltCryd(leftWide, right);
}
export function int28ne4fh8(left: checkruntime.Int2Value, right: checkruntime.Int8Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int8Value = checkruntime.int2ToInt8(left);
    return int8neUr2k(leftWide, right);
}
export function int2eqU7zv(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4eqLrxe(leftWide, rightWide);
}
export function int2geLd2i(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4ge2xvk(leftWide, rightWide);
}
export function int2gt681i(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4gt5vlv(leftWide, rightWide);
}
export function int2leEp4u(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4le9wb6(leftWide, rightWide);
}
export function int2ltQvze(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4lt9gej(leftWide, rightWide);
}
export function int2neUz14(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4neQhun(leftWide, rightWide);
}
export function int42eqRd78(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4eqLrxe(left, rightWide);
}
export function int42geT5ib(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4ge2xvk(left, rightWide);
}
export function int42gtBicd(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4gt5vlv(left, rightWide);
}
export function int42le570s(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4le9wb6(left, rightWide);
}
export function int42ltEtdm(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4lt9gej(left, rightWide);
}
export function int42neBeca(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4neQhun(left, rightWide);
}
export function int82eqJdpt(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8eqJdhd(left, rightWide);
}
export function int82geEh8t(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8geQfhv(left, rightWide);
}
export function int82gt7e3o(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8gt3ehj(left, rightWide);
}
export function int82leJth3(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8le9fr4(left, rightWide);
}
export function int82ltXt99(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8ltCryd(left, rightWide);
}
export function int82ne6rol(left: checkruntime.Int8Value, right: checkruntime.Int2Value): checkruntime.BoolValue {
    const rightWide: checkruntime.Int8Value = checkruntime.int2ToInt8(right);
    return int8neUr2k(left, rightWide);
}
function smallintResult(value: checkruntime.Int4Value): checkruntime.Int2Value {
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
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    const result: checkruntime.Int4Value = int4plSj3s(leftWide, rightWide);
    return smallintResult(result);
}
export function int2miUxzm(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    const result: checkruntime.Int4Value = int4miDtqk(leftWide, rightWide);
    return smallintResult(result);
}
export function int2mulK2lr(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    const result: checkruntime.Int4Value = int4mul284v(leftWide, rightWide);
    return smallintResult(result);
}
export function int2divFnwp(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    const result: checkruntime.Int4Value = int4div8ogr(leftWide, rightWide);
    return smallintResult(result);
}
export function int2modZds7(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    const result: checkruntime.Int4Value = int4modJ4pe(leftWide, rightWide);
    return smallintResult(result);
}
export function int2absTyad(input: checkruntime.Int2Value): checkruntime.Int2Value {
    const wide: checkruntime.Int4Value = checkruntime.int2ToInt4(input);
    const result: checkruntime.Int4Value = abs5ajw(wide);
    return smallintResult(result);
}
export function abs43i0(input: checkruntime.Int2Value): checkruntime.Int2Value {
    return int2absTyad(input);
}
export function modMzjb(left: checkruntime.Int2Value, right: checkruntime.Int2Value): checkruntime.Int2Value {
    return int2modZds7(left, right);
}
export function int2um8puj(input: checkruntime.Int2Value): checkruntime.Int2Value {
    const zero: checkruntime.Int4Value = checkruntime.makeInt4Value(0);
    const wide: checkruntime.Int4Value = checkruntime.int2ToInt4(input);
    const result: checkruntime.Int4Value = int4miDtqk(zero, wide);
    return smallintResult(result);
}
export function int2upNe4g(input: checkruntime.Int2Value): checkruntime.Int2Value {
    return input;
}
export function int24plIpr8(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4plSj3s(leftWide, right);
}
export function int42plCx9n(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4plSj3s(left, rightWide);
}
export function int24miClza(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4miDtqk(leftWide, right);
}
export function int42miNaln(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4miDtqk(left, rightWide);
}
export function int24mulRdky(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4mul284v(leftWide, right);
}
export function int42mulDh4o(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4mul284v(left, rightWide);
}
export function int24divY2zx(left: checkruntime.Int2Value, right: checkruntime.Int4Value): checkruntime.Int4Value {
    const leftWide: checkruntime.Int4Value = checkruntime.int2ToInt4(left);
    return int4div8ogr(leftWide, right);
}
export function int42div0fx0(left: checkruntime.Int4Value, right: checkruntime.Int2Value): checkruntime.Int4Value {
    const rightWide: checkruntime.Int4Value = checkruntime.int2ToInt4(right);
    return int4div8ogr(left, rightWide);
}
const temporalRangeError = 3452552;
export function dateBvna(left: checkruntime.TimestampValue): checkruntime.DateValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (leftValue === -9223372036854775808n) {
            return { kind: "Value", value: langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) };
        }
        if (leftValue === 9223372036854775807n) {
            return { kind: "Value", value: 2147483647 };
        }
        let days: bigint = langruntime.checkedI64Divide(leftValue, 86400000000n);
        if (leftValue < 0n && !(langruntime.checkedI64Remainder(leftValue, 86400000000n) === 0n)) {
            days = langruntime.checkedI64(langruntime.checkedI64Subtract(days, 1n));
        }
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(days))) };
    }
    return { kind: "Unknown" };
}
export function dateMiF4wh(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.Int4Value {
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
            if (leftValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) || leftValue === 2147483647 || rightValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) || rightValue === 2147483647) {
                return { kind: "Error", value: checkruntime.makeSqlError(temporalRangeError) };
            }
            return { kind: "Value", value: langruntime.checkedSignedSubtract(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function dateMiiL50u(left: checkruntime.DateValue, right: checkruntime.Int4Value): checkruntime.DateValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            if (leftValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) || leftValue === 2147483647) {
                return { kind: "Value", value: leftValue };
            }
            const result: bigint = langruntime.checkedI64Subtract((BigInt(langruntime.checkedI32(leftValue))), (BigInt(langruntime.checkedI32(rightValue))));
            if (result < -2451545n || result >= 2145031949n) {
                return { kind: "Error", value: checkruntime.makeSqlError(temporalRangeError) };
            }
            return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(result))) };
        }
    }
    return { kind: "Unknown" };
}
export function datePliPxlb(left: checkruntime.DateValue, right: checkruntime.Int4Value): checkruntime.DateValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            if (leftValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) || leftValue === 2147483647) {
                return { kind: "Value", value: leftValue };
            }
            const result: bigint = langruntime.checkedI64Add((BigInt(langruntime.checkedI32(leftValue))), (BigInt(langruntime.checkedI32(rightValue))));
            if (result < -2451545n || result >= 2145031949n) {
                return { kind: "Error", value: checkruntime.makeSqlError(temporalRangeError) };
            }
            return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(result))) };
        }
    }
    return { kind: "Unknown" };
}
export function integerPlDateFjuj(left: checkruntime.Int4Value, right: checkruntime.DateValue): checkruntime.DateValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            if (rightValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) || rightValue === 2147483647) {
                return { kind: "Value", value: rightValue };
            }
            const result: bigint = langruntime.checkedI64Add((BigInt(langruntime.checkedI32(rightValue))), (BigInt(langruntime.checkedI32(leftValue))));
            if (result < -2451545n || result >= 2145031949n) {
                return { kind: "Error", value: checkruntime.makeSqlError(temporalRangeError) };
            }
            return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(result))) };
        }
    }
    return { kind: "Unknown" };
}
export function timestampSwxj(left: checkruntime.DateValue): checkruntime.TimestampValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (leftValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) {
            return { kind: "Value", value: -9223372036854775808n };
        }
        if (leftValue === 2147483647) {
            return { kind: "Value", value: 9223372036854775807n };
        }
        if (leftValue >= 106751983) {
            return { kind: "Error", value: checkruntime.makeSqlError(temporalRangeError) };
        }
        return { kind: "Value", value: langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(leftValue))), 86400000000n) };
    }
    return { kind: "Unknown" };
}
function temporalCompare(left: bigint, right: bigint): number {
    left = langruntime.checkedI64(left);
    right = langruntime.checkedI64(right);
    if (left < right) {
        return langruntime.checkedSignedNegate(1);
    }
    if (left > right) {
        return 1;
    }
    return 0;
}
function temporalDateTimestampOrder(date: number, timestamp: bigint): number {
    date = langruntime.checkedI32(date);
    timestamp = langruntime.checkedI64(timestamp);
    if (date === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) {
        return temporalCompare(-9223372036854775808n, timestamp);
    }
    if (date === 2147483647) {
        return temporalCompare(9223372036854775807n, timestamp);
    }
    if (date >= 106751983) {
        if (timestamp === 9223372036854775807n) {
            return langruntime.checkedSignedNegate(1);
        }
        return 1;
    }
    return temporalCompare(langruntime.checkedI64Multiply((BigInt(langruntime.checkedI32(date))), 86400000000n), timestamp);
}
export function dateCmpTimestampPpmh(left: checkruntime.DateValue, right: checkruntime.TimestampValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: temporalDateTimestampOrder(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function dateEqTimestamp6d24(left: checkruntime.DateValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: temporalDateTimestampOrder(leftValue, rightValue) === 0 };
        }
    }
    return { kind: "Unknown" };
}
export function dateGeTimestampDx1w(left: checkruntime.DateValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: temporalDateTimestampOrder(leftValue, rightValue) >= 0 };
        }
    }
    return { kind: "Unknown" };
}
export function dateGtTimestamp0703(left: checkruntime.DateValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: temporalDateTimestampOrder(leftValue, rightValue) > 0 };
        }
    }
    return { kind: "Unknown" };
}
export function dateLeTimestampQ2yz(left: checkruntime.DateValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: temporalDateTimestampOrder(leftValue, rightValue) <= 0 };
        }
    }
    return { kind: "Unknown" };
}
export function dateLtTimestampJqrs(left: checkruntime.DateValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: temporalDateTimestampOrder(leftValue, rightValue) < 0 };
        }
    }
    return { kind: "Unknown" };
}
export function dateNeTimestampM0cz(left: checkruntime.DateValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalTimestampValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalTimestampValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return { kind: "Value", value: !(temporalDateTimestampOrder(leftValue, rightValue) === 0) };
        }
    }
    return { kind: "Unknown" };
}
export function timestampCmpDateRsh8(left: checkruntime.TimestampValue, right: checkruntime.DateValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: langruntime.checkedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) };
        }
    }
    return { kind: "Unknown" };
}
export function timestampEqDate7q7f(left: checkruntime.TimestampValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: langruntime.checkedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) === 0 };
        }
    }
    return { kind: "Unknown" };
}
export function timestampGeDate6d0e(left: checkruntime.TimestampValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: langruntime.checkedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) >= 0 };
        }
    }
    return { kind: "Unknown" };
}
export function timestampGtDatePh8t(left: checkruntime.TimestampValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: langruntime.checkedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) > 0 };
        }
    }
    return { kind: "Unknown" };
}
export function timestampLeDateSshx(left: checkruntime.TimestampValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: langruntime.checkedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) <= 0 };
        }
    }
    return { kind: "Unknown" };
}
export function timestampLtDate8wsq(left: checkruntime.TimestampValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: langruntime.checkedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) < 0 };
        }
    }
    return { kind: "Unknown" };
}
export function timestampNeDateBxi2(left: checkruntime.TimestampValue, right: checkruntime.DateValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalDateValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalDateValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            return { kind: "Value", value: !(langruntime.checkedSignedSubtract(0, temporalDateTimestampOrder(rightValue, leftValue)) === 0) };
        }
    }
    return { kind: "Unknown" };
}
const temporalExtractKeys: ReadonlyArray<string> = ["+infinity", "-infinity", "allballs", "dow", "doy", "epoch", "infinity", "isodow", "isoyear", "j", "jd", "julian", "mm", "now", "today", "tomorrow", "yesterday"];
const temporalExtractCodes: ReadonlyArray<number> = [-1, -1, -1, 16, 18, 19, -1, 17, 15, 14, 14, 14, 4, -1, -1, -1, -1];
function temporalExtractCode(value: string): number {
    value = langruntime.checkedString(value);
    const unit: number = temporalUnitCode(value);
    if (!(unit === 0)) {
        return unit;
    }
    const characters: string[] = Array.from(value);
    let key: string = "";
    let index: number = 0;
    while (index < characters.length && index < 10) {
        key = key + langruntime.checkedChar(langruntime.asciiLowercase(langruntime.indexChar(characters, langruntime.checkedIndex(index))));
        index = langruntime.checkedAdd(index, 1);
    }
    let entry: number = 0;
    while (entry < temporalExtractKeys.length) {
        if (key === langruntime.indexStatic(temporalExtractKeys, langruntime.checkedIndex(entry))) {
            return langruntime.indexStatic(temporalExtractCodes, langruntime.checkedIndex(entry));
        }
        entry = langruntime.checkedAdd(entry, 1);
    }
    return 0;
}
function temporalJulianFromCalendar(year: number, month: number, day: number): bigint {
    year = langruntime.checkedI32(year);
    month = langruntime.checkedI32(month);
    day = langruntime.checkedI32(day);
    let y: bigint = BigInt(langruntime.checkedI32(year));
    let m: bigint = BigInt(langruntime.checkedI32(month));
    if (month > 2) {
        m = langruntime.checkedI64(langruntime.checkedI64Add(m, 1n));
        y = langruntime.checkedI64(langruntime.checkedI64Add(y, 4800n));
    }
    else {
        m = langruntime.checkedI64(langruntime.checkedI64Add(m, 13n));
        y = langruntime.checkedI64(langruntime.checkedI64Add(y, 4799n));
    }
    const century: bigint = langruntime.checkedI64Divide(y, 100n);
    const d: bigint = BigInt(langruntime.checkedI32(day));
    return langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Subtract(langruntime.checkedI64Add(langruntime.checkedI64Subtract(langruntime.checkedI64Multiply(y, 365n), 32167n), langruntime.checkedI64Divide(y, 4n)), century), langruntime.checkedI64Divide(century, 4n)), langruntime.checkedI64Divide(langruntime.checkedI64Multiply(7834n, m), 256n)), d);
}
function temporalExtractDate(value: number, code: number): checkruntime.NumericValue {
    value = langruntime.checkedI32(value);
    code = langruntime.checkedI32(code);
    if (code === 0 || code === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: checkruntime.makeSqlError(temporalFieldUnitError) };
    }
    if (code === langruntime.checkedSignedNegate(1) || code < 6) {
        return { kind: "Error", value: checkruntime.makeSqlError(temporalFieldUnsupportedError) };
    }
    if (value === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1) || value === 2147483647) {
        if (code === 6 || code === 7 || code === 8 || code === 9 || code === 16 || code === 17 || code === 18) {
            return { kind: "Null" };
        }
        if (value < 0) {
            return { kind: "Value", value: "-Infinity" };
        }
        return { kind: "Value", value: "Infinity" };
    }
    const date: bigint = BigInt(langruntime.checkedI32(value));
    if (code === 19) {
        return { kind: "Value", value: checkruntime.textSignedNumber(langruntime.checkedI64Multiply((langruntime.checkedI64Add(date, 10957n)), 86400n)) };
    }
    const julian: bigint = langruntime.checkedI64Add(date, 2451545n);
    if (code === 14) {
        return { kind: "Value", value: checkruntime.textSignedNumber(julian) };
    }
    const calendar: TemporalCalendarFields = copyTemporalCalendarFields(temporalCalendarFromJulian(julian));
    let result: bigint = 0n;
    if (code === 6) {
        result = langruntime.checkedI64(BigInt(langruntime.checkedI32(calendar.day)));
    }
    if (code === 8) {
        result = langruntime.checkedI64(BigInt(langruntime.checkedI32(calendar.month)));
    }
    if (code === 9) {
        result = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedSignedAdd(langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(calendar.month, 1)), 3), 1)))));
    }
    if (code === 10) {
        result = langruntime.checkedI64(BigInt(langruntime.checkedI32(calendar.year)));
        if (result <= 0n) {
            result = langruntime.checkedI64(langruntime.checkedI64Subtract(result, 1n));
        }
    }
    if (code === 11) {
        if (calendar.year >= 0) {
            result = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedSignedDivide(calendar.year, 10)))));
        }
        else {
            result = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedSignedSubtract(0, (langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(8, (langruntime.checkedSignedSubtract(calendar.year, 1)))), 10)))))));
        }
    }
    if (code === 12) {
        if (calendar.year > 0) {
            result = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(calendar.year, 99)), 100)))));
        }
        else {
            result = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedSignedSubtract(0, (langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(99, (langruntime.checkedSignedSubtract(calendar.year, 1)))), 100)))))));
        }
    }
    if (code === 13) {
        if (calendar.year > 0) {
            result = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(calendar.year, 999)), 1000)))));
        }
        else {
            result = langruntime.checkedI64(BigInt(langruntime.checkedI32((langruntime.checkedSignedSubtract(0, (langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(999, (langruntime.checkedSignedSubtract(calendar.year, 1)))), 1000)))))));
        }
    }
    if (code === 7 || code === 15) {
        const thursday: bigint = langruntime.checkedI64Subtract(langruntime.checkedI64Add(julian, 3n), langruntime.checkedI64Remainder(julian, 7n));
        const iso: TemporalCalendarFields = copyTemporalCalendarFields(temporalCalendarFromJulian(thursday));
        if (code === 7) {
            result = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Divide((langruntime.checkedI64Subtract(thursday, temporalJulianFromCalendar(iso.year, 1, 1))), 7n), 1n));
        }
        else {
            result = langruntime.checkedI64(BigInt(langruntime.checkedI32(iso.year)));
            if (result <= 0n) {
                result = langruntime.checkedI64(langruntime.checkedI64Subtract(result, 1n));
            }
        }
    }
    if (code === 16 || code === 17) {
        result = langruntime.checkedI64(langruntime.checkedI64Remainder((langruntime.checkedI64Add(julian, 1n)), 7n));
        if (code === 17 && result === 0n) {
            result = langruntime.checkedI64(7n);
        }
    }
    if (code === 18) {
        result = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Subtract(julian, temporalJulianFromCalendar(calendar.year, 1, 1)), 1n));
    }
    return { kind: "Value", value: checkruntime.textSignedNumber(result) };
}
export function extractQjml(units: checkruntime.TextValue, input: checkruntime.DateValue): checkruntime.NumericValue {
    if (units.kind === "Error") {
        const error: checkruntime.SqlError = units.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(units, { kind: "Unknown" }) || checkruntime.equalDateValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(units, { kind: "Null" }) || checkruntime.equalDateValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (units.kind === "Value") {
        const unit: string = langruntime.checkedString(units.value);
        if (input.kind === "Value") {
            const value: number = langruntime.checkedI32(input.value);
            return temporalExtractDate(value, temporalExtractCode(unit));
        }
    }
    return { kind: "Unknown" };
}
const temporalFieldUnitError = 3452619;
const temporalFieldUnsupportedError = 466560;
const temporalUnitKeys: ReadonlyArray<string> = ["@", "ago", "c", "cent", "centuries", "century", "d", "day", "days", "dec", "decade", "decades", "decs", "h", "hour", "hours", "hr", "hrs", "m", "microsecon", "mil", "millennia", "millennium", "millisecon", "mils", "min", "mins", "minute", "minutes", "mon", "mons", "month", "months", "ms", "msec", "msecond", "mseconds", "msecs", "qtr", "quarter", "s", "sec", "second", "seconds", "secs", "timezone", "timezone_h", "timezone_m", "us", "usec", "usecond", "useconds", "usecs", "w", "week", "weeks", "y", "year", "years", "yr", "yrs"];
const temporalUnitCodes: ReadonlyArray<number> = [-2, -2, 12, 12, 12, 12, 6, 6, 6, 11, 11, 11, 11, 5, 5, 5, 5, 5, 4, 1, 13, 13, 13, 2, 13, 4, 4, 4, 4, 8, 8, 8, 8, 2, 2, 2, 2, 2, 9, 9, 3, 3, 3, 3, 3, -1, -1, -1, 1, 1, 1, 1, 1, 7, 7, 7, 10, 10, 10, 10, 10];
function temporalUnitCode(value: string): number {
    value = langruntime.checkedString(value);
    const characters: string[] = Array.from(value);
    let key: string = "";
    let index: number = 0;
    while (index < characters.length && index < 10) {
        key = key + langruntime.checkedChar(langruntime.asciiLowercase(langruntime.indexChar(characters, langruntime.checkedIndex(index))));
        index = langruntime.checkedAdd(index, 1);
    }
    let entry: number = 0;
    while (entry < temporalUnitKeys.length) {
        if (key === langruntime.indexStatic(temporalUnitKeys, langruntime.checkedIndex(entry))) {
            return langruntime.indexStatic(temporalUnitCodes, langruntime.checkedIndex(entry));
        }
        entry = langruntime.checkedAdd(entry, 1);
    }
    return 0;
}
interface TemporalCalendarFields {
    year: number;
    month: number;
    day: number;
}
function copyTemporalCalendarFields(value: TemporalCalendarFields): TemporalCalendarFields {
    return { year: langruntime.checkedI32(value.year), month: langruntime.checkedI32(value.month), day: langruntime.checkedI32(value.day) };
}
function temporalCalendarFromJulian(day: bigint): TemporalCalendarFields {
    day = langruntime.checkedI64(day);
    let julian: bigint = langruntime.checkedI64Add(day, 32044n);
    let quad: bigint = langruntime.checkedI64Divide(julian, 146097n);
    const extra: bigint = langruntime.checkedI64Add(langruntime.checkedI64Multiply((langruntime.checkedI64Subtract(julian, langruntime.checkedI64Multiply(quad, 146097n))), 4n), 3n);
    julian = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Add(julian, 60n), langruntime.checkedI64Multiply(quad, 3n)), langruntime.checkedI64Divide(extra, 146097n)));
    quad = langruntime.checkedI64(langruntime.checkedI64Divide(julian, 1461n));
    julian = langruntime.checkedI64(langruntime.checkedI64Subtract(julian, langruntime.checkedI64Multiply(quad, 1461n)));
    let year: bigint = langruntime.checkedI64Divide(langruntime.checkedI64Multiply(julian, 4n), 1461n);
    if (!(year === 0n)) {
        julian = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Remainder((langruntime.checkedI64Add(julian, 305n)), 365n), 123n));
    }
    else {
        julian = langruntime.checkedI64(langruntime.checkedI64Add(langruntime.checkedI64Remainder((langruntime.checkedI64Add(julian, 306n)), 366n), 123n));
    }
    year = langruntime.checkedI64(langruntime.checkedI64Add(year, langruntime.checkedI64Multiply(quad, 4n)));
    quad = langruntime.checkedI64(langruntime.checkedI64Divide(langruntime.checkedI64Multiply(julian, 2141n), 65536n));
    return { year: Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Subtract(year, 4800n))))), month: Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Add(langruntime.checkedI64Remainder((langruntime.checkedI64Add(quad, 10n)), 12n), 1n))))), day: Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Subtract(julian, langruntime.checkedI64Divide(langruntime.checkedI64Multiply(7834n, quad), 256n)))))) };
}
function temporalTruncateTimestamp(value: bigint, code: number): checkruntime.TimestampValue {
    value = langruntime.checkedI64(value);
    code = langruntime.checkedI32(code);
    if (code <= 0) {
        if (code === langruntime.checkedSignedNegate(1)) {
            return { kind: "Error", value: checkruntime.makeSqlError(temporalFieldUnsupportedError) };
        }
        return { kind: "Error", value: checkruntime.makeSqlError(temporalFieldUnitError) };
    }
    if (value === -9223372036854775808n || value === 9223372036854775807n || code === 1) {
        return { kind: "Value", value: value };
    }
    let scale: bigint = 86400000000n;
    if (code === 2) {
        scale = langruntime.checkedI64(1000n);
    }
    if (code === 3) {
        scale = langruntime.checkedI64(1000000n);
    }
    if (code === 4) {
        scale = langruntime.checkedI64(60000000n);
    }
    if (code === 5) {
        scale = langruntime.checkedI64(3600000000n);
    }
    if (code <= 6) {
        let result: bigint = langruntime.checkedI64Multiply((langruntime.checkedI64Divide(value, scale)), scale);
        if (langruntime.checkedI64Remainder(value, scale) < 0n) {
            result = langruntime.checkedI64(langruntime.checkedI64Subtract(result, scale));
        }
        return { kind: "Value", value: result };
    }
    let day: bigint = langruntime.checkedI64Divide(value, 86400000000n);
    if (langruntime.checkedI64Remainder(value, 86400000000n) < 0n) {
        day = langruntime.checkedI64(langruntime.checkedI64Subtract(day, 1n));
    }
    const julian: bigint = langruntime.checkedI64Add(day, 2451545n);
    if (code === 7) {
        let weekday: bigint = langruntime.checkedI64Remainder(julian, 7n);
        if (weekday < 0n) {
            weekday = langruntime.checkedI64(langruntime.checkedI64Add(weekday, 7n));
        }
        return { kind: "Value", value: langruntime.checkedI64Multiply((langruntime.checkedI64Subtract(day, weekday)), 86400000000n) };
    }
    const calendar: TemporalCalendarFields = copyTemporalCalendarFields(temporalCalendarFromJulian(julian));
    let year: number = calendar.year;
    let month: number = calendar.month;
    if (code === 9) {
        month = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedMultiply((langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(month, 1)), 3)), 3), 1));
    }
    if (code >= 10) {
        month = langruntime.checkedI32(1);
    }
    if (code === 11) {
        if (year > 0) {
            year = langruntime.checkedI32(langruntime.checkedSignedMultiply((langruntime.checkedSignedDivide(year, 10)), 10));
        }
        else {
            year = langruntime.checkedI32(langruntime.checkedSignedSubtract(0, langruntime.checkedSignedMultiply((langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(8, (langruntime.checkedSignedSubtract(year, 1)))), 10)), 10)));
        }
    }
    if (code === 12) {
        if (year > 0) {
            year = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedMultiply((langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(year, 99)), 100)), 100), 99));
        }
        else {
            year = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(0, langruntime.checkedSignedMultiply((langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(99, (langruntime.checkedSignedSubtract(year, 1)))), 100)), 100)), 1));
        }
    }
    if (code === 13) {
        if (year > 0) {
            year = langruntime.checkedI32(langruntime.checkedSignedSubtract(langruntime.checkedSignedMultiply((langruntime.checkedSignedDivide((langruntime.checkedSignedAdd(year, 999)), 1000)), 1000), 999));
        }
        else {
            year = langruntime.checkedI32(langruntime.checkedSignedAdd(langruntime.checkedSignedSubtract(0, langruntime.checkedSignedMultiply((langruntime.checkedSignedDivide((langruntime.checkedSignedSubtract(999, (langruntime.checkedSignedSubtract(year, 1)))), 1000)), 1000)), 1));
        }
    }
    const truncatedJulian: bigint = temporalJulianFromCalendar(year, month, 1);
    return { kind: "Value", value: langruntime.checkedI64Multiply((langruntime.checkedI64Subtract(truncatedJulian, 2451545n)), 86400000000n) };
}
export function dateTrunc3i0u(units: checkruntime.TextValue, input: checkruntime.TimestampValue): checkruntime.TimestampValue {
    if (units.kind === "Error") {
        const error: checkruntime.SqlError = units.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(units, { kind: "Unknown" }) || checkruntime.equalTimestampValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(units, { kind: "Null" }) || checkruntime.equalTimestampValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (units.kind === "Value") {
        const unit: string = langruntime.checkedString(units.value);
        if (input.kind === "Value") {
            const value: bigint = langruntime.checkedI64(input.value);
            const truncated: checkruntime.TimestampValue = temporalTruncateTimestamp(value, temporalUnitCode(unit));
            if (truncated.kind === "Value") {
                const result: bigint = langruntime.checkedI64(truncated.value);
                return checkruntime.makeTimestampValue(result);
            }
            return truncated;
        }
    }
    return { kind: "Unknown" };
}
const temporalPrecisionError = 3452619;
function temporalAdjustPrecision(value: bigint, precision: number): checkruntime.Int8Value {
    value = langruntime.checkedI64(value);
    precision = langruntime.checkedI32(precision);
    if (value === -9223372036854775808n || value === 9223372036854775807n || precision === langruntime.checkedSignedNegate(1) || precision === 6) {
        return { kind: "Value", value: value };
    }
    if (precision < 0 || precision > 6) {
        return { kind: "Error", value: checkruntime.makeSqlError(temporalPrecisionError) };
    }
    let scale: bigint = 1000000n;
    let index: number = 0;
    while (index < precision) {
        scale = langruntime.checkedI64(langruntime.checkedI64Divide(scale, 10n));
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    const offset: bigint = langruntime.checkedI64Divide(scale, 2n);
    if (value < 0n) {
        return { kind: "Value", value: langruntime.checkedI64Subtract(0n, langruntime.checkedI64Multiply((langruntime.checkedI64Divide((langruntime.checkedI64Add((langruntime.checkedI64Subtract(0n, value)), offset)), scale)), scale)) };
    }
    return { kind: "Value", value: langruntime.checkedI64Multiply((langruntime.checkedI64Divide((langruntime.checkedI64Add(value, offset)), scale)), scale) };
}
export function timestampAkly(left: checkruntime.TimestampValue, right: checkruntime.Int4Value): checkruntime.TimestampValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const result: checkruntime.Int8Value = temporalAdjustPrecision(leftValue, rightValue);
            if (result.kind === "Error") {
                const error: checkruntime.SqlError = result.value;
                return { kind: "Error", value: error };
            }
            if (result.kind === "Value") {
                const value: bigint = langruntime.checkedI64(result.value);
                return { kind: "Value", value: value };
            }
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzUwsx(left: checkruntime.TimestamptzValue, right: checkruntime.Int4Value): checkruntime.TimestamptzValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalInt4Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalInt4Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: number = langruntime.checkedI32(right.value);
            const result: checkruntime.Int8Value = temporalAdjustPrecision(leftValue, rightValue);
            if (result.kind === "Error") {
                const error: checkruntime.SqlError = result.value;
                return { kind: "Error", value: error };
            }
            if (result.kind === "Value") {
                const value: bigint = langruntime.checkedI64(result.value);
                return { kind: "Value", value: value };
            }
        }
    }
    return { kind: "Unknown" };
}
export function dateCmpU18z(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.Int4Value {
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
            return { kind: "Value", value: temporalCompare(BigInt(langruntime.checkedI32(leftValue)), BigInt(langruntime.checkedI32(rightValue))) };
        }
    }
    return { kind: "Unknown" };
}
export function dateLargerXxhy(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.DateValue {
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
            if (leftValue > rightValue) {
                return { kind: "Value", value: leftValue };
            }
            return { kind: "Value", value: rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function dateSmallerE286(left: checkruntime.DateValue, right: checkruntime.DateValue): checkruntime.DateValue {
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
            if (leftValue < rightValue) {
                return { kind: "Value", value: leftValue };
            }
            return { kind: "Value", value: rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function hashdateKnfp(left: checkruntime.DateValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        return hashint4Zr00({ kind: "Value", value: leftValue });
    }
    return { kind: "Unknown" };
}
export function hashdateextended863n(left: checkruntime.DateValue, right: checkruntime.Int8Value): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return hashint4extendedXf6v({ kind: "Value", value: leftValue }, { kind: "Value", value: rightValue });
        }
    }
    return { kind: "Unknown" };
}
export function isfinite2dqo(left: checkruntime.DateValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalDateValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalDateValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: number = langruntime.checkedI32(left.value);
        return { kind: "Value", value: !(leftValue === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) && !(leftValue === 2147483647) };
    }
    return { kind: "Unknown" };
}
export function isfiniteCdmf(left: checkruntime.TimestamptzValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        return { kind: "Value", value: !(leftValue === -9223372036854775808n) && !(leftValue === 9223372036854775807n) };
    }
    return { kind: "Unknown" };
}
export function isfinite4zxx(left: checkruntime.TimestampValue): checkruntime.BoolValue {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        return { kind: "Value", value: !(leftValue === -9223372036854775808n) && !(leftValue === 9223372036854775807n) };
    }
    return { kind: "Unknown" };
}
export function timestampCmpLpkm(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.Int4Value {
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
            return { kind: "Value", value: temporalCompare(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function timestampHash71nv(left: checkruntime.TimestampValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        return hashint83wid({ kind: "Value", value: leftValue });
    }
    return { kind: "Unknown" };
}
export function timestampHashExtendedXc4h(left: checkruntime.TimestampValue, right: checkruntime.Int8Value): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestampValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return hashint8extendedFrvh({ kind: "Value", value: leftValue }, { kind: "Value", value: rightValue });
        }
    }
    return { kind: "Unknown" };
}
export function timestampLargerUtuv(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.TimestampValue {
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
            if (leftValue > rightValue) {
                return { kind: "Value", value: leftValue };
            }
            return { kind: "Value", value: rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestampSmaller5aln(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.TimestampValue {
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
            if (leftValue < rightValue) {
                return { kind: "Value", value: leftValue };
            }
            return { kind: "Value", value: rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzCmpCa0r(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.Int4Value {
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
            return { kind: "Value", value: temporalCompare(leftValue, rightValue) };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzHashUsaa(left: checkruntime.TimestamptzValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        return hashint83wid({ kind: "Value", value: leftValue });
    }
    return { kind: "Unknown" };
}
export function timestamptzHashExtendedVeri(left: checkruntime.TimestamptzValue, right: checkruntime.Int8Value): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTimestamptzValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const leftValue: bigint = langruntime.checkedI64(left.value);
        if (right.kind === "Value") {
            const rightValue: bigint = langruntime.checkedI64(right.value);
            return hashint8extendedFrvh({ kind: "Value", value: leftValue }, { kind: "Value", value: rightValue });
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzLarger63cv(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.TimestamptzValue {
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
            if (leftValue > rightValue) {
                return { kind: "Value", value: leftValue };
            }
            return { kind: "Value", value: rightValue };
        }
    }
    return { kind: "Unknown" };
}
export function timestamptzSmallerLbk9(left: checkruntime.TimestamptzValue, right: checkruntime.TimestamptzValue): checkruntime.TimestamptzValue {
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
            if (leftValue < rightValue) {
                return { kind: "Value", value: leftValue };
            }
            return { kind: "Value", value: rightValue };
        }
    }
    return { kind: "Unknown" };
}
function temporalDecimalParts(whole: bigint, fraction: bigint, scale: number, negativeZero: boolean): string {
    whole = langruntime.checkedI64(whole);
    fraction = langruntime.checkedI64(fraction);
    scale = langruntime.checkedI32(scale);
    negativeZero = langruntime.checkedBool(negativeZero);
    let output: string = "";
    if (negativeZero) {
        output = output + langruntime.checkedChar("-");
    }
    const integer: string = checkruntime.textSignedNumber(whole);
    output = output + integer;
    if (scale > 0) {
        output = output + langruntime.checkedChar(".");
        let divisor: bigint = 1n;
        let index: number = 1;
        while (index < scale) {
            divisor = langruntime.checkedI64(langruntime.checkedI64Multiply(divisor, 10n));
            index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
        }
        let remaining: bigint = fraction;
        while (divisor > 0n) {
            const digit: bigint = langruntime.checkedI64Divide(remaining, divisor);
            const code: number = Number(BigInt.asIntN(32, langruntime.checkedI64(digit)));
            const character: string = langruntime.characterFromI32((langruntime.checkedSignedAdd(code, 48)), "0");
            output = output + langruntime.checkedChar(character);
            remaining = langruntime.checkedI64(langruntime.checkedI64Remainder(remaining, divisor));
            divisor = langruntime.checkedI64(langruntime.checkedI64Divide(divisor, 10n));
        }
    }
    return output;
}
function temporalScaledNumber(value: bigint, scale: number): checkruntime.NumericValue {
    value = langruntime.checkedI64(value);
    scale = langruntime.checkedI32(scale);
    let divisor: bigint = 1n;
    let index: number = 0;
    while (index < scale) {
        divisor = langruntime.checkedI64(langruntime.checkedI64Multiply(divisor, 10n));
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    const whole: bigint = langruntime.checkedI64Divide(value, divisor);
    let fraction: bigint = langruntime.checkedI64Remainder(value, divisor);
    if (fraction < 0n) {
        fraction = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, fraction));
    }
    return { kind: "Value", value: temporalDecimalParts(whole, fraction, scale, value < 0n && whole === 0n) };
}
function temporalTimestampEpoch(value: bigint): checkruntime.NumericValue {
    value = langruntime.checkedI64(value);
    let whole: bigint = langruntime.checkedI64Add(langruntime.checkedI64Divide(value, 1000000n), 946684800n);
    let fraction: bigint = langruntime.checkedI64Remainder(value, 1000000n);
    if (fraction < 0n) {
        whole = langruntime.checkedI64(langruntime.checkedI64Subtract(whole, 1n));
        fraction = langruntime.checkedI64(langruntime.checkedI64Add(fraction, 1000000n));
    }
    if (value >= 9222425352054775807n) {
        fraction = langruntime.checkedI64(langruntime.checkedI64Multiply((langruntime.checkedI64Divide((langruntime.checkedI64Add(fraction, 50n)), 100n)), 100n));
        if (fraction === 1000000n) {
            whole = langruntime.checkedI64(langruntime.checkedI64Add(whole, 1n));
            fraction = langruntime.checkedI64(0n);
        }
    }
    const negative: boolean = whole < 0n;
    if (negative && !(fraction === 0n)) {
        whole = langruntime.checkedI64(langruntime.checkedI64Add(whole, 1n));
        fraction = langruntime.checkedI64(langruntime.checkedI64Subtract(1000000n, fraction));
    }
    return { kind: "Value", value: temporalDecimalParts(whole, fraction, 6, negative && whole === 0n) };
}
function temporalTimestampJulian(julian: bigint, clock: bigint): checkruntime.NumericValue {
    julian = langruntime.checkedI64(julian);
    clock = langruntime.checkedI64(clock);
    let weight: number = 0;
    let first: bigint = clock;
    if (clock >= 100000000n) {
        weight = langruntime.checkedI32(2);
        first = langruntime.checkedI64(langruntime.checkedI64Divide(clock, 100000000n));
    }
    else if (clock >= 10000n) {
        weight = langruntime.checkedI32(1);
        first = langruntime.checkedI64(langruntime.checkedI64Divide(clock, 10000n));
    }
    let quotientWeight: number = langruntime.checkedSignedSubtract(weight, 2);
    if (first <= 864n) {
        quotientWeight = langruntime.checkedI32(langruntime.checkedSignedSubtract(quotientWeight, 1));
    }
    const scale: number = langruntime.checkedSignedSubtract(16, langruntime.checkedSignedMultiply(quotientWeight, 4));
    const denominator: bigint = 86400000000n;
    let remainder: bigint = clock;
    let fraction: string[] = [];
    let index: number = 0;
    while (index < scale) {
        remainder = langruntime.checkedI64(langruntime.checkedI64Multiply(remainder, 10n));
        const digit: number = Number(BigInt.asIntN(32, langruntime.checkedI64((langruntime.checkedI64Divide(remainder, denominator)))));
        langruntime.pushChar(fraction, langruntime.characterFromI32((langruntime.checkedSignedAdd(digit, 48)), "0"));
        remainder = langruntime.checkedI64(langruntime.checkedI64Remainder(remainder, denominator));
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    let carry: boolean = langruntime.checkedI64Multiply(remainder, 2n) >= denominator;
    let cursor: number = fraction.length;
    while (carry && cursor > 0) {
        cursor = langruntime.checkedIndex(langruntime.checkedSubtract(cursor, 1));
        const code: number = langruntime.checkedChar(langruntime.indexChar(fraction, langruntime.checkedIndex(cursor))).codePointAt(0)!;
        if (code === 57) {
            fraction[langruntime.checkedIndexIn(fraction, cursor)] = langruntime.checkedChar("0");
        }
        else {
            fraction[langruntime.checkedIndexIn(fraction, cursor)] = langruntime.checkedChar(langruntime.characterFromI32((langruntime.checkedSignedAdd(code, 1)), "0"));
            carry = langruntime.checkedBool(false);
        }
    }
    let whole: bigint = julian;
    if (carry) {
        whole = langruntime.checkedI64(langruntime.checkedI64Add(whole, 1n));
    }
    let output: string = checkruntime.textSignedNumber(whole);
    output = output + langruntime.checkedChar(".");
    cursor = langruntime.checkedIndex(0);
    while (cursor < fraction.length) {
        output = output + langruntime.checkedChar(langruntime.indexChar(fraction, langruntime.checkedIndex(cursor)));
        cursor = langruntime.checkedAdd(cursor, 1);
    }
    return { kind: "Value", value: output };
}
function temporalExtractTimestamp(value: bigint, unit: string): checkruntime.NumericValue {
    value = langruntime.checkedI64(value);
    unit = langruntime.checkedString(unit);
    const code: number = temporalExtractCode(unit);
    if (code === 0 || code === langruntime.checkedSignedNegate(2)) {
        return { kind: "Error", value: checkruntime.makeSqlError(temporalFieldUnitError) };
    }
    if (value === -9223372036854775808n || value === 9223372036854775807n) {
        if ((code >= 1 && code <= 9) || code === 16 || code === 17 || code === 18 || temporalUnitCode(unit) === langruntime.checkedSignedNegate(1)) {
            return { kind: "Null" };
        }
        if (code >= 10 && code <= 19) {
            if (value < 0n) {
                return { kind: "Value", value: "-Infinity" };
            }
            return { kind: "Value", value: "Infinity" };
        }
        return { kind: "Error", value: checkruntime.makeSqlError(temporalFieldUnsupportedError) };
    }
    if (code === langruntime.checkedSignedNegate(1)) {
        return { kind: "Error", value: checkruntime.makeSqlError(temporalFieldUnsupportedError) };
    }
    let day: bigint = langruntime.checkedI64Divide(value, 86400000000n);
    let clock: bigint = langruntime.checkedI64Remainder(value, 86400000000n);
    if (clock < 0n) {
        day = langruntime.checkedI64(langruntime.checkedI64Subtract(day, 1n));
        clock = langruntime.checkedI64(langruntime.checkedI64Add(clock, 86400000000n));
    }
    if (code === 1) {
        return { kind: "Value", value: checkruntime.textSignedNumber(langruntime.checkedI64Remainder(clock, 60000000n)) };
    }
    if (code === 2) {
        return temporalScaledNumber(langruntime.checkedI64Remainder(clock, 60000000n), 3);
    }
    if (code === 3) {
        return temporalScaledNumber(langruntime.checkedI64Remainder(clock, 60000000n), 6);
    }
    if (code === 4) {
        return { kind: "Value", value: checkruntime.textSignedNumber(langruntime.checkedI64Remainder(langruntime.checkedI64Divide(clock, 60000000n), 60n)) };
    }
    if (code === 5) {
        return { kind: "Value", value: checkruntime.textSignedNumber(langruntime.checkedI64Divide(clock, 3600000000n)) };
    }
    if (code === 14) {
        return temporalTimestampJulian(langruntime.checkedI64Add(day, 2451545n), clock);
    }
    if (code === 19) {
        return temporalTimestampEpoch(value);
    }
    return temporalExtractDate(Number(BigInt.asIntN(32, langruntime.checkedI64(day))), code);
}
export function extractF4l3(units: checkruntime.TextValue, input: checkruntime.TimestampValue): checkruntime.NumericValue {
    if (units.kind === "Error") {
        const error: checkruntime.SqlError = units.value;
        return { kind: "Error", value: error };
    }
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(units, { kind: "Unknown" }) || checkruntime.equalTimestampValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(units, { kind: "Null" }) || checkruntime.equalTimestampValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (units.kind === "Value") {
        const unit: string = langruntime.checkedString(units.value);
        if (input.kind === "Value") {
            const value: bigint = langruntime.checkedI64(input.value);
            return temporalExtractTimestamp(value, unit);
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
export function ascii7m47(input: checkruntime.TextValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const chars: string[] = Array.from(value);
        if (chars.length === 0) {
            return { kind: "Value", value: 0 };
        }
        const code: number = langruntime.checkedChar(langruntime.indexChar(chars, langruntime.checkedIndex(0))).codePointAt(0)!;
        return { kind: "Value", value: code };
    }
    return { kind: "Unknown" };
}
export function textVuvi(input: checkruntime.BoolValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalBoolValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalBoolValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: boolean = langruntime.checkedBool(input.value);
        if (value) {
            return checkruntime.makeTextValue("true");
        }
        return checkruntime.makeTextValue("false");
    }
    return { kind: "Unknown" };
}
function textCaseValue(input: checkruntime.TextValue, mode: number): checkruntime.TextValue {
    mode = langruntime.checkedI32(mode);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const characters: string[] = Array.from(value);
        let output: string = "";
        let previousAlphanumeric: boolean = false;
        let index: number = 0;
        while (index < characters.length) {
            const original: string = langruntime.indexChar(characters, langruntime.checkedIndex(index));
            const code: number = langruntime.checkedChar(original).codePointAt(0)!;
            const uppercase: boolean = mode === 1 || (mode === 2 && previousAlphanumeric === false);
            let character: string = langruntime.asciiLowercase(original);
            if (uppercase) {
                character = langruntime.checkedChar(original);
                if (code >= 97 && code <= 122) {
                    const upperCode: number = langruntime.checkedSignedSubtract(code, 32);
                    character = langruntime.checkedChar(langruntime.characterFromI32(upperCode, original));
                }
            }
            output = output + langruntime.checkedChar(character);
            previousAlphanumeric = langruntime.checkedBool((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57));
            index = langruntime.checkedAdd(index, 1);
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function casefoldBgkh(input: checkruntime.TextValue): checkruntime.TextValue {
    return textCaseValue(input, 0);
}
export function initcapFyn6(input: checkruntime.TextValue): checkruntime.TextValue {
    return textCaseValue(input, 2);
}
export function lowerHcg0(input: checkruntime.TextValue): checkruntime.TextValue {
    return textCaseValue(input, 0);
}
export function upperValc(input: checkruntime.TextValue): checkruntime.TextValue {
    return textCaseValue(input, 1);
}
function textHashValue(input: checkruntime.TextValue, trimSpaces: boolean): checkruntime.Int4Value {
    trimSpaces = langruntime.checkedBool(trimSpaces);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        const hex: string = textBinaryHex(value, trimSpaces);
        const bytes: checkruntime.HashByte[] = byteaHashBytes(hex);
        return { kind: "Value", value: checkruntime.hashBytes32(bytes) };
    }
    return { kind: "Unknown" };
}
function textHashExtended(input: checkruntime.TextValue, seed: checkruntime.Int8Value, trimSpaces: boolean): checkruntime.Int8Value {
    trimSpaces = langruntime.checkedBool(trimSpaces);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (seed.kind === "Error") {
        const error: checkruntime.SqlError = seed.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" }) || checkruntime.equalInt8Value(seed, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" }) || checkruntime.equalInt8Value(seed, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: string = langruntime.checkedString(input.value);
        if (seed.kind === "Value") {
            const salt: bigint = langruntime.checkedI64(seed.value);
            const hex: string = textBinaryHex(value, trimSpaces);
            const bytes: checkruntime.HashByte[] = byteaHashBytes(hex);
            return { kind: "Value", value: checkruntime.hashBytes64(bytes, salt) };
        }
    }
    return { kind: "Unknown" };
}
export function hashtextCnj7(input: checkruntime.TextValue): checkruntime.Int4Value {
    return textHashValue(input, false);
}
export function hashbpcharEeeo(input: checkruntime.TextValue): checkruntime.Int4Value {
    return textHashValue(input, true);
}
export function hashtextextendedDns6(input: checkruntime.TextValue, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    return textHashExtended(input, seed, false);
}
export function hashbpcharextendedCa1t(input: checkruntime.TextValue, seed: checkruntime.Int8Value): checkruntime.Int8Value {
    return textHashExtended(input, seed, true);
}
export function ginCmpTslexeme1b7b(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.Int4Value {
    return textBinaryCompare(left, right, false);
}
export function ginCompareJsonbIzgy(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.Int4Value {
    return textBinaryCompare(left, right, false);
}
export function bitLengthBpcw(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, false, 2);
}
export function charLengthZjgv(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, true, 0);
}
export function charLengthO1qu(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, false, 0);
}
export function characterLengthMqtx(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, true, 0);
}
export function characterLengthB3q2(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, false, 0);
}
export function lengthUhru(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, true, 0);
}
export function octetLength12ga(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, false, 1);
}
export function octetLength9hmr(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, false, 1);
}
export function textlen2bvv(value: checkruntime.TextValue): checkruntime.Int4Value {
    return textMeasureValue(value, false, 0);
}
export function bpcharLargerClri(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.TextValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, true);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        if (order >= 0) {
            return left;
        }
        return right;
    }
    return { kind: "Unknown" };
}
export function bpcharPatternGeDv6p(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, true);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order >= 0 };
    }
    return { kind: "Unknown" };
}
export function bpcharPatternGtTnmi(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, true);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order > 0 };
    }
    return { kind: "Unknown" };
}
export function bpcharPatternLe5vh3(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, true);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order <= 0 };
    }
    return { kind: "Unknown" };
}
export function bpcharPatternLt5798(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, true);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order < 0 };
    }
    return { kind: "Unknown" };
}
export function bpcharSmaller0mnx(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.TextValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, true);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        if (order <= 0) {
            return left;
        }
        return right;
    }
    return { kind: "Unknown" };
}
export function bpcharcmpB8vl(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.Int4Value {
    return textBinaryCompare(left, right, true);
}
export function btbpcharPatternCmpJjb6(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.Int4Value {
    return textBinaryCompare(left, right, true);
}
export function bttextPatternCmpJgxm(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.Int4Value {
    return textBinaryCompare(left, right, false);
}
export function bttextcmpPuxw(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.Int4Value {
    return textBinaryCompare(left, right, false);
}
export function textLargerSsmm(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.TextValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, false);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        if (order > 0) {
            return left;
        }
        return right;
    }
    return { kind: "Unknown" };
}
export function textPatternGeV6bi(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, false);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order >= 0 };
    }
    return { kind: "Unknown" };
}
export function textPatternGt99dz(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, false);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order > 0 };
    }
    return { kind: "Unknown" };
}
export function textPatternLeDpvx(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, false);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order <= 0 };
    }
    return { kind: "Unknown" };
}
export function textPatternLtQftf(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.BoolValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, false);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        return { kind: "Value", value: order < 0 };
    }
    return { kind: "Unknown" };
}
export function textSmallerT2nd(left: checkruntime.TextValue, right: checkruntime.TextValue): checkruntime.TextValue {
    const compared: checkruntime.Int4Value = textBinaryCompare(left, right, false);
    if (compared.kind === "Error") {
        const error: checkruntime.SqlError = compared.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalInt4Value(compared, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (compared.kind === "Value") {
        const order: number = langruntime.checkedI32(compared.value);
        if (order < 0) {
            return left;
        }
        return right;
    }
    return { kind: "Unknown" };
}
const textBuildLimitError = 8584704;
function textBuildOctets(value: string): bigint {
    value = langruntime.checkedString(value);
    const characters: string[] = Array.from(value);
    let size: bigint = 0n;
    let index: number = 0;
    while (index < characters.length) {
        const code: number = langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index))).codePointAt(0)!;
        let width: bigint = 1n;
        if (code >= 128) {
            width = langruntime.checkedI64(2n);
        }
        if (code >= 2048) {
            width = langruntime.checkedI64(3n);
        }
        if (code >= 65536) {
            width = langruntime.checkedI64(4n);
        }
        size = langruntime.checkedI64(langruntime.checkedI64Add(size, width));
        index = langruntime.checkedAdd(index, 1);
    }
    return size;
}
function textPadding(input: checkruntime.TextValue, length: checkruntime.Int4Value, fill: checkruntime.TextValue, right: boolean): checkruntime.TextValue {
    right = langruntime.checkedBool(right);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (fill.kind === "Error") {
        const error: checkruntime.SqlError = fill.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" }) || checkruntime.equalTextValue(fill, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" }) || checkruntime.equalTextValue(fill, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        if (length.kind === "Value") {
            const requested: number = langruntime.checkedI32(length.value);
            if (fill.kind === "Value") {
                const padding: string = langruntime.checkedString(fill.value);
                const characters: string[] = Array.from(text);
                const members: string[] = Array.from(padding);
                let count: number = requested;
                if (count < 0) {
                    count = langruntime.checkedI32(0);
                }
                let end: number = 0;
                let kept: number = 0;
                while (end < characters.length && kept < count) {
                    end = langruntime.checkedAdd(end, 1);
                    kept = langruntime.checkedI32(langruntime.checkedSignedAdd(kept, 1));
                }
                if (members.length === 0) {
                    count = langruntime.checkedI32(kept);
                }
                if (count >= 268435455) {
                    return { kind: "Error", value: checkruntime.makeSqlError(textBuildLimitError) };
                }
                let paddingCount: number = langruntime.checkedSignedSubtract(count, kept);
                let output: string = "";
                let index: number = 0;
                if (right) {
                    while (index < end) {
                        output = output + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
                        index = langruntime.checkedAdd(index, 1);
                    }
                }
                index = langruntime.checkedIndex(0);
                while (paddingCount > 0) {
                    output = output + langruntime.checkedChar(langruntime.indexChar(members, langruntime.checkedIndex(index)));
                    index = langruntime.checkedAdd(index, 1);
                    if (index === members.length) {
                        index = langruntime.checkedIndex(0);
                    }
                    paddingCount = langruntime.checkedI32(langruntime.checkedSignedSubtract(paddingCount, 1));
                }
                if (right === false) {
                    index = langruntime.checkedIndex(0);
                    while (index < end) {
                        output = output + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
                        index = langruntime.checkedAdd(index, 1);
                    }
                }
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
export function lpadEzhf(input: checkruntime.TextValue, length: checkruntime.Int4Value, fill: checkruntime.TextValue): checkruntime.TextValue {
    return textPadding(input, length, fill, false);
}
export function lpadLqi7(input: checkruntime.TextValue, length: checkruntime.Int4Value): checkruntime.TextValue {
    return textPadding(input, length, { kind: "Value", value: " " }, false);
}
export function rpadBw5z(input: checkruntime.TextValue, length: checkruntime.Int4Value, fill: checkruntime.TextValue): checkruntime.TextValue {
    return textPadding(input, length, fill, true);
}
export function rpad53f6(input: checkruntime.TextValue, length: checkruntime.Int4Value): checkruntime.TextValue {
    return textPadding(input, length, { kind: "Value", value: " " }, true);
}
export function repeatF0fb(input: checkruntime.TextValue, length: checkruntime.Int4Value): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        if (length.kind === "Value") {
            const requested: number = langruntime.checkedI32(length.value);
            if (requested <= 0) {
                return { kind: "Value", value: "" };
            }
            const size: bigint = textBuildOctets(text);
            if (size === 0n) {
                return { kind: "Value", value: "" };
            }
            if (langruntime.checkedI64Multiply(size, BigInt(langruntime.checkedI32(requested))) > 1073741819n) {
                return { kind: "Error", value: checkruntime.makeSqlError(textBuildLimitError) };
            }
            let count: number = requested;
            let block: string = text;
            let output: string = "";
            while (count > 0) {
                if (langruntime.checkedSignedRemainder(count, 2) === 1) {
                    output = output + block;
                }
                count = langruntime.checkedI32(langruntime.checkedSignedDivide(count, 2));
                if (count > 0) {
                    const copy: string = langruntime.checkedString(block);
                    block = block + copy;
                }
            }
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
export function translateTxpt(input: checkruntime.TextValue, from: checkruntime.TextValue, to: checkruntime.TextValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (from.kind === "Error") {
        const error: checkruntime.SqlError = from.value;
        return { kind: "Error", value: error };
    }
    if (to.kind === "Error") {
        const error: checkruntime.SqlError = to.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" }) || checkruntime.equalTextValue(from, { kind: "Unknown" }) || checkruntime.equalTextValue(to, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" }) || checkruntime.equalTextValue(from, { kind: "Null" }) || checkruntime.equalTextValue(to, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        if (from.kind === "Value") {
            const source: string = langruntime.checkedString(from.value);
            if (to.kind === "Value") {
                const target: string = langruntime.checkedString(to.value);
                if (textBuildOctets(text) > 268435454n) {
                    return { kind: "Error", value: checkruntime.makeSqlError(textBuildLimitError) };
                }
                const characters: string[] = Array.from(text);
                const before: string[] = Array.from(source);
                const after: string[] = Array.from(target);
                let output: string = "";
                let index: number = 0;
                while (index < characters.length) {
                    let member: number = 0;
                    while (member < before.length && !(langruntime.indexChar(before, langruntime.checkedIndex(member)) === langruntime.indexChar(characters, langruntime.checkedIndex(index)))) {
                        member = langruntime.checkedAdd(member, 1);
                    }
                    if (member < before.length) {
                        if (member < after.length) {
                            output = output + langruntime.checkedChar(langruntime.indexChar(after, langruntime.checkedIndex(member)));
                        }
                    }
                    else {
                        output = output + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
                    }
                    index = langruntime.checkedAdd(index, 1);
                }
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
const textSubstringError = 3452581;
function textSubstringValue(input: checkruntime.TextValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value, hasLength: boolean): checkruntime.TextValue {
    hasLength = langruntime.checkedBool(hasLength);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (position.kind === "Error") {
        const error: checkruntime.SqlError = position.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(position, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(position, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        if (position.kind === "Value") {
            const start: number = langruntime.checkedI32(position.value);
            if (length.kind === "Value") {
                const count: number = langruntime.checkedI32(length.value);
                if (hasLength && count < 0) {
                    return { kind: "Error", value: checkruntime.makeSqlError(textSubstringError) };
                }
                const first: bigint = BigInt(langruntime.checkedI32(start));
                let end: bigint = 2147483648n;
                if (hasLength && start <= langruntime.checkedSignedSubtract(2147483647, count)) {
                    const stop: number = langruntime.checkedSignedAdd(start, count);
                    end = langruntime.checkedI64(BigInt(langruntime.checkedI32(stop)));
                }
                const characters: string[] = Array.from(text);
                let output: string = "";
                let index: number = 0;
                let current: bigint = 1n;
                while (index < characters.length && current < end) {
                    if (current >= first) {
                        output = output + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
                    }
                    index = langruntime.checkedAdd(index, 1);
                    current = langruntime.checkedI64(langruntime.checkedI64Add(current, 1n));
                }
                return { kind: "Value", value: output };
            }
        }
    }
    return { kind: "Unknown" };
}
function textSideValue(input: checkruntime.TextValue, length: checkruntime.Int4Value, fromRight: boolean): checkruntime.TextValue {
    fromRight = langruntime.checkedBool(fromRight);
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (length.kind === "Error") {
        const error: checkruntime.SqlError = length.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" }) || checkruntime.equalInt4Value(length, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" }) || checkruntime.equalInt4Value(length, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        if (length.kind === "Value") {
            const count: number = langruntime.checkedI32(length.value);
            const characters: string[] = Array.from(text);
            let total: bigint = 0n;
            let index: number = 0;
            while (index < characters.length) {
                total = langruntime.checkedI64(langruntime.checkedI64Add(total, 1n));
                index = langruntime.checkedAdd(index, 1);
            }
            const requested: bigint = BigInt(langruntime.checkedI32(count));
            let first: bigint = 0n;
            let end: bigint = total;
            if (fromRight) {
                if (count < 0) {
                    first = langruntime.checkedI64(langruntime.checkedI64Subtract(0n, requested));
                    if (count === langruntime.checkedSignedSubtract(langruntime.checkedSignedNegate(2147483647), 1)) {
                        first = langruntime.checkedI64(0n);
                    }
                }
                else {
                    first = langruntime.checkedI64(langruntime.checkedI64Subtract(total, requested));
                }
            }
            else if (count < 0) {
                end = langruntime.checkedI64(langruntime.checkedI64Add(total, requested));
            }
            else {
                end = langruntime.checkedI64(requested);
            }
            let output: string = "";
            index = langruntime.checkedIndex(0);
            let current: bigint = 0n;
            while (index < characters.length && current < end) {
                if (current >= first) {
                    output = output + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
                }
                index = langruntime.checkedAdd(index, 1);
                current = langruntime.checkedI64(langruntime.checkedI64Add(current, 1n));
            }
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
export function substringEzt4(input: checkruntime.TextValue, position: checkruntime.Int4Value): checkruntime.TextValue {
    return textSubstringValue(input, position, { kind: "Value", value: 0 }, false);
}
export function substringDd1c(input: checkruntime.TextValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value): checkruntime.TextValue {
    return textSubstringValue(input, position, length, true);
}
export function substr8v03(input: checkruntime.TextValue, position: checkruntime.Int4Value): checkruntime.TextValue {
    return textSubstringValue(input, position, { kind: "Value", value: 0 }, false);
}
export function substrZhiv(input: checkruntime.TextValue, position: checkruntime.Int4Value, length: checkruntime.Int4Value): checkruntime.TextValue {
    return textSubstringValue(input, position, length, true);
}
export function left8f3e(input: checkruntime.TextValue, length: checkruntime.Int4Value): checkruntime.TextValue {
    return textSideValue(input, length, false);
}
export function rightHbgt(input: checkruntime.TextValue, length: checkruntime.Int4Value): checkruntime.TextValue {
    return textSideValue(input, length, true);
}
export function reverse5pr1(input: checkruntime.TextValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const text: string = langruntime.checkedString(input.value);
        const characters: string[] = Array.from(text);
        let index: number = characters.length;
        let output: string = "";
        while (index > 0) {
            index = langruntime.checkedIndex(langruntime.checkedSubtract(index, 1));
            output = output + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function btrim2rb3(value: checkruntime.TextValue): checkruntime.TextValue {
    return textTrimValue(value, checkruntime.makeTextValue(" "), true, true);
}
export function btrimFwtx(value: checkruntime.TextValue, set: checkruntime.TextValue): checkruntime.TextValue {
    return textTrimValue(value, set, true, true);
}
export function ltrimNnx9(value: checkruntime.TextValue): checkruntime.TextValue {
    return textTrimValue(value, checkruntime.makeTextValue(" "), true, false);
}
export function ltrimQ5x0(value: checkruntime.TextValue, set: checkruntime.TextValue): checkruntime.TextValue {
    return textTrimValue(value, set, true, false);
}
export function rtrimT07s(value: checkruntime.TextValue): checkruntime.TextValue {
    return textTrimValue(value, checkruntime.makeTextValue(" "), false, true);
}
export function rtrimG9ee(value: checkruntime.TextValue, set: checkruntime.TextValue): checkruntime.TextValue {
    return textTrimValue(value, set, false, true);
}
const textLengthRangeError = 3452547;
function textBinaryHex(value: string, trimSpaces: boolean): string {
    value = langruntime.checkedString(value);
    trimSpaces = langruntime.checkedBool(trimSpaces);
    const characters: string[] = Array.from(value);
    let end: number = characters.length;
    if (trimSpaces) {
        while (end > 0 && langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === " ") {
            end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
        }
    }
    let output: string = "";
    let index: number = 0;
    while (index < end) {
        output = langruntime.checkedString(byteaUtf8Character(output, langruntime.indexChar(characters, langruntime.checkedIndex(index))));
        index = langruntime.checkedAdd(index, 1);
    }
    return output;
}
function textBinaryCompare(left: checkruntime.TextValue, right: checkruntime.TextValue, trimSpaces: boolean): checkruntime.Int4Value {
    trimSpaces = langruntime.checkedBool(trimSpaces);
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
        const a: string = langruntime.checkedString(left.value);
        if (right.kind === "Value") {
            const b: string = langruntime.checkedString(right.value);
            const first: string = textBinaryHex(a, trimSpaces);
            const second: string = textBinaryHex(b, trimSpaces);
            return byteaCompare({ kind: "Value", value: first }, { kind: "Value", value: second });
        }
    }
    return { kind: "Unknown" };
}
function textMeasureValue(value: checkruntime.TextValue, trimSpaces: boolean, mode: number): checkruntime.Int4Value {
    trimSpaces = langruntime.checkedBool(trimSpaces);
    mode = langruntime.checkedI32(mode);
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
        const characters: string[] = Array.from(text);
        let end: number = characters.length;
        if (trimSpaces) {
            while (end > 0 && langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === " ") {
                end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
            }
        }
        let length: bigint = 0n;
        let index: number = 0;
        while (index < end) {
            let width: bigint = 1n;
            if (!(mode === 0)) {
                const code: number = langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index))).codePointAt(0)!;
                if (code >= 128) {
                    width = langruntime.checkedI64(2n);
                }
                if (code >= 2048) {
                    width = langruntime.checkedI64(3n);
                }
                if (code >= 65536) {
                    width = langruntime.checkedI64(4n);
                }
            }
            length = langruntime.checkedI64(langruntime.checkedI64Add(length, width));
            index = langruntime.checkedAdd(index, 1);
        }
        if (mode === 2) {
            length = langruntime.checkedI64(langruntime.checkedI64Multiply(length, 8n));
        }
        if (length > 2147483647n) {
            return { kind: "Error", value: checkruntime.makeSqlError(textLengthRangeError) };
        }
        return { kind: "Value", value: Number(BigInt.asIntN(32, langruntime.checkedI64(length))) };
    }
    return { kind: "Unknown" };
}
function textTrimValue(value: checkruntime.TextValue, set: checkruntime.TextValue, trimLeft: boolean, trimRight: boolean): checkruntime.TextValue {
    trimLeft = langruntime.checkedBool(trimLeft);
    trimRight = langruntime.checkedBool(trimRight);
    if (value.kind === "Error") {
        const error: checkruntime.SqlError = value.value;
        return { kind: "Error", value: error };
    }
    if (set.kind === "Error") {
        const error: checkruntime.SqlError = set.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalTextValue(value, { kind: "Unknown" }) || checkruntime.equalTextValue(set, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalTextValue(value, { kind: "Null" }) || checkruntime.equalTextValue(set, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (value.kind === "Value") {
        const text: string = langruntime.checkedString(value.value);
        if (set.kind === "Value") {
            const trimSet: string = langruntime.checkedString(set.value);
            const characters: string[] = Array.from(text);
            const members: string[] = Array.from(trimSet);
            let start: number = 0;
            let end: number = characters.length;
            if (trimLeft) {
                while (start < end) {
                    let member: number = 0;
                    let matched: boolean = false;
                    while (member < members.length) {
                        if (langruntime.indexChar(characters, langruntime.checkedIndex(start)) === langruntime.indexChar(members, langruntime.checkedIndex(member))) {
                            matched = langruntime.checkedBool(true);
                        }
                        member = langruntime.checkedAdd(member, 1);
                    }
                    if (matched === false) {
                        break;
                    }
                    start = langruntime.checkedAdd(start, 1);
                }
            }
            if (trimRight) {
                while (start < end) {
                    let member: number = 0;
                    let matched: boolean = false;
                    while (member < members.length) {
                        if (langruntime.indexChar(characters, langruntime.checkedIndex(langruntime.checkedSubtract(end, 1))) === langruntime.indexChar(members, langruntime.checkedIndex(member))) {
                            matched = langruntime.checkedBool(true);
                        }
                        member = langruntime.checkedAdd(member, 1);
                    }
                    if (matched === false) {
                        break;
                    }
                    end = langruntime.checkedIndex(langruntime.checkedSubtract(end, 1));
                }
            }
            let output: string = "";
            let index: number = start;
            while (index < end) {
                output = output + langruntime.checkedChar(langruntime.indexChar(characters, langruntime.checkedIndex(index)));
                index = langruntime.checkedAdd(index, 1);
            }
            return { kind: "Value", value: output };
        }
    }
    return { kind: "Unknown" };
}
export function timestampEqJd79(left: checkruntime.TimestampValue, right: checkruntime.TimestampValue): checkruntime.BoolValue {
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
function uuidCompare(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.Int4Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalUuidValue(left, { kind: "Unknown" }) || checkruntime.equalUuidValue(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalUuidValue(left, { kind: "Null" }) || checkruntime.equalUuidValue(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const a: checkruntime.Uuid = left.value;
        if (right.kind === "Value") {
            const b: checkruntime.Uuid = right.value;
            let index: number = 0;
            while (index < 8) {
                const x: number = checkruntime.uuidWord(a, index);
                const y: number = checkruntime.uuidWord(b, index);
                if (!(langruntime.checkedSignedDivide(x, 256) === langruntime.checkedSignedDivide(y, 256))) {
                    return { kind: "Value", value: langruntime.checkedSignedSubtract(langruntime.checkedSignedDivide(x, 256), langruntime.checkedSignedDivide(y, 256)) };
                }
                if (!(langruntime.checkedSignedRemainder(x, 256) === langruntime.checkedSignedRemainder(y, 256))) {
                    return { kind: "Value", value: langruntime.checkedSignedSubtract(langruntime.checkedSignedRemainder(x, 256), langruntime.checkedSignedRemainder(y, 256)) };
                }
                index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
            }
            return { kind: "Value", value: 0 };
        }
    }
    return { kind: "Unknown" };
}
export function uuidCmp6t9k(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.Int4Value {
    return uuidCompare(left, right);
}
export function uuidEq6czo(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = uuidCompare(left, right);
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
export function uuidNeN2xp(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = uuidCompare(left, right);
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
export function uuidLt50za(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = uuidCompare(left, right);
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
export function uuidLeG9j5(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = uuidCompare(left, right);
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
export function uuidGt0fj1(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = uuidCompare(left, right);
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
export function uuidGe098n(left: checkruntime.UuidValue, right: checkruntime.UuidValue): checkruntime.BoolValue {
    const result: checkruntime.Int4Value = uuidCompare(left, right);
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
export function uuidToText(input: checkruntime.UuidValue): checkruntime.TextValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.Uuid = input.value;
        let output: string = "";
        let index: number = 0;
        while (index < 8) {
            if (index === 2 || index === 3 || index === 4 || index === 5) {
                output = output + langruntime.checkedChar("-");
            }
            const word: number = checkruntime.uuidWord(value, index);
            if (word < 4096) {
                output = output + langruntime.checkedChar("0");
            }
            if (word < 256) {
                output = output + langruntime.checkedChar("0");
            }
            if (word < 16) {
                output = output + langruntime.checkedChar("0");
            }
            const digits: string = checkruntime.textNumber(word, 16);
            output = output + digits;
            index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
function uuidByte(value: checkruntime.Uuid, index: number): number {
    index = langruntime.checkedI32(index);
    const word: number = checkruntime.uuidWord(value, langruntime.checkedSignedDivide(index, 2));
    if (langruntime.checkedSignedRemainder(index, 2) === 0) {
        return langruntime.checkedSignedDivide(word, 256);
    }
    return langruntime.checkedSignedRemainder(word, 256);
}
function uuidHashBytes(value: checkruntime.Uuid): checkruntime.HashByte[] {
    let bytes: checkruntime.HashByte[] = [];
    let index: number = 0;
    while (index < 16) {
        const byte: number = uuidByte(value, index);
        langruntime.pushStruct(bytes, { value: BigInt(langruntime.checkedI32(byte)) }, checkruntime.copyHashByte);
        index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
    }
    return bytes;
}
export function uuidSend32nf(input: checkruntime.UuidValue): checkruntime.ByteaValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.Uuid = input.value;
        let output: string = "";
        let index: number = 0;
        while (index < 16) {
            const byte: number = uuidByte(value, index);
            output = langruntime.checkedString(checkruntime.byteaAppendByte(output, byte));
            index = langruntime.checkedI32(langruntime.checkedSignedAdd(index, 1));
        }
        return { kind: "Value", value: output };
    }
    return { kind: "Unknown" };
}
export function uuidHash8nnn(input: checkruntime.UuidValue): checkruntime.Int4Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.Uuid = input.value;
        const bytes: checkruntime.HashByte[] = uuidHashBytes(value);
        const hash: number = checkruntime.hashBytes32(bytes);
        return { kind: "Value", value: hash };
    }
    return { kind: "Unknown" };
}
export function uuidHashExtendedI59z(left: checkruntime.UuidValue, right: checkruntime.Int8Value): checkruntime.Int8Value {
    if (left.kind === "Error") {
        const error: checkruntime.SqlError = left.value;
        return { kind: "Error", value: error };
    }
    if (right.kind === "Error") {
        const error: checkruntime.SqlError = right.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalUuidValue(left, { kind: "Unknown" }) || checkruntime.equalInt8Value(right, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalUuidValue(left, { kind: "Null" }) || checkruntime.equalInt8Value(right, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (left.kind === "Value") {
        const value: checkruntime.Uuid = left.value;
        if (right.kind === "Value") {
            const seed: bigint = langruntime.checkedI64(right.value);
            const bytes: checkruntime.HashByte[] = uuidHashBytes(value);
            const hash: bigint = checkruntime.hashBytes64(bytes, seed);
            return { kind: "Value", value: hash };
        }
    }
    return { kind: "Unknown" };
}
export function uuidExtractVersionYdwe(input: checkruntime.UuidValue): checkruntime.Int2Value {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.Uuid = input.value;
        if (!(langruntime.checkedSignedDivide(value.word4, 16384) === 2)) {
            return { kind: "Null" };
        }
        return { kind: "Value", value: langruntime.checkedSignedDivide(value.word3, 4096) };
    }
    return { kind: "Unknown" };
}
export function uuidExtractTimestampP52j(input: checkruntime.UuidValue): checkruntime.TimestamptzValue {
    if (input.kind === "Error") {
        const error: checkruntime.SqlError = input.value;
        return { kind: "Error", value: error };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Unknown" })) {
        return { kind: "Unknown" };
    }
    if (checkruntime.equalUuidValue(input, { kind: "Null" })) {
        return { kind: "Null" };
    }
    if (input.kind === "Value") {
        const value: checkruntime.Uuid = input.value;
        if (!(langruntime.checkedSignedDivide(value.word4, 16384) === 2)) {
            return { kind: "Null" };
        }
        const version: number = langruntime.checkedSignedDivide(value.word3, 4096);
        const word0: bigint = BigInt(langruntime.checkedI32(value.word0));
        const word1: bigint = BigInt(langruntime.checkedI32(value.word1));
        const word2: bigint = BigInt(langruntime.checkedI32(value.word2));
        if (version === 1) {
            const high: number = langruntime.checkedSignedRemainder(value.word3, 4096);
            const word3: bigint = BigInt(langruntime.checkedI32(high));
            const ticks: bigint = langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Multiply(word3, 281474976710656n), langruntime.checkedI64Multiply(word2, 4294967296n)), langruntime.checkedI64Multiply(word0, 65536n)), word1);
            const microseconds: bigint = langruntime.checkedI64Subtract(langruntime.checkedI64Divide(ticks, 10n), 13165977600000000n);
            return { kind: "Value", value: microseconds };
        }
        if (version === 7) {
            const milliseconds: bigint = langruntime.checkedI64Add(langruntime.checkedI64Add(langruntime.checkedI64Multiply(word0, 4294967296n), langruntime.checkedI64Multiply(word1, 65536n)), word2);
            const microseconds: bigint = langruntime.checkedI64Subtract(langruntime.checkedI64Multiply(milliseconds, 1000n), 946684800000000n);
            return { kind: "Value", value: microseconds };
        }
        return { kind: "Null" };
    }
    return { kind: "Unknown" };
}
