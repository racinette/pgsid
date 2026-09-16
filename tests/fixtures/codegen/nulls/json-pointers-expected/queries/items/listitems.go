package items

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/pgsid"
	pgsidpgx "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
	public "example.com/pgsid-nulls/generated/schema/public"
)

const ListItemsSQL = "SELECT id, user_id, state, payload, maybe_payload, numbers, metadata, payload -> 'requiredNullable' AS nullable_value FROM public.items;"

type ListItemsParams struct {
}
type ListItemsRow struct {
	Id            int64                            `db:"id"`
	UserId        pgsid.Null[public.UserId]        `db:"user_id"`
	State         pgsid.Null[public.State]         `db:"state"`
	Payload       pgsid.Null[jsonschemas.Document] `db:"payload"`
	MaybePayload  jsonschemas.MaybeDocument        `db:"maybe_payload"`
	Numbers       pgsid.Null[[]pgsid.Null[int64]]  `db:"numbers"`
	Metadata      pgsid.Null[public.Profile]       `db:"metadata"`
	NullableValue pgsid.Null[*string]              `db:"nullable_value"`
}

func (q *Queries) ListItems(ctx context.Context) ([]ListItemsRow, error) {
	rows, err := q.db.Query(ctx, ListItemsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]ListItemsRow, 0)
	for rows.Next() {
		var row ListItemsRow
		if err := rows.Scan(pgsidpgx.ScanTargets(&row.Id, pgsidpgx.Nullable(&row.UserId), pgsidpgx.Nullable(&row.State), pgsidpgx.Nullable(&row.Payload), &row.MaybePayload, pgsidpgx.Nullable(&row.Numbers), pgsidpgx.Nullable(&row.Metadata), pgsidpgx.Nullable(&row.NullableValue))); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
