import {
  KEY_A,
  KEY_CONTROL,
  KEY_D,
  KEY_S,
  KEY_SHIFT,
  KEY_SPACE,
  KEY_W,
  Keyboard,
  Mouse,
  type EventHandle,
  type MouseEvent as PlayCanvasMouseEvent,
} from "playcanvas";

import { normalizeMovementInput, type HorizontalVector } from "./movementMath";

export interface PlayerInputState {
  moveX: number;
  moveZ: number;
  jumpPressed: boolean;
  sprintHeld: boolean;
  crouchHeld: boolean;
  crouchPressed: boolean;
  pointerLocked: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

export class PlayerInput {
  private readonly normalizedMovement: HorizontalVector = { x: 0, z: 0 };
  private readonly state: PlayerInputState = {
    moveX: 0,
    moveZ: 0,
    jumpPressed: false,
    sprintHeld: false,
    crouchHeld: false,
    crouchPressed: false,
    pointerLocked: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  };
  private readonly mouseMoveSubscription: EventHandle;
  private controlActive = false;
  private requireMappedKeysReleased = true;
  private accumulatedLookX = 0;
  private accumulatedLookY = 0;

  public constructor(
    private readonly keyboard: Keyboard,
    mouse: Mouse,
  ) {
    this.mouseMoveSubscription = mouse.on(
      Mouse.EVENT_MOUSEMOVE,
      this.handleMouseMove,
    );
  }

  public setControlActive(active: boolean): void {
    this.controlActive = active;

    if (!active) {
      this.requireMappedKeysReleased = true;
      this.resetOutputState();
      this.accumulatedLookX = 0;
      this.accumulatedLookY = 0;
    }
  }

  public read(): Readonly<PlayerInputState> {
    this.resetOutputState();
    this.state.pointerLocked = this.controlActive;

    if (!this.controlActive) {
      return this.state;
    }

    if (this.requireMappedKeysReleased) {
      if (this.hasMappedKeyPressed()) {
        return this.state;
      }

      this.requireMappedKeysReleased = false;
    }

    const rawMoveX =
      Number(this.keyboard.isPressed(KEY_D)) -
      Number(this.keyboard.isPressed(KEY_A));
    const rawMoveZ =
      Number(this.keyboard.isPressed(KEY_W)) -
      Number(this.keyboard.isPressed(KEY_S));
    normalizeMovementInput(rawMoveX, rawMoveZ, this.normalizedMovement);

    this.state.moveX = this.normalizedMovement.x;
    this.state.moveZ = this.normalizedMovement.z;
    this.state.jumpPressed = this.keyboard.wasPressed(KEY_SPACE);
    this.state.sprintHeld = this.keyboard.isPressed(KEY_SHIFT);
    this.state.crouchHeld = this.keyboard.isPressed(KEY_CONTROL);
    this.state.crouchPressed = this.keyboard.wasPressed(KEY_CONTROL);
    this.state.lookDeltaX = this.accumulatedLookX;
    this.state.lookDeltaY = this.accumulatedLookY;
    this.accumulatedLookX = 0;
    this.accumulatedLookY = 0;

    return this.state;
  }

  public destroy(): void {
    this.mouseMoveSubscription.off();
    this.setControlActive(false);
  }

  private readonly handleMouseMove = (event: PlayCanvasMouseEvent): void => {
    if (!this.controlActive) {
      return;
    }

    this.accumulatedLookX += event.dx;
    this.accumulatedLookY += event.dy;
  };

  private hasMappedKeyPressed(): boolean {
    return (
      this.keyboard.isPressed(KEY_W) ||
      this.keyboard.isPressed(KEY_A) ||
      this.keyboard.isPressed(KEY_S) ||
      this.keyboard.isPressed(KEY_D) ||
      this.keyboard.isPressed(KEY_SPACE) ||
      this.keyboard.isPressed(KEY_SHIFT) ||
      this.keyboard.isPressed(KEY_CONTROL)
    );
  }

  private resetOutputState(): void {
    this.state.moveX = 0;
    this.state.moveZ = 0;
    this.state.jumpPressed = false;
    this.state.sprintHeld = false;
    this.state.crouchHeld = false;
    this.state.crouchPressed = false;
    this.state.lookDeltaX = 0;
    this.state.lookDeltaY = 0;
  }
}
