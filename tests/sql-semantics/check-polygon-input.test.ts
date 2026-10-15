import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { polygonInputForms, deferredPolygonPlatformForms } from './check-polygon-input-forms.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('matches polygon input grammar and error order, typed literals, domains, NaN precision and lazy runtime casts across targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-polygon-input-'))
  try {
    const expressions: Record<string, string> = {
      parsed: 'poly_send(input::polygon)=expected',
      constructor: 'poly_send(polygon(input))=expected',
      domain_cast: 'poly_send(input::nested_shape)=expected',
      lazy: 'CASE WHEN skip THEN true ELSE poly_send(input::polygon)=expected END',
      count: 'npoints(input::polygon)=expected_count',
      bounds_length: 'length(box_send(box(input::polygon)))=32',
      literal: "poly_send('((0,0),(3,4))'::polygon)=literal_expected",
      literal_constructor: "poly_send(polygon('((0,0),(3,4))'))=literal_expected",
      selected_literal:
        "poly_send(CASE WHEN skip THEN '((0,0),(3,4))'::polygon ELSE '((5,5))'::polygon END)=literal_expected",
      null_literal: 'NULL::polygon IS NULL',
    }
    await pg.exec(`CREATE DOMAIN shape AS polygon; CREATE DOMAIN nested_shape AS shape;
      CREATE TABLE polygon_input(input text,expected bytea,literal_expected bytea,expected_count int4,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'polygon_input')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    const invalid = "CASE WHEN skip THEN true ELSE poly_send('((bad,0))'::polygon)=expected END"
    await expect(
      pg.exec(
        `CREATE TABLE invalid_polygon_literal(expected bytea,skip boolean CHECK(${invalid}))`,
      ),
    ).rejects.toMatchObject({ code: '22P02' })
    constraints.push({
      ...constraints[0]!,
      name: 'invalid_preparation',
      definition: `CHECK(${invalid})`,
    })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const check of group.checks)
      expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
    const literalWire = (
      await pg.query<{ wire: string }>(
        "SELECT encode(poly_send('((0,0),(3,4))'::polygon),'hex') wire",
      )
    ).rows[0]!.wire
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    const base: Row = {
      input: known('((0,0),(3,4))'),
      expected: known(literalWire),
      literal_expected: known(literalWire),
      expected_count: known(2),
      skip: known(true),
    }
    for (const form of polygonInputForms) {
      let wire: string | null = null,
        expected: Outcome,
        count: number | null = null
      try {
        wire = (
          await pg.query<{ wire: string | null }>(
            "SELECT encode(poly_send($1::polygon),'hex') wire",
            [form],
          )
        ).rows[0]!.wire
        if (wire === null) expected = { kind: 'Null' }
        else {
          const bytes = Buffer.from(wire, 'hex')
          count = bytes.readInt32BE()
          let nan = false
          for (let at = 4; at < bytes.length; at += 8) nan ||= Number.isNaN(bytes.readDoubleBE(at))
          expected = { kind: nan ? 'Unknown' : 'True' }
        }
      } catch (caught) {
        expected = failure((caught as { code: string }).code)
      }
      const row = {
        ...base,
        input: known(form),
        expected: known(wire),
        expected_count: known(count),
      }
      for (const name of ['parsed', 'constructor', 'domain_cast']) add(name, row, expected)
      add('lazy', { ...row, skip: known(false) }, expected)
      add('lazy', row, { kind: 'True' })
      for (const name of ['count', 'bounds_length'])
        add(
          name,
          row,
          expected.kind === 'Error' ? expected : { kind: wire === null ? 'Null' : 'True' },
        )
    }
    for (const form of [...deferredPolygonPlatformForms, '((0,0))' + ' '.repeat(4097)])
      for (const name of ['parsed', 'constructor', 'domain_cast', 'count', 'bounds_length'])
        add(name, { ...base, input: known(form) }, { kind: 'Unknown' })
    for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[])
      for (const name of ['parsed', 'constructor', 'domain_cast', 'count', 'bounds_length'])
        add(name, { ...base, input: state }, state as Outcome)
    for (const name of ['literal', 'literal_constructor', 'selected_literal', 'null_literal'])
      add(name, base, { kind: 'True' })
    fixtures.push({ name: 'invalid_preparation', row: base, expected: failure('22P02') })
    await mkdir(join(root, 'input'))
    await runCheckParity(
      join(root, 'input'),
      'polygoninput',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
