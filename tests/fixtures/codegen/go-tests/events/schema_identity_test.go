package events

import (
	"example.com/pgsid-fixture/generated/go/jsonschemas"
	"example.com/pgsid-fixture/generated/go/schema/public"
	"reflect"
	"testing"
)

func TestNamedSchemaIdentity(t *testing.T) {
	table := public.Events{Payload: jsonschemas.EventPayload{Flags: []string{"ok"}}}
	actor := jsonschemas.EventPayloadActor{Id: 7}
	one := GetEventRow{Payload: table.Payload, Actor: &actor}
	one.Payload.Actor = *one.Actor
	many := ListEventsRow{Payload: one.Payload}
	updated := UpdateEventRow{Payload: many.Payload}
	table.Payload = updated.Payload
	want := reflect.TypeOf(jsonschemas.EventPayload{})
	for _, value := range []any{one.Payload, many.Payload, updated.Payload} {
		if reflect.TypeOf(value) != want {
			t.Fatalf("schema identity lost: %T", value)
		}
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
