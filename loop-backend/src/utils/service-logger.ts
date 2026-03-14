import { AppError } from '../middleware/error.middleware';
import { logger } from './logger';

const isPromiseLike = (value: unknown): value is Promise<unknown> => {
  return typeof value === 'object' && value !== null && 'then' in value;
};

const logServiceFailure = (
  serviceName: string,
  methodName: string,
  error: unknown
): void => {
  if (error instanceof AppError) {
    logger.warn('Service method expected failure', {
      service: serviceName,
      method: methodName,
      error: error.message,
      statusCode: error.statusCode,
      code: error.code,
    });
    return;
  }

  logger.error('Service method unexpected failure', {
    service: serviceName,
    method: methodName,
    error,
  });
};

export const instrumentServiceMethods = <T extends object>(
  service: T,
  serviceName: string
): T => {
  const prototype = Object.getPrototypeOf(service) as object | null;
  if (!prototype) {
    return service;
  }

  for (const methodName of Object.getOwnPropertyNames(prototype)) {
    if (methodName === 'constructor') {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    if (!descriptor || typeof descriptor.value !== 'function') {
      continue;
    }

    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const wrappedMethod = function (this: unknown, ...args: unknown[]): unknown {
      try {
        const result = originalMethod.apply(this, args);

        if (isPromiseLike(result)) {
          return result
            .then((value) => {
              logger.info('Service method succeeded', {
                service: serviceName,
                method: methodName,
              });
              return value;
            })
            .catch((error: unknown) => {
              logServiceFailure(serviceName, methodName, error);
              throw error;
            });
        }

        logger.info('Service method succeeded', {
          service: serviceName,
          method: methodName,
        });
        return result;
      } catch (error) {
        logServiceFailure(serviceName, methodName, error);
        throw error;
      }
    };

    Object.defineProperty(service, methodName, {
      value: wrappedMethod,
      writable: true,
      configurable: true,
    });
  }

  return service;
};
