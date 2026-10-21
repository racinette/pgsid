import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import {
  capturedRangeType,
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeProfileSupport,
  rangeTypeOutput,
} from '../../src/sql-semantics/range-profiles.js'
import {
  catalogRangeType,
  catalogMultirangeType,
  catalogArrayType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import {
  catalogScalarType,
  isRangeType,
  isMultirangeType,
  arrayType,
  domainElementType,
} from '../../src/sql-semantics/expressions.js'
import { arrayElementIdentity, arrayInputPlan } from '../../src/codegen/shared/check-array-types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import type { RangeTypeInfo } from '../../src/catalog/types.js'

it('keeps builtin range identities and comparison/canonicalization modes', () => {
  for (const metadata of Object.values(PG18_RANGE_TYPES)) {
    const profile = rangeTypeProfile(metadata.identity)!
    expect(profile.rangeType).toBe(metadata.identity)
    expect(profile.multirangeType).toBe(metadata.multirange)
    expect(multirangeTypeProfile(metadata.multirange)).toEqual(profile)
    expect(rangeTypeOutput(metadata.identity)).toBe(
      'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    )
    expect(rangeTypeOutput(metadata.multirange)).toBe(
      'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    )
    expect(rangeProfileSupport(profile)).toEqual({
      comparison: {
        'pg_catalog.int4': 2,
        'pg_catalog.int8': 3,
        'pg_catalog.date': 7,
        'pg_catalog."numeric"': 10,
        'pg_catalog."timestamp"': 4,
        'pg_catalog.timestamptz': 5,
      }[metadata.subtype],
      canonical:
        metadata.canonical === null
          ? 1
          : { 'pg_catalog.int4': 2, 'pg_catalog.int8': 3, 'pg_catalog.date': 7 }[
              metadata.subtype as 'pg_catalog.int4'
            ],
    })
    expect(catalogScalarType(metadata.identity)).toBe(metadata.identity)
  }
})

it('binds internal builtin array names and bracket spellings in source and stored CHECKs', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE internal_array_names(payload text,
   CONSTRAINT integers CHECK(payload::pg_catalog._int4 IS NOT DISTINCT FROM payload::int4[]),
   CONSTRAINT ranges CHECK(payload::pg_catalog._int4range IS NOT DISTINCT FROM payload::int4range[]),
   CONSTRAINT multis CHECK(payload::pg_catalog._int4multirange IS NOT DISTINCT FROM payload::int4multirange[]),
   CONSTRAINT bits CHECK(payload::pg_catalog._bit IS NOT DISTINCT FROM payload::bit[]));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!
    for (const [check, type] of [
      ['integers', '_int4'],
      ['ranges', '_int4range'],
      ['multis', '_int4multirange'],
      ['bits', '_bit'],
    ])
      for (const origin of ['source', 'stored'] as const) {
        const constraint =
            origin === 'source'
              ? {
                  name: check!,
                  type: 'check' as const,
                  definition: `CHECK(payload::pg_catalog.${type} IS NOT DISTINCT FROM payload::pg_catalog.${type})`,
                }
              : table.constraints.find((c) => c.name === check)!,
          expression = lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
          )!.expression
        expect(hasUncertain(expression), check + '/' + origin).toBe(false)
        expect(prepareCheckRust(portableCheckAtoms(expression)).kind, check + '/' + origin).toBe(
          'supported',
        )
      }
  } finally {
    await pg.close()
  }
}, 30_000)

it('requires captured range, member and subtype output identities before local text output', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE output_span AS RANGE(subtype=int4);
      CREATE TABLE output_profiles(v output_span,m output_span_multirange,label text,
      CONSTRAINT scalar CHECK(v::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"),
      CONSTRAINT multi CHECK(m::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"),
      CONSTRAINT scalar_array CHECK(ARRAY[v]::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"),
      CONSTRAINT multi_array CHECK(ARRAY[m]::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!
    const profile = catalog.rangeTypes[0]!
    for (const check of table.constraints) {
      const lower = (range: RangeTypeInfo) =>
        lowerTableCheck(table, check, catalog.enums, catalog.domains, 'stored', [range])!.expression
      expect(prepareCheckRust(portableCheckAtoms(lower(profile))).kind).toBe('supported')
      const changes: Partial<RangeTypeInfo>[] = [
        { subtypeOutput: null },
        { subtypeOutput: 'function:["private","unknown_output"](pg_catalog.int4)' },
        { subtypeOutput: 'function:["pg_catalog","int8out"](pg_catalog.int8)' },
        { output: null },
        { output: 'function:["pg_catalog","textout"](pg_catalog.text)' },
        ...(check.name.includes('multi')
          ? [
              { multirangeOutput: null },
              {
                multirangeOutput: 'function:["private","unknown_output"](pg_catalog.anymultirange)',
              },
            ]
          : []),
      ]
      for (const change of changes) {
        const expression = lower({ ...profile, ...change })
        const prepared = prepareCheckRust(portableCheckAtoms(expression))
        expect(
          hasUncertain(expression) || prepared.kind === 'unsupported',
          JSON.stringify(change),
        ).toBe(true)
      }
    }
  } finally {
    await pg.close()
  }
}, 30_000)

it('requires selected range, multirange and scalar/domain input identities for custom text casts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE input_span AS RANGE(subtype=int4);
      CREATE DOMAIN positive_input AS int4 CHECK(VALUE>0);
      CREATE TYPE domain_input_span AS RANGE(subtype=positive_input);
      CREATE TABLE plain_input(payload text,CHECK(isempty(payload::input_span)));
      CREATE TABLE domain_input(payload text,CHECK(isempty(payload::domain_input_span)));
      CREATE TABLE plain_multi_input(payload text,CHECK(isempty(payload::input_span_multirange)));
      CREATE TABLE domain_multi_input(payload text,CHECK(isempty(payload::domain_input_span_multirange)));
      CREATE TABLE plain_array_input(payload text,CHECK(cardinality(payload::input_span[])>0));
      CREATE TABLE domain_array_input(payload text,CHECK(cardinality(payload::domain_input_span[])>0));
      CREATE TABLE plain_multi_array_input(payload text,CHECK(cardinality(payload::input_span_multirange[])>0));
      CREATE TABLE domain_multi_array_input(payload text,CHECK(cardinality(payload::domain_input_span_multirange[])>0));
      CREATE TABLE plain_array_io(payload text,CHECK(cardinality(ARRAY[payload]::text[]::input_span[])>0));
      CREATE TABLE domain_array_io(payload text,CHECK(cardinality(ARRAY[payload]::text[]::domain_input_span[])>0));
      CREATE TABLE plain_multi_array_io(payload text,CHECK(cardinality(ARRAY[payload]::text[]::input_span_multirange[])>0));
      CREATE TABLE domain_multi_array_io(payload text,CHECK(cardinality(ARRAY[payload]::text[]::domain_input_span_multirange[])>0));`)
    const catalog = await snapshotCatalog(pg)
    for (const table of catalog.tables) {
      const profile = catalog.rangeTypes.find(
        (profile) =>
          profile.name === (table.name.startsWith('plain_') ? 'input_span' : 'domain_input_span'),
      )!
      const lower = (range: RangeTypeInfo) =>
        lowerTableCheck(table, table.constraints[0]!, catalog.enums, catalog.domains, 'stored', [
          range,
        ])!.expression
      expect(prepareCheckRust(portableCheckAtoms(lower(profile))).kind).toBe('supported')
      for (const change of [
        { input: null },
        {
          input:
            'function:["private","range_input"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
        },
        { subtypeInput: null },
        { subtypeInput: 'function:["private","scalar_input"](pg_catalog.cstring)' },
        { subtypeInput: 'function:["pg_catalog","int8in"](pg_catalog.cstring)' },
        ...(table.name.includes('multi')
          ? [
              { multirangeInput: null },
              {
                multirangeInput:
                  'function:["private","multirange_input"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
              },
            ]
          : []),
      ]) {
        const expression = lower({ ...profile, ...change })
        expect(
          hasUncertain(expression) ||
            prepareCheckRust(portableCheckAtoms(expression)).kind === 'unsupported',
        ).toBe(true)
      }
    }
  } finally {
    await pg.close()
  }
}, 30_000)

it('requires selected subtype hash and send links for custom scalar and array binary operations', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE DOMAIN hash_bound AS int4 CHECK(VALUE>0);CREATE TYPE hash_span AS RANGE(subtype=hash_bound,multirange_type_name=hash_set);
   CREATE TABLE custom_binary_links(v hash_span,m hash_set,a hash_span[],b hash_set[],
    CONSTRAINT wire CHECK(range_send(v) IS NOT NULL),CONSTRAINT multi_wire CHECK(multirange_send(m) IS NOT NULL),
    CONSTRAINT scalar32 CHECK(hash_range(v)=0),CONSTRAINT scalar64 CHECK(hash_range_extended(v,1)=0),
    CONSTRAINT multi32 CHECK(hash_multirange(m)=0),CONSTRAINT multi64 CHECK(hash_multirange_extended(m,1)=0),
    CONSTRAINT array32 CHECK(hash_array(a)=0),CONSTRAINT array64 CHECK(hash_array_extended(a,1)=0),
    CONSTRAINT array_multi32 CHECK(hash_array(b)=0),CONSTRAINT array_multi64 CHECK(hash_array_extended(b,1)=0));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!,
      profile = catalog.rangeTypes[0]!
    for (const check of table.constraints) {
      const prepare = (change: Partial<RangeTypeInfo>) =>
        prepareCheckRust(
          portableCheckAtoms(
            lowerTableCheck(table, check, catalog.enums, catalog.domains, 'stored', [
              { ...profile, ...change },
            ])!.expression,
          ),
        )
      expect(prepare({}).kind, check.name).toBe('supported')
      const fields: (keyof RangeTypeInfo)[] = check.name.includes('wire')
        ? [
            'subtypeSend',
            'send',
            ...(check.name === 'multi_wire' ? ['multirangeSend' as const] : []),
          ]
        : [check.name.endsWith('64') ? 'subtypeHashExtended' : 'subtypeHash']
      for (const field of fields)
        for (const value of [
          null,
          'function:["private","unavailable"](pg_catalog.int4)',
          'function:["pg_catalog","int8send"](pg_catalog.int8)',
        ])
          expect(prepare({ [field]: value }).kind, check.name + '/' + field + '/' + value).toBe(
            !check.name.includes('wire') && value === null ? 'supported' : 'unsupported',
          )
      expect(
        prepare({
          input: null,
          output: null,
          multirangeInput: null,
          multirangeOutput: null,
          subtypeInput: null,
          subtypeOutput: null,
        }).kind,
        check.name + '/independent-text-io',
      ).toBe('supported')
    }
  } finally {
    await pg.close()
  }
}, 30_000)

it('resolves captured qualified identities, companion namespaces and domain subtypes independently of catalog OIDs', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  const ddl = `
CREATE SCHEMA "Types.A";CREATE SCHEMA "Types.B";
CREATE DOMAIN "Types.A".positive AS int4 CHECK(VALUE>0);
CREATE TYPE "Types.A".span AS RANGE(subtype="Types.A".positive,multirange_type_name=span_set);
CREATE TYPE "Types.B".span AS RANGE(subtype=int4);
CREATE TYPE "Types.A".discrete;
CREATE FUNCTION "Types.A".canon("Types.A".discrete) RETURNS "Types.A".discrete AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE TYPE "Types.A".discrete AS RANGE(subtype=int4,canonical="Types.A".canon);
CREATE DOMAIN "Types.A".nested AS "Types.A".span;
CREATE TABLE "Types.A".values(value "Types.A".nested,multiple public.span_set);
CREATE DOMAIN "Types.A".span_list AS "Types.A".span[];
CREATE DOMAIN "Types.A".list_alias AS "Types.A".span_list;
CREATE TABLE "Types.A".arrays(value "Types.A".list_alias,typed "Types.A".nested[],history "Types.A".span_list[],multiple public.span_set[]);
`
  try {
    await first.exec(ddl)
    await second.exec('CREATE TABLE discarded(value text);DROP TABLE discarded;' + ddl)
    const a = await snapshotCatalog(first),
      b = await snapshotCatalog(second)
    expect(a.tables[0]!.columns[0]!.typeOid).not.toBe(b.tables[0]!.columns[0]!.typeOid)
    const encode = (catalog: typeof a) =>
      catalog.rangeTypes.map((info) => capturedRangeType(info, 'pg_catalog.int4')!)
    expect(encode(a)).toEqual(encode(b))
    const info = a.rangeTypes.find((r) => r.identity === '"Types.A".span')!
    const encoded = capturedRangeType(info, 'pg_catalog.int4')!
    expect(capturedRangeType({ ...info, ...{ oid: 12345 } }, 'pg_catalog.int4')).toBe(encoded)
    expect(isRangeType(encoded)).toBe(true)
    expect(catalogScalarType(encoded)).toBe(encoded)
    const profile = rangeTypeProfile(encoded)!
    expect(profile).toMatchObject({
      identity: '"Types.A".span',
      subtype: '"Types.A".positive',
      elementType: 'pg_catalog.int4',
      multirange: 'public.span_set',
      captured: true,
    })
    expect(rangeProfileSupport(profile)).toEqual({ comparison: 2, canonical: 1 })
    expect(rangeTypeOutput(encoded)).toBe(
      'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    )
    expect(profile.subtypeOutput).toBe('function:["pg_catalog","int4out"](pg_catalog.int4)')
    expect(isMultirangeType(profile.multirangeType)).toBe(true)
    expect(multirangeTypeProfile(profile.multirangeType)).toEqual(profile)
    const arrays = a.tables.find((t) => t.schema === 'Types.A' && t.name === 'arrays')!
    const resolve = (name: string, oid?: number) =>
      catalogArrayType(name, oid, a.domains, a.enums, a.rangeTypes)
    expect(resolve(info.array)).toBe(arrayType(encoded))
    expect(resolve(info.identity + '[]')).toBe(arrayType(encoded))
    expect(resolve(info.multirangeArray)).toBe(arrayType(profile.multirangeType))
    expect(resolve(info.multirange + '[]')).toBe(arrayType(profile.multirangeType))
    const nested = domainElementType({ schema: 'Types.A', name: 'nested' }, encoded),
      list = domainElementType({ schema: 'Types.A', name: 'span_list' }, arrayType(encoded))
    const expectedArrays = [
      arrayType(encoded),
      arrayType(nested),
      arrayType(list),
      arrayType(profile.multirangeType),
    ]
    for (const [index, column] of arrays.columns.entries())
      expect(resolve(column.typeName, column.typeOid)).toBe(expectedArrays[index])
    expect(arrayElementIdentity(encoded)).toBe(info.identity)
    expect(arrayElementIdentity(profile.multirangeType)).toBe(info.multirange)
    expect(arrayElementIdentity(nested)).toBe('"Types.A"."nested"')
    expect(arrayElementIdentity(list)).toBe('"Types.A"."span_list"')
    const plans = expectedArrays.map((type) => arrayInputPlan(type))
    expect(plans).toEqual([
      [info.identity, '*', info.identity, info.subtype, '\x02', '\x02', '\x01'],
      ['"Types.A"."nested"', '*', info.identity, info.subtype, '\x02', '\x02', '\x01'],
      [
        '"Types.A"."span_list"\0' + info.identity,
        ')*',
        info.identity,
        info.subtype,
        '\x02',
        '\x02',
        '\x01',
      ],
      [info.multirange, '+', info.multirange, info.identity, info.subtype, '\x02', '\x02', '\x01'],
    ])
    const otherArrays = b.tables.find((t) => t.schema === 'Types.A' && t.name === 'arrays')!
    expect(
      otherArrays.columns.map((column) =>
        arrayInputPlan(
          catalogArrayType(column.typeName, column.typeOid, b.domains, b.enums, b.rangeTypes)!,
        ),
      ),
    ).toEqual(plans)
    expect(catalogArrayType(info.identity + '[]', undefined, a.domains, a.enums)).toBeNull()
    expect(resolve('span[]')).toBeNull()
    expect(resolve('"Types.A".missing[]')).toBeNull()
    const table = a.tables.find((t) => t.schema === 'Types.A' && t.name === 'values')!
    expect(
      catalogRangeType(
        table.columns[0]!.typeName,
        table.columns[0]!.typeOid,
        a.domains,
        a.rangeTypes,
      ),
    ).toBe(encoded)
    expect(
      catalogMultirangeType(
        table.columns[1]!.typeName,
        table.columns[1]!.typeOid,
        a.domains,
        a.rangeTypes,
      ),
    ).toBe(profile.multirangeType)
    expect(catalogRangeType('span', undefined, a.domains, a.rangeTypes)).toBeNull()
    expect(catalogRangeType('"Types.A".span[]', undefined, a.domains, a.rangeTypes)).toBeNull()
    expect(catalogRangeType('"Types.A".span(1)', undefined, a.domains, a.rangeTypes)).toBeNull()
    const discrete = rangeTypeProfile(
      encode(a).find((r) => rangeTypeProfile(r)!.name === 'discrete')!,
    )!
    expect(rangeProfileSupport(discrete)).toEqual({ comparison: 2, canonical: 0 })
    const alternative = capturedRangeType(
      { ...info, comparator: 'function:["Types.A","compare"](pg_catalog.int4,pg_catalog.int4)' },
      'pg_catalog.int4',
    )!
    expect(rangeProfileSupport(rangeTypeProfile(alternative)!)).toEqual({
      comparison: 0,
      canonical: 1,
    })
    expect(capturedRangeType(info, 'pg_catalog."json"')).toBeNull()
    for (const bad of [
      'range:',
      'range:{}',
      'range:[]',
      'multirange:null',
      encoded.replace(
        '"elementType":"pg_catalog.int4"',
        '"elementType":' + JSON.stringify('pg_catalog."json"'),
      ),
      encoded.replace('"elementType":', '"oid":42,"elementType":'),
    ]) {
      expect(rangeTypeProfile(bad)).toBeNull()
      expect(multirangeTypeProfile(bad)).toBeNull()
      expect(catalogScalarType(bad)).toBeNull()
    }
  } finally {
    await first.close()
    await second.close()
  }
}, 30_000)

it('captures JSON function casts independently for ranges and multiranges while ignoring JSONB-only and I/O casts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA "Json.Types";
      CREATE TYPE "Json.Types".plain AS RANGE(subtype=int4,multirange_type_name=plain_set);
      CREATE TYPE "Json.Types".converted AS RANGE(subtype=int4,multirange_type_name=converted_set);
      CREATE FUNCTION "Json.Types".convert("Json.Types".converted) RETURNS json LANGUAGE SQL IMMUTABLE AS $$SELECT '{"range":true}'::json$$;
      CREATE FUNCTION "Json.Types".convert(public.converted_set) RETURNS json LANGUAGE SQL IMMUTABLE AS $$SELECT '{"multi":true}'::json$$;
      CREATE CAST("Json.Types".converted AS json) WITH FUNCTION "Json.Types".convert("Json.Types".converted);
      CREATE CAST(public.converted_set AS json) WITH FUNCTION "Json.Types".convert(public.converted_set);
      CREATE TYPE "Json.Types".binary_only AS RANGE(subtype=int4);
      CREATE FUNCTION "Json.Types".binary_json("Json.Types".binary_only) RETURNS jsonb LANGUAGE SQL IMMUTABLE AS $$SELECT '{"binary":true}'::jsonb$$;
      CREATE CAST("Json.Types".binary_only AS jsonb) WITH FUNCTION "Json.Types".binary_json("Json.Types".binary_only);
      CREATE TYPE "Json.Types".io_only AS RANGE(subtype=int4);
      CREATE CAST("Json.Types".io_only AS json) WITH INOUT;`)
    const catalog = await snapshotCatalog(pg)
    for (const name of ['plain', 'binary_only', 'io_only']) {
      const profile = catalog.rangeTypes.find((profile) => profile.name === name)!
      expect(profile).toMatchObject({
        jsonConversion: 'output',
        multirangeJsonConversion: 'output',
        jsonCast: null,
        multirangeJsonCast: null,
      })
      expect(
        (
          await pg.query<{ value: string }>(
            `SELECT to_jsonb('[1,3)'::"Json.Types".${name})::text value`,
          )
        ).rows[0]!.value,
      ).toBe('"[1,3)"')
    }
    const profile = catalog.rangeTypes.find((profile) => profile.name === 'converted')!
    expect(profile).toMatchObject({
      jsonConversion: 'cast',
      multirangeJsonConversion: 'cast',
      jsonCast: 'function:["Json.Types","convert"]("Json.Types".converted)',
      multirangeJsonCast: 'function:["Json.Types","convert"](public.converted_set)',
    })
    await pg.exec('DROP CAST(public.converted_set AS json)')
    const rangeOnly = (await snapshotCatalog(pg)).rangeTypes.find(
      (profile) => profile.name === 'converted',
    )!
    expect(rangeOnly).toMatchObject({
      jsonConversion: 'cast',
      multirangeJsonConversion: 'output',
      multirangeJsonCast: null,
    })
    await pg.exec(`DROP CAST("Json.Types".converted AS json);
      CREATE CAST(public.converted_set AS json) WITH FUNCTION "Json.Types".convert(public.converted_set);`)
    const multiOnly = (await snapshotCatalog(pg)).rangeTypes.find(
      (profile) => profile.name === 'converted',
    )!
    expect(multiOnly).toMatchObject({
      jsonConversion: 'output',
      jsonCast: null,
      multirangeJsonConversion: 'cast',
    })
    await pg.exec(
      'CREATE CAST("Json.Types".converted AS json) WITH FUNCTION "Json.Types".convert("Json.Types".converted)',
    )
    const encoded = capturedRangeType(profile, 'pg_catalog.int4')!
    expect(rangeTypeProfile(encoded)).toMatchObject({
      jsonConversion: 'cast',
      multirangeJsonConversion: 'cast',
      jsonCast: profile.jsonCast,
      multirangeJsonCast: profile.multirangeJsonCast,
    })
    for (const category of ['label', true, {}, '']) {
      const data = JSON.parse(encoded.slice(6)) as Record<string, unknown>
      data['jsonConversion'] = category
      expect(rangeTypeProfile('range:' + JSON.stringify(data))).toBeNull()
    }
    for (const type of ['"Json.Types".converted', 'public.converted_set']) {
      const text = type.startsWith('public.') ? '{[1,3)}' : '[1,3)'
      const reference = type.startsWith('public.') ? '{"multi":true}' : '{"range":true}'
      for (const fn of ['to_json', 'to_jsonb'])
        expect(
          (
            await pg.query<{ value: boolean }>(`SELECT ${fn}($1::${type})::jsonb=$2::jsonb value`, [
              text,
              reference,
            ])
          ).rows[0]!.value,
        ).toBe(true)
    }
  } finally {
    await pg.close()
  }
}, 30_000)
