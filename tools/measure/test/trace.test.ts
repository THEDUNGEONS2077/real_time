/** Real-processor integration: a synthetic scheduler trace with a known 100 ms CPU interval. */
import { expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from '../perfetto.ts';
import { root } from '../../compose/src/build.ts';
import type { RunMetadata } from '../model.ts';

// Wire numbers come from Perfetto's Trace, TracePacket, ProcessTree and sched.proto schemas.
const varint=(n:number):Buffer=>{let v=BigInt(n);const bytes:number[]=[];while(v>127n){bytes.push(Number(v&127n)|128);v>>=7n;}bytes.push(Number(v));return Buffer.from(bytes);};
const number=(field:number,n:number)=>Buffer.concat([varint(field*8),varint(n)]);
const message=(field:number,b:Buffer)=>Buffer.concat([varint(field*8+2),varint(b.length),b]);
const string=(field:number,s:string)=>message(field,Buffer.from(s));
const concat=(...buffers:Buffer[])=>Buffer.concat(buffers);
const packet=(data:Buffer)=>message(1,data);

/** Generate a tiny truthful fixture, not a captured or claimed watch measurement. */
export function syntheticTrace():Buffer{
  const tree=concat(message(1,concat(number(1,100),number(2,1),string(3,'synthetic.renderer'))),message(2,concat(number(1,100),number(3,100),string(2,'render-thread'))));
  const event=(timestamp:number,prev:number,next:number)=>message(2,concat(number(1,timestamp),number(2,prev),message(4,concat(string(1,prev?'render-thread':'swapper'),number(2,prev),number(3,120),number(4,0),string(5,next?'render-thread':'swapper'),number(6,next),number(7,120)))));
  const ftrace=concat(number(1,0),event(1e9,0,100),event(1.1e9,100,0),event(31e9,0,100));
  return concat(packet(concat(number(8,1e9),number(10,1),message(2,tree))),packet(concat(number(10,2),message(1,ftrace))));
}
const processor=resolve(root,'.tools/perfetto-v53.0/trace_processor_shell');
it.skipIf(!existsSync(processor))('queries the pinned official processor and preserves unavailable frame metrics',async()=>{
  const dir=await mkdtemp(resolve(tmpdir(),'real-time-perfetto-'));
  try{
    await mkdir(resolve(dir,'trace'));
    await writeFile(resolve(dir,'trace/trace.perfetto-trace'),syntheticTrace());
    await writeFile(resolve(dir,'trace/recording-status.txt'),'complete');
    const result=await performance(dir,{rendererProcess:'synthetic.renderer'} as RunMetadata,processor);
    expect(result.reason).not.toContain('failed');
    expect(result.rendererCpuMs).toBeCloseTo(100);
    expect(result.durationMs).toBeCloseTo(30000);
    expect(result.dataLossEvents).toBe(0);
    expect(result.frameTiming).toBeNull();
    expect(result.status).toBe('partial');
  }finally{await rm(dir,{recursive:true,force:true});}
},20000);
