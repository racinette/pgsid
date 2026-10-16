import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
const known = (value: string | number | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('threads declared UTF8 through JSONB casts, literals, scalar and array conversion and builders while preserving unbound requirements and conversion error phases', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TABLE encoded_documents(document json,payload text,divisor integer,expected jsonb);CREATE TABLE encoded_oracle(LIKE encoded_documents)',
    )
    const outputs: Record<string, string> = {
      scalar: 'to_jsonb(document)',
      array: 'to_jsonb(ARRAY[document])',
      nested: 'jsonb_build_array(ARRAY[document])',
      flattened: 'jsonb_build_array(VARIADIC ARRAY[document])',
      object: "jsonb_build_object('value',document)",
      key: 'jsonb_build_object(document,1)',
      null_key: 'jsonb_build_object(NULL::text,document)',
      text_cast: 'payload::jsonb',
      json_cast: 'document::jsonb',
      literal: '\'"\\u00e9"\'::jsonb',
      eager: 'jsonb_build_array(document,1/divisor)',
      array_eager: 'jsonb_build_array(ARRAY[document],1/divisor)',
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) IS NOT DISTINCT FROM expected`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE encoded_documents ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'encoded_documents')!,
      plans = Object.entries(forms).flatMap(([name, sql]) =>
        ['source', 'stored'].map((origin) => ({
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
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })),
      )
    const documents: [string | null, boolean][] = [
      [null, false],
      ['null', false],
      ['{"x":1}', false],
      ['{"x":"\\u0061"}', false],
      ['"\\u00e9"', true],
      ['{"\\u00e9":1,"雪":2}', true],
      ['"\\ud83d\\ude0a"', true],
      ['"\\u0000"', false],
      ['"\\ud800"', false],
      ['{"x":1e999999,"y":"\\u00e9"}', false],
      ['{"x":"\\u00e9","y":"\\u0000"}', true],
    ]
    const references: unknown[] = []
    for (const utf8 of [false, true]) {
      const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-encoding-context-'))
      try {
        const group = prepareCheckRustGroup(
          plans,
          utf8 ? { defaultCollation: 'C', serverEncoding: 'UTF8' } : { defaultCollation: 'C' },
        )
        for (const [index, check] of group.checks.entries())
          expect(
            check.kind,
            plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
          ).toBe('supported')
        const fixtures: { name: string; row: Row; expected: Outcome }[] = []
        for (const [document, dependent] of documents)
          for (const divisor of [0, 1])
            for (const [name, sql] of Object.entries(forms)) {
              await pg.exec('TRUNCATE encoded_oracle')
              await pg.query('INSERT INTO encoded_oracle VALUES($1,$2,$3,NULL)', [
                document,
                document,
                divisor,
              ])
              let output: string | null = null,
                expected: Outcome
              try {
                output = (
                  await pg.query<{ value: string | null }>(
                    `SELECT (${outputs[name]})::text value FROM encoded_oracle`,
                  )
                ).rows[0]!.value
                await pg.query('UPDATE encoded_oracle SET expected=$1', [output])
                expected = {
                  kind: (
                    await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM encoded_oracle`)
                  ).rows[0]!.value
                    ? 'True'
                    : 'False',
                }
              } catch (cause) {
                expect(['22023', '22003', '22012', '22P02', '22P05']).toContain(
                  (cause as { code: string }).code,
                )
                expected = {
                  kind: 'Error',
                  value: { state: parseInt((cause as { code: string }).code, 36) },
                }
              }
              if (utf8) references.push({ name, document, divisor, output, expected })
              const row = {
                document: known(document),
                payload: known(document),
                divisor: known(divisor),
                expected: known(output),
              }
              for (const origin of ['source', 'stored']) {
                const deferred =
                  !utf8 &&
                  (name === 'literal'
                    ? origin === 'source'
                    : dependent &&
                      !['key', 'null_key'].includes(name) &&
                      !(divisor === 0 && ['eager', 'array_eager'].includes(name)))
                fixtures.push({
                  name: name + '_' + origin,
                  row,
                  expected: deferred ? { kind: 'Unknown' } : expected,
                })
                if (expected.kind === 'True')
                  fixtures.push({
                    name: name + '_' + origin,
                    row: { ...row, expected: known('"wrong"') },
                    expected: deferred ? { kind: 'Unknown' } : { kind: 'False' },
                  })
              }
            }
        await mkdir('artifacts/json-null-strip', { recursive: true })
        await writeFile(
          `artifacts/json-null-strip/jsonb-${utf8 ? 'utf8' : 'unbound'}-fixtures.json`,
          JSON.stringify(fixtures, null, 2) + '\n',
        )
        await runCheckParity(
          directory,
          'jsonbencodingcontext' + String(utf8),
          group,
          plans.map((plan) => plan.identity.constraint),
          fixtures,
        )
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
    await writeFile(
      'artifacts/json-null-strip/jsonb-context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 240_000)
