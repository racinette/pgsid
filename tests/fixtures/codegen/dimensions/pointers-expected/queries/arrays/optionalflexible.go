package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
)

const OptionalFlexibleSQL = "SELECT optional_flexible FROM arrays;"

type OptionalFlexibleParams struct {
}
type OptionalFlexibleRow struct {
	OptionalFlexible pgsid.Array1Or2[int32] `db:"optional_flexible"`
}

func (q *Queries) OptionalFlexible(ctx context.Context) (OptionalFlexibleRow, error) {
	var row OptionalFlexibleRow
	err := q.db.QueryRow(ctx, OptionalFlexibleSQL).Scan(pgsidpgx.ArrayTarget[int32](&row.OptionalFlexible, []any{pgsid.D1[int32](nil), pgsid.D2[int32](nil)}, []int{1, 2}, "sql.codegen.go.mappings.column[\"public.arrays.optional_flexible\"].dimensions", "OptionalFlexible", "optional_flexible", true))
	return row, err
}
