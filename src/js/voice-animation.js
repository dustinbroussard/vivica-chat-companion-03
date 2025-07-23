class VoiceAnimation {
  constructor() {
    this.animationContainer = null;
    this.canvas = null;
    this.ctx = null;
    
    // Visual state
    this.volume = 0;
    this.targetVolume = 0;
    this.currentMoodColor = '#00FF88';
    this.targetMoodColor = '#00FF88';
    this.pulseOffset = 0;
    this.pulseSpeed = 0.03; // how fast the orb pulses
    this.jitter = 0; // small random offset used while processing
    this.particles = [];
    this.isActive = false;
    
    this.initElements();
  }

  initElements() {
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
    // Create canvas for drawing the orb
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'voice-canvas';
    this.canvas.style.cssText = `
      display: block;
      width: 100vw;
      height: 100vh;
      touch-action: none;
    `;
    
    this.animationContainer.appendChild(this.canvas);
    document.body.appendChild(this.animationContainer);

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Start animation loop
    requestAnimationFrame(() => this.animate());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  show() {
    this.animationContainer.style.display = 'block';
    this.isActive = true;
  }

  hide() {
    // Fade to idle before fully hiding
    this.setState('idle');
    this.animationContainer.style.display = 'none';
    this.isActive = false;
  }

  setState(state) {
    const accent = this.getAccentColor();
    switch(state) {
      case 'idle':
        // Gray color and very slow pulse when idle
        this.updateMood('#666666');
        this.targetVolume = 0;
        this.pulseSpeed = 0.01;
        this.jitter = 0;
        break;
      case 'listening':
        // Calm blue/teal while listening
        this.updateMood('#33ccff');
        this.targetVolume = 0.2;
        this.pulseSpeed = 0.02;
        this.jitter = 0;
        break;
      case 'processing':
        // Gold and jittery fast pulse while processing
        this.updateMood('#ffd700');
        this.targetVolume = 0.3;
        this.pulseSpeed = 0.07;
        this.jitter = 0.5;
        break;
      case 'speaking':
        // Use theme accent (fallback magenta) when speaking
        this.updateMood(accent || '#ff0077');
        this.targetVolume = 0.5;
        this.pulseSpeed = 0.04;
        this.jitter = 0;
        break;
      case 'error':
        // Flash red when something goes wrong
        this.updateMood('#ff4444');
        this.targetVolume = 0;
        this.pulseSpeed = 0.03;
        this.jitter = 0;
        setTimeout(() => this.setState('listening'), 3000);
        break;
    }
  }

  updateVolume(vol) {
    this.targetVolume = Math.max(0, Math.min(vol, 1));
  }

  updateMood(color) {
    this.targetMoodColor = color;
    this.animationContainer.style.background = `radial-gradient(circle, ${color}22 0%, black 80%)`;
  }

  // Get accent color from current theme if available
  getAccentColor() {
    const style = getComputedStyle(document.documentElement);
    const val = style.getPropertyValue('--accent').trim() || style.getPropertyValue('--theme-accent').trim();
    return val ? `hsl(${val})` : null;
  }

  animate() {
    if (!this.isActive) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    // Smooth transitions
    this.volume += (this.targetVolume - this.volume) * 0.1;
    this.currentMoodColor = this.lerpColor(this.currentMoodColor, this.targetMoodColor, 0.05);
    this.pulseOffset += this.pulseSpeed;

    this.drawOrb();
    requestAnimationFrame(() => this.animate());
  }

  drawOrb() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.15;
    const radius = baseRadius + this.volume * (baseRadius * 2) + Math.sin(this.pulseOffset) * (baseRadius * 0.2);
    const x = this.canvas.width / 2 + (Math.random() - 0.5) * this.jitter * baseRadius;
    const y = this.canvas.height / 2 + (Math.random() - 0.5) * this.jitter * baseRadius;

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
      p.draw(this.ctx, this.currentMoodColor);
    });
  }

  lerpColor(color1, color2, factor) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.life = 1.0;
    this.size = Math.random() * 3 + 1;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.01;
    this.vx *= 0.99;
    this.vy *= 0.99;
  }
  
  draw(ctx, color) {
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
