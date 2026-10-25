/** REDLINE: reference-derived red instrument rings with faster, continuously modulated rotation. */
import { battery, daySeconds, second, op } from '../../src/model.ts';
import type { Effect, Group, Node, NumberValue, Role, Shape } from '../../src/model.ts';
import { polar } from '../../src/geometry.ts';

/** Retain the shared five-role index contract; cyan/amber denote primary/secondary accents here. */
export const roles:Role[]=['navy','cyan','pale','teal','amber'];
/** Accent-only variants retain readable white instruments, black backgrounds and fixed warning amber. */
const neutral={navy:'#030405',pale:'#edf0f1',teal:'#343a3e',white:'#ffffff',warning:'#ffb24a'};
export const palettes={
  REFERENCE:{...neutral,cyan:'#ff202b',amber:'#9c121b'},
  AMBER:{...neutral,cyan:'#ffe160',amber:'#a87921'},
  CYAN:{...neutral,cyan:'#20dcff',amber:'#14738e'},
  GREEN:{...neutral,cyan:'#74ff6b',amber:'#328f41'},
  VIOLET:{...neutral,cyan:'#c78aff',amber:'#7044aa'},
  ICE:{...neutral,cyan:'#c8edff',amber:'#658aab'},
};
/** A master still mode removes every optional effect, including sensors and seconds overlays. */
export const speeds={STILL:0,SLOW:0.5,STANDARD:1,FAST:2} as const;
export type Speed=keyof typeof speeds;
export type MotionStyle='SMOOTH'|'DYNAMIC';
/** Editor labels are shared with previews; helper metadata stores these stable IDs. */
export const paletteLabels={REFERENCE:'REFERENCE RED',AMBER:'AMBER',CYAN:'CYAN',GREEN:'GREEN',VIOLET:'VIOLET',ICE:'ICE'};
export const speedLabels={STILL:'STILL',SLOW:'SLOW · 0.5×',STANDARD:'STANDARD · 1×',FAST:'FAST · 2×'};
/** Exactly twice the original 54-unit digit height; small instruments move clear of the clock. */
export const timeScale=2;
/** Editor labels describe this face's actual effects, while stable IDs support shared experiments. */
export const effectLabels:Record<Effect,string>={seconds:'SECONDS BEACON',ring_a:'OUTER ROTOR',ring_b:'INNER COUNTER-ROTOR',breathing:'SUBTLE ACCENT PULSE',nodes:'INSTRUMENT ROTORS',scan:'RADAR SWEEP',tilt:'WRIST DEPTH'};
/** Includes stroke/glow extent and simultaneous two-unit x/y tilt. Readouts remain stationary. */
export const layout={size:432,centre:216,margin:6,maxTilt:2,outerRadius:201,time:{x:66,y:155,width:300,height:114},timer:{x:78,y:299,width:74,height:65}} as const;
/** Clock-driven motion resumes after switching faces; it never depends on a one-shot animation lifecycle. */
export const motion={outer:18,inner:12,outerModulation:6,innerModulation:4,instruments:[8,10,24],pulse:2.4,radar:12} as const;
const line=(x:number,y:number,x2:number,y2:number,role:Role='teal',alpha=130,stroke=0.7):Shape=>({kind:'line',x,y,x2,y2,role,alpha,stroke});
const arc=(r:number,start:number,end:NumberValue,role:Role='cyan',alpha:NumberValue=220,stroke=2,cx=216,cy=216):Shape=>({kind:'arc',r,start,end,role,alpha,stroke,cx,cy});
const group=(name:string,children:Node[],extra:Partial<Group>={}):Group=>({kind:'group',name,children,...extra});
const toggle=(effect:Effect,moving:Node[],still:Node[]=[]):Node=>({kind:'switch',effect,enabled:moving,disabled:still});
/** A small fixed number of alpha strokes creates a red halo without runtime blur or image sequences. */
export const glowArc=(r:number,start:number,end:NumberValue,cx=216,cy=216):Node[]=>[
  arc(r,start,end,'cyan',12,12,cx,cy),arc(r,start,end,'cyan',32,8,cx,cy),arc(r,start,end,'cyan',235,3.2,cx,cy),
];
const ticks=(r:number,count:number,cx=216,cy=216):Node[]=>Array.from({length:count},(_,i)=>{
  const a=polar(r-(i%5===0?4:1.8),i*360/count,cx,cy),b=polar(r,i*360/count,cx,cy);
  return line(...a,...b,i%5===0?'pale':'teal',i%5===0?145:110,i%5===0?1:0.65);
});
/** Alternating light bars and segmented red arcs make the outer ring's rotation legible. */
export function outerRotor():Node[]{return [arc(201,0,360,'teal',180,0.8),arc(195,0,360,'teal',120,0.7),...ticks(200,72),
  ...[17,107,197,287].flatMap(a=>[arc(193,a,a+14,'pale',220,3.2),arc(193,a+16,a+22,'cyan',220,5)]),
  ...[50,140,230,320].map(a=>arc(198,a,a+3,'cyan',190,3)),
];}
/** Broken red primary ring contrasts with quieter graphite segments from the reference. */
export function innerRotor():Node[]{return [arc(181,0,360,'teal',125,0.8),arc(170,0,360,'teal',110,0.7),
  ...[27,117,207,297].flatMap(a=>glowArc(181,a,a+30)),
  ...[0,90,180,270].map(a=>arc(176,a+3,a+24,'teal',190,5)),
  ...[50,170,290].map(a=>arc(172,a,a+22,'pale',160,0.8)),
];}
/** Red subdial halos are static; only their thin bright vernier marks rotate. */
function dial(cx:number,cy:number,r:number):Node[]{return [
  {kind:'circle',x:cx,y:cy,r:r+6,role:'navy',alpha:255},arc(r+6,0,360,'teal',140,0.7,cx,cy),arc(r-8,0,360,'teal',150,0.8,cx,cy),
  ...glowArc(r,14,141,cx,cy),...glowArc(r,196,316,cx,cy),...ticks(r+3,24,cx,cy),
];}
/** The complete scene shares the same geometry and expression AST as SVG previews. */
export function scene(speed:Speed='STANDARD',feel:MotionStyle='SMOOTH'):Node[]{
  const rate=speeds[speed]||1, clock=op('*',daySeconds,rate);
  const motionPhase=(period:number)=>op('*',op('%',clock,period),2*Math.PI/period);
  const rotor=(name:string,children:Node[],period:number,direction:number,pivot?:Group['pivot']):Group=>group(name,children,{
    pivot,angle:op('*',op('%',clock,period),direction*360/period),
  });
  const a=outerRotor(),b=innerRotor();
  const outerAngle=op('+',op('*',op('%',clock,motion.outer),360/motion.outer),op('*',7,op('sin',motionPhase(motion.outerModulation))));
  const innerAngle=op('+',op('*',op('%',clock,motion.inner),-360/motion.inner),op('*',5,op('sin',motionPhase(motion.innerModulation))));
  const depth:Node[]=[toggle('ring_a',[feel==='SMOOTH'?rotor('outer_rotor',a,motion.outer,1):group('outer_rotor',a,{angle:outerAngle})],a),toggle('ring_b',[feel==='SMOOTH'?rotor('inner_rotor',b,motion.inner,-1):group('inner_rotor',b,{angle:innerAngle})],b)];
  const pulse:Node[]=[...glowArc(163,24,63),...glowArc(163,117,156),...glowArc(163,204,243),...glowArc(163,297,336)];
  const rotors:Node[]=([[115,329,41,8,1],[317,329,41,10,-1],[216,90,37,24,-1]] as const).map(([cx,cy,r,period,direction],i)=>
    rotor(`instrument_${i}`,[arc(r,18,35,'pale',195,1,cx,cy),arc(r,180,188,'cyan',230,3,cx,cy)],period,direction,{x:cx,y:cy}));
  const stillRotors=rotors.map(n=>({...n,angle:0} as Group));
  const reticle:Node[]=[[64,151,1,1],[368,151,-1,1],[64,269,1,-1],[368,269,-1,-1]].flatMap(([x,y,sx,sy])=>[
    line(x,y,x+sx*11,y,'pale',140),line(x,y,x,y+sy*11,'pale',140),{kind:'rect',x:x-1,y:y-1,width:2,height:2,role:'pale',alpha:220} as Shape,
  ]);
  const nodes:Node[]=[
    {kind:'image',resource:'redline_mesh',alpha:110,role:'teal'},
    toggle('tilt',[group('depth',depth,{x:op('*',{source:'tiltX'},2/3),y:op('*',{source:'tiltY'},2/3),gyro:true})],depth),
    arc(162,0,360,'teal',85,0.7),arc(145,0,360,'teal',75,0.7),
    ...Array.from({length:48},(_,i)=>arc(207,i*7.5+0.5,i*7.5+4.6,i%6===0?'amber':'teal',i%6===0?100:120,3.2)),
    ...[[-1,0],[1,0]].flatMap(([direction])=>{const x=216+direction*62;return [line(x,59,x,117,'cyan',120,0.6),{kind:'rect',x:x-1,y:96,width:2,height:4,role:'cyan',alpha:200} as Shape];}),
    toggle('breathing',[group('red_pulse',pulse,{alpha:op('+',205,op('*',35,op('sin',motionPhase(motion.pulse))))})],pulse),
    toggle('scan',[rotor('radar_sweep',[arc(151,0,25,'cyan',24,7),arc(151,23,25,'cyan',150,1.3)],motion.radar,1)]),
    ...[0,90,180,270].flatMap(a=>{const p=polar(195,a),q=polar(207,a),r=polar(191,a);return [line(...p,...q,'pale',240,2.3),line(...r,...p,'cyan',200,1.2)];}),
    ...[0,90,180,270].map(a=>{const [x,y]=polar(201,a);return {kind:'image',resource:'redline_glow',x:x-6,y:y-6,width:12,height:12,role:'cyan',alpha:90} as Node;}),
    toggle('seconds',[group('seconds_beacon',[arc(203,0,1.4,'pale',255,2),arc(203,0,1.4,'cyan',25,7)],{angle:op('*',second,6)})]),
    ...dial(115,329,34),...dial(317,329,34),...dial(216,90,30),
    toggle('nodes',rotors,stillRotors),
    {kind:'rect',x:60,y:147,width:312,height:126,role:'navy',alpha:240},...reticle,
    ...[[64,146,80,130],[368,146,352,130],[64,274,80,290],[368,274,352,290],[80,130,116,130],[352,130,316,130]].map(p=>line(...p as [number,number,number,number],'cyan',170,0.8)),
    line(144,126,288,126,'teal',220),line(156,148,276,148,'cyan',180,1),
    {kind:'image',resource:'redline_mark',x:206,y:36,width:20,height:18,alpha:245,role:'cyan'},
    {kind:'label',content:'D U N G E O N S',x:151,y:132,width:130,size:10,role:'pale',align:'CENTER'},
    {kind:'clock',ambient:false},
    {kind:'label',content:'full_date',x:148,y:275,width:136,size:12,role:'pale',align:'CENTER'},
    {kind:'image',resource:'redline_steps',x:305,y:312,width:24,height:22,alpha:235,role:'pale'},
    {kind:'label',content:'step_value',x:284,y:340,width:66,size:16,role:'pale',align:'CENTER'},
    {kind:'image',resource:'redline_battery',x:205,y:83,width:24,height:13,alpha:210,role:'pale'},
    {kind:'label',content:'percent',x:191,y:102,width:50,size:14,role:'pale',align:'CENTER'},
    {kind:'arc',cx:216,cy:90,r:25,start:0,end:op('*',op('min',100,op('max',0,battery)),3.6),role:'cyan',alpha:230,stroke:2.2,warning:true},
  ];
  // Resolve every switch before serialization in STILL: no hidden animation or gyro remains active.
  const still=(items:Node[]):Node[]=>items.flatMap(n=>n.kind==='switch'?still(n.disabled):n.kind==='group'?[{...n,children:still(n.children)}]:[n]);
  return speed==='STILL'?still(nodes):nodes;
}
