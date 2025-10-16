const emailService = require('../services/emailService');

describe('Email Service Integration Tests', () => {
  test('should verify connection to both email providers', async () => {
    const status = await emailService.verifyConnection();
    expect(status.resend.connected).toBe(true);
    expect(status.gmail.connected).toBe(true);
  });

  test('should send email through Resend successfully', async () => {
    const testEmail = {
      to: 'test@mineduc.gob.gt',
      subject: 'Test Email via Resend',
      html: '<p>This is a test email sent via Resend</p>',
      text: 'This is a test email sent via Resend',
      category: 'test'
    };

    const result = await emailService.sendEmail(testEmail);
    expect(result.success).toBe(true);
    expect(result.provider).toBe('resend');
    expect(result.id).toBeDefined();
  });

  test('should fallback to Gmail when Resend fails', async () => {
    // Forzar un error en Resend cambiando temporalmente la API key
    const originalKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'invalid_key';

    const testEmail = {
      to: 'test@mineduc.gob.gt',
      subject: 'Test Email via Gmail Fallback',
      html: '<p>This is a test email sent via Gmail fallback</p>',
      text: 'This is a test email sent via Gmail fallback',
      category: 'test'
    };

    const result = await emailService.sendEmail(testEmail);
    expect(result.success).toBe(true);
    expect(result.provider).toBe('gmail');
    expect(result.id).toBeDefined();

    // Restaurar la API key original
    process.env.RESEND_API_KEY = originalKey;
  });

  test('should track email status', async () => {
    const testEmail = {
      to: 'test@mineduc.gob.gt',
      subject: 'Test Email for Tracking',
      html: '<p>This is a test email for tracking</p>',
      text: 'This is a test email for tracking',
      category: 'test'
    };

    const sendResult = await emailService.sendEmail(testEmail);
    expect(sendResult.success).toBe(true);

    if (sendResult.provider === 'resend') {
      const status = await emailService.getEmailStatus(sendResult.id);
      expect(status).toBeDefined();
      expect(status.status).toBeDefined();
    }
  });
});