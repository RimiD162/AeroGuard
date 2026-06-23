import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import uploadsRouter from './routes/uploads';
import webhooksRouter from './routes/webhooks';
import jobsRouter from './routes/jobs';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// 1. CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()) 
    : [])
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or local server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Middleware - Parse JSON and capture raw body buffer for signature verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

// 2. Health Endpoint (matching FastAPI status style)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Route to serve test_video.mp4 for E2E simulation/automation
app.get('/test_video.mp4', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../test_video.mp4'));
});

// 3. API Routes
app.use('/api/v1/uploads', uploadsRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/jobs', jobsRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`Node.js API Gateway listening on port ${PORT}`);
});
