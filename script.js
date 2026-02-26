// 获取DOM元素
const modal = document.getElementById('gameModal');
const closeBtn = document.querySelector('.close');
const restartBtn = document.getElementById('restartBtn');

// 游戏变量
let canvas, ctx;
let gameRunning = false;
let playerTank, enemies = [], bullets = [];
let keys = {};
let score = 0;
let level = 1;

// 触屏控制变量
let touchStartX = 0;
let touchStartY = 0;
let touchControls = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false
};

// 全屏相关变量
let isFullscreen = false;

// 坦克类
class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = color;
        this.speed = isPlayer ? 3 : 1;
        this.direction = 0; // 0:上, 1:右, 2:下, 3:左
        this.isPlayer = isPlayer;
        this.health = isPlayer ? 100 : 30;
        this.shootCooldown = 0;
        this.maxShootCooldown = isPlayer ? 15 : 60;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.direction * Math.PI/2);
        
        // 绘制坦克主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 绘制炮管
        ctx.fillStyle = '#333';
        ctx.fillRect(-5, -20, 10, 25);
        
        // 绘制血条（仅玩家）
        if (this.isPlayer) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-20, -35, 40, 5);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(-20, -35, 40 * (this.health / 100), 5);
        }
        
        ctx.restore();
    }

    update() {
        if (this.isPlayer) {
            this.handleInput();
        } else {
            this.aiMove();
        }
        
        // 边界检测
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
        
        // 射击冷却
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
        
        // AI自动射击
        if (!this.isPlayer && Math.random() < 0.02 && this.shootCooldown === 0) {
            this.shoot();
        }
    }

    handleInput() {
        let moved = false;
        
        // 键盘控制
        if (keys['w'] || keys['W'] || touchControls.up) {
            this.y -= this.speed;
            this.direction = 0;
            moved = true;
        }
        if (keys['s'] || keys['S'] || touchControls.down) {
            this.y += this.speed;
            this.direction = 2;
            moved = true;
        }
        if (keys['a'] || keys['A'] || touchControls.left) {
            this.x -= this.speed;
            this.direction = 3;
            moved = true;
        }
        if (keys['d'] || keys['D'] || touchControls.right) {
            this.x += this.speed;
            this.direction = 1;
            moved = true;
        }
        
        // 射击控制（键盘或触屏）
        if ((keys[' '] || keys['Spacebar'] || touchControls.shoot) && this.shootCooldown === 0) {
            this.shoot();
        }
    }

    aiMove() {
        // 简单的AI行为
        if (Math.random() < 0.02) {
            this.direction = Math.floor(Math.random() * 4);
        }
        
        switch (this.direction) {
            case 0: this.y -= this.speed; break;
            case 1: this.x += this.speed; break;
            case 2: this.y += this.speed; break;
            case 3: this.x -= this.speed; break;
        }
    }

    shoot() {
        if (this.shootCooldown > 0) return;
        
        let bulletX, bulletY;
        let bulletDirX = 0, bulletDirY = 0;
        
        switch (this.direction) {
            case 0: // 上
                bulletX = this.x + this.width/2;
                bulletY = this.y;
                bulletDirY = -5;
                break;
            case 1: // 右
                bulletX = this.x + this.width;
                bulletY = this.y + this.height/2;
                bulletDirX = 5;
                break;
            case 2: // 下
                bulletX = this.x + this.width/2;
                bulletY = this.y + this.height;
                bulletDirY = 5;
                break;
            case 3: // 左
                bulletX = this.x;
                bulletY = this.y + this.height/2;
                bulletDirX = -5;
                break;
        }
        
        bullets.push(new Bullet(bulletX, bulletY, bulletDirX, bulletDirY, this.isPlayer));
        this.shootCooldown = this.maxShootCooldown;
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            return true; // 被摧毁
        }
        return false;
    }
}

// 子弹类
class Bullet {
    constructor(x, y, dirX, dirY, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.radius = 4;
        this.speed = 7;
        this.isPlayerBullet = isPlayerBullet;
    }

    draw() {
        ctx.fillStyle = this.isPlayerBullet ? '#ffff00' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
    }

    isOffScreen() {
        return this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height;
    }
}

// 初始化游戏
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 创建玩家坦克
    playerTank = new Tank(canvas.width/2 - 20, canvas.height - 60, '#3498db', true);
    
    // 创建敌方坦克
    spawnEnemies();
    
    // 设置触屏控制
    setupTouchControls();
    
    // 检查是否为移动端，如果是则自动进入全屏
    if (isMobileDevice()) {
        enterFullscreen();
    }
    
    // 开始游戏循环
    gameRunning = true;
    gameLoop();
}

// 检测是否为移动设备
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

// 进入全屏模式
function enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('全屏请求失败:', err);
        });
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
    }
    
    isFullscreen = true;
    updateFullscreenButton();
}

// 退出全屏模式
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
    
    isFullscreen = false;
    updateFullscreenButton();
}

// 更新全屏按钮状态
function updateFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.textContent = isFullscreen ? '退出全屏' : '全屏游戏';
    }
}

// 设置触屏控制
function setupTouchControls() {
    const canvasContainer = document.getElementById('tankGameContainer');
    
    // 创建虚拟摇杆和射击按钮
    createTouchControls();
    
    // 添加触屏事件监听
    canvasContainer.addEventListener('touchstart', handleTouchStart, false);
    canvasContainer.addEventListener('touchmove', handleTouchMove, false);
    canvasContainer.addEventListener('touchend', handleTouchEnd, false);
    
    // 防止默认的触摸行为
    canvasContainer.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    canvasContainer.addEventListener('touchmove', preventDefaultTouch, { passive: false });
}

// 防止默认触摸行为
function preventDefaultTouch(e) {
    // 允许滚动但在游戏区域内阻止
    if (e.target.closest('#tankGameContainer')) {
        e.preventDefault();
    }
}

// 创建触屏控制UI
function createTouchControls() {
    const container = document.getElementById('tankGameContainer');
    
    // 创建虚拟摇杆区域
    const joystickArea = document.createElement('div');
    joystickArea.id = 'joystickArea';
    joystickArea.innerHTML = `
        <div id="joystickBase"></div>
        <div id="joystickHandle"></div>
    `;
    
    // 创建射击按钮
    const shootButton = document.createElement('button');
    shootButton.id = 'shootButton';
    shootButton.textContent = '射击';
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.shoot = true;
    });
    shootButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.shoot = false;
    });
    
    // 创建全屏按钮（仅移动端显示）
    const fullscreenButton = document.createElement('button');
    fullscreenButton.id = 'fullscreenBtn';
    fullscreenButton.textContent = isFullscreen ? '退出全屏' : '全屏游戏';
    fullscreenButton.addEventListener('click', toggleFullscreen);
    
    container.appendChild(joystickArea);
    container.appendChild(shootButton);
    container.appendChild(fullscreenButton);
    
    // 添加触屏控制样式
    addTouchControlStyles();
}

// 切换全屏模式
function toggleFullscreen() {
    if (isFullscreen) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

// 添加触屏控制样式
function addTouchControlStyles() {
    // 移除已存在的样式
    const existingStyle = document.getElementById('touchControlStyles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'touchControlStyles';
    style.textContent = `
        #joystickArea {
            position: absolute;
            bottom: 120px;
            left: 30px;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            touch-action: none;
            z-index: 1000;
            backdrop-filter: blur(5px);
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        #joystickBase {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90px;
            height: 90px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.5);
        }
        
        #joystickHandle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3498db, #2980b9);
            transition: transform 0.05s ease-out;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.7);
        }
        
        #shootButton {
            position: absolute;
            bottom: 120px;
            right: 30px;
            width: 90px;
            height: 90px;
            border-radius: 50%;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            font-size: 18px;
            font-weight: bold;
            touch-action: manipulation;
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
            z-index: 1000;
            backdrop-filter: blur(5px);
        }
        
        #shootButton:active {
            transform: scale(0.95);
            box-shadow: 0 2px 10px rgba(231, 76, 60, 0.6);
        }
        
        #fullscreenBtn {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 45px;
            background: rgba(46, 204, 113, 0.8);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            touch-action: manipulation;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
            z-index: 1000;
        }
        
        #fullscreenBtn:active {
            transform: translateX(-50%) scale(0.95);
        }
        
        /* 桌面端隐藏触屏控制 */
        @media (min-width: 769px) {
            #joystickArea, #shootButton, #fullscreenBtn {
                display: none;
            }
        }
        
        /* 优化小屏幕显示 */
        @media (max-width: 480px) {
            #joystickArea {
                width: 120px;
                height: 120px;
                bottom: 100px;
                left: 20px;
            }
            
            #joystickBase {
                width: 75px;
                height: 75px;
            }
            
            #joystickHandle {
                width: 40px;
                height: 40px;
            }
            
            #shootButton {
                width: 75px;
                height: 75px;
                bottom: 100px;
                right: 20px;
                font-size: 16px;
            }
            
            #fullscreenBtn {
                width: 100px;
                height: 40px;
                font-size: 13px;
                bottom: 20px;
            }
        }
    `;
    document.head.appendChild(style);
}

// 触屏事件处理函数（优化版）
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    touchStartY = touch.clientY - rect.top;
    
    updateTouchControlsOptimized(touchStartX, touchStartY);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    updateTouchControlsOptimized(currentX, currentY);
}

function handleTouchEnd(e) {
    e.preventDefault();
    resetTouchControls();
}

// 优化的触屏控制更新（提高灵敏度）
function updateTouchControlsOptimized(x, y) {
    const centerX = 70; // joystickArea中心点 (140px / 2)
    const centerY = 70;
    const threshold = 15; // 降低最小触发阈值
    
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 重置所有方向
    touchControls.up = false;
    touchControls.down = false;
    touchControls.left = false;
    touchControls.right = false;
    
    // 如果移动距离超过阈值，则激活相应方向
    if (distance > threshold) {
        // 使用更精确的角度计算
        const angle = Math.atan2(deltaY, deltaX);
        const angleDeg = angle * 180 / Math.PI;
        
        // 8方向控制优化
        if (angleDeg >= -22.5 && angleDeg < 22.5) {
            touchControls.right = true; // 右
        } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
            touchControls.right = true;
            touchControls.down = true; // 右下
        } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
            touchControls.down = true; // 下
        } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
            touchControls.down = true;
            touchControls.left = true; // 左下
        } else if (angleDeg >= 157.5 || angleDeg < -157.5) {
            touchControls.left = true; // 左
        } else if (angleDeg >= -157.5 && angleDeg < -112.5) {
            touchControls.left = true;
            touchControls.up = true; // 左上
        } else if (angleDeg >= -112.5 && angleDeg < -67.5) {
            touchControls.up = true; // 上
        } else {
            touchControls.up = true;
            touchControls.right = true; // 右上
        }
        
        // 更新摇杆手柄位置（更平滑的动画）
        const handle = document.getElementById('joystickHandle');
        const maxDistance = 35; // 增加最大偏移距离
        const moveRatio = Math.min(distance / (centerX - threshold), 1);
        const moveX = Math.cos(angle) * maxDistance * moveRatio;
        const moveY = Math.sin(angle) * maxDistance * moveRatio;
        handle.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
    }
}

// 重置触屏控制
function resetTouchControls() {
    touchControls.up = false;
    touchControls.down = false;
    touchControls.left = false;
    touchControls.right = false;
    touchControls.shoot = false;
    
    // 重置摇杆手柄位置
    const handle = document.getElementById('joystickHandle');
    if (handle) {
        handle.style.transform = 'translate(-50%, -50%)';
    }
}

// 生成敌人
function spawnEnemies() {
    const enemyCount = 3 + level;
    enemies = [];
    
    for (let i = 0; i < enemyCount; i++) {
        let x, y;
        do {
            x = Math.random() * (canvas.width - 40);
            y = Math.random() * (canvas.height/3);
        } while (distance(x, y, playerTank.x, playerTank.y) < 100);
        
        enemies.push(new Tank(x, y, '#e74c3c'));
    }
}

// 计算距离
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 游戏主循环
function gameLoop() {
    if (!gameRunning) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 更新和绘制玩家坦克
    playerTank.update();
    playerTank.draw();
    
    // 更新和绘制敌方坦克
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        enemies[i].draw();
        
        // 检查敌人是否被击败
        if (enemies[i].health <= 0) {
            enemies.splice(i, 1);
            score += 100;
        }
    }
    
    // 更新和绘制子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        
        // 移除超出屏幕的子弹
        if (bullets[i].isOffScreen()) {
            bullets.splice(i, 1);
            continue;
        }
        
        // 检查碰撞
        if (bullets[i].isPlayerBullet) {
            // 玩家子弹击中敌人
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (checkCollision(bullets[i], enemies[j])) {
                    if (enemies[j].takeDamage(25)) {
                        enemies.splice(j, 1);
                        score += 100;
                    }
                    bullets.splice(i, 1);
                    break;
                }
            }
        } else {
            // 敌人子弹击中玩家
            if (checkCollision(bullets[i], playerTank)) {
                if (playerTank.takeDamage(10)) {
                    gameOver();
                    return;
                }
                bullets.splice(i, 1);
            }
        }
    }
    
    // 检查所有敌人是否被消灭
    if (enemies.length === 0) {
        level++;
        spawnEnemies();
    }
    
    // 显示游戏信息
    drawGameInfo();
    
    requestAnimationFrame(gameLoop);
}

// 碰撞检测
function checkCollision(bullet, tank) {
    return bullet.x > tank.x && 
           bullet.x < tank.x + tank.width &&
           bullet.y > tank.y && 
           bullet.y < tank.y + tank.height;
}

// 绘制游戏信息
function drawGameInfo() {
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`分数: ${score}`, 10, 25);
    ctx.fillText(`关卡: ${level}`, 10, 45);
    ctx.fillText(`生命值: ${playerTank.health}`, 10, 65);
    ctx.fillText(`剩余敌人: ${enemies.length}`, 10, 85);
    
    // 移动端显示额外信息
    if (isMobileDevice()) {
        ctx.fillText(`全屏: ${isFullscreen ? '是' : '否'}`, canvas.width - 100, 25);
    }
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', canvas.width/2, canvas.height/2 - 30);
    ctx.font = '24px Arial';
    ctx.fillText(`最终分数: ${score}`, canvas.width/2, canvas.height/2 + 20);
    ctx.fillText(isMobileDevice() ? '点击按钮重新开始' : '点击重新开始按钮继续游戏', canvas.width/2, canvas.height/2 + 60);
    ctx.textAlign = 'left';
}

// 键盘事件监听
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    // 防止空格键滚动页面
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 开始坦克游戏
function startTankGame() {
    modal.style.display = 'block';
    setTimeout(() => {
        initGame();
    }, 100);
}

// 关闭模态框
closeBtn.onclick = function() {
    modal.style.display = 'none';
    gameRunning = false;
    resetTouchControls(); // 清理触屏控制
    
    // 退出全屏
    if (isFullscreen) {
        exitFullscreen();
    }
}

// 重新开始游戏
restartBtn.onclick = function() {
    resetGame();
}

// 重置游戏
function resetGame() {
    score = 0;
    level = 1;
    bullets = [];
    resetTouchControls();
    initGame();
}

// 点击模态框外部关闭
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        gameRunning = false;
        resetTouchControls();
        
        // 退出全屏
        if (isFullscreen) {
            exitFullscreen();
        }
    }
}

// 监听全屏状态变化
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
    isFullscreen = !!document.fullscreenElement || 
                   !!document.webkitFullscreenElement || 
                   !!document.mozFullScreenElement || 
                   !!document.msFullscreenElement;
    updateFullscreenButton();
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('杨云天的AI小站已加载完成！');
});