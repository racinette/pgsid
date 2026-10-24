SELECT scale(0::money::numeric) AS "moneyFractionDigits",
       CASE WHEN current_setting('lc_monetary') IN ('C', 'POSIX') THEN 'C' END AS "moneyLocale";
