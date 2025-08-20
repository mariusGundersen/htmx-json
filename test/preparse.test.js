describe("preparse", () => {
  let profiling = 0;
  const profilingDirective = {
    match: (attr) => attr.name === '#profile',
    factory: (elm, attr, createGetter) => {
      profiling++;
      return ($ctx) => {
        // do nothing
      }
    }
  };
  beforeAll(() => {
    htmxJson.directives.push(profilingDirective);
  })
  afterAll(() => {
    htmxJson.directives.splice(htmxJson.directives.indexOf(profilingDirective), 1);
  })

  let div = document.createElement("div");
  beforeEach(() => {
    div = document.createElement("div");
    profiling = 0;
  });

  it("should only create the #profiling once", () => {
    div.innerHTML = `<template json-each="list"><span #profile>\${$this} </span></template>`;
    htmxJson.swap(div, { list: ['one', 'two', 'three'] });
    expect(div.textContent).toBe(`one two three `);
    expect(profiling).toBe(1)
  });
  it("should only create the #profiling once also with nested templates", () => {
    div.innerHTML = `<template json-each="list"><template json-if="true"><span #profile>\${$this} </span></template></template>`;
    htmxJson.swap(div, { list: ['one', 'two', 'three'] });
    expect(div.textContent).toBe(`one two three `);
    expect(profiling).toBe(1)
  });
});
