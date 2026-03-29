import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ENV } from './config';
import routes from './routes';
import { errorHandler } from './middlewares';

const app = express();

// Security
app.use(helmet());
app.use(cors());

// Rate limiting globale
const globalLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Logging
if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing — webhook route must get raw body, handled in billing.routes.ts
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
