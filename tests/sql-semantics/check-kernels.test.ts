import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
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

// Each kernel has a Rust reference body and a native implementation in every translated
// target. The probe reads digit vectors written as four-character groups, runs a kernel and
// compares its digits with an answer BigInt computes here, independently of all three.
const probe = `
fn kernel_probe_digits(text: String) -> Vec<usize> {
    let chars: Vec<char> = text.chars().collect();
    let mut digits: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index + 3 < chars.len() {
        let mut value: i32 = 0;
        let mut offset: usize = 0;
        while offset < 4 {
            value = value * 10 + ((chars[index + offset] as i32) - 48);
            offset += 1;
        }
        digits.push(usize::try_from(value).unwrap_or(0));
        index += 4;
    }
    digits
}

fn kernel_probe_text(digits: Vec<usize>) -> String {
    let mut output = String::new();
    let mut index: usize = 0;
    while index < digits.len() {
        let mut value = digits[index] as i32;
        let mut place: i32 = 1000;
        while place > 0 {
            let digit = value / place;
            value = value - digit * place;
            output.push(char::from_u32((digit + 48) as u32).unwrap_or('0'));
            place = place / 10;
        }
        index += 1;
    }
    output
}

pub fn kernel_probe(operation: Int4Value, left: TextValue, right: TextValue, expected: TextValue) -> BoolValue {
    if let Int4Value::Value(code) = operation {
        if let TextValue::Value(first) = left {
            if let TextValue::Value(second) = right {
                if let TextValue::Value(wanted) = expected {
                    let a = kernel_probe_digits(first);
                    let b = kernel_probe_digits(second);
                    if code == 0 {
                        return BoolValue::Value(kernel_probe_text(digits_product(a, b)) == wanted);
                    }
                    return BoolValue::Value(kernel_probe_text(digits_quotient(a, b)) == wanted);
                }
            }
        }
    }
    BoolValue::Unknown
}
`

const digitsOf = (digits: readonly number[]) =>
  digits.map((digit) => String(digit).padStart(4, '0')).join('')
const integerOf = (digits: readonly number[]) =>
  digits.length === 0 ? 0n : BigInt(digitsOf(digits))
const digitsFrom = (value: bigint, length: number) =>
  value === 0n ? '0000'.repeat(length) : value.toString().padStart(length * 4, '0')

// Short and long vectors, leading and trailing zeros, every digit at its maximum, divisors
// whose first digit is below half the base (so long division scales them) and dividends that
// make the estimated quotient digit one too large.
const pattern =
  '31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679'
const groups = (text: string) =>
  Array.from({ length: Math.floor(text.length / 4) }, (_, index) =>
    Number(text.slice(index * 4, index * 4 + 4)),
  )
const vectors: number[][] = [
  [],
  [0],
  [1],
  [7],
  [9999],
  [5000],
  [4999],
  [0, 0, 7],
  [1, 0],
  [9999, 9999],
  [1, 0, 0, 0, 1],
  [5000, 0, 1],
  [4999, 9999, 9999],
  [1, 9999, 9999, 9999],
  groups(pattern),
  groups(pattern.slice(7, 47)),
  groups(pattern.repeat(12)),
  Array.from({ length: 600 }, () => 9999),
  Array.from({ length: 301 }, (_, index) => (index % 3 === 0 ? 1 : 0)),
]

it('computes exact digit products and quotients alike natively and in every target', async () => {
  const entry = checkRustEntryName({
    schema: 'public',
    kind: 'table',
    owner: 'kernels',
    constraint: 'digits',
  })
  const evaluatorSource = `pub fn ${entry}(operation:Int4Value,left:TextValue,right:TextValue,expected:TextValue)->CheckOutcome {
 let result=kernel_probe(operation,left,right,expected);check_from_bool(result)
}`
  const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
  source.modules
    .find((module) => module.name === 'checks')!
    .files.push({ path: 'test/kernels.rs', source: probe })
  const inputs = [
    { name: 'operation', type: 'pg_catalog.int4', rustType: 'Int4Value' },
    { name: 'left', type: 'pg_catalog.text', rustType: 'TextValue' },
    { name: 'right', type: 'pg_catalog.text', rustType: 'TextValue' },
    { name: 'expected', type: 'pg_catalog.text', rustType: 'TextValue' },
  ].map((input) => ({ ...input, rustName: input.name }))
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    source,
    evaluatorSource,
    requiresRegex: false,
    checks: [{ kind: 'supported', entryName: entry, inputs }],
  }
  const value = (text: string | number): Input => ({ kind: 'Value', value: text })
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  for (const left of vectors)
    for (const right of vectors) {
      const a = integerOf(left)
      const b = integerOf(right)
      fixtures.push({
        name: 'digits',
        row: {
          operation: value(0),
          left: value(digitsOf(left)),
          right: value(digitsOf(right)),
          expected: value(digitsFrom(a * b, left.length + right.length)),
        },
        expected: { kind: 'True' },
      })
      if (b === 0n) continue
      fixtures.push({
        name: 'digits',
        row: {
          operation: value(1),
          left: value(digitsOf(left)),
          right: value(digitsOf(right)),
          expected: value(digitsFrom(a / b, left.length)),
        },
        expected: { kind: 'True' },
      })
    }
  expect(fixtures.length).toBeGreaterThan(vectors.length * vectors.length)
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-kernels-'))
  try {
    await runCheckParity(directory, 'kernelsparity', group, ['digits'], fixtures)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
