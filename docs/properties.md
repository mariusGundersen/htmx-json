---
layout: layout.html
---
# .properties

Properties of html elements can be set with the `.` prefix, for eksempel `.text-content="someValue"`.

Because html attributes are not case-sensitive the property name cannot contain upper case letters. Instead of using the `camelCase` name of a property the `kebab-case` name should be used instead. Therefore the property `.textContent` is set with the attribute `.text-content`.

The property name can include `.` to set values in objects, for example the style properties:

```html
<span .style.background-color="color">
  This will be red
</span>
```

The value is interpreted as a JavaScript expression, so to use a string the value must be wrapped in `\``. 

```html
<span .style.width="`${count * 32}px`">
  The width will be 32px * count 
</span>
```

Using `.text-content` can be very useful to set the text and have a pre-rendered value until the new json content is applied. 
