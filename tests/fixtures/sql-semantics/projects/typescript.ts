class SqlIntegerError extends Error {
    readonly code = "22003";
    constructor() { super("integer out of range"); }
}
function sqlIntegerRange(value: bigint | null, min: bigint, max: bigint): bigint | null {
    if (value === null)
        return null;
    if (value < min || value > max)
        throw new SqlIntegerError();
    return value;
}
function sqlIntegerInput(value: string | null, min: bigint, max: bigint): bigint | null {
    return sqlIntegerRange(value === null ? null : BigInt(value), min, max);
}
function int2Input(value: string | null): bigint | null { return sqlIntegerInput(value, -32768n, 32767n); }
function sqlIntegerAdd(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null)
        return null;
    return sqlIntegerRange(left + right, min, max);
}
function int2Add(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerAdd(left, right, -32768n, 32767n); }
function int4Input(value: string | null): bigint | null { return sqlIntegerInput(value, -2147483648n, 2147483647n); }
function int4Add(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerAdd(left, right, -2147483648n, 2147483647n); }
function int8Input(value: string | null): bigint | null { return sqlIntegerInput(value, -9223372036854775808n, 9223372036854775807n); }
function int8Add(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerAdd(left, right, -9223372036854775808n, 9223372036854775807n); }
function sqlIntegerMul(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null)
        return null;
    return sqlIntegerRange(left * right, min, max);
}
function int8Mul(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerMul(left, right, -9223372036854775808n, 9223372036854775807n); }
function sqlIntegerAbs(value: bigint | null, min: bigint, max: bigint): bigint | null {
    if (value === null)
        return null;
    return sqlIntegerRange(value < 0n ? -value : value, min, max);
}
function int2Abs(value: bigint | null): bigint | null { return sqlIntegerAbs(value, -32768n, 32767n); }
function sqlIntegerSub(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null)
        return null;
    return sqlIntegerRange(left - right, min, max);
}
function int2Sub(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerSub(left, right, -32768n, 32767n); }
function int2Mul(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerMul(left, right, -32768n, 32767n); }
function integerEq(left: bigint | null, right: bigint | null): boolean | null {
    return left === null || right === null ? null : left === right;
}
function sqlIntegerNeg(value: bigint | null, min: bigint, max: bigint): bigint | null {
    if (value === null)
        return null;
    return sqlIntegerRange(-value, min, max);
}
function int2Neg(value: bigint | null): bigint | null { return sqlIntegerNeg(value, -32768n, 32767n); }
function int8Cast(value: bigint | null): bigint | null { return sqlIntegerRange(value, -9223372036854775808n, 9223372036854775807n); }
function int4Abs(value: bigint | null): bigint | null { return sqlIntegerAbs(value, -2147483648n, 2147483647n); }
function int4Sub(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerSub(left, right, -2147483648n, 2147483647n); }
function int4Mul(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerMul(left, right, -2147483648n, 2147483647n); }
function int4Neg(value: bigint | null): bigint | null { return sqlIntegerNeg(value, -2147483648n, 2147483647n); }
function int8Abs(value: bigint | null): bigint | null { return sqlIntegerAbs(value, -9223372036854775808n, 9223372036854775807n); }
function int8Sub(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerSub(left, right, -9223372036854775808n, 9223372036854775807n); }
function int8Neg(value: bigint | null): bigint | null { return sqlIntegerNeg(value, -9223372036854775808n, 9223372036854775807n); }
function integerNe(left: bigint | null, right: bigint | null): boolean | null {
    return left === null || right === null ? null : left !== right;
}
function integerLt(left: bigint | null, right: bigint | null): boolean | null {
    return left === null || right === null ? null : left < right;
}
function integerLe(left: bigint | null, right: bigint | null): boolean | null {
    return left === null || right === null ? null : left <= right;
}
function integerGt(left: bigint | null, right: bigint | null): boolean | null {
    return left === null || right === null ? null : left > right;
}
function integerGe(left: bigint | null, right: bigint | null): boolean | null {
    return left === null || right === null ? null : left >= right;
}
function int4Cast(value: bigint | null): bigint | null { return sqlIntegerRange(value, -2147483648n, 2147483647n); }
function int2Cast(value: bigint | null): bigint | null { return sqlIntegerRange(value, -32768n, 32767n); }
class SqlDivisionByZeroError extends Error {
    readonly code = "22012";
    constructor() { super("division by zero"); }
}
function sqlIntegerDiv(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null)
        return null;
    if (right === 0n)
        throw new SqlDivisionByZeroError();
    return sqlIntegerRange(left / right, min, max);
}
function int2Div(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerDiv(left, right, -32768n, 32767n); }
function sqlIntegerMod(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null)
        return null;
    if (right === 0n)
        throw new SqlDivisionByZeroError();
    return sqlIntegerRange(left % right, min, max);
}
function int2Mod(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerMod(left, right, -32768n, 32767n); }
function int4Div(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerDiv(left, right, -2147483648n, 2147483647n); }
function int8Div(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerDiv(left, right, -9223372036854775808n, 9223372036854775807n); }
function int4Mod(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerMod(left, right, -2147483648n, 2147483647n); }
function sqlIntegerGcdMagnitude(left: bigint, right: bigint): bigint {
    let a = left < 0n ? -left : left;
    let b = right < 0n ? -right : right;
    while (b !== 0n) {
        const remainder = a % b;
        a = b;
        b = remainder;
    }
    return a;
}
function sqlIntegerGcd(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null)
        return null;
    return sqlIntegerRange(sqlIntegerGcdMagnitude(left, right), min, max);
}
function int4Gcd(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerGcd(left, right, -2147483648n, 2147483647n); }
function sqlIntegerLcm(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null)
        return null;
    if (left === 0n || right === 0n)
        return 0n;
    const product = (left / sqlIntegerGcdMagnitude(left, right)) * right;
    return sqlIntegerRange(product < 0n ? -product : product, min, max);
}
function int4Lcm(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerLcm(left, right, -2147483648n, 2147483647n); }
function int8Mod(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerMod(left, right, -9223372036854775808n, 9223372036854775807n); }
function int8Gcd(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerGcd(left, right, -9223372036854775808n, 9223372036854775807n); }
function int8Lcm(left: bigint | null, right: bigint | null): bigint | null { return sqlIntegerLcm(left, right, -9223372036854775808n, 9223372036854775807n); }
function sqlFloatInput(bits: string | null, single: boolean): number | null {
    if (bits === null)
        return null;
    const view = new DataView(new ArrayBuffer(single ? 4 : 8));
    if (single) {
        view.setUint32(0, Number.parseInt(bits, 16));
        return view.getFloat32(0);
    }
    view.setBigUint64(0, BigInt("0x" + bits));
    return view.getFloat64(0);
}
function float4Input(bits: string | null): number | null { return sqlFloatInput(bits, true); }
function float4Neg(value: number | null): number | null { return value === null ? null : -value; }
function float4Identity(value: number | null): number | null { return value === null ? null : value; }
function float4Abs(value: number | null): number | null { return value === null ? null : Math.abs(value); }
function float8FromFloat4(value: number | null): number | null { return value; }
function sqlIntegerToFloat4(value: bigint | null): number | null {
    if (value === null)
        return null;
    const magnitude = value < 0n ? -value : value;
    const shift = magnitude.toString(2).length - 24;
    if (shift <= 0)
        return Number(value);
    let significant = magnitude >> BigInt(shift);
    const remainder = magnitude - (significant << BigInt(shift));
    const half = 1n << BigInt(shift - 1);
    if (remainder > half || (remainder === half && significant % 2n !== 0n))
        significant++;
    const result = Number(significant) * 2 ** shift;
    return value < 0n ? -result : result;
}
function float4FromInteger(value: bigint | null): number | null { return sqlIntegerToFloat4(value); }
function sqlFloatToInteger(value: number | null, min: bigint, max: bigint): bigint | null {
    if (value === null)
        return null;
    if (!Number.isFinite(value))
        throw new SqlIntegerError();
    const lower = Math.floor(value);
    const rounded = value - lower === 0.5 ? (lower % 2 === 0 ? lower : lower + 1) : Math.round(value);
    return sqlIntegerRange(BigInt(rounded), min, max);
}
function int2FromFloat(value: number | null): bigint | null { return sqlFloatToInteger(value, -32768n, 32767n); }
function int4FromFloat(value: number | null): bigint | null { return sqlFloatToInteger(value, -2147483648n, 2147483647n); }
function int8FromFloat(value: number | null): bigint | null { return sqlFloatToInteger(value, -9223372036854775808n, 9223372036854775807n); }
function float4Add(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    const result = Math.fround(left + right);
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left) && Number.isFinite(right)) || (false))
        throw new SqlIntegerError();
    return result;
}
function float4Sub(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    const result = Math.fround(left - right);
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left) && Number.isFinite(right)) || (false))
        throw new SqlIntegerError();
    return result;
}
function float4Mul(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    const result = Math.fround(left * right);
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left) && Number.isFinite(right)) || (result === 0 && left !== 0 && right !== 0))
        throw new SqlIntegerError();
    return result;
}
function float4Div(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    if (right === 0 && !Number.isNaN(left))
        throw new SqlDivisionByZeroError();
    const result = Math.fround(left / right);
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left)) || (result === 0 && left !== 0 && Number.isFinite(right)))
        throw new SqlIntegerError();
    return result;
}
function sqlFloatCompare(left: number, right: number): number {
    if (Number.isNaN(left))
        return Number.isNaN(right) ? 0 : 1;
    if (Number.isNaN(right))
        return -1;
    return left < right ? -1 : left > right ? 1 : 0;
}
function floatEq(left: number | null, right: number | null): boolean | null {
    return left === null || right === null ? null : sqlFloatCompare(left, right) === 0;
}
function floatNe(left: number | null, right: number | null): boolean | null {
    return left === null || right === null ? null : sqlFloatCompare(left, right) !== 0;
}
function floatLt(left: number | null, right: number | null): boolean | null {
    return left === null || right === null ? null : sqlFloatCompare(left, right) < 0;
}
function floatLe(left: number | null, right: number | null): boolean | null {
    return left === null || right === null ? null : sqlFloatCompare(left, right) <= 0;
}
function floatGt(left: number | null, right: number | null): boolean | null {
    return left === null || right === null ? null : sqlFloatCompare(left, right) > 0;
}
function floatGe(left: number | null, right: number | null): boolean | null {
    return left === null || right === null ? null : sqlFloatCompare(left, right) >= 0;
}
function float8Input(bits: string | null): number | null { return sqlFloatInput(bits, false); }
function float8Add(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    const result = left + right;
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left) && Number.isFinite(right)) || (false))
        throw new SqlIntegerError();
    return result;
}
function float8Sub(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    const result = left - right;
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left) && Number.isFinite(right)) || (false))
        throw new SqlIntegerError();
    return result;
}
function float8Mul(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    const result = left * right;
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left) && Number.isFinite(right)) || (result === 0 && left !== 0 && right !== 0))
        throw new SqlIntegerError();
    return result;
}
function float8Div(left: number | null, right: number | null): number | null {
    if (left === null || right === null)
        return null;
    if (right === 0 && !Number.isNaN(left))
        throw new SqlDivisionByZeroError();
    const result = left / right;
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(left)) || (result === 0 && left !== 0 && Number.isFinite(right)))
        throw new SqlIntegerError();
    return result;
}
function float8Neg(value: number | null): number | null { return value === null ? null : -value; }
function float8Identity(value: number | null): number | null { return value === null ? null : value; }
function float8Abs(value: number | null): number | null { return value === null ? null : Math.abs(value); }
function float4FromFloat8(value: number | null): number | null {
    if (value === null)
        return null;
    const result = Math.fround(value);
    if ((!Number.isFinite(result) && !Number.isNaN(result) && Number.isFinite(value)) || (result === 0 && value !== 0))
        throw new SqlIntegerError();
    return result;
}
function float8FromInteger(value: bigint | null): number | null { return value === null ? null : Number(value); }
function int2And(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(16, left & right);
}
function int2Or(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(16, left | right);
}
function int2Xor(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(16, left ^ right);
}
function int2Not(value: bigint | null): bigint | null {
    return value === null ? null : BigInt.asIntN(16, ~value);
}
function int2Identity(value: bigint | null): bigint | null {
    return value === null ? null : BigInt.asIntN(16, value);
}
function int2Shl(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(16, left << (right & 31n));
}
function int2Shr(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(16, left >> (right & 31n));
}
function int4And(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(32, left & right);
}
function int4Or(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(32, left | right);
}
function int4Xor(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(32, left ^ right);
}
function int4Not(value: bigint | null): bigint | null {
    return value === null ? null : BigInt.asIntN(32, ~value);
}
function int4Identity(value: bigint | null): bigint | null {
    return value === null ? null : BigInt.asIntN(32, value);
}
function int4Shl(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(32, left << (right & 31n));
}
function int4Shr(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(32, left >> (right & 31n));
}
function int8And(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(64, left & right);
}
function int8Or(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(64, left | right);
}
function int8Xor(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(64, left ^ right);
}
function int8Not(value: bigint | null): bigint | null {
    return value === null ? null : BigInt.asIntN(64, ~value);
}
function int8Identity(value: bigint | null): bigint | null {
    return value === null ? null : BigInt.asIntN(64, value);
}
function int8Shl(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(64, left << (right & 63n));
}
function int8Shr(left: bigint | null, right: bigint | null): bigint | null {
    return left === null || right === null ? null : BigInt.asIntN(64, left >> (right & 63n));
}
function float8Ceil(value: number | null): number | null {
    if (value === null)
        return null;
    return Math.ceil(value);
}
function float8Floor(value: number | null): number | null {
    if (value === null)
        return null;
    return Math.floor(value);
}
function float8Round(value: number | null): number | null {
    if (value === null || !Number.isFinite(value) || value === 0)
        return value;
    const magnitude = Math.abs(value);
    const lower = Math.floor(magnitude);
    const rounded = magnitude - lower === 0.5 ? (lower % 2 === 0 ? lower : lower + 1) : Math.round(magnitude);
    return value < 0 ? -rounded : rounded;
}
function float8Trunc(value: number | null): number | null {
    if (value === null)
        return null;
    return Math.trunc(value);
}
function float8Sign(value: number | null): number | null {
    if (value === null)
        return null;
    return value > 0 ? 1 : value < 0 ? -1 : 0;
}
class SqlPowerArgumentError extends Error {
    readonly code = "2201F";
    constructor() { super("cannot take square root of a negative number"); }
}
function float8Sqrt(value: number | null): number | null {
    if (value === null)
        return null;
    if (value < 0)
        throw new SqlPowerArgumentError();
    return Math.sqrt(value);
}
function float8Cbrt(value: number | null): number | null {
    if (value === null)
        return null;
    return Math.cbrt(value);
}
function evaluate0() {
    return int2Add(int2Input("2"), int2Input("3"));
}
function evaluate1() {
    return int2Add(int2Input("-2"), int2Input("-3"));
}
function evaluate2() {
    return int2Add(int2Input("0"), int2Input("0"));
}
function evaluate3() {
    return int2Add(int2Input("32767"), int2Input("0"));
}
function evaluate4() {
    return int2Add(int2Input("-32768"), int2Input("0"));
}
function evaluate5() {
    return int2Add(int2Input("32766"), int2Input("1"));
}
function evaluate6() {
    return int2Add(int2Input("-32767"), int2Input("-1"));
}
function evaluate7() {
    return int2Add(int2Input("32767"), int2Input("-32768"));
}
function evaluate8() {
    return int2Add(int2Input("32767"), int2Input("1"));
}
function evaluate9() {
    return int2Add(int2Input("-32768"), int2Input("-1"));
}
function evaluate10() {
    return int2Add(int2Input("32767"), int2Input("32767"));
}
function evaluate11() {
    return int2Add(int2Input("-32768"), int2Input("-32768"));
}
function evaluate12() {
    return int2Add(int2Input(null), int2Input("1"));
}
function evaluate13() {
    return int2Add(int2Input("1"), int2Input(null));
}
function evaluate14() {
    return int2Add(int2Input(null), int2Input(null));
}
function evaluate15() {
    return int2Add(int2Input(null), int2Input("32767"));
}
function evaluate16() {
    return int4Add(int4Input("2"), int4Input("3"));
}
function evaluate17() {
    return int4Add(int4Input("-2"), int4Input("-3"));
}
function evaluate18() {
    return int4Add(int4Input("0"), int4Input("0"));
}
function evaluate19() {
    return int4Add(int4Input("2147483647"), int4Input("0"));
}
function evaluate20() {
    return int4Add(int4Input("-2147483648"), int4Input("0"));
}
function evaluate21() {
    return int4Add(int4Input("2147483646"), int4Input("1"));
}
function evaluate22() {
    return int4Add(int4Input("-2147483647"), int4Input("-1"));
}
function evaluate23() {
    return int4Add(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate24() {
    return int4Add(int4Input("2147483647"), int4Input("1"));
}
function evaluate25() {
    return int4Add(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate26() {
    return int4Add(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate27() {
    return int4Add(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate28() {
    return int4Add(int4Input(null), int4Input("1"));
}
function evaluate29() {
    return int4Add(int4Input("1"), int4Input(null));
}
function evaluate30() {
    return int4Add(int4Input(null), int4Input(null));
}
function evaluate31() {
    return int4Add(int4Input(null), int4Input("2147483647"));
}
function evaluate32() {
    return int8Add(int8Input("2"), int8Input("3"));
}
function evaluate33() {
    return int8Add(int8Input("-2"), int8Input("-3"));
}
function evaluate34() {
    return int8Add(int8Input("0"), int8Input("0"));
}
function evaluate35() {
    return int8Add(int8Input("9223372036854775807"), int8Input("0"));
}
function evaluate36() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate37() {
    return int8Add(int8Input("9223372036854775806"), int8Input("1"));
}
function evaluate38() {
    return int8Add(int8Input("-9223372036854775807"), int8Input("-1"));
}
function evaluate39() {
    return int8Add(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate40() {
    return int8Add(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate41() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate42() {
    return int8Add(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate43() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate44() {
    return int8Add(int8Input(null), int8Input("1"));
}
function evaluate45() {
    return int8Add(int8Input("1"), int8Input(null));
}
function evaluate46() {
    return int8Add(int8Input(null), int8Input(null));
}
function evaluate47() {
    return int8Add(int8Input(null), int8Input("9223372036854775807"));
}
function evaluate48() {
    return int8Add(int8Input("9223372036854775807"), int8Add(int8Input("1"), int8Input("-1")));
}
function evaluate49() {
    return int8Add(int8Add(int8Input("9223372036854775807"), int8Input("1")), int8Input("-1"));
}
function evaluate50() {
    return int4Add(int4Add(int4Input("1"), int4Input(null)), int4Input("2"));
}
function evaluate51() {
    return int8Add(int8Input("9007199254740993"), int8Input("2"));
}
function evaluate52() {
    return int8Mul(int8Input("2"), int8Input("-4611686018427387904"));
}
function evaluate53() {
    return int8Mul(int8Input("-4611686018427387904"), int8Input("2"));
}
function evaluate54() {
    return int8Mul(int8Input("7"), int8Input("1317624576693539401"));
}
function evaluate55() {
    return int8Mul(int8Input("2"), int8Input("4611686018427387904"));
}
function evaluate56() {
    return int8Mul(int8Input("-2"), int8Input("-4611686018427387904"));
}
function evaluate57() {
    return int8Mul(int8Input("3"), int8Input("-3074457345618258603"));
}
function evaluate58() {
    return int8Mul(int8Input("-3074457345618258603"), int8Input("3"));
}
function evaluate59() {
    return int8Mul(int8Input("3"), int8Input("-3074457345618258602"));
}
function evaluate60() {
    return int8Mul(int8Input("-3074457345618258602"), int8Input("3"));
}
function evaluate61() {
    return int2Sub(int2Input(null), int2Abs(int2Input("-32768")));
}
function evaluate62() {
    return int2Mul(int2Input(null), int2Abs(int2Input("-32768")));
}
function evaluate63() {
    return integerEq(int2Abs(int2Input("-32768")), int2Input(null));
}
function evaluate64() {
    return integerEq(int2Input(null), int2Abs(int2Input("-32768")));
}
function evaluate65() {
    return int2Neg(int2Abs(int2Input("-32768")));
}
function evaluate66() {
    return int2Abs(int2Abs(int2Input("-32768")));
}
function evaluate67() {
    return int8Cast(int2Abs(int2Input("-32768")));
}
function evaluate68() {
    return int4Sub(int4Input(null), int4Abs(int4Input("-2147483648")));
}
function evaluate69() {
    return int4Mul(int4Input(null), int4Abs(int4Input("-2147483648")));
}
function evaluate70() {
    return integerEq(int4Abs(int4Input("-2147483648")), int4Input(null));
}
function evaluate71() {
    return integerEq(int4Input(null), int4Abs(int4Input("-2147483648")));
}
function evaluate72() {
    return int4Neg(int4Abs(int4Input("-2147483648")));
}
function evaluate73() {
    return int4Abs(int4Abs(int4Input("-2147483648")));
}
function evaluate74() {
    return int8Cast(int4Abs(int4Input("-2147483648")));
}
function evaluate75() {
    return int8Sub(int8Input(null), int8Abs(int8Input("-9223372036854775808")));
}
function evaluate76() {
    return int8Mul(int8Input(null), int8Abs(int8Input("-9223372036854775808")));
}
function evaluate77() {
    return integerEq(int8Abs(int8Input("-9223372036854775808")), int8Input(null));
}
function evaluate78() {
    return integerEq(int8Input(null), int8Abs(int8Input("-9223372036854775808")));
}
function evaluate79() {
    return int8Neg(int8Abs(int8Input("-9223372036854775808")));
}
function evaluate80() {
    return int8Abs(int8Abs(int8Input("-9223372036854775808")));
}
function evaluate81() {
    return int8Abs(int8Input("-9223372036854775808"));
}
function evaluate82() {
    return int2Input("-32769");
}
function evaluate83() {
    return int2Input("32768");
}
function evaluate84() {
    return int4Input("-2147483649");
}
function evaluate85() {
    return int4Input("2147483648");
}
function evaluate86() {
    return int8Input("-9223372036854775809");
}
function evaluate87() {
    return int8Input("9223372036854775808");
}
function evaluate88() {
    return int2Add(int2Input("2"), int2Input("3"));
}
function evaluate89() {
    return int2Add(int2Input("-2"), int2Input("-3"));
}
function evaluate90() {
    return int2Add(int2Input("0"), int2Input("0"));
}
function evaluate91() {
    return int2Add(int2Input("-32768"), int2Input("1"));
}
function evaluate92() {
    return int2Add(int2Input("32767"), int2Input("1"));
}
function evaluate93() {
    return int2Add(int2Input("1"), int2Input("-32768"));
}
function evaluate94() {
    return int2Add(int2Input("1"), int2Input("32767"));
}
function evaluate95() {
    return int2Add(int2Input("-32768"), int2Input("-1"));
}
function evaluate96() {
    return int2Add(int2Input("-1"), int2Input("-32768"));
}
function evaluate97() {
    return int2Add(int2Input("32767"), int2Input("-1"));
}
function evaluate98() {
    return int2Add(int2Input("-1"), int2Input("32767"));
}
function evaluate99() {
    return int2Add(int2Input("-32768"), int2Input("-32768"));
}
function evaluate100() {
    return int2Add(int2Input("32767"), int2Input("32767"));
}
function evaluate101() {
    return int2Add(int2Input("32767"), int2Input("-32768"));
}
function evaluate102() {
    return int2Add(int2Input("-32768"), int2Input("32767"));
}
function evaluate103() {
    return int2Add(int2Input("-2"), int2Input("-32768"));
}
function evaluate104() {
    return int2Add(int2Input("2"), int2Input("32767"));
}
function evaluate105() {
    return int2Add(int2Input("0"), int2Input("-32768"));
}
function evaluate106() {
    return int2Add(int2Input("-32768"), int2Input("0"));
}
function evaluate107() {
    return int2Add(int2Input("32767"), int2Input("0"));
}
function evaluate108() {
    return int2Add(int2Input(null), int2Input("32767"));
}
function evaluate109() {
    return int2Add(int2Input("32767"), int2Input(null));
}
function evaluate110() {
    return int2Add(int2Input(null), int2Input(null));
}
function evaluate111() {
    return int2Sub(int2Input("2"), int2Input("3"));
}
function evaluate112() {
    return int2Sub(int2Input("-2"), int2Input("-3"));
}
function evaluate113() {
    return int2Sub(int2Input("0"), int2Input("0"));
}
function evaluate114() {
    return int2Sub(int2Input("-32768"), int2Input("1"));
}
function evaluate115() {
    return int2Sub(int2Input("32767"), int2Input("1"));
}
function evaluate116() {
    return int2Sub(int2Input("1"), int2Input("-32768"));
}
function evaluate117() {
    return int2Sub(int2Input("1"), int2Input("32767"));
}
function evaluate118() {
    return int2Sub(int2Input("-32768"), int2Input("-1"));
}
function evaluate119() {
    return int2Sub(int2Input("-1"), int2Input("-32768"));
}
function evaluate120() {
    return int2Sub(int2Input("32767"), int2Input("-1"));
}
function evaluate121() {
    return int2Sub(int2Input("-1"), int2Input("32767"));
}
function evaluate122() {
    return int2Sub(int2Input("-32768"), int2Input("-32768"));
}
function evaluate123() {
    return int2Sub(int2Input("32767"), int2Input("32767"));
}
function evaluate124() {
    return int2Sub(int2Input("32767"), int2Input("-32768"));
}
function evaluate125() {
    return int2Sub(int2Input("-32768"), int2Input("32767"));
}
function evaluate126() {
    return int2Sub(int2Input("-2"), int2Input("-32768"));
}
function evaluate127() {
    return int2Sub(int2Input("2"), int2Input("32767"));
}
function evaluate128() {
    return int2Sub(int2Input("0"), int2Input("-32768"));
}
function evaluate129() {
    return int2Sub(int2Input("-32768"), int2Input("0"));
}
function evaluate130() {
    return int2Sub(int2Input("32767"), int2Input("0"));
}
function evaluate131() {
    return int2Sub(int2Input(null), int2Input("32767"));
}
function evaluate132() {
    return int2Sub(int2Input("32767"), int2Input(null));
}
function evaluate133() {
    return int2Sub(int2Input(null), int2Input(null));
}
function evaluate134() {
    return int2Mul(int2Input("2"), int2Input("3"));
}
function evaluate135() {
    return int2Mul(int2Input("-2"), int2Input("-3"));
}
function evaluate136() {
    return int2Mul(int2Input("0"), int2Input("0"));
}
function evaluate137() {
    return int2Mul(int2Input("-32768"), int2Input("1"));
}
function evaluate138() {
    return int2Mul(int2Input("32767"), int2Input("1"));
}
function evaluate139() {
    return int2Mul(int2Input("1"), int2Input("-32768"));
}
function evaluate140() {
    return int2Mul(int2Input("1"), int2Input("32767"));
}
function evaluate141() {
    return int2Mul(int2Input("-32768"), int2Input("-1"));
}
function evaluate142() {
    return int2Mul(int2Input("-1"), int2Input("-32768"));
}
function evaluate143() {
    return int2Mul(int2Input("32767"), int2Input("-1"));
}
function evaluate144() {
    return int2Mul(int2Input("-1"), int2Input("32767"));
}
function evaluate145() {
    return int2Mul(int2Input("-32768"), int2Input("-32768"));
}
function evaluate146() {
    return int2Mul(int2Input("32767"), int2Input("32767"));
}
function evaluate147() {
    return int2Mul(int2Input("32767"), int2Input("-32768"));
}
function evaluate148() {
    return int2Mul(int2Input("-32768"), int2Input("32767"));
}
function evaluate149() {
    return int2Mul(int2Input("-2"), int2Input("-32768"));
}
function evaluate150() {
    return int2Mul(int2Input("2"), int2Input("32767"));
}
function evaluate151() {
    return int2Mul(int2Input("0"), int2Input("-32768"));
}
function evaluate152() {
    return int2Mul(int2Input("-32768"), int2Input("0"));
}
function evaluate153() {
    return int2Mul(int2Input("32767"), int2Input("0"));
}
function evaluate154() {
    return int2Mul(int2Input(null), int2Input("32767"));
}
function evaluate155() {
    return int2Mul(int2Input("32767"), int2Input(null));
}
function evaluate156() {
    return int2Mul(int2Input(null), int2Input(null));
}
function evaluate157() {
    return int4Add(int2Input("2"), int4Input("3"));
}
function evaluate158() {
    return int4Add(int2Input("-2"), int4Input("-3"));
}
function evaluate159() {
    return int4Add(int2Input("0"), int4Input("0"));
}
function evaluate160() {
    return int4Add(int2Input("-32768"), int4Input("1"));
}
function evaluate161() {
    return int4Add(int2Input("32767"), int4Input("1"));
}
function evaluate162() {
    return int4Add(int2Input("1"), int4Input("-2147483648"));
}
function evaluate163() {
    return int4Add(int2Input("1"), int4Input("2147483647"));
}
function evaluate164() {
    return int4Add(int2Input("-32768"), int4Input("-1"));
}
function evaluate165() {
    return int4Add(int2Input("-1"), int4Input("-2147483648"));
}
function evaluate166() {
    return int4Add(int2Input("32767"), int4Input("-1"));
}
function evaluate167() {
    return int4Add(int2Input("-1"), int4Input("2147483647"));
}
function evaluate168() {
    return int4Add(int2Input("-32768"), int4Input("-2147483648"));
}
function evaluate169() {
    return int4Add(int2Input("32767"), int4Input("2147483647"));
}
function evaluate170() {
    return int4Add(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate171() {
    return int4Add(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate172() {
    return int4Add(int2Input("-2"), int4Input("-2147483648"));
}
function evaluate173() {
    return int4Add(int2Input("2"), int4Input("2147483647"));
}
function evaluate174() {
    return int4Add(int2Input("0"), int4Input("-2147483648"));
}
function evaluate175() {
    return int4Add(int2Input("-32768"), int4Input("0"));
}
function evaluate176() {
    return int4Add(int2Input("32767"), int4Input("0"));
}
function evaluate177() {
    return int4Add(int2Input(null), int4Input("2147483647"));
}
function evaluate178() {
    return int4Add(int2Input("32767"), int4Input(null));
}
function evaluate179() {
    return int4Add(int2Input(null), int4Input(null));
}
function evaluate180() {
    return int4Sub(int2Input("2"), int4Input("3"));
}
function evaluate181() {
    return int4Sub(int2Input("-2"), int4Input("-3"));
}
function evaluate182() {
    return int4Sub(int2Input("0"), int4Input("0"));
}
function evaluate183() {
    return int4Sub(int2Input("-32768"), int4Input("1"));
}
function evaluate184() {
    return int4Sub(int2Input("32767"), int4Input("1"));
}
function evaluate185() {
    return int4Sub(int2Input("1"), int4Input("-2147483648"));
}
function evaluate186() {
    return int4Sub(int2Input("1"), int4Input("2147483647"));
}
function evaluate187() {
    return int4Sub(int2Input("-32768"), int4Input("-1"));
}
function evaluate188() {
    return int4Sub(int2Input("-1"), int4Input("-2147483648"));
}
function evaluate189() {
    return int4Sub(int2Input("32767"), int4Input("-1"));
}
function evaluate190() {
    return int4Sub(int2Input("-1"), int4Input("2147483647"));
}
function evaluate191() {
    return int4Sub(int2Input("-32768"), int4Input("-2147483648"));
}
function evaluate192() {
    return int4Sub(int2Input("32767"), int4Input("2147483647"));
}
function evaluate193() {
    return int4Sub(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate194() {
    return int4Sub(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate195() {
    return int4Sub(int2Input("-2"), int4Input("-2147483648"));
}
function evaluate196() {
    return int4Sub(int2Input("2"), int4Input("2147483647"));
}
function evaluate197() {
    return int4Sub(int2Input("0"), int4Input("-2147483648"));
}
function evaluate198() {
    return int4Sub(int2Input("-32768"), int4Input("0"));
}
function evaluate199() {
    return int4Sub(int2Input("32767"), int4Input("0"));
}
function evaluate200() {
    return int4Sub(int2Input(null), int4Input("2147483647"));
}
function evaluate201() {
    return int4Sub(int2Input("32767"), int4Input(null));
}
function evaluate202() {
    return int4Sub(int2Input(null), int4Input(null));
}
function evaluate203() {
    return int4Mul(int2Input("2"), int4Input("3"));
}
function evaluate204() {
    return int4Mul(int2Input("-2"), int4Input("-3"));
}
function evaluate205() {
    return int4Mul(int2Input("0"), int4Input("0"));
}
function evaluate206() {
    return int4Mul(int2Input("-32768"), int4Input("1"));
}
function evaluate207() {
    return int4Mul(int2Input("32767"), int4Input("1"));
}
function evaluate208() {
    return int4Mul(int2Input("1"), int4Input("-2147483648"));
}
function evaluate209() {
    return int4Mul(int2Input("1"), int4Input("2147483647"));
}
function evaluate210() {
    return int4Mul(int2Input("-32768"), int4Input("-1"));
}
function evaluate211() {
    return int4Mul(int2Input("-1"), int4Input("-2147483648"));
}
function evaluate212() {
    return int4Mul(int2Input("32767"), int4Input("-1"));
}
function evaluate213() {
    return int4Mul(int2Input("-1"), int4Input("2147483647"));
}
function evaluate214() {
    return int4Mul(int2Input("-32768"), int4Input("-2147483648"));
}
function evaluate215() {
    return int4Mul(int2Input("32767"), int4Input("2147483647"));
}
function evaluate216() {
    return int4Mul(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate217() {
    return int4Mul(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate218() {
    return int4Mul(int2Input("-2"), int4Input("-2147483648"));
}
function evaluate219() {
    return int4Mul(int2Input("2"), int4Input("2147483647"));
}
function evaluate220() {
    return int4Mul(int2Input("0"), int4Input("-2147483648"));
}
function evaluate221() {
    return int4Mul(int2Input("-32768"), int4Input("0"));
}
function evaluate222() {
    return int4Mul(int2Input("32767"), int4Input("0"));
}
function evaluate223() {
    return int4Mul(int2Input(null), int4Input("2147483647"));
}
function evaluate224() {
    return int4Mul(int2Input("32767"), int4Input(null));
}
function evaluate225() {
    return int4Mul(int2Input(null), int4Input(null));
}
function evaluate226() {
    return int8Add(int2Input("2"), int8Input("3"));
}
function evaluate227() {
    return int8Add(int2Input("-2"), int8Input("-3"));
}
function evaluate228() {
    return int8Add(int2Input("0"), int8Input("0"));
}
function evaluate229() {
    return int8Add(int2Input("-32768"), int8Input("1"));
}
function evaluate230() {
    return int8Add(int2Input("32767"), int8Input("1"));
}
function evaluate231() {
    return int8Add(int2Input("1"), int8Input("-9223372036854775808"));
}
function evaluate232() {
    return int8Add(int2Input("1"), int8Input("9223372036854775807"));
}
function evaluate233() {
    return int8Add(int2Input("-32768"), int8Input("-1"));
}
function evaluate234() {
    return int8Add(int2Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate235() {
    return int8Add(int2Input("32767"), int8Input("-1"));
}
function evaluate236() {
    return int8Add(int2Input("-1"), int8Input("9223372036854775807"));
}
function evaluate237() {
    return int8Add(int2Input("-32768"), int8Input("-9223372036854775808"));
}
function evaluate238() {
    return int8Add(int2Input("32767"), int8Input("9223372036854775807"));
}
function evaluate239() {
    return int8Add(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate240() {
    return int8Add(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate241() {
    return int8Add(int2Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate242() {
    return int8Add(int2Input("2"), int8Input("9223372036854775807"));
}
function evaluate243() {
    return int8Add(int2Input("0"), int8Input("-9223372036854775808"));
}
function evaluate244() {
    return int8Add(int2Input("-32768"), int8Input("0"));
}
function evaluate245() {
    return int8Add(int2Input("32767"), int8Input("0"));
}
function evaluate246() {
    return int8Add(int2Input(null), int8Input("9223372036854775807"));
}
function evaluate247() {
    return int8Add(int2Input("32767"), int8Input(null));
}
function evaluate248() {
    return int8Add(int2Input(null), int8Input(null));
}
function evaluate249() {
    return int8Sub(int2Input("2"), int8Input("3"));
}
function evaluate250() {
    return int8Sub(int2Input("-2"), int8Input("-3"));
}
function evaluate251() {
    return int8Sub(int2Input("0"), int8Input("0"));
}
function evaluate252() {
    return int8Sub(int2Input("-32768"), int8Input("1"));
}
function evaluate253() {
    return int8Sub(int2Input("32767"), int8Input("1"));
}
function evaluate254() {
    return int8Sub(int2Input("1"), int8Input("-9223372036854775808"));
}
function evaluate255() {
    return int8Sub(int2Input("1"), int8Input("9223372036854775807"));
}
function evaluate256() {
    return int8Sub(int2Input("-32768"), int8Input("-1"));
}
function evaluate257() {
    return int8Sub(int2Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate258() {
    return int8Sub(int2Input("32767"), int8Input("-1"));
}
function evaluate259() {
    return int8Sub(int2Input("-1"), int8Input("9223372036854775807"));
}
function evaluate260() {
    return int8Sub(int2Input("-32768"), int8Input("-9223372036854775808"));
}
function evaluate261() {
    return int8Sub(int2Input("32767"), int8Input("9223372036854775807"));
}
function evaluate262() {
    return int8Sub(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate263() {
    return int8Sub(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate264() {
    return int8Sub(int2Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate265() {
    return int8Sub(int2Input("2"), int8Input("9223372036854775807"));
}
function evaluate266() {
    return int8Sub(int2Input("0"), int8Input("-9223372036854775808"));
}
function evaluate267() {
    return int8Sub(int2Input("-32768"), int8Input("0"));
}
function evaluate268() {
    return int8Sub(int2Input("32767"), int8Input("0"));
}
function evaluate269() {
    return int8Sub(int2Input(null), int8Input("9223372036854775807"));
}
function evaluate270() {
    return int8Sub(int2Input("32767"), int8Input(null));
}
function evaluate271() {
    return int8Sub(int2Input(null), int8Input(null));
}
function evaluate272() {
    return int8Mul(int2Input("2"), int8Input("3"));
}
function evaluate273() {
    return int8Mul(int2Input("-2"), int8Input("-3"));
}
function evaluate274() {
    return int8Mul(int2Input("0"), int8Input("0"));
}
function evaluate275() {
    return int8Mul(int2Input("-32768"), int8Input("1"));
}
function evaluate276() {
    return int8Mul(int2Input("32767"), int8Input("1"));
}
function evaluate277() {
    return int8Mul(int2Input("1"), int8Input("-9223372036854775808"));
}
function evaluate278() {
    return int8Mul(int2Input("1"), int8Input("9223372036854775807"));
}
function evaluate279() {
    return int8Mul(int2Input("-32768"), int8Input("-1"));
}
function evaluate280() {
    return int8Mul(int2Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate281() {
    return int8Mul(int2Input("32767"), int8Input("-1"));
}
function evaluate282() {
    return int8Mul(int2Input("-1"), int8Input("9223372036854775807"));
}
function evaluate283() {
    return int8Mul(int2Input("-32768"), int8Input("-9223372036854775808"));
}
function evaluate284() {
    return int8Mul(int2Input("32767"), int8Input("9223372036854775807"));
}
function evaluate285() {
    return int8Mul(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate286() {
    return int8Mul(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate287() {
    return int8Mul(int2Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate288() {
    return int8Mul(int2Input("2"), int8Input("9223372036854775807"));
}
function evaluate289() {
    return int8Mul(int2Input("0"), int8Input("-9223372036854775808"));
}
function evaluate290() {
    return int8Mul(int2Input("-32768"), int8Input("0"));
}
function evaluate291() {
    return int8Mul(int2Input("32767"), int8Input("0"));
}
function evaluate292() {
    return int8Mul(int2Input(null), int8Input("9223372036854775807"));
}
function evaluate293() {
    return int8Mul(int2Input("32767"), int8Input(null));
}
function evaluate294() {
    return int8Mul(int2Input(null), int8Input(null));
}
function evaluate295() {
    return int4Add(int4Input("2"), int2Input("3"));
}
function evaluate296() {
    return int4Add(int4Input("-2"), int2Input("-3"));
}
function evaluate297() {
    return int4Add(int4Input("0"), int2Input("0"));
}
function evaluate298() {
    return int4Add(int4Input("-2147483648"), int2Input("1"));
}
function evaluate299() {
    return int4Add(int4Input("2147483647"), int2Input("1"));
}
function evaluate300() {
    return int4Add(int4Input("1"), int2Input("-32768"));
}
function evaluate301() {
    return int4Add(int4Input("1"), int2Input("32767"));
}
function evaluate302() {
    return int4Add(int4Input("-2147483648"), int2Input("-1"));
}
function evaluate303() {
    return int4Add(int4Input("-1"), int2Input("-32768"));
}
function evaluate304() {
    return int4Add(int4Input("2147483647"), int2Input("-1"));
}
function evaluate305() {
    return int4Add(int4Input("-1"), int2Input("32767"));
}
function evaluate306() {
    return int4Add(int4Input("-2147483648"), int2Input("-32768"));
}
function evaluate307() {
    return int4Add(int4Input("2147483647"), int2Input("32767"));
}
function evaluate308() {
    return int4Add(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate309() {
    return int4Add(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate310() {
    return int4Add(int4Input("-2"), int2Input("-32768"));
}
function evaluate311() {
    return int4Add(int4Input("2"), int2Input("32767"));
}
function evaluate312() {
    return int4Add(int4Input("0"), int2Input("-32768"));
}
function evaluate313() {
    return int4Add(int4Input("-2147483648"), int2Input("0"));
}
function evaluate314() {
    return int4Add(int4Input("2147483647"), int2Input("0"));
}
function evaluate315() {
    return int4Add(int4Input(null), int2Input("32767"));
}
function evaluate316() {
    return int4Add(int4Input("2147483647"), int2Input(null));
}
function evaluate317() {
    return int4Add(int4Input(null), int2Input(null));
}
function evaluate318() {
    return int4Sub(int4Input("2"), int2Input("3"));
}
function evaluate319() {
    return int4Sub(int4Input("-2"), int2Input("-3"));
}
function evaluate320() {
    return int4Sub(int4Input("0"), int2Input("0"));
}
function evaluate321() {
    return int4Sub(int4Input("-2147483648"), int2Input("1"));
}
function evaluate322() {
    return int4Sub(int4Input("2147483647"), int2Input("1"));
}
function evaluate323() {
    return int4Sub(int4Input("1"), int2Input("-32768"));
}
function evaluate324() {
    return int4Sub(int4Input("1"), int2Input("32767"));
}
function evaluate325() {
    return int4Sub(int4Input("-2147483648"), int2Input("-1"));
}
function evaluate326() {
    return int4Sub(int4Input("-1"), int2Input("-32768"));
}
function evaluate327() {
    return int4Sub(int4Input("2147483647"), int2Input("-1"));
}
function evaluate328() {
    return int4Sub(int4Input("-1"), int2Input("32767"));
}
function evaluate329() {
    return int4Sub(int4Input("-2147483648"), int2Input("-32768"));
}
function evaluate330() {
    return int4Sub(int4Input("2147483647"), int2Input("32767"));
}
function evaluate331() {
    return int4Sub(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate332() {
    return int4Sub(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate333() {
    return int4Sub(int4Input("-2"), int2Input("-32768"));
}
function evaluate334() {
    return int4Sub(int4Input("2"), int2Input("32767"));
}
function evaluate335() {
    return int4Sub(int4Input("0"), int2Input("-32768"));
}
function evaluate336() {
    return int4Sub(int4Input("-2147483648"), int2Input("0"));
}
function evaluate337() {
    return int4Sub(int4Input("2147483647"), int2Input("0"));
}
function evaluate338() {
    return int4Sub(int4Input(null), int2Input("32767"));
}
function evaluate339() {
    return int4Sub(int4Input("2147483647"), int2Input(null));
}
function evaluate340() {
    return int4Sub(int4Input(null), int2Input(null));
}
function evaluate341() {
    return int4Mul(int4Input("2"), int2Input("3"));
}
function evaluate342() {
    return int4Mul(int4Input("-2"), int2Input("-3"));
}
function evaluate343() {
    return int4Mul(int4Input("0"), int2Input("0"));
}
function evaluate344() {
    return int4Mul(int4Input("-2147483648"), int2Input("1"));
}
function evaluate345() {
    return int4Mul(int4Input("2147483647"), int2Input("1"));
}
function evaluate346() {
    return int4Mul(int4Input("1"), int2Input("-32768"));
}
function evaluate347() {
    return int4Mul(int4Input("1"), int2Input("32767"));
}
function evaluate348() {
    return int4Mul(int4Input("-2147483648"), int2Input("-1"));
}
function evaluate349() {
    return int4Mul(int4Input("-1"), int2Input("-32768"));
}
function evaluate350() {
    return int4Mul(int4Input("2147483647"), int2Input("-1"));
}
function evaluate351() {
    return int4Mul(int4Input("-1"), int2Input("32767"));
}
function evaluate352() {
    return int4Mul(int4Input("-2147483648"), int2Input("-32768"));
}
function evaluate353() {
    return int4Mul(int4Input("2147483647"), int2Input("32767"));
}
function evaluate354() {
    return int4Mul(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate355() {
    return int4Mul(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate356() {
    return int4Mul(int4Input("-2"), int2Input("-32768"));
}
function evaluate357() {
    return int4Mul(int4Input("2"), int2Input("32767"));
}
function evaluate358() {
    return int4Mul(int4Input("0"), int2Input("-32768"));
}
function evaluate359() {
    return int4Mul(int4Input("-2147483648"), int2Input("0"));
}
function evaluate360() {
    return int4Mul(int4Input("2147483647"), int2Input("0"));
}
function evaluate361() {
    return int4Mul(int4Input(null), int2Input("32767"));
}
function evaluate362() {
    return int4Mul(int4Input("2147483647"), int2Input(null));
}
function evaluate363() {
    return int4Mul(int4Input(null), int2Input(null));
}
function evaluate364() {
    return int4Add(int4Input("2"), int4Input("3"));
}
function evaluate365() {
    return int4Add(int4Input("-2"), int4Input("-3"));
}
function evaluate366() {
    return int4Add(int4Input("0"), int4Input("0"));
}
function evaluate367() {
    return int4Add(int4Input("-2147483648"), int4Input("1"));
}
function evaluate368() {
    return int4Add(int4Input("2147483647"), int4Input("1"));
}
function evaluate369() {
    return int4Add(int4Input("1"), int4Input("-2147483648"));
}
function evaluate370() {
    return int4Add(int4Input("1"), int4Input("2147483647"));
}
function evaluate371() {
    return int4Add(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate372() {
    return int4Add(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate373() {
    return int4Add(int4Input("2147483647"), int4Input("-1"));
}
function evaluate374() {
    return int4Add(int4Input("-1"), int4Input("2147483647"));
}
function evaluate375() {
    return int4Add(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate376() {
    return int4Add(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate377() {
    return int4Add(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate378() {
    return int4Add(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate379() {
    return int4Add(int4Input("-2"), int4Input("-2147483648"));
}
function evaluate380() {
    return int4Add(int4Input("2"), int4Input("2147483647"));
}
function evaluate381() {
    return int4Add(int4Input("0"), int4Input("-2147483648"));
}
function evaluate382() {
    return int4Add(int4Input("-2147483648"), int4Input("0"));
}
function evaluate383() {
    return int4Add(int4Input("2147483647"), int4Input("0"));
}
function evaluate384() {
    return int4Add(int4Input(null), int4Input("2147483647"));
}
function evaluate385() {
    return int4Add(int4Input("2147483647"), int4Input(null));
}
function evaluate386() {
    return int4Add(int4Input(null), int4Input(null));
}
function evaluate387() {
    return int4Sub(int4Input("2"), int4Input("3"));
}
function evaluate388() {
    return int4Sub(int4Input("-2"), int4Input("-3"));
}
function evaluate389() {
    return int4Sub(int4Input("0"), int4Input("0"));
}
function evaluate390() {
    return int4Sub(int4Input("-2147483648"), int4Input("1"));
}
function evaluate391() {
    return int4Sub(int4Input("2147483647"), int4Input("1"));
}
function evaluate392() {
    return int4Sub(int4Input("1"), int4Input("-2147483648"));
}
function evaluate393() {
    return int4Sub(int4Input("1"), int4Input("2147483647"));
}
function evaluate394() {
    return int4Sub(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate395() {
    return int4Sub(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate396() {
    return int4Sub(int4Input("2147483647"), int4Input("-1"));
}
function evaluate397() {
    return int4Sub(int4Input("-1"), int4Input("2147483647"));
}
function evaluate398() {
    return int4Sub(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate399() {
    return int4Sub(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate400() {
    return int4Sub(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate401() {
    return int4Sub(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate402() {
    return int4Sub(int4Input("-2"), int4Input("-2147483648"));
}
function evaluate403() {
    return int4Sub(int4Input("2"), int4Input("2147483647"));
}
function evaluate404() {
    return int4Sub(int4Input("0"), int4Input("-2147483648"));
}
function evaluate405() {
    return int4Sub(int4Input("-2147483648"), int4Input("0"));
}
function evaluate406() {
    return int4Sub(int4Input("2147483647"), int4Input("0"));
}
function evaluate407() {
    return int4Sub(int4Input(null), int4Input("2147483647"));
}
function evaluate408() {
    return int4Sub(int4Input("2147483647"), int4Input(null));
}
function evaluate409() {
    return int4Sub(int4Input(null), int4Input(null));
}
function evaluate410() {
    return int4Mul(int4Input("2"), int4Input("3"));
}
function evaluate411() {
    return int4Mul(int4Input("-2"), int4Input("-3"));
}
function evaluate412() {
    return int4Mul(int4Input("0"), int4Input("0"));
}
function evaluate413() {
    return int4Mul(int4Input("-2147483648"), int4Input("1"));
}
function evaluate414() {
    return int4Mul(int4Input("2147483647"), int4Input("1"));
}
function evaluate415() {
    return int4Mul(int4Input("1"), int4Input("-2147483648"));
}
function evaluate416() {
    return int4Mul(int4Input("1"), int4Input("2147483647"));
}
function evaluate417() {
    return int4Mul(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate418() {
    return int4Mul(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate419() {
    return int4Mul(int4Input("2147483647"), int4Input("-1"));
}
function evaluate420() {
    return int4Mul(int4Input("-1"), int4Input("2147483647"));
}
function evaluate421() {
    return int4Mul(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate422() {
    return int4Mul(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate423() {
    return int4Mul(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate424() {
    return int4Mul(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate425() {
    return int4Mul(int4Input("-2"), int4Input("-2147483648"));
}
function evaluate426() {
    return int4Mul(int4Input("2"), int4Input("2147483647"));
}
function evaluate427() {
    return int4Mul(int4Input("0"), int4Input("-2147483648"));
}
function evaluate428() {
    return int4Mul(int4Input("-2147483648"), int4Input("0"));
}
function evaluate429() {
    return int4Mul(int4Input("2147483647"), int4Input("0"));
}
function evaluate430() {
    return int4Mul(int4Input(null), int4Input("2147483647"));
}
function evaluate431() {
    return int4Mul(int4Input("2147483647"), int4Input(null));
}
function evaluate432() {
    return int4Mul(int4Input(null), int4Input(null));
}
function evaluate433() {
    return int8Add(int4Input("2"), int8Input("3"));
}
function evaluate434() {
    return int8Add(int4Input("-2"), int8Input("-3"));
}
function evaluate435() {
    return int8Add(int4Input("0"), int8Input("0"));
}
function evaluate436() {
    return int8Add(int4Input("-2147483648"), int8Input("1"));
}
function evaluate437() {
    return int8Add(int4Input("2147483647"), int8Input("1"));
}
function evaluate438() {
    return int8Add(int4Input("1"), int8Input("-9223372036854775808"));
}
function evaluate439() {
    return int8Add(int4Input("1"), int8Input("9223372036854775807"));
}
function evaluate440() {
    return int8Add(int4Input("-2147483648"), int8Input("-1"));
}
function evaluate441() {
    return int8Add(int4Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate442() {
    return int8Add(int4Input("2147483647"), int8Input("-1"));
}
function evaluate443() {
    return int8Add(int4Input("-1"), int8Input("9223372036854775807"));
}
function evaluate444() {
    return int8Add(int4Input("-2147483648"), int8Input("-9223372036854775808"));
}
function evaluate445() {
    return int8Add(int4Input("2147483647"), int8Input("9223372036854775807"));
}
function evaluate446() {
    return int8Add(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate447() {
    return int8Add(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate448() {
    return int8Add(int4Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate449() {
    return int8Add(int4Input("2"), int8Input("9223372036854775807"));
}
function evaluate450() {
    return int8Add(int4Input("0"), int8Input("-9223372036854775808"));
}
function evaluate451() {
    return int8Add(int4Input("-2147483648"), int8Input("0"));
}
function evaluate452() {
    return int8Add(int4Input("2147483647"), int8Input("0"));
}
function evaluate453() {
    return int8Add(int4Input(null), int8Input("9223372036854775807"));
}
function evaluate454() {
    return int8Add(int4Input("2147483647"), int8Input(null));
}
function evaluate455() {
    return int8Add(int4Input(null), int8Input(null));
}
function evaluate456() {
    return int8Sub(int4Input("2"), int8Input("3"));
}
function evaluate457() {
    return int8Sub(int4Input("-2"), int8Input("-3"));
}
function evaluate458() {
    return int8Sub(int4Input("0"), int8Input("0"));
}
function evaluate459() {
    return int8Sub(int4Input("-2147483648"), int8Input("1"));
}
function evaluate460() {
    return int8Sub(int4Input("2147483647"), int8Input("1"));
}
function evaluate461() {
    return int8Sub(int4Input("1"), int8Input("-9223372036854775808"));
}
function evaluate462() {
    return int8Sub(int4Input("1"), int8Input("9223372036854775807"));
}
function evaluate463() {
    return int8Sub(int4Input("-2147483648"), int8Input("-1"));
}
function evaluate464() {
    return int8Sub(int4Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate465() {
    return int8Sub(int4Input("2147483647"), int8Input("-1"));
}
function evaluate466() {
    return int8Sub(int4Input("-1"), int8Input("9223372036854775807"));
}
function evaluate467() {
    return int8Sub(int4Input("-2147483648"), int8Input("-9223372036854775808"));
}
function evaluate468() {
    return int8Sub(int4Input("2147483647"), int8Input("9223372036854775807"));
}
function evaluate469() {
    return int8Sub(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate470() {
    return int8Sub(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate471() {
    return int8Sub(int4Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate472() {
    return int8Sub(int4Input("2"), int8Input("9223372036854775807"));
}
function evaluate473() {
    return int8Sub(int4Input("0"), int8Input("-9223372036854775808"));
}
function evaluate474() {
    return int8Sub(int4Input("-2147483648"), int8Input("0"));
}
function evaluate475() {
    return int8Sub(int4Input("2147483647"), int8Input("0"));
}
function evaluate476() {
    return int8Sub(int4Input(null), int8Input("9223372036854775807"));
}
function evaluate477() {
    return int8Sub(int4Input("2147483647"), int8Input(null));
}
function evaluate478() {
    return int8Sub(int4Input(null), int8Input(null));
}
function evaluate479() {
    return int8Mul(int4Input("2"), int8Input("3"));
}
function evaluate480() {
    return int8Mul(int4Input("-2"), int8Input("-3"));
}
function evaluate481() {
    return int8Mul(int4Input("0"), int8Input("0"));
}
function evaluate482() {
    return int8Mul(int4Input("-2147483648"), int8Input("1"));
}
function evaluate483() {
    return int8Mul(int4Input("2147483647"), int8Input("1"));
}
function evaluate484() {
    return int8Mul(int4Input("1"), int8Input("-9223372036854775808"));
}
function evaluate485() {
    return int8Mul(int4Input("1"), int8Input("9223372036854775807"));
}
function evaluate486() {
    return int8Mul(int4Input("-2147483648"), int8Input("-1"));
}
function evaluate487() {
    return int8Mul(int4Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate488() {
    return int8Mul(int4Input("2147483647"), int8Input("-1"));
}
function evaluate489() {
    return int8Mul(int4Input("-1"), int8Input("9223372036854775807"));
}
function evaluate490() {
    return int8Mul(int4Input("-2147483648"), int8Input("-9223372036854775808"));
}
function evaluate491() {
    return int8Mul(int4Input("2147483647"), int8Input("9223372036854775807"));
}
function evaluate492() {
    return int8Mul(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate493() {
    return int8Mul(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate494() {
    return int8Mul(int4Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate495() {
    return int8Mul(int4Input("2"), int8Input("9223372036854775807"));
}
function evaluate496() {
    return int8Mul(int4Input("0"), int8Input("-9223372036854775808"));
}
function evaluate497() {
    return int8Mul(int4Input("-2147483648"), int8Input("0"));
}
function evaluate498() {
    return int8Mul(int4Input("2147483647"), int8Input("0"));
}
function evaluate499() {
    return int8Mul(int4Input(null), int8Input("9223372036854775807"));
}
function evaluate500() {
    return int8Mul(int4Input("2147483647"), int8Input(null));
}
function evaluate501() {
    return int8Mul(int4Input(null), int8Input(null));
}
function evaluate502() {
    return int8Add(int8Input("2"), int2Input("3"));
}
function evaluate503() {
    return int8Add(int8Input("-2"), int2Input("-3"));
}
function evaluate504() {
    return int8Add(int8Input("0"), int2Input("0"));
}
function evaluate505() {
    return int8Add(int8Input("-9223372036854775808"), int2Input("1"));
}
function evaluate506() {
    return int8Add(int8Input("9223372036854775807"), int2Input("1"));
}
function evaluate507() {
    return int8Add(int8Input("1"), int2Input("-32768"));
}
function evaluate508() {
    return int8Add(int8Input("1"), int2Input("32767"));
}
function evaluate509() {
    return int8Add(int8Input("-9223372036854775808"), int2Input("-1"));
}
function evaluate510() {
    return int8Add(int8Input("-1"), int2Input("-32768"));
}
function evaluate511() {
    return int8Add(int8Input("9223372036854775807"), int2Input("-1"));
}
function evaluate512() {
    return int8Add(int8Input("-1"), int2Input("32767"));
}
function evaluate513() {
    return int8Add(int8Input("-9223372036854775808"), int2Input("-32768"));
}
function evaluate514() {
    return int8Add(int8Input("9223372036854775807"), int2Input("32767"));
}
function evaluate515() {
    return int8Add(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate516() {
    return int8Add(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate517() {
    return int8Add(int8Input("-2"), int2Input("-32768"));
}
function evaluate518() {
    return int8Add(int8Input("2"), int2Input("32767"));
}
function evaluate519() {
    return int8Add(int8Input("0"), int2Input("-32768"));
}
function evaluate520() {
    return int8Add(int8Input("-9223372036854775808"), int2Input("0"));
}
function evaluate521() {
    return int8Add(int8Input("9223372036854775807"), int2Input("0"));
}
function evaluate522() {
    return int8Add(int8Input(null), int2Input("32767"));
}
function evaluate523() {
    return int8Add(int8Input("9223372036854775807"), int2Input(null));
}
function evaluate524() {
    return int8Add(int8Input(null), int2Input(null));
}
function evaluate525() {
    return int8Sub(int8Input("2"), int2Input("3"));
}
function evaluate526() {
    return int8Sub(int8Input("-2"), int2Input("-3"));
}
function evaluate527() {
    return int8Sub(int8Input("0"), int2Input("0"));
}
function evaluate528() {
    return int8Sub(int8Input("-9223372036854775808"), int2Input("1"));
}
function evaluate529() {
    return int8Sub(int8Input("9223372036854775807"), int2Input("1"));
}
function evaluate530() {
    return int8Sub(int8Input("1"), int2Input("-32768"));
}
function evaluate531() {
    return int8Sub(int8Input("1"), int2Input("32767"));
}
function evaluate532() {
    return int8Sub(int8Input("-9223372036854775808"), int2Input("-1"));
}
function evaluate533() {
    return int8Sub(int8Input("-1"), int2Input("-32768"));
}
function evaluate534() {
    return int8Sub(int8Input("9223372036854775807"), int2Input("-1"));
}
function evaluate535() {
    return int8Sub(int8Input("-1"), int2Input("32767"));
}
function evaluate536() {
    return int8Sub(int8Input("-9223372036854775808"), int2Input("-32768"));
}
function evaluate537() {
    return int8Sub(int8Input("9223372036854775807"), int2Input("32767"));
}
function evaluate538() {
    return int8Sub(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate539() {
    return int8Sub(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate540() {
    return int8Sub(int8Input("-2"), int2Input("-32768"));
}
function evaluate541() {
    return int8Sub(int8Input("2"), int2Input("32767"));
}
function evaluate542() {
    return int8Sub(int8Input("0"), int2Input("-32768"));
}
function evaluate543() {
    return int8Sub(int8Input("-9223372036854775808"), int2Input("0"));
}
function evaluate544() {
    return int8Sub(int8Input("9223372036854775807"), int2Input("0"));
}
function evaluate545() {
    return int8Sub(int8Input(null), int2Input("32767"));
}
function evaluate546() {
    return int8Sub(int8Input("9223372036854775807"), int2Input(null));
}
function evaluate547() {
    return int8Sub(int8Input(null), int2Input(null));
}
function evaluate548() {
    return int8Mul(int8Input("2"), int2Input("3"));
}
function evaluate549() {
    return int8Mul(int8Input("-2"), int2Input("-3"));
}
function evaluate550() {
    return int8Mul(int8Input("0"), int2Input("0"));
}
function evaluate551() {
    return int8Mul(int8Input("-9223372036854775808"), int2Input("1"));
}
function evaluate552() {
    return int8Mul(int8Input("9223372036854775807"), int2Input("1"));
}
function evaluate553() {
    return int8Mul(int8Input("1"), int2Input("-32768"));
}
function evaluate554() {
    return int8Mul(int8Input("1"), int2Input("32767"));
}
function evaluate555() {
    return int8Mul(int8Input("-9223372036854775808"), int2Input("-1"));
}
function evaluate556() {
    return int8Mul(int8Input("-1"), int2Input("-32768"));
}
function evaluate557() {
    return int8Mul(int8Input("9223372036854775807"), int2Input("-1"));
}
function evaluate558() {
    return int8Mul(int8Input("-1"), int2Input("32767"));
}
function evaluate559() {
    return int8Mul(int8Input("-9223372036854775808"), int2Input("-32768"));
}
function evaluate560() {
    return int8Mul(int8Input("9223372036854775807"), int2Input("32767"));
}
function evaluate561() {
    return int8Mul(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate562() {
    return int8Mul(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate563() {
    return int8Mul(int8Input("-2"), int2Input("-32768"));
}
function evaluate564() {
    return int8Mul(int8Input("2"), int2Input("32767"));
}
function evaluate565() {
    return int8Mul(int8Input("0"), int2Input("-32768"));
}
function evaluate566() {
    return int8Mul(int8Input("-9223372036854775808"), int2Input("0"));
}
function evaluate567() {
    return int8Mul(int8Input("9223372036854775807"), int2Input("0"));
}
function evaluate568() {
    return int8Mul(int8Input(null), int2Input("32767"));
}
function evaluate569() {
    return int8Mul(int8Input("9223372036854775807"), int2Input(null));
}
function evaluate570() {
    return int8Mul(int8Input(null), int2Input(null));
}
function evaluate571() {
    return int8Add(int8Input("2"), int4Input("3"));
}
function evaluate572() {
    return int8Add(int8Input("-2"), int4Input("-3"));
}
function evaluate573() {
    return int8Add(int8Input("0"), int4Input("0"));
}
function evaluate574() {
    return int8Add(int8Input("-9223372036854775808"), int4Input("1"));
}
function evaluate575() {
    return int8Add(int8Input("9223372036854775807"), int4Input("1"));
}
function evaluate576() {
    return int8Add(int8Input("1"), int4Input("-2147483648"));
}
function evaluate577() {
    return int8Add(int8Input("1"), int4Input("2147483647"));
}
function evaluate578() {
    return int8Add(int8Input("-9223372036854775808"), int4Input("-1"));
}
function evaluate579() {
    return int8Add(int8Input("-1"), int4Input("-2147483648"));
}
function evaluate580() {
    return int8Add(int8Input("9223372036854775807"), int4Input("-1"));
}
function evaluate581() {
    return int8Add(int8Input("-1"), int4Input("2147483647"));
}
function evaluate582() {
    return int8Add(int8Input("-9223372036854775808"), int4Input("-2147483648"));
}
function evaluate583() {
    return int8Add(int8Input("9223372036854775807"), int4Input("2147483647"));
}
function evaluate584() {
    return int8Add(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate585() {
    return int8Add(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate586() {
    return int8Add(int8Input("-2"), int4Input("-2147483648"));
}
function evaluate587() {
    return int8Add(int8Input("2"), int4Input("2147483647"));
}
function evaluate588() {
    return int8Add(int8Input("0"), int4Input("-2147483648"));
}
function evaluate589() {
    return int8Add(int8Input("-9223372036854775808"), int4Input("0"));
}
function evaluate590() {
    return int8Add(int8Input("9223372036854775807"), int4Input("0"));
}
function evaluate591() {
    return int8Add(int8Input(null), int4Input("2147483647"));
}
function evaluate592() {
    return int8Add(int8Input("9223372036854775807"), int4Input(null));
}
function evaluate593() {
    return int8Add(int8Input(null), int4Input(null));
}
function evaluate594() {
    return int8Sub(int8Input("2"), int4Input("3"));
}
function evaluate595() {
    return int8Sub(int8Input("-2"), int4Input("-3"));
}
function evaluate596() {
    return int8Sub(int8Input("0"), int4Input("0"));
}
function evaluate597() {
    return int8Sub(int8Input("-9223372036854775808"), int4Input("1"));
}
function evaluate598() {
    return int8Sub(int8Input("9223372036854775807"), int4Input("1"));
}
function evaluate599() {
    return int8Sub(int8Input("1"), int4Input("-2147483648"));
}
function evaluate600() {
    return int8Sub(int8Input("1"), int4Input("2147483647"));
}
function evaluate601() {
    return int8Sub(int8Input("-9223372036854775808"), int4Input("-1"));
}
function evaluate602() {
    return int8Sub(int8Input("-1"), int4Input("-2147483648"));
}
function evaluate603() {
    return int8Sub(int8Input("9223372036854775807"), int4Input("-1"));
}
function evaluate604() {
    return int8Sub(int8Input("-1"), int4Input("2147483647"));
}
function evaluate605() {
    return int8Sub(int8Input("-9223372036854775808"), int4Input("-2147483648"));
}
function evaluate606() {
    return int8Sub(int8Input("9223372036854775807"), int4Input("2147483647"));
}
function evaluate607() {
    return int8Sub(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate608() {
    return int8Sub(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate609() {
    return int8Sub(int8Input("-2"), int4Input("-2147483648"));
}
function evaluate610() {
    return int8Sub(int8Input("2"), int4Input("2147483647"));
}
function evaluate611() {
    return int8Sub(int8Input("0"), int4Input("-2147483648"));
}
function evaluate612() {
    return int8Sub(int8Input("-9223372036854775808"), int4Input("0"));
}
function evaluate613() {
    return int8Sub(int8Input("9223372036854775807"), int4Input("0"));
}
function evaluate614() {
    return int8Sub(int8Input(null), int4Input("2147483647"));
}
function evaluate615() {
    return int8Sub(int8Input("9223372036854775807"), int4Input(null));
}
function evaluate616() {
    return int8Sub(int8Input(null), int4Input(null));
}
function evaluate617() {
    return int8Mul(int8Input("2"), int4Input("3"));
}
function evaluate618() {
    return int8Mul(int8Input("-2"), int4Input("-3"));
}
function evaluate619() {
    return int8Mul(int8Input("0"), int4Input("0"));
}
function evaluate620() {
    return int8Mul(int8Input("-9223372036854775808"), int4Input("1"));
}
function evaluate621() {
    return int8Mul(int8Input("9223372036854775807"), int4Input("1"));
}
function evaluate622() {
    return int8Mul(int8Input("1"), int4Input("-2147483648"));
}
function evaluate623() {
    return int8Mul(int8Input("1"), int4Input("2147483647"));
}
function evaluate624() {
    return int8Mul(int8Input("-9223372036854775808"), int4Input("-1"));
}
function evaluate625() {
    return int8Mul(int8Input("-1"), int4Input("-2147483648"));
}
function evaluate626() {
    return int8Mul(int8Input("9223372036854775807"), int4Input("-1"));
}
function evaluate627() {
    return int8Mul(int8Input("-1"), int4Input("2147483647"));
}
function evaluate628() {
    return int8Mul(int8Input("-9223372036854775808"), int4Input("-2147483648"));
}
function evaluate629() {
    return int8Mul(int8Input("9223372036854775807"), int4Input("2147483647"));
}
function evaluate630() {
    return int8Mul(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate631() {
    return int8Mul(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate632() {
    return int8Mul(int8Input("-2"), int4Input("-2147483648"));
}
function evaluate633() {
    return int8Mul(int8Input("2"), int4Input("2147483647"));
}
function evaluate634() {
    return int8Mul(int8Input("0"), int4Input("-2147483648"));
}
function evaluate635() {
    return int8Mul(int8Input("-9223372036854775808"), int4Input("0"));
}
function evaluate636() {
    return int8Mul(int8Input("9223372036854775807"), int4Input("0"));
}
function evaluate637() {
    return int8Mul(int8Input(null), int4Input("2147483647"));
}
function evaluate638() {
    return int8Mul(int8Input("9223372036854775807"), int4Input(null));
}
function evaluate639() {
    return int8Mul(int8Input(null), int4Input(null));
}
function evaluate640() {
    return int8Add(int8Input("2"), int8Input("3"));
}
function evaluate641() {
    return int8Add(int8Input("-2"), int8Input("-3"));
}
function evaluate642() {
    return int8Add(int8Input("0"), int8Input("0"));
}
function evaluate643() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate644() {
    return int8Add(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate645() {
    return int8Add(int8Input("1"), int8Input("-9223372036854775808"));
}
function evaluate646() {
    return int8Add(int8Input("1"), int8Input("9223372036854775807"));
}
function evaluate647() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate648() {
    return int8Add(int8Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate649() {
    return int8Add(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate650() {
    return int8Add(int8Input("-1"), int8Input("9223372036854775807"));
}
function evaluate651() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate652() {
    return int8Add(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate653() {
    return int8Add(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate654() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate655() {
    return int8Add(int8Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate656() {
    return int8Add(int8Input("2"), int8Input("9223372036854775807"));
}
function evaluate657() {
    return int8Add(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate658() {
    return int8Add(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate659() {
    return int8Add(int8Input("9223372036854775807"), int8Input("0"));
}
function evaluate660() {
    return int8Add(int8Input(null), int8Input("9223372036854775807"));
}
function evaluate661() {
    return int8Add(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate662() {
    return int8Add(int8Input(null), int8Input(null));
}
function evaluate663() {
    return int8Sub(int8Input("2"), int8Input("3"));
}
function evaluate664() {
    return int8Sub(int8Input("-2"), int8Input("-3"));
}
function evaluate665() {
    return int8Sub(int8Input("0"), int8Input("0"));
}
function evaluate666() {
    return int8Sub(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate667() {
    return int8Sub(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate668() {
    return int8Sub(int8Input("1"), int8Input("-9223372036854775808"));
}
function evaluate669() {
    return int8Sub(int8Input("1"), int8Input("9223372036854775807"));
}
function evaluate670() {
    return int8Sub(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate671() {
    return int8Sub(int8Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate672() {
    return int8Sub(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate673() {
    return int8Sub(int8Input("-1"), int8Input("9223372036854775807"));
}
function evaluate674() {
    return int8Sub(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate675() {
    return int8Sub(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate676() {
    return int8Sub(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate677() {
    return int8Sub(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate678() {
    return int8Sub(int8Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate679() {
    return int8Sub(int8Input("2"), int8Input("9223372036854775807"));
}
function evaluate680() {
    return int8Sub(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate681() {
    return int8Sub(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate682() {
    return int8Sub(int8Input("9223372036854775807"), int8Input("0"));
}
function evaluate683() {
    return int8Sub(int8Input(null), int8Input("9223372036854775807"));
}
function evaluate684() {
    return int8Sub(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate685() {
    return int8Sub(int8Input(null), int8Input(null));
}
function evaluate686() {
    return int8Mul(int8Input("2"), int8Input("3"));
}
function evaluate687() {
    return int8Mul(int8Input("-2"), int8Input("-3"));
}
function evaluate688() {
    return int8Mul(int8Input("0"), int8Input("0"));
}
function evaluate689() {
    return int8Mul(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate690() {
    return int8Mul(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate691() {
    return int8Mul(int8Input("1"), int8Input("-9223372036854775808"));
}
function evaluate692() {
    return int8Mul(int8Input("1"), int8Input("9223372036854775807"));
}
function evaluate693() {
    return int8Mul(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate694() {
    return int8Mul(int8Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate695() {
    return int8Mul(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate696() {
    return int8Mul(int8Input("-1"), int8Input("9223372036854775807"));
}
function evaluate697() {
    return int8Mul(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate698() {
    return int8Mul(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate699() {
    return int8Mul(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate700() {
    return int8Mul(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate701() {
    return int8Mul(int8Input("-2"), int8Input("-9223372036854775808"));
}
function evaluate702() {
    return int8Mul(int8Input("2"), int8Input("9223372036854775807"));
}
function evaluate703() {
    return int8Mul(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate704() {
    return int8Mul(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate705() {
    return int8Mul(int8Input("9223372036854775807"), int8Input("0"));
}
function evaluate706() {
    return int8Mul(int8Input(null), int8Input("9223372036854775807"));
}
function evaluate707() {
    return int8Mul(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate708() {
    return int8Mul(int8Input(null), int8Input(null));
}
function evaluate709() {
    return int2Neg(int2Input("2"));
}
function evaluate710() {
    return int2Neg(int2Input("-2"));
}
function evaluate711() {
    return int2Neg(int2Input("0"));
}
function evaluate712() {
    return int2Neg(int2Input("-32768"));
}
function evaluate713() {
    return int2Neg(int2Input("32767"));
}
function evaluate714() {
    return int2Neg(int2Input("-32767"));
}
function evaluate715() {
    return int2Neg(int2Input("32766"));
}
function evaluate716() {
    return int2Neg(int2Input(null));
}
function evaluate717() {
    return int2Abs(int2Input("2"));
}
function evaluate718() {
    return int2Abs(int2Input("-2"));
}
function evaluate719() {
    return int2Abs(int2Input("0"));
}
function evaluate720() {
    return int2Abs(int2Input("-32768"));
}
function evaluate721() {
    return int2Abs(int2Input("32767"));
}
function evaluate722() {
    return int2Abs(int2Input("-32767"));
}
function evaluate723() {
    return int2Abs(int2Input("32766"));
}
function evaluate724() {
    return int2Abs(int2Input(null));
}
function evaluate725() {
    return int4Neg(int4Input("2"));
}
function evaluate726() {
    return int4Neg(int4Input("-2"));
}
function evaluate727() {
    return int4Neg(int4Input("0"));
}
function evaluate728() {
    return int4Neg(int4Input("-2147483648"));
}
function evaluate729() {
    return int4Neg(int4Input("2147483647"));
}
function evaluate730() {
    return int4Neg(int4Input("-2147483647"));
}
function evaluate731() {
    return int4Neg(int4Input("2147483646"));
}
function evaluate732() {
    return int4Neg(int4Input(null));
}
function evaluate733() {
    return int4Abs(int4Input("2"));
}
function evaluate734() {
    return int4Abs(int4Input("-2"));
}
function evaluate735() {
    return int4Abs(int4Input("0"));
}
function evaluate736() {
    return int4Abs(int4Input("-2147483648"));
}
function evaluate737() {
    return int4Abs(int4Input("2147483647"));
}
function evaluate738() {
    return int4Abs(int4Input("-2147483647"));
}
function evaluate739() {
    return int4Abs(int4Input("2147483646"));
}
function evaluate740() {
    return int4Abs(int4Input(null));
}
function evaluate741() {
    return int8Neg(int8Input("2"));
}
function evaluate742() {
    return int8Neg(int8Input("-2"));
}
function evaluate743() {
    return int8Neg(int8Input("0"));
}
function evaluate744() {
    return int8Neg(int8Input("-9223372036854775808"));
}
function evaluate745() {
    return int8Neg(int8Input("9223372036854775807"));
}
function evaluate746() {
    return int8Neg(int8Input("-9223372036854775807"));
}
function evaluate747() {
    return int8Neg(int8Input("9223372036854775806"));
}
function evaluate748() {
    return int8Neg(int8Input(null));
}
function evaluate749() {
    return int8Abs(int8Input("2"));
}
function evaluate750() {
    return int8Abs(int8Input("-2"));
}
function evaluate751() {
    return int8Abs(int8Input("0"));
}
function evaluate752() {
    return int8Abs(int8Input("-9223372036854775808"));
}
function evaluate753() {
    return int8Abs(int8Input("9223372036854775807"));
}
function evaluate754() {
    return int8Abs(int8Input("-9223372036854775807"));
}
function evaluate755() {
    return int8Abs(int8Input("9223372036854775806"));
}
function evaluate756() {
    return int8Abs(int8Input(null));
}
function evaluate757() {
    return integerEq(int2Input("1"), int2Input("1"));
}
function evaluate758() {
    return integerEq(int2Input("-1"), int2Input("1"));
}
function evaluate759() {
    return integerEq(int2Input("1"), int2Input("-1"));
}
function evaluate760() {
    return integerEq(int2Input("-32768"), int2Input("32767"));
}
function evaluate761() {
    return integerEq(int2Input("32767"), int2Input("-32768"));
}
function evaluate762() {
    return integerEq(int2Input(null), int2Input("1"));
}
function evaluate763() {
    return integerEq(int2Input("1"), int2Input(null));
}
function evaluate764() {
    return integerEq(int2Input(null), int2Input(null));
}
function evaluate765() {
    return integerNe(int2Input("1"), int2Input("1"));
}
function evaluate766() {
    return integerNe(int2Input("-1"), int2Input("1"));
}
function evaluate767() {
    return integerNe(int2Input("1"), int2Input("-1"));
}
function evaluate768() {
    return integerNe(int2Input("-32768"), int2Input("32767"));
}
function evaluate769() {
    return integerNe(int2Input("32767"), int2Input("-32768"));
}
function evaluate770() {
    return integerNe(int2Input(null), int2Input("1"));
}
function evaluate771() {
    return integerNe(int2Input("1"), int2Input(null));
}
function evaluate772() {
    return integerNe(int2Input(null), int2Input(null));
}
function evaluate773() {
    return integerLt(int2Input("1"), int2Input("1"));
}
function evaluate774() {
    return integerLt(int2Input("-1"), int2Input("1"));
}
function evaluate775() {
    return integerLt(int2Input("1"), int2Input("-1"));
}
function evaluate776() {
    return integerLt(int2Input("-32768"), int2Input("32767"));
}
function evaluate777() {
    return integerLt(int2Input("32767"), int2Input("-32768"));
}
function evaluate778() {
    return integerLt(int2Input(null), int2Input("1"));
}
function evaluate779() {
    return integerLt(int2Input("1"), int2Input(null));
}
function evaluate780() {
    return integerLt(int2Input(null), int2Input(null));
}
function evaluate781() {
    return integerLe(int2Input("1"), int2Input("1"));
}
function evaluate782() {
    return integerLe(int2Input("-1"), int2Input("1"));
}
function evaluate783() {
    return integerLe(int2Input("1"), int2Input("-1"));
}
function evaluate784() {
    return integerLe(int2Input("-32768"), int2Input("32767"));
}
function evaluate785() {
    return integerLe(int2Input("32767"), int2Input("-32768"));
}
function evaluate786() {
    return integerLe(int2Input(null), int2Input("1"));
}
function evaluate787() {
    return integerLe(int2Input("1"), int2Input(null));
}
function evaluate788() {
    return integerLe(int2Input(null), int2Input(null));
}
function evaluate789() {
    return integerGt(int2Input("1"), int2Input("1"));
}
function evaluate790() {
    return integerGt(int2Input("-1"), int2Input("1"));
}
function evaluate791() {
    return integerGt(int2Input("1"), int2Input("-1"));
}
function evaluate792() {
    return integerGt(int2Input("-32768"), int2Input("32767"));
}
function evaluate793() {
    return integerGt(int2Input("32767"), int2Input("-32768"));
}
function evaluate794() {
    return integerGt(int2Input(null), int2Input("1"));
}
function evaluate795() {
    return integerGt(int2Input("1"), int2Input(null));
}
function evaluate796() {
    return integerGt(int2Input(null), int2Input(null));
}
function evaluate797() {
    return integerGe(int2Input("1"), int2Input("1"));
}
function evaluate798() {
    return integerGe(int2Input("-1"), int2Input("1"));
}
function evaluate799() {
    return integerGe(int2Input("1"), int2Input("-1"));
}
function evaluate800() {
    return integerGe(int2Input("-32768"), int2Input("32767"));
}
function evaluate801() {
    return integerGe(int2Input("32767"), int2Input("-32768"));
}
function evaluate802() {
    return integerGe(int2Input(null), int2Input("1"));
}
function evaluate803() {
    return integerGe(int2Input("1"), int2Input(null));
}
function evaluate804() {
    return integerGe(int2Input(null), int2Input(null));
}
function evaluate805() {
    return integerEq(int2Input("1"), int4Input("1"));
}
function evaluate806() {
    return integerEq(int2Input("-1"), int4Input("1"));
}
function evaluate807() {
    return integerEq(int2Input("1"), int4Input("-1"));
}
function evaluate808() {
    return integerEq(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate809() {
    return integerEq(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate810() {
    return integerEq(int2Input(null), int4Input("1"));
}
function evaluate811() {
    return integerEq(int2Input("1"), int4Input(null));
}
function evaluate812() {
    return integerEq(int2Input(null), int4Input(null));
}
function evaluate813() {
    return integerNe(int2Input("1"), int4Input("1"));
}
function evaluate814() {
    return integerNe(int2Input("-1"), int4Input("1"));
}
function evaluate815() {
    return integerNe(int2Input("1"), int4Input("-1"));
}
function evaluate816() {
    return integerNe(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate817() {
    return integerNe(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate818() {
    return integerNe(int2Input(null), int4Input("1"));
}
function evaluate819() {
    return integerNe(int2Input("1"), int4Input(null));
}
function evaluate820() {
    return integerNe(int2Input(null), int4Input(null));
}
function evaluate821() {
    return integerLt(int2Input("1"), int4Input("1"));
}
function evaluate822() {
    return integerLt(int2Input("-1"), int4Input("1"));
}
function evaluate823() {
    return integerLt(int2Input("1"), int4Input("-1"));
}
function evaluate824() {
    return integerLt(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate825() {
    return integerLt(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate826() {
    return integerLt(int2Input(null), int4Input("1"));
}
function evaluate827() {
    return integerLt(int2Input("1"), int4Input(null));
}
function evaluate828() {
    return integerLt(int2Input(null), int4Input(null));
}
function evaluate829() {
    return integerLe(int2Input("1"), int4Input("1"));
}
function evaluate830() {
    return integerLe(int2Input("-1"), int4Input("1"));
}
function evaluate831() {
    return integerLe(int2Input("1"), int4Input("-1"));
}
function evaluate832() {
    return integerLe(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate833() {
    return integerLe(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate834() {
    return integerLe(int2Input(null), int4Input("1"));
}
function evaluate835() {
    return integerLe(int2Input("1"), int4Input(null));
}
function evaluate836() {
    return integerLe(int2Input(null), int4Input(null));
}
function evaluate837() {
    return integerGt(int2Input("1"), int4Input("1"));
}
function evaluate838() {
    return integerGt(int2Input("-1"), int4Input("1"));
}
function evaluate839() {
    return integerGt(int2Input("1"), int4Input("-1"));
}
function evaluate840() {
    return integerGt(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate841() {
    return integerGt(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate842() {
    return integerGt(int2Input(null), int4Input("1"));
}
function evaluate843() {
    return integerGt(int2Input("1"), int4Input(null));
}
function evaluate844() {
    return integerGt(int2Input(null), int4Input(null));
}
function evaluate845() {
    return integerGe(int2Input("1"), int4Input("1"));
}
function evaluate846() {
    return integerGe(int2Input("-1"), int4Input("1"));
}
function evaluate847() {
    return integerGe(int2Input("1"), int4Input("-1"));
}
function evaluate848() {
    return integerGe(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate849() {
    return integerGe(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate850() {
    return integerGe(int2Input(null), int4Input("1"));
}
function evaluate851() {
    return integerGe(int2Input("1"), int4Input(null));
}
function evaluate852() {
    return integerGe(int2Input(null), int4Input(null));
}
function evaluate853() {
    return integerEq(int2Input("1"), int8Input("1"));
}
function evaluate854() {
    return integerEq(int2Input("-1"), int8Input("1"));
}
function evaluate855() {
    return integerEq(int2Input("1"), int8Input("-1"));
}
function evaluate856() {
    return integerEq(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate857() {
    return integerEq(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate858() {
    return integerEq(int2Input(null), int8Input("1"));
}
function evaluate859() {
    return integerEq(int2Input("1"), int8Input(null));
}
function evaluate860() {
    return integerEq(int2Input(null), int8Input(null));
}
function evaluate861() {
    return integerNe(int2Input("1"), int8Input("1"));
}
function evaluate862() {
    return integerNe(int2Input("-1"), int8Input("1"));
}
function evaluate863() {
    return integerNe(int2Input("1"), int8Input("-1"));
}
function evaluate864() {
    return integerNe(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate865() {
    return integerNe(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate866() {
    return integerNe(int2Input(null), int8Input("1"));
}
function evaluate867() {
    return integerNe(int2Input("1"), int8Input(null));
}
function evaluate868() {
    return integerNe(int2Input(null), int8Input(null));
}
function evaluate869() {
    return integerLt(int2Input("1"), int8Input("1"));
}
function evaluate870() {
    return integerLt(int2Input("-1"), int8Input("1"));
}
function evaluate871() {
    return integerLt(int2Input("1"), int8Input("-1"));
}
function evaluate872() {
    return integerLt(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate873() {
    return integerLt(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate874() {
    return integerLt(int2Input(null), int8Input("1"));
}
function evaluate875() {
    return integerLt(int2Input("1"), int8Input(null));
}
function evaluate876() {
    return integerLt(int2Input(null), int8Input(null));
}
function evaluate877() {
    return integerLe(int2Input("1"), int8Input("1"));
}
function evaluate878() {
    return integerLe(int2Input("-1"), int8Input("1"));
}
function evaluate879() {
    return integerLe(int2Input("1"), int8Input("-1"));
}
function evaluate880() {
    return integerLe(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate881() {
    return integerLe(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate882() {
    return integerLe(int2Input(null), int8Input("1"));
}
function evaluate883() {
    return integerLe(int2Input("1"), int8Input(null));
}
function evaluate884() {
    return integerLe(int2Input(null), int8Input(null));
}
function evaluate885() {
    return integerGt(int2Input("1"), int8Input("1"));
}
function evaluate886() {
    return integerGt(int2Input("-1"), int8Input("1"));
}
function evaluate887() {
    return integerGt(int2Input("1"), int8Input("-1"));
}
function evaluate888() {
    return integerGt(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate889() {
    return integerGt(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate890() {
    return integerGt(int2Input(null), int8Input("1"));
}
function evaluate891() {
    return integerGt(int2Input("1"), int8Input(null));
}
function evaluate892() {
    return integerGt(int2Input(null), int8Input(null));
}
function evaluate893() {
    return integerGe(int2Input("1"), int8Input("1"));
}
function evaluate894() {
    return integerGe(int2Input("-1"), int8Input("1"));
}
function evaluate895() {
    return integerGe(int2Input("1"), int8Input("-1"));
}
function evaluate896() {
    return integerGe(int2Input("-32768"), int8Input("9223372036854775807"));
}
function evaluate897() {
    return integerGe(int2Input("32767"), int8Input("-9223372036854775808"));
}
function evaluate898() {
    return integerGe(int2Input(null), int8Input("1"));
}
function evaluate899() {
    return integerGe(int2Input("1"), int8Input(null));
}
function evaluate900() {
    return integerGe(int2Input(null), int8Input(null));
}
function evaluate901() {
    return integerEq(int4Input("1"), int2Input("1"));
}
function evaluate902() {
    return integerEq(int4Input("-1"), int2Input("1"));
}
function evaluate903() {
    return integerEq(int4Input("1"), int2Input("-1"));
}
function evaluate904() {
    return integerEq(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate905() {
    return integerEq(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate906() {
    return integerEq(int4Input(null), int2Input("1"));
}
function evaluate907() {
    return integerEq(int4Input("1"), int2Input(null));
}
function evaluate908() {
    return integerEq(int4Input(null), int2Input(null));
}
function evaluate909() {
    return integerNe(int4Input("1"), int2Input("1"));
}
function evaluate910() {
    return integerNe(int4Input("-1"), int2Input("1"));
}
function evaluate911() {
    return integerNe(int4Input("1"), int2Input("-1"));
}
function evaluate912() {
    return integerNe(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate913() {
    return integerNe(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate914() {
    return integerNe(int4Input(null), int2Input("1"));
}
function evaluate915() {
    return integerNe(int4Input("1"), int2Input(null));
}
function evaluate916() {
    return integerNe(int4Input(null), int2Input(null));
}
function evaluate917() {
    return integerLt(int4Input("1"), int2Input("1"));
}
function evaluate918() {
    return integerLt(int4Input("-1"), int2Input("1"));
}
function evaluate919() {
    return integerLt(int4Input("1"), int2Input("-1"));
}
function evaluate920() {
    return integerLt(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate921() {
    return integerLt(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate922() {
    return integerLt(int4Input(null), int2Input("1"));
}
function evaluate923() {
    return integerLt(int4Input("1"), int2Input(null));
}
function evaluate924() {
    return integerLt(int4Input(null), int2Input(null));
}
function evaluate925() {
    return integerLe(int4Input("1"), int2Input("1"));
}
function evaluate926() {
    return integerLe(int4Input("-1"), int2Input("1"));
}
function evaluate927() {
    return integerLe(int4Input("1"), int2Input("-1"));
}
function evaluate928() {
    return integerLe(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate929() {
    return integerLe(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate930() {
    return integerLe(int4Input(null), int2Input("1"));
}
function evaluate931() {
    return integerLe(int4Input("1"), int2Input(null));
}
function evaluate932() {
    return integerLe(int4Input(null), int2Input(null));
}
function evaluate933() {
    return integerGt(int4Input("1"), int2Input("1"));
}
function evaluate934() {
    return integerGt(int4Input("-1"), int2Input("1"));
}
function evaluate935() {
    return integerGt(int4Input("1"), int2Input("-1"));
}
function evaluate936() {
    return integerGt(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate937() {
    return integerGt(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate938() {
    return integerGt(int4Input(null), int2Input("1"));
}
function evaluate939() {
    return integerGt(int4Input("1"), int2Input(null));
}
function evaluate940() {
    return integerGt(int4Input(null), int2Input(null));
}
function evaluate941() {
    return integerGe(int4Input("1"), int2Input("1"));
}
function evaluate942() {
    return integerGe(int4Input("-1"), int2Input("1"));
}
function evaluate943() {
    return integerGe(int4Input("1"), int2Input("-1"));
}
function evaluate944() {
    return integerGe(int4Input("-2147483648"), int2Input("32767"));
}
function evaluate945() {
    return integerGe(int4Input("2147483647"), int2Input("-32768"));
}
function evaluate946() {
    return integerGe(int4Input(null), int2Input("1"));
}
function evaluate947() {
    return integerGe(int4Input("1"), int2Input(null));
}
function evaluate948() {
    return integerGe(int4Input(null), int2Input(null));
}
function evaluate949() {
    return integerEq(int4Input("1"), int4Input("1"));
}
function evaluate950() {
    return integerEq(int4Input("-1"), int4Input("1"));
}
function evaluate951() {
    return integerEq(int4Input("1"), int4Input("-1"));
}
function evaluate952() {
    return integerEq(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate953() {
    return integerEq(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate954() {
    return integerEq(int4Input(null), int4Input("1"));
}
function evaluate955() {
    return integerEq(int4Input("1"), int4Input(null));
}
function evaluate956() {
    return integerEq(int4Input(null), int4Input(null));
}
function evaluate957() {
    return integerNe(int4Input("1"), int4Input("1"));
}
function evaluate958() {
    return integerNe(int4Input("-1"), int4Input("1"));
}
function evaluate959() {
    return integerNe(int4Input("1"), int4Input("-1"));
}
function evaluate960() {
    return integerNe(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate961() {
    return integerNe(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate962() {
    return integerNe(int4Input(null), int4Input("1"));
}
function evaluate963() {
    return integerNe(int4Input("1"), int4Input(null));
}
function evaluate964() {
    return integerNe(int4Input(null), int4Input(null));
}
function evaluate965() {
    return integerLt(int4Input("1"), int4Input("1"));
}
function evaluate966() {
    return integerLt(int4Input("-1"), int4Input("1"));
}
function evaluate967() {
    return integerLt(int4Input("1"), int4Input("-1"));
}
function evaluate968() {
    return integerLt(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate969() {
    return integerLt(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate970() {
    return integerLt(int4Input(null), int4Input("1"));
}
function evaluate971() {
    return integerLt(int4Input("1"), int4Input(null));
}
function evaluate972() {
    return integerLt(int4Input(null), int4Input(null));
}
function evaluate973() {
    return integerLe(int4Input("1"), int4Input("1"));
}
function evaluate974() {
    return integerLe(int4Input("-1"), int4Input("1"));
}
function evaluate975() {
    return integerLe(int4Input("1"), int4Input("-1"));
}
function evaluate976() {
    return integerLe(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate977() {
    return integerLe(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate978() {
    return integerLe(int4Input(null), int4Input("1"));
}
function evaluate979() {
    return integerLe(int4Input("1"), int4Input(null));
}
function evaluate980() {
    return integerLe(int4Input(null), int4Input(null));
}
function evaluate981() {
    return integerGt(int4Input("1"), int4Input("1"));
}
function evaluate982() {
    return integerGt(int4Input("-1"), int4Input("1"));
}
function evaluate983() {
    return integerGt(int4Input("1"), int4Input("-1"));
}
function evaluate984() {
    return integerGt(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate985() {
    return integerGt(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate986() {
    return integerGt(int4Input(null), int4Input("1"));
}
function evaluate987() {
    return integerGt(int4Input("1"), int4Input(null));
}
function evaluate988() {
    return integerGt(int4Input(null), int4Input(null));
}
function evaluate989() {
    return integerGe(int4Input("1"), int4Input("1"));
}
function evaluate990() {
    return integerGe(int4Input("-1"), int4Input("1"));
}
function evaluate991() {
    return integerGe(int4Input("1"), int4Input("-1"));
}
function evaluate992() {
    return integerGe(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate993() {
    return integerGe(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate994() {
    return integerGe(int4Input(null), int4Input("1"));
}
function evaluate995() {
    return integerGe(int4Input("1"), int4Input(null));
}
function evaluate996() {
    return integerGe(int4Input(null), int4Input(null));
}
function evaluate997() {
    return integerEq(int4Input("1"), int8Input("1"));
}
function evaluate998() {
    return integerEq(int4Input("-1"), int8Input("1"));
}
function evaluate999() {
    return integerEq(int4Input("1"), int8Input("-1"));
}
function evaluate1000() {
    return integerEq(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate1001() {
    return integerEq(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate1002() {
    return integerEq(int4Input(null), int8Input("1"));
}
function evaluate1003() {
    return integerEq(int4Input("1"), int8Input(null));
}
function evaluate1004() {
    return integerEq(int4Input(null), int8Input(null));
}
function evaluate1005() {
    return integerNe(int4Input("1"), int8Input("1"));
}
function evaluate1006() {
    return integerNe(int4Input("-1"), int8Input("1"));
}
function evaluate1007() {
    return integerNe(int4Input("1"), int8Input("-1"));
}
function evaluate1008() {
    return integerNe(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate1009() {
    return integerNe(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate1010() {
    return integerNe(int4Input(null), int8Input("1"));
}
function evaluate1011() {
    return integerNe(int4Input("1"), int8Input(null));
}
function evaluate1012() {
    return integerNe(int4Input(null), int8Input(null));
}
function evaluate1013() {
    return integerLt(int4Input("1"), int8Input("1"));
}
function evaluate1014() {
    return integerLt(int4Input("-1"), int8Input("1"));
}
function evaluate1015() {
    return integerLt(int4Input("1"), int8Input("-1"));
}
function evaluate1016() {
    return integerLt(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate1017() {
    return integerLt(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate1018() {
    return integerLt(int4Input(null), int8Input("1"));
}
function evaluate1019() {
    return integerLt(int4Input("1"), int8Input(null));
}
function evaluate1020() {
    return integerLt(int4Input(null), int8Input(null));
}
function evaluate1021() {
    return integerLe(int4Input("1"), int8Input("1"));
}
function evaluate1022() {
    return integerLe(int4Input("-1"), int8Input("1"));
}
function evaluate1023() {
    return integerLe(int4Input("1"), int8Input("-1"));
}
function evaluate1024() {
    return integerLe(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate1025() {
    return integerLe(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate1026() {
    return integerLe(int4Input(null), int8Input("1"));
}
function evaluate1027() {
    return integerLe(int4Input("1"), int8Input(null));
}
function evaluate1028() {
    return integerLe(int4Input(null), int8Input(null));
}
function evaluate1029() {
    return integerGt(int4Input("1"), int8Input("1"));
}
function evaluate1030() {
    return integerGt(int4Input("-1"), int8Input("1"));
}
function evaluate1031() {
    return integerGt(int4Input("1"), int8Input("-1"));
}
function evaluate1032() {
    return integerGt(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate1033() {
    return integerGt(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate1034() {
    return integerGt(int4Input(null), int8Input("1"));
}
function evaluate1035() {
    return integerGt(int4Input("1"), int8Input(null));
}
function evaluate1036() {
    return integerGt(int4Input(null), int8Input(null));
}
function evaluate1037() {
    return integerGe(int4Input("1"), int8Input("1"));
}
function evaluate1038() {
    return integerGe(int4Input("-1"), int8Input("1"));
}
function evaluate1039() {
    return integerGe(int4Input("1"), int8Input("-1"));
}
function evaluate1040() {
    return integerGe(int4Input("-2147483648"), int8Input("9223372036854775807"));
}
function evaluate1041() {
    return integerGe(int4Input("2147483647"), int8Input("-9223372036854775808"));
}
function evaluate1042() {
    return integerGe(int4Input(null), int8Input("1"));
}
function evaluate1043() {
    return integerGe(int4Input("1"), int8Input(null));
}
function evaluate1044() {
    return integerGe(int4Input(null), int8Input(null));
}
function evaluate1045() {
    return integerEq(int8Input("1"), int2Input("1"));
}
function evaluate1046() {
    return integerEq(int8Input("-1"), int2Input("1"));
}
function evaluate1047() {
    return integerEq(int8Input("1"), int2Input("-1"));
}
function evaluate1048() {
    return integerEq(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate1049() {
    return integerEq(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate1050() {
    return integerEq(int8Input(null), int2Input("1"));
}
function evaluate1051() {
    return integerEq(int8Input("1"), int2Input(null));
}
function evaluate1052() {
    return integerEq(int8Input(null), int2Input(null));
}
function evaluate1053() {
    return integerNe(int8Input("1"), int2Input("1"));
}
function evaluate1054() {
    return integerNe(int8Input("-1"), int2Input("1"));
}
function evaluate1055() {
    return integerNe(int8Input("1"), int2Input("-1"));
}
function evaluate1056() {
    return integerNe(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate1057() {
    return integerNe(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate1058() {
    return integerNe(int8Input(null), int2Input("1"));
}
function evaluate1059() {
    return integerNe(int8Input("1"), int2Input(null));
}
function evaluate1060() {
    return integerNe(int8Input(null), int2Input(null));
}
function evaluate1061() {
    return integerLt(int8Input("1"), int2Input("1"));
}
function evaluate1062() {
    return integerLt(int8Input("-1"), int2Input("1"));
}
function evaluate1063() {
    return integerLt(int8Input("1"), int2Input("-1"));
}
function evaluate1064() {
    return integerLt(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate1065() {
    return integerLt(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate1066() {
    return integerLt(int8Input(null), int2Input("1"));
}
function evaluate1067() {
    return integerLt(int8Input("1"), int2Input(null));
}
function evaluate1068() {
    return integerLt(int8Input(null), int2Input(null));
}
function evaluate1069() {
    return integerLe(int8Input("1"), int2Input("1"));
}
function evaluate1070() {
    return integerLe(int8Input("-1"), int2Input("1"));
}
function evaluate1071() {
    return integerLe(int8Input("1"), int2Input("-1"));
}
function evaluate1072() {
    return integerLe(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate1073() {
    return integerLe(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate1074() {
    return integerLe(int8Input(null), int2Input("1"));
}
function evaluate1075() {
    return integerLe(int8Input("1"), int2Input(null));
}
function evaluate1076() {
    return integerLe(int8Input(null), int2Input(null));
}
function evaluate1077() {
    return integerGt(int8Input("1"), int2Input("1"));
}
function evaluate1078() {
    return integerGt(int8Input("-1"), int2Input("1"));
}
function evaluate1079() {
    return integerGt(int8Input("1"), int2Input("-1"));
}
function evaluate1080() {
    return integerGt(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate1081() {
    return integerGt(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate1082() {
    return integerGt(int8Input(null), int2Input("1"));
}
function evaluate1083() {
    return integerGt(int8Input("1"), int2Input(null));
}
function evaluate1084() {
    return integerGt(int8Input(null), int2Input(null));
}
function evaluate1085() {
    return integerGe(int8Input("1"), int2Input("1"));
}
function evaluate1086() {
    return integerGe(int8Input("-1"), int2Input("1"));
}
function evaluate1087() {
    return integerGe(int8Input("1"), int2Input("-1"));
}
function evaluate1088() {
    return integerGe(int8Input("-9223372036854775808"), int2Input("32767"));
}
function evaluate1089() {
    return integerGe(int8Input("9223372036854775807"), int2Input("-32768"));
}
function evaluate1090() {
    return integerGe(int8Input(null), int2Input("1"));
}
function evaluate1091() {
    return integerGe(int8Input("1"), int2Input(null));
}
function evaluate1092() {
    return integerGe(int8Input(null), int2Input(null));
}
function evaluate1093() {
    return integerEq(int8Input("1"), int4Input("1"));
}
function evaluate1094() {
    return integerEq(int8Input("-1"), int4Input("1"));
}
function evaluate1095() {
    return integerEq(int8Input("1"), int4Input("-1"));
}
function evaluate1096() {
    return integerEq(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate1097() {
    return integerEq(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate1098() {
    return integerEq(int8Input(null), int4Input("1"));
}
function evaluate1099() {
    return integerEq(int8Input("1"), int4Input(null));
}
function evaluate1100() {
    return integerEq(int8Input(null), int4Input(null));
}
function evaluate1101() {
    return integerNe(int8Input("1"), int4Input("1"));
}
function evaluate1102() {
    return integerNe(int8Input("-1"), int4Input("1"));
}
function evaluate1103() {
    return integerNe(int8Input("1"), int4Input("-1"));
}
function evaluate1104() {
    return integerNe(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate1105() {
    return integerNe(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate1106() {
    return integerNe(int8Input(null), int4Input("1"));
}
function evaluate1107() {
    return integerNe(int8Input("1"), int4Input(null));
}
function evaluate1108() {
    return integerNe(int8Input(null), int4Input(null));
}
function evaluate1109() {
    return integerLt(int8Input("1"), int4Input("1"));
}
function evaluate1110() {
    return integerLt(int8Input("-1"), int4Input("1"));
}
function evaluate1111() {
    return integerLt(int8Input("1"), int4Input("-1"));
}
function evaluate1112() {
    return integerLt(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate1113() {
    return integerLt(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate1114() {
    return integerLt(int8Input(null), int4Input("1"));
}
function evaluate1115() {
    return integerLt(int8Input("1"), int4Input(null));
}
function evaluate1116() {
    return integerLt(int8Input(null), int4Input(null));
}
function evaluate1117() {
    return integerLe(int8Input("1"), int4Input("1"));
}
function evaluate1118() {
    return integerLe(int8Input("-1"), int4Input("1"));
}
function evaluate1119() {
    return integerLe(int8Input("1"), int4Input("-1"));
}
function evaluate1120() {
    return integerLe(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate1121() {
    return integerLe(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate1122() {
    return integerLe(int8Input(null), int4Input("1"));
}
function evaluate1123() {
    return integerLe(int8Input("1"), int4Input(null));
}
function evaluate1124() {
    return integerLe(int8Input(null), int4Input(null));
}
function evaluate1125() {
    return integerGt(int8Input("1"), int4Input("1"));
}
function evaluate1126() {
    return integerGt(int8Input("-1"), int4Input("1"));
}
function evaluate1127() {
    return integerGt(int8Input("1"), int4Input("-1"));
}
function evaluate1128() {
    return integerGt(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate1129() {
    return integerGt(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate1130() {
    return integerGt(int8Input(null), int4Input("1"));
}
function evaluate1131() {
    return integerGt(int8Input("1"), int4Input(null));
}
function evaluate1132() {
    return integerGt(int8Input(null), int4Input(null));
}
function evaluate1133() {
    return integerGe(int8Input("1"), int4Input("1"));
}
function evaluate1134() {
    return integerGe(int8Input("-1"), int4Input("1"));
}
function evaluate1135() {
    return integerGe(int8Input("1"), int4Input("-1"));
}
function evaluate1136() {
    return integerGe(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate1137() {
    return integerGe(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate1138() {
    return integerGe(int8Input(null), int4Input("1"));
}
function evaluate1139() {
    return integerGe(int8Input("1"), int4Input(null));
}
function evaluate1140() {
    return integerGe(int8Input(null), int4Input(null));
}
function evaluate1141() {
    return integerEq(int8Input("1"), int8Input("1"));
}
function evaluate1142() {
    return integerEq(int8Input("-1"), int8Input("1"));
}
function evaluate1143() {
    return integerEq(int8Input("1"), int8Input("-1"));
}
function evaluate1144() {
    return integerEq(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1145() {
    return integerEq(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate1146() {
    return integerEq(int8Input(null), int8Input("1"));
}
function evaluate1147() {
    return integerEq(int8Input("1"), int8Input(null));
}
function evaluate1148() {
    return integerEq(int8Input(null), int8Input(null));
}
function evaluate1149() {
    return integerEq(int8Input("9007199254740992"), int8Input("9007199254740993"));
}
function evaluate1150() {
    return integerNe(int8Input("1"), int8Input("1"));
}
function evaluate1151() {
    return integerNe(int8Input("-1"), int8Input("1"));
}
function evaluate1152() {
    return integerNe(int8Input("1"), int8Input("-1"));
}
function evaluate1153() {
    return integerNe(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1154() {
    return integerNe(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate1155() {
    return integerNe(int8Input(null), int8Input("1"));
}
function evaluate1156() {
    return integerNe(int8Input("1"), int8Input(null));
}
function evaluate1157() {
    return integerNe(int8Input(null), int8Input(null));
}
function evaluate1158() {
    return integerNe(int8Input("9007199254740992"), int8Input("9007199254740993"));
}
function evaluate1159() {
    return integerLt(int8Input("1"), int8Input("1"));
}
function evaluate1160() {
    return integerLt(int8Input("-1"), int8Input("1"));
}
function evaluate1161() {
    return integerLt(int8Input("1"), int8Input("-1"));
}
function evaluate1162() {
    return integerLt(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1163() {
    return integerLt(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate1164() {
    return integerLt(int8Input(null), int8Input("1"));
}
function evaluate1165() {
    return integerLt(int8Input("1"), int8Input(null));
}
function evaluate1166() {
    return integerLt(int8Input(null), int8Input(null));
}
function evaluate1167() {
    return integerLt(int8Input("9007199254740992"), int8Input("9007199254740993"));
}
function evaluate1168() {
    return integerLe(int8Input("1"), int8Input("1"));
}
function evaluate1169() {
    return integerLe(int8Input("-1"), int8Input("1"));
}
function evaluate1170() {
    return integerLe(int8Input("1"), int8Input("-1"));
}
function evaluate1171() {
    return integerLe(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1172() {
    return integerLe(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate1173() {
    return integerLe(int8Input(null), int8Input("1"));
}
function evaluate1174() {
    return integerLe(int8Input("1"), int8Input(null));
}
function evaluate1175() {
    return integerLe(int8Input(null), int8Input(null));
}
function evaluate1176() {
    return integerLe(int8Input("9007199254740992"), int8Input("9007199254740993"));
}
function evaluate1177() {
    return integerGt(int8Input("1"), int8Input("1"));
}
function evaluate1178() {
    return integerGt(int8Input("-1"), int8Input("1"));
}
function evaluate1179() {
    return integerGt(int8Input("1"), int8Input("-1"));
}
function evaluate1180() {
    return integerGt(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1181() {
    return integerGt(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate1182() {
    return integerGt(int8Input(null), int8Input("1"));
}
function evaluate1183() {
    return integerGt(int8Input("1"), int8Input(null));
}
function evaluate1184() {
    return integerGt(int8Input(null), int8Input(null));
}
function evaluate1185() {
    return integerGt(int8Input("9007199254740992"), int8Input("9007199254740993"));
}
function evaluate1186() {
    return integerGe(int8Input("1"), int8Input("1"));
}
function evaluate1187() {
    return integerGe(int8Input("-1"), int8Input("1"));
}
function evaluate1188() {
    return integerGe(int8Input("1"), int8Input("-1"));
}
function evaluate1189() {
    return integerGe(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1190() {
    return integerGe(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate1191() {
    return integerGe(int8Input(null), int8Input("1"));
}
function evaluate1192() {
    return integerGe(int8Input("1"), int8Input(null));
}
function evaluate1193() {
    return integerGe(int8Input(null), int8Input(null));
}
function evaluate1194() {
    return integerGe(int8Input("9007199254740992"), int8Input("9007199254740993"));
}
function evaluate1195() {
    return int2Input("0");
}
function evaluate1196() {
    return int2Input("1");
}
function evaluate1197() {
    return int2Input("-1");
}
function evaluate1198() {
    return int2Input("-32768");
}
function evaluate1199() {
    return int2Input("32767");
}
function evaluate1200() {
    return int2Input("-32767");
}
function evaluate1201() {
    return int2Input("32766");
}
function evaluate1202() {
    return int2Input(null);
}
function evaluate1203() {
    return int4Cast(int2Input("0"));
}
function evaluate1204() {
    return int4Cast(int2Input("1"));
}
function evaluate1205() {
    return int4Cast(int2Input("-1"));
}
function evaluate1206() {
    return int4Cast(int2Input("-32768"));
}
function evaluate1207() {
    return int4Cast(int2Input("32767"));
}
function evaluate1208() {
    return int4Cast(int2Input(null));
}
function evaluate1209() {
    return int8Cast(int2Input("0"));
}
function evaluate1210() {
    return int8Cast(int2Input("1"));
}
function evaluate1211() {
    return int8Cast(int2Input("-1"));
}
function evaluate1212() {
    return int8Cast(int2Input("-32768"));
}
function evaluate1213() {
    return int8Cast(int2Input("32767"));
}
function evaluate1214() {
    return int8Cast(int2Input(null));
}
function evaluate1215() {
    return int2Cast(int4Input("0"));
}
function evaluate1216() {
    return int2Cast(int4Input("1"));
}
function evaluate1217() {
    return int2Cast(int4Input("-1"));
}
function evaluate1218() {
    return int2Cast(int4Input("-2147483648"));
}
function evaluate1219() {
    return int2Cast(int4Input("2147483647"));
}
function evaluate1220() {
    return int2Cast(int4Input("-32768"));
}
function evaluate1221() {
    return int2Cast(int4Input("32767"));
}
function evaluate1222() {
    return int2Cast(int4Input("-32767"));
}
function evaluate1223() {
    return int2Cast(int4Input("32766"));
}
function evaluate1224() {
    return int2Cast(int4Input("-32769"));
}
function evaluate1225() {
    return int2Cast(int4Input("32768"));
}
function evaluate1226() {
    return int2Cast(int4Input(null));
}
function evaluate1227() {
    return int4Input("0");
}
function evaluate1228() {
    return int4Input("1");
}
function evaluate1229() {
    return int4Input("-1");
}
function evaluate1230() {
    return int4Input("-2147483648");
}
function evaluate1231() {
    return int4Input("2147483647");
}
function evaluate1232() {
    return int4Input("-2147483647");
}
function evaluate1233() {
    return int4Input("2147483646");
}
function evaluate1234() {
    return int4Input(null);
}
function evaluate1235() {
    return int8Cast(int4Input("0"));
}
function evaluate1236() {
    return int8Cast(int4Input("1"));
}
function evaluate1237() {
    return int8Cast(int4Input("-1"));
}
function evaluate1238() {
    return int8Cast(int4Input("-2147483648"));
}
function evaluate1239() {
    return int8Cast(int4Input("2147483647"));
}
function evaluate1240() {
    return int8Cast(int4Input(null));
}
function evaluate1241() {
    return int2Cast(int8Input("0"));
}
function evaluate1242() {
    return int2Cast(int8Input("1"));
}
function evaluate1243() {
    return int2Cast(int8Input("-1"));
}
function evaluate1244() {
    return int2Cast(int8Input("-9223372036854775808"));
}
function evaluate1245() {
    return int2Cast(int8Input("9223372036854775807"));
}
function evaluate1246() {
    return int2Cast(int8Input("-32768"));
}
function evaluate1247() {
    return int2Cast(int8Input("32767"));
}
function evaluate1248() {
    return int2Cast(int8Input("-32767"));
}
function evaluate1249() {
    return int2Cast(int8Input("32766"));
}
function evaluate1250() {
    return int2Cast(int8Input("-32769"));
}
function evaluate1251() {
    return int2Cast(int8Input("32768"));
}
function evaluate1252() {
    return int2Cast(int8Input("9007199254740993"));
}
function evaluate1253() {
    return int2Cast(int8Input(null));
}
function evaluate1254() {
    return int4Cast(int8Input("0"));
}
function evaluate1255() {
    return int4Cast(int8Input("1"));
}
function evaluate1256() {
    return int4Cast(int8Input("-1"));
}
function evaluate1257() {
    return int4Cast(int8Input("-9223372036854775808"));
}
function evaluate1258() {
    return int4Cast(int8Input("9223372036854775807"));
}
function evaluate1259() {
    return int4Cast(int8Input("-2147483648"));
}
function evaluate1260() {
    return int4Cast(int8Input("2147483647"));
}
function evaluate1261() {
    return int4Cast(int8Input("-2147483647"));
}
function evaluate1262() {
    return int4Cast(int8Input("2147483646"));
}
function evaluate1263() {
    return int4Cast(int8Input("-2147483649"));
}
function evaluate1264() {
    return int4Cast(int8Input("2147483648"));
}
function evaluate1265() {
    return int4Cast(int8Input("9007199254740993"));
}
function evaluate1266() {
    return int4Cast(int8Input(null));
}
function evaluate1267() {
    return int8Input("0");
}
function evaluate1268() {
    return int8Input("1");
}
function evaluate1269() {
    return int8Input("-1");
}
function evaluate1270() {
    return int8Input("-9223372036854775808");
}
function evaluate1271() {
    return int8Input("9223372036854775807");
}
function evaluate1272() {
    return int8Input("-9223372036854775807");
}
function evaluate1273() {
    return int8Input("9223372036854775806");
}
function evaluate1274() {
    return int8Input("9007199254740993");
}
function evaluate1275() {
    return int8Input(null);
}
function evaluate1276() {
    return int4Abs(int4Mul(int4Sub(int4Input("2"), int4Input("5")), int4Input("3")));
}
function evaluate1277() {
    return integerLt(int8Neg(int8Abs(int8Input("-5"))), int2Input("-4"));
}
function evaluate1278() {
    return int4Mul(int4Cast(int2Input("2")), int2Input("16384"));
}
function evaluate1279() {
    return int4Cast(int2Mul(int2Input("2"), int2Input("16384")));
}
function evaluate1280() {
    return int8Add(int4Cast(int8Sub(int8Input("2147483648"), int2Input("1"))), int8Input("1"));
}
function evaluate1281() {
    return int2Abs(int2Cast(int8Input("32768")));
}
function evaluate1282() {
    return integerEq(int8Abs(int8Input("-9223372036854775808")), int8Input("0"));
}
function evaluate1283() {
    return integerGe(int8Abs(int8Sub(int8Cast(int2Input(null)), int4Input("1"))), int8Input("0"));
}
function evaluate1284() {
    return int8Mul(int8Input("3037000499"), int8Input("3037000499"));
}
function evaluate1285() {
    return int8Mul(int8Input("3037000500"), int8Input("3037000500"));
}
function evaluate1286() {
    return int8Mul(int8Input("-3037000499"), int8Input("-3037000499"));
}
function evaluate1287() {
    return int8Mul(int8Input("-3037000500"), int8Input("-3037000500"));
}
function evaluate1288() {
    return int8Neg(int8Sub(int8Input("-9223372036854775808"), int8Input("-1")));
}
function evaluate1289() {
    return int8Sub(int8Neg(int8Input("-9223372036854775808")), int8Input("-1"));
}
function evaluate1290() {
    return int2Div(int2Input("7"), int2Input("3"));
}
function evaluate1291() {
    return int2Div(int2Input("-7"), int2Input("3"));
}
function evaluate1292() {
    return int2Div(int2Input("7"), int2Input("-3"));
}
function evaluate1293() {
    return int2Div(int2Input("-7"), int2Input("-3"));
}
function evaluate1294() {
    return int2Div(int2Input("0"), int2Input("1"));
}
function evaluate1295() {
    return int2Div(int2Input("1"), int2Input("0"));
}
function evaluate1296() {
    return int2Div(int2Input("0"), int2Input("0"));
}
function evaluate1297() {
    return int2Div(int2Input("-32768"), int2Input("-1"));
}
function evaluate1298() {
    return int2Div(int2Input("32767"), int2Input("-1"));
}
function evaluate1299() {
    return int2Div(int2Input("-32768"), int2Input("1"));
}
function evaluate1300() {
    return int2Div(int2Input("32767"), int2Input("1"));
}
function evaluate1301() {
    return int2Div(int2Input("-32768"), int2Input("-32768"));
}
function evaluate1302() {
    return int2Div(int2Input("32767"), int2Input("32767"));
}
function evaluate1303() {
    return int2Div(int2Input(null), int2Input("0"));
}
function evaluate1304() {
    return int2Div(int2Input("0"), int2Input(null));
}
function evaluate1305() {
    return int2Div(int2Input(null), int2Input(null));
}
function evaluate1306() {
    return int2Mod(int2Input("7"), int2Input("3"));
}
function evaluate1307() {
    return int2Mod(int2Input("7"), int2Input("3"));
}
function evaluate1308() {
    return int2Mod(int2Input("-7"), int2Input("3"));
}
function evaluate1309() {
    return int2Mod(int2Input("-7"), int2Input("3"));
}
function evaluate1310() {
    return int2Mod(int2Input("7"), int2Input("-3"));
}
function evaluate1311() {
    return int2Mod(int2Input("7"), int2Input("-3"));
}
function evaluate1312() {
    return int2Mod(int2Input("-7"), int2Input("-3"));
}
function evaluate1313() {
    return int2Mod(int2Input("-7"), int2Input("-3"));
}
function evaluate1314() {
    return int2Mod(int2Input("0"), int2Input("1"));
}
function evaluate1315() {
    return int2Mod(int2Input("0"), int2Input("1"));
}
function evaluate1316() {
    return int2Mod(int2Input("1"), int2Input("0"));
}
function evaluate1317() {
    return int2Mod(int2Input("1"), int2Input("0"));
}
function evaluate1318() {
    return int2Mod(int2Input("0"), int2Input("0"));
}
function evaluate1319() {
    return int2Mod(int2Input("0"), int2Input("0"));
}
function evaluate1320() {
    return int2Mod(int2Input("-32768"), int2Input("-1"));
}
function evaluate1321() {
    return int2Mod(int2Input("-32768"), int2Input("-1"));
}
function evaluate1322() {
    return int2Mod(int2Input("32767"), int2Input("-1"));
}
function evaluate1323() {
    return int2Mod(int2Input("32767"), int2Input("-1"));
}
function evaluate1324() {
    return int2Mod(int2Input("-32768"), int2Input("1"));
}
function evaluate1325() {
    return int2Mod(int2Input("-32768"), int2Input("1"));
}
function evaluate1326() {
    return int2Mod(int2Input("32767"), int2Input("1"));
}
function evaluate1327() {
    return int2Mod(int2Input("32767"), int2Input("1"));
}
function evaluate1328() {
    return int2Mod(int2Input("-32768"), int2Input("-32768"));
}
function evaluate1329() {
    return int2Mod(int2Input("-32768"), int2Input("-32768"));
}
function evaluate1330() {
    return int2Mod(int2Input("32767"), int2Input("32767"));
}
function evaluate1331() {
    return int2Mod(int2Input("32767"), int2Input("32767"));
}
function evaluate1332() {
    return int2Mod(int2Input(null), int2Input("0"));
}
function evaluate1333() {
    return int2Mod(int2Input(null), int2Input("0"));
}
function evaluate1334() {
    return int2Mod(int2Input("0"), int2Input(null));
}
function evaluate1335() {
    return int2Mod(int2Input("0"), int2Input(null));
}
function evaluate1336() {
    return int2Mod(int2Input(null), int2Input(null));
}
function evaluate1337() {
    return int2Mod(int2Input(null), int2Input(null));
}
function evaluate1338() {
    return int4Div(int2Input("7"), int4Input("3"));
}
function evaluate1339() {
    return int4Div(int2Input("-7"), int4Input("3"));
}
function evaluate1340() {
    return int4Div(int2Input("7"), int4Input("-3"));
}
function evaluate1341() {
    return int4Div(int2Input("-7"), int4Input("-3"));
}
function evaluate1342() {
    return int4Div(int2Input("0"), int4Input("1"));
}
function evaluate1343() {
    return int4Div(int2Input("1"), int4Input("0"));
}
function evaluate1344() {
    return int4Div(int2Input("0"), int4Input("0"));
}
function evaluate1345() {
    return int4Div(int2Input("-32768"), int4Input("-1"));
}
function evaluate1346() {
    return int4Div(int2Input("32767"), int4Input("-1"));
}
function evaluate1347() {
    return int4Div(int2Input("-32768"), int4Input("1"));
}
function evaluate1348() {
    return int4Div(int2Input("32767"), int4Input("1"));
}
function evaluate1349() {
    return int4Div(int2Input("-32768"), int4Input("-2147483648"));
}
function evaluate1350() {
    return int4Div(int2Input("32767"), int4Input("2147483647"));
}
function evaluate1351() {
    return int4Div(int2Input(null), int4Input("0"));
}
function evaluate1352() {
    return int4Div(int2Input("0"), int4Input(null));
}
function evaluate1353() {
    return int4Div(int2Input(null), int4Input(null));
}
function evaluate1354() {
    return int8Div(int2Input("7"), int8Input("3"));
}
function evaluate1355() {
    return int8Div(int2Input("-7"), int8Input("3"));
}
function evaluate1356() {
    return int8Div(int2Input("7"), int8Input("-3"));
}
function evaluate1357() {
    return int8Div(int2Input("-7"), int8Input("-3"));
}
function evaluate1358() {
    return int8Div(int2Input("0"), int8Input("1"));
}
function evaluate1359() {
    return int8Div(int2Input("1"), int8Input("0"));
}
function evaluate1360() {
    return int8Div(int2Input("0"), int8Input("0"));
}
function evaluate1361() {
    return int8Div(int2Input("-32768"), int8Input("-1"));
}
function evaluate1362() {
    return int8Div(int2Input("32767"), int8Input("-1"));
}
function evaluate1363() {
    return int8Div(int2Input("-32768"), int8Input("1"));
}
function evaluate1364() {
    return int8Div(int2Input("32767"), int8Input("1"));
}
function evaluate1365() {
    return int8Div(int2Input("-32768"), int8Input("-9223372036854775808"));
}
function evaluate1366() {
    return int8Div(int2Input("32767"), int8Input("9223372036854775807"));
}
function evaluate1367() {
    return int8Div(int2Input(null), int8Input("0"));
}
function evaluate1368() {
    return int8Div(int2Input("0"), int8Input(null));
}
function evaluate1369() {
    return int8Div(int2Input(null), int8Input(null));
}
function evaluate1370() {
    return int4Div(int4Input("7"), int2Input("3"));
}
function evaluate1371() {
    return int4Div(int4Input("-7"), int2Input("3"));
}
function evaluate1372() {
    return int4Div(int4Input("7"), int2Input("-3"));
}
function evaluate1373() {
    return int4Div(int4Input("-7"), int2Input("-3"));
}
function evaluate1374() {
    return int4Div(int4Input("0"), int2Input("1"));
}
function evaluate1375() {
    return int4Div(int4Input("1"), int2Input("0"));
}
function evaluate1376() {
    return int4Div(int4Input("0"), int2Input("0"));
}
function evaluate1377() {
    return int4Div(int4Input("-2147483648"), int2Input("-1"));
}
function evaluate1378() {
    return int4Div(int4Input("2147483647"), int2Input("-1"));
}
function evaluate1379() {
    return int4Div(int4Input("-2147483648"), int2Input("1"));
}
function evaluate1380() {
    return int4Div(int4Input("2147483647"), int2Input("1"));
}
function evaluate1381() {
    return int4Div(int4Input("-2147483648"), int2Input("-32768"));
}
function evaluate1382() {
    return int4Div(int4Input("2147483647"), int2Input("32767"));
}
function evaluate1383() {
    return int4Div(int4Input(null), int2Input("0"));
}
function evaluate1384() {
    return int4Div(int4Input("0"), int2Input(null));
}
function evaluate1385() {
    return int4Div(int4Input(null), int2Input(null));
}
function evaluate1386() {
    return int4Div(int4Input("7"), int4Input("3"));
}
function evaluate1387() {
    return int4Div(int4Input("-7"), int4Input("3"));
}
function evaluate1388() {
    return int4Div(int4Input("7"), int4Input("-3"));
}
function evaluate1389() {
    return int4Div(int4Input("-7"), int4Input("-3"));
}
function evaluate1390() {
    return int4Div(int4Input("0"), int4Input("1"));
}
function evaluate1391() {
    return int4Div(int4Input("1"), int4Input("0"));
}
function evaluate1392() {
    return int4Div(int4Input("0"), int4Input("0"));
}
function evaluate1393() {
    return int4Div(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate1394() {
    return int4Div(int4Input("2147483647"), int4Input("-1"));
}
function evaluate1395() {
    return int4Div(int4Input("-2147483648"), int4Input("1"));
}
function evaluate1396() {
    return int4Div(int4Input("2147483647"), int4Input("1"));
}
function evaluate1397() {
    return int4Div(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate1398() {
    return int4Div(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate1399() {
    return int4Div(int4Input(null), int4Input("0"));
}
function evaluate1400() {
    return int4Div(int4Input("0"), int4Input(null));
}
function evaluate1401() {
    return int4Div(int4Input(null), int4Input(null));
}
function evaluate1402() {
    return int4Mod(int4Input("7"), int4Input("3"));
}
function evaluate1403() {
    return int4Mod(int4Input("7"), int4Input("3"));
}
function evaluate1404() {
    return int4Mod(int4Input("-7"), int4Input("3"));
}
function evaluate1405() {
    return int4Mod(int4Input("-7"), int4Input("3"));
}
function evaluate1406() {
    return int4Mod(int4Input("7"), int4Input("-3"));
}
function evaluate1407() {
    return int4Mod(int4Input("7"), int4Input("-3"));
}
function evaluate1408() {
    return int4Mod(int4Input("-7"), int4Input("-3"));
}
function evaluate1409() {
    return int4Mod(int4Input("-7"), int4Input("-3"));
}
function evaluate1410() {
    return int4Mod(int4Input("0"), int4Input("1"));
}
function evaluate1411() {
    return int4Mod(int4Input("0"), int4Input("1"));
}
function evaluate1412() {
    return int4Mod(int4Input("1"), int4Input("0"));
}
function evaluate1413() {
    return int4Mod(int4Input("1"), int4Input("0"));
}
function evaluate1414() {
    return int4Mod(int4Input("0"), int4Input("0"));
}
function evaluate1415() {
    return int4Mod(int4Input("0"), int4Input("0"));
}
function evaluate1416() {
    return int4Mod(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate1417() {
    return int4Mod(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate1418() {
    return int4Mod(int4Input("2147483647"), int4Input("-1"));
}
function evaluate1419() {
    return int4Mod(int4Input("2147483647"), int4Input("-1"));
}
function evaluate1420() {
    return int4Mod(int4Input("-2147483648"), int4Input("1"));
}
function evaluate1421() {
    return int4Mod(int4Input("-2147483648"), int4Input("1"));
}
function evaluate1422() {
    return int4Mod(int4Input("2147483647"), int4Input("1"));
}
function evaluate1423() {
    return int4Mod(int4Input("2147483647"), int4Input("1"));
}
function evaluate1424() {
    return int4Mod(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate1425() {
    return int4Mod(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate1426() {
    return int4Mod(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate1427() {
    return int4Mod(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate1428() {
    return int4Mod(int4Input(null), int4Input("0"));
}
function evaluate1429() {
    return int4Mod(int4Input(null), int4Input("0"));
}
function evaluate1430() {
    return int4Mod(int4Input("0"), int4Input(null));
}
function evaluate1431() {
    return int4Mod(int4Input("0"), int4Input(null));
}
function evaluate1432() {
    return int4Mod(int4Input(null), int4Input(null));
}
function evaluate1433() {
    return int4Mod(int4Input(null), int4Input(null));
}
function evaluate1434() {
    return int4Gcd(int4Input("12"), int4Input("18"));
}
function evaluate1435() {
    return int4Gcd(int4Input("-12"), int4Input("18"));
}
function evaluate1436() {
    return int4Gcd(int4Input("12"), int4Input("-18"));
}
function evaluate1437() {
    return int4Gcd(int4Input("-12"), int4Input("-18"));
}
function evaluate1438() {
    return int4Gcd(int4Input("0"), int4Input("0"));
}
function evaluate1439() {
    return int4Gcd(int4Input("0"), int4Input("7"));
}
function evaluate1440() {
    return int4Gcd(int4Input("7"), int4Input("0"));
}
function evaluate1441() {
    return int4Gcd(int4Input("-2147483648"), int4Input("0"));
}
function evaluate1442() {
    return int4Gcd(int4Input("0"), int4Input("-2147483648"));
}
function evaluate1443() {
    return int4Gcd(int4Input("-2147483648"), int4Input("1"));
}
function evaluate1444() {
    return int4Gcd(int4Input("-2147483648"), int4Input("2"));
}
function evaluate1445() {
    return int4Gcd(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate1446() {
    return int4Gcd(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate1447() {
    return int4Gcd(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate1448() {
    return int4Gcd(int4Input("2147483647"), int4Input("2"));
}
function evaluate1449() {
    return int4Gcd(int4Input("2147483647"), int4Input("1"));
}
function evaluate1450() {
    return int4Gcd(int4Input("0"), int4Input(null));
}
function evaluate1451() {
    return int4Gcd(int4Input(null), int4Input("-2147483648"));
}
function evaluate1452() {
    return int4Gcd(int4Input("2147483647"), int4Input(null));
}
function evaluate1453() {
    return int4Gcd(int4Input(null), int4Input(null));
}
function evaluate1454() {
    return int4Lcm(int4Input("12"), int4Input("18"));
}
function evaluate1455() {
    return int4Lcm(int4Input("-12"), int4Input("18"));
}
function evaluate1456() {
    return int4Lcm(int4Input("12"), int4Input("-18"));
}
function evaluate1457() {
    return int4Lcm(int4Input("-12"), int4Input("-18"));
}
function evaluate1458() {
    return int4Lcm(int4Input("0"), int4Input("0"));
}
function evaluate1459() {
    return int4Lcm(int4Input("0"), int4Input("7"));
}
function evaluate1460() {
    return int4Lcm(int4Input("7"), int4Input("0"));
}
function evaluate1461() {
    return int4Lcm(int4Input("-2147483648"), int4Input("0"));
}
function evaluate1462() {
    return int4Lcm(int4Input("0"), int4Input("-2147483648"));
}
function evaluate1463() {
    return int4Lcm(int4Input("-2147483648"), int4Input("1"));
}
function evaluate1464() {
    return int4Lcm(int4Input("-2147483648"), int4Input("2"));
}
function evaluate1465() {
    return int4Lcm(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate1466() {
    return int4Lcm(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate1467() {
    return int4Lcm(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate1468() {
    return int4Lcm(int4Input("2147483647"), int4Input("2"));
}
function evaluate1469() {
    return int4Lcm(int4Input("2147483647"), int4Input("1"));
}
function evaluate1470() {
    return int4Lcm(int4Input("0"), int4Input(null));
}
function evaluate1471() {
    return int4Lcm(int4Input(null), int4Input("-2147483648"));
}
function evaluate1472() {
    return int4Lcm(int4Input("2147483647"), int4Input(null));
}
function evaluate1473() {
    return int4Lcm(int4Input(null), int4Input(null));
}
function evaluate1474() {
    return int8Div(int4Input("7"), int8Input("3"));
}
function evaluate1475() {
    return int8Div(int4Input("-7"), int8Input("3"));
}
function evaluate1476() {
    return int8Div(int4Input("7"), int8Input("-3"));
}
function evaluate1477() {
    return int8Div(int4Input("-7"), int8Input("-3"));
}
function evaluate1478() {
    return int8Div(int4Input("0"), int8Input("1"));
}
function evaluate1479() {
    return int8Div(int4Input("1"), int8Input("0"));
}
function evaluate1480() {
    return int8Div(int4Input("0"), int8Input("0"));
}
function evaluate1481() {
    return int8Div(int4Input("-2147483648"), int8Input("-1"));
}
function evaluate1482() {
    return int8Div(int4Input("2147483647"), int8Input("-1"));
}
function evaluate1483() {
    return int8Div(int4Input("-2147483648"), int8Input("1"));
}
function evaluate1484() {
    return int8Div(int4Input("2147483647"), int8Input("1"));
}
function evaluate1485() {
    return int8Div(int4Input("-2147483648"), int8Input("-9223372036854775808"));
}
function evaluate1486() {
    return int8Div(int4Input("2147483647"), int8Input("9223372036854775807"));
}
function evaluate1487() {
    return int8Div(int4Input(null), int8Input("0"));
}
function evaluate1488() {
    return int8Div(int4Input("0"), int8Input(null));
}
function evaluate1489() {
    return int8Div(int4Input(null), int8Input(null));
}
function evaluate1490() {
    return int8Div(int8Input("7"), int2Input("3"));
}
function evaluate1491() {
    return int8Div(int8Input("-7"), int2Input("3"));
}
function evaluate1492() {
    return int8Div(int8Input("7"), int2Input("-3"));
}
function evaluate1493() {
    return int8Div(int8Input("-7"), int2Input("-3"));
}
function evaluate1494() {
    return int8Div(int8Input("0"), int2Input("1"));
}
function evaluate1495() {
    return int8Div(int8Input("1"), int2Input("0"));
}
function evaluate1496() {
    return int8Div(int8Input("0"), int2Input("0"));
}
function evaluate1497() {
    return int8Div(int8Input("-9223372036854775808"), int2Input("-1"));
}
function evaluate1498() {
    return int8Div(int8Input("9223372036854775807"), int2Input("-1"));
}
function evaluate1499() {
    return int8Div(int8Input("-9223372036854775808"), int2Input("1"));
}
function evaluate1500() {
    return int8Div(int8Input("9223372036854775807"), int2Input("1"));
}
function evaluate1501() {
    return int8Div(int8Input("-9223372036854775808"), int2Input("-32768"));
}
function evaluate1502() {
    return int8Div(int8Input("9223372036854775807"), int2Input("32767"));
}
function evaluate1503() {
    return int8Div(int8Input(null), int2Input("0"));
}
function evaluate1504() {
    return int8Div(int8Input("0"), int2Input(null));
}
function evaluate1505() {
    return int8Div(int8Input(null), int2Input(null));
}
function evaluate1506() {
    return int8Div(int8Input("7"), int4Input("3"));
}
function evaluate1507() {
    return int8Div(int8Input("-7"), int4Input("3"));
}
function evaluate1508() {
    return int8Div(int8Input("7"), int4Input("-3"));
}
function evaluate1509() {
    return int8Div(int8Input("-7"), int4Input("-3"));
}
function evaluate1510() {
    return int8Div(int8Input("0"), int4Input("1"));
}
function evaluate1511() {
    return int8Div(int8Input("1"), int4Input("0"));
}
function evaluate1512() {
    return int8Div(int8Input("0"), int4Input("0"));
}
function evaluate1513() {
    return int8Div(int8Input("-9223372036854775808"), int4Input("-1"));
}
function evaluate1514() {
    return int8Div(int8Input("9223372036854775807"), int4Input("-1"));
}
function evaluate1515() {
    return int8Div(int8Input("-9223372036854775808"), int4Input("1"));
}
function evaluate1516() {
    return int8Div(int8Input("9223372036854775807"), int4Input("1"));
}
function evaluate1517() {
    return int8Div(int8Input("-9223372036854775808"), int4Input("-2147483648"));
}
function evaluate1518() {
    return int8Div(int8Input("9223372036854775807"), int4Input("2147483647"));
}
function evaluate1519() {
    return int8Div(int8Input(null), int4Input("0"));
}
function evaluate1520() {
    return int8Div(int8Input("0"), int4Input(null));
}
function evaluate1521() {
    return int8Div(int8Input(null), int4Input(null));
}
function evaluate1522() {
    return int8Div(int8Input("7"), int8Input("3"));
}
function evaluate1523() {
    return int8Div(int8Input("-7"), int8Input("3"));
}
function evaluate1524() {
    return int8Div(int8Input("7"), int8Input("-3"));
}
function evaluate1525() {
    return int8Div(int8Input("-7"), int8Input("-3"));
}
function evaluate1526() {
    return int8Div(int8Input("0"), int8Input("1"));
}
function evaluate1527() {
    return int8Div(int8Input("1"), int8Input("0"));
}
function evaluate1528() {
    return int8Div(int8Input("0"), int8Input("0"));
}
function evaluate1529() {
    return int8Div(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate1530() {
    return int8Div(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate1531() {
    return int8Div(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate1532() {
    return int8Div(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate1533() {
    return int8Div(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate1534() {
    return int8Div(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate1535() {
    return int8Div(int8Input(null), int8Input("0"));
}
function evaluate1536() {
    return int8Div(int8Input("0"), int8Input(null));
}
function evaluate1537() {
    return int8Div(int8Input(null), int8Input(null));
}
function evaluate1538() {
    return int8Mod(int8Input("7"), int8Input("3"));
}
function evaluate1539() {
    return int8Mod(int8Input("7"), int8Input("3"));
}
function evaluate1540() {
    return int8Mod(int8Input("-7"), int8Input("3"));
}
function evaluate1541() {
    return int8Mod(int8Input("-7"), int8Input("3"));
}
function evaluate1542() {
    return int8Mod(int8Input("7"), int8Input("-3"));
}
function evaluate1543() {
    return int8Mod(int8Input("7"), int8Input("-3"));
}
function evaluate1544() {
    return int8Mod(int8Input("-7"), int8Input("-3"));
}
function evaluate1545() {
    return int8Mod(int8Input("-7"), int8Input("-3"));
}
function evaluate1546() {
    return int8Mod(int8Input("0"), int8Input("1"));
}
function evaluate1547() {
    return int8Mod(int8Input("0"), int8Input("1"));
}
function evaluate1548() {
    return int8Mod(int8Input("1"), int8Input("0"));
}
function evaluate1549() {
    return int8Mod(int8Input("1"), int8Input("0"));
}
function evaluate1550() {
    return int8Mod(int8Input("0"), int8Input("0"));
}
function evaluate1551() {
    return int8Mod(int8Input("0"), int8Input("0"));
}
function evaluate1552() {
    return int8Mod(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate1553() {
    return int8Mod(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate1554() {
    return int8Mod(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate1555() {
    return int8Mod(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate1556() {
    return int8Mod(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate1557() {
    return int8Mod(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate1558() {
    return int8Mod(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate1559() {
    return int8Mod(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate1560() {
    return int8Mod(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate1561() {
    return int8Mod(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate1562() {
    return int8Mod(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate1563() {
    return int8Mod(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate1564() {
    return int8Mod(int8Input(null), int8Input("0"));
}
function evaluate1565() {
    return int8Mod(int8Input(null), int8Input("0"));
}
function evaluate1566() {
    return int8Mod(int8Input("0"), int8Input(null));
}
function evaluate1567() {
    return int8Mod(int8Input("0"), int8Input(null));
}
function evaluate1568() {
    return int8Mod(int8Input(null), int8Input(null));
}
function evaluate1569() {
    return int8Mod(int8Input(null), int8Input(null));
}
function evaluate1570() {
    return int8Gcd(int8Input("12"), int8Input("18"));
}
function evaluate1571() {
    return int8Gcd(int8Input("-12"), int8Input("18"));
}
function evaluate1572() {
    return int8Gcd(int8Input("12"), int8Input("-18"));
}
function evaluate1573() {
    return int8Gcd(int8Input("-12"), int8Input("-18"));
}
function evaluate1574() {
    return int8Gcd(int8Input("0"), int8Input("0"));
}
function evaluate1575() {
    return int8Gcd(int8Input("0"), int8Input("7"));
}
function evaluate1576() {
    return int8Gcd(int8Input("7"), int8Input("0"));
}
function evaluate1577() {
    return int8Gcd(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate1578() {
    return int8Gcd(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate1579() {
    return int8Gcd(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate1580() {
    return int8Gcd(int8Input("-9223372036854775808"), int8Input("2"));
}
function evaluate1581() {
    return int8Gcd(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate1582() {
    return int8Gcd(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1583() {
    return int8Gcd(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate1584() {
    return int8Gcd(int8Input("9223372036854775807"), int8Input("2"));
}
function evaluate1585() {
    return int8Gcd(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate1586() {
    return int8Gcd(int8Input("0"), int8Input(null));
}
function evaluate1587() {
    return int8Gcd(int8Input(null), int8Input("-9223372036854775808"));
}
function evaluate1588() {
    return int8Gcd(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate1589() {
    return int8Gcd(int8Input(null), int8Input(null));
}
function evaluate1590() {
    return int8Lcm(int8Input("12"), int8Input("18"));
}
function evaluate1591() {
    return int8Lcm(int8Input("-12"), int8Input("18"));
}
function evaluate1592() {
    return int8Lcm(int8Input("12"), int8Input("-18"));
}
function evaluate1593() {
    return int8Lcm(int8Input("-12"), int8Input("-18"));
}
function evaluate1594() {
    return int8Lcm(int8Input("0"), int8Input("0"));
}
function evaluate1595() {
    return int8Lcm(int8Input("0"), int8Input("7"));
}
function evaluate1596() {
    return int8Lcm(int8Input("7"), int8Input("0"));
}
function evaluate1597() {
    return int8Lcm(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate1598() {
    return int8Lcm(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate1599() {
    return int8Lcm(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate1600() {
    return int8Lcm(int8Input("-9223372036854775808"), int8Input("2"));
}
function evaluate1601() {
    return int8Lcm(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate1602() {
    return int8Lcm(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate1603() {
    return int8Lcm(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate1604() {
    return int8Lcm(int8Input("9223372036854775807"), int8Input("2"));
}
function evaluate1605() {
    return int8Lcm(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate1606() {
    return int8Lcm(int8Input("0"), int8Input(null));
}
function evaluate1607() {
    return int8Lcm(int8Input(null), int8Input("-9223372036854775808"));
}
function evaluate1608() {
    return int8Lcm(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate1609() {
    return int8Lcm(int8Input(null), int8Input(null));
}
function evaluate1610() {
    return float4Input(null);
}
function evaluate1611() {
    return float4Input("00000000");
}
function evaluate1612() {
    return float4Input("80000000");
}
function evaluate1613() {
    return float4Input("3f800000");
}
function evaluate1614() {
    return float4Input("bf800000");
}
function evaluate1615() {
    return float4Input("40000000");
}
function evaluate1616() {
    return float4Input("40400000");
}
function evaluate1617() {
    return float4Input("3f000000");
}
function evaluate1618() {
    return float4Input("3dcccccd");
}
function evaluate1619() {
    return float4Input("7f7fffff");
}
function evaluate1620() {
    return float4Input("ff7fffff");
}
function evaluate1621() {
    return float4Input("00800000");
}
function evaluate1622() {
    return float4Input("00000001");
}
function evaluate1623() {
    return float4Input("80000001");
}
function evaluate1624() {
    return float4Input("7fc00000");
}
function evaluate1625() {
    return float4Input("7f800000");
}
function evaluate1626() {
    return float4Input("ff800000");
}
function evaluate1627() {
    return float4Neg(float4Input(null));
}
function evaluate1628() {
    return float4Neg(float4Input("00000000"));
}
function evaluate1629() {
    return float4Neg(float4Input("80000000"));
}
function evaluate1630() {
    return float4Neg(float4Input("3f800000"));
}
function evaluate1631() {
    return float4Neg(float4Input("bf800000"));
}
function evaluate1632() {
    return float4Neg(float4Input("40000000"));
}
function evaluate1633() {
    return float4Neg(float4Input("40400000"));
}
function evaluate1634() {
    return float4Neg(float4Input("3f000000"));
}
function evaluate1635() {
    return float4Neg(float4Input("3dcccccd"));
}
function evaluate1636() {
    return float4Neg(float4Input("7f7fffff"));
}
function evaluate1637() {
    return float4Neg(float4Input("ff7fffff"));
}
function evaluate1638() {
    return float4Neg(float4Input("00800000"));
}
function evaluate1639() {
    return float4Neg(float4Input("00000001"));
}
function evaluate1640() {
    return float4Neg(float4Input("80000001"));
}
function evaluate1641() {
    return float4Neg(float4Input("7fc00000"));
}
function evaluate1642() {
    return float4Neg(float4Input("7f800000"));
}
function evaluate1643() {
    return float4Neg(float4Input("ff800000"));
}
function evaluate1644() {
    return float4Identity(float4Input(null));
}
function evaluate1645() {
    return float4Identity(float4Input("00000000"));
}
function evaluate1646() {
    return float4Identity(float4Input("80000000"));
}
function evaluate1647() {
    return float4Identity(float4Input("3f800000"));
}
function evaluate1648() {
    return float4Identity(float4Input("bf800000"));
}
function evaluate1649() {
    return float4Identity(float4Input("40000000"));
}
function evaluate1650() {
    return float4Identity(float4Input("40400000"));
}
function evaluate1651() {
    return float4Identity(float4Input("3f000000"));
}
function evaluate1652() {
    return float4Identity(float4Input("3dcccccd"));
}
function evaluate1653() {
    return float4Identity(float4Input("7f7fffff"));
}
function evaluate1654() {
    return float4Identity(float4Input("ff7fffff"));
}
function evaluate1655() {
    return float4Identity(float4Input("00800000"));
}
function evaluate1656() {
    return float4Identity(float4Input("00000001"));
}
function evaluate1657() {
    return float4Identity(float4Input("80000001"));
}
function evaluate1658() {
    return float4Identity(float4Input("7fc00000"));
}
function evaluate1659() {
    return float4Identity(float4Input("7f800000"));
}
function evaluate1660() {
    return float4Identity(float4Input("ff800000"));
}
function evaluate1661() {
    return float4Abs(float4Input(null));
}
function evaluate1662() {
    return float4Abs(float4Input("00000000"));
}
function evaluate1663() {
    return float4Abs(float4Input("80000000"));
}
function evaluate1664() {
    return float4Abs(float4Input("3f800000"));
}
function evaluate1665() {
    return float4Abs(float4Input("bf800000"));
}
function evaluate1666() {
    return float4Abs(float4Input("40000000"));
}
function evaluate1667() {
    return float4Abs(float4Input("40400000"));
}
function evaluate1668() {
    return float4Abs(float4Input("3f000000"));
}
function evaluate1669() {
    return float4Abs(float4Input("3dcccccd"));
}
function evaluate1670() {
    return float4Abs(float4Input("7f7fffff"));
}
function evaluate1671() {
    return float4Abs(float4Input("ff7fffff"));
}
function evaluate1672() {
    return float4Abs(float4Input("00800000"));
}
function evaluate1673() {
    return float4Abs(float4Input("00000001"));
}
function evaluate1674() {
    return float4Abs(float4Input("80000001"));
}
function evaluate1675() {
    return float4Abs(float4Input("7fc00000"));
}
function evaluate1676() {
    return float4Abs(float4Input("7f800000"));
}
function evaluate1677() {
    return float4Abs(float4Input("ff800000"));
}
function evaluate1678() {
    return float4Abs(float4Input(null));
}
function evaluate1679() {
    return float4Abs(float4Input("00000000"));
}
function evaluate1680() {
    return float4Abs(float4Input("80000000"));
}
function evaluate1681() {
    return float4Abs(float4Input("3f800000"));
}
function evaluate1682() {
    return float4Abs(float4Input("bf800000"));
}
function evaluate1683() {
    return float4Abs(float4Input("40000000"));
}
function evaluate1684() {
    return float4Abs(float4Input("40400000"));
}
function evaluate1685() {
    return float4Abs(float4Input("3f000000"));
}
function evaluate1686() {
    return float4Abs(float4Input("3dcccccd"));
}
function evaluate1687() {
    return float4Abs(float4Input("7f7fffff"));
}
function evaluate1688() {
    return float4Abs(float4Input("ff7fffff"));
}
function evaluate1689() {
    return float4Abs(float4Input("00800000"));
}
function evaluate1690() {
    return float4Abs(float4Input("00000001"));
}
function evaluate1691() {
    return float4Abs(float4Input("80000001"));
}
function evaluate1692() {
    return float4Abs(float4Input("7fc00000"));
}
function evaluate1693() {
    return float4Abs(float4Input("7f800000"));
}
function evaluate1694() {
    return float4Abs(float4Input("ff800000"));
}
function evaluate1695() {
    return float4Input(null);
}
function evaluate1696() {
    return float4Input("00000000");
}
function evaluate1697() {
    return float4Input("80000000");
}
function evaluate1698() {
    return float4Input("3f800000");
}
function evaluate1699() {
    return float4Input("bf800000");
}
function evaluate1700() {
    return float4Input("40000000");
}
function evaluate1701() {
    return float4Input("40400000");
}
function evaluate1702() {
    return float4Input("3f000000");
}
function evaluate1703() {
    return float4Input("3dcccccd");
}
function evaluate1704() {
    return float4Input("7f7fffff");
}
function evaluate1705() {
    return float4Input("ff7fffff");
}
function evaluate1706() {
    return float4Input("00800000");
}
function evaluate1707() {
    return float4Input("00000001");
}
function evaluate1708() {
    return float4Input("80000001");
}
function evaluate1709() {
    return float4Input("7fc00000");
}
function evaluate1710() {
    return float4Input("7f800000");
}
function evaluate1711() {
    return float4Input("ff800000");
}
function evaluate1712() {
    return float8FromFloat4(float4Input(null));
}
function evaluate1713() {
    return float8FromFloat4(float4Input("00000000"));
}
function evaluate1714() {
    return float8FromFloat4(float4Input("80000000"));
}
function evaluate1715() {
    return float8FromFloat4(float4Input("3f800000"));
}
function evaluate1716() {
    return float8FromFloat4(float4Input("bf800000"));
}
function evaluate1717() {
    return float8FromFloat4(float4Input("40000000"));
}
function evaluate1718() {
    return float8FromFloat4(float4Input("40400000"));
}
function evaluate1719() {
    return float8FromFloat4(float4Input("3f000000"));
}
function evaluate1720() {
    return float8FromFloat4(float4Input("3dcccccd"));
}
function evaluate1721() {
    return float8FromFloat4(float4Input("7f7fffff"));
}
function evaluate1722() {
    return float8FromFloat4(float4Input("ff7fffff"));
}
function evaluate1723() {
    return float8FromFloat4(float4Input("00800000"));
}
function evaluate1724() {
    return float8FromFloat4(float4Input("00000001"));
}
function evaluate1725() {
    return float8FromFloat4(float4Input("80000001"));
}
function evaluate1726() {
    return float8FromFloat4(float4Input("7fc00000"));
}
function evaluate1727() {
    return float8FromFloat4(float4Input("7f800000"));
}
function evaluate1728() {
    return float8FromFloat4(float4Input("ff800000"));
}
function evaluate1729() {
    return float4FromInteger(int2Input(null));
}
function evaluate1730() {
    return float4FromInteger(int2Input("0"));
}
function evaluate1731() {
    return float4FromInteger(int2Input("1"));
}
function evaluate1732() {
    return float4FromInteger(int2Input("-1"));
}
function evaluate1733() {
    return float4FromInteger(int2Input("-32768"));
}
function evaluate1734() {
    return float4FromInteger(int2Input("32767"));
}
function evaluate1735() {
    return int2FromFloat(float4Input(null));
}
function evaluate1736() {
    return int2FromFloat(float4Input("00000000"));
}
function evaluate1737() {
    return int2FromFloat(float4Input("80000000"));
}
function evaluate1738() {
    return int2FromFloat(float4Input("3f000000"));
}
function evaluate1739() {
    return int2FromFloat(float4Input("bf000000"));
}
function evaluate1740() {
    return int2FromFloat(float4Input("3fc00000"));
}
function evaluate1741() {
    return int2FromFloat(float4Input("bfc00000"));
}
function evaluate1742() {
    return int2FromFloat(float4Input("40200000"));
}
function evaluate1743() {
    return int2FromFloat(float4Input("c0200000"));
}
function evaluate1744() {
    return int2FromFloat(float4Input("3fb33333"));
}
function evaluate1745() {
    return int2FromFloat(float4Input("bfb33333"));
}
function evaluate1746() {
    return int2FromFloat(float4Input("7fc00000"));
}
function evaluate1747() {
    return int2FromFloat(float4Input("7f800000"));
}
function evaluate1748() {
    return int2FromFloat(float4Input("ff800000"));
}
function evaluate1749() {
    return int2FromFloat(float4Input("c7000000"));
}
function evaluate1750() {
    return int2FromFloat(float4Input("46fffe00"));
}
function evaluate1751() {
    return int2FromFloat(float4Input("c7000100"));
}
function evaluate1752() {
    return int2FromFloat(float4Input("47000000"));
}
function evaluate1753() {
    return int2FromFloat(float4Input("46fffd00"));
}
function evaluate1754() {
    return int2FromFloat(float4Input("46fffecd"));
}
function evaluate1755() {
    return int2FromFloat(float4Input("46ffff00"));
}
function evaluate1756() {
    return int2FromFloat(float4Input("c7000080"));
}
function evaluate1757() {
    return int2FromFloat(float4Input("c700009a"));
}
function evaluate1758() {
    return float4FromInteger(int4Input(null));
}
function evaluate1759() {
    return float4FromInteger(int4Input("0"));
}
function evaluate1760() {
    return float4FromInteger(int4Input("1"));
}
function evaluate1761() {
    return float4FromInteger(int4Input("-1"));
}
function evaluate1762() {
    return float4FromInteger(int4Input("-2147483648"));
}
function evaluate1763() {
    return float4FromInteger(int4Input("2147483647"));
}
function evaluate1764() {
    return float4FromInteger(int4Input("16777217"));
}
function evaluate1765() {
    return float4FromInteger(int4Input("-16777217"));
}
function evaluate1766() {
    return float4FromInteger(int4Input("16777219"));
}
function evaluate1767() {
    return int4FromFloat(float4Input(null));
}
function evaluate1768() {
    return int4FromFloat(float4Input("00000000"));
}
function evaluate1769() {
    return int4FromFloat(float4Input("80000000"));
}
function evaluate1770() {
    return int4FromFloat(float4Input("3f000000"));
}
function evaluate1771() {
    return int4FromFloat(float4Input("bf000000"));
}
function evaluate1772() {
    return int4FromFloat(float4Input("3fc00000"));
}
function evaluate1773() {
    return int4FromFloat(float4Input("bfc00000"));
}
function evaluate1774() {
    return int4FromFloat(float4Input("40200000"));
}
function evaluate1775() {
    return int4FromFloat(float4Input("c0200000"));
}
function evaluate1776() {
    return int4FromFloat(float4Input("3fb33333"));
}
function evaluate1777() {
    return int4FromFloat(float4Input("bfb33333"));
}
function evaluate1778() {
    return int4FromFloat(float4Input("7fc00000"));
}
function evaluate1779() {
    return int4FromFloat(float4Input("7f800000"));
}
function evaluate1780() {
    return int4FromFloat(float4Input("ff800000"));
}
function evaluate1781() {
    return int4FromFloat(float4Input("cf000000"));
}
function evaluate1782() {
    return int4FromFloat(float4Input("4f000000"));
}
function evaluate1783() {
    return int4FromFloat(float4Input("cf000000"));
}
function evaluate1784() {
    return int4FromFloat(float4Input("4f000000"));
}
function evaluate1785() {
    return int4FromFloat(float4Input("4f000000"));
}
function evaluate1786() {
    return int4FromFloat(float4Input("4f000000"));
}
function evaluate1787() {
    return int4FromFloat(float4Input("4f000000"));
}
function evaluate1788() {
    return int4FromFloat(float4Input("cf000000"));
}
function evaluate1789() {
    return int4FromFloat(float4Input("cf000000"));
}
function evaluate1790() {
    return float4FromInteger(int8Input(null));
}
function evaluate1791() {
    return float4FromInteger(int8Input("0"));
}
function evaluate1792() {
    return float4FromInteger(int8Input("1"));
}
function evaluate1793() {
    return float4FromInteger(int8Input("-1"));
}
function evaluate1794() {
    return float4FromInteger(int8Input("-9223372036854775808"));
}
function evaluate1795() {
    return float4FromInteger(int8Input("9223372036854775807"));
}
function evaluate1796() {
    return float4FromInteger(int8Input("9007199254740993"));
}
function evaluate1797() {
    return float4FromInteger(int8Input("4611686293305294847"));
}
function evaluate1798() {
    return float4FromInteger(int8Input("-4611686293305294847"));
}
function evaluate1799() {
    return float4FromInteger(int8Input("4611686293305294848"));
}
function evaluate1800() {
    return float4FromInteger(int8Input("-4611686293305294848"));
}
function evaluate1801() {
    return float4FromInteger(int8Input("4611686293305294849"));
}
function evaluate1802() {
    return float4FromInteger(int8Input("-4611686293305294849"));
}
function evaluate1803() {
    return int8FromFloat(float4Input(null));
}
function evaluate1804() {
    return int8FromFloat(float4Input("00000000"));
}
function evaluate1805() {
    return int8FromFloat(float4Input("80000000"));
}
function evaluate1806() {
    return int8FromFloat(float4Input("3f000000"));
}
function evaluate1807() {
    return int8FromFloat(float4Input("bf000000"));
}
function evaluate1808() {
    return int8FromFloat(float4Input("3fc00000"));
}
function evaluate1809() {
    return int8FromFloat(float4Input("bfc00000"));
}
function evaluate1810() {
    return int8FromFloat(float4Input("40200000"));
}
function evaluate1811() {
    return int8FromFloat(float4Input("c0200000"));
}
function evaluate1812() {
    return int8FromFloat(float4Input("3fb33333"));
}
function evaluate1813() {
    return int8FromFloat(float4Input("bfb33333"));
}
function evaluate1814() {
    return int8FromFloat(float4Input("7fc00000"));
}
function evaluate1815() {
    return int8FromFloat(float4Input("7f800000"));
}
function evaluate1816() {
    return int8FromFloat(float4Input("ff800000"));
}
function evaluate1817() {
    return int8FromFloat(float4Input("df000000"));
}
function evaluate1818() {
    return int8FromFloat(float4Input("5f000000"));
}
function evaluate1819() {
    return int8FromFloat(float4Input("df000000"));
}
function evaluate1820() {
    return int8FromFloat(float4Input("5f000000"));
}
function evaluate1821() {
    return int8FromFloat(float4Input("5f000000"));
}
function evaluate1822() {
    return int8FromFloat(float4Input("df000000"));
}
function evaluate1823() {
    return float4Add(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate1824() {
    return float4Add(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate1825() {
    return float4Add(float4Input("40400000"), float4Input("40000000"));
}
function evaluate1826() {
    return float4Add(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate1827() {
    return float4Add(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate1828() {
    return float4Add(float4Input("00000000"), float4Input("00000000"));
}
function evaluate1829() {
    return float4Add(float4Input("80000000"), float4Input("00000000"));
}
function evaluate1830() {
    return float4Add(float4Input("00000000"), float4Input("80000000"));
}
function evaluate1831() {
    return float4Add(float4Input("80000000"), float4Input("80000000"));
}
function evaluate1832() {
    return float4Add(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate1833() {
    return float4Add(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate1834() {
    return float4Add(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate1835() {
    return float4Add(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate1836() {
    return float4Add(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate1837() {
    return float4Add(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate1838() {
    return float4Add(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate1839() {
    return float4Add(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate1840() {
    return float4Add(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate1841() {
    return float4Add(float4Input("00000001"), float4Input("40000000"));
}
function evaluate1842() {
    return float4Add(float4Input("00000001"), float4Input("00000001"));
}
function evaluate1843() {
    return float4Add(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate1844() {
    return float4Add(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate1845() {
    return float4Add(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate1846() {
    return float4Add(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate1847() {
    return float4Add(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate1848() {
    return float4Add(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate1849() {
    return float4Add(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate1850() {
    return float4Add(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate1851() {
    return float4Add(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate1852() {
    return float4Add(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate1853() {
    return float4Add(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate1854() {
    return float4Add(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate1855() {
    return float4Add(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate1856() {
    return float4Add(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate1857() {
    return float4Add(float4Input(null), float4Input("00000000"));
}
function evaluate1858() {
    return float4Add(float4Input("00000000"), float4Input(null));
}
function evaluate1859() {
    return float4Add(float4Input(null), float4Input(null));
}
function evaluate1860() {
    return float4Add(float4Input(null), float4Input("7f800000"));
}
function evaluate1861() {
    return float4Add(float4Input("7fc00000"), float4Input(null));
}
function evaluate1862() {
    return float4Sub(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate1863() {
    return float4Sub(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate1864() {
    return float4Sub(float4Input("40400000"), float4Input("40000000"));
}
function evaluate1865() {
    return float4Sub(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate1866() {
    return float4Sub(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate1867() {
    return float4Sub(float4Input("00000000"), float4Input("00000000"));
}
function evaluate1868() {
    return float4Sub(float4Input("80000000"), float4Input("00000000"));
}
function evaluate1869() {
    return float4Sub(float4Input("00000000"), float4Input("80000000"));
}
function evaluate1870() {
    return float4Sub(float4Input("80000000"), float4Input("80000000"));
}
function evaluate1871() {
    return float4Sub(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate1872() {
    return float4Sub(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate1873() {
    return float4Sub(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate1874() {
    return float4Sub(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate1875() {
    return float4Sub(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate1876() {
    return float4Sub(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate1877() {
    return float4Sub(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate1878() {
    return float4Sub(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate1879() {
    return float4Sub(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate1880() {
    return float4Sub(float4Input("00000001"), float4Input("40000000"));
}
function evaluate1881() {
    return float4Sub(float4Input("00000001"), float4Input("00000001"));
}
function evaluate1882() {
    return float4Sub(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate1883() {
    return float4Sub(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate1884() {
    return float4Sub(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate1885() {
    return float4Sub(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate1886() {
    return float4Sub(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate1887() {
    return float4Sub(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate1888() {
    return float4Sub(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate1889() {
    return float4Sub(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate1890() {
    return float4Sub(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate1891() {
    return float4Sub(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate1892() {
    return float4Sub(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate1893() {
    return float4Sub(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate1894() {
    return float4Sub(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate1895() {
    return float4Sub(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate1896() {
    return float4Sub(float4Input(null), float4Input("00000000"));
}
function evaluate1897() {
    return float4Sub(float4Input("00000000"), float4Input(null));
}
function evaluate1898() {
    return float4Sub(float4Input(null), float4Input(null));
}
function evaluate1899() {
    return float4Sub(float4Input(null), float4Input("7f800000"));
}
function evaluate1900() {
    return float4Sub(float4Input("7fc00000"), float4Input(null));
}
function evaluate1901() {
    return float4Mul(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate1902() {
    return float4Mul(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate1903() {
    return float4Mul(float4Input("40400000"), float4Input("40000000"));
}
function evaluate1904() {
    return float4Mul(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate1905() {
    return float4Mul(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate1906() {
    return float4Mul(float4Input("00000000"), float4Input("00000000"));
}
function evaluate1907() {
    return float4Mul(float4Input("80000000"), float4Input("00000000"));
}
function evaluate1908() {
    return float4Mul(float4Input("00000000"), float4Input("80000000"));
}
function evaluate1909() {
    return float4Mul(float4Input("80000000"), float4Input("80000000"));
}
function evaluate1910() {
    return float4Mul(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate1911() {
    return float4Mul(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate1912() {
    return float4Mul(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate1913() {
    return float4Mul(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate1914() {
    return float4Mul(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate1915() {
    return float4Mul(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate1916() {
    return float4Mul(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate1917() {
    return float4Mul(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate1918() {
    return float4Mul(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate1919() {
    return float4Mul(float4Input("00000001"), float4Input("40000000"));
}
function evaluate1920() {
    return float4Mul(float4Input("00000001"), float4Input("00000001"));
}
function evaluate1921() {
    return float4Mul(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate1922() {
    return float4Mul(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate1923() {
    return float4Mul(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate1924() {
    return float4Mul(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate1925() {
    return float4Mul(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate1926() {
    return float4Mul(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate1927() {
    return float4Mul(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate1928() {
    return float4Mul(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate1929() {
    return float4Mul(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate1930() {
    return float4Mul(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate1931() {
    return float4Mul(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate1932() {
    return float4Mul(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate1933() {
    return float4Mul(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate1934() {
    return float4Mul(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate1935() {
    return float4Mul(float4Input(null), float4Input("00000000"));
}
function evaluate1936() {
    return float4Mul(float4Input("00000000"), float4Input(null));
}
function evaluate1937() {
    return float4Mul(float4Input(null), float4Input(null));
}
function evaluate1938() {
    return float4Mul(float4Input(null), float4Input("7f800000"));
}
function evaluate1939() {
    return float4Mul(float4Input("7fc00000"), float4Input(null));
}
function evaluate1940() {
    return float4Div(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate1941() {
    return float4Div(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate1942() {
    return float4Div(float4Input("40400000"), float4Input("40000000"));
}
function evaluate1943() {
    return float4Div(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate1944() {
    return float4Div(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate1945() {
    return float4Div(float4Input("00000000"), float4Input("00000000"));
}
function evaluate1946() {
    return float4Div(float4Input("80000000"), float4Input("00000000"));
}
function evaluate1947() {
    return float4Div(float4Input("00000000"), float4Input("80000000"));
}
function evaluate1948() {
    return float4Div(float4Input("80000000"), float4Input("80000000"));
}
function evaluate1949() {
    return float4Div(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate1950() {
    return float4Div(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate1951() {
    return float4Div(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate1952() {
    return float4Div(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate1953() {
    return float4Div(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate1954() {
    return float4Div(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate1955() {
    return float4Div(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate1956() {
    return float4Div(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate1957() {
    return float4Div(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate1958() {
    return float4Div(float4Input("00000001"), float4Input("40000000"));
}
function evaluate1959() {
    return float4Div(float4Input("00000001"), float4Input("00000001"));
}
function evaluate1960() {
    return float4Div(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate1961() {
    return float4Div(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate1962() {
    return float4Div(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate1963() {
    return float4Div(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate1964() {
    return float4Div(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate1965() {
    return float4Div(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate1966() {
    return float4Div(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate1967() {
    return float4Div(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate1968() {
    return float4Div(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate1969() {
    return float4Div(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate1970() {
    return float4Div(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate1971() {
    return float4Div(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate1972() {
    return float4Div(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate1973() {
    return float4Div(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate1974() {
    return float4Div(float4Input(null), float4Input("00000000"));
}
function evaluate1975() {
    return float4Div(float4Input("00000000"), float4Input(null));
}
function evaluate1976() {
    return float4Div(float4Input(null), float4Input(null));
}
function evaluate1977() {
    return float4Div(float4Input(null), float4Input("7f800000"));
}
function evaluate1978() {
    return float4Div(float4Input("7fc00000"), float4Input(null));
}
function evaluate1979() {
    return floatEq(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate1980() {
    return floatEq(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate1981() {
    return floatEq(float4Input("40400000"), float4Input("40000000"));
}
function evaluate1982() {
    return floatEq(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate1983() {
    return floatEq(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate1984() {
    return floatEq(float4Input("00000000"), float4Input("00000000"));
}
function evaluate1985() {
    return floatEq(float4Input("80000000"), float4Input("00000000"));
}
function evaluate1986() {
    return floatEq(float4Input("00000000"), float4Input("80000000"));
}
function evaluate1987() {
    return floatEq(float4Input("80000000"), float4Input("80000000"));
}
function evaluate1988() {
    return floatEq(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate1989() {
    return floatEq(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate1990() {
    return floatEq(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate1991() {
    return floatEq(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate1992() {
    return floatEq(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate1993() {
    return floatEq(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate1994() {
    return floatEq(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate1995() {
    return floatEq(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate1996() {
    return floatEq(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate1997() {
    return floatEq(float4Input("00000001"), float4Input("40000000"));
}
function evaluate1998() {
    return floatEq(float4Input("00000001"), float4Input("00000001"));
}
function evaluate1999() {
    return floatEq(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate2000() {
    return floatEq(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate2001() {
    return floatEq(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate2002() {
    return floatEq(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate2003() {
    return floatEq(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate2004() {
    return floatEq(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate2005() {
    return floatEq(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate2006() {
    return floatEq(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate2007() {
    return floatEq(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate2008() {
    return floatEq(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate2009() {
    return floatEq(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate2010() {
    return floatEq(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate2011() {
    return floatEq(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate2012() {
    return floatEq(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate2013() {
    return floatEq(float4Input(null), float4Input("00000000"));
}
function evaluate2014() {
    return floatEq(float4Input("00000000"), float4Input(null));
}
function evaluate2015() {
    return floatEq(float4Input(null), float4Input(null));
}
function evaluate2016() {
    return floatEq(float4Input(null), float4Input("7f800000"));
}
function evaluate2017() {
    return floatEq(float4Input("7fc00000"), float4Input(null));
}
function evaluate2018() {
    return floatNe(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate2019() {
    return floatNe(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate2020() {
    return floatNe(float4Input("40400000"), float4Input("40000000"));
}
function evaluate2021() {
    return floatNe(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate2022() {
    return floatNe(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate2023() {
    return floatNe(float4Input("00000000"), float4Input("00000000"));
}
function evaluate2024() {
    return floatNe(float4Input("80000000"), float4Input("00000000"));
}
function evaluate2025() {
    return floatNe(float4Input("00000000"), float4Input("80000000"));
}
function evaluate2026() {
    return floatNe(float4Input("80000000"), float4Input("80000000"));
}
function evaluate2027() {
    return floatNe(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate2028() {
    return floatNe(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate2029() {
    return floatNe(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate2030() {
    return floatNe(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate2031() {
    return floatNe(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate2032() {
    return floatNe(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate2033() {
    return floatNe(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate2034() {
    return floatNe(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate2035() {
    return floatNe(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate2036() {
    return floatNe(float4Input("00000001"), float4Input("40000000"));
}
function evaluate2037() {
    return floatNe(float4Input("00000001"), float4Input("00000001"));
}
function evaluate2038() {
    return floatNe(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate2039() {
    return floatNe(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate2040() {
    return floatNe(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate2041() {
    return floatNe(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate2042() {
    return floatNe(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate2043() {
    return floatNe(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate2044() {
    return floatNe(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate2045() {
    return floatNe(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate2046() {
    return floatNe(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate2047() {
    return floatNe(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate2048() {
    return floatNe(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate2049() {
    return floatNe(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate2050() {
    return floatNe(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate2051() {
    return floatNe(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate2052() {
    return floatNe(float4Input(null), float4Input("00000000"));
}
function evaluate2053() {
    return floatNe(float4Input("00000000"), float4Input(null));
}
function evaluate2054() {
    return floatNe(float4Input(null), float4Input(null));
}
function evaluate2055() {
    return floatNe(float4Input(null), float4Input("7f800000"));
}
function evaluate2056() {
    return floatNe(float4Input("7fc00000"), float4Input(null));
}
function evaluate2057() {
    return floatLt(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate2058() {
    return floatLt(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate2059() {
    return floatLt(float4Input("40400000"), float4Input("40000000"));
}
function evaluate2060() {
    return floatLt(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate2061() {
    return floatLt(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate2062() {
    return floatLt(float4Input("00000000"), float4Input("00000000"));
}
function evaluate2063() {
    return floatLt(float4Input("80000000"), float4Input("00000000"));
}
function evaluate2064() {
    return floatLt(float4Input("00000000"), float4Input("80000000"));
}
function evaluate2065() {
    return floatLt(float4Input("80000000"), float4Input("80000000"));
}
function evaluate2066() {
    return floatLt(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate2067() {
    return floatLt(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate2068() {
    return floatLt(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate2069() {
    return floatLt(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate2070() {
    return floatLt(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate2071() {
    return floatLt(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate2072() {
    return floatLt(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate2073() {
    return floatLt(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate2074() {
    return floatLt(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate2075() {
    return floatLt(float4Input("00000001"), float4Input("40000000"));
}
function evaluate2076() {
    return floatLt(float4Input("00000001"), float4Input("00000001"));
}
function evaluate2077() {
    return floatLt(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate2078() {
    return floatLt(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate2079() {
    return floatLt(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate2080() {
    return floatLt(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate2081() {
    return floatLt(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate2082() {
    return floatLt(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate2083() {
    return floatLt(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate2084() {
    return floatLt(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate2085() {
    return floatLt(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate2086() {
    return floatLt(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate2087() {
    return floatLt(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate2088() {
    return floatLt(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate2089() {
    return floatLt(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate2090() {
    return floatLt(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate2091() {
    return floatLt(float4Input(null), float4Input("00000000"));
}
function evaluate2092() {
    return floatLt(float4Input("00000000"), float4Input(null));
}
function evaluate2093() {
    return floatLt(float4Input(null), float4Input(null));
}
function evaluate2094() {
    return floatLt(float4Input(null), float4Input("7f800000"));
}
function evaluate2095() {
    return floatLt(float4Input("7fc00000"), float4Input(null));
}
function evaluate2096() {
    return floatLe(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate2097() {
    return floatLe(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate2098() {
    return floatLe(float4Input("40400000"), float4Input("40000000"));
}
function evaluate2099() {
    return floatLe(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate2100() {
    return floatLe(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate2101() {
    return floatLe(float4Input("00000000"), float4Input("00000000"));
}
function evaluate2102() {
    return floatLe(float4Input("80000000"), float4Input("00000000"));
}
function evaluate2103() {
    return floatLe(float4Input("00000000"), float4Input("80000000"));
}
function evaluate2104() {
    return floatLe(float4Input("80000000"), float4Input("80000000"));
}
function evaluate2105() {
    return floatLe(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate2106() {
    return floatLe(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate2107() {
    return floatLe(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate2108() {
    return floatLe(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate2109() {
    return floatLe(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate2110() {
    return floatLe(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate2111() {
    return floatLe(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate2112() {
    return floatLe(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate2113() {
    return floatLe(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate2114() {
    return floatLe(float4Input("00000001"), float4Input("40000000"));
}
function evaluate2115() {
    return floatLe(float4Input("00000001"), float4Input("00000001"));
}
function evaluate2116() {
    return floatLe(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate2117() {
    return floatLe(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate2118() {
    return floatLe(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate2119() {
    return floatLe(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate2120() {
    return floatLe(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate2121() {
    return floatLe(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate2122() {
    return floatLe(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate2123() {
    return floatLe(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate2124() {
    return floatLe(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate2125() {
    return floatLe(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate2126() {
    return floatLe(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate2127() {
    return floatLe(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate2128() {
    return floatLe(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate2129() {
    return floatLe(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate2130() {
    return floatLe(float4Input(null), float4Input("00000000"));
}
function evaluate2131() {
    return floatLe(float4Input("00000000"), float4Input(null));
}
function evaluate2132() {
    return floatLe(float4Input(null), float4Input(null));
}
function evaluate2133() {
    return floatLe(float4Input(null), float4Input("7f800000"));
}
function evaluate2134() {
    return floatLe(float4Input("7fc00000"), float4Input(null));
}
function evaluate2135() {
    return floatGt(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate2136() {
    return floatGt(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate2137() {
    return floatGt(float4Input("40400000"), float4Input("40000000"));
}
function evaluate2138() {
    return floatGt(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate2139() {
    return floatGt(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate2140() {
    return floatGt(float4Input("00000000"), float4Input("00000000"));
}
function evaluate2141() {
    return floatGt(float4Input("80000000"), float4Input("00000000"));
}
function evaluate2142() {
    return floatGt(float4Input("00000000"), float4Input("80000000"));
}
function evaluate2143() {
    return floatGt(float4Input("80000000"), float4Input("80000000"));
}
function evaluate2144() {
    return floatGt(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate2145() {
    return floatGt(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate2146() {
    return floatGt(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate2147() {
    return floatGt(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate2148() {
    return floatGt(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate2149() {
    return floatGt(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate2150() {
    return floatGt(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate2151() {
    return floatGt(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate2152() {
    return floatGt(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate2153() {
    return floatGt(float4Input("00000001"), float4Input("40000000"));
}
function evaluate2154() {
    return floatGt(float4Input("00000001"), float4Input("00000001"));
}
function evaluate2155() {
    return floatGt(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate2156() {
    return floatGt(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate2157() {
    return floatGt(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate2158() {
    return floatGt(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate2159() {
    return floatGt(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate2160() {
    return floatGt(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate2161() {
    return floatGt(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate2162() {
    return floatGt(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate2163() {
    return floatGt(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate2164() {
    return floatGt(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate2165() {
    return floatGt(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate2166() {
    return floatGt(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate2167() {
    return floatGt(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate2168() {
    return floatGt(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate2169() {
    return floatGt(float4Input(null), float4Input("00000000"));
}
function evaluate2170() {
    return floatGt(float4Input("00000000"), float4Input(null));
}
function evaluate2171() {
    return floatGt(float4Input(null), float4Input(null));
}
function evaluate2172() {
    return floatGt(float4Input(null), float4Input("7f800000"));
}
function evaluate2173() {
    return floatGt(float4Input("7fc00000"), float4Input(null));
}
function evaluate2174() {
    return floatGe(float4Input("3f800000"), float4Input("40000000"));
}
function evaluate2175() {
    return floatGe(float4Input("3dcccccd"), float4Input("3dcccccd"));
}
function evaluate2176() {
    return floatGe(float4Input("40400000"), float4Input("40000000"));
}
function evaluate2177() {
    return floatGe(float4Input("c0400000"), float4Input("40000000"));
}
function evaluate2178() {
    return floatGe(float4Input("40400000"), float4Input("c0000000"));
}
function evaluate2179() {
    return floatGe(float4Input("00000000"), float4Input("00000000"));
}
function evaluate2180() {
    return floatGe(float4Input("80000000"), float4Input("00000000"));
}
function evaluate2181() {
    return floatGe(float4Input("00000000"), float4Input("80000000"));
}
function evaluate2182() {
    return floatGe(float4Input("80000000"), float4Input("80000000"));
}
function evaluate2183() {
    return floatGe(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate2184() {
    return floatGe(float4Input("00000000"), float4Input("3f800000"));
}
function evaluate2185() {
    return floatGe(float4Input("3f800000"), float4Input("80000000"));
}
function evaluate2186() {
    return floatGe(float4Input("7f7fffff"), float4Input("7f7fffff"));
}
function evaluate2187() {
    return floatGe(float4Input("ff7fffff"), float4Input("7f7fffff"));
}
function evaluate2188() {
    return floatGe(float4Input("7f7fffff"), float4Input("40000000"));
}
function evaluate2189() {
    return floatGe(float4Input("7f7fffff"), float4Input("00000001"));
}
function evaluate2190() {
    return floatGe(float4Input("00800000"), float4Input("3f000000"));
}
function evaluate2191() {
    return floatGe(float4Input("00000001"), float4Input("3f000000"));
}
function evaluate2192() {
    return floatGe(float4Input("00000001"), float4Input("40000000"));
}
function evaluate2193() {
    return floatGe(float4Input("00000001"), float4Input("00000001"));
}
function evaluate2194() {
    return floatGe(float4Input("7f800000"), float4Input("3f800000"));
}
function evaluate2195() {
    return floatGe(float4Input("ff800000"), float4Input("3f800000"));
}
function evaluate2196() {
    return floatGe(float4Input("3f800000"), float4Input("7f800000"));
}
function evaluate2197() {
    return floatGe(float4Input("3f800000"), float4Input("ff800000"));
}
function evaluate2198() {
    return floatGe(float4Input("7f800000"), float4Input("7f800000"));
}
function evaluate2199() {
    return floatGe(float4Input("7f800000"), float4Input("ff800000"));
}
function evaluate2200() {
    return floatGe(float4Input("7f800000"), float4Input("00000000"));
}
function evaluate2201() {
    return floatGe(float4Input("7fc00000"), float4Input("7fc00000"));
}
function evaluate2202() {
    return floatGe(float4Input("7fc00000"), float4Input("7f800000"));
}
function evaluate2203() {
    return floatGe(float4Input("7f800000"), float4Input("7fc00000"));
}
function evaluate2204() {
    return floatGe(float4Input("7fc00000"), float4Input("00000000"));
}
function evaluate2205() {
    return floatGe(float4Input("00000000"), float4Input("7fc00000"));
}
function evaluate2206() {
    return floatGe(float4Input("7fc00000"), float4Input("3f800000"));
}
function evaluate2207() {
    return floatGe(float4Input("3f800000"), float4Input("7fc00000"));
}
function evaluate2208() {
    return floatGe(float4Input(null), float4Input("00000000"));
}
function evaluate2209() {
    return floatGe(float4Input("00000000"), float4Input(null));
}
function evaluate2210() {
    return floatGe(float4Input(null), float4Input(null));
}
function evaluate2211() {
    return floatGe(float4Input(null), float4Input("7f800000"));
}
function evaluate2212() {
    return floatGe(float4Input("7fc00000"), float4Input(null));
}
function evaluate2213() {
    return floatEq(float4Input("4b800000"), float4Input("4b800000"));
}
function evaluate2214() {
    return floatEq(float4Input("5a000000"), float4Input("5a000000"));
}
function evaluate2215() {
    return floatEq(float4Input("ff800000"), float4Input("00000000"));
}
function evaluate2216() {
    return floatEq(float4Input("7fc00000"), float4Input("ff800000"));
}
function evaluate2217() {
    return floatNe(float4Input("4b800000"), float4Input("4b800000"));
}
function evaluate2218() {
    return floatNe(float4Input("5a000000"), float4Input("5a000000"));
}
function evaluate2219() {
    return floatNe(float4Input("ff800000"), float4Input("00000000"));
}
function evaluate2220() {
    return floatNe(float4Input("7fc00000"), float4Input("ff800000"));
}
function evaluate2221() {
    return floatLt(float4Input("4b800000"), float4Input("4b800000"));
}
function evaluate2222() {
    return floatLt(float4Input("5a000000"), float4Input("5a000000"));
}
function evaluate2223() {
    return floatLt(float4Input("ff800000"), float4Input("00000000"));
}
function evaluate2224() {
    return floatLt(float4Input("7fc00000"), float4Input("ff800000"));
}
function evaluate2225() {
    return floatLe(float4Input("4b800000"), float4Input("4b800000"));
}
function evaluate2226() {
    return floatLe(float4Input("5a000000"), float4Input("5a000000"));
}
function evaluate2227() {
    return floatLe(float4Input("ff800000"), float4Input("00000000"));
}
function evaluate2228() {
    return floatLe(float4Input("7fc00000"), float4Input("ff800000"));
}
function evaluate2229() {
    return floatGt(float4Input("4b800000"), float4Input("4b800000"));
}
function evaluate2230() {
    return floatGt(float4Input("5a000000"), float4Input("5a000000"));
}
function evaluate2231() {
    return floatGt(float4Input("ff800000"), float4Input("00000000"));
}
function evaluate2232() {
    return floatGt(float4Input("7fc00000"), float4Input("ff800000"));
}
function evaluate2233() {
    return floatGe(float4Input("4b800000"), float4Input("4b800000"));
}
function evaluate2234() {
    return floatGe(float4Input("5a000000"), float4Input("5a000000"));
}
function evaluate2235() {
    return floatGe(float4Input("ff800000"), float4Input("00000000"));
}
function evaluate2236() {
    return floatGe(float4Input("7fc00000"), float4Input("ff800000"));
}
function evaluate2237() {
    return float8Add(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2238() {
    return float8Add(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2239() {
    return float8Add(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2240() {
    return float8Add(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2241() {
    return float8Add(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2242() {
    return float8Add(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2243() {
    return float8Add(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2244() {
    return float8Add(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2245() {
    return float8Add(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2246() {
    return float8Add(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2247() {
    return float8Add(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2248() {
    return float8Add(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2249() {
    return float8Add(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2250() {
    return float8Add(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2251() {
    return float8Add(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2252() {
    return float8Add(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2253() {
    return float8Add(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2254() {
    return float8Add(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2255() {
    return float8Add(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2256() {
    return float8Add(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2257() {
    return float8Add(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2258() {
    return float8Add(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2259() {
    return float8Add(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2260() {
    return float8Add(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2261() {
    return float8Add(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2262() {
    return float8Add(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2263() {
    return float8Add(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2264() {
    return float8Add(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2265() {
    return float8Add(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2266() {
    return float8Add(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2267() {
    return float8Add(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2268() {
    return float8Add(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2269() {
    return float8Add(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2270() {
    return float8Add(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2271() {
    return float8Add(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2272() {
    return float8Add(float4Input("00000000"), float8Input(null));
}
function evaluate2273() {
    return float8Add(float4Input(null), float8Input(null));
}
function evaluate2274() {
    return float8Add(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2275() {
    return float8Add(float4Input("7fc00000"), float8Input(null));
}
function evaluate2276() {
    return float8Sub(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2277() {
    return float8Sub(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2278() {
    return float8Sub(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2279() {
    return float8Sub(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2280() {
    return float8Sub(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2281() {
    return float8Sub(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2282() {
    return float8Sub(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2283() {
    return float8Sub(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2284() {
    return float8Sub(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2285() {
    return float8Sub(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2286() {
    return float8Sub(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2287() {
    return float8Sub(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2288() {
    return float8Sub(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2289() {
    return float8Sub(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2290() {
    return float8Sub(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2291() {
    return float8Sub(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2292() {
    return float8Sub(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2293() {
    return float8Sub(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2294() {
    return float8Sub(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2295() {
    return float8Sub(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2296() {
    return float8Sub(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2297() {
    return float8Sub(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2298() {
    return float8Sub(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2299() {
    return float8Sub(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2300() {
    return float8Sub(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2301() {
    return float8Sub(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2302() {
    return float8Sub(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2303() {
    return float8Sub(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2304() {
    return float8Sub(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2305() {
    return float8Sub(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2306() {
    return float8Sub(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2307() {
    return float8Sub(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2308() {
    return float8Sub(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2309() {
    return float8Sub(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2310() {
    return float8Sub(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2311() {
    return float8Sub(float4Input("00000000"), float8Input(null));
}
function evaluate2312() {
    return float8Sub(float4Input(null), float8Input(null));
}
function evaluate2313() {
    return float8Sub(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2314() {
    return float8Sub(float4Input("7fc00000"), float8Input(null));
}
function evaluate2315() {
    return float8Mul(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2316() {
    return float8Mul(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2317() {
    return float8Mul(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2318() {
    return float8Mul(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2319() {
    return float8Mul(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2320() {
    return float8Mul(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2321() {
    return float8Mul(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2322() {
    return float8Mul(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2323() {
    return float8Mul(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2324() {
    return float8Mul(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2325() {
    return float8Mul(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2326() {
    return float8Mul(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2327() {
    return float8Mul(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2328() {
    return float8Mul(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2329() {
    return float8Mul(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2330() {
    return float8Mul(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2331() {
    return float8Mul(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2332() {
    return float8Mul(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2333() {
    return float8Mul(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2334() {
    return float8Mul(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2335() {
    return float8Mul(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2336() {
    return float8Mul(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2337() {
    return float8Mul(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2338() {
    return float8Mul(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2339() {
    return float8Mul(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2340() {
    return float8Mul(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2341() {
    return float8Mul(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2342() {
    return float8Mul(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2343() {
    return float8Mul(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2344() {
    return float8Mul(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2345() {
    return float8Mul(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2346() {
    return float8Mul(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2347() {
    return float8Mul(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2348() {
    return float8Mul(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2349() {
    return float8Mul(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2350() {
    return float8Mul(float4Input("00000000"), float8Input(null));
}
function evaluate2351() {
    return float8Mul(float4Input(null), float8Input(null));
}
function evaluate2352() {
    return float8Mul(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2353() {
    return float8Mul(float4Input("7fc00000"), float8Input(null));
}
function evaluate2354() {
    return float8Div(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2355() {
    return float8Div(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2356() {
    return float8Div(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2357() {
    return float8Div(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2358() {
    return float8Div(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2359() {
    return float8Div(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2360() {
    return float8Div(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2361() {
    return float8Div(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2362() {
    return float8Div(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2363() {
    return float8Div(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2364() {
    return float8Div(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2365() {
    return float8Div(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2366() {
    return float8Div(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2367() {
    return float8Div(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2368() {
    return float8Div(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2369() {
    return float8Div(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2370() {
    return float8Div(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2371() {
    return float8Div(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2372() {
    return float8Div(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2373() {
    return float8Div(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2374() {
    return float8Div(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2375() {
    return float8Div(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2376() {
    return float8Div(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2377() {
    return float8Div(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2378() {
    return float8Div(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2379() {
    return float8Div(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2380() {
    return float8Div(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2381() {
    return float8Div(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2382() {
    return float8Div(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2383() {
    return float8Div(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2384() {
    return float8Div(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2385() {
    return float8Div(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2386() {
    return float8Div(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2387() {
    return float8Div(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2388() {
    return float8Div(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2389() {
    return float8Div(float4Input("00000000"), float8Input(null));
}
function evaluate2390() {
    return float8Div(float4Input(null), float8Input(null));
}
function evaluate2391() {
    return float8Div(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2392() {
    return float8Div(float4Input("7fc00000"), float8Input(null));
}
function evaluate2393() {
    return floatEq(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2394() {
    return floatEq(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2395() {
    return floatEq(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2396() {
    return floatEq(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2397() {
    return floatEq(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2398() {
    return floatEq(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2399() {
    return floatEq(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2400() {
    return floatEq(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2401() {
    return floatEq(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2402() {
    return floatEq(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2403() {
    return floatEq(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2404() {
    return floatEq(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2405() {
    return floatEq(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2406() {
    return floatEq(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2407() {
    return floatEq(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2408() {
    return floatEq(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2409() {
    return floatEq(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2410() {
    return floatEq(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2411() {
    return floatEq(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2412() {
    return floatEq(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2413() {
    return floatEq(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2414() {
    return floatEq(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2415() {
    return floatEq(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2416() {
    return floatEq(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2417() {
    return floatEq(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2418() {
    return floatEq(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2419() {
    return floatEq(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2420() {
    return floatEq(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2421() {
    return floatEq(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2422() {
    return floatEq(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2423() {
    return floatEq(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2424() {
    return floatEq(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2425() {
    return floatEq(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2426() {
    return floatEq(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2427() {
    return floatEq(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2428() {
    return floatEq(float4Input("00000000"), float8Input(null));
}
function evaluate2429() {
    return floatEq(float4Input(null), float8Input(null));
}
function evaluate2430() {
    return floatEq(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2431() {
    return floatEq(float4Input("7fc00000"), float8Input(null));
}
function evaluate2432() {
    return floatNe(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2433() {
    return floatNe(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2434() {
    return floatNe(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2435() {
    return floatNe(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2436() {
    return floatNe(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2437() {
    return floatNe(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2438() {
    return floatNe(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2439() {
    return floatNe(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2440() {
    return floatNe(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2441() {
    return floatNe(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2442() {
    return floatNe(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2443() {
    return floatNe(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2444() {
    return floatNe(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2445() {
    return floatNe(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2446() {
    return floatNe(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2447() {
    return floatNe(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2448() {
    return floatNe(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2449() {
    return floatNe(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2450() {
    return floatNe(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2451() {
    return floatNe(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2452() {
    return floatNe(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2453() {
    return floatNe(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2454() {
    return floatNe(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2455() {
    return floatNe(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2456() {
    return floatNe(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2457() {
    return floatNe(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2458() {
    return floatNe(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2459() {
    return floatNe(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2460() {
    return floatNe(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2461() {
    return floatNe(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2462() {
    return floatNe(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2463() {
    return floatNe(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2464() {
    return floatNe(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2465() {
    return floatNe(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2466() {
    return floatNe(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2467() {
    return floatNe(float4Input("00000000"), float8Input(null));
}
function evaluate2468() {
    return floatNe(float4Input(null), float8Input(null));
}
function evaluate2469() {
    return floatNe(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2470() {
    return floatNe(float4Input("7fc00000"), float8Input(null));
}
function evaluate2471() {
    return floatLt(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2472() {
    return floatLt(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2473() {
    return floatLt(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2474() {
    return floatLt(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2475() {
    return floatLt(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2476() {
    return floatLt(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2477() {
    return floatLt(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2478() {
    return floatLt(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2479() {
    return floatLt(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2480() {
    return floatLt(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2481() {
    return floatLt(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2482() {
    return floatLt(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2483() {
    return floatLt(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2484() {
    return floatLt(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2485() {
    return floatLt(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2486() {
    return floatLt(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2487() {
    return floatLt(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2488() {
    return floatLt(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2489() {
    return floatLt(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2490() {
    return floatLt(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2491() {
    return floatLt(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2492() {
    return floatLt(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2493() {
    return floatLt(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2494() {
    return floatLt(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2495() {
    return floatLt(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2496() {
    return floatLt(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2497() {
    return floatLt(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2498() {
    return floatLt(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2499() {
    return floatLt(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2500() {
    return floatLt(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2501() {
    return floatLt(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2502() {
    return floatLt(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2503() {
    return floatLt(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2504() {
    return floatLt(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2505() {
    return floatLt(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2506() {
    return floatLt(float4Input("00000000"), float8Input(null));
}
function evaluate2507() {
    return floatLt(float4Input(null), float8Input(null));
}
function evaluate2508() {
    return floatLt(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2509() {
    return floatLt(float4Input("7fc00000"), float8Input(null));
}
function evaluate2510() {
    return floatLe(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2511() {
    return floatLe(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2512() {
    return floatLe(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2513() {
    return floatLe(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2514() {
    return floatLe(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2515() {
    return floatLe(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2516() {
    return floatLe(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2517() {
    return floatLe(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2518() {
    return floatLe(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2519() {
    return floatLe(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2520() {
    return floatLe(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2521() {
    return floatLe(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2522() {
    return floatLe(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2523() {
    return floatLe(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2524() {
    return floatLe(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2525() {
    return floatLe(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2526() {
    return floatLe(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2527() {
    return floatLe(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2528() {
    return floatLe(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2529() {
    return floatLe(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2530() {
    return floatLe(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2531() {
    return floatLe(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2532() {
    return floatLe(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2533() {
    return floatLe(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2534() {
    return floatLe(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2535() {
    return floatLe(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2536() {
    return floatLe(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2537() {
    return floatLe(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2538() {
    return floatLe(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2539() {
    return floatLe(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2540() {
    return floatLe(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2541() {
    return floatLe(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2542() {
    return floatLe(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2543() {
    return floatLe(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2544() {
    return floatLe(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2545() {
    return floatLe(float4Input("00000000"), float8Input(null));
}
function evaluate2546() {
    return floatLe(float4Input(null), float8Input(null));
}
function evaluate2547() {
    return floatLe(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2548() {
    return floatLe(float4Input("7fc00000"), float8Input(null));
}
function evaluate2549() {
    return floatGt(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2550() {
    return floatGt(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2551() {
    return floatGt(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2552() {
    return floatGt(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2553() {
    return floatGt(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2554() {
    return floatGt(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2555() {
    return floatGt(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2556() {
    return floatGt(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2557() {
    return floatGt(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2558() {
    return floatGt(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2559() {
    return floatGt(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2560() {
    return floatGt(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2561() {
    return floatGt(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2562() {
    return floatGt(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2563() {
    return floatGt(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2564() {
    return floatGt(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2565() {
    return floatGt(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2566() {
    return floatGt(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2567() {
    return floatGt(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2568() {
    return floatGt(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2569() {
    return floatGt(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2570() {
    return floatGt(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2571() {
    return floatGt(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2572() {
    return floatGt(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2573() {
    return floatGt(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2574() {
    return floatGt(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2575() {
    return floatGt(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2576() {
    return floatGt(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2577() {
    return floatGt(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2578() {
    return floatGt(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2579() {
    return floatGt(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2580() {
    return floatGt(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2581() {
    return floatGt(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2582() {
    return floatGt(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2583() {
    return floatGt(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2584() {
    return floatGt(float4Input("00000000"), float8Input(null));
}
function evaluate2585() {
    return floatGt(float4Input(null), float8Input(null));
}
function evaluate2586() {
    return floatGt(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2587() {
    return floatGt(float4Input("7fc00000"), float8Input(null));
}
function evaluate2588() {
    return floatGe(float4Input("3f800000"), float8Input("4000000000000000"));
}
function evaluate2589() {
    return floatGe(float4Input("3dcccccd"), float8Input("3fb999999999999a"));
}
function evaluate2590() {
    return floatGe(float4Input("40400000"), float8Input("4000000000000000"));
}
function evaluate2591() {
    return floatGe(float4Input("c0400000"), float8Input("4000000000000000"));
}
function evaluate2592() {
    return floatGe(float4Input("40400000"), float8Input("c000000000000000"));
}
function evaluate2593() {
    return floatGe(float4Input("00000000"), float8Input("0000000000000000"));
}
function evaluate2594() {
    return floatGe(float4Input("80000000"), float8Input("0000000000000000"));
}
function evaluate2595() {
    return floatGe(float4Input("00000000"), float8Input("8000000000000000"));
}
function evaluate2596() {
    return floatGe(float4Input("80000000"), float8Input("8000000000000000"));
}
function evaluate2597() {
    return floatGe(float4Input("3f800000"), float8Input("0000000000000000"));
}
function evaluate2598() {
    return floatGe(float4Input("00000000"), float8Input("3ff0000000000000"));
}
function evaluate2599() {
    return floatGe(float4Input("3f800000"), float8Input("8000000000000000"));
}
function evaluate2600() {
    return floatGe(float4Input("7f7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2601() {
    return floatGe(float4Input("ff7fffff"), float8Input("7fefffffffffffff"));
}
function evaluate2602() {
    return floatGe(float4Input("7f7fffff"), float8Input("4000000000000000"));
}
function evaluate2603() {
    return floatGe(float4Input("7f7fffff"), float8Input("0000000000000001"));
}
function evaluate2604() {
    return floatGe(float4Input("00800000"), float8Input("3fe0000000000000"));
}
function evaluate2605() {
    return floatGe(float4Input("00000001"), float8Input("3fe0000000000000"));
}
function evaluate2606() {
    return floatGe(float4Input("00000001"), float8Input("4000000000000000"));
}
function evaluate2607() {
    return floatGe(float4Input("00000001"), float8Input("0000000000000001"));
}
function evaluate2608() {
    return floatGe(float4Input("7f800000"), float8Input("3ff0000000000000"));
}
function evaluate2609() {
    return floatGe(float4Input("ff800000"), float8Input("3ff0000000000000"));
}
function evaluate2610() {
    return floatGe(float4Input("3f800000"), float8Input("7ff0000000000000"));
}
function evaluate2611() {
    return floatGe(float4Input("3f800000"), float8Input("fff0000000000000"));
}
function evaluate2612() {
    return floatGe(float4Input("7f800000"), float8Input("7ff0000000000000"));
}
function evaluate2613() {
    return floatGe(float4Input("7f800000"), float8Input("fff0000000000000"));
}
function evaluate2614() {
    return floatGe(float4Input("7f800000"), float8Input("0000000000000000"));
}
function evaluate2615() {
    return floatGe(float4Input("7fc00000"), float8Input("7ff8000000000000"));
}
function evaluate2616() {
    return floatGe(float4Input("7fc00000"), float8Input("7ff0000000000000"));
}
function evaluate2617() {
    return floatGe(float4Input("7f800000"), float8Input("7ff8000000000000"));
}
function evaluate2618() {
    return floatGe(float4Input("7fc00000"), float8Input("0000000000000000"));
}
function evaluate2619() {
    return floatGe(float4Input("00000000"), float8Input("7ff8000000000000"));
}
function evaluate2620() {
    return floatGe(float4Input("7fc00000"), float8Input("3ff0000000000000"));
}
function evaluate2621() {
    return floatGe(float4Input("3f800000"), float8Input("7ff8000000000000"));
}
function evaluate2622() {
    return floatGe(float4Input(null), float8Input("0000000000000000"));
}
function evaluate2623() {
    return floatGe(float4Input("00000000"), float8Input(null));
}
function evaluate2624() {
    return floatGe(float4Input(null), float8Input(null));
}
function evaluate2625() {
    return floatGe(float4Input(null), float8Input("7ff0000000000000"));
}
function evaluate2626() {
    return floatGe(float4Input("7fc00000"), float8Input(null));
}
function evaluate2627() {
    return floatEq(float4Input("4b800000"), float8Input("4170000010000000"));
}
function evaluate2628() {
    return floatEq(float4Input("5a000000"), float8Input("4340000000000001"));
}
function evaluate2629() {
    return floatEq(float4Input("ff800000"), float8Input("0000000000000000"));
}
function evaluate2630() {
    return floatEq(float4Input("7fc00000"), float8Input("fff0000000000000"));
}
function evaluate2631() {
    return floatNe(float4Input("4b800000"), float8Input("4170000010000000"));
}
function evaluate2632() {
    return floatNe(float4Input("5a000000"), float8Input("4340000000000001"));
}
function evaluate2633() {
    return floatNe(float4Input("ff800000"), float8Input("0000000000000000"));
}
function evaluate2634() {
    return floatNe(float4Input("7fc00000"), float8Input("fff0000000000000"));
}
function evaluate2635() {
    return floatLt(float4Input("4b800000"), float8Input("4170000010000000"));
}
function evaluate2636() {
    return floatLt(float4Input("5a000000"), float8Input("4340000000000001"));
}
function evaluate2637() {
    return floatLt(float4Input("ff800000"), float8Input("0000000000000000"));
}
function evaluate2638() {
    return floatLt(float4Input("7fc00000"), float8Input("fff0000000000000"));
}
function evaluate2639() {
    return floatLe(float4Input("4b800000"), float8Input("4170000010000000"));
}
function evaluate2640() {
    return floatLe(float4Input("5a000000"), float8Input("4340000000000001"));
}
function evaluate2641() {
    return floatLe(float4Input("ff800000"), float8Input("0000000000000000"));
}
function evaluate2642() {
    return floatLe(float4Input("7fc00000"), float8Input("fff0000000000000"));
}
function evaluate2643() {
    return floatGt(float4Input("4b800000"), float8Input("4170000010000000"));
}
function evaluate2644() {
    return floatGt(float4Input("5a000000"), float8Input("4340000000000001"));
}
function evaluate2645() {
    return floatGt(float4Input("ff800000"), float8Input("0000000000000000"));
}
function evaluate2646() {
    return floatGt(float4Input("7fc00000"), float8Input("fff0000000000000"));
}
function evaluate2647() {
    return floatGe(float4Input("4b800000"), float8Input("4170000010000000"));
}
function evaluate2648() {
    return floatGe(float4Input("5a000000"), float8Input("4340000000000001"));
}
function evaluate2649() {
    return floatGe(float4Input("ff800000"), float8Input("0000000000000000"));
}
function evaluate2650() {
    return floatGe(float4Input("7fc00000"), float8Input("fff0000000000000"));
}
function evaluate2651() {
    return float8Input(null);
}
function evaluate2652() {
    return float8Input("0000000000000000");
}
function evaluate2653() {
    return float8Input("8000000000000000");
}
function evaluate2654() {
    return float8Input("3ff0000000000000");
}
function evaluate2655() {
    return float8Input("bff0000000000000");
}
function evaluate2656() {
    return float8Input("4000000000000000");
}
function evaluate2657() {
    return float8Input("4008000000000000");
}
function evaluate2658() {
    return float8Input("3fe0000000000000");
}
function evaluate2659() {
    return float8Input("3fb999999999999a");
}
function evaluate2660() {
    return float8Input("7fefffffffffffff");
}
function evaluate2661() {
    return float8Input("ffefffffffffffff");
}
function evaluate2662() {
    return float8Input("0010000000000000");
}
function evaluate2663() {
    return float8Input("0000000000000001");
}
function evaluate2664() {
    return float8Input("8000000000000001");
}
function evaluate2665() {
    return float8Input("7ff8000000000000");
}
function evaluate2666() {
    return float8Input("7ff0000000000000");
}
function evaluate2667() {
    return float8Input("fff0000000000000");
}
function evaluate2668() {
    return float8Neg(float8Input(null));
}
function evaluate2669() {
    return float8Neg(float8Input("0000000000000000"));
}
function evaluate2670() {
    return float8Neg(float8Input("8000000000000000"));
}
function evaluate2671() {
    return float8Neg(float8Input("3ff0000000000000"));
}
function evaluate2672() {
    return float8Neg(float8Input("bff0000000000000"));
}
function evaluate2673() {
    return float8Neg(float8Input("4000000000000000"));
}
function evaluate2674() {
    return float8Neg(float8Input("4008000000000000"));
}
function evaluate2675() {
    return float8Neg(float8Input("3fe0000000000000"));
}
function evaluate2676() {
    return float8Neg(float8Input("3fb999999999999a"));
}
function evaluate2677() {
    return float8Neg(float8Input("7fefffffffffffff"));
}
function evaluate2678() {
    return float8Neg(float8Input("ffefffffffffffff"));
}
function evaluate2679() {
    return float8Neg(float8Input("0010000000000000"));
}
function evaluate2680() {
    return float8Neg(float8Input("0000000000000001"));
}
function evaluate2681() {
    return float8Neg(float8Input("8000000000000001"));
}
function evaluate2682() {
    return float8Neg(float8Input("7ff8000000000000"));
}
function evaluate2683() {
    return float8Neg(float8Input("7ff0000000000000"));
}
function evaluate2684() {
    return float8Neg(float8Input("fff0000000000000"));
}
function evaluate2685() {
    return float8Identity(float8Input(null));
}
function evaluate2686() {
    return float8Identity(float8Input("0000000000000000"));
}
function evaluate2687() {
    return float8Identity(float8Input("8000000000000000"));
}
function evaluate2688() {
    return float8Identity(float8Input("3ff0000000000000"));
}
function evaluate2689() {
    return float8Identity(float8Input("bff0000000000000"));
}
function evaluate2690() {
    return float8Identity(float8Input("4000000000000000"));
}
function evaluate2691() {
    return float8Identity(float8Input("4008000000000000"));
}
function evaluate2692() {
    return float8Identity(float8Input("3fe0000000000000"));
}
function evaluate2693() {
    return float8Identity(float8Input("3fb999999999999a"));
}
function evaluate2694() {
    return float8Identity(float8Input("7fefffffffffffff"));
}
function evaluate2695() {
    return float8Identity(float8Input("ffefffffffffffff"));
}
function evaluate2696() {
    return float8Identity(float8Input("0010000000000000"));
}
function evaluate2697() {
    return float8Identity(float8Input("0000000000000001"));
}
function evaluate2698() {
    return float8Identity(float8Input("8000000000000001"));
}
function evaluate2699() {
    return float8Identity(float8Input("7ff8000000000000"));
}
function evaluate2700() {
    return float8Identity(float8Input("7ff0000000000000"));
}
function evaluate2701() {
    return float8Identity(float8Input("fff0000000000000"));
}
function evaluate2702() {
    return float8Abs(float8Input(null));
}
function evaluate2703() {
    return float8Abs(float8Input("0000000000000000"));
}
function evaluate2704() {
    return float8Abs(float8Input("8000000000000000"));
}
function evaluate2705() {
    return float8Abs(float8Input("3ff0000000000000"));
}
function evaluate2706() {
    return float8Abs(float8Input("bff0000000000000"));
}
function evaluate2707() {
    return float8Abs(float8Input("4000000000000000"));
}
function evaluate2708() {
    return float8Abs(float8Input("4008000000000000"));
}
function evaluate2709() {
    return float8Abs(float8Input("3fe0000000000000"));
}
function evaluate2710() {
    return float8Abs(float8Input("3fb999999999999a"));
}
function evaluate2711() {
    return float8Abs(float8Input("7fefffffffffffff"));
}
function evaluate2712() {
    return float8Abs(float8Input("ffefffffffffffff"));
}
function evaluate2713() {
    return float8Abs(float8Input("0010000000000000"));
}
function evaluate2714() {
    return float8Abs(float8Input("0000000000000001"));
}
function evaluate2715() {
    return float8Abs(float8Input("8000000000000001"));
}
function evaluate2716() {
    return float8Abs(float8Input("7ff8000000000000"));
}
function evaluate2717() {
    return float8Abs(float8Input("7ff0000000000000"));
}
function evaluate2718() {
    return float8Abs(float8Input("fff0000000000000"));
}
function evaluate2719() {
    return float8Abs(float8Input(null));
}
function evaluate2720() {
    return float8Abs(float8Input("0000000000000000"));
}
function evaluate2721() {
    return float8Abs(float8Input("8000000000000000"));
}
function evaluate2722() {
    return float8Abs(float8Input("3ff0000000000000"));
}
function evaluate2723() {
    return float8Abs(float8Input("bff0000000000000"));
}
function evaluate2724() {
    return float8Abs(float8Input("4000000000000000"));
}
function evaluate2725() {
    return float8Abs(float8Input("4008000000000000"));
}
function evaluate2726() {
    return float8Abs(float8Input("3fe0000000000000"));
}
function evaluate2727() {
    return float8Abs(float8Input("3fb999999999999a"));
}
function evaluate2728() {
    return float8Abs(float8Input("7fefffffffffffff"));
}
function evaluate2729() {
    return float8Abs(float8Input("ffefffffffffffff"));
}
function evaluate2730() {
    return float8Abs(float8Input("0010000000000000"));
}
function evaluate2731() {
    return float8Abs(float8Input("0000000000000001"));
}
function evaluate2732() {
    return float8Abs(float8Input("8000000000000001"));
}
function evaluate2733() {
    return float8Abs(float8Input("7ff8000000000000"));
}
function evaluate2734() {
    return float8Abs(float8Input("7ff0000000000000"));
}
function evaluate2735() {
    return float8Abs(float8Input("fff0000000000000"));
}
function evaluate2736() {
    return float8Input(null);
}
function evaluate2737() {
    return float8Input("0000000000000000");
}
function evaluate2738() {
    return float8Input("8000000000000000");
}
function evaluate2739() {
    return float8Input("3ff0000000000000");
}
function evaluate2740() {
    return float8Input("bff0000000000000");
}
function evaluate2741() {
    return float8Input("4000000000000000");
}
function evaluate2742() {
    return float8Input("4008000000000000");
}
function evaluate2743() {
    return float8Input("3fe0000000000000");
}
function evaluate2744() {
    return float8Input("3fb999999999999a");
}
function evaluate2745() {
    return float8Input("7fefffffffffffff");
}
function evaluate2746() {
    return float8Input("ffefffffffffffff");
}
function evaluate2747() {
    return float8Input("0010000000000000");
}
function evaluate2748() {
    return float8Input("0000000000000001");
}
function evaluate2749() {
    return float8Input("8000000000000001");
}
function evaluate2750() {
    return float8Input("7ff8000000000000");
}
function evaluate2751() {
    return float8Input("7ff0000000000000");
}
function evaluate2752() {
    return float8Input("fff0000000000000");
}
function evaluate2753() {
    return float4FromFloat8(float8Input(null));
}
function evaluate2754() {
    return float4FromFloat8(float8Input("0000000000000000"));
}
function evaluate2755() {
    return float4FromFloat8(float8Input("8000000000000000"));
}
function evaluate2756() {
    return float4FromFloat8(float8Input("3ff0000000000000"));
}
function evaluate2757() {
    return float4FromFloat8(float8Input("bff0000000000000"));
}
function evaluate2758() {
    return float4FromFloat8(float8Input("4000000000000000"));
}
function evaluate2759() {
    return float4FromFloat8(float8Input("4008000000000000"));
}
function evaluate2760() {
    return float4FromFloat8(float8Input("3fe0000000000000"));
}
function evaluate2761() {
    return float4FromFloat8(float8Input("3fb999999999999a"));
}
function evaluate2762() {
    return float4FromFloat8(float8Input("7fefffffffffffff"));
}
function evaluate2763() {
    return float4FromFloat8(float8Input("ffefffffffffffff"));
}
function evaluate2764() {
    return float4FromFloat8(float8Input("0010000000000000"));
}
function evaluate2765() {
    return float4FromFloat8(float8Input("0000000000000001"));
}
function evaluate2766() {
    return float4FromFloat8(float8Input("8000000000000001"));
}
function evaluate2767() {
    return float4FromFloat8(float8Input("7ff8000000000000"));
}
function evaluate2768() {
    return float4FromFloat8(float8Input("7ff0000000000000"));
}
function evaluate2769() {
    return float4FromFloat8(float8Input("fff0000000000000"));
}
function evaluate2770() {
    return float4FromFloat8(float8Input("48078287f49c4a1d"));
}
function evaluate2771() {
    return float4FromFloat8(float8Input("c8078287f49c4a1d"));
}
function evaluate2772() {
    return float4FromFloat8(float8Input("366244ce242c5561"));
}
function evaluate2773() {
    return float4FromFloat8(float8Input("b66244ce242c5561"));
}
function evaluate2774() {
    return float4FromFloat8(float8Input("4170000010000000"));
}
function evaluate2775() {
    return float4FromFloat8(float8Input("4170000030000000"));
}
function evaluate2776() {
    return float4FromFloat8(float8Input("3690000000000000"));
}
function evaluate2777() {
    return float4FromFloat8(float8Input("36a8000000000000"));
}
function evaluate2778() {
    return float8FromInteger(int2Input(null));
}
function evaluate2779() {
    return float8FromInteger(int2Input("0"));
}
function evaluate2780() {
    return float8FromInteger(int2Input("1"));
}
function evaluate2781() {
    return float8FromInteger(int2Input("-1"));
}
function evaluate2782() {
    return float8FromInteger(int2Input("-32768"));
}
function evaluate2783() {
    return float8FromInteger(int2Input("32767"));
}
function evaluate2784() {
    return int2FromFloat(float8Input(null));
}
function evaluate2785() {
    return int2FromFloat(float8Input("0000000000000000"));
}
function evaluate2786() {
    return int2FromFloat(float8Input("8000000000000000"));
}
function evaluate2787() {
    return int2FromFloat(float8Input("3fe0000000000000"));
}
function evaluate2788() {
    return int2FromFloat(float8Input("bfe0000000000000"));
}
function evaluate2789() {
    return int2FromFloat(float8Input("3ff8000000000000"));
}
function evaluate2790() {
    return int2FromFloat(float8Input("bff8000000000000"));
}
function evaluate2791() {
    return int2FromFloat(float8Input("4004000000000000"));
}
function evaluate2792() {
    return int2FromFloat(float8Input("c004000000000000"));
}
function evaluate2793() {
    return int2FromFloat(float8Input("3ff6666666666666"));
}
function evaluate2794() {
    return int2FromFloat(float8Input("bff6666666666666"));
}
function evaluate2795() {
    return int2FromFloat(float8Input("7ff8000000000000"));
}
function evaluate2796() {
    return int2FromFloat(float8Input("7ff0000000000000"));
}
function evaluate2797() {
    return int2FromFloat(float8Input("fff0000000000000"));
}
function evaluate2798() {
    return int2FromFloat(float8Input("c0e0000000000000"));
}
function evaluate2799() {
    return int2FromFloat(float8Input("40dfffc000000000"));
}
function evaluate2800() {
    return int2FromFloat(float8Input("c0e0002000000000"));
}
function evaluate2801() {
    return int2FromFloat(float8Input("40e0000000000000"));
}
function evaluate2802() {
    return int2FromFloat(float8Input("40dfffa000000000"));
}
function evaluate2803() {
    return int2FromFloat(float8Input("40dfffd99999999a"));
}
function evaluate2804() {
    return int2FromFloat(float8Input("40dfffe000000000"));
}
function evaluate2805() {
    return int2FromFloat(float8Input("c0e0001000000000"));
}
function evaluate2806() {
    return int2FromFloat(float8Input("c0e0001333333333"));
}
function evaluate2807() {
    return float8FromInteger(int4Input(null));
}
function evaluate2808() {
    return float8FromInteger(int4Input("0"));
}
function evaluate2809() {
    return float8FromInteger(int4Input("1"));
}
function evaluate2810() {
    return float8FromInteger(int4Input("-1"));
}
function evaluate2811() {
    return float8FromInteger(int4Input("-2147483648"));
}
function evaluate2812() {
    return float8FromInteger(int4Input("2147483647"));
}
function evaluate2813() {
    return float8FromInteger(int4Input("16777217"));
}
function evaluate2814() {
    return float8FromInteger(int4Input("-16777217"));
}
function evaluate2815() {
    return float8FromInteger(int4Input("16777219"));
}
function evaluate2816() {
    return int4FromFloat(float8Input(null));
}
function evaluate2817() {
    return int4FromFloat(float8Input("0000000000000000"));
}
function evaluate2818() {
    return int4FromFloat(float8Input("8000000000000000"));
}
function evaluate2819() {
    return int4FromFloat(float8Input("3fe0000000000000"));
}
function evaluate2820() {
    return int4FromFloat(float8Input("bfe0000000000000"));
}
function evaluate2821() {
    return int4FromFloat(float8Input("3ff8000000000000"));
}
function evaluate2822() {
    return int4FromFloat(float8Input("bff8000000000000"));
}
function evaluate2823() {
    return int4FromFloat(float8Input("4004000000000000"));
}
function evaluate2824() {
    return int4FromFloat(float8Input("c004000000000000"));
}
function evaluate2825() {
    return int4FromFloat(float8Input("3ff6666666666666"));
}
function evaluate2826() {
    return int4FromFloat(float8Input("bff6666666666666"));
}
function evaluate2827() {
    return int4FromFloat(float8Input("7ff8000000000000"));
}
function evaluate2828() {
    return int4FromFloat(float8Input("7ff0000000000000"));
}
function evaluate2829() {
    return int4FromFloat(float8Input("fff0000000000000"));
}
function evaluate2830() {
    return int4FromFloat(float8Input("c1e0000000000000"));
}
function evaluate2831() {
    return int4FromFloat(float8Input("41dfffffffc00000"));
}
function evaluate2832() {
    return int4FromFloat(float8Input("c1e0000000200000"));
}
function evaluate2833() {
    return int4FromFloat(float8Input("41e0000000000000"));
}
function evaluate2834() {
    return int4FromFloat(float8Input("41dfffffffa00000"));
}
function evaluate2835() {
    return int4FromFloat(float8Input("41dfffffffd9999a"));
}
function evaluate2836() {
    return int4FromFloat(float8Input("41dfffffffe00000"));
}
function evaluate2837() {
    return int4FromFloat(float8Input("c1e0000000100000"));
}
function evaluate2838() {
    return int4FromFloat(float8Input("c1e0000000133333"));
}
function evaluate2839() {
    return float8FromInteger(int8Input(null));
}
function evaluate2840() {
    return float8FromInteger(int8Input("0"));
}
function evaluate2841() {
    return float8FromInteger(int8Input("1"));
}
function evaluate2842() {
    return float8FromInteger(int8Input("-1"));
}
function evaluate2843() {
    return float8FromInteger(int8Input("-9223372036854775808"));
}
function evaluate2844() {
    return float8FromInteger(int8Input("9223372036854775807"));
}
function evaluate2845() {
    return float8FromInteger(int8Input("9007199254740993"));
}
function evaluate2846() {
    return float8FromInteger(int8Input("4611686293305294847"));
}
function evaluate2847() {
    return float8FromInteger(int8Input("-4611686293305294847"));
}
function evaluate2848() {
    return float8FromInteger(int8Input("4611686293305294848"));
}
function evaluate2849() {
    return float8FromInteger(int8Input("-4611686293305294848"));
}
function evaluate2850() {
    return float8FromInteger(int8Input("4611686293305294849"));
}
function evaluate2851() {
    return float8FromInteger(int8Input("-4611686293305294849"));
}
function evaluate2852() {
    return int8FromFloat(float8Input(null));
}
function evaluate2853() {
    return int8FromFloat(float8Input("0000000000000000"));
}
function evaluate2854() {
    return int8FromFloat(float8Input("8000000000000000"));
}
function evaluate2855() {
    return int8FromFloat(float8Input("3fe0000000000000"));
}
function evaluate2856() {
    return int8FromFloat(float8Input("bfe0000000000000"));
}
function evaluate2857() {
    return int8FromFloat(float8Input("3ff8000000000000"));
}
function evaluate2858() {
    return int8FromFloat(float8Input("bff8000000000000"));
}
function evaluate2859() {
    return int8FromFloat(float8Input("4004000000000000"));
}
function evaluate2860() {
    return int8FromFloat(float8Input("c004000000000000"));
}
function evaluate2861() {
    return int8FromFloat(float8Input("3ff6666666666666"));
}
function evaluate2862() {
    return int8FromFloat(float8Input("bff6666666666666"));
}
function evaluate2863() {
    return int8FromFloat(float8Input("7ff8000000000000"));
}
function evaluate2864() {
    return int8FromFloat(float8Input("7ff0000000000000"));
}
function evaluate2865() {
    return int8FromFloat(float8Input("fff0000000000000"));
}
function evaluate2866() {
    return int8FromFloat(float8Input("c3e0000000000000"));
}
function evaluate2867() {
    return int8FromFloat(float8Input("43e0000000000000"));
}
function evaluate2868() {
    return int8FromFloat(float8Input("c3e0000000000000"));
}
function evaluate2869() {
    return int8FromFloat(float8Input("43e0000000000000"));
}
function evaluate2870() {
    return int8FromFloat(float8Input("43dfffffffffffff"));
}
function evaluate2871() {
    return int8FromFloat(float8Input("c3dfffffffffffff"));
}
function evaluate2872() {
    return float8Add(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate2873() {
    return float8Add(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate2874() {
    return float8Add(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate2875() {
    return float8Add(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate2876() {
    return float8Add(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate2877() {
    return float8Add(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate2878() {
    return float8Add(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate2879() {
    return float8Add(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate2880() {
    return float8Add(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate2881() {
    return float8Add(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate2882() {
    return float8Add(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate2883() {
    return float8Add(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate2884() {
    return float8Add(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate2885() {
    return float8Add(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate2886() {
    return float8Add(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate2887() {
    return float8Add(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate2888() {
    return float8Add(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate2889() {
    return float8Add(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate2890() {
    return float8Add(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate2891() {
    return float8Add(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate2892() {
    return float8Add(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate2893() {
    return float8Add(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate2894() {
    return float8Add(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate2895() {
    return float8Add(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate2896() {
    return float8Add(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate2897() {
    return float8Add(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate2898() {
    return float8Add(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate2899() {
    return float8Add(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate2900() {
    return float8Add(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate2901() {
    return float8Add(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate2902() {
    return float8Add(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate2903() {
    return float8Add(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate2904() {
    return float8Add(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate2905() {
    return float8Add(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate2906() {
    return float8Add(float8Input(null), float4Input("00000000"));
}
function evaluate2907() {
    return float8Add(float8Input("0000000000000000"), float4Input(null));
}
function evaluate2908() {
    return float8Add(float8Input(null), float4Input(null));
}
function evaluate2909() {
    return float8Add(float8Input(null), float4Input("7f800000"));
}
function evaluate2910() {
    return float8Add(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate2911() {
    return float8Sub(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate2912() {
    return float8Sub(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate2913() {
    return float8Sub(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate2914() {
    return float8Sub(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate2915() {
    return float8Sub(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate2916() {
    return float8Sub(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate2917() {
    return float8Sub(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate2918() {
    return float8Sub(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate2919() {
    return float8Sub(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate2920() {
    return float8Sub(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate2921() {
    return float8Sub(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate2922() {
    return float8Sub(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate2923() {
    return float8Sub(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate2924() {
    return float8Sub(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate2925() {
    return float8Sub(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate2926() {
    return float8Sub(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate2927() {
    return float8Sub(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate2928() {
    return float8Sub(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate2929() {
    return float8Sub(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate2930() {
    return float8Sub(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate2931() {
    return float8Sub(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate2932() {
    return float8Sub(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate2933() {
    return float8Sub(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate2934() {
    return float8Sub(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate2935() {
    return float8Sub(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate2936() {
    return float8Sub(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate2937() {
    return float8Sub(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate2938() {
    return float8Sub(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate2939() {
    return float8Sub(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate2940() {
    return float8Sub(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate2941() {
    return float8Sub(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate2942() {
    return float8Sub(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate2943() {
    return float8Sub(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate2944() {
    return float8Sub(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate2945() {
    return float8Sub(float8Input(null), float4Input("00000000"));
}
function evaluate2946() {
    return float8Sub(float8Input("0000000000000000"), float4Input(null));
}
function evaluate2947() {
    return float8Sub(float8Input(null), float4Input(null));
}
function evaluate2948() {
    return float8Sub(float8Input(null), float4Input("7f800000"));
}
function evaluate2949() {
    return float8Sub(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate2950() {
    return float8Mul(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate2951() {
    return float8Mul(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate2952() {
    return float8Mul(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate2953() {
    return float8Mul(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate2954() {
    return float8Mul(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate2955() {
    return float8Mul(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate2956() {
    return float8Mul(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate2957() {
    return float8Mul(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate2958() {
    return float8Mul(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate2959() {
    return float8Mul(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate2960() {
    return float8Mul(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate2961() {
    return float8Mul(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate2962() {
    return float8Mul(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate2963() {
    return float8Mul(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate2964() {
    return float8Mul(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate2965() {
    return float8Mul(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate2966() {
    return float8Mul(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate2967() {
    return float8Mul(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate2968() {
    return float8Mul(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate2969() {
    return float8Mul(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate2970() {
    return float8Mul(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate2971() {
    return float8Mul(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate2972() {
    return float8Mul(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate2973() {
    return float8Mul(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate2974() {
    return float8Mul(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate2975() {
    return float8Mul(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate2976() {
    return float8Mul(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate2977() {
    return float8Mul(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate2978() {
    return float8Mul(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate2979() {
    return float8Mul(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate2980() {
    return float8Mul(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate2981() {
    return float8Mul(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate2982() {
    return float8Mul(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate2983() {
    return float8Mul(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate2984() {
    return float8Mul(float8Input(null), float4Input("00000000"));
}
function evaluate2985() {
    return float8Mul(float8Input("0000000000000000"), float4Input(null));
}
function evaluate2986() {
    return float8Mul(float8Input(null), float4Input(null));
}
function evaluate2987() {
    return float8Mul(float8Input(null), float4Input("7f800000"));
}
function evaluate2988() {
    return float8Mul(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate2989() {
    return float8Div(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate2990() {
    return float8Div(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate2991() {
    return float8Div(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate2992() {
    return float8Div(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate2993() {
    return float8Div(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate2994() {
    return float8Div(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate2995() {
    return float8Div(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate2996() {
    return float8Div(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate2997() {
    return float8Div(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate2998() {
    return float8Div(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate2999() {
    return float8Div(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate3000() {
    return float8Div(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate3001() {
    return float8Div(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3002() {
    return float8Div(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3003() {
    return float8Div(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate3004() {
    return float8Div(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate3005() {
    return float8Div(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate3006() {
    return float8Div(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate3007() {
    return float8Div(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate3008() {
    return float8Div(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate3009() {
    return float8Div(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate3010() {
    return float8Div(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate3011() {
    return float8Div(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate3012() {
    return float8Div(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate3013() {
    return float8Div(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate3014() {
    return float8Div(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate3015() {
    return float8Div(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate3016() {
    return float8Div(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate3017() {
    return float8Div(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate3018() {
    return float8Div(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3019() {
    return float8Div(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate3020() {
    return float8Div(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate3021() {
    return float8Div(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate3022() {
    return float8Div(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3023() {
    return float8Div(float8Input(null), float4Input("00000000"));
}
function evaluate3024() {
    return float8Div(float8Input("0000000000000000"), float4Input(null));
}
function evaluate3025() {
    return float8Div(float8Input(null), float4Input(null));
}
function evaluate3026() {
    return float8Div(float8Input(null), float4Input("7f800000"));
}
function evaluate3027() {
    return float8Div(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate3028() {
    return floatEq(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate3029() {
    return floatEq(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate3030() {
    return floatEq(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate3031() {
    return floatEq(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate3032() {
    return floatEq(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate3033() {
    return floatEq(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate3034() {
    return floatEq(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate3035() {
    return floatEq(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate3036() {
    return floatEq(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate3037() {
    return floatEq(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate3038() {
    return floatEq(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate3039() {
    return floatEq(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate3040() {
    return floatEq(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3041() {
    return floatEq(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3042() {
    return floatEq(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate3043() {
    return floatEq(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate3044() {
    return floatEq(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate3045() {
    return floatEq(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate3046() {
    return floatEq(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate3047() {
    return floatEq(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate3048() {
    return floatEq(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate3049() {
    return floatEq(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate3050() {
    return floatEq(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate3051() {
    return floatEq(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate3052() {
    return floatEq(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate3053() {
    return floatEq(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate3054() {
    return floatEq(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate3055() {
    return floatEq(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate3056() {
    return floatEq(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate3057() {
    return floatEq(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3058() {
    return floatEq(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate3059() {
    return floatEq(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate3060() {
    return floatEq(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate3061() {
    return floatEq(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3062() {
    return floatEq(float8Input(null), float4Input("00000000"));
}
function evaluate3063() {
    return floatEq(float8Input("0000000000000000"), float4Input(null));
}
function evaluate3064() {
    return floatEq(float8Input(null), float4Input(null));
}
function evaluate3065() {
    return floatEq(float8Input(null), float4Input("7f800000"));
}
function evaluate3066() {
    return floatEq(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate3067() {
    return floatNe(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate3068() {
    return floatNe(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate3069() {
    return floatNe(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate3070() {
    return floatNe(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate3071() {
    return floatNe(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate3072() {
    return floatNe(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate3073() {
    return floatNe(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate3074() {
    return floatNe(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate3075() {
    return floatNe(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate3076() {
    return floatNe(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate3077() {
    return floatNe(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate3078() {
    return floatNe(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate3079() {
    return floatNe(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3080() {
    return floatNe(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3081() {
    return floatNe(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate3082() {
    return floatNe(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate3083() {
    return floatNe(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate3084() {
    return floatNe(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate3085() {
    return floatNe(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate3086() {
    return floatNe(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate3087() {
    return floatNe(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate3088() {
    return floatNe(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate3089() {
    return floatNe(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate3090() {
    return floatNe(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate3091() {
    return floatNe(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate3092() {
    return floatNe(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate3093() {
    return floatNe(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate3094() {
    return floatNe(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate3095() {
    return floatNe(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate3096() {
    return floatNe(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3097() {
    return floatNe(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate3098() {
    return floatNe(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate3099() {
    return floatNe(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate3100() {
    return floatNe(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3101() {
    return floatNe(float8Input(null), float4Input("00000000"));
}
function evaluate3102() {
    return floatNe(float8Input("0000000000000000"), float4Input(null));
}
function evaluate3103() {
    return floatNe(float8Input(null), float4Input(null));
}
function evaluate3104() {
    return floatNe(float8Input(null), float4Input("7f800000"));
}
function evaluate3105() {
    return floatNe(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate3106() {
    return floatLt(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate3107() {
    return floatLt(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate3108() {
    return floatLt(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate3109() {
    return floatLt(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate3110() {
    return floatLt(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate3111() {
    return floatLt(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate3112() {
    return floatLt(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate3113() {
    return floatLt(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate3114() {
    return floatLt(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate3115() {
    return floatLt(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate3116() {
    return floatLt(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate3117() {
    return floatLt(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate3118() {
    return floatLt(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3119() {
    return floatLt(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3120() {
    return floatLt(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate3121() {
    return floatLt(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate3122() {
    return floatLt(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate3123() {
    return floatLt(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate3124() {
    return floatLt(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate3125() {
    return floatLt(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate3126() {
    return floatLt(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate3127() {
    return floatLt(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate3128() {
    return floatLt(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate3129() {
    return floatLt(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate3130() {
    return floatLt(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate3131() {
    return floatLt(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate3132() {
    return floatLt(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate3133() {
    return floatLt(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate3134() {
    return floatLt(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate3135() {
    return floatLt(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3136() {
    return floatLt(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate3137() {
    return floatLt(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate3138() {
    return floatLt(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate3139() {
    return floatLt(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3140() {
    return floatLt(float8Input(null), float4Input("00000000"));
}
function evaluate3141() {
    return floatLt(float8Input("0000000000000000"), float4Input(null));
}
function evaluate3142() {
    return floatLt(float8Input(null), float4Input(null));
}
function evaluate3143() {
    return floatLt(float8Input(null), float4Input("7f800000"));
}
function evaluate3144() {
    return floatLt(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate3145() {
    return floatLe(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate3146() {
    return floatLe(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate3147() {
    return floatLe(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate3148() {
    return floatLe(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate3149() {
    return floatLe(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate3150() {
    return floatLe(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate3151() {
    return floatLe(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate3152() {
    return floatLe(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate3153() {
    return floatLe(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate3154() {
    return floatLe(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate3155() {
    return floatLe(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate3156() {
    return floatLe(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate3157() {
    return floatLe(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3158() {
    return floatLe(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3159() {
    return floatLe(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate3160() {
    return floatLe(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate3161() {
    return floatLe(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate3162() {
    return floatLe(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate3163() {
    return floatLe(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate3164() {
    return floatLe(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate3165() {
    return floatLe(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate3166() {
    return floatLe(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate3167() {
    return floatLe(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate3168() {
    return floatLe(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate3169() {
    return floatLe(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate3170() {
    return floatLe(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate3171() {
    return floatLe(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate3172() {
    return floatLe(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate3173() {
    return floatLe(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate3174() {
    return floatLe(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3175() {
    return floatLe(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate3176() {
    return floatLe(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate3177() {
    return floatLe(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate3178() {
    return floatLe(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3179() {
    return floatLe(float8Input(null), float4Input("00000000"));
}
function evaluate3180() {
    return floatLe(float8Input("0000000000000000"), float4Input(null));
}
function evaluate3181() {
    return floatLe(float8Input(null), float4Input(null));
}
function evaluate3182() {
    return floatLe(float8Input(null), float4Input("7f800000"));
}
function evaluate3183() {
    return floatLe(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate3184() {
    return floatGt(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate3185() {
    return floatGt(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate3186() {
    return floatGt(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate3187() {
    return floatGt(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate3188() {
    return floatGt(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate3189() {
    return floatGt(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate3190() {
    return floatGt(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate3191() {
    return floatGt(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate3192() {
    return floatGt(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate3193() {
    return floatGt(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate3194() {
    return floatGt(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate3195() {
    return floatGt(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate3196() {
    return floatGt(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3197() {
    return floatGt(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3198() {
    return floatGt(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate3199() {
    return floatGt(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate3200() {
    return floatGt(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate3201() {
    return floatGt(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate3202() {
    return floatGt(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate3203() {
    return floatGt(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate3204() {
    return floatGt(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate3205() {
    return floatGt(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate3206() {
    return floatGt(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate3207() {
    return floatGt(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate3208() {
    return floatGt(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate3209() {
    return floatGt(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate3210() {
    return floatGt(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate3211() {
    return floatGt(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate3212() {
    return floatGt(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate3213() {
    return floatGt(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3214() {
    return floatGt(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate3215() {
    return floatGt(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate3216() {
    return floatGt(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate3217() {
    return floatGt(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3218() {
    return floatGt(float8Input(null), float4Input("00000000"));
}
function evaluate3219() {
    return floatGt(float8Input("0000000000000000"), float4Input(null));
}
function evaluate3220() {
    return floatGt(float8Input(null), float4Input(null));
}
function evaluate3221() {
    return floatGt(float8Input(null), float4Input("7f800000"));
}
function evaluate3222() {
    return floatGt(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate3223() {
    return floatGe(float8Input("3ff0000000000000"), float4Input("40000000"));
}
function evaluate3224() {
    return floatGe(float8Input("3fb999999999999a"), float4Input("3dcccccd"));
}
function evaluate3225() {
    return floatGe(float8Input("4008000000000000"), float4Input("40000000"));
}
function evaluate3226() {
    return floatGe(float8Input("c008000000000000"), float4Input("40000000"));
}
function evaluate3227() {
    return floatGe(float8Input("4008000000000000"), float4Input("c0000000"));
}
function evaluate3228() {
    return floatGe(float8Input("0000000000000000"), float4Input("00000000"));
}
function evaluate3229() {
    return floatGe(float8Input("8000000000000000"), float4Input("00000000"));
}
function evaluate3230() {
    return floatGe(float8Input("0000000000000000"), float4Input("80000000"));
}
function evaluate3231() {
    return floatGe(float8Input("8000000000000000"), float4Input("80000000"));
}
function evaluate3232() {
    return floatGe(float8Input("3ff0000000000000"), float4Input("00000000"));
}
function evaluate3233() {
    return floatGe(float8Input("0000000000000000"), float4Input("3f800000"));
}
function evaluate3234() {
    return floatGe(float8Input("3ff0000000000000"), float4Input("80000000"));
}
function evaluate3235() {
    return floatGe(float8Input("7fefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3236() {
    return floatGe(float8Input("ffefffffffffffff"), float4Input("7f7fffff"));
}
function evaluate3237() {
    return floatGe(float8Input("7fefffffffffffff"), float4Input("40000000"));
}
function evaluate3238() {
    return floatGe(float8Input("7fefffffffffffff"), float4Input("00000001"));
}
function evaluate3239() {
    return floatGe(float8Input("0010000000000000"), float4Input("3f000000"));
}
function evaluate3240() {
    return floatGe(float8Input("0000000000000001"), float4Input("3f000000"));
}
function evaluate3241() {
    return floatGe(float8Input("0000000000000001"), float4Input("40000000"));
}
function evaluate3242() {
    return floatGe(float8Input("0000000000000001"), float4Input("00000001"));
}
function evaluate3243() {
    return floatGe(float8Input("7ff0000000000000"), float4Input("3f800000"));
}
function evaluate3244() {
    return floatGe(float8Input("fff0000000000000"), float4Input("3f800000"));
}
function evaluate3245() {
    return floatGe(float8Input("3ff0000000000000"), float4Input("7f800000"));
}
function evaluate3246() {
    return floatGe(float8Input("3ff0000000000000"), float4Input("ff800000"));
}
function evaluate3247() {
    return floatGe(float8Input("7ff0000000000000"), float4Input("7f800000"));
}
function evaluate3248() {
    return floatGe(float8Input("7ff0000000000000"), float4Input("ff800000"));
}
function evaluate3249() {
    return floatGe(float8Input("7ff0000000000000"), float4Input("00000000"));
}
function evaluate3250() {
    return floatGe(float8Input("7ff8000000000000"), float4Input("7fc00000"));
}
function evaluate3251() {
    return floatGe(float8Input("7ff8000000000000"), float4Input("7f800000"));
}
function evaluate3252() {
    return floatGe(float8Input("7ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3253() {
    return floatGe(float8Input("7ff8000000000000"), float4Input("00000000"));
}
function evaluate3254() {
    return floatGe(float8Input("0000000000000000"), float4Input("7fc00000"));
}
function evaluate3255() {
    return floatGe(float8Input("7ff8000000000000"), float4Input("3f800000"));
}
function evaluate3256() {
    return floatGe(float8Input("3ff0000000000000"), float4Input("7fc00000"));
}
function evaluate3257() {
    return floatGe(float8Input(null), float4Input("00000000"));
}
function evaluate3258() {
    return floatGe(float8Input("0000000000000000"), float4Input(null));
}
function evaluate3259() {
    return floatGe(float8Input(null), float4Input(null));
}
function evaluate3260() {
    return floatGe(float8Input(null), float4Input("7f800000"));
}
function evaluate3261() {
    return floatGe(float8Input("7ff8000000000000"), float4Input(null));
}
function evaluate3262() {
    return floatEq(float8Input("4170000000000000"), float4Input("4b800000"));
}
function evaluate3263() {
    return floatEq(float8Input("4340000000000000"), float4Input("5a000000"));
}
function evaluate3264() {
    return floatEq(float8Input("fff0000000000000"), float4Input("00000000"));
}
function evaluate3265() {
    return floatEq(float8Input("7ff8000000000000"), float4Input("ff800000"));
}
function evaluate3266() {
    return floatNe(float8Input("4170000000000000"), float4Input("4b800000"));
}
function evaluate3267() {
    return floatNe(float8Input("4340000000000000"), float4Input("5a000000"));
}
function evaluate3268() {
    return floatNe(float8Input("fff0000000000000"), float4Input("00000000"));
}
function evaluate3269() {
    return floatNe(float8Input("7ff8000000000000"), float4Input("ff800000"));
}
function evaluate3270() {
    return floatLt(float8Input("4170000000000000"), float4Input("4b800000"));
}
function evaluate3271() {
    return floatLt(float8Input("4340000000000000"), float4Input("5a000000"));
}
function evaluate3272() {
    return floatLt(float8Input("fff0000000000000"), float4Input("00000000"));
}
function evaluate3273() {
    return floatLt(float8Input("7ff8000000000000"), float4Input("ff800000"));
}
function evaluate3274() {
    return floatLe(float8Input("4170000000000000"), float4Input("4b800000"));
}
function evaluate3275() {
    return floatLe(float8Input("4340000000000000"), float4Input("5a000000"));
}
function evaluate3276() {
    return floatLe(float8Input("fff0000000000000"), float4Input("00000000"));
}
function evaluate3277() {
    return floatLe(float8Input("7ff8000000000000"), float4Input("ff800000"));
}
function evaluate3278() {
    return floatGt(float8Input("4170000000000000"), float4Input("4b800000"));
}
function evaluate3279() {
    return floatGt(float8Input("4340000000000000"), float4Input("5a000000"));
}
function evaluate3280() {
    return floatGt(float8Input("fff0000000000000"), float4Input("00000000"));
}
function evaluate3281() {
    return floatGt(float8Input("7ff8000000000000"), float4Input("ff800000"));
}
function evaluate3282() {
    return floatGe(float8Input("4170000000000000"), float4Input("4b800000"));
}
function evaluate3283() {
    return floatGe(float8Input("4340000000000000"), float4Input("5a000000"));
}
function evaluate3284() {
    return floatGe(float8Input("fff0000000000000"), float4Input("00000000"));
}
function evaluate3285() {
    return floatGe(float8Input("7ff8000000000000"), float4Input("ff800000"));
}
function evaluate3286() {
    return float8Add(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3287() {
    return float8Add(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3288() {
    return float8Add(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3289() {
    return float8Add(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3290() {
    return float8Add(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3291() {
    return float8Add(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3292() {
    return float8Add(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3293() {
    return float8Add(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3294() {
    return float8Add(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3295() {
    return float8Add(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3296() {
    return float8Add(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3297() {
    return float8Add(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3298() {
    return float8Add(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3299() {
    return float8Add(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3300() {
    return float8Add(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3301() {
    return float8Add(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3302() {
    return float8Add(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3303() {
    return float8Add(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3304() {
    return float8Add(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3305() {
    return float8Add(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3306() {
    return float8Add(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3307() {
    return float8Add(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3308() {
    return float8Add(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3309() {
    return float8Add(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3310() {
    return float8Add(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3311() {
    return float8Add(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3312() {
    return float8Add(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3313() {
    return float8Add(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3314() {
    return float8Add(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3315() {
    return float8Add(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3316() {
    return float8Add(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3317() {
    return float8Add(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3318() {
    return float8Add(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3319() {
    return float8Add(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3320() {
    return float8Add(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3321() {
    return float8Add(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3322() {
    return float8Add(float8Input(null), float8Input(null));
}
function evaluate3323() {
    return float8Add(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3324() {
    return float8Add(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3325() {
    return float8Sub(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3326() {
    return float8Sub(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3327() {
    return float8Sub(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3328() {
    return float8Sub(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3329() {
    return float8Sub(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3330() {
    return float8Sub(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3331() {
    return float8Sub(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3332() {
    return float8Sub(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3333() {
    return float8Sub(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3334() {
    return float8Sub(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3335() {
    return float8Sub(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3336() {
    return float8Sub(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3337() {
    return float8Sub(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3338() {
    return float8Sub(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3339() {
    return float8Sub(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3340() {
    return float8Sub(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3341() {
    return float8Sub(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3342() {
    return float8Sub(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3343() {
    return float8Sub(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3344() {
    return float8Sub(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3345() {
    return float8Sub(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3346() {
    return float8Sub(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3347() {
    return float8Sub(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3348() {
    return float8Sub(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3349() {
    return float8Sub(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3350() {
    return float8Sub(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3351() {
    return float8Sub(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3352() {
    return float8Sub(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3353() {
    return float8Sub(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3354() {
    return float8Sub(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3355() {
    return float8Sub(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3356() {
    return float8Sub(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3357() {
    return float8Sub(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3358() {
    return float8Sub(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3359() {
    return float8Sub(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3360() {
    return float8Sub(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3361() {
    return float8Sub(float8Input(null), float8Input(null));
}
function evaluate3362() {
    return float8Sub(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3363() {
    return float8Sub(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3364() {
    return float8Mul(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3365() {
    return float8Mul(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3366() {
    return float8Mul(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3367() {
    return float8Mul(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3368() {
    return float8Mul(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3369() {
    return float8Mul(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3370() {
    return float8Mul(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3371() {
    return float8Mul(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3372() {
    return float8Mul(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3373() {
    return float8Mul(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3374() {
    return float8Mul(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3375() {
    return float8Mul(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3376() {
    return float8Mul(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3377() {
    return float8Mul(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3378() {
    return float8Mul(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3379() {
    return float8Mul(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3380() {
    return float8Mul(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3381() {
    return float8Mul(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3382() {
    return float8Mul(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3383() {
    return float8Mul(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3384() {
    return float8Mul(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3385() {
    return float8Mul(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3386() {
    return float8Mul(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3387() {
    return float8Mul(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3388() {
    return float8Mul(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3389() {
    return float8Mul(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3390() {
    return float8Mul(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3391() {
    return float8Mul(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3392() {
    return float8Mul(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3393() {
    return float8Mul(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3394() {
    return float8Mul(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3395() {
    return float8Mul(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3396() {
    return float8Mul(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3397() {
    return float8Mul(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3398() {
    return float8Mul(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3399() {
    return float8Mul(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3400() {
    return float8Mul(float8Input(null), float8Input(null));
}
function evaluate3401() {
    return float8Mul(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3402() {
    return float8Mul(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3403() {
    return float8Div(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3404() {
    return float8Div(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3405() {
    return float8Div(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3406() {
    return float8Div(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3407() {
    return float8Div(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3408() {
    return float8Div(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3409() {
    return float8Div(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3410() {
    return float8Div(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3411() {
    return float8Div(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3412() {
    return float8Div(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3413() {
    return float8Div(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3414() {
    return float8Div(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3415() {
    return float8Div(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3416() {
    return float8Div(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3417() {
    return float8Div(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3418() {
    return float8Div(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3419() {
    return float8Div(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3420() {
    return float8Div(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3421() {
    return float8Div(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3422() {
    return float8Div(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3423() {
    return float8Div(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3424() {
    return float8Div(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3425() {
    return float8Div(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3426() {
    return float8Div(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3427() {
    return float8Div(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3428() {
    return float8Div(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3429() {
    return float8Div(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3430() {
    return float8Div(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3431() {
    return float8Div(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3432() {
    return float8Div(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3433() {
    return float8Div(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3434() {
    return float8Div(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3435() {
    return float8Div(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3436() {
    return float8Div(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3437() {
    return float8Div(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3438() {
    return float8Div(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3439() {
    return float8Div(float8Input(null), float8Input(null));
}
function evaluate3440() {
    return float8Div(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3441() {
    return float8Div(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3442() {
    return floatEq(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3443() {
    return floatEq(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3444() {
    return floatEq(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3445() {
    return floatEq(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3446() {
    return floatEq(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3447() {
    return floatEq(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3448() {
    return floatEq(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3449() {
    return floatEq(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3450() {
    return floatEq(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3451() {
    return floatEq(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3452() {
    return floatEq(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3453() {
    return floatEq(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3454() {
    return floatEq(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3455() {
    return floatEq(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3456() {
    return floatEq(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3457() {
    return floatEq(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3458() {
    return floatEq(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3459() {
    return floatEq(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3460() {
    return floatEq(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3461() {
    return floatEq(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3462() {
    return floatEq(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3463() {
    return floatEq(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3464() {
    return floatEq(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3465() {
    return floatEq(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3466() {
    return floatEq(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3467() {
    return floatEq(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3468() {
    return floatEq(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3469() {
    return floatEq(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3470() {
    return floatEq(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3471() {
    return floatEq(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3472() {
    return floatEq(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3473() {
    return floatEq(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3474() {
    return floatEq(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3475() {
    return floatEq(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3476() {
    return floatEq(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3477() {
    return floatEq(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3478() {
    return floatEq(float8Input(null), float8Input(null));
}
function evaluate3479() {
    return floatEq(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3480() {
    return floatEq(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3481() {
    return floatNe(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3482() {
    return floatNe(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3483() {
    return floatNe(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3484() {
    return floatNe(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3485() {
    return floatNe(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3486() {
    return floatNe(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3487() {
    return floatNe(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3488() {
    return floatNe(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3489() {
    return floatNe(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3490() {
    return floatNe(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3491() {
    return floatNe(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3492() {
    return floatNe(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3493() {
    return floatNe(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3494() {
    return floatNe(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3495() {
    return floatNe(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3496() {
    return floatNe(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3497() {
    return floatNe(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3498() {
    return floatNe(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3499() {
    return floatNe(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3500() {
    return floatNe(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3501() {
    return floatNe(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3502() {
    return floatNe(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3503() {
    return floatNe(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3504() {
    return floatNe(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3505() {
    return floatNe(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3506() {
    return floatNe(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3507() {
    return floatNe(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3508() {
    return floatNe(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3509() {
    return floatNe(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3510() {
    return floatNe(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3511() {
    return floatNe(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3512() {
    return floatNe(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3513() {
    return floatNe(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3514() {
    return floatNe(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3515() {
    return floatNe(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3516() {
    return floatNe(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3517() {
    return floatNe(float8Input(null), float8Input(null));
}
function evaluate3518() {
    return floatNe(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3519() {
    return floatNe(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3520() {
    return floatLt(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3521() {
    return floatLt(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3522() {
    return floatLt(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3523() {
    return floatLt(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3524() {
    return floatLt(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3525() {
    return floatLt(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3526() {
    return floatLt(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3527() {
    return floatLt(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3528() {
    return floatLt(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3529() {
    return floatLt(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3530() {
    return floatLt(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3531() {
    return floatLt(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3532() {
    return floatLt(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3533() {
    return floatLt(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3534() {
    return floatLt(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3535() {
    return floatLt(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3536() {
    return floatLt(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3537() {
    return floatLt(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3538() {
    return floatLt(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3539() {
    return floatLt(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3540() {
    return floatLt(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3541() {
    return floatLt(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3542() {
    return floatLt(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3543() {
    return floatLt(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3544() {
    return floatLt(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3545() {
    return floatLt(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3546() {
    return floatLt(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3547() {
    return floatLt(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3548() {
    return floatLt(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3549() {
    return floatLt(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3550() {
    return floatLt(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3551() {
    return floatLt(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3552() {
    return floatLt(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3553() {
    return floatLt(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3554() {
    return floatLt(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3555() {
    return floatLt(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3556() {
    return floatLt(float8Input(null), float8Input(null));
}
function evaluate3557() {
    return floatLt(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3558() {
    return floatLt(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3559() {
    return floatLe(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3560() {
    return floatLe(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3561() {
    return floatLe(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3562() {
    return floatLe(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3563() {
    return floatLe(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3564() {
    return floatLe(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3565() {
    return floatLe(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3566() {
    return floatLe(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3567() {
    return floatLe(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3568() {
    return floatLe(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3569() {
    return floatLe(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3570() {
    return floatLe(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3571() {
    return floatLe(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3572() {
    return floatLe(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3573() {
    return floatLe(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3574() {
    return floatLe(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3575() {
    return floatLe(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3576() {
    return floatLe(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3577() {
    return floatLe(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3578() {
    return floatLe(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3579() {
    return floatLe(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3580() {
    return floatLe(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3581() {
    return floatLe(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3582() {
    return floatLe(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3583() {
    return floatLe(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3584() {
    return floatLe(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3585() {
    return floatLe(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3586() {
    return floatLe(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3587() {
    return floatLe(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3588() {
    return floatLe(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3589() {
    return floatLe(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3590() {
    return floatLe(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3591() {
    return floatLe(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3592() {
    return floatLe(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3593() {
    return floatLe(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3594() {
    return floatLe(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3595() {
    return floatLe(float8Input(null), float8Input(null));
}
function evaluate3596() {
    return floatLe(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3597() {
    return floatLe(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3598() {
    return floatGt(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3599() {
    return floatGt(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3600() {
    return floatGt(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3601() {
    return floatGt(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3602() {
    return floatGt(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3603() {
    return floatGt(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3604() {
    return floatGt(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3605() {
    return floatGt(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3606() {
    return floatGt(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3607() {
    return floatGt(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3608() {
    return floatGt(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3609() {
    return floatGt(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3610() {
    return floatGt(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3611() {
    return floatGt(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3612() {
    return floatGt(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3613() {
    return floatGt(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3614() {
    return floatGt(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3615() {
    return floatGt(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3616() {
    return floatGt(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3617() {
    return floatGt(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3618() {
    return floatGt(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3619() {
    return floatGt(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3620() {
    return floatGt(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3621() {
    return floatGt(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3622() {
    return floatGt(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3623() {
    return floatGt(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3624() {
    return floatGt(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3625() {
    return floatGt(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3626() {
    return floatGt(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3627() {
    return floatGt(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3628() {
    return floatGt(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3629() {
    return floatGt(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3630() {
    return floatGt(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3631() {
    return floatGt(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3632() {
    return floatGt(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3633() {
    return floatGt(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3634() {
    return floatGt(float8Input(null), float8Input(null));
}
function evaluate3635() {
    return floatGt(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3636() {
    return floatGt(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3637() {
    return floatGe(float8Input("3ff0000000000000"), float8Input("4000000000000000"));
}
function evaluate3638() {
    return floatGe(float8Input("3fb999999999999a"), float8Input("3fb999999999999a"));
}
function evaluate3639() {
    return floatGe(float8Input("4008000000000000"), float8Input("4000000000000000"));
}
function evaluate3640() {
    return floatGe(float8Input("c008000000000000"), float8Input("4000000000000000"));
}
function evaluate3641() {
    return floatGe(float8Input("4008000000000000"), float8Input("c000000000000000"));
}
function evaluate3642() {
    return floatGe(float8Input("0000000000000000"), float8Input("0000000000000000"));
}
function evaluate3643() {
    return floatGe(float8Input("8000000000000000"), float8Input("0000000000000000"));
}
function evaluate3644() {
    return floatGe(float8Input("0000000000000000"), float8Input("8000000000000000"));
}
function evaluate3645() {
    return floatGe(float8Input("8000000000000000"), float8Input("8000000000000000"));
}
function evaluate3646() {
    return floatGe(float8Input("3ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3647() {
    return floatGe(float8Input("0000000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3648() {
    return floatGe(float8Input("3ff0000000000000"), float8Input("8000000000000000"));
}
function evaluate3649() {
    return floatGe(float8Input("7fefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3650() {
    return floatGe(float8Input("ffefffffffffffff"), float8Input("7fefffffffffffff"));
}
function evaluate3651() {
    return floatGe(float8Input("7fefffffffffffff"), float8Input("4000000000000000"));
}
function evaluate3652() {
    return floatGe(float8Input("7fefffffffffffff"), float8Input("0000000000000001"));
}
function evaluate3653() {
    return floatGe(float8Input("0010000000000000"), float8Input("3fe0000000000000"));
}
function evaluate3654() {
    return floatGe(float8Input("0000000000000001"), float8Input("3fe0000000000000"));
}
function evaluate3655() {
    return floatGe(float8Input("0000000000000001"), float8Input("4000000000000000"));
}
function evaluate3656() {
    return floatGe(float8Input("0000000000000001"), float8Input("0000000000000001"));
}
function evaluate3657() {
    return floatGe(float8Input("7ff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3658() {
    return floatGe(float8Input("fff0000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3659() {
    return floatGe(float8Input("3ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3660() {
    return floatGe(float8Input("3ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3661() {
    return floatGe(float8Input("7ff0000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3662() {
    return floatGe(float8Input("7ff0000000000000"), float8Input("fff0000000000000"));
}
function evaluate3663() {
    return floatGe(float8Input("7ff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3664() {
    return floatGe(float8Input("7ff8000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3665() {
    return floatGe(float8Input("7ff8000000000000"), float8Input("7ff0000000000000"));
}
function evaluate3666() {
    return floatGe(float8Input("7ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3667() {
    return floatGe(float8Input("7ff8000000000000"), float8Input("0000000000000000"));
}
function evaluate3668() {
    return floatGe(float8Input("0000000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3669() {
    return floatGe(float8Input("7ff8000000000000"), float8Input("3ff0000000000000"));
}
function evaluate3670() {
    return floatGe(float8Input("3ff0000000000000"), float8Input("7ff8000000000000"));
}
function evaluate3671() {
    return floatGe(float8Input(null), float8Input("0000000000000000"));
}
function evaluate3672() {
    return floatGe(float8Input("0000000000000000"), float8Input(null));
}
function evaluate3673() {
    return floatGe(float8Input(null), float8Input(null));
}
function evaluate3674() {
    return floatGe(float8Input(null), float8Input("7ff0000000000000"));
}
function evaluate3675() {
    return floatGe(float8Input("7ff8000000000000"), float8Input(null));
}
function evaluate3676() {
    return floatEq(float8Input("4170000000000000"), float8Input("4170000010000000"));
}
function evaluate3677() {
    return floatEq(float8Input("4340000000000000"), float8Input("4340000000000001"));
}
function evaluate3678() {
    return floatEq(float8Input("fff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3679() {
    return floatEq(float8Input("7ff8000000000000"), float8Input("fff0000000000000"));
}
function evaluate3680() {
    return floatNe(float8Input("4170000000000000"), float8Input("4170000010000000"));
}
function evaluate3681() {
    return floatNe(float8Input("4340000000000000"), float8Input("4340000000000001"));
}
function evaluate3682() {
    return floatNe(float8Input("fff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3683() {
    return floatNe(float8Input("7ff8000000000000"), float8Input("fff0000000000000"));
}
function evaluate3684() {
    return floatLt(float8Input("4170000000000000"), float8Input("4170000010000000"));
}
function evaluate3685() {
    return floatLt(float8Input("4340000000000000"), float8Input("4340000000000001"));
}
function evaluate3686() {
    return floatLt(float8Input("fff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3687() {
    return floatLt(float8Input("7ff8000000000000"), float8Input("fff0000000000000"));
}
function evaluate3688() {
    return floatLe(float8Input("4170000000000000"), float8Input("4170000010000000"));
}
function evaluate3689() {
    return floatLe(float8Input("4340000000000000"), float8Input("4340000000000001"));
}
function evaluate3690() {
    return floatLe(float8Input("fff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3691() {
    return floatLe(float8Input("7ff8000000000000"), float8Input("fff0000000000000"));
}
function evaluate3692() {
    return floatGt(float8Input("4170000000000000"), float8Input("4170000010000000"));
}
function evaluate3693() {
    return floatGt(float8Input("4340000000000000"), float8Input("4340000000000001"));
}
function evaluate3694() {
    return floatGt(float8Input("fff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3695() {
    return floatGt(float8Input("7ff8000000000000"), float8Input("fff0000000000000"));
}
function evaluate3696() {
    return floatGe(float8Input("4170000000000000"), float8Input("4170000010000000"));
}
function evaluate3697() {
    return floatGe(float8Input("4340000000000000"), float8Input("4340000000000001"));
}
function evaluate3698() {
    return floatGe(float8Input("fff0000000000000"), float8Input("0000000000000000"));
}
function evaluate3699() {
    return floatGe(float8Input("7ff8000000000000"), float8Input("fff0000000000000"));
}
function evaluate3700() {
    return int8Div(int8Input("1"), int8Input("0"));
}
function evaluate3701() {
    return float8FromInteger(int8Div(int8Input("1"), int8Input("0")));
}
function evaluate3702() {
    return floatEq(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))), float8Input(null));
}
function evaluate3703() {
    return float8Abs(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate3704() {
    return float4Div(float4Input("3f800000"), float4Input("00000000"));
}
function evaluate3705() {
    return int4FromFloat(float4Div(float4Input("3f800000"), float4Input("00000000")));
}
function evaluate3706() {
    return int4Mod(int4FromFloat(float4Div(float4Input("3f800000"), float4Input("00000000"))), int4Input(null));
}
function evaluate3707() {
    return float4Add(float4Input("4b800000"), float4Input("3f800000"));
}
function evaluate3708() {
    return float8FromFloat4(float4Add(float4Input("4b800000"), float4Input("3f800000")));
}
function evaluate3709() {
    return float8Sub(float8FromFloat4(float4Add(float4Input("4b800000"), float4Input("3f800000"))), float8Input("4170000000000000"));
}
function evaluate3710() {
    return int8Mod(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate3711() {
    return float4FromInteger(int8Mod(int8Input("-9223372036854775808"), int8Input("-1")));
}
function evaluate3712() {
    return float4Input("15ae43fd");
}
function evaluate3713() {
    return int2And(int2Input(null), int2Input(null));
}
function evaluate3714() {
    return int2And(int2Input(null), int2Input("0"));
}
function evaluate3715() {
    return int2And(int2Input(null), int2Input("1"));
}
function evaluate3716() {
    return int2And(int2Input(null), int2Input("-1"));
}
function evaluate3717() {
    return int2And(int2Input(null), int2Input("3"));
}
function evaluate3718() {
    return int2And(int2Input(null), int2Input("-3"));
}
function evaluate3719() {
    return int2And(int2Input(null), int2Input("-32768"));
}
function evaluate3720() {
    return int2And(int2Input(null), int2Input("32767"));
}
function evaluate3721() {
    return int2And(int2Input("0"), int2Input(null));
}
function evaluate3722() {
    return int2And(int2Input("0"), int2Input("0"));
}
function evaluate3723() {
    return int2And(int2Input("0"), int2Input("1"));
}
function evaluate3724() {
    return int2And(int2Input("0"), int2Input("-1"));
}
function evaluate3725() {
    return int2And(int2Input("0"), int2Input("3"));
}
function evaluate3726() {
    return int2And(int2Input("0"), int2Input("-3"));
}
function evaluate3727() {
    return int2And(int2Input("0"), int2Input("-32768"));
}
function evaluate3728() {
    return int2And(int2Input("0"), int2Input("32767"));
}
function evaluate3729() {
    return int2And(int2Input("1"), int2Input(null));
}
function evaluate3730() {
    return int2And(int2Input("1"), int2Input("0"));
}
function evaluate3731() {
    return int2And(int2Input("1"), int2Input("1"));
}
function evaluate3732() {
    return int2And(int2Input("1"), int2Input("-1"));
}
function evaluate3733() {
    return int2And(int2Input("1"), int2Input("3"));
}
function evaluate3734() {
    return int2And(int2Input("1"), int2Input("-3"));
}
function evaluate3735() {
    return int2And(int2Input("1"), int2Input("-32768"));
}
function evaluate3736() {
    return int2And(int2Input("1"), int2Input("32767"));
}
function evaluate3737() {
    return int2And(int2Input("-1"), int2Input(null));
}
function evaluate3738() {
    return int2And(int2Input("-1"), int2Input("0"));
}
function evaluate3739() {
    return int2And(int2Input("-1"), int2Input("1"));
}
function evaluate3740() {
    return int2And(int2Input("-1"), int2Input("-1"));
}
function evaluate3741() {
    return int2And(int2Input("-1"), int2Input("3"));
}
function evaluate3742() {
    return int2And(int2Input("-1"), int2Input("-3"));
}
function evaluate3743() {
    return int2And(int2Input("-1"), int2Input("-32768"));
}
function evaluate3744() {
    return int2And(int2Input("-1"), int2Input("32767"));
}
function evaluate3745() {
    return int2And(int2Input("3"), int2Input(null));
}
function evaluate3746() {
    return int2And(int2Input("3"), int2Input("0"));
}
function evaluate3747() {
    return int2And(int2Input("3"), int2Input("1"));
}
function evaluate3748() {
    return int2And(int2Input("3"), int2Input("-1"));
}
function evaluate3749() {
    return int2And(int2Input("3"), int2Input("3"));
}
function evaluate3750() {
    return int2And(int2Input("3"), int2Input("-3"));
}
function evaluate3751() {
    return int2And(int2Input("3"), int2Input("-32768"));
}
function evaluate3752() {
    return int2And(int2Input("3"), int2Input("32767"));
}
function evaluate3753() {
    return int2And(int2Input("-3"), int2Input(null));
}
function evaluate3754() {
    return int2And(int2Input("-3"), int2Input("0"));
}
function evaluate3755() {
    return int2And(int2Input("-3"), int2Input("1"));
}
function evaluate3756() {
    return int2And(int2Input("-3"), int2Input("-1"));
}
function evaluate3757() {
    return int2And(int2Input("-3"), int2Input("3"));
}
function evaluate3758() {
    return int2And(int2Input("-3"), int2Input("-3"));
}
function evaluate3759() {
    return int2And(int2Input("-3"), int2Input("-32768"));
}
function evaluate3760() {
    return int2And(int2Input("-3"), int2Input("32767"));
}
function evaluate3761() {
    return int2And(int2Input("-32768"), int2Input(null));
}
function evaluate3762() {
    return int2And(int2Input("-32768"), int2Input("0"));
}
function evaluate3763() {
    return int2And(int2Input("-32768"), int2Input("1"));
}
function evaluate3764() {
    return int2And(int2Input("-32768"), int2Input("-1"));
}
function evaluate3765() {
    return int2And(int2Input("-32768"), int2Input("3"));
}
function evaluate3766() {
    return int2And(int2Input("-32768"), int2Input("-3"));
}
function evaluate3767() {
    return int2And(int2Input("-32768"), int2Input("-32768"));
}
function evaluate3768() {
    return int2And(int2Input("-32768"), int2Input("32767"));
}
function evaluate3769() {
    return int2And(int2Input("32767"), int2Input(null));
}
function evaluate3770() {
    return int2And(int2Input("32767"), int2Input("0"));
}
function evaluate3771() {
    return int2And(int2Input("32767"), int2Input("1"));
}
function evaluate3772() {
    return int2And(int2Input("32767"), int2Input("-1"));
}
function evaluate3773() {
    return int2And(int2Input("32767"), int2Input("3"));
}
function evaluate3774() {
    return int2And(int2Input("32767"), int2Input("-3"));
}
function evaluate3775() {
    return int2And(int2Input("32767"), int2Input("-32768"));
}
function evaluate3776() {
    return int2And(int2Input("32767"), int2Input("32767"));
}
function evaluate3777() {
    return int2Or(int2Input(null), int2Input(null));
}
function evaluate3778() {
    return int2Or(int2Input(null), int2Input("0"));
}
function evaluate3779() {
    return int2Or(int2Input(null), int2Input("1"));
}
function evaluate3780() {
    return int2Or(int2Input(null), int2Input("-1"));
}
function evaluate3781() {
    return int2Or(int2Input(null), int2Input("3"));
}
function evaluate3782() {
    return int2Or(int2Input(null), int2Input("-3"));
}
function evaluate3783() {
    return int2Or(int2Input(null), int2Input("-32768"));
}
function evaluate3784() {
    return int2Or(int2Input(null), int2Input("32767"));
}
function evaluate3785() {
    return int2Or(int2Input("0"), int2Input(null));
}
function evaluate3786() {
    return int2Or(int2Input("0"), int2Input("0"));
}
function evaluate3787() {
    return int2Or(int2Input("0"), int2Input("1"));
}
function evaluate3788() {
    return int2Or(int2Input("0"), int2Input("-1"));
}
function evaluate3789() {
    return int2Or(int2Input("0"), int2Input("3"));
}
function evaluate3790() {
    return int2Or(int2Input("0"), int2Input("-3"));
}
function evaluate3791() {
    return int2Or(int2Input("0"), int2Input("-32768"));
}
function evaluate3792() {
    return int2Or(int2Input("0"), int2Input("32767"));
}
function evaluate3793() {
    return int2Or(int2Input("1"), int2Input(null));
}
function evaluate3794() {
    return int2Or(int2Input("1"), int2Input("0"));
}
function evaluate3795() {
    return int2Or(int2Input("1"), int2Input("1"));
}
function evaluate3796() {
    return int2Or(int2Input("1"), int2Input("-1"));
}
function evaluate3797() {
    return int2Or(int2Input("1"), int2Input("3"));
}
function evaluate3798() {
    return int2Or(int2Input("1"), int2Input("-3"));
}
function evaluate3799() {
    return int2Or(int2Input("1"), int2Input("-32768"));
}
function evaluate3800() {
    return int2Or(int2Input("1"), int2Input("32767"));
}
function evaluate3801() {
    return int2Or(int2Input("-1"), int2Input(null));
}
function evaluate3802() {
    return int2Or(int2Input("-1"), int2Input("0"));
}
function evaluate3803() {
    return int2Or(int2Input("-1"), int2Input("1"));
}
function evaluate3804() {
    return int2Or(int2Input("-1"), int2Input("-1"));
}
function evaluate3805() {
    return int2Or(int2Input("-1"), int2Input("3"));
}
function evaluate3806() {
    return int2Or(int2Input("-1"), int2Input("-3"));
}
function evaluate3807() {
    return int2Or(int2Input("-1"), int2Input("-32768"));
}
function evaluate3808() {
    return int2Or(int2Input("-1"), int2Input("32767"));
}
function evaluate3809() {
    return int2Or(int2Input("3"), int2Input(null));
}
function evaluate3810() {
    return int2Or(int2Input("3"), int2Input("0"));
}
function evaluate3811() {
    return int2Or(int2Input("3"), int2Input("1"));
}
function evaluate3812() {
    return int2Or(int2Input("3"), int2Input("-1"));
}
function evaluate3813() {
    return int2Or(int2Input("3"), int2Input("3"));
}
function evaluate3814() {
    return int2Or(int2Input("3"), int2Input("-3"));
}
function evaluate3815() {
    return int2Or(int2Input("3"), int2Input("-32768"));
}
function evaluate3816() {
    return int2Or(int2Input("3"), int2Input("32767"));
}
function evaluate3817() {
    return int2Or(int2Input("-3"), int2Input(null));
}
function evaluate3818() {
    return int2Or(int2Input("-3"), int2Input("0"));
}
function evaluate3819() {
    return int2Or(int2Input("-3"), int2Input("1"));
}
function evaluate3820() {
    return int2Or(int2Input("-3"), int2Input("-1"));
}
function evaluate3821() {
    return int2Or(int2Input("-3"), int2Input("3"));
}
function evaluate3822() {
    return int2Or(int2Input("-3"), int2Input("-3"));
}
function evaluate3823() {
    return int2Or(int2Input("-3"), int2Input("-32768"));
}
function evaluate3824() {
    return int2Or(int2Input("-3"), int2Input("32767"));
}
function evaluate3825() {
    return int2Or(int2Input("-32768"), int2Input(null));
}
function evaluate3826() {
    return int2Or(int2Input("-32768"), int2Input("0"));
}
function evaluate3827() {
    return int2Or(int2Input("-32768"), int2Input("1"));
}
function evaluate3828() {
    return int2Or(int2Input("-32768"), int2Input("-1"));
}
function evaluate3829() {
    return int2Or(int2Input("-32768"), int2Input("3"));
}
function evaluate3830() {
    return int2Or(int2Input("-32768"), int2Input("-3"));
}
function evaluate3831() {
    return int2Or(int2Input("-32768"), int2Input("-32768"));
}
function evaluate3832() {
    return int2Or(int2Input("-32768"), int2Input("32767"));
}
function evaluate3833() {
    return int2Or(int2Input("32767"), int2Input(null));
}
function evaluate3834() {
    return int2Or(int2Input("32767"), int2Input("0"));
}
function evaluate3835() {
    return int2Or(int2Input("32767"), int2Input("1"));
}
function evaluate3836() {
    return int2Or(int2Input("32767"), int2Input("-1"));
}
function evaluate3837() {
    return int2Or(int2Input("32767"), int2Input("3"));
}
function evaluate3838() {
    return int2Or(int2Input("32767"), int2Input("-3"));
}
function evaluate3839() {
    return int2Or(int2Input("32767"), int2Input("-32768"));
}
function evaluate3840() {
    return int2Or(int2Input("32767"), int2Input("32767"));
}
function evaluate3841() {
    return int2Xor(int2Input(null), int2Input(null));
}
function evaluate3842() {
    return int2Xor(int2Input(null), int2Input("0"));
}
function evaluate3843() {
    return int2Xor(int2Input(null), int2Input("1"));
}
function evaluate3844() {
    return int2Xor(int2Input(null), int2Input("-1"));
}
function evaluate3845() {
    return int2Xor(int2Input(null), int2Input("3"));
}
function evaluate3846() {
    return int2Xor(int2Input(null), int2Input("-3"));
}
function evaluate3847() {
    return int2Xor(int2Input(null), int2Input("-32768"));
}
function evaluate3848() {
    return int2Xor(int2Input(null), int2Input("32767"));
}
function evaluate3849() {
    return int2Xor(int2Input("0"), int2Input(null));
}
function evaluate3850() {
    return int2Xor(int2Input("0"), int2Input("0"));
}
function evaluate3851() {
    return int2Xor(int2Input("0"), int2Input("1"));
}
function evaluate3852() {
    return int2Xor(int2Input("0"), int2Input("-1"));
}
function evaluate3853() {
    return int2Xor(int2Input("0"), int2Input("3"));
}
function evaluate3854() {
    return int2Xor(int2Input("0"), int2Input("-3"));
}
function evaluate3855() {
    return int2Xor(int2Input("0"), int2Input("-32768"));
}
function evaluate3856() {
    return int2Xor(int2Input("0"), int2Input("32767"));
}
function evaluate3857() {
    return int2Xor(int2Input("1"), int2Input(null));
}
function evaluate3858() {
    return int2Xor(int2Input("1"), int2Input("0"));
}
function evaluate3859() {
    return int2Xor(int2Input("1"), int2Input("1"));
}
function evaluate3860() {
    return int2Xor(int2Input("1"), int2Input("-1"));
}
function evaluate3861() {
    return int2Xor(int2Input("1"), int2Input("3"));
}
function evaluate3862() {
    return int2Xor(int2Input("1"), int2Input("-3"));
}
function evaluate3863() {
    return int2Xor(int2Input("1"), int2Input("-32768"));
}
function evaluate3864() {
    return int2Xor(int2Input("1"), int2Input("32767"));
}
function evaluate3865() {
    return int2Xor(int2Input("-1"), int2Input(null));
}
function evaluate3866() {
    return int2Xor(int2Input("-1"), int2Input("0"));
}
function evaluate3867() {
    return int2Xor(int2Input("-1"), int2Input("1"));
}
function evaluate3868() {
    return int2Xor(int2Input("-1"), int2Input("-1"));
}
function evaluate3869() {
    return int2Xor(int2Input("-1"), int2Input("3"));
}
function evaluate3870() {
    return int2Xor(int2Input("-1"), int2Input("-3"));
}
function evaluate3871() {
    return int2Xor(int2Input("-1"), int2Input("-32768"));
}
function evaluate3872() {
    return int2Xor(int2Input("-1"), int2Input("32767"));
}
function evaluate3873() {
    return int2Xor(int2Input("3"), int2Input(null));
}
function evaluate3874() {
    return int2Xor(int2Input("3"), int2Input("0"));
}
function evaluate3875() {
    return int2Xor(int2Input("3"), int2Input("1"));
}
function evaluate3876() {
    return int2Xor(int2Input("3"), int2Input("-1"));
}
function evaluate3877() {
    return int2Xor(int2Input("3"), int2Input("3"));
}
function evaluate3878() {
    return int2Xor(int2Input("3"), int2Input("-3"));
}
function evaluate3879() {
    return int2Xor(int2Input("3"), int2Input("-32768"));
}
function evaluate3880() {
    return int2Xor(int2Input("3"), int2Input("32767"));
}
function evaluate3881() {
    return int2Xor(int2Input("-3"), int2Input(null));
}
function evaluate3882() {
    return int2Xor(int2Input("-3"), int2Input("0"));
}
function evaluate3883() {
    return int2Xor(int2Input("-3"), int2Input("1"));
}
function evaluate3884() {
    return int2Xor(int2Input("-3"), int2Input("-1"));
}
function evaluate3885() {
    return int2Xor(int2Input("-3"), int2Input("3"));
}
function evaluate3886() {
    return int2Xor(int2Input("-3"), int2Input("-3"));
}
function evaluate3887() {
    return int2Xor(int2Input("-3"), int2Input("-32768"));
}
function evaluate3888() {
    return int2Xor(int2Input("-3"), int2Input("32767"));
}
function evaluate3889() {
    return int2Xor(int2Input("-32768"), int2Input(null));
}
function evaluate3890() {
    return int2Xor(int2Input("-32768"), int2Input("0"));
}
function evaluate3891() {
    return int2Xor(int2Input("-32768"), int2Input("1"));
}
function evaluate3892() {
    return int2Xor(int2Input("-32768"), int2Input("-1"));
}
function evaluate3893() {
    return int2Xor(int2Input("-32768"), int2Input("3"));
}
function evaluate3894() {
    return int2Xor(int2Input("-32768"), int2Input("-3"));
}
function evaluate3895() {
    return int2Xor(int2Input("-32768"), int2Input("-32768"));
}
function evaluate3896() {
    return int2Xor(int2Input("-32768"), int2Input("32767"));
}
function evaluate3897() {
    return int2Xor(int2Input("32767"), int2Input(null));
}
function evaluate3898() {
    return int2Xor(int2Input("32767"), int2Input("0"));
}
function evaluate3899() {
    return int2Xor(int2Input("32767"), int2Input("1"));
}
function evaluate3900() {
    return int2Xor(int2Input("32767"), int2Input("-1"));
}
function evaluate3901() {
    return int2Xor(int2Input("32767"), int2Input("3"));
}
function evaluate3902() {
    return int2Xor(int2Input("32767"), int2Input("-3"));
}
function evaluate3903() {
    return int2Xor(int2Input("32767"), int2Input("-32768"));
}
function evaluate3904() {
    return int2Xor(int2Input("32767"), int2Input("32767"));
}
function evaluate3905() {
    return int2Not(int2Input(null));
}
function evaluate3906() {
    return int2Not(int2Input("0"));
}
function evaluate3907() {
    return int2Not(int2Input("1"));
}
function evaluate3908() {
    return int2Not(int2Input("-1"));
}
function evaluate3909() {
    return int2Not(int2Input("3"));
}
function evaluate3910() {
    return int2Not(int2Input("-3"));
}
function evaluate3911() {
    return int2Not(int2Input("-32768"));
}
function evaluate3912() {
    return int2Not(int2Input("32767"));
}
function evaluate3913() {
    return int2Identity(int2Input(null));
}
function evaluate3914() {
    return int2Identity(int2Input("0"));
}
function evaluate3915() {
    return int2Identity(int2Input("1"));
}
function evaluate3916() {
    return int2Identity(int2Input("-1"));
}
function evaluate3917() {
    return int2Identity(int2Input("3"));
}
function evaluate3918() {
    return int2Identity(int2Input("-3"));
}
function evaluate3919() {
    return int2Identity(int2Input("-32768"));
}
function evaluate3920() {
    return int2Identity(int2Input("32767"));
}
function evaluate3921() {
    return int2Abs(int2Input(null));
}
function evaluate3922() {
    return int2Abs(int2Input("0"));
}
function evaluate3923() {
    return int2Abs(int2Input("1"));
}
function evaluate3924() {
    return int2Abs(int2Input("-1"));
}
function evaluate3925() {
    return int2Abs(int2Input("3"));
}
function evaluate3926() {
    return int2Abs(int2Input("-3"));
}
function evaluate3927() {
    return int2Abs(int2Input("-32768"));
}
function evaluate3928() {
    return int2Abs(int2Input("32767"));
}
function evaluate3929() {
    return int2Shl(int2Input(null), int4Input(null));
}
function evaluate3930() {
    return int2Shl(int2Input(null), int4Input("-2147483648"));
}
function evaluate3931() {
    return int2Shl(int2Input(null), int4Input("-65"));
}
function evaluate3932() {
    return int2Shl(int2Input(null), int4Input("-64"));
}
function evaluate3933() {
    return int2Shl(int2Input(null), int4Input("-33"));
}
function evaluate3934() {
    return int2Shl(int2Input(null), int4Input("-32"));
}
function evaluate3935() {
    return int2Shl(int2Input(null), int4Input("-17"));
}
function evaluate3936() {
    return int2Shl(int2Input(null), int4Input("-16"));
}
function evaluate3937() {
    return int2Shl(int2Input(null), int4Input("-1"));
}
function evaluate3938() {
    return int2Shl(int2Input(null), int4Input("0"));
}
function evaluate3939() {
    return int2Shl(int2Input(null), int4Input("1"));
}
function evaluate3940() {
    return int2Shl(int2Input(null), int4Input("15"));
}
function evaluate3941() {
    return int2Shl(int2Input(null), int4Input("16"));
}
function evaluate3942() {
    return int2Shl(int2Input(null), int4Input("17"));
}
function evaluate3943() {
    return int2Shl(int2Input(null), int4Input("31"));
}
function evaluate3944() {
    return int2Shl(int2Input(null), int4Input("32"));
}
function evaluate3945() {
    return int2Shl(int2Input(null), int4Input("33"));
}
function evaluate3946() {
    return int2Shl(int2Input(null), int4Input("63"));
}
function evaluate3947() {
    return int2Shl(int2Input(null), int4Input("64"));
}
function evaluate3948() {
    return int2Shl(int2Input(null), int4Input("65"));
}
function evaluate3949() {
    return int2Shl(int2Input(null), int4Input("2147483647"));
}
function evaluate3950() {
    return int2Shl(int2Input("0"), int4Input(null));
}
function evaluate3951() {
    return int2Shl(int2Input("0"), int4Input("-2147483648"));
}
function evaluate3952() {
    return int2Shl(int2Input("0"), int4Input("-65"));
}
function evaluate3953() {
    return int2Shl(int2Input("0"), int4Input("-64"));
}
function evaluate3954() {
    return int2Shl(int2Input("0"), int4Input("-33"));
}
function evaluate3955() {
    return int2Shl(int2Input("0"), int4Input("-32"));
}
function evaluate3956() {
    return int2Shl(int2Input("0"), int4Input("-17"));
}
function evaluate3957() {
    return int2Shl(int2Input("0"), int4Input("-16"));
}
function evaluate3958() {
    return int2Shl(int2Input("0"), int4Input("-1"));
}
function evaluate3959() {
    return int2Shl(int2Input("0"), int4Input("0"));
}
function evaluate3960() {
    return int2Shl(int2Input("0"), int4Input("1"));
}
function evaluate3961() {
    return int2Shl(int2Input("0"), int4Input("15"));
}
function evaluate3962() {
    return int2Shl(int2Input("0"), int4Input("16"));
}
function evaluate3963() {
    return int2Shl(int2Input("0"), int4Input("17"));
}
function evaluate3964() {
    return int2Shl(int2Input("0"), int4Input("31"));
}
function evaluate3965() {
    return int2Shl(int2Input("0"), int4Input("32"));
}
function evaluate3966() {
    return int2Shl(int2Input("0"), int4Input("33"));
}
function evaluate3967() {
    return int2Shl(int2Input("0"), int4Input("63"));
}
function evaluate3968() {
    return int2Shl(int2Input("0"), int4Input("64"));
}
function evaluate3969() {
    return int2Shl(int2Input("0"), int4Input("65"));
}
function evaluate3970() {
    return int2Shl(int2Input("0"), int4Input("2147483647"));
}
function evaluate3971() {
    return int2Shl(int2Input("1"), int4Input(null));
}
function evaluate3972() {
    return int2Shl(int2Input("1"), int4Input("-2147483648"));
}
function evaluate3973() {
    return int2Shl(int2Input("1"), int4Input("-65"));
}
function evaluate3974() {
    return int2Shl(int2Input("1"), int4Input("-64"));
}
function evaluate3975() {
    return int2Shl(int2Input("1"), int4Input("-33"));
}
function evaluate3976() {
    return int2Shl(int2Input("1"), int4Input("-32"));
}
function evaluate3977() {
    return int2Shl(int2Input("1"), int4Input("-17"));
}
function evaluate3978() {
    return int2Shl(int2Input("1"), int4Input("-16"));
}
function evaluate3979() {
    return int2Shl(int2Input("1"), int4Input("-1"));
}
function evaluate3980() {
    return int2Shl(int2Input("1"), int4Input("0"));
}
function evaluate3981() {
    return int2Shl(int2Input("1"), int4Input("1"));
}
function evaluate3982() {
    return int2Shl(int2Input("1"), int4Input("15"));
}
function evaluate3983() {
    return int2Shl(int2Input("1"), int4Input("16"));
}
function evaluate3984() {
    return int2Shl(int2Input("1"), int4Input("17"));
}
function evaluate3985() {
    return int2Shl(int2Input("1"), int4Input("31"));
}
function evaluate3986() {
    return int2Shl(int2Input("1"), int4Input("32"));
}
function evaluate3987() {
    return int2Shl(int2Input("1"), int4Input("33"));
}
function evaluate3988() {
    return int2Shl(int2Input("1"), int4Input("63"));
}
function evaluate3989() {
    return int2Shl(int2Input("1"), int4Input("64"));
}
function evaluate3990() {
    return int2Shl(int2Input("1"), int4Input("65"));
}
function evaluate3991() {
    return int2Shl(int2Input("1"), int4Input("2147483647"));
}
function evaluate3992() {
    return int2Shl(int2Input("-1"), int4Input(null));
}
function evaluate3993() {
    return int2Shl(int2Input("-1"), int4Input("-2147483648"));
}
function evaluate3994() {
    return int2Shl(int2Input("-1"), int4Input("-65"));
}
function evaluate3995() {
    return int2Shl(int2Input("-1"), int4Input("-64"));
}
function evaluate3996() {
    return int2Shl(int2Input("-1"), int4Input("-33"));
}
function evaluate3997() {
    return int2Shl(int2Input("-1"), int4Input("-32"));
}
function evaluate3998() {
    return int2Shl(int2Input("-1"), int4Input("-17"));
}
function evaluate3999() {
    return int2Shl(int2Input("-1"), int4Input("-16"));
}
function evaluate4000() {
    return int2Shl(int2Input("-1"), int4Input("-1"));
}
function evaluate4001() {
    return int2Shl(int2Input("-1"), int4Input("0"));
}
function evaluate4002() {
    return int2Shl(int2Input("-1"), int4Input("1"));
}
function evaluate4003() {
    return int2Shl(int2Input("-1"), int4Input("15"));
}
function evaluate4004() {
    return int2Shl(int2Input("-1"), int4Input("16"));
}
function evaluate4005() {
    return int2Shl(int2Input("-1"), int4Input("17"));
}
function evaluate4006() {
    return int2Shl(int2Input("-1"), int4Input("31"));
}
function evaluate4007() {
    return int2Shl(int2Input("-1"), int4Input("32"));
}
function evaluate4008() {
    return int2Shl(int2Input("-1"), int4Input("33"));
}
function evaluate4009() {
    return int2Shl(int2Input("-1"), int4Input("63"));
}
function evaluate4010() {
    return int2Shl(int2Input("-1"), int4Input("64"));
}
function evaluate4011() {
    return int2Shl(int2Input("-1"), int4Input("65"));
}
function evaluate4012() {
    return int2Shl(int2Input("-1"), int4Input("2147483647"));
}
function evaluate4013() {
    return int2Shl(int2Input("3"), int4Input(null));
}
function evaluate4014() {
    return int2Shl(int2Input("3"), int4Input("-2147483648"));
}
function evaluate4015() {
    return int2Shl(int2Input("3"), int4Input("-65"));
}
function evaluate4016() {
    return int2Shl(int2Input("3"), int4Input("-64"));
}
function evaluate4017() {
    return int2Shl(int2Input("3"), int4Input("-33"));
}
function evaluate4018() {
    return int2Shl(int2Input("3"), int4Input("-32"));
}
function evaluate4019() {
    return int2Shl(int2Input("3"), int4Input("-17"));
}
function evaluate4020() {
    return int2Shl(int2Input("3"), int4Input("-16"));
}
function evaluate4021() {
    return int2Shl(int2Input("3"), int4Input("-1"));
}
function evaluate4022() {
    return int2Shl(int2Input("3"), int4Input("0"));
}
function evaluate4023() {
    return int2Shl(int2Input("3"), int4Input("1"));
}
function evaluate4024() {
    return int2Shl(int2Input("3"), int4Input("15"));
}
function evaluate4025() {
    return int2Shl(int2Input("3"), int4Input("16"));
}
function evaluate4026() {
    return int2Shl(int2Input("3"), int4Input("17"));
}
function evaluate4027() {
    return int2Shl(int2Input("3"), int4Input("31"));
}
function evaluate4028() {
    return int2Shl(int2Input("3"), int4Input("32"));
}
function evaluate4029() {
    return int2Shl(int2Input("3"), int4Input("33"));
}
function evaluate4030() {
    return int2Shl(int2Input("3"), int4Input("63"));
}
function evaluate4031() {
    return int2Shl(int2Input("3"), int4Input("64"));
}
function evaluate4032() {
    return int2Shl(int2Input("3"), int4Input("65"));
}
function evaluate4033() {
    return int2Shl(int2Input("3"), int4Input("2147483647"));
}
function evaluate4034() {
    return int2Shl(int2Input("-3"), int4Input(null));
}
function evaluate4035() {
    return int2Shl(int2Input("-3"), int4Input("-2147483648"));
}
function evaluate4036() {
    return int2Shl(int2Input("-3"), int4Input("-65"));
}
function evaluate4037() {
    return int2Shl(int2Input("-3"), int4Input("-64"));
}
function evaluate4038() {
    return int2Shl(int2Input("-3"), int4Input("-33"));
}
function evaluate4039() {
    return int2Shl(int2Input("-3"), int4Input("-32"));
}
function evaluate4040() {
    return int2Shl(int2Input("-3"), int4Input("-17"));
}
function evaluate4041() {
    return int2Shl(int2Input("-3"), int4Input("-16"));
}
function evaluate4042() {
    return int2Shl(int2Input("-3"), int4Input("-1"));
}
function evaluate4043() {
    return int2Shl(int2Input("-3"), int4Input("0"));
}
function evaluate4044() {
    return int2Shl(int2Input("-3"), int4Input("1"));
}
function evaluate4045() {
    return int2Shl(int2Input("-3"), int4Input("15"));
}
function evaluate4046() {
    return int2Shl(int2Input("-3"), int4Input("16"));
}
function evaluate4047() {
    return int2Shl(int2Input("-3"), int4Input("17"));
}
function evaluate4048() {
    return int2Shl(int2Input("-3"), int4Input("31"));
}
function evaluate4049() {
    return int2Shl(int2Input("-3"), int4Input("32"));
}
function evaluate4050() {
    return int2Shl(int2Input("-3"), int4Input("33"));
}
function evaluate4051() {
    return int2Shl(int2Input("-3"), int4Input("63"));
}
function evaluate4052() {
    return int2Shl(int2Input("-3"), int4Input("64"));
}
function evaluate4053() {
    return int2Shl(int2Input("-3"), int4Input("65"));
}
function evaluate4054() {
    return int2Shl(int2Input("-3"), int4Input("2147483647"));
}
function evaluate4055() {
    return int2Shl(int2Input("-32768"), int4Input(null));
}
function evaluate4056() {
    return int2Shl(int2Input("-32768"), int4Input("-2147483648"));
}
function evaluate4057() {
    return int2Shl(int2Input("-32768"), int4Input("-65"));
}
function evaluate4058() {
    return int2Shl(int2Input("-32768"), int4Input("-64"));
}
function evaluate4059() {
    return int2Shl(int2Input("-32768"), int4Input("-33"));
}
function evaluate4060() {
    return int2Shl(int2Input("-32768"), int4Input("-32"));
}
function evaluate4061() {
    return int2Shl(int2Input("-32768"), int4Input("-17"));
}
function evaluate4062() {
    return int2Shl(int2Input("-32768"), int4Input("-16"));
}
function evaluate4063() {
    return int2Shl(int2Input("-32768"), int4Input("-1"));
}
function evaluate4064() {
    return int2Shl(int2Input("-32768"), int4Input("0"));
}
function evaluate4065() {
    return int2Shl(int2Input("-32768"), int4Input("1"));
}
function evaluate4066() {
    return int2Shl(int2Input("-32768"), int4Input("15"));
}
function evaluate4067() {
    return int2Shl(int2Input("-32768"), int4Input("16"));
}
function evaluate4068() {
    return int2Shl(int2Input("-32768"), int4Input("17"));
}
function evaluate4069() {
    return int2Shl(int2Input("-32768"), int4Input("31"));
}
function evaluate4070() {
    return int2Shl(int2Input("-32768"), int4Input("32"));
}
function evaluate4071() {
    return int2Shl(int2Input("-32768"), int4Input("33"));
}
function evaluate4072() {
    return int2Shl(int2Input("-32768"), int4Input("63"));
}
function evaluate4073() {
    return int2Shl(int2Input("-32768"), int4Input("64"));
}
function evaluate4074() {
    return int2Shl(int2Input("-32768"), int4Input("65"));
}
function evaluate4075() {
    return int2Shl(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate4076() {
    return int2Shl(int2Input("32767"), int4Input(null));
}
function evaluate4077() {
    return int2Shl(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate4078() {
    return int2Shl(int2Input("32767"), int4Input("-65"));
}
function evaluate4079() {
    return int2Shl(int2Input("32767"), int4Input("-64"));
}
function evaluate4080() {
    return int2Shl(int2Input("32767"), int4Input("-33"));
}
function evaluate4081() {
    return int2Shl(int2Input("32767"), int4Input("-32"));
}
function evaluate4082() {
    return int2Shl(int2Input("32767"), int4Input("-17"));
}
function evaluate4083() {
    return int2Shl(int2Input("32767"), int4Input("-16"));
}
function evaluate4084() {
    return int2Shl(int2Input("32767"), int4Input("-1"));
}
function evaluate4085() {
    return int2Shl(int2Input("32767"), int4Input("0"));
}
function evaluate4086() {
    return int2Shl(int2Input("32767"), int4Input("1"));
}
function evaluate4087() {
    return int2Shl(int2Input("32767"), int4Input("15"));
}
function evaluate4088() {
    return int2Shl(int2Input("32767"), int4Input("16"));
}
function evaluate4089() {
    return int2Shl(int2Input("32767"), int4Input("17"));
}
function evaluate4090() {
    return int2Shl(int2Input("32767"), int4Input("31"));
}
function evaluate4091() {
    return int2Shl(int2Input("32767"), int4Input("32"));
}
function evaluate4092() {
    return int2Shl(int2Input("32767"), int4Input("33"));
}
function evaluate4093() {
    return int2Shl(int2Input("32767"), int4Input("63"));
}
function evaluate4094() {
    return int2Shl(int2Input("32767"), int4Input("64"));
}
function evaluate4095() {
    return int2Shl(int2Input("32767"), int4Input("65"));
}
function evaluate4096() {
    return int2Shl(int2Input("32767"), int4Input("2147483647"));
}
function evaluate4097() {
    return int2Shr(int2Input(null), int4Input(null));
}
function evaluate4098() {
    return int2Shr(int2Input(null), int4Input("-2147483648"));
}
function evaluate4099() {
    return int2Shr(int2Input(null), int4Input("-65"));
}
function evaluate4100() {
    return int2Shr(int2Input(null), int4Input("-64"));
}
function evaluate4101() {
    return int2Shr(int2Input(null), int4Input("-33"));
}
function evaluate4102() {
    return int2Shr(int2Input(null), int4Input("-32"));
}
function evaluate4103() {
    return int2Shr(int2Input(null), int4Input("-17"));
}
function evaluate4104() {
    return int2Shr(int2Input(null), int4Input("-16"));
}
function evaluate4105() {
    return int2Shr(int2Input(null), int4Input("-1"));
}
function evaluate4106() {
    return int2Shr(int2Input(null), int4Input("0"));
}
function evaluate4107() {
    return int2Shr(int2Input(null), int4Input("1"));
}
function evaluate4108() {
    return int2Shr(int2Input(null), int4Input("15"));
}
function evaluate4109() {
    return int2Shr(int2Input(null), int4Input("16"));
}
function evaluate4110() {
    return int2Shr(int2Input(null), int4Input("17"));
}
function evaluate4111() {
    return int2Shr(int2Input(null), int4Input("31"));
}
function evaluate4112() {
    return int2Shr(int2Input(null), int4Input("32"));
}
function evaluate4113() {
    return int2Shr(int2Input(null), int4Input("33"));
}
function evaluate4114() {
    return int2Shr(int2Input(null), int4Input("63"));
}
function evaluate4115() {
    return int2Shr(int2Input(null), int4Input("64"));
}
function evaluate4116() {
    return int2Shr(int2Input(null), int4Input("65"));
}
function evaluate4117() {
    return int2Shr(int2Input(null), int4Input("2147483647"));
}
function evaluate4118() {
    return int2Shr(int2Input("0"), int4Input(null));
}
function evaluate4119() {
    return int2Shr(int2Input("0"), int4Input("-2147483648"));
}
function evaluate4120() {
    return int2Shr(int2Input("0"), int4Input("-65"));
}
function evaluate4121() {
    return int2Shr(int2Input("0"), int4Input("-64"));
}
function evaluate4122() {
    return int2Shr(int2Input("0"), int4Input("-33"));
}
function evaluate4123() {
    return int2Shr(int2Input("0"), int4Input("-32"));
}
function evaluate4124() {
    return int2Shr(int2Input("0"), int4Input("-17"));
}
function evaluate4125() {
    return int2Shr(int2Input("0"), int4Input("-16"));
}
function evaluate4126() {
    return int2Shr(int2Input("0"), int4Input("-1"));
}
function evaluate4127() {
    return int2Shr(int2Input("0"), int4Input("0"));
}
function evaluate4128() {
    return int2Shr(int2Input("0"), int4Input("1"));
}
function evaluate4129() {
    return int2Shr(int2Input("0"), int4Input("15"));
}
function evaluate4130() {
    return int2Shr(int2Input("0"), int4Input("16"));
}
function evaluate4131() {
    return int2Shr(int2Input("0"), int4Input("17"));
}
function evaluate4132() {
    return int2Shr(int2Input("0"), int4Input("31"));
}
function evaluate4133() {
    return int2Shr(int2Input("0"), int4Input("32"));
}
function evaluate4134() {
    return int2Shr(int2Input("0"), int4Input("33"));
}
function evaluate4135() {
    return int2Shr(int2Input("0"), int4Input("63"));
}
function evaluate4136() {
    return int2Shr(int2Input("0"), int4Input("64"));
}
function evaluate4137() {
    return int2Shr(int2Input("0"), int4Input("65"));
}
function evaluate4138() {
    return int2Shr(int2Input("0"), int4Input("2147483647"));
}
function evaluate4139() {
    return int2Shr(int2Input("1"), int4Input(null));
}
function evaluate4140() {
    return int2Shr(int2Input("1"), int4Input("-2147483648"));
}
function evaluate4141() {
    return int2Shr(int2Input("1"), int4Input("-65"));
}
function evaluate4142() {
    return int2Shr(int2Input("1"), int4Input("-64"));
}
function evaluate4143() {
    return int2Shr(int2Input("1"), int4Input("-33"));
}
function evaluate4144() {
    return int2Shr(int2Input("1"), int4Input("-32"));
}
function evaluate4145() {
    return int2Shr(int2Input("1"), int4Input("-17"));
}
function evaluate4146() {
    return int2Shr(int2Input("1"), int4Input("-16"));
}
function evaluate4147() {
    return int2Shr(int2Input("1"), int4Input("-1"));
}
function evaluate4148() {
    return int2Shr(int2Input("1"), int4Input("0"));
}
function evaluate4149() {
    return int2Shr(int2Input("1"), int4Input("1"));
}
function evaluate4150() {
    return int2Shr(int2Input("1"), int4Input("15"));
}
function evaluate4151() {
    return int2Shr(int2Input("1"), int4Input("16"));
}
function evaluate4152() {
    return int2Shr(int2Input("1"), int4Input("17"));
}
function evaluate4153() {
    return int2Shr(int2Input("1"), int4Input("31"));
}
function evaluate4154() {
    return int2Shr(int2Input("1"), int4Input("32"));
}
function evaluate4155() {
    return int2Shr(int2Input("1"), int4Input("33"));
}
function evaluate4156() {
    return int2Shr(int2Input("1"), int4Input("63"));
}
function evaluate4157() {
    return int2Shr(int2Input("1"), int4Input("64"));
}
function evaluate4158() {
    return int2Shr(int2Input("1"), int4Input("65"));
}
function evaluate4159() {
    return int2Shr(int2Input("1"), int4Input("2147483647"));
}
function evaluate4160() {
    return int2Shr(int2Input("-1"), int4Input(null));
}
function evaluate4161() {
    return int2Shr(int2Input("-1"), int4Input("-2147483648"));
}
function evaluate4162() {
    return int2Shr(int2Input("-1"), int4Input("-65"));
}
function evaluate4163() {
    return int2Shr(int2Input("-1"), int4Input("-64"));
}
function evaluate4164() {
    return int2Shr(int2Input("-1"), int4Input("-33"));
}
function evaluate4165() {
    return int2Shr(int2Input("-1"), int4Input("-32"));
}
function evaluate4166() {
    return int2Shr(int2Input("-1"), int4Input("-17"));
}
function evaluate4167() {
    return int2Shr(int2Input("-1"), int4Input("-16"));
}
function evaluate4168() {
    return int2Shr(int2Input("-1"), int4Input("-1"));
}
function evaluate4169() {
    return int2Shr(int2Input("-1"), int4Input("0"));
}
function evaluate4170() {
    return int2Shr(int2Input("-1"), int4Input("1"));
}
function evaluate4171() {
    return int2Shr(int2Input("-1"), int4Input("15"));
}
function evaluate4172() {
    return int2Shr(int2Input("-1"), int4Input("16"));
}
function evaluate4173() {
    return int2Shr(int2Input("-1"), int4Input("17"));
}
function evaluate4174() {
    return int2Shr(int2Input("-1"), int4Input("31"));
}
function evaluate4175() {
    return int2Shr(int2Input("-1"), int4Input("32"));
}
function evaluate4176() {
    return int2Shr(int2Input("-1"), int4Input("33"));
}
function evaluate4177() {
    return int2Shr(int2Input("-1"), int4Input("63"));
}
function evaluate4178() {
    return int2Shr(int2Input("-1"), int4Input("64"));
}
function evaluate4179() {
    return int2Shr(int2Input("-1"), int4Input("65"));
}
function evaluate4180() {
    return int2Shr(int2Input("-1"), int4Input("2147483647"));
}
function evaluate4181() {
    return int2Shr(int2Input("3"), int4Input(null));
}
function evaluate4182() {
    return int2Shr(int2Input("3"), int4Input("-2147483648"));
}
function evaluate4183() {
    return int2Shr(int2Input("3"), int4Input("-65"));
}
function evaluate4184() {
    return int2Shr(int2Input("3"), int4Input("-64"));
}
function evaluate4185() {
    return int2Shr(int2Input("3"), int4Input("-33"));
}
function evaluate4186() {
    return int2Shr(int2Input("3"), int4Input("-32"));
}
function evaluate4187() {
    return int2Shr(int2Input("3"), int4Input("-17"));
}
function evaluate4188() {
    return int2Shr(int2Input("3"), int4Input("-16"));
}
function evaluate4189() {
    return int2Shr(int2Input("3"), int4Input("-1"));
}
function evaluate4190() {
    return int2Shr(int2Input("3"), int4Input("0"));
}
function evaluate4191() {
    return int2Shr(int2Input("3"), int4Input("1"));
}
function evaluate4192() {
    return int2Shr(int2Input("3"), int4Input("15"));
}
function evaluate4193() {
    return int2Shr(int2Input("3"), int4Input("16"));
}
function evaluate4194() {
    return int2Shr(int2Input("3"), int4Input("17"));
}
function evaluate4195() {
    return int2Shr(int2Input("3"), int4Input("31"));
}
function evaluate4196() {
    return int2Shr(int2Input("3"), int4Input("32"));
}
function evaluate4197() {
    return int2Shr(int2Input("3"), int4Input("33"));
}
function evaluate4198() {
    return int2Shr(int2Input("3"), int4Input("63"));
}
function evaluate4199() {
    return int2Shr(int2Input("3"), int4Input("64"));
}
function evaluate4200() {
    return int2Shr(int2Input("3"), int4Input("65"));
}
function evaluate4201() {
    return int2Shr(int2Input("3"), int4Input("2147483647"));
}
function evaluate4202() {
    return int2Shr(int2Input("-3"), int4Input(null));
}
function evaluate4203() {
    return int2Shr(int2Input("-3"), int4Input("-2147483648"));
}
function evaluate4204() {
    return int2Shr(int2Input("-3"), int4Input("-65"));
}
function evaluate4205() {
    return int2Shr(int2Input("-3"), int4Input("-64"));
}
function evaluate4206() {
    return int2Shr(int2Input("-3"), int4Input("-33"));
}
function evaluate4207() {
    return int2Shr(int2Input("-3"), int4Input("-32"));
}
function evaluate4208() {
    return int2Shr(int2Input("-3"), int4Input("-17"));
}
function evaluate4209() {
    return int2Shr(int2Input("-3"), int4Input("-16"));
}
function evaluate4210() {
    return int2Shr(int2Input("-3"), int4Input("-1"));
}
function evaluate4211() {
    return int2Shr(int2Input("-3"), int4Input("0"));
}
function evaluate4212() {
    return int2Shr(int2Input("-3"), int4Input("1"));
}
function evaluate4213() {
    return int2Shr(int2Input("-3"), int4Input("15"));
}
function evaluate4214() {
    return int2Shr(int2Input("-3"), int4Input("16"));
}
function evaluate4215() {
    return int2Shr(int2Input("-3"), int4Input("17"));
}
function evaluate4216() {
    return int2Shr(int2Input("-3"), int4Input("31"));
}
function evaluate4217() {
    return int2Shr(int2Input("-3"), int4Input("32"));
}
function evaluate4218() {
    return int2Shr(int2Input("-3"), int4Input("33"));
}
function evaluate4219() {
    return int2Shr(int2Input("-3"), int4Input("63"));
}
function evaluate4220() {
    return int2Shr(int2Input("-3"), int4Input("64"));
}
function evaluate4221() {
    return int2Shr(int2Input("-3"), int4Input("65"));
}
function evaluate4222() {
    return int2Shr(int2Input("-3"), int4Input("2147483647"));
}
function evaluate4223() {
    return int2Shr(int2Input("-32768"), int4Input(null));
}
function evaluate4224() {
    return int2Shr(int2Input("-32768"), int4Input("-2147483648"));
}
function evaluate4225() {
    return int2Shr(int2Input("-32768"), int4Input("-65"));
}
function evaluate4226() {
    return int2Shr(int2Input("-32768"), int4Input("-64"));
}
function evaluate4227() {
    return int2Shr(int2Input("-32768"), int4Input("-33"));
}
function evaluate4228() {
    return int2Shr(int2Input("-32768"), int4Input("-32"));
}
function evaluate4229() {
    return int2Shr(int2Input("-32768"), int4Input("-17"));
}
function evaluate4230() {
    return int2Shr(int2Input("-32768"), int4Input("-16"));
}
function evaluate4231() {
    return int2Shr(int2Input("-32768"), int4Input("-1"));
}
function evaluate4232() {
    return int2Shr(int2Input("-32768"), int4Input("0"));
}
function evaluate4233() {
    return int2Shr(int2Input("-32768"), int4Input("1"));
}
function evaluate4234() {
    return int2Shr(int2Input("-32768"), int4Input("15"));
}
function evaluate4235() {
    return int2Shr(int2Input("-32768"), int4Input("16"));
}
function evaluate4236() {
    return int2Shr(int2Input("-32768"), int4Input("17"));
}
function evaluate4237() {
    return int2Shr(int2Input("-32768"), int4Input("31"));
}
function evaluate4238() {
    return int2Shr(int2Input("-32768"), int4Input("32"));
}
function evaluate4239() {
    return int2Shr(int2Input("-32768"), int4Input("33"));
}
function evaluate4240() {
    return int2Shr(int2Input("-32768"), int4Input("63"));
}
function evaluate4241() {
    return int2Shr(int2Input("-32768"), int4Input("64"));
}
function evaluate4242() {
    return int2Shr(int2Input("-32768"), int4Input("65"));
}
function evaluate4243() {
    return int2Shr(int2Input("-32768"), int4Input("2147483647"));
}
function evaluate4244() {
    return int2Shr(int2Input("32767"), int4Input(null));
}
function evaluate4245() {
    return int2Shr(int2Input("32767"), int4Input("-2147483648"));
}
function evaluate4246() {
    return int2Shr(int2Input("32767"), int4Input("-65"));
}
function evaluate4247() {
    return int2Shr(int2Input("32767"), int4Input("-64"));
}
function evaluate4248() {
    return int2Shr(int2Input("32767"), int4Input("-33"));
}
function evaluate4249() {
    return int2Shr(int2Input("32767"), int4Input("-32"));
}
function evaluate4250() {
    return int2Shr(int2Input("32767"), int4Input("-17"));
}
function evaluate4251() {
    return int2Shr(int2Input("32767"), int4Input("-16"));
}
function evaluate4252() {
    return int2Shr(int2Input("32767"), int4Input("-1"));
}
function evaluate4253() {
    return int2Shr(int2Input("32767"), int4Input("0"));
}
function evaluate4254() {
    return int2Shr(int2Input("32767"), int4Input("1"));
}
function evaluate4255() {
    return int2Shr(int2Input("32767"), int4Input("15"));
}
function evaluate4256() {
    return int2Shr(int2Input("32767"), int4Input("16"));
}
function evaluate4257() {
    return int2Shr(int2Input("32767"), int4Input("17"));
}
function evaluate4258() {
    return int2Shr(int2Input("32767"), int4Input("31"));
}
function evaluate4259() {
    return int2Shr(int2Input("32767"), int4Input("32"));
}
function evaluate4260() {
    return int2Shr(int2Input("32767"), int4Input("33"));
}
function evaluate4261() {
    return int2Shr(int2Input("32767"), int4Input("63"));
}
function evaluate4262() {
    return int2Shr(int2Input("32767"), int4Input("64"));
}
function evaluate4263() {
    return int2Shr(int2Input("32767"), int4Input("65"));
}
function evaluate4264() {
    return int2Shr(int2Input("32767"), int4Input("2147483647"));
}
function evaluate4265() {
    return int4And(int4Input(null), int4Input(null));
}
function evaluate4266() {
    return int4And(int4Input(null), int4Input("0"));
}
function evaluate4267() {
    return int4And(int4Input(null), int4Input("1"));
}
function evaluate4268() {
    return int4And(int4Input(null), int4Input("-1"));
}
function evaluate4269() {
    return int4And(int4Input(null), int4Input("3"));
}
function evaluate4270() {
    return int4And(int4Input(null), int4Input("-3"));
}
function evaluate4271() {
    return int4And(int4Input(null), int4Input("-2147483648"));
}
function evaluate4272() {
    return int4And(int4Input(null), int4Input("2147483647"));
}
function evaluate4273() {
    return int4And(int4Input("0"), int4Input(null));
}
function evaluate4274() {
    return int4And(int4Input("0"), int4Input("0"));
}
function evaluate4275() {
    return int4And(int4Input("0"), int4Input("1"));
}
function evaluate4276() {
    return int4And(int4Input("0"), int4Input("-1"));
}
function evaluate4277() {
    return int4And(int4Input("0"), int4Input("3"));
}
function evaluate4278() {
    return int4And(int4Input("0"), int4Input("-3"));
}
function evaluate4279() {
    return int4And(int4Input("0"), int4Input("-2147483648"));
}
function evaluate4280() {
    return int4And(int4Input("0"), int4Input("2147483647"));
}
function evaluate4281() {
    return int4And(int4Input("1"), int4Input(null));
}
function evaluate4282() {
    return int4And(int4Input("1"), int4Input("0"));
}
function evaluate4283() {
    return int4And(int4Input("1"), int4Input("1"));
}
function evaluate4284() {
    return int4And(int4Input("1"), int4Input("-1"));
}
function evaluate4285() {
    return int4And(int4Input("1"), int4Input("3"));
}
function evaluate4286() {
    return int4And(int4Input("1"), int4Input("-3"));
}
function evaluate4287() {
    return int4And(int4Input("1"), int4Input("-2147483648"));
}
function evaluate4288() {
    return int4And(int4Input("1"), int4Input("2147483647"));
}
function evaluate4289() {
    return int4And(int4Input("-1"), int4Input(null));
}
function evaluate4290() {
    return int4And(int4Input("-1"), int4Input("0"));
}
function evaluate4291() {
    return int4And(int4Input("-1"), int4Input("1"));
}
function evaluate4292() {
    return int4And(int4Input("-1"), int4Input("-1"));
}
function evaluate4293() {
    return int4And(int4Input("-1"), int4Input("3"));
}
function evaluate4294() {
    return int4And(int4Input("-1"), int4Input("-3"));
}
function evaluate4295() {
    return int4And(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate4296() {
    return int4And(int4Input("-1"), int4Input("2147483647"));
}
function evaluate4297() {
    return int4And(int4Input("3"), int4Input(null));
}
function evaluate4298() {
    return int4And(int4Input("3"), int4Input("0"));
}
function evaluate4299() {
    return int4And(int4Input("3"), int4Input("1"));
}
function evaluate4300() {
    return int4And(int4Input("3"), int4Input("-1"));
}
function evaluate4301() {
    return int4And(int4Input("3"), int4Input("3"));
}
function evaluate4302() {
    return int4And(int4Input("3"), int4Input("-3"));
}
function evaluate4303() {
    return int4And(int4Input("3"), int4Input("-2147483648"));
}
function evaluate4304() {
    return int4And(int4Input("3"), int4Input("2147483647"));
}
function evaluate4305() {
    return int4And(int4Input("-3"), int4Input(null));
}
function evaluate4306() {
    return int4And(int4Input("-3"), int4Input("0"));
}
function evaluate4307() {
    return int4And(int4Input("-3"), int4Input("1"));
}
function evaluate4308() {
    return int4And(int4Input("-3"), int4Input("-1"));
}
function evaluate4309() {
    return int4And(int4Input("-3"), int4Input("3"));
}
function evaluate4310() {
    return int4And(int4Input("-3"), int4Input("-3"));
}
function evaluate4311() {
    return int4And(int4Input("-3"), int4Input("-2147483648"));
}
function evaluate4312() {
    return int4And(int4Input("-3"), int4Input("2147483647"));
}
function evaluate4313() {
    return int4And(int4Input("-2147483648"), int4Input(null));
}
function evaluate4314() {
    return int4And(int4Input("-2147483648"), int4Input("0"));
}
function evaluate4315() {
    return int4And(int4Input("-2147483648"), int4Input("1"));
}
function evaluate4316() {
    return int4And(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate4317() {
    return int4And(int4Input("-2147483648"), int4Input("3"));
}
function evaluate4318() {
    return int4And(int4Input("-2147483648"), int4Input("-3"));
}
function evaluate4319() {
    return int4And(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate4320() {
    return int4And(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate4321() {
    return int4And(int4Input("2147483647"), int4Input(null));
}
function evaluate4322() {
    return int4And(int4Input("2147483647"), int4Input("0"));
}
function evaluate4323() {
    return int4And(int4Input("2147483647"), int4Input("1"));
}
function evaluate4324() {
    return int4And(int4Input("2147483647"), int4Input("-1"));
}
function evaluate4325() {
    return int4And(int4Input("2147483647"), int4Input("3"));
}
function evaluate4326() {
    return int4And(int4Input("2147483647"), int4Input("-3"));
}
function evaluate4327() {
    return int4And(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate4328() {
    return int4And(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate4329() {
    return int4Or(int4Input(null), int4Input(null));
}
function evaluate4330() {
    return int4Or(int4Input(null), int4Input("0"));
}
function evaluate4331() {
    return int4Or(int4Input(null), int4Input("1"));
}
function evaluate4332() {
    return int4Or(int4Input(null), int4Input("-1"));
}
function evaluate4333() {
    return int4Or(int4Input(null), int4Input("3"));
}
function evaluate4334() {
    return int4Or(int4Input(null), int4Input("-3"));
}
function evaluate4335() {
    return int4Or(int4Input(null), int4Input("-2147483648"));
}
function evaluate4336() {
    return int4Or(int4Input(null), int4Input("2147483647"));
}
function evaluate4337() {
    return int4Or(int4Input("0"), int4Input(null));
}
function evaluate4338() {
    return int4Or(int4Input("0"), int4Input("0"));
}
function evaluate4339() {
    return int4Or(int4Input("0"), int4Input("1"));
}
function evaluate4340() {
    return int4Or(int4Input("0"), int4Input("-1"));
}
function evaluate4341() {
    return int4Or(int4Input("0"), int4Input("3"));
}
function evaluate4342() {
    return int4Or(int4Input("0"), int4Input("-3"));
}
function evaluate4343() {
    return int4Or(int4Input("0"), int4Input("-2147483648"));
}
function evaluate4344() {
    return int4Or(int4Input("0"), int4Input("2147483647"));
}
function evaluate4345() {
    return int4Or(int4Input("1"), int4Input(null));
}
function evaluate4346() {
    return int4Or(int4Input("1"), int4Input("0"));
}
function evaluate4347() {
    return int4Or(int4Input("1"), int4Input("1"));
}
function evaluate4348() {
    return int4Or(int4Input("1"), int4Input("-1"));
}
function evaluate4349() {
    return int4Or(int4Input("1"), int4Input("3"));
}
function evaluate4350() {
    return int4Or(int4Input("1"), int4Input("-3"));
}
function evaluate4351() {
    return int4Or(int4Input("1"), int4Input("-2147483648"));
}
function evaluate4352() {
    return int4Or(int4Input("1"), int4Input("2147483647"));
}
function evaluate4353() {
    return int4Or(int4Input("-1"), int4Input(null));
}
function evaluate4354() {
    return int4Or(int4Input("-1"), int4Input("0"));
}
function evaluate4355() {
    return int4Or(int4Input("-1"), int4Input("1"));
}
function evaluate4356() {
    return int4Or(int4Input("-1"), int4Input("-1"));
}
function evaluate4357() {
    return int4Or(int4Input("-1"), int4Input("3"));
}
function evaluate4358() {
    return int4Or(int4Input("-1"), int4Input("-3"));
}
function evaluate4359() {
    return int4Or(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate4360() {
    return int4Or(int4Input("-1"), int4Input("2147483647"));
}
function evaluate4361() {
    return int4Or(int4Input("3"), int4Input(null));
}
function evaluate4362() {
    return int4Or(int4Input("3"), int4Input("0"));
}
function evaluate4363() {
    return int4Or(int4Input("3"), int4Input("1"));
}
function evaluate4364() {
    return int4Or(int4Input("3"), int4Input("-1"));
}
function evaluate4365() {
    return int4Or(int4Input("3"), int4Input("3"));
}
function evaluate4366() {
    return int4Or(int4Input("3"), int4Input("-3"));
}
function evaluate4367() {
    return int4Or(int4Input("3"), int4Input("-2147483648"));
}
function evaluate4368() {
    return int4Or(int4Input("3"), int4Input("2147483647"));
}
function evaluate4369() {
    return int4Or(int4Input("-3"), int4Input(null));
}
function evaluate4370() {
    return int4Or(int4Input("-3"), int4Input("0"));
}
function evaluate4371() {
    return int4Or(int4Input("-3"), int4Input("1"));
}
function evaluate4372() {
    return int4Or(int4Input("-3"), int4Input("-1"));
}
function evaluate4373() {
    return int4Or(int4Input("-3"), int4Input("3"));
}
function evaluate4374() {
    return int4Or(int4Input("-3"), int4Input("-3"));
}
function evaluate4375() {
    return int4Or(int4Input("-3"), int4Input("-2147483648"));
}
function evaluate4376() {
    return int4Or(int4Input("-3"), int4Input("2147483647"));
}
function evaluate4377() {
    return int4Or(int4Input("-2147483648"), int4Input(null));
}
function evaluate4378() {
    return int4Or(int4Input("-2147483648"), int4Input("0"));
}
function evaluate4379() {
    return int4Or(int4Input("-2147483648"), int4Input("1"));
}
function evaluate4380() {
    return int4Or(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate4381() {
    return int4Or(int4Input("-2147483648"), int4Input("3"));
}
function evaluate4382() {
    return int4Or(int4Input("-2147483648"), int4Input("-3"));
}
function evaluate4383() {
    return int4Or(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate4384() {
    return int4Or(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate4385() {
    return int4Or(int4Input("2147483647"), int4Input(null));
}
function evaluate4386() {
    return int4Or(int4Input("2147483647"), int4Input("0"));
}
function evaluate4387() {
    return int4Or(int4Input("2147483647"), int4Input("1"));
}
function evaluate4388() {
    return int4Or(int4Input("2147483647"), int4Input("-1"));
}
function evaluate4389() {
    return int4Or(int4Input("2147483647"), int4Input("3"));
}
function evaluate4390() {
    return int4Or(int4Input("2147483647"), int4Input("-3"));
}
function evaluate4391() {
    return int4Or(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate4392() {
    return int4Or(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate4393() {
    return int4Xor(int4Input(null), int4Input(null));
}
function evaluate4394() {
    return int4Xor(int4Input(null), int4Input("0"));
}
function evaluate4395() {
    return int4Xor(int4Input(null), int4Input("1"));
}
function evaluate4396() {
    return int4Xor(int4Input(null), int4Input("-1"));
}
function evaluate4397() {
    return int4Xor(int4Input(null), int4Input("3"));
}
function evaluate4398() {
    return int4Xor(int4Input(null), int4Input("-3"));
}
function evaluate4399() {
    return int4Xor(int4Input(null), int4Input("-2147483648"));
}
function evaluate4400() {
    return int4Xor(int4Input(null), int4Input("2147483647"));
}
function evaluate4401() {
    return int4Xor(int4Input("0"), int4Input(null));
}
function evaluate4402() {
    return int4Xor(int4Input("0"), int4Input("0"));
}
function evaluate4403() {
    return int4Xor(int4Input("0"), int4Input("1"));
}
function evaluate4404() {
    return int4Xor(int4Input("0"), int4Input("-1"));
}
function evaluate4405() {
    return int4Xor(int4Input("0"), int4Input("3"));
}
function evaluate4406() {
    return int4Xor(int4Input("0"), int4Input("-3"));
}
function evaluate4407() {
    return int4Xor(int4Input("0"), int4Input("-2147483648"));
}
function evaluate4408() {
    return int4Xor(int4Input("0"), int4Input("2147483647"));
}
function evaluate4409() {
    return int4Xor(int4Input("1"), int4Input(null));
}
function evaluate4410() {
    return int4Xor(int4Input("1"), int4Input("0"));
}
function evaluate4411() {
    return int4Xor(int4Input("1"), int4Input("1"));
}
function evaluate4412() {
    return int4Xor(int4Input("1"), int4Input("-1"));
}
function evaluate4413() {
    return int4Xor(int4Input("1"), int4Input("3"));
}
function evaluate4414() {
    return int4Xor(int4Input("1"), int4Input("-3"));
}
function evaluate4415() {
    return int4Xor(int4Input("1"), int4Input("-2147483648"));
}
function evaluate4416() {
    return int4Xor(int4Input("1"), int4Input("2147483647"));
}
function evaluate4417() {
    return int4Xor(int4Input("-1"), int4Input(null));
}
function evaluate4418() {
    return int4Xor(int4Input("-1"), int4Input("0"));
}
function evaluate4419() {
    return int4Xor(int4Input("-1"), int4Input("1"));
}
function evaluate4420() {
    return int4Xor(int4Input("-1"), int4Input("-1"));
}
function evaluate4421() {
    return int4Xor(int4Input("-1"), int4Input("3"));
}
function evaluate4422() {
    return int4Xor(int4Input("-1"), int4Input("-3"));
}
function evaluate4423() {
    return int4Xor(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate4424() {
    return int4Xor(int4Input("-1"), int4Input("2147483647"));
}
function evaluate4425() {
    return int4Xor(int4Input("3"), int4Input(null));
}
function evaluate4426() {
    return int4Xor(int4Input("3"), int4Input("0"));
}
function evaluate4427() {
    return int4Xor(int4Input("3"), int4Input("1"));
}
function evaluate4428() {
    return int4Xor(int4Input("3"), int4Input("-1"));
}
function evaluate4429() {
    return int4Xor(int4Input("3"), int4Input("3"));
}
function evaluate4430() {
    return int4Xor(int4Input("3"), int4Input("-3"));
}
function evaluate4431() {
    return int4Xor(int4Input("3"), int4Input("-2147483648"));
}
function evaluate4432() {
    return int4Xor(int4Input("3"), int4Input("2147483647"));
}
function evaluate4433() {
    return int4Xor(int4Input("-3"), int4Input(null));
}
function evaluate4434() {
    return int4Xor(int4Input("-3"), int4Input("0"));
}
function evaluate4435() {
    return int4Xor(int4Input("-3"), int4Input("1"));
}
function evaluate4436() {
    return int4Xor(int4Input("-3"), int4Input("-1"));
}
function evaluate4437() {
    return int4Xor(int4Input("-3"), int4Input("3"));
}
function evaluate4438() {
    return int4Xor(int4Input("-3"), int4Input("-3"));
}
function evaluate4439() {
    return int4Xor(int4Input("-3"), int4Input("-2147483648"));
}
function evaluate4440() {
    return int4Xor(int4Input("-3"), int4Input("2147483647"));
}
function evaluate4441() {
    return int4Xor(int4Input("-2147483648"), int4Input(null));
}
function evaluate4442() {
    return int4Xor(int4Input("-2147483648"), int4Input("0"));
}
function evaluate4443() {
    return int4Xor(int4Input("-2147483648"), int4Input("1"));
}
function evaluate4444() {
    return int4Xor(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate4445() {
    return int4Xor(int4Input("-2147483648"), int4Input("3"));
}
function evaluate4446() {
    return int4Xor(int4Input("-2147483648"), int4Input("-3"));
}
function evaluate4447() {
    return int4Xor(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate4448() {
    return int4Xor(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate4449() {
    return int4Xor(int4Input("2147483647"), int4Input(null));
}
function evaluate4450() {
    return int4Xor(int4Input("2147483647"), int4Input("0"));
}
function evaluate4451() {
    return int4Xor(int4Input("2147483647"), int4Input("1"));
}
function evaluate4452() {
    return int4Xor(int4Input("2147483647"), int4Input("-1"));
}
function evaluate4453() {
    return int4Xor(int4Input("2147483647"), int4Input("3"));
}
function evaluate4454() {
    return int4Xor(int4Input("2147483647"), int4Input("-3"));
}
function evaluate4455() {
    return int4Xor(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate4456() {
    return int4Xor(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate4457() {
    return int4Not(int4Input(null));
}
function evaluate4458() {
    return int4Not(int4Input("0"));
}
function evaluate4459() {
    return int4Not(int4Input("1"));
}
function evaluate4460() {
    return int4Not(int4Input("-1"));
}
function evaluate4461() {
    return int4Not(int4Input("3"));
}
function evaluate4462() {
    return int4Not(int4Input("-3"));
}
function evaluate4463() {
    return int4Not(int4Input("-2147483648"));
}
function evaluate4464() {
    return int4Not(int4Input("2147483647"));
}
function evaluate4465() {
    return int4Identity(int4Input(null));
}
function evaluate4466() {
    return int4Identity(int4Input("0"));
}
function evaluate4467() {
    return int4Identity(int4Input("1"));
}
function evaluate4468() {
    return int4Identity(int4Input("-1"));
}
function evaluate4469() {
    return int4Identity(int4Input("3"));
}
function evaluate4470() {
    return int4Identity(int4Input("-3"));
}
function evaluate4471() {
    return int4Identity(int4Input("-2147483648"));
}
function evaluate4472() {
    return int4Identity(int4Input("2147483647"));
}
function evaluate4473() {
    return int4Abs(int4Input(null));
}
function evaluate4474() {
    return int4Abs(int4Input("0"));
}
function evaluate4475() {
    return int4Abs(int4Input("1"));
}
function evaluate4476() {
    return int4Abs(int4Input("-1"));
}
function evaluate4477() {
    return int4Abs(int4Input("3"));
}
function evaluate4478() {
    return int4Abs(int4Input("-3"));
}
function evaluate4479() {
    return int4Abs(int4Input("-2147483648"));
}
function evaluate4480() {
    return int4Abs(int4Input("2147483647"));
}
function evaluate4481() {
    return int4Shl(int4Input(null), int4Input(null));
}
function evaluate4482() {
    return int4Shl(int4Input(null), int4Input("-2147483648"));
}
function evaluate4483() {
    return int4Shl(int4Input(null), int4Input("-65"));
}
function evaluate4484() {
    return int4Shl(int4Input(null), int4Input("-64"));
}
function evaluate4485() {
    return int4Shl(int4Input(null), int4Input("-33"));
}
function evaluate4486() {
    return int4Shl(int4Input(null), int4Input("-32"));
}
function evaluate4487() {
    return int4Shl(int4Input(null), int4Input("-17"));
}
function evaluate4488() {
    return int4Shl(int4Input(null), int4Input("-16"));
}
function evaluate4489() {
    return int4Shl(int4Input(null), int4Input("-1"));
}
function evaluate4490() {
    return int4Shl(int4Input(null), int4Input("0"));
}
function evaluate4491() {
    return int4Shl(int4Input(null), int4Input("1"));
}
function evaluate4492() {
    return int4Shl(int4Input(null), int4Input("15"));
}
function evaluate4493() {
    return int4Shl(int4Input(null), int4Input("16"));
}
function evaluate4494() {
    return int4Shl(int4Input(null), int4Input("17"));
}
function evaluate4495() {
    return int4Shl(int4Input(null), int4Input("31"));
}
function evaluate4496() {
    return int4Shl(int4Input(null), int4Input("32"));
}
function evaluate4497() {
    return int4Shl(int4Input(null), int4Input("33"));
}
function evaluate4498() {
    return int4Shl(int4Input(null), int4Input("63"));
}
function evaluate4499() {
    return int4Shl(int4Input(null), int4Input("64"));
}
function evaluate4500() {
    return int4Shl(int4Input(null), int4Input("65"));
}
function evaluate4501() {
    return int4Shl(int4Input(null), int4Input("2147483647"));
}
function evaluate4502() {
    return int4Shl(int4Input("0"), int4Input(null));
}
function evaluate4503() {
    return int4Shl(int4Input("0"), int4Input("-2147483648"));
}
function evaluate4504() {
    return int4Shl(int4Input("0"), int4Input("-65"));
}
function evaluate4505() {
    return int4Shl(int4Input("0"), int4Input("-64"));
}
function evaluate4506() {
    return int4Shl(int4Input("0"), int4Input("-33"));
}
function evaluate4507() {
    return int4Shl(int4Input("0"), int4Input("-32"));
}
function evaluate4508() {
    return int4Shl(int4Input("0"), int4Input("-17"));
}
function evaluate4509() {
    return int4Shl(int4Input("0"), int4Input("-16"));
}
function evaluate4510() {
    return int4Shl(int4Input("0"), int4Input("-1"));
}
function evaluate4511() {
    return int4Shl(int4Input("0"), int4Input("0"));
}
function evaluate4512() {
    return int4Shl(int4Input("0"), int4Input("1"));
}
function evaluate4513() {
    return int4Shl(int4Input("0"), int4Input("15"));
}
function evaluate4514() {
    return int4Shl(int4Input("0"), int4Input("16"));
}
function evaluate4515() {
    return int4Shl(int4Input("0"), int4Input("17"));
}
function evaluate4516() {
    return int4Shl(int4Input("0"), int4Input("31"));
}
function evaluate4517() {
    return int4Shl(int4Input("0"), int4Input("32"));
}
function evaluate4518() {
    return int4Shl(int4Input("0"), int4Input("33"));
}
function evaluate4519() {
    return int4Shl(int4Input("0"), int4Input("63"));
}
function evaluate4520() {
    return int4Shl(int4Input("0"), int4Input("64"));
}
function evaluate4521() {
    return int4Shl(int4Input("0"), int4Input("65"));
}
function evaluate4522() {
    return int4Shl(int4Input("0"), int4Input("2147483647"));
}
function evaluate4523() {
    return int4Shl(int4Input("1"), int4Input(null));
}
function evaluate4524() {
    return int4Shl(int4Input("1"), int4Input("-2147483648"));
}
function evaluate4525() {
    return int4Shl(int4Input("1"), int4Input("-65"));
}
function evaluate4526() {
    return int4Shl(int4Input("1"), int4Input("-64"));
}
function evaluate4527() {
    return int4Shl(int4Input("1"), int4Input("-33"));
}
function evaluate4528() {
    return int4Shl(int4Input("1"), int4Input("-32"));
}
function evaluate4529() {
    return int4Shl(int4Input("1"), int4Input("-17"));
}
function evaluate4530() {
    return int4Shl(int4Input("1"), int4Input("-16"));
}
function evaluate4531() {
    return int4Shl(int4Input("1"), int4Input("-1"));
}
function evaluate4532() {
    return int4Shl(int4Input("1"), int4Input("0"));
}
function evaluate4533() {
    return int4Shl(int4Input("1"), int4Input("1"));
}
function evaluate4534() {
    return int4Shl(int4Input("1"), int4Input("15"));
}
function evaluate4535() {
    return int4Shl(int4Input("1"), int4Input("16"));
}
function evaluate4536() {
    return int4Shl(int4Input("1"), int4Input("17"));
}
function evaluate4537() {
    return int4Shl(int4Input("1"), int4Input("31"));
}
function evaluate4538() {
    return int4Shl(int4Input("1"), int4Input("32"));
}
function evaluate4539() {
    return int4Shl(int4Input("1"), int4Input("33"));
}
function evaluate4540() {
    return int4Shl(int4Input("1"), int4Input("63"));
}
function evaluate4541() {
    return int4Shl(int4Input("1"), int4Input("64"));
}
function evaluate4542() {
    return int4Shl(int4Input("1"), int4Input("65"));
}
function evaluate4543() {
    return int4Shl(int4Input("1"), int4Input("2147483647"));
}
function evaluate4544() {
    return int4Shl(int4Input("-1"), int4Input(null));
}
function evaluate4545() {
    return int4Shl(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate4546() {
    return int4Shl(int4Input("-1"), int4Input("-65"));
}
function evaluate4547() {
    return int4Shl(int4Input("-1"), int4Input("-64"));
}
function evaluate4548() {
    return int4Shl(int4Input("-1"), int4Input("-33"));
}
function evaluate4549() {
    return int4Shl(int4Input("-1"), int4Input("-32"));
}
function evaluate4550() {
    return int4Shl(int4Input("-1"), int4Input("-17"));
}
function evaluate4551() {
    return int4Shl(int4Input("-1"), int4Input("-16"));
}
function evaluate4552() {
    return int4Shl(int4Input("-1"), int4Input("-1"));
}
function evaluate4553() {
    return int4Shl(int4Input("-1"), int4Input("0"));
}
function evaluate4554() {
    return int4Shl(int4Input("-1"), int4Input("1"));
}
function evaluate4555() {
    return int4Shl(int4Input("-1"), int4Input("15"));
}
function evaluate4556() {
    return int4Shl(int4Input("-1"), int4Input("16"));
}
function evaluate4557() {
    return int4Shl(int4Input("-1"), int4Input("17"));
}
function evaluate4558() {
    return int4Shl(int4Input("-1"), int4Input("31"));
}
function evaluate4559() {
    return int4Shl(int4Input("-1"), int4Input("32"));
}
function evaluate4560() {
    return int4Shl(int4Input("-1"), int4Input("33"));
}
function evaluate4561() {
    return int4Shl(int4Input("-1"), int4Input("63"));
}
function evaluate4562() {
    return int4Shl(int4Input("-1"), int4Input("64"));
}
function evaluate4563() {
    return int4Shl(int4Input("-1"), int4Input("65"));
}
function evaluate4564() {
    return int4Shl(int4Input("-1"), int4Input("2147483647"));
}
function evaluate4565() {
    return int4Shl(int4Input("3"), int4Input(null));
}
function evaluate4566() {
    return int4Shl(int4Input("3"), int4Input("-2147483648"));
}
function evaluate4567() {
    return int4Shl(int4Input("3"), int4Input("-65"));
}
function evaluate4568() {
    return int4Shl(int4Input("3"), int4Input("-64"));
}
function evaluate4569() {
    return int4Shl(int4Input("3"), int4Input("-33"));
}
function evaluate4570() {
    return int4Shl(int4Input("3"), int4Input("-32"));
}
function evaluate4571() {
    return int4Shl(int4Input("3"), int4Input("-17"));
}
function evaluate4572() {
    return int4Shl(int4Input("3"), int4Input("-16"));
}
function evaluate4573() {
    return int4Shl(int4Input("3"), int4Input("-1"));
}
function evaluate4574() {
    return int4Shl(int4Input("3"), int4Input("0"));
}
function evaluate4575() {
    return int4Shl(int4Input("3"), int4Input("1"));
}
function evaluate4576() {
    return int4Shl(int4Input("3"), int4Input("15"));
}
function evaluate4577() {
    return int4Shl(int4Input("3"), int4Input("16"));
}
function evaluate4578() {
    return int4Shl(int4Input("3"), int4Input("17"));
}
function evaluate4579() {
    return int4Shl(int4Input("3"), int4Input("31"));
}
function evaluate4580() {
    return int4Shl(int4Input("3"), int4Input("32"));
}
function evaluate4581() {
    return int4Shl(int4Input("3"), int4Input("33"));
}
function evaluate4582() {
    return int4Shl(int4Input("3"), int4Input("63"));
}
function evaluate4583() {
    return int4Shl(int4Input("3"), int4Input("64"));
}
function evaluate4584() {
    return int4Shl(int4Input("3"), int4Input("65"));
}
function evaluate4585() {
    return int4Shl(int4Input("3"), int4Input("2147483647"));
}
function evaluate4586() {
    return int4Shl(int4Input("-3"), int4Input(null));
}
function evaluate4587() {
    return int4Shl(int4Input("-3"), int4Input("-2147483648"));
}
function evaluate4588() {
    return int4Shl(int4Input("-3"), int4Input("-65"));
}
function evaluate4589() {
    return int4Shl(int4Input("-3"), int4Input("-64"));
}
function evaluate4590() {
    return int4Shl(int4Input("-3"), int4Input("-33"));
}
function evaluate4591() {
    return int4Shl(int4Input("-3"), int4Input("-32"));
}
function evaluate4592() {
    return int4Shl(int4Input("-3"), int4Input("-17"));
}
function evaluate4593() {
    return int4Shl(int4Input("-3"), int4Input("-16"));
}
function evaluate4594() {
    return int4Shl(int4Input("-3"), int4Input("-1"));
}
function evaluate4595() {
    return int4Shl(int4Input("-3"), int4Input("0"));
}
function evaluate4596() {
    return int4Shl(int4Input("-3"), int4Input("1"));
}
function evaluate4597() {
    return int4Shl(int4Input("-3"), int4Input("15"));
}
function evaluate4598() {
    return int4Shl(int4Input("-3"), int4Input("16"));
}
function evaluate4599() {
    return int4Shl(int4Input("-3"), int4Input("17"));
}
function evaluate4600() {
    return int4Shl(int4Input("-3"), int4Input("31"));
}
function evaluate4601() {
    return int4Shl(int4Input("-3"), int4Input("32"));
}
function evaluate4602() {
    return int4Shl(int4Input("-3"), int4Input("33"));
}
function evaluate4603() {
    return int4Shl(int4Input("-3"), int4Input("63"));
}
function evaluate4604() {
    return int4Shl(int4Input("-3"), int4Input("64"));
}
function evaluate4605() {
    return int4Shl(int4Input("-3"), int4Input("65"));
}
function evaluate4606() {
    return int4Shl(int4Input("-3"), int4Input("2147483647"));
}
function evaluate4607() {
    return int4Shl(int4Input("-2147483648"), int4Input(null));
}
function evaluate4608() {
    return int4Shl(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate4609() {
    return int4Shl(int4Input("-2147483648"), int4Input("-65"));
}
function evaluate4610() {
    return int4Shl(int4Input("-2147483648"), int4Input("-64"));
}
function evaluate4611() {
    return int4Shl(int4Input("-2147483648"), int4Input("-33"));
}
function evaluate4612() {
    return int4Shl(int4Input("-2147483648"), int4Input("-32"));
}
function evaluate4613() {
    return int4Shl(int4Input("-2147483648"), int4Input("-17"));
}
function evaluate4614() {
    return int4Shl(int4Input("-2147483648"), int4Input("-16"));
}
function evaluate4615() {
    return int4Shl(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate4616() {
    return int4Shl(int4Input("-2147483648"), int4Input("0"));
}
function evaluate4617() {
    return int4Shl(int4Input("-2147483648"), int4Input("1"));
}
function evaluate4618() {
    return int4Shl(int4Input("-2147483648"), int4Input("15"));
}
function evaluate4619() {
    return int4Shl(int4Input("-2147483648"), int4Input("16"));
}
function evaluate4620() {
    return int4Shl(int4Input("-2147483648"), int4Input("17"));
}
function evaluate4621() {
    return int4Shl(int4Input("-2147483648"), int4Input("31"));
}
function evaluate4622() {
    return int4Shl(int4Input("-2147483648"), int4Input("32"));
}
function evaluate4623() {
    return int4Shl(int4Input("-2147483648"), int4Input("33"));
}
function evaluate4624() {
    return int4Shl(int4Input("-2147483648"), int4Input("63"));
}
function evaluate4625() {
    return int4Shl(int4Input("-2147483648"), int4Input("64"));
}
function evaluate4626() {
    return int4Shl(int4Input("-2147483648"), int4Input("65"));
}
function evaluate4627() {
    return int4Shl(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate4628() {
    return int4Shl(int4Input("2147483647"), int4Input(null));
}
function evaluate4629() {
    return int4Shl(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate4630() {
    return int4Shl(int4Input("2147483647"), int4Input("-65"));
}
function evaluate4631() {
    return int4Shl(int4Input("2147483647"), int4Input("-64"));
}
function evaluate4632() {
    return int4Shl(int4Input("2147483647"), int4Input("-33"));
}
function evaluate4633() {
    return int4Shl(int4Input("2147483647"), int4Input("-32"));
}
function evaluate4634() {
    return int4Shl(int4Input("2147483647"), int4Input("-17"));
}
function evaluate4635() {
    return int4Shl(int4Input("2147483647"), int4Input("-16"));
}
function evaluate4636() {
    return int4Shl(int4Input("2147483647"), int4Input("-1"));
}
function evaluate4637() {
    return int4Shl(int4Input("2147483647"), int4Input("0"));
}
function evaluate4638() {
    return int4Shl(int4Input("2147483647"), int4Input("1"));
}
function evaluate4639() {
    return int4Shl(int4Input("2147483647"), int4Input("15"));
}
function evaluate4640() {
    return int4Shl(int4Input("2147483647"), int4Input("16"));
}
function evaluate4641() {
    return int4Shl(int4Input("2147483647"), int4Input("17"));
}
function evaluate4642() {
    return int4Shl(int4Input("2147483647"), int4Input("31"));
}
function evaluate4643() {
    return int4Shl(int4Input("2147483647"), int4Input("32"));
}
function evaluate4644() {
    return int4Shl(int4Input("2147483647"), int4Input("33"));
}
function evaluate4645() {
    return int4Shl(int4Input("2147483647"), int4Input("63"));
}
function evaluate4646() {
    return int4Shl(int4Input("2147483647"), int4Input("64"));
}
function evaluate4647() {
    return int4Shl(int4Input("2147483647"), int4Input("65"));
}
function evaluate4648() {
    return int4Shl(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate4649() {
    return int4Shr(int4Input(null), int4Input(null));
}
function evaluate4650() {
    return int4Shr(int4Input(null), int4Input("-2147483648"));
}
function evaluate4651() {
    return int4Shr(int4Input(null), int4Input("-65"));
}
function evaluate4652() {
    return int4Shr(int4Input(null), int4Input("-64"));
}
function evaluate4653() {
    return int4Shr(int4Input(null), int4Input("-33"));
}
function evaluate4654() {
    return int4Shr(int4Input(null), int4Input("-32"));
}
function evaluate4655() {
    return int4Shr(int4Input(null), int4Input("-17"));
}
function evaluate4656() {
    return int4Shr(int4Input(null), int4Input("-16"));
}
function evaluate4657() {
    return int4Shr(int4Input(null), int4Input("-1"));
}
function evaluate4658() {
    return int4Shr(int4Input(null), int4Input("0"));
}
function evaluate4659() {
    return int4Shr(int4Input(null), int4Input("1"));
}
function evaluate4660() {
    return int4Shr(int4Input(null), int4Input("15"));
}
function evaluate4661() {
    return int4Shr(int4Input(null), int4Input("16"));
}
function evaluate4662() {
    return int4Shr(int4Input(null), int4Input("17"));
}
function evaluate4663() {
    return int4Shr(int4Input(null), int4Input("31"));
}
function evaluate4664() {
    return int4Shr(int4Input(null), int4Input("32"));
}
function evaluate4665() {
    return int4Shr(int4Input(null), int4Input("33"));
}
function evaluate4666() {
    return int4Shr(int4Input(null), int4Input("63"));
}
function evaluate4667() {
    return int4Shr(int4Input(null), int4Input("64"));
}
function evaluate4668() {
    return int4Shr(int4Input(null), int4Input("65"));
}
function evaluate4669() {
    return int4Shr(int4Input(null), int4Input("2147483647"));
}
function evaluate4670() {
    return int4Shr(int4Input("0"), int4Input(null));
}
function evaluate4671() {
    return int4Shr(int4Input("0"), int4Input("-2147483648"));
}
function evaluate4672() {
    return int4Shr(int4Input("0"), int4Input("-65"));
}
function evaluate4673() {
    return int4Shr(int4Input("0"), int4Input("-64"));
}
function evaluate4674() {
    return int4Shr(int4Input("0"), int4Input("-33"));
}
function evaluate4675() {
    return int4Shr(int4Input("0"), int4Input("-32"));
}
function evaluate4676() {
    return int4Shr(int4Input("0"), int4Input("-17"));
}
function evaluate4677() {
    return int4Shr(int4Input("0"), int4Input("-16"));
}
function evaluate4678() {
    return int4Shr(int4Input("0"), int4Input("-1"));
}
function evaluate4679() {
    return int4Shr(int4Input("0"), int4Input("0"));
}
function evaluate4680() {
    return int4Shr(int4Input("0"), int4Input("1"));
}
function evaluate4681() {
    return int4Shr(int4Input("0"), int4Input("15"));
}
function evaluate4682() {
    return int4Shr(int4Input("0"), int4Input("16"));
}
function evaluate4683() {
    return int4Shr(int4Input("0"), int4Input("17"));
}
function evaluate4684() {
    return int4Shr(int4Input("0"), int4Input("31"));
}
function evaluate4685() {
    return int4Shr(int4Input("0"), int4Input("32"));
}
function evaluate4686() {
    return int4Shr(int4Input("0"), int4Input("33"));
}
function evaluate4687() {
    return int4Shr(int4Input("0"), int4Input("63"));
}
function evaluate4688() {
    return int4Shr(int4Input("0"), int4Input("64"));
}
function evaluate4689() {
    return int4Shr(int4Input("0"), int4Input("65"));
}
function evaluate4690() {
    return int4Shr(int4Input("0"), int4Input("2147483647"));
}
function evaluate4691() {
    return int4Shr(int4Input("1"), int4Input(null));
}
function evaluate4692() {
    return int4Shr(int4Input("1"), int4Input("-2147483648"));
}
function evaluate4693() {
    return int4Shr(int4Input("1"), int4Input("-65"));
}
function evaluate4694() {
    return int4Shr(int4Input("1"), int4Input("-64"));
}
function evaluate4695() {
    return int4Shr(int4Input("1"), int4Input("-33"));
}
function evaluate4696() {
    return int4Shr(int4Input("1"), int4Input("-32"));
}
function evaluate4697() {
    return int4Shr(int4Input("1"), int4Input("-17"));
}
function evaluate4698() {
    return int4Shr(int4Input("1"), int4Input("-16"));
}
function evaluate4699() {
    return int4Shr(int4Input("1"), int4Input("-1"));
}
function evaluate4700() {
    return int4Shr(int4Input("1"), int4Input("0"));
}
function evaluate4701() {
    return int4Shr(int4Input("1"), int4Input("1"));
}
function evaluate4702() {
    return int4Shr(int4Input("1"), int4Input("15"));
}
function evaluate4703() {
    return int4Shr(int4Input("1"), int4Input("16"));
}
function evaluate4704() {
    return int4Shr(int4Input("1"), int4Input("17"));
}
function evaluate4705() {
    return int4Shr(int4Input("1"), int4Input("31"));
}
function evaluate4706() {
    return int4Shr(int4Input("1"), int4Input("32"));
}
function evaluate4707() {
    return int4Shr(int4Input("1"), int4Input("33"));
}
function evaluate4708() {
    return int4Shr(int4Input("1"), int4Input("63"));
}
function evaluate4709() {
    return int4Shr(int4Input("1"), int4Input("64"));
}
function evaluate4710() {
    return int4Shr(int4Input("1"), int4Input("65"));
}
function evaluate4711() {
    return int4Shr(int4Input("1"), int4Input("2147483647"));
}
function evaluate4712() {
    return int4Shr(int4Input("-1"), int4Input(null));
}
function evaluate4713() {
    return int4Shr(int4Input("-1"), int4Input("-2147483648"));
}
function evaluate4714() {
    return int4Shr(int4Input("-1"), int4Input("-65"));
}
function evaluate4715() {
    return int4Shr(int4Input("-1"), int4Input("-64"));
}
function evaluate4716() {
    return int4Shr(int4Input("-1"), int4Input("-33"));
}
function evaluate4717() {
    return int4Shr(int4Input("-1"), int4Input("-32"));
}
function evaluate4718() {
    return int4Shr(int4Input("-1"), int4Input("-17"));
}
function evaluate4719() {
    return int4Shr(int4Input("-1"), int4Input("-16"));
}
function evaluate4720() {
    return int4Shr(int4Input("-1"), int4Input("-1"));
}
function evaluate4721() {
    return int4Shr(int4Input("-1"), int4Input("0"));
}
function evaluate4722() {
    return int4Shr(int4Input("-1"), int4Input("1"));
}
function evaluate4723() {
    return int4Shr(int4Input("-1"), int4Input("15"));
}
function evaluate4724() {
    return int4Shr(int4Input("-1"), int4Input("16"));
}
function evaluate4725() {
    return int4Shr(int4Input("-1"), int4Input("17"));
}
function evaluate4726() {
    return int4Shr(int4Input("-1"), int4Input("31"));
}
function evaluate4727() {
    return int4Shr(int4Input("-1"), int4Input("32"));
}
function evaluate4728() {
    return int4Shr(int4Input("-1"), int4Input("33"));
}
function evaluate4729() {
    return int4Shr(int4Input("-1"), int4Input("63"));
}
function evaluate4730() {
    return int4Shr(int4Input("-1"), int4Input("64"));
}
function evaluate4731() {
    return int4Shr(int4Input("-1"), int4Input("65"));
}
function evaluate4732() {
    return int4Shr(int4Input("-1"), int4Input("2147483647"));
}
function evaluate4733() {
    return int4Shr(int4Input("3"), int4Input(null));
}
function evaluate4734() {
    return int4Shr(int4Input("3"), int4Input("-2147483648"));
}
function evaluate4735() {
    return int4Shr(int4Input("3"), int4Input("-65"));
}
function evaluate4736() {
    return int4Shr(int4Input("3"), int4Input("-64"));
}
function evaluate4737() {
    return int4Shr(int4Input("3"), int4Input("-33"));
}
function evaluate4738() {
    return int4Shr(int4Input("3"), int4Input("-32"));
}
function evaluate4739() {
    return int4Shr(int4Input("3"), int4Input("-17"));
}
function evaluate4740() {
    return int4Shr(int4Input("3"), int4Input("-16"));
}
function evaluate4741() {
    return int4Shr(int4Input("3"), int4Input("-1"));
}
function evaluate4742() {
    return int4Shr(int4Input("3"), int4Input("0"));
}
function evaluate4743() {
    return int4Shr(int4Input("3"), int4Input("1"));
}
function evaluate4744() {
    return int4Shr(int4Input("3"), int4Input("15"));
}
function evaluate4745() {
    return int4Shr(int4Input("3"), int4Input("16"));
}
function evaluate4746() {
    return int4Shr(int4Input("3"), int4Input("17"));
}
function evaluate4747() {
    return int4Shr(int4Input("3"), int4Input("31"));
}
function evaluate4748() {
    return int4Shr(int4Input("3"), int4Input("32"));
}
function evaluate4749() {
    return int4Shr(int4Input("3"), int4Input("33"));
}
function evaluate4750() {
    return int4Shr(int4Input("3"), int4Input("63"));
}
function evaluate4751() {
    return int4Shr(int4Input("3"), int4Input("64"));
}
function evaluate4752() {
    return int4Shr(int4Input("3"), int4Input("65"));
}
function evaluate4753() {
    return int4Shr(int4Input("3"), int4Input("2147483647"));
}
function evaluate4754() {
    return int4Shr(int4Input("-3"), int4Input(null));
}
function evaluate4755() {
    return int4Shr(int4Input("-3"), int4Input("-2147483648"));
}
function evaluate4756() {
    return int4Shr(int4Input("-3"), int4Input("-65"));
}
function evaluate4757() {
    return int4Shr(int4Input("-3"), int4Input("-64"));
}
function evaluate4758() {
    return int4Shr(int4Input("-3"), int4Input("-33"));
}
function evaluate4759() {
    return int4Shr(int4Input("-3"), int4Input("-32"));
}
function evaluate4760() {
    return int4Shr(int4Input("-3"), int4Input("-17"));
}
function evaluate4761() {
    return int4Shr(int4Input("-3"), int4Input("-16"));
}
function evaluate4762() {
    return int4Shr(int4Input("-3"), int4Input("-1"));
}
function evaluate4763() {
    return int4Shr(int4Input("-3"), int4Input("0"));
}
function evaluate4764() {
    return int4Shr(int4Input("-3"), int4Input("1"));
}
function evaluate4765() {
    return int4Shr(int4Input("-3"), int4Input("15"));
}
function evaluate4766() {
    return int4Shr(int4Input("-3"), int4Input("16"));
}
function evaluate4767() {
    return int4Shr(int4Input("-3"), int4Input("17"));
}
function evaluate4768() {
    return int4Shr(int4Input("-3"), int4Input("31"));
}
function evaluate4769() {
    return int4Shr(int4Input("-3"), int4Input("32"));
}
function evaluate4770() {
    return int4Shr(int4Input("-3"), int4Input("33"));
}
function evaluate4771() {
    return int4Shr(int4Input("-3"), int4Input("63"));
}
function evaluate4772() {
    return int4Shr(int4Input("-3"), int4Input("64"));
}
function evaluate4773() {
    return int4Shr(int4Input("-3"), int4Input("65"));
}
function evaluate4774() {
    return int4Shr(int4Input("-3"), int4Input("2147483647"));
}
function evaluate4775() {
    return int4Shr(int4Input("-2147483648"), int4Input(null));
}
function evaluate4776() {
    return int4Shr(int4Input("-2147483648"), int4Input("-2147483648"));
}
function evaluate4777() {
    return int4Shr(int4Input("-2147483648"), int4Input("-65"));
}
function evaluate4778() {
    return int4Shr(int4Input("-2147483648"), int4Input("-64"));
}
function evaluate4779() {
    return int4Shr(int4Input("-2147483648"), int4Input("-33"));
}
function evaluate4780() {
    return int4Shr(int4Input("-2147483648"), int4Input("-32"));
}
function evaluate4781() {
    return int4Shr(int4Input("-2147483648"), int4Input("-17"));
}
function evaluate4782() {
    return int4Shr(int4Input("-2147483648"), int4Input("-16"));
}
function evaluate4783() {
    return int4Shr(int4Input("-2147483648"), int4Input("-1"));
}
function evaluate4784() {
    return int4Shr(int4Input("-2147483648"), int4Input("0"));
}
function evaluate4785() {
    return int4Shr(int4Input("-2147483648"), int4Input("1"));
}
function evaluate4786() {
    return int4Shr(int4Input("-2147483648"), int4Input("15"));
}
function evaluate4787() {
    return int4Shr(int4Input("-2147483648"), int4Input("16"));
}
function evaluate4788() {
    return int4Shr(int4Input("-2147483648"), int4Input("17"));
}
function evaluate4789() {
    return int4Shr(int4Input("-2147483648"), int4Input("31"));
}
function evaluate4790() {
    return int4Shr(int4Input("-2147483648"), int4Input("32"));
}
function evaluate4791() {
    return int4Shr(int4Input("-2147483648"), int4Input("33"));
}
function evaluate4792() {
    return int4Shr(int4Input("-2147483648"), int4Input("63"));
}
function evaluate4793() {
    return int4Shr(int4Input("-2147483648"), int4Input("64"));
}
function evaluate4794() {
    return int4Shr(int4Input("-2147483648"), int4Input("65"));
}
function evaluate4795() {
    return int4Shr(int4Input("-2147483648"), int4Input("2147483647"));
}
function evaluate4796() {
    return int4Shr(int4Input("2147483647"), int4Input(null));
}
function evaluate4797() {
    return int4Shr(int4Input("2147483647"), int4Input("-2147483648"));
}
function evaluate4798() {
    return int4Shr(int4Input("2147483647"), int4Input("-65"));
}
function evaluate4799() {
    return int4Shr(int4Input("2147483647"), int4Input("-64"));
}
function evaluate4800() {
    return int4Shr(int4Input("2147483647"), int4Input("-33"));
}
function evaluate4801() {
    return int4Shr(int4Input("2147483647"), int4Input("-32"));
}
function evaluate4802() {
    return int4Shr(int4Input("2147483647"), int4Input("-17"));
}
function evaluate4803() {
    return int4Shr(int4Input("2147483647"), int4Input("-16"));
}
function evaluate4804() {
    return int4Shr(int4Input("2147483647"), int4Input("-1"));
}
function evaluate4805() {
    return int4Shr(int4Input("2147483647"), int4Input("0"));
}
function evaluate4806() {
    return int4Shr(int4Input("2147483647"), int4Input("1"));
}
function evaluate4807() {
    return int4Shr(int4Input("2147483647"), int4Input("15"));
}
function evaluate4808() {
    return int4Shr(int4Input("2147483647"), int4Input("16"));
}
function evaluate4809() {
    return int4Shr(int4Input("2147483647"), int4Input("17"));
}
function evaluate4810() {
    return int4Shr(int4Input("2147483647"), int4Input("31"));
}
function evaluate4811() {
    return int4Shr(int4Input("2147483647"), int4Input("32"));
}
function evaluate4812() {
    return int4Shr(int4Input("2147483647"), int4Input("33"));
}
function evaluate4813() {
    return int4Shr(int4Input("2147483647"), int4Input("63"));
}
function evaluate4814() {
    return int4Shr(int4Input("2147483647"), int4Input("64"));
}
function evaluate4815() {
    return int4Shr(int4Input("2147483647"), int4Input("65"));
}
function evaluate4816() {
    return int4Shr(int4Input("2147483647"), int4Input("2147483647"));
}
function evaluate4817() {
    return int8And(int8Input(null), int8Input(null));
}
function evaluate4818() {
    return int8And(int8Input(null), int8Input("0"));
}
function evaluate4819() {
    return int8And(int8Input(null), int8Input("1"));
}
function evaluate4820() {
    return int8And(int8Input(null), int8Input("-1"));
}
function evaluate4821() {
    return int8And(int8Input(null), int8Input("3"));
}
function evaluate4822() {
    return int8And(int8Input(null), int8Input("-3"));
}
function evaluate4823() {
    return int8And(int8Input(null), int8Input("-9223372036854775808"));
}
function evaluate4824() {
    return int8And(int8Input(null), int8Input("9223372036854775807"));
}
function evaluate4825() {
    return int8And(int8Input("0"), int8Input(null));
}
function evaluate4826() {
    return int8And(int8Input("0"), int8Input("0"));
}
function evaluate4827() {
    return int8And(int8Input("0"), int8Input("1"));
}
function evaluate4828() {
    return int8And(int8Input("0"), int8Input("-1"));
}
function evaluate4829() {
    return int8And(int8Input("0"), int8Input("3"));
}
function evaluate4830() {
    return int8And(int8Input("0"), int8Input("-3"));
}
function evaluate4831() {
    return int8And(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate4832() {
    return int8And(int8Input("0"), int8Input("9223372036854775807"));
}
function evaluate4833() {
    return int8And(int8Input("1"), int8Input(null));
}
function evaluate4834() {
    return int8And(int8Input("1"), int8Input("0"));
}
function evaluate4835() {
    return int8And(int8Input("1"), int8Input("1"));
}
function evaluate4836() {
    return int8And(int8Input("1"), int8Input("-1"));
}
function evaluate4837() {
    return int8And(int8Input("1"), int8Input("3"));
}
function evaluate4838() {
    return int8And(int8Input("1"), int8Input("-3"));
}
function evaluate4839() {
    return int8And(int8Input("1"), int8Input("-9223372036854775808"));
}
function evaluate4840() {
    return int8And(int8Input("1"), int8Input("9223372036854775807"));
}
function evaluate4841() {
    return int8And(int8Input("-1"), int8Input(null));
}
function evaluate4842() {
    return int8And(int8Input("-1"), int8Input("0"));
}
function evaluate4843() {
    return int8And(int8Input("-1"), int8Input("1"));
}
function evaluate4844() {
    return int8And(int8Input("-1"), int8Input("-1"));
}
function evaluate4845() {
    return int8And(int8Input("-1"), int8Input("3"));
}
function evaluate4846() {
    return int8And(int8Input("-1"), int8Input("-3"));
}
function evaluate4847() {
    return int8And(int8Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate4848() {
    return int8And(int8Input("-1"), int8Input("9223372036854775807"));
}
function evaluate4849() {
    return int8And(int8Input("3"), int8Input(null));
}
function evaluate4850() {
    return int8And(int8Input("3"), int8Input("0"));
}
function evaluate4851() {
    return int8And(int8Input("3"), int8Input("1"));
}
function evaluate4852() {
    return int8And(int8Input("3"), int8Input("-1"));
}
function evaluate4853() {
    return int8And(int8Input("3"), int8Input("3"));
}
function evaluate4854() {
    return int8And(int8Input("3"), int8Input("-3"));
}
function evaluate4855() {
    return int8And(int8Input("3"), int8Input("-9223372036854775808"));
}
function evaluate4856() {
    return int8And(int8Input("3"), int8Input("9223372036854775807"));
}
function evaluate4857() {
    return int8And(int8Input("-3"), int8Input(null));
}
function evaluate4858() {
    return int8And(int8Input("-3"), int8Input("0"));
}
function evaluate4859() {
    return int8And(int8Input("-3"), int8Input("1"));
}
function evaluate4860() {
    return int8And(int8Input("-3"), int8Input("-1"));
}
function evaluate4861() {
    return int8And(int8Input("-3"), int8Input("3"));
}
function evaluate4862() {
    return int8And(int8Input("-3"), int8Input("-3"));
}
function evaluate4863() {
    return int8And(int8Input("-3"), int8Input("-9223372036854775808"));
}
function evaluate4864() {
    return int8And(int8Input("-3"), int8Input("9223372036854775807"));
}
function evaluate4865() {
    return int8And(int8Input("-9223372036854775808"), int8Input(null));
}
function evaluate4866() {
    return int8And(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate4867() {
    return int8And(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate4868() {
    return int8And(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate4869() {
    return int8And(int8Input("-9223372036854775808"), int8Input("3"));
}
function evaluate4870() {
    return int8And(int8Input("-9223372036854775808"), int8Input("-3"));
}
function evaluate4871() {
    return int8And(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate4872() {
    return int8And(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate4873() {
    return int8And(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate4874() {
    return int8And(int8Input("9223372036854775807"), int8Input("0"));
}
function evaluate4875() {
    return int8And(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate4876() {
    return int8And(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate4877() {
    return int8And(int8Input("9223372036854775807"), int8Input("3"));
}
function evaluate4878() {
    return int8And(int8Input("9223372036854775807"), int8Input("-3"));
}
function evaluate4879() {
    return int8And(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate4880() {
    return int8And(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate4881() {
    return int8Or(int8Input(null), int8Input(null));
}
function evaluate4882() {
    return int8Or(int8Input(null), int8Input("0"));
}
function evaluate4883() {
    return int8Or(int8Input(null), int8Input("1"));
}
function evaluate4884() {
    return int8Or(int8Input(null), int8Input("-1"));
}
function evaluate4885() {
    return int8Or(int8Input(null), int8Input("3"));
}
function evaluate4886() {
    return int8Or(int8Input(null), int8Input("-3"));
}
function evaluate4887() {
    return int8Or(int8Input(null), int8Input("-9223372036854775808"));
}
function evaluate4888() {
    return int8Or(int8Input(null), int8Input("9223372036854775807"));
}
function evaluate4889() {
    return int8Or(int8Input("0"), int8Input(null));
}
function evaluate4890() {
    return int8Or(int8Input("0"), int8Input("0"));
}
function evaluate4891() {
    return int8Or(int8Input("0"), int8Input("1"));
}
function evaluate4892() {
    return int8Or(int8Input("0"), int8Input("-1"));
}
function evaluate4893() {
    return int8Or(int8Input("0"), int8Input("3"));
}
function evaluate4894() {
    return int8Or(int8Input("0"), int8Input("-3"));
}
function evaluate4895() {
    return int8Or(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate4896() {
    return int8Or(int8Input("0"), int8Input("9223372036854775807"));
}
function evaluate4897() {
    return int8Or(int8Input("1"), int8Input(null));
}
function evaluate4898() {
    return int8Or(int8Input("1"), int8Input("0"));
}
function evaluate4899() {
    return int8Or(int8Input("1"), int8Input("1"));
}
function evaluate4900() {
    return int8Or(int8Input("1"), int8Input("-1"));
}
function evaluate4901() {
    return int8Or(int8Input("1"), int8Input("3"));
}
function evaluate4902() {
    return int8Or(int8Input("1"), int8Input("-3"));
}
function evaluate4903() {
    return int8Or(int8Input("1"), int8Input("-9223372036854775808"));
}
function evaluate4904() {
    return int8Or(int8Input("1"), int8Input("9223372036854775807"));
}
function evaluate4905() {
    return int8Or(int8Input("-1"), int8Input(null));
}
function evaluate4906() {
    return int8Or(int8Input("-1"), int8Input("0"));
}
function evaluate4907() {
    return int8Or(int8Input("-1"), int8Input("1"));
}
function evaluate4908() {
    return int8Or(int8Input("-1"), int8Input("-1"));
}
function evaluate4909() {
    return int8Or(int8Input("-1"), int8Input("3"));
}
function evaluate4910() {
    return int8Or(int8Input("-1"), int8Input("-3"));
}
function evaluate4911() {
    return int8Or(int8Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate4912() {
    return int8Or(int8Input("-1"), int8Input("9223372036854775807"));
}
function evaluate4913() {
    return int8Or(int8Input("3"), int8Input(null));
}
function evaluate4914() {
    return int8Or(int8Input("3"), int8Input("0"));
}
function evaluate4915() {
    return int8Or(int8Input("3"), int8Input("1"));
}
function evaluate4916() {
    return int8Or(int8Input("3"), int8Input("-1"));
}
function evaluate4917() {
    return int8Or(int8Input("3"), int8Input("3"));
}
function evaluate4918() {
    return int8Or(int8Input("3"), int8Input("-3"));
}
function evaluate4919() {
    return int8Or(int8Input("3"), int8Input("-9223372036854775808"));
}
function evaluate4920() {
    return int8Or(int8Input("3"), int8Input("9223372036854775807"));
}
function evaluate4921() {
    return int8Or(int8Input("-3"), int8Input(null));
}
function evaluate4922() {
    return int8Or(int8Input("-3"), int8Input("0"));
}
function evaluate4923() {
    return int8Or(int8Input("-3"), int8Input("1"));
}
function evaluate4924() {
    return int8Or(int8Input("-3"), int8Input("-1"));
}
function evaluate4925() {
    return int8Or(int8Input("-3"), int8Input("3"));
}
function evaluate4926() {
    return int8Or(int8Input("-3"), int8Input("-3"));
}
function evaluate4927() {
    return int8Or(int8Input("-3"), int8Input("-9223372036854775808"));
}
function evaluate4928() {
    return int8Or(int8Input("-3"), int8Input("9223372036854775807"));
}
function evaluate4929() {
    return int8Or(int8Input("-9223372036854775808"), int8Input(null));
}
function evaluate4930() {
    return int8Or(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate4931() {
    return int8Or(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate4932() {
    return int8Or(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate4933() {
    return int8Or(int8Input("-9223372036854775808"), int8Input("3"));
}
function evaluate4934() {
    return int8Or(int8Input("-9223372036854775808"), int8Input("-3"));
}
function evaluate4935() {
    return int8Or(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate4936() {
    return int8Or(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate4937() {
    return int8Or(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate4938() {
    return int8Or(int8Input("9223372036854775807"), int8Input("0"));
}
function evaluate4939() {
    return int8Or(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate4940() {
    return int8Or(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate4941() {
    return int8Or(int8Input("9223372036854775807"), int8Input("3"));
}
function evaluate4942() {
    return int8Or(int8Input("9223372036854775807"), int8Input("-3"));
}
function evaluate4943() {
    return int8Or(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate4944() {
    return int8Or(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate4945() {
    return int8Xor(int8Input(null), int8Input(null));
}
function evaluate4946() {
    return int8Xor(int8Input(null), int8Input("0"));
}
function evaluate4947() {
    return int8Xor(int8Input(null), int8Input("1"));
}
function evaluate4948() {
    return int8Xor(int8Input(null), int8Input("-1"));
}
function evaluate4949() {
    return int8Xor(int8Input(null), int8Input("3"));
}
function evaluate4950() {
    return int8Xor(int8Input(null), int8Input("-3"));
}
function evaluate4951() {
    return int8Xor(int8Input(null), int8Input("-9223372036854775808"));
}
function evaluate4952() {
    return int8Xor(int8Input(null), int8Input("9223372036854775807"));
}
function evaluate4953() {
    return int8Xor(int8Input("0"), int8Input(null));
}
function evaluate4954() {
    return int8Xor(int8Input("0"), int8Input("0"));
}
function evaluate4955() {
    return int8Xor(int8Input("0"), int8Input("1"));
}
function evaluate4956() {
    return int8Xor(int8Input("0"), int8Input("-1"));
}
function evaluate4957() {
    return int8Xor(int8Input("0"), int8Input("3"));
}
function evaluate4958() {
    return int8Xor(int8Input("0"), int8Input("-3"));
}
function evaluate4959() {
    return int8Xor(int8Input("0"), int8Input("-9223372036854775808"));
}
function evaluate4960() {
    return int8Xor(int8Input("0"), int8Input("9223372036854775807"));
}
function evaluate4961() {
    return int8Xor(int8Input("1"), int8Input(null));
}
function evaluate4962() {
    return int8Xor(int8Input("1"), int8Input("0"));
}
function evaluate4963() {
    return int8Xor(int8Input("1"), int8Input("1"));
}
function evaluate4964() {
    return int8Xor(int8Input("1"), int8Input("-1"));
}
function evaluate4965() {
    return int8Xor(int8Input("1"), int8Input("3"));
}
function evaluate4966() {
    return int8Xor(int8Input("1"), int8Input("-3"));
}
function evaluate4967() {
    return int8Xor(int8Input("1"), int8Input("-9223372036854775808"));
}
function evaluate4968() {
    return int8Xor(int8Input("1"), int8Input("9223372036854775807"));
}
function evaluate4969() {
    return int8Xor(int8Input("-1"), int8Input(null));
}
function evaluate4970() {
    return int8Xor(int8Input("-1"), int8Input("0"));
}
function evaluate4971() {
    return int8Xor(int8Input("-1"), int8Input("1"));
}
function evaluate4972() {
    return int8Xor(int8Input("-1"), int8Input("-1"));
}
function evaluate4973() {
    return int8Xor(int8Input("-1"), int8Input("3"));
}
function evaluate4974() {
    return int8Xor(int8Input("-1"), int8Input("-3"));
}
function evaluate4975() {
    return int8Xor(int8Input("-1"), int8Input("-9223372036854775808"));
}
function evaluate4976() {
    return int8Xor(int8Input("-1"), int8Input("9223372036854775807"));
}
function evaluate4977() {
    return int8Xor(int8Input("3"), int8Input(null));
}
function evaluate4978() {
    return int8Xor(int8Input("3"), int8Input("0"));
}
function evaluate4979() {
    return int8Xor(int8Input("3"), int8Input("1"));
}
function evaluate4980() {
    return int8Xor(int8Input("3"), int8Input("-1"));
}
function evaluate4981() {
    return int8Xor(int8Input("3"), int8Input("3"));
}
function evaluate4982() {
    return int8Xor(int8Input("3"), int8Input("-3"));
}
function evaluate4983() {
    return int8Xor(int8Input("3"), int8Input("-9223372036854775808"));
}
function evaluate4984() {
    return int8Xor(int8Input("3"), int8Input("9223372036854775807"));
}
function evaluate4985() {
    return int8Xor(int8Input("-3"), int8Input(null));
}
function evaluate4986() {
    return int8Xor(int8Input("-3"), int8Input("0"));
}
function evaluate4987() {
    return int8Xor(int8Input("-3"), int8Input("1"));
}
function evaluate4988() {
    return int8Xor(int8Input("-3"), int8Input("-1"));
}
function evaluate4989() {
    return int8Xor(int8Input("-3"), int8Input("3"));
}
function evaluate4990() {
    return int8Xor(int8Input("-3"), int8Input("-3"));
}
function evaluate4991() {
    return int8Xor(int8Input("-3"), int8Input("-9223372036854775808"));
}
function evaluate4992() {
    return int8Xor(int8Input("-3"), int8Input("9223372036854775807"));
}
function evaluate4993() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input(null));
}
function evaluate4994() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input("0"));
}
function evaluate4995() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input("1"));
}
function evaluate4996() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input("-1"));
}
function evaluate4997() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input("3"));
}
function evaluate4998() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input("-3"));
}
function evaluate4999() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input("-9223372036854775808"));
}
function evaluate5000() {
    return int8Xor(int8Input("-9223372036854775808"), int8Input("9223372036854775807"));
}
function evaluate5001() {
    return int8Xor(int8Input("9223372036854775807"), int8Input(null));
}
function evaluate5002() {
    return int8Xor(int8Input("9223372036854775807"), int8Input("0"));
}
function evaluate5003() {
    return int8Xor(int8Input("9223372036854775807"), int8Input("1"));
}
function evaluate5004() {
    return int8Xor(int8Input("9223372036854775807"), int8Input("-1"));
}
function evaluate5005() {
    return int8Xor(int8Input("9223372036854775807"), int8Input("3"));
}
function evaluate5006() {
    return int8Xor(int8Input("9223372036854775807"), int8Input("-3"));
}
function evaluate5007() {
    return int8Xor(int8Input("9223372036854775807"), int8Input("-9223372036854775808"));
}
function evaluate5008() {
    return int8Xor(int8Input("9223372036854775807"), int8Input("9223372036854775807"));
}
function evaluate5009() {
    return int8Not(int8Input(null));
}
function evaluate5010() {
    return int8Not(int8Input("0"));
}
function evaluate5011() {
    return int8Not(int8Input("1"));
}
function evaluate5012() {
    return int8Not(int8Input("-1"));
}
function evaluate5013() {
    return int8Not(int8Input("3"));
}
function evaluate5014() {
    return int8Not(int8Input("-3"));
}
function evaluate5015() {
    return int8Not(int8Input("-9223372036854775808"));
}
function evaluate5016() {
    return int8Not(int8Input("9223372036854775807"));
}
function evaluate5017() {
    return int8Identity(int8Input(null));
}
function evaluate5018() {
    return int8Identity(int8Input("0"));
}
function evaluate5019() {
    return int8Identity(int8Input("1"));
}
function evaluate5020() {
    return int8Identity(int8Input("-1"));
}
function evaluate5021() {
    return int8Identity(int8Input("3"));
}
function evaluate5022() {
    return int8Identity(int8Input("-3"));
}
function evaluate5023() {
    return int8Identity(int8Input("-9223372036854775808"));
}
function evaluate5024() {
    return int8Identity(int8Input("9223372036854775807"));
}
function evaluate5025() {
    return int8Abs(int8Input(null));
}
function evaluate5026() {
    return int8Abs(int8Input("0"));
}
function evaluate5027() {
    return int8Abs(int8Input("1"));
}
function evaluate5028() {
    return int8Abs(int8Input("-1"));
}
function evaluate5029() {
    return int8Abs(int8Input("3"));
}
function evaluate5030() {
    return int8Abs(int8Input("-3"));
}
function evaluate5031() {
    return int8Abs(int8Input("-9223372036854775808"));
}
function evaluate5032() {
    return int8Abs(int8Input("9223372036854775807"));
}
function evaluate5033() {
    return int8Shl(int8Input(null), int4Input(null));
}
function evaluate5034() {
    return int8Shl(int8Input(null), int4Input("-2147483648"));
}
function evaluate5035() {
    return int8Shl(int8Input(null), int4Input("-65"));
}
function evaluate5036() {
    return int8Shl(int8Input(null), int4Input("-64"));
}
function evaluate5037() {
    return int8Shl(int8Input(null), int4Input("-33"));
}
function evaluate5038() {
    return int8Shl(int8Input(null), int4Input("-32"));
}
function evaluate5039() {
    return int8Shl(int8Input(null), int4Input("-17"));
}
function evaluate5040() {
    return int8Shl(int8Input(null), int4Input("-16"));
}
function evaluate5041() {
    return int8Shl(int8Input(null), int4Input("-1"));
}
function evaluate5042() {
    return int8Shl(int8Input(null), int4Input("0"));
}
function evaluate5043() {
    return int8Shl(int8Input(null), int4Input("1"));
}
function evaluate5044() {
    return int8Shl(int8Input(null), int4Input("15"));
}
function evaluate5045() {
    return int8Shl(int8Input(null), int4Input("16"));
}
function evaluate5046() {
    return int8Shl(int8Input(null), int4Input("17"));
}
function evaluate5047() {
    return int8Shl(int8Input(null), int4Input("31"));
}
function evaluate5048() {
    return int8Shl(int8Input(null), int4Input("32"));
}
function evaluate5049() {
    return int8Shl(int8Input(null), int4Input("33"));
}
function evaluate5050() {
    return int8Shl(int8Input(null), int4Input("63"));
}
function evaluate5051() {
    return int8Shl(int8Input(null), int4Input("64"));
}
function evaluate5052() {
    return int8Shl(int8Input(null), int4Input("65"));
}
function evaluate5053() {
    return int8Shl(int8Input(null), int4Input("2147483647"));
}
function evaluate5054() {
    return int8Shl(int8Input("0"), int4Input(null));
}
function evaluate5055() {
    return int8Shl(int8Input("0"), int4Input("-2147483648"));
}
function evaluate5056() {
    return int8Shl(int8Input("0"), int4Input("-65"));
}
function evaluate5057() {
    return int8Shl(int8Input("0"), int4Input("-64"));
}
function evaluate5058() {
    return int8Shl(int8Input("0"), int4Input("-33"));
}
function evaluate5059() {
    return int8Shl(int8Input("0"), int4Input("-32"));
}
function evaluate5060() {
    return int8Shl(int8Input("0"), int4Input("-17"));
}
function evaluate5061() {
    return int8Shl(int8Input("0"), int4Input("-16"));
}
function evaluate5062() {
    return int8Shl(int8Input("0"), int4Input("-1"));
}
function evaluate5063() {
    return int8Shl(int8Input("0"), int4Input("0"));
}
function evaluate5064() {
    return int8Shl(int8Input("0"), int4Input("1"));
}
function evaluate5065() {
    return int8Shl(int8Input("0"), int4Input("15"));
}
function evaluate5066() {
    return int8Shl(int8Input("0"), int4Input("16"));
}
function evaluate5067() {
    return int8Shl(int8Input("0"), int4Input("17"));
}
function evaluate5068() {
    return int8Shl(int8Input("0"), int4Input("31"));
}
function evaluate5069() {
    return int8Shl(int8Input("0"), int4Input("32"));
}
function evaluate5070() {
    return int8Shl(int8Input("0"), int4Input("33"));
}
function evaluate5071() {
    return int8Shl(int8Input("0"), int4Input("63"));
}
function evaluate5072() {
    return int8Shl(int8Input("0"), int4Input("64"));
}
function evaluate5073() {
    return int8Shl(int8Input("0"), int4Input("65"));
}
function evaluate5074() {
    return int8Shl(int8Input("0"), int4Input("2147483647"));
}
function evaluate5075() {
    return int8Shl(int8Input("1"), int4Input(null));
}
function evaluate5076() {
    return int8Shl(int8Input("1"), int4Input("-2147483648"));
}
function evaluate5077() {
    return int8Shl(int8Input("1"), int4Input("-65"));
}
function evaluate5078() {
    return int8Shl(int8Input("1"), int4Input("-64"));
}
function evaluate5079() {
    return int8Shl(int8Input("1"), int4Input("-33"));
}
function evaluate5080() {
    return int8Shl(int8Input("1"), int4Input("-32"));
}
function evaluate5081() {
    return int8Shl(int8Input("1"), int4Input("-17"));
}
function evaluate5082() {
    return int8Shl(int8Input("1"), int4Input("-16"));
}
function evaluate5083() {
    return int8Shl(int8Input("1"), int4Input("-1"));
}
function evaluate5084() {
    return int8Shl(int8Input("1"), int4Input("0"));
}
function evaluate5085() {
    return int8Shl(int8Input("1"), int4Input("1"));
}
function evaluate5086() {
    return int8Shl(int8Input("1"), int4Input("15"));
}
function evaluate5087() {
    return int8Shl(int8Input("1"), int4Input("16"));
}
function evaluate5088() {
    return int8Shl(int8Input("1"), int4Input("17"));
}
function evaluate5089() {
    return int8Shl(int8Input("1"), int4Input("31"));
}
function evaluate5090() {
    return int8Shl(int8Input("1"), int4Input("32"));
}
function evaluate5091() {
    return int8Shl(int8Input("1"), int4Input("33"));
}
function evaluate5092() {
    return int8Shl(int8Input("1"), int4Input("63"));
}
function evaluate5093() {
    return int8Shl(int8Input("1"), int4Input("64"));
}
function evaluate5094() {
    return int8Shl(int8Input("1"), int4Input("65"));
}
function evaluate5095() {
    return int8Shl(int8Input("1"), int4Input("2147483647"));
}
function evaluate5096() {
    return int8Shl(int8Input("-1"), int4Input(null));
}
function evaluate5097() {
    return int8Shl(int8Input("-1"), int4Input("-2147483648"));
}
function evaluate5098() {
    return int8Shl(int8Input("-1"), int4Input("-65"));
}
function evaluate5099() {
    return int8Shl(int8Input("-1"), int4Input("-64"));
}
function evaluate5100() {
    return int8Shl(int8Input("-1"), int4Input("-33"));
}
function evaluate5101() {
    return int8Shl(int8Input("-1"), int4Input("-32"));
}
function evaluate5102() {
    return int8Shl(int8Input("-1"), int4Input("-17"));
}
function evaluate5103() {
    return int8Shl(int8Input("-1"), int4Input("-16"));
}
function evaluate5104() {
    return int8Shl(int8Input("-1"), int4Input("-1"));
}
function evaluate5105() {
    return int8Shl(int8Input("-1"), int4Input("0"));
}
function evaluate5106() {
    return int8Shl(int8Input("-1"), int4Input("1"));
}
function evaluate5107() {
    return int8Shl(int8Input("-1"), int4Input("15"));
}
function evaluate5108() {
    return int8Shl(int8Input("-1"), int4Input("16"));
}
function evaluate5109() {
    return int8Shl(int8Input("-1"), int4Input("17"));
}
function evaluate5110() {
    return int8Shl(int8Input("-1"), int4Input("31"));
}
function evaluate5111() {
    return int8Shl(int8Input("-1"), int4Input("32"));
}
function evaluate5112() {
    return int8Shl(int8Input("-1"), int4Input("33"));
}
function evaluate5113() {
    return int8Shl(int8Input("-1"), int4Input("63"));
}
function evaluate5114() {
    return int8Shl(int8Input("-1"), int4Input("64"));
}
function evaluate5115() {
    return int8Shl(int8Input("-1"), int4Input("65"));
}
function evaluate5116() {
    return int8Shl(int8Input("-1"), int4Input("2147483647"));
}
function evaluate5117() {
    return int8Shl(int8Input("3"), int4Input(null));
}
function evaluate5118() {
    return int8Shl(int8Input("3"), int4Input("-2147483648"));
}
function evaluate5119() {
    return int8Shl(int8Input("3"), int4Input("-65"));
}
function evaluate5120() {
    return int8Shl(int8Input("3"), int4Input("-64"));
}
function evaluate5121() {
    return int8Shl(int8Input("3"), int4Input("-33"));
}
function evaluate5122() {
    return int8Shl(int8Input("3"), int4Input("-32"));
}
function evaluate5123() {
    return int8Shl(int8Input("3"), int4Input("-17"));
}
function evaluate5124() {
    return int8Shl(int8Input("3"), int4Input("-16"));
}
function evaluate5125() {
    return int8Shl(int8Input("3"), int4Input("-1"));
}
function evaluate5126() {
    return int8Shl(int8Input("3"), int4Input("0"));
}
function evaluate5127() {
    return int8Shl(int8Input("3"), int4Input("1"));
}
function evaluate5128() {
    return int8Shl(int8Input("3"), int4Input("15"));
}
function evaluate5129() {
    return int8Shl(int8Input("3"), int4Input("16"));
}
function evaluate5130() {
    return int8Shl(int8Input("3"), int4Input("17"));
}
function evaluate5131() {
    return int8Shl(int8Input("3"), int4Input("31"));
}
function evaluate5132() {
    return int8Shl(int8Input("3"), int4Input("32"));
}
function evaluate5133() {
    return int8Shl(int8Input("3"), int4Input("33"));
}
function evaluate5134() {
    return int8Shl(int8Input("3"), int4Input("63"));
}
function evaluate5135() {
    return int8Shl(int8Input("3"), int4Input("64"));
}
function evaluate5136() {
    return int8Shl(int8Input("3"), int4Input("65"));
}
function evaluate5137() {
    return int8Shl(int8Input("3"), int4Input("2147483647"));
}
function evaluate5138() {
    return int8Shl(int8Input("-3"), int4Input(null));
}
function evaluate5139() {
    return int8Shl(int8Input("-3"), int4Input("-2147483648"));
}
function evaluate5140() {
    return int8Shl(int8Input("-3"), int4Input("-65"));
}
function evaluate5141() {
    return int8Shl(int8Input("-3"), int4Input("-64"));
}
function evaluate5142() {
    return int8Shl(int8Input("-3"), int4Input("-33"));
}
function evaluate5143() {
    return int8Shl(int8Input("-3"), int4Input("-32"));
}
function evaluate5144() {
    return int8Shl(int8Input("-3"), int4Input("-17"));
}
function evaluate5145() {
    return int8Shl(int8Input("-3"), int4Input("-16"));
}
function evaluate5146() {
    return int8Shl(int8Input("-3"), int4Input("-1"));
}
function evaluate5147() {
    return int8Shl(int8Input("-3"), int4Input("0"));
}
function evaluate5148() {
    return int8Shl(int8Input("-3"), int4Input("1"));
}
function evaluate5149() {
    return int8Shl(int8Input("-3"), int4Input("15"));
}
function evaluate5150() {
    return int8Shl(int8Input("-3"), int4Input("16"));
}
function evaluate5151() {
    return int8Shl(int8Input("-3"), int4Input("17"));
}
function evaluate5152() {
    return int8Shl(int8Input("-3"), int4Input("31"));
}
function evaluate5153() {
    return int8Shl(int8Input("-3"), int4Input("32"));
}
function evaluate5154() {
    return int8Shl(int8Input("-3"), int4Input("33"));
}
function evaluate5155() {
    return int8Shl(int8Input("-3"), int4Input("63"));
}
function evaluate5156() {
    return int8Shl(int8Input("-3"), int4Input("64"));
}
function evaluate5157() {
    return int8Shl(int8Input("-3"), int4Input("65"));
}
function evaluate5158() {
    return int8Shl(int8Input("-3"), int4Input("2147483647"));
}
function evaluate5159() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input(null));
}
function evaluate5160() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-2147483648"));
}
function evaluate5161() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-65"));
}
function evaluate5162() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-64"));
}
function evaluate5163() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-33"));
}
function evaluate5164() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-32"));
}
function evaluate5165() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-17"));
}
function evaluate5166() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-16"));
}
function evaluate5167() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("-1"));
}
function evaluate5168() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("0"));
}
function evaluate5169() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("1"));
}
function evaluate5170() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("15"));
}
function evaluate5171() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("16"));
}
function evaluate5172() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("17"));
}
function evaluate5173() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("31"));
}
function evaluate5174() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("32"));
}
function evaluate5175() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("33"));
}
function evaluate5176() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("63"));
}
function evaluate5177() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("64"));
}
function evaluate5178() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("65"));
}
function evaluate5179() {
    return int8Shl(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate5180() {
    return int8Shl(int8Input("9223372036854775807"), int4Input(null));
}
function evaluate5181() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate5182() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-65"));
}
function evaluate5183() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-64"));
}
function evaluate5184() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-33"));
}
function evaluate5185() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-32"));
}
function evaluate5186() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-17"));
}
function evaluate5187() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-16"));
}
function evaluate5188() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("-1"));
}
function evaluate5189() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("0"));
}
function evaluate5190() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("1"));
}
function evaluate5191() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("15"));
}
function evaluate5192() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("16"));
}
function evaluate5193() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("17"));
}
function evaluate5194() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("31"));
}
function evaluate5195() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("32"));
}
function evaluate5196() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("33"));
}
function evaluate5197() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("63"));
}
function evaluate5198() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("64"));
}
function evaluate5199() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("65"));
}
function evaluate5200() {
    return int8Shl(int8Input("9223372036854775807"), int4Input("2147483647"));
}
function evaluate5201() {
    return int8Shr(int8Input(null), int4Input(null));
}
function evaluate5202() {
    return int8Shr(int8Input(null), int4Input("-2147483648"));
}
function evaluate5203() {
    return int8Shr(int8Input(null), int4Input("-65"));
}
function evaluate5204() {
    return int8Shr(int8Input(null), int4Input("-64"));
}
function evaluate5205() {
    return int8Shr(int8Input(null), int4Input("-33"));
}
function evaluate5206() {
    return int8Shr(int8Input(null), int4Input("-32"));
}
function evaluate5207() {
    return int8Shr(int8Input(null), int4Input("-17"));
}
function evaluate5208() {
    return int8Shr(int8Input(null), int4Input("-16"));
}
function evaluate5209() {
    return int8Shr(int8Input(null), int4Input("-1"));
}
function evaluate5210() {
    return int8Shr(int8Input(null), int4Input("0"));
}
function evaluate5211() {
    return int8Shr(int8Input(null), int4Input("1"));
}
function evaluate5212() {
    return int8Shr(int8Input(null), int4Input("15"));
}
function evaluate5213() {
    return int8Shr(int8Input(null), int4Input("16"));
}
function evaluate5214() {
    return int8Shr(int8Input(null), int4Input("17"));
}
function evaluate5215() {
    return int8Shr(int8Input(null), int4Input("31"));
}
function evaluate5216() {
    return int8Shr(int8Input(null), int4Input("32"));
}
function evaluate5217() {
    return int8Shr(int8Input(null), int4Input("33"));
}
function evaluate5218() {
    return int8Shr(int8Input(null), int4Input("63"));
}
function evaluate5219() {
    return int8Shr(int8Input(null), int4Input("64"));
}
function evaluate5220() {
    return int8Shr(int8Input(null), int4Input("65"));
}
function evaluate5221() {
    return int8Shr(int8Input(null), int4Input("2147483647"));
}
function evaluate5222() {
    return int8Shr(int8Input("0"), int4Input(null));
}
function evaluate5223() {
    return int8Shr(int8Input("0"), int4Input("-2147483648"));
}
function evaluate5224() {
    return int8Shr(int8Input("0"), int4Input("-65"));
}
function evaluate5225() {
    return int8Shr(int8Input("0"), int4Input("-64"));
}
function evaluate5226() {
    return int8Shr(int8Input("0"), int4Input("-33"));
}
function evaluate5227() {
    return int8Shr(int8Input("0"), int4Input("-32"));
}
function evaluate5228() {
    return int8Shr(int8Input("0"), int4Input("-17"));
}
function evaluate5229() {
    return int8Shr(int8Input("0"), int4Input("-16"));
}
function evaluate5230() {
    return int8Shr(int8Input("0"), int4Input("-1"));
}
function evaluate5231() {
    return int8Shr(int8Input("0"), int4Input("0"));
}
function evaluate5232() {
    return int8Shr(int8Input("0"), int4Input("1"));
}
function evaluate5233() {
    return int8Shr(int8Input("0"), int4Input("15"));
}
function evaluate5234() {
    return int8Shr(int8Input("0"), int4Input("16"));
}
function evaluate5235() {
    return int8Shr(int8Input("0"), int4Input("17"));
}
function evaluate5236() {
    return int8Shr(int8Input("0"), int4Input("31"));
}
function evaluate5237() {
    return int8Shr(int8Input("0"), int4Input("32"));
}
function evaluate5238() {
    return int8Shr(int8Input("0"), int4Input("33"));
}
function evaluate5239() {
    return int8Shr(int8Input("0"), int4Input("63"));
}
function evaluate5240() {
    return int8Shr(int8Input("0"), int4Input("64"));
}
function evaluate5241() {
    return int8Shr(int8Input("0"), int4Input("65"));
}
function evaluate5242() {
    return int8Shr(int8Input("0"), int4Input("2147483647"));
}
function evaluate5243() {
    return int8Shr(int8Input("1"), int4Input(null));
}
function evaluate5244() {
    return int8Shr(int8Input("1"), int4Input("-2147483648"));
}
function evaluate5245() {
    return int8Shr(int8Input("1"), int4Input("-65"));
}
function evaluate5246() {
    return int8Shr(int8Input("1"), int4Input("-64"));
}
function evaluate5247() {
    return int8Shr(int8Input("1"), int4Input("-33"));
}
function evaluate5248() {
    return int8Shr(int8Input("1"), int4Input("-32"));
}
function evaluate5249() {
    return int8Shr(int8Input("1"), int4Input("-17"));
}
function evaluate5250() {
    return int8Shr(int8Input("1"), int4Input("-16"));
}
function evaluate5251() {
    return int8Shr(int8Input("1"), int4Input("-1"));
}
function evaluate5252() {
    return int8Shr(int8Input("1"), int4Input("0"));
}
function evaluate5253() {
    return int8Shr(int8Input("1"), int4Input("1"));
}
function evaluate5254() {
    return int8Shr(int8Input("1"), int4Input("15"));
}
function evaluate5255() {
    return int8Shr(int8Input("1"), int4Input("16"));
}
function evaluate5256() {
    return int8Shr(int8Input("1"), int4Input("17"));
}
function evaluate5257() {
    return int8Shr(int8Input("1"), int4Input("31"));
}
function evaluate5258() {
    return int8Shr(int8Input("1"), int4Input("32"));
}
function evaluate5259() {
    return int8Shr(int8Input("1"), int4Input("33"));
}
function evaluate5260() {
    return int8Shr(int8Input("1"), int4Input("63"));
}
function evaluate5261() {
    return int8Shr(int8Input("1"), int4Input("64"));
}
function evaluate5262() {
    return int8Shr(int8Input("1"), int4Input("65"));
}
function evaluate5263() {
    return int8Shr(int8Input("1"), int4Input("2147483647"));
}
function evaluate5264() {
    return int8Shr(int8Input("-1"), int4Input(null));
}
function evaluate5265() {
    return int8Shr(int8Input("-1"), int4Input("-2147483648"));
}
function evaluate5266() {
    return int8Shr(int8Input("-1"), int4Input("-65"));
}
function evaluate5267() {
    return int8Shr(int8Input("-1"), int4Input("-64"));
}
function evaluate5268() {
    return int8Shr(int8Input("-1"), int4Input("-33"));
}
function evaluate5269() {
    return int8Shr(int8Input("-1"), int4Input("-32"));
}
function evaluate5270() {
    return int8Shr(int8Input("-1"), int4Input("-17"));
}
function evaluate5271() {
    return int8Shr(int8Input("-1"), int4Input("-16"));
}
function evaluate5272() {
    return int8Shr(int8Input("-1"), int4Input("-1"));
}
function evaluate5273() {
    return int8Shr(int8Input("-1"), int4Input("0"));
}
function evaluate5274() {
    return int8Shr(int8Input("-1"), int4Input("1"));
}
function evaluate5275() {
    return int8Shr(int8Input("-1"), int4Input("15"));
}
function evaluate5276() {
    return int8Shr(int8Input("-1"), int4Input("16"));
}
function evaluate5277() {
    return int8Shr(int8Input("-1"), int4Input("17"));
}
function evaluate5278() {
    return int8Shr(int8Input("-1"), int4Input("31"));
}
function evaluate5279() {
    return int8Shr(int8Input("-1"), int4Input("32"));
}
function evaluate5280() {
    return int8Shr(int8Input("-1"), int4Input("33"));
}
function evaluate5281() {
    return int8Shr(int8Input("-1"), int4Input("63"));
}
function evaluate5282() {
    return int8Shr(int8Input("-1"), int4Input("64"));
}
function evaluate5283() {
    return int8Shr(int8Input("-1"), int4Input("65"));
}
function evaluate5284() {
    return int8Shr(int8Input("-1"), int4Input("2147483647"));
}
function evaluate5285() {
    return int8Shr(int8Input("3"), int4Input(null));
}
function evaluate5286() {
    return int8Shr(int8Input("3"), int4Input("-2147483648"));
}
function evaluate5287() {
    return int8Shr(int8Input("3"), int4Input("-65"));
}
function evaluate5288() {
    return int8Shr(int8Input("3"), int4Input("-64"));
}
function evaluate5289() {
    return int8Shr(int8Input("3"), int4Input("-33"));
}
function evaluate5290() {
    return int8Shr(int8Input("3"), int4Input("-32"));
}
function evaluate5291() {
    return int8Shr(int8Input("3"), int4Input("-17"));
}
function evaluate5292() {
    return int8Shr(int8Input("3"), int4Input("-16"));
}
function evaluate5293() {
    return int8Shr(int8Input("3"), int4Input("-1"));
}
function evaluate5294() {
    return int8Shr(int8Input("3"), int4Input("0"));
}
function evaluate5295() {
    return int8Shr(int8Input("3"), int4Input("1"));
}
function evaluate5296() {
    return int8Shr(int8Input("3"), int4Input("15"));
}
function evaluate5297() {
    return int8Shr(int8Input("3"), int4Input("16"));
}
function evaluate5298() {
    return int8Shr(int8Input("3"), int4Input("17"));
}
function evaluate5299() {
    return int8Shr(int8Input("3"), int4Input("31"));
}
function evaluate5300() {
    return int8Shr(int8Input("3"), int4Input("32"));
}
function evaluate5301() {
    return int8Shr(int8Input("3"), int4Input("33"));
}
function evaluate5302() {
    return int8Shr(int8Input("3"), int4Input("63"));
}
function evaluate5303() {
    return int8Shr(int8Input("3"), int4Input("64"));
}
function evaluate5304() {
    return int8Shr(int8Input("3"), int4Input("65"));
}
function evaluate5305() {
    return int8Shr(int8Input("3"), int4Input("2147483647"));
}
function evaluate5306() {
    return int8Shr(int8Input("-3"), int4Input(null));
}
function evaluate5307() {
    return int8Shr(int8Input("-3"), int4Input("-2147483648"));
}
function evaluate5308() {
    return int8Shr(int8Input("-3"), int4Input("-65"));
}
function evaluate5309() {
    return int8Shr(int8Input("-3"), int4Input("-64"));
}
function evaluate5310() {
    return int8Shr(int8Input("-3"), int4Input("-33"));
}
function evaluate5311() {
    return int8Shr(int8Input("-3"), int4Input("-32"));
}
function evaluate5312() {
    return int8Shr(int8Input("-3"), int4Input("-17"));
}
function evaluate5313() {
    return int8Shr(int8Input("-3"), int4Input("-16"));
}
function evaluate5314() {
    return int8Shr(int8Input("-3"), int4Input("-1"));
}
function evaluate5315() {
    return int8Shr(int8Input("-3"), int4Input("0"));
}
function evaluate5316() {
    return int8Shr(int8Input("-3"), int4Input("1"));
}
function evaluate5317() {
    return int8Shr(int8Input("-3"), int4Input("15"));
}
function evaluate5318() {
    return int8Shr(int8Input("-3"), int4Input("16"));
}
function evaluate5319() {
    return int8Shr(int8Input("-3"), int4Input("17"));
}
function evaluate5320() {
    return int8Shr(int8Input("-3"), int4Input("31"));
}
function evaluate5321() {
    return int8Shr(int8Input("-3"), int4Input("32"));
}
function evaluate5322() {
    return int8Shr(int8Input("-3"), int4Input("33"));
}
function evaluate5323() {
    return int8Shr(int8Input("-3"), int4Input("63"));
}
function evaluate5324() {
    return int8Shr(int8Input("-3"), int4Input("64"));
}
function evaluate5325() {
    return int8Shr(int8Input("-3"), int4Input("65"));
}
function evaluate5326() {
    return int8Shr(int8Input("-3"), int4Input("2147483647"));
}
function evaluate5327() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input(null));
}
function evaluate5328() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-2147483648"));
}
function evaluate5329() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-65"));
}
function evaluate5330() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-64"));
}
function evaluate5331() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-33"));
}
function evaluate5332() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-32"));
}
function evaluate5333() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-17"));
}
function evaluate5334() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-16"));
}
function evaluate5335() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("-1"));
}
function evaluate5336() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("0"));
}
function evaluate5337() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("1"));
}
function evaluate5338() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("15"));
}
function evaluate5339() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("16"));
}
function evaluate5340() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("17"));
}
function evaluate5341() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("31"));
}
function evaluate5342() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("32"));
}
function evaluate5343() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("33"));
}
function evaluate5344() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("63"));
}
function evaluate5345() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("64"));
}
function evaluate5346() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("65"));
}
function evaluate5347() {
    return int8Shr(int8Input("-9223372036854775808"), int4Input("2147483647"));
}
function evaluate5348() {
    return int8Shr(int8Input("9223372036854775807"), int4Input(null));
}
function evaluate5349() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-2147483648"));
}
function evaluate5350() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-65"));
}
function evaluate5351() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-64"));
}
function evaluate5352() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-33"));
}
function evaluate5353() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-32"));
}
function evaluate5354() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-17"));
}
function evaluate5355() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-16"));
}
function evaluate5356() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("-1"));
}
function evaluate5357() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("0"));
}
function evaluate5358() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("1"));
}
function evaluate5359() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("15"));
}
function evaluate5360() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("16"));
}
function evaluate5361() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("17"));
}
function evaluate5362() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("31"));
}
function evaluate5363() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("32"));
}
function evaluate5364() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("33"));
}
function evaluate5365() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("63"));
}
function evaluate5366() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("64"));
}
function evaluate5367() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("65"));
}
function evaluate5368() {
    return int8Shr(int8Input("9223372036854775807"), int4Input("2147483647"));
}
function evaluate5369() {
    return float8Ceil(float8Input(null));
}
function evaluate5370() {
    return float8Ceil(float8Input("0000000000000000"));
}
function evaluate5371() {
    return float8Ceil(float8Input("8000000000000000"));
}
function evaluate5372() {
    return float8Ceil(float8Input("3ff0000000000000"));
}
function evaluate5373() {
    return float8Ceil(float8Input("bff0000000000000"));
}
function evaluate5374() {
    return float8Ceil(float8Input("4000000000000000"));
}
function evaluate5375() {
    return float8Ceil(float8Input("4008000000000000"));
}
function evaluate5376() {
    return float8Ceil(float8Input("3fe0000000000000"));
}
function evaluate5377() {
    return float8Ceil(float8Input("3fb999999999999a"));
}
function evaluate5378() {
    return float8Ceil(float8Input("7fefffffffffffff"));
}
function evaluate5379() {
    return float8Ceil(float8Input("ffefffffffffffff"));
}
function evaluate5380() {
    return float8Ceil(float8Input("0010000000000000"));
}
function evaluate5381() {
    return float8Ceil(float8Input("0000000000000001"));
}
function evaluate5382() {
    return float8Ceil(float8Input("8000000000000001"));
}
function evaluate5383() {
    return float8Ceil(float8Input("7ff8000000000000"));
}
function evaluate5384() {
    return float8Ceil(float8Input("7ff0000000000000"));
}
function evaluate5385() {
    return float8Ceil(float8Input("fff0000000000000"));
}
function evaluate5386() {
    return float8Ceil(float8Input("3fd0000000000000"));
}
function evaluate5387() {
    return float8Ceil(float8Input("bfd0000000000000"));
}
function evaluate5388() {
    return float8Ceil(float8Input("bfe0000000000000"));
}
function evaluate5389() {
    return float8Ceil(float8Input("3ff8000000000000"));
}
function evaluate5390() {
    return float8Ceil(float8Input("bff8000000000000"));
}
function evaluate5391() {
    return float8Ceil(float8Input("4004000000000000"));
}
function evaluate5392() {
    return float8Ceil(float8Input("c004000000000000"));
}
function evaluate5393() {
    return float8Ceil(float8Input("400c000000000000"));
}
function evaluate5394() {
    return float8Ceil(float8Input("c00c000000000000"));
}
function evaluate5395() {
    return float8Ceil(float8Input("3fdfffffffffffff"));
}
function evaluate5396() {
    return float8Ceil(float8Input("3fe0000000000001"));
}
function evaluate5397() {
    return float8Ceil(float8Input("3ff7ffffffffffff"));
}
function evaluate5398() {
    return float8Ceil(float8Input("3ff8000000000001"));
}
function evaluate5399() {
    return float8Ceil(float8Input("bfdfffffffffffff"));
}
function evaluate5400() {
    return float8Ceil(float8Input("bfe0000000000001"));
}
function evaluate5401() {
    return float8Ceil(float8Input("4010000000000000"));
}
function evaluate5402() {
    return float8Ceil(float8Input("4020000000000000"));
}
function evaluate5403() {
    return float8Ceil(float8Input("c020000000000000"));
}
function evaluate5404() {
    return float8Ceil(float8Input("403b000000000000"));
}
function evaluate5405() {
    return float8Ceil(float8Input("c03b000000000000"));
}
function evaluate5406() {
    return float8Ceil(float8Input("4050000000000000"));
}
function evaluate5407() {
    return float8Ceil(float8Input("c050000000000000"));
}
function evaluate5408() {
    return float8Ceil(float8Input("01a56e1fc2f8f359"));
}
function evaluate5409() {
    return float8Ceil(float8Input("81a56e1fc2f8f359"));
}
function evaluate5410() {
    return float8Ceil(float8Input("7e37e43c8800759c"));
}
function evaluate5411() {
    return float8Ceil(float8Input("fe37e43c8800759c"));
}
function evaluate5412() {
    return float8Ceil(float8Input("432fffffffffffff"));
}
function evaluate5413() {
    return float8Ceil(float8Input("c32fffffffffffff"));
}
function evaluate5414() {
    return float8Ceil(float8Input("4330000000000000"));
}
function evaluate5415() {
    return float8Ceil(float8Input("4340000000000000"));
}
function evaluate5416() {
    return float8Ceil(float8Input(null));
}
function evaluate5417() {
    return float8Ceil(float8Input("0000000000000000"));
}
function evaluate5418() {
    return float8Ceil(float8Input("8000000000000000"));
}
function evaluate5419() {
    return float8Ceil(float8Input("3ff0000000000000"));
}
function evaluate5420() {
    return float8Ceil(float8Input("bff0000000000000"));
}
function evaluate5421() {
    return float8Ceil(float8Input("4000000000000000"));
}
function evaluate5422() {
    return float8Ceil(float8Input("4008000000000000"));
}
function evaluate5423() {
    return float8Ceil(float8Input("3fe0000000000000"));
}
function evaluate5424() {
    return float8Ceil(float8Input("3fb999999999999a"));
}
function evaluate5425() {
    return float8Ceil(float8Input("7fefffffffffffff"));
}
function evaluate5426() {
    return float8Ceil(float8Input("ffefffffffffffff"));
}
function evaluate5427() {
    return float8Ceil(float8Input("0010000000000000"));
}
function evaluate5428() {
    return float8Ceil(float8Input("0000000000000001"));
}
function evaluate5429() {
    return float8Ceil(float8Input("8000000000000001"));
}
function evaluate5430() {
    return float8Ceil(float8Input("7ff8000000000000"));
}
function evaluate5431() {
    return float8Ceil(float8Input("7ff0000000000000"));
}
function evaluate5432() {
    return float8Ceil(float8Input("fff0000000000000"));
}
function evaluate5433() {
    return float8Ceil(float8Input("3fd0000000000000"));
}
function evaluate5434() {
    return float8Ceil(float8Input("bfd0000000000000"));
}
function evaluate5435() {
    return float8Ceil(float8Input("bfe0000000000000"));
}
function evaluate5436() {
    return float8Ceil(float8Input("3ff8000000000000"));
}
function evaluate5437() {
    return float8Ceil(float8Input("bff8000000000000"));
}
function evaluate5438() {
    return float8Ceil(float8Input("4004000000000000"));
}
function evaluate5439() {
    return float8Ceil(float8Input("c004000000000000"));
}
function evaluate5440() {
    return float8Ceil(float8Input("400c000000000000"));
}
function evaluate5441() {
    return float8Ceil(float8Input("c00c000000000000"));
}
function evaluate5442() {
    return float8Ceil(float8Input("3fdfffffffffffff"));
}
function evaluate5443() {
    return float8Ceil(float8Input("3fe0000000000001"));
}
function evaluate5444() {
    return float8Ceil(float8Input("3ff7ffffffffffff"));
}
function evaluate5445() {
    return float8Ceil(float8Input("3ff8000000000001"));
}
function evaluate5446() {
    return float8Ceil(float8Input("bfdfffffffffffff"));
}
function evaluate5447() {
    return float8Ceil(float8Input("bfe0000000000001"));
}
function evaluate5448() {
    return float8Ceil(float8Input("4010000000000000"));
}
function evaluate5449() {
    return float8Ceil(float8Input("4020000000000000"));
}
function evaluate5450() {
    return float8Ceil(float8Input("c020000000000000"));
}
function evaluate5451() {
    return float8Ceil(float8Input("403b000000000000"));
}
function evaluate5452() {
    return float8Ceil(float8Input("c03b000000000000"));
}
function evaluate5453() {
    return float8Ceil(float8Input("4050000000000000"));
}
function evaluate5454() {
    return float8Ceil(float8Input("c050000000000000"));
}
function evaluate5455() {
    return float8Ceil(float8Input("01a56e1fc2f8f359"));
}
function evaluate5456() {
    return float8Ceil(float8Input("81a56e1fc2f8f359"));
}
function evaluate5457() {
    return float8Ceil(float8Input("7e37e43c8800759c"));
}
function evaluate5458() {
    return float8Ceil(float8Input("fe37e43c8800759c"));
}
function evaluate5459() {
    return float8Ceil(float8Input("432fffffffffffff"));
}
function evaluate5460() {
    return float8Ceil(float8Input("c32fffffffffffff"));
}
function evaluate5461() {
    return float8Ceil(float8Input("4330000000000000"));
}
function evaluate5462() {
    return float8Ceil(float8Input("4340000000000000"));
}
function evaluate5463() {
    return float8Floor(float8Input(null));
}
function evaluate5464() {
    return float8Floor(float8Input("0000000000000000"));
}
function evaluate5465() {
    return float8Floor(float8Input("8000000000000000"));
}
function evaluate5466() {
    return float8Floor(float8Input("3ff0000000000000"));
}
function evaluate5467() {
    return float8Floor(float8Input("bff0000000000000"));
}
function evaluate5468() {
    return float8Floor(float8Input("4000000000000000"));
}
function evaluate5469() {
    return float8Floor(float8Input("4008000000000000"));
}
function evaluate5470() {
    return float8Floor(float8Input("3fe0000000000000"));
}
function evaluate5471() {
    return float8Floor(float8Input("3fb999999999999a"));
}
function evaluate5472() {
    return float8Floor(float8Input("7fefffffffffffff"));
}
function evaluate5473() {
    return float8Floor(float8Input("ffefffffffffffff"));
}
function evaluate5474() {
    return float8Floor(float8Input("0010000000000000"));
}
function evaluate5475() {
    return float8Floor(float8Input("0000000000000001"));
}
function evaluate5476() {
    return float8Floor(float8Input("8000000000000001"));
}
function evaluate5477() {
    return float8Floor(float8Input("7ff8000000000000"));
}
function evaluate5478() {
    return float8Floor(float8Input("7ff0000000000000"));
}
function evaluate5479() {
    return float8Floor(float8Input("fff0000000000000"));
}
function evaluate5480() {
    return float8Floor(float8Input("3fd0000000000000"));
}
function evaluate5481() {
    return float8Floor(float8Input("bfd0000000000000"));
}
function evaluate5482() {
    return float8Floor(float8Input("bfe0000000000000"));
}
function evaluate5483() {
    return float8Floor(float8Input("3ff8000000000000"));
}
function evaluate5484() {
    return float8Floor(float8Input("bff8000000000000"));
}
function evaluate5485() {
    return float8Floor(float8Input("4004000000000000"));
}
function evaluate5486() {
    return float8Floor(float8Input("c004000000000000"));
}
function evaluate5487() {
    return float8Floor(float8Input("400c000000000000"));
}
function evaluate5488() {
    return float8Floor(float8Input("c00c000000000000"));
}
function evaluate5489() {
    return float8Floor(float8Input("3fdfffffffffffff"));
}
function evaluate5490() {
    return float8Floor(float8Input("3fe0000000000001"));
}
function evaluate5491() {
    return float8Floor(float8Input("3ff7ffffffffffff"));
}
function evaluate5492() {
    return float8Floor(float8Input("3ff8000000000001"));
}
function evaluate5493() {
    return float8Floor(float8Input("bfdfffffffffffff"));
}
function evaluate5494() {
    return float8Floor(float8Input("bfe0000000000001"));
}
function evaluate5495() {
    return float8Floor(float8Input("4010000000000000"));
}
function evaluate5496() {
    return float8Floor(float8Input("4020000000000000"));
}
function evaluate5497() {
    return float8Floor(float8Input("c020000000000000"));
}
function evaluate5498() {
    return float8Floor(float8Input("403b000000000000"));
}
function evaluate5499() {
    return float8Floor(float8Input("c03b000000000000"));
}
function evaluate5500() {
    return float8Floor(float8Input("4050000000000000"));
}
function evaluate5501() {
    return float8Floor(float8Input("c050000000000000"));
}
function evaluate5502() {
    return float8Floor(float8Input("01a56e1fc2f8f359"));
}
function evaluate5503() {
    return float8Floor(float8Input("81a56e1fc2f8f359"));
}
function evaluate5504() {
    return float8Floor(float8Input("7e37e43c8800759c"));
}
function evaluate5505() {
    return float8Floor(float8Input("fe37e43c8800759c"));
}
function evaluate5506() {
    return float8Floor(float8Input("432fffffffffffff"));
}
function evaluate5507() {
    return float8Floor(float8Input("c32fffffffffffff"));
}
function evaluate5508() {
    return float8Floor(float8Input("4330000000000000"));
}
function evaluate5509() {
    return float8Floor(float8Input("4340000000000000"));
}
function evaluate5510() {
    return float8Round(float8Input(null));
}
function evaluate5511() {
    return float8Round(float8Input("0000000000000000"));
}
function evaluate5512() {
    return float8Round(float8Input("8000000000000000"));
}
function evaluate5513() {
    return float8Round(float8Input("3ff0000000000000"));
}
function evaluate5514() {
    return float8Round(float8Input("bff0000000000000"));
}
function evaluate5515() {
    return float8Round(float8Input("4000000000000000"));
}
function evaluate5516() {
    return float8Round(float8Input("4008000000000000"));
}
function evaluate5517() {
    return float8Round(float8Input("3fe0000000000000"));
}
function evaluate5518() {
    return float8Round(float8Input("3fb999999999999a"));
}
function evaluate5519() {
    return float8Round(float8Input("7fefffffffffffff"));
}
function evaluate5520() {
    return float8Round(float8Input("ffefffffffffffff"));
}
function evaluate5521() {
    return float8Round(float8Input("0010000000000000"));
}
function evaluate5522() {
    return float8Round(float8Input("0000000000000001"));
}
function evaluate5523() {
    return float8Round(float8Input("8000000000000001"));
}
function evaluate5524() {
    return float8Round(float8Input("7ff8000000000000"));
}
function evaluate5525() {
    return float8Round(float8Input("7ff0000000000000"));
}
function evaluate5526() {
    return float8Round(float8Input("fff0000000000000"));
}
function evaluate5527() {
    return float8Round(float8Input("3fd0000000000000"));
}
function evaluate5528() {
    return float8Round(float8Input("bfd0000000000000"));
}
function evaluate5529() {
    return float8Round(float8Input("bfe0000000000000"));
}
function evaluate5530() {
    return float8Round(float8Input("3ff8000000000000"));
}
function evaluate5531() {
    return float8Round(float8Input("bff8000000000000"));
}
function evaluate5532() {
    return float8Round(float8Input("4004000000000000"));
}
function evaluate5533() {
    return float8Round(float8Input("c004000000000000"));
}
function evaluate5534() {
    return float8Round(float8Input("400c000000000000"));
}
function evaluate5535() {
    return float8Round(float8Input("c00c000000000000"));
}
function evaluate5536() {
    return float8Round(float8Input("3fdfffffffffffff"));
}
function evaluate5537() {
    return float8Round(float8Input("3fe0000000000001"));
}
function evaluate5538() {
    return float8Round(float8Input("3ff7ffffffffffff"));
}
function evaluate5539() {
    return float8Round(float8Input("3ff8000000000001"));
}
function evaluate5540() {
    return float8Round(float8Input("bfdfffffffffffff"));
}
function evaluate5541() {
    return float8Round(float8Input("bfe0000000000001"));
}
function evaluate5542() {
    return float8Round(float8Input("4010000000000000"));
}
function evaluate5543() {
    return float8Round(float8Input("4020000000000000"));
}
function evaluate5544() {
    return float8Round(float8Input("c020000000000000"));
}
function evaluate5545() {
    return float8Round(float8Input("403b000000000000"));
}
function evaluate5546() {
    return float8Round(float8Input("c03b000000000000"));
}
function evaluate5547() {
    return float8Round(float8Input("4050000000000000"));
}
function evaluate5548() {
    return float8Round(float8Input("c050000000000000"));
}
function evaluate5549() {
    return float8Round(float8Input("01a56e1fc2f8f359"));
}
function evaluate5550() {
    return float8Round(float8Input("81a56e1fc2f8f359"));
}
function evaluate5551() {
    return float8Round(float8Input("7e37e43c8800759c"));
}
function evaluate5552() {
    return float8Round(float8Input("fe37e43c8800759c"));
}
function evaluate5553() {
    return float8Round(float8Input("432fffffffffffff"));
}
function evaluate5554() {
    return float8Round(float8Input("c32fffffffffffff"));
}
function evaluate5555() {
    return float8Round(float8Input("4330000000000000"));
}
function evaluate5556() {
    return float8Round(float8Input("4340000000000000"));
}
function evaluate5557() {
    return float8Trunc(float8Input(null));
}
function evaluate5558() {
    return float8Trunc(float8Input("0000000000000000"));
}
function evaluate5559() {
    return float8Trunc(float8Input("8000000000000000"));
}
function evaluate5560() {
    return float8Trunc(float8Input("3ff0000000000000"));
}
function evaluate5561() {
    return float8Trunc(float8Input("bff0000000000000"));
}
function evaluate5562() {
    return float8Trunc(float8Input("4000000000000000"));
}
function evaluate5563() {
    return float8Trunc(float8Input("4008000000000000"));
}
function evaluate5564() {
    return float8Trunc(float8Input("3fe0000000000000"));
}
function evaluate5565() {
    return float8Trunc(float8Input("3fb999999999999a"));
}
function evaluate5566() {
    return float8Trunc(float8Input("7fefffffffffffff"));
}
function evaluate5567() {
    return float8Trunc(float8Input("ffefffffffffffff"));
}
function evaluate5568() {
    return float8Trunc(float8Input("0010000000000000"));
}
function evaluate5569() {
    return float8Trunc(float8Input("0000000000000001"));
}
function evaluate5570() {
    return float8Trunc(float8Input("8000000000000001"));
}
function evaluate5571() {
    return float8Trunc(float8Input("7ff8000000000000"));
}
function evaluate5572() {
    return float8Trunc(float8Input("7ff0000000000000"));
}
function evaluate5573() {
    return float8Trunc(float8Input("fff0000000000000"));
}
function evaluate5574() {
    return float8Trunc(float8Input("3fd0000000000000"));
}
function evaluate5575() {
    return float8Trunc(float8Input("bfd0000000000000"));
}
function evaluate5576() {
    return float8Trunc(float8Input("bfe0000000000000"));
}
function evaluate5577() {
    return float8Trunc(float8Input("3ff8000000000000"));
}
function evaluate5578() {
    return float8Trunc(float8Input("bff8000000000000"));
}
function evaluate5579() {
    return float8Trunc(float8Input("4004000000000000"));
}
function evaluate5580() {
    return float8Trunc(float8Input("c004000000000000"));
}
function evaluate5581() {
    return float8Trunc(float8Input("400c000000000000"));
}
function evaluate5582() {
    return float8Trunc(float8Input("c00c000000000000"));
}
function evaluate5583() {
    return float8Trunc(float8Input("3fdfffffffffffff"));
}
function evaluate5584() {
    return float8Trunc(float8Input("3fe0000000000001"));
}
function evaluate5585() {
    return float8Trunc(float8Input("3ff7ffffffffffff"));
}
function evaluate5586() {
    return float8Trunc(float8Input("3ff8000000000001"));
}
function evaluate5587() {
    return float8Trunc(float8Input("bfdfffffffffffff"));
}
function evaluate5588() {
    return float8Trunc(float8Input("bfe0000000000001"));
}
function evaluate5589() {
    return float8Trunc(float8Input("4010000000000000"));
}
function evaluate5590() {
    return float8Trunc(float8Input("4020000000000000"));
}
function evaluate5591() {
    return float8Trunc(float8Input("c020000000000000"));
}
function evaluate5592() {
    return float8Trunc(float8Input("403b000000000000"));
}
function evaluate5593() {
    return float8Trunc(float8Input("c03b000000000000"));
}
function evaluate5594() {
    return float8Trunc(float8Input("4050000000000000"));
}
function evaluate5595() {
    return float8Trunc(float8Input("c050000000000000"));
}
function evaluate5596() {
    return float8Trunc(float8Input("01a56e1fc2f8f359"));
}
function evaluate5597() {
    return float8Trunc(float8Input("81a56e1fc2f8f359"));
}
function evaluate5598() {
    return float8Trunc(float8Input("7e37e43c8800759c"));
}
function evaluate5599() {
    return float8Trunc(float8Input("fe37e43c8800759c"));
}
function evaluate5600() {
    return float8Trunc(float8Input("432fffffffffffff"));
}
function evaluate5601() {
    return float8Trunc(float8Input("c32fffffffffffff"));
}
function evaluate5602() {
    return float8Trunc(float8Input("4330000000000000"));
}
function evaluate5603() {
    return float8Trunc(float8Input("4340000000000000"));
}
function evaluate5604() {
    return float8Sign(float8Input(null));
}
function evaluate5605() {
    return float8Sign(float8Input("0000000000000000"));
}
function evaluate5606() {
    return float8Sign(float8Input("8000000000000000"));
}
function evaluate5607() {
    return float8Sign(float8Input("3ff0000000000000"));
}
function evaluate5608() {
    return float8Sign(float8Input("bff0000000000000"));
}
function evaluate5609() {
    return float8Sign(float8Input("4000000000000000"));
}
function evaluate5610() {
    return float8Sign(float8Input("4008000000000000"));
}
function evaluate5611() {
    return float8Sign(float8Input("3fe0000000000000"));
}
function evaluate5612() {
    return float8Sign(float8Input("3fb999999999999a"));
}
function evaluate5613() {
    return float8Sign(float8Input("7fefffffffffffff"));
}
function evaluate5614() {
    return float8Sign(float8Input("ffefffffffffffff"));
}
function evaluate5615() {
    return float8Sign(float8Input("0010000000000000"));
}
function evaluate5616() {
    return float8Sign(float8Input("0000000000000001"));
}
function evaluate5617() {
    return float8Sign(float8Input("8000000000000001"));
}
function evaluate5618() {
    return float8Sign(float8Input("7ff8000000000000"));
}
function evaluate5619() {
    return float8Sign(float8Input("7ff0000000000000"));
}
function evaluate5620() {
    return float8Sign(float8Input("fff0000000000000"));
}
function evaluate5621() {
    return float8Sign(float8Input("3fd0000000000000"));
}
function evaluate5622() {
    return float8Sign(float8Input("bfd0000000000000"));
}
function evaluate5623() {
    return float8Sign(float8Input("bfe0000000000000"));
}
function evaluate5624() {
    return float8Sign(float8Input("3ff8000000000000"));
}
function evaluate5625() {
    return float8Sign(float8Input("bff8000000000000"));
}
function evaluate5626() {
    return float8Sign(float8Input("4004000000000000"));
}
function evaluate5627() {
    return float8Sign(float8Input("c004000000000000"));
}
function evaluate5628() {
    return float8Sign(float8Input("400c000000000000"));
}
function evaluate5629() {
    return float8Sign(float8Input("c00c000000000000"));
}
function evaluate5630() {
    return float8Sign(float8Input("3fdfffffffffffff"));
}
function evaluate5631() {
    return float8Sign(float8Input("3fe0000000000001"));
}
function evaluate5632() {
    return float8Sign(float8Input("3ff7ffffffffffff"));
}
function evaluate5633() {
    return float8Sign(float8Input("3ff8000000000001"));
}
function evaluate5634() {
    return float8Sign(float8Input("bfdfffffffffffff"));
}
function evaluate5635() {
    return float8Sign(float8Input("bfe0000000000001"));
}
function evaluate5636() {
    return float8Sign(float8Input("4010000000000000"));
}
function evaluate5637() {
    return float8Sign(float8Input("4020000000000000"));
}
function evaluate5638() {
    return float8Sign(float8Input("c020000000000000"));
}
function evaluate5639() {
    return float8Sign(float8Input("403b000000000000"));
}
function evaluate5640() {
    return float8Sign(float8Input("c03b000000000000"));
}
function evaluate5641() {
    return float8Sign(float8Input("4050000000000000"));
}
function evaluate5642() {
    return float8Sign(float8Input("c050000000000000"));
}
function evaluate5643() {
    return float8Sign(float8Input("01a56e1fc2f8f359"));
}
function evaluate5644() {
    return float8Sign(float8Input("81a56e1fc2f8f359"));
}
function evaluate5645() {
    return float8Sign(float8Input("7e37e43c8800759c"));
}
function evaluate5646() {
    return float8Sign(float8Input("fe37e43c8800759c"));
}
function evaluate5647() {
    return float8Sign(float8Input("432fffffffffffff"));
}
function evaluate5648() {
    return float8Sign(float8Input("c32fffffffffffff"));
}
function evaluate5649() {
    return float8Sign(float8Input("4330000000000000"));
}
function evaluate5650() {
    return float8Sign(float8Input("4340000000000000"));
}
function evaluate5651() {
    return float8Sqrt(float8Input(null));
}
function evaluate5652() {
    return float8Sqrt(float8Input("0000000000000000"));
}
function evaluate5653() {
    return float8Sqrt(float8Input("8000000000000000"));
}
function evaluate5654() {
    return float8Sqrt(float8Input("3ff0000000000000"));
}
function evaluate5655() {
    return float8Sqrt(float8Input("bff0000000000000"));
}
function evaluate5656() {
    return float8Sqrt(float8Input("4000000000000000"));
}
function evaluate5657() {
    return float8Sqrt(float8Input("4008000000000000"));
}
function evaluate5658() {
    return float8Sqrt(float8Input("3fe0000000000000"));
}
function evaluate5659() {
    return float8Sqrt(float8Input("3fb999999999999a"));
}
function evaluate5660() {
    return float8Sqrt(float8Input("7fefffffffffffff"));
}
function evaluate5661() {
    return float8Sqrt(float8Input("ffefffffffffffff"));
}
function evaluate5662() {
    return float8Sqrt(float8Input("0010000000000000"));
}
function evaluate5663() {
    return float8Sqrt(float8Input("0000000000000001"));
}
function evaluate5664() {
    return float8Sqrt(float8Input("8000000000000001"));
}
function evaluate5665() {
    return float8Sqrt(float8Input("7ff8000000000000"));
}
function evaluate5666() {
    return float8Sqrt(float8Input("7ff0000000000000"));
}
function evaluate5667() {
    return float8Sqrt(float8Input("fff0000000000000"));
}
function evaluate5668() {
    return float8Sqrt(float8Input("3fd0000000000000"));
}
function evaluate5669() {
    return float8Sqrt(float8Input("bfd0000000000000"));
}
function evaluate5670() {
    return float8Sqrt(float8Input("bfe0000000000000"));
}
function evaluate5671() {
    return float8Sqrt(float8Input("3ff8000000000000"));
}
function evaluate5672() {
    return float8Sqrt(float8Input("bff8000000000000"));
}
function evaluate5673() {
    return float8Sqrt(float8Input("4004000000000000"));
}
function evaluate5674() {
    return float8Sqrt(float8Input("c004000000000000"));
}
function evaluate5675() {
    return float8Sqrt(float8Input("400c000000000000"));
}
function evaluate5676() {
    return float8Sqrt(float8Input("c00c000000000000"));
}
function evaluate5677() {
    return float8Sqrt(float8Input("3fdfffffffffffff"));
}
function evaluate5678() {
    return float8Sqrt(float8Input("3fe0000000000001"));
}
function evaluate5679() {
    return float8Sqrt(float8Input("3ff7ffffffffffff"));
}
function evaluate5680() {
    return float8Sqrt(float8Input("3ff8000000000001"));
}
function evaluate5681() {
    return float8Sqrt(float8Input("bfdfffffffffffff"));
}
function evaluate5682() {
    return float8Sqrt(float8Input("bfe0000000000001"));
}
function evaluate5683() {
    return float8Sqrt(float8Input("4010000000000000"));
}
function evaluate5684() {
    return float8Sqrt(float8Input("4020000000000000"));
}
function evaluate5685() {
    return float8Sqrt(float8Input("c020000000000000"));
}
function evaluate5686() {
    return float8Sqrt(float8Input("403b000000000000"));
}
function evaluate5687() {
    return float8Sqrt(float8Input("c03b000000000000"));
}
function evaluate5688() {
    return float8Sqrt(float8Input("4050000000000000"));
}
function evaluate5689() {
    return float8Sqrt(float8Input("c050000000000000"));
}
function evaluate5690() {
    return float8Sqrt(float8Input("01a56e1fc2f8f359"));
}
function evaluate5691() {
    return float8Sqrt(float8Input("81a56e1fc2f8f359"));
}
function evaluate5692() {
    return float8Sqrt(float8Input("7e37e43c8800759c"));
}
function evaluate5693() {
    return float8Sqrt(float8Input("fe37e43c8800759c"));
}
function evaluate5694() {
    return float8Sqrt(float8Input("432fffffffffffff"));
}
function evaluate5695() {
    return float8Sqrt(float8Input("c32fffffffffffff"));
}
function evaluate5696() {
    return float8Sqrt(float8Input("4330000000000000"));
}
function evaluate5697() {
    return float8Sqrt(float8Input("4340000000000000"));
}
function evaluate5698() {
    return float8Cbrt(float8Input(null));
}
function evaluate5699() {
    return float8Cbrt(float8Input("0000000000000000"));
}
function evaluate5700() {
    return float8Cbrt(float8Input("8000000000000000"));
}
function evaluate5701() {
    return float8Cbrt(float8Input("3ff0000000000000"));
}
function evaluate5702() {
    return float8Cbrt(float8Input("bff0000000000000"));
}
function evaluate5703() {
    return float8Cbrt(float8Input("4000000000000000"));
}
function evaluate5704() {
    return float8Cbrt(float8Input("4008000000000000"));
}
function evaluate5705() {
    return float8Cbrt(float8Input("3fe0000000000000"));
}
function evaluate5706() {
    return float8Cbrt(float8Input("3fb999999999999a"));
}
function evaluate5707() {
    return float8Cbrt(float8Input("7fefffffffffffff"));
}
function evaluate5708() {
    return float8Cbrt(float8Input("ffefffffffffffff"));
}
function evaluate5709() {
    return float8Cbrt(float8Input("0010000000000000"));
}
function evaluate5710() {
    return float8Cbrt(float8Input("0000000000000001"));
}
function evaluate5711() {
    return float8Cbrt(float8Input("8000000000000001"));
}
function evaluate5712() {
    return float8Cbrt(float8Input("7ff8000000000000"));
}
function evaluate5713() {
    return float8Cbrt(float8Input("7ff0000000000000"));
}
function evaluate5714() {
    return float8Cbrt(float8Input("fff0000000000000"));
}
function evaluate5715() {
    return float8Cbrt(float8Input("3fd0000000000000"));
}
function evaluate5716() {
    return float8Cbrt(float8Input("bfd0000000000000"));
}
function evaluate5717() {
    return float8Cbrt(float8Input("bfe0000000000000"));
}
function evaluate5718() {
    return float8Cbrt(float8Input("3ff8000000000000"));
}
function evaluate5719() {
    return float8Cbrt(float8Input("bff8000000000000"));
}
function evaluate5720() {
    return float8Cbrt(float8Input("4004000000000000"));
}
function evaluate5721() {
    return float8Cbrt(float8Input("c004000000000000"));
}
function evaluate5722() {
    return float8Cbrt(float8Input("400c000000000000"));
}
function evaluate5723() {
    return float8Cbrt(float8Input("c00c000000000000"));
}
function evaluate5724() {
    return float8Cbrt(float8Input("3fdfffffffffffff"));
}
function evaluate5725() {
    return float8Cbrt(float8Input("3fe0000000000001"));
}
function evaluate5726() {
    return float8Cbrt(float8Input("3ff7ffffffffffff"));
}
function evaluate5727() {
    return float8Cbrt(float8Input("3ff8000000000001"));
}
function evaluate5728() {
    return float8Cbrt(float8Input("bfdfffffffffffff"));
}
function evaluate5729() {
    return float8Cbrt(float8Input("bfe0000000000001"));
}
function evaluate5730() {
    return float8Cbrt(float8Input("4010000000000000"));
}
function evaluate5731() {
    return float8Cbrt(float8Input("4020000000000000"));
}
function evaluate5732() {
    return float8Cbrt(float8Input("c020000000000000"));
}
function evaluate5733() {
    return float8Cbrt(float8Input("403b000000000000"));
}
function evaluate5734() {
    return float8Cbrt(float8Input("c03b000000000000"));
}
function evaluate5735() {
    return float8Cbrt(float8Input("4050000000000000"));
}
function evaluate5736() {
    return float8Cbrt(float8Input("c050000000000000"));
}
function evaluate5737() {
    return float8Cbrt(float8Input("01a56e1fc2f8f359"));
}
function evaluate5738() {
    return float8Cbrt(float8Input("81a56e1fc2f8f359"));
}
function evaluate5739() {
    return float8Cbrt(float8Input("7e37e43c8800759c"));
}
function evaluate5740() {
    return float8Cbrt(float8Input("fe37e43c8800759c"));
}
function evaluate5741() {
    return float8Cbrt(float8Input("432fffffffffffff"));
}
function evaluate5742() {
    return float8Cbrt(float8Input("c32fffffffffffff"));
}
function evaluate5743() {
    return float8Cbrt(float8Input("4330000000000000"));
}
function evaluate5744() {
    return float8Cbrt(float8Input("4340000000000000"));
}
function evaluate5745() {
    return float8Sqrt(float8Input(null));
}
function evaluate5746() {
    return float8Sqrt(float8Input("0000000000000000"));
}
function evaluate5747() {
    return float8Sqrt(float8Input("8000000000000000"));
}
function evaluate5748() {
    return float8Sqrt(float8Input("3ff0000000000000"));
}
function evaluate5749() {
    return float8Sqrt(float8Input("bff0000000000000"));
}
function evaluate5750() {
    return float8Sqrt(float8Input("4000000000000000"));
}
function evaluate5751() {
    return float8Sqrt(float8Input("4008000000000000"));
}
function evaluate5752() {
    return float8Sqrt(float8Input("3fe0000000000000"));
}
function evaluate5753() {
    return float8Sqrt(float8Input("3fb999999999999a"));
}
function evaluate5754() {
    return float8Sqrt(float8Input("7fefffffffffffff"));
}
function evaluate5755() {
    return float8Sqrt(float8Input("ffefffffffffffff"));
}
function evaluate5756() {
    return float8Sqrt(float8Input("0010000000000000"));
}
function evaluate5757() {
    return float8Sqrt(float8Input("0000000000000001"));
}
function evaluate5758() {
    return float8Sqrt(float8Input("8000000000000001"));
}
function evaluate5759() {
    return float8Sqrt(float8Input("7ff8000000000000"));
}
function evaluate5760() {
    return float8Sqrt(float8Input("7ff0000000000000"));
}
function evaluate5761() {
    return float8Sqrt(float8Input("fff0000000000000"));
}
function evaluate5762() {
    return float8Sqrt(float8Input("3fd0000000000000"));
}
function evaluate5763() {
    return float8Sqrt(float8Input("bfd0000000000000"));
}
function evaluate5764() {
    return float8Sqrt(float8Input("bfe0000000000000"));
}
function evaluate5765() {
    return float8Sqrt(float8Input("3ff8000000000000"));
}
function evaluate5766() {
    return float8Sqrt(float8Input("bff8000000000000"));
}
function evaluate5767() {
    return float8Sqrt(float8Input("4004000000000000"));
}
function evaluate5768() {
    return float8Sqrt(float8Input("c004000000000000"));
}
function evaluate5769() {
    return float8Sqrt(float8Input("400c000000000000"));
}
function evaluate5770() {
    return float8Sqrt(float8Input("c00c000000000000"));
}
function evaluate5771() {
    return float8Sqrt(float8Input("3fdfffffffffffff"));
}
function evaluate5772() {
    return float8Sqrt(float8Input("3fe0000000000001"));
}
function evaluate5773() {
    return float8Sqrt(float8Input("3ff7ffffffffffff"));
}
function evaluate5774() {
    return float8Sqrt(float8Input("3ff8000000000001"));
}
function evaluate5775() {
    return float8Sqrt(float8Input("bfdfffffffffffff"));
}
function evaluate5776() {
    return float8Sqrt(float8Input("bfe0000000000001"));
}
function evaluate5777() {
    return float8Sqrt(float8Input("4010000000000000"));
}
function evaluate5778() {
    return float8Sqrt(float8Input("4020000000000000"));
}
function evaluate5779() {
    return float8Sqrt(float8Input("c020000000000000"));
}
function evaluate5780() {
    return float8Sqrt(float8Input("403b000000000000"));
}
function evaluate5781() {
    return float8Sqrt(float8Input("c03b000000000000"));
}
function evaluate5782() {
    return float8Sqrt(float8Input("4050000000000000"));
}
function evaluate5783() {
    return float8Sqrt(float8Input("c050000000000000"));
}
function evaluate5784() {
    return float8Sqrt(float8Input("01a56e1fc2f8f359"));
}
function evaluate5785() {
    return float8Sqrt(float8Input("81a56e1fc2f8f359"));
}
function evaluate5786() {
    return float8Sqrt(float8Input("7e37e43c8800759c"));
}
function evaluate5787() {
    return float8Sqrt(float8Input("fe37e43c8800759c"));
}
function evaluate5788() {
    return float8Sqrt(float8Input("432fffffffffffff"));
}
function evaluate5789() {
    return float8Sqrt(float8Input("c32fffffffffffff"));
}
function evaluate5790() {
    return float8Sqrt(float8Input("4330000000000000"));
}
function evaluate5791() {
    return float8Sqrt(float8Input("4340000000000000"));
}
function evaluate5792() {
    return float8Cbrt(float8Input(null));
}
function evaluate5793() {
    return float8Cbrt(float8Input("0000000000000000"));
}
function evaluate5794() {
    return float8Cbrt(float8Input("8000000000000000"));
}
function evaluate5795() {
    return float8Cbrt(float8Input("3ff0000000000000"));
}
function evaluate5796() {
    return float8Cbrt(float8Input("bff0000000000000"));
}
function evaluate5797() {
    return float8Cbrt(float8Input("4000000000000000"));
}
function evaluate5798() {
    return float8Cbrt(float8Input("4008000000000000"));
}
function evaluate5799() {
    return float8Cbrt(float8Input("3fe0000000000000"));
}
function evaluate5800() {
    return float8Cbrt(float8Input("3fb999999999999a"));
}
function evaluate5801() {
    return float8Cbrt(float8Input("7fefffffffffffff"));
}
function evaluate5802() {
    return float8Cbrt(float8Input("ffefffffffffffff"));
}
function evaluate5803() {
    return float8Cbrt(float8Input("0010000000000000"));
}
function evaluate5804() {
    return float8Cbrt(float8Input("0000000000000001"));
}
function evaluate5805() {
    return float8Cbrt(float8Input("8000000000000001"));
}
function evaluate5806() {
    return float8Cbrt(float8Input("7ff8000000000000"));
}
function evaluate5807() {
    return float8Cbrt(float8Input("7ff0000000000000"));
}
function evaluate5808() {
    return float8Cbrt(float8Input("fff0000000000000"));
}
function evaluate5809() {
    return float8Cbrt(float8Input("3fd0000000000000"));
}
function evaluate5810() {
    return float8Cbrt(float8Input("bfd0000000000000"));
}
function evaluate5811() {
    return float8Cbrt(float8Input("bfe0000000000000"));
}
function evaluate5812() {
    return float8Cbrt(float8Input("3ff8000000000000"));
}
function evaluate5813() {
    return float8Cbrt(float8Input("bff8000000000000"));
}
function evaluate5814() {
    return float8Cbrt(float8Input("4004000000000000"));
}
function evaluate5815() {
    return float8Cbrt(float8Input("c004000000000000"));
}
function evaluate5816() {
    return float8Cbrt(float8Input("400c000000000000"));
}
function evaluate5817() {
    return float8Cbrt(float8Input("c00c000000000000"));
}
function evaluate5818() {
    return float8Cbrt(float8Input("3fdfffffffffffff"));
}
function evaluate5819() {
    return float8Cbrt(float8Input("3fe0000000000001"));
}
function evaluate5820() {
    return float8Cbrt(float8Input("3ff7ffffffffffff"));
}
function evaluate5821() {
    return float8Cbrt(float8Input("3ff8000000000001"));
}
function evaluate5822() {
    return float8Cbrt(float8Input("bfdfffffffffffff"));
}
function evaluate5823() {
    return float8Cbrt(float8Input("bfe0000000000001"));
}
function evaluate5824() {
    return float8Cbrt(float8Input("4010000000000000"));
}
function evaluate5825() {
    return float8Cbrt(float8Input("4020000000000000"));
}
function evaluate5826() {
    return float8Cbrt(float8Input("c020000000000000"));
}
function evaluate5827() {
    return float8Cbrt(float8Input("403b000000000000"));
}
function evaluate5828() {
    return float8Cbrt(float8Input("c03b000000000000"));
}
function evaluate5829() {
    return float8Cbrt(float8Input("4050000000000000"));
}
function evaluate5830() {
    return float8Cbrt(float8Input("c050000000000000"));
}
function evaluate5831() {
    return float8Cbrt(float8Input("01a56e1fc2f8f359"));
}
function evaluate5832() {
    return float8Cbrt(float8Input("81a56e1fc2f8f359"));
}
function evaluate5833() {
    return float8Cbrt(float8Input("7e37e43c8800759c"));
}
function evaluate5834() {
    return float8Cbrt(float8Input("fe37e43c8800759c"));
}
function evaluate5835() {
    return float8Cbrt(float8Input("432fffffffffffff"));
}
function evaluate5836() {
    return float8Cbrt(float8Input("c32fffffffffffff"));
}
function evaluate5837() {
    return float8Cbrt(float8Input("4330000000000000"));
}
function evaluate5838() {
    return float8Cbrt(float8Input("4340000000000000"));
}
function evaluate5839() {
    return float8Cbrt(float8Input("0000000000000001"));
}
function evaluate5840() {
    return float8Sqrt(float8Input("0000000000000001"));
}
function evaluate5841() {
    return float8Cbrt(float8Input("8000000000000001"));
}
function evaluate5842() {
    return float8Sqrt(float8Input("8000000000000001"));
}
function evaluate5843() {
    return float8Cbrt(float8Input("0000000000bf1724"));
}
function evaluate5844() {
    return float8Sqrt(float8Input("0000000000bf1724"));
}
function evaluate5845() {
    return float8Cbrt(float8Input("8000000000bf1724"));
}
function evaluate5846() {
    return float8Sqrt(float8Input("8000000000bf1724"));
}
function evaluate5847() {
    return float8Cbrt(float8Input("0000423bc5b70000"));
}
function evaluate5848() {
    return float8Sqrt(float8Input("0000423bc5b70000"));
}
function evaluate5849() {
    return float8Cbrt(float8Input("8000423bc5b70000"));
}
function evaluate5850() {
    return float8Sqrt(float8Input("8000423bc5b70000"));
}
function evaluate5851() {
    return float8Cbrt(float8Input("0122f2ac48b00000"));
}
function evaluate5852() {
    return float8Sqrt(float8Input("0122f2ac48b00000"));
}
function evaluate5853() {
    return float8Cbrt(float8Input("8122f2ac48b00000"));
}
function evaluate5854() {
    return float8Sqrt(float8Input("8122f2ac48b00000"));
}
function evaluate5855() {
    return float8Cbrt(float8Input("029dd7d506e00000"));
}
function evaluate5856() {
    return float8Sqrt(float8Input("029dd7d506e00000"));
}
function evaluate5857() {
    return float8Cbrt(float8Input("829dd7d506e00000"));
}
function evaluate5858() {
    return float8Sqrt(float8Input("829dd7d506e00000"));
}
function evaluate5859() {
    return float8Cbrt(float8Input("0404495dcf500000"));
}
function evaluate5860() {
    return float8Sqrt(float8Input("0404495dcf500000"));
}
function evaluate5861() {
    return float8Cbrt(float8Input("8404495dcf500000"));
}
function evaluate5862() {
    return float8Sqrt(float8Input("8404495dcf500000"));
}
function evaluate5863() {
    return float8Cbrt(float8Input("0570201c9d000000"));
}
function evaluate5864() {
    return float8Sqrt(float8Input("0570201c9d000000"));
}
function evaluate5865() {
    return float8Cbrt(float8Input("8570201c9d000000"));
}
function evaluate5866() {
    return float8Sqrt(float8Input("8570201c9d000000"));
}
function evaluate5867() {
    return float8Cbrt(float8Input("06ec23f12ef00000"));
}
function evaluate5868() {
    return float8Sqrt(float8Input("06ec23f12ef00000"));
}
function evaluate5869() {
    return float8Cbrt(float8Input("86ec23f12ef00000"));
}
function evaluate5870() {
    return float8Sqrt(float8Input("86ec23f12ef00000"));
}
function evaluate5871() {
    return float8Cbrt(float8Input("0851485238200000"));
}
function evaluate5872() {
    return float8Sqrt(float8Input("0851485238200000"));
}
function evaluate5873() {
    return float8Cbrt(float8Input("8851485238200000"));
}
function evaluate5874() {
    return float8Sqrt(float8Input("8851485238200000"));
}
function evaluate5875() {
    return float8Cbrt(float8Input("09ccb098cf900000"));
}
function evaluate5876() {
    return float8Sqrt(float8Input("09ccb098cf900000"));
}
function evaluate5877() {
    return float8Cbrt(float8Input("89ccb098cf900000"));
}
function evaluate5878() {
    return float8Sqrt(float8Input("89ccb098cf900000"));
}
function evaluate5879() {
    return float8Cbrt(float8Input("0b31e67520400000"));
}
function evaluate5880() {
    return float8Sqrt(float8Input("0b31e67520400000"));
}
function evaluate5881() {
    return float8Cbrt(float8Input("8b31e67520400000"));
}
function evaluate5882() {
    return float8Sqrt(float8Input("8b31e67520400000"));
}
function evaluate5883() {
    return float8Cbrt(float8Input("0caf4bfb59300000"));
}
function evaluate5884() {
    return float8Sqrt(float8Input("0caf4bfb59300000"));
}
function evaluate5885() {
    return float8Cbrt(float8Input("8caf4bfb59300000"));
}
function evaluate5886() {
    return float8Sqrt(float8Input("8caf4bfb59300000"));
}
function evaluate5887() {
    return float8Cbrt(float8Input("0e1c7debdd600000"));
}
function evaluate5888() {
    return float8Sqrt(float8Input("0e1c7debdd600000"));
}
function evaluate5889() {
    return float8Cbrt(float8Input("8e1c7debdd600000"));
}
function evaluate5890() {
    return float8Sqrt(float8Input("8e1c7debdd600000"));
}
function evaluate5891() {
    return float8Cbrt(float8Input("0f8ac47db3d00000"));
}
function evaluate5892() {
    return float8Sqrt(float8Input("0f8ac47db3d00000"));
}
function evaluate5893() {
    return float8Cbrt(float8Input("8f8ac47db3d00000"));
}
function evaluate5894() {
    return float8Sqrt(float8Input("8f8ac47db3d00000"));
}
function evaluate5895() {
    return float8Cbrt(float8Input("10f0664637800000"));
}
function evaluate5896() {
    return float8Sqrt(float8Input("10f0664637800000"));
}
function evaluate5897() {
    return float8Cbrt(float8Input("90f0664637800000"));
}
function evaluate5898() {
    return float8Sqrt(float8Input("90f0664637800000"));
}
function evaluate5899() {
    return float8Cbrt(float8Input("12645e1d07700000"));
}
function evaluate5900() {
    return float8Sqrt(float8Input("12645e1d07700000"));
}
function evaluate5901() {
    return float8Cbrt(float8Input("92645e1d07700000"));
}
function evaluate5902() {
    return float8Sqrt(float8Input("92645e1d07700000"));
}
function evaluate5903() {
    return float8Cbrt(float8Input("13d1d94f36a00000"));
}
function evaluate5904() {
    return float8Sqrt(float8Input("13d1d94f36a00000"));
}
function evaluate5905() {
    return float8Cbrt(float8Input("93d1d94f36a00000"));
}
function evaluate5906() {
    return float8Sqrt(float8Input("93d1d94f36a00000"));
}
function evaluate5907() {
    return float8Cbrt(float8Input("154db558bc100000"));
}
function evaluate5908() {
    return float8Sqrt(float8Input("154db558bc100000"));
}
function evaluate5909() {
    return float8Cbrt(float8Input("954db558bc100000"));
}
function evaluate5910() {
    return float8Sqrt(float8Input("954db558bc100000"));
}
function evaluate5911() {
    return float8Cbrt(float8Input("16b1b4ef22c00000"));
}
function evaluate5912() {
    return float8Sqrt(float8Input("16b1b4ef22c00000"));
}
function evaluate5913() {
    return float8Cbrt(float8Input("96b1b4ef22c00000"));
}
function evaluate5914() {
    return float8Sqrt(float8Input("96b1b4ef22c00000"));
}
function evaluate5915() {
    return float8Cbrt(float8Input("182ba3ac79b00000"));
}
function evaluate5916() {
    return float8Sqrt(float8Input("182ba3ac79b00000"));
}
function evaluate5917() {
    return float8Cbrt(float8Input("982ba3ac79b00000"));
}
function evaluate5918() {
    return float8Sqrt(float8Input("982ba3ac79b00000"));
}
function evaluate5919() {
    return float8Cbrt(float8Input("1999b15d83e00000"));
}
function evaluate5920() {
    return float8Sqrt(float8Input("1999b15d83e00000"));
}
function evaluate5921() {
    return float8Cbrt(float8Input("9999b15d83e00000"));
}
function evaluate5922() {
    return float8Sqrt(float8Input("9999b15d83e00000"));
}
function evaluate5923() {
    return float8Cbrt(float8Input("1b0eec1a28500000"));
}
function evaluate5924() {
    return float8Sqrt(float8Input("1b0eec1a28500000"));
}
function evaluate5925() {
    return float8Cbrt(float8Input("9b0eec1a28500000"));
}
function evaluate5926() {
    return float8Sqrt(float8Input("9b0eec1a28500000"));
}
function evaluate5927() {
    return float8Cbrt(float8Input("1c76202322000000"));
}
function evaluate5928() {
    return float8Sqrt(float8Input("1c76202322000000"));
}
function evaluate5929() {
    return float8Cbrt(float8Input("9c76202322000000"));
}
function evaluate5930() {
    return float8Sqrt(float8Input("9c76202322000000"));
}
function evaluate5931() {
    return float8Cbrt(float8Input("1defba43eff00000"));
}
function evaluate5932() {
    return float8Sqrt(float8Input("1defba43eff00000"));
}
function evaluate5933() {
    return float8Cbrt(float8Input("9defba43eff00000"));
}
function evaluate5934() {
    return float8Sqrt(float8Input("9defba43eff00000"));
}
function evaluate5935() {
    return float8Cbrt(float8Input("1f59bc6c05200000"));
}
function evaluate5936() {
    return float8Sqrt(float8Input("1f59bc6c05200000"));
}
function evaluate5937() {
    return float8Cbrt(float8Input("9f59bc6c05200000"));
}
function evaluate5938() {
    return float8Sqrt(float8Input("9f59bc6c05200000"));
}
function evaluate5939() {
    return float8Cbrt(float8Input("20c1e29638900000"));
}
function evaluate5940() {
    return float8Sqrt(float8Input("20c1e29638900000"));
}
function evaluate5941() {
    return float8Cbrt(float8Input("a0c1e29638900000"));
}
function evaluate5942() {
    return float8Sqrt(float8Input("a0c1e29638900000"));
}
function evaluate5943() {
    return float8Cbrt(float8Input("223fa92975400000"));
}
function evaluate5944() {
    return float8Sqrt(float8Input("223fa92975400000"));
}
function evaluate5945() {
    return float8Cbrt(float8Input("a23fa92975400000"));
}
function evaluate5946() {
    return float8Sqrt(float8Input("a23fa92975400000"));
}
function evaluate5947() {
    return float8Cbrt(float8Input("23a25601aa300000"));
}
function evaluate5948() {
    return float8Sqrt(float8Input("23a25601aa300000"));
}
function evaluate5949() {
    return float8Cbrt(float8Input("a3a25601aa300000"));
}
function evaluate5950() {
    return float8Sqrt(float8Input("a3a25601aa300000"));
}
function evaluate5951() {
    return float8Cbrt(float8Input("25106d83fa600000"));
}
function evaluate5952() {
    return float8Sqrt(float8Input("25106d83fa600000"));
}
function evaluate5953() {
    return float8Cbrt(float8Input("a5106d83fa600000"));
}
function evaluate5954() {
    return float8Sqrt(float8Input("a5106d83fa600000"));
}
function evaluate5955() {
    return float8Cbrt(float8Input("268f5fc52cd00000"));
}
function evaluate5956() {
    return float8Sqrt(float8Input("268f5fc52cd00000"));
}
function evaluate5957() {
    return float8Cbrt(float8Input("a68f5fc52cd00000"));
}
function evaluate5958() {
    return float8Sqrt(float8Input("a68f5fc52cd00000"));
}
function evaluate5959() {
    return float8Cbrt(float8Input("27f5941d5c800000"));
}
function evaluate5960() {
    return float8Sqrt(float8Input("27f5941d5c800000"));
}
function evaluate5961() {
    return float8Cbrt(float8Input("a7f5941d5c800000"));
}
function evaluate5962() {
    return float8Sqrt(float8Input("a7f5941d5c800000"));
}
function evaluate5963() {
    return float8Cbrt(float8Input("296e07c7e8700000"));
}
function evaluate5964() {
    return float8Sqrt(float8Input("296e07c7e8700000"));
}
function evaluate5965() {
    return float8Cbrt(float8Input("a96e07c7e8700000"));
}
function evaluate5966() {
    return float8Sqrt(float8Input("a96e07c7e8700000"));
}
function evaluate5967() {
    return float8Cbrt(float8Input("2ad985a2a3a00000"));
}
function evaluate5968() {
    return float8Sqrt(float8Input("2ad985a2a3a00000"));
}
function evaluate5969() {
    return float8Cbrt(float8Input("aad985a2a3a00000"));
}
function evaluate5970() {
    return float8Sqrt(float8Input("aad985a2a3a00000"));
}
function evaluate5971() {
    return float8Cbrt(float8Input("2c40580345100000"));
}
function evaluate5972() {
    return float8Sqrt(float8Input("2c40580345100000"));
}
function evaluate5973() {
    return float8Cbrt(float8Input("ac40580345100000"));
}
function evaluate5974() {
    return float8Sqrt(float8Input("ac40580345100000"));
}
function evaluate5975() {
    return float8Cbrt(float8Input("2dbb4b2e17c00000"));
}
function evaluate5976() {
    return float8Sqrt(float8Input("2dbb4b2e17c00000"));
}
function evaluate5977() {
    return float8Cbrt(float8Input("adbb4b2e17c00000"));
}
function evaluate5978() {
    return float8Sqrt(float8Input("adbb4b2e17c00000"));
}
function evaluate5979() {
    return float8Cbrt(float8Input("2f2b477ceab00000"));
}
function evaluate5980() {
    return float8Sqrt(float8Input("2f2b477ceab00000"));
}
function evaluate5981() {
    return float8Cbrt(float8Input("af2b477ceab00000"));
}
function evaluate5982() {
    return float8Sqrt(float8Input("af2b477ceab00000"));
}
function evaluate5983() {
    return float8Cbrt(float8Input("309518f940e00000"));
}
function evaluate5984() {
    return float8Sqrt(float8Input("309518f940e00000"));
}
function evaluate5985() {
    return float8Cbrt(float8Input("b09518f940e00000"));
}
function evaluate5986() {
    return float8Sqrt(float8Input("b09518f940e00000"));
}
function evaluate5987() {
    return float8Cbrt(float8Input("3200b150c1500000"));
}
function evaluate5988() {
    return float8Sqrt(float8Input("3200b150c1500000"));
}
function evaluate5989() {
    return float8Cbrt(float8Input("b200b150c1500000"));
}
function evaluate5990() {
    return float8Sqrt(float8Input("b200b150c1500000"));
}
function evaluate5991() {
    return float8Cbrt(float8Input("3375d5dee7000000"));
}
function evaluate5992() {
    return float8Sqrt(float8Input("3375d5dee7000000"));
}
function evaluate5993() {
    return float8Cbrt(float8Input("b375d5dee7000000"));
}
function evaluate5994() {
    return float8Sqrt(float8Input("b375d5dee7000000"));
}
function evaluate5995() {
    return float8Cbrt(float8Input("34eb024af0f00000"));
}
function evaluate5996() {
    return float8Sqrt(float8Input("34eb024af0f00000"));
}
function evaluate5997() {
    return float8Cbrt(float8Input("b4eb024af0f00000"));
}
function evaluate5998() {
    return float8Sqrt(float8Input("b4eb024af0f00000"));
}
function evaluate5999() {
    return float8Cbrt(float8Input("365e482d12200000"));
}
function evaluate6000() {
    return float8Sqrt(float8Input("365e482d12200000"));
}
function evaluate6001() {
    return float8Cbrt(float8Input("b65e482d12200000"));
}
function evaluate6002() {
    return float8Sqrt(float8Input("b65e482d12200000"));
}
function evaluate6003() {
    return float8Cbrt(float8Input("37c62b91e1900000"));
}
function evaluate6004() {
    return float8Sqrt(float8Input("37c62b91e1900000"));
}
function evaluate6005() {
    return float8Cbrt(float8Input("b7c62b91e1900000"));
}
function evaluate6006() {
    return float8Sqrt(float8Input("b7c62b91e1900000"));
}
function evaluate6007() {
    return float8Cbrt(float8Input("393f24470a400000"));
}
function evaluate6008() {
    return float8Sqrt(float8Input("393f24470a400000"));
}
function evaluate6009() {
    return float8Cbrt(float8Input("b93f24470a400000"));
}
function evaluate6010() {
    return float8Sqrt(float8Input("b93f24470a400000"));
}
function evaluate6011() {
    return float8Cbrt(float8Input("3aacece03b300000"));
}
function evaluate6012() {
    return float8Sqrt(float8Input("3aacece03b300000"));
}
function evaluate6013() {
    return float8Cbrt(float8Input("baacece03b300000"));
}
function evaluate6014() {
    return float8Sqrt(float8Input("baacece03b300000"));
}
function evaluate6015() {
    return float8Cbrt(float8Input("3c12ed9757600000"));
}
function evaluate6016() {
    return float8Sqrt(float8Input("3c12ed9757600000"));
}
function evaluate6017() {
    return float8Cbrt(float8Input("bc12ed9757600000"));
}
function evaluate6018() {
    return float8Sqrt(float8Input("bc12ed9757600000"));
}
function evaluate6019() {
    return float8Cbrt(float8Input("3d8baccee5d00000"));
}
function evaluate6020() {
    return float8Sqrt(float8Input("3d8baccee5d00000"));
}
function evaluate6021() {
    return float8Cbrt(float8Input("bd8baccee5d00000"));
}
function evaluate6022() {
    return float8Sqrt(float8Input("bd8baccee5d00000"));
}
function evaluate6023() {
    return float8Cbrt(float8Input("3efa6e51c1800000"));
}
function evaluate6024() {
    return float8Sqrt(float8Input("3efa6e51c1800000"));
}
function evaluate6025() {
    return float8Cbrt(float8Input("befa6e51c1800000"));
}
function evaluate6026() {
    return float8Sqrt(float8Input("befa6e51c1800000"));
}
function evaluate6027() {
    return float8Cbrt(float8Input("406bd9af09700000"));
}
function evaluate6028() {
    return float8Sqrt(float8Input("406bd9af09700000"));
}
function evaluate6029() {
    return float8Cbrt(float8Input("c06bd9af09700000"));
}
function evaluate6030() {
    return float8Sqrt(float8Input("c06bd9af09700000"));
}
function evaluate6031() {
    return float8Cbrt(float8Input("41d17e8550a00000"));
}
function evaluate6032() {
    return float8Sqrt(float8Input("41d17e8550a00000"));
}
function evaluate6033() {
    return float8Cbrt(float8Input("c1d17e8550a00000"));
}
function evaluate6034() {
    return float8Sqrt(float8Input("c1d17e8550a00000"));
}
function evaluate6035() {
    return float8Cbrt(float8Input("434531740e100000"));
}
function evaluate6036() {
    return float8Sqrt(float8Input("434531740e100000"));
}
function evaluate6037() {
    return float8Cbrt(float8Input("c34531740e100000"));
}
function evaluate6038() {
    return float8Sqrt(float8Input("c34531740e100000"));
}
function evaluate6039() {
    return float8Cbrt(float8Input("44b0e6fe4cc00000"));
}
function evaluate6040() {
    return float8Sqrt(float8Input("44b0e6fe4cc00000"));
}
function evaluate6041() {
    return float8Cbrt(float8Input("c4b0e6fe4cc00000"));
}
function evaluate6042() {
    return float8Sqrt(float8Input("c4b0e6fe4cc00000"));
}
function evaluate6043() {
    return float8Cbrt(float8Input("462e532d9bb00000"));
}
function evaluate6044() {
    return float8Sqrt(float8Input("462e532d9bb00000"));
}
function evaluate6045() {
    return float8Cbrt(float8Input("c62e532d9bb00000"));
}
function evaluate6046() {
    return float8Sqrt(float8Input("c62e532d9bb00000"));
}
function evaluate6047() {
    return float8Cbrt(float8Input("479660783de00000"));
}
function evaluate6048() {
    return float8Sqrt(float8Input("479660783de00000"));
}
function evaluate6049() {
    return float8Cbrt(float8Input("c79660783de00000"));
}
function evaluate6050() {
    return float8Sqrt(float8Input("c79660783de00000"));
}
function evaluate6051() {
    return float8Cbrt(float8Input("4904a0919a500000"));
}
function evaluate6052() {
    return float8Sqrt(float8Input("4904a0919a500000"));
}
function evaluate6053() {
    return float8Cbrt(float8Input("c904a0919a500000"));
}
function evaluate6054() {
    return float8Sqrt(float8Input("c904a0919a500000"));
}
function evaluate6055() {
    return float8Cbrt(float8Input("4a72039fec000000"));
}
function evaluate6056() {
    return float8Sqrt(float8Input("4a72039fec000000"));
}
function evaluate6057() {
    return float8Cbrt(float8Input("ca72039fec000000"));
}
function evaluate6058() {
    return float8Sqrt(float8Input("ca72039fec000000"));
}
function evaluate6059() {
    return float8Cbrt(float8Input("4bedba1631f00000"));
}
function evaluate6060() {
    return float8Sqrt(float8Input("4bedba1631f00000"));
}
function evaluate6061() {
    return float8Cbrt(float8Input("cbedba1631f00000"));
}
function evaluate6062() {
    return float8Sqrt(float8Input("cbedba1631f00000"));
}
function evaluate6063() {
    return float8Cbrt(float8Input("4d55f2655f200000"));
}
function evaluate6064() {
    return float8Sqrt(float8Input("4d55f2655f200000"));
}
function evaluate6065() {
    return float8Cbrt(float8Input("cd55f2655f200000"));
}
function evaluate6066() {
    return float8Sqrt(float8Input("cd55f2655f200000"));
}
function evaluate6067() {
    return float8Cbrt(float8Input("4ecbc41bca900000"));
}
function evaluate6068() {
    return float8Sqrt(float8Input("4ecbc41bca900000"));
}
function evaluate6069() {
    return float8Cbrt(float8Input("cecbc41bca900000"));
}
function evaluate6070() {
    return float8Sqrt(float8Input("cecbc41bca900000"));
}
function evaluate6071() {
    return float8Cbrt(float8Input("5036971ddf400000"));
}
function evaluate6072() {
    return float8Sqrt(float8Input("5036971ddf400000"));
}
function evaluate6073() {
    return float8Cbrt(float8Input("d036971ddf400000"));
}
function evaluate6074() {
    return float8Sqrt(float8Input("d036971ddf400000"));
}
function evaluate6075() {
    return float8Cbrt(float8Input("51aa27a70c300000"));
}
function evaluate6076() {
    return float8Sqrt(float8Input("51aa27a70c300000"));
}
function evaluate6077() {
    return float8Cbrt(float8Input("d1aa27a70c300000"));
}
function evaluate6078() {
    return float8Sqrt(float8Input("d1aa27a70c300000"));
}
function evaluate6079() {
    return float8Cbrt(float8Input("531489f5f4600000"));
}
function evaluate6080() {
    return float8Sqrt(float8Input("531489f5f4600000"));
}
function evaluate6081() {
    return float8Cbrt(float8Input("d31489f5f4600000"));
}
function evaluate6082() {
    return float8Sqrt(float8Input("d31489f5f4600000"));
}
function evaluate6083() {
    return float8Cbrt(float8Input("548ba52aded00000"));
}
function evaluate6084() {
    return float8Sqrt(float8Input("548ba52aded00000"));
}
function evaluate6085() {
    return float8Cbrt(float8Input("d48ba52aded00000"));
}
function evaluate6086() {
    return float8Sqrt(float8Input("d48ba52aded00000"));
}
function evaluate6087() {
    return float8Cbrt(float8Input("55fa013366800000"));
}
function evaluate6088() {
    return float8Sqrt(float8Input("55fa013366800000"));
}
function evaluate6089() {
    return float8Cbrt(float8Input("d5fa013366800000"));
}
function evaluate6090() {
    return float8Sqrt(float8Input("d5fa013366800000"));
}
function evaluate6091() {
    return float8Cbrt(float8Input("576553e26a700000"));
}
function evaluate6092() {
    return float8Sqrt(float8Input("576553e26a700000"));
}
function evaluate6093() {
    return float8Cbrt(float8Input("d76553e26a700000"));
}
function evaluate6094() {
    return float8Sqrt(float8Input("d76553e26a700000"));
}
function evaluate6095() {
    return float8Cbrt(float8Input("58d1a4c73da00000"));
}
function evaluate6096() {
    return float8Sqrt(float8Input("58d1a4c73da00000"));
}
function evaluate6097() {
    return float8Cbrt(float8Input("d8d1a4c73da00000"));
}
function evaluate6098() {
    return float8Sqrt(float8Input("d8d1a4c73da00000"));
}
function evaluate6099() {
    return float8Cbrt(float8Input("5a458c3b17100000"));
}
function evaluate6100() {
    return float8Sqrt(float8Input("5a458c3b17100000"));
}
function evaluate6101() {
    return float8Cbrt(float8Input("da458c3b17100000"));
}
function evaluate6102() {
    return float8Sqrt(float8Input("da458c3b17100000"));
}
function evaluate6103() {
    return float8Cbrt(float8Input("5bb0b1afc1c00000"));
}
function evaluate6104() {
    return float8Sqrt(float8Input("5bb0b1afc1c00000"));
}
function evaluate6105() {
    return float8Cbrt(float8Input("dbb0b1afc1c00000"));
}
function evaluate6106() {
    return float8Sqrt(float8Input("dbb0b1afc1c00000"));
}
function evaluate6107() {
    return float8Cbrt(float8Input("5d22bfce8cb00000"));
}
function evaluate6108() {
    return float8Sqrt(float8Input("5d22bfce8cb00000"));
}
function evaluate6109() {
    return float8Cbrt(float8Input("dd22bfce8cb00000"));
}
function evaluate6110() {
    return float8Sqrt(float8Input("dd22bfce8cb00000"));
}
function evaluate6111() {
    return float8Cbrt(float8Input("5e9f8daa7ae00000"));
}
function evaluate6112() {
    return float8Sqrt(float8Input("5e9f8daa7ae00000"));
}
function evaluate6113() {
    return float8Cbrt(float8Input("de9f8daa7ae00000"));
}
function evaluate6114() {
    return float8Sqrt(float8Input("de9f8daa7ae00000"));
}
function evaluate6115() {
    return float8Cbrt(float8Input("6005e56cb3500000"));
}
function evaluate6116() {
    return float8Sqrt(float8Input("6005e56cb3500000"));
}
function evaluate6117() {
    return float8Cbrt(float8Input("e005e56cb3500000"));
}
function evaluate6118() {
    return float8Sqrt(float8Input("e005e56cb3500000"));
}
function evaluate6119() {
    return float8Cbrt(float8Input("61773fb631000000"));
}
function evaluate6120() {
    return float8Sqrt(float8Input("61773fb631000000"));
}
function evaluate6121() {
    return float8Cbrt(float8Input("e1773fb631000000"));
}
function evaluate6122() {
    return float8Sqrt(float8Input("e1773fb631000000"));
}
function evaluate6123() {
    return float8Cbrt(float8Input("62ef63b5b2f00000"));
}
function evaluate6124() {
    return float8Sqrt(float8Input("62ef63b5b2f00000"));
}
function evaluate6125() {
    return float8Cbrt(float8Input("e2ef63b5b2f00000"));
}
function evaluate6126() {
    return float8Sqrt(float8Input("e2ef63b5b2f00000"));
}
function evaluate6127() {
    return float8Cbrt(float8Input("6454b5e4ec200000"));
}
function evaluate6128() {
    return float8Sqrt(float8Input("6454b5e4ec200000"));
}
function evaluate6129() {
    return float8Cbrt(float8Input("e454b5e4ec200000"));
}
function evaluate6130() {
    return float8Sqrt(float8Input("e454b5e4ec200000"));
}
function evaluate6131() {
    return float8Cbrt(float8Input("65c548c3f3900000"));
}
function evaluate6132() {
    return float8Sqrt(float8Input("65c548c3f3900000"));
}
function evaluate6133() {
    return float8Cbrt(float8Input("e5c548c3f3900000"));
}
function evaluate6134() {
    return float8Sqrt(float8Input("e5c548c3f3900000"));
}
function evaluate6135() {
    return float8Cbrt(float8Input("673954fdf4400000"));
}
function evaluate6136() {
    return float8Sqrt(float8Input("673954fdf4400000"));
}
function evaluate6137() {
    return float8Cbrt(float8Input("e73954fdf4400000"));
}
function evaluate6138() {
    return float8Sqrt(float8Input("e73954fdf4400000"));
}
function evaluate6139() {
    return float8Cbrt(float8Input("68a721661d300000"));
}
function evaluate6140() {
    return float8Sqrt(float8Input("68a721661d300000"));
}
function evaluate6141() {
    return float8Cbrt(float8Input("e8a721661d300000"));
}
function evaluate6142() {
    return float8Sqrt(float8Input("e8a721661d300000"));
}
function evaluate6143() {
    return float8Cbrt(float8Input("6a18026fd1600000"));
}
function evaluate6144() {
    return float8Sqrt(float8Input("6a18026fd1600000"));
}
function evaluate6145() {
    return float8Cbrt(float8Input("ea18026fd1600000"));
}
function evaluate6146() {
    return float8Sqrt(float8Input("ea18026fd1600000"));
}
function evaluate6147() {
    return float8Cbrt(float8Input("6b8fe66917d00000"));
}
function evaluate6148() {
    return float8Sqrt(float8Input("6b8fe66917d00000"));
}
function evaluate6149() {
    return float8Cbrt(float8Input("eb8fe66917d00000"));
}
function evaluate6150() {
    return float8Sqrt(float8Input("eb8fe66917d00000"));
}
function evaluate6151() {
    return float8Cbrt(float8Input("6cf3ad124b800000"));
}
function evaluate6152() {
    return float8Sqrt(float8Input("6cf3ad124b800000"));
}
function evaluate6153() {
    return float8Cbrt(float8Input("ecf3ad124b800000"));
}
function evaluate6154() {
    return float8Sqrt(float8Input("ecf3ad124b800000"));
}
function evaluate6155() {
    return float8Cbrt(float8Input("6e623a720b700000"));
}
function evaluate6156() {
    return float8Sqrt(float8Input("6e623a720b700000"));
}
function evaluate6157() {
    return float8Cbrt(float8Input("ee623a720b700000"));
}
function evaluate6158() {
    return float8Sqrt(float8Input("ee623a720b700000"));
}
function evaluate6159() {
    return float8Cbrt(float8Input("6fdd4d386aa00000"));
}
function evaluate6160() {
    return float8Sqrt(float8Input("6fdd4d386aa00000"));
}
function evaluate6161() {
    return float8Cbrt(float8Input("efdd4d386aa00000"));
}
function evaluate6162() {
    return float8Sqrt(float8Input("efdd4d386aa00000"));
}
function evaluate6163() {
    return float8Cbrt(float8Input("714796e860100000"));
}
function evaluate6164() {
    return float8Sqrt(float8Input("714796e860100000"));
}
function evaluate6165() {
    return float8Cbrt(float8Input("f14796e860100000"));
}
function evaluate6166() {
    return float8Sqrt(float8Input("f14796e860100000"));
}
function evaluate6167() {
    return float8Cbrt(float8Input("72b8689276c00000"));
}
function evaluate6168() {
    return float8Sqrt(float8Input("72b8689276c00000"));
}
function evaluate6169() {
    return float8Cbrt(float8Input("f2b8689276c00000"));
}
function evaluate6170() {
    return float8Sqrt(float8Input("f2b8689276c00000"));
}
function evaluate6171() {
    return float8Cbrt(float8Input("74290a6fbdb00000"));
}
function evaluate6172() {
    return float8Sqrt(float8Input("74290a6fbdb00000"));
}
function evaluate6173() {
    return float8Cbrt(float8Input("f4290a6fbdb00000"));
}
function evaluate6174() {
    return float8Sqrt(float8Input("f4290a6fbdb00000"));
}
function evaluate6175() {
    return float8Cbrt(float8Input("759b5a5ff7e00000"));
}
function evaluate6176() {
    return float8Sqrt(float8Input("759b5a5ff7e00000"));
}
function evaluate6177() {
    return float8Cbrt(float8Input("f59b5a5ff7e00000"));
}
function evaluate6178() {
    return float8Sqrt(float8Input("f59b5a5ff7e00000"));
}
function evaluate6179() {
    return float8Cbrt(float8Input("7708cf720c500000"));
}
function evaluate6180() {
    return float8Sqrt(float8Input("7708cf720c500000"));
}
function evaluate6181() {
    return float8Cbrt(float8Input("f708cf720c500000"));
}
function evaluate6182() {
    return float8Sqrt(float8Input("f708cf720c500000"));
}
function evaluate6183() {
    return float8Cbrt(float8Input("7870f471b6000000"));
}
function evaluate6184() {
    return float8Sqrt(float8Input("7870f471b6000000"));
}
function evaluate6185() {
    return float8Cbrt(float8Input("f870f471b6000000"));
}
function evaluate6186() {
    return float8Sqrt(float8Input("f870f471b6000000"));
}
function evaluate6187() {
    return float8Cbrt(float8Input("79e0453973f00000"));
}
function evaluate6188() {
    return float8Sqrt(float8Input("79e0453973f00000"));
}
function evaluate6189() {
    return float8Cbrt(float8Input("f9e0453973f00000"));
}
function evaluate6190() {
    return float8Sqrt(float8Input("f9e0453973f00000"));
}
function evaluate6191() {
    return float8Cbrt(float8Input("7b58817bb9200000"));
}
function evaluate6192() {
    return float8Sqrt(float8Input("7b58817bb9200000"));
}
function evaluate6193() {
    return float8Cbrt(float8Input("fb58817bb9200000"));
}
function evaluate6194() {
    return float8Sqrt(float8Input("fb58817bb9200000"));
}
function evaluate6195() {
    return float8Cbrt(float8Input("7cceba1a5c900000"));
}
function evaluate6196() {
    return float8Sqrt(float8Input("7cceba1a5c900000"));
}
function evaluate6197() {
    return float8Cbrt(float8Input("fcceba1a5c900000"));
}
function evaluate6198() {
    return float8Sqrt(float8Input("fcceba1a5c900000"));
}
function evaluate6199() {
    return float8Cbrt(float8Input("7e3cc53749400000"));
}
function evaluate6200() {
    return float8Sqrt(float8Input("7e3cc53749400000"));
}
function evaluate6201() {
    return float8Cbrt(float8Input("fe3cc53749400000"));
}
function evaluate6202() {
    return float8Sqrt(float8Input("fe3cc53749400000"));
}
function evaluate6203() {
    return float8Cbrt(float8Input("7fa3f92d6e300000"));
}
function evaluate6204() {
    return float8Sqrt(float8Input("7fa3f92d6e300000"));
}
function evaluate6205() {
    return float8Cbrt(float8Input("ffa3f92d6e300000"));
}
function evaluate6206() {
    return float8Sqrt(float8Input("ffa3f92d6e300000"));
}
function evaluate6207() {
    return float8Cbrt(float8Input("00000000000fa56a"));
}
function evaluate6208() {
    return float8Sqrt(float8Input("00000000000fa56a"));
}
function evaluate6209() {
    return float8Cbrt(float8Input("80000000000fa56a"));
}
function evaluate6210() {
    return float8Sqrt(float8Input("80000000000fa56a"));
}
function evaluate6211() {
    return float8Cbrt(float8Input("000005ac86643400"));
}
function evaluate6212() {
    return float8Sqrt(float8Input("000005ac86643400"));
}
function evaluate6213() {
    return float8Cbrt(float8Input("800005ac86643400"));
}
function evaluate6214() {
    return float8Sqrt(float8Input("800005ac86643400"));
}
function evaluate6215() {
    return float8Cbrt(float8Input("00e0263e70800000"));
}
function evaluate6216() {
    return float8Sqrt(float8Input("00e0263e70800000"));
}
function evaluate6217() {
    return float8Cbrt(float8Input("80e0263e70800000"));
}
function evaluate6218() {
    return float8Sqrt(float8Input("80e0263e70800000"));
}
function evaluate6219() {
    return float8Cbrt(float8Input("025b956dec700000"));
}
function evaluate6220() {
    return float8Sqrt(float8Input("025b956dec700000"));
}
function evaluate6221() {
    return float8Cbrt(float8Input("825b956dec700000"));
}
function evaluate6222() {
    return float8Sqrt(float8Input("825b956dec700000"));
}
function evaluate6223() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6224() {
    return float8Ceil(float8FromFloat4(float4Input("40200000")));
}
function evaluate6225() {
    return float8Ceil(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6226() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6227() {
    return float8Ceil(float8FromFloat4(float4Input("40200000")));
}
function evaluate6228() {
    return float8Ceil(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6229() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6230() {
    return float8Floor(float8FromFloat4(float4Input("40200000")));
}
function evaluate6231() {
    return float8Floor(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6232() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6233() {
    return float8Round(float8FromFloat4(float4Input("40200000")));
}
function evaluate6234() {
    return float8Round(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6235() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6236() {
    return float8Trunc(float8FromFloat4(float4Input("40200000")));
}
function evaluate6237() {
    return float8Trunc(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6238() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6239() {
    return float8Sign(float8FromFloat4(float4Input("40200000")));
}
function evaluate6240() {
    return float8Sign(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6241() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6242() {
    return float8Sqrt(float8FromFloat4(float4Input("40200000")));
}
function evaluate6243() {
    return float8Sqrt(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6244() {
    return float8FromFloat4(float4Input("40200000"));
}
function evaluate6245() {
    return float8Cbrt(float8FromFloat4(float4Input("40200000")));
}
function evaluate6246() {
    return float8Cbrt(float8FromInteger(int8Div(int8Input("1"), int8Input("0"))));
}
function evaluate6247() {
    return float8Sqrt(float8Input("bff0000000000000"));
}
function evaluate6248() {
    return float8Round(float8Sqrt(float8Input("bff0000000000000")));
}
function evaluate6249() {
    return floatEq(float8Sqrt(float8Input("bff0000000000000")), float8Input(null));
}
function evaluate6250() {
    return int2Shl(int2Input("1"), int4Input("15"));
}
function evaluate6251() {
    return int8Cast(int2Shl(int2Input("1"), int4Input("15")));
}
function evaluate6252() {
    return int8And(int8Div(int8Input("1"), int8Input("0")), int8Input(null));
}
