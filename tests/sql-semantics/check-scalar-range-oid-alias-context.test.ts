import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { rangeProfileSupport } from '../../src/sql-semantics/range-profiles.js'
import { customRangeProfiles, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('separates numeric alias range input from explicit name lookup and defers catalog output without embedding OIDs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-alias-range-context-'))
  try {
    const aliases = [
      ['regclass', 'alias_probe.object'],
      ['regoper', 'alias_probe.#~#'],
      ['regoperator', 'alias_probe.#~#(integer,integer)'],
      ['regprocedure', 'alias_probe.add(integer,integer)'],
      ['regtype', 'alias_probe.kind'],
    ] as const
    const common = `CREATE SCHEMA alias_probe;CREATE TABLE alias_probe.object(value int4);CREATE TYPE alias_probe.kind AS ENUM('a');CREATE FUNCTION alias_probe.add(int4,int4) RETURNS int4 LANGUAGE internal IMMUTABLE STRICT AS 'int4pl';CREATE OPERATOR alias_probe.#~#(leftarg=int4,rightarg=int4,procedure=alias_probe.add);`
    const declarations = aliases
      .flatMap(([type], index) => [
        `CREATE DOMAIN alias_bound_${index} AS ${type} NOT NULL CHECK(VALUE::oid<>0);`,
        `CREATE TYPE alias_span_${index}_0 AS RANGE(subtype=${type},multirange_type_name=alias_set_${index}_0);`,
        `CREATE TYPE alias_span_${index}_1 AS RANGE(subtype=alias_bound_${index},multirange_type_name=alias_set_${index}_1);`,
      ])
      .join('\n')
    await pg.exec(common + declarations)
    const profiles = customRangeProfiles(await snapshotCatalog(pg)),
      forms = profiles.flatMap((p) => {
        const index = Number(p.name.split('_')[2]),
          [alias, symbol] = aliases[index]!,
          fixed = scalarRangeText(symbol, symbol)
        return Object.entries({
          output: 'v::text',
          unavailable_output: 'v::text',
          unavailable_compare: '(v=v)::text',
          wire: "encode(range_send(v),'hex')",
          hash: 'hash_range(v)::text',
          input: `encode(range_send(payload::${p.identity}),'hex')`,
          literal: `encode(range_send(${literal(fixed)}::${p.identity}),'hex')`,
          multi_input: `encode(multirange_send(payload::${p.multirange}),'hex')`,
          explicit: alias === 'regclass' ? '(token::regclass::oid)::text' : '(token::oid)::text',
        }).map(([name, output]) => ({
          p,
          alias,
          symbol,
          fixed,
          name,
          missing: name.startsWith('unavailable_'),
          output,
          table: `alias_context_${p.name}_${name}`,
          sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        }))
      })
    const tables = forms
      .map(
        (f) =>
          `CREATE TABLE ${f.table}(v ${f.p.identity},payload text,token text,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}));`,
      )
      .join('\n')
    await pg.exec(tables)
    const catalog = await snapshotCatalog(pg),
      prepare = (c: typeof catalog) => {
        const plans = forms.flatMap((f) =>
          (['source', 'stored'] as const).map((origin) => {
            const table = c.tables.find((t) => t.name === f.table)!
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: f.table,
                constraint: origin,
              },
              expression: portableCheckAtoms(
                lowerTableCheck(
                  table,
                  origin === 'source'
                    ? { ...table.constraints[0]!, definition: `CHECK(${f.sql})` }
                    : table.constraints[0]!,
                  c.enums,
                  c.domains,
                  origin,
                  f.missing ? c.rangeTypes.map((p) => ({ ...p, comparator: null })) : c.rangeTypes,
                )!.expression,
              ),
            }
          }),
        )
        return {
          plans,
          group: prepareCheckRustGroup(plans, {
            defaultCollation: 'C',
            serverEncoding: 'UTF8',
            nativeByteOrder: 'little',
          }),
        }
      },
      { plans, group } = prepare(catalog)
    for (const check of group.checks) expect(check.kind, JSON.stringify(check)).toBe('supported')
    const shifted = await PGlite.create()
    try {
      await shifted.exec(
        'CREATE TABLE discarded_oid(value int4);DROP TABLE discarded_oid;' +
          common +
          declarations +
          tables,
      )
      const original = (
        await pg.query<{ value: string }>(`SELECT 'alias_probe.object'::regclass::oid::text value`)
      ).rows[0]!.value
      const other = (
        await shifted.query<{ value: string }>(
          `SELECT 'alias_probe.object'::regclass::oid::text value`,
        )
      ).rows[0]!.value
      expect(other).not.toBe(original)
      expect(prepare(await snapshotCatalog(shifted)).group.evaluatorSource).toBe(
        group.evaluatorSource,
      )
    } finally {
      await shifted.close()
    }
    for (const p of profiles) {
      const mode =
        p.elementType === 'pg_catalog.regoper'
          ? 2
          : p.elementType === 'pg_catalog.regoperator'
            ? 4
            : p.elementType === 'pg_catalog.regprocedure'
              ? 3
              : p.elementType === 'pg_catalog.regtype'
                ? 5
                : 1
      expect(rangeProfileSupport(p)).toEqual({ comparison: 330 + mode, canonical: 1 })
      expect(rangeProfileSupport({ ...p, comparator: null })).toEqual({
        comparison: 300 + mode,
        canonical: 1,
      })
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const f of forms) {
      const oid = (
          await pg.query<{ value: string }>(
            `SELECT ${literal(f.symbol)}::${f.alias}::oid::text value`,
          )
        ).rows[0]!.value,
        supplied = scalarRangeText(oid, oid)
      for (const text of [
        null,
        'empty',
        '(,)',
        supplied,
        scalarRangeText('2147483648', '4294967295'),
        ...(f.p.subtype === f.p.elementType ? [scalarRangeText('0', '0')] : []),
      ]) {
        const v = await readRangeFixture(
          pg,
          `SELECT $1::${f.p.identity} span`,
          'span',
          f.p.rangeType,
          [text],
        )
        for (const lookup of [false, true]) {
          const scalar = lookup ? f.fixed : text,
            payload =
              f.name === 'multi_input' && scalar !== null
                ? scalar === 'empty'
                  ? '{}'
                  : `{${scalar}}`
                : scalar
          let expected: string | null = null
          try {
            expected = (
              await pg.query<{ value: string | null }>(
                `SELECT (${f.output}) value FROM(SELECT $1::${f.p.identity} v,$2::text payload,$3::text token)q`,
                [text, payload, '2147483648'],
              )
            ).rows[0]!.value
          } catch (error) {
            expect(error).toHaveProperty('code')
          }
          for (const bypass of [false, true]) {
            const native = await nativeCustomRangeOutcome(
              pg,
              `SELECT (${f.sql}) value FROM(SELECT $1::${f.p.identity} v,$2::text payload,$3::text token,$4::text expected,$5::bool bypass)q`,
              [text, payload, '2147483648', expected, bypass],
            )
            for (const origin of ['source', 'stored']) {
              const nonzero =
                  v !== null &&
                  !v.empty &&
                  v.bounds.some((b) => b.kind === 'Oid' && b.value !== 0n),
                unknown =
                  !bypass &&
                  ((['output', 'unavailable_output'].includes(f.name) && nonzero) ||
                    (f.name === 'unavailable_compare' &&
                      v !== null &&
                      !v.empty &&
                      v.bounds.some((b) => b.kind !== 'Null')) ||
                    (lookup && ['input', 'multi_input'].includes(f.name)) ||
                    (f.name === 'explicit' && f.alias === 'regclass'))
              fixtures.push({
                name: `${f.table}_${origin}`,
                row: {
                  v:
                    v === null
                      ? { kind: 'Null' }
                      : {
                          kind: 'Value',
                          value: {
                            ...structuredClone(v),
                            support: { comparison: 33, canonical: 0 },
                          },
                        },
                  payload: cell(payload),
                  token: cell('2147483648'),
                  expected: cell(expected),
                  bypass: cell(bypass),
                },
                expected:
                  (f.name === 'literal' && (origin === 'source' || !bypass)) || unknown
                    ? { kind: 'Unknown' }
                    : native,
              })
            }
          }
        }
      }
    }
    await runCheckParity(
      directory,
      'aliasrangecontext',
      group,
      plans.map((p) => `${p.identity.owner}_${p.identity.constraint}`),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
