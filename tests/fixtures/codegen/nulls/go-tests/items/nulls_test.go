package items

import (
	"context"
	"database/sql/driver"
	"errors"
	"example.com/pgsid-nulls/generated/pgsid"
	support "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
	"example.com/pgsid-nulls/generated/schema/public"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"testing"
)

type fakeRows struct {
	pgx.Rows
	m      *pgtype.Map
	oids   []uint32
	values [][]byte
	next   bool
	err    error
}

func (r *fakeRows) FieldDescriptions() []pgconn.FieldDescription {
	fields := make([]pgconn.FieldDescription, len(r.oids))
	for i, oid := range r.oids {
		fields[i].DataTypeOID = oid
	}
	return fields
}
func (r *fakeRows) Conn() *pgx.Conn { return nil }
func (r *fakeRows) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) == 1 {
		if scanner, ok := dest[0].(pgx.RowScanner); ok {
			return scanner.ScanRow(r)
		}
	}
	for i, d := range dest {
		if err := r.m.Scan(r.oids[i], pgtype.TextFormatCode, r.values[i], d); err != nil {
			return err
		}
	}
	return nil
}
func (r *fakeRows) Next() bool {
	if r.next {
		r.next = false
		return true
	}
	return false
}
func (r *fakeRows) Close()     {}
func (r *fakeRows) Err() error { return r.err }

type fakeDB struct {
	rows *fakeRows
	args []any
}

func (d *fakeDB) QueryRow(_ context.Context, _ string, args ...any) pgx.Row {
	d.args = args
	return d.rows
}
func (d *fakeDB) Query(_ context.Context, _ string, args ...any) (pgx.Rows, error) {
	d.args = args
	d.rows.next = true
	return d.rows, nil
}
func (d *fakeDB) Exec(_ context.Context, _ string, args ...any) (pgconn.CommandTag, error) {
	d.args = args
	return pgconn.NewCommandTag("UPDATE 1"), nil
}
func typeMap() *pgtype.Map {
	m := pgtype.NewMap()
	support.RegisterNulls(m)
	m.RegisterType(&pgtype.Type{Name: "public.user_id", OID: 90000, Codec: pgtype.Int8Codec{}})
	m.RegisterType(&pgtype.Type{Name: "public.state", OID: 90001, Codec: &pgtype.EnumCodec{}})
	id, _ := m.TypeForOID(90000)
	text, _ := m.TypeForOID(pgtype.TextOID)
	json, _ := m.TypeForOID(pgtype.JSONBOID)
	m.RegisterType(&pgtype.Type{Name: "public.profile", OID: 90002, Codec: &pgtype.CompositeCodec{Fields: []pgtype.CompositeCodecField{{Name: "id", Type: id}, {Name: "label", Type: text}, {Name: "payload", Type: json}}}})
	return m
}
func row(values [][]byte) *fakeRows {
	return &fakeRows{m: typeMap(), oids: []uint32{pgtype.Int8OID, 90000, 90001, pgtype.JSONBOID, pgtype.JSONBOID, pgtype.Int8ArrayOID, 90002, pgtype.JSONBOID}, values: values}
}
func TestSQLNullsAndCodecs(t *testing.T) {
	doc := []byte(`{"requiredValue":"ok","requiredNullable":null,"nested":{},"values":[]}`)
	d := &fakeDB{rows: row([][]byte{[]byte("1"), []byte("7"), []byte("ready"), doc, []byte("null"), []byte("{1,NULL,0}"), []byte("(7,,null)"), []byte("null")})}
	q := New(d)
	got, err := q.GetItem(context.Background(), GetItemParams{})
	if err != nil {
		t.Fatal(err)
	}
	if !got.UserId.Valid || got.UserId.V != 7 || !got.State.Valid || !got.Payload.Valid || got.Payload.V.RequiredNullable.Valid || got.MaybePayload.Valid || !got.NullableValue.Valid || got.NullableValue.V.Valid || !got.Numbers.Valid || got.Numbers.V[1].Valid || !got.Numbers.V[2].Valid || !got.Metadata.Valid || got.Metadata.V.Label.Valid || !got.Metadata.V.Payload.Valid || string(got.Metadata.V.Payload.V) != "null" {
		t.Fatalf("wrong values: %+v", got)
	}
	encoded, err := d.rows.m.Encode(90002, pgtype.TextFormatCode, got.Metadata.V, nil)
	if err != nil {
		t.Fatal(err)
	}
	if string(encoded) != "(7,,null)" {
		t.Fatalf("composite changed: %s", encoded)
	}
	encoded, err = d.rows.m.Encode(pgtype.Int8ArrayOID, pgtype.TextFormatCode, got.Numbers.V, nil)
	if err != nil {
		t.Fatal(err)
	}
	if string(encoded) != "{1,NULL,0}" {
		t.Fatalf("array changed: %s", encoded)
	}
	d.rows = row([][]byte{[]byte("2"), nil, nil, nil, []byte("null"), nil, nil, nil})
	got, err = q.GetItem(context.Background(), GetItemParams{})
	if err != nil {
		t.Fatal(err)
	}
	if got.UserId.Valid || got.State.Valid || got.Payload.Valid || got.Numbers.Valid || got.Metadata.Valid {
		t.Fatalf("SQL NULL marked valid: %+v", got)
	}
	d.rows.err = pgx.ErrNoRows
	if _, err = q.GetItem(context.Background(), GetItemParams{}); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal(err)
	}
	d.rows = row([][]byte{[]byte("1"), nil, nil, nil, []byte("null"), nil, nil, nil})
	list, err := q.ListItems(context.Background())
	if err != nil || len(list) != 1 {
		t.Fatalf("%+v %v", list, err)
	}
}
func TestParameters(t *testing.T) {
	d := &fakeDB{}
	q := New(d)
	if err := q.SetItem(context.Background(), SetItemParams{}); err != nil {
		t.Fatal(err)
	}
	for _, v := range d.args {
		if valuer, ok := v.(driver.Valuer); ok {
			raw, err := valuer.Value()
			if err != nil || raw != nil {
				t.Fatalf("%v %v", raw, err)
			}
		} else if v != nil {
			t.Fatalf("NULL param: %v", v)
		}
	}
	params := SetItemParams{UserId: pgsid.Null[public.UserId]{V: 0, Valid: true}}
	params.Payload.Valid = true
	if err := q.SetItem(context.Background(), params); err != nil {
		t.Fatal(err)
	}
	if d.args[0] != public.UserId(0) {
		t.Fatalf("zero became NULL: %v", d.args[0])
	}
	raw, err := d.args[2].(driver.Valuer).Value()
	if err != nil || string(raw.([]byte)) != "null" {
		t.Fatalf("JSON null became SQL NULL: %v %v", raw, err)
	}
}
