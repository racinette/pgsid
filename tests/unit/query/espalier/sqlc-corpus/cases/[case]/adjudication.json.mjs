export const description =
  'an optional PostgreSQL-backed disposition of sqlc and pgsid disagreements'
export const optional = true
export const rule =
  'Record only conclusions supported by this case witness data and keep adjudicatedAgainst aligned with the sqlc release being judged.'
export async function lint() {}
