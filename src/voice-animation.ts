// src/voice-animation.ts

class VoiceAnimation {
    private animationContainer: HTMLDivElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    // Visual state
    private volume: number = 0;
    private targetVolume: number = 0;
    private currentMoodColor: string = '#00FF88';
    private targetMoodColor: string = '#00FF88';
    private pulseOffset: number = 0;
    private particles: Particle[] = [];
    private isActive: boolean = false;

    constructor() {
        this.initElements();
    }

    private initElements(): void {
        // Create container div
        this.animationContainer = document.createElement('div');
        this.animationContainer.id = 'voice-animation-container';
        this.animationContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, #222244 0%, black 80%);
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
            color: white;
            z-index: 1000;
            display: none;
        `;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            color: white;
            font-size: 32px;
            cursor: pointer;
            z-index: 1001;
        `;
        closeBtn.addEventListener('click', () => this.hide());

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'voice-canvas';
        this.canvas.style.cssText = `
            display: block;
            width: 100vw;
            height: 100vh;
            touch-action: none;
        `;

        this.animationContainer.appendChild(this.canvas);
        this.animationContainer.appendChild(closeBtn);
        document.body.appendChild(this.animationContainer);

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error("Could not get 2D rendering context for canvas.");
            return; // Exit if context isn't available
        }
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Start animation loop
        requestAnimationFrame(() => this.animate());
    }

    private resizeCanvas(): void {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    show(): void {
        if (this.animationContainer) {
            this.animationContainer.style.display = 'block';
            this.isActive = true;
        }
    }

    hide(): void {
        if (this.animationContainer) {
            this.animationContainer.style.display = 'none';
            this.isActive = false;
        }
    }

    setState(state: 'listening' | 'processing' | 'speaking' | 'error'): void {
        switch (state) {
            case 'listening':
                this.updateMood('#00FF88');
                this.targetVolume = 0.2;
                break;
            case 'processing':
                this.updateMood('#FFD700');
                this.targetVolume = 0.3;
                break;
            case 'speaking':
                this.updateMood('#FF6B6B');
                this.targetVolume = 0.5;
                break;
            case 'error':
                this.updateMood('#FF4444');
                this.targetVolume = 0;
                setTimeout(() => this.setState('listening'), 3000);
                break;
        }
    }

    updateVolume(vol: number): void {
        this.targetVolume = Math.max(0, Math.min(vol, 1));
    }

    updateMood(color: string): void {
        this.targetMoodColor = color;
        if (this.animationContainer) {
            this.animationContainer.style.background = `radial-gradient(circle, ${color}22 0%, black 80%)`;
        }
    }

    private animate(): void {
        if (!this.isActive || !this.ctx || !this.canvas) { // Check for ctx and canvas presence
            requestAnimationFrame(() => this.animate());
            return;
        }

        // Smooth transitions
        this.volume += (this.targetVolume - this.volume) * 0.1;
        this.currentMoodColor = this.lerpColor(this.currentMoodColor, this.targetMoodColor, 0.05);
        this.pulseOffset += 0.03;

        this.drawOrb();
        requestAnimationFrame(() => this.animate());
    }

    private drawOrb(): void {
        if (!this.ctx || !this.canvas) return; // Ensure context and canvas are available

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.15;
        const radius = baseRadius + this.volume * (baseRadius * 2) + Math.sin(this.pulseOffset) * (baseRadius * 0.2);
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;

        // Outer glow
        const outerGlow = this.ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 2.5);
        outerGlow.addColorStop(0, `${this.currentMoodColor}40`);
        outerGlow.addColorStop(0.5, `${this.currentMoodColor}20`);
        outerGlow.addColorStop(1, 'rgba(0,0,0,0)');

        this.ctx.beginPath();
        this.ctx.fillStyle = outerGlow;
        this.ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Main orb
        const gradient = this.ctx.createRadialGradient(x, y, 10, x, y, radius);
        gradient.addColorStop(0, `${this.currentMoodColor}CC`);
        gradient.addColorStop(0.4, `${this.currentMoodColor}88`);
        gradient.addColorStop(0.8, `${this.currentMoodColor}44`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        this.ctx.beginPath();
        this.ctx.fillStyle = gradient;
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Add particles if needed
        if (this.volume > 0.05) {
            for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = radius * (0.5 + Math.random() * 0.5);
                this.particles.push(new Particle(
                    x + Math.cos(angle) * distance,
                    y + Math.sin(angle) * distance
                ));
            }
        }

        // Update particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            p.draw(this.ctx!, this.currentMoodColor); // Non-null assertion for ctx here, as it's checked at function start
        });
    }

    private lerpColor(color1: string, color2: string, factor: number): string {
        const hexToRgb = (hex: string) => {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 2), 16);
            const b = parseInt(hex.substring(4, 2), 16);
            return [r, g, b];
        };

        const rgbToHex = (r: number, g: number, b: number) => {
            return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
        };

        const [r1, g1, b1] = hexToRgb(color1.replace('#', ''));
        const [r2, g2, b2] = hexToRgb(color2.replace('#', ''));

        const r = r1 + (r2 - r1) * factor;
        const g = g1 + (g2 - g1) * factor;
        const b = b1 + (b2 - b1) * factor;

        return rgbToHex(r, g, b);
    }
}

class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.life = 1.0;
        this.size = Math.random() * 3 + 1;
    }

    update(): void {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.01;
        this.vx *= 0.99;
        this.vy *= 0.99;
    }

    draw(ctx: CanvasRenderingContext2D, color: string): void {
        const alpha = this.life * 0.6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export const voiceAnimation = new VoiceAnimation();
