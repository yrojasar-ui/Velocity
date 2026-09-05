import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import { MovementStateController } from "../src/game/player/MovementStateController";

describe("MovementStateController", () => {
  it("starts Airborne and not grounded", () => {
    const movementState = new MovementStateController();

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("remains Airborne when ground is still invalid", () => {
    const movementState = new MovementStateController();

    movementState.updateGroundValidity(false);

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("enters Grounded when valid ground is observed", () => {
    const movementState = new MovementStateController();

    movementState.updateGroundValidity(true);

    expect(movementState.current).toBe(MovementState.Grounded);
    expect(movementState.isGrounded).toBe(true);
  });

  it("transitions from Grounded to Airborne when ground is lost", () => {
    const movementState = createGroundedState();

    movementState.updateGroundValidity(false);

    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("transitions from Airborne to Grounded on landing", () => {
    const movementState = createGroundedState();
    movementState.updateGroundValidity(false);

    movementState.updateGroundValidity(true);

    expect(movementState.current).toBe(MovementState.Grounded);
    expect(movementState.isGrounded).toBe(true);
  });

  it("transitions to Airborne immediately when a grounded jump starts", () => {
    const movementState = createGroundedState();

    const jumpStarted = movementState.tryStartJump();

    expect(jumpStarted).toBe(true);
    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("rejects an airborne jump without changing state", () => {
    const movementState = createGroundedState();
    movementState.tryStartJump();

    const secondJumpStarted = movementState.tryStartJump();

    expect(secondJumpStarted).toBe(false);
    expect(movementState.current).toBe(MovementState.Airborne);
    expect(movementState.isGrounded).toBe(false);
  });

  it("remains stable across repeated grounded updates", () => {
    const movementState = createGroundedState();

    movementState.updateGroundValidity(true);
    movementState.updateGroundValidity(true);
    movementState.updateGroundValidity(true);

    expect(movementState.current).toBe(MovementState.Grounded);
    expect(movementState.isGrounded).toBe(true);
  });
});

function createGroundedState(): MovementStateController {
  const movementState = new MovementStateController();
  movementState.updateGroundValidity(true);
  return movementState;
}
