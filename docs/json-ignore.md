---
layout: layout.html
---

# json-ignore

Ignore subtrees of the Dom using the `json-ignore` attribute.

This is useful for example when the text need to include `${` which would trigger text interpolation

```html
<div json-ignore>
  This text contains ${ but that is not a problem.
</div>
```

The position of the attribute is significant, as it ignores any attribute after it in the element. 
