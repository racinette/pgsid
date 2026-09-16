package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetDocumentSQL = "WITH selected AS (SELECT * FROM documents)\nSELECT payload, payload -> 'node' AS node, unchecked, forced, maybe, strict FROM selected;"

type GetDocumentParams struct {
}

const getDocumentJSONValidation = "{\"resources\":{\"https://pgsid.invalid/jsonschemas/Document.json\":{\"$id\":\"https://example.com/documents.json\",\"type\":\"object\",\"required\":[\"id\",\"name\",\"flags\",\"node\",\"mode\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1,\"maximum\":9007199254740992},\"name\":{\"type\":\"string\",\"pattern\":\"^(?=.{3,}$)[a-z]+$\"},\"flags\":{\"type\":\"array\",\"items\":{\"type\":\"string\"},\"uniqueItems\":true,\"contains\":{\"const\":\"active\"}},\"node\":{\"$ref\":\"#/$defs/Node\"},\"mode\":{\"enum\":[\"a\",\"b\"],\"type\":\"string\"},\"extra\":{\"type\":\"string\"},\"count\":{\"type\":\"integer\",\"default\":7}},\"if\":{\"properties\":{\"mode\":{\"const\":\"a\"}}},\"then\":{\"required\":[\"extra\"]},\"additionalProperties\":false,\"$defs\":{\"Node\":{\"type\":\"object\",\"required\":[\"id\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1},\"next\":{\"$ref\":\"#/$defs/Node\"}},\"additionalProperties\":false}}},\"https://pgsid.invalid/jsonschemas/MaybeDocument.json\":{\"type\":[\"object\",\"null\"],\"properties\":{\"value\":{\"type\":\"integer\"}},\"additionalProperties\":false}},\"columns\":{\"payload\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/Document.json#\"},\"node\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/Document.json#/properties/node\"},\"forced\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/Document.json#\"},\"maybe\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/MaybeDocument.json#\"},\"strict\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/Document.json#\"}}}"

type GetDocumentRow struct {
	Payload   jsonschemas.Document       `db:"payload"`
	Node      *jsonschemas.DocumentNode  `db:"node"`
	Unchecked jsonschemas.Document       `db:"unchecked"`
	Forced    jsonschemas.Document       `db:"forced"`
	Maybe     *jsonschemas.MaybeDocument `db:"maybe"`
	Strict    *jsonschemas.Document      `db:"strict"`
}

func (q *Queries) GetDocument(ctx context.Context) (GetDocumentRow, error) {
	var row GetDocumentRow
	err := q.db.QueryRow(ctx, GetDocumentSQL).Scan(pgsidpgx.ValidatedJSON(&row.Payload, getDocumentJSONValidation, "GetDocument", "payload", false), pgsidpgx.ValidatedJSON(&row.Node, getDocumentJSONValidation, "GetDocument", "node", false), &row.Unchecked, pgsidpgx.ValidatedJSON(&row.Forced, getDocumentJSONValidation, "GetDocument", "forced", false), pgsidpgx.ValidatedJSON(&row.Maybe, getDocumentJSONValidation, "GetDocument", "maybe", false), pgsidpgx.ValidatedJSON(&row.Strict, getDocumentJSONValidation, "GetDocument", "strict", false))
	return row, err
}
