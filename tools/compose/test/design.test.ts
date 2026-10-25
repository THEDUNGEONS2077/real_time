/** Design contract tests: readable time, safe motion, battery boundaries and reproducible resources. */
import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { effects, expression, frame, value } from '../halo/model.ts';
import type { Frame, Node, Shape } from '../halo/model.ts';
import { digits, timeRows } from '../halo/dotmatrix.ts';
import { polar } from '../halo/geometry.ts';
import { labelContent, previewSvg } from '../halo/preview.ts';
import { clockXml, nodeXml, watchfaceXml } from '../halo/wff.ts';
import { build, resources, root } from '../src/build.ts';
import { layout, palettes, scene } from '../halo/design.ts';

describe('time and live readouts',()=>{
  it('defines ten distinct 5x7 digits',()=>{
    expect(new Set(digits.map(d=>d.join(''))).size).toBe(10);
    for(const digit of digits){expect(digit).toHaveLength(7);for(const row of digit)expect(row).toMatch(/^[01]{5}$/);}
  });
  it.each(['00:00','09:41','12:00','23:59'])('renders %s with stable two-digit rows',time=>{
    const t=new Date(`2026-10-24T${time}:00Z`);expect(timeRows(t,true)).toEqual(time.split(':'));
  });
  it('follows 12-hour midnight and noon, and date rollover',()=>{
    expect(timeRows(new Date('2026-10-24T00:00:00Z'),false)).toEqual(['12','00']);
    expect(timeRows(new Date('2026-10-24T12:00:00Z'),false)).toEqual(['12','00']);
    expect(timeRows(new Date('2026-10-24T23:59:00Z'),false)).toEqual(['11','59']);
    expect(labelContent('date',frame())).toBe('SAT 24');
    expect(labelContent('date',frame({time:new Date('2026-10-25T00:00:00Z')}))).toBe('SUN 25');
    expect(clockXml()).toContain('hourFormat="SYNC_TO_DEVICE"');
  });
  it.each([0,8412,123456])('keeps %i steps as real data',steps=>expect(labelContent('steps',frame({steps}))).toBe(`▪ ${steps}`));
  it('keeps the complete stacked time inside the reference reticle',()=>{
    expect(layout.time.x).toBeGreaterThan(141);
    expect(layout.time.x+layout.time.width).toBeLessThan(291);
    expect(layout.time.y+layout.time.height).toBeLessThan(291);
  });
});

/** Walk the active tree in a frame to inspect semantics before either backend renders it. */
function flatten(nodes:Node[],f:Frame):Node[]{return nodes.flatMap(n=>n.kind==='switch'?flatten(f.effects[n.effect]?n.enabled:n.disabled,f):n.kind==='group'?[n,...flatten(n.children,f)]:[n]);}
describe('motion and palette contracts',()=>{
  it('keeps every motion disabled without millisecond or sensor sources',()=>{
    const f=frame({effects:Object.fromEntries(effects.map(k=>[k,false])) as Frame['effects']});
    const nodes=flatten(scene(),f);
    expect(nodes.some(n=>n.kind==='group'&&n.name==='seconds_moving')).toBe(false);
    expect(nodes.some(n=>n.kind==='group'&&n.name==='core_scan')).toBe(false);
    expect(nodes.filter(n=>n.kind==='group').some(n=>n.gyro)).toBe(false);
    expect(nodes.filter(n=>n.kind==='group').map(n=>nodeXml(n)).join('')).not.toContain('[MILLISECOND]');
  });
  it('moves each enabled effect and leaves all others present',()=>{
    for(const effect of effects){
      const f=frame({effects:Object.fromEntries(effects.map(k=>[k,k===effect])) as Frame['effects']});
      const serialized=flatten(scene(),f).filter(n=>n.kind==='group').map(n=>nodeXml(n)).join('');
      expect(serialized).toMatch(/Transform|Gyro/);
    }
  });
  it('bounds wrist tilt, bracket scale, scan line and ring phases',()=>{
    for(let i=0;i<120;i++){
      const f=frame({time:new Date(Date.UTC(2026,9,24,23,59,i/2)),tiltX:100,tiltY:-100});
      for(const n of flatten(scene(),f))if(n.kind==='group'){
        if(n.gyro){expect(value(n.x!,f)).toBe(3);expect(value(n.y!,f)).toBe(-3);}
        if(n.scale!==undefined){expect(value(n.scale,f)).toBeGreaterThanOrEqual(1-1e-12);expect(value(n.scale,f)).toBeLessThanOrEqual(1.03+1e-12);}
        if(n.name==='core_scan'){expect(value(n.y!,f)).toBeGreaterThanOrEqual(157);expect(value(n.y!,f)).toBeLessThanOrEqual(275);}
        if(n.name==='ring_a_moving')expect(Math.abs(value(n.angle!,f))).toBeLessThan(360);
      }
    }
  });
  it('changes battery span and warning exactly at the threshold',()=>{
    const arc=flatten(scene(),frame()).find(n=>n.kind==='arc'&&n.warning) as Shape;
    for(const p of [0,50,100])expect(value(arc.end!,frame({battery:p}))-(arc.start??0)).toBe(p);
    expect(nodeXml(arc)).toContain('[BATTERY_PERCENT] <= 15');
    expect(previewSvg(frame({battery:15}),'')).toContain(palettes.REFERENCE.warning);
    expect(expression(arc.end!)).toContain('[BATTERY_PERCENT]');
  });
  it('exposes three palettes and seven separate default-on switches',()=>{
    const xml=watchfaceXml();expect(Object.keys(palettes)).toHaveLength(3);
    for(const e of effects)expect(xml).toContain(`id="${e}" displayName="effect_${e}" defaultValue="TRUE"`);
    expect(xml).toContain('SET TIMER');expect(xml).toContain('[COMPLICATION.TEXT]');
    expect(xml).not.toContain('target="ALARM"');
    const ambient=xml.slice(xml.indexOf('name="ambient"'),xml.indexOf('<ComplicationSlot'));
    expect(ambient).not.toMatch(/MILLISECOND|Gyro|Transform|bg_halo/);
  });
});

/** Apply ancestor transforms to sample stroke and fill boundaries, including both-axis tilt. */
function boundaries(nodes:Node[],f:Frame,map:(x:number,y:number)=>[number,number]=(x,y)=>[x,y],scale=1):number[]{
  return nodes.flatMap(n=>{
    if(n.kind==='switch')return boundaries(f.effects[n.effect]?n.enabled:n.disabled,f,map,scale);
    if(n.kind==='image'||n.kind==='clock'||n.kind==='label')return [];
    if(n.kind==='group'){
      const angle=value(n.angle??0,f)*Math.PI/180,s=value(n.scale??1,f),dx=value(n.x??0,f),dy=value(n.y??0,f);
      return boundaries(n.children,f,(x,y)=>{const a=(x-216)*s,b=(y-216)*s;return map(216+dx+a*Math.cos(angle)-b*Math.sin(angle),216+dy+a*Math.sin(angle)+b*Math.cos(angle));},scale*s);
    }
    const x=value(n.x??0,f),y=value(n.y??0,f),r=n.r??0;
    const points:[number,number][]=n.kind==='line'?[[x,y],[n.x2!,n.y2!]]:n.kind==='rect'?[[x,y],[x+n.width!,y],[x,y+n.height!],[x+n.width!,y+n.height!]]:n.kind==='circle'?Array.from({length:16},(_,i)=>polar(r,i*22.5,x,y)):Array.from({length:73},(_,i)=>polar(r,(n.start??0)+(value(n.end??360,f)-(n.start??0))*i/72));
    return points.map(([x,y])=>{const [a,b]=map(x,y);return Math.hypot(a-216,b-216)+(n.stroke??0)*scale/2;});
  });
}
it('keeps stroked geometry at least six units inside the round edge at motion extremes',()=>{
  for(const tilt of [-3,0,3])for(const seconds of [0,0.3,1,15,30,45,59.999]){
    const f=frame({time:new Date(Date.UTC(2026,9,24,10,8,0)+seconds*1000),tiltX:tilt,tiltY:-tilt});
    expect(Math.max(...boundaries(scene(),f))).toBeLessThanOrEqual(216-layout.margin);
  }
});
it('regenerates the entire committed resource tree byte for byte',async()=>{
  const temp=await mkdtemp(resolve(tmpdir(),'real-time-resources-'));
  try{
    await build(temp);
    const expected=await resources('halo');
    for(const [name,buffer] of expected){expect(await readFile(resolve(temp,name))).toEqual(buffer);expect(await readFile(resolve(root,'faces/halo/src/main/res',name))).toEqual(buffer);}
    await build(resolve(root,'faces/halo/src/main/res'),true);
  }finally{await rm(temp,{recursive:true,force:true});}
},20000);
