use std::cell::RefCell;
use std::collections::BTreeSet;
use syn::spanned::Spanned;

// A construct, the type validation inferred for it, and the item and position it occurs at.
pub(crate) type Inferred = (&'static str, String, String, usize, usize);

thread_local! {
    static RECORDED: RefCell<Option<BTreeSet<Inferred>>> = const { RefCell::new(None) };
}

// Validation can infer one expression more than once, so the record is a set. Translation does
// not ask for it, and records nothing.
pub(crate) fn recording<T>(enabled: bool, f: impl FnOnce() -> T) -> (T, BTreeSet<Inferred>) {
    RECORDED.with(|recorded| *recorded.borrow_mut() = enabled.then(BTreeSet::new));
    let result = f();
    let inferred = RECORDED.with(|recorded| recorded.borrow_mut().take().unwrap_or_default());
    (result, inferred)
}

pub(crate) fn record(construct: &'static str, ty: &str, node: &impl Spanned) {
    RECORDED.with(|recorded| {
        if let Some(inferred) = recorded.borrow_mut().as_mut() {
            let start = node.span().start();
            let item = crate::checked_item::current().unwrap_or_default();
            inferred.insert((
                construct,
                ty.to_string(),
                item,
                start.line,
                start.column + 1,
            ));
        }
    });
}
