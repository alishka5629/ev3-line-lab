// SITE 1101 - Team Project: Robotics
// LEGO Mindstorms EV3 | MakeCode JavaScript
// The robot follows one edge of the black line while drawing with a marker.

// Robot setup
// B and C drive the left and right wheels. A moves the marker.
// The light sensor is on port 3. The gyro is on port 2.
const wheels = motors.largeBC
const penMotor = motors.mediumA
const lightSensor = sensors.color3
const turnSensor = sensors.gyro2

// Speed and steering settings
// The curve gain adds a stronger turn when the error is large.
// The change gain helps reduce wobble.
const CRUISE_SPEED = 16
const EDGE_GAIN = 0.35
const CURVE_GAIN = 0.015
const CHANGE_GAIN = 1.2
const TURN_LIMIT = 30
// Ignore tiny errors near the edge.
const EDGE_TOLERANCE = 3
// Keep part of the last reading to smooth out jumps.
const OLD_READING_WEIGHT = 0.4
// Start looking for the line after seeing the floor for this long.
const LOST_DELAY_MS = 350
const SWEEP_ANGLE = 110
const SWEEP_SPEED = 15
// Set this to false to run without the marker.
const PEN_ENABLED = true
const PEN_MOVE_MS = 600
const PEN_SPEED = 20

let floorLight = 0
let tapeLight = 0
let edgeLight = 0
let edgeDirection = 1
let penIsLowered = false

// Reading the tape and floor
function reflectedLight(): number {
    return lightSensor.light(LightIntensityMode.Reflected)
}

// Average several readings during calibration.
function sampleLight(sampleCount: number): number {
    let totalLight = 0
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
        totalLight += reflectedLight()
        pause(20)
    }
    return Math.round(totalLight / sampleCount)
}

// Check whether the reading is close to the tape value.
function isOverTape(): boolean {
    return reflectedLight() < edgeLight - (edgeLight - tapeLight) * 0.3
}

// Check whether the reading is close to the floor value.
function isOverFloor(): boolean {
    return reflectedLight() > floorLight - (floorLight - edgeLight) * 0.3
}

// Calibrate and start
function calibrateSensors() {
    brick.clearScreen()
    brick.showString("Calibrating gyro", 1)
    brick.showString("Do not move robot", 2)
    // Keep the robot still while the gyro calibrates.
    turnSensor.calibrate()
    turnSensor.reset()

    brick.clearScreen()
    brick.showString("Put sensor on", 1)
    brick.showString("WHITE floor", 2)
    brick.showString("press ENTER", 3)
    brick.buttonEnter.pauseUntil(ButtonEvent.Bumped)
    floorLight = sampleLight(10)
    pause(100)

    brick.clearScreen()
    brick.showString("Put sensor on", 1)
    brick.showString("BLACK line", 2)
    brick.showString("press ENTER", 3)
    brick.buttonEnter.pauseUntil(ButtonEvent.Bumped)
    tapeLight = sampleLight(10)
    pause(100)

    // The target is halfway between the floor and tape readings.
    edgeLight = Math.round((floorLight + tapeLight) / 2)

    brick.clearScreen()
    brick.showValue("white", floorLight, 1)
    brick.showValue("black", tapeLight, 2)
    brick.showValue("target", edgeLight, 3)

    // Warn if the readings are too close.
    if (floorLight - tapeLight < 15) {
        brick.showString("LOW CONTRAST!", 4)
        brick.showString("Recalibrate", 5)
        pause(400)
    }
}

// Use LEFT or RIGHT to pick an edge. Press ENTER to start.
function waitForStart() {
    brick.showString("LEFT/RIGHT = edge", 6)
    brick.showString("ENTER = start", 7)
    brick.showString("Edge: LEFT ", 8)
    while (!brick.buttonEnter.wasPressed()) {
        if (brick.buttonLeft.wasPressed()) {
            edgeDirection = 1
            brick.showString("Edge: LEFT ", 8)
        }
        if (brick.buttonRight.wasPressed()) {
            edgeDirection = -1
            brick.showString("Edge: RIGHT", 8)
        }
        pause(20)
    }
    brick.clearScreen()
    brick.showString("Running...", 1)
    brick.showString("DOWN = stop", 2)
}

// Marker control
// Run the marker motor for a short time, then stop it.
function movePen(motorSpeed: number) {
    penMotor.setBrake(true)
    penMotor.run(motorSpeed)
    pause(PEN_MOVE_MS)
    penMotor.stop()
}

function lowerPen() {
    if (PEN_ENABLED && !penIsLowered) {
        brick.showString("Marker down...", 3)
        movePen(PEN_SPEED)
        penIsLowered = true
    }
}

function raisePen() {
    if (PEN_ENABLED && penIsLowered) {
        movePen(-PEN_SPEED)
        penIsLowered = false
    }
}

// Recovering the line
function brakeWheels() {
    wheels.setBrake(true)
    wheels.stop()
}

// Turn in place until the sensor sees tape or the gyro reaches the angle.
function scanForTape(angleLimit: number): boolean {
    const initialAngle = turnSensor.angle()
    const spinDirection = angleLimit > 0 ? 1 : -1
    wheels.tank(SWEEP_SPEED * spinDirection, -SWEEP_SPEED * spinDirection)
    while (Math.abs(turnSensor.angle() - initialAngle) < Math.abs(angleLimit)) {
        if (isOverTape()) {
            brakeWheels()
            return true
        }
        pause(5)
    }
    brakeWheels()
    return false
}

function recoverLine(): boolean {
    brakeWheels()
    brick.setStatusLight(StatusLight.Orange)
    brick.showString("Searching...", 5)

    // Look toward the tape first.
    const firstDirection = edgeDirection

    if (scanForTape(firstDirection * SWEEP_ANGLE)) return true
    // Sweep past the starting direction to check the other side.
    if (scanForTape(-firstDirection * SWEEP_ANGLE * 2)) return true
    // Turn back toward the starting direction.
    scanForTape(firstDirection * SWEEP_ANGLE)
    return false
}

// Following the edge
function trackEdge() {
    let previousError = 0
    let filteredLight = edgeLight
    // A value of -1 means the floor timer is off.
    let floorSince = -1
    turnSensor.reset()
    brick.setStatusLight(StatusLight.Green)
    brick.showString("Following line", 3)

    while (true) {
        // Press DOWN to stop while following the line.
        if (brick.buttonDown.isPressed()) {
            break
        }

        const currentLight = reflectedLight()

        // Keep track of how long the sensor sees only the floor.
        if (isOverFloor()) {
            if (floorSince < 0) floorSince = control.millis()
            if (control.millis() - floorSince > LOST_DELAY_MS) {
                if (recoverLine()) {
                    // Clear the old steering values after finding the line.
                    brick.setStatusLight(StatusLight.Green)
                    brick.showString("            ", 5)
                    previousError = 0
                    filteredLight = reflectedLight()
                    floorSince = -1
                    continue
                } else {
                    break
                }
            }
        } else {
            floorSince = -1
        }

        // Mix the latest reading with the previous filtered reading.
        filteredLight = filteredLight * OLD_READING_WEIGHT + currentLight * (1 - OLD_READING_WEIGHT)

        // Compare the filtered reading with the edge target.
        let edgeError = filteredLight - edgeLight
        if (Math.abs(edgeError) < EDGE_TOLERANCE) edgeError = 0
        // Use the change in error to help smooth the turn.
        const errorChange = edgeError - previousError
        let steering = EDGE_GAIN * edgeError + CURVE_GAIN * edgeError * Math.abs(edgeError) + CHANGE_GAIN * errorChange
        steering = Math.constrain(steering, -TURN_LIMIT, TURN_LIMIT) * edgeDirection
        previousError = edgeError

        // Slow down for sharper turns and give the wheels different speeds.
        const motorSpeed = CRUISE_SPEED - Math.abs(steering) * 0.3

        wheels.tank(motorSpeed + steering, motorSpeed - steering)

        pause(10)
    }
}

// Start the run
brick.setStatusLight(StatusLight.Orange)
raisePen()
calibrateSensors()
waitForStart()

// Give the user time to move their hands away.
pause(500)
lowerPen()
trackEdge()

// Stop and lift the marker.
brakeWheels()
raisePen()
brick.setStatusLight(StatusLight.Red)
brick.clearScreen()
brick.showString("Finished!", 1)
pause(600)
