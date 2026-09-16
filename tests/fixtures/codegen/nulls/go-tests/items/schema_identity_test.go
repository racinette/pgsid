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
	table := public.Items{Payload: pgsid.Null[jsonschemas.Document]{V: doc, Valid: true}}
	one := GetItemRow{Payload: table.Payload, MaybePayload: table.MaybePayload}
	many := ListItemsRow{Payload: one.Payload, MaybePayload: one.MaybePayload}
	table.Payload = many.Payload
	table.MaybePayload = many.MaybePayload
	if !table.Payload.Valid || table.Payload.V.RequiredValue != "ok" {
		t.Fatalf("named schema value changed: %+v", table)
	}
	if err := json.Unmarshal([]byte(`{"requiredValue":"next","optionalValue":"old"}`), &one.Payload.V); err != nil {
		t.Fatal(err)
	}
	if !one.Payload.V.OptionalValue.Set {
		t.Fatal("present property was lost")
	}
	if err := json.Unmarshal([]byte(`{"requiredValue":"fresh"}`), &one.Payload.V); err != nil {
		t.Fatal(err)
	}
	if one.Payload.V.OptionalValue.Set {
		t.Fatal("row bypassed the named schema decoder")
	}
}
