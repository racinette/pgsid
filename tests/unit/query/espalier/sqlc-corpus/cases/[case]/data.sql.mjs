export const description = 'optional pgsid-owned witness rows for one borrowed case'
export const optional = true
export const rule =
  'Keep witness data separate from the borrowed sqlc files and choose rows that adjudicate actual result contracts.'
export async function lint() {}
