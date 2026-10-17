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
const known = (value: string | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('selects every represented array family through default element ordering and retains unsupported-order errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-extrema-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE family_extrema(a text,b text,expected text);CREATE TABLE family_extrema_oracle(LIKE family_extrema)",
    )
    const forms: {
      name: string
      sql: string
      type: string
      fn: string
      pairs: (string | null)[][]
    }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const value = `${literal}::${type}`
      const sample = (
        await pg.query<{ base: string; shorter: string; reversed: string; shifted: string }>(
          `SELECT ARRAY[${value},NULL]::text base,ARRAY[${value}]::text shorter,ARRAY[NULL,${value}]::text reversed,array_fill(${value},ARRAY[1,2],ARRAY[-1,0])::text shifted`,
        )
      ).rows[0]!
      if (type === 'money') {
        sample.base = '{0,NULL}'
        sample.shorter = '{0}'
        sample.reversed = '{NULL,0}'
        sample.shifted = '[-1:-1][0:1]={{0,0}}'
      }
      const pairs = [
        [sample.base, sample.base],
        [sample.base, sample.shorter],
        [sample.base, sample.reversed],
        [sample.base, sample.shifted],
        [sample.base, '{}'],
        ['{}', '{}'],
        ['{NULL}', '{NULL}'],
        [null, sample.base],
        [sample.base, null],
        [null, null],
      ]
      for (const fn of ['array_larger', 'array_smaller'])
        forms.push({
          name: 'family_' + index + '_' + fn,
          sql: `${fn}(a::${type}[],b::${type}[]) IS NOT DISTINCT FROM expected::${type}[]`,
          type,
          fn,
          pairs,
        })
    }
    for (const form of forms)
      await pg.exec(
        `ALTER TABLE family_extrema ADD CONSTRAINT "${form.name}" CHECK(${form.sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'family_extrema')!
    const plans = forms.flatMap((form) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'stored'
              ? table.constraints.find((c) => c.name === form.name)!
              : { name: form.name, type: 'check', definition: `CHECK(${form.sql})` },
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
      for (const [a, b] of form.pairs) {
        await pg.exec('TRUNCATE family_extrema_oracle')
        await pg.query('INSERT INTO family_extrema_oracle(a,b) VALUES($1,$2)', [a, b])
        let selected: string | null = null,
          expected: Outcome
        try {
          const ordering = (
            await pg.query<{ value: number | null }>(
              `SELECT btarraycmp(a::${form.type}[],b::${form.type}[]) value FROM family_extrema_oracle`,
            )
          ).rows[0]!.value
          selected =
            ordering === null
              ? null
              : (form.fn === 'array_larger' ? ordering > 0 : ordering < 0)
                ? a!
                : b!
          await pg.query('UPDATE family_extrema_oracle SET expected=$1', [selected])
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${form.sql} value FROM family_extrema_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (cause) {
          const code = (cause as { code: string }).code
          expect(code, form.type).toBe('42883')
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        references.push({ name: form.name, type: form.type, a, b, selected, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: { a: known(a!), b: known(b!), expected: known(selected) },
            expected,
          })
      }
    await mkdir('artifacts/array-extrema', { recursive: true })
    await writeFile(
      'artifacts/array-extrema/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-extrema/family-references.json',
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
        selected = fixtures.filter((f) => names.includes(f.name))
      const path = join(directory, String(start))
      await mkdir(path)
      await runCheckParity(path, 'arrayextremafamilies' + start, group, names, selected)
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 500_000)
