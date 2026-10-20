import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  catalogRangeType,
  catalogMultirangeType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import { nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('preserves custom hash literal uncertainty, seed evaluation errors, eager range input and lazy text input', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-wire-state-'))
  try {
    const reference = JSON.parse(
        await readFile('tests/fixtures/check-native-hash.json', 'utf8'),
      ) as {
        samples: {
          type: string
          value: string
          seed: string
          little32: number
          big32: number
          little64: string
          big64: string
        }[]
      },
      sample = reference.samples.find(
        (s) =>
          s.type === 'pg_catalog."numeric"' &&
          s.seed === '0' &&
          s.little32 !== s.big32 &&
          s.little64 !== s.big64,
      )!
    expect(sample).toBeDefined()
    await pg.exec(
      `CREATE TYPE wire_span AS RANGE(subtype=numeric,multirange_type_name=wire_set);CREATE DOMAIN wire_span_history AS wire_span[];CREATE DOMAIN wire_set_history AS wire_set[];CREATE TABLE custom_wire_source(v wire_span,m wire_set,source text,seed int8,divisor int4,expected32 int4,expected64 int8,bypass bool);`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!,
      span = catalogRangeType('public.wire_span', undefined, catalog.domains, catalog.rangeTypes)!,
      set = catalogMultirangeType(
        'public.wire_set',
        undefined,
        catalog.domains,
        catalog.rangeTypes,
      )!,
      text = '[' + sample.value + ',)',
      pack = '{' + text + '}',
      v = await readRangeFixture(pg, 'SELECT $1::wire_span span', 'span', span, [text]),
      m = await readMultirangeFixture(pg, set, pack),
      native = (
        await pg.query<{ h32: number; h64: string; m32: number; m64: string }>(
          `SELECT hash_range($1::wire_span)h32,hash_range_extended($1::wire_span,0)::text h64,hash_multirange($2::wire_set)m32,hash_multirange_extended($2::wire_set,0)::text m64`,
          [text, pack],
        )
      ).rows[0]!
    const forms = [false, true].flatMap((multi) => {
        const type = multi ? 'wire_set' : 'wire_span',
          field = multi ? 'm' : 'v',
          literal = multi ? pack : text,
          fn = multi ? 'multirange' : 'range'
        return Object.entries({
          strict: `hash_${fn}_extended(${field},seed) IS NULL`,
          divided_seed: `hash_${fn}_extended(${field},1/divisor::int8) IS NULL`,
          constant32: `hash_${fn}('${literal}'::${type})=expected32`,
          constant64: `hash_${fn}_extended('${literal}'::${type},0)=expected64`,
          constant_array32: `hash_array(ARRAY['${literal}'::${type},NULL])=expected32`,
          constant_array64: `hash_array_extended(ARRAY['${literal}'::${type},NULL],0)=expected64`,
          constant_nested: `hash_array(ARRAY[ARRAY['${literal}'::${type}]::${type}_history])=expected32`,
          invalid_literal: `${fn}_send('bad'::${type}) IS NULL`,
          invalid_text: `${fn}_send('bad'::text::${type}) IS NULL`,
        }).map(([name, expr]) => ({
          multi,
          name,
          identity: name + '_' + Number(multi),
          sql: `CASE WHEN bypass THEN true ELSE ${expr} END`,
        }))
      }),
      plans = forms.map((f) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: f.identity,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            { name: f.identity, type: 'check', definition: `CHECK(${f.sql})` },
            catalog.enums,
            catalog.domains,
            'source',
            catalog.rangeTypes,
          )!.expression,
        ),
      })),
      names = forms.map((f) => f.identity),
      group = prepareCheckRustGroup(plans)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const present of [false, true])
      for (const bypass of [false, true])
        for (const f of forms) {
          const h32 = f.multi ? native.m32 : native.h32,
            h64 = f.multi ? native.m64 : native.h64,
            params = [present ? text : null, present ? pack : null, null, 0, h32, h64, bypass],
            outcome = await nativeCustomRangeOutcome(
              pg,
              `SELECT (${f.sql})AS value FROM(SELECT $1::wire_span v,$2::wire_set m,$3::int8 seed,$4::int4 divisor,$5::int4 expected32,$6::int8 expected64,$7::bool bypass)inputs`,
              params,
            )
          fixtures.push({
            name: f.identity,
            row: {
              v: present ? { kind: 'Value', value: v! } : { kind: 'Null' },
              m: present ? { kind: 'Value', value: m! } : { kind: 'Null' },
              seed: { kind: 'Null' },
              divisor: { kind: 'Value', value: 0 },
              expected32: { kind: 'Value', value: h32 },
              expected64: { kind: 'Value', value: BigInt(h64) },
              bypass: { kind: 'Value', value: bypass },
            },
            expected: !bypass && f.name.startsWith('constant') ? { kind: 'Unknown' } : outcome,
          })
        }
    for (const f of forms.filter((f) => f.name === 'strict'))
      for (const input of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[])
        for (const bypass of [false, true])
          fixtures.push({
            name: f.identity,
            row: {
              [f.multi ? 'm' : 'v']: input,
              seed: { kind: 'Null' },
              bypass: { kind: 'Value', value: bypass },
            },
            expected: bypass || input.kind === 'Unknown' ? { kind: 'True' } : (input as Outcome),
          })
    await runCheckParity(directory, 'customwirestate', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
