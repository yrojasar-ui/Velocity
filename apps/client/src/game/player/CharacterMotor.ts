import { math, Vec3, type RigidBodyComponent } from "playcanvas";

import type { GroundProbe } from "../../physics/GroundProbe";
import type { PlayerInputState } from "./PlayerInput";
import type { MovementConfig } from "./movementConfig";
import { calculateGroundVelocity, type HorizontalVector } from "./movementMath";

const DEGREES_TO_RADIANS = Math.PI / 180;

export class CharacterMotor {
  private readonly currentHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly movementInput: HorizontalVector = { x: 0, z: 0 };
  private readonly nextHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly nextVelocity = new Vec3();
  private groundedState = false;

  public constructor(
    private readonly rigidBody: RigidBodyComponent,
    private readonly groundProbe: GroundProbe,
    private readonly config: Readonly<MovementConfig>,
  ) {}

  public get grounded(): boolean {
    return this.groundedState;
  }

  public update(
    input: Readonly<PlayerInputState>,
    viewYawDegrees: number,
    deltaTime: number,
  ): void {
    const currentVelocity = this.rigidBody.linearVelocity;
    this.groundedState = this.groundProbe.isGrounded(currentVelocity.y);
    this.nextVelocity.copy(currentVelocity);

    if (this.groundedState) {
      this.currentHorizontalVelocity.x = currentVelocity.x;
      this.currentHorizontalVelocity.z = currentVelocity.z;
      this.movementInput.x = input.moveX;
      this.movementInput.z = input.moveZ;

      calculateGroundVelocity(
        this.currentHorizontalVelocity,
        this.movementInput,
        viewYawDegrees * DEGREES_TO_RADIANS,
        this.config.walkSpeed,
        this.config.groundAcceleration,
        this.config.groundDeceleration,
        math.clamp(deltaTime, 0, 0.1),
        this.nextHorizontalVelocity,
      );

      this.nextVelocity.x = this.nextHorizontalVelocity.x;
      this.nextVelocity.z = this.nextHorizontalVelocity.z;
    }

    if (input.jumpPressed && this.groundedState) {
      // A direct vertical launch speed keeps the jump predictable while physics owns gravity.
      this.nextVelocity.y = this.config.jumpVelocity;
      this.groundedState = false;
    }

    this.rigidBody.linearVelocity = this.nextVelocity;
  }
}
