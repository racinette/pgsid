import { beforeAll, expect, it } from 'vitest'
import { loadModule, parseSync } from 'libpg-query'
import {
  isExpandedRowComparison,
  alignExpandedBooleanArguments,
} from '../../src/sql-semantics/row-comparison-sites.js'
import { walkStoredExpression } from '../../src/sql-semantics/row-coercion-sites.js'

beforeAll(() => loadModule())
const expression = (sql: string) =>
  (
    parseSync('SELECT ' + sql).stmts![0]!.stmt as unknown as {
      SelectStmt: { targetList: { ResTarget: { val: unknown } }[] }
    }
  ).SelectStmt.targetList[0]!.ResTarget.val

it('distinguishes scalar expansion from datum comparisons and preserves actual stored nodes when grouping Boolean terms', () => {
  expect(
    isExpandedRowComparison(
      expression('ROW(a,b)::pair IS DISTINCT FROM ROW(c,d)::pair'),
      expression('a IS DISTINCT FROM c OR b IS DISTINCT FROM d'),
    ),
  ).toBe(true)
  expect(
    isExpandedRowComparison(
      expression('ROW(a)::pair IS NOT DISTINCT FROM ROW(b)::pair'),
      expression('NOT(a IS DISTINCT FROM b)'),
    ),
  ).toBe(true)
  expect(
    isExpandedRowComparison(
      expression('ROW(a,b)::pair = ROW(c,d)::pair'),
      expression('ROW(a,b)::pair = ROW(c,d)::pair'),
    ),
  ).toBe(false)
  expect(
    isExpandedRowComparison(
      expression('ROW(a)::pair IS DISTINCT FROM ROW(b)::pair'),
      expression('ROW(a)::pair IS DISTINCT FROM ROW(b)::pair'),
    ),
  ).toBe(false)
  expect(
    isExpandedRowComparison(
      expression('ROW(a,b)::pair IS DISTINCT FROM ROW(c,d)::pair'),
      expression('a IS DISTINCT FROM c OR b IS DISTINCT FROM d OR true'),
    ),
  ).toBe(false)
  const source = expression('(ROW(a,b)::pair IS DISTINCT FROM ROW(c,d)::pair) OR ready'),
    stored = expression('(a IS DISTINCT FROM c OR b IS DISTINCT FROM d) OR ready'),
    pairs = alignExpandedBooleanArguments(source, stored)!,
    nodes = (stored as { BoolExpr: { args: unknown[] } }).BoolExpr.args
  expect(pairs).toHaveLength(2)
  expect(pairs[0]!.selection?.operation).toBe('or')
  expect(pairs[0]!.selection?.nodes).toEqual(nodes.slice(0, 2))
  expect(pairs[1]!.stored).toBe(nodes[2])
})

it('assigns canonical semantic sites across associative parenthesization while retaining mixed Boolean boundaries', () => {
  const sites = (sql: string) => {
    const found: Record<string, string> = {}
    walkStoredExpression(expression(sql), (node, site) => {
      const column = (node as { ColumnRef?: { fields: { String: { sval: string } }[] } }).ColumnRef
      if (column) found[column.fields[0]!.String.sval] = site
    })
    return found
  }
  expect(sites('(a OR b) OR c')).toEqual(sites('a OR (b OR c)'))
  expect(sites('(a AND b) AND c')).toEqual(sites('a AND (b AND c)'))
  expect(sites('a OR (b AND c)')).toEqual({
    a: '/boolean/or/0',
    b: '/boolean/or/1/boolean/and/0',
    c: '/boolean/or/1/boolean/and/1',
  })
})
