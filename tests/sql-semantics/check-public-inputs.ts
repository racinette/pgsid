import { expect } from 'vitest'

// A public input that breaks its type either rejects as malformed or leaves the checks that read
// it undecided; it never decides one. Structural faults reject, and payloads that pass the
// structural check but break a deeper invariant of the type are deferred by the evaluator. With
// no names given, every check must stay undecided. Returns whether the input was rejected.
export function expectUndecidedOrRejected(
  run: () => unknown,
  label?: string,
  reading?: readonly string[],
): boolean {
  let value: unknown
  try {
    value = run()
  } catch (error) {
    if (error instanceof TypeError) return true
    throw error
  }
  const named: [string, unknown][] = Array.isArray(value)
    ? value.map((item) => [
        (item as { constraint: string }).constraint,
        (item as { result: unknown }).result,
      ])
    : value !== null && typeof value === 'object' && 'certain' in value
      ? [['', value]]
      : Object.entries(value as object)
  for (const [name, result] of named)
    if (!reading || reading.includes(name)) expect(result, label).toMatchObject({ certain: false })
  return false
}
