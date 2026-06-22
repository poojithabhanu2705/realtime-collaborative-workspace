import { io } from "socket.io-client";

export const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("CONNECTED:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("CONNECT ERROR:", err);
});