import { toast } from 'sonner';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export function handleApiError(error: unknown): void {
  let errorMessage = 'An unexpected error occurred';
  let errorCode: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    errorMessage = apiError.message || errorMessage;
    errorCode = apiError.code;
  }

  // Don't show toast for 401 errors (handled by redirect)
  if (errorMessage.includes('Unauthorized')) {
    return;
  }

  // Show user-friendly error messages
  toast.error(errorMessage, {
    description: errorCode ? `Error code: ${errorCode}` : undefined,
    duration: 5000,
  });
}

export function handleNetworkError(): void {
  toast.error('Network error', {
    description: 'Please check your internet connection and try again',
    duration: 5000,
  });
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      handleApiError(error);
    }
    return null;
  }
}

