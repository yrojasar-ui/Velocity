import { math, Vec3, type RigidBodyComponent } from "playcanvas";

import type { GroundProbe } from "../../physics/GroundProbe";
import type { StandClearanceProbe } from "../../physics/StandClearanceProbe";
import type {
  GroundedModeIntent,
  MovementStateController,
} from "./MovementStateController";
import type { PlayerInputState } from "./PlayerInput";
import type { PlayerStanceController } from "./PlayerStanceController";
import type { MovementConfig } from "./movementConfig";
import {
  calculateGroundVelocity,
  getGroundTargetSpeed,
  type HorizontalVector,
} from "./movementMath";
import { isPhysicalCrouchRequired } from "./stanceMath";

const DEGREES_TO_RADIANS = Math.PI / 180;

export class CharacterMotor {
  private readonly currentHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly movementInput: HorizontalVector = { x: 0, z: 0 };
  private readonly nextHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly nextVelocity = new Vec3();
  private readonly groundedModeIntent: GroundedModeIntent = {
    crouchRequested: false,
    standClear: true,
    sprintRequested: false,
    forwardInput: 0,
    minimumSprintForwardInput: 0,
  };

  public constructor(
    private readonly rigidBody: RigidBodyComponent,
    private readonly groundProbe: GroundProbe,
    private readonly standClearanceProbe: StandClearanceProbe,
    private readonly movementState: MovementStateController,
    private readonly stance: PlayerStanceController,
    private readonly config: Readonly<MovementConfig>,
  ) {}

  public update(
    input: Readonly<PlayerInputState>,
    viewYawDegrees: number,
    deltaTime: number,
  ): void {
    const frameDeltaSeconds = math.clamp(deltaTime, 0, 0.1);
    const currentVelocity = this.rigidBody.linearVelocity;
    this.movementState.updateGroundValidity(
      this.groundProbe.isGrounded(currentVelocity.y),
    );
    const shouldCheckStandClearance =
      this.stance.isCrouched &&
      (!input.crouchHeld ||
        (input.jumpPressed && this.movementState.isGrounded));
    const standClear =
      !this.stance.isCrouched ||
      (shouldCheckStandClearance && this.standClearanceProbe.canStand());

    this.groundedModeIntent.crouchRequested = input.crouchHeld;
    this.groundedModeIntent.standClear = standClear;
    this.groundedModeIntent.sprintRequested = input.sprintHeld;
    this.groundedModeIntent.forwardInput = input.moveZ;
    this.groundedModeIntent.minimumSprintForwardInput =
      this.config.minimumSprintForwardInput;
    this.movementState.updateGroundedMode(this.groundedModeIntent);
    this.nextVelocity.copy(currentVelocity);

    if (this.movementState.isGrounded) {
      this.currentHorizontalVelocity.x = currentVelocity.x;
      this.currentHorizontalVelocity.z = currentVelocity.z;
      this.movementInput.x = input.moveX;
      this.movementInput.z = input.moveZ;

      calculateGroundVelocity(
        this.currentHorizontalVelocity,
        this.movementInput,
        viewYawDegrees * DEGREES_TO_RADIANS,
        getGroundTargetSpeed(this.movementState.current, this.config),
        this.config.groundAcceleration,
        this.config.groundDeceleration,
        frameDeltaSeconds,
        this.nextHorizontalVelocity,
      );

      this.nextVelocity.x = this.nextHorizontalVelocity.x;
      this.nextVelocity.z = this.nextHorizontalVelocity.z;
    }

    if (input.jumpPressed && this.movementState.tryStartJump(standClear)) {
      // A direct vertical launch speed keeps the jump predictable while physics owns gravity.
      this.nextVelocity.y = this.config.jumpVelocity;
    }

    const crouchRequired = isPhysicalCrouchRequired(
      this.movementState.isCrouched,
      this.stance.isCrouched,
      input.crouchHeld,
      standClear,
    );
    this.stance.update(crouchRequired, standClear, frameDeltaSeconds);

    this.rigidBody.linearVelocity = this.nextVelocity;
  }
}
