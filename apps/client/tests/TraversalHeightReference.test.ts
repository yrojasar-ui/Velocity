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

describe("CharacterMotor airborne traversal height reference", () => {
  it("captures direct-jump takeoff before rising and retains it for a later fresh Space", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.position.y = 3 + movementConfig.playerHeight / 2;

    harness.update({ jumpPressed: true });
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    harness.setGroundSample(NO_GROUND);
    harness.position.y += 0.57;
    harness.update();
    harness.setTraversalCandidate(createCandidate(MovementState.Mantle));
    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.traversalHeightReferences).toEqual([3]);
    expect(harness.movementState.current).toBe(MovementState.Mantle);
  });

  it.each([
    MovementState.Grounded,
    MovementState.Sprint,
    MovementState.Crouch,
    MovementState.Slide,
  ])(
    "freezes the last physical grounded feet after support loss from %s",
    (state) => {
      const crouched =
        state === MovementState.Crouch || state === MovementState.Slide;
      const harness = createHarness(state, crouched);
      harness.setVelocity(0, 0, -10);
      harness.update({
        moveZ: 1,
        sprintHeld: state === MovementState.Sprint,
        crouchHeld: crouched,
      });
      harness.setGroundSample(NO_GROUND);

      // First support loss is already below the last grounded surface. Later samples rise.
      for (const currentFeetY of [-0.1, 0.2, 0.57, 0.8, 0.4]) {
        harness.position.y = currentFeetY + movementConfig.playerHeight / 2;
        harness.update({}, 0.05);
        harness.update({ moveZ: 1, jumpPressed: true });
      }

      expect(harness.traversalHeightReferences).toEqual([0, 0, 0, 0, 0]);
      expect(harness.traversal.isActive).toBe(false);
    },
  );

  it.each([MovementState.Crouch, MovementState.Slide])(
    "preserves actual shorter-capsule feet through a %s Jump and later Mantle",
    (state) => {
      const harness = createHarness(state, true);
      harness.position.y = 3 + movementConfig.crouchHeight / 2;
      harness.setVelocity(0, 0, -10);

      harness.update({ moveZ: 1, crouchHeld: true, jumpPressed: true });

      expect(harness.traversalProbeChecks).toBe(0);
      expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
      if (state === MovementState.Slide) {
        expect(harness.velocity.z).toBeCloseTo(
          -10 * movementConfig.slideJumpHorizontalRetention,
        );
      }
      harness.setGroundSample(NO_GROUND);
      harness.update();
      harness.position.y = 3.57 + movementConfig.playerHeight / 2;
      harness.setTraversalCandidate(createCandidate(MovementState.Mantle));
      harness.update({ moveZ: 1, jumpPressed: true });

      expect(harness.stanceCrouched).toBe(false);
      expect(harness.traversalHeightReferences).toEqual([3]);
      expect(harness.movementState.current).toBe(MovementState.Mantle);
    },
  );

  it.each([false, true])(
    "refreshes from landing at 3 m before an immediate jump (buffered: %s)",
    (buffered) => {
      const harness = createHarness(MovementState.Grounded);
      harness.update({ jumpPressed: true });
      harness.setGroundSample(NO_GROUND);
      harness.update({ jumpPressed: buffered }, 0.05);
      harness.position.y = 3 + movementConfig.playerHeight / 2;
      // A legitimate landing has resolved its vertical impact before ground validation.
      harness.setVelocity(0, 0, 0);
      harness.setGroundSample(VALID_GROUND);

      harness.update({ jumpPressed: !buffered });

      expect(harness.movementState.current).toBe(MovementState.Airborne);
      expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
      expect(harness.traversalProbeChecks).toBe(0);
      harness.setGroundSample(NO_GROUND);
      harness.position.y += 0.57;
      harness.update();
      harness.setTraversalCandidate(createCandidate(MovementState.Mantle));
      harness.update({ moveZ: 1, jumpPressed: true });

      expect(harness.traversalHeightReferences).toEqual([3]);
      expect(harness.movementState.current).toBe(MovementState.Mantle);
    },
  );

  it("clears pre-reset takeoff height until a new legitimate ground update", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.position.y = 3 + movementConfig.playerHeight / 2;
    harness.update({ jumpPressed: true });
    harness.setGroundSample(NO_GROUND);
    harness.position.y += 0.57;
    harness.resetMotor();
    harness.movementState.reset();
    harness.forgiveness.reset();
    harness.setTraversalCandidate(createCandidate(MovementState.Mantle));

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.traversalHeightReferences).toEqual([null]);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.forgiveness.jumpBufferActive).toBe(true);
    harness.position.y = 6 + movementConfig.playerHeight / 2;
    harness.setVelocity(0, 0, 0);
    harness.setGroundSample(VALID_GROUND);
    harness.update();
    harness.setGroundSample(NO_GROUND);
    harness.position.y += 0.57;
    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.traversalHeightReferences).toEqual([null, 6]);
    expect(harness.movementState.current).toBe(MovementState.Mantle);
  });

  it("keeps fresh Space buffered when spawned Airborne without a grounded reference", () => {
    const harness = createHarness(MovementState.Airborne);
    harness.setGroundSample(NO_GROUND);
    harness.position.y = 1.47;
    harness.setTraversalCandidate(createCandidate(MovementState.Mantle));

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.traversalHeightReferences).toEqual([null]);
    expect(harness.traversal.isActive).toBe(false);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(0);
    expect(harness.forgiveness.jumpBufferActive).toBe(true);
  });

  it("retains takeoff 0 for a rejected candidate and lets active coyote launch", () => {
    const harness = createHarness(MovementState.Grounded);
    harness.update();
    harness.setGroundSample(NO_GROUND);
    harness.position.y = 1.47;
    harness.setVelocity(0, -1, 0);

    harness.update({ moveZ: 1, jumpPressed: true });

    expect(harness.traversalHeightReferences).toEqual([0]);
    expect(harness.traversal.isActive).toBe(false);
    expect(harness.movementState.current).toBe(MovementState.Airborne);
    expect(harness.velocity.y).toBe(movementConfig.jumpVelocity);
    expect(harness.forgiveness.coyoteActive).toBe(false);
    expect(harness.forgiveness.jumpBufferActive).toBe(false);
  });

  it.each([MovementState.Mantle, MovementState.Vault] as const)(
    "clears the takeoff reference on %s start until grounded support is reacquired",
    (kind) => {
      const harness = createHarness(MovementState.Grounded);
      const candidate = createCandidate(kind);
      harness.setTraversalCandidate(candidate);
      harness.update({ moveZ: 1, jumpPressed: true });
      while (harness.traversal.isActive) {
        harness.update({}, 0.1);
      }
      expect(harness.movementState.current).toBe(MovementState.Grounded);
      harness.setGroundSample(NO_GROUND);
      harness.setTraversalCandidate(createCandidate(MovementState.Mantle));

      harness.update({ moveZ: 1, jumpPressed: true });

      expect(harness.traversalHeightReferences).toEqual([0, null]);
      expect(harness.traversal.isActive).toBe(false);
      harness.setGroundSample(VALID_GROUND);
      harness.setVelocity(0, 0, 0);
      harness.update();
      harness.update({ jumpPressed: true });
      harness.setGroundSample(NO_GROUND);
      harness.position.y += 0.57;
      harness.update({ moveZ: 1, jumpPressed: true });

      expect(harness.traversalHeightReferences[2]).toBeCloseTo(
        candidate.path.target.y - movementConfig.playerHeight / 2,
      );
      expect(harness.movementState.current).toBe(MovementState.Mantle);
    },
  );
});

function createCandidate(
  kind: MovementState.Mantle | MovementState.Vault,
): TraversalCandidate {
  const topY = kind === MovementState.Mantle ? 1 : 0.5;
  const targetY = kind === MovementState.Mantle ? 1.9 : 0.9;
  return {
    kind,
    obstacleHeight: topY,
    obstacleDepth: kind === MovementState.Vault ? 1 : null,
    topPoint: new Vec3(0, topY, -0.5),
    path: {
      kind,
      start: new Vec3(0, movementConfig.playerHeight / 2, 0),
      target: new Vec3(0, targetY, -2),
      clearanceCenterY: topY + movementConfig.playerHeight / 2 + 0.02,
    },
  };
}
