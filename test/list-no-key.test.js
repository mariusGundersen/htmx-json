describe('list without key', () => {
  const div = document.createElement('div');
  div.innerHTML = `<template json-each="list">
<span>\${value}</span>
</template>`;


  function test(/** @type {string} */ name, /** @type {{ list: { key: string; value: string; }[] }} */ json, /** @type {string} */ expected) {
    it('should be able to ' + name, () => {
      htmxJson.swap(div, json);
      expect(div.innerHTML).toBe(expected);
    })
  }

  test('init', {
    list: [
      { value: 'a' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>a</span>
<!--/json-each-->`);

  test('append', {
    list: [
      { value: 'a' },
      { value: 'b' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>a</span>
<!--1-->
<span>b</span>
<!--/json-each-->`);

  test('remove last', {
    list: [
      { value: 'a' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>a</span>
<!--/json-each-->`);

  test('prepend', {
    list: [
      { value: 'z' },
      { value: 'a' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--1-->
<span>a</span>
<!--/json-each-->`);

  test('insert', {
    list: [
      { value: 'z' },
      { value: 'b' },
      { value: 'a' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--1-->
<span>b</span>
<!--2-->
<span>a</span>
<!--/json-each-->`);

  test('swap late', {
    list: [
      { value: 'z' },
      { value: 'a' },
      { value: 'b' },
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--1-->
<span>a</span>
<!--2-->
<span>b</span>
<!--/json-each-->`);

  test('swap early', {
    list: [
      { value: 'a' },
      { value: 'z' },
      { value: 'b' },
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>a</span>
<!--1-->
<span>z</span>
<!--2-->
<span>b</span>
<!--/json-each-->`);

  test('swap over', {
    list: [
      { value: 'b' },
      { value: 'z' },
      { value: 'a' },
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>b</span>
<!--1-->
<span>z</span>
<!--2-->
<span>a</span>
<!--/json-each-->`);

  test('remove first', {
    list: [
      { value: 'z' },
      { value: 'a' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--1-->
<span>a</span>
<!--/json-each-->`);

  test('replace', {
    list: [
      { value: 'a' },
      { value: 'b' },
      { value: 'c' },
      { value: 'd' },
      { value: 'e' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>a</span>
<!--1-->
<span>b</span>
<!--2-->
<span>c</span>
<!--3-->
<span>d</span>
<!--4-->
<span>e</span>
<!--/json-each-->`);

  test('update', {
    list: [
      { value: 'aaa' },
      { value: 'bbb' },
      { value: 'ccc' },
      { value: 'ddd' },
      { value: 'eee' }
    ]
  },
    `<template json-each="list">
<span>\${value}</span>
</template><!--0-->
<span>aaa</span>
<!--1-->
<span>bbb</span>
<!--2-->
<span>ccc</span>
<!--3-->
<span>ddd</span>
<!--4-->
<span>eee</span>
<!--/json-each-->`);
});
