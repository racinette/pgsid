package generated

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestConformance(t *testing.T) {
	input, err := os.ReadFile(os.Getenv("PGSID_REGEX_VECTOR_PATH"))
	if err != nil {
		t.Fatal(err)
	}
	var vectors struct {
		Search []struct {
			Pattern       string `json:"pattern"`
			Subject       string `json:"subject"`
			SubjectRepeat *struct {
				Text  string `json:"text"`
				Count int    `json:"count"`
			} `json:"subjectRepeat"`
			Expected struct {
				Kind  string `json:"kind"`
				Value struct {
					Start int `json:"start"`
					End   int `json:"end"`
				} `json:"value"`
			} `json:"expected"`
		} `json:"search"`
		Shift []struct {
			Input struct {
				Start int `json:"start"`
				End   int `json:"end"`
			} `json:"input"`
			Offset   int `json:"offset"`
			Expected struct {
				Start int `json:"start"`
				End   int `json:"end"`
			} `json:"expected"`
		} `json:"shift"`
	}
	if err := json.Unmarshal(input, &vectors); err != nil {
		t.Fatal(err)
	}
	for _, vector := range vectors.Search {
		subject := vector.Subject
		if vector.SubjectRepeat != nil {
			subject = strings.Repeat(vector.SubjectRepeat.Text, vector.SubjectRepeat.Count)
		}
		actual := literal_search(vector.Pattern, subject)
		switch vector.Expected.Kind {
		case "Found":
			if actual.kind != OutcomeFound || actual.found != (Span{start: vector.Expected.Value.Start, end: vector.Expected.Value.End}) {
				t.Errorf("literal_search(%q, %q) = %+v", vector.Pattern, subject, actual)
			}
		case "NoMatch":
			if actual.kind != OutcomeNoMatch {
				t.Errorf("literal_search(%q, %q) = %+v", vector.Pattern, subject, actual)
			}
		case "Uncertain":
			if actual.kind != OutcomeUncertain {
				t.Errorf("literal_search(%q, %q) = %+v", vector.Pattern, subject, actual)
			}
		default:
			t.Fatalf("unknown expected kind %q", vector.Expected.Kind)
		}
	}
	for _, vector := range vectors.Shift {
		input := Span{start: vector.Input.Start, end: vector.Input.End}
		actual := shift_span(input, vector.Offset)
		expected := Span{start: vector.Expected.Start, end: vector.Expected.End}
		if !same_span(actual, expected) || input != (Span{start: vector.Input.Start, end: vector.Input.End}) {
			t.Errorf("shift_span(%+v, %d) = %+v", input, vector.Offset, actual)
		}
	}
}
