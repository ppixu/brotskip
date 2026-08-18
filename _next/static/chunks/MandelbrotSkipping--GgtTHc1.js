import{r as e}from"./rolldown-runtime-vU33u7is.js";import{i as t,r as n}from"./framework-EwgI_Pa9.js";var r=e(n(),1);async function i(e){let t=navigator.gpu;if(!t)return e(`WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.`),null;let n=await t.requestAdapter({powerPreference:`high-performance`});if(!n)return e(`No GPU adapter found. Throwing still works in reduced visual mode.`),null;let r=await n.requestDevice(),i=!1;r.addEventListener(`uncapturederror`,t=>{i=!0;let n=t.error?.message||String(t.error);console.error(`WebGPU validation`,n),e(`WebGPU validation error: ${n}`)}),r.lost.then(()=>{i=!0,e(`The GPU device was lost. Reload to restore orbit trails.`)});let a=!1;return{device:r,preferredFormat:t.getPreferredCanvasFormat(),hasFailed:()=>i,destroy:()=>{a||(a=!0,r.destroy())}}}var a=t();function o({progress:e,fading:t,ready:n,onPlay:r}){return(0,a.jsxs)(`div`,{className:`introOverlay ${t?`fading`:``}`,role:`status`,"aria-label":`Charting the pond`,children:[(0,a.jsxs)(`div`,{className:`introChrome`,children:[(0,a.jsx)(`span`,{className:`introTitle`,children:`Mandelbrot Skipping`}),!n&&(0,a.jsx)(`span`,{className:`liveProgress`,children:(0,a.jsx)(`i`,{style:{width:`${Math.max(2,e*100)}%`}})})]}),n&&(0,a.jsx)(`button`,{type:`button`,className:`introPlay`,onClick:r,"aria-label":`Play`,children:`Play`})]})}var s={trigger:`Buddhabrot`,title:`Buddhabrot`,formula:`z → z² + c`,paragraphs:[`The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.`,`Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. Raise the iteration limit and the picture thins into finer filaments: only the longest escapes remain, as in the animation.`],gif:{file:`buddhabrot-iterations.gif`,alt:`Buddhabrot forming as the maximum iteration count increases`,credit:`Tacodude7729 / Wikimedia Commons`,license:`CC BY-SA 4.0`,licenseUrl:`https://creativecommons.org/licenses/by-sa/4.0/`,sourceUrl:`https://commons.wikimedia.org/wiki/File:BuddhabrotIterationAnimation7729.gif`,articleUrl:`https://en.wikipedia.org/wiki/Buddhabrot`}};function c(){let{trigger:e,title:t,formula:n,paragraphs:r,gif:i}=s;return(0,a.jsxs)(`div`,{className:`howItWorks`,children:[(0,a.jsx)(`button`,{type:`button`,className:`howItWorksTrigger`,"aria-describedby":`how-it-works-panel`,children:e}),(0,a.jsxs)(`div`,{id:`how-it-works-panel`,className:`howItWorksPanel`,role:`tooltip`,children:[(0,a.jsx)(`p`,{className:`howItWorksKicker`,children:t}),(0,a.jsx)(`img`,{className:`howItWorksFilm`,src:i.file,alt:i.alt,width:600,height:337}),(0,a.jsx)(`p`,{className:`howItWorksFormula`,children:n}),r.map(e=>(0,a.jsx)(`p`,{children:e},e.slice(0,24))),(0,a.jsxs)(`p`,{className:`howItWorksCredit`,children:[`Animation:`,` `,(0,a.jsx)(`a`,{href:i.sourceUrl,target:`_blank`,rel:`noreferrer`,children:i.credit}),`,`,` `,(0,a.jsx)(`a`,{href:i.licenseUrl,target:`_blank`,rel:`noreferrer`,children:i.license}),`. Summary after the`,` `,(0,a.jsx)(`a`,{href:i.articleUrl,target:`_blank`,rel:`noreferrer`,children:`Wikipedia Buddhabrot article`}),`.`]})]})]})}var l=.04;function u(e){let t=e.onScreen?0:e.offscreenStreak+1,n=e.hopPx<=.04?e.tinyHopStreak+1:0,r=!Number.isFinite(e.hopPx)||!Number.isFinite(e.magSq),i=e.magSq>4;return{resolved:r||i||n>=500||t>=800,offscreenStreak:t,tinyHopStreak:n}}var d=.76;function f(e,t=d){let n=(1-t**14)/(1-t),r=Math.min(Math.max(e(),0),.999999999)*n;for(let e=2;e<=15;e++)if(r-=t**(e-2),r<0)return e;return 15}function p(e,t,n,r){let i=Math.max(n,r),a=e+n>i?0:e;return{start:a,nextSource:(a+n)%i,sourceCount:Math.min(i,t+n)}}function m(e,t,n){let r=Math.max(0,n-e),i=Math.min(t,r);return{start:e,nextSource:e+i,sourceCount:e+i,added:i}}var h=1024,g=99.92;function _(e,t,n){let r=e.length,i=0;for(let t=0;t<r;t++)i+=e[t];if(i===0)return 0;let a=i*n/100,o=0;for(let n=0;n<r;n++){let i=e[n];if(i>0&&o+i>=a){let e=(a-o)/i;return(n+e)/r*t}o+=i}return t}function v(e,t=20){if(!(t>0))return{low:0,high:1};let n=_(e,t,54),r=_(e,t,g);return{low:n,high:Math.max(r,n+1e-9)}}var y=.05;function b(e){return!Number.isFinite(e)||e<0?0:Math.min(e,y)}function ee(e,t){let n=t.maxSamplesPerFrame??2e6,r=t.minDurationMs??5e3;if(r<=0)return n;let i=b(e)*1e3/r;return Math.max(1,Math.min(n,Math.floor(t.totalSamples*i)))}var x={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5},S=`
struct Params {
  size: u32,
  seedBase: u32,
  sampleCount: u32,
  maxIterations: u32,
  bounds: vec4f,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> density: array<atomic<u32>>;

fn hash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn nextFloat(state: ptr<function, u32>) -> f32 {
  *state = hash(*state);
  return f32(*state) / 4294967296.0;
}

@compute @workgroup_size(64)
fn accumulate(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.sampleCount) { return; }
  var state = hash(id.x ^ hash(params.seedBase));
  let cr = mix(params.bounds.x, params.bounds.y, nextFloat(&state));
  let ci = mix(params.bounds.z, params.bounds.w, nextFloat(&state));

  var zr = 0.0;
  var zi = 0.0;
  var escapedAt = 0u;
  for (var step = 1u; step <= params.maxIterations; step++) {
    let nextR = zr * zr - zi * zi + cr;
    let nextI = 2.0 * zr * zi + ci;
    zr = nextR;
    zi = nextI;
    if (zr * zr + zi * zi > 4.0) { escapedAt = step; break; }
  }
  if (escapedAt < 5u) { return; }

  let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
  let sizeF = f32(params.size);
  zr = 0.0;
  zi = 0.0;
  for (var step = 1u; step <= escapedAt; step++) {
    let nextR = zr * zr - zi * zi + cr;
    let nextI = 2.0 * zr * zi + ci;
    zr = nextR;
    zi = nextI;
    if (zr < params.bounds.x || zr >= params.bounds.y) { continue; }
    if (zi < params.bounds.z || zi >= params.bounds.w) { continue; }
    let px = u32((zr - params.bounds.x) / span.x * sizeF);
    let py = u32((params.bounds.w - zi) / span.y * sizeF);
    if (px < params.size && py < params.size) {
      atomicAdd(&density[py * params.size + px], 1u);
    }
  }
}
`,C=`
struct Params { size: u32, pad0: u32, pad1: u32, pad2: u32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> density: array<u32>;
@group(0) @binding(2) var<storage, read_write> bins: array<atomic<u32>>;

@compute @workgroup_size(8, 8)
fn histogram(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.size || id.y >= params.size) { return; }
  let value = density[id.y * params.size + id.x];
  // Percentiles are taken over occupied pixels only, matching the Python.
  if (value == 0u) { return; }
  let light = log(1.0 + f32(value));
  let scaled = light / 20.0 * ${h}.0;
  let bin = min(${h}u - 1u, u32(max(scaled, 0.0)));
  atomicAdd(&bins[bin], 1u);
}
`,w=`
struct Params { size: u32, pad: u32, low: f32, high: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> density: array<u32>;
@group(0) @binding(2) var output: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn colorize(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.size || id.y >= params.size) { return; }
  let value = density[id.y * params.size + id.x];
  let light = log(1.0 + f32(value));
  let normalized = clamp((light - params.low) / max(params.high - params.low, 1e-9), 0.0, 1.0);
  let contrast = pow(normalized, 1.68);
  var alpha = clamp((contrast - 0.018) * 1.55, 0.0, 1.0);
  if (contrast < 0.055) { alpha = 0.0; }
  let color = vec3f(
    (8.0 + contrast * 235.0) / 255.0,
    (72.0 + contrast * 183.0) / 255.0,
    (92.0 + contrast * 143.0) / 255.0,
  );
  textureStore(output, vec2i(id.xy), vec4f(color, alpha));
}
`,te=`
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) index: u32) -> VSOut {
  let points = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(points[index], 0.0, 1.0);
  out.uv = points[index] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  let sampled = textureSample(source, sourceSampler, in.uv);
  // Canvas contexts are configured premultiplied; the storage texture is not.
  return vec4f(sampled.rgb * sampled.a, sampled.a);
}
`,ne={2048:16e6,4096:64e6};function re(e,t){let n=e.device,r=globalThis.GPUBufferUsage,i=globalThis.GPUTextureUsage,{size:a}=t,o=a*a,s=t.totalSamples??ne[a]??16e6,c=t.maxIterations??320,l=n.createBuffer({size:o*4,usage:r.STORAGE|r.COPY_DST}),u=n.createBuffer({size:h*4,usage:r.STORAGE|r.COPY_DST|r.COPY_SRC}),d=n.createBuffer({size:h*4,usage:r.COPY_DST|r.MAP_READ}),f=n.createBuffer({size:32,usage:r.UNIFORM|r.COPY_DST}),p=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),m=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),g=n.createTexture({size:[a,a],format:`rgba8unorm`,usage:i.STORAGE_BINDING|i.TEXTURE_BINDING|i.COPY_SRC}),_=n.createSampler({magFilter:`linear`,minFilter:`linear`}),y=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:S}),entryPoint:`accumulate`}}),b=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:C}),entryPoint:`histogram`}}),re=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:w}),entryPoint:`colorize`}}),T=n.createShaderModule({code:te}),E=n.createRenderPipeline({layout:`auto`,vertex:{module:T,entryPoint:`vs`},fragment:{module:T,entryPoint:`fs`,targets:[{format:e.preferredFormat}]},primitive:{topology:`triangle-list`}}),D=n.createBindGroup({layout:y.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:l}}]}),O=n.createBindGroup({layout:b.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}}]}),ie=n.createBindGroup({layout:re.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:l}},{binding:2,resource:g.createView()}]}),ae=n.createBindGroup({layout:E.getBindGroupLayout(0),entries:[{binding:0,resource:g.createView()},{binding:1,resource:_}]});n.queue.writeBuffer(p,0,new Uint32Array([a,0,0,0]));let k=0,oe=0,A=!1,se=!1,j={low:.69,high:3};function ce(e){let t=new ArrayBuffer(32);new Uint32Array(t,0,4).set([a,oe+1,e,c]),new Float32Array(t,16,4).set([x.xMin,x.xMax,x.yMin,x.yMax]),n.queue.writeBuffer(f,0,t)}function le(){let e=new ArrayBuffer(16);new Uint32Array(e,0,2).set([a,0]),new Float32Array(e,8,2).set([j.low,j.high]),n.queue.writeBuffer(m,0,e)}async function M(){if(!(se||A)){se=!0;try{let e=n.createCommandEncoder({label:`buddhabrot-histogram-readback`});if(e.copyBufferToBuffer(u,0,d,0,h*4),n.queue.submit([e.finish()]),await d.mapAsync(globalThis.GPUMapMode.READ),A)return;j=v(new Uint32Array(d.getMappedRange().slice(0))),d.unmap()}catch(e){console.warn(`[buddhabrot] histogram readback failed`,e)}finally{se=!1}}}return{step(r){if(A||e.hasFailed()||k>=s)return;let i=ee(r,{totalSamples:s,minDurationMs:t.minDurationMs}),o=Math.min(i,s-k);ce(o),le(),n.queue.writeBuffer(u,0,new Uint32Array(h));let c=n.createCommandEncoder({label:`buddhabrot-step`}),l=c.beginComputePass();l.setPipeline(y),l.setBindGroup(0,D),l.dispatchWorkgroups(Math.ceil(o/64)),l.setPipeline(b),l.setBindGroup(0,O),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.setPipeline(re),l.setBindGroup(0,ie),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.end(),n.queue.submit([c.finish()]),k+=o,oe+=1,M()},progress(){return Math.min(1,k/s)},isComplete(){return k>=s},blit(t){if(A||e.hasFailed())return!1;let r=n.createCommandEncoder({label:`buddhabrot-blit`}),i=r.beginRenderPass({colorAttachments:[{view:t.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});return i.setPipeline(E),i.setBindGroup(0,ae),i.draw(3),i.end(),n.queue.submit([r.finish()]),!0},async toBitmapAndBlob(){let t=new OffscreenCanvas(a,a),r=t.getContext(`webgpu`);if(r.configure({device:n,format:e.preferredFormat,alphaMode:`premultiplied`}),!this.blit(r))throw Error(`Buddhabrot generator cannot blit: GPU context is destroyed or has failed.`);return{bitmap:await createImageBitmap(t),blobPromise:t.convertToBlob({type:`image/png`}).catch(e=>(console.warn(`[buddhabrot] PNG encode failed; texture will not be cached`,e),null))}},destroy(){A=!0,n.queue.onSubmittedWorkDone().finally(()=>{g.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy()})}}}var T=`mandelbrot-skipping`,E=`textures`;function D(e){let t=e.matchMedia(`(pointer: coarse)`).matches,n=Math.min(e.screen.width,e.screen.height);return t&&n<=820?2048:4096}function O(e){return`buddhabrot:v3:${e}`}async function ie(e,t){try{return await t.get(O(e))}catch{return null}}async function ae(e,t,n){let r=O(e);try{await n.put(r,t)}catch{return!1}return await k(r,n),!0}async function k(e,t){try{let n=await t.keys();await Promise.all(n.filter(t=>t.startsWith(`buddhabrot:`)&&t!==e).map(e=>t.delete(e).catch(()=>{})))}catch{}}function oe(e){return new Promise((t,n)=>{let r=e.open(T,1);r.onupgradeneeded=()=>{r.result.objectStoreNames.contains(E)||r.result.createObjectStore(E)},r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error),r.onblocked=()=>n(Error(`IndexedDB open blocked`))})}function A(e){return{async get(t){let n=await oe(e);try{return await new Promise((e,r)=>{let i=n.transaction(E,`readonly`).objectStore(E).get(t);i.onsuccess=()=>e(i.result??null),i.onerror=()=>r(i.error)})}finally{n.close()}},async put(t,n){let r=await oe(e);try{await new Promise((e,i)=>{let a=r.transaction(E,`readwrite`);a.objectStore(E).put(n,t),a.oncomplete=()=>e(),a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{r.close()}},async keys(){let t=await oe(e);try{return await new Promise((e,n)=>{let r=t.transaction(E,`readonly`).objectStore(E).getAllKeys();r.onsuccess=()=>e(r.result.map(String)),r.onerror=()=>n(r.error)})}finally{t.close()}},async delete(t){let n=await oe(e);try{await new Promise((e,r)=>{let i=n.transaction(E,`readwrite`);i.objectStore(E).delete(t),i.oncomplete=()=>e(),i.onerror=()=>r(i.error),i.onabort=()=>r(i.error)})}finally{n.close()}}}}var se=.29,j=2e6,ce=5400,le=4200;function M(e,t,n=Math.random){return{x:36+n()*Math.max(8,e-72),y:36+n()*Math.max(8,t-72)}}function ue(e,t){let n=e-.25,r=n*n+t*t;if(r*(r+n)<=.25*t*t)return!0;let i=e+1;if(i*i+t*t<=.0625)return!0;let a=e+.125,o=Math.abs(t);return a*a+(o-.745)*(o-.745)<=.009}function N(e=Math.random){for(let t=0;t<48;t++){let t=e(),n,r;if(t<.5)n=-2.2+e()*3.4,r=-1.5+e()*3;else if(t<.78){let t=e()*Math.PI*2,i=.5*(1-Math.cos(t))+.002+e()*.045;n=.25+i*Math.cos(t),r=i*Math.sin(t)}else n=-2+e()*1.4,r=(e()-.5)*.35;if(ue(n,r))continue;let i=0,a=0,o=!1;for(let e=1;e<=8e3;e++){let t=i*i-a*a+n,s=2*i*a+r;if(i=t,a=s,i*i+a*a>4){e>=8&&(o=!0);break}}if(o)return{x:n,y:r}}return{x:-.75+(e()-.5)*.05,y:.18+(e()-.5)*.05}}var de={drawLines:!0,grayscale:!1,energy:.01,hiddenSteps:0,liveGain:1,contrast:.72,atlasGain:1},P={drawLines:!1,grayscale:!0,energy:.28,hiddenSteps:1,liveGain:.12,contrast:1.22,atlasGain:1};function fe(e){return e===`intro`?{pondGain:1,throwGain:0,coneEnabled:!1}:e===`aiming`?{pondGain:1,throwGain:0,coneEnabled:!0}:{pondGain:0,throwGain:1,coneEnabled:!1}}var F=[1e4,25e3,5e4,1e5,25e4,5e5,1e6,2e6,5e6,1e7,2e7,5e7,1e8,2e8,5e8,1e9,2e9],I=.5;function L(e){let t=Math.round((Number(e)||10)*10)/10;return Math.max(I,Math.min(18,t))}function pe(e,t,n,r){let i=Math.max(0,Math.min(1,e/Math.max(t,1)))**+r*Math.max(0,n-4);return Math.min(n,Math.max(4,Math.floor(4+i)))}var me={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5};function R(e,t,n){let r=Math.min(Math.max(n,1),2);return{width:Math.max(1,Math.round(e*r)),height:Math.max(1,Math.round(t*r)),dpr:r}}var he=.8;function ge(e,t,n){return e.halfY*t/Math.max(n,1)}function _e(e,t,n){return n?{x:t,y:-e}:{x:e,y:t}}function ve(e,t,n){return n?{dx:-t,dy:e}:{dx:e,dy:t}}function z(e,t,n,r,i,a=!1){let o=ve((e/n*2-1)*ge(i,n,r),(1-t/r*2)*i.halfY,a);return{x:i.centerX+o.dx,y:i.centerY+o.dy}}function B(e,t,n,r,i,a=!1){let o=ge(i,n,r),s=_e(e-i.centerX,t-i.centerY,a);return{x:(s.x/o+1)*n*.5,y:(1-s.y/i.halfY)*r*.5}}function ye(e,t,n,r,i,a=!1){let o=_e(e-n.centerX,t-n.centerY,a);return{x:o.x/ge(n,r,i),y:o.y/n.halfY}}function be(e,t,n=he){return e*n/Math.max(t,1e-6)}function xe(e,t,n,r,i,a,o=!1){let s=z(e,t,n,r,i,o);return B(s.x,s.y,n,r,a,o)}function Se(e,t,n,r,i,a,o,s,c=!1){let l=xe(e,t,i,a,o,s,c),u=xe(e+n,t+r,i,a,o,s,c);return{x:u.x-l.x,y:u.y-l.y}}function Ce(e,t,n,r){let i=ge(e,t,n),a=r?e.halfY:i,o=r?i:e.halfY;return{xMin:e.centerX-a,xMax:e.centerX+a,yMin:e.centerY-o,yMax:e.centerY+o}}var V=.035,we=2.4,Te=-8,Ee=8,De=-Math.PI,H=Math.PI;function U(e){return e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12).trim()||`YOU`}function Oe(e){return`${U(e)}'s`}function ke(e,t,n){let r=Math.max(0,Math.min(1,(e-t)/(n-t)));return Math.round(r*65535)}function Ae(e,t,n){return t+e/65535*(n-t)}function je(e){let t=``;for(let n of e)t+=String.fromCharCode(n);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/g,``)}function Me(e){if(!/^[A-Za-z0-9_-]+$/.test(e))return null;let t=e+`=`.repeat((4-e.length%4)%4);try{let e=atob(t.replace(/-/g,`+`).replace(/_/g,`/`));return Uint8Array.from(e,e=>e.charCodeAt(0))}catch{return null}}function W(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null}function Ne(e){return!Number.isFinite(e.view.centerX)||!Number.isFinite(e.view.centerY)||!Number.isFinite(e.view.halfY)||!Number.isFinite(e.angle)||!Number.isFinite(e.power)||e.power<=0||e.power>1||e.skips<2||e.skips>15||e.skips!==Math.round(e.skips)||e.glyph<0||e.glyph>=7||e.glyph!==Math.round(e.glyph)||e.sourceDots<6||e.sourceDots>32||e.sourceDots!==Math.round(e.sourceDots)||e.view.halfY<.035||e.view.halfY>2.4?null:{version:1,view:e.view,rotateRight:e.rotateRight,angle:e.angle,power:e.power,skips:e.skips,glyph:e.glyph,seed:e.seed|0,sourceDots:e.sourceDots,name:U(e.name??`YOU`)}}function Pe(e){let t=e.split(`_`);if(t.length!==11)return null;let n=W(t[0]),r=W(t[1]),i=W(t[2]),a=W(t[3]),o=W(t[4]),s=W(t[5]),c=W(t[6]),l=W(t[7]),u=W(t[8]),d=W(t[9]),f=W(t[10]);return n!==1||r==null||i==null||a==null||o==null||s==null||c==null||l==null||u==null||d==null||f==null||o!==0&&o!==1?null:Ne({view:{centerX:r,centerY:i,halfY:a},rotateRight:o===1,angle:s,power:c,skips:l,glyph:u,seed:d,sourceDots:f})}function G(e){let t=Me(e);if(!t||t.length<20)return null;let n=new DataView(t.buffer,t.byteOffset,t.byteLength);if(n.getUint8(0)!==2)return null;let r=n.getUint8(19);if(t.length!==20+r)return null;let i=new TextDecoder().decode(t.subarray(20,20+r));return Ne({view:{centerX:Ae(n.getUint16(1),Te,Ee),centerY:Ae(n.getUint16(3),Te,Ee),halfY:Ae(n.getUint16(5),V,we)},rotateRight:(n.getUint8(11)&1)==1,angle:Ae(n.getUint16(7),De,H),power:Ae(n.getUint16(9),0,1),skips:n.getUint8(12),glyph:n.getUint8(13),sourceDots:n.getUint8(14),seed:n.getInt32(15),name:i})}function Fe(e){let t=U(e.name),n=new TextEncoder().encode(t),r=new Uint8Array(20+n.length),i=new DataView(r.buffer);return i.setUint8(0,2),i.setUint16(1,ke(e.view.centerX,Te,Ee)),i.setUint16(3,ke(e.view.centerY,Te,Ee)),i.setUint16(5,ke(e.view.halfY,V,we)),i.setUint16(7,ke(e.angle,De,H)),i.setUint16(9,ke(e.power,0,1)),i.setUint8(11,+!!e.rotateRight),i.setUint8(12,e.skips),i.setUint8(13,e.glyph),i.setUint8(14,e.sourceDots),i.setInt32(15,e.seed|0),i.setUint8(19,n.length),r.set(n,20),je(r)}function Ie(e){return e?e.includes(`_`)&&e.startsWith(`1_`)?Pe(e):G(e):null}function Le(e){let t=e.hash.startsWith(`#`)?e.hash.slice(1):e.hash,n=new URLSearchParams(t).get(`t`),r=new URLSearchParams(e.search).get(`t`),i=n??r;return i?Ie(i):null}function Re(e,t){let n=new URL(e);return n.searchParams.delete(`t`),n.hash=`t=${Fe(t)}`,n.toString()}var K=7,ze=[2,2,2,4,2,3,7],Be=6,Ve=32,He=4096,Ue=4096,q=F[F.length-1],J=.05,We=.05,Y=8,Ge=10,X=50,Z=[[80,214,255],[92,255,196],[186,255,120],[255,230,110],[255,168,92],[255,122,186],[196,146,255]].map(([e,t,n])=>`vec3f(${(e/255).toFixed(5)}, ${(t/255).toFixed(5)}, ${(n/255).toFixed(5)})`).join(`, `),Q={sourceDots:18,maxDepth:2e6,acceleration:10,linePersist:.6,previewOrbits:!1,previewIterations:20,skipColors:!0,coordinateAxes:!1,rotateRight:!0},Ke=`mandelbrot-skipping:tuning:v4`,qe=10,Je=.3,Ye=.16,Xe=4e5,Ze=0,Qe=6,$e=25e3,et=$e+He,tt=32,nt=tt*tt/32,rt=(tt*tt-1)/12,it=4,at=2,ot=`mandelbrot-skipping:scores:v2`,st=`mandelbrot-skipping:scores:v1`,ct=Math.PI*2,lt={x:-.58,y:0},ut=.8,dt={x:-.55,y:0},ft=1.52,pt=1.6,mt=1.15,ht=[[0,2,3,5,7,9,10],[0,1,4,6,7,10],[0,2,4,6,8,10],[0,3,5,7,10],[0,1,5,7,8]],$=`
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationCurve: f32,
  atlasMode: f32,
  hiddenSteps: f32,
  bounds: vec4f,
}
struct OrbitPoint { position: vec2f, depth: f32, pad: f32 }
struct CurveSegment {
  start: vec2f,
  control1: vec2f,
  control2: vec2f,
  end: vec2f,
  freshnessStart: f32,
  freshnessEnd: f32,
  depth: f32,
  pad: f32,
}
struct OrbitState {
  z: vec2f,
  c: vec2f,
  reserved: vec2f,
  step: u32,
  alive: u32,
  offscreenStreak: u32,
  tinyHopStreak: u32,
  pad: vec2u,
}
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> vertices: array<OrbitPoint>;
@group(0) @binding(2) var<storage, read_write> states: array<OrbitState>;
struct DrawArgs {
  vertexCount: atomic<u32>,
  instanceCount: u32,
  firstVertex: u32,
  firstInstance: u32,
}
@group(0) @binding(3) var<storage, read_write> drawArgs: DrawArgs;
@group(0) @binding(4) var<storage, read_write> lineSegments: array<CurveSegment>;
@group(0) @binding(5) var<storage, read_write> lineDrawArgs: DrawArgs;

fn toClip(z: vec2f) -> vec2f {
  let delta = z - params.center;
  let oriented = select(delta, vec2f(delta.y, -delta.x), params.rotateRight > 0.5);
  return oriented / params.viewHalf;
}
fn toAtlasClip(z: vec2f) -> vec2f {
  let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
  return vec2f(
    (z.x - params.bounds.x) / span.x * 2.0 - 1.0,
    (z.y - params.bounds.z) / span.y * 2.0 - 1.0
  );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let source = id.x;
  if (source >= params.sourceCount) { return; }
  var state = states[source];
  if (state.alive == 0u || state.step >= params.maxDepth) { return; }
  let depthProgress = clamp(f32(state.step) / max(f32(params.maxDepth), 1.0), 0.0, 1.0);
  let acceleration = pow(depthProgress, max(params.accelerationCurve, 0.25));
  let acceleratedBatch = min(
    params.batch,
    max(4u, u32(f32(4u) + acceleration * max(f32(params.batch - 4u), 0.0)))
  );
  let lineCount = min(acceleratedBatch, params.lineQuota);
  let firstLineStep = acceleratedBatch - lineCount;
  for (var i = 0u; i < acceleratedBatch; i++) {
    let previousZ = state.z;
    let z = vec2f(
      state.z.x * state.z.x - state.z.y * state.z.y,
      2.0 * state.z.x * state.z.y
    ) + state.c;
    state.z = z;
    state.step += 1u;
    let previousClip = toClip(previousZ);
    let clip = toClip(z);
    let hopPx = length((clip - previousClip) * params.viewport * 0.5);
    let depthColor = log2(f32(state.step) + 1.0) / 25.6;
    let inAtlas = all(abs(toAtlasClip(z)) <= vec2f(1.0));
    if (inAtlas || all(abs(clip) <= vec2f(1.0))) {
      if (state.step > u32(params.hiddenSteps)) {
        let slot = atomicAdd(&drawArgs.vertexCount, 1u);
        if (slot < ${Xe}u) {
          vertices[slot] = OrbitPoint(z, depthColor, state.reserved.x);
        }
      }
      if (state.step > u32(params.hiddenSteps) + 1u && (inAtlas || all(abs(previousClip) <= vec2f(1.0))) && i >= firstLineStep) {
        let future = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + state.c;
        let incomingLength = length(clip - previousClip);
        let control1 = previousZ + (z - previousZ) / 3.0;
        let control2 = z - (future - z) / 3.0;
        if (incomingLength <= 0.12 && length(z - previousZ) <= 0.12) {
          let lineVertex = atomicAdd(&lineDrawArgs.vertexCount, ${Qe*2}u);
          let lineSlot = lineVertex / ${Qe*2}u;
          if (lineSlot < ${et}u) {
            lineSegments[lineSlot] = CurveSegment(
              previousZ, control1, control2, z,
              f32(i - firstLineStep) / f32(max(lineCount, 1u)),
              f32(i - firstLineStep + 1u) / f32(max(lineCount, 1u)),
              depthColor, state.reserved.x
            );
          }
        }
      }
    }
    let magSq = dot(z, z);
    let onScreen = all(abs(clip) <= vec2f(1.02));
    state.offscreenStreak = select(state.offscreenStreak + 1u, 0u, inAtlas || onScreen);
    state.tinyHopStreak = select(0u, state.tinyHopStreak + 1u, hopPx <= ${l} && hopPx == hopPx);
    if (
      magSq > 4.0
      || state.offscreenStreak >= 800u
      || state.tinyHopStreak >= 500u
      || state.step >= params.maxDepth
      || hopPx != hopPx
    ) {
      state.alive = 0u;
      break;
    }
  }
  states[source] = state;
}
`,gt=`
struct Style { alpha: f32, pulse: f32, colorMode: f32, pad: f32 }
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationCurve: f32,
  atlasMode: f32,
  hiddenSteps: f32,
  bounds: vec4f,
}
@group(0) @binding(0) var<uniform> style: Style;
@group(0) @binding(1) var<uniform> params: Params;
struct VSOut { @builtin(position) position: vec4f, @location(0) color: vec3f }
fn skipTint(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(${Z});
  return colors[u32(max(index, 1.0) - 1.0) % 7u];
}
fn projectPoint(z: vec2f) -> vec2f {
  if (params.atlasMode > 0.5) {
    let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
    return vec2f(
      (z.x - params.bounds.x) / span.x * 2.0 - 1.0,
      (z.y - params.bounds.z) / span.y * 2.0 - 1.0
    );
  }
  let delta = z - params.center;
  let oriented = select(delta, vec2f(delta.y, -delta.x), params.rotateRight > 0.5);
  return oriented / params.viewHalf;
}
@vertex fn vs(@location(0) position: vec2f, @location(1) depth: f32, @location(2) skip: f32) -> VSOut {
  var out: VSOut;
  out.position = vec4f(projectPoint(position), 0.0, 1.0);
  let t = clamp(depth, 0.0, 1.0);
  let depthColor = mix(vec3f(0.10, 0.78, 0.92), vec3f(0.92, 1.0, 0.82), t);
  let tinted = mix(depthColor, skipTint(skip), style.colorMode);
  let gray = vec3f(mix(0.22, 1.0, t));
  out.color = mix(tinted, gray, style.pulse);
  return out;
}
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(in.color * style.alpha, style.alpha);
}
`,_t=`
struct CurveSegment {
  start: vec2f,
  control1: vec2f,
  control2: vec2f,
  end: vec2f,
  freshnessStart: f32,
  freshnessEnd: f32,
  depth: f32,
  pad: f32,
}
struct Style { alpha: f32, pulse: f32, colorMode: f32, pad: f32 }
struct Params {
  sourceCount: u32,
  batch: u32,
  maxDepth: u32,
  lineQuota: u32,
  center: vec2f,
  viewHalf: vec2f,
  viewport: vec2f,
  rotateRight: f32,
  accelerationCurve: f32,
  atlasMode: f32,
  hiddenSteps: f32,
  bounds: vec4f,
}
@group(0) @binding(0) var<storage, read> segments: array<CurveSegment>;
@group(0) @binding(1) var<uniform> style: Style;
@group(0) @binding(2) var<uniform> params: Params;
struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
}
fn skipTint(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(${Z});
  return colors[u32(max(index, 1.0) - 1.0) % 7u];
}
fn projectPoint(z: vec2f) -> vec2f {
  if (params.atlasMode > 0.5) {
    let span = vec2f(params.bounds.y - params.bounds.x, params.bounds.w - params.bounds.z);
    return vec2f(
      (z.x - params.bounds.x) / span.x * 2.0 - 1.0,
      (z.y - params.bounds.z) / span.y * 2.0 - 1.0
    );
  }
  let delta = z - params.center;
  let oriented = select(delta, vec2f(delta.y, -delta.x), params.rotateRight > 0.5);
  return oriented / params.viewHalf;
}
fn bezier(curve: CurveSegment, t: f32) -> vec2f {
  let u = 1.0 - t;
  return u * u * u * curve.start
    + 3.0 * u * u * t * curve.control1
    + 3.0 * u * t * t * curve.control2
    + t * t * t * curve.end;
}
@vertex fn vs(@builtin(vertex_index) vertex: u32) -> VSOut {
  let curveIndex = vertex / ${Qe*2}u;
  let localVertex = vertex % ${Qe*2}u;
  let subsegment = localVertex / 2u;
  let endpoint = localVertex % 2u;
  let t = f32(subsegment + endpoint) / f32(${Qe});
  let curve = segments[curveIndex];
  let depth = clamp(curve.depth, 0.0, 1.0);
  var out: VSOut;
  out.position = vec4f(projectPoint(bezier(curve, t)), 0.0, 1.0);
  out.color = mix(mix(vec3f(0.08, 0.66, 0.86), vec3f(0.78, 1.0, 0.70), depth), skipTint(curve.pad), style.colorMode);
  let directionalFreshness = mix(curve.freshnessStart, curve.freshnessEnd, t);
  out.alpha = 0.28 * pow(directionalFreshness, 0.65);
  return out;
}
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(in.color * in.alpha, in.alpha);
}
`,vt=`
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(p[i], 0.0, 1.0);
  out.uv = p[i] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
`,yt=`
${vt}
@group(0) @binding(0) var previous: texture_2d<f32>;
@group(0) @binding(1) var trailSampler: sampler;
struct FadeTransform {
  retention: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
}
@group(0) @binding(2) var<uniform> fade: FadeTransform;
@fragment fn fadeFs(in: VSOut) -> @location(0) vec4f {
  return textureSample(previous, trailSampler, in.uv) * fade.retention;
}
`,bt=`
${vt}
@group(0) @binding(0) var pondTexture: texture_2d<f32>;
@group(0) @binding(1) var throwTexture: texture_2d<f32>;
@group(0) @binding(2) var throwLineTexture: texture_2d<f32>;
@group(0) @binding(3) var liveTexture: texture_2d<f32>;
@group(0) @binding(4) var liveLineTexture: texture_2d<f32>;
@group(0) @binding(5) var displaySampler: sampler;
struct DisplayView {
  center: vec2f,
  viewHalf: vec2f,
  rotateRight: f32,
  pad: f32,
  liveGain: f32,
  contrast: f32,
  pondBounds: vec4f,
  throwBounds: vec4f,
  pondGain: f32,
  throwGain: f32,
  coneEnabled: f32,
  coneHalfAngle: f32,
  coneApex: vec2f,
  coneDirection: vec2f,
  coneRange: f32,
  coneEdge: f32,
  viewport: vec2f,
}
@group(0) @binding(6) var<uniform> display: DisplayView;
fn layerUv(z: vec2f, bounds: vec4f) -> vec2f {
  let span = vec2f(bounds.y - bounds.x, bounds.w - bounds.z);
  return vec2f(
    (z.x - bounds.x) / span.x,
    (bounds.w - z.y) / span.y
  );
}
fn toneMap(rawRgb: vec3f, contrast: f32) -> vec3f {
  let raw = rawRgb * 3.6;
  let mapped = raw / (vec3f(1.0) + raw);
  return pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(contrast));
}
fn coneMask(uv: vec2f, view: DisplayView) -> f32 {
  if (view.coneEnabled < 0.5) { return 1.0; }
  let px = uv * view.viewport;
  let delta = px - view.coneApex;
  let distance = length(delta);
  if (distance <= 0.0 || distance > view.coneRange) { return 0.0; }
  let along = dot(delta / distance, view.coneDirection);
  let halfCos = cos(view.coneHalfAngle);
  let edgeCos = cos(max(view.coneHalfAngle - view.coneEdge, 0.0));
  let angular = smoothstep(halfCos, edgeCos, along);
  let t = clamp(distance / max(view.coneRange, 1e-5), 0.0, 1.0);
  let radial = mix(0.9, 0.4, smoothstep(0.0, 0.55, t)) * (1.0 - smoothstep(0.55, 1.0, t));
  return angular * radial;
}
@fragment fn displayFs(in: VSOut) -> @location(0) vec4f {
  let clip = vec2f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0);
  let oriented = clip * display.viewHalf;
  let delta = select(oriented, vec2f(-oriented.y, oriented.x), display.rotateRight > 0.5);
  let z = display.center + delta;
  let contrast = max(display.contrast, 0.08);
  let liveGain = display.liveGain;
  let pondGain = display.pondGain;
  let throwGain = display.throwGain;
  let cone = coneMask(in.uv, display);
  let pondUv = layerUv(z, display.pondBounds);
  let throwUv = layerUv(z, display.throwBounds);
  let pondInside = all(pondUv >= vec2f(0.0)) && all(pondUv <= vec2f(1.0));
  let throwInside = all(throwUv >= vec2f(0.0)) && all(throwUv <= vec2f(1.0));
  let raw = select(vec3f(0.0), textureSample(pondTexture, displaySampler, pondUv).rgb, pondInside) * 3.6;
  let mapped = raw / (vec3f(1.0) + raw);
  let glow = pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(contrast)) * pondGain * cone;
  let throwMapped = select(vec3f(0.0), textureSample(throwTexture, displaySampler, throwUv).rgb, throwInside);
  let throwGlow = toneMap(throwMapped, contrast);
  let lineGain = display.pad;
  let throwLines = select(vec3f(0.0), textureSample(throwLineTexture, displaySampler, throwUv).rgb, throwInside) * 1.35 * lineGain;
  let liveGlow = textureSample(liveTexture, displaySampler, in.uv).rgb * 3.6;
  let liveMapped = liveGlow / (vec3f(1.0) + liveGlow);
  let live = pow(clamp(liveMapped, vec3f(0.0), vec3f(1.0)), vec3f(contrast)) * liveGain;
  let liveLines = textureSample(liveLineTexture, displaySampler, in.uv).rgb * 1.35 * lineGain;
  // pond * pondGain * cone
  let pond = glow;
  let thrown = (throwGlow + throwLines) * throwGain;
  return vec4f(pond + thrown + live + liveLines, 1.0);
}
`;function xt(e){return Math.round(e).toLocaleString()}function St(e){let t=e.distinct;if(!t)return{area:0,coverage:0,spread:0,elongation:0,orientation:0,density:0,centroidX:0,centroidY:0};let n=e.sumX/t,r=e.sumY/t,i=Math.max(0,e.sumXX/t-n*n),a=Math.max(0,e.sumYY/t-r*r),o=e.sumXY/t-n*r,s=Math.max(0,i*a-o*o),c=Math.sqrt((i-a)**2+4*o*o),l=Math.max(0,(i+a+c)*.5),u=Math.max(0,(i+a-c)*.5),d=Math.min(1,Math.sqrt(s)/rt),f=Math.min(1,Math.log2(1+t)/Math.log2(1+tt*tt)),p=l>.001?Math.min(1,1-Math.sqrt(u/l)):0,m=.5*Math.atan2(2*o,i-a),h=Math.max(1,Math.min(tt*tt,4*Math.PI*Math.sqrt(s))),g=Math.min(1,t/h);return{area:d,coverage:f,spread:Math.sqrt(d),elongation:p,orientation:m,density:g,centroidX:n/(tt-1)*2-1,centroidY:r/(tt-1)*2-1}}function Ct(e,t){let n=Math.min(t,q),r=St(e),i=n*.03+Math.sqrt(n)*75,a=8e4*r.coverage,o=12e4*r.spread*Math.min(1,e.distinct/24);return Math.round((i+a+o)*(1+(e.skip-1)*.12))}function wt(e){let t=e|0;return()=>(t^=t<<13,t^=t>>>17,t^=t<<5,(t>>>0)/4294967296)}function Tt(e){return e>=1e9?`${e/1e9}B`:e>=1e6?`${e/1e6}M`:e>=1e3?`${e/1e3}K`:String(e)}function Et(e,t){let n=Math.max(0,Math.min(.05,e));return t<=0?0:n===0?1:J**+(n/t)}function Dt(e){let t=Math.round(Number(e?.sourceDots)),n=t>=Be?Math.min(Ve,t):Q.sourceDots,r=Number(e?.maxDepth),i=F.includes(r)?r:Q.maxDepth,a=L(e?.acceleration??10),o=Math.max(We,Math.min(Y,Math.round((Number(e?.linePersist)||Q.linePersist)*20)/20)),s=e?.previewOrbits===!0,c=e?.skipColors!==!1,l=e?.coordinateAxes===!0,u=e?.rotateRight!==!1,d=Math.round(Number(e?.previewIterations)||Q.previewIterations);return{sourceDots:n,maxDepth:i,acceleration:a,linePersist:o,previewOrbits:s,previewIterations:Math.max(Ge,Math.min(X,d)),skipColors:c,coordinateAxes:l,rotateRight:u}}function Ot(){try{return Dt(JSON.parse(localStorage.getItem(Ke)||`null`))}catch{return Q}}function kt(e){try{localStorage.setItem(Ke,JSON.stringify(e))}catch{}}function At(e,t){let n=(t%1+1)%1*e.length,r=Math.floor(n)%e.length,i=n-Math.floor(n),a=e[r],o=e[(r+1)%e.length];return{x:a.x+(o.x-a.x)*i,y:a.y+(o.y-a.y)*i}}function jt(e,t=-Math.PI/2){return Array.from({length:e},(n,r)=>({x:Math.cos(t+r*ct/e),y:Math.sin(t+r*ct/e)}))}function Mt(e,t,n){let r=(e,t,r)=>({x:e+Math.cos(n*ct-Math.PI/2)*r,y:t+Math.sin(n*ct-Math.PI/2)*r});switch(e%K){case 0:return r(0,0,t===0?1:.46);case 1:return t===0?At(jt(3),n):r(0,0,.48);case 2:return r(t===0?-.32:.32,0,.68);case 3:{let e=t*Math.PI/2;return r(Math.cos(e)*.43,Math.sin(e)*.43,.52)}case 4:{if(t===1)return r(0,0,.34);let e=jt(5);return At([e[0],e[2],e[4],e[1],e[3]],n)}case 5:return t<2?At(jt(3,-Math.PI/2+t*Math.PI),n):r(0,0,.34);default:{if(t===0)return r(0,0,.42);let e=(t-1)*ct/6-Math.PI/2;return r(Math.cos(e)*.42,Math.sin(e)*.42,.42)}}}function Nt(e,t,n,r,i,a,o,s){let c=[],l=ze[o%ze.length];for(let u=0;u<a;u++){let d=u%l,f=Math.floor(u/l),p=Math.ceil((a-d)/l),m=Mt(o,d,f/Math.max(p,1)),h=z(e+m.x*qe,t+m.y*qe,n,r,i,s);c.push({x:Math.fround(h.x),y:Math.fround(h.y)})}return c}function Pt(){try{let e=JSON.parse(localStorage.getItem(ot)||`null`),t=(e,t=!1)=>e.flatMap(e=>{if(!e||typeof e!=`object`)return[];let n=e;return typeof n.id==`string`&&typeof n.name==`string`&&n.name.length<=12&&Number.isFinite(n.score)&&Number.isFinite(n.deepest)&&Number.isFinite(n.skips)&&typeof n.createdAt==`string`?[{id:n.id,name:n.name,score:t?Math.round(n.score/100):n.score,deepest:n.deepest,skips:n.skips,coverage:Number.isFinite(n.coverage)?n.coverage:0,spread:Number.isFinite(n.spread)?n.spread:0,createdAt:n.createdAt}]:[]}).slice(0,10);if(e?.version===2&&Array.isArray(e.entries))return t(e.entries);let n=JSON.parse(localStorage.getItem(st)||`null`);if(n?.version!==1||!Array.isArray(n.entries))return[];let r=t(n.entries,!0);return Ft(r),r}catch{return[]}}function Ft(e){try{localStorage.setItem(ot,JSON.stringify({version:2,entries:e}))}catch{}}async function It(e,t){let n=t.device,r=e.getContext(`webgpu`),i=t.preferredFormat;r.configure({device:n,format:i,alphaMode:`opaque`});let a=globalThis.GPUBufferUsage,o=globalThis.GPUTextureUsage,s=n.createBuffer({size:Xe*16,usage:a.STORAGE|a.VERTEX}),c=n.createBuffer({size:et*48,usage:a.STORAGE}),l=n.createBuffer({size:He*48,usage:a.STORAGE|a.COPY_DST}),u=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),d=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),f=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),h=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),g=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),_=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),v=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),y=n.createBuffer({size:128,usage:a.UNIFORM|a.COPY_DST}),b=n.createSampler({magFilter:`nearest`,minFilter:`nearest`}),ee=n.createShaderModule({code:$}),x=n.createShaderModule({code:gt}),S=n.createShaderModule({code:_t}),C=n.createShaderModule({code:yt}),w=n.createShaderModule({code:bt}),te=n.createComputePipeline({layout:`auto`,compute:{module:ee,entryPoint:`main`}}),ne=n.createRenderPipeline({layout:`auto`,vertex:{module:x,entryPoint:`vs`,buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:`float32x2`},{shaderLocation:1,offset:8,format:`float32`},{shaderLocation:2,offset:12,format:`float32`}]}]},fragment:{module:x,entryPoint:`fs`,targets:[{format:`rgba16float`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`point-list`}}),re=n.createRenderPipeline({layout:`auto`,vertex:{module:S,entryPoint:`vs`},fragment:{module:S,entryPoint:`fs`,targets:[{format:`rgba8unorm`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`max`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`line-list`}}),T=n.createRenderPipeline({layout:`auto`,vertex:{module:C,entryPoint:`vs`},fragment:{module:C,entryPoint:`fadeFs`,targets:[{format:`rgba16float`}]},primitive:{topology:`triangle-list`}}),E=n.createRenderPipeline({layout:`auto`,vertex:{module:C,entryPoint:`vs`},fragment:{module:C,entryPoint:`fadeFs`,targets:[{format:`rgba8unorm`}]},primitive:{topology:`triangle-list`}}),D=n.createRenderPipeline({layout:`auto`,vertex:{module:w,entryPoint:`vs`},fragment:{module:w,entryPoint:`displayFs`,targets:[{format:i}]},primitive:{topology:`triangle-list`}}),O=n.createBindGroup({layout:te.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:l}},{binding:3,resource:{buffer:u}},{binding:4,resource:{buffer:c}},{binding:5,resource:{buffer:d}}]}),ie=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:f}}]}),ae=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:h}}]}),k=n.createBindGroup({layout:re.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:f}}]}),oe=n.createBindGroup({layout:re.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:h}}]}),A=0,j=0,ce=0,le=!1,M=!1,ue=!1,N=[],P=[],F=[],I=null,L=null,pe=[],he=[],ge=[],_e=[],ve=0,z=0,B=0,ye=0,be=1,xe=1,Se={centerX:dt.x,centerY:dt.y,halfY:ft},V=Q.maxDepth,we=Q.acceleration,Te=Q.linePersist,Ee=Q.skipColors,De=Q.rotateRight,H=de.drawLines,U=de.grayscale,Oe=de.energy,ke=de.hiddenSteps,Ae=de.liveGain,je=de.contrast,Me=fe(`intro`),W=Me.pondGain,Ne=Me.throwGain,Pe=null,G=`pond`,Fe={...me},Ie={...me},Le=0,Re=e=>n.createTexture({size:[B,ye],format:e,usage:o.RENDER_ATTACHMENT|o.TEXTURE_BINDING});function K(e,t){for(let n of t)n&&e.beginRenderPass({colorAttachments:[{view:n.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end()}function ze(e,t,r){return e.map(e=>n.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:e.createView()},{binding:1,resource:b},{binding:2,resource:{buffer:t}}]}))}function Be(){_e=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++)_e[e*2+t]=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:N[e].createView()},{binding:1,resource:P[t].createView()},{binding:2,resource:F[t].createView()},{binding:3,resource:I.createView()},{binding:4,resource:L.createView()},{binding:5,resource:b},{binding:6,resource:{buffer:y}}]})}function Ve(e,t){let r=G===`pond`?Fe:Ie,i=new ArrayBuffer(80),a=new Uint32Array(i),o=new Float32Array(i);a[0]=A,a[1]=Math.max(1,Math.floor(Xe/Math.max(A,1))),a[2]=V,a[3]=H?Math.max(1,Math.floor($e/Math.max(A,1))):0,o[4]=Se.centerX,o[5]=Se.centerY,o[6]=Se.halfY*B/Math.max(ye,1),o[7]=Se.halfY,o[8]=B,o[9]=ye,o[10]=+!!De,o[11]=we,o[12]=t,o[13]=ke,o[16]=r.xMin,o[17]=r.xMax,o[18]=r.yMin,o[19]=r.yMax,n.queue.writeBuffer(e,0,i)}function Ue(){let t=e.getBoundingClientRect(),r=R(t.width,t.height,globalThis.devicePixelRatio||1);if(be=Math.max(1,t.width),xe=Math.max(1,t.height),N.length&&r.width===B&&r.height===ye)return;B=r.width,ye=r.height,e.width=B,e.height=ye;for(let e of[...N,...P,...F,I,L])e?.destroy();N=[0,1].map(()=>Re(`rgba16float`)),P=[0,1].map(()=>Re(`rgba16float`)),F=[0,1].map(()=>Re(`rgba8unorm`)),I=Re(`rgba16float`),L=Re(`rgba8unorm`),pe=ze(N,_,T),he=ze(P,_,T),ge=ze(F,v,E),Be();let i=n.createCommandEncoder({label:`orbit-resize`});K(i,N),K(i,P),K(i,F),K(i,[I,L]),n.queue.submit([i.finish()]),ve=0,z=0}let q=new ResizeObserver(Ue);q.observe(e),Ue();function J(){le||ce||(ce=requestAnimationFrame(We))}function We(){if(ce=0,le||t.hasFailed()||!N.length||ue)return;let e=performance.now(),i=Le?(e-Le)/1e3:1/60;Le=e;let a=Et(i,Te);Ve(f,0),Ve(h,1),n.queue.writeBuffer(g,0,new Float32Array([Oe,+!!U,+!!Ee,0])),n.queue.writeBuffer(u,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(d,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(_,0,new Float32Array([1,0,0,0])),n.queue.writeBuffer(v,0,new Float32Array([a,0,0,0]));let o=new Float32Array(32);o[0]=Se.centerX,o[1]=Se.centerY,o[2]=Se.halfY*B/Math.max(ye,1),o[3]=Se.halfY,o[4]=+!!De,o[5]=+!!H,o[6]=Ae,o[7]=je,o[8]=Fe.xMin,o[9]=Fe.xMax,o[10]=Fe.yMin,o[11]=Fe.yMax,o[12]=Ie.xMin,o[13]=Ie.xMax,o[14]=Ie.yMin,o[15]=Ie.yMax,o[16]=W,o[17]=Ne,o[18]=+!!Pe,o[19]=se,o[20]=Pe?.apexX??0,o[21]=Pe?.apexY??0,o[22]=Pe?.directionX??0,o[23]=Pe?.directionY??0,o[24]=Pe?.range??0,o[25]=.04,o[26]=be,o[27]=xe,n.queue.writeBuffer(y,0,o);let c=n.createCommandEncoder({label:`orbit-draw`});if(A>0&&!M){let e=c.beginComputePass();e.setPipeline(te),e.setBindGroup(0,O),e.dispatchWorkgroups(Math.ceil(A/64)),e.end()}let l=N[1-ve],p=P[1-z],m=F[1-z];if(G===`pond`){let e=c.beginRenderPass({colorAttachments:[{view:l.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(T),e.setBindGroup(0,pe[ve]),e.draw(3),e.end()}else{let e=c.beginRenderPass({colorAttachments:[{view:p.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(T),e.setBindGroup(0,he[z]),e.draw(3),e.end();let t=c.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});t.setPipeline(E),t.setBindGroup(0,ge[z]),t.draw(3),t.end()}if(c.beginRenderPass({colorAttachments:[{view:I.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),c.beginRenderPass({colorAttachments:[{view:L.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),A>0&&!M){let e=G===`pond`?l:p,t=c.beginRenderPass({colorAttachments:[{view:e.createView(),loadOp:`load`,storeOp:`store`}]});t.setPipeline(ne),t.setBindGroup(0,ae),t.setVertexBuffer(0,s),t.drawIndirect(u,0),t.end();let n=c.beginRenderPass({colorAttachments:[{view:I.createView(),loadOp:`load`,storeOp:`store`}]});n.setPipeline(ne),n.setBindGroup(0,ie),n.setVertexBuffer(0,s),n.drawIndirect(u,0),n.end();let r=c.beginRenderPass({colorAttachments:[{view:L.createView(),loadOp:`load`,storeOp:`store`}]});if(r.setPipeline(re),r.setBindGroup(0,k),r.drawIndirect(d,0),r.end(),G===`throw`&&H){let e=c.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(re),e.setBindGroup(0,oe),e.drawIndirect(d,0),e.end()}}G===`pond`?ve=1-ve:z=1-z;let b=c.beginRenderPass({colorAttachments:[{view:r.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:1}}]});b.setPipeline(D),b.setBindGroup(0,_e[ve*2+z]),b.draw(3),b.end(),n.queue.submit([c.finish()]),J()}return J(),{spawn(e,t,r=He){M=!1;let i=new Float32Array(e.length*12),a=new Uint32Array(i.buffer);e.forEach((e,n)=>{let r=n*12;i[r+2]=e.x,i[r+3]=e.y,i[r+4]=t,a[r+7]=1});let o=p(j,A,e.length,r);n.queue.writeBuffer(l,o.start*48,i.buffer,i.byteOffset,i.byteLength),j=o.nextSource,A=o.sourceCount},spawnAppend(e,t,r=He){M=!1;let i=m(A,e.length,r);if(i.added<=0)return this.spawn(e,t,r),e.length;let a=e.slice(0,i.added),o=new Float32Array(a.length*12),s=new Uint32Array(o.buffer);return a.forEach((e,n)=>{let r=n*12;o[r+2]=e.x,o[r+3]=e.y,o[r+4]=t,s[r+7]=1}),n.queue.writeBuffer(l,i.start*48,o.buffer,o.byteOffset,o.byteLength),j=i.nextSource,A=i.sourceCount,i.added},setView(e){Se={...e}},setTuning(e){V=e.maxDepth,we=e.acceleration,Te=e.linePersist,Ee=e.skipColors===!0,De=e.rotateRight===!0},setAtmosphere(e){H=e.drawLines,U=e.grayscale,Oe=e.energy,ke=e.hiddenSteps,Ae=e.liveGain,je=e.contrast},setLayer(e){G=e},setDisplay(e){W=e.pondGain,Ne=e.throwGain,Pe=e.cone,be=e.cssWidth,xe=e.cssHeight},beginThrow(e,t,n,r){Se={...e},Ie=Ce(e,t,n,r),G=`throw`,this.clear()},clearPond(){if(!N.length)return;let e=n.createCommandEncoder({label:`orbit-clear-pond`});K(e,N),n.queue.submit([e.finish()])},clear(){if(M=!1,A=0,j=0,n.queue.writeBuffer(l,0,new Uint8Array(He*48)),!P.length)return;let e=n.createCommandEncoder({label:`orbit-clear-throw`});K(e,P),K(e,F),K(e,[I,L].filter(Boolean)),n.queue.submit([e.finish()])},freeze(){M=!0},setSuspended(e){ue=e,e||J()},destroy(){le=!0,cancelAnimationFrame(ce),q.disconnect(),N.forEach(e=>e.destroy()),P.forEach(e=>e.destroy()),F.forEach(e=>e.destroy()),I?.destroy(),L?.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),h.destroy(),g.destroy(),_.destroy(),v.destroy(),y.destroy()}}}function Lt(){let e=(0,r.useRef)(null),t=(0,r.useRef)(null),n=(0,r.useRef)(null),s=(0,r.useRef)(null),l=(0,r.useRef)({centerX:dt.x,centerY:dt.y,halfY:ft}),d=(0,r.useRef)(()=>{}),p=(0,r.useRef)(()=>{}),m=(0,r.useRef)(`YOU`),h=(0,r.useRef)({...Q}),g=(0,r.useRef)(()=>{}),_=(0,r.useRef)(()=>{}),v=(0,r.useRef)(!1),y=(0,r.useRef)(0),b=(0,r.useRef)(!1),ee=(0,r.useRef)(()=>{}),x=(0,r.useRef)(null),S=(0,r.useRef)(void 0),C=(0,r.useRef)(null),w=(0,r.useRef)(!1),te=(0,r.useRef)(null),ne=(0,r.useRef)(()=>{}),[T,E]=(0,r.useState)(null),[O,k]=(0,r.useState)(!1),[oe,ue]=(0,r.useState)(!1),[L,R]=(0,r.useState)(!1),[he,ge]=(0,r.useState)(!1),[_e,ve]=(0,r.useState)(!1),[V,we]=(0,r.useState)(`YOU`),[Te,Ee]=(0,r.useState)(``),[De,H]=(0,r.useState)(null),[U,ke]=(0,r.useState)({phase:`ready`,score:0,skips:0,deepest:0,progress:0,coverage:0,spread:0}),[Ae,je]=(0,r.useState)([]),[Me,W]=(0,r.useState)(`YOU`),[Ne,Pe]=(0,r.useState)(null),[G,Fe]=(0,r.useState)({...Q});(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>je(Pt()));return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>{let e=Ot();h.current=e,Fe(e),n.current?.setTuning(e)});return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let t=e.current;if(!t)return;let r=!1,a=i(H);return s.current=a,a.then(async e=>{if(!e)return;if(r){e.destroy();return}let i=await It(t,e);if(r){i?.destroy();return}n.current=i,i?.setView(l.current),i?.setTuning(h.current),v.current?(i?.setTuning({...h.current,maxDepth:j}),i?.setAtmosphere(P),i?.setLayer(`pond`),i?.setDisplay({...fe(`intro`),cone:null,cssWidth:1,cssHeight:1})):(i?.setAtmosphere(de),i?.setLayer(`throw`),i?.setDisplay({...fe(`play`),cone:null,cssWidth:1,cssHeight:1}))}).catch(()=>H(`Orbit renderer could not start. Throwing remains playable.`)),()=>{r=!0,n.current?.destroy(),n.current=null,s.current=null,a.then(e=>e?.destroy()).catch(()=>{})}},[]),(0,r.useEffect)(()=>{let e=Le(window.location),t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;ue(!0),!(e||t)&&(v.current=!0,w.current=!0,y.current=0,b.current=!1,E({progress:0}))},[]);let Ie=(0,r.useCallback)(()=>{b.current||(b.current=!0,k(!0),window.setTimeout(()=>{v.current=!1,w.current=!1,y.current=0,b.current=!1,n.current?.setAtmosphere(de),n.current?.setLayer(`throw`),n.current?.setDisplay({...fe(`play`),cone:null,cssWidth:1,cssHeight:1}),n.current?.setTuning(h.current),p.current({centerX:lt.x,centerY:lt.y,halfY:ut}),d.current(),E(null),k(!1)},600))},[]);ee.current=Ie;let He=(0,r.useCallback)(()=>{v.current||(v.current=!0,w.current=!0,y.current=0,b.current=!1,n.current?.clearPond(),n.current?.clear(),n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:j}),n.current?.setAtmosphere(P),n.current?.setDisplay({...fe(`intro`),cone:null,cssWidth:1,cssHeight:1}),p.current({centerX:dt.x,centerY:dt.y,halfY:ft}),d.current(),k(!1),E({progress:0}))},[]);(0,r.useEffect)(()=>{if(!oe||T)return;S.current===void 0&&(S.current=Le(window.location));let e=S.current;if(!e)return;let t=0,n=()=>{if(S.current===e){if(!C.current){t=window.setTimeout(n,50);return}S.current=null,C.current(e,!0)}};return t=window.setTimeout(n,400),()=>window.clearTimeout(t)},[oe,T]);let q=(0,r.useCallback)(e=>{let t=e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12);m.current=t,W(t),x.current&&={...x.current,name:t||`YOU`},we(t||`YOU`);let n=Ne;n&&je(e=>{let r=e.map(e=>e.id===n?{...e,name:t||`YOU`}:e);return Ft(r),r})},[Ne]),J=(0,r.useCallback)(e=>{let t=Dt({...h.current,...e});h.current=t,Fe(t),kt(t),n.current?.setTuning(t),_.current(),g.current()},[]);(0,r.useEffect)(()=>{let e=t.current;if(!e)return;let r=e.getContext(`2d`);if(!r)return;let i=1,a=1,o=1,c=0,ee=performance.now(),S=0,T=`ready`,O=-1,k=`none`,oe={x:0,y:0},ue={...l.current},F={x:0,y:0},I=0,L=0,he=0,_e=0,V={x:0,y:0,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},Te=2,Ee=[],De=[],H=[],U=null,Oe=null,Ae=0,Me=0,W=0,Ne=0,G=0,Ie=new Map,Le=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,He=document.createElement(`canvas`),q=He.getContext(`2d`),J=!0,We=document.createElement(`canvas`),Y=We.getContext(`2d`),Ge=document.createElement(`canvas`),X=Ge.getContext(`2d`),Z=!0,Q=null,Ke=[],qe=[],Qe=0,$e=0,et=0,rt=!1,ot=0,st=``;g.current=()=>{Z=!0},_.current=()=>{J=!0};let ut=!1;(async()=>{try{let e=D(window),t=A(indexedDB),n=await ie(e,t);if(n){if(ut)return;Q=await createImageBitmap(n),Z=!0;return}let r=await s.current;if(!r||ut)return;let i=re(r,{size:e});if(await new Promise(e=>{let t=()=>{if(ut){i.destroy(),e();return}if(i.step(1/60),i.isComplete()){e();return}requestAnimationFrame(t)};requestAnimationFrame(t)}),ut){i.destroy();return}let{bitmap:a,blobPromise:o}=await i.toBitmapAndBlob();if(i.destroy(),ut){a.close();return}Q=a,Z=!0;let c=await o;c&&!ut&&await ae(e,c,t)}catch{}})();function dt(){return{x:i*.5,y:a*.82}}function ft(){return Math.min(i,a)}function $(){return be(ft(),l.current.halfY)}function gt(){let t=e.getBoundingClientRect();if(i=Math.max(1,t.width),a=Math.max(1,t.height),o=Math.min(window.devicePixelRatio||1,2),e.width=Math.round(i*o),e.height=Math.round(a*o),r.setTransform(o,0,0,o,0,0),He.width=Math.round(i*o),He.height=Math.round(a*o),q?.setTransform(o,0,0,o,0,0),J=!0,We.width=Math.round(i*o),We.height=Math.round(a*o),Y?.setTransform(o,0,0,o,0,0),Z=!0,Ge.width=Math.round(i*o),Ge.height=Math.round(a*o),X?.setTransform(o,0,0,o,0,0),st=``,T===`ready`||T===`aiming`||T===`result`){let e=dt();V.x=e.x,V.y=e.y,T!==`aiming`&&(F={...e})}}function _t(){return U||=new AudioContext,U.state===`suspended`&&U.resume(),U}function vt(e,t=.08,n=.05){try{let r=_t(),i=r.createOscillator(),a=r.createGain();i.type=`triangle`,i.frequency.value=e,a.gain.setValueAtTime(n,r.currentTime),a.gain.exponentialRampToValueAtTime(1e-4,r.currentTime+t),i.connect(a).connect(r.destination),i.start(),i.stop(r.currentTime+t)}catch{}}function yt(){if(Oe)return Oe;let e=_t(),t=e.createOscillator(),n=e.createOscillator(),r=e.createOscillator(),i=e.createOscillator(),a=e.createOscillator(),o=e.createOscillator(),s=e.createGain(),c=e.createGain(),l=e.createGain(),u=e.createGain(),d=e.createGain(),f=e.createGain(),p=e.createBiquadFilter(),m=e.createGain(),h=e.createWaveShaper(),g=e.createDelay(.4),_=e.createGain(),v=e.createGain(),y=e.createGain(),b=e.createStereoPanner(),ee=e.createGain(),x=e.createDynamicsCompressor(),S=e.createGain(),C=e.createGain(),w=e.createBiquadFilter(),te=e.createGain(),ne=e.createBufferSource(),re=Array.from({length:15},(t,n)=>{let r=e.createOscillator(),i=e.createGain(),a=e.createStereoPanner();return r.type=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`][n%K],r.frequency.value=110,i.gain.value=1e-4,r.connect(i).connect(a).connect(p),{oscillator:r,gain:i,pan:a}}),T=e.createBuffer(1,Math.round(e.sampleRate*.75),e.sampleRate),E=T.getChannelData(0),D=5370206;for(let e=0;e<E.length;e++)D^=D<<13,D^=D>>>17,D^=D<<5,E[e]=((D>>>0)/2147483648-1)*.55;ne.buffer=T,ne.loop=!0,t.type=`sine`,n.type=`triangle`,r.type=`sawtooth`,i.type=`sine`,a.type=`sine`,o.type=`sine`,s.gain.value=.42,c.gain.value=.16,l.gain.value=.02,u.gain.value=.08,a.frequency.value=1.5,d.gain.value=12,f.gain.value=1e-4,S.gain.value=1e-4,C.gain.value=1e-4,w.type=`bandpass`,w.frequency.value=900,w.Q.value=5,te.gain.value=.2,p.type=`lowpass`,p.frequency.value=420,p.Q.value=2.2,m.gain.value=1;let O=new Float32Array(1024);for(let e=0;e<O.length;e++){let t=e/(O.length-1)*2-1;O[e]=Math.tanh(t*2.35)/Math.tanh(2.35)}return h.curve=O,h.oversample=`2x`,ee.gain.value=1e-4,x.threshold.value=-27,x.knee.value=18,x.ratio.value=5,g.delayTime.value=.08,_.gain.value=.1,v.gain.value=.08,y.gain.value=.9,a.connect(d),d.connect(t.detune),d.connect(n.detune),d.connect(r.detune),t.connect(s).connect(p),n.connect(c).connect(p),r.connect(l).connect(p),i.connect(u).connect(p),o.connect(f).connect(p),ne.connect(S).connect(w),ne.connect(C).connect(w),w.connect(te).connect(b),te.connect(g),p.connect(m).connect(h),h.connect(y).connect(b),h.connect(g),g.connect(_).connect(g),g.connect(v).connect(b),b.connect(ee).connect(x).connect(e.destination),t.start(),n.start(),r.start(),i.start(),a.start(),o.start(),ne.start(),re.forEach(e=>e.oscillator.start()),Oe={carrier:t,overtone:n,sideband:r,sub:i,modulator:a,pulse:o,carrierGain:s,overtoneGain:c,sidebandGain:l,subGain:u,modGain:d,pulseGain:f,noise:ne,noiseGain:S,noiseBurstGain:C,noiseFilter:w,resonatorGain:te,filter:p,drive:m,delay:g,feedback:_,wet:v,dry:y,gain:ee,pan:b,shapeVoices:re},Oe}function bt(e){if(!U)return;if(!((T===`flying`||T===`resolving`)&&H.length>0)){Oe&&Oe.gain.gain.setTargetAtTime(1e-4,U.currentTime,.08);return}if(e-Ae<42)return;Ae=e;let t=yt(),n=U,r=H.reduce((e,t)=>e+ +!t.resolved,0)/H.length,i=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),a=Math.log2(i+1),o=H.map(St),s=Array.from(new Set(H.map(e=>e.skip))).sort((e,t)=>e-t).map(e=>{let t=H.flatMap((t,n)=>t.skip===e?[n]:[]),n=t.map(e=>o[e]),r=e=>n.reduce((t,n)=>t+n[e],0)/Math.max(1,n.length),i=n.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/Math.max(1,n.length),a=n.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/Math.max(1,n.length),s=t.reduce((e,t)=>e+H[t].distinct,0),c=Ie.get(e)||0,l=Math.max(0,s-c);return Ie.set(e,s),{skip:e,glyph:H[t[0]].glyph,area:r(`area`),spread:r(`spread`),elongation:r(`elongation`),density:r(`density`),centroidX:r(`centroidX`),centroidY:r(`centroidY`),orientation:.5*Math.atan2(i,a),coverage:s,presence:Math.min(1,Math.log2(s+1)/10),activity:Math.min(1,Math.log2(l+1)/5),deepest:t.reduce((e,t)=>Math.max(e,H[t].shownDepth),0)}}),c=s.filter(e=>e.coverage>0).length/15,l=s.reduce((e,t)=>t.activity>e.activity?t:e,s[0]),u=l?.activity||0,d=e=>o.reduce((t,n)=>t+n[e],0)/o.length,f=(e,t)=>o.reduce((n,r)=>n+(r[e]-t)**2,0)/o.length,p=d(`area`),m=d(`spread`),h=d(`elongation`),g=d(`density`),_=d(`centroidX`),v=d(`centroidY`),y=Math.min(1,Math.sqrt(o.reduce((e,t)=>e+(t.centroidX-_)**2+(t.centroidY-v)**2,0)/o.length*.5)),b=Math.min(1,Math.sqrt(f(`spread`,m)+f(`elongation`,h)+f(`density`,g))),ee=o.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/o.length,x=o.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/o.length,S=.5*Math.atan2(ee,x),C=Math.min(1,Math.hypot(ee,x)),w=H.reduce((e,t)=>e+t.distinct,0),te=Math.min(1,w/Math.max(1,H.length*96)),ne=H.reduce((e,t)=>e+Math.min(1,Math.hypot(t.zr,t.zi)/2),0)/H.length,re=Math.min(1,H.length/Math.max(1,V.skips*Ve)),E=o[H.reduce((e,t,n)=>t.distinct*(.35+o[n].spread)*(.6+o[n].density)>H[e].distinct*(.35+o[e].spread)*(.6+o[e].density)?n:e,0)],D=Math.min(1,(1-E.elongation)*.58+C*.42),O=Math.min(1,b*1.7+(1-g)*.24+ne*.28),ie=Math.max(0,w-Ne),ae=Math.min(1,Math.log2(ie+1)/4.5);Ne=w;let k=H.filter(e=>Number.isFinite(e.stepDistance)&&e.stepDistance>0).map(e=>({proximity:Math.max(0,Math.min(1,(-Math.log2(Math.max(e.stepDistance,1e-12))-.25)/15)),contraction:Math.max(0,Math.min(1,e.distanceContraction/1.5))})),oe=e=>e.length?(e.sort((e,t)=>e-t),e[Math.min(e.length-1,Math.floor(e.length*.8))]):0,A=oe(k.map(e=>e.proximity)),se=oe(k.map(e=>e.contraction)),j=2**((A*14+se*3)/12),ce=H[0],le=Math.abs(Math.round((ce.cr+2.2)*137+(ce.ci+1.5)*211)),M=ht[le%ht.length],ue=34+le*7%12,N=e=>{let t=Math.round(e),n=(t%M.length+M.length)%M.length,r=Math.floor(t/M.length);return 440*2**((ue+M[n]+r*12-69)/12)},de=a*.2+E.spread*3.7+E.elongation*2.8+(E.orientation/Math.PI+.5)*2.4+E.centroidY*1.6,P=1+Math.round(y*4+b*3+c*2),fe=Math.min(900,N(de)*j),F=Math.min(1900,N(de+2+Math.round(D*2))*j),I=Math.min(2400,N(de+P+3)*j),L=Math.min(7600,150+p*2700+g*1500+a*48+O*1500+A*1800),pe=Math.min(.045,.007+r*.01+m*.007+te*.006+re*.003+ae*.004+c*.006+u*.004),me=Math.max(-.76,Math.min(.76,_*.52+Math.sin(e*.001*(.22+y*1.7)+S)*y*.34)),R=n.currentTime,he=[0,2,1,3,4,5,6],ge=e=>Math.log2(e.deepest+1)*.16+he[e.glyph]+e.spread*3.2+e.elongation*2.4+(e.orientation/Math.PI+.5)*2+e.centroidY*1.4;t.shapeVoices.forEach((e,t)=>{let n=s.find(e=>e.skip===t+1);if(!n||n.coverage===0){e.gain.gain.setTargetAtTime(1e-4,R,.08);return}let r=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`];e.oscillator.type=r[n.glyph],e.oscillator.frequency.setTargetAtTime(Math.min(1800,N(ge(n))*j),R,.065),e.gain.gain.setTargetAtTime(.002+n.presence*.028+n.activity*.07+c*.004,R,.045),e.pan.pan.setTargetAtTime(Math.max(-.88,Math.min(.88,n.centroidX*.72+Math.sin(n.orientation)*.15)),R,.07)}),t.carrier.frequency.setTargetAtTime(fe,R,.055),t.overtone.frequency.setTargetAtTime(F,R,.075),t.sideband.frequency.setTargetAtTime(I,R,.085),t.sub.frequency.setTargetAtTime(Math.max(28,fe*.5),R,.1),t.carrierGain.gain.setTargetAtTime(.16+D*.36,R,.1),t.overtoneGain.gain.setTargetAtTime(.035+g*.25+C*.08,R,.1),t.sidebandGain.gain.setTargetAtTime(.008+E.elongation*.13+O*.075,R,.1),t.subGain.gain.setTargetAtTime(.025+p*.16+D*.035,R,.12),t.modulator.frequency.setTargetAtTime(.18+g*3.6+y*4.2+r+se*2.4,R,.12),t.modGain.gain.setTargetAtTime(2+O*74+b*46+se*18,R,.11),t.filter.frequency.setTargetAtTime(L,R,.08),t.filter.Q.setTargetAtTime(.8+E.elongation*7.2+D*2.6,R,.09),t.drive.gain.setTargetAtTime(.62+O*1.25+g*.42,R,.1),t.noiseGain.gain.setTargetAtTime(15e-5+O*.01+ae*.004,R,.07),t.noiseFilter.frequency.setTargetAtTime(Math.min(7200,fe*(2.2+g*5.4+y*2.5)),R,.08),t.noiseFilter.Q.setTargetAtTime(1.5+g*10+C*5,R,.09),t.resonatorGain.gain.setTargetAtTime(.1+O*.28+ae*.24,R,.09),t.delay.delayTime.setTargetAtTime(.024+p*.12+y*.12,R,.12),t.feedback.gain.setTargetAtTime(.04+E.elongation*.18+y*.18,R,.14),t.wet.gain.setTargetAtTime(.025+m*.1+y*.13+c*.045,R,.14),t.dry.gain.setTargetAtTime(.9-O*.14,R,.14),t.pan.pan.setTargetAtTime(me,R,.08),t.gain.gain.setTargetAtTime(pe*(T===`resolving`?.76:1),R,.09);let _e=i-W,ve=Math.max(42,310-Math.min(155,a*11)-ae*88-O*42-A*72-u*92);if((_e>0||u>.08)&&e-Me>=ve){let n=1+(le+Math.round(E.elongation*5))%Math.max(2,M.length-1),r=(u>.08?ge(l):de)+G*n%M.length+(G%4==3?P:0),a=3+le%5,o=G%a===0?1:.54+D*.22,s=Math.min(.88,(.18+p*.18+g*.18+ae*.18+O*.1+u*.28)*o),c=.028+p*.065+D*.04+y*.03+(l?.spread||0)*.035;t.pulse.frequency.setValueAtTime(Math.min(2600,N(r+M.length)*j),R),t.pulseGain.gain.cancelScheduledValues(R),t.pulseGain.gain.setValueAtTime(1e-4,R),t.pulseGain.gain.exponentialRampToValueAtTime(s,R+.008),t.pulseGain.gain.exponentialRampToValueAtTime(1e-4,R+c);let d=Math.min(.48,(.035+O*.24+ae*.18)*o);t.noiseBurstGain.gain.cancelScheduledValues(R),t.noiseBurstGain.gain.setValueAtTime(1e-4,R),t.noiseBurstGain.gain.exponentialRampToValueAtTime(Math.max(2e-4,d),R+.004),t.noiseBurstGain.gain.exponentialRampToValueAtTime(1e-4,R+.025+y*.06),Me=e,W=i,G+=1}}function xt(e=!1){let t=performance.now();if(!e&&t-_e<33)return;let n=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),r=H.reduce((e,t)=>e+Ct(t,t.shownDepth),0),i=H.reduce((e,t)=>e+t.distinct,0),a=H.length?H.reduce((e,t)=>e+St(t).spread,0)/H.length:0,o=H.length?H.filter(e=>e.resolved).length/H.length:0,s=H.length?H.reduce((e,t)=>e+Math.min(1,t.shownDepth/h.current.maxDepth),0)/H.length:0,c=o*.8+s*.2;ke({phase:T,score:r,skips:V.skips,deepest:n,progress:c,coverage:i,spread:a}),_e=t}function Tt(e){if(e.depth<=Ze||e.depth%it!==0)return;let t=(e.zr-lt.x)/pt*.5+.5,n=(e.zi-lt.y)/mt*.5+.5;if(t<0||t>=1||n<0||n>=1)return;let r=Math.min(tt-1,Math.floor(t*tt)),i=Math.min(tt-1,Math.floor(n*tt)),a=i*tt+r,o=a>>>5,s=1<<(a&31);(e.cells[o]&s)===0&&(e.cells[o]|=s,e.distinct+=1,e.sumX+=r,e.sumY+=i,e.sumXX+=r*r,e.sumYY+=i*i,e.sumXY+=r*i)}function Et(){I+=1,T=`ready`,O=-1,k=`none`,Ee=[],De=[],H=[],Ke=[],qe=[],Qe=0,$e=0,et=0,rt=!1,ot=0,L=Math.floor(Math.random()*K),Ie.clear(),W=0,Ne=0,Me=0,G=0;let e=dt();F={...e},V={x:e.x,y:e.y,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},Pe(null),n.current?.clear(),Z=!0,xt(!0)}d.current=Et;function kt(e,t){v.current||(n.current?.beginThrow(l.current,i,a,h.current.rotateRight),n.current?.setTuning(h.current),n.current?.setAtmosphere(de),n.current?.setLayer(`throw`));let r=dt(),o=Math.cos(e),s=Math.sin(e),c=t*t*(3-2*t),u=$()*(.32+.56*c),d=$()*Ye*t,f=ft()*Je;F={x:r.x-o*f*t,y:r.y-s*f*t},V.x=r.x-o*d,V.y=r.y-s*d,V.vx=o*u,V.vy=s*u,V.vz=$()*(.38+.2*c),V.z=1,V.spin=0,V.skips=0,V.bounceAge=10,T=`flying`,vt(170,.12,.07),Z=!0,xt(!0)}function At(e,t=!1){w.current=!0,t&&ge(!0),ve(!0),we(e.name||`YOU`),x.current=e,R(!0),te.current||=Ot();let r=Dt({...h.current,rotateRight:e.rotateRight,sourceDots:e.sourceDots});h.current=r,Fe(r),n.current?.setTuning(r),_.current(),g.current(),un(e.view),Et(),L=e.glyph,I=e.seed,Te=e.skips,kt(e.angle,e.power)}C.current=At,p.current=un;function jt(e,t,r,o,s,c){let u=z(e,t,i,a,l.current,h.current.rotateRight),d={x:Math.fround(u.x),y:Math.fround(u.y)},f=(o+r-1)%K,p=v.current?6:h.current.sourceDots,m=Nt(e,t,i,a,l.current,p,f,h.current.rotateRight),g=c?.gpu??!v.current;if((c?.ripple??!v.current)&&De.push({cr:d.x,ci:d.y,born:s,index:r}),!v.current){Ee.push({cr:d.x,ci:d.y,born:s,index:r});for(let e of m)H.push({zr:0,zi:0,cr:e.x,ci:e.y,depth:0,shownDepth:0,skip:r,glyph:f,stepDistance:0,distanceContraction:0,resolved:!1,score:0,offscreenStreak:0,tinyHopStreak:0,cells:new Uint32Array(nt),distinct:0,sumX:0,sumY:0,sumXX:0,sumYY:0,sumXY:0})}g&&n.current?.spawn(m,r),v.current||(vt(320+r*62,.1,.06),`vibrate`in navigator&&navigator.vibrate?.(12)),xt(!0)}function Pt(e){T===`resolving`||T===`result`||(T=`resolving`,he=e,xt(!0))}function It(){if(T===`result`)return;T=`result`,v.current||n.current?.freeze(),H.forEach(e=>{e.resolved||(e.resolved=!0,e.score=Ct(e,e.depth)),e.shownDepth=e.depth});let e=H.reduce((e,t)=>e+t.score,0),t=H.reduce((e,t)=>Math.max(e,t.depth),0),r=H.reduce((e,t)=>e+t.distinct,0),i=H.length?H.reduce((e,t)=>e+St(t).spread,0)/H.length:0,a=`${Date.now()}-${I}`;if(w.current)Pe(null);else{Pe(a);let n={id:a,name:m.current||`YOU`,score:e,deepest:t,skips:V.skips,coverage:r,spread:i,createdAt:new Date().toISOString()};je(e=>{let t=[...e,n].sort((e,t)=>t.score-e.score||t.deepest-e.deepest||e.createdAt.localeCompare(t.createdAt)).slice(0,10);return Ft(t),t})}x.current&&history.replaceState(null,``,Re(window.location.href,x.current)),ke({phase:T,score:e,skips:V.skips,deepest:t,progress:1,coverage:r,spread:i}),vt(720,.18,.07)}function Lt(e,t){let n=1-Math.exp(-t/.055),r=()=>{for(let e of H){let t=e.depth-e.shownDepth;e.shownDepth=t<16?e.depth:Math.min(e.depth,e.shownDepth+Math.max(1,t*n))}};if(!H.filter(e=>!e.resolved).length){r();let t=H.every(e=>e.depth-e.shownDepth<16);T===`resolving`&&e-he>250&&t?It():xt();return}let o=Math.max(1,Math.floor(Xe/Math.max(H.length,1))),s=l.current,c=h.current.rotateRight,d=Math.hypot(i,a)*at;for(let e of H){if(e.resolved)continue;let t=pe(e.depth,h.current.maxDepth,o,h.current.acceleration);for(let n=0;n<t&&e.depth<h.current.maxDepth;n++){let t=e.zr,n=e.zi,r=Math.fround(Math.fround(t*t-n*n)+e.cr),o=Math.fround(Math.fround(2*t*n)+e.ci),l=Math.hypot(r-t,o-n);if(Number.isFinite(l)){let t=e.stepDistance||l,n=Math.max(-4,Math.min(4,Math.log2(Math.max(t,1e-12)/Math.max(l,1e-12))));e.distanceContraction=e.distanceContraction*.82+n*.18,e.stepDistance=t*.82+l*.18}e.zi=o,e.zr=r,e.depth+=1,Tt(e);let f=ye(t,n,s,i,a,c),p=ye(r,o,s,i,a,c),m=Math.hypot((p.x-f.x)*i*.5,(p.y-f.y)*a*.5),h=Math.abs(p.x)<=1.02&&Math.abs(p.y)<=1.02,g=r>=me.xMin&&r<=me.xMax&&o>=me.yMin&&o<=me.yMax,_=u({magSq:r*r+o*o,hopPx:m,onScreen:h||g,offscreenStreak:e.offscreenStreak,tinyHopStreak:e.tinyHopStreak,maxHopPx:d});if(e.offscreenStreak=_.offscreenStreak,e.tinyHopStreak=_.tinyHopStreak,_.resolved){e.resolved=!0;break}}e.depth>=h.current.maxDepth&&(e.resolved=!0),e.resolved&&(e.shownDepth=e.depth,e.score=Ct(e,e.depth))}r();let f=H.every(e=>e.resolved),p=H.every(e=>e.depth-e.shownDepth<16);T===`resolving`&&(f&&p&&e-he>250||e-he>9e3)?It():xt()}function Rt(e,t){if(T!==`flying`)return;let n=$()*1.65;V.x+=V.vx*e,V.y+=V.vy*e,V.z+=V.vz*e,V.vz-=n*e;let r=Math.exp(-.06*e);if(V.vx*=r,V.vy*=r,V.spin+=Math.hypot(V.vx,V.vy)*e*.016,V.bounceAge+=e,V.z<=0&&V.vz<0){if(V.z=0,V.x<24||V.x>i-24||V.y<24||V.y>a-24){Pt(t);return}V.skips+=1,V.bounceAge=0,jt(V.x,V.y,V.skips,L,t);let e=Te-V.skips;V.vz=Math.max(Math.abs(V.vz)*.56,$()*(.05+e*.008)),V.vx*=.79,V.vy*=.79;let n=(wt(I<<8^V.skips)()-.5)*Math.PI/60,r=Math.cos(n),o=Math.sin(n),s=V.vx*r-V.vy*o;if(V.vy=V.vx*o+V.vy*r,V.vx=s,e>0){let e=Math.hypot(V.vx,V.vy),t=$()*.09;e>0&&e<t&&(V.vx*=t/e,V.vy*=t/e)}(V.skips>=Te||V.x<-50||V.x>i+50||V.y<-50||V.y>a+50)&&Pt(t)}}function zt(){let e=M(i,a),t=Math.atan2(a*.5-e.y,i*.5-e.x)+(Math.random()-.5)*1.55,n=.48+Math.random()*.42,r=n*n*(3-2*n),o=$()*(.32+.56*r),s=$()*Ye*n,c=Math.cos(t),l=Math.sin(t),u=y.current;y.current+=1,I=I+17|0,Ke.push({x:e.x-c*s,y:e.y-l*s,vx:c*o,vy:l*o,vz:$()*(.38+.2*r),z:1,spin:0,skips:0,bounceAge:10,plannedSkips:3,shotId:I,shapeOffset:u%K,path:[{x:e.x-c*s,y:e.y-l*s}],draw:u%50==0})}function Bt(e,t){if(!v.current||!Ke.length)return;let n=$()*1.65,r=[];for(let o of Ke){o.x+=o.vx*e,o.y+=o.vy*e,o.z+=o.vz*e,o.vz-=n*e;let s=Math.exp(-.06*e);o.vx*=s,o.vy*=s,o.spin+=Math.hypot(o.vx,o.vy)*e*.016,o.bounceAge+=e;let c=o.path[o.path.length-1];o.draw&&(!c||Math.hypot(o.x-c.x,o.y-c.y)>=3)&&o.path.push({x:o.x,y:o.y});let l=!0;if(o.z<=0&&o.vz<0)if(o.z=0,o.x<24||o.x>i-24||o.y<24||o.y>a-24)l=!1;else{o.skips+=1,o.bounceAge=0,jt(o.x,o.y,o.skips,o.shapeOffset,t,{gpu:!1,ripple:o.draw});let e=o.plannedSkips-o.skips;o.vz=Math.max(Math.abs(o.vz)*.56,$()*(.05+e*.008)),o.vx*=.79,o.vy*=.79;let n=(wt(o.shotId<<8^o.skips)()-.5)*Math.PI/60,r=Math.cos(n),s=Math.sin(n),c=o.vx*r-o.vy*s;if(o.vy=o.vx*s+o.vy*r,o.vx=c,e>0){let e=Math.hypot(o.vx,o.vy),t=$()*.09;e>0&&e<t&&(o.vx*=t/e,o.vy*=t/e)}(o.skips>=o.plannedSkips||o.x<-50||o.x>i+50||o.y<-50||o.y>a+50)&&(l=!1)}l?r.push(o):o.draw&&qe.length<3&&qe.push({path:o.path,born:t})}Ke=r}function Vt(e){let t=e.x-F.x,n=e.y-F.y,r=Math.hypot(t,n);if(r<12)return[];let o=ft()*Je,s=Math.min(1,r/o),c=s*s*(3-2*s),l=$()*(.32+.56*c),u=$()*Ye*s,d=e.x-t/r*u,f=e.y-n/r*u,p=t/r*l,m=n/r*l,h=$()*(.38+.2*c),g=1,_=0,v=$()*1.65,y=1/120,b=[];for(let e=0;e<2400&&_<3;e++){d+=p*y,f+=m*y,g+=h*y,h-=v*y;let e=Math.exp(-.06*y);if(p*=e,m*=e,g>0||h>=0)continue;if(g=0,d<24||d>i-24||f<24||f>a-24)break;_+=1,b.push({x:d,y:f,index:_,glyph:(L+_-1)%K});let t=3-_;if(h=Math.max(Math.abs(h)*.56,$()*(.05+t*.008)),p*=.79,m*=.79,t>0){let e=Math.hypot(p,m),t=$()*.09;e>0&&e<t&&(p*=t/e,m*=t/e)}if(_>=3||d<-50||d>i+50||f<-50||f>a+50)break}return b}let Ht=[75,175,235];function Ut(e,t,n,r,o,s){if(!X||r<=0)return;let c=h.current.rotateRight,l=Math.hypot(i,a)*at,u=0,d=0;X.lineWidth=.65,X.lineJoin=`round`,X.lineCap=`round`;for(let f=0;f<r;f++){let p=u,m=d,h=Math.fround(Math.fround(p*p-m*m)+e.x),g=Math.fround(Math.fround(2*p*m)+e.y),_=ye(p,m,n,i,a,c),v=ye(h,g,n,i,a,c),y=Math.hypot((v.x-_.x)*i*.5,(v.y-_.y)*a*.5);if(u=h,d=g,y>=l||!Number.isFinite(y))break;let b=s*(1-f/Math.max(1,r))**.42,ee=Math.min(.55,b*.85),x=B(h,g,i,a,n,c);if(f===0){X.fillStyle=`rgba(${o[0]}, ${o[1]}, ${o[2]}, ${ee.toFixed(3)})`,X.beginPath(),X.arc(t.x,t.y,.7,0,ct),X.fill();continue}let S=f===1?t:B(p,m,i,a,n,c);X.strokeStyle=`rgba(${o[0]}, ${o[1]}, ${o[2]}, ${b.toFixed(3)})`,X.beginPath(),X.moveTo(S.x,S.y),X.lineTo(x.x,x.y),X.stroke(),X.fillStyle=`rgba(${o[0]}, ${o[1]}, ${o[2]}, ${ee.toFixed(3)})`,X.beginPath(),X.arc(x.x,x.y,.7,0,ct),X.fill()}}function Wt(e){if(!X)return;X.clearRect(0,0,i,a);let t=Vt(e);if(!t.length)return;let n=h.current,r=l.current;X.globalCompositeOperation=`lighter`;for(let e of t){let t=e.index,o=Math.max(1,Math.floor(n.previewIterations/2**(t-1))),s=.32/(1+(t-1)*.25);Ut(z(e.x,e.y,i,a,r,n.rotateRight),e,r,o,Ht,s)}}function Gt(e){if(T!==`aiming`||!h.current.previewOrbits||!X)return;let t=l.current,n=[Math.round(F.x),Math.round(F.y),t.centerX.toFixed(5),t.centerY.toFixed(5),t.halfY.toFixed(5),h.current.previewIterations,h.current.rotateRight?`1`:`0`,i,a].join(`:`);n!==st&&(st=n,Wt(e)),r.drawImage(Ge,0,0,i,a)}function Kt(e){let t=10**Math.floor(Math.log10(Math.max(e,2**-52))),n=e/t;return(n<=1?1:n<=2?2:n<=5?5:10)*t}function qt(e,t){if(Math.abs(e)<t*.001)return`0`;if(Math.abs(e)>=1e4||Math.abs(e)<.001)return e.toExponential(1);let n=Math.max(0,Math.min(6,-Math.floor(Math.log10(t)))),r=e.toFixed(n);return n?r.replace(/\.?0+$/,``):r}function Jt(){if(!q)return;q.clearRect(0,0,i,a);let e=l.current,t=h.current.rotateRight,n=Ce(e,i,a,t),r=Math.max(n.xMax-n.xMin,n.yMax-n.yMin)*.08,s=n.xMin-r,c=n.xMax+r,u=n.yMin-r,d=n.yMax+r,f=Kt(e.halfY*2/Math.max(a/92,1)),p=f/5,m=e=>Math.round(e*o)/o,g=e=>Math.abs(e/f-Math.round(e/f))<1e-6,_=e=>Math.abs(e)<p*1e-4,v=(n,r)=>B(n,r,i,a,e,t),y=e=>{q.beginPath();let t=Math.ceil(s/p),n=Math.floor(c/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(t,u),i=v(t,d);q.moveTo(m(n.x),m(n.y)),q.lineTo(m(i.x),m(i.y))}q.stroke()},b=e=>{q.beginPath();let t=Math.ceil(u/p),n=Math.floor(d/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(s,t),i=v(c,t);q.moveTo(m(n.x),m(n.y)),q.lineTo(m(i.x),m(i.y))}q.stroke()};if(q.lineWidth=1/o,q.strokeStyle=`rgba(104, 196, 216, .026)`,y(!1),b(!1),q.strokeStyle=`rgba(119, 211, 228, .065)`,y(!0),b(!0),h.current.coordinateAxes){let e=v(s,0),t=v(c,0),n=v(0,u),r=v(0,d);q.strokeStyle=`rgba(151, 231, 240, .18)`,q.lineWidth=1/o,q.beginPath(),q.moveTo(m(e.x),m(e.y)),q.lineTo(m(t.x),m(t.y)),q.moveTo(m(n.x),m(n.y)),q.lineTo(m(r.x),m(r.y)),q.stroke(),q.fillStyle=`rgba(171, 230, 238, .32)`,q.strokeStyle=`rgba(151, 231, 240, .14)`,q.font=`8px ui-monospace, SFMono-Regular, Menlo, monospace`,q.textBaseline=`top`,q.textAlign=`center`;for(let e=Math.ceil(s/f);e<=Math.floor(c/f);e++){let t=e*f;if(_(t))continue;let n=v(t,0);q.beginPath(),q.arc(m(n.x),m(n.y),2,0,ct),q.stroke(),n.x>18&&n.x<i-18&&n.y>9&&n.y<a-9&&q.fillText(qt(t,f),m(n.x),m(n.y)+4)}q.textBaseline=`middle`,q.textAlign=`right`;for(let e=Math.ceil(u/f);e<=Math.floor(d/f);e++){let t=e*f;if(_(t))continue;let n=v(0,t);q.beginPath(),q.arc(m(n.x),m(n.y),2,0,ct),q.stroke(),n.x>28&&n.x<i-8&&n.y>9&&n.y<a-9&&q.fillText(qt(t,f),m(n.x)-5,m(n.y))}q.fillStyle=`rgba(180, 239, 245, .42)`,q.font=`italic 9px ui-monospace, SFMono-Regular, Menlo, monospace`;let l=v(c,0);q.textAlign=`right`,q.textBaseline=`bottom`,q.fillText(`Re(c)`,Math.min(i-7,Math.max(40,l.x-6)),Math.min(a-6,Math.max(14,l.y-4)));let p=v(0,d);q.textAlign=`left`,q.textBaseline=`top`,q.fillText(`Im(c)`,Math.min(i-34,Math.max(6,p.x+6)),Math.max(6,p.y+4))}J=!1}function Yt(e,t){let n=e.z*.3,i=(t+e.skips)%K,a=ze[i],s=Math.min(1,e.z/Math.max($()*.45,1)),c=Math.round(e.x*o)/o,l=Math.round((e.y-n)*o)/o,u=Le?0:Math.exp(-e.bounceAge*8.5)*Math.cos(e.bounceAge*29),d=1+u*.11,f=1-u*.09;r.save(),r.fillStyle=`rgba(0, 4, 9, ${.3*(1-s*.72)})`,r.beginPath(),r.ellipse(c,e.y,10.5*(1+Math.max(0,u)*.08),3.5,0,0,ct),r.fill(),r.restore(),r.save(),r.translate(c,l),r.scale(d,f),r.rotate(e.spin*.18),r.strokeStyle=`rgba(255, 255, 255, .34)`,r.lineWidth=1;for(let e=0;e<a;e++){r.beginPath();for(let t=0;t<=32;t++){let n=Mt(i,e,t/32);t===0?r.moveTo(n.x*10,n.y*10):r.lineTo(n.x*10,n.y*10)}r.stroke()}r.fillStyle=`#ffffff`;let p=v.current?6:Math.max(Be,Math.min(18,h.current.sourceDots));for(let e=0;e<p;e++){let t=e%a,n=Math.floor(e/a),o=Math.ceil((p-t)/a),s=Mt(i,t,n/Math.max(o,1));r.beginPath(),r.arc(s.x*10,s.y*10,1.15,0,ct),r.fill()}r.restore()}function Xt(e,t){if(!(e.length<2||t<=0)){r.save(),r.strokeStyle=`rgba(210, 220, 224, ${t})`,r.lineWidth=1,r.lineJoin=`round`,r.lineCap=`round`,r.beginPath(),r.moveTo(e[0].x,e[0].y);for(let t=1;t<e.length;t++)r.lineTo(e[t].x,e[t].y);r.stroke(),r.restore()}}function Zt(e){if(v.current){let t=0;for(let e of Ke)e.draw&&t<2&&(Xt(e.path,.09),t+=1);qe=qe.filter(t=>e-t.born<le);for(let t=0;t<Math.min(2,qe.length);t++){let n=qe[t],r=Math.min(1,(e-n.born)/le);Xt(n.path,.08*(1-r)*(1-r))}return}T===`resolving`||T===`result`||Yt(V,L)}function Qt(e){De=De.filter(t=>e-t.born<(t.lifetime??2400));for(let t of De){let n=B(t.cr,t.ci,i,a,l.current,h.current.rotateRight),o=t.lifetime??2400,s=(e-t.born)/o;if(s<=0||s>=1)continue;let c=t.maxRadius??Math.max(36,ft()*.14),u=3+s**.7*c,d=Math.sin(s*Math.PI)*(1-s)**1.25,f=v.current?.44:.28,p=Math.max(0,d*f);p<=.002||(r.save(),r.strokeStyle=v.current?`rgba(240, 245, 255, ${p.toFixed(3)})`:`rgba(130, 215, 235, ${p.toFixed(3)})`,r.lineWidth=Math.max(.5,(v.current?1.1:.85)*(1-s*.5)),r.beginPath(),r.arc(n.x,n.y,u,0,ct),r.stroke(),r.restore())}r.textAlign=`center`,r.textBaseline=`middle`;for(let t of Ee){let n=B(t.cr,t.ci,i,a,l.current,h.current.rotateRight),o=e-t.born,s=8e3;if(o<0||o>=s)continue;let c=o/s,u=o<450?1+Math.sin(o/450*Math.PI)*.38:1;r.font=`800 ${Math.round(15*u)}px ui-monospace, monospace`;let d=Math.max(0,(1-c)**.85*.92);d<=.01||(r.save(),r.lineWidth=2.5,r.strokeStyle=`rgba(0, 16, 28, ${(d*.85).toFixed(3)})`,r.strokeText(String(t.index),n.x,n.y+.5),r.fillStyle=`rgba(235, 252, 255, ${d.toFixed(3)})`,r.fillText(String(t.index),n.x,n.y+.5),r.restore())}r.textAlign=`start`,r.textBaseline=`alphabetic`}function $t(){if(T!==`aiming`)return null;let e=dt(),t=e.x-F.x,n=e.y-F.y,r=Math.hypot(t,n);if(r<8)return null;let o=t/r,s=n/r,c=Math.hypot(i,a)*1.18,l=se,u=Math.cos(l),d=Math.sin(l);return{apexX:F.x,apexY:F.y,directionX:o,directionY:s,range:c,leftX:F.x+(o*u-s*d)*c,leftY:F.y+(s*u+o*d)*c,rightX:F.x+(o*u+s*d)*c,rightY:F.y+(s*u-o*d)*c,tipX:F.x+o*c*1.04,tipY:F.y+s*c*1.04}}function en(){let e=n.current;if(e){if(v.current){e.setDisplay({...fe(`intro`),cone:null,cssWidth:i,cssHeight:a});return}if(T===`aiming`){e.setDisplay({...fe(`aiming`),cone:$t(),cssWidth:i,cssHeight:a});return}e.setDisplay({...fe(`play`),cone:null,cssWidth:i,cssHeight:a})}}function tn(e){if(!Q)return;let t=B(me.xMin,me.yMax,i,a,l.current,!1),n=B(me.xMax,me.yMin,i,a,l.current,!1),r=Math.round(Math.min(t.x,n.x)),o=Math.round(Math.min(t.y,n.y)),s=Math.max(1,Math.round(Math.abs(n.x-t.x))),c=Math.max(1,Math.round(Math.abs(n.y-t.y)));e.drawImage(Q,r,o,s,c)}function nn(){if(T!==`aiming`||v.current)return;let e=$t();if(!e)return;let{apexX:t,apexY:s,directionX:c,directionY:l,range:u}=e;if(!n.current&&Q&&Y){if(Z){Y.clearRect(0,0,i,a),tn(Y),Y.globalCompositeOperation=`destination-in`,Y.save(),Y.filter=`blur(${32*o}px)`;let e=Math.atan2(l,c),n=se*2/ct,r=Math.min(n*.22,.04),d=Y.createConicGradient(e-se,t,s);d.addColorStop(0,`rgba(255, 255, 255, 0)`),d.addColorStop(r,`rgba(255, 255, 255, 1)`),d.addColorStop(Math.max(r,n-r),`rgba(255, 255, 255, 1)`),d.addColorStop(n,`rgba(255, 255, 255, 0)`),n<1&&d.addColorStop(1,`rgba(255, 255, 255, 0)`),Y.fillStyle=d,Y.fillRect(0,0,i,a),Y.globalCompositeOperation=`destination-in`;let f=Y.createRadialGradient(t,s,0,t,s,u);f.addColorStop(0,`rgba(255, 255, 255, 0.9)`),f.addColorStop(.55,`rgba(255, 255, 255, 0.4)`),f.addColorStop(1,`rgba(255, 255, 255, 0)`),Y.fillStyle=f,Y.fillRect(0,0,i,a),Y.restore(),Y.globalCompositeOperation=`source-over`,Z=!1}r.save(),r.globalAlpha=.32,r.drawImage(We,0,0,i,a),r.restore()}}function rn(e){en(),r.clearRect(0,0,i,a),J&&Jt(),He&&r.drawImage(He,0,0,i,a);let t=dt();nn(),Gt(t),Qt(e),Zt(e)}function an(e){let t=M(i,a),n=z(t.x,t.y,i,a,l.current,h.current.rotateRight),r=Math.random(),o,s;r<.35?(o=Math.max(18,ft()*(.04+Math.random()*.04)),s=2600+Math.random()*800):r<.75?(o=Math.max(45,ft()*(.09+Math.random()*.08)),s=3400+Math.random()*1e3):(o=Math.max(90,ft()*(.18+Math.random()*.14)),s=4600+Math.random()*1200),De.push({cr:n.x,ci:n.y,born:e,index:1,lifetime:s,maxRadius:o})}function on(e){let t=T===`aiming`&&!v.current;if(!v.current&&!t||b.current||$e!==0&&e-$e<40)return;$e=e,n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:j}),n.current?.setAtmosphere(P);let r=Array.from({length:96},()=>N());n.current?.spawnAppend(r,1,Ue),Math.random()<.04&&an(e)}function sn(e){if(!v.current||b.current)return;if(et||=e,!rt){let t=Math.min(1,(e-et)/ce);t>=1?(rt=!0,E({progress:1,ready:!0})):e-ot>40&&(ot=e,E({progress:t}))}let t=y.current<32?900:2400;Qe!==0&&e-Qe<t||(Qe=e,w.current=!0,n.current?.setTuning({...h.current,maxDepth:j}),n.current?.setAtmosphere(P),zt(),an(e))}function cn(e){let t=Math.min(.05,(e-ee)/1e3);ee=e,S+=t;let n=1/120;for(;S>=n;)Rt(n,e),Bt(n,e),S-=n;sn(e),on(e),Lt(e,t),bt(e),rn(e),c=requestAnimationFrame(cn)}function ln(t){let n=e.getBoundingClientRect();return{x:t.clientX-n.left,y:t.clientY-n.top}}function un(e){let t=l.current,r=h.current.rotateRight;if(T===`flying`||T===`aiming`){let n=xe(V.x,V.y,i,a,t,e,r);if(T===`flying`){let n=Se(V.x,V.y,V.vx,V.vy,i,a,t,e,r);V.vx=n.x,V.vy=n.y;let o=t.halfY/Math.max(e.halfY,1e-6);V.z*=o,V.vz*=o}V.x=n.x,V.y=n.y,T===`aiming`&&(F=xe(F.x,F.y,i,a,t,e,r))}l.current=e,J=!0,Z=!0,n.current?.setView(e)}function dn(t){if(v.current)return;let r=ln(t);O=t.pointerId,e.setPointerCapture(O),T===`ready`&&Math.hypot(r.x-V.x,r.y-V.y)<=48?(k=`aim`,T=`aiming`,Te=f(Math.random),st=``,Z=!0,n.current?.setLayer(`pond`),n.current?.setAtmosphere(P),n.current?.setTuning({...h.current,maxDepth:j}),F=r,V.x=r.x,V.y=r.y,xt(!0)):(k=`pan`,oe=r,ue={...l.current})}function fn(e){let t=ln(e);if(e.pointerId!==O)return;if(k===`pan`){let e=h.current.rotateRight,n=z(oe.x,oe.y,i,a,ue,e),r=z(t.x,t.y,i,a,ue,e);un({centerX:ue.centerX-(r.x-n.x),centerY:ue.centerY-(r.y-n.y),halfY:ue.halfY});return}if(k!==`aim`||T!==`aiming`)return;let n=dt(),r=t.x-n.x,o=t.y-n.y,s=Math.hypot(r,o),c=ft()*Je,l=s>c?c/s:1;F={x:n.x+r*l,y:n.y+o*l},V.x=F.x,V.y=F.y,Z=!0}function pn(t){if(t.pointerId!==O)return;if(Z=!0,k===`pan`){k=`none`,O=-1,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId);return}if(k!==`aim`||T!==`aiming`)return;let r=dt(),i=r.x-F.x,a=r.y-F.y,o=Math.hypot(i,a);if(O=-1,k=`none`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),o<12){T=`ready`,V.x=r.x,V.y=r.y,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(de),n.current?.setLayer(`throw`),xt(!0);return}let s=ft()*Je,c=Math.min(1,o/s),u=Math.atan2(a,i);w.current=!1,ge(!1),ve(!1),te.current=null,x.current={version:1,view:{...l.current},rotateRight:h.current.rotateRight,angle:u,power:c,skips:Te,glyph:L,seed:I,sourceDots:h.current.sourceDots,name:m.current||`YOU`},R(!0),kt(u,c)}function mn(){if(k===`pan`){k=`none`,O=-1;return}if(k!==`aim`||T!==`aiming`)return;T=`ready`,O=-1,k=`none`;let e=dt();F={...e},V.x=e.x,V.y=e.y,Z=!0,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(de),n.current?.setLayer(`throw`),xt(!0)}function hn(e){v.current||(e.key===`Escape`&&mn(),(e.key===` `||e.key===`Enter`)&&T===`result`&&(e.preventDefault(),ne.current()))}let gn=new ResizeObserver(gt);return gn.observe(e),e.addEventListener(`pointerdown`,dn),e.addEventListener(`pointermove`,fn),e.addEventListener(`pointerup`,pn),e.addEventListener(`pointercancel`,mn),window.addEventListener(`keydown`,hn),gt(),Et(),c=requestAnimationFrame(cn),()=>{ut=!0,cancelAnimationFrame(c),gn.disconnect(),e.removeEventListener(`pointerdown`,dn),e.removeEventListener(`pointermove`,fn),e.removeEventListener(`pointerup`,pn),e.removeEventListener(`pointercancel`,mn),window.removeEventListener(`keydown`,hn),U?.close(),C.current=null}},[]);let Z=U.phase===`ready`?`Grab the white orb. Pull back and release.`:U.phase===`aiming`?`Aim for deep water · farther pull = faster throw`:U.phase===`flying`?`Each splash launches a new ${G.sourceDots}-point glyph`:U.phase===`resolving`?`Resolving the pond · ${Math.round(U.progress*100)}%`:`Press Space or throw again`,Ke=Math.max(0,F.indexOf(G.maxDepth)),qe=()=>{if(w.current=!1,ge(!1),ve(!1),te.current){let e=te.current;te.current=null,h.current=e,Fe(e),kt(e),n.current?.setTuning(e),_.current(),g.current()}d.current(),requestAnimationFrame(()=>t.current?.focus())};ne.current=qe;let Qe=()=>{let e=x.current;!e||T||C.current?.(e)},$e=()=>{let e=x.current;if(!e)return;let t=Re(window.location.href,e);history.replaceState(null,``,t),(async()=>{try{if(navigator.share){await navigator.share({title:`Mandelbrot Skipping`,url:t});return}}catch(e){if(e instanceof Error&&e.name===`AbortError`)return}try{await navigator.clipboard.writeText(t),Ee(`Copied`),window.setTimeout(()=>Ee(``),1600)}catch{Ee(`Copy the address bar`),window.setTimeout(()=>Ee(``),2400)}})()},et=U.phase===`flying`||U.phase===`resolving`||!!T;return(0,a.jsxs)(`main`,{className:`gameShell ${_e?`replayMode`:``}`,children:[(0,a.jsxs)(`section`,{className:`playfield`,"aria-label":`Mandelbrot rock skipping game`,children:[(0,a.jsx)(`canvas`,{ref:e,className:`gpuCanvas`,"aria-hidden":`true`}),(0,a.jsx)(`canvas`,{ref:t,className:`gameCanvas`,tabIndex:0,"aria-label":`Throw ready. Drag the white orb backward and release it across the water`}),_e&&(0,a.jsxs)(`p`,{className:`replayBanner`,"aria-live":`polite`,children:[(0,a.jsx)(`span`,{className:`replayBannerName`,children:Oe(V)}),(0,a.jsx)(`span`,{className:`replayBannerLabel`,children:`replay`})]}),T&&(0,a.jsx)(o,{progress:T.progress,fading:O,ready:T.ready,onPlay:Ie}),(U.phase===`flying`||U.phase===`resolving`)&&!T&&(0,a.jsx)(`button`,{type:`button`,className:`playfieldThrowControl`,onClick:qe,"aria-label":`Cancel this throw and rethrow`,children:`Rethrow`}),(0,a.jsxs)(`div`,{className:`playfieldDock`,children:[(0,a.jsx)(`button`,{type:`button`,className:`replayOpening`,onClick:He,disabled:!!T||!!De,"aria-label":`Replay the opening Buddhabrot sequence`,children:`Replay opening`}),(0,a.jsx)(c,{})]})]}),(0,a.jsxs)(`aside`,{className:`scoreRail ${U.phase===`result`?`hasResult`:``}`,"aria-label":`Score and local high scores`,children:[(0,a.jsxs)(`section`,{className:`liveScore`,"aria-live":`polite`,children:[(0,a.jsx)(`span`,{className:`liveLabel`,children:U.phase===`result`?`Final score`:`Live score`}),(0,a.jsx)(`strong`,{className:`liveNumber`,children:xt(U.score)}),(0,a.jsxs)(`span`,{className:`liveMeta`,children:[U.skips,` skips · `,U.deepest?xt(U.deepest):`0`,` deep · `,U.coverage,` cells · `,Math.round(U.spread*100),`% spread`]}),(0,a.jsx)(`span`,{className:`liveProgress`,children:(0,a.jsx)(`i`,{style:{width:`${Math.max(2,U.progress*100)}%`}})}),(0,a.jsxs)(`div`,{className:`throwShareRow`,children:[(0,a.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:Qe,disabled:!L||et,"aria-label":`Replay this throw`,children:`Replay throw`}),(0,a.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:$e,disabled:!L,"aria-label":`Copy a link to this throw`,children:Te||`Share throw`})]})]}),(0,a.jsxs)(`section`,{className:`tuningPanel`,"aria-label":`Orbit tuning`,children:[(0,a.jsxs)(`div`,{className:`tuningHeading`,children:[(0,a.jsx)(`span`,{children:`Orbit tuning`}),(0,a.jsx)(`span`,{children:`Live`})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Glyph dots`}),(0,a.jsx)(`output`,{children:G.sourceDots})]}),(0,a.jsx)(`input`,{type:`range`,min:Be,max:Ve,step:`1`,value:G.sourceDots,"aria-label":`Dots per sacred geometry glyph`,onChange:e=>J({sourceDots:Number(e.target.value)})})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Orbit limit`}),(0,a.jsx)(`output`,{children:Tt(G.maxDepth)})]}),(0,a.jsx)(`input`,{type:`range`,min:`0`,max:F.length-1,step:`1`,value:Ke,"aria-label":`Orbit iteration limit`,"aria-valuetext":`${xt(G.maxDepth)} iterations`,onChange:e=>J({maxDepth:F[Number(e.target.value)]})})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Acceleration curve`}),(0,a.jsxs)(`output`,{children:[G.acceleration.toFixed(1),`×`]})]}),(0,a.jsx)(`input`,{type:`range`,min:I,max:18,step:`0.1`,value:G.acceleration,"aria-label":`Iteration speed acceleration curve`,"aria-valuetext":`${G.acceleration.toFixed(1)} curve`,onChange:e=>J({acceleration:Number(e.target.value)})})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Line persist`}),(0,a.jsxs)(`output`,{children:[G.linePersist.toFixed(2),`s`]})]}),(0,a.jsx)(`input`,{type:`range`,min:We,max:Y,step:`0.05`,value:G.linePersist,"aria-label":`How long iteration lines stay visible`,"aria-valuetext":`${G.linePersist.toFixed(2)} seconds`,onChange:e=>J({linePersist:Number(e.target.value)})})]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.previewOrbits,"aria-label":`Preview skip orbits while aiming`,onChange:e=>J({previewOrbits:e.target.checked})}),`Aim orbit preview`]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.skipColors,"aria-label":`Color each skip differently`,onChange:e=>J({skipColors:e.target.checked})}),`Skip colors`]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.coordinateAxes,"aria-label":`Show coordinate axes`,onChange:e=>J({coordinateAxes:e.target.checked})}),`Coordinate axes`]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.rotateRight,"aria-label":`Rotate coordinates and Buddhabrot 90 degrees right`,onChange:e=>J({rotateRight:e.target.checked})}),`Rotate 90° right`]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Preview iterations`}),(0,a.jsx)(`output`,{children:G.previewIterations})]}),(0,a.jsx)(`input`,{type:`range`,min:Ge,max:X,step:`1`,value:G.previewIterations,"aria-label":`Orbit iterations to draw while aiming`,"aria-valuetext":`${G.previewIterations} iterations`,onChange:e=>J({previewIterations:Number(e.target.value)})})]}),(0,a.jsx)(`p`,{className:`tuningNote`,children:`Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations each skip. Skip colors tint preview and live trails per splash.`})]}),U.phase===`result`&&(0,a.jsxs)(`section`,{className:`railResult`,"aria-label":`Throw result`,children:[(0,a.jsx)(`div`,{className:`resultEyebrow`,children:he?`${Oe(V)} throw`:Ae[0]?.id===Ne?`New local best`:`Throw complete`}),(0,a.jsxs)(`div`,{className:`resultStats`,children:[U.skips,` exact paths · `,xt(U.deepest),` deep · `,U.coverage,` distinct cells · `,Math.round(U.spread*100),`% spread.`]}),(0,a.jsxs)(`div`,{className:`nameRow`,children:[Ne?(0,a.jsx)(`input`,{className:`nameInput`,"aria-label":`High score name`,value:Me,maxLength:12,onChange:e=>q(e.target.value)}):null,(0,a.jsx)(`button`,{className:`throwButton`,onClick:qe,children:`Throw again`})]})]}),(0,a.jsx)(`h2`,{className:`railTitle`,children:`Local legends`}),(0,a.jsx)(`p`,{className:`railSub`,children:`Depth, distinct points, and spatial spread all score. Later skips multiply the result.`}),De&&(0,a.jsx)(`p`,{className:`gpuNote`,role:`status`,children:De}),(0,a.jsxs)(`div`,{className:`scoreList`,children:[Ae.length===0&&(0,a.jsx)(`div`,{className:`emptyScores`,children:`No throws yet.`}),Ae.map((e,t)=>(0,a.jsxs)(`div`,{className:`scoreEntry ${e.id===Ne?`current`:``}`,children:[(0,a.jsx)(`span`,{className:`rank`,children:String(t+1).padStart(2,`0`)}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`scoreName`,children:e.name}),(0,a.jsxs)(`span`,{className:`scoreMeta`,children:[e.skips,` skips · `,xt(e.deepest),` deep · `,e.coverage,` cells · `,Math.round(e.spread*100),`% spread`]})]}),(0,a.jsx)(`span`,{className:`scoreNumber`,children:xt(e.score)})]},e.id))]}),(0,a.jsxs)(`div`,{className:`railHint`,children:[Z,(0,a.jsx)(`br`,{}),`Drag empty water to move · wheel or +/- to zoom.`]}),(0,a.jsxs)(`div`,{className:`railFooter`,children:[`Saved on this device · score model v2 · `,Tt(G.maxDepth),` orbit cap`]})]})]})}export{Lt as default};