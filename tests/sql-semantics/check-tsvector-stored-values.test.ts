import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

type Lexeme = { text: string; positions: number[] }
const datum = (lexemes: readonly Lexeme[]) => {
  const pool: Buffer[] = [],
    entries = Buffer.alloc(lexemes.length * 4)
  let offset = 0
  for (const [i, lexeme] of lexemes.entries()) {
    const text = Buffer.from(lexeme.text)
    entries.writeUInt32LE(
      offset * 4096 + text.length * 2 + (lexeme.positions.length ? 1 : 0),
      i * 4,
    )
    pool.push(text)
    offset += text.length
    if (lexeme.positions.length) {
      if (offset % 2) {
        pool.push(Buffer.alloc(1))
        offset++
      }
      const positions = Buffer.alloc(2 + lexeme.positions.length * 2)
      positions.writeUInt16LE(lexeme.positions.length)
      lexeme.positions.forEach((p, j) => positions.writeUInt16LE(p, 2 + j * 2))
      pool.push(positions)
      offset += positions.length
    }
  }
  const bytes = Buffer.concat([Buffer.alloc(8), entries, ...pool])
  bytes.writeUInt32LE(bytes.length * 4)
  bytes.writeInt32LE(lexemes.length, 4)
  return bytes
}
it('captures binary-origin stored document constants through historical rows without text normalization', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-stored-values-')),
    artifact = 'artifacts/goal-checks/fulltext-row-constants-active',
    samples: Lexeme[][] = [
      [{ text: 'a', positions: [49152, 2] }],
      [
        { text: 'a', positions: [49153] },
        { text: 'a', positions: [32770] },
      ],
      [{ text: 'a'.repeat(2047), positions: [] }],
    ],
    consumers = {
      wire: "encode(tsvectorsend(__DOC__),'hex')",
      render: '__DOC__::text',
      stripped: 'strip(__DOC__)::text',
      weighted: "setweight(__DOC__,'B')::text",
      size: 'length(__DOC__)::text',
      compare: "tsvector_cmp(__DOC__,'a'::tsvector)::text",
      present: '(ROW(n,__DOC__)::historical_document IS NOT NULL)::text',
      project: '((ROW(n,__DOC__)::historical_document).n)::text',
      json: 'to_jsonb(ROW(n,__DOC__)::historical_document)::text',
    },
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    await pg.exec(
      'CREATE CAST(text AS pg_node_tree) WITHOUT FUNCTION;CREATE TYPE historical_document AS(n int,old tsvector);CREATE TABLE binary_documents(value tsvector)',
    )
    const type = (await pg.query<{ id: number }>("SELECT 'tsvector'::regtype::oid id")).rows[0]!.id
    for (const [name, sql] of Object.entries(consumers))
      await pg.exec(
        `CREATE FUNCTION pg_temp.observed_${name}(n int) RETURNS text LANGUAGE SQL RETURN (SELECT ${sql.replaceAll('__DOC__', 'value')} FROM binary_documents)`,
      )
    for (const [index, sample] of samples.entries())
      for (const [consumer, sql] of Object.entries(consumers)) {
        const name = 'document_' + index + '_' + consumer,
          expression = sql.replaceAll('__DOC__', "'a:1A'::tsvector")
        await pg.exec(
          `CREATE TABLE ${name}(n int,expected text COLLATE "C",bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${expression}) COLLATE "C" IS NOT DISTINCT FROM expected END))`,
        )
        const saved = (
            await pg.query<{ id: number; source: string }>(
              `SELECT oid id,conbin::text source FROM pg_constraint WHERE conrelid='${name}'::regclass`,
            )
          ).rows[0]!,
          bytes = datum(sample),
          source = saved.source.replace(
            new RegExp('\\{CONST\\b[^{}]*:consttype ' + type + '\\b[^{}]*\\}', 'u'),
            (value) =>
              value.replace(
                /:constvalue\s+\d+\s+\[[^\]]*\]/u,
                `:constvalue ${bytes.length} [ ${[...bytes].map((b) => (b > 127 ? b - 256 : b)).join(' ')} ]`,
              ),
          )
        expect(source).not.toBe(saved.source)
        await pg.query('UPDATE pg_constraint SET conbin=$1::text::pg_node_tree WHERE oid=$2', [
          source,
          saved.id,
        ])
        await pg.exec(`ALTER TABLE ${name} ALTER COLUMN expected SET STATISTICS 101`)
      }
    await pg.exec('ALTER TYPE historical_document DROP ATTRIBUTE old')
    const catalog = await snapshotCatalog(pg),
      plans = catalog.tables
        .filter((t) => t.name.startsWith('document_'))
        .flatMap((t) => {
          expect(t.constraints[0]!.rowCoercionContext?.complete, t.name).toBe(true)
          return (['source', 'stored'] as const).map((origin) => ({
            name: t.name + '_' + origin,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: t.name,
              constraint: origin,
            },
            expression: lowerTableCheck(
              t,
              t.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          }))
        }),
      group = prepareCheckRustGroup(plans, {
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
        defaultCollation: 'C',
      })
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    expect(group.evaluatorSource).not.toMatch(/tsvector_from_(?:stored_)?text/u)
    const input = (value: string | number | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const [index, sample] of samples.entries()) {
      const count = Buffer.alloc(4)
      count.writeInt32BE(sample.length)
      const wire = Buffer.concat([
          count,
          ...sample.flatMap((l) => {
            const p = Buffer.alloc(2 + l.positions.length * 2)
            p.writeUInt16BE(l.positions.length)
            l.positions.forEach((v, j) => p.writeUInt16BE(v, 2 + j * 2))
            return [Buffer.from(l.text), Buffer.from([0]), p]
          }),
        ]),
        header = Buffer.alloc(19),
        tuple = Buffer.alloc(6)
      Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
      tuple.writeInt16BE(1)
      tuple.writeInt32BE(wire.length, 2)
      await pg.exec('TRUNCATE binary_documents')
      await pg.exec("COPY binary_documents FROM '/dev/blob' (FORMAT binary)", {
        blob: new Blob([
          new Uint8Array(Buffer.concat([header, tuple, wire, Buffer.from('ffff', 'hex')])),
        ]),
      })
      for (const consumer of Object.keys(consumers))
        for (const n of [1, null, -1]) {
          const rendered = (
            await pg.query<{ value: string | null }>(
              `SELECT pg_temp.observed_${consumer}($1) value`,
              [n],
            )
          ).rows[0]!.value
          for (const expected of [rendered, 'different'])
            for (const bypass of [false, true]) {
              const name = 'document_' + index + '_' + consumer,
                row: Row = { n: input(n), expected: input(expected), bypass: input(bypass) }
              let failure: string | undefined
              try {
                await pg.query(`INSERT INTO ${name} VALUES($1,$2,$3)`, [n, expected, bypass])
              } catch (e) {
                failure = (e as { code: string }).code
              }
              expect(failure).toBe(!bypass && expected === 'different' ? '23514' : undefined)
              const outcome: Outcome = { kind: failure ? 'False' : 'True' }
              native.push({ name, row, expected: outcome })
              for (const origin of ['source', 'stored'])
                fixtures.push({ name: name + '_' + origin, row, expected: outcome })
            }
        }
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'binary-plans.json'),
      JSON.stringify(
        {
          plans,
          constraints: catalog.tables
            .filter((t) => t.name.startsWith('document_'))
            .map((t) => ({ name: t.name, constraint: t.constraints[0] })),
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile(
      join(artifact, 'binary-fixtures.json'),
      JSON.stringify({ native, fixtures }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'example.com/stored-documents',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
