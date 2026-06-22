require("dotenv").config();

const connectDB = require("./config/db");
const { redisClient, createClient } = require("./config/redis");
const Document = require("./models/Document");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documents");
const socketAuthMiddleware = require("./middleware/socketAuthMiddleware");

const saveTimers = new Map();

const app = express();

app.use(cors({
  origin: "http://localhost:5173", // Be specific in production
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Redis Adapter setup
const subClient = createClient();

io.adapter(createAdapter(redisClient, subClient));

// Socket Auth Middleware
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.onAny((event, ...args) => {
    console.log("EVENT:", event, args);
  });

  // =========================
  // JOIN DOCUMENT
  // =========================

  socket.on("join-document", async (documentId) => {
    try {
      let document = await Document.findOne({ documentId });

      if (!document) {
        // Create new document if doesn't exist (assuming anyone can create)
        document = await Document.create({
          documentId,
          content: "",
          owner: socket.user.id,
        });
        console.log(`Created document ${documentId}`);
      }

      // Check Authorization
      const isOwner = document.owner.toString() === socket.user.id;
      const collaborator = document.collaborators.find(
        (c) => c.user.toString() === socket.user.id
      );

      if (!isOwner && !collaborator) {
        return socket.emit("error", "Unauthorized to access this document");
      }

      const role = isOwner ? "editor" : collaborator.role;
      socket.role = role;
      socket.documentId = documentId;

      await socket.join(documentId);

      await redisClient.sAdd(`document:${documentId}`, socket.id);

      const count = await redisClient.sCard(`document:${documentId}`);

      io.to(documentId).emit("presence-update", count);

      socket.emit("load-document", {
        content: document.content,
        role: role,
        ownerId: document.owner,
      });

      console.log(`${socket.id} (${role}) joined ${documentId}`);
    } catch (error) {
      console.error("Join Document Error:", error);
      socket.emit("error", "Internal server error");
    }
  });

  // =========================
  // REALTIME EDITING
  // =========================

  socket.on(
    "text-change",
    async ({ documentId, content }) => {
      // Permission Check
      if (socket.role !== "editor") return;

      console.log(
        `Server ${process.env.PORT} received edit from ${socket.id}`
      );

      // Realtime broadcast
      socket.to(documentId).emit(
        "receive-changes",
        content
      );

      // Debounced save
      if (saveTimers.has(documentId)) {
        clearTimeout(
          saveTimers.get(documentId)
        );
      }

      const timer = setTimeout(
        async () => {
          await Document.findOneAndUpdate(
            { documentId },
            { content }
          );

          console.log(
            `Saved ${documentId}`
          );

          saveTimers.delete(documentId);
        },
        2000
      );

      saveTimers.set(
        documentId,
        timer
      );
    }
  );

  // =========================
  // DISCONNECT
  // =========================

  socket.on(
  "disconnect",
  async () => {

    const documentId =
      socket.documentId;

    if (documentId) {

      await redisClient.sRem(
        `document:${documentId}`,
        socket.id
      );

      const count =
        await redisClient.sCard(
          `document:${documentId}`
        );

      io.to(documentId).emit(
        "presence-update",
        count
      );
    }

    console.log(
      `User disconnected: ${socket.id}`
    );
  }
); });

app.get("/", (req, res) => {
  res.send("Server running");
});

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
  }
}

startServer();