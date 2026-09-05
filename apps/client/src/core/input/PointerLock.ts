export type PointerLockMode =
  "unlocked" | "requesting" | "unadjusted" | "standard";

type LockChangeHandler = (locked: boolean) => void;

export class PointerLock {
  private locked = false;
  private requestInFlight = false;
  private requestedMode: PointerLockMode = "unlocked";
  private currentMode: PointerLockMode = "unlocked";
  private feedbackMessage: string | null = null;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly panel: HTMLElement,
    private readonly activationButton: HTMLButtonElement,
    private readonly statusElement: HTMLElement,
    private readonly onLockChange: LockChangeHandler,
  ) {
    this.activationButton.addEventListener("click", this.handleActivation);
    document.addEventListener(
      "pointerlockchange",
      this.handlePointerLockChange,
    );
    document.addEventListener("pointerlockerror", this.handlePointerLockError);
    this.updateInterface();
  }

  public get isLocked(): boolean {
    return this.locked;
  }

  public get mode(): PointerLockMode {
    return this.currentMode;
  }

  public destroy(): void {
    this.activationButton.removeEventListener("click", this.handleActivation);
    document.removeEventListener(
      "pointerlockchange",
      this.handlePointerLockChange,
    );
    document.removeEventListener(
      "pointerlockerror",
      this.handlePointerLockError,
    );

    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }

    this.locked = false;
    this.currentMode = "unlocked";
    this.onLockChange(false);
  }

  private readonly handleActivation = (): void => {
    void this.requestLock();
  };

  private readonly handlePointerLockChange = (): void => {
    const nextLocked = document.pointerLockElement === this.canvas;
    this.locked = nextLocked;
    this.currentMode = nextLocked ? this.requestedMode : "unlocked";
    this.feedbackMessage = null;
    this.onLockChange(nextLocked);
    this.updateInterface();
  };

  private readonly handlePointerLockError = (): void => {
    if (!this.requestInFlight) {
      this.feedbackMessage =
        "Pointer Lock was not granted. Click to try again.";
      this.updateInterface();
    }
  };

  private async requestLock(): Promise<void> {
    if (this.locked || this.requestInFlight) {
      return;
    }

    this.requestInFlight = true;
    this.requestedMode = "unadjusted";
    this.currentMode = "requesting";
    this.feedbackMessage = null;
    this.updateInterface();

    try {
      const requestResult: Promise<void> | void =
        this.canvas.requestPointerLock({
          unadjustedMovement: true,
        });

      if (requestResult === undefined) {
        // Legacy implementations accept the call but cannot confirm raw-input support.
        this.requestedMode = "standard";
      } else {
        await requestResult;
      }
    } catch {
      this.requestedMode = "standard";

      try {
        await this.canvas.requestPointerLock();
      } catch {
        this.feedbackMessage =
          "Pointer Lock was not granted. Click to try again.";
      }
    } finally {
      this.requestInFlight = false;

      if (!this.locked) {
        this.currentMode = "unlocked";
      }

      this.updateInterface();
    }
  }

  private updateInterface(): void {
    this.panel.hidden = this.locked;
    this.activationButton.disabled = this.requestInFlight;
    this.activationButton.textContent = this.requestInFlight
      ? "Requesting control…"
      : "Click to play";
    this.statusElement.textContent =
      this.feedbackMessage ??
      "Pointer Lock is required for movement and mouse look.";
  }
}
