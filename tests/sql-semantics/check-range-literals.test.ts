import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

it('preserves eager typed range literals, lazy stable input casts, domain checks and raw/stored normalization', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-literals-'))
  try {
    await pg.exec(
      "SET DateStyle='ISO,YMD';SET TimeZone='UTC';CREATE TABLE range_literal_oracle(bypass boolean,actual boolean)",
    )
    const samples: Record<string, string> = {
      int4range: '(1,3]',
      int8range: '(9007199254740993,9007199254740999]',
      numrange: '[1.2300,3.4500]',
      daterange: '[2000-01-01,2000-01-03]',
      tsrange: '[2000-01-01 00:00:00.000001,2000-01-03]',
      tstzrange: '[2000-01-01 00:00:00.000001+02,2000-01-03 00:00:00+02]',
    }
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) => {
      const short = metadata.identity.slice('pg_catalog.'.length)
      const literal = `'${samples[short]}'`
      return [
        { name: 'literal', expr: `${literal}::${metadata.identity}` },
        { name: 'domain', expr: `${literal}::range_literal_domain_${family}` },
        { name: 'coalesce', expr: `COALESCE(NULL::${metadata.identity},${literal})` },
        { name: 'null', expr: `NULL::${metadata.identity}` },
        { name: 'stable', expr: `('[bad]'::text)::${metadata.identity}` },
        { name: 'domain_failure', expr: `${literal}::range_empty_domain_${family}` },
      ].map((form, index) => {
        const shape = [
          'isempty',
          'lower_inc',
          'upper_inc',
          'lower_inf',
          'upper_inf',
          'lower',
          'upper',
        ].map((n) => `${n}(${form.expr}) IS NOT DISTINCT FROM ${n}(expected)`)
        return {
          ...form,
          metadata,
          short,
          table: `range_literals_${family}_${index}`,
          sql: `CASE WHEN bypass THEN true ELSE ((${form.expr}) IS NULL)=(expected IS NULL) AND (${shape.join(' AND ')}) END`,
        }
      })
    })
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN range_literal_domain_${family} AS ${metadata.identity};CREATE DOMAIN range_empty_domain_${family} AS range_literal_domain_${family} CHECK(isempty(VALUE))`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(expected ${form.metadata.identity},bypass boolean,CONSTRAINT valid_range CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'valid_range', type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        expect(hasUncertain(plan.expression), form.table + '/' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const form of forms) {
      const text = form.name === 'null' ? null : samples[form.short]!
      const expectedRange = await readRangeFixture(
        pg,
        `SELECT $1::${form.metadata.identity} span`,
        'span',
        form.metadata.identity,
        [text],
      )
      for (const bypass of [false, true]) {
        let expected: Outcome
        try {
          await pg.query(`INSERT INTO ${form.table} VALUES($1::${form.metadata.identity},$2)`, [
            text,
            bypass,
          ])
          expected = { kind: 'True' }
        } catch (error) {
          const code = (error as { code: string }).code
          expect(code).toBe(form.name === 'stable' ? '22P02' : '23514')
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        inserts++
        const row: Row = {
          expected: expectedRange ? { kind: 'Value', value: expectedRange } : { kind: 'Null' },
          bypass: { kind: 'Value', value: bypass },
        }
        for (const mode of ['source', 'stored'])
          fixtures.push({ name: form.table + '_' + mode, row, expected })
      }
    }
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries()) {
      const form = forms.find((f) => f.table === `range_literals_${family}_0`)!
      const table = catalog.tables.find((t) => t.name === form.table)!
      const sql = `CASE WHEN bypass THEN true ELSE isempty('[bad]'::${metadata.identity}) END`
      await expect(
        pg.exec(`CREATE TABLE invalid_literal_${family}(bypass boolean,CHECK(${sql}))`),
      ).rejects.toMatchObject({ code: '22P02' })
      const plan = lowerTableCheck(
        table,
        { name: 'invalid_literal', type: 'check', definition: `CHECK(${sql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      expect(hasUncertain(plan.expression)).toBe(false)
      plans.push({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: form.table,
          constraint: 'invalid_literal',
        },
        expression: portableCheckAtoms(plan.expression),
      })
      for (const bypass of [false, true]) {
        await expect(
          pg.query(
            `INSERT INTO range_literal_oracle VALUES($1,${sql.replaceAll('bypass', '$1::boolean')})`,
            [bypass],
          ),
        ).rejects.toMatchObject({ code: '22P02' })
        inserts++
        fixtures.push({
          name: form.table + '_invalid_literal',
          row: { bypass: { kind: 'Value', value: bypass } },
          expected: { kind: 'Error', value: { state: parseInt('22P02', 36) } },
        })
      }
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangeliterals',
      group,
      [
        ...forms.flatMap((form) => ['source', 'stored'].map((mode) => form.table + '_' + mode)),
        ...Object.values(PG18_RANGE_TYPES).map(
          (_, family) => `range_literals_${family}_0_invalid_literal`,
        ),
      ],
      fixtures,
    )
    expect(inserts).toBe(84)
    expect(fixtures).toHaveLength(156)
    await mkdir('artifacts/check-range-input', { recursive: true })
    await writeFile(
      'artifacts/check-range-input/literal-report.json',
      JSON.stringify(
        { inserts, fixtures: fixtures.length, plans: plans.length, failedDdlWitnesses: 6 },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
