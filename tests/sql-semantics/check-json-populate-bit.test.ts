import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'

const packet = 'artifacts/goal-checks/json-populate-active'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('checks bit input byte lengths before digit validity through JSON and record input', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-populate-bit-'))
  try {
    await pg.exec(
      `CREATE DOMAIN bit_word AS bit(2) CHECK(VALUE<>B'00');CREATE TYPE fixed_bits AS(value bit(2));CREATE TYPE varying_bits AS(value bit varying(2));CREATE TYPE domain_bits AS(value bit_word)`,
    )
    const forms = ['fixed_bits', 'varying_bits', 'domain_bits'].flatMap((type) =>
      [
        'json_populate_record',
        'jsonb_populate_record',
        'jsonb_populate_record_valid',
        'record_input',
      ].map((fn) => {
        const name = type + '_' + fn,
          call =
            fn === 'record_input'
              ? `input::${type}`
              : `pg_catalog.${fn}(NULL::${type},input::${fn === 'json_populate_record' ? 'json' : 'jsonb'})`,
          value = fn.endsWith('_valid') ? call : `(${call}).value::text`,
          expression = `${value} IS NOT DISTINCT FROM ${fn.endsWith('_valid') ? 'expected_bool' : 'expected_text'}`
        return { type, fn, name, value, expression }
      }),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(input text,expected_text text COLLATE "C",expected_bool bool,CONSTRAINT parsed CHECK(${f.expression}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const f of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === f.name)!,
          lower = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${f.expression})` : undefined,
          )!
        expect(hasUncertain(lower.expression), f.name + origin).toBe(false)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: f.name,
            constraint: f.name + '_' + origin,
          },
          expression: portableCheckAtoms(lower.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.identity.constraint + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const f of forms)
      for (const payload of [
        '',
        '0',
        '00',
        '000',
        'a',
        'ab',
        'abc',
        'xF',
        'xG',
        'b10',
        'B10',
        'é',
        'éé',
        '😊',
        null,
      ]) {
        const input =
          f.fn === 'record_input'
            ? `(${payload === null ? '' : JSON.stringify(payload)})`
            : JSON.stringify({ value: payload })
        let expected: Outcome,
          text: string | null = null,
          bool: boolean | null = null
        try {
          const result = (
            await pg.query<{ value: string | boolean | null }>(
              `WITH args AS MATERIALIZED(SELECT $1::text input)SELECT ${f.value} value FROM args`,
              [input],
            )
          ).rows[0]!.value
          if (f.fn.endsWith('_valid')) bool = result as boolean | null
          else text = result as string | null
          expected = { kind: 'True' }
        } catch (e) {
          const code = (e as { code?: string }).code
          if (!code) throw e
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        const row: Row = {
          input: known(input),
          expected_text: known(text),
          expected_bool: known(bool),
        }
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: f.name + '_' + origin, row, expected })
        observations.push({ type: f.type, fn: f.fn, payload, input, text, bool, expected })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/bit-summary.json',
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length, observations }, null, 2) +
        '\n',
    )
    await runCheckParity(
      directory,
      'json_populate_bit',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})
