import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  goParityModule,
  runCheckParity,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const input = (value: string | boolean | number | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

it('compares captured records with ordered support lookup, declared field identity, NULL ordering and nested values', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-comparison-'))
  try {
    await pg.exec(`CREATE TYPE pair AS(n int4,label text COLLATE "C");
CREATE TYPE dropped AS(n int4,old_value json,label text COLLATE "C");ALTER TYPE dropped DROP ATTRIBUTE old_value;
CREATE TYPE short AS(n int4);CREATE TYPE wide AS(n int4,label text COLLATE "C",extra json);
CREATE TYPE bigint_pair AS(n int8,label text COLLATE "C");CREATE TYPE number_pair AS(n int4,label int4);
CREATE TYPE document AS(n int4,value json);CREATE TYPE default_pair AS(n int4,label text);
CREATE TYPE nested AS(value pair,n int4);CREATE TYPE bags AS(n int4,values int4[]);
CREATE TYPE stage AS ENUM('z','a');CREATE TYPE stages AS(n stage,values stage[]);
CREATE TYPE floats AS(n float8,value numeric);CREATE TYPE no_fields AS();`)
    const cases: { left: string; right: string; rows: [string | null, string | null][] }[] = [
      {
        left: 'pair',
        right: 'pair',
        rows: [
          [null, null],
          [null, '(1,x)'],
          ['(,)', '(,)'],
          ['(,x)', '(1,x)'],
          ['(1,)', '(1,x)'],
          ['(1,x)', '(2,a)'],
          ['(1,x)', '(1,y)'],
          ['(1,x)', '(1,x)'],
        ],
      },
      {
        left: 'dropped',
        right: 'pair',
        rows: [
          ['(,)', '(,)'],
          ['(1,x)', '(1,x)'],
          ['(1,x)', '(2,x)'],
          ['(,x)', '(1,x)'],
        ],
      },
      {
        left: 'short',
        right: 'pair',
        rows: [
          ['(1)', '(2,x)'],
          ['(1)', '(1,x)'],
          ['()', '(,x)'],
        ],
      },
      {
        left: 'wide',
        right: 'pair',
        rows: [
          ['(1,x,)', '(2,x)'],
          ['(1,x,)', '(1,x)'],
          ['(1,y,)', '(1,x)'],
        ],
      },
      {
        left: 'pair',
        right: 'bigint_pair',
        rows: [
          ['(1,x)', '(2,x)'],
          ['(,)', '(,)'],
          [null, '(1,x)'],
        ],
      },
      {
        left: 'pair',
        right: 'number_pair',
        rows: [
          ['(1,x)', '(2,2)'],
          ['(1,)', '(1,)'],
          ['(1,x)', '(1,1)'],
        ],
      },
      {
        left: 'document',
        right: 'document',
        rows: [
          ['(1,)', '(2,)'],
          ['(1,)', '(1,)'],
          ['(1,1)', '(1,2)'],
        ],
      },
      {
        left: 'pair',
        right: 'default_pair',
        rows: [
          ['(1,x)', '(2,x)'],
          ['(1,)', '(1,)'],
          ['(1,x)', '(1,x)'],
          ['(1,x)', '(1,y)'],
        ],
      },
      {
        left: 'nested',
        right: 'nested',
        rows: [
          ['("(1,x)",2)', '("(1,x)",2)'],
          ['("(,x)",2)', '("(1,x)",2)'],
          ['(,1)', '(,2)'],
          ['("(1,x)",2)', '("(1,y)",1)'],
        ],
      },
      {
        left: 'bags',
        right: 'bags',
        rows: [
          ['(1,"{1,NULL}")', '(1,"{1,2}")'],
          ['(1,"{}")', '(1,"{}")'],
          ['(1,)', '(1,"{}")'],
          ['(1,"[0:1]={1,2}")', '(1,"{1,2}")'],
        ],
      },
      {
        left: 'stages',
        right: 'stages',
        rows: [
          ['(z,"{a,z}")', '(a,"{z,a}")'],
          ['(z,"{z,NULL}")', '(z,"{z,a}")'],
          ['(,)', '(,)'],
        ],
      },
      {
        left: 'floats',
        right: 'floats',
        rows: [
          ['(NaN,1.00)', '(NaN,1.0)'],
          ['(-0,NaN)', '(0,Infinity)'],
          ['(Infinity,1)', '(NaN,1)'],
        ],
      },
      {
        left: 'no_fields',
        right: 'no_fields',
        rows: [
          ['()', '()'],
          [null, '()'],
        ],
      },
    ]
    const forms = [
      ...['=', '<>', '<', '<=', '>', '>='].map((op) => ({
        name: op,
        expression: (l: string, r: string) => `lhs::${l} ${op} rhs::${r}`,
      })),
      {
        name: 'function',
        expression: (l: string, r: string) => `pg_catalog.record_eq(lhs::${l},rhs::${r})`,
      },
      {
        name: 'comparator',
        expression: (l: string, r: string) =>
          `pg_catalog.btrecordcmp(lhs::${l},rhs::${r}) IS NOT DISTINCT FROM expected_cmp`,
      },
    ]
    for (const [i, c] of cases.entries())
      for (const [j, form] of forms.entries())
        await pg.exec(
          `CREATE TABLE gate_${i}_${j}(lhs text,rhs text,expected_cmp int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.expression(c.left, c.right)} END))`,
        )
    const catalog = await snapshotCatalog(pg),
      plans = cases.flatMap((_case, i) =>
        forms.flatMap((_form, j) => {
          const table = catalog.tables.find((t) => t.name === `gate_${i}_${j}`)!,
            constraint = table.constraints.find((c) => c.name === 'valid')!
          return (['source', 'stored'] as const).map((origin) => ({
            name: `gate_${i}_${j}_${origin}`,
            expression: lowerTableCheck(
              table,
              constraint,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: origin as string,
            },
          }))
        }),
      )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [i, c] of cases.entries())
      for (const [lhs, rhs] of c.rows) {
        let cmp: number | null = null
        try {
          cmp = (
            await pg.query<{ value: number | null }>(
              `SELECT pg_catalog.btrecordcmp($1::text::${c.left},$2::text::${c.right}) value`,
              [lhs, rhs],
            )
          ).rows[0]!.value
        } catch {}
        for (const [j, form] of forms.entries())
          for (const bypass of [false, true]) {
            let expected: Outcome, error: string | undefined
            try {
              expected = outcome(
                (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT CASE WHEN bypass THEN true ELSE ${form.expression(c.left, c.right)} END value FROM(SELECT $1::text lhs,$2::text rhs,$3::int4 expected_cmp,$4::bool bypass)s`,
                    [lhs, rhs, cmp, bypass],
                  )
                ).rows[0]!.value,
              )
            } catch (e) {
              error = (e as { code: string }).code
              expected = { kind: 'Error', value: { state: parseInt(error, 36) } }
            }
            const insert = pg.query(`INSERT INTO gate_${i}_${j} VALUES($1,$2,$3,$4)`, [
              lhs,
              rhs,
              cmp,
              bypass,
            ])
            if (error || expected.kind === 'False')
              await expect(insert).rejects.toMatchObject({ code: error ?? '23514' })
            else await insert
            reference.push({
              left: c.left,
              right: c.right,
              form: form.name,
              lhs,
              rhs,
              bypass,
              cmp,
              expected,
            })
            const row: Row = {
              lhs: input(lhs),
              rhs: input(rhs),
              expected_cmp: input(cmp),
              bypass: input(bypass),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: `gate_${i}_${j}_${origin}`, row, expected })
          }
      }
    await mkdir('artifacts/composite-comparison', { recursive: true })
    await writeFile('artifacts/composite-comparison/plans.json', JSON.stringify(plans, null, 2))
    await writeFile('artifacts/composite-comparison/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositecomparison',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-comparison/report.json',
      JSON.stringify(
        { nativeInserts: reference.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('composes record comparisons through selection, NULLIF, distinctness, row/list expressions, domains and eager literals', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-comparison-compose-'))
  try {
    await pg.exec(`CREATE TYPE pair AS(n int4,label text COLLATE "C");CREATE DOMAIN approved_pair AS pair CHECK((VALUE).n>=0);
CREATE TYPE pair_bags AS(n int4,values pair[]);CREATE TYPE spans AS(n int4,value int4range,values int4multirange);
CREATE TYPE documents AS(n int4,value jsonb);CREATE TYPE widths AS(n int4,label char(3));`)
    const forms = {
      distinct: 'lhs::pair IS DISTINCT FROM rhs::pair',
      not_distinct: 'lhs::pair IS NOT DISTINCT FROM rhs::pair',
      nullif_datum: 'NULLIF(lhs::pair,rhs::pair) IS DISTINCT FROM NULL',
      nullif_field: '(NULLIF(lhs::pair,rhs::pair)).n IS NULL',
      greatest: 'GREATEST(lhs::pair,rhs::pair) IS NOT DISTINCT FROM lhs::pair',
      least: 'LEAST(lhs::pair,rhs::pair) IS NOT DISTINCT FROM lhs::pair',
      coalesce: 'COALESCE(lhs::pair,rhs::pair)=rhs::pair',
      selected: '(CASE WHEN x>0 THEN lhs::pair ELSE rhs::pair END)=lhs::pair',
      simple_case: 'CASE lhs::pair WHEN rhs::pair THEN true ELSE false END',
      row_order: 'ROW(lhs::pair,x)<ROW(rhs::pair,1)',
      row_equality: 'ROW(lhs::pair,x)=ROW(rhs::pair,1)',
      members: "lhs::pair IN(rhs::pair,'(2,z)'::pair)",
      constructor: 'ROW(x,label)::pair<lhs::pair',
      approval: 'lhs::approved_pair=rhs::pair',
      record_arrays:
        'ROW(1,ARRAY[lhs::pair,NULL::pair])::pair_bags=ROW(1,ARRAY[rhs::pair,NULL::pair])::pair_bags',
      range_fields:
        "ROW(x,'[1,3)'::int4range,'{[1,3)}'::int4multirange)::spans>ROW(1,'[0,1)'::int4range,'{}'::int4multirange)::spans",
      jsonb_fields: `ROW(x,'{"a":1.0}'::jsonb)::documents<=ROW(1,'{"b":1}'::jsonb)::documents`,
      bpchar_fields: "ROW(x,label::char(3))::widths=ROW(1,'a'::char(3))::widths",
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(lhs text,rhs text,x int4,label text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(
      'CREATE TABLE unavailable_literal(lhs text,rhs text,x int4,label text,bypass bool)',
    )
    const catalog = await snapshotCatalog(pg),
      plans = Object.keys(forms).flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          c = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          expression: lowerTableCheck(
            table,
            c,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin as string,
          },
        }))
      })
    const anonymousTable = catalog.tables.find((t) => t.name === 'unavailable_literal')!
    for (const [name, sql] of Object.entries({
      anonymous: "CASE WHEN bypass THEN true ELSE lhs::pair='(1,x)' END",
      anonymous_unreachable: "CASE WHEN true THEN true ELSE lhs::pair='(1,x)' END",
      eager_input: "CASE WHEN bypass THEN true ELSE ('(2147483648,x)'::pair)='(1,x)'::pair END",
      constant_comparison: "CASE WHEN bypass THEN true ELSE '(1,x)'::pair='(1,x)'::pair END",
    }))
      plans.push({
        name,
        expression: lowerTableCheck(
          anonymousTable,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          'source',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
        identity: { schema: 'public', kind: 'table', owner: anonymousTable.name, constraint: name },
      })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    const rows: [string | null, string | null, number | null, string | null][] = [
      [null, null, null, null],
      [null, '(1,a)', 1, 'a'],
      ['(,)', '(,)', null, null],
      ['(1,a)', '(1,a)', 1, 'a '],
      ['(1,x)', '(2,z)', 1, 'x'],
      ['(2,z)', '(1,x)', -1, 'abcd'],
      ['(-1,x)', '(1,x)', 2, '雪'],
      ['(2147483648,x)', '(1,x)', 0, 'x'],
    ]
    const evaluate = async (
      sql: string,
      row: (typeof rows)[number],
      bypass: boolean,
    ): Promise<Outcome> => {
      await pg.exec('TRUNCATE unavailable_literal')
      await pg.query('INSERT INTO unavailable_literal VALUES($1,$2,$3,$4,$5)', [...row, bypass])
      try {
        return outcome(
          (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) value FROM unavailable_literal`,
            )
          ).rows[0]!.value,
        )
      } catch (e) {
        return { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } }
      }
    }
    for (const [name, sql] of Object.entries(forms))
      for (const row of rows)
        for (const bypass of [false, true]) {
          const expected = await evaluate(
              `CASE WHEN bypass THEN true ELSE ${sql} END`,
              row,
              bypass,
            ),
            insert = pg.query(`INSERT INTO gate_${name} VALUES($1,$2,$3,$4,$5)`, [...row, bypass])
          if (expected.kind === 'False' || expected.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code:
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : '23514',
            })
          else await insert
          const values: Row = {
            lhs: input(row[0]),
            rhs: input(row[1]),
            x: input(row[2]),
            label: input(row[3]),
            bypass: input(bypass),
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row: values, expected })
          reference.push({ name, row, bypass, expected })
        }
    for (const [name, sql] of Object.entries({
      anonymous: "CASE WHEN bypass THEN true ELSE lhs::pair='(1,x)' END",
      anonymous_unreachable: "CASE WHEN true THEN true ELSE lhs::pair='(1,x)' END",
      eager_input: "CASE WHEN bypass THEN true ELSE ('(2147483648,x)'::pair)='(1,x)'::pair END",
      constant_comparison: "CASE WHEN bypass THEN true ELSE '(1,x)'::pair='(1,x)'::pair END",
    }))
      for (const bypass of [false, true]) {
        const row: [string, null, number, string] = ['(1,x)', null, 1, 'x'],
          expected = await evaluate(sql, row, bypass)
        fixtures.push({
          name,
          row: {
            lhs: input(row[0]),
            rhs: input(null),
            x: input(1),
            label: input('x'),
            bypass: input(bypass),
          },
          expected,
        })
        reference.push({ name, bypass, expected })
      }
    await mkdir('artifacts/composite-comparison-compose', { recursive: true })
    await writeFile(
      'artifacts/composite-comparison-compose/plans.json',
      JSON.stringify(plans, null, 2),
    )
    await writeFile('artifacts/composite-comparison-compose/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositecomparisoncompose',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/composite-comparison-compose/report.json',
      JSON.stringify({ fixtures: fixtures.length, reference }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('defers reached selected callbacks while preserving NULL, empty-array and earlier-field skips', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-comparison-callbacks-'))
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');
CREATE FUNCTION stage_equal(stage,stage) RETURNS bool LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'custom equality';END$$;
CREATE FUNCTION stage_compare(stage,stage) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'custom ordering';END$$;`)
    for (const [name, symbol] of [
      ['less', '<'],
      ['less_equal', '<='],
      ['greater_equal', '>='],
      ['greater', '>'],
    ] as const)
      await pg.exec(
        `CREATE FUNCTION stage_${name}(stage,stage) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT stage_compare($1,$2) ${symbol} 0'`,
      )
    for (const [name, fn] of [
      ['<', 'less'],
      ['<=', 'less_equal'],
      ['=', 'equal'],
      ['>=', 'greater_equal'],
      ['>', 'greater'],
    ] as const)
      await pg.exec(
        `CREATE OPERATOR public.${name}(LEFTARG=stage,RIGHTARG=stage,FUNCTION=stage_${fn})`,
      )
    await pg.exec(`CREATE OPERATOR CLASS stage_ops DEFAULT FOR TYPE stage USING btree AS OPERATOR 1 public.<,OPERATOR 2 public.<=,OPERATOR 3 public.=,OPERATOR 4 public.>=,OPERATOR 5 public.>,FUNCTION 1 stage_compare(stage,stage);
CREATE TYPE callback_row AS(n int4,value stage,values stage[]);
CREATE TABLE equality(lhs text,rhs text,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE lhs::callback_row=rhs::callback_row END));
CREATE TABLE ordering(lhs text,rhs text,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE lhs::callback_row<rhs::callback_row END));`)
    const catalog = await snapshotCatalog(pg),
      plans = ['equality', 'ordering'].flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === name)!,
          constraint = table.constraints.find((c) => c.type === 'check')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: name,
            constraint: origin as string,
          },
        }))
      })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, JSON.stringify({ plan: plans[i]!.name, c })).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    const rows: [string | null, string | null][] = [
      ['(1,z,"{z}")', '(2,a,"{a}")'],
      ['(1,,)', '(1,,)'],
      ['(1,,"{}")', '(1,,"{}")'],
      ['(1,,"{NULL}")', '(1,,"{NULL}")'],
      ['(1,z,)', '(1,a,)'],
      ['(1,,"{z}")', '(1,,"{a}")'],
      ['(1,,"{}")', '(1,,"{z}")'],
      [null, '(1,z,)'],
    ]
    for (const name of ['equality', 'ordering'])
      for (const [lhs, rhs] of rows)
        for (const bypass of [false, true]) {
          let expected: Outcome, nativeError: string | undefined
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN $3::bool THEN true ELSE $1::text::callback_row ${name === 'equality' ? '=' : '<'} $2::text::callback_row END value`,
                  [lhs, rhs, bypass],
                )
              ).rows[0]!.value,
            )
          } catch (e) {
            nativeError = (e as { code: string }).code
            expect(nativeError).toBe('P0001')
            expected = { kind: 'Unknown' }
          }
          const insert = pg.query(`INSERT INTO ${name} VALUES($1,$2,$3)`, [lhs, rhs, bypass])
          if (nativeError || expected.kind === 'False')
            await expect(insert).rejects.toMatchObject({ code: nativeError ?? '23514' })
          else await insert
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { lhs: input(lhs), rhs: input(rhs), bypass: input(bypass) },
              expected,
            })
          reference.push({ name, lhs, rhs, bypass, nativeError, expected })
        }
    expect(fixtures.some((f) => f.expected.kind === 'Unknown')).toBe(true)
    await runCheckParity(
      root,
      'compositecomparisoncallbacks',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await mkdir('artifacts/composite-comparison-callbacks', { recursive: true })
    await writeFile(
      'artifacts/composite-comparison-callbacks/report.json',
      JSON.stringify({ fixtures: fixtures.length, reference }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)

it('owns comparison frames and preserves unavailable runtime states before field dispatch', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-composite-comparison-states-'))
  try {
    const error = parseInt('22003', 36),
      mismatch = parseInt('42804', 36),
      undefinedFunction = parseInt('42883', 36)
    const probes: { rust: string; expected: Outcome }[] = [
      { rust: 'record_frame_snapshot()', expected: { kind: 'True' } },
      {
        rust: 'record_frame_state(CompositeValue::Unknown,CompositeValue::Null,"public.pair",0)',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'record_frame_state(CompositeValue::Null,CompositeValue::Unknown,"public.pair",0)',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'record_frame_state(CompositeValue::Null,CompositeValue::Null,"public.pair",0)',
        expected: { kind: 'Null' },
      },
      {
        rust: `record_frame_state(CompositeValue::Null,CompositeValue::Error(make_sql_error(${error})),"public.pair",0)`,
        expected: { kind: 'Error', value: { state: error } },
      },
      {
        rust: `record_frame_state(CompositeValue::Error(make_sql_error(${error})),CompositeValue::Unknown,"public.pair",0)`,
        expected: { kind: 'Error', value: { state: error } },
      },
      {
        rust: 'record_frame_state(make_composite_fields("public.other"),make_composite_fields("public.pair"),"public.pair",0)',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'record_frame_state(make_composite_fields("public.pair"),make_composite_fields("public.pair"),"public.pair",1)',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'record_frame_state(make_composite_fields("public.pair"),make_composite_fields("public.pair"),"public.pair",-1)',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'sql__pg_catalog__record_eq__rc7m(record_comparison_pair(ArrayElement::Unknown,ArrayElement::Null,true,1,true))',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'sql__pg_catalog__record_eq__rc7m(record_comparison_pair(ArrayElement::Null,ArrayElement::Null,true,-1,true))',
        expected: { kind: 'Unknown' },
      },
      {
        rust: 'sql__pg_catalog__record_eq__rc7m(record_comparison_pair(ArrayElement::Null,ArrayElement::Null,true,0,true))',
        expected: { kind: 'Error', value: { state: undefinedFunction } },
      },
      {
        rust: 'sql__pg_catalog__record_eq__rc7m(record_comparison_pair(ArrayElement::Null,ArrayElement::Null,false,0,true))',
        expected: { kind: 'Error', value: { state: mismatch } },
      },
      { rust: 'record_frame_tail(Int4Value::Unknown)', expected: { kind: 'Unknown' } },
      { rust: 'record_frame_tail(make_int4_value(1))', expected: { kind: 'False' } },
      {
        rust: 'record_frame_tail(make_int4_value(0))',
        expected: { kind: 'Error', value: { state: mismatch } },
      },
    ]
    const helper = `
fn record_frame_state(left:CompositeValue,right:CompositeValue,name:&str,count:i32)->BoolValue {
 let frame=prepare_record_comparison(left,right,name,name,count,count);
 sql__pg_catalog__record_eq__rc7m(array_comparison_initial(&frame))
}
fn record_frame_tail(result:Int4Value)->BoolValue {
 let right=append_composite_field(make_composite_fields("public.right"),ArrayElement::Null);
 let frame=prepare_record_comparison(make_composite_fields("public.left"),right,"public.left","public.right",0,1);
 sql__pg_catalog__record_eq__rc7m(finish_record_comparison(&frame,result))
}
fn record_frame_snapshot()->BoolValue {
 let nested=append_composite_field(make_composite_fields("public.child"),ArrayElement::Int4(7));
 let left=append_composite_field(make_composite_fields("public.pair"),array_element_from_composite(nested));
 let frame=prepare_record_comparison(left.clone(),left,"public.pair","public.pair",1,1);let saved=frame.clone();
 let cell=frame.left[0].clone();if let ArrayElement::Composite(value)=cell {let mut fields=value.fields;fields[0]=ArrayElement::Int4(99);};
 let mut left_fields=frame.left;left_fields[0]=ArrayElement::Unknown;
 let mut right_fields=frame.right;right_fields[0]=ArrayElement::Null;
 let left_cell=array_element_to_composite(array_comparison_element_at(&saved,make_int4_value(0),false));
 let right_cell=array_element_to_composite(array_comparison_element_at(&saved,make_int4_value(0),true));
 let a=array_element_to_int4(composite_field_at(left_cell,make_int4_value(0)));
 let b=array_element_to_int4(composite_field_at(right_cell,make_int4_value(0)));
 if let Int4Value::Value(x)=a {if let Int4Value::Value(y)=b {return make_bool_value(x==7&&y==7);};};BoolValue::Unknown
}
pub fn record_frame_kept(input:ArrayComparisonPayload)->ArrayComparisonPayload {input.clone()}
pub fn record_frame_probe(mode:Int4Value)->BoolValue {if let Int4Value::Value(n)=mode {${probes.map((p, i) => `if n==${i}{return ${p.rust};};`).join('\n')}};BoolValue::Unknown}
`
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'record_frame',
        constraint: 'states',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=record_frame_probe(mode);check_from_bool(result)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/record_frame_states.rs', source: helper })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    await mkdir(join(root, 'go/pg_catalog'), { recursive: true })
    await writeFile(
      join(root, 'go/pg_catalog/record_frame_boundary_test.go'),
      `package pg_catalog
import (
 "testing"
 . "${goParityModule}/checkruntime"
)
func TestRecordFrameOwnsInputs(t *testing.T) {
 original:=CompositeValue{Kind:CompositeValueValue,Value:CompositePayload{TypeName:"public.pair",Fields:[]ArrayElement{{Kind:ArrayElementComposite,Composite:CompositePayload{TypeName:"public.child",Fields:[]ArrayElement{{Kind:ArrayElementInt4,Int4:7}}}}}}}
 frame:=PrepareRecordComparison(original,original,"public.pair","public.pair",1,1)
 original.Value.Fields[0].Composite.Fields[0].Int4=99
 saved:=RecordFrameKept(frame)
 frame.Left[0].Composite.Fields[0].Int4=42
 frame.Right[0]=ArrayElement{Kind:ArrayElementNull}
 if saved.Left[0].Composite.Fields[0].Int4!=7||saved.Right[0].Composite.Fields[0].Int4!=7 {t.Fatal("record comparison frame aliases nested storage")}
}
`,
    )
    await runCheckParity(
      root,
      'recordframestates',
      group,
      ['record_frame'],
      probes.map((p, i) => ({
        name: 'record_frame',
        row: { mode: { kind: 'Value', value: i } },
        expected: p.expected,
      })),
    )
    const operations = await import(
      pathToFileURL(join(root, 'typescript/pg_catalog/operations.ts')).href
    )
    const original = {
      kind: 'Value',
      value: {
        typeName: 'public.pair',
        fields: [
          {
            kind: 'Composite',
            value: { typeName: 'public.child', fields: [{ kind: 'Int4', value: 7 }] },
          },
        ],
      },
    }
    const frame = operations.prepareRecordComparison(
      original,
      original,
      'public.pair',
      'public.pair',
      1,
      1,
    )
    original.value.fields[0]!.value.fields[0]!.value = 99
    const saved = operations.recordFrameKept(frame)
    frame.left[0].value.fields[0].value = 42
    frame.right[0] = { kind: 'Null' }
    expect(saved.left[0].value.fields[0].value).toBe(7)
    expect(saved.right[0].value.fields[0].value).toBe(7)
    await mkdir('artifacts/composite-comparison-states', { recursive: true })
    await writeFile(
      'artifacts/composite-comparison-states/report.json',
      JSON.stringify(
        { fixtures: probes.length, nestedFrameSnapshots: true, publicBoundaryCopies: true },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
