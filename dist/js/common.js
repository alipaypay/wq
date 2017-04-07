!function(t,e,n){var s={DOMAIN:"https://ccapp.cib.com.cn/o2o-merchant-api",SUCCESS_CODE:"000000",TIME_OUT:1e4};n.getConfig=function(t){return s[t]},n.utils=function(){var s={},r=e.createElement("div").style,o=function(){for(var t=["t","webkitT","MozT","msT","OT"],e=0,i=t.length;e<i;e++)if(t[e]+"ransform"in r)return t[e].substr(0,t[e].length-1);return r=null,!1}(),a=function(t,e){if("object"==typeof localStorage)try{localStorage.setItem(t,e)}catch(t){n.cue.alert("请关闭无痕浏览模式")}},c=function(t,e){if("object"==typeof sessionStorage)try{sessionStorage.setItem(t,e)}catch(t){n.cue.alert("请关闭无痕浏览模式")}};return s.prefixStyle=function(t){return o!==!1&&(""===o?t:o+t.charAt(0).toUpperCase()+t.substr(1))},s.extend=function(t,e){for(i in e)t[i]=e[i];return t},s.param=function(t){var e,i="";if(!t)return"";for(e in t)i+=e+"="+t[e]+"&";return i.substring(0,i.length-1)},s.parseSearchStr=function(e){var i,n,s={};return i=e?decodeURIComponent(e).split("&"):decodeURIComponent(t.location.search.substr(1)).split("&"),i.forEach(function(t){t&&(n=t.split("="),s[n[0]]=n[1])}),s},s.isEmptyObject=function(t){for(var e in t)return!1;return!0},s.localSet=function(t,e){"object"==typeof e?a(t,JSON.stringify(e)):a(t,e)},s.localGet=function(t,e){var i;try{return i=localStorage.getItem(t),e&&localStorage.removeItem(t),JSON.parse(i)}catch(t){return i}},s.sessionSet=function(t,e){"object"==typeof e?c(t,JSON.stringify(e)):c(t,e)},s.sessionGet=function(t){var e;try{return e=sessionStorage.getItem(t),JSON.parse(e)}catch(t){return e}},s.toFixed=function(t,e,i){var n=(t+"").split(".");return e<=0?t:"floor"===i?n[1]&&n[1].length>e?Number(n[0]+"."+n[1].substr(0,e)):t:"ceil"===i?n[1]&&n[1].length>e?Number(n[0]+"."+n[1].substr(0,e))+Math.pow(10,-1*e):t:(n[1]&&n[1].length>e&&(e=n[1].length),Number(t.toFixed(e)))},s}(),n.ajax=function(t){var e,i,s,r=new XMLHttpRequest,o=!1,a="",c=function(t){l.loading&&(t?s=setTimeout(function(){n.cue.loading(1)},200):(clearTimeout(s),n.cue.loading(0)))},l={async:!0,type:"POST",loading:!1,abortTip:!1,contentType:"text/plain;charset=UTF-8",abnormal:function(t){}};return n.utils.extend(l,t),c(1),/http:/.test(l.url)||(l.url=n.getConfig("DOMAIN")+l.url),e=setTimeout(function(){o=!0,r.abort(),c(0),l.abortTip&&n.cue.toast("请求超时了！")},l.timeout||n.getConfig("TIME_OUT")),r.onreadystatechange=function(){if(4===r.readyState){if(o)return;if(clearTimeout(e),"blob"===l.responseType)200===r.status?(l.success&&l.success(r.response),c(0)):(l.error&&l.error(r.response),c(0));else if(i=r.responseText,200===r.status){c(0);try{return i&&"object"!=typeof i&&(i=JSON.parse(decodeURI(i))),i.responseCode===n.getConfig("SUCCESS_CODE")?l.success&&l.success(i):l.abnormal&&l.abnormal(i)}catch(t){n.cue.alert("ajax success,next error"+r.responseText)}}else{c(0);try{return i&&"object"!=typeof i&&(i=JSON.parse(decodeURI(i))),l.error&&l.error(i)}catch(t){n.cue.alert("ajax error,next error"+r.responseText)}}}},"get"===l.type.toLowerCase()&&(a=n.utils.param(l.data))&&(l.url+="?"+a),"blob"===l.responseType&&(r.responseType="blob"),r.open(l.type,l.url,l.async),r.setRequestHeader("Content-Type",l.contentType),"get"===l.type.toLowerCase()?r.send(null):r.send(JSON.stringify(l.data)),r},n.html=function(t){var i=e.createElement("div");return i.innerHTML=t,i.children[0]},n.css3=function(t,e){var i=t.style;for(var s in e){var r=n.utils.prefixStyle(s);r!==!1&&(i[r]=e[s])}},n.rAF=t.requestAnimationFrame||t.webkitRequestAnimationFrame||t.mozRequestAnimationFrame||t.oRequestAnimationFrame||t.msRequestAnimationFrame||function(e){t.setTimeout(e,1e3/60)},n.pageSkip=function(e){var i,s,r=0,o="",a=function(t){t.split("/").forEach(function(t){".."===t?r++:o+="/"+t}),o=o.replace(/^\//,"")};"number"==typeof e?t.history.go(e):"string"==typeof e?(i=e.split(","),a(i[0]),i[1]?t.location.replace(this.getDomainPath(r)+o):t.location.href=this.getDomainPath(r)+o):"object"==typeof e&&(a(e.url),s=n.utils.isEmptyObject(e.data)?"":"?"+n.utils.param(e.data),e.replace===!0?t.location.replace(this.getDomainPath(r)+o+s):t.location.href=this.getDomainPath(r)+o+s)},n.getDomainPath=function(e){var n=null,s=".*?\\/",r="";for(s=".*?\\/",i=0,e=e||0;i<e;i++)r+=s;return n=new RegExp("(.*\\/)"+r+".*?\\.html\\??"),n.exec(t.location.href),RegExp.$1},n.cue={loading:function(t,e){this._first&&this._init(),t?(this._loadingCount||this._changeLoadingTxt(e)._show(this._loadingEl,"loading"),this._loadingCount++):this._loadingCount&&(--this._loadingCount||this._hide(this._loadingEl,"loading"))},toast:function(t,e){this._first&&this._init(),this._list.push({id:(new Date).getTime()+Math.random(),type:"toast",msg:t,cb:e,exec:function(){var t=this;n.cue._loadingEl.style.opacity="0",n.cue._changeToastTxt(this.msg)._show(n.cue._toastEl,this.type),setTimeout(function(){n.cue._hide(n.cue._toastEl,t.type)._remove()._next(),t.cb&&t.cb()},2e3)}}),this._begin()},alert:function(t,e){this._first&&this._init(),this._list.push({id:(new Date).getTime()+Math.random(),type:"alert",msg:t,cb:e,exec:function(){var t=this;n.cue._loadingEl.style.opacity="0",n.cue._changeAlertTxt(this.msg)._show(n.cue._alertEl,t.type),n.cue._alertCB=function(){n.cue._hide(n.cue._alertEl,t.type)._remove()._next(),t.cb&&t.cb()}}}),this._begin()},confirm:function(t,e,i){this._first&&this._init(),this._list.push({id:(new Date).getTime()+Math.random(),type:"confirm",msg:t,cb:e,cb1:i,exec:function(){var t=this;n.cue._loadingEl.style.opacity="0",n.cue._changeConfirmTxt(this.msg)._show(n.cue._confirmEl,t.type),n.cue._confirmCB=function(e){n.cue._hide(n.cue._confirmEl,t.type)._remove()._next(),e?t.cb&&t.cb():t.cb1&&t.cb1()}}}),this._begin()},_first:!0,_loadingCount:0,_alertCB:null,_confirmCB:null,_list:[],_show:function(t,i){return t.style.display="table","alert"!==i&&"confirm"!==i||e.querySelector(".content,.container").classList.add("filter"),this},_hide:function(t,i){return t.style.display="none","alert"!==i&&"confirm"!==i||e.querySelector(".content,.container").classList.remove("filter"),this},_remove:function(t){return this._list[0]&&this._list.shift(0),this},_begin:function(){!this._cuing&&this._list[0]&&(this._cuing=!0,this._list[0].exec())},_next:function(){if(this._list[0]){var t=this;return setTimeout(function(){t._list[0].exec(),t._cuing=!0},16),this}return n.cue._loadingEl.style.opacity="1",this._cuing=!1,this},_init:function(){delete this._first;var t=e.querySelector("body");this._loadingEl=n.html('<div class="loading"><div class="loading-panel"><div class="loading-content"><div class="upper"><div class="loading-pic circle-ani"></div></div><div class="lower"></div></div></div></div>'),this._changeLoadingTxt=function(t){return this._loadingEl.querySelector(".lower").innerHTML=t||"信息加载中...",this},t.appendChild(this._loadingEl),this._toastEl=n.html('<div class="toast" ><div class="toast-panel"><div class="toast-content">&nbsp;</div></div></div>'),this._changeToastTxt=function(t){return this._toastEl.querySelector(".toast-content").innerHTML=t||"请您注意了！",this},t.appendChild(this._toastEl),this._alertEl=n.html('<div class="alert mask"><div class="alert-panel"><div class="alert-content"><p class="header">注意</p><p class="body">&nbsp;</p><p class="footer sure">确定</p></div></div></div>'),this._changeAlertTxt=function(t){return this._alertEl.querySelector(".body").innerHTML=t||"请您注意了！",this},this._alertEl.querySelector(".sure").addEventListener("click",function(){n.cue._alertCB&&n.cue._alertCB()},!1),t.appendChild(this._alertEl),this._confirmEl=n.html('<div class="confirm mask"><div class="confirm-panel"><div class="confirm-content"><p class="header">注意</p><p class="body">&nbsp;</p><div class="footer"><p class="cell-l cancel">取消</p><p class="cell-r sure">确定</p></div></div></div></div>'),this._changeConfirmTxt=function(t){return this._confirmEl.querySelector(".body").innerHTML=t||"您确定要这样操作？",this},this._confirmEl.querySelector(".sure").addEventListener("click",function(){n.cue._confirmCB&&n.cue._confirmCB(1)},!1),this._confirmEl.querySelector(".cancel").addEventListener("click",function(){n.cue._confirmCB&&n.cue._confirmCB(0)},!1),t.appendChild(this._confirmEl)}},n.scrollRefresh=function(t,e,i){var n=new IScroll("#wrapper",{refresh:!0,probeType:2,animateSpeed:55,animateBeginOffset:70,borderColor:"#0394fb",borderBGColor:"#fff",BGColor:"#e1e1e1"});return n.on("pullDownRefresh",function(){e&&e()}),n.on("pullUpRefresh",function(){i&&i()}),n},function(e){n.os={};var i=[function(){var t=e.match(/(MicroMessenger)\/([\d\.]+)/i);return t&&(this.os.wechat={version:t[2].replace(/_/g,".")}),!1},function(){var i=e.match(/(Android);?[\s\/]+([\d.]+)?/);return i&&(this.os.android=!0,this.os.version=i[2],this.os.isBadAndroid=!/Chrome\/\d/.test(t.navigator.appVersion)),this.os.android===!0},function(){var t=e.match(/(iPhone\sOS)\s([\d_]+)/);if(t)this.os.ios=this.os.iphone=!0,this.os.version=t[2].replace(/_/g,".");else{var i=e.match(/(iPad).*OS\s([\d_]+)/);i&&(this.os.ios=this.os.ipad=!0,this.os.version=i[2].replace(/_/g,"."))}return this.os.ios===!0}];[].every.call(i,function(t){return!t.call(n)})}(t.navigator.userAgent),n.plus={nextPage:function(t){this.ai("nextPage",t)},ai:function(e,i){if(n.os.ios)try{t.webkit.messageHandlers[e].postMessage(JSON.stringify(i))}catch(t){alert("错误"+t)}else if(n.os.android)try{t.plus[e](JSON.stringify(i))}catch(t){alert("错误"+t)}}}}(window,document,window.xy={});