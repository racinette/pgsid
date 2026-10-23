import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const quote = (text: string) => '"' + text.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
const record = (...fields: (string | null)[]) =>
  '(' + fields.map((v) => (v === null ? '' : quote(v))).join(',') + ')'
const array = (...fields: (string | null)[]) =>
  '{' + fields.map((v) => (v === null ? 'NULL' : quote(v))).join(',') + '}'
const literal = (value: string) => '$constant$' + value + '$constant$'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('restores original XML storage through captured record and record-array constants with native source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-record-constants-'))
  try {
    await pg.exec(`SET xmloption=CONTENT;
   CREATE DOMAIN xml_value AS xml;
   CREATE TYPE xml_leaf AS(flag bool,document xml_value,quantity int8,attachments xml[],tail text);
   CREATE TYPE xml_outer AS(first int4,child xml_leaf,history xml_leaf[],last xml);
   CREATE DOMAIN xml_leaf_domain AS xml_leaf;
   CREATE DOMAIN xml_leaf_array AS xml_leaf[];
   CREATE TYPE xml_evolved AS(removed text,document xml);
   CREATE TYPE xml_empty AS(attachments xml[]);`)
    const forms: { name: string; expr: string; native?: string }[] = []
    for (const [index, raw] of [
      null,
      '',
      '<?xml version="1.0" encoding="UTF8"?><r/>',
      '<?xml version="1.1" standalone="yes"?><é/>',
    ].entries()) {
      const leaf = record(
          'true',
          raw,
          '9223372036854775807',
          array(raw, null, '<end/>'),
          'after,"\\tail',
        ),
        cells = '[-1:1]=' + array(leaf, null, leaf),
        outer = record('7', leaf, cells, raw),
        typed = literal(leaf) + '::xml_leaf',
        nested = literal(outer) + '::xml_outer',
        bag = literal(cells) + '::xml_leaf[]'
      for (const [name, expr] of Object.entries({
        storage: `(${typed}).document::text`,
        attachment: `((${typed}).attachments)[1]::text`,
        document: `((${typed}).document IS DOCUMENT)::text`,
        field: `(${typed}).quantity::text`,
        tail: `(${typed}).tail`,
        json: `row_to_json(${typed})::text`,
        jsonb: `to_jsonb(${typed})::text`,
        nested: `(${nested}).child.document::text`,
        nested_bag: `(((${nested}).history)[-1]).document::text`,
        array: `((${bag})[-1]).document::text`,
        array_json: `to_jsonb(${bag})::text`,
        xml_multidimensional: `(${literal('[0:0][-2:-1]={' + array(raw, null) + '}')}::xml[])[0][-2]::text`,
        multidimensional: `((${literal('[0:0][-2:-1]={' + array(leaf, null) + '}')}::xml_leaf[])[0][-2]).document::text`,
        domain: `(${literal(leaf)}::xml_leaf_domain).document::text`,
        domain_array: `((${literal(cells)}::xml_leaf_array)[1]).document::text`,
      }))
        forms.push({ name: name + '_' + index, expr })
    }
    const evolvedRaw = '<?xml version="1.0"?><evolved/>',
      original = literal(record('discarded', evolvedRaw)) + '::xml_evolved',
      current = literal(record(evolvedRaw, null)) + '::xml_evolved'
    forms.push(
      {
        name: 'evolved_storage',
        expr: `(${current}).document::text`,
        native: `(${original}).document::text`,
      },
      {
        name: 'evolved_json',
        expr: `to_jsonb(${current})::text`,
        native: `to_jsonb(${original})::text`,
      },
      {
        name: 'empty_array',
        expr: `cardinality((${literal(record('{}'))}::xml_empty).attachments)::text`,
      },
    )
    const checks = forms.map((f, index) => ({
      ...f,
      nativeSql: `CASE WHEN bypass OR selector<>${index} THEN true ELSE (${f.native ?? f.expr}) IS NOT DISTINCT FROM expected END`,
      sql: `CASE WHEN bypass OR selector<>${index} THEN true ELSE (${f.expr}) IS NOT DISTINCT FROM expected END`,
    }))
    await pg.exec(
      `CREATE TABLE xml_record_constants(selector int4,expected text,bypass bool,${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.nativeSql})`).join(',')})`,
    )
    await pg.exec(
      'ALTER TYPE xml_evolved DROP ATTRIBUTE removed;ALTER TYPE xml_evolved ADD ATTRIBUTE quantity int4',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_record_constants')!,
      plans = checks.flatMap((c) =>
        ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: c.name + '_' + origin,
          },
          expression: lowerTableCheck(
            table,
            table.constraints.find((x) => x.name === c.name)!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${c.sql})` : undefined,
          )!.expression,
        })),
      )
    const partials: { name: string; selector: number; known: boolean }[] = []
    for (const name of ['storage_2', 'json_2']) {
      const constraint = table.constraints.find((c) => c.name === name)!,
        context = constraint.xmlConstants!,
        selector = forms.findIndex((f) => f.name === name)
      const variants: [string, typeof context | undefined][] = [
        ['missing', undefined],
        ['incomplete', { ...context, complete: false }],
        ['stale', { ...context, definition: context.definition + ' ' }],
        ['duplicate', { ...context, containers: [...context.containers!, ...context.containers!] }],
      ]
      for (const [variant, metadata] of variants) {
        const id = name + '_' + variant
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: id },
          expression: lowerTableCheck(
            table,
            { ...constraint, xmlConstants: metadata },
            catalog.enums,
            catalog.domains,
            'stored',
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        })
        partials.push({ name: id, selector, known: name === 'json_2' })
      }
    }
    await mkdir('artifacts/goal-checks/xml-record-constants-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-record-constants-active/multidimensional.json',
      JSON.stringify(
        {
          constraints: table.constraints.filter((c) => c.name.startsWith('multidimensional')),
          plans: plans.filter((p) => p.identity.constraint.startsWith('multidimensional')),
        },
        null,
        2,
      ) + '\n',
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      xmlOption: 'content',
      arrayNulls: true,
    })
    expect(
      group.checks.flatMap((c, i) =>
        c.kind === 'unsupported' ? [{ name: plans[i]!.identity.constraint, reason: c.reason }] : [],
      ),
    ).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let nativeInserts = 0
    for (const [selector, form] of forms.entries()) {
      const expected = (await pg.query<{ value: string | null }>(`SELECT (${form.expr}) value`))
        .rows[0]!.value
      for (const [value, bypass, accepted] of [
        [expected, false, true],
        [expected === null ? 'wrong' : expected + '!', false, false],
        ['wrong', true, true],
      ] as const) {
        const insert = pg.query('INSERT INTO xml_record_constants VALUES($1,$2,$3)', [
          selector,
          value,
          bypass,
        ])
        if (accepted) await insert
        else await expect(insert).rejects.toMatchObject({ code: '23514' })
        nativeInserts++
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: { selector: known(selector), expected: known(value), bypass: known(bypass) },
            expected: { kind: accepted ? 'True' : 'False' },
          })
      }
      reference.push({ name: form.name, expected })
    }
    for (const partial of partials) {
      const expected = (
        await pg.query<{ value: string | null }>(`SELECT (${forms[partial.selector]!.expr}) value`)
      ).rows[0]!.value
      fixtures.push(
        {
          name: partial.name,
          row: {
            selector: known(partial.selector),
            expected: known(expected),
            bypass: known(false),
          },
          expected: { kind: partial.known ? 'True' : 'Unknown' },
        },
        {
          name: partial.name,
          row: { selector: known(partial.selector), expected: known('wrong'), bypass: known(true) },
          expected: { kind: 'True' },
        },
      )
    }
    await mkdir('artifacts/goal-checks/xml-record-constants-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-record-constants-active/sql-reference.json',
      JSON.stringify(
        { nativeInserts, forms: forms.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
    await writeFile(
      'artifacts/goal-checks/xml-record-constants-active/evaluators.rs',
      group.evaluatorSource ?? '',
    )
    await runCheckParity(
      root,
      'xmlrecordconstants',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    console.info('XML record constant parity', {
      nativeInserts,
      forms: forms.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
