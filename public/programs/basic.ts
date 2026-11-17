// SITE 1101 Project 3 - Microsoft MakeCode for LEGO EV3.
// Paste this WHOLE file into the JavaScript tab of a separate project.
// B = left wheel, C = right wheel, color sensor = port 3.
// Follow a DARK line on a LIGHT background. Start on ONE EDGE.
// UP: sample black. DOWN: sample background. ENTER: start. LEFT: stop.
// Starting gains are examples, not a hardware-tested universal solution.

const LEFT_SIGN = 1       // Change to -1 if B drives backwards.
const RIGHT_SIGN = 1      // Change to -1 if C drives backwards.
const EDGE_SIGN = 1       // +1: RIGHT edge (black on left); -1: LEFT edge.
const PERIOD_MS = 10      // Requested loop period; actual dt is measured.
const MIN_CONTRAST = 12   // Difference between sampled white and black.
const TARGET = 50         // Normalized reflectance at the selected edge.

let black = 0
let white = 100
let haveBlack = false
let haveWhite = false
let running = false
let cancelled = false
let lastTime = 0
let lastScreen = 0

function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x))
}

function rawLight(): number {
    // Keep the sensor in reflected-light mode throughout the run.
    return sensors.color3.light(LightIntensityMode.Reflected)
}

function lightValue(): number {
    return clamp(100 * (rawLight() - black) / (white - black), 0, 100)
}

function brakeMotors() {
    // stopAll first removes power from both wheels; individual stops apply brakes.
    motors.stopAll()
    motors.largeB.stop()
    motors.largeC.stop()
}

function stopRobot(message: string) {
    running = false
    brakeMotors()
    brick.clearScreen()
    brick.showString(message, 1)
    brick.showString("UP black / DOWN white", 3)
    brick.showString("ENTER run / LEFT stop", 4)
    brick.showValue("Black", black, 5)
    brick.showValue("White", white, 6)
}

function drive(left: number, right: number) {
    if (!running || cancelled) {
        brakeMotors()
        return
    }
    motors.largeB.run(Math.round(clamp(left, -80, 80)) * LEFT_SIGN)
    // Motor calls can yield. Recheck after EACH call so LEFT stays latched.
    if (!running || cancelled) {
        brakeMotors()
        return
    }
    motors.largeC.run(Math.round(clamp(right, -80, 80)) * RIGHT_SIGN)
    if (!running || cancelled) brakeMotors()
}

function waitForRelease() {
    while (brick.buttonUp.isPressed() || brick.buttonDown.isPressed()
        || brick.buttonEnter.isPressed()) pause(20)
    pause(150) // Let the sensor settle after pressing a button.
}

function sampleSurface(): number {
    rawLight() // Select mode before averaging.
    pause(150)
    let total = 0
    for (let i = 0; i < 20; i++) {
        total += rawLight()
        pause(10)
    }
    return total / 20
}

function idleControls() {
    if (brick.buttonLeft.isPressed()) return
    if (brick.buttonUp.isPressed()) {
        waitForRelease()
        black = sampleSurface()
        haveBlack = true
        stopRobot("BLACK saved")
    } else if (brick.buttonDown.isPressed()) {
        waitForRelease()
        white = sampleSurface()
        haveWhite = true
        stopRobot("WHITE saved")
    } else if (brick.buttonEnter.isPressed()) {
        // Clear cancellation BEFORE waiting; a later LEFT press cancels start.
        cancelled = false
        waitForRelease()
        if (cancelled || brick.buttonLeft.isPressed()) return
        if (!haveBlack || !haveWhite || white - black < MIN_CONTRAST) {
            stopRobot("CALIBRATE black+white")
            return
        }
        if (lightValue() < 25 || lightValue() > 75) {
            stopRobot("PLACE sensor ON EDGE")
            return
        }
        startRun()
    }
    if (!running && control.millis() - lastScreen > 200) {
        brick.showValue("Live", rawLight(), 7)
        lastScreen = control.millis()
    }
}

brick.buttonLeft.onEvent(ButtonEvent.Pressed, function () {
    cancelled = true
    stopRobot("STOPPED")
})

motors.largeB.setBrake(true)
motors.largeC.setBrake(true)
motors.largeB.setBrakeSettleTime(0)
motors.largeC.setBrakeSettleTime(0)
motors.largeB.setRegulated(true)
motors.largeC.setRegulated(true)
brakeMotors()

// BASIC: a slow proportional edge follower with in-place corner correction.
// A square and a heart can have difficult corners: start slowly and tune KP.
const BASE_SPEED = 18
const KP = 0.65
const MAX_TURN = 34
const LOST_LIMIT_MS = 1800

let extremeMs = 0
let extremeSide = 0

function startRun() {
    if (cancelled) return
    extremeMs = 0
    extremeSide = 0
    lastTime = control.millis()
    running = true
    brick.clearScreen()
    brick.showString("BASIC RUN / LEFT stop", 1)
}

function followStep(dt: number) {
    let value = lightValue()
    let error = value - TARGET
    let turn = clamp(EDGE_SIGN * KP * error, -MAX_TURN, MAX_TURN)

    // Slow down as the error grows; pivot if the sensor is fully off the edge.
    let speed = BASE_SPEED * clamp(1 - Math.abs(error) / 45, 0, 1)
    let side = 0
    if (value < 8) side = -1
    if (value > 92) side = 1
    if (side != 0 && side == extremeSide) extremeMs += dt
    else extremeMs = 0
    extremeSide = side
    if (extremeMs > LOST_LIMIT_MS) {
        stopRobot("EDGE LOST: reposition")
        return
    }
    // Positive turn means LEFT: left wheel slower, right wheel faster.
    // Negative inner-wheel speed is intentional on a sharp corner.
    drive(speed - turn, speed + turn)
}

stopRobot("BASIC: calibrate first")
forever(function () {
    let began = control.millis()
    if (!running) idleControls()
    else {
        let dt = began - lastTime
        lastTime = began
        if (dt > 250) stopRobot("CONTROL DELAY: restart")
        else followStep(Math.max(1, dt))
    }
    pause(Math.max(1, PERIOD_MS - (control.millis() - began)))
})
