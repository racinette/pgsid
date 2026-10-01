const DATE_FIELD_OVERFLOW: u32 = 3452552;

pub fn date_from_ymd(year: i32, month: i32, day: i32) -> DateValue {
    if year == 0 || year == -2147483647 - 1 {
        return DateValue::Error(SqlError { state: DATE_FIELD_OVERFLOW });
    }
    let mut calendar_year: i32 = year;
    if year < 0 {
        calendar_year = year + 1;
    }
    if month < 1 || month > 12 || day < 1 || day > 31 {
        return DateValue::Error(SqlError { state: DATE_FIELD_OVERFLOW });
    }
    let mut month_days: i32 = 31;
    if month == 4 || month == 6 || month == 9 || month == 11 {
        month_days = 30;
    } else if month == 2 {
        month_days = 28;
        if calendar_year % 4 == 0 && (calendar_year % 100 != 0 || calendar_year % 400 == 0) {
            month_days = 29;
        }
    }
    if day > month_days || calendar_year < -4713 || calendar_year > 5874897 {
        return DateValue::Error(SqlError { state: DATE_FIELD_OVERFLOW });
    }
    let mut julian_year: i32 = calendar_year + 4799;
    let mut julian_month: i32 = month + 13;
    if month > 2 {
        julian_year = calendar_year + 4800;
        julian_month = month + 1;
    }
    let century = julian_year / 100;
    let base = julian_year * 365 - 32167;
    let leap_adjustment = julian_year / 4 - century + century / 4;
    let month_adjustment = 7834 * julian_month / 256 + day;
    let julian = base + leap_adjustment + month_adjustment;
    make_date_value(julian - 2451545)
}
