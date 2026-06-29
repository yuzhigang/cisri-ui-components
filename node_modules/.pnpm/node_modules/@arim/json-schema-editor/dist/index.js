import { jsx as e, jsxs as i } from "react/jsx-runtime";
import * as m from "react";
import { Slot as B } from "@radix-ui/react-slot";
import { cva as R } from "class-variance-authority";
import { cn as l } from "@arim/core";
import * as j from "@radix-ui/react-label";
import * as n from "@radix-ui/react-select";
import { ChevronDown as P, Check as E, Trash2 as L, Plus as J } from "lucide-react";
import * as N from "@radix-ui/react-switch";
import * as v from "@radix-ui/react-collapsible";
const Y = R(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), g = m.forwardRef(
  ({ className: r, variant: s, size: a, asChild: d = !1, ...p }, f) => /* @__PURE__ */ e(
    d ? B : "button",
    {
      className: l(Y({ variant: s, size: a, className: r })),
      ref: f,
      ...p
    }
  )
);
g.displayName = "Button";
const x = m.forwardRef(
  ({ className: r, type: s, ...a }, d) => /* @__PURE__ */ e(
    "input",
    {
      type: s,
      className: l(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        r
      ),
      ref: d,
      ...a
    }
  )
);
x.displayName = "Input";
const _ = R(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
), c = m.forwardRef(({ className: r, ...s }, a) => /* @__PURE__ */ e(
  j.Root,
  {
    ref: a,
    className: l(_(), r),
    ...s
  }
));
c.displayName = j.Root.displayName;
const F = n.Root, G = n.Value, S = m.forwardRef(({ className: r, children: s, ...a }, d) => /* @__PURE__ */ i(
  n.Trigger,
  {
    ref: d,
    className: l(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span&gt;]:line-clamp-1",
      r
    ),
    ...a,
    children: [
      s,
      /* @__PURE__ */ e(n.Icon, { asChild: !0, children: /* @__PURE__ */ e(P, { className: "h-4 w-4 opacity-50" }) })
    ]
  }
));
S.displayName = n.Trigger.displayName;
const T = m.forwardRef(({ className: r, children: s, position: a = "popper", ...d }, p) => /* @__PURE__ */ e(n.Portal, { children: /* @__PURE__ */ e(
  n.Content,
  {
    ref: p,
    className: l(
      "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      a === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      r
    ),
    position: a,
    ...d,
    children: /* @__PURE__ */ e(
      n.Viewport,
      {
        className: l(
          "p-1",
          a === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        ),
        children: s
      }
    )
  }
) }));
T.displayName = n.Content.displayName;
const I = m.forwardRef(({ className: r, children: s, ...a }, d) => /* @__PURE__ */ i(
  n.Item,
  {
    ref: d,
    className: l(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      r
    ),
    ...a,
    children: [
      /* @__PURE__ */ e("span", { className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ e(n.ItemIndicator, { children: /* @__PURE__ */ e(E, { className: "h-4 w-4" }) }) }),
      /* @__PURE__ */ e(n.ItemText, { children: s })
    ]
  }
));
I.displayName = n.Item.displayName;
const k = m.forwardRef(({ className: r, ...s }, a) => /* @__PURE__ */ e(
  N.Root,
  {
    className: l(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      r
    ),
    ...s,
    ref: a,
    children: /* @__PURE__ */ e(
      N.Thumb,
      {
        className: l(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )
      }
    )
  }
));
k.displayName = N.Root.displayName;
const H = v.Root, M = v.CollapsibleTrigger, Q = v.CollapsibleContent, U = [
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean"
];
function te({
  value: r,
  onChange: s,
  className: a
}) {
  return /* @__PURE__ */ e(
    "div",
    {
      className: l(
        "rounded-md border border-border bg-card p-4 text-card-foreground",
        a
      ),
      children: /* @__PURE__ */ e(w, { value: r, onChange: s, path: "root" })
    }
  );
}
function w({
  value: r,
  onChange: s,
  path: a,
  name: d,
  onNameChange: p,
  onDelete: f
}) {
  const h = r.type ?? "object", b = (t) => {
    s({ ...r, ...t });
  }, z = () => {
    const t = r.properties ?? {}, o = `field${Object.keys(t).length + 1}`;
    s({
      ...r,
      properties: {
        ...t,
        [o]: { type: "string" }
      }
    });
  }, O = (t, o) => {
    if (t === o) return;
    const u = r.properties ?? {}, D = Object.entries(u), y = {};
    for (const [C, A] of D)
      y[C === t ? o : C] = A;
    s({ ...r, properties: y });
  }, V = (t, o) => {
    s({
      ...r,
      properties: {
        ...r.properties ?? {},
        [t]: o
      }
    });
  }, q = (t) => {
    const o = { ...r.properties ?? {} };
    delete o[t], s({ ...r, properties: o });
  }, $ = (t) => {
    const o = new Set(r.required ?? []);
    o.has(t) ? o.delete(t) : o.add(t), s({ ...r, required: Array.from(o) });
  };
  return /* @__PURE__ */ i("div", { className: "space-y-3", children: [
    /* @__PURE__ */ i("div", { className: "flex flex-wrap items-end gap-3", children: [
      p && /* @__PURE__ */ i("div", { className: "space-y-1", children: [
        /* @__PURE__ */ e(c, { className: "text-xs text-muted-foreground", children: "Name" }),
        /* @__PURE__ */ e(
          x,
          {
            value: d ?? "",
            onChange: (t) => p(t.target.value),
            className: "h-8 w-32"
          }
        )
      ] }),
      /* @__PURE__ */ i("div", { className: "space-y-1", children: [
        /* @__PURE__ */ e(c, { className: "text-xs text-muted-foreground", children: "Title" }),
        /* @__PURE__ */ e(
          x,
          {
            value: r.title ?? "",
            onChange: (t) => b({ title: t.target.value }),
            placeholder: "Title",
            className: "h-8 w-40"
          }
        )
      ] }),
      /* @__PURE__ */ i("div", { className: "space-y-1", children: [
        /* @__PURE__ */ e(c, { className: "text-xs text-muted-foreground", children: "Type" }),
        /* @__PURE__ */ i(
          F,
          {
            value: h,
            onValueChange: (t) => b({ type: t }),
            children: [
              /* @__PURE__ */ e(S, { className: "h-8 w-32", children: /* @__PURE__ */ e(G, {}) }),
              /* @__PURE__ */ e(T, { children: U.map((t) => /* @__PURE__ */ e(I, { value: t, children: t }, t)) })
            ]
          }
        )
      ] }),
      f && /* @__PURE__ */ e(
        g,
        {
          variant: "ghost",
          size: "icon",
          onClick: f,
          className: "h-8 w-8",
          children: /* @__PURE__ */ e(L, { className: "h-4 w-4 text-destructive" })
        }
      )
    ] }),
    /* @__PURE__ */ i("div", { className: "space-y-1", children: [
      /* @__PURE__ */ e(c, { className: "text-xs text-muted-foreground", children: "Description" }),
      /* @__PURE__ */ e(
        x,
        {
          value: r.description ?? "",
          onChange: (t) => b({ description: t.target.value }),
          placeholder: "Description",
          className: "h-8"
        }
      )
    ] }),
    h === "object" && /* @__PURE__ */ i("div", { className: "space-y-2 border-l border-border pl-4", children: [
      /* @__PURE__ */ i("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ e(c, { className: "text-xs font-semibold text-muted-foreground", children: "Properties" }),
        /* @__PURE__ */ i(
          g,
          {
            variant: "outline",
            size: "sm",
            onClick: z,
            className: "h-7 gap-1 text-xs",
            children: [
              /* @__PURE__ */ e(J, { className: "h-3 w-3" }),
              " Add property"
            ]
          }
        )
      ] }),
      r.properties && Object.keys(r.properties).length > 0 ? /* @__PURE__ */ e("div", { className: "space-y-3", children: Object.entries(r.properties).map(([t, o]) => /* @__PURE__ */ e(H, { defaultOpen: !0, children: /* @__PURE__ */ i("div", { className: "rounded-md border border-border p-3", children: [
        /* @__PURE__ */ e("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ i("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ e(M, { asChild: !0, children: /* @__PURE__ */ e(g, { variant: "ghost", size: "icon", className: "h-6 w-6", children: /* @__PURE__ */ e(P, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ e("span", { className: "text-sm font-medium", children: t }),
          /* @__PURE__ */ i("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ e(
              k,
              {
                checked: (r.required ?? []).includes(t),
                onCheckedChange: () => $(t),
                className: "scale-75"
              }
            ),
            /* @__PURE__ */ e(c, { className: "text-xs text-muted-foreground", children: "Required" })
          ] })
        ] }) }),
        /* @__PURE__ */ e(Q, { className: "mt-3", children: /* @__PURE__ */ e(
          w,
          {
            value: o,
            onChange: (u) => V(t, u),
            path: `${a}.${t}`,
            name: t,
            onNameChange: (u) => O(t, u),
            onDelete: () => q(t)
          }
        ) })
      ] }) }, `${a}-${t}`)) }) : /* @__PURE__ */ e("p", { className: "text-xs text-muted-foreground", children: "No properties yet." })
    ] }),
    h === "array" && /* @__PURE__ */ i("div", { className: "border-l border-border pl-4", children: [
      /* @__PURE__ */ e(c, { className: "text-xs font-semibold text-muted-foreground", children: "Items" }),
      /* @__PURE__ */ e("div", { className: "mt-2 rounded-md border border-border p-3", children: /* @__PURE__ */ e(
        w,
        {
          value: r.items ?? { type: "string" },
          onChange: (t) => b({ items: t }),
          path: `${a}.items`
        }
      ) })
    ] })
  ] });
}
export {
  te as JsonSchemaEditor
};
