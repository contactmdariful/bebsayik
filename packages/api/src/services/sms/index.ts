import { SmsDriver } from './sms.types.js';
import { mockSmsDriver } from './mockSmsDriver.js';

export * from './sms.types.js';
export * from './mockSmsDriver.js';
export * from './sslWirelessDriver.js';
export * from './bulkSmsBdDriver.js';

let activeDriver: SmsDriver = mockSmsDriver;

export function getSmsDriver(): SmsDriver {
  return activeDriver;
}

export function setSmsDriver(driver: SmsDriver): void {
  activeDriver = driver;
}
