import { Entity, math } from "playcanvas";

import type { MovementConfig } from "./movementConfig";

export class PlayerLook {
  private yawDegrees = 0;
  private pitchDegrees = 0;

  public constructor(
    private readonly yawPivot: Entity,
    private readonly pitchPivot: Entity,
    private readonly config: Readonly<MovementConfig>,
  ) {}

  public get yaw(): number {
    return this.yawDegrees;
  }

  public get pitch(): number {
    return this.pitchDegrees;
  }

  public applyMouseDelta(deltaX: number, deltaY: number): void {
    this.yawDegrees -= deltaX * this.config.degreesPerMouseCount;
    this.pitchDegrees = math.clamp(
      this.pitchDegrees - deltaY * this.config.degreesPerMouseCount,
      -this.config.maxLookPitchDegrees,
      this.config.maxLookPitchDegrees,
    );

    this.yawPivot.setLocalEulerAngles(0, this.yawDegrees, 0);
    this.pitchPivot.setLocalEulerAngles(this.pitchDegrees, 0, 0);
  }
}
