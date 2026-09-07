import { MovementState } from "./MovementState";

export interface GroundedModeIntent {
  crouchHeld: boolean;
  crouchPressed: boolean;
  standClear: boolean;
  sprintRequested: boolean;
  forwardInput: number;
  minimumSprintForwardInput: number;
  horizontalSpeed: number;
  minimumSlideSpeed: number;
}

export interface GroundValidity {
  supported: boolean;
  landingValid: boolean;
}

export class MovementStateController {
  private currentState = MovementState.Airborne;

  public get current(): MovementState {
    return this.currentState;
  }

  public get isGrounded(): boolean {
    return this.currentState !== MovementState.Airborne;
  }

  public get isSprinting(): boolean {
    return this.currentState === MovementState.Sprint;
  }

  public get isCrouched(): boolean {
    return this.currentState === MovementState.Crouch;
  }

  public get isSliding(): boolean {
    return this.currentState === MovementState.Slide;
  }

  public get requiresCrouchedStance(): boolean {
    return this.isCrouched || this.isSliding;
  }

  public updateGroundValidity(validity: Readonly<GroundValidity>): void {
    if (!validity.supported && this.isGrounded) {
      this.transitionTo(MovementState.Airborne);
      return;
    }

    if (validity.landingValid && this.currentState === MovementState.Airborne) {
      this.transitionTo(MovementState.Grounded);
    }
  }

  public updateGroundedMode(intent: Readonly<GroundedModeIntent>): void {
    if (!this.isGrounded) {
      return;
    }

    const sprintEligible =
      intent.sprintRequested &&
      intent.forwardInput >= intent.minimumSprintForwardInput;

    if (this.isSliding) {
      if (!intent.crouchHeld) {
        if (!intent.standClear) {
          this.transitionTo(MovementState.Crouch);
        } else {
          this.transitionTo(
            sprintEligible ? MovementState.Sprint : MovementState.Grounded,
          );
        }
        return;
      }

      if (intent.horizontalSpeed < intent.minimumSlideSpeed) {
        this.transitionTo(MovementState.Crouch);
      }
      return;
    }

    const validSlideSource =
      this.currentState === MovementState.Grounded || this.isSprinting;
    if (
      validSlideSource &&
      intent.crouchPressed &&
      intent.horizontalSpeed >= intent.minimumSlideSpeed
    ) {
      this.transitionTo(MovementState.Slide);
      return;
    }

    if (intent.crouchHeld || !intent.standClear) {
      this.transitionTo(MovementState.Crouch);
      return;
    }

    if (sprintEligible) {
      this.transitionTo(MovementState.Sprint);
      return;
    }

    this.transitionTo(MovementState.Grounded);
  }

  public tryStartJump(standClear = true): boolean {
    if (!this.isGrounded || (this.requiresCrouchedStance && !standClear)) {
      return false;
    }

    this.transitionTo(MovementState.Airborne);
    return true;
  }

  public reset(): void {
    this.transitionTo(MovementState.Airborne);
  }

  private transitionTo(nextState: MovementState): void {
    this.currentState = nextState;
  }
}
