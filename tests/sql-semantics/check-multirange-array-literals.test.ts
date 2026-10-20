import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { rangeCoreSamples } from './check-range-fixtures.js'
import { multirangeArrayText } from './check-multirange-array-fixtures.js'

it('preserves runtime multimultirange-array input laziness, checked element domains, full grammar errors and eager typed literals', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-array-literals-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const families = Object.values(PG18_RANGE_TYPES)
    const forms = families.flatMap((m, i) => {
      const good = multirangeArrayText([
        '{' + rangeCoreSamples(m.identity).ranges[5]! + '}',
        null,
      ]).replaceAll("'", "''")
      return [
        {
          name: 'runtime',
          body: `cardinality(source::${m.multirange}[]) IS NOT DISTINCT FROM expected`,
          eager: false,
        },
        {
          name: 'guarded',
          body: `CASE WHEN bypass THEN true ELSE cardinality(source::${m.multirange}[]) IS NOT DISTINCT FROM expected END`,
          eager: false,
        },
        {
          name: 'domain',
          body: `cardinality(source::literal_multi_${i}[]) IS NOT DISTINCT FROM expected`,
          eager: false,
        },
        {
          name: 'domain_guarded',
          body: `CASE WHEN bypass THEN true ELSE cardinality(source::literal_multi_${i}[]) IS NOT DISTINCT FROM expected END`,
          eager: false,
        },
        {
          name: 'literal',
          body: `CASE WHEN bypass THEN true ELSE cardinality('${good}'::${m.multirange}[]) IS NOT DISTINCT FROM expected END`,
          eager: false,
        },
        {
          name: 'domain_literal',
          body: `CASE WHEN bypass THEN true ELSE cardinality('${good}'::literal_multi_${i}[]) IS NOT DISTINCT FROM expected END`,
          eager: false,
        },
        {
          name: 'literal_error',
          body: `CASE WHEN bypass THEN true ELSE cardinality('{"["}'::${m.multirange}[])>0 END`,
          eager: true,
        },
        {
          name: 'domain_literal_error',
          body: `CASE WHEN bypass THEN true ELSE cardinality('{"{}"}'::literal_multi_${i}[])>0 END`,
          eager: true,
        },
      ].map((f) => ({
        ...f,
        metadata: m,
        domain: 'literal_multi_' + i,
        table: `multi_array_text_${i}_${f.name}`,
        good,
      }))
    })
    for (const [i, m] of families.entries())
      await pg.exec(`CREATE DOMAIN literal_multi_${i} AS ${m.multirange} CHECK(NOT isempty(VALUE))`)
    const eagerErrors = new Map<string, string>()
    for (const f of forms) {
      const ddl = `CREATE TABLE ${f.table}(source text,expected integer,bypass boolean,CONSTRAINT checked CHECK(${f.body}))`
      if (!f.eager) await pg.exec(ddl)
      else {
        try {
          await pg.exec(ddl)
          throw new Error('Expected eager literal failure')
        } catch (error) {
          const state = (error as { code?: string }).code
          expect(state, f.table).toBe(f.name === 'literal_error' ? '22P02' : '23514')
          eagerErrors.set(f.table, state!)
        }
        await pg.exec(`CREATE TABLE ${f.table}(source text,expected integer,bypass boolean)`)
      }
    }
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((f) => {
      const table = catalog.tables.find((t) => t.name === f.table)!
      return (f.eager ? ['source'] : ['source', 'stored']).map((origin) => ({
        identity: { schema: 'public', kind: 'table' as const, owner: f.table, constraint: origin },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name: 'checked', type: 'check', definition: `CHECK(${f.body})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      }))
    })
    for (const p of plans)
      expect(hasUncertain(p.expression), JSON.stringify(p.identity)).toBe(false)
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const f of forms)
      for (const source of [
        null,
        '{}',
        f.good,
        '{"{}"}',
        '{"["}',
        `{"{[2000-99-99${f.metadata.subtype === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : ''},)}",}`,
        '{"{[13/02/2000,)}",}',
      ])
        for (const expectedCount of [2, null])
          for (const bypass of [false, true]) {
            let expected: Outcome
            if (f.eager)
              expected = {
                kind: 'Error',
                value: { state: parseInt(eagerErrors.get(f.table)!, 36) },
              }
            else {
              try {
                const value = (
                  await pg.query<{ value: boolean | null }>(
                    `INSERT INTO ${f.table} VALUES($1,$2,$3) RETURNING (${f.body}) value`,
                    [source, expectedCount, bypass],
                  )
                ).rows[0]!.value
                expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
              } catch (error) {
                const failure = error as { code: string; constraint?: string }
                expect(['23514', '22P02', '22007', '22008'], f.table).toContain(failure.code)
                expected =
                  failure.code === '23514' && failure.constraint === 'checked'
                    ? { kind: 'False' }
                    : { kind: 'Error', value: { state: parseInt(failure.code, 36) } }
              }
              inserts++
            }
            if (
              source === '{"{[13/02/2000,)}",}' &&
              ['pg_catalog.date', 'pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(
                f.metadata.subtype,
              ) &&
              ['runtime', 'guarded', 'domain', 'domain_guarded'].includes(f.name) &&
              !(bypass && f.name.endsWith('guarded'))
            )
              expected = { kind: 'Unknown' }
            const row: Row = {
              source: source === null ? { kind: 'Null' } : { kind: 'Value', value: source },
              expected:
                expectedCount === null ? { kind: 'Null' } : { kind: 'Value', value: expectedCount },
              bypass: { kind: 'Value', value: bypass },
            }
            for (const origin of f.eager ? ['source'] : ['source', 'stored'])
              fixtures.push({ name: f.table + '_' + origin, row, expected })
          }
    await runCheckParity(
      directory,
      'multiarrayliterals',
      group,
      forms.flatMap((f) =>
        (f.eager ? ['source'] : ['source', 'stored']).map((origin) => f.table + '_' + origin),
      ),
      fixtures,
    )
    await mkdir('artifacts/check-multirange-arrays', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-arrays/literal-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          nativeDDLRejections: eagerErrors.size,
          checkedElementDomains: true,
          orderedArrayAndRangeErrors: true,
          runtimeLaziness: true,
          eagerTypedLiterals: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
