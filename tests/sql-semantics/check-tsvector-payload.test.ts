import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { internalCheckRows } from '../support/check-entries.js'
import { parseConfigString } from '../../src/config/loader.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('validates SQL-coerced tsvector payloads, domains and optional stored size through native, Rust and public Go and TypeScript validators', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-payload-')),
    packet = 'artifacts/goal-checks/tsvector-operations-active',
    run = promisify(execFile)
  const context = { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' } as const
  const definitions: Record<string, string> = {
    same: 'item=reference',
    less: 'item<reference',
    greater: 'item>reference',
    length: 'length(item)<=2',
    presence: 'item IS NULL',
    selected: '(CASE WHEN choose_first THEN item ELSE reference END)=reference',
    coalesced: 'COALESCE(NULL::tsvector,item,reference)=reference',
    distinctness: 'item IS DISTINCT FROM reference',
    nulled: 'NULLIF(item,reference) IS NULL',
    domain_value: '(item::nested_vector)=reference',
    stripped: 'strip(item)=strip(reference)',
    weighted: "setweight(item,'B')::text=setweight(reference,'B')::text",
    concatenated: '(item||reference)::text IS NOT DISTINCT FROM (reference||item)::text',
    selective:
      "setweight(item,'B',ARRAY['a',NULL])::text=setweight(reference,'B',ARRAY['a',NULL])::text",
    deleted: "ts_delete(item,ARRAY['a'])::text=ts_delete(reference,ARRAY['a'])::text",
    scalar_deleted: "ts_delete(item,'a')::text=ts_delete(reference,'a')::text",
    filtered: `ts_filter(item,ARRAY['A','C']::"char"[])::text=ts_filter(reference,ARRAY['A','C']::"char"[])::text`,
    wire: 'tsvectorsend(item)=tsvectorsend(reference)',
    rendered: 'item::text=reference::text',
    lexemes: 'cardinality(tsvector_to_array(item))<=2',
    lazy: 'CASE WHEN bypass THEN true ELSE item=reference END',
    null_literal: 'NULL::tsvector IS NULL',
  }
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      'CREATE DOMAIN imported_vector AS tsvector;CREATE DOMAIN nested_vector AS imported_vector',
    )

    await pg.exec('CREATE TABLE vector_binary_inputs(key text,value tsvector)')
    const binary = [
      {
        key: '__binary_duplicate',
        lexemes: [
          { text: 'a', positions: [0xc001] },
          { text: 'a', positions: [0x8002] },
        ],
      },
      {
        key: '__binary_zero',
        lexemes: [
          { text: 'a', positions: [0] },
          { text: 'b', positions: [0xc000, 2] },
        ],
      },
      { key: '__binary_wide', lexemes: [{ text: 'a'.repeat(2047), positions: [] }] },
    ]
    for (const sample of binary) {
      const count = Buffer.alloc(4)
      count.writeInt32BE(sample.lexemes.length)
      const payload = Buffer.concat([
        count,
        ...sample.lexemes.flatMap((l) => {
          const positions = Buffer.alloc(2 + 2 * l.positions.length)
          positions.writeUInt16BE(l.positions.length)
          l.positions.forEach((p, i) => positions.writeUInt16BE(p, 2 + 2 * i))
          return [Buffer.from(l.text), Buffer.from([0]), positions]
        }),
      ])
      const header = Buffer.alloc(19),
        tuple = Buffer.alloc(10)
      Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
      tuple.writeInt16BE(2)
      tuple.writeInt32BE(Buffer.byteLength(sample.key), 2)
      const width = Buffer.alloc(4)
      width.writeInt32BE(payload.length)
      await pg.exec("COPY vector_binary_inputs FROM '/dev/blob' (FORMAT binary)", {
        blob: new Blob([
          new Uint8Array(
            Buffer.concat([
              header,
              tuple.subarray(0, 6),
              Buffer.from(sample.key),
              width,
              payload,
              Buffer.from('ffff', 'hex'),
            ]),
          ),
        ]),
      })
    }
    await pg.exec(
      "INSERT INTO vector_binary_inputs SELECT '__concat_zero',value||value FROM vector_binary_inputs WHERE key='__binary_zero'",
    )
    const vectorSql = (parameter: string) =>
      `CASE WHEN ${parameter}::text IN ('__binary_duplicate','__binary_zero','__binary_wide','__concat_zero') THEN (SELECT value FROM vector_binary_inputs WHERE key=${parameter}::text) ELSE ${parameter}::tsvector END`
    const columns = 'item nested_vector,reference tsvector,choose_first bool,bypass bool'
    await pg.exec(
      `CREATE TABLE vector_rows(${columns},${Object.entries(definitions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(`CREATE TABLE payload_${name}(${columns},CONSTRAINT rule CHECK(${sql}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'vector_rows')!
    const checks = Object.entries(definitions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return (['raw', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'raw' ? { ...c, definition: `CHECK(${sql})` } : c,
            [],
            catalog.domains,
            origin === 'raw' ? 'source' : 'stored',
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      publicCases: { row: Row; expected: Record<string, Outcome> }[] = []
    const payloads = new Map<string, Input>()
    const capture = async (text: string | null): Promise<Input> => {
      if (text === null) return known(null)
      const cached = payloads.get(text)
      if (cached) return cached
      const rows = (
        await pg.query<{ lexeme: string; positions: number[] | null; weights: string[] | null }>(
          `SELECT * FROM unnest(${vectorSql('$1')})`,
          [text],
        )
      ).rows
      const nativeBytes = (
        await pg.query<{ bytes: number }>(
          `SELECT pg_column_size(setweight(${vectorSql('$1')},'D',ARRAY[]::text[])) bytes`,
          [text],
        )
      ).rows[0]!.bytes
      const result = known({
        lexemes: rows.map((l) => ({
          text: l.lexeme,
          positions: (l.positions ?? []).map((position, i) => ({
            position,
            weight: 3 - 'ABCD'.indexOf(l.weights![i]!),
          })),
        })),
        nativeBytes,
      })
      payloads.set(text, result)
      return result
    }
    let inserts = 0,
      rejections = 0
    const samples = [
      null,
      '',
      'a',
      'b:2C a:1A',
      'a:1,3B z:2',
      '😀:2 é:1',
      "'it''s':1A",
      ...binary.map((v) => v.key),
      '__concat_zero',
    ]
    for (let i = 0; i < samples.length; i++)
      for (let variant = 0; variant < 4; variant++) {
        const source = samples[i]!,
          reference = variant === 0 ? source : variant === 1 ? null : 'a:1',
          choose = variant % 2 === 0,
          bypass = variant === 3
        const values = [source, reference, choose, bypass],
          query = `SELECT (${vectorSql('$1')})::nested_vector item,${vectorSql('$2')} reference,$3::bool choose_first,$4::bool bypass`
        const native = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${Object.entries(definitions)
              .map(([name, sql]) => `(${sql}) AS ${name}`)
              .join(',')} FROM (${query}) input`,
            values,
          )
        ).rows[0]!
        const row: Row = {
            item: await capture(source),
            reference: await capture(reference),
            choose_first: known(choose),
            bypass: known(bypass),
          },
          expected: Record<string, Outcome> = {}
        for (const [name, value] of Object.entries(native)) {
          expected[name] = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO payload_${name} ${query}`, values)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(value === false ? '23514' : undefined)
          inserts++
          if (failure) rejections++
          for (const origin of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
        }
        publicCases.push({ row, expected })
      }
    const base = publicCases[12]!.row
    for (const item of [
      { kind: 'Unknown' } as Input,
      { kind: 'Error', value: { state: parseInt('22003', 36) } } as Input,
    ]) {
      const row = { ...base, item },
        expected: Record<string, Outcome> = {}
      for (const name of Object.keys(definitions)) {
        expected[name] =
          name === 'null_literal'
            ? { kind: 'True' }
            : item.kind === 'Error'
              ? item
              : { kind: 'Unknown' }
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
      }
      publicCases.push({ row, expected })
    }
    const complete = base.item!
    if (
      complete.kind !== 'Value' ||
      typeof complete.value !== 'object' ||
      !('lexemes' in complete.value)
    )
      throw new Error('Missing owned vector witness')
    const row = { ...base, item: known({ ...complete.value, nativeBytes: -1 }) },
      expected = { ...publicCases[12]!.expected }
    for (const name of [
      'same',
      'less',
      'greater',
      'selected',
      'coalesced',
      'distinctness',
      'nulled',
      'domain_value',
      'lazy',
    ])
      // Binary input lays lexemes out in arrival order, so a value's stored size can differ from
      // its canonical layout; ordering one whose size the caller did not supply waits on the caller.
      expected[name] = { kind: 'Unknown' }
    for (const name of Object.keys(definitions))
      for (const origin of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
    publicCases.push({ row, expected })
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'payload-reference.json'),
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejections,
          fixtures: fixtures.length,
          publicRows: publicCases.length,
        },
        null,
        2,
      ) + '\n',
    )
    await mkdir(join(root, 'parity'))
    await runCheckParity(
      join(root, 'parity'),
      'tsvectorpayload',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    const tsBundle = renderTypescriptSchemaCheckArtifacts(
        [table],
        catalog.domains,
        catalog.domains,
        { executionContext: context },
      ),
      tsRoot = join(root, 'public-ts')
    await mkdir(tsRoot)
    await writeFile(join(tsRoot, 'package.json'), '{"type":"module"}')
    await writeFile(join(tsRoot, 'checks.ts'), tsBundle.checks)
    for (const artifact of checkTypescriptArtifacts(tsBundle.rustFiles!)) {
      const path = join(tsRoot, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node', [
      'node_modules/typescript/bin/tsc',
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(tsRoot, 'js'),
      join(tsRoot, 'checks.ts'),
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr)
    })
    const api = await import(pathToFileURL(join(tsRoot, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(tsRoot, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(tsBundle.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (row: Record<string, unknown>): Record<string, Result> =>
      Object.fromEntries(
        api
          .evaluatePublicVectorRowsChecks(row)
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    // Each constraint evaluated by the server over the same parameters; a parameter a check does
    // not read cannot fail it.
    const server = async (row: Record<string, unknown>) => {
      const results: Record<string, Result> = {}
      for (const [name, sql] of Object.entries(definitions)) {
        const reads = (column: string) => new RegExp(`\\b${column}\\b`, 'u').test(sql)
        try {
          const { rows } = await pg.query<{ value: boolean | null }>(
            `SELECT (${sql}) AS value FROM (SELECT $1::nested_vector item,$2::tsvector reference,$3::bool choose_first,$4::bool bypass) input`,
            ['item', 'reference', 'choose_first', 'bypass'].map((column) =>
              reads(column) ? row[column] : null,
            ),
          )
          results[name] = { certain: true, value: rows[0]!.value }
        } catch (error) {
          results[name] = { certain: true, error: (error as { code: string }).code }
        }
      }
      return results
    }
    // A tsvector's public value is its text, which the server reads through the tsvector input.
    // Values only binary input can store reach the public API as the text the server prints for
    // them.
    const spelled = async (sample: string | null) =>
      sample === null
        ? null
        : binary.some((v) => v.key === sample) || sample === '__concat_zero'
          ? (
              await pg.query<{ text: string }>(
                'SELECT value::text AS text FROM vector_binary_inputs WHERE key=$1',
                [sample],
              )
            ).rows[0]!.text
          : sample
    // Stored values whose printed text the input rejects (a zero position, an overlong word) reach
    // the public API only as that text.
    const readable = async (text: string | null) =>
      text === null ||
      (await pg.query('SELECT $1::tsvector', [text]).then(
        () => true,
        () => false,
      ))
    const publicRows: Record<string, unknown>[] = [],
      storedOnly: string[] = []
    for (let i = 0; i < samples.length; i++) {
      const source = await spelled(samples[i]!)
      if (!(await readable(source))) {
        storedOnly.push(source!)
        continue
      }
      for (let variant = 0; variant < 4; variant++) {
        const reference = variant === 0 ? source : variant === 1 ? null : 'a:1'
        publicRows.push({
          item: source,
          reference,
          choose_first: variant % 2 === 0,
          bypass: variant === 3,
        })
      }
    }
    expect(storedOnly).toHaveLength(3)
    for (const row of publicRows)
      expect({ row, results: evaluate(row) }).toEqual({ row, results: await server(row) })
    const publicBase = publicRows[12]!
    expect(publicBase.item).toBe('b:2C a:1A')
    expect(evaluate({ ...publicBase, item: undefined })).toEqual(
      Object.fromEntries(
        Object.keys(definitions).map((name) => [
          name,
          name === 'null_literal' ? { certain: true, value: true } : { certain: false },
        ]),
      ),
    )
    // Text the tsvector input rejects fails every check that reads it.
    for (const item of [
      'a:1',
      "'unterminated",
      'a:0',
      'a:1Z',
      'a:16384',
      "a:1 'b' :2",
      '\\',
      ...storedOnly,
    ])
      expect({ item, results: evaluate({ ...publicBase, item }) }).toEqual({
        item,
        results: await server({ ...publicBase, item }),
      })
    const good = complete.value
    for (const bad of [
      3,
      {},
      { kind: 'Unknown' },
      { kind: 'Null' },
      { kind: 'Value', value: null },
      complete,
      ...[NaN, 1.5, '8', -2, 1073741824].map((nativeBytes) => ({
        kind: 'Value',
        value: { ...good, nativeBytes },
      })),
      { kind: 'Value', value: { ...good, lexemes: [{ text: '\ud800', positions: [] }] } },
      { kind: 'Value', value: { ...good, lexemes: [{ text: 'a\0', positions: [] }] } },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: -1, weight: 3 }] }] },
      },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: 1, weight: 4 }] }] },
      },
      {
        kind: 'Value',
        value: { ...good, lexemes: [{ text: 'a', positions: [{ position: 1.5, weight: 3 }] }] },
      },
      {
        kind: 'Value',
        value: {
          ...good,
          lexemes: [
            { text: 'z', positions: [] },
            { text: 'a', positions: [] },
          ],
        },
      },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Error', value: { state: 1.5 } },
      '\ud800',
      'a\0',
    ])
      expect(
        () => evaluate({ ...publicBase, item: bad }),
        JSON.stringify(bad, (_key, item) => (typeof item === 'bigint' ? String(item) : item)),
      ).toThrow(TypeError)
    // Unknown and failed items handed to the evaluator directly.
    const stored = (input: Input) =>
      input.kind === 'Value' && typeof input.value === 'object'
        ? runtime.makeTsvectorValue(input.value)
        : input
    const internalBase = {
      item: stored(base.item!),
      reference: stored(base.reference!),
      choose_first: runtime.makeBoolValue(true),
      bypass: runtime.makeBoolValue(false),
    }
    expect(internal('public.vector_rows', internalBase)).toEqual(
      Object.fromEntries(
        Object.entries(publicCases[12]!.expected).map(([name, outcome]) => [name, outcome]),
      ),
    )
    for (const item of [
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    ])
      expect(internal('public.vector_rows', { ...internalBase, item })).toEqual(
        Object.fromEntries(
          Object.keys(definitions).map((name) => [
            name,
            name === 'null_literal' ? { kind: 'True' } : item,
          ]),
        ),
      )
    // Every stored value of the matrix, including those only binary input stores and those whose
    // stored size the caller did not supply, decides through the entries as the server did.
    for (const c of publicCases)
      expect(
        internal(
          'public.vector_rows',
          Object.fromEntries(Object.entries(c.row).map(([name, input]) => [name, stored(input)])),
        ),
      ).toEqual(c.expected)
    const goRoot = join(root, 'public-go'),
      goBundle = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString(
          'schema: schema.sql\nsql:\n  codegen:\n    go: {}\n    checks:\n      serverEncoding: UTF8\n      clientEncoding: UTF8\n      defaultCollation: C\n',
        ),
        undefined,
        'tsvector-public',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module tsvector-public\n\ngo 1.25\n')
    await writeFile(join(goRoot, 'checks.go'), goBundle.checks)
    for (const [name, source] of Object.entries(goBundle.rustFiles!)) {
      if (!source) continue
      const path = join(
        goRoot,
        'checkrust',
        name === 'checks'
          ? 'checks.go'
          : name === 'runtime'
            ? 'checkruntime/runtime.go'
            : name === 'language'
              ? 'langruntime/runtime.go'
              : name === 'regex'
                ? 'regexengine/regex.go'
                : 'pg_catalog/operations.go',
      )
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, source)
    }
    const goInput = (name: string, input: Input): string => {
      const vector = name === 'item' || name === 'reference',
        type = vector ? 'checkruntime.TsvectorValue' : '*bool'
      if (input.kind === 'Null') return `NullCheckValue[${type}]()`
      if (input.kind === 'Unknown') return `CheckOptional[${type}] {}`
      if (input.kind === 'Error')
        return `KnownCheckValue(checkruntime.TsvectorValue{Kind:checkruntime.TsvectorValueError,Error:checkruntime.SqlError{State:${input.value.state}}})`

      if (typeof input.value === 'object' && 'lexemes' in input.value) {
        const v = input.value
        const lexemes = v.lexemes
          .map((l) => {
            const positions = l.positions
              .map((p) => '{Position:' + p.position + ',Weight:' + p.weight + '}')
              .join(',')
            return (
              '{Text:' +
              JSON.stringify(l.text) +
              ',Positions:[]checkruntime.TsvectorPosition{' +
              positions +
              '}}'
            )
          })
          .join(',')
        return (
          'KnownCheckValue(checkruntime.MakeTsvectorValue(checkruntime.TsvectorPayload{NativeBytes:' +
          v.nativeBytes +
          ',Lexemes:[]checkruntime.TsvectorLexeme{' +
          lexemes +
          '}}))'
        )
      }
      return `KnownCheckValue(ptr(${type.slice(1)}(${input.value})))`
    }
    const goRows = publicCases.map(
      (c) =>
        'PublicVectorRowsCheckInput{' +
        Object.entries(c.row)
          .map(
            ([name, input]) =>
              name
                .split('_')
                .map((p) => p[0]!.toUpperCase() + p.slice(1))
                .join('') +
              ':' +
              goInput(name, input),
          )
          .join(',') +
        '}',
    )
    const assertions = publicCases.flatMap((c, i) =>
      Object.entries(c.expected).map(
        ([name, outcome]) =>
          `if r:=results[${i}][${JSON.stringify(name)}]; ${outcome.kind === 'Unknown' ? 'r.Certain || r.Unimplemented' : outcome.kind === 'Unimplemented' ? 'r.Certain || !r.Unimplemented' : outcome.kind === 'Error' ? `!r.Certain || r.Value.Error != "${outcome.value.state.toString(36).toUpperCase()}"` : outcome.kind === 'Null' ? '!r.Certain || r.Value.Valid' : `!r.Certain || !r.Value.Valid || r.Value.Value != ${outcome.kind === 'True'}`} {t.Fatalf("${i} ${name}: %+v",r)}`,
      ),
    )
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";checkruntime "tsvector-public/checkrust/checkruntime")
func ptr[T any](value T)*T{return &value}
func TestPayloads(t *testing.T){rows:=[]PublicVectorRowsCheckInput{${goRows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{values:=map[string]EvalBool{};for _,check:=range func() []CheckEvaluation {r, e := EvaluatePublicVectorRowsChecks(row); if e != nil {panic(e)}; return r}(){values[check.Constraint]=check.Result};results=append(results,values)}
${assertions.join('\n')}

base:=rows[12];for _,v:=range []checkruntime.TsvectorValue{
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:-2}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:1073741824}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:string([]byte{255})}}}},
 {Kind:checkruntime.TsvectorValueValue,Value:checkruntime.TsvectorPayload{NativeBytes:13,Lexemes:[]checkruntime.TsvectorLexeme{{Text:"a",Positions:[]checkruntime.TsvectorPosition{{Position:-1,Weight:3}}}}}},
 {Kind:checkruntime.TsvectorValueKind(99)},
}{base.Item=KnownCheckValue(v);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicVectorRowsChecks(base); if e != nil {return nil}; return r}(){if (c.Constraint=="same"||c.Constraint=="presence")&&c.Result.Certain{t.Fatal("malformed vector became certain",c)}}}

}`,
    )
    await writeFile(
      join(packet, 'public-go-test.go'),
      await readFile(join(goRoot, 'checks_test.go'), 'utf8'),
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    console.log(
      `tsvector payloads: ${inserts} native INSERTs, ${fixtures.length} parity fixtures and ${publicCases.length} public rows per target`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
