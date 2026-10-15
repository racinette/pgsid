import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('preserves JSON extraction source spans, last duplicate keys, signed indices, nulls, decoding errors and encoding requirements in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-extraction-'))
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(
      'CREATE DOMAIN extract_document AS json;CREATE DOMAIN retained_extract_document AS extract_document',
    )
    await pg.exec(
      `CREATE COLLATION json_ci (provider=icu,locale='und-u-ks-level2',deterministic=false)`,
    )
    expect(
      (
        await pg.query<{ deterministic: boolean; value: string | null }>(
          `SELECT (SELECT collisdeterministic FROM pg_collation WHERE collname='json_ci') deterministic, '{"a":1}'::json->>('A' COLLATE json_ci) value`,
        )
      ).rows[0],
    ).toEqual({ deterministic: false, value: null })
    const expressions: Record<string, string> = {
      field:
        '(document->field_name)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C"',
      field_text:
        '(document->>field_name) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      field_ci:
        '(document->(field_name COLLATE json_ci))::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C"',
      field_ci_text:
        '(document->>(field_name COLLATE json_ci)) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      element:
        '(document->element_index)::text COLLATE "C" IS NOT DISTINCT FROM expected_element_json COLLATE "C"',
      element_text:
        '(document->>element_index) COLLATE "C" IS NOT DISTINCT FROM expected_element_text COLLATE "C"',
      field_call:
        'json_object_field(document,field_name)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C"',
      field_text_call:
        'json_object_field_text(document,field_name) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      element_call:
        'json_array_element(document,element_index)::text COLLATE "C" IS NOT DISTINCT FROM expected_element_json COLLATE "C"',
      element_text_call:
        'json_array_element_text(document,element_index) COLLATE "C" IS NOT DISTINCT FROM expected_element_text COLLATE "C"',
      length: 'json_array_length(document) IS NOT DISTINCT FROM expected_count',
      field_kind:
        'json_typeof(document->field_name) COLLATE "C" IS NOT DISTINCT FROM expected_kind COLLATE "C"',
      missing: '(document->field_name IS NULL)=expected_missing',
      chain:
        '(document->field_name->element_index->>\'name\') COLLATE "C" IS NOT DISTINCT FROM expected_nested COLLATE "C"',
      guarded:
        'CASE WHEN bypass THEN true ELSE (document->>field_name) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END',
    }
    const columns =
      'document retained_extract_document,field_name text,element_index integer,expected_json text,expected_text text,expected_element_json text,expected_element_text text,expected_kind text,expected_count integer,expected_missing boolean,expected_nested text,bypass boolean'
    await pg.exec(
      `CREATE TABLE json_extractions(${columns},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'json_extractions')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const preparedExpressions = constraints.map((c) => ({
      expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: c.name,
      },
    }))
    for (const [index, item] of preparedExpressions.entries())
      expect(hasUncertain(item.expression), constraints[index]!.name).toBe(false)
    const group = prepareCheckRustGroup(preparedExpressions)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    const query = async (
      sql: string,
      source: string | null,
      key: string | null,
      index: number | null,
    ): Promise<{ value: string | number | boolean | null; error?: string }> => {
      try {
        return {
          value: (
            await pg.query<{ value: string | number | boolean | null }>(
              `SELECT ${sql} value FROM (SELECT $1::json document,$2::text field_name,$3::integer element_index) q`,
              [source, key, index],
            )
          ).rows[0]!.value as string | number | boolean | null,
        }
      } catch (e) {
        const state = (e as { code: string }).code
        expect(['22P02', '22P05', '22023']).toContain(state)
        return { value: null, error: state }
      }
    }
    const sources = [
      null,
      'null',
      'true',
      '123.00',
      '"raw 雪😊"',
      '{}',
      '[]',
      '{"a":null}',
      '{"a":""}',
      '{"a":"line\\n\\t\\b\\f\\r\\/\\\\\\\""}',
      '{"a":"\\u0061\\u007f"}',
      '{"a":9007199254740993.00}',
      '{"a":1e2147483647}',
      '{"a":1,"a":2}',
      '{"a":1,"a":null}',
      '{"a":1,"\\u0061":2}',
      '{"\\u0061":1,"a":2}',
      ' {"a": [1,  2] } ',
      '{"a":[{"name":"first"},{"name":"last"}]}',
      '[ 1,  2, null, "x", {"a":1} ]',
      '{"a":1,"bad":"\\u0000"}',
      '{"a":1,"bad":"\\ud800"}',
      '{"a":1,"bad":"\\udc00"}',
      '{"a":1,"bad":"\\ud800x"}',
      '{"a":1,"bad":"\\ud800\\u0061"}',
      '{"a":1,"bad":"\\ud800\\ud800"}',
      '{"a":1,"bad":"\\ud800\\u00e9"}',
      '{"a":1,"bad":"\\u0000\\u00e9"}',
      '["\\u0000"]',
      '["\\ud800"]',
    ]
    const cases = sources.map((source) => ({
      source,
      key: 'a' as string | null,
      index: 0 as number | null,
      context: false,
    }))
    for (const key of ['', '雪', 'A', 'missing', null])
      cases.push({ source: '{"":0,"雪":"😊","a":1}', key, index: 0, context: false })
    for (const index of [-2147483648, -10, -5, -4, -1, 0, 1, 2, 3, 4, 5, 2147483647, null])
      cases.push({ source: '[ 1, null, "x", {"name":"last"} ]', key: 'a', index, context: false })
    for (const source of [
      '{"a":1,"bad":"\\u00e9"}',
      '{"a":1,"bad":"\\ud83d\\ude00"}',
      '{"a":1,"bad":"\\u00e9\\ud800"}',
      '["\\u00e9","\\u0000"]',
    ])
      cases.push({ source, key: 'a', index: 0, context: true })
    let baseline: Row | undefined
    for (const { source, key, index, context } of cases) {
      const values = await Promise.all([
        query('(document->field_name)::text', source, key, index),
        query('document->>field_name', source, key, index),
        query('(document->element_index)::text', source, key, index),
        query('document->>element_index', source, key, index),
        query('json_array_length(document)', source, key, index),
        query('json_typeof(document->field_name)', source, key, index),
        query('(document->field_name IS NULL)', source, key, index),
        query("document->field_name->element_index->>'name'", source, key, index),
      ])
      const [field, text, element, elementText, length, kind, missing, chain] = values
      const row: Row = {
        document: known(source),
        field_name: known(key),
        element_index: known(index),
        expected_json: known(field!.value),
        expected_text: known(text!.value),
        expected_element_json: known(element!.value),
        expected_element_text: known(elementText!.value),
        expected_count: known(length!.value),
        expected_kind: known(kind!.value),
        expected_missing: known(missing!.value),
        expected_nested: known(chain!.value),
        bypass: known(false),
      }
      const outputs: Record<string, typeof field> = {
        field,
        field_ci: field,
        field_call: field,
        field_text: text,
        field_ci_text: text,
        field_text_call: text,
        element,
        element_call: element,
        element_text: elementText,
        element_text_call: elementText,
        length,
        field_kind: kind,
        missing,
        chain,
        guarded: text,
      }
      for (const [name, value] of Object.entries(outputs))
        add(
          name,
          row,
          context && name !== 'length'
            ? { kind: 'Unknown' }
            : value!.error
              ? error(value!.error)
              : { kind: 'True' },
        )
      add('guarded', { ...row, bypass: known(true) }, { kind: 'True' })
      if (source === '{"a":1,"a":2}') baseline = row
    }
    const base = baseline!
    add('field', { ...base, expected_json: known('1') }, { kind: 'False' })
    add('field_text', { ...base, expected_text: known('wrong') }, { kind: 'False' })
    for (const document of [{ kind: 'Unknown' } as const, error('22003'), known('[1,]')]) {
      const expected: Outcome = document.kind === 'Error' ? document : { kind: 'Unknown' }
      for (const name of Object.keys(expressions)) add(name, { ...base, document }, expected)
      add('guarded', { ...base, document, bypass: known(true) }, { kind: 'True' })
    }
    for (const field_name of [{ kind: 'Unknown' } as const, error('22012')]) {
      const expected: Outcome = field_name.kind === 'Error' ? field_name : { kind: 'Unknown' }
      for (const name of ['field', 'field_text', 'missing'])
        add(name, { ...base, field_name }, expected)
    }
    for (const element_index of [{ kind: 'Unknown' } as const, error('22012')]) {
      const expected: Outcome = element_index.kind === 'Error' ? element_index : { kind: 'Unknown' }
      for (const name of ['element', 'element_text'])
        add(name, { ...base, element_index }, expected)
    }
    add('field', { ...base, document: error('22003'), field_name: error('22012') }, error('22003'))
    add('field', { ...base, document: known(null), field_name: error('22012') }, error('22012'))
    add(
      'field',
      { ...base, document: { kind: 'Unknown' }, field_name: known(null) },
      { kind: 'Unknown' },
    )
    add(
      'field',
      {
        ...base,
        document: known('{"bad":"\\u0000"}'),
        field_name: known(null),
        expected_json: known(null),
      },
      { kind: 'True' },
    )
    add(
      'element',
      {
        ...base,
        document: known('["\\u0000"]'),
        element_index: known(null),
        expected_element_json: known(null),
      },
      { kind: 'True' },
    )
    await mkdir('artifacts/json-extraction', { recursive: true })
    await writeFile('artifacts/json-extraction/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      'artifacts/json-extraction/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'json_extractions',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
