package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const ReturnManySQL = "UPDATE arrays SET flexible = $1 RETURNING flexible;"

type ReturnManyParams struct {
	Flexible pgtype.Array[pgsid.Null[int32]] `db:"flexible"`
}
type ReturnManyRow struct {
	Flexible pgtype.Array[pgsid.Null[int32]] `db:"flexible"`
}

func (q *Queries) ReturnMany(ctx context.Context, params ReturnManyParams) ([]ReturnManyRow, error) {
	arrayInput1, err := pgsidpgx.ValidateArrayInput[pgsid.Null[int32]](params.Flexible, []int{1, 2}, "ReturnMany", "flexible", false)
	if err != nil {
		return nil, err
	}
	rows, err := q.db.Query(ctx, ReturnManySQL, arrayInput1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]ReturnManyRow, 0)
	for rows.Next() {
		var row ReturnManyRow
		if err := rows.Scan(pgsidpgx.ScanTargets(pgsidpgx.ArrayTarget[pgsid.Null[int32]](&row.Flexible, []int{1, 2}, "ReturnMany", "flexible", false))); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
