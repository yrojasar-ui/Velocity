import {
  Entity,
  RigidBodyComponentSystem,
  Vec3,
  type CollisionComponent,
} from "playcanvas";

import type { MovementConfig } from "../game/player/movementConfig";
import { getGroundProbeEndHeight } from "../game/player/stanceMath";

export interface GroundProbeSample {
  hasWalkableGround: boolean;
  /** Signed vertical capsule-bottom separation; negative values indicate penetration. */
  groundSeparation: number | null;
}

export function calculateVerticalGroundSeparation(
  capsuleCenterY: number,
  capsuleHeight: number,
  groundPointY: number,
): number {
  const capsuleBottomY = capsuleCenterY - capsuleHeight / 2;
  return capsuleBottomY - groundPointY;
}

export function hasGroundSupport(
  sample: Readonly<GroundProbeSample>,
  verticalVelocity: number,
  maximumGroundedUpwardVelocity: number,
): boolean {
  return (
    sample.hasWalkableGround &&
    verticalVelocity <= maximumGroundedUpwardVelocity
  );
}

export function canAcceptLanding(
  sample: Readonly<GroundProbeSample>,
  verticalVelocity: number,
  maximumGroundedUpwardVelocity: number,
  groundContactTolerance: number,
): boolean {
  return (
    hasGroundSupport(sample, verticalVelocity, maximumGroundedUpwardVelocity) &&
    // Physics runs before this sample. Strong downward speed means impact has not resolved yet.
    verticalVelocity >= -maximumGroundedUpwardVelocity &&
    sample.groundSeparation !== null &&
    Math.abs(sample.groundSeparation) <= groundContactTolerance
  );
}

export class GroundProbe {
  private readonly rayStart = new Vec3();
  private readonly rayEnd = new Vec3();
  private readonly sampleResult: GroundProbeSample = {
    hasWalkableGround: false,
    groundSeparation: null,
  };
  private readonly raycastOptions: {
    readonly sort: true;
    readonly filterCallback: (entity: Entity) => boolean;
  };

  public constructor(
    private readonly rigidBodySystem: RigidBodyComponentSystem,
    private readonly player: Entity,
    private readonly collision: CollisionComponent,
    private readonly config: Readonly<MovementConfig>,
  ) {
    this.raycastOptions = {
      sort: true,
      filterCallback: (entity: Entity): boolean => entity !== this.player,
    };
  }

  public sample(): Readonly<GroundProbeSample> {
    this.sampleResult.hasWalkableGround = false;
    this.sampleResult.groundSeparation = null;
    this.rayStart.copy(this.player.getPosition());
    this.rayEnd.copy(this.rayStart);
    this.rayEnd.y = getGroundProbeEndHeight(
      this.rayStart.y,
      this.collision.height,
      this.config.groundProbeDistance,
    );

    const hits = this.rigidBodySystem.raycastAll(
      this.rayStart,
      this.rayEnd,
      this.raycastOptions,
    );

    for (const hit of hits) {
      if (hit.normal.y >= this.config.minimumGroundNormalY) {
        this.sampleResult.hasWalkableGround = true;
        this.sampleResult.groundSeparation = calculateVerticalGroundSeparation(
          this.rayStart.y,
          this.collision.height,
          hit.point.y,
        );
        return this.sampleResult;
      }
    }

    return this.sampleResult;
  }
}
