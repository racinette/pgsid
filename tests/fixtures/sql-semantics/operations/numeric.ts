import { numericSpecs, type NumericSpec } from './numeric-specs.js'
import { numericObservations } from './numeric-observations.generated.js'
import type { EvaluationCase } from './integer-addition.js'

function evaluationCase(fixture: NumericSpec): EvaluationCase {
  const expected = numericObservations[fixture.name]
  if (!expected) throw new Error(`Missing numeric observation: ${fixture.name}`)
  return { ...fixture, expected }
}

export const numericCases: readonly EvaluationCase[] = numericSpecs
  .filter((fixture) => !fixture.stress)
  .map(evaluationCase)
export const numericStressCases: readonly EvaluationCase[] = numericSpecs
  .filter((fixture) => fixture.stress)
  .map(evaluationCase)
