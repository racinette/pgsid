INSERT INTO overload_choices(small,medium,large,exact,approx,label,fixed,ident,flag,bypass) VALUES (1,2,4,1.5,1.5,'n','ab','n','a',false);
INSERT INTO nonstrict_calls(a,b,n,d,bypass) VALUES ('a','b',1,1,false);
INSERT INTO concatenations(label,small,addr,day,flag,amount,expected,bypass) VALUES ('x',7,'1.2.3.4','2000-01-02',true,1.50,'x7|1.2.3.4/32|2000-01-02|true|1.50',false);
