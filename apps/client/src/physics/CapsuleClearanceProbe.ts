import {
  BODYGROUP_DYNAMIC,
  BODYGROUP_STATIC,
  Vec3,
  type AmmoPhysicsWorld,
} from "playcanvas";

interface AmmoVector3 {
  setValue(x: number, y: number, z: number): void;
}

interface AmmoTransform {
  setIdentity(): void;
  setOrigin(origin: AmmoVector3): void;
}

type AmmoConvexShape = object;

interface AmmoConvexResultCallback {
  hasHit(): boolean;
  set_m_collisionFilterGroup(group: number): void;
  set_m_collisionFilterMask(mask: number): void;
}

interface AmmoNativeWorld {
  convexSweepTest(
    shape: AmmoConvexShape,
    from: AmmoTransform,
    to: AmmoTransform,
    callback: AmmoConvexResultCallback,
    allowedCcdPenetration: number,
  ): void;
}

interface AmmoModule {
  btVector3: new (x?: number, y?: number, z?: number) => AmmoVector3;
  btTransform: new () => AmmoTransform;
  btCapsuleShape: new (
    radius: number,
    cylinderHeight: number,
  ) => AmmoConvexShape;
  ClosestConvexResultCallback: new (
    from: AmmoVector3,
    to: AmmoVector3,
  ) => AmmoConvexResultCallback;
  destroy(resource: object): void;
}

export const CAPSULE_CLEARANCE_SKIN_METERS = 0.02;

/** Static-world standing-capsule clearance for traversal destinations and paths. */
export class CapsuleClearanceProbe {
  private readonly ammo: AmmoModule;
  private readonly nativeWorld: AmmoNativeWorld;
  private readonly sweepShape: AmmoConvexShape;
  private readonly sweepFromOrigin: AmmoVector3;
  private readonly sweepToOrigin: AmmoVector3;
  private readonly sweepFromTransform: AmmoTransform;
  private readonly sweepToTransform: AmmoTransform;
  private readonly positionStart = new Vec3();
  private readonly positionEnd = new Vec3();
  private destroyed = false;

  public constructor(
    physicsWorld: AmmoPhysicsWorld,
    playerRadius: number,
    playerHeight: number,
  ) {
    this.ammo = getAmmoModule();
    this.nativeWorld = getNativeWorld(physicsWorld);
    const sweepRadius = playerRadius - CAPSULE_CLEARANCE_SKIN_METERS;
    if (sweepRadius <= 0) {
      throw new Error("Traversal sweep radius must remain positive.");
    }

    this.sweepShape = new this.ammo.btCapsuleShape(
      sweepRadius,
      Math.max(playerHeight - 2 * playerRadius, 0),
    );
    this.sweepFromOrigin = new this.ammo.btVector3();
    this.sweepToOrigin = new this.ammo.btVector3();
    this.sweepFromTransform = new this.ammo.btTransform();
    this.sweepToTransform = new this.ammo.btTransform();
    this.sweepFromTransform.setIdentity();
    this.sweepToTransform.setIdentity();
  }

  public isPositionClear(position: Readonly<Vec3>): boolean {
    this.positionStart.set(
      position.x,
      position.y + CAPSULE_CLEARANCE_SKIN_METERS / 2,
      position.z,
    );
    this.positionEnd.set(
      position.x,
      position.y - CAPSULE_CLEARANCE_SKIN_METERS / 2,
      position.z,
    );
    return this.isSweepClear(this.positionStart, this.positionEnd);
  }

  public isSweepClear(from: Readonly<Vec3>, to: Readonly<Vec3>): boolean {
    if (this.destroyed) {
      return false;
    }

    this.sweepFromOrigin.setValue(from.x, from.y, from.z);
    this.sweepToOrigin.setValue(to.x, to.y, to.z);
    this.sweepFromTransform.setOrigin(this.sweepFromOrigin);
    this.sweepToTransform.setOrigin(this.sweepToOrigin);
    const callback = new this.ammo.ClosestConvexResultCallback(
      this.sweepFromOrigin,
      this.sweepToOrigin,
    );
    callback.set_m_collisionFilterGroup(BODYGROUP_DYNAMIC);
    callback.set_m_collisionFilterMask(BODYGROUP_STATIC);

    try {
      this.nativeWorld.convexSweepTest(
        this.sweepShape,
        this.sweepFromTransform,
        this.sweepToTransform,
        callback,
        0,
      );
      return !callback.hasHit();
    } finally {
      this.ammo.destroy(callback);
    }
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.ammo.destroy(this.sweepShape);
    this.ammo.destroy(this.sweepFromOrigin);
    this.ammo.destroy(this.sweepToOrigin);
    this.ammo.destroy(this.sweepFromTransform);
    this.ammo.destroy(this.sweepToTransform);
  }
}

function getAmmoModule(): AmmoModule {
  const ammo = (globalThis as { Ammo?: unknown }).Ammo;
  if (
    typeof ammo !== "object" ||
    ammo === null ||
    !("btVector3" in ammo) ||
    !("btTransform" in ammo) ||
    !("btCapsuleShape" in ammo) ||
    !("ClosestConvexResultCallback" in ammo) ||
    !("destroy" in ammo)
  ) {
    throw new Error("Traversal requires the initialized Ammo physics module.");
  }

  return ammo as unknown as AmmoModule;
}

function getNativeWorld(physicsWorld: AmmoPhysicsWorld): AmmoNativeWorld {
  const nativeWorld = physicsWorld.nativeWorld;
  if (
    typeof nativeWorld !== "object" ||
    nativeWorld === null ||
    !("convexSweepTest" in nativeWorld)
  ) {
    throw new Error("Traversal requires Ammo convex sweep support.");
  }

  return nativeWorld as unknown as AmmoNativeWorld;
}
