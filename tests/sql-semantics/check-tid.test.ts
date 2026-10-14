import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { tidInputForms, deferredTidPlatformForms } from './check-tid-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const spelling = (value: bigint | null): string | null =>
  value === null ? null : `(${value / 65536n},${value % 65536n})`
const portableHash = (value: bigint): boolean =>
  value % 65536n === 0n && value / 4294967296n === (value / 65536n) % 65536n
const wire = (sql: string, type: string): string => {
  if (type === 'pg_catalog.bytea') return sql
  const send = (
    {
      'pg_catalog.tid': 'tidsend',
      'pg_catalog.int4': 'int4send',
      'pg_catalog.int8': 'int8send',
      'pg_catalog.bool': 'boolsend',
    } as Record<string, string>
  )[type]
  if (!send) throw new Error(type)
  return `${send}(${sql})`
}
describe('portable heap tuple identifiers', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-tid-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches portable catalog functions and aliases, packed boundaries, composition and native-layout hash deferrals in every target', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/tid_core.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(12)
    const calls = new Map<string, { sql: string; type: string; args: string[]; hash: boolean }>()
    for (const fn of functions) {
      let ordinal = 0
      const args = fn.args.map((type) =>
        type === 'pg_catalog.tid' ? ['a', 'b'][ordinal++]! : 'seed',
      )
      calls.set(fn.rustName, {
        sql: `pg_catalog.${fn.name}(${args.join(',')})`,
        type: fn.result,
        args,
        hash: fn.name.startsWith('hashtid'),
      })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [i, op] of builtinCallables()
      .filter((fn) => fn.kind === 'operator' && identities.has(fn.implementation))
      .entries()) {
      if (op.kind !== 'operator') continue
      const fn = functions.find((fn) => callableIdentity(fn) === op.implementation)!,
        base = calls.get(fn.rustName)!
      calls.set('operator_' + i, {
        ...base,
        sql: `${base.args[0]} OPERATOR(pg_catalog.${op.name}) ${base.args[1]}`,
      })
    }
    const expressions = Object.fromEntries(
      [...calls].map(([name, call]) => [name, `${wire(call.sql, call.type)}=expected`]),
    )
    Object.assign(expressions, {
      selected: 'tidsend(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'tidsend(COALESCE(a,b))=expected',
      greatest: 'tidsend(GREATEST(a,b))=expected',
      least: 'tidsend(LEAST(a,b))=expected',
      nullif: 'tidsend(NULLIF(a,b))=expected',
      output: 'a::text=expected_text',
      literal:
        "tidsend('garbage(4294967295,65535)trailing'::nested_pointer)='\\xffffffffffff'::bytea",
      typed_null: 'NULL::tid IS NULL',
      lazy: 'CASE WHEN skip THEN true ELSE tidsend(source::tid)=expected END',
    })
    await pg.exec(
      `CREATE DOMAIN heap_pointer AS tid;CREATE DOMAIN nested_pointer AS heap_pointer;CREATE TABLE heap_pointers(a nested_pointer,b tid,seed bigint,expected bytea,expected_text text,source text,skip boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'heap_pointers')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      })),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name).toBe('supported')
    const values = [
      0n,
      1n,
      65535n,
      65536n,
      65537n,
      4295032832n,
      140737488355328n,
      281474976645120n,
      281474976710655n,
      null,
    ]
    const seeds = [0n, -1n, -9223372036854775808n, 9223372036854775807n, null]
    const base: Row = {
      a: known(1n),
      b: known(2n),
      seed: known(0n),
      expected: known('00'),
      expected_text: known('(0,1)'),
      source: known('bad'),
      skip: known(true),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const [name, call] of calls) {
      for (const a of values)
        for (const b of call.args.includes('b') ? values : [2n])
          for (const seed of call.args.includes('seed') ? seeds : [0n]) {
            const row: Row = { ...base, a: known(a), b: known(b), seed: known(seed) }
            const answer = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${wire(call.sql, call.type)},'hex') wire FROM (SELECT $1::tid a,$2::tid b,$3::bigint seed) inputs`,
                [spelling(a), spelling(b), seed?.toString() ?? null],
              )
            ).rows[0]!.wire
            row.expected = known(answer ?? '00')
            if (
              call.hash &&
              a !== null &&
              (!call.args.includes('seed') || seed !== null) &&
              !portableHash(a)
            ) {
              add(name, row, { kind: 'Unknown' })
              continue
            }
            add(name, row, { kind: answer === null ? 'Null' : 'True' })
            if (answer !== null)
              add(
                name,
                { ...row, expected: known(answer === '00' ? '01' : '00') },
                { kind: 'False' },
              )
          }
      for (const input of new Set(call.args)) {
        add(name, { ...base, [input]: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(name, { ...base, [input]: error('22012') }, error('22012'))
      }
    }
    for (const name of ['selected', 'coalesced', 'greatest', 'least']) {
      add(
        name,
        { ...base, expected: known(name === 'greatest' ? '000000000002' : '000000000001') },
        { kind: 'True' },
      )
      add(name, base, { kind: 'False' })
    }
    add('nullif', { ...base, b: known(1n) }, { kind: 'Null' })
    add('nullif', { ...base, expected: known('000000000001') }, { kind: 'True' })
    for (const a of values) {
      const text = (
        await pg.query<{ text: string | null }>('SELECT $1::tid::text text', [spelling(a)])
      ).rows[0]!.text
      add(
        'output',
        { ...base, a: known(a), expected_text: known(text ?? '') },
        { kind: a === null ? 'Null' : 'True' },
      )
    }
    for (const name of ['literal', 'typed_null', 'lazy']) add(name, base, { kind: 'True' })
    add('lazy', { ...base, skip: known(false) }, error('22P02'))
    const target = join(directory, 'core')
    await mkdir(target)
    await runCheckParity(
      target,
      'tid_core',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  }, 600_000)
  it('matches permissive legacy syntax and rejects definite errors while deferring native unsigned-long input', async () => {
    await pg.exec(
      'CREATE TABLE pointer_inputs(source text,expected bytea,CONSTRAINT parsed CHECK(tidsend(source::tid)=expected))',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'pointer_inputs')!,
      c = table.constraints[0]!
    const group = prepareCheckRustGroup([
      {
        expression: lowerTableCheck(table, c)!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: c.name },
      },
    ])
    expect(group.checks[0]!.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const text of tidInputForms) {
      try {
        const answer = (
          await pg.query<{ wire: string }>("SELECT encode(tidsend($1::tid),'hex') wire", [text])
        ).rows[0]!.wire
        fixtures.push({
          name: c.name,
          row: { source: known(text), expected: known(answer) },
          expected: { kind: 'True' },
        })
      } catch (e) {
        fixtures.push({
          name: c.name,
          row: { source: known(text), expected: known('00') },
          expected: error((e as { code: string }).code),
        })
      }
    }
    for (const text of [...deferredTidPlatformForms, '9'.repeat(4097)])
      fixtures.push({
        name: c.name,
        row: { source: known(text), expected: known('00') },
        expected: { kind: 'Unknown' },
      })
    for (const [source, expected] of [
      [known(null), { kind: 'Null' }],
      [{ kind: 'Unknown' }, { kind: 'Unknown' }],
      [error('22012'), error('22012')],
    ] as [Input, Outcome][])
      fixtures.push({ name: c.name, row: { source, expected: known('00') }, expected })
    const target = join(directory, 'input')
    await mkdir(target)
    await runCheckParity(target, 'tid_input', group, [c.name], fixtures)
  }, 600_000)
  it('defers latest tuple lookup while supplied pointer operations remain definite across a heap update', async () => {
    await pg.exec(
      "CREATE TABLE pointer_versions(id integer PRIMARY KEY, payload text);INSERT INTO pointer_versions VALUES(1,'before')",
    )
    const first = (
      await pg.query<{ pointer: string; wire: string }>(
        "SELECT ctid::text pointer,encode(tidsend(ctid),'hex') wire FROM pointer_versions WHERE id=1",
      )
    ).rows[0]!
    const before = (
      await pg.query<{ pointer: string }>(
        "SELECT currtid2('pointer_versions',$1::tid)::text pointer",
        [first.pointer],
      )
    ).rows[0]!.pointer
    await pg.exec("UPDATE pointer_versions SET payload='after' WHERE id=1")
    const after = (
      await pg.query<{ pointer: string }>(
        "SELECT currtid2('pointer_versions',$1::tid)::text pointer",
        [first.pointer],
      )
    ).rows[0]!.pointer
    expect(before).toBe(first.pointer)
    expect(after).not.toBe(before)
    await pg.exec(
      "CREATE TABLE pointer_context(pointer tid,reference tid,expected bytea,CONSTRAINT latest CHECK(currtid2('pointer_versions',pointer)=reference),CONSTRAINT stored CHECK(tidsend(pointer)=expected))",
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'pointer_context')!
    const checks = table.constraints.map((c) => ({
      expression: lowerTableCheck(table, c)!.expression,
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: c.name },
    }))
    const context = prepareCheckRustGroup(checks)
    expect(hasUncertain(checks.find((c) => c.identity.constraint === 'latest')!.expression)).toBe(
      true,
    )
    expect(context.checks[checks.findIndex((c) => c.identity.constraint === 'latest')]!.kind).toBe(
      'supported',
    )
    expect(context.checks[checks.findIndex((c) => c.identity.constraint === 'stored')]!.kind).toBe(
      'supported',
    )
    const packed = BigInt('0x' + first.wire),
      target = join(directory, 'context')
    await mkdir(target)
    const row: Row = {
      pointer: known(packed),
      reference: known(packed),
      expected: known(first.wire),
    }
    await runCheckParity(
      target,
      'tid_context',
      context,
      checks.map((c) => c.identity.constraint),
      [
        { name: 'stored', row, expected: { kind: 'True' } },
        { name: 'latest', row, expected: { kind: 'Unknown' } },
      ],
    )
    const bundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains),
      api = join(directory, 'context-public')
    await mkdir(api)
    await writeFile(join(api, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(api, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(api, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(api, 'js'),
      join(api, 'checks.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(api, 'js/checks.js')).href)
    const results = Object.fromEntries(
      generated
        .evaluatePublicPointerContextChecks({
          pointer: { kind: 'Value', value: packed },
          reference: { kind: 'Value', value: packed },
          expected: Buffer.from(first.wire, 'hex'),
        })
        .map((row: { constraint: string; result: unknown }) => [row.constraint, row.result]),
    )
    expect(results).toEqual({ latest: { certain: false }, stored: { certain: true, value: true } })
  }, 600_000)
  it('witnesses native-layout hash differences while retaining endian-independent inputs', async () => {
    const rotate = (value: number, bits: number) =>
      ((value << bits) | (value >>> (32 - bits))) >>> 0
    const reference = (packed: bigint, seed: bigint, bigEndian: boolean) => {
      let a = 2654435769 + 6 + 3923095,
        b = a,
        c = a
      if (seed !== 0n) {
        const bits = BigInt.asUintN(64, seed)
        a = (a + Number(bits >> 32n)) >>> 0
        b = (b + Number(bits & 0xffffffffn)) >>> 0
        a = (a - c) >>> 0
        a = (a ^ rotate(c, 4)) >>> 0
        c = (c + b) >>> 0
        b = (b - a) >>> 0
        b = (b ^ rotate(a, 6)) >>> 0
        a = (a + c) >>> 0
        c = (c - b) >>> 0
        c = (c ^ rotate(b, 8)) >>> 0
        b = (b + a) >>> 0
        a = (a - c) >>> 0
        a = (a ^ rotate(c, 16)) >>> 0
        c = (c + b) >>> 0
        b = (b - a) >>> 0
        b = (b ^ rotate(a, 19)) >>> 0
        a = (a + c) >>> 0
        c = (c - b) >>> 0
        c = (c ^ rotate(b, 4)) >>> 0
        b = (b + a) >>> 0
      }
      const block = Number(packed / 65536n),
        offset = Number(packed % 65536n)
      const word = bigEndian ? block : (block % 65536) * 65536 + Math.floor(block / 65536)
      a = (a + word) >>> 0
      b = (b + (bigEndian ? offset * 65536 : offset)) >>> 0
      c = (c ^ b) >>> 0
      c = (c - rotate(b, 14)) >>> 0
      a = (a ^ c) >>> 0
      a = (a - rotate(c, 11)) >>> 0
      b = (b ^ a) >>> 0
      b = (b - rotate(a, 25)) >>> 0
      c = (c ^ b) >>> 0
      c = (c - rotate(b, 16)) >>> 0
      a = (a ^ c) >>> 0
      a = (a - rotate(c, 4)) >>> 0
      b = (b ^ a) >>> 0
      b = (b - rotate(a, 14)) >>> 0
      c = (c ^ b) >>> 0
      c = (c - rotate(b, 24)) >>> 0
      return { hash32: c | 0, hash64: BigInt.asIntN(64, (BigInt(b) << 32n) | BigInt(c)).toString() }
    }
    for (const packed of [
      0n,
      1n,
      65536n,
      4295032832n,
      4295032835n,
      281474976645120n,
      281474976710655n,
    ]) {
      for (const seed of [0n, -1n, -9223372036854775808n]) {
        const little = reference(packed, seed, false),
          big = reference(packed, seed, true)
        const actual = (
          await pg.query<{ hash32: number; hash64: string }>(
            'SELECT hashtid($1::tid) hash32, hashtidextended($1::tid,$2::bigint)::text hash64',
            [spelling(packed), seed.toString()],
          )
        ).rows[0]!
        expect(actual.hash32).toBe(reference(packed, 0n, false).hash32)
        expect(actual.hash64).toBe(little.hash64)
        expect(little.hash32 === big.hash32 && little.hash64 === big.hash64).toBe(
          portableHash(packed),
        )
      }
    }
  })
})
