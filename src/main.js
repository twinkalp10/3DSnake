import './style.css';
import * as BABYLON from '@babylonjs/core';

// ===== GAME CONFIGURATION =====
const GRID_SIZE = 1; // Size of each grid cell in 3D world
const GRID_WIDTH = 20; // Number of cells horizontally
const GRID_HEIGHT = 20; // Number of cells vertically

// ===== BABYLON.JS SETUP =====
const canvas = document.getElementById('gameCanvas');
let engine = new BABYLON.Engine(canvas, true);
let currentScene = new BABYLON.Scene(engine);
// Camera - positioned to look down at the game board
const camera = new BABYLON.FreeCamera(
  'camera',
  new BABYLON.Vector3(0, 12, -8), // Higher up and back for better view
  currentScene
);

const overlay = document.getElementById('overlay');

function setGameState(state) {
  gameState = state;
  if (state === 'start') {
    overlay.innerHTML = 'Press any key to Start';
    overlay.style.display = 'block';
  } else if (state === 'gameover') {
    overlay.innerHTML = 'Game Over! Press any key to Restart';
    overlay.style.display = 'block';
  } else {
    overlay.style.display = 'none';
  }
}

// Point camera at the center of our future game board
camera.setTarget(
  new BABYLON.Vector3(GRID_WIDTH / 2, 0, GRID_HEIGHT / 2)
);

// Add light
const light = new BABYLON.HemisphericLight(
  'light',
  new BABYLON.Vector3(0, 1, 0),
  currentScene
);
light.intensity = 0.8;

// ===== CREATE GAME BOARD =====
// Make the ground match our grid size
const ground = BABYLON.MeshBuilder.CreateGround(
  'gameBoard',
  { width: GRID_WIDTH, height: GRID_HEIGHT },
  currentScene
);

// Position the ground so grid coordinates start at (0,0)
ground.position = new BABYLON.Vector3(
  GRID_WIDTH / 2,
  0,
  GRID_HEIGHT / 2
);

// Style the game board
const groundMaterial = new BABYLON.StandardMaterial(
  'groundMaterial',
  currentScene
);
groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.1); // Dark green like classic Snake
ground.material = groundMaterial;

// ===== HELPER FUNCTIONS =====

// Convert grid coordinates (0,1,2...) to 3D world coordinates
function gridToWorld(gridX, gridY) {
  return new BABYLON.Vector3(
    gridX + 0.5, // Add 0.5 to center the object in the grid cell
    0.5, // Height above ground
    gridY + 0.5
  );
}

// ===== GAME STATE =====
let snake = [
  { x: 7, y: 7 }, // Snake starts in the center of the grid
];
let direction = { x: 1, y: 0 }; // Moving right initially
let foodMesh = null;
// Arrays to hold our 3D objects
let snakeMeshes = [];
const GAME_SPEED = 400;
let gameLoop = null;
let food = { x: 10, y: 10 };
let gameState = 'start'; // Possible states: 'start', 'playing', 'gameover'
let score = 0;

// ===== HELPER FUNCTIONS =====

// Create a single snake segment
function createSnakeSegment(gridX, gridY, isHead = false) {
  const segment = BABYLON.MeshBuilder.CreateBox(
    'snakeSegment',
    { size: 0.8 }, // Slightly smaller than grid cell
    currentScene
  );

  // Position it on the grid
  segment.position = gridToWorld(gridX, gridY);

  // Create material
  const material = new BABYLON.StandardMaterial(
    'snakeMaterial',
    currentScene
  );

  if (isHead) {
    // Head is brighter green
    material.diffuseColor = new BABYLON.Color3(0, 1, 0.5);
    material.emissiveColor = new BABYLON.Color3(0, 0.2, 0.1); // Slight glow
  } else {
    // Body is darker green
    material.diffuseColor = new BABYLON.Color3(0, 0.7, 0.2);
  }

  segment.material = material;
  return segment;
}

// Update the visual representation of the snake
function updateSnakeVisual() {
  // Remove old snake segments
  snakeMeshes.forEach((mesh) => mesh.dispose());
  snakeMeshes = [];

  // Create new segments for current snake positions
  snake.forEach((segment, index) => {
    const isHead = index === 0; // First segment is the head
    const mesh = createSnakeSegment(segment.x, segment.y, isHead);
    snakeMeshes.push(mesh);
  });
}

// ===== Start Game =====
function startGame() {
  snake = [{ x: 5, y: 5 }];
  direction = { x: 1, y: 0 };
  food = getRandomFood();
  createFoodMesh();
  score = 0;
  setGameState('playing');
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(gameTick, GAME_SPEED);
}

// ===== End Game =====
function endGame() {
  setGameState('gameover');
  clearInterval(gameLoop);
  score = 0; // reset score
  updateScoreDisplay(); // update UIc
  console.log('Game Over!');
}

function gameTick() {
  if (gameState !== 'playing') return;

  const head = snake[0];
  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  // --- Wall Collision ---
  if (
    newHead.x < 0 ||
    newHead.x >= GRID_WIDTH ||
    newHead.y < 0 ||
    newHead.y >= GRID_HEIGHT
  ) {
    return endGame();
  }

  // --- Self Collision ---
  if (
    snake.some(
      (segment) => segment.x === newHead.x && segment.y === newHead.y
    )
  ) {
    return endGame();
  }

  // --- Eating Food ---
  if (newHead.x === food.x && newHead.y === food.y) {
    snake.unshift(newHead); // grow
    food = getRandomFood(); // new food
    updateFoodVisual();
    score++; // increase score
    updateScoreDisplay();
  } else {
    snake.unshift(newHead); // move
    snake.pop(); // keep same length
  }

  updateSnakeVisual();
}

// ===== Score Display =====
function updateScoreDisplay() {
  document.getElementById('scoreBoard').innerText = `Score: ${score}`;
}

function updateFoodVisual() {
  if (!foodMesh) return;
  foodMesh.position = gridToWorld(food.x, food.y);
}

function createFoodMesh() {
  if (foodMesh) foodMesh.dispose();

  foodMesh = BABYLON.MeshBuilder.CreateBox(
    'food',
    { size: 0.8 },
    currentScene
  );
  const material = new BABYLON.StandardMaterial(
    'foodMat',
    currentScene
  );
  material.diffuseColor = new BABYLON.Color3(1, 0, 0); // red
  foodMesh.material = material;

  updateFoodVisual();
}

// ===== Random Food =====
function getRandomFood() {
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1, // avoids 0 and GRID_WIDTH-1
      y: Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1, // avoids 0 and GRID_HEIGHT-1
    };
  } while (
    snake.some(
      (segment) => segment.x === newFood.x && segment.y === newFood.y
    )
  );
  return newFood;
}

// Initialize the snake visual
updateSnakeVisual();
setInterval(gameTick, GAME_SPEED);

// ===== INPUT HANDLING =====
window.addEventListener('keydown', (e) => {
  if (gameState === 'start' || gameState === 'gameover') {
    startGame();
    return;
  }

  if (gameState !== 'playing') return;
  if (e.key === 'ArrowUp' && direction.y === 0)
    direction = { x: 0, y: 1 };
  if (e.key === 'ArrowDown' && direction.y === 0)
    direction = { x: 0, y: -1 };
  if (e.key === 'ArrowLeft' && direction.x === 0)
    direction = { x: -1, y: 0 };
  if (e.key === 'ArrowRight' && direction.x === 0)
    direction = { x: 1, y: 0 };
});

console.log('Controls ready! Use arrow keys to change direction');
console.log('Current direction:', direction);

// Render loop
engine.runRenderLoop(() => {
  if (currentScene) {
    currentScene.render();
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  engine.resize();
});
