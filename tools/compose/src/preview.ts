/** SVG backend: layout approximation, never presented as a screenshot from Wear OS. */
import type { Frame, Node, Shape } from './model.ts';
import { value } from './model.ts';
import { arcPath } from './geometry.ts';
import { digitSvg, timeRows } from './dotmatrix.ts';
import { layout, palettes, scene } from '../faces/halo/design.ts';
import { xml } from './wff.ts';

/** Format preview readouts using the frame's synthetic local date. */
export function labelContent(content:string,f:Frame):string {
  if(content==='date') return ['SUN','MON','TUE','WED','THU','FRI','SAT'][f.time.getUTCDay()]+' '+String(f.time.getUTCDate()).padStart(2,'0');
  if(content==='steps')return `▪ ${f.steps}`;
  if(content==='battery')return `BAT ${f.battery}%`;
  return content;
}
function shape(n:Shape,f:Frame):string {
  const p=palettes[f.palette],color=p[n.warning&&f.battery<=15?'warning':n.role];
  const style=`opacity="${value(n.alpha??255,f)/255}" ${n.stroke?`stroke="${color}" stroke-width="${n.stroke}" fill="none"`:`fill="${color}"`}`;
  const x=value(n.x??0,f),y=value(n.y??0,f);
  switch(n.kind){
    case 'line':return `<line x1="${x}" y1="${y}" x2="${n.x2}" y2="${n.y2}" ${style}/>`;
    case 'rect':return `<rect x="${x}" y="${y}" width="${n.width}" height="${n.height}" ${style}/>`;
    case 'circle':return `<circle cx="${x}" cy="${y}" r="${n.r}" ${style}/>`;
    case 'arc':return `<path d="${arcPath(n.r??0,n.start??0,value(n.end??360,f))}" ${style}/>`;
  }
}
function clock(f:Frame):string {
  return timeRows(f.time,f.hour24).map((row,i)=>[...row].map((d,j)=>{
    const svg=digitSvg(Number(d),!f.ambient);
    return `<image x="${174+j*44}" y="${157+i*62}" width="44" height="56" opacity="${f.ambient?92/255:1}" href="data:image/svg+xml;base64,${Buffer.from(svg.replaceAll('fill="white"',`fill="${f.ambient?'#b0c3cc':palettes[f.palette].pale}"`)).toString('base64')}"/>`;
  }).join('')).join('');
}
/** Render exactly the selected shared tree, including all motion switches. */
export function nodeSvg(n:Node,f:Frame,background:string):string {
  if(['line','rect','circle','arc'].includes(n.kind))return shape(n as Shape,f);
  switch(n.kind){
    case 'switch':return (f.effects[n.effect]?n.enabled:n.disabled).map(c=>nodeSvg(c,f,background)).join('');
    case 'group':return `<g transform="translate(${value(n.x??0,f)},${value(n.y??0,f)}) translate(216,216) rotate(${value(n.angle??0,f)}) scale(${value(n.scale??1,f)}) translate(-216,-216)" opacity="${value(n.alpha??255,f)/255}">${n.children.map(c=>nodeSvg(c,f,background)).join('')}</g>`;
    case 'clock':return clock(f);
    case 'image':return `<image width="432" height="432" opacity="${n.alpha/255}" href="${background}"/>`;
    case 'label':return `<text x="${n.x}" y="${n.y+n.size}" font-family="monospace" font-size="${n.size}" fill="${palettes[f.palette][n.role]}" opacity="${value(n.alpha??255,f)/255}">${xml(labelContent(n.content,f))}</text>`;
    default:throw new Error(`Unrecognized node ${n.kind}`);
  }
}
/** Generate a preview. The background is supplied as an embedded, palette-tinted WebP. */
export function previewSvg(f:Frame,background:string):string {
  const {x,y,width,height}=layout.timer;
  const timer=`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${palettes[f.palette].teal}" stroke-width="0.8"/><text x="${x+width/2}" y="${y+25}" text-anchor="middle" fill="${palettes[f.palette].amber}" font-family="monospace" font-size="10">${xml(f.shortcut??'SET TIMER')}</text>`;
  return `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated design preview; Wear OS rendering may differ. -->\n<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><defs><clipPath id="round"><circle cx="216" cy="216" r="216"/></clipPath></defs><g clip-path="url(#round)"><rect width="432" height="432" fill="${f.ambient?'#000000':palettes[f.palette].navy}"/>${f.ambient?clock(f):scene().map(n=>nodeSvg(n,f,background)).join('')+timer}</g></svg>`;
}
