export const description = 'a hand-authored query contract over the shared schema'

export const rule = [
  'State both non-flat nullability channels explicitly:',
  '',
  '- list every output presence group with -- @null-group N[*],M[*][,…], or',
  '  state -- @null-groups none;',
  '- list every minimal joint parameter rejection set with',
  '  -- @param-reject N,M[,…], or state -- @param-rejections none.',
  '',
  'These declarations are expectations independently derived from the query,',
  'not observations copied from the engine. Keep the existing per-output and',
  'per-parameter annotations as the separate flat contract.',
].join('\n')

const paramMarker = /^\s*--\s*@param\s+(\d+)\s+(notNull|nullable)\s*$/gm
const nullGroup = /^\s*--\s*@null-group\s+(.+?)\s*$/gm
const paramRejection = /^\s*--\s*@param-reject\s+(.+?)\s*$/gm
const noNullGroups = /^\s*--\s*@null-groups\s+none\s*$/gm
const noParamRejections = /^\s*--\s*@param-rejections\s+none\s*$/gm

function lineAt(text, offset) {
  return text.slice(0, offset).split('\n').length
}

function occurrences(text, pattern) {
  return [...text.matchAll(pattern)]
}

function withoutComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '')
}

function parseList(raw, starred, minimum) {
  const parts = raw.split(',').map((part) => part.trim())
  const shape = starred ? /^\d+\*?$/ : /^\d+$/
  if (parts.length < 2 || parts.some((part) => !shape.test(part))) return null
  const members = parts.map((part) => Number(part.replace(/\*$/, '')))
  if (members.some((member) => member < minimum)) return null
  if (new Set(members).size !== members.length) return null
  if (starred && !parts.some((part) => part.endsWith('*'))) return null
  return members
}

export async function lint({ read, emit }) {
  const text = await read()
  const outputs = text
    .split('\n')
    .map((line) => /--\s*@(notNull|nullable|alwaysNull)\b/.exec(line)?.[1])
    .filter((kind) => kind !== undefined)
  const params = new Map(
    occurrences(text, paramMarker).map((match) => [Number(match[1]), match[2]]),
  )
  const usedParams = new Set(
    occurrences(withoutComments(text), /\$(\d+)\b/g).map((match) => Number(match[1])),
  )
  const groups = occurrences(text, nullGroup)
  const rejections = occurrences(text, paramRejection)
  const emptyGroups = occurrences(text, noNullGroups)
  const emptyRejections = occurrences(text, noParamRejections)

  if (groups.length === 0 && emptyGroups.length === 0) {
    emit({
      code: 'missing_output_group_contract',
      message: 'declare every @null-group, or declare -- @null-groups none',
      line: 1,
    })
  } else if (groups.length > 0 && emptyGroups.length > 0) {
    emit({
      code: 'contradictory_output_group_contract',
      message: '@null-groups none cannot accompany an @null-group declaration',
      line: lineAt(text, emptyGroups[0].index),
    })
  } else if (emptyGroups.length > 1) {
    emit({
      code: 'duplicate_output_group_contract',
      message: 'declare -- @null-groups none exactly once',
      line: lineAt(text, emptyGroups[1].index),
    })
  }

  if (rejections.length === 0 && emptyRejections.length === 0) {
    emit({
      code: 'missing_parameter_group_contract',
      message: 'declare every @param-reject set, or declare -- @param-rejections none',
      line: 1,
    })
  } else if (rejections.length > 0 && emptyRejections.length > 0) {
    emit({
      code: 'contradictory_parameter_group_contract',
      message: '@param-rejections none cannot accompany an @param-reject declaration',
      line: lineAt(text, emptyRejections[0].index),
    })
  } else if (emptyRejections.length > 1) {
    emit({
      code: 'duplicate_parameter_group_contract',
      message: 'declare -- @param-rejections none exactly once',
      line: lineAt(text, emptyRejections[1].index),
    })
  }

  const seenGroups = new Set()
  for (const match of groups) {
    const members = parseList(match[1], true, 0)
    if (!members) {
      emit({
        code: 'invalid_output_group_contract',
        message: '@null-group needs two distinct output indices and at least one * discriminant',
        line: lineAt(text, match.index),
      })
      continue
    }
    const key = [...members].sort((left, right) => left - right).join(',')
    if (seenGroups.has(key)) {
      emit({
        code: 'duplicate_output_group_contract',
        message: 'the output group {' + key + '} is declared more than once',
        line: lineAt(text, match.index),
      })
    }
    seenGroups.add(key)
    for (const member of members) {
      if (member >= outputs.length || outputs[member] !== 'nullable') {
        emit({
          code: 'invalid_output_group_member',
          message: 'output ' + member + ' in @null-group must exist and be annotated @nullable',
          line: lineAt(text, match.index),
        })
      }
    }
  }

  const seenRejections = new Set()
  for (const match of rejections) {
    const members = parseList(match[1], false, 1)
    if (!members) {
      emit({
        code: 'invalid_parameter_group_contract',
        message: '@param-reject needs two or more distinct positive parameter numbers',
        line: lineAt(text, match.index),
      })
      continue
    }
    const key = [...members].sort((left, right) => left - right).join(',')
    if (seenRejections.has(key)) {
      emit({
        code: 'duplicate_parameter_group_contract',
        message: 'the parameter rejection set {' + key + '} is declared more than once',
        line: lineAt(text, match.index),
      })
    }
    seenRejections.add(key)
    for (const member of members) {
      if (!usedParams.has(member) || params.get(member) !== 'nullable') {
        emit({
          code: 'invalid_parameter_group_member',
          message:
            '$' + member + ' in @param-reject must occur and be annotated nullable',
          line: lineAt(text, match.index),
        })
      }
    }
  }
}
