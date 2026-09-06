import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import { movementConfig } from "../src/game/player/movementConfig";
import type { HorizontalVector } from "../src/game/player/movementMath";
import {
  calculateSlideVelocity,
  getHorizontalJumpRetention,
} from "../src/game/player/slideMath";

describe("slide momentum", () => {
  it("loses horizontal speed at the configured meters-per-second-squared rate", () => {
    const velocity = calculateSlideVelocity(
      { x: 0, z: -8.5 },
      movementConfig.slideFriction,
      0.25,
      { x: 0, z: 0 },
    );

    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(7.5, 10);
  });

  it("preserves the current horizontal direction without camera-yaw input", () => {
    const velocity = calculateSlideVelocity(
      { x: 6, z: -8 },
      movementConfig.slideFriction,
      0.25,
      { x: 0, z: 0 },
    );

    expect(velocity.x / velocity.z).toBeCloseTo(6 / -8, 10);
    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(9, 10);
  });

  it.each([1 / 60, 1 / 144, 1 / 240, 0.25])(
    "never increases speed for a positive %.6f second update",
    (deltaTime) => {
      const input = { x: 3, z: 7 };
      const velocity = calculateSlideVelocity(
        input,
        movementConfig.slideFriction,
        deltaTime,
        { x: 0, z: 0 },
      );

      expect(Math.hypot(velocity.x, velocity.z)).toBeLessThanOrEqual(
        Math.hypot(input.x, input.z),
      );
    },
  );

  it("clamps speed at zero without reversing direction", () => {
    const velocity = calculateSlideVelocity(
      { x: 0.2, z: -0.1 },
      movementConfig.slideFriction,
      1,
      { x: 0, z: 0 },
    );

    expect(velocity.x).toBe(0);
    expect(velocity.z).toBeCloseTo(0, 10);
    expect(Math.hypot(velocity.x, velocity.z)).toBe(0);
  });

  it("keeps zero horizontal velocity at zero", () => {
    expect(
      calculateSlideVelocity({ x: 0, z: 0 }, movementConfig.slideFriction, 1, {
        x: 1,
        z: 1,
      }),
    ).toEqual({ x: 0, z: 0 });
  });

  it("uses vector magnitude so diagonal momentum gets no speed advantage", () => {
    const axial = calculateSlideVelocity(
      { x: 0, z: -8.5 },
      movementConfig.slideFriction,
      0.1,
      { x: 0, z: 0 },
    );
    const diagonalComponent = 8.5 / Math.sqrt(2);
    const diagonal = calculateSlideVelocity(
      { x: diagonalComponent, z: -diagonalComponent },
      movementConfig.slideFriction,
      0.1,
      { x: 0, z: 0 },
    );

    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(
      Math.hypot(axial.x, axial.z),
      10,
    );
  });
});

describe("slide jump", () => {
  it("retains 90 percent of horizontal Slide momentum and direction", () => {
    const input = { x: 4.8, z: -6.4 };
    const retention = getHorizontalJumpRetention(
      MovementState.Slide,
      movementConfig.slideJumpHorizontalRetention,
    );
    const launch = {
      x: input.x * retention,
      z: input.z * retention,
    };

    expect(Math.hypot(launch.x, launch.z)).toBeCloseTo(7.2, 10);
    expect(launch.x / launch.z).toBeCloseTo(input.x / input.z, 10);
    expect(movementConfig.jumpVelocity).toBe(8);
  });

  it.each([MovementState.Grounded, MovementState.Sprint, MovementState.Crouch])(
    "does not apply Slide retention to %s jumps",
    (jumpSource) => {
      expect(
        getHorizontalJumpRetention(
          jumpSource,
          movementConfig.slideJumpHorizontalRetention,
        ),
      ).toBe(1);
    },
  );
});

describe("slide frame-rate consistency", () => {
  it("keeps 0.4-second decay and travel materially consistent at 60, 144 and 240 Hz", () => {
    const at60Hz = simulateSlide(60, 0.4);
    const at144Hz = simulateSlide(144, 0.4);
    const at240Hz = simulateSlide(240, 0.4);

    expect(at60Hz.finalSpeed).toBeCloseTo(6.9, 10);
    expect(at144Hz.finalSpeed).toBeCloseTo(6.9, 10);
    expect(at240Hz.finalSpeed).toBeCloseTo(6.9, 10);
    expect(Math.abs(at60Hz.distance - at240Hz.distance)).toBeLessThan(0.02);
    expect(Math.abs(at144Hz.distance - at240Hz.distance)).toBeLessThan(0.02);
  });
});

interface SlideSimulationResult {
  readonly finalSpeed: number;
  readonly distance: number;
}

function simulateSlide(
  frequency: number,
  durationSeconds: number,
): SlideSimulationResult {
  const velocity: HorizontalVector = {
    x: 0,
    z: -movementConfig.sprintSpeed,
  };
  const maximumStep = 1 / frequency;
  let elapsedSeconds = 0;
  let distance = 0;

  while (elapsedSeconds < durationSeconds) {
    const deltaTime = Math.min(maximumStep, durationSeconds - elapsedSeconds);
    calculateSlideVelocity(
      velocity,
      movementConfig.slideFriction,
      deltaTime,
      velocity,
    );
    distance += Math.hypot(velocity.x, velocity.z) * deltaTime;
    elapsedSeconds += deltaTime;
  }

  return { finalSpeed: Math.hypot(velocity.x, velocity.z), distance };
}
