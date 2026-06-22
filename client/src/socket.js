import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000";

export const socket = io(SERVER_URL, {
  auth: {
    token: localStorage.getItem("accessToken"),
  },
  autoConnect: false, // We'll connect manually when we have a user
});