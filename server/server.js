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

app.use(cors());

// Clerk auth middleware
app.use(clerkMiddleware());

// Clerk webhooks (raw parser required)
app.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhooks);

// ✅ Add body parsers
app.use(express.urlencoded({ extended: true })); // Required for form-data
app.use(express.json());

// Health check
app.get('/', (req, res) => res.send("API Working ✅"));

app.use((req, res, next) => {
  console.log(`🔎 Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});


// Register Educator routes
app.use('/api/educator', educatorRouter);
app.use('/api/course',courseRouter);
app.use('/api/user',userRouter);
app.post('/stripe',express.raw({type: 'application/json'}), stripeWebhooks);

// Catch-all
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
