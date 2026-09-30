// =====================================================================
// Entrada: swipes (táctil y mouse vía Pointer Events) + teclado para PC.
// Dispara un solo gesto por arrastre, apenas se supera el umbral:
// se siente más rápido que esperar a soltar el dedo.
// =====================================================================
const THRESHOLD = 24; // px

export class Input {
  constructor(el, onDirection) {
    this.onDirection = onDirection;
    this.start = null;

    el.addEventListener('pointerdown', (e) => {
      this.start = { x: e.clientX, y: e.clientY, id: e.pointerId, fired: false };
      try { el.setPointerCapture(e.pointerId); } catch { /* sin soporte */ }
    });
    el.addEventListener('pointermove', (e) => {
      const s = this.start;
      if (!s || s.fired || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return;
      s.fired = true;
      if (Math.abs(dx) > Math.abs(dy)) this.onDirection(dx > 0 ? 'right' : 'left');
      else this.onDirection(dy > 0 ? 'down' : 'up');
    });
    const end = () => { this.start = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    window.addEventListener('keydown', (e) => {
      const map = {
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'up', KeyW: 'up', Space: 'up',
        ArrowDown: 'down', KeyS: 'down',
      };
      const dir = map[e.code];
      if (!dir) return;
      e.preventDefault();
      this.onDirection(dir);
    });
  }
}
