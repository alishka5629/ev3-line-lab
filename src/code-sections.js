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
