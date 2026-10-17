import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, writeFile } from 'node:fs/promises'
import { measureArrays } from '../../scripts/check-measurements/arrays.js'

const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'"

it('derives array state contracts from actual aggregate links and proves that identical logical cells can have different validation outcomes', async () => {
  const pg = await PGlite.create()
  try {
    const report = await measureArrays(pg)
    const callables = report.callables.filter(
      (c) =>
        c.requirements.includes('aggregate-support-callable') &&
        c.metadata.kind === 'function' &&
        ['pg_catalog._int8', 'pg_catalog._float8'].includes(c.metadata.args[0] ?? '') &&
        !c.requirements.includes('internal-interface'),
    )
    expect(callables).toHaveLength(28)
    const initial = (
      await pg.query<{ name: string; state_type: string; initial: string }>(
        `SELECT DISTINCT p.proname name,quote_ident(tn.nspname)||'.'||quote_ident(t.typname) state_type,link.initial FROM pg_aggregate a CROSS JOIN LATERAL (VALUES(a.aggtransfn,a.aggtranstype,a.agginitval),(a.aggfinalfn,a.aggtranstype,a.agginitval),(a.aggcombinefn,a.aggtranstype,a.agginitval),(a.aggmtransfn,a.aggmtranstype,a.aggminitval),(a.aggminvtransfn,a.aggmtranstype,a.aggminitval),(a.aggmfinalfn,a.aggmtranstype,a.aggminitval)) link(fn,state_type,initial) JOIN pg_proc p ON p.oid=link.fn JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_type t ON t.oid=link.state_type JOIN pg_namespace tn ON tn.oid=t.typnamespace WHERE n.nspname='pg_catalog' AND link.initial IS NOT NULL AND t.typname IN('_int8','_float8') ORDER BY 1,2,3`,
      )
    ).rows
    const observations: unknown[] = []
    for (const row of callables) {
      const fn = row.metadata
      const candidates = initial.filter((s) => s.name === fn.name && s.state_type === fn.args[0])
      expect(candidates, row.identity).toHaveLength(1)
      const state = candidates[0]!,
        cells = state.initial.slice(1, -1).split(',')
      expect(
        cells.every((c) => c === '0'),
        row.identity,
      ).toBe(true)
      const width = cells.length
      expect([2, 3, 6]).toContain(width)
      const canonical = literal(state.initial) + '::' + state.state_type
      const bitmap = `(${literal('{' + [...cells, 'NULL'].join(',') + '}')}::${state.state_type})[1:${width}]`
      const args = (retained: boolean) =>
        fn.args
          .map((type, index) =>
            type === state.state_type
              ? retained && index === 0
                ? bitmap
                : canonical
              : '1::' + type,
          )
          .join(',')
      const probe = (retained: boolean) =>
        `SELECT pg_catalog.${fn.name}(${args(retained)})::text value`
      const same = (
        await pg.query<{
          equal: boolean
          canonical_bitmap: number
          retained_bitmap: number
          canonical: string
          retained: string
        }>(
          `SELECT ${canonical} IS NOT DISTINCT FROM ${bitmap} equal,get_byte(array_send(${canonical}),7) canonical_bitmap,get_byte(array_send(${bitmap}),7) retained_bitmap,${canonical}::text canonical,${bitmap}::text retained`,
        )
      ).rows[0]!
      expect(same, row.identity).toMatchObject({
        equal: true,
        canonical_bitmap: 0,
        retained_bitmap: 1,
      })
      expect(same.canonical).toBe(same.retained)
      const aggregateContext = fn.name === 'int4_avg_combine'
      if (aggregateContext) {
        expect(row.implementationPresent).toBe(true)
        expect(row.valueRequirements).toMatchObject([
          { kind: 'execution', owner: 'tests/sql-semantics/check-array-aggregate-context.test.ts' },
        ])
        await expect(pg.query(probe(false))).rejects.toMatchObject({
          code: 'XX000',
          message: expect.stringContaining('non-aggregate context'),
        })
      } else {
        expect(row.valueRequirements).toMatchObject([
          {
            kind: 'native-storage',
            owner:
              fn.args[0] === 'pg_catalog._int8'
                ? 'tests/sql-semantics/check-array-integer-state.test.ts'
                : fn.args.length === 1 && fn.result === 'pg_catalog.float8'
                  ? 'tests/sql-semantics/check-array-float-final.test.ts'
                  : 'tests/sql-semantics/check-array-aggregate-requirements.test.ts',
          },
        ])
        const result = (await pg.query(probe(false))).rows[0]
        observations.push({
          identity: row.identity,
          initial: state.initial,
          width,
          canonical: result,
          storage: same,
        })
      }
      await expect(pg.query(probe(true))).rejects.toMatchObject({
        code: 'XX000',
        message: expect.stringContaining(aggregateContext ? 'non-aggregate context' : 'expected'),
      })
    }
    await pg.exec(
      `CREATE TABLE stored_integer_states(id integer,state bigint[]);INSERT INTO stored_integer_states VALUES(1,ARRAY[1,2]::bigint[]),(2,(ARRAY[1,2,NULL]::bigint[])[1:2]);`,
    )
    const stored = (
      await pg.query<{ id: number; rendered: string; bitmap: number }>(
        'SELECT id,state::text rendered,get_byte(array_send(state),7) bitmap FROM stored_integer_states ORDER BY id',
      )
    ).rows
    expect(stored).toEqual([
      { id: 1, rendered: '{1,2}', bitmap: 0 },
      { id: 2, rendered: '{1,2}', bitmap: 1 },
    ])
    await expect(
      pg.query('SELECT int8_avg(state)::text value FROM stored_integer_states WHERE id=1'),
    ).resolves.toMatchObject({ rows: [{ value: '2.0000000000000000' }] })
    await expect(
      pg.query('SELECT int8_avg(state) FROM stored_integer_states WHERE id=2'),
    ).rejects.toMatchObject({ code: 'XX000' })
    await expect(
      pg.query(
        'SELECT int8_avg(state::text::bigint[])::text value FROM stored_integer_states WHERE id=2',
      ),
    ).resolves.toMatchObject({ rows: [{ value: '2.0000000000000000' }] })
    for (const name of ['int8_avg', 'int2int4_sum'])
      await expect(pg.query(`SELECT ${name}(ARRAY[[0]]::bigint[]) value`)).resolves.toMatchObject({
        rows: [{ value: null }],
      })
    await mkdir('artifacts/goal-checks/array-aggregate-audit', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-aggregate-audit/requirements-observations.json',
      JSON.stringify(
        {
          callables: callables.length,
          nativeStorageContracts: observations.length,
          observations,
          stored,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 60_000)
