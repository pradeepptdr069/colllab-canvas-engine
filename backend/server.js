const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const CanvasSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  elements: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
});
const Canvas = mongoose.model("Canvas", CanvasSchema);

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      try {
        const saved = await Canvas.findOne({ roomId });
        rooms[roomId] = saved ? saved.elements : [];
      } catch (e) {
        rooms[roomId] = [];
      }
    }
    socket.emit("init-canvas", rooms[roomId]);
  });

  socket.on("draw-stroke", ({ roomId, stroke }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(stroke);
    socket.to(roomId).emit("receive-stroke", stroke);
  });

  socket.on("clear-canvas", async (roomId) => {
    rooms[roomId] = [];
    socket.to(roomId).emit("clear-canvas");
    try {
      await Canvas.findOneAndUpdate({ roomId }, { elements: [] }, { upsert: true });
    } catch (e) {}
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));