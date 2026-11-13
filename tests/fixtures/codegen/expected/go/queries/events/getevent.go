package events

import (
	"context"
	jsonschemas "example.com/pgsid-fixture/generated/go/jsonschemas"
	pgsid "example.com/pgsid-fixture/generated/go/pgsid"
	public "example.com/pgsid-fixture/generated/go/schema/public"
)

const GetEventSQL = "WITH selected AS (\n  SELECT id, account_id, payload, state, created_at\n  FROM public.events\n  WHERE id = $1\n)\nSELECT\n  selected.id,\n  selected.payload,\n  selected.payload -> 'actor' AS actor,\n  selected.state,\n  selected.created_at,\n  accounts.id AS joined_account_id,\n  accounts.display_name\nFROM selected\nLEFT JOIN public.accounts AS accounts ON accounts.id = selected.account_id;"

type GetEventParams struct {
	Id *int64 `db:"id"`
}
type GetEventRow struct {
	Id        public.EventId                             `db:"id"`
	Payload   pgsid.JSON[jsonschemas.EventPayload]       `db:"payload"`
	Actor     *pgsid.JSON[jsonschemas.EventPayloadActor] `db:"actor"`
	State     public.EventState                          `db:"state"`
	CreatedAt pgsid.Timestamptz                          `db:"created_at"`
	Accounts  GetEventAccounts
}
type GetEventAccounts interface {
	isGetEventAccounts()
}
type GetEventAccountsAbsent struct {
}

func (GetEventAccountsAbsent) isGetEventAccounts() {
}

type GetEventAccountsPresent struct {
	JoinedAccountId int64
	DisplayName     string
}

func (GetEventAccountsPresent) isGetEventAccounts() {
}
func buildGetEventAccounts(column5 *int64, column6 *string) (GetEventAccounts, error) {
	if column5 == nil {
		return GetEventAccountsAbsent{}, nil
	}
	return GetEventAccountsPresent{JoinedAccountId: *column5, DisplayName: *column6}, nil
}
func (q *Queries) GetEvent(ctx context.Context, params GetEventParams) (GetEventRow, error) {
	var row GetEventRow
	var column5 *int64
	var column6 *string
	err := q.db.QueryRow(ctx, GetEventSQL, params.Id).Scan(&row.Id, &row.Payload, pgsid.NullableJSON(&row.Actor), &row.State, &row.CreatedAt, &column5, &column6)
	if err != nil {
		return row, err
	}
	if row.Accounts, err = buildGetEventAccounts(column5, column6); err != nil {
		return GetEventRow{}, err
	}
	return row, err
}
