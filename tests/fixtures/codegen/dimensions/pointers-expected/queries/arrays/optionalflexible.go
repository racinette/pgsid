package arrays

import (
	"context"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	"github.com/jackc/pgx/v5/pgtype"
)

const OptionalFlexibleSQL = "SELECT optional_flexible FROM arrays;"

type OptionalFlexibleParams struct {
}
type OptionalFlexibleRow struct {
	OptionalFlexible *pgtype.Array[int32] `db:"optional_flexible"`
}

func (q *Queries) OptionalFlexible(ctx context.Context) (OptionalFlexibleRow, error) {
	var row OptionalFlexibleRow
	err := q.db.QueryRow(ctx, OptionalFlexibleSQL).Scan(pgsidpgx.ArrayTarget[int32](&row.OptionalFlexible, []int{1, 2}, "OptionalFlexible", "optional_flexible", true))
	return row, err
}
