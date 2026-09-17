package documents

import (
	"context"
	jsonschemas "example.com/pgsid-validation/generated/jsonschemas"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetPrototypeSQL = "SELECT payload AS \"__proto__\" FROM documents;"

type GetPrototypeParams struct {
}
type GetPrototypeRow struct {
	Proto jsonschemas.Document `db:"__proto__"`
}

func (q *Queries) GetPrototype(ctx context.Context) (GetPrototypeRow, error) {
	var row GetPrototypeRow
	err := q.db.QueryRow(ctx, GetPrototypeSQL).Scan(pgsidpgx.ValidatedJSON(&row.Proto, "pgsid:///jsonschemas/Document.json#", "GetPrototype", "__proto__", false))
	return row, err
}
