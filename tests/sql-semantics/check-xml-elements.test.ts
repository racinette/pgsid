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

const value = (v: string | number | bigint | boolean | null): Input =>
  v === null ? { kind: 'Null' } : { kind: 'Value', value: v }

it('constructs XML elements, attributes and forests through native value mapping with source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-elements-'))
  try {
    const longName = '😊'.repeat(13),
      operations = {
        empty: 'xmlelement(NAME root)::text',
        null_content: 'xmlelement(NAME root,NULL)::text',
        text: 'xmlelement(NAME root,s)::text',
        text_and_null: 'xmlelement(NAME root,s,NULL,raw)::text',
        attributes:
          'xmlelement(NAME root,XMLATTRIBUTES(s AS a,raw AS "😊",b AS flag,i AS number))::text',
        mixed: 'xmlelement(NAME "😊",XMLATTRIBUTES(s AS "😊",raw AS "_x1F60A_"),s,b,i)::text',
        forest: 'xmlforest(s,raw AS "😊",raw AS "_x1F60A_",b AS flag,i AS number)::text',
        duplicate_forest: 'xmlforest(s AS a,raw AS a)::text',
        null_forest: 'xmlforest(NULL AS a,NULL::xml AS b)::text',
        xml: 'xmlelement(NAME root,s,xmlparse(CONTENT raw))::text',
        xml_attribute: 'xmlelement(NAME root,XMLATTRIBUTES(xmlparse(CONTENT raw) AS x))::text',
        nested:
          'xmlelement(NAME root,xmlforest(s AS leaf,b AS flag),xmlelement(NAME item,raw))::text',
        implicit_names: 'xmlforest("xmlThing","a:b","😊")::text',
        implicit_attributes: 'xmlelement(NAME root,XMLATTRIBUTES("xmlThing","a:b","😊"))::text',
        long_names: `xmlelement(NAME "${longName}",XMLATTRIBUTES(s AS "${longName}"),raw)::text`,
        arrays:
          'xmlforest(ARRAY[s,NULL,raw] AS things,ARRAY[ARRAY[i,2],ARRAY[3,NULL]] AS grid)::text',
        array_attribute: 'xmlelement(NAME root,XMLATTRIBUTES(ARRAY[s,NULL,raw] AS things))::text',
        character_numeric: 'xmlforest(s::char(4) AS fixed,i::numeric(8,2) AS number)::text',
        named_record: 'xmlelement(NAME record,ROW(s,b)::xml_record)::text',
        anonymous_record: 'xmlelement(NAME record,ROW(s,b))::text',
        nested_record: 'xmlelement(NAME record,ROW(ROW(s,b),ARRAY[s,NULL,raw]))::text',
        record_choice: 'xmlelement(NAME record,CASE WHEN b THEN ROW(s,b) ELSE ROW(i) END)::text',
        enum: `xmlforest(CASE WHEN b THEN 'red'::xml_colour ELSE 'a&"😊'::xml_colour END AS shade)::text`,
        enum_array_domain: `xmlelement(NAME root,ARRAY[CASE WHEN b THEN 'red'::xml_colour ELSE 'a&"😊'::xml_colour END,NULL]::xml_palette)::text`,
        json: 'xmlforest(json_build_array(s,b,i) AS j,jsonb_build_object(raw,s) AS jb)::text',
        date: 'xmlforest(day AS day)::text',
        timestamp: 'xmlelement(NAME root,moment)::text',
        infinity_before_runtime_error: 'xmlelement(NAME root,day,10/i)::text',
        binary: "xmlelement(NAME bytes,decode(raw,'hex'))::text",
        binary_attribute: "xmlelement(NAME bytes,XMLATTRIBUTES(decode(raw,'hex') AS bytes))::text",
        domain: '(s::xml_leaf)::text',
        document: '(xmlelement(NAME root,s) IS DOCUMENT)::text',
        serialization: 'xmlserialize(DOCUMENT xmlelement(NAME root,s) AS text)',
      },
      entries = Object.entries(operations),
      checks = entries.map(([name, expr], selector) => ({
        name,
        expr,
        sql: `CASE WHEN bypass OR selector<>${selector} THEN true ELSE (${expr})=expected END`,
      }))
    await pg.exec(`SET xmloption=CONTENT;CREATE TYPE xml_record AS (label text,flag boolean);
      CREATE TYPE xml_colour AS ENUM('red','a&"😊');CREATE DOMAIN xml_palette AS xml_colour[] CHECK(cardinality(VALUE)>0);
      CREATE DOMAIN xml_leaf AS text CHECK(xmlforest(VALUE AS "😊")::text <> '<_x1F60A_>deny</_x1F60A_>');
      CREATE TABLE xml_elements(s text,raw text,b boolean,i integer,day date,moment timestamp,"xmlThing" text,"a:b" text,"😊" text,selector integer,expected text,bypass boolean,${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')});
      CREATE TEMP TABLE xml_candidates (LIKE xml_elements);`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_elements')!,
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
    const samples = [
      { s: null, raw: null, b: null, i: null },
      { s: '', raw: '', b: true, i: 0 },
      { s: '< & > " \'\r\n\t\u0001', raw: '<a/>', b: false, i: 3 },
      { s: 'é😊雪', raw: '<?xml version="1.0" encoding=""?><r/>', b: true, i: -1 },
      { s: '2024-02-29', raw: '2024-02-29 12:34:56.123456', b: false, i: 9 },
      { s: '0001-01-01 BC', raw: '0001-01-01 00:00:00 BC', b: true, i: 1 },
      { s: 'infinity', raw: 'infinity', b: false, i: 0 },
      { s: 'a', raw: 'ffab010203', b: true, i: 3 },
      { s: 'deny', raw: '<r>', b: false, i: 1 },
      { s: 'x\ufffe\uffff', raw: '00'.repeat(90), b: true, i: 3 },
    ]
    const calendars = [
      [null, null],
      ['2000-01-01', '2000-01-01 00:00:00'],
      ['2024-02-29', '2024-02-29 12:34:56.123456'],
      ['0001-01-01 BC', '0001-01-01 01:02:03 BC'],
      ['10000-01-01', '10000-01-01 12:00:00'],
      ['0001-01-01 BC', '0001-01-01 01:02:03 BC'],
      ['infinity', 'infinity'],
      ['-infinity', '-infinity'],
      ['2000-01-01', '2000-01-01 00:00:00'],
      ['2020-01-01', '2020-01-01 12:00:00'],
    ]
    const preparedSamples = []
    for (const [index, sample] of samples.entries()) {
      const [day, moment] = calendars[index]!,
        payload = (
          await pg.query<{ day: string | null; moment: string | null }>(
            `SELECT
            CASE WHEN $1::date='infinity'::date THEN 2147483647 WHEN $1::date='-infinity'::date THEN -2147483648 ELSE $1::date-DATE '2000-01-01' END::text AS day,
            CASE WHEN $2::timestamp='infinity'::timestamp THEN 9223372036854775807 WHEN $2::timestamp='-infinity'::timestamp THEN -9223372036854775808 ELSE (extract(epoch FROM $2::timestamp)-946684800)*1000000 END::bigint::text AS moment`,
            [day, moment],
          )
        ).rows[0]!
      preparedSamples.push({ ...sample, day, moment, payload })
    }
    const reference: unknown[] = []
    let nativeInserts = 0,
      totalFixtures = 0
    for (const xmlBinary of ['base64', 'hex'] as const) {
      await pg.exec('SET xmlbinary=' + xmlBinary)
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        xmlOption: 'content',
        xmlBinary,
      })
      expect(
        group.checks.flatMap((c, i) =>
          c.kind === 'unsupported'
            ? [{ name: plans[i]!.identity.constraint, reason: c.reason }]
            : [],
        ),
      ).toEqual([])
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [selector, [name, expr]] of entries.entries())
        for (const sample of preparedSamples) {
          const row: Row = {
            s: value(sample.s),
            raw: value(sample.raw),
            b: value(sample.b),
            i: value(sample.i),
            day: value(sample.payload.day === null ? null : Number(sample.payload.day)),
            moment: value(sample.payload.moment === null ? null : BigInt(sample.payload.moment)),
            xmlThing: value(sample.s),
            'a:b': value(sample.raw),
            '😊': value(sample.s),
            selector: value(selector),
            expected: { kind: 'Null' },
            bypass: value(false),
          }
          let expected: string | null = null,
            outcome: Outcome
          await pg.exec('TRUNCATE xml_candidates')
          await pg.query(
            'INSERT INTO xml_candidates VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,NULL,true)',
            [
              sample.s,
              sample.raw,
              sample.b,
              sample.i,
              sample.day,
              sample.moment,
              sample.s,
              sample.raw,
              sample.s,
            ],
          )
          try {
            const result = (
              await pg.query<{ result: string | null }>(
                `SELECT encode(convert_to((${expr})::text,'UTF8'),'hex') result FROM xml_candidates`,
              )
            ).rows[0]!.result
            expected = result === null ? null : Buffer.from(result, 'hex').toString('utf8')
            outcome = { kind: expected === null ? 'Null' : 'True' }
          } catch (e) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((e as { code: string }).code, 36) },
            }
          }
          row.expected = value(expected)
          const args = [
              sample.s,
              sample.raw,
              sample.b,
              sample.i,
              sample.day,
              sample.moment,
              sample.s,
              sample.raw,
              sample.s,
              selector,
              expected,
              false,
            ],
            insert = pg.query(
              'INSERT INTO xml_elements VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
              args,
            )
          if (outcome.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
            })
          else await insert
          nativeInserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: outcome })
          if (expected !== null && outcome.kind !== 'Error') {
            await expect(
              pg.query('INSERT INTO xml_elements VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [
                ...args.slice(0, 10),
                expected + '!',
                false,
              ]),
            ).rejects.toMatchObject({ code: '23514' })
            nativeInserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, expected: value(expected + '!') },
                expected: { kind: 'False' },
              })
          }
          await pg.query(
            'INSERT INTO xml_elements VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
            [...args.slice(0, 11), true],
          )
          nativeInserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, bypass: value(true) },
              expected: { kind: 'True' },
            })
          reference.push({ xmlBinary, name, sample, expected, outcome })
        }
      const ambiguousSelector = entries.findIndex(
        ([name]) => name === 'infinity_before_runtime_error',
      )
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: 'infinity_before_runtime_error_' + origin,
          row: {
            s: value(null),
            raw: value(null),
            b: value(null),
            i: { kind: 'Unknown' },
            day: value(2147483647),
            moment: value(null),
            xmlThing: value(null),
            'a:b': value(null),
            '😊': value(null),
            selector: value(ambiguousSelector),
            expected: value('unused'),
            bypass: value(false),
          },
          expected: { kind: 'Unknown' },
        })
      totalFixtures += fixtures.length
      await writeFile(
        'artifacts/goal-checks/xml-elements-active/reference-' + xmlBinary + '.json',
        JSON.stringify(
          { fixtures, reference },
          (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
          2,
        ) + '\n',
      )
      await writeFile(
        'artifacts/goal-checks/xml-elements-active/evaluators-' + xmlBinary + '.rs',
        group.evaluatorSource ?? '',
      )
      const profileRoot = join(root, xmlBinary)
      await mkdir(profileRoot)
      await runCheckParity(
        profileRoot,
        'xmlelements',
        group,
        plans.map((p) => p.identity.constraint),
        fixtures,
      )
    }
    await mkdir('artifacts/goal-checks/xml-elements-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-elements-active/sql-reference.json',
      JSON.stringify(
        { nativeInserts, fixtures: totalFixtures, forms: entries.length, reference },
        null,
        2,
      ) + '\n',
    )
    console.info('XML element parity', {
      nativeInserts,
      fixtures: totalFixtures,
      forms: entries.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('keeps binary XML formatting explicit and preserves base64 wrapping boundaries, empty values and skipped conversions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-binary-'))
  try {
    const entries = Object.entries({
        content: 'xmlelement(NAME bytes,payload)::text',
        attribute: 'xmlelement(NAME bytes,XMLATTRIBUTES(payload AS value),payload)::text',
        forest: 'xmlforest(payload AS bytes)::text',
        array: 'xmlelement(NAME bytes,ARRAY[payload,NULL])::text',
      }),
      checks = entries.map(([name, expr], i) => ({
        name,
        expr,
        sql: `CASE WHEN bypass OR selector<>${i} THEN true ELSE (${expr})=expected END`,
      }))
    await pg.exec(
      `CREATE TABLE xml_binary_inputs(payload bytea,selector integer,expected text,bypass boolean,${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_binary_inputs')!,
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
            [],
            [],
            origin as 'source' | 'stored',
            [],
            undefined,
            origin === 'source' ? `CHECK(${c.sql})` : undefined,
          )!.expression,
        })),
      )
    let total = 0,
      nativeInserts = 0
    for (const xmlBinary of [undefined, 'base64', 'hex'] as const) {
      await pg.exec('SET xmlbinary=' + (xmlBinary ?? 'base64'))
      const group = prepareCheckRustGroup(plans, {
          serverEncoding: 'UTF8',
          xmlBinary,
          defaultCollation: 'C',
        }),
        fixtures: { name: string; row: Row; expected: Outcome }[] = []
      expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
      for (const [selector, [name, expr]] of entries.entries())
        for (const length of [-1, 0, 1, 2, 3, 52, 53, 54, 55, 56, 57, 107, 108, 109]) {
          const hex =
              length < 0
                ? null
                : Buffer.from(Array.from({ length }, (_, i) => (i * 73 + length) % 256)).toString(
                    'hex',
                  ),
            expected = (
              await pg.query<{ result: string | null }>(
                `SELECT (${expr}) result FROM (SELECT decode($1,'hex') payload) candidate`,
                [hex],
              )
            ).rows[0]!.result,
            row: Row = {
              payload: value(hex),
              selector: value(selector),
              expected: value(expected),
              bypass: value(false),
            },
            outcome: Outcome =
              xmlBinary === undefined && length > 0
                ? { kind: 'Unknown' }
                : { kind: expected === null ? 'Null' : 'True' }
          await pg.query("INSERT INTO xml_binary_inputs VALUES(decode($1,'hex'),$2,$3,false)", [
            hex,
            selector,
            expected,
          ])
          nativeInserts++
          for (const origin of ['source', 'stored'])
            fixtures.push(
              { name: name + '_' + origin, row, expected: outcome },
              {
                name: name + '_' + origin,
                row: { ...row, bypass: value(true) },
                expected: { kind: 'True' },
              },
            )
          if (expected !== null) {
            await expect(
              pg.query("INSERT INTO xml_binary_inputs VALUES(decode($1,'hex'),$2,$3,false)", [
                hex,
                selector,
                expected + '!',
              ]),
            ).rejects.toMatchObject({ code: '23514' })
            nativeInserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, expected: value(expected + '!') },
                expected: outcome.kind === 'Unknown' ? outcome : { kind: 'False' },
              })
          }
        }
      for (const [selector, [name]] of entries.entries())
        for (const origin of ['source', 'stored']) {
          const row: Row = {
            payload: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            selector: value(selector),
            expected: value('unused'),
            bypass: value(false),
          }
          fixtures.push(
            {
              name: name + '_' + origin,
              row,
              expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            },
            {
              name: name + '_' + origin,
              row: { ...row, payload: { kind: 'Unknown' } },
              expected: { kind: 'Unknown' },
            },
          )
        }
      const profileRoot = join(root, xmlBinary ?? 'missing')
      await mkdir(profileRoot)
      await runCheckParity(
        profileRoot,
        'xmlbinary',
        group,
        plans.map((p) => p.identity.constraint),
        fixtures,
      )
      total += fixtures.length
    }
    console.info('XML binary context parity', {
      nativeInserts,
      fixtures: total,
      forms: entries.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
