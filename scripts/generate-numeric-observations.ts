import { numericSpecs } from '../tests/fixtures/sql-semantics/operations/numeric-specs.js'
import { generateSqlObservations } from './sql-observations.js'

await generateSqlObservations(numericSpecs, 'numeric')
