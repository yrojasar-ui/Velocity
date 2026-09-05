import { describe, expect, it } from "vitest";

import { movementConfig } from "../src/game/player/movementConfig";
import {
  getCapsuleCenterHeightDelta,
  getCountertranslatedCameraHeight,
  getGroundProbeEndHeight,
  isPhysicalCrouchRequired,
  moveTowards,
} from "../src/game/player/stanceMath";

describe("stance geometry", () => {
  it("lowers the capsule center by half the standing-to-crouch height change", () => {
    expect(
      getCapsuleCenterHeightDelta(
        movementConfig.playerHeight,
        movementConfig.crouchHeight,
      ),
    ).toBeCloseTo(-0.3, 10);
  });

  it("preserves the capsule foot height through crouch and stand changes", () => {
    const standingCenter = movementConfig.playerHeight / 2;
    const crouchedCenter =
      standingCenter +
      getCapsuleCenterHeightDelta(
        movementConfig.playerHeight,
        movementConfig.crouchHeight,
      );
    const restoredCenter =
      crouchedCenter +
      getCapsuleCenterHeightDelta(
        movementConfig.crouchHeight,
        movementConfig.playerHeight,
      );

    expect(standingCenter - movementConfig.playerHeight / 2).toBe(0);
    expect(crouchedCenter - movementConfig.crouchHeight / 2).toBeCloseTo(0, 10);
    expect(restoredCenter).toBeCloseTo(standingCenter, 10);
  });

  it("countertranslates the camera to prevent a world-space stance snap", () => {
    const standingCenter = movementConfig.playerHeight / 2;
    const centerDelta = getCapsuleCenterHeightDelta(
      movementConfig.playerHeight,
      movementConfig.crouchHeight,
    );
    const crouchedCenter = standingCenter + centerDelta;
    const compensatedCameraHeight = getCountertranslatedCameraHeight(
      movementConfig.cameraEyeHeight,
      centerDelta,
    );

    expect(crouchedCenter + compensatedCameraHeight).toBeCloseTo(
      standingCenter + movementConfig.cameraEyeHeight,
      10,
    );
  });

  it("keeps standing grounded geometry within probe reach", () => {
    const standingCenter = movementConfig.playerHeight / 2;

    expect(
      getGroundProbeEndHeight(
        standingCenter,
        movementConfig.playerHeight,
        movementConfig.groundProbeDistance,
      ),
    ).toBeCloseTo(-movementConfig.groundProbeDistance, 10);
  });

  it("keeps crouched grounded geometry within probe reach", () => {
    const standingCenter = movementConfig.playerHeight / 2;
    const crouchedCenter =
      standingCenter +
      getCapsuleCenterHeightDelta(
        movementConfig.playerHeight,
        movementConfig.crouchHeight,
      );

    expect(
      getGroundProbeEndHeight(
        crouchedCenter,
        movementConfig.crouchHeight,
        movementConfig.groundProbeDistance,
      ),
    ).toBeCloseTo(-movementConfig.groundProbeDistance, 10);
  });
});

describe("physical crouch decision", () => {
  it.each([
    {
      name: "preserves an airborne physical crouch while Ctrl is held in clear space",
      movementStateCrouched: false,
      physicallyCrouched: true,
      crouchHeld: true,
      standClear: true,
      acceptedCrouchJump: false,
      expected: true,
    },
    {
      name: "preserves an airborne physical crouch while Ctrl is held under blocked geometry",
      movementStateCrouched: false,
      physicallyCrouched: true,
      crouchHeld: true,
      standClear: false,
      acceptedCrouchJump: false,
      expected: true,
    },
    {
      name: "preserves a released physical crouch while standing is blocked",
      movementStateCrouched: false,
      physicallyCrouched: true,
      crouchHeld: false,
      standClear: false,
      acceptedCrouchJump: false,
      expected: true,
    },
    {
      name: "allows a released physical crouch to stand in clear space",
      movementStateCrouched: false,
      physicallyCrouched: true,
      crouchHeld: false,
      standClear: true,
      acceptedCrouchJump: false,
      expected: false,
    },
    {
      name: "does not initiate physical crouch from standing while airborne",
      movementStateCrouched: false,
      physicallyCrouched: false,
      crouchHeld: true,
      standClear: true,
      acceptedCrouchJump: false,
      expected: false,
    },
    {
      name: "expands after an accepted crouch jump while Ctrl remains held",
      movementStateCrouched: false,
      physicallyCrouched: true,
      crouchHeld: true,
      standClear: true,
      acceptedCrouchJump: true,
      expected: false,
    },
    {
      name: "expands after an accepted crouch jump with Ctrl released",
      movementStateCrouched: false,
      physicallyCrouched: true,
      crouchHeld: false,
      standClear: true,
      acceptedCrouchJump: true,
      expected: false,
    },
    {
      name: "keeps crouch after a blocked crouch jump",
      movementStateCrouched: true,
      physicallyCrouched: true,
      crouchHeld: true,
      standClear: false,
      acceptedCrouchJump: false,
      expected: true,
    },
  ])("$name", ({ expected, ...input }) => {
    expect(
      isPhysicalCrouchRequired(
        input.movementStateCrouched,
        input.physicallyCrouched,
        input.crouchHeld,
        input.standClear,
        input.acceptedCrouchJump,
      ),
    ).toBe(expected);
  });
});

describe("stance camera transition", () => {
  it("moves by no more than the configured frame distance", () => {
    const nextHeight = moveTowards(
      movementConfig.cameraEyeHeight,
      movementConfig.crouchCameraEyeHeight,
      movementConfig.crouchCameraTransitionSpeed / 60,
    );

    expect(nextHeight).toBeCloseTo(
      movementConfig.cameraEyeHeight -
        movementConfig.crouchCameraTransitionSpeed / 60,
      10,
    );
  });

  it("does not overshoot its target", () => {
    expect(moveTowards(0.46, 0.45, 0.2)).toBe(0.45);
    expect(moveTowards(0.64, 0.65, 0.2)).toBe(0.65);
  });

  it("is materially consistent at 60, 144 and 240 Hz", () => {
    const at60Hz = simulateCameraTransition(60, 0.05);
    const at144Hz = simulateCameraTransition(144, 0.05);
    const at240Hz = simulateCameraTransition(240, 0.05);

    expect(Math.abs(at60Hz - at240Hz)).toBeLessThan(0.003);
    expect(Math.abs(at144Hz - at240Hz)).toBeLessThan(0.003);
  });
});

function simulateCameraTransition(frequency: number, seconds: number): number {
  const deltaTime = 1 / frequency;
  const steps = Math.round(frequency * seconds);
  let cameraHeight = movementConfig.cameraEyeHeight;

  for (let step = 0; step < steps; step += 1) {
    cameraHeight = moveTowards(
      cameraHeight,
      movementConfig.crouchCameraEyeHeight,
      movementConfig.crouchCameraTransitionSpeed * deltaTime,
    );
  }

  return cameraHeight;
}
