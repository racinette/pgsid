import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { catalogCompositeType } from '../../src/sql-semantics/composite-profiles.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { rangeBoundCell, rangeBoundProjection } from './check-range-fixtures.js'
import { readCompositeFixture } from './check-composite-fixtures.js'

const packet = 'artifacts/goal-checks/tsvector-native-layouts-active'
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('retains detoasted document facts through inline compression, external storage, recursive records and compressed catalog expressions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-native-layouts-'))
  try {
    const text = Array.from(
        { length: 60 },
        (_, index) => 'shared_document_' + 'x'.repeat(180) + String(index).padStart(4, '0') + ':1A',
      ).join(' '),
      value = `$document$${text}$document$::tsvector`
    await pg.exec(`CREATE TYPE document_bundle AS(document tsvector,items tsvector[]);
      CREATE TYPE document_span AS RANGE(subtype=tsvector);
      CREATE FUNCTION document_default(lo tsvector DEFAULT ${value},hi tsvector DEFAULT NULL)
       RETURNS document_span LANGUAGE internal IMMUTABLE AS 'range_constructor2';
      CREATE TABLE inline_documents(value tsvector) WITH(toast_tuple_target=8160);
      ALTER TABLE inline_documents ALTER COLUMN value SET STORAGE MAIN;
      CREATE TABLE compressed_documents(value tsvector) WITH(toast_tuple_target=128);
      CREATE TABLE external_documents(value tsvector) WITH(toast_tuple_target=128);
      ALTER TABLE external_documents ALTER COLUMN value SET STORAGE EXTERNAL;
      CREATE TABLE bundled_documents(origin text,value document_bundle) WITH(toast_tuple_target=128);`)
    const physical: {
      origin: string
      stored: number
      native: number
      compression: string | null
      chunks: number
    }[] = []
    for (const origin of ['inline', 'compressed', 'external']) {
      await pg.query(`INSERT INTO ${origin}_documents VALUES($1::tsvector)`, [text])
      await pg.exec(
        `INSERT INTO bundled_documents SELECT '${origin}',ROW(value,ARRAY[value,NULL])::document_bundle FROM ${origin}_documents`,
      )
      const row = (
          await pg.query<{ stored: number; native: number; compression: string | null }>(
            `SELECT pg_column_size(value) stored,pg_column_size(setweight(value,'D',ARRAY[]::text[])) native,pg_column_compression(value) compression FROM ${origin}_documents`,
          )
        ).rows[0]!,
        toast = (
          await pg.query<{ name: string }>(
            'SELECT reltoastrelid::regclass::text name FROM pg_class WHERE oid=$1::regclass',
            [origin + '_documents'],
          )
        ).rows[0]!.name,
        chunks = (await pg.query<{ count: number }>(`SELECT count(*)::int4 count FROM ${toast}`))
          .rows[0]!.count
      physical.push({ origin, ...row, chunks })
      expect(row.native).toBeGreaterThan(8192)
      expect(row.stored).toBeLessThan(row.native)
      expect(row.compression).toBe(origin === 'external' ? null : 'pglz')
      if (origin === 'inline') expect(chunks).toBe(0)
      else expect(chunks).toBeGreaterThan(0)
    }
    expect(new Set(physical.map((row) => row.native)).size).toBe(1)
    const forms = {
      same: `value=${value}`,
      default: 'value=lower(public.document_default())',
      count: 'length(value)=term_count',
      rendered: 'value::text=expected_text',
      wire: "encode(tsvectorsend(value),'hex')=expected_wire",
      weighted: "setweight(value,'B')::text=expected_weighted",
      stripped: 'strip(value)::text=expected_stripped',
      record: '(bundle).document IS NOT DISTINCT FROM value',
      array: '(bundle).items[1] IS NOT DISTINCT FROM value',
    }
    const columns =
      'value tsvector,bundle document_bundle,term_count int4,expected_text text,expected_wire text,expected_weighted text,expected_stripped text,bypass bool'
    const definition = (sql: string) => `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)`
    await pg.exec(
      `CREATE TABLE document_checks(${columns},${Object.entries(forms)
        .map(([name, sql]) => `CONSTRAINT "${name}" ${definition(sql)}`)
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`CREATE TABLE native_${name}(${columns},${definition(sql)})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'document_checks')!,
      bundleType = catalogCompositeType(
        'public.document_bundle',
        catalog.compositeTypeGraph,
        catalog.rangeTypes,
      )!
    for (const name of ['same', 'default']) {
      const captured =
        name === 'same'
          ? table.constraints.find((c) => c.name === 'same')!.tsvectorConstants
          : catalog.functions.find((f) => f.name === 'document_default')!.args[0]!.tsvectorConstants
      expect(captured).toMatchObject({
        complete: true,
        constants: [{ storage: { nativeBytes: physical[0]!.native, lexemeCount: 60 } }],
      })
    }
    const expressions = (
      await pg.query<{
        site: string
        compression: string | null
      }>(`SELECT 'constraint' site,pg_column_compression(conbin) compression FROM pg_constraint WHERE conrelid='document_checks'::regclass AND conname='same'
      UNION ALL SELECT 'default',pg_column_compression(proargdefaults) FROM pg_proc WHERE oid='document_default(tsvector,tsvector)'::regprocedure`)
    ).rows
    expect(expressions).toEqual([
      { site: 'constraint', compression: 'pglz' },
      { site: 'default', compression: 'pglz' },
    ])
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
        (['source', 'stored'] as const).map((origin) => ({
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
                ? {
                    ...table.constraints.find((c) => c.name === name)!,
                    definition: definition(sql),
                  }
                : table.constraints.find((c) => c.name === name)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          ),
        })),
      ),
      group = prepareCheckRustGroup(plans, { serverEncoding: 'UTF8', clientEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.constraint + JSON.stringify(check)).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const origin of ['inline', 'compressed', 'external']) {
      const from = `FROM ${origin}_documents source CROSS JOIN LATERAL(SELECT value bundle FROM bundled_documents WHERE origin='${origin}') bundles`,
        projected = (
          await pg.query<{
            value: string
            text: string
            wire: string
            weighted: string
            stripped: string
          }>(
            `SELECT ${rangeBoundProjection('source.value', 'pg_catalog.tsvector')} value,source.value::text text,encode(tsvectorsend(source.value),'hex') wire,setweight(source.value,'B')::text weighted,strip(source.value)::text stripped ${from}`,
          )
        ).rows[0]!,
        document = rangeBoundCell('pg_catalog.tsvector', projected.value),
        bundle = await readCompositeFixture(pg, `SELECT bundle ${from}`, 'bundle', bundleType)
      expect(document.kind).toBe('Tsvector')
      if (document.kind !== 'Tsvector') throw new Error('Native document fixture missing')
      expect(document.value.nativeBytes).toBe(physical[0]!.native)
      for (const bypass of [false, true])
        for (const termCount of [60, 59]) {
          const row: Row = {
            value: known(document.value),
            bundle: known(bundle),
            term_count: known(termCount),
            expected_text: known(projected.text),
            expected_wire: known(projected.wire),
            expected_weighted: known(projected.weighted),
            expected_stripped: known(projected.stripped),
            bypass: known(bypass),
          }
          for (const [name, sql] of Object.entries(forms)) {
            let actual: boolean | null = null,
              state: string | undefined,
              rejected: string | undefined
            const parameters = [
                termCount,
                projected.text,
                projected.wire,
                projected.weighted,
                projected.stripped,
                bypass,
              ],
              select = `SELECT source.value,bundle,$1::int4 term_count,$2::text expected_text,$3::text expected_wire,$4::text expected_weighted,$5::text expected_stripped,$6::bool bypass ${from}`
            try {
              actual = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM(${select}) candidate`,
                  parameters,
                )
              ).rows[0]!.value
            } catch (error) {
              state = (error as { code: string }).code
            }
            try {
              await pg.query(`INSERT INTO native_${name} ${select}`, parameters)
            } catch (error) {
              rejected = (error as { code: string }).code
            }
            expect(rejected).toBe(state ?? (actual === false ? '23514' : undefined))
            inserts++
            const expected: Outcome = state
              ? { kind: 'Error', value: { state: parseInt(state, 36) } }
              : { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
            references.push({ origin, name, termCount, bypass, expected })
            for (const source of ['source', 'stored'])
              fixtures.push({ name: name + '_' + source, row, expected })
          }
        }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'native.json'),
      JSON.stringify(
        { physical, expressions, nativeInserts: inserts, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await writeFile(join(packet, 'evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'tsvectorlayouts',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
