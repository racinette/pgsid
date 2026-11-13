package arrays

import (
	"context"
	"encoding/json"
	pgsid "example.com/pgsid-validation/generated/pgsid"
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
	id := pgsid.Null[int32]{V: 1, Valid: true}
	row, err := New(db).ReturnFlexible(context.Background(), ReturnFlexibleParams{Flexible: pgsid.D1[pgsid.Null[int32]]{{V: 1, Valid: true}}, Id: id})
	flexible, ok := row.Flexible.(pgsid.D2[pgsid.Null[int32]])
	if err != nil || !ok || len(flexible) != 1 || flexible[0][0].Valid {
		t.Fatalf("%#v: %v", row, err)
	}
	ragged := pgsid.D2[pgsid.Null[int32]]{{{V: 1, Valid: true}, {}}, {{}}}
	_, err = New(db).UpdateFlexible(context.Background(), UpdateFlexibleParams{Flexible: ragged, Id: id})
	raggedError(t, err)
	db.row = codecRow{mapping: m, data: [][]byte{nil}}
	optional, err := New(db).OptionalFlexible(context.Background())
	if err != nil || optional.OptionalFlexible.Valid {
		t.Fatalf("SQL NULL read as %#v, %v", optional, err)
	}
}
