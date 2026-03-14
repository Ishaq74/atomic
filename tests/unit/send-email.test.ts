import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the env module before importing send
vi.mock('@smtp/env', () => ({
  getSmtpProvider: vi.fn(),
  getSmtpFrom: vi.fn(() => ({ email: 'test@example.com', name: 'Test' })),
}));

// Mock all 3 provider modules
const mockBrevoSend = vi.fn();
const mockResendSend = vi.fn();
const mockNodemailerSend = vi.fn();

vi.mock('@smtp/providers/brevo', () => ({ send: mockBrevoSend }));
vi.mock('@smtp/providers/resend', () => ({ send: mockResendSend }));
vi.mock('@smtp/providers/nodemailer', () => ({ send: mockNodemailerSend }));

import { sendEmail } from '@smtp/send';
import { getSmtpProvider } from '@smtp/env';

const payload = { to: 'user@test.com', subject: 'Hello', html: '<p>Hi</p>' };

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes to BREVO provider', async () => {
    vi.mocked(getSmtpProvider).mockReturnValue('BREVO');
    await sendEmail(payload);
    expect(mockBrevoSend).toHaveBeenCalledOnce();
    expect(mockBrevoSend).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ email: 'test@example.com' }),
    );
  });

  it('routes to RESEND provider', async () => {
    vi.mocked(getSmtpProvider).mockReturnValue('RESEND');
    await sendEmail(payload);
    expect(mockResendSend).toHaveBeenCalledOnce();
    expect(mockResendSend).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ email: 'test@example.com' }),
    );
  });

  it('routes to NODEMAILER provider', async () => {
    vi.mocked(getSmtpProvider).mockReturnValue('NODEMAILER');
    await sendEmail(payload);
    expect(mockNodemailerSend).toHaveBeenCalledOnce();
    expect(mockNodemailerSend).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ email: 'test@example.com' }),
    );
  });

  it('does not call other providers when one is active', async () => {
    vi.mocked(getSmtpProvider).mockReturnValue('BREVO');
    await sendEmail(payload);
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(mockNodemailerSend).not.toHaveBeenCalled();
  });

  it('passes correct from config to provider', async () => {
    vi.mocked(getSmtpProvider).mockReturnValue('NODEMAILER');
    await sendEmail(payload);
    expect(mockNodemailerSend).toHaveBeenCalledWith(
      payload,
      { email: 'test@example.com', name: 'Test' },
    );
  });
});
