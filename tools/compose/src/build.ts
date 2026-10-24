/** Asset pipeline: deterministic images, WFF, editor labels and picker preview. */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { frame } from './model.ts';
import { digitSvg } from './dotmatrix.ts';
import { previewSvg } from './preview.ts';
import { stringsXml, watchfaceXml } from './wff.ts';
import { palettes } from '../faces/halo/design.ts';

/** Repository root, independent of the caller's working directory. */
export const root = resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
/** Reproducible, authored bokeh rather than a copy of the reference photograph. */
export function backgroundSvg():string {
  const circles=Array.from({length:27},(_,i)=>{
    const angle=i*2.3999632297,r=80+(i*37%120),x=216+Math.sin(angle)*r,y=216+Math.cos(angle)*r;
    return `<circle cx="${x}" cy="${y}" r="${2+i%5}" opacity="${0.28+i%4*0.08}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><defs><radialGradient id="haze"><stop stop-color="white" stop-opacity="0.2"/><stop offset="0.7" stop-color="white" stop-opacity="0.08"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="2.4"/></filter></defs><rect width="432" height="432" fill="url(#haze)"/><g fill="white" filter="url(#b)">${circles}</g></svg>`;
}
/** Tint only visible pixels; alpha remains unchanged across all palettes. */
export async function backgroundData(palette:keyof typeof palettes):Promise<string> {
  const buffer=await sharp(Buffer.from(backgroundSvg())).tint(palettes[palette].cyan).webp({lossless:true,effort:6}).toBuffer();
  return 'data:image/webp;base64,'+buffer.toString('base64');
}
/** Return the complete generated resource set without writing project files. */
export async function resources():Promise<Map<string,Buffer>> {
  const result=new Map<string,Buffer>();
  result.set('raw/watchface.xml',Buffer.from(watchfaceXml()));
  result.set('values/strings.xml',Buffer.from(stringsXml()));
  result.set('xml/watch_face_info.xml',Buffer.from('<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated picker metadata. -->\n<WatchFaceInfo><Preview value="@drawable/preview"/><Editable value="true"/><MultipleInstancesAllowed value="true"/></WatchFaceInfo>\n'));
  result.set('drawable-nodpi/bg_halo.webp',await sharp(Buffer.from(backgroundSvg())).webp({lossless:true,effort:6}).toBuffer());
  for(let i=0;i<10;i++)for(const ambient of [false,true])result.set(`drawable-nodpi/digit_${ambient?'ambient_':''}${i}.png`,await sharp(Buffer.from(digitSvg(i,!ambient))).png({compressionLevel:9}).toBuffer());
  const preview=previewSvg(frame(),await backgroundData('REFERENCE'));
  result.set('drawable-nodpi/preview.png',await sharp(Buffer.from(preview)).png({compressionLevel:9}).toBuffer());
  return result;
}
/** Build to an explicit directory, or verify committed resources without changing them. */
export async function build(destination:string,check=false):Promise<void> {
  const files=await resources();
  for(const [name,data] of files){
    const path=resolve(destination,name);
    if(check){
      const existing=await readFile(path).catch(()=>Buffer.alloc(0));
      if(!existing.equals(data))throw new Error(`Generated resource differs: ${name}. Run npm run compose.`);
    }else{await mkdir(dirname(path),{recursive:true});await writeFile(path,data);}
  }
  // Stale generated assets must fail too: Android would otherwise package them silently.
  if(check)for(const entry of await readdir(destination,{recursive:true,withFileTypes:true})){
    if(!entry.isFile())continue;
    const relative=resolve(entry.parentPath,entry.name).slice(resolve(destination).length+1);
    if(!files.has(relative))throw new Error(`Unexpected resource: ${relative}`);
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),out=args.indexOf('--out');
  await build(out>=0?resolve(args[out+1]):resolve(root,'faces/halo/src/main/res'),args.includes('--check'));
  console.log(args.includes('--check')?'Generated resources match byte for byte.':'HALO resources generated.');
}
