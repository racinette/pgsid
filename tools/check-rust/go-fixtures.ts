import { go, type GoExpression, type GoStatement } from '../../src/codegen/go/ast.js'

export function goFixtureBinding(input: GoExpression, prefix: string) {
  const statements: GoStatement[] = []
  const bind = (value: GoExpression): GoExpression => {
    let expression: GoExpression
    if (value.kind === 'call') expression = { ...value, arguments: value.arguments.map(bind) }
    else if (value.kind === 'composite')
      expression = {
        ...value,
        elements: value.elements.map((element) =>
          element.kind === 'key-value' ? { ...element, right: bind(element.right) } : bind(element),
        ),
      }
    else return value
    const name = go.ident(prefix + statements.length)
    statements.push(go.assign([name], [expression]))
    return name
  }
  const expression = bind(input)
  return { expression, statements }
}
