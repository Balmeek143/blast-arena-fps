import { PlayerInput } from '../../../shared/types.js';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private isPointerLocked = false;

  private keys: Record<string, boolean> = {};
  private isMouseDown = false;
  private isScoreboardOpen = false;

  public yaw = 0;
  public pitch = 0;

  // Mouse sensitivity
  public sensitivity = 0.0022;

  // Touch control states
  private isMobile = false;
  private touchLookId: number | null = null;
  private lastTouchX = 0;
  private lastTouchY = 0;

  private touchMoveVector = { x: 0, y: 0 };
  private touchShoot = false;
  private touchJump = false;
  private touchReload = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.detectMobile();
    this.initKeyboard();
    this.initMouse();
    if (this.isMobile) {
      this.initTouch();
    }
  }

  private detectMobile() {
    this.isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 850 && 'ontouchstart' in window);
    if (this.isMobile) {
      const mobileUI = document.getElementById('mobile-controls');
      if (mobileUI) mobileUI.style.display = 'block';
    }
  }

  private initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Tab') {
        e.preventDefault();
        this.isScoreboardOpen = true;
        const sb = document.getElementById('scoreboard-modal');
        if (sb) sb.style.display = 'block';
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;

      if (e.code === 'Tab') {
        e.preventDefault();
        this.isScoreboardOpen = false;
        const sb = document.getElementById('scoreboard-modal');
        if (sb) sb.style.display = 'none';
      }
    });
  }

  private initMouse() {
    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.isMobile) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;

      // Clamp vertical pitch to avoid flipping (-85 to +85 degrees)
      const maxPitch = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.isPointerLocked) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });
  }

  private initTouch() {
    // Joystick handling
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    let joyTouchId: number | null = null;
    let joyCenter = { x: 0, y: 0 };

    if (joystickZone && joystickKnob) {
      joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joyTouchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === joyTouchId) {
            const dx = t.clientX - joyCenter.x;
            const dy = t.clientY - joyCenter.y;
            const maxRadius = 45;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const clampedDist = Math.min(dist, maxRadius);
            const angle = Math.atan2(dy, dx);

            const knobX = Math.cos(angle) * clampedDist;
            const knobY = Math.sin(angle) * clampedDist;
            joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

            this.touchMoveVector.x = knobX / maxRadius;
            this.touchMoveVector.y = knobY / maxRadius;
          }
        }
      }, { passive: false });

      const resetJoy = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            joyTouchId = null;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            this.touchMoveVector.x = 0;
            this.touchMoveVector.y = 0;
          }
        }
      };

      window.addEventListener('touchend', resetJoy);
      window.addEventListener('touchcancel', resetJoy);
    }

    // Touch look zone
    const lookZone = document.getElementById('touch-look-zone');
    if (lookZone) {
      lookZone.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        this.touchLookId = touch.identifier;
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
      });

      window.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.touchLookId) {
            const dx = t.clientX - this.lastTouchX;
            const dy = t.clientY - this.lastTouchY;
            this.lastTouchX = t.clientX;
            this.lastTouchY = t.clientY;

            this.yaw -= dx * 0.005;
            this.pitch -= dy * 0.005;
            const maxPitch = Math.PI / 2 - 0.05;
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
          }
        }
      });

      const resetLook = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchLookId) {
            this.touchLookId = null;
          }
        }
      };
      window.addEventListener('touchend', resetLook);
      window.addEventListener('touchcancel', resetLook);
    }

    // Mobile buttons
    const shootBtn = document.getElementById('m-shoot-btn');
    if (shootBtn) {
      shootBtn.addEventListener('touchstart', () => { this.touchShoot = true; });
      shootBtn.addEventListener('touchend', () => { this.touchShoot = false; });
    }

    const jumpBtn = document.getElementById('m-jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', () => { this.touchJump = true; });
      jumpBtn.addEventListener('touchend', () => { this.touchJump = false; });
    }

    const reloadBtn = document.getElementById('m-reload-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('touchstart', () => { this.touchReload = true; });
      reloadBtn.addEventListener('touchend', () => { this.touchReload = false; });
    }
  }

  public getPlayerInput(): PlayerInput {
    // Keyboard WASD
    let fwd = this.keys['KeyW'] || this.keys['ArrowUp'] || false;
    let back = this.keys['KeyS'] || this.keys['ArrowDown'] || false;
    let left = this.keys['KeyA'] || this.keys['ArrowLeft'] || false;
    let right = this.keys['KeyD'] || this.keys['ArrowRight'] || false;
    let jump = this.keys['Space'] || false;
    let shoot = this.isMouseDown;
    let reload = this.keys['KeyR'] || false;

    // Mobile virtual joystick input
    if (this.isMobile) {
      if (this.touchMoveVector.y < -0.3) fwd = true;
      if (this.touchMoveVector.y > 0.3) back = true;
      if (this.touchMoveVector.x < -0.3) left = true;
      if (this.touchMoveVector.x > 0.3) right = true;

      if (this.touchJump) jump = true;
      if (this.touchShoot) shoot = true;
      if (this.touchReload) reload = true;
    }

    return {
      forward: fwd,
      backward: back,
      left,
      right,
      jump,
      shoot,
      reload
    };
  }

  public lockPointer() {
    if (!this.isMobile) {
      this.canvas.requestPointerLock();
    }
  }

  public isLocked(): boolean {
    return this.isPointerLocked || this.isMobile;
  }
}
