import { storedRowExpression, type StoredRowExpressionInput } from './stored-row-expressions.js'
import { parseTree, tree, scalar, type Value, type Tree } from './expression-tree.js'
import { tsqueryContainerConstant } from './tsquery-container-constants.js'
import { tsqueryConstantStorage } from './tsquery-constant-storage.js'
import { tsvectorContainerConstant } from './tsvector-container-constants.js'
import { arrayConstantStorage } from './array-constant-storage.js'
import { tsvectorConstantStorage } from './tsvector-constant-storage.js'
import { xmlContainerConstant } from './xml-container-constants.js'
import type { ConstantStorageType } from './container-constant-storage.js'
import type {
  StoredDomainCoercionContext,
  StoredRowCoercionContext,
  StoredArrayConstructorContext,
  StoredTsvectorConstantContext,
  StoredTsqueryConstantContext,
  StoredXmlConstantContext,
  StoredArrayConstantContext,
} from './types.js'
import { xmlArrayConstantText } from './xml-array-constants.js'

export type DomainCoercionIdentity = { schema: string; name: string; array: boolean }
export type RowCoercionIdentity = { identity: string; depth: number; fields?: number[] }

function xmlConstantText(node: Tree, utf8: boolean): string | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  if (
    scalar(node, 'constisnull') !== 'false' ||
    scalar(node, 'constbyval') !== 'false' ||
    scalar(node, 'constlen') !== '-1'
  )
    return undefined
  const stored = node.fields['constvalue']
  if (
    stored?.length !== 2 ||
    typeof stored[0] !== 'string' ||
    !/^\d+$/u.test(stored[0]) ||
    !Array.isArray(stored[1])
  )
    return undefined
  const length = Number(stored[0]),
    raw = stored[1]
  if (
    length < 1 ||
    raw.length !== length ||
    raw.some(
      (v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || Number(v) < -128 || Number(v) > 255,
    )
  )
    return undefined
  const bytes = Buffer.from(raw.map((v) => Number(v) & 255))
  let header = 0
  if (
    length >= 4 &&
    (((bytes.readUInt32LE(0) & 3) === 0 && bytes.readUInt32LE(0) / 4 === length) ||
      (bytes.readUInt32BE(0) < 1073741824 && bytes.readUInt32BE(0) === length))
  )
    header = 4
  else if (
    length <= 127 &&
    (((bytes[0]! & 1) === 1 && bytes[0]! >>> 1 === length) ||
      ((bytes[0]! & 128) !== 0 && (bytes[0]! & 127) === length))
  )
    header = 1
  if (!header) return undefined
  const body = bytes.subarray(header)
  if (!utf8 && body.some((byte) => byte > 127)) return undefined
  const text = body.toString('utf8')
  return text.includes('\0') || !Buffer.from(text, 'utf8').equals(body) ? undefined : text
}

function captureExpressionCoercions(
  source: string | null,
  definition: string,
  identities: ReadonlyMap<number, RowCoercionIdentity>,
  arrayIdentities: ReadonlyMap<number, string>,
  xmlTypes: ReadonlySet<number> = new Set(),
  utf8 = false,
  xmlArrays: ReadonlyMap<number, number> = new Map(),
  xmlContainers?: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
  tsvectorTypes: ReadonlySet<number> = new Set(),
  tsvectorContainers?: {
    types: ReadonlyMap<number, ConstantStorageType>
    roots: ReadonlySet<number>
  },
  parsedRoot?: Value,
  arrayStorage?: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
  tsqueryTypes: ReadonlySet<number> = new Set(),
  tsqueryContainers?: {
    types: ReadonlyMap<number, ConstantStorageType>
    roots: ReadonlySet<number>
  },
  rowExpressions?: StoredRowExpressionInput,
): {
  row?: StoredRowCoercionContext
  arrays?: StoredArrayConstructorContext
  xml?: StoredXmlConstantContext
  tsvector?: StoredTsvectorConstantContext
  tsquery?: StoredTsqueryConstantContext
  arrayStorage?: StoredArrayConstantContext
} {
  const tsqueryCandidate =
    source !== null &&
    [...source.matchAll(/:consttype\s+(\d+)/gu)].some(
      (m) => tsqueryTypes.has(Number(m[1])) || tsqueryContainers?.roots.has(Number(m[1])),
    )
  const tsqueryConstants: StoredTsqueryConstantContext['constants'] = []
  const tsqueryContainerConstants: NonNullable<StoredTsqueryConstantContext['containers']> = []
  const arrayCandidate =
    source !== null &&
    [...source.matchAll(/:consttype\s+(\d+)/gu)].some((m) => arrayStorage?.roots.has(Number(m[1])))
  const arrayConstants: StoredArrayConstantContext['constants'] = []
  const tsvectorCandidate =
    source !== null &&
    [...source.matchAll(/:consttype\s+(\d+)/gu)].some(
      (m) => tsvectorTypes.has(Number(m[1])) || tsvectorContainers?.roots.has(Number(m[1])),
    )
  const tsvectorConstants: StoredTsvectorConstantContext['constants'] = []
  const tsvectorContainerConstants: NonNullable<StoredTsvectorConstantContext['containers']> = []
  const xmlCandidate =
    xmlTypes.size > 0 &&
    source !== null &&
    ([...source.matchAll(/:consttype\s+(\d+)/gu)].some(
      (m) =>
        xmlTypes.has(Number(m[1])) ||
        xmlArrays.has(Number(m[1])) ||
        xmlContainers?.roots.has(Number(m[1])),
    ) ||
      /\{XMLEXPR\b[^{}]*:name\s+(?!<>)(\S+)/u.test(source) ||
      (/\{XMLEXPR\b/u.test(source) && /:arg_names\s+\(/u.test(source)))
  if (
    !source ||
    (!/\{(?:COERCEVIAIO|CONVERTROWTYPEEXPR|FUNCEXPR|ARRAYCOERCEEXPR|ROWEXPR)\s/u.test(source) &&
      !(arrayIdentities.size && /\{ARRAYEXPR\s/u.test(source)) &&
      !xmlCandidate &&
      !arrayCandidate &&
      !tsvectorCandidate &&
      !tsqueryCandidate)
  )
    return {}
  const casts: StoredRowCoercionContext['casts'] = []
  const constructors: StoredArrayConstructorContext['constructors'] = []
  const constants: StoredXmlConstantContext['constants'] = []
  const xmlNames: NonNullable<StoredXmlConstantContext['names']> = []
  const xmlArgumentNames: NonNullable<StoredXmlConstantContext['argumentNames']> = []
  const xmlArrayConstants: NonNullable<StoredXmlConstantContext['arrays']> = []
  const xmlContainerConstants: NonNullable<StoredXmlConstantContext['containers']> = []
  const rowConstructors: NonNullable<StoredRowCoercionContext['constructors']> = []
  let omittedComplete = true
  let complete = true
  const expressionType = (node: Tree): string | null => {
    const field: Record<string, string> = {
      VAR: 'vartype',
      CONST: 'consttype',
      PARAM: 'paramtype',
      FUNCEXPR: 'funcresulttype',
      OPEXPR: 'opresulttype',
      NULLIFEXPR: 'opresulttype',
      CASEEXPR: 'casetype',
      COALESCEEXPR: 'coalescetype',
      MINMAXEXPR: 'minmaxtype',
      ARRAYEXPR: 'array_typeid',
      ROWEXPR: 'row_typeid',
      CASETESTEXPR: 'typeId',
      COERCETODOMAINVALUE: 'typeId',
      SQLVALUEFUNCTION: 'type',
      SUBSCRIPTINGREF: 'refrestype',
    }
    if (node.kind === 'COLLATEEXPR') {
      const arg = tree(node.fields['arg']?.[0])
      return arg ? expressionType(arg) : null
    }
    return scalar(node, field[node.kind] ?? 'resulttype')
  }
  const conversionKind = (node: Tree | null): 'io' | 'row' | 'function' | null => {
    if (!node) return null
    if (node.kind === 'COERCEVIAIO') return 'io'
    if (node.kind === 'CONVERTROWTYPEEXPR') return 'row'
    if (node.kind === 'FUNCEXPR') return 'function'
    if (node.kind === 'COERCETODOMAIN' || node.kind === 'RELABELTYPE')
      return conversionKind(tree(node.fields['arg']?.[0]))
    if (node.kind === 'ARRAYCOERCEEXPR') return conversionKind(tree(node.fields['elemexpr']?.[0]))
    return null
  }
  try {
    const visit = (value: Value, site?: string): void => {
      if (Array.isArray(value)) {
        value.forEach((v) => visit(v))
        return
      }
      const node = tree(value)
      if (!node) return
      if (node.kind === 'CONST' && arrayStorage?.roots.has(Number(scalar(node, 'consttype')))) {
        const raw = node.fields['constvalue'],
          data = Array.isArray(raw?.[1]) ? raw[1] : undefined
        const storage =
          scalar(node, 'constisnull') === 'true'
            ? null
            : scalar(node, 'constisnull') === 'false' &&
                scalar(node, 'constlen') === '-1' &&
                scalar(node, 'constbyval') === 'false' &&
                raw?.length === 2 &&
                data &&
                Number(raw[0]) === data.length &&
                data.every(
                  (v) =>
                    typeof v === 'string' &&
                    /^-?\d+$/u.test(v) &&
                    Number(v) >= -128 &&
                    Number(v) <= 255,
                )
              ? arrayConstantStorage(
                  Buffer.from(data.map((v) => Number(v) & 255)),
                  Number(scalar(node, 'consttype')),
                  arrayStorage.types,
                  arrayStorage.roots,
                )
              : undefined
        if (site === undefined || storage === undefined) complete = false
        else arrayConstants.push({ site, storage })
      }
      if (node.kind === 'CONST' && tsvectorTypes.has(Number(scalar(node, 'consttype')))) {
        const raw = node.fields['constvalue'],
          data = Array.isArray(raw?.[1]) ? raw[1] : undefined
        const storage =
          scalar(node, 'constisnull') === 'true'
            ? null
            : scalar(node, 'constisnull') === 'false' &&
                scalar(node, 'constlen') === '-1' &&
                scalar(node, 'constbyval') === 'false' &&
                raw?.length === 2 &&
                data &&
                Number(raw[0]) === data.length &&
                data.every(
                  (v) =>
                    typeof v === 'string' &&
                    /^-?\d+$/u.test(v) &&
                    Number(v) >= -128 &&
                    Number(v) <= 255,
                )
              ? tsvectorConstantStorage(Buffer.from(data.map((v) => Number(v) & 255)))
              : undefined
        if (site === undefined || storage === undefined) complete = false
        else tsvectorConstants.push({ site, storage })
      }
      if (node.kind === 'CONST' && tsqueryTypes.has(Number(scalar(node, 'consttype')))) {
        const raw = node.fields['constvalue'],
          data = Array.isArray(raw?.[1]) ? raw[1] : undefined
        const storage =
          scalar(node, 'constisnull') === 'true'
            ? null
            : scalar(node, 'constisnull') === 'false' &&
                scalar(node, 'constlen') === '-1' &&
                scalar(node, 'constbyval') === 'false' &&
                raw?.length === 2 &&
                data &&
                Number(raw[0]) === data.length &&
                data.every(
                  (v) =>
                    typeof v === 'string' &&
                    /^-?\d+$/u.test(v) &&
                    Number(v) >= -128 &&
                    Number(v) <= 255,
                )
              ? tsqueryConstantStorage(Buffer.from(data.map((v) => Number(v) & 255)), utf8)
              : undefined
        if (site === undefined || storage === undefined) complete = false
        else tsqueryConstants.push({ site, storage })
      }
      if (node.kind === 'CONST' && xmlTypes.has(Number(scalar(node, 'consttype')))) {
        const text = xmlConstantText(node, utf8)
        if (site === undefined || text === undefined) complete = false
        else constants.push({ site, text })
      }
      if (node.kind === 'CONST' && xmlArrays.has(Number(scalar(node, 'consttype')))) {
        const raw = node.fields['constvalue'],
          data = Array.isArray(raw?.[1]) ? raw[1] : undefined
        const text =
          scalar(node, 'constisnull') === 'true'
            ? null
            : scalar(node, 'constlen') === '-1' &&
                scalar(node, 'constbyval') === 'false' &&
                raw?.length === 2 &&
                data &&
                Number(raw[0]) === data.length &&
                data.every(
                  (v) =>
                    typeof v === 'string' &&
                    /^-?\d+$/u.test(v) &&
                    Number(v) >= -128 &&
                    Number(v) <= 255,
                )
              ? xmlArrayConstantText(
                  Buffer.from(data.map((v) => Number(v) & 255)),
                  xmlArrays.get(Number(scalar(node, 'consttype')))!,
                  utf8,
                )
              : undefined
        if (site === undefined || text === undefined) complete = false
        else xmlArrayConstants.push({ site, text })
      }
      if (
        node.kind === 'CONST' &&
        tsqueryContainers?.roots.has(Number(scalar(node, 'consttype')))
      ) {
        const raw = node.fields['constvalue'],
          data = Array.isArray(raw?.[1]) ? raw[1] : undefined
        const facet =
          scalar(node, 'constisnull') === 'true'
            ? null
            : scalar(node, 'constlen') === '-1' &&
                scalar(node, 'constbyval') === 'false' &&
                raw?.length === 2 &&
                data &&
                Number(raw[0]) === data.length &&
                data.every(
                  (v) =>
                    typeof v === 'string' &&
                    /^-?\d+$/u.test(v) &&
                    Number(v) >= -128 &&
                    Number(v) <= 255,
                )
              ? tsqueryContainerConstant(
                  Buffer.from(data.map((v) => Number(v) & 255)),
                  Number(scalar(node, 'consttype')),
                  tsqueryContainers.types,
                  utf8,
                )
              : undefined
        if (site === undefined || facet === undefined) complete = false
        else tsqueryContainerConstants.push({ site, storage: facet })
      }
      if (
        node.kind === 'CONST' &&
        tsvectorContainers?.roots.has(Number(scalar(node, 'consttype')))
      ) {
        const raw = node.fields['constvalue'],
          data = Array.isArray(raw?.[1]) ? raw[1] : undefined
        const facet =
          scalar(node, 'constisnull') === 'true'
            ? null
            : scalar(node, 'constlen') === '-1' &&
                scalar(node, 'constbyval') === 'false' &&
                raw?.length === 2 &&
                data &&
                Number(raw[0]) === data.length &&
                data.every(
                  (v) =>
                    typeof v === 'string' &&
                    /^-?\d+$/u.test(v) &&
                    Number(v) >= -128 &&
                    Number(v) <= 255,
                )
              ? tsvectorContainerConstant(
                  Buffer.from(data.map((v) => Number(v) & 255)),
                  Number(scalar(node, 'consttype')),
                  tsvectorContainers.types,
                )
              : undefined
        if (site === undefined || facet === undefined) complete = false
        else tsvectorContainerConstants.push({ site, storage: facet })
      }
      if (node.kind === 'CONST' && xmlContainers?.roots.has(Number(scalar(node, 'consttype')))) {
        const raw = node.fields['constvalue'],
          data = Array.isArray(raw?.[1]) ? raw[1] : undefined
        const facet =
          scalar(node, 'constisnull') === 'true'
            ? null
            : scalar(node, 'constlen') === '-1' &&
                scalar(node, 'constbyval') === 'false' &&
                raw?.length === 2 &&
                data &&
                Number(raw[0]) === data.length &&
                data.every(
                  (v) =>
                    typeof v === 'string' &&
                    /^-?\d+$/u.test(v) &&
                    Number(v) >= -128 &&
                    Number(v) <= 255,
                )
              ? xmlContainerConstant(
                  Buffer.from(data.map((v) => Number(v) & 255)),
                  Number(scalar(node, 'consttype')),
                  xmlContainers.types,
                  utf8,
                )
              : undefined
        if (site === undefined || facet === undefined) complete = false
        else xmlContainerConstants.push({ site, value: facet })
      }
      if (node.kind === 'ARRAYEXPR') {
        const type = arrayIdentities.get(Number(expressionType(node)))
        if (
          type !== undefined &&
          (type === 'pg_catalog.int2vector' ||
            type === 'pg_catalog.oidvector' ||
            type === 'pg_catalog._record' ||
            identities.get(Number(expressionType(node)))?.depth === 1)
        ) {
          const elementType = arrayIdentities.get(Number(scalar(node, 'element_typeid')))
          const dimensions = scalar(node, 'multidims')
          if (site === undefined || !elementType || !['true', 'false'].includes(dimensions ?? ''))
            complete = false
          else
            constructors.push({
              site,
              type,
              elementType,
              multidimensional: dimensions === 'true',
              members: Array.isArray(node.fields['elements']?.[0])
                ? node.fields['elements'][0].length
                : 0,
            })
        }
      }
      const isCast =
        ['COERCEVIAIO', 'CONVERTROWTYPEEXPR', 'ARRAYCOERCEEXPR'].includes(node.kind) ||
        (node.kind === 'FUNCEXPR' && ['1', '2'].includes(scalar(node, 'funcformat') ?? ''))
      let arrayConversion = false
      if (isCast) {
        const target = identities.get(Number(expressionType(node))),
          args = node.fields['args']?.[0],
          arg = tree(node.fields['arg']?.[0] ?? (Array.isArray(args) ? args[0] : undefined)),
          sourceType = arg ? expressionType(arg) : null,
          from = sourceType === null ? undefined : identities.get(Number(sourceType))
        if (target && sourceType === null) complete = false
        if (target && from && (target.identity !== from.identity || target.depth !== from.depth)) {
          const kind = conversionKind(node)
          if (!kind || target.depth !== from.depth) complete = false
          else {
            casts.push({
              source: from.identity,
              target: target.identity,
              depth: target.depth,
              kind,
              ...(site === undefined ? {} : { site }),
            })
            arrayConversion = node.kind === 'ARRAYCOERCEEXPR'
          }
        }
      }
      const at = (part: string) => (site === undefined ? undefined : site + '/' + part),
        child = (name: string, path = site) => node.fields[name]?.forEach((v) => visit(v, path)),
        list = (name: string): Value[] =>
          Array.isArray(node.fields[name]?.[0]) ? (node.fields[name]![0] as Value[]) : [],
        args = list('args')
      if (isCast || ['RELABELTYPE', 'COERCETODOMAIN', 'COLLATEEXPR'].includes(node.kind)) {
        if (node.kind === 'FUNCEXPR') {
          if (args[0]) visit(args[0], site)
        } else child('arg')
        if (node.kind === 'ARRAYCOERCEEXPR' && !arrayConversion)
          node.fields['elemexpr']?.forEach((v) => visit(v))
        return
      }
      if (['OPEXPR', 'DISTINCTEXPR', 'NULLIFEXPR', 'SCALARARRAYOPEXPR'].includes(node.kind)) {
        args.forEach((v, i) => visit(v, at('operator/' + i)))
        return
      }
      if (node.kind === 'XMLEXPR') {
        const name = scalar(node, 'name')
        if (name && name !== '<>') {
          if (site === undefined) complete = false
          else xmlNames.push({ site, name })
        }
        const names = list('arg_names')
        if (names.length) {
          if (site === undefined || names.some((n) => typeof n !== 'string')) complete = false
          else {
            const decoded = names.map((n) => JSON.parse(n as string) as unknown)
            if (decoded.some((n) => typeof n !== 'string')) complete = false
            else xmlArgumentNames.push({ site, names: decoded as string[] })
          }
        }
        args.forEach((v, i) => visit(v, at('xml/arg/' + i)))
        list('named_args').forEach((v, i) => visit(v, at('xml/named/' + i)))
        return
      }
      if (node.kind === 'BOOLEXPR') {
        const op = scalar(node, 'boolop')
        if (op === 'not' && args.length === 1 && tree(args[0])?.kind === 'DISTINCTEXPR')
          visit(args[0]!, site)
        else args.forEach((v, i) => visit(v, at('boolean/' + op + '/' + i)))
        return
      }
      if (node.kind === 'CASEEXPR') {
        child('arg', at('case/arg'))
        const simple = tree(node.fields['arg']?.[0]) !== null
        args.forEach((v, i) => {
          const when = tree(v)
          if (!when) return
          const condition = when.fields['expr']?.[0],
            expr = tree(condition),
            operands = expr?.fields['args']?.[0]
          visit(
            simple &&
              expr?.kind === 'OPEXPR' &&
              Array.isArray(operands) &&
              tree(operands[0])?.kind === 'CASETESTEXPR'
              ? operands[1]!
              : condition!,
            at('case/when/' + i + '/condition'),
          )
          when.fields['result']?.forEach((v) => visit(v, at('case/when/' + i + '/result')))
        })
        child('defresult', at('case/else'))
        return
      }
      if (['COALESCEEXPR', 'MINMAXEXPR', 'FUNCEXPR', 'ARRAYEXPR', 'ROWEXPR'].includes(node.kind)) {
        const role: Record<string, string> = {
            COALESCEEXPR: 'coalesce',
            MINMAXEXPR: 'minmax',
            FUNCEXPR: 'call',
            ARRAYEXPR: 'array',
            ROWEXPR: 'row',
          },
          values = node.kind === 'ARRAYEXPR' ? list('elements') : args,
          live =
            node.kind === 'ROWEXPR'
              ? identities.get(Number(expressionType(node)))?.fields
              : undefined
        if (live) {
          const omitted: NonNullable<StoredRowCoercionContext['constructors']>[number]['omitted'] =
            []
          for (const [position, value] of values.entries()) {
            if (live.includes(position)) continue
            const expression = rowExpressions
              ? storedRowExpression(value, rowExpressions)
              : undefined
            if (expression === undefined) omittedComplete = false
            else omitted.push({ position, expression })
          }
          if (site === undefined) omittedComplete = false
          else
            rowConstructors.push({
              site,
              type: identities.get(Number(expressionType(node)))!.identity,
              members: values.length,
              live,
              omitted,
            })
        }
        ;(live ? live.map((i) => values[i]!) : values).forEach((v, i) => {
          if (v !== undefined) visit(v, at(role[node.kind] + '/' + i))
        })
        return
      }
      if (['FIELDSELECT', 'NULLTEST', 'BOOLEANTEST', 'NAMEDARGEXPR'].includes(node.kind)) {
        child(
          'arg',
          node.kind === 'NAMEDARGEXPR'
            ? site
            : at(
                (
                  { FIELDSELECT: 'field', NULLTEST: 'nulltest', BOOLEANTEST: 'booltest' } as Record<
                    string,
                    string
                  >
                )[node.kind]!,
              ),
        )
        return
      }
      if (node.kind === 'SUBSCRIPTINGREF') {
        child('refexpr', at('subscript/base'))
        for (const [field, role] of [
          ['refupperindexpr', 'upper'],
          ['reflowerindexpr', 'lower'],
        ] as const)
          list(field).forEach((v, i) => visit(v, at('subscript/' + i + '/' + role)))
        return
      }
      if (node.kind === 'ROWCOMPAREEXPR') {
        for (const [name, index] of [
          ['largs', 0],
          ['rargs', 1],
        ] as const)
          list(name).forEach((v, i) => visit(v, at('operator/' + index + '/row/' + i)))
        return
      }
      for (const values of Object.values(node.fields)) values.forEach((v) => visit(v))
    }
    visit(parsedRoot ?? parseTree(source), '')
  } catch {
    complete = false
  }
  return {
    ...(arrayCandidate
      ? { arrayStorage: { definition, complete, constants: arrayConstants } }
      : {}),
    ...(casts.length || rowConstructors.length || !complete || !omittedComplete
      ? {
          row: {
            definition,
            complete: complete && omittedComplete,
            casts,
            ...(rowConstructors.length ? { constructors: rowConstructors } : {}),
          },
        }
      : {}),
    ...(constructors.length || !complete ? { arrays: { definition, complete, constructors } } : {}),
    ...(tsqueryCandidate
      ? {
          tsquery: {
            definition,
            complete,
            constants: tsqueryConstants,
            ...(tsqueryContainerConstants.length ? { containers: tsqueryContainerConstants } : {}),
          },
        }
      : {}),
    ...(tsvectorCandidate
      ? {
          tsvector: {
            definition,
            complete,
            constants: tsvectorConstants,
            ...(tsvectorContainerConstants.length
              ? { containers: tsvectorContainerConstants }
              : {}),
          },
        }
      : {}),
    ...(xmlCandidate
      ? {
          xml: {
            definition,
            complete,
            constants,
            ...(xmlNames.length ? { names: xmlNames } : {}),
            ...(xmlArgumentNames.length ? { argumentNames: xmlArgumentNames } : {}),
            ...(xmlArrayConstants.length ? { arrays: xmlArrayConstants } : {}),
            ...(xmlContainerConstants.length ? { containers: xmlContainerConstants } : {}),
          },
        }
      : {}),
  }
}

export function captureTsvectorConstantContext(
  source: string | null,
  definition: string,
  types: ReadonlySet<number>,
  rows: ReadonlyMap<number, RowCoercionIdentity>,
  containers?: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
): StoredTsvectorConstantContext | undefined {
  if (
    !source ||
    ![...source.matchAll(/:consttype\s+(\d+)/gu)].some(
      (m) => types.has(Number(m[1])) || containers?.roots.has(Number(m[1])),
    )
  )
    return undefined
  return captureExpressionCoercions(
    source,
    definition,
    rows,
    new Map(),
    new Set(),
    false,
    new Map(),
    undefined,
    types,
    containers,
  ).tsvector
}

export function captureTsqueryConstantContext(
  source: string | null,
  definition: string,
  types: ReadonlySet<number>,
  rows: ReadonlyMap<number, RowCoercionIdentity>,
  utf8: boolean,
  containers?: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
): StoredTsqueryConstantContext | undefined {
  if (
    !source ||
    ![...source.matchAll(/:consttype\s+(\d+)/gu)].some(
      (m) => types.has(Number(m[1])) || containers?.roots.has(Number(m[1])),
    )
  )
    return undefined
  return captureExpressionCoercions(
    source,
    definition,
    rows,
    new Map(),
    new Set(),
    utf8,
    new Map(),
    undefined,
    new Set(),
    undefined,
    undefined,
    undefined,
    types,
    containers,
  ).tsquery
}

export function captureTsqueryDefaultContexts(
  source: string | null,
  definitions: readonly (string | null)[],
  types: ReadonlySet<number>,
  rows: ReadonlyMap<number, RowCoercionIdentity>,
  utf8: boolean,
  containers?: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
): (StoredTsqueryConstantContext | null)[] {
  return captureDefaultContexts(
    source,
    definitions,
    new Set([...types, ...(containers?.roots ?? [])]),
    (root, definition) =>
      captureExpressionCoercions(
        source,
        definition,
        rows,
        new Map(),
        new Set(),
        utf8,
        new Map(),
        undefined,
        new Set(),
        undefined,
        root,
        undefined,
        types,
        containers,
      ).tsquery,
  )
}

function captureDefaultContexts<T>(
  source: string | null,
  definitions: readonly (string | null)[],
  roots: ReadonlySet<number>,
  capture: (root: Value, definition: string) => T | undefined,
): (T | null)[] {
  const contexts: (T | null)[] = definitions.map(() => null)
  if (!source) return contexts
  try {
    const nodes = parseTree(source),
      defaults = definitions.flatMap((definition, index) =>
        definition === null ? [] : [{ definition, index }],
      )
    if (!Array.isArray(nodes) || nodes.length !== defaults.length) return contexts
    const contains = (value: Value): boolean => {
      if (typeof value === 'string') return false
      if (Array.isArray(value)) return value.some(contains)
      return (
        (value.kind === 'CONST' && roots.has(Number(scalar(value, 'consttype')))) ||
        Object.values(value.fields).some((children) => children.some(contains))
      )
    }
    for (const [index, node] of nodes.entries())
      if (contains(node)) {
        const entry = defaults[index]!
        contexts[entry.index] = capture(node, entry.definition) ?? null
      }
  } catch {
    return definitions.map(() => null)
  }
  return contexts
}

export function captureTsvectorDefaultContexts(
  source: string | null,
  definitions: readonly (string | null)[],
  types: ReadonlySet<number>,
  rows: ReadonlyMap<number, RowCoercionIdentity>,
  containers: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
): (StoredTsvectorConstantContext | null)[] {
  return captureDefaultContexts(
    source,
    definitions,
    new Set([...types, ...containers.roots]),
    (root, definition) =>
      captureExpressionCoercions(
        source,
        definition,
        rows,
        new Map(),
        new Set(),
        false,
        new Map(),
        undefined,
        types,
        containers,
        root,
      ).tsvector,
  )
}

export function captureArrayConstantContext(
  source: string | null,
  definition: string,
  rows: ReadonlyMap<number, RowCoercionIdentity>,
  containers: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
): StoredArrayConstantContext | undefined {
  return captureExpressionCoercions(
    source,
    definition,
    rows,
    new Map(),
    new Set(),
    false,
    new Map(),
    undefined,
    new Set(),
    undefined,
    undefined,
    containers,
  ).arrayStorage
}

export function captureArrayDefaultContexts(
  source: string | null,
  definitions: readonly (string | null)[],
  rows: ReadonlyMap<number, RowCoercionIdentity>,
  containers: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
): (StoredArrayConstantContext | null)[] {
  return captureDefaultContexts(
    source,
    definitions,
    containers.roots,
    (root, definition) =>
      captureExpressionCoercions(
        source,
        definition,
        rows,
        new Map(),
        new Set(),
        false,
        new Map(),
        undefined,
        new Set(),
        undefined,
        root,
        containers,
      ).arrayStorage,
  )
}

export function captureXmlConstantContext(
  source: string | null,
  definition: string,
  types: ReadonlySet<number>,
  rows: ReadonlyMap<number, RowCoercionIdentity>,
  utf8: boolean,
  arrays: ReadonlyMap<number, number> = new Map(),
  containers?: { types: ReadonlyMap<number, ConstantStorageType>; roots: ReadonlySet<number> },
): StoredXmlConstantContext | undefined {
  if (
    !source ||
    (![...source.matchAll(/:consttype\s+(\d+)/gu)].some(
      (match) =>
        types.has(Number(match[1])) ||
        arrays.has(Number(match[1])) ||
        containers?.roots.has(Number(match[1])),
    ) &&
      !/\{XMLEXPR\b[^{}]*:name\s+(?!<>)(\S+)/u.test(source) &&
      !(/\{XMLEXPR\b/u.test(source) && /:arg_names\s+\(/u.test(source)))
  )
    return undefined
  return captureExpressionCoercions(
    source,
    definition,
    rows,
    new Map(),
    types,
    utf8,
    arrays,
    containers,
  ).xml
}

export function captureRowCoercionContext(
  source: string | null,
  definition: string,
  identities: ReadonlyMap<number, RowCoercionIdentity>,
  expressions?: StoredRowExpressionInput,
): StoredRowCoercionContext | undefined {
  return captureExpressionCoercions(
    source,
    definition,
    identities,
    new Map(),
    new Set(),
    false,
    new Map(),
    undefined,
    new Set(),
    undefined,
    undefined,
    undefined,
    new Set(),
    undefined,
    expressions,
  ).row
}

export function captureArrayConstructorContext(
  source: string | null,
  definition: string,
  identities: ReadonlyMap<number, string>,
  rows: ReadonlyMap<number, RowCoercionIdentity> = new Map(),
): StoredArrayConstructorContext | undefined {
  return captureExpressionCoercions(source, definition, rows, identities).arrays
}

export function captureDomainCoercionContext(
  source: string | null,
  definition: string,
  identities: ReadonlyMap<number, DomainCoercionIdentity>,
): StoredDomainCoercionContext | undefined {
  if (!source) return undefined
  if (
    !source.includes('{COERCETODOMAIN') &&
    ![...source.matchAll(/:(?:consttype|resulttype)\s+(\d+)/gu)].some((match) =>
      identities.has(Number(match[1])),
    )
  )
    return undefined
  const casts: StoredDomainCoercionContext['casts'] = []
  let complete = true
  try {
    const add = (node: Tree, field: string, constant = false): boolean => {
      const oid = scalar(node, field)
      const identity = oid === null ? undefined : identities.get(Number(oid))
      if (!identity) return false
      const format = constant
        ? '1'
        : (scalar(node, 'coercionformat') ??
          scalar(node, 'coerceformat') ??
          scalar(node, 'relabelformat'))
      if (!format || !['0', '1', '2', '3'].includes(format)) {
        complete = false
        return false
      }
      casts.push({
        schema: identity.schema,
        name: identity.name,
        array: identity.array,
        input: format === '2',
        constant,
      })
      return true
    }
    const visit = (value: Value, hiddenInput = false): void => {
      if (Array.isArray(value)) {
        value.forEach((item) => visit(item))
        return
      }
      const node = tree(value)
      if (!node) return
      if (node.kind === 'COERCETODOMAIN') {
        if (!add(node, 'resulttype')) complete = false
        for (const [key, values] of Object.entries(node.fields))
          for (const value of values) {
            const argument = tree(value)
            visit(
              value,
              key === 'arg' &&
                argument?.kind === 'COERCEVIAIO' &&
                scalar(argument, 'coerceformat') === '2',
            )
          }
        return
      }
      if (node.kind === 'CONST') add(node, 'consttype', true)
      if (!hiddenInput && (node.kind === 'COERCEVIAIO' || node.kind === 'RELABELTYPE'))
        add(node, 'resulttype')
      if (node.kind === 'ARRAYCOERCEEXPR' && add(node, 'resulttype')) {
        const element = tree(node.fields['elemexpr']?.[0])
        const identity = identities.get(Number(scalar(node, 'resulttype')))
        const elementIdentity = element
          ? identities.get(Number(scalar(element, 'resulttype')))
          : undefined
        if (
          !element ||
          element.kind !== 'COERCETODOMAIN' ||
          elementIdentity?.array !== false ||
          elementIdentity.schema !== identity?.schema ||
          elementIdentity.name !== identity?.name
        )
          complete = false
        for (const [key, values] of Object.entries(node.fields))
          if (key !== 'elemexpr') values.forEach((item) => visit(item))
        return
      }
      Object.values(node.fields).forEach((values) => values.forEach((item) => visit(item)))
    }
    visit(parseTree(source))
  } catch {
    complete = false
  }
  return casts.length || !complete ? { definition, complete, casts } : undefined
}
