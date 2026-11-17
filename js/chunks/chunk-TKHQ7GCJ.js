import{$ as Mt,A as Ut,B as ro,C as Be,D as nt,E as Qt,F as so,G as He,I as io,J as co,K as Ft,L as lo,M as ho,N as uo,O as Se,Q as Pe,R as po,S as fo,T as At,U as Eo,V as ue,W as mo,Y as go,Z as St,aa as pe,ba as Mo,c as Te,d as Ze,da as vo,e as Xe,h as xe,i as Je,j as le,k as Kt,l as Pt,m as to,o as Dt,p as eo,q,r as oo,s as de,t as u,u as no,v as be,x as ft,y as ao,z as he}from"./chunk-5KNBVOBR.js";var wo=class extends Mo{constructor(n){super(n),this.type=Pt}parse(n){let m=function(l,b){switch(l){case 1:throw new Error("THREE.HDRLoader: Read Error: "+(b||""));case 2:throw new Error("THREE.HDRLoader: Write Error: "+(b||""));case 3:throw new Error("THREE.HDRLoader: Bad File Format: "+(b||""));default:case 4:throw new Error("THREE.HDRLoader: Memory Error: "+(b||""))}},E=function(l,b,y){b=b||1024;let $=l.pos,C=-1,T=0,D="",G=String.fromCharCode.apply(null,new Uint16Array(l.subarray($,$+128)));for(;0>(C=G.indexOf(`
`))&&T<b&&$<l.byteLength;)D+=G,T+=G.length,$+=128,G+=String.fromCharCode.apply(null,new Uint16Array(l.subarray($,$+128)));return-1<C?(y!==!1&&(l.pos+=T+C+1),D+G.slice(0,C)):!1},s=function(l){let b=/^#\?(\S+)/,y=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,L=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,$=/^\s*FORMAT=(\S+)\s*$/,C=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,T={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0},D,G;for((l.pos>=l.byteLength||!(D=E(l)))&&m(1,"no header found"),(G=D.match(b))||m(3,"bad initial token"),T.valid|=1,T.programtype=G[1],T.string+=D+`
`;D=E(l),D!==!1;){if(T.string+=D+`
`,D.charAt(0)==="#"){T.comments+=D+`
`;continue}if((G=D.match(y))&&(T.gamma=parseFloat(G[1])),(G=D.match(L))&&(T.exposure=parseFloat(G[1])),(G=D.match($))&&(T.valid|=2,T.format=G[1]),(G=D.match(C))&&(T.valid|=4,T.height=parseInt(G[1],10),T.width=parseInt(G[2],10)),T.valid&2&&T.valid&4)break}return T.valid&2||m(3,"missing format specifier"),T.valid&4||m(3,"missing image size specifier"),T},p=function(l,b,y){let L=b;if(L<8||L>32767||l[0]!==2||l[1]!==2||l[2]&128)return new Uint8Array(l);L!==(l[2]<<8|l[3])&&m(3,"wrong scanline width");let $=new Uint8Array(4*b*y);$.length||m(4,"unable to allocate buffer space");let C=0,T=0,D=4*L,G=new Uint8Array(4),dt=new Uint8Array(D),zt=y;for(;zt>0&&T<l.byteLength;){T+4>l.byteLength&&m(1),G[0]=l[T++],G[1]=l[T++],G[2]=l[T++],G[3]=l[T++],(G[0]!=2||G[1]!=2||(G[2]<<8|G[3])!=L)&&m(3,"bad rgbe scanline format");let pt=0,f;for(;pt<D&&T<l.byteLength;){f=l[T++];let Z=f>128;if(Z&&(f-=128),(f===0||pt+f>D)&&m(3,"bad scanline data"),Z){let Y=l[T++];for(let Tt=0;Tt<f;Tt++)dt[pt++]=Y}else dt.set(l.subarray(T,T+f),pt),pt+=f,T+=f}let W=L;for(let Z=0;Z<W;Z++){let Y=0;$[C]=dt[Z+Y],Y+=L,$[C+1]=dt[Z+Y],Y+=L,$[C+2]=dt[Z+Y],Y+=L,$[C+3]=dt[Z+Y],C+=4}zt--}return $},A=function(l,b,y,L){let $=l[b+3],C=Math.pow(2,$-128)/255;y[L+0]=l[b+0]*C,y[L+1]=l[b+1]*C,y[L+2]=l[b+2]*C,y[L+3]=1},x=function(l,b,y,L){let $=l[b+3],C=Math.pow(2,$-128)/255;y[L+0]=he.toHalfFloat(Math.min(l[b+0]*C,65504)),y[L+1]=he.toHalfFloat(Math.min(l[b+1]*C,65504)),y[L+2]=he.toHalfFloat(Math.min(l[b+2]*C,65504)),y[L+3]=he.toHalfFloat(1)},F=new Uint8Array(n);F.pos=0;let w=s(F),B=w.width,V=w.height,g=p(F.subarray(F.pos),B,V),R,c,P;switch(this.type){case Kt:P=g.length/4;let l=new Float32Array(P*4);for(let y=0;y<P;y++)A(g,y*4,l,y*4);R=l,c=Kt;break;case Pt:P=g.length/4;let b=new Uint16Array(P*4);for(let y=0;y<P;y++)x(g,y*4,b,y*4);R=b,c=Pt;break;default:throw new Error("THREE.HDRLoader: Unsupported type: "+this.type)}return{width:B,height:V,data:R,header:w.string,gamma:w.gamma,exposure:w.exposure,type:c}}setDataType(n){return this.type=n,this}load(n,i,e,h){function r(m,k){switch(m.type){case Kt:case Pt:m.colorSpace=eo,m.minFilter=le,m.magFilter=le,m.generateMipmaps=!1,m.flipY=!0;break}i&&i(m,k)}return super.load(n,r,e,h)}};var fe=class d extends nt{constructor(){let n=d.SkyShader,i=new He({name:n.name,uniforms:so.clone(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Te,depthWrite:!1});super(new Qt(1,1,1),i),this.isSky=!0}};fe.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new u},up:{value:new u(0,1,0)}},vertexShader:`
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

		}`};var{smoothstep:Ct,clamp:Ro}=q,Ee=12e3,Yt={x:120,z:60,rx:750,rz:600},lt={x:-480,z:680,r:170},Zt=(d,n)=>{let i=Math.sin(d*127.1+n*311.7)*43758.5453;return i-Math.floor(i)};function yo(d,n){let i=Math.floor(d),e=Math.floor(n),h=d-i,r=n-e;h=h*h*(3-2*h),r=r*r*(3-2*r);let m=Zt(i,e),k=Zt(i+1,e),S=Zt(i,e+1),M=Zt(i+1,e+1);return m+(k-m)*h+(S-m)*r+(m-k-S+M)*h*r}function Ce(d,n,i=5){let e=0,h=.5;for(let r=0;r<i;r++)e+=h*yo(d,n),d*=2.03,n*=2.03,h*=.5;return e}var _o=(d,n)=>{let i=0,e=.5;for(let h=0;h<5;h++)i+=e*(1-Math.abs(yo(d,n)*2-1))**2,d*=2.1,n*=2.1,e*=.5;return i},De=(d,n)=>Math.hypot((d-Yt.x)/Yt.rx,(n-Yt.z)/Yt.rz);function To(d,n){let i=De(d,n),e=Math.max(Ct(Math.abs(n),70,140),Ct(Math.abs(d-120),260,340)),h=(Ce(d/260,n/260,3)-.5)*3*e;return h+=Ct(i,1,1.7)*(Ce(d/520+7,n/520+3)*110-15),h+=Ct(i,2.1,3.4)*_o(d/1400,n/1400)*520,h}function Fo(d,n){let i=(d-lt.x)**2+(n-lt.z)**2;return To(d,n)-26*Math.exp(-i/(lt.r*lt.r))}function xo({lite:d,scale:n=1,vscale:i=n}){let e=n,h=i,r=Math.min(n,2.5),m=Math.min(n,1.6),k=new Ft,S=d?160:240,M=new St(Ee,Ee,S,S);M.rotateX(-Math.PI/2);let v=M.attributes.position,E=new Float32Array((S+1)*(S+1));for(let a=0;a<v.count;a++){let H=Fo(v.getX(a),v.getZ(a));v.setY(a,H),E[a]=H}M.computeVertexNormals();let s=To(lt.x,lt.z)-7,p=[[.64,.58,.34],[.25,.37,.16],[.42,.33,.22],[.44,.56,.27],[.55,.52,.3]],A=new Float32Array(v.count*3),x=new ft,F=new ft(.22,.37,.13),w=new ft(.32,.46,.17),B=new ft(.42,.39,.35),V=new ft(.92,.94,.96),g=new ft(.62,.57,.44),R=M.attributes.normal;for(let a=0;a<v.count;a++){let H=v.getX(a),U=v.getZ(a),j=v.getY(a);x.copy(F).lerp(w,Ce(H/90,U/90,3));let O=De(H,U),at=Zt(Math.floor(H/160)+.5,Math.floor(U/160)+.5);O<1.5&&at<.55*(1-Ct(O,1,1.5))&&Math.abs(U)>80&&x.setRGB(...p[Math.floor(Zt(Math.floor(H/160),Math.floor(U/160)+9)*p.length)]),Math.abs(U)<70&&Math.abs(H-120)<300&&x.lerp(new ft(.4,.53,.26),.6);let N=1-R.getY(a);x.lerp(B,Ct(N,.12,.3)),x.lerp(V,Ct(j,300,380)*(1-Ct(N,.3,.5))),j<s+1.5&&Math.hypot(H-lt.x,U-lt.z)<lt.r*1.8&&x.lerp(g,.7),A.set([x.r,x.g,x.b],a*3)}M.setAttribute("color",new Ut(A,3));let c=document.createElement("canvas");c.width=c.height=256;let P=c.getContext("2d");P.fillStyle="#d8d8d8",P.fillRect(0,0,256,256);for(let a=0;a<9e3;a++){let H=150+Math.random()*105;P.fillStyle=`rgb(${H},${H},${H})`,P.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3)}let l=new At(c);l.wrapS=l.wrapT=xe,l.colorSpace=Dt,l.anisotropy=d?2:8;let b=M.attributes.uv;for(let a=0;a<b.count;a++)b.setXY(a,v.getX(a)/24,v.getZ(a)/24);let y=new nt(M,new pe({vertexColors:!0,map:l}));y.scale.set(e,h,e),y.receiveShadow=!0,k.add(y);let L=new nt(new Eo(lt.r*2.2,48),new Mt({color:2902622,roughness:.08,metalness:.2,transparent:!0,opacity:.88}));L.rotation.x=-Math.PI/2,L.position.set(lt.x*e,s*h,lt.z*e),L.scale.set(e,e,1),k.add(L);let $=Ee/S;function C(a,H){return h*T(a/e,H/e)}function T(a,H){let U=Ro((a+Ee/2)/$,0,S-1e-6),j=Ro((H+Ee/2)/$,0,S-1e-6),O=Math.floor(U),at=Math.floor(j),N=U-O,Et=j-at,wt=E[at*(S+1)+O],o=E[at*(S+1)+O+1],z=E[(at+1)*(S+1)+O],_=E[(at+1)*(S+1)+O+1];return N+Et<1?wt+(o-wt)*N+(z-wt)*Et:_+(z-_)*(1-N)+(o-_)*(1-Et)}let D=25*e,G=new Map,dt=[],zt=(a,H)=>`${Math.floor(a/D)},${Math.floor(H/D)}`;function pt(a){let H=zt(a.x,a.z);G.has(H)||G.set(H,[]),G.get(H).push(a)}function f(a){for(let j of dt)if(a.x>j.x0&&a.x<j.x1&&a.z>j.z0&&a.z<j.z1&&a.y<j.top)return j.name;let H=Math.floor(a.x/D),U=Math.floor(a.z/D);for(let j=-1;j<=1;j++)for(let O=-1;O<=1;O++){let at=G.get(`${H+j},${U+O}`);if(at){for(let N of at)if(a.y>N.y0&&a.y<N.top&&(a.x-N.x)**2+(a.z-N.z)**2<N.r*N.r)return N.name}}return null}let W=new pe({color:7171176}),Z=(a,H,U,j)=>{let O=new nt(new St(a*(a>200?e:r),H*r),W);O.rotation.x=-Math.PI/2,O.position.set(U*e,.02,j*r),O.receiveShadow=!0,k.add(O)};Z(300,7,120,-28),Z(8,22,20,-14),Z(8,22,220,-14),Z(110,34,120,-56);let Y=new Mt({color:9080724,roughness:.6,metalness:.3}),Tt=new Mt({color:5988455,roughness:.5,metalness:.4});for(let a of[90,150]){let H=new nt(new Qt(26*r,6*r,18*r),Y);H.position.set(a*e,3*r,-84*r);let U=new nt(new ue(9*r,9*r,26*r,20,1,!1,0,Math.PI),Tt);U.rotation.z=Math.PI/2,U.position.set(a*e,6*r,-84*r),U.scale.set(.45,1,1),H.castShadow=U.castShadow=!0,dt.push({name:"un hangar",x0:a*e-13*r,x1:a*e+13*r,z0:-93*r,z1:-75*r,top:10*r}),k.add(H,U)}let xt=new nt(new ue(.06,.08,6,6),new Mt({color:14540253}));xt.position.set(60*e,3*r,-22*r),xt.scale.setScalar(r),pt({name:"el m\xE1stil de la manga",x:60*e,z:-22*r,y0:0,top:6.2*r,r:.2*r}),k.add(xt);let bt=new Ft;bt.position.set(60*e,5.9*r,-22*r),bt.scale.setScalar(r);let kt=new ue(.35,.16,2.6,12,5,!0);kt.rotateZ(-Math.PI/2),kt.translate(1.3,0,0);let Xt=[],Jt=kt.attributes.position;for(let a=0;a<Jt.count;a++){let H=Math.floor(Jt.getX(a)/.52)%2;Xt.push(...H?[.95,.95,.95]:[1,.45,.12])}kt.setAttribute("color",new ro(Xt,3));let ge=new nt(kt,new Mt({vertexColors:!0,side:Ze,roughness:.8}));bt.add(ge),k.add(bt);let te=0;function ht(a,H=1/60){let U=Math.hypot(a.x,a.z);te+=H,bt.rotation.y=Math.atan2(-a.z,a.x)+Math.sin(te*3.1)*.05,bt.rotation.z=-(1-Ct(U,.5,7))*1.2+Math.sin(te*4.3)*.03}let It=d?700:2200,Me=new ue(.25,.4,3,5);Me.translate(0,1.5,0);let t=new mo(2.4,8,7);t.translate(0,6.5,0);let ut=new go(3,0);ut.translate(0,5,0);let qt=new pe({flatShading:!0}),$t=new Se(Me,new pe({color:4863526}),It),mt=new Se(t,qt,It),Lt=new Se(ut,qt,It),Gt=new be,ee=new de,oe=new u,ne=new u,Wt=0,Ht=0,vt=0,ve=0,ct=new ft;for(;Wt<It&&ve++<It*40;){let a=Yt.x+(Math.random()*2-1)*3e3,H=Yt.z+(Math.random()*2-1)*2600,U=De(a,H);if(Math.abs(H)<110&&Math.abs(a-120)<360||Math.hypot(a-lt.x,H-lt.z)<lt.r*1.1||Ce(a/400+31,H/400+17,3)<(U<1?.56:.44)&&Math.random()>.04)continue;let O=T(a,H);if(O>330||O<s+1)continue;let at=O*h,N=O>60||U>1.2&&Math.random()<.7,Et=(.7+Math.random()*.8)*m,wt=Et*(.9+Math.random()*.4);ee.setFromAxisAngle(new u(0,1,0),Math.random()*Math.PI*2),Gt.compose(ne.set(a*e,at-.3,H*e),ee,oe.set(Et,wt,Et)),pt({name:"un \xE1rbol",x:a*e,z:H*e,y0:at-.3,top:at-.3+(N?10.5:8)*wt,r:(N?1.5:2.3)*Et}),$t.setMatrixAt(Wt++,Gt),ct.setHSL(N?.3+Math.random()*.04:.22+Math.random()*.08,.45,N?.16+Math.random()*.06:.22+Math.random()*.08),N?(mt.setMatrixAt(Ht,Gt),mt.setColorAt(Ht++,ct)):(Lt.setMatrixAt(vt,Gt),Lt.setColorAt(vt++,ct))}$t.count=Wt,mt.count=Ht,Lt.count=vt;for(let a of[$t,mt,Lt])a.castShadow=!d,a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0),k.add(a);return{group:k,heightAt:C,setWind:ht,hit:f,scale:e,side:r}}var Ao=1.225,ze=9.81,Io={m:7.2,S:.34,b:1.34,c:.28,I:new u(.28,.85,.62)},Lo={a:4.6,z:0,flap:.55,de:.35,stall:q.degToRad(15)},Go={z:.028,k:.065,flap:.05,gear:.018},Bo={z:0,a:-.9,q:-14,de:-1.15,flap:-.06},Po={b:-.08,p:-.48,da:.2,r:.08},Do={b:.13,r:-.18,dr:-.09},Uo=[{p:new u(.6,-.18,0),steer:!0},{p:new u(-.04,-.18,.238)},{p:new u(-.04,-.18,-.238)}],qo=[[.78,0,0],[-.8,.05,0],[-.68,.32,0],[-.12,.02,.67],[-.12,.02,-.67],[.2,.1,0]].map(d=>new u(...d)),$o=[[.5,-.06,0],[-.3,-.06,0],[-.04,-.07,.24],[-.04,-.07,-.24]].map(d=>({p:new u(...d)})),Wo={AC:Io,CL:Lo,CD:Go,CM:Bo,CR:Po,CN:Do,WHEELS:Uo,SKIN:qo,BELLY:$o,world:1,size:1,vref:22,ground:.185,eye:[.486,.09],tips:[new u(-.12,.02,.67),new u(-.12,.02,-.67)]};function on({model:d,parts:n,S:i,m:e,AR:h,e:r,cd0:m,vref:k,eye:S,canopy:M=[],thrust:v,hud:E,world:s=10}){let p=Math.sqrt(h*i),A=i/p;d.updateMatrixWorld(!0);let x=d.matrixWorld.clone().invert(),F=f=>new no().setFromObject(f).applyMatrix4(x),w=F(d),B=w.max.x-w.min.x,g=n.filter(f=>/tren|gear|rueda|wheel/i.test(f.data.part+" "+(f.data.label??""))).map(f=>F(f.obj)).filter(f=>isFinite(f.min.y)).map(f=>({p:new u((f.min.x+f.max.x)/2,f.min.y,(f.min.z+f.max.z)/2)}));if(g.length<3){let f=w.min.y;g=[{p:new u(w.min.x+.78*B,f,0)},{p:new u(w.min.x+.38*B,f,.12*p)},{p:new u(w.min.x+.38*B,f,-.12*p)}]}g.sort((f,W)=>W.p.x-f.p.x),g[0].steer=!0;let R=g.slice(1).reduce((f,W)=>f+W.p.x,0)/(g.length-1),c=new u(R+.1*(g[0].p.x-R),(w.min.y+w.max.y)/2,0);for(let f of g)f.p.sub(c);let P=Math.min(...g.map(f=>f.p.y)),l=-P+.02,b=new u,y=new u,L=-1/0,$=1/0,C=new u;d.traverse(f=>{if(!f.isMesh)return;let W=f.geometry.attributes.position,Z=x.clone().multiply(f.matrixWorld);for(let Y=0;Y<W.count;Y+=7)C.fromBufferAttribute(W,Y).applyMatrix4(Z),C.z>L&&(L=C.z,b.copy(C)),C.z<$&&($=C.z,y.copy(C))});let T=new Set;for(let f of M)f.traverse(W=>T.add(W));let D=-1/0;d.traverse(f=>{if(!f.isMesh||T.has(f))return;let W=f.geometry.attributes.position,Z=x.clone().multiply(f.matrixWorld);for(let Y=0;Y<W.count;Y+=3)C.fromBufferAttribute(W,Y).applyMatrix4(Z),Math.abs(C.x-S[0])<.4&&Math.abs(C.z)<.35&&C.y>D&&(D=C.y)});let G=Math.max(S[1],D+.15);b.sub(c),y.sub(c),w.min.sub(c),w.max.sub(c);let dt=[new u(w.max.x,(w.min.y+w.max.y)/2-.1*(w.max.y-w.min.y),0),new u(w.min.x,P+.35*(w.max.y-P),0),new u(w.min.x+.1*B,w.max.y,0),b.clone(),y.clone()],zt=[[.75,0],[.3,0],[.45,.25],[.45,-.25]].map(([f,W])=>({p:new u(w.min.x+f*B,P+.15*(w.max.y-P),W*p*.5)})),pt=2*Math.PI*h/(2+Math.sqrt(h*h+4));return{AC:{m:e,S:i,b:p,c:A,I:new u(e*(.22*p)**2,e*(.32*B)**2,e*(.3*B)**2)},CL:{a:pt,z:.02,flap:.35,de:.3,stall:q.degToRad(h<3?24:16)},CD:{z:m,k:1/(Math.PI*r*h),flap:.04,gear:.015},CM:{z:0,a:-.55,q:-10,de:-.8,flap:-.04},CR:{b:-.06,p:-.4,da:.12,r:.06},CN:{b:.1,r:-.15,dr:-.07},WHEELS:g,SKIN:dt,BELLY:zt,world:s,size:B/1.6,vref:k,ground:l,eye:[S[0]-c.x,G-c.y],canopy:M,tips:[b,y],thrust:v,hud:E,fixedGear:!0,cg:c}}function nn({scene:d,renderer:n,camera:i,model:e,op:h,motor:r,lite:m,setGear:k,setSurfaces:S,gearState:M,pad:v,airframe:E=Wo}){let{AC:s,CL:p,CD:A,CM:x,CR:F,CN:w,WHEELS:B,SKIN:V,BELLY:g}=E,R=E.world,c=E.size,P=E.vref,l=P/22,b=s.m/7.2,y=new Ft;y.visible=!1,d.add(y);let L=null;function $(){L=xo({lite:m,scale:R,vscale:R>1?3:1}),y.add(L.group);let o=document.createElement("canvas");o.width=256,o.height=4096;let z=o.getContext("2d");z.fillStyle="#2b2c2e",z.fillRect(0,0,256,4096);for(let K=0;K<4e3;K++)z.fillStyle=`rgba(255,255,255,${Math.random()*.04})`,z.fillRect(Math.random()*256,Math.random()*4096,2,2);z.fillStyle="#e8e6e0";for(let K=300;K<3800;K+=160)z.fillRect(124,K,8,80);z.fillRect(8,0,6,4096),z.fillRect(242,0,6,4096);for(let K=0;K<8;K++)z.fillRect(24+K*26,60,14,160),z.fillRect(24+K*26,3876,14,160);let _=new At(o);_.colorSpace=Dt,_.anisotropy=m?2:8;let I=new nt(new St(14*L.side*(R>1?1.3:1),320*R),new Mt({map:_,roughness:.85}));return I.rotation.x=-Math.PI/2,I.rotation.z=Math.PI/2,I.position.set(120*R,.03,0),I.receiveShadow=!0,y.add(I),L}let C=()=>L??$(),T=new fe;T.scale.setScalar(1e4);let D=new u().setFromSphericalCoords(1,q.degToRad(60),q.degToRad(160));Object.assign(T.material.uniforms.sunPosition.value,D),T.material.uniforms.turbidity.value=4,T.material.uniforms.rayleigh.value=1.4;let G=new ho;G.add(T);let dt=null;function zt(){let o=new co(m?256:512,{type:Pt});return new io(1,2e4,o).update(n,G),o.texture}let pt=null,f=new Ft;y.add(f);let W=70,Z=E.tips,Y=Z.map(()=>{let o=new Be;o.setAttribute("position",new Ut(new Float32Array(W*3),3)),o.setAttribute("color",new Ut(new Float32Array(W*4),4));let z=new po(o,new Pe({vertexColors:!0,transparent:!0,depthWrite:!1}));return z.frustumCulled=!1,f.add(z),{geo:o,n:0}}),Tt=m?70:160,xt=new Be,bt=new Float32Array(Tt*6),kt=new Float32Array(Tt*8);xt.setAttribute("position",new Ut(bt,3)),xt.setAttribute("color",new Ut(kt,4));let Xt=new fo(xt,new Pe({vertexColors:!0,transparent:!0,depthWrite:!1}));Xt.frustumCulled=!1,f.add(Xt);let Jt=Array.from({length:Tt},()=>({p:new u,seed:Math.random()}));function ge(o,z){let _=t.v.lengthSq()>1?t.v.clone().normalize():new u(1,0,0).applyQuaternion(t.q),I=new u(0,1,0).cross(_).normalize(),K=_.clone().cross(I).normalize(),Rt=(.5+Math.random()*2.2)*c,rt=Math.random()*Math.PI*2;o.p.copy(t.p).addScaledVector(_,(z?6+Math.random()*10:(Math.random()-.3)*16)*c).addScaledVector(I,Math.cos(rt)*Rt).addScaledVector(K,Math.sin(rt)*Rt*.7)}function te(o,z){let _=q.smoothstep(z.V,6*l,30*l),I=z.onGround?0:_*q.clamp(.25+z.alpha*5,0,1);Z.forEach((rt,X)=>{let J=Y[X],st=J.geo.attributes.position.array,Q=J.geo.attributes.color.array;st.copyWithin(3,0,(W-1)*3),Q.copyWithin(4,0,(W-1)*4);let it=rt.clone().applyQuaternion(t.q).add(t.p);st.set([it.x,it.y,it.z],0),Q.set([1,1,1,I*.75],0),J.n=Math.min(W,J.n+1);for(let et=0;et<W;et++)Q[et*4+3]*=et===0?1:.985;for(let et=0;et<W;et++){let jt=et*3;st[jt]+=ht.x*o,st[jt+1]+=(ht.y-.15)*o,st[jt+2]+=ht.z*o}if(J.n<W)for(let et=J.n;et<W;et++)st.copyWithin(et*3,(J.n-1)*3,J.n*3),Q[et*4+3]=0;J.geo.attributes.position.needsUpdate=J.geo.attributes.color.needsUpdate=!0});let K=ht.clone().sub(t.v),Rt=t.v.lengthSq()>1?t.v.clone().normalize():new u(1,0,0);for(let rt=0;rt<Tt;rt++){let X=Jt[rt];X.p.addScaledVector(ht,o);let J=X.p.clone().sub(t.p);(J.dot(Rt)<-10*c||J.length()>20*c)&&ge(X,!0);let st=1-q.smoothstep(X.p.distanceTo(t.p),1.5*c,9*c),Q=_*st*(.25+.35*X.seed),it=X.p.clone().addScaledVector(K,-.05);bt.set([X.p.x,X.p.y,X.p.z,it.x,it.y,it.z],rt*6),kt.set([.9,.95,1,Q,.9,.95,1,0],rt*8)}xt.attributes.position.needsUpdate=xt.attributes.color.needsUpdate=!0}let ht=new u,It=new u(-1.6,0,.2);function Me(o,z){let _=.6+.4*Math.sin(o*.37)*Math.sin(o*.11+1.3),I=q.clamp(z/25,.1,1)*.55;ht.copy(It).multiplyScalar(_),ht.x+=I*(Math.sin(o*1.7)+.5*Math.sin(o*4.3+2)),ht.y+=I*.6*(Math.sin(o*2.1+.7)+.5*Math.sin(o*5.9)),ht.z+=I*(Math.sin(o*1.3+4)+.5*Math.sin(o*3.7+1))}let t={p:new u,v:new u,q:new de,w:new u,throttle:0,roll:0,pitch:0,yaw:0,flap:.5,brake:0,gearUp:!1,crashed:!1,cam:"chase",t:0,assist:!0},ut=new Set,qt={pos:e.position.clone(),quat:e.quaternion.clone()};function $t(){t.p.set(R>1?-34*R:0,E.ground,0),t.v.set(0,0,0),t.q.identity(),t.w.set(0,0,0),t.throttle=0,t.flap=.5,t.gearUp=!1,t.onGround=!0,t.hold=0,t.bankHold=0,t.trim=0,t.crashed=!1,t.crashWhy="",M.target=0;for(let o of Y)o.n=0;for(let o of Jt)ge(o,!1)}let mt={gear(){!E.fixedGear&&t.p.y>1.5&&(t.gearUp=!t.gearUp,M.target=t.gearUp?1:0)},flap(){t.flap=t.flap>.6?0:t.flap+.5},cam(){t.cam=t.cam==="chase"?"cockpit":"chase"},reset:$t,engine(){r.on=!r.on},assist(){t.assist=!t.assist}},Lt=o=>z=>{let _=z.key.toLowerCase();o&&!z.repeat&&(_==="g"&&mt.gear(),_==="f"&&mt.flap(),_==="c"&&mt.cam(),_==="r"&&mt.reset(),_==="e"&&mt.engine(),_==="t"&&mt.assist()),["w","s","a","d","q","e","shift","control","b","arrowup","arrowdown"," "].includes(_)&&z.preventDefault(),o?ut.add(_):ut.delete(_)},Gt=Lt(!0),ee=Lt(!1),oe=null,ne=()=>!!(v!=null&&v.touch),Wt=new u;function Ht(o){t.crashed||(t.crashed=!0,t.crashWhy=o,t.v.set(0,0,0),t.w.set(0,0,0))}let vt=new u;function ve(o){let z=(tt,ot)=>(ut.has(tt)?1:0)-(ut.has(ot)?1:0),_=tt=>Math.max(-1,Math.min(1,tt)),I=oe;t.pitch+=(_(z("s","w")+((I==null?void 0:I.pitch)??0))-t.pitch)*Math.min(1,o*6),t.roll+=(_(z("d","a")+((I==null?void 0:I.roll)??0))-t.roll)*Math.min(1,o*7);let K=_(z("z","x")+((I==null?void 0:I.yaw)??0)),Rt=new u(1,0,0).applyQuaternion(t.q),rt=Math.atan2(Rt.z,Rt.x),X=t.v.length();if(!t.onGround||Math.abs(K)>.02||X<1||X>25*l)t.hold=rt;else if(t.assist){let tt=q.clamp(10*l/X,.4,1);K=q.clamp(Math.atan2(Math.sin(rt-t.hold),Math.cos(rt-t.hold))*6+t.w.y*.4,-tt,tt)}t.yaw+=(K-t.yaw)*Math.min(1,o*5),(ut.has("shift")||ut.has("arrowup"))&&(t.throttle=Math.min(1,t.throttle+o*.5)),(ut.has("control")||ut.has("arrowdown"))&&(t.throttle=Math.max(0,t.throttle-o*.5)),(I==null?void 0:I.throttle)!=null&&(t.throttle=I.throttle),I!=null&&I.throttleRate&&(t.throttle=Math.min(1,Math.max(0,t.throttle+I.throttleRate*o*.6))),t.brake=ut.has("b")||ut.has(" ")?1:0,r.target=t.throttle;let J=new be().makeRotationFromQuaternion(t.q),st=J.clone().transpose();t.t+=o,Me(t.t,t.p.y),vt.copy(t.v).sub(ht).applyMatrix4(st);let Q=Math.max(.01,vt.length()),it=Math.atan2(-vt.y,vt.x),et=Math.asin(q.clamp(vt.z/Q,-1,1)),jt=Ao*Math.pow(Math.max(.05,1-22558e-9*Math.max(0,t.p.y)),4.2559),Vt=.5*jt*Q*Q,We=E.thrust?E.thrust({V:Q,h:t.p.y,rho:jt}):r.on?h(r.f).thrust*r.spin:0,ke=t.assist?q.clamp((P/Math.max(Q,1))**2,.22,1):1,je=-t.pitch*q.degToRad(16)*ke,bo=t.roll*q.degToRad(20)*ke,Ve=-t.yaw*q.degToRad(22)*Math.max(ke,.45),Ot=t.flap*.8,Ho=1-M.t,we=p.z+p.a*it+p.flap*Ot-p.de*je*.1;Math.abs(it)>p.stall&&(we=Math.sign(it)*(p.a*p.stall)*Math.max(.35,1-(Math.abs(it)-p.stall)*3)+p.flap*Ot*.5);let So=A.z+A.k*we*we+A.flap*Ot+A.gear*Ho+.4*Math.max(0,Math.abs(it)-p.stall),ae=new u;if(Q>.5){let tt=vt.clone().normalize(),ot=new u(0,0,1).cross(tt).normalize();ae.addScaledVector(ot,Vt*s.S*we),ae.addScaledVector(tt,-Vt*s.S*So),ae.z+=-Vt*s.S*.6*et}ae.x+=We;let Oe=t.w.x*s.b/(2*Q),_e=t.w.y*s.b/(2*Q),Fe=t.w.z*s.c/(2*Q),Co=s.m*ze/Math.max(1,Vt*s.S)-p.flap*Ot;t.trim+=(-x.a*q.clamp(Co/p.a,0,p.stall*.7)-x.flap*Ot-t.trim)*Math.min(1,o*.8);let zo=t.onGround?0:t.trim,Nt=new u(Vt*s.S*s.b*(F.b*et+F.p*Oe+F.da*bo+F.r*_e),Vt*s.S*s.b*(w.b*-et+w.r*_e+w.dr*Ve),Vt*s.S*s.c*(x.z+x.a*it+x.q*Fe+x.de*je+x.flap*Ot+zo));if(t.assist&&Q>8*l){let tt=new u(0,0,1).applyQuaternion(t.q),ot=Math.asin(q.clamp(-tt.y,-1,1)),_t=Math.asin(q.clamp(t.v.y/Q,-1,1)),yt=Vt*s.S,gt=Math.abs(t.roll)>=.05;gt&&(t.bankHold=ot);let se=Math.abs(t.bankHold??0)<q.degToRad(12)?0:q.clamp(t.bankHold,-.79,.79);gt?Nt.x+=yt*s.b*-.2*Oe:Nt.x+=s.I.x*6*(.8*(se-ot)-t.w.x);let Bt=s.m*ze/Math.max(1,yt*s.S)*(1/Math.max(.45,Math.cos(ot))-1)/p.a;Nt.z+=Math.abs(t.pitch)<.05?yt*s.c*(-.6*_t-3*Fe-x.a*Bt):yt*s.c*-3*Fe,Nt.z+=yt*s.c*-2.5*Math.max(0,it-.8*p.stall);let ce=-(ze*Math.tan(q.clamp(ot,-1.2,1.2)))/Q*Math.cos(ot)*s.b/(2*Q);Nt.y+=yt*s.b*(-.03*et-.5*(_e-ce))}let Ae=ae.clone().applyMatrix4(J);Ae.y-=s.m*ze;let Ne=new u,Re=!1,re=M.t<.05?B:g;for(let tt of re){let ot=tt.p.clone().applyQuaternion(t.q),_t=ot.clone().add(t.p),yt=C().heightAt(_t.x,_t.z)-_t.y;if(yt<=0)continue;yt>.3*c&&Ht("contra el terreno"),Re=!0;let gt=t.v.clone().add(new u().copy(t.w).applyQuaternion(t.q).cross(ot)),se=Math.max(0,1250*b*7.2*yt/c-36*b*7.2*gt.y),ie=new u(0,se,0),Bt=new u(1,0,0).applyQuaternion(t.q).setY(0).normalize(),ce=new u(0,1,0).cross(Bt),Vo=re===g?.5:.02+.5*t.brake,Ke=s.m/re.length,Ge=gt.dot(Bt);ie.addScaledVector(Bt,-Math.sign(Ge)*Math.min(Math.abs(Ge)*40*b,Vo*se,.5*Ke*Math.abs(Ge)/o));let Qe=tt.steer?gt.dot(ce)+Bt.dot(gt)*Ve*.8:gt.dot(ce),Ye=Math.min(.9*se,.5*Ke*Math.abs(Qe)/o+(tt.steer?Math.abs(Bt.dot(gt)*Ve)*400*b:0));ie.addScaledVector(ce,-q.clamp(Qe*400*b,-Ye,Ye)),Ae.add(ie),Ne.add(ot.clone().cross(ie)),re===g&&-gt.y>2.5&&Ht("aterrizaje de panza demasiado fuerte"),re===B&&-gt.y>4&&Ht("aterrizaje demasiado fuerte, se rompi\xF3 el tren")}t.v.addScaledVector(Ae,o/s.m),t.p.addScaledVector(t.v,o);for(let tt of V){let ot=Wt.copy(tt).applyQuaternion(t.q).add(t.p),_t=C().hit(ot);if(_t){Ht(`choque contra ${_t}`);break}if(C().heightAt(ot.x,ot.z)-ot.y>.03*c){Ht(tt.z?"una punta de ala toc\xF3 el suelo":tt.x>0?"el morro contra el suelo":"la cola contra el suelo");break}}let Ie=Nt.add(Ne.applyMatrix4(st)),ko=new u(s.I.x*t.w.x,s.I.y*t.w.y,s.I.z*t.w.z),Le=t.w.clone().cross(ko);t.w.x+=(Ie.x-Le.x)/s.I.x*o,t.w.y+=(Ie.y-Le.y)/s.I.y*o,t.w.z+=(Ie.z-Le.z)/s.I.z*o,Re&&t.w.multiplyScalar(.995);let ye=t.q.clone().multiply(new de(t.w.x*o*.5,t.w.y*o*.5,t.w.z*o*.5,0));return t.q.x+=ye.x,t.q.y+=ye.y,t.q.z+=ye.z,t.q.w+=ye.w,t.q.normalize(),S({roll:t.roll,pitch:t.pitch,yaw:t.yaw,flap:t.flap}),t.onGround=Re,{V:Q,alpha:it,onGround:Re,thrust:We}}let ct={V:0,alpha:0,onGround:!0,thrust:0},a=!1;function H(o,z){a=!0,oe=z;for(let _=0;_<8;_++)ct=ve(o/8);return ct}let U=new u(-3.4*c,.9*c,0);function j(o){if(t.crashed){N(`<b>Accidente</b> \xB7 ${t.crashWhy}<br>${ne()?"Reinicio":"R"} para volver a la pista`);return}if(!a){oe=(v==null?void 0:v.read())??null;for(let st=0;st<8;st++)ct=ve(o/8)}te(o,ct),C().setWind(ht,o),e.position.copy(t.p),E.cg&&e.position.sub(Wt.copy(E.cg).applyQuaternion(t.q)),e.quaternion.copy(t.q);let z=new u(1,0,0).applyQuaternion(t.q),_=new u(0,1,0).applyQuaternion(t.q);if(t.cam==="chase"){let st=(i.aspect<1?2.6:3.4)*c,Q=z.clone().multiplyScalar(-st).add(new u(0,st*.27,0));U.lerp(Q,Math.min(1,o*3)),i.position.copy(t.p).add(U),i.up.set(0,1,0),i.lookAt(t.p.clone().addScaledVector(z,2*c).add(new u(0,(ne()?-.8:-.5)*c,0)))}else i.position.copy(t.p).addScaledVector(z,E.eye[0]).addScaledVector(_,E.eye[1]),i.up.copy(_),i.lookAt(i.position.clone().addScaledVector(z,10*c).addScaledVector(_,-1.7*c));let I=t.cam==="chase"?null:70;I&&i.fov!==I&&(i.fov=I,i.updateProjectionMatrix()),!I&&t.cam!==j.cam&&Et(),t.cam!==j.cam&&O(t.cam!=="cockpit"),j.cam=t.cam;let K=E.hud?null:h(r.f),Rt=Math.max(0,t.p.y-C().heightAt(t.p.x,t.p.z)),rt=ct.V*3.6,X=t.v.y,J=ct.alpha>p.stall;if(innerWidth<560){N(`<b>${rt.toFixed(0)}</b> km/h \xB7 <b>${Rt.toFixed(0)}</b> m \xB7 ${X>=0?"+":""}${X.toFixed(1)} m/s<br>`+(E.hud?E.hud(ct,t,!0):r.on?`<b>${Math.round(K.n*r.spin/1e3)}k</b> rpm \xB7 ${ct.thrust.toFixed(0)} N \xB7 gas ${(t.throttle*100).toFixed(0)} %`:"MW54 apagada \xB7 Motor para arrancar")+(J?"<br><b>P\xC9RDIDA</b> \xB7 baja el morro":t.brake?"<br>frenos":""));return}N(`<b>${rt.toFixed(0)}</b> km/h \xB7 <b>${Rt.toFixed(1)}</b> m \xB7 ${X>=0?"+":""}${X.toFixed(1)} m/s \xB7 \u03B1 ${q.radToDeg(ct.alpha).toFixed(0)}\xB0<br>`+(E.hud?E.hud(ct,t,!1):`MW54 ${r.on?`<b>${Math.round(K.n*r.spin).toLocaleString("es-ES")}</b> rpm \xB7 ${ct.thrust.toFixed(0)} N \xB7 EGT ${Math.round(15+(K.egt-15)*r.heat)} \xB0C`:`apagada (${ne()?"Motor":"E"} para arrancar)`} \xB7 gas ${(t.throttle*100).toFixed(0)} %`)+`<br>Viento ${ht.length().toFixed(1)} m/s \xB7 Tren ${M.t<.05?"abajo":M.t>.95?"arriba":"en tr\xE1nsito"} \xB7 flaps ${(t.flap*40).toFixed(0)}\xB0 \xB7 gir\xF3scopo ${t.assist?"s\xED":"no"}${t.brake?" \xB7 frenos":""}${J?" \xB7 <b>P\xC9RDIDA</b>":""}`)}function O(o){for(let z of E.canopy??[])z.visible=o}let at="";function N(o){o!==at&&(at=o,document.getElementById("hud").innerHTML=o)}function Et(){i.fov=q.clamp(q.radToDeg(2*Math.atan(Math.tan(q.degToRad(28))/i.aspect)),40,66),i.updateProjectionMatrix()}function wt(o,z=o){o&&C(),o&&!y.visible&&(dt??=zt(),pt=d.background,d.background=dt),!o&&y.visible&&(d.background=pt),y.visible=o,f.visible=z;let _=Math.sqrt(R);d.fog=o?new lo(11124692,900*_,(m?4500:6500)*_):null,i.up.set(0,1,0),i.near=o?.004*c:.01,i.far=o?12e3*R:50,o?Et():(i.fov=32,i.updateProjectionMatrix())}return{enter(){wt(!0),$t(),v==null||v.reset(0),addEventListener("keydown",Gt),addEventListener("keyup",ee),U.set(-3.4*c,.9*c,0)},exit(){wt(!1),removeEventListener("keydown",Gt),removeEventListener("keyup",ee),ut.clear(),O(!0),j.cam=null,document.fullscreenElement&&document.exitFullscreen().catch(()=>{}),e.position.copy(qt.pos),e.quaternion.copy(qt.quat)},update:j,simulate:H,endTest(){a=!1},fit:Et,showWorld:wt,home:qt,get terrain(){return C()},airframe:E,state:t}}var qe=4;function jo(d,n){let i=(s,p)=>{let A=new Float32Array(s*s),x=p;for(let F=0;F<A.length;F++)x=x*1664525+1013904223>>>0,A[F]=x/4294967296;return(F,w)=>{let B=F*s,V=w*s,g=Math.floor(B),R=Math.floor(V),c=B-g,P=V-R;c=c*c*(3-2*c),P=P*P*(3-2*P);let l=(b,y)=>A[(y%s+s)%s*s+(b%s+s)%s];return(l(g,R)*(1-c)+l(g+1,R)*c)*(1-P)+(l(g,R+1)*(1-c)+l(g+1,R+1)*c)*P}},e=[[5,.25],[12,.25],[30,.2],[80,.15],[200,.15]].map(([s,p],A)=>[i(s,7+A*31),p]),h=[i(3,101),i(11,202)],r=document.createElement("canvas"),m=document.createElement("canvas");r.width=r.height=m.width=m.height=n;let k=r.getContext("2d"),S=m.getContext("2d"),M=k.createImageData(n,n),v=S.createImageData(n,n);for(let s=0;s<n;s++)for(let p=0;p<n;p++){let A=p/n,x=s/n,F=0;for(let[P,l]of e)F+=P(A,x)*l;let w=Math.random(),B=w>.985?.12*Math.random():w<.01?-.16*Math.random():(Math.random()-.5)*.04,V=36+(F-.5)*12+B*110,g=(s*n+p)*4;M.data[g]=V,M.data[g+1]=V+2,M.data[g+2]=V+5,M.data[g+3]=255;let c=160+(.5*h[0](A,x)+.5*h[1](A,x)-.5)*60+Math.abs(B)*300;v.data[g]=v.data[g+1]=v.data[g+2]=c,v.data[g+3]=255}k.putImageData(M,0,0),S.putImageData(v,0,0);let E=[r,m].map(s=>{let p=new At(s);return p.wrapS=p.wrapT=xe,p.anisotropy=d.capabilities.getMaxAnisotropy(),p});return E[0].colorSpace=Dt,E}function Oo(d,n,i){d.onBeforeCompile=e=>{e.uniforms.uFade={value:new oo(n,i)},e.uniforms.uBg={value:new ft(855826)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vFloor;
uniform vec2 uFade;
uniform vec3 uBg;`).replace("#include <tonemapping_fragment>",`gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, smoothstep(uFade.x, uFade.y, length(vFloor)));
#include <tonemapping_fragment>`)}}function No(d,{W:n,D:i,box:e,dash:h,stops:r,stop:m}){let k=Math.min(512,2600/n),S=document.createElement("canvas");S.width=n*k,S.height=i*k;let M=S.getContext("2d"),v=V=>(V+n/2)*k,E=V=>(V+i/2)*k,s="#d9a93a";M.fillStyle=s;for(let[V,g]of[[e.x0,1],[e.x1,-1]])for(let[R,c]of[[e.z0,1],[e.z1,-1]])M.fillRect(Math.min(v(V),v(V+g*e.arm)),Math.min(E(R),E(R+c*e.w)),e.arm*k,e.w*k),M.fillRect(Math.min(v(V),v(V+g*e.w)),Math.min(E(R),E(R+c*e.arm)),e.w*k,e.arm*k);let[p,A,x]=h;for(let V=e.x0+A/2;V<e.x1-1.5*A;V+=A)M.fillRect(v(V),E(-x/2),p*k,x*k);let F=A*.7;M.beginPath(),M.moveTo(v(e.x1-F*.3),E(0)),M.lineTo(v(e.x1-F),E(-F*.28)),M.lineTo(v(e.x1-F),E(F*.28)),M.closePath(),M.fill(),M.fillStyle="#e6e2d6";for(let[V,g]of r)M.fillRect(v(V-m[0]*2.3),E(g-m[1]/2),m[0]*k,m[1]*k);M.globalCompositeOperation="destination-out";for(let V=0;V<14e3;V++)M.fillStyle=`rgba(0,0,0,${Math.random()*.6})`,M.fillRect(Math.random()*S.width,Math.random()*S.height,1+Math.random(),1+Math.random());let w=new At(S);w.colorSpace=Dt,w.anisotropy=d.capabilities.getMaxAnisotropy();let B=new nt(new St(n,i),new Mt({map:w,transparent:!0,roughness:.5,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));return B.rotation.x=-Math.PI/2,B.receiveShadow=!0,B}function Ko({w:d,d:n,x:i}){let e=document.createElement("canvas");e.width=e.height=256;let h=e.getContext("2d"),r=h.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,"rgba(0,0,0,0.55)"),r.addColorStop(.5,"rgba(0,0,0,0.22)"),r.addColorStop(1,"rgba(0,0,0,0)"),h.fillStyle=r,h.fillRect(0,0,256,256);let m=new nt(new St(d,n),new ao({map:new At(e),transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return m.rotation.x=-Math.PI/2,m.position.x=i,m}function rn(d,{y:n,fade:i,stand:e,ao:h,res:r=2048}){let[m,k]=jo(d,r),S=Math.ceil(i[1]*2.2/qe);for(let s of[m,k])s.repeat.set(S,S);let M=new Mt({map:m,roughnessMap:k,roughness:.7,metalness:0,envMapIntensity:.35});Oo(M,i[0],i[1]);let v=new Ft,E=new nt(new St(qe*S,qe*S),M);return E.rotation.x=-Math.PI/2,E.receiveShadow=!0,v.add(E,No(d,e),Ko(h)),v.position.y=n,v}var me=64;function $e(d,n){for(let h=0;h<d.length-1;h++){let[r,m,k]=d[h],[S,M,v]=d[h+1];if(n<=S){let E=(n-r)/Math.max(1e-6,S-r),s=k+(v-k)*E;return m.map((p,A)=>(p+(M[A]-p)*E)*s)}}let[,i,e]=d[d.length-1];return i.map(h=>h*e)}function cn(d,n,{steps:i=40}={}){var v,E,s;let e=new Float32Array(me*2*4),h=new uo(e,me,2,to,Kt);h.magFilter=h.minFilter=le,h.wrapS=h.wrapT=Je;let r={uTime:{value:0},uIntensity:{value:0},uReach:{value:1},uDiamond:{value:0},uSpacing:{value:((v=n.diamonds)==null?void 0:v.spacing)??.1},uCount:{value:((E=n.diamonds)==null?void 0:E.count)??6},uDiaColor:{value:new ft(...((s=n.diamonds)==null?void 0:s.color)??[1,.85,.6])},uGrad:{value:h},uTurb:{value:n.turbulence??1}},m=new He({uniforms:r,transparent:!0,depthWrite:!1,blending:Xe,side:Te,defines:{STEPS:i},vertexShader:`
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
      }`}),k=[],S={};function M(p){let A=Object.keys(n.modes);for(let x=0;x<2;x++)for(let F=0;F<me;F++){let w=F/(me-1),B=[0,0,0];for(let V of A){if(!p[V])continue;let g=$e(n.modes[V][x?"edge":"core"],w);for(let R=0;R<3;R++)B[R]+=g[R]*p[V]}e.set([B[0],B[1],B[2],1],(x*me+F)*4)}h.needsUpdate=!0}return{add(p,A,{length:x,r:F,h:w=1,w:B=1,light:V=!0}){let g=new Qt(1,2,2);g.translate(-.5,0,0);let R=new nt(g,m);R.position.copy(A),R.scale.set(x,F*w,F*B),R.frustumCulled=!1,R.userData.noAO=!0,R.visible=!1,p.add(R);let c=null;return V&&n.light&&(c=new vo(16755302,0,n.light.distance,2),c.position.copy(A).add(new u(-x*.12,0,0)),p.add(c)),k.push({mesh:R,lamp:c}),R},update({w:p,level:A,optimal:x,reach:F=1,time:w,visible:B}){Object.keys(p).some(c=>Math.abs((S[c]??0)-p[c])>.01)&&(S={...p},M(S)),r.uTime.value=w,r.uIntensity.value=A*(n.brightness??1),r.uDiamond.value=x,r.uReach.value=F;let V=$e(Object.values(n.modes)[0].core,.1),g=[0,0,0];for(let[c,P]of Object.entries(S)){if(!P)continue;let l=$e(n.modes[c].core,.15);g=g.map((b,y)=>b+l[y]*P)}let R=Math.max(...g,.001);for(let c of k)c.mesh.visible=B&&A>.01,c.lamp&&(c.lamp.visible=c.mesh.visible,c.lamp.color.setRGB(g[0]/R,g[1]/R,g[2]/R),c.lamp.intensity=n.light.intensity*A*Math.min(1,R/2)*(.92+.08*Math.sin(w*37+V[0])))}}}export{wo as a,on as b,nn as c,rn as d,cn as e};
