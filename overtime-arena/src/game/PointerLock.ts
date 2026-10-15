export type PointerLockState = 'idle' | 'pending' | 'locked' | 'error' | 'unsupported';

/** isLocked/exit refer only to this controller's element, never another element's lock. */
export interface PointerLockPort {
  isSupported(): boolean;
  isLocked(): boolean;
  request(): Promise<void> | void;
  exit(): void;
}

/** DOM-free lifecycle; requests are initiated only by the caller's user gesture. */
export class PointerLockController {
  state: PointerLockState;
  private readonly port: PointerLockPort;
  private readonly onChange: (state: PointerLockState) => void;
  private readonly onUnlock: () => void;
  private wanted = false;
  private observedLock = false;
  private exitRequested = false;
  private disposed = false;
  private requestVersion = 0;

  constructor(port: PointerLockPort, onChange: (state: PointerLockState) => void, onUnlock: () => void) {
    this.port = port;
    this.onChange = onChange;
    this.onUnlock = onUnlock;
    // Do not call back before the caller has finished assigning this controller.
    this.state = port.isSupported() ? 'idle' : 'unsupported';
  }

  request(): void {
    if (this.disposed || this.state === 'pending' || this.state === 'locked') return;
    if (!this.port.isSupported()) { this.setState('unsupported'); return; }
    // A release still in flight cannot be undone by another request. Do not queue
    // an automatic retry, which would run outside the next explicit user gesture.
    if (this.exitRequested && this.port.isLocked()) return;
    this.exitRequested = false;
    this.wanted = true;
    const version = ++this.requestVersion;
    if (this.port.isLocked()) { this.changed(); return; }
    this.setState('pending');
    if (this.disposed || !this.wanted || version !== this.requestVersion) return;
    try {
      const completion = this.port.request();
      if (completion !== undefined) {
        void Promise.resolve(completion).then(
          () => { if (this.port.isLocked()) this.changed(); },
          () => { if (version === this.requestVersion) this.failed(); },
        );
      }
      // Also support legacy void APIs and a synchronously observable grant.
      if (this.port.isLocked()) this.changed();
    } catch {
      if (version === this.requestVersion) this.failed();
    }
  }

  /** Forward document pointerlockchange, including late grants after cancellation. */
  changed(): void {
    if (this.port.isLocked()) {
      if (this.disposed || !this.wanted) { this.exitOwnedLock(); return; }
      this.observedLock = true;
      this.setState('locked');
      return;
    }
    const lostWantedLock = this.observedLock && this.wanted;
    this.observedLock = false;
    this.exitRequested = false;
    if (this.disposed) return;
    if (lostWantedLock) {
      this.wanted = false;
      const version = ++this.requestVersion;
      this.setState('idle');
      // An onChange subscriber may synchronously dispose or release the scene.
      if (!this.disposed && version === this.requestVersion) this.onUnlock();
    } else if (this.state === 'locked') {
      this.setState('idle');
    }
    // An unrelated element's change does not finish our pending request.
  }

  /** Forward pointerlockerror; canceled requests and errors after a grant are harmless. */
  failed(): void {
    if (this.disposed || !this.wanted) return;
    if (this.port.isLocked()) { this.changed(); return; }
    if (this.state !== 'pending') return;
    this.wanted = false;
    this.observedLock = false;
    ++this.requestVersion;
    this.setState('error');
  }

  release(): void {
    if (this.disposed) { this.exitOwnedLock(); return; }
    this.wanted = false;
    this.observedLock = false;
    const version = ++this.requestVersion;
    this.exitOwnedLock();
    if (!this.disposed && version === this.requestVersion) {
      this.setState(this.state === 'unsupported' ? 'unsupported' : 'idle');
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.wanted = false;
    this.observedLock = false;
    ++this.requestVersion;
    this.state = this.state === 'unsupported' ? 'unsupported' : 'idle';
    this.exitOwnedLock();
    // Legacy void requests still require their late change event to be forwarded;
    // no polling or new request is started after disposal.
  }

  private exitOwnedLock(): void {
    if (!this.port.isLocked()) { this.exitRequested = false; return; }
    if (this.exitRequested) return;
    this.exitRequested = true;
    this.port.exit();
  }

  private setState(state: PointerLockState): void {
    if (this.state === state) return;
    this.state = state;
    if (!this.disposed) this.onChange(state);
  }
}
