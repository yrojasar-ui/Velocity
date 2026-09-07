import {
  RaycastResult,
  Vec3,
  type CollisionComponent,
  type Entity,
  type RigidBodyComponentSystem,
} from "playcanvas";
import { describe, expect, it, vi } from "vitest";

import { movementConfig } from "../src/game/player/movementConfig";
import {
  GroundProbe,
  calculateVerticalGroundSeparation,
  canAcceptLanding,
  hasGroundSupport,
  type GroundProbeSample,
} from "../src/physics/GroundProbe";

describe("ground support and landing acceptance", () => {
  it("rejects the observed 0.06 m pre-contact gap while retaining support", () => {
    const groundSeparation = calculateVerticalGroundSeparation(0.96, 1.8, 0);
    const sample = createSample(groundSeparation);

    expect(groundSeparation).toBeCloseTo(0.06, 10);
    expect(
      hasGroundSupport(
        sample,
        -7.6,
        movementConfig.maximumGroundedUpwardVelocity,
      ),
    ).toBe(true);
    expect(
      canAcceptLanding(
        sample,
        -7.6,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(false);
  });

  it.each([
    ["standing", 0.9, 1.8],
    ["crouched", 0.6, 1.2],
  ])(
    "accepts %s capsule geometry at physical contact",
    (_name, centerY, height) => {
      const groundSeparation = calculateVerticalGroundSeparation(
        centerY,
        height,
        0,
      );

      expect(groundSeparation).toBeCloseTo(0, 10);
      expect(
        canAcceptLanding(
          createSample(groundSeparation),
          0,
          movementConfig.maximumGroundedUpwardVelocity,
          movementConfig.groundContactTolerance,
        ),
      ).toBe(true);
    },
  );

  it("keeps loose support separate from tight landing contact", () => {
    const sample = createSample(0.1);

    expect(
      hasGroundSupport(sample, 0, movementConfig.maximumGroundedUpwardVelocity),
    ).toBe(true);
    expect(
      canAcceptLanding(
        sample,
        0,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(false);
  });

  it("rejects an unresolved fast descent even inside the contact tolerance", () => {
    expect(
      canAcceptLanding(
        createSample(0.008),
        -7.2,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(false);
  });

  it("rejects deep solver penetration until the capsule returns to contact", () => {
    expect(
      canAcceptLanding(
        createSample(-0.032),
        0,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(false);
    expect(
      canAcceptLanding(
        createSample(-0.006),
        0.08,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(true);
  });

  it("rejects missing walkable support without grace", () => {
    const sample: GroundProbeSample = {
      hasWalkableGround: false,
      groundSeparation: null,
    };

    expect(
      hasGroundSupport(sample, 0, movementConfig.maximumGroundedUpwardVelocity),
    ).toBe(false);
    expect(
      canAcceptLanding(
        sample,
        0,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(false);
  });

  it("rejects an upward jump even when the floor ray still hits", () => {
    const sample = createSample(0);

    expect(
      hasGroundSupport(
        sample,
        movementConfig.jumpVelocity,
        movementConfig.maximumGroundedUpwardVelocity,
      ),
    ).toBe(false);
    expect(
      canAcceptLanding(
        sample,
        movementConfig.jumpVelocity,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(false);
  });

  it.each([60, 144, 240])(
    "never accepts separated fast-fall geometry before contact at %i Hz",
    (frequency) => {
      const contactGap = simulateFastFallToContact(frequency);

      expect(contactGap).toBe(0);
      expect(
        canAcceptLanding(
          createSample(contactGap),
          0,
          movementConfig.maximumGroundedUpwardVelocity,
          movementConfig.groundContactTolerance,
        ),
      ).toBe(true);
    },
  );
});

describe("GroundProbe sampling", () => {
  it("returns the nearest non-self walkable hit after ignoring steep surfaces", () => {
    const player = {
      getPosition: (): Vec3 => new Vec3(0, 0.96, 0),
    } as unknown as Entity;
    const wall = { name: "Wall" } as unknown as Entity;
    const floor = { name: "Floor" } as unknown as Entity;
    const lowerFloor = { name: "Lower Floor" } as unknown as Entity;
    const hits = [
      new RaycastResult(player, new Vec3(0, 0.05, 0), new Vec3(0, 1, 0), 0.5),
      new RaycastResult(wall, new Vec3(0, 0.03, 0), new Vec3(1, 0, 0), 0.6),
      new RaycastResult(floor, new Vec3(0, 0, 0), new Vec3(0, 1, 0), 0.7),
      new RaycastResult(
        lowerFloor,
        new Vec3(0, -0.1, 0),
        new Vec3(0, 1, 0),
        0.9,
      ),
    ];
    const raycastAll = vi.fn(
      (
        _start: Vec3,
        _end: Vec3,
        options?: { filterCallback?: (entity: Entity) => boolean },
      ): RaycastResult[] =>
        hits.filter((hit) => options?.filterCallback?.(hit.entity) ?? true),
    );
    const probe = new GroundProbe(
      { raycastAll } as unknown as RigidBodyComponentSystem,
      player,
      { height: movementConfig.playerHeight } as CollisionComponent,
      movementConfig,
    );

    const sample = probe.sample();

    expect(sample.hasWalkableGround).toBe(true);
    expect(sample.groundSeparation).toBeCloseTo(0.06, 6);
    expect(raycastAll).toHaveBeenCalledWith(
      expect.any(Vec3),
      expect.any(Vec3),
      expect.objectContaining({ sort: true }),
    );
  });
});

function createSample(groundSeparation: number): GroundProbeSample {
  return { hasWalkableGround: true, groundSeparation };
}

function simulateFastFallToContact(frequency: number): number {
  const deltaTime = 1 / frequency;
  let gap = 0.06;

  while (gap > 0) {
    expect(
      canAcceptLanding(
        createSample(gap),
        -7.6,
        movementConfig.maximumGroundedUpwardVelocity,
        movementConfig.groundContactTolerance,
      ),
    ).toBe(false);
    gap = Math.max(0, gap - 7.6 * deltaTime);
  }

  return gap;
}
