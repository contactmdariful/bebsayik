import { SmsDriver, SmsSendResult } from './sms.types.js';

export interface SslWirelessConfig {
  apiToken: string;
  sid: string;
  domain?: string;
}

/**
 * Production SMS Adapter for SSL Wireless (Bangladesh)
 * API Spec: https://smsplus.sslwireless.com/api/v3/send-sms
 */
export class SslWirelessDriver implements SmsDriver {
  private domain: string;

  constructor(private config: SslWirelessConfig) {
    this.domain = config.domain || 'https://smsplus.sslwireless.com';
  }

  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    const formattedPhone = to.startsWith('88') ? to : `88${to}`;
    const csmsId = `ssl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      api_token: this.config.apiToken,
      sid: this.config.sid,
      msisdn: formattedPhone,
      sms: message,
      csms_id: csmsId
    };

    try {
      const res = await fetch(`${this.domain}/api/v3/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as any;
      if (data.status === 'SUCCESS' || data.status_code === 200) {
        return {
          success: true,
          messageId: data.smsinfo?.[0]?.sms_id || csmsId
        };
      }
      return {
        success: false,
        error: data.error_message || 'SSL Wireless dispatch rejected'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'SSL Wireless network error'
      };
    }
  }
}
