/**
 * Convert an array of objects to CSV. Columns are inferred from
 * the keys of the first object. Values are escaped per RFC 4180.
 */
export function toCsv(rows, columns) {
    if (rows.length === 0)
        return "";
    const cols = columns ??
        Object.keys(rows[0]).map((k) => ({
            key: k,
            header: String(k),
        }));
    const escape = (v) => {
        if (v === null || v === undefined)
            return "";
        const s = v instanceof Date
            ? v.toISOString()
            : typeof v === "object"
                ? JSON.stringify(v)
                : String(v);
        if (s.includes('"') || s.includes(",") || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const headerLine = cols.map((c) => escape(c.header)).join(",");
    const bodyLines = rows.map((row) => cols.map((c) => escape(row[c.key])).join(","));
    return [headerLine, ...bodyLines].join("\n");
}
//# sourceMappingURL=csv.js.map