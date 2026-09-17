package jsonschemas

import (
	pgsid "example.com/pgsid-validation/generated/pgsid"
	validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"
	json "encoding/json"
)

type Event struct {
	Actor int64                   `json:"actor"`
	Label pgsid.Undefined[string] `json:"label,omitzero"`
	Next  pgsid.Undefined[*Event] `json:"next,omitzero"`
}

func (value *Event) UnmarshalJSON(data []byte) error {
	type decoded Event
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = Event(next)
	return nil
}
func ValidateEvent(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Event.json#")
}
func ValidateEventJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Event.json#")
}
