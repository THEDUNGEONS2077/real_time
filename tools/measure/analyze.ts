/** Measurement entrypoint: turn phone exports into private JSON, CSV and readable reports. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareBattery, snapshot } from './battery.ts';
import { metadata } from './model.ts';
import type { RunMetadata } from './model.ts';
import { performance } from './perfetto.ts';

/** Analyze a directory; input exports are always data and cannot supply executable commands. */
export async function analyze(input:string,processor?:string){
  const meta=metadata(JSON.parse(await readFile(resolve(input,'run.json'),'utf8')));
  const start=await snapshot(resolve(input,'start')),end=await snapshot(resolve(input,'end'));
  const battery=compareBattery(start,end);
  if(meta.aod)battery.flags.push('aod-enabled-outside-baseline');
  if(meta.kind==='battery'&&battery.hours!==null&&Math.abs(battery.hours-24)>1)battery.flags.push('duration-outside-24h-protocol');
  if(start.firmware&&meta.firmware!==start.firmware)battery.flags.push('metadata-firmware-mismatch');
  battery.usable=battery.flags.length===0;
  return {schemaVersion:1,metadata:meta,battery,performance:await performance(input,meta,processor),
    sources:{start,end},limitations:['Battery drain covers the entire watch.','Shared renderer CPU and surface timing are not exclusive face energy.','A single daily comparison is observational; repeat noisy results.','Unavailable metrics are null, not zero.']};
}
/** Conditions that must match before assigning a difference to the face/effect change. */
export function conditionDifferences(a:RunMetadata,b:RunMetadata):string[]{
  return (['firmware','brightness','screenTimeoutSeconds','connectivity','aod','kind'] as const).filter(k=>a[k]!==b[k]);
}
type Report=Awaited<ReturnType<typeof analyze>>;
/** A comparison is qualified rather than silently normalizing incompatible experiments. */
export function comparison(a:Report,b:Report){
  const differences=conditionDifferences(a.metadata,b.metadata);
  const flags=[...differences.map(k=>`different-condition:${k}`)];
  if(a.metadata.kind==='battery'||b.metadata.kind==='battery')flags.push(...a.battery.flags.map(f=>`baseline:${f}`),...b.battery.flags.map(f=>`candidate:${f}`));
  else{
    for(const [name,r] of [['baseline',a],['candidate',b]] as const){
      if(r.performance.durationMs===null||Math.abs(r.performance.durationMs-30000)>3000)flags.push(`${name}:trace-duration-outside-protocol`);
      if(r.performance.dataLossEvents===null||r.performance.dataLossEvents>0)flags.push(`${name}:trace-loss-or-unverified`);
      if(r.performance.rendererCpuMs===null&&r.performance.frameTiming===null)flags.push(`${name}:no-attributed-metrics`);
    }
    if(a.metadata.rendererProcess!==b.metadata.rendererProcess||a.metadata.rendererLayer!==b.metadata.rendererLayer)flags.push('different-renderer-selection');
  }
  const n=a.battery.lossPointsPerHour,m=b.battery.lossPointsPerHour;
  const difference=(a:number|null|undefined,b:number|null|undefined)=>a!==null&&a!==undefined&&b!==null&&b!==undefined?b-a:null;
  return {baseline:a.metadata.id,candidate:b.metadata.id,extraPointsPerHour:n!==null&&m!==null?m-n:null,
    projectedExtraPointsPer24h:n!==null&&m!==null?(m-n)*24:null,
    rendererCpuDeltaMs:difference(a.performance.rendererCpuMs,b.performance.rendererCpuMs),
    frameP95DeltaMs:difference(a.performance.frameTiming?.p95Ms,b.performance.frameTiming?.p95Ms),
    qualified:flags.length===0,flags,note:'24-hour value is a rate projection, not an isolated measurement of the face.'};
}
const display=(n:number|null,unit:string)=>n===null?'unavailable':`${n.toFixed(3)} ${unit}`;
/** Human report clearly separates measurements, Android estimates and missing data. */
export function markdown(r:Report):string{
  const {metadata:m,battery:b,performance:p}=r;
  return `# real_time measurement: ${m.id}\n\n${m.face} ${m.version} · ${m.commit}\n\n`+
    `- Firmware: ${m.firmware}\n- Palette: ${m.palette}\n- Effects: ${Object.entries(m.effects).map(([k,v])=>`${k}=${v?'on':'off'}`).join(', ')}\n`+
    `- AOD: ${m.aod?'on':'off'}; brightness: ${m.brightness}; timeout: ${m.screenTimeoutSeconds}s; connectivity: ${m.connectivity}\n\n`+
    `## Battery: whole watch\n\n- Duration: ${display(b.hours,'hours')}\n- Observed loss: ${display(b.lossPercentagePoints,'percentage points')}\n`+
    `- Observed drain: ${display(b.lossPointsPerHour,'percentage points/hour')}\n- Charge counter change: ${display(b.chargeLossUah,'µAh')}\n`+
    `- Android modeled power difference: ${display(b.estimatedPowerMah,'mAh (estimate)')}\n- Interval: ${b.usable?'no detected contamination':'requires review'}\n`+
    `- Flags: ${b.flags.join(', ')||'none'}\n\n## Performance\n\n- Status: ${p.status}${p.reason?` — ${p.reason}`:''}\n`+
    `- Trace coverage: ${display(p.durationMs,'ms')}; data-loss events: ${p.dataLossEvents??'unavailable'}\n`+
    `- Selected renderer CPU: ${display(p.rendererCpuMs,'ms')}\n- Selected surface frame timing: ${p.frameTiming?`${p.frameTiming.count} frames, p50 ${p.frameTiming.p50Ms.toFixed(3)} ms, p95 ${p.frameTiming.p95Ms.toFixed(3)} ms, ${p.frameTiming.jankCount} marked janky`:'unavailable'}\n`+
    `- Scope: ${p.attribution}\n- Available frame layers: ${p.frameLayers.join(', ')||'unavailable'}\n\n## Notes and limits\n\n${m.notes||'No operator notes.'}\n\n${r.limitations.map(l=>`- ${l}`).join('\n')}\n`;
}
/** RFC 4180 CSV escaping also prevents spreadsheet formula execution in string cells. */
export function csvCell(value:unknown):string{
  if(value===null||value===undefined)return '';
  const s=String(value),safe=typeof value==='string'&&/^[=+@\-\t\r]/.test(s)?`'${s}`:s;
  return '"'+safe.replaceAll('"','""')+'"';
}
/** Write reviewable reports without changing the source captures. */
export async function reports(r:Report,out:string):Promise<void>{
  await mkdir(out,{recursive:true});
  await writeFile(resolve(out,'report.json'),JSON.stringify(r,null,2)+'\n');
  await writeFile(resolve(out,'report.md'),markdown(r));
  const values={id:r.metadata.id,face:r.metadata.face,version:r.metadata.version,commit:r.metadata.commit,
    ...r.metadata.effects,palette:r.metadata.palette,firmware:r.metadata.firmware,
    hours:r.battery.hours,lossPointsPerHour:r.battery.lossPointsPerHour,chargeLossUah:r.battery.chargeLossUah,
    estimatedPowerMah:r.battery.estimatedPowerMah,rendererCpuMs:r.performance.rendererCpuMs,
    frameP50Ms:r.performance.frameTiming?.p50Ms??null,frameP95Ms:r.performance.frameTiming?.p95Ms??null,
    jankCount:r.performance.frameTiming?.jankCount??null,flags:r.battery.flags.join(';')};
  await writeFile(resolve(out,'report.csv'),Object.keys(values).map(csvCell).join(',')+'\r\n'+Object.values(values).map(csvCell).join(',')+'\r\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),argument=(key:string)=>{const i=args.indexOf(key);return i>=0?args[i+1]:undefined;};
  const input=argument('--input');if(!input)throw new Error('Usage: npm run measure -- --input RUN_DIR [--out REPORT_DIR] [--trace-processor ABS_PATH] [--baseline OTHER_RUN_DIR]');
  const result=await analyze(resolve(input),argument('--trace-processor'));
  const out=resolve(argument('--out')??resolve(input,'analysis'));await reports(result,out);
  const baseline=argument('--baseline');
  if(baseline){const compared=comparison(await analyze(resolve(baseline),argument('--trace-processor')),result);await writeFile(resolve(out,'comparison.json'),JSON.stringify(compared,null,2)+'\n');}
  console.log(`Reports: ${out}/report.md`);
}
