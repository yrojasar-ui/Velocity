export interface MovementConfig {
  readonly walkSpeed: number;
  readonly sprintSpeed: number;
  readonly minimumSprintForwardInput: number;
  readonly crouchSpeedMultiplier: number;
  readonly minimumSlideSpeed: number;
  /** Horizontal slide speed loss in meters per second squared. */
  readonly slideFriction: number;
  readonly slideJumpHorizontalRetention: number;
  readonly groundAcceleration: number;
  readonly groundDeceleration: number;
  /** Horizontal velocity change available to airborne movement input in m/s². */
  readonly airAcceleration: number;
  /** Air-input speed ceiling; inherited horizontal overspeed is preserved. */
  readonly maxAirSpeed: number;
  readonly gravity: number;
  readonly jumpVelocity: number;
  readonly degreesPerMouseCount: number;
  readonly maxLookPitchDegrees: number;
  readonly playerHeight: number;
  readonly crouchHeight: number;
  readonly playerRadius: number;
  readonly playerMass: number;
  readonly playerFriction: number;
  readonly playerRestitution: number;
  readonly cameraEyeHeight: number;
  readonly crouchCameraEyeHeight: number;
  readonly crouchCameraTransitionSpeed: number;
  readonly cameraFovDegrees: number;
  readonly groundProbeDistance: number;
  /** Maximum vertical capsule-to-ground separation accepted as landing contact. */
  readonly groundContactTolerance: number;
  readonly minimumGroundNormalY: number;
  readonly maximumGroundedUpwardVelocity: number;
}

export const movementConfig: Readonly<MovementConfig> = Object.freeze({
  walkSpeed: 6,
  sprintSpeed: 8.5,
  minimumSprintForwardInput: 0.5,
  crouchSpeedMultiplier: 0.55,
  minimumSlideSpeed: 6.5,
  slideFriction: 4,
  slideJumpHorizontalRetention: 0.9,
  groundAcceleration: 30,
  groundDeceleration: 24,
  airAcceleration: 10,
  maxAirSpeed: 7.5,
  gravity: -24,
  jumpVelocity: 8,
  degreesPerMouseCount: 0.1,
  maxLookPitchDegrees: 89,
  playerHeight: 1.8,
  crouchHeight: 1.2,
  playerRadius: 0.4,
  playerMass: 80,
  playerFriction: 0,
  playerRestitution: 0,
  cameraEyeHeight: 0.65,
  crouchCameraEyeHeight: 0.45,
  crouchCameraTransitionSpeed: 2,
  cameraFovDegrees: 75,
  groundProbeDistance: 0.18,
  groundContactTolerance: 0.02,
  minimumGroundNormalY: 0.7,
  maximumGroundedUpwardVelocity: 0.1,
});
