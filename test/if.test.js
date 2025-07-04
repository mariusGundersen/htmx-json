describe('if', () => {
  const div = document.createElement('div');

  it('should show when truthy', () => {
    div.innerHTML = `<template json-if="condition">Shown</template>`;
    htmxJson.swap(div, { condition: true });
    expect(div.innerHTML).toBe(`<template json-if="condition">Shown</template>Shown<!--/json-if-->`)
  });

  it('should not show when falsy', () => {
    div.innerHTML = `<template json-if="condition">Shown</template>`;
    htmxJson.swap(div, { condition: false });
    expect(div.innerHTML).toBe(`<template json-if="condition">Shown</template><!--/json-if-->`)
  });

  it('should show else when falsy', () => {
    div.innerHTML = `<template json-if="condition">First</template><template json-else>Second</template>`;
    htmxJson.swap(div, { condition: false });
    expect(div.innerHTML).toBe(`<template json-if="condition">First</template><template json-else="">Second</template>Second<!--/json-if-->`)
  });

  it('should show if when truthy', () => {
    div.innerHTML = `<template json-if="condition">First</template><template json-else>Second</template>`;
    htmxJson.swap(div, { condition: true });
    expect(div.innerHTML).toBe(`<template json-if="condition">First</template><template json-else="">Second</template>First<!--/json-if-->`)
  });

});