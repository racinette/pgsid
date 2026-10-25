import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

it('evaluates query range and multirange input, relations, set operations and bound composition against native INSERTs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-ranges-'))
  const packet = 'artifacts/goal-checks/tsquery-ranges-active'
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      'CREATE TYPE query_span AS RANGE(subtype=tsquery,multirange_type_name=query_ranges)',
    )
    const v = 'source::query_span',
      w = 'other::query_span',
      m = 'members::query_ranges',
      term = 'term::tsquery'
    const forms: Record<string, string> = {
      same: `${v}=${w}`,
      less: `${v}<${w}`,
      contains: `${v}@>${w}`,
      element: `${v}@>${term}`,
      contained: `${v}<@${w}`,
      overlap: `${v}&&${w}`,
      adjacent: `${v}-|-${w}`,
      before: `${v}<<${w}`,
      after: `${v}>>${w}`,
      left: `${v}&<${w}`,
      right: `${v}&>${w}`,
      union: `${v}+${w}`,
      intersection: `${v}*${w}`,
      difference: `${v}-${w}`,
      merged: `range_merge(${v},${w})`,
      empty: `isempty(${v})`,
      lower: `lower(${v})`,
      upper: `upper(${v})`,
      lower_inc: `lower_inc(${v})`,
      upper_inc: `upper_inc(${v})`,
      lower_inf: `lower_inf(${v})`,
      upper_inf: `upper_inf(${v})`,
      constructed: `query_span(lower(${v}),upper(${v}),'[]')`,
      multi_contains: `${m}@>${v}`,
      multi_element: `${m}@>${term}`,
      multi_overlap: `${m}&&query_ranges(${w})`,
      multi_union: `${m}+query_ranges(${v})`,
      multi_intersection: `${m}*query_ranges(${w})`,
      multi_difference: `${m}-query_ranges(${w})`,
      multi_merge: `range_merge(${m})`,
      multi_lower: `lower(${m})`,
      multi_upper: `upper(${m})`,
      multi_empty: `isempty(${m})`,
      json: `to_jsonb(${m})`,
    }
    const columns = 'source text,other text,members text,term text,expected text,bypass bool'
    const check = (body: string) =>
      `CASE WHEN bypass THEN true ELSE (${body})::text IS NOT DISTINCT FROM expected END`
    for (const [name, body] of Object.entries(forms))
      await pg.exec(`CREATE TABLE range_${name}(${columns},CONSTRAINT rule CHECK(${check(body)}))`)
    await pg.exec(`CREATE TEMP TABLE range_input(${columns})`)
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(forms).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'range_' + name)!,
          c = table.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              c,
              [],
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${check(body)})` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, {
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
        defaultCollation: 'C',
        arrayNulls: true,
      })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const cases: (string | null)[][] = [
      ['[a,zzzzzzzzzz)', '[bb,zzzzzzzzzz]', '{[a,bb),[ccc,zzzzzzzzzz]}', 'a'],
      ['[a,bb)', '[ccc,zzzzzzzzzz)', '{[a,bb),[ccc,zzzzzzzzzz)}', 'bb'],
      ['[a,bb)', '[bb,ccc)', '{[a,bb)}', 'bb'],
      ['(a,bb)', '(bb,zzzzzzzzzz)', '{(a,bb)}', 'bb'],
      ['empty', '(,)', '{}', ''],
      ['(,)', '[a,bb)', '{(,)}', 'a'],
      [null, null, null, null],
      ['[a,)', 'empty', '{}', null],
      ['[zzzzzzzzzz,a)', '[a,bb)', '{}', 'a'],
      ['[a &,zzzzzzzzzz)', '[a,bb)', '{}', 'a'],
      ['[a,bb)', '[a,bb)', '{bad}', 'a'],
      ['["é","日本")', '["日本",)', '{["é","日本")}', 'é'],
      ['["a & (b & c)",)', '["(a & b) & c",)', '{["a & (b & c)",)}', 'a & (b & c)'],
      ['[fGEtsNKMDB,)', '[6P7Sag1hsi,)', '{[fGEtsNKMDB,)}', 'fGEtsNKMDB'],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejections = 0
    for (const [source, other, members, term] of cases)
      for (const wrong of [false, true])
        for (const bypass of [false, true]) {
          await pg.exec('DELETE FROM range_input')
          await pg.query('INSERT INTO range_input VALUES($1,$2,$3,$4,NULL,$5)', [
            source,
            other,
            members,
            term,
            bypass,
          ])
          for (const [name, body] of Object.entries(forms)) {
            await pg.exec('UPDATE range_input SET expected=NULL')
            try {
              await pg.exec(
                `UPDATE range_input SET expected=${wrong ? "'wrong'" : `(${body})::text`}`,
              )
            } catch {}
            const expectedText = (
              await pg.query<{ expected: string | null }>('SELECT expected FROM range_input')
            ).rows[0]!.expected
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ v: boolean | null }>(`SELECT ${check(body)} v FROM range_input`)
              ).rows[0]!.v
            } catch (e) {
              state = (e as { code: string }).code
            }
            let failure: string | undefined
            try {
              await pg.exec(`INSERT INTO range_${name} SELECT * FROM range_input`)
            } catch (e) {
              failure = (e as { code: string }).code
            }
            expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
            inserts++
            if (failure) rejections++
            const expected: Outcome = state
              ? { kind: 'Error', value: { state: parseInt(state, 36) } }
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            const row: Row = {
              source: known(source!),
              other: known(other!),
              members: known(members!),
              term: known(term!),
              expected: known(expectedText),
              bypass: known(bypass),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({
              name,
              source,
              other,
              members,
              term,
              wrong,
              bypass,
              value,
              state,
              failure,
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/operations-reference.json',
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsqueryranges',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
