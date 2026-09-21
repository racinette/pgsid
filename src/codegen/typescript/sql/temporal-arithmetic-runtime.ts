export const typescriptTemporalArithmeticHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  temporalArithmeticSupport: {
    dependencies: [
      'SqlDate',
      'SqlTime',
      'SqlTimestamp',
      'SqlInterval',
      'SqlTimestamptz',
      'SqlTimeTz',
      'temporalError',
      'temporalDate2j',
      'temporalJ2date',
      'temporalMonthDays',
      'sqlDivisionByZeroError',
    ],
    source: `function temporalRint(value: number): number {
  if (!Number.isFinite(value)) return value
  const floor = Math.floor(value)
  const fraction = value - floor
  if (fraction < 0.5) return floor
  if (fraction > 0.5) return floor + 1
  return floor % 2 === 0 ? floor : floor + 1
}
function temporalTsRound(value: number): number {
  return temporalRint(value * 1e6) / 1e6
}
function temporalFloatFitsInt32(value: number): boolean {
  return value >= -2147483648 && value < 2147483648
}
function temporalFloatFitsInt64(value: number): boolean {
  return value >= -(2 ** 63) && value < 2 ** 63
}
function temporalAddInt32(left: number, right: number): number {
  const result = left + right
  if (result > 2147483647 || result < -2147483648) temporalError('22008')
  return result
}
function temporalAddInt64(left: bigint, right: bigint): bigint {
  const result = left + right
  if (result > 9223372036854775807n || result < -9223372036854775808n) temporalError('22008')
  return result
}
function temporalSubInt64(left: bigint, right: bigint): bigint {
  const result = left - right
  if (result > 9223372036854775807n || result < -9223372036854775808n) temporalError('22008')
  return result
}
function temporalDateIsInf(days: number): number {
  if (days === 2147483647) return 1
  if (days === -2147483648) return -1
  return 0
}
function temporalTimestampIsInf(usec: bigint): number {
  if (usec === 9223372036854775807n) return 1
  if (usec === -9223372036854775808n) return -1
  return 0
}
function temporalIntervalIsInf(value: SqlInterval): number {
  if (value.month === 2147483647 && value.day === 2147483647 && value.time === 9223372036854775807n) return 1
  if (value.month === -2147483648 && value.day === -2147483648 && value.time === -9223372036854775808n) return -1
  return 0
}
function temporalIntervalSentinel(sign: number): SqlInterval {
  return sign < 0
    ? new SqlInterval(-2147483648, -2147483648, -9223372036854775808n)
    : new SqlInterval(2147483647, 2147483647, 9223372036854775807n)
}
function temporalIntervalFinite(month: number, day: number, time: bigint): SqlInterval {
  const value = new SqlInterval(month, day, time)
  if (temporalIntervalIsInf(value) !== 0) temporalError('22008')
  return value
}
function temporalIntervalSign(value: SqlInterval): number {
  const span = value.time + (BigInt(value.month) * 30n + BigInt(value.day)) * 86400000000n
  return span === 0n ? 0 : span < 0n ? -1 : 1
}
function temporalValidDate(days: number): boolean {
  return days >= -2451545 && days < 2145031949
}
function temporalValidTimestamp(usec: bigint): boolean {
  return usec >= -211813488000000000n && usec < 9223371331200000000n
}
function temporalTimestampFromCivil(year: number, month: number, day: number, hour: number, minute: number, second: number, fsec: number): bigint {
  const days = temporalDate2j(year, month, day) - 2451545
  const usec = BigInt(days) * 86400000000n + BigInt(hour) * 3600000000n + BigInt(minute) * 60000000n + BigInt(second) * 1000000n + BigInt(fsec)
  if (!temporalValidTimestamp(usec)) temporalError('22008')
  return usec
}
function temporalTimestampCivilParts(usec: bigint): { year: number; month: number; day: number; hour: number; minute: number; second: number; fsec: number } {
  let days = usec / 86400000000n
  let time = usec % 86400000000n
  if (time < 0n) { time += 86400000000n; days -= 1n }
  const julian = Number(days) + 2451545
  if (julian < 0 || julian > 2147483647) temporalError('22008')
  const { year, month, day } = temporalJ2date(julian)
  const hour = Number(time / 3600000000n)
  const rest = time % 3600000000n
  const minute = Number(rest / 60000000n)
  const seconds = rest % 60000000n
  return { year, month, day, hour, minute, second: Number(seconds / 1000000n), fsec: Number(seconds % 1000000n) }
}
function temporalAddMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = temporalAddInt32(month, delta)
  if (total > 12) {
    year += Math.trunc((total - 1) / 12)
    month = ((total - 1) % 12) + 1
  } else if (total < 1) {
    year += Math.trunc(total / 12) - 1
    month = total % 12 + 12
  } else month = total
  return { year, month }
}
function temporalTimestampAddInterval(usec: bigint, span: SqlInterval): bigint {
  const stampInf = temporalTimestampIsInf(usec)
  const spanInf = temporalIntervalIsInf(span)
  if (spanInf < 0) {
    if (stampInf > 0) temporalError('22008')
    return -9223372036854775808n
  }
  if (spanInf > 0) {
    if (stampInf < 0) temporalError('22008')
    return 9223372036854775807n
  }
  if (stampInf !== 0) return usec
  if (span.month !== 0) {
    const parts = temporalTimestampCivilParts(usec)
    const shifted = temporalAddMonths(parts.year, parts.month, span.month)
    const last = temporalMonthDays(shifted.year, shifted.month)
    const day = parts.day > last ? last : parts.day
    usec = temporalTimestampFromCivil(shifted.year, shifted.month, day, parts.hour, parts.minute, parts.second, parts.fsec)
  }
  if (span.day !== 0) {
    const parts = temporalTimestampCivilParts(usec)
    const julian = temporalAddInt32(temporalDate2j(parts.year, parts.month, parts.day), span.day)
    if (julian < 0) temporalError('22008')
    const { year, month, day } = temporalJ2date(julian)
    usec = temporalTimestampFromCivil(year, month, day, parts.hour, parts.minute, parts.second, parts.fsec)
  }
  usec = temporalAddInt64(usec, span.time)
  if (!temporalValidTimestamp(usec)) temporalError('22008')
  return usec
}
function temporalTimeWrap(usec: bigint): bigint {
  usec = BigInt.asIntN(64, usec)
  usec -= usec / 86400000000n * 86400000000n
  if (usec < 0n) usec += 86400000000n
  return usec
}
function temporalIntervalNeg(span: SqlInterval): SqlInterval {
  const inf = temporalIntervalIsInf(span)
  if (inf !== 0) return temporalIntervalSentinel(-inf)
  const month = temporalAddInt32(0, -span.month)
  const day = temporalAddInt32(0, -span.day)
  const time = temporalSubInt64(0n, span.time)
  return temporalIntervalFinite(month, day, time)
}
function temporalIntervalAdd(left: SqlInterval, right: SqlInterval): SqlInterval {
  const leftInf = temporalIntervalIsInf(left)
  const rightInf = temporalIntervalIsInf(right)
  if (leftInf < 0) {
    if (rightInf > 0) temporalError('22008')
    return temporalIntervalSentinel(-1)
  }
  if (leftInf > 0) {
    if (rightInf < 0) temporalError('22008')
    return temporalIntervalSentinel(1)
  }
  if (rightInf !== 0) return temporalIntervalSentinel(rightInf)
  return temporalIntervalFinite(temporalAddInt32(left.month, right.month), temporalAddInt32(left.day, right.day), temporalAddInt64(left.time, right.time))
}
function temporalIntervalSub(left: SqlInterval, right: SqlInterval): SqlInterval {
  const leftInf = temporalIntervalIsInf(left)
  const rightInf = temporalIntervalIsInf(right)
  if (leftInf < 0) {
    if (rightInf < 0) temporalError('22008')
    return temporalIntervalSentinel(-1)
  }
  if (leftInf > 0) {
    if (rightInf > 0) temporalError('22008')
    return temporalIntervalSentinel(1)
  }
  if (rightInf < 0) return temporalIntervalSentinel(1)
  if (rightInf > 0) return temporalIntervalSentinel(-1)
  const month = left.month - right.month
  const day = left.day - right.day
  const time = left.time - right.time
  if (month > 2147483647 || month < -2147483648 || day > 2147483647 || day < -2147483648) temporalError('22008')
  if (time > 9223372036854775807n || time < -9223372036854775808n) temporalError('22008')
  return temporalIntervalFinite(month, day, time)
}
function temporalIntervalMul(span: SqlInterval, factor: number, divide: boolean): SqlInterval {
  if (divide && factor === 0) throw new SqlDivisionByZeroError()
  if (Number.isNaN(factor)) temporalError('22008')
  const inf = temporalIntervalIsInf(span)
  if (inf !== 0) {
    if (divide ? !Number.isFinite(factor) : factor === 0) temporalError('22008')
    return factor < 0 ? temporalIntervalNeg(span) : new SqlInterval(span.month, span.day, span.time)
  }
  if (!divide && !Number.isFinite(factor)) {
    const sign = temporalIntervalSign(span)
    if (sign === 0) temporalError('22008')
    return temporalIntervalSentinel(factor * sign < 0 ? -1 : 1)
  }
  const monthProduct = divide ? span.month / factor : span.month * factor
  const dayProduct = divide ? span.day / factor : span.day * factor
  if (Number.isNaN(monthProduct) || !temporalFloatFitsInt32(monthProduct) || Number.isNaN(dayProduct) || !temporalFloatFitsInt32(dayProduct)) temporalError('22008')
  let month = Math.trunc(monthProduct)
  let day = Math.trunc(dayProduct)
  let monthRemainder = temporalTsRound((monthProduct - month) * 30)
  let secRemainder = temporalTsRound((dayProduct - day + monthRemainder - Math.trunc(monthRemainder)) * 86400)
  if (Math.abs(secRemainder) >= 86400) {
    const extra = Math.trunc(secRemainder / 86400)
    day = temporalAddInt32(day, extra)
    secRemainder -= extra * 86400
  }
  day = temporalAddInt32(day, Math.trunc(monthRemainder))
  const timeValue = temporalRint(Number(span.time) * (divide ? 1 / factor : factor) + secRemainder * 1e6)
  if (Number.isNaN(timeValue) || !temporalFloatFitsInt64(timeValue)) temporalError('22008')
  const time = BigInt(timeValue)
  return temporalIntervalFinite(month, day, time)
}
function temporalTModulo(time: bigint): { time: bigint; days: number } {
  const days = time / 86400000000n
  if (days !== 0n) time -= days * 86400000000n
  if (days > 2147483647n || days < -2147483648n) temporalError('22008')
  return { time, days: Number(days) }
}
function temporalJustifyHours(span: SqlInterval): SqlInterval {
  if (temporalIntervalIsInf(span) !== 0) return new SqlInterval(span.month, span.day, span.time)
  const split = temporalTModulo(span.time)
  let day = temporalAddInt32(span.day, split.days)
  let time = split.time
  if (day > 0 && time < 0n) { time += 86400000000n; day-- }
  else if (day < 0 && time > 0n) { time -= 86400000000n; day++ }
  return new SqlInterval(span.month, day, time)
}
function temporalJustifyDays(span: SqlInterval): SqlInterval {
  if (temporalIntervalIsInf(span) !== 0) return new SqlInterval(span.month, span.day, span.time)
  const whole = Math.trunc(span.day / 30)
  let day = span.day - whole * 30
  let month = temporalAddInt32(span.month, whole)
  if (month > 0 && day < 0) { day += 30; month-- }
  else if (month < 0 && day > 0) { day -= 30; month++ }
  return new SqlInterval(month, day, span.time)
}
function temporalJustifyInterval(span: SqlInterval): SqlInterval {
  if (temporalIntervalIsInf(span) !== 0) return new SqlInterval(span.month, span.day, span.time)
  let month = span.month
  let day = span.day
  let time = span.time
  if (day > 0 && time > 0n || day < 0 && time < 0n) {
    const whole = Math.trunc(day / 30)
    day -= whole * 30
    month = temporalAddInt32(month, whole)
  }
  const split = temporalTModulo(time)
  day += split.days
  time = split.time
  const whole = Math.trunc(day / 30)
  day -= whole * 30
  month = temporalAddInt32(month, whole)
  if (month > 0 && (day < 0 || day === 0 && time < 0n)) { day += 30; month-- }
  else if (month < 0 && (day > 0 || day === 0 && time > 0n)) { day -= 30; month++ }
  if (day > 0 && time < 0n) { time += 86400000000n; day-- }
  else if (day < 0 && time > 0n) { time -= 86400000000n; day++ }
  return new SqlInterval(month, day, time)
}
function temporalDateToTimestamp(days: number): bigint {
  const inf = temporalDateIsInf(days)
  if (inf > 0) return 9223372036854775807n
  if (inf < 0) return -9223372036854775808n
  if (days >= 106751983) temporalError('22008')
  return BigInt(days) * 86400000000n
}
function temporalDateToTimestampOverflow(days: number): { usec: bigint; overflow: number } {
  const inf = temporalDateIsInf(days)
  if (inf > 0) return { usec: 9223372036854775807n, overflow: 0 }
  if (inf < 0) return { usec: -9223372036854775808n, overflow: 0 }
  if (days >= 106751983) return { usec: 9223372036854775807n, overflow: 1 }
  return { usec: BigInt(days) * 86400000000n, overflow: 0 }
}
function temporalTimestampToDate(usec: bigint): number {
  const inf = temporalTimestampIsInf(usec)
  if (inf > 0) return 2147483647
  if (inf < 0) return -2147483648
  let days = usec / 86400000000n
  let time = usec % 86400000000n
  if (time < 0n) { time += 86400000000n; days -= 1n }
  return Number(days)
}
function temporalTimestampToTime(usec: bigint): bigint | null {
  if (temporalTimestampIsInf(usec) !== 0) return null
  let time = usec % 86400000000n
  if (time < 0n) time += 86400000000n
  return time
}
function temporalDateAddInt(days: number, amount: number): number {
  if (temporalDateIsInf(days) !== 0) return days
  const result = days + amount
  if (result > 2147483647 || result < -2147483648 || !temporalValidDate(result)) temporalError('22008')
  return result
}
function temporalDateSubInt(days: number, amount: number): number {
  if (temporalDateIsInf(days) !== 0) return days
  const result = days - amount
  if (result > 2147483647 || result < -2147483648 || !temporalValidDate(result)) temporalError('22008')
  return result
}
function temporalTimestampSub(left: bigint, right: bigint): SqlInterval {
  const leftInf = temporalTimestampIsInf(left)
  const rightInf = temporalTimestampIsInf(right)
  if (leftInf !== 0 || rightInf !== 0) {
    if (leftInf < 0) {
      if (rightInf < 0) temporalError('22008')
      return temporalIntervalSentinel(-1)
    }
    if (leftInf > 0) {
      if (rightInf > 0) temporalError('22008')
      return temporalIntervalSentinel(1)
    }
    return temporalIntervalSentinel(rightInf < 0 ? 1 : -1)
  }
  return temporalJustifyHours(new SqlInterval(0, 0, temporalSubInt64(left, right)))
}
function temporalDateTimestampOrder(days: number, usec: bigint): bigint {
  const converted = temporalDateToTimestampOverflow(days)
  if (converted.overflow > 0) return temporalTimestampIsInf(usec) > 0 ? -1n : 1n
  return usec === converted.usec ? 0n : converted.usec < usec ? -1n : 1n
}`,
  },
}

function wrap(
  name: string,
  args: string,
  result: string,
  body: string,
  extra: readonly string[] = [],
): void {
  typescriptTemporalArithmeticHelpers[name] = {
    dependencies: ['temporalArithmeticSupport', ...extra],
    source: `function ${name}(${args}): ${result} {
  ${body}
}`,
  }
}

wrap(
  'datePlInt',
  'left: SqlDate | null, right: bigint | null',
  'SqlDate | null',
  'if (left === null || right === null) return null\n  return new SqlDate(temporalDateAddInt(left.days, Number(right)))',
  ['SqlDate'],
)
wrap(
  'intPlDate',
  'left: bigint | null, right: SqlDate | null',
  'SqlDate | null',
  'return datePlInt(right, left)',
  ['SqlDate', 'datePlInt'],
)
wrap(
  'dateMiInt',
  'left: SqlDate | null, right: bigint | null',
  'SqlDate | null',
  'if (left === null || right === null) return null\n  return new SqlDate(temporalDateSubInt(left.days, Number(right)))',
  ['SqlDate'],
)
wrap(
  'dateMiDate',
  'left: SqlDate | null, right: SqlDate | null',
  'bigint | null',
  "if (left === null || right === null) return null\n  if (temporalDateIsInf(left.days) !== 0 || temporalDateIsInf(right.days) !== 0) temporalError('22008')\n  return BigInt(left.days - right.days)",
)
wrap(
  'datePlInterval',
  'left: SqlDate | null, right: SqlInterval | null',
  'SqlTimestamp | null',
  'if (left === null || right === null) return null\n  return new SqlTimestamp(temporalTimestampAddInterval(temporalDateToTimestamp(left.days), right))',
  ['SqlDate', 'SqlInterval', 'SqlTimestamp'],
)
wrap(
  'intervalPlDate',
  'left: SqlInterval | null, right: SqlDate | null',
  'SqlTimestamp | null',
  'return datePlInterval(right, left)',
  ['SqlInterval', 'SqlDate', 'SqlTimestamp', 'datePlInterval'],
)
wrap(
  'dateMiInterval',
  'left: SqlDate | null, right: SqlInterval | null',
  'SqlTimestamp | null',
  'if (left === null || right === null) return null\n  return new SqlTimestamp(temporalTimestampAddInterval(temporalDateToTimestamp(left.days), temporalIntervalNeg(right)))',
  ['SqlDate', 'SqlInterval', 'SqlTimestamp'],
)
wrap(
  'datePlTime',
  'left: SqlDate | null, right: SqlTime | null',
  'SqlTimestamp | null',
  "if (left === null || right === null) return null\n  const usec = temporalDateToTimestamp(left.days)\n  if (temporalTimestampIsInf(usec) !== 0) return new SqlTimestamp(usec)\n  const result = usec + right.usec\n  if (!temporalValidTimestamp(result)) temporalError('22008')\n  return new SqlTimestamp(result)",
  ['SqlDate', 'SqlTime', 'SqlTimestamp'],
)
wrap(
  'timePlDate',
  'left: SqlTime | null, right: SqlDate | null',
  'SqlTimestamp | null',
  'return datePlTime(right, left)',
  ['SqlTime', 'SqlDate', 'SqlTimestamp', 'datePlTime'],
)
wrap(
  'datePlTimetz',
  'left: SqlDate | null, right: SqlTimeTz | null',
  'SqlTimestamptz | null',
  "if (left === null || right === null) return null\n  const inf = temporalDateIsInf(left.days)\n  if (inf > 0) return new SqlTimestamptz(9223372036854775807n)\n  if (inf < 0) return new SqlTimestamptz(-9223372036854775808n)\n  if (left.days >= 106751983) temporalError('22008')\n  const result = BigInt(left.days) * 86400000000n + right.usec + BigInt(right.zone) * 1000000n\n  if (!temporalValidTimestamp(result)) temporalError('22008')\n  return new SqlTimestamptz(result)",
  ['SqlDate', 'SqlTimeTz', 'SqlTimestamptz'],
)
wrap(
  'timetzPlDate',
  'left: SqlTimeTz | null, right: SqlDate | null',
  'SqlTimestamptz | null',
  'return datePlTimetz(right, left)',
  ['SqlTimeTz', 'SqlDate', 'SqlTimestamptz', 'datePlTimetz'],
)
wrap(
  'timestampPlInterval',
  'left: SqlTimestamp | null, right: SqlInterval | null',
  'SqlTimestamp | null',
  'if (left === null || right === null) return null\n  return new SqlTimestamp(temporalTimestampAddInterval(left.usec, right))',
  ['SqlTimestamp', 'SqlInterval'],
)
wrap(
  'intervalPlTimestamp',
  'left: SqlInterval | null, right: SqlTimestamp | null',
  'SqlTimestamp | null',
  'return timestampPlInterval(right, left)',
  ['SqlInterval', 'SqlTimestamp', 'timestampPlInterval'],
)
wrap(
  'timestampMiInterval',
  'left: SqlTimestamp | null, right: SqlInterval | null',
  'SqlTimestamp | null',
  'if (left === null || right === null) return null\n  return new SqlTimestamp(temporalTimestampAddInterval(left.usec, temporalIntervalNeg(right)))',
  ['SqlTimestamp', 'SqlInterval'],
)
wrap(
  'timestampMiTimestamp',
  'left: SqlTimestamp | null, right: SqlTimestamp | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  return temporalTimestampSub(left.usec, right.usec)',
  ['SqlTimestamp', 'SqlInterval'],
)
wrap(
  'timestamptzPlInterval',
  'left: SqlTimestamptz | null, right: SqlInterval | null',
  'SqlTimestamptz | null',
  'const result = timestampPlInterval(left === null ? null : new SqlTimestamp(left.usec), right)\n  return result === null ? null : new SqlTimestamptz(result.usec)',
  ['SqlTimestamptz', 'SqlInterval', 'SqlTimestamp', 'timestampPlInterval'],
)
wrap(
  'intervalPlTimestamptz',
  'left: SqlInterval | null, right: SqlTimestamptz | null',
  'SqlTimestamptz | null',
  'return timestamptzPlInterval(right, left)',
  ['SqlInterval', 'SqlTimestamptz', 'timestamptzPlInterval'],
)
wrap(
  'timestamptzMiInterval',
  'left: SqlTimestamptz | null, right: SqlInterval | null',
  'SqlTimestamptz | null',
  'const result = timestampMiInterval(left === null ? null : new SqlTimestamp(left.usec), right)\n  return result === null ? null : new SqlTimestamptz(result.usec)',
  ['SqlTimestamptz', 'SqlInterval', 'SqlTimestamp', 'timestampMiInterval'],
)
wrap(
  'timestamptzMiTimestamptz',
  'left: SqlTimestamptz | null, right: SqlTimestamptz | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  return temporalTimestampSub(left.usec, right.usec)',
  ['SqlTimestamptz', 'SqlInterval'],
)
wrap(
  'timePlInterval',
  'left: SqlTime | null, right: SqlInterval | null',
  'SqlTime | null',
  "if (left === null || right === null) return null\n  if (temporalIntervalIsInf(right) !== 0) temporalError('22008')\n  return new SqlTime(temporalTimeWrap(left.usec + right.time))",
  ['SqlTime', 'SqlInterval'],
)
wrap(
  'intervalPlTime',
  'left: SqlInterval | null, right: SqlTime | null',
  'SqlTime | null',
  'return timePlInterval(right, left)',
  ['SqlInterval', 'SqlTime', 'timePlInterval'],
)
wrap(
  'timeMiInterval',
  'left: SqlTime | null, right: SqlInterval | null',
  'SqlTime | null',
  "if (left === null || right === null) return null\n  if (temporalIntervalIsInf(right) !== 0) temporalError('22008')\n  return new SqlTime(temporalTimeWrap(left.usec - right.time))",
  ['SqlTime', 'SqlInterval'],
)
wrap(
  'timeMiTime',
  'left: SqlTime | null, right: SqlTime | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  return new SqlInterval(0, 0, left.usec - right.usec)',
  ['SqlTime', 'SqlInterval'],
)
wrap(
  'timetzPlInterval',
  'left: SqlTimeTz | null, right: SqlInterval | null',
  'SqlTimeTz | null',
  "if (left === null || right === null) return null\n  if (temporalIntervalIsInf(right) !== 0) temporalError('22008')\n  return new SqlTimeTz(temporalTimeWrap(left.usec + right.time), left.zone)",
  ['SqlTimeTz', 'SqlInterval'],
)
wrap(
  'intervalPlTimetz',
  'left: SqlInterval | null, right: SqlTimeTz | null',
  'SqlTimeTz | null',
  'return timetzPlInterval(right, left)',
  ['SqlInterval', 'SqlTimeTz', 'timetzPlInterval'],
)
wrap(
  'timetzMiInterval',
  'left: SqlTimeTz | null, right: SqlInterval | null',
  'SqlTimeTz | null',
  "if (left === null || right === null) return null\n  if (temporalIntervalIsInf(right) !== 0) temporalError('22008')\n  return new SqlTimeTz(temporalTimeWrap(left.usec - right.time), left.zone)",
  ['SqlTimeTz', 'SqlInterval'],
)
wrap(
  'intervalPl',
  'left: SqlInterval | null, right: SqlInterval | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  return temporalIntervalAdd(left, right)',
  ['SqlInterval'],
)
wrap(
  'intervalMi',
  'left: SqlInterval | null, right: SqlInterval | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  return temporalIntervalSub(left, right)',
  ['SqlInterval'],
)
wrap(
  'intervalUm',
  'value: SqlInterval | null',
  'SqlInterval | null',
  'return value === null ? null : temporalIntervalNeg(value)',
  ['SqlInterval'],
)
wrap(
  'intervalMul',
  'left: SqlInterval | null, right: number | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  return temporalIntervalMul(left, right, false)',
  ['SqlInterval'],
)
wrap(
  'mulDInterval',
  'left: number | null, right: SqlInterval | null',
  'SqlInterval | null',
  'return intervalMul(right, left)',
  ['SqlInterval', 'intervalMul'],
)
wrap(
  'intervalDiv',
  'left: SqlInterval | null, right: number | null',
  'SqlInterval | null',
  'if (left === null || right === null) return null\n  return temporalIntervalMul(left, right, true)',
  ['SqlInterval'],
)
wrap(
  'justifyHours',
  'value: SqlInterval | null',
  'SqlInterval | null',
  'return value === null ? null : temporalJustifyHours(value)',
  ['SqlInterval'],
)
wrap(
  'justifyDays',
  'value: SqlInterval | null',
  'SqlInterval | null',
  'return value === null ? null : temporalJustifyDays(value)',
  ['SqlInterval'],
)
wrap(
  'justifyInterval',
  'value: SqlInterval | null',
  'SqlInterval | null',
  'return value === null ? null : temporalJustifyInterval(value)',
  ['SqlInterval'],
)
wrap(
  'dateFromTimestamp',
  'value: SqlTimestamp | null',
  'SqlDate | null',
  'return value === null ? null : new SqlDate(temporalTimestampToDate(value.usec))',
  ['SqlTimestamp', 'SqlDate'],
)
wrap(
  'dateFromTimestamptz',
  'value: SqlTimestamptz | null',
  'SqlDate | null',
  'return value === null ? null : new SqlDate(temporalTimestampToDate(value.usec))',
  ['SqlTimestamptz', 'SqlDate'],
)
wrap(
  'timestampFromDate',
  'value: SqlDate | null',
  'SqlTimestamp | null',
  'return value === null ? null : new SqlTimestamp(temporalDateToTimestamp(value.days))',
  ['SqlDate', 'SqlTimestamp'],
)
wrap(
  'timestampFromDateTime',
  'left: SqlDate | null, right: SqlTime | null',
  'SqlTimestamp | null',
  'return datePlTime(left, right)',
  ['SqlDate', 'SqlTime', 'SqlTimestamp', 'datePlTime'],
)
wrap(
  'timestampFromTimestamptz',
  'value: SqlTimestamptz | null',
  'SqlTimestamp | null',
  'return value === null ? null : new SqlTimestamp(value.usec)',
  ['SqlTimestamptz', 'SqlTimestamp'],
)
wrap(
  'timestamptzFromTimestamp',
  'value: SqlTimestamp | null',
  'SqlTimestamptz | null',
  'return value === null ? null : new SqlTimestamptz(value.usec)',
  ['SqlTimestamp', 'SqlTimestamptz'],
)
wrap(
  'timestamptzFromDate',
  'value: SqlDate | null',
  'SqlTimestamptz | null',
  'return value === null ? null : new SqlTimestamptz(temporalDateToTimestamp(value.days))',
  ['SqlDate', 'SqlTimestamptz'],
)
wrap(
  'timestamptzFromDateTime',
  'left: SqlDate | null, right: SqlTime | null',
  'SqlTimestamptz | null',
  'const result = datePlTime(left, right)\n  return result === null ? null : new SqlTimestamptz(result.usec)',
  ['SqlDate', 'SqlTime', 'SqlTimestamptz', 'datePlTime'],
)
wrap(
  'timestamptzFromDateTimetz',
  'left: SqlDate | null, right: SqlTimeTz | null',
  'SqlTimestamptz | null',
  'return datePlTimetz(left, right)',
  ['SqlDate', 'SqlTimeTz', 'SqlTimestamptz', 'datePlTimetz'],
)
wrap(
  'timeFromTimestamp',
  'value: SqlTimestamp | null',
  'SqlTime | null',
  'if (value === null) return null\n  const time = temporalTimestampToTime(value.usec)\n  return time === null ? null : new SqlTime(time)',
  ['SqlTimestamp', 'SqlTime'],
)
wrap(
  'timeFromTimestamptz',
  'value: SqlTimestamptz | null',
  'SqlTime | null',
  'if (value === null) return null\n  const time = temporalTimestampToTime(value.usec)\n  return time === null ? null : new SqlTime(time)',
  ['SqlTimestamptz', 'SqlTime'],
)
wrap(
  'timeFromTimetz',
  'value: SqlTimeTz | null',
  'SqlTime | null',
  'return value === null ? null : new SqlTime(value.usec)',
  ['SqlTimeTz', 'SqlTime'],
)
wrap(
  'timeFromInterval',
  'value: SqlInterval | null',
  'SqlTime | null',
  "if (value === null) return null\n  if (temporalIntervalIsInf(value) !== 0) temporalError('22008')\n  let time = value.time % 86400000000n\n  if (time < 0n) time += 86400000000n\n  return new SqlTime(time)",
  ['SqlInterval', 'SqlTime'],
)
wrap(
  'timetzFromTime',
  'value: SqlTime | null',
  'SqlTimeTz | null',
  'return value === null ? null : new SqlTimeTz(value.usec, 0)',
  ['SqlTime', 'SqlTimeTz'],
)
wrap(
  'timetzFromTimestamptz',
  'value: SqlTimestamptz | null',
  'SqlTimeTz | null',
  'if (value === null) return null\n  const time = temporalTimestampToTime(value.usec)\n  return time === null ? null : new SqlTimeTz(time, 0)',
  ['SqlTimestamptz', 'SqlTimeTz'],
)
wrap(
  'intervalFromTime',
  'value: SqlTime | null',
  'SqlInterval | null',
  'return value === null ? null : new SqlInterval(0, 0, value.usec)',
  ['SqlTime', 'SqlInterval'],
)
wrap(
  'dateTimestampCompare',
  'left: SqlDate | null, right: SqlTimestamp | null',
  'bigint | null',
  'if (left === null || right === null) return null\n  return temporalDateTimestampOrder(left.days, right.usec)',
  ['SqlDate', 'SqlTimestamp'],
)
wrap(
  'timestampDateCompare',
  'left: SqlTimestamp | null, right: SqlDate | null',
  'bigint | null',
  'const order = dateTimestampCompare(right, left)\n  return order === null ? null : -order',
  ['SqlTimestamp', 'SqlDate', 'dateTimestampCompare'],
)
wrap(
  'dateTimestamptzCompare',
  'left: SqlDate | null, right: SqlTimestamptz | null',
  'bigint | null',
  'return dateTimestampCompare(left, right === null ? null : new SqlTimestamp(right.usec))',
  ['SqlDate', 'SqlTimestamptz', 'SqlTimestamp', 'dateTimestampCompare'],
)
wrap(
  'timestamptzDateCompare',
  'left: SqlTimestamptz | null, right: SqlDate | null',
  'bigint | null',
  'const order = dateTimestamptzCompare(right, left)\n  return order === null ? null : -order',
  ['SqlTimestamptz', 'SqlDate', 'dateTimestamptzCompare'],
)
wrap(
  'timestampTimestamptzCompare',
  'left: SqlTimestamp | null, right: SqlTimestamptz | null',
  'bigint | null',
  'if (left === null || right === null) return null\n  return left.usec === right.usec ? 0n : left.usec < right.usec ? -1n : 1n',
  ['SqlTimestamp', 'SqlTimestamptz'],
)
wrap(
  'timestamptzTimestampCompare',
  'left: SqlTimestamptz | null, right: SqlTimestamp | null',
  'bigint | null',
  'const order = timestampTimestamptzCompare(right, left)\n  return order === null ? null : -order',
  ['SqlTimestamptz', 'SqlTimestamp', 'timestampTimestamptzCompare'],
)

const mixedCompareTypes = {
  dateTimestamp: ['SqlDate', 'SqlTimestamp'],
  timestampDate: ['SqlTimestamp', 'SqlDate'],
  dateTimestamptz: ['SqlDate', 'SqlTimestamptz'],
  timestamptzDate: ['SqlTimestamptz', 'SqlDate'],
  timestampTimestamptz: ['SqlTimestamp', 'SqlTimestamptz'],
  timestamptzTimestamp: ['SqlTimestamptz', 'SqlTimestamp'],
} as const

for (const [kind, types] of Object.entries(mixedCompareTypes)) {
  const helper = `${kind}Compare`
  for (const [name, operator] of [
    ['Eq', '==='],
    ['Ne', '!=='],
    ['Lt', '<'],
    ['Le', '<='],
    ['Gt', '>'],
    ['Ge', '>='],
  ] as const) {
    typescriptTemporalArithmeticHelpers[`${kind}${name}`] = {
      dependencies: [helper],
      source: `function ${kind}${name}(left: ${types[0]} | null, right: ${types[1]} | null): boolean | null {
  const comparison = ${helper}(left, right)
  return comparison === null ? null : comparison ${operator} 0n
}`,
    }
  }
}
