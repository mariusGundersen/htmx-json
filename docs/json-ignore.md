---
layout: layout.html
---

# json-ignore

Ignore subtrees of the DOM using the `json-ignore` attribute.

This is useful for example when the text need to include `${` which would trigger text interpolation

```html
<div json-ignore>
  This text contains ${ but that is not a problem.
</div>
```

The position of the attribute is significant, as it ignores any attribute after it in the element.

## json-ignore with conditions

The `json-ignore` can be used with an attribute value which will be interpreted as a condition which will cause it to only ignore if the condition is truthy. This can be used to memoize a subtree of the DOM.

Inside the `json-ignore` attribute the `$prev` vaciable can be used to compare `$this` with the previous swap. The first time it is swapped `$prev` is `undefined`, since there was no previous swap. Therefore it's beste to use `?.` when getting a property.

For example to prevent updating every row in a table and to only rearrange them:

```html
<table>
  <template json-each="veryLongListWhereTheItemsNeverChange" json-key="key">
    <tr json-ignore="$prev?.key === $this.key">
      ... lots of complex stuff here that will never be updated...
    </tr>
  </template>
</table>
```
