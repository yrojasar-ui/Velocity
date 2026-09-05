import {
  Entity,
  RigidBodyComponentSystem,
  Vec3,
  type CollisionComponent,
} from "playcanvas";

import type { MovementConfig } from "../game/player/movementConfig";

export class GroundProbe {
  private readonly rayStart = new Vec3();
  private readonly rayEnd = new Vec3();
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

  public isGrounded(verticalVelocity: number): boolean {
    if (verticalVelocity > this.config.maximumGroundedUpwardVelocity) {
      return false;
    }

    this.rayStart.copy(this.player.getPosition());
    this.rayEnd.copy(this.rayStart);
    this.rayEnd.y -=
      this.collision.height / 2 + this.config.groundProbeDistance;

    const hits = this.rigidBodySystem.raycastAll(
      this.rayStart,
      this.rayEnd,
      this.raycastOptions,
    );

    for (const hit of hits) {
      if (hit.normal.y >= this.config.minimumGroundNormalY) {
        return true;
      }
    }

    return false;
  }
}
