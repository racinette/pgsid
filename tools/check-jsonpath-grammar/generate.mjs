import { readFileSync, writeFileSync } from 'node:fs'

const grammar = new URL('../../crates/check-evaluator/src/jsonpath_grammar.rs', import.meta.url)
const output = new URL(
  '../../crates/check-evaluator/src/operations/pg_catalog/jsonpath_tables.generated.rs',
  import.meta.url,
)
const source = readFileSync(grammar, 'utf8')
function strings(name) {
  const block = new RegExp(`const ${name}: &\\[&str\\] = &\\[(.*?)\\];`, 's').exec(source)
  if (!block) throw new Error(`Missing grammar array: ${name}`)
  return [...block[1].matchAll(/"(?:[^"\\]|\\.)*"/g)].map(([value]) => JSON.parse(value))
}
const tokenEntries = strings('JSONPATH_GRAMMAR_TOKENS')
const terminals = new Map(
  tokenEntries.map((entry) => {
    const [name, value] = entry.split('=')
    return [name, Number(value)]
  }),
)
if (terminals.size !== tokenEntries.length) throw new Error('Duplicate token name')
if (new Set(terminals.values()).size !== terminals.size) throw new Error('Duplicate token identity')
const terminalNames = [...terminals.keys()]
const terminalIndices = new Map(terminalNames.map((name, index) => [name, index]))
const precedence = new Map()
strings('JSONPATH_GRAMMAR_PRECEDENCE').forEach((entry, index) => {
  const [association, ...names] = entry.split(' ')
  for (const name of names) precedence.set(name, { level: index + 1, association })
})
const rules = [{ lhs: 'start', rhs: ['result'], action: 'accept' }]
const actions = []
for (const entry of strings('JSONPATH_GRAMMAR_RULES')) {
  const [production, suffix] = entry.split(' => ')
  const [action, explicit] = suffix.split(' % ')
  const [lhs, right] = production.split(' : ')
  const rhs = right.trim() ? right.trim().split(' ') : []
  const priority = explicit ?? [...rhs].reverse().find((symbol) => terminals.has(symbol))
  rules.push({ lhs, rhs, action, precedence: precedence.get(priority) })
  if (!actions.includes(action)) actions.push(action)
}
const nonterminals = new Set(rules.map(({ lhs }) => lhs))
const reductions = readFileSync(
  new URL(
    '../../crates/check-evaluator/src/operations/pg_catalog/jsonpath_parse.rs',
    import.meta.url,
  ),
  'utf8',
)
for (const action of actions) {
  if (!reductions.includes(`JSONPATH_REDUCE_${action.toUpperCase()}`))
    throw new Error(`Missing shared Rust reduction action: ${action}`)
}
const byLhs = new Map([...nonterminals].map((name) => [name, []]))
rules.forEach(({ lhs, rhs }, index) => {
  if (rhs.length >= 8) throw new Error('Grammar item encoding needs a wider dot field')
  if (terminals.has(lhs)) throw new Error(`Terminal used as nonterminal: ${lhs}`)
  for (const symbol of rhs) {
    if (!terminals.has(symbol) && !nonterminals.has(symbol))
      throw new Error(`Unknown symbol: ${symbol}`)
  }
  byLhs.get(lhs).push(index)
})
const first = new Map([...terminalIndices].map(([name, index]) => [name, new Set([index])]))
for (const name of nonterminals) first.set(name, new Set())
const nullable = new Set()
let changed = true
while (changed) {
  changed = false
  for (const { lhs, rhs } of rules) {
    const before = first.get(lhs).size
    let allNullable = true
    for (const symbol of rhs) {
      for (const item of first.get(symbol)) first.get(lhs).add(item)
      if (!nullable.has(symbol)) {
        allNullable = false
        break
      }
    }
    if (allNullable && !nullable.has(lhs)) {
      nullable.add(lhs)
      changed = true
    }
    changed ||= first.get(lhs).size !== before
  }
}
const width = terminals.size
const encode = (rule, dot, token) => (rule * 8 + dot) * width + token
const decode = (item) => {
  const core = Math.floor(item / width)
  return { rule: Math.floor(core / 8), dot: core % 8, token: item % width }
}
function closure(input) {
  const result = new Set(input)
  const pending = [...input]
  while (pending.length) {
    const { rule, dot, token } = decode(pending.pop())
    const { rhs } = rules[rule]
    if (dot === rhs.length || !nonterminals.has(rhs[dot])) continue
    const followers = new Set()
    for (const symbol of [...rhs.slice(dot + 1), terminalNames[token]]) {
      for (const item of first.get(symbol)) followers.add(item)
      if (!nullable.has(symbol)) break
    }
    for (const child of byLhs.get(rhs[dot])) {
      for (const follower of followers) {
        const item = encode(child, 0, follower)
        if (!result.has(item)) {
          result.add(item)
          pending.push(item)
        }
      }
    }
  }
  return result
}
const keyOf = (items) => [...items].sort((a, b) => a - b).join(',')
const states = [closure([encode(0, 0, terminalIndices.get('EOF'))])]
const stateIndices = new Map([[keyOf(states[0]), 0]])
const transitions = []
for (let current = 0; current < states.length; current++) {
  const moves = new Map()
  for (const item of states[current]) {
    const { rule, dot, token } = decode(item)
    const { rhs } = rules[rule]
    if (dot === rhs.length) continue
    if (!moves.has(rhs[dot])) moves.set(rhs[dot], new Set())
    moves.get(rhs[dot]).add(encode(rule, dot + 1, token))
  }
  const edges = new Map()
  for (const symbol of [...moves.keys()].sort()) {
    const following = closure(moves.get(symbol))
    const key = keyOf(following)
    if (!stateIndices.has(key)) {
      stateIndices.set(key, states.length)
      states.push(following)
    }
    edges.set(symbol, stateIndices.get(key))
  }
  transitions.push(edges)
}
const cores = new Map()
const merged = []
const mapping = states.map((items) => {
  const core = keyOf(new Set([...items].map((item) => Math.floor(item / width))))
  if (!cores.has(core)) {
    cores.set(core, merged.length)
    merged.push(new Set())
  }
  const index = cores.get(core)
  for (const item of items) merged[index].add(item)
  return index
})
const edges = merged.map(() => new Map())
transitions.forEach((row, state) => {
  for (const [symbol, following] of row) {
    const target = mapping[following]
    const existing = edges[mapping[state]].get(symbol)
    if (existing !== undefined && existing !== target)
      throw new Error('Inconsistent merged transition')
    edges[mapping[state]].set(symbol, target)
  }
})
let conflicts = 0
const rows = merged.map((items, state) => {
  const candidates = new Map()
  const add = (symbol, action) => {
    if (!candidates.has(symbol)) candidates.set(symbol, new Set())
    candidates.get(symbol).add(action)
  }
  for (const item of items) {
    const { rule, dot, token } = decode(item)
    const { rhs } = rules[rule]
    if (dot < rhs.length && terminals.has(rhs[dot])) add(rhs[dot], edges[state].get(rhs[dot]) + 1)
    else if (dot === rhs.length) add(terminalNames[token], rule === 0 ? 2147483647 : -rule)
  }
  const row = new Map()
  for (const [symbol, choices] of candidates) {
    if (choices.size === 1) {
      row.set(symbol, [...choices][0])
      continue
    }
    const shifts = [...choices].filter((value) => value > 0)
    const reductions = [...choices].filter((value) => value < 0)
    if (shifts.length !== 1 || reductions.length !== 1)
      throw new Error(`Unresolved conflict: ${state} ${symbol}`)
    const [shift] = shifts
    const [reduce] = reductions
    const shiftPriority = precedence.get(symbol)
    const reducePriority = rules[-reduce].precedence
    if (!shiftPriority || !reducePriority)
      throw new Error(`Conflict requires precedence: ${state} ${symbol}`)
    let chosen = 0
    if (shiftPriority.level > reducePriority.level) chosen = shift
    else if (shiftPriority.level < reducePriority.level) chosen = reduce
    else if (shiftPriority.association === 'left') chosen = reduce
    else if (shiftPriority.association === 'right') chosen = shift
    row.set(symbol, chosen)
    conflicts++
  }
  return row
})
const nonterminalIds = new Map(
  [...nonterminals]
    .filter((name) => name !== 'start')
    .sort()
    .map((name, index) => [name, index]),
)
const actionOffsets = [0],
  actionTokens = [],
  actionValues = [],
  defaults = []
const gotoOffsets = [0],
  gotoSymbols = [],
  gotoValues = []
rows.forEach((row, state) => {
  const choices = new Set(row.values())
  const [choice] = choices
  defaults.push(choices.size === 1 && choice < 0 ? choice : 0)
  for (const [symbol, value] of [...row].sort(
    (a, b) => terminals.get(a[0]) - terminals.get(b[0]),
  )) {
    actionTokens.push(terminals.get(symbol))
    actionValues.push(value)
  }
  actionOffsets.push(actionTokens.length)
  for (const [symbol, index] of nonterminalIds) {
    if (!edges[state].has(symbol)) continue
    gotoSymbols.push(index)
    gotoValues.push(edges[state].get(symbol))
  }
  gotoOffsets.push(gotoSymbols.length)
})
let generated = '// Generated by tools/check-jsonpath-grammar/generate.mjs.\n'
for (const [name, values, kind] of [
  ['ACTION_OFFSETS', actionOffsets, 'usize'],
  ['ACTION_TOKENS', actionTokens, 'i32'],
  ['ACTION_VALUES', actionValues, 'i32'],
  ['DEFAULTS', defaults, 'i32'],
  ['GOTO_OFFSETS', gotoOffsets, 'usize'],
  ['GOTO_SYMBOLS', gotoSymbols, 'usize'],
  ['GOTO_VALUES', gotoValues, 'usize'],
  ['RULE_LENGTHS', rules.slice(1).map(({ rhs }) => rhs.length), 'usize'],
  ['RULE_SYMBOLS', rules.slice(1).map(({ lhs }) => nonterminalIds.get(lhs)), 'usize'],
  ['RULE_ACTIONS', rules.slice(1).map(({ action }) => actions.indexOf(action)), 'i32'],
]) {
  generated += `const JSONPATH_TABLE_${name}: &[${kind}] = &[\n`
  for (let index = 0; index < values.length; index += 16)
    generated += `    ${values.slice(index, index + 16).join(', ')},\n`
  generated += '];\n'
}
actions.forEach((action, index) => {
  generated += `const JSONPATH_REDUCE_${action.toUpperCase()}: i32 = ${index};\n`
})
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== generated)
    throw new Error(
      'JSONPath parser tables are stale; run tools/check-jsonpath-grammar/generate.mjs',
    )
} else writeFileSync(output, generated)
process.stdout.write(
  JSON.stringify({
    canonicalStates: states.length,
    lalrStates: merged.length,
    rules: rules.length - 1,
    resolvedPrecedenceConflicts: conflicts,
  }) + '\n',
)
