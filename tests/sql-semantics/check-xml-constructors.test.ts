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

it('preserves XML constructor declarations, identifier mapping, NULLs and errors with native source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-constructors-'))
  try {
    const literal = '<?xml version="1.0" encoding=""?><r/>'
    const operations = {
      concat_single: 'xmlconcat(v)::text',
      concat_three: 'xmlconcat(v,NULL,w,v)::text',
      concat_nulls: 'xmlconcat(NULL::xml,NULL)::text',
      concat_constructed: 'xmlconcat(xmltext(s),v,xmlcomment(s))::text',
      transition: 'xmlconcat2(v,w)::text',
      root_version: 'xmlroot(v,VERSION s)::text',
      root_yes: 'xmlroot(v,VERSION s,STANDALONE YES)::text',
      root_no: 'xmlroot(v,VERSION s,STANDALONE NO)::text',
      root_clear: 'xmlroot(v,VERSION s,STANDALONE NO VALUE)::text',
      root_no_version: 'xmlroot(v,VERSION NO VALUE)::text',
      root_clear_all: 'xmlroot(v,VERSION NO VALUE,STANDALONE NO VALUE)::text',
      pi_plain: 'xmlpi(NAME notice,s)::text',
      pi_empty: 'xmlpi(NAME notice)::text',
      pi_reserved: 'xmlpi(NAME "xML",s)::text',
      pi_encoded: 'xmlpi(NAME "a b:_x0020_.😊",s)::text',
      pi_unicode: 'xmlpi(NAME "é雪́",s)::text',
      nested: 'xmlroot(xmlconcat(v,w),VERSION s,STANDALONE NO VALUE)::text',
      singleton_transition: 'xmlconcat2(v,NULL)::text',
      concat_document: '(xmlconcat(v,w) IS DOCUMENT)::text',
      root_document: '(xmlroot(v,VERSION s) IS DOCUMENT)::text',
      pi_document: '(xmlpi(NAME notice,s) IS DOCUMENT)::text',
      root_serialization: 'xmlserialize(DOCUMENT xmlroot(v,VERSION s) AS text)',
      root_wire: "encode(xml_send(xmlroot(v,VERSION s)),'hex')",
    }
    const entries = Object.entries(operations)
    const checks = entries.map(([name, expr], index) => ({
      name,
      expr,
      sql: `CASE WHEN bypass OR selector<>${index} THEN true ELSE (${expr})=expected END`,
    }))
    await pg.exec(`SET xmloption=CONTENT; CREATE DOMAIN xml_source AS xml; CREATE DOMAIN xml_copy AS xml_source;
   CREATE DOMAIN xml_document AS xml CHECK(VALUE IS DOCUMENT) CHECK(VALUE::text <> '<?xml version="1.0"?><template/>'::xml::text);
   CREATE TABLE xml_checks(v xml_copy,w xml_copy,s text,selector integer,expected text,bypass boolean,
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
      { v: "<?xml version='a\"b'?><r/>", s: 'a"b' },
      { v: '<?xml version="1.0" standalone="yes"?><r/>', s: '1.1' },
      { v: '<?xml version="1.1" standalone="no"?><r/>', s: null },
      { v: '<r/>', s: '?>' },
      { v: '<r/>', s: '  a \t ' },
      { v: '<r/>', s: '' },
      { v: '<?xml version=""?><r/>', s: '雪' },
    ].flatMap((sample) => [
      { ...sample, w: null },
      { ...sample, w: sample.v },
      { ...sample, w: '<?xml version="1.1" standalone="yes"?><w/>' },
    ])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let nativeInserts = 0
    for (const [selector, [name, expr]] of entries.entries())
      for (const sample of /\bw\b/u.test(expr)
        ? samples
        : samples.filter((_, index) => index % 3 === 0)) {
        let expected: string | null = null,
          outcome: Outcome
        try {
          expected = (
            await pg.query<{ result: string | null }>(
              `SELECT encode(convert_to((${expr})::text,'UTF8'),'hex') result FROM (SELECT $1::text::xml v,$2::text s,$3::text::xml w) input`,
              [sample.v, sample.s, sample.w],
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
          w: value(sample.w),
          selector: value(selector),
          expected: value(decoded),
          bypass: value(false),
        }
        const insert = pg.query(
          'INSERT INTO xml_checks VALUES($1::text::xml,$2::text::xml,$3,$4,$5,false)',
          [sample.v, sample.w, sample.s, selector, decoded],
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
            pg.query('INSERT INTO xml_checks VALUES($1::text::xml,$2::text::xml,$3,$4,$5,false)', [
              sample.v,
              sample.w,
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
            w: error,
            selector: value(selector),
            expected: error,
            bypass: value(true),
          },
          expected: { kind: 'True' },
        })
    }
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const partials: { operation: string; v: Input; w: Input; s: Input; expected: Outcome }[] = [
      {
        operation: 'concat_three',
        v: unknown,
        w: value(null),
        s: value(null),
        expected: { kind: 'Unknown' },
      },
      {
        operation: 'concat_three',
        v: unknown,
        w: error,
        s: value(null),
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
      {
        operation: 'concat_three',
        v: error,
        w: unknown,
        s: value(null),
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
      {
        operation: 'root_yes',
        v: value(null),
        w: value(null),
        s: unknown,
        expected: { kind: 'Null' },
      },
      {
        operation: 'root_yes',
        v: value(null),
        w: value(null),
        s: error,
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
      {
        operation: 'root_yes',
        v: unknown,
        w: value(null),
        s: error,
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
      {
        operation: 'pi_plain',
        v: value(null),
        w: value(null),
        s: unknown,
        expected: { kind: 'Unknown' },
      },
      {
        operation: 'pi_reserved',
        v: value(null),
        w: value(null),
        s: unknown,
        expected: { kind: 'Error', value: { state: parseInt('2200T', 36) } },
      },
      {
        operation: 'pi_reserved',
        v: value(null),
        w: value(null),
        s: error,
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
    ]
    for (const p of partials)
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: p.operation + '_' + origin,
          row: {
            v: p.v,
            w: p.w,
            s: p.s,
            selector: value(entries.findIndex(([name]) => name === p.operation)),
            expected: value('unused'),
            bypass: value(false),
          },
          expected: p.expected,
        })
    await mkdir('artifacts/goal-checks/xml-constructors-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/xml-constructors-active/sql-reference.json',
      JSON.stringify({ nativeInserts, fixtures: fixtures.length, reference }, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/goal-checks/xml-constructors-active/sql-evaluators.rs',
      group.evaluatorSource ?? '',
    )
    await runCheckParity(
      root,
      'xmlconstructors',
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
