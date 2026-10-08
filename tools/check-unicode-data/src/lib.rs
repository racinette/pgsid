use quote::ToTokens;
use std::{fs, path::Path, process::Command};
use syn::parse_quote;

fn without_comments(source: &str) -> String {
    let mut result = String::new();
    let mut rest = source;
    while let Some(index) = rest.find("/*") {
        result.push_str(&rest[..index]);
        rest = &rest[index + 2..];
        let end = rest.find("*/").expect("unterminated C comment");
        rest = &rest[end + 2..];
    }
    result.push_str(rest);
    result
}

fn table<'a>(source: &'a str, name: &str) -> &'a str {
    let start = source.find(&format!("{name}[")).expect("missing C table");
    let start = start + source[start..].find('{').unwrap() + 1;
    let end = start + source[start..].find("};").unwrap();
    &source[start..end]
}

fn records(source: &str) -> impl Iterator<Item = Vec<&str>> {
    source.split('{').skip(1).map(|row| {
        row.split('}')
            .next()
            .unwrap()
            .split(',')
            .map(str::trim)
            .collect()
    })
}

fn number(value: &str) -> i64 {
    if let Some(hex) = value.strip_prefix("0x") {
        i64::from_str_radix(hex, 16).unwrap()
    } else {
        value.parse().unwrap()
    }
}

fn emit(output: &mut syn::File, name: &str, kind: &str, values: &[i64]) {
    let literals: Vec<syn::LitInt> = values
        .iter()
        .map(|value| {
            assert!(*value >= 0);
            if kind == "u16" {
                assert!((0..=65535).contains(value));
            } else if kind == "i32" {
                assert!(i32::try_from(*value).is_ok());
            }
            syn::parse_str(&format!(
                "{value}{}",
                if kind == "i64" { "i64" } else { "" }
            ))
            .unwrap()
        })
        .collect();
    let name: syn::Ident = syn::parse_str(name).unwrap();
    let kind: syn::Type = syn::parse_str(kind).unwrap();
    output
        .items
        .push(parse_quote!(const #name: &[#kind] = &[#(#literals),*];));
}

fn merge_ranges(ranges: impl Iterator<Item = (i64, i64, i64)>) -> Vec<i64> {
    let mut output: Vec<i64> = Vec::new();
    for (first, last, property) in ranges {
        assert!(first <= last && (0..=0x10ffff).contains(&last));
        let size = output.len();
        if size != 0 {
            assert!(output[size - 2] < first);
        }
        if size != 0 && output[size - 2] + 1 == first && output[size - 1] == property {
            output[size - 2] = last;
        } else {
            output.extend([first, last, property]);
        }
    }
    output
}

pub fn generate(directory: &Path, target: &Path) {
    let read = |name| without_comments(&fs::read_to_string(directory.join(name)).unwrap());
    let version = read("unicode_version.h");
    let version = version.split('"').nth(1).unwrap();
    assert_eq!(version, "16.0");
    let profile: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(directory.join("database-profile.json")).unwrap())
            .unwrap();
    assert_eq!(profile["encoding"].as_str(), Some("UTF8"));
    assert_eq!(profile["unicode"].as_str(), Some(version));
    let icu = profile.get("icu").expect("missing ICU profile");
    assert!(icu.is_null() || icu.is_string());
    let icu = icu.as_str().unwrap_or("");
    let mut output: syn::File = parse_quote! {
        const UNICODE_VERSION_LABEL: &[&str] = &[#version];
        const UNICODE_ICU_VERSION_LABEL: &[&str] = &[#icu];
    };
    let categories = read("unicode_category_table.h");
    let categories: Vec<_> = records(table(&categories, "unicode_categories")).collect();
    assert_eq!(categories.len(), 3368);
    let assigned = merge_ranges(categories.iter().filter_map(|row| {
        assert_eq!(row.len(), 3);
        (row[2] != "PG_U_UNASSIGNED").then(|| (number(row[0]), number(row[1]), 1))
    }));
    assert_eq!(assigned.len() / 3, 731);
    emit(&mut output, "UNICODE_ASSIGNED_RANGES", "i32", &assigned);

    let norm = read("unicode_norm_table.h");
    let codes: Vec<_> = table(&norm, "UnicodeDecomp_codepoints")
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(number)
        .collect();
    assert_eq!(codes.len(), 5138);
    let mut points = Vec::new();
    let mut properties = Vec::new();
    let mut offsets = Vec::new();
    let mut compositions = Vec::new();
    for row in records(table(&norm, "UnicodeDecompMain")) {
        assert_eq!(row.len(), 4);
        let point = number(row[0]);
        assert!(points.last().is_none_or(|previous| *previous < point));
        points.push(point);
        let flags = row[2]
            .split('|')
            .map(str::trim)
            .map(|part| match part {
                "DECOMP_COMPAT" => 32,
                "DECOMP_INLINE" => 64,
                "DECOMP_NO_COMPOSE" => 128,
                _ => number(part),
            })
            .fold(0, |flags, value| flags | value);
        let offset = number(row[3]);
        let size = flags & 31;
        let class = number(row[1]);
        assert!((0..=255).contains(&class));
        properties.push(class * 256 + flags);
        offsets.push(offset);
        if flags & 64 != 0 {
            assert_eq!(size, 1);
        } else {
            assert!(offset + size <= codes.len() as i64);
        }
        if size == 2 && flags & 160 == 0 {
            assert_eq!(flags & 64, 0);
            let first = codes[offset as usize];
            let second = codes[offset as usize + 1];
            compositions.push((first * 2097152 + second, point));
        }
    }
    assert_eq!(points.len(), 6843);
    compositions.sort_unstable();
    assert_eq!(compositions.len(), 961);
    assert!(compositions.windows(2).all(|pair| pair[0].0 < pair[1].0));
    emit(&mut output, "UNICODE_DECOMP_POINTS", "i32", &points);
    emit(&mut output, "UNICODE_DECOMP_PROPERTIES", "u16", &properties);
    emit(&mut output, "UNICODE_DECOMP_OFFSETS", "u16", &offsets);
    emit(&mut output, "UNICODE_DECOMP_CODES", "i32", &codes);
    emit(
        &mut output,
        "UNICODE_COMPOSE_KEYS",
        "i64",
        &compositions.iter().map(|pair| pair.0).collect::<Vec<_>>(),
    );
    emit(
        &mut output,
        "UNICODE_COMPOSE_POINTS",
        "i32",
        &compositions.iter().map(|pair| pair.1).collect::<Vec<_>>(),
    );

    let props = read("unicode_normprops_table.h");
    for (name, c_name) in [
        ("UNICODE_NFC_QUICK_RANGES", "UnicodeNormProps_NFC_QC"),
        ("UNICODE_NFKC_QUICK_RANGES", "UnicodeNormProps_NFKC_QC"),
    ] {
        let ranges = merge_ranges(records(table(&props, c_name)).map(|row| {
            assert_eq!(row.len(), 2);
            let point = number(row[0]);
            let property = match row[1] {
                "UNICODE_NORM_QC_NO" => 0,
                "UNICODE_NORM_QC_MAYBE" => 2,
                _ => panic!("unexpected quick check property"),
            };
            (point, point, property)
        }));
        emit(&mut output, name, "i32", &ranges);
    }
    fs::write(target, output.into_token_stream().to_string()).unwrap();
    assert!(Command::new("rustfmt")
        .args(["--edition", "2021"])
        .arg(target)
        .status()
        .unwrap()
        .success());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_flags_and_inline_comments_without_inventing_codepoints() {
        let source = without_comments("a[2] = {/* 999 */ 0x0041, /* 123 */ 0x0042};");
        let values: Vec<_> = table(&source, "a")
            .split(',')
            .map(str::trim)
            .map(number)
            .collect();
        assert_eq!(values, [65, 66]);
        assert_eq!(
            merge_ranges([(1, 3, 1), (4, 6, 1), (8, 9, 1), (10, 10, 2)].into_iter()),
            [1, 6, 1, 8, 9, 1, 10, 10, 2]
        );
    }

    #[test]
    fn generation_is_deterministic_and_validates_the_upstream_snapshot() {
        let directory =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vendor/postgresql-unicode");
        let target =
            std::env::temp_dir().join(format!("pgsid-unicode-data-{}.rs", std::process::id()));
        generate(&directory, &target);
        let first = fs::read(&target).unwrap();
        generate(&directory, &target);
        assert_eq!(fs::read(&target).unwrap(), first);
        fs::remove_file(target).unwrap();
    }
}
