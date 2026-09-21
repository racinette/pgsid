export const typescriptTemporalOverlapsHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  temporalOverlapsSupport: {
    dependencies: ['temporalArithmeticSupport', 'temporalMonthDays', 'SqlInterval', 'SqlTimeTz'],
    source: `function temporalUsecCompare(left: { usec: bigint }, right: { usec: bigint }): number {
  return left.usec === right.usec ? 0 : left.usec < right.usec ? -1 : 1
}
function temporalTimetzOrder(left: SqlTimeTz, right: SqlTimeTz): number {
  const leftGmt = left.usec + BigInt(left.zone) * 1000000n
  const rightGmt = right.usec + BigInt(right.zone) * 1000000n
  if (leftGmt !== rightGmt) return leftGmt < rightGmt ? -1 : 1
  if (left.zone !== right.zone) return left.zone < right.zone ? -1 : 1
  return 0
}
function temporalOverlaps<T>(ts1: T | null, te1: T | null, ts2: T | null, te2: T | null, compare: (left: T, right: T) => number): boolean | null {
  let ts1Null = ts1 === null
  let te1Null = te1 === null
  let ts2Null = ts2 === null
  let te2Null = te2 === null
  if (ts1Null) {
    if (te1Null) return null
    ts1 = te1
    te1Null = true
  } else if (!te1Null && compare(ts1 as T, te1 as T) > 0) {
    const swap = ts1
    ts1 = te1
    te1 = swap
  }
  if (ts2Null) {
    if (te2Null) return null
    ts2 = te2
    te2Null = true
  } else if (!te2Null && compare(ts2 as T, te2 as T) > 0) {
    const swap = ts2
    ts2 = te2
    te2 = swap
  }
  const order = compare(ts1 as T, ts2 as T)
  if (order > 0) {
    if (te2Null) return null
    if (compare(ts1 as T, te2 as T) < 0) return true
    if (te1Null) return null
    return false
  }
  if (order < 0) {
    if (te1Null) return null
    if (compare(ts2 as T, te1 as T) < 0) return true
    if (te2Null) return null
    return false
  }
  if (te1Null || te2Null) return null
  return true
}
function temporalItm2interval(year: number, month: number, day: number, hour: number, minute: number, second: number, usec: number): SqlInterval {
  const totalMonths = year * 12 + month
  if (totalMonths > 2147483647 || totalMonths < -2147483648) temporalError('22008')
  const time = BigInt(hour) * 3600000000n + BigInt(minute) * 60000000n + BigInt(second) * 1000000n + BigInt(usec)
  return temporalIntervalFinite(totalMonths, day, time)
}
function temporalTimestampAge(dt1: bigint, dt2: bigint): SqlInterval {
  const inf1 = temporalTimestampIsInf(dt1)
  const inf2 = temporalTimestampIsInf(dt2)
  if (inf1 < 0) {
    if (inf2 < 0) temporalError('22008')
    return temporalIntervalSentinel(-1)
  }
  if (inf1 > 0) {
    if (inf2 > 0) temporalError('22008')
    return temporalIntervalSentinel(1)
  }
  if (inf2 < 0) return temporalIntervalSentinel(1)
  if (inf2 > 0) return temporalIntervalSentinel(-1)
  const left = temporalTimestampCivilParts(dt1)
  const right = temporalTimestampCivilParts(dt2)
  let usec = left.fsec - right.fsec
  let sec = left.second - right.second
  let min = left.minute - right.minute
  let hour = left.hour - right.hour
  let mday = left.day - right.day
  let mon = left.month - right.month
  let year = left.year - right.year
  const negative = dt1 < dt2
  if (negative) {
    usec = -usec
    sec = -sec
    min = -min
    hour = -hour
    mday = -mday
    mon = -mon
    year = -year
  }
  while (usec < 0) {
    usec += 1000000
    sec--
  }
  while (sec < 0) {
    sec += 60
    min--
  }
  while (min < 0) {
    min += 60
    hour--
  }
  while (hour < 0) {
    hour += 24
    mday--
  }
  while (mday < 0) {
    mday += temporalMonthDays(negative ? left.year : right.year, negative ? left.month : right.month)
    mon--
  }
  while (mon < 0) {
    mon += 12
    year--
  }
  if (negative) {
    usec = -usec
    sec = -sec
    min = -min
    hour = -hour
    mday = -mday
    mon = -mon
    year = -year
  }
  return temporalItm2interval(year, mon, mday, hour, min, sec, usec)
}`,
  },
}

function wrap(
  name: string,
  args: string,
  result: string,
  body: string,
  extra: readonly string[] = [],
  support = true,
): void {
  typescriptTemporalOverlapsHelpers[name] = {
    dependencies: [...(support ? ['temporalOverlapsSupport'] : []), ...extra],
    source: `function ${name}(${args}): ${result} {
  ${body}
}`,
  }
}

wrap(
  'overlapsTime',
  'ts1: SqlTime | null, te1: SqlTime | null, ts2: SqlTime | null, te2: SqlTime | null',
  'boolean | null',
  'return temporalOverlaps(ts1, te1, ts2, te2, temporalUsecCompare)',
  ['SqlTime'],
)
wrap(
  'overlapsTimeIntervalInterval',
  'ts1: SqlTime | null, span1: SqlInterval | null, ts2: SqlTime | null, span2: SqlInterval | null',
  'boolean | null',
  'return overlapsTime(ts1, timePlInterval(ts1, span1), ts2, timePlInterval(ts2, span2))',
  ['SqlTime', 'SqlInterval', 'overlapsTime', 'timePlInterval'],
)
wrap(
  'overlapsTimeIntervalTime',
  'ts1: SqlTime | null, span1: SqlInterval | null, ts2: SqlTime | null, te2: SqlTime | null',
  'boolean | null',
  'return overlapsTime(ts1, timePlInterval(ts1, span1), ts2, te2)',
  ['SqlTime', 'SqlInterval', 'overlapsTime', 'timePlInterval'],
)
wrap(
  'overlapsTimeTimeInterval',
  'ts1: SqlTime | null, te1: SqlTime | null, ts2: SqlTime | null, span2: SqlInterval | null',
  'boolean | null',
  'return overlapsTime(ts1, te1, ts2, timePlInterval(ts2, span2))',
  ['SqlTime', 'SqlInterval', 'overlapsTime', 'timePlInterval'],
)
wrap(
  'overlapsTimestamp',
  'ts1: SqlTimestamp | null, te1: SqlTimestamp | null, ts2: SqlTimestamp | null, te2: SqlTimestamp | null',
  'boolean | null',
  'return temporalOverlaps(ts1, te1, ts2, te2, temporalUsecCompare)',
  ['SqlTimestamp'],
)
wrap(
  'overlapsTimestampIntervalInterval',
  'ts1: SqlTimestamp | null, span1: SqlInterval | null, ts2: SqlTimestamp | null, span2: SqlInterval | null',
  'boolean | null',
  'return overlapsTimestamp(ts1, timestampPlInterval(ts1, span1), ts2, timestampPlInterval(ts2, span2))',
  ['SqlTimestamp', 'SqlInterval', 'overlapsTimestamp', 'timestampPlInterval'],
)
wrap(
  'overlapsTimestampIntervalTimestamp',
  'ts1: SqlTimestamp | null, span1: SqlInterval | null, ts2: SqlTimestamp | null, te2: SqlTimestamp | null',
  'boolean | null',
  'return overlapsTimestamp(ts1, timestampPlInterval(ts1, span1), ts2, te2)',
  ['SqlTimestamp', 'SqlInterval', 'overlapsTimestamp', 'timestampPlInterval'],
)
wrap(
  'overlapsTimestampTimestampInterval',
  'ts1: SqlTimestamp | null, te1: SqlTimestamp | null, ts2: SqlTimestamp | null, span2: SqlInterval | null',
  'boolean | null',
  'return overlapsTimestamp(ts1, te1, ts2, timestampPlInterval(ts2, span2))',
  ['SqlTimestamp', 'SqlInterval', 'overlapsTimestamp', 'timestampPlInterval'],
)
wrap(
  'overlapsTimestamptz',
  'ts1: SqlTimestamptz | null, te1: SqlTimestamptz | null, ts2: SqlTimestamptz | null, te2: SqlTimestamptz | null',
  'boolean | null',
  'return temporalOverlaps(ts1, te1, ts2, te2, temporalUsecCompare)',
  ['SqlTimestamptz'],
)
wrap(
  'overlapsTimestamptzIntervalInterval',
  'ts1: SqlTimestamptz | null, span1: SqlInterval | null, ts2: SqlTimestamptz | null, span2: SqlInterval | null',
  'boolean | null',
  'return overlapsTimestamptz(ts1, timestamptzPlInterval(ts1, span1), ts2, timestamptzPlInterval(ts2, span2))',
  ['SqlTimestamptz', 'SqlInterval', 'overlapsTimestamptz', 'timestamptzPlInterval'],
)
wrap(
  'overlapsTimestamptzIntervalTimestamptz',
  'ts1: SqlTimestamptz | null, span1: SqlInterval | null, ts2: SqlTimestamptz | null, te2: SqlTimestamptz | null',
  'boolean | null',
  'return overlapsTimestamptz(ts1, timestamptzPlInterval(ts1, span1), ts2, te2)',
  ['SqlTimestamptz', 'SqlInterval', 'overlapsTimestamptz', 'timestamptzPlInterval'],
)
wrap(
  'overlapsTimestamptzTimestamptzInterval',
  'ts1: SqlTimestamptz | null, te1: SqlTimestamptz | null, ts2: SqlTimestamptz | null, span2: SqlInterval | null',
  'boolean | null',
  'return overlapsTimestamptz(ts1, te1, ts2, timestamptzPlInterval(ts2, span2))',
  ['SqlTimestamptz', 'SqlInterval', 'overlapsTimestamptz', 'timestamptzPlInterval'],
)
wrap(
  'overlapsTimetz',
  'ts1: SqlTimeTz | null, te1: SqlTimeTz | null, ts2: SqlTimeTz | null, te2: SqlTimeTz | null',
  'boolean | null',
  'return temporalOverlaps(ts1, te1, ts2, te2, temporalTimetzOrder)',
  ['SqlTimeTz'],
)
wrap(
  'ageTimestamp',
  'later: SqlTimestamp | null, earlier: SqlTimestamp | null',
  'SqlInterval | null',
  'if (later === null || earlier === null) return null\n  return temporalTimestampAge(later.usec, earlier.usec)',
  ['SqlTimestamp', 'SqlInterval'],
)
wrap(
  'ageTimestamptz',
  'later: SqlTimestamptz | null, earlier: SqlTimestamptz | null',
  'SqlInterval | null',
  'if (later === null || earlier === null) return null\n  return temporalTimestampAge(later.usec, earlier.usec)',
  ['SqlTimestamptz', 'SqlInterval'],
)
wrap(
  'dateLarger',
  'left: SqlDate | null, right: SqlDate | null',
  'SqlDate | null',
  'if (left === null || right === null) return null\n  return left.days > right.days ? left : right',
  ['SqlDate'],
  false,
)
wrap(
  'dateSmaller',
  'left: SqlDate | null, right: SqlDate | null',
  'SqlDate | null',
  'if (left === null || right === null) return null\n  return left.days < right.days ? left : right',
  ['SqlDate'],
  false,
)
wrap(
  'timeLarger',
  'left: SqlTime | null, right: SqlTime | null',
  'SqlTime | null',
  'if (left === null || right === null) return null\n  return left.usec > right.usec ? left : right',
  ['SqlTime'],
  false,
)
wrap(
  'timeSmaller',
  'left: SqlTime | null, right: SqlTime | null',
  'SqlTime | null',
  'if (left === null || right === null) return null\n  return left.usec < right.usec ? left : right',
  ['SqlTime'],
  false,
)
wrap(
  'timestampLarger',
  'left: SqlTimestamp | null, right: SqlTimestamp | null',
  'SqlTimestamp | null',
  'if (left === null || right === null) return null\n  return left.usec > right.usec ? left : right',
  ['SqlTimestamp'],
  false,
)
wrap(
  'timestampSmaller',
  'left: SqlTimestamp | null, right: SqlTimestamp | null',
  'SqlTimestamp | null',
  'if (left === null || right === null) return null\n  return left.usec < right.usec ? left : right',
  ['SqlTimestamp'],
  false,
)
wrap(
  'timestamptzLarger',
  'left: SqlTimestamptz | null, right: SqlTimestamptz | null',
  'SqlTimestamptz | null',
  'if (left === null || right === null) return null\n  return left.usec > right.usec ? left : right',
  ['SqlTimestamptz'],
  false,
)
wrap(
  'timestamptzSmaller',
  'left: SqlTimestamptz | null, right: SqlTimestamptz | null',
  'SqlTimestamptz | null',
  'if (left === null || right === null) return null\n  return left.usec < right.usec ? left : right',
  ['SqlTimestamptz'],
  false,
)
wrap(
  'timetzLarger',
  'left: SqlTimeTz | null, right: SqlTimeTz | null',
  'SqlTimeTz | null',
  'if (left === null || right === null) return null\n  const order = timetzCompare(left, right)\n  return order === null ? null : order > 0n ? left : right',
  ['SqlTimeTz', 'timetzCompare'],
  false,
)
wrap(
  'timetzSmaller',
  'left: SqlTimeTz | null, right: SqlTimeTz | null',
  'SqlTimeTz | null',
  'if (left === null || right === null) return null\n  const order = timetzCompare(left, right)\n  return order === null ? null : order < 0n ? left : right',
  ['SqlTimeTz', 'timetzCompare'],
  false,
)
wrap(
  'intervalLarger',
  'left: SqlInterval | null, right: SqlInterval | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  const order = intervalCompare(left, right)\n  return order === null ? null : order > 0n ? left : right',
  ['SqlInterval', 'intervalCompare'],
  false,
)
wrap(
  'intervalSmaller',
  'left: SqlInterval | null, right: SqlInterval | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  const order = intervalCompare(left, right)\n  return order === null ? null : order < 0n ? left : right',
  ['SqlInterval', 'intervalCompare'],
  false,
)
