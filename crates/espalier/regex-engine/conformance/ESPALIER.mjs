export const description = 'stored PostgreSQL regex observations and their generators'
export const guidance = `
The observations are the engine's behavioral oracle, recorded from PostgreSQL
through PGlite. Change a case by changing its generator and regenerating. The
stress and targeted generators take \`--check\`, which confirms their stored
files still reproduce.
`
