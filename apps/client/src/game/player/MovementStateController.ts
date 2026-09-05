import { MovementState } from "./MovementState";

export class MovementStateController {
  private currentState = MovementState.Airborne;

  public get current(): MovementState {
    return this.currentState;
  }

  public get isGrounded(): boolean {
    return this.currentState === MovementState.Grounded;
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

  public tryStartJump(): boolean {
    if (this.currentState !== MovementState.Grounded) {
      return false;
    }

    this.transitionTo(MovementState.Airborne);
    return true;
  }

  private transitionTo(nextState: MovementState): void {
    this.currentState = nextState;
  }
}
