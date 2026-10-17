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
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('retains partial array cells, NULL recovery, catalog requirements, source/conversion error phases and lazy I/O casts', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-io-context-'))
  try {
    await pg.exec(
      'CREATE TABLE array_io_context(first text,second text,divisor integer,bypass boolean,expected text);CREATE TABLE array_io_context_oracle(LIKE array_io_context)',
    )
    const outputs = {
      plain: 'array_to_json((ARRAY[first,second]::text[])::numeric[])::text',
      shape: 'array_dims((ARRAY[first,second]::text[])::numeric[])',
      first_null: '(((ARRAY[first,second]::text[])::numeric[])[1] IS NULL)::text',
      safe_first_null: '(((ARRAY[first,second]::varchar[])::text[])[1] IS NULL)::text',
      guarded:
        'CASE WHEN bypass THEN expected ELSE array_to_json(ARRAY[first,second]::numeric[])::text END',
      source_error: 'array_to_json((ARRAY[first,(1/divisor)::text]::text[])::numeric[])::text',
      element_error: 'array_to_json(ARRAY[first,(1/divisor)::text]::numeric[])::text',
      conversion_error: 'json_build_array(ARRAY[first,second]::numeric[],1/divisor)::text',
      sized: 'array_to_json(ARRAY[first,second]::numeric(4,1)[])::text',
      catalog: '((ARRAY[(1/divisor)::oid]::regclass[])::text[])::text',
      null_array: '((NULL::text[])::numeric[])::text',
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE array_io_context ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_io_context')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            [],
            [],
            origin,
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const base: Row = {
      first: known('1.2300'),
      second: known('2.500'),
      divisor: known(1),
      bypass: known(false),
      expected: known('[1.2300,2.500]'),
    }
    add('plain', { ...base, first: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('plain', { ...base, first: { kind: 'Unknown' }, second: known('bad') }, { kind: 'Unknown' })
    add('plain', { ...base, first: known('bad'), second: { kind: 'Unknown' } }, error('22P02'))
    add(
      'shape',
      { ...base, first: { kind: 'Unknown' }, expected: known('[1:2]') },
      { kind: 'Unknown' },
    )
    add(
      'first_null',
      { ...base, first: known(null), second: { kind: 'Unknown' }, expected: known('true') },
      { kind: 'Unknown' },
    )
    add(
      'first_null',
      { ...base, first: { kind: 'Unknown' }, second: known(null) },
      { kind: 'Unknown' },
    )
    add(
      'guarded',
      {
        ...base,
        bypass: known(true),
        first: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
      { kind: 'True' },
    )
    add(
      'safe_first_null',
      { ...base, first: known(null), second: { kind: 'Unknown' }, expected: known('true') },
      { kind: 'True' },
    )
    add('source_error', { ...base, first: known('bad'), divisor: known(0) }, error('22012'))
    add('element_error', { ...base, first: known('bad'), divisor: known(0) }, error('22P02'))
    add('source_error', { ...base, first: { kind: 'Unknown' }, divisor: known(0) }, error('22012'))
    add('conversion_error', { ...base, first: known('bad'), divisor: known(0) }, error('22P02'))
    add('sized', { ...base, first: known('9999'), second: known('bad') }, error('22003'))
    add('sized', { ...base, first: known('bad'), second: known('9999') }, error('22P02'))
    add(
      'plain',
      {
        ...base,
        first: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        second: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      error('22003'),
    )
    add('catalog', base, { kind: 'Unknown' })
    add('catalog', { ...base, divisor: known(0) }, error('22012'))
    add('null_array', { expected: known(null) }, { kind: 'True' })
    for (const first of [null, '1.2300', 'bad'])
      for (const divisor of [0, 1]) {
        await pg.exec('TRUNCATE array_io_context_oracle')
        await pg.query('INSERT INTO array_io_context_oracle VALUES($1,$2,$3,false,NULL)', [
          first,
          '2.500',
          divisor,
        ])
        for (const [name, sql] of Object.entries(outputs)) {
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql})::text value FROM array_io_context_oracle`,
              )
            ).rows[0]!.value
            expected = { kind: 'True' }
          } catch (cause) {
            expected = error((cause as { code: string }).code)
          }
          const deferred = name === 'catalog' && divisor === 1
          references.push({ name, first, divisor, output, expected, deferred })
          add(
            name,
            {
              first: known(first),
              second: known('2.500'),
              divisor: known(divisor),
              bypass: known(false),
              expected: known(output),
            },
            deferred ? { kind: 'Unknown' } : expected,
          )
        }
      }
    await mkdir('artifacts/array-io-casts', { recursive: true })
    await writeFile(
      'artifacts/array-io-casts/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-io-casts/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayiocontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
