/** Original vector-authored masks: baked once at build time, never blurred on the watch. */
const document=(width:number,height:number,body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
/** Tight ink-width advances avoid the right-biased padding around narrow digits. */
export const glyph={width:74,height:118,oneWidth:16,narrowWidth:64,colonWidth:12};
/** WFF and SVG use the same proportional advances, with no added character spacing. */
export const glyphWidth=(character:string):number=>character===':'?glyph.colonWidth:character==='1'?glyph.oneWidth:'37'.includes(character)?glyph.narrowWidth:glyph.width;
const patterns=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
const shapes={a:'7,3 23,3 26,6 23,9 7,9 4,6',g:'7,24 23,24 26,27 23,30 7,30 4,27',d:'7,45 23,45 26,48 23,51 7,51 4,48',f:'3,8 6,11 6,23 3,26 0,23 0,11',b:'27,8 30,11 30,23 27,26 24,23 24,11',e:'3,29 6,32 6,44 3,47 0,44 0,32',c:'27,29 30,32 30,44 27,47 24,44 24,32'};
/** Hard-edged angular digits with a small pre-rendered white halo in interactive mode only. */
export function digitSvg(character:string,glow=true):string {
  // Extend 1's two stems to the common cap/baseline so even 11:11 is vertically centred.
  const one='<polygon points="27,3 30,6 30,23 27,26 24,23 24,6"/><polygon points="27,28 30,31 30,48 27,51 24,48 24,31"/>';
  const body=character===':'?'<rect x="4" y="16" width="4" height="5"/><rect x="4" y="33" width="4" height="5"/>':character==='1'?one:[...patterns[Number(character)]].map(s=>`<polygon points="${shapes[s as keyof typeof shapes]}"/>`).join('');
  const narrow='37'.includes(character),width=glyphWidth(character),inkWidth=character===':'?4:character==='1'?6:narrow?26:30,left=character===':'||narrow?4:character==='1'?24:0;
  // A one-pixel antialiasing edge (two for punctuation) keeps adjacent stems/dots legible.
  const inset=character===':'?2:1;
  return document(width,glyph.height,`<defs><filter id="g" x="-20%" y="-15%" width="140%" height="130%"><feGaussianBlur stdDeviation="0.7"/></filter></defs><g fill="white" transform="translate(${inset},0) scale(${(width-2*inset)/inkWidth},${glyph.height/54}) translate(${-left},0)">${glow?`<g opacity="0.2" filter="url(#g)">${body}</g>`:''}${body}</g>`);
}
/** White alpha masks are tinted by the face palette. No source-reference pixels are redistributed. */
export const icons={
  redline_glow:document(24,24,'<defs><radialGradient id="g"><stop stop-color="white" stop-opacity="0.55"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="12" cy="12" r="12" fill="url(#g)"/>'),
};
/** Static, low-contrast grid/triangulation. One cached layer replaces many changing fine primitives. */
export function meshSvg():string {
  const grid=Array.from({length:19},(_,i)=>`<path d="M${66+i*17} 75V365M65 ${75+i*16}H370"/>`).join('');
  const diagonals=Array.from({length:14},(_,i)=>`<path d="M${55+i*23} 110L${75+i*18} 345M${60+i*20} 335L${100+i*18} 85"/>`).join('');
  const dots=Array.from({length:75},(_,i)=>`<circle cx="${76+i*43%280}" cy="${85+i*67%273}" r="${i%5===0?0.8:0.45}" opacity="${i%5===0?0.9:0.5}"/>`).join('');
  const panels='<path d="M154 66L214 111L154 124ZM278 66L218 111L278 124ZM112 272L154 306L112 348ZM320 272L278 306L320 348ZM176 286L216 307L256 286L216 266Z"/>';
  return document(432,432,`<g fill="white" opacity="0.5">${panels}</g><g fill="none" stroke="white" stroke-width="0.5" opacity="0.4">${grid}</g><g fill="none" stroke="white" stroke-width="0.6" opacity="0.55">${diagonals}</g><g fill="white">${dots}</g>`);
}
