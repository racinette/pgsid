import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    // The exhaustive query suites each host a PGlite instance and are both
    // CPU- and memory-heavy. Letting Vitest match all 16 logical CPUs makes
    // those workers starve one another badly enough for a 63-second isolated
    // setup to hit its 240-second suite limit. Match the eight physical cores
    // instead; this preserves file parallelism without oversubscribing them.
    maxWorkers: 8,
    include: ['tests/**/*.test.ts'],
    // Coverage is a DORMANCY map, not a quality score. The question it
    // answers is "which conservative guards has the corpus never made fire",
    // and an unfired guard is a case nobody has invented yet rather than a
    // line to delete (tests/unit/query/AGENTS.md rule 1). Off by default —
    // it costs a run and answers nothing on a green suite.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'json'],
      reportsDirectory: './coverage',
      // Never fail a run on a threshold. A number here would turn a map of
      // unexplored input space into a chore.
      thresholds: undefined,
    },
  },
})
