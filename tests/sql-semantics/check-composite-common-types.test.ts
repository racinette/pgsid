import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readCompositeFixture, readCompositeArrayFixture } from './check-composite-fixtures.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('resolves inherited row common types and compatible-array elements without inventing array-value casts', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-common-types-')),
    artifact = 'artifacts/goal-checks/composite-inherited-arrays-active'
  try {
    await pg.exec(`CREATE TABLE ancestor(n int4,old int4,label text COLLATE "C");ALTER TABLE ancestor DROP COLUMN old;
      CREATE TABLE descendant(extra int4,label text COLLATE "C",n int4);ALTER TABLE descendant INHERIT ancestor;
      CREATE TABLE leaf(tail int4) INHERITS(descendant);
      CREATE DOMAIN checked_child AS descendant CHECK((VALUE).extra>=0);
      CREATE DOMAIN checked_parent AS ancestor CHECK((VALUE).n>=0);`)
    const forms: Record<string, { sql: string; eager?: boolean }> = {
        selected: { sql: '(CASE WHEN pick THEN c ELSE p END).n>=1' },
        reversed: { sql: '(CASE WHEN pick THEN p ELSE c END).n>=1' },
        transitive: { sql: '(CASE WHEN pick THEN g ELSE p END).n>=1' },
        coalesce: { sql: '(COALESCE(c,p)).n>=1' },
        coalesce_reversed: { sql: '(COALESCE(p,c)).n>=1' },
        greatest: { sql: '(GREATEST(c,p)).n>=1' },
        least: { sql: '(LEAST(c,p)).n>=1' },
        source_domain: { sql: '(COALESCE(c::checked_child,p)).n>=1' },
        selected_domain: { sql: '(CASE WHEN pick THEN c::checked_child ELSE p END).n>=1' },
        constructor_error: {
          sql: '(CASE WHEN pick THEN ROW(n/divisor,label,n)::descendant ELSE p END).n>=1',
        },
        prepared: {
          sql: '(CASE WHEN pick THEN ROW(1/0,label,n)::descendant ELSE p END).n>=1',
          eager: true,
        },
        pruned: { sql: '(CASE WHEN false THEN ROW(1/0,label,n)::descendant ELSE p END).n>=1' },
        literal: { sql: "(COALESCE(c,p,'(1,x)')).n>=1" },
        literal_minmax: { sql: "(GREATEST(c,p,'(1,x)')).n>=1" },
        constructed: { sql: 'cardinality(ARRAY[c,p])=2' },
        explicit_array: { sql: 'ARRAY[c]::ancestor[] IS NOT DISTINCT FROM ARRAY[c::ancestor]' },
        domain_array: { sql: 'ARRAY[c::ancestor]::checked_parent[] IS NOT NULL' },
        multidimensional: { sql: "(to_jsonb(ARRAY[ARRAY[c,p],ARRAY[p,c]])#>>'{0,0,n}')::int4>=1" },
        array_common: { sql: 'ARRAY[c,p] IS NOT DISTINCT FROM ARRAY[c::ancestor,p]' },
        append: { sql: 'array_append(ps,c) IS NOT DISTINCT FROM array_append(ps,c::ancestor)' },
        prepend: { sql: 'array_prepend(c,ps) IS NOT DISTINCT FROM array_prepend(c::ancestor,ps)' },
        append_operator: { sql: '(ps||c) IS NOT DISTINCT FROM (ps||c::ancestor)' },
        prepend_operator: { sql: '(c||ps) IS NOT DISTINCT FROM (c::ancestor||ps)' },
        quantified: { sql: 'c=ANY(ps)' },
        position: {
          sql: 'array_position(ps,c) IS NOT DISTINCT FROM array_position(ps,c::ancestor)',
        },
        positions: {
          sql: 'array_positions(ps,c) IS NOT DISTINCT FROM array_positions(ps,c::ancestor)',
        },
        remove: { sql: 'array_remove(ps,c) IS NOT DISTINCT FROM array_remove(ps,c::ancestor)' },
        replace: {
          sql: 'array_replace(ps,c,p) IS NOT DISTINCT FROM array_replace(ps,c::ancestor,p)',
        },
        bucket: { sql: 'width_bucket(c,ps)>=0' },
        raw_comparison: { sql: 'c=p' },
        raw_distinct: { sql: 'c IS NOT DISTINCT FROM p' },
        raw_nullif: { sql: 'to_jsonb(NULLIF(c,p)) IS NOT NULL' },
        legacy: { sql: 'to_jsonb(array_fill(c,ARRAY[1])) IS NOT NULL' },
        json: {
          sql: 'to_jsonb(COALESCE(c,p)) IS NOT DISTINCT FROM to_jsonb(COALESCE(c::ancestor,p))',
        },
        text: {
          sql: '(COALESCE(c,p))::text COLLATE "C" IS NOT DISTINCT FROM (COALESCE(c::ancestor,p))::text COLLATE "C"',
        },
      },
      columns =
        'c descendant,p ancestor,g leaf,ps ancestor[],n int4,label text COLLATE "C",divisor int4,pick bool,bypass bool'
    for (const [name, f] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${f.sql} END))`,
      )
    await pg.exec(`CREATE TABLE oracle(${columns})`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, f]) => {
        const t = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = t.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            t,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.sql} END)` : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      typeOf = (name: string) => {
        const c = group.checks.find(
          (c) => c.kind === 'supported' && c.inputs.some((i) => i.name === name),
        )!
        if (c.kind !== 'supported') throw Error('Missing input ' + name)
        return c.inputs.find((i) => i.name === name)!.type
      }
    for (const [i, p] of plans.entries()) {
      expect(uncertain(p.expression), p.name).toBe(false)
      expect(group.checks[i]!.kind, p.name).toBe('supported')
    }
    const known = (value: number | string | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      samples = [
        {
          c: 'NULL::descendant',
          p: 'NULL::ancestor',
          g: 'NULL::leaf',
          ps: 'NULL::ancestor[]',
          n: null,
          label: null,
          divisor: 0,
          pick: true,
        },
        {
          c: 'ROW(NULL,NULL,NULL)::descendant',
          p: "ROW(9,'x')::ancestor",
          g: 'ROW(NULL,NULL,NULL,NULL)::leaf',
          ps: 'ARRAY[]::ancestor[]',
          n: 0,
          label: '',
          divisor: 0,
          pick: false,
        },
        {
          c: "ROW(3,'ok',3)::descendant",
          p: "ROW(3,'ok')::ancestor",
          g: "ROW(7,'ok',3,99)::leaf",
          ps: '\'[0:1]={"(1,a)","(3,ok)"}\'::ancestor[]',
          n: 3,
          label: 'ok',
          divisor: 1,
          pick: true,
        },
        {
          c: "ROW(-1,'snow😊',-1)::descendant",
          p: "ROW(4,'x')::ancestor",
          g: "ROW(7,'x',4,99)::leaf",
          ps: "ARRAY[NULL::ancestor,ROW(-1,'snow😊')::ancestor]",
          n: -1,
          label: 'snow😊',
          divisor: 0,
          pick: false,
        },
      ],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const s of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(`INSERT INTO oracle SELECT ${s.c},${s.p},${s.g},${s.ps},$1,$2,$3,$4,false`, [
        s.n,
        s.label,
        s.divisor,
        s.pick,
      ])
      const c = await readCompositeFixture(pg, 'SELECT c FROM oracle', 'c', typeOf('c')),
        p = await readCompositeFixture(pg, 'SELECT p FROM oracle', 'p', typeOf('p')),
        g = await readCompositeFixture(pg, 'SELECT g FROM oracle', 'g', typeOf('g')),
        ps = await readCompositeArrayFixture(
          pg,
          'SELECT ps FROM oracle',
          'ps',
          typeOf('ps').slice(6),
        ),
        row: Row = {
          c: c ? { kind: 'Value', value: c } : known(null),
          p: p ? { kind: 'Value', value: p } : known(null),
          g: g ? { kind: 'Value', value: g } : known(null),
          ps: ps ? { kind: 'Value', value: ps } : known(null),
          n: known(s.n),
          label: known(s.label),
          divisor: known(s.divisor),
          pick: known(s.pick),
        }
      for (const [name, f] of Object.entries(forms)) {
        let value: boolean | null = null,
          error: string | undefined
        try {
          value = (
            await pg.query<{ value: boolean | null }>('SELECT ' + f.sql + ' value FROM oracle')
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const bypass of [false, true]) {
          const expected: Outcome =
              (error && f.eager) || (!bypass && error)
                ? { kind: 'Error', value: { state: parseInt(error!, 36) } }
                : bypass
                  ? { kind: 'True' }
                  : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            code =
              expected.kind === 'Error' ? error : expected.kind === 'False' ? '23514' : undefined,
            insert = pg.query(
              `INSERT INTO gate_${name} SELECT c,p,g,ps,n,label,divisor,pick,$1 FROM oracle`,
              [bypass],
            )
          if (code) await expect(insert).rejects.toMatchObject({ code })
          else await insert
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, bypass: known(bypass) },
              expected,
            })
          reference.push({ name, sample: s, bypass, expected })
        }
      }
      if (p && s.n === 3)
        for (const origin of ['source', 'stored']) {
          const partial: Row = {
            ...row,
            c: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            pick: known(false),
            bypass: known(false),
          }
          fixtures.push({ name: 'selected_' + origin, row: partial, expected: { kind: 'True' } })
          fixtures.push({
            name: 'coalesce_reversed_' + origin,
            row: partial,
            expected: { kind: 'True' },
          })
          fixtures.push({
            name: 'selected_' + origin,
            row: { ...partial, pick: { kind: 'Unknown' } },
            expected: { kind: 'Unknown' },
          })
        }
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'compositecommontypes',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'report.json'),
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
}, 300_000)
