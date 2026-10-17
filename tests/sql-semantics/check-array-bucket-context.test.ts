import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
const known = (value: string | number | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('requires reached ordering context while retaining equality, empty, NULL and validation results', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-bucket-context-'))
  try {
    await pg.exec(
      'CREATE TABLE bucket_context(words text,query text,expected integer);CREATE TABLE bucket_context_oracle(LIKE bucket_context)',
    )
    const calls = {
      words: 'width_bucket(query,words::text[])',
      explicit: 'width_bucket(query COLLATE "C",words::text[])',
      documents: 'width_bucket(query::jsonb,words::jsonb[])',
    }
    const forms = Object.fromEntries(
      Object.entries(calls).map(([name, sql]) => [name, `(${sql}) IS NOT DISTINCT FROM expected`]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE bucket_context ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      original = catalog.tables.find((t) => t.name === 'bucket_context')!
    const table = {
      ...original,
      columns: original.columns.map((column) =>
        column.name === 'words' || column.name === 'query'
          ? {
              ...column,
              collationIsC: false,
              collationDeterministic: true,
              collationIsDefault: true,
            }
          : column,
      ),
    }
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
            origin === 'stored'
              ? table.constraints.find((c) => c.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    const documents = (
      await pg.query<{ ordered: string; same: string }>(
        `SELECT ARRAY['"a"'::jsonb,'"z"'::jsonb]::text ordered,ARRAY['"same"'::jsonb,'"same"'::jsonb,'"same"'::jsonb]::text same`,
      )
    ).rows[0]!
    const references: {
      name: string
      words: string | null
      query: string | null
      needsOrdering: boolean
      output: number | null
      expected: Outcome
    }[] = []
    for (const [name, call] of Object.entries(calls)) {
      const cases: (readonly [string | null, string | null, boolean])[] =
        name === 'documents'
          ? [
              [documents.ordered, '"m"', true],
              [documents.same, '"same"', false],
              ['{}', '"x"', false],
              ['{NULL}', '"x"', false],
              [documents.ordered, null, false],
              [null, '"x"', false],
            ]
          : [
              ['{a,z}', 'm', true],
              ['{same,same,same}', 'same', false],
              ['{}', 'x', false],
              ['{a,NULL}', 'z', false],
              ['{a,z}', null, false],
              [null, 'z', false],
            ]
      for (const [words, query, needsOrdering] of cases) {
        await pg.exec('TRUNCATE bucket_context_oracle')
        await pg.query('INSERT INTO bucket_context_oracle(words,query) VALUES($1,$2)', [
          words,
          query,
        ])
        let output: number | null = null,
          expected: Outcome
        try {
          output = (
            await pg.query<{ value: number | null }>(
              `SELECT ${call.replace('width_bucket(query,', 'width_bucket(query COLLATE "C",')} value FROM bucket_context_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: 'True' }
        } catch (cause) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((cause as { code: string }).code, 36) },
          }
        }
        references.push({ name, words, query, needsOrdering, output, expected })
      }
    }
    const contextCases = [
      {},
      { defaultCollation: 'C' as const },
      { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const },
    ]
    const archivedFixtures: unknown[] = []
    for (const [index, context] of contextCases.entries()) {
      const group = prepareCheckRustGroup(plans, { arrayNulls: true, ...context })
      for (const check of group.checks)
        expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const item of references) {
        const missing =
          item.name === 'words'
            ? !context.defaultCollation
            : item.name === 'documents'
              ? !context.defaultCollation || !('serverEncoding' in context)
              : false
        const expected: Outcome =
          item.needsOrdering && missing ? { kind: 'Unknown' } : item.expected
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: item.name + '_' + origin,
            row: {
              words: known(item.words),
              query: known(item.query),
              expected: known(item.output),
            },
            expected,
          })
      }
      archivedFixtures.push({ context, fixtures })
      const path = join(directory, String(index))
      await mkdir(path)
      await runCheckParity(
        path,
        'arraybucketcontext' + index,
        group,
        plans.map((p) => p.identity.constraint),
        fixtures,
      )
    }
    await mkdir('artifacts/array-bucket', { recursive: true })
    await writeFile(
      'artifacts/array-bucket/context-fixtures.json',
      JSON.stringify(archivedFixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-bucket/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
