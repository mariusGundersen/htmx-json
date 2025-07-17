describe("text", () => {
  const div = document.createElement("div");

  it("should replace inline", () => {
    div.innerHTML = `<span>\${value}</span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span>test</span>`);
  });

  it("should not replace inline when the element has json-ignore", () => {
    div.innerHTML = `<span json-ignore>\${value}</span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span json-ignore="">\${value}</span>`);
  });

  it("should replace using attribute", () => {
    div.innerHTML = `<span json-text="value">old value</span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span json-text="value">test</span>`);
  });

  it("should replace using textContent property", () => {
    div.innerHTML = `<span .text-content="value">old value</span>`;
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span .text-content="value">test</span>`);
  });

  it("should not replace text content without any interpolation", () => {
    div.innerHTML = `<span>test</span>`;
    const textNode = div.firstElementChild.firstChild;
    let textContent = textNode.textContent;
    let textContentSet = false;
    Object.defineProperty(textNode, "textContent", {
      set(v) {
        textContent = v;
        textContentSet = true;
      },
      get() {
        return textContent;
      },
    });
    htmxJson.swap(div, { value: "test" });
    expect(div.innerHTML).toBe(`<span>test</span>`);
    expect(textContentSet).toBeFalse();
  });
});
