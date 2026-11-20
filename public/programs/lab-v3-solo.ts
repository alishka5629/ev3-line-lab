// SITE 1101, Group 16. Mapped long route, starting at the upper horizontal end.
// Default route after the pad: ignore the short spur and finish at the upper-right end.
// Left wheel B, right wheel C, reflected-light sensor 3, gyro 2. Black on the left.
// Lengths below are units from the top-down plan. The first straight sets their scale.
const WHEEL_MM = 56
const SENSOR_AHEAD_MM = 45   // axle centre to the light spot, parallel to travel
// Optional physical measurements in mm. Zero uses the scaled course drawing.
const PAD_LENGTH_MM = 0
const EXIT_SHIFT_MM = 0  // positive is right; zero uses the mapped shift
const EXIT_TO_CORNER_MM = 0
const PRACTICE_START_MM = 120
let practice = false
const BASE_SPEED = 21
const MIN_SPEED = 12
const KP = 0.14
const KD = 0.006
const PERIOD = 15

// One entry per leg. Index 0 starts at the marked start; 10 is the black pad.
// Bearings are relative to the start and clockwise-positive. The first vertical
// straight refines the measured heading for the rest of the route.
const lengths = [226,140,145,116,66,88,163,86,120,86,78,29,74,265]
const bearings = [0,-90,-132,-90,0,-90,180,-90,180,90,90,90,180,90]
const names = ["Start straight","Upper spur","Diagonal","Past junction","Short left","Outer side","Lower T","Down to base","Bottom straight","Pad approach","Black pad","Pad exit","Right link","Finish lane"]

let black = 0
let white = 100
let stopped = false
let reason = ""
let origin = 0
let gyroSign = 1
let verticalTrim = 0
let scaleMM = 1.8
let leg = 0

function clip(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }
function angleDiff(v: number): number {
    while (v > 180) v -= 360
    while (v < -180) v += 360
    return v
}
function yaw(): number { return gyroSign * (sensors.gyro2.angle() - origin) }
function axle(): number {
    return (motors.largeB.angle() + motors.largeC.angle()) * Math.PI * WHEEL_MM / 720
}
function raw(): number { return sensors.color3.light(LightIntensityMode.Reflected) }
function light(): number { return clip((raw() - black) * 100 / (white - black), 0, 100) }
function active(): boolean { return !stopped && !brick.buttonLeft.isPressed() }
// Local encoder/gyro coordinates, in mm along and to the right of the pad.
let tracking = false
let axis = 0
let forwardMM = 0
let rightMM = 0
let previousAxle = 0
let previousYaw = 0
function updatePose() {
    if (!tracking) return
    let position = axle()
    let heading = yaw()
    let mid = (previousYaw + angleDiff(heading - previousYaw) / 2 - axis) * Math.PI / 180
    forwardMM += (position - previousAxle) * Math.cos(mid)
    rightMM += (position - previousAxle) * Math.sin(mid)
    previousAxle = position
    previousYaw = heading
}
function tipForward(): number {
    updatePose()
    return forwardMM + SENSOR_AHEAD_MM * Math.cos((yaw() - axis) * Math.PI / 180)
}
function drive(l: number, r: number) {
    updatePose()
    if (active()) motors.largeB.run(Math.round(l))
    if (active()) motors.largeC.run(Math.round(r))
    if (!active()) motors.stopAll()
}
function fail(msg: string): boolean {
    motors.stopAll()
    reason = msg
    return false
}
function enter(msg: string) {
    brick.clearScreen()
    brick.showString(msg, 1)
    brick.showString("Press ENTER", 3)
    if (msg == "Sensor on LINE") {
        brick.showString("UP+ENTER: practice", 5)
    }
    while (active() && !brick.buttonEnter.isPressed()) pause(20)
    if (msg == "Sensor on LINE" && active()) {
        practice = brick.buttonUp.isPressed()
    }
    while (active() && brick.buttonEnter.isPressed()) pause(20)
    pause(250)
}
function sample(): number {
    let sum = 0
    for (let i = 0; i < 10; i++) { sum += raw(); pause(10) }
    return sum / 10
}
function bearing(i: number): number {
    let b = bearings[i]
    if (b == -90 || b == 90) b += verticalTrim
    if (i == 2) b += verticalTrim / 2
    return b - (practice ? 90 : 0)
}
function aim(target: number): boolean {
    let end = control.millis() + 6500
    while (active() && control.millis() < end) {
        let e = angleDiff(target - yaw())
        if (Math.abs(e) <= 2) { motors.stopAll(); return true }
        let power = clip(Math.abs(e) * 0.58, 7, 26) * (e > 0 ? 1 : -1)
        drive(power, -power)
        pause(10)
    }
    return fail("Gyro turn timeout")
}
function hold(course: number, speed: number) {
    let turn = clip(angleDiff(course - yaw()) * 0.8, -9, 9)
    drive(speed + turn, speed - turn)
}
function advance(mm: number, course: number): boolean {
    let start = axle()
    let end = control.millis() + 1400 + Math.abs(mm) * 65
    let sign = mm < 0 ? -1 : 1
    while (active() && control.millis() < end) {
        if ((axle() - start) * sign >= Math.abs(mm)) { motors.stopAll(); return true }
        hold(course, sign * MIN_SPEED)
        pause(10)
    }
    return fail("Wheel timeout")
}
// Scan clockwise across the expected outgoing tape: black -> white is its right
// edge. Ignore branches outside this sector; PD takes over at mid-light.
function scan(course: number, half: number): boolean {
    if (!aim(course - half)) return false
    pause(70)
    let darkSeen = false
    let best = 1000
    let end = control.millis() + 6800
    while (active() && control.millis() < end && angleDiff(yaw() - course) < half) {
        let v = light()
        if (v < 32) darkSeen = true
        if (darkSeen && v >= 48) {
            let offset = angleDiff(yaw() - course)
            if (Math.abs(offset) < Math.abs(best)) best = offset
            if (Math.abs(offset) <= 14) { motors.stopAll(); pause(55); return true }
            darkSeen = false
        }
        if (best != 1000 && angleDiff(yaw() - course) > Math.abs(best)) break
        let scanSpeed = darkSeen ? 8 : 14
        drive(scanSpeed, -scanSpeed)
        pause(10)
    }
    motors.stopAll()
    if (best != 1000 && active()) return aim(course + best)
    return false
}
function getEdge(course: number): boolean {
    if (scan(course, 22)) return true
    if (reason != "" || !active()) return false
    if (scan(course, 64)) return true
    return fail("No outgoing edge")
}
// A shifted exit can be beyond the arc of the forward sensor. Move the axle
// sideways in two bounded steps and test the outgoing heading at each position.
function getOutlet(): boolean {
    let course = bearing(11)
    if (scan(course, 32) && confirmOutlet()) return true
    if (!active() || reason != "") return false
    let lateral = course + 90
    for (let i = 0; i < 2; i++) {
        if (!active() || reason != "" || !aim(lateral)) return false
        if (!advance(i == 0 ? 36 : -65, lateral)) return false
        if (scan(course, 60) && confirmOutlet()) return true
    }
    return fail("Pad exit missing")
}
function checkGyro(): boolean {
    origin = sensors.gyro2.angle()
    let end = control.millis() + 1700
    while (active() && control.millis() < end && Math.abs(sensors.gyro2.angle() - origin) < 8) {
        drive(10, -10)
        pause(10)
    }
    motors.stopAll()
    let delta = sensors.gyro2.angle() - origin
    if (Math.abs(delta) < 6) return fail("Check gyro port 2")
    gyroSign = delta < 0 ? -1 : 1
    return aim(0)
}

let entryYaw = 0
let legTravel = 0
// Extra distance already covered beyond the pad when its exit was reacquired.
let outletLead = 0
let padScale = 1.8
let farEdge = 0
let checkpoint = false
let checkpointF = 0
let checkpointR = 0
let checkpointYaw = 0
let retryCorner = false
function outletLength(): number {
    return EXIT_TO_CORNER_MM > 0 ? EXIT_TO_CORNER_MM : lengths[11] * padScale
}
function rememberEdge() {
    updatePose()
    checkpointF = forwardMM
    checkpointR = rightMM
    checkpointYaw = yaw()
    checkpoint = true
}
function confirmOutlet(): boolean {
    let start = axle()
    let length = clip(outletLength() - (tipForward() - farEdge) - 12, 6, 15)
    let lastEdge = -1
    let deadline = control.millis() + 1600
    while (active() && control.millis() < deadline) {
        let distance = axle() - start
        let v = light()
        if (v >= 12 && v <= 88) lastEdge = distance
        if (distance >= length) {
            motors.stopAll()
            if (lastEdge < length * 0.45) {
                // A sharp acquisition angle can carry the sensor across the
                // narrow tape during the probe. Rescan from the new position.
                if (!scan(axis, 38) && (reason != "" || !active() || !scan(axis, 64))) return false
            }
            rememberEdge()
            return true
        }
        let steer = clip((v - 50) * 0.17, -8, 8)
        drive(MIN_SPEED - steer, MIN_SPEED + steer)
        pause(10)
    }
    return fail("Outlet probe timeout")
}
// Return the axle to the saved position before repeating the short approach.
function restoreEdge(): boolean {
    updatePose()
    let df = checkpointF - forwardMM
    let dr = checkpointR - rightMM
    let distance = Math.sqrt(df * df + dr * dr)
    if (distance > 130) return fail("Retry too far")
    if (distance > 3) {
        let reverseYaw = axis + Math.atan2(dr, df) * 180 / Math.PI + 180
        if (!aim(reverseYaw) || !advance(-distance, reverseYaw)) return false
    }
    if (!aim(checkpointYaw)) return false
    return scan(axis, 30) || (active() && reason == "" && scan(axis, 64))
}
function follow(): boolean {
    let started = axle()
    let expected = lengths[leg] * scaleMM - SENSOR_AHEAD_MM
    if (leg == 0) expected = lengths[0] * scaleMM
    if (leg == 11) expected = outletLength() - outletLead
    if (practice && leg == 9) expected = PRACTICE_START_MM
    expected = Math.max(10, expected)
    let gate = Math.max(10, expected * 0.62)
    if (leg == 0) gate = Math.max(55, SENSOR_AHEAD_MM)
    if (leg == 1) gate = Math.max(gate, expected * 0.64)
    // No assumed first-straight length. Other windows admit perspective and slip.
    let limit = leg == 0 ? 2500 : expected * 1.65 + 38
    let deadline = control.millis() + 2800 + limit * 70
    let course = bearing(leg)
    if (leg == 1) course += clip(angleDiff(yaw() - course), -25, 25)
    let settled = course
    let smooth = light() - 50
    let rate = 0
    let steering = 0
    let speed = 0
    let last = control.millis() - PERIOD
    let extremeAt = -1
    let extremeSign = 0
    let filteredYaw = yaw()
    let retries = 0
    let edgeFrom = -1
    while (active() && control.millis() < deadline) {
        let now = control.millis()
        let dt = clip(now - last, 1, 80)
        last = now
        let dist = axle() - started
        let err = light() - 50
        let prev = smooth
        smooth += dt / (18 + dt) * (err - smooth)
        rate += dt / (50 + dt) * ((smooth - prev) * 1000 / dt - rate)
        let heading = yaw()
        filteredYaw += 0.08 * angleDiff(heading - filteredYaw)
        let side = err < -33 ? -1 : (err > 33 ? 1 : 0)
        if (side != extremeSign) { extremeSign = side; extremeAt = now }
        let extreme = side != 0 && now - extremeAt >= 90
        let armed = dist >= gate
        if (leg == 11) {
            let along = tipForward() - farEdge
            let aligned = Math.abs(angleDiff(heading - course)) < 28
            if (aligned && Math.abs(err) < 33) {
                if (edgeFrom < 0) edgeFrom = dist
                if (dist - edgeFrom >= 12 && along < outletLength() - 8) rememberEdge()
            } else edgeFrom = -1
            armed = along >= outletLength() * 0.55 && dist >= 8
        }
        if (dist > 18 && Math.abs(smooth) < 18 && Math.abs(angleDiff(filteredYaw - course)) < 35) {
            settled += 0.04 * angleDiff(filteredYaw - settled)
        }
        // Pass a spur by holding the incoming heading while over its mouth.
        // Near the planned turn the very same reading becomes a landmark.
        if (armed && extreme && (leg != 9 || side < 0) && (leg != 13 || side > 0)) {
            entryYaw = settled
            legTravel = dist
            motors.stopAll()
            return true
        }
        if (dist > limit) return fail("Landmark missing")
        if (!armed && extreme && now - extremeAt > 850) {
            if (++retries > 1 || !getEdge(settled)) return fail("Early line loss")
            smooth = light() - 50
            rate = 0
            steering = 0
            extremeAt = control.millis()
            continue
        }
        let mag = Math.abs(smooth)
        let p = Math.max(0, mag - 2) * (smooth < 0 ? -1 : 1)
        let wanted = clip(KP * p + clip(KD * rate, -3, 3), -12, 12)
        steering += clip(wanted - steering, -110 * dt / 1000, 110 * dt / 1000)
        let top = BASE_SPEED
        if (armed && dist > expected * 0.85) top = 16
        if (leg == 11 && (retryCorner || armed)) top = 13
        speed = Math.min(top - (top - MIN_SPEED) * clip((mag - 6) / 34, 0, 1), speed + 30 * dt / 1000)
        let spur = (leg == 1 || leg == 13) && !armed && dist > expected * 0.15
        let deviation = angleDiff(heading - course)
        if (Math.abs(deviation) > 22 && deviation * steering < 0) hold(course, MIN_SPEED)
        else if (extreme && (armed || spur)) hold(settled, MIN_SPEED)
        else drive(speed - steering, speed + steering)
        pause(PERIOD)
    }
    return fail("Leg timeout")
}

// Scan just beyond the far edge. Keep the short outlet available for the next
// leg even when the sensor stays black all the way onto that outlet.
function crossPad(): boolean {
    axis = bearing(11)
    tracking = true
    previousAxle = axle()
    previousYaw = yaw()
    forwardMM = -SENSOR_AHEAD_MM * Math.cos((previousYaw - axis) * Math.PI / 180)
    let start = previousAxle
    let expected = PAD_LENGTH_MM > 0 ? PAD_LENGTH_MM : lengths[10] * padScale
    let shift = EXIT_SHIFT_MM == 0 ? 9 * scaleMM : EXIT_SHIFT_MM
    // Aim partway toward the outlet so the scan still crosses the tape edge.
    let course = entryYaw + clip(Math.atan2(shift * 0.5, expected) * 180 / Math.PI, -12, 12)
    let end = control.millis() + 2400 + expected * 100
    let firstLight = -1
    let blackSamples = 0
    while (active() && control.millis() < end) {
        let distance = axle() - start
        let v = light()
        if (v < 22) blackSamples++
        if (distance > expected * 0.64 && v > 28 && blackSamples >= 4) {
            if (firstLight < 0) { firstLight = distance; farEdge = tipForward() }
            if (distance - firstLight >= 3) break
        } else firstLight = -1
        if (distance >= expected + 8) break
        hold(course, MIN_SPEED)
        pause(10)
    }
    if (!active() || control.millis() >= end || blackSamples < 4) return fail("Pad not confirmed")
    let clearance = Math.min(19, lengths[11] * scaleMM * 0.24)
    let exitEstimate = firstLight >= 0 ? firstLight : expected
    let target = exitEstimate + clearance
    motors.stopAll()
    if (!advance(target - (axle() - start), course)) return false
    if (firstLight < 0) farEdge = expected
    if (!getOutlet()) return false
    outletLead = tipForward() - farEdge
    return true
}

function outletTurn(): boolean {
    for (let attempt = 0; attempt < 2; attempt++) {
        if (follow() && advance(SENSOR_AHEAD_MM - (attempt == 0 ? 12 : 26), entryYaw) && getEdge(bearing(12))) return true
        if (!active() || !checkpoint || attempt > 0 || reason == "Wheel timeout" || reason == "Gyro turn timeout") return false
        reason = ""
        retryCorner = true
        if (!restoreEdge()) return fail("Outlet retry failed")
        outletLead = tipForward() - farEdge
    }
    return false
}
function runCourse(): boolean {
    motors.largeB.setBrake(true)
    motors.largeC.setBrake(true)
    brick.buttonLeft.onEvent(ButtonEvent.Pressed, function () { stopped = true; motors.stopAll() })
    enter("Sensor on LINE")
    if (!active()) return false
    black = sample()
    enter("Sensor on FLOOR")
    if (!active()) return false
    white = sample()
    if (white - black < 15) return fail("Low contrast")
    enter("On EDGE, keep still")
    if (!active()) return false
    brick.showString("Gyro: keep still", 1)
    sensors.gyro2.calibrate()
    if (!active() || !checkGyro()) return false
    if (practice) { scaleMM = 2.5; padScale = 2.5 }
    for (leg = practice ? 9 : 0; leg < lengths.length; leg++) {
        brick.clearScreen()
        brick.showString(names[leg], 1)
        brick.showString("LEFT = stop", 3)
        if (leg == 10) {
            if (!crossPad()) return false
        } else if (leg == 11) {
            if (!outletTurn()) return false
            tracking = false
            if (practice) return true
        } else {
            if (!follow()) return false
            if (leg == 13) return true
            if (leg == 9) {
                if (!practice) padScale = clip((legTravel + SENSOR_AHEAD_MM) / lengths[9], scaleMM * 0.70, scaleMM * 1.40)
                continue
            }
            if (leg == 0) scaleMM = (legTravel + 6) / lengths[0]
            if (leg == 1) verticalTrim = clip(angleDiff(entryYaw - bearings[1]), -22, 22)
            if (!advance(SENSOR_AHEAD_MM - 3, entryYaw)) return false
            if (!getEdge(bearing(leg + 1))) return false
        }
    }
    return false
}

let finished = runCourse()
motors.stopAll()
brick.clearScreen()
if (!active()) brick.showString("Stopped", 1)
else if (finished) brick.showString(practice ? "Practice complete" : "Finish", 1)
else brick.showString(reason, 1)
brick.showString(names[leg], 3)
