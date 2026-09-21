package pgsidsql

import (
	"math"
	"math/big"
	"strconv"
	"strings"
)

type temporalCivil struct {
	Year, Month, Day, Hour, Minute, Second, Fsec, Julian int
}

type temporalPart struct {
	Kind    string
	Integer int64
	Big     *big.Int
	Scale   int
	Float   float64
	Decimal SqlDecimal
	Sign    int
	Error   string
}

type temporalUnit struct {
	Type string
	Name string
}

func temporalStrncmp10(left, right string) bool {
	for index := 0; index < 10; index++ {
		var a, b byte
		if index < len(left) {
			a = left[index]
		}
		if index < len(right) {
			b = right[index]
		}
		if a != b {
			return false
		}
		if a == 0 {
			return true
		}
	}
	return true
}

func temporalDowncaseUnit(value string) string {
	bytes := []byte(value)
	for index, b := range bytes {
		if b >= 'A' && b <= 'Z' {
			bytes[index] = b + 32
		}
	}
	if len(bytes) > 63 {
		bytes = bytes[:63]
	}
	return string(bytes)
}

func temporalDecodeUnit(value string, special bool) temporalUnit {
	text := temporalDowncaseUnit(value)
	delta := []string{
		"c", "century", "cent", "century", "centuries", "century", "century", "century",
		"d", "day", "day", "day", "days", "day", "dec", "decade", "decade", "decade", "decades", "decade", "decs", "decade",
		"h", "hour", "hour", "hour", "hours", "hour", "hr", "hour", "hrs", "hour",
		"m", "minute", "microsecon", "microsec", "mil", "millennium", "millennia", "millennium", "millennium", "millennium",
		"millisecon", "millisec", "mils", "millennium", "min", "minute", "mins", "minute", "minute", "minute", "minutes", "minute",
		"mon", "month", "mons", "month", "month", "month", "months", "month", "ms", "millisec", "msec", "millisec",
		"msecond", "millisec", "mseconds", "millisec", "msecs", "millisec", "qtr", "quarter", "quarter", "quarter",
		"s", "second", "sec", "second", "second", "second", "seconds", "second", "secs", "second",
		"timezone", "timezone", "timezone_h", "timezone_hour", "timezone_m", "timezone_minute",
		"us", "microsec", "usec", "microsec", "usecond", "microsec", "useconds", "microsec", "usecs", "microsec",
		"w", "week", "week", "week", "weeks", "week", "y", "year", "year", "year", "years", "year", "yr", "year", "yrs", "year",
	}
	for index := 0; index < len(delta); index += 2 {
		if temporalStrncmp10(text, delta[index]) {
			return temporalUnit{Type: "units", Name: delta[index+1]}
		}
	}
	if !special {
		return temporalUnit{Type: "unknown"}
	}
	extra := []string{
		"+infinity", "reserv", "other", "-infinity", "reserv", "other", "allballs", "reserv", "other",
		"dow", "units", "dow", "doy", "units", "doy", "epoch", "reserv", "epoch", "infinity", "reserv", "other",
		"isodow", "units", "isodow", "isoyear", "units", "isoyear", "j", "units", "julian", "jd", "units", "julian",
		"julian", "units", "julian", "mm", "units", "minute", "now", "reserv", "other", "today", "reserv", "other",
		"tomorrow", "reserv", "other", "yesterday", "reserv", "other",
	}
	for index := 0; index < len(extra); index += 3 {
		if temporalStrncmp10(text, extra[index]) {
			return temporalUnit{Type: extra[index+1], Name: extra[index+2]}
		}
	}
	return temporalUnit{Type: "unknown"}
}

func temporalJ2day(date int) int {
	date = (date + 1) % 7
	if date < 0 {
		date += 7
	}
	return date
}

func temporalIsoWeek(year, month, day int) int {
	dayn := temporalDate2j(year, month, day)
	day4 := temporalDate2j(year, 1, 4)
	day0 := temporalJ2day(day4 - 1)
	if dayn < day4-day0 {
		day4 = temporalDate2j(year-1, 1, 4)
		day0 = temporalJ2day(day4 - 1)
	}
	week := (dayn-(day4-day0))/7 + 1
	if week >= 52 {
		day4 = temporalDate2j(year+1, 1, 4)
		day0 = temporalJ2day(day4 - 1)
		if dayn >= day4-day0 {
			week = (dayn-(day4-day0))/7 + 1
		}
	}
	return week
}

func temporalIsoYear(year, month, day int) int {
	dayn := temporalDate2j(year, month, day)
	day4 := temporalDate2j(year, 1, 4)
	day0 := temporalJ2day(day4 - 1)
	if dayn < day4-day0 {
		year--
		day4 = temporalDate2j(year, 1, 4)
		day0 = temporalJ2day(day4 - 1)
	}
	week := (dayn-(day4-day0))/7 + 1
	if week >= 52 {
		day4 = temporalDate2j(year+1, 1, 4)
		day0 = temporalJ2day(day4 - 1)
		if dayn >= day4-day0 {
			year++
		}
	}
	return year
}

func temporalIsoWeekDate(year, week int) (int, int, int) {
	day4 := temporalDate2j(year, 1, 4)
	day0 := temporalJ2day(day4 - 1)
	return temporalJ2date((week-1)*7 + (day4 - day0))
}

func temporalNumericFromString(digits string, scale int) SqlDecimal {
	negative := false
	if strings.HasPrefix(digits, "-") {
		negative = true
		digits = digits[1:]
	}
	for len(digits) <= scale {
		digits = "0" + digits
	}
	text := digits[:len(digits)-scale] + "." + digits[len(digits)-scale:]
	if negative {
		text = "-" + text
	}
	return decimalInput(text)
}

func temporalNumericScale(value int64, scale int) SqlDecimal {
	return temporalNumericFromString(strconv.FormatInt(value, 10), scale)
}

func temporalNumericScaleBig(value *big.Int, scale int) SqlDecimal {
	return temporalNumericFromString(value.String(), scale)
}

func temporalPartNull() temporalPart { return temporalPart{Kind: "null"} }

func temporalPartInf(negative bool) temporalPart {
	sign := 1
	if negative {
		sign = -1
	}
	return temporalPart{Kind: "inf", Sign: sign}
}

func temporalPartInt(value int64) temporalPart { return temporalPart{Kind: "int", Integer: value} }

func temporalPartScaled(value int64, scale int) temporalPart {
	return temporalPart{Kind: "scaled", Integer: value, Scale: scale}
}

func temporalPartScaledBig(value *big.Int, scale int) temporalPart {
	return temporalPart{Kind: "scaledbig", Big: value, Scale: scale}
}

func temporalPartFloat(value float64) temporalPart { return temporalPart{Kind: "float", Float: value} }

func temporalPartDecimal(value SqlDecimal) temporalPart {
	return temporalPart{Kind: "decimal", Decimal: value}
}

func temporalPartError(code string) temporalPart { return temporalPart{Error: code} }

func temporalPartToDecimal(part temporalPart) SqlDecimal {
	if part.Error != "" {
		return SqlDecimal{Error: part.Error}
	}
	switch part.Kind {
	case "null":
		return SqlDecimal{}
	case "inf":
		if part.Sign < 0 {
			return decimalInput("-Infinity")
		}
		return decimalInput("Infinity")
	case "int":
		return decimalFromInteger(SqlInteger{Value: part.Integer, Valid: true})
	case "scaled":
		return temporalNumericScale(part.Integer, part.Scale)
	case "scaledbig":
		return temporalNumericScaleBig(part.Big, part.Scale)
	case "decimal":
		return part.Decimal
	default:
		return SqlDecimal{Error: "XX000"}
	}
}

func temporalPartToFloat(part temporalPart) SqlFloat {
	if part.Error != "" {
		return SqlFloat{Error: part.Error}
	}
	switch part.Kind {
	case "null":
		return SqlFloat{}
	case "inf":
		return SqlFloat{Value: math.Inf(part.Sign), Valid: true}
	case "int":
		return SqlFloat{Value: float64(part.Integer), Valid: true}
	case "scaled":
		scale := 1.0
		for index := 0; index < part.Scale; index++ {
			scale *= 10
		}
		return SqlFloat{Value: float64(part.Integer) / scale, Valid: true}
	case "scaledbig":
		scale := 1.0
		for index := 0; index < part.Scale; index++ {
			scale *= 10
		}
		value, _ := new(big.Float).SetInt(part.Big).Float64()
		return SqlFloat{Value: value / scale, Valid: true}
	case "float":
		return SqlFloat{Value: part.Float, Valid: true}
	default:
		return SqlFloat{Error: "XX000"}
	}
}

func temporalTimestampCivil(usec int64) (temporalCivil, string) {
	days := usec / 86400000000
	time := usec % 86400000000
	if time < 0 {
		time += 86400000000
		days--
	}
	julian := days + 2451545
	if julian < 0 || julian > 2147483647 {
		return temporalCivil{}, "22008"
	}
	year, month, day := temporalJ2date(int(julian))
	hour := int(time / 3600000000)
	rest := time % 3600000000
	minute := int(rest / 60000000)
	seconds := rest % 60000000
	return temporalCivil{
		Year: year, Month: month, Day: day, Hour: hour, Minute: minute,
		Second: int(seconds / 1000000), Fsec: int(seconds % 1000000), Julian: int(julian),
	}, ""
}

func temporalCivilTimestamp(year, month, day, hour, minute, second, fsec int) (int64, string) {
	days := int64(temporalDate2j(year, month, day) - 2451545)
	usec := days*86400000000 + int64(hour)*3600000000 + int64(minute)*60000000 + int64(second)*1000000 + int64(fsec)
	if usec < -211813488000000000 || usec >= 9223371331200000000 {
		return 0, "22008"
	}
	return usec, ""
}

func temporalDateTimestamp(days int32) (int64, string) {
	if days == math.MaxInt32 {
		return math.MaxInt64, ""
	}
	if days == math.MinInt32 {
		return math.MinInt64, ""
	}
	if days >= 106751983 {
		return 0, "22008"
	}
	return int64(days) * 86400000000, ""
}

func temporalYearValue(year int) int64 {
	if year > 0 {
		return int64(year)
	}
	return int64(year - 1)
}

func temporalDecadeValue(year int, includeZero bool) int64 {
	if (includeZero && year >= 0) || (!includeZero && year > 0) {
		return int64(year / 10)
	}
	return int64(-((8 - (year - 1)) / 10))
}

func temporalCenturyValue(year int) int64 {
	if year > 0 {
		return int64((year + 99) / 100)
	}
	return int64(-((99 - (year - 1)) / 100))
}

func temporalMillenniumValue(year int) int64 {
	if year > 0 {
		return int64((year + 999) / 1000)
	}
	return int64(-((999 - (year - 1)) / 1000))
}

func temporalIsoYearValue(year, month, day int) int64 {
	iso := temporalIsoYear(year, month, day)
	if iso <= 0 {
		iso -= 1
	}
	return int64(iso)
}

func temporalDowValue(julian int, iso bool) int64 {
	dow := temporalJ2day(julian)
	if iso && dow == 0 {
		dow = 7
	}
	return int64(dow)
}

func temporalTruncYear(year int, unit string) int {
	if unit == "millennium" {
		if year > 0 {
			year = ((year+999)/1000)*1000 - 999
		} else {
			year = -((999-(year-1))/1000)*1000 + 1
		}
	}
	if unit == "millennium" || unit == "century" {
		if year > 0 {
			year = ((year+99)/100)*100 - 99
		} else {
			year = -((99-(year-1))/100)*100 + 1
		}
	}
	if unit == "decade" {
		if year > 0 {
			year = (year / 10) * 10
		} else {
			year = -((8 - (year - 1)) / 10) * 10
		}
	}
	return year
}

func temporalContains(values []string, name string) bool {
	for _, value := range values {
		if value == name {
			return true
		}
	}
	return false
}

func temporalInfiniteTimestampPart(unit temporalUnit, negative bool) temporalPart {
	if unit.Type != "units" && unit.Type != "reserv" {
		return temporalPartError("22023")
	}
	oscillating := []string{"microsec", "millisec", "second", "minute", "hour", "day", "month", "quarter", "week", "dow", "isodow", "doy", "timezone", "timezone_hour", "timezone_minute"}
	monotonic := []string{"year", "decade", "century", "millennium", "julian", "isoyear", "epoch"}
	if temporalContains(oscillating, unit.Name) {
		return temporalPartNull()
	}
	if temporalContains(monotonic, unit.Name) {
		return temporalPartInf(negative)
	}
	return temporalPartError("0A000")
}

func temporalTimestampPart(field string, usec int64, numeric, withZone bool) temporalPart {
	unit := temporalDecodeUnit(field, true)
	infinite := usec == math.MinInt64 || usec == math.MaxInt64
	if infinite {
		return temporalInfiniteTimestampPart(unit, usec == math.MinInt64)
	}
	if unit.Type == "units" {
		civil, err := temporalTimestampCivil(usec)
		if err != "" {
			return temporalPartError(err)
		}
		scaled := int64(civil.Second)*1000000 + int64(civil.Fsec)
		switch unit.Name {
		case "timezone", "timezone_hour", "timezone_minute":
			if !withZone {
				return temporalPartError("0A000")
			}
			return temporalPartInt(0)
		case "microsec":
			return temporalPartInt(scaled)
		case "millisec":
			if numeric {
				return temporalPartScaled(scaled, 3)
			}
			return temporalPartFloat(float64(civil.Second)*1000 + float64(civil.Fsec)/1000)
		case "second":
			if numeric {
				return temporalPartScaled(scaled, 6)
			}
			return temporalPartFloat(float64(civil.Second) + float64(civil.Fsec)/1000000)
		case "minute":
			return temporalPartInt(int64(civil.Minute))
		case "hour":
			return temporalPartInt(int64(civil.Hour))
		case "day":
			return temporalPartInt(int64(civil.Day))
		case "month":
			return temporalPartInt(int64(civil.Month))
		case "quarter":
			return temporalPartInt(int64((civil.Month-1)/3 + 1))
		case "week":
			return temporalPartInt(int64(temporalIsoWeek(civil.Year, civil.Month, civil.Day)))
		case "year":
			return temporalPartInt(temporalYearValue(civil.Year))
		case "decade":
			return temporalPartInt(temporalDecadeValue(civil.Year, !withZone))
		case "century":
			return temporalPartInt(temporalCenturyValue(civil.Year))
		case "millennium":
			return temporalPartInt(temporalMillenniumValue(civil.Year))
		case "julian":
			time := ((civil.Hour*60+civil.Minute)*60+civil.Second)*1000000 + civil.Fsec
			if numeric {
				return temporalPartDecimal(decimalAdd(
					decimalFromInteger(SqlInteger{Value: int64(civil.Julian), Valid: true}),
					decimalDiv(
						decimalFromInteger(SqlInteger{Value: int64(time), Valid: true}),
						decimalFromInteger(SqlInteger{Value: 86400000000, Valid: true}),
					),
				))
			}
			return temporalPartFloat(float64(civil.Julian) + (float64(civil.Hour*3600+civil.Minute*60+civil.Second)+float64(civil.Fsec)/1000000)/86400)
		case "isoyear":
			return temporalPartInt(temporalIsoYearValue(civil.Year, civil.Month, civil.Day))
		case "dow":
			return temporalPartInt(temporalDowValue(civil.Julian, false))
		case "isodow":
			return temporalPartInt(temporalDowValue(civil.Julian, true))
		case "doy":
			return temporalPartInt(int64(civil.Julian - temporalDate2j(civil.Year, 1, 1) + 1))
		default:
			return temporalPartError("0A000")
		}
	}
	if unit.Type == "reserv" {
		if unit.Name != "epoch" {
			return temporalPartError("0A000")
		}
		const epoch int64 = -946684800000000
		if numeric {
			if usec < 9223371090169975807 {
				return temporalPartScaled(usec-epoch, 6)
			}
			return temporalPartDecimal(sqlDecimalRound(
				decimalDiv(
					decimalSub(
						decimalFromInteger(SqlInteger{Value: usec, Valid: true}),
						decimalFromInteger(SqlInteger{Value: epoch, Valid: true}),
					),
					decimalFromInteger(SqlInteger{Value: 1000000, Valid: true}),
				),
				SqlInteger{Value: 6, Valid: true},
				false,
			))
		}
		if usec < 9223371090169975807 {
			return temporalPartFloat(float64(usec-epoch) / 1000000)
		}
		return temporalPartFloat((float64(usec) - float64(epoch)) / 1000000)
	}
	return temporalPartError("22023")
}

func temporalDateExtractPart(field string, days int32) temporalPart {
	unit := temporalDecodeUnit(field, true)
	infinite := days == math.MaxInt32 || days == math.MinInt32
	if infinite && (unit.Type == "units" || unit.Type == "reserv") {
		oscillating := []string{"day", "month", "quarter", "week", "dow", "isodow", "doy"}
		monotonic := []string{"year", "decade", "century", "millennium", "julian", "isoyear", "epoch"}
		if temporalContains(oscillating, unit.Name) {
			return temporalPartNull()
		}
		if temporalContains(monotonic, unit.Name) {
			return temporalPartInf(days == math.MinInt32)
		}
		return temporalPartError("0A000")
	}
	if unit.Type == "units" {
		year, month, day := temporalJ2date(int(days) + 2451545)
		julian := int(days) + 2451545
		switch unit.Name {
		case "day":
			return temporalPartInt(int64(day))
		case "month":
			return temporalPartInt(int64(month))
		case "quarter":
			return temporalPartInt(int64((month-1)/3 + 1))
		case "week":
			return temporalPartInt(int64(temporalIsoWeek(year, month, day)))
		case "year":
			return temporalPartInt(temporalYearValue(year))
		case "decade":
			return temporalPartInt(temporalDecadeValue(year, true))
		case "century":
			return temporalPartInt(temporalCenturyValue(year))
		case "millennium":
			return temporalPartInt(temporalMillenniumValue(year))
		case "julian":
			return temporalPartInt(int64(julian))
		case "isoyear":
			return temporalPartInt(temporalIsoYearValue(year, month, day))
		case "dow":
			return temporalPartInt(temporalDowValue(julian, false))
		case "isodow":
			return temporalPartInt(temporalDowValue(julian, true))
		case "doy":
			return temporalPartInt(int64(julian - temporalDate2j(year, 1, 1) + 1))
		default:
			return temporalPartError("0A000")
		}
	}
	if unit.Type == "reserv" {
		if unit.Name != "epoch" {
			return temporalPartError("0A000")
		}
		return temporalPartInt((int64(days) + 10957) * 86400)
	}
	return temporalPartError("22023")
}

func temporalTimePart(field string, usec int64, numeric bool, zone *int32) temporalPart {
	unit := temporalDecodeUnit(field, true)
	hour := usec / 3600000000
	rest := usec % 3600000000
	minute := rest / 60000000
	seconds := rest % 60000000
	second := seconds / 1000000
	fsec := seconds % 1000000
	scaled := second*1000000 + fsec
	if unit.Type == "units" {
		switch unit.Name {
		case "timezone":
			if zone == nil {
				return temporalPartError("0A000")
			}
			return temporalPartInt(int64(-*zone))
		case "timezone_minute":
			if zone == nil {
				return temporalPartError("0A000")
			}
			return temporalPartInt((-int64(*zone) / 60) % 60)
		case "timezone_hour":
			if zone == nil {
				return temporalPartError("0A000")
			}
			return temporalPartInt(-int64(*zone) / 3600)
		case "microsec":
			return temporalPartInt(scaled)
		case "millisec":
			if numeric {
				return temporalPartScaled(scaled, 3)
			}
			return temporalPartFloat(float64(second)*1000 + float64(fsec)/1000)
		case "second":
			if numeric {
				return temporalPartScaled(scaled, 6)
			}
			return temporalPartFloat(float64(second) + float64(fsec)/1000000)
		case "minute":
			return temporalPartInt(minute)
		case "hour":
			return temporalPartInt(hour)
		default:
			return temporalPartError("0A000")
		}
	}
	if unit.Type == "reserv" && unit.Name == "epoch" {
		if zone == nil {
			if numeric {
				return temporalPartScaled(usec, 6)
			}
			return temporalPartFloat(float64(usec) / 1000000)
		}
		epoch := usec + int64(*zone)*1000000
		if numeric {
			return temporalPartScaled(epoch, 6)
		}
		return temporalPartFloat(float64(usec)/1000000 + float64(*zone))
	}
	return temporalPartError("22023")
}

func temporalInfiniteIntervalPart(unit temporalUnit, negative bool) temporalPart {
	if unit.Type != "units" && unit.Type != "reserv" {
		return temporalPartError("22023")
	}
	oscillating := []string{"microsec", "millisec", "second", "minute", "week", "month", "quarter"}
	monotonic := []string{"hour", "day", "year", "decade", "century", "millennium", "epoch"}
	if temporalContains(oscillating, unit.Name) {
		return temporalPartNull()
	}
	if temporalContains(monotonic, unit.Name) {
		return temporalPartInf(negative)
	}
	return temporalPartError("0A000")
}

func temporalIntervalPart(field string, month, day int32, time int64, numeric bool) temporalPart {
	unit := temporalDecodeUnit(field, true)
	infinite := (month == math.MinInt32 && day == math.MinInt32 && time == math.MinInt64) ||
		(month == math.MaxInt32 && day == math.MaxInt32 && time == math.MaxInt64)
	if infinite {
		return temporalInfiniteIntervalPart(unit, month == math.MinInt32)
	}
	year := month / 12
	mon := month % 12
	hour := time / 3600000000
	rest := time % 3600000000
	minute := rest / 60000000
	rest %= 60000000
	second := rest / 1000000
	fsec := rest % 1000000
	scaled := second*1000000 + fsec
	if unit.Type == "units" {
		switch unit.Name {
		case "microsec":
			return temporalPartInt(scaled)
		case "millisec":
			if numeric {
				return temporalPartScaled(scaled, 3)
			}
			return temporalPartFloat(float64(second)*1000 + float64(fsec)/1000)
		case "second":
			if numeric {
				return temporalPartScaled(scaled, 6)
			}
			return temporalPartFloat(float64(second) + float64(fsec)/1000000)
		case "minute":
			return temporalPartInt(minute)
		case "hour":
			return temporalPartInt(hour)
		case "day":
			return temporalPartInt(int64(day))
		case "week":
			return temporalPartInt(int64(day / 7))
		case "month":
			return temporalPartInt(int64(mon))
		case "quarter":
			if month >= 0 {
				return temporalPartInt(int64(mon/3 + 1))
			}
			return temporalPartInt(-int64(((-month % 12) / 3) + 1))
		case "year":
			return temporalPartInt(int64(year))
		case "decade":
			return temporalPartInt(int64(year / 10))
		case "century":
			return temporalPartInt(int64(year / 100))
		case "millennium":
			return temporalPartInt(int64(year / 1000))
		default:
			return temporalPartError("0A000")
		}
	}
	if unit.Type == "reserv" && unit.Name == "epoch" {
		secs := (int64(1461)*int64(year) + int64(120)*int64(mon) + int64(4)*int64(day)) * 21600
		if numeric {
			total := new(big.Int).Mul(big.NewInt(secs), big.NewInt(1000000))
			total.Add(total, big.NewInt(time))
			return temporalPartScaledBig(total, 6)
		}
		return temporalPartFloat(float64(time)/1000000 + 31557600*float64(year) + 2592000*float64(mon) + 86400*float64(day))
	}
	return temporalPartError("22023")
}

func temporalTimestampTrunc(field string, usec int64) (int64, string) {
	unit := temporalDecodeUnit(field, false)
	if unit.Type != "units" {
		return 0, "22023"
	}
	allowed := []string{"week", "millennium", "century", "decade", "year", "quarter", "month", "day", "hour", "minute", "second", "millisec", "microsec"}
	if !temporalContains(allowed, unit.Name) {
		return 0, "0A000"
	}
	if usec == math.MinInt64 || usec == math.MaxInt64 {
		return usec, ""
	}
	civil, err := temporalTimestampCivil(usec)
	if err != "" {
		return 0, err
	}
	year, month, day, hour, minute, second, fsec := civil.Year, civil.Month, civil.Day, civil.Hour, civil.Minute, civil.Second, civil.Fsec
	if unit.Name == "week" {
		week := temporalIsoWeek(year, month, day)
		if week >= 52 && month == 1 {
			year--
		}
		if week <= 1 && month == 12 {
			year++
		}
		year, month, day = temporalIsoWeekDate(year, week)
		return temporalCivilTimestamp(year, month, day, 0, 0, 0, 0)
	}
	year = temporalTruncYear(year, unit.Name)
	if temporalContains([]string{"millennium", "century", "decade", "year"}, unit.Name) {
		month = 1
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter"}, unit.Name) {
		month = 3*((month-1)/3) + 1
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month"}, unit.Name) {
		day = 1
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day"}, unit.Name) {
		hour = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day", "hour"}, unit.Name) {
		minute = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day", "hour", "minute"}, unit.Name) {
		second = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day", "hour", "minute", "second"}, unit.Name) {
		fsec = 0
	}
	if unit.Name == "millisec" {
		fsec = (fsec / 1000) * 1000
	}
	return temporalCivilTimestamp(year, month, day, hour, minute, second, fsec)
}

func temporalIntervalTrunc(field string, month, day int32, time int64) (int32, int32, int64, string) {
	unit := temporalDecodeUnit(field, false)
	if unit.Type != "units" {
		return 0, 0, 0, "22023"
	}
	allowed := []string{"millennium", "century", "decade", "year", "quarter", "month", "day", "hour", "minute", "second", "millisec", "microsec"}
	if !temporalContains(allowed, unit.Name) {
		return 0, 0, 0, "0A000"
	}
	if (month == math.MinInt32 && day == math.MinInt32 && time == math.MinInt64) ||
		(month == math.MaxInt32 && day == math.MaxInt32 && time == math.MaxInt64) {
		return month, day, time, ""
	}
	year := month / 12
	mon := month % 12
	hour := time / 3600000000
	rest := time % 3600000000
	minute := rest / 60000000
	rest %= 60000000
	second := rest / 1000000
	fsec := rest % 1000000
	mday := day
	if unit.Name == "millennium" {
		year = (year / 1000) * 1000
	}
	if unit.Name == "millennium" || unit.Name == "century" {
		year = (year / 100) * 100
	}
	if unit.Name == "millennium" || unit.Name == "century" || unit.Name == "decade" {
		year = (year / 10) * 10
	}
	if temporalContains([]string{"millennium", "century", "decade", "year"}, unit.Name) {
		mon = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter"}, unit.Name) {
		mon = 3 * (mon / 3)
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month"}, unit.Name) {
		mday = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day"}, unit.Name) {
		hour = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day", "hour"}, unit.Name) {
		minute = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day", "hour", "minute"}, unit.Name) {
		second = 0
	}
	if temporalContains([]string{"millennium", "century", "decade", "year", "quarter", "month", "day", "hour", "minute", "second"}, unit.Name) {
		fsec = 0
	}
	if unit.Name == "millisec" {
		fsec = (fsec / 1000) * 1000
	}
	resultMonth := int64(year)*12 + int64(mon)
	if resultMonth > math.MaxInt32 || resultMonth < math.MinInt32 {
		return 0, 0, 0, "22008"
	}
	resultTime := hour*3600000000 + minute*60000000 + second*1000000 + fsec
	if (resultMonth == math.MinInt32 && mday == math.MinInt32 && resultTime == math.MinInt64) ||
		(resultMonth == math.MaxInt32 && mday == math.MaxInt32 && resultTime == math.MaxInt64) {
		return 0, 0, 0, "22008"
	}
	return int32(resultMonth), mday, resultTime, ""
}

func extractTimestamp(field SqlText, value SqlTimestamp) SqlDecimal {
	if field.Error != "" {
		return SqlDecimal{Error: field.Error}
	}
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlDecimal{}
	}
	return temporalPartToDecimal(temporalTimestampPart(field.Value, value.Usec, true, false))
}

func extractTimestamptz(field SqlText, value SqlTimestamptz) SqlDecimal {
	if field.Error != "" {
		return SqlDecimal{Error: field.Error}
	}
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlDecimal{}
	}
	return temporalPartToDecimal(temporalTimestampPart(field.Value, value.Usec, true, true))
}

func extractDate(field SqlText, value SqlDate) SqlDecimal {
	if field.Error != "" {
		return SqlDecimal{Error: field.Error}
	}
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlDecimal{}
	}
	return temporalPartToDecimal(temporalDateExtractPart(field.Value, value.Days))
}

func extractTime(field SqlText, value SqlTime) SqlDecimal {
	if field.Error != "" {
		return SqlDecimal{Error: field.Error}
	}
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlDecimal{}
	}
	return temporalPartToDecimal(temporalTimePart(field.Value, value.Usec, true, nil))
}

func extractTimetz(field SqlText, value SqlTimeTz) SqlDecimal {
	if field.Error != "" {
		return SqlDecimal{Error: field.Error}
	}
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlDecimal{}
	}
	zone := value.Zone
	return temporalPartToDecimal(temporalTimePart(field.Value, value.Usec, true, &zone))
}

func extractInterval(field SqlText, value SqlInterval) SqlDecimal {
	if field.Error != "" {
		return SqlDecimal{Error: field.Error}
	}
	if value.Error != "" {
		return SqlDecimal{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlDecimal{}
	}
	return temporalPartToDecimal(temporalIntervalPart(field.Value, value.Month, value.Day, value.Time, true))
}

func datePartTimestamp(field SqlText, value SqlTimestamp) SqlFloat {
	if field.Error != "" {
		return SqlFloat{Error: field.Error}
	}
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlFloat{}
	}
	return temporalPartToFloat(temporalTimestampPart(field.Value, value.Usec, false, false))
}

func datePartTimestamptz(field SqlText, value SqlTimestamptz) SqlFloat {
	if field.Error != "" {
		return SqlFloat{Error: field.Error}
	}
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlFloat{}
	}
	return temporalPartToFloat(temporalTimestampPart(field.Value, value.Usec, false, true))
}

func datePartDate(field SqlText, value SqlDate) SqlFloat {
	if field.Error != "" {
		return SqlFloat{Error: field.Error}
	}
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlFloat{}
	}
	usec, err := temporalDateTimestamp(value.Days)
	if err != "" {
		return SqlFloat{Error: err}
	}
	return temporalPartToFloat(temporalTimestampPart(field.Value, usec, false, false))
}

func datePartTime(field SqlText, value SqlTime) SqlFloat {
	if field.Error != "" {
		return SqlFloat{Error: field.Error}
	}
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlFloat{}
	}
	return temporalPartToFloat(temporalTimePart(field.Value, value.Usec, false, nil))
}

func datePartTimetz(field SqlText, value SqlTimeTz) SqlFloat {
	if field.Error != "" {
		return SqlFloat{Error: field.Error}
	}
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlFloat{}
	}
	zone := value.Zone
	return temporalPartToFloat(temporalTimePart(field.Value, value.Usec, false, &zone))
}

func datePartInterval(field SqlText, value SqlInterval) SqlFloat {
	if field.Error != "" {
		return SqlFloat{Error: field.Error}
	}
	if value.Error != "" {
		return SqlFloat{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlFloat{}
	}
	return temporalPartToFloat(temporalIntervalPart(field.Value, value.Month, value.Day, value.Time, false))
}

func dateTruncTimestamp(field SqlText, value SqlTimestamp) SqlTimestamp {
	if field.Error != "" {
		return SqlTimestamp{Error: field.Error}
	}
	if value.Error != "" {
		return SqlTimestamp{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlTimestamp{}
	}
	usec, err := temporalTimestampTrunc(field.Value, value.Usec)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	return SqlTimestamp{Usec: usec, Valid: true}
}

func dateTruncTimestamptz(field SqlText, value SqlTimestamptz) SqlTimestamptz {
	if field.Error != "" {
		return SqlTimestamptz{Error: field.Error}
	}
	if value.Error != "" {
		return SqlTimestamptz{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlTimestamptz{}
	}
	usec, err := temporalTimestampTrunc(field.Value, value.Usec)
	if err != "" {
		return SqlTimestamptz{Error: err}
	}
	return SqlTimestamptz{Usec: usec, Valid: true}
}

func dateTruncInterval(field SqlText, value SqlInterval) SqlInterval {
	if field.Error != "" {
		return SqlInterval{Error: field.Error}
	}
	if value.Error != "" {
		return SqlInterval{Error: value.Error}
	}
	if !field.Valid || !value.Valid {
		return SqlInterval{}
	}
	month, day, time, err := temporalIntervalTrunc(field.Value, value.Month, value.Day, value.Time)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return SqlInterval{Month: month, Day: day, Time: time, Valid: true}
}
