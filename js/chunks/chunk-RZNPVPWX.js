import{$ as Mt,A as Dt,B as so,C as Be,D as nt,E as Qt,F as io,G as He,I as co,J as lo,K as At,L as ho,M as uo,N as po,O as Se,Q as Pe,R as fo,S as mo,T as Ft,U as Eo,V as ue,W as go,Y as Mo,Z as St,aa as pe,ba as vo,c as Te,d as Xe,da as wo,e as Je,h as xe,i as to,j as le,k as Nt,l as Pt,m as eo,o as Ut,p as oo,q as D,r as no,s as de,t as d,u as ao,v as be,x as ft,y as ro,z as he}from"./chunk-5KNBVOBR.js";var Ro=class extends vo{constructor(n){super(n),this.type=Pt}parse(n){let a=function(u,H){switch(u){case 1:throw new Error("THREE.HDRLoader: Read Error: "+(H||""));case 2:throw new Error("THREE.HDRLoader: Write Error: "+(H||""));case 3:throw new Error("THREE.HDRLoader: Bad File Format: "+(H||""));default:case 4:throw new Error("THREE.HDRLoader: Memory Error: "+(H||""))}},E=function(u,H,y){H=H||1024;let q=u.pos,S=-1,T=0,P="",G=String.fromCharCode.apply(null,new Uint16Array(u.subarray(q,q+128)));for(;0>(S=G.indexOf(`
`))&&T<H&&q<u.byteLength;)P+=G,T+=G.length,q+=128,G+=String.fromCharCode.apply(null,new Uint16Array(u.subarray(q,q+128)));return-1<S?(y!==!1&&(u.pos+=T+S+1),P+G.slice(0,S)):!1},f=function(u){let H=/^#\?(\S+)/,y=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,I=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,q=/^\s*FORMAT=(\S+)\s*$/,S=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,T={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0},P,G;for((u.pos>=u.byteLength||!(P=E(u)))&&a(1,"no header found"),(G=P.match(H))||a(3,"bad initial token"),T.valid|=1,T.programtype=G[1],T.string+=P+`
`;P=E(u),P!==!1;){if(T.string+=P+`
`,P.charAt(0)==="#"){T.comments+=P+`
`;continue}if((G=P.match(y))&&(T.gamma=parseFloat(G[1])),(G=P.match(I))&&(T.exposure=parseFloat(G[1])),(G=P.match(q))&&(T.valid|=2,T.format=G[1]),(G=P.match(S))&&(T.valid|=4,T.height=parseInt(G[1],10),T.width=parseInt(G[2],10)),T.valid&2&&T.valid&4)break}return T.valid&2||a(3,"missing format specifier"),T.valid&4||a(3,"missing image size specifier"),T},R=function(u,H,y){let I=H;if(I<8||I>32767||u[0]!==2||u[1]!==2||u[2]&128)return new Uint8Array(u);I!==(u[2]<<8|u[3])&&a(3,"wrong scanline width");let q=new Uint8Array(4*H*y);q.length||a(4,"unable to allocate buffer space");let S=0,T=0,P=4*I,G=new Uint8Array(4),dt=new Uint8Array(P),zt=y;for(;zt>0&&T<u.byteLength;){T+4>u.byteLength&&a(1),G[0]=u[T++],G[1]=u[T++],G[2]=u[T++],G[3]=u[T++],(G[0]!=2||G[1]!=2||(G[2]<<8|G[3])!=I)&&a(3,"bad rgbe scanline format");let pt=0,g;for(;pt<P&&T<u.byteLength;){g=u[T++];let Z=g>128;if(Z&&(g-=128),(g===0||pt+g>P)&&a(3,"bad scanline data"),Z){let Y=u[T++];for(let Tt=0;Tt<g;Tt++)dt[pt++]=Y}else dt.set(u.subarray(T,T+g),pt),pt+=g,T+=g}let $=I;for(let Z=0;Z<$;Z++){let Y=0;q[S]=dt[Z+Y],Y+=I,q[S+1]=dt[Z+Y],Y+=I,q[S+2]=dt[Z+Y],Y+=I,q[S+3]=dt[Z+Y],S+=4}zt--}return q},z=function(u,H,y,I){let q=u[H+3],S=Math.pow(2,q-128)/255;y[I+0]=u[H+0]*S,y[I+1]=u[H+1]*S,y[I+2]=u[H+2]*S,y[I+3]=1},b=function(u,H,y,I){let q=u[H+3],S=Math.pow(2,q-128)/255;y[I+0]=he.toHalfFloat(Math.min(u[H+0]*S,65504)),y[I+1]=he.toHalfFloat(Math.min(u[H+1]*S,65504)),y[I+2]=he.toHalfFloat(Math.min(u[H+2]*S,65504)),y[I+3]=he.toHalfFloat(1)},V=new Uint8Array(n);V.pos=0;let M=f(V),L=M.width,B=M.height,_=R(V.subarray(V.pos),L,B),k,m,K;switch(this.type){case Nt:K=_.length/4;let u=new Float32Array(K*4);for(let y=0;y<K;y++)z(_,y*4,u,y*4);k=u,m=Nt;break;case Pt:K=_.length/4;let H=new Uint16Array(K*4);for(let y=0;y<K;y++)b(_,y*4,H,y*4);k=H,m=Pt;break;default:throw new Error("THREE.HDRLoader: Unsupported type: "+this.type)}return{width:L,height:B,data:k,header:M.string,gamma:M.gamma,exposure:M.exposure,type:m}}setDataType(n){return this.type=n,this}load(n,c,e,l){function o(a,p){switch(a.type){case Nt:case Pt:a.colorSpace=oo,a.minFilter=le,a.magFilter=le,a.generateMipmaps=!1,a.flipY=!0;break}c&&c(a,p)}return super.load(n,o,e,l)}};var fe=class i extends nt{constructor(){let n=i.SkyShader,c=new He({name:n.name,uniforms:io.clone(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Te,depthWrite:!1});super(new Qt(1,1,1),c),this.isSky=!0}};fe.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new d},up:{value:new d(0,1,0)}},vertexShader:`
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

		}`};var{smoothstep:Ct,clamp:yo}=D,me=12e3,Yt={x:120,z:60,rx:750,rz:600},lt={x:-480,z:680,r:170},Zt=(i,n)=>{let c=Math.sin(i*127.1+n*311.7)*43758.5453;return c-Math.floor(c)};function To(i,n){let c=Math.floor(i),e=Math.floor(n),l=i-c,o=n-e;l=l*l*(3-2*l),o=o*o*(3-2*o);let a=Zt(c,e),p=Zt(c+1,e),h=Zt(c,e+1),w=Zt(c+1,e+1);return a+(p-a)*l+(h-a)*o+(a-p-h+w)*l*o}function Ce(i,n,c=5){let e=0,l=.5;for(let o=0;o<c;o++)e+=l*To(i,n),i*=2.03,n*=2.03,l*=.5;return e}var Ao=(i,n)=>{let c=0,e=.5;for(let l=0;l<5;l++)c+=e*(1-Math.abs(To(i,n)*2-1))**2,i*=2.1,n*=2.1,e*=.5;return c},Ue=(i,n)=>Math.hypot((i-Yt.x)/Yt.rx,(n-Yt.z)/Yt.rz);function xo(i,n){let c=Ue(i,n),e=Math.max(Ct(Math.abs(n),70,140),Ct(Math.abs(i-120),260,340)),l=(Ce(i/260,n/260,3)-.5)*3*e;return l+=Ct(c,1,1.7)*(Ce(i/520+7,n/520+3)*110-15),l+=Ct(c,2.1,3.4)*Ao(i/1400,n/1400)*520,l}function Fo(i,n){let c=(i-lt.x)**2+(n-lt.z)**2;return xo(i,n)-26*Math.exp(-c/(lt.r*lt.r))}function bo({lite:i,scale:n=1,vscale:c=n}){let e=n,l=c,o=Math.min(n,2.5),a=Math.min(n,1.6),p=new At,h=i?160:240,w=new St(me,me,h,h);w.rotateX(-Math.PI/2);let v=w.attributes.position,E=new Float32Array((h+1)*(h+1));for(let s=0;s<v.count;s++){let x=Fo(v.getX(s),v.getZ(s));v.setY(s,x),E[s]=x}w.computeVertexNormals();let f=xo(lt.x,lt.z)-7,R=[[.64,.58,.34],[.25,.37,.16],[.42,.33,.22],[.44,.56,.27],[.55,.52,.3]],z=new Float32Array(v.count*3),b=new ft,V=new ft(.22,.37,.13),M=new ft(.32,.46,.17),L=new ft(.42,.39,.35),B=new ft(.92,.94,.96),_=new ft(.62,.57,.44),k=w.attributes.normal;for(let s=0;s<v.count;s++){let x=v.getX(s),U=v.getZ(s),W=v.getY(s);b.copy(V).lerp(M,Ce(x/90,U/90,3));let j=Ue(x,U),at=Zt(Math.floor(x/160)+.5,Math.floor(U/160)+.5);j<1.5&&at<.55*(1-Ct(j,1,1.5))&&Math.abs(U)>80&&b.setRGB(...R[Math.floor(Zt(Math.floor(x/160),Math.floor(U/160)+9)*R.length)]),Math.abs(U)<70&&Math.abs(x-120)<300&&b.lerp(new ft(.4,.53,.26),.6);let O=1-k.getY(s);b.lerp(L,Ct(O,.12,.3)),b.lerp(B,Ct(W,300,380)*(1-Ct(O,.3,.5))),W<f+1.5&&Math.hypot(x-lt.x,U-lt.z)<lt.r*1.8&&b.lerp(_,.7),z.set([b.r,b.g,b.b],s*3)}w.setAttribute("color",new Dt(z,3));let m=document.createElement("canvas");m.width=m.height=256;let K=m.getContext("2d");K.fillStyle="#d8d8d8",K.fillRect(0,0,256,256);for(let s=0;s<9e3;s++){let x=150+Math.random()*105;K.fillStyle=`rgb(${x},${x},${x})`,K.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3)}let u=new Ft(m);u.wrapS=u.wrapT=xe,u.colorSpace=Ut,u.anisotropy=i?2:8;let H=w.attributes.uv;for(let s=0;s<H.count;s++)H.setXY(s,v.getX(s)/24,v.getZ(s)/24);let y=new nt(w,new pe({vertexColors:!0,map:u}));y.scale.set(e,l,e),y.receiveShadow=!0,p.add(y);let I=new nt(new Eo(lt.r*2.2,48),new Mt({color:2902622,roughness:.08,metalness:.2,transparent:!0,opacity:.88}));I.rotation.x=-Math.PI/2,I.position.set(lt.x*e,f*l,lt.z*e),I.scale.set(e,e,1),p.add(I);let q=me/h;function S(s,x){return l*T(s/e,x/e)}function T(s,x){let U=yo((s+me/2)/q,0,h-1e-6),W=yo((x+me/2)/q,0,h-1e-6),j=Math.floor(U),at=Math.floor(W),O=U-j,mt=W-at,wt=E[at*(h+1)+j],r=E[at*(h+1)+j+1],C=E[(at+1)*(h+1)+j],A=E[(at+1)*(h+1)+j+1];return O+mt<1?wt+(r-wt)*O+(C-wt)*mt:A+(C-A)*(1-O)+(r-A)*(1-mt)}let P=25*e,G=new Map,dt=[],zt=(s,x)=>`${Math.floor(s/P)},${Math.floor(x/P)}`;function pt(s){let x=zt(s.x,s.z);G.has(x)||G.set(x,[]),G.get(x).push(s)}function g(s){for(let W of dt)if(s.x>W.x0&&s.x<W.x1&&s.z>W.z0&&s.z<W.z1&&s.y<W.top)return W.name;let x=Math.floor(s.x/P),U=Math.floor(s.z/P);for(let W=-1;W<=1;W++)for(let j=-1;j<=1;j++){let at=G.get(`${x+W},${U+j}`);if(at){for(let O of at)if(s.y>O.y0&&s.y<O.top&&(s.x-O.x)**2+(s.z-O.z)**2<O.r*O.r)return O.name}}return null}let $=new pe({color:7171176}),Z=(s,x,U,W)=>{let j=new nt(new St(s*(s>200?e:o),x*o),$);j.rotation.x=-Math.PI/2,j.position.set(U*e,.02,W*o),j.receiveShadow=!0,p.add(j)};Z(300,7,120,-28),Z(8,22,20,-14),Z(8,22,220,-14),Z(110,34,120,-56);let Y=new Mt({color:9080724,roughness:.6,metalness:.3}),Tt=new Mt({color:5988455,roughness:.5,metalness:.4});for(let s of[90,150]){let x=new nt(new Qt(26*o,6*o,18*o),Y);x.position.set(s*e,3*o,-84*o);let U=new nt(new ue(9*o,9*o,26*o,20,1,!1,0,Math.PI),Tt);U.rotation.z=Math.PI/2,U.position.set(s*e,6*o,-84*o),U.scale.set(.45,1,1),x.castShadow=U.castShadow=!0,dt.push({name:"un hangar",x0:s*e-13*o,x1:s*e+13*o,z0:-93*o,z1:-75*o,top:10*o}),p.add(x,U)}let xt=new nt(new ue(.06,.08,6,6),new Mt({color:14540253}));xt.position.set(60*e,3*o,-22*o),xt.scale.setScalar(o),pt({name:"el m\xE1stil de la manga",x:60*e,z:-22*o,y0:0,top:6.2*o,r:.2*o}),p.add(xt);let bt=new At;bt.position.set(60*e,5.9*o,-22*o),bt.scale.setScalar(o);let kt=new ue(.35,.16,2.6,12,5,!0);kt.rotateZ(-Math.PI/2),kt.translate(1.3,0,0);let Xt=[],Jt=kt.attributes.position;for(let s=0;s<Jt.count;s++){let x=Math.floor(Jt.getX(s)/.52)%2;Xt.push(...x?[.95,.95,.95]:[1,.45,.12])}kt.setAttribute("color",new so(Xt,3));let ge=new nt(kt,new Mt({vertexColors:!0,side:Xe,roughness:.8}));bt.add(ge),p.add(bt);let te=0;function ht(s,x=1/60){let U=Math.hypot(s.x,s.z);te+=x,bt.rotation.y=Math.atan2(-s.z,s.x)+Math.sin(te*3.1)*.05,bt.rotation.z=-(1-Ct(U,.5,7))*1.2+Math.sin(te*4.3)*.03}let Lt=i?700:2200,Me=new ue(.25,.4,3,5);Me.translate(0,1.5,0);let t=new go(2.4,8,7);t.translate(0,6.5,0);let ut=new Mo(3,0);ut.translate(0,5,0);let qt=new pe({flatShading:!0}),$t=new Se(Me,new pe({color:4863526}),Lt),Et=new Se(t,qt,Lt),It=new Se(ut,qt,Lt),Gt=new be,ee=new de,oe=new d,ne=new d,Wt=0,Ht=0,vt=0,ve=0,ct=new ft;for(;Wt<Lt&&ve++<Lt*40;){let s=Yt.x+(Math.random()*2-1)*3e3,x=Yt.z+(Math.random()*2-1)*2600,U=Ue(s,x);if(Math.abs(x)<110&&Math.abs(s-120)<360||Math.hypot(s-lt.x,x-lt.z)<lt.r*1.1||Ce(s/400+31,x/400+17,3)<(U<1?.56:.44)&&Math.random()>.04)continue;let j=T(s,x);if(j>330||j<f+1)continue;let at=j*l,O=j>60||U>1.2&&Math.random()<.7,mt=(.7+Math.random()*.8)*a,wt=mt*(.9+Math.random()*.4);ee.setFromAxisAngle(new d(0,1,0),Math.random()*Math.PI*2),Gt.compose(ne.set(s*e,at-.3,x*e),ee,oe.set(mt,wt,mt)),pt({name:"un \xE1rbol",x:s*e,z:x*e,y0:at-.3,top:at-.3+(O?10.5:8)*wt,r:(O?1.5:2.3)*mt}),$t.setMatrixAt(Wt++,Gt),ct.setHSL(O?.3+Math.random()*.04:.22+Math.random()*.08,.45,O?.16+Math.random()*.06:.22+Math.random()*.08),O?(Et.setMatrixAt(Ht,Gt),Et.setColorAt(Ht++,ct)):(It.setMatrixAt(vt,Gt),It.setColorAt(vt++,ct))}$t.count=Wt,Et.count=Ht,It.count=vt;for(let s of[$t,Et,It])s.castShadow=!i,s.instanceMatrix.needsUpdate=!0,s.instanceColor&&(s.instanceColor.needsUpdate=!0),p.add(s);return{group:p,heightAt:S,setWind:ht,hit:g,scale:e,side:o}}var Lo=1.225,ze=9.81,Io={m:7.2,S:.34,b:1.34,c:.28,I:new d(.28,.85,.62)},Go={a:4.6,z:0,flap:.55,de:.35,stall:D.degToRad(15)},Bo={z:.028,k:.065,flap:.05,gear:.018},Po={z:0,a:-.9,q:-14,de:-1.15,flap:-.06},Uo={b:-.08,p:-.48,da:.2,r:.08},Do={b:.13,r:-.18,dr:-.09},qo=[{p:new d(.6,-.18,0),steer:!0},{p:new d(-.04,-.18,.238)},{p:new d(-.04,-.18,-.238)}],$o=[[.78,0,0],[-.8,.05,0],[-.68,.32,0],[-.12,.02,.67],[-.12,.02,-.67],[.2,.1,0]].map(i=>new d(...i)),Wo=[[.5,-.06,0],[-.3,-.06,0],[-.04,-.07,.24],[-.04,-.07,-.24]].map(i=>({p:new d(...i)})),jo={AC:Io,CL:Go,CD:Bo,CM:Po,CR:Uo,CN:Do,WHEELS:qo,SKIN:$o,BELLY:Wo,world:1,size:1,vref:22,ground:.185,eye:[.486,.09],tips:[new d(-.12,.02,.67),new d(-.12,.02,-.67)]};function nn({model:i,parts:n,S:c,m:e,AR:l,e:o,cd0:a,vref:p,eye:h,canopy:w=[],thrust:v,hud:E,world:f=10}){let R=Math.sqrt(l*c),z=c/R;i.updateMatrixWorld(!0);let b=i.matrixWorld.clone().invert(),V=g=>new ao().setFromObject(g).applyMatrix4(b),M=V(i),L=M.max.x-M.min.x,_=n.filter(g=>/tren|gear|rueda|wheel/i.test(g.data.part+" "+(g.data.label??""))).map(g=>V(g.obj)).filter(g=>isFinite(g.min.y)).map(g=>({p:new d((g.min.x+g.max.x)/2,g.min.y,(g.min.z+g.max.z)/2)}));if(_.length<3){let g=M.min.y;_=[{p:new d(M.min.x+.78*L,g,0)},{p:new d(M.min.x+.38*L,g,.12*R)},{p:new d(M.min.x+.38*L,g,-.12*R)}]}_.sort((g,$)=>$.p.x-g.p.x),_[0].steer=!0;let k=_.slice(1).reduce((g,$)=>g+$.p.x,0)/(_.length-1),m=new d(k+.1*(_[0].p.x-k),(M.min.y+M.max.y)/2,0);for(let g of _)g.p.sub(m);let K=Math.min(..._.map(g=>g.p.y)),u=-K+.02,H=new d,y=new d,I=-1/0,q=1/0,S=new d;i.traverse(g=>{if(!g.isMesh)return;let $=g.geometry.attributes.position,Z=b.clone().multiply(g.matrixWorld);for(let Y=0;Y<$.count;Y+=7)S.fromBufferAttribute($,Y).applyMatrix4(Z),S.z>I&&(I=S.z,H.copy(S)),S.z<q&&(q=S.z,y.copy(S))});let T=new Set;for(let g of w)g.traverse($=>T.add($));let P=-1/0;i.traverse(g=>{if(!g.isMesh||T.has(g))return;let $=g.geometry.attributes.position,Z=b.clone().multiply(g.matrixWorld);for(let Y=0;Y<$.count;Y+=3)S.fromBufferAttribute($,Y).applyMatrix4(Z),Math.abs(S.x-h[0])<.4&&Math.abs(S.z)<.35&&S.y>P&&(P=S.y)});let G=Math.max(h[1],P+.15);H.sub(m),y.sub(m),M.min.sub(m),M.max.sub(m);let dt=[new d(M.max.x,(M.min.y+M.max.y)/2-.1*(M.max.y-M.min.y),0),new d(M.min.x,K+.35*(M.max.y-K),0),new d(M.min.x+.1*L,M.max.y,0),H.clone(),y.clone()],zt=[[.75,0],[.3,0],[.45,.25],[.45,-.25]].map(([g,$])=>({p:new d(M.min.x+g*L,K+.15*(M.max.y-K),$*R*.5)})),pt=2*Math.PI*l/(2+Math.sqrt(l*l+4));return{AC:{m:e,S:c,b:R,c:z,I:new d(e*(.22*R)**2,e*(.32*L)**2,e*(.3*L)**2)},CL:{a:pt,z:.02,flap:.35,de:.3,stall:D.degToRad(l<3?24:16)},CD:{z:a,k:1/(Math.PI*o*l),flap:.04,gear:.015},CM:{z:0,a:-.55,q:-10,de:-.8,flap:-.04},CR:{b:-.06,p:-.4,da:.12,r:.06},CN:{b:.1,r:-.15,dr:-.07},WHEELS:_,SKIN:dt,BELLY:zt,world:f,size:L/1.6,vref:p,ground:u,eye:[h[0]-m.x,G-m.y],canopy:w,tips:[H,y],thrust:v,hud:E,fixedGear:!0,cg:m}}function an({scene:i,renderer:n,camera:c,model:e,op:l,motor:o,lite:a,setGear:p,setSurfaces:h,gearState:w,pad:v,airframe:E=jo}){let{AC:f,CL:R,CD:z,CM:b,CR:V,CN:M,WHEELS:L,SKIN:B,BELLY:_}=E,k=E.world,m=E.size,K=E.vref,u=K/22,H=f.m/7.2,y=new At;y.visible=!1,i.add(y);let I=null;function q(){I=bo({lite:a,scale:k,vscale:k>1?3:1}),y.add(I.group);let r=document.createElement("canvas");r.width=256,r.height=4096;let C=r.getContext("2d");C.fillStyle="#2b2c2e",C.fillRect(0,0,256,4096);for(let N=0;N<4e3;N++)C.fillStyle=`rgba(255,255,255,${Math.random()*.04})`,C.fillRect(Math.random()*256,Math.random()*4096,2,2);C.fillStyle="#e8e6e0";for(let N=300;N<3800;N+=160)C.fillRect(124,N,8,80);C.fillRect(8,0,6,4096),C.fillRect(242,0,6,4096);for(let N=0;N<8;N++)C.fillRect(24+N*26,60,14,160),C.fillRect(24+N*26,3876,14,160);let A=new Ft(r);A.colorSpace=Ut,A.anisotropy=a?2:8;let F=new nt(new St(14*I.side*(k>1?1.3:1),320*k),new Mt({map:A,roughness:.85}));return F.rotation.x=-Math.PI/2,F.rotation.z=Math.PI/2,F.position.set(120*k,.03,0),F.receiveShadow=!0,y.add(F),I}let S=()=>I??q(),T=new fe;T.scale.setScalar(1e4);let P=new d().setFromSphericalCoords(1,D.degToRad(60),D.degToRad(160));Object.assign(T.material.uniforms.sunPosition.value,P),T.material.uniforms.turbidity.value=4,T.material.uniforms.rayleigh.value=1.4;let G=new uo;G.add(T);let dt=null;function zt(){let r=new lo(a?256:512,{type:Pt});return new co(1,2e4,r).update(n,G),r.texture}let pt=null,g=new At;y.add(g);let $=70,Z=E.tips,Y=Z.map(()=>{let r=new Be;r.setAttribute("position",new Dt(new Float32Array($*3),3)),r.setAttribute("color",new Dt(new Float32Array($*4),4));let C=new fo(r,new Pe({vertexColors:!0,transparent:!0,depthWrite:!1}));return C.frustumCulled=!1,g.add(C),{geo:r,n:0}}),Tt=a?70:160,xt=new Be,bt=new Float32Array(Tt*6),kt=new Float32Array(Tt*8);xt.setAttribute("position",new Dt(bt,3)),xt.setAttribute("color",new Dt(kt,4));let Xt=new mo(xt,new Pe({vertexColors:!0,transparent:!0,depthWrite:!1}));Xt.frustumCulled=!1,g.add(Xt);let Jt=Array.from({length:Tt},()=>({p:new d,seed:Math.random()}));function ge(r,C){let A=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0).applyQuaternion(t.q),F=new d(0,1,0).cross(A).normalize(),N=A.clone().cross(F).normalize(),Rt=(.5+Math.random()*2.2)*m,rt=Math.random()*Math.PI*2;r.p.copy(t.p).addScaledVector(A,(C?6+Math.random()*10:(Math.random()-.3)*16)*m).addScaledVector(F,Math.cos(rt)*Rt).addScaledVector(N,Math.sin(rt)*Rt*.7)}function te(r,C){let A=D.smoothstep(C.V,6*u,30*u),F=C.onGround?0:A*D.clamp(.25+C.alpha*5,0,1);Z.forEach((rt,X)=>{let J=Y[X],st=J.geo.attributes.position.array,Q=J.geo.attributes.color.array;st.copyWithin(3,0,($-1)*3),Q.copyWithin(4,0,($-1)*4);let it=rt.clone().applyQuaternion(t.q).add(t.p);st.set([it.x,it.y,it.z],0),Q.set([1,1,1,F*.75],0),J.n=Math.min($,J.n+1);for(let et=0;et<$;et++)Q[et*4+3]*=et===0?1:.985;for(let et=0;et<$;et++){let jt=et*3;st[jt]+=ht.x*r,st[jt+1]+=(ht.y-.15)*r,st[jt+2]+=ht.z*r}if(J.n<$)for(let et=J.n;et<$;et++)st.copyWithin(et*3,(J.n-1)*3,J.n*3),Q[et*4+3]=0;J.geo.attributes.position.needsUpdate=J.geo.attributes.color.needsUpdate=!0});let N=ht.clone().sub(t.v),Rt=t.v.lengthSq()>1?t.v.clone().normalize():new d(1,0,0);for(let rt=0;rt<Tt;rt++){let X=Jt[rt];X.p.addScaledVector(ht,r);let J=X.p.clone().sub(t.p);(J.dot(Rt)<-10*m||J.length()>20*m)&&ge(X,!0);let st=1-D.smoothstep(X.p.distanceTo(t.p),1.5*m,9*m),Q=A*st*(.25+.35*X.seed),it=X.p.clone().addScaledVector(N,-.05);bt.set([X.p.x,X.p.y,X.p.z,it.x,it.y,it.z],rt*6),kt.set([.9,.95,1,Q,.9,.95,1,0],rt*8)}xt.attributes.position.needsUpdate=xt.attributes.color.needsUpdate=!0}let ht=new d,Lt=new d(-1.6,0,.2);function Me(r,C){let A=.6+.4*Math.sin(r*.37)*Math.sin(r*.11+1.3),F=D.clamp(C/25,.1,1)*.55;ht.copy(Lt).multiplyScalar(A),ht.x+=F*(Math.sin(r*1.7)+.5*Math.sin(r*4.3+2)),ht.y+=F*.6*(Math.sin(r*2.1+.7)+.5*Math.sin(r*5.9)),ht.z+=F*(Math.sin(r*1.3+4)+.5*Math.sin(r*3.7+1))}let t={p:new d,v:new d,q:new de,w:new d,throttle:0,roll:0,pitch:0,yaw:0,flap:.5,brake:0,gearUp:!1,crashed:!1,cam:"chase",t:0,assist:!0},ut=new Set,qt={pos:e.position.clone(),quat:e.quaternion.clone()};function $t(){t.p.set(k>1?-34*k:0,E.ground,0),t.v.set(0,0,0),t.q.identity(),t.w.set(0,0,0),t.throttle=0,t.flap=.5,t.gearUp=!1,t.onGround=!0,t.hold=0,t.bankHold=0,t.trim=0,t.crashed=!1,t.crashWhy="",w.target=0;for(let r of Y)r.n=0;for(let r of Jt)ge(r,!1)}let Et={gear(){!E.fixedGear&&t.p.y>1.5&&(t.gearUp=!t.gearUp,w.target=t.gearUp?1:0)},flap(){t.flap=t.flap>.6?0:t.flap+.5},cam(){t.cam=t.cam==="chase"?"cockpit":"chase"},reset:$t,engine(){o.on=!o.on},assist(){t.assist=!t.assist}},It=r=>C=>{let A=C.key.toLowerCase();r&&!C.repeat&&(A==="g"&&Et.gear(),A==="f"&&Et.flap(),A==="c"&&Et.cam(),A==="r"&&Et.reset(),A==="e"&&Et.engine(),A==="t"&&Et.assist()),["w","s","a","d","q","e","shift","control","b","arrowup","arrowdown"," "].includes(A)&&C.preventDefault(),r?ut.add(A):ut.delete(A)},Gt=It(!0),ee=It(!1),oe=null,ne=()=>!!(v!=null&&v.touch),Wt=new d;function Ht(r){t.crashed||(t.crashed=!0,t.crashWhy=r,t.v.set(0,0,0),t.w.set(0,0,0))}let vt=new d;function ve(r){let C=(tt,ot)=>(ut.has(tt)?1:0)-(ut.has(ot)?1:0),A=tt=>Math.max(-1,Math.min(1,tt)),F=oe;t.pitch+=(A(C("s","w")+((F==null?void 0:F.pitch)??0))-t.pitch)*Math.min(1,r*6),t.roll+=(A(C("d","a")+((F==null?void 0:F.roll)??0))-t.roll)*Math.min(1,r*7);let N=A(C("z","x")+((F==null?void 0:F.yaw)??0)),Rt=new d(1,0,0).applyQuaternion(t.q),rt=Math.atan2(Rt.z,Rt.x),X=t.v.length();if(!t.onGround||Math.abs(N)>.02||X<1||X>25*u)t.hold=rt;else if(t.assist){let tt=D.clamp(10*u/X,.4,1);N=D.clamp(Math.atan2(Math.sin(rt-t.hold),Math.cos(rt-t.hold))*6+t.w.y*.4,-tt,tt)}t.yaw+=(N-t.yaw)*Math.min(1,r*5),(ut.has("shift")||ut.has("arrowup"))&&(t.throttle=Math.min(1,t.throttle+r*.5)),(ut.has("control")||ut.has("arrowdown"))&&(t.throttle=Math.max(0,t.throttle-r*.5)),(F==null?void 0:F.throttle)!=null&&(t.throttle=F.throttle),F!=null&&F.throttleRate&&(t.throttle=Math.min(1,Math.max(0,t.throttle+F.throttleRate*r*.6))),t.brake=ut.has("b")||ut.has(" ")?1:0,o.target=t.throttle;let J=new be().makeRotationFromQuaternion(t.q),st=J.clone().transpose();t.t+=r,Me(t.t,t.p.y),vt.copy(t.v).sub(ht).applyMatrix4(st);let Q=Math.max(.01,vt.length()),it=Math.atan2(-vt.y,vt.x),et=Math.asin(D.clamp(vt.z/Q,-1,1)),jt=Lo*Math.pow(Math.max(.05,1-22558e-9*Math.max(0,t.p.y)),4.2559),Vt=.5*jt*Q*Q,je=E.thrust?E.thrust({V:Q,h:t.p.y,rho:jt}):o.on?l(o.f).thrust*o.spin:0,ke=t.assist?D.clamp((K/Math.max(Q,1))**2,.22,1):1,Oe=-t.pitch*D.degToRad(16)*ke,Ho=t.roll*D.degToRad(20)*ke,Ve=-t.yaw*D.degToRad(22)*Math.max(ke,.45),Ot=t.flap*.8,So=1-w.t,we=R.z+R.a*it+R.flap*Ot-R.de*Oe*.1;Math.abs(it)>R.stall&&(we=Math.sign(it)*(R.a*R.stall)*Math.max(.35,1-(Math.abs(it)-R.stall)*3)+R.flap*Ot*.5);let Co=z.z+z.k*we*we+z.flap*Ot+z.gear*So+.4*Math.max(0,Math.abs(it)-R.stall),ae=new d;if(Q>.5){let tt=vt.clone().normalize(),ot=new d(0,0,1).cross(tt).normalize();ae.addScaledVector(ot,Vt*f.S*we),ae.addScaledVector(tt,-Vt*f.S*Co),ae.z+=-Vt*f.S*.6*et}ae.x+=je;let Ke=t.w.x*f.b/(2*Q),_e=t.w.y*f.b/(2*Q),Ae=t.w.z*f.c/(2*Q),zo=f.m*ze/Math.max(1,Vt*f.S)-R.flap*Ot;t.trim+=(-b.a*D.clamp(zo/R.a,0,R.stall*.7)-b.flap*Ot-t.trim)*Math.min(1,r*.8);let ko=t.onGround?0:t.trim,Kt=new d(Vt*f.S*f.b*(V.b*et+V.p*Ke+V.da*Ho+V.r*_e),Vt*f.S*f.b*(M.b*-et+M.r*_e+M.dr*Ve),Vt*f.S*f.c*(b.z+b.a*it+b.q*Ae+b.de*Oe+b.flap*Ot+ko));if(t.assist&&Q>8*u){let tt=new d(0,0,1).applyQuaternion(t.q),ot=Math.asin(D.clamp(-tt.y,-1,1)),_t=Math.asin(D.clamp(t.v.y/Q,-1,1)),yt=Vt*f.S,gt=Math.abs(t.roll)>=.05;gt&&(t.bankHold=ot);let se=Math.abs(t.bankHold??0)<D.degToRad(12)?0:D.clamp(t.bankHold,-.79,.79);gt?Kt.x+=yt*f.b*-.2*Ke:Kt.x+=f.I.x*6*(.8*(se-ot)-t.w.x);let Bt=f.m*ze/Math.max(1,yt*f.S)*(1/Math.max(.45,Math.cos(ot))-1)/R.a;Kt.z+=Math.abs(t.pitch)<.05?yt*f.c*(-.6*_t-3*Ae-b.a*Bt):yt*f.c*-3*Ae,Kt.z+=yt*f.c*-2.5*Math.max(0,it-.8*R.stall);let ce=-(ze*Math.tan(D.clamp(ot,-1.2,1.2)))/Q*Math.cos(ot)*f.b/(2*Q);Kt.y+=yt*f.b*(-.03*et-.5*(_e-ce))}let Fe=ae.clone().applyMatrix4(J);Fe.y-=f.m*ze;let Ne=new d,Re=!1,re=w.t<.05?L:_;for(let tt of re){let ot=tt.p.clone().applyQuaternion(t.q),_t=ot.clone().add(t.p),yt=S().heightAt(_t.x,_t.z)-_t.y;if(yt<=0)continue;yt>.3*m&&Ht("contra el terreno"),Re=!0;let gt=t.v.clone().add(new d().copy(t.w).applyQuaternion(t.q).cross(ot)),se=Math.max(0,1250*H*7.2*yt/m-36*H*7.2*gt.y),ie=new d(0,se,0),Bt=new d(1,0,0).applyQuaternion(t.q).setY(0).normalize(),ce=new d(0,1,0).cross(Bt),_o=re===_?.5:.02+.5*t.brake,Qe=f.m/re.length,Ge=gt.dot(Bt);ie.addScaledVector(Bt,-Math.sign(Ge)*Math.min(Math.abs(Ge)*40*H,_o*se,.5*Qe*Math.abs(Ge)/r));let Ye=tt.steer?gt.dot(ce)+Bt.dot(gt)*Ve*.8:gt.dot(ce),Ze=Math.min(.9*se,.5*Qe*Math.abs(Ye)/r+(tt.steer?Math.abs(Bt.dot(gt)*Ve)*400*H:0));ie.addScaledVector(ce,-D.clamp(Ye*400*H,-Ze,Ze)),Fe.add(ie),Ne.add(ot.clone().cross(ie)),re===_&&-gt.y>2.5&&Ht("aterrizaje de panza demasiado fuerte"),re===L&&-gt.y>4&&Ht("aterrizaje demasiado fuerte, se rompi\xF3 el tren")}t.v.addScaledVector(Fe,r/f.m),t.p.addScaledVector(t.v,r);for(let tt of B){let ot=Wt.copy(tt).applyQuaternion(t.q).add(t.p),_t=S().hit(ot);if(_t){Ht(`choque contra ${_t}`);break}if(S().heightAt(ot.x,ot.z)-ot.y>.03*m){Ht(tt.z?"una punta de ala toc\xF3 el suelo":tt.x>0?"el morro contra el suelo":"la cola contra el suelo");break}}let Le=Kt.add(Ne.applyMatrix4(st)),Vo=new d(f.I.x*t.w.x,f.I.y*t.w.y,f.I.z*t.w.z),Ie=t.w.clone().cross(Vo);t.w.x+=(Le.x-Ie.x)/f.I.x*r,t.w.y+=(Le.y-Ie.y)/f.I.y*r,t.w.z+=(Le.z-Ie.z)/f.I.z*r,Re&&t.w.multiplyScalar(.995);let ye=t.q.clone().multiply(new de(t.w.x*r*.5,t.w.y*r*.5,t.w.z*r*.5,0));return t.q.x+=ye.x,t.q.y+=ye.y,t.q.z+=ye.z,t.q.w+=ye.w,t.q.normalize(),h({roll:t.roll,pitch:t.pitch,yaw:t.yaw,flap:t.flap}),t.onGround=Re,{V:Q,alpha:it,onGround:Re,thrust:je}}let ct={V:0,alpha:0,onGround:!0,thrust:0},s=!1;function x(r,C){s=!0,oe=C;for(let A=0;A<8;A++)ct=ve(r/8);return ct}let U=new d(-3.4*m,.9*m,0);function W(r){if(t.crashed){O(`<b>Accidente</b> \xB7 ${t.crashWhy}<br>${ne()?"Reinicio":"R"} para volver a la pista`);return}if(!s){oe=(v==null?void 0:v.read())??null;for(let st=0;st<8;st++)ct=ve(r/8)}te(r,ct),S().setWind(ht,r),e.position.copy(t.p),E.cg&&e.position.sub(Wt.copy(E.cg).applyQuaternion(t.q)),e.quaternion.copy(t.q);let C=new d(1,0,0).applyQuaternion(t.q),A=new d(0,1,0).applyQuaternion(t.q);if(t.cam==="chase"){let st=(c.aspect<1?2.6:3.4)*m,Q=C.clone().multiplyScalar(-st).add(new d(0,st*.27,0));U.lerp(Q,Math.min(1,r*3)),c.position.copy(t.p).add(U),c.up.set(0,1,0),c.lookAt(t.p.clone().addScaledVector(C,2*m).add(new d(0,(ne()?-.8:-.5)*m,0)))}else c.position.copy(t.p).addScaledVector(C,E.eye[0]).addScaledVector(A,E.eye[1]),c.up.copy(A),c.lookAt(c.position.clone().addScaledVector(C,10*m).addScaledVector(A,-1.7*m));let F=t.cam==="chase"?null:70;F&&c.fov!==F&&(c.fov=F,c.updateProjectionMatrix()),!F&&t.cam!==W.cam&&mt(),t.cam!==W.cam&&j(t.cam!=="cockpit"),W.cam=t.cam;let N=E.hud?null:l(o.f),Rt=Math.max(0,t.p.y-S().heightAt(t.p.x,t.p.z)),rt=ct.V*3.6,X=t.v.y,J=ct.alpha>R.stall;if(innerWidth<560){O(`<b>${rt.toFixed(0)}</b> km/h \xB7 <b>${Rt.toFixed(0)}</b> m \xB7 ${X>=0?"+":""}${X.toFixed(1)} m/s<br>`+(E.hud?E.hud(ct,t,!0):o.on?`<b>${Math.round(N.n*o.spin/1e3)}k</b> rpm \xB7 ${ct.thrust.toFixed(0)} N \xB7 gas ${(t.throttle*100).toFixed(0)} %`:"MW54 apagada \xB7 Motor para arrancar")+(J?"<br><b>P\xC9RDIDA</b> \xB7 baja el morro":t.brake?"<br>frenos":""));return}O(`<b>${rt.toFixed(0)}</b> km/h \xB7 <b>${Rt.toFixed(1)}</b> m \xB7 ${X>=0?"+":""}${X.toFixed(1)} m/s \xB7 \u03B1 ${D.radToDeg(ct.alpha).toFixed(0)}\xB0<br>`+(E.hud?E.hud(ct,t,!1):`MW54 ${o.on?`<b>${Math.round(N.n*o.spin).toLocaleString("es-ES")}</b> rpm \xB7 ${ct.thrust.toFixed(0)} N \xB7 EGT ${Math.round(15+(N.egt-15)*o.heat)} \xB0C`:`apagada (${ne()?"Motor":"E"} para arrancar)`} \xB7 gas ${(t.throttle*100).toFixed(0)} %`)+`<br>Viento ${ht.length().toFixed(1)} m/s \xB7 Tren ${w.t<.05?"abajo":w.t>.95?"arriba":"en tr\xE1nsito"} \xB7 flaps ${(t.flap*40).toFixed(0)}\xB0 \xB7 gir\xF3scopo ${t.assist?"s\xED":"no"}${t.brake?" \xB7 frenos":""}${J?" \xB7 <b>P\xC9RDIDA</b>":""}`)}function j(r){for(let C of E.canopy??[])C.visible=r}let at="";function O(r){r!==at&&(at=r,document.getElementById("hud").innerHTML=r)}function mt(){c.fov=D.clamp(D.radToDeg(2*Math.atan(Math.tan(D.degToRad(28))/c.aspect)),40,66),c.updateProjectionMatrix()}function wt(r,C=r){r&&S(),r&&!y.visible&&(dt??=zt(),pt=i.background,i.background=dt),!r&&y.visible&&(i.background=pt),y.visible=r,g.visible=C;let A=Math.sqrt(k);i.fog=r?new ho(11124692,900*A,(a?4500:6500)*A):null,c.up.set(0,1,0),c.near=r?.004*m:.01,c.far=r?12e3*k:50,r?mt():(c.fov=32,c.updateProjectionMatrix())}return{enter(){wt(!0),$t(),v==null||v.reset(0),addEventListener("keydown",Gt),addEventListener("keyup",ee),U.set(-3.4*m,.9*m,0)},exit(){wt(!1),removeEventListener("keydown",Gt),removeEventListener("keyup",ee),ut.clear(),j(!0),W.cam=null,document.fullscreenElement&&document.exitFullscreen().catch(()=>{}),e.position.copy(qt.pos),e.quaternion.copy(qt.quat)},update:W,simulate:x,endTest(){s=!1},fit:mt,showWorld:wt,home:qt,get terrain(){return S()},airframe:E,state:t}}var qe=4;function $e(i){let n=(a,p)=>{let h=new Float32Array(a*a),w=p;for(let v=0;v<h.length;v++)w=w*1664525+1013904223>>>0,h[v]=w/4294967296;return(v,E)=>{let f=v*a,R=E*a,z=Math.floor(f),b=Math.floor(R),V=f-z,M=R-b;V=V*V*(3-2*V),M=M*M*(3-2*M);let L=(B,_)=>h[(_%a+a)%a*a+(B%a+a)%a];return(L(z,b)*(1-V)+L(z+1,b)*V)*(1-M)+(L(z,b+1)*(1-V)+L(z+1,b+1)*V)*M}},c=[[5,.25],[12,.25],[30,.2],[80,.15],[200,.15]].map(([a,p],h)=>[n(a,7+h*31),p]),e=[n(3,101),n(11,202)],l=new Uint8ClampedArray(i*i*4),o=new Uint8ClampedArray(i*i*4);for(let a=0;a<i;a++)for(let p=0;p<i;p++){let h=p/i,w=a/i,v=0;for(let[M,L]of c)v+=M(h,w)*L;let E=Math.random(),f=E>.985?.12*Math.random():E<.01?-.16*Math.random():(Math.random()-.5)*.04,R=36+(v-.5)*12+f*110,z=(a*i+p)*4;l[z]=R,l[z+1]=R+2,l[z+2]=R+5,l[z+3]=255;let V=160+(.5*e[0](h,w)+.5*e[1](h,w)-.5)*60+Math.abs(f)*300;o[z]=o[z+1]=o[z+2]=V,o[z+3]=255}return{c:l,r:o}}function Oo(i,n){let c=[["#24262a"],["#a0a0a0"]].map(([o])=>{let a=document.createElement("canvas");a.width=a.height=n;let p=a.getContext("2d");return p.fillStyle=o,p.fillRect(0,0,n,n),a}),e=c.map(o=>{let a=new Ft(o);return a.wrapS=a.wrapT=xe,a.anisotropy=i.capabilities.getMaxAnisotropy(),a});e[0].colorSpace=Ut;let l=({c:o,r:a})=>{[o,a].forEach((p,h)=>{c[h].getContext("2d").putImageData(new ImageData(p,n,n),0,0),e[h].needsUpdate=!0})};try{let o=`onmessage = (e) => { const o = (${$e})(e.data); postMessage(o, [o.c.buffer, o.r.buffer]); close(); };`,a=URL.createObjectURL(new Blob([o],{type:"text/javascript"})),p=new Worker(a);p.onmessage=h=>{l(h.data),URL.revokeObjectURL(a)},p.onerror=h=>{h.preventDefault(),URL.revokeObjectURL(a),l($e(n))},p.postMessage(n)}catch{l($e(n))}return e}function Ko(i,n,c){i.onBeforeCompile=e=>{e.uniforms.uFade={value:new no(n,c)},e.uniforms.uBg={value:new ft(855826)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;
uniform vec2 uFade;
uniform vec3 uBg;`).replace("#include <tonemapping_fragment>",`gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));
#include <tonemapping_fragment>`)}}function No(i,{W:n,D:c,box:e,dash:l,stops:o,stop:a}){let p=Math.min(512,2600/n),h=document.createElement("canvas");h.width=n*p,h.height=c*p;let w=h.getContext("2d"),v=B=>(B+n/2)*p,E=B=>(B+c/2)*p,f="#d9a93a";w.fillStyle=f;for(let[B,_]of[[e.x0,1],[e.x1,-1]])for(let[k,m]of[[e.z0,1],[e.z1,-1]])w.fillRect(Math.min(v(B),v(B+_*e.arm)),Math.min(E(k),E(k+m*e.w)),e.arm*p,e.w*p),w.fillRect(Math.min(v(B),v(B+_*e.w)),Math.min(E(k),E(k+m*e.arm)),e.w*p,e.arm*p);let[R,z,b]=l;for(let B=e.x0+z/2;B<e.x1-1.5*z;B+=z)w.fillRect(v(B),E(-b/2),R*p,b*p);let V=z*.7;w.beginPath(),w.moveTo(v(e.x1-V*.3),E(0)),w.lineTo(v(e.x1-V),E(-V*.28)),w.lineTo(v(e.x1-V),E(V*.28)),w.closePath(),w.fill(),w.fillStyle="#e6e2d6";for(let[B,_]of o)w.fillRect(v(B-a[0]*2.3),E(_-a[1]/2),a[0]*p,a[1]*p);w.globalCompositeOperation="destination-out";for(let B=0;B<14e3;B++)w.fillStyle=`rgba(0,0,0,${Math.random()*.6})`,w.fillRect(Math.random()*h.width,Math.random()*h.height,1+Math.random(),1+Math.random());let M=new Ft(h);M.colorSpace=Ut,M.anisotropy=i.capabilities.getMaxAnisotropy();let L=new nt(new St(n,c),new Mt({map:M,transparent:!0,roughness:.5,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));return L.rotation.x=-Math.PI/2,L.receiveShadow=!0,L}function Qo({w:i,d:n,x:c}){let e=document.createElement("canvas");e.width=e.height=256;let l=e.getContext("2d"),o=l.createRadialGradient(128,128,0,128,128,128);o.addColorStop(0,"rgba(0,0,0,0.55)"),o.addColorStop(.5,"rgba(0,0,0,0.22)"),o.addColorStop(1,"rgba(0,0,0,0)"),l.fillStyle=o,l.fillRect(0,0,256,256);let a=new nt(new St(i,n),new ro({map:new Ft(e),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return a.rotation.x=-Math.PI/2,a.position.x=c,a}function sn(i,{y:n,fade:c,stand:e,ao:l,res:o=2048}){let[a,p]=Oo(i,o),h=Math.ceil(c[1]*2.2/qe);for(let f of[a,p])f.repeat.set(h,h);let w=new Mt({map:a,roughnessMap:p,roughness:.7,metalness:0,envMapIntensity:.35});Ko(w,c[0],c[1]);let v=new At,E=new nt(new St(qe*h,qe*h),w);return E.rotation.x=-Math.PI/2,E.receiveShadow=!0,v.add(E,No(i,e),Qo(l)),v.position.y=n,v}var Ee=64;function We(i,n){for(let l=0;l<i.length-1;l++){let[o,a,p]=i[l],[h,w,v]=i[l+1];if(n<=h){let E=(n-o)/Math.max(1e-6,h-o),f=p+(v-p)*E;return a.map((R,z)=>(R+(w[z]-R)*E)*f)}}let[,c,e]=i[i.length-1];return c.map(l=>l*e)}function ln(i,n,{steps:c=40}={}){var v,E,f;let e=new Float32Array(Ee*2*4),l=new po(e,Ee,2,eo,Nt);l.magFilter=l.minFilter=le,l.wrapS=l.wrapT=to;let o={uTime:{value:0},uIntensity:{value:0},uReach:{value:1},uDiamond:{value:0},uSpacing:{value:((v=n.diamonds)==null?void 0:v.spacing)??.1},uCount:{value:((E=n.diamonds)==null?void 0:E.count)??6},uDiaColor:{value:new ft(...((f=n.diamonds)==null?void 0:f.color)??[1,.85,.6])},uGrad:{value:l},uTurb:{value:n.turbulence??1}},a=new He({uniforms:o,transparent:!0,depthWrite:!1,blending:Je,side:Te,defines:{STEPS:c},vertexShader:`
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
      }`}),p=[],h={};function w(R){let z=Object.keys(n.modes);for(let b=0;b<2;b++)for(let V=0;V<Ee;V++){let M=V/(Ee-1),L=[0,0,0];for(let B of z){if(!R[B])continue;let _=We(n.modes[B][b?"edge":"core"],M);for(let k=0;k<3;k++)L[k]+=_[k]*R[B]}e.set([L[0],L[1],L[2],1],(b*Ee+V)*4)}l.needsUpdate=!0}return{add(R,z,{length:b,r:V,h:M=1,w:L=1,light:B=!0}){let _=new Qt(1,2,2);_.translate(-.5,0,0);let k=new nt(_,a);k.position.copy(z),k.scale.set(b,V*M,V*L),k.frustumCulled=!1,k.userData.noAO=!0,k.visible=!1,R.add(k);let m=null;return B&&n.light&&(m=new wo(16755302,0,n.light.distance,2),m.position.copy(z).add(new d(-b*.12,0,0)),R.add(m)),p.push({mesh:k,lamp:m}),k},update({w:R,level:z,optimal:b,reach:V=1,time:M,visible:L}){Object.keys(R).some(m=>Math.abs((h[m]??0)-R[m])>.01)&&(h={...R},w(h)),o.uTime.value=M,o.uIntensity.value=z*(n.brightness??1),o.uDiamond.value=b,o.uReach.value=V;let B=We(Object.values(n.modes)[0].core,.1),_=[0,0,0];for(let[m,K]of Object.entries(h)){if(!K)continue;let u=We(n.modes[m].core,.15);_=_.map((H,y)=>H+u[y]*K)}let k=Math.max(..._,.001);for(let m of p)m.mesh.visible=L&&z>.01,m.lamp&&(m.lamp.visible=m.mesh.visible,m.lamp.color.setRGB(_[0]/k,_[1]/k,_[2]/k),m.lamp.intensity=n.light.intensity*z*Math.min(1,k/2)*(.92+.08*Math.sin(M*37+B[0])))}}}export{Ro as a,nn as b,an as c,sn as d,ln as e};
