import { math, Vec3, type RigidBodyComponent } from "playcanvas";

import type { GroundProbe } from "../../physics/GroundProbe";
import { MovementState } from "./MovementState";
import type { MovementStateController } from "./MovementStateController";
import type { PlayerInputState } from "./PlayerInput";
import type { MovementConfig } from "./movementConfig";
import { calculateGroundVelocity, type HorizontalVector } from "./movementMath";

const DEGREES_TO_RADIANS = Math.PI / 180;

export class CharacterMotor {
  private readonly currentHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly movementInput: HorizontalVector = { x: 0, z: 0 };
  private readonly nextHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly nextVelocity = new Vec3();

  public constructor(
    private readonly rigidBody: RigidBodyComponent,
    private readonly groundProbe: GroundProbe,
    private readonly movementState: MovementStateController,
    private readonly config: Readonly<MovementConfig>,
  ) {}

  public update(
    input: Readonly<PlayerInputState>,
    viewYawDegrees: number,
    deltaTime: number,
  ): void {
    const currentVelocity = this.rigidBody.linearVelocity;
    this.movementState.updateGroundValidity(
      this.groundProbe.isGrounded(currentVelocity.y),
    );
    this.nextVelocity.copy(currentVelocity);

    if (this.movementState.current === MovementState.Grounded) {
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

    if (input.jumpPressed && this.movementState.tryStartJump()) {
      // A direct vertical launch speed keeps the jump predictable while physics owns gravity.
      this.nextVelocity.y = this.config.jumpVelocity;
    }

    this.rigidBody.linearVelocity = this.nextVelocity;
  }
}
