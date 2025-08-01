---
layout: layout.html
---
# json-if

A `<template>` element with `json-if` attribute can be used to conditionally include content, and `json-else` can optionally be used to cover the opposite condition.

```html
<template json-if="someCondition">
  <span>This is only shown if `someCondition` is truthy.</span>
</template>
<template json-else>
  <span>This is only show if the condition is falsy</span>
</template>
```

## json-else

A `<template>` element with `json-else` can optionally directly follow the `json-if` (or `json-else-if`, when they are used) template. The attribute must be empty.

## json-else-if

A `<template>` element with `json-else-if` can optionally be included. It must be after `json-if` and before the `json-else`, if present. The attribute contains the condition. If the condition in `json-if` is falsy then the first `json-else-if` condition to be truthy will result in the contents of the template being rendered. If none of the `json-else-if` conditions are truthy then the contents of the `json-else` template is rendered (if it is present).

```html
<template json-if="status == 'OK'">
  <span>Everything is OK</span>
</template>
<template json-else-if="status == 'ERROR'">
  <span>There is an error</span>
</template>
<template json-else-if="status == 'WARN'">
  <span>There is a warning</span>
</template>
<template json-else>
  <span>Status is unknown</span>
</template>
```
