package arrays

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"testing"

	pgsid "example.com/pgsid-validation/generated/pgsid"
	support "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

// An array of a dimension count the column does not declare is not a value of its type; what is
// left to refuse is a nested list that is no rectangle.
func TestRaggedInputsRejectBeforeEveryExecutor(t *testing.T) {
	db := &arrayDB{}
	q := New(db)
	ctx := context.Background()
	ragged := pgsid.D2[int32]{{1, 2}, {3}}
	raggedError(t, q.InsertFromCte(ctx, InsertFromCteParams{Matrix: [][]int32{{1}}, Flexible: ragged}))
	_, err := q.UpdateFlexible(ctx, UpdateFlexibleParams{Flexible: ragged, Id: pointer(int32(1))})
	raggedError(t, err)
	_, err = q.ReturnFlexible(ctx, ReturnFlexibleParams{Flexible: ragged, Id: pointer(int32(1))})
	raggedError(t, err)
	_, err = q.ReturnMany(ctx, ReturnManyParams{Flexible: ragged})
	raggedError(t, err)
	raggedError(t, q.InsertFromCte(ctx, InsertFromCteParams{Matrix: [][]int32{{1, 2}, {}}, Flexible: pgsid.D1[int32]{1}}))
	if db.calls != 0 {
		t.Fatal("invalid dimensions reached the driver")
	}
}

func TestValidInputIsSentAsItself(t *testing.T) {
	db := &arrayDB{}
	q := New(db)
	input := InsertFromCteParams{Matrix: [][]int32{{1, 2}}, Flexible: pgsid.D2[int32]{{1, 2}, {3, 4}}}
	if err := q.InsertFromCte(context.Background(), input); err != nil {
		t.Fatal(err)
	}
	var matrix any = input.Matrix
	if nullable, ok := matrix.(interface{ SQLValue() any }); ok {
		matrix = nullable.SQLValue()
	}
	if !reflect.DeepEqual(db.args[0], matrix) || !reflect.DeepEqual(db.args[1], input.Flexible) {
		t.Fatalf("parameters changed: %#v", db.args)
	}
	// pgx encodes an array of a declared count as the nested list it is.
	data, err := newCodecMap().Encode(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, db.args[1], nil)
	if err != nil {
		t.Fatal(err)
	}
	var decoded [][]int32
	if err := newCodecMap().Scan(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, data, &decoded); err != nil || !reflect.DeepEqual(decoded, [][]int32{{1, 2}, {3, 4}}) {
		t.Fatalf("encoded as %v, %v", decoded, err)
	}
	// An empty array of any count is the empty array, never NULL.
	input.Flexible = pgsid.D2[int32](nil)
	if err := q.InsertFromCte(context.Background(), input); err != nil {
		t.Fatal(err)
	}
	if empty, ok := db.args[1].(pgsid.D2[int32]); !ok || empty == nil || len(empty) != 0 {
		t.Fatalf("empty array sent as %#v", db.args[1])
	}
}

func TestReadsFixedShapesAndUnionCounts(t *testing.T) {
	db := &arrayDB{row: encoded(t, []int32{1, 2}, [][]int32{{1, 2}, {3, 4}}, [][][]int32{{{1, 2}, {3, 4}}, {{5, 6}, {7, 8}}}, [][]int32{{1, 2}, {3, 4}}, nil, [][]int32{{1, 2}})}
	row, err := New(db).GetArrays(context.Background(), GetArraysParams{Id: pointer(int32(1))})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(row.Flexible, pgsid.D2[int32]{{1, 2}, {3, 4}}) || row.OptionalFlexible != nil {
		t.Fatalf("union read as %#v", row)
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
	_, err = New(db).ReturnFlexible(context.Background(), ReturnFlexibleParams{Flexible: pgsid.D1[int32]{1}, Id: pointer(int32(1))})
	depthError(t, err, "ReturnFlexible", "flexible")
	if !strings.Contains(err.Error(), `sql.codegen.go.mappings.column["public.arrays.flexible"].dimensions allows 1 or 2`) {
		t.Fatalf("the error does not name the setting: %v", err)
	}
}

func TestEmptyAndSQLNullAreSeparate(t *testing.T) {
	db := &arrayDB{row: encoded(t, []int32{})}
	q := New(db)
	row, err := q.ReturnFlexible(context.Background(), ReturnFlexibleParams{Flexible: pgsid.D1[int32]{}, Id: pointer(int32(1))})
	if empty, ok := row.Flexible.(pgsid.D1[int32]); err != nil || !ok || empty == nil || len(empty) != 0 {
		t.Fatalf("empty array read as %#v, %v", row, err)
	}
	db.row = encoded(t, nil)
	_, err = q.ReturnFlexible(context.Background(), ReturnFlexibleParams{Flexible: pgsid.D1[int32]{1}, Id: pointer(int32(1))})
	if err == nil {
		t.Fatal("SQL NULL accepted for nonnullable array")
	}
	optional, err := q.OptionalFlexible(context.Background())
	if err != nil || optional.OptionalFlexible != nil {
		t.Fatalf("SQL NULL read as %#v, %v", optional, err)
	}
	_, err = support.ValidateArrayInput[int32](nil, []int{1, 2}, "the setting", "Input", "value", false)
	if err == nil {
		t.Fatal("SQL NULL array accepted")
	}
	_, err = support.ValidateArrayInput[int32]([]string{"x"}, []int{1, 2}, "the setting", "Input", "value", false)
	if err == nil {
		t.Fatal("an array of other elements accepted")
	}
}

func TestSharedParameterIntersectsDestinationDimensions(t *testing.T) {
	db := &arrayDB{}
	q := New(db)
	// The destinations share two dimensions alone, so the parameter is that nested list.
	if err := q.SharedDimensions(context.Background(), SharedDimensionsParams{Shared: [][]int32{{1, 2}, {3, 4}}}); err != nil {
		t.Fatal(err)
	}
	raggedError(t, q.SharedDimensions(context.Background(), SharedDimensionsParams{Shared: [][]int32{{1, 2}, {3}}}))
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
	err = m.Scan(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, data, support.ArrayTarget[int32](&matrix, nil, []int{2}, "the setting", "Matrix", "value", false))
	var detail *support.ArrayDimensionError
	if !errors.As(err, &detail) || detail.Actual != 1 || detail.Setting != "the setting" {
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
	if err := m.Scan(pgtype.Int4ArrayOID, pgtype.BinaryFormatCode, data, support.ArrayTarget[int32](&nested, nil, []int{6}, "the setting", "Nested", "value", false)); err != nil {
		t.Fatal(err)
	}
	if nested[0][0][0][0][0][0] != 7 {
		t.Fatal(nested)
	}
}
