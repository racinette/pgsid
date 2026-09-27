import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const [sourceArg, outputArg] = process.argv.slice(2)
if (!sourceArg || !outputArg) {
  throw new Error('usage: materialize-postgres-fixtures.mjs EXTRACTED_JSON OUTPUT_JSON')
}
const source = JSON.parse(readFileSync(resolve(sourceArg), 'utf8'))
if (source.schemaVersion !== 2 || !Array.isArray(source.cases)) {
  throw new Error('expected the PostgreSQL AST-extracted corpus')
}

const diagnosticFlags = new Set('ABEHILMNPQRSTU')
const ignoredFlags = new Set('-*0g')
const matchingFlags = new Set('beqinpwx')

function optionsFor(flags) {
  const options = {
    syntax: 'advanced',
    caseSensitive: true,
    expanded: false,
    newline: 'ordinary',
  }
  let syntaxFlags = 0
  for (const flag of flags) {
    if (diagnosticFlags.has(flag) || ignoredFlags.has(flag)) continue
    if (!matchingFlags.has(flag)) return null
    switch (flag) {
      case 'b':
        options.syntax = 'basic'
        syntaxFlags++
        break
      case 'e':
        // Applying the public e flag clears both syntax bits in PostgreSQL.
        options.syntax = 'basic'
        syntaxFlags++
        break
      case 'q':
        options.syntax = 'literal'
        syntaxFlags++
        break
      case 'i':
        options.caseSensitive = false
        break
      case 'n':
        options.newline = 'sensitive'
        break
      case 'p':
        options.newline = 'stop'
        break
      case 'w':
        options.newline = 'anchors'
        break
      case 'x':
        options.expanded = true
        break
    }
  }
  if (syntaxFlags > 1) return null
  if (
    options.syntax === 'literal' &&
    (!options.caseSensitive || options.expanded || options.newline !== 'ordinary')
  ) {
    return null
  }
  return options
}

function publicFlags(options) {
  const syntax = { advanced: '', basic: 'b', literal: 'q' }[options.syntax]
  if (syntax === undefined)
    throw new Error(`cannot materialize ${options.syntax} syntax with a public flag`)
  const newline = { ordinary: '', sensitive: 'n', stop: 'p', anchors: 'w' }[options.newline]
  return `${syntax}${options.caseSensitive ? '' : 'i'}${newline}${options.expanded ? 'x' : ''}`
}

const inputs = new Map()
let excluded = 0
for (const item of source.cases) {
  if ([item.pattern, item.subject, item.flags].some((part) => part.kind !== 'literal')) {
    excluded++
    continue
  }
  const options = optionsFor(item.flags.value)
  if (!options) {
    excluded++
    continue
  }
  const input = { pattern: item.pattern.value, subject: item.subject.value, options }
  inputs.set(JSON.stringify(input), input)
}

const pg = await PGlite.create()
const fixtures = []
try {
  const serverVersion = (await pg.query('show server_version')).rows[0].server_version
  const sql = `
    select
      regexp_instr(($1::text collate "C"), $2::text, 1, 1, 0, $3::text) as match_start,
      regexp_instr(($1::text collate "C"), $2::text, 1, 1, 1, $3::text) as match_end
  `
  const extendedFlagProbe = await pg.query(sql, ['aaa', 'a+', 'e'])
  if (extendedFlagProbe.rows[0].match_start !== 0) {
    throw new Error('PostgreSQL e flag no longer has Basic syntax behavior')
  }
  for (const input of inputs.values()) {
    let expected
    try {
      const result = await pg.query(sql, [input.subject, input.pattern, publicFlags(input.options)])
      const { match_start: start, match_end: end } = result.rows[0]
      expected =
        start === 0
          ? { kind: 'NoMatch' }
          : { kind: 'Found', value: { start: start - 1, end: end - 1 } }
    } catch (error) {
      if (error.code !== '2201B') throw error
      expected = { kind: 'InvalidPattern', sqlstate: error.code }
    }
    fixtures.push({ input, expected })
  }
  writeFileSync(
    resolve(outputArg),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        oracle: {
          database: 'PostgreSQL via PGlite',
          serverVersion,
          sourceRevision: source.origin.revision,
          collation: 'C',
        },
        fixtures,
      },
      null,
      2,
    )}\n`,
  )
} finally {
  await pg.close()
}
process.stdout.write(
  `${fixtures.length} fixtures written (${excluded} source cases excluded, ${source.cases.length - excluded - fixtures.length} duplicate inputs collapsed)\n`,
)
