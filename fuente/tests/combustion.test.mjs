import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../web/combustion.js',import.meta.url),'utf8');
const {createCombustion,reactionAt}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('sin combustible o giro suficiente no hay ignición aunque el metal esté caliente',()=>{
 const c=createCombustion();
 c.update(10,{on:false,spin:1,heat:1,thr:1});assert.equal(c.state.flame,0);
 c.update(10,{on:true,spin:.1,heat:1,thr:1});assert.equal(c.state.flame,0);
});
test('el corte extingue la llama antes de que se enfríe el metal',()=>{
 const c=createCombustion();c.update(5,{on:true,spin:1,thr:1},{ab:1});
 assert.ok(c.state.flame>.99);assert.ok(c.state.afterburner>.99);
 c.update(.6,{on:false,spin:.9,thr:1,heat:1});
 assert.ok(c.state.flame<.001);assert.ok(c.state.afterburner<.001);
});
test('cada cámara mantiene la reacción fuera del compresor y de la turbina',()=>{
 const c=createCombustion();c.update(5,{on:true,spin:1,thr:1});
 for(const [engine,u,turbine] of [['F110',.38,.48],['F119',.36,.48],['J58',.435,.52],['TBCC',.41,.52]]){
  const path=engine==='TBCC'?'turbo':'core';
  assert.ok(reactionAt(engine,path,u,c.state)>0);
  assert.equal(reactionAt(engine,path,.15,c.state),0);
  assert.equal(reactionAt(engine,path,turbine,c.state),0);
  assert.equal(reactionAt(engine,path,.8,c.state),0);
 }
});
test('postquemador y ramjet sólo producen llama en sus estados activos',()=>{
 const c=createCombustion();c.update(5,{on:true,spin:1,thr:1},{ab:1,ram:1});
 assert.ok(reactionAt('F119','core',.75,c.state)>.9);
 assert.ok(reactionAt('TBCC','ram',.6,c.state)>.9);
 assert.equal(reactionAt('TBCC','ram',.15,c.state),0);
 assert.equal(reactionAt('F119','bypass',.35,c.state),0);
});
