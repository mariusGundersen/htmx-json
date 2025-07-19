describe("each over object", () => {
  const div = document.createElement("div");
  div.innerHTML = `<template json-each="obj">
<span>\${value}</span>
</template>`;

  function test(
    /** @type {string} */ name,
    /** @type {{ obj: { key: string; value: string; }[] }} */ json,
    /** @type {string} */ expected
  ) {
    it("should be able to " + name, () => {
      htmxJson.swap(div, json);
      expect(div.innerHTML).toBe(expected);
    });
  }

  test(
    "init",
    {
      obj: {
        key1: { value: "a" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "append",
    {
      obj: {
        key1: { value: "a" },
        key2: { value: "b" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key1-->
<span>a</span>
<!--key2-->
<span>b</span>
<!--/json-each-->`
  );

  test(
    "remove last",
    {
      obj: {
        key1: { value: "a" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "prepend",
    {
      obj: {
        key0: { value: "z" },
        key1: { value: "a" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key0-->
<span>z</span>
<!--key1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "insert",
    {
      obj: {
        key0: { value: "z" },
        key2: { value: "b" },
        key1: { value: "a" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key0-->
<span>z</span>
<!--key2-->
<span>b</span>
<!--key1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "swap late",
    {
      obj: {
        key0: { value: "z" },
        key1: { value: "a" },
        key2: { value: "b" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key0-->
<span>z</span>
<!--key1-->
<span>a</span>
<!--key2-->
<span>b</span>
<!--/json-each-->`
  );

  test(
    "swap early",
    {
      obj: {
        key1: { value: "a" },
        key0: { value: "z" },
        key2: { value: "b" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key1-->
<span>a</span>
<!--key0-->
<span>z</span>
<!--key2-->
<span>b</span>
<!--/json-each-->`
  );

  test(
    "swap over",
    {
      obj: {
        key2: { value: "b" },
        key0: { value: "z" },
        key1: { value: "a" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key2-->
<span>b</span>
<!--key0-->
<span>z</span>
<!--key1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "remove first",
    {
      obj: {
        key0: { value: "z" },
        key1: { value: "a" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--key0-->
<span>z</span>
<!--key1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "replace",
    {
      obj: {
        ["a"]: { value: "a" },
        ["b"]: { value: "b" },
        ["c"]: { value: "c" },
        ["d"]: { value: "d" },
        ["e"]: { value: "e" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--a-->
<span>a</span>
<!--b-->
<span>b</span>
<!--c-->
<span>c</span>
<!--d-->
<span>d</span>
<!--e-->
<span>e</span>
<!--/json-each-->`
  );

  test(
    "update",
    {
      obj: {
        ["a"]: { value: "aaa" },
        ["b"]: { value: "bbb" },
        ["c"]: { value: "ccc" },
        ["d"]: { value: "ddd" },
        ["e"]: { value: "eee" },
      },
    },
    `<template json-each="obj">
<span>\${value}</span>
</template><!--a-->
<span>aaa</span>
<!--b-->
<span>bbb</span>
<!--c-->
<span>ccc</span>
<!--d-->
<span>ddd</span>
<!--e-->
<span>eee</span>
<!--/json-each-->`
  );
});
