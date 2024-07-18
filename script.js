// Initialize the socket connection to the server
const socket = io();

// Select the DOM elements for leaderboard and game board
const leaderboard = document.querySelector("#leaderboard");
const board = document.querySelector("#board");
const clickedSqs = [];

// Function to create the game board dynamically
function createBoard(n) {
  for (let i = 0; i < n * n; i++) {
    const div = document.createElement("div");
    div.classList.add("square");
    div.setAttribute("data-idx", i);
    board.appendChild(div);
  }
  // Set board display to grid and define the grid template
  board.style.display = "grid";
  board.style.gridTemplateColumns = `repeat(${n},1fr)`;
  board.style.gridTemplateRows = `repeat(${n},1fr)`;
  clickedSqs.push(false);
}

// Create the initial game board
createBoard(3);

// Select the DOM elements for room ID input and buttons
const roomIdInput = document.querySelector("#roomId");
const createRoomBtn = document.querySelector("#createRoom");
const joinRoomBtn = document.querySelector("#joinRoom");
const roomStatus = document.querySelector("#roomStatus");

// Event listener to handle create room button click
createRoomBtn.addEventListener("click", () => {
  socket.emit("createRoom");
});

// Event listener to handle join room button click
joinRoomBtn.addEventListener("click", () => {
  const roomId = roomIdInput.value;
  if (roomId) {
    socket.emit("joinRoom", roomId);
    // roomIdInput.value = "";
  } else {
    roomStatus.textContent = "Please enter a room ID";
  }
});

// Listen for roomCreated event from the server
socket.on("roomCreated", (roomId) => {
  roomStatus.textContent = `Room created: ${roomId}`;
});

// Listen for playerJoined event from the server
socket.on("playerJoined", (playerId) => {
  if (playerId === socket.id) {
    roomStatus.textContent = "You joined the room";
  } else {
    roomStatus.textContent = "Another player joined the room";
  }
});

// Listen for gameStarted event from the server
socket.on("gameStarted", () => {
  roomStatus.textContent = "Game Started!";
});

// Listen for roomNotAvailable event from the server
socket.on("roomNotAvailable", () => {
  roomStatus.textContent = "Room not available or already full";
});

// Listen for gameOver event from the server
socket.on("gameOver", (data) => {
  const { message } = data;
  alert(message);
  resetBoard();
});

// Listen for updateLeaderboard event from the server
socket.on("updateLeaderboard", (data) => {
  const { XWins, OWins } = data;
  leaderboard.innerHTML = `X wins: ${XWins},&nbsp; O wins: ${OWins}`;
});

// Function to reset the game board
function resetBoard() {
  board.innerHTML = "";
  createBoard(3);
  moveLocked = false;
}

let moveLocked = false;

// Event listener for board clicks
board.onclick = function (event) {
  const clicked = event.target;
  if (moveLocked) return alert("Not your move!");
  if (!clicked.matches(".square")) return;
  const idx = clicked.getAttribute("data-idx");
  if (clickedSqs[idx]) return;
  socket.emit("playerMoved", { sqIdx: idx, moverId: socket.id });
  moveLocked = true;
};

// Listen for serverRecdMove event from the server
socket.on("serverRecdMove", (data) => {
  const { sqIdx, move, moverId } = data;
  const square = document.querySelector(`[data-idx="${sqIdx}"]`);
  square.innerText = move;
  leaderboard.click();
  if (moverId !== socket.id) moveLocked = false;
});
