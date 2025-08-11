describe('attributes', () => {
  const div = document.createElement('div');

  it('should set an attribute', () => {
    div.innerHTML = `<span @data-color="color">red</span>`;
    htmxJson.swap(div, { color: 'red' });
    expect(div.innerHTML).toBe(`<span @data-color="color" data-color="red">red</span>`);
  });

  it('should remove an attribute when the value is null', () => {
    div.innerHTML = `<span @data-color="color">red</span>`;
    htmxJson.swap(div, { color: null });
    expect(div.hasAttribute('data-color')).toBeFalse();
  });
});