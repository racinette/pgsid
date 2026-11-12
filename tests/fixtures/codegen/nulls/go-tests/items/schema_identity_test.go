package items

import (
	"encoding/json"
	"example.com/pgsid-nulls/generated/jsonschemas"
	"example.com/pgsid-nulls/generated/pgsid"
	"example.com/pgsid-nulls/generated/schema/public"
	"testing"
)

func TestNamedSchemaIdentity(t *testing.T) {
	doc := jsonschemas.Document{RequiredValue: "ok"}
	table := public.Items{Payload: pgsid.Null[pgsid.JSON[jsonschemas.Document]]{V: documentOf(t, doc), Valid: true}}
	one := GetItemRow{Payload: table.Payload, MaybePayload: table.MaybePayload}
	many := ListItemsRow{Payload: one.Payload, MaybePayload: one.MaybePayload}
	table.Payload = many.Payload
	table.MaybePayload = many.MaybePayload
	if !table.Payload.Valid || document(t, table.Payload.V).RequiredValue != "ok" {
		t.Fatalf("named schema value changed: %+v", table)
	}
	if err := json.Unmarshal([]byte(`{"requiredValue":"next","optionalValue":"old"}`), &one.Payload.V); err != nil {
		t.Fatal(err)
	}
	if !document(t, one.Payload.V).OptionalValue.Set {
		t.Fatal("present property was lost")
	}
	if err := json.Unmarshal([]byte(`{"requiredValue":"fresh"}`), &one.Payload.V); err != nil {
		t.Fatal(err)
	}
	if document(t, one.Payload.V).OptionalValue.Set {
		t.Fatal("row bypassed the named schema decoder")
	}
}

// document reads a JSON document, failing the test when it does not decode.
func document[T any](t *testing.T, value pgsid.JSON[T]) T {
	t.Helper()
	decoded, err := value.Value()
	if err != nil {
		t.Fatal(err)
	}
	return decoded
}

// documentOf writes a JSON document, failing the test when the value does not encode.
func documentOf[T any](t *testing.T, value T) pgsid.JSON[T] {
	t.Helper()
	encoded, err := pgsid.JSONOf(value)
	if err != nil {
		t.Fatal(err)
	}
	return encoded
}
