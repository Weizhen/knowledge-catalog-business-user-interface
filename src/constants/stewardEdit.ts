/**
 * Steward edit helpers: system-aspect denylist and aspect key utilities.
 */

/** Aspect key suffixes that must remain read-only in V1 steward edit. */
export const SYSTEM_ASPECT_SUFFIXES = [
  '.global.schema',
  '.global.overview',
  '.global.contacts',
  '.global.usage',
  '.global.glossary-term-aspect',
  '.global.refresh-cadence',
  '.data-profile',
  '.data-quality',
  '.data-quality-scorecard',
  '.schema-join',
  '.storage',
] as const;

/** Exact aspect type id fragments that are never editable. */
export const SYSTEM_ASPECT_TYPE_IDS = new Set([
  'schema',
  'overview',
  'contacts',
  'usage',
  'glossary-term-aspect',
  'refresh-cadence',
  'data-profile',
  'data-quality-scorecard',
  'schema-join',
  'storage',
  'bigquery-table',
  'bigquery-dataset',
  'bigquery-view',
]);

export function isSystemAspectKey(aspectKey: string): boolean {
  if (!aspectKey) return true;
  const lower = aspectKey.toLowerCase();
  if (SYSTEM_ASPECT_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return true;
  }
  const typeId = aspectKey.split('.').pop()?.split('@')[0] || '';
  return SYSTEM_ASPECT_TYPE_IDS.has(typeId);
}

/** Overview aspect is edited from the Overview tab, not Aspects tab. */
export function isOverviewAspectKey(aspectKey: string): boolean {
  return aspectKey.toLowerCase().endsWith('.global.overview');
}

/**
 * Derive Catalog aspect map key from an AspectType resource name.
 * projects/{p}/locations/{l}/aspectTypes/{id} → {p}.{l}.{id}
 */
export function aspectKeyFromAspectTypeName(aspectTypeName: string): string {
  const m = aspectTypeName.match(
    /^projects\/([^/]+)\/locations\/([^/]+)\/aspectTypes\/([^/]+)$/
  );
  if (!m) return aspectTypeName;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

/** Convert protobuf Value / kind-tagged structs to plain JSON for UpdateEntry. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function protobufValueToPlain(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if ('kind' in value) {
    switch (value.kind) {
      case 'stringValue':
        return value.stringValue ?? '';
      case 'numberValue':
        return value.numberValue;
      case 'boolValue':
        return Boolean(value.boolValue);
      case 'nullValue':
        return null;
      case 'listValue':
        return (value.listValue?.values || []).map(protobufValueToPlain);
      case 'structValue':
        return structFieldsToPlain(value.structValue?.fields || {});
      default:
        break;
    }
  }

  if (value.fields && typeof value.fields === 'object' && !Array.isArray(value)) {
    return structFieldsToPlain(value.fields);
  }

  if (Array.isArray(value)) {
    return value.map(protobufValueToPlain);
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = protobufValueToPlain(v);
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function structFieldsToPlain(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    out[k] = protobufValueToPlain(v);
  }
  return out;
}

/** Extract plain aspect data object from an entry aspect payload. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPlainAspectData(aspect: any): Record<string, any> {
  if (!aspect?.data) return {};
  const data = aspect.data;
  if (data.fields) {
    return structFieldsToPlain(data.fields);
  }
  return protobufValueToPlain(data) || {};
}

export const OVERVIEW_ASPECT_TYPE =
  'projects/dataplex-types/locations/global/aspectTypes/overview';
export const OVERVIEW_ASPECT_KEY = 'dataplex-types.global.overview';
