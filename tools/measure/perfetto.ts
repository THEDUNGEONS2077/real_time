/** Trace analysis layer: query a trusted, explicitly supplied Perfetto processor without a shell. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { optionalText } from './battery.ts';
import type { RunMetadata } from './model.ts';
const execute=promisify(execFile);

/** Available metrics retain their scope; missing tracks are never converted to zero. */
export interface PerformanceResult {
  status:'unavailable'|'partial'|'available'; reason:string|null;
  cpuMsByProcess:{process:string;cpuMs:number}[]|null;
  rendererCpuMs:number|null;
  frameTiming:{count:number;p50Ms:number;p95Ms:number;jankCount:number}|null;
  durationMs:number|null; dataLossEvents:number|null;
  frameLayers:string[]; attribution:'shared renderer / selected surface, not exclusive face energy';
}
/** Parse CSV including quoted names and escaped quotes from trace_processor. */
export function parseCsv(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('Interrupted CSV export.');
  if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
/** Inspect a trace if a processor and a completed capture exist. */
export async function performance(directory:string,m:RunMetadata,processor?:string):Promise<PerformanceResult>{
  const result:PerformanceResult={status:'unavailable',reason:null,cpuMsByProcess:null,rendererCpuMs:null,frameTiming:null,durationMs:null,dataLossEvents:null,frameLayers:[],attribution:'shared renderer / selected surface, not exclusive face energy'};
  const path=resolve(directory,'trace/trace.perfetto-trace');
  if((await optionalText(resolve(directory,'trace/recording-status.txt')))?.trim()!=='complete'){result.reason='Trace absent or capture did not complete.';return result;}
  if(!(await stat(path).catch(()=>null))?.size){result.reason='Trace is missing or empty.';return result;}
  if(!processor){result.reason='Supply --trace-processor /absolute/path/to/trace_processor to analyze the exported trace.';return result;}
  if(!isAbsolute(processor))throw new Error('Trace processor must be an explicit absolute path to a trusted executable.');
  const query=async(sql:string)=>{
    // Non-interactive -Q output is CSV in the pinned processor; there is no --csv flag.
    const {stdout}=await execute(processor,['-Q',sql,path],{timeout:60000,maxBuffer:8*1024*1024});
    return parseCsv(stdout).slice(1);
  };
  try{
    const duration=await query('SELECT (end_ts-start_ts)/1e6 AS duration_ms FROM trace_bounds;');
    if(duration.length&&Number(duration[0][0])>0)result.durationMs=Number(duration[0][0]);
    const loss=await query("SELECT COALESCE(SUM(value),0) FROM stats WHERE severity='data_loss' AND value>0;");
    if(loss.length)result.dataLossEvents=Number(loss[0][0]);
    const rows=await query('SELECT p.name, SUM(s.dur)/1e6 AS cpu_ms FROM sched s JOIN thread t USING(utid) JOIN process p USING(upid) WHERE s.dur > 0 GROUP BY p.upid ORDER BY cpu_ms DESC;');
    if(rows.length){result.cpuMsByProcess=rows.map(([process,ms])=>({process,cpuMs:Number(ms)}));result.status='partial';}
    if(m.rendererProcess&&result.cpuMsByProcess){const matching=result.cpuMsByProcess.filter(r=>r.process===m.rendererProcess);if(matching.length)result.rendererCpuMs=matching.reduce((s,r)=>s+r.cpuMs,0);}
    const layers=await query('SELECT DISTINCT layer_name FROM actual_frame_timeline_slice WHERE layer_name IS NOT NULL;').catch(()=>[]);
    result.frameLayers=layers.map(r=>r[0]);
    if(m.rendererLayer&&result.frameLayers.includes(m.rendererLayer)){
      const rows=await query(`SELECT dur/1e6, jank_type FROM actual_frame_timeline_slice WHERE layer_name=${quote(m.rendererLayer)} AND dur>0 ORDER BY dur;`);
      if(rows.length){const durations=rows.map(r=>Number(r[0]));result.frameTiming={count:rows.length,p50Ms:durations[Math.ceil(rows.length*.5)-1],p95Ms:durations[Math.ceil(rows.length*.95)-1],jankCount:rows.filter(r=>r[1]&&r[1]!=='None').length};result.status=result.rendererCpuMs===null?'partial':'available';}
    }
    result.reason=result.status==='unavailable'?'No supported scheduling or attributed frame tracks.':result.status==='partial'?'Some tracks or renderer attribution are unavailable.':null;
    if(result.dataLossEvents){result.status='partial';result.reason='Trace reports data loss; repeat with fewer sources or a larger buffer before comparing.';}
  }catch(error){result.status=result.cpuMsByProcess?'partial':'unavailable';result.reason=`Trace processing failed: ${(error as Error).message}`;}
  return result;
}
