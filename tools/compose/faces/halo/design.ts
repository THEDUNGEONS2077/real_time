/** HALO design layer: reference-derived geometry and motion, shared by both renderers. */
import { battery, daySeconds, op, phase, second } from '../../src/model.ts';
import type { Effect, Group, Node, NumberValue, Role, Shape } from '../../src/model.ts';
import { polar } from '../../src/geometry.ts';

/** Fixed palette order is the WFF ColorConfiguration index contract. */
export const roles: Role[] = ['navy','cyan','pale','teal','amber'];
/** Colours for editor-selectable variants. The reference's warning colour remains constant. */
export const palettes = {
  REFERENCE: { navy:'#050b12', cyan:'#6fd0e6', pale:'#cfeff7', teal:'#2c6f86', amber:'#f4b942', white:'#ffffff', warning:'#ff5a2a' },
  PHOSPHOR: { navy:'#030c08', cyan:'#80dca0', pale:'#d9ffe7', teal:'#296b4c', amber:'#b8ed65', white:'#f1fff6', warning:'#ff5a2a' },
  ICE: { navy:'#050c15', cyan:'#67cdeb', pale:'#d7f7ff', teal:'#2e6387', amber:'#88e8ff', white:'#ffffff', warning:'#ff5a2a' },
} as const;
/** Per-effect editor labels double as experiment descriptions. */
export const effectLabels: Record<Effect,string> = { seconds:'SECONDS MARKER', ring_a:'OUTER RING ROTATION', ring_b:'INNER RING ROTATION', breathing:'BRACKET BREATHING', nodes:'NODE DRIFT AND BLINK', scan:'CORE SCAN LINE', tilt:'WRIST TILT' };
/** Numeric limits include rotation-invariant geometry, strokes, glow and tilt. */
export const layout = { size:432, centre:216, margin:6, outerRadius:204, maxTilt:3, reticle:150, time:{x:174,y:157,width:88,height:118}, timer:{x:269,y:294,width:82,height:42} } as const;
/** Ring speeds and phases are bounded before arithmetic reaches trigonometric functions. */
export const motion = { ringA:120, ringB:300, breath:2, scanPeriod:6, scanDuration:0.6 } as const;

const line = (x:number,y:number,x2:number,y2:number,role:Role='cyan',alpha=180,stroke=1): Shape => ({kind:'line',x,y,x2,y2,role,alpha,stroke});
const ring = (r:number,role:Role,alpha=180,stroke=1,start=0,end:NumberValue=360): Shape => ({kind:'arc',r,start,end,role,alpha,stroke});
const group = (name:string,children:Node[],extra:Partial<Group>={}): Group => ({kind:'group',name,children,...extra});
const enabled = (effect:Effect,active:Node[],still:Node[]=[]): Node => ({kind:'switch',effect,enabled:active,disabled:still});

/** The reference's fine outer ticks remain sparse and crisp at watch size. */
export function outerRing(): Node[] {
  return [ring(204,'cyan',85), ...Array.from({length:120},(_,i)=> {
    const [x,y]=polar(i%10===0?195:i%5===0?198:201,i*3), [x2,y2]=polar(204,i*3);
    return line(x,y,x2,y2,'pale',i%5===0?140:70,i%10===0?1.4:0.7);
  }), ...[15,118,243].map(a=>{const [x,y]=polar(199,a);return {kind:'circle',x,y,r:1.6,role:'white',alpha:220} as Shape;})];
}
/** Broken teal tracks and their small directional teeth match the HUD's outer rim. */
export function innerRing(): Node[] {
  return [ring(194,'teal',155,2,8,104),ring(194,'teal',155,2,128,231),ring(194,'teal',155,2,253,350),
    ...[34,154,274].flatMap(a=>{const p=polar(191,a),q=polar(187,a-1.5),r=polar(187,a+1.5);return [line(...p,...q,'cyan',180),line(...q,...r,'cyan',180),line(...r,...p,'cyan',180)];})];
}
/** Foreground amber arcs stay in the reference pose instead of filling a full ring. */
export function amberArcs(): Node[] {
  return [[350,407],[130,153],[219,242]].flatMap(([start,end])=>[
    ring(184,'amber',18,11,start,end),ring(184,'amber',38,8,start,end),ring(184,'amber',240,4.5,start,end),
    ring(179,'amber',65,2,start+4,end-4),
  ]);
}
/** Original thin square brackets leave the time as the brightest central information. */
export function reticle(): Node[] {
  const a=141,b=291,l=22;
  return [[a,a,1,1],[b,a,-1,1],[a,b,1,-1],[b,b,-1,-1]].flatMap(([x,y,sx,sy])=>[
    line(x,y,x+sx*l,y,'amber',225,1.2),line(x,y,x,y+sy*l,'amber',225,1.2),
  ]).concat([line(205,a,227,a,'amber',235,1.8),line(205,b,227,b,'amber',235,1.8),line(a,206,a,226,'amber',235,1.8),line(b,206,b,226,'amber',235,1.8)]);
}
/** Faint network lines are decorative; only nodes drift, keeping changing geometry small. */
export function network(): Node[] {
  const points = [[65,246],[116,265],[157,314],[218,280],[252,341],[296,267],[346,247],[324,347],[196,361]];
  const edges = [[0,2],[0,5],[1,3],[1,4],[2,4],[2,7],[3,6],[3,8],[4,7],[5,7],[6,8]];
  const lines=edges.map(([a,b])=>line(...points[a] as [number,number],...points[b] as [number,number],'cyan',45,0.65));
  const still=points.map(([x,y])=>({kind:'circle',x,y,r:1.5,role:'pale',alpha:140} as Shape));
  const moving=points.map(([x,y],i)=>group(`node_${i}`,[{...still[i],x:0,y:0}],{
    x:op('+',x,op('*',2,op('sin',phase(20+i*2,i)))),
    y:op('+',y,op('*',2,op('cos',phase(20+i*2,i)))),
    ...(i<3?{alpha:op('+',120,op('*',80,op('%',op('+',op('%',daySeconds,60),i),2)))}:{}),
  }));
  return [...lines,enabled('nodes',moving,still)];
}
/** Full interactive scene; ambient contains a separate clock with no motion sources. */
export function scene(): Node[] {
  const outer=outerRing(),inner=innerRing();
  const rotating=[enabled('ring_a',[group('ring_a_moving',outer,{angle:op('*',op('%',daySeconds,120),3)})],outer),
    enabled('ring_b',[group('ring_b_moving',inner,{angle:op('*',op('%',daySeconds,300),-1.2)})],inner)];
  const corners=reticle();
  const breath=op('+',1.015,op('*',-0.015,op('cos',op('*',second,Math.PI))));
  const decor:Node[]=[
    ...amberArcs(),ring(172,'cyan',100),ring(164,'pale',100),ring(147,'teal',85),ring(155,'teal',55,0.6),ring(112,'teal',55,0.6),
    ...Array.from({length:64},(_,i)=>{const [x,y]=polar(159,i*5.625);return {kind:'circle',x,y,r:i%4===0?1:0.6,role:'cyan',alpha:i%4===0?90:40} as Shape;}),
    ...Array.from({length:16},(_,i)=>({kind:'rect',x:151+(i%4)*33,y:151+Math.floor(i/4)*33,width:29,height:29,role:'teal',alpha:8+(i*7%16)} as Shape)),
    ring(149,'amber',175,1.2,263,277),ring(149,'amber',175,1.2,83,97),
    line(58,204,58,228,'white',230,2),line(374,204,374,228,'white',230,2),
    ...[45,135,225,315].map(a=>{const p=polar(119,a),q=polar(130,a);return line(...p,...q,'white',210,1.6);}),
    ...network(),
    {kind:'arc',r:173,start:200,end:op('+',200,op('min',100,op('max',0,battery))),stroke:2.2,role:'amber',warning:true},
    enabled('seconds',[group('seconds_moving',[ring(190,'pale',245,2,0,2.5)],{angle:op('*',second,6)})]),
    ...Array.from({length:13},(_,i)=>line(147,146+i*11,285,146+i*11,'teal',18,0.5)),
    ...Array.from({length:13},(_,i)=>line(146+i*11,147,146+i*11,285,'teal',18,0.5)),
    enabled('breathing',[group('brackets_breathing',corners,{scale:breath})],corners),
    ...Array.from({length:140},(_,i)=>{
      const row=Math.floor(i/70),digit=Math.floor(i%70/35),cell=i%35;
      return {kind:'rect',x:177+digit*44+(cell%5)*8,y:160+row*62+Math.floor(cell/5)*8,width:4.5,height:4.5,role:'teal',alpha:38} as Shape;
    }),
    {kind:'clock',ambient:false},
    enabled('scan',[group('core_scan',[line(178,0,254,0,'pale',35,1)],{y:op('+',157,op('*',118,op('min',1,op('/',op('%',second,6),0.6)))),alpha:op('*',255,op('max',0,op('-',1,op('/',op('%',second,6),0.6))))})]),
    {kind:'label',content:'date',x:101,y:91,width:120,size:13,role:'pale'},
    {kind:'label',content:'steps',x:238,y:91,width:106,size:13,role:'pale'},
    {kind:'label',content:'battery',x:91,y:310,width:100,size:11,role:'amber'},
    {kind:'label',content:'0.215 ▪',x:245,y:124,width:70,size:8,role:'amber',alpha:170},
    {kind:'label',content:'REAL_TIME / HALO',x:154,y:348,width:130,size:8,role:'cyan',alpha:125},
  ];
  const depth:Node[]=[{kind:'image',resource:'bg_halo',alpha:95,role:'cyan'},...rotating];
  return [enabled('tilt',[group('tilt_rings',depth,{x:{source:'tiltX'},y:{source:'tiltY'},gyro:true})],depth),...decor];
}
