import { scalarSpecs } from '../tests/fixtures/sql-semantics/operations/scalar-specs.js'
import { generateSqlObservations } from './sql-observations.js'

await generateSqlObservations(scalarSpecs, 'scalar')
