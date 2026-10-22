import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves vector literal preparation, constant pruning and reached input/output errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-vector-preparation-'))
  try {
    const plans = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const known = (value: string | boolean | null): Input =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    const table = {
      columns: [
        { name: 'input_text', typeName: 'text', collationIsC: true },
        { name: 'expected', typeName: 'text', collationIsC: true },
        { name: 'bypass', typeName: 'boolean' },
      ],
    }
    const reference: {
      name: string
      input: string | null
      bypass: boolean | null
      expected: Outcome
    }[] = []
    for (const type of ['int2vector', 'oidvector']) {
      const element = type === 'int2vector' ? 'smallint' : 'oid'
      const forms = {
        typed_literal: `CASE WHEN true THEN true ELSE ('bad'::${type})::text IS NULL END`,
        typed_or: `true OR ('bad'::${type})::text IS NULL`,
        pruned_constant: `CASE WHEN true THEN true ELSE (('bad'::text)::${type})::text IS NULL END`,
        folded_constant: `CASE WHEN bypass THEN true ELSE (('bad'::text)::${type})::text=expected END`,
        reached_input: `CASE WHEN bypass THEN true ELSE (input_text::${type})::text=expected END`,
        typed_null: `NULL::${type} IS NULL`,
        pruned_header: `CASE WHEN true THEN true ELSE (ARRAY[NULL::${element}]::${type})::text=expected END`,
        reached_header: `CASE WHEN bypass THEN true ELSE (ARRAY[NULL::${element}]::${type})::text=expected END`,
      }
      for (const [operation, sql] of Object.entries(forms)) {
        const name = type + '_' + operation
        const expression = lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!.expression
        expect(expression.kind, name).not.toBe('uncertain')
        plans.push({
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: 'vector_preparation',
            constraint: name,
          },
        })
        for (const input of ['1 2', 'bad', null])
          for (const bypass of [true, false, null]) {
            let expected: Outcome
            try {
              const actual = (
                await pg.query<{ value: boolean | null }>(
                  `WITH inputs AS MATERIALIZED (SELECT $1::text input_text,$2::boolean bypass,'1 2'::text expected) SELECT (${sql}) value FROM inputs`,
                  [input, bypass],
                )
              ).rows[0]!.value
              expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
            } catch (e) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((e as { code: string }).code, 36) },
              }
            }
            const row = { input_text: known(input), expected: known('1 2'), bypass: known(bypass) }
            fixtures.push({ name, row, expected })
            reference.push({ name, input, bypass, expected })
          }
      }
    }
    expect(reference.find((r) => r.name === 'int2vector_typed_literal')!.expected).toEqual({
      kind: 'Error',
      value: { state: parseInt('22P02', 36) },
    })
    expect(reference.find((r) => r.name === 'int2vector_pruned_constant')!.expected).toEqual({
      kind: 'True',
    })
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    await runCheckParity(
      root,
      'vectorpreparation',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
