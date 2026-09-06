import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import {
  MovementStateController,
  type GroundedModeIntent,
} from "../src/game/player/MovementStateController";
import { movementConfig } from "../src/game/player/movementConfig";
import { normalizeMovementInput } from "../src/game/player/movementMath";

const DEFAULT_INTENT: GroundedModeIntent = {
  crouchHeld: false,
  crouchPressed: false,
  standClear: true,
  sprintRequested: false,
  forwardInput: 0,
  minimumSprintForwardInput: movementConfig.minimumSprintForwardInput,
  horizontalSpeed: 0,
  minimumSlideSpeed: movementConfig.minimumSlideSpeed,
};

describe("MovementStateController", () => {
  it("starts Airborne and not grounded", () => {
    const movementState = new MovementStateController();

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("enters Sprint from Grounded for an eligible request", () => {
    const movementState = createGroundedState();

    updateGroundedMode(movementState, {
      sprintRequested: true,
      forwardInput: 1,
    });

    expect(movementState.current).toBe(MovementState.Sprint);
    expect(movementState.isSprinting).toBe(true);
    expect(movementState.isGrounded).toBe(true);
  });

  it("transitions from Grounded to Airborne when ground is lost", () => {
    const movementState = createGroundedState();

    movementState.updateGroundValidity(false);

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("keeps Grounded active while ground remains valid", () => {
    const movementState = createGroundedState();

    movementState.updateGroundValidity(true);

    expect(movementState.current).toBe(MovementState.Grounded);
    expect(movementState.isGrounded).toBe(true);
  });

  it("remains Grounded for a sideways sprint request", () => {
    const movementState = createGroundedState();

    updateGroundedMode(movementState, {
      sprintRequested: true,
      forwardInput: 0,
    });

    expect(movementState.current).toBe(MovementState.Grounded);
  });

  it("remains Grounded for a backward sprint request", () => {
    const movementState = createGroundedState();

    updateGroundedMode(movementState, {
      sprintRequested: true,
      forwardInput: -1,
    });

    expect(movementState.current).toBe(MovementState.Grounded);
  });

  it("accepts normalized W+A and W+D forward input for sprint", () => {
    for (const moveX of [-1, 1]) {
      const movementState = createGroundedState();
      const normalized = normalizeMovementInput(moveX, 1, { x: 0, z: 0 });

      updateGroundedMode(movementState, {
        sprintRequested: true,
        forwardInput: normalized.z,
      });

      expect(normalized.z).toBeGreaterThan(0.5);
      expect(movementState.current).toBe(MovementState.Sprint);
    }
  });

  it("returns from Sprint to Grounded when sprint is released", () => {
    const movementState = createSprintState();

    updateGroundedMode(movementState);

    expect(movementState.current).toBe(MovementState.Grounded);
  });

  it("returns from Sprint to Grounded when forward eligibility is lost", () => {
    const movementState = createSprintState();

    updateGroundedMode(movementState, {
      sprintRequested: true,
      forwardInput: 0,
    });

    expect(movementState.current).toBe(MovementState.Grounded);
  });

  it("enters Crouch from Sprint when crouch is requested", () => {
    const movementState = createSprintState();

    updateGroundedMode(movementState, { crouchHeld: true });

    expect(movementState.current).toBe(MovementState.Crouch);
    expect(movementState.isCrouched).toBe(true);
    expect(movementState.isGrounded).toBe(true);
  });

  it("enters Crouch from Grounded when crouch is requested", () => {
    const movementState = createGroundedState();

    updateGroundedMode(movementState, { crouchHeld: true });

    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("remains in Crouch while crouch is held", () => {
    const movementState = createCrouchState();

    updateGroundedMode(movementState, { crouchHeld: true });

    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("remains in Crouch when crouch is released under blocked geometry", () => {
    const movementState = createCrouchState();

    updateGroundedMode(movementState, { standClear: false });

    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("returns from Crouch to Grounded when crouch is released in clear space", () => {
    const movementState = createCrouchState();

    updateGroundedMode(movementState);

    expect(movementState.current).toBe(MovementState.Grounded);
  });

  it("enters Sprint from Crouch only after standing clearance succeeds", () => {
    const movementState = createCrouchState();

    updateGroundedMode(movementState, {
      standClear: true,
      sprintRequested: true,
      forwardInput: 1,
    });

    expect(movementState.current).toBe(MovementState.Sprint);
  });

  it("transitions from Sprint to Airborne when ground is lost", () => {
    const movementState = createSprintState();

    movementState.updateGroundValidity(false);

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("transitions from Crouch to Airborne when ground is lost", () => {
    const movementState = createCrouchState();

    movementState.updateGroundValidity(false);

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("enters Slide from Sprint on a sufficient-speed crouch press", () => {
    const movementState = createSprintState();

    updateGroundedMode(movementState, {
      crouchHeld: true,
      crouchPressed: true,
      horizontalSpeed: movementConfig.sprintSpeed,
    });

    expect(movementState.current).toBe(MovementState.Slide);
    expect(movementState.isSliding).toBe(true);
    expect(movementState.isCrouched).toBe(false);
    expect(movementState.requiresCrouchedStance).toBe(true);
    expect(movementState.isGrounded).toBe(true);
  });

  it("enters Slide from Grounded with sufficient real overspeed", () => {
    const movementState = createGroundedState();

    updateGroundedMode(movementState, {
      crouchHeld: true,
      crouchPressed: true,
      horizontalSpeed: 7,
    });

    expect(movementState.current).toBe(MovementState.Slide);
  });

  it.each([
    ["Grounded", createGroundedState],
    ["Sprint", createSprintState],
  ])(
    "enters Crouch from %s when a crouch press is too slow",
    (_label, createState) => {
      const movementState = createState();

      updateGroundedMode(movementState, {
        crouchHeld: true,
        crouchPressed: true,
        horizontalSpeed: movementConfig.minimumSlideSpeed - 0.01,
      });

      expect(movementState.current).toBe(MovementState.Crouch);
    },
  );

  it("does not enter Slide from a held Ctrl without a new press", () => {
    const movementState = createGroundedState();

    updateGroundedMode(movementState, {
      crouchHeld: true,
      crouchPressed: false,
      horizontalSpeed: movementConfig.sprintSpeed,
    });

    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("does not start Slide directly from Crouch", () => {
    const movementState = createCrouchState();

    updateGroundedMode(movementState, {
      crouchHeld: true,
      crouchPressed: true,
      horizontalSpeed: movementConfig.sprintSpeed,
    });

    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("keeps Slide active while Ctrl is held above minimum speed", () => {
    const movementState = createSlideState();

    updateGroundedMode(movementState, {
      crouchHeld: true,
      horizontalSpeed: movementConfig.minimumSlideSpeed + 0.01,
    });

    expect(movementState.current).toBe(MovementState.Slide);
  });

  it("exits Slide to Crouch below minimum speed while Ctrl is held", () => {
    const movementState = createSlideState();

    updateGroundedMode(movementState, {
      crouchHeld: true,
      horizontalSpeed: movementConfig.minimumSlideSpeed - 0.01,
    });

    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("exits Slide to Grounded when Ctrl is released in clear space", () => {
    const movementState = createSlideState();

    updateGroundedMode(movementState);

    expect(movementState.current).toBe(MovementState.Grounded);
  });

  it("exits Slide to Sprint for an eligible release in clear space", () => {
    const movementState = createSlideState();

    updateGroundedMode(movementState, {
      sprintRequested: true,
      forwardInput: 1,
    });

    expect(movementState.current).toBe(MovementState.Sprint);
  });

  it("exits Slide to Crouch when standing is blocked", () => {
    const movementState = createSlideState();

    updateGroundedMode(movementState, { standClear: false });

    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("transitions from Slide to Airborne when ground is lost", () => {
    const movementState = createSlideState();

    movementState.updateGroundValidity(false);

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("starts a jump from Slide when standing clearance is valid", () => {
    const movementState = createSlideState();

    const jumpStarted = movementState.tryStartJump(true);

    expect(jumpStarted).toBe(true);
    expect(movementState.current).toBe(MovementState.Airborne);
  });

  it("rejects a jump from Slide when standing clearance is blocked", () => {
    const movementState = createSlideState();

    const jumpStarted = movementState.tryStartJump(false);

    expect(jumpStarted).toBe(false);
    expect(movementState.current).toBe(MovementState.Slide);
  });

  it("cannot start Slide while Airborne", () => {
    const movementState = new MovementStateController();

    updateGroundedMode(movementState, {
      crouchHeld: true,
      crouchPressed: true,
      horizontalSpeed: movementConfig.sprintSpeed,
    });

    expect(movementState.current).toBe(MovementState.Airborne);
  });

  it.each([
    [MovementState.Sprint, createSprintState],
    [MovementState.Crouch, createCrouchState],
    [MovementState.Slide, createSlideState],
  ])("keeps %s active while ground remains valid", (expected, createState) => {
    const movementState = createState();

    movementState.updateGroundValidity(true);

    expect(movementState.current).toBe(expected);
    expect(movementState.isGrounded).toBe(true);
  });

  it("remains Airborne and non-grounded while ground is invalid", () => {
    const movementState = new MovementStateController();

    movementState.updateGroundValidity(false);
    updateGroundedMode(movementState, {
      crouchHeld: true,
      crouchPressed: true,
      sprintRequested: true,
      forwardInput: 1,
      horizontalSpeed: movementConfig.sprintSpeed,
    });

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("transitions from Airborne to Grounded on landing", () => {
    const movementState = new MovementStateController();

    movementState.updateGroundValidity(true);

    expect(movementState.current).toBe(MovementState.Grounded);
    expect(movementState.isGrounded).toBe(true);
  });

  it("starts a jump from Sprint and enters Airborne", () => {
    const movementState = createSprintState();

    const jumpStarted = movementState.tryStartJump();

    expect(jumpStarted).toBe(true);
    expect(movementState.current).toBe(MovementState.Airborne);
  });

  it("starts a jump from Crouch when standing clearance is valid", () => {
    const movementState = createCrouchState();

    const jumpStarted = movementState.tryStartJump(true);

    expect(jumpStarted).toBe(true);
    expect(movementState.current).toBe(MovementState.Airborne);
  });

  it("rejects a jump from Crouch when standing clearance is blocked", () => {
    const movementState = createCrouchState();

    const jumpStarted = movementState.tryStartJump(false);

    expect(jumpStarted).toBe(false);
    expect(movementState.current).toBe(MovementState.Crouch);
  });

  it("rejects a second airborne jump without changing state", () => {
    const movementState = createGroundedState();
    movementState.tryStartJump();

    const secondJumpStarted = movementState.tryStartJump();

    expect(secondJumpStarted).toBe(false);
    expect(movementState.current).toBe(MovementState.Airborne);
  });

  it("resets any movement mode to Airborne", () => {
    const movementState = createCrouchState();

    movementState.reset();

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });
});

function createGroundedState(): MovementStateController {
  const movementState = new MovementStateController();
  movementState.updateGroundValidity(true);
  return movementState;
}

function createSprintState(): MovementStateController {
  const movementState = createGroundedState();
  updateGroundedMode(movementState, {
    sprintRequested: true,
    forwardInput: 1,
  });
  return movementState;
}

function createCrouchState(): MovementStateController {
  const movementState = createGroundedState();
  updateGroundedMode(movementState, { crouchHeld: true });
  return movementState;
}

function createSlideState(): MovementStateController {
  const movementState = createSprintState();
  updateGroundedMode(movementState, {
    crouchHeld: true,
    crouchPressed: true,
    horizontalSpeed: movementConfig.sprintSpeed,
  });
  return movementState;
}

function updateGroundedMode(
  movementState: MovementStateController,
  intent: Partial<GroundedModeIntent> = {},
): void {
  movementState.updateGroundedMode({ ...DEFAULT_INTENT, ...intent });
}
