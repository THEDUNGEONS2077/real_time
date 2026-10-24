/** Battery parser layer: interpret raw dumpsys exports without executing exported content. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BatteryResult, BatterySnapshot } from './model.ts';

/** Missing files are expected on devices that restrict a diagnostic source. */
export async function optionalText(path:string):Promise<string|null>{
  try{return await readFile(path,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
const numeric=(text:string|null):number|null=>{if(text===null||!text.trim())return null;const n=Number(text.trim());return Number.isFinite(n)?n:null;};
const field=(text:string,name:string):number|null=>numeric(new RegExp(`^\\s*${name}:\\s*(-?[\\d.]+)\\s*$`,'mi').exec(text)?.[1]??null);

/** Load one endpoint, preserving missing and unsupported fields explicitly. */
export async function snapshot(directory:string):Promise<BatterySnapshot>{
  const read=(name:string)=>optionalText(resolve(directory,`${name}.txt`));
  const battery=await read('battery')??'',checkin=await read('batterystats-checkin')??'';
  const connections=['AC powered','USB powered','Wireless powered','Dock powered'].map(k=>new RegExp(`^\\s*${k}:\\s*(true|false)`,'mi').exec(battery)?.[1]).filter(Boolean);
  // AOSP BatteryStats.dumpCheckinLocked: five duration/count fields precede startClockTime.
  const bt=checkin.split(/\r?\n/).map(l=>l.split(',')).find(c=>c[3]==='bt');
  const conditions:Record<string,string|null>={};
  for(const key of ['brightness','brightness-mode','timeout','aod','wifi','bluetooth','airplane'])conditions[key]=(await read(key))?.trim()??null;
  return {epoch:numeric(await read('epoch')),uptime:numeric((await read('uptime'))?.split(/\s+/)[0]??null),
    bootId:(await read('boot-id'))?.trim()||null,firmware:(await read('firmware'))?.trim()||null,
    level:field(battery,'level'),scale:field(battery,'scale'),chargeCounterUah:field(battery,'Charge counter'),
    plugged:connections.length?connections.includes('true'):null,status:field(battery,'status'),
    statsStart:bt?numeric(bt[9]??null):null,history:await read('batterystats-history')??'',checkin,conditions};
}

/** Whole-device estimates from Android's pws record, kept separate from measured drain. */
export function estimatedPower(checkin:string):number|null{
  const row=checkin.split(/\r?\n/).map(l=>l.split(',')).find(c=>c[3]==='pws');
  return row?numeric(row[5]??null):null;
}

/** Compare endpoint deltas and reject intervals with known contamination. */
export function compareBattery(start:BatterySnapshot,end:BatterySnapshot):BatteryResult{
  const flags:string[]=[],duration=start.epoch!==null&&end.epoch!==null?end.epoch-start.epoch:null;
  const hours=duration!==null&&duration>0?duration/3600:null;
  if(hours===null)flags.push('missing-or-invalid-duration');
  if(!start.bootId||!end.bootId)flags.push('boot-identity-unavailable');
  else if(start.bootId!==end.bootId)flags.push('reboot');
  if(start.uptime!==null&&end.uptime!==null&&duration!==null){
    if(end.uptime<start.uptime)flags.push('reboot');
    else if(Math.abs((end.uptime-start.uptime)-duration)>120)flags.push('wall-clock-change');
  }
  if(start.statsStart===null||end.statsStart===null)flags.push('statistics-start-unavailable');
  else if(start.statsStart!==end.statsStart)flags.push('statistics-reset');
  if(start.plugged===true||end.plugged===true||start.status===2||end.status===2)flags.push('charging-at-endpoint');
  if(start.plugged===null||end.plugged===null)flags.push('charging-state-unavailable');
  // Examine only history added since the start endpoint. History truncation is not clean data.
  let historyDelta='';
  if(!start.history||!end.history)flags.push('history-unavailable');
  else{
    const events=(text:string)=>text.split(/\r?\n/).map(l=>l.trim()).filter(l=>/^\+?\d.*\(/.test(l)||/^\d+,h,/.test(l));
    const a=events(start.history),b=events(end.history);
    if(!a.length||!b.length)flags.push('history-format-unrecognized');
    else{
      const anchor=a.at(-1)!,index=b.lastIndexOf(anchor);
      if(index<0)flags.push('history-gap');else historyDelta=b.slice(index+1).join('\n');
    }
  }
  if(/\+plugged|plug=(?:ac|usb|wireless)|(?:^|,)\+p(?:,|$)/mi.test(historyDelta))flags.push('charging-during-interval');
  if(/\b(?:RESET|START|SHUTDOWN)\b/.test(historyDelta))flags.push('history-reset-or-reboot');
  if(start.firmware&&end.firmware&&start.firmware!==end.firmware)flags.push('firmware-changed');
  for(const [key,a] of Object.entries(start.conditions)){
    const b=end.conditions[key];if(a!==null&&b!==null&&a!==b)flags.push(`condition-changed:${key}`);
  }
  const percent=(s:BatterySnapshot)=>s.level!==null&&s.scale!==null&&s.scale>0?s.level/s.scale*100:null;
  const a=percent(start),b=percent(end),loss=a!==null&&b!==null?a-b:null;
  if(loss===null)flags.push('battery-level-unavailable');else if(loss<0)flags.push('battery-level-increased');
  const chargeLoss=start.chargeCounterUah!==null&&end.chargeCounterUah!==null&&start.chargeCounterUah>0&&end.chargeCounterUah>0?start.chargeCounterUah-end.chargeCounterUah:null;
  if(chargeLoss!==null&&chargeLoss<0)flags.push('charge-counter-increased');
  const estimateA=estimatedPower(start.checkin),estimateB=estimatedPower(end.checkin);
  const estimated=estimateA!==null&&estimateB!==null&&start.statsStart!==null&&start.statsStart===end.statsStart&&estimateB>=estimateA?estimateB-estimateA:null;
  return {hours,lossPercentagePoints:loss,lossPointsPerHour:loss!==null&&hours!==null?loss/hours:null,
    chargeLossUah:chargeLoss,estimatedPowerMah:estimated,flags:[...new Set(flags)],usable:flags.length===0,attribution:'whole-watch'};
}
