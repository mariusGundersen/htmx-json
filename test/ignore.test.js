describe("ignore", () => {
  let div;
  beforeEach(() => {
    div = document.createElement("div");
  });

  it("should ignore children", () => {
    div.innerHTML = `<span json-ignore>\${value}</span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span json-ignore="">\${value}</span>`);
  });

  it("should ignore subsequent attributes", () => {
    div.innerHTML = `<span json-ignore @data-test="value"></span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(
      `<span json-ignore="" @data-test="value"></span>`
    );
  });

  it("should ignore subsequent properties", () => {
    div.innerHTML = `<span json-ignore .text-content="value"></span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(
      `<span json-ignore="" .text-content="value"></span>`
    );
  });

  it("should only ignore when truthy", () => {
    div.innerHTML = `<span json-ignore="true">\${value}</span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span json-ignore="true">\${value}</span>`);
  });

  it("should not ignore when falsy", () => {
    div.innerHTML = `<span json-ignore="false">\${value}</span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span json-ignore="false">test</span>`);
  });

  it("should be possible to compare $this with $prev", () => {
    div.innerHTML = `<span json-ignore="$this.key === $prev?.key">\${value}</span>`;
    htmxJson.swap(div, { value: "test", key: 'a' });
    htmxJson.swap(div, { value: "replaced", key: 'a' });
    expect(div.innerHTML).toBe(`<span json-ignore="$this.key === $prev?.key">test</span>`);
  });
});
