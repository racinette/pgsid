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

it('matches native XPath compiler allocation boundaries and emission error order in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-xpath-steps-'))
  const known = (value: string | number | boolean): Input => ({ kind: 'Value', value })
  const packet = 'artifacts/goal-checks/xml-xpath-compile-steps-active'
  try {
    await pg.exec(`CREATE FUNCTION pg_temp.xpath_step_observe(p text) RETURNS jsonb LANGUAGE plpgsql AS $body$
      DECLARE state text; detail text;
      BEGIN PERFORM xpath_exists(p,'<r/>'::xml); RETURN jsonb_build_object('valid',true);
      EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS state=RETURNED_SQLSTATE,detail=PG_EXCEPTION_DETAIL;
      RETURN jsonb_build_object('valid',false,'state',state,'detail',detail); END $body$;`)
    type Native = { valid: boolean; state?: string; detail?: string }
    const observe = async (expression: string) =>
      (
        await pg.query<{ value: Native }>('SELECT pg_temp.xpath_step_observe($1) value', [
          expression,
        ])
      ).rows[0]!.value
    const counts: [string, number][] = [
      ['1', 1],
      ['"s"', 1],
      ['(1)', 1],
      ['((1))', 1],
      ['---1', 3],
      ['--1', 3],
      ['true()', 2],
      ['unknown()', 2],
      ['string(1)', 4],
      ['count(1)', 4],
      ['count(/r)', 5],
      ['string(/r)', 6],
      ['unknown(1,2)', 6],
      ['unknown(/r,/r)', 10],
      ['count(/r,/r)', 8],
      ['unknown((1),(true()))', 8],
      ['count((/r))', 6],
      ['/r', 3],
      ['r', 3],
      ['.', 2],
      ['..', 3],
      ['./.', 2],
      ['self::node()', 3],
      ['/r/.', 3],
      ['/r/..', 4],
      ['r//a', 5],
      ['//r', 4],
      ['processing-instruction("x")', 3],
      ['1|2', 5],
      ['r|a', 7],
      ['r|1', 6],
      ['1+r', 5],
      ['r[1]', 5],
      ['r[true()]', 5],
      ['r[true()][false()]', 7],
      ['(r)[true()]', 7],
      ['(r)[1]', 6],
      ['r[(true())]', 6],
      ['r[count(a)]', 8],
      ['r[string(a)]', 9],
      ['/r[1]/a[2]', 8],
      ['true() or false()', 4],
      ['/r[1+2]', 7],
      ['$x', 2],
      ['p:a', 3],
    ]
    const reference: unknown[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (
      input: string,
      terms: number,
      tail: string,
      valid: boolean,
      steps: number,
      fault: number,
    ) =>
      fixtures.push({
        name: 'counts',
        row: {
          input: known(input),
          terms: known(terms),
          tail: known(tail),
          valid: known(valid),
          steps: known(steps),
          fault: known(fault),
        },
        expected: { kind: 'True' },
      })
    for (const [expression, steps] of counts) {
      const padding = Math.floor((1_000_000 - steps - 5) / 2)
      const negative = 1_000_000 - steps - 5 - padding * 2 === 1 ? '-' : ''
      const start = 'true() or ' + negative + 'probe('
      const accepted = await observe(start + '0,'.repeat(padding) + expression + ')')
      const exhausted = await observe(
        start + 'true(),' + '0,'.repeat(padding - 1) + expression + ')',
      )
      expect(accepted, expression).toEqual({ valid: true })
      expect(exhausted.valid, expression).toBe(false)
      expect(exhausted.state, expression).toBe('10608')
      expect(exhausted.detail, expression).toContain('(no message provided)')
      reference.push({ expression, steps, padding, negative, accepted, exhausted })
      add(expression, 0, '', true, steps, 0)
    }
    for (const [expression, steps] of [
      ['true(', 2],
      ['unknown(', 2],
      ['concat(1,', 4],
      ['concat(1, ', 4],
    ] as const) {
      expect(await observe('true() or ' + expression), expression).toEqual({ valid: true })
      add(expression, 0, '', true, steps, 0)
    }
    const boundaries: [string, number, string, boolean, number, number][] = [
      ['true() or ', 499999, '', true, 1000000, 0],
      ['true() or ', 499999, '+?', false, 999998, 0],
      ['true() or ', 500000, '', false, 1000000, -15],
      ['true() or ', 500000, '+?', false, 1000000, 0],
      ['true() or ', 500001, '+?', false, 1000000, -15],
      ['boolean(true()) or ', 499998, '+r[?]', false, 1000000, -15],
      ['boolean(true()) or ', 499997, '+r[?]', false, 999999, 0],
      ['true() or ', 499999, '+1|?', false, 1000000, -15],
      ['true() or ', 499999, '+@?', false, 999999, 0],
      ['true() or ', 499999, '+processing-instruction("x"', false, 999999, 0],
      ['true() or ', 499999, '+unknown(', false, 1000000, -15],
      ['true() or ', 499998, '+unknown(1', false, 999998, 0],
    ]
    for (const [input, terms, tail, valid, steps, fault] of boundaries) {
      const expression = input + '1+'.repeat(terms - 1) + '1' + tail
      const result = await observe(expression)
      expect(result.valid, JSON.stringify({ input, terms, tail })).toBe(valid)
      if (!valid) {
        expect(result.state).toBe('10608')
        expect(
          result.detail?.includes('(no message provided)'),
          JSON.stringify({ input, terms, tail, result }),
        ).toBe(fault === -15)
      }
      reference.push({ input, terms, tail, valid, steps, fault, result, length: expression.length })
      add(input, terms, tail, valid, steps, fault)
    }
    const entry = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'xpath_steps',
      constraint: 'counts',
    })
    const evaluatorSource = `pub fn ${entry}(input: TextValue, terms: Int4Value, tail: TextValue, valid: BoolValue, steps: Int4Value, fault: Int4Value) -> CheckOutcome {
      let result=xpath_steps_probe(input,terms,tail,valid,steps,fault); check_from_bool(result)
    }`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/xml_xpath_parse.rs'))!.source += `
pub fn xpath_steps_probe(input: TextValue, terms: Int4Value, tail: TextValue, valid: BoolValue, steps: Int4Value, fault: Int4Value) -> BoolValue {
 if let TextValue::Value(prefix)=input { if let Int4Value::Value(count)=terms { if let TextValue::Value(suffix)=tail {
  if let BoolValue::Value(wanted)=valid { if let Int4Value::Value(emitted)=steps { if let Int4Value::Value(reason)=fault {
   let mut text=prefix; let mut index: i32=0;
   while index<count { if index>0 {text.push('+');}; text.push('1'); index=index+1; } text.push_str(suffix.as_str());
   let program=xpath_parse_frontend(text.as_str(),5000);
   return BoolValue::Value(program.valid==wanted && program.budget.steps==emitted && program.budget.fault==reason);
  };};};
 };};}; BoolValue::Unknown
}
`
    const inputs = ['input', 'terms', 'tail', 'valid', 'steps', 'fault'].map((name) => ({
      name,
      rustName: name,
      type:
        name === 'valid'
          ? 'pg_catalog.bool'
          : name === 'input' || name === 'tail'
            ? 'pg_catalog.text'
            : 'pg_catalog.int4',
      rustType:
        name === 'valid'
          ? 'BoolValue'
          : name === 'input' || name === 'tail'
            ? 'TextValue'
            : 'Int4Value',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks: [{ kind: 'supported', entryName: entry, inputs }],
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/step-reference.json',
      JSON.stringify(
        {
          countWitnesses: counts.length,
          nativeBoundaryCases: boundaries.length,
          fixtures: fixtures.length,
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xpathsteps', group, ['counts'], fixtures)
    console.info('XPath compiler step parity', {
      countWitnesses: counts.length,
      nativeBoundaryCases: boundaries.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
