import{B as eo,Ba as be,Da as Ue,Ea as mo,F as oo,Fa as vo,G as no,I as ao,Ja as Vt,La as Mo,Ma as le,Na as go,Pa as yo,Q as Lt,Qa as gt,T as A,Ta as pt,U as ro,V as ce,W as d,Wa as ue,_ as so,ba as xe,da as ct,e as Re,f as Ne,fa as io,gb as wo,h as Je,ha as Gt,ia as co,ja as Be,ka as _,la as Zt,ma as lo,na as He,pa as uo,qa as ho,qb as Ro,ra as kt,sa as fo,ta as po,v as Te,w as to,ya as Eo}from"./chunk-UZSR6Q5S.js";var de=class r extends _{constructor(){let s=r.SkyShader,i=new He({name:s.name,uniforms:lo.clone(s.uniforms),vertexShader:s.vertexShader,fragmentShader:s.fragmentShader,side:Re,depthWrite:!1});super(new Zt(1,1,1),i),this.isSky=!0}};de.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new d},up:{value:new d(0,1,0)}},vertexShader:`
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

		}`};var{smoothstep:yt,clamp:To}=A,he=12e3,Xt={x:120,z:60,rx:750,rz:600},nt={x:-480,z:680,r:170},Yt=(r,s)=>{let i=Math.sin(r*127.1+s*311.7)*43758.5453;return i-Math.floor(i)};function xo(r,s){let i=Math.floor(r),e=Math.floor(s),u=r-i,o=s-e;u=u*u*(3-2*u),o=o*o*(3-2*o);let l=Yt(i,e),f=Yt(i+1,e),h=Yt(i,e+1),v=Yt(i+1,e+1);return l+(f-l)*u+(h-l)*o+(l-f-h+v)*u*o}function Se(r,s,i=5){let e=0,u=.5;for(let o=0;o<i;o++)e+=u*xo(r,s),r*=2.03,s*=2.03,u*=.5;return e}var Fo=(r,s)=>{let i=0,e=.5;for(let u=0;u<5;u++)i+=e*(1-Math.abs(xo(r,s)*2-1))**2,r*=2.1,s*=2.1,e*=.5;return i},qe=(r,s)=>Math.hypot((r-Xt.x)/Xt.rx,(s-Xt.z)/Xt.rz);function Ho(r,s){let i=qe(r,s),e=Math.max(yt(Math.abs(s),70,140),yt(Math.abs(r-120),260,340)),u=(Se(r/260,s/260,3)-.5)*3*e;return u+=yt(i,1,1.7)*(Se(r/520+7,s/520+3)*110-15),u+=yt(i,2.1,3.4)*Fo(r/1400,s/1400)*520,u}function Io(r,s){let i=(r-nt.x)**2+(s-nt.z)**2;return Ho(r,s)-26*Math.exp(-i/(nt.r*nt.r))}function bo({lite:r,scale:s=1,vscale:i=s}){let e=s,u=i,o=Math.min(s,2.5),l=Math.min(s,1.6),f=new kt,h=r?160:240,v=new gt(he,he,h,h);v.rotateX(-Math.PI/2);let m=v.attributes.position,p=new Float32Array((h+1)*(h+1));for(let n=0;n<m.count;n++){let M=Io(m.getX(n),m.getZ(n));m.setY(n,M),p[n]=M}v.computeVertexNormals();let U=Ho(nt.x,nt.z)-7,c=[[.64,.58,.34],[.25,.37,.16],[.42,.33,.22],[.44,.56,.27],[.55,.52,.3]],E=new Float32Array(m.count*3),x=new ct,R=new ct(.22,.37,.13),g=new ct(.32,.46,.17),S=new ct(.42,.39,.35),C=new ct(.92,.94,.96),z=new ct(.62,.57,.44),V=v.attributes.normal;for(let n=0;n<m.count;n++){let M=m.getX(n),F=m.getZ(n),P=m.getY(n);x.copy(R).lerp(g,Se(M/90,F/90,3));let I=qe(M,F),J=Yt(Math.floor(M/160)+.5,Math.floor(F/160)+.5);I<1.5&&J<.55*(1-yt(I,1,1.5))&&Math.abs(F)>80&&x.setRGB(...c[Math.floor(Yt(Math.floor(M/160),Math.floor(F/160)+9)*c.length)]),Math.abs(F)<70&&Math.abs(M-120)<300&&x.lerp(new ct(.4,.53,.26),.6);let L=1-V.getY(n);x.lerp(S,yt(L,.12,.3)),x.lerp(C,yt(P,300,380)*(1-yt(L,.3,.5))),P<U+1.5&&Math.hypot(M-nt.x,F-nt.z)<nt.r*1.8&&x.lerp(z,.7),E.set([x.r,x.g,x.b],n*3)}v.setAttribute("color",new Gt(E,3));let y=document.createElement("canvas");y.width=y.height=256;let k=y.getContext("2d");k.fillStyle="#d8d8d8",k.fillRect(0,0,256,256);for(let n=0;n<9e3;n++){let M=150+Math.random()*105;k.fillStyle=`rgb(${M},${M},${M})`,k.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3)}let lt=new Vt(y);lt.wrapS=lt.wrapT=Te,lt.colorSpace=Lt,lt.anisotropy=r?2:8;let et=v.attributes.uv;for(let n=0;n<et.count;n++)et.setXY(n,m.getX(n)/24,m.getZ(n)/24);let Z=new _(v,new ue({vertexColors:!0,map:lt}));Z.scale.set(e,u,e),Z.receiveShadow=!0,f.add(Z);let X=new _(new Mo(nt.r*2.2,48),new pt({color:2902622,roughness:.08,metalness:.2,transparent:!0,opacity:.88}));X.rotation.x=-Math.PI/2,X.position.set(nt.x*e,U*u,nt.z*e),X.scale.set(e,e,1),f.add(X);let dt=he/h;function Y(n,M){return u*st(n/e,M/e)}function st(n,M){let F=To((n+he/2)/dt,0,h-1e-6),P=To((M+he/2)/dt,0,h-1e-6),I=Math.floor(F),J=Math.floor(P),L=F-I,rt=P-J,Mt=p[J*(h+1)+I],oe=p[J*(h+1)+I+1],Ot=p[(J+1)*(h+1)+I],Ft=p[(J+1)*(h+1)+I+1];return L+rt<1?Mt+(oe-Mt)*L+(Ot-Mt)*rt:Ft+(Ot-Ft)*(1-L)+(oe-Ft)*(1-rt)}let at=25*e,wt=new Map,Rt=[],Bt=(n,M)=>`${Math.floor(n/at)},${Math.floor(M/at)}`;function Ut(n){let M=Bt(n.x,n.z);wt.has(M)||wt.set(M,[]),wt.get(M).push(n)}function w(n){for(let P of Rt)if(n.x>P.x0&&n.x<P.x1&&n.z>P.z0&&n.z<P.z1&&n.y<P.top)return P.name;let M=Math.floor(n.x/at),F=Math.floor(n.z/at);for(let P=-1;P<=1;P++)for(let I=-1;I<=1;I++){let J=wt.get(`${M+P},${F+I}`);if(J){for(let L of J)if(n.y>L.y0&&n.y<L.top&&(n.x-L.x)**2+(n.z-L.z)**2<L.r*L.r)return L.name}}return null}let W=new ue({color:7171176}),ht=(n,M,F,P)=>{let I=new _(new gt(n*(n>200?e:o),M*o),W);I.rotation.x=-Math.PI/2,I.position.set(F*e,.02,P*o),I.receiveShadow=!0,f.add(I)};ht(300,7,120,-28),ht(8,22,20,-14),ht(8,22,220,-14),ht(110,34,120,-56);let ut=new pt({color:9080724,roughness:.6,metalness:.3}),qt=new pt({color:5988455,roughness:.5,metalness:.4});for(let n of[90,150]){let M=new _(new Zt(26*o,6*o,18*o),ut);M.position.set(n*e,3*o,-84*o);let F=new _(new le(9*o,9*o,26*o,20,1,!1,0,Math.PI),qt);F.rotation.z=Math.PI/2,F.position.set(n*e,6*o,-84*o),F.scale.set(.45,1,1),M.castShadow=F.castShadow=!0,Rt.push({name:"un hangar",x0:n*e-13*o,x1:n*e+13*o,z0:-93*o,z1:-75*o,top:10*o}),f.add(M,F)}let it=new _(new le(.06,.08,6,6),new pt({color:14540253}));it.position.set(60*e,3*o,-22*o),it.scale.setScalar(o),Ut({name:"el m\xE1stil de la manga",x:60*e,z:-22*o,y0:0,top:6.2*o,r:.2*o}),f.add(it);let vt=new kt;vt.position.set(60*e,5.9*o,-22*o),vt.scale.setScalar(o);let Tt=new le(.35,.16,2.6,12,5,!0);Tt.rotateZ(-Math.PI/2),Tt.translate(1.3,0,0);let Pt=[],xt=Tt.attributes.position;for(let n=0;n<xt.count;n++){let M=Math.floor(xt.getX(n)/.52)%2;Pt.push(...M?[.95,.95,.95]:[1,.45,.12])}Tt.setAttribute("color",new co(Pt,3));let pe=new _(Tt,new pt({vertexColors:!0,side:Ne,roughness:.8}));vt.add(pe),f.add(vt);let Dt=0;function Ee(n,M=1/60){let F=Math.hypot(n.x,n.z);Dt+=M,vt.rotation.y=Math.atan2(-n.z,n.x)+Math.sin(Dt*3.1)*.05,vt.rotation.z=-(1-yt(F,.5,7))*1.2+Math.sin(Dt*4.3)*.03}let Ht=r?700:2200,Nt=new le(.25,.4,3,5);Nt.translate(0,1.5,0);let me=new go(2.4,8,7);me.translate(0,6.5,0);let ot=new yo(3,0);ot.translate(0,5,0);let ve=new ue({flatShading:!0}),Jt=new be(Nt,new ue({color:4863526}),Ht),t=new be(me,ve,Ht),N=new be(ot,ve,Ht),bt=new xe,te=new ce,St=new d,Me=new d,$t=0,Wt=0,At=0,ee=0,jt=new ct;for(;$t<Ht&&ee++<Ht*40;){let n=Xt.x+(Math.random()*2-1)*3e3,M=Xt.z+(Math.random()*2-1)*2600,F=qe(n,M);if(Math.abs(M)<110&&Math.abs(n-120)<360||Math.hypot(n-nt.x,M-nt.z)<nt.r*1.1||Se(n/400+31,M/400+17,3)<(F<1?.56:.44)&&Math.random()>.04)continue;let I=st(n,M);if(I>330||I<U+1)continue;let J=I*u,L=I>60||F>1.2&&Math.random()<.7,rt=(.7+Math.random()*.8)*l,Mt=rt*(.9+Math.random()*.4);te.setFromAxisAngle(new d(0,1,0),Math.random()*Math.PI*2),bt.compose(Me.set(n*e,J-.3,M*e),te,St.set(rt,Mt,rt)),Ut({name:"un \xE1rbol",x:n*e,z:M*e,y0:J-.3,top:J-.3+(L?10.5:8)*Mt,r:(L?1.5:2.3)*rt}),Jt.setMatrixAt($t++,bt),jt.setHSL(L?.3+Math.random()*.04:.22+Math.random()*.08,.45,L?.16+Math.random()*.06:.22+Math.random()*.08),L?(t.setMatrixAt(Wt,bt),t.setColorAt(Wt++,jt)):(N.setMatrixAt(At,bt),N.setColorAt(At++,jt))}Jt.count=$t,t.count=Wt,N.count=At;for(let n of[Jt,t,N])n.castShadow=!r,n.instanceMatrix.needsUpdate=!0,n.instanceColor&&(n.instanceColor.needsUpdate=!0),f.add(n);return{group:f,heightAt:Y,setWind:Ee,hit:w,scale:e,side:o}}var Lo=1.225,Ce=9.81,Go={m:7.2,S:.34,b:1.34,c:.28,I:new d(.28,.85,.62)},Bo={a:4.6,z:0,flap:.55,de:.35,stall:A.degToRad(15)},Uo={z:.028,k:.065,flap:.05,gear:.018},qo={z:0,a:-.9,q:-14,de:-1.15,flap:-.06},Do={b:-.08,p:-.48,da:.2,r:.08},$o={b:.13,r:-.18,dr:-.09},Wo=[{p:new d(.6,-.18,0),steer:!0},{p:new d(-.04,-.18,.238)},{p:new d(-.04,-.18,-.238)}],jo=[[.78,0,0],[-.8,.05,0],[-.68,.32,0],[-.12,.02,.67],[-.12,.02,-.67],[.2,.1,0]].map(r=>new d(...r)),Oo=[[.5,-.06,0],[-.3,-.06,0],[-.04,-.07,.24],[-.04,-.07,-.24]].map(r=>({p:new d(...r)})),_o={AC:Go,CL:Bo,CD:Uo,CM:qo,CR:Do,CN:$o,WHEELS:Wo,SKIN:jo,BELLY:Oo,world:1,size:1,vref:22,ground:.185,eye:[.486,.09],tips:[new d(-.12,.02,.67),new d(-.12,.02,-.67)]};function on({model:r,parts:s,S:i,m:e,AR:u,e:o,cd0:l,vref:f,eye:h,canopy:v=[],thrust:m,hud:p,world:U=10}){let c=Math.sqrt(u*i),E=i/c;r.updateMatrixWorld(!0);let x=r.matrixWorld.clone().invert(),R=w=>new so().setFromObject(w).applyMatrix4(x),g=R(r),S=g.max.x-g.min.x,z=s.filter(w=>/tren|gear|rueda|wheel/i.test(w.data.part+" "+(w.data.label??""))).map(w=>R(w.obj)).filter(w=>isFinite(w.min.y)).map(w=>({p:new d((w.min.x+w.max.x)/2,w.min.y,(w.min.z+w.max.z)/2)}));if(z.length<3){let w=g.min.y;z=[{p:new d(g.min.x+.78*S,w,0)},{p:new d(g.min.x+.38*S,w,.12*c)},{p:new d(g.min.x+.38*S,w,-.12*c)}]}z.sort((w,W)=>W.p.x-w.p.x),z[0].steer=!0;let V=z.slice(1).reduce((w,W)=>w+W.p.x,0)/(z.length-1),y=new d(V+.1*(z[0].p.x-V),(g.min.y+g.max.y)/2,0);for(let w of z)w.p.sub(y);let k=Math.min(...z.map(w=>w.p.y)),lt=-k+.02,et=new d,Z=new d,X=-1/0,dt=1/0,Y=new d;r.traverse(w=>{if(!w.isMesh)return;let W=w.geometry.attributes.position,ht=x.clone().multiply(w.matrixWorld);for(let ut=0;ut<W.count;ut+=7)Y.fromBufferAttribute(W,ut).applyMatrix4(ht),Y.z>X&&(X=Y.z,et.copy(Y)),Y.z<dt&&(dt=Y.z,Z.copy(Y))});let st=new Set;for(let w of v)w.traverse(W=>st.add(W));let at=-1/0;r.traverse(w=>{if(!w.isMesh||st.has(w))return;let W=w.geometry.attributes.position,ht=x.clone().multiply(w.matrixWorld);for(let ut=0;ut<W.count;ut+=3)Y.fromBufferAttribute(W,ut).applyMatrix4(ht),Math.abs(Y.x-h[0])<.4&&Math.abs(Y.z)<.35&&Y.y>at&&(at=Y.y)});let wt=Math.max(h[1],at+.15);et.sub(y),Z.sub(y),g.min.sub(y),g.max.sub(y);let Rt=[new d(g.max.x,(g.min.y+g.max.y)/2-.1*(g.max.y-g.min.y),0),new d(g.min.x,k+.35*(g.max.y-k),0),new d(g.min.x+.1*S,g.max.y,0),et.clone(),Z.clone()],Bt=[[.75,0],[.3,0],[.45,.25],[.45,-.25]].map(([w,W])=>({p:new d(g.min.x+w*S,k+.15*(g.max.y-k),W*c*.5)})),Ut=2*Math.PI*u/(2+Math.sqrt(u*u+4));return{AC:{m:e,S:i,b:c,c:E,I:new d(e*(.22*c)**2,e*(.32*S)**2,e*(.3*S)**2)},CL:{a:Ut,z:.02,flap:.35,de:.3,stall:A.degToRad(u<3?24:16)},CD:{z:l,k:1/(Math.PI*o*u),flap:.04,gear:.015},CM:{z:0,a:-.55,q:-10,de:-.8,flap:-.04},CR:{b:-.06,p:-.4,da:.12,r:.06},CN:{b:.1,r:-.15,dr:-.07},WHEELS:z,SKIN:Rt,BELLY:Bt,world:U,size:S/1.6,vref:f,ground:lt,eye:[h[0]-y.x,wt-y.y],canopy:v,tips:[et,Z],thrust:m,hud:p,cg:y}}function nn({scene:r,renderer:s,camera:i,model:e,op:u,motor:o,lite:l,setGear:f,setSurfaces:h,gearState:v,pad:m,airframe:p=_o,envSize:U=128}){let{AC:c,CL:E,CD:x,CM:R,CR:g,CN:S,WHEELS:C,SKIN:z,BELLY:V}=p,y=p.world,k=p.size,lt=p.vref,et=lt/22,Z=c.m/7.2,X=new kt;X.visible=!1,r.add(X);let dt=null;function Y(){dt=bo({lite:l,scale:y,vscale:y>1?3:1}),X.add(dt.group);let a=document.createElement("canvas");a.width=256,a.height=4096;let T=a.getContext("2d");T.fillStyle="#2b2c2e",T.fillRect(0,0,256,4096);for(let G=0;G<4e3;G++)T.fillStyle=`rgba(255,255,255,${Math.random()*.04})`,T.fillRect(Math.random()*256,Math.random()*4096,2,2);T.fillStyle="#e8e6e0";for(let G=300;G<3800;G+=160)T.fillRect(124,G,8,80);T.fillRect(8,0,6,4096),T.fillRect(242,0,6,4096);for(let G=0;G<8;G++)T.fillRect(24+G*26,60,14,160),T.fillRect(24+G*26,3876,14,160);let b=new Vt(a);b.colorSpace=Lt,b.anisotropy=l?2:8;let H=new _(new gt(14*dt.side*(y>1?1.3:1),320*y),new pt({map:b,roughness:.85}));return H.rotation.x=-Math.PI/2,H.rotation.z=Math.PI/2,H.position.set(120*y,.03,0),H.receiveShadow=!0,X.add(H),dt}let st=()=>dt??Y(),at=new de;at.scale.setScalar(1e4);let wt=new d().setFromSphericalCoords(1,A.degToRad(60),A.degToRad(160));Object.assign(at.material.uniforms.sunPosition.value,wt),at.material.uniforms.turbidity.value=4,at.material.uniforms.rayleigh.value=1.4;let Rt=new po;Rt.add(at);let Bt=null;function Ut(){let a=new ho(l?256:512,{type:no});return new uo(1,2e4,a).update(s,Rt),a.texture}let w=null,W=null,ht=null,ut=1,qt=new kt;X.add(qt);let it=70,vt=p.tips,Tt=vt.map(()=>{let a=new Be;a.setAttribute("position",new Gt(new Float32Array(it*3),3)),a.setAttribute("color",new Gt(new Float32Array(it*4),4));let T=new mo(a,new Ue({vertexColors:!0,transparent:!0,depthWrite:!1}));return T.frustumCulled=!1,qt.add(T),{geo:a,n:0}}),Pt=l?70:160,xt=new Be,pe=new Float32Array(Pt*6),Dt=new Float32Array(Pt*8);xt.setAttribute("position",new Gt(pe,3)),xt.setAttribute("color",new Gt(Dt,4));let Ee=new vo(xt,new Ue({vertexColors:!0,transparent:!0,depthWrite:!1}));Ee.frustumCulled=!1,qt.add(Ee);let Ht=Array.from({length:Pt},()=>({p:new d,seed:Math.random()}));function Nt(a,T){let b=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0).applyQuaternion(t.q),H=new d(0,1,0).cross(b).normalize(),G=b.clone().cross(H).normalize(),Et=(.5+Math.random()*2.2)*k,K=Math.random()*Math.PI*2;a.p.copy(t.p).addScaledVector(b,(T?6+Math.random()*10:(Math.random()-.3)*16)*k).addScaledVector(H,Math.cos(K)*Et).addScaledVector(G,Math.sin(K)*Et*.7)}function me(a,T){let b=A.smoothstep(T.V,6*et,30*et),H=T.onGround?0:b*A.clamp(.25+T.alpha*5,0,1);vt.forEach((K,q)=>{let D=Tt[q],Q=D.geo.attributes.position.array,B=D.geo.attributes.color.array;Q.copyWithin(3,0,(it-1)*3),B.copyWithin(4,0,(it-1)*4);let tt=K.clone().applyQuaternion(t.q).add(t.p);Q.set([tt.x,tt.y,tt.z],0),B.set([1,1,1,H*.75],0),D.n=Math.min(it,D.n+1);for(let j=0;j<it;j++)B[j*4+3]*=j===0?1:.985;for(let j=0;j<it;j++){let _t=j*3;Q[_t]+=ot.x*a,Q[_t+1]+=(ot.y-.15)*a,Q[_t+2]+=ot.z*a}if(D.n<it)for(let j=D.n;j<it;j++)Q.copyWithin(j*3,(D.n-1)*3,D.n*3),B[j*4+3]=0;D.geo.attributes.position.needsUpdate=D.geo.attributes.color.needsUpdate=!0});let G=ot.clone().sub(t.v),Et=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0);for(let K=0;K<Pt;K++){let q=Ht[K];q.p.addScaledVector(ot,a);let D=q.p.clone().sub(t.p);(D.dot(Et)<-10*k||D.length()>20*k)&&Nt(q,!0);let Q=1-A.smoothstep(q.p.distanceTo(t.p),1.5*k,9*k),B=b*Q*(.25+.35*q.seed),tt=q.p.clone().addScaledVector(G,-.05);pe.set([q.p.x,q.p.y,q.p.z,tt.x,tt.y,tt.z],K*6),Dt.set([.9,.95,1,B,.9,.95,1,0],K*8)}xt.attributes.position.needsUpdate=xt.attributes.color.needsUpdate=!0}let ot=new d,ve=new d(-1.6,0,.2);function Jt(a,T){let b=.6+.4*Math.sin(a*.37)*Math.sin(a*.11+1.3),H=A.clamp(T/25,.1,1)*.55;ot.copy(ve).multiplyScalar(b),ot.x+=H*(Math.sin(a*1.7)+.5*Math.sin(a*4.3+2)),ot.y+=H*.6*(Math.sin(a*2.1+.7)+.5*Math.sin(a*5.9)),ot.z+=H*(Math.sin(a*1.3+4)+.5*Math.sin(a*3.7+1))}let t={p:new d,v:new d,q:new ce,w:new d,throttle:0,roll:0,pitch:0,yaw:0,flap:.5,brake:0,gearUp:!1,crashed:!1,cam:"chase",t:0,assist:!0},N=new Set,bt={pos:e.position.clone(),quat:e.quaternion.clone()};function te(){t.p.set(y>1?-34*y:0,p.ground,0),t.v.set(0,0,0),t.q.identity(),t.w.set(0,0,0),t.throttle=0,t.flap=.5,t.gearUp=!1,t.onGround=!0,t.hold=0,t.bankHold=0,t.trim=0,t.crashed=!1,t.crashWhy="",v.target=0;for(let a of Tt)a.n=0;for(let a of Ht)Nt(a,!1)}let St={gear(){!t.onGround&&t.p.y>p.ground+1.3*Math.max(1,y*.4)&&(t.gearUp=!t.gearUp,v.target=t.gearUp?1:0)},flap(){t.flap=t.flap>.6?0:t.flap+.5},cam(){t.cam=t.cam==="chase"?"cockpit":"chase"},reset:te,engine(){o.on=!o.on},assist(){t.assist=!t.assist}},Me=a=>T=>{let b=T.key.toLowerCase();a&&!T.repeat&&(b==="g"&&St.gear(),b==="f"&&St.flap(),b==="c"&&St.cam(),b==="r"&&St.reset(),b==="e"&&St.engine(),b==="t"&&St.assist()),["w","s","a","d","q","e","shift","control","b","arrowup","arrowdown"," "].includes(b)&&T.preventDefault(),a?N.add(b):N.delete(b)},$t=Me(!0),Wt=Me(!1),At=null,ee=()=>!!(m!=null&&m.touch),jt=new d;function n(a){t.crashed||(t.crashed=!0,t.crashWhy=a,t.v.set(0,0,0),t.w.set(0,0,0))}let M=new d;function F(a){let T=($,O)=>(N.has($)?1:0)-(N.has(O)?1:0),b=$=>Math.max(-1,Math.min(1,$)),H=At;t.pitch+=(b(T("s","w")+((H==null?void 0:H.pitch)??0))-t.pitch)*Math.min(1,a*6),t.roll+=(b(T("d","a")+((H==null?void 0:H.roll)??0))-t.roll)*Math.min(1,a*7);let G=b(T("z","x")+((H==null?void 0:H.yaw)??0)),Et=new d(1,0,0).applyQuaternion(t.q),K=Math.atan2(Et.z,Et.x),q=t.v.length();if(!t.onGround||Math.abs(G)>.02||q<1||q>25*et)t.hold=K;else if(t.assist){let $=A.clamp(10*et/q,.4,1);G=A.clamp(Math.atan2(Math.sin(K-t.hold),Math.cos(K-t.hold))*6+t.w.y*.4,-$,$)}t.yaw+=(G-t.yaw)*Math.min(1,a*5),(N.has("shift")||N.has("arrowup"))&&(t.throttle=Math.min(1,t.throttle+a*.5)),(N.has("control")||N.has("arrowdown"))&&(t.throttle=Math.max(0,t.throttle-a*.5)),(H==null?void 0:H.throttle)!=null&&(t.throttle=H.throttle),H!=null&&H.throttleRate&&(t.throttle=Math.min(1,Math.max(0,t.throttle+H.throttleRate*a*.6))),t.brake=N.has("b")||N.has(" ")?1:0,o.target=t.throttle;let D=new xe().makeRotationFromQuaternion(t.q),Q=D.clone().transpose();t.t+=a,Jt(t.t,t.p.y),M.copy(t.v).sub(ot).applyMatrix4(Q);let B=Math.max(.01,M.length()),tt=Math.atan2(-M.y,M.x),j=Math.asin(A.clamp(M.z/B,-1,1)),_t=Lo*Math.pow(Math.max(.05,1-22558e-9*Math.max(0,t.p.y)),4.2559),Ct=.5*_t*B*B,Oe=p.thrust?p.thrust({V:B,h:t.p.y,rho:_t}):o.on?u(o.f).thrust*o.spin:0,ke=t.assist?A.clamp((lt/Math.max(B,1))**2,.22,1):1,_e=-t.pitch*A.degToRad(16)*ke,So=t.roll*A.degToRad(20)*ke,Ve=-t.yaw*A.degToRad(22)*Math.max(ke,.45),Kt=t.flap*.8,Co=1-v.t,ge=E.z+E.a*tt+E.flap*Kt-E.de*_e*.1;Math.abs(tt)>E.stall&&(ge=Math.sign(tt)*(E.a*E.stall)*Math.max(.35,1-(Math.abs(tt)-E.stall)*3)+E.flap*Kt*.5);let zo=x.z+x.k*ge*ge+x.flap*Kt+x.gear*Co+.4*Math.max(0,Math.abs(tt)-E.stall),ne=new d;if(B>.5){let $=M.clone().normalize(),O=new d(0,0,1).cross($).normalize();ne.addScaledVector(O,Ct*c.S*ge),ne.addScaledVector($,-Ct*c.S*zo),ne.z+=-Ct*c.S*.6*j}ne.x+=Oe;let Ke=t.w.x*c.b/(2*B),Pe=t.w.y*c.b/(2*B),Ae=t.w.z*c.c/(2*B),ko=c.m*Ce/Math.max(1,Ct*c.S)-E.flap*Kt;t.trim+=(-R.a*A.clamp(ko/E.a,0,E.stall*.7)-R.flap*Kt-t.trim)*Math.min(1,a*.8);let Vo=t.onGround?0:t.trim,Qt=new d(Ct*c.S*c.b*(g.b*j+g.p*Ke+g.da*So+g.r*Pe),Ct*c.S*c.b*(S.b*-j+S.r*Pe+S.dr*Ve),Ct*c.S*c.c*(R.z+R.a*tt+R.q*Ae+R.de*_e+R.flap*Kt+Vo));if(t.assist&&B>8*et){let $=new d(0,0,1).applyQuaternion(t.q),O=Math.asin(A.clamp(-$.y,-1,1)),zt=Math.asin(A.clamp(t.v.y/B,-1,1)),mt=Ct*c.S,ft=Math.abs(t.roll)>=.05;ft&&(t.bankHold=O);let re=Math.abs(t.bankHold??0)<A.degToRad(12)?0:A.clamp(t.bankHold,-.79,.79);ft?Qt.x+=mt*c.b*-.2*Ke:Qt.x+=c.I.x*6*(.8*(re-O)-t.w.x);let It=c.m*Ce/Math.max(1,mt*c.S)*(1/Math.max(.45,Math.cos(O))-1)/E.a;Qt.z+=Math.abs(t.pitch)<.05?mt*c.c*(-.6*zt-3*Ae-R.a*It):mt*c.c*-3*Ae,Qt.z+=mt*c.c*-2.5*Math.max(0,tt-.8*E.stall);let ie=-(Ce*Math.tan(A.clamp(O,-1.2,1.2)))/B*Math.cos(O)*c.b/(2*B);Qt.y+=mt*c.b*(-.03*j-.5*(Pe-ie))}let Fe=ne.clone().applyMatrix4(D);Fe.y-=c.m*Ce;let Qe=new d,ye=!1,ae=v.t<.05?C:V;for(let $ of ae){let O=$.p.clone().applyQuaternion(t.q),zt=O.clone().add(t.p),mt=st().heightAt(zt.x,zt.z)-zt.y;if(mt<=0)continue;mt>.3*k&&n("contra el terreno"),ye=!0;let ft=t.v.clone().add(new d().copy(t.w).applyQuaternion(t.q).cross(O)),re=Math.max(0,1250*Z*7.2*mt/k-36*Z*7.2*ft.y),se=new d(0,re,0),It=new d(1,0,0).applyQuaternion(t.q).setY(0).normalize(),ie=new d(0,1,0).cross(It),Ao=ae===V?.5:.02+.5*t.brake,Ze=c.m/ae.length,Ge=ft.dot(It);se.addScaledVector(It,-Math.sign(Ge)*Math.min(Math.abs(Ge)*40*Z,Ao*re,.5*Ze*Math.abs(Ge)/a));let Xe=$.steer?ft.dot(ie)+It.dot(ft)*Ve*.8:ft.dot(ie),Ye=Math.min(.9*re,.5*Ze*Math.abs(Xe)/a+($.steer?Math.abs(It.dot(ft)*Ve)*400*Z:0));se.addScaledVector(ie,-A.clamp(Xe*400*Z,-Ye,Ye)),Fe.add(se),Qe.add(O.clone().cross(se)),ae===V&&-ft.y>2.5&&n("aterrizaje de panza demasiado fuerte"),ae===C&&-ft.y>4&&n("aterrizaje demasiado fuerte, se rompi\xF3 el tren")}t.v.addScaledVector(Fe,a/c.m),t.p.addScaledVector(t.v,a);for(let $ of z){let O=jt.copy($).applyQuaternion(t.q).add(t.p),zt=st().hit(O);if(zt){n(`choque contra ${zt}`);break}if(st().heightAt(O.x,O.z)-O.y>.03*k){n($.z?"una punta de ala toc\xF3 el suelo":$.x>0?"el morro contra el suelo":"la cola contra el suelo");break}}let Ie=Qt.add(Qe.applyMatrix4(Q)),Po=new d(c.I.x*t.w.x,c.I.y*t.w.y,c.I.z*t.w.z),Le=t.w.clone().cross(Po);t.w.x+=(Ie.x-Le.x)/c.I.x*a,t.w.y+=(Ie.y-Le.y)/c.I.y*a,t.w.z+=(Ie.z-Le.z)/c.I.z*a,ye&&t.w.multiplyScalar(.995);let we=t.q.clone().multiply(new ce(t.w.x*a*.5,t.w.y*a*.5,t.w.z*a*.5,0));return t.q.x+=we.x,t.q.y+=we.y,t.q.z+=we.z,t.q.w+=we.w,t.q.normalize(),h({roll:t.roll,pitch:t.pitch,yaw:t.yaw,flap:t.flap}),t.onGround=ye,{V:B,alpha:tt,onGround:ye,thrust:Oe}}let P={V:0,alpha:0,onGround:!0,thrust:0},I=!1;function J(a,T){I=!0,At=T;for(let b=0;b<8;b++)P=F(a/8);return P}let L=new d(-3.4*k,.9*k,0);function rt(a){if(t.crashed){Ot(`<b>Accidente</b> \xB7 ${t.crashWhy}<br>${ee()?"Reinicio":"R"} para volver a la pista`);return}if(!I){At=(m==null?void 0:m.read())??null;for(let Q=0;Q<8;Q++)P=F(a/8)}me(a,P),st().setWind(ot,a),e.position.copy(t.p),p.cg&&e.position.sub(jt.copy(p.cg).applyQuaternion(t.q)),e.quaternion.copy(t.q);let T=new d(1,0,0).applyQuaternion(t.q),b=new d(0,1,0).applyQuaternion(t.q);if(t.cam==="chase"){let Q=(i.aspect<1?2.6:3.4)*k,B=T.clone().multiplyScalar(-Q).add(new d(0,Q*.27,0));L.lerp(B,Math.min(1,a*3)),i.position.copy(t.p).add(L),i.up.set(0,1,0),i.lookAt(t.p.clone().addScaledVector(T,2*k).add(new d(0,(ee()?-.8:-.5)*k,0)))}else i.position.copy(t.p).addScaledVector(T,p.eye[0]).addScaledVector(b,p.eye[1]),i.up.copy(b),i.lookAt(i.position.clone().addScaledVector(T,10*k).addScaledVector(b,-1.7*k));let H=t.cam==="chase"?null:70;H&&i.fov!==H&&(i.fov=H,i.updateProjectionMatrix()),!H&&t.cam!==rt.cam&&Ft(),t.cam!==rt.cam&&Mt(t.cam!=="cockpit"),rt.cam=t.cam;let G=p.hud?null:u(o.f),Et=Math.max(0,t.p.y-st().heightAt(t.p.x,t.p.z)),K=P.V*3.6,q=t.v.y,D=P.alpha>E.stall;if(innerWidth<560){Ot(`<b>${K.toFixed(0)}</b> km/h \xB7 <b>${Et.toFixed(0)}</b> m \xB7 ${q>=0?"+":""}${q.toFixed(1)} m/s<br>`+(p.hud?p.hud(P,t,!0):o.on?`<b>${Math.round(G.n*o.spin/1e3)}k</b> rpm \xB7 ${P.thrust.toFixed(0)} N \xB7 gas ${(t.throttle*100).toFixed(0)} %`:"MW54 apagada \xB7 Motor para arrancar")+(D?"<br><b>P\xC9RDIDA</b> \xB7 baja el morro":t.brake?"<br>frenos":""));return}Ot(`<b>${K.toFixed(0)}</b> km/h \xB7 <b>${Et.toFixed(1)}</b> m \xB7 ${q>=0?"+":""}${q.toFixed(1)} m/s \xB7 \u03B1 ${A.radToDeg(P.alpha).toFixed(0)}\xB0<br>`+(p.hud?p.hud(P,t,!1):`MW54 ${o.on?`<b>${Math.round(G.n*o.spin).toLocaleString("es-ES")}</b> rpm \xB7 ${P.thrust.toFixed(0)} N \xB7 EGT ${Math.round(15+(G.egt-15)*o.heat)} \xB0C`:`apagada (${ee()?"Motor":"E"} para arrancar)`} \xB7 gas ${(t.throttle*100).toFixed(0)} %`)+`<br>Viento ${ot.length().toFixed(1)} m/s \xB7 Tren ${v.t<.05?"abajo":v.t>.95?"arriba":"en tr\xE1nsito"} \xB7 flaps ${(t.flap*40).toFixed(0)}\xB0 \xB7 gir\xF3scopo ${t.assist?"s\xED":"no"}${t.brake?" \xB7 frenos":""}${D?" \xB7 <b>P\xC9RDIDA</b>":""}`)}function Mt(a){for(let T of p.canopy??[])T.visible=a}let oe="";function Ot(a){a!==oe&&(oe=a,document.getElementById("hud").innerHTML=a)}function Ft(){i.fov=A.clamp(A.radToDeg(2*Math.atan(Math.tan(A.degToRad(28))/i.aspect)),40,66),i.updateProjectionMatrix()}function ze(a,T=a){a&&st(),a&&!X.visible&&(Bt??=Ut(),W??=new Ro(s).fromScene(Rt,0,1,2e4,{size:U}).texture,w=r.background,r.background=Bt,ht=r.environment,ut=r.environmentIntensity,r.environment=W,r.environmentIntensity=.55),!a&&X.visible&&(r.background=w,r.environment=ht,r.environmentIntensity=ut),X.visible=a,qt.visible=T;let b=Math.sqrt(y);r.fog=a?new fo(11124692,900*b,(l?4500:6500)*b):null,i.up.set(0,1,0),i.near=a?.004*k:.01,i.far=a?12e3*y:50,a?Ft():(i.fov=32,i.updateProjectionMatrix())}return{enter(){ze(!0),te(),m==null||m.reset(0),addEventListener("keydown",$t),addEventListener("keyup",Wt),L.set(-3.4*k,.9*k,0)},exit(){ze(!1),removeEventListener("keydown",$t),removeEventListener("keyup",Wt),N.clear(),Mt(!0),rt.cam=null,document.fullscreenElement&&document.exitFullscreen().catch(()=>{}),e.position.copy(bt.pos),e.quaternion.copy(bt.quat)},update:rt,simulate:J,endTest(){I=!1},fit:Ft,showWorld:ze,home:bt,get terrain(){return st()},airframe:p,state:t}}var $e=4;function We(r){let s=(l,f)=>{let h=new Float32Array(l*l),v=f;for(let m=0;m<h.length;m++)v=v*1664525+1013904223>>>0,h[m]=v/4294967296;return(m,p)=>{let U=m*l,c=p*l,E=Math.floor(U),x=Math.floor(c),R=U-E,g=c-x;R=R*R*(3-2*R),g=g*g*(3-2*g);let S=(C,z)=>h[(z%l+l)%l*l+(C%l+l)%l];return(S(E,x)*(1-R)+S(E+1,x)*R)*(1-g)+(S(E,x+1)*(1-R)+S(E+1,x+1)*R)*g}},i=[[5,.25],[12,.25],[30,.2],[80,.15],[200,.15]].map(([l,f],h)=>[s(l,7+h*31),f]),e=[s(3,101),s(11,202)],u=new Uint8ClampedArray(r*r*4),o=new Uint8ClampedArray(r*r*4);for(let l=0;l<r;l++)for(let f=0;f<r;f++){let h=f/r,v=l/r,m=0;for(let[g,S]of i)m+=g(h,v)*S;let p=Math.random(),U=p>.985?.12*Math.random():p<.01?-.16*Math.random():(Math.random()-.5)*.04,c=36+(m-.5)*12+U*110,E=(l*r+f)*4;u[E]=c,u[E+1]=c+2,u[E+2]=c+5,u[E+3]=255;let R=160+(.5*e[0](h,v)+.5*e[1](h,v)-.5)*60+Math.abs(U)*300;o[E]=o[E+1]=o[E+2]=R,o[E+3]=255}return{c:u,r:o}}function Ko(r,s){let i=[["#24262a"],["#a0a0a0"]].map(([o])=>{let l=document.createElement("canvas");l.width=l.height=s;let f=l.getContext("2d");return f.fillStyle=o,f.fillRect(0,0,s,s),l}),e=i.map(o=>{let l=new Vt(o);return l.wrapS=l.wrapT=Te,l.anisotropy=r.capabilities.getMaxAnisotropy(),l});e[0].colorSpace=Lt;let u=({c:o,r:l})=>{[o,l].forEach((f,h)=>{i[h].getContext("2d").putImageData(new ImageData(f,s,s),0,0),e[h].needsUpdate=!0})};try{let o=`onmessage = (e) => { const o = (${We})(e.data); postMessage(o, [o.c.buffer, o.r.buffer]); close(); };`,l=URL.createObjectURL(new Blob([o],{type:"text/javascript"})),f=new Worker(l);f.onmessage=h=>{u(h.data),URL.revokeObjectURL(l)},f.onerror=h=>{h.preventDefault(),URL.revokeObjectURL(l),u(We(s))},f.postMessage(s)}catch{u(We(s))}return e}function Qo(r,s,i){r.onBeforeCompile=e=>{e.uniforms.uFade={value:new ro(s,i)},e.uniforms.uBg={value:new ct(855826)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;
uniform vec2 uFade;
uniform vec3 uBg;`).replace("#include <tonemapping_fragment>",`gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));
#include <tonemapping_fragment>`)}}function Zo(r,{W:s,D:i,box:e,dash:u,stops:o,stop:l}){let f=Math.min(512,2600/s),h=document.createElement("canvas");h.width=s*f,h.height=i*f;let v=h.getContext("2d"),m=C=>(C+s/2)*f,p=C=>(C+i/2)*f,U="#d9a93a";v.fillStyle=U;for(let[C,z]of[[e.x0,1],[e.x1,-1]])for(let[V,y]of[[e.z0,1],[e.z1,-1]])v.fillRect(Math.min(m(C),m(C+z*e.arm)),Math.min(p(V),p(V+y*e.w)),e.arm*f,e.w*f),v.fillRect(Math.min(m(C),m(C+z*e.w)),Math.min(p(V),p(V+y*e.arm)),e.w*f,e.arm*f);let[c,E,x]=u;for(let C=e.x0+E/2;C<e.x1-1.5*E;C+=E)v.fillRect(m(C),p(-x/2),c*f,x*f);let R=E*.7;v.beginPath(),v.moveTo(m(e.x1-R*.3),p(0)),v.lineTo(m(e.x1-R),p(-R*.28)),v.lineTo(m(e.x1-R),p(R*.28)),v.closePath(),v.fill(),v.fillStyle="#e6e2d6";for(let[C,z]of o)v.fillRect(m(C-l[0]*2.3),p(z-l[1]/2),l[0]*f,l[1]*f);v.globalCompositeOperation="destination-out";for(let C=0;C<14e3;C++)v.fillStyle=`rgba(0,0,0,${Math.random()*.6})`,v.fillRect(Math.random()*h.width,Math.random()*h.height,1+Math.random(),1+Math.random());let g=new Vt(h);g.colorSpace=Lt,g.anisotropy=r.capabilities.getMaxAnisotropy();let S=new _(new gt(s,i),new pt({map:g,transparent:!0,roughness:.5,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));return S.rotation.x=-Math.PI/2,S.receiveShadow=!0,S}function Xo({w:r,d:s,x:i}){let e=document.createElement("canvas");e.width=e.height=256;let u=e.getContext("2d"),o=u.createRadialGradient(128,128,0,128,128,128);o.addColorStop(0,"rgba(0,0,0,0.55)"),o.addColorStop(.5,"rgba(0,0,0,0.22)"),o.addColorStop(1,"rgba(0,0,0,0)"),u.fillStyle=o,u.fillRect(0,0,256,256);let l=new _(new gt(r,s),new io({map:new Vt(e),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return l.rotation.x=-Math.PI/2,l.position.x=i,l}function rn(r,{y:s,fade:i,stand:e,ao:u,res:o=2048}){let[l,f]=Ko(r,o),h=Math.ceil(i[1]*2.2/$e);for(let U of[l,f])U.repeat.set(h,h);let v=new pt({map:l,roughnessMap:f,roughness:.7,metalness:0,envMapIntensity:.35});Qo(v,i[0],i[1]);let m=new kt,p=new _(new gt($e*h,$e*h),v);return p.rotation.x=-Math.PI/2,p.receiveShadow=!0,m.add(p,Zo(r,e),Xo(u)),m.position.y=s,m}var fe=64;function je(r,s){for(let u=0;u<r.length-1;u++){let[o,l,f]=r[u],[h,v,m]=r[u+1];if(s<=h){let p=(s-o)/Math.max(1e-6,h-o),U=f+(m-f)*p;return l.map((c,E)=>(c+(v[E]-c)*p)*U)}}let[,i,e]=r[r.length-1];return i.map(u=>u*e)}function cn(r,s,{steps:i=40}={}){var m,p,U;let e=new Float32Array(fe*2*4),u=new Eo(e,fe,2,ao,oo);u.magFilter=u.minFilter=eo,u.wrapS=u.wrapT=to;let o={uTime:{value:0},uIntensity:{value:0},uReach:{value:1},uDiamond:{value:0},uSpacing:{value:((m=s.diamonds)==null?void 0:m.spacing)??.1},uCount:{value:((p=s.diamonds)==null?void 0:p.count)??6},uDiaColor:{value:new ct(...((U=s.diamonds)==null?void 0:U.color)??[1,.85,.6])},uGrad:{value:u},uTurb:{value:s.turbulence??1}},l=new He({uniforms:o,transparent:!0,depthWrite:!1,blending:Je,side:Re,defines:{STEPS:i},vertexShader:`
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
      }`}),f=[],h={};function v(c){let E=Object.keys(s.modes);for(let x=0;x<2;x++)for(let R=0;R<fe;R++){let g=R/(fe-1),S=[0,0,0];for(let C of E){if(!c[C])continue;let z=je(s.modes[C][x?"edge":"core"],g);for(let V=0;V<3;V++)S[V]+=z[V]*c[C]}e.set([S[0],S[1],S[2],1],(x*fe+R)*4)}u.needsUpdate=!0}return{add(c,E,{length:x,r:R,h:g=1,w:S=1,light:C=!0}){let z=new Zt(1,2,2);z.translate(-.5,0,0);let V=new _(z,l);V.position.copy(E),V.scale.set(x,R*g,R*S),V.frustumCulled=!1,V.userData.noAO=!0,V.visible=!1,c.add(V);let y=null;return C&&s.light&&(y=new wo(16755302,0,s.light.distance,2),y.position.copy(E).add(new d(-x*.12,0,0)),c.add(y)),f.push({mesh:V,lamp:y}),V},update({w:c,level:E,optimal:x,reach:R=1,time:g,visible:S}){Object.keys(c).some(y=>Math.abs((h[y]??0)-c[y])>.01)&&(h={...c},v(h)),o.uTime.value=g,o.uIntensity.value=E*(s.brightness??1),o.uDiamond.value=x,o.uReach.value=R;let C=je(Object.values(s.modes)[0].core,.1),z=[0,0,0];for(let[y,k]of Object.entries(h)){if(!k)continue;let lt=je(s.modes[y].core,.15);z=z.map((et,Z)=>et+lt[Z]*k)}let V=Math.max(...z,.001);for(let y of f)y.mesh.visible=S&&E>.01,y.lamp&&(y.lamp.visible=y.mesh.visible,y.lamp.color.setRGB(z[0]/V,z[1]/V,z[2]/V),y.lamp.intensity=s.light.intensity*E*Math.min(1,V/2)*(.92+.08*Math.sin(g*37+C[0])))}}}export{on as a,nn as b,rn as c,cn as d};
