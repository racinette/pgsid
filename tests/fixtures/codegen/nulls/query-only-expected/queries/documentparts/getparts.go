package documentparts

import (
	"context"
	jsonschemas "example.com/pgsid-nulls/generated/queries/jsonschemas"
	pgsid "example.com/pgsid-nulls/generated/queries/pgsid"
	pgsidpgx "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
)

const GetPartsSQL = "WITH selected AS (\n  SELECT payload FROM public.items WHERE id = $1\n)\nSELECT\n  payload -> 'nested' AS nested,\n  payload -> 'members' AS members,\n  payload -> 'members' -> 0 AS first_member,\n  payload -> 'members' -> -1 AS last_member,\n  payload -> 'members' -> 0 -> 'profile' AS profile,\n  payload -> 'lookup' -> 'key' AS lookup_value,\n  payload -> 'node' AS node\nFROM selected;"

type GetPartsParams struct {
	Id pgsid.Null[int64] `db:"id"`
}
type GetPartsRow struct {
	Nested      pgsid.Null[jsonschemas.DocumentNested]                    `db:"nested"`
	Members     pgsid.Null[[]pgsid.Null[jsonschemas.DocumentMembersItem]] `db:"members"`
	FirstMember pgsid.Null[pgsid.Null[jsonschemas.DocumentMembersItem]]   `db:"first_member"`
	LastMember  pgsid.Null[pgsid.Null[jsonschemas.DocumentMembersItem]]   `db:"last_member"`
	Profile     pgsid.Null[jsonschemas.DocumentMembersItemProfile]        `db:"profile"`
	LookupValue pgsid.Null[jsonschemas.DocumentLookupValue]               `db:"lookup_value"`
	Node        pgsid.Null[jsonschemas.DocumentNode]                      `db:"node"`
}

func (q *Queries) GetParts(ctx context.Context, params GetPartsParams) (GetPartsRow, error) {
	var row GetPartsRow
	err := q.db.QueryRow(ctx, GetPartsSQL, pgsidpgx.Value(params.Id)).Scan(pgsidpgx.ScanTargets(pgsidpgx.Nullable(&row.Nested), pgsidpgx.Nullable(&row.Members), pgsidpgx.Nullable(&row.FirstMember), pgsidpgx.Nullable(&row.LastMember), pgsidpgx.Nullable(&row.Profile), pgsidpgx.Nullable(&row.LookupValue), pgsidpgx.Nullable(&row.Node)))
	return row, err
}
