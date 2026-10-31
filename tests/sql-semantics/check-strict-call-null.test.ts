import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/strict-call-null-active'
const nil: Input = { kind: 'Null' }
const unknown: Input = { kind: 'Unknown' }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

type Profile = {
  name: string
  types: [string, string]
  sql: string
  values: [Input, Input]
  literals: [string, string]
  context?: boolean
  nonstrict?: boolean
}
const array: Input = {
  kind: 'Value',
  value: {
    elementType: 'pg_catalog.int4',
    elementKind: 2,
    dimensions: [{ lower: 1, length: 1 }],
    elements: [{ kind: 'Null' }],
    nullBitmap: { kind: 'Value', value: true },
  },
}
const record: Input = {
  kind: 'Value',
  value: { typeName: 'public.strict_pair', fields: [{ kind: 'Null' }, { kind: 'Null' }] },
}
const profiles: Profile[] = [
  {
    name: 'boolean',
    types: ['bool', 'bool'],
    sql: 'a=b',
    values: [
      { kind: 'Value', value: false },
      { kind: 'Value', value: false },
    ],
    literals: ['false', 'false'],
  },
  {
    name: 'text',
    types: ['text', 'text'],
    sql: 'a||b',
    values: [
      { kind: 'Value', value: 'x' },
      { kind: 'Value', value: 'y' },
    ],
    literals: ["'x'", "'y'"],
  },
  {
    name: 'text_order',
    types: ['text', 'text'],
    sql: '(a COLLATE "C")<(b COLLATE "C")',
    values: [
      { kind: 'Value', value: 'x' },
      { kind: 'Value', value: 'y' },
    ],
    literals: ["'x'", "'y'"],
  },
  {
    name: 'float',
    types: ['float8', 'float8'],
    sql: 'a+b',
    values: [
      { kind: 'Value', value: 0n },
      { kind: 'Value', value: 0n },
    ],
    literals: ['0', '0'],
  },
  {
    name: 'decimal',
    types: ['numeric', 'numeric'],
    sql: 'a+b',
    values: [
      { kind: 'Value', value: '0' },
      { kind: 'Value', value: '0' },
    ],
    literals: ['0', '0'],
  },
  {
    name: 'jsonb',
    types: ['jsonb', 'jsonb'],
    sql: 'a||b',
    values: [
      { kind: 'Value', value: '{}' },
      { kind: 'Value', value: '{}' },
    ],
    literals: ["'{}'", "'{}'"],
  },
  {
    name: 'bytes',
    types: ['bytea', 'bytea'],
    sql: 'a||b',
    values: [
      { kind: 'Value', value: '00' },
      { kind: 'Value', value: '00' },
    ],
    literals: ["'\\x00'", "'\\x00'"],
  },
  // Strict SQL-body wrappers skip the emitter guard, so their operations decide NULL themselves.
  ...(['lpad', 'rpad'] as const).map((name) => ({
    name,
    types: ['text', 'int4'] as [string, string],
    sql: `${name}(a,b)`,
    values: [
      { kind: 'Value', value: 'x' },
      { kind: 'Value', value: 3 },
    ] as [Input, Input],
    literals: ["'x'", '3'] as [string, string],
  })),
  {
    name: 'point',
    types: ['point', 'point'],
    sql: 'a~=b',
    values: [
      { kind: 'Value', value: { x: 0n, y: 0n } },
      { kind: 'Value', value: { x: 0n, y: 0n } },
    ],
    literals: ["'(0,0)'", "'(0,0)'"],
  },
  {
    name: 'enum',
    types: ['strict_label', 'strict_label'],
    sql: 'a=b',
    values: [
      { kind: 'Value', value: 0 },
      { kind: 'Value', value: 0 },
    ],
    literals: ["'ready'", "'ready'"],
  },
  {
    name: 'array_length',
    types: ['int[]', 'int'],
    sql: 'array_length(a,b)',
    values: [array, { kind: 'Value', value: 1 }],
    literals: ["'{NULL}'", '1'],
  },
  {
    name: 'record',
    types: ['strict_pair', 'strict_pair'],
    sql: 'a=b',
    values: [record, record],
    literals: ["'(,)'", "'(,)'"],
  },
  {
    name: 'hash',
    types: ['text', 'bigint'],
    sql: 'hashtextextended(a,b)',
    values: [
      { kind: 'Value', value: 'x' },
      { kind: 'Value', value: 0n },
    ],
    literals: ["'x'", '0'],
    context: true,
  },
  {
    name: 'concat',
    types: ['text', 'text'],
    sql: 'concat(a,b)',
    values: [
      { kind: 'Value', value: 'x' },
      { kind: 'Value', value: 'y' },
    ],
    literals: ["'x'", "'y'"],
    nonstrict: true,
  },
  {
    name: 'array_cat',
    types: ['int[]', 'int[]'],
    sql: 'array_cat(a,b)',
    values: [array, array],
    literals: ["'{NULL}'", "'{NULL}'"],
    nonstrict: true,
  },
]

it('uses catalog strictness across scalar and container calls without discarding operand validity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-strict-call-null-'))
  try {
    await pg.exec(
      "CREATE TYPE strict_pair AS (label text,number int);CREATE TYPE strict_label AS ENUM('ready');CREATE DOMAIN positive_input AS int CHECK(VALUE>=0);CREATE DOMAIN required_input AS int NOT NULL",
    )
    const nested = [
      { name: 'padding', sql: 'lpad(t,n/d,u)' },
      { name: 'domain', sql: 'n::positive_input+m' },
      { name: 'required_domain', sql: 'n::required_input+m' },
      { name: 'array', sql: 'array_length(ARRAY[n/d],m)' },
      { name: 'row', sql: 'row_to_json(ROW(t,n))' },
      { name: 'json_array', sql: 'json_build_array(n)' },
      { name: 'json_boolean', sql: 'json_build_array(n<>0)' },
      { name: 'json_array_to', sql: 'array_to_json(ARRAY[n])' },
      { name: 'json_nested', sql: 'row_to_json(ROW(row_to_json(ROW(n))))' },
      { name: 'json_container', sql: 'array_to_json(ARRAY[row_to_json(ROW(n))])' },
      { name: 'json_text', sql: 'row_to_json(ROW(n))::text' },
      { name: 'json_later_key', sql: "json_build_object('first',n,NULL,1)" },
      { name: 'json_key', sql: 'json_build_object(n,1)' },
      { name: 'json_later_context', sql: "row_to_json(ROW(n,decode('01','hex')))" },
      { name: 'json_later_error', sql: 'row_to_json(ROW(n,1/d))' },
      { name: 'literal_null', sql: 'lpad(NULL::text,n/d,u)' },
      // The inlined body translates the escape before substring's own strictness check.
      { name: 'escape_before_null', sql: `substring(t COLLATE "C",u,'xx')` },
    ]
    for (const p of profiles)
      await pg.exec(
        `CREATE TABLE strict_${p.name}(a ${p.types[0]},b ${p.types[1]},bypass bool,CONSTRAINT result CHECK(CASE WHEN bypass THEN true ELSE (${p.sql}) IS NULL END))`,
      )
    await pg.exec(
      `CREATE TABLE strict_nested(t text,u text,n int,m int,d int,bypass bool,${nested.map((f) => `CONSTRAINT "${f.name}" CHECK(CASE WHEN bypass THEN true ELSE (${f.sql}) IS NULL END)`).join(',')})`,
    )
    await pg.exec(
      `CREATE TABLE strict_escape(t text,u text,CHECK(substring(t COLLATE "C",u,'xx') IS NULL))`,
    )
    await expect(pg.exec("INSERT INTO strict_escape VALUES(NULL,'x')")).rejects.toMatchObject({
      code: '22025',
    })
    await pg.exec('INSERT INTO strict_escape VALUES(NULL,NULL)')
    const catalog = await snapshotCatalog(pg)
    const contexts: Record<string, CheckExecutionContext> = {
      declared: {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
        arrayNulls: true,
      },
      absent: {},
    }
    const forms = [
      ...profiles.map((p) => ({
        name: p.name,
        table: 'strict_' + p.name,
        constraint: 'result',
        sql: p.sql,
      })),
      ...nested.map((f) => ({ ...f, table: 'strict_nested', constraint: f.name })),
    ]
    const names: string[] = []
    const groups = Object.entries(contexts).map(([context, settings]) =>
      prepareCheckRustGroup(
        forms.flatMap((f) =>
          (['source', 'stored'] as const).map((origin) => {
            const table = catalog.tables.find((t) => t.name === f.table)!
            const expression = portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((c) => c.name === f.constraint)!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE (${f.sql}) IS NULL END)`
                  : undefined,
              )!.expression,
            )
            expect(hasUncertain(expression), f.name + origin + JSON.stringify(expression)).toBe(
              false,
            )
            const name = context + '_' + f.name + '_' + origin
            names.push(name)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression,
            }
          }),
        ),
        settings,
      ),
    )
    for (const g of groups)
      for (const check of g.checks) expect(check.kind, JSON.stringify(check)).toBe('supported')
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      callables = [...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!))],
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables }),
        requiresRegex: false,
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome, context?: string) => {
      for (const target of context ? [context] : Object.keys(contexts))
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: target + '_' + name + '_' + origin, row, expected })
    }
    for (const p of profiles) {
      for (const [left, right] of [
        [true, true],
        [true, false],
        [false, true],
        [false, false],
      ]) {
        const a = left ? 'NULL' : p.literals[0],
          b = right ? 'NULL' : p.literals[1]
        const value = (
          await pg.query<{ value: boolean }>(
            `SELECT (${p.sql}) IS NULL value FROM (SELECT ${a}::${p.types[0]} a,${b}::${p.types[1]} b) args`,
          )
        ).rows[0]!.value
        const expected: Outcome = { kind: value ? 'True' : 'False' }
        if (!p.nonstrict && (left || right)) expect(value, p.name).toBe(true)
        let code: string | undefined
        try {
          await pg.exec(`INSERT INTO strict_${p.name}(a,b,bypass) VALUES(${a},${b},false)`)
        } catch (cause) {
          code = (cause as { code: string }).code
        }
        expect(code, p.name).toBe(value ? undefined : '23514')
        observations.push({ name: p.name, left, right, expected, code })
        const row = {
          a: left ? nil : p.values[0],
          b: right ? nil : p.values[1],
          bypass: { kind: 'Value', value: false } as Input,
        }
        add(p.name, row, expected, 'declared')
        add(p.name, row, p.context && !left && !right ? { kind: 'Unknown' } : expected, 'absent')
      }
      if (p.nonstrict) continue
      for (const [a, b, expected] of [
        [nil, unknown, { kind: 'True' }],
        [unknown, nil, { kind: 'True' }],
        [unknown, unknown, { kind: 'Unknown' }],
        [error('22003'), nil, error('22003')],
        [nil, error('22012'), error('22012')],
        [unknown, error('22012'), error('22012')],
        [error('22003'), error('22012'), error('22003')],
      ] as [Input, Input, Outcome][]) {
        add(p.name, { a, b, bypass: { kind: 'Value', value: false } }, expected)
        add(p.name, { a, b, bypass: { kind: 'Value', value: true } }, { kind: 'True' })
      }
    }
    for (const f of nested) {
      const base: Row = {
        t: nil,
        u: { kind: 'Value', value: 'x' },
        n: { kind: 'Value', value: 1 },
        m: nil,
        d: { kind: 'Value', value: 0 },
        bypass: { kind: 'Value', value: false },
      }
      if (f.name === 'row' || f.name.startsWith('json_')) {
        for (const n of ['NULL', '1', '-1']) {
          let actual: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean }>(
                `SELECT (${f.sql}) IS NULL AS value FROM (VALUES(NULL::text,'x'::text,${n}::int,NULL::int,0,false)) AS v(t,u,n,m,d,bypass)`,
              )
            ).rows[0]!.value
            actual = { kind: value ? 'True' : 'False' }
          } catch (cause) {
            actual = error((cause as { code: string }).code)
          }
          const expected: Outcome =
            f.name === 'json_later_key' || (f.name === 'json_key' && n === 'NULL')
              ? error('22004')
              : f.name === 'json_later_error'
                ? error('22012')
                : { kind: 'False' }
          expect(actual, f.name + ':' + n).toEqual(expected)
          observations.push({ name: f.name, n, expected })
        }
      }
      const cases: [Row, Outcome][] =
        f.name === 'json_later_key'
          ? [[{ ...base, n: unknown }, error('22004')]]
          : f.name === 'json_key'
            ? [
                [{ ...base, n: unknown }, { kind: 'Unknown' }],
                [{ ...base, n: nil }, error('22004')],
                [base, { kind: 'False' }],
              ]
            : f.name === 'json_later_context'
              ? [[{ ...base, n: unknown }, { kind: 'Unknown' }]]
              : f.name === 'json_later_error'
                ? [
                    [{ ...base, n: unknown }, error('22012')],
                    [{ ...base, n: unknown, d: unknown }, { kind: 'Unknown' }],
                    [{ ...base, n: unknown, d: { kind: 'Value', value: 1 } }, { kind: 'False' }],
                  ]
                : f.name === 'row' || f.name.startsWith('json_')
                  ? [
                      [{ ...base, n: nil }, { kind: 'False' }],
                      [{ ...base, n: unknown }, { kind: 'False' }],
                    ]
                  : f.name === 'domain' || f.name === 'required_domain'
                    ? [
                        [{ ...base, n: unknown }, { kind: 'Unknown' }],
                        [
                          { ...base, n: nil },
                          f.name === 'domain' ? { kind: 'True' } : error('23502'),
                        ],
                        [
                          { ...base, n: { kind: 'Value', value: -1 } },
                          f.name === 'domain' ? error('23514') : { kind: 'True' },
                        ],
                      ]
                    : f.name === 'escape_before_null'
                      ? [
                          [base, error('22025')],
                          [{ ...base, t: unknown }, error('22025')],
                          [{ ...base, u: unknown }, { kind: 'Unknown' }],
                          [{ ...base, u: nil }, { kind: 'True' }],
                          [{ ...base, t: unknown, u: nil }, { kind: 'True' }],
                        ]
                      : f.name === 'literal_null'
                        ? [
                            [base, { kind: 'True' }],
                            [{ ...base, n: unknown }, { kind: 'True' }],
                          ]
                        : [
                            [base, error('22012')],
                            [{ ...base, n: unknown }, { kind: 'Unknown' }],
                            [{ ...base, n: nil }, { kind: 'True' }],
                          ]
      for (const [row, expected] of cases) {
        add(f.name, row, expected)
        add(f.name, { ...row, bypass: { kind: 'Value', value: true } }, { kind: 'True' })
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'observations.json'),
      JSON.stringify(
        { checks: group.checks.length, fixtures: fixtures.length, observations },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'strict_calls', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
