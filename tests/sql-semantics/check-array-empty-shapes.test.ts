import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { createKillableEvaluator } from '../unit/query/killable-evaluator.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const empty = "array_cat(''::int2vector,''::int2vector)"
const shapes = [
  'NULL::smallint[]',
  "'{}'::smallint[]",
  empty,
  `ARRAY[${empty}]`,
  `ARRAY[${empty},${empty}]`,
  `ARRAY[ARRAY[${empty},${empty}],ARRAY[${empty},${empty}]]`,
  `ARRAY[ARRAY[ARRAY[ARRAY[${empty}]]]]`,
  `ARRAY[ARRAY[ARRAY[ARRAY[ARRAY[${empty}]]]]]`,
  "'{1,NULL,3}'::smallint[]",
  "'[0:1]={1,2}'::smallint[]",
  "'{{1,2},{3,4}}'::smallint[]",
]
const decode = (hex: string | null): Input => {
  if (hex === null) return known(null)
  const bytes = Buffer.from(hex, 'hex'),
    rank = bytes.readInt32BE(),
    dimensions = Array.from({ length: rank }, (_, i) => ({
      length: bytes.readInt32BE(12 + i * 8),
      lower: bytes.readInt32BE(16 + i * 8),
    })),
    elements: OwnedArrayInputPayload['elements'] = []
  let offset = 12 + rank * 8
  while (offset < bytes.length) {
    const size = bytes.readInt32BE(offset)
    offset += 4
    if (size === -1) elements.push({ kind: 'Null' })
    else {
      expect(size).toBe(2)
      elements.push({ kind: 'Int2', value: bytes.readInt16BE(offset) })
      offset += size
    }
  }
  return known({
    elementType: 'pg_catalog.int2',
    elementKind: 1,
    dimensions,
    elements,
    nullBitmap: { kind: 'Value', value: bytes.readInt32BE(4) !== 0 },
  })
}

it('isolates native zero-width sort failures while retaining terminating shaped-empty controls', async () => {
  for (const i of [4, 5]) {
    const oracle = await createKillableEvaluator({
      timeoutMs: 500,
      schema: `CREATE TABLE native_arrays(value smallint[]); INSERT INTO native_arrays VALUES(${shapes[i]});`,
    })
    try {
      for (const control of [2, 3, 6, 7])
        await expect(
          oracle.evaluate(`SELECT array_dims(array_sort(${shapes[control]})) value`),
        ).resolves.toMatchObject({ value: expect.any(String) })
      const result = await oracle
        .evaluate('SELECT array_dims(array_sort(value)) value FROM native_arrays')
        .catch((error: Error) => {
          expect(error.message).toMatch(/^evaluator terminated after 500ms:/)
          return undefined
        })
      expect(result).toBeUndefined()
      console.info('Native zero-width sort boundary', { shape: i, killed: oracle.kills > 0 })
    } finally {
      await oracle.close()
    }
  }
}, 30_000)

it('preserves native shaped-empty arrays through public carriers, array operations, JSON, coercion and raw/stored INSERT checks', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-array-empty-shapes-'))
  try {
    const trace = (phase: string) => {
      if (process.env['PGSID_TRACE_EMPTY_SHAPES'] === '1') console.info(phase)
    }
    trace('create schema')
    const calls = new Map<
        string,
        { sql: string; kind: 'text' | 'int' | 'bool'; pair?: true; amount?: true }
      >([
        ['count', { sql: 'cardinality(a)', kind: 'int' }],
        ['rank', { sql: 'array_ndims(a)', kind: 'int' }],
        ['length', { sql: 'array_length(a,dimension)', kind: 'int' }],
        ['lower', { sql: 'array_lower(a,dimension)', kind: 'int' }],
        ['upper', { sql: 'array_upper(a,dimension)', kind: 'int' }],
        ['bounds', { sql: 'array_dims(a)', kind: 'text' }],
        ['text', { sql: 'a::text', kind: 'text' }],
        ['json', { sql: 'to_json(a)::text', kind: 'text' }],
        ['pretty_json', { sql: 'array_to_json(a,true)::text', kind: 'text' }],
        ['jsonb', { sql: 'to_jsonb(a)::text', kind: 'text' }],
        ['reverse', { sql: 'array_dims(array_reverse(a))', kind: 'text' }],
        ['reverse_text', { sql: 'array_reverse(a)::text', kind: 'text' }],
        ['sort', { sql: 'array_dims(array_sort(a))', kind: 'text' }],
        ['sort_text', { sql: 'array_sort(a)::text', kind: 'text' }],
        ['trim', { sql: 'array_dims(trim_array(a,amount))', kind: 'text', amount: true }],
        ['trim_text', { sql: 'trim_array(a,amount)::text', kind: 'text', amount: true }],
        ['append', { sql: 'array_dims(array_append(a,3::smallint))', kind: 'text' }],
        ['prepend', { sql: 'array_dims(array_prepend(3::smallint,a))', kind: 'text' }],
        ['cat', { sql: 'array_dims(a||b)', kind: 'text', pair: true }],
        ['cat_text', { sql: '(a||b)::text', kind: 'text', pair: true }],
        ['remove', { sql: 'array_dims(array_remove(a,2::smallint))', kind: 'text' }],
        ['replace', { sql: 'array_dims(array_replace(a,2::smallint,3::smallint))', kind: 'text' }],
        ['position', { sql: 'array_position(a,2::smallint,start_at)', kind: 'int' }],
        ['positions', { sql: 'array_positions(a,2::smallint)::text', kind: 'text' }],
        ['equal', { sql: 'a=b', kind: 'bool', pair: true }],
        ['less', { sql: 'a<b', kind: 'bool', pair: true }],
        ['contains', { sql: 'a @> b', kind: 'bool', pair: true }],
        ['overlap', { sql: 'a && b', kind: 'bool', pair: true }],
        ['hash', { sql: 'hash_array(a)', kind: 'int' }],
        ['any', { sql: '2::smallint=ANY(a)', kind: 'bool' }],
        ['slice', { sql: 'array_dims(a[:])', kind: 'text' }],
        ['slice_text', { sql: 'a[:]::text', kind: 'text' }],
        ['fetched', { sql: 'a[0]', kind: 'int' }],
        ['mapped', { sql: 'array_dims(a::integer[])', kind: 'text' }],
        ['mapped_text', { sql: 'a::integer[]::text', kind: 'text' }],
        ['io_mapped', { sql: 'array_dims(a::text[])', kind: 'text' }],
        ['nested', { sql: 'array_dims(ARRAY[a,a])', kind: 'text' }],
        ['nested_base', { sql: 'array_dims(ARRAY[a::smallint[],a::smallint[]])', kind: 'text' }],
        ['nested_jsonb', { sql: 'to_jsonb(ARRAY[a,a])::text', kind: 'text' }],
        ['record_jsonb', { sql: 'to_jsonb(ROW(a))::text', kind: 'text' }],
      ]),
      expressions = Object.fromEntries(
        [...calls].map(([name, call], index) => [
          name,
          `mode<>${index} OR (${call.sql})=${call.kind === 'text' ? 'expected_text' : call.kind === 'bool' ? 'expected_bool' : 'expected_int'}`,
        ]),
      )
    await pg.exec(`CREATE DOMAIN shaped_samples AS smallint[];CREATE DOMAIN imported_samples AS shaped_samples;
      CREATE TABLE empty_array_checks(a imported_samples,b smallint[],mode integer,dimension integer,amount integer,start_at integer,expected_int integer,expected_text text,expected_bool boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')});
      CREATE TABLE native_arrays(id integer PRIMARY KEY,value smallint[]);`)
    const inputs: Input[] = []
    for (const [i, shape] of shapes.entries()) {
      trace(`capture shape ${i}`)
      await pg.query(`INSERT INTO native_arrays VALUES($1,${shape})`, [i])
      inputs.push(
        decode(
          (
            await pg.query<{ wire: string | null }>(
              "SELECT encode(array_send(value),'hex') wire FROM native_arrays WHERE id=$1",
              [i],
            )
          ).rows[0]!.wire,
        ),
      )
    }
    trace('snapshot catalog')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'empty_array_checks')!,
      constraints = Object.entries(expressions).flatMap(([name, sql]) => {
        const c = table.constraints.find((c) => c.name === name)!
        return [
          { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
          { ...c, name: name + '_stored' },
        ]
      }),
      group = prepareCheckRustGroup(
        constraints.map((c) => ({
          expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
        })),
        { defaultCollation: 'C', serverEncoding: 'UTF8', arrayNulls: true },
      )
    trace('prepared checks')
    for (const [i, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[i]!.name + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const suffix of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + suffix, row, expected })
      }
    let nativeInserts = 0,
      deferredSorts = 0
    for (const [mode, [name, call]] of [...calls].entries())
      for (let i = 0; i < shapes.length; i++)
        for (const j of call.pair ? shapes.keys() : [1])
          for (const dimension of ['length', 'lower', 'upper'].includes(name) ? [0, 1, 2, 6] : [1])
            for (const amount of call.amount ? [-1, 0, 1] : [0])
              for (const start of name === 'position' ? [null, 0, 1] : [0]) {
                trace(`native ${name} ${i} ${j} ${dimension} ${amount} ${start}`)
                const input = inputs[i]!,
                  zeroWidthSort =
                    (name === 'sort' || name === 'sort_text') &&
                    input.kind === 'Value' &&
                    typeof input.value === 'object' &&
                    input.value !== null &&
                    'dimensions' in input.value &&
                    input.value.dimensions.length > 1 &&
                    input.value.dimensions[0]!.length >= 2 &&
                    input.value.elements.length === 0
                if (zeroWidthSort) {
                  add(
                    name,
                    {
                      a: input,
                      mode: known(mode),
                      expected_text: known(''),
                    },
                    { kind: 'Unknown' },
                  )
                  deferredSorts++
                  continue
                }
                const params = [i, j, dimension, amount, start],
                  from =
                    'FROM (SELECT a.value::imported_samples a,b.value b,$3::integer dimension,$4::integer amount,$5::integer start_at FROM native_arrays a,native_arrays b WHERE a.id=$1 AND b.id=$2) q'
                let result: string | number | boolean | null = null,
                  expected: Outcome
                try {
                  result = (
                    await pg.query<{ value: string | number | boolean | null }>(
                      `SELECT ${call.sql} value ${from}`,
                      params,
                    )
                  ).rows[0]!.value
                  expected = { kind: result === null ? 'Null' : 'True' }
                } catch (e) {
                  expected = failure((e as { code: string }).code)
                }
                const values = [
                    call.kind === 'int' ? result : null,
                    call.kind === 'text' ? result : null,
                    call.kind === 'bool' ? result : null,
                  ] as const,
                  row: Row = {
                    a: inputs[i]!,
                    b: inputs[j]!,
                    mode: known(mode),
                    dimension: known(dimension),
                    amount: known(amount),
                    start_at: known(start),
                    expected_int: known(values[0]),
                    expected_text: known(values[1]),
                    expected_bool: known(values[2]),
                  }
                add(name, row, expected)
                const insertion = pg.query(
                  `INSERT INTO empty_array_checks(a,b,mode,dimension,amount,start_at,expected_int,expected_text,expected_bool) VALUES(${shapes[i]},${shapes[j]},$1,$2,$3,$4,$5,$6,$7)`,
                  [mode, dimension, amount, start, ...values],
                )
                nativeInserts++
                if (expected.kind === 'Error')
                  await expect(insertion).rejects.toMatchObject({
                    code: expected.value.state.toString(36).toUpperCase().padStart(5, '0'),
                  })
                else await insertion
                if (i === 2 && j === 1 && result !== null && expected.kind === 'True') {
                  const wrong =
                      call.kind === 'bool'
                        ? !result
                        : call.kind === 'text'
                          ? 'incorrect'
                          : Number(result) + 1,
                    changed = [
                      call.kind === 'int' ? wrong : null,
                      call.kind === 'text' ? wrong : null,
                      call.kind === 'bool' ? wrong : null,
                    ] as const
                  add(
                    name,
                    {
                      ...row,
                      expected_int: known(changed[0]),
                      expected_text: known(changed[1]),
                      expected_bool: known(changed[2]),
                    },
                    { kind: 'False' },
                  )
                  await expect(
                    pg.query(
                      `INSERT INTO empty_array_checks(a,b,mode,dimension,amount,start_at,expected_int,expected_text,expected_bool) VALUES(${shapes[i]},${shapes[j]},$1,$2,$3,$4,$5,$6,$7)`,
                      [mode, dimension, amount, start, ...changed],
                    ),
                  ).rejects.toMatchObject({ code: '23514' })
                  nativeInserts++
                }
              }
    const shaped = inputs[2]!
    expect(shaped.kind).toBe('Value')
    if (
      shaped.kind !== 'Value' ||
      typeof shaped.value !== 'object' ||
      shaped.value === null ||
      !('dimensions' in shaped.value)
    )
      throw new Error('Missing shaped-empty native array')
    const countRow = { mode: known(0), expected_int: known(0) }
    const wideEmpty = known({
      ...shaped.value,
      dimensions: [
        { lower: 0, length: 2147483647 },
        { lower: 0, length: 0 },
      ],
    })
    add('count', { ...countRow, a: wideEmpty }, { kind: 'True' })
    add(
      'sort',
      { a: wideEmpty, mode: known([...calls.keys()].indexOf('sort')), expected_text: known('') },
      { kind: 'Unknown' },
    )
    add(
      'reverse',
      { a: wideEmpty, mode: known([...calls.keys()].indexOf('reverse')), expected_text: known('') },
      { kind: 'Null' },
    )
    for (const value of [
      { ...shaped.value, dimensions: [{ length: -1, lower: 0 }] },
      { ...shaped.value, dimensions: [{ length: 1, lower: 0 }] },
      { ...shaped.value, dimensions: Array.from({ length: 7 }, () => ({ length: 0, lower: 0 })) },
      { ...shaped.value, dimensions: [{ length: 0, lower: -2147483648 }] },
      { ...shaped.value, elements: [{ kind: 'Int2' as const, value: 1 }] },
    ])
      add('count', { ...countRow, a: known(value) }, { kind: 'Unknown' })
    for (const bitmap of [{ kind: 'Unknown' } as const, { kind: 'Value', value: true } as const])
      add(
        'count',
        { ...countRow, a: known({ ...shaped.value, nullBitmap: bitmap }) },
        { kind: 'True' },
      )
    for (const state of [{ kind: 'Unknown' } as const, failure('22003'), { kind: 'Null' } as const])
      add('count', { ...countRow, a: state }, state)
    trace('run target parity')
    await runCheckParity(
      root,
      'arrayemptyshapes',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
    console.info('Shaped-empty array parity', {
      fixtures: fixtures.length,
      nativeInserts,
      checks: calls.size,
      deferredSorts,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
