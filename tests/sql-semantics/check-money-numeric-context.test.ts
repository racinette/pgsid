import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { parseConfigString } from '../../src/config/loader.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches captured money scale casts, rounding, storage bounds, containers and missing-context states in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-money-numeric-context-')),
    packet = 'artifacts/goal-checks/money-context-active'
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      "SET lc_monetary='C';CREATE DOMAIN cash_amount AS money;CREATE DOMAIN cash_decimal AS numeric",
    )
    const captured = (
      await pg.exec(await readFile('tools/check-rust/money-context.sql', 'utf8'))
    ).flatMap((r) => r.rows)[0]!
    expect(captured['moneyFractionDigits']).toBe(2)
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    checks: { moneyFractionDigits: ' +
        captured['moneyFractionDigits'] +
        ' }\n',
    ).sql.codegen!.checks!
    const numeric = [
      null,
      '0',
      '0.000000',
      '0.0049',
      '0.005',
      '-0.005',
      '1.235',
      '-1.235',
      '92233720368547758.074',
      '92233720368547758.075',
      '-92233720368547758.084',
      '-92233720368547758.085',
      '1e100',
      'NaN',
      'Infinity',
      '-Infinity',
    ]
    const integer = [
      null,
      '0',
      '1',
      '-1',
      '92233720368547758',
      '92233720368547759',
      '-92233720368547758',
      '-92233720368547759',
      '9223372036854775807',
      '-9223372036854775808',
    ]
    const amounts = [
      null,
      '0',
      '0.01',
      '-0.01',
      '1.25',
      '92233720368547758.07',
      '-92233720368547758.08',
    ]
    const definitions = [
      {
        name: 'decimal',
        argument: 'n',
        type: 'numeric',
        sql: 'cash_send(n::money)',
        samples: numeric,
      },
      {
        name: 'decimal_function',
        argument: 'n',
        type: 'numeric',
        sql: 'cash_send(money(n))',
        samples: numeric,
      },
      {
        name: 'wide',
        argument: 'i8',
        type: 'bigint',
        sql: 'cash_send(i8::money)',
        samples: integer,
      },
      {
        name: 'wide_function',
        argument: 'i8',
        type: 'bigint',
        sql: 'cash_send(money(i8))',
        samples: integer,
      },
      {
        name: 'integer',
        argument: 'i4',
        type: 'integer',
        sql: 'cash_send(i4::money)',
        samples: [null, '0', '1', '-1', '2147483647', '-2147483648'],
      },
      {
        name: 'to_numeric',
        argument: 'amount',
        type: 'money',
        sql: 'numeric_send(amount::numeric)',
        samples: amounts,
      },
      {
        name: 'to_numeric_function',
        argument: 'amount',
        type: 'money',
        sql: 'numeric_send(pg_catalog."numeric"(amount))',
        samples: amounts,
      },
      {
        name: 'domain',
        argument: 'n',
        type: 'numeric',
        sql: 'cash_send(n::cash_amount)',
        samples: numeric,
      },
      {
        name: 'array',
        argument: 'n',
        type: 'numeric',
        sql: 'cash_send((ARRAY[n]::money[])[1])',
        samples: numeric,
      },
    ]
    for (const d of definitions)
      await pg.exec(
        `CREATE TABLE scale_${d.name}(n cash_decimal,i4 integer,i8 bigint,amount cash_amount,expected bytea,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${d.sql} IS NOT DISTINCT FROM expected END))`,
      )
    const catalog = await snapshotCatalog(pg),
      profiles = [
        { name: 'captured', context: config },
        { name: 'missing', context: {} },
      ]
    const groups = profiles.map((profile) =>
      prepareCheckRustGroup(
        definitions.flatMap((d) => {
          const table = catalog.tables.find((t) => t.name === 'scale_' + d.name)!
          return ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: d.name + '_' + profile.name + '_' + origin,
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
                  ? `CHECK(CASE WHEN bypass THEN true ELSE ${d.sql} IS NOT DISTINCT FROM expected END)`
                  : undefined,
              )!.expression,
            ),
          }))
        }),
        profile.context,
      ),
    )
    for (const group of groups)
      expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n')
    const group = {
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
      for (const sample of d.samples) {
        let bytes: string | null = null,
          error: string | undefined
        try {
          bytes = (
            await pg.query<{ value: string | null }>(
              `SELECT encode(${d.sql},'hex') value FROM(SELECT $1::${d.type} ${d.argument})candidate`,
              [sample],
            )
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        const input: Row = {
          n: known(d.argument === 'n' ? sample : null),
          i4: known(d.argument === 'i4' && sample !== null ? Number(sample) : null),
          i8: known(d.argument === 'i8' && sample !== null ? BigInt(sample) : null),
          amount: known(null),
          expected: known(bytes),
          bypass: known(false),
        }
        if (d.argument === 'n' && sample !== null)
          input.n = known(
            (await pg.query<{ value: string }>('SELECT ($1::numeric)::text value', [sample]))
              .rows[0]!.value,
          )
        if (d.argument === 'amount' && sample !== null) {
          const wire = (
            await pg.query<{ value: string }>("SELECT encode(cash_send($1::money),'hex')value", [
              sample,
            ])
          ).rows[0]!.value
          input.amount = known(BigInt.asIntN(64, BigInt('0x' + wire)))
        }
        for (const bypass of [false, true]) {
          let outcome: Outcome = { kind: 'True' }
          try {
            await pg.query(
              `INSERT INTO scale_${d.name}(${d.argument},expected,bypass)VALUES($1::${d.type},decode($2,'hex'),$3)`,
              [sample, bytes, bypass],
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
              const independent =
                bypass ||
                sample === null ||
                (d.argument !== 'amount' && Number(sample) === 0) ||
                (d.type === 'numeric' && ['NaN', 'Infinity', '-Infinity'].includes(sample!))
              fixtures.push({
                name: d.name + '_' + profile.name + '_' + origin,
                row: { ...input, bypass: known(bypass) },
                expected:
                  profile.name === 'captured' || independent ? outcome : { kind: 'Unknown' },
              })
            }
          reference.push({ name: d.name, sample, bypass, bytes, outcome })
        }
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        { captured, nativeInserts: reference.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'money_numeric_context',
      group,
      profiles.flatMap((p) =>
        definitions.flatMap((d) =>
          ['source', 'stored'].map((o) => d.name + '_' + p.name + '_' + o),
        ),
      ),
      fixtures,
    )
    console.info('Money numeric parity', {
      nativeInserts: reference.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
