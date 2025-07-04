describe('with', () => {
  const div = document.createElement('div');

  it('should go into an object', () => {
    div.innerHTML = `<div json-with="obj">\${value}</div>`;
    htmxJson.swap(div, { obj: { value: 'test' } });
    expect(div.innerHTML).toBe(`<div json-with="obj">test</div>`)
  });

  it('should go out of an object', () => {
    div.innerHTML = `<div json-with="obj"><div json-with="$parent">\${value}</div></div>`;
    htmxJson.swap(div, { obj: { value: 'not this one' }, value: 'test' });
    expect(div.innerHTML).toBe(`<div json-with="obj"><div json-with="$parent">test</div></div>`)
  });
});