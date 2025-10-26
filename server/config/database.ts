import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/logout-all";

export async function connectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("✅ Already connected to MongoDB");
      return;
    }

    console.log("🔌 Connecting to MongoDB...");
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true
    });
    
    console.log("✅ Successfully connected to MongoDB");
    
    mongoose.connection.on('error', (error) => {
      console.error("❌ MongoDB connection error:", error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log("⚠️ MongoDB disconnected. Attempting to reconnect...");
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log("✅ MongoDB reconnected");
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("❌ Failed to connect to MongoDB:", errorMessage);
    throw error;
  }
}

export { mongoose };