package documentparts

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
	pgsidpgx "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
)

const GetNestedFunctionSQL = "SELECT jsonb_extract_path(payload, 'nested') AS nested FROM public.items WHERE id = $1;"

type GetNestedFunctionParams struct {
	Id pgsid.Null[int64] `db:"id"`
}
type GetNestedFunctionRow struct {
	Nested pgsid.Null[jsonschemas.DocumentNested] `db:"nested"`
}

func (q *Queries) GetNestedFunction(ctx context.Context, params GetNestedFunctionParams) (GetNestedFunctionRow, error) {
	var row GetNestedFunctionRow
	err := q.db.QueryRow(ctx, GetNestedFunctionSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(pgsidpgx.Nullable(&row.Nested)))
	return row, err
}
