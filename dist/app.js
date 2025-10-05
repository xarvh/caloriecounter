(function (win) {
 let __re__;


 const sp_clone = (src) => {
  if (Array.isArray(src))
    return src.map(sp_clone);

  if (typeof(src) === 'object') {
    const dest = {};
    for (let k in src) { dest[k] = sp_clone(src[k]); }
    return dest;
  }

  return src;
 }


 //
 // Basic ops
 //


 const sp_equal = (a, b) => {
   if (a === b)
     return true

   if (Array.isArray(a)) {
     if (!Array.isArray(b)) return false;

     const l = a.length;
     if (l !== b.length) return false;

     let i = 0;
     while (i < l) {
       if (!sp_equal(a[i], b[i])) return false;
       ++i;
     }

     return true;
   }

   if (typeof(a) === 'object') {
     if (typeof(b) !== 'object') return false;

     const keys = Object.keys(a);
     const l = keys.length;
     if (l !== Object.keys(b).length) return false;

     let i = 0;
     while (i < l) {
       let k = keys[i];
       if (!sp_equal(a[k], b[k])) return false;
       ++i;
     }

     return true;
   }

   return false;
 }


 const sp_not_equal = (a, b) => {
   return !sp_equal(a, b);
 }


 const basics_compare = (a, b) => {

   // union type
   if (Array.isArray(a)) {
     // compare constructor names
     if (a[0] > b[0]) return 1;
     if (b[0] > a[0]) return -1;
     for (let i = 1; i < a.length; i++) {
         const cmp = basics_compare(a[i], b[i]);
         if (cmp) return cmp;
     }
     return 0;
   }

   // None is represented as null
   if (a === null)
       return 0;

   if (typeof a === 'object') {
     const keys = Object.keys(a).sort();
     for (let k of keys) {
         const cmp = basics_compare(a[k], b[k]);
         if (cmp) return cmp;
     }
     return 0;
   }

   if (a > b) return 1;
   if (a < b) return -1;
   return 0;
 }

 const sp_divide = (left, right) => {
   if (right === 0) return 0;
   return left / right;
 }


 // TODO remove this and handle it like any other op?
 const basics_modBy = (a, b) => b % a;


 const basics_cloneImm = sp_clone;


 const basics_cloneUni = (uni) =>
     [ sp_clone(uni), uni ];


 //
 // Debug
 //


 const sp_todo = (message) => {
   throw new Error("TODO: " + message);
 }


 const sp_log = (message, thing) => {
   console.log(message, sp_toHuman(thing));
   return thing;
 }


 const sp_throw = function (errorName) {
     console.error(...arguments);
     throw new Error(errorName);
 }


 //
 // Benchmarking
 //


 var debug_benchStartTime = null;
 var debug_benchStartStack = null;
 var debug_benchEntries = {};


 const pad = (l, s) => ' '.repeat(Math.max(0, l - s.length)) + s;


 const fmt = (n) => {
     const s = Math.floor(n) + '';
     return s.slice(0, -3) + '.' + pad(3, s.slice(-3));
 }


 // TODO how should benchmark work in a browser?
 typeof process !== 'undefined' && process.on('beforeExit', (code) => {
     if (debug_benchStartStack !== null)
         console.error(`ERROR: a benchmark has been started but not stopped!
Start was at:${debug_benchStartStack}`);

     const ks = Object.keys(debug_benchEntries);
     if (ks.length) {
         console.error("");
         console.error("Benchmark results:");
         ks.sort().forEach(k => {
             const entry = debug_benchEntries[k];
             console.error(
                     'TotalTime:', pad(10, fmt(entry.dt )) + 's',
                     '   ',
                     'Runs:', pad(6, '' + entry.n),
                     '   ',
                     'Key:', k,
             );
         });
     }
 });


 const sp_benchStart = (none) => {
     if (debug_benchStartStack !== null)
         throw new Error(`
benchStart called when a benchmark is already ongoing!
Previous benchStart call was ${debug_benchStartStack}
`);

     debug_benchStartStack = new Error().stack;
     debug_benchStartTime = performance.now();
 }


 const sp_benchStop = (name) => {
     const now = performance.now();

     if (debug_benchStartStack === null)
         throw new Error("benchStop called while no benchmark is ongoing!");

     debug_benchStartStack = null;

     const dt = now - debug_benchStartTime;

     const entry = debug_benchEntries[name] || { dt: 0, n: 0 };
     entry.dt += dt;
     entry.n += 1;
     debug_benchEntries[name] = entry;
 }




 //
 // To Human
 //


 const id = (n) => '    '.repeat(n);


 const sp_toHuman = (a, l = 0) => {

   if (Array.isArray(a))
     return sp_toHumanAsList([], a, l) || sp_toHumanAsDict(a, l) || sp_toHumanAsUnion(a, l);

   if (typeof a === 'function') {
     return '<fn ' + a.length + '>';
   }

   if (typeof a === 'object') {
     let acc = '{\n';
     for (let key in a)
         acc += id(l + 1) + key + ' = ' + sp_toHuman(a[key], l + 1) + '\n';

     return acc + id(l) + '}';
   }

   return JSON.stringify(a, null, 0);
 }


 const sp_toHumanAsUnion = (a, l) => {

   if (a.length === 1) {
       return a[0];
   }

   let acc = a[0] + '\n';

   a.slice(1).forEach(arg => {

       const sub = sp_toHuman(arg, l + 1);
       if (!sub.startsWith('{') && sub.indexOf('\n') > -1)
           acc += id(l + 1) + '(' + sub + id(l + 1) + ')\n';
       else
           acc += id(l + 1) + sub + '\n';

   })

   return acc;
 }


 const sp_toHumanAsList = (arrayAccum, list, l) => {
   if (list[0] === '$Cons' && list.length === 3) {
     arrayAccum.push(sp_toHuman(list[1], l));
     return sp_toHumanAsList(arrayAccum, list[2], l);
   }

   if (list[0] === '$Nil')
     return '[' + arrayAccum.join(', ') + ']';

   return false;
 }

 const sp_toHumanAsDict = (dict, l) => {
   if (dict[0] === 'RBNode_elm_builtin') {
       return 'DICT' + sp_toHumanAsList([], $core$Dict$toList(dict), l);
   }

   return false;
 }


 //
 // Text
 //


 const text_fromNumber = (n) => '' + n;

 const text_toNumber = (t) => {
     const n = +t;

     return isNaN(n) ? c0$Maybe$Nothing : c0$Maybe$Just(n);
 }

 const text_toLower = (s) => s.toLowerCase()

 const text_toUpper = (s) => s.toUpperCase()

 const text_split = (separator, target) => arrayToListLow(target.split(separator));

 const text_length = (s) => s.length;

 const text_slice = (start, end, s) => s.slice(start, end);

 const text_startsWith = (sub, s) => s.startsWith(sub);

 const text_startsWithRegex = (regex) => {
   let re;
   try {
     re = new RegExp('^' + regex, 's');
   } catch (e) {
     return () => ""
   }

   return (s) => {
     let m = s.match(re);
     return m ? m[0] : "";
   }
 }

 const text_replaceRegex = (regex) => {
   let re;
   try {
     re = new RegExp(regex, 'g');
   } catch (e) {
     return () => ""
   }

   return (replacer, s) => s.replace(re, replacer);
 }

 const text_trimLeft = (s) => s.trimLeft();

 const text_dropLeft = (n, s) => s.slice(n);

 const text_forEach = (s, f) => {
   for (let i of s) f(i);
   return null;
 }


 //
 // Hashes
 //

 const hash_pop = (hash) => {
     for (let key in hash) {
         const [actualKey, value] = hash[key];
         delete hash[key];
         return [ c0$Maybe$Just({ first: actualKey, second: value }), hash ];
     }

     return [ c0$Maybe$Nothing, hash ];
 }


 const hash_fromList = (list) => {
   const hash = {};

   // TODO iteration instead of recursion
   const rec = (ls) => {
     if (ls[0] === '$Nil')
       return hash;

     const { first, second } = ls[1];

     hash[JSON.stringify(first)] = [first, second];

     return rec(ls[2]);
   };

   return rec(list);
 }


 const hash_insert = (hash, key, value) => {
     hash[JSON.stringify(key)] = [key, value];
     return [null, hash];
 }


 const hash_remove = (hash, key) => {
     delete hash[JSON.stringify(key)];
     return [null, hash];
 }


 const hash_get = (hash, key) => {
     const r = hash[JSON.stringify(key)];
     return [r === undefined ? c0$Maybe$Nothing : c0$Maybe$Just(r[1]), hash];
 }


 const hash_for = (hash, f, acc) => {
     for (let k in hash) {
         const kv = hash[k];
         acc = f(kv[0], kv[1], acc);
     }
     return [acc, hash];
 }


 const hash_each = (hash, f) => {
     for (let k in hash) {
         const kv = hash[k];
         f(kv[0], kv[1]);
     }
     return [null, hash];
 }


 //
 // Arrays
 //

 const array_each = (array, f) => {
     array.forEach(f);
     return [null, array];
 }

 const array_push = (array, item) => {
     array.push(item);
     return [null, array];
 }

 const array_pop = (a) => {
     return [a.length ? c0$Maybe$Just(a.pop()) : c0$Maybe$Nothing, a];
 }

 const array_get = (array, index) => {
     const r = array[index];
     return [r === undefined ? c0$Maybe$Nothing : c0$Maybe$Just(r), array];
 }

 const array_set = (a, index, item) => {
     if (index < 0) return false;
     if (index >= a.length) return [false, a];
     a[index] = item;
     return [true, a];
 }

 const array_sortBy = (arr, f) => {
     arr.sort((a, b) => basics_compare(f(a), f(b)));
     return [null, arr];
 }

 const arrayToListLow = (arr) => {
   const length = arr.length;
   let list = [ '$Nil' ];
   for (let i = length - 1; i >= 0; i--) {
       list = [ '$Cons', arr[i], list ];
   }
   return list;
 }

 const array_toList = (arr) => [arrayToListLow(arr), arr];


 const arrayFromListLow = (list) => {
   const array = [];
   const rec = (ls) => {
     if (ls[0] === '$Nil')
       return array;

     array.push(ls[1]);
     return rec(ls[2]);
   };

   return rec(list);
 }

 const array_fromList = arrayFromListLow;


 //
 // Lists
 //

 const sp_cons = (item, list) => {
   return [ '$Cons', item, list];
 }

 const list_sortBy = (f, list) => arrayToListLow(arrayFromListLow(list).sort((a, b) => basics_compare(f(a), f(b))));


 //
 // Dynamic loading
 //
 const self_load = (requestedTypeHumanized, entryModule, entryValue, variantConstructor, build) => {

     const load = (arg, body) =>
        variantConstructor(Function('externs', body)(arg));

     return p({
         build,
         requestedTypeHumanized,
         entryModule,
         entryValue,
         load,
     });
};
const crawlObject = (path, type, object) => {

    while(path[0] === '$Cons') {

        const head = path[1];
        const tail = path[2];

        const o = object[head];

        if (o === undefined) {
            return [ '$Err', 'no field named: ' + head ];
        }

        object = o;
        path = path[2];
    }

    return typeof object === type
        ? [ '$Ok', object ]
        : [ '$Err', 'wrong type: ' + typeof object ]
        ;
}


const virtualDom_eventToText = (path, event) => crawlObject(path, 'string', event);
const virtualDom_eventToFloat = (path, event) => crawlObject(path, 'number', event);

// TODO ensure that those who must return None actually return None (ie, null)
const virtualDom_jsCreateTextNode = (content) => document.createTextNode(content);
const virtualDom_jsCreateElement = (tag) => document.createElement(tag);
const virtualDom_jsReplaceWith = (new_, old) => { old.replaceWith(new_); return new_; }
const virtualDom_jsAppendChild = (pars) => pars.parent.appendChild(pars.child);
const virtualDom_jsSetAttribute = (name, value, node) => node.setAttribute(name, value);
const virtualDom_jsRemoveAttribute = (name, node) => node.removeAttribute(name);
const virtualDom_jsSetProperty = (name, value, node) => node[name] = value;


const virtualDom_setChild = (upd, index, parentNode) => {
    const child = parentNode.childNodes[index];
    child && upd(child);
};


const virtualDom_removeAllChildrenStartingFromIndex = (index, parentNode) => {
    while(parentNode.childNodes[index]) {
      parentNode.removeChild(parentNode.childNodes[index]);
    }
}


// an EventHandler is a function that takes an Event and produces a msg
const virtualDom_jsAddEventListener = (eventName, handler, node) => {

    node.squarepantsEventHandlers = node.squarepantsEventHandlers || {};

    if (node.squarepantsEventHandlers[eventName]) {
      node.removeEventListener(eventName, node.squarepantsEventHandlers[eventName]);
    }

    const onEvent = (event) => dispatch(handler(event));
    node.squarepantsEventHandlers[eventName] = onEvent;
    node.addEventListener(eventName, onEvent);
};

const virtualDom_jsRemoveEventListener = (eventName, handler, node) => {
    node.removeEventListener(eventName, node.squarepantsEventHandlers[eventName]);
    node.squarepantsEventHandlers[eventName] = undefined;
}

const virtualDom_setLocalStorage = (effects, key, value) => {
    effects.push(() => {
        window.localStorage[key] = value;
    });
    return [ null, effects ];
}

const virtualDom_getLocalStorage = (effects, key, msgConstructor) => {
    effects.push(() => {
        dispatch(['$Ok', msgConstructor(window.localStorage[key] || "")]);
    });
    return [ null, effects ];
}

const virtualDom_setViewportOf = (effects, id, top, left) => {
    effects.push(() => {
        const e = document.getElementById(id);
        if (!e) {
            console.error('could not find element #' + id);
            return
        }

        e.scrollTop = top;
        e.scrollLeft = left;
    });
    return [ null, effects ];
}

const virtualDom_focus = (effects, selector) => {
    effects.push(() => {
        document.body.querySelector(selector)?.focus();
    });
    return [ null, effects ];
}

const virtualDom_upstream = (effects, msg) => {
    effects.push(() => {
        dispatch(['$Ok', msg ]);
    });
    return [ null, effects ];
}

const virtualDom_drawCanvas = (effects, canvasId, shaderFn) => {
    effects.push(() => {

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('could not find canvas', canvasId);
            return
        }

        const w = canvas.width;
        const h = canvas.height;

        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(w, h);

        for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {

            const frag = shaderFn(x / (w - 1), 1 - y / (h - 1));

            let j = (x + y * w) * 4;
            imageData.data[j + 0] = frag.r * 255;
            imageData.data[j + 1] = frag.g * 255;
            imageData.data[j + 2] = frag.b * 255;
            imageData.data[j + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
    });
    return [ null, effects ];
}
const c0$Core$Cons = (($1, $2) => ([
  "$Cons",
  $1,
  $2,
]));

const c0$Core$False = ([
  "$False",
]);

const c0$Core$Nil = ([
  "$Nil",
]);

const c0$Core$None = ([
  "$None",
]);

const c0$Core$True = ([
  "$True",
]);

const c0$Maybe$Just = (($1) => ([
  "$Just",
  $1,
]));

const c0$Maybe$Nothing = ([
  "$Nothing",
]);

const c0$Result$Err = (($1) => ([
  "$Err",
  $1,
]));

const c0$Result$Ok = (($1) => ([
  "$Ok",
  $1,
]));

const i1$VirtualDom$CssClass = (($1) => ([
  "$CssClass",
  $1,
]));

const i1$VirtualDom$CssStyle = (($1, $2) => ([
  "$CssStyle",
  $1,
  $2,
]));

const i1$VirtualDom$DomAttribute = (($1, $2) => ([
  "$DomAttribute",
  $1,
  $2,
]));

const i1$VirtualDom$DomProperty = (($1, $2) => ([
  "$DomProperty",
  $1,
  $2,
]));

const i1$VirtualDom$ElementNode = (($1, $2, $3) => ([
  "$ElementNode",
  $1,
  $2,
  $3,
]));

const i1$VirtualDom$Listener = (($1, $2) => ([
  "$Listener",
  $1,
  $2,
]));

const i1$VirtualDom$TextNode = (($1) => ([
  "$TextNode",
  $1,
]));

const i1$VirtualDom$Void = ([
  "$Void",
]);

const u0$App$OnClickOpenPicker = ([
  "$OnClickOpenPicker",
]);

const u0$App$OnCreateNewFood = (($1) => ([
  "$OnCreateNewFood",
  $1,
]));

const u0$App$OnEditDelete = (($1) => ([
  "$OnEditDelete",
  $1,
]));

const u0$App$OnEditFood = (($1) => ([
  "$OnEditFood",
  $1,
]));

const u0$App$OnEditFoodMsg = (($1) => ([
  "$OnEditFoodMsg",
  $1,
]));

const u0$App$OnEditSave = (($1, $2) => ([
  "$OnEditSave",
  $1,
  $2,
]));

const u0$App$OnEditUse = (($1) => ([
  "$OnEditUse",
  $1,
]));

const u0$App$OnPickerCancel = ([
  "$OnPickerCancel",
]);

const u0$App$OnPickerMsg = (($1) => ([
  "$OnPickerMsg",
  $1,
]));

const u0$App$OnTotalsMsg = (($1) => ([
  "$OnTotalsMsg",
  $1,
]));

const u0$App$PageEditFood = (($1) => ([
  "$PageEditFood",
  $1,
]));

const u0$App$PagePicker = (($1) => ([
  "$PagePicker",
  $1,
]));

const u0$App$PageTotals = (($1) => ([
  "$PageTotals",
  $1,
]));

const u0$EditFood$OnClickBack = ([
  "$OnClickBack",
]);

const u0$EditFood$OnClickDelete = (($1) => ([
  "$OnClickDelete",
  $1,
]));

const u0$EditFood$OnClickSave = ([
  "$OnClickSave",
]);

const u0$EditFood$OnClickUse = ([
  "$OnClickUse",
]);

const u0$EditFood$OnConfirmDeletion = (($1) => ([
  "$OnConfirmDeletion",
  $1,
]));

const u0$EditFood$OnKCalInput = (($1) => ([
  "$OnKCalInput",
  $1,
]));

const u0$EditFood$OnNameInput = (($1) => ([
  "$OnNameInput",
  $1,
]));

const u0$EditFood$OnProInput = (($1) => ([
  "$OnProInput",
  $1,
]));

const u0$EditFood$OnQtyInput = (($1) => ([
  "$OnQtyInput",
  $1,
]));

const u0$Picker$OnSearchInput = (($1) => ([
  "$OnSearchInput",
  $1,
]));

const u0$Totals$ExpansionItem = (($1) => ([
  "$ExpansionItem",
  $1,
]));

const u0$Totals$ExpansionNone = ([
  "$ExpansionNone",
]);

const u0$Totals$ExpansionTargets = ([
  "$ExpansionTargets",
]);

const u0$Totals$OnDeleteAll = ([
  "$OnDeleteAll",
]);

const u0$Totals$OnDeleteAllMode = (($1) => ([
  "$OnDeleteAllMode",
  $1,
]));

const u0$Totals$OnGetTargetResponse = (($1, $2) => ([
  "$OnGetTargetResponse",
  $1,
  $2,
]));

const u0$Totals$OnQuantityInput = (($1, $2) => ([
  "$OnQuantityInput",
  $1,
  $2,
]));

const u0$Totals$OnRemove = (($1) => ([
  "$OnRemove",
  $1,
]));

const u0$Totals$OnToggleExpansion = (($1) => ([
  "$OnToggleExpansion",
  $1,
]));

const u0$Totals$OnUserSetsTarget = (($1, $2) => ([
  "$OnUserSetsTarget",
  $1,
  $2,
]));

const c0$Basics$max = (($a, $b) => {
  return (($a > $b)
    ? $a
    : $b);
});

const c0$Basics$not = (($b) => {
  return ($b
    ? false
    : true);
});

const c0$List$for = (($init, $aList, $function) => {
  return ((($aList)[0] === "$Nil")
    ? $init
    : ((($aList)[0] === "$Cons")
      ? ((() => {
        const $h = ($aList)[1];
        const $tail = ($aList)[2];
        return (c0$List$for)(($function)($init, $h), $tail, $function);
      }))()
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 75:4', (sp_toHuman)($aList))));
});

const c0$List$reverse = (($aList) => {
  return (c0$List$for)(c0$Core$Nil, $aList, (($a, $b) => {
    return (c0$Core$Cons)($b, $a);
  }));
});

const c0$List$forReversed = (($init, $list, $f) => {
  const $foldrHelper = (($acc, $ctr, $ls) => {
    return ((($ls)[0] === "$Nil")
      ? $acc
      : ((($ls)[0] === "$Cons")
        ? ((() => {
          const $a = ($ls)[1];
          const $r1 = ($ls)[2];
          return ((($r1)[0] === "$Nil")
            ? ($f)($acc, $a)
            : ((($r1)[0] === "$Cons")
              ? ((() => {
                const $b = ($r1)[1];
                const $r2 = ($r1)[2];
                return ((($r2)[0] === "$Nil")
                  ? ($f)(($f)($acc, $b), $a)
                  : ((($r2)[0] === "$Cons")
                    ? ((() => {
                      const $c = ($r2)[1];
                      const $r3 = ($r2)[2];
                      return ((($r3)[0] === "$Nil")
                        ? ($f)(($f)(($f)($acc, $c), $b), $a)
                        : ((($r3)[0] === "$Cons")
                          ? ((() => {
                            const $d = ($r3)[1];
                            const $r4 = ($r3)[2];
                            const $res = (($ctr > 500)
                              ? (c0$List$for)($acc, (c0$List$reverse)($r4), $f)
                              : ($foldrHelper)($acc, ($ctr + 1), $r4));
                            return ($f)(($f)(($f)(($f)($res, $d), $c), $b), $a);
                          }))()
                          : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 120:32', (sp_toHuman)($r3))));
                    }))()
                    : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 114:24', (sp_toHuman)($r2))));
              }))()
              : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 108:16', (sp_toHuman)($r1))));
        }))()
        : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 102:8', (sp_toHuman)($ls))));
  });
  return ($foldrHelper)($init, 0, $list);
});

const c0$List$append = (($ys, $xs) => {
  return ((($ys)[0] === "$Nil")
    ? $xs
    : (true
      ? (c0$List$forReversed)($ys, $xs, (($a, $b) => {
        return (c0$Core$Cons)($b, $a);
      }))
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 217:4', (sp_toHuman)($ys))));
});

const c0$List$concat = (($lists) => {
  return (c0$List$forReversed)(c0$Core$Nil, $lists, c0$List$append);
});

const c0$List$drop = (($n, $ls) => {
  return ((sp_equal)($n, 0)
    ? $ls
    : ((($ls)[0] === "$Nil")
      ? c0$Core$Nil
      : ((($ls)[0] === "$Cons")
        ? ((() => {
          const $h = ($ls)[1];
          const $tail = ($ls)[2];
          return (c0$List$drop)(($n - 1), $tail);
        }))()
        : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 408:8', (sp_toHuman)($ls)))));
});

const c0$List$each = (($ls, $f) => {
  return ((($ls)[0] === "$Nil")
    ? null
    : ((($ls)[0] === "$Cons")
      ? ((() => {
        const $h = ($ls)[1];
        const $tail = ($ls)[2];
        ($f)($h);
        return (c0$List$each)($tail, $f);
      }))()
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 362:4', (sp_toHuman)($ls))));
});

const c0$List$filter = (($ls, $f) => {
  return (c0$List$forReversed)(c0$Core$Nil, $ls, (($acc, $item) => {
    return (($f)($item)
      ? (sp_cons)($item, $acc)
      : $acc);
  }));
});

const c0$List$find = (($list, $test) => {
  return ((($list)[0] === "$Nil")
    ? c0$Maybe$Nothing
    : ((($list)[0] === "$Cons")
      ? ((() => {
        const $h = ($list)[1];
        const $t = ($list)[2];
        return (($test)($h)
          ? (c0$Maybe$Just)($h)
          : (c0$List$find)($t, $test));
      }))()
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 24:4', (sp_toHuman)($list))));
});

const c0$List$map = (($list, $f) => {
  return (c0$List$forReversed)(c0$Core$Nil, $list, (($acc, $x) => {
    return (sp_cons)(($f)($x), $acc);
  }));
});

const c0$List$mapWithIndex = (($aa, $f) => {
  const $rec = (($accum, $n, $list) => {
    return ((($list)[0] === "$Nil")
      ? (c0$List$reverse)($accum)
      : ((($list)[0] === "$Cons")
        ? ((() => {
          const $h = ($list)[1];
          const $t = ($list)[2];
          return ($rec)((sp_cons)(($f)($n, $h), $accum), ($n + 1), $t);
        }))()
        : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 197:8', (sp_toHuman)($list))));
  });
  return ($rec)(c0$Core$Nil, 0, $aa);
});

const c0$List$maximum = (($list) => {
  return ((($list)[0] === "$Cons")
    ? ((() => {
      const $x = ($list)[1];
      const $xs = ($list)[2];
      return (c0$Maybe$Just)((c0$List$for)($x, $xs, c0$Basics$max));
    }))()
    : (true
      ? c0$Maybe$Nothing
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 422:4', (sp_toHuman)($list))));
});

const c0$List$takeReverse = (($n, $list, $kept) => {
  return (($n < 1)
    ? $kept
    : ((($list)[0] === "$Nil")
      ? $kept
      : ((($list)[0] === "$Cons")
        ? ((() => {
          const $x = ($list)[1];
          const $xs = ($list)[2];
          return (c0$List$takeReverse)(($n - 1), $xs, (c0$Core$Cons)($x, $kept));
        }))()
        : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 305:8', (sp_toHuman)($list)))));
});

const c0$List$takeTailRec = (($n, $list) => {
  return (c0$List$reverse)((c0$List$takeReverse)($n, $list, c0$Core$Nil));
});

const c0$List$takeFast = (($ctr, $n, $list) => {
  return (($n < 1)
    ? c0$Core$Nil
    : ((() => {
      const $4 = ({
        first: $n,
        second: $list,
      });
      return ((($4.second)[0] === "$Nil")
        ? $list
        : (((1 === $4.first) && (($4.second)[0] === "$Cons"))
          ? ((() => {
            const $x = ($4.second)[1];
            return (c0$Core$Cons)($x, c0$Core$Nil);
          }))()
          : (((2 === $4.first) && ((($4.second)[0] === "$Cons") && ((($4.second)[2])[0] === "$Cons")))
            ? ((() => {
              const $x = ($4.second)[1];
              const $y = (($4.second)[2])[1];
              return (c0$Core$Cons)($x, (c0$Core$Cons)($y, c0$Core$Nil));
            }))()
            : (((3 === $4.first) && ((($4.second)[0] === "$Cons") && (((($4.second)[2])[0] === "$Cons") && (((($4.second)[2])[2])[0] === "$Cons"))))
              ? ((() => {
                const $x = ($4.second)[1];
                const $y = (($4.second)[2])[1];
                const $z = ((($4.second)[2])[2])[1];
                return (c0$Core$Cons)($x, (c0$Core$Cons)($y, (c0$Core$Cons)($z, c0$Core$Nil)));
              }))()
              : (((($4.second)[0] === "$Cons") && (((($4.second)[2])[0] === "$Cons") && ((((($4.second)[2])[2])[0] === "$Cons") && ((((($4.second)[2])[2])[2])[0] === "$Cons"))))
                ? ((() => {
                  const $x = ($4.second)[1];
                  const $y = (($4.second)[2])[1];
                  const $z = ((($4.second)[2])[2])[1];
                  const $w = (((($4.second)[2])[2])[2])[1];
                  const $tl = (((($4.second)[2])[2])[2])[2];
                  const $cons = c0$Core$Cons;
                  return (($ctr > 1000)
                    ? ($cons)($x, ($cons)($y, ($cons)($z, ($cons)($w, (c0$List$takeTailRec)(($n - 4), $tl)))))
                    : ($cons)($x, ($cons)($y, ($cons)($z, ($cons)($w, (c0$List$takeFast)(($ctr + 1), ($n - 4), $tl))))));
                }))()
                : (true
                  ? $list
                  : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/List.sp 268:8', (sp_toHuman)($4))))))));
    }))());
});

const c0$List$take = (($0, $1) => {
  return (c0$List$takeFast)(0, $0, $1);
});

const c0$List$update = (($xs, $test, $upd) => {
  return (c0$List$map)($xs, (($item) => {
    return (($test)($item)
      ? ($upd)($item)
      : $item);
  }));
});

const c0$Maybe$withDefault = (($maybe, $default) => {
  return ((($maybe)[0] === "$Just")
    ? ((() => {
      const $v = ($maybe)[1];
      return $v;
    }))()
    : ((($maybe)[0] === "$Nothing")
      ? $default
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/Maybe.sp 30:4', (sp_toHuman)($maybe))));
});

const c0$Result$isErr = (($0) => {
  return ((($0)[0] === "$Err")
    ? true
    : ((($0)[0] === "$Ok")
      ? false
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/Result.sp 36:4', (sp_toHuman)($0))));
});

const c0$Result$map = (($result, $f) => {
  return ((($result)[0] === "$Err")
    ? ((() => {
      const $e = ($result)[1];
      return (c0$Result$Err)($e);
    }))()
    : ((($result)[0] === "$Ok")
      ? ((() => {
        const $a = ($result)[1];
        return (c0$Result$Ok)(($f)($a));
      }))()
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/Result.sp 8:4', (sp_toHuman)($result))));
});

const c0$Result$onOk = (($f) => {
  return (($result) => {
    return ((($result)[0] === "$Err")
      ? ((() => {
        const $e = ($result)[1];
        return (c0$Result$Err)($e);
      }))()
      : ((($result)[0] === "$Ok")
        ? ((() => {
          const $a = ($result)[1];
          return ($f)($a);
        }))()
        : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/Result.sp 16:4', (sp_toHuman)($result))));
  });
});

const c0$Text$contains = (($sub, $str) => {
  const $3 = (text_split)($sub, $str);
  return (((($3)[0] === "$Cons") && ((($3)[2])[0] === "$Nil"))
    ? false
    : (true
      ? true
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/Text.sp 120:4', (sp_toHuman)($3))));
});

const c0$Text$join = (($sep, $listOfText) => {
  return ((($listOfText)[0] === "$Nil")
    ? ""
    : ((($listOfText)[0] === "$Cons")
      ? ((() => {
        const $head = ($listOfText)[1];
        const $tail = ($listOfText)[2];
        const $rec = (($ls, $acc) => {
          return ((($ls)[0] === "$Nil")
            ? $acc
            : ((($ls)[0] === "$Cons")
              ? ((() => {
                const $h = ($ls)[1];
                const $t = ($ls)[2];
                return ($rec)($t, (($acc + $sep) + $h));
              }))()
              : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/Text.sp 139:16', (sp_toHuman)($ls))));
        });
        return ($rec)($tail, $head);
      }))()
      : (sp_throw)('Missing pattern in try..as', '/home/fra/.usr/bin/corelib/src/Text.sp 131:4', (sp_toHuman)($listOfText))));
});

const i1$Html$button = (($0, $1) => {
  return (i1$VirtualDom$ElementNode)("button", $0, $1);
});

const i1$Html$class = (($0) => {
  return (i1$VirtualDom$CssClass)($0);
});

const i1$Html$classIf = (($p, $content) => {
  return ($p
    ? (i1$Html$class)($content)
    : i1$VirtualDom$Void);
});

const i1$Html$div = (($0, $1) => {
  return (i1$VirtualDom$ElementNode)("div", $0, $1);
});

const i1$Html$h1 = (($0, $1) => {
  return (i1$VirtualDom$ElementNode)("h1", $0, $1);
});

const i1$Html$id = (($0) => {
  return (i1$VirtualDom$DomAttribute)("id", $0);
});

const i1$Html$img = (($0) => {
  return (i1$VirtualDom$ElementNode)("img", $0, c0$Core$Nil);
});

const i1$Html$input = (($0) => {
  return (i1$VirtualDom$ElementNode)("input", $0, c0$Core$Nil);
});

const i1$Html$none = (i1$VirtualDom$TextNode)("");

const i1$Html$on = (($0, $1) => {
  return (i1$VirtualDom$Listener)($0, $1);
});

const i1$Html$onClick = (($msg) => {
  return (i1$Html$on)("click", (($event) => {
    return (c0$Result$Ok)($msg);
  }));
});

const i1$Html$onInput = (($textToMsg) => {
  return (i1$Html$on)("input", (($e) => {
    return (c0$Result$map)((virtualDom_eventToText)((c0$Core$Cons)("target", (c0$Core$Cons)("value", c0$Core$Nil)), $e), $textToMsg);
  }));
});

const i1$Html$span = (($0, $1) => {
  return (i1$VirtualDom$ElementNode)("span", $0, $1);
});

const i1$Html$src = (($0) => {
  return (i1$VirtualDom$DomAttribute)("src", $0);
});

const i1$Html$style = (($0, $1) => {
  return (i1$VirtualDom$CssStyle)($0, $1);
});

const i1$Html$text = (($0) => {
  return (i1$VirtualDom$TextNode)($0);
});

const i1$Html$value = (($0) => {
  return (i1$VirtualDom$DomProperty)("value", $0);
});

const i1$Html$viewIf = (($p, $view) => {
  return ($p
    ? ($view)(null)
    : i1$Html$none);
});

const i1$Html$viewMaybe = (($m, $view) => {
  return ((($m)[0] === "$Just")
    ? ((() => {
      const $a = ($m)[1];
      return ($view)($a);
    }))()
    : ((($m)[0] === "$Nothing")
      ? i1$Html$none
      : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/Html.sp 20:4', (sp_toHuman)($m))));
});

const i1$VirtualDom$updateDomAttrs = (($new, $old, $domNode) => {
  let $oldClass = "";
  let $oldStyle = "";
  let $oldDomAttrs = (hash_fromList)(c0$Core$Nil);
  (c0$List$each)($old, (($a) => {
    return ((($a)[0] === "$CssClass")
      ? ((() => {
        const $value = ($a)[1];
        return ($oldClass = ((((__re__ = (basics_cloneUni)($oldClass)), ($oldClass = (__re__)[1]), (__re__)[0]) + " ") + $value));
      }))()
      : ((($a)[0] === "$CssStyle")
        ? ((() => {
          const $key = ($a)[1];
          const $value = ($a)[2];
          return ($oldStyle = ((((((__re__ = (basics_cloneUni)($oldStyle)), ($oldStyle = (__re__)[1]), (__re__)[0]) + $key) + ": ") + $value) + "; "));
        }))()
        : ((($a)[0] === "$DomAttribute")
          ? ((() => {
            const $name = ($a)[1];
            const $value = ($a)[2];
            return ((__re__ = (hash_insert)($oldDomAttrs, $name, $value)), ($oldDomAttrs = (__re__)[1]), (__re__)[0]);
          }))()
          : ((($a)[0] === "$DomProperty")
            ? ((() => {
              const $name = ($a)[1];
              const $value = ($a)[2];
              return null;
            }))()
            : ((($a)[0] === "$Listener")
              ? ((() => {
                const $eventName = ($a)[1];
                const $eventHandler = ($a)[2];
                return (virtualDom_jsRemoveEventListener)($eventName, $eventHandler, $domNode);
              }))()
              : ((($a)[0] === "$Void")
                ? null
                : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/VirtualDom.sp 166:8', (sp_toHuman)($a))))))));
  }));
  ((sp_not_equal)(((__re__ = (basics_cloneUni)($oldClass)), ($oldClass = (__re__)[1]), (__re__)[0]), "")
    ? ((__re__ = (hash_insert)($oldDomAttrs, "class", ((__re__ = (basics_cloneUni)($oldClass)), ($oldClass = (__re__)[1]), (__re__)[0]))), ($oldDomAttrs = (__re__)[1]), (__re__)[0])
    : null);
  ((sp_not_equal)(((__re__ = (basics_cloneUni)($oldStyle)), ($oldStyle = (__re__)[1]), (__re__)[0]), "")
    ? ((__re__ = (hash_insert)($oldDomAttrs, "style", ((__re__ = (basics_cloneUni)($oldStyle)), ($oldStyle = (__re__)[1]), (__re__)[0]))), ($oldDomAttrs = (__re__)[1]), (__re__)[0])
    : null);
  let $newClass = "";
  let $newStyle = "";
  let $newDomAttrs = (hash_fromList)(c0$Core$Nil);
  (c0$List$each)($new, (($a) => {
    return ((($a)[0] === "$CssClass")
      ? ((() => {
        const $value = ($a)[1];
        return ($newClass = ((((__re__ = (basics_cloneUni)($newClass)), ($newClass = (__re__)[1]), (__re__)[0]) + " ") + $value));
      }))()
      : ((($a)[0] === "$CssStyle")
        ? ((() => {
          const $key = ($a)[1];
          const $value = ($a)[2];
          return ($newStyle = ((((((__re__ = (basics_cloneUni)($newStyle)), ($newStyle = (__re__)[1]), (__re__)[0]) + $key) + ": ") + $value) + "; "));
        }))()
        : ((($a)[0] === "$Listener")
          ? ((() => {
            const $eventName = ($a)[1];
            const $eventHandler = ($a)[2];
            return (virtualDom_jsAddEventListener)($eventName, $eventHandler, $domNode);
          }))()
          : ((($a)[0] === "$DomAttribute")
            ? ((() => {
              const $name = ($a)[1];
              const $value = ($a)[2];
              return ((__re__ = (hash_insert)($newDomAttrs, $name, $value)), ($newDomAttrs = (__re__)[1]), (__re__)[0]);
            }))()
            : ((($a)[0] === "$DomProperty")
              ? ((() => {
                const $name = ($a)[1];
                const $value = ($a)[2];
                return (virtualDom_jsSetProperty)($name, $value, $domNode);
              }))()
              : ((($a)[0] === "$Void")
                ? null
                : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/VirtualDom.sp 194:8', (sp_toHuman)($a))))))));
  }));
  ((sp_not_equal)(((__re__ = (basics_cloneUni)($newClass)), ($newClass = (__re__)[1]), (__re__)[0]), "")
    ? ((__re__ = (hash_insert)($newDomAttrs, "class", ((__re__ = (basics_cloneUni)($newClass)), ($newClass = (__re__)[1]), (__re__)[0]))), ($newDomAttrs = (__re__)[1]), (__re__)[0])
    : null);
  ((sp_not_equal)(((__re__ = (basics_cloneUni)($newStyle)), ($newStyle = (__re__)[1]), (__re__)[0]), "")
    ? ((__re__ = (hash_insert)($newDomAttrs, "style", ((__re__ = (basics_cloneUni)($newStyle)), ($newStyle = (__re__)[1]), (__re__)[0]))), ($newDomAttrs = (__re__)[1]), (__re__)[0])
    : null);
  ((__re__ = (hash_each)($newDomAttrs, (($newName, $newValue) => {
    const $6 = ((__re__ = (hash_get)($oldDomAttrs, $newName)), ($oldDomAttrs = (__re__)[1]), (__re__)[0]);
    return ((($6)[0] === "$Nothing")
      ? (virtualDom_jsSetAttribute)($newName, $newValue, $domNode)
      : ((($6)[0] === "$Just")
        ? ((() => {
          const $oldValue = ($6)[1];
          ((__re__ = (hash_remove)($oldDomAttrs, $newName)), ($oldDomAttrs = (__re__)[1]), (__re__)[0]);
          return ((sp_not_equal)($oldValue, $newValue)
            ? (virtualDom_jsSetAttribute)($newName, $newValue, $domNode)
            : null);
        }))()
        : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/VirtualDom.sp 213:8', (sp_toHuman)($6))));
  }))), ($newDomAttrs = (__re__)[1]), (__re__)[0]);
  return ((__re__ = (hash_each)($oldDomAttrs, (($oldName, $oldValue) => {
    const $6 = ((__re__ = (hash_get)($newDomAttrs, $oldName)), ($newDomAttrs = (__re__)[1]), (__re__)[0]);
    return ((($6)[0] === "$Nothing")
      ? (virtualDom_jsRemoveAttribute)($oldName, $domNode)
      : ((($6)[0] === "$Just")
        ? ((() => {
          const $newValue = ($6)[1];
          return null;
        }))()
        : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/VirtualDom.sp 227:8', (sp_toHuman)($6))));
  }))), ($oldDomAttrs = (__re__)[1]), (__re__)[0]);
});

const i1$VirtualDom$renderElementNode = (($tagName, $attrs, $children) => {
  const $domNode = (virtualDom_jsCreateElement)($tagName);
  (i1$VirtualDom$updateDomAttrs)($attrs, c0$Core$Nil, $domNode);
  (c0$List$each)($children, (($child) => {
    return (virtualDom_jsAppendChild)(({
      child: (i1$VirtualDom$render)($child),
      parent: $domNode,
    }));
  }));
  return $domNode;
});

const i1$VirtualDom$render = (($vnode) => {
  return ((($vnode)[0] === "$ElementNode")
    ? ((() => {
      const $tagName = ($vnode)[1];
      const $attrs = ($vnode)[2];
      const $children = ($vnode)[3];
      return (i1$VirtualDom$renderElementNode)($tagName, $attrs, $children);
    }))()
    : ((($vnode)[0] === "$TextNode")
      ? ((() => {
        const $content = ($vnode)[1];
        return (virtualDom_jsCreateTextNode)($content);
      }))()
      : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/VirtualDom.sp 234:4', (sp_toHuman)($vnode))));
});

const i1$VirtualDom$updateDomNode = (($new, $old, $domNode) => {
  const $4 = ({
    first: $new,
    second: $old,
  });
  return (((($4.first)[0] === "$ElementNode") && (($4.second)[0] === "$ElementNode"))
    ? ((() => {
      const $nTag = ($4.first)[1];
      const $nAttr = ($4.first)[2];
      const $nChildren = ($4.first)[3];
      const $oTag = ($4.second)[1];
      const $oAttr = ($4.second)[2];
      const $oChildren = ($4.second)[3];
      return ((sp_not_equal)($nTag, $oTag)
        ? (virtualDom_jsReplaceWith)((i1$VirtualDom$renderElementNode)($nTag, $nAttr, $nChildren), $domNode)
        : ((() => {
          (i1$VirtualDom$updateDomAttrs)($nAttr, $oAttr, $domNode);
          (i1$VirtualDom$updateDomChildren)($nChildren, $oChildren, 0, $domNode);
          return $domNode;
        }))());
    }))()
    : (((($4.first)[0] === "$TextNode") && (($4.second)[0] === "$TextNode"))
      ? ((() => {
        const $n = ($4.first)[1];
        const $o = ($4.second)[1];
        return ((sp_equal)($n, $o)
          ? $domNode
          : (virtualDom_jsReplaceWith)((virtualDom_jsCreateTextNode)($n), $domNode));
      }))()
      : (true
        ? (virtualDom_jsReplaceWith)((i1$VirtualDom$render)($new), $domNode)
        : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/VirtualDom.sp 254:4', (sp_toHuman)($4)))));
});

const i1$VirtualDom$updateDomChildren = (($new, $old, $index, $parentNode) => {
  const $5 = ({
    first: $new,
    second: $old,
  });
  return (((($5.first)[0] === "$Cons") && (($5.second)[0] === "$Cons"))
    ? ((() => {
      const $n = ($5.first)[1];
      const $ns = ($5.first)[2];
      const $o = ($5.second)[1];
      const $os = ($5.second)[2];
      (virtualDom_setChild)((($0) => {
        return (i1$VirtualDom$updateDomNode)($n, $o, $0);
      }), $index, $parentNode);
      return (i1$VirtualDom$updateDomChildren)($ns, $os, ($index + 1), $parentNode);
    }))()
    : (((($5.first)[0] === "$Cons") && (($5.second)[0] === "$Nil"))
      ? ((() => {
        const $n = ($5.first)[1];
        const $ns = ($5.first)[2];
        return (c0$List$each)($new, (($child) => {
          return (virtualDom_jsAppendChild)(({
            child: (i1$VirtualDom$render)($child),
            parent: $parentNode,
          }));
        }));
      }))()
      : (((($5.first)[0] === "$Nil") && (($5.second)[0] === "$Cons"))
        ? ((() => {
          const $o = ($5.second)[1];
          const $os = ($5.second)[2];
          return (virtualDom_removeAllChildrenStartingFromIndex)($index, $parentNode);
        }))()
        : (((($5.first)[0] === "$Nil") && (($5.second)[0] === "$Nil"))
          ? null
          : (sp_throw)('Missing pattern in try..as', 'installedLibraries/browser/VirtualDom.sp 278:4', (sp_toHuman)($5))))));
});

const u0$Food$defaults = ((() => {
  const $f = (($id, $defaultQuantity, $name, $kCalPercent, $proteinPercent) => {
    return ({
      defaultQuantity: $defaultQuantity,
      id: $id,
      kCalPercent: $kCalPercent,
      name: $name,
      proteinPercent: $proteinPercent,
      timesUsed: 0,
    });
  });
  return (c0$Core$Cons)(($f)(0, 75, "Apple", 100, 1), (c0$Core$Cons)(($f)(1, 100, "Banana", 100, 0), (c0$Core$Cons)(($f)(2, 100, "Kvarg", 67, 9.5), (c0$Core$Cons)(($f)(3, 100, "Pumpkin Seed", 590, 30), c0$Core$Nil))));
}))();

const u0$Food$textToFoods = (($0) => {
  return (c0$List$mapWithIndex)((text_split)("\n", $0), (($id, $foodAsText) => {
    const $4 = (text_split)("\t", $foodAsText);
    return (((($4)[0] === "$Cons") && (((($4)[2])[0] === "$Cons") && ((((($4)[2])[2])[0] === "$Cons") && (((((($4)[2])[2])[2])[0] === "$Cons") && ((((((($4)[2])[2])[2])[2])[0] === "$Cons") && ((((((($4)[2])[2])[2])[2])[2])[0] === "$Nil"))))))
      ? ((() => {
        const $name = ($4)[1];
        const $default = (($4)[2])[1];
        const $kcal = ((($4)[2])[2])[1];
        const $pro = (((($4)[2])[2])[2])[1];
        const $times = ((((($4)[2])[2])[2])[2])[1];
        const $defaultQuantity = (c0$Maybe$withDefault)((text_toNumber)($default), 1);
        const $kCalPercent = (c0$Maybe$withDefault)((text_toNumber)($kcal), 1);
        const $proteinPercent = (c0$Maybe$withDefault)((text_toNumber)($pro), 0);
        const $timesUsed = (c0$Maybe$withDefault)((text_toNumber)($times), 0);
        return ({
          defaultQuantity: $defaultQuantity,
          id: $id,
          kCalPercent: $kCalPercent,
          name: $name,
          proteinPercent: $proteinPercent,
          timesUsed: $timesUsed,
        });
      }))()
      : (true
        ? ({
          defaultQuantity: 0,
          id: $id,
          kCalPercent: 0,
          name: "",
          proteinPercent: 0,
          timesUsed: 0,
        })
        : (sp_throw)('Missing pattern in try..as', 'src/Food.sp 16:8', (sp_toHuman)($4))));
  }));
});

const u0$Item$textToItems = (($0) => {
  return (c0$List$map)((text_split)("\n", $0), (($itemAsText) => {
    const $3 = (text_split)("\t", $itemAsText);
    return (((($3)[0] === "$Cons") && (((($3)[2])[0] === "$Cons") && ((((($3)[2])[2])[0] === "$Cons") && (((((($3)[2])[2])[2])[0] === "$Cons") && (((((($3)[2])[2])[2])[2])[0] === "$Nil")))))
      ? ((() => {
        const $qty = ($3)[1];
        const $name = (($3)[2])[1];
        const $kcal = ((($3)[2])[2])[1];
        const $pro = (((($3)[2])[2])[2])[1];
        const $quantity = (c0$Maybe$withDefault)((text_toNumber)($qty), 1);
        const $kCalPercent = (c0$Maybe$withDefault)((text_toNumber)($kcal), 1);
        const $proteinPercent = (c0$Maybe$withDefault)((text_toNumber)($pro), 1);
        return ({
          kCalPercent: $kCalPercent,
          name: $name,
          proteinPercent: $proteinPercent,
          quantity: $quantity,
        });
      }))()
      : (true
        ? ({
          kCalPercent: 0,
          name: $itemAsText,
          proteinPercent: 0,
          quantity: 0,
        })
        : (sp_throw)('Missing pattern in try..as', 'src/Item.sp 14:8', (sp_toHuman)($3))));
  }));
});

const u0$Picker$init = (($eff) => {
  ((__re__ = (virtualDom_focus)($eff, "#search")), ($eff = (__re__)[1]), (__re__)[0]);
  return ([
    ({
      search: "",
    }),
    $eff,
  ]);
});

const u0$App$init = (($flags, $eff) => {
  const $foods = ((sp_equal)($flags.foods, "")
    ? u0$Food$defaults
    : (u0$Food$textToFoods)($flags.foods));
  const $items = ((sp_equal)($flags.items, "")
    ? c0$Core$Nil
    : (u0$Item$textToItems)($flags.items));
  return ([
    ({
      foods: $foods,
      items: $items,
      page: (u0$App$PagePicker)(((__re__ = (u0$Picker$init)($eff)), ($eff = (__re__)[1]), (__re__)[0])),
    }),
    $eff,
  ]);
});

const u0$Food$foodsToText = (($0) => {
  return (c0$Text$join)("\n", (c0$List$map)($0, (($food) => {
    return (c0$Text$join)("\t", (c0$Core$Cons)($food.name, (c0$Core$Cons)((text_fromNumber)($food.defaultQuantity), (c0$Core$Cons)((text_fromNumber)($food.kCalPercent), (c0$Core$Cons)((text_fromNumber)($food.proteinPercent), (c0$Core$Cons)((text_fromNumber)($food.timesUsed), c0$Core$Nil))))));
  })));
});

const u0$App$saveFoods = (($eff, $foods) => {
  return ([
    ((__re__ = (virtualDom_setLocalStorage)($eff, "foods", (u0$Food$foodsToText)($foods))), ($eff = (__re__)[1]), (__re__)[0]),
    $eff,
  ]);
});

const u0$EditFood$initNew = (($name) => {
  return ({
    defaultQuantity: "100",
    hasChanged: true,
    kCalPercent: "200",
    maybeId: c0$Maybe$Nothing,
    name: $name,
    proteinPercent: "5",
    requestedDeletion: c0$Maybe$Nothing,
    timesUsed: 0,
  });
});

const u0$EditFood$initEdit = (($eff, $id, $foods) => {
  const $4 = (c0$List$find)($foods, (($f) => {
    return (sp_equal)($f.id, $id);
  }));
  return ([
    ((($4)[0] === "$Just")
      ? ((() => {
        const $food = ($4)[1];
        return ({
          defaultQuantity: (text_fromNumber)($food.defaultQuantity),
          hasChanged: false,
          kCalPercent: (text_fromNumber)($food.kCalPercent),
          maybeId: (c0$Maybe$Just)($food.id),
          name: $food.name,
          proteinPercent: (text_fromNumber)($food.proteinPercent),
          requestedDeletion: c0$Maybe$Nothing,
          timesUsed: $food.timesUsed,
        });
      }))()
      : ((($4)[0] === "$Nothing")
        ? ((() => {
          ((__re__ = (virtualDom_focus)($eff, "#name")), ($eff = (__re__)[1]), (__re__)[0]);
          return (u0$EditFood$initNew)("");
        }))()
        : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 43:4', (sp_toHuman)($4)))),
    $eff,
  ]);
});

const u0$EditFood$updateOnFoodSaved = (($id, $model) => {
  const $0 = $model;
  return (Object.assign)({}, $0, ({
    maybeId: (c0$Maybe$Just)($id),
  }));
});

const u0$EditFood$validateFood = (($model) => {
  return ((c0$Result$onOk)((($kCalPercent) => {
    return ((c0$Result$onOk)((($proteinPercent) => {
      return ((c0$Result$onOk)((($defaultQuantity) => {
        return ((c0$Result$onOk)((($name) => {
          return (c0$Result$Ok)(({
            defaultQuantity: $defaultQuantity,
            id: (c0$Maybe$withDefault)($model.maybeId, -(1)),
            kCalPercent: $kCalPercent,
            name: $name,
            proteinPercent: $proteinPercent,
            timesUsed: $model.timesUsed,
          }));
        })))(((sp_equal)($model.name, "")
          ? (c0$Result$Err)("Name is required")
          : (c0$Result$Ok)($model.name)));
      })))(((() => {
        const $4 = (text_toNumber)($model.defaultQuantity);
        return ((($4)[0] === "$Nothing")
          ? (c0$Result$Err)("Invalid default qty")
          : ((($4)[0] === "$Just")
            ? ((() => {
              const $n = ($4)[1];
              return (c0$Result$Ok)($n);
            }))()
            : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 144:4', (sp_toHuman)($4))));
      }))());
    })))(((() => {
      const $3 = (text_toNumber)($model.proteinPercent);
      return ((($3)[0] === "$Nothing")
        ? (c0$Result$Err)("Invalid protein")
        : ((($3)[0] === "$Just")
          ? ((() => {
            const $n = ($3)[1];
            return (c0$Result$Ok)($n);
          }))()
          : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 139:4', (sp_toHuman)($3))));
    }))());
  })))(((() => {
    const $2 = (text_toNumber)($model.kCalPercent);
    return ((($2)[0] === "$Nothing")
      ? (c0$Result$Err)("Invalid energy")
      : ((($2)[0] === "$Just")
        ? ((() => {
          const $n = ($2)[1];
          return (c0$Result$Ok)($n);
        }))()
        : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 134:4', (sp_toHuman)($2))));
  }))());
});

const u0$EditFood$update = (($config, $eff, $msg, $model) => {
  return ([
    ((($msg)[0] === "$OnNameInput")
      ? ((() => {
        const $v = ($msg)[1];
        const $0 = $model;
        return (Object.assign)({}, $0, ({
          hasChanged: true,
          name: $v,
        }));
      }))()
      : ((($msg)[0] === "$OnKCalInput")
        ? ((() => {
          const $v = ($msg)[1];
          const $0 = $model;
          return (Object.assign)({}, $0, ({
            hasChanged: true,
            kCalPercent: $v,
          }));
        }))()
        : ((($msg)[0] === "$OnProInput")
          ? ((() => {
            const $v = ($msg)[1];
            const $0 = $model;
            return (Object.assign)({}, $0, ({
              hasChanged: true,
              proteinPercent: $v,
            }));
          }))()
          : ((($msg)[0] === "$OnQtyInput")
            ? ((() => {
              const $v = ($msg)[1];
              const $0 = $model;
              return (Object.assign)({}, $0, ({
                defaultQuantity: $v,
                hasChanged: true,
              }));
            }))()
            : ((($msg)[0] === "$OnClickSave")
              ? ((() => {
                const $5 = (u0$EditFood$validateFood)($model);
                return ((($5)[0] === "$Err")
                  ? $model
                  : ((($5)[0] === "$Ok")
                    ? ((() => {
                      const $food = ($5)[1];
                      ((__re__ = (virtualDom_upstream)($eff, ($config.saveFood)($food, u0$EditFood$updateOnFoodSaved))), ($eff = (__re__)[1]), (__re__)[0]);
                      const $0 = $model;
                      return (Object.assign)({}, $0, ({
                        hasChanged: false,
                      }));
                    }))()
                    : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 94:12', (sp_toHuman)($5))));
              }))()
              : ((($msg)[0] === "$OnClickBack")
                ? ((() => {
                  const $5 = $model.requestedDeletion;
                  return ((($5)[0] === "$Nothing")
                    ? ((() => {
                      ((__re__ = (virtualDom_upstream)($eff, $config.goBack)), ($eff = (__re__)[1]), (__re__)[0]);
                      return $model;
                    }))()
                    : ((($5)[0] === "$Just")
                      ? ((() => {
                        const $id = ($5)[1];
                        const $0 = $model;
                        return (Object.assign)({}, $0, ({
                          requestedDeletion: c0$Maybe$Nothing,
                        }));
                      }))()
                      : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 105:12', (sp_toHuman)($5))));
                }))()
                : ((($msg)[0] === "$OnClickUse")
                  ? ((() => {
                    const $5 = (u0$EditFood$validateFood)($model);
                    ((($5)[0] === "$Err")
                      ? null
                      : ((($5)[0] === "$Ok")
                        ? ((() => {
                          const $food = ($5)[1];
                          return ((__re__ = (virtualDom_upstream)($eff, ($config.useFood)($food))), ($eff = (__re__)[1]), (__re__)[0]);
                        }))()
                        : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 116:12', (sp_toHuman)($5))));
                    return $model;
                  }))()
                  : ((($msg)[0] === "$OnClickDelete")
                    ? ((() => {
                      const $id = ($msg)[1];
                      const $0 = $model;
                      return (Object.assign)({}, $0, ({
                        requestedDeletion: (c0$Maybe$Just)($id),
                      }));
                    }))()
                    : ((($msg)[0] === "$OnConfirmDeletion")
                      ? ((() => {
                        const $id = ($msg)[1];
                        ((__re__ = (virtualDom_upstream)($eff, ($config.deleteFood)($id))), ($eff = (__re__)[1]), (__re__)[0]);
                        return $model;
                      }))()
                      : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 79:4', (sp_toHuman)($msg))))))))))),
    $eff,
  ]);
});

const u0$Item$itemsToText = (($0) => {
  return (c0$Text$join)("\n", (c0$List$map)($0, (($item) => {
    return (c0$Text$join)("\t", (c0$Core$Cons)((text_fromNumber)($item.quantity), (c0$Core$Cons)($item.name, (c0$Core$Cons)((text_fromNumber)($item.kCalPercent), (c0$Core$Cons)((text_fromNumber)($item.proteinPercent), c0$Core$Nil)))));
  })));
});

const u0$Picker$update = (($msg, $foods, $model) => {
  return ((($msg)[0] === "$OnSearchInput")
    ? ((() => {
      const $v = ($msg)[1];
      const $0 = $model;
      return (Object.assign)({}, $0, ({
        search: $v,
      }));
    }))()
    : (sp_throw)('Missing pattern in try..as', 'src/Picker.sp 22:4', (sp_toHuman)($msg)));
});

const u0$Totals$kCalTargetName = "kCalTarget";

const u0$Totals$proTargetName = "proTarget";

const u0$Totals$init = (($eff, $embed, $items) => {
  ((__re__ = (virtualDom_getLocalStorage)($eff, u0$Totals$kCalTargetName, (($0) => {
    return ($embed)((u0$Totals$OnGetTargetResponse)(u0$Totals$kCalTargetName, $0));
  }))), ($eff = (__re__)[1]), (__re__)[0]);
  ((__re__ = (virtualDom_getLocalStorage)($eff, u0$Totals$proTargetName, (($0) => {
    return ($embed)((u0$Totals$OnGetTargetResponse)(u0$Totals$proTargetName, $0));
  }))), ($eff = (__re__)[1]), (__re__)[0]);
  return ([
    ({
      deleteAllMode: false,
      expansion: u0$Totals$ExpansionNone,
      inputNumberAsText: "",
      items: $items,
      kCalTarget: 0,
      proTarget: 0,
    }),
    $eff,
  ]);
});

const u0$Totals$setTarget = (($targetName, $valueAsText, $model) => {
  const $value = (c0$Maybe$withDefault)((text_toNumber)($valueAsText), 0);
  return ((sp_equal)($targetName, u0$Totals$kCalTargetName)
    ? ((() => {
      const $0 = $model;
      return (Object.assign)({}, $0, ({
        kCalTarget: ($value - (basics_modBy)(50, $value)),
      }));
    }))()
    : ((sp_equal)($targetName, u0$Totals$proTargetName)
      ? ((() => {
        const $0 = $model;
        return (Object.assign)({}, $0, ({
          proTarget: ($value - (basics_modBy)(5, $value)),
        }));
      }))()
      : ((() => {
        const $0 = $model;
        return (Object.assign)({}, $0, ({
          proTarget: -(1000),
        }));
      }))()));
});

const u0$Totals$update = (($eff, $msg, $model) => {
  return ([
    ((($msg)[0] === "$OnUserSetsTarget")
      ? ((() => {
        const $targetName = ($msg)[1];
        const $valueAsText = ($msg)[2];
        ((__re__ = (virtualDom_setLocalStorage)($eff, $targetName, $valueAsText)), ($eff = (__re__)[1]), (__re__)[0]);
        return (u0$Totals$setTarget)($targetName, $valueAsText, $model);
      }))()
      : ((($msg)[0] === "$OnGetTargetResponse")
        ? ((() => {
          const $targetName = ($msg)[1];
          const $valueAsText = ($msg)[2];
          return (u0$Totals$setTarget)($targetName, $valueAsText, $model);
        }))()
        : ((($msg)[0] === "$OnDeleteAllMode")
          ? ((() => {
            const $isActive = ($msg)[1];
            const $0 = $model;
            return (Object.assign)({}, $0, ({
              deleteAllMode: $isActive,
            }));
          }))()
          : ((($msg)[0] === "$OnToggleExpansion")
            ? ((() => {
              const $expansion = ($msg)[1];
              const $0 = $model;
              return (Object.assign)({}, $0, ({
                expansion: ((sp_equal)($0.expansion, $expansion)
                  ? u0$Totals$ExpansionNone
                  : $expansion),
              }));
            }))()
            : ((($msg)[0] === "$OnQuantityInput")
              ? ((() => {
                const $index = ($msg)[1];
                const $text = ($msg)[2];
                const $0 = $model;
                return (Object.assign)({}, $0, ({
                  inputNumberAsText: $text,
                  items: ((() => {
                    const $4 = (text_toNumber)($text);
                    return ((($4)[0] === "$Nothing")
                      ? $0.items
                      : ((($4)[0] === "$Just")
                        ? ((() => {
                          const $number = ($4)[1];
                          return (c0$List$mapWithIndex)($0.items, (($itemIndex, $item) => {
                            return (((sp_equal)($itemIndex, $index) && (sp_equal)((text_fromNumber)($number), $text))
                              ? ((() => {
                                const $1 = $item;
                                return (Object.assign)({}, $1, ({
                                  quantity: $number,
                                }));
                              }))()
                              : $item);
                          }));
                        }))()
                        : (sp_throw)('Missing pattern in try..as', 'src/Totals.sp 91:16', (sp_toHuman)($4))));
                  }))(),
                }));
              }))()
              : ((($msg)[0] === "$OnRemove")
                ? ((() => {
                  const $index = ($msg)[1];
                  const $0 = $model;
                  return (Object.assign)({}, $0, ({
                    expansion: u0$Totals$ExpansionNone,
                    items: (c0$List$concat)((c0$Core$Cons)((c0$List$take)($index, $0.items), (c0$Core$Cons)((c0$List$drop)(($index + 1), $0.items), c0$Core$Nil))),
                  }));
                }))()
                : ((($msg)[0] === "$OnDeleteAll")
                  ? ((() => {
                    const $0 = $model;
                    return (Object.assign)({}, $0, ({
                      deleteAllMode: false,
                      items: c0$Core$Nil,
                    }));
                  }))()
                  : (sp_throw)('Missing pattern in try..as', 'src/Totals.sp 69:4', (sp_toHuman)($msg))))))))),
    $eff,
  ]);
});

const u0$App$update = (($eff, $msg, $model) => {
  const $4 = ({
    first: $msg,
    second: $model.page,
  });
  return ([
    ((($4.first)[0] === "$OnClickOpenPicker")
      ? ((() => {
        const $0 = $model;
        return (Object.assign)({}, $0, ({
          page: (u0$App$PagePicker)(((__re__ = (u0$Picker$init)($eff)), ($eff = (__re__)[1]), (__re__)[0])),
        }));
      }))()
      : ((($4.first)[0] === "$OnPickerCancel")
        ? ((() => {
          const $0 = $model;
          return (Object.assign)({}, $0, ({
            page: (u0$App$PageTotals)(((__re__ = (u0$Totals$init)($eff, u0$App$OnTotalsMsg, $model.items)), ($eff = (__re__)[1]), (__re__)[0])),
          }));
        }))()
        : ((($4.first)[0] === "$OnCreateNewFood")
          ? ((() => {
            const $name = ($4.first)[1];
            const $0 = $model;
            return (Object.assign)({}, $0, ({
              page: (u0$App$PageEditFood)((u0$EditFood$initNew)($name)),
            }));
          }))()
          : ((($4.first)[0] === "$OnEditFood")
            ? ((() => {
              const $id = ($4.first)[1];
              const $0 = $model;
              return (Object.assign)({}, $0, ({
                page: (u0$App$PageEditFood)(((__re__ = (u0$EditFood$initEdit)($eff, $id, $model.foods)), ($eff = (__re__)[1]), (__re__)[0])),
              }));
            }))()
            : (((($4.first)[0] === "$OnEditFoodMsg") && (($4.second)[0] === "$PageEditFood"))
              ? ((() => {
                const $subMsg = ($4.first)[1];
                const $subModel = ($4.second)[1];
                const $0 = $model;
                return (Object.assign)({}, $0, ({
                  page: (u0$App$PageEditFood)(((__re__ = (u0$EditFood$update)(({
                    deleteFood: u0$App$OnEditDelete,
                    goBack: u0$App$OnClickOpenPicker,
                    saveFood: u0$App$OnEditSave,
                    useFood: u0$App$OnEditUse,
                  }), $eff, $subMsg, $subModel)), ($eff = (__re__)[1]), (__re__)[0])),
                }));
              }))()
              : ((($4.first)[0] === "$OnEditDelete")
                ? ((() => {
                  const $id = ($4.first)[1];
                  const $foods = (c0$List$filter)($model.foods, (($f) => {
                    return (sp_not_equal)($f.id, $id);
                  }));
                  ((__re__ = (u0$App$saveFoods)($eff, $foods)), ($eff = (__re__)[1]), (__re__)[0]);
                  const $0 = $model;
                  return (Object.assign)({}, $0, ({
                    foods: $foods,
                    page: (u0$App$PagePicker)(((__re__ = (u0$Picker$init)($eff)), ($eff = (__re__)[1]), (__re__)[0])),
                  }));
                }))()
                : (((($4.first)[0] === "$OnEditSave") && (($4.second)[0] === "$PageEditFood"))
                  ? ((() => {
                    const $food = ($4.first)[1];
                    const $updateEditModel = ($4.first)[2];
                    const $subModel = ($4.second)[1];
                    const $5 = ((sp_not_equal)($food.id, -(1))
                      ? ({
                        first: $food.id,
                        second: (c0$List$update)($model.foods, (($f) => {
                          return (sp_equal)($f.id, $food.id);
                        }), ((_0) => {
                          return $food;
                        })),
                      })
                      : ((() => {
                        const $id_ = (c0$Maybe$withDefault)((c0$List$maximum)((c0$List$map)($model.foods, (($f) => {
                          return $f.id;
                        }))), 0);
                        const $foods_ = (c0$Core$Cons)(((() => {
                          const $0 = $food;
                          return (Object.assign)({}, $0, ({
                            id: $id_,
                          }));
                        }))(), $model.foods);
                        return ({
                          first: $id_,
                          second: $foods_,
                        });
                      }))());
                    const $foods = $5.second;
                    const $id = $5.first;
                    ((__re__ = (u0$App$saveFoods)($eff, $foods)), ($eff = (__re__)[1]), (__re__)[0]);
                    const $0 = $model;
                    return (Object.assign)({}, $0, ({
                      foods: $foods,
                      page: (u0$App$PageEditFood)(($updateEditModel)($id, $subModel)),
                    }));
                  }))()
                  : ((($4.first)[0] === "$OnEditUse")
                    ? ((() => {
                      const $food = ($4.first)[1];
                      const $item = ({
                        kCalPercent: $food.kCalPercent,
                        name: $food.name,
                        proteinPercent: $food.proteinPercent,
                        quantity: $food.defaultQuantity,
                      });
                      const $items = (c0$Core$Cons)($item, $model.items);
                      ((__re__ = (virtualDom_setLocalStorage)($eff, "items", (u0$Item$itemsToText)($items))), ($eff = (__re__)[1]), (__re__)[0]);
                      const $0 = $model;
                      return (Object.assign)({}, $0, ({
                        items: $items,
                        page: (u0$App$PageTotals)(((__re__ = (u0$Totals$init)($eff, u0$App$OnTotalsMsg, $items)), ($eff = (__re__)[1]), (__re__)[0])),
                      }));
                    }))()
                    : (((($4.first)[0] === "$OnPickerMsg") && (($4.second)[0] === "$PagePicker"))
                      ? ((() => {
                        const $subMsg = ($4.first)[1];
                        const $subModel = ($4.second)[1];
                        const $0 = $model;
                        return (Object.assign)({}, $0, ({
                          page: (u0$App$PagePicker)((u0$Picker$update)($subMsg, $model.foods, $subModel)),
                        }));
                      }))()
                      : (((($4.first)[0] === "$OnTotalsMsg") && (($4.second)[0] === "$PageTotals"))
                        ? ((() => {
                          const $subMsg = ($4.first)[1];
                          const $subModelWithOldItems = ($4.second)[1];
                          const $newSubModel = ((__re__ = (u0$Totals$update)($eff, $subMsg, ((() => {
                            const $0 = $subModelWithOldItems;
                            return (Object.assign)({}, $0, ({
                              items: $model.items,
                            }));
                          }))())), ($eff = (__re__)[1]), (__re__)[0]);
                          ((sp_not_equal)($newSubModel.items, $model.items)
                            ? ((__re__ = (virtualDom_setLocalStorage)($eff, "items", (u0$Item$itemsToText)($newSubModel.items))), ($eff = (__re__)[1]), (__re__)[0])
                            : null);
                          const $0 = $model;
                          return (Object.assign)({}, $0, ({
                            items: $newSubModel.items,
                            page: (u0$App$PageTotals)($newSubModel),
                          }));
                        }))()
                        : (sp_throw)('Missing pattern in try..as', 'src/App.sp 65:4', (sp_toHuman)($4)))))))))))),
    $eff,
  ]);
});

const u0$UI$bottomRow = (($content) => {
  return (i1$Html$div)((c0$Core$Cons)((i1$Html$style)("position", "fixed"), (c0$Core$Cons)((i1$Html$style)("height", "0"), (c0$Core$Cons)((i1$Html$style)("right", "0"), (c0$Core$Cons)((i1$Html$style)("bottom", "0"), (c0$Core$Cons)((i1$Html$style)("left", "0"), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$style)("position", "absolute"), (c0$Core$Cons)((i1$Html$style)("bottom", "50px"), (c0$Core$Cons)((i1$Html$style)("width", "100%"), (c0$Core$Cons)((i1$Html$style)("display", "flex"), (c0$Core$Cons)((i1$Html$style)("justify-content", "space-evenly"), c0$Core$Nil))))), $content), c0$Core$Nil));
});

const u0$UI$buttonRound = (($1) => {
  const $onClick = $1.onClick;
  const $symbol = $1.symbol;
  return (i1$Html$button)((c0$Core$Cons)((i1$Html$style)("border-radius", "50%"), (c0$Core$Cons)((i1$Html$style)("width", "150px"), (c0$Core$Cons)((i1$Html$style)("height", "150px"), (c0$Core$Cons)((i1$Html$style)("font-size", "200%"), (c0$Core$Cons)((i1$Html$style)("display", "flex"), (c0$Core$Cons)((i1$Html$style)("align-items", "center"), (c0$Core$Cons)((i1$Html$style)("justify-content", "center"), (c0$Core$Cons)((i1$Html$onClick)($onClick), c0$Core$Nil)))))))), (c0$Core$Cons)($symbol, c0$Core$Nil));
});

const u0$UI$buttonBack = (($onClick) => {
  return (u0$UI$buttonRound)(({
    onClick: $onClick,
    symbol: (i1$Html$div)((c0$Core$Cons)((i1$Html$style)("padding-bottom", "18px"), (c0$Core$Cons)((i1$Html$style)("padding-right", "18px"), (c0$Core$Cons)((i1$Html$style)("font-size", "0.8em"), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)("◂"), c0$Core$Nil)),
  }));
});

const u0$UI$buttonTrash = (($onClick) => {
  return (u0$UI$buttonRound)(({
    onClick: $onClick,
    symbol: (i1$Html$img)((c0$Core$Cons)((i1$Html$style)("width", "1em"), (c0$Core$Cons)((i1$Html$src)("images/trash.svg"), c0$Core$Nil))),
  }));
});

const u0$EditFood$viewEditor = (($embed, $model) => {
  const $validationResult = (u0$EditFood$validateFood)($model);
  return (i1$Html$div)((c0$Core$Cons)((i1$Html$style)("padding-bottom", "250px"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("w100"), (c0$Core$Cons)((i1$Html$style)("display", "grid"), (c0$Core$Cons)((i1$Html$style)("grid-template-columns", "auto auto"), (c0$Core$Cons)((i1$Html$style)("gap", "0.2em 0.4em"), c0$Core$Nil)))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("Name"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$id)("name"), (c0$Core$Cons)((i1$Html$onInput)((($0) => {
    return ($embed)((u0$EditFood$OnNameInput)($0));
  })), (c0$Core$Cons)((i1$Html$value)($model.name), (c0$Core$Cons)((i1$Html$class)("w100"), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("Energy"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$span)((c0$Core$Cons)((i1$Html$class)("align-center nowrap"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$onInput)((($0) => {
    return ($embed)((u0$EditFood$OnKCalInput)($0));
  })), (c0$Core$Cons)((i1$Html$value)($model.kCalPercent), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("type", "number"), (c0$Core$Cons)((i1$Html$style)("width", "3em"), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("ml0 text-sm"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("kCal/100g"), c0$Core$Nil)), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("Protein"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$span)((c0$Core$Cons)((i1$Html$class)("align-center nowrap"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$onInput)((($0) => {
    return ($embed)((u0$EditFood$OnProInput)($0));
  })), (c0$Core$Cons)((i1$Html$value)($model.proteinPercent), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("type", "number"), (c0$Core$Cons)((i1$Html$style)("width", "3em"), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("ml0 text-sm"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("%"), c0$Core$Nil)), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("Quantity"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$span)((c0$Core$Cons)((i1$Html$class)("align-center nowrap"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$onInput)((($0) => {
    return ($embed)((u0$EditFood$OnQtyInput)($0));
  })), (c0$Core$Cons)((i1$Html$value)($model.defaultQuantity), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("type", "number"), (c0$Core$Cons)((i1$Html$style)("width", "3em"), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("ml0 text-sm"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("g"), c0$Core$Nil)), c0$Core$Nil))), c0$Core$Nil))))))))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("mt1"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("text-sm text-red"), c0$Core$Nil), (c0$Core$Cons)(((($validationResult)[0] === "$Ok")
    ? i1$Html$none
    : ((($validationResult)[0] === "$Err")
      ? ((() => {
        const $message = ($validationResult)[1];
        return (i1$Html$text)($message);
      }))()
      : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 250:18', (sp_toHuman)($validationResult)))), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("row justify-around"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$button)((c0$Core$Cons)((i1$Html$onClick)(($embed)(u0$EditFood$OnClickSave)), (c0$Core$Cons)((i1$Html$classIf)(((c0$Basics$not)($model.hasChanged) || (c0$Result$isErr)($validationResult)), "disabled"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$text)("Save"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$button)((c0$Core$Cons)((i1$Html$onClick)(($embed)(u0$EditFood$OnClickUse)), (c0$Core$Cons)((i1$Html$classIf)((c0$Result$isErr)($validationResult), "disabled"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$text)("Use"), c0$Core$Nil)), c0$Core$Nil))), c0$Core$Nil))), (c0$Core$Cons)((u0$UI$bottomRow)((c0$Core$Cons)((i1$Html$viewMaybe)($model.maybeId, (($0) => {
    return (u0$UI$buttonTrash)(($embed)((u0$EditFood$OnClickDelete)($0)));
  })), (c0$Core$Cons)((u0$UI$buttonBack)(($embed)(u0$EditFood$OnClickBack)), c0$Core$Nil))), c0$Core$Nil))));
});

const u0$EditFood$view = (($embed, $model) => {
  const $3 = $model.requestedDeletion;
  return ((($3)[0] === "$Nothing")
    ? (u0$EditFood$viewEditor)($embed, $model)
    : ((($3)[0] === "$Just")
      ? ((() => {
        const $id = ($3)[1];
        return (i1$Html$div)((c0$Core$Cons)((i1$Html$style)("padding-bottom", "250px"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("w100 col align-center gap1"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)(c0$Core$Nil, (c0$Core$Cons)((i1$Html$text)($model.name), c0$Core$Nil)), (c0$Core$Cons)((u0$UI$buttonTrash)(($embed)((u0$EditFood$OnConfirmDeletion)($id))), c0$Core$Nil))), (c0$Core$Cons)((u0$UI$bottomRow)((c0$Core$Cons)((u0$UI$buttonBack)(($embed)(u0$EditFood$OnClickBack)), c0$Core$Nil)), c0$Core$Nil)));
      }))()
      : (sp_throw)('Missing pattern in try..as', 'src/EditFood.sp 282:4', (sp_toHuman)($3))));
});

const u0$Picker$filter = (($model) => {
  return (($food) => {
    return (c0$Text$contains)((text_toLower)($model.search), (text_toLower)($food.name));
  });
});

const u0$Picker$sort = (($model) => {
  return (($food) => {
    return (((text_startsWith)((text_toLower)($model.search), (text_toLower)($food.name))
      ? "0"
      : "1") + $food.name);
  });
});

const u0$UI$buttonAdd = (($onClick) => {
  return (u0$UI$buttonRound)(({
    onClick: $onClick,
    symbol: (i1$Html$text)("+"),
  }));
});

const u0$Picker$view = (($params, $foods, $model) => {
  return (i1$Html$div)((c0$Core$Cons)((i1$Html$style)("padding-bottom", "250px"), c0$Core$Nil), (c0$Core$Cons)((u0$UI$bottomRow)((c0$Core$Cons)((u0$UI$buttonBack)($params.onCancel), (c0$Core$Cons)((u0$UI$buttonAdd)(($params.onNewFood)($model.search)), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("row align-center w100"), (c0$Core$Cons)((i1$Html$style)("position", "relative"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$id)("search"), (c0$Core$Cons)((i1$Html$class)("w100"), (c0$Core$Cons)((i1$Html$onInput)((($0) => {
    return ($params.embed)((u0$Picker$OnSearchInput)($0));
  })), (c0$Core$Cons)((i1$Html$value)($model.search), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center"), (c0$Core$Cons)((i1$Html$style)("position", "absolute"), (c0$Core$Cons)((i1$Html$style)("right", "0.5em"), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$img)((c0$Core$Cons)((i1$Html$style)("width", "1.2em"), (c0$Core$Cons)((i1$Html$src)("images/search.svg"), c0$Core$Nil))), c0$Core$Nil)), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("mt0"), c0$Core$Nil), (c0$List$map)((list_sortBy)((u0$Picker$sort)($model), (c0$List$filter)($foods, (u0$Picker$filter)($model))), (($food) => {
    return (i1$Html$button)((c0$Core$Cons)((i1$Html$class)("list row"), (c0$Core$Cons)((i1$Html$onClick)(($params.onEditFood)($food.id)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("text-left align-center"), (c0$Core$Cons)((i1$Html$style)("width", "60%"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("ml0"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)($food.name), c0$Core$Nil)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("text-right"), (c0$Core$Cons)((i1$Html$style)("width", "20%"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$text)((text_fromNumber)($food.kCalPercent)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("text-right"), (c0$Core$Cons)((i1$Html$style)("width", "20%"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$text)((text_fromNumber)($food.proteinPercent)), c0$Core$Nil)), c0$Core$Nil))));
  }))), c0$Core$Nil))));
});

const u0$Totals$viewDeleteAll = (($embed) => {
  return (i1$Html$div)((c0$Core$Cons)((i1$Html$class)("w100 justify-center mt1 pt"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$button)((c0$Core$Cons)((i1$Html$onClick)(($embed)(u0$Totals$OnDeleteAll)), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("Delete all intake entries"), c0$Core$Nil)), (c0$Core$Cons)((u0$UI$bottomRow)((c0$Core$Cons)((u0$UI$buttonBack)(($embed)((u0$Totals$OnDeleteAllMode)(false))), c0$Core$Nil)), c0$Core$Nil)));
});

const u0$Totals$formatNumber = (($0) => {
  return (c0$Text$join)("", (c0$List$take)(1, (text_split)(".", (text_fromNumber)($0))));
});

const u0$Totals$itemKCal = (($item) => {
  return (sp_divide)(($item.quantity * $item.kCalPercent), 100);
});

const u0$Totals$itemPro = (($item) => {
  return (sp_divide)(($item.quantity * $item.proteinPercent), 100);
});

const u0$UI$buttonRoundSmall = (($1) => {
  const $onClick = $1.onClick;
  const $symbol = $1.symbol;
  return (i1$Html$button)((c0$Core$Cons)((i1$Html$style)("padding", "16px"), (c0$Core$Cons)((i1$Html$style)("border-radius", "50%"), (c0$Core$Cons)((i1$Html$style)("width", "10vw"), (c0$Core$Cons)((i1$Html$style)("height", "10vw"), (c0$Core$Cons)((i1$Html$style)("font-size", "200%"), (c0$Core$Cons)((i1$Html$style)("display", "flex"), (c0$Core$Cons)((i1$Html$style)("align-items", "center"), (c0$Core$Cons)((i1$Html$style)("justify-content", "center"), (c0$Core$Cons)((i1$Html$onClick)($onClick), c0$Core$Nil))))))))), (c0$Core$Cons)($symbol, c0$Core$Nil));
});

const u0$UI$buttonTrashSmall = (($onClick) => {
  return (u0$UI$buttonRoundSmall)(({
    onClick: $onClick,
    symbol: (i1$Html$img)((c0$Core$Cons)((i1$Html$style)("width", "0.5em"), (c0$Core$Cons)((i1$Html$src)("images/trash.svg"), c0$Core$Nil))),
  }));
});

const u0$Totals$viewIntake = (($embed, $onAdd, $items, $model) => {
  const $target = ({
    kCal: 850,
    pro: 150,
  });
  const $s = i1$Html$style;
  const $p = ($s)("padding", "1%");
  const $quantityWidth = ($s)("width", "13%");
  const $nameWidth = ($s)("width", "53%");
  const $kCalWidth = ($s)("width", "13%");
  const $proWidth = ($s)("width", "13%");
  const $viewHeader = (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("row"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($quantityWidth, (c0$Core$Cons)($p, (c0$Core$Cons)((i1$Html$class)("bold text-right text-sm"), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)("g"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($nameWidth, c0$Core$Nil), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($kCalWidth, (c0$Core$Cons)($p, (c0$Core$Cons)((i1$Html$class)("bold text-right text-sm"), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)("kCal"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($proWidth, (c0$Core$Cons)($p, (c0$Core$Cons)((i1$Html$class)("bold text-right text-sm"), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)("Pro"), c0$Core$Nil)), c0$Core$Nil))))), c0$Core$Nil);
  const $viewItem = (($index, $item) => {
    return (i1$Html$div)((c0$Core$Cons)((i1$Html$class)("col"), (c0$Core$Cons)((i1$Html$classIf)((sp_equal)($model.expansion, (u0$Totals$ExpansionItem)($index)), "border mb1"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$button)((c0$Core$Cons)((i1$Html$class)("list row"), (c0$Core$Cons)((i1$Html$onClick)(($embed)((u0$Totals$OnToggleExpansion)((u0$Totals$ExpansionItem)($index)))), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("justify-end"), (c0$Core$Cons)($quantityWidth, (c0$Core$Cons)($p, c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)((text_fromNumber)($item.quantity)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center"), (c0$Core$Cons)($nameWidth, (c0$Core$Cons)($p, c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)($item.name), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center justify-end"), (c0$Core$Cons)($kCalWidth, (c0$Core$Cons)($p, c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)((u0$Totals$itemKCal)($item))), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center justify-end"), (c0$Core$Cons)($proWidth, (c0$Core$Cons)($p, c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)((u0$Totals$itemPro)($item))), c0$Core$Nil)), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$viewIf)((sp_equal)($model.expansion, (u0$Totals$ExpansionItem)($index)), ((_0) => {
      return (i1$Html$div)((c0$Core$Cons)((i1$Html$class)("row align-center mr1 ml1"), c0$Core$Nil), (c0$Core$Cons)((u0$UI$buttonRoundSmall)(({
        onClick: ($embed)((u0$Totals$OnQuantityInput)($index, (text_fromNumber)(($item.quantity - 1)))),
        symbol: (i1$Html$text)("-"),
      })), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$class)("flex1 ml0 mr0"), (c0$Core$Cons)((i1$Html$onInput)((($0) => {
        return ($embed)((u0$Totals$OnQuantityInput)($index, $0));
      })), (c0$Core$Cons)((i1$Html$value)((text_fromNumber)($item.quantity)), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("type", "range"), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("min", "1"), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("max", "300"), c0$Core$Nil))))))), (c0$Core$Cons)((u0$UI$buttonRoundSmall)(({
        onClick: ($embed)((u0$Totals$OnQuantityInput)($index, (text_fromNumber)(($item.quantity + 1)))),
        symbol: (i1$Html$text)("+"),
      })), c0$Core$Nil))));
    })), (c0$Core$Cons)((i1$Html$viewIf)((sp_equal)($model.expansion, (u0$Totals$ExpansionItem)($index)), ((_0) => {
      return (i1$Html$div)((c0$Core$Cons)((i1$Html$class)("row mt1 mr1 ml1 mb0"), c0$Core$Nil), (c0$Core$Cons)((u0$UI$buttonTrashSmall)(($embed)((u0$Totals$OnRemove)($index))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("col ml1 text-right"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)(c0$Core$Nil, (c0$Core$Cons)((i1$Html$span)(c0$Core$Nil, (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)($item.kCalPercent)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$span)((c0$Core$Cons)((i1$Html$class)("text-sm"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)(" kCal/100g"), c0$Core$Nil)), c0$Core$Nil))), (c0$Core$Cons)((i1$Html$div)(c0$Core$Nil, (c0$Core$Cons)((i1$Html$span)(c0$Core$Nil, (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)($item.proteinPercent)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$span)((c0$Core$Cons)((i1$Html$class)("text-sm"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)(" pro/100g"), c0$Core$Nil)), c0$Core$Nil))), c0$Core$Nil))), c0$Core$Nil)));
    })), c0$Core$Nil))));
  });
  const $viewTarget = (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("col"), (c0$Core$Cons)((i1$Html$classIf)((sp_equal)($model.expansion, u0$Totals$ExpansionTargets), "border mb1"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("row text-green"), (c0$Core$Cons)((i1$Html$style)("color", "#f6f6f6"), (c0$Core$Cons)((i1$Html$style)("background-color", "#2aad09"), (c0$Core$Cons)((i1$Html$onClick)(($embed)((u0$Totals$OnToggleExpansion)(u0$Totals$ExpansionTargets))), c0$Core$Nil)))), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($quantityWidth, c0$Core$Nil), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($nameWidth, (c0$Core$Cons)((i1$Html$class)("text-sm justify-end align-center pr"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$text)("Target"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center justify-end"), (c0$Core$Cons)($kCalWidth, (c0$Core$Cons)($p, c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)($model.kCalTarget)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("align-center justify-end"), (c0$Core$Cons)($proWidth, (c0$Core$Cons)($p, c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)($model.proTarget)), c0$Core$Nil)), c0$Core$Nil))))), (c0$Core$Cons)((i1$Html$viewIf)((sp_equal)($model.expansion, u0$Totals$ExpansionTargets), ((_0) => {
    return (i1$Html$div)((c0$Core$Cons)((i1$Html$class)("col mt0 ml0 mr0"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("kCal target"), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$class)("flex1"), (c0$Core$Cons)((i1$Html$onInput)((($0) => {
      return ($embed)((u0$Totals$OnUserSetsTarget)(u0$Totals$kCalTargetName, $0));
    })), (c0$Core$Cons)((i1$Html$value)((text_fromNumber)($model.kCalTarget)), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("type", "range"), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("min", "300"), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("max", "3000"), c0$Core$Nil))))))), (c0$Core$Cons)((i1$Html$text)("protein target"), (c0$Core$Cons)((i1$Html$input)((c0$Core$Cons)((i1$Html$class)("flex1"), (c0$Core$Cons)((i1$Html$onInput)((($0) => {
      return ($embed)((u0$Totals$OnUserSetsTarget)(u0$Totals$proTargetName, $0));
    })), (c0$Core$Cons)((i1$Html$value)((text_fromNumber)($model.proTarget)), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("type", "range"), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("min", "20"), (c0$Core$Cons)((i1$VirtualDom$DomAttribute)("max", "200"), c0$Core$Nil))))))), c0$Core$Nil)))));
  })), c0$Core$Nil))), c0$Core$Nil);
  const $viewTotals = ((() => {
    const $availableKCal = (c0$List$for)(0, $items, (($t, $item) => {
      return ($t + (u0$Totals$itemKCal)($item));
    }));
    const $availablePro = (c0$List$for)(0, $items, (($t, $item) => {
      return ($t + (u0$Totals$itemPro)($item));
    }));
    return (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("row"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($quantityWidth, c0$Core$Nil), c0$Core$Nil), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)($nameWidth, (c0$Core$Cons)((i1$Html$class)("bold text-sm justify-end align-center pr"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$text)("Available"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("bold align-center justify-end"), (c0$Core$Cons)((i1$Html$classIf)(($availableKCal < 0), "text-red"), (c0$Core$Cons)($kCalWidth, (c0$Core$Cons)($p, c0$Core$Nil)))), (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)($availableKCal)), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("bold align-center justify-end"), (c0$Core$Cons)($proWidth, (c0$Core$Cons)($p, c0$Core$Nil))), (c0$Core$Cons)((i1$Html$text)((u0$Totals$formatNumber)($availablePro)), c0$Core$Nil)), c0$Core$Nil))))), c0$Core$Nil);
  }))();
  const $viewItems = ((sp_equal)($items, c0$Core$Nil)
    ? (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("mt1 pt mb1 pb justify-center text-sm"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("No entries"), c0$Core$Nil)), c0$Core$Nil)
    : (c0$List$reverse)((c0$List$mapWithIndex)($items, $viewItem)));
  return (i1$Html$div)((c0$Core$Cons)((i1$Html$class)("w100"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$h1)((c0$Core$Cons)((i1$Html$class)("w100 justify-center"), c0$Core$Nil), (c0$Core$Cons)((i1$Html$text)("Intake"), c0$Core$Nil)), (c0$Core$Cons)((i1$Html$div)((c0$Core$Cons)((i1$Html$class)("w100"), c0$Core$Nil), (c0$List$concat)((c0$Core$Cons)($viewHeader, (c0$Core$Cons)($viewItems, (c0$Core$Cons)($viewTotals, c0$Core$Nil))))), (c0$Core$Cons)((u0$UI$bottomRow)((c0$Core$Cons)((i1$Html$viewIf)((sp_not_equal)($items, c0$Core$Nil), ((_0) => {
    return (u0$UI$buttonTrash)(($embed)((u0$Totals$OnDeleteAllMode)(true)));
  })), (c0$Core$Cons)((u0$UI$buttonAdd)($onAdd), c0$Core$Nil))), c0$Core$Nil))));
});

const u0$Totals$view = (($embed, $onAdd, $items, $model) => {
  return ($model.deleteAllMode
    ? (u0$Totals$viewDeleteAll)($embed)
    : (u0$Totals$viewIntake)($embed, $onAdd, $items, $model));
});

const u0$App$view = (($model) => {
  const $2 = $model.page;
  return ((($2)[0] === "$PageEditFood")
    ? ((() => {
      const $subModel = ($2)[1];
      return (u0$EditFood$view)(u0$App$OnEditFoodMsg, $subModel);
    }))()
    : ((($2)[0] === "$PagePicker")
      ? ((() => {
        const $subModel = ($2)[1];
        return (u0$Picker$view)(({
          embed: u0$App$OnPickerMsg,
          onCancel: u0$App$OnPickerCancel,
          onEditFood: u0$App$OnEditFood,
          onNewFood: u0$App$OnCreateNewFood,
        }), $model.foods, $subModel);
      }))()
      : ((($2)[0] === "$PageTotals")
        ? ((() => {
          const $subModel = ($2)[1];
          return (u0$Totals$view)(u0$App$OnTotalsMsg, u0$App$OnClickOpenPicker, $model.items, $subModel);
        }))()
        : (sp_throw)('Missing pattern in try..as', 'src/App.sp 165:4', (sp_toHuman)($2)))));
});

const u0$App$main = ({
  init: u0$App$init,
  update: u0$App$update,
  view: u0$App$view,
});
    // TODO these globals will be a hell of trouble if we want to run more than one app
    let effects = [];
    let oldVirtualDom = {}; // TODO this should be properly initialized
    let model = null;
    let elementId = null;

    function dispatch(msgResult) {
        if (msgResult[0] === "$Ok") {

            const msg = msgResult[1];

            model = u0$App$main.update(effects, msg, model)[0];

            requestAnimationFrame(updateDom);
        } else {
            console.warn('rejecting msg result: ', msgResult);
        }
    }


    function updateDom() {
        const e = win.document.getElementById(elementId);

        const newVirtualDom = u0$App$main.view(model);

        i1$VirtualDom$updateDomNode(newVirtualDom, oldVirtualDom, e.childNodes[0]);

        oldVirtualDom = newVirtualDom;

        const es = effects;
        effects = [];
        es.forEach((e) => e());
    }


    function main(eid, flags) {
        elementId = eid;
        model = u0$App$main.init(flags || {}, effects)[0];
        updateDom();
    }


    win.Squarepants = {
        main: main,
    };

})(this);
