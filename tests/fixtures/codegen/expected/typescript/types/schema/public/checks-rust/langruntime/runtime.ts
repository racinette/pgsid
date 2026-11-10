export const MAX_SHARED_INDEX = 2147483647;
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
export function checkedBool(value: boolean): boolean {
    if (typeof value !== 'boolean')
        throw new TypeError('expected a boolean');
    return value;
}
