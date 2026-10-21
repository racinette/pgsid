import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { rangeTypeProfile, multirangeTypeProfile } from '../../src/sql-semantics/range-profiles.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('admits composite ranges and multiranges through source/stored text casts, typed rows and record output with native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-sql-'))
  const artifact = 'artifacts/goal-checks/composite-range-sql-active'
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE leaf AS(n int2,label varchar(3) COLLATE "C",phase stage);
CREATE DOMAIN approved AS leaf CHECK((VALUE).n>0);CREATE TYPE span AS RANGE(subtype=leaf);CREATE TYPE domain_span AS RANGE(subtype=approved);
CREATE TYPE array_span AS RANGE(subtype=leaf[]);CREATE TYPE nested_span AS RANGE(subtype=span);
CREATE TYPE child AS(n int4);CREATE TYPE complex AS(n int2,obsolete int4,batch leaf[],period int4range,part child);ALTER TYPE complex DROP ATTRIBUTE obsolete;
CREATE TYPE complex_span AS RANGE(subtype=complex);`)
    const rangeValues = [
      null,
      'empty',
      '(,)',
      '["(1,a,z)","(3,b,a)")',
      '["(,,)","(,,)"]',
      '["(1,,z)",)',
      '(,"(3,b,a)"]',
      '["(3,a,z)","(1,b,a)")',
      '["(1,abcd,z)",)',
      '["(1,a,bad)",)',
      '["(32768,a,z)",)',
      '["(bad,a,z)",)',
      '["(1,a,z,extra)",)',
      '["(0,a,z)","(3,b,a)")',
      'bad',
      '["(1,a,z)","unterminated)',
    ]
    const inputs: Record<string, (string | null)[]> = {
      span: rangeValues,
      domain_span: rangeValues,
      span_multirange: [
        null,
        '{}',
        '{(,)}',
        '{["(1,a,z)","(3,b,a)")}',
        '{["(1,a,z)","(2,a,z)"),["(3,b,a)",)}',
        '{empty}',
        '{["(32768,a,z)",)}',
        '{["(1,a,z)",)}junk',
      ],
      domain_span_multirange: [null, '{}', '{(,)}', '{["(1,a,z)","(3,b,a)")}', '{["(0,a,z)",)}'],
    }
    for (const [type, expression] of Object.entries({
      array_span: `array_span(ARRAY[ROW(1,'a','z')::leaf,NULL],ARRAY[ROW(3,'b','a')::leaf])`,
      nested_span: `nested_span(span(ROW(1,'a','z')::leaf,ROW(2,'b','a')::leaf),span(ROW(3,'a','z')::leaf,NULL))`,
      complex_span: `complex_span(ROW(1,ARRAY[ROW(1,'a','z')::leaf],'[1,4)'::int4range,ROW(2)::child)::complex,ROW(3,ARRAY[ROW(2,'b','a')::leaf],'[2,5)'::int4range,ROW(3)::child)::complex)`,
    })) {
      const value = (await pg.query<{ value: string }>(`SELECT (${expression})::text value`))
        .rows[0]!.value
      inputs[type] = [null, 'empty', '(,)', value, 'bad']
      inputs[type + '_multirange'] = [null, '{}', '{' + value + '}']
    }
    for (const type of Object.keys(inputs))
      for (const mode of ['text', 'typed'])
        await pg.exec(
          `CREATE TABLE gate_${type}_${mode}(payload ${mode === 'text' ? 'text' : type},expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (payload::${type})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
        )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.keys(inputs).flatMap((type) =>
      ['text', 'typed'].flatMap((mode) => {
        const table = catalog.tables.find((t) => t.name === `gate_${type}_${mode}`)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: `${type}_${mode}_${origin}`,
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
            constraint: origin,
          },
        }))
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'sql-plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [type, values] of Object.entries(inputs)) {
      const typedPlan = plans.find((p) => p.name === `${type}_typed_source`)!
      const prepared = group.checks[plans.indexOf(typedPlan)]!
      if (prepared.kind !== 'supported') throw new Error('Missing supported typed check')
      const declared = prepared.inputs.find((i) => i.name === 'payload')!.type
      for (const value of values) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ($1::text::${type})::text value`, [
              value,
            ])
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const mode of ['text', 'typed']) {
          if (mode === 'typed' && error) continue
          let payload: Row[string] = value === null ? { kind: 'Null' } : { kind: 'Value', value }
          if (mode === 'typed' && value !== null) {
            const range = rangeTypeProfile(declared),
              multi = multirangeTypeProfile(declared)
            const owned = range
              ? await readRangeFixture(pg, `SELECT $1::${type} span`, 'span', range.rangeType, [
                  value,
                ])
              : await readMultirangeFixture(pg, multi!.multirangeType, value)
            if (!owned) throw new Error('Missing typed range fixture')
            payload = { kind: 'Value', value: owned }
          }
          for (const bypass of [false, true])
            for (const mismatch of [false, true]) {
              const expectedText = mismatch ? 'wrong' : output
              const code = !bypass ? (error ?? (mismatch ? '23514' : undefined)) : undefined
              const expected: Outcome =
                error && !bypass
                  ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                  : code
                    ? { kind: 'False' }
                    : { kind: 'True' }
              const row: Row = {
                payload,
                expected:
                  expectedText === null ? { kind: 'Null' } : { kind: 'Value', value: expectedText },
                bypass: { kind: 'Value', value: bypass },
              }
              const insert = pg.query(
                `INSERT INTO gate_${type}_${mode} VALUES($1::${mode === 'text' ? 'text' : type},$2,$3)`,
                [value, expectedText, bypass],
              )
              if (code) await expect(insert).rejects.toMatchObject({ code })
              else await insert
              for (const origin of ['source', 'stored'])
                fixtures.push({ name: `${type}_${mode}_${origin}`, row, expected })
              reference.push({ type, mode, value, bypass, mismatch, code })
            }
        }
      }
    }
    await writeFile(join(artifact, 'sql-evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositerangesql',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'sql-report.json'),
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('recovers stored composite range constants without replaying later subtype-domain checks while source literals remain eager', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-stored-'))
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE leaf AS(n int2,phase stage);CREATE DOMAIN approved AS leaf;CREATE TYPE span AS RANGE(subtype=approved);
CREATE TABLE retained(a span);INSERT INTO retained VALUES('["(1,z)","(3,a)")');
CREATE TABLE gate(a span,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE a='["(1,z)","(3,a)")'::span END));
CREATE TABLE constructed(a span,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE span(lower(a),upper(a),'[)')=a END));
ALTER DOMAIN approved ADD CONSTRAINT positive CHECK((VALUE).n>=2) NOT VALID;`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'gate')!,
      constraint = table.constraints.find((c) => c.name === 'valid')!
    const plans = (['source', 'stored'] as const).map((origin) => ({
      name: origin as string,
      expression: lowerTableCheck(
        table,
        constraint,
        catalog.enums,
        catalog.domains,
        origin,
        catalog.rangeTypes,
        catalog.compositeTypeGraph,
      )!.expression,
      identity: { schema: 'public', kind: 'table' as const, owner: 'gate', constraint: origin },
    }))
    const constructed = catalog.tables.find((t) => t.name === 'constructed')!
    for (const origin of ['source', 'stored'] as const)
      plans.push({
        name: 'constructed_' + origin,
        expression: lowerTableCheck(
          constructed,
          constructed.constraints.find((c) => c.name === 'valid')!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
        identity: { schema: 'public', kind: 'table', owner: 'constructed', constraint: origin },
      })
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const c of group.checks) expect(c.kind, JSON.stringify(c)).toBe('supported')
    const prepared = group.checks[1]!
    if (prepared.kind !== 'supported') throw new Error('Missing stored check')
    const type = rangeTypeProfile(prepared.inputs.find((i) => i.name === 'a')!.type)!.rangeType
    const owned = await readRangeFixture(pg, 'SELECT a FROM retained', 'a', type)
    if (!owned) throw new Error('Missing retained row')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const bypass of [false, true]) {
      await pg.query('INSERT INTO gate SELECT a,$1 FROM retained', [bypass])
      await pg.query('INSERT INTO constructed SELECT a,$1 FROM retained', [bypass])
      await expect(
        pg.exec(
          `SELECT CASE WHEN ${bypass} THEN true ELSE NULL::span='["(1,z)","(3,a)")'::span END`,
        ),
      ).rejects.toMatchObject({ code: '23514' })
      const row: Row = {
        a: { kind: 'Value', value: owned },
        bypass: { kind: 'Value', value: bypass },
      }
      fixtures.push(
        { name: 'stored', row, expected: { kind: 'True' } },
        { name: 'constructed_source', row, expected: { kind: 'True' } },
        { name: 'constructed_stored', row, expected: { kind: 'True' } },
        {
          name: 'source',
          row,
          expected: { kind: 'Error', value: { state: parseInt('23514', 36) } },
        },
      )
    }
    await runCheckParity(
      root,
      'compositerangestored',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
