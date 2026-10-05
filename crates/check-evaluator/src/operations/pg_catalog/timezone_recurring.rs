struct ZoneRuleText {
    chars: Vec<char>,
}

struct ZoneRuleNumber {
    next: usize,
    value: i32,
    valid: bool,
}

#[derive(Clone, Copy)]
struct ZoneDateRule {
    kind: i32,
    month: i32,
    week: i32,
    day: i32,
    seconds: i32,
}

struct ZoneRuleRead {
    next: usize,
    rule: ZoneDateRule,
    valid: bool,
}

struct RecurringZone {
    standard: i32,
    daylight: i32,
    start: ZoneDateRule,
    end: ZoneDateRule,
    valid: bool,
}

fn zone_rule_digit(value: char) -> i32 {
    if value == '0' {
        return 0;
    }
    if value == '1' {
        return 1;
    }
    if value == '2' {
        return 2;
    }
    if value == '3' {
        return 3;
    }
    if value == '4' {
        return 4;
    }
    if value == '5' {
        return 5;
    }
    if value == '6' {
        return 6;
    }
    if value == '7' {
        return 7;
    }
    if value == '8' {
        return 8;
    }
    if value == '9' {
        return 9;
    }
    -1
}

fn read_zone_rule_number(text: &ZoneRuleText, start: usize, maximum: i32) -> ZoneRuleNumber {
    let mut index = start;
    let mut value: i32 = 0;
    while index < text.chars.len() && zone_rule_digit(text.chars[index]) >= 0 {
        value = value * 10 + zone_rule_digit(text.chars[index]);
        if value > maximum {
            return ZoneRuleNumber {
                next: index,
                value: 0,
                valid: false,
            };
        }
        index += 1;
    }
    ZoneRuleNumber {
        next: index,
        value: value,
        valid: index > start,
    }
}

fn skip_zone_rule_name(text: &ZoneRuleText, start: usize) -> usize {
    let mut index = start;
    if index < text.chars.len() && text.chars[index] == '<' {
        index += 1;
        let begin = index;
        while index < text.chars.len() && text.chars[index] != '>' {
            index += 1;
        }
        if index == text.chars.len() || index == begin {
            return text.chars.len() + 1;
        }
        return index + 1;
    }
    while index < text.chars.len()
        && zone_rule_digit(text.chars[index]) < 0
        && text.chars[index] != '+'
        && text.chars[index] != '-'
        && text.chars[index] != ','
    {
        index += 1;
    }
    if index == start {
        return text.chars.len() + 1;
    }
    index
}

fn read_zone_rule_clock(text: &ZoneRuleText, start: usize) -> ZoneRuleNumber {
    let mut index = start;
    let mut negative = false;
    if index < text.chars.len() && text.chars[index] == '-' {
        negative = true;
        index += 1;
    } else if index < text.chars.len() && text.chars[index] == '+' {
        index += 1;
    }
    let hours = read_zone_rule_number(text, index, 167);
    if hours.valid == false {
        return hours;
    }
    index = hours.next;
    let mut value = hours.value * 3600;
    if index < text.chars.len() && text.chars[index] == ':' {
        let minutes = read_zone_rule_number(text, index + 1, 59);
        if minutes.valid == false {
            return minutes;
        }
        value = value + minutes.value * 60;
        index = minutes.next;
        if index < text.chars.len() && text.chars[index] == ':' {
            let seconds = read_zone_rule_number(text, index + 1, 60);
            if seconds.valid == false {
                return seconds;
            }
            value = value + seconds.value;
            index = seconds.next;
        }
    }
    if negative {
        value = 0 - value;
    }
    ZoneRuleNumber {
        next: index,
        value: value,
        valid: true,
    }
}

fn read_zone_date_rule(text: &ZoneRuleText, start: usize) -> ZoneRuleRead {
    let result = ZoneRuleRead {
        next: start,
        rule: ZoneDateRule {
            kind: 0,
            month: 0,
            week: 0,
            day: 0,
            seconds: 7200,
        },
        valid: false,
    };
    let mut index = start;
    if index >= text.chars.len() {
        return result;
    }
    let mut kind: i32 = 0;
    let mut month: i32 = 0;
    let mut week: i32 = 0;
    let mut maximum: i32 = 365;
    if text.chars[index] == 'M' {
        kind = 2;
        index += 1;
        let read_month = read_zone_rule_number(text, index, 12);
        if read_month.valid == false || read_month.value < 1 {
            return result;
        }
        month = read_month.value;
        index = read_month.next;
        if index >= text.chars.len() || text.chars[index] != '.' {
            return result;
        }
        let read_week = read_zone_rule_number(text, index + 1, 5);
        if read_week.valid == false || read_week.value < 1 {
            return result;
        }
        week = read_week.value;
        index = read_week.next;
        if index >= text.chars.len() || text.chars[index] != '.' {
            return result;
        }
        index += 1;
        maximum = 6;
    } else if text.chars[index] == 'J' {
        kind = 1;
        index += 1;
    }
    let day = read_zone_rule_number(text, index, maximum);
    if day.valid == false || (kind == 1 && day.value < 1) {
        return result;
    }
    index = day.next;
    let mut clock: i32 = 7200;
    if index < text.chars.len() && text.chars[index] == '/' {
        let time = read_zone_rule_clock(text, index + 1);
        if time.valid == false {
            return result;
        }
        index = time.next;
        clock = time.value;
    }
    ZoneRuleRead {
        next: index,
        rule: ZoneDateRule {
            kind: kind,
            month: month,
            week: week,
            day: day.value,
            seconds: clock,
        },
        valid: true,
    }
}

fn parse_recurring_zone(value: &str) -> RecurringZone {
    let empty = ZoneDateRule {
        kind: 0,
        month: 0,
        week: 0,
        day: 0,
        seconds: 0,
    };
    let invalid = RecurringZone {
        standard: 0,
        daylight: 0,
        start: empty,
        end: empty,
        valid: false,
    };
    let chars: Vec<char> = value.chars().collect();
    let text = ZoneRuleText { chars: chars };
    let standard_start = skip_zone_rule_name(&text, 0);
    let standard = read_zone_rule_clock(&text, standard_start);
    if standard.valid == false {
        return invalid;
    }
    let mut index = skip_zone_rule_name(&text, standard.next);
    if index >= text.chars.len() {
        return invalid;
    }
    let mut daylight = standard.value - 3600;
    if text.chars[index] != ',' && text.chars[index] != ';' {
        let clock = read_zone_rule_clock(&text, index);
        if clock.valid == false {
            return invalid;
        }
        daylight = clock.value;
        index = clock.next;
    }
    if index >= text.chars.len() || (text.chars[index] != ',' && text.chars[index] != ';') {
        return invalid;
    }
    let start = read_zone_date_rule(&text, index + 1);
    if start.valid == false || start.next >= text.chars.len() || text.chars[start.next] != ',' {
        return invalid;
    }
    let end = read_zone_date_rule(&text, start.next + 1);
    if end.valid == false || end.next != text.chars.len() {
        return invalid;
    }
    RecurringZone {
        standard: standard.value,
        daylight: daylight,
        start: start.rule,
        end: end.rule,
        valid: true,
    }
}

fn zone_rule_leap_year(year: i32) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

fn zone_rule_month_days(year: i32, month: i32) -> i32 {
    if month == 2 {
        if zone_rule_leap_year(year) {
            return 29;
        }
        return 28;
    }
    if month == 4 || month == 6 || month == 9 || month == 11 {
        return 30;
    }
    31
}

fn zone_rule_year_days(year: i32) -> i32 {
    let previous = year - 1;
    previous * 365 + previous / 4 - previous / 100 + previous / 400 - 730119
}

fn zone_rule_year_seconds(year: i32) -> i64 {
    let days = zone_rule_year_days(year) as i64;
    days * 86400i64
}

fn zone_rule_transition_seconds(year: i32, rule: ZoneDateRule, offset: i32) -> i64 {
    let mut day = rule.day;
    if rule.kind == 1 {
        day = day - 1;
        if zone_rule_leap_year(year) && rule.day >= 60 {
            day = day + 1;
        }
    } else if rule.kind == 2 {
        let mut month: i32 = 1;
        let mut month_start: i32 = 0;
        while month < rule.month {
            month_start = month_start + zone_rule_month_days(year, month);
            month = month + 1;
        }
        let mut weekday = (zone_rule_year_days(year) + month_start + 6) % 7;
        if weekday < 0 {
            weekday = weekday + 7;
        }
        let first = (rule.day - weekday + 7) % 7;
        day = first + (rule.week - 1) * 7;
        if day >= zone_rule_month_days(year, rule.month) {
            day = day - 7;
        }
        day = month_start + day;
    }
    let relative = day * 86400 + rule.seconds + offset;
    let relative_wide = relative as i64;
    zone_rule_year_seconds(year) + relative_wide
}

fn zone_rule_boundary_microseconds(seconds: i64) -> i64 {
    // Future rules can name the next year beyond the finite timestamp range.
    if seconds > 9223372036854i64 {
        return 9223372036854775807i64;
    }
    seconds * 1000000i64
}

fn zone_rule_year_at(microseconds: i64) -> i32 {
    let mut low: i32 = 1;
    let mut high: i32 = 294278;
    while low + 1 < high {
        let middle = low + (high - low) / 2;
        let boundary = zone_rule_boundary_microseconds(zone_rule_year_seconds(middle));
        if boundary <= microseconds {
            low = middle;
        } else {
            high = middle;
        };
    }
    low
}

struct RecurringBoundary {
    valid: bool,
    boundary: i64,
    before: i32,
    after: i32,
}

fn next_recurring_boundary(
    rules: RecurringZone,
    probe: i64,
    cutoff: i64,
    initial: i32,
) -> RecurringBoundary {
    if rules.valid == false {
        return RecurringBoundary {
            valid: false,
            boundary: 0i64,
            before: 0,
            after: 0,
        };
    }
    let current_year = zone_rule_year_at(probe);
    let mut year = current_year - 1;
    let mut next = 9223372036854775807i64;
    let mut latest = cutoff;
    let mut preceding = initial;
    let mut before = initial;
    let mut after = initial;
    while year <= current_year + 1 {
        let mut part: i32 = 0;
        while part < 2 {
            let mut seconds = zone_rule_transition_seconds(year, rules.start, rules.standard);
            let mut west = rules.standard;
            let mut following = 0 - rules.daylight;
            if part == 1 {
                seconds = zone_rule_transition_seconds(year, rules.end, rules.daylight);
                west = rules.daylight;
                following = 0 - rules.standard;
            }
            let boundary = zone_rule_boundary_microseconds(seconds);
            if boundary > cutoff {
                if boundary <= probe && boundary > latest {
                    latest = boundary;
                    preceding = following;
                }
                if boundary > probe && boundary < next {
                    next = boundary;
                    before = 0 - west;
                    after = following;
                }
            }
            part = part + 1;
        }
        year = year + 1;
    }
    if next == 9223372036854775807i64 {
        before = preceding;
        after = preceding;
    }
    RecurringBoundary {
        valid: true,
        boundary: next,
        before: before,
        after: after,
    }
}
