(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";var Simplex=require(7),setupRandom=require(5),initializeShortcuts=require(3),_require=require(2),setupCanvas=_require.setupCanvas,loop=_require.loop,generateSeed=_require.generateSeed,elasticOut=require(6),TAU=2*Math.PI,seed=generateSeed(),random=setupRandom(seed),simplex=new Simplex(random),simplex3=simplex.noise3D.bind(simplex),ctx=setupCanvas();initializeShortcuts(seed);var config={ctx:ctx,seed:seed,lineSpacing:100,rotationSpeed:.05,circleLineWidth:2,simplex3:simplex3,armLineWidth:5},current={lines:generateLines(config)};loop(function(e){current.time=e,draw(config,current)}),window.onhashchange=function(){location.reload()},window.addEventListener("resize",function(){current.lines=generateLines(config)});var title=document.querySelector(".title");function generateLines(e){for(var t=e.lineSpacing,i=e.ctx,r=e.simplex3,n=i.canvas,a=n.width,o=n.height,l=[],s=Math.floor(a/t)+1,c=Math.floor(o/t)+1,u=0;u<s;u++)for(var d=0;d<c;d++)l.push({x:u*t,y:d*t,theta:r(.05*u,.05*d,0),r:.5*t,rotationTimeOffset:Math.abs(r(.05*u,.05*d,0))});return l}function draw(e,t){var i=e.ctx,r=e.armLineWidth,n=e.circleLineWidth,a=e.rotationSpeed,o=e.lineSpacing,l=t.lines,s=t.time;i.fillStyle="#33333305",i.fillRect(0,0,i.canvas.width,i.canvas.height),i.strokeStyle="#ffffff05",i.lineWidth=n*devicePixelRatio,i.beginPath();var c=!0,u=!1,d=void 0;try{for(var f,h=l[Symbol.iterator]();!(c=(f=h.next()).done);c=!0){var v=f.value,m=v.x,p=v.y;i.moveTo(m+.5*o,p),i.arc(m,p,.5*o,0,TAU)}}catch(e){u=!0,d=e}finally{try{c||null==h.return||h.return()}finally{if(u)throw d}}i.stroke(),i.strokeStyle="#fff",i.lineCap="round",i.lineWidth=r*devicePixelRatio,i.beginPath();var x=!0,g=!1,S=void 0;try{for(var y,w=l[Symbol.iterator]();!(x=(y=w.next()).done);x=!0){var b=y.value,q=b.x,L=b.y,T=b.theta,M=b.r,P=b.rotationTimeOffset,R=M-r*devicePixelRatio/2;i.moveTo(q,L);var W=T+elasticOut((s*a+P)%1)*TAU;i.lineTo(q+Math.cos(W)*R,L+Math.sin(W)*R)}}catch(e){g=!0,S=e}finally{try{x||null==w.return||w.return()}finally{if(g)throw S}}i.stroke()}title&&Object.assign(title.style,{backgroundColor:"#444a",boxShadow:"0 0 10px 20px #444a"});

},{"2":2,"3":3,"5":5,"6":6,"7":7}],2:[function(require,module,exports){
"use strict";function setupCanvas(){var e=document.createElement("canvas");function n(){e.width=window.innerWidth*devicePixelRatio,e.height=window.innerHeight*devicePixelRatio}return document.body.appendChild(e),n(),window.addEventListener("resize",n,!1),e.getContext("2d",{alpha:!1})}function loop(e){var n=Date.now();requestAnimationFrame(function t(){e((Date.now()-n)/1e3),requestAnimationFrame(t)})}function generateSeed(){var e=window.location.hash.substr(1)||String(Math.random()).split(".")[1];return console.log("current seed",e),e}module.exports={setupCanvas:setupCanvas,loop:loop,generateSeed:generateSeed};

},{}],3:[function(require,module,exports){
"use strict";function _click(e){var t=document.querySelector(e);t&&t.click()}module.exports=function(e,t){console.log(["Available shortcuts:","f: enter fullscreen","h: hide the ui","r: reload the ui","s: create a screenshot link","u: save the current seed to the URL","left: previous session","right: next session"].join("\n")),window.addEventListener("keydown",function(n){switch(n.key){case"h":document.body.classList.toggle("hide-ui");break;case"r":window.location.reload();break;case"s":var o=document.querySelector("canvas");if(!o){console.log("Could not find a canvas element to screenshot");break}var c=document.querySelector(".download-link");c||((c=document.createElement("a")).className="download-link",document.body.appendChild(c),c.innerHTML="Download Screenshot",c.target="_blank",c.addEventListener("click",function(){c.style.display="none"})),c.href=o.toDataURL(),c.style.display="inline-block";break;case"u":history.pushState(null,document.title,window.location.pathname+"#"+e);break;case"f":if(document.fullscreenElement)document.exitFullscreen&&document.exitFullscreen();else{var l=document.querySelector("canvas");l.requestFullscreen&&l.requestFullscreen()}t&&t();break;case"ArrowLeftt":_click("#prev");break;case"ArrowRight":_click("#next")}},!1)};

},{}],4:[function(require,module,exports){
function _mashFn(){var r=4022871197;return function(n){n=n.toString();for(var t=0;t<n.length;t++){var e=.02519603282416938*(r+=n.charCodeAt(t));e-=r=e>>>0,r=(e*=r)>>>0,r+=4294967296*(e-=r)}return 2.3283064365386963e-10*(r>>>0)}}module.exports=function(){var r=Array.prototype.slice.call(arguments),n=0,t=0,e=0,a=1;0===r.length&&(r=[+new Date]);var o=_mashFn();n=t=e=o(" ");for(var u=0;u<r.length;u++)(n-=o(r[u]))<0&&(n+=1),(t-=o(r[u]))<0&&(t+=1),(e-=o(r[u]))<0&&(e+=1);return function(){var r=2091639*n+2.3283064365386963e-10*a;return n=t,t=e,e=r-(a=0|r)}};

},{}],5:[function(require,module,exports){
var Alea=require(4);module.exports=function(){var r=Alea.apply(this,arguments);return function(e,a,n){a=void 0===a?1:a;var t=(e=void 0===e?0:e)+r()*(a-e);return n?parseInt(t,10):t}};

},{"4":4}],6:[function(require,module,exports){
function elasticOut(t){return Math.sin(-13*(t+1)*Math.PI/2)*Math.pow(2,-10*t)+1}module.exports=elasticOut;

},{}],7:[function(require,module,exports){
!function(){"use strict";var r=.5*(Math.sqrt(3)-1),e=(3-Math.sqrt(3))/6,t=1/6,a=(Math.sqrt(5)-1)/4,o=(5-Math.sqrt(5))/20;function i(r){var e;e="function"==typeof r?r:r?function(){var r=0,e=0,t=0,a=1,o=(i=4022871197,function(r){r=r.toString();for(var e=0;e<r.length;e++){var t=.02519603282416938*(i+=r.charCodeAt(e));t-=i=t>>>0,i=(t*=i)>>>0,i+=4294967296*(t-=i)}return 2.3283064365386963e-10*(i>>>0)});var i;r=o(" "),e=o(" "),t=o(" ");for(var n=0;n<arguments.length;n++)(r-=o(arguments[n]))<0&&(r+=1),(e-=o(arguments[n]))<0&&(e+=1),(t-=o(arguments[n]))<0&&(t+=1);return o=null,function(){var o=2091639*r+2.3283064365386963e-10*a;return r=e,e=t,t=o-(a=0|o)}}(r):Math.random,this.p=n(e),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var t=0;t<512;t++)this.perm[t]=this.p[255&t],this.permMod12[t]=this.perm[t]%12}function n(r){var e,t=new Uint8Array(256);for(e=0;e<256;e++)t[e]=e;for(e=0;e<255;e++){var a=e+~~(r()*(256-e)),o=t[e];t[e]=t[a],t[a]=o}return t}i.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(t,a){var o,i,n=this.permMod12,f=this.perm,s=this.grad3,v=0,h=0,l=0,u=(t+a)*r,d=Math.floor(t+u),p=Math.floor(a+u),M=(d+p)*e,m=t-(d-M),c=a-(p-M);m>c?(o=1,i=0):(o=0,i=1);var y=m-o+e,w=c-i+e,g=m-1+2*e,A=c-1+2*e,x=255&d,q=255&p,D=.5-m*m-c*c;if(D>=0){var S=3*n[x+f[q]];v=(D*=D)*D*(s[S]*m+s[S+1]*c)}var U=.5-y*y-w*w;if(U>=0){var b=3*n[x+o+f[q+i]];h=(U*=U)*U*(s[b]*y+s[b+1]*w)}var F=.5-g*g-A*A;if(F>=0){var N=3*n[x+1+f[q+1]];l=(F*=F)*F*(s[N]*g+s[N+1]*A)}return 70*(v+h+l)},noise3D:function(r,e,a){var o,i,n,f,s,v,h,l,u,d,p=this.permMod12,M=this.perm,m=this.grad3,c=(r+e+a)*(1/3),y=Math.floor(r+c),w=Math.floor(e+c),g=Math.floor(a+c),A=(y+w+g)*t,x=r-(y-A),q=e-(w-A),D=a-(g-A);x>=q?q>=D?(s=1,v=0,h=0,l=1,u=1,d=0):x>=D?(s=1,v=0,h=0,l=1,u=0,d=1):(s=0,v=0,h=1,l=1,u=0,d=1):q<D?(s=0,v=0,h=1,l=0,u=1,d=1):x<D?(s=0,v=1,h=0,l=0,u=1,d=1):(s=0,v=1,h=0,l=1,u=1,d=0);var S=x-s+t,U=q-v+t,b=D-h+t,F=x-l+2*t,N=q-u+2*t,C=D-d+2*t,P=x-1+.5,T=q-1+.5,_=D-1+.5,j=255&y,k=255&w,z=255&g,B=.6-x*x-q*q-D*D;if(B<0)o=0;else{var E=3*p[j+M[k+M[z]]];o=(B*=B)*B*(m[E]*x+m[E+1]*q+m[E+2]*D)}var G=.6-S*S-U*U-b*b;if(G<0)i=0;else{var H=3*p[j+s+M[k+v+M[z+h]]];i=(G*=G)*G*(m[H]*S+m[H+1]*U+m[H+2]*b)}var I=.6-F*F-N*N-C*C;if(I<0)n=0;else{var J=3*p[j+l+M[k+u+M[z+d]]];n=(I*=I)*I*(m[J]*F+m[J+1]*N+m[J+2]*C)}var K=.6-P*P-T*T-_*_;if(K<0)f=0;else{var L=3*p[j+1+M[k+1+M[z+1]]];f=(K*=K)*K*(m[L]*P+m[L+1]*T+m[L+2]*_)}return 32*(o+i+n+f)},noise4D:function(r,e,t,i){var n,f,s,v,h,l,u,d,p,M,m,c,y,w,g,A,x,q=this.perm,D=this.grad4,S=(r+e+t+i)*a,U=Math.floor(r+S),b=Math.floor(e+S),F=Math.floor(t+S),N=Math.floor(i+S),C=(U+b+F+N)*o,P=r-(U-C),T=e-(b-C),_=t-(F-C),j=i-(N-C),k=0,z=0,B=0,E=0;P>T?k++:z++,P>_?k++:B++,P>j?k++:E++,T>_?z++:B++,T>j?z++:E++,_>j?B++:E++;var G=P-(l=k>=3?1:0)+o,H=T-(u=z>=3?1:0)+o,I=_-(d=B>=3?1:0)+o,J=j-(p=E>=3?1:0)+o,K=P-(M=k>=2?1:0)+2*o,L=T-(m=z>=2?1:0)+2*o,O=_-(c=B>=2?1:0)+2*o,Q=j-(y=E>=2?1:0)+2*o,R=P-(w=k>=1?1:0)+3*o,V=T-(g=z>=1?1:0)+3*o,W=_-(A=B>=1?1:0)+3*o,X=j-(x=E>=1?1:0)+3*o,Y=P-1+4*o,Z=T-1+4*o,$=_-1+4*o,rr=j-1+4*o,er=255&U,tr=255&b,ar=255&F,or=255&N,ir=.6-P*P-T*T-_*_-j*j;if(ir<0)n=0;else{var nr=q[er+q[tr+q[ar+q[or]]]]%32*4;n=(ir*=ir)*ir*(D[nr]*P+D[nr+1]*T+D[nr+2]*_+D[nr+3]*j)}var fr=.6-G*G-H*H-I*I-J*J;if(fr<0)f=0;else{var sr=q[er+l+q[tr+u+q[ar+d+q[or+p]]]]%32*4;f=(fr*=fr)*fr*(D[sr]*G+D[sr+1]*H+D[sr+2]*I+D[sr+3]*J)}var vr=.6-K*K-L*L-O*O-Q*Q;if(vr<0)s=0;else{var hr=q[er+M+q[tr+m+q[ar+c+q[or+y]]]]%32*4;s=(vr*=vr)*vr*(D[hr]*K+D[hr+1]*L+D[hr+2]*O+D[hr+3]*Q)}var lr=.6-R*R-V*V-W*W-X*X;if(lr<0)v=0;else{var ur=q[er+w+q[tr+g+q[ar+A+q[or+x]]]]%32*4;v=(lr*=lr)*lr*(D[ur]*R+D[ur+1]*V+D[ur+2]*W+D[ur+3]*X)}var dr=.6-Y*Y-Z*Z-$*$-rr*rr;if(dr<0)h=0;else{var pr=q[er+1+q[tr+1+q[ar+1+q[or+1]]]]%32*4;h=(dr*=dr)*dr*(D[pr]*Y+D[pr+1]*Z+D[pr+2]*$+D[pr+3]*rr)}return 27*(n+f+s+v+h)}},i._buildPermutationTable=n,"undefined"!=typeof define&&define.amd&&define(function(){return i}),"undefined"!=typeof exports?exports.SimplexNoise=i:"undefined"!=typeof window&&(window.SimplexNoise=i),"undefined"!=typeof module&&(module.exports=i)}();

},{}]},{},[1])
//# sourceMappingURL=bundle.js.map