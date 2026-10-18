import { z } from 'zod';

/**
 * 15-Digit IMEI Luhn Algorithm Verifier
 */
export function validateLuhn(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(imei.charAt(i), 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Standard Regular Expressions & Zod Constraints
 */
export const bdPhoneRegex = /^01[3-9]\d{8}$/;
export const managerPinRegex = /^\d{4}$/;
export const monetaryDecimalRegex = /^\d+(\.\d{1,2})?$/;

export const BdPhoneSchema = z
  .string()
  .regex(bdPhoneRegex, 'Must be a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX)');

export const ImeiLuhnSchema = z
  .string()
  .regex(/^\d{15}$/, 'IMEI must be exactly 15 numeric digits')
  .refine(validateLuhn, 'Invalid IMEI Luhn checksum');

export const ManagerPinSchema = z
  .string()
  .regex(managerPinRegex, 'Manager override PIN must be exactly 4 numeric digits');

export const MonetaryAmountSchema = z
  .string()
  .regex(monetaryDecimalRegex, 'Monetary amounts must be formatted as 2-decimal strings');

export const GuarantorSchema = z.object({
  name: z.string().min(2, 'Guarantor name is required').optional(),
  fullName: z.string().min(2).optional(),
  phone: BdPhoneSchema,
  nid: z.string().min(10, 'NID must be at least 10 characters'),
  relation: z.string().min(2, 'Relationship is required')
}).refine((data) => !!(data.name || data.fullName), {
  message: 'Guarantor name or fullName is required'
});

export const CreateKistiContractSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  variantId: z.string().min(1, 'Variant ID is required'),
  imei1: ImeiLuhnSchema,
  cashPrice: MonetaryAmountSchema,
  downPayment: MonetaryAmountSchema,
  downPaymentAccountId: z.string().optional(),
  paymentMethod: z.enum(['cash', 'mfs_bkash', 'mfs_nagad', 'bank_card']).default('cash'),
  tenureMonths: z.number().int().min(1).max(36),
  interestRate: z.string().optional(),
  interestFeeAmount: z.string().optional(),
  guarantors: z.array(GuarantorSchema).min(2, 'At least 2 guarantors are required'),
  notes: z.string().optional()
});

export const CollectKistiMilestoneSchema = z.object({
  milestoneNo: z.number().int().min(1).optional(),
  amount: MonetaryAmountSchema,
  paymentMethod: z.enum(['cash', 'mfs_bkash', 'mfs_nagad', 'bank_card']).default('cash'),
  accountId: z.string().optional(),
  notes: z.string().optional(),
  isEarlySettlement: z.boolean().optional()
});

export const ShiftOpenSchema = z.object({
  openingCash: MonetaryAmountSchema
});

export const ShiftBlindCountSchema = z.object({
  note1000: z.number().int().min(0).default(0),
  note500: z.number().int().min(0).default(0),
  note200: z.number().int().min(0).default(0),
  note100: z.number().int().min(0).default(0),
  note50: z.number().int().min(0).default(0),
  note20: z.number().int().min(0).default(0),
  note10: z.number().int().min(0).default(0),
  coins: z.number().min(0).default(0),
  requestRecount: z.boolean().optional()
});

export const ShiftFinalizeSchema = z.object({
  reason: z.string().optional()
});

export const InterAccountTransferSchema = z.object({
  fromAccountCode: z.string().min(1, 'Source account code is required'),
  toAccountCode: z.string().min(1, 'Destination account code is required'),
  amount: MonetaryAmountSchema,
  notes: z.string().optional()
});

export const ExpenseVoucherSchema = z.object({
  categoryCode: z.string().min(1, 'Expense category code is required'),
  paidFromAccountCode: z.string().default('1.1.01'),
  amount: MonetaryAmountSchema,
  payeeName: z.string().min(1, 'Payee is required'),
  notes: z.string().optional()
});

export const PayrollDisburseSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Must be in YYYY-MM format'),
  employeeUserId: z.string().min(1, 'Employee User ID is required'),
  disburseMethod: z.enum(['bank_transfer', 'cash']).default('bank_transfer'),
  sourceAccountCode: z.string().optional()
});

export const FreshStartResetSchema = z.object({
  masterPassword: z.string().min(6, 'Owner master password is required'),
  confirmationPhrase: z.literal('PURGE-TEST-TRANSACTIONS')
});

export const MarketingLeadSchema = z.object({
  phone: BdPhoneSchema,
  shopName: z.string().optional(),
  contactName: z.string().optional(),
  leadSource: z.string().default('google_play_badge'),
  notes: z.string().optional()
});

export type MarketingLeadInput = z.input<typeof MarketingLeadSchema>;
export type MarketingLeadOutput = z.output<typeof MarketingLeadSchema>;

export const OnboardingSetupSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  slug: z.string().min(2).optional(),
  address: z.string().min(3, 'Shop address / market location is required'),
  phone: BdPhoneSchema.optional(),
  binNumber: z.string().optional(),
  primaryOutletName: z.string().default('Main Counter / Showroom 01'),
  godownName: z.string().default('Central Godown'),
  businessType: z.enum(['single_store', 'multi_branch']).default('single_store'),
  permanentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  managerPin: ManagerPinSchema
});

export type OnboardingSetupInput = z.input<typeof OnboardingSetupSchema>;
export type OnboardingSetupOutput = z.output<typeof OnboardingSetupSchema>;

export const OpeningBalancesSchema = z.object({
  openingStock: MonetaryAmountSchema.default('0.00'),
  cashInDrawer: MonetaryAmountSchema.default('0.00'),
  bankBalance: MonetaryAmountSchema.default('0.00'),
  customerReceivables: MonetaryAmountSchema.default('0.00'),
  supplierPayables: MonetaryAmountSchema.default('0.00')
});

export type OpeningBalancesInput = z.input<typeof OpeningBalancesSchema>;
export type OpeningBalancesOutput = z.output<typeof OpeningBalancesSchema>;

/**
 * Phase 12: SaaS Billing & Platform Admin Schemas
 */
export const ValidateCouponSchema = z.object({
  code: z.string().min(1, 'Promo coupon code is required'),
  planCode: z.string().optional()
});

export type ValidateCouponInput = z.input<typeof ValidateCouponSchema>;
export type ValidateCouponOutput = z.output<typeof ValidateCouponSchema>;

export const BillingCheckoutSchema = z.object({
  planCode: z.enum(['starter', 'pro', 'enterprise', 'silver', 'gold', 'diamond']),
  billingCycle: z.enum(['monthly', 'yearly']),
  promoCode: z.string().optional(),
  paymentGateway: z.enum(['paystation', 'eps', 'bkash']).default('paystation')
});

export type BillingCheckoutInput = z.input<typeof BillingCheckoutSchema>;
export type BillingCheckoutOutput = z.output<typeof BillingCheckoutSchema>;

export const EmergencyPhoneMigrationSchema = z.object({
  newPhone: BdPhoneSchema,
  nidVerificationRef: z.string().min(3, 'NID verification reference is required'),
  tradeLicenseRef: z.string().optional(),
  reason: z.string().min(5, 'Reason for emergency hotline migration is required')
});

export type EmergencyPhoneMigrationInput = z.input<typeof EmergencyPhoneMigrationSchema>;
export type EmergencyPhoneMigrationOutput = z.output<typeof EmergencyPhoneMigrationSchema>;

export const UpdatePlanPriceSchema = z.object({
  monthlyPrice: MonetaryAmountSchema.optional(),
  yearlyPrice: MonetaryAmountSchema.optional()
});

export type UpdatePlanPriceInput = z.input<typeof UpdatePlanPriceSchema>;
export type UpdatePlanPriceOutput = z.output<typeof UpdatePlanPriceSchema>;

export const SuspendShopSchema = z.object({
  reason: z.string().min(3, 'Suspension reason is required')
});

export type SuspendShopInput = z.input<typeof SuspendShopSchema>;
export type SuspendShopOutput = z.output<typeof SuspendShopSchema>;

