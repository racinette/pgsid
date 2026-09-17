package documents

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"sync"
	"testing"

	support "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

const valid = `{"id":9007199254740992,"name":"alice","flags":["active"],"node":{"id":2,"next":{"id":3}},"mode":"b"}`

type fakeRows struct {
	pgx.Rows
	format int16
	values [][]byte
	oids   []uint32
	batch  [][][]byte
	index  int
	closed bool
	err    error
}

func (r *fakeRows) Conn() *pgx.Conn { return nil }
func (r *fakeRows) FieldDescriptions() []pgconn.FieldDescription {
	fields := make([]pgconn.FieldDescription, len(r.oids))
	for i, oid := range r.oids {
		fields[i].DataTypeOID = oid
	}
	return fields
}
func (r *fakeRows) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) == 1 {
		if scanner, ok := dest[0].(pgx.RowScanner); ok {
			return scanner.ScanRow(r)
		}
	}
	if len(dest) != len(r.values) {
		return errors.New("wrong scan arity")
	}
	m := pgtype.NewMap()
	m.RegisterType(&pgtype.Type{Name: "public.json_domain", OID: 90000, Codec: &pgtype.JSONBCodec{Marshal: json.Marshal, Unmarshal: json.Unmarshal}})
	for i, target := range dest {
		if err := m.Scan(r.oids[i], r.format, r.values[i], target); err != nil {
			return err
		}
	}
	return nil
}
func (r *fakeRows) Next() bool {
	if r.index == len(r.batch) {
		r.Close()
		return false
	}
	r.values = r.batch[r.index]
	r.index++
	return true
}
func (r *fakeRows) Close()     { r.closed = true }
func (r *fakeRows) Err() error { return r.err }

type fakeDB struct{ rows *fakeRows }

func (d *fakeDB) QueryRow(context.Context, string, ...any) pgx.Row        { return d.rows }
func (d *fakeDB) Query(context.Context, string, ...any) (pgx.Rows, error) { return d.rows, nil }
func (d *fakeDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	panic("unexpected exec")
}

func document(values ...string) *fakeRows {
	row := &fakeRows{oids: make([]uint32, len(values)), values: make([][]byte, len(values))}
	for i, value := range values {
		row.oids[i] = pgtype.JSONBOID
		row.values[i] = []byte(value)
	}
	return row
}
func getDocument(payload string) *fakeRows {
	r := document(payload, `{"id":2}`, `{}`, valid, "null", "")
	r.values[5] = nil
	return r
}
func detail(t *testing.T, err error, query, column string) *jsonschema.ValidationError {
	t.Helper()
	var context *support.QueryValidationError
	var issue *jsonschema.ValidationError
	if !errors.As(err, &context) || context.Query != query || context.Column != column || !errors.As(err, &issue) {
		t.Fatalf("missing structured error for %s.%s: %v", query, column, err)
	}
	if !strings.Contains(err.Error(), query+"."+column) {
		t.Fatal(err)
	}
	return issue
}

func TestValidationBeforeDecoding(t *testing.T) {
	cases := []struct{ name, payload, keyword string }{
		{"required", `{}`, "required"},
		{"unknown", strings.Replace(valid, `"mode":"b"`, `"mode":"b","surprise":1`, 1), "additionalProperties"},
		{"nested", strings.Replace(valid, `"id":3`, `"id":0`, 1), "minimum"},
		{"pattern", strings.Replace(valid, `"alice"`, `"ab"`, 1), "pattern"},
		{"unique", strings.Replace(valid, `["active"]`, `["active","active"]`, 1), "uniqueItems"},
		{"contains", strings.Replace(valid, `["active"]`, `["inactive"]`, 1), "contains"},
		{"conditional", strings.Replace(valid, `"mode":"b"`, `"mode":"a"`, 1), "required"},
		{"precision", strings.Replace(valid, "9007199254740992", "9007199254740993", 1), "maximum"},
		{"json null", "null", "type"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := New(&fakeDB{getDocument(c.payload)}).GetDocument(context.Background())
			issue := detail(t, err, "GetDocument", "payload")
			output, _ := json.Marshal(issue.BasicOutput())
			if !strings.Contains(string(output), c.keyword) {
				t.Fatalf("missing keyword %s: %s", c.keyword, output)
			}
			if c.name == "nested" && !strings.Contains(string(output), "/node/next/id") {
				t.Fatal(string(output))
			}
		})
	}
}

func TestSuccessfulDecodingOptOutAndDefaults(t *testing.T) {
	row, err := New(&fakeDB{getDocument(valid)}).GetDocument(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if row.Payload.Id != 9007199254740992 || row.Unchecked.Id != 0 {
		t.Fatalf("wrong row: %+v", row)
	}
	data, err := json.Marshal(row.Payload)
	if err != nil || strings.Contains(string(data), `"count"`) {
		t.Fatalf("default mutated payload: %s %v", data, err)
	}
	r := getDocument(valid)
	r.values[2] = []byte(strings.Replace(valid, `"mode":"b"`, `"mode":"b","extraKey":true`, 1))
	if _, err := New(&fakeDB{r}).GetDocument(context.Background()); err != nil {
		t.Fatal(err)
	}
	r = getDocument(valid)
	r.values[3] = []byte(`{}`)
	_, err = New(&fakeDB{r}).GetDocument(context.Background())
	detail(t, err, "GetDocument", "forced")
}

func TestSQLNullAndJSONNull(t *testing.T) {
	for _, maybe := range [][]byte{nil, []byte("null"), []byte(`{"value":0}`)} {
		r := getDocument(valid)
		r.values[4] = maybe
		row, err := New(&fakeDB{r}).GetDocument(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		v := reflect.ValueOf(row.Maybe)
		if v.Kind() == reflect.Struct {
			if v.FieldByName("Valid").Bool() != (maybe != nil) {
				t.Fatalf("SQL and JSON null conflated: %+v", row.Maybe)
			}
		}
	}
	r := getDocument(valid)
	r.values[5] = []byte("null")
	_, err := New(&fakeDB{r}).GetDocument(context.Background())
	detail(t, err, "GetDocument", "strict")
}

func TestProjectedAndReturningValidation(t *testing.T) {
	for _, node := range []string{`{}`, `{"id":2,"next":{"id":0}}`, `{"id":2,"surprise":true}`} {
		_, err := New(&fakeDB{document(node)}).GetNode(context.Background())
		detail(t, err, "GetNode", "node")
	}
	if _, err := New(&fakeDB{document(`{"id":2,"next":{"id":3}}`)}).GetNode(context.Background()); err != nil {
		t.Fatal(err)
	}
	params := UpdateDocumentParams{}
	if err := json.Unmarshal([]byte(valid), &params.Payload); err != nil {
		t.Fatal(err)
	}
	_, err := New(&fakeDB{document(`{}`)}).UpdateDocument(context.Background(), params)
	detail(t, err, "UpdateDocument", "payload")
	r := document("alice")
	r.oids[0] = pgtype.TextOID
	if _, err := New(&fakeDB{r}).GetName(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestUnusualOutputAlias(t *testing.T) {
	_, err := New(&fakeDB{document(`{}`)}).GetPrototype(context.Background())
	detail(t, err, "GetPrototype", "__proto__")
	if _, err := New(&fakeDB{document(valid)}).GetPrototype(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestManyStopsClosesAndPreservesDriverErrors(t *testing.T) {
	r := document(valid)
	r.batch = [][][]byte{{[]byte(valid)}, {[]byte(`{}`)}}
	rows, err := New(&fakeDB{r}).ListDocuments(context.Background())
	detail(t, err, "ListDocuments", "payload")
	if rows != nil || !r.closed {
		t.Fatal("failed batch returned partial results or leaked rows")
	}
	for _, failure := range []error{pgx.ErrNoRows, context.Canceled} {
		r := getDocument(valid)
		r.err = failure
		_, err := New(&fakeDB{r}).GetDocument(context.Background())
		if !errors.Is(err, failure) {
			t.Fatalf("lost driver error: %v", err)
		}
	}
}

func TestScannerAtomicAndConcurrent(t *testing.T) {
	var wg sync.WaitGroup
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			value := json.RawMessage(`"unchanged"`)
			scanner := support.ValidatedJSON(&value, "pgsid:///jsonschemas/Document.json#", "GetDocument", "payload", false).(interface{ Scan(any) error })
			if err := scanner.Scan([]byte(`{}`)); err == nil || string(value) != `"unchanged"` {
				t.Errorf("invalid payload changed destination: %s %v", value, err)
			}
			if err := scanner.Scan([]byte(valid)); err != nil || string(value) != valid {
				t.Errorf("valid payload changed: %s %v", value, err)
			}
		}()
	}
	wg.Wait()
}

func TestMalformedJSONAndDecodeErrorsKeepContext(t *testing.T) {
	for _, payload := range []string{`{`, valid + ` {}`, strings.Replace(valid, `"mode":"b"`, `"mode":"b","count":100000000000000000000`, 1)} {
		_, err := New(&fakeDB{getDocument(payload)}).GetDocument(context.Background())
		var issue *support.QueryValidationError
		if !errors.As(err, &issue) || issue.Query != "GetDocument" || issue.Column != "payload" {
			t.Fatalf("lost error context: %v", err)
		}
	}
}

func TestJSONCodecsFormatsAndDomains(t *testing.T) {
	for _, oid := range []uint32{pgtype.JSONOID, pgtype.JSONBOID, 90000} {
		for _, format := range []int16{pgx.TextFormatCode, pgx.BinaryFormatCode} {
			for _, value := range []string{`{"id":1}`, `{"id":0}`} {
				r := document(value)
				r.oids[0] = oid
				r.format = format
				if format == pgx.BinaryFormatCode && oid != pgtype.JSONOID {
					r.values[0] = append([]byte{1}, r.values[0]...)
				}
				_, err := New(&fakeDB{r}).GetNode(context.Background())
				if value == `{"id":1}` {
					if err != nil {
						t.Fatalf("codec %d format %d: %v", oid, format, err)
					}
				} else {
					detail(t, err, "GetNode", "node")
				}
			}
		}
	}
}
