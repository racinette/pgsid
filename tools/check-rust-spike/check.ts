import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const output = process.argv[2]
if (!output) throw new Error('usage: check.ts GENERATED_TS')
const generated = await import(pathToFileURL(output).href)
const state = (kind: string) => (kind === 'Error' ? { kind, value: { state: 3452591 } } : { kind })

const cases = [
  [
    generated.makeInt4Value(-1),
    generated.makeTextValue('abc'),
    generated.makeTextValue('('),
    'False',
  ],
  [
    generated.makeInt4Value(1),
    generated.makeTextValue('abc'),
    generated.makeTextValue('a'),
    'True',
  ],
  [
    generated.makeInt4Value(1),
    generated.makeTextValue('abc'),
    generated.makeTextValue('z'),
    'False',
  ],
  [
    generated.makeInt4Value(1),
    generated.makeTextValue('abc'),
    generated.makeTextValue('('),
    'Error',
  ],
  [generated.int4Unknown(), generated.makeTextValue('abc'), generated.makeTextValue('z'), 'False'],
  [
    generated.int4Unknown(),
    generated.makeTextValue('abc'),
    generated.makeTextValue('a'),
    'Unknown',
  ],
  [generated.int4Null(), generated.makeTextValue('abc'), generated.makeTextValue('a'), 'Null'],
  [generated.makeInt4Value(1), generated.textUnknown(), generated.makeTextValue('a'), 'Unknown'],
  [generated.makeInt4Value(1), generated.textNull(), generated.makeTextValue('a'), 'Null'],
  [generated.makeInt4Value(1), generated.makeTextValue('abc'), generated.textUnknown(), 'Unknown'],
  [
    { kind: 'Error', value: { state: 3452591 } },
    generated.makeTextValue('abc'),
    generated.makeTextValue('a'),
    'Error',
  ],
  [
    generated.makeInt4Value(-1),
    { kind: 'Error', value: { state: 3452591 } },
    generated.makeTextValue('a'),
    'False',
  ],
] as const

for (const [amount, email, pattern, expected] of cases) {
  assert.deepEqual(generated.evaluateCheck(amount, email, pattern), state(expected))
}
assert.deepEqual(generated.textUnknown(), state('Unknown'))
assert.deepEqual(generated.textNull(), state('Null'))

type Row = { amount?: bigint | number | null; email?: string | null; pattern?: string | null }

function wrapInt4(value: bigint | number | null | undefined): unknown {
  if (value === undefined) return generated.int4Unknown()
  if (value === null) return generated.int4Null()
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return generated.int4Unknown()
  const integer = BigInt(value)
  if (integer < -2147483648n || integer > 2147483647n) return generated.int4Unknown()
  return generated.makeInt4Value(Number(integer))
}

function wrapText(value: string | null | undefined): unknown {
  return value === undefined
    ? generated.textUnknown()
    : value === null
      ? generated.textNull()
      : generated.makeTextValue(value)
}

function evaluateRow(row: Row): { owner: string; constraint: string; result: { kind: string } }[] {
  return [
    {
      owner: 'public.sample',
      constraint: 'sample_check',
      result: generated.evaluateCheck(
        wrapInt4(row.amount),
        wrapText(row.email),
        wrapText(row.pattern),
      ),
    },
  ]
}

function validateRow(row: Row): void {
  const result = evaluateRow(row)[0]!.result
  if (result.kind === 'False') throw Object.assign(new Error('CHECK violation'), { code: '23514' })
  if (result.kind === 'Error')
    throw Object.assign(new Error('CHECK evaluation failed'), {
      code: result.value.state.toString(36).toUpperCase().padStart(5, '0'),
    })
}

assert.equal(evaluateRow({}).at(0)?.result.kind, 'Unknown')
assert.equal(evaluateRow({ amount: null, email: 'abc', pattern: 'a' }).at(0)?.result.kind, 'Null')
assert.equal(
  evaluateRow({ amount: 2147483647n, email: 'abc', pattern: 'a' }).at(0)?.result.kind,
  'True',
)
assert.equal(
  evaluateRow({ amount: 2147483648n, email: 'abc', pattern: 'a' }).at(0)?.result.kind,
  'Unknown',
)
assert.throws(() => validateRow({ amount: 1, email: 'abc', pattern: 'z' }), {
  code: '23514',
})
assert.throws(() => validateRow({ amount: 1, email: 'abc', pattern: '(' }), {
  code: '2201B',
})
assert.throws(() => validateRow({ amount: -1, email: 'abc', pattern: '(' }), {
  code: '23514',
})

const pg = await PGlite.create()
try {
  for (const row of [
    { amount: 1, email: 'abc', pattern: 'a' },
    { amount: 1, email: 'abc', pattern: 'z' },
    { amount: null, email: 'abc', pattern: 'a' },
    { amount: -1, email: 'abc', pattern: 'a' },
    { amount: 1, email: null, pattern: 'a' },
  ]) {
    const result = await pg.query<{ value: boolean | null }>(
      'SELECT ($1::int4 > 0 AND $2::text ~ $3::text) AS value',
      [row.amount, row.email, row.pattern],
    )
    const expected =
      result.rows[0]!.value === null ? 'Null' : result.rows[0]!.value ? 'True' : 'False'
    assert.equal(evaluateRow(row).at(0)?.result.kind, expected)
  }
  const skipped = await pg.query<{ value: boolean | null }>(
    'SELECT ($1::int4 > 0 AND $2::text ~ $3::text) AS value',
    [-1, 'abc', '('],
  )
  assert.equal(skipped.rows[0]?.value, false)
  await assert.rejects(
    pg.query('SELECT ($1::int4 > 0 AND $2::text ~ $3::text) AS value', [1, 'abc', '(']),
    { code: '2201B' },
  )
} finally {
  await pg.close()
}
