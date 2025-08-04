---
layout: layout.html
---
# json-with

The `json-with` attribute can be used to create a new json scope of variables:

```html
<div json-with="address">
  <strong>Street: ${street}</strong>
  <span>Postal code: ${postCode}</span>
  <span>Country: ${country}</span>
</div>
```

`$json-with` has access to `$prev`, the previous `$this` value. Using object spread notation the values from the two objects can be combined.

```html
<div json-with="{...$prev, ...$this}">
  <strong>Street: ${street}</strong>
  <span>Postal code: ${postCode}</span>
  <span>Country: ${country}</span>
</div>
```

`json-with` can also work like `json-ignore`, in that if the value is falsy it will not update the subtree.
