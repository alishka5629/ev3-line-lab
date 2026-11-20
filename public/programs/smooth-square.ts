// SITE 1101 - Project 3: Smooth line follower (LEGO EV3, MakeCode JavaScript)
//
// Idea: the colour sensor follows the RIGHT edge of a dark line.
// On the edge the sensor sees about 50% light, so:
//   error > 0 (too bright, drifting onto the floor) -> steer LEFT, toward the line
//   error < 0 (too dark, drifting onto the line)    -> steer RIGHT, toward the floor
// A PD controller turns the error into steering. The robot slows down in curves
// and speeds up on straights, which keeps the motion smooth on complex paths.
//
// Wiring (change if your robot differs): left motor B, right motor C,
// colour sensor on port 3, gyro on port 2. Press LEFT to stop.

// Percent motor commands. Use the lab-tested speed of 18 as a fallback.
const BASE_SPEED = 21
const MIN_SPEED = 12
const KP = 0.14           // Motor % per point of normalized light error
const KD = 0.006          // Motor % per point/second; the rate is filtered
const MAX_TURN = 12       // Ordinary tracking
const CORNER_TURN = 19    // Available only after a sustained large error
const PERIOD_MS = 15
const LOST_MS = 410
const SEARCH_SPEED = 12
const SEARCH_DEG = 115

let colorSensor = sensors.color3
let gyro = sensors.gyro2
let dark = 0             // sensor reading on the line (set by calibration)
let bright = 100         // sensor reading on the floor (set by calibration)

function clamp(x: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, x))
}

// Reflected light scaled so that line = 0 and floor = 100.
function readLight(): number {
    let raw = colorSensor.light(LightIntensityMode.Reflected)
    return clamp(100 * (raw - dark) / (bright - dark), 0, 100)
}

// Average of 10 raw readings (less noise during calibration).
function measure(): number {
    let sum = 0
    for (let i = 0; i < 10; i++) {
        sum += colorSensor.light(LightIntensityMode.Reflected)
        pause(10)
    }
    return sum / 10
}

// Show a message and wait until the ENTER button is pressed and released.
function waitEnter(message: string) {
    brick.clearScreen()
    brick.showString(message, 1)
    brick.showString("Press ENTER", 3)
    while (!brick.buttonEnter.isPressed()) pause(20)
    while (brick.buttonEnter.isPressed()) pause(20)
    pause(300)
}

let stopRequested = false

function drive(left: number, right: number) {
    if (stopRequested) return
    motors.largeB.run(Math.round(left))
    if (!stopRequested) motors.largeC.run(Math.round(right))
    if (stopRequested) motors.stopAll()
}

function halt(message: string) {
    motors.stopAll()
    brick.clearScreen()
    brick.showString(message, 1)
}

// A left sweep should enter the black tape; a right sweep should leave it.
// Arm on the opposite colour first, so reversing a scan cannot immediately
// accept the same patch of floor. Each sweep has angle and time limits.
function sweep(dir: number, degrees: number): boolean {
    let startAngle = gyro.angle()
    let end = control.millis() + 1200 + degrees * 35
    let armed = false
    while (!stopRequested && !brick.buttonLeft.isPressed() && control.millis() < end
        && Math.abs(gyro.angle() - startAngle) < degrees) {
        let light = readLight()
        if ((dir > 0 && light >= 58) || (dir < 0 && light <= 42)) armed = true
        if (armed && ((dir > 0 && light <= 44) || (dir < 0 && light >= 56))) {
            motors.stopAll()
            return true
        }
        drive(-dir * SEARCH_SPEED, dir * SEARCH_SPEED)
        pause(10)
    }
    motors.stopAll()
    return false
}

function findLine(dir: number): boolean {
    brick.showString("Finding edge", 1)
    if (sweep(dir, SEARCH_DEG)) return true
    if (stopRequested || brick.buttonLeft.isPressed()) return false
    return sweep(-dir, SEARCH_DEG * 2)
}

function run() {
    motors.largeB.setBrake(true)
    motors.largeC.setBrake(true)

    // Calibration: repeat it on every new surface or lighting.
    waitEnter("Sensor on LINE")
    dark = measure()
    waitEnter("Sensor on FLOOR")
    bright = measure()
    if (bright - dark < 15) {
        halt("Low contrast")
        return
    }
    waitEnter("On EDGE, keep still")
    brick.buttonLeft.onEvent(ButtonEvent.Pressed, function () {
        stopRequested = true
        motors.stopAll()
    })
    gyro.calibrate()
    brick.clearScreen()
    brick.showString("Following line", 1)
    brick.showString("LEFT = stop", 3)

    let smooth = readLight() - 50
    let rate = 0
    let steering = 0
    let speed = 0
    let lastTick = control.millis() - PERIOD_MS
    let side = 0
    let sideSince = lastTick
    let stableMs = 0
    let recoveries = 0
    let lostSide = 0
    let lostSince = lastTick

    while (!stopRequested && !brick.buttonLeft.isPressed()) {
        let now = control.millis()
        let dt = clamp(now - lastTick, 1, 80)
        lastTick = now
        let raw = readLight() - 50
        let previous = smooth
        smooth += dt / (18 + dt) * (raw - smooth)
        rate += dt / (50 + dt) * ((smooth - previous) * 1000 / dt - rate)

        // A single noisy reading cannot enable the stronger corner steering.
        let newSide = smooth > 26 ? 1 : (smooth < -26 ? -1 : 0)
        if (newSide != side) {
            side = newSide
            sideSince = now
        }
        let corner = side == 0 ? 0 : clamp((now - sideSince - 100) / 100, 0, 1)
        let magnitude = Math.abs(smooth)
        let error = Math.max(0, magnitude - 2) * (smooth < 0 ? -1 : 1)
        let limit = MAX_TURN + (CORNER_TURN - MAX_TURN) * corner
        let wantedTurn = clamp((KP + 0.12 * corner) * error + clamp(KD * rate, -3, 3), -limit, limit)
        let step = (110 + 80 * corner) * dt / 1000
        steering += clamp(wantedTurn - steering, -step, step)

        let severity = clamp((magnitude - 6) / 34, 0, 1)
        let wantedSpeed = BASE_SPEED - (BASE_SPEED - MIN_SPEED) * severity
        speed = Math.min(wantedSpeed, speed + 30 * dt / 1000)
        let turn = clamp(steering, -speed - 7 * corner, speed + 7 * corner)
        drive(speed - turn, speed + turn)

        // Count time on one extreme only. Alternating colours reset the timer.
        let extreme = raw >= 45 ? 1 : (raw <= -45 ? -1 : 0)
        if (extreme != lostSide) {
            lostSide = extreme
            lostSince = now
        }
        stableMs = magnitude < 22 ? stableMs + dt : 0
        if (stableMs >= 450) recoveries = 0
        if (lostSide != 0 && now - lostSince >= LOST_MS) {
            motors.stopAll()
            recoveries += 1
            if (recoveries > 4 || !findLine(lostSide)) {
                halt((stopRequested || brick.buttonLeft.isPressed()) ? "Stopped" : "Edge not found")
                return
            }
            smooth = readLight() - 50
            rate = 0
            speed = 0
            steering = 0
            side = 0
            lostSide = 0
            lastTick = control.millis()
            brick.showString("Following line", 1)
        }
        pause(Math.max(1, PERIOD_MS - (control.millis() - now)))
    }
    halt("Stopped")
}

run()
