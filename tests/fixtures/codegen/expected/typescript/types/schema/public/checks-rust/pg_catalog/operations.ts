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
