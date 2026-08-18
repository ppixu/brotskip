import{r as e}from"./rolldown-runtime-vU33u7is.js";import{i as t,r as n}from"./framework-EwgI_Pa9.js";var r=e(n(),1);async function i(e){let t=navigator.gpu;if(!t)return e(`WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.`),null;let n=await t.requestAdapter({powerPreference:`high-performance`});if(!n)return e(`No GPU adapter found. Throwing still works in reduced visual mode.`),null;let r=await n.requestDevice(),i=!1;r.addEventListener(`uncapturederror`,t=>{i=!0;let n=t.error?.message||String(t.error);console.error(`WebGPU validation`,n),e(`WebGPU validation error: ${n}`)}),r.lost.then(()=>{i=!0,e(`The GPU device was lost. Reload to restore orbit trails.`)});let a=!1;return{device:r,preferredFormat:t.getPreferredCanvasFormat(),hasFailed:()=>i,destroy:()=>{a||(a=!0,r.destroy())}}}var a={trigger:`Buddhabrot`,title:`Buddhabrot`,formula:`z → z² + c`,paragraphs:[`The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.`,`Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. Raise the iteration limit and the picture thins into finer filaments: only the longest escapes remain, as in the animation.`],gif:{file:`buddhabrot-iterations.gif`,alt:`Buddhabrot forming as the maximum iteration count increases`,credit:`Tacodude7729 / Wikimedia Commons`,license:`CC BY-SA 4.0`,licenseUrl:`https://creativecommons.org/licenses/by-sa/4.0/`,sourceUrl:`https://commons.wikimedia.org/wiki/File:BuddhabrotIterationAnimation7729.gif`,articleUrl:`https://en.wikipedia.org/wiki/Buddhabrot`},wikipedia:{journal:`Notes on fractal geometry`,title:`The Buddhabrot`,sentences:[{text:`The Buddhabrot is the probability distribution over the trajectories of points that escape the Mandelbrot fractal.`,cite:1},{text:`Its name reflects its pareidolic resemblance to classical depictions of Gautama Buddha, seated in a meditation pose with a forehead mark (tika), a traditional oval crown (ushnisha), and ringlet of hair.`,cite:2}],references:[{n:1,text:`Green, M. The Buddhabrot Technique. Superliminal, 1993.`,url:`https://www.superliminal.com/fractals/bbrot/bbrot.htm`},{n:2,text:`Wikipedia contributors. Buddhabrot. Wikipedia, The Free Encyclopedia. CC BY-SA 4.0.`,url:`https://en.wikipedia.org/wiki/Buddhabrot`}]}},o=t();function s(e){return e.split(/\b(tika|ushnisha)\b/).map((e,t)=>e===`tika`||e===`ushnisha`?(0,o.jsx)(`i`,{children:e},t):e)}function c({progress:e,fading:t,ready:n,onPlay:r,rotateRight:i}){let{gif:c,wikipedia:l}=a;return(0,o.jsxs)(`div`,{className:`introOverlay ${t?`fading`:``}`,role:`status`,"aria-label":`Charting the pond`,children:[(0,o.jsx)(`div`,{className:`introTraverse${i===!1?``:` rotated`}`,children:(0,o.jsx)(`img`,{src:c.file,alt:c.alt,width:600,height:337})}),(0,o.jsxs)(`div`,{className:`introChrome`,children:[(0,o.jsx)(`span`,{className:`introTitle`,children:`Mandelbrot Skipping`}),!n&&(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,e*100)}%`}})})]}),(0,o.jsxs)(`article`,{className:`introPaper`,"aria-label":`Buddhabrot, from Wikipedia`,children:[(0,o.jsx)(`p`,{className:`introPaperJournal`,children:l.journal}),(0,o.jsx)(`h1`,{className:`introPaperTitle`,children:l.title}),(0,o.jsx)(`p`,{className:`introPaperLede`,children:l.sentences.map(e=>(0,o.jsxs)(`span`,{children:[s(e.text),(0,o.jsx)(`sup`,{className:`introPaperCite`,children:(0,o.jsxs)(`a`,{href:l.references[e.cite-1].url,target:`_blank`,rel:`noreferrer`,children:[`[`,e.cite,`]`]})}),` `]},e.cite))}),(0,o.jsx)(`ol`,{className:`introPaperRefs`,children:l.references.map(e=>(0,o.jsx)(`li`,{value:e.n,children:(0,o.jsx)(`a`,{href:e.url,target:`_blank`,rel:`noreferrer`,children:e.text})},e.n))})]}),n&&(0,o.jsx)(`button`,{type:`button`,className:`introPlay`,onClick:r,"aria-label":`Play`,children:`Play`})]})}function l(){let{trigger:e,title:t,formula:n,paragraphs:r,gif:i}=a;return(0,o.jsxs)(`div`,{className:`howItWorks`,children:[(0,o.jsx)(`button`,{type:`button`,className:`howItWorksTrigger`,"aria-describedby":`how-it-works-panel`,children:e}),(0,o.jsxs)(`div`,{id:`how-it-works-panel`,className:`howItWorksPanel`,role:`tooltip`,children:[(0,o.jsx)(`p`,{className:`howItWorksKicker`,children:t}),(0,o.jsx)(`img`,{className:`howItWorksFilm`,src:i.file,alt:i.alt,width:600,height:337}),(0,o.jsx)(`p`,{className:`howItWorksFormula`,children:n}),r.map(e=>(0,o.jsx)(`p`,{children:e},e.slice(0,24))),(0,o.jsxs)(`p`,{className:`howItWorksCredit`,children:[`Animation:`,` `,(0,o.jsx)(`a`,{href:i.sourceUrl,target:`_blank`,rel:`noreferrer`,children:i.credit}),`,`,` `,(0,o.jsx)(`a`,{href:i.licenseUrl,target:`_blank`,rel:`noreferrer`,children:i.license}),`. Summary after the`,` `,(0,o.jsx)(`a`,{href:i.articleUrl,target:`_blank`,rel:`noreferrer`,children:`Wikipedia Buddhabrot article`}),`.`]})]})]})}var u=.04;function d(e){let t=e.onScreen?0:e.offscreenStreak+1,n=e.hopPx<=.04?e.tinyHopStreak+1:0,r=!Number.isFinite(e.hopPx)||!Number.isFinite(e.magSq),i=e.magSq>4;return{resolved:r||i||n>=500||t>=800,offscreenStreak:t,tinyHopStreak:n}}var f=.76;function p(e,t=f){let n=(1-t**14)/(1-t),r=Math.min(Math.max(e(),0),.999999999)*n;for(let e=2;e<=15;e++)if(r-=t**(e-2),r<0)return e;return 15}function m(e,t,n,r){let i=Math.max(n,r),a=e+n>i?0:e;return{start:a,nextSource:(a+n)%i,sourceCount:Math.min(i,t+n)}}function h(e,t,n){let r=Math.max(0,n-e),i=Math.min(t,r);return{start:e,nextSource:e+i,sourceCount:e+i,added:i}}var g=1024,_=99.92;function v(e,t,n){let r=e.length,i=0;for(let t=0;t<r;t++)i+=e[t];if(i===0)return 0;let a=i*n/100,o=0;for(let n=0;n<r;n++){let i=e[n];if(i>0&&o+i>=a){let e=(a-o)/i;return(n+e)/r*t}o+=i}return t}function y(e,t=20){if(!(t>0))return{low:0,high:1};let n=v(e,t,54),r=v(e,t,_);return{low:n,high:Math.max(r,n+1e-9)}}var b=.05;function x(e){return!Number.isFinite(e)||e<0?0:Math.min(e,b)}function S(e,t){let n=t.maxSamplesPerFrame??2e6,r=t.minDurationMs??5e3;if(r<=0)return n;let i=x(e)*1e3/r;return Math.max(1,Math.min(n,Math.floor(t.totalSamples*i)))}var C={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5},ee=`
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
`,w=`
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
`,T=`
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
`,E={2048:16e6,4096:64e6};function ne(e,t){let n=e.device,r=globalThis.GPUBufferUsage,i=globalThis.GPUTextureUsage,{size:a}=t,o=a*a,s=t.totalSamples??E[a]??16e6,c=t.maxIterations??320,l=n.createBuffer({size:o*4,usage:r.STORAGE|r.COPY_DST}),u=n.createBuffer({size:g*4,usage:r.STORAGE|r.COPY_DST|r.COPY_SRC}),d=n.createBuffer({size:g*4,usage:r.COPY_DST|r.MAP_READ}),f=n.createBuffer({size:32,usage:r.UNIFORM|r.COPY_DST}),p=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),m=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),h=n.createTexture({size:[a,a],format:`rgba8unorm`,usage:i.STORAGE_BINDING|i.TEXTURE_BINDING|i.COPY_SRC}),_=n.createSampler({magFilter:`linear`,minFilter:`linear`}),v=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:ee}),entryPoint:`accumulate`}}),b=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:w}),entryPoint:`histogram`}}),x=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:T}),entryPoint:`colorize`}}),ne=n.createShaderModule({code:te}),D=n.createRenderPipeline({layout:`auto`,vertex:{module:ne,entryPoint:`vs`},fragment:{module:ne,entryPoint:`fs`,targets:[{format:e.preferredFormat}]},primitive:{topology:`triangle-list`}}),O=n.createBindGroup({layout:v.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:l}}]}),k=n.createBindGroup({layout:b.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}}]}),A=n.createBindGroup({layout:x.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:l}},{binding:2,resource:h.createView()}]}),re=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:h.createView()},{binding:1,resource:_}]});n.queue.writeBuffer(p,0,new Uint32Array([a,0,0,0]));let ie=0,ae=0,j=!1,oe=!1,se={low:.69,high:3};function ce(e){let t=new ArrayBuffer(32);new Uint32Array(t,0,4).set([a,ae+1,e,c]),new Float32Array(t,16,4).set([C.xMin,C.xMax,C.yMin,C.yMax]),n.queue.writeBuffer(f,0,t)}function M(){let e=new ArrayBuffer(16);new Uint32Array(e,0,2).set([a,0]),new Float32Array(e,8,2).set([se.low,se.high]),n.queue.writeBuffer(m,0,e)}async function le(){if(!(oe||j)){oe=!0;try{let e=n.createCommandEncoder({label:`buddhabrot-histogram-readback`});if(e.copyBufferToBuffer(u,0,d,0,g*4),n.queue.submit([e.finish()]),await d.mapAsync(globalThis.GPUMapMode.READ),j)return;se=y(new Uint32Array(d.getMappedRange().slice(0))),d.unmap()}catch(e){console.warn(`[buddhabrot] histogram readback failed`,e)}finally{oe=!1}}}return{step(r){if(j||e.hasFailed()||ie>=s)return;let i=S(r,{totalSamples:s,minDurationMs:t.minDurationMs}),o=Math.min(i,s-ie);ce(o),M(),n.queue.writeBuffer(u,0,new Uint32Array(g));let c=n.createCommandEncoder({label:`buddhabrot-step`}),l=c.beginComputePass();l.setPipeline(v),l.setBindGroup(0,O),l.dispatchWorkgroups(Math.ceil(o/64)),l.setPipeline(b),l.setBindGroup(0,k),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.setPipeline(x),l.setBindGroup(0,A),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.end(),n.queue.submit([c.finish()]),ie+=o,ae+=1,le()},progress(){return Math.min(1,ie/s)},isComplete(){return ie>=s},blit(t){if(j||e.hasFailed())return!1;let r=n.createCommandEncoder({label:`buddhabrot-blit`}),i=r.beginRenderPass({colorAttachments:[{view:t.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});return i.setPipeline(D),i.setBindGroup(0,re),i.draw(3),i.end(),n.queue.submit([r.finish()]),!0},async toBitmapAndBlob(){let t=new OffscreenCanvas(a,a),r=t.getContext(`webgpu`);if(r.configure({device:n,format:e.preferredFormat,alphaMode:`premultiplied`}),!this.blit(r))throw Error(`Buddhabrot generator cannot blit: GPU context is destroyed or has failed.`);return{bitmap:await createImageBitmap(t),blobPromise:t.convertToBlob({type:`image/png`}).catch(e=>(console.warn(`[buddhabrot] PNG encode failed; texture will not be cached`,e),null))}},destroy(){j=!0,n.queue.onSubmittedWorkDone().finally(()=>{h.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy()})}}}var D=`mandelbrot-skipping`,O=`textures`;function k(e){let t=e.matchMedia(`(pointer: coarse)`).matches,n=Math.min(e.screen.width,e.screen.height);return t&&n<=820?2048:4096}function A(e){return`buddhabrot:v3:${e}`}async function re(e,t){try{return await t.get(A(e))}catch{return null}}async function ie(e,t,n){let r=A(e);try{await n.put(r,t)}catch{return!1}return await ae(r,n),!0}async function ae(e,t){try{let n=await t.keys();await Promise.all(n.filter(t=>t.startsWith(`buddhabrot:`)&&t!==e).map(e=>t.delete(e).catch(()=>{})))}catch{}}function j(e){return new Promise((t,n)=>{let r=e.open(D,1);r.onupgradeneeded=()=>{r.result.objectStoreNames.contains(O)||r.result.createObjectStore(O)},r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error),r.onblocked=()=>n(Error(`IndexedDB open blocked`))})}function oe(e){return{async get(t){let n=await j(e);try{return await new Promise((e,r)=>{let i=n.transaction(O,`readonly`).objectStore(O).get(t);i.onsuccess=()=>e(i.result??null),i.onerror=()=>r(i.error)})}finally{n.close()}},async put(t,n){let r=await j(e);try{await new Promise((e,i)=>{let a=r.transaction(O,`readwrite`);a.objectStore(O).put(n,t),a.oncomplete=()=>e(),a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{r.close()}},async keys(){let t=await j(e);try{return await new Promise((e,n)=>{let r=t.transaction(O,`readonly`).objectStore(O).getAllKeys();r.onsuccess=()=>e(r.result.map(String)),r.onerror=()=>n(r.error)})}finally{t.close()}},async delete(t){let n=await j(e);try{await new Promise((e,r)=>{let i=n.transaction(O,`readwrite`);i.objectStore(O).delete(t),i.oncomplete=()=>e(),i.onerror=()=>r(i.error),i.onabort=()=>r(i.error)})}finally{n.close()}}}}var se=.29,ce=2e6,M=5400,le=4200;function ue(e,t,n=Math.random){return{x:36+n()*Math.max(8,e-72),y:36+n()*Math.max(8,t-72)}}function N(e,t){let n=e-.25,r=n*n+t*t;if(r*(r+n)<=.25*t*t)return!0;let i=e+1;if(i*i+t*t<=.0625)return!0;let a=e+.125,o=Math.abs(t);return a*a+(o-.745)*(o-.745)<=.009}function de(e=Math.random){for(let t=0;t<48;t++){let t=e(),n,r;if(t<.5)n=-2.2+e()*3.4,r=-1.5+e()*3;else if(t<.78){let t=e()*Math.PI*2,i=.5*(1-Math.cos(t))+.002+e()*.045;n=.25+i*Math.cos(t),r=i*Math.sin(t)}else n=-2+e()*1.4,r=(e()-.5)*.35;if(N(n,r))continue;let i=0,a=0,o=!1;for(let e=1;e<=8e3;e++){let t=i*i-a*a+n,s=2*i*a+r;if(i=t,a=s,i*i+a*a>4){e>=8&&(o=!0);break}}if(o)return{x:n,y:r}}return{x:-.75+(e()-.5)*.05,y:.18+(e()-.5)*.05}}var fe={drawLines:!0,grayscale:!1,energy:.01,hiddenSteps:0,liveGain:1,contrast:.72,atlasGain:1},pe={drawLines:!1,grayscale:!0,energy:.28,hiddenSteps:1,liveGain:.12,contrast:1.22,atlasGain:1},P=.12,F=.055;function me(e){return e===`intro`?{pondGain:0,throwGain:1,coneEnabled:!1}:e===`aiming`?{pondGain:P,throwGain:0,coneEnabled:!0}:{pondGain:0,throwGain:1,coneEnabled:!1}}function he(e,t=18){let n=(e/Math.max(t,1e-5)%1+1)%1,r=n<.5?n*2:2-n*2,i=r*r*(3-2*r);return{zCamera:.07+i*.86,sliceHalf:F,zoom:1+i*.42}}var I=[1e4,25e3,5e4,1e5,25e4,5e5,1e6,2e6,5e6,1e7,2e7,5e7,1e8,2e8,5e8,1e9,2e9],L=.5;function ge(e){let t=Math.round((Number(e)||10)*10)/10;return Math.max(L,Math.min(18,t))}function _e(e,t,n,r){let i=Math.max(0,Math.min(1,e/Math.max(t,1)))**+r*Math.max(0,n-4);return Math.min(n,Math.max(4,Math.floor(4+i)))}var ve={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5};function ye(e,t=!1){return t?1:Math.min(Math.max(e,1),2)}function R(e,t,n){let r=ye(n);return{width:Math.max(1,Math.round(e*r)),height:Math.max(1,Math.round(t*r)),dpr:r}}var be=.8;function xe(e,t,n){return e.halfY*t/Math.max(n,1)}function Se(e,t,n){return n?{x:t,y:-e}:{x:e,y:t}}function z(e,t,n){return n?{dx:-t,dy:e}:{dx:e,dy:t}}function B(e,t,n,r,i,a=!1){let o=z((e/n*2-1)*xe(i,n,r),(1-t/r*2)*i.halfY,a);return{x:i.centerX+o.dx,y:i.centerY+o.dy}}function V(e,t,n,r,i,a=!1){let o=xe(i,n,r),s=Se(e-i.centerX,t-i.centerY,a);return{x:(s.x/o+1)*n*.5,y:(1-s.y/i.halfY)*r*.5}}function Ce(e,t,n,r,i,a=!1){let o=Se(e-n.centerX,t-n.centerY,a);return{x:o.x/xe(n,r,i),y:o.y/n.halfY}}function we(e,t,n=be){return e*n/Math.max(t,1e-6)}function Te(e,t,n,r,i,a,o=!1){let s=B(e,t,n,r,i,o);return V(s.x,s.y,n,r,a,o)}function Ee(e,t,n,r,i,a,o,s,c=!1){let l=Te(e,t,i,a,o,s,c),u=Te(e+n,t+r,i,a,o,s,c);return{x:u.x-l.x,y:u.y-l.y}}function De(e,t,n,r){let i=xe(e,t,n),a=r?e.halfY:i,o=r?i:e.halfY;return{xMin:e.centerX-a,xMax:e.centerX+a,yMin:e.centerY-o,yMax:e.centerY+o}}var H=.035,U=2.4,Oe=-8,W=8,ke=-Math.PI,Ae=Math.PI;function je(e){return e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12).trim()||`YOU`}function Me(e){return`${je(e)}'s`}function G(e,t,n){let r=Math.max(0,Math.min(1,(e-t)/(n-t)));return Math.round(r*65535)}function Ne(e,t,n){return t+e/65535*(n-t)}function K(e){let t=``;for(let n of e)t+=String.fromCharCode(n);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/g,``)}function Pe(e){if(!/^[A-Za-z0-9_-]+$/.test(e))return null;let t=e+`=`.repeat((4-e.length%4)%4);try{let e=atob(t.replace(/-/g,`+`).replace(/_/g,`/`));return Uint8Array.from(e,e=>e.charCodeAt(0))}catch{return null}}function q(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null}function Fe(e){return!Number.isFinite(e.view.centerX)||!Number.isFinite(e.view.centerY)||!Number.isFinite(e.view.halfY)||!Number.isFinite(e.angle)||!Number.isFinite(e.power)||e.power<=0||e.power>1||e.skips<2||e.skips>15||e.skips!==Math.round(e.skips)||e.glyph<0||e.glyph>=7||e.glyph!==Math.round(e.glyph)||e.sourceDots<6||e.sourceDots>32||e.sourceDots!==Math.round(e.sourceDots)||e.view.halfY<.035||e.view.halfY>2.4?null:{version:1,view:e.view,rotateRight:e.rotateRight,angle:e.angle,power:e.power,skips:e.skips,glyph:e.glyph,seed:e.seed|0,sourceDots:e.sourceDots,name:je(e.name??`YOU`)}}function Ie(e){let t=e.split(`_`);if(t.length!==11)return null;let n=q(t[0]),r=q(t[1]),i=q(t[2]),a=q(t[3]),o=q(t[4]),s=q(t[5]),c=q(t[6]),l=q(t[7]),u=q(t[8]),d=q(t[9]),f=q(t[10]);return n!==1||r==null||i==null||a==null||o==null||s==null||c==null||l==null||u==null||d==null||f==null||o!==0&&o!==1?null:Fe({view:{centerX:r,centerY:i,halfY:a},rotateRight:o===1,angle:s,power:c,skips:l,glyph:u,seed:d,sourceDots:f})}function J(e){let t=Pe(e);if(!t||t.length<20)return null;let n=new DataView(t.buffer,t.byteOffset,t.byteLength);if(n.getUint8(0)!==2)return null;let r=n.getUint8(19);if(t.length!==20+r)return null;let i=new TextDecoder().decode(t.subarray(20,20+r));return Fe({view:{centerX:Ne(n.getUint16(1),Oe,W),centerY:Ne(n.getUint16(3),Oe,W),halfY:Ne(n.getUint16(5),H,U)},rotateRight:(n.getUint8(11)&1)==1,angle:Ne(n.getUint16(7),ke,Ae),power:Ne(n.getUint16(9),0,1),skips:n.getUint8(12),glyph:n.getUint8(13),sourceDots:n.getUint8(14),seed:n.getInt32(15),name:i})}function Le(e){let t=je(e.name),n=new TextEncoder().encode(t),r=new Uint8Array(20+n.length),i=new DataView(r.buffer);return i.setUint8(0,2),i.setUint16(1,G(e.view.centerX,Oe,W)),i.setUint16(3,G(e.view.centerY,Oe,W)),i.setUint16(5,G(e.view.halfY,H,U)),i.setUint16(7,G(e.angle,ke,Ae)),i.setUint16(9,G(e.power,0,1)),i.setUint8(11,+!!e.rotateRight),i.setUint8(12,e.skips),i.setUint8(13,e.glyph),i.setUint8(14,e.sourceDots),i.setInt32(15,e.seed|0),i.setUint8(19,n.length),r.set(n,20),K(r)}function Re(e){return e?e.includes(`_`)&&e.startsWith(`1_`)?Ie(e):J(e):null}function Y(e){let t=e.hash.startsWith(`#`)?e.hash.slice(1):e.hash,n=new URLSearchParams(t).get(`t`),r=new URLSearchParams(e.search).get(`t`),i=n??r;return i?Re(i):null}function ze(e,t){let n=new URL(e);return n.searchParams.delete(`t`),n.hash=`t=${Le(t)}`,n.toString()}var Be=7,Ve=[2,2,2,4,2,3,7],He=6,Ue=32,We=4096,Ge=4096,X=I[I.length-1],Z=.05,Ke=.05,qe=8,Je=10,Ye=50,Xe=[[80,214,255],[92,255,196],[186,255,120],[255,230,110],[255,168,92],[255,122,186],[196,146,255]].map(([e,t,n])=>`vec3f(${(e/255).toFixed(5)}, ${(t/255).toFixed(5)}, ${(n/255).toFixed(5)})`).join(`, `),Q={sourceDots:18,maxDepth:2e6,acceleration:10,linePersist:.6,previewOrbits:!1,previewIterations:20,skipColors:!0,coordinateAxes:!1,rotateRight:!0,doublePixels:!1},Ze=`mandelbrot-skipping:tuning:v5`,Qe=10,$e=.3,et=.16,tt=4e5,nt=0,rt=6,it=25e3,at=it+We,ot=32,st=ot*ot/32,ct=(ot*ot-1)/12,lt=4,ut=2,$=`mandelbrot-skipping:scores:v2`,dt=`mandelbrot-skipping:scores:v1`,ft=Math.PI*2,pt={x:-.58,y:0},mt=.8,ht={x:-.55,y:0},gt=1.52,_t=1.6,vt=1.15,yt=[[0,2,3,5,7,9,10],[0,1,4,6,7,10],[0,2,4,6,8,10],[0,3,5,7,10],[0,1,5,7,8]],bt=`
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
`;function Et(e){return Math.round(e).toLocaleString()}function Dt(e){let t=e.distinct;if(!t)return{area:0,coverage:0,spread:0,elongation:0,orientation:0,density:0,centroidX:0,centroidY:0};let n=e.sumX/t,r=e.sumY/t,i=Math.max(0,e.sumXX/t-n*n),a=Math.max(0,e.sumYY/t-r*r),o=e.sumXY/t-n*r,s=Math.max(0,i*a-o*o),c=Math.sqrt((i-a)**2+4*o*o),l=Math.max(0,(i+a+c)*.5),u=Math.max(0,(i+a-c)*.5),d=Math.min(1,Math.sqrt(s)/ct),f=Math.min(1,Math.log2(1+t)/Math.log2(1+ot*ot)),p=l>.001?Math.min(1,1-Math.sqrt(u/l)):0,m=.5*Math.atan2(2*o,i-a),h=Math.max(1,Math.min(ot*ot,4*Math.PI*Math.sqrt(s))),g=Math.min(1,t/h);return{area:d,coverage:f,spread:Math.sqrt(d),elongation:p,orientation:m,density:g,centroidX:n/(ot-1)*2-1,centroidY:r/(ot-1)*2-1}}function Ot(e,t){let n=Math.min(t,X),r=Dt(e),i=n*.03+Math.sqrt(n)*75,a=8e4*r.coverage,o=12e4*r.spread*Math.min(1,e.distinct/24);return Math.round((i+a+o)*(1+(e.skip-1)*.12))}function kt(e){let t=e|0;return()=>(t^=t<<13,t^=t>>>17,t^=t<<5,(t>>>0)/4294967296)}function At(e){return e>=1e9?`${e/1e9}B`:e>=1e6?`${e/1e6}M`:e>=1e3?`${e/1e3}K`:String(e)}function jt(e,t){let n=Math.max(0,Math.min(.05,e));return t<=0?0:n===0?1:Z**+(n/t)}function Mt(e){let t=Math.round(Number(e?.sourceDots)),n=t>=He?Math.min(Ue,t):Q.sourceDots,r=Number(e?.maxDepth),i=I.includes(r)?r:Q.maxDepth,a=ge(e?.acceleration??10),o=Math.max(Ke,Math.min(qe,Math.round((Number(e?.linePersist)||Q.linePersist)*20)/20)),s=e?.previewOrbits===!0,c=e?.skipColors!==!1,l=e?.coordinateAxes===!0,u=e?.rotateRight!==!1,d=e?.doublePixels===!0,f=Math.round(Number(e?.previewIterations)||Q.previewIterations);return{sourceDots:n,maxDepth:i,acceleration:a,linePersist:o,previewOrbits:s,previewIterations:Math.max(Je,Math.min(Ye,f)),skipColors:c,coordinateAxes:l,rotateRight:u,doublePixels:d}}function Nt(){try{return Mt(JSON.parse(localStorage.getItem(Ze)||`null`))}catch{return Q}}function Pt(e){try{localStorage.setItem(Ze,JSON.stringify(e))}catch{}}function Ft(e,t){let n=(t%1+1)%1*e.length,r=Math.floor(n)%e.length,i=n-Math.floor(n),a=e[r],o=e[(r+1)%e.length];return{x:a.x+(o.x-a.x)*i,y:a.y+(o.y-a.y)*i}}function It(e,t=-Math.PI/2){return Array.from({length:e},(n,r)=>({x:Math.cos(t+r*ft/e),y:Math.sin(t+r*ft/e)}))}function Lt(e,t,n){let r=(e,t,r)=>({x:e+Math.cos(n*ft-Math.PI/2)*r,y:t+Math.sin(n*ft-Math.PI/2)*r});switch(e%Be){case 0:return r(0,0,t===0?1:.46);case 1:return t===0?Ft(It(3),n):r(0,0,.48);case 2:return r(t===0?-.32:.32,0,.68);case 3:{let e=t*Math.PI/2;return r(Math.cos(e)*.43,Math.sin(e)*.43,.52)}case 4:{if(t===1)return r(0,0,.34);let e=It(5);return Ft([e[0],e[2],e[4],e[1],e[3]],n)}case 5:return t<2?Ft(It(3,-Math.PI/2+t*Math.PI),n):r(0,0,.34);default:{if(t===0)return r(0,0,.42);let e=(t-1)*ft/6-Math.PI/2;return r(Math.cos(e)*.42,Math.sin(e)*.42,.42)}}}function Rt(e,t,n,r,i,a,o,s){let c=[],l=Ve[o%Ve.length];for(let u=0;u<a;u++){let d=u%l,f=Math.floor(u/l),p=Math.ceil((a-d)/l),m=Lt(o,d,f/Math.max(p,1)),h=B(e+m.x*Qe,t+m.y*Qe,n,r,i,s);c.push({x:Math.fround(h.x),y:Math.fround(h.y)})}return c}function zt(){try{let e=JSON.parse(localStorage.getItem($)||`null`),t=(e,t=!1)=>e.flatMap(e=>{if(!e||typeof e!=`object`)return[];let n=e;return typeof n.id==`string`&&typeof n.name==`string`&&n.name.length<=12&&Number.isFinite(n.score)&&Number.isFinite(n.deepest)&&Number.isFinite(n.skips)&&typeof n.createdAt==`string`?[{id:n.id,name:n.name,score:t?Math.round(n.score/100):n.score,deepest:n.deepest,skips:n.skips,coverage:Number.isFinite(n.coverage)?n.coverage:0,spread:Number.isFinite(n.spread)?n.spread:0,createdAt:n.createdAt}]:[]}).slice(0,10);if(e?.version===2&&Array.isArray(e.entries))return t(e.entries);let n=JSON.parse(localStorage.getItem(dt)||`null`);if(n?.version!==1||!Array.isArray(n.entries))return[];let r=t(n.entries,!0);return Bt(r),r}catch{return[]}}function Bt(e){try{localStorage.setItem($,JSON.stringify({version:2,entries:e}))}catch{}}async function Vt(e,t){let n=t.device,r=e.getContext(`webgpu`),i=t.preferredFormat;r.configure({device:n,format:i,alphaMode:`opaque`});let a=globalThis.GPUBufferUsage,o=globalThis.GPUTextureUsage,s=n.createBuffer({size:tt*16,usage:a.STORAGE|a.VERTEX}),c=n.createBuffer({size:at*48,usage:a.STORAGE}),l=n.createBuffer({size:We*48,usage:a.STORAGE|a.COPY_DST}),u=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),d=n.createBuffer({size:16,usage:a.STORAGE|a.COPY_DST|a.INDIRECT}),f=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),p=n.createBuffer({size:80,usage:a.UNIFORM|a.COPY_DST}),g=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),_=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),v=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),y=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),b=n.createBuffer({size:16,usage:a.UNIFORM|a.COPY_DST}),x=n.createBuffer({size:128,usage:a.UNIFORM|a.COPY_DST}),S=n.createSampler({magFilter:`nearest`,minFilter:`nearest`}),C=n.createShaderModule({code:bt}),ee=n.createShaderModule({code:xt}),w=n.createShaderModule({code:St}),T=n.createShaderModule({code:wt}),te=n.createShaderModule({code:Tt}),E=n.createComputePipeline({layout:`auto`,compute:{module:C,entryPoint:`main`}}),ne=n.createRenderPipeline({layout:`auto`,vertex:{module:ee,entryPoint:`vs`,buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:`float32x2`},{shaderLocation:1,offset:8,format:`float32`},{shaderLocation:2,offset:12,format:`float32`}]}]},fragment:{module:ee,entryPoint:`fs`,targets:[{format:`rgba16float`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`point-list`}}),D=n.createRenderPipeline({layout:`auto`,vertex:{module:w,entryPoint:`vs`},fragment:{module:w,entryPoint:`fs`,targets:[{format:`rgba8unorm`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`max`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`line-list`}}),O=n.createRenderPipeline({layout:`auto`,vertex:{module:T,entryPoint:`vs`},fragment:{module:T,entryPoint:`fadeFs`,targets:[{format:`rgba16float`}]},primitive:{topology:`triangle-list`}}),k=n.createRenderPipeline({layout:`auto`,vertex:{module:T,entryPoint:`vs`},fragment:{module:T,entryPoint:`fadeFs`,targets:[{format:`rgba8unorm`}]},primitive:{topology:`triangle-list`}}),A=n.createRenderPipeline({layout:`auto`,vertex:{module:te,entryPoint:`vs`},fragment:{module:te,entryPoint:`displayFs`,targets:[{format:i}]},primitive:{topology:`triangle-list`}}),re=n.createBindGroup({layout:E.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:l}},{binding:3,resource:{buffer:u}},{binding:4,resource:{buffer:c}},{binding:5,resource:{buffer:d}}]}),ie=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:f}},{binding:2,resource:{buffer:v}}]}),ae=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:v}}]}),j=n.createBindGroup({layout:ne.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:v}}]}),oe=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:f}}]}),ce=n.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:g}},{binding:2,resource:{buffer:p}}]}),M=0,le=0,ue=0,N=!1,de=!1,pe=!1,P=[],F=[],I=[],L=null,ge=null,_e=[],be=[],xe=[],Se=[],z=0,B=0,V=0,Ce=0,we=1,Te=1,Ee={centerX:ht.x,centerY:ht.y,halfY:gt},H=Q.maxDepth,U=Q.acceleration,Oe=Q.linePersist,W=Q.skipColors,ke=Q.rotateRight,Ae=Q.doublePixels,je=fe.drawLines,Me=fe.grayscale,G=fe.energy,Ne=fe.hiddenSteps,K=fe.liveGain,Pe=fe.contrast,q=me(`intro`),Fe=q.pondGain,Ie=q.throwGain,J=null,Le=!1,Re=`pond`,Y={...ve},ze={...ve},Be=0,Ve=e=>n.createTexture({size:[V,Ce],format:e,usage:o.RENDER_ATTACHMENT|o.TEXTURE_BINDING});function He(e,t){for(let n of t)n&&e.beginRenderPass({colorAttachments:[{view:n.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end()}function Ue(e,t,r){return e.map(e=>n.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:0,resource:e.createView()},{binding:1,resource:S},{binding:2,resource:{buffer:t}}]}))}function Ge(){Se=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++)Se[e*2+t]=n.createBindGroup({layout:A.getBindGroupLayout(0),entries:[{binding:0,resource:P[e].createView()},{binding:1,resource:F[t].createView()},{binding:2,resource:I[t].createView()},{binding:3,resource:L.createView()},{binding:4,resource:ge.createView()},{binding:5,resource:S},{binding:6,resource:{buffer:x}}]})}function X(e,t){let r=Re===`pond`?Y:ze,i=new ArrayBuffer(80),a=new Uint32Array(i),o=new Float32Array(i);a[0]=M,a[1]=Math.max(1,Math.floor(tt/Math.max(M,1))),a[2]=H,a[3]=je?Math.max(1,Math.floor(it/Math.max(M,1))):0,o[4]=Ee.centerX,o[5]=Ee.centerY,o[6]=Ee.halfY*V/Math.max(Ce,1),o[7]=Ee.halfY,o[8]=V,o[9]=Ce,o[10]=+!!ke,o[11]=U,o[12]=t,o[13]=Ne,o[16]=r.xMin,o[17]=r.xMax,o[18]=r.yMin,o[19]=r.yMax,n.queue.writeBuffer(e,0,i)}function Z(){let t=e.getBoundingClientRect(),r=R(t.width,t.height,ye(globalThis.devicePixelRatio||1,Ae));if(we=Math.max(1,t.width),Te=Math.max(1,t.height),P.length&&r.width===V&&r.height===Ce)return;V=r.width,Ce=r.height,e.width=V,e.height=Ce;for(let e of[...P,...F,...I,L,ge])e?.destroy();P=[0,1].map(()=>Ve(`rgba16float`)),F=[0,1].map(()=>Ve(`rgba16float`)),I=[0,1].map(()=>Ve(`rgba8unorm`)),L=Ve(`rgba16float`),ge=Ve(`rgba8unorm`),_e=Ue(P,y,O),be=Ue(F,y,O),xe=Ue(I,b,k),Ge();let i=n.createCommandEncoder({label:`orbit-resize`});He(i,P),He(i,F),He(i,I),He(i,[L,ge]),n.queue.submit([i.finish()]),z=0,B=0}let Ke=new ResizeObserver(Z);Ke.observe(e),Z();function qe(){N||ue||(ue=requestAnimationFrame(Je))}function Je(){if(ue=0,N||t.hasFailed()||!P.length||pe)return;let e=performance.now(),i=Be?(e-Be)/1e3:1/60;Be=e;let a=jt(i,Oe);X(f,0),X(p,1);let o=Le?he(e/1e3):{zCamera:0,sliceHalf:1,zoom:1};n.queue.writeBuffer(g,0,new Float32Array([G,+!!Me,+!!W,0])),n.queue.writeBuffer(_,0,new Float32Array([Math.min(1.2,G*4.2),+!!Me,+!!W,1])),n.queue.writeBuffer(v,0,new Float32Array([o.zCamera,o.sliceHalf,o.zoom,0])),n.queue.writeBuffer(u,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(d,0,new Uint32Array([0,1,0,0])),n.queue.writeBuffer(y,0,new Float32Array([1,0,0,0])),n.queue.writeBuffer(b,0,new Float32Array([a,0,0,0]));let c=new Float32Array(32);c[0]=Ee.centerX,c[1]=Ee.centerY,c[2]=Ee.halfY*V/Math.max(Ce,1),c[3]=Ee.halfY,c[4]=+!!ke,c[5]=+!!je,c[6]=Le?0:K,c[7]=Pe,c[8]=Y.xMin,c[9]=Y.xMax,c[10]=Y.yMin,c[11]=Y.yMax,c[12]=ze.xMin,c[13]=ze.xMax,c[14]=ze.yMin,c[15]=ze.yMax,c[16]=Fe,c[17]=Ie,c[18]=+!!J,c[19]=se,c[20]=J?.apexX??0,c[21]=J?.apexY??0,c[22]=J?.directionX??0,c[23]=J?.directionY??0,c[24]=J?.range??0,c[25]=.04,c[26]=we,c[27]=Te,n.queue.writeBuffer(x,0,c);let l=n.createCommandEncoder({label:`orbit-draw`});if(M>0&&!de){let e=l.beginComputePass();e.setPipeline(E),e.setBindGroup(0,re),e.dispatchWorkgroups(Math.ceil(M/64)),e.end()}let m=P[1-z],h=F[1-B],S=I[1-B];if(Re===`pond`){let e=l.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(O),e.setBindGroup(0,_e[z]),e.draw(3),e.end()}else{let e=l.beginRenderPass({colorAttachments:[{view:h.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(O),e.setBindGroup(0,be[B]),e.draw(3),e.end();let t=l.beginRenderPass({colorAttachments:[{view:S.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});t.setPipeline(k),t.setBindGroup(0,xe[B]),t.draw(3),t.end()}if(l.beginRenderPass({colorAttachments:[{view:L.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),l.beginRenderPass({colorAttachments:[{view:ge.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),M>0&&!de){let e=Re===`pond`?m:h,t=l.beginRenderPass({colorAttachments:[{view:e.createView(),loadOp:`load`,storeOp:`store`}]});if(t.setPipeline(ne),t.setBindGroup(0,ae),t.setVertexBuffer(0,s),t.drawIndirect(u,0),t.end(),Le&&Re===`pond`){let e=l.beginRenderPass({colorAttachments:[{view:F[B].createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(ne),e.setBindGroup(0,j),e.setVertexBuffer(0,s),e.drawIndirect(u,0),e.end()}let n=l.beginRenderPass({colorAttachments:[{view:L.createView(),loadOp:`load`,storeOp:`store`}]});n.setPipeline(ne),n.setBindGroup(0,ie),n.setVertexBuffer(0,s),n.drawIndirect(u,0),n.end();let r=l.beginRenderPass({colorAttachments:[{view:ge.createView(),loadOp:`load`,storeOp:`store`}]});if(r.setPipeline(D),r.setBindGroup(0,oe),r.drawIndirect(d,0),r.end(),Re===`throw`&&je){let e=l.beginRenderPass({colorAttachments:[{view:S.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(D),e.setBindGroup(0,ce),e.drawIndirect(d,0),e.end()}}Re===`pond`?z=1-z:B=1-B;let C=l.beginRenderPass({colorAttachments:[{view:r.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:1}}]});C.setPipeline(A),C.setBindGroup(0,Se[z*2+B]),C.draw(3),C.end(),n.queue.submit([l.finish()]),qe()}return qe(),{spawn(e,t,r=We){de=!1;let i=new Float32Array(e.length*12),a=new Uint32Array(i.buffer);e.forEach((e,n)=>{let r=n*12;i[r+2]=e.x,i[r+3]=e.y,i[r+4]=t,a[r+7]=1});let o=m(le,M,e.length,r);n.queue.writeBuffer(l,o.start*48,i.buffer,i.byteOffset,i.byteLength),le=o.nextSource,M=o.sourceCount},spawnAppend(e,t,r=We){de=!1;let i=h(M,e.length,r);if(i.added<=0)return this.spawn(e,t,r),e.length;let a=e.slice(0,i.added),o=new Float32Array(a.length*12),s=new Uint32Array(o.buffer);return a.forEach((e,n)=>{let r=n*12;o[r+2]=e.x,o[r+3]=e.y,o[r+4]=t,s[r+7]=1}),n.queue.writeBuffer(l,i.start*48,o.buffer,o.byteOffset,o.byteLength),le=i.nextSource,M=i.sourceCount,i.added},setView(e){Ee={...e}},setTuning(e){H=e.maxDepth,U=e.acceleration,Oe=e.linePersist,W=e.skipColors===!0,ke=e.rotateRight===!0;let t=e.doublePixels===!0;t!==Ae&&(Ae=t,Z())},setAtmosphere(e){je=e.drawLines,Me=e.grayscale,G=e.energy,Ne=e.hiddenSteps,K=e.liveGain,Pe=e.contrast},setLayer(e){Re=e},setDisplay(e){Fe=e.pondGain,Ie=e.throwGain,J=e.cone,we=e.cssWidth,Te=e.cssHeight,Le=e.mri===!0},beginThrow(e,t,n,r){Ee={...e},ze=De(e,t,n,r),Re=`throw`,this.clear()},clearPond(){if(!P.length)return;let e=n.createCommandEncoder({label:`orbit-clear-pond`});He(e,P),n.queue.submit([e.finish()])},clear(){if(de=!1,M=0,le=0,n.queue.writeBuffer(l,0,new Uint8Array(We*48)),!F.length)return;let e=n.createCommandEncoder({label:`orbit-clear-throw`});He(e,F),He(e,I),He(e,[L,ge].filter(Boolean)),n.queue.submit([e.finish()])},freeze(){de=!0},setSuspended(e){pe=e,e||qe()},destroy(){N=!0,cancelAnimationFrame(ue),Ke.disconnect(),P.forEach(e=>e.destroy()),F.forEach(e=>e.destroy()),I.forEach(e=>e.destroy()),L?.destroy(),ge?.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),g.destroy(),_.destroy(),v.destroy(),y.destroy(),b.destroy(),x.destroy()}}}function Ht(){let e=(0,r.useRef)(null),t=(0,r.useRef)(null),n=(0,r.useRef)(null),a=(0,r.useRef)(null),s=(0,r.useRef)({centerX:ht.x,centerY:ht.y,halfY:gt}),u=(0,r.useRef)(()=>{}),f=(0,r.useRef)(()=>{}),m=(0,r.useRef)(`YOU`),h=(0,r.useRef)({...Q}),g=(0,r.useRef)(()=>{}),_=(0,r.useRef)(()=>{}),v=(0,r.useRef)(!1),y=(0,r.useRef)(0),b=(0,r.useRef)(!1),x=(0,r.useRef)(()=>{}),S=(0,r.useRef)(null),C=(0,r.useRef)(void 0),ee=(0,r.useRef)(null),w=(0,r.useRef)(!1),T=(0,r.useRef)(null),te=(0,r.useRef)(()=>{}),[E,D]=(0,r.useState)(null),[O,A]=(0,r.useState)(!1),[ae,j]=(0,r.useState)(!1),[N,P]=(0,r.useState)(!1),[F,he]=(0,r.useState)(!1),[ge,ye]=(0,r.useState)(!1),[R,be]=(0,r.useState)(`YOU`),[xe,Se]=(0,r.useState)(``),[z,H]=(0,r.useState)(null),[U,Oe]=(0,r.useState)({phase:`ready`,score:0,skips:0,deepest:0,progress:0,coverage:0,spread:0}),[W,ke]=(0,r.useState)([]),[Ae,je]=(0,r.useState)(`YOU`),[G,Ne]=(0,r.useState)(null),[K,Pe]=(0,r.useState)({...Q});(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>ke(zt()));return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>{let e=Nt();h.current=e,Pe(e),n.current?.setTuning(e)});return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let t=e.current;if(!t)return;let r=!1,o=i(H);return a.current=o,o.then(async e=>{if(!e)return;if(r){e.destroy();return}let i=await Vt(t,e);if(r){i?.destroy();return}n.current=i,i?.setView(s.current),i?.setTuning(h.current),v.current?(i?.setTuning({...h.current,maxDepth:ce}),i?.setAtmosphere(pe),i?.setLayer(`pond`),i?.setDisplay({...me(`intro`),cone:null,cssWidth:1,cssHeight:1,mri:!0})):(i?.setAtmosphere(fe),i?.setLayer(`throw`),i?.setDisplay({...me(`play`),cone:null,cssWidth:1,cssHeight:1}))}).catch(()=>H(`Orbit renderer could not start. Throwing remains playable.`)),()=>{r=!0,n.current?.destroy(),n.current=null,a.current=null,o.then(e=>e?.destroy()).catch(()=>{})}},[]),(0,r.useEffect)(()=>{let e=Y(window.location),t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;j(!0),!(e||t)&&(v.current=!0,w.current=!0,y.current=0,b.current=!1,D({progress:0}))},[]);let q=(0,r.useCallback)(()=>{b.current||(b.current=!0,A(!0),window.setTimeout(()=>{v.current=!1,w.current=!1,y.current=0,b.current=!1,n.current?.setAtmosphere(fe),n.current?.setLayer(`throw`),n.current?.setDisplay({...me(`play`),cone:null,cssWidth:1,cssHeight:1}),n.current?.setTuning(h.current),f.current({centerX:pt.x,centerY:pt.y,halfY:mt}),u.current(),D(null),A(!1)},600))},[]);x.current=q;let Fe=(0,r.useCallback)(()=>{v.current||(v.current=!0,w.current=!0,y.current=0,b.current=!1,n.current?.clearPond(),n.current?.clear(),n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:ce}),n.current?.setAtmosphere(pe),n.current?.setDisplay({...me(`intro`),cone:null,cssWidth:1,cssHeight:1,mri:!0}),f.current({centerX:ht.x,centerY:ht.y,halfY:gt}),u.current(),A(!1),D({progress:0}))},[]);(0,r.useEffect)(()=>{if(!ae||E)return;C.current===void 0&&(C.current=Y(window.location));let e=C.current;if(!e)return;let t=0,n=()=>{if(C.current===e){if(!ee.current){t=window.setTimeout(n,50);return}C.current=null,ee.current(e,!0)}};return t=window.setTimeout(n,400),()=>window.clearTimeout(t)},[ae,E]);let Ie=(0,r.useCallback)(e=>{let t=e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12);m.current=t,je(t),S.current&&={...S.current,name:t||`YOU`},be(t||`YOU`);let n=G;n&&ke(e=>{let r=e.map(e=>e.id===n?{...e,name:t||`YOU`}:e);return Bt(r),r})},[G]),J=(0,r.useCallback)(e=>{let t=Mt({...h.current,...e});h.current=t,Pe(t),Pt(t),n.current?.setTuning(t),_.current(),g.current()},[]);(0,r.useEffect)(()=>{let e=t.current;if(!e)return;let r=e.getContext(`2d`);if(!r)return;let i=1,o=1,c=1,l=0,x=performance.now(),C=0,E=`ready`,O=-1,A=`none`,ae={x:0,y:0},j={...s.current},N={x:0,y:0},F=0,I=0,L=0,ge=0,R={x:0,y:0,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},xe=2,Se=[],z=[],H=[],U=null,W=null,Ae=0,je=0,Me=0,G=0,K=0,q=new Map,Fe=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,Ie=document.createElement(`canvas`),J=Ie.getContext(`2d`),Le=!0,Re=document.createElement(`canvas`),Y=Re.getContext(`2d`),We=document.createElement(`canvas`),X=We.getContext(`2d`),Z=!0,Ke=null,qe=[],Je=[],Ye=0,Xe=0,Q=0,Ze=!1,Qe=0,rt=``;g.current=()=>{Z=!0},_.current=()=>{Le=!0};let it=!1;(async()=>{try{let e=k(window),t=oe(indexedDB),n=await re(e,t);if(n){if(it)return;Ke=await createImageBitmap(n),Z=!0;return}let r=await a.current;if(!r||it)return;let i=ne(r,{size:e});if(await new Promise(e=>{let t=()=>{if(it){i.destroy(),e();return}if(i.step(1/60),i.isComplete()){e();return}requestAnimationFrame(t)};requestAnimationFrame(t)}),it){i.destroy();return}let{bitmap:o,blobPromise:s}=await i.toBitmapAndBlob();if(i.destroy(),it){o.close();return}Ke=o,Z=!0;let c=await s;c&&!it&&await ie(e,c,t)}catch{}})();function at(){return{x:i*.5,y:o*.82}}function ct(){return Math.min(i,o)}function $(){return we(ct(),s.current.halfY)}function dt(){let t=e.getBoundingClientRect();if(i=Math.max(1,t.width),o=Math.max(1,t.height),c=Math.min(window.devicePixelRatio||1,2),e.width=Math.round(i*c),e.height=Math.round(o*c),r.setTransform(c,0,0,c,0,0),Ie.width=Math.round(i*c),Ie.height=Math.round(o*c),J?.setTransform(c,0,0,c,0,0),Le=!0,Re.width=Math.round(i*c),Re.height=Math.round(o*c),Y?.setTransform(c,0,0,c,0,0),Z=!0,We.width=Math.round(i*c),We.height=Math.round(o*c),X?.setTransform(c,0,0,c,0,0),rt=``,E===`ready`||E===`aiming`||E===`result`){let e=at();R.x=e.x,R.y=e.y,E!==`aiming`&&(N={...e})}}function mt(){return U||=new AudioContext,U.state===`suspended`&&U.resume(),U}function ht(e,t=.08,n=.05){try{let r=mt(),i=r.createOscillator(),a=r.createGain();i.type=`triangle`,i.frequency.value=e,a.gain.setValueAtTime(n,r.currentTime),a.gain.exponentialRampToValueAtTime(1e-4,r.currentTime+t),i.connect(a).connect(r.destination),i.start(),i.stop(r.currentTime+t)}catch{}}function gt(){if(W)return W;let e=mt(),t=e.createOscillator(),n=e.createOscillator(),r=e.createOscillator(),i=e.createOscillator(),a=e.createOscillator(),o=e.createOscillator(),s=e.createGain(),c=e.createGain(),l=e.createGain(),u=e.createGain(),d=e.createGain(),f=e.createGain(),p=e.createBiquadFilter(),m=e.createGain(),h=e.createWaveShaper(),g=e.createDelay(.4),_=e.createGain(),v=e.createGain(),y=e.createGain(),b=e.createStereoPanner(),x=e.createGain(),S=e.createDynamicsCompressor(),C=e.createGain(),ee=e.createGain(),w=e.createBiquadFilter(),T=e.createGain(),te=e.createBufferSource(),E=Array.from({length:15},(t,n)=>{let r=e.createOscillator(),i=e.createGain(),a=e.createStereoPanner();return r.type=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`][n%Be],r.frequency.value=110,i.gain.value=1e-4,r.connect(i).connect(a).connect(p),{oscillator:r,gain:i,pan:a}}),ne=e.createBuffer(1,Math.round(e.sampleRate*.75),e.sampleRate),D=ne.getChannelData(0),O=5370206;for(let e=0;e<D.length;e++)O^=O<<13,O^=O>>>17,O^=O<<5,D[e]=((O>>>0)/2147483648-1)*.55;te.buffer=ne,te.loop=!0,t.type=`sine`,n.type=`triangle`,r.type=`sawtooth`,i.type=`sine`,a.type=`sine`,o.type=`sine`,s.gain.value=.42,c.gain.value=.16,l.gain.value=.02,u.gain.value=.08,a.frequency.value=1.5,d.gain.value=12,f.gain.value=1e-4,C.gain.value=1e-4,ee.gain.value=1e-4,w.type=`bandpass`,w.frequency.value=900,w.Q.value=5,T.gain.value=.2,p.type=`lowpass`,p.frequency.value=420,p.Q.value=2.2,m.gain.value=1;let k=new Float32Array(1024);for(let e=0;e<k.length;e++){let t=e/(k.length-1)*2-1;k[e]=Math.tanh(t*2.35)/Math.tanh(2.35)}return h.curve=k,h.oversample=`2x`,x.gain.value=1e-4,S.threshold.value=-27,S.knee.value=18,S.ratio.value=5,g.delayTime.value=.08,_.gain.value=.1,v.gain.value=.08,y.gain.value=.9,a.connect(d),d.connect(t.detune),d.connect(n.detune),d.connect(r.detune),t.connect(s).connect(p),n.connect(c).connect(p),r.connect(l).connect(p),i.connect(u).connect(p),o.connect(f).connect(p),te.connect(C).connect(w),te.connect(ee).connect(w),w.connect(T).connect(b),T.connect(g),p.connect(m).connect(h),h.connect(y).connect(b),h.connect(g),g.connect(_).connect(g),g.connect(v).connect(b),b.connect(x).connect(S).connect(e.destination),t.start(),n.start(),r.start(),i.start(),a.start(),o.start(),te.start(),E.forEach(e=>e.oscillator.start()),W={carrier:t,overtone:n,sideband:r,sub:i,modulator:a,pulse:o,carrierGain:s,overtoneGain:c,sidebandGain:l,subGain:u,modGain:d,pulseGain:f,noise:te,noiseGain:C,noiseBurstGain:ee,noiseFilter:w,resonatorGain:T,filter:p,drive:m,delay:g,feedback:_,wet:v,dry:y,gain:x,pan:b,shapeVoices:E},W}function bt(e){if(!U)return;if(!((E===`flying`||E===`resolving`)&&H.length>0)){W&&W.gain.gain.setTargetAtTime(1e-4,U.currentTime,.08);return}if(e-Ae<42)return;Ae=e;let t=gt(),n=U,r=H.reduce((e,t)=>e+ +!t.resolved,0)/H.length,i=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),a=Math.log2(i+1),o=H.map(Dt),s=Array.from(new Set(H.map(e=>e.skip))).sort((e,t)=>e-t).map(e=>{let t=H.flatMap((t,n)=>t.skip===e?[n]:[]),n=t.map(e=>o[e]),r=e=>n.reduce((t,n)=>t+n[e],0)/Math.max(1,n.length),i=n.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/Math.max(1,n.length),a=n.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/Math.max(1,n.length),s=t.reduce((e,t)=>e+H[t].distinct,0),c=q.get(e)||0,l=Math.max(0,s-c);return q.set(e,s),{skip:e,glyph:H[t[0]].glyph,area:r(`area`),spread:r(`spread`),elongation:r(`elongation`),density:r(`density`),centroidX:r(`centroidX`),centroidY:r(`centroidY`),orientation:.5*Math.atan2(i,a),coverage:s,presence:Math.min(1,Math.log2(s+1)/10),activity:Math.min(1,Math.log2(l+1)/5),deepest:t.reduce((e,t)=>Math.max(e,H[t].shownDepth),0)}}),c=s.filter(e=>e.coverage>0).length/15,l=s.reduce((e,t)=>t.activity>e.activity?t:e,s[0]),u=l?.activity||0,d=e=>o.reduce((t,n)=>t+n[e],0)/o.length,f=(e,t)=>o.reduce((n,r)=>n+(r[e]-t)**2,0)/o.length,p=d(`area`),m=d(`spread`),h=d(`elongation`),g=d(`density`),_=d(`centroidX`),v=d(`centroidY`),y=Math.min(1,Math.sqrt(o.reduce((e,t)=>e+(t.centroidX-_)**2+(t.centroidY-v)**2,0)/o.length*.5)),b=Math.min(1,Math.sqrt(f(`spread`,m)+f(`elongation`,h)+f(`density`,g))),x=o.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/o.length,S=o.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/o.length,C=.5*Math.atan2(x,S),ee=Math.min(1,Math.hypot(x,S)),w=H.reduce((e,t)=>e+t.distinct,0),T=Math.min(1,w/Math.max(1,H.length*96)),te=H.reduce((e,t)=>e+Math.min(1,Math.hypot(t.zr,t.zi)/2),0)/H.length,ne=Math.min(1,H.length/Math.max(1,R.skips*Ue)),D=o[H.reduce((e,t,n)=>t.distinct*(.35+o[n].spread)*(.6+o[n].density)>H[e].distinct*(.35+o[e].spread)*(.6+o[e].density)?n:e,0)],O=Math.min(1,(1-D.elongation)*.58+ee*.42),k=Math.min(1,b*1.7+(1-g)*.24+te*.28),A=Math.max(0,w-G),re=Math.min(1,Math.log2(A+1)/4.5);G=w;let ie=H.filter(e=>Number.isFinite(e.stepDistance)&&e.stepDistance>0).map(e=>({proximity:Math.max(0,Math.min(1,(-Math.log2(Math.max(e.stepDistance,1e-12))-.25)/15)),contraction:Math.max(0,Math.min(1,e.distanceContraction/1.5))})),ae=e=>e.length?(e.sort((e,t)=>e-t),e[Math.min(e.length-1,Math.floor(e.length*.8))]):0,j=ae(ie.map(e=>e.proximity)),oe=ae(ie.map(e=>e.contraction)),se=2**((j*14+oe*3)/12),ce=H[0],M=Math.abs(Math.round((ce.cr+2.2)*137+(ce.ci+1.5)*211)),le=yt[M%yt.length],ue=34+M*7%12,N=e=>{let t=Math.round(e),n=(t%le.length+le.length)%le.length,r=Math.floor(t/le.length);return 440*2**((ue+le[n]+r*12-69)/12)},de=a*.2+D.spread*3.7+D.elongation*2.8+(D.orientation/Math.PI+.5)*2.4+D.centroidY*1.6,fe=1+Math.round(y*4+b*3+c*2),pe=Math.min(900,N(de)*se),P=Math.min(1900,N(de+2+Math.round(O*2))*se),F=Math.min(2400,N(de+fe+3)*se),me=Math.min(7600,150+p*2700+g*1500+a*48+k*1500+j*1800),he=Math.min(.045,.007+r*.01+m*.007+T*.006+ne*.003+re*.004+c*.006+u*.004),I=Math.max(-.76,Math.min(.76,_*.52+Math.sin(e*.001*(.22+y*1.7)+C)*y*.34)),L=n.currentTime,ge=[0,2,1,3,4,5,6],_e=e=>Math.log2(e.deepest+1)*.16+ge[e.glyph]+e.spread*3.2+e.elongation*2.4+(e.orientation/Math.PI+.5)*2+e.centroidY*1.4;t.shapeVoices.forEach((e,t)=>{let n=s.find(e=>e.skip===t+1);if(!n||n.coverage===0){e.gain.gain.setTargetAtTime(1e-4,L,.08);return}let r=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`];e.oscillator.type=r[n.glyph],e.oscillator.frequency.setTargetAtTime(Math.min(1800,N(_e(n))*se),L,.065),e.gain.gain.setTargetAtTime(.002+n.presence*.028+n.activity*.07+c*.004,L,.045),e.pan.pan.setTargetAtTime(Math.max(-.88,Math.min(.88,n.centroidX*.72+Math.sin(n.orientation)*.15)),L,.07)}),t.carrier.frequency.setTargetAtTime(pe,L,.055),t.overtone.frequency.setTargetAtTime(P,L,.075),t.sideband.frequency.setTargetAtTime(F,L,.085),t.sub.frequency.setTargetAtTime(Math.max(28,pe*.5),L,.1),t.carrierGain.gain.setTargetAtTime(.16+O*.36,L,.1),t.overtoneGain.gain.setTargetAtTime(.035+g*.25+ee*.08,L,.1),t.sidebandGain.gain.setTargetAtTime(.008+D.elongation*.13+k*.075,L,.1),t.subGain.gain.setTargetAtTime(.025+p*.16+O*.035,L,.12),t.modulator.frequency.setTargetAtTime(.18+g*3.6+y*4.2+r+oe*2.4,L,.12),t.modGain.gain.setTargetAtTime(2+k*74+b*46+oe*18,L,.11),t.filter.frequency.setTargetAtTime(me,L,.08),t.filter.Q.setTargetAtTime(.8+D.elongation*7.2+O*2.6,L,.09),t.drive.gain.setTargetAtTime(.62+k*1.25+g*.42,L,.1),t.noiseGain.gain.setTargetAtTime(15e-5+k*.01+re*.004,L,.07),t.noiseFilter.frequency.setTargetAtTime(Math.min(7200,pe*(2.2+g*5.4+y*2.5)),L,.08),t.noiseFilter.Q.setTargetAtTime(1.5+g*10+ee*5,L,.09),t.resonatorGain.gain.setTargetAtTime(.1+k*.28+re*.24,L,.09),t.delay.delayTime.setTargetAtTime(.024+p*.12+y*.12,L,.12),t.feedback.gain.setTargetAtTime(.04+D.elongation*.18+y*.18,L,.14),t.wet.gain.setTargetAtTime(.025+m*.1+y*.13+c*.045,L,.14),t.dry.gain.setTargetAtTime(.9-k*.14,L,.14),t.pan.pan.setTargetAtTime(I,L,.08),t.gain.gain.setTargetAtTime(he*(E===`resolving`?.76:1),L,.09);let ve=i-Me,ye=Math.max(42,310-Math.min(155,a*11)-re*88-k*42-j*72-u*92);if((ve>0||u>.08)&&e-je>=ye){let n=1+(M+Math.round(D.elongation*5))%Math.max(2,le.length-1),r=(u>.08?_e(l):de)+K*n%le.length+(K%4==3?fe:0),a=3+M%5,o=K%a===0?1:.54+O*.22,s=Math.min(.88,(.18+p*.18+g*.18+re*.18+k*.1+u*.28)*o),c=.028+p*.065+O*.04+y*.03+(l?.spread||0)*.035;t.pulse.frequency.setValueAtTime(Math.min(2600,N(r+le.length)*se),L),t.pulseGain.gain.cancelScheduledValues(L),t.pulseGain.gain.setValueAtTime(1e-4,L),t.pulseGain.gain.exponentialRampToValueAtTime(s,L+.008),t.pulseGain.gain.exponentialRampToValueAtTime(1e-4,L+c);let d=Math.min(.48,(.035+k*.24+re*.18)*o);t.noiseBurstGain.gain.cancelScheduledValues(L),t.noiseBurstGain.gain.setValueAtTime(1e-4,L),t.noiseBurstGain.gain.exponentialRampToValueAtTime(Math.max(2e-4,d),L+.004),t.noiseBurstGain.gain.exponentialRampToValueAtTime(1e-4,L+.025+y*.06),je=e,Me=i,K+=1}}function xt(e=!1){let t=performance.now();if(!e&&t-ge<33)return;let n=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),r=H.reduce((e,t)=>e+Ot(t,t.shownDepth),0),i=H.reduce((e,t)=>e+t.distinct,0),a=H.length?H.reduce((e,t)=>e+Dt(t).spread,0)/H.length:0,o=H.length?H.filter(e=>e.resolved).length/H.length:0,s=H.length?H.reduce((e,t)=>e+Math.min(1,t.shownDepth/h.current.maxDepth),0)/H.length:0,c=o*.8+s*.2;Oe({phase:E,score:r,skips:R.skips,deepest:n,progress:c,coverage:i,spread:a}),ge=t}function St(e){if(e.depth<=nt||e.depth%lt!==0)return;let t=(e.zr-pt.x)/_t*.5+.5,n=(e.zi-pt.y)/vt*.5+.5;if(t<0||t>=1||n<0||n>=1)return;let r=Math.min(ot-1,Math.floor(t*ot)),i=Math.min(ot-1,Math.floor(n*ot)),a=i*ot+r,o=a>>>5,s=1<<(a&31);(e.cells[o]&s)===0&&(e.cells[o]|=s,e.distinct+=1,e.sumX+=r,e.sumY+=i,e.sumXX+=r*r,e.sumYY+=i*i,e.sumXY+=r*i)}function Ct(){F+=1,E=`ready`,O=-1,A=`none`,Se=[],z=[],H=[],qe=[],Je=[],Ye=0,Xe=0,Q=0,Ze=!1,Qe=0,I=Math.floor(Math.random()*Be),q.clear(),Me=0,G=0,je=0,K=0;let e=at();N={...e},R={x:e.x,y:e.y,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},Ne(null),n.current?.clear(),Z=!0,xt(!0)}u.current=Ct;function wt(e,t){v.current||(n.current?.beginThrow(s.current,i,o,h.current.rotateRight),n.current?.setTuning(h.current),n.current?.setAtmosphere(fe),n.current?.setLayer(`throw`));let r=at(),a=Math.cos(e),c=Math.sin(e),l=t*t*(3-2*t),u=$()*(.32+.56*l),d=$()*et*t,f=ct()*$e;N={x:r.x-a*f*t,y:r.y-c*f*t},R.x=r.x-a*d,R.y=r.y-c*d,R.vx=a*u,R.vy=c*u,R.vz=$()*(.38+.2*l),R.z=1,R.spin=0,R.skips=0,R.bounceAge=10,E=`flying`,ht(170,.12,.07),Z=!0,xt(!0)}function Tt(e,t=!1){w.current=!0,t&&he(!0),ye(!0),be(e.name||`YOU`),S.current=e,P(!0),T.current||=Nt();let r=Mt({...h.current,rotateRight:e.rotateRight,sourceDots:e.sourceDots});h.current=r,Pe(r),n.current?.setTuning(r),_.current(),g.current(),un(e.view),Ct(),I=e.glyph,F=e.seed,xe=e.skips,wt(e.angle,e.power)}ee.current=Tt,f.current=un;function Et(e,t,r,a,c,l){let u=B(e,t,i,o,s.current,h.current.rotateRight),d={x:Math.fround(u.x),y:Math.fround(u.y)},f=(a+r-1)%Be,p=v.current?6:h.current.sourceDots,m=Rt(e,t,i,o,s.current,p,f,h.current.rotateRight),g=l?.gpu??!v.current;if((l?.ripple??!v.current)&&z.push({cr:d.x,ci:d.y,born:c,index:r}),!v.current){Se.push({cr:d.x,ci:d.y,born:c,index:r});for(let e of m)H.push({zr:0,zi:0,cr:e.x,ci:e.y,depth:0,shownDepth:0,skip:r,glyph:f,stepDistance:0,distanceContraction:0,resolved:!1,score:0,offscreenStreak:0,tinyHopStreak:0,cells:new Uint32Array(st),distinct:0,sumX:0,sumY:0,sumXX:0,sumYY:0,sumXY:0})}g&&n.current?.spawn(m,r),v.current||(ht(320+r*62,.1,.06),`vibrate`in navigator&&navigator.vibrate?.(12)),xt(!0)}function At(e){E===`resolving`||E===`result`||(E=`resolving`,L=e,xt(!0))}function jt(){if(E===`result`)return;E=`result`,v.current||n.current?.freeze(),H.forEach(e=>{e.resolved||(e.resolved=!0,e.score=Ot(e,e.depth)),e.shownDepth=e.depth});let e=H.reduce((e,t)=>e+t.score,0),t=H.reduce((e,t)=>Math.max(e,t.depth),0),r=H.reduce((e,t)=>e+t.distinct,0),i=H.length?H.reduce((e,t)=>e+Dt(t).spread,0)/H.length:0,a=`${Date.now()}-${F}`;if(w.current)Ne(null);else{Ne(a);let n={id:a,name:m.current||`YOU`,score:e,deepest:t,skips:R.skips,coverage:r,spread:i,createdAt:new Date().toISOString()};ke(e=>{let t=[...e,n].sort((e,t)=>t.score-e.score||t.deepest-e.deepest||e.createdAt.localeCompare(t.createdAt)).slice(0,10);return Bt(t),t})}S.current&&history.replaceState(null,``,ze(window.location.href,S.current)),Oe({phase:E,score:e,skips:R.skips,deepest:t,progress:1,coverage:r,spread:i}),ht(720,.18,.07)}function Pt(e,t){let n=1-Math.exp(-t/.055),r=()=>{for(let e of H){let t=e.depth-e.shownDepth;e.shownDepth=t<16?e.depth:Math.min(e.depth,e.shownDepth+Math.max(1,t*n))}};if(!H.filter(e=>!e.resolved).length){r();let t=H.every(e=>e.depth-e.shownDepth<16);E===`resolving`&&e-L>250&&t?jt():xt();return}let a=Math.max(1,Math.floor(tt/Math.max(H.length,1))),c=s.current,l=h.current.rotateRight,u=Math.hypot(i,o)*ut;for(let e of H){if(e.resolved)continue;let t=_e(e.depth,h.current.maxDepth,a,h.current.acceleration);for(let n=0;n<t&&e.depth<h.current.maxDepth;n++){let t=e.zr,n=e.zi,r=Math.fround(Math.fround(t*t-n*n)+e.cr),a=Math.fround(Math.fround(2*t*n)+e.ci),s=Math.hypot(r-t,a-n);if(Number.isFinite(s)){let t=e.stepDistance||s,n=Math.max(-4,Math.min(4,Math.log2(Math.max(t,1e-12)/Math.max(s,1e-12))));e.distanceContraction=e.distanceContraction*.82+n*.18,e.stepDistance=t*.82+s*.18}e.zi=a,e.zr=r,e.depth+=1,St(e);let f=Ce(t,n,c,i,o,l),p=Ce(r,a,c,i,o,l),m=Math.hypot((p.x-f.x)*i*.5,(p.y-f.y)*o*.5),h=Math.abs(p.x)<=1.02&&Math.abs(p.y)<=1.02,g=r>=ve.xMin&&r<=ve.xMax&&a>=ve.yMin&&a<=ve.yMax,_=d({magSq:r*r+a*a,hopPx:m,onScreen:h||g,offscreenStreak:e.offscreenStreak,tinyHopStreak:e.tinyHopStreak,maxHopPx:u});if(e.offscreenStreak=_.offscreenStreak,e.tinyHopStreak=_.tinyHopStreak,_.resolved){e.resolved=!0;break}}e.depth>=h.current.maxDepth&&(e.resolved=!0),e.resolved&&(e.shownDepth=e.depth,e.score=Ot(e,e.depth))}r();let f=H.every(e=>e.resolved),p=H.every(e=>e.depth-e.shownDepth<16);E===`resolving`&&(f&&p&&e-L>250||e-L>9e3)?jt():xt()}function Ft(e,t){if(E!==`flying`)return;let n=$()*1.65;R.x+=R.vx*e,R.y+=R.vy*e,R.z+=R.vz*e,R.vz-=n*e;let r=Math.exp(-.06*e);if(R.vx*=r,R.vy*=r,R.spin+=Math.hypot(R.vx,R.vy)*e*.016,R.bounceAge+=e,R.z<=0&&R.vz<0){if(R.z=0,R.x<24||R.x>i-24||R.y<24||R.y>o-24){At(t);return}R.skips+=1,R.bounceAge=0,Et(R.x,R.y,R.skips,I,t);let e=xe-R.skips;R.vz=Math.max(Math.abs(R.vz)*.56,$()*(.05+e*.008)),R.vx*=.79,R.vy*=.79;let n=(kt(F<<8^R.skips)()-.5)*Math.PI/60,r=Math.cos(n),a=Math.sin(n),s=R.vx*r-R.vy*a;if(R.vy=R.vx*a+R.vy*r,R.vx=s,e>0){let e=Math.hypot(R.vx,R.vy),t=$()*.09;e>0&&e<t&&(R.vx*=t/e,R.vy*=t/e)}(R.skips>=xe||R.x<-50||R.x>i+50||R.y<-50||R.y>o+50)&&At(t)}}function It(){let e=ue(i,o),t=Math.atan2(o*.5-e.y,i*.5-e.x)+(Math.random()-.5)*1.55,n=.48+Math.random()*.42,r=n*n*(3-2*n),a=$()*(.32+.56*r),s=$()*et*n,c=Math.cos(t),l=Math.sin(t),u=y.current;y.current+=1,F=F+17|0,qe.push({x:e.x-c*s,y:e.y-l*s,vx:c*a,vy:l*a,vz:$()*(.38+.2*r),z:1,spin:0,skips:0,bounceAge:10,plannedSkips:3,shotId:F,shapeOffset:u%Be,path:[{x:e.x-c*s,y:e.y-l*s}],draw:u%50==0})}function zt(e,t){if(!v.current||!qe.length)return;let n=$()*1.65,r=[];for(let a of qe){a.x+=a.vx*e,a.y+=a.vy*e,a.z+=a.vz*e,a.vz-=n*e;let s=Math.exp(-.06*e);a.vx*=s,a.vy*=s,a.spin+=Math.hypot(a.vx,a.vy)*e*.016,a.bounceAge+=e;let c=a.path[a.path.length-1];a.draw&&(!c||Math.hypot(a.x-c.x,a.y-c.y)>=3)&&a.path.push({x:a.x,y:a.y});let l=!0;if(a.z<=0&&a.vz<0)if(a.z=0,a.x<24||a.x>i-24||a.y<24||a.y>o-24)l=!1;else{a.skips+=1,a.bounceAge=0,Et(a.x,a.y,a.skips,a.shapeOffset,t,{gpu:!1,ripple:a.draw});let e=a.plannedSkips-a.skips;a.vz=Math.max(Math.abs(a.vz)*.56,$()*(.05+e*.008)),a.vx*=.79,a.vy*=.79;let n=(kt(a.shotId<<8^a.skips)()-.5)*Math.PI/60,r=Math.cos(n),s=Math.sin(n),c=a.vx*r-a.vy*s;if(a.vy=a.vx*s+a.vy*r,a.vx=c,e>0){let e=Math.hypot(a.vx,a.vy),t=$()*.09;e>0&&e<t&&(a.vx*=t/e,a.vy*=t/e)}(a.skips>=a.plannedSkips||a.x<-50||a.x>i+50||a.y<-50||a.y>o+50)&&(l=!1)}l?r.push(a):a.draw&&Je.length<3&&Je.push({path:a.path,born:t})}qe=r}function Vt(e){let t=e.x-N.x,n=e.y-N.y,r=Math.hypot(t,n);if(r<12)return[];let a=ct()*$e,s=Math.min(1,r/a),c=s*s*(3-2*s),l=$()*(.32+.56*c),u=$()*et*s,d=e.x-t/r*u,f=e.y-n/r*u,p=t/r*l,m=n/r*l,h=$()*(.38+.2*c),g=1,_=0,v=$()*1.65,y=1/120,b=[];for(let e=0;e<2400&&_<3;e++){d+=p*y,f+=m*y,g+=h*y,h-=v*y;let e=Math.exp(-.06*y);if(p*=e,m*=e,g>0||h>=0)continue;if(g=0,d<24||d>i-24||f<24||f>o-24)break;_+=1,b.push({x:d,y:f,index:_,glyph:(I+_-1)%Be});let t=3-_;if(h=Math.max(Math.abs(h)*.56,$()*(.05+t*.008)),p*=.79,m*=.79,t>0){let e=Math.hypot(p,m),t=$()*.09;e>0&&e<t&&(p*=t/e,m*=t/e)}if(_>=3||d<-50||d>i+50||f<-50||f>o+50)break}return b}let Ht=[75,175,235];function Ut(e,t,n,r,a,s){if(!X||r<=0)return;let c=h.current.rotateRight,l=Math.hypot(i,o)*ut,u=0,d=0;X.lineWidth=.65,X.lineJoin=`round`,X.lineCap=`round`;for(let f=0;f<r;f++){let p=u,m=d,h=Math.fround(Math.fround(p*p-m*m)+e.x),g=Math.fround(Math.fround(2*p*m)+e.y),_=Ce(p,m,n,i,o,c),v=Ce(h,g,n,i,o,c),y=Math.hypot((v.x-_.x)*i*.5,(v.y-_.y)*o*.5);if(u=h,d=g,y>=l||!Number.isFinite(y))break;let b=s*(1-f/Math.max(1,r))**.42,x=Math.min(.55,b*.85),S=V(h,g,i,o,n,c);if(f===0){X.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${x.toFixed(3)})`,X.beginPath(),X.arc(t.x,t.y,.7,0,ft),X.fill();continue}let C=f===1?t:V(p,m,i,o,n,c);X.strokeStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${b.toFixed(3)})`,X.beginPath(),X.moveTo(C.x,C.y),X.lineTo(S.x,S.y),X.stroke(),X.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${x.toFixed(3)})`,X.beginPath(),X.arc(S.x,S.y,.7,0,ft),X.fill()}}function Wt(e){if(!X)return;X.clearRect(0,0,i,o);let t=Vt(e);if(!t.length)return;let n=h.current,r=s.current;X.globalCompositeOperation=`lighter`;for(let e of t){let t=e.index,a=Math.max(1,Math.floor(n.previewIterations/2**(t-1))),s=.32/(1+(t-1)*.25);Ut(B(e.x,e.y,i,o,r,n.rotateRight),e,r,a,Ht,s)}}function Gt(e){if(E!==`aiming`||!h.current.previewOrbits||!X)return;let t=s.current,n=[Math.round(N.x),Math.round(N.y),t.centerX.toFixed(5),t.centerY.toFixed(5),t.halfY.toFixed(5),h.current.previewIterations,h.current.rotateRight?`1`:`0`,i,o].join(`:`);n!==rt&&(rt=n,Wt(e)),r.drawImage(We,0,0,i,o)}function Kt(e){let t=10**Math.floor(Math.log10(Math.max(e,2**-52))),n=e/t;return(n<=1?1:n<=2?2:n<=5?5:10)*t}function qt(e,t){if(Math.abs(e)<t*.001)return`0`;if(Math.abs(e)>=1e4||Math.abs(e)<.001)return e.toExponential(1);let n=Math.max(0,Math.min(6,-Math.floor(Math.log10(t)))),r=e.toFixed(n);return n?r.replace(/\.?0+$/,``):r}function Jt(){if(!J)return;J.clearRect(0,0,i,o);let e=s.current,t=h.current.rotateRight,n=De(e,i,o,t),r=Math.max(n.xMax-n.xMin,n.yMax-n.yMin)*.08,a=n.xMin-r,l=n.xMax+r,u=n.yMin-r,d=n.yMax+r,f=Kt(e.halfY*2/Math.max(o/92,1)),p=f/5,m=e=>Math.round(e*c)/c,g=e=>Math.abs(e/f-Math.round(e/f))<1e-6,_=e=>Math.abs(e)<p*1e-4,v=(n,r)=>V(n,r,i,o,e,t),y=e=>{J.beginPath();let t=Math.ceil(a/p),n=Math.floor(l/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(t,u),i=v(t,d);J.moveTo(m(n.x),m(n.y)),J.lineTo(m(i.x),m(i.y))}J.stroke()},b=e=>{J.beginPath();let t=Math.ceil(u/p),n=Math.floor(d/p);for(let r=t;r<=n;r++){let t=r*p;if(_(t)||g(t)!==e)continue;let n=v(a,t),i=v(l,t);J.moveTo(m(n.x),m(n.y)),J.lineTo(m(i.x),m(i.y))}J.stroke()};if(J.lineWidth=1/c,J.strokeStyle=`rgba(104, 196, 216, .026)`,y(!1),b(!1),J.strokeStyle=`rgba(119, 211, 228, .065)`,y(!0),b(!0),h.current.coordinateAxes){let e=v(a,0),t=v(l,0),n=v(0,u),r=v(0,d);J.strokeStyle=`rgba(151, 231, 240, .18)`,J.lineWidth=1/c,J.beginPath(),J.moveTo(m(e.x),m(e.y)),J.lineTo(m(t.x),m(t.y)),J.moveTo(m(n.x),m(n.y)),J.lineTo(m(r.x),m(r.y)),J.stroke(),J.fillStyle=`rgba(171, 230, 238, .32)`,J.strokeStyle=`rgba(151, 231, 240, .14)`,J.font=`8px ui-monospace, SFMono-Regular, Menlo, monospace`,J.textBaseline=`top`,J.textAlign=`center`;for(let e=Math.ceil(a/f);e<=Math.floor(l/f);e++){let t=e*f;if(_(t))continue;let n=v(t,0);J.beginPath(),J.arc(m(n.x),m(n.y),2,0,ft),J.stroke(),n.x>18&&n.x<i-18&&n.y>9&&n.y<o-9&&J.fillText(qt(t,f),m(n.x),m(n.y)+4)}J.textBaseline=`middle`,J.textAlign=`right`;for(let e=Math.ceil(u/f);e<=Math.floor(d/f);e++){let t=e*f;if(_(t))continue;let n=v(0,t);J.beginPath(),J.arc(m(n.x),m(n.y),2,0,ft),J.stroke(),n.x>28&&n.x<i-8&&n.y>9&&n.y<o-9&&J.fillText(qt(t,f),m(n.x)-5,m(n.y))}J.fillStyle=`rgba(180, 239, 245, .42)`,J.font=`italic 9px ui-monospace, SFMono-Regular, Menlo, monospace`;let s=v(l,0);J.textAlign=`right`,J.textBaseline=`bottom`,J.fillText(`Re(c)`,Math.min(i-7,Math.max(40,s.x-6)),Math.min(o-6,Math.max(14,s.y-4)));let p=v(0,d);J.textAlign=`left`,J.textBaseline=`top`,J.fillText(`Im(c)`,Math.min(i-34,Math.max(6,p.x+6)),Math.max(6,p.y+4))}Le=!1}function Yt(e,t){let n=e.z*.3,i=(t+e.skips)%Be,a=Ve[i],o=Math.min(1,e.z/Math.max($()*.45,1)),s=Math.round(e.x*c)/c,l=Math.round((e.y-n)*c)/c,u=Fe?0:Math.exp(-e.bounceAge*8.5)*Math.cos(e.bounceAge*29),d=1+u*.11,f=1-u*.09;r.save(),r.fillStyle=`rgba(0, 4, 9, ${.3*(1-o*.72)})`,r.beginPath(),r.ellipse(s,e.y,10.5*(1+Math.max(0,u)*.08),3.5,0,0,ft),r.fill(),r.restore(),r.save(),r.translate(s,l),r.scale(d,f),r.rotate(e.spin*.18),r.strokeStyle=`rgba(255, 255, 255, .34)`,r.lineWidth=1;for(let e=0;e<a;e++){r.beginPath();for(let t=0;t<=32;t++){let n=Lt(i,e,t/32);t===0?r.moveTo(n.x*10,n.y*10):r.lineTo(n.x*10,n.y*10)}r.stroke()}r.fillStyle=`#ffffff`;let p=v.current?6:Math.max(He,Math.min(18,h.current.sourceDots));for(let e=0;e<p;e++){let t=e%a,n=Math.floor(e/a),o=Math.ceil((p-t)/a),s=Lt(i,t,n/Math.max(o,1));r.beginPath(),r.arc(s.x*10,s.y*10,1.15,0,ft),r.fill()}r.restore()}function Xt(e,t){if(!(e.length<2||t<=0)){r.save(),r.strokeStyle=`rgba(210, 220, 224, ${t})`,r.lineWidth=1,r.lineJoin=`round`,r.lineCap=`round`,r.beginPath(),r.moveTo(e[0].x,e[0].y);for(let t=1;t<e.length;t++)r.lineTo(e[t].x,e[t].y);r.stroke(),r.restore()}}function Zt(e){if(v.current){let t=0;for(let e of qe)e.draw&&t<2&&(Xt(e.path,.09),t+=1);Je=Je.filter(t=>e-t.born<le);for(let t=0;t<Math.min(2,Je.length);t++){let n=Je[t],r=Math.min(1,(e-n.born)/le);Xt(n.path,.08*(1-r)*(1-r))}return}E===`resolving`||E===`result`||Yt(R,I)}function Qt(e){z=z.filter(t=>e-t.born<(t.lifetime??2400));for(let t of z){let n=V(t.cr,t.ci,i,o,s.current,h.current.rotateRight),a=t.lifetime??2400,c=(e-t.born)/a;if(c<=0||c>=1)continue;let l=t.maxRadius??Math.max(36,ct()*.14),u=3+c**.7*l,d=Math.sin(c*Math.PI)*(1-c)**1.25,f=v.current?.44:.28,p=Math.max(0,d*f);p<=.002||(r.save(),r.strokeStyle=v.current?`rgba(240, 245, 255, ${p.toFixed(3)})`:`rgba(130, 215, 235, ${p.toFixed(3)})`,r.lineWidth=Math.max(.5,(v.current?1.1:.85)*(1-c*.5)),r.beginPath(),r.arc(n.x,n.y,u,0,ft),r.stroke(),r.restore())}r.textAlign=`center`,r.textBaseline=`middle`;for(let t of Se){let n=V(t.cr,t.ci,i,o,s.current,h.current.rotateRight),a=e-t.born,c=8e3;if(a<0||a>=c)continue;let l=a/c,u=a<450?1+Math.sin(a/450*Math.PI)*.38:1;r.font=`800 ${Math.round(15*u)}px ui-monospace, monospace`;let d=Math.max(0,(1-l)**.85*.92);d<=.01||(r.save(),r.lineWidth=2.5,r.strokeStyle=`rgba(0, 16, 28, ${(d*.85).toFixed(3)})`,r.strokeText(String(t.index),n.x,n.y+.5),r.fillStyle=`rgba(235, 252, 255, ${d.toFixed(3)})`,r.fillText(String(t.index),n.x,n.y+.5),r.restore())}r.textAlign=`start`,r.textBaseline=`alphabetic`}function $t(){if(E!==`aiming`)return null;let e=at(),t=e.x-N.x,n=e.y-N.y,r=Math.hypot(t,n);if(r<8)return null;let a=t/r,s=n/r,c=Math.hypot(i,o)*1.18,l=se,u=Math.cos(l),d=Math.sin(l);return{apexX:N.x,apexY:N.y,directionX:a,directionY:s,range:c,leftX:N.x+(a*u-s*d)*c,leftY:N.y+(s*u+a*d)*c,rightX:N.x+(a*u+s*d)*c,rightY:N.y+(s*u-a*d)*c,tipX:N.x+a*c*1.04,tipY:N.y+s*c*1.04}}function en(){let e=n.current;if(e){if(v.current){e.setDisplay({...me(`intro`),cone:null,cssWidth:i,cssHeight:o,mri:!0});return}if(E===`aiming`){e.setDisplay({...me(`aiming`),cone:$t(),cssWidth:i,cssHeight:o});return}e.setDisplay({...me(`play`),cone:null,cssWidth:i,cssHeight:o})}}function tn(e){if(!Ke)return;let t=V(ve.xMin,ve.yMax,i,o,s.current,!1),n=V(ve.xMax,ve.yMin,i,o,s.current,!1),r=Math.round(Math.min(t.x,n.x)),a=Math.round(Math.min(t.y,n.y)),c=Math.max(1,Math.round(Math.abs(n.x-t.x))),l=Math.max(1,Math.round(Math.abs(n.y-t.y)));e.drawImage(Ke,r,a,c,l)}function nn(){if(E!==`aiming`||v.current)return;let e=$t();if(!e)return;let{apexX:t,apexY:a,directionX:s,directionY:l,range:u}=e;if(!n.current&&Ke&&Y){if(Z){Y.clearRect(0,0,i,o),tn(Y),Y.globalCompositeOperation=`destination-in`,Y.save(),Y.filter=`blur(${32*c}px)`;let e=Math.atan2(l,s),n=se*2/ft,r=Math.min(n*.22,.04),d=Y.createConicGradient(e-se,t,a);d.addColorStop(0,`rgba(255, 255, 255, 0)`),d.addColorStop(r,`rgba(255, 255, 255, 1)`),d.addColorStop(Math.max(r,n-r),`rgba(255, 255, 255, 1)`),d.addColorStop(n,`rgba(255, 255, 255, 0)`),n<1&&d.addColorStop(1,`rgba(255, 255, 255, 0)`),Y.fillStyle=d,Y.fillRect(0,0,i,o),Y.globalCompositeOperation=`destination-in`;let f=Y.createRadialGradient(t,a,0,t,a,u);f.addColorStop(0,`rgba(255, 255, 255, 0.9)`),f.addColorStop(.55,`rgba(255, 255, 255, 0.4)`),f.addColorStop(1,`rgba(255, 255, 255, 0)`),Y.fillStyle=f,Y.fillRect(0,0,i,o),Y.restore(),Y.globalCompositeOperation=`source-over`,Z=!1}r.save(),r.globalAlpha=.32,r.drawImage(Re,0,0,i,o),r.restore()}}function rn(e){en(),r.clearRect(0,0,i,o),Le&&Jt(),Ie&&r.drawImage(Ie,0,0,i,o);let t=at();nn(),Gt(t),Qt(e),Zt(e)}function an(e){let t=ue(i,o),n=B(t.x,t.y,i,o,s.current,h.current.rotateRight),r=Math.random(),a,c;r<.35?(a=Math.max(18,ct()*(.04+Math.random()*.04)),c=2600+Math.random()*800):r<.75?(a=Math.max(45,ct()*(.09+Math.random()*.08)),c=3400+Math.random()*1e3):(a=Math.max(90,ct()*(.18+Math.random()*.14)),c=4600+Math.random()*1200),z.push({cr:n.x,ci:n.y,born:e,index:1,lifetime:c,maxRadius:a})}function on(e){let t=E===`aiming`&&!v.current;if(!v.current&&!t||b.current||Xe!==0&&e-Xe<40)return;Xe=e,n.current?.setLayer(`pond`),n.current?.setTuning({...h.current,maxDepth:ce}),n.current?.setAtmosphere(pe);let r=Array.from({length:96},()=>de());n.current?.spawnAppend(r,1,Ge),Math.random()<.04&&an(e)}function sn(e){if(!v.current||b.current)return;if(Q||=e,!Ze){let t=Math.min(1,(e-Q)/M);t>=1?(Ze=!0,D({progress:1,ready:!0})):e-Qe>40&&(Qe=e,D({progress:t}))}let t=y.current<32?900:2400;Ye!==0&&e-Ye<t||(Ye=e,w.current=!0,n.current?.setTuning({...h.current,maxDepth:ce}),n.current?.setAtmosphere(pe),It(),an(e))}function cn(e){let t=Math.min(.05,(e-x)/1e3);x=e,C+=t;let n=1/120;for(;C>=n;)Ft(n,e),zt(n,e),C-=n;sn(e),on(e),Pt(e,t),bt(e),rn(e),l=requestAnimationFrame(cn)}function ln(t){let n=e.getBoundingClientRect();return{x:t.clientX-n.left,y:t.clientY-n.top}}function un(e){let t=s.current,r=h.current.rotateRight;if(E===`flying`||E===`aiming`){let n=Te(R.x,R.y,i,o,t,e,r);if(E===`flying`){let n=Ee(R.x,R.y,R.vx,R.vy,i,o,t,e,r);R.vx=n.x,R.vy=n.y;let a=t.halfY/Math.max(e.halfY,1e-6);R.z*=a,R.vz*=a}R.x=n.x,R.y=n.y,E===`aiming`&&(N=Te(N.x,N.y,i,o,t,e,r))}s.current=e,Le=!0,Z=!0,n.current?.setView(e)}function dn(t){if(v.current)return;let r=ln(t);O=t.pointerId,e.setPointerCapture(O),E===`ready`&&Math.hypot(r.x-R.x,r.y-R.y)<=48?(A=`aim`,E=`aiming`,xe=p(Math.random),rt=``,Z=!0,n.current?.setLayer(`pond`),n.current?.setAtmosphere(pe),n.current?.setTuning({...h.current,maxDepth:ce}),N=r,R.x=r.x,R.y=r.y,xt(!0)):(A=`pan`,ae=r,j={...s.current})}function fn(e){let t=ln(e);if(e.pointerId!==O)return;if(A===`pan`){let e=h.current.rotateRight,n=B(ae.x,ae.y,i,o,j,e),r=B(t.x,t.y,i,o,j,e);un({centerX:j.centerX-(r.x-n.x),centerY:j.centerY-(r.y-n.y),halfY:j.halfY});return}if(A!==`aim`||E!==`aiming`)return;let n=at(),r=t.x-n.x,a=t.y-n.y,s=Math.hypot(r,a),c=ct()*$e,l=s>c?c/s:1;N={x:n.x+r*l,y:n.y+a*l},R.x=N.x,R.y=N.y,Z=!0}function pn(t){if(t.pointerId!==O)return;if(Z=!0,A===`pan`){A=`none`,O=-1,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId);return}if(A!==`aim`||E!==`aiming`)return;let r=at(),i=r.x-N.x,a=r.y-N.y,o=Math.hypot(i,a);if(O=-1,A=`none`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),o<12){E=`ready`,R.x=r.x,R.y=r.y,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(fe),n.current?.setLayer(`throw`),xt(!0);return}let c=ct()*$e,l=Math.min(1,o/c),u=Math.atan2(a,i);w.current=!1,he(!1),ye(!1),T.current=null,S.current={version:1,view:{...s.current},rotateRight:h.current.rotateRight,angle:u,power:l,skips:xe,glyph:I,seed:F,sourceDots:h.current.sourceDots,name:m.current||`YOU`},P(!0),wt(u,l)}function mn(){if(A===`pan`){A=`none`,O=-1;return}if(A!==`aim`||E!==`aiming`)return;E=`ready`,O=-1,A=`none`;let e=at();N={...e},R.x=e.x,R.y=e.y,Z=!0,n.current?.clear(),n.current?.setTuning(h.current),n.current?.setAtmosphere(fe),n.current?.setLayer(`throw`),xt(!0)}function hn(e){v.current||(e.key===`Escape`&&mn(),(e.key===` `||e.key===`Enter`)&&E===`result`&&(e.preventDefault(),te.current()))}let gn=new ResizeObserver(dt);return gn.observe(e),e.addEventListener(`pointerdown`,dn),e.addEventListener(`pointermove`,fn),e.addEventListener(`pointerup`,pn),e.addEventListener(`pointercancel`,mn),window.addEventListener(`keydown`,hn),dt(),Ct(),l=requestAnimationFrame(cn),()=>{it=!0,cancelAnimationFrame(l),gn.disconnect(),e.removeEventListener(`pointerdown`,dn),e.removeEventListener(`pointermove`,fn),e.removeEventListener(`pointerup`,pn),e.removeEventListener(`pointercancel`,mn),window.removeEventListener(`keydown`,hn),U?.close(),ee.current=null}},[]);let Le=U.phase===`ready`?`Grab the white orb. Pull back and release.`:U.phase===`aiming`?`Aim for deep water · farther pull = faster throw`:U.phase===`flying`?`Each splash launches a new ${K.sourceDots}-point glyph`:U.phase===`resolving`?`Resolving the pond · ${Math.round(U.progress*100)}%`:`Press Space or throw again`,Re=Math.max(0,I.indexOf(K.maxDepth)),We=()=>{if(w.current=!1,he(!1),ye(!1),T.current){let e=T.current;T.current=null,h.current=e,Pe(e),Pt(e),n.current?.setTuning(e),_.current(),g.current()}u.current(),requestAnimationFrame(()=>t.current?.focus())};te.current=We;let X=()=>{let e=S.current;!e||E||ee.current?.(e)},Z=()=>{let e=S.current;if(!e)return;let t=ze(window.location.href,e);history.replaceState(null,``,t),(async()=>{try{if(navigator.share){await navigator.share({title:`Mandelbrot Skipping`,url:t});return}}catch(e){if(e instanceof Error&&e.name===`AbortError`)return}try{await navigator.clipboard.writeText(t),Se(`Copied`),window.setTimeout(()=>Se(``),1600)}catch{Se(`Copy the address bar`),window.setTimeout(()=>Se(``),2400)}})()},Xe=U.phase===`flying`||U.phase===`resolving`||!!E;return(0,o.jsxs)(`main`,{className:`gameShell ${ge?`replayMode`:``}`,children:[(0,o.jsxs)(`section`,{className:`playfield`,"aria-label":`Mandelbrot rock skipping game`,children:[(0,o.jsx)(`canvas`,{ref:e,className:`gpuCanvas${E?` introStashed`:``}`,"aria-hidden":`true`}),(0,o.jsx)(`canvas`,{ref:t,className:`gameCanvas`,tabIndex:0,"aria-label":`Throw ready. Drag the white orb backward and release it across the water`}),ge&&(0,o.jsxs)(`p`,{className:`replayBanner`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`replayBannerName`,children:Me(R)}),(0,o.jsx)(`span`,{className:`replayBannerLabel`,children:`replay`})]}),E&&(0,o.jsx)(c,{progress:E.progress,fading:O,ready:E.ready,rotateRight:K.rotateRight,onPlay:q}),(U.phase===`flying`||U.phase===`resolving`)&&!E&&(0,o.jsx)(`button`,{type:`button`,className:`playfieldThrowControl`,onClick:We,"aria-label":`Cancel this throw and rethrow`,children:`Rethrow`}),(0,o.jsxs)(`div`,{className:`playfieldDock`,children:[(0,o.jsx)(`button`,{type:`button`,className:`replayOpening`,onClick:Fe,disabled:!!E||!!z,"aria-label":`Replay the opening Buddhabrot sequence`,children:`Replay opening`}),(0,o.jsx)(l,{})]})]}),(0,o.jsxs)(`aside`,{className:`scoreRail ${U.phase===`result`?`hasResult`:``}`,"aria-label":`Score and local high scores`,children:[(0,o.jsxs)(`section`,{className:`liveScore`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`liveLabel`,children:U.phase===`result`?`Final score`:`Live score`}),(0,o.jsx)(`strong`,{className:`liveNumber`,children:Et(U.score)}),(0,o.jsxs)(`span`,{className:`liveMeta`,children:[U.skips,` skips · `,U.deepest?Et(U.deepest):`0`,` deep · `,U.coverage,` cells · `,Math.round(U.spread*100),`% spread`]}),(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,U.progress*100)}%`}})}),(0,o.jsxs)(`div`,{className:`throwShareRow`,children:[(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:X,disabled:!N||Xe,"aria-label":`Replay this throw`,children:`Replay throw`}),(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:Z,disabled:!N,"aria-label":`Copy a link to this throw`,children:xe||`Share throw`})]})]}),(0,o.jsxs)(`section`,{className:`tuningPanel`,"aria-label":`Orbit tuning`,children:[(0,o.jsxs)(`div`,{className:`tuningHeading`,children:[(0,o.jsx)(`span`,{children:`Orbit tuning`}),(0,o.jsx)(`span`,{children:`Live`})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Glyph dots`}),(0,o.jsx)(`output`,{children:K.sourceDots})]}),(0,o.jsx)(`input`,{type:`range`,min:He,max:Ue,step:`1`,value:K.sourceDots,"aria-label":`Dots per sacred geometry glyph`,onChange:e=>J({sourceDots:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Orbit limit`}),(0,o.jsx)(`output`,{children:At(K.maxDepth)})]}),(0,o.jsx)(`input`,{type:`range`,min:`0`,max:I.length-1,step:`1`,value:Re,"aria-label":`Orbit iteration limit`,"aria-valuetext":`${Et(K.maxDepth)} iterations`,onChange:e=>J({maxDepth:I[Number(e.target.value)]})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Acceleration curve`}),(0,o.jsxs)(`output`,{children:[K.acceleration.toFixed(1),`×`]})]}),(0,o.jsx)(`input`,{type:`range`,min:L,max:18,step:`0.1`,value:K.acceleration,"aria-label":`Iteration speed acceleration curve`,"aria-valuetext":`${K.acceleration.toFixed(1)} curve`,onChange:e=>J({acceleration:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Line persist`}),(0,o.jsxs)(`output`,{children:[K.linePersist.toFixed(2),`s`]})]}),(0,o.jsx)(`input`,{type:`range`,min:Ke,max:qe,step:`0.05`,value:K.linePersist,"aria-label":`How long iteration lines stay visible`,"aria-valuetext":`${K.linePersist.toFixed(2)} seconds`,onChange:e=>J({linePersist:Number(e.target.value)})})]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.previewOrbits,"aria-label":`Preview skip orbits while aiming`,onChange:e=>J({previewOrbits:e.target.checked})}),`Aim orbit preview`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.skipColors,"aria-label":`Color each skip differently`,onChange:e=>J({skipColors:e.target.checked})}),`Skip colors`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.coordinateAxes,"aria-label":`Show coordinate axes`,onChange:e=>J({coordinateAxes:e.target.checked})}),`Coordinate axes`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.rotateRight,"aria-label":`Rotate coordinates and Buddhabrot 90 degrees right`,onChange:e=>J({rotateRight:e.target.checked})}),`Rotate 90° right`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:K.doublePixels,"aria-label":`Render the orbit nebula at half resolution so pixels look doubled`,onChange:e=>J({doublePixels:e.target.checked})}),`Double pixels`]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Preview iterations`}),(0,o.jsx)(`output`,{children:K.previewIterations})]}),(0,o.jsx)(`input`,{type:`range`,min:Je,max:Ye,step:`1`,value:K.previewIterations,"aria-label":`Orbit iterations to draw while aiming`,"aria-valuetext":`${K.previewIterations} iterations`,onChange:e=>J({previewIterations:Number(e.target.value)})})]}),(0,o.jsx)(`p`,{className:`tuningNote`,children:`Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations each skip. Skip colors tint preview and live trails per splash.`})]}),U.phase===`result`&&(0,o.jsxs)(`section`,{className:`railResult`,"aria-label":`Throw result`,children:[(0,o.jsx)(`div`,{className:`resultEyebrow`,children:F?`${Me(R)} throw`:W[0]?.id===G?`New local best`:`Throw complete`}),(0,o.jsxs)(`div`,{className:`resultStats`,children:[U.skips,` exact paths · `,Et(U.deepest),` deep · `,U.coverage,` distinct cells · `,Math.round(U.spread*100),`% spread.`]}),(0,o.jsxs)(`div`,{className:`nameRow`,children:[G?(0,o.jsx)(`input`,{className:`nameInput`,"aria-label":`High score name`,value:Ae,maxLength:12,onChange:e=>Ie(e.target.value)}):null,(0,o.jsx)(`button`,{className:`throwButton`,onClick:We,children:`Throw again`})]})]}),(0,o.jsx)(`h2`,{className:`railTitle`,children:`Local legends`}),(0,o.jsx)(`p`,{className:`railSub`,children:`Depth, distinct points, and spatial spread all score. Later skips multiply the result.`}),z&&(0,o.jsx)(`p`,{className:`gpuNote`,role:`status`,children:z}),(0,o.jsxs)(`div`,{className:`scoreList`,children:[W.length===0&&(0,o.jsx)(`div`,{className:`emptyScores`,children:`No throws yet.`}),W.map((e,t)=>(0,o.jsxs)(`div`,{className:`scoreEntry ${e.id===G?`current`:``}`,children:[(0,o.jsx)(`span`,{className:`rank`,children:String(t+1).padStart(2,`0`)}),(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{className:`scoreName`,children:e.name}),(0,o.jsxs)(`span`,{className:`scoreMeta`,children:[e.skips,` skips · `,Et(e.deepest),` deep · `,e.coverage,` cells · `,Math.round(e.spread*100),`% spread`]})]}),(0,o.jsx)(`span`,{className:`scoreNumber`,children:Et(e.score)})]},e.id))]}),(0,o.jsxs)(`div`,{className:`railHint`,children:[Le,(0,o.jsx)(`br`,{}),`Drag empty water to move · wheel or +/- to zoom.`]}),(0,o.jsxs)(`div`,{className:`railFooter`,children:[`Saved on this device · score model v2 · `,At(K.maxDepth),` orbit cap`]})]})]})}export{Ht as default};