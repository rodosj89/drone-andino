// ============================================
// JUEGO DEL DRONE - HORA DE VOLAR
// ============================================

// ============================================
// VARIABLES GLOBALES
// ============================================
let soundSystem = null;
let retroMusic = null;
let lastScoreMilestone = 0;
let lastMotorSpeed = 0;

// ⚠️ IMPORTANTE: Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {

    // ============================================
    // INICIALIZAR SONIDOS Y MÚSICA
    // ============================================
    soundSystem = new DroneSoundSystem();
    soundSystem.init();

    retroMusic = new RetroMusic();
    retroMusic.init();

    const enableAudio = () => {
        if (soundSystem && soundSystem.ctx && soundSystem.ctx.state === 'suspended') {
            soundSystem.resume();
            soundSystem.playTakeoff(); // 🔊 Sonido de despegue
        }
        
        // 🎵 Iniciar música retro (volumen bajo)
        if (retroMusic) {
            retroMusic.resume();
            retroMusic.start();
        }
        
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    document.addEventListener('touchstart', enableAudio);
    
    // === OBTENER EL CANVAS ===
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('❌ No se encontró el canvas #gameCanvas');
        return;
    }

    console.log('✅ Canvas encontrado, iniciando juego...');

    const ctx = canvas.getContext('2d');

    // === CONFIGURACIÓN ===
    const CONFIG = {
        gravity: 0.25,
        lift: -5,
        speed: 4.5,
        obstacleInterval: 85,
        groundY: 250,
        droneWidth: 34,
        droneHeight: 24,
        obstacleWidth: 18,
        minObstacleHeight: 22,
        maxObstacleHeight: 62,
    };

    // === ESTADO ===
    let drone = {
        x: 80,
        y: 200,
        vy: 0,
        width: CONFIG.droneWidth,
        height: CONFIG.droneHeight,
    };

    let obstacles = [];
    let score = 0;
    let gameOver = false;
    let frame = 0;
    let animationId = null;

    // === FUNCIÓN: DIBUJAR DRONE (4 HÉLICES) ===
    function drawDrone() {
        const { x, y, width, height } = drone;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const armLength = 32;
        const motorSize = 8;
        const propSize = 18;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 200, 255, 0.15)';
        ctx.shadowBlur = 25;

        // BRAZOS
        ctx.strokeStyle = '#78909C';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 4);
        ctx.lineTo(centerX, centerY - armLength);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY + 4);
        ctx.lineTo(centerX, centerY + armLength);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX - 4, centerY);
        ctx.lineTo(centerX - armLength, centerY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX + 4, centerY);
        ctx.lineTo(centerX + armLength, centerY);
        ctx.stroke();

        // MOTORES Y HÉLICES
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 150, 255, 0.3)';

        const motorPositions = [
            { x: centerX, y: centerY - armLength },
            { x: centerX, y: centerY + armLength },
            { x: centerX - armLength, y: centerY },
            { x: centerX + armLength, y: centerY }
        ];

        motorPositions.forEach((pos, index) => {
            // Motor
            const gradient = ctx.createRadialGradient(
                pos.x - 2, pos.y - 2, 2,
                pos.x, pos.y, motorSize
            );
            gradient.addColorStop(0, '#B0BEC5');
            gradient.addColorStop(0.7, '#546E7A');
            gradient.addColorStop(1, '#37474F');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, motorSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Hélice
            const angle = frame * 0.2 + index * (Math.PI / 2);
            ctx.strokeStyle = 'rgba(200, 230, 255, 0.7)';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(100, 200, 255, 0.3)';

            for (let i = 0; i < 2; i++) {
                const a = angle + i * Math.PI;
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                const tipX = pos.x + Math.cos(a) * propSize;
                const tipY = pos.y + Math.sin(a) * propSize;
                ctx.lineTo(tipX, tipY);
                ctx.stroke();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // LED
            ctx.shadowBlur = 15;
            ctx.shadowColor = index % 2 === 0 ? 'rgba(255, 0, 0, 0.6)' : 'rgba(0, 255, 0, 0.6)';
            ctx.fillStyle = index % 2 === 0 ? '#FF1744' : '#00E676';
            ctx.beginPath();
            ctx.arc(pos.x - 3, pos.y - 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // CUERPO CENTRAL
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 200, 255, 0.2)';

        const bodyGrad = ctx.createLinearGradient(x, y, x + width, y + height);
        bodyGrad.addColorStop(0, '#4FC3F7');
        bodyGrad.addColorStop(0.5, '#0288D1');
        bodyGrad.addColorStop(1, '#01579B');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#81D4FA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 6);
        ctx.fill();
        ctx.stroke();

        // DETALLES
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#B3E5FC';
        ctx.beginPath();
        ctx.roundRect(x + width - 10, y + 4, 6, 6, 3);
        ctx.fill();

        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.arc(x + width - 7, y + 7, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4FC3F7';
        ctx.beginPath();
        ctx.arc(x + width - 7, y + 7, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const lx = x + 5 + i * 8;
            ctx.beginPath();
            ctx.moveTo(lx, y + 4);
            ctx.lineTo(lx, y + height - 4);
            ctx.stroke();
        }

        // LUCES
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.arc(x + 3, centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + width - 3, centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // === FUNCIÓN: DIBUJAR OBSTÁCULO ===
    function drawObstacle(obs) {
        const { x, y, width, height } = obs;
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, '#FF7043');
        gradient.addColorStop(1, '#D84315');
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(255, 100, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 4);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFE0B2';
        ctx.fillRect(x + 3, y + 5, 4, 6);
        ctx.fillRect(x + width - 7, y + 5, 4, 6);
        ctx.fillRect(x + 3, y + height - 12, 4, 6);
        ctx.fillRect(x + width - 7, y + height - 12, 4, 6);
    }

    // === FUNCIÓN: FONDO CON ESTRELLAS PARPADEANTES ===
    function drawBackground() {
        // === CIELO GRADIENTE ===
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#05080f');      // Cielo más oscuro arriba
        grad.addColorStop(0.3, '#0a0e1a');    // Azul muy oscuro
        grad.addColorStop(0.6, '#0f1a3a');    // Azul profundo
        grad.addColorStop(0.85, '#1a2a4a');   // Azul más claro cerca del suelo
        grad.addColorStop(1, '#0f1a3a');      // Suelo
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // === ESTRELLAS PARPADEANTES ===
        // Array de estrellas (se genera una vez y se reutiliza)
        if (!window.stars) {
            window.stars = [];
            for (let i = 0; i < 120; i++) {
                window.stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * (CONFIG.groundY - 30), // Solo en el cielo
                    size: Math.random() * 2.5 + 0.5,
                    brightness: Math.random() * 0.8 + 0.2,
                    speed: Math.random() * 0.02 + 0.005, // Velocidad de parpadeo
                    phase: Math.random() * Math.PI * 2,   // Fase inicial aleatoria
                });
            }
        }

        // Dibujar estrellas con parpadeo
        window.stars.forEach(star => {
            // Parpadeo usando seno
            const flicker = Math.sin(frame * star.speed + star.phase);
            const alpha = (flicker * 0.4 + 0.6) * star.brightness;
            
            // Brillo con glow
            const glowSize = star.size * 2.5;
            const gradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, glowSize
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
            gradient.addColorStop(0.3, `rgba(200, 220, 255, ${alpha * 0.3})`);
            gradient.addColorStop(1, `rgba(200, 220, 255, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo de la estrella (más brillante)
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });

        // === ESTRELLAS DE CRUZ (estrella fugaz) ===
        // Dibujar una estrella fugaz cada cierto tiempo
        if (!window.shootingStar) {
            window.shootingStar = {
                active: false,
                x: 0,
                y: 0,
                speed: 8,
                length: 80,
                timer: 0,
            };
        }

        const shootingStar = window.shootingStar;
        shootingStar.timer++;

        // Aparece cada 300-500 frames
        if (!shootingStar.active && shootingStar.timer > 300 + Math.random() * 200) {
            shootingStar.active = true;
            shootingStar.x = Math.random() * canvas.width * 0.6 + canvas.width * 0.1;
            shootingStar.y = Math.random() * CONFIG.groundY * 0.3;
            shootingStar.speed = 6 + Math.random() * 6;
            shootingStar.length = 60 + Math.random() * 60;
            shootingStar.timer = 0;
        }

        if (shootingStar.active) {
            // Dibujar estrella fugaz
            const grad = ctx.createLinearGradient(
                shootingStar.x, shootingStar.y,
                shootingStar.x - shootingStar.length * 0.8, 
                shootingStar.y + shootingStar.length * 0.4
            );
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.3, 'rgba(200, 220, 255, 0.4)');
            grad.addColorStop(1, 'rgba(200, 220, 255, 0)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shootingStar.x, shootingStar.y);
            ctx.lineTo(
                shootingStar.x - shootingStar.length * 0.8,
                shootingStar.y + shootingStar.length * 0.4
            );
            ctx.stroke();

            // Brillo en la cabeza
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(200, 220, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(shootingStar.x, shootingStar.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Mover estrella fugaz
            shootingStar.x -= shootingStar.speed * 0.7;
            shootingStar.y += shootingStar.speed * 0.35;

            // Desactivar cuando sale de pantalla
            if (shootingStar.x < -50 || shootingStar.y > CONFIG.groundY) {
                shootingStar.active = false;
            }
        }

        // === NUBES (capas bajas, muy sutiles) ===
        ctx.fillStyle = 'rgba(30, 60, 100, 0.08)';
        for (let i = 0; i < 4; i++) {
            const cloudX = ((i * 250 + frame * 0.2) % (canvas.width + 200)) - 100;
            const cloudY = CONFIG.groundY - 60 - i * 20;
            const cloudWidth = 120 + i * 30;
            const cloudHeight = 20 + i * 5;
            
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, cloudWidth, cloudHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Segunda parte de la nube
            ctx.beginPath();
            ctx.ellipse(cloudX + 60, cloudY - 10, cloudWidth * 0.6, cloudHeight * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // === SUELO ===
        // Base del suelo
        const groundGrad = ctx.createLinearGradient(0, CONFIG.groundY, 0, canvas.height);
        groundGrad.addColorStop(0, '#1a2a4a');
        groundGrad.addColorStop(0.3, '#152040');
        groundGrad.addColorStop(1, '#0a0e1a');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, CONFIG.groundY, canvas.width, canvas.height - CONFIG.groundY);

        // Línea de horizonte (brillo)
        ctx.fillStyle = 'rgba(100, 180, 255, 0.15)';
        ctx.fillRect(0, CONFIG.groundY, canvas.width, 2);

        // Líneas de pista (como luces LED)
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 35) {
            const offset = (frame * 0.8) % 35;
            const x = (i - offset + canvas.width) % canvas.width;
            const alpha = 0.05 + Math.sin(frame * 0.05 + i * 0.1) * 0.03 + 0.03;
            ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(x, CONFIG.groundY + 8);
            ctx.lineTo(x + 20, CONFIG.groundY + 8);
            ctx.stroke();
        }

        // Pequeñas luces en el suelo (como ciudad a lo lejos)
        for (let i = 0; i < 20; i++) {
            const lx = ((i * 43 + i * 7) % canvas.width);
            const ly = CONFIG.groundY + 15 + Math.sin(i * 1.5) * 8;
            const size = 1 + Math.sin(i * 2.3) * 0.5;
            const brightness = 0.1 + Math.sin(frame * 0.02 + i * 0.7) * 0.05 + 0.05;
            
            ctx.fillStyle = `rgba(255, 200, 100, ${brightness})`;
            ctx.shadowBlur = 5;
            ctx.shadowColor = `rgba(255, 200, 100, ${brightness * 0.3})`;
            ctx.beginPath();
            ctx.arc(lx, ly, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // === RESET ===
    function resetGame() {
        drone.y = 200;
        drone.vy = 0;
        obstacles = [];
        score = 0;
        gameOver = false;
        frame = 0;
        lastScoreMilestone = 0;
        lastMotorSpeed = 0;
        
        // 🔊 Sonido de reinicio
        if (soundSystem) {
            soundSystem.playRestart();
        }
        
        // 🎵 Reiniciar música después de 500ms
        if (retroMusic) {
            setTimeout(() => {
                retroMusic.start();
            }, 500);
        }
        
        console.log('🔄 Juego reiniciado');
    }

    // === SALTAR ===
    function jump() {
        if (gameOver) {
            resetGame();
            return;
        }
        drone.vy = CONFIG.lift;
    }

    // === UPDATE ===
    function update() {
        if (gameOver) return;

        frame++;

        drone.vy += CONFIG.gravity;
        drone.y += drone.vy;

        // Restricciones de límites
        if (drone.y < 0) {
            drone.y = 0;
            drone.vy = 0;
        }
        if (drone.y + drone.height > CONFIG.groundY) {
            drone.y = CONFIG.groundY - drone.height;
            drone.vy = 0;
        }

        // Generar obstáculos
        if (frame % CONFIG.obstacleInterval === 0) {
            const height = CONFIG.minObstacleHeight +
                Math.random() * (CONFIG.maxObstacleHeight - CONFIG.minObstacleHeight);
            obstacles.push({
                x: canvas.width,
                y: CONFIG.groundY - height,
                width: CONFIG.obstacleWidth,
                height: height,
            });
        }

        // Mover obstáculos y detectar colisiones
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= CONFIG.speed;

            if (obs.x + obs.width < 0) {
                obstacles.splice(i, 1);
                continue;
            }

            const droneRect = {
                x: drone.x,
                y: drone.y,
                w: drone.width,
                h: drone.height,
            };
            const obsRect = {
                x: obs.x,
                y: obs.y,
                w: obs.width,
                h: obs.height,
            };

            if (droneRect.x < obsRect.x + obsRect.w &&
                droneRect.x + droneRect.w > obsRect.x &&
                droneRect.y < obsRect.y + obsRect.h &&
                droneRect.y + droneRect.h > obsRect.y) {
                
                gameOver = true;
                
                // 🔊 SONIDO: CRASH
                if (soundSystem) {
                    soundSystem.playCrash();
                }
                
                // 🎵 DETENER MÚSICA
                if (retroMusic) {
                    retroMusic.stop();
                }
                
                console.log('💥 Game Over! Puntuación:', Math.floor(score));
                break;
            }
        }

        // Puntuación e hitos
        if (!gameOver) {
            score += 0.2;
            
            const currentScore = Math.floor(score);
            if (currentScore > 0 && currentScore % 100 === 0 && currentScore !== lastScoreMilestone) {
                // 🔊 SONIDO: HITO DE PUNTUACIÓN
                if (soundSystem) {
                    soundSystem.playScoreMilestone();
                }
                
                // 🎵 EFECTO EN LA MÚSICA (sube volumen momentáneamente)
                if (retroMusic) {
                    retroMusic.setVolume(0.15);
                    setTimeout(() => {
                        retroMusic.setVolume(0.08);
                    }, 400);
                }
                
                lastScoreMilestone = currentScore;
            }
        }
    }

    // === DRAW ===
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        obstacles.forEach(obs => drawObstacle(obs));
        drawDrone();

        // Puntuación
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillText(`🏆 ${Math.floor(score)}m`, 20, 40);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#FF5252';
            ctx.font = 'bold 48px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#FF0000';
            ctx.fillText('💥 GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

            ctx.fillStyle = '#fff';
            ctx.font = '22px "Segoe UI", sans-serif';
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.fillText('🔄 Haz clic o presiona espacio para reiniciar', canvas.width / 2, canvas.height / 2 + 50);
            ctx.textAlign = 'left';
        }
    }

    // === LOOP ===
    function gameLoop() {
        update();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    // === POLYFILL roundRect ===
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (r > w / 2) r = w / 2;
            if (r > h / 2) r = h / 2;
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            return this;
        };
    }

    // === EVENTOS ===
    function handleJump(e) {
        if (e.type === 'keydown') {
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                jump();
            }
        } else {
            jump();
        }
    }

    document.addEventListener('keydown', handleJump);
    canvas.addEventListener('click', handleJump);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        jump();
    });

    // === INICIAR ===
    resetGame();
    gameLoop();
    console.log('🚁 Juego iniciado correctamente!');

    // Limpieza al recargar
    window.addEventListener('beforeunload', () => {
        if (animationId) cancelAnimationFrame(animationId);
    });

}); // Fin de DOMContentLoaded