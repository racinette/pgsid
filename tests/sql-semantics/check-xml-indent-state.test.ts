import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves XML indentation provenance, encoding, randomized notation order and reached errors in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-indent-state-'))
  const known = (value: string): Input => ({ kind: 'Value', value })
  const names = [
    'content',
    'document',
    'rendered_content',
    'rendered_document',
    'ascii_content',
    'ascii_document',
  ]
  try {
    const entries = names.map((constraint) =>
      checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'xml_indent_state',
        constraint,
      }),
    )
    const evaluatorSource = entries
      .map(
        (entry, mode) => `pub fn ${entry}(input: TextValue, expected: TextValue) -> CheckOutcome {
      let result = xml_indent_probe(input,expected,${mode}); check_from_bool(result)
    }`,
      )
      .join('\n')
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_indent.rs'))!.source += `
pub fn xml_indent_probe(input: TextValue, expected: TextValue, mode: i32) -> BoolValue {
 let mut parsed = xml_from_storage_text(input.clone());
 if mode == 2 || mode == 3 { parsed = xml_from_rendered_text(input); };
 let output = xml_serialize_context(parsed,2 - mode % 2,true,mode < 4);
 sql__pg_catalog__texteq__aet8(output,expected)
}
`
    const inputs = ['input', 'expected'].map((name) => ({
      name,
      type: 'pg_catalog.text',
      rustName: name,
      rustType: 'TextValue',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const notation =
      '<!DOCTYPE r [<!NOTATION z SYSTEM "z"><!NOTATION a SYSTEM "a"><!NOTATION b SYSTEM "b">]><r/>'
    const permutations: string[] = []
    for (let index = 0; index < 32; index++) {
      const result = (
        await pg.query<{ value: string }>(
          'SELECT XMLSERIALIZE(DOCUMENT $1::xml AS text INDENT) value',
          [notation],
        )
      ).rows[0]!.value
      expect(result.split('\n').slice(1, 4).sort()).toEqual([
        '<!NOTATION a SYSTEM "a" >',
        '<!NOTATION b SYSTEM "b" >',
        '<!NOTATION z SYSTEM "z" >',
      ])
      expect(result.startsWith('<!DOCTYPE r [\n')).toBe(true)
      expect(result.endsWith(']>\n<r/>')).toBe(true)
      permutations.push(result)
    }
    expect(new Set(permutations).size).toBeGreaterThan(1)
    const error: Outcome = { kind: 'Error', value: { state: parseInt('2200L', 36) } }
    const retained: Outcome = { kind: 'Error', value: { state: parseInt('22023', 36) } }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const name of names) {
      const document = name.endsWith('document'),
        rendered = name.startsWith('rendered'),
        ascii = name.startsWith('ascii')
      const cases: { input: Input; expected: Input; outcome: Outcome }[] = [
        {
          input: known('<r/>'),
          expected: known('<r/>'),
          outcome: { kind: rendered ? 'Unknown' : 'True' },
        },
        {
          input: known('<a/><b/>'),
          expected: known('unused'),
          outcome: document ? error : { kind: rendered ? 'Unknown' : 'False' },
        },
        {
          input: known('<r>'),
          expected: known('unused'),
          outcome: rendered && !document ? { kind: 'Unknown' } : error,
        },
        { input: known(notation), expected: known(permutations[0]!), outcome: { kind: 'Unknown' } },
        {
          input: known(notation),
          expected: { kind: 'Error', value: { state: parseInt('22023', 36) } },
          outcome: retained,
        },
        { input: { kind: 'Null' }, expected: known('unused'), outcome: { kind: 'Null' } },
        { input: { kind: 'Unknown' }, expected: known('unused'), outcome: { kind: 'Unknown' } },
        {
          input: { kind: 'Error', value: { state: parseInt('22023', 36) } },
          expected: { kind: 'Unknown' },
          outcome: retained,
        },
        {
          input: known('<r>é</r>'),
          expected: known('<r>&#xE9;</r>'),
          outcome: { kind: rendered || ascii ? 'Unknown' : 'True' },
        },
        {
          input: known('<r>&#xE9;</r>'),
          expected: known('<r>&#xE9;</r>'),
          outcome: { kind: rendered ? 'Unknown' : 'True' },
        },
        {
          input: known('<?xml version="1.0"?><r>&#xE9;</r>'),
          expected: known(
            document ? '<?xml version="1.0" encoding="UTF-8"?>\n<r>é</r>' : '<r>&#xE9;</r>',
          ),
          outcome: { kind: rendered || (ascii && document) ? 'Unknown' : 'True' },
        },
      ]
      for (const item of cases)
        fixtures.push({
          name,
          row: { input: item.input, expected: item.expected },
          expected: item.outcome,
        })
    }
    const packet = 'artifacts/goal-checks/xml-indent-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/state-reference.json',
      JSON.stringify({ permutations, distinct: new Set(permutations).size, fixtures }, null, 2) +
        '\n',
    )
    await runCheckParity(root, 'xmlindentstate', group, names, fixtures)
    console.info('XML indent state parity', {
      fixtures: fixtures.length,
      nativePermutations: new Set(permutations).size,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)

it('matches native indentation text limits and discarded whitespace without embedding large fixtures', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-indent-limits-'))
  const value = (value: string | number | boolean): Input => ({ kind: 'Value', value })
  const forms = ['CONTENT', 'DOCUMENT'].map((mode) => ({
    name: mode.toLowerCase(),
    expression: `length(XMLSERIALIZE(${mode} xmlelement(NAME r,repeat(padding,repetitions),tail) AS text INDENT))`,
  }))
  try {
    await pg.exec(
      `CREATE TABLE xml_indent_limits(padding text,repetitions int4,tail xml,selector int4,expected int4,bypass bool,${forms.map((f, i) => `CONSTRAINT ${f.name} CHECK(CASE WHEN bypass OR selector<>${i} THEN true ELSE ${f.expression}=expected END)`).join(',')});CREATE TEMP TABLE xml_indent_limit_input(padding text,repetitions int4,tail xml);`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_indent_limits')!
    const plans = forms.flatMap((f) =>
      ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: f.name + '_' + origin,
        },
        expression: lowerTableCheck(
          table,
          table.constraints.find((c) => c.name === f.name)!,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!.expression,
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      xmlOption: 'content',
    })
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0
    for (const sample of [
      { padding: ' ', repetitions: 10000001, tail: '<a/>' },
      { padding: ' ', repetitions: 10000001, tail: '&#32;' },
      { padding: '\n', repetitions: 10000001, tail: '<!--c-->' },
      { padding: 'x', repetitions: 256, tail: '<a/>' },
    ]) {
      await pg.exec('TRUNCATE xml_indent_limit_input')
      await pg.query('INSERT INTO xml_indent_limit_input VALUES($1,$2,$3)', Object.values(sample))
      for (const [selector, form] of forms.entries()) {
        let length = 0,
          outcome: Outcome = { kind: 'True' }
        try {
          length = (
            await pg.query<{ value: number }>(
              'SELECT ' + form.expression + ' value FROM xml_indent_limit_input',
            )
          ).rows[0]!.value
        } catch (error) {
          outcome = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        const insert = pg.query(
          'INSERT INTO xml_indent_limits SELECT padding,repetitions,tail,$1,$2,false FROM xml_indent_limit_input',
          [selector, length],
        )
        if (outcome.kind === 'Error')
          await expect(insert).rejects.toMatchObject({
            code: outcome.value.state.toString(36).toUpperCase(),
          })
        else await insert
        inserts++
        const row: Row = {
          padding: value(sample.padding),
          repetitions: value(sample.repetitions),
          tail: value(sample.tail),
          selector: value(selector),
          expected: value(length),
          bypass: value(false),
        }
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: form.name + '_' + origin, row, expected: outcome })
        reference.push({ ...sample, mode: form.name, length, outcome })
      }
    }
    await writeFile(
      'artifacts/goal-checks/xml-indent-active/limit-reference.json',
      JSON.stringify({ reference, inserts, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'xmlindentlimits',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    console.info('XML indent limit parity', { inserts, fixtures: fixtures.length })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
