import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it.each(['declared', 'width', 'absent'])(
  'uses explicit identifier-byte limits for name literals, scalar casts, overloads and array casts in every target (%s)',
  async (profileName) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-name-context-')),
      packet = 'artifacts/goal-checks/aclitem-text-active'
    const known = (value: string | boolean | null): Input =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    try {
      const maxIdentifierBytes = (
        await pg.query<{ maxIdentifierBytes: number }>(
          await readFile('tools/check-rust/identifier-context.sql', 'utf8'),
        )
      ).rows[0]!.maxIdentifierBytes
      const literal = 'é'.repeat(maxIdentifierBytes) + 'tail',
        normalizedLiteral = (
          await pg.query<{ v: string }>('SELECT $1::text::name::text v', [literal])
        ).rows[0]!.v,
        expressions: Record<string, string> = {
          cast: '(source::name)::text COLLATE "C" IS NOT DISTINCT FROM normalized COLLATE "C"',
          text_overload:
            'pg_catalog.name(source)::text COLLATE "C" IS NOT DISTINCT FROM normalized COLLATE "C"',
          varchar_overload:
            'pg_catalog.name(varying)::text COLLATE "C" IS NOT DISTINCT FROM normalized COLLATE "C"',
          bpchar_overload:
            'pg_catalog.name(padded)::text COLLATE "C" IS NOT DISTINCT FROM trimmed COLLATE "C"',
          array_cast:
            '(ARRAY[source]::name[])[1]::text COLLATE "C" IS NOT DISTINCT FROM normalized COLLATE "C"',
          literal: `'${literal}'::name::text COLLATE "C"='${normalizedLiteral}'::text COLLATE "C"`,
        }
      await pg.exec(
        `CREATE TABLE name_context_rows(source text,varying varchar,padded bpchar,normalized text,trimmed text,bypass boolean,${Object.entries(
          expressions,
        )
          .map(
            ([name, sql]) =>
              `CONSTRAINT "${name}" CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)`,
          )
          .join(',')})`,
      )
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'name_context_rows')!,
        checks = Object.entries(expressions).flatMap(([name, sql]) =>
          (['source', 'stored'] as const).map((origin) => {
            const c = table.constraints.find((c) => c.name === name)!
            return {
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
                    ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
                    : c,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
                )!.expression,
              ),
            }
          }),
        )
      const samples: (string | null)[] = [
        null,
        '',
        'abc',
        '   ',
        'abc   ',
        'a'.repeat(maxIdentifierBytes),
        'a'.repeat(maxIdentifierBytes + 1),
        'a'.repeat(maxIdentifierBytes - 1) + 'é',
        'é'.repeat(maxIdentifierBytes),
        '😀'.repeat(maxIdentifierBytes),
        'Quoted " and \\ slash',
      ]
      const rows: { source: string | null; row: Row; trimmed: string | null }[] = []
      let nativeInserts = 0
      for (const source of samples) {
        const native = (
          await pg.query<{ normalized: string | null; trimmed: string | null }>(
            'SELECT $1::text::name::text normalized,pg_catalog.name($1::text::bpchar)::text trimmed',
            [source],
          )
        ).rows[0]!
        await pg.query(
          'INSERT INTO name_context_rows VALUES($1::text,$1::text::varchar,$1::text::bpchar,$2,$3,false)',
          [source, native.normalized, native.trimmed],
        )
        nativeInserts++
        rows.push({
          source,
          trimmed: native.trimmed,
          row: {
            source: known(source),
            varying: known(source),
            padded: known(source),
            normalized: known(native.normalized),
            trimmed: known(native.trimmed),
            bypass: known(false),
          },
        })
      }
      const profiles: { name: string; context: CheckExecutionContext }[] = [
        {
          name: 'declared',
          context: {
            maxIdentifierBytes,
            serverEncoding: 'UTF8',
            arrayNulls: true,
            defaultCollation: 'C',
          },
        },
        { name: 'width', context: { maxIdentifierBytes, arrayNulls: true, defaultCollation: 'C' } },
        { name: 'absent', context: { arrayNulls: true, defaultCollation: 'C' } },
      ]
      await mkdir(packet, { recursive: true })
      await writeFile(
        join(packet, 'name-reference.json'),
        JSON.stringify({ maxIdentifierBytes, nativeInserts, samples }, null, 2) + '\n',
      )
      for (const profile of profiles.filter((p) => p.name === profileName)) {
        const group = prepareCheckRustGroup(checks, profile.context)
        group.checks.forEach((c, i) =>
          expect(
            c.kind,
            checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : ''),
          ).toBe('supported'),
        )
        const fixtures: { name: string; row: Row; expected: Outcome }[] = []
        for (const sample of rows)
          for (const name of Object.keys(expressions))
            for (const origin of ['source', 'stored']) {
              const text =
                  name === 'literal'
                    ? literal
                    : name === 'bpchar_overload'
                      ? (sample.source?.replace(/ +$/, '') ?? null)
                      : sample.source,
                deferred =
                  text !== null &&
                  text !== '' &&
                  (profile.context.maxIdentifierBytes === undefined ||
                    (profile.context.serverEncoding !== 'UTF8' && /[^\x00-\x7f]/u.test(text)))
              fixtures.push({
                name: name + '_' + origin,
                row: sample.row,
                expected: { kind: deferred ? 'Unknown' : 'True' },
              })
              fixtures.push({
                name: name + '_' + origin,
                row: { ...sample.row, bypass: known(true) },
                expected: { kind: name === 'literal' && deferred ? 'Unknown' : 'True' },
              })
            }
        await runCheckParity(
          root,
          'namecontext' + profile.name,
          group,
          checks.map((c) => c.identity.constraint),
          fixtures,
        )
        console.log(`Name context ${profile.name}: ${fixtures.length} fixtures`)
      }
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  600_000,
)
