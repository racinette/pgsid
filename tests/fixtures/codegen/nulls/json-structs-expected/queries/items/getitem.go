package items

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
	public "example.com/pgsid-nulls/generated/schema/public"
)

const GetItemSQL = "SELECT id, user_id, state, payload, maybe_payload, numbers, metadata, payload -> 'requiredNullable' AS nullable_value FROM public.items WHERE id = $1;"

type GetItemParams struct {
	Id *int64 `db:"id"`
}
type GetItemRow struct {
	Id            int64                     `db:"id"`
	UserId        *public.UserId            `db:"user_id"`
	State         *public.State             `db:"state"`
	Payload       *jsonschemas.Document     `db:"payload"`
	MaybePayload  jsonschemas.MaybeDocument `db:"maybe_payload"`
	Numbers       []int64                   `db:"numbers"`
	Metadata      *public.Profile           `db:"metadata"`
	NullableValue *pgsid.Null[string]       `db:"nullable_value"`
}

func (q *Queries) GetItem(ctx context.Context, params GetItemParams) (GetItemRow, error) {
	var row GetItemRow
	err := q.db.QueryRow(ctx, GetItemSQL, params.Id).Scan(&row.Id, &row.UserId, &row.State, &row.Payload, &row.MaybePayload, &row.Numbers, &row.Metadata, &row.NullableValue)
	return row, err
}
