import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate.js';

describe('formatDate', () => {
  it('should format date as HH:MM', () => {
    const date = new Date(2024, 0, 1, 14, 30);
    expect(formatDate(date)).toBe('14:30');
  });

  it('should pad single-digit hours with zero', () => {
    const date = new Date(2024, 0, 1, 9, 15);
    expect(formatDate(date)).toBe('09:15');
  });

  it('should pad single-digit minutes with zero', () => {
    const date = new Date(2024, 0, 1, 12, 5);
    expect(formatDate(date)).toBe('12:05');
  });

  it('should handle midnight', () => {
    const date = new Date(2024, 0, 1, 0, 0);
    expect(formatDate(date)).toBe('00:00');
  });

  it('should handle end of day', () => {
    const date = new Date(2024, 0, 1, 23, 59);
    expect(formatDate(date)).toBe('23:59');
  });
});
