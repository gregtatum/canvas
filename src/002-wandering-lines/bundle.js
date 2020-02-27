(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function _cutOutIntersections(e,n){var i,t=1/0,r=n.line;return e.forEach(function(e){var n=e.line,a=Intersection(r[0],r[1],r[2],r[3],n[0],n[1],n[2],n[3]);if(a){var o=(a[0]-r[0])*(a[0]-r[0])+(a[1]-r[1])*(a[1]-r[1]);t>o&&(t=o,i=a)}}),i?_lineToBounds([r[0],r[1],i[0],i[1]]):!1}function _lineToBounds(e){var n=[Math.min(e[0],e[2]),Math.min(e[1],e[3]),Math.max(e[0],e[2]),Math.max(e[1],e[3])];return n.line=e,n.theta=Math.atan2(e[3]-e[1],e[2]-e[0]),n}function _newLine(e,n,i,t,r,a){var o=n.simplex3(i*n.simplexScale,t*n.simplexScale,a*n.simplexDepthScale),s=o*TAU,u=i+Math.cos(s)*n.lineLength,l=t+Math.sin(s)*n.lineLength,c=_lineToBounds([i,t,u,l]),h=e.tree.search(c),d=_cutOutIntersections(h,c);return d&&(c=d),c.line.generation=r,e.tree.insert(c),e.lines.push(c.line),e.newLines.push(c.line),d?void 0:c}function _createStageBoundary(e,n){var i=.5,t=.5,r=.5*e.margin,a=i-r,o=i+r,s=t-r,u=t+r;n.stageBoundary=[Lerp(i,a,.5),Lerp(t,s,.5),Lerp(i,o,.5),Lerp(t,u,.5)]}function _updateLines(e,n){e.iteration++,e.newLines.length=0;for(var i=0;i<n.activeLines;i++){var t,r,a,o=e.active[i];e.firstRun?(t=n.random(e.stageBoundary[0],e.stageBoundary[2]),r=n.random(e.stageBoundary[1],e.stageBoundary[3]),a=Math.log(e.generation++)):o||(o=_startBranch(e,n)),o&&(t=o.line[2],r=o.line[3],a=o.generation),e.active[i]=_newLine(e,n,t,r,a,e.iteration)}e.firstRun=!1}function _startBranch(e,n){var i=e.tree.search(e.stageBoundary),t=Math.floor(n.random(i.length)),r=i[t].line,a=(r[2]-r[0])*n.nubSize,o=(r[3]-r[1])*n.nubSize,s=n.random()>.5?[-o,a]:[o,-a],u=(r[0]+r[2])/2,l=(r[1]+r[3])/2,c=_lineToBounds([u+.5*s[0],l+.5*s[1],u+s[0],l+s[1]]);return c.line.generation=Math.pow(r.generation||2,2),e.tree.insert(c),e.lines.push(c.line),e.newLines.push(c.line),c}function init(){function e(){_updateLines(o,a),s(),requestAnimationFrame(e)}var n=window.location.hash.substr(1)||String(Math.random()).split(".")[1],i=Random(n),t=new Simplex(i),r=t.noise3D.bind(t);Shortcuts(n),console.log("current seed",n);var a={margin:1.5,activeLines:20,random:i,simplex3:r,maxAngle:.2*Math.PI,lineLength:.002,simplexScale:1,simplexDepthScale:1e-4,nubSize:1e-4},o={firstRun:!0,tree:Rbush(9),active:[],lines:[],newLines:[],stageBoundary:null,generation:2,iteration:0};_createStageBoundary(a,o);var s=Draw(o);requestAnimationFrame(e),window.onhashchange=function(){location.reload()}}var Rbush=require("rbush"),Simplex=require("simplex-noise"),Lerp=require("lerp"),Random=require("@tatumcreative/random"),Intersection=require("../lib/intersection"),Draw=require("../lib/draw"),Shortcuts=require("../lib/shortcuts"),TAU=2*Math.PI;init();

},{"../lib/draw":2,"../lib/intersection":3,"../lib/shortcuts":4,"@tatumcreative/random":6,"lerp":8,"rbush":9,"simplex-noise":10}],2:[function(require,module,exports){
function _drawLines(t,i,e,n){t.strokeStyle=i.lineColor,t.lineCap="round",n.forEach(function(n){t.lineWidth=e.line((10-n.generation)/10*i.lineWidth),t.beginPath(),t.moveTo(e.x(n[0],n[1]),e.y(n[0],n[1])),t.lineTo(e.x(n[2],n[3]),e.y(n[2],n[3])),t.stroke(),t.closePath()})}function _prepCanvasAndGetCtx(t){function i(){t.width=window.innerWidth*devicePixelRatio,t.height=window.innerHeight*devicePixelRatio}return i(),window.addEventListener("resize",i,!1),t.getContext("2d")}function _setupPlotting(t,i,e){function n(){i.ratio=e.width/e.height,i.ratio<1?(i.width=e.width,i.height=e.height*i.ratio):(i.ratio=1/i.ratio,i.width=e.width*i.ratio,i.height=e.height),i.offsetX=(e.width-i.width)/2,i.offsetY=(e.height-i.height)/2,i.size=Math.sqrt(e.width*e.width+e.height*e.height)/t.baseScreenDiagonal}n(),window.addEventListener("resize",n,!1);var o=Math.cos(t.rotation),r=Math.sin(t.rotation);return{x:function(t,e){t-=.5,e-=.5;var n=t*o-e*r+.5;return i.offsetX+n*i.width},y:function(t,e){t-=.5,e-=.5;var n=t*r+e*o+.5;return i.offsetY+n*i.height},line:function(t){return t*i.size}}}var TAU=2*Math.PI;module.exports=function(t){function i(i){var n=i?t.lines:t.newLines;_drawLines(r,e,h,n)}var e={baseScreenDiagonal:1e3,lineWidth:2,lineColor:"#ddd",rotation:Math.PI/4},n={ratio:1,width:0,height:0},o=document.querySelector("canvas"),r=_prepCanvasAndGetCtx(o),h=_setupPlotting(e,n,o);return window.addEventListener("resize",i.bind(null,!0),!1),i};

},{}],3:[function(require,module,exports){
module.exports=function(r,e,n,t,u,i,o,f){if(r===u&&e==i||r===o&&e==f||n===u&&t==i||n===o&&t==f)return!1;var v=(f-i)*(n-r)-(o-u)*(t-e),a=(o-u)*(e-i)-(f-i)*(r-u),d=(n-r)*(e-i)-(t-e)*(r-u);if(0===v||0===a&&0===d)return!1;var c=a/v,l=d/v;return c>=0&&1>=c&&l>=0&&1>=l?[c*(n-r)+r,c*(t-e)+e]:void 0};

},{}],4:[function(require,module,exports){
function _click(e){var c=document.querySelector(e);c&&c.click()}function executeIfExists(e){"function"==typeof e&&e()}var Keycode=require("keycode");module.exports=function(e){window.addEventListener("keydown",function(c){switch(Keycode(c)){case"h":document.body.classList.toggle("hide-ui");break;case"r":window.location.reload();break;case"s":history.pushState(null,document.title,window.location.pathname+"#"+e);break;case"f":if(document.fullscreenElement)document.exitFullscreen?document.exitFullscreen():null;else{var t=document.querySelector("canvas");t.requestFullscreen?t.requestFullscreen():null}break;case"left":_click("#prev");break;case"right":_click("#next")}},!1)};

},{"keycode":7}],5:[function(require,module,exports){
function _mashFn(){var r=4022871197;return function(n){n=n.toString();for(var t=0;t<n.length;t++){r+=n.charCodeAt(t);var e=.02519603282416938*r;r=e>>>0,e-=r,e*=r,r=e>>>0,e-=r,r+=4294967296*e}return 2.3283064365386963e-10*(r>>>0)}}module.exports=function(){var r=Array.prototype.slice.call(arguments),n=0,t=0,e=0,a=1;0===r.length&&(r=[+new Date]);var o=_mashFn();n=t=e=o(" ");for(var u=0;u<r.length;u++)n-=o(r[u]),0>n&&(n+=1),t-=o(r[u]),0>t&&(t+=1),e-=o(r[u]),0>e&&(e+=1);return function(){var r=2091639*n+2.3283064365386963e-10*a;return n=t,t=e,e=r-(a=0|r)}};

},{}],6:[function(require,module,exports){
var Alea=require("./prng/alea");module.exports=function(){var r=Alea.apply(this,arguments);return function(e,a,n){e=void 0===e?0:e,a=void 0===a?1:a;var t=e+r()*(a-e);return n?parseInt(t,10):t}};

},{"./prng/alea":5}],7:[function(require,module,exports){
exports=module.exports=function(e){if(e&&"object"==typeof e){var a=e.which||e.keyCode||e.charCode;a&&(e=a)}if("number"==typeof e)return names[e];var o=String(e),i=codes[o.toLowerCase()];if(i)return i;var i=aliases[o.toLowerCase()];return i?i:1===o.length?o.charCodeAt(0):void 0};var codes=exports.code=exports.codes={backspace:8,tab:9,enter:13,shift:16,ctrl:17,alt:18,"pause/break":19,"caps lock":20,esc:27,space:32,"page up":33,"page down":34,end:35,home:36,left:37,up:38,right:39,down:40,insert:45,"delete":46,command:91,"right click":93,"numpad *":106,"numpad +":107,"numpad -":109,"numpad .":110,"numpad /":111,"num lock":144,"scroll lock":145,"my computer":182,"my calculator":183,";":186,"=":187,",":188,"-":189,".":190,"/":191,"`":192,"[":219,"\\":220,"]":221,"'":222},aliases=exports.aliases={windows:91,"⇧":16,"⌥":18,"⌃":17,"⌘":91,ctl:17,control:17,option:18,pause:19,"break":19,caps:20,"return":13,escape:27,spc:32,pgup:33,pgdn:33,ins:45,del:46,cmd:91};for(i=97;123>i;i++)codes[String.fromCharCode(i)]=i-32;for(var i=48;58>i;i++)codes[i-48]=i;for(i=1;13>i;i++)codes["f"+i]=i+111;for(i=0;10>i;i++)codes["numpad "+i]=i+96;var names=exports.names=exports.title={};for(i in codes)names[codes[i]]=i;for(var alias in aliases)codes[alias]=aliases[alias];

},{}],8:[function(require,module,exports){
function lerp(e,r,l){return e*(1-l)+r*l}module.exports=lerp;

},{}],9:[function(require,module,exports){
!function(){"use strict";function t(i,n){return this instanceof t?(this._maxEntries=Math.max(4,i||9),this._minEntries=Math.max(2,Math.ceil(.4*this._maxEntries)),n&&this._initFormat(n),void this.clear()):new t(i,n)}function i(t,i){t.bbox=n(t,0,t.children.length,i)}function n(t,i,n,r){for(var o,a=e(),s=i;n>s;s++)o=t.children[s],h(a,t.leaf?r(o):o.bbox);return a}function e(){return[1/0,1/0,-(1/0),-(1/0)]}function h(t,i){return t[0]=Math.min(t[0],i[0]),t[1]=Math.min(t[1],i[1]),t[2]=Math.max(t[2],i[2]),t[3]=Math.max(t[3],i[3]),t}function r(t,i){return t.bbox[0]-i.bbox[0]}function o(t,i){return t.bbox[1]-i.bbox[1]}function a(t){return(t[2]-t[0])*(t[3]-t[1])}function s(t){return t[2]-t[0]+(t[3]-t[1])}function l(t,i){return(Math.max(i[2],t[2])-Math.min(i[0],t[0]))*(Math.max(i[3],t[3])-Math.min(i[1],t[1]))}function u(t,i){var n=Math.max(t[0],i[0]),e=Math.max(t[1],i[1]),h=Math.min(t[2],i[2]),r=Math.min(t[3],i[3]);return Math.max(0,h-n)*Math.max(0,r-e)}function f(t,i){return t[0]<=i[0]&&t[1]<=i[1]&&i[2]<=t[2]&&i[3]<=t[3]}function c(t,i){return i[0]<=t[2]&&i[1]<=t[3]&&i[2]>=t[0]&&i[3]>=t[1]}function d(t,i,n,e,h){for(var r,o=[i,n];o.length;)n=o.pop(),i=o.pop(),e>=n-i||(r=i+Math.ceil((n-i)/e/2)*e,x(t,i,n,r,h),o.push(i,r,r,n))}function x(t,i,n,e,h){for(var r,o,a,s,l,u,f,c,d;n>i;){for(n-i>600&&(r=n-i+1,o=e-i+1,a=Math.log(r),s=.5*Math.exp(2*a/3),l=.5*Math.sqrt(a*s*(r-s)/r)*(0>o-r/2?-1:1),u=Math.max(i,Math.floor(e-o*s/r+l)),f=Math.min(n,Math.floor(e+(r-o)*s/r+l)),x(t,u,f,e,h)),c=t[e],o=i,d=n,p(t,i,e),h(t[n],c)>0&&p(t,i,n);d>o;){for(p(t,o,d),o++,d--;h(t[o],c)<0;)o++;for(;h(t[d],c)>0;)d--}0===h(t[i],c)?p(t,i,d):(d++,p(t,d,n)),e>=d&&(i=d+1),d>=e&&(n=d-1)}}function p(t,i,n){var e=t[i];t[i]=t[n],t[n]=e}t.prototype={all:function(){return this._all(this.data,[])},search:function(t){var i=this.data,n=[],e=this.toBBox;if(!c(t,i.bbox))return n;for(var h,r,o,a,s=[];i;){for(h=0,r=i.children.length;r>h;h++)o=i.children[h],a=i.leaf?e(o):o.bbox,c(t,a)&&(i.leaf?n.push(o):f(t,a)?this._all(o,n):s.push(o));i=s.pop()}return n},collides:function(t){var i=this.data,n=this.toBBox;if(!c(t,i.bbox))return!1;for(var e,h,r,o,a=[];i;){for(e=0,h=i.children.length;h>e;e++)if(r=i.children[e],o=i.leaf?n(r):r.bbox,c(t,o)){if(i.leaf||f(t,o))return!0;a.push(r)}i=a.pop()}return!1},load:function(t){if(!t||!t.length)return this;if(t.length<this._minEntries){for(var i=0,n=t.length;n>i;i++)this.insert(t[i]);return this}var e=this._build(t.slice(),0,t.length-1,0);if(this.data.children.length)if(this.data.height===e.height)this._splitRoot(this.data,e);else{if(this.data.height<e.height){var h=this.data;this.data=e,e=h}this._insert(e,this.data.height-e.height-1,!0)}else this.data=e;return this},insert:function(t){return t&&this._insert(t,this.data.height-1),this},clear:function(){return this.data={children:[],height:1,bbox:e(),leaf:!0},this},remove:function(t){if(!t)return this;for(var i,n,e,h,r=this.data,o=this.toBBox(t),a=[],s=[];r||a.length;){if(r||(r=a.pop(),n=a[a.length-1],i=s.pop(),h=!0),r.leaf&&(e=r.children.indexOf(t),-1!==e))return r.children.splice(e,1),a.push(r),this._condense(a),this;h||r.leaf||!f(r.bbox,o)?n?(i++,r=n.children[i],h=!1):r=null:(a.push(r),s.push(i),i=0,n=r,r=r.children[0])}return this},toBBox:function(t){return t},compareMinX:function(t,i){return t[0]-i[0]},compareMinY:function(t,i){return t[1]-i[1]},toJSON:function(){return this.data},fromJSON:function(t){return this.data=t,this},_all:function(t,i){for(var n=[];t;)t.leaf?i.push.apply(i,t.children):n.push.apply(n,t.children),t=n.pop();return i},_build:function(t,n,e,h){var r,o=e-n+1,a=this._maxEntries;if(a>=o)return r={children:t.slice(n,e+1),height:1,bbox:null,leaf:!0},i(r,this.toBBox),r;h||(h=Math.ceil(Math.log(o)/Math.log(a)),a=Math.ceil(o/Math.pow(a,h-1))),r={children:[],height:h,bbox:null,leaf:!1};var s,l,u,f,c=Math.ceil(o/a),x=c*Math.ceil(Math.sqrt(a));for(d(t,n,e,x,this.compareMinX),s=n;e>=s;s+=x)for(u=Math.min(s+x-1,e),d(t,s,u,c,this.compareMinY),l=s;u>=l;l+=c)f=Math.min(l+c-1,u),r.children.push(this._build(t,l,f,h-1));return i(r,this.toBBox),r},_chooseSubtree:function(t,i,n,e){for(var h,r,o,s,u,f,c,d;;){if(e.push(i),i.leaf||e.length-1===n)break;for(c=d=1/0,h=0,r=i.children.length;r>h;h++)o=i.children[h],u=a(o.bbox),f=l(t,o.bbox)-u,d>f?(d=f,c=c>u?u:c,s=o):f===d&&c>u&&(c=u,s=o);i=s}return i},_insert:function(t,i,n){var e=this.toBBox,r=n?t.bbox:e(t),o=[],a=this._chooseSubtree(r,this.data,i,o);for(a.children.push(t),h(a.bbox,r);i>=0&&o[i].children.length>this._maxEntries;)this._split(o,i),i--;this._adjustParentBBoxes(r,o,i)},_split:function(t,n){var e=t[n],h=e.children.length,r=this._minEntries;this._chooseSplitAxis(e,r,h);var o=this._chooseSplitIndex(e,r,h),a={children:e.children.splice(o,e.children.length-o),height:e.height,bbox:null,leaf:!1};e.leaf&&(a.leaf=!0),i(e,this.toBBox),i(a,this.toBBox),n?t[n-1].children.push(a):this._splitRoot(e,a)},_splitRoot:function(t,n){this.data={children:[t,n],height:t.height+1,bbox:null,leaf:!1},i(this.data,this.toBBox)},_chooseSplitIndex:function(t,i,e){var h,r,o,s,l,f,c,d;for(f=c=1/0,h=i;e-i>=h;h++)r=n(t,0,h,this.toBBox),o=n(t,h,e,this.toBBox),s=u(r,o),l=a(r)+a(o),f>s?(f=s,d=h,c=c>l?l:c):s===f&&c>l&&(c=l,d=h);return d},_chooseSplitAxis:function(t,i,n){var e=t.leaf?this.compareMinX:r,h=t.leaf?this.compareMinY:o,a=this._allDistMargin(t,i,n,e),s=this._allDistMargin(t,i,n,h);s>a&&t.children.sort(e)},_allDistMargin:function(t,i,e,r){t.children.sort(r);var o,a,l=this.toBBox,u=n(t,0,i,l),f=n(t,e-i,e,l),c=s(u)+s(f);for(o=i;e-i>o;o++)a=t.children[o],h(u,t.leaf?l(a):a.bbox),c+=s(u);for(o=e-i-1;o>=i;o--)a=t.children[o],h(f,t.leaf?l(a):a.bbox),c+=s(f);return c},_adjustParentBBoxes:function(t,i,n){for(var e=n;e>=0;e--)h(i[e].bbox,t)},_condense:function(t){for(var n,e=t.length-1;e>=0;e--)0===t[e].children.length?e>0?(n=t[e-1].children,n.splice(n.indexOf(t[e]),1)):this.clear():i(t[e],this.toBBox)},_initFormat:function(t){var i=["return a"," - b",";"];this.compareMinX=new Function("a","b",i.join(t[0])),this.compareMinY=new Function("a","b",i.join(t[1])),this.toBBox=new Function("a","return [a"+t.join(", a")+"];")}},"function"==typeof define&&define.amd?define("rbush",function(){return t}):"undefined"!=typeof module?module.exports=t:"undefined"!=typeof self?self.rbush=t:window.rbush=t}();

},{}],10:[function(require,module,exports){
!function(){"use strict";function r(r){r||(r=Math.random),this.p=new Uint8Array(256),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var e=0;256>e;e++)this.p[e]=256*r();for(e=0;512>e;e++)this.perm[e]=this.p[255&e],this.permMod12[e]=this.perm[e]%12}var e=.5*(Math.sqrt(3)-1),t=(3-Math.sqrt(3))/6,a=1/3,i=1/6,o=(Math.sqrt(5)-1)/4,n=(5-Math.sqrt(5))/20;r.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(r,a){var i,o,n=this.permMod12,f=this.perm,s=this.grad3,h=0,v=0,d=0,p=(r+a)*e,l=Math.floor(r+p),M=Math.floor(a+p),m=(l+M)*t,u=l-m,y=M-m,w=r-u,c=a-y;w>c?(i=1,o=0):(i=0,o=1);var g=w-i+t,x=c-o+t,A=w-1+2*t,q=c-1+2*t,D=255&l,U=255&M,F=.5-w*w-c*c;if(F>=0){var N=3*n[D+f[U]];F*=F,h=F*F*(s[N]*w+s[N+1]*c)}var S=.5-g*g-x*x;if(S>=0){var b=3*n[D+i+f[U+o]];S*=S,v=S*S*(s[b]*g+s[b+1]*x)}var j=.5-A*A-q*q;if(j>=0){var k=3*n[D+1+f[U+1]];j*=j,d=j*j*(s[k]*A+s[k+1]*q)}return 70*(h+v+d)},noise3D:function(r,e,t){var o,n,f,s,h,v,d,p,l,M,m=this.permMod12,u=this.perm,y=this.grad3,w=(r+e+t)*a,c=Math.floor(r+w),g=Math.floor(e+w),x=Math.floor(t+w),A=(c+g+x)*i,q=c-A,D=g-A,U=x-A,F=r-q,N=e-D,S=t-U;F>=N?N>=S?(h=1,v=0,d=0,p=1,l=1,M=0):F>=S?(h=1,v=0,d=0,p=1,l=0,M=1):(h=0,v=0,d=1,p=1,l=0,M=1):S>N?(h=0,v=0,d=1,p=0,l=1,M=1):S>F?(h=0,v=1,d=0,p=0,l=1,M=1):(h=0,v=1,d=0,p=1,l=1,M=0);var b=F-h+i,j=N-v+i,k=S-d+i,z=F-p+2*i,B=N-l+2*i,C=S-M+2*i,E=F-1+3*i,G=N-1+3*i,H=S-1+3*i,I=255&c,J=255&g,K=255&x,L=.6-F*F-N*N-S*S;if(0>L)o=0;else{var O=3*m[I+u[J+u[K]]];L*=L,o=L*L*(y[O]*F+y[O+1]*N+y[O+2]*S)}var P=.6-b*b-j*j-k*k;if(0>P)n=0;else{var Q=3*m[I+h+u[J+v+u[K+d]]];P*=P,n=P*P*(y[Q]*b+y[Q+1]*j+y[Q+2]*k)}var R=.6-z*z-B*B-C*C;if(0>R)f=0;else{var T=3*m[I+p+u[J+l+u[K+M]]];R*=R,f=R*R*(y[T]*z+y[T+1]*B+y[T+2]*C)}var V=.6-E*E-G*G-H*H;if(0>V)s=0;else{var W=3*m[I+1+u[J+1+u[K+1]]];V*=V,s=V*V*(y[W]*E+y[W+1]*G+y[W+2]*H)}return 32*(o+n+f+s)},noise4D:function(r,e,t,a){var i,f,s,h,v,d=(this.permMod12,this.perm),p=this.grad4,l=(r+e+t+a)*o,M=Math.floor(r+l),m=Math.floor(e+l),u=Math.floor(t+l),y=Math.floor(a+l),w=(M+m+u+y)*n,c=M-w,g=m-w,x=u-w,A=y-w,q=r-c,D=e-g,U=t-x,F=a-A,N=0,S=0,b=0,j=0;q>D?N++:S++,q>U?N++:b++,q>F?N++:j++,D>U?S++:b++,D>F?S++:j++,U>F?b++:j++;var k,z,B,C,E,G,H,I,J,K,L,O;k=N>=3?1:0,z=S>=3?1:0,B=b>=3?1:0,C=j>=3?1:0,E=N>=2?1:0,G=S>=2?1:0,H=b>=2?1:0,I=j>=2?1:0,J=N>=1?1:0,K=S>=1?1:0,L=b>=1?1:0,O=j>=1?1:0;var P=q-k+n,Q=D-z+n,R=U-B+n,T=F-C+n,V=q-E+2*n,W=D-G+2*n,X=U-H+2*n,Y=F-I+2*n,Z=q-J+3*n,$=D-K+3*n,_=U-L+3*n,rr=F-O+3*n,er=q-1+4*n,tr=D-1+4*n,ar=U-1+4*n,ir=F-1+4*n,or=255&M,nr=255&m,fr=255&u,sr=255&y,hr=.6-q*q-D*D-U*U-F*F;if(0>hr)i=0;else{var vr=d[or+d[nr+d[fr+d[sr]]]]%32*4;hr*=hr,i=hr*hr*(p[vr]*q+p[vr+1]*D+p[vr+2]*U+p[vr+3]*F)}var dr=.6-P*P-Q*Q-R*R-T*T;if(0>dr)f=0;else{var pr=d[or+k+d[nr+z+d[fr+B+d[sr+C]]]]%32*4;dr*=dr,f=dr*dr*(p[pr]*P+p[pr+1]*Q+p[pr+2]*R+p[pr+3]*T)}var lr=.6-V*V-W*W-X*X-Y*Y;if(0>lr)s=0;else{var Mr=d[or+E+d[nr+G+d[fr+H+d[sr+I]]]]%32*4;lr*=lr,s=lr*lr*(p[Mr]*V+p[Mr+1]*W+p[Mr+2]*X+p[Mr+3]*Y)}var mr=.6-Z*Z-$*$-_*_-rr*rr;if(0>mr)h=0;else{var ur=d[or+J+d[nr+K+d[fr+L+d[sr+O]]]]%32*4;mr*=mr,h=mr*mr*(p[ur]*Z+p[ur+1]*$+p[ur+2]*_+p[ur+3]*rr)}var yr=.6-er*er-tr*tr-ar*ar-ir*ir;if(0>yr)v=0;else{var wr=d[or+1+d[nr+1+d[fr+1+d[sr+1]]]]%32*4;yr*=yr,v=yr*yr*(p[wr]*er+p[wr+1]*tr+p[wr+2]*ar+p[wr+3]*ir)}return 27*(i+f+s+h+v)}},"undefined"!=typeof define&&define.amd&&define(function(){return r}),"undefined"!=typeof exports?exports.SimplexNoise=r:"undefined"!=typeof window&&(window.SimplexNoise=r),"undefined"!=typeof module&&(module.exports=r)}();

},{}]},{},[1])
//# sourceMappingURL=bundle.js.map
