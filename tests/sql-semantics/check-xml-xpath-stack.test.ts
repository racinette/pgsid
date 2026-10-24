import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

it('preserves XPath pending values and error order with a bounded test stack in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-stack-'))
  const known = (value: string | number | boolean): Input => ({ kind: 'Value', value })
  try {
    const cases: [string, number][] = [
      ["'x'", 0],
      ['true()', 0],
      ["concat('a','b')", 0],
      ["concat('a','b','c')", 15],
      ["concat('a','b',$x)", 5],
      ["concat('a','b',unknown())", 9],
      ["concat('a','b',true())", 15],
      ["concat('a',1+2)", 15],
      ["concat('a','b'='b')", 15],
      ["concat('a',true() or $x)", 0],
      ["concat('a',false() or true())", 0],
      ["concat('a',true() and true())", 0],
      ["concat('a','b',true() or $x)", 15],
      ["concat('a','b',/r)", 15],
      ["concat('a','b',/p:r)", 15],
      ["concat('a',/p:r)", 19],
      ["concat('a','b',/r[true()])", 15],
      ["concat('a',/r[true()])", 0],
      ["concat('a',/r[1=1])", 15],
      ["concat('a',/r[1])", 0],
      ["concat('a',/r[(true())])", 0],
      ["concat('a',(/r)[1=1])", 15],
      ["concat('a',(/r)[1])", 0],
      ["concat('a',(/r)[last()])", 0],
      ["concat('a',(/r|/r)[1])", 15],
      ["concat('a',(/r)[(1)])", 0],
      ["concat('a','b',/missing[1=1])", 15],
      ["concat('a',/missing[1=1])", 0],
      ["concat('a',concat('b','c'))", 15],
      ["concat(concat('a','b'),'c')", 0],
      ["concat(concat('a','b'),'c','d')", 15],
      ["concat(concat('a',$x),'b')", 5],
      ["true() or concat('a','b','c')", 0],
      ["false() and concat('a','b','c')", 0],
      ["unknown('a','b')", 9],
      ["true('a','b')", 12],
      ["true('a','b','c')", 15],
    ]
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_stack',
      constraint: 'matches',
    })
    const evaluatorSource = `pub fn ${entry}(expression: TextValue, fault: Int4Value, expected: BoolValue) -> CheckOutcome {
      let result=xpath_stack_probe(expression,fault,expected); check_from_bool(result)
    }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    const schema = source.modules.find((m) => m.name === 'pg_catalog')!
    const state = schema.files.find((f) => f.path.endsWith('/xml_xpath_eval_machine_state.rs'))!
    expect(state.source).toContain('const XPATH_VALUE_STACK_LIMIT: i32 = 1000000;')
    state.source = state.source.replace(
      'const XPATH_VALUE_STACK_LIMIT: i32 = 1000000;',
      'const XPATH_VALUE_STACK_LIMIT: i32 = 2;',
    )
    schema.files.find((f) => f.path.endsWith('/xml_xpath_eval.rs'))!.source += `
pub fn xpath_stack_probe(expression: TextValue, fault: Int4Value, expected: BoolValue) -> BoolValue {
 if let TextValue::Value(text)=expression { if let Int4Value::Value(reason)=fault { if let BoolValue::Value(wanted)=expected {
  let document=xpath_document_parse("<r/>"); let tree=document.tree; let graph=document.graph;
  let namespaces=xpath_namespaces_empty(); let powers=xpath_powers_empty(); let program=xpath_compile_with_limit(text.as_str(),5000);
  let result=xpath_evaluate(&program,&tree,&graph,&namespaces,&powers);
  if result.state!=0-reason {return BoolValue::Value(false);};
  if reason>0 {return BoolValue::Value(true);};
  return BoolValue::Value(xpath_value_truth(&result)==wanted);
 };};}; BoolValue::Unknown
}
`
    const inputs = [
      {
        name: 'expression',
        rustName: 'expression',
        type: 'pg_catalog.text',
        rustType: 'TextValue',
      },
      { name: 'fault', rustName: 'fault', type: 'pg_catalog.int4', rustType: 'Int4Value' },
      { name: 'expected', rustName: 'expected', type: 'pg_catalog.bool', rustType: 'BoolValue' },
    ]
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [expression, fault] of cases) {
      let expected = true,
        nativeFault = 0,
        detail = ''
      try {
        expected = (
          await pg.query<{ value: boolean }>(
            "SELECT (xpath('boolean('||$1||')','<r/>'::xml))[1]::text::boolean value",
            [expression],
          )
        ).rows[0]!.value
      } catch (error) {
        expect((error as { code: string }).code).toBe('10608')
        detail = (error as { detail?: string }).detail ?? ''
        if (detail.includes('Undefined variable')) nativeFault = 5
        else if (detail.includes('Unregistered function')) nativeFault = 9
        else if (detail.includes('Invalid number of arguments')) nativeFault = 12
        else if (detail.includes('Undefined namespace prefix')) nativeFault = 19
        else throw error
      }
      if (fault !== 15) expect(nativeFault, expression).toBe(fault)
      reference.push({
        expression,
        testCapacity: 2,
        expectedFault: fault,
        nativeCapacity: 1000000,
        nativeFault,
        nativeTruth: expected,
        detail,
      })
      fixtures.push({
        name: 'matches',
        row: { expression: known(expression), fault: known(fault), expected: known(expected) },
        expected: { kind: 'True' },
      })
    }
    const packet = 'artifacts/goal-checks/xml-xpath-compile-steps-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/stack-reference.json',
      JSON.stringify(
        { fixtures: fixtures.length, testCapacity: 2, productionCapacity: 1000000, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathstack', group, ['matches'], fixtures)
    console.info('XPath value-stack contract', {
      fixtures: fixtures.length,
      testCapacity: 2,
      productionCapacity: 1000000,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 180_000)
