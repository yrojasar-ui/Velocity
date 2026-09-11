import { describe, expect, it } from "vitest";

import {
  JumpForgivenessController,
  type GroundedMovementState,
} from "../src/game/player/JumpForgivenessController";
import { MovementState } from "../src/game/player/MovementState";
import { movementConfig } from "../src/game/player/movementConfig";

const INSIDE_GRACE_WINDOW_SECONDS = 0.08;
const OUTSIDE_GRACE_WINDOW_SECONDS = 0.12;
const COYOTE_SOURCES: readonly GroundedMovementState[] = [
  MovementState.Grounded,
  MovementState.Sprint,
  MovementState.Crouch,
  MovementState.Slide,
];

describe("JumpForgivenessController", () => {
  it("authorizes and consumes a coyote jump inside the grace window", () => {
    const forgiveness = createForgiveness();
    forgiveness.armCoyote(MovementState.Grounded);
    forgiveness.advance(INSIDE_GRACE_WINDOW_SECONDS);
    forgiveness.recordJumpPress();

    expect(forgiveness.getEffectiveJumpSource(MovementState.Airborne)).toBe(
      MovementState.Grounded,
    );

    forgiveness.consumeJumpRequest();

    expect(forgiveness.coyoteActive).toBe(false);
    expect(forgiveness.jumpBufferActive).toBe(false);
    expect(forgiveness.coyoteSource).toBeNull();
  });

  it("rejects coyote eligibility after the grace window expires", () => {
    const forgiveness = createForgiveness();
    forgiveness.armCoyote(MovementState.Grounded);
    forgiveness.advance(OUTSIDE_GRACE_WINDOW_SECONDS);
    forgiveness.recordJumpPress();

    expect(
      forgiveness.getEffectiveJumpSource(MovementState.Airborne),
    ).toBeNull();
    expect(forgiveness.coyoteSource).toBeNull();
  });

  it("decrements coyote time instead of rearming it during airborne frames", () => {
    const forgiveness = createForgiveness();
    forgiveness.armCoyote(MovementState.Sprint);

    forgiveness.advance(0.03);
    const firstRemaining = forgiveness.coyoteTimeRemaining;
    forgiveness.advance(0.03);

    expect(firstRemaining).toBeCloseTo(0.07);
    expect(forgiveness.coyoteTimeRemaining).toBeCloseTo(0.04);
    expect(forgiveness.coyoteSource).toBe(MovementState.Sprint);
  });

  it("clears stale coyote source and time on landing", () => {
    const forgiveness = createForgiveness();
    forgiveness.armCoyote(MovementState.Slide);
    forgiveness.clearCoyote();

    expect(forgiveness.coyoteActive).toBe(false);
    expect(forgiveness.coyoteSource).toBeNull();
  });

  it.each(COYOTE_SOURCES)(
    "retains %s as an effective coyote source",
    (source) => {
      const forgiveness = createForgiveness();
      forgiveness.armCoyote(source);
      forgiveness.recordJumpPress();

      expect(forgiveness.getEffectiveJumpSource(MovementState.Airborne)).toBe(
        source,
      );
    },
  );

  it("keeps an airborne jump press buffered without coyote eligibility", () => {
    const forgiveness = createForgiveness();
    forgiveness.recordJumpPress();

    expect(forgiveness.jumpBufferActive).toBe(true);
    expect(
      forgiveness.getEffectiveJumpSource(MovementState.Airborne),
    ).toBeNull();
  });

  it("authorizes a buffered request from the grounded mode resolved on landing", () => {
    const forgiveness = createForgiveness();
    forgiveness.recordJumpPress();
    forgiveness.advance(INSIDE_GRACE_WINDOW_SECONDS);

    expect(forgiveness.getEffectiveJumpSource(MovementState.Sprint)).toBe(
      MovementState.Sprint,
    );
  });

  it("expires a buffered request outside the grace window", () => {
    const forgiveness = createForgiveness();
    forgiveness.recordJumpPress();
    forgiveness.advance(OUTSIDE_GRACE_WINDOW_SECONDS);

    expect(forgiveness.jumpBufferActive).toBe(false);
    expect(
      forgiveness.getEffectiveJumpSource(MovementState.Grounded),
    ).toBeNull();
  });

  it("clamps timers at zero and ignores negative elapsed time", () => {
    const forgiveness = createForgiveness();
    forgiveness.armCoyote(MovementState.Grounded);
    forgiveness.recordJumpPress();

    forgiveness.advance(-1);
    expect(forgiveness.coyoteTimeRemaining).toBe(
      movementConfig.coyoteTimeSeconds,
    );
    expect(forgiveness.jumpBufferTimeRemaining).toBe(
      movementConfig.jumpBufferTimeSeconds,
    );

    forgiveness.advance(1);
    expect(forgiveness.coyoteTimeRemaining).toBe(0);
    expect(forgiveness.jumpBufferTimeRemaining).toBe(0);
  });

  it("clears both timers and the remembered source on reset", () => {
    const forgiveness = createForgiveness();
    forgiveness.armCoyote(MovementState.Crouch);
    forgiveness.recordJumpPress();

    forgiveness.reset();

    expect(forgiveness.coyoteActive).toBe(false);
    expect(forgiveness.jumpBufferActive).toBe(false);
    expect(forgiveness.coyoteSource).toBeNull();
  });

  it.each([60, 144, 240])(
    "uses elapsed seconds for coyote timing at %i Hz",
    (framesPerSecond) => {
      const accepted = createForgiveness();
      accepted.armCoyote(MovementState.Grounded);
      advanceFor(accepted, framesPerSecond, INSIDE_GRACE_WINDOW_SECONDS);
      accepted.recordJumpPress();

      const expired = createForgiveness();
      expired.armCoyote(MovementState.Grounded);
      advanceFor(expired, framesPerSecond, OUTSIDE_GRACE_WINDOW_SECONDS);
      expired.recordJumpPress();

      expect(accepted.getEffectiveJumpSource(MovementState.Airborne)).toBe(
        MovementState.Grounded,
      );
      expect(expired.getEffectiveJumpSource(MovementState.Airborne)).toBeNull();
    },
  );

  it.each([60, 144, 240])(
    "uses elapsed seconds for jump-buffer timing at %i Hz",
    (framesPerSecond) => {
      const accepted = createForgiveness();
      accepted.recordJumpPress();
      advanceFor(accepted, framesPerSecond, INSIDE_GRACE_WINDOW_SECONDS);

      const expired = createForgiveness();
      expired.recordJumpPress();
      advanceFor(expired, framesPerSecond, OUTSIDE_GRACE_WINDOW_SECONDS);

      expect(accepted.getEffectiveJumpSource(MovementState.Grounded)).toBe(
        MovementState.Grounded,
      );
      expect(expired.getEffectiveJumpSource(MovementState.Grounded)).toBeNull();
    },
  );
});

function createForgiveness(): JumpForgivenessController {
  return new JumpForgivenessController(
    movementConfig.coyoteTimeSeconds,
    movementConfig.jumpBufferTimeSeconds,
  );
}

function advanceFor(
  forgiveness: JumpForgivenessController,
  framesPerSecond: number,
  elapsedSeconds: number,
): void {
  const frameSeconds = 1 / framesPerSecond;
  let remainingSeconds = elapsedSeconds;

  while (remainingSeconds > 0) {
    const stepSeconds = Math.min(frameSeconds, remainingSeconds);
    forgiveness.advance(stepSeconds);
    remainingSeconds -= stepSeconds;
  }
}
