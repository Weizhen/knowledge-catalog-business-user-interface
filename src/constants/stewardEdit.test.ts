import { describe, it, expect } from 'vitest';
import {
  aspectKeyFromAspectTypeName,
  getPlainAspectData,
  isOverviewAspectKey,
  isSystemAspectKey,
  protobufValueToPlain,
} from './stewardEdit';

describe('stewardEdit helpers', () => {
  it('detects system aspect keys', () => {
    expect(isSystemAspectKey('dataplex-types.global.schema')).toBe(true);
    expect(isSystemAspectKey('123.global.overview')).toBe(true);
    expect(isSystemAspectKey('dataplex-types.global.generic-entry')).toBe(true);
    expect(isSystemAspectKey('dataplex-types.global.bigquery-table')).toBe(true);
    expect(
      isSystemAspectKey('my-project.global.generic-entry', {
        aspectType: 'projects/dataplex-types/locations/global/aspectTypes/generic-entry',
      })
    ).toBe(true);
    expect(isSystemAspectKey('my-project.global.custom-governance')).toBe(false);
    expect(isSystemAspectKey('123.custom.annotation1')).toBe(false);
  });

  it('detects overview aspect keys', () => {
    expect(isOverviewAspectKey('dataplex-types.global.overview')).toBe(true);
    expect(isOverviewAspectKey('x.global.schema')).toBe(false);
  });

  it('derives aspect keys from aspect type names', () => {
    expect(
      aspectKeyFromAspectTypeName(
        'projects/dataplex-types/locations/global/aspectTypes/generic'
      )
    ).toBe('dataplex-types.global.generic');
  });

  it('converts kind-tagged protobuf values to plain JSON', () => {
    expect(protobufValueToPlain({ kind: 'stringValue', stringValue: 'hi' })).toBe('hi');
    expect(protobufValueToPlain({ kind: 'numberValue', numberValue: 3 })).toBe(3);
    expect(protobufValueToPlain({ kind: 'boolValue', boolValue: true })).toBe(true);
    expect(
      protobufValueToPlain({
        kind: 'structValue',
        structValue: {
          fields: {
            a: { kind: 'stringValue', stringValue: 'b' },
          },
        },
      })
    ).toEqual({ a: 'b' });
  });

  it('extracts plain aspect data from fields-shaped aspects', () => {
    expect(
      getPlainAspectData({
        data: {
          fields: {
            content: { kind: 'stringValue', stringValue: 'docs' },
          },
        },
      })
    ).toEqual({ content: 'docs' });
  });
});
