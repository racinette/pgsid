import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { builtinMetadata, builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { callableBoundary, verifyCatalog } from '../../scripts/check-measurements/catalog.js'
import { runCheckParity, type Row } from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('captures stable binary support and generates identical multirange validators across independent domain OIDs and search paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-binary-catalog-'))
  try {
    const groups: ReturnType<typeof prepareCheckRustGroup>[] = [],
      oids: number[] = [],
      io: unknown[] = []
    const fixtures: { name: string; row: Row; expected: { kind: 'True' } }[] = []
    const sql =
      'pg_catalog.multirange_send(payload) IS NOT DISTINCT FROM expected_wire AND pg_catalog.hash_multirange(payload)=expected32 AND pg_catalog.hash_multirange_extended(payload,seed)=expected64'
    for (const noisy of [false, true]) {
      const pg = await PGlite.create()
      try {
        if (noisy)
          await pg.exec(
            "CREATE TYPE public.unrelated_enum AS ENUM('x','y');CREATE DOMAIN public.unrelated_domain AS text;SET search_path=pg_catalog,public",
          )
        await pg.exec(
          `CREATE DOMAIN public.portable_slots AS int4multirange;CREATE TABLE public.portable_multi_checks(payload public.portable_slots,seed bigint,expected_wire bytea,expected32 integer,expected64 bigint,CHECK(${sql}))`,
        )
        const catalog = await readBuiltinCatalog(pg)
        verifyCatalog(catalog)
        io.push(catalog.typeIO)
        for (const metadata of Object.values(PG18_RANGE_TYPES)) {
          const receive = builtinMetadata(builtinTypeIO(metadata.multirange)!.receive!)
          expect(receive.args[0]).toBe('pg_catalog.internal')
          expect(
            callableBoundary(receive, new Set(Object.keys(PG18_RANGE_TYPES))).categories,
          ).toContain('internal-interface')
          const send = builtinMetadata(builtinTypeIO(metadata.subtype)!.send!)
          expect(send.args).toEqual([metadata.subtype])
          expect(send.result).toBe('pg_catalog.bytea')
        }
        oids.push(
          (
            await pg.query<{ oid: number }>(
              "SELECT oid::integer oid FROM pg_type WHERE typname='portable_slots'",
            )
          ).rows[0]!.oid,
        )
        const snapshot = await snapshotCatalog(pg),
          table = snapshot.tables.find((t) => t.name === 'portable_multi_checks')!
        const group = prepareCheckRustGroup(
          ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'source'
                  ? { name: 'check', type: 'check', definition: `CHECK(${sql})` }
                  : table.constraints[0]!,
                snapshot.enums,
                snapshot.domains,
                origin as 'source' | 'stored',
              )!.expression,
            ),
          })),
          { nativeByteOrder: 'little' },
        )
        expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
        groups.push(group)
        for (const payload of ['{}', '{(,)}', '{[1,3),[7,9)}', '{[2147483647,)}']) {
          const row = (
            await pg.query<{ wire: string; h32: number; h64: string }>(
              "SELECT encode(multirange_send($1::int4multirange),'hex') wire,hash_multirange($1::int4multirange) h32,hash_multirange_extended($1::int4multirange,-1) h64",
              [payload],
            )
          ).rows[0]!
          await pg.query(
            "INSERT INTO public.portable_multi_checks VALUES($1,-1,decode($2,'hex'),$3,$4)",
            [payload, row.wire, row.h32, row.h64],
          )
          const range = await readMultirangeFixture(pg, 'pg_catalog.int4multirange', payload)
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: origin,
              row: {
                payload: { kind: 'Value', value: range! },
                seed: { kind: 'Value', value: -1n },
                expected_wire: { kind: 'Value', value: row.wire },
                expected32: { kind: 'Value', value: row.h32 },
                expected64: { kind: 'Value', value: BigInt(row.h64) },
              },
              expected: { kind: 'True' },
            })
        }
      } finally {
        await pg.close()
      }
    }
    expect(oids[0]).not.toBe(oids[1])
    expect(io[0]).toEqual(io[1])
    expect(groups[0]!.evaluatorSource).toBe(groups[1]!.evaluatorSource)
    expect(groups[0]!.checks).toEqual(groups[1]!.checks)
    await runCheckParity(
      directory,
      'multibinarycatalog',
      groups[0]!,
      ['source', 'stored'],
      fixtures,
    )
    await mkdir('artifacts/check-multirange-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-wire-hash/catalog-report.json',
      JSON.stringify(
        {
          databases: 2,
          domainOids: oids,
          nativeInserts: 8,
          fixtures: fixtures.length,
          identicalGeneratedSource: true,
          receive: 'internal server buffer and type context; excluded from public values',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
