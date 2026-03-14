import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from '../utils/request-context';

const REQUEST_ID_HEADER = 'x-request-id';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestIdHeader = req.header(REQUEST_ID_HEADER);
  const requestId = requestIdHeader && requestIdHeader.trim() ? requestIdHeader : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  runWithRequestContext(requestId, () => {
    next();
  });
};
