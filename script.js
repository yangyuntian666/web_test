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
        
        if (keys['w'] || keys['W']) {
            this.y -= this.speed;
            this.direction = 0;
            moved = true;
        }
        if (keys['s'] || keys['S']) {
            this.y += this.speed;
            this.direction = 2;
            moved = true;
        }
        if (keys['a'] || keys['A']) {
            this.x -= this.speed;
            this.direction = 3;
            moved = true;
        }
        if (keys['d'] || keys['D']) {
            this.x += this.speed;
            this.direction = 1;
            moved = true;
        }
        
        if ((keys[' '] || keys['Spacebar']) && this.shootCooldown === 0) {
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
    
    // 开始游戏循环
    gameRunning = true;
    gameLoop();
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
    ctx.fillText('点击重新开始按钮继续游戏', canvas.width/2, canvas.height/2 + 60);
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
    initGame();
}

// 点击模态框外部关闭
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        gameRunning = false;
    }
}

// 平滑滚动到锚点
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('杨云天的AI小站已加载完成！');
});