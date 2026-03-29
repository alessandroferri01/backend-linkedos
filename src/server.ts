import app from './app';
import { ENV, validateEnv } from './config';
import { logger } from './utils';

validateEnv();

app.listen(ENV.PORT, () => {
  logger.info(`LinkedOS backend running on port ${ENV.PORT}`, {
    environment: ENV.NODE_ENV,
  });
});
