describe("if", () => {
  const div = document.createElement("div");

  it("should show when truthy", () => {
    div.innerHTML = `<template json-if="condition">Shown</template>`;
    htmxJson.swap(div, { condition: true });
    expect(div.innerHTML).toBe(
      `<template json-if="condition">Shown</template>Shown<!--/json-if-->`
    );
  });

  it("should not show when falsy", () => {
    div.innerHTML = `<template json-if="condition">Shown</template>`;
    htmxJson.swap(div, { condition: false });
    expect(div.innerHTML).toBe(
      `<template json-if="condition">Shown</template><!--/json-if-->`
    );
  });

  it("should show else when falsy", () => {
    div.innerHTML = `<template json-if="condition">First</template><template json-else>Second</template>`;
    htmxJson.swap(div, { condition: false });
    expect(div.innerHTML).toBe(
      `<template json-if="condition">First</template><template json-else="">Second</template>Second<!--/json-if-->`
    );
  });

  it("should show if when truthy", () => {
    div.innerHTML = `<template json-if="condition">First</template><template json-else>Second</template>`;
    htmxJson.swap(div, { condition: true });
    expect(div.innerHTML).toBe(
      `<template json-if="condition">First</template><template json-else="">Second</template>First<!--/json-if-->`
    );
  });

  describe("nested", () => {
    beforeAll(() => {
      div.innerHTML = `
        <template json-if="a">
          <template json-if="b">
            ab
          </template>
          <template json-else>
            a
          </template>
        </template>
        <template json-else>
          <template json-if="b">
            b
          </template>
          <template json-else>
            -
          </template>
        </template>`;
    });

    it("should initialize", () => {
      htmxJson.swap(div, { a: true, b: true });
      expect(div.textContent.replaceAll(/\s/g, "")).toBe("ab");
    });

    it("should swap inner", () => {
      htmxJson.swap(div, { a: true, b: false });
      expect(div.textContent.replaceAll(/\s/g, "")).toBe("a");
    });

    it("should swap outer", () => {
      htmxJson.swap(div, { a: false, b: true });
      expect(div.textContent.replaceAll(/\s/g, "")).toBe("b");
    });
  });

  describe("with each inside", () => {
    beforeAll(() => {
      div.innerHTML = `
        <template json-if="a">
          <template json-each="list">
            \${$this}
          </template>
        </template>
          <template json-each="list">
            \${$this}
          </template><!--0-->
            1
          <!--1-->
            2
          <!--2-->
            3
          <!--/json-each-->
        <!--/json-if-->`;
    });

    it("should initialize", () => {
      htmxJson.swap(div, { a: true, list: [1, 2, 3] });
      expect(div.textContent.replaceAll(/\s/g, "")).toBe("123");
    });

    it("should remove everything", () => {
      htmxJson.swap(div, { a: false, list: [1, 2, 3] });
      expect(div.textContent.replaceAll(/\s/g, "")).toBe("");
    });
  });
});
