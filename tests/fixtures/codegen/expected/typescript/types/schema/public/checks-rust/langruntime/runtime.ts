
const MAX_SHARED_INDEX = 2147483647;
export function checkedIndex(value: number): number {
    if (!Number.isInteger(value) || value < 0 || value > MAX_SHARED_INDEX)
        throw new RangeError('index outside shared numeric range');
    return value;
}
export function checkedI32(value: number): number {
    if (!Number.isInteger(value) || value < -2147483648 || value > MAX_SHARED_INDEX)
        throw new RangeError('signed integer outside shared numeric range');
    return value;
}
export function checkedI64(value: bigint): bigint {
    if (typeof value !== 'bigint')
        throw new TypeError('expected a bigint');
    if (value < -9223372036854775808n || value > 9223372036854775807n)
        throw new RangeError('integer outside i64 range');
    return value;
}
export function checkedI64Add(left: bigint, right: bigint): bigint {
    return checkedI64(checkedI64(left) + checkedI64(right));
}
export function checkedI64Subtract(left: bigint, right: bigint): bigint {
    return checkedI64(checkedI64(left) - checkedI64(right));
}
export function checkedI64Multiply(left: bigint, right: bigint): bigint {
    return checkedI64(checkedI64(left) * checkedI64(right));
}
export function checkedI64Divide(left: bigint, right: bigint): bigint {
    checkedI64(left);
    checkedI64(right);
    if (right === 0n)
        throw new RangeError('integer division by zero');
    return checkedI64(left / right);
}
export function checkedI64Remainder(left: bigint, right: bigint): bigint {
    checkedI64(left);
    checkedI64(right);
    if (right === 0n)
        throw new RangeError('integer remainder by zero');
    if (left === -9223372036854775808n && right === -1n)
        throw new RangeError('i64 overflow');
    return left % right;
}
export function checkedBool(value: boolean): boolean {
    if (typeof value !== 'boolean')
        throw new TypeError('expected a boolean');
    return value;
}
export function checkedAdd(left: number, right: number): number {
    checkedIndex(left);
    checkedIndex(right);
    if (right > MAX_SHARED_INDEX - left)
        throw new RangeError('shared numeric overflow');
    return left + right;
}
export function checkedSubtract(left: number, right: number): number {
    checkedIndex(left);
    checkedIndex(right);
    if (right > left)
        throw new RangeError('shared numeric underflow');
    return left - right;
}
export function checkedSignedNegate(value: number): number {
    checkedI32(value);
    if (value === -2147483648)
        throw new RangeError('signed integer overflow');
    return -value;
}
export function checkedSignedAdd(left: number, right: number): number {
    checkedI32(left);
    checkedI32(right);
    const result = left + right;
    if (result < -2147483648 || result > MAX_SHARED_INDEX)
        throw new RangeError('signed integer overflow');
    return result;
}
export function checkedSignedSubtract(left: number, right: number): number {
    checkedI32(left);
    checkedI32(right);
    const result = left - right;
    if (result < -2147483648 || result > MAX_SHARED_INDEX)
        throw new RangeError('signed integer overflow');
    return result;
}
export function checkedSignedMultiply(left: number, right: number): number {
    checkedI32(left);
    checkedI32(right);
    return checkedI32(left * right) || 0;
}
export function checkedSignedDivide(left: number, right: number): number {
    checkedI32(left);
    checkedI32(right);
    if (right === 0)
        throw new RangeError('integer division by zero');
    return checkedI32(Math.trunc(left / right)) || 0;
}
export function checkedSignedRemainder(left: number, right: number): number {
    checkedI32(left);
    checkedI32(right);
    if (right === 0)
        throw new RangeError('integer remainder by zero');
    if (left === -2147483648 && right === -1)
        throw new RangeError('signed integer overflow');
    return left % right || 0;
}
export function checkedChar(value: string): string {
    const points = Array.from(value);
    if (points.length !== 1 || (value.codePointAt(0)! >= 0xd800 && value.codePointAt(0)! <= 0xdfff))
        throw new RangeError('invalid Unicode scalar');
    return value;
}
export function characterFromI32(value: number, fallback: string): string {
    checkedI32(value);
    checkedChar(fallback);
    return value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)
        ? fallback
        : String.fromCodePoint(value);
}
export function asciiLowercase(value: string): string {
    const codepoint = checkedChar(value).codePointAt(0)!;
    return codepoint >= 65 && codepoint <= 90 ? String.fromCodePoint(codepoint + 32) : value;
}
export function checkedString(value: string): string {
    if (value.length > MAX_SHARED_INDEX)
        throw new RangeError('string outside shared numeric range');
    for (const character of value)
        checkedChar(character);
    return value;
}
export function checkedChars(value: string[]): string[] {
    if (value.length > MAX_SHARED_INDEX)
        throw new RangeError('vector outside shared numeric range');
    return Array.from(value, checkedChar);
}
function checkedIndices(value: number[]): number[] {
    if (value.length > MAX_SHARED_INDEX)
        throw new RangeError('vector outside shared numeric range');
    return Array.from(value, checkedIndex);
}
export function checkedStructs<T>(value: T[], copyValue: (entry: T) => T): T[] {
    checkedIndex(value.length);
    return Array.from(value, copyValue);
}
export function checkedIndexIn<T>(values: T[], index: number): number {
    checkedIndex(index);
    if (index >= values.length)
        throw new RangeError('index out of bounds');
    return index;
}
function indexNumber(values: number[], index: number): number {
    return checkedIndex(values[checkedIndexIn(values, index)]!);
}
function pushIndex(values: number[], value: number): void {
    checkedAdd(values.length, 1);
    values.push(checkedIndex(value));
}
export function pushChar(values: string[], value: string): void {
    checkedAdd(values.length, 1);
    values.push(checkedChar(value));
}
export function indexChar(values: string[], index: number): string {
    if (!Number.isSafeInteger(index) || index < 0 || index >= values.length)
        throw new RangeError('index out of bounds');
    return values[index]!;
}
export function indexStruct<T>(values: T[], index: number, copyValue: (entry: T) => T): T {
    return copyValue(values[checkedIndexIn(values, index)]!);
}
export function pushStruct<T>(values: T[], value: T, copyValue: (entry: T) => T): void {
    checkedAdd(values.length, 1);
    values.push(copyValue(value));
}
const opaqueValues = new WeakSet<object>();
function freezeDeep(value: object): void {
    for (const child of Object.values(value)) {
        if (typeof child === 'object' && child !== null)
            freezeDeep(child);
    }
    Object.freeze(value);
}
function sealOpaque<T extends object>(value: T): T {
    freezeDeep(value);
    opaqueValues.add(value);
    return value;
}
function checkedOpaque<T extends object>(value: T): T {
    if (typeof value !== 'object' || value === null || !opaqueValues.has(value))
        throw new TypeError('invalid borrowed handle');
    return value;
}
export function indexStatic<T>(values: Readonly<ArrayLike<T>>, index: number): T {
    checkedIndex(index);
    if (index >= values.length)
        throw new RangeError('static table index out of bounds');
    return values[index]!;
}
export function checkedF64(value: number): number {
    if (typeof value !== 'number')
        throw new TypeError('expected an f64');
    return value;
}
function f64Negate(value: number): number {
    return -checkedF64(value);
}
export function f64Add(left: number, right: number): number {
    return checkedF64(left) + checkedF64(right);
}
function f64Subtract(left: number, right: number): number {
    return checkedF64(left) - checkedF64(right);
}
export function f64Multiply(left: number, right: number): number {
    return checkedF64(left) * checkedF64(right);
}
export function f64Divide(left: number, right: number): number {
    return checkedF64(left) / checkedF64(right);
}
export function f64Abs(value: number): number {
    return Math.abs(checkedF64(value));
}
export function f64Ln(value: number): number {
    return Math.log(checkedF64(value));
}
export function f64Log10(value: number): number {
    return Math.log10(checkedF64(value));
}
export function f64ToI32(value: number): number {
    checkedF64(value);
    if (Number.isNaN(value))
        return 0;
    if (value >= 2147483647)
        return 2147483647;
    if (value <= -2147483648)
        return -2147483648;
    return Math.trunc(value) || 0;
}
export function f64FromText(value: string, fallback: number): number {
    checkedString(value);
    checkedF64(fallback);
    if (/^[+-]?nan$/iu.test(value))
        return NaN;
    if (/^[+-]?inf(?:inity)?$/iu.test(value))
        return value.startsWith('-') ? -Infinity : Infinity;
    if (!/^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/u.test(value))
        return fallback;
    return Number(value);
}
