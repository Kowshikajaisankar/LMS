import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/mongodb.js';
import { clerkWebhooks } from './controllers/webhooks.js';

const app = express();

app.use(cors());
app.use(express.json());

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error connecting to DB or starting server:", err);
  }
};

startServer();

app.get('/', (req, res) => res.send("API Working"));
app.post('/clerk', clerkWebhooks);

const PORT = process.env.PORT || 5000;