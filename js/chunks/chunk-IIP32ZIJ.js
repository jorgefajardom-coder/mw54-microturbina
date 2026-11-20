import{B as oo,Ba as mo,Ea as be,F as no,G as ao,Ga as Be,Ha as vo,I as ro,Ia as Mo,Ma as zt,Oa as go,Pa as le,Q as It,Qa as yo,Sa as wo,Ta as gt,U as F,V as so,W as ce,Wa as ht,X as d,Za as ue,aa as io,da as xe,e as Re,f as Je,fa as ut,h as to,ha as co,ja as Lt,jb as Ro,ka as lo,la as Ue,ma as Z,na as Zt,oa as uo,pa as He,sa as ho,ta as fo,tb as To,ua as Ct,v as Te,va as po,w as eo,wa as Eo}from"./chunk-V5OSS73Z.js";var de=class r extends Z{constructor(){let s=r.SkyShader,i=new He({name:s.name,uniforms:uo.clone(s.uniforms),vertexShader:s.vertexShader,fragmentShader:s.fragmentShader,side:Re,depthWrite:!1});super(new Zt(1,1,1),i),this.isSky=!0}};de.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new d},up:{value:new d(0,1,0)}},vertexShader:`
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

		}`};var{smoothstep:yt,clamp:xo}=F,he=12e3,Xt={x:120,z:60,rx:750,rz:600},rt={x:-480,z:680,r:170},Yt=(r,s)=>{let i=Math.sin(r*127.1+s*311.7)*43758.5453;return i-Math.floor(i)};function Ho(r,s){let i=Math.floor(r),e=Math.floor(s),l=r-i,o=s-e;l=l*l*(3-2*l),o=o*o*(3-2*o);let c=Yt(i,e),E=Yt(i+1,e),f=Yt(i,e+1),g=Yt(i+1,e+1);return c+(E-c)*l+(f-c)*o+(c-E-f+g)*l*o}function Se(r,s,i=5){let e=0,l=.5;for(let o=0;o<i;o++)e+=l*Ho(r,s),r*=2.03,s*=2.03,l*=.5;return e}var Ao=(r,s)=>{let i=0,e=.5;for(let l=0;l<5;l++)i+=e*(1-Math.abs(Ho(r,s)*2-1))**2,r*=2.1,s*=2.1,e*=.5;return i},qe=(r,s)=>Math.hypot((r-Xt.x)/Xt.rx,(s-Xt.z)/Xt.rz);function bo(r,s){let i=qe(r,s),e=Math.max(yt(Math.abs(s),70,140),yt(Math.abs(r-120),260,340)),l=(Se(r/260,s/260,3)-.5)*3*e;return l+=yt(i,1,1.7)*(Se(r/520+7,s/520+3)*110-15),l+=yt(i,2.1,3.4)*Ao(r/1400,s/1400)*520,l}function Io(r,s){let i=(r-rt.x)**2+(s-rt.z)**2;return bo(r,s)-26*Math.exp(-i/(rt.r*rt.r))}function So({lite:r,scale:s=1,vscale:i=s}){let e=s,l=i,o=Math.min(s,2.5),c=Math.min(s,1.6),E=new Ct,f=r?160:240,g=new gt(he,he,f,f);g.rotateX(-Math.PI/2);let M=g.attributes.position,h=new Float32Array((f+1)*(f+1));for(let n=0;n<M.count;n++){let y=Io(M.getX(n),M.getZ(n));M.setY(n,y),h[n]=y}g.computeVertexNormals();let D=bo(rt.x,rt.z)-7,u=[[.64,.58,.34],[.25,.37,.16],[.42,.33,.22],[.44,.56,.27],[.55,.52,.3]],v=new Float32Array(M.count*3),R=new ut,x=new ut(.22,.37,.13),z=new ut(.32,.46,.17),P=new ut(.42,.39,.35),m=new ut(.92,.94,.96),S=new ut(.62,.57,.44),k=g.attributes.normal;for(let n=0;n<M.count;n++){let y=M.getX(n),A=M.getZ(n),C=M.getY(n);R.copy(x).lerp(z,Se(y/90,A/90,3));let I=qe(y,A),et=Yt(Math.floor(y/160)+.5,Math.floor(A/160)+.5);I<1.5&&et<.55*(1-yt(I,1,1.5))&&Math.abs(A)>80&&R.setRGB(...u[Math.floor(Yt(Math.floor(y/160),Math.floor(A/160)+9)*u.length)]),Math.abs(A)<70&&Math.abs(y-120)<300&&R.lerp(new ut(.4,.53,.26),.6);let G=1-k.getY(n);R.lerp(P,yt(G,.12,.3)),R.lerp(m,yt(C,300,380)*(1-yt(G,.3,.5))),C<D+1.5&&Math.hypot(y-rt.x,A-rt.z)<rt.r*1.8&&R.lerp(S,.7),v.set([R.r,R.g,R.b],n*3)}g.setAttribute("color",new Lt(v,3));let w=document.createElement("canvas");w.width=w.height=256;let V=w.getContext("2d");V.fillStyle="#d8d8d8",V.fillRect(0,0,256,256);for(let n=0;n<9e3;n++){let y=150+Math.random()*105;V.fillStyle=`rgb(${y},${y},${y})`,V.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3)}let W=new zt(w);W.wrapS=W.wrapT=Te,W.colorSpace=It,W.anisotropy=r?2:8;let N=g.attributes.uv;for(let n=0;n<N.count;n++)N.setXY(n,M.getX(n)/24,M.getZ(n)/24);let it=new Z(g,new ue({vertexColors:!0,map:W}));it.scale.set(e,l,e),it.receiveShadow=!0,E.add(it);let _=new Z(new go(rt.r*2.2,48),new ht({color:2902622,roughness:.08,metalness:.2,transparent:!0,opacity:.88}));_.rotation.x=-Math.PI/2,_.position.set(rt.x*e,D*l,rt.z*e),_.scale.set(e,e,1),E.add(_);let ct=he/f;function Gt(n,y){return l*lt(n/e,y/e)}function lt(n,y){let A=xo((n+he/2)/ct,0,f-1e-6),C=xo((y+he/2)/ct,0,f-1e-6),I=Math.floor(A),et=Math.floor(C),G=A-I,st=C-et,Mt=h[et*(f+1)+I],oe=h[et*(f+1)+I+1],Ot=h[(et+1)*(f+1)+I],Pt=h[(et+1)*(f+1)+I+1];return G+st<1?Mt+(oe-Mt)*G+(Ot-Mt)*st:Pt+(Ot-Pt)*(1-G)+(oe-Pt)*(1-st)}let B=25*e,vt=new Map,ft=[],Ut=(n,y)=>`${Math.floor(n/B)},${Math.floor(y/B)}`;function Bt(n){let y=Ut(n.x,n.z);vt.has(y)||vt.set(y,[]),vt.get(y).push(n)}function qt(n){for(let C of ft)if(n.x>C.x0&&n.x<C.x1&&n.z>C.z0&&n.z<C.z1&&n.y<C.top)return C.name;let y=Math.floor(n.x/B),A=Math.floor(n.z/B);for(let C=-1;C<=1;C++)for(let I=-1;I<=1;I++){let et=vt.get(`${y+C},${A+I}`);if(et){for(let G of et)if(n.y>G.y0&&n.y<G.top&&(n.x-G.x)**2+(n.z-G.z)**2<G.r*G.r)return G.name}}return null}let kt=new ue({color:7171176}),pt=(n,y,A,C)=>{let I=new Z(new gt(n*(n>200?e:o),y*o),kt);I.rotation.x=-Math.PI/2,I.position.set(A*e,.02,C*o),I.receiveShadow=!0,E.add(I)};pt(300,7,120,-28),pt(8,22,20,-14),pt(8,22,220,-14),pt(110,34,120,-56);let Vt=new ht({color:9080724,roughness:.6,metalness:.3}),wt=new ht({color:5988455,roughness:.5,metalness:.4});for(let n of[90,150]){let y=new Z(new Zt(26*o,6*o,18*o),Vt);y.position.set(n*e,3*o,-84*o);let A=new Z(new le(9*o,9*o,26*o,20,1,!1,0,Math.PI),wt);A.rotation.z=Math.PI/2,A.position.set(n*e,6*o,-84*o),A.scale.set(.45,1,1),y.castShadow=A.castShadow=!0,ft.push({name:"un hangar",x0:n*e-13*o,x1:n*e+13*o,z0:-93*o,z1:-75*o,top:10*o}),E.add(y,A)}let p=new Z(new le(.06,.08,6,6),new ht({color:14540253}));p.position.set(60*e,3*o,-22*o),p.scale.setScalar(o),Bt({name:"el m\xE1stil de la manga",x:60*e,z:-22*o,y0:0,top:6.2*o,r:.2*o}),E.add(p);let L=new Ct;L.position.set(60*e,5.9*o,-22*o),L.scale.setScalar(o);let J=new le(.35,.16,2.6,12,5,!0);J.rotateZ(-Math.PI/2),J.translate(1.3,0,0);let nt=[],Rt=J.attributes.position;for(let n=0;n<Rt.count;n++){let y=Math.floor(Rt.getX(n)/.52)%2;nt.push(...y?[.95,.95,.95]:[1,.45,.12])}J.setAttribute("color",new lo(nt,3));let pe=new Z(J,new ht({vertexColors:!0,side:Je,roughness:.8}));L.add(pe),E.add(L);let Dt=0;function Ee(n,y=1/60){let A=Math.hypot(n.x,n.z);Dt+=y,L.rotation.y=Math.atan2(-n.z,n.x)+Math.sin(Dt*3.1)*.05,L.rotation.z=-(1-yt(A,.5,7))*1.2+Math.sin(Dt*4.3)*.03}let Tt=r?700:2200,Nt=new le(.25,.4,3,5);Nt.translate(0,1.5,0);let me=new yo(2.4,8,7);me.translate(0,6.5,0);let at=new wo(3,0);at.translate(0,5,0);let ve=new ue({flatShading:!0}),Jt=new be(Nt,new ue({color:4863526}),Tt),t=new be(me,ve,Tt),tt=new be(at,ve,Tt),xt=new xe,te=new ce,Ht=new d,Me=new d,$t=0,Wt=0,Ft=0,ee=0,jt=new ut;for(;$t<Tt&&ee++<Tt*40;){let n=Xt.x+(Math.random()*2-1)*3e3,y=Xt.z+(Math.random()*2-1)*2600,A=qe(n,y);if(Math.abs(y)<110&&Math.abs(n-120)<360||Math.hypot(n-rt.x,y-rt.z)<rt.r*1.1||Se(n/400+31,y/400+17,3)<(A<1?.56:.44)&&Math.random()>.04)continue;let I=lt(n,y);if(I>330||I<D+1)continue;let et=I*l,G=I>60||A>1.2&&Math.random()<.7,st=(.7+Math.random()*.8)*c,Mt=st*(.9+Math.random()*.4);te.setFromAxisAngle(new d(0,1,0),Math.random()*Math.PI*2),xt.compose(Me.set(n*e,et-.3,y*e),te,Ht.set(st,Mt,st)),Bt({name:"un \xE1rbol",x:n*e,z:y*e,y0:et-.3,top:et-.3+(G?10.5:8)*Mt,r:(G?1.5:2.3)*st}),Jt.setMatrixAt($t++,xt),jt.setHSL(G?.3+Math.random()*.04:.22+Math.random()*.08,.45,G?.16+Math.random()*.06:.22+Math.random()*.08),G?(t.setMatrixAt(Wt,xt),t.setColorAt(Wt++,jt)):(tt.setMatrixAt(Ft,xt),tt.setColorAt(Ft++,jt))}Jt.count=$t,t.count=Wt,tt.count=Ft;for(let n of[Jt,t,tt])n.castShadow=!r,n.instanceMatrix.needsUpdate=!0,n.instanceColor&&(n.instanceColor.needsUpdate=!0),E.add(n);return{group:E,heightAt:Gt,setWind:Ee,hit:qt,scale:e,side:o}}var Lo=1.225,Ce=9.81,Go={m:7.2,S:.34,b:1.34,c:.28,I:new d(.28,.85,.62)},Uo={a:4.6,z:0,flap:.55,de:.35,stall:F.degToRad(15)},Bo={z:.028,k:.065,flap:.05,gear:.018},qo={z:0,a:-.9,q:-14,de:-1.15,flap:-.06},Do={b:-.08,p:-.48,da:.2,r:.08},$o={b:.13,r:-.18,dr:-.09},Wo=[{p:new d(.6,-.18,0),steer:!0},{p:new d(-.04,-.18,.238)},{p:new d(-.04,-.18,-.238)}],jo=[[.78,0,0],[-.8,.05,0],[-.68,.32,0],[-.12,.02,.67],[-.12,.02,-.67],[.2,.1,0]].map(r=>new d(...r)),Oo=[[.5,-.06,0],[-.3,-.06,0],[-.04,-.07,.24],[-.04,-.07,-.24]].map(r=>({p:new d(...r)})),_o={AC:Go,CL:Uo,CD:Bo,CM:qo,CR:Do,CN:$o,WHEELS:Wo,SKIN:jo,BELLY:Oo,world:1,size:1,vref:22,ground:.185,eye:[.486,.09],tips:[new d(-.12,.02,.67),new d(-.12,.02,-.67)]};function on({model:r,parts:s,S:i,m:e,AR:l,e:o,cd0:c,vref:E,eye:f,canopy:g=[],thrust:M,hud:h,world:D=10,flapDeg:u,autoFlap:v=!1}){let R=Math.sqrt(l*i),x=i/R;r.updateMatrixWorld(!0);let z=r.matrixWorld.clone().invert(),P=p=>new io().setFromObject(p).applyMatrix4(z),m=P(r),S=m.max.x-m.min.x,w=s.filter(p=>/tren|gear|rueda|wheel/i.test(p.data.part+" "+(p.data.label??""))).map(p=>P(p.obj)).filter(p=>isFinite(p.min.y)).map(p=>({p:new d((p.min.x+p.max.x)/2,p.min.y,(p.min.z+p.max.z)/2)}));if(w.length<3){let p=m.min.y;w=[{p:new d(m.min.x+.78*S,p,0)},{p:new d(m.min.x+.38*S,p,.12*R)},{p:new d(m.min.x+.38*S,p,-.12*R)}]}w.sort((p,L)=>L.p.x-p.p.x),w[0].steer=!0;let V=w.slice(1).reduce((p,L)=>p+L.p.x,0)/(w.length-1),W=new d(V+.1*(w[0].p.x-V),(m.min.y+m.max.y)/2,0);for(let p of w)p.p.sub(W);let N=Math.min(...w.map(p=>p.p.y)),it=-N+.02,_=new d,ct=new d,Gt=-1/0,lt=1/0,B=new d;r.traverse(p=>{if(!p.isMesh)return;let L=p.geometry.attributes.position,J=z.clone().multiply(p.matrixWorld);for(let nt=0;nt<L.count;nt+=7)B.fromBufferAttribute(L,nt).applyMatrix4(J),B.z>Gt&&(Gt=B.z,_.copy(B)),B.z<lt&&(lt=B.z,ct.copy(B))});let vt=new Set;for(let p of g)p.traverse(L=>vt.add(L));let ft=-1/0;r.traverse(p=>{if(!p.isMesh||vt.has(p))return;let L=p.geometry.attributes.position,J=z.clone().multiply(p.matrixWorld);for(let nt=0;nt<L.count;nt+=3)B.fromBufferAttribute(L,nt).applyMatrix4(J),Math.abs(B.x-f[0])<.4&&Math.abs(B.z)<.35&&B.y>ft&&(ft=B.y)});let Ut=Math.max(f[1],ft+.15);_.sub(W),ct.sub(W),m.min.sub(W),m.max.sub(W);let Bt=[new d(m.max.x,(m.min.y+m.max.y)/2-.1*(m.max.y-m.min.y),0),new d(m.min.x,N+.35*(m.max.y-N),0),new d(m.min.x+.1*S,m.max.y,0),_.clone(),ct.clone()],qt=[[.75,0],[.3,0],[.45,.25],[.45,-.25]].map(([p,L])=>({p:new d(m.min.x+p*S,N+.15*(m.max.y-N),L*R*.5)})),kt=2*Math.PI*l/(2+Math.sqrt(l*l+4)),pt=F.degToRad(l<3?24:16),Vt=Math.sqrt(2*e*9.81/(1.225*i*(kt*pt+.35*.4))),wt=(p,L)=>{let J=F.clamp((p-2*Vt)/(.6*Vt),0,1);return .5*L*(1-J*J*(3-2*J))};return{AC:{m:e,S:i,b:R,c:x,I:new d(e*(.22*R)**2,e*(.32*S)**2,e*(.3*S)**2)},CL:{a:kt,z:.02,flap:.35,de:.3,stall:pt},CD:{z:c,k:1/(Math.PI*o*l),flap:.04,gear:.015},CM:{z:0,a:-.55,q:-10,de:-.8,flap:-.04},CR:{b:-.06,p:-.4,da:.12,r:.06},CN:{b:.1,r:-.15,dr:-.07},WHEELS:w,SKIN:Bt,BELLY:qt,world:D,size:S/1.6,vref:E,ground:it,eye:[f[0]-W.x,Ut-W.y],canopy:g,tips:[_,ct],thrust:M,hud:h,cg:W,flapDeg:u,autoFlap:v?wt:null}}function nn({scene:r,renderer:s,camera:i,model:e,op:l,motor:o,lite:c,setGear:E,setSurfaces:f,gearState:g,pad:M,airframe:h=_o,envSize:D=128}){let{AC:u,CL:v,CD:R,CM:x,CR:z,CN:P,WHEELS:m,SKIN:S,BELLY:k}=h,w=h.world,V=h.size,W=h.vref,N=W/22,it=u.m/7.2,_=new Ct;_.visible=!1,r.add(_);let ct=null;function Gt(){ct=So({lite:c,scale:w,vscale:w>1?3:1}),_.add(ct.group);let a=document.createElement("canvas");a.width=256,a.height=4096;let T=a.getContext("2d");T.fillStyle="#2b2c2e",T.fillRect(0,0,256,4096);for(let q=0;q<4e3;q++)T.fillStyle=`rgba(255,255,255,${Math.random()*.04})`,T.fillRect(Math.random()*256,Math.random()*4096,2,2);T.fillStyle="#e8e6e0";for(let q=300;q<3800;q+=160)T.fillRect(124,q,8,80);T.fillRect(8,0,6,4096),T.fillRect(242,0,6,4096);for(let q=0;q<8;q++)T.fillRect(24+q*26,60,14,160),T.fillRect(24+q*26,3876,14,160);let b=new zt(a);b.colorSpace=It,b.anisotropy=c?2:8;let H=new Z(new gt(14*ct.side*(w>1?1.3:1),320*w),new ht({map:b,roughness:.85}));return H.rotation.x=-Math.PI/2,H.rotation.z=Math.PI/2,H.position.set(120*w,.03,0),H.receiveShadow=!0,_.add(H),ct}let lt=()=>ct??Gt(),B=new de;B.scale.setScalar(1e4);let vt=new d().setFromSphericalCoords(1,F.degToRad(60),F.degToRad(160));Object.assign(B.material.uniforms.sunPosition.value,vt),B.material.uniforms.turbidity.value=4,B.material.uniforms.rayleigh.value=1.4;let ft=new Eo;ft.add(B);let Ut=null;function Bt(){let a=new fo(c?256:512,{type:ao});return new ho(1,2e4,a).update(s,ft),a.texture}let qt=null,kt=null,pt=null,Vt=1,wt=new Ct;_.add(wt);let p=70,L=h.tips,J=L.map(()=>{let a=new Ue;a.setAttribute("position",new Lt(new Float32Array(p*3),3)),a.setAttribute("color",new Lt(new Float32Array(p*4),4));let T=new vo(a,new Be({vertexColors:!0,transparent:!0,depthWrite:!1}));return T.frustumCulled=!1,wt.add(T),{geo:a,n:0}}),nt=c?70:160,Rt=new Ue,pe=new Float32Array(nt*6),Dt=new Float32Array(nt*8);Rt.setAttribute("position",new Lt(pe,3)),Rt.setAttribute("color",new Lt(Dt,4));let Ee=new Mo(Rt,new Be({vertexColors:!0,transparent:!0,depthWrite:!1}));Ee.frustumCulled=!1,wt.add(Ee);let Tt=Array.from({length:nt},()=>({p:new d,seed:Math.random()}));function Nt(a,T){let b=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0).applyQuaternion(t.q),H=new d(0,1,0).cross(b).normalize(),q=b.clone().cross(H).normalize(),Et=(.5+Math.random()*2.2)*V,X=Math.random()*Math.PI*2;a.p.copy(t.p).addScaledVector(b,(T?6+Math.random()*10:(Math.random()-.3)*16)*V).addScaledVector(H,Math.cos(X)*Et).addScaledVector(q,Math.sin(X)*Et*.7)}function me(a,T){let b=F.smoothstep(T.V,6*N,30*N),H=T.onGround?0:b*F.clamp(.25+T.alpha*5,0,1);L.forEach((X,$)=>{let j=J[$],Y=j.geo.attributes.position.array,U=j.geo.attributes.color.array;Y.copyWithin(3,0,(p-1)*3),U.copyWithin(4,0,(p-1)*4);let ot=X.clone().applyQuaternion(t.q).add(t.p);Y.set([ot.x,ot.y,ot.z],0),U.set([1,1,1,H*.75],0),j.n=Math.min(p,j.n+1);for(let K=0;K<p;K++)U[K*4+3]*=K===0?1:.985;for(let K=0;K<p;K++){let _t=K*3;Y[_t]+=at.x*a,Y[_t+1]+=(at.y-.15)*a,Y[_t+2]+=at.z*a}if(j.n<p)for(let K=j.n;K<p;K++)Y.copyWithin(K*3,(j.n-1)*3,j.n*3),U[K*4+3]=0;j.geo.attributes.position.needsUpdate=j.geo.attributes.color.needsUpdate=!0});let q=at.clone().sub(t.v),Et=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0);for(let X=0;X<nt;X++){let $=Tt[X];$.p.addScaledVector(at,a);let j=$.p.clone().sub(t.p);(j.dot(Et)<-10*V||j.length()>20*V)&&Nt($,!0);let Y=1-F.smoothstep($.p.distanceTo(t.p),1.5*V,9*V),U=b*Y*(.25+.35*$.seed),ot=$.p.clone().addScaledVector(q,-.05);pe.set([$.p.x,$.p.y,$.p.z,ot.x,ot.y,ot.z],X*6),Dt.set([.9,.95,1,U,.9,.95,1,0],X*8)}Rt.attributes.position.needsUpdate=Rt.attributes.color.needsUpdate=!0}let at=new d,ve=new d(-1.6,0,.2);function Jt(a,T){let b=.6+.4*Math.sin(a*.37)*Math.sin(a*.11+1.3),H=F.clamp(T/25,.1,1)*.55;at.copy(ve).multiplyScalar(b),at.x+=H*(Math.sin(a*1.7)+.5*Math.sin(a*4.3+2)),at.y+=H*.6*(Math.sin(a*2.1+.7)+.5*Math.sin(a*5.9)),at.z+=H*(Math.sin(a*1.3+4)+.5*Math.sin(a*3.7+1))}let t={p:new d,v:new d,q:new ce,w:new d,throttle:0,roll:0,pitch:0,yaw:0,flap:.5,brake:0,gearUp:!1,crashed:!1,cam:"chase",t:0,assist:!0},tt=new Set,xt={pos:e.position.clone(),quat:e.quaternion.clone()};function te(){t.p.set(w>1?-34*w:0,h.ground,0),t.v.set(0,0,0),t.q.identity(),t.w.set(0,0,0),t.throttle=0,t.flap=.5,t.gearUp=!1,t.onGround=!0,t.hold=0,t.bankHold=0,t.trim=0,t.crashed=!1,t.crashWhy="",g.target=0;for(let a of J)a.n=0;for(let a of Tt)Nt(a,!1)}let Ht={gear(){!t.onGround&&t.p.y>h.ground+1.3*Math.max(1,w*.4)&&(t.gearUp=!t.gearUp,g.target=t.gearUp?1:0)},flap(){h.autoFlap||(t.flap=t.flap>.6?0:t.flap+.5)},cam(){t.cam=t.cam==="chase"?"cockpit":"chase"},reset:te,engine(){o.on=!o.on},assist(){t.assist=!t.assist}},Me=a=>T=>{let b=T.key.toLowerCase();a&&!T.repeat&&(b==="g"&&Ht.gear(),b==="f"&&Ht.flap(),b==="c"&&Ht.cam(),b==="r"&&Ht.reset(),b==="e"&&Ht.engine(),b==="t"&&Ht.assist()),["w","s","a","d","q","e","shift","control","b","arrowup","arrowdown"," "].includes(b)&&T.preventDefault(),a?tt.add(b):tt.delete(b)},$t=Me(!0),Wt=Me(!1),Ft=null,ee=()=>!!(M!=null&&M.touch),jt=new d;function n(a){t.crashed||(t.crashed=!0,t.crashWhy=a,t.v.set(0,0,0),t.w.set(0,0,0))}let y=new d;function A(a){let T=(O,Q)=>(tt.has(O)?1:0)-(tt.has(Q)?1:0),b=O=>Math.max(-1,Math.min(1,O)),H=Ft;t.pitch+=(b(T("s","w")+((H==null?void 0:H.pitch)??0))-t.pitch)*Math.min(1,a*6),t.roll+=(b(T("d","a")+((H==null?void 0:H.roll)??0))-t.roll)*Math.min(1,a*7);let q=b(T("z","x")+((H==null?void 0:H.yaw)??0)),Et=new d(1,0,0).applyQuaternion(t.q),X=Math.atan2(Et.z,Et.x),$=t.v.length();if(!t.onGround||Math.abs(q)>.02||$<1||$>25*N)t.hold=X;else if(t.assist){let O=F.clamp(10*N/$,.4,1);q=F.clamp(Math.atan2(Math.sin(X-t.hold),Math.cos(X-t.hold))*6+t.w.y*.4,-O,O)}t.yaw+=(q-t.yaw)*Math.min(1,a*5),(tt.has("shift")||tt.has("arrowup"))&&(t.throttle=Math.min(1,t.throttle+a*.5)),(tt.has("control")||tt.has("arrowdown"))&&(t.throttle=Math.max(0,t.throttle-a*.5)),(H==null?void 0:H.throttle)!=null&&(t.throttle=H.throttle),H!=null&&H.throttleRate&&(t.throttle=Math.min(1,Math.max(0,t.throttle+H.throttleRate*a*.6))),t.brake=tt.has("b")||tt.has(" ")?1:0,o.target=t.throttle;let j=new xe().makeRotationFromQuaternion(t.q),Y=j.clone().transpose();t.t+=a,Jt(t.t,t.p.y),y.copy(t.v).sub(at).applyMatrix4(Y);let U=Math.max(.01,y.length()),ot=Math.atan2(-y.y,y.x),K=Math.asin(F.clamp(y.z/U,-1,1)),_t=Lo*Math.pow(Math.max(.05,1-22558e-9*Math.max(0,t.p.y)),4.2559),bt=.5*_t*U*U,Oe=h.thrust?h.thrust({V:U,h:t.p.y,rho:_t}):o.on?l(o.f).thrust*o.spin:0,ke=t.assist?F.clamp((W/Math.max(U,1))**2,.22,1):1,_e=-t.pitch*F.degToRad(16)*ke,Co=t.roll*F.degToRad(20)*ke,Ve=-t.yaw*F.degToRad(22)*Math.max(ke,.45),Ke=1-g.t;h.autoFlap&&(t.flap+=(h.autoFlap(U,Ke)-t.flap)*Math.min(1,a*.8));let Kt=t.flap*.8,ge=v.z+v.a*ot+v.flap*Kt-v.de*_e*.1;Math.abs(ot)>v.stall&&(ge=Math.sign(ot)*(v.a*v.stall)*Math.max(.35,1-(Math.abs(ot)-v.stall)*3)+v.flap*Kt*.5);let zo=R.z+R.k*ge*ge+R.flap*Kt+R.gear*Ke+.4*Math.max(0,Math.abs(ot)-v.stall),ne=new d;if(U>.5){let O=y.clone().normalize(),Q=new d(0,0,1).cross(O).normalize();ne.addScaledVector(Q,bt*u.S*ge),ne.addScaledVector(O,-bt*u.S*zo),ne.z+=-bt*u.S*.6*K}ne.x+=Oe;let Qe=t.w.x*u.b/(2*U),Fe=t.w.y*u.b/(2*U),Pe=t.w.z*u.c/(2*U),ko=u.m*Ce/Math.max(1,bt*u.S)-v.flap*Kt;t.trim+=(-x.a*F.clamp(ko/v.a,0,v.stall*.7)-x.flap*Kt-t.trim)*Math.min(1,a*.8);let Vo=t.onGround?0:t.trim,Qt=new d(bt*u.S*u.b*(z.b*K+z.p*Qe+z.da*Co+z.r*Fe),bt*u.S*u.b*(P.b*-K+P.r*Fe+P.dr*Ve),bt*u.S*u.c*(x.z+x.a*ot+x.q*Pe+x.de*_e+x.flap*Kt+Vo));if(t.assist&&U>8*N){let O=new d(0,0,1).applyQuaternion(t.q),Q=Math.asin(F.clamp(-O.y,-1,1)),St=Math.asin(F.clamp(t.v.y/U,-1,1)),mt=bt*u.S,dt=Math.abs(t.roll)>=.05;dt&&(t.bankHold=Q);let re=Math.abs(t.bankHold??0)<F.degToRad(12)?0:F.clamp(t.bankHold,-.79,.79);dt?Qt.x+=mt*u.b*-.2*Qe:Qt.x+=u.I.x*6*(.8*(re-Q)-t.w.x);let At=u.m*Ce/Math.max(1,mt*u.S)*(1/Math.max(.45,Math.cos(Q))-1)/v.a;Qt.z+=Math.abs(t.pitch)<.05?mt*u.c*(-.6*St-3*Pe-x.a*At):mt*u.c*-3*Pe,Qt.z+=mt*u.c*-2.5*Math.max(0,ot-.8*v.stall);let ie=-(Ce*Math.tan(F.clamp(Q,-1.2,1.2)))/U*Math.cos(Q)*u.b/(2*U);Qt.y+=mt*u.b*(-.03*K-.5*(Fe-ie))}let Ae=ne.clone().applyMatrix4(j);Ae.y-=u.m*Ce;let Ze=new d,ye=!1,ae=g.t<.05?m:k;for(let O of ae){let Q=O.p.clone().applyQuaternion(t.q),St=Q.clone().add(t.p),mt=lt().heightAt(St.x,St.z)-St.y;if(mt<=0)continue;mt>.3*V&&n("contra el terreno"),ye=!0;let dt=t.v.clone().add(new d().copy(t.w).applyQuaternion(t.q).cross(Q)),re=Math.max(0,1250*it*7.2*mt/V-36*it*7.2*dt.y),se=new d(0,re,0),At=new d(1,0,0).applyQuaternion(t.q).setY(0).normalize(),ie=new d(0,1,0).cross(At),Po=ae===k?.5:.02+.5*t.brake,Xe=u.m/ae.length,Ge=dt.dot(At);se.addScaledVector(At,-Math.sign(Ge)*Math.min(Math.abs(Ge)*40*it,Po*re,.5*Xe*Math.abs(Ge)/a));let Ye=O.steer?dt.dot(ie)+At.dot(dt)*Ve*.8:dt.dot(ie),Ne=Math.min(.9*re,.5*Xe*Math.abs(Ye)/a+(O.steer?Math.abs(At.dot(dt)*Ve)*400*it:0));se.addScaledVector(ie,-F.clamp(Ye*400*it,-Ne,Ne)),Ae.add(se),Ze.add(Q.clone().cross(se)),ae===k&&-dt.y>2.5&&n("aterrizaje de panza demasiado fuerte"),ae===m&&-dt.y>4&&n("aterrizaje demasiado fuerte, se rompi\xF3 el tren")}t.v.addScaledVector(Ae,a/u.m),t.p.addScaledVector(t.v,a);for(let O of S){let Q=jt.copy(O).applyQuaternion(t.q).add(t.p),St=lt().hit(Q);if(St){n(`choque contra ${St}`);break}if(lt().heightAt(Q.x,Q.z)-Q.y>.03*V){n(O.z?"una punta de ala toc\xF3 el suelo":O.x>0?"el morro contra el suelo":"la cola contra el suelo");break}}let Ie=Qt.add(Ze.applyMatrix4(Y)),Fo=new d(u.I.x*t.w.x,u.I.y*t.w.y,u.I.z*t.w.z),Le=t.w.clone().cross(Fo);t.w.x+=(Ie.x-Le.x)/u.I.x*a,t.w.y+=(Ie.y-Le.y)/u.I.y*a,t.w.z+=(Ie.z-Le.z)/u.I.z*a,ye&&t.w.multiplyScalar(.995);let we=t.q.clone().multiply(new ce(t.w.x*a*.5,t.w.y*a*.5,t.w.z*a*.5,0));return t.q.x+=we.x,t.q.y+=we.y,t.q.z+=we.z,t.q.w+=we.w,t.q.normalize(),f({roll:t.roll,pitch:t.pitch,yaw:t.yaw,flap:t.flap}),t.onGround=ye,{V:U,alpha:ot,onGround:ye,thrust:Oe}}let C={V:0,alpha:0,onGround:!0,thrust:0},I=!1;function et(a,T){I=!0,Ft=T;for(let b=0;b<8;b++)C=A(a/8);return C}let G=new d(-3.4*V,.9*V,0);function st(a){if(t.crashed){Ot(`<b>Accidente</b> \xB7 ${t.crashWhy}<br>${ee()?"Reinicio":"R"} para volver a la pista`);return}if(!I){Ft=(M==null?void 0:M.read())??null;for(let Y=0;Y<8;Y++)C=A(a/8)}me(a,C),lt().setWind(at,a),e.position.copy(t.p),h.cg&&e.position.sub(jt.copy(h.cg).applyQuaternion(t.q)),e.quaternion.copy(t.q);let T=new d(1,0,0).applyQuaternion(t.q),b=new d(0,1,0).applyQuaternion(t.q);if(t.cam==="chase"){let Y=(i.aspect<1?2.6:3.4)*V,U=T.clone().multiplyScalar(-Y).add(new d(0,Y*.27,0));G.lerp(U,Math.min(1,a*3)),i.position.copy(t.p).add(G),i.up.set(0,1,0),i.lookAt(t.p.clone().addScaledVector(T,2*V).add(new d(0,(ee()?-.8:-.5)*V,0)))}else i.position.copy(t.p).addScaledVector(T,h.eye[0]).addScaledVector(b,h.eye[1]),i.up.copy(b),i.lookAt(i.position.clone().addScaledVector(T,10*V).addScaledVector(b,-1.7*V));let H=t.cam==="chase"?null:70;H&&i.fov!==H&&(i.fov=H,i.updateProjectionMatrix()),!H&&t.cam!==st.cam&&Pt(),t.cam!==st.cam&&Mt(t.cam!=="cockpit"),st.cam=t.cam;let q=h.hud?null:l(o.f),Et=Math.max(0,t.p.y-lt().heightAt(t.p.x,t.p.z)),X=C.V*3.6,$=t.v.y,j=C.alpha>v.stall;if(innerWidth<560){Ot(`<b>${X.toFixed(0)}</b> km/h \xB7 <b>${Et.toFixed(0)}</b> m \xB7 ${$>=0?"+":""}${$.toFixed(1)} m/s<br>`+(h.hud?h.hud(C,t,!0):o.on?`<b>${Math.round(q.n*o.spin/1e3)}k</b> rpm \xB7 ${C.thrust.toFixed(0)} N \xB7 gas ${(t.throttle*100).toFixed(0)} %`:"MW54 apagada \xB7 Motor para arrancar")+(j?"<br><b>P\xC9RDIDA</b> \xB7 baja el morro":t.brake?"<br>frenos":""));return}Ot(`<b>${X.toFixed(0)}</b> km/h \xB7 <b>${Et.toFixed(1)}</b> m \xB7 ${$>=0?"+":""}${$.toFixed(1)} m/s \xB7 \u03B1 ${F.radToDeg(C.alpha).toFixed(0)}\xB0<br>`+(h.hud?h.hud(C,t,!1):`MW54 ${o.on?`<b>${Math.round(q.n*o.spin).toLocaleString("es-ES")}</b> rpm \xB7 ${C.thrust.toFixed(0)} N \xB7 EGT ${Math.round(15+(q.egt-15)*o.heat)} \xB0C`:`apagada (${ee()?"Motor":"E"} para arrancar)`} \xB7 gas ${(t.throttle*100).toFixed(0)} %`)+`<br>Viento ${at.length().toFixed(1)} m/s \xB7 Tren ${g.t<.05?"abajo":g.t>.95?"arriba":"en tr\xE1nsito"} \xB7 flaps ${h.autoFlap?"auto ":""}${(t.flap*(h.flapDeg??40)).toFixed(0)}\xB0 \xB7 gir\xF3scopo ${t.assist?"s\xED":"no"}${t.brake?" \xB7 frenos":""}${j?" \xB7 <b>P\xC9RDIDA</b>":""}`)}function Mt(a){for(let T of h.canopy??[])T.visible=a}let oe="";function Ot(a){a!==oe&&(oe=a,document.getElementById("hud").innerHTML=a)}function Pt(){i.fov=F.clamp(F.radToDeg(2*Math.atan(Math.tan(F.degToRad(28))/i.aspect)),40,66),i.updateProjectionMatrix()}function ze(a,T=a){a&&lt(),a&&!_.visible&&(Ut??=Bt(),kt??=new To(s).fromScene(ft,0,1,2e4,{size:D}).texture,qt=r.background,r.background=Ut,pt=r.environment,Vt=r.environmentIntensity,r.environment=kt,r.environmentIntensity=.55),!a&&_.visible&&(r.background=qt,r.environment=pt,r.environmentIntensity=Vt),_.visible=a,wt.visible=T;let b=Math.sqrt(w);r.fog=a?new po(11124692,900*b,(c?4500:6500)*b):null,i.up.set(0,1,0),i.near=a?.004*V:.01,i.far=a?12e3*w:50,a?Pt():(i.fov=32,i.updateProjectionMatrix())}return{enter(){ze(!0),te(),M==null||M.reset(0),addEventListener("keydown",$t),addEventListener("keyup",Wt),G.set(-3.4*V,.9*V,0)},exit(){ze(!1),removeEventListener("keydown",$t),removeEventListener("keyup",Wt),tt.clear(),Mt(!0),st.cam=null,document.fullscreenElement&&document.exitFullscreen().catch(()=>{}),e.position.copy(xt.pos),e.quaternion.copy(xt.quat)},update:st,simulate:et,endTest(){I=!1},fit:Pt,showWorld:ze,home:xt,get terrain(){return lt()},airframe:h,state:t}}var $e=4;function We(r){let s=(c,E)=>{let f=new Float32Array(c*c),g=E;for(let M=0;M<f.length;M++)g=g*1664525+1013904223>>>0,f[M]=g/4294967296;return(M,h)=>{let D=M*c,u=h*c,v=Math.floor(D),R=Math.floor(u),x=D-v,z=u-R;x=x*x*(3-2*x),z=z*z*(3-2*z);let P=(m,S)=>f[(S%c+c)%c*c+(m%c+c)%c];return(P(v,R)*(1-x)+P(v+1,R)*x)*(1-z)+(P(v,R+1)*(1-x)+P(v+1,R+1)*x)*z}},i=[[5,.25],[12,.25],[30,.2],[80,.15],[200,.15]].map(([c,E],f)=>[s(c,7+f*31),E]),e=[s(3,101),s(11,202)],l=new Uint8ClampedArray(r*r*4),o=new Uint8ClampedArray(r*r*4);for(let c=0;c<r;c++)for(let E=0;E<r;E++){let f=E/r,g=c/r,M=0;for(let[z,P]of i)M+=z(f,g)*P;let h=Math.random(),D=h>.985?.12*Math.random():h<.01?-.16*Math.random():(Math.random()-.5)*.04,u=36+(M-.5)*12+D*110,v=(c*r+E)*4;l[v]=u,l[v+1]=u+2,l[v+2]=u+5,l[v+3]=255;let x=160+(.5*e[0](f,g)+.5*e[1](f,g)-.5)*60+Math.abs(D)*300;o[v]=o[v+1]=o[v+2]=x,o[v+3]=255}return{c:l,r:o}}function Ko(r,s){let i=[["#24262a"],["#a0a0a0"]].map(([o])=>{let c=document.createElement("canvas");c.width=c.height=s;let E=c.getContext("2d");return E.fillStyle=o,E.fillRect(0,0,s,s),c}),e=i.map(o=>{let c=new zt(o);return c.wrapS=c.wrapT=Te,c.anisotropy=r.capabilities.getMaxAnisotropy(),c});e[0].colorSpace=It;let l=({c:o,r:c})=>{[o,c].forEach((E,f)=>{i[f].getContext("2d").putImageData(new ImageData(E,s,s),0,0),e[f].needsUpdate=!0})};try{let o=`onmessage = (e) => { const o = (${We})(e.data); postMessage(o, [o.c.buffer, o.r.buffer]); close(); };`,c=URL.createObjectURL(new Blob([o],{type:"text/javascript"})),E=new Worker(c);E.onmessage=f=>{l(f.data),URL.revokeObjectURL(c)},E.onerror=f=>{f.preventDefault(),URL.revokeObjectURL(c),l(We(s))},E.postMessage(s)}catch{l(We(s))}return e}function Qo(r,s,i){r.onBeforeCompile=e=>{e.uniforms.uFade={value:new so(s,i)},e.uniforms.uBg={value:new ut(855826)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;
uniform vec2 uFade;
uniform vec3 uBg;`).replace("#include <tonemapping_fragment>",`gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));
#include <tonemapping_fragment>`)}}function Zo(r,{W:s,D:i,box:e,dash:l,stops:o,stop:c}){let E=Math.min(512,2600/s),f=document.createElement("canvas");f.width=s*E,f.height=i*E;let g=f.getContext("2d"),M=m=>(m+s/2)*E,h=m=>(m+i/2)*E,D="#d9a93a";g.fillStyle=D;for(let[m,S]of[[e.x0,1],[e.x1,-1]])for(let[k,w]of[[e.z0,1],[e.z1,-1]])g.fillRect(Math.min(M(m),M(m+S*e.arm)),Math.min(h(k),h(k+w*e.w)),e.arm*E,e.w*E),g.fillRect(Math.min(M(m),M(m+S*e.w)),Math.min(h(k),h(k+w*e.arm)),e.w*E,e.arm*E);let[u,v,R]=l;for(let m=e.x0+v/2;m<e.x1-1.5*v;m+=v)g.fillRect(M(m),h(-R/2),u*E,R*E);let x=v*.7;g.beginPath(),g.moveTo(M(e.x1-x*.3),h(0)),g.lineTo(M(e.x1-x),h(-x*.28)),g.lineTo(M(e.x1-x),h(x*.28)),g.closePath(),g.fill(),g.fillStyle="#e6e2d6";for(let[m,S]of o)g.fillRect(M(m-c[0]*2.3),h(S-c[1]/2),c[0]*E,c[1]*E);g.globalCompositeOperation="destination-out";for(let m=0;m<14e3;m++)g.fillStyle=`rgba(0,0,0,${Math.random()*.6})`,g.fillRect(Math.random()*f.width,Math.random()*f.height,1+Math.random(),1+Math.random());let z=new zt(f);z.colorSpace=It,z.anisotropy=r.capabilities.getMaxAnisotropy();let P=new Z(new gt(s,i),new ht({map:z,transparent:!0,roughness:.5,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));return P.rotation.x=-Math.PI/2,P.receiveShadow=!0,P}function Xo({w:r,d:s,x:i}){let e=document.createElement("canvas");e.width=e.height=256;let l=e.getContext("2d"),o=l.createRadialGradient(128,128,0,128,128,128);o.addColorStop(0,"rgba(0,0,0,0.55)"),o.addColorStop(.5,"rgba(0,0,0,0.22)"),o.addColorStop(1,"rgba(0,0,0,0)"),l.fillStyle=o,l.fillRect(0,0,256,256);let c=new Z(new gt(r,s),new co({map:new zt(e),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return c.rotation.x=-Math.PI/2,c.position.x=i,c}function rn(r,{y:s,fade:i,stand:e,ao:l,res:o=2048}){let[c,E]=Ko(r,o),f=Math.ceil(i[1]*2.2/$e);for(let D of[c,E])D.repeat.set(f,f);let g=new ht({map:c,roughnessMap:E,roughness:.7,metalness:0,envMapIntensity:.35});Qo(g,i[0],i[1]);let M=new Ct,h=new Z(new gt($e*f,$e*f),g);return h.rotation.x=-Math.PI/2,h.receiveShadow=!0,M.add(h,Zo(r,e),Xo(l)),M.position.y=s,M}var fe=64;function je(r,s){for(let l=0;l<r.length-1;l++){let[o,c,E]=r[l],[f,g,M]=r[l+1];if(s<=f){let h=(s-o)/Math.max(1e-6,f-o),D=E+(M-E)*h;return c.map((u,v)=>(u+(g[v]-u)*h)*D)}}let[,i,e]=r[r.length-1];return i.map(l=>l*e)}function cn(r,s,{steps:i=40}={}){var M,h,D;let e=new Float32Array(fe*2*4),l=new mo(e,fe,2,ro,no);l.magFilter=l.minFilter=oo,l.wrapS=l.wrapT=eo;let o={uTime:{value:0},uIntensity:{value:0},uReach:{value:1},uDiamond:{value:0},uSpacing:{value:((M=s.diamonds)==null?void 0:M.spacing)??.1},uCount:{value:((h=s.diamonds)==null?void 0:h.count)??6},uDiaColor:{value:new ut(...((D=s.diamonds)==null?void 0:D.color)??[1,.85,.6])},uGrad:{value:l},uTurb:{value:s.turbulence??1}},c=new He({uniforms:o,transparent:!0,depthWrite:!1,blending:to,side:Re,defines:{STEPS:i},vertexShader:`
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
      }`}),E=[],f={};function g(u){let v=Object.keys(s.modes);for(let R=0;R<2;R++)for(let x=0;x<fe;x++){let z=x/(fe-1),P=[0,0,0];for(let m of v){if(!u[m])continue;let S=je(s.modes[m][R?"edge":"core"],z);for(let k=0;k<3;k++)P[k]+=S[k]*u[m]}e.set([P[0],P[1],P[2],1],(R*fe+x)*4)}l.needsUpdate=!0}return{add(u,v,{length:R,r:x,h:z=1,w:P=1,light:m=!0}){let S=new Zt(1,2,2);S.translate(-.5,0,0);let k=new Z(S,c);k.position.copy(v),k.scale.set(R,x*z,x*P),k.frustumCulled=!1,k.userData.noAO=!0,k.visible=!1,u.add(k);let w=null;return m&&s.light&&(w=new Ro(16755302,0,s.light.distance,2),w.position.copy(v).add(new d(-R*.12,0,0)),u.add(w)),E.push({mesh:k,lamp:w}),k},update({w:u,level:v,optimal:R,reach:x=1,time:z,visible:P}){Object.keys(u).some(w=>Math.abs((f[w]??0)-u[w])>.01)&&(f={...u},g(f)),o.uTime.value=z,o.uIntensity.value=v*(s.brightness??1),o.uDiamond.value=R,o.uReach.value=x;let m=je(Object.values(s.modes)[0].core,.1),S=[0,0,0];for(let[w,V]of Object.entries(f)){if(!V)continue;let W=je(s.modes[w].core,.15);S=S.map((N,it)=>N+W[it]*V)}let k=Math.max(...S,.001);for(let w of E)w.mesh.visible=P&&v>.01,w.lamp&&(w.lamp.visible=w.mesh.visible,w.lamp.color.setRGB(S[0]/k,S[1]/k,S[2]/k),w.lamp.intensity=s.light.intensity*v*Math.min(1,k/2)*(.92+.08*Math.sin(z*37+m[0])))}}}export{on as a,nn as b,rn as c,cn as d};
