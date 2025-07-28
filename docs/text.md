---
layout: layout.html
---

# Text

There are two ways to render text, the first is very convenient but can lead to flash of unrendered content, which is why there is a second way.

## interpolated text

The simplest way to present text is to use `${variable}` just like template string literals.

```html
<h1>${title}</h1>
<p>The ${subject} ${verb}ed the ${object}</p>
```

Any arbitrarily complex expression can be used inside the curly braces.

Note that before the swap is run the initial text is presented to the user. That might not be ideal, so this method is probably best used inside template elements, like if or each. 

## textContent

The textContent of an element can be set using the `.text-content` attribute.

```html
<span .text-content="variable">Prerendered text</span>
```

This way prerendered text can be present in the element which is later replaced with the json content. 

Text can be interpolated in the attribute too:

```html
<span .text-content="`Temperature: ${temp}°C`">Temperature: 12°C</span>
```
