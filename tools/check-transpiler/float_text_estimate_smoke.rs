pub fn parsed(value: &str) -> f64 {
    value.parse::<f64>().unwrap_or(-17.0f64)
}
pub fn exp_scale_hint(value: &str, display: i32) -> i32 {
    let parsed = value.parse::<f64>().unwrap_or(0.0f64);
    let mut estimate = parsed * 0.434294481903252f64;
    if estimate < -2000.0f64 {
        estimate = -2000.0f64;
    }
    if estimate > 2000.0f64 {
        estimate = 2000.0f64;
    }
    let weight = estimate as i32;
    let mut scale: i32 = 16 - weight;
    if scale < display {
        scale = display;
    }
    if scale < 0 {
        scale = 0;
    }
    if scale > 1000 {
        scale = 1000;
    }
    scale
}
