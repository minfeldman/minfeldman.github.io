import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Scene setup
const box = document.getElementById('ball-box');
const loadingScreen = document.getElementById('loading-screen');
let boxWidth = box.clientWidth;
let boxHeight = box.clientHeight;

// Loading state tracking
let modelsLoaded = 0;
const totalModels = 2; // apple and strawberry

function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

function updateSize() {
    const newWidth = box.clientWidth;
    const newHeight = box.clientHeight;
    
    // Update stored dimensions
    boxWidth = newWidth;
    boxHeight = newHeight;
    
    camera.left = -newWidth / 2;
    camera.right = newWidth / 2;
    camera.top = newHeight / 2;
    camera.bottom = -newHeight / 2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(newWidth, newHeight);
    
    const floorY = -newHeight / 2 + radius;
    const ceilingY = newHeight / 2 - radius;
    const leftWall = -newWidth / 2 + radius;
    const rightWall = newWidth / 2 - radius;
    
    balls.forEach(ballData => {
        if (ballData.group) {
            ballData.group.position.x = Math.max(leftWall, Math.min(rightWall, ballData.group.position.x));
            ballData.group.position.y = Math.max(floorY, Math.min(ceilingY, ballData.group.position.y));
        }
    });
}

// Listen for both window resize and container size changes
window.addEventListener('resize', updateSize);

// Use ResizeObserver to detect container size changes
if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
        updateSize();
    });
    resizeObserver.observe(box);
}

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.OrthographicCamera(
    -boxWidth / 2, boxWidth / 2,
    boxHeight / 2, -boxHeight / 2,
    0.1, 1000
);
camera.position.z = 100;

const renderer = new THREE.WebGLRenderer({ 
    alpha: true,
    antialias: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(boxWidth, boxHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
box.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-5, -5, 5);
scene.add(fillLight);

// Physics setup
const radius = 50;
const gravity = -0.5;
const bounce = 0.7;
const friction = 0.98;
const restThreshold = 0.5;

// Command framework
const fruitCommands = {
    clearScene: function() {
        balls.forEach(ballData => {
            if (ballData.group) {
                scene.remove(ballData.group);
                ballData.group = null;
                ballData.model = null;
                ballData.modelWrapper = null;
            }
        });
        balls.length = 0;
    },
    
    createFruits: function(type, count, customRadius = null) {
        const fruitRadius = customRadius || radius;
        
        for (let i = 0; i < count; i++) {
            const ballData = {
                id: type,
                model: null,
                group: null,
                modelWrapper: null,
                vx: (Math.random() - 0.5) * 6,
                vy: 0,
                color: type === 'strawberry' ? 0xff4444 : 0x44ff44,
                modelPath: type === 'strawberry' ? 'berry/scene.gltf' : 'apple/scene.gltf',
                radius: fruitRadius
            };
            
            ballData.group = new THREE.Group();
            scene.add(ballData.group);
            
            loadModelWithRadius(ballData, fruitRadius, i);
            balls.push(ballData);
        }
    },
    
    minnie: function() {
        this.clearScene();
        
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
        
        modelsLoaded = 0;
        
        this.createFruits('strawberry', 30, 25);
        this.createFruits('apple', 30, 25);
        
        return `Created 30 strawberries and 30 apples with smaller radius (25px)`;
    },
    
    clear: function() {
        this.clearScene();
        return `Cleared all fruits from the scene`;
    },
    
    explode: function() {
        const centerX = 0;
        const centerY = -boxHeight / 2 - 50;
        
        balls.forEach(ballData => {
            if (!ballData.group) return;
            
            const dx = ballData.group.position.x - centerX;
            const dy = ballData.group.position.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const nx = dx / distance;
                const ny = dy / distance;
                
                const baseForce = 25;
                const distanceMultiplier = Math.min(distance * 0.3, 10);
                const totalForce = baseForce + distanceMultiplier;
                
                ballData.vx += nx * totalForce;
                ballData.vy += ny * totalForce;
            }
        });
        
        return `Exploded ${balls.length} fruits from below!`;
    }
};

// Ball data structure
const balls = [
    {
        id: 'strawberry',
        model: null,
        group: null,
        modelWrapper: null,
        vx: (Math.random() - 0.5) * 6,
        vy: 0,
        color: 0xff4444, // fallback color
        modelPath: 'berry/scene.gltf'
    },
    {
        id: 'apple',
        model: null,
        group: null,
        modelWrapper: null,
        vx: (Math.random() - 0.5) * 6,
        vy: 0,
        color: 0x44ff44, // fallback color
        modelPath: 'apple/scene.gltf'
    }
];

// Initialize groups
balls.forEach(ballData => {
    ballData.group = new THREE.Group();
    scene.add(ballData.group);
});

const textureLoader = new THREE.TextureLoader();
const loader = new GLTFLoader();

// Load models
function loadModel(ballData, index) {
    loader.load(
        ballData.modelPath,
        function (gltf) {
            ballData.model = gltf.scene;
            
            ballData.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material) {
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // First, get the original bounding box
            const originalBox = new THREE.Box3().setFromObject(ballData.model);
            const originalSize = originalBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(originalSize.x, originalSize.y, originalSize.z);
            
            // Scale the model
            const scale = (radius * 2) / maxDim;
            ballData.model.scale.set(scale, scale, scale);
            
            // IMPORTANT: Recalculate bounding box AFTER scaling
            ballData.model.updateMatrixWorld(true);
            const scaledBox = new THREE.Box3().setFromObject(ballData.model);
            const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
            
            // Center the model at origin by moving it
            ballData.model.position.sub(scaledCenter);
            
            // Create a wrapper group to ensure clean pivot point
            const modelWrapper = new THREE.Group();
            modelWrapper.add(ballData.model);
            ballData.group.add(modelWrapper);
            
            // Store reference to wrapper for easier access
            ballData.modelWrapper = modelWrapper;
            
            // Position balls side by side initially
            const spacing = radius * 3;
            ballData.group.position.x = (index - 0.5) * spacing;
            ballData.group.position.y = radius - boxHeight / 2;
            ballData.group.position.z = 0;
            
            console.log(`${ballData.id} loaded and centered. Final radius should be: ${radius}`);
            
            // Track loading progress
            modelsLoaded++;
            if (modelsLoaded >= totalModels) {
                // Add a small delay to ensure everything is ready
                setTimeout(hideLoadingScreen, 500);
            }
        },
        function (xhr) {
            console.log(`${ballData.id}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        function (error) {
            console.error(`Error loading ${ballData.id} model:`, error);
            
            // Create fallback sphere
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: ballData.color,
                roughness: 0.8,
                metalness: 0.1
            });
            
            ballData.model = new THREE.Mesh(geometry, material);
            ballData.model.castShadow = true;
            ballData.model.receiveShadow = true;
            
            // Center the fallback sphere as well
            const modelWrapper = new THREE.Group();
            modelWrapper.add(ballData.model);
            ballData.group.add(modelWrapper);
            ballData.modelWrapper = modelWrapper;
            
            // Position balls side by side initially
            const spacing = radius * 3;
            ballData.group.position.x = (index - 0.5) * spacing;
            ballData.group.position.y = radius - boxHeight / 2;
            
            // Track loading progress even for fallback models
            modelsLoaded++;
            if (modelsLoaded >= totalModels) {
                // Add a small delay to ensure everything is ready
                setTimeout(hideLoadingScreen, 500);
            }
        }
    );
}

// Load both models
balls.forEach((ballData, index) => {
    loadModel(ballData, index);
});

// Collision detection
function checkBallCollision(ball1, ball2) {
    const dx = ball1.group.position.x - ball2.group.position.x;
    const dy = ball1.group.position.y - ball2.group.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const radius1 = ball1.radius || radius;
    const radius2 = ball2.radius || radius;
    const minDistance = radius1 + radius2;
    
    if (distance < minDistance && distance > 0) {
        const nx = dx / distance;
        const ny = dy / distance;
        
        const overlap = minDistance - distance;
        const separationX = nx * overlap * 0.5;
        const separationY = ny * overlap * 0.5;
        
        ball1.group.position.x += separationX;
        ball1.group.position.y += separationY;
        ball2.group.position.x -= separationX;
        ball2.group.position.y -= separationY;
        
        const relativeVx = ball1.vx - ball2.vx;
        const relativeVy = ball1.vy - ball2.vy;
        
        const speed = relativeVx * nx + relativeVy * ny;
        
        if (speed > 0) return;
        
        const restitution = 0.8;
        const impulse = 2 * speed * restitution / 2;
        
        ball1.vx -= impulse * nx;
        ball1.vy -= impulse * ny;
        ball2.vx += impulse * nx;
        ball2.vy += impulse * ny;
        
        if (ball1.modelWrapper) {
            ball1.modelWrapper.rotation.z += (ball2.vx - ball1.vx) * 0.005;
        }
        if (ball2.modelWrapper) {
            ball2.modelWrapper.rotation.z += (ball1.vx - ball2.vx) * 0.005;
        }
    }
}

// Mouse interaction
let isDragging = false;
let draggedBall = null;
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

function getBallAtPosition(sceneX, sceneY) {
    for (let ballData of balls) {
        if (!ballData.group) continue;
        const ballRadius = ballData.radius || radius;
        const dist = Math.hypot(
            sceneX - ballData.group.position.x,
            sceneY - ballData.group.position.y
        );
        if (dist <= ballRadius) {
            return ballData;
        }
    }
    return null;
}

const canvas = renderer.domElement;

function handleDragStart(e) {
    const coords = getSceneCoords(e);
    if (!coords) return;

    const ball = getBallAtPosition(coords.x, coords.y);
    if (ball) {
        isDragging = true;
        draggedBall = ball;
        dragStart = { x: coords.x, y: coords.y };
        lastMouse = { x: coords.x, y: coords.y };
        dragStartTime = performance.now();
        lastMoveTime = dragStartTime;
        ball.vx = 0;
        ball.vy = 0;
    }
}

canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('touchstart', handleDragStart, { passive: true });

function handleDragMove(e) {
    if (!isDragging || !draggedBall || !draggedBall.group) return;
    const coords = getSceneCoords(e);
    if (!coords) return;

    draggedBall.group.position.x = coords.x;
    draggedBall.group.position.y = coords.y;
    lastMouse = { x: coords.x, y: coords.y };
    lastMoveTime = performance.now();
}

canvas.addEventListener('mousemove', handleDragMove);
canvas.addEventListener('touchmove', handleDragMove, { passive: true });

function handleDragEnd(e) {
    if (!isDragging || !draggedBall) return;

    const endCoords = getSceneCoords(e) || lastMouse;
    const releaseTime = performance.now();

    if (!endCoords || !dragStart) {
        isDragging = false;
        draggedBall = null;
        return;
    }

    const totalDragTime_s = (releaseTime - dragStartTime) / 1000;
    const timeSinceLastMove_s = (releaseTime - lastMoveTime) / 1000;
    const stationaryThreshold_s = 0.1;

    if (timeSinceLastMove_s > stationaryThreshold_s) {
        draggedBall.vx = 0;
        draggedBall.vy = 0;
    } else {
        if (totalDragTime_s > 0.01) {
            const dx = endCoords.x - dragStart.x;
            const dy = endCoords.y - dragStart.y;
            
            const forceFactor = 0.03;
            draggedBall.vx = Math.min(Math.max(dx / totalDragTime_s * forceFactor, -10), 10);
            draggedBall.vy = Math.min(Math.max(dy / totalDragTime_s * forceFactor, -10), 10);
        } else {
            draggedBall.vx = 0;
            draggedBall.vy = 0;
        }
    }

    isDragging = false;
    draggedBall = null;
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
    
    balls.forEach(ballData => {
        if (!ballData.group) return;
        
        if (!isDragging || draggedBall !== ballData) {
            ballData.vy += gravity;
            ballData.vx *= 0.995;
            ballData.vy *= 0.995;
            
            ballData.group.position.y += ballData.vy;
            ballData.group.position.x += ballData.vx;
            
            if (ballData.modelWrapper && Math.abs(ballData.vx) > 0.1) {
                ballData.modelWrapper.rotation.z -= ballData.vx * 0.01;
                ballData.modelWrapper.rotation.x -= ballData.vx * 0.005;
            }
        }
    });

    // Check ball-to-ball collisions
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            if (balls[i].group && balls[j].group) {
                checkBallCollision(balls[i], balls[j]);
            }
        }
    }

    // Check wall collisions for each ball
    balls.forEach(ballData => {
        if (!ballData.group) return;
        
        const ballRadius = ballData.radius || radius;
        const floorY = -boxHeight / 2 + ballRadius;
        const ceilingY = boxHeight / 2 - ballRadius;
        const leftWall = -boxWidth / 2 + ballRadius;
        const rightWall = boxWidth / 2 - ballRadius;

        if (ballData.group.position.y < floorY) {
            ballData.group.position.y = floorY;
            ballData.vy *= -bounce;
            ballData.vx *= friction;
            
            if (Math.abs(ballData.vy) < restThreshold && ballData.group.position.y <= floorY + 0.1) {
                ballData.vy = 0;
                ballData.vx *= 0.9;
                if (Math.abs(ballData.vx) < 0.1) ballData.vx = 0;
            }
        }
        
        if (ballData.group.position.y > ceilingY) {
            ballData.group.position.y = ceilingY;
            ballData.vy *= -bounce;
        }
        
        if (ballData.group.position.x < leftWall) {
            ballData.group.position.x = leftWall;
            ballData.vx *= -bounce;
        } else if (ballData.group.position.x > rightWall) {
            ballData.group.position.x = rightWall;
            ballData.vx *= -bounce;
        }
    });
    
    renderer.render(scene, camera);
}

animate();

// Load model with custom radius
function loadModelWithRadius(ballData, customRadius, index) {
    loader.load(
        ballData.modelPath,
        function (gltf) {
            ballData.model = gltf.scene;
            
            ballData.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material) {
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            const originalBox = new THREE.Box3().setFromObject(ballData.model);
            const originalSize = originalBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(originalSize.x, originalSize.y, originalSize.z);
            
            const scale = (customRadius * 2) / maxDim;
            ballData.model.scale.set(scale, scale, scale);
            
            ballData.model.updateMatrixWorld(true);
            const scaledBox = new THREE.Box3().setFromObject(ballData.model);
            const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
            
            ballData.model.position.sub(scaledCenter);
            
            const modelWrapper = new THREE.Group();
            modelWrapper.add(ballData.model);
            ballData.group.add(modelWrapper);
            
            ballData.modelWrapper = modelWrapper;
            
            const maxX = boxWidth / 2 - customRadius;
            const maxY = boxHeight / 2 - customRadius;
            
            ballData.group.position.x = (Math.random() - 0.5) * maxX * 1.5;
            ballData.group.position.y = (Math.random() - 0.5) * maxY * 1.5;
            ballData.group.position.z = 0;
            
            console.log(`${ballData.id} ${index + 1} loaded with radius: ${customRadius}`);
            
            modelsLoaded++;
            if (modelsLoaded >= balls.length) {
                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.style.opacity = '0';
                        setTimeout(() => {
                            loadingScreen.style.display = 'none';
                        }, 500);
                    }
                }, 500);
            }
        },
        function (xhr) {
            console.log(`${ballData.id} ${index + 1}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        function (error) {
            console.error(`Error loading ${ballData.id} ${index + 1} model:`, error);
            
            // Create fallback sphere
            const geometry = new THREE.SphereGeometry(customRadius, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: ballData.color,
                roughness: 0.8,
                metalness: 0.1
            });
            
            ballData.model = new THREE.Mesh(geometry, material);
            ballData.model.castShadow = true;
            ballData.model.receiveShadow = true;
            
            const modelWrapper = new THREE.Group();
            modelWrapper.add(ballData.model);
            ballData.group.add(modelWrapper);
            ballData.modelWrapper = modelWrapper;
            
            const maxX = boxWidth / 2 - customRadius;
            const maxY = boxHeight / 2 - customRadius;
            
            ballData.group.position.x = (Math.random() - 0.5) * maxX * 1.5;
            ballData.group.position.y = (Math.random() - 0.5) * maxY * 1.5;
            
            modelsLoaded++;
            if (modelsLoaded >= balls.length) {
                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.style.opacity = '0';
                        setTimeout(() => {
                            loadingScreen.style.display = 'none';
                        }, 500);
                    }
                }, 500);
            }
        }
    );
}

// Expose commands globally for console access
window.fruitCommands = fruitCommands;