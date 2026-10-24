/** REDLINE's horizontal angular clock, provider slot and palette, using the shared scene renderers. */
import type { Frame, RenderStyle, Role } from '../../src/model.ts';
import { effects } from '../../src/model.ts';
import { timeRows } from '../../src/dotmatrix.ts';
import { nodeXml, tag, xml } from '../../src/wff.ts';
import { nodeSvg } from '../../src/preview.ts';
import { digitSvg, glyph, icons, meshSvg } from './assets.ts';
import { effectLabels, layout, palettes, scene } from './design.ts';
const canvas={x:0,y:0,width:432,height:432};
// REDLINE has one fixed palette: avoid runtime theme lookup and its white fallback entirely.
const colour=(role:Role)=>palettes.REFERENCE[role];
/** Labels retain full date/month and uncapped real step data. */
export function labelText(content:string,f:Frame):string {
  if(content==='full_date')return `${['SUN','MON','TUE','WED','THU','FRI','SAT'][f.time.getUTCDay()]} ${String(f.time.getUTCDate()).padStart(2,'0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][f.time.getUTCMonth()]}`;
  if(content==='step_value')return String(f.steps);
  if(content==='percent')return `${f.battery}%`;
  return content;
}
const template=(format:string,expressions:string[])=>tag('Template',{},format+expressions.map(expression=>tag('Parameter',{expression})).join(''));
/** Single native TimeText follows the watch's 12/24-hour setting, including midnight/noon. */
export function clockXml(ambient=false):string {
  return tag('DigitalClock',canvas,tag('TimeText',{...layout.time,format:'hh:mm',hourFormat:'SYNC_TO_DEVICE',align:'CENTER',alpha:ambient?65:255},
    tag('BitmapFont',{family:ambient?'segments_ambient':'segments',size:54,color:ambient?'#98a0a4':colour('pale')})));
}
/** Share original glyph polygons and metrics with the generated BitmapFont. */
export function clockSvg(f:Frame):string {
  const text=timeRows(f.time,f.hour24).join(':'),width=4*glyph.width+glyph.colonWidth;
  let x=216-width/2;
  return [...text].map(character=>{
    const w=character===':'?glyph.colonWidth:glyph.width,svg=digitSvg(character,!f.ambient).replaceAll('fill="white"',`fill="${f.ambient?'#98a0a4':palettes.REFERENCE.pale}"`);
    const image=`<image x="${x}" y="${layout.time.y}" width="${w}" height="54" opacity="${f.ambient?65/255:1}" href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"/>`;x+=w;return image;
  }).join('');
}
/** Resource masks are tinted identically to WFF SRC_IN tinting; all are white alpha images. */
export const style:RenderStyle={roles:[],palettes,clockXml,clockSvg,labelText,
  labelXml:{full_date:tag('Upper',{},template('%s %02d %s',['[DAY_OF_WEEK_S]','[DAY]','[MONTH_S]'])),step_value:template('%d',['[STEP_COUNT]']),percent:template('%d%%',['[BATTERY_PERCENT]'])},
};
/** Match tintColor semantics in SVG without adding runtime filter layers to the watch. */
export function imageData():Record<string,string>{return Object.fromEntries(Object.entries({...icons,redline_mesh:meshSvg()}).map(([name,svg])=>{
  const role=name==='redline_mesh'?'teal':name==='redline_mark'||name==='redline_glow'?'cyan':'pale';
  return [name,'data:image/svg+xml;base64,'+Buffer.from(svg.replaceAll('white',palettes.REFERENCE[role])).toString('base64')];
}));}
/** A true provider complication, with a stopwatch setup icon only while unconfigured. */
export function shortcutXml():string {
  const content=tag('PartText',{x:1,y:25,width:72,height:22},tag('Text',{align:'CENTER'},tag('Font',{family:'monospace',size:10,color:colour('pale')},template('%s',['[COMPLICATION.TEXT]']))));
  const image=(resource:string)=>tag('PartImage',{x:25,y:17,width:24,height:28},tag('Image',{resource}));
  const empty=image('redline_timer')+tag('PartText',{x:1,y:48,width:72,height:15},tag('Text',{align:'CENTER'},tag('Font',{family:'monospace',size:8,color:colour('pale')},'SET TIMER')));
  return tag('ComplicationSlot',{...layout.timer,slotId:0,name:'timer_shortcut',displayName:'timer_shortcut',supportedTypes:'SHORT_TEXT MONOCHROMATIC_IMAGE SMALL_IMAGE EMPTY',isCustomizable:'TRUE'},
    tag('Variant',{mode:'AMBIENT',target:'alpha',value:0})+tag('DefaultProviderPolicy',{defaultSystemProvider:'EMPTY',defaultSystemProviderType:'EMPTY'})+
    tag('BoundingBox',{x:0,y:0,width:74,height:65})+tag('Complication',{type:'EMPTY'},empty)+tag('Complication',{type:'SHORT_TEXT'},content)+
    tag('Complication',{type:'MONOCHROMATIC_IMAGE'},image('[COMPLICATION.MONOCHROMATIC_IMAGE]'))+tag('Complication',{type:'SMALL_IMAGE'},image('[COMPLICATION.SMALL_IMAGE]')));
}
/** Build WFF 4 with no executable code, sequence animations or runtime blur. */
export function watchfaceXml():string {
  const font=(ambient:boolean)=>tag('BitmapFont',{name:ambient?'segments_ambient':'segments'},[...'0123456789:'].map(character=>tag('Character',{name:character,resource:`segment_${ambient?'ambient_':''}${character===':'?'colon':character}`,width:character===':'?glyph.colonWidth:glyph.width,height:glyph.height})).join(''));
  const config=effects.map(id=>tag('BooleanConfiguration',{id,displayName:`effect_${id}`,defaultValue:'TRUE'})).join('');
  const active=tag('Group',{...canvas,name:'interactive'},tag('Variant',{mode:'AMBIENT',target:'alpha',value:0})+nodeXml({kind:'rect',...canvas,role:'navy'},style)+scene().map(n=>nodeXml(n,style)).join(''));
  const ambient=tag('Group',{...canvas,name:'ambient',alpha:0},tag('Variant',{mode:'AMBIENT',target:'alpha',value:255})+clockXml(true));
  return '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/compose/faces/redline; edit the shared design. -->\n'+tag('WatchFace',{width:432,height:432},tag('Metadata',{key:'PREVIEW_TIME',value:'10:45:00'})+tag('BitmapFonts',{},font(false)+font(true))+tag('UserConfigurations',{},config)+tag('Scene',{backgroundColor:'#000000'},active+ambient+shortcutXml())).replaceAll('</PartDraw>','</PartDraw>\n').replaceAll('</Group>','</Group>\n').replaceAll('</Condition>','</Condition>\n')+'\n';
}
/** Preview follows the same scene and palette; provider text is illustrative until device acceptance. */
export function previewSvg(f:Frame):string {
  const images=imageData(),s={...style,imageData:images};
  const timer=f.shortcut?`<text x="84" y="215" text-anchor="middle" font-family="monospace" font-size="10" fill="${palettes.REFERENCE.pale}">${xml(f.shortcut)}</text>`:
    `<image x="72" y="188" width="24" height="30" href="${images.redline_timer}"/><text x="84" y="237" text-anchor="middle" font-family="monospace" font-size="8" fill="${palettes.REFERENCE.pale}">SET TIMER</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><defs><clipPath id="round"><circle cx="216" cy="216" r="216"/></clipPath></defs><g clip-path="url(#round)"><rect width="432" height="432" fill="${f.ambient?'#000000':palettes.REFERENCE.navy}"/>${f.ambient?clockSvg(f):scene().map(n=>nodeSvg(n,f,'',s)).join('')+timer}</g></svg>`;
}
/** Localized editor strings live in Android resources; telemetry IDs remain stable. */
export function stringsXml():string {
  const strings={face_name:'REDLINE',palette:'COLOURS',palette_reference:'REFERENCE RED',timer_shortcut:'TIMER SHORTCUT',...Object.fromEntries(effects.map(e=>[`effect_${e}`,effectLabels[e]]))};
  return '<?xml version="1.0" encoding="utf-8"?>\n'+tag('resources',{},Object.entries(strings).map(([name,s])=>tag('string',{name},xml(s))).join(''))+'\n';
}
