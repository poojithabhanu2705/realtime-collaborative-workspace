require("dotenv").config();

const connectDB = require("./config/db");
const { redisClient, createClient } = require("./config/redis");
const Document = require("./models/Document");
const Version = require("./models/Version");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

// ===================================
// ENVIRONMENT VALIDATION
// ===================================

const requiredEnv = ["MONGO_URI", "REDIS_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`CRITICAL ERROR: Environment variable ${key} is missing!`);
    process.exit(1);
  }
});

const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documents");
const socketAuthMiddleware = require("./middleware/socketAuthMiddleware");

// ===================================
// EXPRESS APP SETUP
// ===================================

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.set("trust proxy", 1); // Respect X-Forwarded-For

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Rate limiting setup
const isDev = process.env.NODE_ENV === "development";

const rateLimitHandler = (req, res, next, options) => {
  const info = {
    ip: req.ip,
    route: req.originalUrl,
    remaining: req.rateLimit?.remaining,
    resetTime: req.rateLimit?.resetTime,
    current: req.rateLimit?.current
  };
  console.warn(`[RATE-LIMIT] BLOCKED: ${JSON.stringify(info)}`);
  res.status(options.statusCode).json({
    message: options.message?.message || options.message,
    ...info
  });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: isDev ? 5000 : 20, 
  message: { message: "Too many signup/login attempts. Please try again later." },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: isDev ? 10000 : 100, 
  message: { message: "Too many requests. Please try again later." },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/documents", apiLimiter, documentRoutes);

// ===================================
// SOCKET.IO SETUP
// ===================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis Adapter for multi-instance sync
const subClient = createClient();
io.adapter(createAdapter(redisClient, subClient));

// Socket Auth Middleware
io.use(socketAuthMiddleware);

// ===================================
// IN-MEMORY STATE (per-instance)
// ===================================

// Debounced save timers per document
const saveTimers = new Map();
// Autosave intervals per document
const autosaveIntervals = new Map();
// Track save counts for auto-versioning
const saveCounts = new Map();
// Track last version time per document
const lastVersionTime = new Map();
// Pending content to save per document
const pendingContent = new Map();

const DEBOUNCE_DELAY = 2000;
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const VERSION_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const VERSION_SAVE_COUNT = 30; // or every 30 saves

// ===================================
// HELPER FUNCTIONS
// ===================================

// Get presence key for a document
function presenceKey(documentId) {
  return `presence:${documentId}`;
}

// Validate documentId format (alphanumeric, 6-30 chars)
function isValidDocumentId(documentId) {
  return typeof documentId === "string" && /^[a-zA-Z0-9_-]{4,50}$/.test(documentId);
}

// Get users in a document room from Redis
async function getRoomUsers(documentId) {
  try {
    const users = await redisClient.hGetAll(presenceKey(documentId));
    return Object.values(users).map((u) => JSON.parse(u));
  } catch (err) {
    console.error("Error getting room users:", err);
    return [];
  }
}

// Add user to document presence
async function addUserPresence(documentId, socketId, userId, username) {
  try {
    await redisClient.hSet(
      presenceKey(documentId),
      socketId,
      JSON.stringify({ userId, username, socketId, joinedAt: Date.now() })
    );
  } catch (err) {
    console.error("Error adding presence:", err);
  }
}

// Remove user from document presence
async function removeUserPresence(documentId, socketId) {
  try {
    await redisClient.hDel(presenceKey(documentId), socketId);
  } catch (err) {
    console.error("Error removing presence:", err);
  }
}

// Broadcast presence update to all users in the room
async function broadcastPresence(documentId) {
  const users = await getRoomUsers(documentId);
  // Deduplicate by userId (multi-tab support)
  const uniqueUsers = [];
  const seen = new Set();
  for (const u of users) {
    if (!seen.has(u.userId)) {
      seen.add(u.userId);
      uniqueUsers.push({ userId: u.userId, username: u.username });
    }
  }
  io.to(documentId).emit("presence-update", {
    count: uniqueUsers.length,
    users: uniqueUsers,
  });
}

// Persist document content to MongoDB
async function saveDocument(documentId, content, userId) {
  try {
    await Document.findOneAndUpdate({ documentId }, { content });

    // Track saves for auto-versioning
    const count = (saveCounts.get(documentId) || 0) + 1;
    saveCounts.set(documentId, count);

    const lastTime = lastVersionTime.get(documentId) || 0;
    const now = Date.now();

    // Auto-version every N saves or every M minutes
    if (count >= VERSION_SAVE_COUNT || now - lastTime >= VERSION_SAVE_INTERVAL) {
      await createVersion(documentId, content, userId);
      saveCounts.set(documentId, 0);
      lastVersionTime.set(documentId, now);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`Saved ${documentId} (save #${count})`);
    }
  } catch (err) {
    console.error(`Failed to save document ${documentId}:`, err);
  }
}

// Create a version snapshot
async function createVersion(documentId, content, userId) {
  try {
    const doc = await Document.findOne({ documentId });
    if (!doc) return;

    doc.currentVersion += 1;
    await doc.save();

    await Version.create({
      documentId,
      versionNumber: doc.currentVersion,
      content,
      createdBy: userId,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`Version ${doc.currentVersion} saved for ${documentId}`);
    }
  } catch (err) {
    console.error(`Failed to create version for ${documentId}:`, err);
  }
}

// Start autosave interval for a document
function startAutosave(documentId) {
  if (autosaveIntervals.has(documentId)) return;

  const interval = setInterval(async () => {
    const content = pendingContent.get(documentId);
    if (content !== undefined) {
      const userId = content.userId;
      await saveDocument(documentId, content.text, userId);
      pendingContent.delete(documentId);
    }
  }, AUTOSAVE_INTERVAL);

  autosaveIntervals.set(documentId, interval);
}

// Stop autosave for a document
function stopAutosave(documentId) {
  const interval = autosaveIntervals.get(documentId);
  if (interval) {
    clearInterval(interval);
    autosaveIntervals.delete(documentId);
  }
}

// Flush all pending saves (for graceful shutdown)
async function flushPendingSaves() {
  const promises = [];

  for (const [documentId, timer] of saveTimers.entries()) {
    clearTimeout(timer);
    saveTimers.delete(documentId);
  }

  for (const [documentId, content] of pendingContent.entries()) {
    promises.push(saveDocument(documentId, content.text, content.userId));
    pendingContent.delete(documentId);
  }

  if (promises.length > 0) {
    console.log(`Flushing ${promises.length} pending saves...`);
    await Promise.allSettled(promises);
  }
}

// ===================================
// SOCKET.IO HANDLERS
// ===================================

io.on("connection", (socket) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`User connected: ${socket.id} (${socket.user.username})`);
  }

  // Debug logging (development only)
  if (process.env.NODE_ENV !== "production") {
    socket.onAny((event, ...args) => {
      console.log("EVENT:", event);
    });
  }

  // =========================
  // JOIN DOCUMENT
  // =========================
  socket.on("join-document", async (documentId, callback) => {
    try {
      // Validate documentId
      if (!isValidDocumentId(documentId)) {
        const msg = "Invalid document ID format";
        if (typeof callback === "function") return callback({ error: msg });
        return socket.emit("error", msg);
      }

      let document = await Document.findOne({ documentId });

      if (!document) {
        document = await Document.create({
          documentId,
          title: "Untitled Document",
          content: "",
          owner: socket.user.id,
        });

        // Create initial version
        await Version.create({
          documentId,
          versionNumber: 1,
          content: "",
          createdBy: socket.user.id,
        });

        if (process.env.NODE_ENV !== "production") {
          console.log(`Created document ${documentId}`);
        }
      }

      // Authorization check
      const isOwner = document.owner.toString() === socket.user.id;
      const collaborator = document.collaborators.find(
        (c) => c.user.toString() === socket.user.id
      );

      if (!isOwner && !collaborator) {
        const msg = "Unauthorized to access this document";
        if (typeof callback === "function") return callback({ error: msg });
        return socket.emit("error", msg);
      }

      const role = isOwner ? "owner" : (collaborator ? collaborator.role : "viewer");
      socket.role = role;
      socket.documentId = documentId;

      // Leave any previous room
      if (socket.previousDocumentId && socket.previousDocumentId !== documentId) {
        await socket.leave(socket.previousDocumentId);
        await removeUserPresence(socket.previousDocumentId, socket.id);
        await broadcastPresence(socket.previousDocumentId);
      }

      await socket.join(documentId);
      socket.previousDocumentId = documentId;

      // Add to presence (with user metadata)
      await addUserPresence(documentId, socket.id, socket.user.id, socket.user.username);

      // Broadcast presence to room
      await broadcastPresence(documentId);

      // Start autosave for this document
      startAutosave(documentId);

      // Send document to client
      socket.emit("load-document", {
        content: document.content,
        title: document.title,
        role: role,
        ownerId: document.owner,
        currentVersion: document.currentVersion,
      });

      if (typeof callback === "function") callback({ success: true, role });

      if (process.env.NODE_ENV !== "production") {
        console.log(`${socket.user.username} (${role}) joined ${documentId}`);
      }
    } catch (error) {
      console.error("Join Document Error:", error);
      const msg = "Internal server error";
      if (typeof callback === "function") return callback({ error: msg });
      socket.emit("error", msg);
    }
  });

  // =========================
  // REAL-TIME EDITING
  // =========================
  socket.on("text-change", async ({ documentId, content, delta }) => {
    // Permission check
    if (socket.role !== "editor") return;

    // Validate documentId matches the room
    if (documentId !== socket.documentId) return;

    // Broadcast to other users in the room
    // Send delta if available, full content as fallback
    socket.to(documentId).emit("receive-changes", {
      content,
      delta: delta || null,
      userId: socket.user.id,
      username: socket.user.username,
    });

    // Track pending content for autosave
    pendingContent.set(documentId, { text: content, userId: socket.user.id });

    // Debounced save
    if (saveTimers.has(documentId)) {
      clearTimeout(saveTimers.get(documentId));
    }

    const timer = setTimeout(async () => {
      await saveDocument(documentId, content, socket.user.id);
      pendingContent.delete(documentId);
      saveTimers.delete(documentId);
    }, DEBOUNCE_DELAY);

    saveTimers.set(documentId, timer);
  });

  // =========================
  // TYPING INDICATORS
  // =========================
  socket.on("typing-start", (documentId) => {
    if (documentId !== socket.documentId) return;
    socket.to(documentId).emit("user-typing", {
      userId: socket.user.id,
      username: socket.user.username,
    });
  });

  socket.on("typing-stop", (documentId) => {
    if (documentId !== socket.documentId) return;
    socket.to(documentId).emit("user-stopped-typing", {
      userId: socket.user.id,
      username: socket.user.username,
    });
  });

  // =========================
  // LIVE CURSOR POSITIONS
  // =========================
  socket.on("cursor-move", ({ documentId, position }) => {
    if (documentId !== socket.documentId) return;
    socket.to(documentId).emit("cursor-update", {
      userId: socket.user.id,
      username: socket.user.username,
      position,
    });
  });

  // =========================
  // DOCUMENT TITLE UPDATE
  // =========================
  socket.on("title-change", async ({ documentId, title }) => {
    if (socket.role !== "editor") return;
    if (documentId !== socket.documentId) return;
    if (typeof title !== "string" || title.length > 200) return;

    try {
      await Document.findOneAndUpdate({ documentId }, { title });
      socket.to(documentId).emit("title-updated", { title });
    } catch (err) {
      console.error("Title update error:", err);
    }
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", async () => {
    const documentId = socket.documentId;

    if (documentId) {
      await removeUserPresence(documentId, socket.id);
      await broadcastPresence(documentId);

      // Check if room is empty — if so, stop autosave
      const users = await getRoomUsers(documentId);
      if (users.length === 0) {
        stopAutosave(documentId);

        // Flush any pending save for this document
        const content = pendingContent.get(documentId);
        if (content) {
          await saveDocument(documentId, content.text, content.userId);
          pendingContent.delete(documentId);
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`User disconnected: ${socket.id} (${socket.user?.username})`);
    }
  });
});

// ===================================
// HEALTH CHECK
// ===================================

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: require("mongoose").connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Flush pending saves
  await flushPendingSaves();

  // Stop all autosave intervals
  for (const [docId, interval] of autosaveIntervals.entries()) {
    clearInterval(interval);
  }
  autosaveIntervals.clear();

  // Close server
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ===================================
// START SERVER
// ===================================

async function startServer() {
  try {
    await connectDB();

    await redisClient.connect();
    await subClient.connect();

    console.log("Redis Connected");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup Error:", error);
    process.exit(1);
  }
}

startServer();