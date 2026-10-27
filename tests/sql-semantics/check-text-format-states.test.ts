import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { quoteContext } from './check-quote-fixtures.js'

const packet = 'artifacts/goal-checks/format-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('preserves eager original argument errors, NULL formats, unused values and quote-all settings', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-format-states-'))
  try {
    await pg.exec("SET lc_monetary='C';SET quote_all_identifiers=on;")
    const forms = [
      'format(pattern,n/d,input::int)',
      'format(pattern,input::int,n/d)',
      'format(pattern,amount,input::int)',
      'format(pattern,input)',
    ]
    for (const [index, output] of forms.entries())
      await pg.exec(
        `CREATE TABLE format_state_${index}(pattern text,input text,n int,d int,amount money,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const [index, output] of forms.entries())
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === 'format_state_' + index)!,
          name = table.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, { ...quoteContext, quoteAllIdentifiers: true })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    let inserts = 0
    for (const [index, output] of forms.entries())
      for (const pattern of [null, 'unused', '%s', '%L', '%I', '%2$s', '%*s', '%1$*2$s', '%q'])
        for (const input of ['2', 'bad', null, 'lower'])
          for (const [n, d] of [
            [4, 2],
            [1, 0],
            [null, 0],
          ]) {
            let value: string | null = null,
              code: string | undefined
            try {
              value = (
                await pg.query<{ value: string | null }>(
                  `SELECT ${output} value FROM(SELECT $1::text pattern,$2::text input,$3::int n,$4::int d,1::money amount) args`,
                  [pattern, input, n, d],
                )
              ).rows[0]!.value
            } catch (e) {
              code = (e as { code: string }).code
            }
            for (const wanted of code ? [null] : new Set([value, 'wrong', null])) {
              const expected: Outcome = code
                ? error(code)
                : { kind: wanted === value ? 'True' : 'False' }
              const insert = pg.query(
                `INSERT INTO format_state_${index} VALUES($1,$2,$3,$4,1::money,$5,false)`,
                [pattern, input, n, d, wanted],
              )
              if (expected.kind === 'True') await insert
              else await expect(insert).rejects.toMatchObject({ code: code ?? '23514' })
              inserts++
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: 'format_state_' + index + '_' + origin,
                  row: {
                    pattern: known(pattern),
                    input: known(input),
                    n: known(n!),
                    d: known(d!),
                    amount: known(100),
                    expected: known(wanted),
                    bypass: known(false),
                  },
                  expected,
                })
            }
            observations.push({ index, pattern, input, n, d, value, code })
          }
    for (const [index] of forms.entries())
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: 'format_state_' + index + '_' + origin,
          row: {
            pattern: { kind: 'Unknown' },
            input: { kind: 'Unknown' },
            n: { kind: 'Unknown' },
            d: { kind: 'Unknown' },
            amount: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/states-evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/states-summary.json',
      JSON.stringify(
        { checks: names.length, fixtures: fixtures.length, inserts, observations },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'text_format_states', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('requires context only for reached output and identifier quoting', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-format-context-'))
  try {
    const values = ['1.25::float8', "'2000-01-02'::date", 'amount', "'\\x0102'::bytea", 'input']
    for (const [index, value] of values.entries())
      await pg.exec(
        `CREATE TABLE format_context_${index}(pattern text,use_value bool,input text,amount money,expected text,CONSTRAINT valid CHECK(format(pattern,CASE WHEN use_value THEN ${value} ELSE NULL END,input) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const [index, value] of values.entries())
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === 'format_context_' + index)!,
          name = table.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(format(pattern,CASE WHEN use_value THEN ${value} ELSE NULL END,input) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C")`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (
      index: number,
      pattern: string | null,
      useValue: boolean | null,
      input: string,
      wanted: string | null,
      expected: Outcome,
    ) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: 'format_context_' + index + '_' + origin,
          row: {
            pattern: known(pattern),
            use_value: known(useValue),
            input: known(input),
            amount: known(100),
            expected: known(wanted),
          },
          expected,
        })
    }
    for (const [index] of values.entries()) {
      for (const useValue of [true, false, null]) {
        add(index, null, useValue, 'lower', null, { kind: 'True' })
        add(index, '%%', useValue, 'lower', '%', { kind: 'True' })
        add(index, '%2$s', useValue, 'lower', 'lower', { kind: 'True' })
        add(index, '%2$I', useValue, 'select', '"select"', { kind: 'True' })
        add(index, '%2$I', useValue, 'lower', 'unused', { kind: 'Unknown' })
        add(index, '%1$*2$s', useValue, 'bad', 'unused', error('22P02'))
        if (useValue) {
          add(index, '%s', true, 'lower', 'lower', { kind: index === 4 ? 'True' : 'Unknown' })
          add(index, '%I', true, 'lower', 'unused', { kind: 'Unknown' })
          add(index, '%I', true, 'select', '"select"', { kind: index === 4 ? 'True' : 'Unknown' })
        } else {
          add(index, '%s', useValue, 'lower', '', { kind: 'True' })
          add(index, '%L', useValue, 'lower', 'NULL', { kind: 'True' })
          add(index, '%I', useValue, 'lower', 'unused', error('22004'))
        }
      }
    }
    await writeFile(packet + '/context-evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/context-summary.json',
      JSON.stringify({ checks: names.length, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(root, 'text_format_context', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})
