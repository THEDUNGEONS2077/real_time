/** Build-time layer caching: source vectors remain authoritative; only small cached layers reach the watch. */
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { Node, RenderStyle } from './model.ts';
import { frame } from './model.ts';
import { nodeSvg } from './preview.ts';

/** A deterministic layer record, shared by resource generation and equivalence checks. */
export interface BakedLayer { resource:string; svg:string; x:number; y:number; width:number; height:number; primitives:number }
/** Cache deduplicates static poses across speed/style branches and stores only selected-palette artwork. */
export class LayerCache {
  readonly layers=new Map<string,BakedLayer>();
  readonly palette:string; readonly style:RenderStyle;
  constructor(palette:string,style:RenderStyle) { this.palette=palette;this.style=style; }
  /** Flatten sufficiently large static runs, preserving painter order, live labels and group transforms. */
  scene(nodes:Node[]):Node[] {
    const result:Node[]=[];let pending:Node[]=[];
    const flush=()=>{result.push(...(pending.length>=8?[this.layer(pending)]:pending));pending=[];};
    for(const node of nodes){
      if(this.isStatic(node)){pending.push(node);continue;}
      flush();
      if(node.kind==='switch')result.push({...node,enabled:this.scene(node.enabled),disabled:this.scene(node.disabled)});
      else if(node.kind==='group')result.push({...node,children:this.scene(node.children)});
      else result.push(node);
    }
    flush();return result;
  }
  private isStatic(n:Node):boolean {
    return n.kind==='image'||['line','rect','circle','arc'].includes(n.kind)&&Object.values(n).every(v=>typeof v!=='object')&&!('warning' in n&&n.warning);
  }
  private layer(nodes:Node[]):Node {
    // Bounds include strokes and one antialiasing pixel. Full arc bounds deliberately overestimate short segments.
    const boxes=nodes.map(n=>{
      if(n.kind==='group'||n.kind==='switch'||n.kind==='clock'||n.kind==='label')throw new Error('Only static geometry can be baked.');
      const stroke='stroke' in n?(n.stroke??0)/2:0,x=Number(n.x??0),y=Number(n.y??0);
      let box:number[];
      if(n.kind==='arc')box=[(n.cx??216)-(n.r??0),(n.cy??216)-(n.r??0),(n.cx??216)+(n.r??0),(n.cy??216)+(n.r??0)];
      else if(n.kind==='circle')box=[x-(n.r??0),y-(n.r??0),x+(n.r??0),y+(n.r??0)];
      else if(n.kind==='line')box=[Math.min(x,n.x2!),Math.min(y,n.y2!),Math.max(x,n.x2!),Math.max(y,n.y2!)];
      else box=[x,y,x+(n.width??432),y+(n.height??432)];
      return box.map((v,i)=>v+(i<2?-1:1)*(stroke+1));
    });
    const x=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b[0])))),y=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b[1]))));
    const width=Math.min(432,Math.ceil(Math.max(...boxes.map(b=>b[2]))))-x,height=Math.min(432,Math.ceil(Math.max(...boxes.map(b=>b[3]))))-y;
    const body=nodes.map(n=>nodeSvg(n,frame(),' ',this.style)).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">${body}</svg>`;
    const resource=`cached_${this.palette.toLowerCase()}_${createHash('sha256').update(svg).digest('hex').slice(0,16)}`;
    this.layers.set(resource,{resource,svg,x,y,width,height,primitives:nodes.length});
    return {kind:'image',resource,x,y,width,height,alpha:255,role:'white',tint:false};
  }
  /** Rasterization happens once on the PC; no blur, vector tessellation or recolouring is added at runtime. */
  async resources():Promise<Map<string,Buffer>> {
    return new Map(await Promise.all([...this.layers].map(async([name,l])=>[`drawable-nodpi/${name}.webp`,await sharp(Buffer.from(l.svg)).webp({lossless:true,effort:6}).toBuffer()] as const)));
  }
}
