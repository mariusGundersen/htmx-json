describe('directives', () => {
  const classListDirective = {
    match: (attr) => attr.name === '#class-list',
    factory: (elm, attr, createGetter) => {
      const getter = createGetter(attr.value);
      return ($ctx, elm) => {
        const list = getter($ctx);
        elm.classList.value = list.join(' ');
      }
    }
  };
  beforeAll(() => {
    htmxJson.directives.push(classListDirective);
  })
  afterAll(() => {
    htmxJson.directives.splice(htmxJson.directives.indexOf(classListDirective), 1);
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