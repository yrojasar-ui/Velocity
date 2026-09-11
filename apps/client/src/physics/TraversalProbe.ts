import {
  Entity,
  RigidBodyComponentSystem,
  Vec3,
  type AmmoPhysicsWorld,
  type CollisionComponent,
  type RaycastResult,
} from "playcanvas";

import {
  MovementState,
  type TraversalMovementState,
} from "../game/player/MovementState";
import type { TraversalCandidate } from "../game/player/TraversalController";
import type { MovementConfig } from "../game/player/movementConfig";
import {
  calculateTraversalHeight,
  classifyTraversalHeight,
  evaluateTraversalPath,
  isFrontSurfaceFacingPlayer,
  type TraversalPath,
} from "../game/player/traversalMath";
import {
  CAPSULE_CLEARANCE_SKIN_METERS,
  CapsuleClearanceProbe,
} from "./CapsuleClearanceProbe";

interface MutableTraversalPath extends TraversalPath {
  kind: TraversalMovementState;
  clearanceCenterY: number;
}

interface MutableTraversalCandidate extends TraversalCandidate {
  kind: TraversalMovementState;
  obstacleHeight: number;
  obstacleDepth: number | null;
  readonly path: MutableTraversalPath;
}

// Geometry safety tolerances are intentionally separate from gameplay tuning.
const LEDGE_INSET_SKIN_METERS = 0.04;
const TOP_SURFACE_PROBE_INSET_METERS = 0.05;
const TOP_RAY_MARGIN_METERS = 0.1;
const TOP_HEIGHT_TOLERANCE_METERS = 0.03;
const DEPTH_SAMPLE_INTERVAL_METERS = 0.1;
const DEPTH_REFINEMENT_STEPS = 8;
const DEPTH_BOUNDARY_EPSILON_METERS =
  DEPTH_SAMPLE_INTERVAL_METERS / 2 ** DEPTH_REFINEMENT_STEPS;
const PATH_CLEARANCE_SEGMENTS = 16;

export class TraversalProbe {
  private readonly capsuleClearance: CapsuleClearanceProbe;
  private readonly playerPosition = new Vec3();
  private readonly forward = new Vec3();
  private readonly rayStart = new Vec3();
  private readonly rayEnd = new Vec3();
  private readonly topPoint = new Vec3();
  private readonly targetPosition = new Vec3();
  private readonly pathStart = new Vec3();
  private readonly pathSample = new Vec3();
  private readonly previousPathSample = new Vec3();
  private readonly frontSampleHeights: Float32Array;
  private readonly raycastOptions: {
    readonly sort: true;
    readonly filterCallback: (entity: Entity) => boolean;
  };
  private readonly path: MutableTraversalPath;
  private readonly candidate: MutableTraversalCandidate;
  private destroyed = false;

  public constructor(
    private readonly rigidBodySystem: RigidBodyComponentSystem,
    physicsWorld: AmmoPhysicsWorld,
    private readonly player: Entity,
    private readonly collision: CollisionComponent,
    private readonly config: Readonly<MovementConfig>,
  ) {
    this.capsuleClearance = new CapsuleClearanceProbe(
      physicsWorld,
      config.playerRadius,
      config.playerHeight,
    );
    this.frontSampleHeights = new Float32Array([
      config.minimumVaultHeight / 2,
      config.maximumVaultHeight * 0.9,
      config.maximumMantleHeight * 0.9,
    ]);
    this.raycastOptions = {
      sort: true,
      filterCallback: (entity: Entity): boolean =>
        entity !== this.player && entity.rigidbody?.type === "static",
    };
    this.path = {
      kind: MovementState.Mantle,
      start: this.pathStart,
      target: this.targetPosition,
      clearanceCenterY: 0,
    };
    this.candidate = {
      kind: MovementState.Mantle,
      obstacleHeight: 0,
      obstacleDepth: null,
      topPoint: this.topPoint,
      path: this.path,
    };
  }

  public findCandidate(
    viewYawDegrees: number,
  ): Readonly<TraversalCandidate> | null {
    if (this.destroyed) {
      return null;
    }

    this.playerPosition.copy(this.player.getPosition());
    const feetY = this.playerPosition.y - this.collision.height / 2;
    const yawRadians = (viewYawDegrees * Math.PI) / 180;
    this.forward.set(-Math.sin(yawRadians), 0, -Math.cos(yawRadians));

    const frontHit = this.findFrontObstacle(feetY);
    if (frontHit === null) {
      return null;
    }

    const topHit = this.findTopSurface(
      frontHit.entity,
      frontHit.point.x + this.forward.x * TOP_SURFACE_PROBE_INSET_METERS,
      frontHit.point.z + this.forward.z * TOP_SURFACE_PROBE_INSET_METERS,
      feetY,
    );
    if (topHit === null) {
      return null;
    }

    const obstacleHeight = calculateTraversalHeight(topHit.point.y, feetY);
    const kind = classifyTraversalHeight(
      obstacleHeight,
      this.config.minimumVaultHeight,
      this.config.maximumVaultHeight,
      this.config.maximumMantleHeight,
    );
    if (kind === null) {
      return null;
    }

    this.topPoint.copy(topHit.point);
    this.pathStart.copy(this.playerPosition);
    this.candidate.kind = kind;
    this.candidate.obstacleHeight = obstacleHeight;
    this.path.kind = kind;

    if (kind === MovementState.Vault) {
      return this.buildVaultCandidate(frontHit, topHit, feetY);
    }

    return this.buildMantleCandidate(frontHit, topHit);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.capsuleClearance.destroy();
  }

  private findFrontObstacle(feetY: number): RaycastResult | null {
    let nearestHit: RaycastResult | null = null;

    for (const sampleHeight of this.frontSampleHeights) {
      this.rayStart.set(
        this.playerPosition.x,
        feetY + sampleHeight,
        this.playerPosition.z,
      );
      this.rayEnd.set(
        this.rayStart.x + this.forward.x * this.config.traversalProbeDistance,
        this.rayStart.y,
        this.rayStart.z + this.forward.z * this.config.traversalProbeDistance,
      );
      const hits = this.rigidBodySystem.raycastAll(
        this.rayStart,
        this.rayEnd,
        this.raycastOptions,
      );

      for (const hit of hits) {
        if (
          isFrontSurfaceFacingPlayer(hit.normal, this.forward) &&
          (nearestHit === null || hit.hitFraction < nearestHit.hitFraction)
        ) {
          nearestHit = hit;
          break;
        }
      }
    }

    return nearestHit;
  }

  private findTopSurface(
    obstacle: Entity,
    x: number,
    z: number,
    feetY: number,
  ): RaycastResult | null {
    this.rayStart.set(
      x,
      feetY + this.config.maximumMantleHeight + TOP_RAY_MARGIN_METERS,
      z,
    );
    this.rayEnd.set(
      x,
      feetY + this.config.minimumVaultHeight - TOP_RAY_MARGIN_METERS,
      z,
    );
    const hits = this.rigidBodySystem.raycastAll(
      this.rayStart,
      this.rayEnd,
      this.raycastOptions,
    );

    for (const hit of hits) {
      if (
        hit.entity === obstacle &&
        hit.normal.y >= this.config.minimumGroundNormalY
      ) {
        return hit;
      }
    }

    return null;
  }

  private buildMantleCandidate(
    frontHit: Readonly<RaycastResult>,
    topHit: Readonly<RaycastResult>,
  ): Readonly<TraversalCandidate> | null {
    const ledgeInset = this.config.playerRadius + LEDGE_INSET_SKIN_METERS;
    if (
      !this.hasMatchingTop(
        frontHit.entity,
        frontHit.point,
        topHit.point.y,
        ledgeInset,
      )
    ) {
      return null;
    }

    this.targetPosition.set(
      frontHit.point.x + this.forward.x * ledgeInset,
      topHit.point.y + this.config.playerHeight / 2,
      frontHit.point.z + this.forward.z * ledgeInset,
    );
    this.path.clearanceCenterY =
      this.targetPosition.y + CAPSULE_CLEARANCE_SKIN_METERS;
    this.candidate.obstacleDepth = null;

    return this.validateDestinationAndPath() ? this.candidate : null;
  }

  private buildVaultCandidate(
    frontHit: Readonly<RaycastResult>,
    topHit: Readonly<RaycastResult>,
    feetY: number,
  ): Readonly<TraversalCandidate> | null {
    const obstacleDepth = this.findObstacleDepth(
      frontHit.entity,
      frontHit.point,
      topHit.point.y,
    );
    if (
      obstacleDepth === null ||
      obstacleDepth > this.config.maximumVaultDepth
    ) {
      return null;
    }

    const destinationDistance =
      obstacleDepth + this.config.playerRadius + LEDGE_INSET_SKIN_METERS;
    const destinationX =
      frontHit.point.x + this.forward.x * destinationDistance;
    const destinationZ =
      frontHit.point.z + this.forward.z * destinationDistance;
    const farSupport = this.findFarSideSupport(
      destinationX,
      destinationZ,
      topHit.point.y,
      feetY,
    );
    if (farSupport === null) {
      return null;
    }

    this.targetPosition.set(
      destinationX,
      farSupport.point.y + this.config.playerHeight / 2,
      destinationZ,
    );
    this.path.clearanceCenterY =
      topHit.point.y +
      this.config.playerHeight / 2 +
      CAPSULE_CLEARANCE_SKIN_METERS;
    this.candidate.obstacleDepth = obstacleDepth;

    return this.validateDestinationAndPath() ? this.candidate : null;
  }

  private findObstacleDepth(
    obstacle: Entity,
    frontPoint: Readonly<Vec3>,
    topY: number,
  ): number | null {
    let lastSupportedDistance = 0;
    const maximumSampleCount =
      Math.ceil(this.config.maximumVaultDepth / DEPTH_SAMPLE_INTERVAL_METERS) +
      1;

    for (let sample = 1; sample <= maximumSampleCount; sample += 1) {
      const distance = sample * DEPTH_SAMPLE_INTERVAL_METERS;
      if (this.hasMatchingTop(obstacle, frontPoint, topY, distance)) {
        if (
          distance >
          this.config.maximumVaultDepth + DEPTH_BOUNDARY_EPSILON_METERS
        ) {
          return null;
        }
        lastSupportedDistance = distance;
        continue;
      }

      let supportedDistance = lastSupportedDistance;
      let unsupportedDistance = distance;
      for (let step = 0; step < DEPTH_REFINEMENT_STEPS; step += 1) {
        const midpoint = (supportedDistance + unsupportedDistance) / 2;
        if (this.hasMatchingTop(obstacle, frontPoint, topY, midpoint)) {
          supportedDistance = midpoint;
        } else {
          unsupportedDistance = midpoint;
        }
      }

      const edgeDistance = (supportedDistance + unsupportedDistance) / 2;
      return edgeDistance <=
        this.config.maximumVaultDepth + DEPTH_BOUNDARY_EPSILON_METERS
        ? Math.min(edgeDistance, this.config.maximumVaultDepth)
        : null;
    }

    return null;
  }

  private hasMatchingTop(
    obstacle: Entity,
    frontPoint: Readonly<Vec3>,
    topY: number,
    distance: number,
  ): boolean {
    const x = frontPoint.x + this.forward.x * distance;
    const z = frontPoint.z + this.forward.z * distance;
    this.rayStart.set(x, topY + TOP_RAY_MARGIN_METERS, z);
    this.rayEnd.set(x, topY - TOP_RAY_MARGIN_METERS, z);
    const hits = this.rigidBodySystem.raycastAll(
      this.rayStart,
      this.rayEnd,
      this.raycastOptions,
    );

    for (const hit of hits) {
      if (
        hit.entity === obstacle &&
        hit.normal.y >= this.config.minimumGroundNormalY &&
        Math.abs(hit.point.y - topY) <= TOP_HEIGHT_TOLERANCE_METERS
      ) {
        return true;
      }
    }

    return false;
  }

  private findFarSideSupport(
    x: number,
    z: number,
    topY: number,
    feetY: number,
  ): RaycastResult | null {
    this.rayStart.set(x, topY + TOP_RAY_MARGIN_METERS, z);
    this.rayEnd.set(
      x,
      feetY - this.config.maximumMantleHeight - TOP_RAY_MARGIN_METERS,
      z,
    );
    const hits = this.rigidBodySystem.raycastAll(
      this.rayStart,
      this.rayEnd,
      this.raycastOptions,
    );

    for (const hit of hits) {
      if (hit.normal.y >= this.config.minimumGroundNormalY) {
        return hit;
      }
    }

    return null;
  }

  private validateDestinationAndPath(): boolean {
    if (!this.capsuleClearance.isPositionClear(this.targetPosition)) {
      return false;
    }

    this.previousPathSample.copy(this.pathStart);
    for (let index = 1; index <= PATH_CLEARANCE_SEGMENTS; index += 1) {
      evaluateTraversalPath(
        this.path,
        index / PATH_CLEARANCE_SEGMENTS,
        this.pathSample,
      );
      if (
        !this.capsuleClearance.isSweepClear(
          this.previousPathSample,
          this.pathSample,
        )
      ) {
        return false;
      }
      this.previousPathSample.copy(this.pathSample);
    }

    return true;
  }
}
