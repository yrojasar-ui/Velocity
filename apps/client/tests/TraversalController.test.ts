import { Vec3 } from "playcanvas";
import { describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import {
  TraversalController,
  type TraversalCandidate,
} from "../src/game/player/TraversalController";
import { movementConfig } from "../src/game/player/movementConfig";

describe("TraversalController", () => {
  it.each([
    [MovementState.Vault, movementConfig.vaultDurationSeconds],
    [MovementState.Mantle, movementConfig.mantleDurationSeconds],
  ] as const)("completes %s at its configured duration", (kind, duration) => {
    const traversal = new TraversalController(movementConfig);
    const candidate = createCandidate(kind);

    expect(traversal.start(candidate, new Vec3(2, -8, -3))).toBe(true);
    const step = traversal.advance(duration);

    expect(step.completed).toBe(true);
    expect(step.position).toEqual(candidate.path.target);
    expect(traversal.elapsed).toBe(duration);
    expect(traversal.exitLinearVelocity).toEqual(new Vec3(2, 0, -3));
  });

  it.each([
    [MovementState.Vault, 60],
    [MovementState.Vault, 144],
    [MovementState.Vault, 240],
    [MovementState.Mantle, 60],
    [MovementState.Mantle, 144],
    [MovementState.Mantle, 240],
  ] as const)(
    "keeps %s position/time/velocity equivalent at %i Hz",
    (kind, framesPerSecond) => {
      const traversal = new TraversalController(movementConfig);
      const candidate = createCandidate(kind);
      traversal.start(candidate, new Vec3(4, -8, 0));

      let finalPosition: Readonly<Vec3> = Vec3.ZERO;
      while (traversal.isActive) {
        finalPosition = traversal.advance(1 / framesPerSecond).position;
      }

      const expectedDuration =
        kind === MovementState.Vault
          ? movementConfig.vaultDurationSeconds
          : movementConfig.mantleDurationSeconds;
      expect(traversal.elapsed).toBe(expectedDuration);
      expect(finalPosition).toEqual(candidate.path.target);
      expect(traversal.exitLinearVelocity).toEqual(new Vec3(4, 0, 0));
    },
  );

  it("never invents exit momentum", () => {
    const traversal = new TraversalController(movementConfig);
    traversal.start(createCandidate(MovementState.Mantle), Vec3.ZERO);

    traversal.advance(movementConfig.mantleDurationSeconds);

    expect(traversal.exitLinearVelocity.length()).toBe(0);
  });

  it("preserves but never increases high entry momentum", () => {
    const traversal = new TraversalController(movementConfig);
    traversal.start(
      createCandidate(MovementState.Vault),
      new Vec3(0, 2, movementConfig.sprintSpeed),
    );

    traversal.advance(movementConfig.vaultDurationSeconds);

    expect(traversal.exitLinearVelocity.length()).toBe(
      movementConfig.sprintSpeed,
    );
    expect(traversal.exitLinearVelocity.y).toBe(0);
  });

  it("reset clears active traversal and remembered momentum", () => {
    const traversal = new TraversalController(movementConfig);
    traversal.start(createCandidate(MovementState.Mantle), new Vec3(4, 0, 0));
    traversal.advance(0.1);

    traversal.reset();

    expect(traversal.isActive).toBe(false);
    expect(traversal.progress).toBe(0);
    expect(traversal.exitLinearVelocity).toEqual(Vec3.ZERO);
  });
});

function createCandidate(
  kind: MovementState.Mantle | MovementState.Vault,
): TraversalCandidate {
  return {
    kind,
    obstacleHeight: kind === MovementState.Vault ? 0.5 : 1,
    obstacleDepth: kind === MovementState.Vault ? 1 : null,
    topPoint: new Vec3(0, kind === MovementState.Vault ? 0.5 : 1, -0.5),
    path: {
      kind,
      start: new Vec3(0, 0.9, 0),
      target: new Vec3(0, kind === MovementState.Vault ? 0.9 : 1.9, -2),
      clearanceCenterY: kind === MovementState.Vault ? 1.42 : 1.92,
    },
  };
}
