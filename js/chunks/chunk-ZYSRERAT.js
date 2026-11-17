import{$ as vt,A as Ut,B as io,C as De,D as nt,E as Zt,F as co,G as Ce,I as lo,J as ho,K as kt,L as uo,M as po,N as fo,O as ze,Q as Ue,R as Eo,S as mo,T as Vt,U as go,V as he,W as Mo,Y as vo,Z as bt,aa as ue,ba as wo,c as be,d as Je,da as Ro,e as to,h as He,i as eo,j as ce,k as Yt,l as Pt,m as oo,o as Dt,p as no,q as W,r as ao,s as le,t as u,u as ro,v as Se,x as ut,y as so,z as de}from"./chunk-5KNBVOBR.js";var yo=class extends wo{constructor(n){super(n),this.type=Pt}parse(n){let m=function(l,H){switch(l){case 1:throw new Error("THREE.HDRLoader: Read Error: "+(H||""));case 2:throw new Error("THREE.HDRLoader: Write Error: "+(H||""));case 3:throw new Error("THREE.HDRLoader: Bad File Format: "+(H||""));default:case 4:throw new Error("THREE.HDRLoader: Memory Error: "+(H||""))}},E=function(l,H,T){H=H||1024;let D=l.pos,x=-1,C=0,L="",F=String.fromCharCode.apply(null,new Uint16Array(l.subarray(D,D+128)));for(;0>(x=F.indexOf(`
`))&&C<H&&D<l.byteLength;)L+=F,C+=F.length,D+=128,F+=String.fromCharCode.apply(null,new Uint16Array(l.subarray(D,D+128)));return-1<x?(T!==!1&&(l.pos+=C+x+1),L+F.slice(0,x)):!1},s=function(l){let H=/^#\?(\S+)/,T=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,_=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,D=/^\s*FORMAT=(\S+)\s*$/,x=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,C={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0},L,F;for((l.pos>=l.byteLength||!(L=E(l)))&&m(1,"no header found"),(F=L.match(H))||m(3,"bad initial token"),C.valid|=1,C.programtype=F[1],C.string+=L+`
`;L=E(l),L!==!1;){if(C.string+=L+`
`,L.charAt(0)==="#"){C.comments+=L+`
`;continue}if((F=L.match(T))&&(C.gamma=parseFloat(F[1])),(F=L.match(_))&&(C.exposure=parseFloat(F[1])),(F=L.match(D))&&(C.valid|=2,C.format=F[1]),(F=L.match(x))&&(C.valid|=4,C.height=parseInt(F[1],10),C.width=parseInt(F[2],10)),C.valid&2&&C.valid&4)break}return C.valid&2||m(3,"missing format specifier"),C.valid&4||m(3,"missing image size specifier"),C},p=function(l,H,T){let _=H;if(_<8||_>32767||l[0]!==2||l[1]!==2||l[2]&128)return new Uint8Array(l);_!==(l[2]<<8|l[3])&&m(3,"wrong scanline width");let D=new Uint8Array(4*H*T);D.length||m(4,"unable to allocate buffer space");let x=0,C=0,L=4*_,F=new Uint8Array(4),dt=new Uint8Array(L),xt=T;for(;xt>0&&C<l.byteLength;){C+4>l.byteLength&&m(1),F[0]=l[C++],F[1]=l[C++],F[2]=l[C++],F[3]=l[C++],(F[0]!=2||F[1]!=2||(F[2]<<8|F[3])!=_)&&m(3,"bad rgbe scanline format");let ht=0,M;for(;ht<L&&C<l.byteLength;){M=l[C++];let O=M>128;if(O&&(M-=128),(M===0||ht+M>L)&&m(3,"bad scanline data"),O){let U=l[C++];for(let _t=0;_t<M;_t++)dt[ht++]=U}else dt.set(l.subarray(C,C+M),ht),ht+=M,C+=M}let Y=_;for(let O=0;O<Y;O++){let U=0;D[x]=dt[O+U],U+=_,D[x+1]=dt[O+U],U+=_,D[x+2]=dt[O+U],U+=_,D[x+3]=dt[O+U],x+=4}xt--}return D},A=function(l,H,T,_){let D=l[H+3],x=Math.pow(2,D-128)/255;T[_+0]=l[H+0]*x,T[_+1]=l[H+1]*x,T[_+2]=l[H+2]*x,T[_+3]=1},b=function(l,H,T,_){let D=l[H+3],x=Math.pow(2,D-128)/255;T[_+0]=de.toHalfFloat(Math.min(l[H+0]*x,65504)),T[_+1]=de.toHalfFloat(Math.min(l[H+1]*x,65504)),T[_+2]=de.toHalfFloat(Math.min(l[H+2]*x,65504)),T[_+3]=de.toHalfFloat(1)},V=new Uint8Array(n);V.pos=0;let R=s(V),I=R.width,k=R.height,g=p(V.subarray(V.pos),I,k),y,c,G;switch(this.type){case Yt:G=g.length/4;let l=new Float32Array(G*4);for(let T=0;T<G;T++)A(g,T*4,l,T*4);y=l,c=Yt;break;case Pt:G=g.length/4;let H=new Uint16Array(G*4);for(let T=0;T<G;T++)b(g,T*4,H,T*4);y=H,c=Pt;break;default:throw new Error("THREE.HDRLoader: Unsupported type: "+this.type)}return{width:I,height:k,data:y,header:R.string,gamma:R.gamma,exposure:R.exposure,type:c}}setDataType(n){return this.type=n,this}load(n,i,e,h){function a(m,z){switch(m.type){case Yt:case Pt:m.colorSpace=no,m.minFilter=ce,m.magFilter=ce,m.generateMipmaps=!1,m.flipY=!0;break}i&&i(m,z)}return super.load(n,a,e,h)}};var pe=class d extends nt{constructor(){let n=d.SkyShader,i=new Ce({name:n.name,uniforms:co.clone(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:be,depthWrite:!1});super(new Zt(1,1,1),i),this.isSky=!0}};pe.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new u},up:{value:new u(0,1,0)}},vertexShader:`
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

		}`};var{smoothstep:Ht,clamp:To}=W,fe=12e3,Xt={x:120,z:60,rx:750,rz:600},lt={x:-480,z:680,r:170},Jt=(d,n)=>{let i=Math.sin(d*127.1+n*311.7)*43758.5453;return i-Math.floor(i)};function xo(d,n){let i=Math.floor(d),e=Math.floor(n),h=d-i,a=n-e;h=h*h*(3-2*h),a=a*a*(3-2*a);let m=Jt(i,e),z=Jt(i+1,e),S=Jt(i,e+1),v=Jt(i+1,e+1);return m+(z-m)*h+(S-m)*a+(m-z-S+v)*h*a}function ke(d,n,i=5){let e=0,h=.5;for(let a=0;a<i;a++)e+=h*xo(d,n),d*=2.03,n*=2.03,h*=.5;return e}var Ao=(d,n)=>{let i=0,e=.5;for(let h=0;h<5;h++)i+=e*(1-Math.abs(xo(d,n)*2-1))**2,d*=2.1,n*=2.1,e*=.5;return i},qe=(d,n)=>Math.hypot((d-Xt.x)/Xt.rx,(n-Xt.z)/Xt.rz);function bo(d,n){let i=qe(d,n),e=Math.max(Ht(Math.abs(n),70,140),Ht(Math.abs(d-120),260,340)),h=(ke(d/260,n/260,3)-.5)*3*e;return h+=Ht(i,1,1.7)*(ke(d/520+7,n/520+3)*110-15),h+=Ht(i,2.1,3.4)*Ao(d/1400,n/1400)*520,h}function Io(d,n){let i=(d-lt.x)**2+(n-lt.z)**2;return bo(d,n)-26*Math.exp(-i/(lt.r*lt.r))}function Ho({lite:d,scale:n=1,vscale:i=n}){let e=n,h=i,a=Math.min(n,2.5),m=Math.min(n,1.6),z=new kt,S=d?160:240,v=new bt(fe,fe,S,S);v.rotateX(-Math.PI/2);let w=v.attributes.position,E=new Float32Array((S+1)*(S+1));for(let r=0;r<w.count;r++){let f=Io(w.getX(r),w.getZ(r));w.setY(r,f),E[r]=f}v.computeVertexNormals();let s=bo(lt.x,lt.z)-7,p=[[.64,.58,.34],[.25,.37,.16],[.42,.33,.22],[.44,.56,.27],[.55,.52,.3]],A=new Float32Array(w.count*3),b=new ut,V=new ut(.22,.37,.13),R=new ut(.32,.46,.17),I=new ut(.42,.39,.35),k=new ut(.92,.94,.96),g=new ut(.62,.57,.44),y=v.attributes.normal;for(let r=0;r<w.count;r++){let f=w.getX(r),q=w.getZ(r),Q=w.getY(r);b.copy(V).lerp(R,ke(f/90,q/90,3));let j=qe(f,q),Z=Jt(Math.floor(f/160)+.5,Math.floor(q/160)+.5);j<1.5&&Z<.55*(1-Ht(j,1,1.5))&&Math.abs(q)>80&&b.setRGB(...p[Math.floor(Jt(Math.floor(f/160),Math.floor(q/160)+9)*p.length)]),Math.abs(q)<70&&Math.abs(f-120)<300&&b.lerp(new ut(.4,.53,.26),.6);let N=1-y.getY(r);b.lerp(I,Ht(N,.12,.3)),b.lerp(k,Ht(Q,300,380)*(1-Ht(N,.3,.5))),Q<s+1.5&&Math.hypot(f-lt.x,q-lt.z)<lt.r*1.8&&b.lerp(g,.7),A.set([b.r,b.g,b.b],r*3)}v.setAttribute("color",new Ut(A,3));let c=document.createElement("canvas");c.width=c.height=256;let G=c.getContext("2d");G.fillStyle="#d8d8d8",G.fillRect(0,0,256,256);for(let r=0;r<9e3;r++){let f=150+Math.random()*105;G.fillStyle=`rgb(${f},${f},${f})`,G.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3)}let l=new Vt(c);l.wrapS=l.wrapT=He,l.colorSpace=Dt,l.anisotropy=d?2:8;let H=v.attributes.uv;for(let r=0;r<H.count;r++)H.setXY(r,w.getX(r)/24,w.getZ(r)/24);let T=new nt(v,new ue({vertexColors:!0,map:l}));T.scale.set(e,h,e),T.receiveShadow=!0,z.add(T);let _=new nt(new go(lt.r*2.2,48),new vt({color:2902622,roughness:.08,metalness:.2,transparent:!0,opacity:.88}));_.rotation.x=-Math.PI/2,_.position.set(lt.x*e,s*h,lt.z*e),_.scale.set(e,e,1),z.add(_);let D=fe/S;function x(r,f){return h*C(r/e,f/e)}function C(r,f){let q=To((r+fe/2)/D,0,S-1e-6),Q=To((f+fe/2)/D,0,S-1e-6),j=Math.floor(q),Z=Math.floor(Q),N=q-j,mt=Q-Z,Rt=E[Z*(S+1)+j],jt=E[Z*(S+1)+j+1],Ot=E[(Z+1)*(S+1)+j],o=E[(Z+1)*(S+1)+j+1];return N+mt<1?Rt+(jt-Rt)*N+(Ot-Rt)*mt:o+(Ot-o)*(1-N)+(jt-o)*(1-mt)}let L=25*e,F=new Map,dt=[],xt=(r,f)=>`${Math.floor(r/L)},${Math.floor(f/L)}`;function ht(r){let f=xt(r.x,r.z);F.has(f)||F.set(f,[]),F.get(f).push(r)}function M(r){for(let Q of dt)if(r.x>Q.x0&&r.x<Q.x1&&r.z>Q.z0&&r.z<Q.z1&&r.y<Q.top)return Q.name;let f=Math.floor(r.x/L),q=Math.floor(r.z/L);for(let Q=-1;Q<=1;Q++)for(let j=-1;j<=1;j++){let Z=F.get(`${f+Q},${q+j}`);if(Z){for(let N of Z)if(r.y>N.y0&&r.y<N.top&&(r.x-N.x)**2+(r.z-N.z)**2<N.r*N.r)return N.name}}return null}let Y=new ue({color:7171176}),O=(r,f,q,Q)=>{let j=new nt(new bt(r*(r>200?e:a),f*a),Y);j.rotation.x=-Math.PI/2,j.position.set(q*e,.02,Q*a),j.receiveShadow=!0,z.add(j)};O(300,7,120,-28),O(8,22,20,-14),O(8,22,220,-14),O(110,34,120,-56);let U=new vt({color:9080724,roughness:.6,metalness:.3}),_t=new vt({color:5988455,roughness:.5,metalness:.4});for(let r of[90,150]){let f=new nt(new Zt(26*a,6*a,18*a),U);f.position.set(r*e,3*a,-84*a);let q=new nt(new he(9*a,9*a,26*a,20,1,!1,0,Math.PI),_t);q.rotation.z=Math.PI/2,q.position.set(r*e,6*a,-84*a),q.scale.set(.45,1,1),f.castShadow=q.castShadow=!0,dt.push({name:"un hangar",x0:r*e-13*a,x1:r*e+13*a,z0:-93*a,z1:-75*a,top:10*a}),z.add(f,q)}let qt=new nt(new he(.06,.08,6,6),new vt({color:14540253}));qt.position.set(60*e,3*a,-22*a),qt.scale.setScalar(a),ht({name:"el m\xE1stil de la manga",x:60*e,z:-22*a,y0:0,top:6.2*a,r:.2*a}),z.add(qt);let pt=new kt;pt.position.set(60*e,5.9*a,-22*a),pt.scale.setScalar(a);let ft=new he(.35,.16,2.6,12,5,!0);ft.rotateZ(-Math.PI/2),ft.translate(1.3,0,0);let te=[],ee=ft.attributes.position;for(let r=0;r<ee.count;r++){let f=Math.floor(ee.getX(r)/.52)%2;te.push(...f?[.95,.95,.95]:[1,.45,.12])}ft.setAttribute("color",new io(te,3));let me=new nt(ft,new vt({vertexColors:!0,side:Je,roughness:.8}));pt.add(me),z.add(pt);let $t=0;function ge(r,f=1/60){let q=Math.hypot(r.x,r.z);$t+=f,pt.rotation.y=Math.atan2(-r.z,r.x)+Math.sin($t*3.1)*.05,pt.rotation.z=-(1-Ht(q,.5,7))*1.2+Math.sin($t*4.3)*.03}let Ft=d?700:2200,it=new he(.25,.4,3,5);it.translate(0,1.5,0);let Me=new Mo(2.4,8,7);Me.translate(0,6.5,0);let ve=new vo(3,0);ve.translate(0,5,0);let t=new ue({flatShading:!0}),ct=new ze(it,new ue({color:4863526}),Ft),St=new ze(Me,t,Ft),At=new ze(ve,t,Ft),Et=new Se,oe=new le,we=new u,Re=new u,It=0,Lt=0,Wt=0,Gt=0,wt=new ut;for(;It<Ft&&Gt++<Ft*40;){let r=Xt.x+(Math.random()*2-1)*3e3,f=Xt.z+(Math.random()*2-1)*2600,q=qe(r,f);if(Math.abs(f)<110&&Math.abs(r-120)<360||Math.hypot(r-lt.x,f-lt.z)<lt.r*1.1||ke(r/400+31,f/400+17,3)<(q<1?.56:.44)&&Math.random()>.04)continue;let j=C(r,f);if(j>330||j<s+1)continue;let Z=j*h,N=j>60||q>1.2&&Math.random()<.7,mt=(.7+Math.random()*.8)*m,Rt=mt*(.9+Math.random()*.4);oe.setFromAxisAngle(new u(0,1,0),Math.random()*Math.PI*2),Et.compose(Re.set(r*e,Z-.3,f*e),oe,we.set(mt,Rt,mt)),ht({name:"un \xE1rbol",x:r*e,z:f*e,y0:Z-.3,top:Z-.3+(N?10.5:8)*Rt,r:(N?1.5:2.3)*mt}),ct.setMatrixAt(It++,Et),wt.setHSL(N?.3+Math.random()*.04:.22+Math.random()*.08,.45,N?.16+Math.random()*.06:.22+Math.random()*.08),N?(St.setMatrixAt(Lt,Et),St.setColorAt(Lt++,wt)):(At.setMatrixAt(Wt,Et),At.setColorAt(Wt++,wt))}ct.count=It,St.count=Lt,At.count=Wt;for(let r of[ct,St,At])r.castShadow=!d,r.instanceMatrix.needsUpdate=!0,r.instanceColor&&(r.instanceColor.needsUpdate=!0),z.add(r);return{group:z,heightAt:x,setWind:ge,hit:M,scale:e,side:a}}var Lo=1.225,Ve=9.81,Go={m:7.2,S:.34,b:1.34,c:.28,I:new u(.28,.85,.62)},Bo={a:4.6,z:0,flap:.55,de:.35,stall:W.degToRad(15)},Po={z:.028,k:.065,flap:.05,gear:.018},Do={z:0,a:-.9,q:-14,de:-1.15,flap:-.06},Uo={b:-.08,p:-.48,da:.2,r:.08},qo={b:.13,r:-.18,dr:-.09},$o=[{p:new u(.6,-.18,0),steer:!0},{p:new u(-.04,-.18,.238)},{p:new u(-.04,-.18,-.238)}],Wo=[[.78,0,0],[-.8,.05,0],[-.68,.32,0],[-.12,.02,.67],[-.12,.02,-.67],[.2,.1,0]].map(d=>new u(...d)),jo=[[.5,-.06,0],[-.3,-.06,0],[-.04,-.07,.24],[-.04,-.07,-.24]].map(d=>({p:new u(...d)})),Oo={AC:Go,CL:Bo,CD:Po,CM:Do,CR:Uo,CN:qo,WHEELS:$o,SKIN:Wo,BELLY:jo,world:1,size:1,vref:22,ground:.185,eye:[.486,.09],tips:[new u(-.12,.02,.67),new u(-.12,.02,-.67)]};function an({model:d,parts:n,S:i,m:e,AR:h,e:a,cd0:m,vref:z,eye:S,canopy:v=[],thrust:w,hud:E,world:s=10}){let p=Math.sqrt(h*i),A=i/p;d.updateMatrixWorld(!0);let b=d.matrixWorld.clone().invert(),V=M=>new ro().setFromObject(M).applyMatrix4(b),R=V(d),I=R.max.x-R.min.x,g=n.filter(M=>/tren|gear|rueda|wheel/i.test(M.data.part+" "+(M.data.label??""))).map(M=>V(M.obj)).filter(M=>isFinite(M.min.y)).map(M=>({p:new u((M.min.x+M.max.x)/2,M.min.y,(M.min.z+M.max.z)/2)}));if(g.length<3){let M=R.min.y;g=[{p:new u(R.min.x+.78*I,M,0)},{p:new u(R.min.x+.38*I,M,.12*p)},{p:new u(R.min.x+.38*I,M,-.12*p)}]}g.sort((M,Y)=>Y.p.x-M.p.x),g[0].steer=!0;let y=g.slice(1).reduce((M,Y)=>M+Y.p.x,0)/(g.length-1),c=new u(y+.1*(g[0].p.x-y),(R.min.y+R.max.y)/2,0);for(let M of g)M.p.sub(c);let G=Math.min(...g.map(M=>M.p.y)),l=-G+.02,H=new u,T=new u,_=-1/0,D=1/0,x=new u;d.traverse(M=>{if(!M.isMesh)return;let Y=M.geometry.attributes.position,O=b.clone().multiply(M.matrixWorld);for(let U=0;U<Y.count;U+=7)x.fromBufferAttribute(Y,U).applyMatrix4(O),x.z>_&&(_=x.z,H.copy(x)),x.z<D&&(D=x.z,T.copy(x))});let C=new Set;for(let M of v)M.traverse(Y=>C.add(Y));let L=-1/0;d.traverse(M=>{if(!M.isMesh||C.has(M))return;let Y=M.geometry.attributes.position,O=b.clone().multiply(M.matrixWorld);for(let U=0;U<Y.count;U+=3)x.fromBufferAttribute(Y,U).applyMatrix4(O),Math.abs(x.x-S[0])<.4&&Math.abs(x.z)<.35&&x.y>L&&(L=x.y)});let F=Math.max(S[1],L+.15);H.sub(c),T.sub(c),R.min.sub(c),R.max.sub(c);let dt=[new u(R.max.x,(R.min.y+R.max.y)/2-.1*(R.max.y-R.min.y),0),new u(R.min.x,G+.35*(R.max.y-G),0),new u(R.min.x+.1*I,R.max.y,0),H.clone(),T.clone()],xt=[[.75,0],[.3,0],[.45,.25],[.45,-.25]].map(([M,Y])=>({p:new u(R.min.x+M*I,G+.15*(R.max.y-G),Y*p*.5)})),ht=2*Math.PI*h/(2+Math.sqrt(h*h+4));return{AC:{m:e,S:i,b:p,c:A,I:new u(e*(.22*p)**2,e*(.32*I)**2,e*(.3*I)**2)},CL:{a:ht,z:.02,flap:.35,de:.3,stall:W.degToRad(h<3?24:16)},CD:{z:m,k:1/(Math.PI*a*h),flap:.04,gear:.015},CM:{z:0,a:-.55,q:-10,de:-.8,flap:-.04},CR:{b:-.06,p:-.4,da:.12,r:.06},CN:{b:.1,r:-.15,dr:-.07},WHEELS:g,SKIN:dt,BELLY:xt,world:s,size:I/1.6,vref:z,ground:l,eye:[S[0]-c.x,F-c.y],canopy:v,tips:[H,T],thrust:w,hud:E,fixedGear:!0,cg:c}}function rn({scene:d,renderer:n,camera:i,model:e,op:h,motor:a,lite:m,setGear:z,setSurfaces:S,gearState:v,pad:w,airframe:E=Oo}){let{AC:s,CL:p,CD:A,CM:b,CR:V,CN:R,WHEELS:I,SKIN:k,BELLY:g}=E,y=E.world,c=E.size,G=E.vref,l=G/22,H=s.m/7.2,T=new kt;T.visible=!1,d.add(T);let _=Ho({lite:m,scale:y,vscale:y>1?3:1});T.add(_.group);let D=document.createElement("canvas");D.width=256,D.height=4096;let x=D.getContext("2d");x.fillStyle="#2b2c2e",x.fillRect(0,0,256,4096);for(let o=0;o<4e3;o++)x.fillStyle=`rgba(255,255,255,${Math.random()*.04})`,x.fillRect(Math.random()*256,Math.random()*4096,2,2);x.fillStyle="#e8e6e0";for(let o=300;o<3800;o+=160)x.fillRect(124,o,8,80);x.fillRect(8,0,6,4096),x.fillRect(242,0,6,4096);for(let o=0;o<8;o++)x.fillRect(24+o*26,60,14,160),x.fillRect(24+o*26,3876,14,160);let C=new Vt(D);C.colorSpace=Dt,C.anisotropy=m?2:8;let L=new nt(new bt(14*_.side*(y>1?1.3:1),320*y),new vt({map:C,roughness:.85}));L.rotation.x=-Math.PI/2,L.rotation.z=Math.PI/2,L.position.set(120*y,.03,0),L.receiveShadow=!0,T.add(L);let F=new pe;F.scale.setScalar(1e4);let dt=new u().setFromSphericalCoords(1,W.degToRad(60),W.degToRad(160));Object.assign(F.material.uniforms.sunPosition.value,dt),F.material.uniforms.turbidity.value=4,F.material.uniforms.rayleigh.value=1.4;let xt=new po;xt.add(F);let ht=null;function M(){let o=new ho(m?256:512,{type:Pt});return new lo(1,2e4,o).update(n,xt),o.texture}let Y=null,O=new kt;T.add(O);let U=70,_t=E.tips,qt=_t.map(()=>{let o=new De;o.setAttribute("position",new Ut(new Float32Array(U*3),3)),o.setAttribute("color",new Ut(new Float32Array(U*4),4));let $=new Eo(o,new Ue({vertexColors:!0,transparent:!0,depthWrite:!1}));return $.frustumCulled=!1,O.add($),{geo:o,n:0}}),pt=m?70:160,ft=new De,te=new Float32Array(pt*6),ee=new Float32Array(pt*8);ft.setAttribute("position",new Ut(te,3)),ft.setAttribute("color",new Ut(ee,4));let me=new mo(ft,new Ue({vertexColors:!0,transparent:!0,depthWrite:!1}));me.frustumCulled=!1,O.add(me);let $t=Array.from({length:pt},()=>({p:new u,seed:Math.random()}));function ge(o,$){let B=t.v.lengthSq()>1?t.v.clone().normalize():new u(1,0,0).applyQuaternion(t.q),P=new u(0,1,0).cross(B).normalize(),gt=B.clone().cross(P).normalize(),yt=(.5+Math.random()*2.2)*c,at=Math.random()*Math.PI*2;o.p.copy(t.p).addScaledVector(B,($?6+Math.random()*10:(Math.random()-.3)*16)*c).addScaledVector(P,Math.cos(at)*yt).addScaledVector(gt,Math.sin(at)*yt*.7)}function Ft(o,$){let B=W.smoothstep($.V,6*l,30*l),P=$.onGround?0:B*W.clamp(.25+$.alpha*5,0,1);_t.forEach((at,X)=>{let J=qt[X],rt=J.geo.attributes.position.array,K=J.geo.attributes.color.array;rt.copyWithin(3,0,(U-1)*3),K.copyWithin(4,0,(U-1)*4);let st=at.clone().applyQuaternion(t.q).add(t.p);rt.set([st.x,st.y,st.z],0),K.set([1,1,1,P*.75],0),J.n=Math.min(U,J.n+1);for(let et=0;et<U;et++)K[et*4+3]*=et===0?1:.985;for(let et=0;et<U;et++){let Nt=et*3;rt[Nt]+=it.x*o,rt[Nt+1]+=(it.y-.15)*o,rt[Nt+2]+=it.z*o}if(J.n<U)for(let et=J.n;et<U;et++)rt.copyWithin(et*3,(J.n-1)*3,J.n*3),K[et*4+3]=0;J.geo.attributes.position.needsUpdate=J.geo.attributes.color.needsUpdate=!0});let gt=it.clone().sub(t.v),yt=t.v.lengthSq()>1?t.v.clone().normalize():new u(1,0,0);for(let at=0;at<pt;at++){let X=$t[at];X.p.addScaledVector(it,o);let J=X.p.clone().sub(t.p);(J.dot(yt)<-10*c||J.length()>20*c)&&ge(X,!0);let rt=1-W.smoothstep(X.p.distanceTo(t.p),1.5*c,9*c),K=B*rt*(.25+.35*X.seed),st=X.p.clone().addScaledVector(gt,-.05);te.set([X.p.x,X.p.y,X.p.z,st.x,st.y,st.z],at*6),ee.set([.9,.95,1,K,.9,.95,1,0],at*8)}ft.attributes.position.needsUpdate=ft.attributes.color.needsUpdate=!0}let it=new u,Me=new u(-1.6,0,.2);function ve(o,$){let B=.6+.4*Math.sin(o*.37)*Math.sin(o*.11+1.3),P=W.clamp($/25,.1,1)*.55;it.copy(Me).multiplyScalar(B),it.x+=P*(Math.sin(o*1.7)+.5*Math.sin(o*4.3+2)),it.y+=P*.6*(Math.sin(o*2.1+.7)+.5*Math.sin(o*5.9)),it.z+=P*(Math.sin(o*1.3+4)+.5*Math.sin(o*3.7+1))}let t={p:new u,v:new u,q:new le,w:new u,throttle:0,roll:0,pitch:0,yaw:0,flap:.5,brake:0,gearUp:!1,crashed:!1,cam:"chase",t:0,assist:!0},ct=new Set,St={pos:e.position.clone(),quat:e.quaternion.clone()};function At(){t.p.set(y>1?-34*y:0,E.ground,0),t.v.set(0,0,0),t.q.identity(),t.w.set(0,0,0),t.throttle=0,t.flap=.5,t.gearUp=!1,t.onGround=!0,t.hold=0,t.bankHold=0,t.trim=0,t.crashed=!1,t.crashWhy="",v.target=0;for(let o of qt)o.n=0;for(let o of $t)ge(o,!1)}let Et={gear(){!E.fixedGear&&t.p.y>1.5&&(t.gearUp=!t.gearUp,v.target=t.gearUp?1:0)},flap(){t.flap=t.flap>.6?0:t.flap+.5},cam(){t.cam=t.cam==="chase"?"cockpit":"chase"},reset:At,engine(){a.on=!a.on},assist(){t.assist=!t.assist}},oe=o=>$=>{let B=$.key.toLowerCase();o&&!$.repeat&&(B==="g"&&Et.gear(),B==="f"&&Et.flap(),B==="c"&&Et.cam(),B==="r"&&Et.reset(),B==="e"&&Et.engine(),B==="t"&&Et.assist()),["w","s","a","d","q","e","shift","control","b","arrowup","arrowdown"," "].includes(B)&&$.preventDefault(),o?ct.add(B):ct.delete(B)},we=oe(!0),Re=oe(!1),It=null,Lt=()=>!!(w!=null&&w.touch),Wt=new u;function Gt(o){t.crashed||(t.crashed=!0,t.crashWhy=o,t.v.set(0,0,0),t.w.set(0,0,0))}let wt=new u;function r(o){let $=(tt,ot)=>(ct.has(tt)?1:0)-(ct.has(ot)?1:0),B=tt=>Math.max(-1,Math.min(1,tt)),P=It;t.pitch+=(B($("s","w")+((P==null?void 0:P.pitch)??0))-t.pitch)*Math.min(1,o*6),t.roll+=(B($("d","a")+((P==null?void 0:P.roll)??0))-t.roll)*Math.min(1,o*7);let gt=B($("z","x")+((P==null?void 0:P.yaw)??0)),yt=new u(1,0,0).applyQuaternion(t.q),at=Math.atan2(yt.z,yt.x),X=t.v.length();if(!t.onGround||Math.abs(gt)>.02||X<1||X>25*l)t.hold=at;else if(t.assist){let tt=W.clamp(10*l/X,.4,1);gt=W.clamp(Math.atan2(Math.sin(at-t.hold),Math.cos(at-t.hold))*6+t.w.y*.4,-tt,tt)}t.yaw+=(gt-t.yaw)*Math.min(1,o*5),(ct.has("shift")||ct.has("arrowup"))&&(t.throttle=Math.min(1,t.throttle+o*.5)),(ct.has("control")||ct.has("arrowdown"))&&(t.throttle=Math.max(0,t.throttle-o*.5)),(P==null?void 0:P.throttle)!=null&&(t.throttle=P.throttle),P!=null&&P.throttleRate&&(t.throttle=Math.min(1,Math.max(0,t.throttle+P.throttleRate*o*.6))),t.brake=ct.has("b")||ct.has(" ")?1:0,a.target=t.throttle;let J=new Se().makeRotationFromQuaternion(t.q),rt=J.clone().transpose();t.t+=o,ve(t.t,t.p.y),wt.copy(t.v).sub(it).applyMatrix4(rt);let K=Math.max(.01,wt.length()),st=Math.atan2(-wt.y,wt.x),et=Math.asin(W.clamp(wt.z/K,-1,1)),Nt=Lo*Math.pow(Math.max(.05,1-22558e-9*Math.max(0,t.p.y)),4.2559),Ct=.5*Nt*K*K,Oe=E.thrust?E.thrust({V:K,h:t.p.y,rho:Nt}):a.on?h(a.f).thrust*a.spin:0,_e=t.assist?W.clamp((G/Math.max(K,1))**2,.22,1):1,Ne=-t.pitch*W.degToRad(16)*_e,So=t.roll*W.degToRad(20)*_e,Fe=-t.yaw*W.degToRad(22)*Math.max(_e,.45),Kt=t.flap*.8,Co=1-v.t,ye=p.z+p.a*st+p.flap*Kt-p.de*Ne*.1;Math.abs(st)>p.stall&&(ye=Math.sign(st)*(p.a*p.stall)*Math.max(.35,1-(Math.abs(st)-p.stall)*3)+p.flap*Kt*.5);let zo=A.z+A.k*ye*ye+A.flap*Kt+A.gear*Co+.4*Math.max(0,Math.abs(st)-p.stall),ne=new u;if(K>.5){let tt=wt.clone().normalize(),ot=new u(0,0,1).cross(tt).normalize();ne.addScaledVector(ot,Ct*s.S*ye),ne.addScaledVector(tt,-Ct*s.S*zo),ne.z+=-Ct*s.S*.6*et}ne.x+=Oe;let Ke=t.w.x*s.b/(2*K),Ae=t.w.y*s.b/(2*K),Ie=t.w.z*s.c/(2*K),ko=s.m*Ve/Math.max(1,Ct*s.S)-p.flap*Kt;t.trim+=(-b.a*W.clamp(ko/p.a,0,p.stall*.7)-b.flap*Kt-t.trim)*Math.min(1,o*.8);let Vo=t.onGround?0:t.trim,Qt=new u(Ct*s.S*s.b*(V.b*et+V.p*Ke+V.da*So+V.r*Ae),Ct*s.S*s.b*(R.b*-et+R.r*Ae+R.dr*Fe),Ct*s.S*s.c*(b.z+b.a*st+b.q*Ie+b.de*Ne+b.flap*Kt+Vo));if(t.assist&&K>8*l){let tt=new u(0,0,1).applyQuaternion(t.q),ot=Math.asin(W.clamp(-tt.y,-1,1)),zt=Math.asin(W.clamp(t.v.y/K,-1,1)),Tt=Ct*s.S,Mt=Math.abs(t.roll)>=.05;Mt&&(t.bankHold=ot);let re=Math.abs(t.bankHold??0)<W.degToRad(12)?0:W.clamp(t.bankHold,-.79,.79);Mt?Qt.x+=Tt*s.b*-.2*Ke:Qt.x+=s.I.x*6*(.8*(re-ot)-t.w.x);let Bt=s.m*Ve/Math.max(1,Tt*s.S)*(1/Math.max(.45,Math.cos(ot))-1)/p.a;Qt.z+=Math.abs(t.pitch)<.05?Tt*s.c*(-.6*zt-3*Ie-b.a*Bt):Tt*s.c*-3*Ie,Qt.z+=Tt*s.c*-2.5*Math.max(0,st-.8*p.stall);let ie=-(Ve*Math.tan(W.clamp(ot,-1.2,1.2)))/K*Math.cos(ot)*s.b/(2*K);Qt.y+=Tt*s.b*(-.03*et-.5*(Ae-ie))}let Le=ne.clone().applyMatrix4(J);Le.y-=s.m*Ve;let Qe=new u,Te=!1,ae=v.t<.05?I:g;for(let tt of ae){let ot=tt.p.clone().applyQuaternion(t.q),zt=ot.clone().add(t.p),Tt=_.heightAt(zt.x,zt.z)-zt.y;if(Tt<=0)continue;Tt>.3*c&&Gt("contra el terreno"),Te=!0;let Mt=t.v.clone().add(new u().copy(t.w).applyQuaternion(t.q).cross(ot)),re=Math.max(0,1250*H*7.2*Tt/c-36*H*7.2*Mt.y),se=new u(0,re,0),Bt=new u(1,0,0).applyQuaternion(t.q).setY(0).normalize(),ie=new u(0,1,0).cross(Bt),Fo=ae===g?.5:.02+.5*t.brake,Ye=s.m/ae.length,Pe=Mt.dot(Bt);se.addScaledVector(Bt,-Math.sign(Pe)*Math.min(Math.abs(Pe)*40*H,Fo*re,.5*Ye*Math.abs(Pe)/o));let Ze=tt.steer?Mt.dot(ie)+Bt.dot(Mt)*Fe*.8:Mt.dot(ie),Xe=Math.min(.9*re,.5*Ye*Math.abs(Ze)/o+(tt.steer?Math.abs(Bt.dot(Mt)*Fe)*400*H:0));se.addScaledVector(ie,-W.clamp(Ze*400*H,-Xe,Xe)),Le.add(se),Qe.add(ot.clone().cross(se)),ae===g&&-Mt.y>2.5&&Gt("aterrizaje de panza demasiado fuerte"),ae===I&&-Mt.y>4&&Gt("aterrizaje demasiado fuerte, se rompi\xF3 el tren")}t.v.addScaledVector(Le,o/s.m),t.p.addScaledVector(t.v,o);for(let tt of k){let ot=Wt.copy(tt).applyQuaternion(t.q).add(t.p),zt=_.hit(ot);if(zt){Gt(`choque contra ${zt}`);break}if(_.heightAt(ot.x,ot.z)-ot.y>.03*c){Gt(tt.z?"una punta de ala toc\xF3 el suelo":tt.x>0?"el morro contra el suelo":"la cola contra el suelo");break}}let Ge=Qt.add(Qe.applyMatrix4(rt)),_o=new u(s.I.x*t.w.x,s.I.y*t.w.y,s.I.z*t.w.z),Be=t.w.clone().cross(_o);t.w.x+=(Ge.x-Be.x)/s.I.x*o,t.w.y+=(Ge.y-Be.y)/s.I.y*o,t.w.z+=(Ge.z-Be.z)/s.I.z*o,Te&&t.w.multiplyScalar(.995);let xe=t.q.clone().multiply(new le(t.w.x*o*.5,t.w.y*o*.5,t.w.z*o*.5,0));return t.q.x+=xe.x,t.q.y+=xe.y,t.q.z+=xe.z,t.q.w+=xe.w,t.q.normalize(),S({roll:t.roll,pitch:t.pitch,yaw:t.yaw,flap:t.flap}),t.onGround=Te,{V:K,alpha:st,onGround:Te,thrust:Oe}}let f={V:0,alpha:0,onGround:!0,thrust:0},q=!1;function Q(o,$){q=!0,It=$;for(let B=0;B<8;B++)f=r(o/8);return f}let j=new u(-3.4*c,.9*c,0);function Z(o){if(t.crashed){Rt(`<b>Accidente</b> \xB7 ${t.crashWhy}<br>${Lt()?"Reinicio":"R"} para volver a la pista`);return}if(!q){It=(w==null?void 0:w.read())??null;for(let rt=0;rt<8;rt++)f=r(o/8)}Ft(o,f),_.setWind(it,o),e.position.copy(t.p),E.cg&&e.position.sub(Wt.copy(E.cg).applyQuaternion(t.q)),e.quaternion.copy(t.q);let $=new u(1,0,0).applyQuaternion(t.q),B=new u(0,1,0).applyQuaternion(t.q);if(t.cam==="chase"){let rt=(i.aspect<1?2.6:3.4)*c,K=$.clone().multiplyScalar(-rt).add(new u(0,rt*.27,0));j.lerp(K,Math.min(1,o*3)),i.position.copy(t.p).add(j),i.up.set(0,1,0),i.lookAt(t.p.clone().addScaledVector($,2*c).add(new u(0,(Lt()?-.8:-.5)*c,0)))}else i.position.copy(t.p).addScaledVector($,E.eye[0]).addScaledVector(B,E.eye[1]),i.up.copy(B),i.lookAt(i.position.clone().addScaledVector($,10*c).addScaledVector(B,-1.7*c));let P=t.cam==="chase"?null:70;P&&i.fov!==P&&(i.fov=P,i.updateProjectionMatrix()),!P&&t.cam!==Z.cam&&jt(),t.cam!==Z.cam&&N(t.cam!=="cockpit"),Z.cam=t.cam;let gt=E.hud?null:h(a.f),yt=Math.max(0,t.p.y-_.heightAt(t.p.x,t.p.z)),at=f.V*3.6,X=t.v.y,J=f.alpha>p.stall;if(innerWidth<560){Rt(`<b>${at.toFixed(0)}</b> km/h \xB7 <b>${yt.toFixed(0)}</b> m \xB7 ${X>=0?"+":""}${X.toFixed(1)} m/s<br>`+(E.hud?E.hud(f,t,!0):a.on?`<b>${Math.round(gt.n*a.spin/1e3)}k</b> rpm \xB7 ${f.thrust.toFixed(0)} N \xB7 gas ${(t.throttle*100).toFixed(0)} %`:"MW54 apagada \xB7 Motor para arrancar")+(J?"<br><b>P\xC9RDIDA</b> \xB7 baja el morro":t.brake?"<br>frenos":""));return}Rt(`<b>${at.toFixed(0)}</b> km/h \xB7 <b>${yt.toFixed(1)}</b> m \xB7 ${X>=0?"+":""}${X.toFixed(1)} m/s \xB7 \u03B1 ${W.radToDeg(f.alpha).toFixed(0)}\xB0<br>`+(E.hud?E.hud(f,t,!1):`MW54 ${a.on?`<b>${Math.round(gt.n*a.spin).toLocaleString("es-ES")}</b> rpm \xB7 ${f.thrust.toFixed(0)} N \xB7 EGT ${Math.round(15+(gt.egt-15)*a.heat)} \xB0C`:`apagada (${Lt()?"Motor":"E"} para arrancar)`} \xB7 gas ${(t.throttle*100).toFixed(0)} %`)+`<br>Viento ${it.length().toFixed(1)} m/s \xB7 Tren ${v.t<.05?"abajo":v.t>.95?"arriba":"en tr\xE1nsito"} \xB7 flaps ${(t.flap*40).toFixed(0)}\xB0 \xB7 gir\xF3scopo ${t.assist?"s\xED":"no"}${t.brake?" \xB7 frenos":""}${J?" \xB7 <b>P\xC9RDIDA</b>":""}`)}function N(o){for(let $ of E.canopy??[])$.visible=o}let mt="";function Rt(o){o!==mt&&(mt=o,document.getElementById("hud").innerHTML=o)}function jt(){i.fov=W.clamp(W.radToDeg(2*Math.atan(Math.tan(W.degToRad(28))/i.aspect)),40,66),i.updateProjectionMatrix()}function Ot(o,$=o){o&&!T.visible&&(ht??=M(),Y=d.background,d.background=ht),!o&&T.visible&&(d.background=Y),T.visible=o,O.visible=$;let B=Math.sqrt(y);d.fog=o?new uo(11124692,900*B,(m?4500:6500)*B):null,i.up.set(0,1,0),i.near=o?.004*c:.01,i.far=o?12e3*y:50,o?jt():(i.fov=32,i.updateProjectionMatrix())}return{enter(){Ot(!0),At(),w==null||w.reset(0),addEventListener("keydown",we),addEventListener("keyup",Re),j.set(-3.4*c,.9*c,0)},exit(){Ot(!1),removeEventListener("keydown",we),removeEventListener("keyup",Re),ct.clear(),N(!0),Z.cam=null,document.fullscreenElement&&document.exitFullscreen().catch(()=>{}),e.position.copy(St.pos),e.quaternion.copy(St.quat)},update:Z,simulate:Q,endTest(){q=!1},fit:jt,showWorld:Ot,home:St,terrain:_,airframe:E,state:t}}var We=4;function No(d,n){let i=(s,p)=>{let A=new Float32Array(s*s),b=p;for(let V=0;V<A.length;V++)b=b*1664525+1013904223>>>0,A[V]=b/4294967296;return(V,R)=>{let I=V*s,k=R*s,g=Math.floor(I),y=Math.floor(k),c=I-g,G=k-y;c=c*c*(3-2*c),G=G*G*(3-2*G);let l=(H,T)=>A[(T%s+s)%s*s+(H%s+s)%s];return(l(g,y)*(1-c)+l(g+1,y)*c)*(1-G)+(l(g,y+1)*(1-c)+l(g+1,y+1)*c)*G}},e=[[5,.25],[12,.25],[30,.2],[80,.15],[200,.15]].map(([s,p],A)=>[i(s,7+A*31),p]),h=[i(3,101),i(11,202)],a=document.createElement("canvas"),m=document.createElement("canvas");a.width=a.height=m.width=m.height=n;let z=a.getContext("2d"),S=m.getContext("2d"),v=z.createImageData(n,n),w=S.createImageData(n,n);for(let s=0;s<n;s++)for(let p=0;p<n;p++){let A=p/n,b=s/n,V=0;for(let[G,l]of e)V+=G(A,b)*l;let R=Math.random(),I=R>.985?.12*Math.random():R<.01?-.16*Math.random():(Math.random()-.5)*.04,k=36+(V-.5)*12+I*110,g=(s*n+p)*4;v.data[g]=k,v.data[g+1]=k+2,v.data[g+2]=k+5,v.data[g+3]=255;let c=160+(.5*h[0](A,b)+.5*h[1](A,b)-.5)*60+Math.abs(I)*300;w.data[g]=w.data[g+1]=w.data[g+2]=c,w.data[g+3]=255}z.putImageData(v,0,0),S.putImageData(w,0,0);let E=[a,m].map(s=>{let p=new Vt(s);return p.wrapS=p.wrapT=He,p.anisotropy=d.capabilities.getMaxAnisotropy(),p});return E[0].colorSpace=Dt,E}function Ko(d,n,i){d.onBeforeCompile=e=>{e.uniforms.uFade={value:new ao(n,i)},e.uniforms.uBg={value:new ut(855826)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;
uniform vec2 uFade;
uniform vec3 uBg;`).replace("#include <tonemapping_fragment>",`gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));
#include <tonemapping_fragment>`)}}function Qo(d,{W:n,D:i,box:e,dash:h,stops:a,stop:m}){let z=Math.min(512,2600/n),S=document.createElement("canvas");S.width=n*z,S.height=i*z;let v=S.getContext("2d"),w=k=>(k+n/2)*z,E=k=>(k+i/2)*z,s="#d9a93a";v.fillStyle=s;for(let[k,g]of[[e.x0,1],[e.x1,-1]])for(let[y,c]of[[e.z0,1],[e.z1,-1]])v.fillRect(Math.min(w(k),w(k+g*e.arm)),Math.min(E(y),E(y+c*e.w)),e.arm*z,e.w*z),v.fillRect(Math.min(w(k),w(k+g*e.w)),Math.min(E(y),E(y+c*e.arm)),e.w*z,e.arm*z);let[p,A,b]=h;for(let k=e.x0+A/2;k<e.x1-1.5*A;k+=A)v.fillRect(w(k),E(-b/2),p*z,b*z);let V=A*.7;v.beginPath(),v.moveTo(w(e.x1-V*.3),E(0)),v.lineTo(w(e.x1-V),E(-V*.28)),v.lineTo(w(e.x1-V),E(V*.28)),v.closePath(),v.fill(),v.fillStyle="#e6e2d6";for(let[k,g]of a)v.fillRect(w(k-m[0]*2.3),E(g-m[1]/2),m[0]*z,m[1]*z);v.globalCompositeOperation="destination-out";for(let k=0;k<14e3;k++)v.fillStyle=`rgba(0,0,0,${Math.random()*.6})`,v.fillRect(Math.random()*S.width,Math.random()*S.height,1+Math.random(),1+Math.random());let R=new Vt(S);R.colorSpace=Dt,R.anisotropy=d.capabilities.getMaxAnisotropy();let I=new nt(new bt(n,i),new vt({map:R,transparent:!0,roughness:.5,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));return I.rotation.x=-Math.PI/2,I.receiveShadow=!0,I}function Yo({w:d,d:n,x:i}){let e=document.createElement("canvas");e.width=e.height=256;let h=e.getContext("2d"),a=h.createRadialGradient(128,128,0,128,128,128);a.addColorStop(0,"rgba(0,0,0,0.55)"),a.addColorStop(.5,"rgba(0,0,0,0.22)"),a.addColorStop(1,"rgba(0,0,0,0)"),h.fillStyle=a,h.fillRect(0,0,256,256);let m=new nt(new bt(d,n),new so({map:new Vt(e),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return m.rotation.x=-Math.PI/2,m.position.x=i,m}function cn(d,{y:n,fade:i,stand:e,ao:h,res:a=2048}){let[m,z]=No(d,a),S=Math.ceil(i[1]*2.2/We);for(let s of[m,z])s.repeat.set(S,S);let v=new vt({map:m,roughnessMap:z,roughness:.7,metalness:0,envMapIntensity:.35});Ko(v,i[0],i[1]);let w=new kt,E=new nt(new bt(We*S,We*S),v);return E.rotation.x=-Math.PI/2,E.receiveShadow=!0,w.add(E,Qo(d,e),Yo(h)),w.position.y=n,w}var Ee=64;function je(d,n){for(let h=0;h<d.length-1;h++){let[a,m,z]=d[h],[S,v,w]=d[h+1];if(n<=S){let E=(n-a)/Math.max(1e-6,S-a),s=z+(w-z)*E;return m.map((p,A)=>(p+(v[A]-p)*E)*s)}}let[,i,e]=d[d.length-1];return i.map(h=>h*e)}function dn(d,n,{steps:i=40}={}){var w,E,s;let e=new Float32Array(Ee*2*4),h=new fo(e,Ee,2,oo,Yt);h.magFilter=h.minFilter=ce,h.wrapS=h.wrapT=eo;let a={uTime:{value:0},uIntensity:{value:0},uReach:{value:1},uDiamond:{value:0},uSpacing:{value:((w=n.diamonds)==null?void 0:w.spacing)??.1},uCount:{value:((E=n.diamonds)==null?void 0:E.count)??6},uDiaColor:{value:new ut(...((s=n.diamonds)==null?void 0:s.color)??[1,.85,.6])},uGrad:{value:h},uTurb:{value:n.turbulence??1}},m=new Ce({uniforms:a,transparent:!0,depthWrite:!1,blending:to,side:be,defines:{STEPS:i},vertexShader:`
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
      }`}),z=[],S={};function v(p){let A=Object.keys(n.modes);for(let b=0;b<2;b++)for(let V=0;V<Ee;V++){let R=V/(Ee-1),I=[0,0,0];for(let k of A){if(!p[k])continue;let g=je(n.modes[k][b?"edge":"core"],R);for(let y=0;y<3;y++)I[y]+=g[y]*p[k]}e.set([I[0],I[1],I[2],1],(b*Ee+V)*4)}h.needsUpdate=!0}return{add(p,A,{length:b,r:V,h:R=1,w:I=1,light:k=!0}){let g=new Zt(1,2,2);g.translate(-.5,0,0);let y=new nt(g,m);y.position.copy(A),y.scale.set(b,V*R,V*I),y.frustumCulled=!1,y.userData.noAO=!0,y.visible=!1,p.add(y);let c=null;return k&&n.light&&(c=new Ro(16755302,0,n.light.distance,2),c.position.copy(A).add(new u(-b*.12,0,0)),p.add(c)),z.push({mesh:y,lamp:c}),y},update({w:p,level:A,optimal:b,reach:V=1,time:R,visible:I}){Object.keys(p).some(c=>Math.abs((S[c]??0)-p[c])>.01)&&(S={...p},v(S)),a.uTime.value=R,a.uIntensity.value=A*(n.brightness??1),a.uDiamond.value=b,a.uReach.value=V;let k=je(Object.values(n.modes)[0].core,.1),g=[0,0,0];for(let[c,G]of Object.entries(S)){if(!G)continue;let l=je(n.modes[c].core,.15);g=g.map((H,T)=>H+l[T]*G)}let y=Math.max(...g,.001);for(let c of z)c.mesh.visible=I&&A>.01,c.lamp&&(c.lamp.visible=c.mesh.visible,c.lamp.color.setRGB(g[0]/y,g[1]/y,g[2]/y),c.lamp.intensity=n.light.intensity*A*Math.min(1,y/2)*(.92+.08*Math.sin(R*37+k[0])))}}}export{yo as a,an as b,rn as c,cn as d,dn as e};
