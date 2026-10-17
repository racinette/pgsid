import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { arrayScalarProfiles } from './check-array-fixtures.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('dispatches both default array hashes across every represented scalar and enum profile with binary relabels and missing-support errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-hash-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE family_hashes(a text,seed bigint,expected32 integer,expected64 bigint);CREATE TABLE family_hash_oracle(LIKE family_hashes)",
    )
    const forms: {
      name: string
      sql: string
      call: string
      type: string
      extended: boolean
      arrays: (string | null)[]
    }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const scalar = `${type === 'real' ? "'1.5'" : literal}::${type}`
      const sample = (
        await pg.query<{ one: string; three: string; multi: string; shifted: string }>(
          `SELECT ARRAY[${scalar}]::text one,ARRAY[${scalar},NULL,${scalar}]::text three,ARRAY[[${scalar},NULL],[${scalar},${scalar}]]::text multi,array_fill(${scalar},ARRAY[2],ARRAY[-3])::text shifted`,
        )
      ).rows[0]!
      if (type === 'money') {
        sample.one = '{0}'
        sample.three = '{0,NULL,0}'
        sample.multi = '{{0,NULL},{0,0}}'
        sample.shifted = '[-3:-2]={0,0}'
      }
      for (const extended of [false, true]) {
        const call = `${extended ? 'hash_array_extended' : 'hash_array'}(a::${type}[]${extended ? ',seed' : ''})`
        forms.push({
          name: 'family_' + index + '_' + (extended ? '64' : '32'),
          call,
          sql: `(${call}) IS NOT DISTINCT FROM ${extended ? 'expected64' : 'expected32'}`,
          type,
          extended,
          arrays: [
            sample.one,
            sample.three,
            sample.multi,
            sample.shifted,
            '{}',
            '{NULL}',
            '{NULL,NULL}',
            null,
            'bad',
          ],
        })
      }
    }
    for (const form of forms)
      await pg.exec(
        `ALTER TABLE family_hashes ADD CONSTRAINT ${form.name} CHECK(${form.sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'family_hashes')!
    const plans = forms.flatMap((form) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name: form.name, type: 'check', definition: `CHECK(${form.sql})` }
              : table.constraints.find((c) => c.name === form.name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
      })),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const a of form.arrays)
        for (const seed of form.extended
          ? [0n, -1n, -9223372036854775808n, 9223372036854775807n, null]
          : [0n]) {
          await pg.exec('TRUNCATE family_hash_oracle')
          await pg.query('INSERT INTO family_hash_oracle(a,seed) VALUES($1,$2)', [
            a,
            seed === null ? null : String(seed),
          ])
          let value: string | null = null,
            expected: Outcome
          try {
            value = (
              await pg.query<{ value: string | null }>(
                `SELECT (${form.call})::text value FROM family_hash_oracle`,
              )
            ).rows[0]!.value
            expected = {
              kind:
                form.type === 'array_stage' &&
                a !== null &&
                a.includes('new') &&
                (!form.extended || seed !== null)
                  ? 'Unknown'
                  : 'True',
            }
          } catch (cause) {
            const code = (cause as { code: string }).code
            expect(['42883', '22P02']).toContain(code)
            expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          const row: Row = {
            a: known(a),
            seed: known(seed),
            expected32: known(form.extended ? null : value === null ? null : Number(value)),
            expected64: known(form.extended && value !== null ? BigInt(value) : null),
          }
          references.push({
            name: form.name,
            type: form.type,
            a,
            seed: seed === null ? null : String(seed),
            value,
            expected,
          })
          for (const origin of ['source', 'stored']) {
            fixtures.push({ name: form.name + '_' + origin, row, expected })
            if (expected.kind === 'True' && seed === 0n && a !== 'bad') {
              const wrong = value === null ? 0 : BigInt(value) === 0n ? 1 : 0
              fixtures.push({
                name: form.name + '_' + origin,
                row: {
                  ...row,
                  [form.extended ? 'expected64' : 'expected32']: known(
                    form.extended ? BigInt(wrong) : wrong,
                  ),
                },
                expected: { kind: 'False' },
              })
            }
          }
        }
    await writeFile(
      'artifacts/goal-checks/array-hash-dispatch/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let start = 0; start < plans.length; start += 64) {
      const batch = plans.slice(start, start + 64),
        group = prepareCheckRustGroup(batch, {
          arrayNulls: true,
          nativeByteOrder: 'little',
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
        'arrayhashfamilies' + start,
        group,
        names,
        fixtures.filter((f) => names.includes(f.name)),
      )
    }
    await writeFile(
      'artifacts/goal-checks/array-hash-dispatch/family-measurements.json',
      JSON.stringify(
        {
          profiles: arrayScalarProfiles.length,
          fixtures: fixtures.length,
          postgresObservations: references.length,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 500_000)
