import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import bankAccountsRouter from './routes/bankAccounts';
import productsRouter from './routes/products';
import shopsRouter from './routes/shops';
import checkoutRouter from './routes/checkout';
import paymentRouter from './routes/payment';
import { uploadRouter } from './routes/upload';

const app = express();

app.use(cors());
app.use(express.json());

// Routes Connection
app.use('/api/auth', authRouter);
app.use('/api/bank-accounts', bankAccountsRouter);
app.use('/api/products', productsRouter);
app.use('/api/shops', shopsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/upload', uploadRouter);

const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/healthz', healthHandler);

export default app;

