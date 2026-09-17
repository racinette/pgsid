package jsonschemas

import (
	"encoding/json"
	"errors"
	"github.com/santhosh-tekuri/jsonschema/v6"
	"testing"
)

func TestReusableValidators(t *testing.T) {
	if err := ValidateEventJSON([]byte(`{"actor":2,"next":{"actor":3}}`)); err != nil {
		t.Fatal(err)
	}
	var value Event
	if err := json.Unmarshal([]byte(`{"actor":2}`), &value); err != nil {
		t.Fatal(err)
	}
	if err := ValidateEvent(value); err != nil {
		t.Fatal(err)
	}
	for _, data := range []string{`{}`, `{"actor":0}`, `{"actor":2,"next":{"actor":0}}`, `{"actor":2,"unexpected":true}`} {
		var detail *jsonschema.ValidationError
		if err := ValidateEventJSON([]byte(data)); !errors.As(err, &detail) {
			t.Fatalf("missing structured error: %v", err)
		}
	}
	if err := ValidateEvent(map[string]any{"actor": 0}); err == nil {
		t.Fatal("accepted bad input")
	}
	if err := ValidateMaybeJSON([]byte("null")); err != nil {
		t.Fatal(err)
	}
	if err := ValidateNumbersJSON([]byte("[1,2]")); err != nil {
		t.Fatal(err)
	}
	if err := ValidateNumbersJSON([]byte("[0]")); err == nil {
		t.Fatal("accepted bad array")
	}
}
