import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { jsonValueRequirements } from '../../scripts/check-measurements/catalog.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches C/UTF8 JSONB ordering, exact comparator values, container counts, Unicode key order and composition in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-order-'))
  const context = { defaultCollation: 'C', serverEncoding: 'UTF8' } as const
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    expect(
      (await pg.query(`SELECT datcollate FROM pg_database WHERE datname=current_database()`)).rows,
    ).toEqual([{ datcollate: 'C' }])
    expect((await pg.query(`SHOW server_encoding`)).rows).toEqual([{ server_encoding: 'UTF8' }])
    await pg.exec(
      'CREATE DOMAIN ordered_document AS jsonb;CREATE DOMAIN retained_ordered_document AS ordered_document',
    )
    const expressions: Record<string, string> = {
      lower: '(lhs<rhs) IS NOT DISTINCT FROM expected_lower',
      lower_equal: '(lhs<=rhs) IS NOT DISTINCT FROM expected_lower_equal',
      greater: '(lhs>rhs) IS NOT DISTINCT FROM expected_greater',
      greater_equal: '(lhs>=rhs) IS NOT DISTINCT FROM expected_greater_equal',
      lower_call: 'jsonb_lt(lhs,rhs) IS NOT DISTINCT FROM expected_lower',
      lower_equal_call: 'jsonb_le(lhs,rhs) IS NOT DISTINCT FROM expected_lower_equal',
      greater_call: 'jsonb_gt(lhs,rhs) IS NOT DISTINCT FROM expected_greater',
      greater_equal_call: 'jsonb_ge(lhs,rhs) IS NOT DISTINCT FROM expected_greater_equal',
      comparator: 'jsonb_cmp(lhs,rhs) IS NOT DISTINCT FROM expected_order',
      greatest: '(GREATEST(lhs,rhs)=lhs) IS NOT DISTINCT FROM expected_greatest',
      least: '(LEAST(lhs,rhs)=lhs) IS NOT DISTINCT FROM expected_least',
      row_order: '(ROW(lhs,1)<ROW(rhs,2)) IS NOT DISTINCT FROM expected_row',
      guarded: 'CASE WHEN bypass THEN true ELSE (lhs<rhs) IS NOT DISTINCT FROM expected_lower END',
      coalesced: '(COALESCE(lhs,rhs)<=rhs) IS NOT DISTINCT FROM expected_coalesced',
      selected:
        '((CASE WHEN choose_left THEN lhs ELSE rhs END)<rhs) IS NOT DISTINCT FROM expected_selected',
      extracted:
        "jsonb_cmp(lhs->'selected',rhs->'selected') IS NOT DISTINCT FROM expected_extracted",
      literal: `'[]'::retained_ordered_document < 'null'::jsonb`,
      implicit: `lhs<'true'`,
    }
    await pg.exec(
      `CREATE TABLE jsonb_orderings(lhs retained_ordered_document,rhs jsonb,expected_lower boolean,expected_lower_equal boolean,expected_greater boolean,expected_greater_equal boolean,expected_order integer,expected_greatest boolean,expected_least boolean,expected_row boolean,expected_coalesced boolean,expected_selected boolean,expected_extracted integer,bypass boolean,choose_left boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_orderings')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const plans = constraints.map((c) => ({
      expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: c.name },
    }))
    for (const missing of [
      {},
      { defaultCollation: 'C' } as const,
      { serverEncoding: 'UTF8' } as const,
    ]) {
      for (const [index, check] of prepareCheckRustGroup(plans, missing).checks.entries())
        expect(check, constraints[index]!.name).toEqual({
          kind: 'unsupported',
          reason:
            'JSONB ordering requires declared database default collation C and server encoding UTF8',
        })
    }
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const atoms = [
      null,
      'null',
      'false',
      'true',
      '-1',
      '0',
      '1.00',
      '2',
      '""',
      '"a"',
      '"Z"',
      '"é"',
      '[]',
      '{}',
      '[1]',
      '[1,2]',
      '[2,1]',
      '{"a":1}',
      '{"aa":1,"b":2}',
    ]
    const pairs: (readonly [string | null, string | null])[] = atoms.flatMap((a) =>
      atoms.map((b) => [a, b] as const),
    )
    pairs.push(
      ['9007199254740993', '9007199254740992'],
      ['1.2300e-5', '0.0000123'],
      ['-0.00', '0'],
      ['"a"', '"z"'],
      ['"a"', '"aa"'],
      ['"é"', '"é"'],
      ['"é"', '"ê"'],
      ['"雪"', '"😀"'],
      ['[null]', '[[]]'],
      ['{"a":null}', '{"a":[]}'],
      ['[999]', '[-999,0]'],
      ['["z"]', '["a",null]'],
      ['{"z":0}', '{"a":0,"b":0}'],
      ['{"b":9,"aa":0}', '{"aa":9,"b":0}'],
      ['{"aa":1,"é":9}', '{"aa":2,"é":0}'],
      ['{"雪":9,"abc":0}', '{"雪":0,"abc":1}'],
      ['{"😀":9,"aaaa":0}', '{"😀":0,"aaaa":1}'],
      ['{"":0,"é":1}', '{"":0,"aa":2}'],
      ['{"a":1,"a":2}', '{"a":2}'],
      ['{"a":[1,{"b":[2,3]}]}', '{"a":[1,{"b":[2,4]}]}'],
      ['{"selected":[1,2],"unused":0}', '{"selected":[1,3],"unused":0}'],
      ['{"selected":42,"unused":0}', '{"selected":[],"unused":0}'],
    )
    for (const [a, b] of [
      [127, 128],
      [2047, 2048],
      [65535, 65536],
      [128512, 128513],
      [0x80, 0x7ff],
      [0x800, 0xffff],
    ]) {
      pairs.push([
        JSON.stringify(String.fromCodePoint(a!)),
        JSON.stringify(String.fromCodePoint(b!)),
      ])
    }
    for (let i = 0; i < 32; i++) {
      const keys = Array.from(
        { length: i + 1 },
        (_, k) => ['é', 'aa', '雪', 'abc', '😀', 'aaaa', 'b'][k % 7]! + k,
      )
      const a = '{' + keys.map((key, k) => `${JSON.stringify(key)}:${k}`).join(',') + '}'
      const b =
        '{' +
        [...keys]
          .reverse()
          .map((key) => `${JSON.stringify(key)}:${keys.indexOf(key) + (i % 3 === 0 ? 0 : 1)}`)
          .join(',') +
        '}'
      pairs.push([a, b], [b, a])
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    let baseline: Row | undefined
    for (const [lhs, rhs] of pairs) {
      const data = (
        await pg.query<Record<string, string | number | boolean | null>>(
          `SELECT lhs::text lhs,rhs::text rhs,lhs<rhs expected_lower,lhs<=rhs expected_lower_equal,lhs>rhs expected_greater,lhs>=rhs expected_greater_equal,jsonb_cmp(lhs,rhs) expected_order,GREATEST(lhs,rhs)=lhs expected_greatest,LEAST(lhs,rhs)=lhs expected_least,ROW(lhs,1)<ROW(rhs,2) expected_row,COALESCE(lhs,rhs)<=rhs expected_coalesced,lhs<'true'::jsonb expected_implicit,jsonb_cmp(lhs->'selected',rhs->'selected') expected_extracted FROM (SELECT $1::jsonb lhs,$2::jsonb rhs) q`,
          [lhs, rhs],
        )
      ).rows[0]!
      const row: Row = Object.fromEntries(
        Object.entries(data)
          .filter(([k]) => k !== 'expected_implicit')
          .map(([k, v]) => [k, known(v)]),
      )
      row.bypass = known(false)
      row.choose_left = known(true)
      row.expected_selected = known(data.expected_lower!)
      for (const name of Object.keys(expressions).filter((name) => name !== 'implicit'))
        add(name, row, { kind: 'True' })
      add('implicit', row, {
        kind: data.expected_implicit === null ? 'Null' : data.expected_implicit ? 'True' : 'False',
      })
      add(
        'selected',
        {
          ...row,
          choose_left: known(false),
          expected_selected: known(rhs === null ? null : false),
        },
        { kind: 'True' },
      )
      oracle.push({ inputLeft: lhs, inputRight: rhs, ...data })
      if (lhs === '1.00' && rhs === '1.00') baseline = row
    }
    const base = baseline!
    for (const operand of [{ kind: 'Unknown' } as const, error('22003')]) {
      const expected: Outcome = operand.kind === 'Error' ? operand : { kind: 'Unknown' }
      for (const name of [
        'lower',
        'lower_equal',
        'greater',
        'greater_equal',
        'comparator',
        'greatest',
        'least',
        'row_order',
        'guarded',
        'coalesced',
        'selected',
      ]) {
        add(name, { ...base, lhs: operand }, expected)
        add(name, { ...base, rhs: operand }, expected)
      }
      add('guarded', { ...base, lhs: operand, bypass: known(true) }, { kind: 'True' })
      add(
        'selected',
        { ...base, lhs: operand, choose_left: known(false), expected_selected: known(false) },
        { kind: 'True' },
      )
    }
    for (const name of ['lower', 'comparator', 'row_order']) {
      add(name, { ...base, lhs: error('22003'), rhs: error('22012') }, error('22003'))
      add(name, { ...base, lhs: known(null), rhs: error('22012') }, error('22012'))
      for (const lhs of ['1', 'null', null]) {
        const witness = await pg.query<{ result: boolean }>(
          `SELECT (${expressions[name]}) AS result FROM (SELECT $1::jsonb lhs,NULL::jsonb rhs,false expected_lower,0 expected_order,true expected_row) args`,
          [lhs],
        )
        expect(witness.rows[0]!.result, name + ' strict NULL witness').toBe(false)
      }
      add(name, { ...base, lhs: { kind: 'Unknown' }, rhs: known(null) }, { kind: 'False' })
      add(name, { ...base, lhs: known('[1,]') }, { kind: 'Unknown' })
    }
    add('lower', { ...base, expected_lower: known(true) }, { kind: 'False' })
    add('comparator', { ...base, expected_order: known(1) }, { kind: 'False' })
    for (const depth of [128, 16384]) {
      const lhs = '['.repeat(depth) + '1' + ']'.repeat(depth),
        rhs = '['.repeat(depth) + '2' + ']'.repeat(depth)
      add(
        'lower',
        { ...base, lhs: known(lhs), rhs: known(rhs), expected_lower: known(true) },
        { kind: 'True' },
      )
      add(
        'comparator',
        { ...base, lhs: known(lhs), rhs: known(rhs), expected_order: known(-1) },
        { kind: 'True' },
      )
      add(
        'comparator',
        { ...base, lhs: known(lhs), rhs: known(lhs), expected_order: known(0) },
        { kind: 'True' },
      )
    }
    const orderCalls = builtinCallables().filter(
      (c) =>
        c.kind === 'function' &&
        c.schema === 'pg_catalog' &&
        ['jsonb_cmp', 'jsonb_lt', 'jsonb_le', 'jsonb_gt', 'jsonb_ge'].includes(c.name),
    )
    expect(orderCalls).toHaveLength(5)
    for (const call of orderCalls)
      expect(jsonValueRequirements(call)?.map((r) => r.setting)).toEqual([
        'default_collation',
        'server_encoding',
      ])
    await mkdir('artifacts/jsonb-ordering', { recursive: true })
    await writeFile(
      'artifacts/jsonb-ordering/oracle.json',
      JSON.stringify(
        { context, pairs: oracle, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_orderings',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
