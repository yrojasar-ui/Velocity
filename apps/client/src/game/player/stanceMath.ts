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
