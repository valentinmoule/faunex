import { describe, expect, it } from 'vitest';
import { applyCustomCaptureOrder, parseCaptureOrder } from '@/lib/captureOrder';

const cap = (id: string, date: string) => ({ id, discoveredAt: date });

describe('applyCustomCaptureOrder', () => {
  it('orders ranked captures by the user custom order', () => {
    const list = [cap('a', '2026-01-01'), cap('b', '2026-01-02'), cap('c', '2026-01-03')];
    const sorted = applyCustomCaptureOrder(list, ['c', 'a', 'b']);
    expect(sorted.map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  it('puts unranked new captures first, most recent first', () => {
    const list = [cap('a', '2026-01-01'), cap('b', '2026-01-02'), cap('c', '2026-01-03')];
    const sorted = applyCustomCaptureOrder(list, ['a']);
    expect(sorted.map((c) => c.id)).toEqual(['c', 'b', 'a']);
  });

  it('keeps the list untouched without a custom order', () => {
    const list = [cap('a', '2026-01-01'), cap('b', '2026-01-02')];
    expect(applyCustomCaptureOrder(list, []).map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('parseCaptureOrder', () => {
  it('keeps only string ids from stored jsonb', () => {
    expect(parseCaptureOrder(['a', 1, 'b', null])).toEqual(['a', 'b']);
    expect(parseCaptureOrder(null)).toEqual([]);
    expect(parseCaptureOrder('a')).toEqual([]);
  });
});
