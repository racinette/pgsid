import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves SQL-coerced json source, cached root type, SQL NULL and incoming errors in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-value-'))
  const callable = (name: string) => {
    const item = builtinCallables().find((c) => c.kind === 'function' && c.name === name)
    expect(item, name).toBeDefined()
    if (!item || !('rustName' in item)) throw new Error(name)
    return item.rustName
  }
  const typeofFn = callable('json_typeof')
  const equal = callable('texteq')
  const definitions = [
    { name: 'kind', helper: typeofFn, expected: true },
    { name: 'source', helper: 'json_to_text', expected: true },
    { name: 'nullness', helper: 'json_is_null', expected: false },
  ]
  const entries = definitions.map((d) =>
    checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'json_values',
      constraint: d.name,
    }),
  )
  const evaluatorSource = definitions
    .map(
      (d, index) =>
        `pub fn ${entries[index]}(source: TextValue${d.expected ? ',expected: TextValue' : ''}) -> CheckOutcome {
      let parsed = json_from_coerced_text(source);
      let result = ${d.helper}(parsed);
      ${d.expected ? `let compared = ${equal}(result,expected);check_from_bool(compared)` : 'check_from_bool(result)'}
    }`,
    )
    .join('\n')
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    evaluatorSource,
    requiresRegex: false,
    source: assembleCheckRust({ source: evaluatorSource, callables: [typeofFn, equal] }),
    checks: definitions.map((d, index) => ({
      kind: 'supported',
      entryName: entries[index]!,
      inputs: [
        { name: 'source', rustName: 'source', rustType: 'TextValue', type: 'pg_catalog.text' },
        ...(d.expected
          ? [
              {
                name: 'expected',
                rustName: 'expected',
                rustType: 'TextValue',
                type: 'pg_catalog.text',
              },
            ]
          : []),
      ],
    })),
  }
  const known = (value: string): Input => ({ kind: 'Value', value })
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  try {
    for (const value of [
      'null',
      'true',
      'false',
      '0',
      '-0.00',
      '9007199254740993.00',
      '1e2147483647',
      '1e-2147483648',
      '[]',
      '{}',
      '[1,false,null]',
      '{"a":1,"a":2}',
      ' \n {"雪":"😊", "list": [1, 2]} \t ',
      '"\\u0000"',
      '"\\ud800"',
      '"\\ud83d\\ude00"',
    ]) {
      const row = (
        await pg.query<{ kind: string; source: string; absent: boolean }>(
          'SELECT json_typeof(value) AS kind,value::text AS source,value IS NULL AS absent FROM (SELECT $1::json AS value) q',
          [value],
        )
      ).rows[0]!
      fixtures.push({
        name: 'kind',
        row: { source: known(value), expected: known(row.kind) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'source',
        row: { source: known(value), expected: known(row.source) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'nullness',
        row: { source: known(value) },
        expected: { kind: row.absent ? 'True' : 'False' },
      })
    }
    for (const source of [
      { kind: 'Null' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    ] as const) {
      for (const name of ['kind', 'source'])
        fixtures.push({
          name,
          row: { source, expected: known('unused') },
          expected: source.kind === 'Error' ? source : { kind: source.kind },
        })
      fixtures.push({
        name: 'nullness',
        row: { source },
        expected: source.kind === 'Null' ? { kind: 'True' } : source,
      })
    }
    for (const value of ['', '[1,]', '{"a":}', 'NaN']) {
      for (const name of ['kind', 'source'])
        fixtures.push({
          name,
          row: { source: known(value), expected: known('unused') },
          expected: { kind: 'Unknown' },
        })
      fixtures.push({
        name: 'nullness',
        row: { source: known(value) },
        expected: { kind: 'Unknown' },
      })
    }
    await runCheckParity(
      directory,
      'json_values',
      group,
      definitions.map((d) => d.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
