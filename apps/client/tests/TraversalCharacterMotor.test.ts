import { Vec3 } from "playcanvas";
import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import type { TraversalCandidate } from "../src/game/player/TraversalController";
import { movementConfig } from "../src/game/player/movementConfig";
import {
  NO_GROUND,
  VALID_GROUND,
  createHarness,
} from "./helpers/characterMotorHarness";

describe("CharacterMotor traversal priority", () => {
  it.each([
    [MovementState.Grounded, MovementState.Vault],
    [MovementState.Sprint, MovementState.Vault],
    [MovementState.Grounded, MovementState.Mantle],
    [MovementState.Sprint, MovementState.Mantle],
    [MovementState.Airborne, MovementState.Mantle],
  ] as const)("starts %s from %s on fresh forward Space", (source, kind) => {
    const harness = createHarness(source);
    if (source === MovementState.Airborne) {
      harness.update();
      harness.setGroundSample(NO_GROUND);
      harness.update();
    }
    harness.setTraversalCandidate(createCandidate(kind));

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.movementState.current).toBe(kind);
    expect(harness.traversal.isActive).toBe(true);
    expect(harness.traversalProbeChecks).toBe(1);
    expect(harness.velocity).toEqual(Vec3.ZERO);
  });

  it("does not probe or auto-traverse without fresh Space", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setTraversalCandidate(createCandidate(MovementState.Vault));

    harness.update({ moveZ: 1 });

    expect(harness.movementState.current).toBe(MovementState.Grounded);
    expect(harness.traversalProbeChecks).toBe(0);
  });

  it.each([{ moveZ: 0.49 }, { moveX: 1, moveZ: 0 }, { moveZ: -1 }] as const)(
    "rejects %j traversal intent and falls back to jump",
    (input) => {
      const harness = createHarness(MovementState.Grounded);
      harness.setTraversalCandidate(createCandidate(MovementState.Vault));

      harness.update({ ...input, jumpPressed: true });

      expect(harness.traversalProbeChecks).toBe(0);
      expect(harness.movementState.current).toBe(MovementState.Airborne);
      expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    },
  );

  it("falls back to normal jump when geometry is invalid", () => {
    const harness = createHarness(MovementState.Grounded);

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.traversalProbeChecks).toBe(1);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("gives valid Mantle priority over coyote jump without injecting jump speed", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.update();
    harness.setGroundSample(NO_GROUND);
    harness.setVelocity(0, -8, -4);
    harness.setTraversalCandidate(createCandidate(MovementState.Mantle));

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.movementState.current).toBe(MovementState.Mantle);
    expect(harness.velocity).toEqual(Vec3.ZERO);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
    expect(harness.forgiveness.coyoteSource).toBeNull();
  });

  it("preserves coyote jump fallback when no Mantle is valid", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.update();
    harness.setGroundSample(NO_GROUND);

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("does not let an old buffered request trigger traversal after landing", () => {
    const harness = createHarness(MovementState.Airborne);
    harness.setGroundSample(NO_GROUND);
    harness.update({ jumpPressed: true });
    harness.update({}, 0.05);
    harness.setTraversalCandidate(createCandidate(MovementState.Vault));
    harness.setGroundSample(VALID_GROUND);
    harness.setVelocity(0, 0, 0);

    harness.update({ moveZ: 1 });

    expect(harness.traversalProbeChecks).toBe(0);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("rejects Airborne Vault without inventing a traversal", () => {
    const harness = createHarness(MovementState.Airborne);
    harness.update();
    harness.setGroundSample(NO_GROUND);
    harness.update({}, movementConfig.coyoteTimeSeconds);
    harness.update({}, movementConfig.coyoteTimeSeconds);
    harness.setVelocity(0, -2, 0);
    harness.setTraversalCandidate(createCandidate(MovementState.Vault));

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.traversal.isActive).toBe(false);
    expect(harness.velocity.y).toBe(-2);
    expect(harness.forgiveness.jumpBufferActive).toBe(true);
  });
});

describe("CharacterMotor traversal isolation", () => {
  it("keeps Slide Jump authoritative and never probes traversal", () => {
    const harness = createHarness(MovementState.Slide, true);
    harness.setVelocity(0, 0, 10);
    harness.setTraversalCandidate(createCandidate(MovementState.Vault));

    harness.update({ moveZ: 1, crouchHeld: true, jumpPressed: true });

    expect(harness.traversalProbeChecks).toBe(0);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.z).toBeCloseTo(
      10 * movementConfig.slideJumpHorizontalRetention,
    );
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("keeps Crouch Jump authoritative and never probes traversal", () => {
    const harness = createHarness(MovementState.Crouch, true);
    harness.setTraversalCandidate(createCandidate(MovementState.Mantle));

    harness.update({ moveZ: 1, crouchHeld: true, jumpPressed: true });

    expect(harness.traversalProbeChecks).toBe(0);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
  });

  it("ignores Space, C, Shift, and steering while traversal owns motion", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setTraversalCandidate(createCandidate(MovementState.Mantle));
    harness.update({ moveZ: 1, jumpPressed: true });
    const probeChecksAtStart = harness.traversalProbeChecks;

    harness.update(
      {
        moveX: 1,
        moveZ: 1,
        jumpPressed: true,
        crouchHeld: true,
        crouchPressed: true,
        sprintHeld: true,
      },
      0.1,
    );

    expect(harness.movementState.current).toBe(MovementState.Mantle);
    expect(harness.traversalProbeChecks).toBe(probeChecksAtStart);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
    expect(harness.stanceCrouched).toBe(false);
  });

  it("commits the path independently from later camera yaw", () => {
    const harness = createHarness(MovementState.Grounded);
    const candidate = createCandidate(MovementState.Vault);
    harness.setTraversalCandidate(candidate);
    harness.update({ moveZ: 1, jumpPressed: true });

    while (harness.traversal.isActive) {
      harness.update({ moveZ: 1 }, 1 / 60, 90);
    }

    expect(harness.position).toEqual(candidate.path.target);
    expect(harness.position.x).toBe(0);
  });

  it("completes at Grounded with zero vertical and bounded entry momentum", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setVelocity(4, 0, 0);
    harness.setTraversalCandidate(createCandidate(MovementState.Vault));
    harness.update({ moveZ: 1, jumpPressed: true });

    while (harness.traversal.isActive) {
      harness.update({}, 0.1);
    }

    expect(harness.movementState.current).toBe(MovementState.Grounded);
    expect(harness.velocity).toEqual(new Vec3(4, 0, 0));
  });

  it("reset during traversal clears path, state, and forgiveness", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.setTraversalCandidate(createCandidate(MovementState.Mantle));
    harness.update({ moveZ: 1, jumpPressed: true });

    harness.traversal.reset();
    harness.resetMotor();
    harness.movementState.reset();
    harness.forgiveness.reset();

    expect(harness.traversal.isActive).toBe(false);
    expect(harness.traversal.progress).toBe(0);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
  });
});

function createCandidate(
  kind: MovementState.Mantle | MovementState.Vault,
): TraversalCandidate {
  const targetY = kind === MovementState.Mantle ? 1.9 : 0.9;
  return {
    kind,
    obstacleHeight: kind === MovementState.Mantle ? 1 : 0.5,
    obstacleDepth: kind === MovementState.Vault ? 1 : null,
    topPoint: new Vec3(0, targetY - movementConfig.playerHeight / 2, -0.5),
    path: {
      kind,
      start: new Vec3(0, movementConfig.playerHeight / 2, 0),
      target: new Vec3(0, targetY, -2),
      clearanceCenterY: targetY + 0.02,
    },
  };
}
