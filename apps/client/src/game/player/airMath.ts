import {
  resolveWorldMovementDirection,
  type HorizontalVector,
} from "./movementMath";

const MINIMUM_VECTOR_LENGTH = 1e-8;

export function calculateAirVelocity(
  currentVelocity: Readonly<HorizontalVector>,
  movementInput: Readonly<HorizontalVector>,
  viewYawRadians: number,
  airAcceleration: number,
  maxAirSpeed: number,
  deltaTimeSeconds: number,
  output: HorizontalVector,
): HorizontalVector {
  const inputMagnitude = Math.hypot(movementInput.x, movementInput.z);
  // Camera rotation alone must not bend inherited momentum.
  if (inputMagnitude <= MINIMUM_VECTOR_LENGTH) {
    output.x = currentVelocity.x;
    output.z = currentVelocity.z;
    return output;
  }

  const currentX = currentVelocity.x;
  const currentZ = currentVelocity.z;
  const currentSpeed = Math.hypot(currentX, currentZ);
  // Air input can redirect inherited overspeed, but cannot generate more of it.
  const speedCeiling = Math.max(currentSpeed, Math.max(0, maxAirSpeed));
  resolveWorldMovementDirection(movementInput, viewYawRadians, output);
  const targetX = output.x * speedCeiling;
  const targetZ = output.z * speedCeiling;
  const changeX = targetX - currentX;
  const changeZ = targetZ - currentZ;
  const changeLength = Math.hypot(changeX, changeZ);
  const maximumChange =
    Math.max(0, airAcceleration) * Math.max(0, deltaTimeSeconds);

  if (changeLength <= maximumChange || changeLength <= MINIMUM_VECTOR_LENGTH) {
    output.x = targetX;
    output.z = targetZ;
  } else {
    const changeScale = maximumChange / changeLength;
    output.x = currentX + changeX * changeScale;
    output.z = currentZ + changeZ * changeScale;
  }

  const outputSpeed = Math.hypot(output.x, output.z);
  if (outputSpeed > speedCeiling && outputSpeed > MINIMUM_VECTOR_LENGTH) {
    const ceilingScale = speedCeiling / outputSpeed;
    output.x *= ceilingScale;
    output.z *= ceilingScale;
  }

  return output;
}
