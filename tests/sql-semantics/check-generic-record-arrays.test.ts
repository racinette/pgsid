import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { catalogCompositeType } from '../../src/sql-semantics/composite-profiles.js'
import { readCompositeArrayFixture } from './check-composite-fixtures.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/generic-record-arrays-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

async function matrix(
  label: string,
  ddl: string,
  columns: string,
  keys: string[],
  forms: Record<string, string>,
  samples: readonly (readonly (string | number | boolean | null)[])[],
  deferred: readonly string[] = [],
) {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-generic-record-arrays-' + label + '-'))
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
        nativeByteOrder: 'little',
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
          const expected: Outcome =
              deferred.includes(name) && !bypass
                ? { kind: 'Unknown' }
                : state
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
      'genericrecordarrays',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}

it('retains generic array headers and named element layouts through constructors, casts and record consumers', async () => {
  const first = 'ROW(n,label)::pair',
    second = 'ROW(m,other)::pair',
    needle = 'ROW(n,label COLLATE "C")',
    array = `(ARRAY[${second},${first},NULL::pair])::record[]`,
    selected = `(CASE WHEN pick THEN ARRAY[${first},${second}] ELSE ARRAY[${second},${first}] END)::record[]`
  await matrix(
    'consumers',
    `CREATE TYPE pair AS(n int4,discard json,label text COLLATE "C");ALTER TYPE pair DROP ATTRIBUTE discard;
CREATE TYPE alternate AS(n int4,title text COLLATE "C");CREATE TYPE single AS(n int4);`,
    'n int4,m int4,label text,other text,divisor int4,pick bool',
    ['n', 'm', 'label', 'other', 'divisor', 'pick'],
    {
      constructor: `to_jsonb(${array})`,
      mixed: `to_jsonb((ARRAY[${first},ROW(m,other)::alternate])::record[])`,
      hybrid: `to_jsonb((ARRAY[${first},${needle}])::record[])`,
      selected: `to_jsonb(${selected})`,
      selected_null: `to_jsonb((CASE WHEN pick THEN ARRAY[${first}] ELSE NULL::pair[] END)::record[])`,
      text: `(${array})::text`,
      row_json: `row_to_json((${array})[2])`,
      eq: `record_eq((${array})[2],${needle})`,
      array_eq: `(ARRAY[${first}]::record[])=ARRAY[${needle}]`,
      any: `${needle}=ANY(${array})`,
      all: `${needle}=ALL(${array})`,
      position: `array_position(${array},${needle})`,
      positions: `array_positions(${array},${needle})`,
      remove: `to_jsonb(array_remove(${array},${needle}))`,
      replace: `to_jsonb(array_replace(${array},${needle},(ARRAY[ROW(n+1,label)::alternate]::record[])[1]))`,
      sort: `to_jsonb(array_sort(${array}))`,
      descending: `to_jsonb(array_sort(${array},pick))`,
      larger: `to_jsonb(array_larger(${array},ARRAY[${needle}]))`,
      bucket: `width_bucket(${needle},ARRAY[ROW(0,''::text)::pair,ROW(10,''::text)::pair]::record[])`,
      append: `to_jsonb(array_append(${array},(ARRAY[ROW(n+1,label)::alternate]::record[])[1]))`,
      concat: `to_jsonb(${array}||ARRAY[ROW(n+1,label COLLATE "C")])`,
      multidimensional: `to_jsonb((ARRAY[ARRAY[${first}],ARRAY[${second}]])::record[])`,
      hash: `hash_array(${array})`,
      seeded_hash: `hash_array_extended(${array},-4294967296)`,
      eager: `to_jsonb((ARRAY[ROW(n,1/divisor)::pair])::record[])`,
      mismatch: `(ARRAY[${first}]::record[])=(ARRAY[ROW(m)::single]::record[])`,
      row_null: `(${array})[2] IS NULL`,
      row_present: `(${array})[2] IS NOT NULL`,
    },
    [
      [1, 2, 'x', 'y', 1, true],
      [1, 1, 'x', 'x', 1, false],
      [null, null, null, null, 1, null],
      [2, 1, 'é', '日本', 0, true],
      [-1, 2, 'a,b', 'quote"', 1, false],
      [0, 0, null, '', -1, true],
    ],
  )
}, 600_000)

it('selects native record header callbacks while preserving named-array aliases and reached missing support errors', async () => {
  await matrix(
    'callbacks',
    `CREATE TYPE pair AS(n int4,label text COLLATE "C");CREATE TYPE bad AS(n int4,doc json);
CREATE FUNCTION reverse_pair(pair,pair) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT -btrecordcmp($1,$2)';
CREATE OPERATOR CLASS reversed_pair DEFAULT FOR TYPE pair USING btree AS OPERATOR 1 <(record,record),OPERATOR 2 <=(record,record),OPERATOR 3 =(record,record),OPERATOR 4 >=(record,record),OPERATOR 5 >(record,record),FUNCTION 1 reverse_pair(pair,pair);`,
    'n int4,m int4,label text,pick bool',
    ['n', 'm', 'label', 'pick'],
    {
      generic_sort: 'to_jsonb(array_sort(ARRAY[ROW(n,label)::pair,ROW(m,label)::pair]::record[]))',
      bare_sort: 'to_jsonb(array_sort(ARRAY[ROW(n,label)::pair,ROW(m,label)::pair]))',
      case_alias_sort:
        'to_jsonb(array_sort((CASE WHEN pick THEN ARRAY[ROW(n,label)::pair,ROW(m,label)::pair] ELSE ARRAY[ROW(m,label)::pair,ROW(n,label)::pair] END)::record[]))',
      missing_empty: 'hash_array(ARRAY[]::bad[])',
      generic_empty: 'hash_array(ARRAY[]::record[])',
      missing_null: 'hash_array(ARRAY[NULL::bad])',
      generic_null: 'hash_array(ARRAY[NULL::bad]::record[])',
      generic_fields: 'hash_array(ARRAY[ROW(n,NULL::json)::bad]::record[])',
      extended_empty: 'hash_array_extended(ARRAY[]::record[],n::bigint)',
      extended_null: 'hash_array_extended(NULL::record[],n::bigint)',
      extended_named_alias:
        'hash_array_extended((CASE WHEN pick THEN ARRAY[ROW(n,label)::pair] ELSE ARRAY[ROW(m,label)::pair] END)::record[],0)',
      missing_equal: 'ARRAY[NULL::bad]=ARRAY[NULL::bad]',
      generic_equal: '(ARRAY[NULL::bad]::record[])=(ARRAY[NULL::bad]::record[])',
    },
    [
      [1, 2, 'x', true],
      [2, 1, 'é', false],
      [null, null, null, null],
    ],
    ['bare_sort', 'case_alias_sort'],
  )
}, 600_000)

it('preserves named SQL-coerced array inputs and useful partial generic record structure through aliases', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-generic-record-arrays-inputs-'))
  try {
    await pg.exec('CREATE TYPE pair AS(n int4,label text COLLATE "C")')
    const forms = {
      document: 'to_jsonb(a::record[])',
      text: '(a::record[])::text',
      shape: 'array_dims(a::record[])',
      extended: 'hash_array_extended(a::record[],0)',
      selected: 'to_jsonb((CASE WHEN pick THEN a ELSE b END)::record[])',
      quantifier: 'ROW(n,label)::pair=ANY(a::record[])',
      generic_count: 'cardinality(ARRAY[ROW(n,label)::pair]::record[])',
      generic_sort_count:
        'cardinality(array_sort(ARRAY[ROW(n,label)::pair,ROW(n,label)::pair]::record[]))',
      generic_extended: 'hash_array_extended(ARRAY[ROW(n,label)::pair]::record[],0)',
    }
    const sql = (body: string) =>
      `CASE WHEN bypass THEN true ELSE (${body})::text IS NOT DISTINCT FROM expected END`
    for (const [name, body] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE inputs_${name}(a pair[],b pair[],n int4,label text,pick bool,expected text,bypass bool,CHECK(${sql(body)}))`,
      )
    await pg.exec(
      'CREATE TEMP TABLE inputs(a pair[],b pair[],n int4,label text,pick bool,expected text,bypass bool)',
    )
    const c = await snapshotCatalog(pg),
      element = catalogCompositeType('public.pair', c.compositeTypeGraph)!,
      plans = Object.entries(forms).flatMap(([name, body]) => {
        const t = c.tables.find((t) => t.name === 'inputs_' + name)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: t.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              t,
              t.constraints[0]!,
              [],
              [],
              origin,
              c.rangeTypes,
              c.compositeTypeGraph,
              origin === 'source' ? `CHECK(${sql(body)})` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
        nativeByteOrder: 'little',
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    group.checks.forEach((check) =>
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported'),
    )
    const samples = [
      null,
      '{}',
      '{"(1,x)"}',
      '{"(1,x)",NULL}',
      '[-2:-1]={"(2,y)","(1,x)"}',
      '{{"(1,x)",NULL},{"(2,y)","(,)"}}',
    ]
    for (const [aIndex, a] of samples.entries())
      for (const variant of [0, 1, 2]) {
        const b = samples[(aIndex + 1) % samples.length]!,
          pick = aIndex % 2 === 0,
          bypass = variant === 2
        await pg.exec('DELETE FROM inputs')
        await pg.query("INSERT INTO inputs VALUES($1,$2,1,'x',$3,NULL,$4)", [a, b, pick, bypass])
        const values: Row = {
          a: { kind: 'Null' },
          b: { kind: 'Null' },
          n: known(1),
          label: known('x'),
          pick: known(pick),
          bypass: known(bypass),
        }
        for (const name of ['a', 'b']) {
          const value = await readCompositeArrayFixture(pg, 'SELECT * FROM inputs', name, element)
          values[name] = value === null ? { kind: 'Null' } : { kind: 'Value', value }
        }
        for (const [name, body] of Object.entries(forms)) {
          await pg.exec('UPDATE inputs SET expected=NULL')
          try {
            await pg.exec(
              `UPDATE inputs SET expected=${variant === 1 ? "'wrong'" : `(${body})::text`}`,
            )
          } catch {}
          const expectedText = (
            await pg.query<{ v: string | null }>('SELECT expected v FROM inputs')
          ).rows[0]!.v
          let value: boolean | null = null,
            state: string | undefined,
            failure: string | undefined
          try {
            value = (await pg.query<{ v: boolean | null }>(`SELECT ${sql(body)} v FROM inputs`))
              .rows[0]!.v
          } catch (e) {
            state = (e as { code: string }).code
          }
          try {
            await pg.exec(`INSERT INTO inputs_${name} SELECT * FROM inputs`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          const expected: Outcome = state
            ? { kind: 'Error', value: { state: parseInt(state, 36) } }
            : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...values, expected: known(expectedText) },
              expected,
            })
          references.push({ name, a, b, pick, variant, expectedText, state, failure })
        }
      }
    const base: Row = {
        a: known(null),
        b: known(null),
        n: known(1),
        label: known('x'),
        pick: known(true),
        expected: known('1'),
        bypass: known(false),
      },
      unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const add = (name: string, patch: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push(
          { name: name + '_' + origin, row: { ...base, ...patch }, expected },
          {
            name: name + '_' + origin,
            row: { ...base, ...patch, bypass: known(true) },
            expected: { kind: 'True' },
          },
        )
    }
    add('generic_count', { n: unknown, label: unknown }, { kind: 'True' })
    add(
      'generic_count',
      { n: unknown, label: error },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    )
    add(
      'generic_sort_count',
      { n: unknown, label: unknown, expected: known('2') },
      { kind: 'True' },
    )
    add(
      'generic_extended',
      { n: unknown, label: unknown },
      { kind: 'Error', value: { state: parseInt('42883', 36) } },
    )
    add(
      'generic_extended',
      { n: error },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    )
    add('document', { a: unknown }, { kind: 'Unknown' })
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/inputs-reference.json',
      JSON.stringify(
        { nativeInserts: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'genericrecordarrays',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
