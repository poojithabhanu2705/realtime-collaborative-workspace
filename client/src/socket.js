import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000";

export const socket = io(SERVER_URL, {
  auth: {
    token: localStorage.getItem("accessToken"),
  },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
});

// Update token before each reconnect attempt
socket.on("reconnect_attempt", () => {
  socket.auth.token = localStorage.getItem("accessToken");
});