package public

import pgsid "example.com/pgsid-validation/generated/pgsid"

type UserId int32
type Arrays struct {
	Id               int32                  `db:"id"`
	Ordinary         []int32                `db:"ordinary"`
	Matrix           [][]int32              `db:"matrix"`
	Cube             [][][]int32            `db:"cube"`
	Flexible         pgsid.Array1Or2[int32] `db:"flexible"`
	OptionalFlexible pgsid.Array1Or2[int32] `db:"optional_flexible"`
	Owners           [][]UserId             `db:"owners"`
}
type ArrayView struct {
	Matrix   [][]int32              `db:"matrix"`
	Flexible pgsid.Array1Or2[int32] `db:"flexible"`
}
