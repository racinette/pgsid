package pgsidsql

import "math"

func temporalOverlaps(nulls [4]bool, cmp func(i, j int) int) SqlBoolean {
	ts1, te1, ts2, te2 := 0, 1, 2, 3
	ts1Null, te1Null, ts2Null, te2Null := nulls[0], nulls[1], nulls[2], nulls[3]
	if ts1Null {
		if te1Null {
			return SqlBoolean{}
		}
		ts1 = te1
		te1Null = true
	} else if !te1Null && cmp(ts1, te1) > 0 {
		ts1, te1 = te1, ts1
	}
	if ts2Null {
		if te2Null {
			return SqlBoolean{}
		}
		ts2 = te2
		te2Null = true
	} else if !te2Null && cmp(ts2, te2) > 0 {
		ts2, te2 = te2, ts2
	}
	order := cmp(ts1, ts2)
	if order > 0 {
		if te2Null {
			return SqlBoolean{}
		}
		if cmp(ts1, te2) < 0 {
			return SqlBoolean{Value: true, Valid: true}
		}
		if te1Null {
			return SqlBoolean{}
		}
		return SqlBoolean{Value: false, Valid: true}
	}
	if order < 0 {
		if te1Null {
			return SqlBoolean{}
		}
		if cmp(ts2, te1) < 0 {
			return SqlBoolean{Value: true, Valid: true}
		}
		if te2Null {
			return SqlBoolean{}
		}
		return SqlBoolean{Value: false, Valid: true}
	}
	if te1Null || te2Null {
		return SqlBoolean{}
	}
	return SqlBoolean{Value: true, Valid: true}
}

func temporalUsecOrder(left, right int64) int {
	if left > right {
		return 1
	}
	if left < right {
		return -1
	}
	return 0
}

func temporalTimetzOrder(left, right SqlTimeTz) int {
	leftGmt := left.Usec + int64(left.Zone)*1000000
	rightGmt := right.Usec + int64(right.Zone)*1000000
	switch {
	case leftGmt > rightGmt:
		return 1
	case leftGmt < rightGmt:
		return -1
	case left.Zone > right.Zone:
		return 1
	case left.Zone < right.Zone:
		return -1
	default:
		return 0
	}
}

func temporalFirstError(errors ...string) string {
	for _, err := range errors {
		if err != "" {
			return err
		}
	}
	return ""
}

func overlapsTimestamp(ts1, te1, ts2, te2 SqlTimestamp) SqlBoolean {
	if err := temporalFirstError(ts1.Error, te1.Error, ts2.Error, te2.Error); err != "" {
		return SqlBoolean{Error: err}
	}
	args := [4]SqlTimestamp{ts1, te1, ts2, te2}
	return temporalOverlaps([4]bool{!ts1.Valid, !te1.Valid, !ts2.Valid, !te2.Valid}, func(i, j int) int {
		return temporalUsecOrder(args[i].Usec, args[j].Usec)
	})
}

func overlapsTimestampIntervalInterval(ts1 SqlTimestamp, span1 SqlInterval, ts2 SqlTimestamp, span2 SqlInterval) SqlBoolean {
	return overlapsTimestamp(ts1, timestampPlInterval(ts1, span1), ts2, timestampPlInterval(ts2, span2))
}

func overlapsTimestampIntervalTimestamp(ts1 SqlTimestamp, span1 SqlInterval, ts2, te2 SqlTimestamp) SqlBoolean {
	return overlapsTimestamp(ts1, timestampPlInterval(ts1, span1), ts2, te2)
}

func overlapsTimestampTimestampInterval(ts1, te1, ts2 SqlTimestamp, span2 SqlInterval) SqlBoolean {
	return overlapsTimestamp(ts1, te1, ts2, timestampPlInterval(ts2, span2))
}

func overlapsTimestamptz(ts1, te1, ts2, te2 SqlTimestamptz) SqlBoolean {
	if err := temporalFirstError(ts1.Error, te1.Error, ts2.Error, te2.Error); err != "" {
		return SqlBoolean{Error: err}
	}
	args := [4]SqlTimestamptz{ts1, te1, ts2, te2}
	return temporalOverlaps([4]bool{!ts1.Valid, !te1.Valid, !ts2.Valid, !te2.Valid}, func(i, j int) int {
		return temporalUsecOrder(args[i].Usec, args[j].Usec)
	})
}

func overlapsTimestamptzIntervalInterval(ts1 SqlTimestamptz, span1 SqlInterval, ts2 SqlTimestamptz, span2 SqlInterval) SqlBoolean {
	return overlapsTimestamptz(ts1, timestamptzPlInterval(ts1, span1), ts2, timestamptzPlInterval(ts2, span2))
}

func overlapsTimestamptzIntervalTimestamptz(ts1 SqlTimestamptz, span1 SqlInterval, ts2, te2 SqlTimestamptz) SqlBoolean {
	return overlapsTimestamptz(ts1, timestamptzPlInterval(ts1, span1), ts2, te2)
}

func overlapsTimestamptzTimestamptzInterval(ts1, te1, ts2 SqlTimestamptz, span2 SqlInterval) SqlBoolean {
	return overlapsTimestamptz(ts1, te1, ts2, timestamptzPlInterval(ts2, span2))
}

func overlapsTime(ts1, te1, ts2, te2 SqlTime) SqlBoolean {
	if err := temporalFirstError(ts1.Error, te1.Error, ts2.Error, te2.Error); err != "" {
		return SqlBoolean{Error: err}
	}
	args := [4]SqlTime{ts1, te1, ts2, te2}
	return temporalOverlaps([4]bool{!ts1.Valid, !te1.Valid, !ts2.Valid, !te2.Valid}, func(i, j int) int {
		return temporalUsecOrder(args[i].Usec, args[j].Usec)
	})
}

func overlapsTimeIntervalInterval(ts1 SqlTime, span1 SqlInterval, ts2 SqlTime, span2 SqlInterval) SqlBoolean {
	return overlapsTime(ts1, timePlInterval(ts1, span1), ts2, timePlInterval(ts2, span2))
}

func overlapsTimeIntervalTime(ts1 SqlTime, span1 SqlInterval, ts2, te2 SqlTime) SqlBoolean {
	return overlapsTime(ts1, timePlInterval(ts1, span1), ts2, te2)
}

func overlapsTimeTimeInterval(ts1, te1, ts2 SqlTime, span2 SqlInterval) SqlBoolean {
	return overlapsTime(ts1, te1, ts2, timePlInterval(ts2, span2))
}

func overlapsTimetz(ts1, te1, ts2, te2 SqlTimeTz) SqlBoolean {
	if err := temporalFirstError(ts1.Error, te1.Error, ts2.Error, te2.Error); err != "" {
		return SqlBoolean{Error: err}
	}
	args := [4]SqlTimeTz{ts1, te1, ts2, te2}
	return temporalOverlaps([4]bool{!ts1.Valid, !te1.Valid, !ts2.Valid, !te2.Valid}, func(i, j int) int {
		return temporalTimetzOrder(args[i], args[j])
	})
}

func temporalItm2interval(year, month, day, hour, minute, second, usec int) (SqlInterval, string) {
	totalMonths := int64(year)*12 + int64(month)
	if totalMonths > math.MaxInt32 || totalMonths < math.MinInt32 {
		return SqlInterval{}, "22008"
	}
	time := int64(hour)*3600000000 + int64(minute)*60000000 + int64(second)*1000000 + int64(usec)
	return temporalIntervalFinite(int32(totalMonths), int32(day), time)
}

func temporalTimestampAge(dt1, dt2 int64) (SqlInterval, string) {
	inf1 := temporalTimestampIsInf(dt1)
	inf2 := temporalTimestampIsInf(dt2)
	if inf1 < 0 {
		if inf2 < 0 {
			return SqlInterval{}, "22008"
		}
		return temporalIntervalSentinel(-1), ""
	}
	if inf1 > 0 {
		if inf2 > 0 {
			return SqlInterval{}, "22008"
		}
		return temporalIntervalSentinel(1), ""
	}
	if inf2 < 0 {
		return temporalIntervalSentinel(1), ""
	}
	if inf2 > 0 {
		return temporalIntervalSentinel(-1), ""
	}
	y1, mo1, d1, h1, mi1, s1, f1, err := temporalTimestampCivilParts(dt1)
	if err != "" {
		return SqlInterval{}, err
	}
	y2, mo2, d2, h2, mi2, s2, f2, err := temporalTimestampCivilParts(dt2)
	if err != "" {
		return SqlInterval{}, err
	}
	usec := f1 - f2
	sec := s1 - s2
	minute := mi1 - mi2
	hour := h1 - h2
	mday := d1 - d2
	mon := mo1 - mo2
	year := y1 - y2
	negative := dt1 < dt2
	if negative {
		usec, sec, minute, hour, mday, mon, year = -usec, -sec, -minute, -hour, -mday, -mon, -year
	}
	for usec < 0 {
		usec += 1000000
		sec--
	}
	for sec < 0 {
		sec += 60
		minute--
	}
	for minute < 0 {
		minute += 60
		hour--
	}
	for hour < 0 {
		hour += 24
		mday--
	}
	for mday < 0 {
		if negative {
			mday += temporalMonthDays(y1, mo1)
		} else {
			mday += temporalMonthDays(y2, mo2)
		}
		mon--
	}
	for mon < 0 {
		mon += 12
		year--
	}
	if negative {
		usec, sec, minute, hour, mday, mon, year = -usec, -sec, -minute, -hour, -mday, -mon, -year
	}
	return temporalItm2interval(year, mon, mday, hour, minute, sec, usec)
}

func ageTimestamp(later, earlier SqlTimestamp) SqlInterval {
	if stop, err := temporalCheck2(later.Error, earlier.Error, later.Valid, earlier.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalTimestampAge(later.Usec, earlier.Usec)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func ageTimestamptz(later, earlier SqlTimestamptz) SqlInterval {
	if stop, err := temporalCheck2(later.Error, earlier.Error, later.Valid, earlier.Valid); stop {
		return SqlInterval{Error: err}
	}
	result, err := temporalTimestampAge(later.Usec, earlier.Usec)
	if err != "" {
		return SqlInterval{Error: err}
	}
	return result
}

func dateLarger(left, right SqlDate) SqlDate {
	order := dateCompare(left, right)
	if order.Error != "" {
		return SqlDate{Error: order.Error}
	}
	if !order.Valid {
		return SqlDate{}
	}
	if order.Value > 0 {
		return left
	}
	return right
}

func dateSmaller(left, right SqlDate) SqlDate {
	order := dateCompare(left, right)
	if order.Error != "" {
		return SqlDate{Error: order.Error}
	}
	if !order.Valid {
		return SqlDate{}
	}
	if order.Value < 0 {
		return left
	}
	return right
}

func timeLarger(left, right SqlTime) SqlTime {
	order := timeCompare(left, right)
	if order.Error != "" {
		return SqlTime{Error: order.Error}
	}
	if !order.Valid {
		return SqlTime{}
	}
	if order.Value > 0 {
		return left
	}
	return right
}

func timeSmaller(left, right SqlTime) SqlTime {
	order := timeCompare(left, right)
	if order.Error != "" {
		return SqlTime{Error: order.Error}
	}
	if !order.Valid {
		return SqlTime{}
	}
	if order.Value < 0 {
		return left
	}
	return right
}

func timestampLarger(left, right SqlTimestamp) SqlTimestamp {
	order := timestampCompare(left, right)
	if order.Error != "" {
		return SqlTimestamp{Error: order.Error}
	}
	if !order.Valid {
		return SqlTimestamp{}
	}
	if order.Value > 0 {
		return left
	}
	return right
}

func timestampSmaller(left, right SqlTimestamp) SqlTimestamp {
	order := timestampCompare(left, right)
	if order.Error != "" {
		return SqlTimestamp{Error: order.Error}
	}
	if !order.Valid {
		return SqlTimestamp{}
	}
	if order.Value < 0 {
		return left
	}
	return right
}

func timestamptzLarger(left, right SqlTimestamptz) SqlTimestamptz {
	order := timestamptzCompare(left, right)
	if order.Error != "" {
		return SqlTimestamptz{Error: order.Error}
	}
	if !order.Valid {
		return SqlTimestamptz{}
	}
	if order.Value > 0 {
		return left
	}
	return right
}

func timestamptzSmaller(left, right SqlTimestamptz) SqlTimestamptz {
	order := timestamptzCompare(left, right)
	if order.Error != "" {
		return SqlTimestamptz{Error: order.Error}
	}
	if !order.Valid {
		return SqlTimestamptz{}
	}
	if order.Value < 0 {
		return left
	}
	return right
}

func timetzLarger(left, right SqlTimeTz) SqlTimeTz {
	order := timetzCompare(left, right)
	if order.Error != "" {
		return SqlTimeTz{Error: order.Error}
	}
	if !order.Valid {
		return SqlTimeTz{}
	}
	if order.Value > 0 {
		return left
	}
	return right
}

func timetzSmaller(left, right SqlTimeTz) SqlTimeTz {
	order := timetzCompare(left, right)
	if order.Error != "" {
		return SqlTimeTz{Error: order.Error}
	}
	if !order.Valid {
		return SqlTimeTz{}
	}
	if order.Value < 0 {
		return left
	}
	return right
}

func intervalLarger(left, right SqlInterval) SqlInterval {
	order := intervalCompare(left, right)
	if order.Error != "" {
		return SqlInterval{Error: order.Error}
	}
	if !order.Valid {
		return SqlInterval{}
	}
	if order.Value > 0 {
		return left
	}
	return right
}

func intervalSmaller(left, right SqlInterval) SqlInterval {
	order := intervalCompare(left, right)
	if order.Error != "" {
		return SqlInterval{Error: order.Error}
	}
	if !order.Valid {
		return SqlInterval{}
	}
	if order.Value < 0 {
		return left
	}
	return right
}
