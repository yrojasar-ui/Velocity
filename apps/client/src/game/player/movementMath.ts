export interface HorizontalVector {
  x: number;
  z: number;
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
  const inputScale = inputMagnitude > 1 ? 1 / inputMagnitude : 1;
  const normalizedX = movementInput.x * inputScale;
  const normalizedZ = movementInput.z * inputScale;
  const sine = Math.sin(viewYawRadians);
  const cosine = Math.cos(viewYawRadians);
  const targetX = (normalizedX * cosine - normalizedZ * sine) * maximumSpeed;
  const targetZ = (-normalizedX * sine - normalizedZ * cosine) * maximumSpeed;
  const changeX = targetX - currentVelocity.x;
  const changeZ = targetZ - currentVelocity.z;
  const changeLength = Math.hypot(changeX, changeZ);
  const rate =
    inputMagnitude > MINIMUM_VECTOR_LENGTH ? acceleration : deceleration;
  const maximumChange = Math.max(0, rate * deltaTimeSeconds);

  if (changeLength <= maximumChange || changeLength <= MINIMUM_VECTOR_LENGTH) {
    output.x = targetX;
    output.z = targetZ;
  } else {
    const changeScale = maximumChange / changeLength;
    output.x = currentVelocity.x + changeX * changeScale;
    output.z = currentVelocity.z + changeZ * changeScale;
  }

  const outputSpeed = Math.hypot(output.x, output.z);

  if (outputSpeed > maximumSpeed && outputSpeed > MINIMUM_VECTOR_LENGTH) {
    const speedScale = maximumSpeed / outputSpeed;
    output.x *= speedScale;
    output.z *= speedScale;
  }

  return output;
}
