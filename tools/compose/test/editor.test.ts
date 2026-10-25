/** Cross-editor and cached-layer regressions exercise actual generated resources and selected WFF branches. */
import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { root } from '../src/build.ts';
import { frame } from '../src/model.ts';
import { nodeSvg } from '../src/preview.ts';
import { editorSettings } from '../faces/redline/editor.ts';
import { compileWatchface, imageData, style } from '../faces/redline/render.ts';
import { palettes, scene } from '../faces/redline/design.ts';
const exec=promisify(execFile),res=resolve(root,'faces/redline/src/main/res'),checker=resolve(root,'tools/check/verify_editor.py');

it('checks all 6144 setting combinations and all 26 real option resources',async()=>{
  const result=await exec('python3',['-I',checker,'--resources',res]);
  expect(JSON.parse(result.stdout)).toMatchObject({configurations:6144,editorOptions:26,maxRenderedParts:32,packaged:false});
},20000);
it('rejects missing icons and native configuration selectors inside the scene',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'real-time-editor-'));
  try{
    await mkdir(resolve(directory,'raw'));await symlink(resolve(res,'values'),resolve(directory,'values'));
    await symlink(resolve(res,'drawable-nodpi'),resolve(directory,'drawable-nodpi'));
    const source=await readFile(resolve(res,'raw/watchface.xml'),'utf8');
    for(const changed of [source.replace('icon="editor_palette_reference"',''),source.replace('<Scene backgroundColor="#000000">','<Scene backgroundColor="#000000"><Group name="bad" x="0" y="0" width="432" height="432"><ListConfiguration id="palette"><ListOption id="REFERENCE"><Group name="nested" x="0" y="0" width="432" height="432"/></ListOption></ListConfiguration></Group>')]){
      await writeFile(resolve(directory,'raw/watchface.xml'),changed);
      await expect(exec('python3',['-I',checker,'--resources',directory])).rejects.toMatchObject({code:1});
    }
  }finally{await rm(directory,{recursive:true,force:true});}
});
it('ships visible compact icons with distinct binary and palette choices',async()=>{
  const hashes=new Set<string>();
  for(const setting of editorSettings)for(const option of setting.options){
    const data=await readFile(resolve(res,`drawable-nodpi/${option.icon}.png`));
    const {data:pixels,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    expect(info.width).toBe(96);expect(info.height).toBe(96);expect(data.length).toBeLessThan(16384);
    let bright=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>200&&pixels[i]+pixels[i+1]+pixels[i+2]>300)bright++;
    expect(bright,option.icon).toBeGreaterThan(200);
    if(setting.id==='palette')hashes.add(data.toString('base64'));
  }
  expect(hashes.size).toBe(6);
  expect((await readFile(resolve(res,'drawable-nodpi/editor_ring_a_true.png'))).equals(await readFile(resolve(res,'drawable-nodpi/editor_ring_a_false.png')))).toBe(false);
});
it('preserves source geometry and colour after static/rotor caching, including motion and tilt',async()=>{
  const compiled=compileWatchface();
  for(const cache of compiled.caches){
    const images={...imageData(cache.palette as keyof typeof palettes)};
    for(const [file,data] of await cache.resources())images[file.split('/')[1].replace('.webp','')]='data:image/png;base64,'+(await sharp(data).png().toBuffer()).toString('base64');
    const s={...style,palettes:{REFERENCE:palettes[cache.palette as keyof typeof palettes]},imageData:images};
    for(const [speed,feel] of [['STANDARD','SMOOTH'],['FAST','DYNAMIC']] as const){
      const f=frame({time:new Date('2026-10-25T23:59:07.500Z'),tiltX:3,tiltY:-3});
      const original=scene(speed,feel),cached=cache.scene(original);
      const raster=async(nodes:typeof original)=>sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><rect width="432" height="432" fill="#030405"/>${nodes.map(n=>nodeSvg(n,f,'',s)).join('')}</svg>`)).removeAlpha().raw().toBuffer();
      const a=await raster(original),b=await raster(cached);let difference=0;
      for(let i=0;i<a.length;i++)difference+=Math.abs(a[i]-b[i]);
      // Baked masks are rasterized once, then rotated; subpixel antialiasing can differ from vector rotation.
      expect(difference/a.length,`${cache.palette} ${speed} ${feel}`).toBeLessThan(1.5);
    }
  }
},30000);

it('accepts PNG recompression but rejects altered packaged pixels',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'real-time-pixels-'));
  try{
    const raw=Buffer.from([25,80,130,255]);
    const image=sharp(raw,{raw:{width:1,height:1,channels:4}}),source=resolve(directory,'source.png');
    await image.clone().png({compressionLevel:9}).toFile(source);
    const same=await image.clone().png({compressionLevel:0}).toBuffer();
    const other=await sharp(Buffer.from([25,80,131,255]),{raw:{width:1,height:1,channels:4}}).png().toBuffer();
    for(const [buffer,status] of [[same,0],[other,1]] as const){
      const manifest=resolve(directory,'pair.json');await writeFile(manifest,JSON.stringify([{name:'test',source,packaged:buffer.toString('base64')}]));
      const command=exec('node',[resolve(root,'tools/check/image-pixels.mjs'),manifest]);
      if(status===0)await expect(command).resolves.toMatchObject({stderr:''});
      else await expect(command).rejects.toMatchObject({code:1});
    }
  }finally{await rm(directory,{recursive:true,force:true});}
});
