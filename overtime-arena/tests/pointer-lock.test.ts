import test from 'node:test';
import assert from 'node:assert/strict';
import { PointerLockController, type PointerLockPort, type PointerLockState } from '../src/game/PointerLock.ts';

class FakePort implements PointerLockPort {
  supported = true;
  locked = false;
  requests = 0;
  exits = 0;
  exitImmediately = true;
  requestResult: () => Promise<void> | void = () => {};
  isSupported(): boolean { return this.supported; }
  isLocked(): boolean { return this.locked; }
  request(): Promise<void> | void { this.requests++; return this.requestResult(); }
  exit(): void { this.exits++; if (this.exitImmediately) this.locked = false; }
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function setup(port = new FakePort()) {
  const states: PointerLockState[] = [];
  let unlocks = 0;
  const controller = new PointerLockController(port, state => states.push(state), () => { unlocks++; });
  return { port, states, controller, unlocks: () => unlocks };
}

test('unsupported platforms expose their state without requesting or notifying during construction', () => {
  const port = new FakePort();
  port.supported = false;
  const lab = setup(port);
  assert.equal(lab.controller.state, 'unsupported');
  lab.controller.request();
  lab.controller.release();
  assert.equal(port.requests, 0);
  assert.equal(port.exits, 0);
  assert.deepEqual(lab.states, []);
});

test('legacy void requests stay pending until an actual grant and suppress duplicate requests and events', () => {
  const lab = setup();
  lab.controller.request();
  lab.controller.request();
  lab.controller.changed(); // An unrelated element changed; we have no lock yet.
  assert.equal(lab.controller.state, 'pending');
  assert.equal(lab.port.requests, 1);
  lab.port.locked = true;
  lab.controller.changed();
  lab.controller.changed();
  lab.controller.request();
  assert.equal(lab.controller.state, 'locked');
  assert.equal(lab.port.requests, 1);
  assert.deepEqual(lab.states, ['pending', 'locked']);
  assert.equal(lab.unlocks(), 0);
});

test('synchronous grants and an already-owned lock are accepted without unnecessary requests', () => {
  const lab = setup();
  lab.port.requestResult = () => { lab.port.locked = true; };
  lab.controller.request();
  assert.equal(lab.controller.state, 'locked');
  const existing = new FakePort();
  existing.locked = true;
  const other = setup(existing);
  other.controller.request();
  assert.equal(other.controller.state, 'locked');
  assert.equal(existing.requests, 0);
});

test('Promise completion alone does not claim a lock that the port does not own', async () => {
  const lab = setup();
  const completion = deferred();
  lab.port.requestResult = () => completion.promise;
  lab.controller.request();
  completion.resolve();
  await Promise.resolve();
  assert.equal(lab.controller.state, 'pending');
  lab.port.locked = true;
  lab.controller.changed();
  assert.equal(lab.controller.state, 'locked');
});

test('Promise rejection and synchronous throw enter error and allow a new gesture to retry', async () => {
  const lab = setup();
  const completion = deferred();
  lab.port.requestResult = () => completion.promise;
  lab.controller.request();
  completion.reject(new Error('permission denied'));
  await Promise.resolve();
  assert.equal(lab.controller.state, 'error');
  lab.port.requestResult = () => { throw new Error('gesture required'); };
  lab.controller.request();
  assert.equal(lab.controller.state, 'error');
  lab.port.requestResult = () => {};
  lab.controller.request();
  assert.equal(lab.controller.state, 'pending');
  assert.equal(lab.port.requests, 3);
  assert.equal(lab.unlocks(), 0);
  assert.deepEqual(lab.states, ['pending', 'error', 'pending', 'error', 'pending']);
});

test('native errors fail pending requests but do not overwrite an actual lock or canceled state', () => {
  const lab = setup();
  lab.controller.request();
  lab.controller.failed();
  assert.equal(lab.controller.state, 'error');
  lab.controller.request();
  lab.port.locked = true;
  lab.controller.changed();
  lab.controller.failed();
  assert.equal(lab.controller.state, 'locked');
  lab.controller.release();
  lab.controller.failed();
  assert.equal(lab.controller.state, 'idle');
  assert.equal(lab.unlocks(), 0);
});

test('Esc or an unexpected loss reports idle and invokes onUnlock exactly once', () => {
  const lab = setup();
  lab.controller.request();
  lab.port.locked = true;
  lab.controller.changed();
  lab.port.locked = false;
  lab.controller.changed();
  lab.controller.changed();
  assert.equal(lab.controller.state, 'idle');
  assert.equal(lab.unlocks(), 1);
  assert.equal(lab.port.exits, 0);
  assert.deepEqual(lab.states, ['pending', 'locked', 'idle']);
});

test('active pause release exits only the owned lock and does not report an unexpected unlock', () => {
  const lab = setup();
  lab.controller.release();
  assert.equal(lab.port.exits, 0);
  lab.controller.request();
  lab.port.locked = true;
  lab.controller.changed();
  lab.controller.release();
  lab.controller.changed();
  lab.controller.release();
  assert.equal(lab.port.exits, 1);
  assert.equal(lab.controller.state, 'idle');
  assert.equal(lab.unlocks(), 0);
});

test('release of a pending legacy request rejects its late grant without announcing locked', () => {
  const lab = setup();
  lab.controller.request();
  lab.controller.release();
  lab.port.locked = true;
  lab.controller.changed();
  lab.controller.changed();
  assert.equal(lab.port.exits, 1);
  assert.equal(lab.port.locked, false);
  assert.equal(lab.controller.state, 'idle');
  assert.equal(lab.unlocks(), 0);
  assert.deepEqual(lab.states, ['pending', 'idle']);
});

test('release of a pending Promise request exits a late grant even before its change event', async () => {
  const lab = setup();
  const completion = deferred();
  lab.port.requestResult = () => completion.promise;
  lab.controller.request();
  lab.controller.release();
  lab.port.locked = true;
  completion.resolve();
  await Promise.resolve();
  lab.controller.changed();
  assert.equal(lab.port.exits, 1);
  assert.equal(lab.controller.state, 'idle');
  assert.equal(lab.unlocks(), 0);
  assert.deepEqual(lab.states, ['pending', 'idle']);
});

test('an old rejected Promise cannot fail a new request made after cancellation', async () => {
  const lab = setup();
  const oldRequest = deferred();
  lab.port.requestResult = () => oldRequest.promise;
  lab.controller.request();
  lab.controller.release();
  lab.port.requestResult = () => {};
  lab.controller.request();
  oldRequest.reject(new Error('old request canceled'));
  await Promise.resolve();
  assert.equal(lab.controller.state, 'pending');
  lab.port.locked = true;
  lab.controller.changed();
  assert.equal(lab.controller.state, 'locked');
  assert.deepEqual(lab.states, ['pending', 'idle', 'pending', 'locked']);
});

test('dispose prevents callbacks and exits a Promise grant arriving after destruction', async () => {
  const lab = setup();
  const completion = deferred();
  lab.port.requestResult = () => completion.promise;
  lab.controller.request();
  lab.controller.dispose();
  lab.controller.dispose();
  lab.controller.request();
  lab.port.locked = true;
  completion.resolve();
  await Promise.resolve();
  lab.controller.changed();
  lab.controller.failed();
  assert.equal(lab.port.requests, 1);
  assert.equal(lab.port.exits, 1);
  assert.equal(lab.controller.state, 'idle');
  assert.equal(lab.unlocks(), 0);
  assert.deepEqual(lab.states, ['pending']);
});

test('disposed legacy controllers clean up a forwarded late grant without notifying their scene', () => {
  const lab = setup();
  lab.controller.request();
  lab.controller.dispose();
  lab.port.locked = true;
  lab.controller.changed();
  assert.equal(lab.port.exits, 1);
  assert.equal(lab.unlocks(), 0);
  assert.deepEqual(lab.states, ['pending']);
});

test('disposing an active lock exits once without onChange or onUnlock after destruction', () => {
  const lab = setup();
  lab.controller.request();
  lab.port.locked = true;
  lab.controller.changed();
  lab.controller.dispose();
  lab.controller.changed();
  lab.controller.dispose();
  assert.equal(lab.port.exits, 1);
  assert.equal(lab.unlocks(), 0);
  assert.deepEqual(lab.states, ['pending', 'locked']);
});

test('a delayed exit is requested only once and never queues a retry outside a gesture', () => {
  const lab = setup();
  lab.port.exitImmediately = false;
  lab.controller.request();
  lab.port.locked = true;
  lab.controller.changed();
  lab.controller.release();
  lab.controller.changed();
  lab.controller.release();
  lab.controller.request();
  assert.equal(lab.port.exits, 1);
  assert.equal(lab.port.requests, 1);
  assert.equal(lab.controller.state, 'idle');
  lab.port.locked = false;
  lab.controller.changed();
  assert.equal(lab.port.requests, 1);
  lab.controller.request();
  assert.equal(lab.port.requests, 2);
  assert.equal(lab.unlocks(), 0);
});

test('disposal from an idle state subscriber suppresses the subsequent unlock callback', () => {
  const port = new FakePort();
  let unlocks = 0;
  const controller = new PointerLockController(port, state => {
    if (state === 'idle') controller.dispose();
  }, () => { unlocks++; });
  controller.request();
  port.locked = true;
  controller.changed();
  port.locked = false;
  controller.changed();
  assert.equal(unlocks, 0);
});
