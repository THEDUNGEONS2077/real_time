/** Frozen HALO resource set. Output must stay byte-identical to the released HALO 0.1.0 resources. */
import sharp from 'sharp';
import { frame } from './model.ts';
import { digitSvg } from './dotmatrix.ts';
import { previewSvg } from './preview.ts';
import { stringsXml, watchfaceXml } from './wff.ts';
import { palettes } from './design.ts';

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
  // Match WFF's SRC_IN colour filter exactly: RGB is the palette colour, alpha is the mask.
  // Sharp.tint preserves source lightness, which would leave this white mask almost white.
  const {data,info}=await sharp(Buffer.from(backgroundSvg())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const rgb=palettes[palette].cyan.slice(1).match(/../g)!.map(v=>parseInt(v,16));
  for(let i=0;i<data.length;i+=4){data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];}
  const buffer=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).webp({lossless:true,effort:6}).toBuffer();
  return 'data:image/webp;base64,'+buffer.toString('base64');
}
/** The complete HALO resource tree. */
export async function haloResources():Promise<Map<string,Buffer>> {
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
