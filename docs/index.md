---
layout: layout.html
---

# HTMX-JSON

This htmx extension adds support for using json response in htmx. By using a combination of attributes and templates it can easily update the dom with new values from the json response. This way you can write your html in the html file and rely on a small json response.

## Install

Just reference it from a cdn like unpkg, just like you do with htmx. 

```html
<script src="https://unpkg.com/htmx-json"></script>
```

## Usage

You need to add `hx-ext="json-swap"` to the body:

```html
<body hx-ext="json-swap">
  ... 
</body>
```

Next add `hx-swap="json"` to the element you want to support json. 

```html
<div hx-get="/api/data" hx-trigger="load, every 60s" hx-swap="json">
  ...
</div>
```

Given an api endpoint that returns this json:

```json
{
  "title": "Data",
  "show": true,
  "list": ["very", "simple", "and", "cool"]
}
```

Add attributes and templates to an html

```html
<body hx-ext="json-swap">
  <div hx-get="/api/data" hx-trigger="load, every 60s" hx-swap="json">
    <h2 json-text="title">This will be replaced by the value of `title`</h2>
    <p json-show="show">This will only be shown when `show` is true</p>
    <ul>
      <template json-each="list">
        <li>${$this}</li>
      </template>
    </ul>
  </div>
</body>
```
