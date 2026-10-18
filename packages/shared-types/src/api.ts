import { DomainErrorCode } from './errors.js';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: DomainErrorCode | string;
    message: string;
    details?: Array<{ field?: string; issue: string }>;
    timestamp: string;
    requestId: string;
  };
}
