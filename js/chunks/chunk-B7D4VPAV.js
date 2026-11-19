import{B as Ye,Ba as Te,Da as Le,Ea as ho,F as Ne,Fa as fo,G as Je,I as to,Ja as zt,La as po,Ma as ie,Na as Eo,Pa as mo,Q as Gt,Qa as Tt,T as F,Ta as ft,U as eo,V as ce,W as d,Wa as le,_ as oo,ba as ye,da as st,e as ge,f as Qe,fa as no,gb as vo,h as Ze,ha as Ut,ia as ao,ja as Pe,ka as K,la as _t,ma as ro,na as Re,pa as so,qa as co,ra as Ct,sa as io,ta as lo,v as we,w as Xe,ya as uo}from"./chunk-4LDS4F7T.js";var de=class s extends K{constructor(){let r=s.SkyShader,c=new Re({name:r.name,uniforms:ro.clone(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:ge,depthWrite:!1});super(new _t(1,1,1),c),this.isSky=!0}};de.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new d},up:{value:new d(0,1,0)}},vertexShader:`
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;
		uniform vec3 up;

		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;

		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calculation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;

		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}

		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}

		void main() {

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vWorldPosition = worldPosition.xyz;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			gl_Position.z = gl_Position.w; // set z to camera.far

			vSunDirection = normalize( sunPosition );

			vSunE = sunIntensity( dot( vSunDirection, up ) );

			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

			// extinction (absorption + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;

			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;

		}`,fragmentShader:`
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		uniform float mieDirectionalG;
		uniform vec3 up;

		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;

		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;

		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}

		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}

		void main() {

			vec3 direction = normalize( vWorldPosition - cameraPosition );

			// optical length
			// cutoff angle at 90 to avoid singularity in next formula.
			float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
			float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
			float sR = rayleighZenithLength * inverse;
			float sM = mieZenithLength * inverse;

			// combined extinction factor
			vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

			// in scattering
			float cosTheta = dot( direction, vSunDirection );

			float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
			vec3 betaRTheta = vBetaR * rPhase;

			float mPhase = hgPhase( cosTheta, mieDirectionalG );
			vec3 betaMTheta = vBetaM * mPhase;

			vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
			Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

			// nightsky
			float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
			float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
			vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
			vec3 L0 = vec3( 0.1 ) * Fex;

			// composition + solar disc
			float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
			L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

			vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

			vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

			gl_FragColor = vec4( retColor, 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};var{smoothstep:xt,clamp:Mo}=F,ue=12e3,Kt={x:120,z:60,rx:750,rz:600},ot={x:-480,z:680,r:170},Qt=(s,r)=>{let c=Math.sin(s*127.1+r*311.7)*43758.5453;return c-Math.floor(c)};function go(s,r){let c=Math.floor(s),e=Math.floor(r),l=s-c,o=r-e;l=l*l*(3-2*l),o=o*o*(3-2*o);let i=Qt(c,e),f=Qt(c+1,e),u=Qt(c,e+1),v=Qt(c+1,e+1);return i+(f-i)*l+(u-i)*o+(i-f-u+v)*l*o}function xe(s,r,c=5){let e=0,l=.5;for(let o=0;o<c;o++)e+=l*go(s,r),s*=2.03,r*=2.03,l*=.5;return e}var zo=(s,r)=>{let c=0,e=.5;for(let l=0;l<5;l++)c+=e*(1-Math.abs(go(s,r)*2-1))**2,s*=2.1,r*=2.1,e*=.5;return c},Ie=(s,r)=>Math.hypot((s-Kt.x)/Kt.rx,(r-Kt.z)/Kt.rz);function wo(s,r){let c=Ie(s,r),e=Math.max(xt(Math.abs(r),70,140),xt(Math.abs(s-120),260,340)),l=(xe(s/260,r/260,3)-.5)*3*e;return l+=xt(c,1,1.7)*(xe(s/520+7,r/520+3)*110-15),l+=xt(c,2.1,3.4)*zo(s/1400,r/1400)*520,l}function ko(s,r){let c=(s-ot.x)**2+(r-ot.z)**2;return wo(s,r)-26*Math.exp(-c/(ot.r*ot.r))}function yo({lite:s,scale:r=1,vscale:c=r}){let e=r,l=c,o=Math.min(r,2.5),i=Math.min(r,1.6),f=new Ct,u=s?160:240,v=new Tt(ue,ue,u,u);v.rotateX(-Math.PI/2);let m=v.attributes.position,p=new Float32Array((u+1)*(u+1));for(let a=0;a<m.count;a++){let y=ko(m.getX(a),m.getZ(a));m.setY(a,y),p[a]=y}v.computeVertexNormals();let h=wo(ot.x,ot.z)-7,M=[[.64,.58,.34],[.25,.37,.16],[.42,.33,.22],[.44,.56,.27],[.55,.52,.3]],x=new Float32Array(m.count*3),T=new st,C=new st(.22,.37,.13),g=new st(.32,.46,.17),k=new st(.42,.39,.35),V=new st(.92,.94,.96),z=new st(.62,.57,.44),b=v.attributes.normal;for(let a=0;a<m.count;a++){let y=m.getX(a),A=m.getZ(a),L=m.getY(a);T.copy(C).lerp(g,xe(y/90,A/90,3));let I=Ie(y,A),Q=Qt(Math.floor(y/160)+.5,Math.floor(A/160)+.5);I<1.5&&Q<.55*(1-xt(I,1,1.5))&&Math.abs(A)>80&&T.setRGB(...M[Math.floor(Qt(Math.floor(y/160),Math.floor(A/160)+9)*M.length)]),Math.abs(A)<70&&Math.abs(y-120)<300&&T.lerp(new st(.4,.53,.26),.6);let G=1-b.getY(a);T.lerp(k,xt(G,.12,.3)),T.lerp(V,xt(L,300,380)*(1-xt(G,.3,.5))),L<h+1.5&&Math.hypot(y-ot.x,A-ot.z)<ot.r*1.8&&T.lerp(z,.7),x.set([T.r,T.g,T.b],a*3)}v.setAttribute("color",new Ut(x,3));let E=document.createElement("canvas");E.width=E.height=256;let Y=E.getContext("2d");Y.fillStyle="#d8d8d8",Y.fillRect(0,0,256,256);for(let a=0;a<9e3;a++){let y=150+Math.random()*105;Y.fillStyle=`rgb(${y},${y},${y})`,Y.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3)}let J=new zt(E);J.wrapS=J.wrapT=we,J.colorSpace=Gt,J.anisotropy=s?2:8;let tt=v.attributes.uv;for(let a=0;a<tt.count;a++)tt.setXY(a,m.getX(a)/24,m.getZ(a)/24);let $=new K(v,new le({vertexColors:!0,map:J}));$.scale.set(e,l,e),$.receiveShadow=!0,f.add($);let rt=new K(new po(ot.r*2.2,48),new ft({color:2902622,roughness:.08,metalness:.2,transparent:!0,opacity:.88}));rt.rotation.x=-Math.PI/2,rt.position.set(ot.x*e,h*l,ot.z*e),rt.scale.set(e,e,1),f.add(rt);let kt=ue/u;function q(a,y){return l*lt(a/e,y/e)}function lt(a,y){let A=Mo((a+ue/2)/kt,0,u-1e-6),L=Mo((y+ue/2)/kt,0,u-1e-6),I=Math.floor(A),Q=Math.floor(L),G=A-I,it=L-Q,mt=p[Q*(u+1)+I],n=p[Q*(u+1)+I+1],R=p[(Q+1)*(u+1)+I],H=p[(Q+1)*(u+1)+I+1];return G+it<1?mt+(n-mt)*G+(R-mt)*it:H+(R-H)*(1-G)+(n-H)*(1-it)}let pt=25*e,gt=new Map,Vt=[],Zt=(a,y)=>`${Math.floor(a/pt)},${Math.floor(y/pt)}`;function At(a){let y=Zt(a.x,a.z);gt.has(y)||gt.set(y,[]),gt.get(y).push(a)}function w(a){for(let L of Vt)if(a.x>L.x0&&a.x<L.x1&&a.z>L.z0&&a.z<L.z1&&a.y<L.top)return L.name;let y=Math.floor(a.x/pt),A=Math.floor(a.z/pt);for(let L=-1;L<=1;L++)for(let I=-1;I<=1;I++){let Q=gt.get(`${y+L},${A+I}`);if(Q){for(let G of Q)if(a.y>G.y0&&a.y<G.top&&(a.x-G.x)**2+(a.z-G.z)**2<G.r*G.r)return G.name}}return null}let P=new le({color:7171176}),dt=(a,y,A,L)=>{let I=new K(new Tt(a*(a>200?e:o),y*o),P);I.rotation.x=-Math.PI/2,I.position.set(A*e,.02,L*o),I.receiveShadow=!0,f.add(I)};dt(300,7,120,-28),dt(8,22,20,-14),dt(8,22,220,-14),dt(110,34,120,-56);let ct=new ft({color:9080724,roughness:.6,metalness:.3}),Bt=new ft({color:5988455,roughness:.5,metalness:.4});for(let a of[90,150]){let y=new K(new _t(26*o,6*o,18*o),ct);y.position.set(a*e,3*o,-84*o);let A=new K(new ie(9*o,9*o,26*o,20,1,!1,0,Math.PI),Bt);A.rotation.z=Math.PI/2,A.position.set(a*e,6*o,-84*o),A.scale.set(.45,1,1),y.castShadow=A.castShadow=!0,Vt.push({name:"un hangar",x0:a*e-13*o,x1:a*e+13*o,z0:-93*o,z1:-75*o,top:10*o}),f.add(y,A)}let wt=new K(new ie(.06,.08,6,6),new ft({color:14540253}));wt.position.set(60*e,3*o,-22*o),wt.scale.setScalar(o),At({name:"el m\xE1stil de la manga",x:60*e,z:-22*o,y0:0,top:6.2*o,r:.2*o}),f.add(wt);let yt=new Ct;yt.position.set(60*e,5.9*o,-22*o),yt.scale.setScalar(o);let Ht=new ie(.35,.16,2.6,12,5,!0);Ht.rotateZ(-Math.PI/2),Ht.translate(1.3,0,0);let Xt=[],Yt=Ht.attributes.position;for(let a=0;a<Yt.count;a++){let y=Math.floor(Yt.getX(a)/.52)%2;Xt.push(...y?[.95,.95,.95]:[1,.45,.12])}Ht.setAttribute("color",new ao(Xt,3));let fe=new K(Ht,new ft({vertexColors:!0,side:Qe,roughness:.8}));yt.add(fe),f.add(yt);let Nt=0;function nt(a,y=1/60){let A=Math.hypot(a.x,a.z);Nt+=y,yt.rotation.y=Math.atan2(-a.z,a.x)+Math.sin(Nt*3.1)*.05,yt.rotation.z=-(1-xt(A,.5,7))*1.2+Math.sin(Nt*4.3)*.03}let Ft=s?700:2200,pe=new ie(.25,.4,3,5);pe.translate(0,1.5,0);let t=new Eo(2.4,8,7);t.translate(0,6.5,0);let at=new mo(3,0);at.translate(0,5,0);let qt=new le({flatShading:!0}),Dt=new Te(pe,new le({color:4863526}),Ft),ut=new Te(t,qt,Ft),Pt=new Te(at,qt,Ft),Lt=new ye,Jt=new ce,te=new d,ee=new d,$t=0,Rt=0,Et=0,Ee=0,et=new st;for(;$t<Ft&&Ee++<Ft*40;){let a=Kt.x+(Math.random()*2-1)*3e3,y=Kt.z+(Math.random()*2-1)*2600,A=Ie(a,y);if(Math.abs(y)<110&&Math.abs(a-120)<360||Math.hypot(a-ot.x,y-ot.z)<ot.r*1.1||xe(a/400+31,y/400+17,3)<(A<1?.56:.44)&&Math.random()>.04)continue;let I=lt(a,y);if(I>330||I<h+1)continue;let Q=I*l,G=I>60||A>1.2&&Math.random()<.7,it=(.7+Math.random()*.8)*i,mt=it*(.9+Math.random()*.4);Jt.setFromAxisAngle(new d(0,1,0),Math.random()*Math.PI*2),Lt.compose(ee.set(a*e,Q-.3,y*e),Jt,te.set(it,mt,it)),At({name:"un \xE1rbol",x:a*e,z:y*e,y0:Q-.3,top:Q-.3+(G?10.5:8)*mt,r:(G?1.5:2.3)*it}),Dt.setMatrixAt($t++,Lt),et.setHSL(G?.3+Math.random()*.04:.22+Math.random()*.08,.45,G?.16+Math.random()*.06:.22+Math.random()*.08),G?(ut.setMatrixAt(Rt,Lt),ut.setColorAt(Rt++,et)):(Pt.setMatrixAt(Et,Lt),Pt.setColorAt(Et++,et))}Dt.count=$t,ut.count=Rt,Pt.count=Et;for(let a of[Dt,ut,Pt])a.castShadow=!s,a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0),f.add(a);return{group:f,heightAt:q,setWind:nt,hit:w,scale:e,side:o}}var Vo=1.225,He=9.81,Ao={m:7.2,S:.34,b:1.34,c:.28,I:new d(.28,.85,.62)},Fo={a:4.6,z:0,flap:.55,de:.35,stall:F.degToRad(15)},Po={z:.028,k:.065,flap:.05,gear:.018},Lo={z:0,a:-.9,q:-14,de:-1.15,flap:-.06},Io={b:-.08,p:-.48,da:.2,r:.08},Go={b:.13,r:-.18,dr:-.09},Uo=[{p:new d(.6,-.18,0),steer:!0},{p:new d(-.04,-.18,.238)},{p:new d(-.04,-.18,-.238)}],Bo=[[.78,0,0],[-.8,.05,0],[-.68,.32,0],[-.12,.02,.67],[-.12,.02,-.67],[.2,.1,0]].map(s=>new d(...s)),qo=[[.5,-.06,0],[-.3,-.06,0],[-.04,-.07,.24],[-.04,-.07,-.24]].map(s=>({p:new d(...s)})),Do={AC:Ao,CL:Fo,CD:Po,CM:Lo,CR:Io,CN:Go,WHEELS:Uo,SKIN:Bo,BELLY:qo,world:1,size:1,vref:22,ground:.185,eye:[.486,.09],tips:[new d(-.12,.02,.67),new d(-.12,.02,-.67)]};function Yo({model:s,parts:r,S:c,m:e,AR:l,e:o,cd0:i,vref:f,eye:u,canopy:v=[],thrust:m,hud:p,world:h=10}){let M=Math.sqrt(l*c),x=c/M;s.updateMatrixWorld(!0);let T=s.matrixWorld.clone().invert(),C=w=>new oo().setFromObject(w).applyMatrix4(T),g=C(s),k=g.max.x-g.min.x,z=r.filter(w=>/tren|gear|rueda|wheel/i.test(w.data.part+" "+(w.data.label??""))).map(w=>C(w.obj)).filter(w=>isFinite(w.min.y)).map(w=>({p:new d((w.min.x+w.max.x)/2,w.min.y,(w.min.z+w.max.z)/2)}));if(z.length<3){let w=g.min.y;z=[{p:new d(g.min.x+.78*k,w,0)},{p:new d(g.min.x+.38*k,w,.12*M)},{p:new d(g.min.x+.38*k,w,-.12*M)}]}z.sort((w,P)=>P.p.x-w.p.x),z[0].steer=!0;let b=z.slice(1).reduce((w,P)=>w+P.p.x,0)/(z.length-1),E=new d(b+.1*(z[0].p.x-b),(g.min.y+g.max.y)/2,0);for(let w of z)w.p.sub(E);let Y=Math.min(...z.map(w=>w.p.y)),J=-Y+.02,tt=new d,$=new d,rt=-1/0,kt=1/0,q=new d;s.traverse(w=>{if(!w.isMesh)return;let P=w.geometry.attributes.position,dt=T.clone().multiply(w.matrixWorld);for(let ct=0;ct<P.count;ct+=7)q.fromBufferAttribute(P,ct).applyMatrix4(dt),q.z>rt&&(rt=q.z,tt.copy(q)),q.z<kt&&(kt=q.z,$.copy(q))});let lt=new Set;for(let w of v)w.traverse(P=>lt.add(P));let pt=-1/0;s.traverse(w=>{if(!w.isMesh||lt.has(w))return;let P=w.geometry.attributes.position,dt=T.clone().multiply(w.matrixWorld);for(let ct=0;ct<P.count;ct+=3)q.fromBufferAttribute(P,ct).applyMatrix4(dt),Math.abs(q.x-u[0])<.4&&Math.abs(q.z)<.35&&q.y>pt&&(pt=q.y)});let gt=Math.max(u[1],pt+.15);tt.sub(E),$.sub(E),g.min.sub(E),g.max.sub(E);let Vt=[new d(g.max.x,(g.min.y+g.max.y)/2-.1*(g.max.y-g.min.y),0),new d(g.min.x,Y+.35*(g.max.y-Y),0),new d(g.min.x+.1*k,g.max.y,0),tt.clone(),$.clone()],Zt=[[.75,0],[.3,0],[.45,.25],[.45,-.25]].map(([w,P])=>({p:new d(g.min.x+w*k,Y+.15*(g.max.y-Y),P*M*.5)})),At=2*Math.PI*l/(2+Math.sqrt(l*l+4));return{AC:{m:e,S:c,b:M,c:x,I:new d(e*(.22*M)**2,e*(.32*k)**2,e*(.3*k)**2)},CL:{a:At,z:.02,flap:.35,de:.3,stall:F.degToRad(l<3?24:16)},CD:{z:i,k:1/(Math.PI*o*l),flap:.04,gear:.015},CM:{z:0,a:-.55,q:-10,de:-.8,flap:-.04},CR:{b:-.06,p:-.4,da:.12,r:.06},CN:{b:.1,r:-.15,dr:-.07},WHEELS:z,SKIN:Vt,BELLY:Zt,world:h,size:k/1.6,vref:f,ground:J,eye:[u[0]-E.x,gt-E.y],canopy:v,tips:[tt,$],thrust:m,hud:p,fixedGear:!0,cg:E}}function No({scene:s,renderer:r,camera:c,model:e,op:l,motor:o,lite:i,setGear:f,setSurfaces:u,gearState:v,pad:m,airframe:p=Do}){let{AC:h,CL:M,CD:x,CM:T,CR:C,CN:g,WHEELS:k,SKIN:V,BELLY:z}=p,b=p.world,E=p.size,Y=p.vref,J=Y/22,tt=h.m/7.2,$=new Ct;$.visible=!1,s.add($);let rt=null;function kt(){rt=yo({lite:i,scale:b,vscale:b>1?3:1}),$.add(rt.group);let n=document.createElement("canvas");n.width=256,n.height=4096;let R=n.getContext("2d");R.fillStyle="#2b2c2e",R.fillRect(0,0,256,4096);for(let U=0;U<4e3;U++)R.fillStyle=`rgba(255,255,255,${Math.random()*.04})`,R.fillRect(Math.random()*256,Math.random()*4096,2,2);R.fillStyle="#e8e6e0";for(let U=300;U<3800;U+=160)R.fillRect(124,U,8,80);R.fillRect(8,0,6,4096),R.fillRect(242,0,6,4096);for(let U=0;U<8;U++)R.fillRect(24+U*26,60,14,160),R.fillRect(24+U*26,3876,14,160);let H=new zt(n);H.colorSpace=Gt,H.anisotropy=i?2:8;let S=new K(new Tt(14*rt.side*(b>1?1.3:1),320*b),new ft({map:H,roughness:.85}));return S.rotation.x=-Math.PI/2,S.rotation.z=Math.PI/2,S.position.set(120*b,.03,0),S.receiveShadow=!0,$.add(S),rt}let q=()=>rt??kt(),lt=new de;lt.scale.setScalar(1e4);let pt=new d().setFromSphericalCoords(1,F.degToRad(60),F.degToRad(160));Object.assign(lt.material.uniforms.sunPosition.value,pt),lt.material.uniforms.turbidity.value=4,lt.material.uniforms.rayleigh.value=1.4;let gt=new lo;gt.add(lt);let Vt=null;function Zt(){let n=new co(i?256:512,{type:Je});return new so(1,2e4,n).update(r,gt),n.texture}let At=null,w=new Ct;$.add(w);let P=70,dt=p.tips,ct=dt.map(()=>{let n=new Pe;n.setAttribute("position",new Ut(new Float32Array(P*3),3)),n.setAttribute("color",new Ut(new Float32Array(P*4),4));let R=new ho(n,new Le({vertexColors:!0,transparent:!0,depthWrite:!1}));return R.frustumCulled=!1,w.add(R),{geo:n,n:0}}),Bt=i?70:160,wt=new Pe,yt=new Float32Array(Bt*6),Ht=new Float32Array(Bt*8);wt.setAttribute("position",new Ut(yt,3)),wt.setAttribute("color",new Ut(Ht,4));let Xt=new fo(wt,new Le({vertexColors:!0,transparent:!0,depthWrite:!1}));Xt.frustumCulled=!1,w.add(Xt);let Yt=Array.from({length:Bt},()=>({p:new d,seed:Math.random()}));function fe(n,R){let H=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0).applyQuaternion(t.q),S=new d(0,1,0).cross(H).normalize(),U=H.clone().cross(S).normalize(),vt=(.5+Math.random()*2.2)*E,Z=Math.random()*Math.PI*2;n.p.copy(t.p).addScaledVector(H,(R?6+Math.random()*10:(Math.random()-.3)*16)*E).addScaledVector(S,Math.cos(Z)*vt).addScaledVector(U,Math.sin(Z)*vt*.7)}function Nt(n,R){let H=F.smoothstep(R.V,6*J,30*J),S=R.onGround?0:H*F.clamp(.25+R.alpha*5,0,1);dt.forEach((Z,D)=>{let W=ct[D],X=W.geo.attributes.position.array,B=W.geo.attributes.color.array;X.copyWithin(3,0,(P-1)*3),B.copyWithin(4,0,(P-1)*4);let N=Z.clone().applyQuaternion(t.q).add(t.p);X.set([N.x,N.y,N.z],0),B.set([1,1,1,S*.75],0),W.n=Math.min(P,W.n+1);for(let O=0;O<P;O++)B[O*4+3]*=O===0?1:.985;for(let O=0;O<P;O++){let Wt=O*3;X[Wt]+=nt.x*n,X[Wt+1]+=(nt.y-.15)*n,X[Wt+2]+=nt.z*n}if(W.n<P)for(let O=W.n;O<P;O++)X.copyWithin(O*3,(W.n-1)*3,W.n*3),B[O*4+3]=0;W.geo.attributes.position.needsUpdate=W.geo.attributes.color.needsUpdate=!0});let U=nt.clone().sub(t.v),vt=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0);for(let Z=0;Z<Bt;Z++){let D=Yt[Z];D.p.addScaledVector(nt,n);let W=D.p.clone().sub(t.p);(W.dot(vt)<-10*E||W.length()>20*E)&&fe(D,!0);let X=1-F.smoothstep(D.p.distanceTo(t.p),1.5*E,9*E),B=H*X*(.25+.35*D.seed),N=D.p.clone().addScaledVector(U,-.05);yt.set([D.p.x,D.p.y,D.p.z,N.x,N.y,N.z],Z*6),Ht.set([.9,.95,1,B,.9,.95,1,0],Z*8)}wt.attributes.position.needsUpdate=wt.attributes.color.needsUpdate=!0}let nt=new d,Ft=new d(-1.6,0,.2);function pe(n,R){let H=.6+.4*Math.sin(n*.37)*Math.sin(n*.11+1.3),S=F.clamp(R/25,.1,1)*.55;nt.copy(Ft).multiplyScalar(H),nt.x+=S*(Math.sin(n*1.7)+.5*Math.sin(n*4.3+2)),nt.y+=S*.6*(Math.sin(n*2.1+.7)+.5*Math.sin(n*5.9)),nt.z+=S*(Math.sin(n*1.3+4)+.5*Math.sin(n*3.7+1))}let t={p:new d,v:new d,q:new ce,w:new d,throttle:0,roll:0,pitch:0,yaw:0,flap:.5,brake:0,gearUp:!1,crashed:!1,cam:"chase",t:0,assist:!0},at=new Set,qt={pos:e.position.clone(),quat:e.quaternion.clone()};function Dt(){t.p.set(b>1?-34*b:0,p.ground,0),t.v.set(0,0,0),t.q.identity(),t.w.set(0,0,0),t.throttle=0,t.flap=.5,t.gearUp=!1,t.onGround=!0,t.hold=0,t.bankHold=0,t.trim=0,t.crashed=!1,t.crashWhy="",v.target=0;for(let n of ct)n.n=0;for(let n of Yt)fe(n,!1)}let ut={gear(){!p.fixedGear&&t.p.y>1.5&&(t.gearUp=!t.gearUp,v.target=t.gearUp?1:0)},flap(){t.flap=t.flap>.6?0:t.flap+.5},cam(){t.cam=t.cam==="chase"?"cockpit":"chase"},reset:Dt,engine(){o.on=!o.on},assist(){t.assist=!t.assist}},Pt=n=>R=>{let H=R.key.toLowerCase();n&&!R.repeat&&(H==="g"&&ut.gear(),H==="f"&&ut.flap(),H==="c"&&ut.cam(),H==="r"&&ut.reset(),H==="e"&&ut.engine(),H==="t"&&ut.assist()),["w","s","a","d","q","e","shift","control","b","arrowup","arrowdown"," "].includes(H)&&R.preventDefault(),n?at.add(H):at.delete(H)},Lt=Pt(!0),Jt=Pt(!1),te=null,ee=()=>!!(m!=null&&m.touch),$t=new d;function Rt(n){t.crashed||(t.crashed=!0,t.crashWhy=n,t.v.set(0,0,0),t.w.set(0,0,0))}let Et=new d;function Ee(n){let R=(j,_)=>(at.has(j)?1:0)-(at.has(_)?1:0),H=j=>Math.max(-1,Math.min(1,j)),S=te;t.pitch+=(H(R("s","w")+((S==null?void 0:S.pitch)??0))-t.pitch)*Math.min(1,n*6),t.roll+=(H(R("d","a")+((S==null?void 0:S.roll)??0))-t.roll)*Math.min(1,n*7);let U=H(R("z","x")+((S==null?void 0:S.yaw)??0)),vt=new d(1,0,0).applyQuaternion(t.q),Z=Math.atan2(vt.z,vt.x),D=t.v.length();if(!t.onGround||Math.abs(U)>.02||D<1||D>25*J)t.hold=Z;else if(t.assist){let j=F.clamp(10*J/D,.4,1);U=F.clamp(Math.atan2(Math.sin(Z-t.hold),Math.cos(Z-t.hold))*6+t.w.y*.4,-j,j)}t.yaw+=(U-t.yaw)*Math.min(1,n*5),(at.has("shift")||at.has("arrowup"))&&(t.throttle=Math.min(1,t.throttle+n*.5)),(at.has("control")||at.has("arrowdown"))&&(t.throttle=Math.max(0,t.throttle-n*.5)),(S==null?void 0:S.throttle)!=null&&(t.throttle=S.throttle),S!=null&&S.throttleRate&&(t.throttle=Math.min(1,Math.max(0,t.throttle+S.throttleRate*n*.6))),t.brake=at.has("b")||at.has(" ")?1:0,o.target=t.throttle;let W=new ye().makeRotationFromQuaternion(t.q),X=W.clone().transpose();t.t+=n,pe(t.t,t.p.y),Et.copy(t.v).sub(nt).applyMatrix4(X);let B=Math.max(.01,Et.length()),N=Math.atan2(-Et.y,Et.x),O=Math.asin(F.clamp(Et.z/B,-1,1)),Wt=Vo*Math.pow(Math.max(.05,1-22558e-9*Math.max(0,t.p.y)),4.2559),bt=.5*Wt*B*B,De=p.thrust?p.thrust({V:B,h:t.p.y,rho:Wt}):o.on?l(o.f).thrust*o.spin:0,be=t.assist?F.clamp((Y/Math.max(B,1))**2,.22,1):1,$e=-t.pitch*F.degToRad(16)*be,Ro=t.roll*F.degToRad(20)*be,Se=-t.yaw*F.degToRad(22)*Math.max(be,.45),jt=t.flap*.8,To=1-v.t,me=M.z+M.a*N+M.flap*jt-M.de*$e*.1;Math.abs(N)>M.stall&&(me=Math.sign(N)*(M.a*M.stall)*Math.max(.35,1-(Math.abs(N)-M.stall)*3)+M.flap*jt*.5);let xo=x.z+x.k*me*me+x.flap*jt+x.gear*To+.4*Math.max(0,Math.abs(N)-M.stall),oe=new d;if(B>.5){let j=Et.clone().normalize(),_=new d(0,0,1).cross(j).normalize();oe.addScaledVector(_,bt*h.S*me),oe.addScaledVector(j,-bt*h.S*xo),oe.z+=-bt*h.S*.6*O}oe.x+=De;let We=t.w.x*h.b/(2*B),Ce=t.w.y*h.b/(2*B),ze=t.w.z*h.c/(2*B),Ho=h.m*He/Math.max(1,bt*h.S)-M.flap*jt;t.trim+=(-T.a*F.clamp(Ho/M.a,0,M.stall*.7)-T.flap*jt-t.trim)*Math.min(1,n*.8);let bo=t.onGround?0:t.trim,Ot=new d(bt*h.S*h.b*(C.b*O+C.p*We+C.da*Ro+C.r*Ce),bt*h.S*h.b*(g.b*-O+g.r*Ce+g.dr*Se),bt*h.S*h.c*(T.z+T.a*N+T.q*ze+T.de*$e+T.flap*jt+bo));if(t.assist&&B>8*J){let j=new d(0,0,1).applyQuaternion(t.q),_=Math.asin(F.clamp(-j.y,-1,1)),St=Math.asin(F.clamp(t.v.y/B,-1,1)),Mt=bt*h.S,ht=Math.abs(t.roll)>=.05;ht&&(t.bankHold=_);let ae=Math.abs(t.bankHold??0)<F.degToRad(12)?0:F.clamp(t.bankHold,-.79,.79);ht?Ot.x+=Mt*h.b*-.2*We:Ot.x+=h.I.x*6*(.8*(ae-_)-t.w.x);let It=h.m*He/Math.max(1,Mt*h.S)*(1/Math.max(.45,Math.cos(_))-1)/M.a;Ot.z+=Math.abs(t.pitch)<.05?Mt*h.c*(-.6*St-3*ze-T.a*It):Mt*h.c*-3*ze,Ot.z+=Mt*h.c*-2.5*Math.max(0,N-.8*M.stall);let se=-(He*Math.tan(F.clamp(_,-1.2,1.2)))/B*Math.cos(_)*h.b/(2*B);Ot.y+=Mt*h.b*(-.03*O-.5*(Ce-se))}let ke=oe.clone().applyMatrix4(W);ke.y-=h.m*He;let je=new d,ve=!1,ne=v.t<.05?k:z;for(let j of ne){let _=j.p.clone().applyQuaternion(t.q),St=_.clone().add(t.p),Mt=q().heightAt(St.x,St.z)-St.y;if(Mt<=0)continue;Mt>.3*E&&Rt("contra el terreno"),ve=!0;let ht=t.v.clone().add(new d().copy(t.w).applyQuaternion(t.q).cross(_)),ae=Math.max(0,1250*tt*7.2*Mt/E-36*tt*7.2*ht.y),re=new d(0,ae,0),It=new d(1,0,0).applyQuaternion(t.q).setY(0).normalize(),se=new d(0,1,0).cross(It),Co=ne===z?.5:.02+.5*t.brake,Oe=h.m/ne.length,Fe=ht.dot(It);re.addScaledVector(It,-Math.sign(Fe)*Math.min(Math.abs(Fe)*40*tt,Co*ae,.5*Oe*Math.abs(Fe)/n));let _e=j.steer?ht.dot(se)+It.dot(ht)*Se*.8:ht.dot(se),Ke=Math.min(.9*ae,.5*Oe*Math.abs(_e)/n+(j.steer?Math.abs(It.dot(ht)*Se)*400*tt:0));re.addScaledVector(se,-F.clamp(_e*400*tt,-Ke,Ke)),ke.add(re),je.add(_.clone().cross(re)),ne===z&&-ht.y>2.5&&Rt("aterrizaje de panza demasiado fuerte"),ne===k&&-ht.y>4&&Rt("aterrizaje demasiado fuerte, se rompi\xF3 el tren")}t.v.addScaledVector(ke,n/h.m),t.p.addScaledVector(t.v,n);for(let j of V){let _=$t.copy(j).applyQuaternion(t.q).add(t.p),St=q().hit(_);if(St){Rt(`choque contra ${St}`);break}if(q().heightAt(_.x,_.z)-_.y>.03*E){Rt(j.z?"una punta de ala toc\xF3 el suelo":j.x>0?"el morro contra el suelo":"la cola contra el suelo");break}}let Ve=Ot.add(je.applyMatrix4(X)),So=new d(h.I.x*t.w.x,h.I.y*t.w.y,h.I.z*t.w.z),Ae=t.w.clone().cross(So);t.w.x+=(Ve.x-Ae.x)/h.I.x*n,t.w.y+=(Ve.y-Ae.y)/h.I.y*n,t.w.z+=(Ve.z-Ae.z)/h.I.z*n,ve&&t.w.multiplyScalar(.995);let Me=t.q.clone().multiply(new ce(t.w.x*n*.5,t.w.y*n*.5,t.w.z*n*.5,0));return t.q.x+=Me.x,t.q.y+=Me.y,t.q.z+=Me.z,t.q.w+=Me.w,t.q.normalize(),u({roll:t.roll,pitch:t.pitch,yaw:t.yaw,flap:t.flap}),t.onGround=ve,{V:B,alpha:N,onGround:ve,thrust:De}}let et={V:0,alpha:0,onGround:!0,thrust:0},a=!1;function y(n,R){a=!0,te=R;for(let H=0;H<8;H++)et=Ee(n/8);return et}let A=new d(-3.4*E,.9*E,0);function L(n){if(t.crashed){G(`<b>Accidente</b> \xB7 ${t.crashWhy}<br>${ee()?"Reinicio":"R"} para volver a la pista`);return}if(!a){te=(m==null?void 0:m.read())??null;for(let X=0;X<8;X++)et=Ee(n/8)}Nt(n,et),q().setWind(nt,n),e.position.copy(t.p),p.cg&&e.position.sub($t.copy(p.cg).applyQuaternion(t.q)),e.quaternion.copy(t.q);let R=new d(1,0,0).applyQuaternion(t.q),H=new d(0,1,0).applyQuaternion(t.q);if(t.cam==="chase"){let X=(c.aspect<1?2.6:3.4)*E,B=R.clone().multiplyScalar(-X).add(new d(0,X*.27,0));A.lerp(B,Math.min(1,n*3)),c.position.copy(t.p).add(A),c.up.set(0,1,0),c.lookAt(t.p.clone().addScaledVector(R,2*E).add(new d(0,(ee()?-.8:-.5)*E,0)))}else c.position.copy(t.p).addScaledVector(R,p.eye[0]).addScaledVector(H,p.eye[1]),c.up.copy(H),c.lookAt(c.position.clone().addScaledVector(R,10*E).addScaledVector(H,-1.7*E));let S=t.cam==="chase"?null:70;S&&c.fov!==S&&(c.fov=S,c.updateProjectionMatrix()),!S&&t.cam!==L.cam&&it(),t.cam!==L.cam&&I(t.cam!=="cockpit"),L.cam=t.cam;let U=p.hud?null:l(o.f),vt=Math.max(0,t.p.y-q().heightAt(t.p.x,t.p.z)),Z=et.V*3.6,D=t.v.y,W=et.alpha>M.stall;if(innerWidth<560){G(`<b>${Z.toFixed(0)}</b> km/h \xB7 <b>${vt.toFixed(0)}</b> m \xB7 ${D>=0?"+":""}${D.toFixed(1)} m/s<br>`+(p.hud?p.hud(et,t,!0):o.on?`<b>${Math.round(U.n*o.spin/1e3)}k</b> rpm \xB7 ${et.thrust.toFixed(0)} N \xB7 gas ${(t.throttle*100).toFixed(0)} %`:"MW54 apagada \xB7 Motor para arrancar")+(W?"<br><b>P\xC9RDIDA</b> \xB7 baja el morro":t.brake?"<br>frenos":""));return}G(`<b>${Z.toFixed(0)}</b> km/h \xB7 <b>${vt.toFixed(1)}</b> m \xB7 ${D>=0?"+":""}${D.toFixed(1)} m/s \xB7 \u03B1 ${F.radToDeg(et.alpha).toFixed(0)}\xB0<br>`+(p.hud?p.hud(et,t,!1):`MW54 ${o.on?`<b>${Math.round(U.n*o.spin).toLocaleString("es-ES")}</b> rpm \xB7 ${et.thrust.toFixed(0)} N \xB7 EGT ${Math.round(15+(U.egt-15)*o.heat)} \xB0C`:`apagada (${ee()?"Motor":"E"} para arrancar)`} \xB7 gas ${(t.throttle*100).toFixed(0)} %`)+`<br>Viento ${nt.length().toFixed(1)} m/s \xB7 Tren ${v.t<.05?"abajo":v.t>.95?"arriba":"en tr\xE1nsito"} \xB7 flaps ${(t.flap*40).toFixed(0)}\xB0 \xB7 gir\xF3scopo ${t.assist?"s\xED":"no"}${t.brake?" \xB7 frenos":""}${W?" \xB7 <b>P\xC9RDIDA</b>":""}`)}function I(n){for(let R of p.canopy??[])R.visible=n}let Q="";function G(n){n!==Q&&(Q=n,document.getElementById("hud").innerHTML=n)}function it(){c.fov=F.clamp(F.radToDeg(2*Math.atan(Math.tan(F.degToRad(28))/c.aspect)),40,66),c.updateProjectionMatrix()}function mt(n,R=n){n&&q(),n&&!$.visible&&(Vt??=Zt(),At=s.background,s.background=Vt),!n&&$.visible&&(s.background=At),$.visible=n,w.visible=R;let H=Math.sqrt(b);s.fog=n?new io(11124692,900*H,(i?4500:6500)*H):null,c.up.set(0,1,0),c.near=n?.004*E:.01,c.far=n?12e3*b:50,n?it():(c.fov=32,c.updateProjectionMatrix())}return{enter(){mt(!0),Dt(),m==null||m.reset(0),addEventListener("keydown",Lt),addEventListener("keyup",Jt),A.set(-3.4*E,.9*E,0)},exit(){mt(!1),removeEventListener("keydown",Lt),removeEventListener("keyup",Jt),at.clear(),I(!0),L.cam=null,document.fullscreenElement&&document.exitFullscreen().catch(()=>{}),e.position.copy(qt.pos),e.quaternion.copy(qt.quat)},update:L,simulate:y,endTest(){a=!1},fit:it,showWorld:mt,home:qt,get terrain(){return q()},airframe:p,state:t}}var Ue=4;function Be(s){let r=(i,f)=>{let u=new Float32Array(i*i),v=f;for(let m=0;m<u.length;m++)v=v*1664525+1013904223>>>0,u[m]=v/4294967296;return(m,p)=>{let h=m*i,M=p*i,x=Math.floor(h),T=Math.floor(M),C=h-x,g=M-T;C=C*C*(3-2*C),g=g*g*(3-2*g);let k=(V,z)=>u[(z%i+i)%i*i+(V%i+i)%i];return(k(x,T)*(1-C)+k(x+1,T)*C)*(1-g)+(k(x,T+1)*(1-C)+k(x+1,T+1)*C)*g}},c=[[5,.25],[12,.25],[30,.2],[80,.15],[200,.15]].map(([i,f],u)=>[r(i,7+u*31),f]),e=[r(3,101),r(11,202)],l=new Uint8ClampedArray(s*s*4),o=new Uint8ClampedArray(s*s*4);for(let i=0;i<s;i++)for(let f=0;f<s;f++){let u=f/s,v=i/s,m=0;for(let[g,k]of c)m+=g(u,v)*k;let p=Math.random(),h=p>.985?.12*Math.random():p<.01?-.16*Math.random():(Math.random()-.5)*.04,M=36+(m-.5)*12+h*110,x=(i*s+f)*4;l[x]=M,l[x+1]=M+2,l[x+2]=M+5,l[x+3]=255;let C=160+(.5*e[0](u,v)+.5*e[1](u,v)-.5)*60+Math.abs(h)*300;o[x]=o[x+1]=o[x+2]=C,o[x+3]=255}return{c:l,r:o}}function $o(s,r){let c=[["#24262a"],["#a0a0a0"]].map(([o])=>{let i=document.createElement("canvas");i.width=i.height=r;let f=i.getContext("2d");return f.fillStyle=o,f.fillRect(0,0,r,r),i}),e=c.map(o=>{let i=new zt(o);return i.wrapS=i.wrapT=we,i.anisotropy=s.capabilities.getMaxAnisotropy(),i});e[0].colorSpace=Gt;let l=({c:o,r:i})=>{[o,i].forEach((f,u)=>{c[u].getContext("2d").putImageData(new ImageData(f,r,r),0,0),e[u].needsUpdate=!0})};try{let o=`onmessage = (e) => { const o = (${Be})(e.data); postMessage(o, [o.c.buffer, o.r.buffer]); close(); };`,i=URL.createObjectURL(new Blob([o],{type:"text/javascript"})),f=new Worker(i);f.onmessage=u=>{l(u.data),URL.revokeObjectURL(i)},f.onerror=u=>{u.preventDefault(),URL.revokeObjectURL(i),l(Be(r))},f.postMessage(r)}catch{l(Be(r))}return e}function Wo(s,r,c){s.onBeforeCompile=e=>{e.uniforms.uFade={value:new eo(r,c)},e.uniforms.uBg={value:new st(855826)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;
uniform vec2 uFade;
uniform vec3 uBg;`).replace("#include <tonemapping_fragment>",`gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));
#include <tonemapping_fragment>`)}}function jo(s,{W:r,D:c,box:e,dash:l,stops:o,stop:i}){let f=Math.min(512,2600/r),u=document.createElement("canvas");u.width=r*f,u.height=c*f;let v=u.getContext("2d"),m=V=>(V+r/2)*f,p=V=>(V+c/2)*f,h="#d9a93a";v.fillStyle=h;for(let[V,z]of[[e.x0,1],[e.x1,-1]])for(let[b,E]of[[e.z0,1],[e.z1,-1]])v.fillRect(Math.min(m(V),m(V+z*e.arm)),Math.min(p(b),p(b+E*e.w)),e.arm*f,e.w*f),v.fillRect(Math.min(m(V),m(V+z*e.w)),Math.min(p(b),p(b+E*e.arm)),e.w*f,e.arm*f);let[M,x,T]=l;for(let V=e.x0+x/2;V<e.x1-1.5*x;V+=x)v.fillRect(m(V),p(-T/2),M*f,T*f);let C=x*.7;v.beginPath(),v.moveTo(m(e.x1-C*.3),p(0)),v.lineTo(m(e.x1-C),p(-C*.28)),v.lineTo(m(e.x1-C),p(C*.28)),v.closePath(),v.fill(),v.fillStyle="#e6e2d6";for(let[V,z]of o)v.fillRect(m(V-i[0]*2.3),p(z-i[1]/2),i[0]*f,i[1]*f);v.globalCompositeOperation="destination-out";for(let V=0;V<14e3;V++)v.fillStyle=`rgba(0,0,0,${Math.random()*.6})`,v.fillRect(Math.random()*u.width,Math.random()*u.height,1+Math.random(),1+Math.random());let g=new zt(u);g.colorSpace=Gt,g.anisotropy=s.capabilities.getMaxAnisotropy();let k=new K(new Tt(r,c),new ft({map:g,transparent:!0,roughness:.5,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));return k.rotation.x=-Math.PI/2,k.receiveShadow=!0,k}function Oo({w:s,d:r,x:c}){let e=document.createElement("canvas");e.width=e.height=256;let l=e.getContext("2d"),o=l.createRadialGradient(128,128,0,128,128,128);o.addColorStop(0,"rgba(0,0,0,0.55)"),o.addColorStop(.5,"rgba(0,0,0,0.22)"),o.addColorStop(1,"rgba(0,0,0,0)"),l.fillStyle=o,l.fillRect(0,0,256,256);let i=new K(new Tt(s,r),new no({map:new zt(e),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return i.rotation.x=-Math.PI/2,i.position.x=c,i}function tn(s,{y:r,fade:c,stand:e,ao:l,res:o=2048}){let[i,f]=$o(s,o),u=Math.ceil(c[1]*2.2/Ue);for(let h of[i,f])h.repeat.set(u,u);let v=new ft({map:i,roughnessMap:f,roughness:.7,metalness:0,envMapIntensity:.35});Wo(v,c[0],c[1]);let m=new Ct,p=new K(new Tt(Ue*u,Ue*u),v);return p.rotation.x=-Math.PI/2,p.receiveShadow=!0,m.add(p,jo(s,e),Oo(l)),m.position.y=r,m}var he=64;function qe(s,r){for(let l=0;l<s.length-1;l++){let[o,i,f]=s[l],[u,v,m]=s[l+1];if(r<=u){let p=(r-o)/Math.max(1e-6,u-o),h=f+(m-f)*p;return i.map((M,x)=>(M+(v[x]-M)*p)*h)}}let[,c,e]=s[s.length-1];return c.map(l=>l*e)}function on(s,r,{steps:c=40}={}){var m,p,h;let e=new Float32Array(he*2*4),l=new uo(e,he,2,to,Ne);l.magFilter=l.minFilter=Ye,l.wrapS=l.wrapT=Xe;let o={uTime:{value:0},uIntensity:{value:0},uReach:{value:1},uDiamond:{value:0},uSpacing:{value:((m=r.diamonds)==null?void 0:m.spacing)??.1},uCount:{value:((p=r.diamonds)==null?void 0:p.count)??6},uDiaColor:{value:new st(...((h=r.diamonds)==null?void 0:h.color)??[1,.85,.6])},uGrad:{value:l},uTurb:{value:r.turbulence??1}},i=new Re({uniforms:o,transparent:!0,depthWrite:!1,blending:Ze,side:ge,defines:{STEPS:c},vertexShader:`
      varying vec3 vLocal; varying vec3 vCam;
      void main(){
        vLocal = position;
        vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.)).xyz;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);
      }`,fragmentShader:`
      uniform float uTime, uIntensity, uReach, uDiamond, uSpacing, uCount, uTurb;
      uniform vec3 uDiaColor; uniform sampler2D uGrad;
      varying vec3 vLocal; varying vec3 vCam;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      vec2 box(vec3 ro, vec3 rd){
        vec3 inv = 1. / rd; vec3 t0 = (vec3(-1., -1., -1.) - ro) * inv; vec3 t1 = (vec3(0., 1., 1.) - ro) * inv;
        vec3 tmin = min(t0, t1), tmax = max(t0, t1);
        return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
      }
      void main(){
        vec3 ro = vCam; vec3 rd = normalize(vLocal - vCam);
        vec2 t = box(ro, rd);
        t.x = max(t.x, 0.);
        if (t.y <= t.x) discard;
        float dt = (t.y - t.x) / float(STEPS);
        vec3 acc = vec3(0.);
        // tramado fijo por p\xEDxel (ruido de gradiente entrelazado): reparte los pasos sin cambiar de un cuadro al otro, as\xED
        // el volumen se ve continuo; un desfase aleatorio nuevo en cada cuadro hac\xEDa hervir la llama como chispas
        float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) * dt;
        for (int i = 0; i < STEPS; i++){
          vec3 p = ro + rd * (t.x + jitter + dt * float(i));
          float u = clamp(-p.x, 0., 1.);
          float rho = length(p.yz);
          // envolvente: sale con el ancho de la tobera, se abre y se deshace al final
          float R = mix(.62, 1., smoothstep(0., .8, u));
          float Rc = .5 * (1. - .45 * u);
          float turb = mix(1., .55 + .9 * n3(vec3(u * 16. - uTime * 9., p.y * 4., p.z * 4.)), uTurb * smoothstep(.05, .6, u));
          float body = (1. - smoothstep(Rc * .25, R, rho)) * turb;
          float fade = 1. - smoothstep(.45 * uReach, uReach, u);
          vec3 core = texture2D(uGrad, vec2(u, .25)).rgb;
          vec3 edge = texture2D(uGrad, vec2(u, .75)).rgb;
          vec3 col = mix(core, edge, smoothstep(Rc * .35, R, rho)) * body;
          // diamantes de choque: en cada celda, un rombo (ondas oblicuas) con un nudo brillante en el centro
          float cell = (u - .04) / uSpacing;
          float k = floor(cell);
          float d = fract(cell);
          float alive = step(0., cell) * (1. - smoothstep(uCount - 1.5, uCount, k));
          float wk = 1. - k / uCount;
          float Rd = Rc * .95;
          float diamond = 1. - smoothstep(.75, 1., rho / Rd + abs(2. * d - 1.));
          float knot = exp(-pow((d - .5) * 5., 2.)) * exp(-pow(rho / (Rd * .45), 2.));
          vec3 dia = uDiaColor * (diamond * .6 + knot * 3.2) * wk * alive;
          float gap = 1. - uDiamond * .45 * smoothstep(.06, .12, u) * (1. - diamond);
          acc += (col * gap + dia * uDiamond) * fade * dt;
        }
        gl_FragColor = vec4(acc * uIntensity, 1.);
      }`}),f=[],u={};function v(M){let x=Object.keys(r.modes);for(let T=0;T<2;T++)for(let C=0;C<he;C++){let g=C/(he-1),k=[0,0,0];for(let V of x){if(!M[V])continue;let z=qe(r.modes[V][T?"edge":"core"],g);for(let b=0;b<3;b++)k[b]+=z[b]*M[V]}e.set([k[0],k[1],k[2],1],(T*he+C)*4)}l.needsUpdate=!0}return{add(M,x,{length:T,r:C,h:g=1,w:k=1,light:V=!0}){let z=new _t(1,2,2);z.translate(-.5,0,0);let b=new K(z,i);b.position.copy(x),b.scale.set(T,C*g,C*k),b.frustumCulled=!1,b.userData.noAO=!0,b.visible=!1,M.add(b);let E=null;return V&&r.light&&(E=new vo(16755302,0,r.light.distance,2),E.position.copy(x).add(new d(-T*.12,0,0)),M.add(E)),f.push({mesh:b,lamp:E}),b},update({w:M,level:x,optimal:T,reach:C=1,time:g,visible:k}){Object.keys(M).some(E=>Math.abs((u[E]??0)-M[E])>.01)&&(u={...M},v(u)),o.uTime.value=g,o.uIntensity.value=x*(r.brightness??1),o.uDiamond.value=T,o.uReach.value=C;let V=qe(Object.values(r.modes)[0].core,.1),z=[0,0,0];for(let[E,Y]of Object.entries(u)){if(!Y)continue;let J=qe(r.modes[E].core,.15);z=z.map((tt,$)=>tt+J[$]*Y)}let b=Math.max(...z,.001);for(let E of f)E.mesh.visible=k&&x>.01,E.lamp&&(E.lamp.visible=E.mesh.visible,E.lamp.color.setRGB(z[0]/b,z[1]/b,z[2]/b),E.lamp.intensity=r.light.intensity*x*Math.min(1,b/2)*(.92+.08*Math.sin(g*37+V[0])))}}}export{Yo as a,No as b,tn as c,on as d};
