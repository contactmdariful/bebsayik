import { SmsDriver, SmsSendResult } from './sms.types.js';

export interface BulkSmsBdConfig {
  apiKey: string;
  senderId: string;
  baseUrl?: string;
}

/**
 * Production SMS Adapter for BulkSMS BD (Bangladesh)
 * API Spec: http://bulksmsbd.net/api/smsapi
 */
export class BulkSmsBdDriver implements SmsDriver {
  private baseUrl: string;

  constructor(private config: BulkSmsBdConfig) {
    this.baseUrl = config.baseUrl || 'http://bulksmsbd.net/api/smsapi';
  }

  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    const formattedPhone = to.startsWith('88') ? to : `88${to}`;
    const url = new URL(this.baseUrl);
    url.searchParams.set('api_key', this.config.apiKey);
    url.searchParams.set('type', 'text');
    url.searchParams.set('number', formattedPhone);
    url.searchParams.set('senderid', this.config.senderId);
    url.searchParams.set('message', message);

    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as any;
      if (data.response_code === 200 || data.success) {
        return {
          success: true,
          messageId: data.message_id || `bsms_${Date.now()}`
        };
      }
      return {
        success: false,
        error: data.error_message || 'BulkSMS BD dispatch rejected'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'BulkSMS BD network error'
      };
    }
  }
}
