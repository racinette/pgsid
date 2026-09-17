package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const GetChoiceSQL = "SELECT CASE WHEN id > 0 THEN matrix ELSE ordinary END AS mixed FROM arrays;"

type GetChoiceParams struct {
}
type GetChoiceRow struct {
	Mixed pgtype.Array[pgsid.Null[int32]] `db:"mixed"`
}

func (q *Queries) GetChoice(ctx context.Context) (GetChoiceRow, error) {
	var row GetChoiceRow
	err := q.db.QueryRow(ctx, GetChoiceSQL).Scan(pgsidpgx.ScanTargets(pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Mixed, []int{1, 2}, "GetChoice", "mixed", false)))
	return row, err
}
