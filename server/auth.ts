import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

/**
 * Hash a password with scrypt and return the hash with its salt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hash
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Configure session middleware
  // Always use secure cookies since Replit uses HTTPS
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'superdupersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    },
    store: storage.sessionStore
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create the user with hashed password
      const user = await storage.createUser({
        username: req.body.username,
        email: req.body.email,
        password: await hashPassword(req.body.password),
        musicService: req.body.musicService || "spotify",
      });

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        // Explicitly save session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return next(saveErr);
          }
          console.log('Registration: Session saved successfully for user:', user.username, 'Session ID:', req.session.id);
          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.status(201).json(userWithoutPassword);
        });
      });
    } catch (err) {
      next(err);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Return user without password
        const { password, ...userWithoutPassword } = user as UserType;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as UserType;
    res.status(200).json(userWithoutPassword);
  });
}