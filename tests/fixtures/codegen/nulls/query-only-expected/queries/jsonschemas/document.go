package jsonschemas

import (
	pgsid "example.com/pgsid-nulls/generated/queries/pgsid"
	json "encoding/json"
)

type Document struct {
	RequiredValue    string                                             `json:"requiredValue"`
	RequiredNullable pgsid.Null[string]                                 `json:"requiredNullable"`
	OptionalValue    pgsid.Undefined[string]                            `json:"optionalValue,omitzero"`
	OptionalNullable pgsid.NullOrUndefined[float64]                     `json:"optionalNullable,omitzero"`
	Nested           DocumentNested                                     `json:"nested"`
	Values           []pgsid.Null[string]                               `json:"values"`
	Members          pgsid.Undefined[[]pgsid.Null[DocumentMembersItem]] `json:"members,omitzero"`
	Lookup           pgsid.Undefined[DocumentLookup]                    `json:"lookup,omitzero"`
	Node             pgsid.Undefined[DocumentNode]                      `json:"node,omitzero"`
	OptionalArray    pgsid.Undefined[[]int64]                           `json:"optionalArray,omitzero"`
	OptionalObject   pgsid.Undefined[DocumentOptionalObject]            `json:"optionalObject,omitzero"`
}

func (value *Document) UnmarshalJSON(data []byte) error {
	type decoded Document
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = Document(next)
	return nil
}

type DocumentNested struct {
	Enabled pgsid.Undefined[bool]         `json:"enabled,omitzero"`
	Note    pgsid.NullOrUndefined[string] `json:"note,omitzero"`
}

func (value *DocumentNested) UnmarshalJSON(data []byte) error {
	type decoded DocumentNested
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentNested(next)
	return nil
}

type DocumentMembersItem struct {
	Id      pgsid.Undefined[int64]     `json:"id,omitzero"`
	Profile DocumentMembersItemProfile `json:"profile"`
}

func (value *DocumentMembersItem) UnmarshalJSON(data []byte) error {
	type decoded DocumentMembersItem
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentMembersItem(next)
	return nil
}

type DocumentMembersItemProfile struct {
	Label pgsid.Undefined[string] `json:"label,omitzero"`
}

func (value *DocumentMembersItemProfile) UnmarshalJSON(data []byte) error {
	type decoded DocumentMembersItemProfile
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentMembersItemProfile(next)
	return nil
}

type DocumentLookup map[string]DocumentLookupValue

func (value *DocumentLookup) UnmarshalJSON(data []byte) error {
	type decoded DocumentLookup
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentLookup(next)
	return nil
}

type DocumentLookupValue struct {
	Enabled pgsid.Undefined[bool] `json:"enabled,omitzero"`
}

func (value *DocumentLookupValue) UnmarshalJSON(data []byte) error {
	type decoded DocumentLookupValue
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentLookupValue(next)
	return nil
}

type DocumentNode struct {
	Id   pgsid.Undefined[int64]         `json:"id,omitzero"`
	Next pgsid.Undefined[*DocumentNode] `json:"next,omitzero"`
}

func (value *DocumentNode) UnmarshalJSON(data []byte) error {
	type decoded DocumentNode
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentNode(next)
	return nil
}

type DocumentOptionalObject map[string]string

func (value *DocumentOptionalObject) UnmarshalJSON(data []byte) error {
	type decoded DocumentOptionalObject
	var next decoded
	err := json.Unmarshal(data, &next)
	if err != nil {
		return err
	}
	*value = DocumentOptionalObject(next)
	return nil
}
