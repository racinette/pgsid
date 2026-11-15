// Cases whose CHECK the evaluator leaves undecided, with why: `unbound` when the catalog binder
// does not lower it, otherwise the evaluator's reason. A function the database defines is its
// own state.
export const undecidedOperationChecks: Readonly<Record<string, string>> = {
  'array assign 0': 'unbound',
  'array assign 1': 'unbound',
  'array assign 2': 'unbound',
  'array assign 3': 'unbound',
  'array assign 4': 'unbound',
  'array assign multidimensional': 'unbound',
}

// Cases whose CHECK waits on a deployment fact no project declares, so the evaluator answers
// Unknown where PostgreSQL decided: a word running into a date separator is a time zone name.
export const deploymentOperationChecks: Readonly<Record<string, string>> = {
  'time invalid 2': 'time zone data',
  'timetz invalid 0': 'time zone data',
}
