// @ts-check

const htmxJson = (function () {

  // @ts-ignore
  if (typeof htmx !== 'undefined') {
    // @ts-ignore
    htmx.defineExtension('json-swap', {
      isInlineSwap: function (/** @type {string} */ swapStyle) {
        return swapStyle === 'json'
      },
      handleSwap: function (/** @type {string} */ swapStyle, /** @type {Node} */ target, /** @type {{ textContent: string; }} */ fragment) {
        if (swapStyle === 'json') {
          const json = JSON.parse(fragment.textContent);

          swap(target, json);

          return [target];
        }
      }
    });
  }

  /**
   *
   * @param {Node} elm
   * @param {any} $this
   * @returns {Node}
   */
  function swap(elm, $this) {
    if (elm instanceof DocumentFragment) {
      return recurse(elm, $this);
    } else if (elm instanceof Text) {
      const textGetter = getOrCreate(elm, 'text', () => createTextGetter(elm.textContent));
      if (textGetter) {
        elm.textContent = textGetter($this);
      }
      return elm;
    } else if (elm instanceof HTMLTemplateElement) {
      return handleEach(elm, $this) ?? handleIf(elm, $this) ?? elm;
    } else if (elm instanceof HTMLElement) {
      getOrCreate(elm, 'attributes', () => {
        /** @type {Array<($this: any) => void>} */
        const result = [];
        for (const attr of elm.attributes) {
          if (attr.name.startsWith('@')) {
            const name = attr.name.substring(1);
            const getter = createGetter(attr.value);
            if (!getter) continue;
            result.push(($this) => {
              const value = getter($this);
              if (value === null) {
                elm.removeAttribute(name);
              } else {
                elm.setAttribute(name, value);
              }
            })
          } else if (attr.name.startsWith('.')) {
            const getter = createGetter(attr.value);
            if (!getter) continue;
            const setter = createSetter(kebabChainToCamelChain(attr.name));
            result.push(($this) => setter(elm, getter($this)))
          } else if (attr.name === 'json-text') {
            const getter = createGetter(attr.value);
            if (!getter) continue;
            result.push(($this) => {
              elm.textContent = getter($this);
            })
          } else if (attr.name === 'json-show') {
            const getter = createGetter(attr.value);
            if (!getter) continue;
            result.push(($this) => {
              elm.style.display = getter($this) ? '' : 'none';
            })
          } else if (attr.name === 'json-hide') {
            const getter = createGetter(attr.value);
            if (!getter) continue;
            result.push(($this) => {
              elm.style.display = getter($this) ? 'none' : '';
            })
          } else if (attr.name === 'name') {
            if (elm instanceof HTMLInputElement) {
              if (elm.type === 'checkbox') {
                result.push(($this) => {
                  if (attr.value in $this) {
                    elm.checked = $this[attr.value];
                  }
                })
              } else if (elm.type === 'radio') {
                result.push(($this) => {
                  if (attr.value in $this) {
                    elm.checked = $this[attr.value] === elm.value;
                  }
                })
              } else {
                result.push(($this) => {
                  if (attr.value in $this) {
                    elm.value = $this[attr.value];
                  }
                })
              }
            }
          }
        }
        return result;
      }).forEach(attr => attr($this));

      if (elm.hasAttribute('json-ignore')) {
        return elm;
      } else {
        const getter = getGetter(elm, 'json-with');
        if (getter) {
          return recurse(elm, { ...getter($this), $parent: $this });
        } else {
          return recurse(elm, $this);
        }
      }
    } else {
      return elm;
    }
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {any} $this
   */
  function handleEach(elm, $this) {
    const eachGetter = getGetter(elm, 'json-each');
    if (!eachGetter) return null;
    const end = getOrCreate(elm, 'each-end', () => findComment(elm, '/json-each') ?? elm.parentNode?.insertBefore(document.createComment('/json-each'), elm.nextSibling));
    if (!end) return elm;

    const keyGetter = getGetter(elm, 'json-key');

    let existingComment = elm.nextSibling;
    let previousComment;

    const items = eachGetter($this);

    if (!Array.isArray(items)) {
      throw new Error('for-each only works with arrays');
    }

    for (let $index = 0; $index < items.length; $index++) {
      const item = items[$index];
      const newKey = keyGetter?.(item) ?? $index.toString();

      if (existingComment instanceof Comment && existingComment !== end) {
        const oldKey = existingComment.data;

        if (oldKey === newKey) {
          // Same key
          // * update index
          // * recurse into children
          const child = existingComment.nextSibling;
          existingComment.data = newKey;
          previousComment = existingComment;
          existingComment = findComment(existingComment) ?? end;
          swapUntil(child, existingComment, { ...item, $parent: $this, $index });
        } else {
          // Different keys
          // can oldKey be found somehere later in the existing items?
          //   can newKey be found somewhere later in the existing items?
          //     move existing item with key=newKey here
          //   else
          //     insert the new item here with key=newKey
          // else
          //   remove existing value

          let oldKeyExistsInList = false;
          for (let i = $index; oldKeyExistsInList === false && i < items.length; i++) {
            oldKeyExistsInList = oldKey === (keyGetter?.(items[i]) ?? i);
          }
          if (oldKeyExistsInList) {
            const movingComment = findComment(existingComment, newKey);
            if (movingComment) {
              // Move from old position to current position
              // skipping over the stuff that will be moved
              const oldNextComment = findComment(movingComment) ?? end;

              // update old comment data
              movingComment.data = newKey;

              // move nodes
              const previousSibling = movingComment.previousSibling;
              while (previousSibling?.nextSibling && previousSibling.nextSibling !== oldNextComment) {
                existingComment.parentNode?.insertBefore(previousSibling.nextSibling, existingComment);
              }

              swapUntil(movingComment, existingComment, { ...item, $parent: $this, $index });

              previousComment = movingComment;
            } else {
              // Insert new item
              const clone = elm.content.cloneNode(true);
              const comment = document.createComment(newKey);

              elm.parentNode?.insertBefore(comment, existingComment);
              elm.parentNode?.insertBefore(clone, existingComment);
              swapUntil(comment.nextSibling, existingComment, { ...item, $parent: $this, $index });
              previousComment = comment;
            }
          } else {
            // Remove current item

            // skip over this comment
            const nextComment = findComment(existingComment) ?? end;

            const previousSibling = existingComment.previousSibling;
            while (previousSibling?.nextSibling && previousSibling.nextSibling !== nextComment) {
              previousSibling.nextSibling.remove();
            }

            existingComment = nextComment;
            // since we removed an item we need to subtract it from the current index
            $index--;
          }
        }
      } else if (existingComment === end) {
        // Append item at the end
        const clone = elm.content.cloneNode(true);
        const comment = document.createComment(newKey);

        elm.parentNode?.insertBefore(comment, end);
        elm.parentNode?.insertBefore(clone, end);
        swapUntil(comment.nextSibling, end, { ...item, $parent: $this, $index });
        previousComment = comment;
      } else {
        throw new Error('This should not have happened')
      }
    }

    // Remove everything remaining
    const lastNode = existingComment?.previousSibling;
    if (lastNode) {
      while (lastNode.nextSibling && lastNode.nextSibling !== end) {
        lastNode.nextSibling.remove();
      }
    }

    return end;
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {any} $this
   */
  function handleIf(elm, $this) {
    const ifGetter = getGetter(elm, 'json-if');
    if (!ifGetter) return null;
    const otherwise = getOrCreate(elm, 'else', () => (elm.nextElementSibling instanceof HTMLTemplateElement && elm.nextElementSibling.hasAttribute('json-else')) ? elm.nextElementSibling : undefined);

    const elmOrOtherwise = otherwise ?? elm;

    const end = getOrCreate(elm, 'if-end', () => findComment(elm, '/json-if') ?? elm.parentNode?.insertBefore(document.createComment('/json-if'), elmOrOtherwise.nextSibling));
    if (!end) return elmOrOtherwise;

    if (ifGetter($this)) {
      if (get(elm, 'if') !== true) {
        set(elm, 'if', true);
        while (elmOrOtherwise.nextSibling && elmOrOtherwise.nextSibling !== end) {
          elmOrOtherwise.nextSibling.remove();
        }
        elm.parentNode?.insertBefore(elm.content.cloneNode(true), end);
      }
      swapUntil(elmOrOtherwise.nextSibling, end, $this);
    } else if (otherwise) {
      if (get(elm, 'if') !== false) {
        set(elm, 'if', false);
        while (elmOrOtherwise.nextSibling && elmOrOtherwise.nextSibling !== end) {
          elmOrOtherwise.nextSibling.remove();
        }
        otherwise.parentNode?.insertBefore(otherwise.content.cloneNode(true), end);
      }
      swapUntil(elmOrOtherwise.nextSibling, end, $this);
    } else {
      if (get(elm, 'if') !== false) {
        set(elm, 'if', false);
        while (elmOrOtherwise.nextSibling && elmOrOtherwise.nextSibling !== end) {
          elmOrOtherwise.nextSibling.remove();
        }
      }
    }
    return end;
  }

  /**
   * @param {ChildNode | null} node
   * @param {string} [key]
   * @returns {Comment | null}
   */
  function findComment(node, key) {
    let depth = 0;
    while (node) {
      node = node.nextSibling;
      if (node instanceof Comment) {
        if (depth === 0) {
          if (key === undefined || node.data === key) return node;
        } else {
          depth--;
        }
      } else if (node instanceof HTMLTemplateElement) {
        depth++;
      }
    }
    return null;
  }

  /**
   * @param {Node | null} start
   * @param {any} end
   * @param {any} $this
   */
  function swapUntil(start, end, $this) {
    while (start && start !== end) {
      start = swap(start, $this).nextSibling;
    }
    return start;
  }

  /**
   *
   * @param {Node} parent
   * @param {any} $this
   * @returns {Node}
   */
  function recurse(parent, $this) {
    let elm = parent.firstChild;
    while (elm) {
      elm = swap(elm, $this).nextSibling;
    }
    return parent;
  }

  /**
   * @param {HTMLElement} elm
   * @param {string} attr
   * @returns {Function | null}
   */
  function getGetter(elm, attr) {
    return getOrCreate(elm, `getter-${attr}`, () => createGetter(elm.getAttribute(attr)));
  }

  /**
   * @param {HTMLElement} elm
   * @param {string} name
   */
  function getSetter(elm, name) {
    return getOrCreate(elm, `setter-${name}`, () => createSetter(kebabChainToCamelChain(name)));
  }

  const jsonMap = Symbol();

  /**
   * @param {Node} elm
   * @param {string} key
   */
  function get(elm, key) {
    const map = elm[jsonMap] ??= new Map();
    return map.get(key);
  }

  /**
   * @param {Node} elm
   * @param {string} key
   * @param {any} value
   */
  function set(elm, key, value) {
    const map = elm[jsonMap] ??= new Map();
    map.set(key, value);
  }

  /**
   * @template T
   * @param {Node} elm
   * @param {string} key
   * @param {() => T} factory
   * @returns {T}
   */
  function getOrCreate(elm, key, factory) {
    const map = elm[jsonMap] ??= new Map();
    let value = map.get(key);
    if (value === undefined) {
      value = factory();
      map.set(key, value);
    }
    return value;
  }

  /**
   *
   * @param {String} name
   * @returns {Function}
   */
  function createSetter(name) {
    return new Function('obj', 'value', `obj${name} = value;`)
  }

  /**
   *
   * @param {String | null} value
   * @returns {Function | null}
   */
  function createGetter(value) {
    if (!value) return null;
    return new Function('$this', `
    try {
      with ($this){
        return (${value});
      }
    }catch(e){
      if(e instanceof ReferenceError){
        throw new ReferenceError(e.message + ' in '+JSON.stringify($this, null, 2));
      }
      throw e;
    }
  `);
  }

  /**
   *
   * @param {String | null} value
   * @returns {Function | null}
   */
  function createTextGetter(value) {
    if (!value) return null;
    return new Function('$this', `
    try {
      with ($this){
        return (\`${value}\`);
      }
    }catch(e){
      if(e instanceof ReferenceError){
        throw new ReferenceError(e.message + ' in '+JSON.stringify($this, null, 2));
      }
      throw e;
    }
  `)
  }

  /**
   * @param {string} value
   */
  function kebabChainToCamelChain(value) {
    return value.split('.').map(v => v && kebabToCamel(v)).join('.');
  }

  /**
   * @param {string} value
   */
  function kebabToCamel(value) {
    return value.split('-').map(([a, ...b], i) => (i === 0 ? a : a.toUpperCase()) + b.join('')).join('');
  }

  return {
    swap
  }
})();