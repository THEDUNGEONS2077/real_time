/** Measurement data layer: explicit provenance and unavailable values, never invented telemetry. */
import type { Effect } from '../compose/src/model.ts';
import { effects } from '../compose/src/model.ts';

/** Human-recorded conditions which the WFF package cannot log itself. */
export interface RunMetadata {
  schemaVersion:1; id:string; face:string; version:string; commit:string;
  palette:string; effects:Record<Effect,boolean>; aod:boolean;
  brightness:string; screenTimeoutSeconds:number; connectivity:string;
  firmware:string; notes:string; kind:'battery'|'performance';
  rendererProcess?:string; rendererLayer?:string;
}
/** Fail closed on missing provenance before comparing two runs. */
export function metadata(input:unknown):RunMetadata {
  if(!input||typeof input!=='object')throw new Error('run.json must be an object.');
  const m=input as Record<string,unknown>;
  if(m.schemaVersion!==1)throw new Error('Unsupported run.json schemaVersion.');
  for(const key of ['id','face','version','commit','palette','brightness','connectivity','firmware','notes'])if(typeof m[key]!=='string'||(key!=='notes'&&!(m[key] as string).trim()))throw new Error(`run.json requires ${key}.`);
  if(!/^(?:[a-fA-F0-9]{7,40}|system)$/.test(String(m.commit)))throw new Error('Record the actual source commit, or system for a stock face.');
  for(const key of ['brightness','connectivity','firmware'])if(/^(RECORD_|COPY_)/.test(String(m[key])))throw new Error(`Replace the ${key} placeholder with the actual setting.`);
  if(m.kind!=='battery'&&m.kind!=='performance')throw new Error('kind must be battery or performance.');
  if(typeof m.aod!=='boolean'||typeof m.screenTimeoutSeconds!=='number'||!Number.isFinite(m.screenTimeoutSeconds)||m.screenTimeoutSeconds<=0)throw new Error('Record AOD and a positive screen timeout.');
  if(!m.effects||typeof m.effects!=='object')throw new Error('Record every effect switch.');
  for(const e of effects)if(typeof (m.effects as Record<string,unknown>)[e]!=='boolean')throw new Error(`Record effects.${e}.`);
  for(const key of ['rendererProcess','rendererLayer'])if(m[key]!==undefined&&typeof m[key]!=='string')throw new Error(`${key} must be a string when provided.`);
  return m as unknown as RunMetadata;
}
/** A snapshot may have unsupported battery fields. Null never means zero. */
export interface BatterySnapshot {
  epoch:number|null; uptime:number|null; bootId:string|null; firmware:string|null;
  level:number|null; scale:number|null; chargeCounterUah:number|null;
  plugged:boolean|null; status:number|null; statsStart:number|null;
  history:string; checkin:string; conditions:Record<string,string|null>;
}
/** Interpretation flags prevent contaminated intervals from passing silently. */
export interface BatteryResult {
  hours:number|null; lossPercentagePoints:number|null; lossPointsPerHour:number|null;
  chargeLossUah:number|null; estimatedPowerMah:number|null;
  flags:string[]; usable:boolean; attribution:'whole-watch';
}
