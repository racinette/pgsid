import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { captureRegexCharacterProfile } from '../../tools/check-rust/regex-profile.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const root = 'artifacts/goal-checks/jsonpath-unicode-regex-active'

it('matches captured Unicode regex properties, directional cases, ranges, boundaries and compiled captures in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-character-profile-'))
  try {
    const profile = await captureRegexCharacterProfile(pg)
    await mkdir(root, { recursive: true })
    await writeFile(root + '/profile.json', JSON.stringify(profile) + '\n')
    expect(profile.ranges.length % 3).toBe(0)
    expect(profile.cases.length % 3).toBe(0)
    const names = ['direct', 'compiled', 'count', 'spans', 'captures', 'all_captures']
    const entries = names.map((constraint) =>
      checkRustEntryName({ schema: 'public', kind: 'table', owner: 'regex_profile', constraint }),
    )
    const evaluatorSource = entries
      .map(
        (
          entry,
          mode,
        ) => `pub fn ${entry}(pattern:TextValue,subject:TextValue,insensitive:BoolValue,expected:TextValue)->CheckOutcome {
 let result=regex_profile_probe(pattern,subject,insensitive,expected,${mode});check_from_bool(result)
}`,
      )
      .join('\n')
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: [],
      requiresRegex: true,
    })
    source.modules
      .find((m) => m.name === 'regex_engine')!
      .files.push({
        path: 'test/regex_profile.rs',
        source: `
const PROFILE_RANGES: &[usize] = &[${profile.ranges.join(',')}];
const PROFILE_CASES: &[usize] = &[${profile.cases.join(',')}];
pub fn captured_regex_profile() -> RegexCharacterProfile {
 let mut ranges:Vec<usize>=Vec::new(); let mut cases:Vec<usize>=Vec::new(); let mut index:usize=0;
 while index<PROFILE_RANGES.len() {ranges.push(PROFILE_RANGES[index]);index+=1;}
 index=0;while index<PROFILE_CASES.len() {cases.push(PROFILE_CASES[index]);index+=1;}
 make_regex_character_profile(ranges,cases)
}

`,
      })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'test/regex_profile.rs',
        source: `
fn regex_profile_span_text(spans:Vec<MatchSpan>)->TextValue {
 let mut result=String::new();let mut index:usize=0;
 while index<spans.len(){result.push_str(regex_profile_index_text(spans[index].start).as_str());result.push('-');result.push_str(regex_profile_index_text(spans[index].end).as_str());result.push(';');index+=1;}
 make_text_value(result.as_str())
}
fn regex_profile_capture_text(spans:Vec<CaptureSpan>)->TextValue {
 let mut result=String::new();let mut index:usize=0;
 while index<spans.len(){
  if spans[index].matched {result.push_str(regex_profile_index_text(spans[index].start).as_str());result.push('-');result.push_str(regex_profile_index_text(spans[index].end).as_str());}else{result.push('!');};
  result.push(';');index+=1;
 }
 make_text_value(result.as_str())
}
fn regex_profile_index_text(value:usize)->String {
 let mut cursor:usize=0;let mut wide:i64=0i64;while cursor<value{wide=wide+1i64;cursor+=1;}
 text_signed_number(wide)
}
fn regex_profile_one(program:&CompiledRegex,text:&str,mode:i32)->TextValue {
 let mut result=TextValue::Unknown;
 if mode==1 {
  let found=find_compiled(program,text,0);
  if let MatchOutcome::NoMatch=found {result=make_text_value("false");};
  if let MatchOutcome::Found(span)=found {if span.start<=span.end{result=make_text_value("true");};};
 };
 if mode==2 {let counted=count_compiled(program,text,0);if let CountOutcome::Count(count)=counted{result=make_text_value(regex_profile_index_text(count).as_str());};};
 if mode==3 {let found=find_all_compiled(program,text,0);if let MatchListOutcome::Matches(spans)=found{result=regex_profile_span_text(spans);};};
 if mode==5 {let found=captures_all_compiled(program,text,0);if let CaptureListOutcome::Matches(batch)=found{result=regex_profile_capture_text(batch.groups);};};
 if mode==4 {
  let found=captures_compiled(program,text,0);
  if let CaptureOutcome::NoMatch=found{result=make_text_value("");};
  if let CaptureOutcome::Found(spans)=found{result=regex_profile_capture_text(spans);};
 };
 result
}
pub fn regex_profile_probe(pattern:TextValue,subject:TextValue,insensitive:BoolValue,expected:TextValue,mode:i32)->BoolValue {
 if let TextValue::Value(needle)=pattern {if let TextValue::Value(text)=subject {if let BoolValue::Value(ignore)=insensitive {
  let options=RegexOptions{syntax:Syntax::Advanced,case_sensitive:ignore==false,expanded:false,newline:NewlineMode::Ordinary};
  let mut result=TextValue::Unknown;
  if mode==0 {
   let found=find_profile(needle.as_str(),text.as_str(),0,options,captured_regex_profile());
   if let MatchOutcome::InvalidPattern=found {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));};
   if let MatchOutcome::NoMatch=found {result=make_text_value("false");};
   if let MatchOutcome::Found(span)=found {if span.start<=span.end{result=make_text_value("true");};};
  }else{
   let compiled=compile_profile(needle.as_str(),options,captured_regex_profile());
   if let CompileOutcome::InvalidPattern=compiled {return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));};
   if let CompileOutcome::Compiled(program)=compiled {
    let characters:Vec<char>=text.chars().collect();let mut cursor:usize=0;let mut part=String::new();let mut joined=String::new();
    while cursor<characters.len(){
     if characters[cursor]=='|' {
      let item=regex_profile_one(&program,part.as_str(),mode);
      let mut known=false;
      if let TextValue::Value(value)=item{joined.push_str(value.as_str());joined.push('|');known=true;};
      if known==false{return BoolValue::Unknown;};
      part=String::new();
     }else{part.push(characters[cursor]);};
     cursor+=1;
    }
    result=make_text_value(joined.as_str());
   };
  };
  if let TextValue::Value(actual)=result{if let TextValue::Value(wanted)=expected{return BoolValue::Value(actual==wanted);};};
 };};};
 BoolValue::Unknown
}
`,
      })
    const inputs = ['pattern', 'subject', 'insensitive', 'expected'].map((name) => ({
      name,
      rustName: name,
      type: name === 'insensitive' ? 'pg_catalog.bool' : 'pg_catalog.text',
      rustType: name === 'insensitive' ? 'BoolValue' : 'TextValue',
    }))
    const group = {
      source,
      evaluatorSource,
      requiresRegex: true,
      checks: entries.map((entryName) => ({ kind: 'supported' as const, entryName, inputs })),
    }
    const subjects = [
      's',
      'S',
      'ſ',
      'k',
      'K',
      'K',
      'i',
      'I',
      'İ',
      'ı',
      'Σ',
      'σ',
      'ς',
      'ǅ',
      'Ǆ',
      'ǆ',
      'é',
      'É',
      'ß',
      'ẞ',
      '١',
      '中',
      '\u0301',
      '\u0345',
      '\u00a0',
      '\u2003',
      '\u200b',
      '😊',
      '𐐀',
      '𐐨',
      'éÉ é',
      'ſS',
      'kK',
      'ςΣ',
      'abc',
      '',
      'a\nb',
    ]
    const patterns: [string, number][] = [
      ...[
        's',
        'S',
        'ſ',
        'k',
        'K',
        'K',
        'i',
        'I',
        'İ',
        'ı',
        'Σ',
        'σ',
        'ς',
        'ǅ',
        '[ǅ]',
        '[ǅ-ǅ]',
        '[K-K]',
        '[a-z]',
        '[À-ſ]',
        '[Σ-Ͽ]',
        '[^a-z]',
        '\\u017f',
        '\\U00010400',
        '\\w+',
        '\\W+',
        '\\m.\\M',
        '\\y.\\y',
        '\\Y.',
        '(?i)é',
        '(?c)é',
        '(?=É).',
        '(?<=é).',
      ].map((p): [string, number] => [p, 0]),
      ...[
        'digit',
        'alpha',
        'upper',
        'space',
        'alnum',
        'ascii',
        'blank',
        'cntrl',
        'graph',
        'lower',
        'print',
        'punct',
        'xdigit',
        'word',
      ].flatMap((name): [string, number][] => [
        [`[[:${name}:]]+`, 0],
        [`[^[:${name}:]]+`, 0],
      ]),
      ['(é|É)+', 1],
      ['(ſ)\\1', 1],
      ['(K)\\1', 1],
      ['(ς)\\1', 1],
      ['((é)?)(É*)', 3],
      ['(é|.)+?', 1],
      ['[', 0],
      ['[[:nope:]]', 0],
      ['[z-a]', 0],
      ['\\', 0],
      ['', 0],
      ['^', 0],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations: {
      pattern: string
      subject: string
      insensitive: boolean
      outputs: string[]
      failed: Outcome | undefined
    }[] = []
    const value = (value: string | boolean): Input => ({ kind: 'Value', value })
    for (const [pattern, captures] of patterns)
      for (const subject of subjects)
        for (const insensitive of [false, true]) {
          let outputs: string[] = []
          let failed: Outcome | undefined
          try {
            const flags = insensitive ? 'i' : 'c'
            const row = (
              await pg.query<{
                matched: boolean
                count: number
                spans: string
                captures: string
                allcaptures: string
              }>(
                `WITH n AS MATERIALIZED(SELECT regexp_count($1,$2,1,$3) count) SELECT regexp_like($1,$2,$3) matched,count,
          COALESCE((SELECT string_agg((regexp_instr($1,$2,1,k,0,$3)-1)::text||'-'||(regexp_instr($1,$2,1,k,1,$3)-1)::text||';','' ORDER BY k) FROM generate_series(1,count) k),'') spans,
          CASE WHEN count=0 THEN '' ELSE (SELECT string_agg(CASE WHEN regexp_instr($1,$2,1,1,0,$3,k)=0 THEN '!;' ELSE (regexp_instr($1,$2,1,1,0,$3,k)-1)::text||'-'||(regexp_instr($1,$2,1,1,1,$3,k)-1)::text||';' END,'' ORDER BY k) FROM generate_series(0,$4::int) k) END captures,COALESCE((SELECT string_agg(CASE WHEN regexp_instr($1,$2,1,j,0,$3,k)=0 THEN '!;' ELSE (regexp_instr($1,$2,1,j,0,$3,k)-1)::text||'-'||(regexp_instr($1,$2,1,j,1,$3,k)-1)::text||';' END,'' ORDER BY j,k) FROM generate_series(1,count) j CROSS JOIN generate_series(0,$4::int) k),'') allcaptures FROM n`,
                [subject, pattern, flags, captures],
              )
            ).rows[0]!
            outputs = [
              String(row.matched),
              String(row.matched),
              String(row.count),
              row.spans,
              row.captures,
              row.allcaptures,
            ]
          } catch (e) {
            failed = { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } }
          }
          observations.push({ pattern, subject, insensitive, outputs, failed })
        }
    expect(subjects.every((text) => !text.includes('|'))).toBe(true)
    for (const [pattern] of patterns)
      for (const insensitive of [false, true]) {
        const batch = observations.filter(
          (item) => item.pattern === pattern && item.insensitive === insensitive,
        )
        const picks = [
          batch.find((item) => item.outputs[0] === 'true'),
          batch.find((item) => item.outputs[0] === 'false'),
        ].filter((item) => item !== undefined)
        if (!picks.length) picks.push(batch[0]!)
        for (const item of picks)
          fixtures.push({
            name: names[0]!,
            row: {
              pattern: value(pattern),
              subject: value(item.subject),
              insensitive: value(insensitive),
              expected: value(item.outputs[0] ?? ''),
            },
            expected: item.failed ?? { kind: 'True' },
          })
        for (let mode = 1; mode < names.length; mode++)
          fixtures.push({
            name: names[mode]!,
            row: {
              pattern: value(pattern),
              subject: value(batch.map((item) => item.subject).join('|') + '|'),
              insensitive: value(insensitive),
              expected: value(batch.map((item) => item.outputs[mode] ?? '').join('|') + '|'),
            },
            expected: batch[0]!.failed ?? { kind: 'True' },
          })
      }
    await writeFile(
      root + '/summary.json',
      JSON.stringify(
        {
          classes: profile.ranges.length / 3,
          caseMappings: profile.cases.length / 3,
          checks: names.length,
          fixtures: fixtures.length,
          subjects: subjects.length,
          patterns: patterns.length,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile(root + '/source.json', JSON.stringify(source))
    await runCheckParity(directory, 'regexcharacterprofile', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
