process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/atprice_test';
process.env.SESSION_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
