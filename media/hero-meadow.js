(async()=>{
const root=document.getElementById('hero'),image=root.querySelector('img'),canvas=root.querySelector('canvas'),toggle=root.querySelector('.meadow-pause');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reduced.matches,visible=true,elapsed=0,travel=reduced.matches?14:0,last=0;
function labels() { toggle.textContent = playing ? 'Pause motion' : 'Play motion'; toggle.setAttribute('aria-pressed', String(!playing)); }
labels();
toggle.addEventListener('click', () => { playing = !playing; labels(); });
reduced.addEventListener('change', () => { playing = !reduced.matches; if (reduced.matches) travel = 14; labels(); });
if (reduced.matches) return;
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(root);
try{
const THREE=await import('./vendor/three.module.min.js');
if(!image.complete)await new Promise(resolve=>image.addEventListener('load',resolve,{once:true}));
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,90);
const texture=new THREE.Texture(image);texture.needsUpdate=true;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
const uniforms={time:{value:0},windOn:{value:1},plate:{value:texture},resolution:{value:new THREE.Vector2()},imageCrop:{value:new THREE.Vector2(1,1)},imageOffset:{value:new THREE.Vector2(0,0)}};
const positions=[],indices=[];const segments=5;
for(let j=0;j<=segments;j++){const h=j/segments;positions.push(-1,h,0,1,h,0);if(j<segments){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
let seed=1973;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const offsets=[],traits=[];const target=matchMedia('(max-width: 600px)').matches?10000:36000;
for(let i=0;i<target;i++){
 const x=(rand()-.5)*44,z=5-rand()*29;
 const path=3.5+Math.sin((z+3)*.15)*.8;
 const pathWidth=.72+Math.max(0,z+20)*.012;
 if(Math.abs(x-path)<pathWidth)continue;
 const terrain=.15*Math.sin(x*.21+z*.08)+.10*Math.cos(z*.18);
 offsets.push(x,terrain,z);
 traits.push(.20+rand()*.42,.014+rand()*.014,rand()*Math.PI*2,rand());
}
geometry.setAttribute('rootPosition',new THREE.InstancedBufferAttribute(new Float32Array(offsets),3));geometry.setAttribute('traits',new THREE.InstancedBufferAttribute(new Float32Array(traits),4));geometry.instanceCount=offsets.length/3;
const material=new THREE.ShaderMaterial({transparent:true,depthWrite:true,side:THREE.DoubleSide,uniforms,
vertexShader:`
attribute vec3 rootPosition;attribute vec4 traits;uniform float time;uniform float windOn;varying float bladeHeight;varying float bladeEdge;varying float depthFade;varying float tint;
float hash(vec2 p){return fract(sin(dot(p,vec2(61.13,37.77)))*14371.17);}
float noise(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(a),hash(a+vec2(1.,0.)),f.x),mix(hash(a+vec2(0.,1.)),hash(a+vec2(1.,1.)),f.x),f.y);}
void main(){
 float h=position.y;float height=traits.x;float width=traits.y;float angle=traits.z;
 float front=noise(rootPosition.xz*.20-vec2(time*.20,time*.08));
 float flow=sin(rootPosition.x*.32+rootPosition.z*.23-time*.70);
 float breeze=(.18+.25*front+.11*flow)*windOn;
 float flutter=sin(time*1.45+traits.w*6.28+rootPosition.x*.4)*.025*windOn;
 float curve=h*h;float taper=pow(1.-h,.65);
 vec3 p=rootPosition;
 p.x+=cos(angle)*position.x*width*taper;
 p.z+=sin(angle)*position.x*width*taper;
 p.y+=h*height;
 // Every blade has a fixed root. Bending and downward arc grow toward its tip.
 p.x+=height*curve*(.10+breeze+flutter);
 p.z+=height*curve*(.025+breeze*.18);
 p.y-=height*h*h*h*breeze*breeze*.25;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 bladeHeight=h;bladeEdge=position.x;tint=traits.w;
 float d=length(cameraPosition.xz-rootPosition.xz);depthFade=1.-smoothstep(13.,27.,d);
}`,
fragmentShader:`
uniform sampler2D plate;uniform vec2 resolution;uniform vec2 imageCrop;uniform vec2 imageOffset;varying float bladeHeight;varying float bladeEdge;varying float depthFade;varying float tint;
void main(){
 vec2 screen=gl_FragCoord.xy/resolution;vec2 uv=(screen-.5)*imageCrop+.5+imageOffset;
 vec3 painted=texture2D(plate,uv).rgb;
 float shade=mix(.86,1.16,bladeHeight)*mix(.96,1.04,tint);
 vec3 color=painted*shade+vec3(.012,.018,.003)*bladeHeight;
 float foreground=1.-smoothstep(.20,.36,screen.y);float alpha=depthFade*smoothstep(0.,.22,bladeHeight)*foreground*.72;
 if(alpha<.025)discard;gl_FragColor=vec4(color,alpha);
}`});
const meadow=new THREE.Mesh(geometry,material);meadow.frustumCulled=false;scene.add(meadow);
function resize(){const w=root.clientWidth,h=root.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.getDrawingBufferSize(uniforms.resolution.value);const source=image.naturalWidth/image.naturalHeight,view=w/h;uniforms.imageCrop.value.set(view<source?view/source:1,view>source?source/view:1);uniforms.imageOffset.value.set(w<=600?.2*(1-uniforms.imageCrop.value.x):0,0);}
new ResizeObserver(resize).observe(root);resize();
function draw(now){requestAnimationFrame(draw);const dt=Math.min((now-last)/1000,.04);last=now;if(playing&&visible&&!document.hidden){elapsed+=dt;travel=Math.min(14,travel+dt);}if(!visible||!playing)return;
 const p=travel/14;const eased=p*p*p*(p*(p*6.-15.)+10.);
 // Camera physically advances; smooth acceleration and braking, fixed horizon.
 camera.position.set(0,3.2,8-eased*1.8);camera.lookAt(0,6.7,camera.position.z-38);
 uniforms.time.value=elapsed;
 image.style.transform=`scale(${1+eased*.018})`;
 renderer.render(scene,camera);
 root.dataset.cameraProgress=p.toFixed(4);root.dataset.cameraZ=camera.position.z.toFixed(4);root.dataset.windTime=elapsed.toFixed(3);
}
canvas.hidden=false;toggle.hidden=false;requestAnimationFrame(draw);root.dataset.motion='ready';root.dataset.blades=geometry.instanceCount;
}catch(error){root.dataset.motion='failed';console.warn('Meadow animation unavailable; showing static landscape.',error);canvas.hidden=true;toggle.hidden=true;}
})();
