import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
}

const requestContextStore = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = (requestId: string, callback: () => void): void => {
  requestContextStore.run({ requestId }, callback);
};

export const getRequestId = (): string | undefined => {
  return requestContextStore.getStore()?.requestId;
};
