import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

import { pool } from './db/pool';
import { configurePassport } from './config/passport';

// Routes
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import sellersRouter from './routes/sellers';
import enquiriesRouter from './routes/enquiries';
import sellerDashboardRouter from './routes/sellerDashboard';
import adminRouter from './routes/admin';

const app = express();
const PORT = parseInt(process.env.PORT || '8787', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.set('trust proxy', 1);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later.' } },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many auth attempts.' } },
});

app.use(globalLimiter);

// ── Body & logging ────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// ── Session ───────────────────────────────────────────────────────────────────
const PgSession = ConnectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'atprice-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: IS_PROD ? 'none' : 'lax',
  },
}));

// ── Passport ──────────────────────────────────────────────────────────────────
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/sellers', sellersRouter);
app.use('/api/v1/enquiries', enquiriesRouter);
app.use('/api/v1/seller', sellerDashboardRouter);
app.use('/api/v1/admin', adminRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  if (IS_PROD) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } });
  } else {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message, stack: err.stack } });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 AtPrice API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend:    ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

export default app;
