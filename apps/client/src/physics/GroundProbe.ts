import { Entity, RigidBodyComponentSystem, Vec3 } from "playcanvas";

import type { MovementConfig } from "../game/player/movementConfig";

export class GroundProbe {
  private readonly rayStart = new Vec3();
  private readonly rayEnd = new Vec3();

  public constructor(
    private readonly rigidBodySystem: RigidBodyComponentSystem,
    private readonly player: Entity,
    private readonly config: Readonly<MovementConfig>,
  ) {}

  public isGrounded(verticalVelocity: number): boolean {
    if (verticalVelocity > this.config.maximumGroundedUpwardVelocity) {
      return false;
    }

    this.rayStart.copy(this.player.getPosition());
    this.rayEnd.copy(this.rayStart);
    this.rayEnd.y -=
      this.config.playerHeight / 2 + this.config.groundProbeDistance;

    const hits = this.rigidBodySystem.raycastAll(this.rayStart, this.rayEnd, {
      sort: true,
      filterCallback: this.isNotPlayer,
    });

    return hits.some((hit) => hit.normal.y >= this.config.minimumGroundNormalY);
  }

  private readonly isNotPlayer = (entity: Entity): boolean =>
    entity !== this.player;
}
