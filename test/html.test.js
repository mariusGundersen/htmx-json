describe('html', () => {
  const div = document.createElement('div');

  it('should set the innerHTML', () => {
    div.innerHTML = `<span .inner-h-t-m-l="value"></span>`;
    htmxJson.swap(div, { value: '<em>TEST</em>' });
    expect(div.innerHTML).toBe(`<span .inner-h-t-m-l="value"><em>TEST</em></span>`)
  });
});