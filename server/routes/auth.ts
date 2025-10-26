import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/User";
import { Session } from "../models/Session";
import { redisSSEManager } from "../services/RedisSSEManager";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";

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

const authenticateToken = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    (req as any).user = decoded;
    next();
  });
};

router.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = (req as any).user;
    
    await Session.findOneAndUpdate(
      { userId, sessionId },
      { isActive: false }
    );

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

    redisSSEManager.sendToUserExceptSession(userId, sessionId, 'logout-all', {
      message: 'You have been logged out from all devices',
      timestamp: new Date().toISOString()
    });

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

router.get("/events", (req: Request, res: Response) => {
  const token = req.query.token as string;
  
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId, sessionId } = decoded as { userId: string; sessionId: string };
    console.log(`🔌 SSE: New connection request from user ${userId}, session ${sessionId}`);
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);
    
    redisSSEManager.addClient(userId, sessionId, res);
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
});

export default router;