import { REGEX_ENGINE_PROFILES } from '../src/sql-semantics/regex/profiles.generated.js'
import {
  loadRegexConformanceVectors,
  regexCapabilityReport,
} from '../tests/fixtures/sql-semantics/regex/conformance.js'

const vectors = await loadRegexConformanceVectors()
const report = regexCapabilityReport(vectors, Object.values(REGEX_ENGINE_PROFILES))
if (!process.argv.includes('--check')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
