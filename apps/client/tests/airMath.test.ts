import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import { calculateAirVelocity } from "../src/game/player/airMath";
import { movementConfig } from "../src/game/player/movementConfig";
import type { HorizontalVector } from "../src/game/player/movementMath";
import { getHorizontalJumpRetention } from "../src/game/player/slideMath";

const FORWARD_INPUT: Readonly<HorizontalVector> = { x: 0, z: 1 };
const RIGHT_INPUT: Readonly<HorizontalVector> = { x: 1, z: 0 };
const BACKWARD_INPUT: Readonly<HorizontalVector> = { x: 0, z: -1 };
const NO_INPUT: Readonly<HorizontalVector> = { x: 0, z: 0 };

describe("air movement", () => {
  it("preserves horizontal momentum exactly without movement input", () => {
    const velocity = calculateAirVelocity(
      { x: 3, z: -7 },
      NO_INPUT,
      Math.PI,
      movementConfig.airAcceleration,
      movementConfig.maxAirSpeed,
      1,
      { x: 0, z: 0 },
    );

    expect(velocity).toEqual({ x: 3, z: -7 });
  });

  it("accelerates predictably from rest with forward input", () => {
    const velocity = applyAirVelocity({ x: 0, z: 0 }, FORWARD_INPUT, 0, 0.25);

    expect(velocity.x).toBeCloseTo(0, 10);
    expect(velocity.z).toBeCloseTo(-2.5, 10);
  });

  it("does not build generated air speed beyond maxAirSpeed", () => {
    const result = simulateAirMovement(240, 2, {
      initialVelocity: { x: 0, z: 0 },
      movementInput: FORWARD_INPUT,
      viewYawRadians: 0,
    });

    expect(result.finalSpeed).toBeCloseTo(movementConfig.maxAirSpeed, 10);
    expect(result.maximumSpeed).toBeLessThanOrEqual(movementConfig.maxAirSpeed);
  });

  it("does not clamp inherited Sprint speed to maxAirSpeed", () => {
    const velocity = applyAirVelocity(
      { x: 0, z: -movementConfig.sprintSpeed },
      FORWARD_INPUT,
      0,
      1 / 60,
    );

    expect(velocity.z).toBeCloseTo(-movementConfig.sprintSpeed, 10);
    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(
      movementConfig.sprintSpeed,
      10,
    );
  });

  it("builds Walk Jump momentum toward maxAirSpeed without an instant snap", () => {
    const velocity = applyAirVelocity(
      { x: 0, z: -movementConfig.walkSpeed },
      FORWARD_INPUT,
      0,
      0.1,
    );

    expect(Math.abs(velocity.z)).toBeCloseTo(7, 10);
    expect(Math.abs(velocity.z)).toBeGreaterThan(movementConfig.walkSpeed);
    expect(Math.abs(velocity.z)).toBeLessThan(movementConfig.maxAirSpeed);
  });

  it("creates gradual perpendicular steering without erasing forward momentum", () => {
    const velocity = applyAirVelocity(
      { x: 0, z: -movementConfig.sprintSpeed },
      RIGHT_INPUT,
      0,
      1 / 60,
    );

    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.z).toBeLessThan(0);
    expect(Math.abs(velocity.z)).toBeGreaterThan(Math.abs(velocity.x));
    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThanOrEqual(
      movementConfig.sprintSpeed,
    );
  });

  it("cannot reverse inherited Sprint momentum in one frame", () => {
    const velocity = applyAirVelocity(
      { x: 0, z: -movementConfig.sprintSpeed },
      BACKWARD_INPUT,
      0,
      1 / 60,
    );

    expect(velocity.z).toBeLessThan(0);
    expect(Math.abs(velocity.z)).toBeLessThan(movementConfig.sprintSpeed);
  });

  it("rotates forward air control with view yaw", () => {
    const yawZero = applyAirVelocity({ x: 0, z: 0 }, FORWARD_INPUT, 0, 0.1);
    const yawNinety = applyAirVelocity(
      { x: 0, z: 0 },
      FORWARD_INPUT,
      Math.PI / 2,
      0.1,
    );

    expect(yawZero.x).toBeCloseTo(0, 10);
    expect(yawZero.z).toBeCloseTo(-1, 10);
    expect(yawNinety.x).toBeCloseTo(-1, 10);
    expect(yawNinety.z).toBeCloseTo(0, 10);
  });

  it("does not let camera yaw alone rotate momentum", () => {
    const currentVelocity = { x: 4, z: -5 };

    expect(applyAirVelocity(currentVelocity, NO_INPUT, 0, 1 / 60)).toEqual(
      currentVelocity,
    );
    expect(
      applyAirVelocity(currentVelocity, NO_INPUT, Math.PI, 1 / 60),
    ).toEqual(currentVelocity);
  });

  it("gives diagonal input no acceleration advantage", () => {
    const axial = applyAirVelocity({ x: 0, z: 0 }, FORWARD_INPUT, 0, 0.1);
    const diagonal = applyAirVelocity({ x: 0, z: 0 }, { x: 1, z: 1 }, 0, 0.1);

    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(
      Math.hypot(axial.x, axial.z),
      10,
    );
  });

  it.each([
    ["generated", { x: 0, z: 0 }, movementConfig.maxAirSpeed],
    [
      "inherited",
      { x: 0, z: -movementConfig.sprintSpeed },
      movementConfig.sprintSpeed,
    ],
  ])(
    "prevents repeated %s strafing from generating speed above its ceiling",
    (_label, initialVelocity, speedCeiling) => {
      const velocity = { ...initialVelocity };
      const output = { x: 0, z: 0 };

      for (let step = 0; step < 2_000; step += 1) {
        const movementInput = step % 2 === 0 ? RIGHT_INPUT : FORWARD_INPUT;
        calculateAirVelocity(
          velocity,
          movementInput,
          step * 0.37,
          movementConfig.airAcceleration,
          movementConfig.maxAirSpeed,
          1 / 240,
          output,
        );
        velocity.x = output.x;
        velocity.z = output.z;

        expect(Math.hypot(velocity.x, velocity.z)).toBeLessThanOrEqual(
          speedCeiling,
        );
      }
    },
  );

  it("does not exceed future inherited overspeed while steering", () => {
    const initialSpeed = 10;
    const result = simulateAirMovement(240, 1, {
      initialVelocity: { x: 0, z: -initialSpeed },
      movementInput: RIGHT_INPUT,
      viewYawRadians: 0,
    });

    expect(result.maximumSpeed).toBeLessThanOrEqual(initialSpeed);
  });

  it("produces a smooth curved trajectory with coordinated input and changing yaw", () => {
    const velocity: HorizontalVector = { x: 0, z: -6 };
    let previousDirection = Math.atan2(velocity.z, velocity.x);
    let totalDirectionChange = 0;
    let maximumStepDirectionChange = 0;

    for (let step = 0; step < 120; step += 1) {
      calculateAirVelocity(
        velocity,
        RIGHT_INPUT,
        (step / 119) * (Math.PI / 2),
        movementConfig.airAcceleration,
        movementConfig.maxAirSpeed,
        1 / 120,
        velocity,
      );
      const direction = Math.atan2(velocity.z, velocity.x);
      const directionChange = smallestAngleBetween(
        previousDirection,
        direction,
      );
      totalDirectionChange += directionChange;
      maximumStepDirectionChange = Math.max(
        maximumStepDirectionChange,
        directionChange,
      );
      previousDirection = direction;
    }

    expect(totalDirectionChange).toBeGreaterThan(0.5);
    expect(maximumStepDirectionChange).toBeLessThan(Math.PI / 12);
    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThanOrEqual(
      movementConfig.maxAirSpeed,
    );
  });

  it("allows air control immediately after walking off an edge", () => {
    const velocity = applyAirVelocity(
      { x: 0, z: -movementConfig.walkSpeed },
      RIGHT_INPUT,
      0,
      1 / 60,
    );

    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.z).toBeLessThan(0);
  });

  it("does not modify a vertical component on the output object", () => {
    const output = { x: 0, y: -4.25, z: 0 };

    calculateAirVelocity(
      { x: 0, z: -6 },
      RIGHT_INPUT,
      0,
      movementConfig.airAcceleration,
      movementConfig.maxAirSpeed,
      1 / 60,
      output,
    );

    expect(output.y).toBe(-4.25);
  });
});

describe("air movement launch invariants", () => {
  it("preserves Sprint Jump horizontal speed on its launch frame", () => {
    const retention = getHorizontalJumpRetention(
      MovementState.Sprint,
      movementConfig.slideJumpHorizontalRetention,
    );

    expect(retention).toBe(1);
    expect(movementConfig.sprintSpeed * retention).toBe(
      movementConfig.sprintSpeed,
    );
  });

  it("preserves Slide Jump retention before later air control", () => {
    const retainedSpeed =
      8 *
      getHorizontalJumpRetention(
        MovementState.Slide,
        movementConfig.slideJumpHorizontalRetention,
      );
    const noInputVelocity = applyAirVelocity(
      { x: 0, z: -retainedSpeed },
      NO_INPUT,
      0,
      1 / 60,
    );
    const laterAlignedVelocity = applyAirVelocity(
      noInputVelocity,
      FORWARD_INPUT,
      0,
      1 / 60,
    );

    expect(retainedSpeed).toBeCloseTo(7.2, 10);
    expect(noInputVelocity.z).toBeCloseTo(-7.2, 10);
    expect(Math.abs(laterAlignedVelocity.z)).toBeGreaterThan(7.2);
    expect(Math.abs(laterAlignedVelocity.z)).toBeLessThanOrEqual(
      movementConfig.maxAirSpeed,
    );
  });
});

describe("air movement frame-rate consistency", () => {
  it("keeps forward acceleration materially equivalent at 60, 144 and 240 Hz", () => {
    const results = [60, 144, 240].map((frequency) =>
      simulateAirMovement(frequency, 1, {
        initialVelocity: { x: 0, z: 0 },
        movementInput: FORWARD_INPUT,
        viewYawRadians: 0,
      }),
    );

    expectVelocitySpread(results, 1e-8);
    expectPositionSpread(results, 0.06);
  });

  it("keeps directional steering materially equivalent at 60, 144 and 240 Hz", () => {
    const results = [60, 144, 240].map((frequency) =>
      simulateAirMovement(frequency, 0.5, {
        initialVelocity: { x: 0, z: -6 },
        movementInput: RIGHT_INPUT,
        viewYawRadians: 0,
      }),
    );

    expectVelocitySpread(results, 0.04);
    expectPositionSpread(results, 0.05);
  });

  it("preserves no-input momentum identically at 60, 144 and 240 Hz", () => {
    const results = [60, 144, 240].map((frequency) =>
      simulateAirMovement(frequency, 1, {
        initialVelocity: { x: 3, z: -7 },
        movementInput: NO_INPUT,
        viewYawRadians: Math.PI,
      }),
    );

    expectVelocitySpread(results, 0);
    expectPositionSpread(results, 1e-10);
    for (const result of results) {
      expect(result.velocity).toEqual({ x: 3, z: -7 });
    }
  });
});

interface AirSimulationOptions {
  readonly initialVelocity: Readonly<HorizontalVector>;
  readonly movementInput: Readonly<HorizontalVector>;
  readonly viewYawRadians: number;
}

interface AirSimulationResult {
  readonly velocity: HorizontalVector;
  readonly finalSpeed: number;
  readonly maximumSpeed: number;
  readonly position: HorizontalVector;
}

function applyAirVelocity(
  currentVelocity: Readonly<HorizontalVector>,
  movementInput: Readonly<HorizontalVector>,
  viewYawRadians: number,
  deltaTimeSeconds: number,
): HorizontalVector {
  return calculateAirVelocity(
    currentVelocity,
    movementInput,
    viewYawRadians,
    movementConfig.airAcceleration,
    movementConfig.maxAirSpeed,
    deltaTimeSeconds,
    { x: 0, z: 0 },
  );
}

function simulateAirMovement(
  frequency: number,
  durationSeconds: number,
  options: Readonly<AirSimulationOptions>,
): AirSimulationResult {
  const velocity = { ...options.initialVelocity };
  const position: HorizontalVector = { x: 0, z: 0 };
  const maximumStep = 1 / frequency;
  let elapsedSeconds = 0;
  let maximumSpeed = Math.hypot(velocity.x, velocity.z);

  while (elapsedSeconds < durationSeconds) {
    const deltaTime = Math.min(maximumStep, durationSeconds - elapsedSeconds);
    calculateAirVelocity(
      velocity,
      options.movementInput,
      options.viewYawRadians,
      movementConfig.airAcceleration,
      movementConfig.maxAirSpeed,
      deltaTime,
      velocity,
    );
    position.x += velocity.x * deltaTime;
    position.z += velocity.z * deltaTime;
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(velocity.x, velocity.z));
    elapsedSeconds += deltaTime;
  }

  return {
    velocity,
    finalSpeed: Math.hypot(velocity.x, velocity.z),
    maximumSpeed,
    position,
  };
}

function expectVelocitySpread(
  results: readonly AirSimulationResult[],
  tolerance: number,
): void {
  const reference = results.at(-1);
  expect(reference).toBeDefined();
  for (const result of results) {
    expect(
      Math.abs(result.velocity.x - reference!.velocity.x),
    ).toBeLessThanOrEqual(tolerance);
    expect(
      Math.abs(result.velocity.z - reference!.velocity.z),
    ).toBeLessThanOrEqual(tolerance);
  }
}

function expectPositionSpread(
  results: readonly AirSimulationResult[],
  tolerance: number,
): void {
  const reference = results.at(-1);
  expect(reference).toBeDefined();
  for (const result of results) {
    expect(Math.abs(result.position.x - reference!.position.x)).toBeLessThan(
      tolerance,
    );
    expect(Math.abs(result.position.z - reference!.position.z)).toBeLessThan(
      tolerance,
    );
  }
}

function smallestAngleBetween(first: number, second: number): number {
  const difference = Math.abs(first - second) % (Math.PI * 2);
  return Math.min(difference, Math.PI * 2 - difference);
}
