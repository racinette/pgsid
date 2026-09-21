package pgsidsql

import (
	"math"
	"math/big"
)

func temporalRint(value float64) float64 {
	return math.RoundToEven(value)
}

func temporalTsRound(value float64) float64 {
	return temporalRint(value*1e6) / 1e6
}

func temporalFloatFitsInt32(value float64) bool {
	return value >= float64(math.MinInt32) && value < -float64(math.MinInt32)
}

func temporalFloatFitsInt64(value float64) bool {
	return value >= float64(math.MinInt64) && value < -float64(math.MinInt64)
}

func temporalAddInt32(left, right int32) (int32, string) {
	result := int64(left) + int64(right)
	if result > math.MaxInt32 || result < math.MinInt32 {
		return 0, "22008"
	}
	return int32(result), ""
}

func temporalAddInt64(left, right int64) (int64, string) {
	if right > 0 && left > math.MaxInt64-right || right < 0 && left < math.MinInt64-right {
		return 0, "22008"
	}
	return left + right, ""
}

func temporalSubInt64(left, right int64) (int64, string) {
	if right > 0 && left < math.MinInt64+right || right < 0 && left > math.MaxInt64+right {
		return 0, "22008"
	}
	return left - right, ""
}

func temporalDateIsInf(days int32) int {
	if days == math.MaxInt32 {
		return 1
	}
	if days == math.MinInt32 {
		return -1
	}
	return 0
}

func temporalTimestampIsInf(usec int64) int {
	if usec == math.MaxInt64 {
		return 1
	}
	if usec == math.MinInt64 {
		return -1
	}
	return 0
}

func temporalIntervalIsInf(value SqlInterval) int {
	if value.Month == math.MaxInt32 && value.Day == math.MaxInt32 && value.Time == math.MaxInt64 {
		return 1
	}
	if value.Month == math.MinInt32 && value.Day == math.MinInt32 && value.Time == math.MinInt64 {
		return -1
	}
	return 0
}

func temporalIntervalSentinel(sign int) SqlInterval {
	if sign < 0 {
		return SqlInterval{Month: math.MinInt32, Day: math.MinInt32, Time: math.MinInt64, Valid: true}
	}
	return SqlInterval{Month: math.MaxInt32, Day: math.MaxInt32, Time: math.MaxInt64, Valid: true}
}

func temporalIntervalFinite(month, day int32, time int64) (SqlInterval, string) {
	value := SqlInterval{Month: month, Day: day, Time: time, Valid: true}
	if temporalIntervalIsInf(value) != 0 {
		return SqlInterval{}, "22008"
	}
	return value, ""
}

func temporalIntervalSign(value SqlInterval) int {
	return intervalSpan(value).Cmp(new(big.Int))
}

func temporalValidDate(days int32) bool {
	return days >= -2451545 && days < 2145031949
}

func temporalValidTimestamp(usec int64) bool {
	return usec >= -211813488000000000 && usec < 9223371331200000000
}

func temporalTimestampFromCivil(year, month, day, hour, minute, second, fsec int) (int64, string) {
	days := int64(temporalDate2j(year, month, day) - 2451545)
	usec := days*86400000000 + int64(hour)*3600000000 + int64(minute)*60000000 + int64(second)*1000000 + int64(fsec)
	if !temporalValidTimestamp(usec) {
		return 0, "22008"
	}
	return usec, ""
}

func temporalTimestampCivilParts(usec int64) (year, month, day, hour, minute, second, fsec int, err string) {
	days := usec / 86400000000
	time := usec % 86400000000
	if time < 0 {
		time += 86400000000
		days--
	}
	julian := days + 2451545
	if julian < 0 || julian > math.MaxInt32 {
		return 0, 0, 0, 0, 0, 0, 0, "22008"
	}
	year, month, day = temporalJ2date(int(julian))
	hour = int(time / 3600000000)
	rest := time % 3600000000
	minute = int(rest / 60000000)
	seconds := rest % 60000000
	return year, month, day, hour, minute, int(seconds / 1000000), int(seconds % 1000000), ""
}

func temporalAddMonths(year, month, delta int) (int, int, string) {
	total, err := temporalAddInt32(int32(month), int32(delta))
	if err != "" {
		return 0, 0, err
	}
	if total > 12 {
		year += int((int64(total) - 1) / 12)
		month = int((int64(total)-1)%12) + 1
	} else if total < 1 {
		year += int(int64(total)/12) - 1
		month = int(int64(total)%12) + 12
	} else {
		month = int(total)
	}
	return year, month, ""
}

func temporalTimestampAddInterval(usec int64, span SqlInterval) (int64, string) {
	stampInf := temporalTimestampIsInf(usec)
	spanInf := temporalIntervalIsInf(span)
	if spanInf < 0 {
		if stampInf > 0 {
			return 0, "22008"
		}
		return math.MinInt64, ""
	}
	if spanInf > 0 {
		if stampInf < 0 {
			return 0, "22008"
		}
		return math.MaxInt64, ""
	}
	if stampInf != 0 {
		return usec, ""
	}
	if span.Month != 0 {
		year, month, day, hour, minute, second, fsec, err := temporalTimestampCivilParts(usec)
		if err != "" {
			return 0, err
		}
		year, month, err = temporalAddMonths(year, month, int(span.Month))
		if err != "" {
			return 0, err
		}
		last := temporalMonthDays(year, month)
		if day > last {
			day = last
		}
		usec, err = temporalTimestampFromCivil(year, month, day, hour, minute, second, fsec)
		if err != "" {
			return 0, err
		}
	}
	if span.Day != 0 {
		year, month, day, hour, minute, second, fsec, err := temporalTimestampCivilParts(usec)
		if err != "" {
			return 0, err
		}
		julian, err := temporalAddInt32(int32(temporalDate2j(year, month, day)), span.Day)
		if err != "" || julian < 0 {
			return 0, "22008"
		}
		year, month, day = temporalJ2date(int(julian))
		usec, err = temporalTimestampFromCivil(year, month, day, hour, minute, second, fsec)
		if err != "" {
			return 0, err
		}
	}
	var err string
	usec, err = temporalAddInt64(usec, span.Time)
	if err != "" || !temporalValidTimestamp(usec) {
		return 0, "22008"
	}
	return usec, ""
}

func temporalTimeWrap(usec int64) int64 {
	usec -= usec / 86400000000 * 86400000000
	if usec < 0 {
		usec += 86400000000
	}
	return usec
}

func temporalIntervalZoneSeconds(span SqlInterval) (int32, string) {
	if temporalIntervalIsInf(span) != 0 {
		return 0, "22023"
	}
	if span.Month != 0 || span.Day != 0 {
		return 0, "22023"
	}
	return int32(span.Time / 1000000), ""
}

func temporalDt2local(usec int64, tz int32) (int64, string) {
	result := usec - int64(tz)*1000000
	if !temporalValidTimestamp(result) {
		return 0, "22008"
	}
	return result, ""
}

func temporalNegInt32(value int32) (int32, string) {
	if value == math.MinInt32 {
		return 0, "22008"
	}
	return -value, ""
}

func temporalIntervalNeg(span SqlInterval) (SqlInterval, string) {
	inf := temporalIntervalIsInf(span)
	if inf != 0 {
		return temporalIntervalSentinel(-inf), ""
	}
	month, err := temporalNegInt32(span.Month)
	if err != "" {
		return SqlInterval{}, err
	}
	day, err := temporalNegInt32(span.Day)
	if err != "" {
		return SqlInterval{}, err
	}
	time, err := temporalSubInt64(0, span.Time)
	if err != "" {
		return SqlInterval{}, err
	}
	return temporalIntervalFinite(month, day, time)
}

func temporalIntervalAdd(left, right SqlInterval) (SqlInterval, string) {
	leftInf := temporalIntervalIsInf(left)
	rightInf := temporalIntervalIsInf(right)
	if leftInf < 0 {
		if rightInf > 0 {
			return SqlInterval{}, "22008"
		}
		return temporalIntervalSentinel(-1), ""
	}
	if leftInf > 0 {
		if rightInf < 0 {
			return SqlInterval{}, "22008"
		}
		return temporalIntervalSentinel(1), ""
	}
	if rightInf != 0 {
		return temporalIntervalSentinel(rightInf), ""
	}
	month, err := temporalAddInt32(left.Month, right.Month)
	if err != "" {
		return SqlInterval{}, err
	}
	day, err := temporalAddInt32(left.Day, right.Day)
	if err != "" {
		return SqlInterval{}, err
	}
	time, err := temporalAddInt64(left.Time, right.Time)
	if err != "" {
		return SqlInterval{}, err
	}
	return temporalIntervalFinite(month, day, time)
}

func temporalIntervalSub(left, right SqlInterval) (SqlInterval, string) {
	leftInf := temporalIntervalIsInf(left)
	rightInf := temporalIntervalIsInf(right)
	if leftInf < 0 {
		if rightInf < 0 {
			return SqlInterval{}, "22008"
		}
		return temporalIntervalSentinel(-1), ""
	}
	if leftInf > 0 {
		if rightInf > 0 {
			return SqlInterval{}, "22008"
		}
		return temporalIntervalSentinel(1), ""
	}
	if rightInf < 0 {
		return temporalIntervalSentinel(1), ""
	}
	if rightInf > 0 {
		return temporalIntervalSentinel(-1), ""
	}
	month64 := int64(left.Month) - int64(right.Month)
	day64 := int64(left.Day) - int64(right.Day)
	if month64 > math.MaxInt32 || month64 < math.MinInt32 || day64 > math.MaxInt32 || day64 < math.MinInt32 {
		return SqlInterval{}, "22008"
	}
	month := int32(month64)
	day := int32(day64)
	time, err := temporalSubInt64(left.Time, right.Time)
	if err != "" {
		return SqlInterval{}, err
	}
	return temporalIntervalFinite(month, day, time)
}

func temporalIntervalMul(span SqlInterval, factor float64, divide bool) (SqlInterval, string) {
	if divide && factor == 0 {
		return SqlInterval{}, "22012"
	}
	if math.IsNaN(factor) {
		return SqlInterval{}, "22008"
	}
	inf := temporalIntervalIsInf(span)
	if inf != 0 {
		if divide && math.IsInf(factor, 0) || !divide && factor == 0 {
			return SqlInterval{}, "22008"
		}
		if factor < 0 {
			return temporalIntervalNeg(span)
		}
		return SqlInterval{Month: span.Month, Day: span.Day, Time: span.Time, Valid: true}, ""
	}
	if !divide && math.IsInf(factor, 0) {
		sign := temporalIntervalSign(span)
		if sign == 0 {
			return SqlInterval{}, "22008"
		}
		if factor*float64(sign) < 0 {
			return temporalIntervalSentinel(-1), ""
		}
		return temporalIntervalSentinel(1), ""
	}
	monthProduct := float64(span.Month) * factor
	dayProduct := float64(span.Day) * factor
	if divide {
		monthProduct = float64(span.Month) / factor
		dayProduct = float64(span.Day) / factor
	}
	if math.IsNaN(monthProduct) || !temporalFloatFitsInt32(monthProduct) || math.IsNaN(dayProduct) || !temporalFloatFitsInt32(dayProduct) {
		return SqlInterval{}, "22008"
	}
	month := int32(monthProduct)
	day := int32(dayProduct)
	monthRemainder := temporalTsRound((monthProduct - float64(month)) * 30)
	secRemainder := temporalTsRound((dayProduct - float64(day) + monthRemainder - float64(int(monthRemainder))) * 86400)
	if math.Abs(secRemainder) >= 86400 {
		extra := int32(secRemainder / 86400)
		var err string
		day, err = temporalAddInt32(day, extra)
		if err != "" {
			return SqlInterval{}, err
		}
		secRemainder -= float64(extra) * 86400
	}
	var err string
	day, err = temporalAddInt32(day, int32(monthRemainder))
	if err != "" {
		return SqlInterval{}, err
	}
	scale := factor
	if divide {
		scale = 1 / factor
	}
	timeValue := temporalRint(float64(span.Time)*scale + secRemainder*1e6)
	if math.IsNaN(timeValue) || !temporalFloatFitsInt64(timeValue) {
		return SqlInterval{}, "22008"
	}
	return temporalIntervalFinite(month, day, int64(timeValue))
}

func temporalTModulo(time int64) (int64, int32, string) {
	days := time / 86400000000
	if days != 0 {
		time -= days * 86400000000
	}
	if days > math.MaxInt32 || days < math.MinInt32 {
		return 0, 0, "22008"
	}
	return time, int32(days), ""
}

func temporalJustifyHours(span SqlInterval) (SqlInterval, string) {
	if temporalIntervalIsInf(span) != 0 {
		return SqlInterval{Month: span.Month, Day: span.Day, Time: span.Time, Valid: true}, ""
	}
	time, days, err := temporalTModulo(span.Time)
	if err != "" {
		return SqlInterval{}, err
	}
	day, err := temporalAddInt32(span.Day, days)
	if err != "" {
		return SqlInterval{}, err
	}
	if day > 0 && time < 0 {
		time += 86400000000
		day--
	} else if day < 0 && time > 0 {
		time -= 86400000000
		day++
	}
	return SqlInterval{Month: span.Month, Day: day, Time: time, Valid: true}, ""
}

func temporalJustifyDays(span SqlInterval) (SqlInterval, string) {
	if temporalIntervalIsInf(span) != 0 {
		return SqlInterval{Month: span.Month, Day: span.Day, Time: span.Time, Valid: true}, ""
	}
	whole := span.Day / 30
	day := span.Day - whole*30
	month, err := temporalAddInt32(span.Month, whole)
	if err != "" {
		return SqlInterval{}, err
	}
	if month > 0 && day < 0 {
		day += 30
		month--
	} else if month < 0 && day > 0 {
		day -= 30
		month++
	}
	return SqlInterval{Month: month, Day: day, Time: span.Time, Valid: true}, ""
}

func temporalJustifyInterval(span SqlInterval) (SqlInterval, string) {
	if temporalIntervalIsInf(span) != 0 {
		return SqlInterval{Month: span.Month, Day: span.Day, Time: span.Time, Valid: true}, ""
	}
	month := span.Month
	day := span.Day
	time := span.Time
	if day > 0 && time > 0 || day < 0 && time < 0 {
		whole := day / 30
		day -= whole * 30
		var err string
		month, err = temporalAddInt32(month, whole)
		if err != "" {
			return SqlInterval{}, err
		}
	}
	splitTime, splitDays, err := temporalTModulo(time)
	if err != "" {
		return SqlInterval{}, err
	}
	day += splitDays
	time = splitTime
	whole := day / 30
	day -= whole * 30
	month, err = temporalAddInt32(month, whole)
	if err != "" {
		return SqlInterval{}, err
	}
	if month > 0 && (day < 0 || day == 0 && time < 0) {
		day += 30
		month--
	} else if month < 0 && (day > 0 || day == 0 && time > 0) {
		day -= 30
		month++
	}
	if day > 0 && time < 0 {
		time += 86400000000
		day--
	} else if day < 0 && time > 0 {
		time -= 86400000000
		day++
	}
	return SqlInterval{Month: month, Day: day, Time: time, Valid: true}, ""
}

func temporalDateToTimestamp(days int32) (int64, string) {
	inf := temporalDateIsInf(days)
	if inf > 0 {
		return math.MaxInt64, ""
	}
	if inf < 0 {
		return math.MinInt64, ""
	}
	if days >= 106751983 {
		return 0, "22008"
	}
	return int64(days) * 86400000000, ""
}

func temporalDateToTimestampOverflow(days int32) (int64, int) {
	inf := temporalDateIsInf(days)
	if inf > 0 {
		return math.MaxInt64, 0
	}
	if inf < 0 {
		return math.MinInt64, 0
	}
	if days >= 106751983 {
		return math.MaxInt64, 1
	}
	return int64(days) * 86400000000, 0
}

func temporalTimestampToDate(usec int64) int32 {
	inf := temporalTimestampIsInf(usec)
	if inf > 0 {
		return math.MaxInt32
	}
	if inf < 0 {
		return math.MinInt32
	}
	days := usec / 86400000000
	time := usec % 86400000000
	if time < 0 {
		time += 86400000000
		days--
	}
	return int32(days)
}

func temporalTimestampToTime(usec int64) (int64, bool) {
	if temporalTimestampIsInf(usec) != 0 {
		return 0, false
	}
	time := usec % 86400000000
	if time < 0 {
		time += 86400000000
	}
	return time, true
}

func temporalDateAddInt(days, amount int32) (int32, string) {
	if temporalDateIsInf(days) != 0 {
		return days, ""
	}
	result := int64(days) + int64(amount)
	if result > math.MaxInt32 || result < math.MinInt32 || !temporalValidDate(int32(result)) {
		return 0, "22008"
	}
	return int32(result), ""
}

func temporalDateSubInt(days, amount int32) (int32, string) {
	if temporalDateIsInf(days) != 0 {
		return days, ""
	}
	result := int64(days) - int64(amount)
	if result > math.MaxInt32 || result < math.MinInt32 || !temporalValidDate(int32(result)) {
		return 0, "22008"
	}
	return int32(result), ""
}

func temporalTimestampSub(left, right int64) (SqlInterval, string) {
	leftInf := temporalTimestampIsInf(left)
	rightInf := temporalTimestampIsInf(right)
	if leftInf != 0 || rightInf != 0 {
		if leftInf < 0 {
			if rightInf < 0 {
				return SqlInterval{}, "22008"
			}
			return temporalIntervalSentinel(-1), ""
		}
		if leftInf > 0 {
			if rightInf > 0 {
				return SqlInterval{}, "22008"
			}
			return temporalIntervalSentinel(1), ""
		}
		if rightInf < 0 {
			return temporalIntervalSentinel(1), ""
		}
		return temporalIntervalSentinel(-1), ""
	}
	time, err := temporalSubInt64(left, right)
	if err != "" {
		return SqlInterval{}, err
	}
	return temporalJustifyHours(SqlInterval{Time: time, Valid: true})
}

func temporalDateTimestampOrder(days int32, usec int64) int64 {
	converted, overflow := temporalDateToTimestampOverflow(days)
	if overflow > 0 {
		if temporalTimestampIsInf(usec) > 0 {
			return -1
		}
		return 1
	}
	if converted == usec {
		return 0
	}
	if converted < usec {
		return -1
	}
	return 1
}

func temporalCheck2(leftErr, rightErr string, leftValid, rightValid bool) (bool, string) {
	if leftErr != "" {
		return true, leftErr
	}
	if rightErr != "" {
		return true, rightErr
	}
	if !leftValid || !rightValid {
		return true, ""
	}
	return false, ""
}

func temporalCheck1(err string, valid bool) (bool, string) {
	if err != "" {
		return true, err
	}
	if !valid {
		return true, ""
	}
	return false, ""
}

func temporalCmpBool(order SqlInteger, operation string) SqlBoolean {
	if order.Error != "" {
		return SqlBoolean{Error: order.Error}
	}
	if !order.Valid {
		return SqlBoolean{}
	}
	result := false
	switch operation {
	case "eq":
		result = order.Value == 0
	case "ne":
		result = order.Value != 0
	case "lt":
		result = order.Value < 0
	case "le":
		result = order.Value <= 0
	case "gt":
		result = order.Value > 0
	case "ge":
		result = order.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func datePlInt(left SqlDate, right SqlInteger) SqlDate {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlDate{Error: err}
	}
	days, err := temporalDateAddInt(left.Days, int32(right.Value))
	if err != "" {
		return SqlDate{Error: err}
	}
	return SqlDate{Days: days, Valid: true}
}

func intPlDate(left SqlInteger, right SqlDate) SqlDate {
	return datePlInt(right, left)
}

func dateMiInt(left SqlDate, right SqlInteger) SqlDate {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlDate{Error: err}
	}
	days, err := temporalDateSubInt(left.Days, int32(right.Value))
	if err != "" {
		return SqlDate{Error: err}
	}
	return SqlDate{Days: days, Valid: true}
}

func dateMiDate(left, right SqlDate) SqlInteger {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInteger{Error: err}
	}
	if temporalDateIsInf(left.Days) != 0 || temporalDateIsInf(right.Days) != 0 {
		return SqlInteger{Error: "22008"}
	}
	return SqlInteger{Value: int64(left.Days - right.Days), Valid: true}
}

func datePlInterval(left SqlDate, right SqlInterval) SqlTimestamp {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimestamp{Error: err}
	}
	base, err := temporalDateToTimestamp(left.Days)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	usec, err := temporalTimestampAddInterval(base, right)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	return SqlTimestamp{Usec: usec, Valid: true}
}

func intervalPlDate(left SqlInterval, right SqlDate) SqlTimestamp {
	return datePlInterval(right, left)
}

func dateMiInterval(left SqlDate, right SqlInterval) SqlTimestamp {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimestamp{Error: err}
	}
	negated, err := temporalIntervalNeg(right)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	return datePlInterval(left, negated)
}

func datePlTime(left SqlDate, right SqlTime) SqlTimestamp {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimestamp{Error: err}
	}
	usec, err := temporalDateToTimestamp(left.Days)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	if temporalTimestampIsInf(usec) != 0 {
		return SqlTimestamp{Usec: usec, Valid: true}
	}
	usec, err = temporalAddInt64(usec, right.Usec)
	if err != "" || !temporalValidTimestamp(usec) {
		return SqlTimestamp{Error: "22008"}
	}
	return SqlTimestamp{Usec: usec, Valid: true}
}

func timePlDate(left SqlTime, right SqlDate) SqlTimestamp {
	return datePlTime(right, left)
}

func datePlTimetz(left SqlDate, right SqlTimeTz) SqlTimestamptz {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimestamptz{Error: err}
	}
	inf := temporalDateIsInf(left.Days)
	if inf > 0 {
		return SqlTimestamptz{Usec: math.MaxInt64, Valid: true}
	}
	if inf < 0 {
		return SqlTimestamptz{Usec: math.MinInt64, Valid: true}
	}
	if left.Days >= 106751983 {
		return SqlTimestamptz{Error: "22008"}
	}
	usec := int64(left.Days)*86400000000 + right.Usec + int64(right.Zone)*1000000
	if !temporalValidTimestamp(usec) {
		return SqlTimestamptz{Error: "22008"}
	}
	return SqlTimestamptz{Usec: usec, Valid: true}
}

func timetzPlDate(left SqlTimeTz, right SqlDate) SqlTimestamptz {
	return datePlTimetz(right, left)
}

func timestampPlInterval(left SqlTimestamp, right SqlInterval) SqlTimestamp {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimestamp{Error: err}
	}
	usec, err := temporalTimestampAddInterval(left.Usec, right)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	return SqlTimestamp{Usec: usec, Valid: true}
}

func intervalPlTimestamp(left SqlInterval, right SqlTimestamp) SqlTimestamp {
	return timestampPlInterval(right, left)
}

func timestampMiInterval(left SqlTimestamp, right SqlInterval) SqlTimestamp {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimestamp{Error: err}
	}
	negated, err := temporalIntervalNeg(right)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	return timestampPlInterval(left, negated)
}

func timestampMiTimestamp(left, right SqlTimestamp) SqlInterval {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalTimestampSub(left.Usec, right.Usec)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func timestamptzPlInterval(left SqlTimestamptz, right SqlInterval) SqlTimestamptz {
	result := timestampPlInterval(SqlTimestamp{Usec: left.Usec, Valid: left.Valid, Error: left.Error}, right)
	return SqlTimestamptz{Usec: result.Usec, Valid: result.Valid, Error: result.Error}
}

func intervalPlTimestamptz(left SqlInterval, right SqlTimestamptz) SqlTimestamptz {
	return timestamptzPlInterval(right, left)
}

func timestamptzMiInterval(left SqlTimestamptz, right SqlInterval) SqlTimestamptz {
	result := timestampMiInterval(SqlTimestamp{Usec: left.Usec, Valid: left.Valid, Error: left.Error}, right)
	return SqlTimestamptz{Usec: result.Usec, Valid: result.Valid, Error: result.Error}
}

func timestamptzMiTimestamptz(left, right SqlTimestamptz) SqlInterval {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalTimestampSub(left.Usec, right.Usec)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func timePlInterval(left SqlTime, right SqlInterval) SqlTime {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTime{Error: err}
	}
	if temporalIntervalIsInf(right) != 0 {
		return SqlTime{Error: "22008"}
	}
	return SqlTime{Usec: temporalTimeWrap(left.Usec + right.Time), Valid: true}
}

func intervalPlTime(left SqlInterval, right SqlTime) SqlTime {
	return timePlInterval(right, left)
}

func timeMiInterval(left SqlTime, right SqlInterval) SqlTime {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTime{Error: err}
	}
	if temporalIntervalIsInf(right) != 0 {
		return SqlTime{Error: "22008"}
	}
	return SqlTime{Usec: temporalTimeWrap(left.Usec - right.Time), Valid: true}
}

func timeMiTime(left, right SqlTime) SqlInterval {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInterval{Error: err}
	}
	return SqlInterval{Time: left.Usec - right.Usec, Valid: true}
}

func timetzPlInterval(left SqlTimeTz, right SqlInterval) SqlTimeTz {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimeTz{Error: err}
	}
	if temporalIntervalIsInf(right) != 0 {
		return SqlTimeTz{Error: "22008"}
	}
	return SqlTimeTz{Usec: temporalTimeWrap(left.Usec + right.Time), Zone: left.Zone, Valid: true}
}

func intervalPlTimetz(left SqlInterval, right SqlTimeTz) SqlTimeTz {
	return timetzPlInterval(right, left)
}

func timetzMiInterval(left SqlTimeTz, right SqlInterval) SqlTimeTz {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlTimeTz{Error: err}
	}
	if temporalIntervalIsInf(right) != 0 {
		return SqlTimeTz{Error: "22008"}
	}
	return SqlTimeTz{Usec: temporalTimeWrap(left.Usec - right.Time), Zone: left.Zone, Valid: true}
}

func intervalPl(left, right SqlInterval) SqlInterval {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalIntervalAdd(left, right)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func intervalMi(left, right SqlInterval) SqlInterval {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalIntervalSub(left, right)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func intervalUm(value SqlInterval) SqlInterval {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalIntervalNeg(value)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func intervalMul(left SqlInterval, right SqlFloat) SqlInterval {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalIntervalMul(left, right.Value, false)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func mulDInterval(left SqlFloat, right SqlInterval) SqlInterval {
	return intervalMul(right, left)
}

func intervalDiv(left SqlInterval, right SqlFloat) SqlInterval {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalIntervalMul(left, right.Value, true)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func justifyHours(value SqlInterval) SqlInterval {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalJustifyHours(value)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func justifyDays(value SqlInterval) SqlInterval {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalJustifyDays(value)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func justifyInterval(value SqlInterval) SqlInterval {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalJustifyInterval(value)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func dateFromTimestamp(value SqlTimestamp) SqlDate {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlDate{Error: err}
	}
	return SqlDate{Days: temporalTimestampToDate(value.Usec), Valid: true}
}

func dateFromTimestamptz(value SqlTimestamptz) SqlDate {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlDate{Error: err}
	}
	return SqlDate{Days: temporalTimestampToDate(value.Usec), Valid: true}
}

func timestampFromDate(value SqlDate) SqlTimestamp {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTimestamp{Error: err}
	}
	usec, err := temporalDateToTimestamp(value.Days)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	return SqlTimestamp{Usec: usec, Valid: true}
}

func timestampFromDateTime(left SqlDate, right SqlTime) SqlTimestamp {
	return datePlTime(left, right)
}

func timestampFromTimestamptz(value SqlTimestamptz) SqlTimestamp {
	return SqlTimestamp{Usec: value.Usec, Valid: value.Valid, Error: value.Error}
}

func timestamptzFromTimestamp(value SqlTimestamp) SqlTimestamptz {
	return SqlTimestamptz{Usec: value.Usec, Valid: value.Valid, Error: value.Error}
}

func timestamptzFromDate(value SqlDate) SqlTimestamptz {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTimestamptz{Error: err}
	}
	usec, err := temporalDateToTimestamp(value.Days)
	if err != "" {
		return SqlTimestamptz{Error: err}
	}
	return SqlTimestamptz{Usec: usec, Valid: true}
}

func timestamptzFromDateTime(left SqlDate, right SqlTime) SqlTimestamptz {
	result := datePlTime(left, right)
	return SqlTimestamptz{Usec: result.Usec, Valid: result.Valid, Error: result.Error}
}

func timestamptzFromDateTimetz(left SqlDate, right SqlTimeTz) SqlTimestamptz {
	return datePlTimetz(left, right)
}

func timeFromTimestamp(value SqlTimestamp) SqlTime {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTime{Error: err}
	}
	time, ok := temporalTimestampToTime(value.Usec)
	if !ok {
		return SqlTime{}
	}
	return SqlTime{Usec: time, Valid: true}
}

func timeFromTimestamptz(value SqlTimestamptz) SqlTime {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTime{Error: err}
	}
	time, ok := temporalTimestampToTime(value.Usec)
	if !ok {
		return SqlTime{}
	}
	return SqlTime{Usec: time, Valid: true}
}

func timeFromTimetz(value SqlTimeTz) SqlTime {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTime{Error: err}
	}
	return SqlTime{Usec: value.Usec, Valid: true}
}

func timeFromInterval(value SqlInterval) SqlTime {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTime{Error: err}
	}
	if temporalIntervalIsInf(value) != 0 {
		return SqlTime{Error: "22008"}
	}
	time := value.Time % 86400000000
	if time < 0 {
		time += 86400000000
	}
	return SqlTime{Usec: time, Valid: true}
}

func timetzFromTime(value SqlTime) SqlTimeTz {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTimeTz{Error: err}
	}
	return SqlTimeTz{Usec: value.Usec, Zone: 0, Valid: true}
}

func timetzFromTimestamptz(value SqlTimestamptz) SqlTimeTz {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlTimeTz{Error: err}
	}
	time, ok := temporalTimestampToTime(value.Usec)
	if !ok {
		return SqlTimeTz{}
	}
	return SqlTimeTz{Usec: time, Zone: 0, Valid: true}
}

func intervalFromTime(value SqlTime) SqlInterval {
	if stop, err := temporalCheck1(value.Error, value.Valid); stop {
		return SqlInterval{Error: err}
	}
	return SqlInterval{Time: value.Usec, Valid: true}
}

func timezoneIntervalTimestamp(zone SqlInterval, value SqlTimestamp) SqlTimestamptz {
	if stop, err := temporalCheck2(zone.Error, value.Error, zone.Valid, value.Valid); stop {
		return SqlTimestamptz{Error: err}
	}
	if temporalTimestampIsInf(value.Usec) != 0 {
		return SqlTimestamptz{Usec: value.Usec, Valid: true}
	}
	tz, err := temporalIntervalZoneSeconds(zone)
	if err != "" {
		return SqlTimestamptz{Error: err}
	}
	result, err := temporalDt2local(value.Usec, tz)
	if err != "" {
		return SqlTimestamptz{Error: err}
	}
	return SqlTimestamptz{Usec: result, Valid: true}
}

func timezoneIntervalTimestamptz(zone SqlInterval, value SqlTimestamptz) SqlTimestamp {
	if stop, err := temporalCheck2(zone.Error, value.Error, zone.Valid, value.Valid); stop {
		return SqlTimestamp{Error: err}
	}
	if temporalTimestampIsInf(value.Usec) != 0 {
		return SqlTimestamp{Usec: value.Usec, Valid: true}
	}
	tz, err := temporalIntervalZoneSeconds(zone)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	result, err := temporalDt2local(value.Usec, -tz)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	return SqlTimestamp{Usec: result, Valid: true}
}

func timezoneIntervalTimetz(zone SqlInterval, value SqlTimeTz) SqlTimeTz {
	if stop, err := temporalCheck2(zone.Error, value.Error, zone.Valid, value.Valid); stop {
		return SqlTimeTz{Error: err}
	}
	seconds, err := temporalIntervalZoneSeconds(zone)
	if err != "" {
		return SqlTimeTz{Error: err}
	}
	tz := -seconds
	return SqlTimeTz{
		Usec:  temporalTimeWrap(value.Usec + (int64(value.Zone)-int64(tz))*1000000),
		Zone:  tz,
		Valid: true,
	}
}

func dateTimestampCompare(left SqlDate, right SqlTimestamp) SqlInteger {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInteger{Error: err}
	}
	return SqlInteger{Value: temporalDateTimestampOrder(left.Days, right.Usec), Valid: true}
}

func timestampDateCompare(left SqlTimestamp, right SqlDate) SqlInteger {
	order := dateTimestampCompare(right, left)
	if order.Error != "" || !order.Valid {
		return order
	}
	return SqlInteger{Value: -order.Value, Valid: true}
}

func dateTimestamptzCompare(left SqlDate, right SqlTimestamptz) SqlInteger {
	return dateTimestampCompare(left, SqlTimestamp{Usec: right.Usec, Valid: right.Valid, Error: right.Error})
}

func timestamptzDateCompare(left SqlTimestamptz, right SqlDate) SqlInteger {
	order := dateTimestamptzCompare(right, left)
	if order.Error != "" || !order.Valid {
		return order
	}
	return SqlInteger{Value: -order.Value, Valid: true}
}

func timestampTimestamptzCompare(left SqlTimestamp, right SqlTimestamptz) SqlInteger {
	if stop, err := temporalCheck2(left.Error, right.Error, left.Valid, right.Valid); stop {
		return SqlInteger{Error: err}
	}
	order := int64(0)
	if left.Usec < right.Usec {
		order = -1
	} else if left.Usec > right.Usec {
		order = 1
	}
	return SqlInteger{Value: order, Valid: true}
}

func timestamptzTimestampCompare(left SqlTimestamptz, right SqlTimestamp) SqlInteger {
	order := timestampTimestamptzCompare(right, left)
	if order.Error != "" || !order.Valid {
		return order
	}
	return SqlInteger{Value: -order.Value, Valid: true}
}

func dateTimestampEq(left SqlDate, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(dateTimestampCompare(left, right), "eq")
}
func dateTimestampNe(left SqlDate, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(dateTimestampCompare(left, right), "ne")
}
func dateTimestampLt(left SqlDate, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(dateTimestampCompare(left, right), "lt")
}
func dateTimestampLe(left SqlDate, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(dateTimestampCompare(left, right), "le")
}
func dateTimestampGt(left SqlDate, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(dateTimestampCompare(left, right), "gt")
}
func dateTimestampGe(left SqlDate, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(dateTimestampCompare(left, right), "ge")
}
func timestampDateEq(left SqlTimestamp, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestampDateCompare(left, right), "eq")
}
func timestampDateNe(left SqlTimestamp, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestampDateCompare(left, right), "ne")
}
func timestampDateLt(left SqlTimestamp, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestampDateCompare(left, right), "lt")
}
func timestampDateLe(left SqlTimestamp, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestampDateCompare(left, right), "le")
}
func timestampDateGt(left SqlTimestamp, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestampDateCompare(left, right), "gt")
}
func timestampDateGe(left SqlTimestamp, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestampDateCompare(left, right), "ge")
}
func dateTimestamptzEq(left SqlDate, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(dateTimestamptzCompare(left, right), "eq")
}
func dateTimestamptzNe(left SqlDate, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(dateTimestamptzCompare(left, right), "ne")
}
func dateTimestamptzLt(left SqlDate, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(dateTimestamptzCompare(left, right), "lt")
}
func dateTimestamptzLe(left SqlDate, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(dateTimestamptzCompare(left, right), "le")
}
func dateTimestamptzGt(left SqlDate, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(dateTimestamptzCompare(left, right), "gt")
}
func dateTimestamptzGe(left SqlDate, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(dateTimestamptzCompare(left, right), "ge")
}
func timestamptzDateEq(left SqlTimestamptz, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestamptzDateCompare(left, right), "eq")
}
func timestamptzDateNe(left SqlTimestamptz, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestamptzDateCompare(left, right), "ne")
}
func timestamptzDateLt(left SqlTimestamptz, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestamptzDateCompare(left, right), "lt")
}
func timestamptzDateLe(left SqlTimestamptz, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestamptzDateCompare(left, right), "le")
}
func timestamptzDateGt(left SqlTimestamptz, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestamptzDateCompare(left, right), "gt")
}
func timestamptzDateGe(left SqlTimestamptz, right SqlDate) SqlBoolean {
	return temporalCmpBool(timestamptzDateCompare(left, right), "ge")
}
func timestampTimestamptzEq(left SqlTimestamp, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(timestampTimestamptzCompare(left, right), "eq")
}
func timestampTimestamptzNe(left SqlTimestamp, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(timestampTimestamptzCompare(left, right), "ne")
}
func timestampTimestamptzLt(left SqlTimestamp, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(timestampTimestamptzCompare(left, right), "lt")
}
func timestampTimestamptzLe(left SqlTimestamp, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(timestampTimestamptzCompare(left, right), "le")
}
func timestampTimestamptzGt(left SqlTimestamp, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(timestampTimestamptzCompare(left, right), "gt")
}
func timestampTimestamptzGe(left SqlTimestamp, right SqlTimestamptz) SqlBoolean {
	return temporalCmpBool(timestampTimestamptzCompare(left, right), "ge")
}
func timestamptzTimestampEq(left SqlTimestamptz, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(timestamptzTimestampCompare(left, right), "eq")
}
func timestamptzTimestampNe(left SqlTimestamptz, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(timestamptzTimestampCompare(left, right), "ne")
}
func timestamptzTimestampLt(left SqlTimestamptz, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(timestamptzTimestampCompare(left, right), "lt")
}
func timestamptzTimestampLe(left SqlTimestamptz, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(timestamptzTimestampCompare(left, right), "le")
}
func timestamptzTimestampGt(left SqlTimestamptz, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(timestamptzTimestampCompare(left, right), "gt")
}
func timestamptzTimestampGe(left SqlTimestamptz, right SqlTimestamp) SqlBoolean {
	return temporalCmpBool(timestamptzTimestampCompare(left, right), "ge")
}
