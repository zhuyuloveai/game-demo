// Art-preview motion only. No imports from the game or saved-state writes.
const tau=Math.PI*2;
export function movingMarkup(id,phase,refs={}){
 const q=((phase%1)+1)%1, sin=Math.sin(q*tau);
 if(id==='watermill')return `<g id="projected-wheel" transform="translate(427 435) matrix(.80 -.40 0 1 0 0)"><g id="wheel" transform="rotate(${q*360})"><image href="${refs.wheel||'wheel-local.png'}" x="-105" y="-105" width="210" height="210"/></g></g>`;
 if(id==='gazebo'){
  const flags=[[190,320,'#efb095'],[235,335,'#b7c990'],[280,345,'#f3cf8a'],[325,348,'#b5d5d5']];
  return `<path id="cord" d="M162 300 Q250 359 353 345" fill="none" stroke="#b48b63" stroke-width="3" stroke-linecap="round"/>`+flags.map(([x,y,c],i)=>`<g id="pennant-${i}" transform="translate(${x} ${y}) rotate(${Math.sin(q*tau+i*.6)*5})"><path d="M-10 0 Q0 3 10 4 L2 26Z" fill="${c}" stroke="#b48b63" stroke-width="2" stroke-linejoin="round"/></g>`).join('');
 }
 if(id==='lily-fountain'){
  const paths=['M329 187 C331 128 371 134 375 194 C383 255 376 309 366 370','M329 187 C313 146 299 162 307 210 C315 272 332 330 340 388'];
  const jets=paths.map((d,i)=>`<path id="jet-${i}" d="${d}" fill="none" stroke="#97d7db" stroke-width="9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#edf7e8" stroke-width="3" stroke-linecap="round" stroke-dasharray="12 22" stroke-dashoffset="${-q*136}"/>`).join('');
  const rings=[[366,370],[340,388]].map(([x,y],i)=>{const a=(q+i*.5)%1;return `<ellipse id="ripple-${i}" cx="${x}" cy="${y}" rx="${9+19*a}" ry="${3+7*a}" fill="none" stroke="#e4f4df" stroke-width="2.5" opacity="${Math.sin(a*Math.PI)*.75}"/>`;}).join('');
  return `<g id="flowing-water">${jets}${rings}</g>`;
 }
 if(id==='apiary')return [0,.5].map((offset,i)=>{const a=(q+offset)*tau,x=475+Math.cos(a)*54,y=400+Math.sin(a)*27;return `<g id="bee-${i}" transform="translate(${x} ${y}) rotate(${Math.cos(a)*9})"><image href="${refs.bee||'bee-local.png'}" x="-15" y="-15" width="30" height="30"/></g>`;}).join('');
 return '';
}
export const decorTiming={watermill:9000,gazebo:3600,'lily-fountain':1800,apiary:5200};
