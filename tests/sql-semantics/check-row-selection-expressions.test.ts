import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves native historical extrema and simple CASE scopes, comparisons, preparation and lazy errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-selection-')),
    artifact = 'artifacts/goal-checks/row-selection-active'
  try {
    const definitions = [
        { name: 'greatest', type: 'int4', value: 'GREATEST(n/d,d,NULL)' },
        { name: 'least', type: 'int4', value: 'LEAST(n/d,d,NULL)' },
        { name: 'numeric', type: 'numeric', value: 'GREATEST(n::numeric/d,1.2300)' },
        {
          name: 'text',
          type: 'text',
          value: `CASE GREATEST(label COLLATE "C",'é') WHEN 'é' THEN (n/d)::text ELSE label END`,
        },
        {
          name: 'bool',
          type: 'bool',
          value: 'CASE pick WHEN true THEN n/d>0 WHEN false THEN false ELSE NULL END',
        },
        {
          name: 'simple',
          type: 'int4',
          value: 'CASE n WHEN 1 THEN 1/d WHEN 2 THEN NULL ELSE 3 END',
        },
        { name: 'operand', type: 'int4', value: 'CASE n/d WHEN 1 THEN 2 ELSE 3 END' },
        { name: 'condition', type: 'int4', value: 'CASE n WHEN n/d THEN 2 ELSE 3 END' },
        {
          name: 'cross_type',
          type: 'int4',
          value: 'CASE n WHEN d::int8 THEN 1/d WHEN 2.5::numeric THEN 4 ELSE NULL END',
        },
        {
          name: 'nested',
          type: 'int4',
          value: 'CASE n WHEN 1 THEN CASE d WHEN 0 THEN 2 ELSE n/d END WHEN d THEN NULL ELSE 4 END',
        },
        {
          name: 'nested_condition',
          type: 'int4',
          value: 'CASE n WHEN CASE d WHEN 0 THEN 1 ELSE 2 END THEN n/d ELSE 3 END',
        },
        {
          name: 'array_case',
          type: 'int4',
          value: 'CASE ARRAY[n,d]::numeric[] WHEN ARRAY[1::numeric,2] THEN 1/d ELSE 2 END',
        },
        {
          name: 'array_conversion',
          type: 'int4[]',
          value: 'CASE n WHEN 1 THEN ARRAY[label]::int4[] ELSE ARRAY[n/d] END',
        },
        { name: 'null_operand', type: 'int4', value: 'CASE NULL::int4 WHEN n/d THEN 1 ELSE 2 END' },
        {
          name: 'computed_null',
          type: 'int4',
          value: 'CASE NULL::int4+1 WHEN n/d THEN 1 ELSE 2 END',
        },
        { name: 'pruned', type: 'int4', value: 'CASE 1 WHEN 1 THEN NULL ELSE 1/0 END' },
        { name: 'computed_pruned', type: 'int4', value: 'CASE 1+1 WHEN 2 THEN NULL ELSE 1/0 END' },
        { name: 'prepared', type: 'int4', value: 'CASE n WHEN 1 THEN 2 ELSE 1/0 END' },
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
      native: unknown[] = []
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
      ] as const)
        for (const bypass of [false, true]) {
          const params = [n, d, label, pick, bypass]
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          const expected: Outcome = error
              ? error === '23514'
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
          expected:
            f.family === 'prepared'
              ? { kind: 'Error', value: { state: parseInt('22012', 36) } }
              : { kind: 'True' },
        })
        if (f.family === 'simple')
          fixtures.push({
            name: f.name + '_' + origin,
            row: {
              n: input(3),
              d: { kind: 'Unknown' },
              label: { kind: 'Unknown' },
              pick: { kind: 'Unknown' },
              bypass: input(false),
            },
            expected: { kind: 'True' },
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
      'example.com/row-selection',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
