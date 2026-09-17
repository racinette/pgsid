package jsonschemas

import validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"

type Maybe *MaybeValue
type MaybeValue struct {
	Actor *int64 `json:"actor,omitempty"`
}

func ValidateMaybe(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Maybe.json#")
}
func ValidateMaybeJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Maybe.json#")
}
