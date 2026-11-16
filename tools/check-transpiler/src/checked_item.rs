use std::cell::RefCell;
use syn::spanned::Spanned;

thread_local! {
    static CHECKED: RefCell<Option<(String, usize, usize)>> = const { RefCell::new(None) };
}

// Each per-item pass records the item it reaches and clears the record when it finishes, so after
// a rejection the record names the item that failed, and is empty when a check over the whole
// graph failed.
pub(crate) fn enter(item: &syn::Item) {
    let name = match item {
        syn::Item::Const(node) => node.ident.to_string(),
        syn::Item::Struct(node) => node.ident.to_string(),
        syn::Item::Enum(node) => node.ident.to_string(),
        syn::Item::Fn(node) => node.sig.ident.to_string(),
        _ => String::new(),
    };
    let start = item.span().start();
    CHECKED.with(|checked| *checked.borrow_mut() = Some((name, start.line, start.column + 1)));
}

pub(crate) fn leave() {
    CHECKED.with(|checked| *checked.borrow_mut() = None);
}

// The name, line and column of the item the last rejection stopped at.
pub(crate) fn take() -> Option<(String, usize, usize)> {
    CHECKED.with(|checked| checked.borrow_mut().take())
}
