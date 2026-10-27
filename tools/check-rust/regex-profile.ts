import type { PGlite } from '@electric-sql/pglite'

export async function captureRegexCharacterProfile(pg: PGlite) {
  const encoding = (
    await pg.query<{ value: string }>("SELECT current_setting('server_encoding') value")
  ).rows[0]!.value
  if (encoding !== 'UTF8') throw new Error('Regex character profiles require a UTF8 database')
  const classes = [
    'digit',
    'alpha',
    'upper',
    'space',
    'alnum',
    'ascii',
    'blank',
    'cntrl',
    'graph',
    'lower',
    'print',
    'punct',
    'xdigit',
    'word',
  ]
  const mask = classes
    .map((name, index) => `CASE WHEN c ~ '^[[:${name}:]]$' THEN ${2 ** index} ELSE 0 END`)
    .join('+')
  const ranges: number[] = [],
    cases: number[] = []
  const append = (first: number, last: number, mask: number) => {
    const size = ranges.length
    if (size && ranges[size - 2]! + 1 === first && ranges[size - 1] === mask)
      ranges[size - 2] = last
    else ranges.push(first, last, mask)
  }
  append(0, 0, 160)
  for (let first = 1; first <= 0x10ffff; first += 65536) {
    const last = Math.min(first + 65535, 0x10ffff)
    const result = await pg.query<{ point: number; lower: number; upper: number; mask: number }>(
      `SELECT point,
         CASE WHEN length(lower(c))=1 THEN ascii(lower(c)) ELSE -1 END lower,
         CASE WHEN length(upper(c))=1 THEN ascii(upper(c)) ELSE -1 END upper,
         (${mask}) mask
       FROM (SELECT point,chr(point) c FROM generate_series($1::int,$2::int) point
             WHERE point NOT BETWEEN 55296 AND 57343) chars ORDER BY point`,
      [first, last],
    )
    for (const item of result.rows) {
      if (item.point === 57344) append(55296, 57343, 0)
      if (item.lower < 0 || item.upper < 0)
        throw new Error('Regex character profiles require single-character case mappings')
      append(item.point, item.point, item.mask)
      if (item.lower !== item.point || item.upper !== item.point)
        cases.push(item.point, item.lower, item.upper)
    }
  }
  return { ranges, cases }
}
