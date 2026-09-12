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
import {
  TraversalController,
  type TraversalCandidate,
} from "../../src/game/player/TraversalController";
import { movementConfig } from "../../src/game/player/movementConfig";
import type {
  GroundProbe,
  GroundProbeSample,
} from "../../src/physics/GroundProbe";
import type { StandClearanceProbe } from "../../src/physics/StandClearanceProbe";
import type { TraversalProbe } from "../../src/physics/TraversalProbe";

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
  readonly traversal: TraversalController;
  readonly stanceCrouched: boolean;
  readonly standClearanceChecks: number;
  readonly traversalProbeChecks: number;
  readonly traversalHeightReferences: readonly (number | null)[];
  readonly position: Vec3;
  readonly velocity: Vec3;
  setGroundSample(sample: Readonly<GroundProbeSample>): void;
  setStandClear(clear: boolean): void;
  setTraversalCandidate(candidate: Readonly<TraversalCandidate> | null): void;
  setVelocity(x: number, y: number, z: number): void;
  resetMotor(): void;
  update(
    input?: Partial<PlayerInputState>,
    deltaTime?: number,
    viewYawDegrees?: number,
  ): void;
}

export function createHarness(
  initialState?: MovementState,
  initiallyCrouched = false,
): MotorHarness {
  let groundSample: Readonly<GroundProbeSample> = VALID_GROUND;
  let standClear = true;
  let standClearanceChecks = 0;
  let traversalProbeChecks = 0;
  const traversalHeightReferences: (number | null)[] = [];
  let traversalCandidate: Readonly<TraversalCandidate> | null = null;
  let stanceCrouched = initiallyCrouched;
  let capsuleHeight = initiallyCrouched
    ? movementConfig.crouchHeight
    : movementConfig.playerHeight;
  const position = new Vec3(0, capsuleHeight / 2, 0);
  const velocity = new Vec3();
  const rigidBody = {} as RigidBodyComponent;
  Object.defineProperty(rigidBody, "linearVelocity", {
    get: () => velocity,
    set: (nextVelocity: Readonly<Vec3>) => {
      velocity.copy(nextVelocity);
    },
  });
  Object.defineProperty(rigidBody, "angularVelocity", {
    get: () => Vec3.ZERO,
    set: () => undefined,
  });
  Object.defineProperty(rigidBody, "teleport", {
    value: (nextPosition: Vec3): void => {
      position.copy(nextPosition);
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
  const traversalProbe = {
    get currentFeetY(): number {
      return position.y - capsuleHeight / 2;
    },
    findCandidate(
      _viewYawDegrees: number,
      heightReferenceFeetY: number | null,
    ): Readonly<TraversalCandidate> | null {
      traversalProbeChecks += 1;
      traversalHeightReferences.push(heightReferenceFeetY);
      return heightReferenceFeetY === null ? null : traversalCandidate;
    },
  } as unknown as TraversalProbe;
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
      const nextHeight = stanceCrouched
        ? movementConfig.crouchHeight
        : movementConfig.playerHeight;
      position.y += (nextHeight - capsuleHeight) / 2;
      capsuleHeight = nextHeight;
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
  const traversal = new TraversalController(movementConfig);
  const motor = new CharacterMotor(
    rigidBody,
    groundProbe,
    standClearanceProbe,
    traversalProbe,
    movementState,
    forgiveness,
    stance,
    traversal,
    movementConfig,
  );

  return {
    forgiveness,
    movementState,
    traversal,
    traversalHeightReferences,
    get stanceCrouched(): boolean {
      return stanceCrouched;
    },
    get standClearanceChecks(): number {
      return standClearanceChecks;
    },
    get traversalProbeChecks(): number {
      return traversalProbeChecks;
    },
    position,
    velocity,
    setGroundSample(sample): void {
      groundSample = sample;
    },
    setStandClear(clear): void {
      standClear = clear;
    },
    setTraversalCandidate(candidate): void {
      traversalCandidate = candidate;
    },
    setVelocity(x, y, z): void {
      velocity.set(x, y, z);
    },
    resetMotor(): void {
      motor.reset();
    },
    update(input = {}, deltaTime = 0, viewYawDegrees = 0): void {
      motor.update({ ...NO_INPUT, ...input }, viewYawDegrees, deltaTime);
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
