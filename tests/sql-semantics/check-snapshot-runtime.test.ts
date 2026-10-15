import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { snapshotInputForms, invalidSnapshotInputForms } from './check-snapshot-input-forms.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'

it('preserves supplied snapshot grammar, full-width words, canonicalization, send, bounds and visibility in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-snapshots-'))
  const callable = (name: string) => {
    const item = builtinCallables().find((c) => c.kind === 'function' && c.name === name)
    expect(item, name).toBeDefined()
    if (!item || !('rustName' in item)) throw new Error(name)
    return item.rustName
  }
  const definitions = [
    {
      name: 'text',
      inputs: [
        ['source', 'TextValue', 'pg_catalog.text'],
        ['expected', 'TextValue', 'pg_catalog.text'],
      ],
      body: `${callable('texteq')}(snapshot_to_text(snapshot_from_text(source)),expected)`,
    },
    ...(['pg_snapshot', 'txid_snapshot'] as const).flatMap((type) => [
      {
        name: type + '_send',
        inputs: [
          ['source', 'TextValue', 'pg_catalog.text'],
          ['expected', 'ByteaValue', 'pg_catalog.bytea'],
        ],
        body: `${callable('byteaeq')}(${callable(type + '_send')}(snapshot_from_text(source)),expected)`,
      },
      ...(['xmin', 'xmax'] as const).map((bound) => ({
        name: type + '_' + bound,
        inputs: [
          ['source', 'TextValue', 'pg_catalog.text'],
          [
            'expected',
            type === 'pg_snapshot' ? 'Xid8Value' : 'Int8Value',
            type === 'pg_snapshot' ? 'pg_catalog.xid8' : 'pg_catalog.int8',
          ],
        ],
        body: `${callable(type === 'pg_snapshot' ? 'xid8eq' : 'int8eq')}(${callable(type + '_' + bound)}(snapshot_from_text(source)),expected)`,
      })),
      {
        name: type + '_visible',
        inputs: [
          ['source', 'TextValue', 'pg_catalog.text'],
          [
            'id',
            type === 'pg_snapshot' ? 'Xid8Value' : 'Int8Value',
            type === 'pg_snapshot' ? 'pg_catalog.xid8' : 'pg_catalog.int8',
          ],
        ],
        body: `${callable(type === 'pg_snapshot' ? 'pg_visible_in_snapshot' : 'txid_visible_in_snapshot')}(id,snapshot_from_text(source))`,
      },
    ]),
  ]
  const entry = (name: string) =>
    checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'snapshot_runtime',
      constraint: name,
    })
  const evaluatorSource = definitions
    .map((d) => {
      let body = 'let parsed = snapshot_from_text(source);'
      if (d.name.endsWith('_visible')) {
        const fn = callable(
          d.name.startsWith('pg_') ? 'pg_visible_in_snapshot' : 'txid_visible_in_snapshot',
        )
        body += `let compared = ${fn}(id, parsed);check_from_bool(compared)`
      } else {
        const fn = d.name === 'text' ? 'snapshot_to_text' : callable(d.name)
        const comparison = callable(
          d.name === 'text'
            ? 'texteq'
            : d.name.endsWith('_send')
              ? 'byteaeq'
              : d.name.startsWith('pg_')
                ? 'xid8eq'
                : 'int8eq',
        )
        body += `let result = ${fn}(parsed);let compared = ${comparison}(result,expected);check_from_bool(compared)`
      }
      return `pub fn ${entry(d.name)}(${d.inputs.map(([name, kind]) => `${name}: ${kind}`).join(',')}) -> CheckOutcome { ${body} }`
    })
    .join('\n')
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    evaluatorSource,
    requiresRegex: false,
    checks: definitions.map((d) => ({
      kind: 'supported',
      entryName: entry(d.name),
      inputs: d.inputs.map(([name, rustType, type]) => ({
        name: name!,
        rustName: name!,
        rustType: rustType!,
        type: type!,
      })),
    })),
    source: assembleCheckRust({
      source: evaluatorSource,
      callables: definitions.flatMap((d) => [...d.body.matchAll(/sql__\w+/gu)].map((m) => m[0])),
    }),
  }
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  const known = (value: string | bigint): Input => ({ kind: 'Value', value })
  try {
    const metadata = (
      await pg.query<{ name: string; source: string }>(
        `SELECT proname AS name,prosrc AS source FROM pg_proc WHERE proname IN ('pg_snapshot_in','txid_snapshot_in','pg_snapshot_out','txid_snapshot_out') ORDER BY proname`,
      )
    ).rows
    expect(metadata).toEqual([
      { name: 'pg_snapshot_in', source: 'pg_snapshot_in' },
      { name: 'pg_snapshot_out', source: 'pg_snapshot_out' },
      { name: 'txid_snapshot_in', source: 'pg_snapshot_in' },
      { name: 'txid_snapshot_out', source: 'pg_snapshot_out' },
    ])
    for (const type of ['pg_snapshot', 'txid_snapshot'] as const) {
      for (const value of snapshotInputForms) {
        const row = (
          await pg.query<{ normalized: string; wire: string; xmin: string; xmax: string }>(
            `SELECT s::text AS normalized,encode(${type}_send(s),'hex') AS wire,${type}_xmin(s)::text AS xmin,${type}_xmax(s)::text AS xmax FROM (SELECT $1::${type} AS s) q`,
            [value],
          )
        ).rows[0]!
        fixtures.push({
          name: 'text',
          row: { source: known(value), expected: known(row.normalized) },
          expected: { kind: 'True' },
        })
        fixtures.push({
          name: type + '_send',
          row: { source: known(value), expected: known(row.wire) },
          expected: { kind: 'True' },
        })
        for (const bound of ['xmin', 'xmax'] as const)
          fixtures.push({
            name: type + '_' + bound,
            row: { source: known(value), expected: known(BigInt.asIntN(64, BigInt(row[bound]))) },
            expected: { kind: 'True' },
          })
        for (const signed of [
          0n,
          1n,
          3n,
          5n,
          8n,
          9n,
          30n,
          31n,
          80n,
          99n,
          100n,
          9223372036854775807n,
          -9223372036854775808n,
          -1n,
        ]) {
          const id = type === 'pg_snapshot' ? BigInt.asUintN(64, signed) : signed
          const fn = type === 'pg_snapshot' ? 'pg_visible_in_snapshot' : 'txid_visible_in_snapshot'
          const actual = (
            await pg.query<{ visible: boolean }>(
              `SELECT ${fn}($1::${type === 'pg_snapshot' ? 'xid8' : 'bigint'},$2::${type}) AS visible`,
              [id.toString(), value],
            )
          ).rows[0]!
          fixtures.push({
            name: type + '_visible',
            row: { source: known(value), id: known(BigInt.asIntN(64, id)) },
            expected: { kind: actual.visible ? 'True' : 'False' },
          })
        }
      }
      for (const value of invalidSnapshotInputForms) {
        await expect(pg.query(`SELECT $1::${type}`, [value])).rejects.toMatchObject({
          code: '22P02',
        })
        fixtures.push({
          name: 'text',
          row: { source: known(value), expected: known('unused') },
          expected: { kind: 'Error', value: { state: parseInt('22P02', 36) } },
        })
      }
    }
    fixtures.push({
      name: 'text',
      row: { source: known('1:9:'), expected: known('1:10:') },
      expected: { kind: 'False' },
    })
    for (const kind of ['Null', 'Unknown', 'Error'] as const) {
      const value: Input & Outcome =
        kind === 'Error' ? { kind, value: { state: parseInt('22003', 36) } } : { kind }
      for (const d of definitions) {
        const row: Row = { source: value, expected: known('unused'), id: known(3n) }
        if (d.name !== 'text') row.expected = known(d.name.endsWith('send') ? '' : 1n)
        fixtures.push({ name: d.name, row, expected: kind === 'Error' ? value : { kind } })
      }
    }
    await runCheckParity(
      directory,
      'snapshot_runtime',
      group,
      definitions.map((d) => d.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 480000)
