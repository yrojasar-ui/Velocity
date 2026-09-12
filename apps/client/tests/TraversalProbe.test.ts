import {
  Entity,
  Vec3,
  type AmmoPhysicsWorld,
  type CollisionComponent,
  type RaycastResult,
  type RigidBodyComponentSystem,
} from "playcanvas";
import { afterEach, describe, expect, it } from "vitest";

import { MovementState } from "../src/game/player/MovementState";
import { movementConfig } from "../src/game/player/movementConfig";
import { TraversalProbe } from "../src/physics/TraversalProbe";

interface SceneOptions {
  height?: number;
  depth?: number;
  floorY?: number;
  includeFarSupport?: boolean;
  includeTop?: boolean;
  obstacleBodyType?: "dynamic" | "static";
  topNormalY?: number;
  blockedSweep?: number;
  playerFeetY?: number;
  playerCapsuleHeight?: number;
}

interface TestBox {
  readonly entity: Entity;
  readonly minimum: Vec3;
  readonly maximum: Vec3;
  readonly includeTop: boolean;
  readonly topNormalY: number;
}

interface FakeAmmoVector {
  x: number;
  y: number;
  z: number;
  setValue(x: number, y: number, z: number): void;
}

interface FakeAmmoTransform {
  origin: FakeAmmoVector | null;
  setIdentity(): void;
  setOrigin(origin: FakeAmmoVector): void;
}

interface FakeAmmoCallback {
  hit: boolean;
  hasHit(): boolean;
  set_m_collisionFilterGroup(group: number): void;
  set_m_collisionFilterMask(mask: number): void;
}

const originalAmmo = (globalThis as { Ammo?: unknown }).Ammo;

afterEach(() => {
  (globalThis as { Ammo?: unknown }).Ammo = originalAmmo;
});

describe("TraversalProbe geometry", () => {
  it.each([
    [0.5, MovementState.Vault],
    [0.75, MovementState.Vault],
    [1, MovementState.Mantle],
    [1.25, MovementState.Mantle],
    [1.5, MovementState.Mantle],
  ] as const)("detects a %.2f m %s", (height, expectedKind) => {
    const scene = createScene({ height });

    const candidate = scene.probe.findCandidate(0, scene.probe.currentFeetY);

    expect(candidate?.kind).toBe(expectedKind);
    expect(candidate?.obstacleHeight).toBeCloseTo(height);
    expect(candidate?.topPoint.y).toBeCloseTo(height);
    scene.probe.destroy();
  });

  it("measures height from raised player feet", () => {
    const scene = createScene({ floorY: 3, playerFeetY: 3, height: 0.5 });

    const candidate = scene.probe.findCandidate(0, scene.probe.currentFeetY);

    expect(candidate?.kind).toBe(MovementState.Vault);
    expect(candidate?.obstacleHeight).toBeCloseTo(0.5);
    scene.probe.destroy();
  });

  it.each([1.51, 2])("rejects a %.2f m obstacle", (height) => {
    const scene = createScene({ height });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    scene.probe.destroy();
  });

  it("rejects a wall without a reachable top", () => {
    const scene = createScene({ includeTop: false, height: 1 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    scene.probe.destroy();
  });

  it("rejects a steep top surface", () => {
    const scene = createScene({ height: 1, topNormalY: 0.5 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    scene.probe.destroy();
  });

  it.each([1.51, 1.7])("rejects a %.2f m-deep Vault obstacle", (depth) => {
    const scene = createScene({ height: 0.5, depth });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    scene.probe.destroy();
  });

  it("accepts the exact 1.50 m Vault depth boundary", () => {
    const scene = createScene({ height: 0.5, depth: 1.5 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)?.kind).toBe(
      MovementState.Vault,
    );
    scene.probe.destroy();
  });

  it("detects a thin low obstacle as a Vault", () => {
    const scene = createScene({ height: 0.5, depth: 0.4 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)?.kind).toBe(
      MovementState.Vault,
    );
    scene.probe.destroy();
  });

  it("rejects a Mantle ledge too shallow to support the inset destination", () => {
    const scene = createScene({ height: 1, depth: 0.3 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    scene.probe.destroy();
  });

  it("rejects a Vault without far-side walkable support", () => {
    const scene = createScene({ height: 0.5, includeFarSupport: false });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    scene.probe.destroy();
  });

  it("rejects blocked destination capsule clearance", () => {
    const scene = createScene({ height: 1, blockedSweep: 1 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    expect(scene.sweepCalls()).toBe(1);
    scene.probe.destroy();
  });

  it("rejects a blocked capsule path after destination validation", () => {
    const scene = createScene({ height: 1, blockedSweep: 2 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    expect(scene.sweepCalls()).toBe(2);
    scene.probe.destroy();
  });

  it("ignores dynamic traversal obstacles", () => {
    const scene = createScene({ obstacleBodyType: "dynamic" });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)).toBeNull();
    scene.probe.destroy();
  });

  it("uses a standing capsule-volume sweep with centralized skin", () => {
    const scene = createScene({ height: 1 });

    expect(scene.probe.findCandidate(0, scene.probe.currentFeetY)?.kind).toBe(
      MovementState.Mantle,
    );
    expect(scene.sweepShape()).toEqual({
      radius: movementConfig.playerRadius - 0.02,
      cylinderHeight:
        movementConfig.playerHeight - 2 * movementConfig.playerRadius,
    });
    expect(scene.sweepCalls()).toBeGreaterThan(1);
    scene.probe.destroy();
  });
});

describe("TraversalProbe stable airborne height authorization", () => {
  it("rejects the exact 2.00 m exploit with current airborne feet at 0.57 m", () => {
    const scene = createScene({ floorY: 0, playerFeetY: 0.57, height: 2 });

    expect(scene.probe.currentFeetY).toBeCloseTo(0.57);
    // This control reproduces the old mistaken reference through real front/top rays.
    const oldReferenceCandidate = scene.probe.findCandidate(
      0,
      scene.probe.currentFeetY,
    );
    expect(oldReferenceCandidate?.kind).toBe(MovementState.Mantle);
    expect(oldReferenceCandidate?.obstacleHeight).toBeCloseTo(1.43);

    expect(scene.probe.findCandidate(0, 0)).toBeNull();
    expect(scene.topHitHeights()).toContain(2);
    scene.probe.destroy();
  });

  it("still Mantles 1.50 m from the same 0.57 m airborne rise and current path start", () => {
    const scene = createScene({ floorY: 0, playerFeetY: 0.57, height: 1.5 });

    const candidate = scene.probe.findCandidate(0, 0);

    expect(candidate?.kind).toBe(MovementState.Mantle);
    expect(candidate?.obstacleHeight).toBeCloseTo(1.5);
    expect(candidate?.path.start.y).toBeCloseTo(1.47);
    expect(candidate?.path.target.y).toBeCloseTo(2.4);
    expect(scene.rayStarts()[0]?.y).toBeGreaterThan(0.57);
    scene.probe.destroy();
  });

  it.each([
    [1.5, MovementState.Mantle],
    [2, null],
  ] as const)(
    "uses takeoff 3.00 m while airborne at 3.57 m for a %.2f m relative ledge",
    (height, expectedKind) => {
      const scene = createScene({ floorY: 3, playerFeetY: 3.57, height });

      const candidate = scene.probe.findCandidate(0, 3);

      expect(candidate?.kind ?? null).toBe(expectedKind);
      expect(scene.topHitHeights()).toContain(3 + height);
      if (expectedKind !== null) {
        expect(candidate?.obstacleHeight).toBeCloseTo(1.5);
        expect(candidate?.path.start.y).toBeCloseTo(4.47);
        expect(candidate?.path.target.y).toBeCloseTo(5.4);
      }
      scene.probe.destroy();
    },
  );

  it("does not fall back to elevated current feet when no reference exists", () => {
    const scene = createScene({ floorY: 0, playerFeetY: 0.57, height: 2 });

    expect(scene.probe.findCandidate(0, null)).toBeNull();
    expect(scene.rayStarts()).toHaveLength(0);
    expect(scene.sweepCalls()).toBe(0);
    scene.probe.destroy();
  });

  it.each([movementConfig.playerHeight, movementConfig.crouchHeight])(
    "reads actual physical feet from a %.2f m capsule on a raised surface",
    (playerCapsuleHeight) => {
      const scene = createScene({ playerFeetY: 3, playerCapsuleHeight });

      expect(scene.probe.currentFeetY).toBeCloseTo(3);
      scene.probe.destroy();
    },
  );
});

function createScene(options: SceneOptions = {}): {
  probe: TraversalProbe;
  rayStarts(): readonly Vec3[];
  topHitHeights(): readonly number[];
  sweepCalls(): number;
  sweepShape(): { radius: number; cylinderHeight: number } | null;
} {
  const playerFeetY = options.playerFeetY ?? 0;
  const floorY = options.floorY ?? playerFeetY;
  const obstacleHeight = options.height ?? 0.5;
  const obstacleDepth = options.depth ?? 1.35;
  const playerCapsuleHeight =
    options.playerCapsuleHeight ?? movementConfig.playerHeight;
  const rayStarts: Vec3[] = [];
  const topHitHeights: number[] = [];
  const obstacle = createPhysicsEntity(
    "Obstacle",
    options.obstacleBodyType ?? "static",
  );
  const floor = createPhysicsEntity("Floor", "static");
  const boxes: TestBox[] = [
    {
      entity: obstacle,
      minimum: new Vec3(-2, floorY, -0.5 - obstacleDepth),
      maximum: new Vec3(2, floorY + obstacleHeight, -0.5),
      includeTop: options.includeTop ?? true,
      topNormalY: options.topNormalY ?? 1,
    },
  ];
  if (options.includeFarSupport ?? true) {
    boxes.push({
      entity: floor,
      minimum: new Vec3(-20, floorY - 0.2, -20),
      maximum: new Vec3(20, floorY, 20),
      includeTop: true,
      topNormalY: 1,
    });
  }

  const player = {
    getPosition: (): Vec3 =>
      new Vec3(0, playerFeetY + playerCapsuleHeight / 2, 0),
  } as unknown as Entity;
  const collision = {
    height: playerCapsuleHeight,
  } as CollisionComponent;
  const rigidBodySystem = {
    raycastAll(
      start: Readonly<Vec3>,
      end: Readonly<Vec3>,
      rayOptions?: { filterCallback?: (entity: Entity) => boolean },
    ): RaycastResult[] {
      rayStarts.push(new Vec3().copy(start));
      const results: RaycastResult[] = [];
      for (const box of boxes) {
        if (rayOptions?.filterCallback?.(box.entity) === false) {
          continue;
        }
        const hit = intersectBox(start, end, box);
        if (hit !== null) {
          if (hit.normal.y > 0 && box.entity === obstacle) {
            topHitHeights.push(hit.point.y);
          }
          results.push(hit);
        }
      }
      results.sort((left, right) => left.hitFraction - right.hitFraction);
      return results;
    },
  } as unknown as RigidBodyComponentSystem;
  const ammo = installFakeAmmo(options.blockedSweep);
  const physicsWorld = {
    nativeWorld: ammo.nativeWorld,
  } as AmmoPhysicsWorld;
  const probe = new TraversalProbe(
    rigidBodySystem,
    physicsWorld,
    player,
    collision,
    movementConfig,
  );

  return {
    probe,
    rayStarts: () => rayStarts,
    topHitHeights: () => topHitHeights,
    sweepCalls: () => ammo.sweepCalls,
    sweepShape: () => ammo.shape,
  };
}

function createPhysicsEntity(name: string, type: "dynamic" | "static"): Entity {
  return { name, rigidbody: { type } } as unknown as Entity;
}

function intersectBox(
  start: Readonly<Vec3>,
  end: Readonly<Vec3>,
  box: Readonly<TestBox>,
): RaycastResult | null {
  const direction = new Vec3().sub2(end, start);
  let nearFraction = 0;
  let farFraction = 1;
  const normal = new Vec3();
  const axes = ["x", "y", "z"] as const;

  for (const axis of axes) {
    const origin = start[axis];
    const delta = direction[axis];
    const minimum = box.minimum[axis];
    const maximum = box.maximum[axis];
    if (Math.abs(delta) < 1e-8) {
      if (origin < minimum || origin > maximum) {
        return null;
      }
      continue;
    }

    const entry =
      delta > 0 ? (minimum - origin) / delta : (maximum - origin) / delta;
    const exit =
      delta > 0 ? (maximum - origin) / delta : (minimum - origin) / delta;
    const entryNormal = delta > 0 ? -1 : 1;
    if (entry > nearFraction) {
      nearFraction = entry;
      normal.set(0, 0, 0);
      normal[axis] = entryNormal;
    }
    farFraction = Math.min(farFraction, exit);
    if (nearFraction > farFraction) {
      return null;
    }
  }

  if (nearFraction < 0 || nearFraction > 1) {
    return null;
  }
  if (normal.y > 0) {
    if (!box.includeTop) {
      return null;
    }
    normal.y = box.topNormalY;
  }
  const point = new Vec3(
    start.x + direction.x * nearFraction,
    start.y + direction.y * nearFraction,
    start.z + direction.z * nearFraction,
  );
  return { entity: box.entity, point, normal, hitFraction: nearFraction };
}

function installFakeAmmo(blockedSweep?: number): {
  nativeWorld: { convexSweepTest: (...parameters: unknown[]) => void };
  sweepCalls: number;
  shape: { radius: number; cylinderHeight: number } | null;
} {
  const result: {
    nativeWorld: { convexSweepTest: (...parameters: unknown[]) => void };
    sweepCalls: number;
    shape: { radius: number; cylinderHeight: number } | null;
  } = {
    nativeWorld: { convexSweepTest: () => undefined },
    sweepCalls: 0,
    shape: null,
  };

  class Vector implements FakeAmmoVector {
    public x = 0;
    public y = 0;
    public z = 0;

    public constructor(x = 0, y = 0, z = 0) {
      this.setValue(x, y, z);
    }

    public setValue(x: number, y: number, z: number): void {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  class Transform implements FakeAmmoTransform {
    public origin: FakeAmmoVector | null = null;
    public setIdentity(): void {}
    public setOrigin(origin: FakeAmmoVector): void {
      this.origin = origin;
    }
  }

  class Callback implements FakeAmmoCallback {
    public hit = false;
    public hasHit(): boolean {
      return this.hit;
    }
    public set_m_collisionFilterGroup(): void {}
    public set_m_collisionFilterMask(): void {}
  }

  class CapsuleShape {
    public constructor(
      public readonly radius: number,
      public readonly cylinderHeight: number,
    ) {
      result.shape = { radius, cylinderHeight };
    }
  }

  result.nativeWorld = {
    convexSweepTest(
      _shape: unknown,
      _from: unknown,
      _to: unknown,
      callback: unknown,
    ): void {
      result.sweepCalls += 1;
      (callback as FakeAmmoCallback).hit = result.sweepCalls === blockedSweep;
    },
  };
  (globalThis as { Ammo?: unknown }).Ammo = {
    btVector3: Vector,
    btTransform: Transform,
    btCapsuleShape: CapsuleShape,
    ClosestConvexResultCallback: Callback,
    destroy: (): void => undefined,
  };
  return result;
}
