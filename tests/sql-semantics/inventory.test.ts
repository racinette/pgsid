import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { callableIdentity, readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import {
  PG18_BUILTIN_GROUPS,
  PG18_BUILTINS_VERSION,
} from '../../src/postgres/builtins/groups.generated.js'
import { PG18_NUMERIC } from '../../src/postgres/builtins/numeric.generated.js'
import { PG18_AGGREGATES } from '../../src/postgres/builtins/aggregates.generated.js'
import { PG18_WINDOWS } from '../../src/postgres/builtins/windows.generated.js'
import {
  builtinCallables,
  builtinMetadata,
  operatorMetadata,
  functionMetadata,
} from '../../src/postgres/builtins/inventory.js'
import { builtinDomain } from '../../src/postgres/builtins/taxonomy.js'
import { PG18_TYPE_NAMES } from '../../src/postgres/builtins/type-names.generated.js'
import type {
  CallableEmitter,
  CallableOperands,
  OperatorBindings,
} from '../../src/sql-semantics/signatures.js'
import type { BuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { functionNullability, operatorNullability } from '../../src/sql-semantics/nullability.js'

let pg: PGlite
let catalog: BuiltinCatalog

describe('PostgreSQL builtin inventory', () => {
  beforeAll(async () => {
    pg = await PGlite.create()
    catalog = await readBuiltinCatalog(pg)
  })
  afterAll(async () => {
    await pg.close()
  })

  it('matches every callable in the pinned catalog', () => {
    expect(catalog.serverVersion).toBe(PG18_BUILTINS_VERSION)
    const metadata = [
      ...catalog.functions.map((row) => row.metadata),
      ...catalog.operators.map((row) => row.metadata),
    ]
    const entries = metadata.map((row) => [callableIdentity(row), row])
    expect(new Set(entries.map(([key]) => key)).size).toBe(entries.length)
    expect(Object.fromEntries(entries)).toEqual(
      Object.fromEntries(builtinCallables().map((row) => [callableIdentity(row), row])),
    )
    const signatures = PG18_BUILTIN_GROUPS.flatMap((group) => Object.keys(group.inventory))
    expect(signatures.length).toBe(metadata.length)
    expect(new Set(signatures).size).toBe(metadata.length)
    expect(PG18_BUILTIN_GROUPS).toHaveLength(19)
    for (const { domain, inventory } of PG18_BUILTIN_GROUPS) {
      for (const [signature, row] of Object.entries(inventory)) {
        expect(signature).toBe(callableIdentity(row))
        expect(builtinDomain(row, PG18_TYPE_NAMES)).toBe(domain)
      }
    }
  })

  it('uses the pinned catalog conversion functions for integer and floating-point casts', async () => {
    const result = await pg.query<{
      source: string
      target: string
      function: string
      method: string
      context: string
    }>(`
      SELECT 'pg_catalog.' || source.typname AS source,
        'pg_catalog.' || target.typname AS target,
        p.proname AS function, c.castmethod AS method, c.castcontext AS context
      FROM pg_cast c
      JOIN pg_type source ON source.oid = c.castsource
      JOIN pg_type target ON target.oid = c.casttarget
      JOIN pg_proc p ON p.oid = c.castfunc
      WHERE c.castsource IN ('int2'::regtype, 'int4'::regtype, 'int8'::regtype, 'float4'::regtype, 'float8'::regtype)
        AND c.casttarget IN ('int2'::regtype, 'int4'::regtype, 'int8'::regtype, 'float4'::regtype, 'float8'::regtype)
    `)
    const castOrder = [
      'pg_catalog.int2',
      'pg_catalog.int4',
      'pg_catalog.int8',
      'pg_catalog.float4',
      'pg_catalog.float8',
    ]
    expect(result.rows).toHaveLength(20)
    for (const row of result.rows) {
      const signature = `function:${JSON.stringify(['pg_catalog', row.function])}(${row.source})`
      const metadata = functionMetadata(signature)
      expect(metadata.kind).toBe('function')
      expect(metadata.args).toEqual([row.source])
      expect(metadata.result).toBe(row.target)
      expect(row.method).toBe('f')
      expect(row.context).toBe(
        castOrder.indexOf(row.source) < castOrder.indexOf(row.target) ? 'i' : 'a',
      )
    }
  })

  it('keeps overloads, unary operators, and callable kinds distinct', () => {
    const int4Add = PG18_NUMERIC['operator:["pg_catalog","+"](pg_catalog.int4,pg_catalog.int4)']
    const int8Add = PG18_NUMERIC['operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)']
    const int4Plus = PG18_NUMERIC['operator:["pg_catalog","+"](,pg_catalog.int4)']
    expect(int4Add.result).toBe('pg_catalog.int4')
    expect(int8Add.result).toBe('pg_catalog.int8')
    expect(int4Plus.args).toEqual(['pg_catalog.int4'])
    expect(callableIdentity(int4Plus)).not.toBe(callableIdentity(int4Add))
    expect(PG18_NUMERIC['function:["pg_catalog","abs"](pg_catalog.int8)'].strict).toBe(true)
    expect(PG18_AGGREGATES['aggregate:["pg_catalog","sum"](pg_catalog.int8)'].kind).toBe(
      'aggregate',
    )
    expect(PG18_WINDOWS['window:["pg_catalog","row_number"]()'].kind).toBe('window')
  })

  it('rejects unknown signatures and incorrect callable kinds at lookup', () => {
    expect(() => builtinMetadata('missing')).toThrow('Unknown builtin signature')
    expect(() => operatorMetadata('function:["pg_catalog","abs"](pg_catalog.int8)')).toThrow(
      'Not an operator signature',
    )
    expect(() =>
      functionMetadata('operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)'),
    ).toThrow('Not a function signature')
  })

  it('classifies NULL behavior using the same overload identities as evaluation', () => {
    expect(
      operatorNullability('operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)'),
    ).toEqual({ strict: true, nonNullInputs: 'total' })
    expect(
      operatorNullability('operator:["pg_catalog","+"](pg_catalog.path,pg_catalog.path)'),
    ).toEqual({ strict: true, nonNullInputs: 'can-return-null' })
    expect(
      operatorNullability(
        'operator:["pg_catalog","||"](pg_catalog.anycompatiblearray,pg_catalog.anycompatiblearray)',
      ).strict,
    ).toBe(false)
    expect(functionNullability('function:["pg_catalog","abs"](pg_catalog.int8)')).toEqual({
      strict: true,
      nonNullInputs: 'total',
    })
  })

  it('carries exact catalog types into emitter operands and results', () => {
    type Add = (typeof PG18_NUMERIC)['operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)']
    type Operand = { type: 'pg_catalog.int8'; expression: number }
    expectTypeOf<CallableOperands<Add, number>>().toEqualTypeOf<readonly [Operand, Operand]>()
    expectTypeOf<ReturnType<CallableEmitter<Add, number>['emit']>>().toEqualTypeOf<Operand>()
    const binding: CallableEmitter<Add, number> = {
      helpers: ['int8Add'],
      emit: (metadata, operands) => ({ type: metadata.result, expression: operands[0].expression }),
    }
    const valid = {
      'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)': binding,
    } satisfies OperatorBindings<typeof PG18_NUMERIC, number>
    expect(Object.keys(valid)).toEqual([
      'operator:["pg_catalog","+"](pg_catalog.int8,pg_catalog.int8)',
    ])
    const wrongDomain = {
      // @ts-expect-error A known temporal overload cannot be implemented in the numeric group.
      'operator:["pg_catalog","+"](pg_catalog.date,pg_catalog.int4)': binding,
    } satisfies OperatorBindings<typeof PG18_NUMERIC, number>
    void wrongDomain
    const wrongKind = {
      // @ts-expect-error A function cannot be declared in an operator registry.
      'function:["pg_catalog","abs"](pg_catalog.int8)': binding,
    } satisfies OperatorBindings<typeof PG18_NUMERIC, number>
    void wrongKind
    const unknown = {
      // @ts-expect-error Unknown overloads cannot be declared supported.
      'operator:["pg_catalog","missing"]()': binding,
    } satisfies OperatorBindings<typeof PG18_NUMERIC, number>
    void unknown
  })
})
