import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'

it('converts text cells and represented scalar/enum arrays through catalog I/O while keeping declared output requirements and NULL/empty fast paths', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      "SET TIME ZONE 'UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='iso_8601';CREATE TYPE array_stage AS ENUM ('new','done');CREATE TABLE array_io_families(marker integer,payload text,expected text)",
    )
    const contextual = new Set([
      'timestamp',
      'timestamptz',
      'date',
      'bytea',
      'interval',
      'point',
      'line',
      'lseg',
      'box',
      'path',
      'polygon',
      'circle',
      'money',
    ])
    const forms: {
      name: string
      output: string
      sql: string
      payload: string
      type: string
      deferred: boolean
    }[] = []
    expect(arrayScalarProfiles).toHaveLength(58)
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      let payload = (await pg.query<{ value: string }>(`SELECT (${literal}::${type})::text value`))
        .rows[0]!.value
      if (type === 'money') payload = '0'
      const catalogNames: Record<string, string> = {
        regclass: 'array_io_families',
        regtype: 'integer',
        regnamespace: 'public',
        regrole: 'postgres',
        regproc: 'now',
        regprocedure: 'now()',
        regoper: '||/',
        regoperator: '+(integer,integer)',
        regconfig: 'simple',
        regdictionary: 'simple',
        regcollation: '"C"',
      }
      payload = catalogNames[type] ?? payload
      const value = type === 'regrole' ? '((marker*0)::oid)::regrole' : `(${literal})::${type}`
      const outputs = {
        input: `array_dims((ARRAY[payload,NULL]::text[])::${type}[])`,
        output: `(ARRAY[${value},NULL]::${type}[])::text[]::text`,
        fast: `((NULL::${type}[])::text[] IS NULL AND cardinality((ARRAY[]::text[])::${type}[]) = 0 AND ((ARRAY[NULL]::text[])::${type}[])[1] IS NULL)::text`,
      }
      for (const [mode, output] of Object.entries(outputs)) {
        const name = `family_${index}_${mode}`
        const sql = `(${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`
        await pg.exec(
          `ALTER TABLE array_io_families ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
        )
        forms.push({
          name,
          output,
          sql,
          payload,
          type,
          deferred:
            (mode === 'output' && contextual.has(type)) ||
            (mode === 'input' && type.startsWith('reg')),
        })
      }
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_io_families')!
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
            origin === 'source'
              ? { name: form.name, type: 'check', definition: `CHECK(${form.sql})` }
              : table.constraints.find((item) => item.name === form.name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms) {
      const output = (
        await pg.query<{ value: string | null }>(
          `SELECT (${form.output}) value FROM (SELECT 1 marker,$1::text payload) q`,
          [form.payload],
        )
      ).rows[0]!.value
      references.push({
        name: form.name,
        type: form.type,
        payload: form.payload,
        output,
        deferred: form.deferred,
      })
      for (const origin of ['source', 'stored'])
        for (const wrong of [false, true])
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              marker: { kind: 'Value', value: 1 },
              payload: { kind: 'Value', value: form.payload },
              expected: { kind: 'Value', value: wrong ? 'wrong' : output! },
            },
            expected: { kind: form.deferred ? 'Unknown' : wrong ? 'False' : 'True' },
          })
    }
    await mkdir('artifacts/array-io-casts', { recursive: true })
    await writeFile(
      'artifacts/array-io-casts/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-io-casts/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 64) {
      const batch = plans.slice(offset, offset + 64),
        directory = await mkdtemp(join(tmpdir(), 'pgsid-array-io-families-'))
      try {
        const group = prepareCheckRustGroup(batch, {
          arrayNulls: true,
          defaultCollation: 'C',
          defaultCtype: 'C.UTF-8',
          serverEncoding: 'UTF8',
        })
        for (const [index, check] of group.checks.entries())
          expect(
            check.kind,
            batch[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
          ).toBe('supported')
        const names = batch.map((plan) => plan.identity.constraint),
          selected = new Set(names)
        await runCheckParity(
          directory,
          'arrayiofamilies',
          group,
          names,
          fixtures.filter((fixture) => selected.has(fixture.name)),
        )
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  } finally {
    await pg.close()
  }
}, 600_000)
