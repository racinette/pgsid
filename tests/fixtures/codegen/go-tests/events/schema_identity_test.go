package events

import (
	"example.com/pgsid-fixture/generated/go/jsonschemas"
	pgsid "example.com/pgsid-fixture/generated/go/pgsid"
	"example.com/pgsid-fixture/generated/go/schema/public"
	"reflect"
	"testing"
)

func TestNamedSchemaIdentity(t *testing.T) {
	payload, err := pgsid.JSONOf(jsonschemas.EventPayload{Flags: []string{"ok"}})
	if err != nil {
		t.Fatal(err)
	}
	actor, err := pgsid.JSONOf(jsonschemas.EventPayloadActor{Id: 7})
	if err != nil {
		t.Fatal(err)
	}
	table := public.Events{Payload: payload}
	one := GetEventRow{Payload: table.Payload, Actor: &actor}
	// A member read out of the document has the type of the document's own field.
	document := decoded(t, one.Payload)
	document.Actor = decoded(t, *one.Actor)
	if one.Payload, err = pgsid.JSONOf(document); err != nil {
		t.Fatal(err)
	}
	many := ListEventsRow{Payload: one.Payload}
	updated := UpdateEventRow{Payload: many.Payload}
	table.Payload = updated.Payload
	want := reflect.TypeOf(pgsid.JSON[jsonschemas.EventPayload]{})
	for _, value := range []any{one.Payload, many.Payload, updated.Payload} {
		if reflect.TypeOf(value) != want {
			t.Fatalf("schema identity lost: %T", value)
		}
	}
	if decoded(t, table.Payload).Actor.Id != 7 {
		t.Fatalf("document read as %s", table.Payload.Text())
	}
}

func TestCheckCandidateDistinguishesUnknownAndNull(t *testing.T) {
	missing, err := public.EvaluatePublicEventIdDomainChecks(public.PublicEventIdCheckInput{})
	if err != nil {
		t.Fatal(err)
	}
	if missing[0].Result.Certain {
		t.Fatal("missing column must remain unknown")
	}
	explicit, err := public.EvaluatePublicEventIdDomainChecks(public.PublicEventIdCheckInput{
		Value: public.NullCheckValue[public.EventId](),
	})
	if err != nil {
		t.Fatal(err)
	}
	null := explicit[0].Result
	if !null.Certain || null.Value.Valid {
		t.Fatalf("explicit SQL NULL must evaluate to known NULL: %+v", null)
	}
}
