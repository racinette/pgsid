package items

import (
	"context"
	"encoding/json"
	"example.com/pgsid-nulls/generated/pgsid"
	"example.com/pgsid-nulls/generated/queries/documentparts"
	support "example.com/pgsid-nulls/generated/queries/pgsid/pgx"
	"example.com/pgsid-nulls/generated/schema/public"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"testing"
)

func TestPostgresNullRoundTrips(t *testing.T) {
	dsn := os.Getenv("PGSID_GO_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("PGSID_GO_TEST_DATABASE_URL is unset")
	}
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	if err := support.RegisterTypes(ctx, conn); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(ctx, `TRUNCATE public.items; INSERT INTO public.items (id,user_id,state,payload,maybe_payload,numbers,metadata) VALUES (1,7,'ready','{"requiredValue":"ok","requiredNullable":null,"nested":{},"values":[]}', 'null', ARRAY[1,NULL,0],ROW(7,NULL,'null'::jsonb)::public.profile)`); err != nil {
		t.Fatal(err)
	}
	q := New(conn)
	id := GetItemParams{Id: pgsid.Null[int64]{V: 1, Valid: true}}
	got, err := q.GetItem(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Payload.Valid || got.Payload.V.RequiredNullable.Valid || !got.NullableValue.Valid || got.NullableValue.V.Valid || got.MaybePayload.Valid || !got.Numbers.Valid || got.Numbers.V[1].Valid || !got.Metadata.Valid || got.Metadata.V.Label.Valid || !got.Metadata.V.Payload.Valid || string(got.Metadata.V.Payload.V) != "null" {
		t.Fatalf("wrong decoded flags: %+v", got)
	}
	params := SetItemParams{Id: pgsid.Null[int64]{V: 1, Valid: true}, UserId: pgsid.Null[public.UserId]{V: 0, Valid: true}, State: got.State, Numbers: got.Numbers, Metadata: got.Metadata}
	params.Payload = pgsid.Null[json.RawMessage]{Valid: true, V: json.RawMessage(`{"requiredValue":"next","requiredNullable":null,"optionalNullable":0,"nested":{"enabled":false},"values":[null,""],"members":[{"id":0,"profile":{"label":""}},null],"lookup":{"key":{"enabled":false}},"node":{"id":7,"next":{"id":8}}}`)}
	if err := q.SetItem(ctx, params); err != nil {
		t.Fatal(err)
	}
	got, err = q.GetItem(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if !got.UserId.Valid || got.UserId.V != 0 || !got.Payload.V.OptionalNullable.Valid || !got.Payload.V.Nested.Enabled.Set || got.Payload.V.Nested.Enabled.V || got.Payload.V.Values[0].Valid || !got.Payload.V.Values[1].Valid || got.Numbers.V[1].Valid || !got.Metadata.V.Payload.Valid {
		t.Fatalf("roundtrip changed states: %+v", got)
	}
	parts, err := documentparts.New(conn).GetParts(ctx, documentparts.GetPartsParams{Id: id.Id})
	if err != nil {
		t.Fatal(err)
	}
	if !parts.Nested.Valid || !parts.FirstMember.Valid || !parts.FirstMember.V.Valid || !parts.LastMember.Valid || parts.LastMember.V.Valid || !parts.Profile.Valid || !parts.LookupValue.Valid || !parts.Node.Valid || parts.Node.V.Next.V.Id.V != 8 {
		t.Fatalf("nested SQL states changed: %+v", parts)
	}
	got.Payload.V.Nested = parts.Nested.V
	got.Payload.V.Members.V = parts.Members.V
	got.Payload.V.Members.V[0] = parts.FirstMember.V
	got.Payload.V.Members.V[0].V.Profile = parts.Profile.V
	got.Payload.V.Lookup.V["key"] = parts.LookupValue.V
	got.Payload.V.Node.V = parts.Node.V
	params.UserId.Valid = false
	params.State.Valid = false
	params.Payload.Valid = false
	params.Numbers.Valid = false
	params.Metadata.Valid = false
	if err := q.SetItem(ctx, params); err != nil {
		t.Fatal(err)
	}
	got, err = q.GetItem(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if got.UserId.Valid || got.State.Valid || got.Payload.Valid || got.NullableValue.Valid || got.Numbers.Valid || got.Metadata.Valid {
		t.Fatalf("SQL NULL lost: %+v", got)
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.AfterConnect = support.RegisterTypes
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err := New(pool).GetItem(ctx, id); err != nil {
		t.Fatal(err)
	}
	tx, err := conn.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err := New(tx).SetItem(ctx, params); err != nil {
		t.Fatal(err)
	}
	if err := tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
}
