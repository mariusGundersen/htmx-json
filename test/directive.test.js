describe('directives', () => {
  const classList = (elm, attr, createGetter) => {
    const getter = createGetter(attr.value);
    return ($ctx) => {
      const list = getter($ctx);
      elm.classList.value = list.join(' ');
    }
  }
  beforeAll(() => {
    htmxJson.directives['#class-list'] = classList;
  })
  afterAll(() => {
    htmxJson.directives['#class-list'] = undefined;
  })
  it('should be able to add features', () => {
    const div = document.createElement('div');
    div.innerHTML = `<div #class-list="classes"></div>`;
    htmxJson.swap(div, {
      classes: ['test', 'something', 'here']
    });
    expect(div.innerHTML).toBe(`<div #class-list="classes" class="test something here"></div>`);
  })
})