# Rust CHECK evaluation

Generated Rust evaluates a schema's CHECK constraints the way the server would
on a row it is sent, through the same evaluator the other targets translate,
carried here as Rust source. Each table with CHECKs, or with columns of a
domain that has them, gets a struct of the columns those checks read, and each
domain with CHECKs gets functions on its type. The struct converts from the
table's row, so a row can be checked before it is written.

## Values given to an evaluation

Every input is unknown, SQL NULL or a value, and unknown until given. An
unknown input leaves undecided each check that reaches it and nothing else: a
check that is decided without the input, such as one whose other operand
settles it, is still decided. A value is converted to the evaluator's value of
its column's type as the server reads a parameter of that type, through the
column's type modifier too, so text longer than its declared length, or a
numeric beyond its precision, raises the error the server raises, and a numeric
past its scale is rounded first. A domain column's value reaches the
evaluator as its base value, and an enum of literals as the literal it holds.

A value the server's input would refuse fails every check that reads it with
that error, before any check runs, because the server refuses the row while
reading it. A value whose reading depends on what the evaluation cannot know,
such as text holding a NUL byte, leaves those checks undecided.

## Containers

Arrays, ranges, multiranges and composite values are read part by part, as
the server's input reads them: every element, bound or field goes through its
own type's input, a part of a domain type through the domain's NOT NULL and
CHECK constraints too, base domains first, and the evaluator's own
constructors then build the value, so a range is ordered and made canonical
and a multirange sorted and merged as the server would. The parts are read in
order: the first part the server would refuse fails the whole value with its
error, and a part whose reading is undecided leaves the whole value undecided,
since it may be the part refused. An array has the dimension counts its
column declares, and sub-arrays of differing lengths are refused as array
input refuses them. A column's type modifier applies to each element through
the coercion an assignment uses, which refuses a value too long where an
explicit cast would cut it.

## Results

A check is true, false, NULL, an error with its SQLSTATE and message, or
undecided with the reason. The row passes a check that is true or NULL, as the
server's does. A table's evaluation lists its columns' domain checks first, in
column order, then its own checks, which is the order the server meets them;
validation reports the first false or failing one as the error the server
would raise, and passes the undecided ones, which only the server decides. A
domain's checks run on a NULL value too, since a domain CHECK can refuse NULL.

A check whose expression the evaluator cannot evaluate, or that reads a value
of a type the Rust inputs do not convert, is undecided, saying so; so is a
container holding such a type.

## The evaluator

The evaluator's source is pruned to what the generated checks and values call,
when the code is generated: an item is kept when a kept item names it, in its
own module or in one its module uses, and a name an item only binds locally
refers to nothing outside it. The evaluator is private to the generated tree.
