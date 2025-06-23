import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/mongodb.js';
import connectCloudinary from './configs/cloudinary.js';
import { clerkMiddleware } from '@clerk/express';
import { clerkWebhooks, stripeWebhooks } from './controllers/webhooks.js';
import educatorRouter from './routes/educatorRoutes.js';
import courseRouter from './routes/courseRoutes.js';
import userRouter from './routes/userRoutes.js';

const app = express();

// Connect DB and Cloudinary
await connectDB();
await connectCloudinary();

// CORS setup
app.use(cors());

// Stripe Webhook - must come before express.json()
app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// Clerk Webhook - also uses raw body
app.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhooks);

// Clerk middleware (authentication)
app.use(clerkMiddleware());

// Body parsers (after raw routes)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health check
app.get('/', (req, res) => res.send("API Working"));

// Logger middleware
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});

// API routes
app.use('/api/educator', educatorRouter);
app.use('/api/course', courseRouter);
app.use('/api/user', userRouter);

// 404 handler (must be last)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' });
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
