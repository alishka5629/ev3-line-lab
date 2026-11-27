export const sections = [
  {id:'setup', title:'Robot setup', from:1, to:32,
    description:'One colour sensor reads the tape. The B and C motors steer the robot, and the gyro measures turns during recovery.'},
  {id:'sensor', title:'Reading the edge', from:33, to:58,
    description:'The program averages ten readings per sample. It maps black to 0, the floor to 100 and follows the edge near 50.'},
  {id:'start', title:'Calibrate and start', from:104, to:125,
    description:'Press ENTER on the tape, on the floor and on the right edge. The program checks contrast, calibrates the gyro and sets LEFT to stop the motors.'},
  {id:'steering', title:'Smooth steering', from:127, to:160,
    description:'The controller filters sensor noise. P corrects the current error, D reacts to how fast it changes, and the steering limit prevents sudden jumps.'},
  {id:'corners', title:'Speed and corners', from:148, to:166,
    description:'A large error slows the robot. If it lasts, stronger steering gradually kicks in. As the robot finds the edge again, speed rises gradually.'},
  {id:'recovery', title:'Recovering the line', from:75, to:102,
    description:'After 410 ms off the edge, the robot sweeps for a light-to-dark or dark-to-light crossing. The gyro and a timer limit each sweep.'},
  {id:'full', title:'Full source', from:1,
    description:'The complete MakeCode JavaScript program used for the square demo.'},
];

export function sourceLines(source, section) {
  return source.replace(/\r?\n$/, '').split(/\r?\n/).slice(section.from - 1,section.to);
}

export const complexSections = [
  {id:'setup', title:'Robot setup', from:1, to:39,
    description:'Motors B and C drive the wheels. Motor A moves the marker. The colour sensor reads the floor, and the gyro measures turns.'},
  {id:'sensor', title:'Reading the edge', from:40, to:64,
    description:'The code averages light readings for calibration and checks when the sensor is over the tape or the floor.'},
  {id:'start', title:'Calibrate and start', from:65, to:126,
    description:'Calibrate the gyro, then measure the floor and tape. Use LEFT or RIGHT to choose which edge to follow, and press ENTER to start.'},
  {id:'marker', title:'Marker control', from:127, to:150,
    description:'Motor A lowers the marker before the run and lifts it when the run ends.'},
  {id:'steering', title:'Steering and speed', from:227, to:246,
    description:'The program smooths the light reading and compares it with the target. It turns by changing the wheel speeds and slows down for sharper turns.'},
  {id:'recovery', title:'Recovering the line', from:151, to:188,
    description:'If the sensor sees the floor for over 350 ms, the robot turns toward the tape, then checks the other side. The gyro limits each turn.'},
  {id:'full', title:'Full source', from:1,
    description:'The complete MakeCode JavaScript program for the LEGO EV3.'},
];
