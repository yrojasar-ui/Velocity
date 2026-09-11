import { MovementState, type TraversalMovementState } from "./MovementState";

export interface Vector3Value {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MutableVector3 {
  x: number;
  y: number;
  z: number;
}

export interface TraversalPath {
  readonly kind: TraversalMovementState;
  readonly start: Vector3Value;
  readonly target: Vector3Value;
  /** Root-center height used to clear the obstacle along the committed path. */
  readonly clearanceCenterY: number;
}

// Ammo ray hits can differ from authored box heights by a few micrometers.
const HEIGHT_BOUNDARY_EPSILON_METERS = 1e-5;
const MINIMUM_FRONT_FACING_DOT = 0.5;
const VAULT_RISE_END_PROGRESS = 0.3;
const VAULT_CROSSING_END_PROGRESS = 0.8;

export function classifyTraversalHeight(
  height: number,
  minimumVaultHeight: number,
  maximumVaultHeight: number,
  maximumMantleHeight: number,
): TraversalMovementState | null {
  if (
    height < minimumVaultHeight - HEIGHT_BOUNDARY_EPSILON_METERS ||
    height > maximumMantleHeight + HEIGHT_BOUNDARY_EPSILON_METERS
  ) {
    return null;
  }

  return height <= maximumVaultHeight + HEIGHT_BOUNDARY_EPSILON_METERS
    ? MovementState.Vault
    : MovementState.Mantle;
}

export function calculateTraversalHeight(
  topSurfaceY: number,
  playerFeetY: number,
): number {
  return topSurfaceY - playerFeetY;
}

export function hasTraversalForwardIntent(
  forwardInput: number,
  minimumForwardInput: number,
): boolean {
  return forwardInput >= minimumForwardInput;
}

export function isFrontSurfaceFacingPlayer(
  surfaceNormal: Readonly<Pick<Vector3Value, "x" | "z">>,
  forward: Readonly<Pick<Vector3Value, "x" | "z">>,
): boolean {
  // A 60-degree facing cone rejects grazing wall contacts while accepting diagonals.
  const opposingDot = -(
    surfaceNormal.x * forward.x +
    surfaceNormal.z * forward.z
  );
  return opposingDot >= MINIMUM_FRONT_FACING_DOT;
}

export function canStartTraversalFromState(
  kind: TraversalMovementState,
  source: MovementState,
  physicallyStanding: boolean,
): boolean {
  if (!physicallyStanding) {
    return false;
  }

  if (kind === MovementState.Vault) {
    return source === MovementState.Grounded || source === MovementState.Sprint;
  }

  return (
    source === MovementState.Grounded ||
    source === MovementState.Sprint ||
    source === MovementState.Airborne
  );
}

export function canAttemptTraversalFromState(
  source: MovementState,
  physicallyStanding: boolean,
): boolean {
  return (
    physicallyStanding &&
    (source === MovementState.Grounded ||
      source === MovementState.Sprint ||
      source === MovementState.Airborne)
  );
}

export function evaluateTraversalPath(
  path: Readonly<TraversalPath>,
  progress: number,
  output: MutableVector3,
): MutableVector3 {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  if (path.kind === MovementState.Mantle) {
    evaluateMantlePath(path, clampedProgress, output);
  } else {
    evaluateVaultPath(path, clampedProgress, output);
  }

  return output;
}

function evaluateMantlePath(
  path: Readonly<TraversalPath>,
  progress: number,
  output: MutableVector3,
): void {
  if (progress <= 0.5) {
    const verticalProgress = smoothStep(progress * 2);
    output.x = path.start.x;
    output.y = lerp(path.start.y, path.clearanceCenterY, verticalProgress);
    output.z = path.start.z;
    return;
  }

  const forwardProgress = smoothStep((progress - 0.5) * 2);
  output.x = lerp(path.start.x, path.target.x, forwardProgress);
  output.y = lerp(path.clearanceCenterY, path.target.y, forwardProgress);
  output.z = lerp(path.start.z, path.target.z, forwardProgress);
}

function evaluateVaultPath(
  path: Readonly<TraversalPath>,
  progress: number,
  output: MutableVector3,
): void {
  if (progress <= VAULT_RISE_END_PROGRESS) {
    const riseProgress = smoothStep(progress / VAULT_RISE_END_PROGRESS);
    output.x = path.start.x;
    output.y = lerp(path.start.y, path.clearanceCenterY, riseProgress);
    output.z = path.start.z;
    return;
  }

  if (progress <= VAULT_CROSSING_END_PROGRESS) {
    const crossingProgress = smoothStep(
      (progress - VAULT_RISE_END_PROGRESS) /
        (VAULT_CROSSING_END_PROGRESS - VAULT_RISE_END_PROGRESS),
    );
    output.x = lerp(path.start.x, path.target.x, crossingProgress);
    output.y = path.clearanceCenterY;
    output.z = lerp(path.start.z, path.target.z, crossingProgress);
    return;
  }

  const settleProgress = smoothStep(
    (progress - VAULT_CROSSING_END_PROGRESS) /
      (1 - VAULT_CROSSING_END_PROGRESS),
  );
  output.x = path.target.x;
  output.y = lerp(path.clearanceCenterY, path.target.y, settleProgress);
  output.z = path.target.z;
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
