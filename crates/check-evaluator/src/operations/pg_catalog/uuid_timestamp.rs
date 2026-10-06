pub fn sql__pg_catalog__uuid_extract_timestamp__p52j(input: UuidValue) -> TimestamptzValue {
    if let UuidValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    }
    if input == UuidValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if input == UuidValue::Null {
        return TimestamptzValue::Null;
    }
    if let UuidValue::Value(value) = input {
        if value.word4 / 16384 != 2 {
            return TimestamptzValue::Null;
        }
        let version = value.word3 / 4096;
        let word0 = value.word0 as i64;
        let word1 = value.word1 as i64;
        let word2 = value.word2 as i64;
        if version == 1 {
            let high = value.word3 % 4096;
            let word3 = high as i64;
            let ticks =
                word3 * 281474976710656i64 + word2 * 4294967296i64 + word0 * 65536i64 + word1;
            let microseconds = ticks / 10i64 - 13165977600000000i64;
            return TimestamptzValue::Value(microseconds);
        }
        if version == 7 {
            let milliseconds = word0 * 4294967296i64 + word1 * 65536i64 + word2;
            let microseconds = milliseconds * 1000i64 - 946684800000000i64;
            return TimestamptzValue::Value(microseconds);
        }
        return TimestamptzValue::Null;
    }
    TimestamptzValue::Unknown
}
