/** Original vector-authored masks: baked once at build time, never blurred on the watch. */
const document=(width:number,height:number,body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
/** Segments and metrics match REDLINE's BitmapFont and preview clock. */
export const glyph={width:34,height:54,colonWidth:12};
const patterns=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
const shapes={a:'7,3 23,3 26,6 23,9 7,9 4,6',g:'7,24 23,24 26,27 23,30 7,30 4,27',d:'7,45 23,45 26,48 23,51 7,51 4,48',f:'3,8 6,11 6,23 3,26 0,23 0,11',b:'27,8 30,11 30,23 27,26 24,23 24,11',e:'3,29 6,32 6,44 3,47 0,44 0,32',c:'27,29 30,32 30,44 27,47 24,44 24,32'};
/** Hard-edged angular digits with a small pre-rendered white halo in interactive mode only. */
export function digitSvg(character:string,glow=true):string {
  const body=character===':'?'<rect x="4" y="16" width="4" height="5"/><rect x="4" y="33" width="4" height="5"/>':[...patterns[Number(character)]].map(s=>`<polygon points="${shapes[s as keyof typeof shapes]}"/>`).join('');
  return document(character===':'?glyph.colonWidth:glyph.width,glyph.height,`<defs><filter id="g" x="-20%" y="-15%" width="140%" height="130%"><feGaussianBlur stdDeviation="0.7"/></filter></defs><g fill="white" transform="translate(${character===':'?0:2},0)">${glow?`<g opacity="0.2" filter="url(#g)">${body}</g>`:''}${body}</g>`);
}
/** White alpha masks are tinted by the face palette. No source-reference pixels are redistributed. */
export const icons={
  redline_mark:document(20,18,'<path d="M10 1L19 17H1ZM10 7L6 14H14Z" fill="white" fill-rule="evenodd"/>'),
  redline_steps:document(24,22,'<path d="M4 13L9 10L11 3L16 2L18 6L15 11L21 14L23 17L20 20H4L1 18L2 15Z" fill="white"/><path d="M8 9L13 12M7 12L11 14M4 17H21" stroke="#030405" stroke-width="1"/>'),
  redline_battery:document(24,13,'<path d="M1 1H20V12H1ZM20 4H23V9H20" stroke="white" stroke-width="1.2" fill="none"/><path d="M4 4H17V9H4Z" fill="white" opacity="0.35"/>'),
  redline_timer:document(24,30,'<circle cx="12" cy="18" r="9.5" fill="none" stroke="white" stroke-width="1.6"/><path d="M8 2H16M12 2V8M12 12V19L15 21" fill="none" stroke="white" stroke-width="1.8"/>'),
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
