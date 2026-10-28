import {
  callableBoundary,
  textOrderingRequirements,
} from '../../scripts/check-measurements/catalog.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const profiles = [
  { name: 'operator', sql: 'a < b' },
  { name: 'function', sql: 'pg_catalog.text_lt(a,b)' },
  { name: 'comparator', sql: 'pg_catalog.bttextcmp(a,b) < 0' },
  { name: 'larger', sql: 'pg_catalog.text_larger(a,b) = b' },
  { name: 'smaller', sql: 'pg_catalog.text_smaller(a,b) = a' },
  { name: 'name', sql: 'a::name < b::name' },
  { name: 'bpchar', sql: 'a::bpchar < b::bpchar' },
  { name: 'bpchar_comparator', sql: 'pg_catalog.bpcharcmp(a::bpchar,b::bpchar) < 0' },
  { name: 'bpchar_larger', sql: 'pg_catalog.bpchar_larger(a::bpchar,b::bpchar) = b::bpchar' },
  { name: 'name_comparator', sql: 'pg_catalog.btnamecmp(a::name,b::name) < 0' },
  { name: 'cross_name', sql: 'a::name < b' },
  { name: 'cross_text', sql: 'a < b::name' },
  { name: 'row', sql: 'ROW(a,1) < ROW(b,2)' },
  { name: 'quantifier', sql: 'a < ALL(ARRAY[b])' },
  { name: 'explicit_default', sql: '(a COLLATE "default") < (b COLLATE "default")' },
  {
    name: 'qualified_default',
    sql: '(a COLLATE pg_catalog."default") < (b COLLATE pg_catalog."default")',
  },
  { name: 'explicit_c', sql: '(a COLLATE "C") < (b COLLATE "C")', explicit: true },
  { name: 'nullness', sql: '(a < b) IS NULL', nullness: true },
] as const
const value = (value: string | boolean): Input => ({ kind: 'Value', value })
const nil: Input = { kind: 'Null' }
const unknown: Input = { kind: 'Unknown' }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const packet = 'artifacts/goal-checks/default-c-binding-active'

it('preserves default ordering provenance, context, strict states and native INSERT outcomes in all targets', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-default-ordering-'))
  try {
    await pg.exec(
      `CREATE TABLE default_ordering(a text,b text,bypass boolean,${profiles.map((p) => `CONSTRAINT ${p.name} CHECK(CASE WHEN bypass THEN true ELSE ${p.sql} END)`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'default_ordering')!
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations: unknown[] = []
    const maxIdentifierBytes = Number(
      (await pg.query<{ value: string }>("SELECT current_setting('max_identifier_length') value"))
        .rows[0]!.value,
    )
    const names: string[] = []
    const groups = [true, false].map((declared) =>
      prepareCheckRustGroup(
        profiles.flatMap((p) =>
          ['source', 'stored'].map((origin) => {
            const constraint = table.constraints.find((c) => c.name === p.name)!
            const expression = portableCheckAtoms(
              lowerTableCheck(
                table,
                constraint,
                catalog.enums,
                catalog.domains,
                origin as 'source' | 'stored',
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE ${p.sql} END)`
                  : undefined,
              )!.expression,
            )
            expect(hasUncertain(expression), p.name + origin).toBe(false)
            names.push(`${declared}_${p.name}_${origin}`)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: `${declared}_${p.name}_${origin}`,
              },
              expression,
            }
          }),
        ),
        {
          serverEncoding: 'UTF8',
          maxIdentifierBytes,
          ...(declared ? { defaultCollation: 'C' as const } : {}),
        },
      ),
    )
    for (const group of groups)
      for (const check of group.checks) expect(check.kind, JSON.stringify(check)).toBe('supported')
    for (const p of profiles) {
      const nullness = 'nullness' in p
      const explicit = 'explicit' in p
      await pg.exec(
        `CREATE TABLE witness_${p.name}(a text,b text,bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE ${p.sql} END))`,
      )
      const add = (a: Input, b: Input, expected: Outcome, declared: boolean, bypass = false) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: `${declared}_${p.name}_${origin}`,
            row: { a, b, bypass: value(bypass) },
            expected,
          })
      }
      for (const [a, b] of [
        ['a', 'z'],
        ['z', 'a'],
        ['é', 'Z'],
        ['a', 'a'],
        [null, 'a'],
        ['a', null],
        [null, null],
      ] as const) {
        const literal = (s: string | null) => (s === null ? 'NULL' : `'${s}'`)
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${p.sql}) value FROM (SELECT ${literal(a)}::text a,${literal(b)}::text b) args`,
          )
        ).rows[0]!.value
        const expected: Outcome = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        let code: string | undefined
        try {
          await pg.exec(`INSERT INTO witness_${p.name} VALUES(${literal(a)},${literal(b)},false)`)
        } catch (cause) {
          code = (cause as { code: string }).code
        }
        expect(code, p.name).toBe(result === false ? '23514' : undefined)
        observations.push({ profile: p.name, a, b, expected, code })
        for (const declared of [true, false])
          add(
            a === null ? nil : value(a),
            b === null ? nil : value(b),
            !declared && !explicit && a !== null && b !== null ? { kind: 'Unknown' } : expected,
            declared,
          )
      }
      for (const declared of [true, false]) {
        for (const [a, b, expected] of [
          [nil, unknown, { kind: nullness ? 'True' : 'Null' }],
          [unknown, nil, { kind: nullness ? 'True' : 'Null' }],
          [unknown, unknown, { kind: 'Unknown' }],
          [error('22003'), nil, error('22003')],
          [nil, error('22012'), error('22012')],
          [unknown, error('22012'), error('22012')],
          [error('22003'), error('22012'), error('22003')],
        ] as [Input, Input, Outcome][]) {
          add(a, b, expected, declared)
          add(a, b, { kind: 'True' }, declared, true)
        }
      }
    }
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    const callables = [
      ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
    ]
    const group = {
      checks: groups.flatMap((g) => g.checks),
      evaluatorSource,
      source: assembleCheckRust({ source: evaluatorSource, callables }),
      requiresRegex: false,
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'ordering-observations.json'),
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(directory, 'pgsid-default-ordering', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)

it('does not reinterpret explicit non-C ordering or character classification as default C', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE COLLATION other_order(provider=icu,locale='und',deterministic=true);
      CREATE TABLE guarded_order(a text,b text,
        CHECK((a COLLATE other_order)<(b COLLATE other_order)),
        CHECK(lower(a)=b), CHECK(a ILIKE b));`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'guarded_order')!
    for (const constraint of table.constraints.filter((c) => c.type === 'check'))
      for (const origin of ['source', 'stored'] as const) {
        const expression = lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression
        expect(hasUncertain(expression), constraint.name + origin).toBe(true)
        const group = prepareCheckRustGroup(
          [
            {
              identity: {
                schema: 'public',
                kind: 'table',
                owner: table.name,
                constraint: constraint.name,
              },
              expression,
            },
          ],
          { defaultCollation: 'C' },
        )
        expect(group.evaluatorSource).not.toMatch(/sql__pg_catalog__(text_lt|lower|texticlike)__/u)
      }
  } finally {
    await pg.close()
  }
}, 30000)

it('classifies ordering context separately from intrinsic text and character-sensitive callables', () => {
  for (const name of ['text_lt', 'text_larger', 'bttextcmp', 'namelt', 'bpcharcmp']) {
    const item = builtinCallables().find(
      (item) => item.kind === 'function' && item.schema === 'pg_catalog' && item.name === name,
    )!
    expect(item, name).toBeDefined()
    expect(textOrderingRequirements(item)).toEqual([
      expect.objectContaining({
        kind: 'database',
        setting: 'input_collation / default_collation',
        owner: 'tests/sql-semantics/check-text-default-ordering.test.ts',
      }),
    ])
    expect(callableBoundary(item, new Set()).categories).toContain(
      'database-setting:input_collation/default_collation',
    )
  }
  for (const name of ['texteq', 'text_pattern_lt', 'lower']) {
    const item = builtinCallables().find(
      (item) => item.kind === 'function' && item.schema === 'pg_catalog' && item.name === name,
    )!
    expect(item, name).toBeDefined()
    expect(textOrderingRequirements(item)).toBeNull()
  }
})
