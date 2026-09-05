import {
  Entity,
  RigidBodyComponentSystem,
  Vec3,
  type CollisionComponent,
} from "playcanvas";

import type { MovementConfig } from "../game/player/movementConfig";

const CLEARANCE_SKIN_METERS = 0.02;
const MAXIMUM_CEILING_NORMAL_Y = -0.5;
const CAPSULE_SAMPLE_RADIUS_SCALE = 0.7;

export class StandClearanceProbe {
  private readonly rayStart = new Vec3();
  private readonly rayEnd = new Vec3();
  private readonly sampleOffsets: readonly (readonly [number, number])[];
  private readonly raycastOptions: {
    readonly filterCallback: (entity: Entity) => boolean;
  };

  public constructor(
    private readonly rigidBodySystem: RigidBodyComponentSystem,
    private readonly player: Entity,
    private readonly collision: CollisionComponent,
    private readonly config: Readonly<MovementConfig>,
  ) {
    const sampleRadius = config.playerRadius * CAPSULE_SAMPLE_RADIUS_SCALE;
    this.sampleOffsets = [
      [0, 0],
      [sampleRadius, 0],
      [-sampleRadius, 0],
      [0, sampleRadius],
      [0, -sampleRadius],
    ];
    this.raycastOptions = {
      filterCallback: (entity: Entity): boolean => entity !== this.player,
    };
  }

  public canStand(): boolean {
    const currentHeight = this.collision.height;
    if (currentHeight >= this.config.playerHeight) {
      return true;
    }

    const playerPosition = this.player.getPosition();
    const feetHeight = playerPosition.y - currentHeight / 2;

    for (const [offsetX, offsetZ] of this.sampleOffsets) {
      const capHeightAtOffset = this.getCapHeightAtOffset(offsetX, offsetZ);
      this.rayStart.set(
        playerPosition.x + offsetX,
        feetHeight +
          currentHeight -
          this.config.playerRadius +
          capHeightAtOffset,
        playerPosition.z + offsetZ,
      );
      this.rayStart.y += CLEARANCE_SKIN_METERS;
      this.rayEnd.set(
        playerPosition.x + offsetX,
        feetHeight +
          this.config.playerHeight -
          this.config.playerRadius +
          capHeightAtOffset -
          CLEARANCE_SKIN_METERS,
        playerPosition.z + offsetZ,
      );

      const hits = this.rigidBodySystem.raycastAll(
        this.rayStart,
        this.rayEnd,
        this.raycastOptions,
      );

      for (const hit of hits) {
        if (hit.normal.y <= MAXIMUM_CEILING_NORMAL_Y) {
          return false;
        }
      }
    }

    return true;
  }

  private getCapHeightAtOffset(offsetX: number, offsetZ: number): number {
    const squaredDistance = offsetX * offsetX + offsetZ * offsetZ;
    const squaredRadius = this.config.playerRadius ** 2;
    return Math.sqrt(Math.max(0, squaredRadius - squaredDistance));
  }
}
