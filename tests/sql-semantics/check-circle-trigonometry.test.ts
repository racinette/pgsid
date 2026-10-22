import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { go, printGoFile, type GoStatement } from '../../src/codegen/go/ast.js'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'

const run = promisify(execFile)
const path = 'crates/check-evaluator/src/operations/pg_catalog/circle_polygon_math.rs'
const probe = `pub fn circle_trig_bits(bits: i64, cosine: bool) -> i64 {
    circle_trigonometry(f64::from_bits(bits as u64), cosine).to_bits() as i64
}`
const bits = (hex: string) => BigInt.asIntN(64, BigInt('0x' + hex))
const wire = (value: number) => {
  const bytes = Buffer.alloc(8)
  bytes.writeDoubleBE(value)
  return bytes.toString('hex')
}

it('reproduces the fdlibm circle-angle kernels in Rust, Go and TypeScript against PostgreSQL, including cancellation boundaries', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-circle-trig-'))
  try {
    const corpus = (
      await pg.query<{ angle: string; sine: string; cosine: string }>(`
      SELECT encode(float8send(a),'hex') angle,
        encode(float8send(sin(a)),'hex') sine, encode(float8send(cos(a)),'hex') cosine
      FROM (SELECT ((2*'3.141592653589793'::float8)/n::float8)*i::float8 a
        FROM generate_series(2,128) n CROSS JOIN LATERAL generate_series(0,n-1)i) angles
    `)
    ).rows
    expect(corpus).toHaveLength(8255)
    const values = new Map<string, number>()
    const add = (value: number) => {
      if (value >= 0 && value <= 2 * Math.PI) values.set(wire(value), value)
    }
    for (const hex of [
      '0000000000000000',
      '8000000000000000',
      '0000000000000001',
      '000fffffffffffff',
      '0010000000000000',
      '3e40000000000000',
      '3e50000000000000',
      '3fe921fbffffffff',
      '4002d97cffffffff',
      '400f6a7affffffff',
      '4015fdbcffffffff',
    ]) {
      const center = BigInt('0x' + hex)
      for (const delta of [-2n, -1n, 0n, 1n, 2n]) {
        const number = center + delta
        if (number < 0n || number > 0xffffffffffffffffn) continue
        const bytes = Buffer.alloc(8)
        bytes.writeBigUInt64BE(number)
        add(bytes.readDoubleBE())
      }
    }
    for (const center of [Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI]) {
      const pattern = BigInt('0x' + wire(center))
      for (let delta = -8n; delta <= 8n; delta++) {
        const bytes = Buffer.alloc(8)
        bytes.writeBigUInt64BE(pattern + delta)
        add(bytes.readDoubleBE())
      }
    }
    let seed = 0x6a09e667f3bcc909n
    for (let index = 0; index < 1024; index++) {
      seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
      add((Number(seed >> 11n) / 9007199254740992) * (2 * Math.PI))
      const bytes = Buffer.alloc(8)
      bytes.writeBigUInt64BE(seed & 0x7fffffffffffffffn)
      add(bytes.readDoubleBE())
    }
    for (const count of [129, 255, 256, 257, 1023, 1024, 65535, 134217725])
      for (const index of [
        0,
        1,
        Math.floor(count / 2) - 1,
        Math.floor(count / 2),
        count - 2,
        count - 1,
      ])
        add(((2 * Math.PI) / count) * index)
    const extra = (
      await pg.query<{ input: string; angle: string; sine: string; cosine: string }>(
        `
      SELECT input,encode(float8send(a),'hex') angle,
        encode(float8send(sin(a)),'hex') sine,encode(float8send(cos(a)),'hex') cosine
      FROM (SELECT input,input::float8 a FROM unnest($1::text[]) input) angles
    `,
        [[...values.values()].map((value) => (Object.is(value, -0) ? '-0' : String(value)))],
      )
    ).rows
    for (const row of extra) expect(row.angle).toBe(wire(Number(row.input)))
    corpus.push(...extra)
    const source = await readFile(path, 'utf8')
    const graph: CheckRustSource = {
      schemaVersion: 1,
      modules: [
        {
          name: 'pg_catalog',
          dependencies: [],
          files: [
            { path, source },
            { path: 'circle_trig_probe.rs', source: probe },
          ],
        },
      ],
    }
    const generated = transpileCheckRust(graph)
    for (const output of [generated.go, generated.typescript]) {
      expect(output).toContain('Copyright (C) 1993 by Sun Microsystems, Inc.')
      expect(output).toContain('software is freely granted, provided that this notice')
    }
    const context = createContext({ exports: {} })
    runInContext(
      ts.transpileModule(generated.typescript, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      }).outputText,
      context,
    )
    const functions = context.exports as { circleTrigBits(bits: bigint, cosine: boolean): bigint }
    for (const row of corpus) {
      expect(functions.circleTrigBits(bits(row.angle), false), row.angle + ' sine').toBe(
        bits(row.sine),
      )
      expect(functions.circleTrigBits(bits(row.angle), true), row.angle + ' cosine').toBe(
        bits(row.cosine),
      )
    }
    await writeFile(
      join(root, 'cases.txt'),
      corpus
        .map((row) => [row.angle, row.sine, row.cosine].map((hex) => String(bits(hex))).join(' '))
        .join('\n') + '\n',
    )
    await writeFile(join(root, 'math.rs'), source)
    await writeFile(join(root, 'probe.rs'), probe)
    await writeFile(
      join(root, 'main.rs'),
      `include!("math.rs"); include!("probe.rs");
fn main() {
    let source=std::fs::read_to_string(std::env::args().nth(1).unwrap()).unwrap();
    for line in source.lines() {
        let row:Vec<i64>=line.split(' ').map(|s|s.parse().unwrap()).collect();
        assert_eq!(circle_trig_bits(row[0],false),row[1],"sine {}",row[0]);
        assert_eq!(circle_trig_bits(row[0],true),row[2],"cosine {}",row[0]);
    }
}`,
    )
    await run('rustc', ['--edition', '2021', join(root, 'main.rs'), '-o', join(root, 'probe')])
    await run(join(root, 'probe'), [join(root, 'cases.txt')])
    const invoke = (owner: string, method: string, args: Parameters<typeof go.call>[1] = []) =>
      go.call(go.selector(go.ident(owner), method), args)
    const fatal = (message: string): GoStatement =>
      go.expression(invoke('t', 'Fatal', [go.string(message), go.ident('err')]))
    const scan: GoStatement[] = [
      go.assign([go.ident('fields')], [invoke('strings', 'Fields', [invoke('scanner', 'Text')])]),
    ]
    for (const [index, name] of ['angle', 'sine', 'cosine'].entries()) {
      scan.push(
        go.assign(
          [go.ident(name), go.ident('err')],
          [
            invoke('strconv', 'ParseInt', [
              go.index(go.ident('fields'), go.number(index)),
              go.number(10),
              go.number(64),
            ]),
          ],
        ),
      )
      scan.push(go.if(go.notEqual(go.ident('err'), go.ident('nil')), [fatal('parse')]))
    }
    for (const [expected, cosine] of [
      ['sine', false],
      ['cosine', true],
    ] as const)
      scan.push(
        go.if(
          go.notEqual(
            go.call(go.ident('CircleTrigBits'), [go.ident('angle'), go.ident(String(cosine))]),
            go.ident(expected),
          ),
          [go.expression(invoke('t', 'Fatal', [go.string(expected), go.ident('angle')]))],
        ),
      )
    const statements: GoStatement[] = [
      go.assign(
        [go.ident('input'), go.ident('err')],
        [invoke('os', 'Open', [go.string('cases.txt')])],
      ),
      go.if(go.notEqual(go.ident('err'), go.ident('nil')), [fatal('open')]),
      go.defer(invoke('input', 'Close')),
      go.assign([go.ident('scanner')], [invoke('bufio', 'NewScanner', [go.ident('input')])]),
      go.for(invoke('scanner', 'Scan'), scan),
      go.if(
        go.notEqual(go.ident('err'), go.ident('nil')),
        [fatal('scan')],
        go.assign([go.ident('err')], [invoke('scanner', 'Err')]),
      ),
    ]
    await writeFile(join(root, 'runtime.go'), generated.go)
    await writeFile(
      join(root, 'runtime_test.go'),
      printGoFile({
        package: 'generated',
        imports: ['bufio', 'os', 'strconv', 'strings', 'testing'].map((path) => ({ path })),
        declarations: [
          go.function(
            'TestCircleMath',
            [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
            [],
            statements,
          ),
        ],
      }),
    )
    await writeFile(join(root, 'go.mod'), 'module circlemath\n\ngo 1.25\n')
    await run('go', ['test', './...'], {
      cwd: root,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    })
    console.info('Circle trigonometry parity:', corpus.length * 2, 'exact results per target')
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 120_000)
