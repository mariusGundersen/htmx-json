describe("with", () => {
  let div = document.createElement("div");
  beforeEach(() => {
    div = document.createElement("div");
  })

  it("should go into an object", () => {
    div.innerHTML = `<div json-with="obj">\${value}</div>`;
    htmxJson.swap(div, { obj: { value: "test" } });
    expect(div.innerHTML).toBe(`<div json-with="obj">test</div>`);
  });

  it("should go out of an object", () => {
    div.innerHTML = `<div json-with="obj"><div json-with="$parent">\${value}</div></div>`;
    htmxJson.swap(div, { obj: { value: "not this one" }, value: "test" });
    expect(div.innerHTML).toBe(
      `<div json-with="obj"><div json-with="$parent">test</div></div>`
    );
  });

  it("should nest deeply", () => {
    div.innerHTML = `<div json-with="obj"><div json-with="obj">\${$parent.$parent.value}</div></div>`;
    htmxJson.swap(div, {
      obj: { obj: { value: "not this one" } },
      value: "test",
    });
    expect(div.innerHTML).toBe(
      `<div json-with="obj"><div json-with="obj">test</div></div>`
    );
  });

  it("should work with simple types", () => {
    div.innerHTML = `<div json-with="value">\${$parent.name}: \${$this}</div>`;
    htmxJson.swap(div, {
      value: 4,
      name: "test",
    });
    expect(div.innerHTML).toBe(`<div json-with="value">test: 4</div>`);
  });

  it("should apply to subsequent attributes", () => {
    div.innerHTML = `<div json-with="obj" .text-content="value"></div>`;
    htmxJson.swap(div, {
      obj: { value: 4 },
    });
    expect(div.innerHTML).toBe(
      `<div json-with="obj" .text-content="value">4</div>`
    );
  });

  it("should work like ignore, if it returns undefined, null or false", () => {
    div.innerHTML = `<div json-with="obj">\${value}</div>`;
    htmxJson.swap(div, {
      obj: undefined,
    });
    expect(div.innerHTML).toBe(
      `<div json-with="obj">\${value}</div>`
    );
  });

  it("should be able to use $prev", () => {
    div.innerHTML = `<div json-with="{...$prev, ...obj}">$\{value}</div>`;
    htmxJson.swap(div, {
      obj: { value: 4 },
    });
    htmxJson.swap(div, {
      obj: {}
    })
    expect(div.innerHTML).toBe(
      `<div json-with="{...$prev, ...obj}">4</div>`
    );
  });
});
