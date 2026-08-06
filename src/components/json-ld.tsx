/**
 * Renders a JSON-LD structured-data block (schema.org) for SEO and AEO (AI answer engines).
 * Server component: the object is serialized once at render. dangerouslySetInnerHTML is required
 * because the payload must be raw JSON text inside the <script>, not escaped HTML.
 */

// JSON.stringify does NOT escape `<`, so a value containing `</script>` would break out of the
// script tag and execute (stored XSS the moment any user/dynamic string reaches `data`). Escape the
// HTML-significant characters as \uXXXX — valid JSON, inert inside the tag. Also escape the line/
// paragraph separators U+2028/U+2029, which are legal in JSON strings but break inline <script>
// parsing; they're built via String.fromCharCode so this source stays pure-ASCII.
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

function serialize(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
