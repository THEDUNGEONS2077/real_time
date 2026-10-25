/** WFF backend: serialize the shared scene as resource-only Watch Face Format 4. */
import type { Node, NumberValue, Role, Shape, RenderStyle } from './model.ts';
import { effects, expression } from './model.ts';
import { effectLabels, layout, palettes, roles, scene } from '../faces/halo/design.ts';

/** Escape both text and attribute values in generated XML. */
export const xml = (s: string): string => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
/** A tiny builder; all caller-supplied content is already serialized or escaped. */
export function tag(name:string, attrs:Record<string,string|number|undefined>, children=''):string {
  return `<${name}${Object.entries(attrs).filter(([,v])=>v!==undefined).map(([k,v])=>` ${k}="${xml(String(v))}"`).join('')}>${children}</${name}>`;
}
const canvas={x:0,y:0,width:432,height:432};
const haloStyle:RenderStyle={roles,palettes};
const colour=(role:Role,style:RenderStyle=haloStyle)=>style.roles.includes(role)?`[CONFIGURATION.palette.${style.roles.indexOf(role)}]`:style.palettes.REFERENCE[role];
const transform=(target:string,n:NumberValue|undefined)=>n!==undefined&&typeof n!=='number'?tag('Transform',{target,value:expression(n)}):'';
const transition=(target:string,n:{value:NumberValue;fps:number;direction?:string}|undefined)=>n?tag('Transform',{target,value:expression(n.value)},tag('Animation',{duration:1,interpolation:'LINEAR',fps:n.fps,repeat:0,angleDirection:n.direction})):'';
const initial=(n:NumberValue|undefined,fallback:number)=>typeof n==='number'?n:fallback;

function shape(n:Shape,style:RenderStyle):string {
  const paint=tag(n.stroke?'Stroke':'Fill',{color:colour(n.role,style),...(n.stroke?{thickness:n.stroke}: {})});
  const attrs:Record<string,string|number|undefined>={};
  let name='Line';
  switch(n.kind){
    case 'line':Object.assign(attrs,{startX:initial(n.x,0),startY:initial(n.y,0),endX:n.x2,endY:n.y2});break;
    case 'rect':name='Rectangle';Object.assign(attrs,{x:initial(n.x,0),y:initial(n.y,0),width:n.width,height:n.height});break;
    case 'circle':name='Ellipse';Object.assign(attrs,{x:initial(n.x,0)-(n.r??0),y:initial(n.y,0)-(n.r??0),width:2*(n.r??0),height:2*(n.r??0)});break;
    case 'arc':name='Arc';Object.assign(attrs,{centerX:n.cx??216,centerY:n.cy??216,width:2*(n.r??0),height:2*(n.r??0),startAngle:n.start,endAngle:initial(n.end,(n.start??0)+1)});break;
  }
  const draw=tag(name,attrs,paint+transform('endAngle',n.end));
  const part=(colorWarning=false)=>tag('PartDraw',{...canvas,alpha:initial(n.alpha,255)},transform('alpha',n.alpha)+(colorWarning?draw.replaceAll(colour(n.role,style),colour('warning',style)):draw));
  if(!n.warning)return part();
  return tag('Condition',{},tag('Expressions',{},tag('Expression',{name:'low_battery'},'<![CDATA[[BATTERY_PERCENT] <= 15]]>'))+tag('Compare',{expression:'low_battery'},part(true))+tag('Default',{},part()));
}

/** Time rows deliberately use the renderer's SYNC_TO_DEVICE hour format. */
export function clockXml(ambient=false):string {
  return tag('DigitalClock',{...canvas},[157,219].map((y,i)=>tag('TimeText',{x:174,y,width:88,height:56,format:i?'mm':'hh',hourFormat:'SYNC_TO_DEVICE',align:'CENTER',alpha:ambient?92:255},tag('BitmapFont',{family:ambient?'dots_ambient':'dots',size:56,color:ambient?'#b0c3cc':colour('pale')}))).join(''));
}

/** Emit a single subtree. Switch branches prevent disabled effects from animating invisibly. */
export function nodeXml(n:Node,style:RenderStyle=haloStyle):string {
  if(['line','rect','circle','arc'].includes(n.kind)) return shape(n as Shape,style);
  switch(n.kind){
    case 'switch':return tag('Condition',{},tag('Expressions',{},tag('Expression',{name:'enabled'},`<![CDATA[[CONFIGURATION.${n.effect}] == "TRUE"]]>`))+tag('Compare',{expression:'enabled'},n.enabled.map(c=>nodeXml(c,style)).join(''))+(n.disabled.length?tag('Default',{},n.disabled.map(c=>nodeXml(c,style)).join('')):''));
    case 'group': {
      const gyros=n.gyro?tag('Gyro',{x:expression(n.x??0),y:expression(n.y??0)}):'';
      const transforms=(n.gyro?'':transform('x',n.x)+transform('y',n.y))+(n.angleTransition?transition('angle',n.angleTransition):transform('angle',n.angle))+transform('scaleX',n.scale)+transform('scaleY',n.scale)+(n.alphaTransition?transition('alpha',n.alphaTransition):transform('alpha',n.alpha));
      return tag('Group',{...canvas,name:n.name,x:initial(n.x,0),y:initial(n.y,0),angle:initial(n.angle,0),scaleX:initial(n.scale,1),scaleY:initial(n.scale,1),alpha:initial(n.alpha,255),pivotX:(n.pivot?.x??216)/432,pivotY:(n.pivot?.y??216)/432},gyros+transforms+n.children.map(c=>nodeXml(c,style)).join(''));
    }
    case 'image': return tag('PartImage',{...canvas,x:Math.round(n.x??0),y:Math.round(n.y??0),width:n.width??432,height:n.height??432,alpha:n.alpha,tintColor:n.tint===false?undefined:colour(n.role,style)},tag('Image',{resource:n.resource}));
    case 'clock':return style.clockXml?.(n.ambient)??clockXml(n.ambient);
    case 'label': {
      const templates:Record<string,string>={date:tag('Upper',{},tag('Template',{},'%s %02d'+tag('Parameter',{expression:'[DAY_OF_WEEK_S]'})+tag('Parameter',{expression:'[DAY]'}))),steps:tag('Template',{},'▪ %d'+tag('Parameter',{expression:'[STEP_COUNT]'})),battery:tag('Template',{},'BAT %d%%'+tag('Parameter',{expression:'[BATTERY_PERCENT]'}))};
      const text=tag('PartText',{x:n.x,y:n.y,width:n.width,height:n.height??22,alpha:initial(n.alpha,255)},tag('Text',{align:n.align??'START'},tag('Font',{family:'monospace',size:n.size,color:colour(n.role,style)},style.labelXml?.[n.content]??templates[n.content]??xml(n.content))));
      return n.warning?tag('Condition',{},tag('Expressions',{},tag('Expression',{name:'low_battery'},'<![CDATA[[BATTERY_PERCENT] <= 15]]>'))+tag('Compare',{expression:'low_battery'},text.replaceAll(colour(n.role,style),colour('warning',style)))+tag('Default',{},text)):text;
    }
    default:throw new Error(`Unrecognized node ${n.kind}`);
  }
}

/** The shortcut always renders provider content instead of pretending any selected app is Timer. */
export function shortcutXml():string {
  const icon=(resource:string)=>tag('PartImage',{x:29,y:5,width:24,height:24},tag('Image',{resource}));
  const text=tag('PartText',{x:3,y:10,width:76,height:22},tag('Text',{align:'CENTER'},tag('Font',{family:'monospace',size:11,color:colour('pale')},tag('Template',{},'%s'+tag('Parameter',{expression:'[COMPLICATION.TEXT]'})))));
  const empty=tag('PartText',{x:2,y:9,width:78,height:24},tag('Text',{align:'CENTER'},tag('Font',{family:'monospace',size:10,color:colour('amber')},'SET TIMER')));
  return tag('ComplicationSlot',{...layout.timer,slotId:0,name:'timer_shortcut',displayName:'timer_shortcut',supportedTypes:'SHORT_TEXT MONOCHROMATIC_IMAGE SMALL_IMAGE EMPTY',isCustomizable:'TRUE'},
    tag('Variant',{mode:'AMBIENT',target:'alpha',value:0})+
    tag('DefaultProviderPolicy',{defaultSystemProvider:'EMPTY',defaultSystemProviderType:'EMPTY'})+
    tag('BoundingBox',{x:0,y:0,width:82,height:42})+
    tag('Complication',{type:'EMPTY'},empty)+tag('Complication',{type:'SHORT_TEXT'},text)+
    tag('Complication',{type:'MONOCHROMATIC_IMAGE'},icon('[COMPLICATION.MONOCHROMATIC_IMAGE]'))+
    tag('Complication',{type:'SMALL_IMAGE'},icon('[COMPLICATION.SMALL_IMAGE]')));
}

/** Build the entire XML, keeping an intentionally minimal ambient clock separate. */
export function watchfaceXml():string {
  const font=(ambient:boolean)=>tag('BitmapFont',{name:ambient?'dots_ambient':'dots'},Array.from({length:10},(_,i)=>tag('Character',{name:i,resource:`digit_${ambient?'ambient_':''}${i}`,width:44,height:56})).join(''));
  const config=tag('ColorConfiguration',{id:'palette',displayName:'palette',defaultValue:'REFERENCE'},Object.entries(palettes).map(([id,p])=>tag('ColorOption',{id,displayName:`palette_${id.toLowerCase()}`,colors:roles.map(role=>p[role]).join(' ')})).join(''))+
    effects.map(id=>tag('BooleanConfiguration',{id,displayName:`effect_${id}`,defaultValue:'TRUE'})).join('');
  const background=tag('PartDraw',canvas,tag('Rectangle',{...canvas},tag('Fill',{color:colour('navy')})));
  const timerFrame=nodeXml({kind:'rect',...layout.timer,role:'teal',stroke:0.8,alpha:180});
  const active=tag('Group',{...canvas,name:'interactive'},tag('Variant',{mode:'AMBIENT',target:'alpha',value:0})+background+scene().map(n=>nodeXml(n)).join('')+timerFrame);
  const ambient=tag('Group',{...canvas,name:'ambient',alpha:0},tag('Variant',{mode:'AMBIENT',target:'alpha',value:255})+clockXml(true));
  return '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/compose. Edit the shared design, then run npm run compose. -->\n'+
    tag('WatchFace',{width:432,height:432},tag('Metadata',{key:'PREVIEW_TIME',value:'10:08:36'})+tag('BitmapFonts',{},font(false)+font(true))+tag('UserConfigurations',{},config)+tag('Scene',{backgroundColor:'#000000'},active+ambient+shortcutXml())).replaceAll('</PartDraw>','</PartDraw>\n').replaceAll('</Group>','</Group>\n').replaceAll('</Condition>','</Condition>\n')+'\n';
}

/** Android string resources are generated alongside the editor configuration. */
export function stringsXml():string {
  const strings:Record<string,string>={face_name:'HALO',palette:'COLOURS',timer_shortcut:'TIMER SHORTCUT',palette_reference:'REFERENCE',palette_phosphor:'PHOSPHOR',palette_ice:'ICE',...Object.fromEntries(effects.map(e=>[`effect_${e}`,effectLabels[e]]))};
  return '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated face name and editor labels. -->\n'+tag('resources',{},Object.entries(strings).map(([name,s])=>tag('string',{name},xml(s))).join(''))+'\n';
}
