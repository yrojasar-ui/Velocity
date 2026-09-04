Velocity — Movement Specification
1. Purpose

This document defines the movement philosophy and engineering requirements for Velocity.

Movement is a core gameplay system and must be treated as a first-class feature.

Movement must never depend on visual tricks alone.

2. Design Goals

Movement should be:

responsive;
predictable;
skill-based;
configurable;
consistent;
readable;
frame-rate independent.

The player should feel immediate control while still experiencing momentum.

Velocity should not feel like:

ice skating;
instant teleport-like acceleration;
excessive camera animation;
uncontrolled bunny hopping.
3. Architecture

Movement must be separated into focused systems.

Recommended conceptual structure:

PlayerInput
    ↓
CharacterMotor
    ↓
MovementState
    ↓
Physics / Collision

Camera behavior must not be responsible for physical movement.

Weapon systems must not contain movement logic.

4. Configuration

Gameplay values must not be scattered as magic numbers.

Example:

interface MovementConfig {
    walkSpeed: number;
    sprintSpeed: number;

    groundAcceleration: number;
    groundDeceleration: number;
    groundFriction: number;

    airAcceleration: number;
    maxAirSpeed: number;

    jumpVelocity: number;
    gravity: number;

    crouchSpeedMultiplier: number;

    slideInitialBoost: number;
    slideFriction: number;
    minimumSlideSpeed: number;

    coyoteTimeMs: number;
    jumpBufferMs: number;
}

Exact values will be determined through gameplay testing.

5. Base Movement
WASD

Movement input must support normalized directional input.

Diagonal movement must not unintentionally produce higher maximum ground speed.

Ground Acceleration

The player should accelerate toward target velocity.

Avoid immediate velocity assignment unless intentionally required by design.

Conceptually:

current velocity
      ↓
desired direction
      ↓
acceleration
      ↓
target velocity
Ground Deceleration

Releasing input should reduce speed predictably.

The player must not:

stop unnaturally instantly;
continue sliding indefinitely.
6. Friction

Ground friction must be configurable.

Friction is responsible for maintaining a predictable relationship between:

player input;
momentum;
stopping distance.

Sliding should use separate friction values from standard ground movement.

7. Sprint

Sprint increases movement speed.

Initial design:

activated while moving forward or mostly forward;
canceled by incompatible states;
compatible with slide transition.

Sprint behavior must remain configurable.

8. Jump

Jump must:

apply consistent vertical velocity;
preserve reasonable horizontal momentum;
not depend on frame rate;
not allow accidental infinite jumping.

Jump should use explicit grounded state validation.

9. Coyote Time

Velocity should support a short coyote-time window.

Purpose:

Allow jumping immediately after leaving an edge.

Concept:

ground lost
↓
small grace period
↓
jump still accepted

This improves responsiveness without significantly lowering skill ceiling.

10. Jump Buffer

Jump input may be stored briefly before landing.

Purpose:

If the player presses jump slightly before touching the ground, the jump executes immediately after a valid landing.

This window must remain short and configurable.

11. Crouch

Crouch should:

reduce player collider height where technically safe;
reduce movement speed;
transition smoothly;
verify sufficient space before standing.

Standing must be rejected if geometry blocks the player.

12. Slide

Slide is activated from valid movement states.

Initial expected requirements:

player must have sufficient speed;
player enters crouched state;
momentum is preserved;
slide friction differs from normal movement;
speed gradually decreases.

Slide must not grant unlimited free acceleration.

13. Slide Jump

Jumping during a valid slide should preserve some horizontal momentum.

It should reward timing without becoming the only viable movement method.

Exact momentum retention must be playtested.

14. Air Movement

Air control is intentionally supported.

Air movement should allow:

controlled adjustment;
strafing;
momentum preservation.

Air control must not allow arbitrary instant direction changes.

15. Air Acceleration

Air acceleration should use dedicated parameters.

Ground acceleration values must not be reused automatically.

Required behavior:

forward momentum is generally preserved;
directional input can influence movement;
speed remains controllable;
results remain consistent across FPS.
16. Air Strafing

Air strafing should reward mouse direction and movement input coordination.

The system must be subtle enough that new players can move normally but deep enough for advanced players to optimize routes.

17. Mantle

Mantling allows the player to climb ledges.

Required validation:

valid obstacle;
valid height;
valid landing space;
no blocked destination;
state cannot be abused through walls.

Mantle should use predictable transitions.

18. Vault

Vaulting is intended for lower obstacles.

Vaulting should preserve movement flow.

It should not introduce long animation locks.

19. Slopes

The movement controller must define:

maximum walkable slope;
behavior on steep slopes;
slide behavior on slopes;
ground detection rules.

The player must not become randomly grounded on vertical surfaces.

20. Steps

Small height changes should not constantly stop player movement.

A configurable step-height system may be used.

The player must not automatically climb unrealistic obstacles.

21. Ground Detection

Ground detection is critical.

The implementation must avoid:

flickering grounded state;
double jumps caused by bad detection;
sticking to walls;
grounded state while falling.

Ground detection logic must remain testable and observable through debug tools.

22. Camera

Camera movement and physical movement are separate concerns.

Mouse look:

yaw;
pitch;
configurable sensitivity;
pitch clamping.

Mouse sensitivity must not depend on frame rate.

23. FOV

The player must eventually be able to configure FOV.

Possible temporary gameplay effects:

sprint FOV increase;
ADS FOV change.

These effects must remain subtle.

Gameplay FOV changes must not modify actual player movement velocity.

24. Input

Movement input must be centralized.

Gameplay systems should consume actions rather than directly querying random keyboard keys.

Conceptually:

InputDevice
↓
PlayerInput
↓
Gameplay Actions

Examples:

move
jump
sprint
crouch
fire
ads
reload

This facilitates future rebinding and controller support.

25. Frame Rate Independence

Movement must be tested at multiple frame rates.

Minimum test targets:

60 FPS
144 FPS
240 FPS

Player movement must not materially change because FPS changes.

26. Debug Telemetry

Movement Lab must expose:

FPS;
frame time;
velocity;
horizontal speed;
vertical speed;
grounded;
movement state;
current acceleration;
position.

Optional:

collision normals;
slope angle;
movement vectors.
27. Movement States

Possible initial states:

Grounded
Airborne
Sprint
Crouch
Slide
Mantle
Vault

State transitions must be explicit and predictable.

Avoid uncontrolled combinations of boolean flags such as:

isRunning
isSliding
isJumping
isCrouched
isMantling
isVaulting

if they allow invalid combinations.

A state machine or equivalent controlled state model should be preferred.

28. Initial Non-Goals

Not part of the initial movement milestone:

wall running;
grapple hooks;
double jump;
jetpacks;
climbing systems;
prone;
swimming.

These may be evaluated later.

29. Acceptance Criteria — M0

M0 WALK requires:

Pointer Lock works;
mouse look works;
WASD works;
ground acceleration works;
friction works;
gravity works;
jump works;
grounded state is stable;
debug telemetry works.
30. Acceptance Criteria — M1

M1 FLOW requires:

sprint;
crouch;
slide;
slide jump;
air acceleration;
air strafing;
jump buffering;
coyote time;
mantle;
vault.

The movement system must also pass:

60 FPS test
144 FPS test
240 FPS test

The primary gameplay acceptance criterion is:

Moving through the Movement Lab must already feel enjoyable without combat.
