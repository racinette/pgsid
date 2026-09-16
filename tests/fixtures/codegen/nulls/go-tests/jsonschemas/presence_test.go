package jsonschemas

import (
	"encoding/json"
	"example.com/pgsid-nulls/generated/pgsid"
	"reflect"
	"testing"
)

func TestPropertyPresence(t *testing.T) {
	cases := []struct {
		name       string
		extra      string
		set, valid bool
	}{
		{"absent", "", false, false},
		{"null", `,"optionalNullable":null`, true, false},
		{"zero", `,"optionalNullable":0`, true, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			input := `{"requiredValue":"ok","requiredNullable":null,"nested":{},"values":[]` + c.extra + `}`
			var doc Document
			if err := json.Unmarshal([]byte(input), &doc); err != nil {
				t.Fatal(err)
			}
			if doc.RequiredNullable.Valid || doc.OptionalValue.Set || doc.OptionalNullable.Set != c.set || doc.OptionalNullable.Valid != c.valid {
				t.Fatalf("wrong flags: %+v", doc)
			}
			out, err := json.Marshal(doc)
			if err != nil {
				t.Fatal(err)
			}
			var want, got any
			json.Unmarshal([]byte(input), &want)
			json.Unmarshal(out, &got)
			if !reflect.DeepEqual(want, got) {
				t.Fatalf("%s != %s", input, out)
			}
		})
	}
}
func TestNestedAndZeroValues(t *testing.T) {
	input := `{"requiredValue":"","requiredNullable":"","optionalValue":"","optionalNullable":0,"nested":{"enabled":false,"note":null},"values":[null,""],"optionalArray":[],"optionalObject":{}}`
	var doc Document
	if err := json.Unmarshal([]byte(input), &doc); err != nil {
		t.Fatal(err)
	}
	if !doc.RequiredNullable.Valid || !doc.OptionalValue.Set || !doc.OptionalNullable.Valid || !doc.Nested.Enabled.Set || doc.Nested.Enabled.V || !doc.Nested.Note.Set || doc.Nested.Note.Valid || doc.Values[0].Valid || !doc.Values[1].Valid || !doc.OptionalArray.Set || !doc.OptionalObject.Set {
		t.Fatalf("wrong state: %+v", doc)
	}
	out, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}
	var want, got any
	json.Unmarshal([]byte(input), &want)
	json.Unmarshal(out, &got)
	if !reflect.DeepEqual(want, got) {
		t.Fatalf("lost zero values: %s", out)
	}
	if err := json.Unmarshal([]byte(`{"requiredValue":"next","requiredNullable":null,"nested":{},"values":[]}`), &doc); err != nil {
		t.Fatal(err)
	}
	if doc.OptionalValue.Set || doc.OptionalNullable.Set || doc.Nested.Enabled.Set {
		t.Fatalf("retained previous presence: %+v", doc)
	}
	before := doc
	if err := json.Unmarshal([]byte(`{"optionalValue":null}`), &doc); err == nil {
		t.Fatal("accepted null for a nonnullable property")
	}
	if !reflect.DeepEqual(before, doc) {
		t.Fatal("failed decode changed the object")
	}
}
func TestNullableRoot(t *testing.T) {
	var doc MaybeDocument
	if err := json.Unmarshal([]byte(`null`), &doc); err != nil {
		t.Fatal(err)
	}
	if doc.Valid {
		t.Fatal("null root marked valid")
	}
	out, err := json.Marshal(doc)
	if err != nil || string(out) != "null" {
		t.Fatalf("%s %v", out, err)
	}
	if err := json.Unmarshal([]byte(`{"value":0}`), &doc); err != nil {
		t.Fatal(err)
	}
	if !doc.Valid || !doc.V.Value.Set || doc.V.Value.V != 0 {
		t.Fatalf("wrong root flags: %+v", doc)
	}
	out, err = json.Marshal(doc)
	if err != nil || string(out) != `{"value":0}` {
		t.Fatalf("%s %v", out, err)
	}
}
func TestUndefinedOutsideProperty(t *testing.T) {
	if _, err := json.Marshal(pgsid.Undefined[int]{}); err == nil {
		t.Fatal("silently serialized undefined")
	}
	if _, err := json.Marshal(pgsid.NullOrUndefined[int]{}); err == nil {
		t.Fatal("silently serialized undefined")
	}
}

func TestNamedNestedDecoderReuse(t *testing.T) {
	var nested DocumentNested
	if err := json.Unmarshal([]byte(`{"enabled":false}`), &nested); err != nil {
		t.Fatal(err)
	}
	if !nested.Enabled.Set {
		t.Fatal("lost zero value")
	}
	if err := json.Unmarshal([]byte(`{}`), &nested); err != nil {
		t.Fatal(err)
	}
	if nested.Enabled.Set {
		t.Fatal("nested decoder retained a missing property")
	}
	var node DocumentNode
	if err := json.Unmarshal([]byte(`{"id":0,"next":{"id":1}}`), &node); err != nil {
		t.Fatal(err)
	}
	if !node.Id.Set || !node.Next.Set || node.Next.V.Id.V != 1 {
		t.Fatalf("recursive type changed: %+v", node)
	}
}
