import{a as d}from"./chunk-CYG7FRMU.js";import{a as l}from"./chunk-M2CBD5LN.js";import"./chunk-65HSDNOA.js";import{g as c}from"./chunk-ISNVXISG.js";import"./chunk-H2F5SJCQ.js";import"./chunk-DU7AQFPA.js";import"./chunk-VC46IEJQ.js";var o=r=>document.getElementById(r);async function u(r){document.body.insertAdjacentHTML("beforeend",`<div class="ui" id="controls">
      <button id="explode">Despiece</button>
      <button id="run"><span class="lamp"></span><span>Arrancar</span></button>
      <label class="chip">Gas <input id="throttle" type="range" min="0" max="100" value="60" aria-label="Palanca de gas"></label>
      <button id="heat">Mapa de calor</button>
      <button id="cam">C\xE1mara de combusti\xF3n</button>
      <button id="gear">Tren</button>
      <button id="surfaces">Mandos</button>
      <button id="cockpit">Cabina</button>
      <button id="fly">Volar</button>
    </div>
    <div class="ui" id="keys">E arrancar \xB7 May\xFAs/Ctrl gas \xB7 W/S cabeceo \xB7 A/D alabeo \xB7 Z/X tim\xF3n \xB7 G tren \xB7 F flaps \xB7 B frenos \xB7 T gir\xF3scopo \xB7 C c\xE1mara \xB7 R reiniciar</div>`),r.pad=l({touch:!1}),r.onStats=c(r);let a=await d(r),e=a.actions;for(let[t,n]of Object.entries({explode:e.explode,run:e.run,heat:e.heat,cam:e.pip,gear:e.gear,surfaces:e.surfaces,cockpit:e.cockpit,fly:e.fly}))o(t).onclick=n;o("throttle").oninput=t=>e.throttle(t.target.value/100),a.onChange(t=>{for(let[n,s]of Object.entries({explode:t.exploded,run:t.running,heat:t.heat,cam:t.pip,gear:t.gear,surfaces:t.surfaces,cockpit:t.cockpit,fly:t.flying}))o(n).toggleAttribute("data-on",s);o("explode").textContent=t.exploded?"Montar":"Despiece",o("run").lastChild.textContent=t.running?"Apagar":"Arrancar",o("fly").textContent=t.flying?"Volver al taller":"Volar"});let i=o("tip");a.canvas.addEventListener("pointermove",t=>{let n=a.pick(t.clientX,t.clientY);document.body.toggleAttribute("data-hover",!!n),n&&(i.style.left=`${t.clientX+14}px`,i.style.top=`${t.clientY+10}px`,i.textContent=n)}),a.canvas.addEventListener("pointerleave",()=>document.body.removeAttribute("data-hover")),a.canvas.addEventListener("click",()=>a.focusPicked()),addEventListener("resize",a.resize)}export{u as default};
