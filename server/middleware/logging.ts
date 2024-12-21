import { Request, Response, NextFunction } from 'express';
import { Logger } from '../lib/logger';

const logger = new Logger({ prefix: '[API] ' });

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.group(`${req.method} ${req.url}`);
  
  logger.debug('Request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });

  // Capture the response
  const oldJson = res.json;
  res.json = function(data) {
    logger.debug('Response:', data);
    logger.groupEnd();
    return oldJson.apply(res, [data]);
  };

  next();
}; 