// The generated CHECK API takes public values only. States a public value cannot express (Unknown
// or failed operands, stored values whose exact bits the wire cannot carry) are exercised by
// calling each constraint's evaluator entry in the generated runtime with internal values. The
// generated checks.ts names every entry and the column each of its inputs reads, in order. A NULL
// test's entry takes a boolean, derived here from the internal value as the generated adapter
// derives it: NULL is null, a failed read fails the test and an undecided read leaves it open.
export type InternalCheckRows = ((
  owner: string,
  row: Record<string, unknown>,
) => Record<string, unknown>) & {
  // The columns a constraint's entry reads, in argument order.
  reads(owner: string, constraint: string): string[]
}

export function internalCheckRows(
  checksSource: string,
  runtime: Record<string, unknown>,
): InternalCheckRows {
  const makeBool = runtime['makeBoolValue'] as (value: boolean) => unknown
  const boolUnknown = runtime['boolUnknown'] as () => unknown
  const nullness = (value: unknown) => {
    const kind = (value as { kind: string }).kind
    if (kind === 'Null') return makeBool(true)
    if (kind === 'Error') return value
    return kind === 'Unknown' || kind === 'Unimplemented' ? boolUnknown() : makeBool(false)
  }
  const entries = [
    ...checksSource.matchAll(
      /checkEvaluation\("([^"]+)", "([^"]+)", \(\) => checkRustOutcome\(_checkRust\.(\w+)\((.*?)\)\), "/gu,
    ),
  ].map(([, owner, constraint, entry, inputs]) => ({
    owner: owner!,
    constraint: constraint!,
    entry: runtime[entry!] as (...inputs: unknown[]) => unknown,
    inputs: [
      ...inputs!.matchAll(
        /checkRustNullness(?:Of)?\(row, "([^"]+)"(?:, \(\) => [^()]*\([^()]*\))?\)|checkRust(?!Read\()\w+\(row, "([^"]+)"|Reflect\.get\(row, "([^"]+)"\)/gu,
      ),
    ].map((match) => ({
      nullness: match[1] !== undefined,
      column: (match[1] ?? match[2] ?? match[3])!,
    })),
  }))
  const evaluate = (owner: string, row: Record<string, unknown>) => {
    const selected = entries.filter((entry) => entry.owner === owner)
    if (!selected.length) throw new Error(`no CHECK entries for ${owner}`)
    return Object.fromEntries(
      selected.map(({ constraint, entry, inputs }) => [
        constraint,
        entry(
          ...inputs.map(({ nullness: reads, column }) => {
            if (!(column in row)) throw new Error(`${owner}.${constraint} reads ${column}`)
            return reads ? nullness(row[column]) : row[column]
          }),
        ),
      ]),
    )
  }
  return Object.assign(evaluate, {
    reads: (owner: string, constraint: string) => {
      const entry = entries.find((item) => item.owner === owner && item.constraint === constraint)
      if (!entry) throw new Error(`no CHECK entry ${owner}.${constraint}`)
      return entry.inputs.map((input) => input.column)
    },
  })
}

// A malformed stored value is no runtime value: building it may fail in the runtime's own
// validation, which is the rejection the caller expects; any other failure is a test fault.
export function storedOrRejected<T>(build: () => T): T | undefined {
  try {
    return build()
  } catch (error) {
    if (
      (error instanceof TypeError || error instanceof RangeError) &&
      !/is not a function|is not defined|before initialization|Cannot read properties of undefined \(reading '[a-z]\w*Value'\)/u.test(
        error.message,
      )
    )
      return undefined
    throw error
  }
}
