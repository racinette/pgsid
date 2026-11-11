import ts from 'typescript'

// A world case whose stored value has no exact public value (an array with other lower bounds or
// more dimensions than declared, a value the server prints but cannot read back) still runs its
// checks: the public CHECK API reads every other input, and each constraint's evaluator entry takes
// the evaluator's own value for the inputs that have no public value. The runner compiles a copy
// of the generated checks whose entry calls pass through a substitution hook; the copy is otherwise
// the generated source, and the public path keeps running the unmodified module.

const hook = `
let checkWorldSubstitute: ((owner: string, constraint: string, args: unknown[]) => unknown[]) | undefined
export function setCheckWorldSubstitute(substitute: typeof checkWorldSubstitute): void {
  checkWorldSubstitute = substitute
}
function checkWorldEntry<A extends unknown[], R>(owner: string, constraint: string, entry: (...args: A) => R): (...args: A) => R {
  return (...args: A) => entry(...((checkWorldSubstitute ? checkWorldSubstitute(owner, constraint, args) : args) as A))
}
`

type EvaluationCall = {
  owner: string
  constraint: string
  // The entry function, `_checkRust.<entry>`, as a span of the source.
  entry: { start: number; end: number; text: string }
  // The text of each argument the entry is called with.
  args: string[]
}

// Each constraint evaluation in the generated checks, in either form: a plain check,
// checkEvaluation(owner, constraint, () => checkRustOutcome(_checkRust.<entry>(...)), message),
// or a diagnostic one, checkRustEvaluation(owner, constraint, () => _checkRust.<entry>(...),
// message).
function evaluationCalls(source: string): { calls: EvaluationCall[]; count: number } {
  const file = ts.createSourceFile('checks.ts', source, ts.ScriptTarget.ES2022, true)
  const calls: EvaluationCall[] = []
  let count = 0
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['checkEvaluation', 'checkRustEvaluation'].includes(node.expression.text) &&
      // The helpers' own calls pass names through; a constraint's evaluation names its owner.
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      count++
      const [owner, constraint, run] = node.arguments
      let body = run && ts.isArrowFunction(run) ? run.body : undefined
      if (
        body &&
        ts.isCallExpression(body) &&
        ts.isIdentifier(body.expression) &&
        body.expression.text === 'checkRustOutcome'
      )
        body = body.arguments[0]
      if (
        owner &&
        constraint &&
        ts.isStringLiteral(owner) &&
        ts.isStringLiteral(constraint) &&
        body &&
        ts.isCallExpression(body) &&
        ts.isPropertyAccessExpression(body.expression) &&
        ts.isIdentifier(body.expression.expression) &&
        body.expression.expression.text === '_checkRust'
      )
        calls.push({
          owner: owner.text,
          constraint: constraint.text,
          entry: {
            start: body.expression.getStart(file),
            end: body.expression.getEnd(),
            text: body.expression.getText(file),
          },
          args: body.arguments.map((arg) => arg.getText(file)),
        })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return { calls, count }
}

export function substitutableChecks(source: string): string {
  const { calls, count } = evaluationCalls(source)
  if (calls.length !== count)
    throw new Error(`only ${calls.length} of ${count} CHECK evaluations call an evaluator entry`)
  let result = source
  for (const call of [...calls].sort((left, right) => right.entry.start - left.entry.start))
    result =
      result.slice(0, call.entry.start) +
      `checkWorldEntry(${JSON.stringify(call.owner)}, ${JSON.stringify(call.constraint)}, ${call.entry.text})` +
      result.slice(call.entry.end)
  return result + hook
}

export type EntryInput = { column: string; nullness: boolean }

// The columns each constraint's entry reads, in argument order, and whether it reads only their
// nullness, keyed by owner and constraint.
export function checkEntryInputs(source: string): Map<string, EntryInput[]> {
  const inputs = new Map<string, EntryInput[]>()
  for (const call of evaluationCalls(source).calls) {
    const key = `${call.owner}\0${call.constraint}`
    const reads = call.args.map((arg) => {
      const match =
        /checkRustNullness(?:Of)?\(row, "([^"]+)"|checkRust(?!Read\()\w+\(row, "([^"]+)"|Reflect\.get\(row, "([^"]+)"\)/u.exec(
          arg,
        )
      if (!match) throw new Error(`${key.replace('\0', '.')} reads an input of no column: ${arg}`)
      return { nullness: match[1] !== undefined, column: (match[1] ?? match[2] ?? match[3])! }
    })
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
  for (const call of evaluationCalls(source).calls)
    for (const arg of call.args)
      for (const [, column] of arg.matchAll(
        /checkRust\w+Column\(row, "([^"]+)", checkRustUndecided\w*\)/gu,
      ))
        columns.add(`${call.owner}\0${column}`)
  return columns
}
