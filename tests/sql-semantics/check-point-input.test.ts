import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { pointInputForms, deferredPointPlatformForms } from './check-point-input-forms.js'
const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const expressions = {
  input: 'point_send(source::point) = expected',
  varying: 'point_send(source::varchar::point) = expected',
  domain: 'point_send(source::coordinate_point) = expected',
  typename: 'point_send(point(source)) = expected',
  lazy: 'CASE WHEN skip THEN true ELSE point_send(source::point) = expected END',
  selected: 'point_send(CASE WHEN skip THEN known_position ELSE source::point END) = expected',
  coalesced: 'point_send(COALESCE(known_position, source::point)) = expected',
  literal: "point_send('(1,2)'::point) = expected",
  domain_literal: "point_send('1,2'::coordinate_point) = expected",
  implicit_literal: "point_eq(known_position,'(1,2)')",
  null_literal: 'point_send(NULL::point) = expected',
}
describe('point text input and literals', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-point-input-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches portable point grammar, decimal coordinate rounding, range and syntax errors, typed literals, domains, coercions and lazy runtime casts', async () => {
    await pg.exec(
      `CREATE DOMAIN coordinate_point AS point;CREATE TABLE point_input_checks(source text,expected bytea,skip bool,known_position coordinate_point,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'point_input_checks')!
    const badLiteral = "CASE WHEN skip THEN true ELSE point_send('(bad,0)'::point) = expected END"
    const constraints = [
      ...Object.entries(expressions).flatMap(([name, sql]) => {
        const stored = table.constraints.find((c) => c.name === name)!
        return [
          { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
          { ...stored, name: name + '_stored' },
        ]
      }),
      {
        ...table.constraints.find((c) => c.name === 'literal')!,
        name: 'invalid_literal',
        definition: `CHECK (${badLiteral})`,
      },
    ]
    await expect(
      pg.query(`SELECT CASE WHEN $1 THEN true ELSE point_send('(bad,0)'::point) = $2::bytea END`, [
        true,
        new Uint8Array(),
      ]),
    ).rejects.toMatchObject({ code: '22P02' })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const text of pointInputForms) {
      let hex: string | null = null,
        expected: Outcome
      try {
        hex = (
          await pg.query<{ hex: string | null }>("SELECT encode(point_send($1::point),'hex') hex", [
            text,
          ])
        ).rows[0]!.hex
        expected = {
          kind:
            hex === null
              ? 'Null'
              : [0, 8].some((at) => Number.isNaN(Buffer.from(hex!, 'hex').readDoubleBE(at)))
                ? 'Unknown'
                : 'True',
        }
      } catch (caught) {
        const code = (caught as { code: string }).code
        expect(['22P02', '22003']).toContain(code)
        expected = error(code)
      }
      const row: Row = {
        source: value(text),
        expected: value(hex),
        skip: value(false),
        known_position: value(null),
      }
      for (const name of [
        'input',
        'varying',
        'domain',
        'typename',
        'lazy',
        'selected',
        'coalesced',
      ])
        add(name, row, expected)
      add('lazy', { ...row, skip: value(true) }, { kind: 'True' })
    }
    const wire = '3ff00000000000004000000000000000',
      known = value({ x: 0x3ff0000000000000n, y: 0x4000000000000000n })
    const baseline: Row = {
      source: value('(bad,0)'),
      expected: value(wire),
      skip: value(true),
      known_position: known,
    }
    for (const name of ['literal', 'domain_literal', 'implicit_literal', 'selected', 'coalesced'])
      add(name, baseline, { kind: 'True' })
    add('null_literal', baseline, { kind: 'Null' })
    for (const skip of [true, false])
      fixtures.push({
        name: 'invalid_literal',
        row: { ...baseline, skip: value(skip) },
        expected: error('22P02'),
      })
    for (const text of [...deferredPointPlatformForms, '(' + '0'.repeat(4097) + ',0)']) {
      add('input', { ...baseline, source: value(text) }, { kind: 'Unknown' })
      add('lazy', { ...baseline, source: value(text), skip: value(false) }, { kind: 'Unknown' })
      add('lazy', { ...baseline, source: value(text), skip: value(true) }, { kind: 'True' })
    }
    for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
      add('input', { ...baseline, source: state }, state as Outcome)
      add('lazy', { ...baseline, source: state, skip: value(true) }, { kind: 'True' })
      add('selected', { ...baseline, source: state }, { kind: 'True' })
      add('coalesced', { ...baseline, source: state }, { kind: 'True' })
    }
    await runCheckParity(
      directory,
      'pointinput',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('unwraps unconstrained point domains while retaining domain-enforcement gaps and builtin type names', async () => {
    await pg.exec(`CREATE DOMAIN empty_coordinate AS point;
      CREATE DOMAIN nested_empty_coordinate AS empty_coordinate;
      CREATE DOMAIN positive_coordinate AS point CHECK (point_right(VALUE, point(0,0)));
      CREATE DOMAIN required_coordinate AS point NOT NULL;
      CREATE SCHEMA point_shadow;
      CREATE DOMAIN point_shadow.date AS point;
      CREATE TABLE point_domain_checks(source text,expected bytea,
        CONSTRAINT nested CHECK (point_send(source::nested_empty_coordinate) = expected),
        CONSTRAINT checked CHECK (point_send(source::positive_coordinate) = expected),
        CONSTRAINT required CHECK (point_send(source::required_coordinate) = expected),
        CONSTRAINT qualified CHECK (point_send(source::point_shadow.date) = expected),
        CONSTRAINT builtin_day CHECK (source::date IS NOT NULL))`)
    await expect(pg.query('SELECT $1::positive_coordinate', ['(-1,0)'])).rejects.toMatchObject({
      code: '23514',
    })
    await expect(pg.query('SELECT $1::required_coordinate', [null])).rejects.toMatchObject({
      code: '23502',
    })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'point_domain_checks')!
    const constraints = table.constraints.filter((constraint) => constraint.type === 'check')
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const row: Row = { source: value('(1,2)'), expected: value('3ff00000000000004000000000000000') }
    const fixtures = [
      { name: 'nested', row, expected: { kind: 'True' } as Outcome },
      { name: 'qualified', row, expected: { kind: 'True' } as Outcome },
      {
        name: 'nested',
        row: { ...row, source: value(null) },
        expected: { kind: 'Null' } as Outcome,
      },
      { name: 'nested', row: { ...row, source: value('(bad,0)') }, expected: error('22P02') },
      {
        name: 'builtin_day',
        row: { ...row, source: value('2000-01-01') },
        expected: { kind: 'True' } as Outcome,
      },
      ...['checked', 'required'].flatMap((name) =>
        [null, '(1,2)', '(bad,0)'].map((source) => ({
          name,
          row: { ...row, source: value(source) },
          expected: { kind: 'Unknown' } as Outcome,
        })),
      ),
    ]
    await mkdir(join(directory, 'domains'), { recursive: true })
    await runCheckParity(
      join(directory, 'domains'),
      'pointdomains',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)
  it('snapshots point literals and defaults losslessly while restoring floating rendering settings', async () => {
    await pg.exec(`CREATE DOMAIN precise_coordinate AS point DEFAULT '(1.0000000000000002,-0)'::point;
      CREATE TABLE point_literal_precision(position precise_coordinate DEFAULT '(1.0000000000000002,-0)'::point,expected bytea,
        CONSTRAINT exact_wire CHECK (point_send('(1.0000000000000002,-0)'::point) = expected))`)
    await pg.exec('SET extra_float_digits=0')
    try {
      const lossy = (
        await pg.query<{ definition: string }>(
          "SELECT pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='point_literal_precision'::regclass AND conname='exact_wire'",
        )
      ).rows[0]!.definition
      expect(lossy).not.toContain('1.0000000000000002')
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((table) => table.name === 'point_literal_precision')!
      const constraint = table.constraints.find((constraint) => constraint.name === 'exact_wire')!
      expect(constraint.definition).toContain('1.0000000000000002')
      expect(table.columns.find((column) => column.name === 'position')!.defaultExpr).toContain(
        '1.0000000000000002',
      )
      expect(
        catalog.domains.find((domain) => domain.name === 'precise_coordinate')!.default,
      ).toContain('1.0000000000000002')
      expect(
        (
          await pg.query<{ setting: string }>(
            "SELECT current_setting('extra_float_digits') setting",
          )
        ).rows[0]!.setting,
      ).toBe('0')
      const group = prepareCheckRustGroup([
        {
          expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        },
      ])
      expect(group.checks[0]!.kind).toBe('supported')
      const folder = join(directory, 'precision')
      await mkdir(folder, { recursive: true })
      await runCheckParity(
        folder,
        'pointprecision',
        group,
        ['exact_wire'],
        [
          {
            name: 'exact_wire',
            row: { expected: value('3ff00000000000018000000000000000') },
            expected: { kind: 'True' },
          },
          {
            name: 'exact_wire',
            row: { expected: value('3ff00000000000008000000000000000') },
            expected: { kind: 'False' },
          },
        ],
      )
    } finally {
      await pg.exec('RESET extra_float_digits')
    }
  }, 300_000)
})
