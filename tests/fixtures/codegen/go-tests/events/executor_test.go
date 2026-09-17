package events

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"testing"
	"time"

	support "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx"
	public "example.com/pgsid-fixture/generated/go/schema/public"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	_ support.DBTX = (*pgx.Conn)(nil)
	_ support.DBTX = (*pgxpool.Pool)(nil)
	_ support.DBTX = (pgx.Tx)(nil)
)

type stubDB struct {
	exec     func(context.Context, string, ...any) (pgconn.CommandTag, error)
	query    func(context.Context, string, ...any) (pgx.Rows, error)
	queryRow func(context.Context, string, ...any) pgx.Row
}

func (db *stubDB) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	return db.exec(ctx, sql, args...)
}
func (db *stubDB) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	return db.query(ctx, sql, args...)
}
func (db *stubDB) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return db.queryRow(ctx, sql, args...)
}

type stubRow struct{ scan func(...any) error }

func (row stubRow) Scan(dest ...any) error { return row.scan(dest...) }

type datum struct {
	oid   uint32
	value []byte
}

func scanValues(dest []any, values []datum) error {
	if len(dest) != len(values) {
		return errors.New("wrong scan arity")
	}
	m := pgtype.NewMap()
	for i, value := range values {
		if err := m.Scan(value.oid, pgx.TextFormatCode, value.value, dest[i]); err != nil {
			return err
		}
	}
	return nil
}
func payload(id string) datum {
	return datum{pgtype.JSONBOID, []byte(`{"actor":{"id":` + id + `},"flags":["active"],"score":1.5}`)}
}
func listValues(id string, note []byte) []datum {
	return []datum{{pgtype.Int8OID, []byte(id)}, payload(id), {pgtype.TextOID, note}}
}

type stubRows struct {
	pgx.Rows
	values         [][]datum
	index          int
	closed         bool
	scanError      error
	iterationError error
}

func (rows *stubRows) Next() bool {
	if rows.index < len(rows.values) {
		rows.index++
		return true
	}
	rows.Close()
	return false
}
func (rows *stubRows) Close() { rows.closed = true }
func (rows *stubRows) Err() error {
	if !rows.closed {
		panic("Err called before rows closed")
	}
	return rows.iterationError
}
func (rows *stubRows) Scan(dest ...any) error {
	if rows.scanError != nil {
		return rows.scanError
	}
	return scanValues(dest, rows.values[rows.index-1])
}

func TestOneDecodesValuesAndNulls(t *testing.T) {
	ctx := context.Background()
	id := int64(7)
	db := &stubDB{queryRow: func(actual context.Context, sql string, args ...any) pgx.Row {
		if actual != ctx || sql != GetEventSQL || !reflect.DeepEqual(args, []any{&id}) {
			t.Fatalf("wrong request: %q %#v", sql, args)
		}
		return stubRow{func(dest ...any) error {
			return scanValues(dest, []datum{
				{pgtype.Int8OID, []byte("7")}, payload("42"), {pgtype.JSONBOID, []byte(`{"id":42}`)},
				{pgtype.TextOID, []byte("ready")}, {pgtype.TimestamptzOID, []byte("2026-01-01 00:00:00+00")},
				{pgtype.Int8OID, nil}, {pgtype.TextOID, nil},
			})
		}}
	}}
	row, err := New(db).GetEvent(ctx, GetEventParams{Id: &id})
	if err != nil {
		t.Fatal(err)
	}
	if row.Id != public.EventId(7) || row.Payload.Actor.Id != 42 || row.Actor == nil || row.Actor.Id != 42 || row.State != public.EventStateReady || !row.CreatedAt.Equal(time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)) || row.JoinedAccountId != nil || row.DisplayName != nil {
		t.Fatalf("wrong decoded row: %#v", row)
	}
}

func TestOnePropagatesDriverErrors(t *testing.T) {
	for _, expected := range []error{pgx.ErrNoRows, context.Canceled, errors.New("scan failed")} {
		db := &stubDB{queryRow: func(context.Context, string, ...any) pgx.Row { return stubRow{func(...any) error { return expected }} }}
		_, err := New(db).GetEvent(context.Background(), GetEventParams{})
		if !errors.Is(err, expected) {
			t.Fatalf("got %v, want %v", err, expected)
		}
	}
}

func TestUpdateBindsParametersInSqlOrder(t *testing.T) {
	ctx := context.Background()
	id, note := int64(9), "changed"
	params := UpdateEventParams{Id: &id, Note: &note}
	if err := json.Unmarshal(payload("9").value, &params.Payload); err != nil {
		t.Fatal(err)
	}
	db := &stubDB{queryRow: func(actual context.Context, sql string, args ...any) pgx.Row {
		if actual != ctx || sql != UpdateEventSQL || !reflect.DeepEqual(args, []any{params.Payload, params.Note, params.Id}) {
			t.Fatalf("wrong request: %q %#v", sql, args)
		}
		return stubRow{func(dest ...any) error {
			return scanValues(dest, []datum{{pgtype.Int8OID, []byte("9")}, payload("9"), {pgtype.TextOID, []byte("1.5")}, {pgtype.TextOID, []byte(note)}})
		}}
	}}
	row, err := New(db).UpdateEvent(ctx, params)
	if err != nil || row.Note == nil || *row.Note != note || row.Score == nil || *row.Score != "1.5" {
		t.Fatalf("got %#v, %v", row, err)
	}
}

func TestManyLifecycle(t *testing.T) {
	failure := errors.New("driver failed")
	cases := []struct {
		name       string
		rows       *stubRows
		queryError error
		wantError  error
		wantCount  int
	}{
		{name: "empty", rows: &stubRows{}},
		{name: "multiple", rows: &stubRows{values: [][]datum{listValues("1", nil), listValues("2", []byte("note"))}}, wantCount: 2},
		{name: "query error", queryError: failure, wantError: failure},
		{name: "scan error", rows: &stubRows{values: [][]datum{listValues("1", nil)}, scanError: failure}, wantError: failure},
		{name: "iteration error after a row", rows: &stubRows{values: [][]datum{listValues("1", nil)}, iterationError: failure}, wantError: failure},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			db := &stubDB{query: func(_ context.Context, sql string, args ...any) (pgx.Rows, error) {
				if sql != ListEventsSQL || len(args) != 0 {
					t.Fatalf("wrong request: %q %#v", sql, args)
				}
				return test.rows, test.queryError
			}}
			rows, err := New(db).ListEvents(context.Background())
			if !errors.Is(err, test.wantError) {
				t.Fatalf("got %v, want %v", err, test.wantError)
			}
			if err == nil && (rows == nil || len(rows) != test.wantCount) {
				t.Fatalf("wrong rows: %#v", rows)
			}
			if err != nil && rows != nil {
				t.Fatalf("partial results returned on failure: %#v", rows)
			}
			if test.rows != nil && !test.rows.closed {
				t.Fatal("rows leaked")
			}
			if len(rows) == 2 && (rows[0].Id != 1 || rows[1].Id != 2 || rows[0].Note != nil || rows[1].Note == nil || *rows[1].Note != "note") {
				t.Fatalf("wrong row ordering or nulls: %#v", rows)
			}
		})
	}
}

func TestExecAndAffectedRows(t *testing.T) {
	failure := errors.New("exec failed")
	for _, expected := range []error{nil, failure, context.Canceled} {
		var state public.EventState = public.EventStateReady
		statePtr := &state
		db := &stubDB{exec: func(_ context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
			if sql != DeleteFinishedEventsSQL || !reflect.DeepEqual(args, []any{statePtr}) {
				t.Fatalf("wrong request: %q %#v", sql, args)
			}
			return pgconn.NewCommandTag("DELETE 3"), expected
		}}
		affected, err := New(db).DeleteFinishedEvents(context.Background(), DeleteFinishedEventsParams{State: statePtr})
		if !errors.Is(err, expected) || (err == nil && affected != 3) || (err != nil && affected != 0) {
			t.Fatalf("got %d, %v", affected, err)
		}
	}
	note, id := "note", int64(11)
	db := &stubDB{exec: func(_ context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
		if sql != RenameEventSQL || !reflect.DeepEqual(args, []any{&note, &id}) {
			t.Fatalf("wrong request: %q %#v", sql, args)
		}
		return pgconn.NewCommandTag("UPDATE 1"), failure
	}}
	if err := New(db).RenameEvent(context.Background(), RenameEventParams{Note: &note, Id: &id}); !errors.Is(err, failure) {
		t.Fatal(err)
	}
}
