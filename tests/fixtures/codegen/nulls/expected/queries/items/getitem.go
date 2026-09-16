package items

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
	pgsidpgx "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
	public "example.com/pgsid-nulls/generated/schema/public"
)

const GetItemSQL = "SELECT id, user_id, state, payload, maybe_payload, numbers, metadata, payload -> 'requiredNullable' AS nullable_value FROM public.items WHERE id = $1;"

type GetItemParams struct {
	Id pgsid.Null[int64] `db:"id"`
}
type GetItemRow struct {
	Id            int64                            `db:"id"`
	UserId        pgsid.Null[public.UserId]        `db:"user_id"`
	State         pgsid.Null[public.State]         `db:"state"`
	Payload       pgsid.Null[jsonschemas.Document] `db:"payload"`
	MaybePayload  jsonschemas.MaybeDocument        `db:"maybe_payload"`
	Numbers       pgsid.Null[[]pgsid.Null[int64]]  `db:"numbers"`
	Metadata      pgsid.Null[public.Profile]       `db:"metadata"`
	NullableValue pgsid.Null[pgsid.Null[string]]   `db:"nullable_value"`
}

func (q *Queries) GetItem(ctx context.Context, params GetItemParams) (GetItemRow, error) {
	var row GetItemRow
	err := q.db.QueryRow(ctx, GetItemSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(&row.Id, pgsidpgx.Nullable(&row.UserId), pgsidpgx.Nullable(&row.State), pgsidpgx.Nullable(&row.Payload), &row.MaybePayload, pgsidpgx.Nullable(&row.Numbers), pgsidpgx.Nullable(&row.Metadata), pgsidpgx.Nullable(&row.NullableValue)))
	return row, err
}
