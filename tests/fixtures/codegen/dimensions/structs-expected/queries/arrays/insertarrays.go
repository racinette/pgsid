package arrays

import (
	"context"
	pgsid "example.com/pgsid-validation/generated/pgsid"
	pgsidpgx "example.com/pgsid-validation/generated/queries/pgsid/pgx"
	public "example.com/pgsid-validation/generated/schema/public"
	"github.com/jackc/pgx/v5/pgtype"
)

const InsertArraysSQL = "INSERT INTO arrays (id, ordinary, matrix, flexible, owners)\nVALUES ($1, $2, $3, $4, $5);"

type InsertArraysParams struct {
	Id       int32                           `db:"id"`
	Ordinary []pgsid.Null[int32]             `db:"ordinary"`
	Matrix   [][]pgsid.Null[int32]           `db:"matrix"`
	Flexible pgtype.Array[pgsid.Null[int32]] `db:"flexible"`
	Owners   [][]pgsid.Null[public.UserId]   `db:"owners"`
}

func (q *Queries) InsertArrays(ctx context.Context, params InsertArraysParams) error {
	arrayInput4, err := pgsidpgx.ValidateArrayInput[pgsid.Null[int32]](params.Flexible, []int{1, 2}, "InsertArrays", "flexible", false)
	if err != nil {
		return err
	}
	_, err = q.db.Exec(ctx, InsertArraysSQL, params.Id, params.Ordinary, params.Matrix, arrayInput4, params.Owners)
	return err
}
