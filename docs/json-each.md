---
layout: layout.htnl
---

# json-each

Loop over a list using `json-each`, for example give the following json:

```json
{
  "list": [
    { "id": "first", "value": "First"}
    { "id": "second", "value": "Second"}
    { "id": "third", "value": "Third"}
    { "id": "fourth", "value": "Fourth"}
  ]
}
```

```html
<ul>
  <template json-each="list">
    <li>${value}</li>
  </template>
</ul>
```

Inside the template element the `$this` variable refers to each item. You can access the scope the list is in using `$parent`, and the current zero-based index using `$index`. `$key` refers to the key for each entry, which is either the value in `json-key` (see below) or the index, if `json-key` isn't used. 

You should use `json-key` to refer to a unique string value in each item if you want the list to update correctly. If you supply a key and reorder the entries in the list then the DOM elements will also be reordered, if you don't supply a key then they will be updated in place, which can lead to weird things and worse performance. Supply the `json-key` attribute next to the `json-each` attribute:

```html
<ul>
  <template json-each="list" json-key="id">
    <li>${value}</li>
  </template>
</ul>
```

You can also supply an object to `json-each` and iterate over the values. When iterating over an object the `json-key` is ignored and `$key` will refer to the property name in the object. 

Note that it's advices to not have numeric properties in the object, as they will not be iterated over in the order they appear in, but instead in increasing order. 
