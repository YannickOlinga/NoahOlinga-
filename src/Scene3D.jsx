import React,{useEffect,useRef} from 'react';

const vertex = `
attribute vec3 aPosition;
uniform mat4 uMatrix;
uniform float uPointSize;
varying float vGlow;
void main(){
  vec4 p=uMatrix*vec4(aPosition,1.0);
  gl_Position=p;
  gl_PointSize=uPointSize*(0.72+0.5*(1.0-aPosition.y));
  vGlow=0.45+0.55*(aPosition.y*0.5+0.5);
}`;
const fragment = `
precision mediump float;
uniform vec3 uColor;
varying float vGlow;
void main(){
  vec2 q=gl_PointCoord-vec2(0.5);
  float d=length(q);
  if(d>0.5) discard;
  float halo=1.0-smoothstep(0.08,0.5,d);
  gl_FragColor=vec4(uColor,halo*vGlow*0.88);
}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s}
function matrix(angle,tilt,scale){
 const c=Math.cos(angle),s=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt);
 return new Float32Array([c*scale,st*s*scale,-ct*s*scale,0,0,ct*scale,st*scale,0,s,-st*c,ct*c,0,0,0,0,1]);
}
export default function Scene3D(){
 const canvas=useRef(null);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const gl=el.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!gl)return;
  const program=gl.createProgram(),vs=shader(gl,gl.VERTEX_SHADER,vertex),fs=shader(gl,gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  const positions=[];
  // A point-cloud sphere with subtle latitude/longitude structure.
  for(let i=0;i<1800;i++){
   const y=1-2*(i+0.5)/1800, radius=Math.sqrt(1-y*y),a=i*2.3999632297;
   const ripple=1+0.035*Math.sin(a*5)*Math.cos(y*17);
   positions.push(Math.cos(a)*radius*ripple,y*ripple,Math.sin(a)*radius*ripple);
  }
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'aPosition'),matrixLoc=gl.getUniformLocation(program,'uMatrix'),sizeLoc=gl.getUniformLocation(program,'uPointSize'),colorLoc=gl.getUniformLocation(program,'uColor');
  let raf=0,start=performance.now(),w=0,h=0;
  const resize=()=>{const rect=el.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);w=Math.max(1,Math.floor(rect.width*dpr));h=Math.max(1,Math.floor(rect.height*dpr));if(el.width!==w||el.height!==h){el.width=w;el.height=h;gl.viewport(0,0,w,h)}};
  const draw=now=>{resize();const t=(now-start)*0.00022;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(matrixLoc,false,matrix(t,0.22+Math.sin(t*.7)*.12,.74));gl.uniform1f(sizeLoc,Math.max(1.3,Math.min(w,h)*.009));gl.uniform3f(colorLoc,.63,.82,.31);gl.drawArrays(gl.POINTS,0,positions.length/3);raf=requestAnimationFrame(draw)};
  const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){if(!raf)raf=requestAnimationFrame(draw)}else{cancelAnimationFrame(raf);raf=0}});
  observer.observe(el);const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else if(!raf)raf=requestAnimationFrame(draw)};document.addEventListener('visibilitychange',onVisibility);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs)};
 },[]);
 return <canvas ref={canvas} className="webgl-scene" aria-label="Sphère 3D animée interactive décorative" role="img"/>;
}
