import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const literal = `'{"aa":1,"é":2}'::jsonb`
const outputs: Record<string, [string, string]> = {
  field: ['document->>field_name', 'document->field_name'],
  field_call: ['jsonb_object_field_text(document,field_name)', 'document->field_name'],
  element: ['document->>element_index', 'document->element_index'],
  element_call: ['jsonb_array_element_text(document,element_index)', 'document->element_index'],
  path: ['document#>>path::text[]', 'document#>path::text[]'],
  path_call: ['jsonb_extract_path_text(document,VARIADIC path::text[])', 'document#>path::text[]'],
  path_expanded: [
    "jsonb_extract_path_text(document,field_name,'0')",
    "jsonb_extract_path(document,field_name,'0')",
  ],
  raw_path: [
    'jsonb_extract_path_text(document,VARIADIC raw_path::text[])',
    'document#>path::text[]',
  ],
  chain: ['document->field_name->>0', 'document->field_name->0'],
  pretty: ['jsonb_pretty(document)', 'document'],
  pretty_field: ['jsonb_pretty(document->field_name)', 'document->field_name'],
  cast_field: ['(document->field_name)::text', 'document->field_name'],
  defaulted: ["COALESCE(document->>field_name,'fallback')", 'document->field_name'],
  guarded: [
    "CASE WHEN bypass THEN 'ignored' ELSE jsonb_pretty(document) END",
    'CASE WHEN bypass THEN NULL::jsonb ELSE document END',
  ],
  literal: [`jsonb_pretty(${literal})`, literal],
  eager_literal: [`CASE WHEN bypass THEN 'ignored' ELSE jsonb_pretty(${literal}) END`, literal],
  hidden_literal: [
    `CASE WHEN false THEN jsonb_pretty(${literal}) ELSE 'ignored' END`,
    'NULL::jsonb',
  ],
}

function encodingNeeded(source: string | null): boolean {
  if (source === null) return false
  const pending: unknown[] = [JSON.parse(source)]
  while (pending.length) {
    const value = pending.pop()
    if (Array.isArray(value)) pending.push(...value)
    else if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value)
      if (
        keys.filter((key) => key.length > 0).length > 1 &&
        keys.some((key) => /[^\x00-\x7f]/u.test(key))
      )
        return true
      pending.push(...Object.values(value))
    }
  }
  return false
}

it('uses declared UTF8 for JSONB selected-container rendering and exact pretty output while preserving missing-context, literal and runtime boundaries in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-rendering-context-'))
  try {
    expect((await pg.query('SHOW server_encoding')).rows[0]).toEqual({ server_encoding: 'UTF8' })
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, [sql]]) => [
        name,
        `(${sql}) IS NOT DISTINCT FROM expected`,
      ]),
    )
    await pg.exec(`CREATE TABLE rendering_values(document jsonb,field_name text,element_index integer,path text,raw_path text,expected text COLLATE "C",bypass boolean);
      CREATE TABLE rendering_checks(LIKE rendering_values,${Object.entries(forms)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'rendering_checks')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: lowerTableCheck(
          table,
          origin === 'stored'
            ? table.constraints.find((check) => check.name === name)!
            : { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          catalog.domains,
          origin,
        )!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
      })),
    )
    const cases: [string | null, string | null, number | null, string | null][] = [
      ['{"selected":{"aa":1,"é":2},"outside":{"zz":1,"雪":2}}', 'selected', 0, '{selected}'],
      ['{"selected":[{"aa":1,"é":2}],"outside":1}', 'selected', 0, '{selected,0}'],
      ['{"selected":"decoded 雪","outside":{"aa":1,"é":2}}', 'selected', 0, '{selected}'],
      ['{"selected":null,"outside":{"aa":1,"é":2}}', 'selected', 0, '{selected}'],
      ['{"selected":{"雪":1},"outside":{"aa":1,"é":2}}', 'selected', 0, '{selected}'],
      ['{"selected":{"":1,"雪":2}}', 'selected', 0, '{selected}'],
      ['[{"aa":1,"é":2},{"aa":2,"é":1}]', 'selected', -1, '{-1}'],
      ['{"aa":1,"é":2,"雪":3,"zz":4}', 'missing', -2147483648, '{}'],
      ['{"é":1,"aa":2}', 'é', 0, '{NULL}'],
      ['[1.2300,{"aa":1,"é":2}]', null, -2, '{0}'],
      ['"decoded 雪"', 'selected', -1, '{}'],
      ['null', 'selected', 0, null],
      ['{}', 'missing', null, '{}'],
      ['[]', 'missing', 0, '{}'],
      [null, 'selected', 0, '{selected}'],
    ]
    const references: { name: string; row: Row; dependent: boolean }[] = []
    for (const [document, field, index, path] of cases)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE rendering_values')
        await pg.query('INSERT INTO rendering_values VALUES($1,$2,$3,$4,$5,NULL,$6)', [
          document,
          field,
          index,
          path,
          path,
          bypass,
        ])
        for (const [name, [sql, selected]] of Object.entries(outputs)) {
          const result = (
            await pg.query<{ value: string | null; selected: string | null }>(
              `SELECT (${sql}) value,(${selected})::text selected FROM rendering_values`,
            )
          ).rows[0]!
          const row: Row = {
            document: known(document),
            field_name: known(field),
            element_index: known(index),
            path: known(path),
            raw_path: known(path),
            expected: known(result.value),
            bypass: known(bypass),
          }
          references.push({ name, row, dependent: encodingNeeded(result.selected) })
        }
      }
    for (const utf8 of [false, true]) {
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        arrayNulls: true,
        ...(utf8 ? { serverEncoding: 'UTF8' as const } : {}),
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
      for (const item of references) {
        const deferred = !utf8 && item.dependent
        add(item.name, item.row, { kind: deferred ? 'Unknown' : 'True' })
        add(
          item.name,
          { ...item.row, expected: known('wrong') },
          { kind: deferred ? 'Unknown' : 'False' },
        )
      }
      const base: Row = {
        document: known('{"selected":{"aa":1,"é":2}}'),
        field_name: known('selected'),
        element_index: known(0),
        path: known('{selected}'),
        raw_path: known('{selected}'),
        expected: known('ignored'),
        bypass: known(true),
      }
      add(
        'field',
        { ...base, document: failure('22003'), field_name: failure('22012') },
        failure('22003'),
      )
      add(
        'field',
        { ...base, document: known(null), field_name: failure('22012') },
        failure('22012'),
      )
      add(
        'element',
        { ...base, document: known(null), element_index: failure('22012') },
        failure('22012'),
      )
      add('raw_path', { ...base, document: known(null), raw_path: known('{') }, failure('22P02'))
      add('guarded', { ...base, document: failure('22003') }, { kind: 'True' })
      add('field', { ...base, document: { kind: 'Unknown' } }, { kind: 'Unknown' })
      await mkdir('artifacts/goal-checks/jsonb-rendering-context', { recursive: true })
      await writeFile(
        `artifacts/goal-checks/jsonb-rendering-context/${utf8 ? 'utf8' : 'portable'}-fixtures.json`,
        JSON.stringify({ outputs, references, fixtures }, null, 2) + '\n',
      )
      await runCheckParity(
        await mkdtemp(join(directory, utf8 ? 'utf8-' : 'portable-')),
        'jsonbrender' + String(utf8),
        group,
        plans.map((plan) => plan.identity.constraint),
        fixtures,
      )
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
