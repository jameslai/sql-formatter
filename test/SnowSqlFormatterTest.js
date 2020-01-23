import sqlFormatter from "../src/sqlFormatter";
import behavesLikeSqlFormatter from "./behavesLikeSqlFormatter";

describe("SnowSqlFormatter", function() {
    var formatConfig = { language: "snowsql" };
    behavesLikeSqlFormatter("snowsql");

    it("formats short CREATE TABLE", function() {
        expect(
            sqlFormatter.format(
                "CREATE TABLE items (a INT PRIMARY KEY, b TEXT);",
                formatConfig
            )
        ).toBe("CREATE TABLE items (a INT PRIMARY KEY, b TEXT);");
    });

    it("formats long CREATE TABLE", function() {
        expect(
            sqlFormatter.format(
                "CREATE TABLE items (a INT PRIMARY KEY, b TEXT, c INT NOT NULL, d INT NOT NULL);",
                formatConfig
            )
        ).toBe(
            "CREATE TABLE items (\n" +
                "  a INT PRIMARY KEY,\n" +
                "  b TEXT,\n" +
                "  c INT NOT NULL,\n" +
                "  d INT NOT NULL\n" +
                ");"
        );
    });

    it("formats INSERT without INTO", function() {
        const result = sqlFormatter.format(
            "INSERT Customers (ID, MoneyBalance, Address, City) VALUES (12,-123.4, 'Skagen 2111','Stv');",
            formatConfig
        );
        expect(result).toBe(
            "INSERT\n" +
                "  Customers (ID, MoneyBalance, Address, City)\n" +
                "VALUES\n" +
                "  (12, -123.4, 'Skagen 2111', 'Stv');"
        );
    });

    it("formats ALTER TABLE ... MODIFY query", function() {
        const result = sqlFormatter.format(
            "ALTER TABLE supplier MODIFY supplier_name char(100) NOT NULL;",
            formatConfig
        );
        expect(result).toBe(
            "ALTER TABLE\n" +
                "  supplier\n" +
                "MODIFY\n" +
                "  supplier_name char(100) NOT NULL;"
        );
    });

    it("formats ALTER TABLE ... ALTER COLUMN query", function() {
        const result = sqlFormatter.format(
            "ALTER TABLE supplier ALTER COLUMN supplier_name VARCHAR(100) NOT NULL;",
            formatConfig
        );
        expect(result).toBe(
            "ALTER TABLE\n" +
                "  supplier\n" +
                "ALTER COLUMN\n" +
                "  supplier_name VARCHAR(100) NOT NULL;"
        );
    });

    it("recognizes [] strings", function() {
        expect(sqlFormatter.format("[foo JOIN bar]"), formatConfig).toBe(
            "[foo JOIN bar]"
        );
        expect(sqlFormatter.format("[foo ]] JOIN bar]"), formatConfig).toBe(
            "[foo ]] JOIN bar]"
        );
    });

    it("recognizes @variables", function() {
        const result = sqlFormatter.format(
            "SELECT @variable, @a1_2.3$, @'var name', @\"var name\", @`var name`, @[var name];",
            formatConfig
        );
        expect(result).toBe(
            "SELECT\n" +
                "  @variable,\n" +
                "  @a1_2.3$,\n" +
                "  @'var name',\n" +
                '  @"var name",\n' +
                "  @`var name`,\n" +
                "  @[var name];"
        );
    });

    it("recognizes ?[0-9]* placeholders", function() {
        const result = sqlFormatter.format("SELECT ?1, ?25, ?;", formatConfig);
        expect(result).toBe("SELECT\n" + "  ?1,\n" + "  ?25,\n" + "  ?;");
    });

    it("replaces ? numbered placeholders with param values", function() {
        const result = sqlFormatter.format("SELECT ?1, ?2, ?0;", {
            language: "snowsql",
            params: {
                0: "first",
                1: "second",
                2: "third"
            }
        });
        expect(result).toBe(
            "SELECT\n" + "  second,\n" + "  third,\n" + "  first;"
        );
    });

    it("replaces ? indexed placeholders with param values", function() {
        const result = sqlFormatter.format("SELECT ?, ?, ?;", {
            language: "snowsql",
            params: ["first", "second", "third"]
        });
        expect(result).toBe(
            "SELECT\n" + "  first,\n" + "  second,\n" + "  third;"
        );
    });

    it("formats SELECT query with CROSS JOIN", function() {
        const result = sqlFormatter.format(
            "SELECT a, b FROM t CROSS JOIN t2 on t.id = t2.id_t",
            formatConfig
        );
        expect(result).toBe(
            "SELECT\n" +
                "  a,\n" +
                "  b\n" +
                "FROM\n" +
                "  t\n" +
                "  CROSS JOIN t2 on t.id = t2.id_t"
        );
    });

    it("formats SELECT query with CROSS APPLY", function() {
        const result = sqlFormatter.format(
            "SELECT a, b FROM t CROSS APPLY fn(t.id)",
            formatConfig
        );
        expect(result).toBe(
            "SELECT\n" +
                "  a,\n" +
                "  b\n" +
                "FROM\n" +
                "  t\n" +
                "  CROSS APPLY fn(t.id)"
        );
    });

    it("formats simple SELECT", function() {
        const result = sqlFormatter.format("SELECT N, M FROM t", formatConfig);
        expect(result).toBe("SELECT\n" + "  N,\n" + "  M\n" + "FROM\n" + "  t");
    });

    it("formats SELECT query with OUTER APPLY", function() {
        const result = sqlFormatter.format(
            "SELECT a, b FROM t OUTER APPLY fn(t.id)",
            formatConfig
        );
        expect(result).toBe(
            "SELECT\n" +
                "  a,\n" +
                "  b\n" +
                "FROM\n" +
                "  t\n" +
                "  OUTER APPLY fn(t.id)"
        );
    });

    it("formats FETCH FIRST like LIMIT", function() {
        const result = sqlFormatter.format(
            "SELECT * FETCH FIRST 2 ROWS ONLY;",
            formatConfig
        );
        expect(result).toBe(
            "SELECT\n" + "  *\n" + "FETCH FIRST\n" + "  2 ROWS ONLY;"
        );
    });

    it("formats CASE ... WHEN with a blank expression", function() {
        const result = sqlFormatter.format(
            "CASE WHEN option = 'foo' THEN 1 WHEN option = 'bar' THEN 2 WHEN option = 'baz' THEN 3 ELSE 4 END;",
            formatConfig
        );

        expect(result).toBe(
            "CASE\n" +
                "  WHEN option = 'foo' THEN 1\n" +
                "  WHEN option = 'bar' THEN 2\n" +
                "  WHEN option = 'baz' THEN 3\n" +
                "  ELSE 4\n" +
                "END;"
        );
    });

    it("formats CASE ... WHEN inside SELECT", function() {
        const result = sqlFormatter.format(
            "SELECT foo, bar, CASE baz WHEN 'one' THEN 1 WHEN 'two' THEN 2 ELSE 3 END FROM table",
            formatConfig
        );

        expect(result).toBe(
            "SELECT\n" +
                "  foo,\n" +
                "  bar,\n" +
                "  CASE\n" +
                "    baz\n" +
                "    WHEN 'one' THEN 1\n" +
                "    WHEN 'two' THEN 2\n" +
                "    ELSE 3\n" +
                "  END\n" +
                "FROM\n" +
                "  table"
        );
    });

    it("formats CASE ... WHEN with an expression", function() {
        const result = sqlFormatter.format(
            "CASE toString(getNumber()) WHEN 'one' THEN 1 WHEN 'two' THEN 2 WHEN 'three' THEN 3 ELSE 4 END;",
            formatConfig
        );

        expect(result).toBe(
            "CASE\n" +
                "  toString(getNumber())\n" +
                "  WHEN 'one' THEN 1\n" +
                "  WHEN 'two' THEN 2\n" +
                "  WHEN 'three' THEN 3\n" +
                "  ELSE 4\n" +
                "END;"
        );
    });

    it("recognizes lowercase CASE ... END", function() {
        const result = sqlFormatter.format(
            "case when option = 'foo' then 1 else 2 end;",
            formatConfig
        );

        expect(result).toBe(
            "case\n" + "  when option = 'foo' then 1\n" + "  else 2\n" + "end;"
        );
    });

    // Regression test for issue #43
    it("ignores words CASE and END inside other strings", function() {
        const result = sqlFormatter.format(
            "SELECT CASEDATE, ENDDATE FROM table1;",
            formatConfig
        );

        expect(result).toBe(
            "SELECT\n" +
                "  CASEDATE,\n" +
                "  ENDDATE\n" +
                "FROM\n" +
                "  table1;"
        );
    });

    it("formats tricky line comments", function() {
        expect(
            sqlFormatter.format(
                "SELECT a#comment, here\nFROM b--comment",
                formatConfig
            )
        ).toBe(
            "SELECT\n" + "  a #comment, here\n" + "FROM\n" + "  b --comment"
        );
    });

    it("formats line comments followed by semicolon", function() {
        expect(
            sqlFormatter.format("SELECT a FROM b\n--comment\n;", formatConfig)
        ).toBe("SELECT\n" + "  a\n" + "FROM\n" + "  b --comment\n" + ";");
    });

    it("formats line comments followed by comma", function() {
        expect(
            sqlFormatter.format("SELECT a --comment\n, b", formatConfig)
        ).toBe("SELECT\n" + "  a --comment\n" + ",\n" + "  b");
    });

    it("formats line comments followed by close-paren", function() {
        expect(
            sqlFormatter.format("SELECT ( a --comment\n )", formatConfig)
        ).toBe("SELECT\n" + "  (a --comment\n" + ")");
    });

    it("formats line comments followed by open-paren", function() {
        expect(
            sqlFormatter.format("SELECT a --comment\n()", formatConfig)
        ).toBe("SELECT\n" + "  a --comment\n" + "  ()");
    });

    it("formats lonely semicolon", function() {
        expect(sqlFormatter.format(";", formatConfig)).toBe(";");
    });

    it("formats $$$$ syntax", function() {
        var testSql =
            "select $1, $2 from values ('row1', $$a    ' \\t      \0x123 z $ $$, 'telephone');";
        expect(
            sqlFormatter.format(
                "select $1, $2 from values ('row1', $$a    ' \\t      \0x123 z $ $$, 'telephone');",
                formatConfig
            )
        ).toBe(
            "select\n" +
                "  $1,\n" +
                "  $2\n" +
                "from\n" +
                "values\n" +
                "  (\n" +
                "    'row1',\n" +
                "    $$a    ' \\t      \0x123 z $ $$,\n" +
                "    'telephone'\n" +
                "  );"
        );
    });
});
