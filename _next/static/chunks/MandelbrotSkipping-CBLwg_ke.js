import{r as e}from"./rolldown-runtime-vU33u7is.js";import{i as t,r as n}from"./framework-EwgI_Pa9.js";var r=e(n(),1);async function i(e){let t=navigator.gpu;if(!t)return e(`WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.`),null;let n=await t.requestAdapter({powerPreference:`high-performance`});if(!n)return e(`No GPU adapter found. Throwing still works in reduced visual mode.`),null;let r=await n.requestDevice(),i=!1;r.addEventListener(`uncapturederror`,t=>{i=!0;let n=t.error?.message||String(t.error);console.error(`WebGPU validation`,n),e(`WebGPU validation error: ${n}`)}),r.lost.then(()=>{i=!0,e(`The GPU device was lost. Reload to restore orbit trails.`)});let a=!1;return{device:r,preferredFormat:t.getPreferredCanvasFormat(),hasFailed:()=>i,destroy:()=>{a||(a=!0,r.destroy())}}}var a={trigger:`Buddhabrot`,title:`Buddhabrot`,formula:`z → z² + c`,paragraphs:[`The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.`,`Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. Raise the iteration limit and the picture thins into finer filaments: only the longest escapes remain, as in the animation.`],gif:{file:`buddhabrot-iterations.gif`,alt:`Buddhabrot forming as the maximum iteration count increases`,credit:`Tacodude7729 / Wikimedia Commons`,license:`CC BY-SA 4.0`,licenseUrl:`https://creativecommons.org/licenses/by-sa/4.0/`,sourceUrl:`https://commons.wikimedia.org/wiki/File:BuddhabrotIterationAnimation7729.gif`,articleUrl:`https://en.wikipedia.org/wiki/Buddhabrot`}},o=t();function s({progress:e,fading:t,ready:n,onPlay:r,rotateRight:i=!0}){let{gif:s}=a;return(0,o.jsxs)(`div`,{className:`introOverlay ${t?`fading`:``} ${i?`introRotated`:``}`,role:`status`,"aria-label":`Charting the pond`,children:[(0,o.jsx)(`div`,{className:`introTraverse`,"aria-hidden":`true`,children:(0,o.jsx)(`img`,{src:s.file,alt:``})}),(0,o.jsxs)(`div`,{className:`introChrome`,children:[(0,o.jsx)(`span`,{className:`introTitle`,children:`Mandelbrot Skipping`}),!n&&(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,e*100)}%`}})})]}),n&&(0,o.jsx)(`button`,{type:`button`,className:`introPlay`,onClick:r,"aria-label":`Play`,children:`Play`})]})}function c(){let{trigger:e,title:t,formula:n,paragraphs:r,gif:i}=a;return(0,o.jsxs)(`div`,{className:`howItWorks`,children:[(0,o.jsx)(`button`,{type:`button`,className:`howItWorksTrigger`,"aria-describedby":`how-it-works-panel`,children:e}),(0,o.jsxs)(`div`,{id:`how-it-works-panel`,className:`howItWorksPanel`,role:`tooltip`,children:[(0,o.jsx)(`p`,{className:`howItWorksKicker`,children:t}),(0,o.jsx)(`img`,{className:`howItWorksFilm`,src:i.file,alt:i.alt,width:600,height:337}),(0,o.jsx)(`p`,{className:`howItWorksFormula`,children:n}),r.map(e=>(0,o.jsx)(`p`,{children:e},e.slice(0,24))),(0,o.jsxs)(`p`,{className:`howItWorksCredit`,children:[`Animation:`,` `,(0,o.jsx)(`a`,{href:i.sourceUrl,target:`_blank`,rel:`noreferrer`,children:i.credit}),`,`,` `,(0,o.jsx)(`a`,{href:i.licenseUrl,target:`_blank`,rel:`noreferrer`,children:i.license}),`. Summary after the`,` `,(0,o.jsx)(`a`,{href:i.articleUrl,target:`_blank`,rel:`noreferrer`,children:`Wikipedia Buddhabrot article`}),`.`]})]})]})}var l=.04;function u(e){let t=e.onScreen?0:e.offscreenStreak+1,n=e.hopPx<=.04?e.tinyHopStreak+1:0,r=!Number.isFinite(e.hopPx)||!Number.isFinite(e.magSq),i=e.magSq>4;return{resolved:r||i||n>=500||t>=800,offscreenStreak:t,tinyHopStreak:n}}var d=.76;function f(e,t=d){let n=(1-t**14)/(1-t),r=Math.min(Math.max(e(),0),.999999999)*n;for(let e=2;e<=15;e++)if(r-=t**(e-2),r<0)return e;return 15}function p(e,t,n,r){let i=Math.max(n,r),a=e+n>i?0:e;return{start:a,nextSource:(a+n)%i,sourceCount:Math.min(i,t+n)}}function m(e,t,n){let r=Math.max(0,n-e),i=Math.min(t,r);return{start:e,nextSource:e+i,sourceCount:e+i,added:i}}var h=1024,g=99.92;function _(e,t,n){let r=e.length,i=0;for(let t=0;t<r;t++)i+=e[t];if(i===0)return 0;let a=i*n/100,o=0;for(let n=0;n<r;n++){let i=e[n];if(i>0&&o+i>=a){let e=(a-o)/i;return(n+e)/r*t}o+=i}return t}function v(e,t=20){if(!(t>0))return{low:0,high:1};let n=_(e,t,54),r=_(e,t,g);return{low:n,high:Math.max(r,n+1e-9)}}var y=.05;function b(e){return!Number.isFinite(e)||e<0?0:Math.min(e,y)}function ee(e,t){let n=t.maxSamplesPerFrame??2e6,r=t.minDurationMs??5e3;if(r<=0)return n;let i=b(e)*1e3/r;return Math.max(1,Math.min(n,Math.floor(t.totalSamples*i)))}var x={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5},S=`
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
`,ne={2048:16e6,4096:64e6};function re(e,t){let n=e.device,r=globalThis.GPUBufferUsage,i=globalThis.GPUTextureUsage,{size:a}=t,o=a*a,s=t.totalSamples??ne[a]??16e6,c=t.maxIterations??320,l=n.createBuffer({size:o*4,usage:r.STORAGE|r.COPY_DST}),u=n.createBuffer({size:h*4,usage:r.STORAGE|r.COPY_DST|r.COPY_SRC}),d=n.createBuffer({size:h*4,usage:r.COPY_DST|r.MAP_READ}),f=n.createBuffer({size:32,usage:r.UNIFORM|r.COPY_DST}),p=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),m=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),g=n.createTexture({size:[a,a],format:`rgba8unorm`,usage:i.STORAGE_BINDING|i.TEXTURE_BINDING|i.COPY_SRC}),_=n.createSampler({magFilter:`linear`,minFilter:`linear`}),y=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:S}),entryPoint:`accumulate`}}),b=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:C}),entryPoint:`histogram`}}),re=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:w}),entryPoint:`colorize`}}),T=n.createShaderModule({code:te}),E=n.createRenderPipeline({layout:`auto`,vertex:{module:T,entryPoint:`vs`},fragment:{module:T,entryPoint:`fs`,targets:[{format:e.preferredFormat}]},primitive:{topology:`triangle-list`}}),D=n.createBindGroup({layout:y.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:l}}]}),O=n.createBindGroup({layout:b.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}}]}),ie=n.createBindGroup({layout:re.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:l}},{binding:2,resource:g.createView()}]}),ae=n.createBindGroup({layout:E.getBindGroupLayout(0),entries:[{binding:0,resource:g.createView()},{binding:1,resource:_}]});n.queue.writeBuffer(p,0,new Uint32Array([a,0,0,0]));let k=0,oe=0,A=!1,se=!1,j={low:.69,high:3};function ce(e){let t=new ArrayBuffer(32);new Uint32Array(t,0,4).set([a,oe+1,e,c]),new Float32Array(t,16,4).set([x.xMin,x.xMax,x.yMin,x.yMax]),n.queue.writeBuffer(f,0,t)}function le(){let e=new ArrayBuffer(16);new Uint32Array(e,0,2).set([a,0]),new Float32Array(e,8,2).set([j.low,j.high]),n.queue.writeBuffer(m,0,e)}async function M(){if(!(se||A)){se=!0;try{let e=n.createCommandEncoder({label:`buddhabrot-histogram-readback`});if(e.copyBufferToBuffer(u,0,d,0,h*4),n.queue.submit([e.finish()]),await d.mapAsync(globalThis.GPUMapMode.READ),A)return;j=v(new Uint32Array(d.getMappedRange().slice(0))),d.unmap()}catch(e){console.warn(`[buddhabrot] histogram readback failed`,e)}finally{se=!1}}}return{step(r){if(A||e.hasFailed()||k>=s)return;let i=ee(r,{totalSamples:s,minDurationMs:t.minDurationMs}),o=Math.min(i,s-k);ce(o),le(),n.queue.writeBuffer(u,0,new Uint32Array(h));let c=n.createCommandEncoder({label:`buddhabrot-step`}),l=c.beginComputePass();l.setPipeline(y),l.setBindGroup(0,D),l.dispatchWorkgroups(Math.ceil(o/64)),l.setPipeline(b),l.setBindGroup(0,O),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.setPipeline(re),l.setBindGroup(0,ie),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.end(),n.queue.submit([c.finish()]),k+=o,oe+=1,M()},progress(){return Math.min(1,k/s)},isComplete(){return k>=s},blit(t){if(A||e.hasFailed())return!1;let r=n.createCommandEncoder({label:`buddhabrot-blit`}),i=r.beginRenderPass({colorAttachments:[{view:t.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});return i.setPipeline(E),i.setBindGroup(0,ae),i.draw(3),i.end(),n.queue.submit([r.finish()]),!0},async toBitmapAndBlob(){let t=new OffscreenCanvas(a,a),r=t.getContext(`webgpu`);if(r.configure({device:n,format:e.preferredFormat,alphaMode:`premultiplied`}),!this.blit(r))throw Error(`Buddhabrot generator cannot blit: GPU context is destroyed or has failed.`);return{bitmap:await createImageBitmap(t),blobPromise:t.convertToBlob({type:`image/png`}).catch(e=>(console.warn(`[buddhabrot] PNG encode failed; texture will not be cached`,e),null))}},destroy(){A=!0,n.queue.onSubmittedWorkDone().finally(()=>{g.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy()})}}}var T=`mandelbrot-skipping`,E=`textures`;function D(e){let t=e.matchMedia(`(pointer: coarse)`).matches,n=Math.min(e.screen.width,e.screen.height);return t&&n<=820?2048:4096}function O(e){return`buddhabrot:v3:${e}`}async function ie(e,t){try{return await t.get(O(e))}catch{return null}}async function ae(e,t,n){let r=O(e);try{await n.put(r,t)}catch{return!1}return await k(r,n),!0}async function k(e,t){try{let n=await t.keys();await Promise.all(n.filter(t=>t.startsWith(`buddhabrot:`)&&t!==e).map(e=>t.delete(e).catch(()=>{})))}catch{}}function oe(e){return new Promise((t,n)=>{let r=e.open(T,1);r.onupgradeneeded=()=>{r.result.objectStoreNames.contains(E)||r.result.createObjectStore(E)},r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error),r.onblocked=()=>n(Error(`IndexedDB open blocked`))})}function A(e){return{async get(t){let n=await oe(e);try{return await new Promise((e,r)=>{let i=n.transaction(E,`readonly`).objectStore(E).get(t);i.onsuccess=()=>e(i.result??null),i.onerror=()=>r(i.error)})}finally{n.close()}},async put(t,n){let r=await oe(e);try{await new Promise((e,i)=>{let a=r.transaction(E,`readwrite`);a.objectStore(E).put(n,t),a.oncomplete=()=>e(),a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{r.close()}},async keys(){let t=await oe(e);try{return await new Promise((e,n)=>{let r=t.transaction(E,`readonly`).objectStore(E).getAllKeys();r.onsuccess=()=>e(r.result.map(String)),r.onerror=()=>n(r.error)})}finally{t.close()}},async delete(t){let n=await oe(e);try{await new Promise((e,r)=>{let i=n.transaction(E,`readwrite`);i.objectStore(E).delete(t),i.oncomplete=()=>e(),i.onerror=()=>r(i.error),i.onabort=()=>r(i.error)})}finally{n.close()}}}}var se=.29,j=2e6,ce=5400,le=4200;function M(e,t,n=Math.random){return{x:36+n()*Math.max(8,e-72),y:36+n()*Math.max(8,t-72)}}function ue(e,t){let n=e-.25,r=n*n+t*t;if(r*(r+n)<=.25*t*t)return!0;let i=e+1;if(i*i+t*t<=.0625)return!0;let a=e+.125,o=Math.abs(t);return a*a+(o-.745)*(o-.745)<=.009}function N(e=Math.random){for(let t=0;t<48;t++){let t=e(),n,r;if(t<.5)n=-2.2+e()*3.4,r=-1.5+e()*3;else if(t<.78){let t=e()*Math.PI*2,i=.5*(1-Math.cos(t))+.002+e()*.045;n=.25+i*Math.cos(t),r=i*Math.sin(t)}else n=-2+e()*1.4,r=(e()-.5)*.35;if(ue(n,r))continue;let i=0,a=0,o=!1;for(let e=1;e<=8e3;e++){let t=i*i-a*a+n,s=2*i*a+r;if(i=t,a=s,i*i+a*a>4){e>=8&&(o=!0);break}}if(o)return{x:n,y:r}}return{x:-.75+(e()-.5)*.05,y:.18+(e()-.5)*.05}}var P={drawLines:!0,grayscale:!1,energy:.01,hiddenSteps:0,liveGain:1,contrast:.72,atlasGain:1},F={drawLines:!1,grayscale:!0,energy:.28,hiddenSteps:1,liveGain:.12,contrast:1.22,atlasGain:1},I=.12;function de(e){return e===`intro`?{pondGain:0,throwGain:0,coneEnabled:!1}:e===`aiming`?{pondGain:I,throwGain:0,coneEnabled:!0}:{pondGain:0,throwGain:1,coneEnabled:!1}}var L=[1e4,25e3,5e4,1e5,25e4,5e5,1e6,2e6,5e6,1e7,2e7,5e7,1e8,2e8,5e8,1e9,2e9],R=.5;function fe(e){let t=Math.round((Number(e)||10)*10)/10;return Math.max(R,Math.min(18,t))}function pe(e,t,n,r){let i=Math.max(0,Math.min(1,e/Math.max(t,1)))**+r*Math.max(0,n-4);return Math.min(n,Math.max(4,Math.floor(4+i)))}var z={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5};function me(e,t=!1){return t?1:Math.min(Math.max(e,1),2)}function he(e,t,n){let r=me(n);return{width:Math.max(1,Math.round(e*r)),height:Math.max(1,Math.round(t*r)),dpr:r}}var ge=.8;function _e(e,t,n){return e.halfY*t/Math.max(n,1)}function B(e,t,n){return n?{x:t,y:-e}:{x:e,y:t}}function ve(e,t,n){return n?{dx:-t,dy:e}:{dx:e,dy:t}}function ye(e,t,n,r,i,a=!1){let o=ve((e/n*2-1)*_e(i,n,r),(1-t/r*2)*i.halfY,a);return{x:i.centerX+o.dx,y:i.centerY+o.dy}}function V(e,t,n,r,i,a=!1){let o=_e(i,n,r),s=B(e-i.centerX,t-i.centerY,a);return{x:(s.x/o+1)*n*.5,y:(1-s.y/i.halfY)*r*.5}}function be(e,t,n,r,i,a=!1){let o=B(e-n.centerX,t-n.centerY,a);return{x:o.x/_e(n,r,i),y:o.y/n.halfY}}function xe(e,t,n=ge){return e*n/Math.max(t,1e-6)}function Se(e,t,n,r,i,a,o=!1){let s=ye(e,t,n,r,i,o);return V(s.x,s.y,n,r,a,o)}function Ce(e,t,n,r,i,a,o,s,c=!1){let l=Se(e,t,i,a,o,s,c),u=Se(e+n,t+r,i,a,o,s,c);return{x:u.x-l.x,y:u.y-l.y}}function we(e,t,n,r){let i=_e(e,t,n),a=r?e.halfY:i,o=r?i:e.halfY;return{xMin:e.centerX-a,xMax:e.centerX+a,yMin:e.centerY-o,yMax:e.centerY+o}}var Te=.035,Ee=2.4,H=-8,U=8,W=-Math.PI,De=Math.PI;function Oe(e){return e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12).trim()||`YOU`}function ke(e){return`${Oe(e)}'s`}function Ae(e,t,n){let r=Math.max(0,Math.min(1,(e-t)/(n-t)));return Math.round(r*65535)}function je(e,t,n){return t+e/65535*(n-t)}function Me(e){let t=``;for(let n of e)t+=String.fromCharCode(n);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/g,``)}function Ne(e){if(!/^[A-Za-z0-9_-]+$/.test(e))return null;let t=e+`=`.repeat((4-e.length%4)%4);try{let e=atob(t.replace(/-/g,`+`).replace(/_/g,`/`));return Uint8Array.from(e,e=>e.charCodeAt(0))}catch{return null}}function G(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null}function K(e){return!Number.isFinite(e.view.centerX)||!Number.isFinite(e.view.centerY)||!Number.isFinite(e.view.halfY)||!Number.isFinite(e.angle)||!Number.isFinite(e.power)||e.power<=0||e.power>1||e.skips<2||e.skips>15||e.skips!==Math.round(e.skips)||e.glyph<0||e.glyph>=7||e.glyph!==Math.round(e.glyph)||e.sourceDots<6||e.sourceDots>32||e.sourceDots!==Math.round(e.sourceDots)||e.view.halfY<.035||e.view.halfY>2.4?null:{version:1,view:e.view,rotateRight:e.rotateRight,angle:e.angle,power:e.power,skips:e.skips,glyph:e.glyph,seed:e.seed|0,sourceDots:e.sourceDots,name:Oe(e.name??`YOU`)}}function Pe(e){let t=e.split(`_`);if(t.length!==11)return null;let n=G(t[0]),r=G(t[1]),i=G(t[2]),a=G(t[3]),o=G(t[4]),s=G(t[5]),c=G(t[6]),l=G(t[7]),u=G(t[8]),d=G(t[9]),f=G(t[10]);return n!==1||r==null||i==null||a==null||o==null||s==null||c==null||l==null||u==null||d==null||f==null||o!==0&&o!==1?null:K({view:{centerX:r,centerY:i,halfY:a},rotateRight:o===1,angle:s,power:c,skips:l,glyph:u,seed:d,sourceDots:f})}function Fe(e){let t=Ne(e);if(!t||t.length<20)return null;let n=new DataView(t.buffer,t.byteOffset,t.byteLength);if(n.getUint8(0)!==2)return null;let r=n.getUint8(19);if(t.length!==20+r)return null;let i=new TextDecoder().decode(t.subarray(20,20+r));return K({view:{centerX:je(n.getUint16(1),H,U),centerY:je(n.getUint16(3),H,U),halfY:je(n.getUint16(5),Te,Ee)},rotateRight:(n.getUint8(11)&1)==1,angle:je(n.getUint16(7),W,De),power:je(n.getUint16(9),0,1),skips:n.getUint8(12),glyph:n.getUint8(13),sourceDots:n.getUint8(14),seed:n.getInt32(15),name:i})}function Ie(e){let t=Oe(e.name),n=new TextEncoder().encode(t),r=new Uint8Array(20+n.length),i=new DataView(r.buffer);return i.setUint8(0,2),i.setUint16(1,Ae(e.view.centerX,H,U)),i.setUint16(3,Ae(e.view.centerY,H,U)),i.setUint16(5,Ae(e.view.halfY,Te,Ee)),i.setUint16(7,Ae(e.angle,W,De)),i.setUint16(9,Ae(e.power,0,1)),i.setUint8(11,+!!e.rotateRight),i.setUint8(12,e.skips),i.setUint8(13,e.glyph),i.setUint8(14,e.sourceDots),i.setInt32(15,e.seed|0),i.setUint8(19,n.length),r.set(n,20),Me(r)}function Le(e){return e?e.includes(`_`)&&e.startsWith(`1_`)?Pe(e):Fe(e):null}function q(e){let t=e.hash.startsWith(`#`)?e.hash.slice(1):e.hash,n=new URLSearchParams(t).get(`t`),r=new URLSearchParams(e.search).get(`t`),i=n??r;return i?Le(i):null}function Re(e,t){let n=new URL(e);return n.searchParams.delete(`t`),n.hash=`t=${Ie(t)}`,n.toString()}var J=7,ze=[2,2,2,4,2,3,7],Be=6,Ve=32,Y=4096,He=4096,Ue=L[L.length-1],X=.05,We=.05,Z=8,Ge=10,Ke=50,qe=[[80,214,255],[92,255,196],[186,255,120],[255,230,110],[255,168,92],[255,122,186],[196,146,255]].map(([e,t,n])=>`vec3f(${(e/255).toFixed(5)}, ${(t/255).toFixed(5)}, ${(n/255).toFixed(5)})`).join(`, `),Q={sourceDots:18,maxDepth:2e6,acceleration:10,linePersist:.6,previewOrbits:!1,previewIterations:20,skipColors:!0,coordinateAxes:!1,rotateRight:!0,doublePixels:!1},Je=`mandelbrot-skipping:tuning:v5`,Ye=10,Xe=.3,Ze=.16,Qe=4e5,$e=0,et=6,tt=25e3,nt=tt+Y,rt=32,it=rt*rt/32,at=(rt*rt-1)/12,ot=4,st=2,ct=`mandelbrot-skipping:scores:v2`,lt=`mandelbrot-skipping:scores:v1`,ut=Math.PI*2,dt={x:-.58,y:0},ft=.8,$={x:-.55,y:0},pt=1.52,mt=1.6,ht=1.15,gt=[[0,2,3,5,7,9,10],[0,1,4,6,7,10],[0,2,4,6,8,10],[0,3,5,7,10],[0,1,5,7,8]],_t=`
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
        if (slot < ${Qe}u) {
          vertices[slot] = OrbitPoint(z, depthColor, state.reserved.x);
        }
      }
      if (state.step > u32(params.hiddenSteps) + 1u && (inAtlas || all(abs(previousClip) <= vec2f(1.0))) && i >= firstLineStep) {
        let future = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + state.c;
        let incomingLength = length(clip - previousClip);
        let control1 = previousZ + (z - previousZ) / 3.0;
        let control2 = z - (future - z) / 3.0;
        if (incomingLength <= 0.12 && length(z - previousZ) <= 0.12) {
          let lineVertex = atomicAdd(&lineDrawArgs.vertexCount, ${et*2}u);
          let lineSlot = lineVertex / ${et*2}u;
          if (lineSlot < ${nt}u) {
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
`,vt=`
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
  let colors = array<vec3f, 7>(${qe});
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
`,yt=`
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
  let colors = array<vec3f, 7>(${qe});
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
  let curveIndex = vertex / ${et*2}u;
  let localVertex = vertex % ${et*2}u;
  let subsegment = localVertex / 2u;
  let endpoint = localVertex % 2u;
  let t = f32(subsegment + endpoint) / f32(${et});
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
`,bt=`
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(p[i], 0.0, 1.0);
  out.uv = p[i] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
`,xt=`
${bt}
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
`,St=`
${bt}
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
`;function Ct(e){return Math.round(e).toLocaleString()}function wt(e){let t=e.distinct;if(!t)return{area:0,coverage:0,spread:0,elongation:0,orientation:0,density:0,centroidX:0,centroidY:0};let n=e.sumX/t,r=e.sumY/t,i=Math.max(0,e.sumXX/t-n*n),a=Math.max(0,e.sumYY/t-r*r),o=e.sumXY/t-n*r,s=Math.max(0,i*a-o*o),c=Math.sqrt((i-a)**2+4*o*o),l=Math.max(0,(i+a+c)*.5),u=Math.max(0,(i+a-c)*.5),d=Math.min(1,Math.sqrt(s)/at),f=Math.min(1,Math.log2(1+t)/Math.log2(1+rt*rt)),p=l>.001?Math.min(1,1-Math.sqrt(u/l)):0,m=.5*Math.atan2(2*o,i-a),h=Math.max(1,Math.min(rt*rt,4*Math.PI*Math.sqrt(s))),g=Math.min(1,t/h);return{area:d,coverage:f,spread:Math.sqrt(d),elongation:p,orientation:m,density:g,centroidX:n/(rt-1)*2-1,centroidY:r/(rt-1)*2-1}}function Tt(e,t){let n=Math.min(t,Ue),r=wt(e),i=n*.03+Math.sqrt(n)*75,a=8e4*r.coverage,o=12e4*r.spread*Math.min(1,e.distinct/24);return Math.round((i+a+o)*(1+(e.skip-1)*.12))}function Et(e){let t=e|0;return()=>(t^=t<<13,t^=t>>>17,t^=t<<5,(t>>>0)/4294967296)}function Dt(e){return e>=1e9?`${e/1e9}B`:e>=1e6?`${e/1e6}M`:e>=1e3?`${e/1e3}K`:String(e)}function Ot(e,t){let n=Math.max(0,Math.min(.05,e));return t<=0?0:n===0?1:X**+(n/t)}function kt(e){let t=Math.round(Number(e?.sourceDots)),n=t>=Be?Math.min(Ve,t):Q.sourceDots,r=Number(e?.maxDepth),i=L.includes(r)?r:Q.maxDepth,a=fe(e?.acceleration??10),o=Math.max(We,Math.min(Z,Math.round((Number(e?.linePersist)||Q.linePersist)*20)/20)),s=e?.previewOrbits===!0,c=e?.skipColors!==!1,l=e?.coordinateAxes===!0,u=e?.rotateRight!==!1,d=e?.doublePixels===!0,f=Math.round(Number(e?.previewIterations)||Q.previewIterations);return{sourceDots:n,maxDepth:i,acceleration:a,linePersist:o,previewOrbits:s,previewIterations:Math.max(Ge,Math.min(Ke,f)),skipColors:c,coordinateAxes:l,rotateRight:u,doublePixels:d}}function At(){try{return kt(JSON.parse(localStorage.getItem(Je)||`null`))}catch{return Q}}function jt(e){try{localStorage.setItem(Je,JSON.stringify(e))}catch{}}function Mt(e,t){let n=(t%1+1)%1*e.length,r=Math.floor(n)%e.length,i=n-Math.floor(n),a=e[r],o=e[(r+1)%e.length];return{x:a.x+(o.x-a.x)*i,y:a.y+(o.y-a.y)*i}}function Nt(e,t=-Math.PI/2){return Array.from({length:e},(n,r)=>({x:Math.cos(t+r*ut/e),y:Math.sin(t+r*ut/e)}))}function Pt(e,t,n){let r=(e,t,r)=>({x:e+Math.cos(n*ut-Math.PI/2)*r,y:t+Math.sin(n*ut-Math.PI/2)*r});switch(e%J){case 0:return r(0,0,t===0?1:.46);case 1:return t===0?Mt(Nt(3),n):r(0,0,.48);case 2:return r(t===0?-.32:.32,0,.68);case 3:{let e=t*Math.PI/2;return r(Math.cos(e)*.43,Math.sin(e)*.43,.52)}case 4:{if(t===1)return r(0,0,.34);let e=Nt(5);return Mt([e[0],e[2],e[4],e[1],e[3]],n)}case 5:return t<2?Mt(Nt(3,-Math.PI/2+t*Math.PI),n):r(0,0,.34);default:{if(t===0)return r(0,0,.42);let e=(t-1)*ut/6-Math.PI/2;return r(Math.cos(e)*.42,Math.sin(e)*.42,.42)}}}function Ft(e,t,n,r,i,a,o,s){let c=[],l=ze[o%ze.length];for(let u=0;u<a;u++){let d=u%l,f=Math.floor(u/l),p=Math.ceil((a-d)/l),m=Pt(o,d,f/Math.max(p,1)),h=ye(e+m.x*Ye,t+m.y*Ye,n,r,i,s);c.push({x:Math.fround(h.x),y:Math.fround(h.y)})}return c}function It(){try{let e=JSON.parse(localStorage.getItem(ct)||`null`),t=(e,t=!1)=>e.flatMap(e=>{if(!e||typeof e!=`object`)return[];let n=e;return typeof n.id==`string`&&typeof n.name==`string`&&n.name.length<=12&&Number.isFinite(n.score)&&Number.isFinite(n.deepest)&&Number.isFinite(n.skips)&&typeof n.createdAt==`string`?[{id:n.id,name:n.name,score:t?Math.round(n.score/100):n.score,deepest:n.deepest,skips:n.skips,coverage:Number.isFinite(n.coverage)?n.coverage:0,spread:Number.isFinite(n.spread)?n.spread:0,createdAt:n.createdAt}]:[]}).slice(0,10);if(e?.version===2&&Array.isArray(e.entries))return t(e.entries);let n=JSON.parse(localStorage.getItem(lt)||`null`);if(n?.version!==1||!Array.isArray(n.entries))return[];let r=t(n.entries,!0);return Lt(r),r}catch{return[]}}function Lt(e){try{localStorage.setItem(ct,JSON.stringify({version:2,entries:e}))}catch{}}async function Rt(e,t){let n=t.device,r=e.getContext(`webgpu`),i=t.preferredFormat;r.configure({device:n,format:i,alphaMode:`opaque`});let a=globalThis.GPUBufferUsage,o=globalThis.GPUTextureUsage,s=n.createBuffer({size:Qe*16,usage:a.STORAGE|a.VERTEX}),c=n.createBuffer({size:nt*48,usage:a.STORAGE}),l=n.createBuffer({size:Y*48,usage:a.STORAGE|a.COPY_DST}),u=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),d=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),f=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),h=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),g=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),_=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),v=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),y=n.createBuffer({size:128,usage:a.UNIFORM|a.COPY_DST}),b=n.createSampler({magFilter:`nearest`,minFilter:`nearest`}),ee=n.createShaderModule({code:_t}),x=n.createShaderModule({code:vt}),S=n.createShaderModule({code:yt}),C=n.createShaderModule({code:xt}),w=n.createShaderModule({code:St}),te=n.createComputePipeline({layout:`auto`,compute:{module:ee,entryPoint:`main`}}),ne=n.createRenderPipeline({layout:`auto`,vertex:{module:x,entryPoint:`vs`,buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:`float32x2`},{shaderLocation:1,offset:8,format:`float32`},{shaderLocation:2,offset:12,format:`float32`}]}]},fragment:{module:x,entryPoint:`fs`,targets:[{format:`rgba16float`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`point-list`}}),re=n.createRenderPipeline({layout:`auto`,vertex:{module:S,entryPoint:`vs`},fragment:{module:S,entryPoint:`fs`,targets:[{format:`rgba8unorm`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`max`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`line-list`}}),T=n.createRenderPipeline({layout:`auto`,vertex:{module:C,entryPoint:`vs`},fragment:{module:C,entryPoint:`fadeFs`,targets:[{format:`rgba16float`}]},primitive:{topology:`triangle-list`}}),E=n.createRenderPipeline({layout:`auto`,vertex:{module:C,entryPoint:`vs`},fragment:{module:C,entryPoint:`fadeFs`,targets:[{format:`rgba8unorm`}]},primitive:{topology:`triangle-list`}}),D=n.createRenderPipeline({layout:`auto`,vertex:{module:w,entryPoint:`vs`},fragment:{module:w,entryPoint:`displayFs`,targets:[{format:i}]},primitive:{topology:`triangle-list`}}),O=n.createBindGroup({layout:te.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:l}},{binding:3,resource:{buffer:u}},{binding:4,resource:{buffer:c}},{binding:5,resource:{buffer:d}}]}),ie=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:f}}]}),ae=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:h}}]}),k=n.createBindGroup({layout:re.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:f}}]}),oe=n.createBindGroup({layout:re.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:h}}]}),A=0,j=0,ce=0,le=!1,M=!1,ue=!1,N=[],F=[],I=[],L=null,R=null,fe=[],pe=[],ge=[],_e=[],B=0,ve=0,ye=0,V=0,be=1,xe=1,Se={centerX:$.x,centerY:$.y,halfY:pt},Ce=Q.maxDepth,Te=Q.acceleration,Ee=Q.linePersist,H=Q.skipColors,U=Q.rotateRight,W=Q.doublePixels,De=P.drawLines,Oe=P.grayscale,ke=P.energy,Ae=P.hiddenSteps,je=P.liveGain,Me=P.contrast,Ne=de(`intro`),G=Ne.pondGain,K=Ne.throwGain,Pe=null,Fe=`pond`,Ie={...z},Le={...z},q=0,Re=e=>n.createTexture({size:[ye,V],format:e,usage:o.RENDER_ATTACHMENT|o.TEXTURE_BINDING});function J(e,t){for(let n of t)n&&e.beginRenderPass({colorAttachments:[{view:n.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end()}function ze(e,t,r){return e.map(e=>n.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:e.createView()},{binding:1,resource:b},{binding:2,resource:{buffer:t}}]}))}function Be(){_e=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++)_e[e*2+t]=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:N[e].createView()},{binding:1,resource:F[t].createView()},{binding:2,resource:I[t].createView()},{binding:3,resource:L.createView()},{binding:4,resource:R.createView()},{binding:5,resource:b},{binding:6,resource:{buffer:y}}]})}function Ve(e,t){let r=Fe===`pond`?Ie:Le,i=new ArrayBuffer(80),a=new Uint32Array(i),o=new Float32Array(i);a[0]=A,a[1]=Math.max(1,Math.floor(Qe/Math.max(A,1))),a[2]=Ce,a[3]=De?Math.max(1,Math.floor(tt/Math.max(A,1))):0,o[4]=Se.centerX,o[5]=Se.centerY,o[6]=Se.halfY*ye/Math.max(V,1),o[7]=Se.halfY,o[8]=ye,o[9]=V,o[10]=+!!U,o[11]=Te,o[12]=t,o[13]=Ae,o[16]=r.xMin,o[17]=r.xMax,o[18]=r.yMin,o[19]=r.yMax,n.queue.writeBuffer(e,0,i)}function He(){let t=e.getBoundingClientRect(),r=he(t.width,t.height,me(globalThis.devicePixelRatio||1,W));if(be=Math.max(1,t.width),xe=Math.max(1,t.height),N.length&&r.width===ye&&r.height===V)return;ye=r.width,V=r.height,e.width=ye,e.height=V;for(let e of[...N,...F,...I,L,R])e?.destroy();N=[0,1].map(()=>Re(`rgba16float`)),F=[0,1].map(()=>Re(`rgba16float`)),I=[0,1].map(()=>Re(`rgba8unorm`)),L=Re(`rgba16float`),R=Re(`rgba8unorm`),fe=ze(N,_,T),pe=ze(F,_,T),ge=ze(I,v,E),Be();let i=n.createCommandEncoder({label:`orbit-resize`});J(i,N),J(i,F),J(i,I),J(i,[L,R]),n.queue.submit([i.finish()]),B=0,ve=0}let Ue=new ResizeObserver(He);Ue.observe(e),He();function X(){le||ce||(ce=requestAnimationFrame(We))}function We(){if(ce=0,le||t.hasFailed()||!N.length||ue)return;let e=performance.now(),i=q?(e-q)/1e3:1/60;q=e;let a=Ot(i,Ee);Ve(f,0),Ve(h,1),n.queue.writeBuffer(g,0,new Float32Array([ke,+!!Oe,+!!H,0])),n.queue.writeBuffer(u,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(d,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(_,0,new Float32Array([1,0,0,0])),n.queue.writeBuffer(v,0,new Float32Array([a,0,0,0]));let o=new Float32Array(32);o[0]=Se.centerX,o[1]=Se.centerY,o[2]=Se.halfY*ye/Math.max(V,1),o[3]=Se.halfY,o[4]=+!!U,o[5]=+!!De,o[6]=je,o[7]=Me,o[8]=Ie.xMin,o[9]=Ie.xMax,o[10]=Ie.yMin,o[11]=Ie.yMax,o[12]=Le.xMin,o[13]=Le.xMax,o[14]=Le.yMin,o[15]=Le.yMax,o[16]=G,o[17]=K,o[18]=+!!Pe,o[19]=se,o[20]=Pe?.apexX??0,o[21]=Pe?.apexY??0,o[22]=Pe?.directionX??0,o[23]=Pe?.directionY??0,o[24]=Pe?.range??0,o[25]=.04,o[26]=be,o[27]=xe,n.queue.writeBuffer(y,0,o);let c=n.createCommandEncoder({label:`orbit-draw`});if(A>0&&!M){let e=c.beginComputePass();e.setPipeline(te),e.setBindGroup(0,O),e.dispatchWorkgroups(Math.ceil(A/64)),e.end()}let l=N[1-B],p=F[1-ve],m=I[1-ve];if(Fe===`pond`){let e=c.beginRenderPass({colorAttachments:[{view:l.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(T),e.setBindGroup(0,fe[B]),e.draw(3),e.end()}else{let e=c.beginRenderPass({colorAttachments:[{view:p.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(T),e.setBindGroup(0,pe[ve]),e.draw(3),e.end();let t=c.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});t.setPipeline(E),t.setBindGroup(0,ge[ve]),t.draw(3),t.end()}if(c.beginRenderPass({colorAttachments:[{view:L.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),c.beginRenderPass({colorAttachments:[{view:R.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),A>0&&!M){let e=Fe===`pond`?l:p,t=c.beginRenderPass({colorAttachments:[{view:e.createView(),loadOp:`load`,storeOp:`store`}]});t.setPipeline(ne),t.setBindGroup(0,ae),t.setVertexBuffer(0,s),t.drawIndirect(u,0),t.end();let n=c.beginRenderPass({colorAttachments:[{view:L.createView(),loadOp:`load`,storeOp:`store`}]});n.setPipeline(ne),n.setBindGroup(0,ie),n.setVertexBuffer(0,s),n.drawIndirect(u,0),n.end();let r=c.beginRenderPass({colorAttachments:[{view:R.createView(),loadOp:`load`,storeOp:`store`}]});if(r.setPipeline(re),r.setBindGroup(0,k),r.drawIndirect(d,0),r.end(),Fe===`throw`&&De){let e=c.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(re),e.setBindGroup(0,oe),e.drawIndirect(d,0),e.end()}}Fe===`pond`?B=1-B:ve=1-ve;let b=c.beginRenderPass({colorAttachments:[{view:r.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:1}}]});b.setPipeline(D),b.setBindGroup(0,_e[B*2+ve]),b.draw(3),b.end(),n.queue.submit([c.finish()]),X()}return X(),{spawn(e,t,r=Y){M=!1;let i=new Float32Array(e.length*12),a=new Uint32Array(i.buffer);e.forEach((e,n)=>{let r=n*12;i[r+2]=e.x,i[r+3]=e.y,i[r+4]=t,a[r+7]=1});let o=p(j,A,e.length,r);n.queue.writeBuffer(l,o.start*48,i.buffer,i.byteOffset,i.byteLength),j=o.nextSource,A=o.sourceCount},spawnAppend(e,t,r=Y){M=!1;let i=m(A,e.length,r);if(i.added<=0)return this.spawn(e,t,r),e.length;let a=e.slice(0,i.added),o=new Float32Array(a.length*12),s=new Uint32Array(o.buffer);return a.forEach((e,n)=>{let r=n*12;o[r+2]=e.x,o[r+3]=e.y,o[r+4]=t,s[r+7]=1}),n.queue.writeBuffer(l,i.start*48,o.buffer,o.byteOffset,o.byteLength),j=i.nextSource,A=i.sourceCount,i.added},setView(e){Se={...e}},setTuning(e){Ce=e.maxDepth,Te=e.acceleration,Ee=e.linePersist,H=e.skipColors===!0,U=e.rotateRight===!0;let t=e.doublePixels===!0;t!==W&&(W=t,He())},setAtmosphere(e){De=e.drawLines,Oe=e.grayscale,ke=e.energy,Ae=e.hiddenSteps,je=e.liveGain,Me=e.contrast},setLayer(e){Fe=e},setDisplay(e){G=e.pondGain,K=e.throwGain,Pe=e.cone,be=e.cssWidth,xe=e.cssHeight},beginThrow(e,t,n,r){Se={...e},Le=we(e,t,n,r),Fe=`throw`,this.clear()},clearPond(){if(!N.length)return;let e=n.createCommandEncoder({label:`orbit-clear-pond`});J(e,N),n.queue.submit([e.finish()])},clear(){if(M=!1,A=0,j=0,n.queue.writeBuffer(l,0,new Uint8Array(Y*48)),!F.length)return;let e=n.createCommandEncoder({label:`orbit-clear-throw`});J(e,F),J(e,I),J(e,[L,R].filter(Boolean)),n.queue.submit([e.finish()])},freeze(){M=!0},setSuspended(e){ue=e,e||X()},destroy(){le=!0,cancelAnimationFrame(ce),Ue.disconnect(),N.forEach(e=>e.destroy()),F.forEach(e=>e.destroy()),I.forEach(e=>e.destroy()),L?.destroy(),R?.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),h.destroy(),g.destroy(),_.destroy(),v.destroy(),y.destroy()}}}function zt(){let e=(0,r.useRef)(null),t=(0,r.useRef)(null),n=(0,r.useRef)(null),a=(0,r.useRef)(null),l=(0,r.useRef)({centerX:$.x,centerY:$.y,halfY:pt}),d=(0,r.useRef)(()=>{}),p=(0,r.useRef)(()=>{}),m=(0,r.useRef)(`YOU`),h=(0,r.useRef)({...Q}),g=(0,r.useRef)(()=>{}),_=(0,r.useRef)(()=>{}),v=(0,r.useRef)(!1),y=(0,r.useRef)(0),b=(0,r.useRef)(!1),ee=(0,r.useRef)(()=>{}),x=(0,r.useRef)(null),S=(0,r.useRef)(void 0),C=(0,r.useRef)(null),w=(0,r.useRef)(!1),te=(0,r.useRef)(null),ne=(0,r.useRef)(()=>{}),[T,E]=(0,r.useState)(null),[O,k]=(0,r.useState)(!1),[oe,ue]=(0,r.useState)(!1),[I,fe]=(0,r.useState)(!1),[me,he]=(0,r.useState)(!1),[ge,_e]=(0,r.useState)(!1),[B,ve]=(0,r.useState)(`YOU`),[Te,Ee]=(0,r.useState)(``),[H,U]=(0,r.useState)(null),[W,De]=(0,r.useState)({phase:`ready`,score:0,skips:0,deepest:0,progress:0,coverage:0,spread:0}),[Oe,Ae]=(0,r.useState)([]),[je,Me]=(0,r.useState)(`YOU`),[Ne,G]=(0,r.useState)(null),[K,Pe]=(0,r.useState)({...Q});(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>Ae(It()));return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>{let e=At();h.current=e,Pe(e),n.current?.setTuning(e)});return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let t=e.current;if(!t)return;let r=!1,o=i(U);return a.current=o,o.then(async e=>{if(!e)return;if(r){e.destroy();return}let i=await Rt(t,e);if(r){i?.destroy();return}n.current=i,i?.setView(l.current),i?.setTuning(h.current),v.current?(i?.setTuning({...h.current,maxDepth:j}),i?.setAtmosphere(F),i?.setLayer(`pond`),i?.setDisplay({...de(`intro`),cone:null,cssWidth:1,cssHeight:1})):(i?.setAtmosphere(P),i?.setLayer(`throw`),i?.setDisplay({...de(`play`),cone:null,cssWidth:1,cssHeight:1}))}).catch(()=>U(`Orbit renderer could not start. Throwing remains playable.`)),()=>{r=!0,n.current?.destroy(),n.current=null,a.current=null,o.then(e=>e?.destroy()).catch(()=>{})}},[]),(0,r.useEffect)(()=>{let e=q(window.location),t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;ue(!0),!(e||t)&&(v.current=!0,w.current=!0,y.current=0,b.current=!1,E({progress:0}))},[]);let Fe=(0,r.useCallback)(()=>{b.current||(b.current=!0,k(!0),window.setTimeout(()=>{v.current=!1,w.current=!1,y.current=0,b.current=!1,n.current?.setAtmosphere(P),n.current?.setLayer(`throw`),n.current?.setDisplay({...de(`play`),cone:null,cssWidth:1,cssHeight:1}),n.current?.setTuning(h.current),p.current({centerX:dt.x,centerY:dt.y,halfY:ft}),d.current(),E(null),k(!1)},600))},[]);ee.current=Fe;let Ie=(0,r.useCallback)(()=>{v.current||(v.current=!0,w.current=!0,y.current=0,b.current=!1,n.current?.clearPond(),n.current?.clear(),n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:j}),n.current?.setAtmosphere(F),n.current?.setDisplay({...de(`intro`),cone:null,cssWidth:1,cssHeight:1}),p.current({centerX:$.x,centerY:$.y,halfY:pt}),d.current(),k(!1),E({progress:0}))},[]);(0,r.useEffect)(()=>{if(!oe||T)return;S.current===void 0&&(S.current=q(window.location));let e=S.current;if(!e)return;let t=0,n=()=>{if(S.current===e){if(!C.current){t=window.setTimeout(n,50);return}S.current=null,C.current(e,!0)}};return t=window.setTimeout(n,400),()=>window.clearTimeout(t)},[oe,T]);let Le=(0,r.useCallback)(e=>{let t=e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12);m.current=t,Me(t),x.current&&={...x.current,name:t||`YOU`},ve(t||`YOU`);let n=Ne;n&&Ae(e=>{let r=e.map(e=>e.id===n?{...e,name:t||`YOU`}:e);return Lt(r),r})},[Ne]),Y=(0,r.useCallback)(e=>{let t=kt({...h.current,...e});h.current=t,Pe(t),jt(t),n.current?.setTuning(t),_.current(),g.current()},[]);(0,r.useEffect)(()=>{let e=t.current;if(!e)return;let r=e.getContext(`2d`);if(!r)return;let i=1,o=1,s=1,c=0,ee=performance.now(),S=0,T=`ready`,O=-1,k=`none`,oe={x:0,y:0},ue={...l.current},I={x:0,y:0},L=0,R=0,me=0,ge=0,B={x:0,y:0,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},Te=2,Ee=[],H=[],U=[],W=null,Oe=null,ke=0,je=0,Me=0,Ne=0,K=0,Fe=new Map,Ie=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,Le=document.createElement(`canvas`),q=Le.getContext(`2d`),Y=!0,Ue=document.createElement(`canvas`),X=Ue.getContext(`2d`),We=document.createElement(`canvas`),Z=We.getContext(`2d`),Ge=!0,Ke=null,qe=[],Q=[],Je=0,Ye=0,et=0,tt=!1,nt=0,at=``;g.current=()=>{Ge=!0},_.current=()=>{Y=!0};let ct=!1;(async()=>{try{let e=D(window),t=A(indexedDB),n=await ie(e,t);if(n){if(ct)return;Ke=await createImageBitmap(n),Ge=!0;return}let r=await a.current;if(!r||ct)return;let i=re(r,{size:e});if(await new Promise(e=>{let t=()=>{if(ct){i.destroy(),e();return}if(i.step(1/60),i.isComplete()){e();return}requestAnimationFrame(t)};requestAnimationFrame(t)}),ct){i.destroy();return}let{bitmap:o,blobPromise:s}=await i.toBitmapAndBlob();if(i.destroy(),ct){o.close();return}Ke=o,Ge=!0;let c=await s;c&&!ct&&await ae(e,c,t)}catch{}})();function lt(){return{x:i*.5,y:o*.82}}function ft(){return Math.min(i,o)}function $(){return xe(ft(),l.current.halfY)}function pt(){let t=e.getBoundingClientRect();if(i=Math.max(1,t.width),o=Math.max(1,t.height),s=Math.min(window.devicePixelRatio||1,2),e.width=Math.round(i*s),e.height=Math.round(o*s),r.setTransform(s,0,0,s,0,0),Le.width=Math.round(i*s),Le.height=Math.round(o*s),q?.setTransform(s,0,0,s,0,0),Y=!0,Ue.width=Math.round(i*s),Ue.height=Math.round(o*s),X?.setTransform(s,0,0,s,0,0),Ge=!0,We.width=Math.round(i*s),We.height=Math.round(o*s),Z?.setTransform(s,0,0,s,0,0),at=``,T===`ready`||T===`aiming`||T===`result`){let e=lt();B.x=e.x,B.y=e.y,T!==`aiming`&&(I={...e})}}function _t(){return W||=new AudioContext,W.state===`suspended`&&W.resume(),W}function vt(e,t=.08,n=.05){try{let r=_t(),i=r.createOscillator(),a=r.createGain();i.type=`triangle`,i.frequency.value=e,a.gain.setValueAtTime(n,r.currentTime),a.gain.exponentialRampToValueAtTime(1e-4,r.currentTime+t),i.connect(a).connect(r.destination),i.start(),i.stop(r.currentTime+t)}catch{}}function yt(){if(Oe)return Oe;let e=_t(),t=e.createOscillator(),n=e.createOscillator(),r=e.createOscillator(),i=e.createOscillator(),a=e.createOscillator(),o=e.createOscillator(),s=e.createGain(),c=e.createGain(),l=e.createGain(),u=e.createGain(),d=e.createGain(),f=e.createGain(),p=e.createBiquadFilter(),m=e.createGain(),h=e.createWaveShaper(),g=e.createDelay(.4),_=e.createGain(),v=e.createGain(),y=e.createGain(),b=e.createStereoPanner(),ee=e.createGain(),x=e.createDynamicsCompressor(),S=e.createGain(),C=e.createGain(),w=e.createBiquadFilter(),te=e.createGain(),ne=e.createBufferSource(),re=Array.from({length:15},(t,n)=>{let r=e.createOscillator(),i=e.createGain(),a=e.createStereoPanner();return r.type=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`][n%J],r.frequency.value=110,i.gain.value=1e-4,r.connect(i).connect(a).connect(p),{oscillator:r,gain:i,pan:a}}),T=e.createBuffer(1,Math.round(e.sampleRate*.75),e.sampleRate),E=T.getChannelData(0),D=5370206;for(let e=0;e<E.length;e++)D^=D<<13,D^=D>>>17,D^=D<<5,E[e]=((D>>>0)/2147483648-1)*.55;ne.buffer=T,ne.loop=!0,t.type=`sine`,n.type=`triangle`,r.type=`sawtooth`,i.type=`sine`,a.type=`sine`,o.type=`sine`,s.gain.value=.42,c.gain.value=.16,l.gain.value=.02,u.gain.value=.08,a.frequency.value=1.5,d.gain.value=12,f.gain.value=1e-4,S.gain.value=1e-4,C.gain.value=1e-4,w.type=`bandpass`,w.frequency.value=900,w.Q.value=5,te.gain.value=.2,p.type=`lowpass`,p.frequency.value=420,p.Q.value=2.2,m.gain.value=1;let O=new Float32Array(1024);for(let e=0;e<O.length;e++){let t=e/(O.length-1)*2-1;O[e]=Math.tanh(t*2.35)/Math.tanh(2.35)}return h.curve=O,h.oversample=`2x`,ee.gain.value=1e-4,x.threshold.value=-27,x.knee.value=18,x.ratio.value=5,g.delayTime.value=.08,_.gain.value=.1,v.gain.value=.08,y.gain.value=.9,a.connect(d),d.connect(t.detune),d.connect(n.detune),d.connect(r.detune),t.connect(s).connect(p),n.connect(c).connect(p),r.connect(l).connect(p),i.connect(u).connect(p),o.connect(f).connect(p),ne.connect(S).connect(w),ne.connect(C).connect(w),w.connect(te).connect(b),te.connect(g),p.connect(m).connect(h),h.connect(y).connect(b),h.connect(g),g.connect(_).connect(g),g.connect(v).connect(b),b.connect(ee).connect(x).connect(e.destination),t.start(),n.start(),r.start(),i.start(),a.start(),o.start(),ne.start(),re.forEach(e=>e.oscillator.start()),Oe={carrier:t,overtone:n,sideband:r,sub:i,modulator:a,pulse:o,carrierGain:s,overtoneGain:c,sidebandGain:l,subGain:u,modGain:d,pulseGain:f,noise:ne,noiseGain:S,noiseBurstGain:C,noiseFilter:w,resonatorGain:te,filter:p,drive:m,delay:g,feedback:_,wet:v,dry:y,gain:ee,pan:b,shapeVoices:re},Oe}function bt(e){if(!W)return;if(!((T===`flying`||T===`resolving`)&&U.length>0)){Oe&&Oe.gain.gain.setTargetAtTime(1e-4,W.currentTime,.08);return}if(e-ke<42)return;ke=e;let t=yt(),n=W,r=U.reduce((e,t)=>e+ +!t.resolved,0)/U.length,i=U.reduce((e,t)=>Math.max(e,t.shownDepth),0),a=Math.log2(i+1),o=U.map(wt),s=Array.from(new Set(U.map(e=>e.skip))).sort((e,t)=>e-t).map(e=>{let t=U.flatMap((t,n)=>t.skip===e?[n]:[]),n=t.map(e=>o[e]),r=e=>n.reduce((t,n)=>t+n[e],0)/Math.max(1,n.length),i=n.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/Math.max(1,n.length),a=n.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/Math.max(1,n.length),s=t.reduce((e,t)=>e+U[t].distinct,0),c=Fe.get(e)||0,l=Math.max(0,s-c);return Fe.set(e,s),{skip:e,glyph:U[t[0]].glyph,area:r(`area`),spread:r(`spread`),elongation:r(`elongation`),density:r(`density`),centroidX:r(`centroidX`),centroidY:r(`centroidY`),orientation:.5*Math.atan2(i,a),coverage:s,presence:Math.min(1,Math.log2(s+1)/10),activity:Math.min(1,Math.log2(l+1)/5),deepest:t.reduce((e,t)=>Math.max(e,U[t].shownDepth),0)}}),c=s.filter(e=>e.coverage>0).length/15,l=s.reduce((e,t)=>t.activity>e.activity?t:e,s[0]),u=l?.activity||0,d=e=>o.reduce((t,n)=>t+n[e],0)/o.length,f=(e,t)=>o.reduce((n,r)=>n+(r[e]-t)**2,0)/o.length,p=d(`area`),m=d(`spread`),h=d(`elongation`),g=d(`density`),_=d(`centroidX`),v=d(`centroidY`),y=Math.min(1,Math.sqrt(o.reduce((e,t)=>e+(t.centroidX-_)**2+(t.centroidY-v)**2,0)/o.length*.5)),b=Math.min(1,Math.sqrt(f(`spread`,m)+f(`elongation`,h)+f(`density`,g))),ee=o.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/o.length,x=o.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/o.length,S=.5*Math.atan2(ee,x),C=Math.min(1,Math.hypot(ee,x)),w=U.reduce((e,t)=>e+t.distinct,0),te=Math.min(1,w/Math.max(1,U.length*96)),ne=U.reduce((e,t)=>e+Math.min(1,Math.hypot(t.zr,t.zi)/2),0)/U.length,re=Math.min(1,U.length/Math.max(1,B.skips*Ve)),E=o[U.reduce((e,t,n)=>t.distinct*(.35+o[n].spread)*(.6+o[n].density)>U[e].distinct*(.35+o[e].spread)*(.6+o[e].density)?n:e,0)],D=Math.min(1,(1-E.elongation)*.58+C*.42),O=Math.min(1,b*1.7+(1-g)*.24+ne*.28),ie=Math.max(0,w-Ne),ae=Math.min(1,Math.log2(ie+1)/4.5);Ne=w;let k=U.filter(e=>Number.isFinite(e.stepDistance)&&e.stepDistance>0).map(e=>({proximity:Math.max(0,Math.min(1,(-Math.log2(Math.max(e.stepDistance,1e-12))-.25)/15)),contraction:Math.max(0,Math.min(1,e.distanceContraction/1.5))})),oe=e=>e.length?(e.sort((e,t)=>e-t),e[Math.min(e.length-1,Math.floor(e.length*.8))]):0,A=oe(k.map(e=>e.proximity)),se=oe(k.map(e=>e.contraction)),j=2**((A*14+se*3)/12),ce=U[0],le=Math.abs(Math.round((ce.cr+2.2)*137+(ce.ci+1.5)*211)),M=gt[le%gt.length],ue=34+le*7%12,N=e=>{let t=Math.round(e),n=(t%M.length+M.length)%M.length,r=Math.floor(t/M.length);return 440*2**((ue+M[n]+r*12-69)/12)},P=a*.2+E.spread*3.7+E.elongation*2.8+(E.orientation/Math.PI+.5)*2.4+E.centroidY*1.6,F=1+Math.round(y*4+b*3+c*2),I=Math.min(900,N(P)*j),de=Math.min(1900,N(P+2+Math.round(D*2))*j),L=Math.min(2400,N(P+F+3)*j),R=Math.min(7600,150+p*2700+g*1500+a*48+O*1500+A*1800),fe=Math.min(.045,.007+r*.01+m*.007+te*.006+re*.003+ae*.004+c*.006+u*.004),pe=Math.max(-.76,Math.min(.76,_*.52+Math.sin(e*.001*(.22+y*1.7)+S)*y*.34)),z=n.currentTime,me=[0,2,1,3,4,5,6],he=e=>Math.log2(e.deepest+1)*.16+me[e.glyph]+e.spread*3.2+e.elongation*2.4+(e.orientation/Math.PI+.5)*2+e.centroidY*1.4;t.shapeVoices.forEach((e,t)=>{let n=s.find(e=>e.skip===t+1);if(!n||n.coverage===0){e.gain.gain.setTargetAtTime(1e-4,z,.08);return}let r=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`];e.oscillator.type=r[n.glyph],e.oscillator.frequency.setTargetAtTime(Math.min(1800,N(he(n))*j),z,.065),e.gain.gain.setTargetAtTime(.002+n.presence*.028+n.activity*.07+c*.004,z,.045),e.pan.pan.setTargetAtTime(Math.max(-.88,Math.min(.88,n.centroidX*.72+Math.sin(n.orientation)*.15)),z,.07)}),t.carrier.frequency.setTargetAtTime(I,z,.055),t.overtone.frequency.setTargetAtTime(de,z,.075),t.sideband.frequency.setTargetAtTime(L,z,.085),t.sub.frequency.setTargetAtTime(Math.max(28,I*.5),z,.1),t.carrierGain.gain.setTargetAtTime(.16+D*.36,z,.1),t.overtoneGain.gain.setTargetAtTime(.035+g*.25+C*.08,z,.1),t.sidebandGain.gain.setTargetAtTime(.008+E.elongation*.13+O*.075,z,.1),t.subGain.gain.setTargetAtTime(.025+p*.16+D*.035,z,.12),t.modulator.frequency.setTargetAtTime(.18+g*3.6+y*4.2+r+se*2.4,z,.12),t.modGain.gain.setTargetAtTime(2+O*74+b*46+se*18,z,.11),t.filter.frequency.setTargetAtTime(R,z,.08),t.filter.Q.setTargetAtTime(.8+E.elongation*7.2+D*2.6,z,.09),t.drive.gain.setTargetAtTime(.62+O*1.25+g*.42,z,.1),t.noiseGain.gain.setTargetAtTime(15e-5+O*.01+ae*.004,z,.07),t.noiseFilter.frequency.setTargetAtTime(Math.min(7200,I*(2.2+g*5.4+y*2.5)),z,.08),t.noiseFilter.Q.setTargetAtTime(1.5+g*10+C*5,z,.09),t.resonatorGain.gain.setTargetAtTime(.1+O*.28+ae*.24,z,.09),t.delay.delayTime.setTargetAtTime(.024+p*.12+y*.12,z,.12),t.feedback.gain.setTargetAtTime(.04+E.elongation*.18+y*.18,z,.14),t.wet.gain.setTargetAtTime(.025+m*.1+y*.13+c*.045,z,.14),t.dry.gain.setTargetAtTime(.9-O*.14,z,.14),t.pan.pan.setTargetAtTime(pe,z,.08),t.gain.gain.setTargetAtTime(fe*(T===`resolving`?.76:1),z,.09);let ge=i-Me,_e=Math.max(42,310-Math.min(155,a*11)-ae*88-O*42-A*72-u*92);if((ge>0||u>.08)&&e-je>=_e){let n=1+(le+Math.round(E.elongation*5))%Math.max(2,M.length-1),r=(u>.08?he(l):P)+K*n%M.length+(K%4==3?F:0),a=3+le%5,o=K%a===0?1:.54+D*.22,s=Math.min(.88,(.18+p*.18+g*.18+ae*.18+O*.1+u*.28)*o),c=.028+p*.065+D*.04+y*.03+(l?.spread||0)*.035;t.pulse.frequency.setValueAtTime(Math.min(2600,N(r+M.length)*j),z),t.pulseGain.gain.cancelScheduledValues(z),t.pulseGain.gain.setValueAtTime(1e-4,z),t.pulseGain.gain.exponentialRampToValueAtTime(s,z+.008),t.pulseGain.gain.exponentialRampToValueAtTime(1e-4,z+c);let d=Math.min(.48,(.035+O*.24+ae*.18)*o);t.noiseBurstGain.gain.cancelScheduledValues(z),t.noiseBurstGain.gain.setValueAtTime(1e-4,z),t.noiseBurstGain.gain.exponentialRampToValueAtTime(Math.max(2e-4,d),z+.004),t.noiseBurstGain.gain.exponentialRampToValueAtTime(1e-4,z+.025+y*.06),je=e,Me=i,K+=1}}function xt(e=!1){let t=performance.now();if(!e&&t-ge<33)return;let n=U.reduce((e,t)=>Math.max(e,t.shownDepth),0),r=U.reduce((e,t)=>e+Tt(t,t.shownDepth),0),i=U.reduce((e,t)=>e+t.distinct,0),a=U.length?U.reduce((e,t)=>e+wt(t).spread,0)/U.length:0,o=U.length?U.filter(e=>e.resolved).length/U.length:0,s=U.length?U.reduce((e,t)=>e+Math.min(1,t.shownDepth/h.current.maxDepth),0)/U.length:0,c=o*.8+s*.2;De({phase:T,score:r,skips:B.skips,deepest:n,progress:c,coverage:i,spread:a}),ge=t}function St(e){if(e.depth<=$e||e.depth%ot!==0)return;let t=(e.zr-dt.x)/mt*.5+.5,n=(e.zi-dt.y)/ht*.5+.5;if(t<0||t>=1||n<0||n>=1)return;let r=Math.min(rt-1,Math.floor(t*rt)),i=Math.min(rt-1,Math.floor(n*rt)),a=i*rt+r,o=a>>>5,s=1<<(a&31);(e.cells[o]&s)===0&&(e.cells[o]|=s,e.distinct+=1,e.sumX+=r,e.sumY+=i,e.sumXX+=r*r,e.sumYY+=i*i,e.sumXY+=r*i)}function Ct(){L+=1,T=`ready`,O=-1,k=`none`,Ee=[],H=[],U=[],qe=[],Q=[],Je=0,Ye=0,et=0,tt=!1,nt=0,R=Math.floor(Math.random()*J),Fe.clear(),Me=0,Ne=0,je=0,K=0;let e=lt();I={...e},B={x:e.x,y:e.y,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},G(null),n.current?.clear(),Ge=!0,xt(!0)}d.current=Ct;function Dt(e,t){v.current||(n.current?.beginThrow(l.current,i,o,h.current.rotateRight),n.current?.setTuning(h.current),n.current?.setAtmosphere(P),n.current?.setLayer(`throw`));let r=lt(),a=Math.cos(e),s=Math.sin(e),c=t*t*(3-2*t),u=$()*(.32+.56*c),d=$()*Ze*t,f=ft()*Xe;I={x:r.x-a*f*t,y:r.y-s*f*t},B.x=r.x-a*d,B.y=r.y-s*d,B.vx=a*u,B.vy=s*u,B.vz=$()*(.38+.2*c),B.z=1,B.spin=0,B.skips=0,B.bounceAge=10,T=`flying`,vt(170,.12,.07),Ge=!0,xt(!0)}function Ot(e,t=!1){w.current=!0,t&&he(!0),_e(!0),ve(e.name||`YOU`),x.current=e,fe(!0),te.current||=At();let r=kt({...h.current,rotateRight:e.rotateRight,sourceDots:e.sourceDots});h.current=r,Pe(r),n.current?.setTuning(r),_.current(),g.current(),un(e.view),Ct(),R=e.glyph,L=e.seed,Te=e.skips,Dt(e.angle,e.power)}C.current=Ot,p.current=un;function jt(e,t,r,a,s,c){let u=ye(e,t,i,o,l.current,h.current.rotateRight),d={x:Math.fround(u.x),y:Math.fround(u.y)},f=(a+r-1)%J,p=v.current?6:h.current.sourceDots,m=Ft(e,t,i,o,l.current,p,f,h.current.rotateRight),g=c?.gpu??!v.current;if((c?.ripple??!v.current)&&H.push({cr:d.x,ci:d.y,born:s,index:r}),!v.current){Ee.push({cr:d.x,ci:d.y,born:s,index:r});for(let e of m)U.push({zr:0,zi:0,cr:e.x,ci:e.y,depth:0,shownDepth:0,skip:r,glyph:f,stepDistance:0,distanceContraction:0,resolved:!1,score:0,offscreenStreak:0,tinyHopStreak:0,cells:new Uint32Array(it),distinct:0,sumX:0,sumY:0,sumXX:0,sumYY:0,sumXY:0})}g&&n.current?.spawn(m,r),v.current||(vt(320+r*62,.1,.06),`vibrate`in navigator&&navigator.vibrate?.(12)),xt(!0)}function Mt(e){T===`resolving`||T===`result`||(T=`resolving`,me=e,xt(!0))}function Nt(){if(T===`result`)return;T=`result`,v.current||n.current?.freeze(),U.forEach(e=>{e.resolved||(e.resolved=!0,e.score=Tt(e,e.depth)),e.shownDepth=e.depth});let e=U.reduce((e,t)=>e+t.score,0),t=U.reduce((e,t)=>Math.max(e,t.depth),0),r=U.reduce((e,t)=>e+t.distinct,0),i=U.length?U.reduce((e,t)=>e+wt(t).spread,0)/U.length:0,a=`${Date.now()}-${L}`;if(w.current)G(null);else{G(a);let n={id:a,name:m.current||`YOU`,score:e,deepest:t,skips:B.skips,coverage:r,spread:i,createdAt:new Date().toISOString()};Ae(e=>{let t=[...e,n].sort((e,t)=>t.score-e.score||t.deepest-e.deepest||e.createdAt.localeCompare(t.createdAt)).slice(0,10);return Lt(t),t})}x.current&&history.replaceState(null,``,Re(window.location.href,x.current)),De({phase:T,score:e,skips:B.skips,deepest:t,progress:1,coverage:r,spread:i}),vt(720,.18,.07)}function It(e,t){let n=1-Math.exp(-t/.055),r=()=>{for(let e of U){let t=e.depth-e.shownDepth;e.shownDepth=t<16?e.depth:Math.min(e.depth,e.shownDepth+Math.max(1,t*n))}};if(!U.filter(e=>!e.resolved).length){r();let t=U.every(e=>e.depth-e.shownDepth<16);T===`resolving`&&e-me>250&&t?Nt():xt();return}let a=Math.max(1,Math.floor(Qe/Math.max(U.length,1))),s=l.current,c=h.current.rotateRight,d=Math.hypot(i,o)*st;for(let e of U){if(e.resolved)continue;let t=pe(e.depth,h.current.maxDepth,a,h.current.acceleration);for(let n=0;n<t&&e.depth<h.current.maxDepth;n++){let t=e.zr,n=e.zi,r=Math.fround(Math.fround(t*t-n*n)+e.cr),a=Math.fround(Math.fround(2*t*n)+e.ci),l=Math.hypot(r-t,a-n);if(Number.isFinite(l)){let t=e.stepDistance||l,n=Math.max(-4,Math.min(4,Math.log2(Math.max(t,1e-12)/Math.max(l,1e-12))));e.distanceContraction=e.distanceContraction*.82+n*.18,e.stepDistance=t*.82+l*.18}e.zi=a,e.zr=r,e.depth+=1,St(e);let f=be(t,n,s,i,o,c),p=be(r,a,s,i,o,c),m=Math.hypot((p.x-f.x)*i*.5,(p.y-f.y)*o*.5),h=Math.abs(p.x)<=1.02&&Math.abs(p.y)<=1.02,g=r>=z.xMin&&r<=z.xMax&&a>=z.yMin&&a<=z.yMax,_=u({magSq:r*r+a*a,hopPx:m,onScreen:h||g,offscreenStreak:e.offscreenStreak,tinyHopStreak:e.tinyHopStreak,maxHopPx:d});if(e.offscreenStreak=_.offscreenStreak,e.tinyHopStreak=_.tinyHopStreak,_.resolved){e.resolved=!0;break}}e.depth>=h.current.maxDepth&&(e.resolved=!0),e.resolved&&(e.shownDepth=e.depth,e.score=Tt(e,e.depth))}r();let f=U.every(e=>e.resolved),p=U.every(e=>e.depth-e.shownDepth<16);T===`resolving`&&(f&&p&&e-me>250||e-me>9e3)?Nt():xt()}function Rt(e,t){if(T!==`flying`)return;let n=$()*1.65;B.x+=B.vx*e,B.y+=B.vy*e,B.z+=B.vz*e,B.vz-=n*e;let r=Math.exp(-.06*e);if(B.vx*=r,B.vy*=r,B.spin+=Math.hypot(B.vx,B.vy)*e*.016,B.bounceAge+=e,B.z<=0&&B.vz<0){if(B.z=0,B.x<24||B.x>i-24||B.y<24||B.y>o-24){Mt(t);return}B.skips+=1,B.bounceAge=0,jt(B.x,B.y,B.skips,R,t);let e=Te-B.skips;B.vz=Math.max(Math.abs(B.vz)*.56,$()*(.05+e*.008)),B.vx*=.79,B.vy*=.79;let n=(Et(L<<8^B.skips)()-.5)*Math.PI/60,r=Math.cos(n),a=Math.sin(n),s=B.vx*r-B.vy*a;if(B.vy=B.vx*a+B.vy*r,B.vx=s,e>0){let e=Math.hypot(B.vx,B.vy),t=$()*.09;e>0&&e<t&&(B.vx*=t/e,B.vy*=t/e)}(B.skips>=Te||B.x<-50||B.x>i+50||B.y<-50||B.y>o+50)&&Mt(t)}}function zt(){let e=M(i,o),t=Math.atan2(o*.5-e.y,i*.5-e.x)+(Math.random()-.5)*1.55,n=.48+Math.random()*.42,r=n*n*(3-2*n),a=$()*(.32+.56*r),s=$()*Ze*n,c=Math.cos(t),l=Math.sin(t),u=y.current;y.current+=1,L=L+17|0,qe.push({x:e.x-c*s,y:e.y-l*s,vx:c*a,vy:l*a,vz:$()*(.38+.2*r),z:1,spin:0,skips:0,bounceAge:10,plannedSkips:3,shotId:L,shapeOffset:u%J,path:[{x:e.x-c*s,y:e.y-l*s}],draw:u%50==0})}function Bt(e,t){if(!v.current||!qe.length)return;let n=$()*1.65,r=[];for(let a of qe){a.x+=a.vx*e,a.y+=a.vy*e,a.z+=a.vz*e,a.vz-=n*e;let s=Math.exp(-.06*e);a.vx*=s,a.vy*=s,a.spin+=Math.hypot(a.vx,a.vy)*e*.016,a.bounceAge+=e;let c=a.path[a.path.length-1];a.draw&&(!c||Math.hypot(a.x-c.x,a.y-c.y)>=3)&&a.path.push({x:a.x,y:a.y});let l=!0;if(a.z<=0&&a.vz<0)if(a.z=0,a.x<24||a.x>i-24||a.y<24||a.y>o-24)l=!1;else{a.skips+=1,a.bounceAge=0,jt(a.x,a.y,a.skips,a.shapeOffset,t,{gpu:!1,ripple:a.draw});let e=a.plannedSkips-a.skips;a.vz=Math.max(Math.abs(a.vz)*.56,$()*(.05+e*.008)),a.vx*=.79,a.vy*=.79;let n=(Et(a.shotId<<8^a.skips)()-.5)*Math.PI/60,r=Math.cos(n),s=Math.sin(n),c=a.vx*r-a.vy*s;if(a.vy=a.vx*s+a.vy*r,a.vx=c,e>0){let e=Math.hypot(a.vx,a.vy),t=$()*.09;e>0&&e<t&&(a.vx*=t/e,a.vy*=t/e)}(a.skips>=a.plannedSkips||a.x<-50||a.x>i+50||a.y<-50||a.y>o+50)&&(l=!1)}l?r.push(a):a.draw&&Q.length<3&&Q.push({path:a.path,born:t})}qe=r}function Vt(e){let t=e.x-I.x,n=e.y-I.y,r=Math.hypot(t,n);if(r<12)return[];let a=ft()*Xe,s=Math.min(1,r/a),c=s*s*(3-2*s),l=$()*(.32+.56*c),u=$()*Ze*s,d=e.x-t/r*u,f=e.y-n/r*u,p=t/r*l,m=n/r*l,h=$()*(.38+.2*c),g=1,_=0,v=$()*1.65,y=1/120,b=[];for(let e=0;e<2400&&_<3;e++){d+=p*y,f+=m*y,g+=h*y,h-=v*y;let e=Math.exp(-.06*y);if(p*=e,m*=e,g>0||h>=0)continue;if(g=0,d<24||d>i-24||f<24||f>o-24)break;_+=1,b.push({x:d,y:f,index:_,glyph:(R+_-1)%J});let t=3-_;if(h=Math.max(Math.abs(h)*.56,$()*(.05+t*.008)),p*=.79,m*=.79,t>0){let e=Math.hypot(p,m),t=$()*.09;e>0&&e<t&&(p*=t/e,m*=t/e)}if(_>=3||d<-50||d>i+50||f<-50||f>o+50)break}return b}let Ht=[75,175,235];function Ut(e,t,n,r,a,s){if(!Z||r<=0)return;let c=h.current.rotateRight,l=Math.hypot(i,o)*st,u=0,d=0;Z.lineWidth=.65,Z.lineJoin=`round`,Z.lineCap=`round`;for(let f=0;f<r;f++){let p=u,m=d,h=Math.fround(Math.fround(p*p-m*m)+e.x),g=Math.fround(Math.fround(2*p*m)+e.y),_=be(p,m,n,i,o,c),v=be(h,g,n,i,o,c),y=Math.hypot((v.x-_.x)*i*.5,(v.y-_.y)*o*.5);if(u=h,d=g,y>=l||!Number.isFinite(y))break;let b=s*(1-f/Math.max(1,r))**.42,ee=Math.min(.55,b*.85),x=V(h,g,i,o,n,c);if(f===0){Z.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${ee.toFixed(3)})`,Z.beginPath(),Z.arc(t.x,t.y,.7,0,ut),Z.fill();continue}let S=f===1?t:V(p,m,i,o,n,c);Z.strokeStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${b.toFixed(3)})`,Z.beginPath(),Z.moveTo(S.x,S.y),Z.lineTo(x.x,x.y),Z.stroke(),Z.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${ee.toFixed(3)})`,Z.beginPath(),Z.arc(x.x,x.y,.7,0,ut),Z.fill()}}function Wt(e){if(!Z)return;Z.clearRect(0,0,i,o);let t=Vt(e);if(!t.length)return;let n=h.current,r=l.current;Z.globalCompositeOperation=`lighter`;for(let e of t){let t=e.index,a=Math.max(1,Math.floor(n.previewIterations/2**(t-1))),s=.32/(1+(t-1)*.25);Ut(ye(e.x,e.y,i,o,r,n.rotateRight),e,r,a,Ht,s)}}function Gt(e){if(T!==`aiming`||!h.current.previewOrbits||!Z)return;let t=l.current,n=[Math.round(I.x),Math.round(I.y),t.centerX.toFixed(5),t.centerY.toFixed(5),t.halfY.toFixed(5),h.current.previewIterations,h.current.rotateRight?`1`:`0`,i,o].join(`:`);n!==at&&(at=n,Wt(e)),r.drawImage(We,0,0,i,o)}function Kt(e){let t=10**Math.floor(Math.log10(Math.max(e,2**-52))),n=e/t;return(n<=1?1:n<=2?2:n<=5?5:10)*t}function qt(e,t){if(Math.abs(e)<t*.001)return`0`;if(Math.abs(e)>=1e4||Math.abs(e)<.001)return e.toExponential(1);let n=Math.max(0,Math.min(6,-Math.floor(Math.log10(t)))),r=e.toFixed(n);return n?r.replace(/\.?0+$/,``):r}function Jt(){if(!q)return;q.clearRect(0,0,i,o);let e=l.current,t=h.current.rotateRight,n=we(e,i,o,t),r=Math.max(n.xMax-n.xMin,n.yMax-n.yMin)*.08,a=n.xMin-r,c=n.xMax+r,u=n.yMin-r,d=n.yMax+r,f=Kt(e.halfY*2/Math.max(o/92,1)),p=f/5,m=e=>Math.round(e*s)/s,g=e=>Math.abs(e/f-Math.round(e/f))<1e-6,_=e=>Math.abs(e)<p*1e-4,v=(n,r)=>V(n,r,i,o,e,t),y=e=>{q.beginPath();let t=Math.ceil(a/p),n=Math.floor(c/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(t,u),i=v(t,d);q.moveTo(m(n.x),m(n.y)),q.lineTo(m(i.x),m(i.y))}q.stroke()},b=e=>{q.beginPath();let t=Math.ceil(u/p),n=Math.floor(d/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(a,t),i=v(c,t);q.moveTo(m(n.x),m(n.y)),q.lineTo(m(i.x),m(i.y))}q.stroke()};if(q.lineWidth=1/s,q.strokeStyle=`rgba(104, 196, 216, .026)`,y(!1),b(!1),q.strokeStyle=`rgba(119, 211, 228, .065)`,y(!0),b(!0),h.current.coordinateAxes){let e=v(a,0),t=v(c,0),n=v(0,u),r=v(0,d);q.strokeStyle=`rgba(151, 231, 240, .18)`,q.lineWidth=1/s,q.beginPath(),q.moveTo(m(e.x),m(e.y)),q.lineTo(m(t.x),m(t.y)),q.moveTo(m(n.x),m(n.y)),q.lineTo(m(r.x),m(r.y)),q.stroke(),q.fillStyle=`rgba(171, 230, 238, .32)`,q.strokeStyle=`rgba(151, 231, 240, .14)`,q.font=`8px ui-monospace, SFMono-Regular, Menlo, monospace`,q.textBaseline=`top`,q.textAlign=`center`;for(let e=Math.ceil(a/f);e<=Math.floor(c/f);e++){let t=e*f;if(_(t))continue;let n=v(t,0);q.beginPath(),q.arc(m(n.x),m(n.y),2,0,ut),q.stroke(),n.x>18&&n.x<i-18&&n.y>9&&n.y<o-9&&q.fillText(qt(t,f),m(n.x),m(n.y)+4)}q.textBaseline=`middle`,q.textAlign=`right`;for(let e=Math.ceil(u/f);e<=Math.floor(d/f);e++){let t=e*f;if(_(t))continue;let n=v(0,t);q.beginPath(),q.arc(m(n.x),m(n.y),2,0,ut),q.stroke(),n.x>28&&n.x<i-8&&n.y>9&&n.y<o-9&&q.fillText(qt(t,f),m(n.x)-5,m(n.y))}q.fillStyle=`rgba(180, 239, 245, .42)`,q.font=`italic 9px ui-monospace, SFMono-Regular, Menlo, monospace`;let l=v(c,0);q.textAlign=`right`,q.textBaseline=`bottom`,q.fillText(`Re(c)`,Math.min(i-7,Math.max(40,l.x-6)),Math.min(o-6,Math.max(14,l.y-4)));let p=v(0,d);q.textAlign=`left`,q.textBaseline=`top`,q.fillText(`Im(c)`,Math.min(i-34,Math.max(6,p.x+6)),Math.max(6,p.y+4))}Y=!1}function Yt(e,t){let n=e.z*.3,i=(t+e.skips)%J,a=ze[i],o=Math.min(1,e.z/Math.max($()*.45,1)),c=Math.round(e.x*s)/s,l=Math.round((e.y-n)*s)/s,u=Ie?0:Math.exp(-e.bounceAge*8.5)*Math.cos(e.bounceAge*29),d=1+u*.11,f=1-u*.09;r.save(),r.fillStyle=`rgba(0, 4, 9, ${.3*(1-o*.72)})`,r.beginPath(),r.ellipse(c,e.y,10.5*(1+Math.max(0,u)*.08),3.5,0,0,ut),r.fill(),r.restore(),r.save(),r.translate(c,l),r.scale(d,f),r.rotate(e.spin*.18),r.strokeStyle=`rgba(255, 255, 255, .34)`,r.lineWidth=1;for(let e=0;e<a;e++){r.beginPath();for(let t=0;t<=32;t++){let n=Pt(i,e,t/32);t===0?r.moveTo(n.x*10,n.y*10):r.lineTo(n.x*10,n.y*10)}r.stroke()}r.fillStyle=`#ffffff`;let p=v.current?6:Math.max(Be,Math.min(18,h.current.sourceDots));for(let e=0;e<p;e++){let t=e%a,n=Math.floor(e/a),o=Math.ceil((p-t)/a),s=Pt(i,t,n/Math.max(o,1));r.beginPath(),r.arc(s.x*10,s.y*10,1.15,0,ut),r.fill()}r.restore()}function Xt(e,t){if(!(e.length<2||t<=0)){r.save(),r.strokeStyle=`rgba(210, 220, 224, ${t})`,r.lineWidth=1,r.lineJoin=`round`,r.lineCap=`round`,r.beginPath(),r.moveTo(e[0].x,e[0].y);for(let t=1;t<e.length;t++)r.lineTo(e[t].x,e[t].y);r.stroke(),r.restore()}}function Zt(e){if(v.current){let t=0;for(let e of qe)e.draw&&t<2&&(Xt(e.path,.09),t+=1);Q=Q.filter(t=>e-t.born<le);for(let t=0;t<Math.min(2,Q.length);t++){let n=Q[t],r=Math.min(1,(e-n.born)/le);Xt(n.path,.08*(1-r)*(1-r))}return}T===`resolving`||T===`result`||Yt(B,R)}function Qt(e){H=H.filter(t=>e-t.born<(t.lifetime??2400));for(let t of H){let n=V(t.cr,t.ci,i,o,l.current,h.current.rotateRight),a=t.lifetime??2400,s=(e-t.born)/a;if(s<=0||s>=1)continue;let c=t.maxRadius??Math.max(36,ft()*.14),u=3+s**.7*c,d=Math.sin(s*Math.PI)*(1-s)**1.25,f=v.current?.44:.28,p=Math.max(0,d*f);p<=.002||(r.save(),r.strokeStyle=v.current?`rgba(240, 245, 255, ${p.toFixed(3)})`:`rgba(130, 215, 235, ${p.toFixed(3)})`,r.lineWidth=Math.max(.5,(v.current?1.1:.85)*(1-s*.5)),r.beginPath(),r.arc(n.x,n.y,u,0,ut),r.stroke(),r.restore())}r.textAlign=`center`,r.textBaseline=`middle`;for(let t of Ee){let n=V(t.cr,t.ci,i,o,l.current,h.current.rotateRight),a=e-t.born,s=8e3;if(a<0||a>=s)continue;let c=a/s,u=a<450?1+Math.sin(a/450*Math.PI)*.38:1;r.font=`800 ${Math.round(15*u)}px ui-monospace, monospace`;let d=Math.max(0,(1-c)**.85*.92);d<=.01||(r.save(),r.lineWidth=2.5,r.strokeStyle=`rgba(0, 16, 28, ${(d*.85).toFixed(3)})`,r.strokeText(String(t.index),n.x,n.y+.5),r.fillStyle=`rgba(235, 252, 255, ${d.toFixed(3)})`,r.fillText(String(t.index),n.x,n.y+.5),r.restore())}r.textAlign=`start`,r.textBaseline=`alphabetic`}function $t(){if(T!==`aiming`)return null;let e=lt(),t=e.x-I.x,n=e.y-I.y,r=Math.hypot(t,n);if(r<8)return null;let a=t/r,s=n/r,c=Math.hypot(i,o)*1.18,l=se,u=Math.cos(l),d=Math.sin(l);return{apexX:I.x,apexY:I.y,directionX:a,directionY:s,range:c,leftX:I.x+(a*u-s*d)*c,leftY:I.y+(s*u+a*d)*c,rightX:I.x+(a*u+s*d)*c,rightY:I.y+(s*u-a*d)*c,tipX:I.x+a*c*1.04,tipY:I.y+s*c*1.04}}function en(){let e=n.current;if(e){if(v.current){e.setDisplay({...de(`intro`),cone:null,cssWidth:i,cssHeight:o});return}if(T===`aiming`){e.setDisplay({...de(`aiming`),cone:$t(),cssWidth:i,cssHeight:o});return}e.setDisplay({...de(`play`),cone:null,cssWidth:i,cssHeight:o})}}function tn(e){if(!Ke)return;let t=V(z.xMin,z.yMax,i,o,l.current,!1),n=V(z.xMax,z.yMin,i,o,l.current,!1),r=Math.round(Math.min(t.x,n.x)),a=Math.round(Math.min(t.y,n.y)),s=Math.max(1,Math.round(Math.abs(n.x-t.x))),c=Math.max(1,Math.round(Math.abs(n.y-t.y)));e.drawImage(Ke,r,a,s,c)}function nn(){if(T!==`aiming`||v.current)return;let e=$t();if(!e)return;let{apexX:t,apexY:a,directionX:c,directionY:l,range:u}=e;if(!n.current&&Ke&&X){if(Ge){X.clearRect(0,0,i,o),tn(X),X.globalCompositeOperation=`destination-in`,X.save(),X.filter=`blur(${32*s}px)`;let e=Math.atan2(l,c),n=se*2/ut,r=Math.min(n*.22,.04),d=X.createConicGradient(e-se,t,a);d.addColorStop(0,`rgba(255, 255, 255, 0)`),d.addColorStop(r,`rgba(255, 255, 255, 1)`),d.addColorStop(Math.max(r,n-r),`rgba(255, 255, 255, 1)`),d.addColorStop(n,`rgba(255, 255, 255, 0)`),n<1&&d.addColorStop(1,`rgba(255, 255, 255, 0)`),X.fillStyle=d,X.fillRect(0,0,i,o),X.globalCompositeOperation=`destination-in`;let f=X.createRadialGradient(t,a,0,t,a,u);f.addColorStop(0,`rgba(255, 255, 255, 0.9)`),f.addColorStop(.55,`rgba(255, 255, 255, 0.4)`),f.addColorStop(1,`rgba(255, 255, 255, 0)`),X.fillStyle=f,X.fillRect(0,0,i,o),X.restore(),X.globalCompositeOperation=`source-over`,Ge=!1}r.save(),r.globalAlpha=.32,r.drawImage(Ue,0,0,i,o),r.restore()}}function rn(e){en(),r.clearRect(0,0,i,o),Y&&Jt(),Le&&r.drawImage(Le,0,0,i,o);let t=lt();nn(),Gt(t),Qt(e),Zt(e)}function an(e){let t=M(i,o),n=ye(t.x,t.y,i,o,l.current,h.current.rotateRight),r=Math.random(),a,s;r<.35?(a=Math.max(18,ft()*(.04+Math.random()*.04)),s=2600+Math.random()*800):r<.75?(a=Math.max(45,ft()*(.09+Math.random()*.08)),s=3400+Math.random()*1e3):(a=Math.max(90,ft()*(.18+Math.random()*.14)),s=4600+Math.random()*1200),H.push({cr:n.x,ci:n.y,born:e,index:1,lifetime:s,maxRadius:a})}function on(e){let t=T===`aiming`&&!v.current;if(!v.current&&!t||b.current||Ye!==0&&e-Ye<40)return;Ye=e,n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:j}),n.current?.setAtmosphere(F);let r=Array.from({length:96},()=>N());n.current?.spawnAppend(r,1,He),Math.random()<.04&&an(e)}function sn(e){if(!v.current||b.current)return;if(et||=e,!tt){let t=Math.min(1,(e-et)/ce);t>=1?(tt=!0,E({progress:1,ready:!0})):e-nt>40&&(nt=e,E({progress:t}))}let t=y.current<32?900:2400;Je!==0&&e-Je<t||(Je=e,w.current=!0,n.current?.setTuning({...h.current,maxDepth:j}),n.current?.setAtmosphere(F),zt(),an(e))}function cn(e){let t=Math.min(.05,(e-ee)/1e3);ee=e,S+=t;let n=1/120;for(;S>=n;)Rt(n,e),Bt(n,e),S-=n;sn(e),on(e),It(e,t),bt(e),rn(e),c=requestAnimationFrame(cn)}function ln(t){let n=e.getBoundingClientRect();return{x:t.clientX-n.left,y:t.clientY-n.top}}function un(e){let t=l.current,r=h.current.rotateRight;if(T===`flying`||T===`aiming`){let n=Se(B.x,B.y,i,o,t,e,r);if(T===`flying`){let n=Ce(B.x,B.y,B.vx,B.vy,i,o,t,e,r);B.vx=n.x,B.vy=n.y;let a=t.halfY/Math.max(e.halfY,1e-6);B.z*=a,B.vz*=a}B.x=n.x,B.y=n.y,T===`aiming`&&(I=Se(I.x,I.y,i,o,t,e,r))}l.current=e,Y=!0,Ge=!0,n.current?.setView(e)}function dn(t){if(v.current)return;let r=ln(t);O=t.pointerId,e.setPointerCapture(O),T===`ready`&&Math.hypot(r.x-B.x,r.y-B.y)<=48?(k=`aim`,T=`aiming`,Te=f(Math.random),at=``,Ge=!0,n.current?.setLayer(`pond`),n.current?.setAtmosphere(F),n.current?.setTuning({...h.current,maxDepth:j}),I=r,B.x=r.x,B.y=r.y,xt(!0)):(k=`pan`,oe=r,ue={...l.current})}function fn(e){let t=ln(e);if(e.pointerId!==O)return;if(k===`pan`){let e=h.current.rotateRight,n=ye(oe.x,oe.y,i,o,ue,e),r=ye(t.x,t.y,i,o,ue,e);un({centerX:ue.centerX-(r.x-n.x),centerY:ue.centerY-(r.y-n.y),halfY:ue.halfY});return}if(k!==`aim`||T!==`aiming`)return;let n=lt(),r=t.x-n.x,a=t.y-n.y,s=Math.hypot(r,a),c=ft()*Xe,l=s>c?c/s:1;I={x:n.x+r*l,y:n.y+a*l},B.x=I.x,B.y=I.y,Ge=!0}function pn(t){if(t.pointerId!==O)return;if(Ge=!0,k===`pan`){k=`none`,O=-1,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId);return}if(k!==`aim`||T!==`aiming`)return;let r=lt(),i=r.x-I.x,a=r.y-I.y,o=Math.hypot(i,a);if(O=-1,k=`none`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),o<12){T=`ready`,B.x=r.x,B.y=r.y,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(P),n.current?.setLayer(`throw`),xt(!0);return}let s=ft()*Xe,c=Math.min(1,o/s),u=Math.atan2(a,i);w.current=!1,he(!1),_e(!1),te.current=null,x.current={version:1,view:{...l.current},rotateRight:h.current.rotateRight,angle:u,power:c,skips:Te,glyph:R,seed:L,sourceDots:h.current.sourceDots,name:m.current||`YOU`},fe(!0),Dt(u,c)}function mn(){if(k===`pan`){k=`none`,O=-1;return}if(k!==`aim`||T!==`aiming`)return;T=`ready`,O=-1,k=`none`;let e=lt();I={...e},B.x=e.x,B.y=e.y,Ge=!0,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(P),n.current?.setLayer(`throw`),xt(!0)}function hn(e){v.current||(e.key===`Escape`&&mn(),(e.key===` `||e.key===`Enter`)&&T===`result`&&(e.preventDefault(),ne.current()))}let gn=new ResizeObserver(pt);return gn.observe(e),e.addEventListener(`pointerdown`,dn),e.addEventListener(`pointermove`,fn),e.addEventListener(`pointerup`,pn),e.addEventListener(`pointercancel`,mn),window.addEventListener(`keydown`,hn),pt(),Ct(),c=requestAnimationFrame(cn),()=>{ct=!0,cancelAnimationFrame(c),gn.disconnect(),e.removeEventListener(`pointerdown`,dn),e.removeEventListener(`pointermove`,fn),e.removeEventListener(`pointerup`,pn),e.removeEventListener(`pointercancel`,mn),window.removeEventListener(`keydown`,hn),W?.close(),C.current=null}},[]);let Ue=W.phase===`ready`?`Grab the white orb. Pull back and release.`:W.phase===`aiming`?`Aim for deep water · farther pull = faster throw`:W.phase===`flying`?`Each splash launches a new ${K.sourceDots}-point glyph`:W.phase===`resolving`?`Resolving the pond · ${Math.round(W.progress*100)}%`:`Press Space or throw again`,X=Math.max(0,L.indexOf(K.maxDepth)),qe=()=>{if(w.current=!1,he(!1),_e(!1),te.current){let e=te.current;te.current=null,h.current=e,Pe(e),jt(e),n.current?.setTuning(e),_.current(),g.current()}d.current(),requestAnimationFrame(()=>t.current?.focus())};ne.current=qe;let Je=()=>{let e=x.current;!e||T||C.current?.(e)},Ye=()=>{let e=x.current;if(!e)return;let t=Re(window.location.href,e);history.replaceState(null,``,t),(async()=>{try{if(navigator.share){await navigator.share({title:`Mandelbrot Skipping`,url:t});return}}catch(e){if(e instanceof Error&&e.name===`AbortError`)return}try{await navigator.clipboard.writeText(t),Ee(`Copied`),window.setTimeout(()=>Ee(``),1600)}catch{Ee(`Copy the address bar`),window.setTimeout(()=>Ee(``),2400)}})()},et=W.phase===`flying`||W.phase===`resolving`||!!T;return(0,o.jsxs)(`main`,{className:`gameShell ${ge?`replayMode`:``}`,children:[(0,o.jsxs)(`section`,{className:`playfield`,"aria-label":`Mandelbrot rock skipping game`,children:[(0,o.jsx)(`canvas`,{ref:e,className:`gpuCanvas ${T?`introStashed`:``}`,"aria-hidden":`true`}),(0,o.jsx)(`canvas`,{ref:t,className:`gameCanvas`,tabIndex:0,"aria-label":`Throw ready. Drag the white orb backward and release it across the water`}),ge&&(0,o.jsxs)(`p`,{className:`replayBanner`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`replayBannerName`,children:ke(B)}),(0,o.jsx)(`span`,{className:`replayBannerLabel`,children:`replay`})]}),T&&(0,o.jsx)(s,{progress:T.progress,fading:O,ready:T.ready,rotateRight:K.rotateRight,onPlay:Fe}),(W.phase===`flying`||W.phase===`resolving`)&&!T&&(0,o.jsx)(`button`,{type:`button`,className:`playfieldThrowControl`,onClick:qe,"aria-label":`Cancel this throw and rethrow`,children:`Rethrow`}),(0,o.jsxs)(`div`,{className:`playfieldDock`,children:[(0,o.jsx)(`button`,{type:`button`,className:`replayOpening`,onClick:Ie,disabled:!!T||!!H,"aria-label":`Replay the opening Buddhabrot sequence`,children:`Replay opening`}),(0,o.jsx)(c,{})]})]}),(0,o.jsxs)(`aside`,{className:`scoreRail ${W.phase===`result`?`hasResult`:``}`,"aria-label":`Score and local high scores`,children:[(0,o.jsxs)(`section`,{className:`liveScore`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`liveLabel`,children:W.phase===`result`?`Final score`:`Live score`}),(0,o.jsx)(`strong`,{className:`liveNumber`,children:Ct(W.score)}),(0,o.jsxs)(`span`,{className:`liveMeta`,children:[W.skips,` skips · `,W.deepest?Ct(W.deepest):`0`,` deep · `,W.coverage,` cells · `,Math.round(W.spread*100),`% spread`]}),(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,W.progress*100)}%`}})}),(0,o.jsxs)(`div`,{className:`throwShareRow`,children:[(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:Je,disabled:!I||et,"aria-label":`Replay this throw`,children:`Replay throw`}),(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:Ye,disabled:!I,"aria-label":`Copy a link to this throw`,children:Te||`Share throw`})]})]}),(0,o.jsxs)(`section`,{className:`tuningPanel`,"aria-label":`Orbit tuning`,children:[(0,o.jsxs)(`div`,{className:`tuningHeading`,children:[(0,o.jsx)(`span`,{children:`Orbit tuning`}),(0,o.jsx)(`span`,{children:`Live`})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Glyph dots`}),(0,o.jsx)(`output`,{children:K.sourceDots})]}),(0,o.jsx)(`input`,{type:`range`,min:Be,max:Ve,step:`1`,value:K.sourceDots,"aria-label":`Dots per sacred geometry glyph`,onChange:e=>Y({sourceDots:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Orbit limit`}),(0,o.jsx)(`output`,{children:Dt(K.maxDepth)})]}),(0,o.jsx)(`input`,{type:`range`,min:`0`,max:L.length-1,step:`1`,value:X,"aria-label":`Orbit iteration limit`,"aria-valuetext":`${Ct(K.maxDepth)} iterations`,onChange:e=>Y({maxDepth:L[Number(e.target.value)]})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Acceleration curve`}),(0,o.jsxs)(`output`,{children:[K.acceleration.toFixed(1),`×`]})]}),(0,o.jsx)(`input`,{type:`range`,min:R,max:18,step:`0.1`,value:K.acceleration,"aria-label":`Iteration speed acceleration curve`,"aria-valuetext":`${K.acceleration.toFixed(1)} curve`,onChange:e=>Y({acceleration:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Line persist`}),(0,o.jsxs)(`output`,{children:[K.linePersist.toFixed(2),`s`]})]}),(0,o.jsx)(`input`,{type:`range`,min:We,max:Z,step:`0.05`,value:K.linePersist,"aria-label":`How long iteration lines stay visible`,"aria-valuetext":`${K.linePersist.toFixed(2)} seconds`,onChange:e=>Y({linePersist:Number(e.target.value)})})]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.previewOrbits,"aria-label":`Preview skip orbits while aiming`,onChange:e=>Y({previewOrbits:e.target.checked})}),`Aim orbit preview`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.skipColors,"aria-label":`Color each skip differently`,onChange:e=>Y({skipColors:e.target.checked})}),`Skip colors`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.coordinateAxes,"aria-label":`Show coordinate axes`,onChange:e=>Y({coordinateAxes:e.target.checked})}),`Coordinate axes`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.rotateRight,"aria-label":`Rotate coordinates and Buddhabrot 90 degrees right`,onChange:e=>Y({rotateRight:e.target.checked})}),`Rotate 90° right`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.doublePixels,"aria-label":`Render the orbit nebula at half resolution so pixels look doubled`,onChange:e=>Y({doublePixels:e.target.checked})}),`Double pixels`]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Preview iterations`}),(0,o.jsx)(`output`,{children:K.previewIterations})]}),(0,o.jsx)(`input`,{type:`range`,min:Ge,max:Ke,step:`1`,value:K.previewIterations,"aria-label":`Orbit iterations to draw while aiming`,"aria-valuetext":`${K.previewIterations} iterations`,onChange:e=>Y({previewIterations:Number(e.target.value)})})]}),(0,o.jsx)(`p`,{className:`tuningNote`,children:`Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations each skip. Skip colors tint preview and live trails per splash.`})]}),W.phase===`result`&&(0,o.jsxs)(`section`,{className:`railResult`,"aria-label":`Throw result`,children:[(0,o.jsx)(`div`,{className:`resultEyebrow`,children:me?`${ke(B)} throw`:Oe[0]?.id===Ne?`New local best`:`Throw complete`}),(0,o.jsxs)(`div`,{className:`resultStats`,children:[W.skips,` exact paths · `,Ct(W.deepest),` deep · `,W.coverage,` distinct cells · `,Math.round(W.spread*100),`% spread.`]}),(0,o.jsxs)(`div`,{className:`nameRow`,children:[Ne?(0,o.jsx)(`input`,{className:`nameInput`,"aria-label":`High score name`,value:je,maxLength:12,onChange:e=>Le(e.target.value)}):null,(0,o.jsx)(`button`,{className:`throwButton`,onClick:qe,children:`Throw again`})]})]}),(0,o.jsx)(`h2`,{className:`railTitle`,children:`Local legends`}),(0,o.jsx)(`p`,{className:`railSub`,children:`Depth, distinct points, and spatial spread all score. Later skips multiply the result.`}),H&&(0,o.jsx)(`p`,{className:`gpuNote`,role:`status`,children:H}),(0,o.jsxs)(`div`,{className:`scoreList`,children:[Oe.length===0&&(0,o.jsx)(`div`,{className:`emptyScores`,children:`No throws yet.`}),Oe.map((e,t)=>(0,o.jsxs)(`div`,{className:`scoreEntry ${e.id===Ne?`current`:``}`,children:[(0,o.jsx)(`span`,{className:`rank`,children:String(t+1).padStart(2,`0`)}),(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{className:`scoreName`,children:e.name}),(0,o.jsxs)(`span`,{className:`scoreMeta`,children:[e.skips,` skips · `,Ct(e.deepest),` deep · `,e.coverage,` cells · `,Math.round(e.spread*100),`% spread`]})]}),(0,o.jsx)(`span`,{className:`scoreNumber`,children:Ct(e.score)})]},e.id))]}),(0,o.jsxs)(`div`,{className:`railHint`,children:[Ue,(0,o.jsx)(`br`,{}),`Drag empty water to move · wheel or +/- to zoom.`]}),(0,o.jsxs)(`div`,{className:`railFooter`,children:[`Saved on this device · score model v2 · `,Dt(K.maxDepth),` orbit cap`]})]})]})}export{zt as default};