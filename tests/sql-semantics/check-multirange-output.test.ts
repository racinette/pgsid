import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

const value = (input: string | boolean | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('renders builtin multirange values through catalog I/O with character casts, domains and lazy context boundaries in all targets', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-output-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD'; SET TimeZone='UTC'")
    const portable: Record<string, (string | null)[]> = {
      int4range: [
        null,
        'empty',
        '(,)',
        '[1,10)',
        '(1,10]',
        '[-2147483648,2147483647)',
        '[2147483647,)',
        '(,0]',
      ],
      int8range: [
        null,
        'empty',
        '(,)',
        '[9007199254740993,9007199254740999)',
        '[-9223372036854775808,9223372036854775807)',
        '[9223372036854775807,)',
        '(,0]',
      ],
      numrange: [
        null,
        'empty',
        '(,)',
        '[-0.00,1.2300]',
        '[1.00,1.000]',
        '[NaN,NaN]',
        '[-Infinity,Infinity]',
        '[Infinity,NaN]',
        '(,NaN)',
        '[1e30,2e30)',
      ],
      daterange: [
        null,
        'empty',
        '(,)',
        '[-infinity,infinity]',
        '[infinity,infinity]',
        '(-infinity,infinity)',
        '(,infinity)',
        '[-infinity,)',
      ],
      tsrange: [
        null,
        'empty',
        '(,)',
        '[-infinity,infinity]',
        '[infinity,infinity]',
        '(,infinity)',
        '[-infinity,)',
      ],
      tstzrange: [
        null,
        'empty',
        '(,)',
        '[-infinity,infinity]',
        '[infinity,infinity]',
        '(,infinity)',
        '[-infinity,)',
      ],
    }
    const contextual: Record<string, string[]> = {
      daterange: ['[2000-01-02,2000-03-04)', '(,2000-03-04)', '[2000-01-02,infinity)'],
      tsrange: [
        '[2000-01-02 00:00:00.000001,2000-03-04)',
        '(,2000-03-04)',
        '[2000-01-02,infinity)',
      ],
      tstzrange: [
        '[2000-01-02 00:00:00.000001+00,2000-03-04 00:00:00+00)',
        '(,2000-03-04 00:00:00+00)',
        '[2000-01-02 00:00:00+00,infinity)',
      ],
    }
    for (const [type, values] of Object.entries(portable))
      portable[type] = values.map((span) => (span === null ? null : `{${span}}`))
    for (const [type, values] of Object.entries(contextual))
      contextual[type] = values.map((span) => `{${span}}`)
    portable.int4range!.push('{[1,3),[5,9)}', '{[1,3),[5,9),[100,110)}')
    portable.int8range!.push(
      '{[9007199254740993,9007199254740995),[9007199254740997,9007199254740999)}',
    )
    portable.numrange!.push(
      '{[1.0000,3.00000),[5.00,7.000]}',
      '{[-Infinity,-Infinity],[Infinity,NaN]}',
    )
    for (const type of ['daterange', 'tsrange', 'tstzrange'])
      portable[type]!.push('{[-infinity,-infinity],[infinity,infinity]}')
    contextual.daterange!.push(
      '{[-infinity,-infinity],[2000-01-02,2000-03-04),[infinity,infinity]}',
    )
    contextual.tsrange!.push('{[-infinity,-infinity],[2000-01-02,2000-03-04),[infinity,infinity]}')
    contextual.tstzrange!.push(
      '{[-infinity,-infinity],["2000-01-02 00:00+00","2000-03-04 00:00+00"),[infinity,infinity]}',
    )
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) => {
      const short = metadata.identity.slice('pg_catalog.'.length)
      return [
        { name: 'cast', expr: 'payload::text' },
        { name: 'function', expr: 'text(payload)' },
        { name: 'varchar', expr: 'payload::varchar' },
        { name: 'bpchar', expr: '(payload::char)::text' },
        { name: 'varchar3', expr: '(payload::varchar(3))::text' },
        { name: 'bpchar32', expr: '(payload::char(32))::text' },
        { name: 'coalesce', expr: `COALESCE(payload,'{}'::${metadata.multirange})::text` },
        { name: 'domain', expr: `(payload::multi_output_nested_${family})::text` },
        {
          name: 'literal',
          expr: `'${(contextual[short] ?? [portable[short]![3]])[0]}'::${metadata.multirange}::text`,
        },
      ].map((form, index) => ({
        ...form,
        metadata,
        short,
        table: `multi_output_${family}_${index}`,
        sql: `CASE WHEN bypass THEN true ELSE (${form.expr})=expected END`,
      }))
    })
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN multi_output_plain_${family} AS ${metadata.multirange};CREATE DOMAIN multi_output_nested_${family} AS multi_output_plain_${family}`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload ${form.metadata.multirange},expected text,bypass boolean,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'check', type: 'check', definition: `CHECK(${form.sql})` }
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
      for (const payload of [...portable[form.short]!, ...(contextual[form.short] ?? [])]) {
        const rendered = (
          await pg.query<{ rendered: string | null }>(
            `SELECT (${form.expr})::text rendered FROM (SELECT $1::${form.metadata.multirange} payload) q`,
            [payload],
          )
        ).rows[0]!.rendered
        const range = await readMultirangeFixture(pg, form.metadata.multirange, payload)
        const requiresContext =
          form.name === 'literal'
            ? Boolean(contextual[form.short])
            : payload !== null && (contextual[form.short] ?? []).includes(payload)
        for (const expectedText of [rendered, 'deliberately different'])
          for (const bypass of [false, true]) {
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${form.table} VALUES($1::${form.metadata.multirange},$2,$3) RETURNING (${form.sql}) result`,
                  [payload, expectedText, bypass],
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              expect((error as { code: string }).code).toBe('23514')
              expected = { kind: 'False' }
            }
            inserts++
            if (!bypass && requiresContext) expected = { kind: 'Unknown' }
            for (const mode of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + mode,
                row: {
                  payload: range ? { kind: 'Value', value: range } : { kind: 'Null' },
                  expected: value(expectedText),
                  bypass: value(bypass),
                },
                expected,
              })
          }
      }
      if (form.name !== 'literal')
        for (const payload of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[])
          for (const bypass of [false, true])
            for (const mode of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + mode,
                row: { payload, expected: value('empty'), bypass: value(bypass) },
                expected: bypass ? { kind: 'True' } : (payload as Outcome),
              })
    }
    const witnesses: Record<string, string[]> = {}
    for (const short of Object.keys(contextual)) {
      const form = forms.find((f) => f.short === short && f.name === 'cast')!
      const payload = contextual[short]![0]!
      const settings =
        short === 'tstzrange'
          ? ["SET TimeZone='UTC'", "SET TimeZone='Europe/Minsk'"]
          : ["SET DateStyle='ISO,YMD'", "SET DateStyle='SQL,DMY'"]
      const outputs: string[] = []
      for (const setting of settings) {
        await pg.exec(setting)
        outputs.push(
          (
            await pg.query<{ output: string }>(
              `SELECT $1::${form.metadata.multirange}::text output`,
              [payload],
            )
          ).rows[0]!.output,
        )
        for (const bypass of [false, true]) {
          try {
            await pg.query(
              `INSERT INTO ${form.table} VALUES($1::${form.metadata.multirange},$2,$3)`,
              [payload, outputs[0], bypass],
            )
            expect(bypass || outputs.length === 1).toBe(true)
          } catch (error) {
            expect((error as { code: string }).code).toBe('23514')
            expect(bypass).toBe(false)
          }
          inserts++
        }
      }
      expect(outputs[0]).not.toBe(outputs[1])
      witnesses[short] = outputs
      await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    }
    const literalNames: string[] = []
    for (const metadata of Object.values(PG18_RANGE_TYPES)) {
      const form = forms.find((f) => f.metadata.identity === metadata.identity)!
      const table = catalog.tables.find((t) => t.name === form.table)!
      const sql = `CASE WHEN bypass THEN true ELSE ('['::${metadata.multirange})::text=expected END`
      await expect(
        pg.exec(`CREATE TABLE invalid_${form.table}(bypass boolean,expected text,CHECK(${sql}))`),
      ).rejects.toMatchObject({ code: '22P02' })
      const plan = lowerTableCheck(
        table,
        { name: 'literal_input', type: 'check', definition: `CHECK(${sql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      expect(hasUncertain(plan.expression)).toBe(false)
      plans.push({
        identity: {
          schema: 'public',
          kind: 'table',
          owner: form.table,
          constraint: 'literal_input',
        },
        expression: portableCheckAtoms(plan.expression),
      })
      const name = form.table + '_literal_input'
      literalNames.push(name)
      for (const bypass of [false, true])
        fixtures.push({
          name,
          row: { bypass: value(bypass), expected: value('empty') },
          expected: { kind: 'Error', value: { state: parseInt('22P02', 36) } },
        })
    }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'multirangeoutput',
      group,
      [
        ...forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
        ...literalNames,
      ],
      fixtures,
    )
    expect(forms).toHaveLength(54)
    expect(inserts).toBeGreaterThan(1800)
    await mkdir('artifacts/check-multirange-output', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-output/report.json',
      JSON.stringify(
        { inserts, fixtures: fixtures.length, plans: plans.length, witnesses },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300000)
