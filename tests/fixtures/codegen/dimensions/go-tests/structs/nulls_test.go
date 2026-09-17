package arrays

import (
	"context"
	"encoding/json"
	support "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
	"testing"
)

func init() {
	newCodecMap = func() *pgtype.Map { m := pgtype.NewMap(); support.RegisterNulls(m); return m }
}

func TestNullElementsInNestedAndUnionArrays(t *testing.T) {
	m := newCodecMap()
	matrix, err := m.Encode(pgtype.Int4ArrayOID, pgtype.TextFormatCode, [][]*int32{{nil}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	var fixed GetArraysRow
	if err := m.Scan(pgtype.Int4ArrayOID, pgtype.TextFormatCode, matrix, &fixed.Matrix); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(fixed.Matrix)
	if string(raw) != `[[null]]` {
		t.Fatal(string(raw))
	}
	encoded, err := m.Encode(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, [][]*int32{{nil}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	db := &arrayDB{row: codecRow{mapping: m, data: [][]byte{encoded}}}
	row, err := New(db).ReturnFlexible(context.Background(), decode[ReturnFlexibleParams](t, `{"id":1,"flexible":`+validArray+`}`))
	if err != nil || !!row.Flexible.Elements[0].Valid {
		t.Fatalf("%#v: %v", row, err)
	}
}
