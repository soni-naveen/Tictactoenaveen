const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const app = express();
const server = createServer(app);
const io = new Server(server);

// Serve static files from the current directory
app.use("/", express.static(__dirname));

// Serve index.html file for the root URL
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

const rooms = {}; // Object to store rooms and their details

// Function to generate a random room ID
function generateRoomId() {
  return Math.random().toString(36).slice(2, 10);
}

// Handle socket connection
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle create room event
  socket.on("createRoom", () => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      players: [socket.id],
      boardState: Array(9).fill(null),
      XTurn: true,
      XWins: 0,
      OWins: 0,
    };
    socket.join(roomId);
    socket.emit("roomCreated", roomId);
  });

  // Handle join room event
  socket.on("joinRoom", (roomId) => {
    if (rooms[roomId] && rooms[roomId].players.length < 2) {
      rooms[roomId].players.push(socket.id);
      socket.join(roomId);
      io.to(roomId).emit("playerJoined", socket.id);
      if (rooms[roomId].players.length === 2) {
        setTimeout(() => {
          io.to(roomId).emit("gameStarted");
          if (!rooms[roomId].boardState) {
            rooms[roomId].boardState = Array(9).fill(null);
            rooms[roomId].XTurn = true;
            rooms[roomId].XWins = 0;
            rooms[roomId].OWins = 0;
          }
        }, 2000);
      }
    } else {
      socket.emit("roomNotAvailable");
    }
  });

  // Handle player moved event
  socket.on("playerMoved", (data) => {
    const { sqIdx, moverId } = data;
    const roomId = getRoomIdByPlayerId(moverId);
    if (roomId) {
      const room = rooms[roomId];
      const move = room.XTurn ? "X" : "O";
      room.boardState[sqIdx] = move;
      room.XTurn = !room.XTurn;
      data.move = move;
      io.to(roomId).emit("serverRecdMove", data);

      setTimeout(() => {
        const winner = checkWin(room.boardState);
        const gameOver = checkGameOver(room.boardState);

        if (winner) {
          io.to(roomId).emit("gameOver", {
            winner,
            message: `Player ${winner} has won!`,
          });
          resetGame(winner, roomId);
          io.to(roomId).emit("updateLeaderboard", {
            XWins: room.XWins,
            OWins: room.OWins,
          });
        } else if (gameOver) {
          io.to(roomId).emit("gameOver", { message: "It's a draw!" });
          resetGame(null, roomId);
          io.to(roomId).emit("updateLeaderboard", {
            XWins: room.XWins,
            OWins: room.OWins,
          });
        }
      }, 500);
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Function to get the room ID by player ID
function getRoomIdByPlayerId(playerId) {
  for (const roomId in rooms) {
    if (rooms[roomId].players.includes(playerId)) {
      return roomId;
    }
  }
  return null;
}

// Function to check for a win in the game board state
function checkWin(boardState) {
  const winningPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let pattern of winningPatterns) {
    const [a, b, c] = pattern;
    if (
      boardState[a] &&
      boardState[a] === boardState[b] &&
      boardState[a] === boardState[c]
    ) {
      return boardState[a];
    }
  }
  return null;
}

// Function to check if the game is over
function checkGameOver(boardState) {
  if (checkWin(boardState)) {
    return true; // A player has won
  }
  if (!boardState.includes(null)) {
    return true; // It's a draw
  }
  return false; // The game is still ongoing
}

// Function to reset the game state for a room
function resetGame(winner, roomId) {
  const room = rooms[roomId];
  room.boardState = Array(9).fill(null);
  room.XTurn = true;
  if (winner === "X") {
    room.XWins++;
  } else if (winner === "O") {
    room.OWins++;
  }
}

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
