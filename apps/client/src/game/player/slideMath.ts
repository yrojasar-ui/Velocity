import { MovementState } from "./MovementState";
import type { HorizontalVector } from "./movementMath";

const MINIMUM_VECTOR_LENGTH = 1e-8;

export function calculateSlideVelocity(
  currentVelocity: Readonly<HorizontalVector>,
  slideFriction: number,
  deltaTimeSeconds: number,
  output: HorizontalVector,
): HorizontalVector {
  const currentSpeed = Math.hypot(currentVelocity.x, currentVelocity.z);
  if (currentSpeed <= MINIMUM_VECTOR_LENGTH) {
    output.x = 0;
    output.z = 0;
    return output;
  }

  const speedLoss = Math.max(0, slideFriction) * Math.max(0, deltaTimeSeconds);
  const nextSpeed = Math.max(0, currentSpeed - speedLoss);
  const speedScale = nextSpeed / currentSpeed;
  output.x = currentVelocity.x * speedScale;
  output.z = currentVelocity.z * speedScale;
  return output;
}

export function getHorizontalJumpRetention(
  jumpSource: MovementState,
  slideJumpHorizontalRetention: number,
): number {
  if (jumpSource !== MovementState.Slide) {
    return 1;
  }

  return Math.min(1, Math.max(0, slideJumpHorizontalRetention));
}
