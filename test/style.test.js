describe('style', () => {
  const div = document.createElement('div');

  it('should set background color', () => {
    div.innerHTML = `<span .style.background-color="color">red</span>`;
    htmxJson.swap(div, { color: 'red' });
    expect(div.innerHTML).toBe(`<span .style.background-color="color" style="background-color: red;">red</span>`)
  });
});