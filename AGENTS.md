# Working rules for docs and comments

These govern what goes into prose — under `docs/` and in code comments — and
what stays out. Prose is the only thing in this repo that cannot fail, so it
is the only thing that can be wrong indefinitely.

The corpus has its own rules file beside it, under `tests/unit/query/`.

## Principles

**1.** A number belongs in an assertion, or in prose immediately beside the
command that regenerates it. Never in prose alone.

**2.** An impossibility claim needs an executing owner that retires it when it
stops being true. Otherwise delete the claim.

**3.** Dates that name an event are content. Dates that certify freshness are
rot — git already knows when the line changed.

**4.** Describe, don't argue. An argument records a belief at a moment; a
description records the thing.

**5.** Assume every claim you write will be falsified by a fix landing, not by
a bug. Nothing will warn you.

## Docs

**6.** One doc, one subject. If the filename wants a sequence number or a
date, it's an episode — don't write it.

**7.** No doc references another doc. Split subjects so that two docs can
never state the same fact.

**8.** 300 lines is the cap. If it won't fit, the subject is two subjects.

**9.** A doc explains principles, concepts and mechanisms — the model a reader
needs before opening the code. That is its primary job.

**10.** Write at the altitude where changing the subject forces rewriting the
doc. Rewriting a mechanism does; rewriting a method almost never does.

**11.** Name no function, signature, file or type. Those are methods: they rot
silently, and the code carries them accurately already.

**12.** Where a number is involved, teach how to measure it and what the
result means. Never record the result.

**13.** Narrative of completed work belongs in the commit message. git is the
archive; the doc is not.

**14.** An orientation doc holds commands and pointers, not facts. Facts there
have the shortest shelf life in the repo.

## Comments

**15.** A comment may only claim what editing the code beneath it would
falsify.

**16.** No comment names another file, doc, mechanism, or issue. Needing to is
a sign the code is misplaced.

**17.** Explain why this line is what it is — never what the system around it
does.

**18.** A comment restating what a test already asserts is redundant. Delete
it and keep the test.

**19.** Comments are meta about the story. The code is the story. Don't
narrate it twice.

## Before writing either

**20.** Could this be an `expect()` instead? If yes, write that. Prose is what
is left when nothing can run.

**21.** If this sentence became false tomorrow, what goes red? If the answer
is nothing, don't write it.

**22.** If someone rewrote this mechanism, would the doc obviously need
rewriting too? If not, you documented a method.

## Checking compliance

Each rule below has a reading. Run it, judge the result — the counts are not
recorded here on purpose.

Freshness dates, which rule 3 wants gone:

    grep -rnE "20[0-9]{2}-[01][0-9]-[0-3][0-9]" src/ tests/ docs/

Comments that point outside their own line, against rules 15 and 16:

    grep -rnE "^\s*(//|\*).*(docs/[a-z-]+\.md|[a-z-]+\.(ts|sql)\b|[Ss]ee )" src/

Docs citing other docs, against rule 7, and the same from code:

    grep -rn "docs/[a-z0-9-]*\.md" docs/
    grep -rn "docs/[a-z0-9-]*\.md" src/ tests/

Docs over the cap, against rule 8:

    wc -l docs/*.md | sort -rn

A doc naming a function or a file is writing about a method, against rule 11 —
read the hits rather than counting them:

    grep -rnE "\`[a-zA-Z_]+\(\)|[a-z-]+\.(ts|sql)\b" docs/
