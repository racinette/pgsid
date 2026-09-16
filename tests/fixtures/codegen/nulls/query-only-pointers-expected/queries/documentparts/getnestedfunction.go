package documentparts

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/queries/jsonschemas"
)

const GetNestedFunctionSQL = "SELECT jsonb_extract_path(payload, 'nested') AS nested FROM public.items WHERE id = $1;"

type GetNestedFunctionParams struct {
	Id *int64 `db:"id"`
}
type GetNestedFunctionRow struct {
	Nested *jsonschemas.DocumentNested `db:"nested"`
}

func (q *Queries) GetNestedFunction(ctx context.Context, params GetNestedFunctionParams) (GetNestedFunctionRow, error) {
	var row GetNestedFunctionRow
	err := q.db.QueryRow(ctx, GetNestedFunctionSQL, params.Id).Scan(&row.Nested)
	return row, err
}
