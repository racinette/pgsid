import { createHash } from 'node:crypto'

export type RegexCharacterProfileFacts = {
  ranges: readonly number[]
  cases: readonly number[]
}

export function validRegexCharacterProfile(profile: RegexCharacterProfileFacts): boolean {
  if (!profile || !Array.isArray(profile.ranges) || !Array.isArray(profile.cases)) return false
  const { ranges, cases } = profile
  if (!ranges.length || ranges.length % 3 || cases.length % 3) return false
  let next = 0
  for (let i = 0; i < ranges.length; i += 3) {
    const first = ranges[i]!,
      last = ranges[i + 1]!,
      mask = ranges[i + 2]!
    if (
      !Number.isInteger(first) ||
      !Number.isInteger(last) ||
      !Number.isInteger(mask) ||
      first !== next ||
      last < first ||
      last > 0x10ffff ||
      mask < 0 ||
      mask >= 16384
    )
      return false
    next = last + 1
  }
  if (next !== 0x110000) return false
  let previous = -1
  for (let i = 0; i < cases.length; i += 3) {
    const point = cases[i]!,
      lower = cases[i + 1]!,
      upper = cases[i + 2]!
    if (
      ![point, lower, upper].every((n) => Number.isInteger(n) && n >= 0 && n <= 0x10ffff) ||
      point <= previous
    )
      return false
    previous = point
  }
  return true
}

export function regexCharacterProfileDeclaration(profile: RegexCharacterProfileFacts) {
  const facts = validRegexCharacterProfile(profile)
    ? { ranges: profile.ranges, cases: profile.cases }
    : { ranges: [0], cases: [] }
  const key = createHash('sha256').update(JSON.stringify(facts)).digest('hex')
  const name = 'check_regex_profile_' + key
  const functions = (['ranges', 'cases'] as const).map((kind) => {
    const constant = name.toUpperCase() + '_' + kind.toUpperCase() + '_DATA'
    return `const ${constant}: &[usize] = &[${facts[kind].join(',')}];
fn ${name}_${kind}() -> Vec<usize> {
 let mut values:Vec<usize>=Vec::new(); let mut index:usize=0;
 while index<${constant}.len(){values.push(${constant}[index]);index+=1;}
 values
}
`
  })
  return { name, source: functions.join('\n') }
}
