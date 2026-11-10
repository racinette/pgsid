import { describe, expect, it } from 'vitest'
import { pruneCheckTypescript } from '../../tools/check-transpiler/typescript/prune.js'

const runtime = [
  {
    path: 'checks.ts',
    content: `import * as ops from "./ops/operations.js";
import * as rt from "./rt/runtime.js";
export type { Value, Unused } from "./rt/runtime.js";
export { makeValue, unusedValue } from "./rt/runtime.js";
export function checkA(input: rt.Value): boolean {
    return ops.positive(input);
}
export function checkB(input: rt.Value): boolean {
    return ops.negative(input);
}
`,
  },
  {
    path: 'ops/operations.ts',
    content: `// Copyright notice of the operations.
import * as rt from "../rt/runtime.js";
const limit = 0;
const other = 1;
function compare(left: number): number {
    const other = left;
    return other - limit;
}
export function positive(input: rt.Value): boolean {
    return compare(rt.read(input)) > 0;
}
export function negative(input: rt.Value): boolean {
    return rt.read(input) < 0;
}
`,
  },
  {
    path: 'rt/runtime.ts',
    content: `export type Value = { readonly kind: "Value"; readonly payload: number };
export type Unused = { readonly kind: "Unused" };
export function read(value: Value): number {
    return value.payload;
}
export function makeValue(payload: number): Value {
    return { kind: "Value", payload };
}
export function unusedValue(): Unused {
    return { kind: "Unused" };
}
`,
  },
  {
    path: 'lang/runtime.ts',
    content: `export function never(): void {}
`,
  },
]

const content = (files: { path: string; content: string }[], path: string) =>
  files.find((file) => file.path === path)?.content

describe('CHECK runtime pruning', () => {
  it('keeps what the consumer reaches, across files and re-exports', () => {
    const pruned = pruneCheckTypescript(runtime, [
      {
        source: `import * as _checkRust from "./checks-rust/checks.js";
const ok: boolean = _checkRust.checkA(_checkRust.makeValue(1));
type Input = _checkRust.Value;
`,
        prefix: './checks-rust/',
      },
    ])
    expect(pruned.map((file) => file.path)).toEqual([
      'checks.ts',
      'ops/operations.ts',
      'rt/runtime.ts',
    ])
    expect(content(pruned, 'checks.ts')).toBe(`import * as ops from "./ops/operations.js";
import * as rt from "./rt/runtime.js";
export type { Value } from "./rt/runtime.js";
export { makeValue } from "./rt/runtime.js";
export function checkA(input: rt.Value): boolean {
    return ops.positive(input);
}
`)
    // A local named like a top-level declaration keeps that declaration: pruning keeps too
    // much rather than too little. The header stays though its statement's neighbour goes.
    expect(content(pruned, 'ops/operations.ts')).toBe(`// Copyright notice of the operations.
import * as rt from "../rt/runtime.js";
const limit = 0;
const other = 1;
function compare(left: number): number {
    const other = left;
    return other - limit;
}
export function positive(input: rt.Value): boolean {
    return compare(rt.read(input)) > 0;
}
`)
    expect(content(pruned, 'rt/runtime.ts'))
      .toBe(`export type Value = { readonly kind: "Value"; readonly payload: number };
export function read(value: Value): number {
    return value.payload;
}
export function makeValue(payload: number): Value {
    return { kind: "Value", payload };
}
`)
  })

  it('drops a namespace import a file no longer uses', () => {
    const pruned = pruneCheckTypescript(runtime, [
      {
        source: `import { makeValue } from "./x/rt/runtime.js";
export const value = makeValue(1);
`,
        prefix: './x/',
      },
    ])
    expect(pruned.map((file) => file.path)).toEqual(['rt/runtime.ts'])
    expect(content(pruned, 'rt/runtime.ts')).not.toContain('unusedValue')
  })

  it('keeps a whole file when a namespace is used as a value', () => {
    const pruned = pruneCheckTypescript(runtime, [
      {
        source: `import * as _checkRust from "./checks-rust/checks.js";
export const all = _checkRust;
`,
        prefix: './checks-rust/',
      },
    ])
    expect(content(pruned, 'checks.ts')).toBe(runtime[0]!.content)
    expect(content(pruned, 'ops/operations.ts')).toContain('export function negative')
    expect(content(pruned, 'rt/runtime.ts')).toBe(runtime[2]!.content)
    expect(content(pruned, 'lang/runtime.ts')).toBeUndefined()
  })

  it('refuses statements it cannot name and names the runtime lacks', () => {
    const effect = [{ path: 'checks.ts', content: 'export const a = 1;\nconsole.log(a);\n' }]
    expect(() => pruneCheckTypescript(effect, [])).toThrow(/cannot name/)
    expect(() =>
      pruneCheckTypescript(runtime, [
        {
          source: `import * as c from "./checks-rust/checks.js";\nc.missing();\n`,
          prefix: './checks-rust/',
        },
      ]),
    ).toThrow(/no missing in checks\.ts/)
    expect(() =>
      pruneCheckTypescript(runtime, [
        { source: `import * as c from "./checks-rust/absent.js";\n`, prefix: './checks-rust/' },
      ]),
    ).toThrow(/names no CHECK runtime file/)
  })
})
