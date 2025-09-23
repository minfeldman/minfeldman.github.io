function throttle(callback, limit) {
    let waiting = false;
    return function() {
        if (!waiting) {
            callback.apply(this, arguments);
            waiting = true;
            setTimeout(function() {
                waiting = false;
            }, limit);
        }
    };
}

// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
    // Mouse events for desktop
    document.addEventListener('mousemove', throttle(function(e) {
        // Use pageX/pageY for accurate positioning relative to document (includes scroll)
        createSparkle(e.pageX, e.pageY);

        if (Math.random() > 0.7) { // Slightly reduced probability for better performance
            setTimeout(() => {
                createSparkle(e.pageX, e.pageY);
            }, Math.random() * 50 + 20); // Random delay between 20-70ms
        }
    }, 16)); // ~60fps throttling

    // Touch events for mobile/tablet
    document.addEventListener('touchmove', throttle(function(e) {
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            createSparkle(touch.pageX, touch.pageY);

            if (Math.random() > 0.8) { // Lower probability for touch
                setTimeout(() => {
                    createSparkle(touch.pageX, touch.pageY);
                }, Math.random() * 30 + 10);
            }
        }
    }, 32)); // Lower frequency for touch
}

function createSparkle(x, y) {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Add random offset to position
    const offsetX = Math.random() * 16 - 8;
    const offsetY = Math.random() * 16 - 8;
    const sparkleX = x + offsetX;
    const sparkleY = y + offsetY;

    // Bounds checking - ensure sparkle appears within viewport
    if (sparkleX < 0 || sparkleX > viewportWidth || sparkleY < 0 || sparkleY > viewportHeight) {
        return; // Don't create sparkle if it's outside viewport
    }

    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';

    const baseSize = Math.random() * 6 + 6; // 6px to 12px
    sparkle.style.width = baseSize + 'px';
    sparkle.style.height = baseSize + 'px';

    // Use precise positioning with page coordinates
    sparkle.style.left = sparkleX + 'px';
    sparkle.style.top = sparkleY + 'px';

    const colors = ['#ffcce6', '#ffd6eb', '#ffe0f0', '#ffebf5', '#ffc0dd'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Create diagonal sparkle elements
    const diag1 = document.createElement('div');
    diag1.style.position = 'absolute';
    diag1.style.width = '8px';
    diag1.style.height = '2px';
    diag1.style.backgroundColor = randomColor;
    diag1.style.transform = 'rotate(45deg)';
    diag1.style.left = '50%';
    diag1.style.top = '50%';
    diag1.style.transformOrigin = 'center';
    diag1.style.marginLeft = '-4px';
    diag1.style.marginTop = '-1px';

    const diag2 = document.createElement('div');
    diag2.style.position = 'absolute';
    diag2.style.width = '8px';
    diag2.style.height = '2px';
    diag2.style.backgroundColor = randomColor;
    diag2.style.transform = 'rotate(-45deg)';
    diag2.style.left = '50%';
    diag2.style.top = '50%';
    diag2.style.transformOrigin = 'center';
    diag2.style.marginLeft = '-4px';
    diag2.style.marginTop = '-1px';

    sparkle.appendChild(diag1);
    sparkle.appendChild(diag2);

    document.body.appendChild(sparkle);

    // More robust cleanup
    const cleanup = () => {
        if (sparkle && sparkle.parentNode) {
            sparkle.parentNode.removeChild(sparkle);
        }
    };

    // Set timeout for cleanup
    setTimeout(cleanup, 600);

    // Also clean up if sparkle is no longer in DOM (safety net)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node === sparkle) {
                    cleanup();
                    observer.disconnect();
                }
            });
        });
    });

    if (document.body) {
        observer.observe(document.body, { childList: true });
    }
}