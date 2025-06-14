import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// Three.js ball in a box
const box = document.getElementById('ball-box');
const boxWidth = box.clientWidth;
const boxHeight = box.clientHeight;

// Scene and camera
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, boxWidth, boxHeight, 0, -1000, 1000);
const renderer = new THREE.WebGLRenderer({ 
    alpha: true,
    antialias: true  // Enable antialiasing
  });
renderer.setClearColor(0x000000, 0);
renderer.setSize(boxWidth, boxHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Match device pixel ratio
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.pointerEvents = 'auto';
box.appendChild(renderer.domElement);

// Ball
const radius = 28;
let ball = null; // Will hold the loaded strawberry mesh

const loader = new GLTFLoader();
loader.load(
    'model/strawberry.gltf',
    function (gltf) {
        // Assume the first child is the mesh
        ball = gltf.scene;
        // Optionally, scale the strawberry to match the original ball size
        ball.scale.set(128, 128, 128); // Adjust as needed for your model
        scene.add(ball);

        // Set initial position
        ball.position.x = radius + Math.random() * (boxWidth - 2 * radius);
        ball.position.y = boxHeight - radius - 2;
        ball.position.z = 0;
    },
    undefined,
    function (error) {
        console.error('An error happened loading the strawberry model:', error);
    }
);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(50, 100, 75);
ambientLight.intensity = 1.0;
directionalLight.intensity = 1.5;
scene.add(directionalLight);

// Physics
let vy = 0;
let vx = (Math.random() - 0.5) * 6;
const gravity = -0.5;      
const bounce = 0.7;        // Increased from 0.5
const friction = 0.98;     // Slightly increased from 0.97
const restThreshold = 0.5; // When to consider the ball at rest

// Mouse interaction state
let isDragging = false;
let dragStart = null;       // {x, y} in scene coordinates at drag start
let lastMouse = null;       // {x, y} in scene coordinates of the last known pointer position
let dragStartTime = 0;      // Timestamp of drag start
let lastMoveTime = 0;       // Timestamp of the last mouse/touch move event

function getSceneCoords(e) {
    const rect = box.getBoundingClientRect();
    let clientX, clientY;

    if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    if (typeof clientX !== 'number' || typeof clientY !== 'number') {
        if (isDragging && lastMouse) {
            return lastMouse;
        }
        return null;
    }

    const mouseX_in_box_pixels = clientX - rect.left;
    const mouseY_from_top_pixels = clientY - rect.top;
    const sceneX = mouseX_in_box_pixels;
    const sceneY = boxHeight - mouseY_from_top_pixels;
    return { x: sceneX, y: sceneY };
}

function isOnBall(sceneX, sceneY) {
    if (sceneX === null || sceneY === null || !ball) return false;
    return Math.hypot(sceneX - ball.position.x, sceneY - ball.position.y) <= radius;
}

const canvas = renderer.domElement;

function handleDragStart(e) {
    if (e.type.startsWith('touch')) {
        // e.preventDefault(); // Consider uncommenting if page scrolls during touch
    }
    const coords = getSceneCoords(e);
    if (!coords) return;

    if (isOnBall(coords.x, coords.y)) {
        isDragging = true;
        dragStart = { x: coords.x, y: coords.y };
        lastMouse = { x: coords.x, y: coords.y };
        dragStartTime = performance.now();
        lastMoveTime = dragStartTime; // Initialize lastMoveTime
        vx = 0; // Stop current ball physics motion
        vy = 0;
    }
}

canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('touchstart', handleDragStart, { passive: true }); // Set passive: false if using preventDefault

function handleDragMove(e) {
    if (!isDragging || !ball) return;
    if (e.type.startsWith('touch')) {
        // e.preventDefault(); // Consider uncommenting if page scrolls
    }
    const coords = getSceneCoords(e);
    if (!coords) return;

    ball.position.x = coords.x;
    ball.position.y = coords.y;
    lastMouse = { x: coords.x, y: coords.y };
    lastMoveTime = performance.now(); // Update timestamp of this move
}

canvas.addEventListener('mousemove', handleDragMove);
canvas.addEventListener('touchmove', handleDragMove, { passive: true }); // Set passive: false if using preventDefault

function handleDragEnd(e) {
    if (!isDragging) return;

    const endCoords = getSceneCoords(e) || lastMouse; // Use last known position if current fails
    const releaseTime = performance.now();

    if (!endCoords || !dragStart) {
        isDragging = false; // Should not happen if drag was properly started
        return;
    }

    const totalDragTime_s = (releaseTime - dragStartTime) / 1000;    // Total duration of the drag in seconds
    const timeSinceLastMove_s = (releaseTime - lastMoveTime) / 1000; // Time since the last registered move event

    const stationaryThreshold_s = 0.1; // 100ms. If no move for this long, consider stationary.
                                       // Adjust this value to control sensitivity.

    if (timeSinceLastMove_s > stationaryThreshold_s) {
    vx = 0;
    vy = 0;
    } else {
        if (totalDragTime_s > 0.01) {
            const dx = endCoords.x - dragStart.x;
            const dy = endCoords.y - dragStart.y;
            
            // More controlled force factor
            const forceFactor = 0.03; // Reduced from 0.05
            
            // Limit maximum velocity to prevent erratic behavior
            vx = Math.min(Math.max(dx / totalDragTime_s * forceFactor, -10), 10);
            vy = Math.min(Math.max(dy / totalDragTime_s * forceFactor, -10), 10);
        } else {
            vx = 0;
            vy = 0;
        }
    
    }

    isDragging = false;
    dragStart = null;
    lastMouse = null;
    // dragStartTime and lastMoveTime will be reset/set on next drag
}

canvas.addEventListener('mouseup', handleDragEnd);
canvas.addEventListener('mouseleave', handleDragEnd); // Handle if mouse leaves canvas while dragging
canvas.addEventListener('touchend', handleDragEnd);
canvas.addEventListener('touchcancel', handleDragEnd); // Treat cancel same as end

function animate() {
    requestAnimationFrame(animate);
    if (!ball) return; // Wait for model to load
    if (!isDragging) {
        vy += gravity;
        
        // Add slight air resistance
        vx *= 0.995;
        vy *= 0.995;
        
        ball.position.y += vy;
        ball.position.x += vx;
        
        // Add rotation to simulate rolling
        if (Math.abs(vx) > 0.1) {
            ball.rotation.z -= vx * 0.02;
        }
    }

    // Floor bounce with better rest detection
    if (ball.position.y - radius < 0) {
        ball.position.y = radius;
        vy *= -bounce;
        vx *= friction;
        
        // Better rest detection
        if (Math.abs(vy) < restThreshold && ball.position.y <= radius + 0.1) {
            vy = 0;
            // Gradually slow horizontal movement when on floor
            vx *= 0.9;
            if (Math.abs(vx) < 0.1) vx = 0;
        }
    }
    // Ceiling bounce
    if (ball.position.y + radius > boxHeight) {
        ball.position.y = boxHeight - radius;
        vy *= -bounce;
    }
    // Wall bounces
    if (ball.position.x - radius < 0) {
        ball.position.x = radius;
        vx *= -bounce;
    } else if (ball.position.x + radius > boxWidth) {
        ball.position.x = boxWidth - radius;
        vx *= -bounce;
    }
    renderer.render(scene, camera);
}
animate(); 