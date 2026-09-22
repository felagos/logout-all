import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/User";
import { Session } from "../models/Session";
import { redisSSEManager } from "../services/RedisSSEManager";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";

interface AuthTokenPayload extends jwt.JwtPayload {
  userId: string;
  sessionId: string;
}

class RevokedSessionError extends Error {}

async function validateSessionToken(token: string): Promise<AuthTokenPayload> {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.sessionId !== "string"
  ) {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }

  const activeSession = await Session.exists({
    userId: decoded.userId,
    sessionId: decoded.sessionId,
    isActive: true,
  });

  if (!activeSession) {
    throw new RevokedSessionError("Session revoked");
  }

  return decoded as AuthTokenPayload;
}

function sendAuthenticationError(error: unknown, res: Response): boolean {
  if (error instanceof RevokedSessionError) {
    res.status(401).json({ error: "Session revoked" });
    return true;
  }

  if (error instanceof jwt.JsonWebTokenError) {
    res.status(403).json({ error: "Invalid or expired token" });
    return true;
  }

  return false;
}

function getDeviceInfo(userAgent: string): string {
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Tablet')) return 'Tablet';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      name,
    });

    await user.save();

    const sessionId = uuidv4();
    const session = new Session({
      userId: user._id.toString(),
      sessionId,
      deviceInfo: getDeviceInfo(req.headers['user-agent'] || ''),
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    await session.save();

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, sessionId },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      sessionId,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const sessionId = uuidv4();
    const session = new Session({
      userId: user._id.toString(),
      sessionId,
      deviceInfo: getDeviceInfo(req.headers['user-agent'] || ''),
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    await session.save();

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, sessionId },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const activeSessions = await Session.countDocuments({ userId: user._id.toString(), isActive: true });

    res.json({
      message: "Login successful",
      token,
      sessionId,
      user: { id: user._id, email: user.email, name: user.name },
      activeSessions
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = await validateSessionToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    if (!sendAuthenticationError(error, res)) {
      next(error);
    }
  }
};

router.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = (req as any).user;
    
    await Session.findOneAndUpdate(
      { userId, sessionId, isActive: true },
      { isActive: false }
    );

    try {
      await redisSSEManager.disconnectSession(userId, sessionId);
    } catch (error) {
      console.error("Logout Redis disconnect error:", error);
    }

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout-all", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = (req as any).user;
    console.log(`🔄 Logout-all initiated by user ${userId}, session ${sessionId}`);
    
    await Session.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
    console.log(`🔄 All sessions deactivated for user ${userId}`);

    try {
      await redisSSEManager.notifyLogoutAllAndDisconnect(userId, sessionId, {
        message: 'You have been logged out from all devices',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Logout-all Redis disconnect error:", error);
    }

    res.json({ 
      message: "Successfully logged out from all devices",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sessions", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    
    const sessions = await Session.find({ userId, isActive: true })
      .select('sessionId deviceInfo ipAddress lastActivity createdAt')
      .sort({ lastActivity: -1 });

    res.json({ sessions });
  } catch (error) {
    console.error("Sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events", async (req: Request, res: Response) => {
  const token = req.query.token as string;
  
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const { userId, sessionId } = await validateSessionToken(token);
    console.log(`🔌 SSE: New connection request from user ${userId}, session ${sessionId}`);
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);
    
    void redisSSEManager.addClient(userId, sessionId, res);
  } catch (error) {
    if (!sendAuthenticationError(error, res)) {
      console.error("SSE authentication error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
