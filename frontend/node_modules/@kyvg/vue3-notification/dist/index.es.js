(function(){"use strict";var o;try{if(typeof document<"u"){var e=document.createElement("style");e.nonce=(o=document.head.querySelector("meta[property=csp-nonce]"))==null?void 0:o.content,e.appendChild(document.createTextNode(".vue-notification-group{display:block;position:fixed;z-index:5000}.vue-notification-wrapper{display:block;overflow:hidden;width:100%;margin:0;padding:0}.notification-title{font-weight:600}.vue-notification-template{display:block;box-sizing:border-box;background:#fff;text-align:left}.vue-notification{display:block;box-sizing:border-box;text-align:left;font-size:12px;padding:10px;margin:0 5px 5px;color:#fff;background:#44a4fc;border-left:5px solid #187FE7}.vue-notification.warn{background:#ffb648;border-left-color:#f48a06}.vue-notification.error{background:#e54d42;border-left-color:#b82e24}.vue-notification.success{background:#68cd86;border-left-color:#42a85f}.vn-fade-enter-active,.vn-fade-leave-active,.vn-fade-move{transition:all .5s}.vn-fade-enter-from,.vn-fade-leave-to{opacity:0}")),document.head.appendChild(e)}}catch(n){console.error("vite-plugin-css-injected-by-js",n)}})();
import { defineComponent as U, ref as X, computed as g, onMounted as Z, createVNode as l, TransitionGroup as tt, mergeProps as et, Fragment as $, isVNode as nt } from "vue";
const R = /* @__PURE__ */ new Map();
function ot(t) {
  return { all: t = t || /* @__PURE__ */ new Map(), on: function(o, i) {
    var a = t.get(o);
    a ? a.push(i) : t.set(o, [i]);
  }, off: function(o, i) {
    var a = t.get(o);
    a && (i ? a.splice(a.indexOf(i) >>> 0, 1) : t.set(o, []));
  }, emit: function(o, i) {
    var a = t.get(o);
    a && a.slice().map(function(r) {
      r(i);
    }), (a = t.get("*")) && a.slice().map(function(r) {
      r(o, i);
    });
  } };
}
const v = ot(), T = "[-+]?[0-9]*.?[0-9]+", M = [
  {
    name: "px",
    regexp: new RegExp(`^${T}px$`)
  },
  {
    name: "%",
    regexp: new RegExp(`^${T}%$`)
  },
  /**
   * Fallback option
   * If no suffix specified, assigning "px"
   */
  {
    name: "px",
    regexp: new RegExp(`^${T}$`)
  }
], it = (t) => {
  if (t === "auto")
    return {
      type: t,
      value: 0
    };
  for (let o = 0; o < M.length; o++) {
    const i = M[o];
    if (i.regexp.test(t))
      return {
        type: i.name,
        value: parseFloat(t)
      };
  }
  return {
    type: "",
    value: t
  };
}, at = (t) => {
  switch (typeof t) {
    case "number":
      return { type: "px", value: t };
    case "string":
      return it(t);
    default:
      return { type: "", value: t };
  }
}, H = {
  x: /* @__PURE__ */ new Set(["left", "center", "right"]),
  y: /* @__PURE__ */ new Set(["top", "bottom"])
}, st = /* @__PURE__ */ ((t) => () => t++)(0), rt = (t) => typeof t != "string" ? [] : t.split(/\s+/gi).filter(Boolean), lt = (t) => {
  typeof t == "string" && (t = rt(t));
  let o = null, i = null;
  return t.forEach((a) => {
    H.y.has(a) && (i = a), H.x.has(a) && (o = a);
  }), { x: o, y: i };
}, b = {
  position: ["top", "right"],
  cssAnimation: "vn-fade",
  velocityAnimation: {
    enter: (t) => ({
      height: [t.clientHeight, 0],
      opacity: [1, 0]
    }),
    leave: {
      height: 0,
      opacity: [0, 1]
    }
  }
}, ct = (t, o) => {
  let i, a, r = o;
  const y = () => {
    a = Date.now(), i = setTimeout(t, r);
  }, m = () => {
    clearTimeout(i), r -= Date.now() - a;
  };
  return y(), {
    start: y,
    stop: m
  };
};
function ut(t) {
  return typeof t == "function" || Object.prototype.toString.call(t) === "[object Object]" && !nt(t);
}
const x = {
  IDLE: 0,
  DESTROYED: 2
}, ft = /* @__PURE__ */ U({
  // eslint-disable-next-line vue/multi-word-component-names
  name: "notifications",
  props: {
    group: {
      type: String,
      default: ""
    },
    /** 
     * Width of notification holder, can be `%`, `px` string or number.
     * @example '100%', '200px', 200 
     * */
    width: {
      type: [Number, String],
      default: 300
    },
    reverse: {
      type: Boolean,
      default: !1
    },
    position: {
      type: [String, Array],
      default: () => b.position
    },
    classes: {
      type: [String, Array],
      default: "vue-notification"
    },
    animationType: {
      type: String,
      default: "css",
      validator(t) {
        return t === "css" || t === "velocity";
      }
    },
    animation: {
      type: Object,
      default() {
        return b.velocityAnimation;
      }
    },
    animationName: {
      type: String,
      default: b.cssAnimation
    },
    speed: {
      type: Number,
      default: 300
    },
    /** Time (in ms) to keep the notification on screen (if **negative** - notification will stay **forever** or until clicked) */
    duration: {
      type: Number,
      default: 3e3
    },
    delay: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 1 / 0
    },
    ignoreDuplicates: {
      type: Boolean,
      default: !1
    },
    closeOnClick: {
      type: Boolean,
      default: !0
    },
    pauseOnHover: {
      type: Boolean,
      default: !1
    },
    /** Use [v-html](https://vuejs.org/api/built-in-directives.html#v-html) to set `title` and `text` */
    dangerouslySetInnerHtml: {
      type: Boolean,
      default: !1
    }
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    click: (t) => !0,
    destroy: (t) => !0,
    start: (t) => !0
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  slots: Object,
  setup: (t, {
    emit: o,
    slots: i,
    expose: a
  }) => {
    const r = X([]), y = R.get("velocity"), m = g(() => t.animationType === "velocity"), c = g(() => r.value.filter((e) => e.state !== x.DESTROYED)), D = g(() => at(t.width)), S = g(() => {
      const {
        x: e,
        y: n
      } = lt(t.position), s = D.value.value, u = D.value.type, p = {
        width: s + u
      };
      return n && (p[n] = "0px"), e && (e === "center" ? p.left = `calc(50% - ${+s / 2}${u})` : p[e] = "0px"), p;
    }), j = g(() => m.value ? {
      onEnter: G,
      onLeave: W,
      onAfterLeave: O
    } : {}), B = (e) => {
      o("click", e), t.closeOnClick && d(e);
    }, L = (e) => {
      var n;
      t.pauseOnHover && ((n = e.timer) == null || n.stop());
    }, k = (e) => {
      var n;
      t.pauseOnHover && ((n = e.timer) == null || n.start());
    }, C = (e = {}) => {
      if (e.group || (e.group = ""), e.data || (e.data = {}), t.group !== e.group)
        return;
      if (e.clean || e.clear) {
        F();
        return;
      }
      const n = typeof e.duration == "number" ? e.duration : t.duration, s = typeof e.speed == "number" ? e.speed : t.speed, u = typeof e.ignoreDuplicates == "boolean" ? e.ignoreDuplicates : t.ignoreDuplicates, {
        title: p,
        text: q,
        type: z,
        data: J,
        id: K
      } = e, f = {
        id: K || st(),
        title: p,
        text: q,
        type: z,
        state: x.IDLE,
        speed: s,
        length: n + 2 * s,
        data: J,
        duplicates: 0
      };
      n >= 0 && (f.timer = ct(() => d(f), f.length));
      const w = "bottom" in S.value, Q = t.reverse ? !w : w;
      let h = -1;
      const A = c.value.find((I) => I.title === e.title && I.text === e.text);
      if (u && A) {
        A.duplicates++;
        return;
      }
      Q ? (r.value.push(f), o("start", f), c.value.length > t.max && (h = 0)) : (r.value.unshift(f), o("start", f), c.value.length > t.max && (h = c.value.length - 1)), h !== -1 && d(c.value[h]);
    }, P = (e) => {
      _(e);
    }, Y = (e) => ["vue-notification-template", t.classes, e.type || ""], V = (e) => m.value ? void 0 : {
      transition: `all ${e.speed}ms`
    }, d = (e) => {
      var n;
      (n = e.timer) == null || n.stop(), e.state = x.DESTROYED, O(), o("destroy", e);
    }, _ = (e) => {
      const n = r.value.find((s) => s.id === e);
      n && d(n);
    }, F = () => {
      c.value.forEach(d);
    }, N = (e, n) => {
      var u;
      const s = (u = t.animation) == null ? void 0 : u[e];
      return typeof s == "function" ? s(n) : s;
    }, G = (e, n) => {
      const s = N("enter", e);
      y(e, s, {
        duration: t.speed,
        complete: n
      });
    }, W = (e, n) => {
      const s = N("leave", e);
      y(e, s, {
        duration: t.speed,
        complete: n
      });
    };
    function O() {
      r.value = r.value.filter((e) => e.state !== x.DESTROYED);
    }
    return Z(() => {
      v.on("add", C), v.on("close", P);
    }), () => {
      let e;
      return l("div", {
        class: "vue-notification-group",
        style: S.value
      }, [l(tt, et(j.value, {
        tag: "div",
        css: !m.value,
        name: t.animationName
      }), ut(e = c.value.map((n) => l("div", {
        key: n.id,
        class: "vue-notification-wrapper",
        style: V(n),
        "data-id": n.id,
        onMouseenter: () => L(n),
        onMouseleave: () => k(n)
      }, [i.body ? i.body({
        item: n,
        class: [t.classes, n.type],
        close: () => d(n)
      }) : l("div", {
        class: Y(n),
        onClick: () => B(n)
      }, [t.dangerouslySetInnerHtml ? l($, null, [n.title ? l("div", {
        class: "notification-title",
        innerHTML: n.title
      }, null) : null, l("div", {
        class: "notification-content",
        innerHTML: n.text
      }, null)]) : l($, null, [n.title ? l("div", {
        class: "notification-title"
      }, [n.title]) : null, l("div", {
        class: "notification-content"
      }, [n.text])])])]))) ? e : {
        default: () => [e]
      })]);
    };
  }
}), E = (t) => {
  typeof t == "string" && (t = { title: "", text: t }), typeof t == "object" && v.emit("add", t);
};
E.close = (t) => {
  v.emit("close", t);
};
const mt = () => ({ notify: E }), dt = "Notifications";
function pt(t, o = {}) {
  Object.entries(o).forEach((a) => R.set(...a));
  const i = o.name || "notify";
  t.config.globalProperties["$" + i] = E, t.component(o.componentName || dt, ft);
}
const gt = {
  install: pt
};
export {
  ft as Notifications,
  gt as default,
  E as notify,
  mt as useNotification
};
