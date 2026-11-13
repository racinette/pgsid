package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const GetChoiceSQL = "SELECT CASE WHEN id > 0 THEN matrix ELSE ordinary END AS mixed FROM arrays;"

type GetChoiceParams struct {
}
type GetChoiceRow struct {
	Mixed pgsid.Array1Or2[pgsid.Null[int32]] `db:"mixed"`
}

func (q *Queries) GetChoice(ctx context.Context) (GetChoiceRow, error) {
	var row GetChoiceRow
	err := q.db.QueryRow(ctx, GetChoiceSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Mixed, []any{pgsid.D1[pgsid.Null[int32]](nil), pgsid.D2[pgsid.Null[int32]](nil)}, []int{1, 2}, "the array dimensions declared for its source columns", "GetChoice", "mixed", false)))
	return row, err
}
