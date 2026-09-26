package generated_test

import (
	generated "pgsid-regex-generated-smoke"
	"testing"
)

func TestExportedEngineSurface(t *testing.T) {
	result := generated.FindLiteral("a", "a", 0, true)
	if result.Kind != generated.MatchOutcomeFound || result.Found.Start != 0 || result.Found.End != 1 {
		t.Fatalf("unexpected exported match result: %+v", result)
	}
}
