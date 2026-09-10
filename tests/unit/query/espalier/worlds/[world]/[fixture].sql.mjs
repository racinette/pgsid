import { parse } from 'libpg-query'

export const description = 'a hand-authored query with an independently stated contract'

export const example = 'worlds/001_shipping/legs-outer.sql'

export const rule = `Contain exactly one SQL statement and state all four
nullable contract channels for it:

- annotate every output expression inline with \`@notNull\`, \`@nullable\`, or
  \`@alwaysNull\`;
- annotate every positional parameter with \`-- @param N notNull|nullable\`,
  and provide an \`@args\` control binding; use \`-- @params none\` when the
  query has no parameters;
- list every output presence group with \`-- @null-group N[*],M[*][,…]\`, or
  state \`-- @null-groups none\`;
- list every minimal joint parameter rejection set with
  \`-- @param-reject N,M[,…]\`, or state
  \`-- @param-rejections none\`.

The group declarations are expectations, not observations copied from the
engine. Derive them from the query and world first. The executable contract
suite compares them to the engine in both directions and asks PostgreSQL to
witness each claimed arm. A generated corpus may adjudicate emitted claims,
but it cannot replace these independent expectations.`

const outputMarker = /^(?!\s*--).*--[^\n]*@(notNull|nullable|alwaysNull)\b/gm
const paramMarker = /^\s*--\s*@param\s+(\d+)\s+(notNull|nullable)\s*$/gm
const nullGroup = /^\s*--\s*@null-group\s+(.+?)\s*$/gm
const paramRejection = /^\s*--\s*@param-reject\s+(.+?)\s*$/gm

function lineAt(text, offset) {
  return text.slice(0, offset).split('\n').length
}

function occurrences(text, pattern) {
  return [...text.matchAll(pattern)]
}

function withoutComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '')
}

function parseList(raw, starred) {
  const parts = raw.split(',').map((part) => part.trim())
  const shape = starred ? /^\d+\*?$/ : /^\d+$/
  if (parts.length < 2 || parts.some((part) => !shape.test(part))) return null
  const members = parts.map((part) => Number(part.replace(/\*$/, '')))
  if (new Set(members).size !== members.length) return null
  if (starred && !parts.some((part) => part.endsWith('*'))) return null
  return {
    members,
    starred: new Set(
      parts.filter((part) => part.endsWith('*')).map((part) => Number(part.slice(0, -1))),
    ),
  }
}

export async function lint({ read, emit }) {
  const text = await read()

  try {
    const parsed = await parse(text)
    const statementCount = parsed.stmts?.length ?? 0
    if (statementCount !== 1) {
      emit({
        code: 'fixture_statement_count',
        message: `a world fixture must contain exactly one SQL statement; found ${statementCount}`,
        line: 1,
      })
    }
  } catch (error) {
    emit({
      code: 'fixture_sql_does_not_parse',
      message: `the fixture SQL does not parse: ${error.message}`,
      line: 1,
    })
  }

  const outputs = occurrences(text, outputMarker)
  const outputKinds = outputs.map((match) => match[1])
  const params = occurrences(text, paramMarker)
  const groups = occurrences(text, nullGroup)
  const rejections = occurrences(text, paramRejection)
  const noParams = occurrences(text, /^\s*--\s*@params\s+none\s*$/gm)
  const noGroups = occurrences(text, /^\s*--\s*@null-groups\s+none\s*$/gm)
  const noRejections = occurrences(text, /^\s*--\s*@param-rejections\s+none\s*$/gm)

  if (outputs.length === 0) {
    emit({
      code: 'missing_output_contract',
      message: 'annotate every output expression inline with its nullability',
      line: 1,
    })
  }

  const sql = withoutComments(text)
  const usedParams = new Set(occurrences(sql, /\$(\d+)\b/g).map((match) => Number(match[1])))
  const declaredParams = new Map()
  for (const match of params) {
    const number = Number(match[1])
    if (declaredParams.has(number)) {
      emit({
        code: 'duplicate_parameter_contract',
        message: `$${number} has more than one @param declaration`,
        line: lineAt(text, match.index),
      })
    }
    declaredParams.set(number, match[2])
  }

  if (usedParams.size === 0) {
    if (noParams.length !== 1 || params.length !== 0) {
      emit({
        code: 'missing_no_parameters_declaration',
        message:
          'a query without parameters must contain exactly one `-- @params none` declaration',
        line: 1,
      })
    }
  } else {
    if (noParams.length > 0) {
      emit({
        code: 'contradictory_parameter_contract',
        message: '`@params none` contradicts the parameters used by this query',
        line: lineAt(text, noParams[0].index),
      })
    }
    if (occurrences(text, /^\s*--\s*@args\b/gm).length === 0) {
      emit({
        code: 'missing_control_binding',
        message: 'a parameterized fixture must provide at least one `@args` control binding',
        line: 1,
      })
    }
    for (const number of usedParams) {
      if (!declaredParams.has(number)) {
        emit({
          code: 'missing_parameter_contract',
          message: `$${number} has no @param declaration`,
          line: 1,
        })
      }
    }
    for (const [number] of declaredParams) {
      if (!usedParams.has(number)) {
        emit({
          code: 'stale_parameter_contract',
          message: `$${number} is declared but does not occur in the query`,
          line: 1,
        })
      }
    }
  }

  if ((groups.length === 0) === (noGroups.length === 0)) {
    emit({
      code: 'missing_output_group_contract',
      message: 'declare every @null-group, or declare `-- @null-groups none`',
      line: 1,
    })
  }
  if ((rejections.length === 0) === (noRejections.length === 0)) {
    emit({
      code: 'missing_parameter_group_contract',
      message: 'declare every @param-reject set, or declare `-- @param-rejections none`',
      line: 1,
    })
  }

  for (const match of groups) {
    const parsed = parseList(match[1], true)
    if (!parsed) {
      emit({
        code: 'invalid_output_group_contract',
        message: '@null-group needs two distinct output indices and at least one `*` discriminant',
        line: lineAt(text, match.index),
      })
      continue
    }
    for (const member of parsed.members) {
      if (member >= outputKinds.length || outputKinds[member] !== 'nullable') {
        emit({
          code: 'invalid_output_group_member',
          message: `output ${member} in @null-group must exist and be annotated @nullable`,
          line: lineAt(text, match.index),
        })
      }
    }
  }

  for (const match of rejections) {
    const parsed = parseList(match[1], false)
    if (!parsed) {
      emit({
        code: 'invalid_parameter_group_contract',
        message: '@param-reject needs two or more distinct parameter numbers',
        line: lineAt(text, match.index),
      })
      continue
    }
    for (const member of parsed.members) {
      if (!usedParams.has(member) || declaredParams.get(member) !== 'nullable') {
        emit({
          code: 'invalid_parameter_group_member',
          message: `$${member} in @param-reject must occur and be annotated nullable`,
          line: lineAt(text, match.index),
        })
      }
    }
  }
}
