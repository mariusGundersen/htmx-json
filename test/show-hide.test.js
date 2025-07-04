describe('show and hide', () => {
  const div = document.createElement('div');

  it('should show when true', () => {
    div.innerHTML = `<span json-show="visible">something</span>`;
    htmxJson.swap(div, { visible: true });
    expect(div.innerHTML).toBe(`<span json-show="visible">something</span>`)
  });

  it('should not show when false', () => {
    div.innerHTML = `<span json-show="visible">something</span>`;
    htmxJson.swap(div, { visible: false });
    expect(div.innerHTML).toBe(`<span json-show="visible" style="display: none;">something</span>`)
  });

  it('should hide when true', () => {
    div.innerHTML = `<span json-hide="hidden">something</span>`;
    htmxJson.swap(div, { hidden: true });
    expect(div.innerHTML).toBe(`<span json-hide="hidden" style="display: none;">something</span>`)
  });

  it('should not hide when false', () => {
    div.innerHTML = `<span json-hide="hidden">something</span>`;
    htmxJson.swap(div, { hidden: false });
    expect(div.innerHTML).toBe(`<span json-hide="hidden">something</span>`)
  });
});