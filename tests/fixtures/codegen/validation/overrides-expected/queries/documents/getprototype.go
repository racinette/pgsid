package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetPrototypeSQL = "SELECT payload AS \"__proto__\" FROM documents;"

type GetPrototypeParams struct {
}

const getPrototypeJSONValidation = "{\"resources\":{\"https://pgsid.invalid/jsonschemas/Document.json\":{\"$id\":\"https://example.com/documents.json\",\"type\":\"object\",\"required\":[\"id\",\"name\",\"flags\",\"node\",\"mode\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1,\"maximum\":9007199254740992},\"name\":{\"type\":\"string\",\"pattern\":\"^(?=.{3,}$)[a-z]+$\"},\"flags\":{\"type\":\"array\",\"items\":{\"type\":\"string\"},\"uniqueItems\":true,\"contains\":{\"const\":\"active\"}},\"node\":{\"$ref\":\"#/$defs/Node\"},\"mode\":{\"enum\":[\"a\",\"b\"],\"type\":\"string\"},\"extra\":{\"type\":\"string\"},\"count\":{\"type\":\"integer\",\"default\":7}},\"if\":{\"properties\":{\"mode\":{\"const\":\"a\"}}},\"then\":{\"required\":[\"extra\"]},\"additionalProperties\":false,\"$defs\":{\"Node\":{\"type\":\"object\",\"required\":[\"id\"],\"properties\":{\"id\":{\"type\":\"integer\",\"minimum\":1},\"next\":{\"$ref\":\"#/$defs/Node\"}},\"additionalProperties\":false}}}},\"columns\":{\"__proto__\":{\"$ref\":\"https://pgsid.invalid/jsonschemas/Document.json#\"}}}"

type GetPrototypeRow struct {
	Proto jsonschemas.Document `db:"__proto__"`
}

func (q *Queries) GetPrototype(ctx context.Context) (GetPrototypeRow, error) {
	var row GetPrototypeRow
	err := q.db.QueryRow(ctx, GetPrototypeSQL).Scan(pgsidpgx.ValidatedJSON(&row.Proto, getPrototypeJSONValidation, "GetPrototype", "__proto__", false))
	return row, err
}
