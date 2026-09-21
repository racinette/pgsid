export const typescriptTemporalExtractHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  temporalPartSupport: {
    dependencies: [
      'temporalJ2date',
      'temporalDate2j',
      'temporalError',
      'decimalInput',
      'decimalFromInteger',
      'decimalAdd',
      'decimalSub',
      'decimalDiv',
      'sqlDecimalRound',
    ],
    source: `function temporalStrncmp10(left: string, right: string): boolean {
  for (let index = 0; index < 10; index++) {
    const a = index < left.length ? left.charCodeAt(index) : 0
    const b = index < right.length ? right.charCodeAt(index) : 0
    if (a !== b) return false
    if (a === 0) return true
  }
  return true
}
function temporalDowncaseUnit(value: string): string {
  let text = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    text += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : ch
  }
  return text.length > 63 ? text.slice(0, 63) : text
}
function temporalLookup(value: string, table: readonly string[], stride: number): number {
  for (let index = 0; index < table.length; index += stride) {
    if (temporalStrncmp10(value, table[index]!)) return index
  }
  return -1
}
function temporalDecodeUnit(value: string, special: boolean): { type: string; name: string } {
  const text = temporalDowncaseUnit(value)
  const delta = [
    'c', 'century', 'cent', 'century', 'centuries', 'century', 'century', 'century',
    'd', 'day', 'day', 'day', 'days', 'day', 'dec', 'decade', 'decade', 'decade', 'decades', 'decade', 'decs', 'decade',
    'h', 'hour', 'hour', 'hour', 'hours', 'hour', 'hr', 'hour', 'hrs', 'hour',
    'm', 'minute', 'microsecon', 'microsec', 'mil', 'millennium', 'millennia', 'millennium', 'millennium', 'millennium',
    'millisecon', 'millisec', 'mils', 'millennium', 'min', 'minute', 'mins', 'minute', 'minute', 'minute', 'minutes', 'minute',
    'mon', 'month', 'mons', 'month', 'month', 'month', 'months', 'month', 'ms', 'millisec', 'msec', 'millisec',
    'msecond', 'millisec', 'mseconds', 'millisec', 'msecs', 'millisec', 'qtr', 'quarter', 'quarter', 'quarter',
    's', 'second', 'sec', 'second', 'second', 'second', 'seconds', 'second', 'secs', 'second',
    'timezone', 'timezone', 'timezone_h', 'timezone_hour', 'timezone_m', 'timezone_minute',
    'us', 'microsec', 'usec', 'microsec', 'usecond', 'microsec', 'useconds', 'microsec', 'usecs', 'microsec',
    'w', 'week', 'week', 'week', 'weeks', 'week', 'y', 'year', 'year', 'year', 'years', 'year', 'yr', 'year', 'yrs', 'year',
  ]
  const found = temporalLookup(text, delta, 2)
  if (found >= 0) return { type: 'units', name: delta[found + 1]! }
  if (!special) return { type: 'unknown', name: '' }
  const extra = [
    '+infinity', 'reserv', 'other', '-infinity', 'reserv', 'other', 'allballs', 'reserv', 'other',
    'dow', 'units', 'dow', 'doy', 'units', 'doy', 'epoch', 'reserv', 'epoch', 'infinity', 'reserv', 'other',
    'isodow', 'units', 'isodow', 'isoyear', 'units', 'isoyear', 'j', 'units', 'julian', 'jd', 'units', 'julian',
    'julian', 'units', 'julian', 'mm', 'units', 'minute', 'now', 'reserv', 'other', 'today', 'reserv', 'other',
    'tomorrow', 'reserv', 'other', 'yesterday', 'reserv', 'other',
  ]
  const match = temporalLookup(text, extra, 3)
  if (match < 0) return { type: 'unknown', name: '' }
  return { type: extra[match + 1]!, name: extra[match + 2]! }
}
function temporalJ2day(date: number): number {
  date = (date + 1) % 7
  if (date < 0) date += 7
  return date
}
function temporalIsoWeek(year: number, month: number, day: number): number {
  const dayn = temporalDate2j(year, month, day)
  let day4 = temporalDate2j(year, 1, 4)
  let day0 = temporalJ2day(day4 - 1)
  if (dayn < day4 - day0) {
    day4 = temporalDate2j(year - 1, 1, 4)
    day0 = temporalJ2day(day4 - 1)
  }
  let week = Math.trunc((dayn - (day4 - day0)) / 7) + 1
  if (week >= 52) {
    day4 = temporalDate2j(year + 1, 1, 4)
    day0 = temporalJ2day(day4 - 1)
    if (dayn >= day4 - day0) week = Math.trunc((dayn - (day4 - day0)) / 7) + 1
  }
  return week
}
function temporalIsoYear(year: number, month: number, day: number): number {
  const dayn = temporalDate2j(year, month, day)
  let day4 = temporalDate2j(year, 1, 4)
  let day0 = temporalJ2day(day4 - 1)
  if (dayn < day4 - day0) {
    year--
    day4 = temporalDate2j(year, 1, 4)
    day0 = temporalJ2day(day4 - 1)
  }
  const week = Math.trunc((dayn - (day4 - day0)) / 7) + 1
  if (week >= 52) {
    day4 = temporalDate2j(year + 1, 1, 4)
    day0 = temporalJ2day(day4 - 1)
    if (dayn >= day4 - day0) year++
  }
  return year
}
function temporalIsoWeekDate(year: number, week: number): { year: number; month: number; day: number } {
  const day4 = temporalDate2j(year, 1, 4)
  const day0 = temporalJ2day(day4 - 1)
  return temporalJ2date((week - 1) * 7 + (day4 - day0))
}
function temporalNumericScale(value: bigint, scale: number): SqlDecimal {
  const negative = value < 0n
  let digits = (negative ? -value : value).toString()
  if (digits.length <= scale) digits = digits.padStart(scale + 1, '0')
  return decimalInput((negative ? '-' : '') + digits.slice(0, digits.length - scale) + '.' + digits.slice(digits.length - scale))!
}
function temporalTimestampCivil(usec: bigint): { year: number; month: number; day: number; hour: number; minute: number; second: number; fsec: number; julian: number } {
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
  return { year, month, day, hour, minute, second: Number(seconds / 1000000n), fsec: Number(seconds % 1000000n), julian }
}
function temporalCivilTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number, fsec: number): bigint {
  const days = temporalDate2j(year, month, day) - 2451545
  const usec = BigInt(days) * 86400000000n + BigInt(hour) * 3600000000n + BigInt(minute) * 60000000n + BigInt(second) * 1000000n + BigInt(fsec)
  if (usec < -211813488000000000n || usec >= 9223371331200000000n) temporalError('22008')
  return usec
}
function temporalDateTimestamp(days: number): bigint {
  if (days === 2147483647) return 9223372036854775807n
  if (days === -2147483648) return -9223372036854775808n
  if (days >= 106751983) temporalError('22008')
  return BigInt(days) * 86400000000n
}
function temporalYearValue(year: number): bigint { return BigInt(year > 0 ? year : year - 1) }
function temporalDecadeValue(year: number, includeZero: boolean): bigint {
  if (includeZero ? year >= 0 : year > 0) return BigInt(Math.trunc(year / 10))
  return BigInt(-Math.trunc((8 - (year - 1)) / 10))
}
function temporalCenturyValue(year: number): bigint {
  if (year > 0) return BigInt(Math.trunc((year + 99) / 100))
  return BigInt(-Math.trunc((99 - (year - 1)) / 100))
}
function temporalMillenniumValue(year: number): bigint {
  if (year > 0) return BigInt(Math.trunc((year + 999) / 1000))
  return BigInt(-Math.trunc((999 - (year - 1)) / 1000))
}
function temporalIsoYearValue(year: number, month: number, day: number): bigint {
  let iso = temporalIsoYear(year, month, day)
  if (iso <= 0) iso -= 1
  return BigInt(iso)
}
function temporalDowValue(julian: number, iso: boolean): bigint {
  let dow = temporalJ2day(julian)
  if (iso && dow === 0) dow = 7
  return BigInt(dow)
}
function temporalTruncYear(year: number, unit: string): number {
  if (unit === 'millennium') {
    if (year > 0) year = Math.trunc((year + 999) / 1000) * 1000 - 999
    else year = -Math.trunc((999 - (year - 1)) / 1000) * 1000 + 1
  }
  if (unit === 'millennium' || unit === 'century') {
    if (year > 0) year = Math.trunc((year + 99) / 100) * 100 - 99
    else year = -Math.trunc((99 - (year - 1)) / 100) * 100 + 1
  }
  if (unit === 'decade') {
    if (year > 0) year = Math.trunc(year / 10) * 10
    else year = -Math.trunc((8 - (year - 1)) / 10) * 10
  }
  return year
}
type TemporalPart = { k: string; i?: bigint; s?: number; f?: number; d?: SqlDecimal; g?: number }
function temporalPartNull(): TemporalPart { return { k: 'n' } }
function temporalPartInf(negative: boolean): TemporalPart { return { k: 'g', g: negative ? -1 : 1 } }
function temporalPartInt(value: bigint): TemporalPart { return { k: 'i', i: value } }
function temporalPartScaled(value: bigint, scale: number): TemporalPart { return { k: 's', i: value, s: scale } }
function temporalPartFloat(value: number): TemporalPart { return { k: 'f', f: value } }
function temporalPartDecimal(value: SqlDecimal): TemporalPart { return { k: 'd', d: value } }
function temporalAsNumeric(part: TemporalPart): SqlDecimal | null {
  if (part.k === 'n') return null
  if (part.k === 'g') return decimalInput(part.g! < 0 ? '-Infinity' : 'Infinity')
  if (part.k === 'i') return decimalFromInteger(part.i!)
  if (part.k === 's') return temporalNumericScale(part.i!, part.s!)
  if (part.k === 'd') return part.d!
  temporalError('XX000')
}
function temporalAsFloat(part: TemporalPart): number | null {
  if (part.k === 'n') return null
  if (part.k === 'g') return part.g! < 0 ? -Infinity : Infinity
  if (part.k === 'i') return Number(part.i!)
  if (part.k === 's') return Number(part.i!) / 10 ** part.s!
  if (part.k === 'f') return part.f!
  temporalError('XX000')
}
function temporalInfiniteTimestampPart(unit: { type: string; name: string }, negative: boolean): TemporalPart {
  if (unit.type !== 'units' && unit.type !== 'reserv') temporalError('22023')
  const oscillating = new Set(['microsec', 'millisec', 'second', 'minute', 'hour', 'day', 'month', 'quarter', 'week', 'dow', 'isodow', 'doy', 'timezone', 'timezone_hour', 'timezone_minute'])
  const monotonic = new Set(['year', 'decade', 'century', 'millennium', 'julian', 'isoyear', 'epoch'])
  if (oscillating.has(unit.name)) return temporalPartNull()
  if (monotonic.has(unit.name)) return temporalPartInf(negative)
  temporalError('0A000')
}
function temporalTimestampPart(field: string | null, usec: bigint | null, numeric: boolean, withZone: boolean): TemporalPart {
  if (field === null || usec === null) return temporalPartNull()
  const unit = temporalDecodeUnit(field, true)
  const infinite = usec === -9223372036854775808n || usec === 9223372036854775807n
  if (infinite) return temporalInfiniteTimestampPart(unit, usec === -9223372036854775808n)
  if (unit.type === 'units') {
    const civil = temporalTimestampCivil(usec)
    const scaled = BigInt(civil.second) * 1000000n + BigInt(civil.fsec)
    switch (unit.name) {
      case 'timezone':
      case 'timezone_hour':
      case 'timezone_minute':
        if (!withZone) temporalError('0A000')
        return temporalPartInt(0n)
      case 'microsec': return temporalPartInt(scaled)
      case 'millisec': return numeric ? temporalPartScaled(scaled, 3) : temporalPartFloat(civil.second * 1000 + civil.fsec / 1000)
      case 'second': return numeric ? temporalPartScaled(scaled, 6) : temporalPartFloat(civil.second + civil.fsec / 1000000)
      case 'minute': return temporalPartInt(BigInt(civil.minute))
      case 'hour': return temporalPartInt(BigInt(civil.hour))
      case 'day': return temporalPartInt(BigInt(civil.day))
      case 'month': return temporalPartInt(BigInt(civil.month))
      case 'quarter': return temporalPartInt(BigInt(Math.trunc((civil.month - 1) / 3) + 1))
      case 'week': return temporalPartInt(BigInt(temporalIsoWeek(civil.year, civil.month, civil.day)))
      case 'year': return temporalPartInt(temporalYearValue(civil.year))
      case 'decade': return temporalPartInt(temporalDecadeValue(civil.year, !withZone))
      case 'century': return temporalPartInt(temporalCenturyValue(civil.year))
      case 'millennium': return temporalPartInt(temporalMillenniumValue(civil.year))
      case 'julian': {
        const time = ((civil.hour * 60 + civil.minute) * 60 + civil.second) * 1000000 + civil.fsec
        if (numeric) return temporalPartDecimal(decimalAdd(decimalFromInteger(BigInt(civil.julian)), decimalDiv(decimalFromInteger(BigInt(time)), decimalFromInteger(86400000000n)))!)
        return temporalPartFloat(civil.julian + (civil.hour * 3600 + civil.minute * 60 + civil.second + civil.fsec / 1000000) / 86400)
      }
      case 'isoyear': return temporalPartInt(temporalIsoYearValue(civil.year, civil.month, civil.day))
      case 'dow': return temporalPartInt(temporalDowValue(civil.julian, false))
      case 'isodow': return temporalPartInt(temporalDowValue(civil.julian, true))
      case 'doy': return temporalPartInt(BigInt(civil.julian - temporalDate2j(civil.year, 1, 1) + 1))
      default: temporalError('0A000')
    }
  }
  if (unit.type === 'reserv') {
    if (unit.name !== 'epoch') temporalError('0A000')
    const epoch = -946684800000000n
    if (numeric) {
      if (usec < 9223371090169975807n) return temporalPartScaled(usec - epoch, 6)
      return temporalPartDecimal(sqlDecimalRound(decimalDiv(decimalSub(decimalFromInteger(usec), decimalFromInteger(epoch)), decimalFromInteger(1000000n)), 6n, false)!)
    }
    if (usec < 9223371090169975807n) return temporalPartFloat(Number(usec - epoch) / 1000000)
    return temporalPartFloat((Number(usec) - Number(epoch)) / 1000000)
  }
  temporalError('22023')
}
function temporalDateExtractPart(field: string | null, days: number | null): TemporalPart {
  if (field === null || days === null) return temporalPartNull()
  const unit = temporalDecodeUnit(field, true)
  const infinite = days === 2147483647 || days === -2147483648
  if (infinite && (unit.type === 'units' || unit.type === 'reserv')) {
    const oscillating = new Set(['day', 'month', 'quarter', 'week', 'dow', 'isodow', 'doy'])
    const monotonic = new Set(['year', 'decade', 'century', 'millennium', 'julian', 'isoyear', 'epoch'])
    if (oscillating.has(unit.name)) return temporalPartNull()
    if (monotonic.has(unit.name)) return temporalPartInf(days === -2147483648)
    temporalError('0A000')
  }
  if (unit.type === 'units') {
    const { year, month, day } = temporalJ2date(days + 2451545)
    const julian = days + 2451545
    switch (unit.name) {
      case 'day': return temporalPartInt(BigInt(day))
      case 'month': return temporalPartInt(BigInt(month))
      case 'quarter': return temporalPartInt(BigInt(Math.trunc((month - 1) / 3) + 1))
      case 'week': return temporalPartInt(BigInt(temporalIsoWeek(year, month, day)))
      case 'year': return temporalPartInt(temporalYearValue(year))
      case 'decade': return temporalPartInt(temporalDecadeValue(year, true))
      case 'century': return temporalPartInt(temporalCenturyValue(year))
      case 'millennium': return temporalPartInt(temporalMillenniumValue(year))
      case 'julian': return temporalPartInt(BigInt(julian))
      case 'isoyear': return temporalPartInt(temporalIsoYearValue(year, month, day))
      case 'dow': return temporalPartInt(temporalDowValue(julian, false))
      case 'isodow': return temporalPartInt(temporalDowValue(julian, true))
      case 'doy': return temporalPartInt(BigInt(julian - temporalDate2j(year, 1, 1) + 1))
      default: temporalError('0A000')
    }
  }
  if (unit.type === 'reserv') {
    if (unit.name !== 'epoch') temporalError('0A000')
    return temporalPartInt(BigInt(days + 10957) * 86400n)
  }
  temporalError('22023')
}
function temporalTimePart(field: string | null, usec: bigint | null, numeric: boolean, zone: number | null): TemporalPart {
  if (field === null || usec === null) return temporalPartNull()
  const unit = temporalDecodeUnit(field, true)
  const hour = Number(usec / 3600000000n)
  const rest = usec % 3600000000n
  const minute = Number(rest / 60000000n)
  const seconds = rest % 60000000n
  const second = Number(seconds / 1000000n)
  const fsec = Number(seconds % 1000000n)
  const scaled = BigInt(second) * 1000000n + BigInt(fsec)
  if (unit.type === 'units') {
    switch (unit.name) {
      case 'timezone':
        if (zone === null) temporalError('0A000')
        return temporalPartInt(BigInt(-zone))
      case 'timezone_minute':
        if (zone === null) temporalError('0A000')
        return temporalPartInt(BigInt((-Math.trunc(zone / 60)) % 60))
      case 'timezone_hour':
        if (zone === null) temporalError('0A000')
        return temporalPartInt(BigInt(-Math.trunc(zone / 3600)))
      case 'microsec': return temporalPartInt(scaled)
      case 'millisec': return numeric ? temporalPartScaled(scaled, 3) : temporalPartFloat(second * 1000 + fsec / 1000)
      case 'second': return numeric ? temporalPartScaled(scaled, 6) : temporalPartFloat(second + fsec / 1000000)
      case 'minute': return temporalPartInt(BigInt(minute))
      case 'hour': return temporalPartInt(BigInt(hour))
      default: temporalError('0A000')
    }
  }
  if (unit.type === 'reserv' && unit.name === 'epoch') {
    const epoch = zone === null ? usec : usec + BigInt(zone) * 1000000n
    return numeric ? temporalPartScaled(epoch, 6) : temporalPartFloat(zone === null ? Number(usec) / 1000000 : Number(usec) / 1000000 + zone)
  }
  temporalError('22023')
}
function temporalInfiniteIntervalPart(unit: { type: string; name: string }, negative: boolean): TemporalPart {
  if (unit.type !== 'units' && unit.type !== 'reserv') temporalError('22023')
  const oscillating = new Set(['microsec', 'millisec', 'second', 'minute', 'week', 'month', 'quarter'])
  const monotonic = new Set(['hour', 'day', 'year', 'decade', 'century', 'millennium', 'epoch'])
  if (oscillating.has(unit.name)) return temporalPartNull()
  if (monotonic.has(unit.name)) return temporalPartInf(negative)
  temporalError('0A000')
}
function temporalIntervalPart(field: string | null, month: number | null, day: number | null, time: bigint | null, numeric: boolean): TemporalPart {
  if (field === null || month === null || day === null || time === null) return temporalPartNull()
  const unit = temporalDecodeUnit(field, true)
  const infinite = (month === -2147483648 && day === -2147483648 && time === -9223372036854775808n) || (month === 2147483647 && day === 2147483647 && time === 9223372036854775807n)
  if (infinite) return temporalInfiniteIntervalPart(unit, month === -2147483648)
  const year = Math.trunc(month / 12)
  const mon = month % 12
  const hour = time / 3600000000n
  let rest = time % 3600000000n
  const minute = Number(rest / 60000000n)
  rest %= 60000000n
  const second = Number(rest / 1000000n)
  const fsec = Number(rest % 1000000n)
  const scaled = BigInt(second) * 1000000n + BigInt(fsec)
  if (unit.type === 'units') {
    switch (unit.name) {
      case 'microsec': return temporalPartInt(scaled)
      case 'millisec': return numeric ? temporalPartScaled(scaled, 3) : temporalPartFloat(second * 1000 + fsec / 1000)
      case 'second': return numeric ? temporalPartScaled(scaled, 6) : temporalPartFloat(second + fsec / 1000000)
      case 'minute': return temporalPartInt(BigInt(minute))
      case 'hour': return temporalPartInt(hour)
      case 'day': return temporalPartInt(BigInt(day))
      case 'week': return temporalPartInt(BigInt(Math.trunc(day / 7)))
      case 'month': return temporalPartInt(BigInt(mon))
      case 'quarter':
        if (month >= 0) return temporalPartInt(BigInt(Math.trunc(mon / 3) + 1))
        return temporalPartInt(BigInt(-((Math.trunc((-month % 12) / 3)) + 1)))
      case 'year': return temporalPartInt(BigInt(year))
      case 'decade': return temporalPartInt(BigInt(Math.trunc(year / 10)))
      case 'century': return temporalPartInt(BigInt(Math.trunc(year / 100)))
      case 'millennium': return temporalPartInt(BigInt(Math.trunc(year / 1000)))
      default: temporalError('0A000')
    }
  }
  if (unit.type === 'reserv' && unit.name === 'epoch') {
    const secs = (BigInt(1461 * year + 120 * mon + 4 * day)) * 21600n
    if (numeric) return temporalPartScaled(secs * 1000000n + time, 6)
    return temporalPartFloat(Number(time) / 1000000 + 31557600 * year + 2592000 * mon + 86400 * day)
  }
  temporalError('22023')
}
function temporalTimestampTrunc(field: string | null, usec: bigint | null): bigint | null {
  if (field === null || usec === null) return null
  const unit = temporalDecodeUnit(field, false)
  if (unit.type !== 'units') temporalError('22023')
  const allowed = new Set(['week', 'millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour', 'minute', 'second', 'millisec', 'microsec'])
  if (!allowed.has(unit.name)) temporalError('0A000')
  if (usec === -9223372036854775808n || usec === 9223372036854775807n) return usec
  let { year, month, day, hour, minute, second, fsec } = temporalTimestampCivil(usec)
  if (unit.name === 'week') {
    const week = temporalIsoWeek(year, month, day)
    if (week >= 52 && month === 1) year--
    if (week <= 1 && month === 12) year++
    const date = temporalIsoWeekDate(year, week)
    return temporalCivilTimestamp(date.year, date.month, date.day, 0, 0, 0, 0)
  }
  year = temporalTruncYear(year, unit.name)
  if (['millennium', 'century', 'decade', 'year'].includes(unit.name)) month = 1
  if (['millennium', 'century', 'decade', 'year', 'quarter'].includes(unit.name)) month = 3 * Math.trunc((month - 1) / 3) + 1
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month'].includes(unit.name)) day = 1
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day'].includes(unit.name)) hour = 0
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour'].includes(unit.name)) minute = 0
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour', 'minute'].includes(unit.name)) second = 0
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour', 'minute', 'second'].includes(unit.name)) fsec = 0
  if (unit.name === 'millisec') fsec = Math.trunc(fsec / 1000) * 1000
  return temporalCivilTimestamp(year, month, day, hour, minute, second, fsec)
}
function temporalIntervalTrunc(field: string | null, month: number | null, day: number | null, time: bigint | null): { month: number; day: number; time: bigint } | null {
  if (field === null || month === null || day === null || time === null) return null
  const unit = temporalDecodeUnit(field, false)
  if (unit.type !== 'units') temporalError('22023')
  const allowed = new Set(['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour', 'minute', 'second', 'millisec', 'microsec'])
  if (!allowed.has(unit.name)) temporalError('0A000')
  if ((month === -2147483648 && day === -2147483648 && time === -9223372036854775808n) || (month === 2147483647 && day === 2147483647 && time === 9223372036854775807n)) {
    return { month, day, time }
  }
  let year = Math.trunc(month / 12)
  let mon = month % 12
  let hour = time / 3600000000n
  let rest = time % 3600000000n
  let minute = rest / 60000000n
  rest %= 60000000n
  let second = rest / 1000000n
  let fsec = rest % 1000000n
  let mday = day
  if (unit.name === 'millennium') year = Math.trunc(year / 1000) * 1000
  if (unit.name === 'millennium' || unit.name === 'century') year = Math.trunc(year / 100) * 100
  if (unit.name === 'millennium' || unit.name === 'century' || unit.name === 'decade') year = Math.trunc(year / 10) * 10
  if (['millennium', 'century', 'decade', 'year'].includes(unit.name)) mon = 0
  if (['millennium', 'century', 'decade', 'year', 'quarter'].includes(unit.name)) mon = 3 * Math.trunc(mon / 3)
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month'].includes(unit.name)) mday = 0
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day'].includes(unit.name)) hour = 0n
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour'].includes(unit.name)) minute = 0n
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour', 'minute'].includes(unit.name)) second = 0n
  if (['millennium', 'century', 'decade', 'year', 'quarter', 'month', 'day', 'hour', 'minute', 'second'].includes(unit.name)) fsec = 0n
  if (unit.name === 'millisec') fsec = (fsec / 1000n) * 1000n
  const resultMonth = year * 12 + mon
  const resultTime = hour * 3600000000n + minute * 60000000n + second * 1000000n + fsec
  if (!Number.isSafeInteger(resultMonth) || resultMonth > 2147483647 || resultMonth < -2147483648) temporalError('22008')
  if ((resultMonth === -2147483648 && mday === -2147483648 && resultTime === -9223372036854775808n) || (resultMonth === 2147483647 && mday === 2147483647 && resultTime === 9223372036854775807n)) temporalError('22008')
  return { month: resultMonth, day: mday, time: resultTime }
}`,
  },
}

function extractNumeric(name: string, args: string, body: string, extra: readonly string[]): void {
  typescriptTemporalExtractHelpers[name] = {
    dependencies: ['temporalPartSupport', 'SqlDecimal', ...extra],
    source: `function ${name}(${args}): SqlDecimal | null {
  ${body}
}`,
  }
}

function extractFloat(name: string, args: string, body: string, extra: readonly string[]): void {
  typescriptTemporalExtractHelpers[name] = {
    dependencies: ['temporalPartSupport', ...extra],
    source: `function ${name}(${args}): number | null {
  ${body}
}`,
  }
}

extractNumeric(
  'extractTimestamp',
  'field: string | null, value: SqlTimestamp | null',
  'return temporalAsNumeric(temporalTimestampPart(field, value === null ? null : value.usec, true, false))',
  ['SqlTimestamp'],
)
extractNumeric(
  'extractTimestamptz',
  'field: string | null, value: SqlTimestamptz | null',
  'return temporalAsNumeric(temporalTimestampPart(field, value === null ? null : value.usec, true, true))',
  ['SqlTimestamptz'],
)
extractNumeric(
  'extractDate',
  'field: string | null, value: SqlDate | null',
  'return temporalAsNumeric(temporalDateExtractPart(field, value === null ? null : value.days))',
  ['SqlDate'],
)
extractNumeric(
  'extractTime',
  'field: string | null, value: SqlTime | null',
  'return temporalAsNumeric(temporalTimePart(field, value === null ? null : value.usec, true, null))',
  ['SqlTime'],
)
extractNumeric(
  'extractTimetz',
  'field: string | null, value: SqlTimeTz | null',
  'return temporalAsNumeric(temporalTimePart(field, value === null ? null : value.usec, true, value === null ? null : value.zone))',
  ['SqlTimeTz'],
)
extractNumeric(
  'extractInterval',
  'field: string | null, value: SqlInterval | null',
  'return temporalAsNumeric(temporalIntervalPart(field, value === null ? null : value.month, value === null ? null : value.day, value === null ? null : value.time, true))',
  ['SqlInterval'],
)
extractFloat(
  'datePartTimestamp',
  'field: string | null, value: SqlTimestamp | null',
  'return temporalAsFloat(temporalTimestampPart(field, value === null ? null : value.usec, false, false))',
  ['SqlTimestamp'],
)
extractFloat(
  'datePartTimestamptz',
  'field: string | null, value: SqlTimestamptz | null',
  'return temporalAsFloat(temporalTimestampPart(field, value === null ? null : value.usec, false, true))',
  ['SqlTimestamptz'],
)
extractFloat(
  'datePartDate',
  'field: string | null, value: SqlDate | null',
  'if (field === null || value === null) return null\n  return temporalAsFloat(temporalTimestampPart(field, temporalDateTimestamp(value.days), false, false))',
  ['SqlDate'],
)
extractFloat(
  'datePartTime',
  'field: string | null, value: SqlTime | null',
  'return temporalAsFloat(temporalTimePart(field, value === null ? null : value.usec, false, null))',
  ['SqlTime'],
)
extractFloat(
  'datePartTimetz',
  'field: string | null, value: SqlTimeTz | null',
  'return temporalAsFloat(temporalTimePart(field, value === null ? null : value.usec, false, value === null ? null : value.zone))',
  ['SqlTimeTz'],
)
extractFloat(
  'datePartInterval',
  'field: string | null, value: SqlInterval | null',
  'return temporalAsFloat(temporalIntervalPart(field, value === null ? null : value.month, value === null ? null : value.day, value === null ? null : value.time, false))',
  ['SqlInterval'],
)

typescriptTemporalExtractHelpers.dateTruncTimestamp = {
  dependencies: ['temporalPartSupport', 'SqlTimestamp'],
  source: `function dateTruncTimestamp(field: string | null, value: SqlTimestamp | null): SqlTimestamp | null {
  if (field === null || value === null) return null
  const usec = temporalTimestampTrunc(field, value.usec)
  return usec === null ? null : new SqlTimestamp(usec)
}`,
}
typescriptTemporalExtractHelpers.dateTruncTimestamptz = {
  dependencies: ['temporalPartSupport', 'SqlTimestamptz'],
  source: `function dateTruncTimestamptz(field: string | null, value: SqlTimestamptz | null): SqlTimestamptz | null {
  if (field === null || value === null) return null
  const usec = temporalTimestampTrunc(field, value.usec)
  return usec === null ? null : new SqlTimestamptz(usec)
}`,
}
typescriptTemporalExtractHelpers.dateTruncInterval = {
  dependencies: ['temporalPartSupport', 'SqlInterval'],
  source: `function dateTruncInterval(field: string | null, value: SqlInterval | null): SqlInterval | null {
  if (field === null || value === null) return null
  const truncated = temporalIntervalTrunc(field, value.month, value.day, value.time)
  return truncated === null ? null : new SqlInterval(truncated.month, truncated.day, truncated.time)
}`,
}
