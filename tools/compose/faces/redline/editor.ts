/** REDLINE's complete phone/watch editor catalogue; stable IDs also identify measurement settings. */
import { effects } from '../../src/model.ts';
import { setting, toggleSetting } from '../../src/editor.ts';
import { effectLabels, paletteLabels, palettes, speedLabels } from './design.ts';
/** Icons carry captions because Galaxy Wearable can present options without their text labels. */
export const editorSettings=[
  setting('palette','COLOURS','REFERENCE',Object.entries(palettes).map(([id,p])=>({id,label:paletteLabels[id as keyof typeof paletteLabels],caption:id==='REFERENCE'?'RED':id,colour:p.cyan}))),
  setting('motion_speed','MOTION SPEED','STANDARD',Object.entries(speedLabels).map(([id,label])=>({id,label,caption:({STILL:'OFF',SLOW:'0.5X',STANDARD:'1X',FAST:'2X'} as Record<string,string>)[id],colour:palettes.REFERENCE.cyan}))),
  setting('motion_style','ROTATION STYLE','SMOOTH',[{id:'SMOOTH',label:'SMOOTH / STEADY',caption:'SMOOTH',colour:palettes.REFERENCE.cyan},{id:'DYNAMIC',label:'DYNAMIC / MODULATED',caption:'DYN',colour:palettes.REFERENCE.cyan}]),
  ...effects.map(id=>toggleSetting(id,effectLabels[id],palettes.REFERENCE.cyan)),
];
