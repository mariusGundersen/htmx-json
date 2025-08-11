---
layout: layout.html
---

# HTMX-JSON

This [htmx extension](https://htmx.org/extensions/) adds support for using json response in [htmx](https://htmx.org/). By using a combination of attributes and templates it can easily update the dom with new values from the json response. This way you can write your html in the html file and rely on a small json response.

## Install

Just reference it from a cdn, like you do with htmx.

```html
<script src="https://cdn.jsdelivr.net/npm/htmx-json@1/dist/htmx-json.min.js"></script>
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
  "title": "This is an example",
  "url": "https://example.com",
  "linkText": "Click here",
  "list": ["very", "simple", "and", "cool"]
}
```

Add attributes and templates to an html

```html
<div hx-get="/api/data" hx-trigger="load, every 60s" hx-swap="json">
    <h2 .text-content="title">This will be replaced by the value of `title`</h2>
    <a @href="url" .text-content="linkText">This is a link</p>
    <ul>
      <template json-each="list">
        <li>${$this}</li>
      </template>
  </ul>
</div>
```
