describe("each nested", () => {
  const div = document.createElement("div");
  beforeAll(() => {
    div.innerHTML = `
    <template json-each="list" json-key="key">
      <template json-each="list">
        <span>\${$this}</span>
      </template>
    </template>`;
  });

  it("should initialize", () => {
    htmxJson.swap(div, {
      list: [
        { key: "a", list: ["a", "b", "c"] },
        { key: "b", list: ["d", "e", "f"] },
        { key: "c", list: ["g", "h", "i"] },
      ],
    });
    expect(div.textContent.replaceAll(/\s/g, "")).toBe("abcdefghi");
  });

  it("should be swappable", () => {
    htmxJson.swap(div, {
      list: [
        { key: "a", list: ["a", "b", "c"] },
        { key: "c", list: ["g", "h", "i"] },
        { key: "b", list: ["d", "e", "f"] },
      ],
    });
    expect(div.textContent.replaceAll(/\s/g, "")).toBe("abcghidef");
  });
});
