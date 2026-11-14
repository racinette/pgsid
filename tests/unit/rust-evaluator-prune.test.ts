import { describe, expect, it } from 'vitest'
import { pruneRustEvaluator, splitRustItems } from '../../src/codegen/rust/evaluator.js'

const source = `// A leading comment.
#[derive(Clone, Copy)]
pub struct Pair {
    left: i32,
    right: i32,
}

/// Braces in literals do not end an item: "}" '}' r#"}"#.
pub fn render(pair: Pair) -> String {
    let close = '}';
    let text = "} { \\" }";
    /* a { nested /* block */ comment */
    format!("{}{}{}", close, text, r#"}"#) + &helper(pair.left)
}

fn helper(value: i32) -> String { value.to_string() }

const LIMIT: [u8; 2] = [1, 2];

pub struct Wrapped(pub Pair);

fn unused<'a>(text: &'a str) -> &'a str { text }
`

describe('Rust evaluator pruning', () => {
  it('splits top-level items with the comments and attributes before them', () => {
    const items = splitRustItems(source)
    expect(items.map((item) => item.name)).toEqual(['Pair', 'render', 'helper', 'LIMIT', 'Wrapped', 'unused'])
    expect(items[0]!.text.startsWith('// A leading comment.\n#[derive(Clone, Copy)]')).toBe(true)
    expect(items[1]!.text.endsWith('&helper(pair.left)\n}')).toBe(true)
    expect([...items[1]!.names]).toEqual(expect.arrayContaining(['Pair', 'helper', 'format']))
    expect(items[1]!.names.has('nested')).toBe(false)
  })

  it('keeps what the roots reach, across the modules a module depends on', () => {
    const modules = pruneRustEvaluator(['checks::render'], [
      { name: 'checks', dependencies: ['checkruntime'], items: splitRustItems(source) },
    ])
    const checks = modules.find((module) => module.name === 'checks')!.source
    expect(checks).toContain('pub struct Pair')
    expect(checks).toContain('fn helper(')
    expect(checks).not.toContain('fn unused')
    expect(checks).not.toContain('LIMIT')
    expect(modules.map((module) => module.name)).toEqual(['checks'])
  })
})
