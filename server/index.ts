import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import authRoutes from "./routes/auth";
import { redisSSEManager } from "./services/RedisSSEManager";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

app.get("/health", async (req, res) => {
  try {
    const serverStats = await redisSSEManager.getServerStats();
    res.json({ 
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "Logout-All Server",
      database: "Connected",
      redis: "Connected",
      server: serverStats
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      service: "Logout-All Server",
      database: "Connected",
      redis: "Error",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  try {
    await connectDB();
    console.log("🔥 Database connected successfully");
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();