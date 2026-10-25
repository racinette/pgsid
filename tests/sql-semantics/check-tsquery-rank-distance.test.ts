import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

it('retains the native Float4 distance table for every exponential input used by term ranking', async () => {
  const pg = await PGlite.create()
  try {
    const rows = (
      await pg.query<{ i: number; bits: string }>(
        `SELECT i,encode(float4send((1.0::float8/(1.005::float8+0.05::float8*exp(i::float4::float8/1.5::float8-2.0::float8)))::float4),'hex') bits FROM generate_series(1,100) i`,
      )
    ).rows
    expect(rows).toHaveLength(100)
    const bits = rows.map((r) => Buffer.from(r.bits, 'hex').readInt32BE(0)),
      source =
        'const TS_RANK_DISTANCE_BITS: &[i32] = &[\n' +
        bits.map((b, i) => '    ' + b + (i === bits.length - 1 ? '' : ',')).join('\n') +
        '\n];\n',
      path = 'crates/check-evaluator/src/operations/pg_catalog/ts_rank_distance.rs'
    if (process.env.UPDATE_TS_RANK_DISTANCE === '1') await writeFile(path, source)
    expect(await readFile(path, 'utf8')).toBe(source)
    await mkdir('artifacts/goal-checks/tsquery-rank-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/tsquery-rank-active/distance-reference.json',
      JSON.stringify(rows, null, 2) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 60_000)
