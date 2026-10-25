/** Shared editor contract: explicit labelled artwork and non-nested, value-driven selections. */
import { tag, xml } from './wff.ts';
import { digits } from './dotmatrix.ts';

/** A native companion/watch editor option. The icon contains a short caption for icon-only UIs. */
export interface EditorOption { id:string; label:string; icon:string; caption:string; colour:string }
/** Every future face supplies one catalogue for its configuration metadata and artwork. */
export interface EditorSetting { id:string; label:string; defaultValue:string; options:EditorOption[] }
/** Resource identifiers are deterministic and independent of localized display labels. */
export const optionIcon=(setting:string,option:string)=>`editor_${setting}_${option.toLowerCase()}`;
/** Build a standard setting without relying on companion-generated placeholder artwork. */
export function setting(id:string,label:string,defaultValue:string,options:{id:string;label:string;caption:string;colour:string}[]):EditorSetting {
  return {id,label,defaultValue,options:options.map(o=>({...o,icon:optionIcon(id,o.id)}))};
}
/** Binary list choices carry explicit ON/OFF icons on both editors, retaining TRUE/FALSE values. */
export function toggleSetting(id:string,label:string,colour:string):EditorSetting {
  return setting(id,label,'TRUE',[{id:'TRUE',label:'ON',caption:'ON',colour},{id:'FALSE',label:'OFF',caption:'OFF',colour:'#87909a'}]);
}
/** All declarations remain flat. Strings and icons are real Android resources checked after packaging. */
export function configurationXml(settings:EditorSetting[]):string {
  return settings.map(s=>tag('ListConfiguration',{id:s.id,displayName:s.id,screenReaderText:s.id,icon:s.options.find(o=>o.id===s.defaultValue)!.icon,defaultValue:s.defaultValue},
    s.options.map(o=>tag('ListOption',{id:o.id,displayName:`${s.id}_${o.id.toLowerCase()}`,screenReaderText:`${s.id}_${o.id.toLowerCase()}`,icon:o.icon})).join(''))).join('');
}
/** Emit only Conditions in the scene. Native configuration selectors cannot be nested, even through Groups. */
export function selectXml(setting:EditorSetting,branches:Record<string,string>):string {
  const {id,defaultValue,options}=setting;
  for(const option of options)if(branches[option.id]===undefined)throw new Error(`Missing scene branch ${id}.${option.id}`);
  const choices=options.filter(o=>o.id!==defaultValue);
  return tag('Condition',{},tag('Expressions',{},choices.map(o=>tag('Expression',{name:`choice_${o.id}`},`<![CDATA[[CONFIGURATION.${id}] == "${o.id}"]]>`)).join(''))+
    choices.map(o=>tag('Compare',{expression:`choice_${o.id}`},branches[o.id])).join('')+tag('Default',{},branches[defaultValue]));
}
/** The same definitions produce accessible labels; no configuration/option name can drift. */
export function editorStrings(settings:EditorSetting[]):Record<string,string> {
  return Object.fromEntries(settings.flatMap(s=>[[s.id,s.label],...s.options.map(o=>[`${s.id}_${o.id.toLowerCase()}`,o.label])]));
}
// Compact, original rectangular letter strokes avoid host-font dependencies in the option captions.
const letters:Record<string,string[]>={
  A:['01110','10001','10001','11111','10001','10001','10001'], B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'], D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'], F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01110'], H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'], L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'], N:['10001','11001','11001','10101','10011','10011','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'], P:['11110','10001','10001','11110','10000','10000','10000'],
  R:['11110','10001','10001','11110','10100','10010','10001'], S:['01111','10000','10000','01110','00001','00001','11110'],
  T:['11111','00100','00100','00100','00100','00100','00100'], V:['10001','10001','10001','10001','10001','01010','00100'],
  W:['10001','10001','10001','10101','10101','11011','10001'], X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'],
  '.':['00000','00000','00000','00000','00000','00100','00100'],
};
/** Small raster-ready HUD tiles remain legible when a companion hides the option's text label. */
export function optionSvg(option:EditorOption):string {
  const text=option.caption,cell=Math.min(2.4,72/(text.length*6-1)),left=(96-(text.length*6-1)*cell)/2;
  const cells=[...text].flatMap((c,i)=>{
    const rows=/^\d$/.test(c)?digits[Number(c)]:letters[c];
    if(!rows)throw new Error(`Unsupported editor caption character: ${c}`);
    return rows.flatMap((row,y)=>[...row].flatMap((on,x)=>on==='1'?[`<rect x="${left+(i*6+x)*cell}" y="${49+y*cell}" width="${cell*.85}" height="${cell*.85}"/>`]:[]));
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="44" fill="#070a10" stroke="${option.colour}" stroke-width="3"/><path d="M20 36A30 30 0 0 1 76 36" fill="none" stroke="${option.colour}" stroke-width="5"/><path d="M48 14V22M18 46H25M71 46H78" stroke="#edf0f1" stroke-width="2"/><g fill="#edf0f1">${cells}</g><path d="M32 76H64" stroke="${option.colour}" stroke-width="3"/></svg>`;
}
