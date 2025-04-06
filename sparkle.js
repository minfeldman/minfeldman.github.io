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

document.addEventListener('mousemove', throttle(function(e) {
    createSparkle(e.clientX, e.clientY);
    
    if (Math.random() > 0.6) {
        setTimeout(() => {
            createSparkle(e.clientX, e.clientY);
        }, 30);
    }
}, 20)); 

function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    
    const baseSize = Math.random() * 6 + 6; // 6px to 12px
    sparkle.style.width = baseSize + 'px';
    sparkle.style.height = baseSize + 'px';
    
    sparkle.style.left = (x + (Math.random() * 16 - 8)) + 'px';
    sparkle.style.top = (y + (Math.random() * 16 - 8)) + 'px';
    
    const colors = ['#ffcce6', '#ffd6eb', '#ffe0f0', '#ffebf5', '#ffc0dd'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const diag1 = document.createElement('div');
    diag1.style.position = 'absolute';
    diag1.style.width = '8px';
    diag1.style.height = '2px';
    diag1.style.backgroundColor = randomColor;
    diag1.style.transform = 'rotate(45deg)';
    diag1.style.left = '2px';
    diag1.style.top = '5px';
    
    const diag2 = document.createElement('div');
    diag2.style.position = 'absolute';
    diag2.style.width = '8px';
    diag2.style.height = '2px';
    diag2.style.backgroundColor = randomColor;
    diag2.style.transform = 'rotate(-45deg)';
    diag2.style.left = '2px';
    diag2.style.top = '5px';
    
    sparkle.style.setProperty('--sparkle-color', randomColor);
    
    sparkle.querySelectorAll(':before, :after').forEach(el => {
        el.style.backgroundColor = randomColor;
    });
    
    sparkle.appendChild(diag1);
    sparkle.appendChild(diag2);

    document.body.appendChild(sparkle);
    
    setTimeout(() => {
        if (sparkle && sparkle.parentNode) {
            sparkle.parentNode.removeChild(sparkle);
        }
    }, 600);
}