package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetNodeSQL = "SELECT payload -> 'node' AS node FROM documents;"

type GetNodeParams struct {
}
type GetNodeRow struct {
	Node *jsonschemas.DocumentNode `db:"node"`
}

func (q *Queries) GetNode(ctx context.Context) (GetNodeRow, error) {
	var row GetNodeRow
	err := q.db.QueryRow(ctx, GetNodeSQL).Scan(pgsidpgx.ValidatedJSON(&row.Node, "pgsid:///jsonschemas/Document.json#/properties/node", "GetNode", "node", false))
	return row, err
}
