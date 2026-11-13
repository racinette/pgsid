package arrays

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"testing"

	support "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

var newCodecMap = pgtype.NewMap

type codecRow struct {
	data    [][]byte
	mapping *pgtype.Map
}
type codecRows struct {
	pgx.Rows
	row codecRow
}

func (r codecRows) Conn() *pgx.Conn { return nil }
func (r codecRows) FieldDescriptions() []pgconn.FieldDescription {
	fields := make([]pgconn.FieldDescription, len(r.row.data))
	for i := range fields {
		fields[i].DataTypeOID = pgtype.Int4ArrayOID
	}
	return fields
}
func (r codecRows) Scan(targets ...any) error {
	for i, target := range targets {
		if err := r.row.mapping.Scan(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, r.row.data[i], target); err != nil {
			return err
		}
	}
	return nil
}
func (r codecRow) Scan(targets ...any) error {
	rows := codecRows{row: r}
	if len(targets) == 1 {
		if scanner, ok := targets[0].(pgx.RowScanner); ok {
			return scanner.ScanRow(rows)
		}
	}
	return rows.Scan(targets...)
}

type arrayDB struct {
	calls int
	args  []any
	row   codecRow
}

func (db *arrayDB) Exec(_ context.Context, _ string, args ...any) (pgconn.CommandTag, error) {
	db.calls++
	db.args = args
	return pgconn.NewCommandTag("UPDATE 1"), nil
}
func (db *arrayDB) QueryRow(_ context.Context, _ string, args ...any) pgx.Row {
	db.calls++
	db.args = args
	return db.row
}
func (db *arrayDB) Query(_ context.Context, _ string, args ...any) (pgx.Rows, error) {
	db.calls++
	db.args = args
	return nil, errors.New("unexpected Query")
}

func decode[T any](t *testing.T, raw string) T {
	t.Helper()
	var value T
	if err := json.Unmarshal([]byte(raw), &value); err != nil {
		t.Fatal(err)
	}
	return value
}
func encoded(t *testing.T, values ...any) codecRow {
	t.Helper()
	mapping := newCodecMap()
	data := make([][]byte, len(values))
	for i, value := range values {
		var err error
		data[i], err = mapping.Encode(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, value, nil)
		if err != nil {
			t.Fatal(err)
		}
	}
	return codecRow{data: data, mapping: mapping}
}
func depthError(t *testing.T, err error, query, column string) {
	t.Helper()
	var detail *support.ArrayDimensionError
	if !errors.As(err, &detail) || detail.Query != query || detail.Column != column || detail.Actual != 3 || !reflect.DeepEqual(detail.Allowed, []int{1, 2}) {
		t.Fatalf("missing dimension context %s.%s: %v", query, column, err)
	}
}

func raggedError(t *testing.T, err error) {
	t.Helper()
	if err == nil || !strings.Contains(err.Error(), "equal, positive lengths") {
		t.Fatalf("ragged array accepted: %v", err)
	}
}

func pointer[T any](value T) *T { return &value }
