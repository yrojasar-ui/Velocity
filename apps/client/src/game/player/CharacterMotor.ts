import { math, Vec3, type RigidBodyComponent } from "playcanvas";

import {
  canAcceptLanding,
  hasGroundSupport,
  type GroundProbe,
} from "../../physics/GroundProbe";
import type { StandClearanceProbe } from "../../physics/StandClearanceProbe";
import type { TraversalProbe } from "../../physics/TraversalProbe";
import type {
  GroundValidity,
  GroundedModeIntent,
  MovementStateController,
} from "./MovementStateController";
import type { JumpForgivenessController } from "./JumpForgivenessController";
import { isGroundedMovementState, MovementState } from "./MovementState";
import type { PlayerInputState } from "./PlayerInput";
import type { PlayerStanceController } from "./PlayerStanceController";
import type { TraversalController } from "./TraversalController";
import { calculateAirVelocity } from "./airMath";
import type { MovementConfig } from "./movementConfig";
import {
  calculateGroundVelocity,
  getGroundTargetSpeed,
  type HorizontalVector,
} from "./movementMath";
import {
  calculateSlideVelocity,
  getHorizontalJumpRetention,
} from "./slideMath";
import { isPhysicalCrouchRequired } from "./stanceMath";
import {
  canAttemptTraversalFromState,
  canStartTraversalFromState,
  hasTraversalForwardIntent,
} from "./traversalMath";

const DEGREES_TO_RADIANS = Math.PI / 180;

export class CharacterMotor {
  private readonly currentHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly movementInput: HorizontalVector = { x: 0, z: 0 };
  private readonly nextHorizontalVelocity: HorizontalVector = { x: 0, z: 0 };
  private readonly nextVelocity = new Vec3();
  private readonly zeroAngularVelocity = new Vec3();
  private readonly groundValidity: GroundValidity = {
    supported: false,
    landingValid: false,
  };
  private readonly groundedModeIntent: GroundedModeIntent = {
    crouchHeld: false,
    crouchPressed: false,
    standClear: true,
    sprintRequested: false,
    forwardInput: 0,
    minimumSprintForwardInput: 0,
    horizontalSpeed: 0,
    minimumSlideSpeed: 0,
  };

  public constructor(
    private readonly rigidBody: RigidBodyComponent,
    private readonly groundProbe: GroundProbe,
    private readonly standClearanceProbe: StandClearanceProbe,
    private readonly traversalProbe: TraversalProbe,
    private readonly movementState: MovementStateController,
    private readonly jumpForgiveness: JumpForgivenessController,
    private readonly stance: PlayerStanceController,
    private readonly traversal: TraversalController,
    private readonly config: Readonly<MovementConfig>,
  ) {}

  public update(
    input: Readonly<PlayerInputState>,
    viewYawDegrees: number,
    deltaTime: number,
  ): void {
    const frameDeltaSeconds = math.clamp(deltaTime, 0, 0.1);
    this.jumpForgiveness.advance(frameDeltaSeconds);

    const currentVelocity = this.rigidBody.linearVelocity;
    const groundSample = this.groundProbe.sample();
    this.groundValidity.supported = hasGroundSupport(
      groundSample,
      currentVelocity.y,
      this.config.maximumGroundedUpwardVelocity,
    );
    this.groundValidity.landingValid = canAcceptLanding(
      groundSample,
      currentVelocity.y,
      this.config.maximumGroundedUpwardVelocity,
      this.config.groundContactTolerance,
    );
    const stateBeforeGroundUpdate = this.movementState.current;
    this.movementState.updateGroundValidity(this.groundValidity);
    if (
      isGroundedMovementState(stateBeforeGroundUpdate) &&
      this.movementState.current === MovementState.Airborne
    ) {
      this.jumpForgiveness.armCoyote(stateBeforeGroundUpdate);
    } else if (
      stateBeforeGroundUpdate === MovementState.Airborne &&
      this.movementState.isGrounded
    ) {
      this.jumpForgiveness.clearCoyote();
    }

    if (this.movementState.isTraversing) {
      if (this.traversal.isActive) {
        this.updateTraversal(frameDeltaSeconds);
        return;
      }

      this.movementState.cancelTraversal();
    }

    const bufferedJumpHasSource =
      this.jumpForgiveness.getEffectiveJumpSource(
        this.movementState.current,
      ) !== null;
    const freshJumpHasSource =
      input.jumpPressed &&
      (isGroundedMovementState(this.movementState.current) ||
        (this.movementState.current === MovementState.Airborne &&
          this.jumpForgiveness.coyoteActive));
    const shouldCheckStandClearance =
      this.stance.isCrouched &&
      (!input.crouchHeld || bufferedJumpHasSource || freshJumpHasSource);
    const standClear =
      !this.stance.isCrouched ||
      (shouldCheckStandClearance && this.standClearanceProbe.canStand());

    this.groundedModeIntent.crouchHeld = input.crouchHeld;
    this.groundedModeIntent.crouchPressed = input.crouchPressed;
    this.groundedModeIntent.standClear = standClear;
    this.groundedModeIntent.sprintRequested = input.sprintHeld;
    this.groundedModeIntent.forwardInput = input.moveZ;
    this.groundedModeIntent.minimumSprintForwardInput =
      this.config.minimumSprintForwardInput;
    this.groundedModeIntent.horizontalSpeed = Math.hypot(
      currentVelocity.x,
      currentVelocity.z,
    );
    this.groundedModeIntent.minimumSlideSpeed = this.config.minimumSlideSpeed;
    this.movementState.updateGroundedMode(this.groundedModeIntent);

    if (this.tryStartTraversal(input, viewYawDegrees, currentVelocity)) {
      this.updateTraversal(frameDeltaSeconds);
      return;
    }

    if (input.jumpPressed) {
      this.jumpForgiveness.recordJumpPress();
    }

    this.nextVelocity.copy(currentVelocity);

    this.currentHorizontalVelocity.x = currentVelocity.x;
    this.currentHorizontalVelocity.z = currentVelocity.z;
    if (this.movementState.isSliding) {
      calculateSlideVelocity(
        this.currentHorizontalVelocity,
        this.config.slideFriction,
        frameDeltaSeconds,
        this.nextHorizontalVelocity,
      );
      this.nextVelocity.x = this.nextHorizontalVelocity.x;
      this.nextVelocity.z = this.nextHorizontalVelocity.z;
    } else if (this.movementState.isGrounded) {
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
    } else {
      this.movementInput.x = input.moveX;
      this.movementInput.z = input.moveZ;

      calculateAirVelocity(
        this.currentHorizontalVelocity,
        this.movementInput,
        viewYawDegrees * DEGREES_TO_RADIANS,
        this.config.airAcceleration,
        this.config.maxAirSpeed,
        frameDeltaSeconds,
        this.nextHorizontalVelocity,
      );

      this.nextVelocity.x = this.nextHorizontalVelocity.x;
      this.nextVelocity.z = this.nextHorizontalVelocity.z;
    }

    const jumpSource = this.jumpForgiveness.getEffectiveJumpSource(
      this.movementState.current,
    );
    const lowProfileAtJumpStart = this.stance.isCrouched;
    let startedJumpSource: typeof jumpSource = null;
    if (jumpSource !== null) {
      const lowProfileJump =
        jumpSource === MovementState.Crouch ||
        jumpSource === MovementState.Slide;
      if (!lowProfileJump || standClear) {
        const jumpAuthorized = this.movementState.isGrounded
          ? this.movementState.tryStartJump(standClear)
          : true;
        if (jumpAuthorized) {
          startedJumpSource = jumpSource;
        }
      }

      // A rejected low-profile request must not fire later after clearance changes.
      this.jumpForgiveness.consumeJumpRequest();
    }

    const jumpStartedThisFrame = startedJumpSource !== null;
    if (startedJumpSource !== null) {
      const horizontalRetention = getHorizontalJumpRetention(
        startedJumpSource,
        this.config.slideJumpHorizontalRetention,
      );
      this.nextVelocity.x *= horizontalRetention;
      this.nextVelocity.z *= horizontalRetention;
      // A direct vertical launch speed keeps the jump predictable while physics owns gravity.
      this.nextVelocity.y = this.config.jumpVelocity;
    }

    const crouchRequired = isPhysicalCrouchRequired(
      this.movementState.requiresCrouchedStance,
      this.stance.isCrouched,
      input.crouchHeld,
      standClear,
      jumpStartedThisFrame && lowProfileAtJumpStart,
    );
    this.stance.update(crouchRequired, standClear, frameDeltaSeconds);

    this.rigidBody.linearVelocity = this.nextVelocity;
  }

  private tryStartTraversal(
    input: Readonly<PlayerInputState>,
    viewYawDegrees: number,
    currentVelocity: Readonly<Vec3>,
  ): boolean {
    if (
      !input.jumpPressed ||
      !hasTraversalForwardIntent(
        input.moveZ,
        this.config.minimumTraversalForwardInput,
      ) ||
      !canAttemptTraversalFromState(
        this.movementState.current,
        !this.stance.isCrouched,
      )
    ) {
      return false;
    }

    const candidate = this.traversalProbe.findCandidate(viewYawDegrees);
    if (
      candidate === null ||
      !canStartTraversalFromState(
        candidate.kind,
        this.movementState.current,
        !this.stance.isCrouched,
      ) ||
      !this.traversal.start(candidate, currentVelocity)
    ) {
      return false;
    }

    if (!this.movementState.startTraversal(candidate.kind)) {
      this.traversal.reset();
      return false;
    }

    this.jumpForgiveness.reset();
    return true;
  }

  private updateTraversal(deltaTimeSeconds: number): void {
    const step = this.traversal.advance(deltaTimeSeconds);
    this.nextVelocity.set(0, 0, 0);
    this.rigidBody.linearVelocity = this.nextVelocity;
    this.rigidBody.angularVelocity = this.zeroAngularVelocity;
    this.rigidBody.teleport(step.position);

    if (step.completed) {
      this.movementState.completeTraversal();
      this.rigidBody.linearVelocity = this.traversal.exitLinearVelocity;
    }
  }
}
