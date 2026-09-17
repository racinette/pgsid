package jsonschemas

import (
	pgsid "example.com/pgsid-validation/generated/pgsid"
	validation "example.com/pgsid-validation/generated/jsonschemas/pgsid"
	json "encoding/json"
)

type Audit struct {
	Actor int64                   `json:"actor"`
	Label string                  `json:"label"`
	Next  pgsid.Undefined[*Audit] `json:"next,omitzero"`
}

func (value *Audit) UnmarshalJSON(data []byte) error {
	type decoded Audit
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = Audit(next)
	return nil
}
func ValidateAudit(value any) error {
	return validation.ValidateValue(value, "pgsid:///jsonschemas/Audit.json#")
}
func ValidateAuditJSON(data []byte) error {
	return validation.ValidateJSON(data, "pgsid:///jsonschemas/Audit.json#")
}
