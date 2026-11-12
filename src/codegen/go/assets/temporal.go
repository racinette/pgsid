package pgsid

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// Timestamptz is a PostgreSQL timestamp with time zone: an instant, or one of the infinities.
// Its zero value is the finite zero time.
type Timestamptz struct {
	time     time.Time
	infinity int8
}

var (
	TimestamptzInfinity    = Timestamptz{infinity: 1}
	TimestamptzNegInfinity = Timestamptz{infinity: -1}
)

func TimestamptzOf(t time.Time) Timestamptz   { return Timestamptz{time: t} }
func (v Timestamptz) Time() (time.Time, bool) { return v.time, v.infinity == 0 }
func (v Timestamptz) Infinity() int           { return int(v.infinity) }
func (v Timestamptz) String() string {
	return temporalString(v.infinity, func() string { return v.time.Format(time.RFC3339Nano) })
}
func (v Timestamptz) MarshalText() ([]byte, error) { return []byte(v.String()), nil }
func (v *Timestamptz) UnmarshalText(text []byte) error {
	infinity, t, err := temporalParse(string(text), "timestamptz", time.RFC3339Nano)
	if err == nil {
		*v = Timestamptz{time: t, infinity: infinity}
	}
	return err
}
func (v *Timestamptz) ScanTimestamptz(value pgtype.Timestamptz) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Timestamptz")
	}
	infinity, err := infinityOf(value.InfinityModifier)
	if err == nil {
		*v = Timestamptz{infinity: infinity}
		if infinity == 0 {
			v.time = value.Time
		}
	}
	return err
}
func (v Timestamptz) TimestamptzValue() (pgtype.Timestamptz, error) {
	return pgtype.Timestamptz{Time: v.time, InfinityModifier: pgtype.InfinityModifier(v.infinity), Valid: true}, nil
}
func (v Timestamptz) TextValue() (pgtype.Text, error) {
	return codecText(&pgtype.TimestamptzCodec{}, pgtype.TimestamptzOID, v)
}

// Timestamp is a PostgreSQL timestamp without time zone: a wall-clock reading, held in UTC, or
// one of the infinities. Its zero value is the finite zero time.
type Timestamp struct {
	time     time.Time
	infinity int8
}

var (
	TimestampInfinity    = Timestamp{infinity: 1}
	TimestampNegInfinity = Timestamp{infinity: -1}
)

const timestampLayout = "2006-01-02T15:04:05.999999999"

// TimestampOf keeps the wall clock of t and drops its location.
func TimestampOf(t time.Time) Timestamp {
	return Timestamp{time: time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), time.UTC)}
}
func (v Timestamp) Time() (time.Time, bool) { return v.time, v.infinity == 0 }
func (v Timestamp) Infinity() int           { return int(v.infinity) }
func (v Timestamp) String() string {
	return temporalString(v.infinity, func() string { return v.time.Format(timestampLayout) })
}
func (v Timestamp) MarshalText() ([]byte, error) { return []byte(v.String()), nil }
func (v *Timestamp) UnmarshalText(text []byte) error {
	infinity, t, err := temporalParse(string(text), "timestamp", timestampLayout)
	if err == nil {
		*v = Timestamp{time: t, infinity: infinity}
	}
	return err
}
func (v *Timestamp) ScanTimestamp(value pgtype.Timestamp) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Timestamp")
	}
	infinity, err := infinityOf(value.InfinityModifier)
	if err == nil {
		*v = Timestamp{infinity: infinity}
		if infinity == 0 {
			*v = TimestampOf(value.Time)
		}
	}
	return err
}
func (v Timestamp) TimestampValue() (pgtype.Timestamp, error) {
	return pgtype.Timestamp{Time: v.time, InfinityModifier: pgtype.InfinityModifier(v.infinity), Valid: true}, nil
}
func (v Timestamp) TextValue() (pgtype.Text, error) {
	return codecText(&pgtype.TimestampCodec{}, pgtype.TimestampOID, v)
}

// Date is a PostgreSQL date: a calendar day, held as its midnight in UTC, or one of the
// infinities. Its zero value is the finite zero date.
type Date struct {
	time     time.Time
	infinity int8
}

var (
	DateInfinity    = Date{infinity: 1}
	DateNegInfinity = Date{infinity: -1}
)

const dateLayout = "2006-01-02"

// DateOf keeps the wall-clock day of t.
func DateOf(t time.Time) Date {
	return Date{time: time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)}
}
func (v Date) Time() (time.Time, bool) { return v.time, v.infinity == 0 }
func (v Date) Infinity() int           { return int(v.infinity) }
func (v Date) String() string {
	return temporalString(v.infinity, func() string { return v.time.Format(dateLayout) })
}
func (v Date) MarshalText() ([]byte, error) { return []byte(v.String()), nil }
func (v *Date) UnmarshalText(text []byte) error {
	infinity, t, err := temporalParse(string(text), "date", dateLayout)
	if err == nil {
		*v = Date{time: t, infinity: infinity}
	}
	return err
}
func (v *Date) ScanDate(value pgtype.Date) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Date")
	}
	infinity, err := infinityOf(value.InfinityModifier)
	if err == nil {
		*v = Date{infinity: infinity}
		if infinity == 0 {
			*v = DateOf(value.Time)
		}
	}
	return err
}
func (v Date) DateValue() (pgtype.Date, error) {
	return pgtype.Date{Time: v.time, InfinityModifier: pgtype.InfinityModifier(v.infinity), Valid: true}, nil
}
func (v Date) TextValue() (pgtype.Text, error) {
	return codecText(pgtype.DateCodec{}, pgtype.DateOID, v)
}

// Interval is a PostgreSQL interval: months, days and microseconds, kept apart as PostgreSQL
// keeps them, or one of the infinities. Its zero value is the finite empty interval.
type Interval struct {
	months       int32
	days         int32
	microseconds int64
	infinity     int8
}

var (
	IntervalInfinity    = Interval{infinity: 1}
	IntervalNegInfinity = Interval{infinity: -1}
)

func IntervalOf(months, days int32, microseconds int64) Interval {
	return Interval{months: months, days: days, microseconds: microseconds}
}

// Parts returns the months, days and microseconds of a finite interval.
func (v Interval) Parts() (months, days int32, microseconds int64, ok bool) {
	return v.months, v.days, v.microseconds, v.infinity == 0
}
func (v Interval) Infinity() int { return int(v.infinity) }

// String writes the interval as PostgreSQL's iso_8601 interval style does.
func (v Interval) String() string {
	return temporalString(v.infinity, func() string {
		if v.months == 0 && v.days == 0 && v.microseconds == 0 {
			return "PT0S"
		}
		var b strings.Builder
		b.WriteByte('P')
		part := func(value int64, unit byte) {
			if value != 0 {
				b.WriteString(strconv.FormatInt(value, 10))
				b.WriteByte(unit)
			}
		}
		part(int64(v.months/12), 'Y')
		part(int64(v.months%12), 'M')
		part(int64(v.days), 'D')
		if v.microseconds != 0 {
			b.WriteByte('T')
			hours := v.microseconds / 3_600_000_000
			rest := v.microseconds % 3_600_000_000
			part(hours, 'H')
			part(rest/60_000_000, 'M')
			if micros := rest % 60_000_000; micros != 0 {
				if micros < 0 {
					b.WriteByte('-')
					micros = -micros
				}
				b.WriteString(strconv.FormatInt(micros/1_000_000, 10))
				if fraction := micros % 1_000_000; fraction != 0 {
					b.WriteString(strings.TrimRight(fmt.Sprintf(".%06d", fraction), "0"))
				}
				b.WriteByte('S')
			}
		}
		return b.String()
	})
}
func (v Interval) MarshalText() ([]byte, error) { return []byte(v.String()), nil }

// UnmarshalText reads what String writes.
func (v *Interval) UnmarshalText(text []byte) error {
	source := string(text)
	switch source {
	case "infinity":
		*v = IntervalInfinity
		return nil
	case "-infinity":
		*v = IntervalNegInfinity
		return nil
	}
	invalid := fmt.Errorf("invalid interval %q", source)
	if !strings.HasPrefix(source, "P") || source == "P" {
		return invalid
	}
	var months, days, micros int64
	rest, inTime := source[1:], false
	for rest != "" {
		if rest[0] == 'T' && !inTime {
			inTime, rest = true, rest[1:]
			if rest == "" {
				return invalid
			}
			continue
		}
		end := strings.IndexAny(rest, "YMDHS")
		if end <= 0 {
			return invalid
		}
		number, unit := rest[:end], rest[end]
		rest = rest[end+1:]
		if inTime && unit == 'S' {
			negative := strings.HasPrefix(number, "-")
			whole, fraction, _ := strings.Cut(strings.TrimPrefix(number, "-"), ".")
			seconds, err := strconv.ParseInt(whole, 10, 64)
			if err != nil || strings.HasPrefix(whole, "-") || len(fraction) > 6 {
				return invalid
			}
			secondMicros := int64(0)
			if !add(&secondMicros, seconds, 1_000_000) {
				return invalid
			}
			if fraction != "" {
				parsed, err := strconv.ParseUint(fraction+strings.Repeat("0", 6-len(fraction)), 10, 64)
				if err != nil {
					return invalid
				}
				if !add(&secondMicros, int64(parsed), 1) {
					return invalid
				}
			}
			if negative {
				secondMicros = -secondMicros
			}
			if !add(&micros, secondMicros, 1) || rest != "" {
				return invalid
			}
			continue
		}
		value, err := strconv.ParseInt(number, 10, 64)
		if err != nil {
			return invalid
		}
		ok := true
		switch {
		case !inTime && unit == 'Y':
			ok = add(&months, value, 12)
		case !inTime && unit == 'M':
			ok = add(&months, value, 1)
		case !inTime && unit == 'D':
			ok = add(&days, value, 1)
		case inTime && unit == 'H':
			ok = add(&micros, value, 3_600_000_000)
		case inTime && unit == 'M':
			ok = add(&micros, value, 60_000_000)
		default:
			ok = false
		}
		if !ok {
			return invalid
		}
	}
	return v.set(months, days, micros, invalid)
}

// ScanText reads the text the server writes for an interval in its default postgres interval
// style or in iso_8601; the other styles are refused rather than misread.
func (v *Interval) ScanText(text pgtype.Text) error {
	if !text.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Interval")
	}
	source := text.String
	if strings.HasPrefix(source, "P") || source == "infinity" || source == "-infinity" {
		return v.UnmarshalText([]byte(source))
	}
	invalid := fmt.Errorf("invalid interval %q: not the postgres or iso_8601 interval style", source)
	fields := strings.Fields(source)
	var months, days, micros int64
	index := 0
	for ; index+1 < len(fields); index += 2 {
		value, err := strconv.ParseInt(fields[index], 10, 32)
		if err != nil {
			return invalid
		}
		ok := false
		switch fields[index+1] {
		case "year", "years":
			ok = add(&months, value, 12)
		case "mon", "mons":
			ok = add(&months, value, 1)
		case "day", "days":
			ok = add(&days, value, 1)
		}
		if !ok {
			return invalid
		}
	}
	if index < len(fields) {
		clock := fields[index]
		negative := strings.HasPrefix(clock, "-")
		parts := strings.Split(strings.TrimLeft(clock, "+-"), ":")
		if len(parts) != 3 || len(clock)-len(strings.TrimLeft(clock, "+-")) > 1 {
			return invalid
		}
		whole, fraction, _ := strings.Cut(parts[2], ".")
		if len(fraction) > 6 {
			return invalid
		}
		// The clock's magnitude reaches one past the largest int64 when it holds the smallest.
		var magnitude uint64
		for _, part := range []struct {
			digits string
			scale  uint64
		}{{parts[0], 3_600_000_000}, {parts[1], 60_000_000}, {whole, 1_000_000}, {fraction + strings.Repeat("0", 6-len(fraction)), 1}} {
			value, err := strconv.ParseUint(part.digits, 10, 64)
			if err != nil || (value != 0 && value > (1<<63-magnitude)/part.scale) {
				return invalid
			}
			magnitude += value * part.scale
		}
		switch {
		case negative && magnitude == 1<<63:
			micros = math.MinInt64
		case negative:
			micros = -int64(magnitude)
		case magnitude > math.MaxInt64:
			return invalid
		default:
			micros = int64(magnitude)
		}
	}
	if len(fields) == 0 {
		return invalid
	}
	return v.set(months, days, micros, invalid)
}

func (v *Interval) set(months, days, micros int64, invalid error) error {
	if months > math.MaxInt32 || months < math.MinInt32 || days > math.MaxInt32 || days < math.MinInt32 {
		return invalid
	}
	*v = IntervalOf(int32(months), int32(days), micros)
	return nil
}

// add adds value*scale to total and reports false, leaving total, if any step overflows.
func add(total *int64, value, scale int64) bool {
	if value != 0 && (value > math.MaxInt64/scale || value < math.MinInt64/scale) {
		return false
	}
	sum := *total + value*scale
	if (value > 0 && sum < *total) || (value < 0 && sum > *total) {
		return false
	}
	*total = sum
	return true
}

// PostgreSQL encodes the interval infinities as every field at its extreme.
func (v *Interval) ScanInterval(value pgtype.Interval) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Interval")
	}
	switch {
	case value.Months == math.MaxInt32 && value.Days == math.MaxInt32 && value.Microseconds == math.MaxInt64:
		*v = IntervalInfinity
	case value.Months == math.MinInt32 && value.Days == math.MinInt32 && value.Microseconds == math.MinInt64:
		*v = IntervalNegInfinity
	default:
		*v = IntervalOf(value.Months, value.Days, value.Microseconds)
	}
	return nil
}
func (v Interval) IntervalValue() (pgtype.Interval, error) {
	switch v.infinity {
	case 1:
		return pgtype.Interval{Months: math.MaxInt32, Days: math.MaxInt32, Microseconds: math.MaxInt64, Valid: true}, nil
	case -1:
		return pgtype.Interval{Months: math.MinInt32, Days: math.MinInt32, Microseconds: math.MinInt64, Valid: true}, nil
	}
	if (v.months == math.MaxInt32 && v.days == math.MaxInt32 && v.microseconds == math.MaxInt64) ||
		(v.months == math.MinInt32 && v.days == math.MinInt32 && v.microseconds == math.MinInt64) {
		return pgtype.Interval{}, fmt.Errorf("a finite interval cannot hold PostgreSQL's encoding of infinity")
	}
	return pgtype.Interval{Months: v.months, Days: v.days, Microseconds: v.microseconds, Valid: true}, nil
}

// pgx's own interval text negates the microseconds, which overflows at their minimum.
func (v Interval) TextValue() (pgtype.Text, error) {
	if _, err := v.IntervalValue(); err != nil {
		return pgtype.Text{}, err
	}
	return pgtype.Text{String: v.String(), Valid: true}, nil
}

func temporalString(infinity int8, finite func() string) string {
	switch infinity {
	case 1:
		return "infinity"
	case -1:
		return "-infinity"
	}
	return finite()
}

// The simple protocol has no parameter type to plan by, so pgx sends these values as their text.
func codecText(codec pgtype.Codec, oid uint32, value any) (pgtype.Text, error) {
	text, err := codec.PlanEncode(nil, oid, pgtype.TextFormatCode, value).Encode(value, nil)
	if err != nil {
		return pgtype.Text{}, err
	}
	return pgtype.Text{String: string(text), Valid: true}, nil
}
func temporalParse(text, name, layout string) (int8, time.Time, error) {
	switch text {
	case "infinity":
		return 1, time.Time{}, nil
	case "-infinity":
		return -1, time.Time{}, nil
	}
	t, err := time.Parse(layout, text)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("invalid %s %q: %w", name, text, err)
	}
	return 0, t, nil
}
func infinityOf(modifier pgtype.InfinityModifier) (int8, error) {
	switch modifier {
	case pgtype.Finite:
		return 0, nil
	case pgtype.Infinity:
		return 1, nil
	case pgtype.NegativeInfinity:
		return -1, nil
	}
	return 0, fmt.Errorf("invalid infinity modifier %v", modifier)
}
