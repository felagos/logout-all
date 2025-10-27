import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/User";
import { Session } from "../models/Session";

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

// ========== Authentication Middleware ==========
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

// ========== Validate Session Token ==========
// Esta es la validación clave: verificar que la sesión siga siendo válida
// Se llama cada vez antes de permitir una acción (como reproducir video)
const validateSessionToken = async (userId: string, sessionId: string): Promise<boolean> => {
  try {
    const session = await Session.findOne({ userId, sessionId });
    return session ? session.isActive : false;
  } catch (error) {
    console.error("Error validating session token:", error);
    return false;
  }
};

// ========== REGISTER ==========
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
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    // Crear sesión
    const sessionId = uuidv4();
    const session = new Session({
      userId: user._id.toString(),
      sessionId,
      deviceInfo: getDeviceInfo(req.headers['user-agent'] || ''),
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    await session.save();

    // Generar JWT con sessionId dentro
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, sessionId },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      sessionId,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== LOGIN ==========
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

    // Crear nueva sesión para este login
    const sessionId = uuidv4();
    const session = new Session({
      userId: user._id.toString(),
      sessionId,
      deviceInfo: getDeviceInfo(req.headers['user-agent'] || ''),
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    await session.save();

    // JWT con sessionId
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, sessionId },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Contar sesiones activas
    const activeSessions = await Session.countDocuments({
      userId: user._id.toString(),
      isActive: true
    });

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

// ========== VALIDATE SESSION (antes de reproducir contenido) ==========
// Aquí es donde se valida si la sesión sigue siendo válida
// Similar a cuando Netflix valida el token antes de reproducir
router.post("/validate-session", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = (req as any).user;

    const isValid = await validateSessionToken(userId, sessionId);

    if (!isValid) {
      return res.status(401).json({
        valid: false,
        message: "Session has been invalidated. Please sign in again.",
        reason: "logout-all"
      });
    }

    // Actualizar última actividad
    await Session.findOneAndUpdate(
      { userId, sessionId },
      { lastActivity: new Date() }
    );

    res.json({ valid: true, message: "Session is active" });
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== GET ALL SESSIONS ==========
router.get("/sessions", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    const sessions = await Session.find({ userId, isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== LOGOUT (cierra solo esta sesión) ==========
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

// ========== LOGOUT ALL (invalida todas las sesiones del usuario) ==========
// Este es el endpoint clave: cuando presionas "Sign out of all devices"
// Se invalidan todos los tokens en el servidor
// Los dispositivos se darán cuenta solo cuando intenten reproducir contenido
router.post("/logout-all", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    // Invalidar TODAS las sesiones del usuario
    await Session.updateMany(
      { userId },
      { isActive: false }
    );

    console.log(`🚪 User ${userId} logged out from all devices`);

    res.json({
      message: "You have been logged out from all devices",
      allDevicesLoggedOut: true
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
