describe("each nested", () => {
  const div = document.createElement("div");
  beforeAll(() => {
    div.innerHTML = `
    <template json-each="a">
      <template json-each="$this">
        <span>\${$this}</span>
      </template>
    </template>`;
  });

  it("should initialize", () => {
    htmxJson.swap(div, {
      a: [
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["g", "h", "i"],
      ],
    });
    expect(div.textContent.replaceAll(/\s/g, "")).toBe("abcdefghi");
  });

  it("should be swappable", () => {
    htmxJson.swap(div, {
      a: [
        ["a", "b", "c"],
        ["g", "h", "i"],
        ["d", "e", "f"],
      ],
    });
    expect(div.textContent.replaceAll(/\s/g, "")).toBe("abcghidef");
  });
});
