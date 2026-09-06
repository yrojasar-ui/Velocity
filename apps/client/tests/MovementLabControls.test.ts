import { Vec3, type RigidBodyComponent } from "playcanvas";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MovementLabControls } from "../src/debug/MovementLabControls";

describe("MovementLabControls modifiers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignores Ctrl-modified reset and telemetry shortcuts", () => {
    let keydownHandler: ((event: KeyboardEvent) => void) | undefined;
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      addEventListener(
        eventName: string,
        listener: (event: KeyboardEvent) => void,
      ): void {
        if (eventName === "keydown") {
          keydownHandler = listener;
        }
      },
      removeEventListener,
    });
    const telemetryElement = { hidden: false } as HTMLElement;
    const preparePlayerReset = vi.fn();
    const controls = new MovementLabControls(
      telemetryElement,
      {} as RigidBodyComponent,
      new Vec3(),
      preparePlayerReset,
    );
    const preventDefault = vi.fn();
    const eventBase = {
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      preventDefault,
      repeat: false,
    };

    keydownHandler?.({ ...eventBase, code: "F3" } as unknown as KeyboardEvent);
    keydownHandler?.({
      ...eventBase,
      code: "KeyR",
    } as unknown as KeyboardEvent);

    expect(telemetryElement.hidden).toBe(false);
    expect(preparePlayerReset).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();

    controls.destroy();
    expect(removeEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });
});
