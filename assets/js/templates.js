(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "<div>\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    ";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\n  ";
;
}
}
frame = frame.pop();
output += "\n</div>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((t_4),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((t_4),"description"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\">\n        <a class=\"govuk-link\" href=\"#\">Change<span class=\"govuk-visually-hidden\"> name</span></a>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((t_4),"description"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\">\n        <a class=\"govuk-link\" href=\"#\">Change<span class=\"govuk-visually-hidden\"> name</span></a>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((t_4),"description"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\">\n        <a class=\"govuk-link\" href=\"#\">Change<span class=\"govuk-visually-hidden\"> name</span></a>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\">\n        <a class=\"govuk-link\" href=\"#\">Change<span class=\"govuk-visually-hidden\"> name</span></a>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\">Add<span class=\"govuk-visually-hidden\"> contact details</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\">Change<span class=\"govuk-visually-hidden\"> contact details</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre><code>";
output += runtime.suppressValue(env.getFilter("dump").call(context, env.getFilter("safe").call(context, runtime.contextOrFrameLookup(context, frame, "geojson")),2), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\">\n          <input class=\"govuk-input\" type=\"text\"><button class=\"govuk-button\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input\" type=\"text\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\" style=\"width: 40%\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input govuk-input--width-10\" type=\"text\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\" style=\"width: 40%\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input govuk-!-width-two-thirds\" type=\"text\" name=\"description\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\" style=\"width: 40%\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input govuk-!-width-two-thirds\" type=\"text\" name=\"description\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button govuk-!-margin-bottom-0\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\" style=\"width: 40%\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input govuk-!-width-two-thirds\" type=\"text\" name=\"description\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button govuk-!-margin-bottom-0\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\" style=\"width: 40%\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input govuk-!-width-two-thirds\" type=\"text\" name=\"description\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button govuk-!-margin-bottom-0\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\" style=\"width: 40%\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input govuk-!-width-two-thirds\" type=\"text\" name=\"description\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button govuk-!-margin-bottom-0\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          ";
if(!runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type") == "Point") {
output += "\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n          ";
;
}
output += "\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

(function() {(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})["assets/templates/editor.njk"] = (function() {
function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "\n<dl class=\"govuk-summary-list\">\n  ";
frame = frame.push();
var t_3 = runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "geojson")),"features");
if(t_3) {t_3 = runtime.fromIterator(t_3);
var t_2 = t_3.length;
for(var t_1=0; t_1 < t_3.length; t_1++) {
var t_4 = t_3[t_1];
frame.set("feature", t_4);
frame.set("loop.index", t_1 + 1);
frame.set("loop.index0", t_1);
frame.set("loop.revindex", t_2 - t_1);
frame.set("loop.revindex0", t_2 - t_1 - 1);
frame.set("loop.first", t_1 === 0);
frame.set("loop.last", t_1 === t_2 - 1);
frame.set("loop.length", t_2);
output += "\n    <div class=\"govuk-summary-list__row\">\n      <dt class=\"govuk-summary-list__key\" style=\"width: 40%\">\n        <div class=\"description\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "</div>\n        <div class=\"description-editor\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" hidden>\n          <input class=\"govuk-input govuk-!-width-two-thirds\" type=\"text\" name=\"description\" value=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"properties")),"description"), env.opts.autoescape);
output += "\"><button class=\"govuk-button govuk-!-margin-bottom-0\">Save</button>\n        </div>\n      </dt>\n      <dd class=\"govuk-summary-list__value\">\n        ";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\n      </dd>\n      <dd class=\"govuk-summary-list__actions\" style=\"width: 30%\">\n        <ul class=\"govuk-summary-list__actions-list\">\n          ";
if(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type") != "Point") {
output += "\n            <li class=\"govuk-summary-list__actions-list-item\">\n              <a class=\"govuk-link\" href=\"#\" data-action=\"edit\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Change<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n            </li>\n          ";
;
}
output += "\n          <li class=\"govuk-summary-list__actions-list-item\">\n            <a class=\"govuk-link\" href=\"#\" data-action=\"delete\" data-id=\"";
output += runtime.suppressValue(runtime.memberLookup((t_4),"id"), env.opts.autoescape);
output += "\" data-type=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_4),"geometry")),"type"), env.opts.autoescape);
output += "\">Delete<span class=\"govuk-visually-hidden\"> geo feature</span></a>\n          </li>\n        </ul>\n      </dd>\n    </div>  \n  ";
;
}
}
frame = frame.pop();
output += "\n</dl>\n\n<pre style=\"height: 300px; overflow: auto;\"><code>";
output += runtime.suppressValue(env.getFilter("safe").call(context, env.getFilter("dump").call(context, runtime.contextOrFrameLookup(context, frame, "geojson"),2)), env.opts.autoescape);
output += "</code></pre>\n";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};

})();
})();

