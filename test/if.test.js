describe("if", () => {
  const div = document.createElement("div");

  it("should show when truthy", () => {
    div.innerHTML = `<template json-if="condition">Shown</template>`;
    htmxJson.swap(div, { condition: true });
    expect(div.innerHTML).toBe(
      `<template json-if="condition">Shown</template><!--json-if-->Shown<!--/json-if-->`
    );
  });

  it("should not show when falsy", () => {
    div.innerHTML = `<template json-if="condition">Shown</template>`;
    htmxJson.swap(div, { condition: false });
    expect(div.innerHTML).toBe(
      `<template json-if="condition">Shown</template><!--json-else--><!--/json-if-->`
    );
  });

  it("should show else when falsy", () => {
    div.innerHTML = `
      <template json-if="condition">First</template>
      <template json-else>Second</template>
    `;
    htmxJson.swap(div, { condition: false });
    expect(div.innerHTML).toBe(`
      <template json-if="condition">First</template>
      <template json-else="">Second</template><!--json-else-->Second<!--/json-if-->
    `);
  });

  it("should show if when truthy", () => {
    div.innerHTML = `
      <template json-if="condition">First</template>
      <template json-else>Second</template>
    `;
    htmxJson.swap(div, { condition: true });
    expect(div.innerHTML).toBe(`
      <template json-if="condition">First</template>
      <template json-else="">Second</template><!--json-if-->First<!--/json-if-->
    `    );
  });

  it("should not replace the existing markup", () => {
    div.innerHTML = `
      <template json-if="condition">
        <span>First</span>
      </template>
      <!--json-if-->
        <span>First</span>
      <!--/json-if-->
    `;
    const spanBefore = div.querySelector('span');
    htmxJson.swap(div, { condition: true });
    const spanAfter = div.querySelector('span');
    expect(spanBefore).toBe(spanAfter);
  });

  describe("and else-if", () => {

    it("should show else-if", () => {
      div.innerHTML = `
      <template json-if="value === 0">
        <span>First</span>
      </template>
      <template json-else-if="value === 1">
        <span>Second</span>
      </template>
      <template json-else>
        <span>Third</span>
      </template>
    `;
      htmxJson.swap(div, { value: 1 });
      expect(div.innerHTML).toBe(`
      <template json-if="value === 0">
        <span>First</span>
      </template>
      <template json-else-if="value === 1">
        <span>Second</span>
      </template>
      <template json-else="">
        <span>Third</span>
      </template><!--json-else-if 0-->
        <span>Second</span>
      <!--/json-if-->
    `);
    });
    it("should handle many else-if", () => {
      div.innerHTML = `
      <template json-if="value === 0">
        <span>First</span>
      </template>
      <template json-else-if="value === 1">
        <span>Second</span>
      </template>
      <template json-else-if="value === 2">
        <span>Third</span>
      </template>
      <template json-else-if="value === 3">
        <span>Fourth</span>
      </template>
      <template json-else-if="value === 4">
        <span>Fifth</span>
      </template>
      <template json-else>
        <span>Sixth</span>
      </template>
    `;
      htmxJson.swap(div, { value: 3 });
      expect(div.innerHTML).toBe(`
      <template json-if="value === 0">
        <span>First</span>
      </template>
      <template json-else-if="value === 1">
        <span>Second</span>
      </template>
      <template json-else-if="value === 2">
        <span>Third</span>
      </template>
      <template json-else-if="value === 3">
        <span>Fourth</span>
      </template>
      <template json-else-if="value === 4">
        <span>Fifth</span>
      </template>
      <template json-else="">
        <span>Sixth</span>
      </template><!--json-else-if 2-->
        <span>Fourth</span>
      <!--/json-if-->
    `);
    });
  })

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
          <!--json-if-->
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
