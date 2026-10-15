import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches JSONB equality and iterative containment, exact numerics, unordered objects, array backtracking and lazy composition in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-relations-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(
      'CREATE DOMAIN relation_document AS jsonb;CREATE DOMAIN retained_relation_document AS relation_document',
    )
    const expressions: Record<string, string> = {
      equal: '(lhs=rhs) IS NOT DISTINCT FROM expected_equal',
      unequal: '(lhs<>rhs) IS NOT DISTINCT FROM expected_unequal',
      contains: '(lhs @> rhs) IS NOT DISTINCT FROM expected_contains',
      contained: '(lhs <@ rhs) IS NOT DISTINCT FROM expected_contained',
      equal_call: 'jsonb_eq(lhs,rhs) IS NOT DISTINCT FROM expected_equal',
      unequal_call: 'jsonb_ne(lhs,rhs) IS NOT DISTINCT FROM expected_unequal',
      contains_call: 'jsonb_contains(lhs,rhs) IS NOT DISTINCT FROM expected_contains',
      contained_call: 'jsonb_contained(lhs,rhs) IS NOT DISTINCT FROM expected_contained',
      distinct: '(lhs IS DISTINCT FROM rhs) IS NOT DISTINCT FROM expected_distinct',
      nullif: '(NULLIF(lhs,rhs) IS NULL) IS NOT DISTINCT FROM expected_nullif',
      selected:
        '((CASE WHEN choose_left THEN lhs ELSE rhs END)=lhs) IS NOT DISTINCT FROM expected_selected',
      coalesced: '(COALESCE(lhs,rhs)=rhs) IS NOT DISTINCT FROM expected_coalesced',
      guarded:
        'CASE WHEN bypass THEN true ELSE (lhs @> rhs) IS NOT DISTINCT FROM expected_contains END',
      extracted: '(lhs->field_name) IS NOT DISTINCT FROM (rhs->field_name)',
      literal: `'1.00'::jsonb = '1e0'::retained_relation_document`,
      implicit: `lhs='1.00'`,
    }
    await pg.exec(
      `CREATE TABLE jsonb_relations(lhs retained_relation_document,rhs jsonb,expected_equal boolean,expected_unequal boolean,expected_contains boolean,expected_contained boolean,expected_distinct boolean,expected_nullif boolean,expected_selected boolean,expected_coalesced boolean,choose_left boolean,bypass boolean,field_name text,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_relations')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    const atoms = [
      null,
      'null',
      'false',
      'true',
      '0',
      '1.00',
      '2',
      '"a"',
      '"A"',
      '"é"',
      '[]',
      '{}',
      '[1]',
      '[1,2]',
      '[2,1,1]',
      '{"a":1}',
      '{"a":1.00,"b":2}',
    ]
    const pairs: (readonly [string | null, string | null])[] = atoms.flatMap((a) =>
      atoms.map((b) => [a, b] as const),
    )
    pairs.push(
      ['9007199254740993.00', '9007199254740993'],
      ['9007199254740993', '9007199254740992'],
      ['1.230e-5', '0.00001230'],
      ['-0.00', '0'],
      ['"é"', '"é"'],
      ['{"a":1,"a":2}', '{"a":2}'],
      ['{"aa":1,"é":2}', '{"é":2,"aa":1.00}'],
      ['{"a":[1,2]}', '{"a":1}'],
      ['{"a":[1,2]}', '{"a":[2,1,1]}'],
      ['[[1,2]]', '[1]'],
      ['[[1,2]]', '[[1]]'],
      ['[[1,2]]', '[[2],[1]]'],
      ['[{}, {"a":1,"b":2}]', '[{"a":1}]'],
      ['[{"a":0},{"a":1}]', '[{"a":1}]'],
      ['[{"a":[1]},{"a":[2,3]}]', '[{"a":[3]}]'],
      ['[{"a":1}]', '[{"a":1},{"a":1.00}]'],
      ['{"":null,"雪":{"a":[1,"x"]}}', '{"雪":{"a":["x"]}}'],
      ['[null,"a",true,1]', 'null'],
      ['[null,"a",true,1]', '"a"'],
      ['"a"', '["a"]'],
      ['[]', 'null'],
      ['null', '[]'],
      ['[{}]', '{}'],
    )
    for (let i = 0; i < 60; i++) {
      const a = `{"k${i % 7}":[${i % 5},{"x":${i % 3},"y":true}],"duplicate":1,"duplicate":${i % 4}}`
      const b =
        i % 3 === 0
          ? `{"k${i % 7}":[{"x":${i % 3}}]}`
          : i % 3 === 1
            ? `{"duplicate":${(i + 1) % 4}}`
            : a
      pairs.push([a, b])
    }
    let base: Row | undefined
    for (const [lhs, rhs] of pairs) {
      const data = (
        await pg.query<{
          lhs: string | null
          rhs: string | null
          equal: boolean | null
          unequal: boolean | null
          contains: boolean | null
          contained: boolean | null
          distinct: boolean
          nullif: boolean
          coalesced: boolean | null
        }>(
          `SELECT lhs::text lhs,rhs::text rhs,lhs=rhs equal,lhs<>rhs unequal,lhs @> rhs contains,lhs <@ rhs contained,lhs IS DISTINCT FROM rhs distinct,NULLIF(lhs,rhs) IS NULL nullif,COALESCE(lhs,rhs)=rhs coalesced FROM (SELECT $1::jsonb lhs,$2::jsonb rhs) q`,
          [lhs, rhs],
        )
      ).rows[0]!
      const row: Row = {
        lhs: known(data.lhs),
        rhs: known(data.rhs),
        expected_equal: known(data.equal),
        expected_unequal: known(data.unequal),
        expected_contains: known(data.contains),
        expected_contained: known(data.contained),
        expected_distinct: known(data.distinct),
        expected_nullif: known(data.nullif),
        expected_selected: known(lhs === null ? null : true),
        expected_coalesced: known(data.coalesced),
        choose_left: known(true),
        bypass: known(false),
        field_name: known('a'),
      }
      for (const name of [
        'equal',
        'unequal',
        'contains',
        'contained',
        'equal_call',
        'unequal_call',
        'contains_call',
        'contained_call',
        'distinct',
        'nullif',
        'selected',
        'coalesced',
        'guarded',
        'literal',
      ])
        add(name, row, { kind: 'True' })
      add(
        'selected',
        { ...row, choose_left: known(false), expected_selected: known(data.equal) },
        { kind: 'True' },
      )
      oracle.push({ inputLeft: lhs, inputRight: rhs, ...data })
      if (lhs === '1.00' && rhs === '1.00') base = row
    }
    const baseline = base!
    for (const operand of [{ kind: 'Unknown' } as const, error('22003')]) {
      const expected: Outcome = operand.kind === 'Error' ? operand : { kind: 'Unknown' }
      for (const name of [
        'equal',
        'unequal',
        'contains',
        'contained',
        'distinct',
        'nullif',
        'selected',
        'coalesced',
        'guarded',
      ]) {
        add(name, { ...baseline, lhs: operand }, expected)
        if (name !== 'selected') add(name, { ...baseline, rhs: operand }, expected)
      }
      add('selected', { ...baseline, rhs: operand }, { kind: 'True' })
      add('guarded', { ...baseline, lhs: operand, bypass: known(true) }, { kind: 'True' })
    }
    for (const name of ['equal', 'contains', 'contained']) {
      add(name, { ...baseline, lhs: error('22003'), rhs: error('22012') }, error('22003'))
      add(name, { ...baseline, lhs: known(null), rhs: error('22012') }, error('22012'))
      add(name, { ...baseline, lhs: { kind: 'Unknown' }, rhs: known(null) }, { kind: 'Unknown' })
    }
    add('equal', { ...baseline, expected_equal: known(false) }, { kind: 'False' })
    add('implicit', baseline, { kind: 'True' })
    add('implicit', { ...baseline, lhs: known('2') }, { kind: 'False' })
    for (const name of ['equal', 'contains', 'contained'])
      add(name, { ...baseline, lhs: known('[1,]') }, { kind: 'Unknown' })
    for (const source of ['{"a":[1,2],"b":3}', '{"a":{"aa":1,"é":2},"b":3}'])
      add('extracted', { ...baseline, lhs: known(source), rhs: known(source) }, { kind: 'True' })
    for (const depth of [128, 16384]) {
      const source = '['.repeat(depth) + '1' + ']'.repeat(depth)
      const rhs = '['.repeat(depth) + '1.00' + ']'.repeat(depth)
      for (const name of ['equal', 'contains', 'contained'])
        add(name, { ...baseline, lhs: known(source), rhs: known(rhs) }, { kind: 'True' })
    }
    await mkdir('artifacts/jsonb-relations', { recursive: true })
    await writeFile(
      'artifacts/jsonb-relations/oracle.json',
      JSON.stringify(
        { pairs: oracle, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_relations',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
