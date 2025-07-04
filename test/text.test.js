describe('text', () => {
  const div = document.createElement('div');

  it('should replace inline', () => {
    div.innerHTML = `<span>\${value}</span>`;
    htmxJson.swap(div, { value: 'test' });
    expect(div.innerHTML).toBe(`<span>test</span>`)
  });

  it('should not replace inline when the element has json-ignore', () => {
    div.innerHTML = `<span json-ignore>\${value}</span>`;
    htmxJson.swap(div, { value: 'test' });
    expect(div.innerHTML).toBe(`<span json-ignore="">\${value}</span>`)
  });

  it('should replace using attribute', () => {
    div.innerHTML = `<span json-text="value">old value</span>`;
    htmxJson.swap(div, { value: 'test' });
    expect(div.innerHTML).toBe(`<span json-text="value">test</span>`)
  });

  it('should replace using textContent property', () => {
    div.innerHTML = `<span .text-content="value">old value</span>`;
    htmxJson.swap(div, { value: 'test' });
    expect(div.innerHTML).toBe(`<span .text-content="value">test</span>`)
  });

});