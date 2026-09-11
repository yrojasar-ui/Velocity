import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import { movementConfig } from "../src/game/player/movementConfig";
import {
  NO_GROUND,
  VALID_GROUND,
  createHarness,
  inputForState,
} from "./helpers/characterMotorHarness";

describe("CharacterMotor jump forgiveness", () => {
  it("becomes Airborne immediately and accepts coyote jump at 80 ms", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setGroundSample(NO_GROUND);

    harness.update();

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.forgiveness.coyoteActive).toBe(true);

    harness.update({}, 0.08);
    harness.update({ jumpPressed: true });

    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
  });

  it("accepts coyote jump on the same frame as edge loss and Space", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setGroundSample(NO_GROUND);

    harness.update({ jumpPressed: true });

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.forgiveness.coyoteActive).toBe(false);
  });

  it("rejects coyote jump after 120 ms", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setGroundSample(NO_GROUND);
    harness.update();
    harness.update({}, 0.1);
    harness.setVelocity(0, -1, 0);

    harness.update({ jumpPressed: true }, 0.02);

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(-1);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.jumpBufferActive).toBe(true);
  });

  it("does not arm coyote or double jump after a normal jump", () => {
    const harness = createHarness(MovementState.Grounded);

    harness.update({ jumpPressed: true });
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.forgiveness.coyoteActive).toBe(false);

    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, 4, 0);
    harness.update({ jumpPressed: true }, 0.05);

    expect(harness.velocity.y).toBe(4);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.jumpBufferActive).toBe(true);
  });

  it("does not rearm coyote during repeated unsupported updates", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setGroundSample(NO_GROUND);
    harness.update();
    harness.update({}, 0.03);
    const firstRemaining = harness.forgiveness.coyoteTimeRemaining;

    harness.update({}, 0.03);

    expect(firstRemaining).toBeCloseTo(0.07);
    expect(harness.forgiveness.coyoteTimeRemaining).toBeCloseTo(0.04);
  });

  it("clears coyote eligibility on a valid landing", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setGroundSample(NO_GROUND);
    harness.update();
    harness.update({}, 0.04);
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 0);

    harness.update();

    expect(harness.movementState.current).toBe(MovementState.Grounded);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.coyoteSource).toBeNull();
  });

  it("executes an 80 ms buffered request on authoritative landing", () => {
    const harness = createHarness();
    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, -2, 0);
    harness.update({ jumpPressed: true });
    harness.update({}, 0.08);
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 0);

    harness.update();

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
  });

  it("does not execute a 120 ms expired buffer on landing", () => {
    const harness = createHarness();
    harness.setGroundSample(NO_GROUND);
    harness.update({ jumpPressed: true });
    harness.update({}, 0.1);
    harness.update({}, 0.02);
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 0);

    harness.update();

    expect(harness.movementState.current).toBe(MovementState.Grounded);
    expect(harness.velocity.y).toBe(0);
  });

  it("does not treat loose support during a fast fall as landing", () => {
    const harness = createHarness();
    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, -20, 0);
    harness.update({ jumpPressed: true });
    harness.setGroundSample(VALID_GROUND);

    harness.update({}, 0.04);

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(-20);
    expect(harness.forgiveness.jumpBufferActive).toBe(true);

    harness.setVelocity(0, 0, 0);
    harness.update({}, 0.04);

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("uses the resolved Sprint state for a buffered landing jump", () => {
    const harness = createHarness();
    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, -1, movementConfig.sprintSpeed);
    harness.update({ jumpPressed: true });
    harness.update({}, 0.05);
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, movementConfig.sprintSpeed);

    harness.update({ moveZ: 1, sprintHeld: true });

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.z).toBe(movementConfig.sprintSpeed);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("executes fresh Space on the same frame as a valid landing", () => {
    const harness = createHarness();
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 0);

    harness.update({ jumpPressed: true });

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
  });

  it("does not create another request while Space remains held", () => {
    const harness = createHarness();
    harness.setGroundSample(NO_GROUND);
    harness.update({ jumpPressed: true });
    harness.update({}, 0.05);
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 0);
    harness.update();

    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);

    harness.setVelocity(0, 0, 0);
    harness.update({}, 0.1);

    expect(harness.movementState.current).toBe(MovementState.Grounded);
    expect(harness.velocity.y).toBe(0);
  });

  it("resolves a held-C buffered landing as Crouch without inventing Slide", () => {
    const harness = createHarness();
    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, -1, 10);
    harness.update({ crouchHeld: true, jumpPressed: true });
    harness.update({ crouchHeld: true }, 0.05);
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 10);

    harness.update({ crouchHeld: true });

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.z).toBe(10);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("consumes a blocked crouch request without a delayed surprise jump", () => {
    const harness = createHarness(MovementState.Crouch, true);
    harness.setStandClear(false);

    harness.update({ crouchHeld: true, jumpPressed: true });

    expect(harness.movementState.current).toBe(MovementState.Crouch);
    expect(harness.velocity.y).toBe(0);
    expect(harness.stanceCrouched).toBe(true);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);

    harness.setStandClear(true);
    harness.update({ crouchHeld: true }, 0.05);

    expect(harness.movementState.current).toBe(MovementState.Crouch);
    expect(harness.velocity.y).toBe(0);
  });

  it("consumes a blocked low-profile buffered landing request", () => {
    const harness = createHarness(undefined, true);
    harness.setGroundSample(NO_GROUND);
    harness.setStandClear(false);
    harness.update({ crouchHeld: true, jumpPressed: true });
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 0);

    harness.update({ crouchHeld: true }, 0.05);

    expect(harness.movementState.current).toBe(MovementState.Crouch);
    expect(harness.velocity.y).toBe(0);
    expect(harness.stanceCrouched).toBe(true);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
  });

  it("rejects and consumes a blocked Slide-origin coyote jump", () => {
    const harness = createHarness(MovementState.Slide, true);
    harness.setGroundSample(NO_GROUND);
    harness.setStandClear(false);
    harness.setVelocity(0, 0, 10);

    harness.update({ crouchHeld: true, jumpPressed: true });

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(0);
    expect(harness.stanceCrouched).toBe(true);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
  });

  it("keeps an airborne buffer pending without unnecessary clearance probes", () => {
    const harness = createHarness(undefined, true);
    harness.setGroundSample(NO_GROUND);
    harness.setStandClear(false);

    harness.update({ crouchHeld: true, jumpPressed: true });

    expect(harness.forgiveness.jumpBufferActive).toBe(true);
    expect(harness.standClearanceChecks).toBe(0);
  });

  it.each([
    [MovementState.Grounded, 1],
    [MovementState.Sprint, 1],
    [MovementState.Crouch, 1],
    [MovementState.Slide, movementConfig.slideJumpHorizontalRetention],
  ])(
    "preserves %s direct-jump launch invariants",
    (source, expectedRetention) => {
      const crouched =
        source === MovementState.Crouch || source === MovementState.Slide;
      const harness = createHarness(source, crouched);
      harness.setVelocity(0, 0, 10);

      harness.update(inputForState(source, { jumpPressed: true }));

      expect(harness.velocity.z).toBeCloseTo(10 * expectedRetention);
      expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
      expect(harness.stanceCrouched).toBe(false);
    },
  );

  it("applies existing Slide retention to a Slide-origin coyote jump", () => {
    const harness = createHarness(MovementState.Slide, true);
    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, 0, 10);

    harness.update({ crouchHeld: true, jumpPressed: true });

    expect(harness.velocity.z).toBeCloseTo(
      10 * movementConfig.slideJumpHorizontalRetention,
    );
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.stanceCrouched).toBe(false);
  });

  it("keeps full horizontal velocity for a Sprint-origin coyote jump", () => {
    const harness = createHarness(MovementState.Sprint);
    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, 0, movementConfig.sprintSpeed);

    harness.update({ jumpPressed: true });

    expect(harness.velocity.z).toBe(movementConfig.sprintSpeed);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });
});
