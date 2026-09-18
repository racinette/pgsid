import { numericSpecs } from './numeric-specs.js'
import { numericObservations } from './numeric-observations.generated.js'
import type { EvaluationCase } from './integer-addition.js'

export const numericCases: readonly EvaluationCase[] = numericSpecs.map((fixture) => {
  const expected = numericObservations[fixture.name]
  if (!expected) throw new Error(`Missing numeric observation: ${fixture.name}`)
  return { ...fixture, expected }
})
