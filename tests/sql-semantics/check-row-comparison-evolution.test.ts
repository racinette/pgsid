import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('preserves expanded named row comparisons through type evolution, lazy scalar evaluation and native coercions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-comparison-evolution-')),
    artifact = 'artifacts/goal-checks/row-comparison-evolution-active'
  try {
    await pg.exec(`CREATE TYPE pair AS(a int4,old int4);CREATE TYPE head AS(old int4,a int4);
CREATE TYPE vpair AS(a int4,old varchar(2) COLLATE "C");CREATE TYPE apair AS(a int4,old int4[]);
CREATE TYPE jpair AS(a int4,old jsonb);CREATE TYPE npair AS(a int4,old numeric);
CREATE TYPE phase AS ENUM('z','a');CREATE TYPE epair AS(a int4,old phase);
CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE dpair AS(a int4,old positive);
CREATE TYPE cwidth AS(n int4,label char(2) COLLATE "C");`)
    const distinct = 'ROW(n,n/d)::pair IS DISTINCT FROM ROW(m,m/d)::pair',
      same = 'ROW(n,n/d)::pair IS NOT DISTINCT FROM ROW(m,m/d)::pair',
      forms: Record<string, string> = {
        distinct,
        same,
        constructor_width: `to_jsonb(ROW(n,label)::cwidth) IS NOT DISTINCT FROM jsonb_build_object('n',n,'label',rpad(label,2,' '))`,
        equal: 'ROW(n,n/d)::pair = ROW(m,m/d)::pair',
        inlist: 'ROW(n,n/d)::pair IN (ROW(m,m/d)::pair,ROW(0,1)::pair)',
        notin: 'ROW(n,n/d)::pair NOT IN (ROW(m,m/d)::pair,ROW(0,1)::pair)',
        head: 'ROW(n/d,n)::head IS DISTINCT FROM ROW(m/d,m)::head',
        head_in: 'ROW(n/d,n)::head IN(ROW(m/d,m)::head,ROW(1,0)::head)',
        width: `ROW(n,label)::vpair IS DISTINCT FROM ROW(m,'ab')::vpair`,
        array: 'ROW(n,ARRAY[n/d,1])::apair IS DISTINCT FROM ROW(m,ARRAY[m/d,1])::apair',
        document: "ROW(n,label::jsonb)::jpair IS DISTINCT FROM ROW(m,'{}'::jsonb)::jpair",
        mixed_numeric: 'ROW(n,label::numeric)::pair IS DISTINCT FROM ROW(m,label::numeric)::npair',
        numeric: 'ROW(n,1.25)::npair IS DISTINCT FROM ROW(m,1.250)::npair',
        tag: `ROW(n,'z')::epair IS DISTINCT FROM ROW(m,'a')::epair`,
        domain: 'ROW(n,n::positive)::dpair IS DISTINCT FROM ROW(m,m::positive)::dpair',
        boolean: `(${distinct}) IS TRUE`,
        json: `to_jsonb(${distinct})='true'::jsonb`,
        count: `cardinality(ARRAY[${distinct}])=1`,
        field: `(ROW((${distinct}),label)).f2 IS NULL`,
        lazy_right: `pick OR (${distinct})`,
        lazy_left: `(${distinct}) OR pick`,
        lazy_and: `(${same}) AND pick`,
        repeated: `(${distinct}) OR (${same})`,
        prepared: 'ROW(n,1/0)::pair IS DISTINCT FROM ROW(m,1)::pair',
        pruned:
          'CASE WHEN true THEN true ELSE ROW(n,1/0)::pair IS DISTINCT FROM ROW(m,1)::pair END',
        constant_pruned: 'ROW(1,1/0)::pair IS DISTINCT FROM ROW(2,1)::pair',
      }
    for (const [name, expression] of Object.entries(forms)) {
      await pg.exec(`CREATE TABLE evolving_${name}(n int4,m int4,d int4,label text COLLATE "C",pick bool,bypass bool,
        CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${expression} END))`)
      await pg.exec(`CREATE TABLE null_${name}(n int4,m int4,d int4,label text COLLATE "C",pick bool,bypass bool,
        CONSTRAINT valid CHECK((CASE WHEN bypass THEN true ELSE ${expression} END) IS NULL))`)
    }
    await pg.exec(`ALTER TYPE pair DROP ATTRIBUTE old;ALTER TYPE head DROP ATTRIBUTE old;
ALTER TYPE vpair DROP ATTRIBUTE old;ALTER TYPE apair DROP ATTRIBUTE old;ALTER TYPE jpair DROP ATTRIBUTE old;
ALTER TYPE npair DROP ATTRIBUTE old;ALTER TYPE epair DROP ATTRIBUTE old;ALTER TYPE dpair DROP ATTRIBUTE old;ALTER TYPE cwidth ALTER ATTRIBUTE label TYPE char(3);`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'evolving_' + name)!,
          constraint = table.constraints[0]!
        expect(constraint.rowCoercionContext?.complete ?? true, name).toBe(true)
        expect(JSON.stringify(constraint.rowCoercionContext ?? null)).not.toMatch(/"\w*oid\w*":/iu)
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    for (const [i, p] of plans.entries()) {
      expect(uncertain(p.expression), p.name).toBe(false)
      expect(group.checks[i]!.kind, p.name).toBe('supported')
    }
    const known = (value: number | string | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = [],
      samples = [
        { n: 1, m: 2, d: 0, label: 'bad', pick: true },
        { n: 1, m: 1, d: 0, label: '{}', pick: false },
        { n: 1, m: 1, d: 1, label: 'abc', pick: true },
        { n: null, m: null, d: 0, label: null, pick: true },
        { n: -1, m: 1, d: 1, label: '{"a":1}', pick: false },
        { n: -1, m: -1, d: 1, label: '{}', pick: true },
        { n: 0, m: 1, d: 0, label: 'ab', pick: null },
        { n: 2, m: 2, d: null, label: '{}', pick: false },
        { n: 1, m: 1, d: 1, label: '1.25', pick: true },
        { n: 1, m: 1, d: 1, label: '2147483648', pick: false },
      ]
    for (const [name] of Object.entries(forms))
      for (const sample of samples)
        for (const bypass of [false, true]) {
          let error: string | undefined,
            checkViolation = false
          try {
            await pg.query(`INSERT INTO evolving_${name} VALUES($1,$2,$3,$4,$5,$6)`, [
              sample.n,
              sample.m,
              sample.d,
              sample.label,
              sample.pick,
              bypass,
            ])
          } catch (e) {
            error = (e as { code: string }).code
            checkViolation =
              error === '23514' && (e as { constraint: string }).constraint === 'valid'
          }
          let nullResult = false
          if (!error) {
            try {
              await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3,$4,$5,$6)`, [
                sample.n,
                sample.m,
                sample.d,
                sample.label,
                sample.pick,
                bypass,
              ])
              nullResult = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          }
          const expected: Outcome = error
              ? checkViolation
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: nullResult ? 'Null' : 'True' },
            row: Row = {
              n: known(sample.n),
              m: known(sample.m),
              label: known(sample.label),
              d: known(sample.d),
              pick: known(sample.pick),
              bypass: known(bypass),
            }
          reference.push({ name, ...sample, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
    for (const [name] of Object.entries(forms))
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            m: { kind: 'Unknown' },
            label: { kind: 'Unknown' },
            d: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            pick: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: name.startsWith('prepared')
            ? { kind: 'Error', value: { state: parseInt('22012', 36) } }
            : { kind: 'True' },
        })
      }
    await writeFile(
      join(artifact, 'native-reference.json'),
      JSON.stringify(reference, null, 2) + '\n',
    )
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-comparison-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('preserves source JSONPath graphs outside prebound historical comparisons', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-comparison-provenance-')),
    artifact = 'artifacts/goal-checks/row-comparison-evolution-active'
  try {
    const expression = `CASE WHEN bypass THEN true ELSE
      (ROW(n,n/d)::pair IS NOT DISTINCT FROM ROW(m,m/d)::pair)
      AND jsonb_path_match('{"x":-1}'::jsonb,'((-$.x).abs()) == 1'::jsonpath) END`,
      source = `CHECK(${expression})`
    await pg.exec(
      `CREATE TYPE pair AS(n int4,old int4);CREATE TABLE history(n int4,m int4,d int4,bypass bool,CONSTRAINT valid ${source});ALTER TYPE pair DROP ATTRIBUTE old`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'history')!,
      constraint = table.constraints[0]!,
      plans = (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: 'history',
          constraint: origin,
        },
        expression: lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? source : undefined,
        )!.expression,
      })),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const check of group.checks) expect(check.kind).toBe('supported')
    for (const [n, m, d, bypass] of [
      [1, 1, 1, false],
      [1, 2, 0, false],
      [1, 1, 0, false],
      [1, 1, 0, true],
    ] as const) {
      let error: string | undefined
      try {
        await pg.query('INSERT INTO history VALUES($1,$2,$3,$4)', [n, m, d, bypass])
      } catch (e) {
        error = (e as { code: string }).code
      }
      const expected: Outcome = error
          ? error === '23514'
            ? { kind: 'False' }
            : { kind: 'Error', value: { state: parseInt(error, 36) } }
          : { kind: 'True' },
        row: Row = {
          n: { kind: 'Value', value: n },
          m: { kind: 'Value', value: m },
          d: { kind: 'Value', value: d },
          bypass: { kind: 'Value', value: bypass },
        }
      native.push({ n, m, d, bypass, expected })
      // The stored JSONPath constant decodes from its binary graph, so the stored check no
      // longer depends on re-reading the path text and agrees with PostgreSQL.
      fixtures.push({ name: 'source', row, expected }, { name: 'stored', row, expected })
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'source-provenance.json'),
      JSON.stringify({ native, plans, fixtures }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'example.com/row-comparison-provenance',
      group,
      ['source', 'stored'],
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
