# Realtime Collaborative Workspace

A scalable real-time collaborative document editor that enables multiple users to edit shared documents simultaneously with low-latency synchronization, presence tracking, and automatic persistence.

---

## 🚀 Features

- **Real-time Sync**: Collaborative editing powered by Socket.IO and Redis.
- **RBAC**: Strict Role-Based Access Control (OWNER, EDITOR, VIEWER).
- **Auto-Persistence**: Intelligent debounced saving to MongoDB.
- **Version History**: Track changes and save specific document versions.
- **Scalability**: Horizontal scaling support via Redis Pub/Sub.

---

## 🛠 Tech Stack

### Frontend
- React.js, Tailwind CSS, Framer Motion, Socket.IO Client

### Backend
- Node.js, Express.js, Socket.IO, Redis (Adapter & Pub/Sub)

### Database
- MongoDB (Mongoose)

---

## 📦 Deployment

### Backend (Render)
1. Create a new **Web Service** on Render.
2. Configure Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `REDIS_URL`: Your Redis instance URL.
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secure random keys.
   - `CLIENT_URL`: Your frontend URL (e.g., `https://yourapp.vercel.app`).
   - `PORT`: `5001` (or Render will provide one).
3. Build: `npm install` | Start: `node src/index.js`

### Frontend (Vercel)
1. Import repository to Vercel.
2. Configure Environment Variables:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://your-backend.onrender.com`
3. Build: `npm run build` | Output: `dist`

---

## 💻 Local Development

1. **Install Dependencies**:
   ```bash
   # In root, client, and server
   npm install
   ```

2. **Configure Environment**:
   - `server/.env`: Set `MONGO_URI`, `REDIS_URL`, etc.
   - `client/.env`:
     ```text
     VITE_API_URL=http://localhost:5001/api
     VITE_SOCKET_URL=http://localhost:5001
     ```

3. **Start Servers**:
   - Backend: `cd server && node src/index.js`
   - Frontend: `cd client && npm run dev`

---

## 🏗 Architecture

The system uses a **REST-first loading strategy** for reliability. 
1. Client fetches document metadata via REST.
2. WebSocket connection is established for real-time deltas.
3. Redis synchronizes events across server instances.
4. Changes are debounced and persisted to MongoDB.

---

&copy; 2026 collab.io - build the future of work
