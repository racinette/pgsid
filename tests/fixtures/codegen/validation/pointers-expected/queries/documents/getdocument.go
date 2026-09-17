package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetDocumentSQL = "WITH selected AS (SELECT * FROM documents)\nSELECT payload, payload -> 'node' AS node, unchecked, forced, maybe, strict FROM selected;"

type GetDocumentParams struct {
}
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
	err := q.db.QueryRow(ctx, GetDocumentSQL).Scan(pgsidpgx.ValidatedJSON(&row.Payload, "pgsid:///jsonschemas/Document.json#", "GetDocument", "payload", false), pgsidpgx.ValidatedJSON(&row.Node, "pgsid:///jsonschemas/Document.json#/properties/node", "GetDocument", "node", false), &row.Unchecked, pgsidpgx.ValidatedJSON(&row.Forced, "pgsid:///jsonschemas/Document.json#", "GetDocument", "forced", false), pgsidpgx.ValidatedJSON(&row.Maybe, "pgsid:///jsonschemas/MaybeDocument.json#", "GetDocument", "maybe", false), pgsidpgx.ValidatedJSON(&row.Strict, "pgsid:///jsonschemas/Document.json#", "GetDocument", "strict", false))
	return row, err
}
