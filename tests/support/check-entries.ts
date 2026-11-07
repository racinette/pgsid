// The generated CHECK API takes public values only. States a public value cannot express (Unknown
// or failed operands, stored values whose exact bits the wire cannot carry) are exercised by
// calling each constraint's evaluator entry in the generated runtime with internal values. The
// generated checks.ts names every entry and the column each of its inputs reads, in order.
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
  const entries = [
    ...checksSource.matchAll(
      /checkEvaluation\("([^"]+)", "([^"]+)", \(\) => checkRustOutcome\(_checkRust\.(\w+)\((.*?)\)\), "/gu,
    ),
  ].map(([, owner, constraint, entry, inputs]) => ({
    owner: owner!,
    constraint: constraint!,
    entry: runtime[entry!] as (...inputs: unknown[]) => unknown,
    columns: [...inputs!.matchAll(/checkRust\w+\(row, "([^"]+)"/gu)].map((match) => match[1]!),
  }))
  const evaluate = (owner: string, row: Record<string, unknown>) => {
    const selected = entries.filter((entry) => entry.owner === owner)
    if (!selected.length) throw new Error(`no CHECK entries for ${owner}`)
    return Object.fromEntries(
      selected.map(({ constraint, entry, columns }) => {
        for (const column of columns)
          if (!(column in row)) throw new Error(`${owner}.${constraint} reads ${column}`)
        return [constraint, entry(...columns.map((column) => row[column]))]
      }),
    )
  }
  return Object.assign(evaluate, {
    reads: (owner: string, constraint: string) => {
      const entry = entries.find((item) => item.owner === owner && item.constraint === constraint)
      if (!entry) throw new Error(`no CHECK entry ${owner}.${constraint}`)
      return entry.columns
    },
  })
}
