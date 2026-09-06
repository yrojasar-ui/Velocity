import {
  KEY_C,
  KEY_CONTROL,
  KEY_SHIFT,
  type EventHandle,
  type Keyboard,
  type Mouse,
} from "playcanvas";
import { describe, expect, it } from "vitest";

import { PlayerInput } from "../src/game/player/PlayerInput";

describe("PlayerInput stance modifiers", () => {
  it("requires held Sprint/Crouch keys to be released after controls activate", () => {
    const harness = createInputHarness();
    harness.pressedKeys.add(KEY_SHIFT);
    harness.pressedKeys.add(KEY_C);
    harness.input.setControlActive(true);

    expect(harness.input.read().sprintHeld).toBe(false);
    expect(harness.input.read().crouchHeld).toBe(false);
    expect(harness.input.read().crouchPressed).toBe(false);

    harness.pressedKeys.clear();
    harness.input.read();
    harness.pressedKeys.add(KEY_SHIFT);
    harness.pressedKeys.add(KEY_C);
    harness.pressedThisFrame.add(KEY_C);

    expect(harness.input.read().sprintHeld).toBe(true);
    expect(harness.input.read().crouchHeld).toBe(true);
    expect(harness.input.read().crouchPressed).toBe(true);
    harness.input.destroy();
  });

  it("clears Sprint/Crouch output when controls become inactive", () => {
    const harness = createInputHarness();
    harness.input.setControlActive(true);
    harness.input.read();
    harness.pressedKeys.add(KEY_SHIFT);
    harness.pressedKeys.add(KEY_C);

    expect(harness.input.read().sprintHeld).toBe(true);
    expect(harness.input.read().crouchHeld).toBe(true);

    harness.input.setControlActive(false);

    expect(harness.input.read().sprintHeld).toBe(false);
    expect(harness.input.read().crouchHeld).toBe(false);
    expect(harness.input.read().crouchPressed).toBe(false);
    harness.input.destroy();
  });

  it("reports crouchPressed only on the C press edge", () => {
    const harness = createInputHarness();
    harness.input.setControlActive(true);
    harness.input.read();
    harness.pressedKeys.add(KEY_C);
    harness.pressedThisFrame.add(KEY_C);

    expect(harness.input.read()).toMatchObject({
      crouchHeld: true,
      crouchPressed: true,
    });

    harness.pressedThisFrame.clear();

    expect(harness.input.read()).toMatchObject({
      crouchHeld: true,
      crouchPressed: false,
    });

    harness.pressedKeys.clear();

    expect(harness.input.read()).toMatchObject({
      crouchHeld: false,
      crouchPressed: false,
    });
    harness.input.destroy();
  });

  it("does not synthesize crouchPressed when controls reactivate with C held", () => {
    const harness = createInputHarness();
    harness.input.setControlActive(true);
    harness.input.read();
    harness.pressedKeys.add(KEY_C);
    harness.pressedThisFrame.add(KEY_C);

    expect(harness.input.read()).toMatchObject({
      crouchHeld: true,
      crouchPressed: true,
    });

    harness.input.setControlActive(false);
    harness.pressedThisFrame.clear();
    harness.input.setControlActive(true);

    expect(harness.input.read()).toMatchObject({
      crouchHeld: false,
      crouchPressed: false,
    });

    expect(harness.input.read()).toMatchObject({
      crouchHeld: false,
      crouchPressed: false,
    });

    harness.pressedKeys.clear();
    harness.input.read();
    harness.pressedKeys.add(KEY_C);
    harness.pressedThisFrame.add(KEY_C);

    expect(harness.input.read()).toMatchObject({
      crouchHeld: true,
      crouchPressed: true,
    });
    harness.input.destroy();
  });

  it("does not treat Ctrl as crouch input or a mapped-key release barrier", () => {
    const harness = createInputHarness();
    harness.pressedKeys.add(KEY_CONTROL);
    harness.pressedThisFrame.add(KEY_CONTROL);
    harness.input.setControlActive(true);

    expect(harness.input.read()).toMatchObject({
      crouchHeld: false,
      crouchPressed: false,
    });

    harness.pressedKeys.add(KEY_C);
    harness.pressedThisFrame.add(KEY_C);

    expect(harness.input.read()).toMatchObject({
      crouchHeld: true,
      crouchPressed: true,
    });
    harness.input.destroy();
  });
});

interface InputHarness {
  readonly input: PlayerInput;
  readonly pressedKeys: Set<number>;
  readonly pressedThisFrame: Set<number>;
}

function createInputHarness(): InputHarness {
  const pressedKeys = new Set<number>();
  const pressedThisFrame = new Set<number>();
  const keyboard = {
    isPressed(key: number): boolean {
      return pressedKeys.has(key);
    },
    wasPressed(key: number): boolean {
      return pressedThisFrame.has(key);
    },
  } as unknown as Keyboard;
  const eventHandle = { off(): void {} } as EventHandle;
  const mouse = {
    on(): EventHandle {
      return eventHandle;
    },
  } as unknown as Mouse;

  return {
    input: new PlayerInput(keyboard, mouse),
    pressedKeys,
    pressedThisFrame,
  };
}
