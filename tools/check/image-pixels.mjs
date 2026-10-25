/** Verify AAPT2-reencoded PNGs by decoded pixels; lossless encoding/chunk changes are legitimate. */
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
const chunks=[];if(!process.argv[2])for await(const chunk of process.stdin)chunks.push(chunk);
const pairs=JSON.parse(process.argv[2]?await readFile(process.argv[2],'utf8'):Buffer.concat(chunks).toString('utf8'));
const pixels=async input=>sharp(input,{limitInputPixels:432*432*4}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const results=await Promise.allSettled(pairs.map(async pair=>{
  const [a,b]=await Promise.all([pixels(await readFile(pair.source)),pixels(Buffer.from(pair.packaged,'base64'))]);
  if(a.info.width!==b.info.width||a.info.height!==b.info.height||!a.data.equals(b.data))throw new Error(`Packaged pixels differ: ${pair.name}`);
}));
for(const result of results)if(result.status==='rejected')throw result.reason;
console.log(`Verified ${pairs.length} reencoded PNGs by pixel content.`);
