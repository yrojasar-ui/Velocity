export enum MovementState {
  Grounded = "Grounded",
  Airborne = "Airborne",
  Sprint = "Sprint",
  Crouch = "Crouch",
  Slide = "Slide",
  Mantle = "Mantle",
  Vault = "Vault",
}

export type GroundedMovementState =
  | MovementState.Grounded
  | MovementState.Sprint
  | MovementState.Crouch
  | MovementState.Slide;

export type TraversalMovementState = MovementState.Mantle | MovementState.Vault;

export function isGroundedMovementState(
  state: MovementState,
): state is GroundedMovementState {
  return (
    state === MovementState.Grounded ||
    state === MovementState.Sprint ||
    state === MovementState.Crouch ||
    state === MovementState.Slide
  );
}

export function isTraversalMovementState(
  state: MovementState,
): state is TraversalMovementState {
  return state === MovementState.Mantle || state === MovementState.Vault;
}
