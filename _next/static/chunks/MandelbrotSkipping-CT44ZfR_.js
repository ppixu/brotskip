import{r as e}from"./rolldown-runtime-vU33u7is.js";import{i as t,r as n}from"./framework-EwgI_Pa9.js";var r=e(n(),1);async function i(e){let t=navigator.gpu;if(!t)return e(`WebGPU is unavailable. Throwing still works, but orbit trails need a current hardware-accelerated browser.`),null;let n=await t.requestAdapter({powerPreference:`high-performance`});if(!n)return e(`No GPU adapter found. Throwing still works in reduced visual mode.`),null;let r=await n.requestDevice(),i=!1;r.addEventListener(`uncapturederror`,t=>{i=!0;let n=t.error?.message||String(t.error);console.error(`WebGPU validation`,n),e(`WebGPU validation error: ${n}`)}),r.lost.then(()=>{i=!0,e(`The GPU device was lost. Reload to restore orbit trails.`)});let a=!1;return{device:r,preferredFormat:t.getPreferredCanvasFormat(),hasFailed:()=>i,destroy:()=>{a||(a=!0,r.destroy())}}}var a={trigger:`Buddhabrot`,title:`Buddhabrot`,formula:`z → z² + c`,paragraphs:[`The Buddhabrot is a density map of Mandelbrot trajectories that escape. Start at 0, then keep applying z → z² + c. If that orbit flies off to infinity, every hop is counted. Stack enough of those escaping paths and the glow takes the shape of a seated Buddha — the resemblance that gave Melinda Green’s 1993 rendering its name.`,`Points that stay trapped are discarded, so the Mandelbrot set itself stays dark. During the opening, the GPU computes a fixed volume of escaping paths once, then a thin orbit-time slice loops smoothly back and forth through its z-layers.`],wikipedia:{journal:`Notes on fractal geometry`,title:`The Buddhabrot`,sentences:[{text:`The Buddhabrot is the probability distribution over the trajectories of points that escape the Mandelbrot fractal.`,cite:1},{text:`Its name reflects its pareidolic resemblance to classical depictions of Gautama Buddha, seated in a meditation pose with a forehead mark (tika), a traditional oval crown (ushnisha), and ringlet of hair.`,cite:2}],references:[{n:1,text:`Green, M. The Buddhabrot Technique. Superliminal, 1993.`,url:`https://www.superliminal.com/fractals/bbrot/bbrot.htm`},{n:2,text:`Wikipedia contributors. Buddhabrot. Wikipedia, The Free Encyclopedia. CC BY-SA 4.0.`,url:`https://en.wikipedia.org/wiki/Buddhabrot`}]}},o=t(),s=8192,c=144,l=320,u=18,d=64,f=32,p=4,m=`
struct Params {
  seedCount: u32,
  layerCount: u32,
  maxIterations: u32,
  minOrbit: u32,
}

struct Point {
  center: vec4f,
  tangent: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> points: array<Point>;

fn hash(value: u32) -> f32 {
  var x = value;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = (x >> 16u) ^ x;
  return f32(x) / 4294967295.0;
}

fn iterate(z: vec2f, c: vec2f) -> vec2f {
  return vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
}

fn isKnownInterior(c: vec2f) -> bool {
  let bulb = (c.x + 1.0) * (c.x + 1.0) + c.y * c.y;
  let q = (c.x - 0.25) * (c.x - 0.25) + c.y * c.y;
  return bulb <= 0.0625 || q * (q + c.x - 0.25) <= 0.25 * c.y * c.y;
}

@compute @workgroup_size(${d})
fn main(@builtin(global_invocation_id) id: vec3u) {
  let seed = id.x;
  if (seed >= params.seedCount) { return; }

  // Fixed seed. The volume is computed once and never randomized frame-to-frame.
  let randomBase = seed * 747796405u + 0x9e3779b9u;
  let random = vec2f(hash(randomBase), hash(randomBase ^ 0x85ebca6bu));
  let c = vec2f(mix(-2.12, 0.72, random.x), mix(-1.42, 1.42, random.y));
  var escapeAt = 0u;
  var z = vec2f(0.0);

  if (!isKnownInterior(c)) {
    for (var step = 0u; step < params.maxIterations; step++) {
      z = iterate(z, c);
      if (dot(z, z) > 4.0) {
        escapeAt = step + 1u;
        break;
      }
    }
  }
  if (escapeAt < params.minOrbit) { return; }

  // Store one orbit sample per normalized time layer. Layer-major order makes
  // the thin MRI window one contiguous instanced draw instead of the full volume.
  z = vec2f(0.0);
  var currentStep = 0u;
  for (var layer = 0u; layer < params.layerCount; layer++) {
    let targetStep = 1u + (layer * max(escapeAt - 2u, 1u)) / max(params.layerCount - 1u, 1u);
    while (currentStep < targetStep) {
      z = iterate(z, c);
      currentStep += 1u;
    }
    let after = iterate(z, c);
    let slot = layer * params.seedCount + seed;
    let normalizedLayer = f32(layer) / f32(max(params.layerCount - 1u, 1u));
    points[slot].center = vec4f(z, normalizedLayer, 1.0);
    points[slot].tangent = vec4f(after - z, f32(escapeAt) / f32(params.maxIterations), 0.0);
  }
}
`,h=`
struct Style {
  resolution: vec2f,
  slice: f32,
  thickness: f32,
  pointScale: f32,
  aspect: f32,
  time: f32,
  intensity: f32,
}

@group(0) @binding(0) var<uniform> style: Style;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) light: f32,
  @location(2) depth: f32,
}

@vertex
fn vs(
  @location(0) centerData: vec4f,
  @location(1) tangentData: vec4f,
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOut {
  let corners = array<vec2f, 6>(
    vec2f(-3.0, -3.0), vec2f(3.0, -3.0), vec2f(-3.0, 3.0),
    vec2f(-3.0, 3.0), vec2f(3.0, -3.0), vec2f(3.0, 3.0)
  );
  var out: VertexOut;
  let layerDelta = abs(centerData.z - style.slice);
  let visible = centerData.w > 0.5 && layerDelta < style.thickness * 3.2;
  if (!visible) {
    out.position = vec4f(2.0, 2.0, 0.0, 1.0);
    out.local = vec2f(99.0);
    out.light = 0.0;
    out.depth = 0.0;
    return out;
  }

  let rawCenter = centerData.xy - vec2f(-0.50, 0.0);
  var center = vec2f(-rawCenter.x, rawCenter.y) * 0.47;
  center.x /= style.aspect;
  var tangent = vec2f(-tangentData.x, tangentData.y);
  tangent.x /= style.aspect;
  let majorDirection = normalize(tangent + vec2f(0.00001, 0.0));
  let minorDirection = vec2f(-majorDirection.y, majorDirection.x);
  let sigma = style.pointScale;
  let corner = corners[vertexIndex];
  let pixelOffset = majorDirection * corner.x * sigma * 1.25 + minorDirection * corner.y * sigma * 0.78;
  let ndcOffset = pixelOffset * 2.0 / style.resolution;
  let normalizedDelta = layerDelta / max(style.thickness, 0.0001);

  out.position = vec4f(center + ndcOffset, 0.0, 1.0);
  out.local = corner;
  out.light = exp(-0.5 * normalizedDelta * normalizedDelta) * style.intensity;
  out.depth = centerData.z;
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let radiusSquared = dot(in.local, in.local);
  if (radiusSquared > 9.0) { discard; }
  let gaussian = exp(-0.5 * radiusSquared);
  let light = gaussian * in.light;
  return vec4f(light, light * mix(0.72, 1.0, in.depth), light * mix(0.42, 0.94, in.depth), light);
}
`,g=`
struct Display {
  resolution: vec2f,
  exposure: f32,
  time: f32,
}

@group(0) @binding(0) var lightTexture: texture_2d<f32>;
@group(0) @binding(1) var lightSampler: sampler;
@group(0) @binding(2) var<uniform> display: Display;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VertexOut;
  out.position = vec4f(positions[index], 0.0, 1.0);
  out.uv = positions[index] * vec2f(0.5, -0.5) + 0.5;
  return out;
}

fn sampleLight(uv: vec2f) -> vec3f {
  return textureSample(lightTexture, lightSampler, uv).rgb;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let texel = 1.0 / display.resolution;
  let center = sampleLight(in.uv);
  let nearGlow = (
    sampleLight(in.uv + vec2f(texel.x * 2.0, 0.0)) +
    sampleLight(in.uv - vec2f(texel.x * 2.0, 0.0)) +
    sampleLight(in.uv + vec2f(0.0, texel.y * 2.0)) +
    sampleLight(in.uv - vec2f(0.0, texel.y * 2.0))
  ) * 0.25;
  let farGlow = (
    sampleLight(in.uv + vec2f(texel.x * 8.0, texel.y * 5.0)) +
    sampleLight(in.uv + vec2f(-texel.x * 8.0, texel.y * 5.0)) +
    sampleLight(in.uv + vec2f(texel.x * 8.0, -texel.y * 5.0)) +
    sampleLight(in.uv - vec2f(texel.x * 8.0, texel.y * 5.0))
  ) * 0.25;
  let density = log(vec3f(1.0) + center * display.exposure);
  let glow = log(vec3f(1.0) + (nearGlow * 0.72 + farGlow * 0.34) * display.exposure);
  let blue = vec3f(0.018, 0.15, 1.0);
  let gold = vec3f(1.0, 0.46, 0.055);
  let white = vec3f(1.0, 0.96, 0.78);
  let scalar = dot(density, vec3f(0.333));
  var color = blue * glow.b * 1.35;
  color += mix(blue, gold, smoothstep(0.08, 0.66, scalar)) * density;
  color = mix(color, white * (0.64 + scalar), smoothstep(0.72, 1.62, scalar));
  let centered = in.uv * 2.0 - 1.0;
  color *= 1.0 - smoothstep(0.48, 1.42, dot(centered, centered));
  color = color / (vec3f(1.0) + color);
  color = pow(color, vec3f(0.82));
  return vec4f(vec3f(0.001, 0.002, 0.006) + color, 1.0);
}
`;function _({gpuContext:e,fading:t}){let n=(0,r.useRef)(null),[i,a]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{let t=n.current;if(!t||!e)return;let r=t,i=!1,o=0,_;async function v(){let t=await e;if(!t||i)return;let n=t.device,v=r.getContext(`webgpu`);if(!v)return;v.configure({device:n,format:t.preferredFormat,alphaMode:`opaque`});let y=globalThis.GPUBufferUsage,b=globalThis.GPUTextureUsage,x=n.createBuffer({label:`buddhabrot-mri-fixed-volume`,size:s*c*f,usage:y.STORAGE|y.VERTEX}),S=n.createBuffer({size:16,usage:y.UNIFORM|y.COPY_DST}),C=n.createBuffer({size:32,usage:y.UNIFORM|y.COPY_DST}),ee=n.createBuffer({size:16,usage:y.UNIFORM|y.COPY_DST}),w=n.createSampler({magFilter:`linear`,minFilter:`linear`}),T=n.createShaderModule({code:m}),E=n.createShaderModule({code:h}),D=n.createShaderModule({code:g}),[O,k,A]=await Promise.all([n.createComputePipelineAsync({layout:`auto`,compute:{module:T,entryPoint:`main`}}),n.createRenderPipelineAsync({layout:`auto`,vertex:{module:E,entryPoint:`vs`,buffers:[{arrayStride:f,stepMode:`instance`,attributes:[{shaderLocation:0,offset:0,format:`float32x4`},{shaderLocation:1,offset:16,format:`float32x4`}]}]},fragment:{module:E,entryPoint:`fs`,targets:[{format:`rgba16float`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),n.createRenderPipelineAsync({layout:`auto`,vertex:{module:D,entryPoint:`vs`},fragment:{module:D,entryPoint:`fs`,targets:[{format:t.preferredFormat}]},primitive:{topology:`triangle-list`}})]);if(i){x.destroy(),S.destroy(),C.destroy(),ee.destroy();return}let j=n.createBindGroup({layout:O.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:{buffer:x}}]}),te=n.createBindGroup({layout:k.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:C}}]}),M=null,ne=null,N={width:0,height:0},re=!document.hidden,ie=!1,P=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,ae=performance.now();n.queue.writeBuffer(S,0,new Uint32Array([s,c,l,u]));let F=n.createCommandEncoder({label:`buddhabrot-mri-precompute`}),I=F.beginComputePass();I.setPipeline(O),I.setBindGroup(0,j),I.dispatchWorkgroups(Math.ceil(s/d)),I.end(),n.queue.submit([F.finish()]);function oe(){let e=r.getBoundingClientRect(),t=e.width<720?1:1.25,i=Math.min(window.devicePixelRatio||1,t),a=Math.max(1,Math.round(e.width*i)),o=Math.max(1,Math.round(e.height*i));a===N.width&&o===N.height||(r.width=a,r.height=o,M?.destroy(),M=n.createTexture({size:[a,o],format:`rgba16float`,usage:b.RENDER_ATTACHMENT|b.TEXTURE_BINDING}),ne=n.createBindGroup({layout:A.getBindGroupLayout(0),entries:[{binding:0,resource:M.createView()},{binding:1,resource:w},{binding:2,resource:{buffer:ee}}]}),N={width:a,height:o})}let se=new ResizeObserver(oe);se.observe(r),oe();function L(e){if(o=0,i||!re||!M||!ne)return;let t=(e-ae)*.001,r=P?.35:t%9.6/9.6,l=.035+.93*(.5-.5*Math.cos(r*Math.PI*2)),u=Math.round(l*(c-1)),d=Math.max(0,u-p),f=Math.min(c-1,u+p)-d+1,m=Math.max(.74,Math.min(1.72,N.height/640));n.queue.writeBuffer(C,0,new Float32Array([N.width,N.height,l,.018,m,N.width/N.height,t,.12])),n.queue.writeBuffer(ee,0,new Float32Array([N.width,N.height,12.5,t]));let h=n.createCommandEncoder(),g=h.beginRenderPass({colorAttachments:[{view:M.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});g.setPipeline(k),g.setBindGroup(0,te),g.setVertexBuffer(0,x),g.draw(6,f*s,0,d*s),g.end();let _=h.beginRenderPass({colorAttachments:[{view:v.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:1}}]});_.setPipeline(A),_.setBindGroup(0,ne),_.draw(3),_.end(),n.queue.submit([h.finish()]),ie||(ie=!0,a(!0)),P||(o=requestAnimationFrame(L))}let ce=()=>{re=!document.hidden,re?!o&&!i&&(o=requestAnimationFrame(L)):(cancelAnimationFrame(o),o=0)};document.addEventListener(`visibilitychange`,ce),re&&(o=requestAnimationFrame(L)),_=()=>{se.disconnect(),document.removeEventListener(`visibilitychange`,ce),cancelAnimationFrame(o),M?.destroy(),x.destroy(),S.destroy(),C.destroy(),ee.destroy(),v.unconfigure()}}return v().catch(()=>void 0),()=>{i=!0,cancelAnimationFrame(o),_?.()}},[e]),(0,o.jsx)(`canvas`,{ref:n,className:`introMriCanvas ${i?`ready`:``} ${t?`fading`:``}`,"aria-label":`Precalculated GPU Buddhabrot MRI depth slices`})}function v(e){return e.split(/\b(tika|ushnisha)\b/).map((e,t)=>e===`tika`||e===`ushnisha`?(0,o.jsx)(`i`,{children:e},t):e)}function y({progress:e,fading:t,ready:n,gpuContext:r,onPlay:i}){let{wikipedia:s}=a;return(0,o.jsxs)(`div`,{className:`introOverlay ${t?`fading`:``}`,role:`status`,"aria-label":`Charting the pond`,children:[(0,o.jsx)(_,{gpuContext:r,fading:t}),(0,o.jsxs)(`div`,{className:`introChrome`,children:[(0,o.jsx)(`span`,{className:`introTitle`,children:`Mandelbrot Skipping`}),(0,o.jsx)(`span`,{className:`introMode`,children:`Precalculated GPU volume · orbit-time MRI`}),!n&&(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,e*100)}%`}})})]}),(0,o.jsxs)(`article`,{className:`introPaper`,"aria-label":`Buddhabrot, from Wikipedia`,children:[(0,o.jsx)(`p`,{className:`introPaperJournal`,children:s.journal}),(0,o.jsx)(`h1`,{className:`introPaperTitle`,children:s.title}),(0,o.jsx)(`p`,{className:`introPaperLede`,children:s.sentences.map(e=>(0,o.jsxs)(`span`,{children:[v(e.text),(0,o.jsx)(`sup`,{className:`introPaperCite`,children:(0,o.jsxs)(`a`,{href:s.references[e.cite-1].url,target:`_blank`,rel:`noreferrer`,children:[`[`,e.cite,`]`]})}),` `]},e.cite))})]}),n&&(0,o.jsx)(`button`,{type:`button`,className:`introPlay`,onClick:i,"aria-label":`Play`,children:`Play`})]})}function b(){let{trigger:e,title:t,formula:n,paragraphs:r}=a;return(0,o.jsxs)(`div`,{className:`howItWorks`,children:[(0,o.jsx)(`button`,{type:`button`,className:`howItWorksTrigger`,"aria-describedby":`how-it-works-panel`,children:e}),(0,o.jsxs)(`div`,{id:`how-it-works-panel`,className:`howItWorksPanel`,role:`tooltip`,children:[(0,o.jsx)(`p`,{className:`howItWorksKicker`,children:t}),(0,o.jsx)(`p`,{className:`howItWorksGpuNote`,children:`Pre-iterated on your GPU, then looped live · no video`}),(0,o.jsx)(`p`,{className:`howItWorksFormula`,children:n}),r.map(e=>(0,o.jsx)(`p`,{children:e},e.slice(0,24)))]})]})}var x=.04;function S(e){let t=e.onScreen?0:e.offscreenStreak+1,n=e.hopPx<=.04?e.tinyHopStreak+1:0,r=!Number.isFinite(e.hopPx)||!Number.isFinite(e.magSq),i=e.magSq>4;return{resolved:r||i||n>=500||t>=800,offscreenStreak:t,tinyHopStreak:n}}var C=.76;function ee(e,t=C){let n=(1-t**14)/(1-t),r=Math.min(Math.max(e(),0),.999999999)*n;for(let e=2;e<=15;e++)if(r-=t**(e-2),r<0)return e;return 15}function w(e,t,n,r){let i=Math.max(n,r),a=e+n>i?0:e;return{start:a,nextSource:(a+n)%i,sourceCount:Math.min(i,t+n)}}function T(e,t,n){let r=Math.max(0,n-e),i=Math.min(t,r);return{start:e,nextSource:e+i,sourceCount:e+i,added:i}}var E=1024,D=99.92;function O(e,t,n){let r=e.length,i=0;for(let t=0;t<r;t++)i+=e[t];if(i===0)return 0;let a=i*n/100,o=0;for(let n=0;n<r;n++){let i=e[n];if(i>0&&o+i>=a){let e=(a-o)/i;return(n+e)/r*t}o+=i}return t}function k(e,t=20){if(!(t>0))return{low:0,high:1};let n=O(e,t,54),r=O(e,t,D);return{low:n,high:Math.max(r,n+1e-9)}}var A=.05;function j(e){return!Number.isFinite(e)||e<0?0:Math.min(e,A)}function te(e,t){let n=t.maxSamplesPerFrame??2e6,r=t.minDurationMs??5e3;if(r<=0)return n;let i=j(e)*1e3/r;return Math.max(1,Math.min(n,Math.floor(t.totalSamples*i)))}var M={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5},ne=`
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
`,N=`
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
  let scaled = light / 20.0 * ${E}.0;
  let bin = min(${E}u - 1u, u32(max(scaled, 0.0)));
  atomicAdd(&bins[bin], 1u);
}
`,re=`
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
`,ie=`
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
`,P={2048:16e6,4096:64e6};function ae(e,t){let n=e.device,r=globalThis.GPUBufferUsage,i=globalThis.GPUTextureUsage,{size:a}=t,o=a*a,s=t.totalSamples??P[a]??16e6,c=t.maxIterations??320,l=n.createBuffer({size:o*4,usage:r.STORAGE|r.COPY_DST}),u=n.createBuffer({size:E*4,usage:r.STORAGE|r.COPY_DST|r.COPY_SRC}),d=n.createBuffer({size:E*4,usage:r.COPY_DST|r.MAP_READ}),f=n.createBuffer({size:32,usage:r.UNIFORM|r.COPY_DST}),p=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),m=n.createBuffer({size:16,usage:r.UNIFORM|r.COPY_DST}),h=n.createTexture({size:[a,a],format:`rgba8unorm`,usage:i.STORAGE_BINDING|i.TEXTURE_BINDING|i.COPY_SRC}),g=n.createSampler({magFilter:`linear`,minFilter:`linear`}),_=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:ne}),entryPoint:`accumulate`}}),v=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:N}),entryPoint:`histogram`}}),y=n.createComputePipeline({layout:`auto`,compute:{module:n.createShaderModule({code:re}),entryPoint:`colorize`}}),b=n.createShaderModule({code:ie}),x=n.createRenderPipeline({layout:`auto`,vertex:{module:b,entryPoint:`vs`},fragment:{module:b,entryPoint:`fs`,targets:[{format:e.preferredFormat}]},primitive:{topology:`triangle-list`}}),S=n.createBindGroup({layout:_.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:l}}]}),C=n.createBindGroup({layout:v.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}}]}),ee=n.createBindGroup({layout:y.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:m}},{binding:1,resource:{buffer:l}},{binding:2,resource:h.createView()}]}),w=n.createBindGroup({layout:x.getBindGroupLayout(0),entries:[{binding:0,resource:h.createView()},{binding:1,resource:g}]});n.queue.writeBuffer(p,0,new Uint32Array([a,0,0,0]));let T=0,D=0,O=!1,A=!1,j={low:.69,high:3};function ae(e){let t=new ArrayBuffer(32);new Uint32Array(t,0,4).set([a,D+1,e,c]),new Float32Array(t,16,4).set([M.xMin,M.xMax,M.yMin,M.yMax]),n.queue.writeBuffer(f,0,t)}function F(){let e=new ArrayBuffer(16);new Uint32Array(e,0,2).set([a,0]),new Float32Array(e,8,2).set([j.low,j.high]),n.queue.writeBuffer(m,0,e)}async function I(){if(!(A||O)){A=!0;try{let e=n.createCommandEncoder({label:`buddhabrot-histogram-readback`});if(e.copyBufferToBuffer(u,0,d,0,E*4),n.queue.submit([e.finish()]),await d.mapAsync(globalThis.GPUMapMode.READ),O)return;j=k(new Uint32Array(d.getMappedRange().slice(0))),d.unmap()}catch(e){console.warn(`[buddhabrot] histogram readback failed`,e)}finally{A=!1}}}return{step(r){if(O||e.hasFailed()||T>=s)return;let i=te(r,{totalSamples:s,minDurationMs:t.minDurationMs}),o=Math.min(i,s-T);ae(o),F(),n.queue.writeBuffer(u,0,new Uint32Array(E));let c=n.createCommandEncoder({label:`buddhabrot-step`}),l=c.beginComputePass();l.setPipeline(_),l.setBindGroup(0,S),l.dispatchWorkgroups(Math.ceil(o/64)),l.setPipeline(v),l.setBindGroup(0,C),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.setPipeline(y),l.setBindGroup(0,ee),l.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(a/8)),l.end(),n.queue.submit([c.finish()]),T+=o,D+=1,I()},progress(){return Math.min(1,T/s)},isComplete(){return T>=s},blit(t){if(O||e.hasFailed())return!1;let r=n.createCommandEncoder({label:`buddhabrot-blit`}),i=r.beginRenderPass({colorAttachments:[{view:t.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});return i.setPipeline(x),i.setBindGroup(0,w),i.draw(3),i.end(),n.queue.submit([r.finish()]),!0},async toBitmapAndBlob(){let t=new OffscreenCanvas(a,a),r=t.getContext(`webgpu`);if(r.configure({device:n,format:e.preferredFormat,alphaMode:`premultiplied`}),!this.blit(r))throw Error(`Buddhabrot generator cannot blit: GPU context is destroyed or has failed.`);return{bitmap:await createImageBitmap(t),blobPromise:t.convertToBlob({type:`image/png`}).catch(e=>(console.warn(`[buddhabrot] PNG encode failed; texture will not be cached`,e),null))}},destroy(){O=!0,n.queue.onSubmittedWorkDone().finally(()=>{h.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy()})}}}var F=`mandelbrot-skipping`,I=`textures`;function oe(e){let t=e.matchMedia(`(pointer: coarse)`).matches,n=Math.min(e.screen.width,e.screen.height);return t&&n<=820?2048:4096}function se(e){return`buddhabrot:v3:${e}`}async function L(e,t){try{return await t.get(se(e))}catch{return null}}async function ce(e,t,n){let r=se(e);try{await n.put(r,t)}catch{return!1}return await R(r,n),!0}async function R(e,t){try{let n=await t.keys();await Promise.all(n.filter(t=>t.startsWith(`buddhabrot:`)&&t!==e).map(e=>t.delete(e).catch(()=>{})))}catch{}}function z(e){return new Promise((t,n)=>{let r=e.open(F,1);r.onupgradeneeded=()=>{r.result.objectStoreNames.contains(I)||r.result.createObjectStore(I)},r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error),r.onblocked=()=>n(Error(`IndexedDB open blocked`))})}function le(e){return{async get(t){let n=await z(e);try{return await new Promise((e,r)=>{let i=n.transaction(I,`readonly`).objectStore(I).get(t);i.onsuccess=()=>e(i.result??null),i.onerror=()=>r(i.error)})}finally{n.close()}},async put(t,n){let r=await z(e);try{await new Promise((e,i)=>{let a=r.transaction(I,`readwrite`);a.objectStore(I).put(n,t),a.oncomplete=()=>e(),a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{r.close()}},async keys(){let t=await z(e);try{return await new Promise((e,n)=>{let r=t.transaction(I,`readonly`).objectStore(I).getAllKeys();r.onsuccess=()=>e(r.result.map(String)),r.onerror=()=>n(r.error)})}finally{t.close()}},async delete(t){let n=await z(e);try{await new Promise((e,r)=>{let i=n.transaction(I,`readwrite`);i.objectStore(I).delete(t),i.oncomplete=()=>e(),i.onerror=()=>r(i.error),i.onabort=()=>r(i.error)})}finally{n.close()}}}}var ue=.29,de=2e6,fe=5400,pe=4200;function B(e,t,n=Math.random){return{x:36+n()*Math.max(8,e-72),y:36+n()*Math.max(8,t-72)}}function me(e,t){let n=e-.25,r=n*n+t*t;if(r*(r+n)<=.25*t*t)return!0;let i=e+1;if(i*i+t*t<=.0625)return!0;let a=e+.125,o=Math.abs(t);return a*a+(o-.745)*(o-.745)<=.009}function he(e=Math.random){for(let t=0;t<48;t++){let t=e(),n,r;if(t<.5)n=-2.2+e()*3.4,r=-1.5+e()*3;else if(t<.78){let t=e()*Math.PI*2,i=.5*(1-Math.cos(t))+.002+e()*.045;n=.25+i*Math.cos(t),r=i*Math.sin(t)}else n=-2+e()*1.4,r=(e()-.5)*.35;if(me(n,r))continue;let i=0,a=0,o=!1;for(let e=1;e<=8e3;e++){let t=i*i-a*a+n,s=2*i*a+r;if(i=t,a=s,i*i+a*a>4){e>=8&&(o=!0);break}}if(o)return{x:n,y:r}}return{x:-.75+(e()-.5)*.05,y:.18+(e()-.5)*.05}}var ge={drawLines:!0,grayscale:!1,energy:.01,hiddenSteps:0,liveGain:1,contrast:.72,atlasGain:1},_e={drawLines:!1,grayscale:!0,energy:.28,hiddenSteps:1,liveGain:.12,contrast:1.22,atlasGain:1},V=.12,ve=.075;function ye(e){return e===`intro`?{pondGain:0,throwGain:1,coneEnabled:!1}:e===`aiming`?{pondGain:V,throwGain:0,coneEnabled:!0}:{pondGain:0,throwGain:1,coneEnabled:!1}}function H(e,t=12){let n=(e/Math.max(t,1e-5)%1+1)%1,r=n<.5?n*2:2-n*2,i=r*r*(3-2*r);return{zCamera:.09+i*.18,sliceHalf:ve,zoom:1+i*.18}}var U=[1e4,25e3,5e4,1e5,25e4,5e5,1e6,2e6,5e6,1e7,2e7,5e7,1e8,2e8,5e8,1e9,2e9],be=.5;function xe(e){let t=Math.round((Number(e)||10)*10)/10;return Math.max(be,Math.min(18,t))}function Se(e,t,n,r){let i=Math.max(0,Math.min(1,e/Math.max(t,1)))**+r*Math.max(0,n-4);return Math.min(n,Math.max(4,Math.floor(4+i)))}var Ce={xMin:-2.2,xMax:1.2,yMin:-1.5,yMax:1.5};function we(e,t=!1){return t?1:Math.min(Math.max(e,1),2)}function Te(e,t,n){let r=we(n);return{width:Math.max(1,Math.round(e*r)),height:Math.max(1,Math.round(t*r)),dpr:r}}var Ee=.8;function De(e,t,n){return e.halfY*t/Math.max(n,1)}function W(e,t,n){return n?{x:t,y:-e}:{x:e,y:t}}function Oe(e,t,n){return n?{dx:-t,dy:e}:{dx:e,dy:t}}function ke(e,t,n,r,i,a=!1){let o=Oe((e/n*2-1)*De(i,n,r),(1-t/r*2)*i.halfY,a);return{x:i.centerX+o.dx,y:i.centerY+o.dy}}function Ae(e,t,n,r,i,a=!1){let o=De(i,n,r),s=W(e-i.centerX,t-i.centerY,a);return{x:(s.x/o+1)*n*.5,y:(1-s.y/i.halfY)*r*.5}}function je(e,t,n,r,i,a=!1){let o=W(e-n.centerX,t-n.centerY,a);return{x:o.x/De(n,r,i),y:o.y/n.halfY}}function Me(e,t,n=Ee){return e*n/Math.max(t,1e-6)}function Ne(e,t,n,r,i,a,o=!1){let s=ke(e,t,n,r,i,o);return Ae(s.x,s.y,n,r,a,o)}function Pe(e,t,n,r,i,a,o,s,c=!1){let l=Ne(e,t,i,a,o,s,c),u=Ne(e+n,t+r,i,a,o,s,c);return{x:u.x-l.x,y:u.y-l.y}}function Fe(e,t,n,r){let i=De(e,t,n),a=r?e.halfY:i,o=r?i:e.halfY;return{xMin:e.centerX-a,xMax:e.centerX+a,yMin:e.centerY-o,yMax:e.centerY+o}}var Ie=.035,Le=2.4,Re=-8,G=8,K=-Math.PI,q=Math.PI;function J(e){return e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12).trim()||`YOU`}function Y(e){return`${J(e)}'s`}function ze(e,t,n){let r=Math.max(0,Math.min(1,(e-t)/(n-t)));return Math.round(r*65535)}function X(e,t,n){return t+e/65535*(n-t)}function Z(e){let t=``;for(let n of e)t+=String.fromCharCode(n);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/g,``)}function Be(e){if(!/^[A-Za-z0-9_-]+$/.test(e))return null;let t=e+`=`.repeat((4-e.length%4)%4);try{let e=atob(t.replace(/-/g,`+`).replace(/_/g,`/`));return Uint8Array.from(e,e=>e.charCodeAt(0))}catch{return null}}function Q(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)?t:null}function Ve(e){return!Number.isFinite(e.view.centerX)||!Number.isFinite(e.view.centerY)||!Number.isFinite(e.view.halfY)||!Number.isFinite(e.angle)||!Number.isFinite(e.power)||e.power<=0||e.power>1||e.skips<2||e.skips>15||e.skips!==Math.round(e.skips)||e.glyph<0||e.glyph>=7||e.glyph!==Math.round(e.glyph)||e.sourceDots<6||e.sourceDots>32||e.sourceDots!==Math.round(e.sourceDots)||e.view.halfY<.035||e.view.halfY>2.4?null:{version:1,view:e.view,rotateRight:e.rotateRight,angle:e.angle,power:e.power,skips:e.skips,glyph:e.glyph,seed:e.seed|0,sourceDots:e.sourceDots,name:J(e.name??`YOU`)}}function He(e){let t=e.split(`_`);if(t.length!==11)return null;let n=Q(t[0]),r=Q(t[1]),i=Q(t[2]),a=Q(t[3]),o=Q(t[4]),s=Q(t[5]),c=Q(t[6]),l=Q(t[7]),u=Q(t[8]),d=Q(t[9]),f=Q(t[10]);return n!==1||r==null||i==null||a==null||o==null||s==null||c==null||l==null||u==null||d==null||f==null||o!==0&&o!==1?null:Ve({view:{centerX:r,centerY:i,halfY:a},rotateRight:o===1,angle:s,power:c,skips:l,glyph:u,seed:d,sourceDots:f})}function Ue(e){let t=Be(e);if(!t||t.length<20)return null;let n=new DataView(t.buffer,t.byteOffset,t.byteLength);if(n.getUint8(0)!==2)return null;let r=n.getUint8(19);if(t.length!==20+r)return null;let i=new TextDecoder().decode(t.subarray(20,20+r));return Ve({view:{centerX:X(n.getUint16(1),Re,G),centerY:X(n.getUint16(3),Re,G),halfY:X(n.getUint16(5),Ie,Le)},rotateRight:(n.getUint8(11)&1)==1,angle:X(n.getUint16(7),K,q),power:X(n.getUint16(9),0,1),skips:n.getUint8(12),glyph:n.getUint8(13),sourceDots:n.getUint8(14),seed:n.getInt32(15),name:i})}function We(e){let t=J(e.name),n=new TextEncoder().encode(t),r=new Uint8Array(20+n.length),i=new DataView(r.buffer);return i.setUint8(0,2),i.setUint16(1,ze(e.view.centerX,Re,G)),i.setUint16(3,ze(e.view.centerY,Re,G)),i.setUint16(5,ze(e.view.halfY,Ie,Le)),i.setUint16(7,ze(e.angle,K,q)),i.setUint16(9,ze(e.power,0,1)),i.setUint8(11,+!!e.rotateRight),i.setUint8(12,e.skips),i.setUint8(13,e.glyph),i.setUint8(14,e.sourceDots),i.setInt32(15,e.seed|0),i.setUint8(19,n.length),r.set(n,20),Z(r)}function Ge(e){return e?e.includes(`_`)&&e.startsWith(`1_`)?He(e):Ue(e):null}function Ke(e){let t=e.hash.startsWith(`#`)?e.hash.slice(1):e.hash,n=new URLSearchParams(t).get(`t`),r=new URLSearchParams(e.search).get(`t`),i=n??r;return i?Ge(i):null}function qe(e,t){let n=new URL(e);return n.searchParams.delete(`t`),n.hash=`t=${We(t)}`,n.toString()}var Je=7,Ye=[2,2,2,4,2,3,7],Xe=6,Ze=32,Qe=4096,$e=4096,et=U[U.length-1],tt=.05,nt=.05,$=8,rt=10,it=50,at=[[80,214,255],[92,255,196],[186,255,120],[255,230,110],[255,168,92],[255,122,186],[196,146,255]].map(([e,t,n])=>`vec3f(${(e/255).toFixed(5)}, ${(t/255).toFixed(5)}, ${(n/255).toFixed(5)})`).join(`, `),ot={sourceDots:18,maxDepth:2e6,acceleration:10,linePersist:.6,previewOrbits:!1,previewIterations:20,skipColors:!0,coordinateAxes:!1,rotateRight:!0,doublePixels:!1},st=`mandelbrot-skipping:tuning:v5`,ct=10,lt=.3,ut=.16,dt=4e5,ft=0,pt=6,mt=25e3,ht=mt+Qe,gt=32,_t=gt*gt/32,vt=(gt*gt-1)/12,yt=4,bt=2,xt=`mandelbrot-skipping:scores:v2`,St=`mandelbrot-skipping:scores:v1`,Ct=Math.PI*2,wt={x:-.58,y:0},Tt=.8,Et={x:-.55,y:0},Dt=1.52,Ot=1.6,kt=1.15,At=[[0,2,3,5,7,9,10],[0,1,4,6,7,10],[0,2,4,6,8,10],[0,3,5,7,10],[0,1,5,7,8]],jt=`
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
        if (slot < ${dt}u) {
          vertices[slot] = OrbitPoint(z, depthColor, state.reserved.x);
        }
      }
      if (state.step > u32(params.hiddenSteps) + 1u && (inAtlas || all(abs(previousClip) <= vec2f(1.0))) && i >= firstLineStep) {
        let future = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + state.c;
        let incomingLength = length(clip - previousClip);
        let control1 = previousZ + (z - previousZ) / 3.0;
        let control2 = z - (future - z) / 3.0;
        if (incomingLength <= 0.12 && length(z - previousZ) <= 0.12) {
          let lineVertex = atomicAdd(&lineDrawArgs.vertexCount, ${pt*2}u);
          let lineSlot = lineVertex / ${pt*2}u;
          if (lineSlot < ${ht}u) {
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
    state.tinyHopStreak = select(0u, state.tinyHopStreak + 1u, hopPx <= ${x} && hopPx == hopPx);
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
`,Mt=`
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
  let colors = array<vec3f, 7>(${at});
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
`,Nt=`
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
  let colors = array<vec3f, 7>(${at});
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
  let curveIndex = vertex / ${pt*2}u;
  let localVertex = vertex % ${pt*2}u;
  let subsegment = localVertex / 2u;
  let endpoint = localVertex % 2u;
  let t = f32(subsegment + endpoint) / f32(${pt});
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
`,Pt=`
struct VSOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: VSOut;
  out.position = vec4f(p[i], 0.0, 1.0);
  out.uv = p[i] * vec2f(0.5, -0.5) + 0.5;
  return out;
}
`,Ft=`
${Pt}
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
`,It=`
${Pt}
@group(0) @binding(0) var pondTexture: texture_2d<f32>;
@group(0) @binding(1) var throwTexture: texture_2d<f32>;
@group(0) @binding(2) var throwLineTexture: texture_2d<f32>;
@group(0) @binding(3) var liveTexture: texture_2d<f32>;
@group(0) @binding(4) var liveLineTexture: texture_2d<f32>;
@group(0) @binding(5) var displaySampler: sampler;
@group(0) @binding(6) var mriTexture: texture_2d<f32>;
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
  mriEnabled: f32,
  mriCamera: f32,
  mriSliceHalf: f32,
  mriZoom: f32,
}
@group(0) @binding(7) var<uniform> display: DisplayView;
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
  var pondUv = layerUv(z, display.pondBounds);
  if (display.mriEnabled > 0.5) {
    pondUv = (pondUv - vec2f(0.5)) / max(display.mriZoom, 1.0) + vec2f(0.5);
  }
  let throwUv = layerUv(z, display.throwBounds);
  let pondInside = all(pondUv >= vec2f(0.0)) && all(pondUv <= vec2f(1.0));
  let throwInside = all(throwUv >= vec2f(0.0)) && all(throwUv <= vec2f(1.0));
  let pondRaw = select(vec3f(0.0), textureSample(pondTexture, displaySampler, pondUv).rgb, pondInside);
  let throwRaw = select(vec3f(0.0), textureSample(throwTexture, displaySampler, throwUv).rgb, throwInside);
  let mriRaw = select(vec3f(0.0), textureSample(mriTexture, displaySampler, pondUv).rgb, pondInside);
  let scanRaw = select(pondRaw, mriRaw, display.mriEnabled > 0.5);
  var mriWeight = 1.0;
  if (display.mriEnabled > 0.5) {
    let depthNumerator = max(0.0, 0.92 * scanRaw.r - 0.10 * scanRaw.b);
    let depthDenominator = max(1e-5, 0.82 * scanRaw.b + 0.10 * scanRaw.r);
    let inferredDepth = clamp(depthNumerator / depthDenominator, 0.0, 1.0);
    let band = (inferredDepth - display.mriCamera) / max(display.mriSliceHalf, 1e-4);
    mriWeight = exp(-band * band);
  }
  let raw = scanRaw * 3.6 * mriWeight;
  let mapped = raw / (vec3f(1.0) + raw);
  let glow = pow(clamp(mapped, vec3f(0.0), vec3f(1.0)), vec3f(contrast)) * pondGain * cone;
  let throwGlow = toneMap(throwRaw, contrast);
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
`;function Lt(e){return Math.round(e).toLocaleString()}function Rt(e){let t=e.distinct;if(!t)return{area:0,coverage:0,spread:0,elongation:0,orientation:0,density:0,centroidX:0,centroidY:0};let n=e.sumX/t,r=e.sumY/t,i=Math.max(0,e.sumXX/t-n*n),a=Math.max(0,e.sumYY/t-r*r),o=e.sumXY/t-n*r,s=Math.max(0,i*a-o*o),c=Math.sqrt((i-a)**2+4*o*o),l=Math.max(0,(i+a+c)*.5),u=Math.max(0,(i+a-c)*.5),d=Math.min(1,Math.sqrt(s)/vt),f=Math.min(1,Math.log2(1+t)/Math.log2(1+gt*gt)),p=l>.001?Math.min(1,1-Math.sqrt(u/l)):0,m=.5*Math.atan2(2*o,i-a),h=Math.max(1,Math.min(gt*gt,4*Math.PI*Math.sqrt(s))),g=Math.min(1,t/h);return{area:d,coverage:f,spread:Math.sqrt(d),elongation:p,orientation:m,density:g,centroidX:n/(gt-1)*2-1,centroidY:r/(gt-1)*2-1}}function zt(e,t){let n=Math.min(t,et),r=Rt(e),i=n*.03+Math.sqrt(n)*75,a=8e4*r.coverage,o=12e4*r.spread*Math.min(1,e.distinct/24);return Math.round((i+a+o)*(1+(e.skip-1)*.12))}function Bt(e){let t=e|0;return()=>(t^=t<<13,t^=t>>>17,t^=t<<5,(t>>>0)/4294967296)}function Vt(e){return e>=1e9?`${e/1e9}B`:e>=1e6?`${e/1e6}M`:e>=1e3?`${e/1e3}K`:String(e)}function Ht(e,t){let n=Math.max(0,Math.min(.05,e));return t<=0?0:n===0?1:tt**+(n/t)}function Ut(e){let t=Math.round(Number(e?.sourceDots)),n=t>=Xe?Math.min(Ze,t):ot.sourceDots,r=Number(e?.maxDepth),i=U.includes(r)?r:ot.maxDepth,a=xe(e?.acceleration??10),o=Math.max(nt,Math.min($,Math.round((Number(e?.linePersist)||ot.linePersist)*20)/20)),s=e?.previewOrbits===!0,c=e?.skipColors!==!1,l=e?.coordinateAxes===!0,u=e?.rotateRight!==!1,d=e?.doublePixels===!0,f=Math.round(Number(e?.previewIterations)||ot.previewIterations);return{sourceDots:n,maxDepth:i,acceleration:a,linePersist:o,previewOrbits:s,previewIterations:Math.max(rt,Math.min(it,f)),skipColors:c,coordinateAxes:l,rotateRight:u,doublePixels:d}}function Wt(){try{return Ut(JSON.parse(localStorage.getItem(st)||`null`))}catch{return ot}}function Gt(e){try{localStorage.setItem(st,JSON.stringify(e))}catch{}}function Kt(e,t){let n=(t%1+1)%1*e.length,r=Math.floor(n)%e.length,i=n-Math.floor(n),a=e[r],o=e[(r+1)%e.length];return{x:a.x+(o.x-a.x)*i,y:a.y+(o.y-a.y)*i}}function qt(e,t=-Math.PI/2){return Array.from({length:e},(n,r)=>({x:Math.cos(t+r*Ct/e),y:Math.sin(t+r*Ct/e)}))}function Jt(e,t,n){let r=(e,t,r)=>({x:e+Math.cos(n*Ct-Math.PI/2)*r,y:t+Math.sin(n*Ct-Math.PI/2)*r});switch(e%Je){case 0:return r(0,0,t===0?1:.46);case 1:return t===0?Kt(qt(3),n):r(0,0,.48);case 2:return r(t===0?-.32:.32,0,.68);case 3:{let e=t*Math.PI/2;return r(Math.cos(e)*.43,Math.sin(e)*.43,.52)}case 4:{if(t===1)return r(0,0,.34);let e=qt(5);return Kt([e[0],e[2],e[4],e[1],e[3]],n)}case 5:return t<2?Kt(qt(3,-Math.PI/2+t*Math.PI),n):r(0,0,.34);default:{if(t===0)return r(0,0,.42);let e=(t-1)*Ct/6-Math.PI/2;return r(Math.cos(e)*.42,Math.sin(e)*.42,.42)}}}function Yt(e,t,n,r,i,a,o,s){let c=[],l=Ye[o%Ye.length];for(let u=0;u<a;u++){let d=u%l,f=Math.floor(u/l),p=Math.ceil((a-d)/l),m=Jt(o,d,f/Math.max(p,1)),h=ke(e+m.x*ct,t+m.y*ct,n,r,i,s);c.push({x:Math.fround(h.x),y:Math.fround(h.y)})}return c}function Xt(){try{let e=JSON.parse(localStorage.getItem(xt)||`null`),t=(e,t=!1)=>e.flatMap(e=>{if(!e||typeof e!=`object`)return[];let n=e;return typeof n.id==`string`&&typeof n.name==`string`&&n.name.length<=12&&Number.isFinite(n.score)&&Number.isFinite(n.deepest)&&Number.isFinite(n.skips)&&typeof n.createdAt==`string`?[{id:n.id,name:n.name,score:t?Math.round(n.score/100):n.score,deepest:n.deepest,skips:n.skips,coverage:Number.isFinite(n.coverage)?n.coverage:0,spread:Number.isFinite(n.spread)?n.spread:0,createdAt:n.createdAt}]:[]}).slice(0,10);if(e?.version===2&&Array.isArray(e.entries))return t(e.entries);let n=JSON.parse(localStorage.getItem(St)||`null`);if(n?.version!==1||!Array.isArray(n.entries))return[];let r=t(n.entries,!0);return Zt(r),r}catch{return[]}}function Zt(e){try{localStorage.setItem(xt,JSON.stringify({version:2,entries:e}))}catch{}}async function Qt(e,t,n=!1){let r=t.device,i=e.getContext(`webgpu`),a=t.preferredFormat;i.configure({device:r,format:a,alphaMode:`opaque`});let o=globalThis.GPUBufferUsage,s=globalThis.GPUTextureUsage,c=r.createBuffer({size:dt*16,usage:o.STORAGE|o.VERTEX}),l=r.createBuffer({size:ht*48,usage:o.STORAGE}),u=r.createBuffer({size:Qe*48,usage:o.STORAGE|o.COPY_DST}),d=r.createBuffer({size:16,usage:o.STORAGE|o.COPY_DST|o.INDIRECT}),f=r.createBuffer({size:16,usage:o.STORAGE|o.COPY_DST|o.INDIRECT}),p=r.createBuffer({size:80,usage:o.UNIFORM|o.COPY_DST}),m=r.createBuffer({size:80,usage:o.UNIFORM|o.COPY_DST}),h=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),g=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),_=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),v=r.createBuffer({size:16,usage:o.UNIFORM|o.COPY_DST}),y=r.createBuffer({size:128,usage:o.UNIFORM|o.COPY_DST}),b=r.createSampler({magFilter:`nearest`,minFilter:`nearest`}),x=r.createShaderModule({code:jt}),S=r.createShaderModule({code:Mt}),C=r.createShaderModule({code:Nt}),ee=r.createShaderModule({code:Ft}),E=r.createShaderModule({code:It}),D=r.createComputePipeline({layout:`auto`,compute:{module:x,entryPoint:`main`}}),O=r.createRenderPipeline({layout:`auto`,vertex:{module:S,entryPoint:`vs`,buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:`float32x2`},{shaderLocation:1,offset:8,format:`float32`},{shaderLocation:2,offset:12,format:`float32`}]}]},fragment:{module:S,entryPoint:`fs`,targets:[{format:`rgba16float`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`point-list`}}),k=r.createRenderPipeline({layout:`auto`,vertex:{module:C,entryPoint:`vs`},fragment:{module:C,entryPoint:`fs`,targets:[{format:`rgba8unorm`,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`max`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`max`}}}]},primitive:{topology:`line-list`}}),A=r.createRenderPipeline({layout:`auto`,vertex:{module:ee,entryPoint:`vs`},fragment:{module:ee,entryPoint:`fadeFs`,targets:[{format:`rgba16float`}]},primitive:{topology:`triangle-list`}}),j=r.createRenderPipeline({layout:`auto`,vertex:{module:ee,entryPoint:`vs`},fragment:{module:ee,entryPoint:`fadeFs`,targets:[{format:`rgba8unorm`}]},primitive:{topology:`triangle-list`}}),te=r.createRenderPipeline({layout:`auto`,vertex:{module:E,entryPoint:`vs`},fragment:{module:E,entryPoint:`displayFs`,targets:[{format:a}]},primitive:{topology:`triangle-list`}}),M=r.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:d}},{binding:4,resource:{buffer:l}},{binding:5,resource:{buffer:f}}]}),ne=r.createBindGroup({layout:O.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:h}},{binding:1,resource:{buffer:p}},{binding:2,resource:{buffer:g}}]}),N=r.createBindGroup({layout:O.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:h}},{binding:1,resource:{buffer:m}},{binding:2,resource:{buffer:g}}]}),re=r.createBindGroup({layout:k.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:h}},{binding:2,resource:{buffer:p}}]}),ie=r.createBindGroup({layout:k.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:h}},{binding:2,resource:{buffer:m}}]}),P=0,ae=0,F=0,I=!1,oe=!1,se=!1,L=[],ce=[],R=[],z=null,le=null,de=null,fe=[],pe=[],B=[],me=[],he=0,_e=0,V=0,ve=0,U=1,be=1,xe={centerX:Et.x,centerY:Et.y,halfY:Dt},Se=ot.maxDepth,Ee=ot.acceleration,De=ot.linePersist,W=ot.skipColors,Oe=ot.rotateRight,ke=n,Ae=ge.drawLines,je=ge.grayscale,Me=ge.energy,Ne=ge.hiddenSteps,Pe=ge.liveGain,Ie=ge.contrast,Le=ye(`intro`),Re=Le.pondGain,G=Le.throwGain,K=null,q=!1,J=!1,Y=0,ze=0,X=`pond`,Z={...Ce},Be={...Ce},Q=0,Ve=e=>r.createTexture({size:[V,ve],format:e,usage:s.RENDER_ATTACHMENT|s.TEXTURE_BINDING});function He(e,t){for(let n of t)n&&e.beginRenderPass({colorAttachments:[{view:n.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end()}function Ue(e,t,n){return e.map(e=>r.createBindGroup({layout:n.getBindGroupLayout(0),entries:[{binding:0,resource:e.createView()},{binding:1,resource:b},{binding:2,resource:{buffer:t}}]}))}function We(){me=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++)me[e*2+t]=r.createBindGroup({layout:te.getBindGroupLayout(0),entries:[{binding:0,resource:L[e].createView()},{binding:1,resource:ce[t].createView()},{binding:2,resource:R[t].createView()},{binding:3,resource:z.createView()},{binding:4,resource:le.createView()},{binding:5,resource:b},{binding:6,resource:de.createView()},{binding:7,resource:{buffer:y}}]})}function Ge(e,t){let n=q&&t>.5?Ce:X===`pond`?Z:Be,i=new ArrayBuffer(80),a=new Uint32Array(i),o=new Float32Array(i);a[0]=P,a[1]=Math.max(1,Math.floor(dt/Math.max(P,1))),a[2]=Se,a[3]=Ae?Math.max(1,Math.floor(mt/Math.max(P,1))):0,o[4]=xe.centerX,o[5]=xe.centerY,o[6]=xe.halfY*V/Math.max(ve,1),o[7]=xe.halfY,o[8]=V,o[9]=ve,o[10]=+!!Oe,o[11]=Ee,o[12]=t,o[13]=Ne,o[16]=n.xMin,o[17]=n.xMax,o[18]=n.yMin,o[19]=n.yMax,r.queue.writeBuffer(e,0,i)}function Ke(){let t=e.getBoundingClientRect(),n=Te(t.width,t.height,we(globalThis.devicePixelRatio||1,ke));if(U=Math.max(1,t.width),be=Math.max(1,t.height),L.length&&n.width===V&&n.height===ve)return;V=n.width,ve=n.height,e.width=V,e.height=ve;for(let e of[...L,...ce,...R,z,le,de])e?.destroy();L=[0,1].map(()=>Ve(`rgba16float`)),ce=[0,1].map(()=>Ve(`rgba16float`)),R=[0,1].map(()=>Ve(`rgba8unorm`)),z=Ve(`rgba16float`),le=Ve(`rgba8unorm`),de=Ve(`rgba16float`),fe=Ue(L,_,A),pe=Ue(ce,_,A),B=Ue(R,v,j),We();let i=r.createCommandEncoder({label:`orbit-resize`});He(i,L),He(i,ce),He(i,R),He(i,[z,le,de]),r.queue.submit([i.finish()]),he=0,_e=0}let qe=new ResizeObserver(Ke);qe.observe(e),Ke();function Je(){I||F||(F=requestAnimationFrame(Ye))}function Ye(){if(F=0,I||t.hasFailed()||!L.length||se)return;let e=performance.now(),n=Q?(e-Q)/1e3:1/60;Q=e;let a=Ht(n,De);Ge(p,0),Ge(m,1);let o=J?Math.max(0,e-ze)/1e3:0,s=q?H(o):{zCamera:0,sliceHalf:1,zoom:1};r.queue.writeBuffer(h,0,new Float32Array([Me,q?0:+!!je,q?0:+!!W,0])),r.queue.writeBuffer(g,0,new Float32Array([s.zCamera,s.sliceHalf,s.zoom,0])),r.queue.writeBuffer(d,0,new Uint32Array([0,1,0,0])),r.queue.writeBuffer(f,0,new Uint32Array([0,1,0,0])),r.queue.writeBuffer(_,0,new Float32Array([1,0,0,0])),r.queue.writeBuffer(v,0,new Float32Array([a,0,0,0]));let l=new Float32Array(32);l[0]=xe.centerX,l[1]=xe.centerY,l[2]=xe.halfY*V/Math.max(ve,1),l[3]=xe.halfY,l[4]=+!!Oe,l[5]=+!!Ae,l[6]=q?0:Pe,l[7]=Ie,l[8]=Z.xMin,l[9]=Z.xMax,l[10]=Z.yMin,l[11]=Z.yMax,l[12]=Be.xMin,l[13]=Be.xMax,l[14]=Be.yMin,l[15]=Be.yMax,l[16]=q?+!!J:Re,l[17]=q?0:G,l[18]=+!!K,l[19]=ue,l[20]=K?.apexX??0,l[21]=K?.apexY??0,l[22]=K?.directionX??0,l[23]=K?.directionY??0,l[24]=K?.range??0,l[25]=.04,l[26]=U,l[27]=be,l[28]=q&&J?1:0,l[29]=s.zCamera,l[30]=s.sliceHalf,l[31]=s.zoom,r.queue.writeBuffer(y,0,l);let u=r.createCommandEncoder({label:`orbit-draw`});if(P>0&&!oe&&(!q||!J)){let e=u.beginComputePass();e.setPipeline(D),e.setBindGroup(0,M),e.dispatchWorkgroups(Math.ceil(P/64)),e.end()}let b=L[1-he],x=ce[1-_e],S=R[1-_e];if(X===`pond`){let e=u.beginRenderPass({colorAttachments:[{view:b.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(A),e.setBindGroup(0,fe[he]),e.draw(3),e.end()}else{let e=u.beginRenderPass({colorAttachments:[{view:x.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});e.setPipeline(A),e.setBindGroup(0,pe[_e]),e.draw(3),e.end();let t=u.beginRenderPass({colorAttachments:[{view:S.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]});t.setPipeline(j),t.setBindGroup(0,B[_e]),t.draw(3),t.end()}if(u.beginRenderPass({colorAttachments:[{view:z.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),u.beginRenderPass({colorAttachments:[{view:le.createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:0}}]}).end(),P>0&&!oe&&(!q||!J)){let e=X===`pond`?b:x,t=u.beginRenderPass({colorAttachments:[{view:e.createView(),loadOp:`load`,storeOp:`store`}]});if(t.setPipeline(O),t.setBindGroup(0,N),t.setVertexBuffer(0,c),t.drawIndirect(d,0),t.end(),q&&!J){let e=u.beginRenderPass({colorAttachments:[{view:de.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(O),e.setBindGroup(0,N),e.setVertexBuffer(0,c),e.drawIndirect(d,0),e.end()}let n=u.beginRenderPass({colorAttachments:[{view:z.createView(),loadOp:`load`,storeOp:`store`}]});n.setPipeline(O),n.setBindGroup(0,ne),n.setVertexBuffer(0,c),n.drawIndirect(d,0),n.end();let r=u.beginRenderPass({colorAttachments:[{view:le.createView(),loadOp:`load`,storeOp:`store`}]});if(r.setPipeline(k),r.setBindGroup(0,re),r.drawIndirect(f,0),r.end(),X===`throw`&&Ae){let e=u.beginRenderPass({colorAttachments:[{view:S.createView(),loadOp:`load`,storeOp:`store`}]});e.setPipeline(k),e.setBindGroup(0,ie),e.drawIndirect(f,0),e.end()}}X===`pond`?he=1-he:_e=1-_e;let C=u.beginRenderPass({colorAttachments:[{view:i.getCurrentTexture().createView(),loadOp:`clear`,storeOp:`store`,clearValue:{r:0,g:0,b:0,a:1}}]});C.setPipeline(te),C.setBindGroup(0,me[he*2+_e]),C.draw(3),C.end(),r.queue.submit([u.finish()]),q&&!J&&P>0&&e-Y>=1800&&(J=!0,ze=e),Je()}return Je(),{spawn(e,t,n=Qe){oe=!1;let i=new Float32Array(e.length*12),a=new Uint32Array(i.buffer);e.forEach((e,n)=>{let r=n*12;i[r+2]=e.x,i[r+3]=e.y,i[r+4]=t,a[r+7]=1});let o=w(ae,P,e.length,n);r.queue.writeBuffer(u,o.start*48,i.buffer,i.byteOffset,i.byteLength),ae=o.nextSource,P=o.sourceCount},spawnAppend(e,t,n=Qe){oe=!1;let i=T(P,e.length,n);if(i.added<=0)return this.spawn(e,t,n),e.length;let a=e.slice(0,i.added),o=new Float32Array(a.length*12),s=new Uint32Array(o.buffer);return a.forEach((e,n)=>{let r=n*12;o[r+2]=e.x,o[r+3]=e.y,o[r+4]=t,s[r+7]=1}),r.queue.writeBuffer(u,i.start*48,o.buffer,o.byteOffset,o.byteLength),ae=i.nextSource,P=i.sourceCount,i.added},setView(e){xe={...e}},setTuning(e){Se=e.maxDepth,Ee=e.acceleration,De=e.linePersist,W=e.skipColors===!0,Oe=e.rotateRight===!0;let t=e.doublePixels===!0;t!==ke&&(ke=t,Ke())},setAtmosphere(e){Ae=e.drawLines,je=e.grayscale,Me=e.energy,Ne=e.hiddenSteps,Pe=e.liveGain,Ie=e.contrast},setLayer(e){X=e},setDisplay(e){Re=e.pondGain,G=e.throwGain,K=e.cone,U=e.cssWidth,be=e.cssHeight;let t=e.mri===!0;if(t&&!q){if(J=!1,Y=performance.now(),ze=0,de){let e=r.createCommandEncoder({label:`mri-capture-reset`});He(e,[de]),r.queue.submit([e.finish()])}}else t||(J=!1,Y=0,ze=0);q=t},beginThrow(e,t,n,r){xe={...e},Be=Fe(e,t,n,r),X=`throw`,this.clear()},clearPond(){if(!L.length)return;let e=r.createCommandEncoder({label:`orbit-clear-pond`});He(e,L),r.queue.submit([e.finish()])},clear(){if(oe=!1,P=0,ae=0,r.queue.writeBuffer(u,0,new Uint8Array(Qe*48)),!ce.length)return;let e=r.createCommandEncoder({label:`orbit-clear-throw`});He(e,ce),He(e,R),He(e,[z,le].filter(Boolean)),r.queue.submit([e.finish()])},freeze(){oe=!0},isMriReady(){return q&&J},setSuspended(e){se=e,e||Je()},destroy(){I=!0,cancelAnimationFrame(F),qe.disconnect(),L.forEach(e=>e.destroy()),ce.forEach(e=>e.destroy()),R.forEach(e=>e.destroy()),z?.destroy(),le?.destroy(),de?.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),m.destroy(),h.destroy(),g.destroy(),_.destroy(),v.destroy(),y.destroy()}}}function $t(){let e=(0,r.useRef)(null),t=(0,r.useRef)(null),n=(0,r.useRef)(null),a=(0,r.useRef)(null),s=(0,r.useRef)({centerX:Et.x,centerY:Et.y,halfY:Dt}),c=(0,r.useRef)(()=>{}),l=(0,r.useRef)(()=>{}),u=(0,r.useRef)(`YOU`),d=(0,r.useRef)({...ot}),f=(0,r.useRef)(()=>{}),p=(0,r.useRef)(()=>{}),m=(0,r.useRef)(!1),h=(0,r.useRef)(0),g=(0,r.useRef)(!1),_=(0,r.useRef)(()=>{}),v=(0,r.useRef)(null),x=(0,r.useRef)(void 0),C=(0,r.useRef)(null),w=(0,r.useRef)(!1),T=(0,r.useRef)(null),E=(0,r.useRef)(()=>{}),[D,O]=(0,r.useState)(null),[k,A]=(0,r.useState)(!1),[j,te]=(0,r.useState)(!1),[M,ne]=(0,r.useState)(!1),[N,re]=(0,r.useState)(!1),[ie,P]=(0,r.useState)(!1),[F,I]=(0,r.useState)(`YOU`),[se,R]=(0,r.useState)(``),[z,me]=(0,r.useState)(null),[V,ve]=(0,r.useState)({phase:`ready`,score:0,skips:0,deepest:0,progress:0,coverage:0,spread:0}),[H,xe]=(0,r.useState)([]),[we,Te]=(0,r.useState)(`YOU`),[Ee,De]=(0,r.useState)(null),[W,Oe]=(0,r.useState)({...ot});(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>xe(Xt()));return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let e=requestAnimationFrame(()=>{let e=Wt();d.current=e,Oe(e),n.current?.setTuning(e)});return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{let t=e.current;if(!t)return;let r=!1,o=i(me);return a.current=o,o.then(async e=>{if(!e)return;if(r){e.destroy();return}let i=await Qt(t,e,m.current);if(r){i?.destroy();return}n.current=i,i?.setView(s.current),m.current?(i?.setTuning({...d.current,maxDepth:de,doublePixels:!0}),i?.setAtmosphere(_e),i?.setLayer(`pond`),i?.setDisplay({...ye(`intro`),cone:null,cssWidth:1,cssHeight:1}),i?.setSuspended(!0)):(i?.setTuning(d.current),i?.setAtmosphere(ge),i?.setLayer(`throw`),i?.setDisplay({...ye(`play`),cone:null,cssWidth:1,cssHeight:1}))}).catch(()=>me(`Orbit renderer could not start. Throwing remains playable.`)),()=>{r=!0,n.current?.destroy(),n.current=null,a.current=null,o.then(e=>e?.destroy()).catch(()=>{})}},[]),(0,r.useEffect)(()=>{let e=Ke(window.location),t=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;te(!0),!(e||t)&&(m.current=!0,w.current=!0,h.current=0,g.current=!1,O({progress:0}))},[]);let Ie=(0,r.useCallback)(()=>{g.current||(g.current=!0,A(!0),window.setTimeout(()=>{m.current=!1,w.current=!1,h.current=0,g.current=!1,n.current?.setSuspended(!1),n.current?.setAtmosphere(ge),n.current?.setLayer(`throw`),n.current?.setDisplay({...ye(`play`),cone:null,cssWidth:1,cssHeight:1}),n.current?.setTuning(d.current),l.current({centerX:wt.x,centerY:wt.y,halfY:Tt}),c.current(),O(null),A(!1)},600))},[]);_.current=Ie;let Le=(0,r.useCallback)(()=>{m.current||(m.current=!0,w.current=!0,h.current=0,g.current=!1,n.current?.clearPond(),n.current?.clear(),n.current?.setLayer(`pond`),n.current?.setTuning({...d.current,maxDepth:de,doublePixels:!0}),n.current?.setAtmosphere(_e),n.current?.setDisplay({...ye(`intro`),cone:null,cssWidth:1,cssHeight:1}),n.current?.setSuspended(!0),l.current({centerX:Et.x,centerY:Et.y,halfY:Dt}),c.current(),A(!1),O({progress:0}))},[]);(0,r.useEffect)(()=>{if(!j||D)return;x.current===void 0&&(x.current=Ke(window.location));let e=x.current;if(!e)return;let t=0,n=()=>{if(x.current===e){if(!C.current){t=window.setTimeout(n,50);return}x.current=null,C.current(e,!0)}};return t=window.setTimeout(n,400),()=>window.clearTimeout(t)},[j,D]);let Re=(0,r.useCallback)(e=>{let t=e.toUpperCase().replace(/[^A-Z0-9 _-]/g,``).slice(0,12);u.current=t,Te(t),v.current&&={...v.current,name:t||`YOU`},I(t||`YOU`);let n=Ee;n&&xe(e=>{let r=e.map(e=>e.id===n?{...e,name:t||`YOU`}:e);return Zt(r),r})},[Ee]),G=(0,r.useCallback)(e=>{let t=Ut({...d.current,...e});d.current=t,Oe(t),Gt(t),n.current?.setTuning(t),p.current(),f.current()},[]);(0,r.useEffect)(()=>{let e=t.current;if(!e)return;let r=e.getContext(`2d`);if(!r)return;let i=1,o=1,_=1,y=0,b=performance.now(),x=0,D=`ready`,k=-1,A=`none`,j={x:0,y:0},te={...s.current},M={x:0,y:0},N=0,ie=0,F=0,se=0,R={x:0,y:0,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},z=2,me=[],V=[],H=[],U=null,be=null,we=0,Te=0,Ee=0,W=0,Ie=0,Le=new Map,Re=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,G=document.createElement(`canvas`),K=G.getContext(`2d`),q=!0,J=document.createElement(`canvas`),Y=J.getContext(`2d`),ze=document.createElement(`canvas`),X=ze.getContext(`2d`),Z=!0,Be=null,Q=[],Ve=[],He=0,Ue=0,We=0,Ge=!1,Ke=0,Qe=``;f.current=()=>{Z=!0},p.current=()=>{q=!0};let et=!1;(async()=>{try{let e=oe(window),t=le(indexedDB),n=await L(e,t);if(n){if(et)return;Be=await createImageBitmap(n),Z=!0;return}let r=await a.current;if(!r||et)return;let i=ae(r,{size:e});if(await new Promise(e=>{let t=()=>{if(et){i.destroy(),e();return}if(i.step(1/60),i.isComplete()){e();return}requestAnimationFrame(t)};requestAnimationFrame(t)}),et){i.destroy();return}let{bitmap:o,blobPromise:s}=await i.toBitmapAndBlob();if(i.destroy(),et){o.close();return}Be=o,Z=!0;let c=await s;c&&!et&&await ce(e,c,t)}catch{}})();function tt(){return{x:i*.5,y:o*.82}}function nt(){return Math.min(i,o)}function $(){return Me(nt(),s.current.halfY)}function rt(){let t=e.getBoundingClientRect();if(i=Math.max(1,t.width),o=Math.max(1,t.height),_=Math.min(window.devicePixelRatio||1,2),e.width=Math.round(i*_),e.height=Math.round(o*_),r.setTransform(_,0,0,_,0,0),G.width=Math.round(i*_),G.height=Math.round(o*_),K?.setTransform(_,0,0,_,0,0),q=!0,J.width=Math.round(i*_),J.height=Math.round(o*_),Y?.setTransform(_,0,0,_,0,0),Z=!0,ze.width=Math.round(i*_),ze.height=Math.round(o*_),X?.setTransform(_,0,0,_,0,0),Qe=``,D===`ready`||D===`aiming`||D===`result`){let e=tt();R.x=e.x,R.y=e.y,D!==`aiming`&&(M={...e})}}function it(){return U||=new AudioContext,U.state===`suspended`&&U.resume(),U}function at(e,t=.08,n=.05){try{let r=it(),i=r.createOscillator(),a=r.createGain();i.type=`triangle`,i.frequency.value=e,a.gain.setValueAtTime(n,r.currentTime),a.gain.exponentialRampToValueAtTime(1e-4,r.currentTime+t),i.connect(a).connect(r.destination),i.start(),i.stop(r.currentTime+t)}catch{}}function ot(){if(be)return be;let e=it(),t=e.createOscillator(),n=e.createOscillator(),r=e.createOscillator(),i=e.createOscillator(),a=e.createOscillator(),o=e.createOscillator(),s=e.createGain(),c=e.createGain(),l=e.createGain(),u=e.createGain(),d=e.createGain(),f=e.createGain(),p=e.createBiquadFilter(),m=e.createGain(),h=e.createWaveShaper(),g=e.createDelay(.4),_=e.createGain(),v=e.createGain(),y=e.createGain(),b=e.createStereoPanner(),x=e.createGain(),S=e.createDynamicsCompressor(),C=e.createGain(),ee=e.createGain(),w=e.createBiquadFilter(),T=e.createGain(),E=e.createBufferSource(),D=Array.from({length:15},(t,n)=>{let r=e.createOscillator(),i=e.createGain(),a=e.createStereoPanner();return r.type=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`][n%Je],r.frequency.value=110,i.gain.value=1e-4,r.connect(i).connect(a).connect(p),{oscillator:r,gain:i,pan:a}}),O=e.createBuffer(1,Math.round(e.sampleRate*.75),e.sampleRate),k=O.getChannelData(0),A=5370206;for(let e=0;e<k.length;e++)A^=A<<13,A^=A>>>17,A^=A<<5,k[e]=((A>>>0)/2147483648-1)*.55;E.buffer=O,E.loop=!0,t.type=`sine`,n.type=`triangle`,r.type=`sawtooth`,i.type=`sine`,a.type=`sine`,o.type=`sine`,s.gain.value=.42,c.gain.value=.16,l.gain.value=.02,u.gain.value=.08,a.frequency.value=1.5,d.gain.value=12,f.gain.value=1e-4,C.gain.value=1e-4,ee.gain.value=1e-4,w.type=`bandpass`,w.frequency.value=900,w.Q.value=5,T.gain.value=.2,p.type=`lowpass`,p.frequency.value=420,p.Q.value=2.2,m.gain.value=1;let j=new Float32Array(1024);for(let e=0;e<j.length;e++){let t=e/(j.length-1)*2-1;j[e]=Math.tanh(t*2.35)/Math.tanh(2.35)}return h.curve=j,h.oversample=`2x`,x.gain.value=1e-4,S.threshold.value=-27,S.knee.value=18,S.ratio.value=5,g.delayTime.value=.08,_.gain.value=.1,v.gain.value=.08,y.gain.value=.9,a.connect(d),d.connect(t.detune),d.connect(n.detune),d.connect(r.detune),t.connect(s).connect(p),n.connect(c).connect(p),r.connect(l).connect(p),i.connect(u).connect(p),o.connect(f).connect(p),E.connect(C).connect(w),E.connect(ee).connect(w),w.connect(T).connect(b),T.connect(g),p.connect(m).connect(h),h.connect(y).connect(b),h.connect(g),g.connect(_).connect(g),g.connect(v).connect(b),b.connect(x).connect(S).connect(e.destination),t.start(),n.start(),r.start(),i.start(),a.start(),o.start(),E.start(),D.forEach(e=>e.oscillator.start()),be={carrier:t,overtone:n,sideband:r,sub:i,modulator:a,pulse:o,carrierGain:s,overtoneGain:c,sidebandGain:l,subGain:u,modGain:d,pulseGain:f,noise:E,noiseGain:C,noiseBurstGain:ee,noiseFilter:w,resonatorGain:T,filter:p,drive:m,delay:g,feedback:_,wet:v,dry:y,gain:x,pan:b,shapeVoices:D},be}function st(e){if(!U)return;if(!((D===`flying`||D===`resolving`)&&H.length>0)){be&&be.gain.gain.setTargetAtTime(1e-4,U.currentTime,.08);return}if(e-we<42)return;we=e;let t=ot(),n=U,r=H.reduce((e,t)=>e+ +!t.resolved,0)/H.length,i=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),a=Math.log2(i+1),o=H.map(Rt),s=Array.from(new Set(H.map(e=>e.skip))).sort((e,t)=>e-t).map(e=>{let t=H.flatMap((t,n)=>t.skip===e?[n]:[]),n=t.map(e=>o[e]),r=e=>n.reduce((t,n)=>t+n[e],0)/Math.max(1,n.length),i=n.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/Math.max(1,n.length),a=n.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/Math.max(1,n.length),s=t.reduce((e,t)=>e+H[t].distinct,0),c=Le.get(e)||0,l=Math.max(0,s-c);return Le.set(e,s),{skip:e,glyph:H[t[0]].glyph,area:r(`area`),spread:r(`spread`),elongation:r(`elongation`),density:r(`density`),centroidX:r(`centroidX`),centroidY:r(`centroidY`),orientation:.5*Math.atan2(i,a),coverage:s,presence:Math.min(1,Math.log2(s+1)/10),activity:Math.min(1,Math.log2(l+1)/5),deepest:t.reduce((e,t)=>Math.max(e,H[t].shownDepth),0)}}),c=s.filter(e=>e.coverage>0).length/15,l=s.reduce((e,t)=>t.activity>e.activity?t:e,s[0]),u=l?.activity||0,d=e=>o.reduce((t,n)=>t+n[e],0)/o.length,f=(e,t)=>o.reduce((n,r)=>n+(r[e]-t)**2,0)/o.length,p=d(`area`),m=d(`spread`),h=d(`elongation`),g=d(`density`),_=d(`centroidX`),v=d(`centroidY`),y=Math.min(1,Math.sqrt(o.reduce((e,t)=>e+(t.centroidX-_)**2+(t.centroidY-v)**2,0)/o.length*.5)),b=Math.min(1,Math.sqrt(f(`spread`,m)+f(`elongation`,h)+f(`density`,g))),x=o.reduce((e,t)=>e+Math.sin(t.orientation*2),0)/o.length,S=o.reduce((e,t)=>e+Math.cos(t.orientation*2),0)/o.length,C=.5*Math.atan2(x,S),ee=Math.min(1,Math.hypot(x,S)),w=H.reduce((e,t)=>e+t.distinct,0),T=Math.min(1,w/Math.max(1,H.length*96)),E=H.reduce((e,t)=>e+Math.min(1,Math.hypot(t.zr,t.zi)/2),0)/H.length,O=Math.min(1,H.length/Math.max(1,R.skips*Ze)),k=o[H.reduce((e,t,n)=>t.distinct*(.35+o[n].spread)*(.6+o[n].density)>H[e].distinct*(.35+o[e].spread)*(.6+o[e].density)?n:e,0)],A=Math.min(1,(1-k.elongation)*.58+ee*.42),j=Math.min(1,b*1.7+(1-g)*.24+E*.28),te=Math.max(0,w-W),M=Math.min(1,Math.log2(te+1)/4.5);W=w;let ne=H.filter(e=>Number.isFinite(e.stepDistance)&&e.stepDistance>0).map(e=>({proximity:Math.max(0,Math.min(1,(-Math.log2(Math.max(e.stepDistance,1e-12))-.25)/15)),contraction:Math.max(0,Math.min(1,e.distanceContraction/1.5))})),N=e=>e.length?(e.sort((e,t)=>e-t),e[Math.min(e.length-1,Math.floor(e.length*.8))]):0,re=N(ne.map(e=>e.proximity)),ie=N(ne.map(e=>e.contraction)),P=2**((re*14+ie*3)/12),ae=H[0],F=Math.abs(Math.round((ae.cr+2.2)*137+(ae.ci+1.5)*211)),I=At[F%At.length],oe=34+F*7%12,se=e=>{let t=Math.round(e),n=(t%I.length+I.length)%I.length,r=Math.floor(t/I.length);return 440*2**((oe+I[n]+r*12-69)/12)},L=a*.2+k.spread*3.7+k.elongation*2.8+(k.orientation/Math.PI+.5)*2.4+k.centroidY*1.6,ce=1+Math.round(y*4+b*3+c*2),z=Math.min(900,se(L)*P),le=Math.min(1900,se(L+2+Math.round(A*2))*P),ue=Math.min(2400,se(L+ce+3)*P),de=Math.min(7600,150+p*2700+g*1500+a*48+j*1500+re*1800),fe=Math.min(.045,.007+r*.01+m*.007+T*.006+O*.003+M*.004+c*.006+u*.004),pe=Math.max(-.76,Math.min(.76,_*.52+Math.sin(e*.001*(.22+y*1.7)+C)*y*.34)),B=n.currentTime,me=[0,2,1,3,4,5,6],he=e=>Math.log2(e.deepest+1)*.16+me[e.glyph]+e.spread*3.2+e.elongation*2.4+(e.orientation/Math.PI+.5)*2+e.centroidY*1.4;t.shapeVoices.forEach((e,t)=>{let n=s.find(e=>e.skip===t+1);if(!n||n.coverage===0){e.gain.gain.setTargetAtTime(1e-4,B,.08);return}let r=[`sine`,`triangle`,`sine`,`sawtooth`,`triangle`,`square`,`sine`];e.oscillator.type=r[n.glyph],e.oscillator.frequency.setTargetAtTime(Math.min(1800,se(he(n))*P),B,.065),e.gain.gain.setTargetAtTime(.002+n.presence*.028+n.activity*.07+c*.004,B,.045),e.pan.pan.setTargetAtTime(Math.max(-.88,Math.min(.88,n.centroidX*.72+Math.sin(n.orientation)*.15)),B,.07)}),t.carrier.frequency.setTargetAtTime(z,B,.055),t.overtone.frequency.setTargetAtTime(le,B,.075),t.sideband.frequency.setTargetAtTime(ue,B,.085),t.sub.frequency.setTargetAtTime(Math.max(28,z*.5),B,.1),t.carrierGain.gain.setTargetAtTime(.16+A*.36,B,.1),t.overtoneGain.gain.setTargetAtTime(.035+g*.25+ee*.08,B,.1),t.sidebandGain.gain.setTargetAtTime(.008+k.elongation*.13+j*.075,B,.1),t.subGain.gain.setTargetAtTime(.025+p*.16+A*.035,B,.12),t.modulator.frequency.setTargetAtTime(.18+g*3.6+y*4.2+r+ie*2.4,B,.12),t.modGain.gain.setTargetAtTime(2+j*74+b*46+ie*18,B,.11),t.filter.frequency.setTargetAtTime(de,B,.08),t.filter.Q.setTargetAtTime(.8+k.elongation*7.2+A*2.6,B,.09),t.drive.gain.setTargetAtTime(.62+j*1.25+g*.42,B,.1),t.noiseGain.gain.setTargetAtTime(15e-5+j*.01+M*.004,B,.07),t.noiseFilter.frequency.setTargetAtTime(Math.min(7200,z*(2.2+g*5.4+y*2.5)),B,.08),t.noiseFilter.Q.setTargetAtTime(1.5+g*10+ee*5,B,.09),t.resonatorGain.gain.setTargetAtTime(.1+j*.28+M*.24,B,.09),t.delay.delayTime.setTargetAtTime(.024+p*.12+y*.12,B,.12),t.feedback.gain.setTargetAtTime(.04+k.elongation*.18+y*.18,B,.14),t.wet.gain.setTargetAtTime(.025+m*.1+y*.13+c*.045,B,.14),t.dry.gain.setTargetAtTime(.9-j*.14,B,.14),t.pan.pan.setTargetAtTime(pe,B,.08),t.gain.gain.setTargetAtTime(fe*(D===`resolving`?.76:1),B,.09);let ge=i-Ee,_e=Math.max(42,310-Math.min(155,a*11)-M*88-j*42-re*72-u*92);if((ge>0||u>.08)&&e-Te>=_e){let n=1+(F+Math.round(k.elongation*5))%Math.max(2,I.length-1),r=(u>.08?he(l):L)+Ie*n%I.length+(Ie%4==3?ce:0),a=3+F%5,o=Ie%a===0?1:.54+A*.22,s=Math.min(.88,(.18+p*.18+g*.18+M*.18+j*.1+u*.28)*o),c=.028+p*.065+A*.04+y*.03+(l?.spread||0)*.035;t.pulse.frequency.setValueAtTime(Math.min(2600,se(r+I.length)*P),B),t.pulseGain.gain.cancelScheduledValues(B),t.pulseGain.gain.setValueAtTime(1e-4,B),t.pulseGain.gain.exponentialRampToValueAtTime(s,B+.008),t.pulseGain.gain.exponentialRampToValueAtTime(1e-4,B+c);let d=Math.min(.48,(.035+j*.24+M*.18)*o);t.noiseBurstGain.gain.cancelScheduledValues(B),t.noiseBurstGain.gain.setValueAtTime(1e-4,B),t.noiseBurstGain.gain.exponentialRampToValueAtTime(Math.max(2e-4,d),B+.004),t.noiseBurstGain.gain.exponentialRampToValueAtTime(1e-4,B+.025+y*.06),Te=e,Ee=i,Ie+=1}}function ct(e=!1){let t=performance.now();if(!e&&t-se<33)return;let n=H.reduce((e,t)=>Math.max(e,t.shownDepth),0),r=H.reduce((e,t)=>e+zt(t,t.shownDepth),0),i=H.reduce((e,t)=>e+t.distinct,0),a=H.length?H.reduce((e,t)=>e+Rt(t).spread,0)/H.length:0,o=H.length?H.filter(e=>e.resolved).length/H.length:0,s=H.length?H.reduce((e,t)=>e+Math.min(1,t.shownDepth/d.current.maxDepth),0)/H.length:0,c=o*.8+s*.2;ve({phase:D,score:r,skips:R.skips,deepest:n,progress:c,coverage:i,spread:a}),se=t}function pt(e){if(e.depth<=ft||e.depth%yt!==0)return;let t=(e.zr-wt.x)/Ot*.5+.5,n=(e.zi-wt.y)/kt*.5+.5;if(t<0||t>=1||n<0||n>=1)return;let r=Math.min(gt-1,Math.floor(t*gt)),i=Math.min(gt-1,Math.floor(n*gt)),a=i*gt+r,o=a>>>5,s=1<<(a&31);(e.cells[o]&s)===0&&(e.cells[o]|=s,e.distinct+=1,e.sumX+=r,e.sumY+=i,e.sumXX+=r*r,e.sumYY+=i*i,e.sumXY+=r*i)}function mt(){N+=1,D=`ready`,k=-1,A=`none`,me=[],V=[],H=[],Q=[],Ve=[],He=0,Ue=0,We=0,Ge=!1,Ke=0,ie=Math.floor(Math.random()*Je),Le.clear(),Ee=0,W=0,Te=0,Ie=0;let e=tt();M={...e},R={x:e.x,y:e.y,vx:0,vy:0,z:0,vz:0,spin:0,skips:0,bounceAge:10},De(null),n.current?.clear(),Z=!0,ct(!0)}c.current=mt;function ht(e,t){m.current||(n.current?.beginThrow(s.current,i,o,d.current.rotateRight),n.current?.setTuning(d.current),n.current?.setAtmosphere(ge),n.current?.setLayer(`throw`));let r=tt(),a=Math.cos(e),c=Math.sin(e),l=t*t*(3-2*t),u=$()*(.32+.56*l),f=$()*ut*t,p=nt()*lt;M={x:r.x-a*p*t,y:r.y-c*p*t},R.x=r.x-a*f,R.y=r.y-c*f,R.vx=a*u,R.vy=c*u,R.vz=$()*(.38+.2*l),R.z=1,R.spin=0,R.skips=0,R.bounceAge=10,D=`flying`,at(170,.12,.07),Z=!0,ct(!0)}function vt(e,t=!1){w.current=!0,t&&re(!0),P(!0),I(e.name||`YOU`),v.current=e,ne(!0),T.current||=Wt();let r=Ut({...d.current,rotateRight:e.rotateRight,sourceDots:e.sourceDots});d.current=r,Oe(r),n.current?.setTuning(r),p.current(),f.current(),un(e.view),mt(),ie=e.glyph,N=e.seed,z=e.skips,ht(e.angle,e.power)}C.current=vt,l.current=un;function xt(e,t,r,a,c,l){let u=ke(e,t,i,o,s.current,d.current.rotateRight),f={x:Math.fround(u.x),y:Math.fround(u.y)},p=(a+r-1)%Je,h=m.current?6:d.current.sourceDots,g=Yt(e,t,i,o,s.current,h,p,d.current.rotateRight),_=l?.gpu??!m.current;if((l?.ripple??!m.current)&&V.push({cr:f.x,ci:f.y,born:c,index:r}),!m.current){me.push({cr:f.x,ci:f.y,born:c,index:r});for(let e of g)H.push({zr:0,zi:0,cr:e.x,ci:e.y,depth:0,shownDepth:0,skip:r,glyph:p,stepDistance:0,distanceContraction:0,resolved:!1,score:0,offscreenStreak:0,tinyHopStreak:0,cells:new Uint32Array(_t),distinct:0,sumX:0,sumY:0,sumXX:0,sumYY:0,sumXY:0})}_&&n.current?.spawn(g,r),m.current||(at(320+r*62,.1,.06),`vibrate`in navigator&&navigator.vibrate?.(12)),ct(!0)}function St(e){D===`resolving`||D===`result`||(D=`resolving`,F=e,ct(!0))}function Tt(){if(D===`result`)return;D=`result`,m.current||n.current?.freeze(),H.forEach(e=>{e.resolved||(e.resolved=!0,e.score=zt(e,e.depth)),e.shownDepth=e.depth});let e=H.reduce((e,t)=>e+t.score,0),t=H.reduce((e,t)=>Math.max(e,t.depth),0),r=H.reduce((e,t)=>e+t.distinct,0),i=H.length?H.reduce((e,t)=>e+Rt(t).spread,0)/H.length:0,a=`${Date.now()}-${N}`;if(w.current)De(null);else{De(a);let n={id:a,name:u.current||`YOU`,score:e,deepest:t,skips:R.skips,coverage:r,spread:i,createdAt:new Date().toISOString()};xe(e=>{let t=[...e,n].sort((e,t)=>t.score-e.score||t.deepest-e.deepest||e.createdAt.localeCompare(t.createdAt)).slice(0,10);return Zt(t),t})}v.current&&history.replaceState(null,``,qe(window.location.href,v.current)),ve({phase:D,score:e,skips:R.skips,deepest:t,progress:1,coverage:r,spread:i}),at(720,.18,.07)}function Et(e,t){let n=1-Math.exp(-t/.055),r=()=>{for(let e of H){let t=e.depth-e.shownDepth;e.shownDepth=t<16?e.depth:Math.min(e.depth,e.shownDepth+Math.max(1,t*n))}};if(!H.filter(e=>!e.resolved).length){r();let t=H.every(e=>e.depth-e.shownDepth<16);D===`resolving`&&e-F>250&&t?Tt():ct();return}let a=Math.max(1,Math.floor(dt/Math.max(H.length,1))),c=s.current,l=d.current.rotateRight,u=Math.hypot(i,o)*bt;for(let e of H){if(e.resolved)continue;let t=Se(e.depth,d.current.maxDepth,a,d.current.acceleration);for(let n=0;n<t&&e.depth<d.current.maxDepth;n++){let t=e.zr,n=e.zi,r=Math.fround(Math.fround(t*t-n*n)+e.cr),a=Math.fround(Math.fround(2*t*n)+e.ci),s=Math.hypot(r-t,a-n);if(Number.isFinite(s)){let t=e.stepDistance||s,n=Math.max(-4,Math.min(4,Math.log2(Math.max(t,1e-12)/Math.max(s,1e-12))));e.distanceContraction=e.distanceContraction*.82+n*.18,e.stepDistance=t*.82+s*.18}e.zi=a,e.zr=r,e.depth+=1,pt(e);let d=je(t,n,c,i,o,l),f=je(r,a,c,i,o,l),p=Math.hypot((f.x-d.x)*i*.5,(f.y-d.y)*o*.5),m=Math.abs(f.x)<=1.02&&Math.abs(f.y)<=1.02,h=r>=Ce.xMin&&r<=Ce.xMax&&a>=Ce.yMin&&a<=Ce.yMax,g=S({magSq:r*r+a*a,hopPx:p,onScreen:m||h,offscreenStreak:e.offscreenStreak,tinyHopStreak:e.tinyHopStreak,maxHopPx:u});if(e.offscreenStreak=g.offscreenStreak,e.tinyHopStreak=g.tinyHopStreak,g.resolved){e.resolved=!0;break}}e.depth>=d.current.maxDepth&&(e.resolved=!0),e.resolved&&(e.shownDepth=e.depth,e.score=zt(e,e.depth))}r();let f=H.every(e=>e.resolved),p=H.every(e=>e.depth-e.shownDepth<16);D===`resolving`&&(f&&p&&e-F>250||e-F>9e3)?Tt():ct()}function Dt(e,t){if(D!==`flying`)return;let n=$()*1.65;R.x+=R.vx*e,R.y+=R.vy*e,R.z+=R.vz*e,R.vz-=n*e;let r=Math.exp(-.06*e);if(R.vx*=r,R.vy*=r,R.spin+=Math.hypot(R.vx,R.vy)*e*.016,R.bounceAge+=e,R.z<=0&&R.vz<0){if(R.z=0,R.x<24||R.x>i-24||R.y<24||R.y>o-24){St(t);return}R.skips+=1,R.bounceAge=0,xt(R.x,R.y,R.skips,ie,t);let e=z-R.skips;R.vz=Math.max(Math.abs(R.vz)*.56,$()*(.05+e*.008)),R.vx*=.79,R.vy*=.79;let n=(Bt(N<<8^R.skips)()-.5)*Math.PI/60,r=Math.cos(n),a=Math.sin(n),s=R.vx*r-R.vy*a;if(R.vy=R.vx*a+R.vy*r,R.vx=s,e>0){let e=Math.hypot(R.vx,R.vy),t=$()*.09;e>0&&e<t&&(R.vx*=t/e,R.vy*=t/e)}(R.skips>=z||R.x<-50||R.x>i+50||R.y<-50||R.y>o+50)&&St(t)}}function jt(){let e=B(i,o),t=Math.atan2(o*.5-e.y,i*.5-e.x)+(Math.random()-.5)*1.55,n=.48+Math.random()*.42,r=n*n*(3-2*n),a=$()*(.32+.56*r),s=$()*ut*n,c=Math.cos(t),l=Math.sin(t),u=h.current;h.current+=1,N=N+17|0,Q.push({x:e.x-c*s,y:e.y-l*s,vx:c*a,vy:l*a,vz:$()*(.38+.2*r),z:1,spin:0,skips:0,bounceAge:10,plannedSkips:3,shotId:N,shapeOffset:u%Je,path:[{x:e.x-c*s,y:e.y-l*s}],draw:u%50==0})}function Mt(e,t){if(!m.current||!Q.length)return;let n=$()*1.65,r=[];for(let a of Q){a.x+=a.vx*e,a.y+=a.vy*e,a.z+=a.vz*e,a.vz-=n*e;let s=Math.exp(-.06*e);a.vx*=s,a.vy*=s,a.spin+=Math.hypot(a.vx,a.vy)*e*.016,a.bounceAge+=e;let c=a.path[a.path.length-1];a.draw&&(!c||Math.hypot(a.x-c.x,a.y-c.y)>=3)&&a.path.push({x:a.x,y:a.y});let l=!0;if(a.z<=0&&a.vz<0)if(a.z=0,a.x<24||a.x>i-24||a.y<24||a.y>o-24)l=!1;else{a.skips+=1,a.bounceAge=0,xt(a.x,a.y,a.skips,a.shapeOffset,t,{gpu:!1,ripple:a.draw});let e=a.plannedSkips-a.skips;a.vz=Math.max(Math.abs(a.vz)*.56,$()*(.05+e*.008)),a.vx*=.79,a.vy*=.79;let n=(Bt(a.shotId<<8^a.skips)()-.5)*Math.PI/60,r=Math.cos(n),s=Math.sin(n),c=a.vx*r-a.vy*s;if(a.vy=a.vx*s+a.vy*r,a.vx=c,e>0){let e=Math.hypot(a.vx,a.vy),t=$()*.09;e>0&&e<t&&(a.vx*=t/e,a.vy*=t/e)}(a.skips>=a.plannedSkips||a.x<-50||a.x>i+50||a.y<-50||a.y>o+50)&&(l=!1)}l?r.push(a):a.draw&&Ve.length<3&&Ve.push({path:a.path,born:t})}Q=r}function Nt(e){let t=e.x-M.x,n=e.y-M.y,r=Math.hypot(t,n);if(r<12)return[];let a=nt()*lt,s=Math.min(1,r/a),c=s*s*(3-2*s),l=$()*(.32+.56*c),u=$()*ut*s,d=e.x-t/r*u,f=e.y-n/r*u,p=t/r*l,m=n/r*l,h=$()*(.38+.2*c),g=1,_=0,v=$()*1.65,y=1/120,b=[];for(let e=0;e<2400&&_<3;e++){d+=p*y,f+=m*y,g+=h*y,h-=v*y;let e=Math.exp(-.06*y);if(p*=e,m*=e,g>0||h>=0)continue;if(g=0,d<24||d>i-24||f<24||f>o-24)break;_+=1,b.push({x:d,y:f,index:_,glyph:(ie+_-1)%Je});let t=3-_;if(h=Math.max(Math.abs(h)*.56,$()*(.05+t*.008)),p*=.79,m*=.79,t>0){let e=Math.hypot(p,m),t=$()*.09;e>0&&e<t&&(p*=t/e,m*=t/e)}if(_>=3||d<-50||d>i+50||f<-50||f>o+50)break}return b}let Pt=[75,175,235];function Ft(e,t,n,r,a,s){if(!X||r<=0)return;let c=d.current.rotateRight,l=Math.hypot(i,o)*bt,u=0,f=0;X.lineWidth=.65,X.lineJoin=`round`,X.lineCap=`round`;for(let d=0;d<r;d++){let p=u,m=f,h=Math.fround(Math.fround(p*p-m*m)+e.x),g=Math.fround(Math.fround(2*p*m)+e.y),_=je(p,m,n,i,o,c),v=je(h,g,n,i,o,c),y=Math.hypot((v.x-_.x)*i*.5,(v.y-_.y)*o*.5);if(u=h,f=g,y>=l||!Number.isFinite(y))break;let b=s*(1-d/Math.max(1,r))**.42,x=Math.min(.55,b*.85),S=Ae(h,g,i,o,n,c);if(d===0){X.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${x.toFixed(3)})`,X.beginPath(),X.arc(t.x,t.y,.7,0,Ct),X.fill();continue}let C=d===1?t:Ae(p,m,i,o,n,c);X.strokeStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${b.toFixed(3)})`,X.beginPath(),X.moveTo(C.x,C.y),X.lineTo(S.x,S.y),X.stroke(),X.fillStyle=`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${x.toFixed(3)})`,X.beginPath(),X.arc(S.x,S.y,.7,0,Ct),X.fill()}}function It(e){if(!X)return;X.clearRect(0,0,i,o);let t=Nt(e);if(!t.length)return;let n=d.current,r=s.current;X.globalCompositeOperation=`lighter`;for(let e of t){let t=e.index,a=Math.max(1,Math.floor(n.previewIterations/2**(t-1))),s=.32/(1+(t-1)*.25);Ft(ke(e.x,e.y,i,o,r,n.rotateRight),e,r,a,Pt,s)}}function Lt(e){if(D!==`aiming`||!d.current.previewOrbits||!X)return;let t=s.current,n=[Math.round(M.x),Math.round(M.y),t.centerX.toFixed(5),t.centerY.toFixed(5),t.halfY.toFixed(5),d.current.previewIterations,d.current.rotateRight?`1`:`0`,i,o].join(`:`);n!==Qe&&(Qe=n,It(e)),r.drawImage(ze,0,0,i,o)}function Vt(e){let t=10**Math.floor(Math.log10(Math.max(e,2**-52))),n=e/t;return(n<=1?1:n<=2?2:n<=5?5:10)*t}function Ht(e,t){if(Math.abs(e)<t*.001)return`0`;if(Math.abs(e)>=1e4||Math.abs(e)<.001)return e.toExponential(1);let n=Math.max(0,Math.min(6,-Math.floor(Math.log10(t)))),r=e.toFixed(n);return n?r.replace(/\.?0+$/,``):r}function Gt(){if(!K)return;K.clearRect(0,0,i,o);let e=s.current,t=d.current.rotateRight,n=Fe(e,i,o,t),r=Math.max(n.xMax-n.xMin,n.yMax-n.yMin)*.08,a=n.xMin-r,c=n.xMax+r,l=n.yMin-r,u=n.yMax+r,f=Vt(e.halfY*2/Math.max(o/92,1)),p=f/5,m=e=>Math.round(e*_)/_,h=e=>Math.abs(e/f-Math.round(e/f))<1e-6,g=e=>Math.abs(e)<p*1e-4,v=(n,r)=>Ae(n,r,i,o,e,t),y=e=>{K.beginPath();let t=Math.ceil(a/p),n=Math.floor(c/p);for(let r=t;r<=n;r++){let t=r*p;if(g(t)||h(t)!==e)continue;let n=v(t,l),i=v(t,u);K.moveTo(m(n.x),m(n.y)),K.lineTo(m(i.x),m(i.y))}K.stroke()},b=e=>{K.beginPath();let t=Math.ceil(l/p),n=Math.floor(u/p);for(let r=t;r<=n;r++){let t=r*p;if(g(t)||h(t)!==e)continue;let n=v(a,t),i=v(c,t);K.moveTo(m(n.x),m(n.y)),K.lineTo(m(i.x),m(i.y))}K.stroke()};if(K.lineWidth=1/_,K.strokeStyle=`rgba(104, 196, 216, .026)`,y(!1),b(!1),K.strokeStyle=`rgba(119, 211, 228, .065)`,y(!0),b(!0),d.current.coordinateAxes){let e=v(a,0),t=v(c,0),n=v(0,l),r=v(0,u);K.strokeStyle=`rgba(151, 231, 240, .18)`,K.lineWidth=1/_,K.beginPath(),K.moveTo(m(e.x),m(e.y)),K.lineTo(m(t.x),m(t.y)),K.moveTo(m(n.x),m(n.y)),K.lineTo(m(r.x),m(r.y)),K.stroke(),K.fillStyle=`rgba(171, 230, 238, .32)`,K.strokeStyle=`rgba(151, 231, 240, .14)`,K.font=`8px ui-monospace, SFMono-Regular, Menlo, monospace`,K.textBaseline=`top`,K.textAlign=`center`;for(let e=Math.ceil(a/f);e<=Math.floor(c/f);e++){let t=e*f;if(g(t))continue;let n=v(t,0);K.beginPath(),K.arc(m(n.x),m(n.y),2,0,Ct),K.stroke(),n.x>18&&n.x<i-18&&n.y>9&&n.y<o-9&&K.fillText(Ht(t,f),m(n.x),m(n.y)+4)}K.textBaseline=`middle`,K.textAlign=`right`;for(let e=Math.ceil(l/f);e<=Math.floor(u/f);e++){let t=e*f;if(g(t))continue;let n=v(0,t);K.beginPath(),K.arc(m(n.x),m(n.y),2,0,Ct),K.stroke(),n.x>28&&n.x<i-8&&n.y>9&&n.y<o-9&&K.fillText(Ht(t,f),m(n.x)-5,m(n.y))}K.fillStyle=`rgba(180, 239, 245, .42)`,K.font=`italic 9px ui-monospace, SFMono-Regular, Menlo, monospace`;let s=v(c,0);K.textAlign=`right`,K.textBaseline=`bottom`,K.fillText(`Re(c)`,Math.min(i-7,Math.max(40,s.x-6)),Math.min(o-6,Math.max(14,s.y-4)));let d=v(0,u);K.textAlign=`left`,K.textBaseline=`top`,K.fillText(`Im(c)`,Math.min(i-34,Math.max(6,d.x+6)),Math.max(6,d.y+4))}q=!1}function Kt(e,t){let n=e.z*.3,i=(t+e.skips)%Je,a=Ye[i],o=Math.min(1,e.z/Math.max($()*.45,1)),s=Math.round(e.x*_)/_,c=Math.round((e.y-n)*_)/_,l=Re?0:Math.exp(-e.bounceAge*8.5)*Math.cos(e.bounceAge*29),u=1+l*.11,f=1-l*.09;r.save(),r.fillStyle=`rgba(0, 4, 9, ${.3*(1-o*.72)})`,r.beginPath(),r.ellipse(s,e.y,10.5*(1+Math.max(0,l)*.08),3.5,0,0,Ct),r.fill(),r.restore(),r.save(),r.translate(s,c),r.scale(u,f),r.rotate(e.spin*.18),r.strokeStyle=`rgba(255, 255, 255, .34)`,r.lineWidth=1;for(let e=0;e<a;e++){r.beginPath();for(let t=0;t<=32;t++){let n=Jt(i,e,t/32);t===0?r.moveTo(n.x*10,n.y*10):r.lineTo(n.x*10,n.y*10)}r.stroke()}r.fillStyle=`#ffffff`;let p=m.current?6:Math.max(Xe,Math.min(18,d.current.sourceDots));for(let e=0;e<p;e++){let t=e%a,n=Math.floor(e/a),o=Math.ceil((p-t)/a),s=Jt(i,t,n/Math.max(o,1));r.beginPath(),r.arc(s.x*10,s.y*10,1.15,0,Ct),r.fill()}r.restore()}function qt(e,t){if(!(e.length<2||t<=0)){r.save(),r.strokeStyle=`rgba(210, 220, 224, ${t})`,r.lineWidth=1,r.lineJoin=`round`,r.lineCap=`round`,r.beginPath(),r.moveTo(e[0].x,e[0].y);for(let t=1;t<e.length;t++)r.lineTo(e[t].x,e[t].y);r.stroke(),r.restore()}}function Xt(e){if(m.current){let t=0;for(let e of Q)e.draw&&t<2&&(qt(e.path,.09),t+=1);Ve=Ve.filter(t=>e-t.born<pe);for(let t=0;t<Math.min(2,Ve.length);t++){let n=Ve[t],r=Math.min(1,(e-n.born)/pe);qt(n.path,.08*(1-r)*(1-r))}return}D===`resolving`||D===`result`||Kt(R,ie)}function Qt(e){V=V.filter(t=>e-t.born<(t.lifetime??2400));for(let t of V){let n=Ae(t.cr,t.ci,i,o,s.current,d.current.rotateRight),a=t.lifetime??2400,c=(e-t.born)/a;if(c<=0||c>=1)continue;let l=t.maxRadius??Math.max(36,nt()*.14),u=3+c**.7*l,f=Math.sin(c*Math.PI)*(1-c)**1.25,p=m.current?.44:.28,h=Math.max(0,f*p);h<=.002||(r.save(),r.strokeStyle=m.current?`rgba(240, 245, 255, ${h.toFixed(3)})`:`rgba(130, 215, 235, ${h.toFixed(3)})`,r.lineWidth=Math.max(.5,(m.current?1.1:.85)*(1-c*.5)),r.beginPath(),r.arc(n.x,n.y,u,0,Ct),r.stroke(),r.restore())}r.textAlign=`center`,r.textBaseline=`middle`;for(let t of me){let n=Ae(t.cr,t.ci,i,o,s.current,d.current.rotateRight),a=e-t.born,c=8e3;if(a<0||a>=c)continue;let l=a/c,u=a<450?1+Math.sin(a/450*Math.PI)*.38:1;r.font=`800 ${Math.round(15*u)}px ui-monospace, monospace`;let f=Math.max(0,(1-l)**.85*.92);f<=.01||(r.save(),r.lineWidth=2.5,r.strokeStyle=`rgba(0, 16, 28, ${(f*.85).toFixed(3)})`,r.strokeText(String(t.index),n.x,n.y+.5),r.fillStyle=`rgba(235, 252, 255, ${f.toFixed(3)})`,r.fillText(String(t.index),n.x,n.y+.5),r.restore())}r.textAlign=`start`,r.textBaseline=`alphabetic`}function $t(){if(D!==`aiming`)return null;let e=tt(),t=e.x-M.x,n=e.y-M.y,r=Math.hypot(t,n);if(r<8)return null;let a=t/r,s=n/r,c=Math.hypot(i,o)*1.18,l=ue,u=Math.cos(l),d=Math.sin(l);return{apexX:M.x,apexY:M.y,directionX:a,directionY:s,range:c,leftX:M.x+(a*u-s*d)*c,leftY:M.y+(s*u+a*d)*c,rightX:M.x+(a*u+s*d)*c,rightY:M.y+(s*u-a*d)*c,tipX:M.x+a*c*1.04,tipY:M.y+s*c*1.04}}function en(){let e=n.current;if(e&&!m.current){if(D===`aiming`){e.setDisplay({...ye(`aiming`),cone:$t(),cssWidth:i,cssHeight:o});return}e.setDisplay({...ye(`play`),cone:null,cssWidth:i,cssHeight:o})}}function tn(e){if(!Be)return;let t=Ae(Ce.xMin,Ce.yMax,i,o,s.current,!1),n=Ae(Ce.xMax,Ce.yMin,i,o,s.current,!1),r=Math.round(Math.min(t.x,n.x)),a=Math.round(Math.min(t.y,n.y)),c=Math.max(1,Math.round(Math.abs(n.x-t.x))),l=Math.max(1,Math.round(Math.abs(n.y-t.y)));e.drawImage(Be,r,a,c,l)}function nn(){if(D!==`aiming`||m.current)return;let e=$t();if(!e)return;let{apexX:t,apexY:a,directionX:s,directionY:c,range:l}=e;if(!n.current&&Be&&Y){if(Z){Y.clearRect(0,0,i,o),tn(Y),Y.globalCompositeOperation=`destination-in`,Y.save(),Y.filter=`blur(${32*_}px)`;let e=Math.atan2(c,s),n=ue*2/Ct,r=Math.min(n*.22,.04),u=Y.createConicGradient(e-ue,t,a);u.addColorStop(0,`rgba(255, 255, 255, 0)`),u.addColorStop(r,`rgba(255, 255, 255, 1)`),u.addColorStop(Math.max(r,n-r),`rgba(255, 255, 255, 1)`),u.addColorStop(n,`rgba(255, 255, 255, 0)`),n<1&&u.addColorStop(1,`rgba(255, 255, 255, 0)`),Y.fillStyle=u,Y.fillRect(0,0,i,o),Y.globalCompositeOperation=`destination-in`;let d=Y.createRadialGradient(t,a,0,t,a,l);d.addColorStop(0,`rgba(255, 255, 255, 0.9)`),d.addColorStop(.55,`rgba(255, 255, 255, 0.4)`),d.addColorStop(1,`rgba(255, 255, 255, 0)`),Y.fillStyle=d,Y.fillRect(0,0,i,o),Y.restore(),Y.globalCompositeOperation=`source-over`,Z=!1}r.save(),r.globalAlpha=.32,r.drawImage(J,0,0,i,o),r.restore()}}function rn(e){en(),r.clearRect(0,0,i,o),q&&Gt(),G&&r.drawImage(G,0,0,i,o);let t=tt();nn(),Lt(t),Qt(e),Xt(e)}function an(e){let t=B(i,o),n=ke(t.x,t.y,i,o,s.current,d.current.rotateRight),r=Math.random(),a,c;r<.35?(a=Math.max(18,nt()*(.04+Math.random()*.04)),c=2600+Math.random()*800):r<.75?(a=Math.max(45,nt()*(.09+Math.random()*.08)),c=3400+Math.random()*1e3):(a=Math.max(90,nt()*(.18+Math.random()*.14)),c=4600+Math.random()*1200),V.push({cr:n.x,ci:n.y,born:e,index:1,lifetime:c,maxRadius:a})}function on(e){if(m.current)return;let t=D===`aiming`&&!m.current;if(!m.current&&!t||g.current||m.current&&n.current?.isMriReady()||Ue!==0&&e-Ue<40)return;Ue=e,n.current?.setLayer(`pond`),n.current?.setTuning({...d.current,maxDepth:de,doublePixels:m.current?!0:d.current.doublePixels}),n.current?.setAtmosphere(_e);let r=Array.from({length:96},()=>he());n.current?.spawnAppend(r,1,$e),Math.random()<.04&&an(e)}function sn(e){if(!m.current||g.current)return;if(We||=e,!Ge){let t=Math.min(1,(e-We)/fe);t>=1?(Ge=!0,O({progress:1,ready:!0})):e-Ke>40&&(Ke=e,O({progress:t}))}let t=h.current<32?900:2400;He!==0&&e-He<t||(He=e,w.current=!0,n.current?.setTuning({...d.current,maxDepth:de,doublePixels:!0}),n.current?.setAtmosphere(_e),jt(),an(e))}function cn(e){let t=Math.min(.05,(e-b)/1e3);b=e,x+=t;let n=1/120;for(;x>=n;)Dt(n,e),Mt(n,e),x-=n;sn(e),on(e),Et(e,t),st(e),rn(e),y=requestAnimationFrame(cn)}function ln(t){let n=e.getBoundingClientRect();return{x:t.clientX-n.left,y:t.clientY-n.top}}function un(e){let t=s.current,r=d.current.rotateRight;if(D===`flying`||D===`aiming`){let n=Ne(R.x,R.y,i,o,t,e,r);if(D===`flying`){let n=Pe(R.x,R.y,R.vx,R.vy,i,o,t,e,r);R.vx=n.x,R.vy=n.y;let a=t.halfY/Math.max(e.halfY,1e-6);R.z*=a,R.vz*=a}R.x=n.x,R.y=n.y,D===`aiming`&&(M=Ne(M.x,M.y,i,o,t,e,r))}s.current=e,q=!0,Z=!0,n.current?.setView(e)}function dn(t){if(m.current)return;let r=ln(t);k=t.pointerId,e.setPointerCapture(k),D===`ready`&&Math.hypot(r.x-R.x,r.y-R.y)<=48?(A=`aim`,D=`aiming`,z=ee(Math.random),Qe=``,Z=!0,n.current?.setLayer(`pond`),n.current?.setAtmosphere(_e),n.current?.setTuning({...d.current,maxDepth:de}),M=r,R.x=r.x,R.y=r.y,ct(!0)):(A=`pan`,j=r,te={...s.current})}function fn(e){let t=ln(e);if(e.pointerId!==k)return;if(A===`pan`){let e=d.current.rotateRight,n=ke(j.x,j.y,i,o,te,e),r=ke(t.x,t.y,i,o,te,e);un({centerX:te.centerX-(r.x-n.x),centerY:te.centerY-(r.y-n.y),halfY:te.halfY});return}if(A!==`aim`||D!==`aiming`)return;let n=tt(),r=t.x-n.x,a=t.y-n.y,s=Math.hypot(r,a),c=nt()*lt,l=s>c?c/s:1;M={x:n.x+r*l,y:n.y+a*l},R.x=M.x,R.y=M.y,Z=!0}function pn(t){if(t.pointerId!==k)return;if(Z=!0,A===`pan`){A=`none`,k=-1,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId);return}if(A!==`aim`||D!==`aiming`)return;let r=tt(),i=r.x-M.x,a=r.y-M.y,o=Math.hypot(i,a);if(k=-1,A=`none`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),o<12){D=`ready`,R.x=r.x,R.y=r.y,n.current?.clear(),n.current?.setTuning(d.current),n.current?.setAtmosphere(ge),n.current?.setLayer(`throw`),ct(!0);return}let c=nt()*lt,l=Math.min(1,o/c),f=Math.atan2(a,i);w.current=!1,re(!1),P(!1),T.current=null,v.current={version:1,view:{...s.current},rotateRight:d.current.rotateRight,angle:f,power:l,skips:z,glyph:ie,seed:N,sourceDots:d.current.sourceDots,name:u.current||`YOU`},ne(!0),ht(f,l)}function mn(){if(A===`pan`){A=`none`,k=-1;return}if(A!==`aim`||D!==`aiming`)return;D=`ready`,k=-1,A=`none`;let e=tt();M={...e},R.x=e.x,R.y=e.y,Z=!0,n.current?.clear(),n.current?.setTuning(d.current),n.current?.setAtmosphere(ge),n.current?.setLayer(`throw`),ct(!0)}function hn(e){m.current||(e.key===`Escape`&&mn(),(e.key===` `||e.key===`Enter`)&&D===`result`&&(e.preventDefault(),E.current()))}let gn=new ResizeObserver(rt);return gn.observe(e),e.addEventListener(`pointerdown`,dn),e.addEventListener(`pointermove`,fn),e.addEventListener(`pointerup`,pn),e.addEventListener(`pointercancel`,mn),window.addEventListener(`keydown`,hn),rt(),mt(),y=requestAnimationFrame(cn),()=>{et=!0,cancelAnimationFrame(y),gn.disconnect(),e.removeEventListener(`pointerdown`,dn),e.removeEventListener(`pointermove`,fn),e.removeEventListener(`pointerup`,pn),e.removeEventListener(`pointercancel`,mn),window.removeEventListener(`keydown`,hn),U?.close(),C.current=null}},[]);let K=V.phase===`ready`?`Grab the white orb. Pull back and release.`:V.phase===`aiming`?`Aim for deep water · farther pull = faster throw`:V.phase===`flying`?`Each splash launches a new ${W.sourceDots}-point glyph`:V.phase===`resolving`?`Resolving the pond · ${Math.round(V.progress*100)}%`:`Press Space or throw again`,q=Math.max(0,U.indexOf(W.maxDepth)),J=()=>{if(w.current=!1,re(!1),P(!1),T.current){let e=T.current;T.current=null,d.current=e,Oe(e),Gt(e),n.current?.setTuning(e),p.current(),f.current()}c.current(),requestAnimationFrame(()=>t.current?.focus())};E.current=J;let ze=()=>{let e=v.current;!e||D||C.current?.(e)},X=()=>{let e=v.current;if(!e)return;let t=qe(window.location.href,e);history.replaceState(null,``,t),(async()=>{try{if(navigator.share){await navigator.share({title:`Mandelbrot Skipping`,url:t});return}}catch(e){if(e instanceof Error&&e.name===`AbortError`)return}try{await navigator.clipboard.writeText(t),R(`Copied`),window.setTimeout(()=>R(``),1600)}catch{R(`Copy the address bar`),window.setTimeout(()=>R(``),2400)}})()},Z=V.phase===`flying`||V.phase===`resolving`||!!D;return(0,o.jsxs)(`main`,{className:`gameShell ${ie?`replayMode`:``}`,children:[(0,o.jsxs)(`section`,{className:`playfield`,"aria-label":`Mandelbrot rock skipping game`,children:[(0,o.jsx)(`canvas`,{ref:e,className:`gpuCanvas`,"aria-hidden":`true`}),(0,o.jsx)(`canvas`,{ref:t,className:`gameCanvas`,tabIndex:0,"aria-label":`Throw ready. Drag the white orb backward and release it across the water`}),ie&&(0,o.jsxs)(`p`,{className:`replayBanner`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`replayBannerName`,children:Y(F)}),(0,o.jsx)(`span`,{className:`replayBannerLabel`,children:`replay`})]}),D&&(0,o.jsx)(y,{progress:D.progress,fading:k,ready:D.ready,gpuContext:a.current,onPlay:Ie}),(V.phase===`flying`||V.phase===`resolving`)&&!D&&(0,o.jsx)(`button`,{type:`button`,className:`playfieldThrowControl`,onClick:J,"aria-label":`Cancel this throw and rethrow`,children:`Rethrow`}),(0,o.jsxs)(`div`,{className:`playfieldDock`,children:[(0,o.jsx)(`button`,{type:`button`,className:`replayOpening`,onClick:Le,disabled:!!D||!!z,"aria-label":`Replay the opening Buddhabrot sequence`,children:`Replay opening`}),(0,o.jsx)(b,{})]})]}),(0,o.jsxs)(`aside`,{className:`scoreRail ${V.phase===`result`?`hasResult`:``}`,"aria-label":`Score and local high scores`,children:[(0,o.jsxs)(`section`,{className:`liveScore`,"aria-live":`polite`,children:[(0,o.jsx)(`span`,{className:`liveLabel`,children:V.phase===`result`?`Final score`:`Live score`}),(0,o.jsx)(`strong`,{className:`liveNumber`,children:Lt(V.score)}),(0,o.jsxs)(`span`,{className:`liveMeta`,children:[V.skips,` skips · `,V.deepest?Lt(V.deepest):`0`,` deep · `,V.coverage,` cells · `,Math.round(V.spread*100),`% spread`]}),(0,o.jsx)(`span`,{className:`liveProgress`,children:(0,o.jsx)(`i`,{style:{width:`${Math.max(2,V.progress*100)}%`}})}),(0,o.jsxs)(`div`,{className:`throwShareRow`,children:[(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:ze,disabled:!M||Z,"aria-label":`Replay this throw`,children:`Replay throw`}),(0,o.jsx)(`button`,{type:`button`,className:`rethrowButton`,onClick:X,disabled:!M,"aria-label":`Copy a link to this throw`,children:se||`Share throw`})]})]}),(0,o.jsxs)(`section`,{className:`tuningPanel`,"aria-label":`Orbit tuning`,children:[(0,o.jsxs)(`div`,{className:`tuningHeading`,children:[(0,o.jsx)(`span`,{children:`Orbit tuning`}),(0,o.jsx)(`span`,{children:`Live`})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Glyph dots`}),(0,o.jsx)(`output`,{children:W.sourceDots})]}),(0,o.jsx)(`input`,{type:`range`,min:Xe,max:Ze,step:`1`,value:W.sourceDots,"aria-label":`Dots per sacred geometry glyph`,onChange:e=>G({sourceDots:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Orbit limit`}),(0,o.jsx)(`output`,{children:Vt(W.maxDepth)})]}),(0,o.jsx)(`input`,{type:`range`,min:`0`,max:U.length-1,step:`1`,value:q,"aria-label":`Orbit iteration limit`,"aria-valuetext":`${Lt(W.maxDepth)} iterations`,onChange:e=>G({maxDepth:U[Number(e.target.value)]})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Acceleration curve`}),(0,o.jsxs)(`output`,{children:[W.acceleration.toFixed(1),`×`]})]}),(0,o.jsx)(`input`,{type:`range`,min:be,max:18,step:`0.1`,value:W.acceleration,"aria-label":`Iteration speed acceleration curve`,"aria-valuetext":`${W.acceleration.toFixed(1)} curve`,onChange:e=>G({acceleration:Number(e.target.value)})})]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Line persist`}),(0,o.jsxs)(`output`,{children:[W.linePersist.toFixed(2),`s`]})]}),(0,o.jsx)(`input`,{type:`range`,min:nt,max:$,step:`0.05`,value:W.linePersist,"aria-label":`How long iteration lines stay visible`,"aria-valuetext":`${W.linePersist.toFixed(2)} seconds`,onChange:e=>G({linePersist:Number(e.target.value)})})]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.previewOrbits,"aria-label":`Preview skip orbits while aiming`,onChange:e=>G({previewOrbits:e.target.checked})}),`Aim orbit preview`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.skipColors,"aria-label":`Color each skip differently`,onChange:e=>G({skipColors:e.target.checked})}),`Skip colors`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.coordinateAxes,"aria-label":`Show coordinate axes`,onChange:e=>G({coordinateAxes:e.target.checked})}),`Coordinate axes`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.rotateRight,"aria-label":`Rotate coordinates and Buddhabrot 90 degrees right`,onChange:e=>G({rotateRight:e.target.checked})}),`Rotate 90° right`]}),(0,o.jsxs)(`label`,{className:`tuningCheck`,children:[(0,o.jsx)(`input`,{type:`checkbox`,checked:W.doublePixels,"aria-label":`Render the orbit nebula at half resolution so pixels look doubled`,onChange:e=>G({doublePixels:e.target.checked})}),`Double pixels`]}),(0,o.jsxs)(`div`,{className:`tuningControl`,children:[(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{children:`Preview iterations`}),(0,o.jsx)(`output`,{children:W.previewIterations})]}),(0,o.jsx)(`input`,{type:`range`,min:rt,max:it,step:`1`,value:W.previewIterations,"aria-label":`Orbit iterations to draw while aiming`,"aria-valuetext":`${W.previewIterations} iterations`,onChange:e=>G({previewIterations:Number(e.target.value)})})]}),(0,o.jsx)(`p`,{className:`tuningNote`,children:`Higher curve starts slower, then ramps harder. Line persist is time to fade. Aim preview draws each predicted skip from its splash point, halving iterations each skip. Skip colors tint preview and live trails per splash.`})]}),V.phase===`result`&&(0,o.jsxs)(`section`,{className:`railResult`,"aria-label":`Throw result`,children:[(0,o.jsx)(`div`,{className:`resultEyebrow`,children:N?`${Y(F)} throw`:H[0]?.id===Ee?`New local best`:`Throw complete`}),(0,o.jsxs)(`div`,{className:`resultStats`,children:[V.skips,` exact paths · `,Lt(V.deepest),` deep · `,V.coverage,` distinct cells · `,Math.round(V.spread*100),`% spread.`]}),(0,o.jsxs)(`div`,{className:`nameRow`,children:[Ee?(0,o.jsx)(`input`,{className:`nameInput`,"aria-label":`High score name`,value:we,maxLength:12,onChange:e=>Re(e.target.value)}):null,(0,o.jsx)(`button`,{className:`throwButton`,onClick:J,children:`Throw again`})]})]}),(0,o.jsx)(`h2`,{className:`railTitle`,children:`Local legends`}),(0,o.jsx)(`p`,{className:`railSub`,children:`Depth, distinct points, and spatial spread all score. Later skips multiply the result.`}),z&&(0,o.jsx)(`p`,{className:`gpuNote`,role:`status`,children:z}),(0,o.jsxs)(`div`,{className:`scoreList`,children:[H.length===0&&(0,o.jsx)(`div`,{className:`emptyScores`,children:`No throws yet.`}),H.map((e,t)=>(0,o.jsxs)(`div`,{className:`scoreEntry ${e.id===Ee?`current`:``}`,children:[(0,o.jsx)(`span`,{className:`rank`,children:String(t+1).padStart(2,`0`)}),(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`span`,{className:`scoreName`,children:e.name}),(0,o.jsxs)(`span`,{className:`scoreMeta`,children:[e.skips,` skips · `,Lt(e.deepest),` deep · `,e.coverage,` cells · `,Math.round(e.spread*100),`% spread`]})]}),(0,o.jsx)(`span`,{className:`scoreNumber`,children:Lt(e.score)})]},e.id))]}),(0,o.jsxs)(`div`,{className:`railHint`,children:[K,(0,o.jsx)(`br`,{}),`Drag empty water to move · wheel or +/- to zoom.`]}),(0,o.jsxs)(`div`,{className:`railFooter`,children:[`Saved on this device · score model v2 · `,Vt(W.maxDepth),` orbit cap`]})]})]})}export{$t as default};