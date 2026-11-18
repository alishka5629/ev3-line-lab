const circle=(rx,ry,n=150)=>Array.from({length:n+1},(_,i)=>{let t=i/n*2*Math.PI;return [rx*Math.cos(t),ry*Math.sin(t)]});
const heart=Array.from({length:241},(_,i)=>{let t=i/240*2*Math.PI;return [30*16*Math.sin(t)**3,30*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))]});
// Plan traced from the supplied Baku City Circuit image, in image pixels.
// Start/finish -> T1 -> T2 -> old-town section -> T20 -> start/finish.
// Uniform 3.3 mm/px scale preserves the outline; elevation is not simulated.
const bakuPlan=[
 [397,139],[436,135],[457,132],[462,131],[465,128],
 [464,114],[462,94],[460,75],[458,64],[456,60],
 [445,60],[421,62],[397,64],[374,67],[350,70],[326,73],[303,76],
 [286,79],[283,81],[283,86],[284,98],[286,112],[287,118],[286,122],
 [281,124],[264,125],[250,127],[236,130],[226,134],[222,139],
 [221,146],[219,149],[208,153],[190,160],[171,168],[153,175],
 [149,177],[146,175],[146,166],[146,149],[146,142],[144,139],
 [139,138],[137,136],[137,134],[133,133],[130,134],
 [129,131],[129,122],[127,118],[122,117],[106,117],[95,118],
 [79,121],[63,125],[52,129],[46,134],[39,143],[31,155],
 [26,164],[23,173],[22,183],[20,194],[17,204],[14,210],
 [14,212],[24,221],[38,234],[51,247],[62,257],[66,258],
 [71,253],[81,241],[91,231],[101,226],[119,217],[137,208],
 [140,204],[145,194],[149,185],[154,182],[174,174],
 [196,166],[216,160],[237,156],[260,154],[288,151],
 [317,148],[345,145],[371,142],[397,139]
];
const bakuCircuit=bakuPlan.map(([x,y])=>[(x-239)*3.3,(159-y)*3.3]);
// Black tape traced from the supplied 759 x 806 lab photo.
// Uniform scale retains the photographed outline. Physical dimensions are unknown.
const labPaths = [
 [[250,307],[646,323],[609,461],[510,460],[494,503],[460,625],
  [414,743],[394,792],[210,778],[255,617],[24,597],[83,463],
  [180,462],[250,307]],
 [[250,307],[195,180],[233,101],[258,44],[510,51]],
 [[233,101],[299,104],[284,138]],
 [[646,323],[701,132]],
 [[691,130],[704,132]],
 [[255,617],[329,619]],
 [[470,584],[538,588],[525,670]]
];
const labPatches = [[[467,499],[523,499],[496,631],[438,631]]];
const labPoint = ([x,y]) => [(x-363)*1.8,(418-y)*1.8];
const labCourse = labPaths.map(path => path.map(labPoint));
const labBlackAreas = labPatches.map(polygon => polygon.map(labPoint));
export const tracks=[
{id:'square',name:'Square',tag:'PROJECT',difficulty:'Basic',desc:'Four straights and 90° corners, inspired by the assignment.',paths:[[[-250,-430],[450,-430],[450,430],[-450,430],[-450,-430],[-250,-430]]]},
{id:'heart',name:'Heart',tag:'PROJECT',difficulty:'Medium',desc:'Smooth curves, a notch and a sharp tip. Based on the assignment example.',paths:[heart]},
{id:'oval',name:'Warm-up',tag:'START',difficulty:'Easy',desc:'An oval for your first controller adjustments.',paths:[circle(530,340)]},
{id:'complex',name:'Lab course',tag:'PROJECT',difficulty:'Hard',desc:'Traced from the lab photo, including branches and the wide black patch. Yellow markers omitted. Photo proportions; dimensions are approximate.',paths:labCourse,polygons:labBlackAreas},
{id:'chicane',name:'Chicane',tag:'CHALLENGE',difficulty:'Hard',desc:'Tight corners to test speed control and line recovery.',paths:[[[-500,-400],[500,-400],[500,-100],[170,-100],[170,100],[500,100],[500,400],[-500,400],[-500,100],[-170,100],[-170,-100],[-500,-100],[-500,-400]]]},
{id:'eight',name:'Figure eight',tag:'CHALLENGE',difficulty:'Junction',desc:'A crossing is ambiguous to one sensor. Test your route selection logic.',paths:[Array.from({length:241},(_,i)=>{let t=i/240*2*Math.PI;return [580*Math.sin(t),370*Math.sin(2*t)]})]},
{id:'baku',name:'Baku City Circuit',tag:'BAKU',difficulty:'Hard',desc:'Baku City Circuit outline traced from your reference: the long main straight, 90° city corners and tight old-town section. Uniformly scaled to the robot mat; flat, without elevation.',paths:[bakuCircuit]},
{id:'wave',name:'Wave',tag:'TUNING',difficulty:'Medium',desc:'Gradual curvature changes for comparing P and PD.',paths:[Array.from({length:201},(_,i)=>{let t=i/200*2*Math.PI,r=420+80*Math.cos(4*t);return [r*Math.cos(t)*1.2,r*Math.sin(t)]})]}
];
