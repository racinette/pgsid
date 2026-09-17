package arrays

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
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

const validArray = `{"Elements":[1,2,3,4],"Dims":[{"Length":2,"LowerBound":-2},{"Length":2,"LowerBound":4}],"Valid":true}`
const wrongArray = `{"Elements":[1],"Dims":[{"Length":1,"LowerBound":1},{"Length":1,"LowerBound":1},{"Length":1,"LowerBound":1}],"Valid":true}`

func TestInputUnionsRejectBeforeEveryExecutor(t *testing.T) {
	db := &arrayDB{}
	q := New(db)
	ctx := context.Background()
	depthError(t, q.InsertFromCte(ctx, decode[InsertFromCteParams](t, `{"matrix":[[1]],"flexible":`+wrongArray+`}`)), "InsertFromCte", "flexible")
	_, err := q.UpdateFlexible(ctx, decode[UpdateFlexibleParams](t, `{"id":1,"flexible":`+wrongArray+`}`))
	depthError(t, err, "UpdateFlexible", "flexible")
	_, err = q.ReturnFlexible(ctx, decode[ReturnFlexibleParams](t, `{"id":1,"flexible":`+wrongArray+`}`))
	depthError(t, err, "ReturnFlexible", "flexible")
	_, err = q.ReturnMany(ctx, decode[ReturnManyParams](t, `{"flexible":`+wrongArray+`}`))
	depthError(t, err, "ReturnMany", "flexible")
	if db.calls != 0 {
		t.Fatal("invalid dimensions reached the driver")
	}
}

func TestValidInputPreservesDimensionsAndBounds(t *testing.T) {
	db := &arrayDB{}
	q := New(db)
	input := decode[InsertFromCteParams](t, `{"matrix":[[1,2]],"flexible":`+validArray+`}`)
	if err := q.InsertFromCte(context.Background(), input); err != nil {
		t.Fatal(err)
	}
	getter, ok := db.args[1].(pgtype.ArrayGetter)
	if !ok || !reflect.DeepEqual(getter.Dimensions(), []pgtype.ArrayDimension{{Length: 2, LowerBound: -2}, {Length: 2, LowerBound: 4}}) {
		t.Fatalf("dimensions changed: %#v", db.args)
	}
	var matrix any = input.Matrix
	if nullable, ok := matrix.(interface{ SQLValue() any }); ok {
		matrix = nullable.SQLValue()
	}
	if !reflect.DeepEqual(db.args[0], matrix) {
		t.Fatal("fixed matrix changed")
	}
}

func TestReadsFixedShapesAndPreservesUnionDimensions(t *testing.T) {
	flexible := pgtype.Array[int32]{Elements: []int32{1, 2, 3, 4}, Dims: []pgtype.ArrayDimension{{Length: 2, LowerBound: -2}, {Length: 2, LowerBound: 4}}, Valid: true}
	db := &arrayDB{row: encoded(t, []int32{1, 2}, [][]int32{{1, 2}, {3, 4}}, [][][]int32{{{1, 2}, {3, 4}}, {{5, 6}, {7, 8}}}, flexible, nil, [][]int32{{1, 2}})}
	row, err := New(db).GetArrays(context.Background(), decode[GetArraysParams](t, `{"id":1}`))
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(row.Flexible.Dimensions(), flexible.Dims) {
		t.Fatal(row.Flexible)
	}
	if len(row.Matrix) != 2 || len(row.Matrix[0]) != 2 || len(row.Ordinary) != 2 {
		t.Fatal(row)
	}
	raw, _ := json.Marshal(row.Matrix)
	if string(raw) != `[[1,2],[3,4]]` {
		t.Fatal(string(raw))
	}
	raw, _ = json.Marshal(row.Cube)
	if string(raw) != `[[[1,2],[3,4]],[[5,6],[7,8]]]` {
		t.Fatalf("cube was reshaped incorrectly: %s", raw)
	}
	db.row = encoded(t, [][][]int32{{{1}}})
	_, err = New(db).ReturnFlexible(context.Background(), decode[ReturnFlexibleParams](t, `{"id":1,"flexible":`+validArray+`}`))
	depthError(t, err, "ReturnFlexible", "flexible")
}

func TestEmptyAndSQLNullAreSeparate(t *testing.T) {
	db := &arrayDB{row: encoded(t, []int32{})}
	q := New(db)
	row, err := q.ReturnFlexible(context.Background(), decode[ReturnFlexibleParams](t, `{"id":1,"flexible":{"Elements":[],"Dims":[],"Valid":true}}`))
	if err != nil || !row.Flexible.Valid || row.Flexible.Dims == nil {
		t.Fatalf("empty array: %#v, %v", row, err)
	}
	db.row = encoded(t, nil)
	_, err = q.ReturnFlexible(context.Background(), decode[ReturnFlexibleParams](t, `{"id":1,"flexible":`+validArray+`}`))
	if err == nil {
		t.Fatal("SQL NULL accepted for nonnullable array")
	}
	_, err = q.OptionalFlexible(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	_, err = support.ValidateArrayInput[int32](pgtype.Array[int32]{}, []int{1, 2}, "Input", "value", false)
	if err == nil {
		t.Fatal("invalid/SQL NULL array accepted")
	}
	_, err = support.ValidateArrayInput[int32](pgtype.Array[int32]{Elements: []int32{1}, Dims: []pgtype.ArrayDimension{}, Valid: true}, []int{1, 2}, "Input", "value", false)
	if err == nil {
		t.Fatal("inconsistent element count accepted")
	}
}

func TestSharedParameterIntersectsDestinationDimensions(t *testing.T) {
	db := &arrayDB{}
	q := New(db)
	if err := q.SharedDimensions(context.Background(), decode[SharedDimensionsParams](t, `{"shared":`+validArray+`}`)); err != nil {
		t.Fatal(err)
	}
	vector := `{"Elements":[1],"Dims":[{"Length":1,"LowerBound":1}],"Valid":true}`
	err := q.SharedDimensions(context.Background(), decode[SharedDimensionsParams](t, `{"shared":`+vector+`}`))
	var detail *support.ArrayDimensionError
	if !errors.As(err, &detail) || detail.Actual != 1 || !reflect.DeepEqual(detail.Allowed, []int{2}) {
		t.Fatal(err)
	}
	if db.calls != 1 {
		t.Fatal("incompatible shared parameter reached driver")
	}
}

func TestFixedDepthScanRejectsMismatchAndPreservesSixDimensions(t *testing.T) {
	m := newCodecMap()
	data, err := m.Encode(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, []int32{1}, nil)
	if err != nil {
		t.Fatal(err)
	}
	var matrix [][]int32
	err = m.Scan(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, data, support.ArrayTarget[int32](&matrix, []int{2}, "Matrix", "value", false))
	var detail *support.ArrayDimensionError
	if !errors.As(err, &detail) || detail.Actual != 1 {
		t.Fatal(err)
	}
	dims := make([]pgtype.ArrayDimension, 6)
	for i := range dims {
		dims[i] = pgtype.ArrayDimension{Length: 1, LowerBound: 1}
	}
	data, err = m.Encode(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, pgtype.Array[int32]{Elements: []int32{7}, Dims: dims, Valid: true}, nil)
	if err != nil {
		t.Fatal(err)
	}
	var nested [][][][][][]int32
	if err := m.Scan(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, data, support.ArrayTarget[int32](&nested, []int{6}, "Nested", "value", false)); err != nil {
		t.Fatal(err)
	}
	if nested[0][0][0][0][0][0] != 7 {
		t.Fatal(nested)
	}
}
