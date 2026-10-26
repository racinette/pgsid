import { storedTextConstant } from './text-constant-storage.js'
import { isGeometryConstantType } from './geometry-constant-storage.js'
import { isSystemConstantType } from './system-constant-storage.js'
import { storedRowExpression, type StoredRowExpressionInput } from './stored-row-expressions.js'
import { parseTree, tree, scalar, oidList, type Value, type Tree } from './expression-tree.js'
import { storedOrderingKey } from './stored-row-orderings.js'
import { builtinBtreeComparisons } from '../postgres/builtins/inventory.js'
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
  const ownedConstantType = (id: number): boolean => {
    const seen = new Set<number>()
    const visit = (id: number): boolean => {
      if (seen.has(id)) return false
      seen.add(id)
      if (
        isGeometryConstantType(rowExpressions?.types.get(id)) ||
        isSystemConstantType(rowExpressions?.types.get(id)) ||
        ['pg_catalog."char"', 'pg_catalog.name', 'pg_catalog.refcursor'].includes(
          rowExpressions?.types.get(id) ?? '',
        )
      )
        return true
      const storage = rowExpressions?.storageTypes?.get(id),
        nested = storage?.kind === 'd' ? storage.base : rowExpressions?.arrayElements?.get(id)
      if (nested !== undefined && visit(nested)) return true
      if (storage?.kind === 'c') return storage.attributes.some((a) => !a.dropped && visit(a.type))
      if (storage?.kind === 'r' && storage.rangeSubtype) return visit(storage.rangeSubtype)
      if (storage?.kind === 'm' && storage.rangeType) return visit(storage.rangeType)
      return false
    }
    return visit(id)
  }
  const ownedCandidate =
    source !== null &&
    [...source.matchAll(/:consttype\s+(\d+)/gu)].some((m) => ownedConstantType(Number(m[1])))
  if (
    !source ||
    (!/\{(?:COERCEVIAIO|CONVERTROWTYPEEXPR|FUNCEXPR|ARRAYCOERCEEXPR|ROWEXPR|ROWCOMPAREEXPR|XMLEXPR)\s/u.test(
      source,
    ) &&
      !(arrayIdentities.size && /\{ARRAYEXPR\s/u.test(source)) &&
      !xmlCandidate &&
      !ownedCandidate &&
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
  const scalarRoots = new Map<string, Tree>()
  const scalarSites = new Set<string>()
  const calls: NonNullable<StoredRowCoercionContext['calls']> = []
  const domainSites = new Set<string>()
  let omittedComplete = true
  let complete = true
  const expressionType = (node: Tree): string | null => {
    if (node.kind === 'XMLEXPR') {
      if (scalar(node, 'op') !== '7') return scalar(node, 'type')
      return rowExpressions
        ? ([...rowExpressions.types]
            .find(([, name]) => name === 'pg_catalog.bool')?.[0]
            .toString() ?? null)
        : null
    }
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
      if (site !== undefined && !scalarRoots.has(site)) scalarRoots.set(site, node)
      if (site !== undefined && node.kind === 'COERCETODOMAIN') domainSites.add(site)
      if (
        site !== undefined &&
        node.kind === 'CONST' &&
        ownedConstantType(Number(scalar(node, 'consttype')))
      )
        scalarSites.add(site)
      if (site !== undefined && node.kind === 'FUNCEXPR') {
        const id = Number(scalar(node, 'funcid'))
        if (rowExpressions?.unavailableVariadics?.has(id)) omittedComplete = false
        else if (
          rowExpressions?.functions.get(id)?.variadic &&
          storedRowExpression(scalarRoots.get(site)!, rowExpressions) !== undefined
        )
          scalarSites.add(site)
      }
      if (site !== undefined && node.kind === 'FUNCEXPR') {
        const callable = rowExpressions?.functions.get(Number(scalar(node, 'funcid'))),
          args = node.fields['args']?.[0],
          values = Array.isArray(args) ? args : []
        if (
          callable &&
          rowExpressions?.types.has(Number(scalar(node, 'funcresulttype'))) &&
          (values.length < callable.args.length ||
            values.some((v) => tree(v)?.kind === 'NAMEDARGEXPR'))
        ) {
          const supplied = new Map<Value, unknown>()
          for (const [index, value] of values.entries()) {
            const named = tree(value),
              arg = named?.kind === 'NAMEDARGEXPR' ? named.fields['arg']?.[0] : value
            if (arg !== undefined)
              supplied.set(
                arg,
                storedRowExpression(arg, rowExpressions!) ?? { PgsidStoredArgument: { index } },
              )
          }
          const expression = storedRowExpression(node, { ...rowExpressions!, arguments: supplied })
          if (expression === undefined) omittedComplete = false
          else calls.push({ site, expression })
        }
      }
      if (
        node.kind === 'CONST' &&
        site?.includes('/row/') &&
        rowExpressions?.types.get(Number(scalar(node, 'consttype'))) === 'pg_catalog.jsonpath'
      )
        scalarSites.add(site)
      if (
        site !== undefined &&
        node.kind === 'FUNCEXPR' &&
        ['1', '2'].includes(scalar(node, 'funcformat') ?? '')
      ) {
        const callable = rowExpressions?.functions.get(Number(scalar(node, 'funcid')))
        const operands = node.fields['args']?.[0],
          operand = Array.isArray(operands) ? tree(operands[0]) : null,
          sourceType = operand ? expressionType(operand) : null
        if (
          rowExpressions &&
          !callable &&
          (!identities.has(Number(scalar(node, 'funcresulttype'))) ||
            sourceType === null ||
            !identities.has(Number(sourceType)))
        )
          omittedComplete = false
        if (
          callable &&
          scalar(node, 'funcformat') === '2' &&
          !domainSites.has(site) &&
          ((scalarRoots.get(site) !== node &&
            ['FUNCEXPR', 'RELABELTYPE', 'COERCEVIAIO', 'COLLATEEXPR'].includes(
              scalarRoots.get(site)!.kind,
            )) ||
            (['pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(callable.result) &&
              callable.args[0] === callable.result &&
              callable.args[1] === 'pg_catalog.int4' &&
              callable.args[2] === 'pg_catalog.bool' &&
              callable.args.length === 3))
        )
          scalarSites.add(site)
      }
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
        const text = storedTextConstant(node, utf8)
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
        if (
          site !== undefined &&
          rowExpressions &&
          storedRowExpression(scalarRoots.get(site)!, rowExpressions) !== undefined
        )
          scalarSites.add(site)
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
        else {
          const flatten = (values: Value[]): Value[] =>
            values.flatMap((value) => {
              const child = tree(value),
                nested = child?.fields['args']?.[0]
              return ['and', 'or'].includes(op ?? '') &&
                child?.kind === 'BOOLEXPR' &&
                scalar(child, 'boolop') === op &&
                Array.isArray(nested)
                ? flatten(nested)
                : [value]
            })
          flatten(args).forEach((v, i) => visit(v, at('boolean/' + op + '/' + i)))
        }
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
        if (site !== undefined && rowExpressions) {
          const expression = storedRowExpression(scalarRoots.get(site)!, rowExpressions)
          if (expression !== undefined) scalarSites.add(site)
          else {
            const operators = oidList(node, 'opnos'),
              families = oidList(node, 'opfamilies'),
              strategy = Number(scalar(node, 'cmptype'))
            if (
              !operators?.length ||
              operators.length !== families?.length ||
              operators.some((operator, i) => {
                const ordering = rowExpressions.orderings?.get(
                  storedOrderingKey(operator, families[i]!, strategy),
                )
                const defaults = ordering && builtinBtreeComparisons(ordering.operator)
                return (
                  !ordering ||
                  !defaults?.length ||
                  defaults.some(
                    (entry) =>
                      entry.comparator !== ordering.comparator ||
                      entry.strategy !== ordering.strategy,
                  )
                )
              })
            )
              omittedComplete = false
          }
        }
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
  const scalars: NonNullable<StoredRowCoercionContext['scalars']> = []
  for (const site of scalarSites) {
    const expression = rowExpressions
      ? storedRowExpression(scalarRoots.get(site)!, rowExpressions)
      : undefined
    if (expression === undefined) omittedComplete = false
    else scalars.push({ site, expression })
  }
  return {
    ...(arrayCandidate
      ? { arrayStorage: { definition, complete, constants: arrayConstants } }
      : {}),
    ...(casts.length ||
    rowConstructors.length ||
    scalars.length ||
    calls.length ||
    !complete ||
    !omittedComplete
      ? {
          row: {
            definition,
            complete: complete && omittedComplete,
            casts,
            ...(scalars.length ? { scalars } : {}),
            ...(calls.length ? { calls } : {}),
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
  const captured = captureExpressionCoercions(
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
  if (!expressions || !source) return captured
  if (captured) return { ...captured, scalars: captured.scalars ?? [] }
  try {
    if (!tree(parseTree(source))) return { definition, complete: false, casts: [], scalars: [] }
    return { definition, complete: true, casts: [], scalars: [] }
  } catch {
    return { definition, complete: false, casts: [], scalars: [] }
  }
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
  rows: ReadonlyMap<number, RowCoercionIdentity> = new Map(),
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
      if (node.kind === 'ROWEXPR') {
        const live = rows.get(Number(scalar(node, 'row_typeid')))?.fields,
          args = node.fields['args']?.[0]
        if (live && Array.isArray(args)) {
          args.forEach((arg, position) => {
            if (live.includes(position)) visit(arg)
          })
          return
        }
      }
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
