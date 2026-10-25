/** REDLINE's focused angular clock, enlarged date and plain battery percentage. */
import type { Frame, Node, RenderStyle, Role } from '../../src/model.ts';
import { configurationXml, editorStrings, selectXml } from '../../src/editor.ts';
import { LayerCache } from '../../src/bake.ts';
import { editorSettings } from './editor.ts';
import { timeRows } from '../../src/dotmatrix.ts';
import { nodeXml, tag, xml } from '../../src/wff.ts';
import { nodeSvg } from '../../src/preview.ts';
import { digitSvg, glyph, icons, meshSvg } from './assets.ts';
import { layout, palettes, speeds, timeScale, scene } from './design.ts';
const canvas={x:0,y:0,width:432,height:432};
// Every selected branch contains literal colours, preserving the confirmed 0.1.1 workaround.
const colour=(role:Role)=>palettes.REFERENCE[role];
/** Live labels retain the full date and current battery percentage. */
export function labelText(content:string,f:Frame):string {
  if(content==='full_date')return `${['SUN','MON','TUE','WED','THU','FRI','SAT'][f.time.getUTCDay()]} ${String(f.time.getUTCDate()).padStart(2,'0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][f.time.getUTCMonth()]}`;
  if(content==='percent')return `${f.battery}%`;
  return content;
}
const template=(format:string,expressions:string[])=>tag('Template',{},format+expressions.map(expression=>tag('Parameter',{expression})).join(''));
/** Single native TimeText follows the watch's 12/24-hour setting, including midnight/noon. */
export function clockXml(ambient=false):string {
  return tag('DigitalClock',canvas,tag('TimeText',{...layout.time,format:'hh:mm',hourFormat:'SYNC_TO_DEVICE',align:'CENTER',alpha:ambient?65:255},
    tag('BitmapFont',{family:ambient?'segments_ambient':'segments',size:glyph.height*timeScale,color:ambient?'#98a0a4':colour('pale')})));
}
/** Share original glyph polygons and metrics with the generated BitmapFont. */
export function clockSvg(f:Frame):string {
  const text=timeRows(f.time,f.hour24).join(':'),width=(4*glyph.width+glyph.colonWidth)*timeScale;
  let x=216-width/2;
  return [...text].map(character=>{
    const w=(character===':'?glyph.colonWidth:glyph.width)*timeScale,svg=digitSvg(character,!f.ambient).replaceAll('fill="white"',`fill="${f.ambient?'#98a0a4':palettes.REFERENCE.pale}"`);
    const image=`<image x="${x}" y="${layout.time.y}" width="${w}" height="${glyph.height*timeScale}" opacity="${f.ambient?65/255:1}" href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"/>`;x+=w;return image;
  }).join('');
}
/** Resource masks are tinted identically to WFF SRC_IN tinting; all are white alpha images. */
export const style:RenderStyle={roles:[],palettes,clockXml,clockSvg,labelText,
  labelXml:{full_date:tag('Upper',{},template('%s %02d %s',['[DAY_OF_WEEK_S]','[DAY]','[MONTH_S]'])),percent:template('%d%%',['[BATTERY_PERCENT]'])},
};
/** Match tintColor semantics in SVG without adding runtime filter layers to the watch. */
export function imageData(palette: keyof typeof palettes='REFERENCE'):Record<string,string>{return Object.fromEntries(Object.entries({...icons,redline_mesh:meshSvg()}).map(([name,svg])=>{
  const role=name==='redline_mesh'?'teal':name==='redline_glow'?'cyan':'pale';
  return [name,'data:image/svg+xml;base64,'+Buffer.from(svg.replaceAll('white',palettes[palette][role])).toString('base64')];
}));}
/** Build WFF 4 with no executable code, sequence animations or runtime blur. */
export function compileWatchface():{xml:string;caches:LayerCache[]} {
  const caches:LayerCache[]=[];
  const font=(ambient:boolean)=>tag('BitmapFont',{name:ambient?'segments_ambient':'segments'},[...'0123456789:'].map(character=>tag('Character',{name:character,resource:`segment_${ambient?'ambient_':''}${character===':'?'colon':character}`,width:character===':'?glyph.colonWidth:glyph.width,height:glyph.height})).join(''));
  const config=configurationXml(editorSettings),[paletteSetting,speedSetting,styleSetting]=editorSettings;
  // Configurations are declared once. Scene Conditions are freely composable; native selectors are not.
  const branches=selectXml(paletteSetting,Object.fromEntries(Object.entries(palettes).map(([palette,p])=>{
    const literalStyle={...style,palettes:{REFERENCE:p}},cache=new LayerCache(palette,{...literalStyle,imageData:imageData(palette as keyof typeof palettes)});
    caches.push(cache);
    const variants=new Map<string,Node[]>();
    const variant=(speed:keyof typeof speeds,feel:'SMOOTH'|'DYNAMIC')=>{
      const key=`${speed}_${feel}`;if(!variants.has(key))variants.set(key,cache.scene(scene(speed,feel)));return variants.get(key)!;
    };
    const still=(nodes:Node[]):Node[]=>nodes.flatMap(n=>n.kind==='switch'?still(n.disabled):n.kind==='group'?[{...n,children:still(n.children)}]:[n]);
    const base=variant('STANDARD','SMOOTH');
    const motion=base.map((node,index)=>{
      if(node.kind!=='switch')return nodeXml(node,literalStyle);
      return selectXml(speedSetting,Object.fromEntries((Object.keys(speeds) as (keyof typeof speeds)[]).map(speed=>{
        const subtree=(feel:'SMOOTH'|'DYNAMIC')=>tag('Group',{...canvas,name:`${palette}_${index}_${speed}_${feel}`},(speed==='STILL'?still([node]):[variant(speed,feel)[index]]).map(n=>nodeXml(n,literalStyle)).join(''));
        return [speed,speed==='STILL'?subtree('SMOOTH'):selectXml(styleSetting,{SMOOTH:subtree('SMOOTH'),DYNAMIC:subtree('DYNAMIC')})];
      })));
    }).join('');
    return [palette,tag('Group',{...canvas,name:`palette_${palette}`},motion)];
  })));
  const active=tag('Group',{...canvas,name:'interactive'},tag('Variant',{mode:'AMBIENT',target:'alpha',value:0})+nodeXml({kind:'rect',...canvas,role:'navy'},style)+branches);
  const ambient=tag('Group',{...canvas,name:'ambient',alpha:0},tag('Variant',{mode:'AMBIENT',target:'alpha',value:255})+clockXml(true));
  const document='<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/compose/faces/redline; edit the shared design. -->\n'+tag('WatchFace',{width:432,height:432},tag('Metadata',{key:'PREVIEW_TIME',value:'10:45:00'})+tag('BitmapFonts',{},font(false)+font(true))+tag('UserConfigurations',{},config)+tag('Scene',{backgroundColor:'#000000'},active+ambient)).replaceAll('</PartDraw>','</PartDraw>\n').replaceAll('</Group>','</Group>\n').replaceAll('</Condition>','</Condition>\n')+'\n';
  return {xml:document,caches};
}
/** Generate the same optimized XML used in the APK; no scene-level configuration selectors remain. */
export function watchfaceXml():string { return compileWatchface().xml; }
/** Preview follows the shared scene and ideal steady-state path; delivered cadence requires watch testing. */
export function previewSvg(f:Frame):string {
  const palette=(f.redlinePalette??f.palette) as keyof typeof palettes,p=palettes[palette]??palettes.REFERENCE;
  const images=imageData(palette in palettes?palette:'REFERENCE'),s={...style,palettes:{...palettes,REFERENCE:p},imageData:images};
  return `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432"><defs><clipPath id="round"><circle cx="216" cy="216" r="216"/></clipPath></defs><g clip-path="url(#round)"><rect width="432" height="432" fill="${f.ambient?'#000000':palettes.REFERENCE.navy}"/>${f.ambient?clockSvg(f):scene(f.motionSpeed,f.motionStyle).map(n=>nodeSvg(n,{...f,palette:'REFERENCE'},'',s)).join('')}</g></svg>`;
}
/** Localized editor strings live in Android resources; telemetry IDs remain stable. */
export function stringsXml():string {
  const strings={face_name:'REDLINE',...editorStrings(editorSettings)};
  return '<?xml version="1.0" encoding="utf-8"?>\n'+tag('resources',{},Object.entries(strings).map(([name,s])=>tag('string',{name},xml(s))).join(''))+'\n';
}
