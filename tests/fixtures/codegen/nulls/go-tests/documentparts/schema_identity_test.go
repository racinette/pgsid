package documentparts

import (
	"context"
	"example.com/pgsid-nulls/generated/jsonschemas"
	"example.com/pgsid-nulls/generated/pgsid"
	support "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"testing"
)

type jsonRows struct {
	pgx.Rows
	values [][]byte
}

func (r *jsonRows) Conn() *pgx.Conn { return nil }
func (r *jsonRows) FieldDescriptions() []pgconn.FieldDescription {
	fields := make([]pgconn.FieldDescription, len(r.values))
	for i := range fields {
		fields[i].DataTypeOID = pgtype.JSONBOID
	}
	return fields
}
func (r *jsonRows) Scan(dest ...any) error {
	if len(dest) == 1 {
		if scanner, ok := dest[0].(pgx.RowScanner); ok {
			return scanner.ScanRow(r)
		}
	}
	m := pgtype.NewMap()
	support.RegisterNulls(m)
	for i, target := range dest {
		if err := m.Scan(pgtype.JSONBOID, pgtype.TextFormatCode, r.values[i], target); err != nil {
			return err
		}
	}
	return nil
}

type jsonDB struct {
	support.DBTX
	row *jsonRows
}

func (d jsonDB) QueryRow(context.Context, string, ...any) pgx.Row { return d.row }

func TestNestedSchemaIdentityAndCodecs(t *testing.T) {
	member := []byte(`{"id":0,"profile":{"label":""}}`)
	db := jsonDB{row: &jsonRows{values: [][]byte{
		[]byte(`{"enabled":false}`),
		[]byte(`[{"id":0,"profile":{"label":""}},null]`),
		member, []byte(`null`), []byte(`{"label":""}`),
		[]byte(`{"enabled":false}`), []byte(`{"id":7,"next":{"id":8}}`),
	}}}
	row, err := New(db).GetParts(context.Background(), GetPartsParams{})
	if err != nil {
		t.Fatal(err)
	}
	var nested jsonschemas.DocumentNested = decoded(t, row.Nested)
	var first pgsid.Null[jsonschemas.DocumentMembersItem] = decoded(t, row.FirstMember)
	var last pgsid.Null[jsonschemas.DocumentMembersItem] = decoded(t, row.LastMember)
	var profile jsonschemas.DocumentMembersItemProfile = decoded(t, row.Profile)
	var lookup jsonschemas.DocumentLookupValue = decoded(t, row.LookupValue)
	var node jsonschemas.DocumentNode = decoded(t, row.Node)
	doc := jsonschemas.Document{Nested: nested}
	doc.Members.V = decoded(t, row.Members)
	doc.Members.Set = true
	doc.Members.V[0] = first
	doc.Members.V[0].V.Profile = profile
	doc.Lookup.V = jsonschemas.DocumentLookup{"key": lookup}
	doc.Lookup.Set = true
	doc.Node.V = node
	doc.Node.Set = true
	if !doc.Nested.Enabled.Set || !first.Valid || last.Valid || !profile.Label.Set || !lookup.Enabled.Set || doc.Node.V.Next.V.Id.V != 8 {
		t.Fatalf("nested states changed: %+v", row)
	}
	db.row.values = [][]byte{nil, nil, nil, nil, nil, nil, nil}
	row, err = New(db).GetParts(context.Background(), GetPartsParams{})
	if err != nil {
		t.Fatal(err)
	}
	if row.Nested.Valid || row.Members.Valid || row.FirstMember.Valid || row.LastMember.Valid || row.Profile.Valid || row.LookupValue.Valid || row.Node.Valid {
		t.Fatal("SQL NULL marked valid")
	}
	db.row.values = [][]byte{[]byte(`{"enabled":false}`)}
	function, err := New(db).GetNestedFunction(context.Background(), GetNestedFunctionParams{})
	if err != nil {
		t.Fatal(err)
	}
	function.Nested = row.Nested
}

// decoded reads a column's document, failing the test when it is SQL NULL or does not decode.
func decoded[T any](t *testing.T, column pgsid.Null[pgsid.JSON[T]]) T {
	t.Helper()
	if !column.Valid {
		t.Fatal("the document is SQL NULL")
	}
	value, err := column.V.Value()
	if err != nil {
		t.Fatal(err)
	}
	return value
}
