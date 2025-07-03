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
import multer from 'multer';

// App setup
const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB and Cloudinary
await connectDB();
await connectCloudinary();

// Multer setup for image uploads
const storage = multer.diskStorage({
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// CORS
app.use(cors());

// =====================
// ✅ Webhook Routes FIRST (MUST USE raw parser)
// =====================
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);
app.post('/api/webhooks/clerk', express.raw({ type: '*/*' }), clerkWebhooks);

// =====================
// ✅ Clerk Middleware (Authentication)
// =====================
app.use(clerkMiddleware); // ✅ FIXED

// =====================
// ✅ Normal Middleware AFTER raw ones
// =====================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =====================
// ✅ Routes
// =====================
app.get('/', (req, res) => res.send("✅ API Working"));

app.use((req, res, next) => {
  console.log(`📥 Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/educator', upload.single('image'), educatorRouter);
app.use('/api/course', courseRouter);
app.use('/api/user', userRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: '❌ Not Found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
