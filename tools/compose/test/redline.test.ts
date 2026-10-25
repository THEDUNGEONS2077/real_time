/** REDLINE contracts: faster bounded rotation, fixed readouts, reference glow and reusable resource generation. */
import { expect, it } from 'vitest';
import { resolve } from 'node:path';
import { effects, expression, frame, value } from '../src/model.ts';
import type { Frame, Node } from '../src/model.ts';
import { polar } from '../src/geometry.ts';
import { build, root } from '../src/build.ts';
import { timeRows } from '../src/dotmatrix.ts';
import { nodeXml } from '../src/wff.ts';
import { layout, motion, palettes, redlineEffects, smoothFps, scene } from '../faces/redline/design.ts';
import { clockXml, compileWatchface, labelText, previewSvg, style, watchfaceXml } from '../faces/redline/render.ts';
import { digitSvg, glyph } from '../faces/redline/assets.ts';

const flat=(nodes:Node[],f:Frame):Node[]=>nodes.flatMap(n=>n.kind==='switch'?flat(f.effects[n.effect]?n.enabled:n.disabled,f):n.kind==='group'?[n,...flat(n.children,f)]:[n]);
/** Sample rendered primitive/image boundaries after all ancestor transforms, including glow strokes. */
function bounds(nodes:Node[],f:Frame,map:(x:number,y:number)=>[number,number]=(x,y)=>[x,y],scale=1):number[]{
  return nodes.flatMap(n=>{
    if(n.kind==='switch')return bounds(f.effects[n.effect]?n.enabled:n.disabled,f,map,scale);
    if(n.kind==='clock'||n.kind==='label'||n.kind==='image'&&n.resource==='redline_mesh')return [];
    if(n.kind==='group'){
      const a=value(n.angle??0,f)*Math.PI/180,s=value(n.scale??1,f),dx=value(n.x??0,f),dy=value(n.y??0,f),cx=n.pivot?.x??216,cy=n.pivot?.y??216;
      return bounds(n.children,f,(x,y)=>{const u=(x-cx)*s,v=(y-cy)*s;return map(cx+dx+u*Math.cos(a)-v*Math.sin(a),cy+dy+u*Math.sin(a)+v*Math.cos(a));},scale*s);
    }
    const x=value(n.x??0,f),y=value(n.y??0,f);
    const points:[number,number][]=n.kind==='line'?[[x,y],[n.x2!,n.y2!]]:n.kind==='rect'||n.kind==='image'?[[x,y],[x+n.width!,y],[x,y+n.height!],[x+n.width!,y+n.height!]]:
      n.kind==='circle'?Array.from({length:24},(_,i)=>polar(n.r??0,i*15,x,y)):Array.from({length:73},(_,i)=>polar(n.r??0,(n.start??0)+(value(n.end??360,f)-(n.start??0))*i/72,n.cx??216,n.cy??216));
    return points.map(([x,y])=>{const [a,b]=map(x,y);return Math.hypot(a-216,b-216)+('stroke' in n?n.stroke??0:0)*scale/2;});
  });
}
it('keeps all glowing geometry and icons inside the round safe margin',()=>{
  for(const tiltX of [-3,0,3])for(const tiltY of [-3,3])for(let seconds=0;seconds<60;seconds+=2.5){
    const f=frame({time:new Date(Date.UTC(2026,9,24,23,59,0)+seconds*1000),tiltX,tiltY});
    expect(Math.max(...bounds(scene(),f))).toBeLessThanOrEqual(216-layout.margin);
  }
});
it('rotates substantially faster than HALO without reversing or unbounded sine arguments',()=>{
  expect(motion.outer).toBeLessThan(120);expect(motion.inner).toBeLessThan(300);
  for(let seconds=0;seconds<60;seconds+=.25){
    const a=frame({time:new Date(Date.UTC(2026,9,24)+seconds*1000)}),b=frame({time:new Date(a.time.getTime()+10)});
    for(const n of flat(scene(),a))if(n.kind==='group'&&['outer_rotor','inner_rotor'].includes(n.name)){
      const delta=((value(n.angle!,b)-value(n.angle!,a)+540)%360-180)/.01;
      expect(delta*(n.name==='outer_rotor'?1:-1)).toBeGreaterThan(6);
      expect(Math.abs(delta)).toBeLessThan(39);expect(expression(n.angle!)).toContain('%');
    }
  }
});
it('removes optional motion and overlays when effects are disabled',()=>{
  const f=frame({effects:Object.fromEntries(effects.map(e=>[e,false])) as Frame['effects']});
  const xml=flat(scene(),f).map(n=>nodeXml(n,style)).join('');
  expect(xml).not.toMatch(/MILLISECOND|SECOND_MILLISECOND|ACCELEROMETER|radar_sweep|seconds_beacon/);
});
it('gives every switch a changing transform while leaving time outside rotating groups',()=>{
  for(const e of redlineEffects){
    const f=frame({effects:Object.fromEntries(effects.map(id=>[id,id===e])) as Frame['effects']});
    expect(flat(scene(),f).map(n=>nodeXml(n,style)).join('')).toMatch(/Transform|Gyro/);
  }
  for(const n of flat(scene(),frame()))if(n.kind==='group')expect(flat(n.children,frame()).some(c=>c.kind==='clock'||c.kind==='label')).toBe(false);
});
it.each(['00:00','10:45','12:00','23:59'])('preserves a readable horizontal %s',time=>{
  const t=new Date(`2026-10-24T${time}:00Z`);expect(timeRows(t,true).join(':')).toBe(time);
  expect(previewSvg(frame({time:t}))).toContain('width="62" height="76"');
});
it('uses original distinct angular glyphs with padding and native hour formatting',()=>{
  expect(new Set([...'0123456789'].map(c=>digitSvg(c))).size).toBe(10);
  expect(4*glyph.width+glyph.colonWidth).toBeLessThanOrEqual(layout.time.width);
  expect(clockXml()).toContain('hourFormat="SYNC_TO_DEVICE"');expect(clockXml()).toContain('format="hh:mm"');
  expect(timeRows(new Date('2026-10-25T00:00Z'),false).join(':')).toBe('12:00');
});
it('updates the enlarged full date at rollover and retains only battery beneath time',()=>{
  expect(labelText('full_date',frame({time:new Date('2026-10-25T00:00Z')}))).toBe('SUN 25 OCT');
  expect(layout.date.size).toBe(12*3.5);expect(layout.date.y+layout.date.height).toBeLessThan(layout.time.y);
  expect(layout.battery.y).toBeGreaterThan(layout.time.y+layout.time.height);
});
it('keeps red restrained and uses a distinct low-battery warning',()=>{
  expect(palettes.REFERENCE.cyan).toBe('#ff202b');
  const battery=flat(scene(),frame()).find(n=>n.kind==='label'&&n.warning)!;
  expect(nodeXml(battery,style)).toContain('[BATTERY_PERCENT] <= 15');
  expect(previewSvg(frame({battery:15}))).toContain('#ffb24a');expect(previewSvg(frame({battery:16}))).not.toContain('#ffb24a');
});
it('uses literal fixed colours without a runtime palette or white-fallback dependency',()=>{
  const xml=watchfaceXml();
  expect(xml).not.toMatch(/CONFIGURATION\.palette\.\d/);expect(xml).not.toContain('ColorConfiguration');
  const artwork=compileWatchface().caches.flatMap(c=>[...c.layers.values()].map(l=>l.svg)).join('');
  for(const colour of ['#030405','#ff202b','#edf0f1','#343a3e','#9c121b'])expect((xml+artwork).includes(colour),colour).toBe(true);
  expect(xml).toContain('backgroundColor="#000000"');
});
it('keeps ambient time-only and does not include frame sequences or runtime blur',()=>{
  const xml=watchfaceXml(),ambient=xml.slice(xml.indexOf('name="ambient"'));
  expect(ambient).not.toMatch(/Transform|Gyro|MILLISECOND|redline_mesh|STEP_COUNT/);
  expect(xml).not.toMatch(/SequenceImages|AnimatedImage|GaussianBlur|Launch/);
  expect(xml).not.toMatch(/SET TIMER|ComplicationSlot|STEP_COUNT|D U N G E O N S|instrument_/);
  for(const e of redlineEffects)expect(xml).toContain(`id="${e}" displayName="${e}"`);
});
it('reproduces all committed REDLINE resources deterministically',async()=>{
  await build(resolve(root,'faces/redline/src/main/res'),true,'redline');
},20000);

it('exposes six literal-colour presets without runtime theme lookup',()=>{
  const output=watchfaceXml();
  for(const [id,p] of Object.entries(palettes)){
    expect(output).toContain(`id="${id}" displayName="palette_${id.toLowerCase()}"`);
    expect(output).toContain(p.cyan);
    expect(previewSvg(frame({redlinePalette:id}))).toContain(p.cyan);
  }
  expect(output).not.toMatch(/CONFIGURATION\.palette\.\d/);
});
it('scales each decorative rotor and pulse, keeps seconds accurate, and makes STILL source-free',()=>{
  const f=frame({time:new Date('2026-10-24T00:00:01Z')});
  for(const feel of ['SMOOTH','DYNAMIC'] as const)for(const [speed,rate] of [['SLOW',.5],['STANDARD',1],['FAST',2]] as const){
    const nodes=flat(scene(speed,feel),f),main=nodes.find(n=>n.kind==='group'&&n.name==='outer_rotor');
    expect(main?.kind).toBe('group');
    if(main?.kind==='group'){
      if(feel==='SMOOTH'){
        expect(value(main.angle!,f)).toBeCloseTo(20*rate);
        expect(expression(main.angle!)).toContain('MILLISECOND');
      }
    }
    const seconds=nodes.find(n=>n.kind==='group'&&n.name==='seconds_beacon');
    if(seconds?.kind==='group')expect(value(seconds.angle!,f)).toBe(6);
    expect(Math.max(...bounds(scene(speed,feel),frame({...f,tiltX:3,tiltY:-3})))).toBeLessThanOrEqual(210);
  }
  const still=scene('STILL').map(n=>nodeXml(n,style)).join('');
  expect(still).not.toMatch(/MILLISECOND|SECONDS_IN_DAY|Gyro|Animation|seconds_beacon|radar_sweep/);
  expect(still).not.toContain('[STEP_COUNT]');expect(still).toContain('[BATTERY_PERCENT]');
});
it('refreshes non-repeating smooth transitions from the integer clock and retains direct-clock fallback',()=>{
  const output=scene('SLOW','SMOOTH').map(n=>nodeXml(n,style)).join('');
  expect(output).toContain('fps="60" repeat="0"');expect(output).not.toContain('MILLISECOND');
  expect(output).toContain('angleDirection="COUNTER_CLOCKWISE"');expect(output).not.toContain('repeat="-1"');
  const dynamic=scene('SLOW','DYNAMIC').map(n=>nodeXml(n,style)).join('');
  expect(dynamic).not.toContain('<Animation');expect(dynamic).toContain('[MILLISECOND]');
});
it('interpolates slow rotors in subpixel steps without wrap reversal, including midnight and re-entry gaps',()=>{
  expect(smoothFps).toBe(60);
  const samples=['2026-10-25T00:00:00.500Z','2026-10-25T23:59:59.983Z','2026-10-25T10:45:17.500Z','2026-10-25T10:47:44.250Z'];
  for(const sample of samples){
    const f=frame({time:new Date(sample)}),previous=frame({time:new Date(f.time.getTime()-1000)});
    for(const n of flat(scene('SLOW','SMOOTH'),f))if(n.kind==='group'&&n.angleTransition){
      const a=value(n.angleTransition.value,previous),b=value(n.angleTransition.value,f),direction=n.angleTransition.direction==='CLOCKWISE'?1:-1;
      const delta=direction*((direction*(b-a)%360+360)%360);
      const interpolated=a+delta*f.time.getUTCMilliseconds()/1000;
      expect(((interpolated-value(n.angle!,f)+540)%360)-180).toBeCloseTo(0,7);
      expect(Math.abs(delta)/smoothFps).toBeLessThanOrEqual(.25);
    }
  }
});
it('fits every time-box corner inside the inner circular opening',()=>{
  const t=layout.time;
  for(const x of [t.x,t.x+t.width])for(const y of [t.y,t.y+t.height])expect(Math.hypot(x-216,y-216)).toBeLessThan(layout.innerRadius);
});
