-- name: OverloadAccepted
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (1,2,3,1.5,1.5,'n','ab','n','a',false);

-- name: OverloadLarge
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (30,30,60,-2.25,-2.25,'x','ab  ','x','b',false);

-- name: OverloadNulls
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: OverloadZeroDivisor
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (0,5,10,0.05,0.04,'n','ab','n','a',false);

-- name: OverloadMinSmall
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (-32768,1,1,1,1,'n','ab','n','a',false);

-- name: OverloadOverflow
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (32767,2147483647,9223372036854775807,1,1,'n','ab','n','a',false);

-- name: OverloadRounding
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (1,1,1,0.25,0.35,'n','ab','n','a',false);

-- name: OverloadBypassed
INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (0,5,10,0.05,0.04,'n','zz','m','z',true);

-- name: NonstrictAccepted
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES ('a','b',1,1,false);

-- name: NonstrictDivisionError
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES ('a','b',1,0,false);

-- name: NonstrictNulls
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES (NULL,NULL,NULL,NULL,false);

-- name: NonstrictNullText
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES (NULL,'b',2,1,false);

-- name: NonstrictEqual
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES ('x','x',-1,1,false);

-- name: NonstrictWidthNegative
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES ('ab','c',-5,1,false);

-- name: NonstrictLazyCoalesce
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES ('a','b',3,0,false);

-- name: NonstrictBypassed
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES ('x','x',1,0,true);

-- name: ConcatMatches
INSERT INTO concatenations(label,small,addr,day,flag,amount,expected,bypass) VALUES ('x',7,'1.2.3.4','2000-01-02',true,1.50,'x7|1.2.3.4/32|2000-01-02|true|1.50',false);

-- name: ConcatCidrStyle
INSERT INTO concatenations(label,small,addr,day,flag,amount,expected,bypass) VALUES ('x',7,'10.0.0.0/8','2000-01-02',false,-0.5,'x7|10.0.0.0/8|2000-01-02|false|-0.5',false);

-- name: ConcatWrongInet
INSERT INTO concatenations(label,small,addr,day,flag,amount,expected,bypass) VALUES ('x',7,'1.2.3.4','2000-01-02',true,1.50,'x7|1.2.3.4|2000-01-02|true|1.50',false);

-- name: ConcatNullPart
INSERT INTO concatenations(label,small,addr,day,flag,amount,expected,bypass) VALUES ('x',NULL,'1.2.3.4','2000-01-02',true,1.50,'x',false);

-- name: ConcatLeadingMatch
INSERT INTO concatenations(label,small,addr,day,flag,amount,expected,bypass) VALUES ('',NULL,NULL,NULL,NULL,NULL,NULL,false);

-- name: ConcatBypassed
INSERT INTO concatenations(label,small,addr,day,flag,amount,expected,bypass) VALUES ('x',7,'1.2.3.4','2000-01-02',true,1.50,'wrong',true);
