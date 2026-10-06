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

func TestSplitModuleReferencesPreserveShadowedLocals(t *testing.T) {
	indexType := &node{Kind: "path", Segments: []string{"usize"}}
	scalarType := &node{Kind: "path", Segments: []string{"Scalar"}}
	integer := func(value string) *node { return &node{Kind: "integer", Digits: value} }
	document := document{SchemaVersion: 1, Items: []*node{
		{Kind: "struct", Module: "checkruntime", Visibility: "public", Name: "Scalar", Fields: []field{{Name: "value", Visibility: "public", Type: indexType}}},
		{Kind: "function", Module: "regex_engine", Visibility: "public", Name: "count", ReturnType: indexType, Body: []*node{
			{Kind: "expression", Value: integer("9")},
		}},
		{Kind: "function", Module: "pg_catalog", Visibility: "public", Name: "read_count", Parameters: []parameter{{Name: "input", Type: scalarType}}, ReturnType: indexType, Body: []*node{
			{Kind: "local", Binding: binding{Name: "count"}, Type: indexType, Initializer: integer("2")},
			{Kind: "expression", Value: &node{Kind: "path", Segments: []string{"count"}}},
		}},
		{Kind: "function", Module: "pg_catalog", Visibility: "public", Name: "call_count", ReturnType: indexType, Body: []*node{
			{Kind: "expression", Value: &node{Kind: "call", Callee: &node{Kind: "path", Segments: []string{"count"}}}},
		}},
	}}
	input, err := json.Marshal(document)
	if err != nil {
		t.Fatal(err)
	}
	output, err := TranspileWithOptions(input, Options{Split: true, SchemaImportPath: "splitchecks/pg_catalog"})
	if err != nil {
		t.Fatal(err)
	}
	var files map[string]string
	if err := json.Unmarshal(output, &files); err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{"count := 2", "return count", "return regexengine.Count()", "func ReadCount(input checkruntime.Scalar) int"} {
		if !strings.Contains(files["operations"], expected) {
			t.Errorf("generated Go is missing %q", expected)
		}
	}
	if strings.Contains(files["operations"], "regexengine.Count :=") {
		t.Fatal("local binding was qualified as a module reference")
	}
}
