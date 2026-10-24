/** REDLINE previews, animation samples and reference alignment. These are not on-watch measurements. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { root } from '../compose/src/build.ts';
import { effects, frame } from '../compose/src/model.ts';
import type { Frame } from '../compose/src/model.ts';
import { palettes, speeds } from '../compose/faces/redline/design.ts';
import { previewSvg } from '../compose/faces/redline/render.ts';
/** Generate the complete local review gallery without an HTTP server. */
export async function redlinePreviews():Promise<void>{
  const out=resolve(root,'out/previews/redline');await mkdir(out,{recursive:true});
  const base={time:new Date('2026-10-24T10:45:00Z'),steps:8540,battery:87};
  const states:[string,Partial<Frame>][]=[['reference',{}],...Object.keys(palettes).filter(k=>k!=='REFERENCE').map(k=>[k.toLowerCase(),{redlinePalette:k}] as [string,Partial<Frame>]),...Object.keys(speeds).map(k=>[`speed-${k.toLowerCase()}`,{motionSpeed:k as Frame['motionSpeed']}] as [string,Partial<Frame>]),['dynamic',{motionStyle:'DYNAMIC'}],['ambient',{ambient:true}],['low-battery',{battery:15}],['empty-battery',{battery:0}],
    ['still',{effects:Object.fromEntries(effects.map(e=>[e,false])) as Frame['effects']}],['tilt-positive',{tiltX:3,tiltY:3}],['tilt-negative',{tiltX:-3,tiltY:-3}],
    ['midnight',{time:new Date('2026-10-25T00:00:00Z'),steps:0}],['12-hour-noon',{time:new Date('2026-10-24T12:00:00Z'),hour24:false}],
    ['large-steps',{steps:123456}],['timer-selected',{shortcut:'TIMER'}],['motion-extreme',{time:new Date('2026-10-24T10:45:07.500Z')}]];
  const cards:string[]=[];
  for(const [name,override] of states){
    const svg=previewSvg(frame({...base,...override}));await writeFile(resolve(out,`${name}.svg`),svg);
    const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(resolve(out,`${name}.png`),png);
    cards.push(`<figure><img src="${name}.png" width="320" height="320"/><figcaption>${name}</figcaption></figure>`);
    if(override.ambient){
      const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});let lit=0,total=0;
      for(let y=0;y<432;y++)for(let x=0;x<432;x++)if(Math.hypot(x+.5-216,y+.5-216)<=216){const p=(y*432+x)*info.channels;total++;if(data[p]+data[p+1]+data[p+2]>0)lit++;}
      const report={litFraction:lit/total,threshold:0.10};await writeFile(resolve(out,'ambient.json'),JSON.stringify(report,null,2)+'\n');
      if(report.litFraction>=report.threshold)throw new Error('REDLINE ambient coverage exceeds 10%.');
    }
  }
  await sharp({create:{width:1296,height:864,channels:3,background:'#08090b'}}).composite(Object.keys(palettes).map((palette,i)=>({input:resolve(out,`${palette==='REFERENCE'?'reference':palette.toLowerCase()}.png`),left:i%3*432,top:Math.floor(i/3)*432}))).png().toFile(resolve(out,'palettes.png'));
  const frames:string[]=[];
  for(let i=0;i<360;i++){const name=`motion-${String(i).padStart(3,'0')}.svg`;await writeFile(resolve(out,name),previewSvg(frame({...base,time:new Date(base.time.getTime()+i*1000/30)})));frames.push(name);}
  const reference='/mnt/c/Users/57298327/Desktop/GENS/Dungeons Cyberpunk HUD Watch Face.png';
  let comparison='';
  try{
    const source=await readFile(reference);const meta=await sharp(source).metadata(),size=Math.min(meta.width!,meta.height!);
    const crop={left:Math.floor((meta.width!-size)/2),top:Math.floor((meta.height!-size)/2),width:size,height:size};
    await sharp(source).extract(crop).resize(432,432).png().toFile(resolve(out,'reference-aligned.png'));
    comparison='<figure><img src="reference-aligned.png" width="432" height="432"/><figcaption>Aligned user reference</figcaption></figure>';
    await writeFile(resolve(out,'reference-comparison.json'),JSON.stringify({reference,crop,adaptation:'Concentric red rings, three dials and central white time; reauthored vectors and masks. Original reference is not packaged.',limits:'SVG approximates WFF. Glow, fonts and device motion require watch acceptance.'},null,2)+'\n');
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>REDLINE review</title><style>body{background:#08090b;color:#edf0f1;font:14px monospace;margin:28px}main,.compare{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0}figcaption{padding:12px}button{background:#111;color:#eee;border:1px solid #ff202b;padding:10px}a{color:#ff6470}</style><h1>REAL_TIME / REDLINE</h1><p>Reference-derived design previews. Faster rotors, fixed readouts, subtle baked/alpha glow. Device performance remains unmeasured.</p><div class="compare">${comparison}<figure><img id="motion" src="${frames[0]}" width="432" height="432"><figcaption>12-second sample at 30 preview fps; resets at loop end. <button id="pause">Pause</button></figcaption></figure></div><main>${cards.join('')}</main><script>const frames=${JSON.stringify(frames)};let i=0,play=true;document.getElementById('pause').onclick=()=>{play=!play;document.getElementById('pause').textContent=play?'Pause':'Play'};setInterval(()=>{if(play)document.getElementById('motion').src=frames[++i%frames.length]},1000/30)</script></html>`);
  console.log(`REDLINE previews: ${out}/index.html`);
}
