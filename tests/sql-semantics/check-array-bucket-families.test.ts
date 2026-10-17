import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
const known = (value: string | number | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('uses default threshold ordering for every represented scalar/enum profile with shape and NULL checks before comparator lookup', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-bucket-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE family_bucket(a text,needle text,expected integer);CREATE TABLE family_bucket_oracle(LIKE family_bucket)",
    )
    const forms: {
      name: string
      sql: string
      call: string
      type: string
      pairs: (string | null)[][]
    }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const value = `${literal}::${type}`
      const sample = (
        await pg.query<{ one: string; three: string; shifted: string; multi: string }>(
          `SELECT ARRAY[${value}]::text one,ARRAY[${value},${value},${value}]::text three,array_fill(${value},ARRAY[3],ARRAY[-2])::text shifted,array_fill(${value},ARRAY[1,2])::text multi`,
        )
      ).rows[0]!
      if (type === 'money') {
        sample.one = '{0}'
        sample.three = '{0,0,0}'
        sample.shifted = '[-2:0]={0,0,0}'
        sample.multi = '{{0,0}}'
      }
      const call = `width_bucket((needle::${type}[])[1],a::${type}[])`
      forms.push({
        name: 'family_' + index,
        call,
        sql: `(${call}) IS NOT DISTINCT FROM expected`,
        type,
        pairs: [
          [sample.one, sample.one],
          [sample.three, sample.one],
          [sample.shifted, sample.one],
          ['{}', sample.one],
          [sample.multi, sample.one],
          ['{NULL}', sample.one],
          ['{NULL,NULL}', sample.one],
          [null, sample.one],
          [sample.one, null],
          ['{NULL}', null],
          ['bad', null],
          [null, null],
        ],
      })
    }
    for (const { name, sql } of forms)
      await pg.exec(`ALTER TABLE family_bucket ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'family_bucket')!
    const plans = forms.flatMap(({ name, sql }) =>
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
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const [a, needle] of form.pairs) {
        await pg.exec('TRUNCATE family_bucket_oracle')
        await pg.query('INSERT INTO family_bucket_oracle(a,needle) VALUES($1,$2)', [a, needle])
        let output: number | null = null,
          expected: Outcome
        try {
          output = (
            await pg.query<{ value: number | null }>(
              `SELECT ${form.call} value FROM family_bucket_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: 'True' }
        } catch (cause) {
          const code = (cause as { code: string }).code
          expect(['22P02', '22004', '2202E', '42883'], form.type).toContain(code)
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        references.push({ name: form.name, type: form.type, a, needle, output, expected })
        for (const origin of ['source', 'stored']) {
          fixtures.push({
            name: form.name + '_' + origin,
            row: { a: known(a!), needle: known(needle!), expected: known(output) },
            expected,
          })
          if (expected.kind === 'True')
            fixtures.push({
              name: form.name + '_' + origin,
              row: { a: known(a!), needle: known(needle!), expected: known(-99) },
              expected: { kind: 'False' },
            })
        }
      }
    await mkdir('artifacts/array-bucket', { recursive: true })
    await writeFile(
      'artifacts/array-bucket/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-bucket/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let start = 0; start < plans.length; start += 64) {
      const batch = plans.slice(start, start + 64),
        group = prepareCheckRustGroup(batch, {
          arrayNulls: true,
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
        })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          batch[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = batch.map((p) => p.identity.constraint),
        path = join(directory, String(start))
      await mkdir(path)
      await runCheckParity(
        path,
        'arraybucketfamilies' + start,
        group,
        names,
        fixtures.filter((f) => names.includes(f.name)),
      )
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 400_000)
