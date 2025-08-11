---
layout: layout.html
---

# @attributes

Attributes can be set using the `@` prefix and a js expression as the value. For example, to set the attribute `href` use `@href="jsonValue"`. The value will be converted to a string and set on the element as the attribute value, unless the value is `null`, in which case the attribute is removed from the element.
