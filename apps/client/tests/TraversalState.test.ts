import { describe, expect, it } from "vitest";

import { JumpForgivenessController } from "../src/game/player/JumpForgivenessController";
import { MovementState } from "../src/game/player/MovementState";
import {
  MovementStateController,
  type GroundedModeIntent,
} from "../src/game/player/MovementStateController";
import { movementConfig } from "../src/game/player/movementConfig";

const GROUND_INTENT: GroundedModeIntent = {
  crouchHeld: false,
  crouchPressed: false,
  standClear: true,
  sprintRequested: true,
  forwardInput: 1,
  minimumSprintForwardInput: movementConfig.minimumSprintForwardInput,
  horizontalSpeed: movementConfig.sprintSpeed,
  minimumSlideSpeed: movementConfig.minimumSlideSpeed,
};

describe("traversal state semantics", () => {
  it.each([MovementState.Mantle, MovementState.Vault] as const)(
    "%s is traversing and explicitly not grounded",
    (state) => {
      const movementState = new MovementStateController();

      expect(movementState.startTraversal(state)).toBe(true);
      expect(movementState.current).toBe(state);
      expect(movementState.isGrounded).toBe(false);
      expect(movementState.isTraversing).toBe(true);
      expect(movementState.isMantling).toBe(state === MovementState.Mantle);
      expect(movementState.isVaulting).toBe(state === MovementState.Vault);
    },
  );

  it.each([MovementState.Mantle, MovementState.Vault] as const)(
    "ignores lost ground and landing validity during %s",
    (state) => {
      const movementState = new MovementStateController();
      movementState.startTraversal(state);

      movementState.updateGroundValidity({
        supported: false,
        landingValid: false,
      });
      expect(movementState.current).toBe(state);

      movementState.updateGroundValidity({
        supported: true,
        landingValid: true,
      });
      expect(movementState.current).toBe(state);
    },
  );

  it.each([MovementState.Mantle, MovementState.Vault] as const)(
    "ignores grounded-mode resolution during %s",
    (state) => {
      const movementState = new MovementStateController();
      movementState.startTraversal(state);

      movementState.updateGroundedMode({
        ...GROUND_INTENT,
        crouchHeld: true,
        crouchPressed: true,
      });

      expect(movementState.current).toBe(state);
    },
  );

  it("completes traversal to Grounded", () => {
    const movementState = new MovementStateController();
    movementState.startTraversal(MovementState.Mantle);

    movementState.completeTraversal();

    expect(movementState.current).toBe(MovementState.Grounded);
    expect(movementState.isGrounded).toBe(true);
    expect(movementState.isTraversing).toBe(false);
  });

  it("cancels a safety-invalid traversal to Airborne", () => {
    const movementState = new MovementStateController();
    movementState.startTraversal(MovementState.Vault);

    movementState.cancelTraversal();

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isTraversing).toBe(false);
  });

  it("reset removes traversal state", () => {
    const movementState = new MovementStateController();
    movementState.startTraversal(MovementState.Mantle);

    movementState.reset();

    expect(movementState.current).toBe(MovementState.Airborne);
  });
});

describe("jump forgiveness excludes traversal", () => {
  it.each([MovementState.Mantle, MovementState.Vault])(
    "does not expose %s as a jump source",
    (state) => {
      const forgiveness = new JumpForgivenessController(
        movementConfig.coyoteTimeSeconds,
        movementConfig.jumpBufferTimeSeconds,
      );
      forgiveness.recordJumpPress();

      expect(forgiveness.getEffectiveJumpSource(state)).toBeNull();
    },
  );

  it("clears coyote, buffer, and source together", () => {
    const forgiveness = new JumpForgivenessController(
      movementConfig.coyoteTimeSeconds,
      movementConfig.jumpBufferTimeSeconds,
    );
    forgiveness.armCoyote(MovementState.Sprint);
    forgiveness.recordJumpPress();

    forgiveness.reset();

    expect(forgiveness.coyoteActive).toBe(false);
    expect(forgiveness.jumpBufferActive).toBe(false);
    expect(forgiveness.coyoteSource).toBeNull();
  });
});
