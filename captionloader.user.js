// ==UserScript==
// @name        PoC YouTube caption loader
// @namespace   Violentmonkey Scripts
// @match        *://*.youtube.com/watch
// @grant       none
// @version     0.1
// @author      kjy00302
// @description Proof-of-Concept YouTube user caption loader
// @run-at       document-start
// ==/UserScript==

// ytInitialPlayerResponse injection code from https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/

const PLAYER_RESPONSE_ALIASES = ["ytInitialPlayerResponse", "playerResponse"];
let wrappedPlayerResponse;

function isObject(obj) {
  return obj !== null && typeof obj === "object";
}

function createElement(tagName, options) {
  const node = document.createElement(tagName);
  options && Object.assign(node, options);
  return node;
}

const nativeObjectDefineProperty = (() => {
  // Check if function is native
  if (Object.defineProperty.toString().includes("[native code]")) {
    return Object.defineProperty;
  }

  // If function is overidden, restore the native function from another window...
  const tempFrame = createElement("iframe", { style: `display: none;` });
  document.documentElement.append(tempFrame);

  const native = tempFrame.contentWindow.Object.defineProperty;

  tempFrame.remove();

  return native;
})();

function attachInitialDataInterceptor(onInititalDataSet) {

  // Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
  let { get: chainedPlayerGetter, set: chainedPlayerSetter } = Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse") || {};

  // Just for compatibility: Intercept (re-)definitions on YouTube's initial player response property to chain setter/getter from other extensions by hijacking the Object.defineProperty function
  Object.defineProperty = (obj, prop, descriptor) => {
    if (obj === window && PLAYER_RESPONSE_ALIASES.includes(prop)) {
      console.info("Another extension tries to redefine '" + prop + "' (probably an AdBlock extension). Chain it...");

      if (descriptor !== null && descriptor !== void 0 && descriptor.set) chainedPlayerSetter = descriptor.set;
      if (descriptor !== null && descriptor !== void 0 && descriptor.get) chainedPlayerGetter = descriptor.get;
    } else {
      nativeObjectDefineProperty(obj, prop, descriptor);
    }
  };

  // Redefine 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
  nativeObjectDefineProperty(window, "ytInitialPlayerResponse", {
    set: (playerResponse) => {
      // prevent recursive setter calls by ignoring unchanged data (this fixes a problem caused by Brave browser shield)
      if (playerResponse === wrappedPlayerResponse) return;

      wrappedPlayerResponse = isObject(playerResponse) ? onInititalDataSet(playerResponse) : playerResponse;
      if (typeof chainedPlayerSetter === "function") chainedPlayerSetter(wrappedPlayerResponse);
    },
    get: () => {
      // eslint-disable-next-line no-empty
      if (typeof chainedPlayerGetter === "function") try {return chainedPlayerGetter();} catch (err) {}
      return wrappedPlayerResponse || {};
    },
    configurable: true });

}

// also xhr intercept code from https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/
const nativeXMLHttpRequestOpen = XMLHttpRequest.prototype.open;

function attachXhrOpenInterceptor(onXhrOpenCalled) {
  XMLHttpRequest.prototype.open = function (method, url) {
    if (arguments.length > 1 && typeof url === "string" && url.indexOf("https://") === 0) {
      const modifiedUrl = onXhrOpenCalled(this, method, new URL(url));

      if (typeof modifiedUrl === "string") {
        url = modifiedUrl;
      }
    }

    nativeXMLHttpRequestOpen.apply(this, arguments);
  };
}

let videoId;

function overrideCaption(ytData) {
  videoId = ytData.videoDetails.videoId;
  if (videoId == "hHkKJfcBXcw") {
    let usersub_data = {
      baseUrl: "https://example.com/usersub_" + videoId,
      name: {simpleText: "UserSub PoC"},
      vssId: ".zz",
      languageCode: "zz",
      isTranslatable: true,
      trackName: "UserSub_" + videoId
    };
    let ind = ytData.captions.playerCaptionsTracklistRenderer.captionTracks.push(usersub_data);
    ytData.captions.playerCaptionsTracklistRenderer.audioTracks[0].captionTrackIndices.push(ind - 1);
  }
  return ytData;
}

attachInitialDataInterceptor(overrideCaption)


function overrideCaptionUrl(xhr, method, url) {
  if (url.pathname == "/usersub_" + videoId) {
    url.hostname = "localhost"
    url.port = "8000"
    url.protocol = "http:"
    Object.defineProperty(xhr, "withCredentials", {
      set: () => {},
      get: () => false });
    console.log("override caption url:" + url.toString());
    return url.toString();
  }
  return;
}

attachXhrOpenInterceptor(overrideCaptionUrl)
