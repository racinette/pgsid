import { scalarSpecs } from './scalar-specs.js'
import type { ExpressionSpec } from './expression-spec.js'
import { scalarObservations } from './scalar-observations.generated.js'
import type { EvaluationCase } from './integer-addition.js'

function evaluationCase(fixture: ExpressionSpec): EvaluationCase {
  const expected = scalarObservations[fixture.name]
  if (!expected) throw new Error(`Missing scalar observation: ${fixture.name}`)
  return { ...fixture, expected }
}

export const scalarCases: readonly EvaluationCase[] = scalarSpecs
  .filter((fixture) => !fixture.stress)
  .map(evaluationCase)
