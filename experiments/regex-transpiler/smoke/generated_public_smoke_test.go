package generated_test

import (
	generated "pgsid-regex-generated-smoke"
	"testing"
)

func TestExportedSmokeSurface(t *testing.T) {
	input := generated.Span{Start: 1, End: 3}
	result := generated.ShiftSpan(input, 2)
	if result.Start != 3 || result.End != 5 || input.Start != 1 {
		t.Fatalf("unexpected exported span result: %+v", result)
	}
	if generated.NamedPosition(generated.NamedSpan{FromPosition: 2}) != 2 {
		t.Fatal("exported field or function is unavailable")
	}
}
