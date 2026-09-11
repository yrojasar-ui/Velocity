import { describe, expect, it } from "vitest";

import {
  isGroundedMovementState,
  isTraversalMovementState,
  MovementState,
} from "../src/game/player/MovementState";
import { movementConfig } from "../src/game/player/movementConfig";
import {
  calculateTraversalHeight,
  canStartTraversalFromState,
  classifyTraversalHeight,
  evaluateTraversalPath,
  hasTraversalForwardIntent,
  isFrontSurfaceFacingPlayer,
  type MutableVector3,
  type TraversalPath,
} from "../src/game/player/traversalMath";

describe("movement-state categories", () => {
  it.each([
    [MovementState.Grounded, true, false],
    [MovementState.Sprint, true, false],
    [MovementState.Crouch, true, false],
    [MovementState.Slide, true, false],
    [MovementState.Airborne, false, false],
    [MovementState.Mantle, false, true],
    [MovementState.Vault, false, true],
  ])("classifies %s explicitly", (state, grounded, traversal) => {
    expect(isGroundedMovementState(state)).toBe(grounded);
    expect(isTraversalMovementState(state)).toBe(traversal);
  });
});

describe("traversal candidate rules", () => {
  it.each([
    [0.2, null],
    [0.34, null],
    [0.35, MovementState.Vault],
    [0.5, MovementState.Vault],
    [0.75, MovementState.Vault],
    [0.7501, MovementState.Mantle],
    [1, MovementState.Mantle],
    [1.25, MovementState.Mantle],
    [1.5, MovementState.Mantle],
    [1.5001, null],
    [1.51, null],
    [2, null],
  ])("classifies %.2f m as %s", (height, expected) => {
    expect(
      classifyTraversalHeight(
        height,
        movementConfig.minimumVaultHeight,
        movementConfig.maximumVaultHeight,
        movementConfig.maximumMantleHeight,
      ),
    ).toBe(expected);
  });

  it("measures ledge height relative to player feet", () => {
    expect(calculateTraversalHeight(0.5, 0)).toBe(0.5);
    expect(calculateTraversalHeight(3.5, 3)).toBe(0.5);
  });

  it.each([
    [-1, false],
    [0, false],
    [0.49, false],
    [0.5, true],
    [Math.SQRT1_2, true],
    [1, true],
  ])("requires sufficient forward input at %f", (moveZ, accepted) => {
    expect(
      hasTraversalForwardIntent(
        moveZ,
        movementConfig.minimumTraversalForwardInput,
      ),
    ).toBe(accepted);
  });

  it("accepts opposing faces and rejects grazing or rear faces", () => {
    const forward = { x: 0, z: -1 };

    expect(isFrontSurfaceFacingPlayer({ x: 0, z: 1 }, forward)).toBe(true);
    expect(isFrontSurfaceFacingPlayer({ x: 1, z: 0 }, forward)).toBe(false);
    expect(isFrontSurfaceFacingPlayer({ x: 0, z: -1 }, forward)).toBe(false);
  });

  it.each([
    [MovementState.Vault, MovementState.Grounded, true, true],
    [MovementState.Vault, MovementState.Sprint, true, true],
    [MovementState.Vault, MovementState.Airborne, true, false],
    [MovementState.Mantle, MovementState.Grounded, true, true],
    [MovementState.Mantle, MovementState.Sprint, true, true],
    [MovementState.Mantle, MovementState.Airborne, true, true],
    [MovementState.Mantle, MovementState.Crouch, true, false],
    [MovementState.Mantle, MovementState.Slide, true, false],
    [MovementState.Mantle, MovementState.Grounded, false, false],
  ] as const)(
    "%s from %s while standing=%s is accepted=%s",
    (kind, source, standing, accepted) => {
      expect(canStartTraversalFromState(kind, source, standing)).toBe(accepted);
    },
  );
});

describe("deterministic traversal paths", () => {
  const output: MutableVector3 = { x: 0, y: 0, z: 0 };

  it("raises a Mantle before crossing its front face", () => {
    const path: TraversalPath = {
      kind: MovementState.Mantle,
      start: { x: 0, y: 0.9, z: 0 },
      target: { x: 0, y: 1.9, z: -0.9 },
      clearanceCenterY: 1.92,
    };

    evaluateTraversalPath(path, 0.25, output);
    expect(output.x).toBe(0);
    expect(output.z).toBe(0);
    expect(output.y).toBeGreaterThan(path.start.y);

    evaluateTraversalPath(path, 0.5, output);
    expect(output).toEqual({ x: 0, y: 1.92, z: 0 });

    evaluateTraversalPath(path, 1, output);
    expect(output).toEqual(path.target);
  });

  it("Vaults forward through a smooth rise and settles at target", () => {
    const path: TraversalPath = {
      kind: MovementState.Vault,
      start: { x: 0, y: 0.9, z: 0 },
      target: { x: 0, y: 0.9, z: -2.2 },
      clearanceCenterY: 1.42,
    };

    evaluateTraversalPath(path, 0, output);
    expect(output).toEqual(path.start);
    evaluateTraversalPath(path, 0.5, output);
    expect(output.z).toBeLessThan(0);
    expect(output.y).toBeGreaterThan(path.start.y);
    evaluateTraversalPath(path, 1, output);
    expect(output).toEqual(path.target);
  });

  it("clamps progress without path overshoot", () => {
    const path: TraversalPath = {
      kind: MovementState.Vault,
      start: { x: 1, y: 1, z: 1 },
      target: { x: 2, y: 1, z: -1 },
      clearanceCenterY: 1.5,
    };

    evaluateTraversalPath(path, -1, output);
    expect(output).toEqual(path.start);
    evaluateTraversalPath(path, 2, output);
    expect(output).toEqual(path.target);
  });
});
