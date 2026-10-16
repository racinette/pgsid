const JSONPATH_TEMPLATE_MONTH_WORDS: &[&str] = &[
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const JSONPATH_TEMPLATE_MONTH_SHORT_WORDS: &[&str] = &[
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const JSONPATH_TEMPLATE_DAY_WORDS: &[&str] = &[
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];
const JSONPATH_TEMPLATE_DAY_SHORT_WORDS: &[&str] =
    &["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const JSONPATH_TEMPLATE_ROMAN_WORDS: &[&str] = &[
    "XII", "XI", "X", "IX", "VIII", "VII", "VI", "V", "IV", "III", "II", "I",
];
const JSONPATH_TEMPLATE_AM_PM_WORDS: &[&str] = &["AM", "PM", "A.M.", "P.M."];

fn jsonpath_template_named_read(
    source: &JsonpathTemporalSource,
    position: usize,
    kind: i32,
) -> JsonpathTemplateRead {
    let mut index: usize = 0;
    let mut limit: usize = 12;
    if kind == 42 {
        limit = 2;
    };
    if kind == 43 {
        index = 2;
        limit = 4;
    };
    if kind == 46 || kind == 47 {
        limit = 7;
    };
    while index < limit {
        let mut name = String::new();
        if kind == 42 || kind == 43 {
            name = JSONPATH_TEMPLATE_AM_PM_WORDS[index].to_owned();
        };
        if kind == 44 {
            name = JSONPATH_TEMPLATE_MONTH_WORDS[index].to_owned();
        };
        if kind == 45 {
            name = JSONPATH_TEMPLATE_MONTH_SHORT_WORDS[index].to_owned();
        };
        if kind == 46 {
            name = JSONPATH_TEMPLATE_DAY_WORDS[index].to_owned();
        };
        if kind == 47 {
            name = JSONPATH_TEMPLATE_DAY_SHORT_WORDS[index].to_owned();
        };
        if kind == 48 {
            name = JSONPATH_TEMPLATE_ROMAN_WORDS[index].to_owned();
        };
        if jsonpath_template_ascii_matches(source, position, name.as_str()) {
            let characters: Vec<char> = name.chars().collect();
            let mut value = index as i32;
            if kind == 42 || kind == 43 {
                value = value % 2;
            };
            if kind == 44 || kind == 45 {
                value = value + 1;
            };
            if kind == 48 {
                value = 12 - value;
            };
            return JsonpathTemplateRead {
                value: value,
                end: position + characters.len(),
                width: characters.len(),
                error: 0,
            };
        };
        index += 1;
    }
    JsonpathTemplateRead {
        value: 0,
        end: position,
        width: 0,
        error: JSONPATH_TEMPLATE_FORMAT,
    }
}

fn jsonpath_template_ordinal_field(kind: i32) -> bool {
    (kind >= 1 && kind <= 18) || (kind >= 24 && kind <= 30) || (kind >= 33 && kind <= 41)
}
