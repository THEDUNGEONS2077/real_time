/** Preview checks: rasterize the shared SVG and compare aligned reference colour bands. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { root } from '../compose/src/build.ts';
import { backgroundData } from '../compose/halo/resources.ts';
import { effects, frame } from '../compose/halo/model.ts';
import type { Frame } from '../compose/halo/model.ts';
import { palettes } from '../compose/halo/design.ts';
import { previewSvg } from '../compose/halo/preview.ts';
import { redlinePreviews } from './redline.ts';

const out=resolve(root,'out/previews');
await mkdir(out,{recursive:true});
const states:[string,Partial<Frame>][]=[
  ['halo-reference',{}],['halo-low-battery',{battery:12}],['halo-ambient',{ambient:true}],
  ['halo-phosphor',{palette:'PHOSPHOR'}],['halo-ice',{palette:'ICE'}],
  ['halo-still',{effects:Object.fromEntries(effects.map(e=>[e,false])) as Frame['effects']}],
  ['halo-tilt-positive',{tiltX:3,tiltY:3}],['halo-tilt-negative',{tiltX:-3,tiltY:-3}],
  ['halo-midnight',{time:new Date('2026-10-25T00:00:00Z'),steps:0}],
  ['halo-large-steps',{steps:123456}],['halo-timer-selected',{shortcut:'TIMER'}],
];
const cards:string[]=[];
for(const [name,override] of states){
  const f=frame(override),svg=previewSvg(f,await backgroundData(f.palette));
  await writeFile(resolve(out,`${name}.svg`),svg);
  const png=await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(resolve(out,`${name}.png`),png);
  cards.push(`<figure><img src="${name}.png" width="300" height="300"/><figcaption>${name}</figcaption></figure>`);
  if(f.ambient){
    const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let lit=0,weighted=0,screen=0;
    for(let y=0;y<432;y++)for(let x=0;x<432;x++)if(Math.hypot(x+0.5-216,y+0.5-216)<=216){
      const i=(y*432+x)*info.channels,max=Math.max(data[i],data[i+1],data[i+2]);screen++;if(max>0)lit++;weighted+=(data[i]+data[i+1]+data[i+2])/(3*255);
    }
    const report={litFraction:lit/screen,meanRgbFraction:weighted/screen,denominator:'round display area',threshold:0.10};
    await writeFile(resolve(out,'ambient.json'),JSON.stringify(report,null,2)+'\n');
    if(report.litFraction>=0.10)throw new Error('Ambient lit-pixel share exceeds 10%.');
  }
}
// A standalone HTML animation needs no server or build tools to view.
const animated:string[]=[];
for(let i=0;i<24;i++){
  const f=frame({time:new Date(Date.UTC(2026,9,24,10,8,36+i*0.25))});
  const name=`motion-${String(i).padStart(2,'0')}.svg`;
  await writeFile(resolve(out,name),previewSvg(f,await backgroundData(f.palette)));
  animated.push(name);
}
await writeFile(resolve(out,'index.html'),`<!doctype html>\n<!-- Local design gallery; these approximate the system renderer. -->\n<html lang="en"><meta charset="utf-8"/><title>HALO design previews</title><style>body{background:#050b12;color:#cfeff7;font:14px monospace;margin:32px}main{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0}img{display:block}h1{font-size:24px}figcaption{padding:12px}button{background:#142634;color:#cfeff7;border:1px solid #6fd0e6;padding:10px}</style><h1>REAL_TIME / HALO</h1><p>Design previews. Watch rendering and shortcut provider content need device verification.</p><figure><img id="motion" src="${animated[0]}" width="432" height="432"/><figcaption>6-second motion loop · <button id="toggle">Pause</button></figcaption></figure><main>${cards.join('')}</main><script>const frames=${JSON.stringify(animated)};let i=0,playing=true;document.getElementById('toggle').onclick=()=>{playing=!playing;document.getElementById('toggle').textContent=playing?'Pause':'Play'};setInterval(()=>{if(playing)document.getElementById('motion').src=frames[++i%frames.length]},250)</script></html>\n`);

/** Measured colour samples describe similarity; they do not assert a pixel-perfect match. */
function bands(data:Buffer,channels:number):Record<string,number[]>{
  const sums:Record<string,{rgb:number[];n:number}>={};
  for(let y=0;y<432;y++)for(let x=0;x<432;x++){
    const radius=Math.hypot(x-216,y-216);if(radius>210)continue;
    const keys=[`ring-${Math.floor(radius/35)}`,`quadrant-${y<216?'N':'S'}${x<216?'W':'E'}`];
    for(const key of keys){const s=sums[key]??={rgb:[0,0,0],n:0};s.n++;for(let c=0;c<3;c++)s.rgb[c]+=data[(y*432+x)*channels+c];}
  }
  return Object.fromEntries(Object.entries(sums).map(([k,s])=>[k,s.rgb.map(n=>Number((n/s.n).toFixed(2)))]));
}
const refArg=process.argv.indexOf('--reference');
const reference=refArg>=0?process.argv[refArg+1]:'/mnt/c/Users/57298327/Desktop/DL/wallhaven-ox3gqm.jpg';
try{
  // The observed HUD centre is near (990,530); align it instead of assuming image centre.
  const ref=await sharp(await readFile(reference)).extract({left:450,top:0,width:1080,height:1080}).resize(432,432).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const actual=await sharp(resolve(out,'halo-reference.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
  await writeFile(resolve(out,'reference-comparison.json'),JSON.stringify({reference,crop:{left:450,top:0,width:1080,height:1080},referenceMeans:bands(ref.data,ref.info.channels),haloMeans:bands(actual.data,actual.info.channels),note:'Reference-relative colour and layout aid, not renderer or performance validation.'},null,2)+'\n');
  await sharp(await readFile(reference)).extract({left:450,top:0,width:1080,height:1080}).resize(432,432).png().toFile(resolve(out,'reference-aligned.png'));
}catch(error){
  if(refArg>=0)throw error;
  console.log('Reference image unavailable; generated previews without comparison.');
}
console.log(`Previews and ambient checks: ${out}/index.html (${Object.keys(palettes).length} palettes).`);
await redlinePreviews();
