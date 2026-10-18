import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('evaluates catalog-resolved ANY, SOME and ALL over array expressions with eager arguments, lazy comparisons, dimensions, strict NULLs and constant preparation', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-quantifier-'))
  try {
    await mkdir('artifacts/goal-checks/array-quantifier', { recursive: true })
    await pg.exec(`CREATE TYPE quantified_stage AS ENUM ('new','done');
   CREATE DOMAIN quantified_slots AS integer[];
   CREATE TABLE quantified_values(probe text,payload text,quantity integer,divisor integer,bypass boolean);
   CREATE TABLE quantified_oracle(LIKE quantified_values);`)
    const forms: Record<string, string> = {}
    for (const [name, op] of Object.entries({
      eq: '=',
      ne: '<>',
      lt: '<',
      le: '<=',
      gt: '>',
      ge: '>=',
    }))
      for (const mode of ['ANY', 'ALL'])
        forms[name + '_' + mode.toLowerCase()] = `quantity ${op} ${mode}(payload::quantified_slots)`
    Object.assign(forms, {
      some: 'quantity OPERATOR(pg_catalog.=) SOME(payload::integer[])',
      promoted: 'quantity::numeric = ANY(payload::integer[])',
      mixed: 'quantity::bigint < ALL(payload::smallint[])',
      float: 'probe::float8 >= ANY(payload::real[])',
      boolean: 'bypass = ALL(payload::boolean[])',
      text: 'probe COLLATE "C" < ANY(payload::text[] COLLATE "C")',
      regex: 'probe COLLATE "C" ~ ANY(payload::text[] COLLATE "C")',
      regex_all: 'probe COLLATE "C" !~ ALL(payload::text[] COLLATE "C")',
      enum: "'new'::quantified_stage < ALL(payload::quantified_stage[])",
      jsonb: 'probe::jsonb @> ANY(payload::jsonb[])',
      jsonb_keys: 'probe::jsonb ? ALL(payload::text[])',
      jsonpath_any: 'probe::jsonb @@ ANY(payload::jsonpath[])',
      jsonpath_all: 'probe::jsonb @? ALL(payload::jsonpath[])',
      bit: 'probe::bit varying = ANY(payload::bit varying[])',
      bytea: 'probe::bytea = ALL(payload::bytea[])',
      constructed: 'quantity = ANY(ARRAY[quantity,NULL,divisor])',
      rectangular: 'quantity = ANY(ARRAY[ARRAY[quantity,divisor],ARRAY[NULL,quantity]])',
      transformed: 'quantity = ANY(array_reverse(payload::integer[]))',
      coerced: 'quantity::numeric > ALL(COALESCE(payload::integer[],ARRAY[quantity]))',
      in_list: 'quantity IN (1,2,NULL)',
      not_in_list: 'quantity NOT IN (1,2,NULL)',
      in_columns: 'quantity IN (1,divisor,quantity/divisor)',
      wrapped: 'cardinality(ARRAY[quantity=ANY(payload::integer[])])=1',
      null_subject: 'NULL::integer = ANY(ARRAY[quantity/divisor])',
      empty: 'quantity/divisor = ANY(ARRAY[]::integer[])',
      null_array: 'quantity/divisor = ALL(NULL::integer[])',
      lazy: 'CASE WHEN bypass THEN true ELSE quantity = ANY(ARRAY[quantity/divisor]) END',
      prepared: 'CASE WHEN bypass THEN true ELSE 1 = ANY(ARRAY[1,1/0]) END',
      pruned: 'CASE WHEN true THEN true ELSE 1 = ANY(ARRAY[1,1/0]) END',
      prepared_match: "CASE WHEN bypass THEN true ELSE 'a' COLLATE \"C\" ~ ANY(ARRAY['a','[']) END",
      inferred_text: "'a' = ANY('{a,b}')",
      inferred_integer: 'quantity = ALL(NULL)',
    })
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE quantified_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'quantified_values')!
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
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    for (const plan of plans)
      expect(hasUncertain(plan.expression), plan.identity.constraint).toBe(false)
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      defaultCtype: 'C.UTF-8',
      serverEncoding: 'UTF8',
    })
    for (const [i, check] of group.checks.entries())
      expect(
        check.kind,
        plans[i]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.evaluatorSource).toContain('array_quantifier_continues(&')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const base = {
      probe: '2' as string | null,
      payload: '{1,2,NULL}' as string | null,
      quantity: 2 as number | null,
      divisor: 1 as number | null,
      bypass: false,
    }
    const samples = [
      base,
      ...[1, 3, -1, null].map((quantity) => ({ ...base, quantity })),
      ...[
        '{}',
        '{NULL}',
        '{3,4}',
        '[-3:-1]={1,2,NULL}',
        '{{1,2},{3,4}}',
        '{bad}',
        '{1,',
        '{32768}',
      ].map((payload) => ({ ...base, payload })),
      { ...base, payload: null },
      ...['1', '3', '-1', 'bad', null].map((probe) => ({ ...base, probe })),
      { ...base, probe: null, payload: '{}' },
      ...['{2}', '{}', null].map((payload) => ({ ...base, payload, divisor: 0 })),
      { ...base, quantity: null, divisor: 0 },
      { ...base, bypass: true, divisor: 0 },
    ]
    const familySamples: Record<string, readonly [string | null, string | null][]> = {
      text: [
        ['a', '{a,b}'],
        ['é', '{a,é}'],
        [null, '{}'],
      ],
      regex: [
        ['a', '{a,[}'],
        ['a', '{[,a}'],
        ['z', '{a,[}'],
        [null, '{[}'],
      ],
      regex_all: [
        ['a', '{a,[}'],
        ['a', '{[,a}'],
        ['z', '{a,[}'],
        [null, '{[}'],
      ],
      enum: [
        ['new', '{done,NULL}'],
        ['done', '{new,done}'],
        ['new', '{}'],
        [null, '{new}'],
      ],
      jsonb: [
        ['{"a":1}', '{"{\\"a\\":1}",NULL}'],
        ['1', '{1,2}'],
        ['{}', '{}'],
      ],
      jsonb_keys: [
        ['{"a":1}', '{a}'],
        ['{"a":1}', '{a,NULL}'],
        ['{}', '{}'],
      ],
      jsonpath_any: [
        ['{"a":1}', '{"$.a == 1","$.a == 2"}'],
        ['{"a":1}', '{"$.a == 1","strict $.missing > 0"}'],
        ['{}', '{}'],
      ],
      jsonpath_all: [
        ['{"a":1}', '{"$.a","strict $.missing"}'],
        ['{"a":1}', '{"$.a",NULL}'],
        ['{}', '{}'],
      ],
      bit: [
        ['10', '{10,01}'],
        ['', '{}'],
        [null, '{NULL}'],
      ],
      bytea: [
        ['\\x00', '{"\\\\x00",NULL}'],
        ['\\x', '{}'],
      ],
      float: [
        ['NaN', '{NaN,1}'],
        ['Infinity', '{1,Infinity}'],
        ['-0', '{0,-0}'],
      ],
      boolean: [
        ['true', '{true,NULL}'],
        ['false', '{false,false}'],
        [null, '{}'],
      ],
    }
    for (const [name, sql] of Object.entries(forms)) {
      for (const sample of [
        ...samples,
        ...(familySamples[name] ?? []).map(([probe, payload]) => ({ ...base, probe, payload })),
      ]) {
        let expected: Outcome
        try {
          await pg.exec('DELETE FROM quantified_oracle')
          await pg.query('INSERT INTO quantified_oracle VALUES($1,$2,$3,$4,$5)', [
            sample.probe,
            sample.payload,
            sample.quantity,
            sample.divisor,
            sample.bypass,
          ])
          const actual = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) value FROM quantified_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        const row = Object.fromEntries(
          Object.entries(sample).map(([key, value]) => [key, known(value)]),
        )
        observations.push({ name, sample, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    }
    await writeFile(
      'artifacts/goal-checks/array-quantifier/observations-debug.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/goal-checks/array-quantifier/evaluator-debug.rs',
      group.evaluatorSource!,
    )
    await runCheckParity(
      directory,
      'arrayquantifier',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-quantifier/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/goal-checks/array-quantifier/measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
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
