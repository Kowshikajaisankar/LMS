import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/mongodb.js';
import { clerkWebhooks } from './controllers/webhooks.js';

const app = express();

// Connect to MongoDB
await connectDB();

app.use(cors());

// 🛑 DO NOT use express.json() here yet
// express.raw must come BEFORE all body parsers for this route
app.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhooks);

// ✅ Now use JSON parser for other routes
app.use(express.json());

app.get('/', (req, res) => res.send("API Working"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
