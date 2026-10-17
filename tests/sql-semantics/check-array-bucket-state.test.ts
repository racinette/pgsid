import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const unknown: Input = { kind: 'Unknown' }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('retains threshold nullness uncertainty, shape/error precedence and safe nested constructor validity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-bucket-state-'))
  try {
    await pg.exec(
      'CREATE TABLE bucket_state(quantity integer,threshold integer,divisor integer,expected integer);CREATE TABLE bucket_state_oracle(LIKE bucket_state)',
    )
    const forms: Record<string, string> = {
      partial: 'width_bucket(quantity,ARRAY[0,threshold,4]) IS NOT DISTINCT FROM expected',
      null_cell: 'width_bucket(quantity,ARRAY[threshold,NULL]) IS NOT DISTINCT FROM expected',
      shape: 'width_bucket(quantity,ARRAY[[threshold,0]]) IS NOT DISTINCT FROM expected',
      empty: 'width_bucket(quantity,ARRAY[]::integer[]) IS NOT DISTINCT FROM expected',
      eager: 'width_bucket(quantity/divisor,ARRAY[threshold,NULL]) IS NOT DISTINCT FROM expected',
      safe_nested: 'cardinality(ARRAY[width_bucket(quantity,ARRAY[0,2,4])])=1',
      safe_empty: 'cardinality(ARRAY[width_bucket(quantity,ARRAY[]::integer[])])=1',
      unsafe_nested: 'cardinality(ARRAY[width_bucket(quantity,ARRAY[0,threshold,4])])=1',
      unsafe_null: 'cardinality(ARRAY[width_bucket(quantity,ARRAY[0,NULL])])=1',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE bucket_state ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'bucket_state')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'stored'
              ? table.constraints.find((c) => c.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans)
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const values of [
      [1, 2, 1, 1],
      [0, 0, 1, 2],
      [null, 2, 1, null],
      [1, null, 1, 0],
      [1, 2, 0, 0],
    ]) {
      await pg.exec('TRUNCATE bucket_state_oracle')
      await pg.query('INSERT INTO bucket_state_oracle VALUES($1,$2,$3,$4)', values)
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} value FROM bucket_state_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (cause) {
          expected = error((cause as { code: string }).code)
        }
        references.push({ name, values, expected })
        add(
          name,
          {
            quantity: known(values[0]!),
            threshold: known(values[1]!),
            divisor: known(values[2]!),
            expected: known(values[3]!),
          },
          expected,
        )
      }
    }
    const base = { quantity: known(1), threshold: known(2), divisor: known(1), expected: known(1) }
    add('partial', { ...base, threshold: unknown }, { kind: 'Unknown' })
    add('null_cell', { ...base, threshold: unknown }, error('22004'))
    add('null_cell', { ...base, quantity: unknown, threshold: unknown }, { kind: 'Unknown' })
    add(
      'null_cell',
      { ...base, quantity: known(null), threshold: unknown, expected: known(null) },
      { kind: 'True' },
    )
    add('shape', { ...base, threshold: unknown }, error('2202E'))
    add('shape', { ...base, quantity: unknown, threshold: unknown }, { kind: 'Unknown' })
    add('empty', { ...base, quantity: unknown }, { kind: 'Unknown' })
    add('safe_nested', { ...base, quantity: unknown }, { kind: 'True' })
    add('safe_empty', { ...base, quantity: unknown }, { kind: 'True' })
    add('unsafe_nested', { ...base, threshold: unknown }, { kind: 'Unknown' })
    add('unsafe_null', { ...base, quantity: unknown }, { kind: 'Unknown' })
    add('partial', { ...base, quantity: error('22012'), threshold: error('22003') }, error('22012'))
    add('partial', { ...base, quantity: unknown, threshold: error('22003') }, error('22003'))
    add('partial', { ...base, quantity: known(null), threshold: error('22003') }, error('22003'))
    add('eager', { ...base, divisor: known(0), threshold: unknown }, error('22012'))
    add('safe_nested', { ...base, quantity: error('22012') }, error('22012'))
    await mkdir('artifacts/array-bucket', { recursive: true })
    await writeFile(
      'artifacts/array-bucket/state-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-bucket/state-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraybucketstate',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
