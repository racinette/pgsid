pub fn double_from_bits(bits: i64) -> f64 {
    f64::from_bits(bits as u64)
}

pub fn double_to_bits(value: f64) -> i64 {
    value.to_bits() as i64
}

pub fn single_from_bits(bits: i32) -> f64 {
    f32::from_bits(bits as u32) as f64
}

pub fn single_to_bits(value: f64) -> i32 {
    (value as f32).to_bits() as i32
}

pub fn double_roundtrip(bits: i64) -> i64 {
    f64::from_bits(bits as u64).to_bits() as i64
}

pub fn single_roundtrip(bits: i32) -> i32 {
    let widened = f32::from_bits(bits as u32) as f64;
    (widened as f32).to_bits() as i32
}

pub fn rounded_single_bits(bits: i64) -> i32 {
    let value = f64::from_bits(bits as u64);
    (value as f32).to_bits() as i32
}

pub fn widened_single_bits(bits: i32) -> i64 {
    let value = f32::from_bits(bits as u32) as f64;
    value.to_bits() as i64
}

pub fn double_sqrt_bits(bits: i64) -> i64 {
    let value = f64::from_bits(bits as u64);
    let root = value.sqrt();
    root.to_bits() as i64
}
