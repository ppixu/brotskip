import{r as e}from"./rolldown-runtime-vU33u7is.js";import{i as t,r as n}from"./framework-EwgI_Pa9.js";var r=e(n(),1);async function i(e){let t=navigator.gpu;if(!t)return e(`WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.`),null;let n=await t.requestAdapter({powerPreference:`high-performance`});if(!n)return e(`No GPU adapter found. Throwing still works in reduced visual mode.`),null;let r=await n.requestDevice(),i=!1;r.addEventListener(`uncapturederror`,t=>{i=!0;let n=t.error?.message||String(t.error);console.error(`WebGPU validation`,n),e(`WebGPU validation error: ${n}`)}),r.lost.then(()=>{i=!0,e(`The GPU device was lost. Reload to restore orbit trails.`)});let a=!1;return{device:r,preferredFormat:t.getPreferredCanvasFormat(),hasFailed:()=>i,destroy:()=>{a||(a=!0,r.destroy())}}}var a=t();function o({progress:e,fading:t,ready:n,onPlay:r}){return(0,a.jsxs)(`div`,{className:`introOverlay ${t?`fading`:``}`,role:`status`,"aria-label":`Charting the pond`,children:[(0,a.jsxs)(`div`,{className:`introChrome`,children:[(0,a.jsx)(`span`,{className:`introTitle`,children:`Mandelbrot Skipping`}),!n&&(0,a.jsx)(`span`,{className:`liveProgress`,children:(0,a.jsx)(`i`,{style:{width:`${Math.max(2,e*100)}%`}})})]}),n&&(0,a.jsx)(`button`,{type:`button`,className:`introPlay`,onClick:r,"aria-label":`Play`,children:`Play`})]})}var s={trigger:`Buddhabrot`,title:`Buddhabrot`,formula:`z → z² + c`,paragraphs:[`The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.`,`Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. Raise the iteration limit and the picture thins into finer filaments: only the longest escapes remain, as in the animation.`],gif:{file:`buddhabrot-iterations.gif`,alt:`Buddhabrot forming as the maximum iteration count increases`,credit:`Tacodude7729 / Wikimedia Commons`,license:`CC BY-SA 4.0`,licenseUrl:`https://creativecommons.org/licenses/by-sa/4.0/`,sourceUrl:`https://commons.wikimedia.org/wiki/File:BuddhabrotIterationAnimation7729.gif`,articleUrl:`https://en.wikipedia.org/wiki/Buddhabrot`}};function c(){let{trigger:e,title:t,formula:n,paragraphs:r,gif:i}=s;return(0,a.jsxs)(`div`,{className:`howItWorks`,children:[(0,a.jsx)(`button`,{type:`button`,className:`howItWorksTrigger`,"aria-describedby":`how-it-works-panel`,children:e}),(0,a.jsxs)(`div`,{id:`how-it-works-panel`,className:`howItWorksPanel`,role:`tooltip`,children:[(0,a.jsx)(`p`,{className:`howItWorksKicker`,children:t}),(0,a.jsx)(`img`,{className:`howItWorksFilm`,src:i.file,alt:i.alt,width:600,height:337}),(0,a.jsx)(`p`,{className:`howItWorksFormula`,children:n}),r.map(e=>(0,a.jsx)(`p`,{children:e},e.slice(0,24))),(0,a.jsxs)(`p`,{className:`howItWorksCredit`,children:[`Animation:`,` `,(0,a.jsx)(`a`,{href:i.sourceUrl,target:`_blank`,rel:`noreferrer`,children:i.credit}),`,`,` `,(0,a.jsx)(`a`,{href:i.licenseUrl,target:`_blank`,rel:`noreferrer`,children:i.license}),`. Summary after the`,` `,(0,a.jsx)(`a`,{href:i.articleUrl,target:`_blank`,rel:`noreferrer`,children:`Wikipedia Buddhabrot article`}),`.`]})]})]})}var l=.04;function u(e){let t=e.onScreen?0:e.offscreenStreak+1,n=e.hopPx<=.04?e.tinyHopStreak+1:0,r=!Number.isFinite(e.hopPx)||!Number.isFinite(e.magSq),i=e.magSq>4;return{resolved:r||i||n>=500||t>=800,offscreenStreak:t,tinyHopStreak:n}}var d=.76;function f(e,t=d){let n=(1-t**14)/(1-t),r=Math.min(Math.max(e(),0),.999999999)*n;for(let e=2;e<=15;e++)if(r-=t**(e-2),r<0)return e;return 15}function p(e,t,n,r){let i=Math.max(n,r),a=e+n>i?0:e;return{start:a,nextSource:(a+n)%i,sourceCount:Math.min(i,t+n)}}function m(e,t,n){let r=Math.max(0,n-e),i=Math.min(t,r);return{start:e,nextSource:e+i,sourceCount:e+i,added:i}}var h=1024,g=99.92;function _(e,t,n){let r=e.length,i=0;for(let t=0;t<r;t++)i+=e[t];if(i===0)return 0;let a=i*n/100,o=0;for(let n=0;n<r;n++){let i=e[n];if(i>0&&o+i>=a){let e=(a-o)/i;return(n+e)/r*t}o+=i}return t}function v(e,t=20){if(!(t>0))return{low:0,high:1};let n=_(e,t,54),r=_(e,t,g);return{low:n,high:Math.max(r,n+1e-9)}}var y=.05;function b(e){return!Number.isFinite(e)||e<0?0:Math.min(e,y)}function x(e,t){let n=t.maxSamplesPerFrame??2e6,r=t.minDurationMs??5e3;if(r<=0)return n;let i=b(e)*1e3/r;return Math.max(1,Math.min(n,Math.floor(t.totalSamples*i)))}var S={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5},C=`
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
`,ee=`
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
`,T=`
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
`,te={2048:16e6,4096:64e6};function ne(e,t){let n=e.device,r=globalThis.GPUBufferUsage,i=globalThis.GPUTextureUsage,{size:a}=t,o=a*a,s=t.totalSamples??te[a]??16e6,c=t.maxIterations??320,l=n.createBuffer({size:o*4,usage:r.STORAGE|r.COPY_DST}),u=n.createBuffer({size:h*4,usage:r.STORAGE|r.COPY_DST|r.COPY_SRC}),d=n.createBuffer({size:h*4,usage:r.COPY_DST|r.MAP_READ}),f=n.createBuffer({size:32,usage:r.UNIFORM|r.COPY_DST}),p=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),m=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),g=n.createTexture({size:[a,a],format:`rgba8unorm`,usage:i.STORAGE_BINDING|i.TEXTURE_BINDING|i.COPY_SRC}),_=n.createSampler({magFilter:`linear`,minFilter:`linear`}),y=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:C}),entryPoint:`accumulate`}}),b=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:ee}),entryPoint:`histogram`}}),ne=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:w}),entryPoint:`colorize`}}),E=n.createShaderModule({code:T}),D=n.createRenderPipeline({layout:`auto`,vertex:{module:E,entryPoint:`vs`},fragment:{module:E,entryPoint:`fs`,targets:[{format:e.preferredFormat}]},primitive:{topology:`triangle-list`}}),O=n.createBindGroup({layout:y.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:l}}]}),k=n.createBindGroup({layout:b.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}}]}),re=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:l}},{binding:2,resource:g.createView()}]}),ie=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:g.createView()},{binding:1,resource:_}]});n.queue.writeBuffer(p,0,new Uint32Array([a,0,0,0]));let A=0,ae=0,oe=!1,se=!1,ce={low:.69,high:3};function le(e){let t=new ArrayBuffer(32);new Uint32Array(t,0,4).set([a,ae+1,e,c]),new Float32Array(t,16,4).set([S.xMin,S.xMax,S.yMin,S.yMax]),n.queue.writeBuffer(f,0,t)}function j(){let e=new ArrayBuffer(16);new Uint32Array(e,0,2).set([a,0]),new Float32Array(e,8,2).set([ce.low,ce.high]),n.queue.writeBuffer(m,0,e)}async function M(){if(!(se||oe)){se=!0;try{let e=n.createCommandEncoder({label:`buddhabrot-histogram-readback`});if(e.copyBufferToBuffer(u,0,d,0,h*4),n.queue.submit([e.finish()]),await d.mapAsync(globalThis.GPUMapMode.READ),oe)return;ce=v(new Uint32Array(d.getMappedRange().slice(0))),d.unmap()}catch(e){console.warn(`[buddhabrot] histogram readback failed`,e)}finally{se=!1}}}return{step(r){if(oe||e.hasFailed()||A>=s)return;let i=x(r,{totalSamples:s,minDurationMs:t.minDurationMs}),o=Math.min(i,s-A);le(o),j(),n.queue.writeBuffer(u,0,new Uint32Array(h));let c=n.createCommandEncoder({label:`buddhabrot-step`}),l=c.beginComputePass();l.setPipeline(y),l.setBindGroup(0,O),l.dispatchWorkgroups(Math.ceil(o/64)),l.setPipeline(b),l.setBindGroup(0,k),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.setPipeline(ne),l.setBindGroup(0,re),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.end(),n.queue.submit([c.finish()]),A+=o,ae+=1,M()},progress(){return Math.min(1,A/s)},isComplete(){return A>=s},blit(t){if(oe||e.hasFailed())return!1;let r=n.createCommandEncoder({label:`buddhabrot-blit`}),i=r.beginRenderPass({colorAttachments:[{view:t.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});return i.setPipeline(D),i.setBindGroup(0,ie),i.draw(3),i.end(),n.queue.submit([r.finish()]),!0},async toBitmapAndBlob(){let t=new OffscreenCanvas(a,a),r=t.getContext(`webgpu`);if(r.configure({device:n,format:e.preferredFormat,alphaMode:`premultiplied`}),!this.blit(r))throw Error(`Buddhabrot generator cannot blit: GPU context is destroyed or has failed.`);return{bitmap:await createImageBitmap(t),blobPromise:t.convertToBlob({type:`image/png`}).catch(e=>(console.warn(`[buddhabrot] PNG encode failed; texture will not be cached`,e),null))}},destroy(){oe=!0,n.queue.onSubmittedWorkDone().finally(()=>{g.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy()})}}}var E=`mandelbrot-skipping`,D=`textures`;function O(e){let t=e.matchMedia(`(pointer: coarse)`).matches,n=Math.min(e.screen.width,e.screen.height);return t&&n<=820?2048:4096}function k(e){return`buddhabrot:v3:${e}`}async function re(e,t){try{return await t.get(k(e))}catch{return null}}async function ie(e,t,n){let r=k(e);try{await n.put(r,t)}catch{return!1}return await A(r,n),!0}async function A(e,t){try{let n=await t.keys();await Promise.all(n.filter(t=>t.startsWith(`buddhabrot:`)&&t!==e).map(e=>t.delete(e).catch(()=>{})))}catch{}}function ae(e){return new Promise((t,n)=>{let r=e.open(E,1);r.onupgradeneeded=()=>{r.result.objectStoreNames.contains(D)||r.result.createObjectStore(D)},r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error),r.onblocked=()=>n(Error(`IndexedDB open blocked`))})}function oe(e){return{async get(t){let n=await ae(e);try{return await new Promise((e,r)=>{let i=n.transaction(D,`readonly`).objectStore(D).get(t);i.onsuccess=()=>e(i.result??null),i.onerror=()=>r(i.error)})}finally{n.close()}},async put(t,n){let r=await ae(e);try{await new Promise((e,i)=>{let a=r.transaction(D,`readwrite`);a.objectStore(D).put(n,t),a.oncomplete=()=>e(),a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{r.close()}},async keys(){let t=await ae(e);try{return await new Promise((e,n)=>{let r=t.transaction(D,`readonly`).objectStore(D).getAllKeys();r.onsuccess=()=>e(r.result.map(String)),r.onerror=()=>n(r.error)})}finally{t.close()}},async delete(t){let n=await ae(e);try{await new Promise((e,r)=>{let i=n.transaction(D,`readwrite`);i.objectStore(D).delete(t),i.oncomplete=()=>e(),i.onerror=()=>r(i.error),i.onabort=()=>r(i.error)})}finally{n.close()}}}}var se=.29,ce=2e6,le=5400,j=4200;function M(e,t,n=Math.random){return{x:36+n()*Math.max(8,e-72),y:36+n()*Math.max(8,t-72)}}function ue(e,t){let n=e-.25,r=n*n+t*t;if(r*(r+n)<=.25*t*t)return!0;let i=e+1;if(i*i+t*t<=.0625)return!0;let a=e+.125,o=Math.abs(t);return a*a+(o-.745)*(o-.745)<=.009}function de(e=Math.random){for(let t=0;t<48;t++){let t=e(),n,r;if(t<.5)n=-2.2+e()*3.4,r=-1.5+e()*3;else if(t<.78){let t=e()*Math.PI*2,i=.5*(1-Math.cos(t))+.002+e()*.045;n=.25+i*Math.cos(t),r=i*Math.sin(t)}else n=-2+e()*1.4,r=(e()-.5)*.35;if(ue(n,r))continue;let i=0,a=0,o=!1;for(let e=1;e<=8e3;e++){let t=i*i-a*a+n,s=2*i*a+r;if(i=t,a=s,i*i+a*a>4){e>=8&&(o=!0);break}}if(o)return{x:n,y:r}}return{x:-.75+(e()-.5)*.05,y:.18+(e()-.5)*.05}}var N={drawLines:!0,grayscale:!1,energy:.01,hiddenSteps:0,liveGain:1,contrast:.72,atlasGain:1},fe={drawLines:!1,grayscale:!0,energy:.28,hiddenSteps:1,liveGain:.12,contrast:1.22,atlasGain:1},P=.12,F=.055;function pe(e){return e===`intro`?{pondGain:0,throwGain:1,coneEnabled:!1}:e===`aiming`?{pondGain:P,throwGain:0,coneEnabled:!0}:{pondGain:0,throwGain:1,coneEnabled:!1}}function me(e,t=18){let n=(e/Math.max(t,1e-5)%1+1)%1,r=n<.5?n*2:2-n*2,i=r*r*(3-2*r);return{zCamera:.07+i*.86,sliceHalf:F,zoom:1+i*.42}}var I=[1e4,25e3,5e4,1e5,25e4,5e5,1e6,2e6,5e6,1e7,2e7,5e7,1e8,2e8,5e8,1e9,2e9],L=.5;function R(e){let t=Math.round((Number(e)||10)*10)/10;return Math.max(L,Math.min(18,t))}function he(e,t,n,r){let i=Math.max(0,Math.min(1,e/Math.max(t,1)))**+r*Math.max(0,n-4);return Math.min(n,Math.max(4,Math.floor(4+i)))}var ge={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5};function _e(e,t=!1){return t?1:Math.min(Math.max(e,1),2)}function ve(e,t,n){let r=_e(n);return{width:Math.max(1,Math.round(e*r)),height:Math.max(1,Math.round(t*r)),dpr:r}}var z=.8;function ye(e,t,n){return e.halfY*t/Math.max(n,1)}function be(e,t,n){return n?{x:t,y:-e}:{x:e,y:t}}function xe(e,t,n){return n?{dx:-t,dy:e}:{dx:e,dy:t}}function Se(e,t,n,r,i,a=!1){let o=xe((e/n*2-1)*ye(i,n,r),(1-t/r*2)*i.halfY,a);return{x:i.centerX+o.dx,y:i.centerY+o.dy}}function B(e,t,n,r,i,a=!1){let o=ye(i,n,r),s=be(e-i.centerX,t-i.centerY,a);return{x:(s.x/o+1)*n*.5,y:(1-s.y/i.halfY)*r*.5}}function Ce(e,t,n,r,i,a=!1){let o=be(e-n.centerX,t-n.centerY,a);return{x:o.x/ye(n,r,i),y:o.y/n.halfY}}function we(e,t,n=z){return e*n/Math.max(t,1e-6)}function Te(e,t,n,r,i,a,o=!1){let s=Se(e,t,n,r,i,o);return B(s.x,s.y,n,r,a,o)}function Ee(e,t,n,r,i,a,o,s,c=!1){let l=Te(e,t,i,a,o,s,c),u=Te(e+n,t+r,i,a,o,s,c);return{x:u.x-l.x,y:u.y-l.y}}function De(e,t,n,r){let i=ye(e,t,n),a=r?e.halfY:i,o=r?i:e.halfY;return{xMin:e.centerX-a,xMax:e.centerX+a,yMin:e.centerY-o,yMax:e.centerY+o}}var V=.035,H=2.4,U=-8,Oe=8,ke=-Math.PI,Ae=Math.PI;function je(e){return e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12).trim()||`YOU`}function Me(e){return`${je(e)}'s`}function Ne(e,t,n){let r=Math.max(0,Math.min(1,(e-t)/(n-t)));return Math.round(r*65535)}function W(e,t,n){return t+e/65535*(n-t)}function Pe(e){let t=``;for(let n of e)t+=String.fromCharCode(n);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/g,``)}function G(e){if(!/^[A-Za-z0-9_-]+$/.test(e))return null;let t=e+`=`.repeat((4-e.length%4)%4);try{let e=atob(t.replace(/-/g,`+`).replace(/_/g,`/`));return Uint8Array.from(e,e=>e.charCodeAt(0))}catch{return null}}function K(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null}function Fe(e){return!Number.isFinite(e.view.centerX)||!Number.isFinite(e.view.centerY)||!Number.isFinite(e.view.halfY)||!Number.isFinite(e.angle)||!Number.isFinite(e.power)||e.power<=0||e.power>1||e.skips<2||e.skips>15||e.skips!==Math.round(e.skips)||e.glyph<0||e.glyph>=7||e.glyph!==Math.round(e.glyph)||e.sourceDots<6||e.sourceDots>32||e.sourceDots!==Math.round(e.sourceDots)||e.view.halfY<.035||e.view.halfY>2.4?null:{version:1,view:e.view,rotateRight:e.rotateRight,angle:e.angle,power:e.power,skips:e.skips,glyph:e.glyph,seed:e.seed|0,sourceDots:e.sourceDots,name:je(e.name??`YOU`)}}function Ie(e){let t=e.split(`_`);if(t.length!==11)return null;let n=K(t[0]),r=K(t[1]),i=K(t[2]),a=K(t[3]),o=K(t[4]),s=K(t[5]),c=K(t[6]),l=K(t[7]),u=K(t[8]),d=K(t[9]),f=K(t[10]);return n!==1||r==null||i==null||a==null||o==null||s==null||c==null||l==null||u==null||d==null||f==null||o!==0&&o!==1?null:Fe({view:{centerX:r,centerY:i,halfY:a},rotateRight:o===1,angle:s,power:c,skips:l,glyph:u,seed:d,sourceDots:f})}function Le(e){let t=G(e);if(!t||t.length<20)return null;let n=new DataView(t.buffer,t.byteOffset,t.byteLength);if(n.getUint8(0)!==2)return null;let r=n.getUint8(19);if(t.length!==20+r)return null;let i=new TextDecoder().decode(t.subarray(20,20+r));return Fe({view:{centerX:W(n.getUint16(1),U,Oe),centerY:W(n.getUint16(3),U,Oe),halfY:W(n.getUint16(5),V,H)},rotateRight:(n.getUint8(11)&1)==1,angle:W(n.getUint16(7),ke,Ae),power:W(n.getUint16(9),0,1),skips:n.getUint8(12),glyph:n.getUint8(13),sourceDots:n.getUint8(14),seed:n.getInt32(15),name:i})}function q(e){let t=je(e.name),n=new TextEncoder().encode(t),r=new Uint8Array(20+n.length),i=new DataView(r.buffer);return i.setUint8(0,2),i.setUint16(1,Ne(e.view.centerX,U,Oe)),i.setUint16(3,Ne(e.view.centerY,U,Oe)),i.setUint16(5,Ne(e.view.halfY,V,H)),i.setUint16(7,Ne(e.angle,ke,Ae)),i.setUint16(9,Ne(e.power,0,1)),i.setUint8(11,+!!e.rotateRight),i.setUint8(12,e.skips),i.setUint8(13,e.glyph),i.setUint8(14,e.sourceDots),i.setInt32(15,e.seed|0),i.setUint8(19,n.length),r.set(n,20),Pe(r)}function Re(e){return e?e.includes(`_`)&&e.startsWith(`1_`)?Ie(e):Le(e):null}function ze(e){let t=e.hash.startsWith(`#`)?e.hash.slice(1):e.hash,n=new URLSearchParams(t).get(`t`),r=new URLSearchParams(e.search).get(`t`),i=n??r;return i?Re(i):null}function Be(e,t){let n=new URL(e);return n.searchParams.delete(`t`),n.hash=`t=${q(t)}`,n.toString()}var Ve=7,He=[2,2,2,4,2,3,7],Ue=6,We=32,J=4096,Ge=4096,Ke=I[I.length-1],Y=.05,X=.05,qe=8,Je=10,Ye=50,Xe=[[80,214,255],[92,255,196],[186,255,120],[255,230,110],[255,168,92],[255,122,186],[196,146,255]].map(([e,t,n])=>`vec3f(${(e/255).toFixed(5)}, ${(t/255).toFixed(5)}, ${(n/255).toFixed(5)})`).join(`, `),Z={sourceDots:18,maxDepth:2e6,acceleration:10,linePersist:.6,previewOrbits:!1,previewIterations:20,skipColors:!0,coordinateAxes:!1,rotateRight:!0,doublePixels:!1},Ze=`mandelbrot-skipping:tuning:v5`,Qe=10,$e=.3,et=.16,tt=4e5,nt=0,rt=6,it=25e3,at=it+J,Q=32,ot=Q*Q/32,st=(Q*Q-1)/12,ct=4,lt=2,ut=`mandelbrot-skipping:scores:v2`,$=`mandelbrot-skipping:scores:v1`,dt=Math.PI*2,ft={x:-.58,y:0},pt=.8,mt={x:-.55,y:0},ht=1.52,gt=1.6,_t=1.15,vt=[[0,2,3,5,7,9,10],[0,1,4,6,7,10],[0,2,4,6,8,10],[0,3,5,7,10],[0,1,5,7,8]],yt=`
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
        if (slot < ${tt}u) {
          vertices[slot] = OrbitPoint(z, depthColor, state.reserved.x);
        }
      }
      if (state.step > u32(params.hiddenSteps) + 1u && (inAtlas || all(abs(previousClip) <= vec2f(1.0))) && i >= firstLineStep) {
        let future = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + state.c;
        let incomingLength = length(clip - previousClip);
        let control1 = previousZ + (z - previousZ) / 3.0;
        let control2 = z - (future - z) / 3.0;
        if (incomingLength <= 0.12 && length(z - previousZ) <= 0.12) {
          let lineVertex = atomicAdd(&lineDrawArgs.vertexCount, ${rt*2}u);
          let lineSlot = lineVertex / ${rt*2}u;
          if (lineSlot < ${at}u) {
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
`,bt=`
struct Style { alpha: f32, pulse: f32, colorMode: f32, sliceEnabled: f32 }
struct Slice { zCamera: f32, sliceHalf: f32, zoom: f32, pad: f32 }
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
@group(0) @binding(2) var<uniform> slice: Slice;
struct VSOut { @builtin(position) position: vec4f, @location(0) color: vec3f, @location(1) weight: f32 }
fn skipTint(index: f32) -> vec3f {
  let colors = array<vec3f, 7>(${Xe});
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
  let t = clamp(depth, 0.0, 1.0);
  let band = (t - slice.zCamera) / max(slice.sliceHalf, 1e-4);
  let weight = select(1.0, exp(-band * band), style.sliceEnabled > 0.5);
  let zoom = select(1.0, max(slice.zoom, 1.0), style.sliceEnabled > 0.5);
  out.position = vec4f(projectPoint(position) / zoom, 0.0, 1.0);
  let depthColor = mix(vec3f(0.10, 0.78, 0.92), vec3f(0.92, 1.0, 0.82), t);
  let tinted = mix(depthColor, skipTint(skip), style.colorMode);
  let gray = vec3f(mix(0.22, 1.0, t));
  out.color = mix(tinted, gray, style.pulse);
  out.weight = weight;
  return out;
}
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  if (style.sliceEnabled > 0.5 && in.weight < 0.03) { discard; }
  let alpha = style.alpha * in.weight;
  return vec4f(in.color * alpha, alpha);
}
`,xt=`
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
  let colors = array<vec3f, 7>(${Xe});
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
  let curveIndex = vertex / ${rt*2}u;
  let localVertex = vertex % ${rt*2}u;
  let subsegment = localVertex / 2u;
  let endpoint = localVertex % 2u;
  let t = f32(subsegment + endpoint) / f32(${rt});
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
`,St=`
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(p[i], 0.0, 1.0);
  out.uv = p[i] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
`,Ct=`
${St}
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
`,wt=`
${St}
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
`;function Tt(e){return Math.round(e).toLocaleString()}function Et(e){let t=e.distinct;if(!t)return{area:0,coverage:0,spread:0,elongation:0,orientation:0,density:0,centroidX:0,centroidY:0};let n=e.sumX/t,r=e.sumY/t,i=Math.max(0,e.sumXX/t-n*n),a=Math.max(0,e.sumYY/t-r*r),o=e.sumXY/t-n*r,s=Math.max(0,i*a-o*o),c=Math.sqrt((i-a)**2+4*o*o),l=Math.max(0,(i+a+c)*.5),u=Math.max(0,(i+a-c)*.5),d=Math.min(1,Math.sqrt(s)/st),f=Math.min(1,Math.log2(1+t)/Math.log2(1+Q*Q)),p=l>.001?Math.min(1,1-Math.sqrt(u/l)):0,m=.5*Math.atan2(2*o,i-a),h=Math.max(1,Math.min(Q*Q,4*Math.PI*Math.sqrt(s))),g=Math.min(1,t/h);return{area:d,coverage:f,spread:Math.sqrt(d),elongation:p,orientation:m,density:g,centroidX:n/(Q-1)*2-1,centroidY:r/(Q-1)*2-1}}function Dt(e,t){let n=Math.min(t,Ke),r=Et(e),i=n*.03+Math.sqrt(n)*75,a=8e4*r.coverage,o=12e4*r.spread*Math.min(1,e.distinct/24);return Math.round((i+a+o)*(1+(e.skip-1)*.12))}function Ot(e){let t=e|0;return()=>(t^=t<<13,t^=t>>>17,t^=t<<5,(t>>>0)/4294967296)}function kt(e){return e>=1e9?`${e/1e9}B`:e>=1e6?`${e/1e6}M`:e>=1e3?`${e/1e3}K`:String(e)}function At(e,t){let n=Math.max(0,Math.min(.05,e));return t<=0?0:n===0?1:Y**+(n/t)}function jt(e){let t=Math.round(Number(e?.sourceDots)),n=t>=Ue?Math.min(We,t):Z.sourceDots,r=Number(e?.maxDepth),i=I.includes(r)?r:Z.maxDepth,a=R(e?.acceleration??10),o=Math.max(X,Math.min(qe,Math.round((Number(e?.linePersist)||Z.linePersist)*20)/20)),s=e?.previewOrbits===!0,c=e?.skipColors!==!1,l=e?.coordinateAxes===!0,u=e?.rotateRight!==!1,d=e?.doublePixels===!0,f=Math.round(Number(e?.previewIterations)||Z.previewIterations);return{sourceDots:n,maxDepth:i,acceleration:a,linePersist:o,previewOrbits:s,previewIterations:Math.max(Je,Math.min(Ye,f)),skipColors:c,coordinateAxes:l,rotateRight:u,doublePixels:d}}function Mt(){try{return jt(JSON.parse(localStorage.getItem(Ze)||`null`))}catch{return Z}}function Nt(e){try{localStorage.setItem(Ze,JSON.stringify(e))}catch{}}function Pt(e,t){let n=(t%1+1)%1*e.length,r=Math.floor(n)%e.length,i=n-Math.floor(n),a=e[r],o=e[(r+1)%e.length];return{x:a.x+(o.x-a.x)*i,y:a.y+(o.y-a.y)*i}}function Ft(e,t=-Math.PI/2){return Array.from({length:e},(n,r)=>({x:Math.cos(t+r*dt/e),y:Math.sin(t+r*dt/e)}))}function It(e,t,n){let r=(e,t,r)=>({x:e+Math.cos(n*dt-Math.PI/2)*r,y:t+Math.sin(n*dt-Math.PI/2)*r});switch(e%Ve){case 0:return r(0,0,t===0?1:.46);case 1:return t===0?Pt(Ft(3),n):r(0,0,.48);case 2:return r(t===0?-.32:.32,0,.68);case 3:{let e=t*Math.PI/2;return r(Math.cos(e)*.43,Math.sin(e)*.43,.52)}case 4:{if(t===1)return r(0,0,.34);let e=Ft(5);return Pt([e[0],e[2],e[4],e[1],e[3]],n)}case 5:return t<2?Pt(Ft(3,-Math.PI/2+t*Math.PI),n):r(0,0,.34);default:{if(t===0)return r(0,0,.42);let e=(t-1)*dt/6-Math.PI/2;return r(Math.cos(e)*.42,Math.sin(e)*.42,.42)}}}function Lt(e,t,n,r,i,a,o,s){let c=[],l=He[o%He.length];for(let u=0;u<a;u++){let d=u%l,f=Math.floor(u/l),p=Math.ceil((a-d)/l),m=It(o,d,f/Math.max(p,1)),h=Se(e+m.x*Qe,t+m.y*Qe,n,r,i,s);c.push({x:Math.fround(h.x),y:Math.fround(h.y)})}return c}function Rt(){try{let e=JSON.parse(localStorage.getItem(ut)||`null`),t=(e,t=!1)=>e.flatMap(e=>{if(!e||typeof e!=`object`)return[];let n=e;return typeof n.id==`string`&&typeof n.name==`string`&&n.name.length<=12&&Number.isFinite(n.score)&&Number.isFinite(n.deepest)&&Number.isFinite(n.skips)&&typeof n.createdAt==`string`?[{id:n.id,name:n.name,score:t?Math.round(n.score/100):n.score,deepest:n.deepest,skips:n.skips,coverage:Number.isFinite(n.coverage)?n.coverage:0,spread:Number.isFinite(n.spread)?n.spread:0,createdAt:n.createdAt}]:[]}).slice(0,10);if(e?.version===2&&Array.isArray(e.entries))return t(e.entries);let n=JSON.parse(localStorage.getItem($)||`null`);if(n?.version!==1||!Array.isArray(n.entries))return[];let r=t(n.entries,!0);return zt(r),r}catch{return[]}}function zt(e){try{localStorage.setItem(ut,JSON.stringify({version:2,entries:e}))}catch{}}async function Bt(e,t){let n=t.device,r=e.getContext(`webgpu`),i=t.preferredFormat;r.configure({device:n,format:i,alphaMode:`opaque`});let a=globalThis.GPUBufferUsage,o=globalThis.GPUTextureUsage,s=n.createBuffer({size:tt*16,usage:a.STORAGE|a.VERTEX}),c=n.createBuffer({size:at*48,usage:a.STORAGE}),l=n.createBuffer({size:J*48,usage:a.STORAGE|a.COPY_DST}),u=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),d=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),f=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),h=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),g=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),_=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),v=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),y=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),b=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),x=n.createBuffer({size:128,usage:a.UNIFORM|a.COPY_DST}),S=n.createSampler({magFilter:`nearest`,minFilter:`nearest`}),C=n.createShaderModule({code:yt}),ee=n.createShaderModule({code:bt}),w=n.createShaderModule({code:xt}),T=n.createShaderModule({code:Ct}),te=n.createShaderModule({code:wt}),ne=n.createComputePipeline({layout:`auto`,compute:{module:C,entryPoint:`main`}}),E=n.createRenderPipeline({layout:`auto`,vertex:{module:ee,entryPoint:`vs`,buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:`float32x2`},{shaderLocation:1,offset:8,format:`float32`},{shaderLocation:2,offset:12,format:`float32`}]}]},fragment:{module:ee,entryPoint:`fs`,targets:[{format:`rgba16float`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`point-list`}}),D=n.createRenderPipeline({layout:`auto`,vertex:{module:w,entryPoint:`vs`},fragment:{module:w,entryPoint:`fs`,targets:[{format:`rgba8unorm`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`max`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`line-list`}}),O=n.createRenderPipeline({layout:`auto`,vertex:{module:T,entryPoint:`vs`},fragment:{module:T,entryPoint:`fadeFs`,targets:[{format:`rgba16float`}]},primitive:{topology:`triangle-list`}}),k=n.createRenderPipeline({layout:`auto`,vertex:{module:T,entryPoint:`vs`},fragment:{module:T,entryPoint:`fadeFs`,targets:[{format:`rgba8unorm`}]},primitive:{topology:`triangle-list`}}),re=n.createRenderPipeline({layout:`auto`,vertex:{module:te,entryPoint:`vs`},fragment:{module:te,entryPoint:`displayFs`,targets:[{format:i}]},primitive:{topology:`triangle-list`}}),ie=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:l}},{binding:3,resource:{buffer:u}},{binding:4,resource:{buffer:c}},{binding:5,resource:{buffer:d}}]}),A=n.createBindGroup({layout:E.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:f}},{binding:2,resource:{buffer:v}}]}),ae=n.createBindGroup({layout:E.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:h}},{binding:2,resource:{buffer:v}}]}),oe=n.createBindGroup({layout:E.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:h}},{binding:2,resource:{buffer:v}}]}),ce=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:f}}]}),le=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:h}}]}),j=0,M=0,ue=0,de=!1,fe=!1,P=!1,F=[],I=[],L=[],R=null,he=null,z=[],ye=[],be=[],xe=[],Se=0,B=0,Ce=0,we=0,Te=1,Ee=1,V={centerX:mt.x,centerY:mt.y,halfY:ht},H=Z.maxDepth,U=Z.acceleration,Oe=Z.linePersist,ke=Z.skipColors,Ae=Z.rotateRight,je=Z.doublePixels,Me=N.drawLines,Ne=N.grayscale,W=N.energy,Pe=N.hiddenSteps,G=N.liveGain,K=N.contrast,Fe=pe(`intro`),Ie=Fe.pondGain,Le=Fe.throwGain,q=null,Re=!1,ze=`pond`,Be={...ge},Ve={...ge},He=0,Ue=e=>n.createTexture({size:[Ce,we],format:e,usage:o.RENDER_ATTACHMENT|o.TEXTURE_BINDING});function We(e,t){for(let n of t)n&&e.beginRenderPass({colorAttachments:[{view:n.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end()}function Ge(e,t,r){return e.map(e=>n.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:e.createView()},{binding:1,resource:S},{binding:2,resource:{buffer:t}}]}))}function Ke(){xe=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++)xe[e*2+t]=n.createBindGroup({layout:re.getBindGroupLayout(0),entries:[{binding:0,resource:F[e].createView()},{binding:1,resource:I[t].createView()},{binding:2,resource:L[t].createView()},{binding:3,resource:R.createView()},{binding:4,resource:he.createView()},{binding:5,resource:S},{binding:6,resource:{buffer:x}}]})}function Y(e,t){let r=ze===`pond`?Be:Ve,i=new ArrayBuffer(80),a=new Uint32Array(i),o=new Float32Array(i);a[0]=j,a[1]=Math.max(1,Math.floor(tt/Math.max(j,1))),a[2]=H,a[3]=Me?Math.max(1,Math.floor(it/Math.max(j,1))):0,o[4]=V.centerX,o[5]=V.centerY,o[6]=V.halfY*Ce/Math.max(we,1),o[7]=V.halfY,o[8]=Ce,o[9]=we,o[10]=+!!Ae,o[11]=U,o[12]=t,o[13]=Pe,o[16]=r.xMin,o[17]=r.xMax,o[18]=r.yMin,o[19]=r.yMax,n.queue.writeBuffer(e,0,i)}function X(){let t=e.getBoundingClientRect(),r=ve(t.width,t.height,_e(globalThis.devicePixelRatio||1,je));if(Te=Math.max(1,t.width),Ee=Math.max(1,t.height),F.length&&r.width===Ce&&r.height===we)return;Ce=r.width,we=r.height,e.width=Ce,e.height=we;for(let e of[...F,...I,...L,R,he])e?.destroy();F=[0,1].map(()=>Ue(`rgba16float`)),I=[0,1].map(()=>Ue(`rgba16float`)),L=[0,1].map(()=>Ue(`rgba8unorm`)),R=Ue(`rgba16float`),he=Ue(`rgba8unorm`),z=Ge(F,y,O),ye=Ge(I,y,O),be=Ge(L,b,k),Ke();let i=n.createCommandEncoder({label:`orbit-resize`});We(i,F),We(i,I),We(i,L),We(i,[R,he]),n.queue.submit([i.finish()]),Se=0,B=0}let qe=new ResizeObserver(X);qe.observe(e),X();function Je(){de||ue||(ue=requestAnimationFrame(Ye))}function Ye(){if(ue=0,de||t.hasFailed()||!F.length||P)return;let e=performance.now(),i=He?(e-He)/1e3:1/60;He=e;let a=At(i,Oe);Y(f,0),Y(h,1);let o=Re?me(e/1e3):{zCamera:0,sliceHalf:1,zoom:1};n.queue.writeBuffer(g,0,new Float32Array([W,+!!Ne,+!!ke,0])),n.queue.writeBuffer(_,0,new Float32Array([Math.min(1.2,W*4.2),+!!Ne,+!!ke,1])),n.queue.writeBuffer(v,0,new Float32Array([o.zCamera,o.sliceHalf,o.zoom,0])),n.queue.writeBuffer(u,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(d,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(y,0,new Float32Array([1,0,0,0])),n.queue.writeBuffer(b,0,new Float32Array([a,0,0,0]));let c=new Float32Array(32);c[0]=V.centerX,c[1]=V.centerY,c[2]=V.halfY*Ce/Math.max(we,1),c[3]=V.halfY,c[4]=+!!Ae,c[5]=+!!Me,c[6]=Re?0:G,c[7]=K,c[8]=Be.xMin,c[9]=Be.xMax,c[10]=Be.yMin,c[11]=Be.yMax,c[12]=Ve.xMin,c[13]=Ve.xMax,c[14]=Ve.yMin,c[15]=Ve.yMax,c[16]=Ie,c[17]=Le,c[18]=+!!q,c[19]=se,c[20]=q?.apexX??0,c[21]=q?.apexY??0,c[22]=q?.directionX??0,c[23]=q?.directionY??0,c[24]=q?.range??0,c[25]=.04,c[26]=Te,c[27]=Ee,n.queue.writeBuffer(x,0,c);let l=n.createCommandEncoder({label:`orbit-draw`});if(j>0&&!fe){let e=l.beginComputePass();e.setPipeline(ne),e.setBindGroup(0,ie),e.dispatchWorkgroups(Math.ceil(j/64)),e.end()}let p=F[1-Se],m=I[1-B],S=L[1-B];if(ze===`pond`){let e=l.beginRenderPass({colorAttachments:[{view:p.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(O),e.setBindGroup(0,z[Se]),e.draw(3),e.end()}else{let e=l.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(O),e.setBindGroup(0,ye[B]),e.draw(3),e.end();let t=l.beginRenderPass({colorAttachments:[{view:S.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});t.setPipeline(k),t.setBindGroup(0,be[B]),t.draw(3),t.end()}if(l.beginRenderPass({colorAttachments:[{view:R.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),l.beginRenderPass({colorAttachments:[{view:he.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),j>0&&!fe){let e=ze===`pond`?p:m,t=l.beginRenderPass({colorAttachments:[{view:e.createView(),loadOp:`load`,storeOp:`store`}]});if(t.setPipeline(E),t.setBindGroup(0,ae),t.setVertexBuffer(0,s),t.drawIndirect(u,0),t.end(),Re&&ze===`pond`){let e=l.beginRenderPass({colorAttachments:[{view:I[B].createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(E),e.setBindGroup(0,oe),e.setVertexBuffer(0,s),e.drawIndirect(u,0),e.end()}let n=l.beginRenderPass({colorAttachments:[{view:R.createView(),loadOp:`load`,storeOp:`store`}]});n.setPipeline(E),n.setBindGroup(0,A),n.setVertexBuffer(0,s),n.drawIndirect(u,0),n.end();let r=l.beginRenderPass({colorAttachments:[{view:he.createView(),loadOp:`load`,storeOp:`store`}]});if(r.setPipeline(D),r.setBindGroup(0,ce),r.drawIndirect(d,0),r.end(),ze===`throw`&&Me){let e=l.beginRenderPass({colorAttachments:[{view:S.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(D),e.setBindGroup(0,le),e.drawIndirect(d,0),e.end()}}ze===`pond`?Se=1-Se:B=1-B;let C=l.beginRenderPass({colorAttachments:[{view:r.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:1}}]});C.setPipeline(re),C.setBindGroup(0,xe[Se*2+B]),C.draw(3),C.end(),n.queue.submit([l.finish()]),Je()}return Je(),{spawn(e,t,r=J){fe=!1;let i=new Float32Array(e.length*12),a=new Uint32Array(i.buffer);e.forEach((e,n)=>{let r=n*12;i[r+2]=e.x,i[r+3]=e.y,i[r+4]=t,a[r+7]=1});let o=p(M,j,e.length,r);n.queue.writeBuffer(l,o.start*48,i.buffer,i.byteOffset,i.byteLength),M=o.nextSource,j=o.sourceCount},spawnAppend(e,t,r=J){fe=!1;let i=m(j,e.length,r);if(i.added<=0)return this.spawn(e,t,r),e.length;let a=e.slice(0,i.added),o=new Float32Array(a.length*12),s=new Uint32Array(o.buffer);return a.forEach((e,n)=>{let r=n*12;o[r+2]=e.x,o[r+3]=e.y,o[r+4]=t,s[r+7]=1}),n.queue.writeBuffer(l,i.start*48,o.buffer,o.byteOffset,o.byteLength),M=i.nextSource,j=i.sourceCount,i.added},setView(e){V={...e}},setTuning(e){H=e.maxDepth,U=e.acceleration,Oe=e.linePersist,ke=e.skipColors===!0,Ae=e.rotateRight===!0;let t=e.doublePixels===!0;t!==je&&(je=t,X())},setAtmosphere(e){Me=e.drawLines,Ne=e.grayscale,W=e.energy,Pe=e.hiddenSteps,G=e.liveGain,K=e.contrast},setLayer(e){ze=e},setDisplay(e){Ie=e.pondGain,Le=e.throwGain,q=e.cone,Te=e.cssWidth,Ee=e.cssHeight,Re=e.mri===!0},beginThrow(e,t,n,r){V={...e},Ve=De(e,t,n,r),ze=`throw`,this.clear()},clearPond(){if(!F.length)return;let e=n.createCommandEncoder({label:`orbit-clear-pond`});We(e,F),n.queue.submit([e.finish()])},clear(){if(fe=!1,j=0,M=0,n.queue.writeBuffer(l,0,new Uint8Array(J*48)),!I.length)return;let e=n.createCommandEncoder({label:`orbit-clear-throw`});We(e,I),We(e,L),We(e,[R,he].filter(Boolean)),n.queue.submit([e.finish()])},freeze(){fe=!0},setSuspended(e){P=e,e||Je()},destroy(){de=!0,cancelAnimationFrame(ue),qe.disconnect(),F.forEach(e=>e.destroy()),I.forEach(e=>e.destroy()),L.forEach(e=>e.destroy()),R?.destroy(),he?.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),h.destroy(),g.destroy(),_.destroy(),v.destroy(),y.destroy(),b.destroy(),x.destroy()}}}function Vt(){let e=(0,r.useRef)(null),t=(0,r.useRef)(null),n=(0,r.useRef)(null),s=(0,r.useRef)(null),l=(0,r.useRef)({centerX:mt.x,centerY:mt.y,halfY:ht}),d=(0,r.useRef)(()=>{}),p=(0,r.useRef)(()=>{}),m=(0,r.useRef)(`YOU`),h=(0,r.useRef)({...Z}),g=(0,r.useRef)(()=>{}),_=(0,r.useRef)(()=>{}),v=(0,r.useRef)(!1),y=(0,r.useRef)(0),b=(0,r.useRef)(!1),x=(0,r.useRef)(()=>{}),S=(0,r.useRef)(null),C=(0,r.useRef)(void 0),ee=(0,r.useRef)(null),w=(0,r.useRef)(!1),T=(0,r.useRef)(null),te=(0,r.useRef)(()=>{}),[E,D]=(0,r.useState)(null),[k,A]=(0,r.useState)(!1),[ae,ue]=(0,r.useState)(!1),[P,F]=(0,r.useState)(!1),[me,R]=(0,r.useState)(!1),[_e,ve]=(0,r.useState)(!1),[z,ye]=(0,r.useState)(`YOU`),[be,xe]=(0,r.useState)(``),[V,H]=(0,r.useState)(null),[U,Oe]=(0,r.useState)({phase:`ready`,score:0,skips:0,deepest:0,progress:0,coverage:0,spread:0}),[ke,Ae]=(0,r.useState)([]),[je,Ne]=(0,r.useState)(`YOU`),[W,Pe]=(0,r.useState)(null),[G,K]=(0,r.useState)({...Z});(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>Ae(Rt()));return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>{let e=Mt();h.current=e,K(e),n.current?.setTuning(e)});return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let t=e.current;if(!t)return;let r=!1,a=i(H);return s.current=a,a.then(async e=>{if(!e)return;if(r){e.destroy();return}let i=await Bt(t,e);if(r){i?.destroy();return}n.current=i,i?.setView(l.current),i?.setTuning(h.current),v.current?(i?.setTuning({...h.current,maxDepth:ce}),i?.setAtmosphere(fe),i?.setLayer(`pond`),i?.setDisplay({...pe(`intro`),cone:null,cssWidth:1,cssHeight:1,mri:!0})):(i?.setAtmosphere(N),i?.setLayer(`throw`),i?.setDisplay({...pe(`play`),cone:null,cssWidth:1,cssHeight:1}))}).catch(()=>H(`Orbit renderer could not start. Throwing remains playable.`)),()=>{r=!0,n.current?.destroy(),n.current=null,s.current=null,a.then(e=>e?.destroy()).catch(()=>{})}},[]),(0,r.useEffect)(()=>{let e=ze(window.location),t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;ue(!0),!(e||t)&&(v.current=!0,w.current=!0,y.current=0,b.current=!1,D({progress:0}))},[]);let Fe=(0,r.useCallback)(()=>{b.current||(b.current=!0,A(!0),window.setTimeout(()=>{v.current=!1,w.current=!1,y.current=0,b.current=!1,n.current?.setAtmosphere(N),n.current?.setLayer(`throw`),n.current?.setDisplay({...pe(`play`),cone:null,cssWidth:1,cssHeight:1}),n.current?.setTuning(h.current),p.current({centerX:ft.x,centerY:ft.y,halfY:pt}),d.current(),D(null),A(!1)},600))},[]);x.current=Fe;let Ie=(0,r.useCallback)(()=>{v.current||(v.current=!0,w.current=!0,y.current=0,b.current=!1,n.current?.clearPond(),n.current?.clear(),n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:ce}),n.current?.setAtmosphere(fe),n.current?.setDisplay({...pe(`intro`),cone:null,cssWidth:1,cssHeight:1,mri:!0}),p.current({centerX:mt.x,centerY:mt.y,halfY:ht}),d.current(),A(!1),D({progress:0}))},[]);(0,r.useEffect)(()=>{if(!ae||E)return;C.current===void 0&&(C.current=ze(window.location));let e=C.current;if(!e)return;let t=0,n=()=>{if(C.current===e){if(!ee.current){t=window.setTimeout(n,50);return}C.current=null,ee.current(e,!0)}};return t=window.setTimeout(n,400),()=>window.clearTimeout(t)},[ae,E]);let Le=(0,r.useCallback)(e=>{let t=e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12);m.current=t,Ne(t),S.current&&={...S.current,name:t||`YOU`},ye(t||`YOU`);let n=W;n&&Ae(e=>{let r=e.map(e=>e.id===n?{...e,name:t||`YOU`}:e);return zt(r),r})},[W]),q=(0,r.useCallback)(e=>{let t=jt({...h.current,...e});h.current=t,K(t),Nt(t),n.current?.setTuning(t),_.current(),g.current()},[]);(0,r.useEffect)(()=>{let e=t.current;if(!e)return;let r=e.getContext(`2d`);if(!r)return;let i=1,a=1,o=1,c=0,x=performance.now(),C=0,E=`ready`,k=-1,A=`none`,ae={x:0,y:0},ue={...l.current},P={x:0,y:0},me=0,I=0,L=0,_e=0,z={x:0,y:0,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},be=2,xe=[],V=[],H=[],U=null,ke=null,je=0,Me=0,Ne=0,W=0,G=0,Fe=new Map,Ie=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,Le=document.createElement(`canvas`),q=Le.getContext(`2d`),Re=!0,ze=document.createElement(`canvas`),J=ze.getContext(`2d`),Ke=document.createElement(`canvas`),Y=Ke.getContext(`2d`),X=!0,qe=null,Je=[],Ye=[],Xe=0,Z=0,Ze=0,Qe=!1,rt=0,it=``;g.current=()=>{X=!0},_.current=()=>{Re=!0};let at=!1;(async()=>{try{let e=O(window),t=oe(indexedDB),n=await re(e,t);if(n){if(at)return;qe=await createImageBitmap(n),X=!0;return}let r=await s.current;if(!r||at)return;let i=ne(r,{size:e});if(await new Promise(e=>{let t=()=>{if(at){i.destroy(),e();return}if(i.step(1/60),i.isComplete()){e();return}requestAnimationFrame(t)};requestAnimationFrame(t)}),at){i.destroy();return}let{bitmap:a,blobPromise:o}=await i.toBitmapAndBlob();if(i.destroy(),at){a.close();return}qe=a,X=!0;let c=await o;c&&!at&&await ie(e,c,t)}catch{}})();function st(){return{x:i*.5,y:a*.82}}function ut(){return Math.min(i,a)}function $(){return we(ut(),l.current.halfY)}function pt(){let t=e.getBoundingClientRect();if(i=Math.max(1,t.width),a=Math.max(1,t.height),o=Math.min(window.devicePixelRatio||1,2),e.width=Math.round(i*o),e.height=Math.round(a*o),r.setTransform(o,0,0,o,0,0),Le.width=Math.round(i*o),Le.height=Math.round(a*o),q?.setTransform(o,0,0,o,0,0),Re=!0,ze.width=Math.round(i*o),ze.height=Math.round(a*o),J?.setTransform(o,0,0,o,0,0),X=!0,Ke.width=Math.round(i*o),Ke.height=Math.round(a*o),Y?.setTransform(o,0,0,o,0,0),it=``,E===`ready`||E===`aiming`||E===`result`){let e=st();z.x=e.x,z.y=e.y,E!==`aiming`&&(P={...e})}}function mt(){return U||=new AudioContext,U.state===`suspended`&&U.resume(),U}function ht(e,t=.08,n=.05){try{let r=mt(),i=r.createOscillator(),a=r.createGain();i.type=`triangle`,i.frequency.value=e,a.gain.setValueAtTime(n,r.currentTime),a.gain.exponentialRampToValueAtTime(1e-4,r.currentTime+t),i.connect(a).connect(r.destination),i.start(),i.stop(r.currentTime+t)}catch{}}function yt(){if(ke)return ke;let e=mt(),t=e.createOscillator(),n=e.createOscillator(),r=e.createOscillator(),i=e.createOscillator(),a=e.createOscillator(),o=e.createOscillator(),s=e.createGain(),c=e.createGain(),l=e.createGain(),u=e.createGain(),d=e.createGain(),f=e.createGain(),p=e.createBiquadFilter(),m=e.createGain(),h=e.createWaveShaper(),g=e.createDelay(.4),_=e.createGain(),v=e.createGain(),y=e.createGain(),b=e.createStereoPanner(),x=e.createGain(),S=e.createDynamicsCompressor(),C=e.createGain(),ee=e.createGain(),w=e.createBiquadFilter(),T=e.createGain(),te=e.createBufferSource(),ne=Array.from({length:15},(t,n)=>{let r=e.createOscillator(),i=e.createGain(),a=e.createStereoPanner();return r.type=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`][n%Ve],r.frequency.value=110,i.gain.value=1e-4,r.connect(i).connect(a).connect(p),{oscillator:r,gain:i,pan:a}}),E=e.createBuffer(1,Math.round(e.sampleRate*.75),e.sampleRate),D=E.getChannelData(0),O=5370206;for(let e=0;e<D.length;e++)O^=O<<13,O^=O>>>17,O^=O<<5,D[e]=((O>>>0)/2147483648-1)*.55;te.buffer=E,te.loop=!0,t.type=`sine`,n.type=`triangle`,r.type=`sawtooth`,i.type=`sine`,a.type=`sine`,o.type=`sine`,s.gain.value=.42,c.gain.value=.16,l.gain.value=.02,u.gain.value=.08,a.frequency.value=1.5,d.gain.value=12,f.gain.value=1e-4,C.gain.value=1e-4,ee.gain.value=1e-4,w.type=`bandpass`,w.frequency.value=900,w.Q.value=5,T.gain.value=.2,p.type=`lowpass`,p.frequency.value=420,p.Q.value=2.2,m.gain.value=1;let k=new Float32Array(1024);for(let e=0;e<k.length;e++){let t=e/(k.length-1)*2-1;k[e]=Math.tanh(t*2.35)/Math.tanh(2.35)}return h.curve=k,h.oversample=`2x`,x.gain.value=1e-4,S.threshold.value=-27,S.knee.value=18,S.ratio.value=5,g.delayTime.value=.08,_.gain.value=.1,v.gain.value=.08,y.gain.value=.9,a.connect(d),d.connect(t.detune),d.connect(n.detune),d.connect(r.detune),t.connect(s).connect(p),n.connect(c).connect(p),r.connect(l).connect(p),i.connect(u).connect(p),o.connect(f).connect(p),te.connect(C).connect(w),te.connect(ee).connect(w),w.connect(T).connect(b),T.connect(g),p.connect(m).connect(h),h.connect(y).connect(b),h.connect(g),g.connect(_).connect(g),g.connect(v).connect(b),b.connect(x).connect(S).connect(e.destination),t.start(),n.start(),r.start(),i.start(),a.start(),o.start(),te.start(),ne.forEach(e=>e.oscillator.start()),ke={carrier:t,overtone:n,sideband:r,sub:i,modulator:a,pulse:o,carrierGain:s,overtoneGain:c,sidebandGain:l,subGain:u,modGain:d,pulseGain:f,noise:te,noiseGain:C,noiseBurstGain:ee,noiseFilter:w,resonatorGain:T,filter:p,drive:m,delay:g,feedback:_,wet:v,dry:y,gain:x,pan:b,shapeVoices:ne},ke}function bt(e){if(!U)return;if(!((E===`flying`||E===`resolving`)&&H.length>0)){ke&&ke.gain.gain.setTargetAtTime(1e-4,U.currentTime,.08);return}if(e-je<42)return;je=e;let t=yt(),n=U,r=H.reduce((e,t)=>e+ +!t.resolved,0)/H.length,i=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),a=Math.log2(i+1),o=H.map(Et),s=Array.from(new Set(H.map(e=>e.skip))).sort((e,t)=>e-t).map(e=>{let t=H.flatMap((t,n)=>t.skip===e?[n]:[]),n=t.map(e=>o[e]),r=e=>n.reduce((t,n)=>t+n[e],0)/Math.max(1,n.length),i=n.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/Math.max(1,n.length),a=n.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/Math.max(1,n.length),s=t.reduce((e,t)=>e+H[t].distinct,0),c=Fe.get(e)||0,l=Math.max(0,s-c);return Fe.set(e,s),{skip:e,glyph:H[t[0]].glyph,area:r(`area`),spread:r(`spread`),elongation:r(`elongation`),density:r(`density`),centroidX:r(`centroidX`),centroidY:r(`centroidY`),orientation:.5*Math.atan2(i,a),coverage:s,presence:Math.min(1,Math.log2(s+1)/10),activity:Math.min(1,Math.log2(l+1)/5),deepest:t.reduce((e,t)=>Math.max(e,H[t].shownDepth),0)}}),c=s.filter(e=>e.coverage>0).length/15,l=s.reduce((e,t)=>t.activity>e.activity?t:e,s[0]),u=l?.activity||0,d=e=>o.reduce((t,n)=>t+n[e],0)/o.length,f=(e,t)=>o.reduce((n,r)=>n+(r[e]-t)**2,0)/o.length,p=d(`area`),m=d(`spread`),h=d(`elongation`),g=d(`density`),_=d(`centroidX`),v=d(`centroidY`),y=Math.min(1,Math.sqrt(o.reduce((e,t)=>e+(t.centroidX-_)**2+(t.centroidY-v)**2,0)/o.length*.5)),b=Math.min(1,Math.sqrt(f(`spread`,m)+f(`elongation`,h)+f(`density`,g))),x=o.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/o.length,S=o.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/o.length,C=.5*Math.atan2(x,S),ee=Math.min(1,Math.hypot(x,S)),w=H.reduce((e,t)=>e+t.distinct,0),T=Math.min(1,w/Math.max(1,H.length*96)),te=H.reduce((e,t)=>e+Math.min(1,Math.hypot(t.zr,t.zi)/2),0)/H.length,ne=Math.min(1,H.length/Math.max(1,z.skips*We)),D=o[H.reduce((e,t,n)=>t.distinct*(.35+o[n].spread)*(.6+o[n].density)>H[e].distinct*(.35+o[e].spread)*(.6+o[e].density)?n:e,0)],O=Math.min(1,(1-D.elongation)*.58+ee*.42),k=Math.min(1,b*1.7+(1-g)*.24+te*.28),re=Math.max(0,w-W),ie=Math.min(1,Math.log2(re+1)/4.5);W=w;let A=H.filter(e=>Number.isFinite(e.stepDistance)&&e.stepDistance>0).map(e=>({proximity:Math.max(0,Math.min(1,(-Math.log2(Math.max(e.stepDistance,1e-12))-.25)/15)),contraction:Math.max(0,Math.min(1,e.distanceContraction/1.5))})),ae=e=>e.length?(e.sort((e,t)=>e-t),e[Math.min(e.length-1,Math.floor(e.length*.8))]):0,oe=ae(A.map(e=>e.proximity)),se=ae(A.map(e=>e.contraction)),ce=2**((oe*14+se*3)/12),le=H[0],j=Math.abs(Math.round((le.cr+2.2)*137+(le.ci+1.5)*211)),M=vt[j%vt.length],ue=34+j*7%12,de=e=>{let t=Math.round(e),n=(t%M.length+M.length)%M.length,r=Math.floor(t/M.length);return 440*2**((ue+M[n]+r*12-69)/12)},N=a*.2+D.spread*3.7+D.elongation*2.8+(D.orientation/Math.PI+.5)*2.4+D.centroidY*1.6,fe=1+Math.round(y*4+b*3+c*2),P=Math.min(900,de(N)*ce),F=Math.min(1900,de(N+2+Math.round(O*2))*ce),pe=Math.min(2400,de(N+fe+3)*ce),me=Math.min(7600,150+p*2700+g*1500+a*48+k*1500+oe*1800),I=Math.min(.045,.007+r*.01+m*.007+T*.006+ne*.003+ie*.004+c*.006+u*.004),L=Math.max(-.76,Math.min(.76,_*.52+Math.sin(e*.001*(.22+y*1.7)+C)*y*.34)),R=n.currentTime,he=[0,2,1,3,4,5,6],ge=e=>Math.log2(e.deepest+1)*.16+he[e.glyph]+e.spread*3.2+e.elongation*2.4+(e.orientation/Math.PI+.5)*2+e.centroidY*1.4;t.shapeVoices.forEach((e,t)=>{let n=s.find(e=>e.skip===t+1);if(!n||n.coverage===0){e.gain.gain.setTargetAtTime(1e-4,R,.08);return}let r=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`];e.oscillator.type=r[n.glyph],e.oscillator.frequency.setTargetAtTime(Math.min(1800,de(ge(n))*ce),R,.065),e.gain.gain.setTargetAtTime(.002+n.presence*.028+n.activity*.07+c*.004,R,.045),e.pan.pan.setTargetAtTime(Math.max(-.88,Math.min(.88,n.centroidX*.72+Math.sin(n.orientation)*.15)),R,.07)}),t.carrier.frequency.setTargetAtTime(P,R,.055),t.overtone.frequency.setTargetAtTime(F,R,.075),t.sideband.frequency.setTargetAtTime(pe,R,.085),t.sub.frequency.setTargetAtTime(Math.max(28,P*.5),R,.1),t.carrierGain.gain.setTargetAtTime(.16+O*.36,R,.1),t.overtoneGain.gain.setTargetAtTime(.035+g*.25+ee*.08,R,.1),t.sidebandGain.gain.setTargetAtTime(.008+D.elongation*.13+k*.075,R,.1),t.subGain.gain.setTargetAtTime(.025+p*.16+O*.035,R,.12),t.modulator.frequency.setTargetAtTime(.18+g*3.6+y*4.2+r+se*2.4,R,.12),t.modGain.gain.setTargetAtTime(2+k*74+b*46+se*18,R,.11),t.filter.frequency.setTargetAtTime(me,R,.08),t.filter.Q.setTargetAtTime(.8+D.elongation*7.2+O*2.6,R,.09),t.drive.gain.setTargetAtTime(.62+k*1.25+g*.42,R,.1),t.noiseGain.gain.setTargetAtTime(15e-5+k*.01+ie*.004,R,.07),t.noiseFilter.frequency.setTargetAtTime(Math.min(7200,P*(2.2+g*5.4+y*2.5)),R,.08),t.noiseFilter.Q.setTargetAtTime(1.5+g*10+ee*5,R,.09),t.resonatorGain.gain.setTargetAtTime(.1+k*.28+ie*.24,R,.09),t.delay.delayTime.setTargetAtTime(.024+p*.12+y*.12,R,.12),t.feedback.gain.setTargetAtTime(.04+D.elongation*.18+y*.18,R,.14),t.wet.gain.setTargetAtTime(.025+m*.1+y*.13+c*.045,R,.14),t.dry.gain.setTargetAtTime(.9-k*.14,R,.14),t.pan.pan.setTargetAtTime(L,R,.08),t.gain.gain.setTargetAtTime(I*(E===`resolving`?.76:1),R,.09);let _e=i-Ne,ve=Math.max(42,310-Math.min(155,a*11)-ie*88-k*42-oe*72-u*92);if((_e>0||u>.08)&&e-Me>=ve){let n=1+(j+Math.round(D.elongation*5))%Math.max(2,M.length-1),r=(u>.08?ge(l):N)+G*n%M.length+(G%4==3?fe:0),a=3+j%5,o=G%a===0?1:.54+O*.22,s=Math.min(.88,(.18+p*.18+g*.18+ie*.18+k*.1+u*.28)*o),c=.028+p*.065+O*.04+y*.03+(l?.spread||0)*.035;t.pulse.frequency.setValueAtTime(Math.min(2600,de(r+M.length)*ce),R),t.pulseGain.gain.cancelScheduledValues(R),t.pulseGain.gain.setValueAtTime(1e-4,R),t.pulseGain.gain.exponentialRampToValueAtTime(s,R+.008),t.pulseGain.gain.exponentialRampToValueAtTime(1e-4,R+c);let d=Math.min(.48,(.035+k*.24+ie*.18)*o);t.noiseBurstGain.gain.cancelScheduledValues(R),t.noiseBurstGain.gain.setValueAtTime(1e-4,R),t.noiseBurstGain.gain.exponentialRampToValueAtTime(Math.max(2e-4,d),R+.004),t.noiseBurstGain.gain.exponentialRampToValueAtTime(1e-4,R+.025+y*.06),Me=e,Ne=i,G+=1}}function xt(e=!1){let t=performance.now();if(!e&&t-_e<33)return;let n=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),r=H.reduce((e,t)=>e+Dt(t,t.shownDepth),0),i=H.reduce((e,t)=>e+t.distinct,0),a=H.length?H.reduce((e,t)=>e+Et(t).spread,0)/H.length:0,o=H.length?H.filter(e=>e.resolved).length/H.length:0,s=H.length?H.reduce((e,t)=>e+Math.min(1,t.shownDepth/h.current.maxDepth),0)/H.length:0,c=o*.8+s*.2;Oe({phase:E,score:r,skips:z.skips,deepest:n,progress:c,coverage:i,spread:a}),_e=t}function St(e){if(e.depth<=nt||e.depth%ct!==0)return;let t=(e.zr-ft.x)/gt*.5+.5,n=(e.zi-ft.y)/_t*.5+.5;if(t<0||t>=1||n<0||n>=1)return;let r=Math.min(Q-1,Math.floor(t*Q)),i=Math.min(Q-1,Math.floor(n*Q)),a=i*Q+r,o=a>>>5,s=1<<(a&31);(e.cells[o]&s)===0&&(e.cells[o]|=s,e.distinct+=1,e.sumX+=r,e.sumY+=i,e.sumXX+=r*r,e.sumYY+=i*i,e.sumXY+=r*i)}function Ct(){me+=1,E=`ready`,k=-1,A=`none`,xe=[],V=[],H=[],Je=[],Ye=[],Xe=0,Z=0,Ze=0,Qe=!1,rt=0,I=Math.floor(Math.random()*Ve),Fe.clear(),Ne=0,W=0,Me=0,G=0;let e=st();P={...e},z={x:e.x,y:e.y,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},Pe(null),n.current?.clear(),X=!0,xt(!0)}d.current=Ct;function wt(e,t){v.current||(n.current?.beginThrow(l.current,i,a,h.current.rotateRight),n.current?.setTuning(h.current),n.current?.setAtmosphere(N),n.current?.setLayer(`throw`));let r=st(),o=Math.cos(e),s=Math.sin(e),c=t*t*(3-2*t),u=$()*(.32+.56*c),d=$()*et*t,f=ut()*$e;P={x:r.x-o*f*t,y:r.y-s*f*t},z.x=r.x-o*d,z.y=r.y-s*d,z.vx=o*u,z.vy=s*u,z.vz=$()*(.38+.2*c),z.z=1,z.spin=0,z.skips=0,z.bounceAge=10,E=`flying`,ht(170,.12,.07),X=!0,xt(!0)}function Tt(e,t=!1){w.current=!0,t&&R(!0),ve(!0),ye(e.name||`YOU`),S.current=e,F(!0),T.current||=Mt();let r=jt({...h.current,rotateRight:e.rotateRight,sourceDots:e.sourceDots});h.current=r,K(r),n.current?.setTuning(r),_.current(),g.current(),un(e.view),Ct(),I=e.glyph,me=e.seed,be=e.skips,wt(e.angle,e.power)}ee.current=Tt,p.current=un;function kt(e,t,r,o,s,c){let u=Se(e,t,i,a,l.current,h.current.rotateRight),d={x:Math.fround(u.x),y:Math.fround(u.y)},f=(o+r-1)%Ve,p=v.current?6:h.current.sourceDots,m=Lt(e,t,i,a,l.current,p,f,h.current.rotateRight),g=c?.gpu??!v.current;if((c?.ripple??!v.current)&&V.push({cr:d.x,ci:d.y,born:s,index:r}),!v.current){xe.push({cr:d.x,ci:d.y,born:s,index:r});for(let e of m)H.push({zr:0,zi:0,cr:e.x,ci:e.y,depth:0,shownDepth:0,skip:r,glyph:f,stepDistance:0,distanceContraction:0,resolved:!1,score:0,offscreenStreak:0,tinyHopStreak:0,cells:new Uint32Array(ot),distinct:0,sumX:0,sumY:0,sumXX:0,sumYY:0,sumXY:0})}g&&n.current?.spawn(m,r),v.current||(ht(320+r*62,.1,.06),`vibrate`in navigator&&navigator.vibrate?.(12)),xt(!0)}function At(e){E===`resolving`||E===`result`||(E=`resolving`,L=e,xt(!0))}function Nt(){if(E===`result`)return;E=`result`,v.current||n.current?.freeze(),H.forEach(e=>{e.resolved||(e.resolved=!0,e.score=Dt(e,e.depth)),e.shownDepth=e.depth});let e=H.reduce((e,t)=>e+t.score,0),t=H.reduce((e,t)=>Math.max(e,t.depth),0),r=H.reduce((e,t)=>e+t.distinct,0),i=H.length?H.reduce((e,t)=>e+Et(t).spread,0)/H.length:0,a=`${Date.now()}-${me}`;if(w.current)Pe(null);else{Pe(a);let n={id:a,name:m.current||`YOU`,score:e,deepest:t,skips:z.skips,coverage:r,spread:i,createdAt:new Date().toISOString()};Ae(e=>{let t=[...e,n].sort((e,t)=>t.score-e.score||t.deepest-e.deepest||e.createdAt.localeCompare(t.createdAt)).slice(0,10);return zt(t),t})}S.current&&history.replaceState(null,``,Be(window.location.href,S.current)),Oe({phase:E,score:e,skips:z.skips,deepest:t,progress:1,coverage:r,spread:i}),ht(720,.18,.07)}function Pt(e,t){let n=1-Math.exp(-t/.055),r=()=>{for(let e of H){let t=e.depth-e.shownDepth;e.shownDepth=t<16?e.depth:Math.min(e.depth,e.shownDepth+Math.max(1,t*n))}};if(!H.filter(e=>!e.resolved).length){r();let t=H.every(e=>e.depth-e.shownDepth<16);E===`resolving`&&e-L>250&&t?Nt():xt();return}let o=Math.max(1,Math.floor(tt/Math.max(H.length,1))),s=l.current,c=h.current.rotateRight,d=Math.hypot(i,a)*lt;for(let e of H){if(e.resolved)continue;let t=he(e.depth,h.current.maxDepth,o,h.current.acceleration);for(let n=0;n<t&&e.depth<h.current.maxDepth;n++){let t=e.zr,n=e.zi,r=Math.fround(Math.fround(t*t-n*n)+e.cr),o=Math.fround(Math.fround(2*t*n)+e.ci),l=Math.hypot(r-t,o-n);if(Number.isFinite(l)){let t=e.stepDistance||l,n=Math.max(-4,Math.min(4,Math.log2(Math.max(t,1e-12)/Math.max(l,1e-12))));e.distanceContraction=e.distanceContraction*.82+n*.18,e.stepDistance=t*.82+l*.18}e.zi=o,e.zr=r,e.depth+=1,St(e);let f=Ce(t,n,s,i,a,c),p=Ce(r,o,s,i,a,c),m=Math.hypot((p.x-f.x)*i*.5,(p.y-f.y)*a*.5),h=Math.abs(p.x)<=1.02&&Math.abs(p.y)<=1.02,g=r>=ge.xMin&&r<=ge.xMax&&o>=ge.yMin&&o<=ge.yMax,_=u({magSq:r*r+o*o,hopPx:m,onScreen:h||g,offscreenStreak:e.offscreenStreak,tinyHopStreak:e.tinyHopStreak,maxHopPx:d});if(e.offscreenStreak=_.offscreenStreak,e.tinyHopStreak=_.tinyHopStreak,_.resolved){e.resolved=!0;break}}e.depth>=h.current.maxDepth&&(e.resolved=!0),e.resolved&&(e.shownDepth=e.depth,e.score=Dt(e,e.depth))}r();let f=H.every(e=>e.resolved),p=H.every(e=>e.depth-e.shownDepth<16);E===`resolving`&&(f&&p&&e-L>250||e-L>9e3)?Nt():xt()}function Ft(e,t){if(E!==`flying`)return;let n=$()*1.65;z.x+=z.vx*e,z.y+=z.vy*e,z.z+=z.vz*e,z.vz-=n*e;let r=Math.exp(-.06*e);if(z.vx*=r,z.vy*=r,z.spin+=Math.hypot(z.vx,z.vy)*e*.016,z.bounceAge+=e,z.z<=0&&z.vz<0){if(z.z=0,z.x<24||z.x>i-24||z.y<24||z.y>a-24){At(t);return}z.skips+=1,z.bounceAge=0,kt(z.x,z.y,z.skips,I,t);let e=be-z.skips;z.vz=Math.max(Math.abs(z.vz)*.56,$()*(.05+e*.008)),z.vx*=.79,z.vy*=.79;let n=(Ot(me<<8^z.skips)()-.5)*Math.PI/60,r=Math.cos(n),o=Math.sin(n),s=z.vx*r-z.vy*o;if(z.vy=z.vx*o+z.vy*r,z.vx=s,e>0){let e=Math.hypot(z.vx,z.vy),t=$()*.09;e>0&&e<t&&(z.vx*=t/e,z.vy*=t/e)}(z.skips>=be||z.x<-50||z.x>i+50||z.y<-50||z.y>a+50)&&At(t)}}function Rt(){let e=M(i,a),t=Math.atan2(a*.5-e.y,i*.5-e.x)+(Math.random()-.5)*1.55,n=.48+Math.random()*.42,r=n*n*(3-2*n),o=$()*(.32+.56*r),s=$()*et*n,c=Math.cos(t),l=Math.sin(t),u=y.current;y.current+=1,me=me+17|0,Je.push({x:e.x-c*s,y:e.y-l*s,vx:c*o,vy:l*o,vz:$()*(.38+.2*r),z:1,spin:0,skips:0,bounceAge:10,plannedSkips:3,shotId:me,shapeOffset:u%Ve,path:[{x:e.x-c*s,y:e.y-l*s}],draw:u%50==0})}function Bt(e,t){if(!v.current||!Je.length)return;let n=$()*1.65,r=[];for(let o of Je){o.x+=o.vx*e,o.y+=o.vy*e,o.z+=o.vz*e,o.vz-=n*e;let s=Math.exp(-.06*e);o.vx*=s,o.vy*=s,o.spin+=Math.hypot(o.vx,o.vy)*e*.016,o.bounceAge+=e;let c=o.path[o.path.length-1];o.draw&&(!c||Math.hypot(o.x-c.x,o.y-c.y)>=3)&&o.path.push({x:o.x,y:o.y});let l=!0;if(o.z<=0&&o.vz<0)if(o.z=0,o.x<24||o.x>i-24||o.y<24||o.y>a-24)l=!1;else{o.skips+=1,o.bounceAge=0,kt(o.x,o.y,o.skips,o.shapeOffset,t,{gpu:!1,ripple:o.draw});let e=o.plannedSkips-o.skips;o.vz=Math.max(Math.abs(o.vz)*.56,$()*(.05+e*.008)),o.vx*=.79,o.vy*=.79;let n=(Ot(o.shotId<<8^o.skips)()-.5)*Math.PI/60,r=Math.cos(n),s=Math.sin(n),c=o.vx*r-o.vy*s;if(o.vy=o.vx*s+o.vy*r,o.vx=c,e>0){let e=Math.hypot(o.vx,o.vy),t=$()*.09;e>0&&e<t&&(o.vx*=t/e,o.vy*=t/e)}(o.skips>=o.plannedSkips||o.x<-50||o.x>i+50||o.y<-50||o.y>a+50)&&(l=!1)}l?r.push(o):o.draw&&Ye.length<3&&Ye.push({path:o.path,born:t})}Je=r}function Vt(e){let t=e.x-P.x,n=e.y-P.y,r=Math.hypot(t,n);if(r<12)return[];let o=ut()*$e,s=Math.min(1,r/o),c=s*s*(3-2*s),l=$()*(.32+.56*c),u=$()*et*s,d=e.x-t/r*u,f=e.y-n/r*u,p=t/r*l,m=n/r*l,h=$()*(.38+.2*c),g=1,_=0,v=$()*1.65,y=1/120,b=[];for(let e=0;e<2400&&_<3;e++){d+=p*y,f+=m*y,g+=h*y,h-=v*y;let e=Math.exp(-.06*y);if(p*=e,m*=e,g>0||h>=0)continue;if(g=0,d<24||d>i-24||f<24||f>a-24)break;_+=1,b.push({x:d,y:f,index:_,glyph:(I+_-1)%Ve});let t=3-_;if(h=Math.max(Math.abs(h)*.56,$()*(.05+t*.008)),p*=.79,m*=.79,t>0){let e=Math.hypot(p,m),t=$()*.09;e>0&&e<t&&(p*=t/e,m*=t/e)}if(_>=3||d<-50||d>i+50||f<-50||f>a+50)break}return b}let Ht=[75,175,235];function Ut(e,t,n,r,o,s){if(!Y||r<=0)return;let c=h.current.rotateRight,l=Math.hypot(i,a)*lt,u=0,d=0;Y.lineWidth=.65,Y.lineJoin=`round`,Y.lineCap=`round`;for(let f=0;f<r;f++){let p=u,m=d,h=Math.fround(Math.fround(p*p-m*m)+e.x),g=Math.fround(Math.fround(2*p*m)+e.y),_=Ce(p,m,n,i,a,c),v=Ce(h,g,n,i,a,c),y=Math.hypot((v.x-_.x)*i*.5,(v.y-_.y)*a*.5);if(u=h,d=g,y>=l||!Number.isFinite(y))break;let b=s*(1-f/Math.max(1,r))**.42,x=Math.min(.55,b*.85),S=B(h,g,i,a,n,c);if(f===0){Y.fillStyle=`rgba(${o[0]}, ${o[1]}, ${o[2]}, ${x.toFixed(3)})`,Y.beginPath(),Y.arc(t.x,t.y,.7,0,dt),Y.fill();continue}let C=f===1?t:B(p,m,i,a,n,c);Y.strokeStyle=`rgba(${o[0]}, ${o[1]}, ${o[2]}, ${b.toFixed(3)})`,Y.beginPath(),Y.moveTo(C.x,C.y),Y.lineTo(S.x,S.y),Y.stroke(),Y.fillStyle=`rgba(${o[0]}, ${o[1]}, ${o[2]}, ${x.toFixed(3)})`,Y.beginPath(),Y.arc(S.x,S.y,.7,0,dt),Y.fill()}}function Wt(e){if(!Y)return;Y.clearRect(0,0,i,a);let t=Vt(e);if(!t.length)return;let n=h.current,r=l.current;Y.globalCompositeOperation=`lighter`;for(let e of t){let t=e.index,o=Math.max(1,Math.floor(n.previewIterations/2**(t-1))),s=.32/(1+(t-1)*.25);Ut(Se(e.x,e.y,i,a,r,n.rotateRight),e,r,o,Ht,s)}}function Gt(e){if(E!==`aiming`||!h.current.previewOrbits||!Y)return;let t=l.current,n=[Math.round(P.x),Math.round(P.y),t.centerX.toFixed(5),t.centerY.toFixed(5),t.halfY.toFixed(5),h.current.previewIterations,h.current.rotateRight?`1`:`0`,i,a].join(`:`);n!==it&&(it=n,Wt(e)),r.drawImage(Ke,0,0,i,a)}function Kt(e){let t=10**Math.floor(Math.log10(Math.max(e,2**-52))),n=e/t;return(n<=1?1:n<=2?2:n<=5?5:10)*t}function qt(e,t){if(Math.abs(e)<t*.001)return`0`;if(Math.abs(e)>=1e4||Math.abs(e)<.001)return e.toExponential(1);let n=Math.max(0,Math.min(6,-Math.floor(Math.log10(t)))),r=e.toFixed(n);return n?r.replace(/\.?0+$/,``):r}function Jt(){if(!q)return;q.clearRect(0,0,i,a);let e=l.current,t=h.current.rotateRight,n=De(e,i,a,t),r=Math.max(n.xMax-n.xMin,n.yMax-n.yMin)*.08,s=n.xMin-r,c=n.xMax+r,u=n.yMin-r,d=n.yMax+r,f=Kt(e.halfY*2/Math.max(a/92,1)),p=f/5,m=e=>Math.round(e*o)/o,g=e=>Math.abs(e/f-Math.round(e/f))<1e-6,_=e=>Math.abs(e)<p*1e-4,v=(n,r)=>B(n,r,i,a,e,t),y=e=>{q.beginPath();let t=Math.ceil(s/p),n=Math.floor(c/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(t,u),i=v(t,d);q.moveTo(m(n.x),m(n.y)),q.lineTo(m(i.x),m(i.y))}q.stroke()},b=e=>{q.beginPath();let t=Math.ceil(u/p),n=Math.floor(d/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(s,t),i=v(c,t);q.moveTo(m(n.x),m(n.y)),q.lineTo(m(i.x),m(i.y))}q.stroke()};if(q.lineWidth=1/o,q.strokeStyle=`rgba(104, 196, 216, .026)`,y(!1),b(!1),q.strokeStyle=`rgba(119, 211, 228, .065)`,y(!0),b(!0),h.current.coordinateAxes){let e=v(s,0),t=v(c,0),n=v(0,u),r=v(0,d);q.strokeStyle=`rgba(151, 231, 240, .18)`,q.lineWidth=1/o,q.beginPath(),q.moveTo(m(e.x),m(e.y)),q.lineTo(m(t.x),m(t.y)),q.moveTo(m(n.x),m(n.y)),q.lineTo(m(r.x),m(r.y)),q.stroke(),q.fillStyle=`rgba(171, 230, 238, .32)`,q.strokeStyle=`rgba(151, 231, 240, .14)`,q.font=`8px ui-monospace, SFMono-Regular, Menlo, monospace`,q.textBaseline=`top`,q.textAlign=`center`;for(let e=Math.ceil(s/f);e<=Math.floor(c/f);e++){let t=e*f;if(_(t))continue;let n=v(t,0);q.beginPath(),q.arc(m(n.x),m(n.y),2,0,dt),q.stroke(),n.x>18&&n.x<i-18&&n.y>9&&n.y<a-9&&q.fillText(qt(t,f),m(n.x),m(n.y)+4)}q.textBaseline=`middle`,q.textAlign=`right`;for(let e=Math.ceil(u/f);e<=Math.floor(d/f);e++){let t=e*f;if(_(t))continue;let n=v(0,t);q.beginPath(),q.arc(m(n.x),m(n.y),2,0,dt),q.stroke(),n.x>28&&n.x<i-8&&n.y>9&&n.y<a-9&&q.fillText(qt(t,f),m(n.x)-5,m(n.y))}q.fillStyle=`rgba(180, 239, 245, .42)`,q.font=`italic 9px ui-monospace, SFMono-Regular, Menlo, monospace`;let l=v(c,0);q.textAlign=`right`,q.textBaseline=`bottom`,q.fillText(`Re(c)`,Math.min(i-7,Math.max(40,l.x-6)),Math.min(a-6,Math.max(14,l.y-4)));let p=v(0,d);q.textAlign=`left`,q.textBaseline=`top`,q.fillText(`Im(c)`,Math.min(i-34,Math.max(6,p.x+6)),Math.max(6,p.y+4))}Re=!1}function Yt(e,t){let n=e.z*.3,i=(t+e.skips)%Ve,a=He[i],s=Math.min(1,e.z/Math.max($()*.45,1)),c=Math.round(e.x*o)/o,l=Math.round((e.y-n)*o)/o,u=Ie?0:Math.exp(-e.bounceAge*8.5)*Math.cos(e.bounceAge*29),d=1+u*.11,f=1-u*.09;r.save(),r.fillStyle=`rgba(0, 4, 9, ${.3*(1-s*.72)})`,r.beginPath(),r.ellipse(c,e.y,10.5*(1+Math.max(0,u)*.08),3.5,0,0,dt),r.fill(),r.restore(),r.save(),r.translate(c,l),r.scale(d,f),r.rotate(e.spin*.18),r.strokeStyle=`rgba(255, 255, 255, .34)`,r.lineWidth=1;for(let e=0;e<a;e++){r.beginPath();for(let t=0;t<=32;t++){let n=It(i,e,t/32);t===0?r.moveTo(n.x*10,n.y*10):r.lineTo(n.x*10,n.y*10)}r.stroke()}r.fillStyle=`#ffffff`;let p=v.current?6:Math.max(Ue,Math.min(18,h.current.sourceDots));for(let e=0;e<p;e++){let t=e%a,n=Math.floor(e/a),o=Math.ceil((p-t)/a),s=It(i,t,n/Math.max(o,1));r.beginPath(),r.arc(s.x*10,s.y*10,1.15,0,dt),r.fill()}r.restore()}function Xt(e,t){if(!(e.length<2||t<=0)){r.save(),r.strokeStyle=`rgba(210, 220, 224, ${t})`,r.lineWidth=1,r.lineJoin=`round`,r.lineCap=`round`,r.beginPath(),r.moveTo(e[0].x,e[0].y);for(let t=1;t<e.length;t++)r.lineTo(e[t].x,e[t].y);r.stroke(),r.restore()}}function Zt(e){if(v.current){let t=0;for(let e of Je)e.draw&&t<2&&(Xt(e.path,.09),t+=1);Ye=Ye.filter(t=>e-t.born<j);for(let t=0;t<Math.min(2,Ye.length);t++){let n=Ye[t],r=Math.min(1,(e-n.born)/j);Xt(n.path,.08*(1-r)*(1-r))}return}E===`resolving`||E===`result`||Yt(z,I)}function Qt(e){V=V.filter(t=>e-t.born<(t.lifetime??2400));for(let t of V){let n=B(t.cr,t.ci,i,a,l.current,h.current.rotateRight),o=t.lifetime??2400,s=(e-t.born)/o;if(s<=0||s>=1)continue;let c=t.maxRadius??Math.max(36,ut()*.14),u=3+s**.7*c,d=Math.sin(s*Math.PI)*(1-s)**1.25,f=v.current?.44:.28,p=Math.max(0,d*f);p<=.002||(r.save(),r.strokeStyle=v.current?`rgba(240, 245, 255, ${p.toFixed(3)})`:`rgba(130, 215, 235, ${p.toFixed(3)})`,r.lineWidth=Math.max(.5,(v.current?1.1:.85)*(1-s*.5)),r.beginPath(),r.arc(n.x,n.y,u,0,dt),r.stroke(),r.restore())}r.textAlign=`center`,r.textBaseline=`middle`;for(let t of xe){let n=B(t.cr,t.ci,i,a,l.current,h.current.rotateRight),o=e-t.born,s=8e3;if(o<0||o>=s)continue;let c=o/s,u=o<450?1+Math.sin(o/450*Math.PI)*.38:1;r.font=`800 ${Math.round(15*u)}px ui-monospace, monospace`;let d=Math.max(0,(1-c)**.85*.92);d<=.01||(r.save(),r.lineWidth=2.5,r.strokeStyle=`rgba(0, 16, 28, ${(d*.85).toFixed(3)})`,r.strokeText(String(t.index),n.x,n.y+.5),r.fillStyle=`rgba(235, 252, 255, ${d.toFixed(3)})`,r.fillText(String(t.index),n.x,n.y+.5),r.restore())}r.textAlign=`start`,r.textBaseline=`alphabetic`}function $t(){if(E!==`aiming`)return null;let e=st(),t=e.x-P.x,n=e.y-P.y,r=Math.hypot(t,n);if(r<8)return null;let o=t/r,s=n/r,c=Math.hypot(i,a)*1.18,l=se,u=Math.cos(l),d=Math.sin(l);return{apexX:P.x,apexY:P.y,directionX:o,directionY:s,range:c,leftX:P.x+(o*u-s*d)*c,leftY:P.y+(s*u+o*d)*c,rightX:P.x+(o*u+s*d)*c,rightY:P.y+(s*u-o*d)*c,tipX:P.x+o*c*1.04,tipY:P.y+s*c*1.04}}function en(){let e=n.current;if(e){if(v.current){e.setDisplay({...pe(`intro`),cone:null,cssWidth:i,cssHeight:a,mri:!0});return}if(E===`aiming`){e.setDisplay({...pe(`aiming`),cone:$t(),cssWidth:i,cssHeight:a});return}e.setDisplay({...pe(`play`),cone:null,cssWidth:i,cssHeight:a})}}function tn(e){if(!qe)return;let t=B(ge.xMin,ge.yMax,i,a,l.current,!1),n=B(ge.xMax,ge.yMin,i,a,l.current,!1),r=Math.round(Math.min(t.x,n.x)),o=Math.round(Math.min(t.y,n.y)),s=Math.max(1,Math.round(Math.abs(n.x-t.x))),c=Math.max(1,Math.round(Math.abs(n.y-t.y)));e.drawImage(qe,r,o,s,c)}function nn(){if(E!==`aiming`||v.current)return;let e=$t();if(!e)return;let{apexX:t,apexY:s,directionX:c,directionY:l,range:u}=e;if(!n.current&&qe&&J){if(X){J.clearRect(0,0,i,a),tn(J),J.globalCompositeOperation=`destination-in`,J.save(),J.filter=`blur(${32*o}px)`;let e=Math.atan2(l,c),n=se*2/dt,r=Math.min(n*.22,.04),d=J.createConicGradient(e-se,t,s);d.addColorStop(0,`rgba(255, 255, 255, 0)`),d.addColorStop(r,`rgba(255, 255, 255, 1)`),d.addColorStop(Math.max(r,n-r),`rgba(255, 255, 255, 1)`),d.addColorStop(n,`rgba(255, 255, 255, 0)`),n<1&&d.addColorStop(1,`rgba(255, 255, 255, 0)`),J.fillStyle=d,J.fillRect(0,0,i,a),J.globalCompositeOperation=`destination-in`;let f=J.createRadialGradient(t,s,0,t,s,u);f.addColorStop(0,`rgba(255, 255, 255, 0.9)`),f.addColorStop(.55,`rgba(255, 255, 255, 0.4)`),f.addColorStop(1,`rgba(255, 255, 255, 0)`),J.fillStyle=f,J.fillRect(0,0,i,a),J.restore(),J.globalCompositeOperation=`source-over`,X=!1}r.save(),r.globalAlpha=.32,r.drawImage(ze,0,0,i,a),r.restore()}}function rn(e){en(),r.clearRect(0,0,i,a),Re&&Jt(),Le&&r.drawImage(Le,0,0,i,a);let t=st();nn(),Gt(t),Qt(e),Zt(e)}function an(e){let t=M(i,a),n=Se(t.x,t.y,i,a,l.current,h.current.rotateRight),r=Math.random(),o,s;r<.35?(o=Math.max(18,ut()*(.04+Math.random()*.04)),s=2600+Math.random()*800):r<.75?(o=Math.max(45,ut()*(.09+Math.random()*.08)),s=3400+Math.random()*1e3):(o=Math.max(90,ut()*(.18+Math.random()*.14)),s=4600+Math.random()*1200),V.push({cr:n.x,ci:n.y,born:e,index:1,lifetime:s,maxRadius:o})}function on(e){let t=E===`aiming`&&!v.current;if(!v.current&&!t||b.current||Z!==0&&e-Z<40)return;Z=e,n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:ce}),n.current?.setAtmosphere(fe);let r=Array.from({length:96},()=>de());n.current?.spawnAppend(r,1,Ge),Math.random()<.04&&an(e)}function sn(e){if(!v.current||b.current)return;if(Ze||=e,!Qe){let t=Math.min(1,(e-Ze)/le);t>=1?(Qe=!0,D({progress:1,ready:!0})):e-rt>40&&(rt=e,D({progress:t}))}let t=y.current<32?900:2400;Xe!==0&&e-Xe<t||(Xe=e,w.current=!0,n.current?.setTuning({...h.current,maxDepth:ce}),n.current?.setAtmosphere(fe),Rt(),an(e))}function cn(e){let t=Math.min(.05,(e-x)/1e3);x=e,C+=t;let n=1/120;for(;C>=n;)Ft(n,e),Bt(n,e),C-=n;sn(e),on(e),Pt(e,t),bt(e),rn(e),c=requestAnimationFrame(cn)}function ln(t){let n=e.getBoundingClientRect();return{x:t.clientX-n.left,y:t.clientY-n.top}}function un(e){let t=l.current,r=h.current.rotateRight;if(E===`flying`||E===`aiming`){let n=Te(z.x,z.y,i,a,t,e,r);if(E===`flying`){let n=Ee(z.x,z.y,z.vx,z.vy,i,a,t,e,r);z.vx=n.x,z.vy=n.y;let o=t.halfY/Math.max(e.halfY,1e-6);z.z*=o,z.vz*=o}z.x=n.x,z.y=n.y,E===`aiming`&&(P=Te(P.x,P.y,i,a,t,e,r))}l.current=e,Re=!0,X=!0,n.current?.setView(e)}function dn(t){if(v.current)return;let r=ln(t);k=t.pointerId,e.setPointerCapture(k),E===`ready`&&Math.hypot(r.x-z.x,r.y-z.y)<=48?(A=`aim`,E=`aiming`,be=f(Math.random),it=``,X=!0,n.current?.setLayer(`pond`),n.current?.setAtmosphere(fe),n.current?.setTuning({...h.current,maxDepth:ce}),P=r,z.x=r.x,z.y=r.y,xt(!0)):(A=`pan`,ae=r,ue={...l.current})}function fn(e){let t=ln(e);if(e.pointerId!==k)return;if(A===`pan`){let e=h.current.rotateRight,n=Se(ae.x,ae.y,i,a,ue,e),r=Se(t.x,t.y,i,a,ue,e);un({centerX:ue.centerX-(r.x-n.x),centerY:ue.centerY-(r.y-n.y),halfY:ue.halfY});return}if(A!==`aim`||E!==`aiming`)return;let n=st(),r=t.x-n.x,o=t.y-n.y,s=Math.hypot(r,o),c=ut()*$e,l=s>c?c/s:1;P={x:n.x+r*l,y:n.y+o*l},z.x=P.x,z.y=P.y,X=!0}function pn(t){if(t.pointerId!==k)return;if(X=!0,A===`pan`){A=`none`,k=-1,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId);return}if(A!==`aim`||E!==`aiming`)return;let r=st(),i=r.x-P.x,a=r.y-P.y,o=Math.hypot(i,a);if(k=-1,A=`none`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),o<12){E=`ready`,z.x=r.x,z.y=r.y,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(N),n.current?.setLayer(`throw`),xt(!0);return}let s=ut()*$e,c=Math.min(1,o/s),u=Math.atan2(a,i);w.current=!1,R(!1),ve(!1),T.current=null,S.current={version:1,view:{...l.current},rotateRight:h.current.rotateRight,angle:u,power:c,skips:be,glyph:I,seed:me,sourceDots:h.current.sourceDots,name:m.current||`YOU`},F(!0),wt(u,c)}function mn(){if(A===`pan`){A=`none`,k=-1;return}if(A!==`aim`||E!==`aiming`)return;E=`ready`,k=-1,A=`none`;let e=st();P={...e},z.x=e.x,z.y=e.y,X=!0,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(N),n.current?.setLayer(`throw`),xt(!0)}function hn(e){v.current||(e.key===`Escape`&&mn(),(e.key===` `||e.key===`Enter`)&&E===`result`&&(e.preventDefault(),te.current()))}let gn=new ResizeObserver(pt);return gn.observe(e),e.addEventListener(`pointerdown`,dn),e.addEventListener(`pointermove`,fn),e.addEventListener(`pointerup`,pn),e.addEventListener(`pointercancel`,mn),window.addEventListener(`keydown`,hn),pt(),Ct(),c=requestAnimationFrame(cn),()=>{at=!0,cancelAnimationFrame(c),gn.disconnect(),e.removeEventListener(`pointerdown`,dn),e.removeEventListener(`pointermove`,fn),e.removeEventListener(`pointerup`,pn),e.removeEventListener(`pointercancel`,mn),window.removeEventListener(`keydown`,hn),U?.close(),ee.current=null}},[]);let Re=U.phase===`ready`?`Grab the white orb. Pull back and release.`:U.phase===`aiming`?`Aim for deep water · farther pull = faster throw`:U.phase===`flying`?`Each splash launches a new ${G.sourceDots}-point glyph`:U.phase===`resolving`?`Resolving the pond · ${Math.round(U.progress*100)}%`:`Press Space or throw again`,J=Math.max(0,I.indexOf(G.maxDepth)),Ke=()=>{if(w.current=!1,R(!1),ve(!1),T.current){let e=T.current;T.current=null,h.current=e,K(e),Nt(e),n.current?.setTuning(e),_.current(),g.current()}d.current(),requestAnimationFrame(()=>t.current?.focus())};te.current=Ke;let Y=()=>{let e=S.current;!e||E||ee.current?.(e)},Xe=()=>{let e=S.current;if(!e)return;let t=Be(window.location.href,e);history.replaceState(null,``,t),(async()=>{try{if(navigator.share){await navigator.share({title:`Mandelbrot Skipping`,url:t});return}}catch(e){if(e instanceof Error&&e.name===`AbortError`)return}try{await navigator.clipboard.writeText(t),xe(`Copied`),window.setTimeout(()=>xe(``),1600)}catch{xe(`Copy the address bar`),window.setTimeout(()=>xe(``),2400)}})()},Ze=U.phase===`flying`||U.phase===`resolving`||!!E;return(0,a.jsxs)(`main`,{className:`gameShell ${_e?`replayMode`:``}`,children:[(0,a.jsxs)(`section`,{className:`playfield`,"aria-label":`Mandelbrot rock skipping game`,children:[(0,a.jsx)(`canvas`,{ref:e,className:`gpuCanvas`,"aria-hidden":`true`}),(0,a.jsx)(`canvas`,{ref:t,className:`gameCanvas`,tabIndex:0,"aria-label":`Throw ready. Drag the white orb backward and release it across the water`}),_e&&(0,a.jsxs)(`p`,{className:`replayBanner`,"aria-live":`polite`,children:[(0,a.jsx)(`span`,{className:`replayBannerName`,children:Me(z)}),(0,a.jsx)(`span`,{className:`replayBannerLabel`,children:`replay`})]}),E&&(0,a.jsx)(o,{progress:E.progress,fading:k,ready:E.ready,onPlay:Fe}),(U.phase===`flying`||U.phase===`resolving`)&&!E&&(0,a.jsx)(`button`,{type:`button`,className:`playfieldThrowControl`,onClick:Ke,"aria-label":`Cancel this throw and rethrow`,children:`Rethrow`}),(0,a.jsxs)(`div`,{className:`playfieldDock`,children:[(0,a.jsx)(`button`,{type:`button`,className:`replayOpening`,onClick:Ie,disabled:!!E||!!V,"aria-label":`Replay the opening Buddhabrot sequence`,children:`Replay opening`}),(0,a.jsx)(c,{})]})]}),(0,a.jsxs)(`aside`,{className:`scoreRail ${U.phase===`result`?`hasResult`:``}`,"aria-label":`Score and local high scores`,children:[(0,a.jsxs)(`section`,{className:`liveScore`,"aria-live":`polite`,children:[(0,a.jsx)(`span`,{className:`liveLabel`,children:U.phase===`result`?`Final score`:`Live score`}),(0,a.jsx)(`strong`,{className:`liveNumber`,children:Tt(U.score)}),(0,a.jsxs)(`span`,{className:`liveMeta`,children:[U.skips,` skips · `,U.deepest?Tt(U.deepest):`0`,` deep · `,U.coverage,` cells · `,Math.round(U.spread*100),`% spread`]}),(0,a.jsx)(`span`,{className:`liveProgress`,children:(0,a.jsx)(`i`,{style:{width:`${Math.max(2,U.progress*100)}%`}})}),(0,a.jsxs)(`div`,{className:`throwShareRow`,children:[(0,a.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:Y,disabled:!P||Ze,"aria-label":`Replay this throw`,children:`Replay throw`}),(0,a.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:Xe,disabled:!P,"aria-label":`Copy a link to this throw`,children:be||`Share throw`})]})]}),(0,a.jsxs)(`section`,{className:`tuningPanel`,"aria-label":`Orbit tuning`,children:[(0,a.jsxs)(`div`,{className:`tuningHeading`,children:[(0,a.jsx)(`span`,{children:`Orbit tuning`}),(0,a.jsx)(`span`,{children:`Live`})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Glyph dots`}),(0,a.jsx)(`output`,{children:G.sourceDots})]}),(0,a.jsx)(`input`,{type:`range`,min:Ue,max:We,step:`1`,value:G.sourceDots,"aria-label":`Dots per sacred geometry glyph`,onChange:e=>q({sourceDots:Number(e.target.value)})})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Orbit limit`}),(0,a.jsx)(`output`,{children:kt(G.maxDepth)})]}),(0,a.jsx)(`input`,{type:`range`,min:`0`,max:I.length-1,step:`1`,value:J,"aria-label":`Orbit iteration limit`,"aria-valuetext":`${Tt(G.maxDepth)} iterations`,onChange:e=>q({maxDepth:I[Number(e.target.value)]})})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Acceleration curve`}),(0,a.jsxs)(`output`,{children:[G.acceleration.toFixed(1),`×`]})]}),(0,a.jsx)(`input`,{type:`range`,min:L,max:18,step:`0.1`,value:G.acceleration,"aria-label":`Iteration speed acceleration curve`,"aria-valuetext":`${G.acceleration.toFixed(1)} curve`,onChange:e=>q({acceleration:Number(e.target.value)})})]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Line persist`}),(0,a.jsxs)(`output`,{children:[G.linePersist.toFixed(2),`s`]})]}),(0,a.jsx)(`input`,{type:`range`,min:X,max:qe,step:`0.05`,value:G.linePersist,"aria-label":`How long iteration lines stay visible`,"aria-valuetext":`${G.linePersist.toFixed(2)} seconds`,onChange:e=>q({linePersist:Number(e.target.value)})})]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.previewOrbits,"aria-label":`Preview skip orbits while aiming`,onChange:e=>q({previewOrbits:e.target.checked})}),`Aim orbit preview`]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.skipColors,"aria-label":`Color each skip differently`,onChange:e=>q({skipColors:e.target.checked})}),`Skip colors`]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.coordinateAxes,"aria-label":`Show coordinate axes`,onChange:e=>q({coordinateAxes:e.target.checked})}),`Coordinate axes`]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.rotateRight,"aria-label":`Rotate coordinates and Buddhabrot 90 degrees right`,onChange:e=>q({rotateRight:e.target.checked})}),`Rotate 90° right`]}),(0,a.jsxs)(`label`,{className:`tuningCheck`,children:[(0,a.jsx)(`input`,{type:`checkbox`,checked:G.doublePixels,"aria-label":`Render the orbit nebula at half resolution so pixels look doubled`,onChange:e=>q({doublePixels:e.target.checked})}),`Double pixels`]}),(0,a.jsxs)(`div`,{className:`tuningControl`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{children:`Preview iterations`}),(0,a.jsx)(`output`,{children:G.previewIterations})]}),(0,a.jsx)(`input`,{type:`range`,min:Je,max:Ye,step:`1`,value:G.previewIterations,"aria-label":`Orbit iterations to draw while aiming`,"aria-valuetext":`${G.previewIterations} iterations`,onChange:e=>q({previewIterations:Number(e.target.value)})})]}),(0,a.jsx)(`p`,{className:`tuningNote`,children:`Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations each skip. Skip colors tint preview and live trails per splash.`})]}),U.phase===`result`&&(0,a.jsxs)(`section`,{className:`railResult`,"aria-label":`Throw result`,children:[(0,a.jsx)(`div`,{className:`resultEyebrow`,children:me?`${Me(z)} throw`:ke[0]?.id===W?`New local best`:`Throw complete`}),(0,a.jsxs)(`div`,{className:`resultStats`,children:[U.skips,` exact paths · `,Tt(U.deepest),` deep · `,U.coverage,` distinct cells · `,Math.round(U.spread*100),`% spread.`]}),(0,a.jsxs)(`div`,{className:`nameRow`,children:[W?(0,a.jsx)(`input`,{className:`nameInput`,"aria-label":`High score name`,value:je,maxLength:12,onChange:e=>Le(e.target.value)}):null,(0,a.jsx)(`button`,{className:`throwButton`,onClick:Ke,children:`Throw again`})]})]}),(0,a.jsx)(`h2`,{className:`railTitle`,children:`Local legends`}),(0,a.jsx)(`p`,{className:`railSub`,children:`Depth, distinct points, and spatial spread all score. Later skips multiply the result.`}),V&&(0,a.jsx)(`p`,{className:`gpuNote`,role:`status`,children:V}),(0,a.jsxs)(`div`,{className:`scoreList`,children:[ke.length===0&&(0,a.jsx)(`div`,{className:`emptyScores`,children:`No throws yet.`}),ke.map((e,t)=>(0,a.jsxs)(`div`,{className:`scoreEntry ${e.id===W?`current`:``}`,children:[(0,a.jsx)(`span`,{className:`rank`,children:String(t+1).padStart(2,`0`)}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`scoreName`,children:e.name}),(0,a.jsxs)(`span`,{className:`scoreMeta`,children:[e.skips,` skips · `,Tt(e.deepest),` deep · `,e.coverage,` cells · `,Math.round(e.spread*100),`% spread`]})]}),(0,a.jsx)(`span`,{className:`scoreNumber`,children:Tt(e.score)})]},e.id))]}),(0,a.jsxs)(`div`,{className:`railHint`,children:[Re,(0,a.jsx)(`br`,{}),`Drag empty water to move · wheel or +/- to zoom.`]}),(0,a.jsxs)(`div`,{className:`railFooter`,children:[`Saved on this device · score model v2 · `,kt(G.maxDepth),` orbit cap`]})]})]})}export{Vt as default};