import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: number | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('retains decisive results for safe unresolved branches while preserving possible failures and known lazy choices', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-choice-validity-'))
  try {
    const forms: Record<string, string> = {
      safe_and: '(CASE WHEN flag THEN amount+1>0 ELSE note IS NULL END) AND amount>0',
      safe_or: '(CASE WHEN flag THEN amount+1>0 ELSE false END) OR amount=0',
      scalar_case: '(CASE WHEN flag THEN amount+1 ELSE 0 END)>0 AND amount>0',
      divide_and: '(CASE WHEN flag THEN 1/amount>0 ELSE true END) AND amount>0',
      divide_or: '(CASE WHEN flag THEN 1/amount>0 ELSE false END) OR amount=0',
      integer_case: '(CASE WHEN flag THEN payload::integer ELSE 0 END)>0 AND amount>0',
      array_case:
        '(CASE WHEN flag THEN cardinality(array_payload::integer[])>0 ELSE true END) AND amount>0',
      coalesce_add: 'COALESCE(choice,amount+1)>0 AND amount>0',
      coalesce_divide: 'COALESCE(choice,1/amount)>0 AND amount>0',
      pure_bit_and: '(bit_send(bits) IS NOT NULL) AND amount>0',
      pure_bit_or: '(bit_send(bits) IS NOT NULL) OR amount=0',
      pure_md5_and: '(md5(packet) IS NOT NULL) AND amount>0',
      pure_sha_or: '(sha256(packet) IS NOT NULL) OR amount=0',
      bit_input_and: '(varbit_send(payload::varbit) IS NOT NULL) AND amount>0',
      md5_input_or: '(md5(payload::bytea) IS NOT NULL) OR amount=0',
      pure_ascii_and: '(ascii(note) IS NOT NULL) AND amount>0',
      ascii_case_and: '(CASE WHEN flag THEN ascii(note)>0 ELSE true END) AND amount>0',
      pure_numeric_or: '(numeric_send(decimal_amount) IS NOT NULL) OR amount=0',
      pure_uuid_and: '(uuid_extract_timestamp(identifier) IS NOT NULL) AND amount>0',
      ascii_input_and: '(ascii(chr(choice)) IS NOT NULL) AND amount>0',
      numeric_input_or: '(numeric_send(payload::numeric) IS NOT NULL) OR amount=0',
      uuid_input_and: '(uuid_extract_timestamp(payload::uuid) IS NOT NULL) AND amount>0',
    }
    await pg.exec(`CREATE TABLE choice_values(flag boolean,amount integer,choice integer,payload text,array_payload text,note text,bits varbit,packet bytea,decimal_amount numeric,identifier uuid);
      CREATE TABLE choice_definitions(LIKE choice_values,${Object.entries(forms)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'choice_definitions')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: lowerTableCheck(
          table,
          origin === 'stored'
            ? table.constraints.find((item) => item.name === name)!
            : { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          origin === 'source' ? 'source' : 'stored',
        )!.expression,
      })),
    )
    const condition = lowerTableCheck(
      table,
      { name: 'condition', type: 'check', definition: 'CHECK(flag)' },
      catalog.enums,
      catalog.domains,
      'source',
    )!.expression
    const right = lowerTableCheck(
      table,
      { name: 'right', type: 'check', definition: 'CHECK(amount>0)' },
      catalog.enums,
      catalog.domains,
      'source',
    )!.expression
    const opaque: EvalBoolExpression = {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [
        {
          kind: 'eval-case',
          branches: [{ when: condition, then: { kind: 'uncertain' } }],
          otherwise: {
            kind: 'certain',
            expression: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
          },
        },
        right,
      ],
    }
    plans.push({
      identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'opaque_choice' },
      expression: opaque,
    })
    const group = prepareCheckRustGroup(plans, { arrayNulls: true, serverEncoding: 'UTF8' })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const flag of [true, false, null])
      for (const [amount, choice, payload, arrayPayload, note] of [
        [0, null, '7', '{7}', null],
        [0, null, 'bad', 'bad', null],
        [1, 1, '7', '{7}', 'note'],
        [2147483647, null, '7', '{NULL}', null],
        [null, null, null, null, null],
        [0, null, '101', '{101}', null],
        [0, null, '\\x0', '{0}', null],
      ] as const) {
        await pg.exec('TRUNCATE choice_values')
        await pg.query('INSERT INTO choice_values VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [
          flag,
          amount,
          choice,
          payload,
          arrayPayload,
          note,
          '101',
          Buffer.from('abc'),
          '1.25',
          '00000000-0000-7000-8000-000000000000',
        ])
        const row = {
          flag: known(flag),
          amount: known(amount),
          choice: known(choice),
          payload: known(payload),
          array_payload: known(arrayPayload),
          note: known(note),
          bits: known('101'),
          packet: known('616263'),
          decimal_amount: known('1.25'),
          identifier: known('00000000-0000-7000-8000-000000000000'),
        }
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM choice_values`)
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name, row, expected })
          add(name, row, expected)
        }
      }
    const safe: Row = {
      flag: { kind: 'Unknown' },
      amount: known(0),
      choice: known(null),
      payload: known('7'),
      array_payload: known('{7}'),
      note: { kind: 'Unknown' },
      bits: { kind: 'Unknown' },
      packet: { kind: 'Unknown' },
      decimal_amount: { kind: 'Unknown' },
      identifier: { kind: 'Unknown' },
    }
    for (const name of ['safe_and', 'scalar_case', 'integer_case', 'array_case'])
      add(name, safe, { kind: 'False' })
    add('safe_or', safe, { kind: 'True' })
    for (const name of ['divide_and', 'divide_or']) add(name, safe, { kind: 'Unknown' })
    add('coalesce_add', { ...safe, choice: { kind: 'Unknown' } }, { kind: 'False' })
    add('coalesce_divide', { ...safe, choice: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('integer_case', { ...safe, payload: known('bad') }, { kind: 'Unknown' })
    add('array_case', { ...safe, array_payload: known('bad') }, { kind: 'Unknown' })
    add('safe_and', { ...safe, amount: known(-2147483648) }, { kind: 'False' })
    add('safe_and', { ...safe, amount: { kind: 'Unknown' } }, { kind: 'Unknown' })
    for (const name of ['pure_bit_and', 'pure_md5_and']) add(name, safe, { kind: 'False' })
    for (const name of ['pure_bit_or', 'pure_sha_or']) add(name, safe, { kind: 'True' })
    for (const name of ['pure_ascii_and', 'ascii_case_and', 'pure_uuid_and'])
      add(name, safe, { kind: 'False' })
    add('pure_numeric_or', safe, { kind: 'True' })
    for (const name of ['numeric_input_or', 'uuid_input_and'])
      add(name, { ...safe, payload: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('ascii_input_and', { ...safe, choice: { kind: 'Unknown' } }, { kind: 'Unknown' })
    for (const name of ['bit_input_and', 'md5_input_or'])
      add(name, { ...safe, payload: { kind: 'Unknown' } }, { kind: 'Unknown' })
    const earlierError: Input & Outcome = {
      kind: 'Error',
      value: { state: parseInt('22012', 36) },
    }
    add('pure_bit_and', { ...safe, bits: earlierError }, earlierError)
    add('pure_md5_and', { ...safe, packet: earlierError }, earlierError)
    add('pure_ascii_and', { ...safe, note: earlierError }, earlierError)
    add('pure_numeric_or', { ...safe, decimal_amount: earlierError }, earlierError)
    add('pure_uuid_and', { ...safe, identifier: earlierError }, earlierError)
    fixtures.push({ name: 'opaque_choice', row: safe, expected: { kind: 'Unknown' } })
    fixtures.push({
      name: 'opaque_choice',
      row: { ...safe, flag: known(false) },
      expected: { kind: 'False' },
    })
    await mkdir('artifacts/goal-checks/integer-scalar-input', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/integer-scalar-input/choice-validity-fixtures.json',
      JSON.stringify({ fixtures, references }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'choicevalidity',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
