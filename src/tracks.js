const circle=(rx,ry,n=150)=>Array.from({length:n+1},(_,i)=>{let t=i/n*2*Math.PI;return [rx*Math.cos(t),ry*Math.sin(t)]});
const heart=Array.from({length:241},(_,i)=>{let t=i/240*2*Math.PI;return [30*16*Math.sin(t)**3,30*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))]});
export const tracks=[
{id:'square',name:'Square',tag:'PROJECT',difficulty:'Basic',desc:'Four straights and 90° corners, inspired by the assignment.',paths:[[[-250,-430],[450,-430],[450,430],[-450,430],[-450,-430],[-250,-430]]]},
{id:'heart',name:'Heart',tag:'PROJECT',difficulty:'Medium',desc:'Smooth curves, a notch and a sharp tip. Based on the assignment example.',paths:[heart]},
{id:'oval',name:'Warm-up',tag:'START',difficulty:'Easy',desc:'An oval for your first controller adjustments.',paths:[circle(530,340)]},
{id:'complex',name:'Lab course',tag:'PROJECT',difficulty:'Hard',desc:'Approximate photo reconstruction: corners, zigzags and branches. Exact dimensions were not provided.',paths:[[[-500,-400],[-100,-400],[0,-100],[160,-100],[160,100],[330,100],[330,450],[0,450],[-100,260],[-330,260],[-450,80],[-640,80],[-640,-180],[-430,-180],[-500,-400]],[[160,100],[160,550]],[[-100,260],[-200,550],[100,550]]]},
{id:'chicane',name:'Chicane',tag:'CHALLENGE',difficulty:'Hard',desc:'Tight corners to test speed control and line recovery.',paths:[[[-500,-400],[500,-400],[500,-100],[170,-100],[170,100],[500,100],[500,400],[-500,400],[-500,100],[-170,100],[-170,-100],[-500,-100],[-500,-400]]]},
{id:'eight',name:'Figure eight',tag:'CHALLENGE',difficulty:'Junction',desc:'A crossing is ambiguous to one sensor. Test your route selection logic.',paths:[Array.from({length:241},(_,i)=>{let t=i/240*2*Math.PI;return [580*Math.sin(t),370*Math.sin(2*t)]})]},
{id:'baku',name:'Baku sprint',tag:'BAKU',difficulty:'Hard',desc:'An original street course with a long straight and a narrow sector, inspired by Baku City Circuit.',paths:[[[-580,-410],[580,-410],[580,280],[420,420],[120,420],[120,200],[-60,200],[-60,410],[-350,410],[-350,170],[-520,170],[-520,-30],[-370,-30],[-370,-180],[-580,-180],[-580,-410]]]},
{id:'wave',name:'Wave',tag:'TUNING',difficulty:'Medium',desc:'Gradual curvature changes for comparing P and PD.',paths:[Array.from({length:201},(_,i)=>{let t=i/200*2*Math.PI,r=420+80*Math.cos(4*t);return [r*Math.cos(t)*1.2,r*Math.sin(t)]})]}
];
