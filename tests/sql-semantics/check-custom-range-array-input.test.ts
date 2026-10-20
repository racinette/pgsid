import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import { customRangeSchema, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'
import {
  catalogRangeType,
  catalogMultirangeType,
} from '../../src/sql-semantics/catalog-check-binder.js'

const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'"

it('checks custom range domain cells and nested array-valued domains during text and element I/O input', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-array-domains-'))
  try {
    await pg.exec(customRangeSchema)
    const forms = [false, true].flatMap((multi) => {
      const raw = multi ? 'public.positive_set' : '"Custom.Range".positive_span',
        cell = `checked_custom_cell_${Number(multi)}`,
        list = `checked_custom_list_${Number(multi)}`
      return [
        { multi, raw, cell, list, name: 'cells', input: `payload::${cell}[]` },
        { multi, raw, cell, list, name: 'elements', input: `pieces::text[]::${cell}[]` },
        { multi, raw, cell, list, name: 'nested', input: `payload::${list}[]` },
      ].map((f) => ({
        ...f,
        table: `custom_array_domains_${Number(multi)}_${f.name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${f.input})::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C" END`,
      }))
    })
    for (const f of forms.filter((f) => f.name === 'cells'))
      await pg.exec(
        `CREATE DOMAIN ${f.cell} AS ${f.raw} NOT NULL CHECK(NOT isempty(VALUE));CREATE DOMAIN ${f.list} AS ${f.raw}[] NOT NULL CHECK(cardinality(VALUE)>0);`,
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(payload text,pieces text[],label text,bypass bool,CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return (['source', 'stored'] as const).map((origin) => ({
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
                ? { name: 'valid', type: 'check', definition: `CHECK(${f.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
            )!.expression,
          ),
        }))
      }),
      names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [i, f] of forms.entries()) {
      const wrap = (text: string) =>
          f.multi ? (text === 'empty' ? '{}' : '{' + text + '}') : text,
        samples: (string | null)[][] = [
          [wrap('[1,3)'), wrap('[3,5)')],
          [wrap('empty')],
          [null],
          [wrap('[-1,bad)')],
          [wrap('[bad,-1)')],
          [],
          [wrap('[1,3)'), wrap('empty')],
        ]
      for (const cells of samples) {
        const pieces = rangeArrayText(cells),
          payload = f.name === 'nested' ? rangeArrayText([pieces]) : pieces,
          source = {
            kind: 'Value' as const,
            value: {
              elementType: 'pg_catalog.text',
              elementKind: 8,
              dimensions: cells.length ? [{ lower: 1, length: cells.length }] : [],
              elements: cells.map((value) =>
                value === null ? { kind: 'Null' as const } : { kind: 'Text' as const, value },
              ),
              nullBitmap: { kind: 'Value' as const, value: cells.includes(null) },
            },
          }
        let label: string | null = null
        try {
          label = (
            await pg.query<{ value: string }>(
              `SELECT (${f.input})::text AS value FROM(SELECT $1::text payload,$2::text[] pieces)inputs`,
              [payload, pieces],
            )
          ).rows[0]!.value
        } catch (e) {
          expect(e).toHaveProperty('code')
        }
        for (const bypass of [false, true]) {
          const params = [payload, pieces, label, bypass],
            native = await nativeCustomRangeOutcome(
              pg,
              `SELECT (${f.sql})AS value FROM(SELECT $1::text payload,$2::text[] pieces,$3::text label,$4::bool bypass)inputs`,
              params,
            ),
            insert = pg.query(`INSERT INTO ${f.table} VALUES($1,$2,$3,$4)`, params)
          if (native.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code: native.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
          else await insert
          for (const origin of [0, 1])
            fixtures.push({
              name: names[i * 2 + origin]!,
              row: {
                payload: known(payload),
                pieces: source,
                label: known(label),
                bypass: known(bypass),
              },
              expected: native,
            })
        }
      }
    }
    await runCheckParity(directory, 'customarraydomains', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves custom array input event order, lazy casts and reached callback requirements in source and stored CHECKs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-array-input-'))
  try {
    await pg.exec(
      customRangeSchema +
        `
    CREATE DOMAIN "Custom.Range".required_bound AS int4 NOT NULL CHECK(VALUE>0);
    CREATE TYPE "Custom.Range".required_span AS RANGE(subtype="Custom.Range".required_bound,multirange_type_name=required_set);
    CREATE DOMAIN "Custom.Range".preflight_bound AS int4 CHECK(VALUE>0 OR 1/0=0);
    CREATE TYPE "Custom.Range".preflight_span AS RANGE(subtype="Custom.Range".preflight_bound,multirange_type_name=preflight_set);`,
    )
    const probes = [
      ...['positive', 'required', 'preflight'].flatMap((family) =>
        [
          { text: 'empty', defer: false },
          { text: '(,)', defer: false },
          { text: '[1,3)', defer: false },
          { text: '[-1,bad)', defer: false },
          { text: '[bad,-1)', defer: false },
          { text: '[bad,3]junk', defer: false },
          { text: '[1,3)', suffix: ',', defer: false },
        ].map((probe) => ({ ...probe, family })),
      ),
      ...[
        { family: 'reverse', text: 'empty', defer: false },
        { family: 'reverse', text: '(,)', defer: false },
        { family: 'reverse', text: '[1,3)', defer: true },
        { family: 'reverse', text: '[bad,3)', defer: false },
        { family: 'reverse', text: '(,3]', defer: false },
        { family: 'discrete', text: 'empty', defer: false },
        { family: 'discrete', text: '(1,1)', defer: false },
        { family: 'discrete', text: '[1,3)', defer: true },
        { family: 'discrete', text: '[3,1)', defer: false },
      ],
    ]
    const forms = probes.flatMap((probe, index) =>
      [false, true].map((multi) => {
        const type = multi ? `public.${probe.family}_set` : `"Custom.Range".${probe.family}_span`,
          member = multi ? '{' + probe.text + '}' : probe.text,
          payload = rangeArrayText([member]) + ('suffix' in probe ? probe.suffix : ''),
          name = `array_input_${index}_${Number(multi)}`,
          sql = `CASE WHEN bypass THEN true ELSE (payload::${type}[])::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C" END`
        return { ...probe, multi, type, payload, name, sql }
      }),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(payload text,label text,bypass bool,CONSTRAINT valid CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.name)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { name: 'valid', type: 'check', definition: `CHECK(${f.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
            )!.expression,
          ),
        }))
      }),
      names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [i, f] of forms.entries()) {
      let label: string | null = null
      try {
        label = (
          await pg.query<{ value: string }>(`SELECT $1::${f.type}[]::text AS value`, [f.payload])
        ).rows[0]!.value
      } catch (e) {
        expect(e).toHaveProperty('code')
      }
      for (const bypass of [false, true]) {
        const params = [f.payload, label, bypass],
          native = await nativeCustomRangeOutcome(
            pg,
            `SELECT (${f.sql})AS value FROM(SELECT $1::text payload,$2::text label,$3::bool bypass)inputs`,
            params,
          ),
          insert = pg.query(`INSERT INTO ${f.name} VALUES($1,$2,$3)`, params)
        if (native.kind === 'Error')
          await expect(insert).rejects.toMatchObject({
            code: native.value.state.toString(36).toUpperCase().padStart(5, '0'),
          })
        else await insert
        for (const origin of [0, 1])
          fixtures.push({
            name: names[i * 2 + origin]!,
            row: { payload: known(f.payload), label: known(label), bypass: known(bypass) },
            expected: !bypass && f.defer ? { kind: 'Unknown' } : native,
          })
      }
    }
    for (const payload of [
      { kind: 'Null' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    ] as Input[])
      for (const bypass of [false, true])
        for (const origin of [0, 1])
          fixtures.push({
            name: names[origin]!,
            row: { payload, label: known(null), bypass: known(bypass) },
            expected:
              bypass || payload.kind === 'Null'
                ? { kind: 'True' }
                : payload.kind === 'Error'
                  ? payload
                  : { kind: 'Unknown' },
          })
    await runCheckParity(directory, 'customarrayinput', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('prepares custom array literals eagerly while keeping runtime member casts lazy', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-array-literals-'))
  try {
    await pg.exec(
      customRangeSchema +
        `CREATE DOMAIN "Custom.Range".preflight_bound AS int4 CHECK(VALUE>0 OR 1/0=0);
   CREATE TYPE "Custom.Range".preflight_span AS RANGE(subtype="Custom.Range".preflight_bound,multirange_type_name=preflight_set);
   CREATE TABLE literal_source(bypass bool);INSERT INTO literal_source VALUES(true)`,
    )
    const forms = [false, true].flatMap((multi) => {
      const type = multi ? 'public.positive_set' : '"Custom.Range".positive_span',
        preflight = multi ? 'public.preflight_set' : '"Custom.Range".preflight_span',
        member = (text: string) => (multi ? '{' + text + '}' : text),
        text = (...members: string[]) => rangeArrayText(members.map(member)),
        valid = literal(text('[1,3)')),
        invalid = literal(text('[-1,bad)')),
        bad = literal(text('[bad,3)')),
        grammar = literal('{'),
        nulls = literal('{NULL}')
      return Object.entries({
        good: `cardinality(${valid}::${type}[])=1`,
        domain_first: `cardinality(${invalid}::${type}[])>0`,
        input_first: `cardinality(${bad}::${type}[])>0`,
        grammar: `cardinality(${grammar}::${type}[])>0`,
        literal_skipped: `CASE WHEN bypass THEN true ELSE cardinality(${invalid}::${type}[])>0 END`,
        literal_static: `CASE WHEN true THEN true ELSE cardinality(${invalid}::${type}[])>0 END`,
        text_skipped: `CASE WHEN bypass THEN true ELSE cardinality(${invalid}::text::${type}[])>0 END`,
        text_static: `CASE WHEN true THEN true ELSE cardinality(${invalid}::text::${type}[])>0 END`,
        metadata_bad: `cardinality(${bad}::${preflight}[])>0`,
        metadata_empty: `cardinality('{}'::${preflight}[])=0`,
        metadata_omitted: `cardinality(${literal(text('(,)'))}::${preflight}[])=1`,
        metadata_null: `cardinality(${nulls}::${preflight}[])=1`,
        io_input: `cardinality(ARRAY[${literal(member('[-1,bad)'))}]::text[]::${type}[])>0`,
        io_skipped: `CASE WHEN bypass THEN true ELSE cardinality(ARRAY[${literal(member('[-1,bad)'))}]::text[]::${type}[])>0 END`,
        before_operator: `cardinality(${invalid}::${type}[])+1/0>0`,
        operator_before: `1/0+cardinality(${bad}::${type}[])>0`,
      }).map(([name, sql]) => ({ name: name + '_' + Number(multi), sql }))
    })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'literal_source')!,
      plans = forms.map((f) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: f.name,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            { name: f.name, type: 'check', definition: `CHECK(${f.sql})` },
            catalog.enums,
            catalog.domains,
            'source',
            catalog.rangeTypes,
          )!.expression,
        ),
      })),
      names = forms.map((f) => f.name),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const bypass of [false, true]) {
      await pg.query('UPDATE literal_source SET bypass=$1', [bypass])
      for (const f of forms)
        fixtures.push({
          name: f.name,
          row: { bypass: known(bypass) },
          expected: await nativeCustomRangeOutcome(
            pg,
            `SELECT (${f.sql})AS value FROM literal_source`,
            [],
          ),
        })
    }
    await runCheckParity(directory, 'customarrayliterals', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('recovers stored custom array literals without rechecking changed subtype domains', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-array-stored-'))
  try {
    await pg.exec(`CREATE DOMAIN retained_bound AS int4 CHECK(VALUE>0);CREATE TYPE retained_span AS RANGE(subtype=retained_bound,multirange_type_name=retained_set);
   CREATE TABLE retained_ranges(value retained_span[],CHECK(value IS NOT DISTINCT FROM '{"[1,3)"}'::retained_span[]));
   CREATE TABLE retained_multis(value retained_set[],CHECK(value IS NOT DISTINCT FROM '{"{[1,3)}"}'::retained_set[]));
   INSERT INTO retained_ranges VALUES('{"[1,3)"}');INSERT INTO retained_multis VALUES('{"{[1,3)}"}');`)
    let catalog = await snapshotCatalog(pg)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const multi of [false, true]) {
      const value = multi
        ? await readMultirangeArrayFixture(
            pg,
            catalogMultirangeType(
              'public.retained_set',
              undefined,
              catalog.domains,
              catalog.rangeTypes,
            )!,
            '{"{[1,3)}"}',
          )
        : await readRangeArrayFixture(
            pg,
            catalogRangeType(
              'public.retained_span',
              undefined,
              catalog.domains,
              catalog.rangeTypes,
            )!,
            '{"[1,3)"}',
          )
      fixtures.push({
        name: multi ? 'retained_multis' : 'retained_ranges',
        row: { value: { kind: 'Value', value: value! } },
        expected: { kind: 'True' },
      })
    }
    await pg.exec('ALTER DOMAIN retained_bound ADD CONSTRAINT tightened CHECK(VALUE>10) NOT VALID;')
    catalog = await snapshotCatalog(pg)
    const plans = catalog.tables
        .filter((t) => t.name.startsWith('retained_'))
        .map((table) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: table.name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              'stored',
              catalog.rangeTypes,
            )!.expression,
          ),
        })),
      names = plans.map((p) => p.identity.owner),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const c of group.checks)
      expect(c.kind, c.kind === 'unsupported' ? c.reason : '').toBe('supported')
    for (const table of ['retained_ranges', 'retained_multis'])
      await pg.exec(`INSERT INTO ${table} SELECT value FROM ${table}`)
    await expect(pg.query(`SELECT '{"[1,3)"}'::retained_span[]`)).rejects.toMatchObject({
      code: '23514',
    })
    await expect(pg.query(`SELECT '{"{[1,3)}"}'::retained_set[]`)).rejects.toMatchObject({
      code: '23514',
    })
    await runCheckParity(directory, 'customarraystored', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
