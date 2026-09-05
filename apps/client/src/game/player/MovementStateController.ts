import { MovementState } from "./MovementState";

export interface GroundedModeIntent {
  crouchRequested: boolean;
  standClear: boolean;
  sprintRequested: boolean;
  forwardInput: number;
  minimumSprintForwardInput: number;
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

  public updateGroundValidity(groundValid: boolean): void {
    if (!groundValid && this.isGrounded) {
      this.transitionTo(MovementState.Airborne);
      return;
    }

    if (groundValid && this.currentState === MovementState.Airborne) {
      this.transitionTo(MovementState.Grounded);
    }
  }

  public updateGroundedMode(intent: Readonly<GroundedModeIntent>): void {
    if (!this.isGrounded) {
      return;
    }

    if (intent.crouchRequested || !intent.standClear) {
      this.transitionTo(MovementState.Crouch);
      return;
    }

    if (
      intent.sprintRequested &&
      intent.forwardInput >= intent.minimumSprintForwardInput
    ) {
      this.transitionTo(MovementState.Sprint);
      return;
    }

    this.transitionTo(MovementState.Grounded);
  }

  public tryStartJump(standClear = true): boolean {
    if (!this.isGrounded || (this.isCrouched && !standClear)) {
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
