package pgsidsql

import (
	"math"
	"math/big"
	"strconv"
	"strings"
)

type SqlDate struct {
	Days  int32
	Valid bool
	Error string
}

type SqlTime struct {
	Usec  int64
	Valid bool
	Error string
}

type SqlTimestamp struct {
	Usec  int64
	Valid bool
	Error string
}

type SqlInterval struct {
	Month int32
	Day   int32
	Time  int64
	Valid bool
	Error string
}

func temporalDate2j(year, month, day int) int {
	if month > 2 {
		month += 1
		year += 4800
	} else {
		month += 13
		year += 4799
	}
	century := year / 100
	return year*365 - 32167 + year/4 - century + century/4 + 7834*month/256 + day
}

func temporalJ2date(jd int) (int, int, int) {
	julian := uint32(jd + 32044)
	quad := julian / 146097
	extra := (julian-quad*146097)*4 + 3
	julian += 60 + quad*3 + extra/146097
	quad = julian / 1461
	julian -= quad * 1461
	y := julian * 4 / 1461
	if y != 0 {
		julian = (julian+305)%365 + 123
	} else {
		julian = (julian+306)%366 + 123
	}
	y += quad * 4
	year := int(y) - 4800
	quad = julian * 2141 / 65536
	day := int(julian - 7834*quad/256)
	month := int((quad+10)%12 + 1)
	return year, month, day
}

func temporalIsLeap(year int) bool {
	return year%4 == 0 && (year%100 != 0 || year%400 == 0)
}

func temporalMonthDays(year, month int) int {
	days := []int{31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}
	if month < 1 || month > 12 {
		return 0
	}
	if month == 2 && temporalIsLeap(year) {
		return 29
	}
	return days[month-1]
}

func temporalPad(value, width int) string {
	sign := ""
	if value < 0 {
		sign = "-"
		value = -value
	}
	text := strconv.Itoa(value)
	for len(text) < width {
		text = "0" + text
	}
	return sign + text
}

func temporalSecondsText(sec, usec int) string {
	if sec < 0 {
		sec = -sec
	}
	if usec < 0 {
		usec = -usec
	}
	text := temporalPad(sec, 2)
	if usec == 0 {
		return text
	}
	fraction := temporalPad(usec, 6)
	for strings.HasSuffix(fraction, "0") {
		fraction = strings.TrimSuffix(fraction, "0")
	}
	return text + "." + fraction
}

func temporalSpecial(value string) int {
	text := strings.ToLower(strings.TrimSpace(value))
	if text == "infinity" || text == "+infinity" {
		return 1
	}
	if text == "-infinity" {
		return -1
	}
	return 0
}

func dateFormat(days int32) string {
	if days == math.MinInt32 {
		return "-infinity"
	}
	if days == math.MaxInt32 {
		return "infinity"
	}
	year, month, day := temporalJ2date(int(days) + 2451545)
	display := year
	suffix := ""
	if year <= 0 {
		display = -(year - 1)
		suffix = " BC"
	}
	return temporalPad(display, 4) + "-" + temporalPad(month, 2) + "-" + temporalPad(day, 2) + suffix
}

func timeFormat(usec int64) string {
	hour := usec / 3600000000
	rest := usec % 3600000000
	minute := rest / 60000000
	second := rest % 60000000
	return temporalPad(int(hour), 2) + ":" + temporalPad(int(minute), 2) + ":" + temporalSecondsText(int(second/1000000), int(second%1000000))
}

func timestampFormat(usec int64) string {
	if usec == math.MinInt64 {
		return "-infinity"
	}
	if usec == math.MaxInt64 {
		return "infinity"
	}
	days := usec / 86400000000
	time := usec % 86400000000
	if time < 0 {
		time += 86400000000
		days--
	}
	return dateFormat(int32(days)) + " " + timeFormat(time)
}

func intervalFormat(month, day int32, time int64) string {
	if month == math.MinInt32 && day == math.MinInt32 && time == math.MinInt64 {
		return "-infinity"
	}
	if month == math.MaxInt32 && day == math.MaxInt32 && time == math.MaxInt64 {
		return "infinity"
	}
	year := int(month / 12)
	mon := int(month % 12)
	hour := time / 3600000000
	rest := time % 3600000000
	minute := rest / 60000000
	rest %= 60000000
	sec := rest / 1000000
	usec := rest % 1000000
	text := ""
	zero := true
	before := false
	part := func(value int, unit string) {
		if value == 0 {
			return
		}
		if !zero {
			text += " "
		}
		if before && value > 0 {
			text += "+"
		}
		text += strconv.Itoa(value) + " " + unit
		if value != 1 {
			text += "s"
		}
		before = value < 0
		zero = false
	}
	part(year, "year")
	part(mon, "mon")
	part(int(day), "day")
	if zero || hour != 0 || minute != 0 || sec != 0 || usec != 0 {
		minus := hour < 0 || minute < 0 || sec < 0 || usec < 0
		if !zero {
			text += " "
		}
		if minus {
			text += "-"
		} else if before {
			text += "+"
		}
		absHour := hour
		if absHour < 0 {
			absHour = -absHour
		}
		absMinute := minute
		if absMinute < 0 {
			absMinute = -absMinute
		}
		text += temporalPad(int(absHour), 2) + ":" + temporalPad(int(absMinute), 2) + ":" + temporalSecondsText(int(sec), int(usec))
	}
	return text
}

func temporalParseDate(value string) (int32, string) {
	text := strings.TrimSpace(value)
	bc := strings.HasSuffix(strings.ToUpper(text), " BC")
	if bc {
		text = strings.TrimSpace(text[:len(text)-3])
	}
	parts := strings.Split(text, "-")
	if len(parts) != 3 {
		return 0, "22007"
	}
	year, yearErr := strconv.Atoi(parts[0])
	month, monthErr := strconv.Atoi(parts[1])
	day, dayErr := strconv.Atoi(parts[2])
	if yearErr != nil || monthErr != nil || dayErr != nil {
		return 0, "22007"
	}
	if bc {
		if year <= 0 {
			return 0, "22008"
		}
		year = -(year - 1)
	} else if year <= 0 {
		return 0, "22008"
	}
	if month < 1 || month > 12 || day < 1 || day > temporalMonthDays(year, month) {
		return 0, "22008"
	}
	if year < -4713 || (year == -4713 && month < 11) {
		return 0, "22008"
	}
	days := temporalDate2j(year, month, day) - 2451545
	if days < -2451545 || days >= 2145031949 {
		return 0, "22008"
	}
	return int32(days), ""
}

func temporalParseTime(value string, roll bool) (int, int64, string) {
	text := strings.TrimSpace(value)
	parts := strings.Split(text, ":")
	if len(parts) < 2 || len(parts) > 3 {
		return 0, 0, "22023"
	}
	hour, hourErr := strconv.Atoi(parts[0])
	minute, minuteErr := strconv.Atoi(parts[1])
	if hourErr != nil || minuteErr != nil {
		return 0, 0, "22023"
	}
	second := 0
	usec := int64(0)
	if len(parts) == 3 {
		secParts := strings.SplitN(parts[2], ".", 2)
		var secErr error
		second, secErr = strconv.Atoi(secParts[0])
		if secErr != nil {
			return 0, 0, "22023"
		}
		if len(secParts) == 2 {
			fraction := secParts[1]
			if len(fraction) == 0 || len(fraction) > 6 {
				return 0, 0, "22023"
			}
			for len(fraction) < 6 {
				fraction += "0"
			}
			parsed, err := strconv.ParseInt(fraction, 10, 64)
			if err != nil {
				return 0, 0, "22023"
			}
			usec = parsed
		}
	}
	totalUsec := int64(second)*1000000 + usec
	if hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 59 || totalUsec > 60000000 {
		return 0, 0, "22008"
	}
	total := int64(hour)*3600000000 + int64(minute)*60000000 + totalUsec
	if !roll && total > 86400000000 {
		return 0, 0, "22008"
	}
	if roll && total == 86400000000 {
		return 1, 0, ""
	}
	if total > 86400000000 {
		return 0, 0, "22008"
	}
	return 0, total, ""
}

func dateInput(value string) SqlDate {
	if special := temporalSpecial(value); special == 1 {
		return SqlDate{Days: math.MaxInt32, Valid: true}
	} else if special == -1 {
		return SqlDate{Days: math.MinInt32, Valid: true}
	}
	days, err := temporalParseDate(value)
	if err != "" {
		return SqlDate{Error: err}
	}
	return SqlDate{Days: days, Valid: true}
}

func timeInput(value string) SqlTime {
	_, usec, err := temporalParseTime(value, false)
	if err != "" {
		return SqlTime{Error: err}
	}
	return SqlTime{Usec: usec, Valid: true}
}

func timestampInput(value string) SqlTimestamp {
	if special := temporalSpecial(value); special == 1 {
		return SqlTimestamp{Usec: math.MaxInt64, Valid: true}
	} else if special == -1 {
		return SqlTimestamp{Usec: math.MinInt64, Valid: true}
	}
	text := strings.TrimSpace(value)
	separator := strings.IndexAny(text, "T ")
	var dateText, timeText string
	if separator == -1 {
		dateText = text
	} else {
		dateText = text[:separator]
		timeText = strings.TrimSpace(text[separator+1:])
		if strings.EqualFold(timeText, "BC") {
			dateText = text
			timeText = ""
		} else if strings.HasPrefix(strings.ToUpper(timeText), "BC ") {
			dateText = strings.TrimSpace(text[:separator+3])
			timeText = strings.TrimSpace(timeText[3:])
		}
	}
	days, err := temporalParseDate(dateText)
	if err != "" {
		return SqlTimestamp{Error: err}
	}
	extra := 0
	usec := int64(0)
	if timeText != "" {
		extra, usec, err = temporalParseTime(timeText, true)
		if err != "" {
			return SqlTimestamp{Error: err}
		}
	}
	total := int64(int(days)+extra)*86400000000 + usec
	if total < -211813488000000000 || total >= 9223371331200000000 {
		return SqlTimestamp{Error: "22008"}
	}
	return SqlTimestamp{Usec: total, Valid: true}
}

func intervalInput(value string) SqlInterval {
	if special := temporalSpecial(value); special == 1 {
		return SqlInterval{Month: math.MaxInt32, Day: math.MaxInt32, Time: math.MaxInt64, Valid: true}
	} else if special == -1 {
		return SqlInterval{Month: math.MinInt32, Day: math.MinInt32, Time: math.MinInt64, Valid: true}
	}
	text := strings.TrimSpace(value)
	if text == "" {
		return SqlInterval{Error: "22007"}
	}
	ago := false
	if strings.HasSuffix(strings.ToLower(text), " ago") {
		ago = true
		text = strings.TrimSpace(text[:len(text)-4])
	}
	var month int32
	var day int32
	var time int64
	if matched, _ := strconv.Atoi(text); text != "" && func() bool { _, err := strconv.Atoi(text); return err == nil }() {
		time = int64(matched) * 1000000
	} else {
		tokens := strings.Fields(text)
		units := map[string]string{
			"year": "month", "years": "month", "yr": "month", "yrs": "month",
			"month": "month", "months": "month", "mon": "month", "mons": "month",
			"week": "week", "weeks": "week",
			"day": "day", "days": "day",
			"hour": "time", "hours": "time", "hr": "time", "hrs": "time",
			"minute": "time", "minutes": "time", "min": "time", "mins": "time",
			"second": "time", "seconds": "time", "sec": "time", "secs": "time",
		}
		scale := map[string]int64{
			"year": 12, "years": 12, "yr": 12, "yrs": 12,
			"month": 1, "months": 1, "mon": 1, "mons": 1,
			"week": 7, "weeks": 7,
			"day": 1, "days": 1,
			"hour": 3600000000, "hours": 3600000000, "hr": 3600000000, "hrs": 3600000000,
			"minute": 60000000, "minutes": 60000000, "min": 60000000, "mins": 60000000,
			"second": 1000000, "seconds": 1000000, "sec": 1000000, "secs": 1000000,
		}
		for index := 0; index < len(tokens); {
			token := tokens[index]
			if strings.Count(token, ":") >= 1 {
				_, usec, err := temporalParseTime(token, false)
				if err != "" {
					return SqlInterval{Error: err}
				}
				time += usec
				index++
				continue
			}
			amount, amountErr := strconv.ParseInt(token, 10, 64)
			if amountErr != nil || index+1 >= len(tokens) {
				return SqlInterval{Error: "22007"}
			}
			unit := strings.ToLower(tokens[index+1])
			kind, ok := units[unit]
			factor, factorOk := scale[unit]
			if !ok || !factorOk {
				return SqlInterval{Error: "22007"}
			}
			if kind == "month" {
				month += int32(amount * factor)
			} else if kind == "day" || kind == "week" {
				day += int32(amount * factor)
			} else {
				time += amount * factor
			}
			index += 2
		}
	}
	if ago {
		month = -month
		day = -day
		time = -time
	}
	return SqlInterval{Month: month, Day: day, Time: time, Valid: true}
}

func dateText(value SqlDate) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: dateFormat(value.Days), Valid: true}
}

func timeText(value SqlTime) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: timeFormat(value.Usec), Valid: true}
}

func timestampText(value SqlTimestamp) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: timestampFormat(value.Usec), Valid: true}
}

func intervalText(value SqlInterval) SqlText {
	if value.Error != "" {
		return SqlText{Error: value.Error}
	}
	if !value.Valid {
		return SqlText{}
	}
	return SqlText{Value: intervalFormat(value.Month, value.Day, value.Time), Valid: true}
}

func dateCompare(left, right SqlDate) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	switch {
	case left.Days < right.Days:
		return SqlInteger{Value: -1, Valid: true}
	case left.Days > right.Days:
		return SqlInteger{Value: 1, Valid: true}
	default:
		return SqlInteger{Value: 0, Valid: true}
	}
}

func timeCompare(left, right SqlTime) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	switch {
	case left.Usec < right.Usec:
		return SqlInteger{Value: -1, Valid: true}
	case left.Usec > right.Usec:
		return SqlInteger{Value: 1, Valid: true}
	default:
		return SqlInteger{Value: 0, Valid: true}
	}
}

func timestampCompare(left, right SqlTimestamp) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	switch {
	case left.Usec < right.Usec:
		return SqlInteger{Value: -1, Valid: true}
	case left.Usec > right.Usec:
		return SqlInteger{Value: 1, Valid: true}
	default:
		return SqlInteger{Value: 0, Valid: true}
	}
}

func intervalSpan(value SqlInterval) *big.Int {
	days := int64(value.Month)*30 + int64(value.Day)
	span := new(big.Int).SetInt64(value.Time)
	span.Add(span, new(big.Int).Mul(big.NewInt(days), big.NewInt(86400000000)))
	return span
}

func intervalCompare(left, right SqlInterval) SqlInteger {
	if left.Error != "" {
		return SqlInteger{Error: left.Error}
	}
	if right.Error != "" {
		return SqlInteger{Error: right.Error}
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	return SqlInteger{Value: int64(intervalSpan(left).Cmp(intervalSpan(right))), Valid: true}
}

func dateComparison(left, right SqlDate, operation string) SqlBoolean {
	comparison := dateCompare(left, right)
	if comparison.Error != "" {
		return SqlBoolean{Error: comparison.Error}
	}
	if !comparison.Valid {
		return SqlBoolean{}
	}
	result := false
	switch operation {
	case "eq":
		result = comparison.Value == 0
	case "ne":
		result = comparison.Value != 0
	case "lt":
		result = comparison.Value < 0
	case "le":
		result = comparison.Value <= 0
	case "gt":
		result = comparison.Value > 0
	case "ge":
		result = comparison.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func timeComparison(left, right SqlTime, operation string) SqlBoolean {
	comparison := timeCompare(left, right)
	if comparison.Error != "" {
		return SqlBoolean{Error: comparison.Error}
	}
	if !comparison.Valid {
		return SqlBoolean{}
	}
	result := false
	switch operation {
	case "eq":
		result = comparison.Value == 0
	case "ne":
		result = comparison.Value != 0
	case "lt":
		result = comparison.Value < 0
	case "le":
		result = comparison.Value <= 0
	case "gt":
		result = comparison.Value > 0
	case "ge":
		result = comparison.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func timestampComparison(left, right SqlTimestamp, operation string) SqlBoolean {
	comparison := timestampCompare(left, right)
	if comparison.Error != "" {
		return SqlBoolean{Error: comparison.Error}
	}
	if !comparison.Valid {
		return SqlBoolean{}
	}
	result := false
	switch operation {
	case "eq":
		result = comparison.Value == 0
	case "ne":
		result = comparison.Value != 0
	case "lt":
		result = comparison.Value < 0
	case "le":
		result = comparison.Value <= 0
	case "gt":
		result = comparison.Value > 0
	case "ge":
		result = comparison.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func intervalComparison(left, right SqlInterval, operation string) SqlBoolean {
	comparison := intervalCompare(left, right)
	if comparison.Error != "" {
		return SqlBoolean{Error: comparison.Error}
	}
	if !comparison.Valid {
		return SqlBoolean{}
	}
	result := false
	switch operation {
	case "eq":
		result = comparison.Value == 0
	case "ne":
		result = comparison.Value != 0
	case "lt":
		result = comparison.Value < 0
	case "le":
		result = comparison.Value <= 0
	case "gt":
		result = comparison.Value > 0
	case "ge":
		result = comparison.Value >= 0
	}
	return SqlBoolean{Value: result, Valid: true}
}

func dateEq(left, right SqlDate) SqlBoolean { return dateComparison(left, right, "eq") }
func dateNe(left, right SqlDate) SqlBoolean { return dateComparison(left, right, "ne") }
func dateLt(left, right SqlDate) SqlBoolean { return dateComparison(left, right, "lt") }
func dateLe(left, right SqlDate) SqlBoolean { return dateComparison(left, right, "le") }
func dateGt(left, right SqlDate) SqlBoolean { return dateComparison(left, right, "gt") }
func dateGe(left, right SqlDate) SqlBoolean { return dateComparison(left, right, "ge") }
func timeEq(left, right SqlTime) SqlBoolean { return timeComparison(left, right, "eq") }
func timeNe(left, right SqlTime) SqlBoolean { return timeComparison(left, right, "ne") }
func timeLt(left, right SqlTime) SqlBoolean { return timeComparison(left, right, "lt") }
func timeLe(left, right SqlTime) SqlBoolean { return timeComparison(left, right, "le") }
func timeGt(left, right SqlTime) SqlBoolean { return timeComparison(left, right, "gt") }
func timeGe(left, right SqlTime) SqlBoolean { return timeComparison(left, right, "ge") }
func timestampEq(left, right SqlTimestamp) SqlBoolean {
	return timestampComparison(left, right, "eq")
}
func timestampNe(left, right SqlTimestamp) SqlBoolean {
	return timestampComparison(left, right, "ne")
}
func timestampLt(left, right SqlTimestamp) SqlBoolean {
	return timestampComparison(left, right, "lt")
}
func timestampLe(left, right SqlTimestamp) SqlBoolean {
	return timestampComparison(left, right, "le")
}
func timestampGt(left, right SqlTimestamp) SqlBoolean {
	return timestampComparison(left, right, "gt")
}
func timestampGe(left, right SqlTimestamp) SqlBoolean {
	return timestampComparison(left, right, "ge")
}
func intervalEq(left, right SqlInterval) SqlBoolean {
	return intervalComparison(left, right, "eq")
}
func intervalNe(left, right SqlInterval) SqlBoolean {
	return intervalComparison(left, right, "ne")
}
func intervalLt(left, right SqlInterval) SqlBoolean {
	return intervalComparison(left, right, "lt")
}
func intervalLe(left, right SqlInterval) SqlBoolean {
	return intervalComparison(left, right, "le")
}
func intervalGt(left, right SqlInterval) SqlBoolean {
	return intervalComparison(left, right, "gt")
}
func intervalGe(left, right SqlInterval) SqlBoolean {
	return intervalComparison(left, right, "ge")
}

func dateFinite(value SqlDate) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if !value.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: value.Days != math.MinInt32 && value.Days != math.MaxInt32, Valid: true}
}

func timestampFinite(value SqlTimestamp) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if !value.Valid {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: value.Usec != math.MinInt64 && value.Usec != math.MaxInt64, Valid: true}
}

func intervalFinite(value SqlInterval) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	if !value.Valid {
		return SqlBoolean{}
	}
	infinite := (value.Month == math.MinInt32 && value.Day == math.MinInt32 && value.Time == math.MinInt64) ||
		(value.Month == math.MaxInt32 && value.Day == math.MaxInt32 && value.Time == math.MaxInt64)
	return SqlBoolean{Value: !infinite, Valid: true}
}

func makeDate(year, month, day SqlInteger) SqlDate {
	if year.Error != "" {
		return SqlDate{Error: year.Error}
	}
	if month.Error != "" {
		return SqlDate{Error: month.Error}
	}
	if day.Error != "" {
		return SqlDate{Error: day.Error}
	}
	if !year.Valid || !month.Valid || !day.Valid {
		return SqlDate{}
	}
	y := int(year.Value)
	m := int(month.Value)
	d := int(day.Value)
	if y < 0 {
		if y == math.MinInt32 {
			return SqlDate{Error: "22008"}
		}
		y = -y
		y = -(y - 1)
	} else if y == 0 {
		return SqlDate{Error: "22008"}
	}
	if m < 1 || m > 12 || d < 1 || d > temporalMonthDays(y, m) {
		return SqlDate{Error: "22008"}
	}
	days := temporalDate2j(y, m, d) - 2451545
	if days < -2451545 || days >= 2145031949 {
		return SqlDate{Error: "22008"}
	}
	return SqlDate{Days: int32(days), Valid: true}
}

func makeTime(hour, minute SqlInteger, second SqlFloat) SqlTime {
	if hour.Error != "" {
		return SqlTime{Error: hour.Error}
	}
	if minute.Error != "" {
		return SqlTime{Error: minute.Error}
	}
	if second.Error != "" {
		return SqlTime{Error: second.Error}
	}
	if !hour.Valid || !minute.Valid || !second.Valid {
		return SqlTime{}
	}
	if math.IsNaN(second.Value) || math.IsInf(second.Value, 0) {
		return SqlTime{Error: "22008"}
	}
	usec := int64(math.Round(second.Value * 1e6))
	h := hour.Value
	m := minute.Value
	if h < 0 || h > 24 || m < 0 || m >= 60 || usec < 0 || usec > 60000000 {
		return SqlTime{Error: "22008"}
	}
	total := h*3600000000 + m*60000000 + usec
	if total > 86400000000 {
		return SqlTime{Error: "22008"}
	}
	return SqlTime{Usec: total, Valid: true}
}

func makeTimestamp(year, month, day, hour, minute SqlInteger, second SqlFloat) SqlTimestamp {
	date := makeDate(year, month, day)
	if date.Error != "" || !date.Valid {
		if date.Error != "" {
			return SqlTimestamp{Error: date.Error}
		}
		return SqlTimestamp{}
	}
	time := makeTime(hour, minute, second)
	if time.Error != "" || !time.Valid {
		if time.Error != "" {
			return SqlTimestamp{Error: time.Error}
		}
		return SqlTimestamp{}
	}
	total := int64(date.Days)*86400000000 + time.Usec
	if total < -211813488000000000 || total >= 9223371331200000000 {
		return SqlTimestamp{Error: "22008"}
	}
	return SqlTimestamp{Usec: total, Valid: true}
}

func makeInterval(years, months, weeks, days, hours, mins SqlInteger, secs SqlFloat) SqlInterval {
	for _, value := range []SqlInteger{years, months, weeks, days, hours, mins} {
		if value.Error != "" {
			return SqlInterval{Error: value.Error}
		}
		if !value.Valid {
			return SqlInterval{}
		}
	}
	if secs.Error != "" {
		return SqlInterval{Error: secs.Error}
	}
	if !secs.Valid {
		return SqlInterval{}
	}
	if math.IsNaN(secs.Value) || math.IsInf(secs.Value, 0) {
		return SqlInterval{Error: "22008"}
	}
	month := years.Value*12 + months.Value
	day := weeks.Value*7 + days.Value
	if month > math.MaxInt32 || month < math.MinInt32 || day > math.MaxInt32 || day < math.MinInt32 {
		return SqlInterval{Error: "22008"}
	}
	time := hours.Value*3600000000 + mins.Value*60000000 + int64(math.Round(secs.Value*1e6))
	if (month == math.MinInt32 && day == math.MinInt32 && time == math.MinInt64) ||
		(month == math.MaxInt32 && day == math.MaxInt32 && time == math.MaxInt64) {
		return SqlInterval{Error: "22008"}
	}
	return SqlInterval{Month: int32(month), Day: int32(day), Time: time, Valid: true}
}

func sqlIsNullDate(value SqlDate) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullDate(value SqlDate) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseDate(otherwise func() SqlDate, conditions []func() SqlBoolean, branches []func() SqlDate) SqlDate {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlDate{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceDate(operands ...func() SqlDate) SqlDate {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlDate{}
}

func sqlIsNullTime(value SqlTime) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullTime(value SqlTime) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseTime(otherwise func() SqlTime, conditions []func() SqlBoolean, branches []func() SqlTime) SqlTime {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlTime{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceTime(operands ...func() SqlTime) SqlTime {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlTime{}
}

func sqlIsNullTimestamp(value SqlTimestamp) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullTimestamp(value SqlTimestamp) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseTimestamp(otherwise func() SqlTimestamp, conditions []func() SqlBoolean, branches []func() SqlTimestamp) SqlTimestamp {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlTimestamp{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceTimestamp(operands ...func() SqlTimestamp) SqlTimestamp {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlTimestamp{}
}

func sqlIsNullInterval(value SqlInterval) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: !value.Valid, Valid: true}
}

func sqlIsNotNullInterval(value SqlInterval) SqlBoolean {
	if value.Error != "" {
		return SqlBoolean{Error: value.Error}
	}
	return SqlBoolean{Value: value.Valid, Valid: true}
}

func sqlCaseInterval(otherwise func() SqlInterval, conditions []func() SqlBoolean, branches []func() SqlInterval) SqlInterval {
	for index, when := range conditions {
		condition := when()
		if condition.Error != "" {
			return SqlInterval{Error: condition.Error}
		}
		if condition.Valid && condition.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func sqlCoalesceInterval(operands ...func() SqlInterval) SqlInterval {
	for _, operand := range operands {
		value := operand()
		if value.Error != "" || value.Valid {
			return value
		}
	}
	return SqlInterval{}
}
