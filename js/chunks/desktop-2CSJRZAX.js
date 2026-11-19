import{a as s,b as u}from"./chunk-IWQCEKBX.js";import{a as d}from"./chunk-M2CBD5LN.js";import"./chunk-JUALDYDT.js";import{g as l}from"./chunk-ISNVXISG.js";import"./chunk-LQW7N7OQ.js";import"./chunk-UZSR6Q5S.js";import"./chunk-VC46IEJQ.js";var e=n=>document.getElementById(n);async function b(n,i){document.body.insertAdjacentHTML("beforeend",`<div class="ui" id="controls">
      <button id="explode">Despiece</button>
      <button id="run"><span class="lamp"></span><span>Arrancar</span></button>
      <label class="chip">Gas <input id="throttle" type="range" min="0" max="100" value="${Math.round((i.throttle??.85)*100)}" aria-label="Palanca de gases"></label>
      <label class="chip" id="machchip">Mach <input id="mach" type="range" min="0" max="${i.maxMach*10}" value="0" aria-label="Mach objetivo"><output id="machv">0</output></label>
      <button id="mission">Misi\xF3n</button>
      <button id="heat">Mapa de calor</button>
      <button id="cut">Corte</button>
      <button id="gear">Tren</button>
      <button id="surfaces">Mandos</button>
      <button id="fly">Volar</button>
    </div>
    <div class="ui" id="hud"></div>
    <div class="ui" id="keys">E arrancar \xB7 May\xFAs/Ctrl gas \xB7 W/S cabeceo \xB7 A/D alabeo \xB7 Z/X tim\xF3n \xB7 G tren \xB7 F flaps \xB7 B frenos \xB7 T gir\xF3scopo \xB7 C c\xE1mara \xB7 R reiniciar</div>`),n.onStats=l(n),n.pad=d({touch:!1}),n.onFrame=t=>{t.mission&&(e("mach").value=Math.round(t.Mtarget*10)),e("machv").textContent=s(t.Mtarget,1)};let a=await u(n,i),r=a.actions;for(let t of["explode","run","mission","heat","cut","gear","surfaces","fly"])e(t).onclick=r[t];e("throttle").oninput=t=>r.throttle(t.target.value/100),e("mach").oninput=t=>r.mach(t.target.value/10),a.onChange(t=>{for(let[o,p]of Object.entries({explode:t.exploded,run:t.running,mission:t.mission,heat:t.heat,cut:t.cut,gear:t.gear,surfaces:t.surfaces,fly:t.flying}))e(o).toggleAttribute("data-on",p);e("fly").textContent=t.flying?"Volver al taller":"Volar",e("explode").textContent=t.exploded?"Montar":"Despiece",e("run").lastChild.textContent=t.running?"Apagar":"Arrancar"});let c=e("tip");a.canvas.addEventListener("pointermove",t=>{let o=a.pick(t.clientX,t.clientY);document.body.toggleAttribute("data-hover",!!o),o&&(c.style.left=`${t.clientX+14}px`,c.style.top=`${t.clientY+10}px`,c.textContent=o)}),a.canvas.addEventListener("pointerleave",()=>document.body.removeAttribute("data-hover")),a.canvas.addEventListener("dblclick",()=>a.focusPicked()),addEventListener("resize",a.resize)}export{b as default};
