package pgsid

type Array1Or2[T any] interface {
	array1Or2(T)
}

func (D1[T]) array1Or2(T) {
}
func (D2[T]) array1Or2(T) {
}
