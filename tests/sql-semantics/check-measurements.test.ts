import { jsonInputForms, invalidJsonInputForms } from './check-json-input-forms.js'
import {
  jsonbInputForms,
  invalidJsonbInputForms,
  deferredJsonbEncodingForms,
} from './check-jsonb-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import type { BuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { builtinMetadata, builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import {
  callableBoundary,
  verifyCatalog,
  jsonValueRequirements,
  hashValueRequirements,
  characterValueRequirements,
} from '../../scripts/check-measurements/catalog.js'
import {
  bindProbe,
  hasUncertain,
  inspectExpression,
  valueRepresentation,
} from '../../scripts/check-measurements/probes.js'
import { verifyWorldDigest } from '../../scripts/check-measurements/worlds.js'
import { measureTypes } from '../../scripts/check-measurements/types.js'
import { measureCoercions } from '../../scripts/check-measurements/coercions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { snapshotInputForms, invalidSnapshotInputForms } from './check-snapshot-input-forms.js'

describe('CHECK measurement boundaries', () => {
  let pg: PGlite
  let catalog: BuiltinCatalog
  beforeAll(async () => {
    pg = await PGlite.create()
    catalog = await readBuiltinCatalog(pg)
  })
  afterAll(async () => pg.close())

  it('rejects catalog drift, duplicate overload identities, and changed cast links', () => {
    expect(() => verifyCatalog(catalog)).not.toThrow()
    const version = structuredClone(catalog)
    version.serverVersion++
    expect(() => verifyCatalog(version)).toThrow('version mismatch')
    const missing = structuredClone(catalog)
    missing.functions.pop()
    expect(() => verifyCatalog(missing)).toThrow('callable metadata')
    const duplicate = structuredClone(catalog)
    duplicate.functions.push(duplicate.functions[0]!)
    expect(() => verifyCatalog(duplicate)).toThrow('Duplicate callable identity')
    const altered = structuredClone(catalog)
    altered.operators[0]!.metadata.implementation = 'missing'
    expect(() => verifyCatalog(altered)).toThrow('callable metadata')
    const cast = structuredClone(catalog)
    cast.casts[0]!.method = cast.casts[0]!.method === 'b' ? 'f' : 'b'
    expect(() => verifyCatalog(cast)).toThrow('cast links')
    const type = structuredClone(catalog)
    type.types[0]!.preferred = !type.types[0]!.preferred
    expect(() => verifyCatalog(type)).toThrow('type resolution metadata')
    const btree = structuredClone(catalog)
    btree.btreeComparisons[0]!.comparator = null
    expect(() => verifyCatalog(btree)).toThrow('B-tree comparison links')
    const duplicateBtree = structuredClone(catalog)
    duplicateBtree.btreeComparisons.push(duplicateBtree.btreeComparisons[0]!)
    expect(() => verifyCatalog(duplicateBtree)).toThrow('Duplicate B-tree comparison')
    const io = structuredClone(catalog)
    io.typeIO[0]!.output = null
    expect(() => verifyCatalog(io)).toThrow('type I/O links')
    for (const member of ['send', 'receive'] as const) {
      const binaryIO = structuredClone(catalog)
      binaryIO.typeIO.find((entry) => entry.identity === 'pg_catalog.int4')![member] = null
      expect(() => verifyCatalog(binaryIO)).toThrow('type I/O links')
    }
    const duplicateIO = structuredClone(catalog)
    duplicateIO.typeIO.push(duplicateIO.typeIO[0]!)
    expect(() => verifyCatalog(duplicateIO)).toThrow('Duplicate type I/O identity')
    const range = structuredClone(catalog)
    range.rangeTypes[0]!.canonical = null
    expect(() => verifyCatalog(range)).toThrow('range support links')
    const duplicateRange = structuredClone(catalog)
    duplicateRange.rangeTypes.push(duplicateRange.rangeTypes[0]!)
    expect(() => verifyCatalog(duplicateRange)).toThrow('Duplicate range identity')
  })

  it('keeps session requirements and new representations outside the pure callable queue', async () => {
    const represented = new Set(['pg_catalog.text', 'pg_catalog.int4'])
    const integer = builtinMetadata('function:["pg_catalog","abs"](pg_catalog.int4)')
    expect(callableBoundary(integer, represented)).toEqual({
      categories: ['pure-callable-candidate'],
      missingTypes: [],
    })
    const quoteIdent = builtinMetadata('function:["pg_catalog","quote_ident"](pg_catalog.text)')
    expect(quoteIdent.volatility).toBe('i')
    expect(callableBoundary(quoteIdent, represented).categories).toContain(
      'session-setting:quote_all_identifiers',
    )
    const float = builtinMetadata('function:["pg_catalog","abs"](pg_catalog.float8)')
    expect(callableBoundary(float, represented)).toEqual({
      categories: ['new-representation'],
      missingTypes: ['pg_catalog.float8'],
    })
    for (const { metadata: fn } of catalog.functions.filter(
      ({ metadata }) =>
        metadata.volatility === 's' &&
        [...metadata.args, metadata.result].includes('pg_catalog.money'),
    ))
      expect(
        callableBoundary(
          fn,
          new Set([
            'pg_catalog.money',
            'pg_catalog.int4',
            'pg_catalog.int8',
            'pg_catalog."numeric"',
          ]),
        ).categories,
      ).toContain('session-setting:lc_monetary')
    for (const name of [
      'hashbytea',
      'hashinet',
      'hashmacaddr',
      'uuid_hash',
      'hash_numeric',
      'hashtid',
      'hashtext',
      'hashname',
    ]) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      const requirements = hashValueRequirements(fn)!
      expect(requirements[0]!.kind, name).toBe('platform')
      expect(
        requirements.every(
          (requirement) => requirement.owner === 'tests/sql-semantics/check-native-hash.test.ts',
        ),
      ).toBe(true)
      expect(requirements.some((requirement) => requirement.kind === 'database')).toBe(
        ['hashtext', 'hashname'].includes(name),
      )
    }
    for (const name of [
      'hashfloat4',
      'hashfloat4extended',
      'hashfloat8',
      'hashfloat8extended',
      'jsonb_hash',
      'jsonb_hash_extended',
    ]) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      const requirements = hashValueRequirements(fn)!
      expect(requirements[0]!.kind, name).toBe('platform')
      expect(
        requirements.every(
          (requirement) => requirement.owner === 'tests/sql-semantics/check-scalar-hash.test.ts',
        ),
      ).toBe(true)
      expect(requirements.some((requirement) => requirement.kind === 'database')).toBe(
        name.startsWith('jsonb_'),
      )
      if (name.startsWith('hashfloat'))
        expect(
          requirements.some((requirement) =>
            requirement.requirement.includes('canonical float8 NaN'),
          ),
        ).toBe(true)
    }
    for (const name of ['hash_array', 'hash_array_extended']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      const requirements = hashValueRequirements(fn)!
      expect(requirements.map(({ kind }) => kind)).toEqual([
        'database',
        'platform',
        'database',
        'database',
      ])
      expect(requirements.map(({ owner }) => owner)).toEqual([
        'tests/sql-semantics/check-array-hash-families.test.ts',
        'tests/sql-semantics/check-array-hash-context.test.ts',
        'tests/sql-semantics/check-array-hash-context.test.ts',
        'tests/sql-semantics/check-array-hash-state.test.ts',
      ])
      expect(requirements[0]!.requirement).toContain('42883')
      expect(requirements[1]!.requirement).toContain('whole-array')
      expect(requirements[3]!.requirement).toContain('actual label OIDs')
    }
    for (const name of ['textsend', 'namesend', 'json_send', 'jsonb_send']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'session-setting:client_encoding',
      )
    }
    for (const name of ['json_send', 'jsonb_send']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(
        jsonValueRequirements(fn)?.map(({ kind, setting, owner }) => ({ kind, setting, owner })),
      ).toEqual([
        {
          kind: 'session',
          setting: 'client_encoding',
          owner: 'tests/sql-semantics/check-json-binary.test.ts',
        },
        ...(name === 'jsonb_send'
          ? [
              {
                kind: 'database',
                setting: 'server_encoding',
                owner: 'tests/sql-semantics/check-json-binary.test.ts',
              },
            ]
          : []),
      ])
    }
    for (const name of ['json_recv', 'jsonb_recv']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(fn.args).toEqual(['pg_catalog.internal'])
      expect(
        callableBoundary(fn, new Set(['pg_catalog."json"', 'pg_catalog.jsonb', 'pg_catalog.bytea']))
          .categories,
      ).toContain('internal-interface')
    }
    for (const name of ['cursor_to_xml', 'cursor_to_xmlschema']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'session-state:cursor',
      )
    }
    const random = catalog.functions.find(({ metadata }) => metadata.name === 'random')!.metadata
    for (const name of [
      'json_object_field',
      'json_object_field_text',
      'json_array_element',
      'json_array_element_text',
    ]) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(jsonValueRequirements(fn)).toEqual([
        {
          kind: 'database',
          setting: 'server_encoding',
          requirement:
            'Whole-document extraction decodes every JSON string. Non-ASCII Unicode escapes require server_encoding; raw Unicode and ASCII escapes remain portable, and earlier definite decoding errors are preserved.',
          owner: 'tests/sql-semantics/check-json-extraction.test.ts',
        },
      ])
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'pure-callable-candidate',
      )
    }
    expect(
      jsonValueRequirements(
        catalog.functions.find(({ metadata }) => metadata.name === 'jsonb_out')!.metadata,
      ),
    ).toEqual([
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Text rendering of objects with multiple nonempty keys including non-ASCII keys can require server_encoding for key ordering; logical values, type inspection and SQL nullness remain portable.',
        owner: 'tests/sql-semantics/check-jsonb-payload.test.ts',
      },
    ])
    expect(
      jsonValueRequirements(
        catalog.functions.find(({ metadata }) => metadata.name === 'jsonb_concat')!.metadata,
      ),
    ).toEqual([
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Concatenation can require server_encoding at the fixed JSONB storage limit when non-ASCII bytes or object key ordering affect result size; ordinary results inside the bound and same-kind empty-container passthroughs remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-storage.test.ts',
      },
    ])
    const conversion = catalog.functions.find(
      ({ metadata }) => metadata.name === 'to_jsonb',
    )!.metadata
    expect(jsonValueRequirements(conversion)).toEqual([
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'JSON text conversion shares Unicode decoding and JSONB stored-format admission requirements. Non-ASCII Unicode escapes can require server_encoding; existing JSONB values pass through without rendering or new admission.',
        owner: 'tests/sql-semantics/check-jsonb-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'extra_float_digits',
        requirement:
          'Other floating values currently defer because rendering context is not modelled. Integers from -9 through 9, NaN and infinities are definite. Geometric output uses invariant coordinates and preserves signed zero.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Finite timestamptz conversion requires TimeZone and currently defers; SQL NULL and both infinities remain definite. Date and timestamp JSON output uses ISO formatting independently of DateStyle.',
        owner: 'tests/sql-semantics/check-jsonb-output-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'bytea_output',
        requirement:
          'Bytea conversion requires bytea_output; hex and escape produce different JSON strings even for empty bytea. SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'IntervalStyle',
        requirement:
          'Finite interval conversion requires IntervalStyle; SQL NULL, errors and both infinities remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'lc_monetary',
        requirement:
          'Money conversion requires monetary formatting metadata from lc_monetary. SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'database',
        setting: 'catalog',
        requirement:
          'Nonzero OID-alias rendering and non-NULL enum conversion require catalog or user-defined JSON-cast data. Supplied values do not trigger local lookup; zero alias sentinels, SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
    ])
    expect(callableBoundary(conversion, represented).categories).toContain(
      'session-or-database-state',
    )
    const builders = catalog.functions.filter(({ metadata }) =>
      ['jsonb_build_array', 'jsonb_build_object'].includes(metadata.name),
    )
    expect(builders).toHaveLength(4)
    for (const { metadata } of builders) {
      expect(jsonValueRequirements(metadata)).toEqual(
        metadata.args.length === 0
          ? null
          : [
              {
                kind: 'database',
                setting: 'server_encoding',
                requirement:
                  'Builder arguments share scalar JSON conversion requirements. Non-ASCII Unicode escapes and fixed JSONB container storage bounds can require server_encoding; builders admit the new container even when its inputs are existing JSONB values.',
                owner: 'tests/sql-semantics/check-jsonb-builders.test.ts',
              },
              ...jsonValueRequirements(conversion)!.slice(1),
            ],
      )
    }
    for (const fn of catalog.functions.filter(
      ({ metadata }) =>
        metadata.name === 'jsonb_delete' &&
        ['pg_catalog.text', 'pg_catalog.int4'].includes(metadata.args[1]!),
    ))
      expect(jsonValueRequirements(fn.metadata)).toBeNull()
    expect(
      jsonValueRequirements(
        catalog.functions.find(({ metadata }) => metadata.name === 'jsonb_pretty')!.metadata,
      ),
    ).toEqual([
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Text rendering of objects with multiple nonempty keys including non-ASCII keys can require server_encoding for key ordering; logical values, type inspection and SQL nullness remain portable.',
        owner: 'tests/sql-semantics/check-jsonb-format.test.ts',
      },
    ])
    for (const name of ['jsonb_object_field_text', 'jsonb_array_element_text']) {
      expect(
        jsonValueRequirements(
          catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata,
        ),
      ).toEqual([
        {
          kind: 'database',
          setting: 'server_encoding',
          requirement:
            'Text rendering of objects with multiple nonempty keys including non-ASCII keys can require server_encoding for key ordering; logical values, type inspection and SQL nullness remain portable.',
          owner: 'tests/sql-semantics/check-jsonb-extraction.test.ts',
        },
      ])
    }
    for (const name of [
      'json_typeof',
      'json_array_length',
      'jsonb_typeof',
      'jsonb_object_field',
      'jsonb_array_element',
      'jsonb_array_length',
      'jsonb_exists',
      'jsonb_eq',
      'jsonb_ne',
      'jsonb_contains',
      'jsonb_contained',
      'jsonb_strip_nulls',
    ])
      expect(
        jsonValueRequirements(
          catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata,
        ),
      ).toBeNull()
    expect(callableBoundary(random, represented).categories).toContain('volatile')
    const stable = catalog.functions.find(({ metadata }) => metadata.volatility === 's')!.metadata
    expect(callableBoundary(stable, represented).categories).toContain('session-or-database-state')
    try {
      await pg.exec('SET quote_all_identifiers = off')
      const unquoted = await pg.query<{ value: string }>(
        "SELECT quote_ident('plain_identifier') AS value",
      )
      await pg.exec('SET quote_all_identifiers = on')
      const quoted = await pg.query<{ value: string }>(
        "SELECT quote_ident('plain_identifier') AS value",
      )
      expect(unquoted.rows[0]!.value).toBe('plain_identifier')
      expect(quoted.rows[0]!.value).toBe('"plain_identifier"')
    } finally {
      await pg.exec('RESET quote_all_identifiers')
    }
  })

  it('records character database encoding independently of catalog immutability', () => {
    for (const name of ['ascii', 'chr']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(fn.volatility).toBe('i')
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toEqual([
        'database-setting:server_encoding',
      ])
      expect(characterValueRequirements(fn)).toEqual([
        {
          kind: 'database',
          setting: 'server_encoding',
          requirement: expect.stringContaining('declared UTF8'),
          owner: 'tests/sql-semantics/check-character-encoding.test.ts',
        },
      ])
      for (const unrelated of [
        { ...fn, schema: 'public' },
        { ...fn, strict: false },
        { ...fn, returnsSet: true },
        { ...fn, args: ['pg_catalog.bool'] },
        { ...fn, result: 'pg_catalog.bool' },
      ])
        expect(characterValueRequirements(unrelated)).toBeNull()
    }
    const conversion = catalog.functions.find(({ metadata }) => metadata.name === 'to_ascii')!
    expect(characterValueRequirements(conversion.metadata)).toBeNull()
  })

  it('records encoding requirements for JSONB container text paths', () => {
    for (const name of [
      'jsonb_pretty',
      'jsonb_object_field_text',
      'jsonb_array_element_text',
      'jsonb_extract_path_text',
    ]) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'database-setting:server_encoding',
      )
      expect(jsonValueRequirements(fn)).toEqual([
        expect.objectContaining({ kind: 'database', setting: 'server_encoding' }),
      ])
      expect(jsonValueRequirements({ ...fn, schema: 'public' })).toBeNull()
      expect(jsonValueRequirements({ ...fn, args: ['pg_catalog.bool'] })).toBeNull()
    }
  })

  it('records immutable instant age as requiring the session timezone', async () => {
    const age = builtinMetadata(
      'function:["pg_catalog","age"](pg_catalog.timestamptz,pg_catalog.timestamptz)',
    )
    expect(age.volatility).toBe('i')
    expect(
      callableBoundary(age, new Set(['pg_catalog.timestamptz', 'pg_catalog."interval"'])),
    ).toEqual({
      categories: ['session-setting:TimeZone'],
      missingTypes: [],
    })
    const wires = []
    try {
      for (const zone of ['UTC', 'America/New_York']) {
        await pg.query("SELECT set_config('TimeZone', $1, false)", [zone])
        const result = await pg.query<{ wire: string }>(
          "SELECT encode(interval_send(age(TIMESTAMPTZ '2024-03-11 06:30+00', TIMESTAMPTZ '2024-03-10 06:30+00')), 'hex') AS wire",
        )
        wires.push(result.rows[0]!.wire)
      }
    } finally {
      await pg.exec('RESET TimeZone')
    }
    expect(wires).toEqual(['00000000000000000000000100000000', '00000000d693a4000000000100000000'])
  })

  it('records geometric text output as requiring floating-point rendering context', async () => {
    const samples = [
      ['point', '(1.2345678901234567,2)'],
      ['line', '{1.2345678901234567,1,0}'],
      ['lseg', '[(1.2345678901234567,2),(3,4)]'],
      ['box', '(1.2345678901234567,2),(3,4)'],
      ['circle', '<(1.2345678901234567,2),3>'],
      ['path', '[(1.2345678901234567,2),(3,4)]'],
      ['polygon', '((1.2345678901234567,2),(3,4),(5,6))'],
    ] as const
    const represented = new Set(samples.map(([type]) => 'pg_catalog.' + type))
    try {
      for (const [type, input] of samples) {
        const output = builtinMetadata(builtinTypeIO('pg_catalog.' + type)!.output!)
        expect(output.volatility, type).toBe('i')
        expect(callableBoundary(output, represented).categories, type).toContain(
          'session-setting:extra_float_digits',
        )
        const results = []
        for (const setting of ['0', '3']) {
          await pg.query("SELECT set_config('extra_float_digits', $1, false)", [setting])
          results.push(
            (await pg.query<{ value: string }>(`SELECT ($1::${type})::text value`, [input]))
              .rows[0]!.value,
          )
        }
        expect(results[0], type).not.toBe(results[1])
      }
    } finally {
      await pg.exec('RESET extra_float_digits')
    }
  })

  it('does not mistake nullness support or preparation of Unknown for a value representation', () => {
    const nullness = bindProbe('value IS NULL', [
      { name: 'value', typeName: 'aclitem', isRowType: false },
    ])
    expect(nullness.fullyBound).toBe(true)
    expect(nullness.preparation.kind).toBe('supported')
    expect(valueRepresentation('aclitem').represented).toBe(false)
    expect(valueRepresentation('jsonb').represented).toBe(true)
    expect(valueRepresentation('json').represented).toBe(true)
    expect(valueRepresentation('double precision').represented).toBe(true)
    expect(valueRepresentation('real').represented).toBe(true)
    expect(valueRepresentation('integer').represented).toBe(true)
    expect(valueRepresentation('point').represented).toBe(true)
    expect(valueRepresentation('path').represented).toBe(true)
    expect(valueRepresentation('circle').represented).toBe(true)
    expect(valueRepresentation('money').represented).toBe(true)
    expect(valueRepresentation('oid').represented).toBe(true)
    expect(valueRepresentation('pg_lsn').represented).toBe(true)
    expect(valueRepresentation('tid').represented).toBe(true)
    for (const type of ['xid', 'cid', 'xid8'])
      expect(valueRepresentation(type).represented).toBe(true)
    for (const type of ['time', 'timetz', 'interval'])
      expect(valueRepresentation(type).represented).toBe(true)
    const unknown = inspectExpression({ kind: 'uncertain' })
    expect(unknown.preparation.kind).toBe('supported')
    expect(unknown.fullyBound).toBe(false)
  })

  it('rejects missing and stale world outcome fingerprints', () => {
    expect(() => verifyWorldDigest({}, 'current')).toThrow('missing or stale')
    expect(() => verifyWorldDigest({ sourceDigest: 'old' }, 'current')).toThrow('missing or stale')
    expect(() => verifyWorldDigest({ sourceDigest: 'current' }, 'current')).not.toThrow()
    expect(() =>
      verifyWorldDigest({ sourceDigest: 'current', scope: { kind: 'selected-worlds' } }, 'current'),
    ).toThrow('Scoped world outcomes')
    expect(() =>
      verifyWorldDigest({ sourceDigest: 'current', scope: { kind: 'full-corpus' } }, 'current'),
    ).not.toThrow()
  })

  it('separates explicit catalog casts, runtime text conversions, admission and local binding', async () => {
    const report = await measureCoercions(pg)
    expect(report.casts.map(({ source, target }) => [source, target])).toEqual(
      catalog.casts.map(({ source, target }) => [source, target]),
    )
    const arrayNarrowing = report.arrayElementCasts.find(
      (entry) => entry.source === 'pg_catalog.int4' && entry.target === 'pg_catalog.int2',
    )!
    expect(arrayNarrowing.sourceArray).toBe('pg_catalog.int4[]')
    expect(arrayNarrowing.targetArray).toBe('pg_catalog.int2[]')
    expect(arrayNarrowing.probe.sql).toContain('cardinality(')
    expect(arrayNarrowing.probe.postgres.accepted).toBe(true)
    expect(arrayNarrowing.probe.raw.fullyBound).toBe(true)
    expect(arrayNarrowing.probe.stored!.fullyBound).toBe(true)
    expect(JSON.stringify(arrayNarrowing.probe.raw.expression)).toContain('array-coerce')
    const arrayIO = report.arrayElementCasts.find(
      (entry) => entry.source === 'pg_catalog."json"' && entry.target === 'pg_catalog.jsonb',
    )!
    expect(arrayIO.method).toBe('i')
    expect(arrayIO.probe.postgres.accepted).toBe(true)
    expect(JSON.stringify(arrayIO.probe.raw.expression)).toContain('array-io-coerce')
    expect(report.summary.representedArrayElementCastPairs).toBe(report.arrayElementCasts.length)
    const widening = report.casts.find(
      (cast) => cast.source === 'pg_catalog.int2' && cast.target === 'pg_catalog.int8',
    )!
    expect(widening.missingTypes).toEqual([])
    expect(widening.probe!.postgres.accepted).toBe(true)
    expect(widening.probe!.raw.fullyBound).toBe(true)
    expect(widening.probe!.stored!.fullyBound).toBe(true)
    const float = report.casts.find(
      (cast) => cast.source === 'pg_catalog.int4' && cast.target === 'pg_catalog.float8',
    )!
    expect(float.missingTypes).toEqual([])
    expect(float.probe!.raw.fullyBound).toBe(true)
    expect(float.probe!.stored!.fullyBound).toBe(true)
    const floatInput = report.textInput.find((entry) => entry.type === 'pg_catalog.float4')!
    for (const type of ['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8']) {
      const integer = report.textInput.find((entry) => entry.type === type)!.probe
      expect(integer.postgres.accepted).toBe(true)
      expect(integer.raw.fullyBound).toBe(true)
      expect(integer.raw.preparation.kind).toBe('supported')
      expect(integer.stored!.fullyBound).toBe(true)
      expect(integer.stored!.preparation.kind).toBe('supported')
      expect(report.inputForms.types.find((forms) => forms.type === type)).toMatchObject({
        suite: 'tests/sql-semantics/check-integer-scalar-input.test.ts',
        deferred: [],
        unimplementedGrammar: [],
      })
    }
    expect(floatInput.probe.raw.fullyBound).toBe(true)
    expect(floatInput.probe.stored!.fullyBound).toBe(true)
    const jsonInput = report.textInput.find((entry) => entry.type === 'pg_catalog."json"')!.probe
    expect(jsonInput.postgres.accepted).toBe(true)
    expect(jsonInput.raw.fullyBound).toBe(true)
    expect(jsonInput.stored!.fullyBound).toBe(true)
    const jsonOutput = report.textOutput.find((entry) => entry.type === 'pg_catalog."json"')!.probe
    expect(jsonOutput.postgres.accepted).toBe(true)
    expect(jsonOutput.raw.fullyBound).toBe(true)
    expect(jsonOutput.stored!.fullyBound).toBe(true)
    const jsonbInput = report.textInput.find((entry) => entry.type === 'pg_catalog.jsonb')!.probe
    expect(jsonbInput.raw.preparation.kind).toBe('supported')
    expect(jsonbInput.stored!.preparation.kind).toBe('supported')
    for (const [source, target] of [
      ['pg_catalog."json"', 'pg_catalog.jsonb'],
      ['pg_catalog.jsonb', 'pg_catalog."json"'],
    ]) {
      const cast = report.casts.find((c) => c.source === source && c.target === target)!
      expect(cast.method).toBe('i')
      expect(cast.probe!.raw.preparation.kind).toBe('supported')
      expect(cast.probe!.stored!.preparation.kind).toBe('supported')
    }
    expect(
      report.inputForms.types.find((forms) => forms.type === 'pg_catalog.jsonb'),
    ).toMatchObject({
      handled: jsonbInputForms,
      rejected: invalidJsonbInputForms,
      deferred: deferredJsonbEncodingForms,
      contextRequired: deferredJsonbEncodingForms,
      unimplementedGrammar: [],
      storageAdmission: { owner: 'tests/sql-semantics/check-jsonb-storage.test.ts' },
    })
    expect(
      report.inputForms.types.find((forms) => forms.type === 'pg_catalog."json"'),
    ).toMatchObject({
      handled: jsonInputForms,
      rejected: invalidJsonInputForms,
      unimplementedGrammar: [],
      rowInput: { rawQueryParameters: 'defer to PostgreSQL' },
    })
    for (const type of ['pg_catalog.pg_snapshot', 'pg_catalog.txid_snapshot']) {
      expect(valueRepresentation(type).represented).toBe(true)
      const forms = report.inputForms.types.find((forms) => forms.type === type)!
      expect(forms).toMatchObject({
        handled: snapshotInputForms,
        rejected: invalidSnapshotInputForms,
        deferred: [],
        contextRequired: [],
        binaryInput: { inProgressUpperBound: 'inclusive', textInputUpperBound: 'exclusive' },
        rowInput: { rawQueryParameters: 'defer to PostgreSQL' },
        currentSnapshot: { contextRequired: ['active PostgreSQL transaction snapshot'] },
      })
      for (const entries of [report.textInput, report.textOutput]) {
        const probe = entries.find((entry) => entry.type === type)!.probe
        expect(probe.postgres.accepted).toBe(true)
        expect(probe.raw.fullyBound).toBe(true)
        expect(probe.raw.preparation.kind).toBe('supported')
        expect(probe.stored!.fullyBound).toBe(true)
        expect(probe.stored!.preparation.kind).toBe('supported')
      }
    }
    for (const name of ['pg_current_snapshot', 'txid_current_snapshot']) {
      const metadata = catalog.functions.find((entry) => entry.metadata.name === name)!.metadata
      expect(
        callableBoundary(metadata, new Set(['pg_catalog.pg_snapshot', 'pg_catalog.txid_snapshot']))
          .categories,
      ).toContain('transaction-state:snapshot')
      expect(bindProbe(name + '() IS NOT NULL', []).preparation.kind).toBe('unsupported')
    }
    for (const type of ['float4', 'float8', 'point', 'line', 'lseg', 'box', 'circle', 'path'])
      expect(
        report.inputForms.types.find((forms) => forms.type === 'pg_catalog.' + type),
      ).toMatchObject({
        nanBinaryPrecision: {
          requirement: 'platform',
          semanticValue: 'known',
          binaryOutput: 'Unknown',
          explicitRowBits: 'preserved',
          owner: 'tests/sql-semantics/check-platform-nan.test.ts',
        },
      })
    for (const range of catalog.rangeTypes) {
      for (const type of [range.identity, range.multirange])
        expect(report.inputForms.types.find((forms) => forms.type === type)).toMatchObject({
          jsonConversion: {
            owner: 'tests/sql-semantics/check-range-json.test.ts',
            handled: [
              'scalar JSON strings',
              'recursive arrays',
              'domains',
              'builders and object keys',
            ],
            contextRequired: 'Inherited reached subtype text-output requirements',
            oidInput: false,
          },
        })
      const multirange = report.textInput.find((item) => item.type === range.multirange)!
      expect(multirange.probe.postgres.accepted).toBe(true)
      expect(multirange.probe.raw.preparation.kind).toBe('supported')
      expect(multirange.probe.stored!.preparation.kind).toBe('supported')
      const multirangeOutput = report.textOutput.find((item) => item.type === range.multirange)!
      expect(multirangeOutput.probe.postgres.accepted).toBe(true)
      expect(multirangeOutput.probe.raw.preparation.kind).toBe('supported')
      expect(multirangeOutput.probe.stored!.preparation.kind).toBe('supported')
      expect(
        report.inputForms.types.find((forms) => forms.type === range.multirange),
      ).toMatchObject({
        rangeType: range.identity,
        boundType: range.subtype,
        suite: 'tests/sql-semantics/check-multirange-input-values.test.ts',
        bindingOwner: 'tests/sql-semantics/check-multirange-input.test.ts',
        contextOwner: 'tests/sql-semantics/check-multirange-input-context.test.ts',
        literalOwner: 'tests/sql-semantics/check-multirange-literals.test.ts',
        arrays: {
          type: `array:${range.multirange}`,
          owner: 'tests/sql-semantics/check-multirange-array.test.ts',
          literalOwner: 'tests/sql-semantics/check-multirange-array-literals.test.ts',
          payloadOwner: 'tests/sql-semantics/check-multirange-array-payload.test.ts',
          hashContextOwner: 'tests/sql-semantics/check-multirange-array-hash-context.test.ts',
          compositionOwner: 'tests/sql-semantics/check-multirange-array-composition.test.ts',
          oidInput: false,
        },
        binaryIO: {
          owner: 'tests/sql-semantics/check-multirange-wire-hash.test.ts',
          catalogOwner: 'tests/sql-semantics/check-multirange-binary-catalog.test.ts',
          sendContext: [],
          format: expect.stringContaining('no multirange OID'),
          receive: expect.stringContaining('PostgreSQL internal buffer'),
        },
        hashing: {
          contextOwner: 'tests/sql-semantics/check-multirange-hash-context.test.ts',
          stateOwner: 'tests/sql-semantics/check-multirange-wire-state.test.ts',
          contextRequired:
            range.subtype === 'pg_catalog."numeric"'
              ? ['nativeByteOrder for reached byte-dependent numeric hashes']
              : [],
          oidInput: false,
        },
        textOutput: {
          owner: 'tests/sql-semantics/check-multirange-output.test.ts',
          stateOwner: 'tests/sql-semantics/check-multirange-output-state.test.ts',
          contextRequired:
            range.subtype === 'pg_catalog.date' || range.subtype === 'pg_catalog."timestamp"'
              ? ['DateStyle for reached finite member bounds']
              : range.subtype === 'pg_catalog.timestamptz'
                ? ['DateStyle and TimeZone for reached finite member bounds']
                : [],
        },
        unimplementedGrammar: [],
        oidInput: false,
      })
      const entry = report.textInput.find((item) => item.type === range.identity)!
      expect(entry.probe.sql).toContain('isempty(')
      expect(entry.probe.postgres.accepted).toBe(true)
      expect(entry.probe.raw.preparation.kind).toBe('supported')
      expect(entry.probe.stored!.preparation.kind).toBe('supported')
      expect(report.inputForms.types.find((forms) => forms.type === range.identity)).toMatchObject({
        boundType: range.subtype,
        scope: expect.stringContaining('scalar input requirements'),
        binaryIO: {
          owner: 'tests/sql-semantics/check-range-wire-hash.test.ts',
          catalogOwner: 'tests/sql-semantics/check-range-binary-catalog.test.ts',
          sendContext: [],
          format: expect.stringContaining('no range OID'),
          receive: expect.stringContaining('PostgreSQL internal buffer'),
        },
        hashing: {
          contextOwner: 'tests/sql-semantics/check-range-hash-context.test.ts',
          stateOwner: 'tests/sql-semantics/check-range-wire-state.test.ts',
          contextRequired:
            range.subtype === 'pg_catalog."numeric"'
              ? ['nativeByteOrder for reached byte-dependent numeric hashes']
              : [],
          oidInput: false,
        },
        arrays: {
          type: `array:${range.identity}`,
          owner: 'tests/sql-semantics/check-range-array.test.ts',
          literalOwner: 'tests/sql-semantics/check-range-array-literals.test.ts',
          payloadOwner: 'tests/sql-semantics/check-range-array-payload.test.ts',
          hashContextOwner: 'tests/sql-semantics/check-range-array-hash-context.test.ts',
          nominalProfile: expect.stringContaining('before public ownership copies'),
          oidInput: false,
        },
        coreOperations: {
          comparisonOwner: 'tests/sql-semantics/check-range-comparisons.test.ts',
          setOwner: 'tests/sql-semantics/check-range-set.test.ts',
          compositionOwner: 'tests/sql-semantics/check-range-composition.test.ts',
          stateOwner: 'tests/sql-semantics/check-range-core-state.test.ts',
          contextRequired: [],
          databaseLookup: false,
        },
        textOutput: {
          owner: 'tests/sql-semantics/check-range-output.test.ts',
          formatOwner: 'tests/sql-semantics/check-range-output-format.test.ts',
          boundType: range.subtype,
          contextRequired:
            range.subtype === 'pg_catalog.date' || range.subtype === 'pg_catalog."timestamp"'
              ? ['DateStyle for finite bounds']
              : range.subtype === 'pg_catalog.timestamptz'
                ? ['DateStyle and TimeZone for finite bounds']
                : [],
        },
      })
      const output = report.textOutput.find((item) => item.type === range.identity)!
      expect(output.probe.postgres.accepted).toBe(true)
      expect(output.probe.raw.fullyBound).toBe(true)
      expect(output.probe.raw.preparation.kind).toBe('supported')
      expect(output.probe.stored!.fullyBound).toBe(true)
      expect(output.probe.stored!.preparation.kind).toBe('supported')
    }
    const pointInput = report.textInput.find((entry) => entry.type === 'pg_catalog.point')!
    expect(pointInput.probe.postgres.accepted).toBe(true)
    expect(pointInput.probe.raw.fullyBound).toBe(true)
    expect(pointInput.probe.stored!.fullyBound).toBe(true)
    const polygonInput = report.textInput.find((entry) => entry.type === 'pg_catalog.polygon')!
    expect(polygonInput.input).toContain('poly_in')
    expect(polygonInput.probe.postgres.accepted).toBe(true)
    expect(polygonInput.probe.raw.fullyBound).toBe(true)
    expect(polygonInput.probe.stored!.fullyBound).toBe(true)
    expect(
      report.inputForms.types.find((forms) => forms.type === 'pg_catalog.polygon'),
    ).toMatchObject({
      contextRequired: [],
      unimplementedGrammar: [],
      inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
      computedNanBinaryOutput: 'Unknown',
      nanBinaryPrecision: {
        requirement: 'platform',
        semanticValue: 'known',
        binaryOutput: 'Unknown',
        explicitRowBits: 'preserved',
        owner: 'tests/sql-semantics/check-polygon-input.test.ts',
      },
      cachedBounds: {
        explicitRowBits: 'preserved',
        omittedUniqueExtrema: 'derived',
        omittedAmbiguousExtrema: 'Unknown',
        nonNull: 'known',
        binaryLength: 32,
        owner: 'tests/sql-semantics/check-polygon.test.ts',
      },
      handled: expect.arrayContaining(['0,0', '[1e400,0]', '((1e309,bad))']),
      platformDependent: expect.arrayContaining(['((0x1p0,0))']),
    })
    const boxInput = report.textInput.find((entry) => entry.type === 'pg_catalog.box')!
    expect(boxInput.input).toContain('box_in')
    expect(boxInput.probe.postgres.accepted).toBe(true)
    expect(boxInput.probe.raw.fullyBound).toBe(true)
    expect(boxInput.probe.stored!.fullyBound).toBe(true)
    const boxForms = report.inputForms.types.find((forms) => forms.type === 'pg_catalog.box')!
    expect(boxForms).toMatchObject({
      contextRequired: [],
      unimplementedGrammar: [],
      inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
      computedNanBinaryOutput: 'Unknown',
      platformDependent: expect.arrayContaining(['((0x1p0,0),(1,1))']),
    })
    expect(boxForms.handled).toEqual(
      expect.arrayContaining(['((0,0),(0,0))', '[(0,0),(3,4)]', '((-0,0),(0,-0))']),
    )
    const lsegInput = report.textInput.find((entry) => entry.type === 'pg_catalog.lseg')!
    expect(lsegInput.input).toContain('lseg_in')
    expect(lsegInput.probe.postgres.accepted).toBe(true)
    expect(lsegInput.probe.raw.fullyBound).toBe(true)
    expect(lsegInput.probe.stored!.fullyBound).toBe(true)
    const lsegForms = report.inputForms.types.find((forms) => forms.type === 'pg_catalog.lseg')!
    expect(lsegForms).toMatchObject({
      contextRequired: [],
      unimplementedGrammar: [],
      inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
      computedNanBinaryOutput: 'Unknown',
      platformDependent: expect.arrayContaining(['[(0x1p0,0),(1,1)]']),
    })
    expect(lsegForms.handled).toEqual(expect.arrayContaining(['[(0,0),(0,0)]', '[(3,4),(0,0)]']))
    const lineInput = report.textInput.find((entry) => entry.type === 'pg_catalog.line')!
    expect(lineInput.input).toContain('line_in')
    expect(lineInput.probe.raw.fullyBound).toBe(true)
    expect(lineInput.probe.stored!.fullyBound).toBe(true)
    const lineForms = report.inputForms.types.find((forms) => forms.type === 'pg_catalog.line')!
    expect(lineForms).toMatchObject({
      contextRequired: [],
      unimplementedGrammar: [],
      inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
      computedNanBinaryOutput: 'Unknown',
      platformDependent: expect.arrayContaining(['{0x1p0,-1,0}', '{nan(payload),1,0}']),
    })
    expect(lineForms.handled).toEqual(expect.arrayContaining(['{1,-1,0}', '[(0,0),(1,1)]']))
    expect(pointInput.input).toBe('function:["pg_catalog","point_in"](pg_catalog.cstring)')
    const pointForms = report.inputForms.types.find((forms) => forms.type === 'pg_catalog.point')!
    expect(pointForms).toMatchObject({
      contextRequired: [],
      unimplementedGrammar: [],
      inputLimit: { unicodeScalars: 4096, outcome: 'Unknown' },
      platformDependent: expect.arrayContaining(['(0x1p0,0)', '(NaN(1),0)']),
    })
    expect(pointForms.handled).toEqual(expect.arrayContaining(['1,2', '(-0,-0)', '(NaN,NaN)']))
    const floatOutput = report.textOutput.find((entry) => entry.type === 'pg_catalog.float8')!
    expect(floatOutput.probe.raw.fullyBound).toBe(false)
    expect(
      callableBoundary(builtinMetadata(floatOutput.output!), new Set(['pg_catalog.float8']))
        .categories,
    ).toContain('session-setting:extra_float_digits')
    for (const type of ['pg_catalog."time"', 'pg_catalog.timetz']) {
      const input = report.textInput.find((entry) => entry.type === type)!
      expect(input.probe.raw.fullyBound).toBe(true)
      expect(input.probe.stored!.fullyBound).toBe(true)
      const output = report.textOutput.find((entry) => entry.type === type)!
      expect(output.probe.raw.fullyBound).toBe(true)
      expect(output.probe.stored!.fullyBound).toBe(true)
      const forms = report.inputForms.types.find((forms) => forms.type === type)!
      expect(forms).toMatchObject({ unimplementedGrammar: [] })
    }
    const intervalInput = report.textInput.find((entry) => entry.type === 'pg_catalog."interval"')!
    expect(intervalInput.probe.raw.fullyBound).toBe(true)
    expect(intervalInput.probe.stored!.fullyBound).toBe(true)
    expect(
      callableBoundary(builtinMetadata(intervalInput.input!), new Set(['pg_catalog."interval"']))
        .categories,
    ).toContain('session-setting:IntervalStyle')
    const intervalForms = report.inputForms.types.find(
      (forms) => forms.type === 'pg_catalog."interval"',
    )!
    expect(intervalForms).toMatchObject({
      contextRequired: ['-1 day 2 hours', '-1 year 2 mons', '-1 02:03'],
      unimplementedGrammar: ['P0x1p2Y', 'PT0x1p2S'],
    })
    for (const form of ['P0001-02-03T04:05:06', 'P00020304T010203', 'PT010203.75'])
      expect(intervalForms.handled).toContain(form)
    const input = report.textInput.find((entry) => entry.type === 'pg_catalog.int4')!
    expect(input.cast).toBeNull()
    expect(input.input).toBe('function:["pg_catalog","int4in"](pg_catalog.cstring)')
    expect(input.probe.postgres.accepted).toBe(true)
    expect(input.probe.raw.fullyBound).toBe(true)
    expect(input.probe.raw.preparation.kind).toBe('supported')
    expect(input.probe.stored!.fullyBound).toBe(true)
    expect(input.probe.stored!.preparation.kind).toBe('supported')
    const integer = report.textOutput.find((entry) => entry.type === 'pg_catalog.int8')!
    expect(integer.cast).toBeNull()
    expect(integer.output).toBe('function:["pg_catalog","int8out"](pg_catalog.int8)')
    expect(integer.probe.raw.fullyBound).toBe(true)
    expect(integer.probe.stored!.fullyBound).toBe(true)
    const boolean = report.textOutput.find((entry) => entry.type === 'pg_catalog.bool')!
    expect(boolean.cast!.implementation).toBe('function:["pg_catalog","text"](pg_catalog.bool)')
    expect(boolean.output).toBe('function:["pg_catalog","boolout"](pg_catalog.bool)')
    expect(boolean.probe.raw.fullyBound).toBe(true)
    expect(report.inputForms.evidence).toBe('maintained parity-suite expectations')
    const temporal = report.inputForms.types.find(
      (forms) => forms.type === 'pg_catalog.timestamptz',
    )!
    expect(temporal.deferred).toContain('2000-01-01 00:00:00')
    expect(temporal.handled).toContain('epoch')
    expect(temporal.deferred).not.toContain('epoch')
    expect(temporal.handled).toContain('2000-01-01 00:00:00.1234567Z')
    expect(
      (
        await pg.query<{ count: number }>(
          `SELECT count(*)::integer AS count FROM pg_class WHERE relnamespace=pg_my_temp_schema()
       AND relname='_pgsid_measure_cast'`,
        )
      ).rows[0]!.count,
    ).toBe(0)
  })

  it('records generated input requirements even when only their nullness is read', async () => {
    await pg.exec(`CREATE TABLE measurement_generated_inputs (
      quantity integer, label text GENERATED ALWAYS AS (quantity::text) STORED)`)
    try {
      const snapshot = await snapshotCatalog(pg)
      const table = snapshot.tables.find((table) => table.name === 'measurement_generated_inputs')!
      const plan = lowerTableCheck(table, {
        name: 'generated_nullness',
        type: 'check',
        definition: 'CHECK (label IS NOT NULL OR quantity = 0)',
      })!
      const measured = inspectExpression(plan.expression, table.columns)
      const column = table.columns.find((column) => column.name === 'label')!
      expect(measured.fullyBound).toBe(true)
      expect(measured.materializedInputs).toEqual([
        {
          name: 'label',
          type: 'text',
          generated: 'stored',
          expression: column.defaultExpr,
        },
      ])
      const sourceOnly = lowerTableCheck(table, {
        name: 'source_only',
        type: 'check',
        definition: 'CHECK (quantity >= 0)',
      })!
      expect(inspectExpression(sourceOnly.expression, table.columns).materializedInputs).toEqual([])
    } finally {
      await pg.exec('DROP TABLE measurement_generated_inputs')
    }
  })

  it('measures column admission and nullness against PostgreSQL catalog row shape', async () => {
    const report = await measureTypes(pg)
    const inventory = new Map(report.types.map((type) => [type.identity, type]))
    expect(report.rangeTypes).toEqual(catalog.rangeTypes)
    expect(report.rangeTypes.map((range) => range.identity).sort()).toEqual(
      report.types
        .filter((type) => type.kind === 'r')
        .map((type) => type.identity)
        .sort(),
    )
    expect(report.rangeTypes.map((range) => range.multirange).sort()).toEqual(
      report.types
        .filter((type) => type.kind === 'm')
        .map((type) => type.identity)
        .sort(),
    )
    const cstringArray = inventory.get('pg_catalog._cstring')!
    expect(cstringArray.kind).toBe('b')
    expect(cstringArray.storedColumn).toBe(false)
    expect(cstringArray.columnRejection?.code).toBe('42P16')
    expect(cstringArray.probes).toBeNull()
    expect(
      (
        await pg.query<{ count: number }>(`SELECT count(*)::integer AS count FROM pg_class
          WHERE relnamespace = pg_my_temp_schema() AND relname = '_pgsid_measure_type'`)
      ).rows[0]!.count,
    ).toBe(0)
    await pg.exec(`CREATE TABLE measurement_nullness (
      items integer[], document jsonb, span int4range, row_value pg_catalog.pg_class,
      statistics anyarray)`)
    try {
      const snapshot = await snapshotCatalog(pg)
      const table = snapshot.tables.find((table) => table.name === 'measurement_nullness')!
      for (const [name, identity, expected, represented] of [
        ['items', 'pg_catalog._int4', true, true],
        ['document', 'pg_catalog.jsonb', true, true],
        ['span', 'pg_catalog.int4range', true, true],
        ['statistics', 'pg_catalog.anyarray', true, false],
        ['row_value', 'pg_catalog.pg_class', false, false],
      ] as const) {
        const type = inventory.get(identity)!
        expect(type.storedColumn).toBe(true)
        expect(type.representation.represented).toBe(represented)
        const plan = lowerTableCheck(table, {
          name: 'nullness',
          type: 'check',
          definition: `CHECK (${name} IS NULL)`,
        })!
        expect(!hasUncertain(plan.expression)).toBe(expected)
        expect(type.probes!['value IS NULL']!.fullyBound).toBe(expected)
        if (name === 'items') {
          expect(type.probes!['value = value']!.fullyBound).toBe(true)
          expect(type.probes!['value = value']!.preparation.kind).toBe('supported')
        }
      }
      const record = inventory.get('pg_catalog.record')!
      expect(record.isRowType).toBe(true)
      for (const type of report.types.filter((type) => type.kind === 'p')) {
        if (type.identity === 'pg_catalog.anyarray') {
          expect(type.storedColumn).toBe(true)
          expect(type.columnRejection).toBeNull()
        } else {
          expect(type.storedColumn).toBe(false)
          expect(type.columnRejection?.code).toBe('42P16')
          expect(type.probes).toBeNull()
        }
      }
    } finally {
      await pg.exec('DROP TABLE measurement_nullness')
    }
  })
})
