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
	if !got.Payload.Valid || document(t, got.Payload.V).RequiredNullable.Valid || !got.NullableValue.Valid || document(t, got.NullableValue.V).Valid || document(t, got.MaybePayload).Valid || !got.Numbers.Valid || got.Numbers.V[1].Valid || !got.Metadata.Valid || got.Metadata.V.Label.Valid || !got.Metadata.V.Payload.Valid || got.Metadata.V.Payload.V.Text() != "null" {
		t.Fatalf("wrong decoded flags: %+v", got)
	}
	params := SetItemParams{Id: pgsid.Null[int64]{V: 1, Valid: true}, UserId: pgsid.Null[public.UserId]{V: 0, Valid: true}, State: got.State, Numbers: got.Numbers, Metadata: got.Metadata}
	if err := json.Unmarshal([]byte(`{"requiredValue":"next","requiredNullable":null,"optionalNullable":0,"nested":{"enabled":false},"values":[null,""],"members":[{"id":0,"profile":{"label":""}},null],"lookup":{"key":{"enabled":false}},"node":{"id":7,"next":{"id":8}}}`), &params.Payload); err != nil {
		t.Fatal(err)
	}
	if err := q.SetItem(ctx, params); err != nil {
		t.Fatal(err)
	}
	got, err = q.GetItem(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	payload := document(t, got.Payload.V)
	if !got.UserId.Valid || got.UserId.V != 0 || !payload.OptionalNullable.Valid || !payload.Nested.Enabled.Set || payload.Nested.Enabled.V || payload.Values[0].Valid || !payload.Values[1].Valid || got.Numbers.V[1].Valid || !got.Metadata.V.Payload.Valid {
		t.Fatalf("roundtrip changed states: %+v", got)
	}
	parts, err := documentparts.New(conn).GetParts(ctx, documentparts.GetPartsParams{Id: id.Id})
	if err != nil {
		t.Fatal(err)
	}
	if !parts.Nested.Valid || !parts.FirstMember.Valid || !document(t, parts.FirstMember.V).Valid || !parts.LastMember.Valid || document(t, parts.LastMember.V).Valid || !parts.Profile.Valid || !parts.LookupValue.Valid || !parts.Node.Valid || document(t, parts.Node.V).Next.V.Id.V != 8 {
		t.Fatalf("nested SQL states changed: %+v", parts)
	}
	// Each part read on its own has the type of its place in the document.
	payload.Nested = document(t, parts.Nested.V)
	payload.Members.V = document(t, parts.Members.V)
	payload.Members.V[0] = document(t, parts.FirstMember.V)
	payload.Members.V[0].V.Profile = document(t, parts.Profile.V)
	payload.Lookup.V["key"] = document(t, parts.LookupValue.V)
	payload.Node.V = document(t, parts.Node.V)
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
