export const typescriptTemporalHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  temporalDate2j: {
    dependencies: [],
    source: `function temporalDate2j(year: number, month: number, day: number): number {
  if (month > 2) { month += 1; year += 4800 } else { month += 13; year += 4799 }
  const century = Math.trunc(year / 100)
  return year * 365 - 32167 + Math.trunc(year / 4) - century + Math.trunc(century / 4) + Math.trunc((7834 * month) / 256) + day
}`,
  },
  temporalJ2date: {
    dependencies: [],
    source: `function temporalJ2date(jd: number): { year: number; month: number; day: number } {
  let julian = (jd + 32044) >>> 0
  let quad = Math.trunc(julian / 146097)
  const extra = (julian - quad * 146097) * 4 + 3
  julian += 60 + quad * 3 + Math.trunc(extra / 146097)
  quad = Math.trunc(julian / 1461)
  julian -= quad * 1461
  let y = Math.trunc(julian * 4 / 1461)
  julian = ((y !== 0) ? ((julian + 305) % 365) : ((julian + 306) % 366)) + 123
  y += quad * 4
  const year = y - 4800
  quad = Math.trunc(julian * 2141 / 65536)
  return { year, month: (quad + 10) % 12 + 1, day: julian - Math.trunc((7834 * quad) / 256) }
}`,
  },
  temporalIsLeap: {
    dependencies: [],
    source: `function temporalIsLeap(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}`,
  },
  temporalMonthDays: {
    dependencies: ['temporalIsLeap'],
    source: `function temporalMonthDays(year: number, month: number): number {
  return [31, temporalIsLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
}`,
  },
  temporalPad: {
    dependencies: [],
    source: `function temporalPad(value: number, width: number): string {
  const sign = value < 0 ? '-' : ''
  return sign + String(Math.abs(value)).padStart(width, '0')
}`,
  },
  temporalSecondsText: {
    dependencies: ['temporalPad'],
    source: `function temporalSecondsText(sec: number, usec: number): string {
  let text = temporalPad(Math.abs(sec), 2)
  if (usec === 0) return text
  let fraction = String(Math.abs(usec)).padStart(6, '0')
  while (fraction.endsWith('0')) fraction = fraction.slice(0, -1)
  return text + '.' + fraction
}`,
  },
  dateFormat: {
    dependencies: ['temporalJ2date', 'temporalPad'],
    source: `function dateFormat(days: number): string {
  if (days === -2147483648) return '-infinity'
  if (days === 2147483647) return 'infinity'
  const { year, month, day } = temporalJ2date(days + 2451545)
  const display = year > 0 ? year : -(year - 1)
  return temporalPad(display, 4) + '-' + temporalPad(month, 2) + '-' + temporalPad(day, 2) + (year <= 0 ? ' BC' : '')
}`,
  },
  timeFormat: {
    dependencies: ['temporalPad', 'temporalSecondsText'],
    source: `function timeFormat(usec: bigint): string {
  const hour = usec / 3600000000n
  const rest = usec % 3600000000n
  const minute = rest / 60000000n
  const second = rest % 60000000n
  return temporalPad(Number(hour), 2) + ':' + temporalPad(Number(minute), 2) + ':' + temporalSecondsText(Number(second / 1000000n), Number(second % 1000000n))
}`,
  },
  timestampFormat: {
    dependencies: ['dateFormat', 'timeFormat'],
    source: `function timestampFormat(usec: bigint): string {
  if (usec === -9223372036854775808n) return '-infinity'
  if (usec === 9223372036854775807n) return 'infinity'
  let days = usec / 86400000000n
  let time = usec % 86400000000n
  if (time < 0n) { time += 86400000000n; days -= 1n }
  return dateFormat(Number(days)) + ' ' + timeFormat(time)
}`,
  },
  intervalFormat: {
    dependencies: ['temporalPad', 'temporalSecondsText'],
    source: `function intervalFormat(month: number, day: number, time: bigint): string {
  if (month === -2147483648 && day === -2147483648 && time === -9223372036854775808n) return '-infinity'
  if (month === 2147483647 && day === 2147483647 && time === 9223372036854775807n) return 'infinity'
  const year = Math.trunc(month / 12)
  const mon = month % 12
  let remaining = time
  const hour = remaining / 3600000000n
  remaining %= 3600000000n
  const minute = remaining / 60000000n
  remaining %= 60000000n
  const sec = remaining / 1000000n
  const usec = remaining % 1000000n
  let text = ''
  let zero = true
  let before = false
  const part = (value: number, unit: string): void => {
    if (value === 0) return
    text += (zero ? '' : ' ') + (before && value > 0 ? '+' : '') + String(value) + ' ' + unit + (value !== 1 ? 's' : '')
    before = value < 0
    zero = false
  }
  part(year, 'year')
  part(mon, 'mon')
  part(day, 'day')
  if (zero || hour !== 0n || minute !== 0n || sec !== 0n || usec !== 0n) {
    const minus = hour < 0n || minute < 0n || sec < 0n || usec < 0n
    const absHour = hour < 0n ? -hour : hour
    text += (zero ? '' : ' ') + (minus ? '-' : before ? '+' : '') + temporalPad(Number(absHour), 2) + ':' + temporalPad(Number(minute < 0n ? -minute : minute), 2) + ':' + temporalSecondsText(Number(sec), Number(usec))
  }
  return text
}`,
  },
  SqlDate: {
    dependencies: ['dateFormat'],
    source: `class SqlDate {
  constructor(readonly days: number) {}
  toString(): string { return dateFormat(this.days) }
}`,
  },
  SqlTime: {
    dependencies: ['timeFormat'],
    source: `class SqlTime {
  constructor(readonly usec: bigint) {}
  toString(): string { return timeFormat(this.usec) }
}`,
  },
  SqlTimestamp: {
    dependencies: ['timestampFormat'],
    source: `class SqlTimestamp {
  constructor(readonly usec: bigint) {}
  toString(): string { return timestampFormat(this.usec) }
}`,
  },
  SqlInterval: {
    dependencies: ['intervalFormat'],
    source: `class SqlInterval {
  constructor(readonly month: number, readonly day: number, readonly time: bigint) {}
  toString(): string { return intervalFormat(this.month, this.day, this.time) }
}`,
  },
  temporalError: {
    dependencies: [],
    source: `function temporalError(code: string): never {
  throw Object.assign(new Error('invalid temporal value'), { code })
}`,
  },
  temporalSpecial: {
    dependencies: [],
    source: `function temporalSpecial(value: string): -1 | 0 | 1 | null {
  const text = value.trim().toLowerCase()
  if (text === 'infinity' || text === '+infinity') return 1
  if (text === '-infinity') return -1
  return text.length === 0 ? 0 : null
}`,
  },
  temporalParseDate: {
    dependencies: ['temporalDate2j', 'temporalMonthDays', 'temporalError'],
    source: `function temporalParseDate(value: string): number {
  const match = /^\\s*(\\d{1,7})-(\\d{1,2})-(\\d{1,2})(?:\\s+BC)?\\s*$/i.exec(value)
  if (!match) temporalError('22007')
  const bc = /bc\\s*$/i.test(value)
  let year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (bc) {
    if (year <= 0) temporalError('22008')
    year = -(year - 1)
  } else if (year <= 0) temporalError('22008')
  if (month < 1 || month > 12 || day < 1 || day > temporalMonthDays(year, month)) temporalError('22008')
  if (year < -4713 || (year === -4713 && month < 11)) temporalError('22008')
  const days = temporalDate2j(year, month, day) - 2451545
  if (days < -2451545 || days >= 2145031949) temporalError('22008')
  return days
}`,
  },
  temporalParseTime: {
    dependencies: ['temporalError'],
    source: `function temporalParseTime(value: string, roll: boolean): { days: number; usec: bigint } {
  const match = /^\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2})(?:\\.(\\d{1,6}))?)?\\s*$/.exec(value)
  if (!match) temporalError('22023')
  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] ?? '0')
  const fraction = (match[4] ?? '').padEnd(6, '0')
  const usec = BigInt(second) * 1000000n + BigInt(fraction)
  if (hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 59 || usec > 60000000n) temporalError('22008')
  const total = BigInt(hour) * 3600000000n + BigInt(minute) * 60000000n + usec
  if (!roll && total > 86400000000n) temporalError('22008')
  if (roll && total === 86400000000n) return { days: 1, usec: 0n }
  if (total > 86400000000n) temporalError('22008')
  return { days: 0, usec: total }
}`,
  },
  dateInput: {
    dependencies: ['SqlDate', 'temporalSpecial', 'temporalParseDate'],
    source: `function dateInput(value: string | null): SqlDate | null {
  if (value === null) return null
  const special = temporalSpecial(value)
  if (special === 1) return new SqlDate(2147483647)
  if (special === -1) return new SqlDate(-2147483648)
  return new SqlDate(temporalParseDate(value))
}`,
  },
  timeInput: {
    dependencies: ['SqlTime', 'temporalParseTime'],
    source: `function timeInput(value: string | null): SqlTime | null {
  if (value === null) return null
  return new SqlTime(temporalParseTime(value, false).usec)
}`,
  },
  timestampInput: {
    dependencies: [
      'SqlTimestamp',
      'temporalSpecial',
      'temporalParseDate',
      'temporalParseTime',
      'temporalError',
    ],
    source: `function timestampInput(value: string | null): SqlTimestamp | null {
  if (value === null) return null
  const special = temporalSpecial(value)
  if (special === 1) return new SqlTimestamp(9223372036854775807n)
  if (special === -1) return new SqlTimestamp(-9223372036854775808n)
  const match = /^\\s*(\\d{1,7}-\\d{1,2}-\\d{1,2}(?:\\s+BC)?)(?:[ T](.+))?\\s*$/i.exec(value)
  if (!match) temporalError('22007')
  const days = temporalParseDate(match[1]!)
  const time = match[2] ? temporalParseTime(match[2], true) : { days: 0, usec: 0n }
  const usec = BigInt(days + time.days) * 86400000000n + time.usec
  if (usec < -211813488000000000n || usec >= 9223371331200000000n) temporalError('22008')
  return new SqlTimestamp(usec)
}`,
  },
  intervalInput: {
    dependencies: ['SqlInterval', 'temporalSpecial', 'temporalParseTime', 'temporalError'],
    source: `function intervalInput(value: string | null): SqlInterval | null {
  if (value === null) return null
  const special = temporalSpecial(value)
  if (special === 1) return new SqlInterval(2147483647, 2147483647, 9223372036854775807n)
  if (special === -1) return new SqlInterval(-2147483648, -2147483648, -9223372036854775808n)
  let text = value.trim()
  if (text.length === 0) temporalError('22007')
  const ago = /\\s+ago\\s*$/i.test(text)
  if (ago) text = text.replace(/\\s+ago\\s*$/i, '')
  let month = 0, day = 0, time = 0n
  if (/^\\d+$/.test(text)) {
    time = BigInt(text) * 1000000n
  } else {
    const tokens = text.split(/\\s+/).filter(Boolean)
    let index = 0
    const units: Record<string, 'month' | 'day' | 'week' | 'time'> = {
      year: 'month', years: 'month', yr: 'month', yrs: 'month',
      month: 'month', months: 'month', mon: 'month', mons: 'month',
      week: 'week', weeks: 'week',
      day: 'day', days: 'day',
      hour: 'time', hours: 'time', hr: 'time', hrs: 'time',
      minute: 'time', minutes: 'time', min: 'time', mins: 'time',
      second: 'time', seconds: 'time', sec: 'time', secs: 'time',
    }
    const scale: Record<string, bigint> = {
      year: 12n, years: 12n, yr: 12n, yrs: 12n,
      month: 1n, months: 1n, mon: 1n, mons: 1n,
      week: 7n, weeks: 7n,
      day: 1n, days: 1n,
      hour: 3600000000n, hours: 3600000000n, hr: 3600000000n, hrs: 3600000000n,
      minute: 60000000n, minutes: 60000000n, min: 60000000n, mins: 60000000n,
      second: 1000000n, seconds: 1000000n, sec: 1000000n, secs: 1000000n,
    }
    while (index < tokens.length) {
      const token = tokens[index]!
      if (/^\\d{1,2}:\\d{1,2}(?::\\d{1,2}(?:\\.\\d{1,6})?)?$/.test(token)) {
        time += temporalParseTime(token, false).usec
        index++
        continue
      }
      if (!/^[+-]?\\d+$/.test(token) || index + 1 >= tokens.length) temporalError('22007')
      const amount = BigInt(token)
      const unit = tokens[index + 1]!.toLowerCase()
      const kind = units[unit]
      const factor = scale[unit]
      if (!kind || factor === undefined) temporalError('22007')
      if (kind === 'month') month += Number(amount * factor)
      else if (kind === 'day' || kind === 'week') day += Number(amount * factor)
      else time += amount * factor
      index += 2
    }
  }
  if (ago) { month = -month; day = -day; time = -time }
  return new SqlInterval(month, day, time)
}`,
  },
  dateCompare: {
    dependencies: ['SqlDate'],
    source: `function dateCompare(left: SqlDate | null, right: SqlDate | null): bigint | null {
  if (left === null || right === null) return null
  return BigInt(Math.sign(left.days - right.days))
}`,
  },
  timeCompare: {
    dependencies: ['SqlTime'],
    source: `function timeCompare(left: SqlTime | null, right: SqlTime | null): bigint | null {
  if (left === null || right === null) return null
  return left.usec === right.usec ? 0n : left.usec < right.usec ? -1n : 1n
}`,
  },
  timestampCompare: {
    dependencies: ['SqlTimestamp'],
    source: `function timestampCompare(left: SqlTimestamp | null, right: SqlTimestamp | null): bigint | null {
  if (left === null || right === null) return null
  return left.usec === right.usec ? 0n : left.usec < right.usec ? -1n : 1n
}`,
  },
  intervalCompare: {
    dependencies: ['SqlInterval'],
    source: `function intervalCompare(left: SqlInterval | null, right: SqlInterval | null): bigint | null {
  if (left === null || right === null) return null
  const span = (value: SqlInterval): bigint => value.time + BigInt(value.month * 30 + value.day) * 86400000000n
  const difference = span(left) - span(right)
  return difference === 0n ? 0n : difference < 0n ? -1n : 1n
}`,
  },
  dateFinite: {
    dependencies: ['SqlDate'],
    source: `function dateFinite(value: SqlDate | null): boolean | null {
  return value === null ? null : value.days !== -2147483648 && value.days !== 2147483647
}`,
  },
  timestampFinite: {
    dependencies: ['SqlTimestamp'],
    source: `function timestampFinite(value: SqlTimestamp | null): boolean | null {
  return value === null ? null : value.usec !== -9223372036854775808n && value.usec !== 9223372036854775807n
}`,
  },
  intervalFinite: {
    dependencies: ['SqlInterval'],
    source: `function intervalFinite(value: SqlInterval | null): boolean | null {
  return value === null ? null : !((value.month === -2147483648 && value.day === -2147483648 && value.time === -9223372036854775808n) || (value.month === 2147483647 && value.day === 2147483647 && value.time === 9223372036854775807n))
}`,
  },
  makeDate: {
    dependencies: ['SqlDate', 'temporalDate2j', 'temporalMonthDays', 'temporalError'],
    source: `function makeDate(year: bigint | null, month: bigint | null, day: bigint | null): SqlDate | null {
  if (year === null || month === null || day === null) return null
  let y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (y < 0) {
    if (y === -2147483648) temporalError('22008')
    y = -y
    y = -(y - 1)
  } else if (y === 0) temporalError('22008')
  if (m < 1 || m > 12 || d < 1 || d > temporalMonthDays(y, m)) temporalError('22008')
  const days = temporalDate2j(y, m, d) - 2451545
  if (days < -2451545 || days >= 2145031949) temporalError('22008')
  return new SqlDate(days)
}`,
  },
  makeTime: {
    dependencies: ['SqlTime', 'temporalError'],
    source: `function makeTime(hour: bigint | null, minute: bigint | null, second: number | null): SqlTime | null {
  if (hour === null || minute === null || second === null) return null
  if (!Number.isFinite(second) || Number.isNaN(second)) temporalError('22008')
  const usec = BigInt(Math.round(second * 1e6))
  const h = Number(hour), m = Number(minute)
  if (h < 0 || h > 24 || m < 0 || m >= 60 || usec < 0n || usec > 60000000n) temporalError('22008')
  const total = BigInt(h) * 3600000000n + BigInt(m) * 60000000n + usec
  if (total > 86400000000n) temporalError('22008')
  return new SqlTime(total)
}`,
  },
  makeTimestamp: {
    dependencies: ['SqlTimestamp', 'makeDate', 'makeTime', 'temporalError'],
    source: `function makeTimestamp(year: bigint | null, month: bigint | null, day: bigint | null, hour: bigint | null, minute: bigint | null, second: number | null): SqlTimestamp | null {
  if (year === null || month === null || day === null || hour === null || minute === null || second === null) return null
  const date = makeDate(year, month, day)
  const time = makeTime(hour, minute, second)
  if (date === null || time === null) return null
  const usec = BigInt(date.days) * 86400000000n + time.usec
  if (usec < -211813488000000000n || usec >= 9223371331200000000n) temporalError('22008')
  return new SqlTimestamp(usec)
}`,
  },
  makeInterval: {
    dependencies: ['SqlInterval', 'temporalError'],
    source: `function makeInterval(years: bigint | null, months: bigint | null, weeks: bigint | null, days: bigint | null, hours: bigint | null, mins: bigint | null, secs: number | null): SqlInterval | null {
  if (years === null || months === null || weeks === null || days === null || hours === null || mins === null || secs === null) return null
  if (!Number.isFinite(secs) || Number.isNaN(secs)) temporalError('22008')
  const month = Number(years) * 12 + Number(months)
  const day = Number(weeks) * 7 + Number(days)
  if (!Number.isSafeInteger(month) || month > 2147483647 || month < -2147483648) temporalError('22008')
  if (!Number.isSafeInteger(day) || day > 2147483647 || day < -2147483648) temporalError('22008')
  const time = BigInt(hours) * 3600000000n + BigInt(mins) * 60000000n + BigInt(Math.round(secs * 1e6))
  if ((month === -2147483648 && day === -2147483648 && time === -9223372036854775808n) || (month === 2147483647 && day === 2147483647 && time === 9223372036854775807n)) temporalError('22008')
  return new SqlInterval(month, day, time)
}`,
  },
}

for (const [kind, helper] of [
  ['date', 'dateCompare'],
  ['time', 'timeCompare'],
  ['timestamp', 'timestampCompare'],
  ['interval', 'intervalCompare'],
] as const) {
  for (const [name, operator] of [
    ['Eq', '==='],
    ['Ne', '!=='],
    ['Lt', '<'],
    ['Le', '<='],
    ['Gt', '>'],
    ['Ge', '>='],
  ] as const) {
    typescriptTemporalHelpers[`${kind}${name}`] = {
      dependencies: [helper],
      source: `function ${kind}${name}(left: ${kind === 'date' ? 'SqlDate' : kind === 'time' ? 'SqlTime' : kind === 'timestamp' ? 'SqlTimestamp' : 'SqlInterval'} | null, right: ${kind === 'date' ? 'SqlDate' : kind === 'time' ? 'SqlTime' : kind === 'timestamp' ? 'SqlTimestamp' : 'SqlInterval'} | null): boolean | null {
  const comparison = ${helper}(left, right)
  return comparison === null ? null : comparison ${operator} 0n
}`,
    }
  }
}
