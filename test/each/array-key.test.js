describe("each over array with key", () => {
  const div = document.createElement("div");
  div.innerHTML = `<template json-each="list" json-key="key">
<span>\${value}</span>
</template>`;

  function test(
    /** @type {string} */ name,
    /** @type {{ list: { key: string; value: string; }[] }} */ json,
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
      list: [{ key: "1", value: "a" }],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "append",
    {
      list: [
        { key: "1", value: "a" },
        { key: "2", value: "b" },
      ],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--1-->
<span>a</span>
<!--2-->
<span>b</span>
<!--/json-each-->`
  );

  test(
    "remove last",
    {
      list: [{ key: "1", value: "a" }],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "prepend",
    {
      list: [
        { key: "0", value: "z" },
        { key: "1", value: "a" },
      ],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "insert",
    {
      list: [
        { key: "0", value: "z" },
        { key: "2", value: "b" },
        { key: "1", value: "a" },
      ],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--2-->
<span>b</span>
<!--1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "swap late",
    {
      list: [
        { key: "0", value: "z" },
        { key: "1", value: "a" },
        { key: "2", value: "b" },
      ],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--1-->
<span>a</span>
<!--2-->
<span>b</span>
<!--/json-each-->`
  );

  test(
    "swap early",
    {
      list: [
        { key: "1", value: "a" },
        { key: "0", value: "z" },
        { key: "2", value: "b" },
      ],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--1-->
<span>a</span>
<!--0-->
<span>z</span>
<!--2-->
<span>b</span>
<!--/json-each-->`
  );

  test(
    "swap over",
    {
      list: [
        { key: "2", value: "b" },
        { key: "0", value: "z" },
        { key: "1", value: "a" },
      ],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--2-->
<span>b</span>
<!--0-->
<span>z</span>
<!--1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "remove first",
    {
      list: [
        { key: "0", value: "z" },
        { key: "1", value: "a" },
      ],
    },
    `<template json-each="list" json-key="key">
<span>\${value}</span>
</template><!--0-->
<span>z</span>
<!--1-->
<span>a</span>
<!--/json-each-->`
  );

  test(
    "replace",
    {
      list: [
        { key: "a", value: "a" },
        { key: "b", value: "b" },
        { key: "c", value: "c" },
        { key: "d", value: "d" },
        { key: "e", value: "e" },
      ],
    },
    `<template json-each="list" json-key="key">
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
      list: [
        { key: "a", value: "aaa" },
        { key: "b", value: "bbb" },
        { key: "c", value: "ccc" },
        { key: "d", value: "ddd" },
        { key: "e", value: "eee" },
      ],
    },
    `<template json-each="list" json-key="key">
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
