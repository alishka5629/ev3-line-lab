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

// ADVANCED: filtered PD, adaptive speed, gyro-bounded recovery and stall checks.
// Port 2: gyro. A single color sensor cannot resolve arbitrary junctions.
const USE_GYRO = true
const GYRO_SIGN = -1       // Correct setting makes physical LEFT turn positive.
const WHEEL_DIAMETER_MM = 56
const TRACK_WIDTH_MM = 120 // Distance between the centres of the two tyres.
// Encoder heading assumes direct drive (no extra wheel gearing).

const KP = 0.75            // Motor percent per normalized reflectance unit.
const KD = 0.025           // Uses error change PER SECOND, not per iteration.
const LIGHT_TAU_MS = 12
const DERIVATIVE_TAU_MS = 40
const MAX_SPEED = 28
const CORNER_SPEED = 10
const MAX_TURN = 42
const ACCEL_PER_SEC = 35   // Slow acceleration; braking can be immediate.
const EXTREME_LIMIT_MS = 420

const SEARCH_SPEED = 16
const SEARCH_LEG_MS = 5000
const SEARCH_TOTAL_MS = 22000
const ALIGN_LIMIT_DEG = 65
const ALIGN_LIMIT_MS = 2200
const BACKUP_MM = 15       // One short backup after the first scan fails.
const BACKUP_SPEED = 12
const BACKUP_LIMIT_MS = 1200
const MAX_RECOVERIES = 3   // Reset after 2 s of stable edge tracking.

// States: 0 follow, 1 angular search, 2 align to edge, 3 short backup.
let state = 0
let filtered = 50
let previousError = 0
let derivative = 0
let baseSpeed = 0
let extremeMs = 0
let extremeSide = 0
let stableMs = 0
let recoveryCount = 0
let recoveryStarted = 0
let searchOrigin = 0
let searchDirection = 1
let searchIndex = 0
let searchPass = 0
let searchTarget = 0
let legStarted = 0
let turnDirection = 0
let turnEncoderStart = 0
let turnGyroStart = 0
let darkMs = 0
let alignOrigin = 0
let backupLeft = 0
let backupRight = 0
let lastLeftCommand = 0
let lastRightCommand = 0
let watchLeft = 0
let watchRight = 0
let leftStallMs = 0
let rightStallMs = 0
let scans = [45, 105, -105, 0]

function encoderLeft(): number {
    return LEFT_SIGN * motors.largeB.angle()
}

function encoderRight(): number {
    return RIGHT_SIGN * motors.largeC.angle()
}

function encoderHeading(): number {
    return (encoderRight() - encoderLeft()) * WHEEL_DIAMETER_MM
        / (2 * TRACK_WIDTH_MM)
}

function heading(): number {
    if (USE_GYRO) return GYRO_SIGN * sensors.gyro2.angle()
    return encoderHeading()
}

function command(left: number, right: number) {
    lastLeftCommand = left
    lastRightCommand = right
    drive(left, right)
}

function resetWatchdog() {
    watchLeft = encoderLeft()
    watchRight = encoderRight()
    leftStallMs = 0
    rightStallMs = 0
    lastLeftCommand = 0
    lastRightCommand = 0
}

function checkStall(dt: number) {
    let left = encoderLeft()
    let right = encoderRight()
    // Track each wheel separately; a spinning free wheel must not hide a jam.
    if (Math.abs(lastLeftCommand) < 12 || Math.abs(left - watchLeft) >= 2) {
        watchLeft = left
        leftStallMs = 0
    } else leftStallMs += dt
    if (Math.abs(lastRightCommand) < 12 || Math.abs(right - watchRight) >= 2) {
        watchRight = right
        rightStallMs = 0
    } else rightStallMs += dt
    if (leftStallMs > 850 || rightStallMs > 850) stopRobot("MOTOR STALL / cables?")
}

function resetController() {
    filtered = lightValue()
    previousError = filtered - TARGET
    derivative = 0
    baseSpeed = 0
    extremeMs = 0
    extremeSide = 0
    stableMs = 0
}

function startRun() {
    if (USE_GYRO) {
        brick.clearScreen()
        brick.showString("GYRO: keep robot STILL", 1)
        // This routine may take several seconds. Motors remain stopped.
        sensors.gyro2.calibrate()
    }
    if (cancelled || brick.buttonLeft.isPressed()) return
    if (lightValue() < 25 || lightValue() > 75) {
        stopRobot("PLACE sensor ON EDGE")
        return
    }
    resetController()
    resetWatchdog()
    recoveryCount = 0
    state = 0
    lastTime = control.millis()
    running = true
    brick.clearScreen()
    brick.showString("ADVANCED / LEFT stop", 1)
    brick.showString("FOLLOW", 3)
}

function beginTurn(direction: number) {
    turnDirection = direction
    turnEncoderStart = encoderHeading()
    turnGyroStart = heading()
    legStarted = control.millis()
    darkMs = 0
}

function turnCheck(): boolean {
    // Detect wrong gyro orientation or a frozen/disconnected gyro during turns.
    if (USE_GYRO) {
        let enc = encoderHeading() - turnEncoderStart
        let gy = heading() - turnGyroStart
        if (Math.abs(enc) > 12 && gy * turnDirection < -5) {
            stopRobot("CHECK GYRO_SIGN")
            return false
        }
        if (Math.abs(enc) > 35 && Math.abs(gy) < 2) {
            stopRobot("GYRO NOT CHANGING")
            return false
        }
    }
    return running && !cancelled
}

function nextScanLeg() {
    searchTarget = searchOrigin + searchDirection * scans[searchIndex]
    let direction = 1
    if (searchTarget < heading()) direction = -1
    beginTurn(direction)
}

function beginRecovery(error: number) {
    command(0, 0)
    if (!running || cancelled) return
    recoveryCount += 1
    if (recoveryCount > MAX_RECOVERIES) {
        stopRobot("REPEATED LOSS: tune")
        return
    }
    state = 1
    searchDirection = EDGE_SIGN
    if (error < 0) searchDirection = -EDGE_SIGN
    searchOrigin = heading()
    searchIndex = 0
    searchPass = 0
    recoveryStarted = control.millis()
    nextScanLeg()
    brick.showString("SEARCH              ", 3)
}

function followStep(dt: number, raw: number) {
    // Time-based filtering and derivative avoid dependence on loop frequency.
    filtered += dt / (LIGHT_TAU_MS + dt) * (raw - filtered)
    let error = filtered - TARGET
    let slope = (error - previousError) * 1000 / dt
    derivative += dt / (DERIVATIVE_TAU_MS + dt) * (slope - derivative)
    previousError = error
    let turn = clamp(EDGE_SIGN * (KP * error + KD * derivative), -MAX_TURN, MAX_TURN)

    let side = 0
    if (raw < 8) side = -1
    if (raw > 92) side = 1
    if (side != 0 && side == extremeSide) extremeMs += dt
    else extremeMs = 0
    extremeSide = side
    if (extremeMs >= EXTREME_LIMIT_MS) {
        beginRecovery(error)
        return
    }

    if (Math.abs(error) < 20) stableMs += dt
    else stableMs = 0
    if (stableMs > 2000) recoveryCount = 0

    let severity = clamp(Math.max(Math.abs(error) / 40,
        Math.abs(turn) / MAX_TURN), 0, 1)
    let wanted = MAX_SPEED - (MAX_SPEED - CORNER_SPEED) * severity
    if (Math.abs(error) > 43) wanted = 0 // Pivot instead of running off course.
    if (wanted < baseSpeed) baseSpeed = wanted
    else baseSpeed = Math.min(wanted, baseSpeed + ACCEL_PER_SEC * dt / 1000)
    command(baseSpeed - turn, baseSpeed + turn)
}

function recoveryStep(dt: number, raw: number) {
    let now = control.millis()
    if (now - recoveryStarted > SEARCH_TOTAL_MS) {
        stopRobot("LINE NOT FOUND")
        return
    }

    if (state == 3) {
        // Both wheels must move back the requested distance; timeout is bounded.
        let leftMM = (backupLeft - encoderLeft()) * Math.PI * WHEEL_DIAMETER_MM / 360
        let rightMM = (backupRight - encoderRight()) * Math.PI * WHEEL_DIAMETER_MM / 360
        if (Math.min(leftMM, rightMM) >= BACKUP_MM) {
            command(0, 0)
            if (!running || cancelled) return
            state = 1
            searchOrigin = heading()
            searchIndex = 0
            nextScanLeg()
        } else if (now - legStarted > BACKUP_LIMIT_MS) stopRobot("BACKUP TIMEOUT")
        else command(-BACKUP_SPEED, -BACKUP_SPEED)
        return
    }

    if (!turnCheck()) return
    if (state == 2) {
        // Once black was found, leave it towards the chosen edge.
        // RIGHT edge => turn right until reflectance crosses the target.
        if (raw >= TARGET) {
            command(0, 0)
            if (!running || cancelled) return
            state = 0
            resetController() // No stale derivative kick after a search.
            brick.showString("FOLLOW              ", 3)
        } else if (Math.abs(heading() - alignOrigin) > ALIGN_LIMIT_DEG
            || now - legStarted > ALIGN_LIMIT_MS) stopRobot("EDGE ALIGN TIMEOUT")
        else command(EDGE_SIGN * SEARCH_SPEED, -EDGE_SIGN * SEARCH_SPEED)
        return
    }

    if (raw <= 30) darkMs += dt
    else darkMs = 0
    if (darkMs >= 25) {
        command(0, 0)
        if (!running || cancelled) return
        state = 2
        alignOrigin = heading()
        beginTurn(-EDGE_SIGN)
        brick.showString("ALIGN EDGE          ", 3)
        return
    }

    if ((searchTarget - heading()) * turnDirection <= 2) {
        command(0, 0)
        if (!running || cancelled) return
        searchIndex += 1
        if (searchIndex < scans.length) nextScanLeg()
        else if (searchPass == 0) {
            searchPass = 1
            state = 3
            backupLeft = encoderLeft()
            backupRight = encoderRight()
            legStarted = now
            brick.showString("BACKUP              ", 3)
        } else stopRobot("LINE NOT FOUND")
    } else if (now - legStarted > SEARCH_LEG_MS) stopRobot("TURN TIMEOUT / gyro?")
    else command(-turnDirection * SEARCH_SPEED, turnDirection * SEARCH_SPEED)
}

stopRobot("ADVANCED: calibrate")
forever(function () {
    let began = control.millis()
    if (!running) idleControls()
    else {
        let dt = began - lastTime
        lastTime = began
        if (dt > 250) stopRobot("CONTROL DELAY: restart")
        else {
            dt = Math.max(1, dt)
            checkStall(dt)
            if (running) {
                let raw = lightValue()
                if (state == 0) followStep(dt, raw)
                else recoveryStep(dt, raw)
            }
        }
    }
    pause(Math.max(1, PERIOD_MS - (control.millis() - began)))
})
