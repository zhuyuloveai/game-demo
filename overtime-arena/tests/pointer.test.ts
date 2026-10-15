import test from 'node:test';
import assert from 'node:assert/strict';
import { PointerSteering, capPointerMovement } from '../src/game/PointerSteering.ts';

test('mouse/trackpad hover anchors first, then delivers each displacement once without trailing motion', () => {
  const pointer = new PointerSteering();
  pointer.move({ id: 1, kind: 'mouse', x: 180, y: 250 });
  assert.equal(pointer.active, true);
  assert.equal(pointer.steering, true);
  assert.equal(pointer.held, false);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 196, y: 241 });
  assert.deepEqual(pointer.consumeDelta(), { x: 16, y: -9 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 192, y: 248 });
  assert.deepEqual(pointer.consumeDelta(), { x: -4, y: 7 });
  pointer.move({ id: 1, kind: 'mouse', x: 192, y: 248 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
});

test('unconsumed pointer samples accumulate signed displacement, including reversals', () => {
  const pointer = new PointerSteering();
  pointer.move({ id: 1, kind: 'mouse', x: 100, y: 200 });
  pointer.move({ id: 1, kind: 'mouse', x: 130, y: 180 });
  pointer.move({ id: 1, kind: 'mouse', x: 90, y: 240 });
  pointer.move({ id: 1, kind: 'mouse', x: 97, y: 209 });
  assert.deepEqual(pointer.consumeDelta(), { x: -3, y: 9 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 100, y: 200 });
  assert.deepEqual(pointer.consumeDelta(), { x: 3, y: -9 });
});

test('mouse leave discards pending motion and reentry anchors without a jump', () => {
  const pointer = new PointerSteering();
  pointer.move({ id: 1, kind: 'mouse', x: 180, y: 250 });
  pointer.move({ id: 1, kind: 'mouse', x: 220, y: 270 });
  pointer.leave('mouse');
  assert.equal(pointer.active, false);
  assert.equal(pointer.steering, false);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 900, y: 400 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 893, y: 402 });
  assert.deepEqual(pointer.consumeDelta(), { x: -7, y: 2 });
});

test('mouse down anchors first contact; releasing the button preserves hover movement', () => {
  const pointer = new PointerSteering();
  assert.equal(pointer.down({ id: 1, kind: 'mouse', x: 400, y: 300 }), true);
  assert.equal(pointer.held, true);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 410, y: 305 });
  assert.deepEqual(pointer.consumeDelta(), { x: 10, y: 5 });
  pointer.up(1);
  assert.equal(pointer.held, false);
  assert.equal(pointer.active, true);
  pointer.move({ id: 1, kind: 'mouse', x: 414, y: 302 });
  assert.deepEqual(pointer.consumeDelta(), { x: 4, y: -3 });
});

for (const kind of ['touch', 'pen'] as const) {
  test(kind + ' ignores hover, anchors contact, tracks its owner and discards pending motion on lift', () => {
    const pointer = new PointerSteering();
    pointer.move({ id: 10, kind, x: 100, y: 200 });
    assert.equal(pointer.active, false);
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    assert.equal(pointer.down({ id: 10, kind, x: 700, y: 500 }), true);
    assert.equal(pointer.held, true);
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    pointer.move({ id: 10, kind, x: 712, y: 492 });

    // A second contact must not take or release the movement finger's ownership.
    assert.equal(pointer.down({ id: 11, kind: 'touch', x: 999, y: 100 }), false);
    pointer.move({ id: 11, kind: 'touch', x: 50, y: 600 });
    pointer.up(11);
    pointer.cancel(11);
    assert.equal(pointer.held, true);
    assert.equal(pointer.x, 712);
    assert.equal(pointer.y, 492);
    assert.deepEqual(pointer.consumeDelta(), { x: 12, y: -8 });

    pointer.move({ id: 10, kind, x: 720, y: 490 });
    pointer.up(10);
    assert.equal(pointer.active, false);
    assert.equal(pointer.held, false);
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    pointer.move({ id: 10, kind, x: 900, y: 600 });
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    pointer.down({ id: 12, kind, x: 200, y: 300 });
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  });

  test('captured ' + kind + ' survives leaving the canvas; cancellation clears the contact', () => {
    const pointer = new PointerSteering();
    pointer.down({ id: 7, kind, x: 180, y: 250 });
    pointer.leave(kind);
    pointer.move({ id: 7, kind, x: -20, y: 800 });
    assert.equal(pointer.held, true);
    assert.deepEqual(pointer.consumeDelta(), { x: -200, y: 550 });
    pointer.move({ id: 7, kind, x: 20, y: 700 });
    pointer.cancel(7);
    assert.equal(pointer.active, false);
    assert.equal(pointer.held, false);
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    pointer.move({ id: 7, kind, x: 200, y: 300 });
    assert.equal(pointer.active, false);
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  });
}

test('mouse events cannot steal a held touch or clear its pending displacement', () => {
  const pointer = new PointerSteering();
  pointer.down({ id: 7, kind: 'touch', x: 180, y: 250 });
  pointer.move({ id: 7, kind: 'touch', x: 195, y: 245 });
  assert.equal(pointer.down({ id: 1, kind: 'mouse', x: 800, y: 400 }), false);
  pointer.move({ id: 1, kind: 'mouse', x: 800, y: 400 });
  pointer.leave('mouse');
  pointer.up(1);
  assert.equal(pointer.kind, 'touch');
  assert.equal(pointer.held, true);
  assert.deepEqual(pointer.consumeDelta(), { x: 15, y: -5 });
});

for (const kind of ['mouse', 'touch', 'pen'] as const) {
  test('pause/blur reset clears ' + kind + ' ownership, pending input and the old anchor', () => {
    const pointer = new PointerSteering();
    pointer.down({ id: 7, kind, x: 180, y: 250 });
    pointer.move({ id: 7, kind, x: 220, y: 300 });
    pointer.reset();
    assert.equal(pointer.active, false);
    assert.equal(pointer.steering, false);
    assert.equal(pointer.held, false);
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    pointer.move({ id: 7, kind, x: 600, y: 450 });
    assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    if (kind !== 'mouse') {
      assert.equal(pointer.active, false);
      pointer.up(7);
      pointer.down({ id: 8, kind, x: 600, y: 450 });
      assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
    }
    pointer.move({ id: kind === 'mouse' ? 7 : 8, kind, x: 610, y: 447 });
    assert.deepEqual(pointer.consumeDelta(), { x: 10, y: -3 });
  });
}

test('keyboard override discards pending motion and reanchors the next sample while retaining contact ownership', () => {
  const pointer = new PointerSteering();
  pointer.down({ id: 1, kind: 'mouse', x: 180, y: 250 });
  pointer.move({ id: 1, kind: 'mouse', x: 220, y: 270 });
  pointer.stopSteering();
  assert.equal(pointer.steering, false);
  assert.equal(pointer.active, true);
  assert.equal(pointer.held, true);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 900, y: 500 });
  assert.equal(pointer.steering, true);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 907, y: 491 });
  assert.deepEqual(pointer.consumeDelta(), { x: 7, y: -9 });
});

test('discarding excess consumed motion leaves no backlog and preserves the movement contact', () => {
  const pointer = new PointerSteering();
  pointer.down({ id: 7, kind: 'touch', x: 100, y: 200 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  // Consuming a sample discards any distance beyond the current movement limit.
  pointer.move({ id: 7, kind: 'touch', x: 300, y: 400 });
  assert.deepEqual(pointer.consumeDelta(), { x: 200, y: 200 });
  pointer.move({ id: 7, kind: 'touch', x: 250, y: 380 });
  assert.deepEqual(pointer.consumeDelta(), { x: -50, y: -20 });
  pointer.up(8);
  assert.equal(pointer.held, true);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 7, kind: 'touch', x: 250, y: 380 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.move({ id: 7, kind: 'touch', x: 254, y: 377 });
  assert.deepEqual(pointer.consumeDelta(), { x: 4, y: -3 });
});

test('a large pointer swipe is limited to the configured speed for that event interval', () => {
  const movement = capPointerMovement(6000, 0, 300, 1 / 60);
  assert.ok(Math.abs(movement.x - 5) < 1e-9);
  assert.equal(movement.y, 0);
});

test('the pointer speed limit applies to vector length and preserves diagonal direction', () => {
  const movement = capPointerMovement(300, -400, 300, 1 / 60);
  assert.ok(Math.abs(Math.hypot(movement.x, movement.y) - 5) < 1e-9);
  assert.ok(Math.abs(movement.x - 3) < 1e-9);
  assert.ok(Math.abs(movement.y + 4) < 1e-9);
});

test('small pointer motion retains its sensitivity-scaled displacement below the speed limit', () => {
  const sensitivity = 2;
  assert.deepEqual(capPointerMovement(1 * sensitivity, -0.5 * sensitivity, 300, 1 / 120), { x: 2, y: -1 });
  assert.deepEqual(capPointerMovement(0, 0, 300, 1 / 120), { x: 0, y: 0 });
});

test('saturated pointer motion has the same travel limit over one second at different event frequencies', () => {
  for (const frequency of [30, 60, 120, 240]) {
    let distance = 0;
    for (let event = 0; event < frequency; event++) {
      const movement = capPointerMovement(1000, 0, 300, 1 / frequency);
      distance += Math.hypot(movement.x, movement.y);
    }
    assert.ok(Math.abs(distance - 300) < 1e-8, 'unexpected travel distance at ' + frequency + ' Hz: ' + distance);
  }
});

test('a long pause grants at most one thirtieth of a second of pointer movement budget', () => {
  const movement = capPointerMovement(600, 800, 300, 10);
  assert.ok(Math.abs(Math.hypot(movement.x, movement.y) - 10) < 1e-9);
  assert.deepEqual(movement, capPointerMovement(600, 800, 300, 1 / 30));
});

test('zero or negative event intervals cannot move the player', () => {
  for (const interval of [0, -0.001, -1]) {
    const movement = capPointerMovement(100, -200, 300, interval);
    assert.equal(Math.hypot(movement.x, movement.y), 0);
  }
});

test('discarding excess swipe distance leaves no tail and allows an immediate small reversal', () => {
  const pointer = new PointerSteering();
  pointer.move({ id: 1, kind: 'mouse', x: 100, y: 200 });
  pointer.consumeDelta();
  pointer.move({ id: 1, kind: 'mouse', x: 1100, y: 200 });
  const largeSwipe = pointer.consumeDelta();
  const limited = capPointerMovement(largeSwipe.x, largeSwipe.y, 300, 1 / 60);
  assert.ok(Math.abs(limited.x - 5) < 1e-9);

  const idle = pointer.consumeDelta();
  assert.deepEqual(capPointerMovement(idle.x, idle.y, 300, 1 / 60), { x: 0, y: 0 });
  pointer.move({ id: 1, kind: 'mouse', x: 1097, y: 201 });
  const reversal = pointer.consumeDelta();
  assert.deepEqual(capPointerMovement(reversal.x, reversal.y, 300, 1 / 60), { x: -3, y: 1 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
});

test('pointer lock delivers its first relative sample immediately and consumes accumulated motion once', () => {
  const pointer = new PointerSteering();
  assert.equal(pointer.moveRelative(12, -7), true);
  assert.equal(pointer.kind, 'mouse');
  assert.equal(pointer.active, true);
  assert.equal(pointer.steering, true);
  assert.equal(pointer.held, false);
  assert.equal(pointer.x, 12);
  assert.equal(pointer.y, -7);
  assert.deepEqual(pointer.consumeDelta(), { x: 12, y: -7 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.moveRelative(8, 3);
  pointer.moveRelative(-2, 4);
  assert.deepEqual(pointer.consumeDelta(), { x: 6, y: 7 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
});

test('pointer lock keeps moving beyond screen dimensions and reverses immediately without backlog', () => {
  const pointer = new PointerSteering();
  let travel = 0;
  for (let event = 0; event < 80; event++) {
    pointer.moveRelative(256, 0);
    const delta = pointer.consumeDelta();
    assert.deepEqual(delta, { x: 256, y: 0 });
    travel += delta.x;
  }
  assert.equal(travel, 20480);
  assert.equal(pointer.x, 20480);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.moveRelative(-3, 2);
  assert.deepEqual(pointer.consumeDelta(), { x: -3, y: 2 });
  assert.equal(pointer.x, 20477);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
});

test('pointer lock resumes steering on the next relative sample after a keyboard override', () => {
  const pointer = new PointerSteering();
  pointer.moveRelative(40, 20);
  pointer.stopSteering();
  assert.equal(pointer.steering, false);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.moveRelative(-4, 3);
  assert.equal(pointer.steering, true);
  assert.deepEqual(pointer.consumeDelta(), { x: -4, y: 3 });
});

test('pointer lock synthetic mouse ownership preserves motion across button press and release', () => {
  const pointer = new PointerSteering();
  pointer.moveRelative(12, -5);
  assert.equal(pointer.down({ id: -1, kind: 'mouse', x: pointer.x, y: pointer.y }), true);
  assert.equal(pointer.held, true);
  assert.deepEqual(pointer.consumeDelta(), { x: 12, y: -5 });
  pointer.moveRelative(6, 2);
  assert.equal(pointer.held, true);
  pointer.up(1);
  assert.equal(pointer.held, true);
  pointer.up(-1);
  assert.equal(pointer.held, false);
  assert.equal(pointer.active, true);
  assert.deepEqual(pointer.consumeDelta(), { x: 6, y: 2 });
  pointer.moveRelative(-2, 1);
  assert.deepEqual(pointer.consumeDelta(), { x: -2, y: 1 });
});

for (const kind of ['touch', 'pen'] as const) {
  test('pointer lock relative samples cannot steal a held ' + kind + ' contact', () => {
    const pointer = new PointerSteering();
    pointer.down({ id: 7, kind, x: 100, y: 200 });
    pointer.move({ id: 7, kind, x: 105, y: 197 });
    assert.equal(pointer.moveRelative(500, -500), false);
    assert.equal(pointer.kind, kind);
    assert.equal(pointer.held, true);
    assert.equal(pointer.x, 105);
    assert.equal(pointer.y, 197);
    assert.deepEqual(pointer.consumeDelta(), { x: 5, y: -3 });
    pointer.move({ id: 7, kind, x: 108, y: 198 });
    assert.deepEqual(pointer.consumeDelta(), { x: 3, y: 1 });
    pointer.up(7);
    assert.equal(pointer.moveRelative(4, -2), true);
    assert.deepEqual(pointer.consumeDelta(), { x: 4, y: -2 });
  });
}

test('pointer lock reset clears held input and motion before either relative or absolute input resumes', () => {
  const pointer = new PointerSteering();
  pointer.moveRelative(1000, 400);
  pointer.down({ id: -1, kind: 'mouse', x: pointer.x, y: pointer.y });
  pointer.reset();
  assert.equal(pointer.active, false);
  assert.equal(pointer.steering, false);
  assert.equal(pointer.held, false);
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  pointer.moveRelative(-5, 3);
  assert.deepEqual(pointer.consumeDelta(), { x: -5, y: 3 });

  pointer.moveRelative(60, 20);
  pointer.reset();
  pointer.move({ id: 1, kind: 'mouse', x: 450, y: 300 });
  assert.deepEqual(pointer.consumeDelta(), { x: 0, y: 0 });
  assert.equal(pointer.down({ id: 1, kind: 'mouse', x: 450, y: 300 }), true);
  pointer.move({ id: 1, kind: 'mouse', x: 453, y: 298 });
  assert.deepEqual(pointer.consumeDelta(), { x: 3, y: -2 });
});
