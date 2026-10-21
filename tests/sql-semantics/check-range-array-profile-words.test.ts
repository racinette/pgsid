import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import { go, printGoFile, type GoDeclaration } from '../../src/codegen/go/ast.js'
import { rangeGoInput } from '../../tools/check-rust/range-input.js'
import { multirangeGoInput } from '../../tools/check-rust/multirange-input.js'
import { arrayGoInput, type OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'
import { arrayInputPlan } from '../../src/codegen/shared/check-array-types.js'

it('decodes complete profile words before validating caller hints in public range, multirange and nested arrays', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-range-profile-words-')),
    run = promisify(execFile)
  try {
    const profiles = [
      ['name', '[a,z]'],
      ['regclass', '[100,200]'],
      ['regprocedure', '[100,200]'],
    ] as const
    await pg.exec(
      profiles
        .map(
          (
            [type],
            i,
          ) => `CREATE TYPE word_span_${i} AS RANGE(subtype=${type},multirange_type_name=word_set_${i});CREATE DOMAIN word_history_${i} AS word_span_${i}[];
      CREATE TABLE word_batches_${i}(items word_span_${i}[],chosen word_span_${i},packs word_set_${i}[],chosen_pack word_set_${i},histories word_history_${i}[],bypass bool,
        CONSTRAINT selected CHECK(CASE WHEN bypass THEN true ELSE array_position(items,chosen) IS NOT DISTINCT FROM -2 END),
        CONSTRAINT packed CHECK(CASE WHEN bypass THEN true ELSE array_position(packs,chosen_pack) IS NOT DISTINCT FROM -2 END),
        CONSTRAINT nested CHECK(CASE WHEN bypass THEN true ELSE array_sort(histories)=histories END));`,
        )
        .join('\n'),
    )
    const catalog = await snapshotCatalog(pg),
      captured = customRangeProfiles(catalog),
      context = { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { enums: catalog.enums, rangeTypes: catalog.rangeTypes, executionContext: context },
    )
    const generatedGo = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'profilewords/schema',
    )
    expect(generatedGo.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const a of [
      ...checkTypescriptArtifacts(ts.rustFiles!).map((a) => ({
        ...a,
        path: join(root, 'checks-rust', a.path),
      })),
      ...generatedGo.artifacts,
    ]) {
      await mkdir(dirname(a.path), { recursive: true })
      await writeFile(a.path, a.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(root, 'js'),
      join(root, 'checks.ts'),
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr, { cause: e })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href),
      declarations: GoDeclaration[] = [],
      assertions: string[] = []
    for (const [i, [, text]] of profiles.entries()) {
      const p = captured.find((p) => p.name === `word_span_${i}`)!,
        multi = `{${text}}`,
        array = rangeArrayText([text, null], -2),
        packText = rangeArrayText([multi, null], -2)
      const words = arrayInputPlan('array:' + p.rangeType)
      expect(words[5]!.codePointAt(0)).toBeGreaterThan(127)
      expect(Buffer.byteLength(words[5]!)).toBeGreaterThan(words[5]!.length)
      const v = (await readRangeFixture(pg, `SELECT $1::${p.identity} span`, 'span', p.rangeType, [
          text,
        ]))!,
        m = (await readMultirangeFixture(pg, p.multirangeType, multi))!,
        items = (await readRangeArrayFixture(pg, p.rangeType, array))!,
        packs = (await readMultirangeArrayFixture(pg, p.multirangeType, packText))!
      const histories: OwnedArrayInputPayload = {
        elementType: `"public"."word_history_${i}"`,
        elementKind: 41,
        dimensions: [{ lower: 1, length: 2 }],
        elements: [{ kind: 'Array', value: structuredClone(items) }, { kind: 'Null' }],
        nullBitmap: { kind: 'Value', value: true },
      }
      const row = {
        items: { kind: 'Value', value: items },
        chosen: { kind: 'Value', value: v },
        packs: { kind: 'Value', value: packs },
        chosen_pack: { kind: 'Value', value: m },
        histories: { kind: 'Value', value: histories },
        bypass: false,
      }
      const forge = (value: unknown): void => {
        if (!value || typeof value !== 'object') return
        if ('bounds' in value) Object.assign(value, { support: { comparison: 99, canonical: 99 } })
        for (const child of Object.values(value)) {
          if (Array.isArray(child)) child.forEach(forge)
          else forge(child)
        }
      }
      forge(row)
      const before = structuredClone(row)
      for (const c of generated[`evaluatePublicWordBatches${i}Checks`](row) as {
        result: { certain: boolean; value?: boolean }
      }[])
        expect(c.result).toEqual({ certain: true, value: true })
      expect(row).toEqual(before)
      await pg.query(
        `INSERT INTO word_batches_${i}(items,chosen,packs,chosen_pack,histories,bypass) VALUES($1::word_span_${i}[],$2,$3,$4,ARRAY[($1::word_span_${i}[])::word_history_${i},NULL::word_history_${i}],false)`,
        [array, text, packText, multi],
      )
      await expect(
        pg.query(
          `INSERT INTO word_batches_${i}(items,chosen,packs,chosen_pack,histories,bypass) VALUES($1::word_span_${i}[],$2,$3,$4,ARRAY[($1::word_span_${i}[])::word_history_${i},NULL::word_history_${i}],false)`,
          [array, 'empty', packText, multi],
        ),
      ).rejects.toMatchObject({ code: '23514' })
      const known = (v: ReturnType<typeof go.ident>) => go.call(go.ident('KnownCheckValue'), [v])
      declarations.push({
        kind: 'function',
        name: `wordFixture${i}`,
        parameters: [],
        results: [{ type: go.ident(`PublicWordBatches${i}CheckInput`) }],
        body: [
          {
            kind: 'assign',
            targets: [go.ident('skip')],
            expressions: [go.ident('false')],
            operator: ':=',
          },
          {
            kind: 'return',
            expressions: [
              go.composite(go.ident(`PublicWordBatches${i}CheckInput`), [
                go.keyValue(
                  'Items',
                  known(
                    arrayGoInput({
                      ...items,
                      elements: items.elements.map((c) =>
                        c.kind === 'Range'
                          ? {
                              ...c,
                              value: { ...c.value, support: { comparison: 0, canonical: 0 } },
                            }
                          : c,
                      ),
                    }),
                  ),
                ),
                go.keyValue(
                  'Chosen',
                  known(rangeGoInput({ ...v, support: { comparison: 0, canonical: 0 } })),
                ),
                go.keyValue(
                  'Packs',
                  known(
                    arrayGoInput({
                      ...packs,
                      elements: packs.elements.map((c) =>
                        c.kind === 'Multirange'
                          ? {
                              ...c,
                              value: {
                                ...c.value,
                                ranges: c.value.ranges.map((r) =>
                                  r.kind === 'Value'
                                    ? {
                                        ...r,
                                        value: {
                                          ...r.value,
                                          support: { comparison: 0, canonical: 0 },
                                        },
                                      }
                                    : r,
                                ),
                              },
                            }
                          : c,
                      ),
                    }),
                  ),
                ),
                go.keyValue(
                  'ChosenPack',
                  known(
                    multirangeGoInput({
                      ...m,
                      ranges: m.ranges.map((r) =>
                        r.kind === 'Value'
                          ? {
                              ...r,
                              value: { ...r.value, support: { comparison: 0, canonical: 0 } },
                            }
                          : r,
                      ),
                    }),
                  ),
                ),
                go.keyValue(
                  'Histories',
                  known(
                    arrayGoInput({
                      ...histories,
                      elements: [
                        {
                          kind: 'Array',
                          value: {
                            ...items,
                            elements: items.elements.map((c) =>
                              c.kind === 'Range'
                                ? {
                                    ...c,
                                    value: { ...c.value, support: { comparison: 0, canonical: 0 } },
                                  }
                                : c,
                            ),
                          },
                        },
                        { kind: 'Null' },
                      ],
                    }),
                  ),
                ),
                go.keyValue('Bypass', known(go.address(go.ident('skip')))),
              ]),
            ],
          },
        ],
      })
      assertions.push(`{
row:=wordFixture${i}();row.Items.V=forgeProfileWords(row.Items.V);row.Packs.V=forgeProfileWords(row.Packs.V);row.Histories.V=forgeProfileWords(row.Histories.V)
beforeItems:=checkruntime.CopyArrayValue(row.Items.V);beforePacks:=checkruntime.CopyArrayValue(row.Packs.V);beforeHistory:=checkruntime.CopyArrayValue(row.Histories.V)
for _,c:=range EvaluatePublicWordBatches${i}Checks(row){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(${i},"profile",c)}}
if !reflect.DeepEqual(beforeItems,row.Items.V)||!reflect.DeepEqual(beforePacks,row.Packs.V)||!reflect.DeepEqual(beforeHistory,row.Histories.V){t.Fatal("caller mutated")}
}`)
    }
    await writeFile(
      join(root, 'schema/public/profile_words_fixture_test.go'),
      printGoFile({
        package: 'public',
        imports: [
          { alias: 'checkruntime', path: 'profilewords/schema/public/checkrust/checkruntime' },
        ],
        declarations,
      }),
    )
    await writeFile(
      join(root, 'schema/public/profile_words_test.go'),
      `package public
import("testing";"reflect";checkruntime "profilewords/schema/public/checkrust/checkruntime")
func forgeProfileWords(input checkruntime.ArrayValue)checkruntime.ArrayValue{for i,c:=range input.Value.Elements{if c.Kind==checkruntime.ArrayElementRange{input.Value.Elements[i].Range.Support=checkruntime.MakeRangeSupport(99,99)};if c.Kind==checkruntime.ArrayElementMultirange{for j:=range input.Value.Elements[i].Multirange.Ranges{input.Value.Elements[i].Multirange.Ranges[j].Value.Support=checkruntime.MakeRangeSupport(99,99)}};if c.Kind==checkruntime.ArrayElementArray{input.Value.Elements[i].Array=forgeProfileWords(checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:c.Array}).Value}};return input}
func TestProfileWords(t *testing.T){${assertions.join('\n')}}\n`,
    )
    await writeFile(join(root, 'go.mod'), 'module profilewords\n\ngo 1.25\n')
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr, { cause: e })
      },
    )
    await mkdir('artifacts/range-profile-words', { recursive: true })
    await writeFile(
      'artifacts/range-profile-words/report.json',
      JSON.stringify({
        profiles: profiles.length,
        nativeInserts: profiles.length * 2,
        callerOverride: true,
        ownedSnapshots: true,
      }) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
