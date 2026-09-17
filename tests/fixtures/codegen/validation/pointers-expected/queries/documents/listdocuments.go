package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const ListDocumentsSQL = "SELECT payload FROM documents;"

type ListDocumentsParams struct {
}
type ListDocumentsRow struct {
	Payload jsonschemas.Document `db:"payload"`
}

func (q *Queries) ListDocuments(ctx context.Context) ([]ListDocumentsRow, error) {
	rows, err := q.db.Query(ctx, ListDocumentsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]ListDocumentsRow, 0)
	for rows.Next() {
		var row ListDocumentsRow
		if err := rows.Scan(pgsidpgx.ValidatedJSON(&row.Payload, "pgsid:///jsonschemas/Document.json#", "ListDocuments", "payload", false)); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
