import { MovementState } from "./MovementState";

export class MovementStateController {
  private currentState = MovementState.Airborne;

  public get current(): MovementState {
    return this.currentState;
  }

  public updateGroundValidity(groundValid: boolean): void {
    this.transitionTo(
      groundValid ? MovementState.Grounded : MovementState.Airborne,
    );
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
