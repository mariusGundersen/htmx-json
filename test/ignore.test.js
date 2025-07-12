describe("ignore", () => {
  const div = document.createElement("div");

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
});
