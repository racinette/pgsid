import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  validSnapshotConstantStorage,
  type SnapshotConstantStorage,
} from '../../src/catalog/snapshot-constant-storage.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves binary-only stored snapshot values without text input in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-snapshot-stored-boundary-')),
    artifact = 'artifacts/goal-checks/snapshot-row-constants-active',
    plans = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  const known = (value: bigint | string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    for (const type of ['pg_snapshot', 'txid_snapshot'] as const) {
      const modern = type === 'pg_snapshot',
        idType = modern ? 'xid8' : 'bigint',
        visible = modern ? 'pg_visible_in_snapshot' : 'txid_visible_in_snapshot',
        expressions = {
          text: '__SNAP__::text',
          wire: `encode(${type}_send(__SNAP__),'hex')`,
          xmin: `${type}_xmin(__SNAP__)::text`,
          xmax: `${type}_xmax(__SNAP__)::text`,
          json: 'to_jsonb(ARRAY[__SNAP__,NULL])::text',
          visible: `${visible}(probe,__SNAP__)::text`,
        }
      await pg.exec(
        `CREATE TABLE binary_${type}(value ${type});CREATE TABLE template_${type}(probe ${idType},expected text COLLATE "C",bypass bool,${Object.entries(
          expressions,
        )
          .map(
            ([name, sql]) =>
              `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql.replaceAll('__SNAP__', `'1:9:3'::${type}`)}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
          )
          .join(',')})`,
      )
      const catalog = await snapshotCatalog(pg),
        t = catalog.tables.find((t) => t.name === 'template_' + type)!
      for (const [sample, words] of [
        [1n, 9n, 9n],
        [1n, 1n, 1n],
        [9223372036854775809n, 18446744073709551615n, 9223372036854775809n, 18446744073709551615n],
        [1n, 18446744073709551615n, 9223372036854775808n, 18446744073709551615n],
        [1n, 9n, 3n, 3n],
        [1n, 100n, ...Array.from({ length: 40 }, (_, i) => BigInt(i * 2 + 1)), 100n],
      ].entries()) {
        const data = Buffer.alloc(20 + (words.length - 2) * 8)
        data.writeInt32BE(words.length - 2)
        words.forEach((w, i) => data.writeBigUInt64BE(w, 4 + i * 8))
        const header = Buffer.alloc(19)
        Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
        const tuple = Buffer.alloc(6)
        tuple.writeInt16BE(1)
        tuple.writeInt32BE(data.length, 2)
        await pg.exec(`TRUNCATE binary_${type}`)
        await pg.exec(`COPY binary_${type} FROM '/dev/blob' (FORMAT binary)`, {
          blob: new Blob([
            new Uint8Array(Buffer.concat([header, tuple, data, Buffer.from('ffff', 'hex')])),
          ]),
        })
        const wire = Buffer.from(
            (
              await pg.query<{ wire: Uint8Array }>(
                `SELECT ${type}_send(value) wire FROM binary_${type}`,
              )
            ).rows[0]!.wire,
          ),
          payload: SnapshotConstantStorage = {
            type: `pg_catalog.${type}`,
            xmin: wire.readBigUInt64BE(4).toString(),
            xmax: wire.readBigUInt64BE(12).toString(),
            xip: Array.from({ length: wire.readInt32BE() }, (_, i) =>
              wire.readBigUInt64BE(20 + i * 8).toString(),
            ),
          }
        expect(validSnapshotConstantStorage(payload)).toBe(true)
        if (sample !== 4)
          await expect(
            pg.query(`SELECT $1::${type}`, [
              `${payload.xmin}:${payload.xmax}:${payload.xip.join(',')}`,
            ]),
          ).rejects.toMatchObject({ code: '22P02' })
        for (const k of t.constraints)
          for (const origin of ['source', 'stored'] as const) {
            const base = lowerTableCheck(
              t,
              k,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!
            let replaced = 0
            const replace = (value: unknown): unknown => {
              if (Array.isArray(value)) return value.map(replace)
              if (!value || typeof value !== 'object') return value
              const object = value as Record<string, unknown>
              if (object['kind'] === 'snapshot-storage') {
                replaced++
                return { ...payload, kind: 'snapshot-storage' }
              }
              return Object.fromEntries(
                Object.entries(object).map(([key, child]) => [key, replace(child)]),
              )
            }
            const expression = replace(base.expression) as typeof base.expression,
              name = type + '_' + sample + '_' + k.name + '_' + origin
            expect(replaced, name).toBeGreaterThan(0)
            plans.push({
              name,
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: 'stored_binary',
                constraint: name,
              },
              expression,
            })
            for (const probe of [
              null,
              0n,
              1n,
              3n,
              8n,
              9n,
              9223372036854775808n,
              18446744073709551615n,
            ]) {
              const id =
                  probe === null
                    ? null
                    : modern
                      ? probe.toString()
                      : BigInt.asIntN(64, probe).toString(),
                rendered = (
                  await pg.query<{ rendered: string | null }>(
                    `SELECT (${expressions[k.name as keyof typeof expressions].replaceAll('__SNAP__', 'value')}) rendered FROM binary_${type},(SELECT $1::${idType} probe) input`,
                    [id],
                  )
                ).rows[0]!.rendered
              for (const match of [true, false]) {
                const expected = match ? rendered : 'different',
                  row: Row = {
                    probe: probe === null ? known(null) : known(BigInt.asIntN(64, probe)),
                    expected: known(expected),
                    bypass: known(false),
                  },
                  outcome: Outcome = { kind: match ? 'True' : 'False' }
                fixtures.push({ name, row, expected: outcome })
                if (origin === 'source') native.push({ name, row, expected: outcome, payload })
              }
            }
            fixtures.push({
              name,
              row: {
                probe: { kind: 'Unknown' },
                expected: { kind: 'Unknown' },
                bypass: known(true),
              },
              expected: { kind: 'True' },
            })
          }
      }
    }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    expect(group.evaluatorSource).not.toContain('snapshot_from_text(')
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'binary-fixtures.json'),
      JSON.stringify(
        { native, fixtures },
        (_, v: unknown) => (typeof v === 'bigint' ? v.toString() : v),
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'example.com/snapshot-stored-boundary',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
