import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches declared C money text grammar and formatting through scalar, container and JSON paths in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-money-text-context-')),
    packet = 'artifacts/goal-checks/money-text-active'
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const forms: (string | null)[] = [
    null,
    ...new Set([
      ...['', '$', '+', '-', '(', '$-', '-$', '$$', '($', '+ $'].flatMap((prefix) =>
        ['', '0', '.005', '1,234.567'].flatMap((amount) =>
          ['', ')-+$'].map((tail) => prefix + amount + tail),
        ),
      ),
      '1 2',
      '1,2,3.4,5,6',
      '1.23,4',
      '1..',
      '1.2.3',
      'NaN',
      'Infinity',
      '€1.25',
      '\u00a0',
      '\t 00\r\n',
      '0 0',
      '0.0049999',
      '0.0050000',
      '-0.005',
      '92233720368547758.07',
      '92233720368547758.08',
      '92233720368547758.075',
      '92233720368547758.08-',
      '-92233720368547758.08',
      '-92233720368547758.085',
      '92233720368547758.08bad',
      '-92233720368547758.085bad',
      '9223372036854775808x',
      '0'.repeat(5000),
      '1'.repeat(100),
    ]),
  ]
  const amounts = [
    null,
    '0',
    '0.01',
    '-0.01',
    '0.10',
    '-0.10',
    '1.25',
    '-1.25',
    '1000',
    '-1000',
    '92233720368547758.07',
    '-92233720368547758.08',
  ]
  const arrayForms = [
    null,
    '{}',
    '{NULL}',
    '{"$1,234.56"}',
    '[0:1]={"-$0.01",NULL}',
    '{bad}',
    '{"92233720368547758.08"}',
  ]
  const definitions = [
    { name: 'wire', sql: 'cash_send(source::money)', wire: true, pool: forms, input: true },
    { name: 'domain', sql: 'cash_send(source::cash_amount)', wire: true, pool: forms, input: true },
    {
      name: 'array_coerce',
      sql: 'cash_send((ARRAY[source]::money[])[1])',
      wire: true,
      pool: forms,
      input: true,
    },
    {
      name: 'input_roundtrip',
      sql: '(source::money)::text',
      wire: false,
      pool: forms,
      input: true,
    },
    {
      name: 'numeric_roundtrip',
      sql: 'cash_send((amount::numeric)::money)',
      wire: true,
      pool: amounts,
      input: false,
    },
    { name: 'scalar', sql: 'amount::text', wire: false, pool: amounts, input: false },
    {
      name: 'array',
      sql: 'ARRAY[amount,NULL,amount]::text',
      wire: false,
      pool: amounts,
      input: false,
    },
    {
      name: 'record',
      sql: 'ROW(amount,ARRAY[amount])::text',
      wire: false,
      pool: amounts,
      input: false,
    },
    { name: 'json', sql: 'to_json(amount)::text', wire: false, pool: amounts, input: false },
    { name: 'jsonb', sql: 'to_jsonb(amount)::text', wire: false, pool: amounts, input: false },
    {
      name: 'json_array',
      sql: 'to_jsonb(ARRAY[amount,NULL])::text',
      wire: false,
      pool: amounts,
      input: false,
    },
    {
      name: 'json_record',
      sql: 'to_jsonb(ROW(amount,ARRAY[amount]))::text',
      wire: false,
      pool: amounts,
      input: false,
    },
    {
      name: 'json_keys',
      sql: "jsonb_build_object(amount,amount,'list',ARRAY[amount])::text",
      wire: false,
      pool: amounts,
      input: false,
    },
    {
      name: 'coalesce',
      sql: "COALESCE(amount::text,'fallback')",
      wire: false,
      pool: amounts,
      input: false,
    },
    {
      name: 'array_text',
      sql: 'cash_send((source::money[])[1])',
      wire: true,
      pool: arrayForms,
      input: true,
    },
  ]
  try {
    await pg.exec("SET lc_monetary='C';SET array_nulls=on;CREATE DOMAIN cash_amount AS money")
    for (const d of definitions)
      await pg.exec(
        `CREATE TABLE text_${d.name}(source text,amount cash_amount,expected_wire bytea,expected_text text,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE (${d.sql}) IS NOT DISTINCT FROM ${d.wire ? 'expected_wire' : 'expected_text'} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      profiles = [
        { name: 'C', context: { moneyLocale: 'C' as const } },
        { name: 'scale_only', context: { moneyFractionDigits: 2 } },
        { name: 'missing', context: {} },
      ]
    const groups = profiles.map((profile) =>
      prepareCheckRustGroup(
        definitions.flatMap((d) => {
          const table = catalog.tables.find((t) => t.name === 'text_' + d.name)!
          return ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: profile.name + '_' + d.name + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((c) => c.name === 'rule')!,
                [],
                catalog.domains,
                origin as 'source' | 'stored',
                [],
                catalog.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE (${d.sql}) IS NOT DISTINCT FROM ${d.wire ? 'expected_wire' : 'expected_text'} END)`
                  : undefined,
              )!.expression,
            ),
          }))
        }),
        { defaultCollation: 'C', serverEncoding: 'UTF8', arrayNulls: true, ...profile.context },
      ),
    )
    for (const group of groups)
      expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        ...groups[0]!,
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: {
          ...groups[0]!.source!,
          modules: groups[0]!.source!.modules.map((m) =>
            m.name === 'checks'
              ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
              : m,
          ),
        },
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const d of definitions)
      for (const sample of d.pool) {
        const source = d.input ? sample : null,
          amount = d.input ? null : sample
        let result: string | null = null,
          error: string | undefined
        try {
          result = (
            await pg.query<{ value: string | null }>(
              `WITH candidate AS MATERIALIZED(SELECT $1::text source,$2::money amount)SELECT ${d.wire ? `encode((${d.sql}),'hex')` : `(${d.sql})`}value FROM candidate`,
              [source, amount],
            )
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        const input: Row = {
          source: known(source),
          amount: known(null),
          expected_wire: known(d.wire ? result : null),
          expected_text: known(d.wire ? null : result),
          bypass: known(false),
        }
        if (amount !== null) {
          const wire = (
            await pg.query<{ value: string }>("SELECT encode(cash_send($1::money),'hex')value", [
              amount,
            ])
          ).rows[0]!.value
          input.amount = known(BigInt.asIntN(64, BigInt('0x' + wire)))
        }
        for (const bypass of [false, true]) {
          let outcome: Outcome = { kind: 'True' }
          try {
            await pg.query(
              `INSERT INTO text_${d.name}(source,amount,expected_wire,expected_text,bypass)VALUES($1,$2::money,decode($3,'hex'),$4,$5)`,
              [source, amount, d.wire ? result : null, d.wire ? null : result, bypass],
            )
          } catch (e) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          if (!bypass && error)
            expect(outcome).toEqual({ kind: 'Error', value: { state: parseInt(error, 36) } })
          for (const profile of profiles)
            for (const origin of ['source', 'stored']) {
              const zeroSource = source !== null && /^[ \t\r\n\f\v]*0*[ \t\r\n\f\v]*$/u.test(source)
              const independent =
                bypass ||
                sample === null ||
                (d.input && d.wire && d.name !== 'array_text' && zeroSource) ||
                (d.name === 'array_text' && ['{}', '{NULL}'].includes(sample!))
              fixtures.push({
                name: profile.name + '_' + d.name + '_' + origin,
                row: { ...input, bypass: known(bypass) },
                expected:
                  profile.name === 'C' ||
                  independent ||
                  (profile.name === 'scale_only' && d.name === 'numeric_roundtrip')
                    ? outcome
                    : { kind: 'Unknown' },
              })
            }
          reference.push({ name: d.name, sample, bypass, result, outcome })
        }
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        { nativeInserts: reference.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'money_text_context',
      group,
      profiles.flatMap((p) =>
        definitions.flatMap((d) =>
          ['source', 'stored'].map((o) => p.name + '_' + d.name + '_' + o),
        ),
      ),
      fixtures,
    )
    console.info('Money text parity', {
      nativeInserts: reference.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
