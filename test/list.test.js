describe("list", () => {
  const div = document.createElement("div");

  it("should have $index", () => {
    div.innerHTML = `<template json-each="list">
<span>\${$index}: \${$this}</span>
</template>`;
    htmxJson.swap(div, { list: ["a", "b", "c"] });
    expect(div.innerHTML).toBe(`<template json-each="list">
<span>\${$index}: \${$this}</span>
</template><!--0-->
<span>0: a</span>
<!--1-->
<span>1: b</span>
<!--2-->
<span>2: c</span>
<!--/json-each-->`);
  });

  it("should have $key", () => {
    div.innerHTML = `<template json-each="list" json-key="$this">
<span>\${$key}: \${$this}</span>
</template>`;
    htmxJson.swap(div, { list: ["a", "b", "c"] });
    expect(div.innerHTML).toBe(`<template json-each="list" json-key="$this">
<span>\${$key}: \${$this}</span>
</template><!--a-->
<span>a: a</span>
<!--b-->
<span>b: b</span>
<!--c-->
<span>c: c</span>
<!--/json-each-->`);
  });
});
