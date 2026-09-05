import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import { movementConfig } from "../src/game/player/movementConfig";
import {
  calculateGroundVelocity,
  getGroundTargetSpeed,
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
  it("resolves configured walk, sprint and crouch target speeds", () => {
    expect(getGroundTargetSpeed(MovementState.Grounded, movementConfig)).toBe(
      6,
    );
    expect(getGroundTargetSpeed(MovementState.Sprint, movementConfig)).toBe(
      8.5,
    );
    expect(
      getGroundTargetSpeed(MovementState.Crouch, movementConfig),
    ).toBeCloseTo(3.3, 10);
  });

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

  it("limits diagonal sprint to the configured sprint speed", () => {
    const velocity = calculateGroundVelocity(
      { x: 0, z: 0 },
      { x: 1, z: 1 },
      0,
      movementConfig.sprintSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      1,
      { x: 0, z: 0 },
    );

    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(
      movementConfig.sprintSpeed,
      10,
    );
  });

  it("converges from sprint toward walk speed without an instant clamp", () => {
    const velocity = calculateGroundVelocity(
      { x: 0, z: -movementConfig.sprintSpeed },
      { x: 0, z: 1 },
      0,
      movementConfig.walkSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      0.05,
      { x: 0, z: 0 },
    );

    expect(Math.abs(velocity.z)).toBeLessThan(movementConfig.sprintSpeed);
    expect(Math.abs(velocity.z)).toBeGreaterThan(movementConfig.walkSpeed);
  });

  it("converges from sprint toward crouch speed without an instant snap", () => {
    const crouchSpeed = getGroundTargetSpeed(
      MovementState.Crouch,
      movementConfig,
    );
    const velocity = calculateGroundVelocity(
      { x: 0, z: -movementConfig.sprintSpeed },
      { x: 0, z: 1 },
      0,
      crouchSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      0.05,
      { x: 0, z: 0 },
    );

    expect(Math.abs(velocity.z)).toBeLessThan(movementConfig.sprintSpeed);
    expect(Math.abs(velocity.z)).toBeGreaterThan(crouchSpeed);
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

  it.each([
    ["walk", movementConfig.walkSpeed],
    ["sprint", movementConfig.sprintSpeed],
    ["crouch", movementConfig.walkSpeed * movementConfig.crouchSpeedMultiplier],
  ])(
    "keeps one-second %s acceleration materially consistent at 60, 144 and 240 Hz",
    (_label, targetSpeed) => {
      const at60Hz = simulateOneSecond(60, targetSpeed);
      const at144Hz = simulateOneSecond(144, targetSpeed);
      const at240Hz = simulateOneSecond(240, targetSpeed);

      expect(Math.abs(at60Hz.positionZ - at240Hz.positionZ)).toBeLessThan(0.06);
      expect(Math.abs(at144Hz.positionZ - at240Hz.positionZ)).toBeLessThan(
        0.05,
      );
      expect(at60Hz.velocity.z).toBeCloseTo(at240Hz.velocity.z, 8);
      expect(at144Hz.velocity.z).toBeCloseTo(at240Hz.velocity.z, 8);
    },
  );
});

interface SimulationResult {
  readonly positionZ: number;
  readonly velocity: HorizontalVector;
}

function simulateOneSecond(
  frequency: number,
  targetSpeed = movementConfig.walkSpeed,
): SimulationResult {
  const deltaTime = 1 / frequency;
  const velocity: HorizontalVector = { x: 0, z: 0 };
  let positionZ = 0;

  for (let step = 0; step < frequency; step += 1) {
    calculateGroundVelocity(
      velocity,
      { x: 0, z: 1 },
      0,
      targetSpeed,
      movementConfig.groundAcceleration,
      movementConfig.groundDeceleration,
      deltaTime,
      velocity,
    );
    positionZ += velocity.z * deltaTime;
  }

  return { positionZ, velocity };
}
