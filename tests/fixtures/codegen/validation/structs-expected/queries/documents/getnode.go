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
type GetNodeRow struct {
	Node pgsid.Null[jsonschemas.DocumentNode] `db:"node"`
}

func (q *Queries) GetNode(ctx context.Context) (GetNodeRow, error) {
	var row GetNodeRow
	err := q.db.QueryRow(ctx, GetNodeSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.ValidatedJSON(&row.Node, "pgsid:///jsonschemas/Document.json#/properties/node", "GetNode", "node", true)))
	return row, err
}
