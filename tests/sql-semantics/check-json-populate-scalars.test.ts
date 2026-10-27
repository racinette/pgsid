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
import { quoteContext, quoteProfiles } from './check-quote-fixtures.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'

const packetRoot = 'artifacts/goal-checks/json-populate-active'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('routes JSON record scalar fields through captured input functions and modifiers', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-populate-scalars-'))
  try {
    await pg.exec(
      `SET xmloption=CONTENT;SET lc_monetary='C';SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='postgres';SET bytea_output='hex';SET extra_float_digits=1;CREATE TYPE quote_label AS ENUM ('ready','done');CREATE DOMAIN quote_positive AS int CHECK(VALUE>0)`,
    )
    const allProfiles = quoteProfiles.filter(
      (p) =>
        !p.catalog &&
        !p.type.includes('[]') &&
        !['record', 'quote_pair', 'quote_data', 'int2vector', 'oidvector'].includes(p.type),
    )
    const selection = process.env['PGSID_CHECK_JSON_POPULATE_TYPES']?.split(',')
    if (
      selection &&
      (new Set(selection).size !== selection.length ||
        selection.some((type) => !allProfiles.some((profile) => profile.type === type)))
    )
      throw new Error('PGSID_CHECK_JSON_POPULATE_TYPES must name distinct scalar profiles')
    const profiles = selection
        ? allProfiles.filter((profile) => selection.includes(profile.type))
        : allProfiles,
      packet = selection
        ? packetRoot + '/scalar-scope-' + selection.map(encodeURIComponent).join('_')
        : packetRoot,
      forms = profiles.flatMap((p, index) =>
        ['json_populate_record', 'jsonb_populate_record', 'jsonb_populate_record_valid'].map(
          (fn) => {
            const record = 'scalar_record_' + index,
              name = 'scalar_populate_' + index + '_' + fn,
              call = `pg_catalog.${fn}(NULL::${record},data::${fn === 'json_populate_record' ? 'json' : 'jsonb'})`,
              value = fn.endsWith('_valid') ? call : `(${call}).value::text`,
              expression = `${value} IS NOT DISTINCT FROM ${fn.endsWith('_valid') ? 'expected_bool' : 'expected_text'}`
            return { profile: p, index, record, name, call, value, expression, fn }
          },
        ),
      )
    await mkdir(packet, { recursive: true })
    for (const [index, profile] of profiles.entries())
      await pg.exec(`CREATE TYPE scalar_record_${index} AS(value ${profile.type})`)
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(data text,expected_text text COLLATE "C",expected_bool bool,CONSTRAINT parsed CHECK(${f.expression}))`,
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
        if (hasUncertain(lower.expression))
          await writeFile(
            packet + '/binding-failure.json',
            JSON.stringify({ form: f, origin, table, domains: catalog.domains, lower }, null, 2) +
              '\n',
          )
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
    const group = prepareCheckRustGroup(plans, {
      ...quoteContext,
      maxIdentifierBytes: 63,
      xmlOption: 'content',
      moneyFractionDigits: 2,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.identity.constraint + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const f of forms) {
      const original = (
        await pg.query<{ data: string }>(
          `SELECT json_build_object('value',(${f.profile.value})::${f.profile.type})::text data`,
        )
      ).rows[0]!.data
      for (const data of [
        null,
        '{}',
        '{"value":null}',
        original,
        ...(['date', 'time', 'timetz', 'timestamp', 'timestamptz', 'interval'].includes(
          f.profile.type,
        )
          ? [
              JSON.stringify({ value: [JSON.parse(original).value] }),
              JSON.stringify({ value: { [String(JSON.parse(original).value)]: '' } }),
            ]
          : []),
        '{"value":""}',
        '{"value":{"a":1}}',
        ...(['date', 'timestamp'].includes(f.profile.type)
          ? ['{"value":{"12":"34"}}', '{"value":[12,34]}']
          : []),
      ]) {
        let expected: Outcome,
          text: string | null = null,
          bool: boolean | null = null
        try {
          const observed = (
            await pg.query<{ value: string | boolean | null }>(
              `WITH args AS MATERIALIZED(SELECT $1::text data)SELECT ${f.value} value FROM args`,
              [data],
            )
          ).rows[0]!.value
          if (f.fn.endsWith('_valid')) bool = observed as boolean | null
          else text = observed as string | null
          expected = { kind: 'True' }
        } catch (e) {
          const code = (e as { code?: string }).code
          if (!code) throw e
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        const nativeExpected = expected
        if (
          ['date', 'timestamp'].includes(f.profile.type) &&
          ['{"value":{"12":"34"}}', '{"value":[12,34]}'].includes(data ?? '')
        ) {
          if (f.fn.endsWith('_valid')) expect(bool).toBe(false)
          else expect(expected).toEqual({ kind: 'Error', value: { state: parseInt('22008', 36) } })
          expected = { kind: 'Unknown' }
        }
        const row: Row = {
          data: known(data),
          expected_text: known(text),
          expected_bool: known(bool),
        }
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: f.name + '_' + origin, row, expected })
        observations.push({
          type: f.profile.type,
          fn: f.fn,
          data,
          text,
          bool,
          nativeExpected,
          expected,
        })
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/scalars-evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/scalars-summary.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          scope: selection ?? null,
          checks: plans.length,
          fixtures: fixtures.length,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'json_populate_scalars',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
