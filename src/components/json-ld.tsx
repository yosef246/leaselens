/**
 * Renders a JSON-LD structured-data block (schema.org) for SEO and AEO (AI answer engines).
 * Server component: the object is serialized once at render. dangerouslySetInnerHTML is required
 * because the payload must be raw JSON text inside the <script>, not escaped HTML.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
