export const description = 'an executable query-analysis test suite'

export const rule = `Keep each root query test as executable evidence for a
named analysis property, regression, mechanism, or cross-corpus comparison.
Use a directory-local suite when the behavior belongs exclusively to one
corpus rather than to the query-analysis harness as a whole.`

export async function lint() {}
