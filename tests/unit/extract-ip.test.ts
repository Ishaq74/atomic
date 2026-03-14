import { describe, it, expect } from 'vitest';
import { extractIp } from '@/lib/audit';

describe('extractIp', () => {
  it('returns first IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(extractIp(headers)).toBe('1.2.3.4');
  });

  it('returns single x-forwarded-for value', () => {
    const headers = new Headers({ 'x-forwarded-for': '10.0.0.1' });
    expect(extractIp(headers)).toBe('10.0.0.1');
  });

  it('falls back to x-real-ip when no x-forwarded-for', () => {
    const headers = new Headers({ 'x-real-ip': '192.168.0.1' });
    expect(extractIp(headers)).toBe('192.168.0.1');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
    });
    expect(extractIp(headers)).toBe('1.1.1.1');
  });

  it('returns null when no IP headers present', () => {
    const headers = new Headers();
    expect(extractIp(headers)).toBeNull();
  });

  it('trims whitespace from forwarded IP', () => {
    const headers = new Headers({ 'x-forwarded-for': '  3.3.3.3 , 4.4.4.4' });
    expect(extractIp(headers)).toBe('3.3.3.3');
  });

  it('handles IPv6 loopback in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '::1' });
    expect(extractIp(headers)).toBe('::1');
  });

  it('handles full IPv6 address in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '2001:db8::1, ::1' });
    expect(extractIp(headers)).toBe('2001:db8::1');
  });
});
