import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Three.js ball in a box
const box = document.getElementById('ball-box');
const boxWidth = box.clientWidth;
const boxHeight = box.clientHeight;

// Responsive handling
function updateSize() {
    const newWidth = box.clientWidth;
    const newHeight = box.clientHeight;
    
    // Update camera
    camera.left = -newWidth / 2;
    camera.right = newWidth / 2;
    camera.top = newHeight / 2;
    camera.bottom = -newHeight / 2;
    camera.updateProjectionMatrix();
    
    // Update renderer
    renderer.setSize(newWidth, newHeight);
    
    // Update physics bounds
    const floorY = -newHeight / 2 + radius;
    const ceilingY = newHeight / 2 - radius;
    const leftWall = -newWidth / 2 + radius;
    const rightWall = newWidth / 2 - radius;
    
    // Ensure ball stays within bounds
    if (ballGroup) {
        ballGroup.position.x = Math.max(leftWall, Math.min(rightWall, ballGroup.position.x));
        ballGroup.position.y = Math.max(floorY, Math.min(ceilingY, ballGroup.position.y));
    }
}

// Add resize listener
window.addEventListener('resize', updateSize);

// Scene setup
const scene = new THREE.Scene();
scene.background = null; // Transparent background

// Camera setup - adjusted for better view
const camera = new THREE.OrthographicCamera(
    -boxWidth / 2, boxWidth / 2,
    boxHeight / 2, -boxHeight / 2,
    0.1, 1000
);
camera.position.z = 100;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ 
    alpha: true,
    antialias: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(boxWidth, boxHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color space for textures
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
box.appendChild(renderer.domElement);

// Lighting setup - improved for better texture visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Add a subtle fill light to prevent harsh shadows
const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-5, -5, 5);
scene.add(fillLight);

// Physics variables
const radius = 40;
let ball = null;
let ballGroup = null; // Group to handle positioning
let vy = 0;
let vx = (Math.random() - 0.5) * 6;
const gravity = -0.5;
const bounce = 0.7;
const friction = 0.98;
const restThreshold = 0.5;

// Create a group for the ball (makes positioning easier)
ballGroup = new THREE.Group();
scene.add(ballGroup);

// Texture loader
const textureLoader = new THREE.TextureLoader();

// GLTF Loader
const loader = new GLTFLoader();
loader.load(
    'berry/scene.gltf',
    function (gltf) {
        ball = gltf.scene;
        
        // Traverse the model to ensure materials are set up correctly
        ball.traverse((child) => {
            if (child.isMesh) {
                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
                
                // If the model doesn't have textures, you can manually apply them
                // Uncomment and adjust the following if needed:
                /*
                if (!child.material.map) {
                    textureLoader.load('model/strawberry_texture.jpg', (texture) => {
                        texture.colorSpace = THREE.SRGBColorSpace;
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                    });
                }
                */
                
                // Ensure the material responds to lights
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });
        
        // Calculate the bounding box to get actual size
        const box = new THREE.Box3().setFromObject(ball);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Scale to match desired radius
        const scale = (radius * 2) / maxDim;
        ball.scale.set(scale, scale, scale);
        
        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        ball.position.sub(center.multiplyScalar(scale));
        
        // Add to group
        ballGroup.add(ball);
        
        // Set initial position (adjust for coordinate system)
        ballGroup.position.x = radius + Math.random() * (boxWidth - 2 * radius) - boxWidth / 2;
        ballGroup.position.y = radius - boxHeight / 2;
        ballGroup.position.z = 0;
        
        console.log('Strawberry model loaded successfully');
    },
    // Progress callback
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    // Error callback
    function (error) {
        console.error('Error loading strawberry model:', error);
        
        // Fallback: Create a simple sphere with strawberry-like appearance
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            roughness: 0.8,
            metalness: 0.1
        });
        
        ball = new THREE.Mesh(geometry, material);
        ball.castShadow = true;
        ball.receiveShadow = true;
        ballGroup.add(ball);
        
        ballGroup.position.x = radius + Math.random() * (boxWidth - 2 * radius) - boxWidth / 2;
        ballGroup.position.y = radius - boxHeight / 2;
    }
);

// Mouse interaction
let isDragging = false;
let dragStart = null;
let lastMouse = null;
let dragStartTime = 0;
let lastMoveTime = 0;

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

    const mouseX = ((clientX - rect.left) / boxWidth) * 2 - 1;
    const mouseY = -((clientY - rect.top) / boxHeight) * 2 + 1;
    
    return {
        x: mouseX * boxWidth / 2,
        y: mouseY * boxHeight / 2
    };
}

function isOnBall(sceneX, sceneY) {
    if (!ballGroup) return false;
    const dist = Math.hypot(
        sceneX - ballGroup.position.x,
        sceneY - ballGroup.position.y
    );
    return dist <= radius;
}

const canvas = renderer.domElement;

function handleDragStart(e) {
    const coords = getSceneCoords(e);
    if (!coords) return;

    if (isOnBall(coords.x, coords.y)) {
        isDragging = true;
        dragStart = { x: coords.x, y: coords.y };
        lastMouse = { x: coords.x, y: coords.y };
        dragStartTime = performance.now();
        lastMoveTime = dragStartTime;
        vx = 0;
        vy = 0;
    }
}

canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('touchstart', handleDragStart, { passive: true });

function handleDragMove(e) {
    if (!isDragging || !ballGroup) return;
    const coords = getSceneCoords(e);
    if (!coords) return;

    ballGroup.position.x = coords.x;
    ballGroup.position.y = coords.y;
    lastMouse = { x: coords.x, y: coords.y };
    lastMoveTime = performance.now();
}

canvas.addEventListener('mousemove', handleDragMove);
canvas.addEventListener('touchmove', handleDragMove, { passive: true });

function handleDragEnd(e) {
    if (!isDragging) return;

    const endCoords = getSceneCoords(e) || lastMouse;
    const releaseTime = performance.now();

    if (!endCoords || !dragStart) {
        isDragging = false;
        return;
    }

    const totalDragTime_s = (releaseTime - dragStartTime) / 1000;
    const timeSinceLastMove_s = (releaseTime - lastMoveTime) / 1000;
    const stationaryThreshold_s = 0.1;

    if (timeSinceLastMove_s > stationaryThreshold_s) {
        vx = 0;
        vy = 0;
    } else {
        if (totalDragTime_s > 0.01) {
            const dx = endCoords.x - dragStart.x;
            const dy = endCoords.y - dragStart.y;
            
            const forceFactor = 0.03;
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
}

canvas.addEventListener('mouseup', handleDragEnd);
canvas.addEventListener('mouseleave', handleDragEnd);
canvas.addEventListener('touchend', handleDragEnd);
canvas.addEventListener('touchcancel', handleDragEnd);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (!ballGroup) return;
    
    if (!isDragging) {
        vy += gravity;
        vx *= 0.995;
        vy *= 0.995;
        
        ballGroup.position.y += vy;
        ballGroup.position.x += vx;
        
        // Rotation for rolling effect
        if (ball && Math.abs(vx) > 0.1) {
            ball.rotation.z -= vx * 0.02;
            ball.rotation.x -= vx * 0.01; // Add some tumbling
        }
    }

    // Get current bounds
    const floorY = -boxHeight / 2 + radius;
    const ceilingY = boxHeight / 2 - radius;
    const leftWall = -boxWidth / 2 + radius;
    const rightWall = boxWidth / 2 - radius;

    // Floor bounce (adjusted for centered coordinates)
    if (ballGroup.position.y < floorY) {
        ballGroup.position.y = floorY;
        vy *= -bounce;
        vx *= friction;
        
        if (Math.abs(vy) < restThreshold && ballGroup.position.y <= floorY + 0.1) {
            vy = 0;
            vx *= 0.9;
            if (Math.abs(vx) < 0.1) vx = 0;
        }
    }
    
    // Ceiling bounce
    if (ballGroup.position.y > ceilingY) {
        ballGroup.position.y = ceilingY;
        vy *= -bounce;
    }
    
    // Wall bounces
    if (ballGroup.position.x < leftWall) {
        ballGroup.position.x = leftWall;
        vx *= -bounce;
    } else if (ballGroup.position.x > rightWall) {
        ballGroup.position.x = rightWall;
        vx *= -bounce;
    }
    
    renderer.render(scene, camera);
}

animate();