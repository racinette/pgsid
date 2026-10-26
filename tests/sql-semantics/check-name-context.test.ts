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
                  !(name === 'literal' && origin === 'stored') &&
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

it('compares C-collated name cast results without losing inherited collation through composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-name-cast-collation-')),
    packet = 'artifacts/goal-checks/completion-boundaries-active'
  try {
    const maxIdentifierBytes = (
      await pg.query<{ maxIdentifierBytes: number }>(
        await readFile('tools/check-rust/identifier-context.sql', 'utf8'),
      )
    ).rows[0]!.maxIdentifierBytes
    await pg.exec('CREATE DOMAIN cast_name AS name COLLATE "C"')
    const expressions: Record<string, string> = {
      equal: 'source::name=reference::name',
      ordered: 'source::name<reference::name',
      varying_value: 'varying_value::name=reference::name',
      padded: 'padded::name=reference::name',
      callable: 'pg_catalog.name(source)=reference::name',
      nullsafe: 'source::name IS NOT DISTINCT FROM reference::name',
      nulled: 'NULLIF(source::name,reference::name) IS NULL',
      selected: '(CASE WHEN choose THEN source::name ELSE reference::name END)>=reference::name',
      coalesced: 'COALESCE(source::name,reference::name)>=reference::name',
      greatest: 'GREATEST(source::name,reference::name)=reference::name',
      array: 'ARRAY[source::name]=ARRAY[reference::name]',
      array_any: 'source::name=ANY(ARRAY[reference::name,NULL::name])',
      domain: 'source::cast_name=reference::name',
      mixed: 'source::name=reference',
    }
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE name_cast_${name}(source text COLLATE "C",varying_value varchar COLLATE "C",padded bpchar COLLATE "C",reference text COLLATE "C",choose boolean,bypass boolean,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    const c = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const t = c.tables.find((t) => t.name === 'name_cast_' + name)!,
          k = t.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: t.name, constraint: origin },
          expression: lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source' ? `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(checks, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        maxIdentifierBytes,
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const [i, k] of group.checks.entries())
      expect(k.kind, checks[i]!.name + ('reason' in k ? ': ' + k.reason : '')).toBe('supported')
    const pairs: [string | null, string | null][] = [
        [null, null],
        [null, 'a'],
        ['a', null],
        ['alpha', 'alpha'],
        ['alpha', 'beta'],
        ['beta', 'alpha'],
        ['a   ', 'a'],
        ['A', 'a'],
        ['é', '😀'],
        ['é'.repeat(maxIdentifierBytes), 'é'.repeat(Math.floor(maxIdentifierBytes / 2))],
        ['a'.repeat(maxIdentifierBytes + 1), 'a'.repeat(maxIdentifierBytes)],
      ],
      known = (value: string | boolean | null): Input =>
        value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const [source, reference] of pairs)
      for (const choose of [false, true])
        for (const bypass of [false, true])
          for (const [name, sql] of Object.entries(expressions)) {
            const params = [source, source, source, reference, choose, bypass],
              answer = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (CASE WHEN bypass THEN true ELSE ${sql} END) value FROM (SELECT $1::text COLLATE "C" source,$2::varchar COLLATE "C" varying_value,$3::bpchar COLLATE "C" padded,$4::text COLLATE "C" reference,$5::bool choose,$6::bool bypass) q`,
                  params,
                )
              ).rows[0]!.value
            if (answer === false)
              await expect(
                pg.query(`INSERT INTO name_cast_${name} VALUES($1,$2,$3,$4,$5,$6)`, params),
              ).rejects.toMatchObject({ code: '23514' })
            else await pg.query(`INSERT INTO name_cast_${name} VALUES($1,$2,$3,$4,$5,$6)`, params)
            const expected: Outcome = {
                kind: answer === null ? 'Null' : answer ? 'True' : 'False',
              },
              row: Row = {
                source: known(source),
                varying_value: known(source),
                padded: known(source),
                reference: known(reference),
                choose: known(choose),
                bypass: known(bypass),
              }
            native.push({ name, row, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
          }
    for (const c of checks)
      fixtures.push({
        name: c.name,
        row: {
          source: { kind: 'Unknown' },
          varying_value: { kind: 'Unknown' },
          padded: { kind: 'Unknown' },
          reference: { kind: 'Unknown' },
          choose: { kind: 'Unknown' },
          bypass: known(true),
        },
        expected: { kind: 'True' },
      })
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'name-native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(join(packet, 'name-fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/name-cast-collation',
      group,
      checks.map((k) => k.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
