import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'libpg-query'

const [rootArg, outputArg, revision] = process.argv.slice(2)
if (!rootArg || !outputArg || !/^[0-9a-f]{40}$/.test(revision ?? '')) {
  throw new Error('usage: extract-postgres.mjs POSTGRES_ROOT OUTPUT_JSON POSTGRES_COMMIT')
}
const postgresRoot = resolve(rootArg)
const outputPath = resolve(outputArg)
const sourceFiles = [
  { path: 'src/test/modules/test_regex/sql/test_regex.sql', expectedCalls: 669 },
  { path: 'src/test/modules/test_regex/sql/test_regex_utf8.sql', expectedCalls: 27 },
]

function sqlPortion(source, file) {
  if (!file.endsWith('test_regex_utf8.sql')) return { sql: source, byteOffset: 0 }
  const start = source.indexOf('set client_encoding = utf8;')
  if (start < 0 || !source.slice(0, start).includes('\\gset')) {
    throw new Error(`${file}: expected psql-only UTF-8 preamble`)
  }
  return { sql: source.slice(start), byteOffset: Buffer.byteLength(source.slice(0, start)) }
}

function testRegexCalls(node, found = []) {
  if (node === null || typeof node !== 'object') return found
  if (node.FuncCall?.funcname?.at(-1)?.String?.sval === 'test_regex') found.push(node.FuncCall)
  for (const value of Object.values(node)) testRegexCalls(value, found)
  return found
}

function argument(node) {
  if (typeof node?.A_Const?.sval?.sval === 'string') {
    return { kind: 'literal', value: node.A_Const.sval.sval }
  }
  return { kind: 'expression', ast: node }
}

function lineAtByte(source, byteOffset) {
  const prefix = source.subarray(0, byteOffset)
  let line = 1
  for (const byte of prefix) if (byte === 10) line++
  return line
}

async function extract(source, file) {
  const { sql, byteOffset } = sqlPortion(source, file)
  const parsed = await parse(sql)
  const sourceBytes = Buffer.from(source)
  const sqlBytes = Buffer.from(sql)
  const cases = []
  for (const raw of parsed.stmts ?? []) {
    const calls = testRegexCalls(raw.stmt)
    if (calls.length === 0) continue
    if (calls.length !== 1) throw new Error(`${file}: expected one test_regex call per statement`)
    const call = calls[0]
    if (call.args?.length !== 3 || typeof call.location !== 'number') {
      throw new Error(`${file}: unexpected test_regex AST shape`)
    }
    const start = raw.stmt_location ?? 0
    const end = raw.stmt_len ? start + raw.stmt_len : sqlBytes.length
    const statement = sqlBytes.subarray(start, end).toString('utf8').trimEnd()
    const [pattern, subject, flags] = call.args
    cases.push({
      source: { file, line: lineAtByte(sourceBytes, byteOffset + call.location) },
      sql: statement.endsWith(';') ? statement : `${statement};`,
      pattern: argument(pattern),
      subject: argument(subject),
      flags: argument(flags),
    })
  }
  return cases
}

const sources = sourceFiles.map(({ path, expectedCalls }) => {
  const text = readFileSync(join(postgresRoot, path), 'utf8')
  return { path, expectedCalls, text, sha256: createHash('sha256').update(text).digest('hex') }
})
const extracted = await Promise.all(sources.map(({ path, text }) => extract(text, path)))
for (const [index, found] of extracted.entries()) {
  const { path, expectedCalls } = sources[index]
  if (found.length !== expectedCalls) {
    throw new Error(`${path}: expected ${expectedCalls} calls, parsed ${found.length}`)
  }
}
const cases = extracted.flat()
if (cases.length === 0) throw new Error('no PostgreSQL regex cases found')
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      schemaVersion: 2,
      origin: {
        project: 'PostgreSQL',
        revision,
        files: sources.map(({ path, sha256 }) => ({ path, sha256 })),
        copyrightNotice: readFileSync(join(postgresRoot, 'src/backend/regex/COPYRIGHT'), 'utf8'),
      },
      cases,
    },
    null,
    2,
  )}\n`,
)
process.stdout.write(`${cases.length} calls extracted to ${outputPath}\n`)
