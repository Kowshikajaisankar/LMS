import mongoose from "mongoose";

const connectDB = async () => {
  mongoose.connection.on('connected', () => console.log('✅ Database Connected'));
  mongoose.connection.on('error', (err) => console.error('❌ DB Connection Error:', err));

  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/lms`);
  } catch (error) {
    console.error("❌ Initial DB Connection Failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
