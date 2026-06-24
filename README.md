# Realtime Collaborative Workspace

A scalable real-time collaborative document editor that enables multiple users to edit shared documents simultaneously with low-latency synchronization, presence tracking, and automatic persistence.

The application leverages WebSockets for real-time communication, Redis Pub/Sub for horizontal scalability, and MongoDB for persistent storage.

---

## Overview

The system allows multiple users to collaborate on the same document in real time. Changes made by one user are instantly propagated to other active collaborators while maintaining consistency and minimizing database writes.

---

## Features

- Real-time collaborative document editing
- Live synchronization using WebSockets
- Document-specific collaboration rooms
- User presence tracking
- Automatic document persistence
- Reconnection and synchronization support
- Version history support
- Role-based access control
- Redis Pub/Sub for multi-server synchronization
- Optimized database writes through batching and debouncing

---

## Tech Stack

### Frontend

- React.js
- Tailwind CSS
- Socket.IO Client

### Backend

- Node.js
- Express.js
- Socket.IO

### Database

- MongoDB
- Mongoose

### Caching and Scalability

- Redis
- Redis Pub/Sub

---

## Architecture

```text
                    +------------------+
                    |      Client      |
                    +------------------+
                              |
                        WebSocket/HTTP
                              |
                 +------------------------+
                 |   Node.js + Express    |
                 +------------------------+
                      |              |
                 Socket.IO        REST APIs
                      |
              +----------------+
              | Document Rooms |
              +----------------+
                      |
              +----------------+
              | Redis Pub/Sub  |
              +----------------+
                      |
              +----------------+
              |    MongoDB     |
              +----------------+
```

---

## Workflow

1. The client fetches the initial document state through REST APIs.
2. A WebSocket connection is established.
3. The user joins a document-specific room.
4. Edits are transmitted through Socket.IO events.
5. Updates are broadcast to active collaborators.
6. Changes are temporarily buffered.
7. The latest document state is periodically persisted to MongoDB.
8. Redis synchronizes events across multiple server instances.

---

## Project Structure

```text
realtime-collaborative-workspace/
│
├── client/
│   ├── src/
│   ├── components/
│   └── pages/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── sockets/
│   └── services/
│
├── docs/
└── README.md
```

---

## Database Design

### Users

```json
{
  "_id": "userId",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Documents

```json
{
  "_id": "documentId",
  "title": "System Design Notes",
  "content": "Document content",
  "ownerId": "userId",
  "updatedAt": "timestamp"
}
```

### Document Permissions

```json
{
  "documentId": "documentId",
  "userId": "userId",
  "role": "editor"
}
```

### Versions

```json
{
  "documentId": "documentId",
  "version": 5,
  "createdAt": "timestamp"
}
```

---

## Real-Time Communication

Each document corresponds to a dedicated Socket.IO room.

```javascript
socket.join(documentId);

socket.to(documentId).emit("document-update", payload);
```

Only users connected to the same document receive updates, reducing unnecessary network traffic.

---

## Performance Optimizations

- Debounced database writes
- Batched persistence operations
- Delta-based document updates
- Redis caching
- Socket.IO rooms
- Efficient MongoDB indexing
- Reduced network payload sizes

---

## Scalability

The system supports horizontal scaling using Redis Pub/Sub.

```text
                    Load Balancer
                           |
          ---------------------------------
          |               |               |
      Server 1        Server 2        Server 3
          |               |               |
          ----------- Redis ---------------
                           |
                        MongoDB
```

This architecture allows users connected to different application instances to receive real-time updates.

---

## Security

- JWT-based authentication
- Protected API routes
- Authorization checks before document access
- Role-based permissions
- Secure WebSocket connections

---

## Future Improvements

- Operational Transformation (OT)
- CRDT-based conflict resolution
- Offline editing support
- Rich text editing
- Commenting and annotations
- End-to-end encryption
- Collaborative cursors
- Activity logs
- Analytics dashboard

---

## Concepts Demonstrated

- Real-time communication
- Event-driven architecture
- WebSockets
- Redis Pub/Sub
- Database design
- Caching strategies
- Horizontal scaling
- Distributed systems
- Concurrency handling
- System design principles

---

## Learning Outcomes

This project explores the challenges involved in building scalable collaborative applications, including:

- Low-latency communication
- Data consistency
- Conflict resolution
- Efficient database operations
- Distributed state synchronization
- Scalable backend design
