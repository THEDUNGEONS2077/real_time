/** Diagnostic contracts: contamination, missing capabilities and hostile data must remain visible. */
import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { compareBattery, snapshot, estimatedPower } from '../battery.ts';
import { metadata } from '../model.ts';
import type { BatterySnapshot, RunMetadata } from '../model.ts';
import { parseCsv, performance } from '../perfetto.ts';
import { conditionDifferences, csvCell } from '../analyze.ts';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { root } from '../../compose/src/build.ts';

const start:BatterySnapshot={epoch:100000,uptime:1000,bootId:'same-boot',firmware:'same-build',level:90,scale:100,chargeCounterUah:270000,plugged:false,status:3,statsStart:1700000000000,
  history:'Battery History:\n +0ms (1) RESET\n +1s000ms (2) 090 -plugged',checkin:'9,0,l,pws,300,20,20,20',conditions:{brightness:'100',aod:'0'}};
const end:BatterySnapshot={...start,epoch:186400,uptime:87400,level:50,chargeCounterUah:150000,history:start.history+'\n +1d0h0m0s (2) 050',checkin:'9,0,l,pws,300,140,140,140'};

describe('battery interpretation',()=>{
  it('reports measured drain and modeled power separately',()=>{
    const result=compareBattery(start,end);
    expect(result.usable).toBe(true);expect(result.hours).toBe(24);
    expect(result.lossPercentagePoints).toBe(40);expect(result.lossPointsPerHour).toBeCloseTo(40/24);
    expect(result.chargeLossUah).toBe(120000);expect(result.estimatedPowerMah).toBe(120);expect(result.attribution).toBe('whole-watch');
  });
  it.each([
    [{bootId:'another'},'reboot'],[{statsStart:1700000001000},'statistics-reset'],
    [{plugged:true},'charging-at-endpoint'],[{status:2},'charging-at-endpoint'],
    [{history:start.history+'\n +1h0m0s (2) +plugged plug=usb\n +2h0m0s (2) -plugged'},'charging-during-interval'],
    [{history:start.history+'\n +3s (2) RESET'},'history-reset-or-reboot'],
    [{history:' +5s (2) 050'},'history-gap'],[{history:''},'history-unavailable'],
    [{firmware:'new-build'},'firmware-changed'],[{level:95},'battery-level-increased'],
    [{epoch:100000},'missing-or-invalid-duration'],[{conditions:{brightness:'200'}},'condition-changed:brightness'],
  ] as [Partial<BatterySnapshot>,string][])('flags contaminated data %j', (change,flag)=>{
    const result=compareBattery(start,{...end,...change});expect(result.flags).toContain(flag);expect(result.usable).toBe(false);
  });
  it('does not invent unsupported charge or power values',()=>{
    const result=compareBattery({...start,chargeCounterUah:null,checkin:''},{...end,chargeCounterUah:0,checkin:''});
    expect(result.chargeLossUah).toBeNull();expect(result.estimatedPowerMah).toBeNull();expect(estimatedPower('malformed')).toBeNull();
  });
  it('parses Android checkin start clock without mistaking total uptime for it',async()=>{
    const dir=await mkdtemp(resolve(tmpdir(),'real-time-battery-'));
    try{
      await writeFile(resolve(dir,'battery.txt'),'Current Battery Service state:\n  AC powered: false\n  USB powered: false\n  Wireless powered: false\n  Charge counter: 230000\n  status: 3\n  level: 80\n  scale: 100\n');
      await writeFile(resolve(dir,'batterystats-checkin.txt'),'9,0,l,bt,3,850000,700000,900000,800000,1700000000000,200000,180000,300');
      const result=await snapshot(dir);expect(result.statsStart).toBe(1700000000000);expect(result.chargeCounterUah).toBe(230000);expect(result.plugged).toBe(false);expect(result.epoch).toBeNull();
    }finally{await rm(dir,{recursive:true,force:true});}
  });
});
describe('trace handling and metadata',()=>{
  it('handles quoted process names and rejects truncated CSV',()=>{
    expect(parseCsv('name,cpu_ms\n"renderer, \"\"main\"\"",2.5\n')).toEqual([['name','cpu_ms'],['renderer, "main"','2.5']]);
    expect(()=>parseCsv('"unfinished')).toThrow('Interrupted');
    expect(csvCell('=HYPERLINK("untrusted")')).toContain("'=HYPERLINK");
    expect(csvCell(-3)).toBe('"-3"');
  });
  it('requires provenance and identifies comparison condition changes',()=>{
    expect(()=>metadata({schemaVersion:1})).toThrow('id');
    const a={firmware:'a',brightness:'100',screenTimeoutSeconds:60,connectivity:'BT',aod:false,kind:'battery'} as RunMetadata;
    expect(conditionDifferences(a,{...a,firmware:'b',aod:true})).toEqual(['firmware','aod']);
  });
  it('accepts future-face effect names while requiring all HALO switches',()=>{
    const run={schemaVersion:1,id:'future-01',face:'future',version:'0.1.0',commit:'abcdef123',palette:'CUSTOM',effects:{particles:true},aod:false,brightness:'100',screenTimeoutSeconds:60,connectivity:'BT; debug on',firmware:'test-build',notes:'Synthetic metadata',kind:'performance'};
    expect(metadata(run).effects).toEqual({particles:true});
    expect(()=>metadata({...run,face:'halo'})).toThrow('effects.seconds');
    expect(()=>metadata({...run,commit:'REPLACE_WITH_BUILD_COMMIT'})).toThrow('actual source commit');
  });
  it('rejects combined verify-only and publish flags before any build or remote operation',async()=>{
    await expect(promisify(execFile)('bash',[resolve(root,'scripts/release-wear.sh'),'--verify-only','--publish'])).rejects.toMatchObject({code:2});
  });
  it('marks interrupted and unsupported traces unavailable instead of zero',async()=>{
    const dir=await mkdtemp(resolve(tmpdir(),'real-time-trace-'));
    try{
      const m={} as RunMetadata;
      expect((await performance(dir,m)).status).toBe('unavailable');
      await mkdir(resolve(dir,'trace'));await writeFile(resolve(dir,'trace/recording-status.txt'),'complete');
      await writeFile(resolve(dir,'trace/trace.perfetto-trace'),'not a valid trace');
      expect((await performance(dir,m)).rendererCpuMs).toBeNull();
      const result=await performance(dir,m,'/bin/false');expect(result.status).toBe('unavailable');expect(result.reason).toContain('failed');
    }finally{await rm(dir,{recursive:true,force:true});}
  });
});

it('requires REDLINE speed/style metadata and flags changes while retaining legacy runs',()=>{
  const run={schemaVersion:1,id:'redline-speed',face:'redline',version:'0.2.0',commit:'abcdef123',palette:'REFERENCE',effects:Object.fromEntries(['seconds','ring_a','ring_b','breathing','nodes','scan','tilt'].map(k=>[k,true])),aod:false,brightness:'100',screenTimeoutSeconds:60,connectivity:'BT',firmware:'build',notes:'',kind:'performance'};
  expect(()=>metadata(run)).toThrow('motionSpeed');
  const a=metadata({...run,motionSpeed:'STANDARD',motionStyle:'SMOOTH'});
  expect(conditionDifferences(a,{...a,motionSpeed:'FAST',motionStyle:'DYNAMIC'})).toEqual(['motionSpeed','motionStyle']);
  expect(()=>metadata({...a,motionSpeed:'TURBO'})).toThrow('Invalid motionSpeed');
  expect(metadata({...run,version:'0.1.1'}).motionSpeed).toBeUndefined();
});
