import { MovementState } from "./MovementState";
import type { MovementConfig } from "./movementConfig";

export interface HorizontalVector {
  x: number;
  z: number;
}

export function getGroundTargetSpeed(
  movementState: MovementState,
  config: Readonly<MovementConfig>,
): number {
  switch (movementState) {
    case MovementState.Grounded:
      return config.walkSpeed;
    case MovementState.Sprint:
      return config.sprintSpeed;
    case MovementState.Crouch:
      return config.walkSpeed * config.crouchSpeedMultiplier;
    case MovementState.Slide:
      throw new Error(
        "Slide movement uses momentum instead of a target speed.",
      );
    case MovementState.Airborne:
      throw new Error("Airborne movement has no ground target speed.");
  }
}

const MINIMUM_VECTOR_LENGTH = 1e-8;

export function normalizeMovementInput(
  moveX: number,
  moveZ: number,
  output: HorizontalVector,
): HorizontalVector {
  const magnitude = Math.hypot(moveX, moveZ);
  const scale = magnitude > 1 ? 1 / magnitude : 1;

  output.x = moveX * scale;
  output.z = moveZ * scale;
  return output;
}

export function resolveWorldMovementDirection(
  movementInput: Readonly<HorizontalVector>,
  viewYawRadians: number,
  output: HorizontalVector,
): HorizontalVector {
  normalizeMovementInput(movementInput.x, movementInput.z, output);
  const localX = output.x;
  const localZ = output.z;
  const sine = Math.sin(viewYawRadians);
  const cosine = Math.cos(viewYawRadians);

  output.x = localX * cosine - localZ * sine;
  output.z = -localX * sine - localZ * cosine;
  return output;
}

export function calculateGroundVelocity(
  currentVelocity: Readonly<HorizontalVector>,
  movementInput: Readonly<HorizontalVector>,
  viewYawRadians: number,
  maximumSpeed: number,
  acceleration: number,
  deceleration: number,
  deltaTimeSeconds: number,
  output: HorizontalVector,
): HorizontalVector {
  const inputMagnitude = Math.hypot(movementInput.x, movementInput.z);
  const currentX = currentVelocity.x;
  const currentZ = currentVelocity.z;
  resolveWorldMovementDirection(movementInput, viewYawRadians, output);
  const targetX = output.x * maximumSpeed;
  const targetZ = output.z * maximumSpeed;
  const changeX = targetX - currentX;
  const changeZ = targetZ - currentZ;
  const changeLength = Math.hypot(changeX, changeZ);
  const rate =
    inputMagnitude > MINIMUM_VECTOR_LENGTH ? acceleration : deceleration;
  const maximumChange = Math.max(0, rate * deltaTimeSeconds);

  if (changeLength <= maximumChange || changeLength <= MINIMUM_VECTOR_LENGTH) {
    output.x = targetX;
    output.z = targetZ;
  } else {
    const changeScale = maximumChange / changeLength;
    output.x = currentX + changeX * changeScale;
    output.z = currentZ + changeZ * changeScale;
  }

  return output;
}
