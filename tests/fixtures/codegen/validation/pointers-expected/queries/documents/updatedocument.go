package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const UpdateDocumentSQL = "UPDATE documents SET payload = $1 RETURNING payload;"

type UpdateDocumentParams struct {
	Payload jsonschemas.Document `db:"payload"`
}
type UpdateDocumentRow struct {
	Payload jsonschemas.Document `db:"payload"`
}

func (q *Queries) UpdateDocument(ctx context.Context, params UpdateDocumentParams) (UpdateDocumentRow, error) {
	jsonInput1, err := pgsidpgx.ValidateJSONInput(params.Payload, "pgsid:///jsonschemas/Document.json#", "UpdateDocument", "payload", false)
	if err != nil {
		return UpdateDocumentRow{}, err
	}
	var row UpdateDocumentRow
	err = q.db.QueryRow(ctx, UpdateDocumentSQL, jsonInput1).Scan(pgsidpgx.ValidatedJSON(&row.Payload, "pgsid:///jsonschemas/Document.json#", "UpdateDocument", "payload", false))
	return row, err
}
