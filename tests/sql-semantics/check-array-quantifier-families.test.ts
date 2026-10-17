import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { arrayScalarProfiles } from './check-array-fixtures.js'
import {
  builtinTypeComparison,
  builtinMetadata,
  builtinCallables,
} from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { catalogScalarType } from '../../src/sql-semantics/expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRustGroup,
  checkRustCallableNames,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
it('quantifies concrete scalar and enum operators selected from the catalog across represented array element profiles', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-quantifier-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE quantifier_families(a text);CREATE TABLE quantifier_family_oracle(LIKE quantifier_families)",
    )
    const available = checkRustCallableNames(),
      operators = builtinCallables().filter(
        (c) => c.kind === 'operator' && c.result === 'pg_catalog.bool' && c.args.length === 2,
      )
    const forms: {
        name: string
        sql: string
        type: string
        arrays: (string | null)[]
        operator: string
        any: boolean
      }[] = [],
      excluded: string[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const canonical =
        type === 'array_stage'
          ? 'pg_catalog.anyenum'
          : catalogScalarType(type.replace(/\(\d+\)/u, ''))
      const candidates = operators.filter((c) => c.args.every((t) => t === canonical))
      const support = canonical ? builtinTypeComparison(canonical) : null
      const fallback = candidates.find((c) => {
        if (c.kind !== 'operator' || !['=', '~='].includes(c.name)) return false
        const fn = builtinMetadata(c.implementation)
        return fn.kind === 'function' && available.has(fn.rustName)
      })
      const equality = support?.equality ?? (fallback ? callableIdentity(fallback) : null)
      const less = candidates.find((c) => c.name === '<')
      const selected = [equality, less ? callableIdentity(less) : null].filter(
        (s): s is string => s !== null,
      )
      if (!selected.length) {
        excluded.push(type)
        continue
      }
      const sample = (
        await pg.query<{ one: string; three: string; multi: string; shifted: string }>(
          `SELECT ARRAY[${literal}::${type}]::text one,ARRAY[${literal}::${type},NULL,${literal}::${type}]::text three,ARRAY[[${literal}::${type},NULL],[${literal}::${type},${literal}::${type}]]::text multi,array_fill(${literal}::${type},ARRAY[2],ARRAY[-3])::text shifted`,
        )
      ).rows[0]!
      if (type === 'money') {
        sample.one = '{0}'
        sample.three = '{0,NULL,0}'
        sample.multi = '{{0,NULL},{0,0}}'
        sample.shifted = '[-3:-2]={0,0}'
      }
      for (const [opIndex, signature] of selected.entries()) {
        const op = builtinMetadata(signature)
        expect(op.kind).toBe('operator')
        for (const any of [true, false])
          forms.push({
            name: `family_${index}_${opIndex}_${any ? 'any' : 'all'}`,
            type,
            operator: signature,
            any,
            sql: `(a::${type}[])[array_lower(a::${type}[],1)] OPERATOR(pg_catalog.${op.name}) ${any ? 'ANY' : 'ALL'}(a::${type}[])`,
            arrays: [
              sample.one,
              sample.three,
              sample.multi,
              sample.shifted,
              '{}',
              '{NULL}',
              null,
              'bad',
            ],
          })
      }
    }
    for (const f of forms)
      await pg.exec(
        `ALTER TABLE quantifier_families ADD CONSTRAINT ${f.name} CHECK(${f.sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'quantifier_families')!
    const allPlans = forms.flatMap((form) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
        expression: lowerTableCheck(
          table,
          origin === 'source'
            ? { name: form.name, type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints.find((c) => c.name === form.name)!,
          catalog.enums,
          catalog.domains,
          origin,
        )!.expression,
      })),
    )
    for (const p of allPlans) expect(hasUncertain(p.expression), p.identity.constraint).toBe(false)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    for (const form of forms)
      for (const a of form.arrays) {
        await pg.exec('DELETE FROM quantifier_family_oracle')
        await pg.query('INSERT INTO quantifier_family_oracle VALUES($1)', [a])
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${form.sql}) value FROM quantifier_family_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        observations.push({
          name: form.name,
          type: form.type,
          operator: form.operator,
          any: form.any,
          a,
          expected,
        })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: { a: a === null ? { kind: 'Null' } : { kind: 'Value', value: a } },
            expected,
          })
      }
    for (let start = 0; start < allPlans.length; start += 64) {
      const plans = allPlans.slice(start, start + 64),
        group = prepareCheckRustGroup(plans, {
          arrayNulls: true,
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
        })
      for (const check of group.checks)
        expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
      const names = plans.map((p) => p.identity.constraint),
        included = new Set(names)
      const batch = join(directory, 'batch_' + start)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'arrayquantifierfamilies' + start,
        group,
        names,
        fixtures.filter((f) => included.has(f.name)),
      )
    }
    await writeFile(
      'artifacts/goal-checks/array-quantifier/family-observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/goal-checks/array-quantifier/family-measurements.json',
      JSON.stringify(
        {
          profiles: arrayScalarProfiles.length,
          profilesExercised: new Set(forms.map((f) => f.type)).size,
          excluded,
          forms: forms.length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
