---
layout: layout.html
---
# Properties

Properties of html elements can be set with the `.` prefix, for eksempel `.text-content="someValue"`.

Because html attributes are not case-sensitive the property name cannot contain upper case letters. Instead of using the `camelCase` name of a property the `kebab-case` name should be used instead.

The property name can include `.` to set values in objects, for example the properties of the style property:

```html
<span .style.background-color="color">This will be red</span>
```
