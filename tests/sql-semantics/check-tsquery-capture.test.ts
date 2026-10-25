import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  tsqueryConstantStorage,
  validTsqueryConstantStorage,
} from '../../src/catalog/tsquery-constant-storage.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../src/catalog/diff.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { readTsqueryFixture } from './check-tsquery-fixtures.js'
const packet = 'artifacts/goal-checks/tsquery-literals-active'
const context = { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' } as const

function datum(tree: string): Buffer {
  const raw = tree
    .match(/\{CONST\b[^{}]*:constlen -1\b[^{}]*\}/u)?.[0]
    .match(/:constvalue\s+(\d+)\s+\[([^\]]*)\]/u)
  if (!raw) throw Error('Missing constant datum')
  const bytes = Buffer.from(raw[2]!.trim().split(/\s+/u).filter(Boolean).map(Number))
  if (bytes.length !== Number(raw[1])) throw Error('Truncated constant datum')
  return bytes
}
function swapped(bytes: Buffer): Buffer {
  const output = Buffer.from(bytes),
    count = bytes.readUInt32LE(4)
  output.writeUInt32BE(bytes.length, 0)
  output.writeUInt32BE(count, 4)
  for (let i = 0; i < count; i++) {
    const at = 8 + i * 12
    if (bytes[at] === 1) {
      output.writeInt32BE(bytes.readInt32LE(at + 4), at + 4)
      const packed = bytes.readUInt32LE(at + 8)
      output.writeUInt32BE((packed & 4095) * 1048576 + (packed >>> 12), at + 8)
    } else {
      output.writeInt16BE(bytes.readInt16LE(at + 2), at + 2)
      output.writeUInt32BE(bytes.readUInt32LE(at + 4), at + 4)
    }
  }
  return output
}

it('decodes native tsquery constant layouts to endian-independent logical trees and rejects malformed captures', async () => {
  const pg = await PGlite.create()
  try {
    const samples = [
      '',
      'a',
      '!a',
      'a & (b & c)',
      '(a & b) & c',
      'é:*AB <2> (😀 <-> z:D)',
      "'it''s':*AB | !'a\\b'",
    ]
    for (const [i, text] of samples.entries()) {
      await pg.exec(
        `CREATE TABLE capture_${i}(value bool CHECK(tsquerysend($q$${text}$q$::tsquery) IS NOT NULL))`,
      )
      const tree = (
          await pg.query<{ tree: string }>(
            `SELECT conbin::text tree FROM pg_constraint WHERE conrelid='capture_${i}'::regclass`,
          )
        ).rows[0]!.tree,
        bytes = datum(tree),
        native = await readTsqueryFixture(pg, 'SELECT $1::tsquery value', 'value', [text])
      expect(tsqueryConstantStorage(bytes, true)).toEqual(native)
      expect(tsqueryConstantStorage(swapped(bytes), true)).toEqual(native)
      expect(tsqueryConstantStorage(bytes, false)).toEqual(
        /[^\x00-\x7f]/u.test(text) ? undefined : native,
      )
      for (const bad of [
        bytes.subarray(1),
        Buffer.concat([bytes, Buffer.from([0])]),
        Buffer.alloc(8),
        Buffer.from([1, 2, 3]),
      ])
        expect(tsqueryConstantStorage(bad, true)).toBeUndefined()
      if (native?.nodes.length) {
        expect(validTsqueryConstantStorage({ ...native, root: native.nodes.length })).toBe(false)
        const damaged = Buffer.from(bytes)
        damaged[8] = 99
        expect(tsqueryConstantStorage(damaged, true)).toBeUndefined()
      }
    }
  } finally {
    await pg.close()
  }
})

it('captures positional query defaults and detects a tree change hidden by canonical default text', async () => {
  const pg = await PGlite.create()
  const create = (first: string) =>
    `CREATE OR REPLACE FUNCTION query_defaults(first_query tsquery DEFAULT '${first}',separator integer DEFAULT 7,second_query tsquery DEFAULT '(x | y) | z',missing_query tsquery DEFAULT NULL) RETURNS TABLE(left_query tsquery,right_query tsquery) LANGUAGE SQL IMMUTABLE AS $$SELECT first_query,second_query$$`
  try {
    await pg.exec(create('a & (b & c)'))
    const before = await snapshotCatalog(pg),
      fn = before.functions.find((f) => f.name === 'query_defaults')!,
      first = fn.args[0]!.tsqueryConstants!,
      second = fn.args[2]!.tsqueryConstants!
    expect(first.complete).toBe(true)
    expect(second.complete).toBe(true)
    expect(first.constants[0]!.storage).toEqual(
      await readTsqueryFixture(pg, 'SELECT * FROM query_defaults()', 'left_query'),
    )
    expect(second.constants[0]!.storage).toEqual(
      await readTsqueryFixture(pg, 'SELECT * FROM query_defaults()', 'right_query'),
    )
    expect(fn.args[1]!.tsqueryConstants).toBeUndefined()
    expect(fn.args[3]!.tsqueryConstants?.constants).toEqual([{ site: '', storage: null }])
    expect(fn.args.slice(4).every((a) => !a.tsqueryConstants)).toBe(true)
    await pg.exec(create('(a & b) & c'))
    const after = await snapshotCatalog(pg),
      changed = after.functions.find((f) => f.name === 'query_defaults')!
    expect(changed.args.map((a) => a.defaultExpr)).toEqual(fn.args.map((a) => a.defaultExpr))
    expect(changed.args[0]!.tsqueryConstants!.constants).not.toEqual(first.constants)
    expect(
      diffCatalogs(before, after).modified.some((e) =>
        e.entityId.startsWith('public.query_defaults('),
      ),
    ).toBe(true)
    expect(changed.args[0]!.tsqueryConstants!.constants[0]!.storage).toEqual(
      await readTsqueryFixture(pg, 'SELECT * FROM query_defaults()', 'left_query'),
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'defaults.json'),
      JSON.stringify(
        {
          before: fn.args.map((a) => ({
            name: a.name,
            default: a.defaultExpr,
            query: a.tsqueryConstants,
          })),
          after: changed.args.map((a) => ({
            name: a.name,
            default: a.defaultExpr,
            query: a.tsqueryConstants,
          })),
          diff: diffCatalogs(before, after).modified.map((e) => e.entityId),
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
  }
})

it('retains binary-origin empty operands and signed phrase distances through captured CHECK constants in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-binary-constants-'))
  try {
    await pg.exec('CREATE CAST(text AS pg_node_tree) WITHOUT FUNCTION')
    const shapes = [
      { name: 'empty_operand', literal: 'a', distance: null },
      { name: 'negative_phrase', literal: 'a <2> b', distance: -1 },
      { name: 'wide_phrase', literal: 'a <2> b', distance: 32767 },
      { name: 'minimum_phrase', literal: 'a <2> b', distance: -32768 },
    ]
    for (const shape of shapes) {
      await pg.exec(
        `CREATE TABLE query_${shape.name}(expected_wire text,bypass bool,CONSTRAINT original CHECK(CASE WHEN bypass THEN true ELSE encode(tsquerysend('${shape.literal}'::tsquery),'hex')=expected_wire END))`,
      )
      const saved = (
          await pg.query<{ oid: number; tree: string }>(
            `SELECT oid,conbin::text tree FROM pg_constraint WHERE conrelid='query_${shape.name}'::regclass`,
          )
        ).rows[0]!,
        bytes = datum(saved.tree)
      if (shape.distance === null) {
        bytes.writeUInt32LE(0, 16)
        bytes.writeUInt32LE(0, 12)
        bytes[20] = 0
      } else bytes.writeInt16LE(shape.distance, 10)
      const changed = saved.tree.replace(/\{CONST\b[^{}]*:constlen -1\b[^{}]*\}/u, (node) =>
        node.replace(
          /:constvalue\s+\d+\s+\[[^\]]*\]/u,
          `:constvalue ${bytes.length} [ ${[...bytes].map((b) => (b > 127 ? b - 256 : b)).join(' ')} ]`,
        ),
      )
      await pg.query('UPDATE pg_constraint SET conbin=$1::text::pg_node_tree WHERE oid=$2', [
        changed,
        saved.oid,
      ])
      await pg.exec(`ALTER TABLE query_${shape.name} ALTER COLUMN expected_wire SET STATISTICS 101`)
    }
    const catalog = await snapshotCatalog(pg),
      checks = shapes.map((shape) => {
        const table = catalog.tables.find((t) => t.name === 'query_' + shape.name)!,
          c = table.constraints[0]!
        expect(c.tsqueryConstants?.complete).toBe(true)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: shape.name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(table, c, [], catalog.domains, 'stored')!.expression,
          ),
        }
      }),
      group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const shape of shapes) {
      const term = (text: string) =>
          Buffer.concat([Buffer.from([1, 0, 0]), Buffer.from(text), Buffer.from([0])]),
        count = Buffer.alloc(4),
        operator = Buffer.alloc(4)
      count.writeUInt32BE(shape.distance === null ? 1 : 3)
      operator[0] = 2
      operator[1] = 4
      operator.writeUInt16BE((shape.distance ?? 0) + ((shape.distance ?? 0) < 0 ? 65536 : 0), 2)
      const wire = Buffer.concat([
        count,
        ...(shape.distance === null ? [term('')] : [operator, term('b'), term('a')]),
      ]).toString('hex')
      for (const expectedWire of [null, wire, 'wrong'])
        for (const bypass of [false, true]) {
          let state: string | undefined
          try {
            await pg.query(`INSERT INTO query_${shape.name} VALUES($1,$2)`, [expectedWire, bypass])
          } catch (error) {
            state = (error as { code: string }).code
          }
          expect(state).toBe(!bypass && expectedWire === 'wrong' ? '23514' : undefined)
          const row: Row = {
              expected_wire:
                expectedWire === null ? { kind: 'Null' } : { kind: 'Value', value: expectedWire },
              bypass: { kind: 'Value', value: bypass },
            },
            expected: Outcome = {
              kind: bypass
                ? 'True'
                : expectedWire === null
                  ? 'Null'
                  : expectedWire === wire
                    ? 'True'
                    : 'False',
            }
          fixtures.push({ name: shape.name, row, expected })
          references.push({ shape: shape.name, expectedWire, bypass, state })
        }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'binary.json'),
      JSON.stringify(
        { nativeInserts: fixtures.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsquerybinaryconstants',
      group,
      shapes.map((s) => s.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
