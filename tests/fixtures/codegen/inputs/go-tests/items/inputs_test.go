package items

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"testing"

	support "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

type inputDB struct {
	calls int
	args  []any
	err   error
}

func (db *inputDB) Exec(_ context.Context, _ string, args ...any) (pgconn.CommandTag, error) {
	db.calls++
	db.args = args
	return pgconn.NewCommandTag("UPDATE 1"), db.err
}
func (db *inputDB) QueryRow(_ context.Context, _ string, args ...any) pgx.Row {
	db.calls++
	db.args = args
	return inputRow{db.err}
}
func (db *inputDB) Query(_ context.Context, _ string, args ...any) (pgx.Rows, error) {
	db.calls++
	db.args = args
	return nil, db.err
}

type inputRow struct{ err error }

func (row inputRow) Scan(...any) error { return row.err }
func params[T any](t *testing.T, data string) T {
	t.Helper()
	var value T
	if err := json.Unmarshal([]byte(data), &value); err != nil {
		t.Fatal(err)
	}
	return value
}
func inputDetail(t *testing.T, err error, query, column string) {
	t.Helper()
	var context *support.QueryValidationError
	var detail *jsonschema.ValidationError
	if !errors.As(err, &context) || context.Query != query || context.Column != column || !errors.As(err, &detail) {
		t.Fatalf("missing input error %s.%s: %v", query, column, err)
	}
}
func TestRejectsInputsBeforeEveryExecutorMode(t *testing.T) {
	db := &inputDB{}
	q := New(db)
	inputDetail(t, q.InsertPayload(context.Background(), params[InsertPayloadParams](t, `{"payload":{"actor":0}}`)), "InsertPayload", "payload")
	affected, err := q.UpdatePayload(context.Background(), params[UpdatePayloadParams](t, `{"payload":{"actor":0},"id":1}`))
	if affected != 0 {
		t.Fatal(affected)
	}
	inputDetail(t, err, "UpdatePayload", "payload")
	_, err = q.ReturningPayload(context.Background(), params[ReturningPayloadParams](t, `{"payload":{"actor":0}}`))
	inputDetail(t, err, "ReturningPayload", "payload")
	rows, err := q.ReturningMany(context.Background(), params[ReturningManyParams](t, `{"payload":{"actor":0}}`))
	if rows != nil {
		t.Fatal(rows)
	}
	inputDetail(t, err, "ReturningMany", "payload")
	if db.calls != 0 {
		t.Fatalf("invalid input reached driver: %d", db.calls)
	}
}
func TestNestedWritesAndMultipleBindings(t *testing.T) {
	db := &inputDB{}
	q := New(db)
	inputDetail(t, q.InsertFromCte(context.Background(), params[InsertFromCteParams](t, `{"payload":{"actor":0}}`)), "InsertFromCte", "payload")
	_, err := q.WriteInCte(context.Background(), params[WriteInCteParams](t, `{"payload":{"actor":0}}`))
	inputDetail(t, err, "WriteInCte", "payload")
	inputDetail(t, q.InsertMany(context.Background(), params[InsertManyParams](t, `{"first":{"actor":1},"second":{"actor":0}}`)), "InsertMany", "second")
	inputDetail(t, q.Upsert(context.Background(), params[UpsertParams](t, `{"id":1,"first":{"actor":1},"second":{"actor":0}}`)), "Upsert", "second")
	inputDetail(t, q.TupleUpdate(context.Background(), params[TupleUpdateParams](t, `{"first":{"actor":0},"second":{"actor":1}}`)), "TupleUpdate", "first")
	inputDetail(t, q.CastJSON(context.Background(), params[CastJSONParams](t, `{"payload":{"actor":0}}`)), "CastJSON", "payload")
	inputDetail(t, q.MergePayload(context.Background(), params[MergePayloadParams](t, `{"id":1,"payload":{"actor":0}}`)), "MergePayload", "payload")
	if db.calls != 0 {
		t.Fatal(db.calls)
	}
}
func TestValidInputsEncodedOnceAndDriverErrorsPreserved(t *testing.T) {
	failure := errors.New("driver failure")
	db := &inputDB{err: failure}
	input := params[InsertPayloadParams](t, `{"payload":{"actor":2,"next":{"actor":3}}}`)
	before, _ := json.Marshal(input)
	if err := New(db).InsertPayload(context.Background(), input); !errors.Is(err, failure) {
		t.Fatal(err)
	}
	after, _ := json.Marshal(input)
	if string(before) != string(after) {
		t.Fatal("input mutated")
	}
	raw, ok := db.args[0].(json.RawMessage)
	if !ok {
		t.Fatalf("expected encoded JSON, got %T", db.args[0])
	}
	var document map[string]any
	if err := json.Unmarshal(raw, &document); err != nil {
		t.Fatal(err)
	}
	if document["actor"] != float64(2) {
		t.Fatal(document)
	}
}
func TestNullsArraysAndOptOut(t *testing.T) {
	db := &inputDB{}
	q := New(db)
	if err := q.InsertMaybe(context.Background(), InsertMaybeParams{}); err != nil {
		t.Fatal(err)
	}
	if db.args[0] != nil {
		t.Fatalf("SQL NULL encoded as %#v", db.args[0])
	}
	jsonNull := InsertMaybeParams{}
	if nullable, ok := any(&jsonNull.Payload).(interface{ SetSQLValid(bool) }); ok {
		nullable.SetSQLValid(true)
	} else {
		field := reflect.ValueOf(&jsonNull.Payload).Elem()
		field.Set(reflect.New(field.Type().Elem()))
	}
	if err := q.InsertMaybe(context.Background(), jsonNull); err != nil {
		t.Fatal(err)
	}
	if string(db.args[0].(json.RawMessage)) != "null" {
		t.Fatal(db.args)
	}
	if err := q.InsertJSONNull(context.Background(), InsertJSONNullParams{}); err != nil {
		t.Fatal(err)
	}
	if string(db.args[0].(json.RawMessage)) != "null" {
		t.Fatal(db.args)
	}
	if err := q.InsertArray(context.Background(), params[InsertArrayParams](t, `{"payload":[1,2]}`)); err != nil {
		t.Fatal(err)
	}
	if string(db.args[0].(json.RawMessage)) != "[1,2]" {
		t.Fatal(db.args)
	}
	inputDetail(t, q.InsertArray(context.Background(), params[InsertArrayParams](t, `{"payload":[0]}`)), "InsertArray", "payload")
	jsonNullArray := InsertArrayParams{}
	if nullable, ok := any(&jsonNullArray.Payload).(interface{ SetSQLValid(bool) }); ok {
		nullable.SetSQLValid(true)
	} else {
		field := reflect.ValueOf(&jsonNullArray.Payload).Elem()
		field.Set(reflect.New(field.Type().Elem()))
	}
	inputDetail(t, q.InsertArray(context.Background(), jsonNullArray), "InsertArray", "payload")
	if err := q.InsertUnchecked(context.Background(), params[InsertUncheckedParams](t, `{"payload":{"actor":0}}`)); err != nil {
		t.Fatal(err)
	}
}
func TestParameterMustSatisfyEveryDestination(t *testing.T) {
	db := &inputDB{}
	q := New(db)
	for _, document := range []string{`{"payload":{"actor":0,"label":"ok"}}`, `{"payload":{"actor":11,"label":"ok"}}`, `{"payload":{"actor":2}}`} {
		inputDetail(t, q.MultipleSchemas(context.Background(), params[MultipleSchemasParams](t, document)), "MultipleSchemas", "payload")
	}
	if db.calls != 0 {
		t.Fatal(db.calls)
	}
	if err := q.MultipleSchemas(context.Background(), params[MultipleSchemasParams](t, `{"payload":{"actor":2,"label":"ok"}}`)); err != nil {
		t.Fatal(err)
	}
	if len(db.args) != 1 || db.calls != 1 {
		t.Fatal(db.args)
	}
}
