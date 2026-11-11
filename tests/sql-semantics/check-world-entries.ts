// A world case whose stored value has no exact public value (an array with other lower bounds or
// more dimensions than declared, a value the server prints but cannot read back) still runs its
// checks: the public CHECK API reads every other input, and each constraint's evaluator entry takes
// the evaluator's own value for the inputs that have no public value. The runner compiles a copy
// of the generated checks whose entry calls pass through a substitution hook; the copy is otherwise
// the generated source, and the public path keeps running the unmodified module.

const evaluation =
  /checkEvaluation\(("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*"), \(\) => checkRustOutcome\(_checkRust\.(\w+)\(/gu

const hook = `
let checkWorldSubstitute: ((owner: string, constraint: string, args: unknown[]) => unknown[]) | undefined
export function setCheckWorldSubstitute(substitute: typeof checkWorldSubstitute): void {
  checkWorldSubstitute = substitute
}
function checkWorldEntry<A extends unknown[], R>(owner: string, constraint: string, entry: (...args: A) => R): (...args: A) => R {
  return (...args: A) => entry(...((checkWorldSubstitute ? checkWorldSubstitute(owner, constraint, args) : args) as A))
}
`

export function substitutableChecks(source: string): string {
  const calls = source.match(/checkEvaluation\("/gu)?.length ?? 0
  let rewritten = 0
  const result = source.replace(evaluation, (_match, owner: string, constraint: string, entry) => {
    rewritten++
    return `checkEvaluation(${owner}, ${constraint}, () => checkRustOutcome(checkWorldEntry(${owner}, ${constraint}, _checkRust.${entry})(`
  })
  if (rewritten !== calls)
    throw new Error(`only ${rewritten} of ${calls} CHECK evaluations call an evaluator entry`)
  return result + hook
}

export type EntryInput = { column: string; nullness: boolean }

// The columns each constraint's entry reads, in argument order, and whether it reads only their
// nullness, keyed by owner and constraint.
export function checkEntryInputs(source: string): Map<string, EntryInput[]> {
  const inputs = new Map<string, EntryInput[]>()
  for (const [, owner, constraint, args] of source.matchAll(
    /checkEvaluation\(("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*"), \(\) => checkRustOutcome\(_checkRust\.\w+\((.*?)\)\), "/gu,
  )) {
    const key = `${JSON.parse(owner!) as string}\0${JSON.parse(constraint!) as string}`
    const reads = [
      ...args!.matchAll(
        /checkRustNullness(?:Of)?\(row, "([^"]+)"(?:, \(\) => [^()]*\([^()]*\))?\)|checkRust(?!Read\()\w+\(row, "([^"]+)"|Reflect\.get\(row, "([^"]+)"\)/gu,
      ),
    ].map((match) => ({
      nullness: match[1] !== undefined,
      column: (match[1] ?? match[2] ?? match[3])!,
    }))
    // A domain's check can be evaluated for several domains built on it, with the same inputs.
    const known = inputs.get(key)
    if (known && JSON.stringify(known) !== JSON.stringify(reads))
      throw new Error(`${key.replace('\0', '.')} reads different inputs in different entries`)
    inputs.set(key, reads)
  }
  return inputs
}

// A NULL test's entry takes a boolean, derived from the evaluator's value as the generated adapter
// derives it: NULL is null, a failed read fails the test and an undecided read leaves it open.
export function entryNullness(runtime: Record<string, unknown>): (value: unknown) => unknown {
  const makeBool = runtime['makeBoolValue'] as (value: boolean) => unknown
  const boolUnknown = runtime['boolUnknown'] as () => unknown
  return (value) => {
    const kind = (value as { kind: string }).kind
    if (kind === 'Null') return makeBool(true)
    if (kind === 'Error') return value
    return kind === 'Unknown' || kind === 'Unimplemented' ? boolUnknown() : makeBool(false)
  }
}

// The columns, as owner and column name, whose generated public converter leaves every non-NULL
// value undecided: the public CHECK API cannot read them, while the entries can.
export function undecidedPublicColumns(source: string): Set<string> {
  const columns = new Set<string>()
  for (const [, owner, args] of source.matchAll(
    /checkEvaluation\(("(?:[^"\\]|\\.)*"), "(?:[^"\\]|\\.)*", \(\) => checkRustOutcome\(_checkRust\.\w+\((.*?)\)\), "/gu,
  ))
    for (const [, column] of args!.matchAll(
      /checkRust\w+Column\(row, "([^"]+)", checkRustUndecided\w*\)/gu,
    ))
      columns.add(`${JSON.parse(owner!) as string}\0${column}`)
  return columns
}
