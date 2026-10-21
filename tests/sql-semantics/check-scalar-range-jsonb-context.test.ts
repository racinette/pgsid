import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { rangeProfileSupport } from '../../src/sql-semantics/range-profiles.js'
import { customRangeProfiles, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const literal = (text: string) => "'" + text.replaceAll("'", "''") + "'"
const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('uses captured C/UTF8 JSONB range ordering while retaining Unicode output, callback deferrals and source/stored literal behavior', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-range-context-'))
  try {
    await pg.exec(`CREATE DOMAIN jsonb_bound AS jsonb NOT NULL CHECK(VALUE<>'"forbidden"'::jsonb);
      CREATE TYPE jsonb_plain AS RANGE(subtype=jsonb);
      CREATE TYPE jsonb_checked AS RANGE(subtype=jsonb_bound);`)
    const profiles = customRangeProfiles(await snapshotCatalog(pg)),
      fixed = scalarRangeText('{"aa":"é","b":[1.2300,null]}', '{"aa":"雪","b":[2.000,null]}'),
      forms = profiles.flatMap((p, index) =>
        Object.entries({
          output: 'v::text',
          json: 'to_jsonb(v)::text',
          equality: '(v=w)::text',
          input: `(payload::${p.identity})::text`,
          multi_input: `(payload::${p.multirange})::text`,
          wire: "encode(range_send(v),'hex')",
          hash: 'hash_range(v)::text',
          literal: `(${literal(fixed)}::${p.identity})::text`,
          array_literal: `(ARRAY[${literal(fixed)}::${p.identity},NULL])[1]::text`,
        }).map(([name, output]) => ({
          p,
          name,
          output,
          table: `jsonb_context_${index}_${name}`,
          sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        })),
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.p.identity},w ${f.p.identity},payload text,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      variants = ['full', 'missing', 'no_c', 'no_encoding'] as const
    const parts = variants.map((variant) => {
      const selected = forms.filter(
        (f) => variant === 'full' || variant === 'missing' || f.name === 'equality',
      )
      const plans = selected.flatMap((f) =>
        (['source', 'stored'] as const).map((origin) => {
          const table = catalog.tables.find((t) => t.name === f.table)!
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: f.table,
              constraint: `${origin}_${variant}`,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'source'
                  ? { ...table.constraints[0]!, definition: `CHECK(${f.sql})` }
                  : table.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                variant === 'missing'
                  ? catalog.rangeTypes.map((p) => ({ ...p, comparator: null }))
                  : catalog.rangeTypes,
              )!.expression,
            ),
          }
        }),
      )
      return {
        variant,
        selected,
        plans,
        group: prepareCheckRustGroup(plans, {
          ...(variant === 'no_c' ? {} : { defaultCollation: 'C' as const }),
          ...(variant === 'no_encoding' ? {} : { serverEncoding: 'UTF8' as const }),
          nativeByteOrder: 'little',
        }),
      }
    })
    for (const part of parts)
      for (const [index, check] of part.group.checks.entries())
        expect(
          check.kind,
          part.plans[index]!.identity.owner + '/' + part.variant + JSON.stringify(check),
        ).toBe('supported')
    const evaluatorSource = parts.map((p) => p.group.evaluatorSource).join('\n'),
      group = {
        ...parts[0]!.group,
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource!, callables: [] }),
        checks: parts.flatMap((p) => p.group.checks),
      }
    for (const p of profiles) {
      expect(p.collation).toBeNull()
      expect(rangeProfileSupport(p, { defaultCollation: 'C', serverEncoding: 'UTF8' })).toEqual({
        comparison: 12,
        canonical: 1,
      })
      for (const context of [
        {},
        { defaultCollation: 'C' as const },
        { serverEncoding: 'UTF8' as const },
      ])
        expect(rangeProfileSupport(p, context)).toEqual({
          comparison: context.serverEncoding === 'UTF8' ? 120 : 0,
          canonical: 1,
        })
      expect(
        rangeProfileSupport(
          { ...p, comparator: null },
          { defaultCollation: 'C', serverEncoding: 'UTF8' },
        ),
      ).toEqual({ comparison: 120, canonical: 1 })
    }
    const pairs: [string | null, string | null][] = [
      [null, null],
      ['empty', 'empty'],
      ['(,)', '(,)'],
      [
        scalarRangeText('-10000000000000000000000.00100', '1.2300'),
        scalarRangeText('0.00', '2.000'),
      ],
      [scalarRangeText('null', 'null'), scalarRangeText('null', 'null')],
      [scalarRangeText('"a"', 'true'), scalarRangeText('[]', '{}')],
      [
        scalarRangeText('{"a":0,"a":[1.2300,null]}', '{"a":[2.000,null]}'),
        scalarRangeText('{"a":[1.23,null]}', '{"a":[2,null]}'),
      ],
      [fixed, fixed],
      [
        scalarRangeText('{"aa":1.00,"\\u00e9":2.000}', '{"aa":2.00,"\\u00e9":2.000}'),
        scalarRangeText('{"aa":1,"é":2}', '{"aa":2,"é":2}'),
      ],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const f of forms)
      for (const [vtext, wtext] of pairs) {
        const v = await readRangeFixture(
            pg,
            `SELECT $1::${f.p.identity} span`,
            'span',
            f.p.rangeType,
            [vtext],
          ),
          w = await readRangeFixture(pg, `SELECT $1::${f.p.identity} span`, 'span', f.p.rangeType, [
            wtext,
          ])
        const forged = structuredClone(v)
        if (forged) forged.support = { comparison: 12, canonical: 0 }
        for (const input of [vtext, 'bad']) {
          const payload =
            f.name === 'multi_input' && input !== 'bad' && input !== null ? `{${input}}` : input
          let expected: string | null = null
          try {
            expected = (
              await pg.query<{ value: string | null }>(
                `SELECT (${f.output}) value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.identity} w,$3::text payload)q`,
                [vtext, wtext, payload],
              )
            ).rows[0]!.value
          } catch (error) {
            expect(error).toHaveProperty('code')
          }
          for (const wrong of [false, true])
            for (const bypass of [false, true]) {
              const label = wrong ? '!different!' : expected,
                native = await nativeCustomRangeOutcome(
                  pg,
                  `SELECT (${f.sql}) value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.identity} w,$3::text payload,$4::text expected,$5::bool bypass)q`,
                  [vtext, wtext, payload, label, bypass],
                )
              for (const part of parts.filter((part) => part.selected.includes(f)))
                for (const origin of ['source', 'stored']) {
                  const unavailable = part.variant !== 'full',
                    eager =
                      unavailable &&
                      origin === 'source' &&
                      ['literal', 'array_literal'].includes(f.name),
                    inputNeedsComparison =
                      unavailable &&
                      ['input', 'multi_input'].includes(f.name) &&
                      input !== null &&
                      !['bad', 'empty', '(,)'].includes(input),
                    comparison =
                      unavailable &&
                      f.name === 'equality' &&
                      v !== null &&
                      w !== null &&
                      !v.empty &&
                      !w.empty &&
                      v.bounds.some((b) => b.kind !== 'Null'),
                    wire =
                      f.name === 'wire' &&
                      Boolean(
                        v?.bounds.some(
                          (bound) =>
                            bound.kind === 'Jsonb' &&
                            bound.value.characters.some((character) =>
                              /[^\x00-\x7f]/u.test(character),
                            ),
                        ),
                      )
                  fixtures.push({
                    name: `${f.table}_${origin}_${part.variant}`,
                    row: {
                      v: forged === null ? { kind: 'Null' } : { kind: 'Value', value: forged },
                      w: w === null ? { kind: 'Null' } : { kind: 'Value', value: w },
                      payload: cell(payload),
                      expected: cell(label),
                      bypass: cell(bypass),
                    },
                    expected:
                      eager || (!bypass && (inputNeedsComparison || comparison || wire))
                        ? { kind: 'Unknown' }
                        : native,
                  })
                }
            }
        }
      }
    await mkdir('artifacts/jsonb-range-context', { recursive: true })
    await writeFile(
      'artifacts/jsonb-range-context/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          plans: group.checks.length,
          fixtures: fixtures.length,
          variants,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbrangecontext',
      group,
      parts.flatMap((part) =>
        part.plans.map((p) => `${p.identity.owner}_${p.identity.constraint}`),
      ),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
