# EV3 Line Lab
A browser robotics workspace for SITE 1101. Eight track presets, 3D EV3-inspired robot with a Canvas 2D fallback, actual Microsoft MakeCode compiler and runtime, source editor, UF2 source import, automatic and manual calibration.

## Run
Node 22+: `npm ci --ignore-scripts`, `npm run prepare-assets`, `npm run dev`.
`npm test` checks the differential-drive model, compiles both programs with the official compiler and verifies compressed UF2 source extraction. `npm run build` creates a self-contained static distribution. GitHub Actions deploys it to Pages when Pages source is set to GitHub Actions.

## Operation
Automatic mode replays UP / DOWN / ENTER on programs using this calibration protocol. Other programs start directly at the right edge. Manual mode loads the program and lets you place the sensor and press the brick buttons. Shift-click places the axle; Q/E rotate. Stop terminates the simulated program. LEFT is delivered to the program's button handler.

## Limits
Educational kinematic model, not a hardware-certified digital twin. Geometry, reflectance, noise and wheel slip are configurable; motor dynamics use the PXT EV3 simulator. Gyro angle derives from simulated rate. No rigid-body collision engine. The photographed laboratory track is approximate. Baku sprint is an original inspired layout, not a surveyed copy. Arbitrary intersections cannot be resolved by a single reflectance sensor without route policy.
UF2 import recovers embedded MakeCode source and recompiles it, rather than emulating native ARM machine code. Source-less UF2, non-EV3 targets, additional extensions and multi-file projects are rejected or unsupported. Programs run main.ts with the standard EV3 libraries. Runs stop when the browser tab is hidden to avoid background timer throttling. Code is stored locally in the browser; there is no code-upload server.

## Credits
Microsoft pxt-ev3 1.4.41 and pxt-core (MIT); TypeScript (Apache-2.0); LZMA-JS (MIT); Three.js (MIT). Vendor assets are copied from pinned npm packages during build. This is an independent educational project, not affiliated with LEGO or Microsoft. LEGO and MINDSTORMS are trademarks of the LEGO Group.
