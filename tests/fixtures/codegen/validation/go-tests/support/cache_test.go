package pgsidpgx

import (
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

func TestConcurrentCompilationUsesOneSchema(t *testing.T) {
	const spec = `{"resources":{},"columns":{"payload":{"type":"object"}}}`
	schemas := make(chan *jsonschema.Schema, 32)
	var group sync.WaitGroup
	for i := 0; i < 32; i++ {
		group.Add(1)
		go func() {
			defer group.Done()
			schema, err := compiledJSONSchema(spec, "payload")
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

func TestCompilationFailuresAreCachedWithoutLoadingFiles(t *testing.T) {
	path := filepath.Join(t.TempDir(), "schema.json")
	if err := os.WriteFile(path, []byte(`{"type":"object"}`), 0600); err != nil {
		t.Fatal(err)
	}
	data, err := json.Marshal(map[string]any{
		"resources": map[string]any{},
		"columns":   map[string]any{"payload": map[string]any{"$ref": (&url.URL{Scheme: "file", Path: path}).String()}},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, first := compiledJSONSchema(string(data), "payload")
	_, second := compiledJSONSchema(string(data), "payload")
	if first == nil || first != second {
		t.Fatalf("external file loaded or failed compilation was retried: %v %v", first, second)
	}
}
