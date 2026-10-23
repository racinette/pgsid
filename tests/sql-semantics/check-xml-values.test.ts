import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const value = (input: string | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('preserves owned XML storage separately from rendered output, explicit parse modes and scalar constructors in all targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-xml-values-'))
  const modes = [
    ['content', "encode(convert_to(XMLPARSE(CONTENT input)::text,'UTF8'),'hex')"],
    ['document', "encode(convert_to(XMLPARSE(DOCUMENT input)::text,'UTF8'),'hex')"],
    ['output', "encode(convert_to(xml_out(XMLPARSE(CONTENT input))::text,'UTF8'),'hex')"],
    ['wire', "encode(xml_send(XMLPARSE(CONTENT input)),'hex')"],
    ['is_document', '(XMLPARSE(CONTENT input) IS DOCUMENT)::text'],
    ['text_node', "encode(convert_to(xmltext(input)::text,'UTF8'),'hex')"],
    ['comment', "encode(convert_to(xmlcomment(input)::text,'UTF8'),'hex')"],
    ['rendered', "encode(convert_to(xml_out(XMLPARSE(CONTENT input))::text,'UTF8'),'hex')"],
    ['rendered_cast', "encode(convert_to(XMLPARSE(CONTENT input)::text,'UTF8'),'hex')"],
    ['snapshot', "encode(convert_to(XMLPARSE(CONTENT input)::text,'UTF8'),'hex')"],
    ['text_document', '(xmltext(input) IS DOCUMENT)::text'],
    ['comment_document', '(xmlcomment(input) IS DOCUMENT)::text'],
    ['nullness', '(XMLPARSE(CONTENT input) IS NULL)::text'],
    ['rendered_document', '(XMLPARSE(CONTENT input) IS DOCUMENT)::text'],
  ] as const
  try {
    const entries = modes.map(([constraint]) =>
      checkRustEntryName({ schema: 'public', kind: 'table', owner: 'xml_values', constraint }),
    )
    const evaluatorSource = entries
      .map(
        (entry, mode) => `pub fn ${entry}(input: TextValue, expected: TextValue) -> CheckOutcome {
      let result = xml_value_probe(input, expected, ${mode}); check_from_bool(result)
    }`,
      )
      .join('\n')
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    const operations = source.modules.find((module) => module.name === 'pg_catalog')!
    operations.files.find((file) => file.path.endsWith('/xml_scalar.rs'))!.source += `
fn xml_value_probe_error(error: SqlError) -> BoolValue {
 let description = sql_error_message(error);
 if error.state == 3452566 && description.message != "invalid XML document" { return BoolValue::Value(false); };
 if error.state == 3452567 && description.message != "invalid XML content" { return BoolValue::Value(false); };
 if error.state == 3452572 && description.message != "invalid XML comment" { return BoolValue::Value(false); };
 BoolValue::Error(error)
}
fn xml_value_probe_hex(input: TextValue) -> TextValue {
 if let TextValue::Value(value) = input {
  let characters: Vec<char> = value.as_str().chars().collect();
  let mut result = String::new(); let mut index: usize = 0;
  while index < characters.len() { result = bytea_utf8_character(result, characters[index]); index += 1; }
  return TextValue::Value(result);
 }; input
}
pub fn xml_value_probe(input: TextValue, expected: TextValue, mode: i32) -> BoolValue {
 let mut parsed = xml_unknown();
 if mode == 5 || mode == 10 { parsed = sql__pg_catalog__xmltext__a36t(input); }
 else if mode == 6 || mode == 11 { parsed = sql__pg_catalog__xmlcomment__8j57(input); }
 else if mode == 7 || mode == 8 || mode == 13 { parsed = xml_from_rendered_text(input); }
 else { parsed = xml_from_text_utf8(input, mode == 1); };
 let mut output = text_unknown();
 if mode == 2 || mode == 7 { output = xml_to_output_text(parsed); }
 else if mode == 3 {
  let bytes = xml_to_bytea_utf8(parsed);
  if let ByteaValue::Error(error) = bytes { return xml_value_probe_error(error); };
  if let ByteaValue::Unknown = bytes { return BoolValue::Unknown; };
  if let ByteaValue::Null = bytes { return BoolValue::Null; };
  if let ByteaValue::Value(value) = bytes { output = TextValue::Value(value); };
 }
 else if mode == 4 || (mode >= 10 && mode <= 13) {
  let mut result = bool_unknown();
  if mode == 12 { result = xml_is_null(parsed); }
  else { result = xml_is_document_utf8(parsed); };
  if let BoolValue::Error(error) = result { return xml_value_probe_error(error); };
  if let BoolValue::Unknown = result { return BoolValue::Unknown; };
  if let BoolValue::Null = result { return BoolValue::Null; };
  if let BoolValue::Value(value) = result {
   output = make_text_value("false"); if value { output = make_text_value("true"); };
  };
 }
 else {
  if mode == 9 {
   let snapshot = parsed.clone();
   parsed = make_xml_value("changed");
   let changed = xml_to_text(parsed);
   if let TextValue::Value(actual) = changed { if actual.as_str() != "changed" { return BoolValue::Value(false); }; };
   parsed = snapshot;
  };
  output = xml_to_text(parsed);
 };
 if mode != 3 && mode != 4 && mode < 10 { output = xml_value_probe_hex(output); };
 if let TextValue::Error(error) = output { return xml_value_probe_error(error); };
 if let TextValue::Error(error) = expected { return BoolValue::Error(error); };
 if let TextValue::Unknown = output { return BoolValue::Unknown; };
 if let TextValue::Unknown = expected { return BoolValue::Unknown; };
 if let TextValue::Null = output { return BoolValue::Null; };
 if let TextValue::Null = expected { return BoolValue::Null; };
 if let TextValue::Value(actual) = output {
  if let TextValue::Value(wanted) = expected { return BoolValue::Value(actual == wanted); };
 }; BoolValue::Unknown
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
    await pg.exec(`CREATE TABLE xml_values(input text,expected text,selector text,
      ${modes.map(([name, expression]) => `CONSTRAINT ${name} CHECK(CASE WHEN selector='${name}' THEN (${expression})=expected ELSE true END)`).join(',')})`)
    const samples: (string | null)[] = [
      null,
      '',
      'plain',
      ' ',
      '\n<r/>',
      '\n\n<r/>',
      '<r/>',
      '<a/><b/>',
      '<!--hi-->',
      '<r>',
      '<r>\u0001</r>',
      '<r>&unknown;</r>',
      '<r a="1" a="2"/>',
      '<r>é😊</r>',
      '<r>\r\nx\r</r>',
      '\ufeff<r/>',
      '<?xml version="1.0"?><r/>',
      '<?xml version="1.0"?>\n<r/>',
      '<?xml version="1.0"?>\n\n<r/>',
      '<?xml version="1.1"?><r/>',
      '<?xml version="2.0"?><r/>',
      '<?xml version=""?><r/>',
      "<?xml version = '1.0' encoding = 'not-supported' standalone = 'yes' ?><r/>",
      '<?xml version="1.0" encoding="UTF-16"?><é/>',
      '<?xml version="1.0" encoding=""?><r/>',
      '<?xml version="1.0" encoding="3"?><r/>',
      '<?xml version="1.0" encoding="_"?><r/>',
      '<?xml version="1.0" encoding="-"?><r/>',
      '<?xml version="1.0" standalone="no"?><r/>',
      '<!DOCTYPE r [<!ENTITY e "yes">]><r>&e;</r>',
      '<!DOCTYPE r SYSTEM "missing"><r>&e;</r>',
      '--',
      'a-',
      '< & > " \'',
      'a\rb\nc',
      '\u0001',
      '<?xml-stylesheet href="x"?>',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    let nativeInserts = 0
    for (const [mode, [name, expression]] of modes.entries()) {
      for (const input of samples) {
        let result: string | null, rendered: string | null
        try {
          result = (
            await pg.query<{ result: string | null }>(
              `SELECT ${expression} AS result FROM (SELECT $1::text input) s`,
              [input],
            )
          ).rows[0]!.result
          rendered =
            mode === 7 || mode === 8 || mode === 13
              ? (
                  await pg.query<{ hex: string | null }>(
                    "SELECT encode(convert_to(xml_out(XMLPARSE(CONTENT $1::text))::text,'UTF8'),'hex') AS hex",
                    [input],
                  )
                ).rows[0]!.hex
              : null
        } catch (failure) {
          const error = failure as { code: string }
          expect(['2200M', '2200N', '2200S']).toContain(error.code)
          if (mode !== 7 && mode !== 8 && mode !== 13)
            fixtures.push({
              name,
              row: { input: value(input), expected: value('') },
              expected: { kind: 'Error', value: { state: parseInt(error.code, 36) } },
            })
          await expect(
            pg.query('INSERT INTO xml_values VALUES($1,$2,$3)', [input, '', name]),
          ).rejects.toMatchObject({ code: error.code })
          nativeInserts += 1
          oracle.push({ name, input, error: error.code })
          continue
        }
        const localInput =
          mode === 7 || mode === 8 || mode === 13
            ? rendered === null
              ? null
              : Buffer.from(rendered, 'hex').toString('utf8')
            : input
        const renderedDocument =
          mode === 13 && localInput !== null
            ? (
                await pg.query<{ document: boolean }>(
                  'SELECT xml_is_well_formed_document($1::text) AS document',
                  [localInput],
                )
              ).rows[0]!.document
            : false
        if (mode === 13 && input?.includes('encoding=""')) {
          expect(result).toBe('false')
          expect(renderedDocument).toBe(true)
          expect(localInput).toBe('<r/>')
        }
        for (const wrong of result === null ? [false] : [false, true]) {
          const expected = wrong ? 'different' : result
          const insertion = pg.query('INSERT INTO xml_values VALUES($1,$2,$3)', [
            input,
            expected,
            name,
          ])
          if (wrong)
            await expect(insertion).rejects.toMatchObject({ code: '23514', constraint: name })
          else await insertion
          nativeInserts += 1
          fixtures.push({
            name,
            row: { input: value(localInput), expected: value(expected) },
            expected: {
              kind:
                (mode === 8 && input !== null) || (mode === 13 && renderedDocument)
                  ? 'Unknown'
                  : result === null
                    ? 'Null'
                    : wrong
                      ? 'False'
                      : 'True',
            },
          })
        }
        oracle.push({ name, input, expected: result, rendered })
      }
      for (const input of [
        { kind: 'Unknown' } as Input,
        { kind: 'Error', value: { state: parseInt('22003', 36) } } as Input,
      ])
        fixtures.push({
          name,
          row: { input, expected: value('') },
          expected:
            input.kind === 'Error' ? { kind: 'Error', value: input.value } : { kind: 'Unknown' },
        })
    }
    await writeFile(
      'artifacts/goal-checks/xml-values-active/foundation-reference.json',
      JSON.stringify({ nativeInserts, fixtures: fixtures.length, oracle }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'xmlvalues',
      group,
      modes.map(([name]) => name),
      fixtures,
    )
    console.info('XML foundation parity', { nativeInserts, fixtures: fixtures.length })
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
