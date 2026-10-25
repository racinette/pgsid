import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves omitted array constructors and selected element conversions through historical rows', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-array-expressions-')),
    artifact = 'artifacts/goal-checks/row-array-expressions-active'
  try {
    const definitions = [
        { name: 'plain', type: 'int4[]', value: 'ARRAY[n/d,NULL,2]' },
        { name: 'nested', type: 'int4[]', value: 'ARRAY[ARRAY[n/d,1],ARRAY[2,3]]' },
        { name: 'empty', type: 'int4[]', value: 'ARRAY[]::int4[]' },
        { name: 'nested_empty', type: 'int4[]', value: 'ARRAY[ARRAY[]::int4[],ARRAY[]::int4[]]' },
        { name: 'ragged', type: 'int4[]', value: 'ARRAY[ARRAY[n/d],ARRAY[1,2]]' },
        { name: 'null_subarray', type: 'int4[]', value: 'ARRAY[NULL::int4[],ARRAY[n/d]]' },
        {
          name: 'nullable',
          type: 'int4[]',
          value: 'CASE WHEN pick THEN NULL::int4[] ELSE ARRAY[n/d] END',
        },
        { name: 'coalesced', type: 'int4[]', value: 'COALESCE(NULL::int4[],ARRAY[n/d])' },
        { name: 'numeric', type: 'numeric[]', value: 'ARRAY[n/d,NULL]::numeric[]' },
        {
          name: 'coerced_numeric',
          type: 'numeric[]',
          value: '(CASE WHEN pick THEN ARRAY[n/d,NULL] ELSE ARRAY[n,0] END)::numeric[]',
        },
        {
          name: 'coerced_runtime',
          type: 'int4[]',
          value: '(CASE WHEN pick THEN ARRAY[label] ELSE ARRAY[NULL::text] END)::int4[]',
        },
        {
          name: 'coerced_width',
          type: 'varchar(3)[]',
          value: 'COALESCE(NULL::varchar[],ARRAY[label::varchar])::varchar(3)[]',
        },
        {
          name: 'coerced_bits',
          type: 'bit(5)[]',
          value: 'COALESCE(NULL::varbit[],ARRAY[label::varbit])::bit(5)[]',
        },
        { name: 'narrow', type: 'int2[]', value: 'ARRAY[n/d,NULL]::int2[]' },
        {
          name: 'coerced_narrow',
          type: 'int2[]',
          value: 'COALESCE(NULL::int4[],ARRAY[n/d,NULL])::int2[]',
        },
        { name: 'runtime', type: 'int4[]', value: 'ARRAY[label,NULL]::int4[]' },
        { name: 'width', type: 'varchar(3)[]', value: 'ARRAY[label::varchar]::varchar(3)[]' },
        { name: 'bits', type: 'bit(5)[]', value: 'ARRAY[label::varbit]::bit(5)[]' },
        { name: 'float', type: 'float8[]', value: 'ARRAY[n::float8/d::float8]' },
        { name: 'prepared', type: 'int4[]', value: 'ARRAY[1/0]' },
        {
          name: 'pruned',
          type: 'int4[]',
          value: 'CASE WHEN true THEN NULL::int4[] ELSE ARRAY[1/0] END',
        },
      ],
      forms = definitions.flatMap((f) => {
        const row = `ROW(n,${f.value})::r_${f.name}`
        return [
          ['present', `${row} IS NOT NULL`],
          ['absent', `${row} IS NULL`],
          ['project', `(${row}).n>=1`],
          ['json', `to_jsonb(${row}) IS NOT DISTINCT FROM jsonb_build_object('n',n)`],
          ['array', `cardinality(ARRAY[${row}])=1`],
        ].map(([consumer, expression]) => ({
          ...f,
          family: f.name,
          name: f.name + '_' + consumer,
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
        const table = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          constraint = table.constraints[0]!
        expect(constraint.rowCoercionContext?.complete, f.name).toBe(true)
        if (f.name.startsWith('coerced_'))
          expect(JSON.stringify(constraint.rowCoercionContext), f.name).toContain(
            'PgsidStoredArrayCoercion',
          )
        expect(JSON.stringify(constraint.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            table,
            constraint,
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
    await mkdir(artifact, { recursive: true })
    await writeFile(join(artifact, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await writeFile(
      join(artifact, 'contexts.json'),
      JSON.stringify(
        c.tables
          .filter((t) => t.name.startsWith('evolving_'))
          .map((t) => ({ name: t.name, constraint: t.constraints[0] })),
        null,
        2,
      ) + '\n',
    )
    for (const [i, p] of group.checks.entries()) expect(p.kind, plans[i]!.name).toBe('supported')
    const input = (v: number | string | boolean | null): Row[string] =>
      v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
    for (const f of forms)
      for (const [n, d, label, pick] of [
        [1, 1, '101011', true],
        [1, 0, 'bad', false],
        [1, 0, '1', true],
        [1, 1, 'bad', true],
        [null, 1, null, false],
        [null, null, '', true],
        [32768, 1, '1', false],
        [-1, 1, 'é😊ab', true],
      ] as const)
        for (const bypass of [false, true]) {
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5)`, [
              n,
              d,
              label,
              pick,
              bypass,
            ])
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5)`, [
                n,
                d,
                label,
                pick,
                bypass,
              ])
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
          expected: f.name.startsWith('prepared_')
            ? { kind: 'Error', value: { state: parseInt('22012', 36) } }
            : { kind: 'True' },
        })
        if (
          [
            'plain',
            'nested',
            'numeric',
            'narrow',
            'float',
            'coerced_numeric',
            'coerced_narrow',
          ].includes(f.family)
        ) {
          const row: Row = {
            n: input(1),
            d: { kind: 'Unknown' },
            label: input('1'),
            pick: input(true),
            bypass: input(false),
          }
          fixtures.push(
            {
              name: f.name + '_' + origin,
              row,
              expected: {
                kind: f.name.endsWith('_present')
                  ? 'Unknown'
                  : f.name.endsWith('_absent')
                    ? 'False'
                    : 'True',
              },
            },
            {
              name: f.name + '_' + origin,
              row: { ...row, d: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
              expected: f.name.endsWith('_present')
                ? { kind: 'Error', value: { state: parseInt('22003', 36) } }
                : { kind: f.name.endsWith('_absent') ? 'False' : 'True' },
            },
          )
        }
      }
    await writeFile(join(artifact, 'native-reference.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-array-expressions',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
