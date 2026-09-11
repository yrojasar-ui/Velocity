import { Vec3, type RigidBodyComponent } from "playcanvas";

import { CharacterMotor } from "../../src/game/player/CharacterMotor";
import { JumpForgivenessController } from "../../src/game/player/JumpForgivenessController";
import { MovementState } from "../../src/game/player/MovementState";
import {
  MovementStateController,
  type GroundedModeIntent,
} from "../../src/game/player/MovementStateController";
import type { PlayerInputState } from "../../src/game/player/PlayerInput";
import type { PlayerStanceController } from "../../src/game/player/PlayerStanceController";
import { movementConfig } from "../../src/game/player/movementConfig";
import type {
  GroundProbe,
  GroundProbeSample,
} from "../../src/physics/GroundProbe";
import type { StandClearanceProbe } from "../../src/physics/StandClearanceProbe";

export const VALID_GROUND: GroundProbeSample = {
  hasWalkableGround: true,
  groundSeparation: 0,
};
export const NO_GROUND: GroundProbeSample = {
  hasWalkableGround: false,
  groundSeparation: null,
};

const NO_INPUT: PlayerInputState = {
  moveX: 0,
  moveZ: 0,
  jumpPressed: false,
  sprintHeld: false,
  crouchHeld: false,
  crouchPressed: false,
  pointerLocked: true,
  lookDeltaX: 0,
  lookDeltaY: 0,
};

export interface MotorHarness {
  readonly forgiveness: JumpForgivenessController;
  readonly movementState: MovementStateController;
  readonly stanceCrouched: boolean;
  readonly standClearanceChecks: number;
  readonly velocity: Vec3;
  setGroundSample(sample: Readonly<GroundProbeSample>): void;
  setStandClear(clear: boolean): void;
  setVelocity(x: number, y: number, z: number): void;
  update(input?: Partial<PlayerInputState>, deltaTime?: number): void;
}

export function createHarness(
  initialState?: MovementState,
  initiallyCrouched = false,
): MotorHarness {
  let groundSample: Readonly<GroundProbeSample> = VALID_GROUND;
  let standClear = true;
  let standClearanceChecks = 0;
  let stanceCrouched = initiallyCrouched;
  const velocity = new Vec3();
  const rigidBody = {} as RigidBodyComponent;
  Object.defineProperty(rigidBody, "linearVelocity", {
    get: () => velocity,
    set: (nextVelocity: Readonly<Vec3>) => {
      velocity.copy(nextVelocity);
    },
  });
  const groundProbe = {
    sample: (): Readonly<GroundProbeSample> => groundSample,
  } as GroundProbe;
  const standClearanceProbe = {
    canStand(): boolean {
      standClearanceChecks += 1;
      return standClear;
    },
  } as StandClearanceProbe;
  const stance = {
    get isCrouched(): boolean {
      return stanceCrouched;
    },
    update(crouchRequired: boolean, clearance: boolean): void {
      if (crouchRequired) {
        stanceCrouched = true;
      } else if (clearance) {
        stanceCrouched = false;
      }
    },
  } as unknown as PlayerStanceController;
  const movementState = new MovementStateController();
  if (initialState !== undefined) {
    setMovementState(movementState, initialState);
  }
  const forgiveness = new JumpForgivenessController(
    movementConfig.coyoteTimeSeconds,
    movementConfig.jumpBufferTimeSeconds,
  );
  const motor = new CharacterMotor(
    rigidBody,
    groundProbe,
    standClearanceProbe,
    movementState,
    forgiveness,
    stance,
    movementConfig,
  );

  return {
    forgiveness,
    movementState,
    get stanceCrouched(): boolean {
      return stanceCrouched;
    },
    get standClearanceChecks(): number {
      return standClearanceChecks;
    },
    velocity,
    setGroundSample(sample): void {
      groundSample = sample;
    },
    setStandClear(clear): void {
      standClear = clear;
    },
    setVelocity(x, y, z): void {
      velocity.set(x, y, z);
    },
    update(input = {}, deltaTime = 0): void {
      motor.update({ ...NO_INPUT, ...input }, 0, deltaTime);
    },
  };
}

export function inputForState(
  state: MovementState,
  input: Partial<PlayerInputState>,
): Partial<PlayerInputState> {
  if (state === MovementState.Sprint) {
    return { moveZ: 1, sprintHeld: true, ...input };
  }

  if (state === MovementState.Crouch || state === MovementState.Slide) {
    return { crouchHeld: true, ...input };
  }

  return input;
}

function setMovementState(
  movementState: MovementStateController,
  state: MovementState,
): void {
  if (state === MovementState.Airborne) {
    return;
  }

  movementState.updateGroundValidity({ supported: true, landingValid: true });
  movementState.updateGroundedMode(intentForState(state));
}

function intentForState(state: MovementState): GroundedModeIntent {
  const intent: GroundedModeIntent = {
    crouchHeld: false,
    crouchPressed: false,
    standClear: true,
    sprintRequested: false,
    forwardInput: 0,
    minimumSprintForwardInput: movementConfig.minimumSprintForwardInput,
    horizontalSpeed: 0,
    minimumSlideSpeed: movementConfig.minimumSlideSpeed,
  };

  if (state === MovementState.Sprint) {
    intent.sprintRequested = true;
    intent.forwardInput = 1;
  } else if (state === MovementState.Crouch) {
    intent.crouchHeld = true;
  } else if (state === MovementState.Slide) {
    intent.crouchHeld = true;
    intent.crouchPressed = true;
    intent.horizontalSpeed = movementConfig.sprintSpeed;
  }

  return intent;
}
