import{B as eo,Ba as Eo,Ea as be,F as oo,G as no,Ga as Ue,Ha as mo,I as ao,Ia as vo,Ma as kt,Oa as Mo,Pa as le,Q as It,Qa as go,Sa as yo,Ta as Mt,U as P,V as ro,W as ce,Wa as ht,X as d,Za as ue,aa as so,da as xe,e as Re,f as Ne,fa as ct,h as Je,ha as io,ja as Lt,jb as wo,ka as co,la as Be,ma as Q,na as Zt,oa as lo,pa as He,sa as uo,ta as ho,tb as Ro,ua as zt,v as Te,va as fo,w as to,wa as po}from"./chunk-V5OSS73Z.js";var de=class r extends Q{constructor(){let s=r.SkyShader,i=new He({name:s.name,uniforms:lo.clone(s.uniforms),vertexShader:s.vertexShader,fragmentShader:s.fragmentShader,side:Re,depthWrite:!1});super(new Zt(1,1,1),i),this.isSky=!0}};de.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new d},up:{value:new d(0,1,0)}},vertexShader:`
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

		}`};var{smoothstep:gt,clamp:To}=P,he=12e3,Xt={x:120,z:60,rx:750,rz:600},nt={x:-480,z:680,r:170},Yt=(r,s)=>{let i=Math.sin(r*127.1+s*311.7)*43758.5453;return i-Math.floor(i)};function xo(r,s){let i=Math.floor(r),e=Math.floor(s),l=r-i,o=s-e;l=l*l*(3-2*l),o=o*o*(3-2*o);let c=Yt(i,e),p=Yt(i+1,e),h=Yt(i,e+1),v=Yt(i+1,e+1);return c+(p-c)*l+(h-c)*o+(c-p-h+v)*l*o}function Se(r,s,i=5){let e=0,l=.5;for(let o=0;o<i;o++)e+=l*xo(r,s),r*=2.03,s*=2.03,l*=.5;return e}var Fo=(r,s)=>{let i=0,e=.5;for(let l=0;l<5;l++)i+=e*(1-Math.abs(xo(r,s)*2-1))**2,r*=2.1,s*=2.1,e*=.5;return i},qe=(r,s)=>Math.hypot((r-Xt.x)/Xt.rx,(s-Xt.z)/Xt.rz);function Ho(r,s){let i=qe(r,s),e=Math.max(gt(Math.abs(s),70,140),gt(Math.abs(r-120),260,340)),l=(Se(r/260,s/260,3)-.5)*3*e;return l+=gt(i,1,1.7)*(Se(r/520+7,s/520+3)*110-15),l+=gt(i,2.1,3.4)*Fo(r/1400,s/1400)*520,l}function Io(r,s){let i=(r-nt.x)**2+(s-nt.z)**2;return Ho(r,s)-26*Math.exp(-i/(nt.r*nt.r))}function bo({lite:r,scale:s=1,vscale:i=s}){let e=s,l=i,o=Math.min(s,2.5),c=Math.min(s,1.6),p=new zt,h=r?160:240,v=new Mt(he,he,h,h);v.rotateX(-Math.PI/2);let m=v.attributes.position,E=new Float32Array((h+1)*(h+1));for(let n=0;n<m.count;n++){let M=Io(m.getX(n),m.getZ(n));m.setY(n,M),E[n]=M}v.computeVertexNormals();let q=Ho(nt.x,nt.z)-7,u=[[.64,.58,.34],[.25,.37,.16],[.42,.33,.22],[.44,.56,.27],[.55,.52,.3]],f=new Float32Array(m.count*3),S=new ct,w=new ct(.22,.37,.13),V=new ct(.32,.46,.17),g=new ct(.42,.39,.35),R=new ct(.92,.94,.96),L=new ct(.62,.57,.44),T=v.attributes.normal;for(let n=0;n<m.count;n++){let M=m.getX(n),A=m.getZ(n),k=m.getY(n);S.copy(w).lerp(V,Se(M/90,A/90,3));let F=qe(M,A),tt=Yt(Math.floor(M/160)+.5,Math.floor(A/160)+.5);F<1.5&&tt<.55*(1-gt(F,1,1.5))&&Math.abs(A)>80&&S.setRGB(...u[Math.floor(Yt(Math.floor(M/160),Math.floor(A/160)+9)*u.length)]),Math.abs(A)<70&&Math.abs(M-120)<300&&S.lerp(new ct(.4,.53,.26),.6);let I=1-T.getY(n);S.lerp(g,gt(I,.12,.3)),S.lerp(R,gt(k,300,380)*(1-gt(I,.3,.5))),k<q+1.5&&Math.hypot(M-nt.x,A-nt.z)<nt.r*1.8&&S.lerp(L,.7),f.set([S.r,S.g,S.b],n*3)}v.setAttribute("color",new Lt(f,3));let H=document.createElement("canvas");H.width=H.height=256;let C=H.getContext("2d");C.fillStyle="#d8d8d8",C.fillRect(0,0,256,256);for(let n=0;n<9e3;n++){let M=150+Math.random()*105;C.fillStyle=`rgb(${M},${M},${M})`,C.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3)}let Y=new kt(H);Y.wrapS=Y.wrapT=Te,Y.colorSpace=It,Y.anisotropy=r?2:8;let lt=v.attributes.uv;for(let n=0;n<lt.count;n++)lt.setXY(n,m.getX(n)/24,m.getZ(n)/24);let N=new Q(v,new ue({vertexColors:!0,map:Y}));N.scale.set(e,l,e),N.receiveShadow=!0,p.add(N);let O=new Q(new Mo(nt.r*2.2,48),new ht({color:2902622,roughness:.08,metalness:.2,transparent:!0,opacity:.88}));O.rotation.x=-Math.PI/2,O.position.set(nt.x*e,q*l,nt.z*e),O.scale.set(e,e,1),p.add(O);let ut=he/h;function Gt(n,M){return l*G(n/e,M/e)}function G(n,M){let A=To((n+he/2)/ut,0,h-1e-6),k=To((M+he/2)/ut,0,h-1e-6),F=Math.floor(A),tt=Math.floor(k),I=A-F,rt=k-tt,vt=E[tt*(h+1)+F],oe=E[tt*(h+1)+F+1],Ot=E[(tt+1)*(h+1)+F],At=E[(tt+1)*(h+1)+F+1];return I+rt<1?vt+(oe-vt)*I+(Ot-vt)*rt:At+(Ot-At)*(1-I)+(oe-At)*(1-rt)}let st=25*e,ft=new Map,yt=[],Bt=(n,M)=>`${Math.floor(n/st)},${Math.floor(M/st)}`;function Ut(n){let M=Bt(n.x,n.z);ft.has(M)||ft.set(M,[]),ft.get(M).push(n)}function qt(n){for(let k of yt)if(n.x>k.x0&&n.x<k.x1&&n.z>k.z0&&n.z<k.z1&&n.y<k.top)return k.name;let M=Math.floor(n.x/st),A=Math.floor(n.z/st);for(let k=-1;k<=1;k++)for(let F=-1;F<=1;F++){let tt=ft.get(`${M+k},${A+F}`);if(tt){for(let I of tt)if(n.y>I.y0&&n.y<I.top&&(n.x-I.x)**2+(n.z-I.z)**2<I.r*I.r)return I.name}}return null}let y=new ue({color:7171176}),D=(n,M,A,k)=>{let F=new Q(new Mt(n*(n>200?e:o),M*o),y);F.rotation.x=-Math.PI/2,F.position.set(A*e,.02,k*o),F.receiveShadow=!0,p.add(F)};D(300,7,120,-28),D(8,22,20,-14),D(8,22,220,-14),D(110,34,120,-56);let wt=new ht({color:9080724,roughness:.6,metalness:.3}),at=new ht({color:5988455,roughness:.5,metalness:.4});for(let n of[90,150]){let M=new Q(new Zt(26*o,6*o,18*o),wt);M.position.set(n*e,3*o,-84*o);let A=new Q(new le(9*o,9*o,26*o,20,1,!1,0,Math.PI),at);A.rotation.z=Math.PI/2,A.position.set(n*e,6*o,-84*o),A.scale.set(.45,1,1),M.castShadow=A.castShadow=!0,yt.push({name:"un hangar",x0:n*e-13*o,x1:n*e+13*o,z0:-93*o,z1:-75*o,top:10*o}),p.add(M,A)}let it=new Q(new le(.06,.08,6,6),new ht({color:14540253}));it.position.set(60*e,3*o,-22*o),it.scale.setScalar(o),Ut({name:"el m\xE1stil de la manga",x:60*e,z:-22*o,y0:0,top:6.2*o,r:.2*o}),p.add(it);let mt=new zt;mt.position.set(60*e,5.9*o,-22*o),mt.scale.setScalar(o);let Rt=new le(.35,.16,2.6,12,5,!0);Rt.rotateZ(-Math.PI/2),Rt.translate(1.3,0,0);let Vt=[],Tt=Rt.attributes.position;for(let n=0;n<Tt.count;n++){let M=Math.floor(Tt.getX(n)/.52)%2;Vt.push(...M?[.95,.95,.95]:[1,.45,.12])}Rt.setAttribute("color",new co(Vt,3));let pe=new Q(Rt,new ht({vertexColors:!0,side:Ne,roughness:.8}));mt.add(pe),p.add(mt);let Dt=0;function Ee(n,M=1/60){let A=Math.hypot(n.x,n.z);Dt+=M,mt.rotation.y=Math.atan2(-n.z,n.x)+Math.sin(Dt*3.1)*.05,mt.rotation.z=-(1-gt(A,.5,7))*1.2+Math.sin(Dt*4.3)*.03}let xt=r?700:2200,Nt=new le(.25,.4,3,5);Nt.translate(0,1.5,0);let me=new go(2.4,8,7);me.translate(0,6.5,0);let ot=new yo(3,0);ot.translate(0,5,0);let ve=new ue({flatShading:!0}),Jt=new be(Nt,new ue({color:4863526}),xt),t=new be(me,ve,xt),J=new be(ot,ve,xt),Ht=new xe,te=new ce,bt=new d,Me=new d,$t=0,Wt=0,Pt=0,ee=0,jt=new ct;for(;$t<xt&&ee++<xt*40;){let n=Xt.x+(Math.random()*2-1)*3e3,M=Xt.z+(Math.random()*2-1)*2600,A=qe(n,M);if(Math.abs(M)<110&&Math.abs(n-120)<360||Math.hypot(n-nt.x,M-nt.z)<nt.r*1.1||Se(n/400+31,M/400+17,3)<(A<1?.56:.44)&&Math.random()>.04)continue;let F=G(n,M);if(F>330||F<q+1)continue;let tt=F*l,I=F>60||A>1.2&&Math.random()<.7,rt=(.7+Math.random()*.8)*c,vt=rt*(.9+Math.random()*.4);te.setFromAxisAngle(new d(0,1,0),Math.random()*Math.PI*2),Ht.compose(Me.set(n*e,tt-.3,M*e),te,bt.set(rt,vt,rt)),Ut({name:"un \xE1rbol",x:n*e,z:M*e,y0:tt-.3,top:tt-.3+(I?10.5:8)*vt,r:(I?1.5:2.3)*rt}),Jt.setMatrixAt($t++,Ht),jt.setHSL(I?.3+Math.random()*.04:.22+Math.random()*.08,.45,I?.16+Math.random()*.06:.22+Math.random()*.08),I?(t.setMatrixAt(Wt,Ht),t.setColorAt(Wt++,jt)):(J.setMatrixAt(Pt,Ht),J.setColorAt(Pt++,jt))}Jt.count=$t,t.count=Wt,J.count=Pt;for(let n of[Jt,t,J])n.castShadow=!r,n.instanceMatrix.needsUpdate=!0,n.instanceColor&&(n.instanceColor.needsUpdate=!0),p.add(n);return{group:p,heightAt:Gt,setWind:Ee,hit:qt,scale:e,side:o}}var Lo=1.225,Ce=9.81,Go={m:7.2,S:.34,b:1.34,c:.28,I:new d(.28,.85,.62)},Bo={a:4.6,z:0,flap:.55,de:.35,stall:P.degToRad(15)},Uo={z:.028,k:.065,flap:.05,gear:.018},qo={z:0,a:-.9,q:-14,de:-1.15,flap:-.06},Do={b:-.08,p:-.48,da:.2,r:.08},$o={b:.13,r:-.18,dr:-.09},Wo=[{p:new d(.6,-.18,0),steer:!0},{p:new d(-.04,-.18,.238)},{p:new d(-.04,-.18,-.238)}],jo=[[.78,0,0],[-.8,.05,0],[-.68,.32,0],[-.12,.02,.67],[-.12,.02,-.67],[.2,.1,0]].map(r=>new d(...r)),Oo=[[.5,-.06,0],[-.3,-.06,0],[-.04,-.07,.24],[-.04,-.07,-.24]].map(r=>({p:new d(...r)})),_o={AC:Go,CL:Bo,CD:Uo,CM:qo,CR:Do,CN:$o,WHEELS:Wo,SKIN:jo,BELLY:Oo,world:1,size:1,vref:22,ground:.185,eye:[.486,.09],tips:[new d(-.12,.02,.67),new d(-.12,.02,-.67)]};function on({model:r,parts:s,S:i,m:e,AR:l,e:o,cd0:c,vref:p,eye:h,canopy:v=[],thrust:m,hud:E,world:q=10,flapDeg:u}){let f=Math.sqrt(l*i),S=i/f;r.updateMatrixWorld(!0);let w=r.matrixWorld.clone().invert(),V=y=>new so().setFromObject(y).applyMatrix4(w),g=V(r),R=g.max.x-g.min.x,T=s.filter(y=>/tren|gear|rueda|wheel/i.test(y.data.part+" "+(y.data.label??""))).map(y=>V(y.obj)).filter(y=>isFinite(y.min.y)).map(y=>({p:new d((y.min.x+y.max.x)/2,y.min.y,(y.min.z+y.max.z)/2)}));if(T.length<3){let y=g.min.y;T=[{p:new d(g.min.x+.78*R,y,0)},{p:new d(g.min.x+.38*R,y,.12*f)},{p:new d(g.min.x+.38*R,y,-.12*f)}]}T.sort((y,D)=>D.p.x-y.p.x),T[0].steer=!0;let H=T.slice(1).reduce((y,D)=>y+D.p.x,0)/(T.length-1),C=new d(H+.1*(T[0].p.x-H),(g.min.y+g.max.y)/2,0);for(let y of T)y.p.sub(C);let Y=Math.min(...T.map(y=>y.p.y)),lt=-Y+.02,N=new d,O=new d,ut=-1/0,Gt=1/0,G=new d;r.traverse(y=>{if(!y.isMesh)return;let D=y.geometry.attributes.position,wt=w.clone().multiply(y.matrixWorld);for(let at=0;at<D.count;at+=7)G.fromBufferAttribute(D,at).applyMatrix4(wt),G.z>ut&&(ut=G.z,N.copy(G)),G.z<Gt&&(Gt=G.z,O.copy(G))});let st=new Set;for(let y of v)y.traverse(D=>st.add(D));let ft=-1/0;r.traverse(y=>{if(!y.isMesh||st.has(y))return;let D=y.geometry.attributes.position,wt=w.clone().multiply(y.matrixWorld);for(let at=0;at<D.count;at+=3)G.fromBufferAttribute(D,at).applyMatrix4(wt),Math.abs(G.x-h[0])<.4&&Math.abs(G.z)<.35&&G.y>ft&&(ft=G.y)});let yt=Math.max(h[1],ft+.15);N.sub(C),O.sub(C),g.min.sub(C),g.max.sub(C);let Bt=[new d(g.max.x,(g.min.y+g.max.y)/2-.1*(g.max.y-g.min.y),0),new d(g.min.x,Y+.35*(g.max.y-Y),0),new d(g.min.x+.1*R,g.max.y,0),N.clone(),O.clone()],Ut=[[.75,0],[.3,0],[.45,.25],[.45,-.25]].map(([y,D])=>({p:new d(g.min.x+y*R,Y+.15*(g.max.y-Y),D*f*.5)})),qt=2*Math.PI*l/(2+Math.sqrt(l*l+4));return{AC:{m:e,S:i,b:f,c:S,I:new d(e*(.22*f)**2,e*(.32*R)**2,e*(.3*R)**2)},CL:{a:qt,z:.02,flap:.35,de:.3,stall:P.degToRad(l<3?24:16)},CD:{z:c,k:1/(Math.PI*o*l),flap:.04,gear:.015},CM:{z:0,a:-.55,q:-10,de:-.8,flap:-.04},CR:{b:-.06,p:-.4,da:.12,r:.06},CN:{b:.1,r:-.15,dr:-.07},WHEELS:T,SKIN:Bt,BELLY:Ut,world:q,size:R/1.6,vref:p,ground:lt,eye:[h[0]-C.x,yt-C.y],canopy:v,tips:[N,O],thrust:m,hud:E,cg:C,flapDeg:u}}function nn({scene:r,renderer:s,camera:i,model:e,op:l,motor:o,lite:c,setGear:p,setSurfaces:h,gearState:v,pad:m,airframe:E=_o,envSize:q=128}){let{AC:u,CL:f,CD:S,CM:w,CR:V,CN:g,WHEELS:R,SKIN:L,BELLY:T}=E,H=E.world,C=E.size,Y=E.vref,lt=Y/22,N=u.m/7.2,O=new zt;O.visible=!1,r.add(O);let ut=null;function Gt(){ut=bo({lite:c,scale:H,vscale:H>1?3:1}),O.add(ut.group);let a=document.createElement("canvas");a.width=256,a.height=4096;let x=a.getContext("2d");x.fillStyle="#2b2c2e",x.fillRect(0,0,256,4096);for(let B=0;B<4e3;B++)x.fillStyle=`rgba(255,255,255,${Math.random()*.04})`,x.fillRect(Math.random()*256,Math.random()*4096,2,2);x.fillStyle="#e8e6e0";for(let B=300;B<3800;B+=160)x.fillRect(124,B,8,80);x.fillRect(8,0,6,4096),x.fillRect(242,0,6,4096);for(let B=0;B<8;B++)x.fillRect(24+B*26,60,14,160),x.fillRect(24+B*26,3876,14,160);let z=new kt(a);z.colorSpace=It,z.anisotropy=c?2:8;let b=new Q(new Mt(14*ut.side*(H>1?1.3:1),320*H),new ht({map:z,roughness:.85}));return b.rotation.x=-Math.PI/2,b.rotation.z=Math.PI/2,b.position.set(120*H,.03,0),b.receiveShadow=!0,O.add(b),ut}let G=()=>ut??Gt(),st=new de;st.scale.setScalar(1e4);let ft=new d().setFromSphericalCoords(1,P.degToRad(60),P.degToRad(160));Object.assign(st.material.uniforms.sunPosition.value,ft),st.material.uniforms.turbidity.value=4,st.material.uniforms.rayleigh.value=1.4;let yt=new po;yt.add(st);let Bt=null;function Ut(){let a=new ho(c?256:512,{type:no});return new uo(1,2e4,a).update(s,yt),a.texture}let qt=null,y=null,D=null,wt=1,at=new zt;O.add(at);let it=70,mt=E.tips,Rt=mt.map(()=>{let a=new Be;a.setAttribute("position",new Lt(new Float32Array(it*3),3)),a.setAttribute("color",new Lt(new Float32Array(it*4),4));let x=new mo(a,new Ue({vertexColors:!0,transparent:!0,depthWrite:!1}));return x.frustumCulled=!1,at.add(x),{geo:a,n:0}}),Vt=c?70:160,Tt=new Be,pe=new Float32Array(Vt*6),Dt=new Float32Array(Vt*8);Tt.setAttribute("position",new Lt(pe,3)),Tt.setAttribute("color",new Lt(Dt,4));let Ee=new vo(Tt,new Ue({vertexColors:!0,transparent:!0,depthWrite:!1}));Ee.frustumCulled=!1,at.add(Ee);let xt=Array.from({length:Vt},()=>({p:new d,seed:Math.random()}));function Nt(a,x){let z=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0).applyQuaternion(t.q),b=new d(0,1,0).cross(z).normalize(),B=z.clone().cross(b).normalize(),pt=(.5+Math.random()*2.2)*C,Z=Math.random()*Math.PI*2;a.p.copy(t.p).addScaledVector(z,(x?6+Math.random()*10:(Math.random()-.3)*16)*C).addScaledVector(b,Math.cos(Z)*pt).addScaledVector(B,Math.sin(Z)*pt*.7)}function me(a,x){let z=P.smoothstep(x.V,6*lt,30*lt),b=x.onGround?0:z*P.clamp(.25+x.alpha*5,0,1);mt.forEach((Z,$)=>{let W=Rt[$],X=W.geo.attributes.position.array,U=W.geo.attributes.color.array;X.copyWithin(3,0,(it-1)*3),U.copyWithin(4,0,(it-1)*4);let et=Z.clone().applyQuaternion(t.q).add(t.p);X.set([et.x,et.y,et.z],0),U.set([1,1,1,b*.75],0),W.n=Math.min(it,W.n+1);for(let _=0;_<it;_++)U[_*4+3]*=_===0?1:.985;for(let _=0;_<it;_++){let _t=_*3;X[_t]+=ot.x*a,X[_t+1]+=(ot.y-.15)*a,X[_t+2]+=ot.z*a}if(W.n<it)for(let _=W.n;_<it;_++)X.copyWithin(_*3,(W.n-1)*3,W.n*3),U[_*4+3]=0;W.geo.attributes.position.needsUpdate=W.geo.attributes.color.needsUpdate=!0});let B=ot.clone().sub(t.v),pt=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0);for(let Z=0;Z<Vt;Z++){let $=xt[Z];$.p.addScaledVector(ot,a);let W=$.p.clone().sub(t.p);(W.dot(pt)<-10*C||W.length()>20*C)&&Nt($,!0);let X=1-P.smoothstep($.p.distanceTo(t.p),1.5*C,9*C),U=z*X*(.25+.35*$.seed),et=$.p.clone().addScaledVector(B,-.05);pe.set([$.p.x,$.p.y,$.p.z,et.x,et.y,et.z],Z*6),Dt.set([.9,.95,1,U,.9,.95,1,0],Z*8)}Tt.attributes.position.needsUpdate=Tt.attributes.color.needsUpdate=!0}let ot=new d,ve=new d(-1.6,0,.2);function Jt(a,x){let z=.6+.4*Math.sin(a*.37)*Math.sin(a*.11+1.3),b=P.clamp(x/25,.1,1)*.55;ot.copy(ve).multiplyScalar(z),ot.x+=b*(Math.sin(a*1.7)+.5*Math.sin(a*4.3+2)),ot.y+=b*.6*(Math.sin(a*2.1+.7)+.5*Math.sin(a*5.9)),ot.z+=b*(Math.sin(a*1.3+4)+.5*Math.sin(a*3.7+1))}let t={p:new d,v:new d,q:new ce,w:new d,throttle:0,roll:0,pitch:0,yaw:0,flap:.5,brake:0,gearUp:!1,crashed:!1,cam:"chase",t:0,assist:!0},J=new Set,Ht={pos:e.position.clone(),quat:e.quaternion.clone()};function te(){t.p.set(H>1?-34*H:0,E.ground,0),t.v.set(0,0,0),t.q.identity(),t.w.set(0,0,0),t.throttle=0,t.flap=.5,t.gearUp=!1,t.onGround=!0,t.hold=0,t.bankHold=0,t.trim=0,t.crashed=!1,t.crashWhy="",v.target=0;for(let a of Rt)a.n=0;for(let a of xt)Nt(a,!1)}let bt={gear(){!t.onGround&&t.p.y>E.ground+1.3*Math.max(1,H*.4)&&(t.gearUp=!t.gearUp,v.target=t.gearUp?1:0)},flap(){t.flap=t.flap>.6?0:t.flap+.5},cam(){t.cam=t.cam==="chase"?"cockpit":"chase"},reset:te,engine(){o.on=!o.on},assist(){t.assist=!t.assist}},Me=a=>x=>{let z=x.key.toLowerCase();a&&!x.repeat&&(z==="g"&&bt.gear(),z==="f"&&bt.flap(),z==="c"&&bt.cam(),z==="r"&&bt.reset(),z==="e"&&bt.engine(),z==="t"&&bt.assist()),["w","s","a","d","q","e","shift","control","b","arrowup","arrowdown"," "].includes(z)&&x.preventDefault(),a?J.add(z):J.delete(z)},$t=Me(!0),Wt=Me(!1),Pt=null,ee=()=>!!(m!=null&&m.touch),jt=new d;function n(a){t.crashed||(t.crashed=!0,t.crashWhy=a,t.v.set(0,0,0),t.w.set(0,0,0))}let M=new d;function A(a){let x=(j,K)=>(J.has(j)?1:0)-(J.has(K)?1:0),z=j=>Math.max(-1,Math.min(1,j)),b=Pt;t.pitch+=(z(x("s","w")+((b==null?void 0:b.pitch)??0))-t.pitch)*Math.min(1,a*6),t.roll+=(z(x("d","a")+((b==null?void 0:b.roll)??0))-t.roll)*Math.min(1,a*7);let B=z(x("z","x")+((b==null?void 0:b.yaw)??0)),pt=new d(1,0,0).applyQuaternion(t.q),Z=Math.atan2(pt.z,pt.x),$=t.v.length();if(!t.onGround||Math.abs(B)>.02||$<1||$>25*lt)t.hold=Z;else if(t.assist){let j=P.clamp(10*lt/$,.4,1);B=P.clamp(Math.atan2(Math.sin(Z-t.hold),Math.cos(Z-t.hold))*6+t.w.y*.4,-j,j)}t.yaw+=(B-t.yaw)*Math.min(1,a*5),(J.has("shift")||J.has("arrowup"))&&(t.throttle=Math.min(1,t.throttle+a*.5)),(J.has("control")||J.has("arrowdown"))&&(t.throttle=Math.max(0,t.throttle-a*.5)),(b==null?void 0:b.throttle)!=null&&(t.throttle=b.throttle),b!=null&&b.throttleRate&&(t.throttle=Math.min(1,Math.max(0,t.throttle+b.throttleRate*a*.6))),t.brake=J.has("b")||J.has(" ")?1:0,o.target=t.throttle;let W=new xe().makeRotationFromQuaternion(t.q),X=W.clone().transpose();t.t+=a,Jt(t.t,t.p.y),M.copy(t.v).sub(ot).applyMatrix4(X);let U=Math.max(.01,M.length()),et=Math.atan2(-M.y,M.x),_=Math.asin(P.clamp(M.z/U,-1,1)),_t=Lo*Math.pow(Math.max(.05,1-22558e-9*Math.max(0,t.p.y)),4.2559),St=.5*_t*U*U,Oe=E.thrust?E.thrust({V:U,h:t.p.y,rho:_t}):o.on?l(o.f).thrust*o.spin:0,ke=t.assist?P.clamp((Y/Math.max(U,1))**2,.22,1):1,_e=-t.pitch*P.degToRad(16)*ke,So=t.roll*P.degToRad(20)*ke,Ve=-t.yaw*P.degToRad(22)*Math.max(ke,.45),Kt=t.flap*.8,Co=1-v.t,ge=f.z+f.a*et+f.flap*Kt-f.de*_e*.1;Math.abs(et)>f.stall&&(ge=Math.sign(et)*(f.a*f.stall)*Math.max(.35,1-(Math.abs(et)-f.stall)*3)+f.flap*Kt*.5);let zo=S.z+S.k*ge*ge+S.flap*Kt+S.gear*Co+.4*Math.max(0,Math.abs(et)-f.stall),ne=new d;if(U>.5){let j=M.clone().normalize(),K=new d(0,0,1).cross(j).normalize();ne.addScaledVector(K,St*u.S*ge),ne.addScaledVector(j,-St*u.S*zo),ne.z+=-St*u.S*.6*_}ne.x+=Oe;let Ke=t.w.x*u.b/(2*U),Pe=t.w.y*u.b/(2*U),Ae=t.w.z*u.c/(2*U),ko=u.m*Ce/Math.max(1,St*u.S)-f.flap*Kt;t.trim+=(-w.a*P.clamp(ko/f.a,0,f.stall*.7)-w.flap*Kt-t.trim)*Math.min(1,a*.8);let Vo=t.onGround?0:t.trim,Qt=new d(St*u.S*u.b*(V.b*_+V.p*Ke+V.da*So+V.r*Pe),St*u.S*u.b*(g.b*-_+g.r*Pe+g.dr*Ve),St*u.S*u.c*(w.z+w.a*et+w.q*Ae+w.de*_e+w.flap*Kt+Vo));if(t.assist&&U>8*lt){let j=new d(0,0,1).applyQuaternion(t.q),K=Math.asin(P.clamp(-j.y,-1,1)),Ct=Math.asin(P.clamp(t.v.y/U,-1,1)),Et=St*u.S,dt=Math.abs(t.roll)>=.05;dt&&(t.bankHold=K);let re=Math.abs(t.bankHold??0)<P.degToRad(12)?0:P.clamp(t.bankHold,-.79,.79);dt?Qt.x+=Et*u.b*-.2*Ke:Qt.x+=u.I.x*6*(.8*(re-K)-t.w.x);let Ft=u.m*Ce/Math.max(1,Et*u.S)*(1/Math.max(.45,Math.cos(K))-1)/f.a;Qt.z+=Math.abs(t.pitch)<.05?Et*u.c*(-.6*Ct-3*Ae-w.a*Ft):Et*u.c*-3*Ae,Qt.z+=Et*u.c*-2.5*Math.max(0,et-.8*f.stall);let ie=-(Ce*Math.tan(P.clamp(K,-1.2,1.2)))/U*Math.cos(K)*u.b/(2*U);Qt.y+=Et*u.b*(-.03*_-.5*(Pe-ie))}let Fe=ne.clone().applyMatrix4(W);Fe.y-=u.m*Ce;let Qe=new d,ye=!1,ae=v.t<.05?R:T;for(let j of ae){let K=j.p.clone().applyQuaternion(t.q),Ct=K.clone().add(t.p),Et=G().heightAt(Ct.x,Ct.z)-Ct.y;if(Et<=0)continue;Et>.3*C&&n("contra el terreno"),ye=!0;let dt=t.v.clone().add(new d().copy(t.w).applyQuaternion(t.q).cross(K)),re=Math.max(0,1250*N*7.2*Et/C-36*N*7.2*dt.y),se=new d(0,re,0),Ft=new d(1,0,0).applyQuaternion(t.q).setY(0).normalize(),ie=new d(0,1,0).cross(Ft),Ao=ae===T?.5:.02+.5*t.brake,Ze=u.m/ae.length,Ge=dt.dot(Ft);se.addScaledVector(Ft,-Math.sign(Ge)*Math.min(Math.abs(Ge)*40*N,Ao*re,.5*Ze*Math.abs(Ge)/a));let Xe=j.steer?dt.dot(ie)+Ft.dot(dt)*Ve*.8:dt.dot(ie),Ye=Math.min(.9*re,.5*Ze*Math.abs(Xe)/a+(j.steer?Math.abs(Ft.dot(dt)*Ve)*400*N:0));se.addScaledVector(ie,-P.clamp(Xe*400*N,-Ye,Ye)),Fe.add(se),Qe.add(K.clone().cross(se)),ae===T&&-dt.y>2.5&&n("aterrizaje de panza demasiado fuerte"),ae===R&&-dt.y>4&&n("aterrizaje demasiado fuerte, se rompi\xF3 el tren")}t.v.addScaledVector(Fe,a/u.m),t.p.addScaledVector(t.v,a);for(let j of L){let K=jt.copy(j).applyQuaternion(t.q).add(t.p),Ct=G().hit(K);if(Ct){n(`choque contra ${Ct}`);break}if(G().heightAt(K.x,K.z)-K.y>.03*C){n(j.z?"una punta de ala toc\xF3 el suelo":j.x>0?"el morro contra el suelo":"la cola contra el suelo");break}}let Ie=Qt.add(Qe.applyMatrix4(X)),Po=new d(u.I.x*t.w.x,u.I.y*t.w.y,u.I.z*t.w.z),Le=t.w.clone().cross(Po);t.w.x+=(Ie.x-Le.x)/u.I.x*a,t.w.y+=(Ie.y-Le.y)/u.I.y*a,t.w.z+=(Ie.z-Le.z)/u.I.z*a,ye&&t.w.multiplyScalar(.995);let we=t.q.clone().multiply(new ce(t.w.x*a*.5,t.w.y*a*.5,t.w.z*a*.5,0));return t.q.x+=we.x,t.q.y+=we.y,t.q.z+=we.z,t.q.w+=we.w,t.q.normalize(),h({roll:t.roll,pitch:t.pitch,yaw:t.yaw,flap:t.flap}),t.onGround=ye,{V:U,alpha:et,onGround:ye,thrust:Oe}}let k={V:0,alpha:0,onGround:!0,thrust:0},F=!1;function tt(a,x){F=!0,Pt=x;for(let z=0;z<8;z++)k=A(a/8);return k}let I=new d(-3.4*C,.9*C,0);function rt(a){if(t.crashed){Ot(`<b>Accidente</b> \xB7 ${t.crashWhy}<br>${ee()?"Reinicio":"R"} para volver a la pista`);return}if(!F){Pt=(m==null?void 0:m.read())??null;for(let X=0;X<8;X++)k=A(a/8)}me(a,k),G().setWind(ot,a),e.position.copy(t.p),E.cg&&e.position.sub(jt.copy(E.cg).applyQuaternion(t.q)),e.quaternion.copy(t.q);let x=new d(1,0,0).applyQuaternion(t.q),z=new d(0,1,0).applyQuaternion(t.q);if(t.cam==="chase"){let X=(i.aspect<1?2.6:3.4)*C,U=x.clone().multiplyScalar(-X).add(new d(0,X*.27,0));I.lerp(U,Math.min(1,a*3)),i.position.copy(t.p).add(I),i.up.set(0,1,0),i.lookAt(t.p.clone().addScaledVector(x,2*C).add(new d(0,(ee()?-.8:-.5)*C,0)))}else i.position.copy(t.p).addScaledVector(x,E.eye[0]).addScaledVector(z,E.eye[1]),i.up.copy(z),i.lookAt(i.position.clone().addScaledVector(x,10*C).addScaledVector(z,-1.7*C));let b=t.cam==="chase"?null:70;b&&i.fov!==b&&(i.fov=b,i.updateProjectionMatrix()),!b&&t.cam!==rt.cam&&At(),t.cam!==rt.cam&&vt(t.cam!=="cockpit"),rt.cam=t.cam;let B=E.hud?null:l(o.f),pt=Math.max(0,t.p.y-G().heightAt(t.p.x,t.p.z)),Z=k.V*3.6,$=t.v.y,W=k.alpha>f.stall;if(innerWidth<560){Ot(`<b>${Z.toFixed(0)}</b> km/h \xB7 <b>${pt.toFixed(0)}</b> m \xB7 ${$>=0?"+":""}${$.toFixed(1)} m/s<br>`+(E.hud?E.hud(k,t,!0):o.on?`<b>${Math.round(B.n*o.spin/1e3)}k</b> rpm \xB7 ${k.thrust.toFixed(0)} N \xB7 gas ${(t.throttle*100).toFixed(0)} %`:"MW54 apagada \xB7 Motor para arrancar")+(W?"<br><b>P\xC9RDIDA</b> \xB7 baja el morro":t.brake?"<br>frenos":""));return}Ot(`<b>${Z.toFixed(0)}</b> km/h \xB7 <b>${pt.toFixed(1)}</b> m \xB7 ${$>=0?"+":""}${$.toFixed(1)} m/s \xB7 \u03B1 ${P.radToDeg(k.alpha).toFixed(0)}\xB0<br>`+(E.hud?E.hud(k,t,!1):`MW54 ${o.on?`<b>${Math.round(B.n*o.spin).toLocaleString("es-ES")}</b> rpm \xB7 ${k.thrust.toFixed(0)} N \xB7 EGT ${Math.round(15+(B.egt-15)*o.heat)} \xB0C`:`apagada (${ee()?"Motor":"E"} para arrancar)`} \xB7 gas ${(t.throttle*100).toFixed(0)} %`)+`<br>Viento ${ot.length().toFixed(1)} m/s \xB7 Tren ${v.t<.05?"abajo":v.t>.95?"arriba":"en tr\xE1nsito"} \xB7 flaps ${(t.flap*(E.flapDeg??40)).toFixed(0)}\xB0 \xB7 gir\xF3scopo ${t.assist?"s\xED":"no"}${t.brake?" \xB7 frenos":""}${W?" \xB7 <b>P\xC9RDIDA</b>":""}`)}function vt(a){for(let x of E.canopy??[])x.visible=a}let oe="";function Ot(a){a!==oe&&(oe=a,document.getElementById("hud").innerHTML=a)}function At(){i.fov=P.clamp(P.radToDeg(2*Math.atan(Math.tan(P.degToRad(28))/i.aspect)),40,66),i.updateProjectionMatrix()}function ze(a,x=a){a&&G(),a&&!O.visible&&(Bt??=Ut(),y??=new Ro(s).fromScene(yt,0,1,2e4,{size:q}).texture,qt=r.background,r.background=Bt,D=r.environment,wt=r.environmentIntensity,r.environment=y,r.environmentIntensity=.55),!a&&O.visible&&(r.background=qt,r.environment=D,r.environmentIntensity=wt),O.visible=a,at.visible=x;let z=Math.sqrt(H);r.fog=a?new fo(11124692,900*z,(c?4500:6500)*z):null,i.up.set(0,1,0),i.near=a?.004*C:.01,i.far=a?12e3*H:50,a?At():(i.fov=32,i.updateProjectionMatrix())}return{enter(){ze(!0),te(),m==null||m.reset(0),addEventListener("keydown",$t),addEventListener("keyup",Wt),I.set(-3.4*C,.9*C,0)},exit(){ze(!1),removeEventListener("keydown",$t),removeEventListener("keyup",Wt),J.clear(),vt(!0),rt.cam=null,document.fullscreenElement&&document.exitFullscreen().catch(()=>{}),e.position.copy(Ht.pos),e.quaternion.copy(Ht.quat)},update:rt,simulate:tt,endTest(){F=!1},fit:At,showWorld:ze,home:Ht,get terrain(){return G()},airframe:E,state:t}}var $e=4;function We(r){let s=(c,p)=>{let h=new Float32Array(c*c),v=p;for(let m=0;m<h.length;m++)v=v*1664525+1013904223>>>0,h[m]=v/4294967296;return(m,E)=>{let q=m*c,u=E*c,f=Math.floor(q),S=Math.floor(u),w=q-f,V=u-S;w=w*w*(3-2*w),V=V*V*(3-2*V);let g=(R,L)=>h[(L%c+c)%c*c+(R%c+c)%c];return(g(f,S)*(1-w)+g(f+1,S)*w)*(1-V)+(g(f,S+1)*(1-w)+g(f+1,S+1)*w)*V}},i=[[5,.25],[12,.25],[30,.2],[80,.15],[200,.15]].map(([c,p],h)=>[s(c,7+h*31),p]),e=[s(3,101),s(11,202)],l=new Uint8ClampedArray(r*r*4),o=new Uint8ClampedArray(r*r*4);for(let c=0;c<r;c++)for(let p=0;p<r;p++){let h=p/r,v=c/r,m=0;for(let[V,g]of i)m+=V(h,v)*g;let E=Math.random(),q=E>.985?.12*Math.random():E<.01?-.16*Math.random():(Math.random()-.5)*.04,u=36+(m-.5)*12+q*110,f=(c*r+p)*4;l[f]=u,l[f+1]=u+2,l[f+2]=u+5,l[f+3]=255;let w=160+(.5*e[0](h,v)+.5*e[1](h,v)-.5)*60+Math.abs(q)*300;o[f]=o[f+1]=o[f+2]=w,o[f+3]=255}return{c:l,r:o}}function Ko(r,s){let i=[["#24262a"],["#a0a0a0"]].map(([o])=>{let c=document.createElement("canvas");c.width=c.height=s;let p=c.getContext("2d");return p.fillStyle=o,p.fillRect(0,0,s,s),c}),e=i.map(o=>{let c=new kt(o);return c.wrapS=c.wrapT=Te,c.anisotropy=r.capabilities.getMaxAnisotropy(),c});e[0].colorSpace=It;let l=({c:o,r:c})=>{[o,c].forEach((p,h)=>{i[h].getContext("2d").putImageData(new ImageData(p,s,s),0,0),e[h].needsUpdate=!0})};try{let o=`onmessage = (e) => { const o = (${We})(e.data); postMessage(o, [o.c.buffer, o.r.buffer]); close(); };`,c=URL.createObjectURL(new Blob([o],{type:"text/javascript"})),p=new Worker(c);p.onmessage=h=>{l(h.data),URL.revokeObjectURL(c)},p.onerror=h=>{h.preventDefault(),URL.revokeObjectURL(c),l(We(s))},p.postMessage(s)}catch{l(We(s))}return e}function Qo(r,s,i){r.onBeforeCompile=e=>{e.uniforms.uFade={value:new ro(s,i)},e.uniforms.uBg={value:new ct(855826)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;
uniform vec2 uFade;
uniform vec3 uBg;`).replace("#include <tonemapping_fragment>",`gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));
#include <tonemapping_fragment>`)}}function Zo(r,{W:s,D:i,box:e,dash:l,stops:o,stop:c}){let p=Math.min(512,2600/s),h=document.createElement("canvas");h.width=s*p,h.height=i*p;let v=h.getContext("2d"),m=R=>(R+s/2)*p,E=R=>(R+i/2)*p,q="#d9a93a";v.fillStyle=q;for(let[R,L]of[[e.x0,1],[e.x1,-1]])for(let[T,H]of[[e.z0,1],[e.z1,-1]])v.fillRect(Math.min(m(R),m(R+L*e.arm)),Math.min(E(T),E(T+H*e.w)),e.arm*p,e.w*p),v.fillRect(Math.min(m(R),m(R+L*e.w)),Math.min(E(T),E(T+H*e.arm)),e.w*p,e.arm*p);let[u,f,S]=l;for(let R=e.x0+f/2;R<e.x1-1.5*f;R+=f)v.fillRect(m(R),E(-S/2),u*p,S*p);let w=f*.7;v.beginPath(),v.moveTo(m(e.x1-w*.3),E(0)),v.lineTo(m(e.x1-w),E(-w*.28)),v.lineTo(m(e.x1-w),E(w*.28)),v.closePath(),v.fill(),v.fillStyle="#e6e2d6";for(let[R,L]of o)v.fillRect(m(R-c[0]*2.3),E(L-c[1]/2),c[0]*p,c[1]*p);v.globalCompositeOperation="destination-out";for(let R=0;R<14e3;R++)v.fillStyle=`rgba(0,0,0,${Math.random()*.6})`,v.fillRect(Math.random()*h.width,Math.random()*h.height,1+Math.random(),1+Math.random());let V=new kt(h);V.colorSpace=It,V.anisotropy=r.capabilities.getMaxAnisotropy();let g=new Q(new Mt(s,i),new ht({map:V,transparent:!0,roughness:.5,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));return g.rotation.x=-Math.PI/2,g.receiveShadow=!0,g}function Xo({w:r,d:s,x:i}){let e=document.createElement("canvas");e.width=e.height=256;let l=e.getContext("2d"),o=l.createRadialGradient(128,128,0,128,128,128);o.addColorStop(0,"rgba(0,0,0,0.55)"),o.addColorStop(.5,"rgba(0,0,0,0.22)"),o.addColorStop(1,"rgba(0,0,0,0)"),l.fillStyle=o,l.fillRect(0,0,256,256);let c=new Q(new Mt(r,s),new io({map:new kt(e),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return c.rotation.x=-Math.PI/2,c.position.x=i,c}function rn(r,{y:s,fade:i,stand:e,ao:l,res:o=2048}){let[c,p]=Ko(r,o),h=Math.ceil(i[1]*2.2/$e);for(let q of[c,p])q.repeat.set(h,h);let v=new ht({map:c,roughnessMap:p,roughness:.7,metalness:0,envMapIntensity:.35});Qo(v,i[0],i[1]);let m=new zt,E=new Q(new Mt($e*h,$e*h),v);return E.rotation.x=-Math.PI/2,E.receiveShadow=!0,m.add(E,Zo(r,e),Xo(l)),m.position.y=s,m}var fe=64;function je(r,s){for(let l=0;l<r.length-1;l++){let[o,c,p]=r[l],[h,v,m]=r[l+1];if(s<=h){let E=(s-o)/Math.max(1e-6,h-o),q=p+(m-p)*E;return c.map((u,f)=>(u+(v[f]-u)*E)*q)}}let[,i,e]=r[r.length-1];return i.map(l=>l*e)}function cn(r,s,{steps:i=40}={}){var m,E,q;let e=new Float32Array(fe*2*4),l=new Eo(e,fe,2,ao,oo);l.magFilter=l.minFilter=eo,l.wrapS=l.wrapT=to;let o={uTime:{value:0},uIntensity:{value:0},uReach:{value:1},uDiamond:{value:0},uSpacing:{value:((m=s.diamonds)==null?void 0:m.spacing)??.1},uCount:{value:((E=s.diamonds)==null?void 0:E.count)??6},uDiaColor:{value:new ct(...((q=s.diamonds)==null?void 0:q.color)??[1,.85,.6])},uGrad:{value:l},uTurb:{value:s.turbulence??1}},c=new He({uniforms:o,transparent:!0,depthWrite:!1,blending:Je,side:Re,defines:{STEPS:i},vertexShader:`
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
      }`}),p=[],h={};function v(u){let f=Object.keys(s.modes);for(let S=0;S<2;S++)for(let w=0;w<fe;w++){let V=w/(fe-1),g=[0,0,0];for(let R of f){if(!u[R])continue;let L=je(s.modes[R][S?"edge":"core"],V);for(let T=0;T<3;T++)g[T]+=L[T]*u[R]}e.set([g[0],g[1],g[2],1],(S*fe+w)*4)}l.needsUpdate=!0}return{add(u,f,{length:S,r:w,h:V=1,w:g=1,light:R=!0}){let L=new Zt(1,2,2);L.translate(-.5,0,0);let T=new Q(L,c);T.position.copy(f),T.scale.set(S,w*V,w*g),T.frustumCulled=!1,T.userData.noAO=!0,T.visible=!1,u.add(T);let H=null;return R&&s.light&&(H=new wo(16755302,0,s.light.distance,2),H.position.copy(f).add(new d(-S*.12,0,0)),u.add(H)),p.push({mesh:T,lamp:H}),T},update({w:u,level:f,optimal:S,reach:w=1,time:V,visible:g}){Object.keys(u).some(H=>Math.abs((h[H]??0)-u[H])>.01)&&(h={...u},v(h)),o.uTime.value=V,o.uIntensity.value=f*(s.brightness??1),o.uDiamond.value=S,o.uReach.value=w;let R=je(Object.values(s.modes)[0].core,.1),L=[0,0,0];for(let[H,C]of Object.entries(h)){if(!C)continue;let Y=je(s.modes[H].core,.15);L=L.map((lt,N)=>lt+Y[N]*C)}let T=Math.max(...L,.001);for(let H of p)H.mesh.visible=g&&f>.01,H.lamp&&(H.lamp.visible=H.mesh.visible,H.lamp.color.setRGB(L[0]/T,L[1]/T,L[2]/T),H.lamp.intensity=s.light.intensity*f*Math.min(1,T/2)*(.92+.08*Math.sin(V*37+R[0])))}}}export{on as a,nn as b,rn as c,cn as d};
