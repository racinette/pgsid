import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves native domain checks and row conversion choices through descriptor and domain changes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-native-coercions-')),
    artifact = 'artifacts/goal-checks/row-native-coercions-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE DOMAIN required AS positive NOT NULL CHECK(VALUE<=10);
      CREATE DOMAIN short_label AS varchar(3) COLLATE "C" CHECK(VALUE<>'');
      CREATE DOMAIN rounded AS numeric(4,1) CHECK(VALUE>0);
      CREATE DOMAIN counts AS int4[] CHECK(cardinality(VALUE)>0);
      CREATE TYPE stage AS ENUM('a','b');CREATE DOMAIN active_stage AS stage CHECK(VALUE<>'b'::stage);
      CREATE DOMAIN span AS int4range CHECK(lower(VALUE)>=0);
      CREATE DOMAIN check_first AS int4 CONSTRAINT b_division CHECK(1/VALUE>0) CONSTRAINT a_positive CHECK(VALUE>0);
      CREATE DOMAIN division_first AS int4 CONSTRAINT b_positive CHECK(VALUE>0) CONSTRAINT a_division CHECK(1/VALUE>0);
      CREATE TABLE parent_value(n int4,label text COLLATE "C");CREATE TABLE child_value(d int4) INHERITS(parent_value);
      CREATE DOMAIN parent_domain AS parent_value CHECK((VALUE).n>=0);
      CREATE TABLE detached_parent(n int4);CREATE TABLE detached_child(d int4) INHERITS(detached_parent);
      CREATE TABLE bad_parent(n int4);CREATE TABLE bad_child(d int4) INHERITS(bad_parent);
      CREATE TABLE empty_parent(n int4);CREATE TABLE empty_child(d int4) INHERITS(empty_parent);
      CREATE TYPE declared_value AS(n int4,label text COLLATE "C");CREATE TABLE typed_value OF declared_value;`)
    const definitions = [
        { name: 'domain', type: 'positive', value: 'n::positive' },
        { name: 'domain_relabel', type: 'int4', value: 'n::positive::int4' },
        { name: 'required', type: 'required', value: 'n::required' },
        { name: 'division', type: 'positive', value: '(n/d)::positive' },
        { name: 'short_label', type: 'short_label', value: 'label::short_label' },
        { name: 'rounded', type: 'rounded', value: 'label::rounded' },
        { name: 'array_domain', type: 'counts', value: 'ARRAY[n,d]::counts' },
        { name: 'array_relabel', type: 'int4[]', value: 'ARRAY[n,d]::counts::int4[]' },
        {
          name: 'enum_domain',
          type: 'active_stage',
          value: `(CASE WHEN pick THEN 'a'::stage ELSE 'b'::stage END)::active_stage`,
        },
        {
          name: 'enum_relabel',
          type: 'stage',
          value: `(CASE WHEN pick THEN 'a'::stage ELSE 'b'::stage END)::active_stage::stage`,
        },
        { name: 'range_domain', type: 'span', value: `int4range(n,d,'[]')::span` },
        { name: 'range_relabel', type: 'int4range', value: `int4range(n,d,'[]')::span::int4range` },
        { name: 'domain_array', type: 'positive[]', value: 'ARRAY[n::positive,d::positive]' },
        { name: 'array_domain_coercion', type: 'positive[]', value: 'ARRAY[n,d]::positive[]' },
        { name: 'array_domain_relabel', type: 'int4[]', value: 'ARRAY[n,d]::positive[]::int4[]' },
        {
          name: 'row_array',
          type: 'parent_value[]',
          value: 'ARRAY[ROW(n,label,1/d)::child_value]::parent_value[]',
        },
        { name: 'check_order', type: 'int4', value: 'n::check_first::int4' },
        { name: 'division_order', type: 'int4', value: 'n::division_first::int4' },
        { name: 'already_coerced', type: 'int4', value: `lower('[1,3)'::positive_span)::int4` },
        {
          name: 'recheck',
          type: 'positive',
          value: `lower('[1,3)'::positive_span)::int4::positive`,
        },
        { name: 'row', type: 'parent_value', value: 'ROW(n,label,1/d)::child_value::parent_value' },
        {
          name: 'row_field',
          type: 'int4',
          value: '(ROW(n,label,1/d)::child_value::parent_value).n',
        },
        {
          name: 'row_null',
          type: 'parent_value',
          value:
            '(CASE WHEN pick THEN NULL::child_value ELSE ROW(n,label,1/d)::child_value END)::parent_value',
        },
        {
          name: 'row_domain',
          type: 'parent_domain',
          value: 'ROW(n,label,1/d)::child_value::parent_value::parent_domain',
        },
        {
          name: 'row_relabel',
          type: 'parent_value',
          value: 'ROW(n,label,1/d)::child_value::parent_value::parent_domain::parent_value',
        },
        {
          name: 'detached',
          type: 'detached_parent',
          value: 'ROW(n,1/d)::detached_child::detached_parent',
        },
        { name: 'bad_row', type: 'bad_parent', value: 'ROW(n/d,1)::bad_child::bad_parent' },
        {
          name: 'bad_null',
          type: 'bad_parent',
          value: '(CASE WHEN pick THEN NULL::bad_child ELSE ROW(n/d,1)::bad_child END)::bad_parent',
        },
        { name: 'bad_literal', type: 'bad_parent', value: `('(1,2)'::bad_child)::bad_parent` },
        { name: 'empty_row', type: 'empty_parent', value: 'ROW(n/d,1)::empty_child::empty_parent' },
        {
          name: 'typed_row',
          type: 'declared_value',
          value: 'ROW(n,label)::typed_value::declared_value',
        },
        { name: 'prepared', type: 'positive', value: '(1/0)::positive' },
        {
          name: 'pruned',
          type: 'positive',
          value: 'CASE WHEN true THEN n::positive ELSE (1/0)::positive END',
        },
      ],
      forms = definitions.flatMap((f) => {
        const row = `ROW(n,${f.value})::r_${f.name}`
        return [
          ['present', `${row} IS NOT NULL`],
          ['project', `(${row}).n>=1`],
          ['json', `to_jsonb(${row}) IS NOT DISTINCT FROM jsonb_build_object('n',n)`],
        ].map(([consumer, expression]) => ({
          ...f,
          name: f.name + '_' + consumer,
          family: f.name,
          expression,
        }))
      })
    for (const f of definitions) await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,old ${f.type})`)
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,label text,pick bool,bypass bool,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    for (const f of definitions) await pg.exec(`ALTER TYPE r_${f.name} DROP ATTRIBUTE old`)
    await pg.exec(`ALTER DOMAIN positive ADD CHECK(VALUE>=2);ALTER DOMAIN required ADD CHECK(VALUE<=5);
      ALTER TYPE stage RENAME VALUE 'a' TO 'cold';
      ALTER TABLE parent_value RENAME COLUMN n TO score;
      ALTER TABLE detached_child NO INHERIT detached_parent;
      ALTER TABLE bad_child NO INHERIT bad_parent;ALTER TABLE bad_parent RENAME COLUMN n TO score;
      ALTER TABLE empty_child NO INHERIT empty_parent;ALTER TABLE empty_parent DROP COLUMN n;
      ALTER TABLE typed_value NOT OF;
      CREATE FUNCTION public.lower(positive_span) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 99';
      CREATE FUNCTION changed_row(detached_child) RETURNS detached_parent LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(99)::detached_parent';
      CREATE CAST(detached_child AS detached_parent) WITH FUNCTION changed_row(detached_child);`)
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, f.name).toBe(true)
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = [],
      bypassExpected = new Map<string, Outcome>()
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    for (const [index, item] of group.checks.entries())
      if (item.kind === 'supported')
        expect(
          item.inputs.filter((i) => i.name.startsWith('__pgsid_case_operand_')),
          plans[index]!.name,
        ).toEqual([])
    const input = (value: number | string | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const f of forms)
      for (const [n, d, label, pick] of [
        [1, 1, '1', true],
        [1, 0, 'bad', false],
        [2, 0, '1', true],
        [3, 2, 'bad', true],
        [null, 0, null, false],
        [null, null, '', null],
        [-1, 1, 'é😊', false],
        [1, 2, '2', null],
        [32768, 1, '1', true],
      ] as const)
        for (const bypass of [false, true]) {
          const params = [n, d, label, pick, bypass]
          let error: string | undefined,
            rejected = false,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
          } catch (e) {
            error = (e as { code: string }).code
            rejected = error === '23514' && (e as { constraint?: string }).constraint === 'valid'
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          const expected: Outcome = error
              ? rejected
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: isNull ? 'Null' : 'True' },
            row: Row = {
              n: input(n),
              d: input(d),
              label: input(label),
              pick: input(pick),
              bypass: input(bypass),
            }
          if (bypass && !bypassExpected.has(f.name)) bypassExpected.set(f.name, expected)
          native.push({ name: f.name, row, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: f.name + '_' + origin, row, expected })
        }
    for (const f of forms)
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: f.name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            d: { kind: 'Unknown' },
            label: { kind: 'Unknown' },
            pick: { kind: 'Unknown' },
            bypass: input(true),
          },
          expected: bypassExpected.get(f.name)!,
        })
      }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'bad_null_present_' + origin,
        row: {
          n: input(1),
          d: { kind: 'Unknown' },
          label: { kind: 'Unknown' },
          pick: input(true),
          bypass: input(false),
        },
        expected: { kind: 'False' },
      })
      fixtures.push({
        name: 'bad_row_present_' + origin,
        row: {
          n: input(1),
          d: { kind: 'Unknown' },
          label: { kind: 'Unknown' },
          pick: { kind: 'Unknown' },
          bypass: input(false),
        },
        expected: { kind: 'Unknown' },
      })
    }
    await mkdir(artifact, { recursive: true })
    for (const [file, value] of Object.entries({
      plans,
      contexts: c.tables
        .filter((t) => t.name.startsWith('evolving_'))
        .map((t) => ({ name: t.name, constraint: t.constraints[0] })),
      'native-reference': native,
      fixtures,
    }))
      await writeFile(join(artifact, file + '.json'), JSON.stringify(value, null, 2) + '\n')
    await writeFile(join(artifact, 'evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'example.com/row-native-coercions',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
