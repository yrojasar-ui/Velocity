import { describe, expect, it } from "vitest";

import { movementConfig } from "../src/game/player/movementConfig";
import {
  calculateGroundVelocity,
  normalizeMovementInput,
  type HorizontalVector,
} from "../src/game/player/movementMath";

describe("movement input normalization", () => {
  it("keeps diagonal input at unit magnitude", () => {
    const normalized = normalizeMovementInput(1, 1, { x: 0, z: 0 });

    expect(Math.hypot(normalized.x, normalized.z)).toBeCloseTo(1, 10);
  });
});

describe("ground movement", () => {
  it("accelerates toward the intended velocity", () => {
    const velocity = calculateGroundVelocity(
      { x: 0, z: 0 },
      { x: 0, z: 1 },
      0,
      movementConfig.walkSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      0.1,
      { x: 0, z: 0 },
    );

    expect(velocity.z).toBeCloseTo(-3, 10);
  });

  it("decelerates predictably without movement input", () => {
    const velocity = calculateGroundVelocity(
      { x: 0, z: -movementConfig.walkSpeed },
      { x: 0, z: 0 },
      0,
      movementConfig.walkSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      0.1,
      { x: 0, z: 0 },
    );

    expect(velocity.z).toBeCloseTo(-3.6, 10);
  });

  it("does not exceed the configured walk speed", () => {
    const velocity = calculateGroundVelocity(
      { x: 0, z: 0 },
      { x: 1, z: 1 },
      0,
      movementConfig.walkSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      1,
      { x: 0, z: 0 },
    );

    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThanOrEqual(
      movementConfig.walkSpeed,
    );
  });

  it("rotates forward movement by the horizontal view yaw", () => {
    const velocity = calculateGroundVelocity(
      { x: 0, z: 0 },
      { x: 0, z: 1 },
      Math.PI / 2,
      movementConfig.walkSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      1,
      { x: 0, z: 0 },
    );

    expect(velocity.x).toBeCloseTo(-movementConfig.walkSpeed, 10);
    expect(velocity.z).toBeCloseTo(0, 10);
  });
});

describe("frame-rate consistency", () => {
  it("produces materially equivalent motion at 60, 144 and 240 Hz", () => {
    const at60Hz = simulateOneSecond(60);
    const at144Hz = simulateOneSecond(144);
    const at240Hz = simulateOneSecond(240);

    expect(Math.abs(at60Hz.positionZ - at240Hz.positionZ)).toBeLessThan(0.05);
    expect(Math.abs(at144Hz.positionZ - at240Hz.positionZ)).toBeLessThan(0.05);
    expect(at60Hz.velocity.z).toBeCloseTo(at240Hz.velocity.z, 8);
    expect(at144Hz.velocity.z).toBeCloseTo(at240Hz.velocity.z, 8);
  });
});

interface SimulationResult {
  readonly positionZ: number;
  readonly velocity: HorizontalVector;
}

function simulateOneSecond(frequency: number): SimulationResult {
  const deltaTime = 1 / frequency;
  const velocity: HorizontalVector = { x: 0, z: 0 };
  let positionZ = 0;

  for (let step = 0; step < frequency; step += 1) {
    calculateGroundVelocity(
      velocity,
      { x: 0, z: 1 },
      0,
      movementConfig.walkSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      deltaTime,
      velocity,
    );
    positionZ += velocity.z * deltaTime;
  }

  return { positionZ, velocity };
}
