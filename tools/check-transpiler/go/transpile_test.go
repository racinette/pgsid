package transpiler

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNamesKeepFieldVisibilityByOwner(t *testing.T) {
	indexType := &node{Kind: "path", Segments: []string{"usize"}}
	publicType := &node{Kind: "path", Segments: []string{"PublicSpan"}}
	privateType := &node{Kind: "path", Segments: []string{"PrivateSpan"}}
	document := document{
		SchemaVersion: 1,
		Items: []*node{
			{Kind: "struct", Visibility: "public", Name: "PublicSpan", Fields: []field{{Name: "shared_name", Visibility: "public", Type: indexType}}},
			{Kind: "struct", Visibility: "private", Name: "PrivateSpan", Fields: []field{{Name: "shared_name", Visibility: "private", Type: indexType}}},
			{Kind: "function", Visibility: "public", Name: "read_public", Parameters: []parameter{{Name: "input_value", Type: publicType}}, ReturnType: indexType, Body: []*node{{Kind: "expression", Value: &node{Kind: "field", Base: &node{Kind: "path", Segments: []string{"input_value"}}, Member: "shared_name"}}}},
			{Kind: "function", Visibility: "private", Name: "read_private", Parameters: []parameter{{Name: "input_value", Type: privateType}}, ReturnType: indexType, Body: []*node{{Kind: "expression", Value: &node{Kind: "field", Base: &node{Kind: "path", Segments: []string{"input_value"}}, Member: "shared_name"}}}},
		},
	}
	input, err := json.Marshal(document)
	if err != nil {
		t.Fatal(err)
	}
	output, err := Transpile(input)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		"type PublicSpan struct {\n\tSharedName int",
		"type privateSpan struct {\n\tsharedName int",
		"func ReadPublic(inputValue PublicSpan) int",
		"func readPrivate(inputValue privateSpan) int",
		"return inputValue.SharedName",
		"return inputValue.sharedName",
	} {
		if !strings.Contains(string(output), expected) {
			t.Errorf("generated Go is missing %q", expected)
		}
	}
}
