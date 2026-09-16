package events

import (
	"context"
	jsonschemas "example.com/pgsid-fixture/generated/go/jsonschemas"
	public "example.com/pgsid-fixture/generated/go/schema/public"
	"time"
)

const GetEventSQL = "WITH selected AS (\n  SELECT id, account_id, payload, state, created_at\n  FROM public.events\n  WHERE id = $1\n)\nSELECT\n  selected.id,\n  selected.payload,\n  selected.payload -> 'actor' AS actor,\n  selected.state,\n  selected.created_at,\n  accounts.id AS joined_account_id,\n  accounts.display_name\nFROM selected\nLEFT JOIN public.accounts AS accounts ON accounts.id = selected.account_id;"

type GetEventParams struct {
	Id *int64 `db:"id"`
}
type GetEventRow struct {
	Id              public.EventId                 `db:"id"`
	Payload         jsonschemas.EventPayload       `db:"payload"`
	Actor           *jsonschemas.EventPayloadActor `db:"actor"`
	State           public.EventState              `db:"state"`
	CreatedAt       time.Time                      `db:"created_at"`
	JoinedAccountId *int64                         `db:"joined_account_id"`
	DisplayName     *string                        `db:"display_name"`
}

func (q *Queries) GetEvent(ctx context.Context, params GetEventParams) (GetEventRow, error) {
	var row GetEventRow
	err := q.db.QueryRow(ctx, GetEventSQL, params.Id).Scan(&row.Id, &row.Payload, &row.Actor, &row.State, &row.CreatedAt, &row.JoinedAccountId, &row.DisplayName)
	return row, err
}
