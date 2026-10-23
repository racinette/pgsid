import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogCompositeType } from '../../src/sql-semantics/composite-profiles.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { readCompositeFixture } from './check-composite-fixtures.js'
import { readArrayBoundFixture } from './check-range-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves XML storage and output facets through owned arrays, records and JSON conversions with native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-containers-'))
  const value = (v: string | number | boolean | null): Input =>
    v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
  try {
    const entries = Object.entries({
        scalar_json: 'to_json(x)::text',
        scalar_jsonb: 'to_jsonb(x)::text',
        builder: 'json_build_object(x,ARRAY[x,NULL],s,r)::text',
        builderb: 'jsonb_build_array(x,xs,r)::text',
        array_json: 'array_to_json(xs)::text',
        array_jsonb: 'to_jsonb(xs)::text',
        array_text: 'xs::text',
        array_join: "array_to_string(xs,'|','missing')",
        element_storage: 'xs[-2]::text',
        element_document: '(xs[-2] IS DOCUMENT)::text',
        record_storage: '(r).x::text',
        record_array: '(r).xs::text',
        record_text: 'r::text',
        record_json: 'row_to_json(r)::text',
        record_jsonb: 'to_jsonb(r)::text',
        xml_content: 'xmlelement(NAME root,xs,r)::text',
        concat: '(xs || ARRAY[x])::text',
        append: 'array_append(xs,x)::text',
        prepend: 'array_prepend(x,xs)::text',
        shape: 'cardinality(xs)::text',
        dims: 'array_dims(xs)',
        search: 'array_position(xs,x)::text',
        empty_comparison: '(xs[1:0]=xs[1:0])::text',
        input_array: '(s::xml[])::text',
        constructed_constant: `(ARRAY['<?xml version="1.0"?><literal/>'::xml])[1]::text`,
        stored_array_constant: `($xml$[-2:0]={"<?xml version=\\"1.0\\"?><literal/>",NULL,"<?xml version=\\"1.1\\" standalone=\\"yes\\"?><end/>"}$xml$::xml[])[-2]::text`,
        stored_domain_array_constant: `($xml$[-2:0]={"<?xml version=\\"1.0\\"?><literal/>",NULL,"<end/>"}$xml$::xml_list)[-2]::text`,
        input_domain_array: '(s::xml_list)::text',
        record_missing_comparison: '(r=r)::text',
      }),
      checks = entries.map(([name, expr], selector) => ({
        name,
        expr,
        sql: `CASE WHEN bypass OR selector<>${selector} THEN true ELSE (${expr})=expected END`,
      }))
    await pg.exec(`SET xmloption=CONTENT;CREATE TYPE xml_pair AS(x xml,xs xml[]);
      CREATE DOMAIN xml_value AS xml;CREATE DOMAIN xml_list AS xml_value[];
      CREATE TABLE xml_containers(x xml,xs xml[],r xml_pair,s text,selector integer,expected text,bypass boolean,${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')});
      CREATE TEMP TABLE xml_oracle(x xml,xs xml[],r xml_pair,s text);`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_containers')!,
      recordType = catalogCompositeType(
        'xml_pair',
        catalog.compositeTypeGraph,
        catalog.rangeTypes,
      )!,
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
    const literal = (v: string) => '"' + v.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
    const samples = [
      { x: null, xs: null, s: null, recordNull: true },
      { x: null, xs: '{}', s: '{}', recordNull: false },
      { x: null, xs: '[0:1]={NULL,NULL}', s: '{NULL}', recordNull: false },
      { x: '', xs: '[-2:0]={"",NULL,""}', s: '{""}', recordNull: false },
      ...[
        '<r/>',
        '<?xml version="1.0" encoding=""?><r/>',
        '<?xml version="1.1" standalone="yes"?><r/>',
        '<é>😊 &amp;</é>',
        '<a/><b/>',
      ].map((x) => ({
        x,
        xs: `[-2:0]={${literal(x)},NULL,${literal('<end/>')}}`,
        s: `{${literal(x)}}`,
        recordNull: false,
      })),
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let nativeInserts = 0
    for (const sample of samples) {
      await pg.exec('TRUNCATE xml_oracle')
      await pg.query(
        'INSERT INTO xml_oracle SELECT $1::text::xml,$2::xml[],CASE WHEN $4::boolean THEN NULL ELSE ROW($1::text::xml,$2::xml[])::xml_pair END,$3',
        [sample.x, sample.xs, sample.s, sample.recordNull],
      )
      const xs = await readArrayBoundFixture(pg, 'array:pg_catalog.xml', 'xml[]', sample.xs),
        r = await readCompositeFixture(pg, 'SELECT r FROM xml_oracle', 'r', recordType)
      const base: Row = {
        x: value(sample.x),
        xs: xs === null ? { kind: 'Null' } : { kind: 'Value', value: xs },
        r: r === null ? { kind: 'Null' } : { kind: 'Value', value: r },
        s: value(sample.s),
        selector: value(0),
        expected: value(null),
        bypass: value(false),
      }
      for (const [selector, [name, expr]] of entries.entries()) {
        let output: string | null = null,
          outcome: Outcome
        try {
          output = (
            await pg.query<{ result: string | null }>(`SELECT (${expr}) result FROM xml_oracle`)
          ).rows[0]!.result
          outcome = { kind: output === null ? 'Null' : 'True' }
        } catch (e) {
          outcome = { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } }
        }
        const row = { ...base, selector: value(selector), expected: value(output) },
          insert = pg.query(
            'INSERT INTO xml_containers SELECT x,xs,r,s,$1,$2,false FROM xml_oracle',
            [selector, output],
          )
        if (outcome.kind === 'Error')
          await expect(insert).rejects.toMatchObject({
            code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
          })
        else await insert
        nativeInserts++
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: outcome })
        if (output !== null && outcome.kind !== 'Error') {
          await expect(
            pg.query('INSERT INTO xml_containers SELECT x,xs,r,s,$1,$2,false FROM xml_oracle', [
              selector,
              output + '!',
            ]),
          ).rejects.toMatchObject({ code: '23514' })
          nativeInserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, expected: value(output + '!') },
              expected: { kind: 'False' },
            })
        }
        await pg.query('INSERT INTO xml_containers SELECT x,xs,r,s,$1,$2,true FROM xml_oracle', [
          selector,
          output,
        ])
        nativeInserts++
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: { ...row, bypass: value(true) },
            expected: { kind: 'True' },
          })
        reference.push({ sample, name, output, outcome })
      }
    }
    await mkdir('artifacts/goal-checks/xml-containers-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-containers-active/sql-reference.json',
      JSON.stringify(
        { nativeInserts, fixtures: fixtures.length, forms: entries.length, reference },
        null,
        2,
      ) + '\n',
    )
    await writeFile(
      'artifacts/goal-checks/xml-containers-active/evaluators.rs',
      group.evaluatorSource ?? '',
    )
    await runCheckParity(
      root,
      'xmlcontainers',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    console.info('XML container parity', {
      nativeInserts,
      fixtures: fixtures.length,
      forms: entries.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
