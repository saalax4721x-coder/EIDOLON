"use client";

import { useEffect, useRef, useState } from "react";
import { fragmentShader, vertexShader } from "./porcelain-shaders";

/** The reference's ray-marched, thin-film chrome sculpture, with no external assets. */
export function PorcelainChrome({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(stage);
  const [ready, setReady] = useState(false);
  useEffect(() => { target.current = stage; }, [stage]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const gl = element.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexShader), fragment = compile(gl.FRAGMENT_SHADER, fragmentShader);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) { shaders.forEach(s => gl.deleteShader(s)); if(program) gl.deleteProgram(program); return; }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); return; }
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniforms = Object.fromEntries(["r","t","w","a","wob"].map(key=>[key,gl.getUniformLocation(program,key)]));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const weights = [1,0,0,0]; let frame=0, visible=true, dragging=false, dirty=true, x=-.35, y=.6, lastX=0, lastY=0, vx=0, vy=0, previous=target.current, wob=0, elapsed=0, last=performance.now();
    const draw = (now:number) => {
      frame=requestAnimationFrame(draw);
      const delta=Math.min(40,now-last); last=now;
      if (!visible || document.hidden || gl.isContextLost()) return;
      const ratio=Math.min(window.devicePixelRatio||1,1.5), width=Math.round(element.clientWidth*ratio), height=Math.round(element.clientHeight*ratio);
      if (!width || !height) return;
      if(element.width!==width||element.height!==height){element.width=width;element.height=height;gl.viewport(0,0,width,height);dirty=true;}
      if(previous!==target.current){previous=target.current;wob=1;dirty=true;}
      if(reduced.matches&&!dirty)return;
      dirty=false;
      weights.forEach((value,index)=>{weights[index]=reduced.matches?Number(index===target.current):value+(Number(index===target.current)-value)*.065;});
      if(!reduced.matches){elapsed+=delta/1000; if(!dragging){vy+=(.0035-vy)*.03;vx*=.95;y+=vy;x+=( -.3-x)*.015+vx;}wob*=.94;}
      gl.uniform2f(uniforms.r,width,height);gl.uniform1f(uniforms.t,reduced.matches?4:elapsed);gl.uniform4fv(uniforms.w,weights);gl.uniform2f(uniforms.a,x,y);gl.uniform1f(uniforms.wob,reduced.matches?0:wob);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    };
    const down=(event:PointerEvent)=>{dragging=true;lastX=event.clientX;lastY=event.clientY;element.setPointerCapture(event.pointerId);};
    const move=(event:PointerEvent)=>{if(!dragging)return;vy=(event.clientX-lastX)*.008;vx=(event.clientY-lastY)*.008;y+=vy;x+=vx;lastX=event.clientX;lastY=event.clientY;dirty=true;};
    const up=()=>{dragging=false;};
    const motionChanged=()=>{dirty=true;};
    const contextLost=()=>{setReady(false);};
    const keyboard=(event:KeyboardEvent)=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();y+=event.key==="ArrowLeft"?-.15:event.key==="ArrowRight"?.15:0;x+=event.key==="ArrowUp"?-.15:event.key==="ArrowDown"?.15:0;dirty=true;};
    const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;});observer.observe(element);
    reduced.addEventListener("change",motionChanged);element.addEventListener("webglcontextlost",contextLost);
    element.addEventListener("pointerdown",down);element.addEventListener("pointermove",move);element.addEventListener("pointerup",up);element.addEventListener("pointercancel",up);element.addEventListener("keydown",keyboard);
    setReady(true);frame=requestAnimationFrame(draw);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();reduced.removeEventListener("change",motionChanged);element.removeEventListener("webglcontextlost",contextLost);element.removeEventListener("pointerdown",down);element.removeEventListener("pointermove",move);element.removeEventListener("pointerup",up);element.removeEventListener("pointercancel",up);element.removeEventListener("keydown",keyboard);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));};
  }, []);
  return <div className={`chrome ${ready?"is-live":"no-gl"}`}><span className="chrome-shadow" aria-hidden="true"/><span className="chrome-fallback" aria-hidden="true"/><canvas className="chrome-gl" ref={canvas} tabIndex={0} aria-label="Interactive chrome sculpture. Drag or use arrow keys to rotate." role="img"/></div>;
}
