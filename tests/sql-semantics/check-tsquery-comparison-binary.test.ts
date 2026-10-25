import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readTsqueryFixture } from './check-tsquery-fixtures.js'

it('compares native binary query operands, signed phrase distances and retained padding through every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-comparison-binary-')),
    packet = 'artifacts/goal-checks/tsquery-comparison-active'
  try {
    await pg.exec('CREATE TABLE binary_queries(key text,value tsquery)')
    const shapes = [
      { key: 'a', word: 'a', distance: null },
      { key: 'empty', word: '', distance: null },
      { key: 'weighted', word: 'a', distance: null },
      { key: 'negative', word: 'a', distance: -1 },
      { key: 'minimum', word: 'a', distance: -32768 },
      { key: 'positive', word: 'a', distance: 1 },
      { key: 'wide', word: 'a', distance: 32767 },
    ]
    for (const sample of shapes) {
      const term = (text: string) =>
          Buffer.concat([
            Buffer.from([1, sample.key === 'weighted' ? 8 : 0, sample.key === 'weighted' ? 1 : 0]),
            Buffer.from(text),
            Buffer.from([0]),
          ]),
        count = Buffer.alloc(4),
        operator = Buffer.alloc(4)
      count.writeUInt32BE(sample.distance === null ? 1 : 3)
      operator[0] = 2
      operator[1] = 4
      operator.writeUInt16BE((sample.distance ?? 0) + ((sample.distance ?? 0) < 0 ? 65536 : 0), 2)
      const wire = Buffer.concat([
          count,
          ...(sample.distance === null
            ? [term(sample.word)]
            : [operator, term('b'), term(sample.word)]),
        ]),
        header = Buffer.alloc(19),
        columns = Buffer.alloc(2),
        keySize = Buffer.alloc(4),
        valueSize = Buffer.alloc(4)
      Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
      columns.writeUInt16BE(2)
      keySize.writeUInt32BE(Buffer.byteLength(sample.key))
      valueSize.writeUInt32BE(wire.length)
      await pg.exec("COPY binary_queries FROM '/dev/blob' (FORMAT binary)", {
        blob: new Blob([
          new Uint8Array(
            Buffer.concat([
              header,
              columns,
              keySize,
              Buffer.from(sample.key),
              valueSize,
              wire,
              Buffer.from('ffff', 'hex'),
            ]),
          ),
        ]),
      })
    }
    await pg.exec(
      "CREATE CAST(text AS pg_node_tree) WITHOUT FUNCTION;CREATE FUNCTION padded_query(value tsquery DEFAULT 'a') RETURNS tsquery LANGUAGE SQL IMMUTABLE AS $$SELECT value$$",
    )
    const saved = (
      await pg.query<{ oid: number; tree: string }>(
        "SELECT oid,proargdefaults::text tree FROM pg_proc WHERE proname='padded_query'",
      )
    ).rows[0]!
    const tree = saved.tree.replace(
      /:constvalue\s+(\d+)\s+\[([^\]]*)\]/u,
      (_all, length: string, body: string) => {
        const bytes = Buffer.from(body.trim().split(/\s+/u).map(Number))
        expect(bytes.length).toBe(Number(length))
        expect(bytes.length).toBe(22)
        bytes.writeUInt32LE(0, 12)
        bytes.writeUInt32LE(0, 16)
        bytes[20] = 0
        return `:constvalue ${bytes.length} [ ${[...bytes].map((b) => (b > 127 ? b - 256 : b)).join(' ')} ]`
      },
    )
    await pg.query('UPDATE pg_proc SET proargdefaults=$1::text::pg_node_tree WHERE oid=$2', [
      tree,
      saved.oid,
    ])
    await pg.exec('ALTER FUNCTION padded_query(tsquery) COST 2')
    await pg.exec(
      "INSERT INTO binary_queries SELECT 'padded',padded_query();INSERT INTO binary_queries VALUES('empty_query',''::tsquery)",
    )
    const padded = (await readTsqueryFixture(
        pg,
        "SELECT value item FROM binary_queries WHERE key='padded'",
        'item',
      ))!,
      empty = (await readTsqueryFixture(
        pg,
        "SELECT value item FROM binary_queries WHERE key='empty'",
        'item',
      ))!
    expect(padded.nodes).toEqual(empty.nodes)
    expect(padded.nativeBytes).toBe(22)
    expect(empty.nativeBytes).toBe(21)
    const definitions: Record<string, string> = {
      same: 'item=reference',
      less: 'item<reference',
      raw: 'tsquery_cmp(item,reference)<=0',
      contains: 'item @> reference',
      nulled: 'NULLIF(item,reference) IS NULL',
    }
    const columns = 'item tsquery,reference tsquery,bypass bool'
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(
        `CREATE TABLE binary_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(definitions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'binary_' + name)!,
          c = table.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
                : c,
              [],
              catalog.domains,
              origin,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, {
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
        defaultCollation: 'C',
      })
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const keys = [...shapes.map((s) => s.key), 'padded', 'empty_query'],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (let i = 0; i < keys.length; i++)
      for (const b of [keys[i]!, keys[(i + 1) % keys.length]!, keys[1]!])
        for (const bypass of [false, true]) {
          const a = keys[i]!,
            query =
              'SELECT a.value item,b.value reference,$3::bool bypass FROM binary_queries a,binary_queries b WHERE a.key=$1 AND b.key=$2',
            parameters = [a, b, bypass],
            row: Row = {
              item: {
                kind: 'Value',
                value: (await readTsqueryFixture(
                  pg,
                  'SELECT value item FROM binary_queries WHERE key=$1',
                  'item',
                  [a],
                ))!,
              },
              reference: {
                kind: 'Value',
                value: (await readTsqueryFixture(
                  pg,
                  'SELECT value item FROM binary_queries WHERE key=$1',
                  'item',
                  [b],
                ))!,
              },
              bypass: { kind: 'Value', value: bypass },
            }
          for (const [name, sql] of Object.entries(definitions)) {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM (${query}) input`,
                parameters,
              )
            ).rows[0]!.value
            let state: string | undefined
            try {
              await pg.query(`INSERT INTO binary_${name} ${query}`, parameters)
            } catch (error) {
              state = (error as { code: string }).code
            }
            expect(state).toBe(value === false ? '23514' : undefined)
            inserts++
            const expected: Outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({ a, b, bypass, name, value, state })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'binary-reference.json'),
      JSON.stringify(
        { nativeInserts: inserts, fixtures: fixtures.length, padded, empty, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsquerycomparisonbinary',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
