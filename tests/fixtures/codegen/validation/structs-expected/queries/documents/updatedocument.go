package documents

import (
	"context"
	"encoding/json"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const UpdateDocumentSQL = "UPDATE documents SET payload = $1 RETURNING payload;"

type UpdateDocumentParams struct {
	Payload json.RawMessage `db:"payload"`
}

const updateDocumentJSONValidation = "{\"resources\":{\"https://pgsid.invalid/jsonschemas/Document.json\":{\"$id\":\"https://example.com/documents.json\",\"type\":\"object\",\"required\":[\"id\",\"name\",\"flags\",\"node\",\"mode\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1,\"maximum\":9007199254740992},\"name\":{\"type\":\"string\",\"pattern\":\"^(?=.{3,}$)[a-z]+$\"},\"flags\":{\"type\":\"array\",\"items\":{\"type\":\"string\"},\"uniqueItems\":true,\"contains\":{\"const\":\"active\"}},\"node\":{\"$ref\":\"#/$defs/Node\"},\"mode\":{\"enum\":[\"a\",\"b\"],\"type\":\"string\"},\"extra\":{\"type\":\"string\"},\"count\":{\"type\":\"integer\",\"default\":7}},\"if\":{\"properties\":{\"mode\":{\"const\":\"a\"}}},\"then\":{\"required\":[\"extra\"]},\"additionalProperties\":false,\"$defs\":{\"Node\":{\"type\":\"object\",\"required\":[\"id\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1},\"next\":{\"$ref\":\"#/$defs/Node\"}},\"additionalProperties\":false}}}},\"columns\":{\"payload\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/Document.json#\"}}}"

type UpdateDocumentRow struct {
	Payload jsonschemas.Document `db:"payload"`
}

func (q *Queries) UpdateDocument(ctx context.Context, params UpdateDocumentParams) (UpdateDocumentRow, error) {
	var row UpdateDocumentRow
	err := q.db.QueryRow(ctx, UpdateDocumentSQL, params.Payload).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Payload, updateDocumentJSONValidation, "UpdateDocument", "payload", false)))
	return row, err
}
