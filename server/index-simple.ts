import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import authSimpleRoutes from "./routes/auth-simple";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== SIMPLE NETFLIX-STYLE AUTH ==========
// Sin WebSockets, sin SSE en tiempo real
// Solo validación de sesión cuando se intenta hacer una acción
app.use("/api/auth", authSimpleRoutes);

app.get("/health", async (req, res) => {
  try {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "Logout-All Server (Simple Mode)",
      mode: "Netflix-style (no real-time updates)",
      database: "Connected",
      description: "Session validation on content playback, no WebSocket/SSE"
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      service: "Logout-All Server",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.use("*", (req, res) => {
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
      console.log(`🚀 Simple Logout-All Server running on http://localhost:${PORT}`);
      console.log("📺 Netflix-style mode: Session validation on demand, no real-time updates");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
