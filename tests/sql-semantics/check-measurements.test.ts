import { jsonInputForms, invalidJsonInputForms } from './check-json-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import type { BuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { builtinMetadata, builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import { callableBoundary, verifyCatalog } from '../../scripts/check-measurements/catalog.js'
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
    const duplicateIO = structuredClone(catalog)
    duplicateIO.typeIO.push(duplicateIO.typeIO[0]!)
    expect(() => verifyCatalog(duplicateIO)).toThrow('Duplicate type I/O identity')
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
    for (const name of ['textsend', 'namesend']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'session-setting:client_encoding',
      )
    }
    for (const name of ['cursor_to_xml', 'cursor_to_xmlschema']) {
      const fn = catalog.functions.find(({ metadata }) => metadata.name === name)!.metadata
      expect(callableBoundary(fn, new Set(fn.args.concat(fn.result))).categories).toContain(
        'session-state:cursor',
      )
    }
    const random = catalog.functions.find(({ metadata }) => metadata.name === 'random')!.metadata
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
      { name: 'value', typeName: 'jsonb', isRowType: false },
    ])
    expect(nullness.fullyBound).toBe(true)
    expect(nullness.preparation.kind).toBe('supported')
    expect(valueRepresentation('jsonb').represented).toBe(false)
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
    expect(input.probe.raw.fullyBound).toBe(false)
    expect(input.probe.raw.preparation.kind).toBe('supported')
    expect(input.probe.stored!.fullyBound).toBe(false)
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
      for (const [name, identity, expected] of [
        ['items', 'pg_catalog._int4', true],
        ['document', 'pg_catalog.jsonb', true],
        ['span', 'pg_catalog.int4range', true],
        ['statistics', 'pg_catalog.anyarray', true],
        ['row_value', 'pg_catalog.pg_class', false],
      ] as const) {
        const type = inventory.get(identity)!
        expect(type.storedColumn).toBe(true)
        expect(type.representation.represented).toBe(false)
        const plan = lowerTableCheck(table, {
          name: 'nullness',
          type: 'check',
          definition: `CHECK (${name} IS NULL)`,
        })!
        expect(!hasUncertain(plan.expression)).toBe(expected)
        expect(type.probes!['value IS NULL']!.fullyBound).toBe(expected)
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
