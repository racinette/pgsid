package jsonschemas

import validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"

type Event struct {
	Actor int64   `json:"actor"`
	Label *string `json:"label,omitempty"`
	Next  *Event  `json:"next,omitempty"`
}

func ValidateEvent(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Event.json#")
}
func ValidateEventJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Event.json#")
}
