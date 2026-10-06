fn address_and_word(left: i32, right: i32) -> i32 {
    let mut a = left;
    let mut b = right;
    let mut place: i32 = 1;
    let mut result: i32 = 0;
    while place < 65536 {
        if a % 2 == 1 && b % 2 == 1 {
            result = result + place;
        }
        a = a / 2;
        b = b / 2;
        place = place * 2;
    }
    result
}
