---
layout: layout.html
---

# Directives

Custom features can be implemented by adding to the `htmxJson.directives` array. This array contains all the features implemented for html elements, like `@attributes`, `json-with`, etc. Each element in the array is a function containing a `match` method and a `factory` method, the `factory` method is run if the `match` method returns true.

For example, a very simple and probably inefficent classList directive can be created like this:

```js
htmx.directives.push({
  match: (attr) => attr.name === '#class-list',
  factory: (elm, attr, createGetter) => {
    const getter = createGetter(attr.value);
    return ($ctx) => {
      const list = getter($ctx);
      elm.classList.value = list.join(' ');
    }
  }
})
```

The `match` method checks if the attribute name is `#class-list`, and if it is the factory is run. The `factory` method returns a callback that will do the actual work. The factory is only called once, when the element with the attribute is first discovered, and the returned callback will be called every time a new value is swapped into it.

The factory is called with three parameters, the element, the attribute and a `createGetter` function that can be used to convert a string into a js expression. This way the attribute value can be converted from a string into an expression that can be evaluated in the current context.
