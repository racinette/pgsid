import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { bindCatalogCheck } from '../../src/sql-semantics/catalog-check-binder.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves captured float bits and selected narrowing casts across row evolution and lazy composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-float-evolution-')),
    artifact = 'artifacts/goal-checks/float-row-constants-active'
  try {
    await pg.exec(`CREATE TYPE ip AS(n int4,old int4);CREATE TYPE fp AS(n int4,old float4);
      CREATE TYPE dp AS(n int4,old float8);`)
    const forms: Record<string, string> = {
      mixed: "ROW(n,'1.00000006'::float8)::fp IS DISTINCT FROM ROW(m,'1.00000006'::float8)::dp",
      mixed_integer:
        "ROW(n,'1.00000006'::float8)::ip IS DISTINCT FROM ROW(m,'1.00000006'::float8)::dp",
      underflow: "ROW(n,'1e-100'::float8)::fp IS DISTINCT FROM ROW(m,0::float8)::dp",
      overflow: "ROW(n,'1e100'::float8)::fp IS DISTINCT FROM ROW(m,0::float8)::dp",
      integer: "ROW(n,'2.5'::float8)::ip IS DISTINCT FROM ROW(m,2)::ip",
      integer_error: "ROW(n,'Infinity'::float8)::ip IS DISTINCT FROM ROW(m,0)::ip",
      removed: "ROW(n,'1.0000000000000002'::float8)::dp IS NOT NULL",
      removed_single: "ROW(n,'1.401298464324817e-45'::float4)::fp IS NOT NULL",
      removed_double: "ROW(n,'5e-324'::float8)::dp IS NOT NULL",
      removed_nan: "ROW(n,'NaN'::float8)::dp IS NOT NULL",
      removed_infinity: "ROW(n,'-Infinity'::float4)::fp IS NOT NULL",
      removed_zero:
        "ROW(n,CASE WHEN get_byte(float8send('-0'::float8),0)=128 THEN 1/n ELSE NULL::int4 END)::ip IS NOT NULL",
      wire_single:
        "ROW(n,CASE WHEN float4send('NaN'::float4)=expected THEN 1/n ELSE 0 END)::ip IS NOT NULL",
      wire_double:
        "ROW(n,CASE WHEN float8send('NaN'::float8)=expected THEN 1/n ELSE 0 END)::ip IS NOT NULL",
      removed_error: "ROW(n,'NaN'::float8::int4)::ip IS NOT NULL",
      removed_json:
        "to_jsonb(ROW(n,'-0'::float8)::dp) IS NOT DISTINCT FROM jsonb_build_object('n',n)",
      removed_array: "cardinality(ARRAY[ROW(n,'NaN'::float4)::fp IS NOT NULL])=1",
    }
    for (const [name, expression] of Object.entries(forms))
      for (const witness of [false, true])
        await pg.exec(`CREATE TABLE ${witness ? 'null_' : 'evolving_'}${name}(n int4,m int4,expected bytea,bypass bool,
          CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${expression} END${witness ? ') IS NULL' : ''}))`)
    await pg.exec(`ALTER TYPE ip DROP ATTRIBUTE old;ALTER TYPE fp DROP ATTRIBUTE old;
      ALTER TYPE dp DROP ATTRIBUTE old;`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'evolving_' + name)!,
          constraint = table.constraints[0]!
        expect(constraint.rowCoercionContext?.complete, name).toBe(true)
        expect(JSON.stringify(constraint.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name).toBe('supported')
    const known = (value: number | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const name of Object.keys(forms))
      for (const [n, m, wrongWire] of [
        [1, 1, false],
        [1, 2, false],
        [0, 0, false],
        [null, null, false],
        [-1, 1, false],
        [0, 0, true],
      ] as const)
        for (const bypass of [false, true]) {
          const bytes = Buffer.from(name === 'wire_single' ? '7fc00000' : '7ff8000000000000', 'hex')
          if (wrongWire) bytes[0] = bytes[0]! ^ 255
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${name} VALUES($1,$2,$3,$4)`, [
              n,
              m,
              bytes,
              bypass,
            ])
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error) {
            try {
              await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3,$4)`, [n, m, bytes, bypass])
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          }
          const expected: Outcome = error
              ? error === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: isNull ? 'Null' : 'True' },
            row: Row = {
              n: known(n),
              m: known(m),
              expected: { kind: 'Value', value: bytes.toString('hex') },
              bypass: known(bypass),
            }
          reference.push({ name, n, m, bypass, wrongWire, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
    for (const name of Object.keys(forms))
      for (const origin of ['source', 'stored']) {
        const native = reference.find((r) => {
          const row = r as { name: string; n: number; bypass: boolean }
          return row.name === name && row.n === 1 && row.bypass
        }) as { expected: Outcome }
        fixtures.push({
          name: name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            m: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: native.expected,
        })
      }
    await mkdir(artifact, { recursive: true })
    await writeFile(join(artifact, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await writeFile(
      join(artifact, 'native-reference.json'),
      JSON.stringify(reference, null, 2) + '\n',
    )
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-float-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('preserves captured float payloads through binary send while keeping uncaptured NaN precision unknown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-float-literal-precision-')),
    artifact = 'artifacts/goal-checks/float-row-constants-active'
  try {
    const plans: {
        name: string
        identity: { schema: string; kind: 'table'; owner: string; constraint: string }
        expression: EvalBoolExpression
      }[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [type, patterns] of [
      [
        'float4',
        [
          '00000000',
          '80000000',
          '00000001',
          '007fffff',
          '00800000',
          '3dcccccd',
          '7f7fffff',
          '7f800000',
          'ff800000',
          '7fc00001',
          '7f800001',
          'ffc01234',
        ],
      ],
      [
        'float8',
        [
          '0000000000000000',
          '8000000000000000',
          '0000000000000001',
          '000fffffffffffff',
          '0010000000000000',
          '3fb999999999999b',
          '7fefffffffffffff',
          '7ff0000000000000',
          'fff0000000000000',
          '7ff8000000000001',
          '7ff0000000000001',
          'fff8000000001234',
        ],
      ],
    ] as const)
      for (const [index, bits] of patterns.entries()) {
        const bound = bindCatalogCheck(
          [{ name: 'expected', typeName: 'pg_catalog.bytea' }],
          {
            A_Expr: {
              kind: 'AEXPR_OP',
              name: [{ String: { sval: '=' } }],
              lexpr: {
                FuncCall: {
                  funcname: [
                    { String: { sval: 'pg_catalog' } },
                    { String: { sval: type + 'send' } },
                  ],
                  args: [{ PgsidStoredFloat: { type: 'pg_catalog.' + type, bits } }],
                },
              },
              rexpr: { ColumnRef: { fields: [{ String: { sval: 'expected' } }] } },
            },
          },
          [],
        ).expression
        for (const captured of [true, false]) {
          const name = type + '_' + index + '_' + captured,
            expression = structuredClone(bound)
          const visit = (value: unknown): void => {
            if (Array.isArray(value)) value.forEach(visit)
            else if (value && typeof value === 'object') {
              const node = value as Record<string, unknown>
              if (!captured && node['kind'] === 'float') delete node['exact']
              Object.values(node).forEach(visit)
            }
          }
          visit(expression)
          plans.push({
            name,
            identity: {
              schema: 'public',
              kind: 'table',
              owner: 'float_precision',
              constraint: name,
            },
            expression,
          })
          const semanticNan = !captured && index >= 9,
            wrong = bits.slice(0, -1) + (bits.at(-1) === '0' ? '1' : '0')
          fixtures.push(
            {
              name,
              row: { expected: { kind: 'Value', value: bits } },
              expected: { kind: semanticNan ? 'Unknown' : 'True' },
            },
            {
              name,
              row: { expected: { kind: 'Value', value: wrong } },
              expected: { kind: semanticNan ? 'Unknown' : 'False' },
            },
            { name, row: { expected: { kind: 'Null' } }, expected: { kind: 'Null' } },
            { name, row: { expected: { kind: 'Unknown' } }, expected: { kind: 'Unknown' } },
          )
        }
      }
    const group = prepareCheckRustGroup(plans)
    for (const check of group.checks) expect(check.kind).toBe('supported')
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'precision-fixtures.json'),
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(join(artifact, 'precision-plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/float-literal-precision',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
