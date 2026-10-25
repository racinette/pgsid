import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/anonymous-record-coercions-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

async function matrix(
  label: string,
  ddl: string,
  columns: string,
  keys: string[],
  forms: Record<string, string>,
  samples: readonly (readonly (string | number | boolean | null)[])[],
) {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-record-coercion-' + label + '-'))
  try {
    await pg.exec(ddl)
    const check = (body: string) =>
      `CASE WHEN bypass THEN true ELSE (${body})::text IS NOT DISTINCT FROM expected END`
    for (const [name, body] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(${columns},expected text,bypass bool,CHECK(${check(body)}))`,
      )
    await pg.exec(`CREATE TEMP TABLE inputs(${columns},expected text,bypass bool)`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${check(body)})` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/' + label + '-preparation.json',
      JSON.stringify(group.checks, null, 2) + '\n',
    )
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    group.checks.forEach((c, i) =>
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    for (const sample of samples)
      for (const variant of [0, 1, 2]) {
        const bypass = variant === 2
        await pg.exec('DELETE FROM inputs')
        await pg.query(
          `INSERT INTO inputs VALUES(${sample.map((_, i) => '$' + (i + 1)).join(',')},NULL,$${sample.length + 1})`,
          [...sample, bypass],
        )
        for (const [name, body] of Object.entries(forms)) {
          await pg.exec('UPDATE inputs SET expected=NULL')
          try {
            await pg.exec(
              `UPDATE inputs SET expected=${variant === 1 ? "'wrong'" : `(${body})::text`}`,
            )
          } catch {}
          const expectedText = (
            await pg.query<{ expected: string | null }>('SELECT expected FROM inputs')
          ).rows[0]!.expected
          let value: boolean | null = null,
            state: string | undefined,
            failure: string | undefined
          try {
            value = (await pg.query<{ v: boolean | null }>(`SELECT ${check(body)} v FROM inputs`))
              .rows[0]!.v
          } catch (e) {
            state = (e as { code: string }).code
          }
          try {
            await pg.exec(`INSERT INTO gate_${name} SELECT * FROM inputs`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          const expected: Outcome = state
              ? { kind: 'Error', value: { state: parseInt(state, 36) } }
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            row: Row = Object.fromEntries([
              ...keys.map((key, i) => [key, known(sample[i]!)]),
              ['expected', known(expectedText)],
              ['bypass', known(bypass)],
            ])
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          references.push({ name, sample, variant, expectedText, value, state, failure })
        }
      }
    await writeFile(
      packet + '/' + label + '-reference.json',
      JSON.stringify(
        { nativeInserts: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'anonymousrecordcoercions',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}

it('uses shared anonymous record input and array grammar for text casts, NULL elements, bounds and error order', async () => {
  await matrix(
    'input',
    '',
    'source text,other text,n int4',
    ['source', 'other', 'n'],
    {
      record_null: '(source::record) IS NULL',
      record_json: 'to_jsonb(source::record)',
      array_json: 'to_jsonb(source::record[])',
      array_text: '(source::record[])::text',
      array_dims: 'array_dims(source::record[])',
      array_count: 'cardinality(source::record[])',
      array_any: 'ROW(n)=ANY(source::record[])',
      array_all: 'ROW(n)=ALL(source::record[])',
      array_remove: 'to_jsonb(array_remove(source::record[],NULL::record))',
      array_position: 'array_position(source::record[],NULL::record)',
      array_equal: '(source::record[])=(other::record[])',
      array_nested: 'to_jsonb(ROW(n,source::record[]))',
      array_varchar: 'to_jsonb((source::varchar)::record[])',
      array_bpchar: 'to_jsonb((source::char(20))::record[])',
      literal_empty: "to_jsonb('{}'::record[])",
      literal_nulls: "to_jsonb('[0:1]={NULL,NULL}'::record[])",
    },
    [
      [null, null, null],
      ['{}', '{}', 1],
      ['{NULL}', '{NULL}', 2],
      ['[0:1]={NULL,NULL}', '{NULL,NULL}', 1],
      ['{{NULL,NULL},{NULL,NULL}}', '{}', 1],
      ['{{}}', '{}', 1],
      ['{null,NULL}', '{NULL}', null],
      ['{"NULL"}', '{}', 1],
      ['{"(1,x)"}', '{}', 1],
      ['bad', '{x}', 1],
      ['{NULL,}', '{}', 1],
      ['[1:2]={NULL}', '{}', 1],
      ['{{NULL},{NULL,NULL}}', '{}', 1],
      ['{NULL} trailing', '{}', 1],
      [' { NULL } ', '{}', 1],
      ['[2147483647:2147483647]={NULL}', '{NULL}', 1],
    ],
  )
}, 600_000)

it('preserves named record identity, domains, projections and stars through explicit record aliases', async () => {
  await matrix(
    'aliases',
    `CREATE TYPE pair AS(n int4,discard json,label text COLLATE "C");ALTER TYPE pair DROP ATTRIBUTE discard;
CREATE DOMAIN guarded AS pair CHECK((VALUE).n>=0);`,
    'n int4,m int4,label text,other text,pick bool',
    ['n', 'm', 'label', 'other', 'pick'],
    {
      json: 'to_jsonb((ROW(n,label)::pair)::record)',
      text: '((ROW(n,label)::pair)::record)::text',
      field: '((ROW(n,label)::pair)::record).n',
      star: 'to_jsonb(ROW(((ROW(n,label)::pair)::record).*))',
      eq: 'record_eq((ROW(n,label)::pair)::record,ROW(m,other)::pair)',
      array: 'to_jsonb(ARRAY[((ROW(n,label)::pair)::record)])',
      nested: 'to_jsonb(ROW((ROW(n,label)::pair)::record,ARRAY[n,m]))',
      domain: 'to_jsonb((ROW(n,label)::guarded)::record)',
      selected: 'to_jsonb((CASE WHEN pick THEN ROW(n,label)::pair ELSE NULL::pair END)::record)',
      anonymous_text: 'ARRAY[ROW(n,label),ROW(m,other)]::text',
      heterogeneous_text: 'ARRAY[ROW(n,label),ROW(other,m)]::text',
      nested_text: 'ARRAY[ROW(ROW(n,label),ARRAY[n,m])]::text',
      unknown_text: "ARRAY[ROW(n,'constant',NULL)]::text",
      unknown_xml: "xmlelement(NAME node,ROW(n,'constant',NULL))::text",
    },
    [
      [1, 2, 'x', 'y', true],
      [1, 1, 'x', 'x', false],
      [null, null, null, null, null],
      [-1, 1, 'é', '日本', true],
      [0, 0, null, 'x', true],
      [null, 1, '', '', false],
    ],
  )
}, 600_000)

it('preserves partial record inputs, eager errors, constant input preparation and selected branches', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-record-coercion-state-'))
  try {
    const forms = {
      record: '(source::record) IS NULL',
      array: 'cardinality(source::record[])=1',
      any: 'ROW(n)=ANY(source::record[])',
      selected: 'CASE WHEN pick THEN true ELSE (source::record) IS NULL END',
      arithmetic: '((n/divisor)::text::record) IS NULL',
    }
    for (const [name, body] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE state_${name}(source text,n int4,divisor int4,pick bool,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE ${body} END))`,
      )
    await pg.exec('CREATE TABLE constants(bypass bool,CHECK(true))')
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'state_' + name)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              table.constraints[0]!,
              [],
              [],
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source'
                ? `CHECK(CASE WHEN bypass THEN true ELSE ${body} END)`
                : undefined,
            )!.expression,
          ),
        }))
      })
    const constants = {
      scalar: "CASE WHEN bypass THEN true ELSE ('bad'::record) IS NULL END",
      pruned: "CASE WHEN true THEN true ELSE ('bad'::record) IS NULL END",
      array: "CASE WHEN bypass THEN true ELSE cardinality('{x}'::record[])=1 END",
      prefix: "CASE WHEN bypass THEN true ELSE cardinality('{x,}'::record[])=1 END",
      syntax: "CASE WHEN bypass THEN true ELSE cardinality('{NULL,}'::record[])=1 END",
    }
    const references: unknown[] = []
    for (const [name, body] of Object.entries(constants)) {
      let state: string | undefined
      try {
        await pg.exec(`CREATE TABLE reject_${name}(bypass bool,CHECK(${body}))`)
      } catch (e) {
        state = (e as { code: string }).code
      }
      expect(state).toBe(name === 'syntax' ? '22P02' : '0A000')
      const table = catalog.tables.find((t) => t.name === 'constants')!
      plans.push({
        identity: {
          schema: 'public',
          kind: 'table',
          owner: table.name,
          constraint: 'constant_' + name,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints[0]!,
            [],
            [],
            'source',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            `CHECK(${body})`,
          )!.expression,
        ),
      })
      references.push({ name, preparationState: state })
    }
    const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const base: Row = {
        source: known(null),
        n: known(1),
        divisor: known(1),
        pick: known(false),
        bypass: known(false),
      },
      unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const add = (name: string, patch: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored']) {
        fixtures.push(
          { name: name + '_' + origin, row: { ...base, ...patch }, expected },
          {
            name: name + '_' + origin,
            row: { ...base, ...patch, bypass: known(true) },
            expected: { kind: 'True' },
          },
        )
      }
    }
    add('record', { source: unknown }, { kind: 'Unknown' })
    add('record', { source: error }, { kind: 'Error', value: { state: parseInt('22012', 36) } })
    add('record', { source: known(null) }, { kind: 'True' })
    add('array', { source: unknown }, { kind: 'Unknown' })
    add('array', { source: error }, { kind: 'Error', value: { state: parseInt('22012', 36) } })
    add('array', { source: known(null) }, { kind: 'Null' })
    add('any', { source: known('{}'), n: unknown }, { kind: 'False' })
    add('any', { source: known('{NULL}'), n: unknown }, { kind: 'Null' })
    add(
      'any',
      { source: known(null), n: error },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    )
    add('selected', { source: error, pick: known(true) }, { kind: 'True' })
    add('selected', { source: error, pick: unknown }, { kind: 'Unknown' })
    add(
      'arithmetic',
      { divisor: known(0) },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    )
    add('arithmetic', { n: unknown }, { kind: 'Unknown' })
    for (const name of Object.keys(constants))
      for (const bypass of [true, false])
        fixtures.push({
          name: 'constant_' + name,
          row: { bypass: known(bypass) },
          expected: {
            kind: 'Error',
            value: { state: parseInt(name === 'syntax' ? '22P02' : '0A000', 36) },
          },
        })
    for (const [name, source, n, divisor, pick] of [
      ['record', null, 1, 1, false],
      ['record', 'x', 1, 1, false],
      ['array', '{NULL}', 1, 1, false],
      ['any', '{}', 1, 1, false],
      ['arithmetic', 'x', 1, 0, false],
      ['selected', 'x', 1, 1, true],
    ] as const) {
      let failure: string | undefined
      try {
        await pg.query(`INSERT INTO state_${name} VALUES($1,$2,$3,$4,false)`, [
          source,
          n,
          divisor,
          pick,
        ])
      } catch (e) {
        failure = (e as { code: string }).code
      }
      expect(failure).toBe(
        name === 'record' && source !== null
          ? '0A000'
          : name === 'any'
            ? '23514'
            : name === 'arithmetic'
              ? '22012'
              : undefined,
      )
      references.push({ name, source, n, divisor, pick, failure })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/state-reference.json',
      JSON.stringify(
        { nativeControls: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'anonymousrecordcoercions',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('uses explicit array_nulls context for runtime anonymous record-array input', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-record-coercion-context-'))
  try {
    await pg.exec('CREATE TABLE setting(source text,CHECK(cardinality(source::record[])=1))')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'setting')!,
      plans = (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints[0]!,
            [],
            [],
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        ),
      })),
      references: unknown[] = []
    for (const nulls of [true, false, undefined]) {
      const group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          ...(nulls === undefined ? {} : { arrayNulls: nulls }),
        }),
        fixtures: { name: string; row: Row; expected: Outcome }[] = []
      group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
      for (const source of [
        null,
        '{}',
        '{NULL}',
        '{null}',
        '{"NULL"}',
        '{x}',
        '{NULL,x}',
        '{x,NULL}',
        '{NULL,}',
      ]) {
        const alternatives: Outcome[] = []
        for (const setting of [true, false]) {
          await pg.exec('SET array_nulls=' + setting)
          let failure: string | undefined
          try {
            await pg.query('INSERT INTO setting VALUES($1)', [source])
          } catch (e) {
            failure = (e as { code: string }).code
          }
          const expected: Outcome =
            failure && failure !== '23514'
              ? { kind: 'Error', value: { state: parseInt(failure, 36) } }
              : { kind: source === null ? 'Null' : failure ? 'False' : 'True' }
          alternatives.push(expected)
          references.push({ nulls, setting, source, failure })
        }
        const expected: Outcome =
          nulls === undefined
            ? JSON.stringify(alternatives[0]) === JSON.stringify(alternatives[1])
              ? alternatives[0]!
              : { kind: 'Unknown' }
            : alternatives[nulls ? 0 : 1]!
        for (const name of ['source', 'stored'])
          fixtures.push({ name, row: { source: known(source) }, expected })
      }
      const target = join(root, String(nulls))
      await mkdir(target)
      await runCheckParity(
        target,
        'anonymousrecordcoercions',
        group,
        ['source', 'stored'],
        fixtures,
      )
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/context-reference.json',
      JSON.stringify({ nativeInserts: references.length, fixtures: 54, references }, null, 2) +
        '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
