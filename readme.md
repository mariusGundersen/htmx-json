# htmx-json

Support for json response in htmx

## What is this?

This htmx extension adds support for using json response in htmx. By using a combination of attributes and templates it can easily update the dom with new values from the json response. This way you can write your html in the html file and rely on a small json response.

## Install

```html
<script src="https://unpkg.com/htmx-json"></script>
```

## Usage

Given an api endpoint that returns this json:

```json
{
  "title": "Data",
  "show": true,
  "list": [
    "very",
    "simple",
    "and",
    "cool"
  ]
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

You can use these attributes:

* `json-text`
* `json-if`
* `json-each`
* `@attribute`
* `.property`
* `json-show`/`json-hide`
* `json-with`

They are described below

## Features

### `json-text`

Add the `json-text` attribute to change the textContent of the element.

```html
<span json-text="name">This will contain the value of the `name` property</span>
<span json-text="`My name is ${name}!`">Use JavaScript template tags to interpolate text</span>
<span json-text="isSomething ? 'Yes' : 'No'">You can add any JavaScript expression to the attribute</span>
```

You can also use json templating directly in the text content. The following are equivalent to the above three.

```html
<span>${name}</span>
<span>My name is ${name}!</span>
<span>${isSomething ? 'Yes' : 'No'}</span>
```

The disadvantage of doing it like this is that the template string is shown while the page loads and is only swapped out when the json is applied.
This makes this more suitable for use inside templates, which aren't shown until the json is applied

You can use `json-ignore` to stop interpolation of text, when it would cause conflicts:

```html
<span json-ignore>$123</span>
```

### `json-if`

You can conditionally have html using a template tag with `json-if`, and optionally `json-else`

```html
<template json-if="someCondition">
  <span>This is only shown if `someCondition` is truthy.</span>
</template>
<template json-else>
  <span>This is only show if the condition is falsy</span>
</template>
```

### `json-each`

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

You should use `json-key` to refer to a unique string value in each item if you want the list to update correctly:

```html
<ul>
<template json-each="list" json-key="id">
  <li>${value}</li>
</template>
</ul>
```

### `@attributes`

Set any attribute using `@attribute="value"`:

```html
<a @href="`mailto:${email}`">${name}</a>
```

### `.property`

Set any property using `.property="value"`:

```html
<span .style.background-color="color">${name}</span>
```

The property name needs to be converted from `camelCase` to `kebab-case` for it to be valid html.

This means you can do very dirty stuff:

```html
<div .inner-h-t-m-l="html">This will be replaced with the contents of `html` using innerHTML!</div>
```

### `json-show` and `json-hide`

Show or hide (using `display: none`) an element.

```html
<div json-show="condition">This will only be visible if condition is true</div>
<div json-hide="condition">This will only be visible if condition is false</div>
<div json-show="condition" style="display: none">This will be hidden until condition becomes true</div>
```

If you want it to be initially hidden you can use `style="display: none"` to hide it until json is applied.

### `<input>`

Form fields are special, they will automatically get their value from the json using the name attribute. For example:

```json
{
  "text": "something",
  "checked": true,
  "choice": "second"
}
```

```html
  <input name="text">
  <small>This will have the value `something` since `name="text"` and `"text": "something"`</small>

  <input name="checked" type="checkbox">
  <small>This will be checked since `name="checked"` and `"checked": true`</small>

  <input name="choice" value="first" type="radio"> First
  <input name="choice" value="second" type="radio"> Second
  <input name="choice" value="third" type="radio"> Third
  <small>The second option will be selected because `name="choice"`, `value="second"` and `"choice": "second"`</small>
```

If you need to set the value to something other than the value directly you can use `.value="something"` to do so:

```html
  <input name="hour" .value="new Date(dateTime).getHour()">
```

### `json-with`

Go into an object using `json-with` to select the property to use:

```html
<div json-with="address">
  <strong>Street: ${street}</strong>
  <span>Postal code: ${postCode}</span>
  <span>Country: ${country}</span>
</div>
```

### Properties

* `$this`: The current object
* `$parent`: The parent object, inside `json-with` or `json-each`
* `$index`: The current index, inside `json-each`
