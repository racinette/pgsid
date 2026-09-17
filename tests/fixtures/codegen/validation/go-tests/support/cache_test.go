package pgsidvalidation

import (
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

func TestConcurrentCompilationUsesOneSchema(t *testing.T) {
	const contract = `{"type":"object"}`
	schemas := make(chan *jsonschema.Schema, 32)
	var group sync.WaitGroup
	for i := 0; i < 32; i++ {
		group.Add(1)
		go func() {
			defer group.Done()
			schema, err := compiledJSONSchema(contract)
			if err != nil {
				t.Error(err)
			}
			schemas <- schema
		}()
	}
	group.Wait()
	close(schemas)
	var first *jsonschema.Schema
	for schema := range schemas {
		if schema == nil {
			t.Fatal("compiled schema is nil")
		}
		if first == nil {
			first = schema
		} else if schema != first {
			t.Fatal("schema compiled more than once")
		}
	}
}

func TestStandaloneInputsAndOutputsShareSchema(t *testing.T) {
	const contract = "pgsid:///jsonschemas/MaybeDocument.json#"
	data := []byte(`{"value":2}`)
	if err := ValidateJSON(data, contract); err != nil {
		t.Fatal(err)
	}
	if err := ValidateValue(map[string]any{"value": 2}, contract); err != nil {
		t.Fatal(err)
	}
	before, err := compiledJSONSchema(contract)
	if err != nil {
		t.Fatal(err)
	}
	cacheSize := func() int {
		count := 0
		validationSchemas.compiled.Range(func(_, _ any) bool {
			count++
			return true
		})
		return count
	}
	beforeCount := cacheSize()
	for _, query := range []string{"InsertDocument", "UpdateDocument", "OtherQuery"} {
		for _, column := range []string{"payload", "document", "other"} {
			if _, err := ValidateJSONInput(json.RawMessage(data), contract, query, column, false); err != nil {
				t.Fatal(err)
			}
			var destination map[string]any
			if err := ValidatedJSON(&destination, contract, query, column, false).(*validatedJSON).Scan(data); err != nil {
				t.Fatal(err)
			}
		}
	}
	after, err := compiledJSONSchema(contract)
	if err != nil || before != after {
		t.Fatalf("different callers recompiled the schema: %v", err)
	}
	if count := cacheSize(); count != beforeCount {
		t.Fatalf("callers added separate cache entries: %d -> %d", beforeCount, count)
	}
}

func TestProjectionsAndCombinedContractsShareCompiledNodes(t *testing.T) {
	registry := newSchemaRegistry(`{"pgsid:///jsonschemas/Event.json":{"type":"object","properties":{"actor":{"type":"integer","minimum":1}}}}`)
	const rootURI = "pgsid:///jsonschemas/Event.json#"
	const projectionURI = "pgsid:///jsonschemas/Event.json#/properties/actor"
	const combined = `{"allOf":[{"$ref":"pgsid:///jsonschemas/Event.json#"},{"type":"object"}]}`
	var group sync.WaitGroup
	for i := 0; i < 32; i++ {
		group.Add(1)
		go func(i int) {
			defer group.Done()
			contract := []string{rootURI, projectionURI, combined}[i%3]
			schema, err := registry.compile(contract)
			if err != nil {
				t.Error(err)
				return
			}
			var value any = map[string]any{"actor": json.Number("2")}
			if contract == projectionURI {
				value = json.Number("2")
			}
			if err := schema.Validate(value); err != nil {
				t.Error(err)
			}
		}(i)
	}
	group.Wait()
	root, _ := registry.compile(rootURI)
	projection, _ := registry.compile(projectionURI)
	allOf, _ := registry.compile(combined)
	if root == nil || projection == nil || allOf == nil {
		t.Fatal("concurrent compilation did not produce schemas")
	}
	if root.Properties["actor"] != projection || allOf.AllOf[0].Ref != root {
		t.Fatal("projection or combined contract recompiled a shared node")
	}
}

func TestCompilationFailuresAreCachedWithoutLoadingFiles(t *testing.T) {
	path := filepath.Join(t.TempDir(), "schema.json")
	if err := os.WriteFile(path, []byte(`{"type":"object"}`), 0600); err != nil {
		t.Fatal(err)
	}
	contract := (&url.URL{Scheme: "file", Path: path}).String()
	_, first := compiledJSONSchema(contract)
	_, second := compiledJSONSchema(contract)
	if first == nil || first != second {
		t.Fatalf("external file loaded or failed compilation was retried: %v %v", first, second)
	}
	for _, contract := range []string{`{"type":7}`, `{"type":`} {
		_, first := compiledJSONSchema(contract)
		_, second := compiledJSONSchema(contract)
		if first == nil || first != second {
			t.Fatalf("schema error not cached: %v %v", first, second)
		}
	}
}

func TestEmbeddedResourcesUsePGSIDIdentifiers(t *testing.T) {
	registry := newSchemaRegistry(`{"pgsid:///jsonschemas/Event.json":{"type":"object","required":["actor"],"properties":{"actor":{"$ref":"Actor.json"},"next":{"$ref":"#"}}},"pgsid:///jsonschemas/Actor.json":{"$id":"Actor.json","type":"integer","minimum":1}}`)
	schema, err := registry.compile("pgsid:///jsonschemas/Event.json#")
	if err != nil {
		t.Fatal(err)
	}
	valid, err := jsonschema.UnmarshalJSON(strings.NewReader(`{"actor":1,"next":{"actor":2}}`))
	if err != nil {
		t.Fatal(err)
	}
	if err := schema.Validate(valid); err != nil {
		t.Fatal(err)
	}
	for _, data := range []string{`{"actor":0}`, `{"actor":1,"next":{"actor":"invalid"}}`} {
		value, err := jsonschema.UnmarshalJSON(strings.NewReader(data))
		if err != nil {
			t.Fatal(err)
		}
		if err := schema.Validate(value); err == nil {
			t.Fatalf("accepted invalid JSON: %s", data)
		}
	}
}

func TestBooleanResourcesPreserveIdentityAndBehavior(t *testing.T) {
	registry := newSchemaRegistry(`{"pgsid:///jsonschemas/Yes.json":true,"pgsid:///jsonschemas/No.json":false}`)
	for _, name := range []string{"Yes", "No"} {
		contract := "pgsid:///jsonschemas/" + name + ".json#"
		schema, err := registry.compile(contract)
		if err != nil {
			t.Fatal(err)
		}
		again, err := registry.compile(contract)
		if err != nil || schema != again {
			t.Fatalf("boolean schema recompiled: %v", err)
		}
		if err := schema.Validate(nil); (err == nil) != (name == "Yes") {
			t.Fatalf("boolean schema behavior changed: %s %v", name, err)
		}
	}
}
