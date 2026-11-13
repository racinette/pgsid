package pgsid

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
)

const microsecondsPerDay = 86_400_000_000

// Time is a PostgreSQL time: a clock reading from midnight to 24:00:00 inclusive. Its zero value
// is midnight.
type Time struct{ microseconds int64 }

// TimeOf reads microseconds since midnight, which time holds from 0 to 24:00:00.
func TimeOf(microseconds int64) (Time, error) {
	if microseconds < 0 || microseconds > microsecondsPerDay {
		return Time{}, fmt.Errorf("time out of range: %d microseconds", microseconds)
	}
	return Time{microseconds: microseconds}, nil
}
func (t Time) Microseconds() int64 { return t.microseconds }
func (t Time) String() string      { return clockText(t.microseconds) }
func (t Time) MarshalText() ([]byte, error) {
	return []byte(t.String()), nil
}
func (t *Time) UnmarshalText(text []byte) error {
	microseconds, rest, err := parseClock(string(text))
	if err == nil && rest != "" {
		err = fmt.Errorf("invalid time %q", text)
	}
	if err == nil {
		*t, err = TimeOf(microseconds)
	}
	return err
}
func (t *Time) ScanTime(value pgtype.Time) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Time")
	}
	scanned, err := TimeOf(value.Microseconds)
	if err == nil {
		*t = scanned
	}
	return err
}
func (t Time) TimeValue() (pgtype.Time, error) {
	return pgtype.Time{Microseconds: t.microseconds, Valid: true}, nil
}

// The simple protocol has no parameter type to plan by, so pgx sends the time as its text.
func (t Time) TextValue() (pgtype.Text, error) {
	return pgtype.Text{String: t.String(), Valid: true}, nil
}

// Timetz is a PostgreSQL time with time zone: a clock reading and the offset east of UTC it was
// read at, which the server keeps within 15:59:59 either way. Its zero value is midnight at UTC.
type Timetz struct {
	microseconds int64
	offset       int32
}

const maxTimezoneOffset = 15*3600 + 59*60 + 59

// TimetzOf reads microseconds since midnight and the offset east of UTC, in seconds.
func TimetzOf(microseconds int64, offsetSeconds int32) (Timetz, error) {
	if microseconds < 0 || microseconds > microsecondsPerDay {
		return Timetz{}, fmt.Errorf("time out of range: %d microseconds", microseconds)
	}
	if offsetSeconds < -maxTimezoneOffset || offsetSeconds > maxTimezoneOffset {
		return Timetz{}, fmt.Errorf("time zone displacement out of range: %d seconds", offsetSeconds)
	}
	return Timetz{microseconds: microseconds, offset: offsetSeconds}, nil
}
func (t Timetz) Microseconds() int64  { return t.microseconds }
func (t Timetz) OffsetSeconds() int32 { return t.offset }

// String writes the clock and the offset as the server does: hours, then minutes and seconds
// only where they are not zero.
func (t Timetz) String() string {
	offset := t.offset
	sign := byte('+')
	if offset < 0 {
		sign, offset = '-', -offset
	}
	var b strings.Builder
	b.WriteString(clockText(t.microseconds))
	b.WriteByte(sign)
	b.WriteString(fmt.Sprintf("%02d", offset/3600))
	if offset%3600 != 0 {
		b.WriteString(fmt.Sprintf(":%02d", offset/60%60))
		if offset%60 != 0 {
			b.WriteString(fmt.Sprintf(":%02d", offset%60))
		}
	}
	return b.String()
}
func (t Timetz) MarshalText() ([]byte, error) {
	return []byte(t.String()), nil
}
func (t *Timetz) UnmarshalText(text []byte) error {
	source := string(text)
	invalid := fmt.Errorf("invalid time with time zone %q", source)
	microseconds, rest, err := parseClock(source)
	if err != nil || rest == "" || (rest[0] != '+' && rest[0] != '-') {
		return invalid
	}
	parts := strings.Split(rest[1:], ":")
	if len(parts) > 3 {
		return invalid
	}
	offset := int64(0)
	for index, part := range parts {
		value, err := strconv.ParseUint(part, 10, 8)
		if err != nil || len(part) != 2 || (index > 0 && value > 59) {
			return invalid
		}
		offset += int64(value) * []int64{3600, 60, 1}[index]
	}
	if rest[0] == '-' {
		offset = -offset
	}
	if offset < -maxTimezoneOffset || offset > maxTimezoneOffset {
		return invalid
	}
	*t, err = TimetzOf(microseconds, int32(offset))
	return err
}

// pgx registers no codec for time with time zone, so it moves as the server's text.
func (t *Timetz) ScanText(value pgtype.Text) error {
	if !value.Valid {
		return fmt.Errorf("cannot scan NULL into pgsid.Timetz")
	}
	return t.UnmarshalText([]byte(value.String))
}
func (t Timetz) TextValue() (pgtype.Text, error) {
	return pgtype.Text{String: t.String(), Valid: true}, nil
}

func clockText(microseconds int64) string {
	text := fmt.Sprintf("%02d:%02d:%02d", microseconds/3_600_000_000, microseconds/60_000_000%60, microseconds/1_000_000%60)
	if fraction := microseconds % 1_000_000; fraction != 0 {
		text += strings.TrimRight(fmt.Sprintf(".%06d", fraction), "0")
	}
	return text
}

// parseClock reads HH:MM:SS with up to six fraction digits, and returns what follows.
func parseClock(text string) (int64, string, error) {
	invalid := fmt.Errorf("invalid time %q", text)
	if len(text) < 8 || text[2] != ':' || text[5] != ':' {
		return 0, "", invalid
	}
	end := 8
	if end < len(text) && text[end] == '.' {
		end++
		for end < len(text) && text[end] >= '0' && text[end] <= '9' {
			end++
		}
		if end == 9 || end-9 > 6 {
			return 0, "", invalid
		}
	}
	units := []struct {
		digits string
		scale  int64
		limit  uint64
	}{{text[0:2], 3_600_000_000, 24}, {text[3:5], 60_000_000, 59}, {text[6:8], 1_000_000, 59}}
	total := int64(0)
	for _, unit := range units {
		value, err := strconv.ParseUint(unit.digits, 10, 8)
		if err != nil || value > unit.limit {
			return 0, "", invalid
		}
		total += int64(value) * unit.scale
	}
	if end > 8 {
		fraction := text[9:end]
		value, _ := strconv.ParseInt(fraction+strings.Repeat("0", 6-len(fraction)), 10, 64)
		total += value
	}
	if total > microsecondsPerDay {
		return 0, "", invalid
	}
	return total, text[end:], nil
}
