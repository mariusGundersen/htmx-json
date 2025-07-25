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

A `<template>` element with `json-else` can optionally directly follow the `json-if` template. The attribute must be empty. 
