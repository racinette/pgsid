package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetNodeSQL = "SELECT payload -> 'node' AS node FROM documents;"

type GetNodeParams struct {
}

const getNodeJSONValidation = "{\"resources\":{\"https://pgsid.invalid/jsonschemas/Document.json\":{\"$id\":\"https://example.com/documents.json\",\"type\":\"object\",\"required\":[\"id\",\"name\",\"flags\",\"node\",\"mode\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1,\"maximum\":9007199254740992},\"name\":{\"type\":\"string\",\"pattern\":\"^(?=.{3,}$)[a-z]+$\"},\"flags\":{\"type\":\"array\",\"items\":{\"type\":\"string\"},\"uniqueItems\":true,\"contains\":{\"const\":\"active\"}},\"node\":{\"$ref\":\"#/$defs/Node\"},\"mode\":{\"enum\":[\"a\",\"b\"],\"type\":\"string\"},\"extra\":{\"type\":\"string\"},\"count\":{\"type\":\"integer\",\"default\":7}},\"if\":{\"properties\":{\"mode\":{\"const\":\"a\"}}},\"then\":{\"required\":[\"extra\"]},\"additionalProperties\":false,\"$defs\":{\"Node\":{\"type\":\"object\",\"required\":[\"id\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1},\"next\":{\"$ref\":\"#/$defs/Node\"}},\"additionalProperties\":false}}}},\"columns\":{\"node\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/Document.json#/properties/node\"}}}"

type GetNodeRow struct {
	Node pgsid.Null[jsonschemas.DocumentNode] `db:"node"`
}

func (q *Queries) GetNode(ctx context.Context) (GetNodeRow, error) {
	var row GetNodeRow
	err := q.db.QueryRow(ctx, GetNodeSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Node, getNodeJSONValidation, "GetNode", "node", true)))
	return row, err
}
