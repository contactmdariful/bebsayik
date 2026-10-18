import { SmsDriver, SmsSendResult } from './sms.types.js';

export interface SentSmsRecord {
  to: string;
  message: string;
  timestamp: Date;
  messageId: string;
}

export class MockSmsDriver implements SmsDriver {
  private sentMessages: SentSmsRecord[] = [];

  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: SentSmsRecord = {
      to,
      message,
      timestamp: new Date(),
      messageId
    };
    this.sentMessages.push(record);
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[MockSmsDriver] SMS sent to ${to}: "${message}" (ID: ${messageId})`);
    }
    return {
      success: true,
      messageId
    };
  }

  getMessages(): SentSmsRecord[] {
    return [...this.sentMessages];
  }

  getLastMessage(to?: string): SentSmsRecord | undefined {
    if (to) {
      const filtered = this.sentMessages.filter((m) => m.to === to);
      return filtered[filtered.length - 1];
    }
    return this.sentMessages[this.sentMessages.length - 1];
  }

  clear(): void {
    this.sentMessages = [];
  }
}

export const mockSmsDriver = new MockSmsDriver();
