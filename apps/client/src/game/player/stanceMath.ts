export function getCapsuleCenterHeightDelta(
  currentHeight: number,
  nextHeight: number,
): number {
  return (nextHeight - currentHeight) / 2;
}

export function getCountertranslatedCameraHeight(
  currentCameraHeight: number,
  capsuleCenterHeightDelta: number,
): number {
  return currentCameraHeight - capsuleCenterHeightDelta;
}

export function getGroundProbeEndHeight(
  capsuleCenterHeight: number,
  capsuleHeight: number,
  groundProbeDistance: number,
): number {
  return capsuleCenterHeight - capsuleHeight / 2 - groundProbeDistance;
}

export function isPhysicalCrouchRequired(
  movementRequiresCrouchedStance: boolean,
  physicallyCrouched: boolean,
  crouchHeld: boolean,
  standClear: boolean,
  acceptedLowProfileJump: boolean,
): boolean {
  if (acceptedLowProfileJump) {
    return false;
  }

  return (
    movementRequiresCrouchedStance ||
    (physicallyCrouched && (crouchHeld || !standClear))
  );
}

export function moveTowards(
  current: number,
  target: number,
  maximumDelta: number,
): number {
  if (Math.abs(target - current) <= maximumDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maximumDelta;
}
