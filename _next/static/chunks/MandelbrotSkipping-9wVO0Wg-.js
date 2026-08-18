import{r as e}from"./rolldown-runtime-vU33u7is.js";import{i as t,r as n}from"./framework-EwgI_Pa9.js";var r=e(n(),1);async function i(e){let t=navigator.gpu;if(!t)return e(`WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.`),null;let n=await t.requestAdapter({powerPreference:`high-performance`});if(!n)return e(`No GPU adapter found. Throwing still works in reduced visual mode.`),null;let r=await n.requestDevice(),i=!1;r.addEventListener(`uncapturederror`,t=>{i=!0;let n=t.error?.message||String(t.error);console.error(`WebGPU validation`,n),e(`WebGPU validation error: ${n}`)}),r.lost.then(()=>{i=!0,e(`The GPU device was lost. Reload to restore orbit trails.`)});let a=!1;return{device:r,preferredFormat:t.getPreferredCanvasFormat(),hasFailed:()=>i,destroy:()=>{a||(a=!0,r.destroy())}}}var a={trigger:`Buddhabrot`,title:`Buddhabrot`,formula:`z → z² + c`,paragraphs:[`The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.`,`Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. During the opening, a thin GPU-computed escape-depth slice moves through those trajectories and exposes progressively finer filaments.`],wikipedia:{journal:`Notes on fractal geometry`,title:`The Buddhabrot`,sentences:[{text:`The Buddhabrot is the probability distribution over the trajectories of points that escape the Mandelbrot fractal.`,cite:1},{text:`Its name reflects its pareidolic resemblance to classical depictions of Gautama Buddha, seated in a meditation pose with a forehead mark (tika), a traditional oval crown (ushnisha), and ringlet of hair.`,cite:2}],references:[{n:1,text:`Green, M. The Buddhabrot Technique. Superliminal, 1993.`,url:`https://www.superliminal.com/fractals/bbrot/bbrot.htm`},{n:2,text:`Wikipedia contributors. Buddhabrot. Wikipedia, The Free Encyclopedia. CC BY-SA 4.0.`,url:`https://en.wikipedia.org/wiki/Buddhabrot`}]}},o=t();function s(e){return e.split(/\b(tika|ushnisha)\b/).map((e,t)=>e===`tika`||e===`ushnisha`?(0,o.jsx)(`i`,{children:e},t):e)}function c({progress:e,fading:t,ready:n,onPlay:r}){let{wikipedia:i}=a;return(0,o.jsxs)(`div`,{className:`introOverlay ${t?`fading`:``}`,role:`status`,"aria-label":`Charting the pond`,children:[(0,o.jsxs)(`div`,{className:`introChrome`,children:[(0,o.jsx)(`span`,{className:`introTitle`,children:`Mandelbrot Skipping`}),(0,o.jsx)(`span`,{className:`introMode`,children:`Live GPU · escape-depth slice`}),!n&&(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,e*100)}%`}})})]}),(0,o.jsxs)(`article`,{className:`introPaper`,"aria-label":`Buddhabrot, from Wikipedia`,children:[(0,o.jsx)(`p`,{className:`introPaperJournal`,children:i.journal}),(0,o.jsx)(`h1`,{className:`introPaperTitle`,children:i.title}),(0,o.jsx)(`p`,{className:`introPaperLede`,children:i.sentences.map(e=>(0,o.jsxs)(`span`,{children:[s(e.text),(0,o.jsx)(`sup`,{className:`introPaperCite`,children:(0,o.jsxs)(`a`,{href:i.references[e.cite-1].url,target:`_blank`,rel:`noreferrer`,children:[`[`,e.cite,`]`]})}),` `]},e.cite))}),(0,o.jsx)(`ol`,{className:`introPaperRefs`,children:i.references.map(e=>(0,o.jsx)(`li`,{value:e.n,children:(0,o.jsx)(`a`,{href:e.url,target:`_blank`,rel:`noreferrer`,children:e.text})},e.n))})]}),n&&(0,o.jsx)(`button`,{type:`button`,className:`introPlay`,onClick:r,"aria-label":`Play`,children:`Play`})]})}function l(){let{trigger:e,title:t,formula:n,paragraphs:r}=a;return(0,o.jsxs)(`div`,{className:`howItWorks`,children:[(0,o.jsx)(`button`,{type:`button`,className:`howItWorksTrigger`,"aria-describedby":`how-it-works-panel`,children:e}),(0,o.jsxs)(`div`,{id:`how-it-works-panel`,className:`howItWorksPanel`,role:`tooltip`,children:[(0,o.jsx)(`p`,{className:`howItWorksKicker`,children:t}),(0,o.jsx)(`p`,{className:`howItWorksGpuNote`,children:`Opening visual computed live on your GPU · no video`}),(0,o.jsx)(`p`,{className:`howItWorksFormula`,children:n}),r.map(e=>(0,o.jsx)(`p`,{children:e},e.slice(0,24)))]})]})}var u=.04;function d(e){let t=e.onScreen?0:e.offscreenStreak+1,n=e.hopPx<=.04?e.tinyHopStreak+1:0,r=!Number.isFinite(e.hopPx)||!Number.isFinite(e.magSq),i=e.magSq>4;return{resolved:r||i||n>=500||t>=800,offscreenStreak:t,tinyHopStreak:n}}var f=.76;function p(e,t=f){let n=(1-t**14)/(1-t),r=Math.min(Math.max(e(),0),.999999999)*n;for(let e=2;e<=15;e++)if(r-=t**(e-2),r<0)return e;return 15}function m(e,t,n,r){let i=Math.max(n,r),a=e+n>i?0:e;return{start:a,nextSource:(a+n)%i,sourceCount:Math.min(i,t+n)}}function h(e,t,n){let r=Math.max(0,n-e),i=Math.min(t,r);return{start:e,nextSource:e+i,sourceCount:e+i,added:i}}var g=1024,_=99.92;function v(e,t,n){let r=e.length,i=0;for(let t=0;t<r;t++)i+=e[t];if(i===0)return 0;let a=i*n/100,o=0;for(let n=0;n<r;n++){let i=e[n];if(i>0&&o+i>=a){let e=(a-o)/i;return(n+e)/r*t}o+=i}return t}function y(e,t=20){if(!(t>0))return{low:0,high:1};let n=v(e,t,54),r=v(e,t,_);return{low:n,high:Math.max(r,n+1e-9)}}var b=.05;function x(e){return!Number.isFinite(e)||e<0?0:Math.min(e,b)}function S(e,t){let n=t.maxSamplesPerFrame??2e6,r=t.minDurationMs??5e3;if(r<=0)return n;let i=x(e)*1e3/r;return Math.max(1,Math.min(n,Math.floor(t.totalSamples*i)))}var C={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5},w=`
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
`,T=`
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
  let scaled = light / 20.0 * ${g}.0;
  let bin = min(${g}u - 1u, u32(max(scaled, 0.0)));
  atomicAdd(&bins[bin], 1u);
}
`,ee=`
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
`,E=`
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
`,D={2048:16e6,4096:64e6};function te(e,t){let n=e.device,r=globalThis.GPUBufferUsage,i=globalThis.GPUTextureUsage,{size:a}=t,o=a*a,s=t.totalSamples??D[a]??16e6,c=t.maxIterations??320,l=n.createBuffer({size:o*4,usage:r.STORAGE|r.COPY_DST}),u=n.createBuffer({size:g*4,usage:r.STORAGE|r.COPY_DST|r.COPY_SRC}),d=n.createBuffer({size:g*4,usage:r.COPY_DST|r.MAP_READ}),f=n.createBuffer({size:32,usage:r.UNIFORM|r.COPY_DST}),p=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),m=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),h=n.createTexture({size:[a,a],format:`rgba8unorm`,usage:i.STORAGE_BINDING|i.TEXTURE_BINDING|i.COPY_SRC}),_=n.createSampler({magFilter:`linear`,minFilter:`linear`}),v=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:w}),entryPoint:`accumulate`}}),b=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:T}),entryPoint:`histogram`}}),x=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:ee}),entryPoint:`colorize`}}),te=n.createShaderModule({code:E}),O=n.createRenderPipeline({layout:`auto`,vertex:{module:te,entryPoint:`vs`},fragment:{module:te,entryPoint:`fs`,targets:[{format:e.preferredFormat}]},primitive:{topology:`triangle-list`}}),k=n.createBindGroup({layout:v.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:l}}]}),A=n.createBindGroup({layout:b.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}}]}),j=n.createBindGroup({layout:x.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:l}},{binding:2,resource:h.createView()}]}),ne=n.createBindGroup({layout:O.getBindGroupLayout(0),entries:[{binding:0,resource:h.createView()},{binding:1,resource:_}]});n.queue.writeBuffer(p,0,new Uint32Array([a,0,0,0]));let re=0,ie=0,M=!1,ae=!1,oe={low:.69,high:3};function se(e){let t=new ArrayBuffer(32);new Uint32Array(t,0,4).set([a,ie+1,e,c]),new Float32Array(t,16,4).set([C.xMin,C.xMax,C.yMin,C.yMax]),n.queue.writeBuffer(f,0,t)}function ce(){let e=new ArrayBuffer(16);new Uint32Array(e,0,2).set([a,0]),new Float32Array(e,8,2).set([oe.low,oe.high]),n.queue.writeBuffer(m,0,e)}async function N(){if(!(ae||M)){ae=!0;try{let e=n.createCommandEncoder({label:`buddhabrot-histogram-readback`});if(e.copyBufferToBuffer(u,0,d,0,g*4),n.queue.submit([e.finish()]),await d.mapAsync(globalThis.GPUMapMode.READ),M)return;oe=y(new Uint32Array(d.getMappedRange().slice(0))),d.unmap()}catch(e){console.warn(`[buddhabrot] histogram readback failed`,e)}finally{ae=!1}}}return{step(r){if(M||e.hasFailed()||re>=s)return;let i=S(r,{totalSamples:s,minDurationMs:t.minDurationMs}),o=Math.min(i,s-re);se(o),ce(),n.queue.writeBuffer(u,0,new Uint32Array(g));let c=n.createCommandEncoder({label:`buddhabrot-step`}),l=c.beginComputePass();l.setPipeline(v),l.setBindGroup(0,k),l.dispatchWorkgroups(Math.ceil(o/64)),l.setPipeline(b),l.setBindGroup(0,A),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.setPipeline(x),l.setBindGroup(0,j),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.end(),n.queue.submit([c.finish()]),re+=o,ie+=1,N()},progress(){return Math.min(1,re/s)},isComplete(){return re>=s},blit(t){if(M||e.hasFailed())return!1;let r=n.createCommandEncoder({label:`buddhabrot-blit`}),i=r.beginRenderPass({colorAttachments:[{view:t.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});return i.setPipeline(O),i.setBindGroup(0,ne),i.draw(3),i.end(),n.queue.submit([r.finish()]),!0},async toBitmapAndBlob(){let t=new OffscreenCanvas(a,a),r=t.getContext(`webgpu`);if(r.configure({device:n,format:e.preferredFormat,alphaMode:`premultiplied`}),!this.blit(r))throw Error(`Buddhabrot generator cannot blit: GPU context is destroyed or has failed.`);return{bitmap:await createImageBitmap(t),blobPromise:t.convertToBlob({type:`image/png`}).catch(e=>(console.warn(`[buddhabrot] PNG encode failed; texture will not be cached`,e),null))}},destroy(){M=!0,n.queue.onSubmittedWorkDone().finally(()=>{h.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy()})}}}var O=`mandelbrot-skipping`,k=`textures`;function A(e){let t=e.matchMedia(`(pointer: coarse)`).matches,n=Math.min(e.screen.width,e.screen.height);return t&&n<=820?2048:4096}function j(e){return`buddhabrot:v3:${e}`}async function ne(e,t){try{return await t.get(j(e))}catch{return null}}async function re(e,t,n){let r=j(e);try{await n.put(r,t)}catch{return!1}return await ie(r,n),!0}async function ie(e,t){try{let n=await t.keys();await Promise.all(n.filter(t=>t.startsWith(`buddhabrot:`)&&t!==e).map(e=>t.delete(e).catch(()=>{})))}catch{}}function M(e){return new Promise((t,n)=>{let r=e.open(O,1);r.onupgradeneeded=()=>{r.result.objectStoreNames.contains(k)||r.result.createObjectStore(k)},r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error),r.onblocked=()=>n(Error(`IndexedDB open blocked`))})}function ae(e){return{async get(t){let n=await M(e);try{return await new Promise((e,r)=>{let i=n.transaction(k,`readonly`).objectStore(k).get(t);i.onsuccess=()=>e(i.result??null),i.onerror=()=>r(i.error)})}finally{n.close()}},async put(t,n){let r=await M(e);try{await new Promise((e,i)=>{let a=r.transaction(k,`readwrite`);a.objectStore(k).put(n,t),a.oncomplete=()=>e(),a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{r.close()}},async keys(){let t=await M(e);try{return await new Promise((e,n)=>{let r=t.transaction(k,`readonly`).objectStore(k).getAllKeys();r.onsuccess=()=>e(r.result.map(String)),r.onerror=()=>n(r.error)})}finally{t.close()}},async delete(t){let n=await M(e);try{await new Promise((e,r)=>{let i=n.transaction(k,`readwrite`);i.objectStore(k).delete(t),i.oncomplete=()=>e(),i.onerror=()=>r(i.error),i.onabort=()=>r(i.error)})}finally{n.close()}}}}var oe=.29,se=2e6,ce=5400,N=4200;function le(e,t,n=Math.random){return{x:36+n()*Math.max(8,e-72),y:36+n()*Math.max(8,t-72)}}function P(e,t){let n=e-.25,r=n*n+t*t;if(r*(r+n)<=.25*t*t)return!0;let i=e+1;if(i*i+t*t<=.0625)return!0;let a=e+.125,o=Math.abs(t);return a*a+(o-.745)*(o-.745)<=.009}function ue(e=Math.random){for(let t=0;t<48;t++){let t=e(),n,r;if(t<.5)n=-2.2+e()*3.4,r=-1.5+e()*3;else if(t<.78){let t=e()*Math.PI*2,i=.5*(1-Math.cos(t))+.002+e()*.045;n=.25+i*Math.cos(t),r=i*Math.sin(t)}else n=-2+e()*1.4,r=(e()-.5)*.35;if(P(n,r))continue;let i=0,a=0,o=!1;for(let e=1;e<=8e3;e++){let t=i*i-a*a+n,s=2*i*a+r;if(i=t,a=s,i*i+a*a>4){e>=8&&(o=!0);break}}if(o)return{x:n,y:r}}return{x:-.75+(e()-.5)*.05,y:.18+(e()-.5)*.05}}var de={drawLines:!0,grayscale:!1,energy:.01,hiddenSteps:0,liveGain:1,contrast:.72,atlasGain:1},fe={drawLines:!1,grayscale:!0,energy:.28,hiddenSteps:1,liveGain:.12,contrast:1.22,atlasGain:1},pe=.12,F=.055;function me(e){return e===`intro`?{pondGain:0,throwGain:1,coneEnabled:!1}:e===`aiming`?{pondGain:pe,throwGain:0,coneEnabled:!0}:{pondGain:0,throwGain:1,coneEnabled:!1}}function he(e,t=18){let n=(e/Math.max(t,1e-5)%1+1)%1,r=n<.5?n*2:2-n*2,i=r*r*(3-2*r);return{zCamera:.07+i*.86,sliceHalf:F,zoom:1+i*.42}}var I=[1e4,25e3,5e4,1e5,25e4,5e5,1e6,2e6,5e6,1e7,2e7,5e7,1e8,2e8,5e8,1e9,2e9],L=.5;function ge(e){let t=Math.round((Number(e)||10)*10)/10;return Math.max(L,Math.min(18,t))}function _e(e,t,n,r){let i=Math.max(0,Math.min(1,e/Math.max(t,1)))**+r*Math.max(0,n-4);return Math.min(n,Math.max(4,Math.floor(4+i)))}var ve={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5};function ye(e,t=!1){return t?1:Math.min(Math.max(e,1),2)}function R(e,t,n){let r=ye(n);return{width:Math.max(1,Math.round(e*r)),height:Math.max(1,Math.round(t*r)),dpr:r}}var be=.8;function xe(e,t,n){return e.halfY*t/Math.max(n,1)}function Se(e,t,n){return n?{x:t,y:-e}:{x:e,y:t}}function Ce(e,t,n){return n?{dx:-t,dy:e}:{dx:e,dy:t}}function we(e,t,n,r,i,a=!1){let o=Ce((e/n*2-1)*xe(i,n,r),(1-t/r*2)*i.halfY,a);return{x:i.centerX+o.dx,y:i.centerY+o.dy}}function z(e,t,n,r,i,a=!1){let o=xe(i,n,r),s=Se(e-i.centerX,t-i.centerY,a);return{x:(s.x/o+1)*n*.5,y:(1-s.y/i.halfY)*r*.5}}function Te(e,t,n,r,i,a=!1){let o=Se(e-n.centerX,t-n.centerY,a);return{x:o.x/xe(n,r,i),y:o.y/n.halfY}}function Ee(e,t,n=be){return e*n/Math.max(t,1e-6)}function De(e,t,n,r,i,a,o=!1){let s=we(e,t,n,r,i,o);return z(s.x,s.y,n,r,a,o)}function Oe(e,t,n,r,i,a,o,s,c=!1){let l=De(e,t,i,a,o,s,c),u=De(e+n,t+r,i,a,o,s,c);return{x:u.x-l.x,y:u.y-l.y}}function ke(e,t,n,r){let i=xe(e,t,n),a=r?e.halfY:i,o=r?i:e.halfY;return{xMin:e.centerX-a,xMax:e.centerX+a,yMin:e.centerY-o,yMax:e.centerY+o}}var B=.035,V=2.4,Ae=-8,H=8,je=-Math.PI,Me=Math.PI;function Ne(e){return e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12).trim()||`YOU`}function Pe(e){return`${Ne(e)}'s`}function U(e,t,n){let r=Math.max(0,Math.min(1,(e-t)/(n-t)));return Math.round(r*65535)}function Fe(e,t,n){return t+e/65535*(n-t)}function W(e){let t=``;for(let n of e)t+=String.fromCharCode(n);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/g,``)}function Ie(e){if(!/^[A-Za-z0-9_-]+$/.test(e))return null;let t=e+`=`.repeat((4-e.length%4)%4);try{let e=atob(t.replace(/-/g,`+`).replace(/_/g,`/`));return Uint8Array.from(e,e=>e.charCodeAt(0))}catch{return null}}function G(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null}function Le(e){return!Number.isFinite(e.view.centerX)||!Number.isFinite(e.view.centerY)||!Number.isFinite(e.view.halfY)||!Number.isFinite(e.angle)||!Number.isFinite(e.power)||e.power<=0||e.power>1||e.skips<2||e.skips>15||e.skips!==Math.round(e.skips)||e.glyph<0||e.glyph>=7||e.glyph!==Math.round(e.glyph)||e.sourceDots<6||e.sourceDots>32||e.sourceDots!==Math.round(e.sourceDots)||e.view.halfY<.035||e.view.halfY>2.4?null:{version:1,view:e.view,rotateRight:e.rotateRight,angle:e.angle,power:e.power,skips:e.skips,glyph:e.glyph,seed:e.seed|0,sourceDots:e.sourceDots,name:Ne(e.name??`YOU`)}}function Re(e){let t=e.split(`_`);if(t.length!==11)return null;let n=G(t[0]),r=G(t[1]),i=G(t[2]),a=G(t[3]),o=G(t[4]),s=G(t[5]),c=G(t[6]),l=G(t[7]),u=G(t[8]),d=G(t[9]),f=G(t[10]);return n!==1||r==null||i==null||a==null||o==null||s==null||c==null||l==null||u==null||d==null||f==null||o!==0&&o!==1?null:Le({view:{centerX:r,centerY:i,halfY:a},rotateRight:o===1,angle:s,power:c,skips:l,glyph:u,seed:d,sourceDots:f})}function K(e){let t=Ie(e);if(!t||t.length<20)return null;let n=new DataView(t.buffer,t.byteOffset,t.byteLength);if(n.getUint8(0)!==2)return null;let r=n.getUint8(19);if(t.length!==20+r)return null;let i=new TextDecoder().decode(t.subarray(20,20+r));return Le({view:{centerX:Fe(n.getUint16(1),Ae,H),centerY:Fe(n.getUint16(3),Ae,H),halfY:Fe(n.getUint16(5),B,V)},rotateRight:(n.getUint8(11)&1)==1,angle:Fe(n.getUint16(7),je,Me),power:Fe(n.getUint16(9),0,1),skips:n.getUint8(12),glyph:n.getUint8(13),sourceDots:n.getUint8(14),seed:n.getInt32(15),name:i})}function q(e){let t=Ne(e.name),n=new TextEncoder().encode(t),r=new Uint8Array(20+n.length),i=new DataView(r.buffer);return i.setUint8(0,2),i.setUint16(1,U(e.view.centerX,Ae,H)),i.setUint16(3,U(e.view.centerY,Ae,H)),i.setUint16(5,U(e.view.halfY,B,V)),i.setUint16(7,U(e.angle,je,Me)),i.setUint16(9,U(e.power,0,1)),i.setUint8(11,+!!e.rotateRight),i.setUint8(12,e.skips),i.setUint8(13,e.glyph),i.setUint8(14,e.sourceDots),i.setInt32(15,e.seed|0),i.setUint8(19,n.length),r.set(n,20),W(r)}function ze(e){return e?e.includes(`_`)&&e.startsWith(`1_`)?Re(e):K(e):null}function J(e){let t=e.hash.startsWith(`#`)?e.hash.slice(1):e.hash,n=new URLSearchParams(t).get(`t`),r=new URLSearchParams(e.search).get(`t`),i=n??r;return i?ze(i):null}function Be(e,t){let n=new URL(e);return n.searchParams.delete(`t`),n.hash=`t=${q(t)}`,n.toString()}var Ve=7,He=[2,2,2,4,2,3,7],Ue=6,We=32,Ge=4096,Ke=4096,Y=I[I.length-1],X=.05,qe=.05,Je=8,Ye=10,Xe=50,Ze=[[80,214,255],[92,255,196],[186,255,120],[255,230,110],[255,168,92],[255,122,186],[196,146,255]].map(([e,t,n])=>`vec3f(${(e/255).toFixed(5)}, ${(t/255).toFixed(5)}, ${(n/255).toFixed(5)})`).join(`, `),Z={sourceDots:18,maxDepth:2e6,acceleration:10,linePersist:.6,previewOrbits:!1,previewIterations:20,skipColors:!0,coordinateAxes:!1,rotateRight:!0,doublePixels:!1},Qe=`mandelbrot-skipping:tuning:v5`,$e=10,et=.3,tt=.16,nt=4e5,rt=0,it=6,at=25e3,ot=at+Ge,Q=32,st=Q*Q/32,ct=(Q*Q-1)/12,lt=4,ut=2,$=`mandelbrot-skipping:scores:v2`,dt=`mandelbrot-skipping:scores:v1`,ft=Math.PI*2,pt={x:-.58,y:0},mt=.8,ht={x:-.55,y:0},gt=1.52,_t=1.6,vt=1.15,yt=[[0,2,3,5,7,9,10],[0,1,4,6,7,10],[0,2,4,6,8,10],[0,3,5,7,10],[0,1,5,7,8]],bt=`
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
        if (slot < ${nt}u) {
          vertices[slot] = OrbitPoint(z, depthColor, state.reserved.x);
        }
      }
      if (state.step > u32(params.hiddenSteps) + 1u && (inAtlas || all(abs(previousClip) <= vec2f(1.0))) && i >= firstLineStep) {
        let future = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + state.c;
        let incomingLength = length(clip - previousClip);
        let control1 = previousZ + (z - previousZ) / 3.0;
        let control2 = z - (future - z) / 3.0;
        if (incomingLength <= 0.12 && length(z - previousZ) <= 0.12) {
          let lineVertex = atomicAdd(&lineDrawArgs.vertexCount, ${it*2}u);
          let lineSlot = lineVertex / ${it*2}u;
          if (lineSlot < ${ot}u) {
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
    state.tinyHopStreak = select(0u, state.tinyHopStreak + 1u, hopPx <= ${u} && hopPx == hopPx);
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
`,xt=`
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
  let colors = array<vec3f, 7>(${Ze});
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
`,St=`
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
  let colors = array<vec3f, 7>(${Ze});
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
  let curveIndex = vertex / ${it*2}u;
  let localVertex = vertex % ${it*2}u;
  let subsegment = localVertex / 2u;
  let endpoint = localVertex % 2u;
  let t = f32(subsegment + endpoint) / f32(${it});
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
`,Ct=`
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(p[i], 0.0, 1.0);
  out.uv = p[i] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
`,wt=`
${Ct}
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
`,Tt=`
${Ct}
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
`;function Et(e){return Math.round(e).toLocaleString()}function Dt(e){let t=e.distinct;if(!t)return{area:0,coverage:0,spread:0,elongation:0,orientation:0,density:0,centroidX:0,centroidY:0};let n=e.sumX/t,r=e.sumY/t,i=Math.max(0,e.sumXX/t-n*n),a=Math.max(0,e.sumYY/t-r*r),o=e.sumXY/t-n*r,s=Math.max(0,i*a-o*o),c=Math.sqrt((i-a)**2+4*o*o),l=Math.max(0,(i+a+c)*.5),u=Math.max(0,(i+a-c)*.5),d=Math.min(1,Math.sqrt(s)/ct),f=Math.min(1,Math.log2(1+t)/Math.log2(1+Q*Q)),p=l>.001?Math.min(1,1-Math.sqrt(u/l)):0,m=.5*Math.atan2(2*o,i-a),h=Math.max(1,Math.min(Q*Q,4*Math.PI*Math.sqrt(s))),g=Math.min(1,t/h);return{area:d,coverage:f,spread:Math.sqrt(d),elongation:p,orientation:m,density:g,centroidX:n/(Q-1)*2-1,centroidY:r/(Q-1)*2-1}}function Ot(e,t){let n=Math.min(t,Y),r=Dt(e),i=n*.03+Math.sqrt(n)*75,a=8e4*r.coverage,o=12e4*r.spread*Math.min(1,e.distinct/24);return Math.round((i+a+o)*(1+(e.skip-1)*.12))}function kt(e){let t=e|0;return()=>(t^=t<<13,t^=t>>>17,t^=t<<5,(t>>>0)/4294967296)}function At(e){return e>=1e9?`${e/1e9}B`:e>=1e6?`${e/1e6}M`:e>=1e3?`${e/1e3}K`:String(e)}function jt(e,t){let n=Math.max(0,Math.min(.05,e));return t<=0?0:n===0?1:X**+(n/t)}function Mt(e){let t=Math.round(Number(e?.sourceDots)),n=t>=Ue?Math.min(We,t):Z.sourceDots,r=Number(e?.maxDepth),i=I.includes(r)?r:Z.maxDepth,a=ge(e?.acceleration??10),o=Math.max(qe,Math.min(Je,Math.round((Number(e?.linePersist)||Z.linePersist)*20)/20)),s=e?.previewOrbits===!0,c=e?.skipColors!==!1,l=e?.coordinateAxes===!0,u=e?.rotateRight!==!1,d=e?.doublePixels===!0,f=Math.round(Number(e?.previewIterations)||Z.previewIterations);return{sourceDots:n,maxDepth:i,acceleration:a,linePersist:o,previewOrbits:s,previewIterations:Math.max(Ye,Math.min(Xe,f)),skipColors:c,coordinateAxes:l,rotateRight:u,doublePixels:d}}function Nt(){try{return Mt(JSON.parse(localStorage.getItem(Qe)||`null`))}catch{return Z}}function Pt(e){try{localStorage.setItem(Qe,JSON.stringify(e))}catch{}}function Ft(e,t){let n=(t%1+1)%1*e.length,r=Math.floor(n)%e.length,i=n-Math.floor(n),a=e[r],o=e[(r+1)%e.length];return{x:a.x+(o.x-a.x)*i,y:a.y+(o.y-a.y)*i}}function It(e,t=-Math.PI/2){return Array.from({length:e},(n,r)=>({x:Math.cos(t+r*ft/e),y:Math.sin(t+r*ft/e)}))}function Lt(e,t,n){let r=(e,t,r)=>({x:e+Math.cos(n*ft-Math.PI/2)*r,y:t+Math.sin(n*ft-Math.PI/2)*r});switch(e%Ve){case 0:return r(0,0,t===0?1:.46);case 1:return t===0?Ft(It(3),n):r(0,0,.48);case 2:return r(t===0?-.32:.32,0,.68);case 3:{let e=t*Math.PI/2;return r(Math.cos(e)*.43,Math.sin(e)*.43,.52)}case 4:{if(t===1)return r(0,0,.34);let e=It(5);return Ft([e[0],e[2],e[4],e[1],e[3]],n)}case 5:return t<2?Ft(It(3,-Math.PI/2+t*Math.PI),n):r(0,0,.34);default:{if(t===0)return r(0,0,.42);let e=(t-1)*ft/6-Math.PI/2;return r(Math.cos(e)*.42,Math.sin(e)*.42,.42)}}}function Rt(e,t,n,r,i,a,o,s){let c=[],l=He[o%He.length];for(let u=0;u<a;u++){let d=u%l,f=Math.floor(u/l),p=Math.ceil((a-d)/l),m=Lt(o,d,f/Math.max(p,1)),h=we(e+m.x*$e,t+m.y*$e,n,r,i,s);c.push({x:Math.fround(h.x),y:Math.fround(h.y)})}return c}function zt(){try{let e=JSON.parse(localStorage.getItem($)||`null`),t=(e,t=!1)=>e.flatMap(e=>{if(!e||typeof e!=`object`)return[];let n=e;return typeof n.id==`string`&&typeof n.name==`string`&&n.name.length<=12&&Number.isFinite(n.score)&&Number.isFinite(n.deepest)&&Number.isFinite(n.skips)&&typeof n.createdAt==`string`?[{id:n.id,name:n.name,score:t?Math.round(n.score/100):n.score,deepest:n.deepest,skips:n.skips,coverage:Number.isFinite(n.coverage)?n.coverage:0,spread:Number.isFinite(n.spread)?n.spread:0,createdAt:n.createdAt}]:[]}).slice(0,10);if(e?.version===2&&Array.isArray(e.entries))return t(e.entries);let n=JSON.parse(localStorage.getItem(dt)||`null`);if(n?.version!==1||!Array.isArray(n.entries))return[];let r=t(n.entries,!0);return Bt(r),r}catch{return[]}}function Bt(e){try{localStorage.setItem($,JSON.stringify({version:2,entries:e}))}catch{}}async function Vt(e,t,n=!1){let r=t.device,i=e.getContext(`webgpu`),a=t.preferredFormat;i.configure({device:r,format:a,alphaMode:`opaque`});let o=globalThis.GPUBufferUsage,s=globalThis.GPUTextureUsage,c=r.createBuffer({size:nt*16,usage:o.STORAGE|o.VERTEX}),l=r.createBuffer({size:ot*48,usage:o.STORAGE}),u=r.createBuffer({size:Ge*48,usage:o.STORAGE|o.COPY_DST}),d=r.createBuffer({size:16,usage:o.STORAGE|o.COPY_DST|o.INDIRECT}),f=r.createBuffer({size:16,usage:o.STORAGE|o.COPY_DST|o.INDIRECT}),p=r.createBuffer({size:80,usage:o.UNIFORM|o.COPY_DST}),g=r.createBuffer({size:80,usage:o.UNIFORM|o.COPY_DST}),_=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),v=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),y=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),b=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),x=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),S=r.createBuffer({size:128,usage:o.UNIFORM|o.COPY_DST}),C=r.createSampler({magFilter:`nearest`,minFilter:`nearest`}),w=r.createShaderModule({code:bt}),T=r.createShaderModule({code:xt}),ee=r.createShaderModule({code:St}),E=r.createShaderModule({code:wt}),D=r.createShaderModule({code:Tt}),te=r.createComputePipeline({layout:`auto`,compute:{module:w,entryPoint:`main`}}),O=r.createRenderPipeline({layout:`auto`,vertex:{module:T,entryPoint:`vs`,buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:`float32x2`},{shaderLocation:1,offset:8,format:`float32`},{shaderLocation:2,offset:12,format:`float32`}]}]},fragment:{module:T,entryPoint:`fs`,targets:[{format:`rgba16float`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`point-list`}}),k=r.createRenderPipeline({layout:`auto`,vertex:{module:ee,entryPoint:`vs`},fragment:{module:ee,entryPoint:`fs`,targets:[{format:`rgba8unorm`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`max`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`line-list`}}),A=r.createRenderPipeline({layout:`auto`,vertex:{module:E,entryPoint:`vs`},fragment:{module:E,entryPoint:`fadeFs`,targets:[{format:`rgba16float`}]},primitive:{topology:`triangle-list`}}),j=r.createRenderPipeline({layout:`auto`,vertex:{module:E,entryPoint:`vs`},fragment:{module:E,entryPoint:`fadeFs`,targets:[{format:`rgba8unorm`}]},primitive:{topology:`triangle-list`}}),ne=r.createRenderPipeline({layout:`auto`,vertex:{module:D,entryPoint:`vs`},fragment:{module:D,entryPoint:`displayFs`,targets:[{format:a}]},primitive:{topology:`triangle-list`}}),re=r.createBindGroup({layout:te.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:d}},{binding:4,resource:{buffer:l}},{binding:5,resource:{buffer:f}}]}),ie=r.createBindGroup({layout:O.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:y}}]}),M=r.createBindGroup({layout:O.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:y}}]}),ae=r.createBindGroup({layout:O.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:v}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:y}}]}),se=r.createBindGroup({layout:k.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:_}},{binding:2,resource:{buffer:p}}]}),ce=r.createBindGroup({layout:k.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:_}},{binding:2,resource:{buffer:g}}]}),N=0,le=0,P=0,ue=!1,fe=!1,pe=!1,F=[],I=[],L=[],ge=null,_e=null,be=[],xe=[],Se=[],Ce=[],we=0,z=0,Te=0,Ee=0,De=1,Oe=1,B={centerX:ht.x,centerY:ht.y,halfY:gt},V=Z.maxDepth,Ae=Z.acceleration,H=Z.linePersist,je=Z.skipColors,Me=Z.rotateRight,Ne=n,Pe=de.drawLines,U=de.grayscale,Fe=de.energy,W=de.hiddenSteps,Ie=de.liveGain,G=de.contrast,Le=me(`intro`),Re=Le.pondGain,K=Le.throwGain,q=null,ze=!1,J=`pond`,Be={...ve},Ve={...ve},He=0,Ue=e=>r.createTexture({size:[Te,Ee],format:e,usage:s.RENDER_ATTACHMENT|s.TEXTURE_BINDING});function We(e,t){for(let n of t)n&&e.beginRenderPass({colorAttachments:[{view:n.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end()}function Ke(e,t,n){return e.map(e=>r.createBindGroup({layout:n.getBindGroupLayout(0),entries:[{binding:0,resource:e.createView()},{binding:1,resource:C},{binding:2,resource:{buffer:t}}]}))}function Y(){Ce=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++)Ce[e*2+t]=r.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:F[e].createView()},{binding:1,resource:I[t].createView()},{binding:2,resource:L[t].createView()},{binding:3,resource:ge.createView()},{binding:4,resource:_e.createView()},{binding:5,resource:C},{binding:6,resource:{buffer:S}}]})}function X(e,t){let n=J===`pond`?Be:Ve,i=new ArrayBuffer(80),a=new Uint32Array(i),o=new Float32Array(i);a[0]=N,a[1]=Math.max(1,Math.floor(nt/Math.max(N,1))),a[2]=V,a[3]=Pe?Math.max(1,Math.floor(at/Math.max(N,1))):0,o[4]=B.centerX,o[5]=B.centerY,o[6]=B.halfY*Te/Math.max(Ee,1),o[7]=B.halfY,o[8]=Te,o[9]=Ee,o[10]=+!!Me,o[11]=Ae,o[12]=t,o[13]=W,o[16]=n.xMin,o[17]=n.xMax,o[18]=n.yMin,o[19]=n.yMax,r.queue.writeBuffer(e,0,i)}function qe(){let t=e.getBoundingClientRect(),n=R(t.width,t.height,ye(globalThis.devicePixelRatio||1,Ne));if(De=Math.max(1,t.width),Oe=Math.max(1,t.height),F.length&&n.width===Te&&n.height===Ee)return;Te=n.width,Ee=n.height,e.width=Te,e.height=Ee;for(let e of[...F,...I,...L,ge,_e])e?.destroy();F=[0,1].map(()=>Ue(`rgba16float`)),I=[0,1].map(()=>Ue(`rgba16float`)),L=[0,1].map(()=>Ue(`rgba8unorm`)),ge=Ue(`rgba16float`),_e=Ue(`rgba8unorm`),be=Ke(F,b,A),xe=Ke(I,b,A),Se=Ke(L,x,j),Y();let i=r.createCommandEncoder({label:`orbit-resize`});We(i,F),We(i,I),We(i,L),We(i,[ge,_e]),r.queue.submit([i.finish()]),we=0,z=0}let Je=new ResizeObserver(qe);Je.observe(e),qe();function Ye(){ue||P||(P=requestAnimationFrame(Xe))}function Xe(){if(P=0,ue||t.hasFailed()||!F.length||pe)return;let e=performance.now(),n=He?(e-He)/1e3:1/60;He=e;let a=jt(n,H);X(p,0),X(g,1);let o=ze?he(e/1e3):{zCamera:0,sliceHalf:1,zoom:1};r.queue.writeBuffer(_,0,new Float32Array([Fe,+!!U,+!!je,0])),r.queue.writeBuffer(v,0,new Float32Array([Math.min(1.2,Fe*4.2),0,0,1])),r.queue.writeBuffer(y,0,new Float32Array([o.zCamera,o.sliceHalf,o.zoom,0])),r.queue.writeBuffer(d,0,new Uint32Array([0,1,0,0])),r.queue.writeBuffer(f,0,new Uint32Array([0,1,0,0]));let s=ze?.965**(n*60):1;r.queue.writeBuffer(b,0,new Float32Array([s,0,0,0])),r.queue.writeBuffer(x,0,new Float32Array([a,0,0,0]));let l=new Float32Array(32);l[0]=B.centerX,l[1]=B.centerY,l[2]=B.halfY*Te/Math.max(Ee,1),l[3]=B.halfY,l[4]=+!!Me,l[5]=+!!Pe,l[6]=ze?0:Ie,l[7]=G,l[8]=Be.xMin,l[9]=Be.xMax,l[10]=Be.yMin,l[11]=Be.yMax,l[12]=Ve.xMin,l[13]=Ve.xMax,l[14]=Ve.yMin,l[15]=Ve.yMax,l[16]=Re,l[17]=K,l[18]=+!!q,l[19]=oe,l[20]=q?.apexX??0,l[21]=q?.apexY??0,l[22]=q?.directionX??0,l[23]=q?.directionY??0,l[24]=q?.range??0,l[25]=.04,l[26]=De,l[27]=Oe,r.queue.writeBuffer(S,0,l);let u=r.createCommandEncoder({label:`orbit-draw`});if(N>0&&!fe){let e=u.beginComputePass();e.setPipeline(te),e.setBindGroup(0,re),e.dispatchWorkgroups(Math.ceil(N/64)),e.end()}let m=F[1-we],h=I[1-z],C=L[1-z];if(J===`pond`){let e=u.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});if(e.setPipeline(A),e.setBindGroup(0,be[we]),e.draw(3),e.end(),ze){let e=u.beginRenderPass({colorAttachments:[{view:h.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(A),e.setBindGroup(0,xe[z]),e.draw(3),e.end()}}else{let e=u.beginRenderPass({colorAttachments:[{view:h.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(A),e.setBindGroup(0,xe[z]),e.draw(3),e.end();let t=u.beginRenderPass({colorAttachments:[{view:C.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});t.setPipeline(j),t.setBindGroup(0,Se[z]),t.draw(3),t.end()}if(u.beginRenderPass({colorAttachments:[{view:ge.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),u.beginRenderPass({colorAttachments:[{view:_e.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),N>0&&!fe){let e=J===`pond`?m:h,t=u.beginRenderPass({colorAttachments:[{view:e.createView(),loadOp:`load`,storeOp:`store`}]});if(t.setPipeline(O),t.setBindGroup(0,M),t.setVertexBuffer(0,c),t.drawIndirect(d,0),t.end(),ze&&J===`pond`){let e=u.beginRenderPass({colorAttachments:[{view:h.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(O),e.setBindGroup(0,ae),e.setVertexBuffer(0,c),e.drawIndirect(d,0),e.end()}let n=u.beginRenderPass({colorAttachments:[{view:ge.createView(),loadOp:`load`,storeOp:`store`}]});n.setPipeline(O),n.setBindGroup(0,ie),n.setVertexBuffer(0,c),n.drawIndirect(d,0),n.end();let r=u.beginRenderPass({colorAttachments:[{view:_e.createView(),loadOp:`load`,storeOp:`store`}]});if(r.setPipeline(k),r.setBindGroup(0,se),r.drawIndirect(f,0),r.end(),J===`throw`&&Pe){let e=u.beginRenderPass({colorAttachments:[{view:C.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(k),e.setBindGroup(0,ce),e.drawIndirect(f,0),e.end()}}J===`pond`?(we=1-we,ze&&(z=1-z)):z=1-z;let w=u.beginRenderPass({colorAttachments:[{view:i.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:1}}]});w.setPipeline(ne),w.setBindGroup(0,Ce[we*2+z]),w.draw(3),w.end(),r.queue.submit([u.finish()]),Ye()}return Ye(),{spawn(e,t,n=Ge){fe=!1;let i=new Float32Array(e.length*12),a=new Uint32Array(i.buffer);e.forEach((e,n)=>{let r=n*12;i[r+2]=e.x,i[r+3]=e.y,i[r+4]=t,a[r+7]=1});let o=m(le,N,e.length,n);r.queue.writeBuffer(u,o.start*48,i.buffer,i.byteOffset,i.byteLength),le=o.nextSource,N=o.sourceCount},spawnAppend(e,t,n=Ge){fe=!1;let i=h(N,e.length,n);if(i.added<=0)return this.spawn(e,t,n),e.length;let a=e.slice(0,i.added),o=new Float32Array(a.length*12),s=new Uint32Array(o.buffer);return a.forEach((e,n)=>{let r=n*12;o[r+2]=e.x,o[r+3]=e.y,o[r+4]=t,s[r+7]=1}),r.queue.writeBuffer(u,i.start*48,o.buffer,o.byteOffset,o.byteLength),le=i.nextSource,N=i.sourceCount,i.added},setView(e){B={...e}},setTuning(e){V=e.maxDepth,Ae=e.acceleration,H=e.linePersist,je=e.skipColors===!0,Me=e.rotateRight===!0;let t=e.doublePixels===!0;t!==Ne&&(Ne=t,qe())},setAtmosphere(e){Pe=e.drawLines,U=e.grayscale,Fe=e.energy,W=e.hiddenSteps,Ie=e.liveGain,G=e.contrast},setLayer(e){J=e},setDisplay(e){Re=e.pondGain,K=e.throwGain,q=e.cone,De=e.cssWidth,Oe=e.cssHeight,ze=e.mri===!0},beginThrow(e,t,n,r){B={...e},Ve=ke(e,t,n,r),J=`throw`,this.clear()},clearPond(){if(!F.length)return;let e=r.createCommandEncoder({label:`orbit-clear-pond`});We(e,F),r.queue.submit([e.finish()])},clear(){if(fe=!1,N=0,le=0,r.queue.writeBuffer(u,0,new Uint8Array(Ge*48)),!I.length)return;let e=r.createCommandEncoder({label:`orbit-clear-throw`});We(e,I),We(e,L),We(e,[ge,_e].filter(Boolean)),r.queue.submit([e.finish()])},freeze(){fe=!0},setSuspended(e){pe=e,e||Ye()},destroy(){ue=!0,cancelAnimationFrame(P),Je.disconnect(),F.forEach(e=>e.destroy()),I.forEach(e=>e.destroy()),L.forEach(e=>e.destroy()),ge?.destroy(),_e?.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),g.destroy(),_.destroy(),v.destroy(),y.destroy(),b.destroy(),x.destroy(),S.destroy()}}}function Ht(){let e=(0,r.useRef)(null),t=(0,r.useRef)(null),n=(0,r.useRef)(null),a=(0,r.useRef)(null),s=(0,r.useRef)({centerX:ht.x,centerY:ht.y,halfY:gt}),u=(0,r.useRef)(()=>{}),f=(0,r.useRef)(()=>{}),m=(0,r.useRef)(`YOU`),h=(0,r.useRef)({...Z}),g=(0,r.useRef)(()=>{}),_=(0,r.useRef)(()=>{}),v=(0,r.useRef)(!1),y=(0,r.useRef)(0),b=(0,r.useRef)(!1),x=(0,r.useRef)(()=>{}),S=(0,r.useRef)(null),C=(0,r.useRef)(void 0),w=(0,r.useRef)(null),T=(0,r.useRef)(!1),ee=(0,r.useRef)(null),E=(0,r.useRef)(()=>{}),[D,O]=(0,r.useState)(null),[k,j]=(0,r.useState)(!1),[ie,M]=(0,r.useState)(!1),[P,pe]=(0,r.useState)(!1),[F,he]=(0,r.useState)(!1),[ge,ye]=(0,r.useState)(!1),[R,be]=(0,r.useState)(`YOU`),[xe,Se]=(0,r.useState)(``),[Ce,B]=(0,r.useState)(null),[V,Ae]=(0,r.useState)({phase:`ready`,score:0,skips:0,deepest:0,progress:0,coverage:0,spread:0}),[H,je]=(0,r.useState)([]),[Me,Ne]=(0,r.useState)(`YOU`),[U,Fe]=(0,r.useState)(null),[W,Ie]=(0,r.useState)({...Z});(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>je(zt()));return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>{let e=Nt();h.current=e,Ie(e),n.current?.setTuning(e)});return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let t=e.current;if(!t)return;let r=!1,o=i(B);return a.current=o,o.then(async e=>{if(!e)return;if(r){e.destroy();return}let i=await Vt(t,e,v.current);if(r){i?.destroy();return}n.current=i,i?.setView(s.current),v.current?(i?.setTuning({...h.current,maxDepth:se,doublePixels:!0}),i?.setAtmosphere(fe),i?.setLayer(`pond`),i?.setDisplay({...me(`intro`),cone:null,cssWidth:1,cssHeight:1,mri:!0})):(i?.setTuning(h.current),i?.setAtmosphere(de),i?.setLayer(`throw`),i?.setDisplay({...me(`play`),cone:null,cssWidth:1,cssHeight:1}))}).catch(()=>B(`Orbit renderer could not start. Throwing remains playable.`)),()=>{r=!0,n.current?.destroy(),n.current=null,a.current=null,o.then(e=>e?.destroy()).catch(()=>{})}},[]),(0,r.useEffect)(()=>{let e=J(window.location),t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;M(!0),!(e||t)&&(v.current=!0,T.current=!0,y.current=0,b.current=!1,O({progress:0}))},[]);let G=(0,r.useCallback)(()=>{b.current||(b.current=!0,j(!0),window.setTimeout(()=>{v.current=!1,T.current=!1,y.current=0,b.current=!1,n.current?.setAtmosphere(de),n.current?.setLayer(`throw`),n.current?.setDisplay({...me(`play`),cone:null,cssWidth:1,cssHeight:1}),n.current?.setTuning(h.current),f.current({centerX:pt.x,centerY:pt.y,halfY:mt}),u.current(),O(null),j(!1)},600))},[]);x.current=G;let Le=(0,r.useCallback)(()=>{v.current||(v.current=!0,T.current=!0,y.current=0,b.current=!1,n.current?.clearPond(),n.current?.clear(),n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:se,doublePixels:!0}),n.current?.setAtmosphere(fe),n.current?.setDisplay({...me(`intro`),cone:null,cssWidth:1,cssHeight:1,mri:!0}),f.current({centerX:ht.x,centerY:ht.y,halfY:gt}),u.current(),j(!1),O({progress:0}))},[]);(0,r.useEffect)(()=>{if(!ie||D)return;C.current===void 0&&(C.current=J(window.location));let e=C.current;if(!e)return;let t=0,n=()=>{if(C.current===e){if(!w.current){t=window.setTimeout(n,50);return}C.current=null,w.current(e,!0)}};return t=window.setTimeout(n,400),()=>window.clearTimeout(t)},[ie,D]);let Re=(0,r.useCallback)(e=>{let t=e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12);m.current=t,Ne(t),S.current&&={...S.current,name:t||`YOU`},be(t||`YOU`);let n=U;n&&je(e=>{let r=e.map(e=>e.id===n?{...e,name:t||`YOU`}:e);return Bt(r),r})},[U]),K=(0,r.useCallback)(e=>{let t=Mt({...h.current,...e});h.current=t,Ie(t),Pt(t),n.current?.setTuning(t),_.current(),g.current()},[]);(0,r.useEffect)(()=>{let e=t.current;if(!e)return;let r=e.getContext(`2d`);if(!r)return;let i=1,o=1,c=1,l=0,x=performance.now(),C=0,D=`ready`,k=-1,j=`none`,ie={x:0,y:0},M={...s.current},P={x:0,y:0},F=0,I=0,L=0,ge=0,R={x:0,y:0,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},xe=2,Se=[],Ce=[],B=[],V=null,H=null,Me=0,Ne=0,Pe=0,U=0,W=0,G=new Map,Le=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,Re=document.createElement(`canvas`),K=Re.getContext(`2d`),q=!0,ze=document.createElement(`canvas`),J=ze.getContext(`2d`),Ge=document.createElement(`canvas`),Y=Ge.getContext(`2d`),X=!0,qe=null,Je=[],Ye=[],Xe=0,Ze=0,Z=0,Qe=!1,$e=0,it=``;g.current=()=>{X=!0},_.current=()=>{q=!0};let at=!1;(async()=>{try{let e=A(window),t=ae(indexedDB),n=await ne(e,t);if(n){if(at)return;qe=await createImageBitmap(n),X=!0;return}let r=await a.current;if(!r||at)return;let i=te(r,{size:e});if(await new Promise(e=>{let t=()=>{if(at){i.destroy(),e();return}if(i.step(1/60),i.isComplete()){e();return}requestAnimationFrame(t)};requestAnimationFrame(t)}),at){i.destroy();return}let{bitmap:o,blobPromise:s}=await i.toBitmapAndBlob();if(i.destroy(),at){o.close();return}qe=o,X=!0;let c=await s;c&&!at&&await re(e,c,t)}catch{}})();function ot(){return{x:i*.5,y:o*.82}}function ct(){return Math.min(i,o)}function $(){return Ee(ct(),s.current.halfY)}function dt(){let t=e.getBoundingClientRect();if(i=Math.max(1,t.width),o=Math.max(1,t.height),c=Math.min(window.devicePixelRatio||1,2),e.width=Math.round(i*c),e.height=Math.round(o*c),r.setTransform(c,0,0,c,0,0),Re.width=Math.round(i*c),Re.height=Math.round(o*c),K?.setTransform(c,0,0,c,0,0),q=!0,ze.width=Math.round(i*c),ze.height=Math.round(o*c),J?.setTransform(c,0,0,c,0,0),X=!0,Ge.width=Math.round(i*c),Ge.height=Math.round(o*c),Y?.setTransform(c,0,0,c,0,0),it=``,D===`ready`||D===`aiming`||D===`result`){let e=ot();R.x=e.x,R.y=e.y,D!==`aiming`&&(P={...e})}}function mt(){return V||=new AudioContext,V.state===`suspended`&&V.resume(),V}function ht(e,t=.08,n=.05){try{let r=mt(),i=r.createOscillator(),a=r.createGain();i.type=`triangle`,i.frequency.value=e,a.gain.setValueAtTime(n,r.currentTime),a.gain.exponentialRampToValueAtTime(1e-4,r.currentTime+t),i.connect(a).connect(r.destination),i.start(),i.stop(r.currentTime+t)}catch{}}function gt(){if(H)return H;let e=mt(),t=e.createOscillator(),n=e.createOscillator(),r=e.createOscillator(),i=e.createOscillator(),a=e.createOscillator(),o=e.createOscillator(),s=e.createGain(),c=e.createGain(),l=e.createGain(),u=e.createGain(),d=e.createGain(),f=e.createGain(),p=e.createBiquadFilter(),m=e.createGain(),h=e.createWaveShaper(),g=e.createDelay(.4),_=e.createGain(),v=e.createGain(),y=e.createGain(),b=e.createStereoPanner(),x=e.createGain(),S=e.createDynamicsCompressor(),C=e.createGain(),w=e.createGain(),T=e.createBiquadFilter(),ee=e.createGain(),E=e.createBufferSource(),D=Array.from({length:15},(t,n)=>{let r=e.createOscillator(),i=e.createGain(),a=e.createStereoPanner();return r.type=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`][n%Ve],r.frequency.value=110,i.gain.value=1e-4,r.connect(i).connect(a).connect(p),{oscillator:r,gain:i,pan:a}}),te=e.createBuffer(1,Math.round(e.sampleRate*.75),e.sampleRate),O=te.getChannelData(0),k=5370206;for(let e=0;e<O.length;e++)k^=k<<13,k^=k>>>17,k^=k<<5,O[e]=((k>>>0)/2147483648-1)*.55;E.buffer=te,E.loop=!0,t.type=`sine`,n.type=`triangle`,r.type=`sawtooth`,i.type=`sine`,a.type=`sine`,o.type=`sine`,s.gain.value=.42,c.gain.value=.16,l.gain.value=.02,u.gain.value=.08,a.frequency.value=1.5,d.gain.value=12,f.gain.value=1e-4,C.gain.value=1e-4,w.gain.value=1e-4,T.type=`bandpass`,T.frequency.value=900,T.Q.value=5,ee.gain.value=.2,p.type=`lowpass`,p.frequency.value=420,p.Q.value=2.2,m.gain.value=1;let A=new Float32Array(1024);for(let e=0;e<A.length;e++){let t=e/(A.length-1)*2-1;A[e]=Math.tanh(t*2.35)/Math.tanh(2.35)}return h.curve=A,h.oversample=`2x`,x.gain.value=1e-4,S.threshold.value=-27,S.knee.value=18,S.ratio.value=5,g.delayTime.value=.08,_.gain.value=.1,v.gain.value=.08,y.gain.value=.9,a.connect(d),d.connect(t.detune),d.connect(n.detune),d.connect(r.detune),t.connect(s).connect(p),n.connect(c).connect(p),r.connect(l).connect(p),i.connect(u).connect(p),o.connect(f).connect(p),E.connect(C).connect(T),E.connect(w).connect(T),T.connect(ee).connect(b),ee.connect(g),p.connect(m).connect(h),h.connect(y).connect(b),h.connect(g),g.connect(_).connect(g),g.connect(v).connect(b),b.connect(x).connect(S).connect(e.destination),t.start(),n.start(),r.start(),i.start(),a.start(),o.start(),E.start(),D.forEach(e=>e.oscillator.start()),H={carrier:t,overtone:n,sideband:r,sub:i,modulator:a,pulse:o,carrierGain:s,overtoneGain:c,sidebandGain:l,subGain:u,modGain:d,pulseGain:f,noise:E,noiseGain:C,noiseBurstGain:w,noiseFilter:T,resonatorGain:ee,filter:p,drive:m,delay:g,feedback:_,wet:v,dry:y,gain:x,pan:b,shapeVoices:D},H}function bt(e){if(!V)return;if(!((D===`flying`||D===`resolving`)&&B.length>0)){H&&H.gain.gain.setTargetAtTime(1e-4,V.currentTime,.08);return}if(e-Me<42)return;Me=e;let t=gt(),n=V,r=B.reduce((e,t)=>e+ +!t.resolved,0)/B.length,i=B.reduce((e,t)=>Math.max(e,t.shownDepth),0),a=Math.log2(i+1),o=B.map(Dt),s=Array.from(new Set(B.map(e=>e.skip))).sort((e,t)=>e-t).map(e=>{let t=B.flatMap((t,n)=>t.skip===e?[n]:[]),n=t.map(e=>o[e]),r=e=>n.reduce((t,n)=>t+n[e],0)/Math.max(1,n.length),i=n.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/Math.max(1,n.length),a=n.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/Math.max(1,n.length),s=t.reduce((e,t)=>e+B[t].distinct,0),c=G.get(e)||0,l=Math.max(0,s-c);return G.set(e,s),{skip:e,glyph:B[t[0]].glyph,area:r(`area`),spread:r(`spread`),elongation:r(`elongation`),density:r(`density`),centroidX:r(`centroidX`),centroidY:r(`centroidY`),orientation:.5*Math.atan2(i,a),coverage:s,presence:Math.min(1,Math.log2(s+1)/10),activity:Math.min(1,Math.log2(l+1)/5),deepest:t.reduce((e,t)=>Math.max(e,B[t].shownDepth),0)}}),c=s.filter(e=>e.coverage>0).length/15,l=s.reduce((e,t)=>t.activity>e.activity?t:e,s[0]),u=l?.activity||0,d=e=>o.reduce((t,n)=>t+n[e],0)/o.length,f=(e,t)=>o.reduce((n,r)=>n+(r[e]-t)**2,0)/o.length,p=d(`area`),m=d(`spread`),h=d(`elongation`),g=d(`density`),_=d(`centroidX`),v=d(`centroidY`),y=Math.min(1,Math.sqrt(o.reduce((e,t)=>e+(t.centroidX-_)**2+(t.centroidY-v)**2,0)/o.length*.5)),b=Math.min(1,Math.sqrt(f(`spread`,m)+f(`elongation`,h)+f(`density`,g))),x=o.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/o.length,S=o.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/o.length,C=.5*Math.atan2(x,S),w=Math.min(1,Math.hypot(x,S)),T=B.reduce((e,t)=>e+t.distinct,0),ee=Math.min(1,T/Math.max(1,B.length*96)),E=B.reduce((e,t)=>e+Math.min(1,Math.hypot(t.zr,t.zi)/2),0)/B.length,te=Math.min(1,B.length/Math.max(1,R.skips*We)),O=o[B.reduce((e,t,n)=>t.distinct*(.35+o[n].spread)*(.6+o[n].density)>B[e].distinct*(.35+o[e].spread)*(.6+o[e].density)?n:e,0)],k=Math.min(1,(1-O.elongation)*.58+w*.42),A=Math.min(1,b*1.7+(1-g)*.24+E*.28),j=Math.max(0,T-U),ne=Math.min(1,Math.log2(j+1)/4.5);U=T;let re=B.filter(e=>Number.isFinite(e.stepDistance)&&e.stepDistance>0).map(e=>({proximity:Math.max(0,Math.min(1,(-Math.log2(Math.max(e.stepDistance,1e-12))-.25)/15)),contraction:Math.max(0,Math.min(1,e.distanceContraction/1.5))})),ie=e=>e.length?(e.sort((e,t)=>e-t),e[Math.min(e.length-1,Math.floor(e.length*.8))]):0,M=ie(re.map(e=>e.proximity)),ae=ie(re.map(e=>e.contraction)),oe=2**((M*14+ae*3)/12),se=B[0],ce=Math.abs(Math.round((se.cr+2.2)*137+(se.ci+1.5)*211)),N=yt[ce%yt.length],le=34+ce*7%12,P=e=>{let t=Math.round(e),n=(t%N.length+N.length)%N.length,r=Math.floor(t/N.length);return 440*2**((le+N[n]+r*12-69)/12)},ue=a*.2+O.spread*3.7+O.elongation*2.8+(O.orientation/Math.PI+.5)*2.4+O.centroidY*1.6,de=1+Math.round(y*4+b*3+c*2),fe=Math.min(900,P(ue)*oe),pe=Math.min(1900,P(ue+2+Math.round(k*2))*oe),F=Math.min(2400,P(ue+de+3)*oe),me=Math.min(7600,150+p*2700+g*1500+a*48+A*1500+M*1800),he=Math.min(.045,.007+r*.01+m*.007+ee*.006+te*.003+ne*.004+c*.006+u*.004),I=Math.max(-.76,Math.min(.76,_*.52+Math.sin(e*.001*(.22+y*1.7)+C)*y*.34)),L=n.currentTime,ge=[0,2,1,3,4,5,6],_e=e=>Math.log2(e.deepest+1)*.16+ge[e.glyph]+e.spread*3.2+e.elongation*2.4+(e.orientation/Math.PI+.5)*2+e.centroidY*1.4;t.shapeVoices.forEach((e,t)=>{let n=s.find(e=>e.skip===t+1);if(!n||n.coverage===0){e.gain.gain.setTargetAtTime(1e-4,L,.08);return}let r=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`];e.oscillator.type=r[n.glyph],e.oscillator.frequency.setTargetAtTime(Math.min(1800,P(_e(n))*oe),L,.065),e.gain.gain.setTargetAtTime(.002+n.presence*.028+n.activity*.07+c*.004,L,.045),e.pan.pan.setTargetAtTime(Math.max(-.88,Math.min(.88,n.centroidX*.72+Math.sin(n.orientation)*.15)),L,.07)}),t.carrier.frequency.setTargetAtTime(fe,L,.055),t.overtone.frequency.setTargetAtTime(pe,L,.075),t.sideband.frequency.setTargetAtTime(F,L,.085),t.sub.frequency.setTargetAtTime(Math.max(28,fe*.5),L,.1),t.carrierGain.gain.setTargetAtTime(.16+k*.36,L,.1),t.overtoneGain.gain.setTargetAtTime(.035+g*.25+w*.08,L,.1),t.sidebandGain.gain.setTargetAtTime(.008+O.elongation*.13+A*.075,L,.1),t.subGain.gain.setTargetAtTime(.025+p*.16+k*.035,L,.12),t.modulator.frequency.setTargetAtTime(.18+g*3.6+y*4.2+r+ae*2.4,L,.12),t.modGain.gain.setTargetAtTime(2+A*74+b*46+ae*18,L,.11),t.filter.frequency.setTargetAtTime(me,L,.08),t.filter.Q.setTargetAtTime(.8+O.elongation*7.2+k*2.6,L,.09),t.drive.gain.setTargetAtTime(.62+A*1.25+g*.42,L,.1),t.noiseGain.gain.setTargetAtTime(15e-5+A*.01+ne*.004,L,.07),t.noiseFilter.frequency.setTargetAtTime(Math.min(7200,fe*(2.2+g*5.4+y*2.5)),L,.08),t.noiseFilter.Q.setTargetAtTime(1.5+g*10+w*5,L,.09),t.resonatorGain.gain.setTargetAtTime(.1+A*.28+ne*.24,L,.09),t.delay.delayTime.setTargetAtTime(.024+p*.12+y*.12,L,.12),t.feedback.gain.setTargetAtTime(.04+O.elongation*.18+y*.18,L,.14),t.wet.gain.setTargetAtTime(.025+m*.1+y*.13+c*.045,L,.14),t.dry.gain.setTargetAtTime(.9-A*.14,L,.14),t.pan.pan.setTargetAtTime(I,L,.08),t.gain.gain.setTargetAtTime(he*(D===`resolving`?.76:1),L,.09);let ve=i-Pe,ye=Math.max(42,310-Math.min(155,a*11)-ne*88-A*42-M*72-u*92);if((ve>0||u>.08)&&e-Ne>=ye){let n=1+(ce+Math.round(O.elongation*5))%Math.max(2,N.length-1),r=(u>.08?_e(l):ue)+W*n%N.length+(W%4==3?de:0),a=3+ce%5,o=W%a===0?1:.54+k*.22,s=Math.min(.88,(.18+p*.18+g*.18+ne*.18+A*.1+u*.28)*o),c=.028+p*.065+k*.04+y*.03+(l?.spread||0)*.035;t.pulse.frequency.setValueAtTime(Math.min(2600,P(r+N.length)*oe),L),t.pulseGain.gain.cancelScheduledValues(L),t.pulseGain.gain.setValueAtTime(1e-4,L),t.pulseGain.gain.exponentialRampToValueAtTime(s,L+.008),t.pulseGain.gain.exponentialRampToValueAtTime(1e-4,L+c);let d=Math.min(.48,(.035+A*.24+ne*.18)*o);t.noiseBurstGain.gain.cancelScheduledValues(L),t.noiseBurstGain.gain.setValueAtTime(1e-4,L),t.noiseBurstGain.gain.exponentialRampToValueAtTime(Math.max(2e-4,d),L+.004),t.noiseBurstGain.gain.exponentialRampToValueAtTime(1e-4,L+.025+y*.06),Ne=e,Pe=i,W+=1}}function xt(e=!1){let t=performance.now();if(!e&&t-ge<33)return;let n=B.reduce((e,t)=>Math.max(e,t.shownDepth),0),r=B.reduce((e,t)=>e+Ot(t,t.shownDepth),0),i=B.reduce((e,t)=>e+t.distinct,0),a=B.length?B.reduce((e,t)=>e+Dt(t).spread,0)/B.length:0,o=B.length?B.filter(e=>e.resolved).length/B.length:0,s=B.length?B.reduce((e,t)=>e+Math.min(1,t.shownDepth/h.current.maxDepth),0)/B.length:0,c=o*.8+s*.2;Ae({phase:D,score:r,skips:R.skips,deepest:n,progress:c,coverage:i,spread:a}),ge=t}function St(e){if(e.depth<=rt||e.depth%lt!==0)return;let t=(e.zr-pt.x)/_t*.5+.5,n=(e.zi-pt.y)/vt*.5+.5;if(t<0||t>=1||n<0||n>=1)return;let r=Math.min(Q-1,Math.floor(t*Q)),i=Math.min(Q-1,Math.floor(n*Q)),a=i*Q+r,o=a>>>5,s=1<<(a&31);(e.cells[o]&s)===0&&(e.cells[o]|=s,e.distinct+=1,e.sumX+=r,e.sumY+=i,e.sumXX+=r*r,e.sumYY+=i*i,e.sumXY+=r*i)}function Ct(){F+=1,D=`ready`,k=-1,j=`none`,Se=[],Ce=[],B=[],Je=[],Ye=[],Xe=0,Ze=0,Z=0,Qe=!1,$e=0,I=Math.floor(Math.random()*Ve),G.clear(),Pe=0,U=0,Ne=0,W=0;let e=ot();P={...e},R={x:e.x,y:e.y,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},Fe(null),n.current?.clear(),X=!0,xt(!0)}u.current=Ct;function wt(e,t){v.current||(n.current?.beginThrow(s.current,i,o,h.current.rotateRight),n.current?.setTuning(h.current),n.current?.setAtmosphere(de),n.current?.setLayer(`throw`));let r=ot(),a=Math.cos(e),c=Math.sin(e),l=t*t*(3-2*t),u=$()*(.32+.56*l),d=$()*tt*t,f=ct()*et;P={x:r.x-a*f*t,y:r.y-c*f*t},R.x=r.x-a*d,R.y=r.y-c*d,R.vx=a*u,R.vy=c*u,R.vz=$()*(.38+.2*l),R.z=1,R.spin=0,R.skips=0,R.bounceAge=10,D=`flying`,ht(170,.12,.07),X=!0,xt(!0)}function Tt(e,t=!1){T.current=!0,t&&he(!0),ye(!0),be(e.name||`YOU`),S.current=e,pe(!0),ee.current||=Nt();let r=Mt({...h.current,rotateRight:e.rotateRight,sourceDots:e.sourceDots});h.current=r,Ie(r),n.current?.setTuning(r),_.current(),g.current(),un(e.view),Ct(),I=e.glyph,F=e.seed,xe=e.skips,wt(e.angle,e.power)}w.current=Tt,f.current=un;function Et(e,t,r,a,c,l){let u=we(e,t,i,o,s.current,h.current.rotateRight),d={x:Math.fround(u.x),y:Math.fround(u.y)},f=(a+r-1)%Ve,p=v.current?6:h.current.sourceDots,m=Rt(e,t,i,o,s.current,p,f,h.current.rotateRight),g=l?.gpu??!v.current;if((l?.ripple??!v.current)&&Ce.push({cr:d.x,ci:d.y,born:c,index:r}),!v.current){Se.push({cr:d.x,ci:d.y,born:c,index:r});for(let e of m)B.push({zr:0,zi:0,cr:e.x,ci:e.y,depth:0,shownDepth:0,skip:r,glyph:f,stepDistance:0,distanceContraction:0,resolved:!1,score:0,offscreenStreak:0,tinyHopStreak:0,cells:new Uint32Array(st),distinct:0,sumX:0,sumY:0,sumXX:0,sumYY:0,sumXY:0})}g&&n.current?.spawn(m,r),v.current||(ht(320+r*62,.1,.06),`vibrate`in navigator&&navigator.vibrate?.(12)),xt(!0)}function At(e){D===`resolving`||D===`result`||(D=`resolving`,L=e,xt(!0))}function jt(){if(D===`result`)return;D=`result`,v.current||n.current?.freeze(),B.forEach(e=>{e.resolved||(e.resolved=!0,e.score=Ot(e,e.depth)),e.shownDepth=e.depth});let e=B.reduce((e,t)=>e+t.score,0),t=B.reduce((e,t)=>Math.max(e,t.depth),0),r=B.reduce((e,t)=>e+t.distinct,0),i=B.length?B.reduce((e,t)=>e+Dt(t).spread,0)/B.length:0,a=`${Date.now()}-${F}`;if(T.current)Fe(null);else{Fe(a);let n={id:a,name:m.current||`YOU`,score:e,deepest:t,skips:R.skips,coverage:r,spread:i,createdAt:new Date().toISOString()};je(e=>{let t=[...e,n].sort((e,t)=>t.score-e.score||t.deepest-e.deepest||e.createdAt.localeCompare(t.createdAt)).slice(0,10);return Bt(t),t})}S.current&&history.replaceState(null,``,Be(window.location.href,S.current)),Ae({phase:D,score:e,skips:R.skips,deepest:t,progress:1,coverage:r,spread:i}),ht(720,.18,.07)}function Pt(e,t){let n=1-Math.exp(-t/.055),r=()=>{for(let e of B){let t=e.depth-e.shownDepth;e.shownDepth=t<16?e.depth:Math.min(e.depth,e.shownDepth+Math.max(1,t*n))}};if(!B.filter(e=>!e.resolved).length){r();let t=B.every(e=>e.depth-e.shownDepth<16);D===`resolving`&&e-L>250&&t?jt():xt();return}let a=Math.max(1,Math.floor(nt/Math.max(B.length,1))),c=s.current,l=h.current.rotateRight,u=Math.hypot(i,o)*ut;for(let e of B){if(e.resolved)continue;let t=_e(e.depth,h.current.maxDepth,a,h.current.acceleration);for(let n=0;n<t&&e.depth<h.current.maxDepth;n++){let t=e.zr,n=e.zi,r=Math.fround(Math.fround(t*t-n*n)+e.cr),a=Math.fround(Math.fround(2*t*n)+e.ci),s=Math.hypot(r-t,a-n);if(Number.isFinite(s)){let t=e.stepDistance||s,n=Math.max(-4,Math.min(4,Math.log2(Math.max(t,1e-12)/Math.max(s,1e-12))));e.distanceContraction=e.distanceContraction*.82+n*.18,e.stepDistance=t*.82+s*.18}e.zi=a,e.zr=r,e.depth+=1,St(e);let f=Te(t,n,c,i,o,l),p=Te(r,a,c,i,o,l),m=Math.hypot((p.x-f.x)*i*.5,(p.y-f.y)*o*.5),h=Math.abs(p.x)<=1.02&&Math.abs(p.y)<=1.02,g=r>=ve.xMin&&r<=ve.xMax&&a>=ve.yMin&&a<=ve.yMax,_=d({magSq:r*r+a*a,hopPx:m,onScreen:h||g,offscreenStreak:e.offscreenStreak,tinyHopStreak:e.tinyHopStreak,maxHopPx:u});if(e.offscreenStreak=_.offscreenStreak,e.tinyHopStreak=_.tinyHopStreak,_.resolved){e.resolved=!0;break}}e.depth>=h.current.maxDepth&&(e.resolved=!0),e.resolved&&(e.shownDepth=e.depth,e.score=Ot(e,e.depth))}r();let f=B.every(e=>e.resolved),p=B.every(e=>e.depth-e.shownDepth<16);D===`resolving`&&(f&&p&&e-L>250||e-L>9e3)?jt():xt()}function Ft(e,t){if(D!==`flying`)return;let n=$()*1.65;R.x+=R.vx*e,R.y+=R.vy*e,R.z+=R.vz*e,R.vz-=n*e;let r=Math.exp(-.06*e);if(R.vx*=r,R.vy*=r,R.spin+=Math.hypot(R.vx,R.vy)*e*.016,R.bounceAge+=e,R.z<=0&&R.vz<0){if(R.z=0,R.x<24||R.x>i-24||R.y<24||R.y>o-24){At(t);return}R.skips+=1,R.bounceAge=0,Et(R.x,R.y,R.skips,I,t);let e=xe-R.skips;R.vz=Math.max(Math.abs(R.vz)*.56,$()*(.05+e*.008)),R.vx*=.79,R.vy*=.79;let n=(kt(F<<8^R.skips)()-.5)*Math.PI/60,r=Math.cos(n),a=Math.sin(n),s=R.vx*r-R.vy*a;if(R.vy=R.vx*a+R.vy*r,R.vx=s,e>0){let e=Math.hypot(R.vx,R.vy),t=$()*.09;e>0&&e<t&&(R.vx*=t/e,R.vy*=t/e)}(R.skips>=xe||R.x<-50||R.x>i+50||R.y<-50||R.y>o+50)&&At(t)}}function It(){let e=le(i,o),t=Math.atan2(o*.5-e.y,i*.5-e.x)+(Math.random()-.5)*1.55,n=.48+Math.random()*.42,r=n*n*(3-2*n),a=$()*(.32+.56*r),s=$()*tt*n,c=Math.cos(t),l=Math.sin(t),u=y.current;y.current+=1,F=F+17|0,Je.push({x:e.x-c*s,y:e.y-l*s,vx:c*a,vy:l*a,vz:$()*(.38+.2*r),z:1,spin:0,skips:0,bounceAge:10,plannedSkips:3,shotId:F,shapeOffset:u%Ve,path:[{x:e.x-c*s,y:e.y-l*s}],draw:u%50==0})}function zt(e,t){if(!v.current||!Je.length)return;let n=$()*1.65,r=[];for(let a of Je){a.x+=a.vx*e,a.y+=a.vy*e,a.z+=a.vz*e,a.vz-=n*e;let s=Math.exp(-.06*e);a.vx*=s,a.vy*=s,a.spin+=Math.hypot(a.vx,a.vy)*e*.016,a.bounceAge+=e;let c=a.path[a.path.length-1];a.draw&&(!c||Math.hypot(a.x-c.x,a.y-c.y)>=3)&&a.path.push({x:a.x,y:a.y});let l=!0;if(a.z<=0&&a.vz<0)if(a.z=0,a.x<24||a.x>i-24||a.y<24||a.y>o-24)l=!1;else{a.skips+=1,a.bounceAge=0,Et(a.x,a.y,a.skips,a.shapeOffset,t,{gpu:!1,ripple:a.draw});let e=a.plannedSkips-a.skips;a.vz=Math.max(Math.abs(a.vz)*.56,$()*(.05+e*.008)),a.vx*=.79,a.vy*=.79;let n=(kt(a.shotId<<8^a.skips)()-.5)*Math.PI/60,r=Math.cos(n),s=Math.sin(n),c=a.vx*r-a.vy*s;if(a.vy=a.vx*s+a.vy*r,a.vx=c,e>0){let e=Math.hypot(a.vx,a.vy),t=$()*.09;e>0&&e<t&&(a.vx*=t/e,a.vy*=t/e)}(a.skips>=a.plannedSkips||a.x<-50||a.x>i+50||a.y<-50||a.y>o+50)&&(l=!1)}l?r.push(a):a.draw&&Ye.length<3&&Ye.push({path:a.path,born:t})}Je=r}function Vt(e){let t=e.x-P.x,n=e.y-P.y,r=Math.hypot(t,n);if(r<12)return[];let a=ct()*et,s=Math.min(1,r/a),c=s*s*(3-2*s),l=$()*(.32+.56*c),u=$()*tt*s,d=e.x-t/r*u,f=e.y-n/r*u,p=t/r*l,m=n/r*l,h=$()*(.38+.2*c),g=1,_=0,v=$()*1.65,y=1/120,b=[];for(let e=0;e<2400&&_<3;e++){d+=p*y,f+=m*y,g+=h*y,h-=v*y;let e=Math.exp(-.06*y);if(p*=e,m*=e,g>0||h>=0)continue;if(g=0,d<24||d>i-24||f<24||f>o-24)break;_+=1,b.push({x:d,y:f,index:_,glyph:(I+_-1)%Ve});let t=3-_;if(h=Math.max(Math.abs(h)*.56,$()*(.05+t*.008)),p*=.79,m*=.79,t>0){let e=Math.hypot(p,m),t=$()*.09;e>0&&e<t&&(p*=t/e,m*=t/e)}if(_>=3||d<-50||d>i+50||f<-50||f>o+50)break}return b}let Ht=[75,175,235];function Ut(e,t,n,r,a,s){if(!Y||r<=0)return;let c=h.current.rotateRight,l=Math.hypot(i,o)*ut,u=0,d=0;Y.lineWidth=.65,Y.lineJoin=`round`,Y.lineCap=`round`;for(let f=0;f<r;f++){let p=u,m=d,h=Math.fround(Math.fround(p*p-m*m)+e.x),g=Math.fround(Math.fround(2*p*m)+e.y),_=Te(p,m,n,i,o,c),v=Te(h,g,n,i,o,c),y=Math.hypot((v.x-_.x)*i*.5,(v.y-_.y)*o*.5);if(u=h,d=g,y>=l||!Number.isFinite(y))break;let b=s*(1-f/Math.max(1,r))**.42,x=Math.min(.55,b*.85),S=z(h,g,i,o,n,c);if(f===0){Y.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${x.toFixed(3)})`,Y.beginPath(),Y.arc(t.x,t.y,.7,0,ft),Y.fill();continue}let C=f===1?t:z(p,m,i,o,n,c);Y.strokeStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${b.toFixed(3)})`,Y.beginPath(),Y.moveTo(C.x,C.y),Y.lineTo(S.x,S.y),Y.stroke(),Y.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${x.toFixed(3)})`,Y.beginPath(),Y.arc(S.x,S.y,.7,0,ft),Y.fill()}}function Wt(e){if(!Y)return;Y.clearRect(0,0,i,o);let t=Vt(e);if(!t.length)return;let n=h.current,r=s.current;Y.globalCompositeOperation=`lighter`;for(let e of t){let t=e.index,a=Math.max(1,Math.floor(n.previewIterations/2**(t-1))),s=.32/(1+(t-1)*.25);Ut(we(e.x,e.y,i,o,r,n.rotateRight),e,r,a,Ht,s)}}function Gt(e){if(D!==`aiming`||!h.current.previewOrbits||!Y)return;let t=s.current,n=[Math.round(P.x),Math.round(P.y),t.centerX.toFixed(5),t.centerY.toFixed(5),t.halfY.toFixed(5),h.current.previewIterations,h.current.rotateRight?`1`:`0`,i,o].join(`:`);n!==it&&(it=n,Wt(e)),r.drawImage(Ge,0,0,i,o)}function Kt(e){let t=10**Math.floor(Math.log10(Math.max(e,2**-52))),n=e/t;return(n<=1?1:n<=2?2:n<=5?5:10)*t}function qt(e,t){if(Math.abs(e)<t*.001)return`0`;if(Math.abs(e)>=1e4||Math.abs(e)<.001)return e.toExponential(1);let n=Math.max(0,Math.min(6,-Math.floor(Math.log10(t)))),r=e.toFixed(n);return n?r.replace(/\.?0+$/,``):r}function Jt(){if(!K)return;K.clearRect(0,0,i,o);let e=s.current,t=h.current.rotateRight,n=ke(e,i,o,t),r=Math.max(n.xMax-n.xMin,n.yMax-n.yMin)*.08,a=n.xMin-r,l=n.xMax+r,u=n.yMin-r,d=n.yMax+r,f=Kt(e.halfY*2/Math.max(o/92,1)),p=f/5,m=e=>Math.round(e*c)/c,g=e=>Math.abs(e/f-Math.round(e/f))<1e-6,_=e=>Math.abs(e)<p*1e-4,v=(n,r)=>z(n,r,i,o,e,t),y=e=>{K.beginPath();let t=Math.ceil(a/p),n=Math.floor(l/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(t,u),i=v(t,d);K.moveTo(m(n.x),m(n.y)),K.lineTo(m(i.x),m(i.y))}K.stroke()},b=e=>{K.beginPath();let t=Math.ceil(u/p),n=Math.floor(d/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(a,t),i=v(l,t);K.moveTo(m(n.x),m(n.y)),K.lineTo(m(i.x),m(i.y))}K.stroke()};if(K.lineWidth=1/c,K.strokeStyle=`rgba(104, 196, 216, .026)`,y(!1),b(!1),K.strokeStyle=`rgba(119, 211, 228, .065)`,y(!0),b(!0),h.current.coordinateAxes){let e=v(a,0),t=v(l,0),n=v(0,u),r=v(0,d);K.strokeStyle=`rgba(151, 231, 240, .18)`,K.lineWidth=1/c,K.beginPath(),K.moveTo(m(e.x),m(e.y)),K.lineTo(m(t.x),m(t.y)),K.moveTo(m(n.x),m(n.y)),K.lineTo(m(r.x),m(r.y)),K.stroke(),K.fillStyle=`rgba(171, 230, 238, .32)`,K.strokeStyle=`rgba(151, 231, 240, .14)`,K.font=`8px ui-monospace, SFMono-Regular, Menlo, monospace`,K.textBaseline=`top`,K.textAlign=`center`;for(let e=Math.ceil(a/f);e<=Math.floor(l/f);e++){let t=e*f;if(_(t))continue;let n=v(t,0);K.beginPath(),K.arc(m(n.x),m(n.y),2,0,ft),K.stroke(),n.x>18&&n.x<i-18&&n.y>9&&n.y<o-9&&K.fillText(qt(t,f),m(n.x),m(n.y)+4)}K.textBaseline=`middle`,K.textAlign=`right`;for(let e=Math.ceil(u/f);e<=Math.floor(d/f);e++){let t=e*f;if(_(t))continue;let n=v(0,t);K.beginPath(),K.arc(m(n.x),m(n.y),2,0,ft),K.stroke(),n.x>28&&n.x<i-8&&n.y>9&&n.y<o-9&&K.fillText(qt(t,f),m(n.x)-5,m(n.y))}K.fillStyle=`rgba(180, 239, 245, .42)`,K.font=`italic 9px ui-monospace, SFMono-Regular, Menlo, monospace`;let s=v(l,0);K.textAlign=`right`,K.textBaseline=`bottom`,K.fillText(`Re(c)`,Math.min(i-7,Math.max(40,s.x-6)),Math.min(o-6,Math.max(14,s.y-4)));let p=v(0,d);K.textAlign=`left`,K.textBaseline=`top`,K.fillText(`Im(c)`,Math.min(i-34,Math.max(6,p.x+6)),Math.max(6,p.y+4))}q=!1}function Yt(e,t){let n=e.z*.3,i=(t+e.skips)%Ve,a=He[i],o=Math.min(1,e.z/Math.max($()*.45,1)),s=Math.round(e.x*c)/c,l=Math.round((e.y-n)*c)/c,u=Le?0:Math.exp(-e.bounceAge*8.5)*Math.cos(e.bounceAge*29),d=1+u*.11,f=1-u*.09;r.save(),r.fillStyle=`rgba(0, 4, 9, ${.3*(1-o*.72)})`,r.beginPath(),r.ellipse(s,e.y,10.5*(1+Math.max(0,u)*.08),3.5,0,0,ft),r.fill(),r.restore(),r.save(),r.translate(s,l),r.scale(d,f),r.rotate(e.spin*.18),r.strokeStyle=`rgba(255, 255, 255, .34)`,r.lineWidth=1;for(let e=0;e<a;e++){r.beginPath();for(let t=0;t<=32;t++){let n=Lt(i,e,t/32);t===0?r.moveTo(n.x*10,n.y*10):r.lineTo(n.x*10,n.y*10)}r.stroke()}r.fillStyle=`#ffffff`;let p=v.current?6:Math.max(Ue,Math.min(18,h.current.sourceDots));for(let e=0;e<p;e++){let t=e%a,n=Math.floor(e/a),o=Math.ceil((p-t)/a),s=Lt(i,t,n/Math.max(o,1));r.beginPath(),r.arc(s.x*10,s.y*10,1.15,0,ft),r.fill()}r.restore()}function Xt(e,t){if(!(e.length<2||t<=0)){r.save(),r.strokeStyle=`rgba(210, 220, 224, ${t})`,r.lineWidth=1,r.lineJoin=`round`,r.lineCap=`round`,r.beginPath(),r.moveTo(e[0].x,e[0].y);for(let t=1;t<e.length;t++)r.lineTo(e[t].x,e[t].y);r.stroke(),r.restore()}}function Zt(e){if(v.current){let t=0;for(let e of Je)e.draw&&t<2&&(Xt(e.path,.09),t+=1);Ye=Ye.filter(t=>e-t.born<N);for(let t=0;t<Math.min(2,Ye.length);t++){let n=Ye[t],r=Math.min(1,(e-n.born)/N);Xt(n.path,.08*(1-r)*(1-r))}return}D===`resolving`||D===`result`||Yt(R,I)}function Qt(e){Ce=Ce.filter(t=>e-t.born<(t.lifetime??2400));for(let t of Ce){let n=z(t.cr,t.ci,i,o,s.current,h.current.rotateRight),a=t.lifetime??2400,c=(e-t.born)/a;if(c<=0||c>=1)continue;let l=t.maxRadius??Math.max(36,ct()*.14),u=3+c**.7*l,d=Math.sin(c*Math.PI)*(1-c)**1.25,f=v.current?.44:.28,p=Math.max(0,d*f);p<=.002||(r.save(),r.strokeStyle=v.current?`rgba(240, 245, 255, ${p.toFixed(3)})`:`rgba(130, 215, 235, ${p.toFixed(3)})`,r.lineWidth=Math.max(.5,(v.current?1.1:.85)*(1-c*.5)),r.beginPath(),r.arc(n.x,n.y,u,0,ft),r.stroke(),r.restore())}r.textAlign=`center`,r.textBaseline=`middle`;for(let t of Se){let n=z(t.cr,t.ci,i,o,s.current,h.current.rotateRight),a=e-t.born,c=8e3;if(a<0||a>=c)continue;let l=a/c,u=a<450?1+Math.sin(a/450*Math.PI)*.38:1;r.font=`800 ${Math.round(15*u)}px ui-monospace, monospace`;let d=Math.max(0,(1-l)**.85*.92);d<=.01||(r.save(),r.lineWidth=2.5,r.strokeStyle=`rgba(0, 16, 28, ${(d*.85).toFixed(3)})`,r.strokeText(String(t.index),n.x,n.y+.5),r.fillStyle=`rgba(235, 252, 255, ${d.toFixed(3)})`,r.fillText(String(t.index),n.x,n.y+.5),r.restore())}r.textAlign=`start`,r.textBaseline=`alphabetic`}function $t(){if(D!==`aiming`)return null;let e=ot(),t=e.x-P.x,n=e.y-P.y,r=Math.hypot(t,n);if(r<8)return null;let a=t/r,s=n/r,c=Math.hypot(i,o)*1.18,l=oe,u=Math.cos(l),d=Math.sin(l);return{apexX:P.x,apexY:P.y,directionX:a,directionY:s,range:c,leftX:P.x+(a*u-s*d)*c,leftY:P.y+(s*u+a*d)*c,rightX:P.x+(a*u+s*d)*c,rightY:P.y+(s*u-a*d)*c,tipX:P.x+a*c*1.04,tipY:P.y+s*c*1.04}}function en(){let e=n.current;if(e){if(v.current){e.setDisplay({...me(`intro`),cone:null,cssWidth:i,cssHeight:o,mri:!0});return}if(D===`aiming`){e.setDisplay({...me(`aiming`),cone:$t(),cssWidth:i,cssHeight:o});return}e.setDisplay({...me(`play`),cone:null,cssWidth:i,cssHeight:o})}}function tn(e){if(!qe)return;let t=z(ve.xMin,ve.yMax,i,o,s.current,!1),n=z(ve.xMax,ve.yMin,i,o,s.current,!1),r=Math.round(Math.min(t.x,n.x)),a=Math.round(Math.min(t.y,n.y)),c=Math.max(1,Math.round(Math.abs(n.x-t.x))),l=Math.max(1,Math.round(Math.abs(n.y-t.y)));e.drawImage(qe,r,a,c,l)}function nn(){if(D!==`aiming`||v.current)return;let e=$t();if(!e)return;let{apexX:t,apexY:a,directionX:s,directionY:l,range:u}=e;if(!n.current&&qe&&J){if(X){J.clearRect(0,0,i,o),tn(J),J.globalCompositeOperation=`destination-in`,J.save(),J.filter=`blur(${32*c}px)`;let e=Math.atan2(l,s),n=oe*2/ft,r=Math.min(n*.22,.04),d=J.createConicGradient(e-oe,t,a);d.addColorStop(0,`rgba(255, 255, 255, 0)`),d.addColorStop(r,`rgba(255, 255, 255, 1)`),d.addColorStop(Math.max(r,n-r),`rgba(255, 255, 255, 1)`),d.addColorStop(n,`rgba(255, 255, 255, 0)`),n<1&&d.addColorStop(1,`rgba(255, 255, 255, 0)`),J.fillStyle=d,J.fillRect(0,0,i,o),J.globalCompositeOperation=`destination-in`;let f=J.createRadialGradient(t,a,0,t,a,u);f.addColorStop(0,`rgba(255, 255, 255, 0.9)`),f.addColorStop(.55,`rgba(255, 255, 255, 0.4)`),f.addColorStop(1,`rgba(255, 255, 255, 0)`),J.fillStyle=f,J.fillRect(0,0,i,o),J.restore(),J.globalCompositeOperation=`source-over`,X=!1}r.save(),r.globalAlpha=.32,r.drawImage(ze,0,0,i,o),r.restore()}}function rn(e){en(),r.clearRect(0,0,i,o),q&&Jt(),Re&&r.drawImage(Re,0,0,i,o);let t=ot();nn(),Gt(t),Qt(e),Zt(e)}function an(e){let t=le(i,o),n=we(t.x,t.y,i,o,s.current,h.current.rotateRight),r=Math.random(),a,c;r<.35?(a=Math.max(18,ct()*(.04+Math.random()*.04)),c=2600+Math.random()*800):r<.75?(a=Math.max(45,ct()*(.09+Math.random()*.08)),c=3400+Math.random()*1e3):(a=Math.max(90,ct()*(.18+Math.random()*.14)),c=4600+Math.random()*1200),Ce.push({cr:n.x,ci:n.y,born:e,index:1,lifetime:c,maxRadius:a})}function on(e){let t=D===`aiming`&&!v.current;if(!v.current&&!t||b.current||Ze!==0&&e-Ze<40)return;Ze=e,n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:se,doublePixels:v.current?!0:h.current.doublePixels}),n.current?.setAtmosphere(fe);let r=Array.from({length:96},()=>ue());n.current?.spawnAppend(r,1,Ke),Math.random()<.04&&an(e)}function sn(e){if(!v.current||b.current)return;if(Z||=e,!Qe){let t=Math.min(1,(e-Z)/ce);t>=1?(Qe=!0,O({progress:1,ready:!0})):e-$e>40&&($e=e,O({progress:t}))}let t=y.current<32?900:2400;Xe!==0&&e-Xe<t||(Xe=e,T.current=!0,n.current?.setTuning({...h.current,maxDepth:se,doublePixels:!0}),n.current?.setAtmosphere(fe),It(),an(e))}function cn(e){let t=Math.min(.05,(e-x)/1e3);x=e,C+=t;let n=1/120;for(;C>=n;)Ft(n,e),zt(n,e),C-=n;sn(e),on(e),Pt(e,t),bt(e),rn(e),l=requestAnimationFrame(cn)}function ln(t){let n=e.getBoundingClientRect();return{x:t.clientX-n.left,y:t.clientY-n.top}}function un(e){let t=s.current,r=h.current.rotateRight;if(D===`flying`||D===`aiming`){let n=De(R.x,R.y,i,o,t,e,r);if(D===`flying`){let n=Oe(R.x,R.y,R.vx,R.vy,i,o,t,e,r);R.vx=n.x,R.vy=n.y;let a=t.halfY/Math.max(e.halfY,1e-6);R.z*=a,R.vz*=a}R.x=n.x,R.y=n.y,D===`aiming`&&(P=De(P.x,P.y,i,o,t,e,r))}s.current=e,q=!0,X=!0,n.current?.setView(e)}function dn(t){if(v.current)return;let r=ln(t);k=t.pointerId,e.setPointerCapture(k),D===`ready`&&Math.hypot(r.x-R.x,r.y-R.y)<=48?(j=`aim`,D=`aiming`,xe=p(Math.random),it=``,X=!0,n.current?.setLayer(`pond`),n.current?.setAtmosphere(fe),n.current?.setTuning({...h.current,maxDepth:se}),P=r,R.x=r.x,R.y=r.y,xt(!0)):(j=`pan`,ie=r,M={...s.current})}function fn(e){let t=ln(e);if(e.pointerId!==k)return;if(j===`pan`){let e=h.current.rotateRight,n=we(ie.x,ie.y,i,o,M,e),r=we(t.x,t.y,i,o,M,e);un({centerX:M.centerX-(r.x-n.x),centerY:M.centerY-(r.y-n.y),halfY:M.halfY});return}if(j!==`aim`||D!==`aiming`)return;let n=ot(),r=t.x-n.x,a=t.y-n.y,s=Math.hypot(r,a),c=ct()*et,l=s>c?c/s:1;P={x:n.x+r*l,y:n.y+a*l},R.x=P.x,R.y=P.y,X=!0}function pn(t){if(t.pointerId!==k)return;if(X=!0,j===`pan`){j=`none`,k=-1,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId);return}if(j!==`aim`||D!==`aiming`)return;let r=ot(),i=r.x-P.x,a=r.y-P.y,o=Math.hypot(i,a);if(k=-1,j=`none`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),o<12){D=`ready`,R.x=r.x,R.y=r.y,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(de),n.current?.setLayer(`throw`),xt(!0);return}let c=ct()*et,l=Math.min(1,o/c),u=Math.atan2(a,i);T.current=!1,he(!1),ye(!1),ee.current=null,S.current={version:1,view:{...s.current},rotateRight:h.current.rotateRight,angle:u,power:l,skips:xe,glyph:I,seed:F,sourceDots:h.current.sourceDots,name:m.current||`YOU`},pe(!0),wt(u,l)}function mn(){if(j===`pan`){j=`none`,k=-1;return}if(j!==`aim`||D!==`aiming`)return;D=`ready`,k=-1,j=`none`;let e=ot();P={...e},R.x=e.x,R.y=e.y,X=!0,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(de),n.current?.setLayer(`throw`),xt(!0)}function hn(e){v.current||(e.key===`Escape`&&mn(),(e.key===` `||e.key===`Enter`)&&D===`result`&&(e.preventDefault(),E.current()))}let gn=new ResizeObserver(dt);return gn.observe(e),e.addEventListener(`pointerdown`,dn),e.addEventListener(`pointermove`,fn),e.addEventListener(`pointerup`,pn),e.addEventListener(`pointercancel`,mn),window.addEventListener(`keydown`,hn),dt(),Ct(),l=requestAnimationFrame(cn),()=>{at=!0,cancelAnimationFrame(l),gn.disconnect(),e.removeEventListener(`pointerdown`,dn),e.removeEventListener(`pointermove`,fn),e.removeEventListener(`pointerup`,pn),e.removeEventListener(`pointercancel`,mn),window.removeEventListener(`keydown`,hn),V?.close(),w.current=null}},[]);let q=V.phase===`ready`?`Grab the white orb. Pull back and release.`:V.phase===`aiming`?`Aim for deep water · farther pull = faster throw`:V.phase===`flying`?`Each splash launches a new ${W.sourceDots}-point glyph`:V.phase===`resolving`?`Resolving the pond · ${Math.round(V.progress*100)}%`:`Press Space or throw again`,ze=Math.max(0,I.indexOf(W.maxDepth)),Ge=()=>{if(T.current=!1,he(!1),ye(!1),ee.current){let e=ee.current;ee.current=null,h.current=e,Ie(e),Pt(e),n.current?.setTuning(e),_.current(),g.current()}u.current(),requestAnimationFrame(()=>t.current?.focus())};E.current=Ge;let Y=()=>{let e=S.current;!e||D||w.current?.(e)},X=()=>{let e=S.current;if(!e)return;let t=Be(window.location.href,e);history.replaceState(null,``,t),(async()=>{try{if(navigator.share){await navigator.share({title:`Mandelbrot Skipping`,url:t});return}}catch(e){if(e instanceof Error&&e.name===`AbortError`)return}try{await navigator.clipboard.writeText(t),Se(`Copied`),window.setTimeout(()=>Se(``),1600)}catch{Se(`Copy the address bar`),window.setTimeout(()=>Se(``),2400)}})()},Ze=V.phase===`flying`||V.phase===`resolving`||!!D;return(0,o.jsxs)(`main`,{className:`gameShell ${ge?`replayMode`:``}`,children:[(0,o.jsxs)(`section`,{className:`playfield`,"aria-label":`Mandelbrot rock skipping game`,children:[(0,o.jsx)(`canvas`,{ref:e,className:`gpuCanvas`,"aria-hidden":`true`}),(0,o.jsx)(`canvas`,{ref:t,className:`gameCanvas`,tabIndex:0,"aria-label":`Throw ready. Drag the white orb backward and release it across the water`}),ge&&(0,o.jsxs)(`p`,{className:`replayBanner`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`replayBannerName`,children:Pe(R)}),(0,o.jsx)(`span`,{className:`replayBannerLabel`,children:`replay`})]}),D&&(0,o.jsx)(c,{progress:D.progress,fading:k,ready:D.ready,onPlay:G}),(V.phase===`flying`||V.phase===`resolving`)&&!D&&(0,o.jsx)(`button`,{type:`button`,className:`playfieldThrowControl`,onClick:Ge,"aria-label":`Cancel this throw and rethrow`,children:`Rethrow`}),(0,o.jsxs)(`div`,{className:`playfieldDock`,children:[(0,o.jsx)(`button`,{type:`button`,className:`replayOpening`,onClick:Le,disabled:!!D||!!Ce,"aria-label":`Replay the opening Buddhabrot sequence`,children:`Replay opening`}),(0,o.jsx)(l,{})]})]}),(0,o.jsxs)(`aside`,{className:`scoreRail ${V.phase===`result`?`hasResult`:``}`,"aria-label":`Score and local high scores`,children:[(0,o.jsxs)(`section`,{className:`liveScore`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`liveLabel`,children:V.phase===`result`?`Final score`:`Live score`}),(0,o.jsx)(`strong`,{className:`liveNumber`,children:Et(V.score)}),(0,o.jsxs)(`span`,{className:`liveMeta`,children:[V.skips,` skips · `,V.deepest?Et(V.deepest):`0`,` deep · `,V.coverage,` cells · `,Math.round(V.spread*100),`% spread`]}),(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,V.progress*100)}%`}})}),(0,o.jsxs)(`div`,{className:`throwShareRow`,children:[(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:Y,disabled:!P||Ze,"aria-label":`Replay this throw`,children:`Replay throw`}),(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:X,disabled:!P,"aria-label":`Copy a link to this throw`,children:xe||`Share throw`})]})]}),(0,o.jsxs)(`section`,{className:`tuningPanel`,"aria-label":`Orbit tuning`,children:[(0,o.jsxs)(`div`,{className:`tuningHeading`,children:[(0,o.jsx)(`span`,{children:`Orbit tuning`}),(0,o.jsx)(`span`,{children:`Live`})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Glyph dots`}),(0,o.jsx)(`output`,{children:W.sourceDots})]}),(0,o.jsx)(`input`,{type:`range`,min:Ue,max:We,step:`1`,value:W.sourceDots,"aria-label":`Dots per sacred geometry glyph`,onChange:e=>K({sourceDots:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Orbit limit`}),(0,o.jsx)(`output`,{children:At(W.maxDepth)})]}),(0,o.jsx)(`input`,{type:`range`,min:`0`,max:I.length-1,step:`1`,value:ze,"aria-label":`Orbit iteration limit`,"aria-valuetext":`${Et(W.maxDepth)} iterations`,onChange:e=>K({maxDepth:I[Number(e.target.value)]})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Acceleration curve`}),(0,o.jsxs)(`output`,{children:[W.acceleration.toFixed(1),`×`]})]}),(0,o.jsx)(`input`,{type:`range`,min:L,max:18,step:`0.1`,value:W.acceleration,"aria-label":`Iteration speed acceleration curve`,"aria-valuetext":`${W.acceleration.toFixed(1)} curve`,onChange:e=>K({acceleration:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Line persist`}),(0,o.jsxs)(`output`,{children:[W.linePersist.toFixed(2),`s`]})]}),(0,o.jsx)(`input`,{type:`range`,min:qe,max:Je,step:`0.05`,value:W.linePersist,"aria-label":`How long iteration lines stay visible`,"aria-valuetext":`${W.linePersist.toFixed(2)} seconds`,onChange:e=>K({linePersist:Number(e.target.value)})})]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.previewOrbits,"aria-label":`Preview skip orbits while aiming`,onChange:e=>K({previewOrbits:e.target.checked})}),`Aim orbit preview`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.skipColors,"aria-label":`Color each skip differently`,onChange:e=>K({skipColors:e.target.checked})}),`Skip colors`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.coordinateAxes,"aria-label":`Show coordinate axes`,onChange:e=>K({coordinateAxes:e.target.checked})}),`Coordinate axes`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.rotateRight,"aria-label":`Rotate coordinates and Buddhabrot 90 degrees right`,onChange:e=>K({rotateRight:e.target.checked})}),`Rotate 90° right`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.doublePixels,"aria-label":`Render the orbit nebula at half resolution so pixels look doubled`,onChange:e=>K({doublePixels:e.target.checked})}),`Double pixels`]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Preview iterations`}),(0,o.jsx)(`output`,{children:W.previewIterations})]}),(0,o.jsx)(`input`,{type:`range`,min:Ye,max:Xe,step:`1`,value:W.previewIterations,"aria-label":`Orbit iterations to draw while aiming`,"aria-valuetext":`${W.previewIterations} iterations`,onChange:e=>K({previewIterations:Number(e.target.value)})})]}),(0,o.jsx)(`p`,{className:`tuningNote`,children:`Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations each skip. Skip colors tint preview and live trails per splash.`})]}),V.phase===`result`&&(0,o.jsxs)(`section`,{className:`railResult`,"aria-label":`Throw result`,children:[(0,o.jsx)(`div`,{className:`resultEyebrow`,children:F?`${Pe(R)} throw`:H[0]?.id===U?`New local best`:`Throw complete`}),(0,o.jsxs)(`div`,{className:`resultStats`,children:[V.skips,` exact paths · `,Et(V.deepest),` deep · `,V.coverage,` distinct cells · `,Math.round(V.spread*100),`% spread.`]}),(0,o.jsxs)(`div`,{className:`nameRow`,children:[U?(0,o.jsx)(`input`,{className:`nameInput`,"aria-label":`High score name`,value:Me,maxLength:12,onChange:e=>Re(e.target.value)}):null,(0,o.jsx)(`button`,{className:`throwButton`,onClick:Ge,children:`Throw again`})]})]}),(0,o.jsx)(`h2`,{className:`railTitle`,children:`Local legends`}),(0,o.jsx)(`p`,{className:`railSub`,children:`Depth, distinct points, and spatial spread all score. Later skips multiply the result.`}),Ce&&(0,o.jsx)(`p`,{className:`gpuNote`,role:`status`,children:Ce}),(0,o.jsxs)(`div`,{className:`scoreList`,children:[H.length===0&&(0,o.jsx)(`div`,{className:`emptyScores`,children:`No throws yet.`}),H.map((e,t)=>(0,o.jsxs)(`div`,{className:`scoreEntry ${e.id===U?`current`:``}`,children:[(0,o.jsx)(`span`,{className:`rank`,children:String(t+1).padStart(2,`0`)}),(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{className:`scoreName`,children:e.name}),(0,o.jsxs)(`span`,{className:`scoreMeta`,children:[e.skips,` skips · `,Et(e.deepest),` deep · `,e.coverage,` cells · `,Math.round(e.spread*100),`% spread`]})]}),(0,o.jsx)(`span`,{className:`scoreNumber`,children:Et(e.score)})]},e.id))]}),(0,o.jsxs)(`div`,{className:`railHint`,children:[q,(0,o.jsx)(`br`,{}),`Drag empty water to move · wheel or +/- to zoom.`]}),(0,o.jsxs)(`div`,{className:`railFooter`,children:[`Saved on this device · score model v2 · `,At(W.maxDepth),` orbit cap`]})]})]})}export{Ht as default};