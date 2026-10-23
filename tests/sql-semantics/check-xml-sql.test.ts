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

const value = (input: string | number | boolean | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('binds XML SQL values, captured literals, casts and explicit syntax with native source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-sql-'))
  try {
    const literal = '<?xml version="1.0" encoding=""?><r/>'
    const operations = {
      storage: 'v::text',
      content: 'XMLSERIALIZE(CONTENT v AS text)',
      document: 'XMLSERIALIZE(DOCUMENT v AS text)',
      is_document: '(v IS DOCUMENT)::text',
      wire: "encode(xml_send(v),'hex')",
      text_node: 'xmltext(s)::text',
      comment: 'xmlcomment(s)::text',
      parse_document: 'XMLSERIALIZE(CONTENT XMLPARSE(DOCUMENT s) AS text)',
      parse_content: 'XMLSERIALIZE(CONTENT XMLPARSE(CONTENT s PRESERVE WHITESPACE) AS text)',
      cast: '(s::xml)::text',
      function_cast: 'xml(s)::text',
      function_text: 'text(v)',
      checked_domain: '(v::xml_document)::text',
      bounded: 'XMLSERIALIZE(CONTENT v AS varchar(5))',
      coalesced: 'COALESCE(v,xmltext(s))::text',
      literal: `(CASE WHEN v IS NULL THEN '${literal}'::xml ELSE v END)::text`,
      different_literals: `(CASE WHEN v IS NULL THEN '${literal}'::xml ELSE '<r/>'::xml END)::text`,
      nullness: "CASE WHEN v IS NULL THEN 'null' ELSE 'value' END",
    }
    const entries = Object.entries(operations)
    const checks = entries.map(([name, expr], index) => ({
      name,
      expr,
      sql: `CASE WHEN bypass OR selector<>${index} THEN true ELSE (${expr})=expected END`,
    }))
    await pg.exec(`SET xmloption=CONTENT; CREATE DOMAIN xml_source AS xml; CREATE DOMAIN xml_copy AS xml_source;
   CREATE DOMAIN xml_document AS xml CHECK(VALUE IS DOCUMENT) CHECK(VALUE::text <> '<?xml version="1.0"?><template/>'::xml::text);
   CREATE TABLE xml_checks(v xml_copy,s text,selector integer,expected text,bypass boolean,
   ${checks.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')});`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_checks')!
    const plans = checks.flatMap((c) =>
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
          catalog.domains,
          origin as 'source' | 'stored',
          [],
          undefined,
          origin === 'source' ? `CHECK(${c.sql})` : undefined,
        )!.expression,
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      xmlOption: 'content',
    })
    expect(
      group.checks.flatMap((c, i) =>
        c.kind === 'unsupported' ? [{ name: plans[i]!.identity.constraint, reason: c.reason }] : [],
      ),
    ).toEqual([])
    const samples = [
      { v: null, s: null },
      { v: '', s: '' },
      { v: '<r/>', s: '<r/>' },
      { v: literal, s: literal },
      { v: '<?xml version="1.1"?><r/>', s: '<r>' },
      { v: '<a/><b/>', s: '--' },
      { v: 'plain', s: 'a-' },
      { v: '<é>😊</é>', s: '< & > "' },
      { v: '\ufeff<r/>', s: '<r/> ' },
      { v: '\n\n<r/>', s: '\u0001' },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let nativeInserts = 0
    for (const [selector, [name, expr]] of entries.entries())
      for (const sample of samples) {
        let expected: string | null = null,
          outcome: Outcome
        try {
          expected = (
            await pg.query<{ result: string | null }>(
              `SELECT encode(convert_to((${expr})::text,'UTF8'),'hex') result FROM (SELECT $1::text::xml v,$2::text s) input`,
              [sample.v, sample.s],
            )
          ).rows[0]!.result
          outcome = { kind: expected === null ? 'Null' : 'True' }
        } catch (error) {
          outcome = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        const decoded = expected === null ? null : Buffer.from(expected, 'hex').toString('utf8')
        const row: Row = {
          v: value(sample.v),
          s: value(sample.s),
          selector: value(selector),
          expected: value(decoded),
          bypass: value(false),
        }
        const insert = pg.query('INSERT INTO xml_checks VALUES($1::text::xml,$2,$3,$4,false)', [
          sample.v,
          sample.s,
          selector,
          decoded,
        ])
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
            pg.query('INSERT INTO xml_checks VALUES($1::text::xml,$2,$3,$4,false)', [
              sample.v,
              sample.s,
              selector,
              'different',
            ]),
          ).rejects.toMatchObject({ code: '23514', constraint: name })
          nativeInserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, expected: value('different') },
              expected: { kind: 'False' },
            })
        }
        reference.push({ name, sample, expected: decoded, outcome })
      }
    for (const [selector, [name]] of entries.entries()) {
      const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: name + '_' + origin,
          row: {
            v: error,
            s: error,
            selector: value(selector),
            expected: error,
            bypass: value(true),
          },
          expected: { kind: 'True' },
        })
    }
    await mkdir('artifacts/goal-checks/xml-sql-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-sql-active/sql-reference.json',
      JSON.stringify({ nativeInserts, fixtures: fixtures.length, reference }, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/goal-checks/xml-sql-active/sql-evaluators.rs',
      group.evaluatorSource ?? '',
    )
    await runCheckParity(
      root,
      'xmlsql',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    console.info('XML SQL parity', {
      nativeInserts,
      fixtures: fixtures.length,
      forms: entries.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
