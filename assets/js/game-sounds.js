// ============================================
// SISTEMA DE SONIDOS + MÚSICA RETRO
// Compatible con todos los efectos
// ============================================

// ============================================
// 1. SISTEMA DE SONIDOS (EFECTOS)
// ============================================

class DroneSoundSystem {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.volume = 0.3;
        this.sounds = {};
    }

    // === INICIALIZAR ===
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🎵 Sistema de sonidos inicializado');
        } catch (e) {
            console.warn('⚠️ No se pudo inicializar el audio:', e);
        }
    }

    // === RESUMEN ===
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // === SONIDO: CRASH ===
    playCrash() {
        if (!this.initialized) return;
        this.resume();

        const now = this.ctx.currentTime;

        // 1. Ruido blanco para el impacto
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        // 2. Tono grave de impacto
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.15, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        // 3. Efecto de "metal" (tono agudo)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.3);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.05, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        // Iniciar todos los sonidos
        noise.start(now);
        osc.start(now);
        osc2.start(now);

        noise.stop(now + 0.3);
        osc.stop(now + 0.4);
        osc2.stop(now + 0.3);

        console.log('💥 Crash!');
    }

    // === SONIDO: REINICIO ===
    playRestart() {
        if (!this.initialized) return;
        this.resume();

        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // === SONIDO: HITO DE PUNTUACIÓN ===
    playScoreMilestone() {
        if (!this.initialized) return;
        this.resume();

        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0.04, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.1);
        });
    }

    // === SONIDO: DESPEGUE ===
    playTakeoff() {
        if (!this.initialized) return;
        this.resume();

        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
    }

    // === DESTRUIR ===
    destroy() {
        this.initialized = false;
        console.log('🎵 Sistema de sonidos destruido');
    }
}

// ============================================
// 2. MÚSICA RETRO (CONVOLUME BAJO)
// ============================================

class RetroMusic {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.isPlaying = false;
        this.volume = 0.08; // ⬅️ VOLUMEN MUY BAJO para no tapar efectos
        this.tempo = 120;
        this.notes = [];
        this.currentNote = 0;
        this.interval = null;
        this.oscillators = [];
        this.gains = [];
        
        // Melodía principal (más corta y pegadiza)
        this.melody = [
            // Compás 1
            { freq: 523, dur: 0.15 }, // C5
            { freq: 523, dur: 0.15 }, // C5
            { freq: 523, dur: 0.15 }, // C5
            { freq: 659, dur: 0.15 }, // E5
            { freq: 784, dur: 0.3 },  // G5
            
            // Compás 2
            { freq: 659, dur: 0.15 }, // E5
            { freq: 659, dur: 0.15 }, // E5
            { freq: 659, dur: 0.15 }, // E5
            { freq: 784, dur: 0.15 }, // G5
            { freq: 880, dur: 0.3 },  // A5
            
            // Compás 3
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 880, dur: 0.15 },  // A5
            { freq: 784, dur: 0.3 },   // G5
            
            // Compás 4
            { freq: 659, dur: 0.15 }, // E5
            { freq: 659, dur: 0.15 }, // E5
            { freq: 659, dur: 0.15 }, // E5
            { freq: 784, dur: 0.15 }, // G5
            { freq: 523, dur: 0.3 },  // C5
            
            // Compás 5 (variación)
            { freq: 659, dur: 0.15 }, // E5
            { freq: 784, dur: 0.15 }, // G5
            { freq: 880, dur: 0.15 }, // A5
            { freq: 1047, dur: 0.3 }, // C6
            { freq: 0, dur: 0.15 },   // Silencio
            
            // Compás 6
            { freq: 784, dur: 0.15 }, // G5
            { freq: 880, dur: 0.15 }, // A5
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 1175, dur: 0.3 }, // D6
            { freq: 0, dur: 0.15 },   // Silencio
            
            // Compás 7
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 880, dur: 0.15 },  // A5
            { freq: 784, dur: 0.3 },   // G5
            
            // Compás 8 (final)
            { freq: 659, dur: 0.15 }, // E5
            { freq: 784, dur: 0.15 }, // G5
            { freq: 880, dur: 0.15 }, // A5
            { freq: 1047, dur: 0.4 }, // C6
            { freq: 0, dur: 0.2 },    // Silencio final
        ];
        
        // Bajo (más sutil)
        this.bassMelody = [
            { freq: 131, dur: 0.6 }, // C3
            { freq: 165, dur: 0.6 }, // E3
            { freq: 196, dur: 0.6 }, // G3
            { freq: 220, dur: 0.6 }, // A3
            { freq: 262, dur: 0.6 }, // C4
            { freq: 196, dur: 0.6 }, // G3
            { freq: 165, dur: 0.6 }, // E3
            { freq: 131, dur: 0.6 }, // C3
        ];
    }

    // === INICIALIZAR ===
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🎵 Música retro inicializada');
        } catch (e) {
            console.warn('⚠️ No se pudo inicializar la música:', e);
        }
    }

    // === ACTIVAR CONTEXTO ===
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // === INICIAR MÚSICA ===
    start() {
        if (!this.initialized || this.isPlaying) return;
        this.resume();
        this.isPlaying = true;
        this.currentNote = 0;
        this.playNote();
        console.log('🎵 Música retro iniciada (volumen bajo)');
    }

    // === REPRODUCIR NOTA ===
    playNote() {
        if (!this.isPlaying || !this.ctx) return;

        const now = this.ctx.currentTime;
        const note = this.melody[this.currentNote % this.melody.length];
        const bassNote = this.bassMelody[Math.floor(this.currentNote / 4) % this.bassMelody.length];

        // Limpiar osciladores viejos
        this.cleanup();

        // === MELODÍA PRINCIPAL ===
        if (note.freq > 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, now);
            
            // Volumen muy bajo
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(this.volume, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.dur);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.Q.setValueAtTime(0.5, now);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + note.dur + 0.05);

            this.oscillators.push(osc);
            this.gains.push(gain);
        }

        // === ARMONÍA (muy sutil) ===
        if (note.freq > 0 && this.currentNote % 2 === 0) {
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(note.freq * 1.5, now);
            
            gain2.gain.setValueAtTime(0.001, now);
            gain2.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + note.dur * 0.8);

            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);

            osc2.start(now);
            osc2.stop(now + note.dur * 0.8 + 0.05);

            this.oscillators.push(osc2);
            this.gains.push(gain2);
        }

        // === BAJO (cada 4 notas, muy sutil) ===
        if (this.currentNote % 4 === 0 && bassNote.freq > 0) {
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(bassNote.freq, now);
            
            bassGain.gain.setValueAtTime(0.001, now);
            bassGain.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.02);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + bassNote.dur);

            const bassFilter = this.ctx.createBiquadFilter();
            bassFilter.type = 'lowpass';
            bassFilter.frequency.setValueAtTime(400, now);

            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(this.ctx.destination);

            bassOsc.start(now);
            bassOsc.stop(now + bassNote.dur + 0.05);

            this.oscillators.push(bassOsc);
            this.gains.push(bassGain);
        }

        // Avanzar a la siguiente nota
        this.currentNote++;

        // Programar la siguiente nota
        const nextDelay = note.dur || 0.15;
        this.interval = setTimeout(() => {
            this.playNote();
        }, nextDelay * 1000 + 20);
    }

    // === LIMPIAR OSCILADORES ===
    cleanup() {
        this.oscillators = this.oscillators.filter(osc => {
            try {
                return osc && osc.context && osc.context.state === 'running';
            } catch(e) {
                return false;
            }
        });
        this.gains = this.gains.filter(gain => {
            try {
                return gain && gain.context && gain.context.state === 'running';
            } catch(e) {
                return false;
            }
        });
    }

    // === DETENER MÚSICA ===
    stop() {
        this.isPlaying = false;
        if (this.interval) {
            clearTimeout(this.interval);
            this.interval = null;
        }
        this.oscillators.forEach(osc => {
            try { osc.stop(); } catch(e) {}
        });
        this.oscillators = [];
        this.gains = [];
        console.log('🎵 Música retro detenida');
    }

    // === CAMBIAR VOLUMEN ===
    setVolume(value) {
        this.volume = Math.max(0, Math.min(0.2, value));
    }
}

// Exportar para usar en el juego
window.DroneSoundSystem = DroneSoundSystem;
window.RetroMusic = RetroMusic;