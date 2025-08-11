// @ts-check

var HTMX_JSON_DEBUG = true;
const htmxJson = (function () {
  if (typeof htmx !== "undefined") {
    htmx.defineExtension("json-swap", {
      isInlineSwap: function (/** @type {string} */ swapStyle) {
        return swapStyle === "json";
      },
      handleSwap: function (
        /** @type {string} */ swapStyle,
        /** @type {Node} */ target,
        /** @type {{ textContent: string; }} */ fragment
      ) {
        if (swapStyle === "json") {
          const json = JSON.parse(fragment.textContent);

          swap(target, createContext(json));

          return [target];
        }
      },
    });
  }

  /**
   * @param {any} $this
   * @param {Context} [$ctx]
   * @param {number} [$index]
   * @param {string} [$key]
   * @returns {Context}
   */
  function createContext($this, $ctx, $index, $key) {
    return {
      $this,
      $parent: $ctx && { ...$ctx, __proto__: $ctx.$this },
      $index,
      $key,
    };
  }

  /**
   * @typedef {{
   *   $this: any,
   *   $parent: any | undefined,
   *   $index: number | undefined,
   *   $key: string | undefined
   * }} Context
   */

  /**
   * @typedef {($ctx: C) => any} Getter<C>
   * @template {Context} [C=Context]
   */

  /**
   *
   * @param {Node} elm
   * @param {Context} $ctx
   * @param {Node} [end]
   * @returns {Node | null} `null` if there is nothing to swap here
   */
  function swap(elm, $ctx, end) {
    if (elm instanceof Text) {
      const textGetter = getOrCreate(elm, "text", createTextGetter);
      if (!textGetter) return null;
      elm.textContent = textGetter($ctx);
      return elm;
    } else if (elm instanceof HTMLTemplateElement) {
      return handleEach(elm, $ctx, end) ?? handleIf(elm, $ctx, end) ?? elm;
    } else if (elm instanceof HTMLElement) {
      /** @type {false | null | Context} */
      let nextCtx = $ctx;
      const attrs = getOrCreate(elm, "attributes", createAttributeHandler);
      for (const attr of attrs) {
        if (!nextCtx) break;
        const ctx = attr(nextCtx);
        nextCtx = ctx === undefined ? nextCtx : ctx;
      }

      if (nextCtx === null) {
        // there is a json-ignore in the attribute list
        // if that's the only attr then we can ignore this element completely
        return attrs.length === 1 ? null : elm;
      } else if (nextCtx === false) {
        // false means ignore this time, but don't ignore this subtree, as it
        // might not be ignored next time
        return elm;
      } else {
        // Swap every child of this element
        const allIgnored = swapFromTo(
          elm.firstChild,
          undefined,
          nextCtx);

        // if none of the children or this element
        // need swapping, then add an ignore attribute
        // and tell the parent node that it this is not
        // a node of interest
        if (allIgnored && attrs.length === 0) {
          set(elm, "attributes", [() => false]);
          return null;
        } else {
          return elm;
        }
      }
    } else {
      return elm;
    }
  }

  /**
   * @param {Text} elm
   * @returns {Getter | null}
   */
  function createTextGetter(elm) {
    return elm.textContent?.includes("${")
      ? createGetter("`" + elm.textContent + "`")
      : null;
  }

  /**
   * @typedef {($ctx: Context) => (Context | false | null | void)} AttributeHandler
   */

  /**
   * @typedef {(elm: HTMLElement, attr: Attr, createGetter: CreateGetter) => (AttributeHandler | undefined | null)} AttributeHandlerFactory
   */


  /** @type {Array<{match: (attr: Attr) => boolean, factory: AttributeHandlerFactory}>} */
  const directives = [
    {
      match: (attr) => attr.name.startsWith("@"),
      factory(elm, attr, createGetter) {
        const name = attr.name.substring(1);
        const getter = createGetter(attr.value);

        if (HTMX_JSON_DEBUG && !getter) {
          console.warn(`Missing value for attribute ${attr.name}`, elm);
          return undefined;
        } else if (!getter) return undefined;

        return ($ctx) => {
          const value = getter($ctx);
          if (value === null) {
            elm.removeAttribute(name);
          } else {
            elm.setAttribute(name, value);
          }
          return $ctx;
        };
      }
    },
    {
      match: (attr) => attr.name.startsWith('.'),
      factory(elm, attr, createGetter) {
        const getter = createGetter(attr.value);

        if (HTMX_JSON_DEBUG && !getter) {
          console.warn(`Missing value for attribute ${attr.name}`, elm);
          return undefined;
        } else if (!getter) return undefined;

        const setter = createSetter(kebabChainToCamelChain(attr.name));
        return ($ctx) => {
          setter(elm, getter($ctx));
          return $ctx;
        };
      }
    },
    {
      match: attr => attr.name === 'json-ignore',
      factory(elm, attr, createGetter) {
        const getter = createGetter(attr.value, "$prev");
        let $prev = undefined;
        if (getter === null) {
          return null;
        }
        return ($ctx) => {
          if (getter({ ...$ctx, $prev })) {
            return false;
          } else {
            $prev = $ctx.$this;
          }
        };
      },
    },
    {
      match: attr => attr.name === 'json-with',
      factory(elm, attr, createGetter) {
        const getter = createGetter(attr.value, "$prev");
        let $prev = undefined;

        if (HTMX_JSON_DEBUG && !getter) {
          console.warn("Missing value for attribute json-with", elm);
          return undefined;
        } else if (!getter) return undefined;

        return ($ctx) => {
          const newThis = getter({ ...$ctx, $prev });
          if (!newThis) {
            return false;
          }
          $prev = newThis;
          return createContext(newThis, $ctx);
        };
      },
    },
    {
      match: attr => attr.name === 'json-text',
      factory(elm, attr, createGetter) {
        const getter = createGetter(attr.value);

        if (HTMX_JSON_DEBUG && !getter) {
          console.warn("Missing value for attribute json-text", elm);
          return undefined;
        } else if (!getter) return undefined;

        return ($ctx) => {
          elm.textContent = getter($ctx);
        };
      },
    },
    {
      match: attr => attr.name === 'json-show',
      factory(elm, attr, createGetter) {
        const getter = createGetter(attr.value);

        if (HTMX_JSON_DEBUG && !getter) {
          console.warn("Missing value for attribute json-show", elm);
          return undefined;
        } else if (!getter) return undefined;

        return ($ctx) => {
          elm.style.display = getter($ctx) ? "" : "none";
        };
      },
    },
    {
      match: attr => attr.name === 'json-hide',
      factory(elm, attr, createGetter) {
        const getter = createGetter(attr.value);

        if (HTMX_JSON_DEBUG && !getter) {
          console.warn("Missing value for attribute json-hide", elm);
          return undefined;
        } else if (!getter) return undefined;

        return ($ctx) => {
          elm.style.display = getter($ctx) ? "none" : "";
        };
      },
    },
    {
      match: attr => attr.name === 'name',
      factory(elm, attr, createGetter) {
        if (elm instanceof HTMLInputElement) {
          if (elm.type === "checkbox") {
            return ($ctx) => {
              if (typeof $ctx.$this === 'object' && $ctx.$this !== null) {
                const value = $ctx.$this[attr.value];
                if (value !== undefined) {
                  elm.checked = value;
                }
              }
            };
          } else if (elm.type === "radio") {
            return ($ctx) => {
              if (typeof $ctx.$this === 'object' && $ctx.$this !== null) {
                const value = $ctx.$this[attr.value];
                if (value !== undefined) {
                  elm.checked = value === elm.value;
                }
              }
            };
          } else {
            return ($ctx) => {
              if (typeof $ctx.$this === 'object' && $ctx.$this !== null) {
                const value = $ctx.$this[attr.value];
                if (value !== undefined) {
                  elm.value = value;
                }
              }
            };
          }
        } else if (elm instanceof HTMLSelectElement || elm instanceof HTMLTextAreaElement) {
          return ($ctx) => {
            if (typeof $ctx.$this === 'object' && $ctx.$this !== null) {
              const value = $ctx.$this[attr.value];
              if (value !== undefined) {
                elm.value = value;
              }
            }
          };
        }
      }
    }
  ]

  /**
   * @param {HTMLElement} elm
   * @returns {Array<AttributeHandler>}
   */
  function createAttributeHandler(elm) {
    /** @type {Array<AttributeHandler>} */
    const result = [];

    // Using for of here, so that added attributes from the factories are picked up
    for (const attr of elm.attributes) {
      const handlerFactory = directives.find(f => f.match(attr))?.factory;
      const handler = handlerFactory?.(elm, attr, createGetter);
      if (handler) {
        result.push(handler);
      } else if (handler === null) {
        result.push(() => null);
        break;
      }
    }

    return result;
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {Context} $ctx
   * @param {Node} [parentEnd]
   */
  function handleEach(elm, $ctx, parentEnd) {
    const eachGetter = getGetter(elm, "json-each");
    if (!eachGetter) return null;
    const end = getOrCreate(elm, "/json-each", findOrCreateComment, parentEnd);
    if (!end) return elm;

    const oldList = getOrCreate(elm, "existingList", getExistingList, end);

    const newList = getItemsMap(eachGetter, $ctx, elm);

    let $index;
    for ($index = 0; $index < newList.length; $index++) {
      const [newKey, item] = newList[$index];
      const oldComment = oldList[$index];

      if (oldComment instanceof Comment) {
        const oldKey = oldComment.data;

        if (oldKey === newKey) {
          // Same key
          // * update index
          // * recurse into children
          swapFromTo(
            oldComment.nextSibling,
            oldList[$index + 1] ?? end,
            createContext(item, $ctx, $index, newKey)
          );
        } else {
          // Different keys
          // can oldKey be found somehere later in the new items?
          //   can newKey be found somewhere later in the existing items?
          //     move existing item with key=newKey here
          //   else
          //     insert the new item here with key=newKey
          // else
          //   remove existing value

          const oldKeyIndexInNewList = findIndexInNewList(newList, oldKey, $index);
          if (oldKeyIndexInNewList >= 0) {
            const newKeyIndexInOldList = findIndexInOldList(oldList, newKey, $index);
            if (newKeyIndexInOldList > oldKeyIndexInNewList) {
              // An existing item has been moved forward from the back of the array
              // Move from old position to current position
              const movingComment = oldList[newKeyIndexInOldList];
              const oldNextComment = oldList[newKeyIndexInOldList + 1] ?? end;

              // move nodes
              moveFromUntilBeforeTo(movingComment, oldNextComment, oldComment);

              swapFromTo(
                movingComment,
                oldComment,
                createContext(item, $ctx, $index, newKey)
              );

              oldList.splice($index, 0, ...oldList.splice(newKeyIndexInOldList, 1));
            } else if (newKeyIndexInOldList >= 0) {
              // An existing item has been moved back from the front of the array
              // Move old item to the new position

              const nextComment = oldList[$index + 1] ?? end;
              const newBefore = oldList[oldKeyIndexInNewList + 1] ?? end;
              moveFromUntilBeforeTo(oldComment, nextComment, newBefore);

              oldList.splice(oldKeyIndexInNewList, 0, ...oldList.splice($index, 1));
              $index--;
            } else {
              // Insert new item
              const clone = elm.content.cloneNode(true);
              const comment = document.createComment(newKey);

              oldList.splice($index, 0, comment);

              elm.parentNode?.insertBefore(comment, oldComment);
              elm.parentNode?.insertBefore(clone, oldComment);
              swapFromTo(
                comment.nextSibling,
                oldComment,
                createContext(item, $ctx, $index, newKey)
              );
            }
          } else {
            // Remove current item
            const nextComment = oldList[$index + 1] ?? end;

            removeFromTo(oldComment, nextComment);

            oldList.splice($index, 1);
            // since we removed an item we need to subtract it from the current index
            $index--;
          }
        }
      } else {
        // Append item at the end
        const clone = elm.content.cloneNode(true);
        const comment = document.createComment(newKey);
        oldList.push(comment);

        elm.parentNode?.insertBefore(comment, end);
        elm.parentNode?.insertBefore(clone, end);
        swapFromTo(
          comment.nextSibling,
          end,
          createContext(item, $ctx, $index, newKey)
        );
      }
    }

    // Remove everything remaining
    const oldComment = oldList[$index];
    if (oldComment) {
      removeFromTo(oldComment, end);
      oldList.splice($index, oldList.length - $index);
    }

    return end;
  }

  /**
   * @param {Comment[]} list
   * @param {string} key
   */
  function findIndexInOldList(list, key, start = 0) {
    for (; start < list.length; start++) {
      if (list[start].data === key) return start;
    }
    return -1;
  }

  /**
   * @param {[string, any][]} list
   * @param {string} key
   */
  function findIndexInNewList(list, key, start = 0) {
    for (; start < list.length; start++) {
      if (list[start][0] === key) return start;
    }
    return -1;
  }

  /**
   * @param {Getter} eachGetter
   * @param {Context} $ctx
   * @param {HTMLElement} elm
   * @returns {[string, any][]}
   */
  function getItemsMap(eachGetter, $ctx, elm) {
    const items = eachGetter($ctx);

    const keyGetter = getGetter(elm, "json-key");

    if (!items) {
      return [];
    } else if (Array.isArray(items)) {
      return items.map((item, index) => [
        keyGetter ? keyGetter(createContext(item)) : index.toString(),
        item,
      ]);
    } else if (typeof items === "object") {
      if (HTMX_JSON_DEBUG && keyGetter)
        console.warn("json-key is not used when json-each is an object");
      return Object.entries(items).map(([key, value]) => {
        if (HTMX_JSON_DEBUG && Number(key) >= 0)
          console.warn(
            `Objects with integer keys will be iterated over in unexpected order!\nFound key ${key} in ${JSON.stringify(
              items
            )}`
          );
        return [key, value];
      });
    } else {
      if (HTMX_JSON_DEBUG) {
        console.warn(
          `each expects an array or object, got ${JSON.stringify(items)} on ${elm.outerHTML
          }`
        );
      }
      return [];
    }
  }

  /**
   * @param {ChildNode} elm
   * @param {Comment} end
   * @returns {Comment[]}
   */
  function getExistingList(elm, _, end) {
    /** @type {Comment[]} */
    const existingList = [];

    let existingComment = elm.nextSibling;
    while (existingComment instanceof Text) {
      existingComment = existingComment.nextSibling;
    }
    while (existingComment instanceof Comment && existingComment !== end) {
      existingList.push(existingComment);
      existingComment = findComment(existingComment) ?? end;
    }

    return existingList;
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {Context} $ctx
   * @param {Node} [parentEnd]
   */
  function handleIf(elm, $ctx, parentEnd) {
    const ifGetter = getGetter(elm, "json-if");

    if (HTMX_JSON_DEBUG && !ifGetter) {
      console.warn("Missing value for attribute json-if", elm);
      return null;
    } else if (!ifGetter) return null;

    const ifTmpl = elm;
    const elseIfTmpls = [];
    let tmpl = elm;
    while (true) {
      const found = getNextTemplateWithAttribute(tmpl, "json-else-if");
      if (!found) break;
      tmpl = found;
      elseIfTmpls.push(found);
    }
    const elseTmpl = getNextTemplateWithAttribute(tmpl, "json-else");

    if (HTMX_JSON_DEBUG && elseTmpl?.getAttribute("json-else")) {
      console.warn("json-else should not have a value", elseTmpl);
    }

    const comment = getOrCreateNextComment(elseTmpl ?? tmpl, parentEnd);

    const end = getOrCreate(
      comment,
      "/json-if",
      findOrCreateComment,
      parentEnd
    );
    if (!end) throw new Error("Could not create end, that is weird...");

    if (ifGetter($ctx)) {
      if (comment.data !== "json-if") {
        comment.data = "json-if";
        removeFromTo(comment.nextSibling, end);
        ifTmpl.parentNode?.insertBefore(ifTmpl.content.cloneNode(true), end);
      }
    } else {
      let i = 0;
      for (; i < elseIfTmpls.length; i++) {
        const elseIfTmpl = elseIfTmpls[i];
        const getter = getGetter(elseIfTmpl, "json-else-if");

        if (HTMX_JSON_DEBUG && !getter) {
          console.warn("Missing value for attribute json-else-if", elseIfTmpl);
        }

        if (getter?.($ctx)) {
          const commentValue = `json-else-if ${i}`;
          if (comment.data !== commentValue) {
            comment.data = commentValue;
            removeFromTo(comment.nextSibling, end);
            elseIfTmpl.parentNode?.insertBefore(
              elseIfTmpl.content.cloneNode(true),
              end
            );
          }
          break;
        }
      }
      if (i === elseIfTmpls.length && comment.data !== "json-else") {
        comment.data = "json-else";
        removeFromTo(comment.nextSibling, end);
        if (elseTmpl) {
          elseTmpl.parentNode?.insertBefore(
            elseTmpl.content.cloneNode(true),
            end
          );
        }
      }
    }
    swapFromTo(comment.nextSibling, end, $ctx);
    return end;
  }

  /**
   * @param {ChildNode} elm
   * @param {Node} [end]
   * @returns {Comment}
   */
  function getOrCreateNextComment(elm, end) {
    let comment = elm.nextSibling;
    while (comment instanceof Text) {
      comment = comment.nextSibling;
    }
    if (comment instanceof Comment && comment !== end) {
      return comment;
    } else {
      const comment = document.createComment("");
      elm.parentNode?.insertBefore(comment, elm.nextSibling);
      return comment;
    }
  }

  /**
   * @param {ChildNode} elm
   * @param {string} key
   * @param {Node} [end]
   */
  function findOrCreateComment(elm, key, end) {
    return (
      findComment(elm, key, end) ??
      elm.parentNode?.insertBefore(document.createComment(key), elm.nextSibling)
    );
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {string} attr
   */
  function getNextTemplateWithAttribute(elm, attr) {
    return elm.nextElementSibling instanceof HTMLTemplateElement &&
      elm.nextElementSibling.hasAttribute(attr)
      ? elm.nextElementSibling
      : undefined;
  }

  /**
   * @param {ChildNode | null} node
   * @param {string} [key]
   * @param {Node} [end]
   * @returns {Comment | null}
   */
  function findComment(node, key, end) {
    let ifCount = 0,
      eachCount = 0;
    node = node?.nextSibling ?? null;
    while (node && node !== end) {
      if (node instanceof Comment) {
        if (ifCount > 0 && node.data === "/json-if") {
          ifCount--;
        } else if (eachCount > 0 && node.data === "/json-each") {
          eachCount--;
        } else if (
          ifCount === 0 &&
          eachCount === 0 &&
          (key === undefined || node.data === key)
        ) {
          return node;
        }
      } else if (node instanceof HTMLTemplateElement) {
        for (const { name } of node.attributes) {
          if (name === "json-if") {
            ifCount++;
          } else if (name === "json-each") {
            eachCount++;
          }
        }
      }
      node = node.nextSibling;
    }
    return null;
  }

  /**
   * @param {Node | null} start
   * @param {Node | undefined} end
   * @param {Context} $ctx
   *
   * @returns {boolean}
   */
  function swapFromTo(start, end, $ctx) {
    let allIgnored = true;
    while (start && start !== end) {
      const result = swap(start, $ctx, end);
      allIgnored &&= result === null;
      start = (result ?? start).nextSibling;
    }

    return allIgnored;
  }

  /**
   * @param {HTMLElement} elm
   * @param {string} attr
   * @returns {Getter | null}
   */
  function getGetter(elm, attr) {
    return getOrCreate(elm, `getter-${attr}`, () =>
      createGetter(elm.getAttribute(attr))
    );
  }

  const jsonMap = Symbol();

  /**
   * @param {Node} elm
   * @param {string} key
   */
  function get(elm, key) {
    const map = (elm[jsonMap] ??= new Map());
    return map.get(key);
  }

  /**
   * @param {Node} elm
   * @param {string} key
   * @param {any} value
   */
  function set(elm, key, value) {
    const map = (elm[jsonMap] ??= new Map());
    map.set(key, value);
  }

  /**
   * @template T
   * @template {Node} N
   * @template {any[]} P
   * @param {N} elm
   * @param {string} key
   * @param {(elm: N, key: string, ...args: P) => T} factory
   * @param {P} args
   * @returns {T}
   */
  function getOrCreate(elm, key, factory, ...args) {
    const map = (elm[jsonMap] ??= new Map());
    let value = map.get(key);
    if (value === undefined) {
      value = factory(elm, key, ...args);
      map.set(key, value);
    }
    return value;
  }

  /**
   *
   * @param {String} name
   * @returns {(obj: any, value: any) => void}
   */
  function createSetter(name) {
    return /** @type {(obj: any, value: any) => void} */ (
      new Function("obj", "value", `obj${name} = value;`)
    );
  }

  /** @typedef {typeof createGetter} CreateGetter */

  /**
   * @template {string[]} V
   * @param {String | null} value
   * @param {V} vars
   * @returns {Getter<Record<V[number], any> & Context> | null}
   */
  function createGetter(value, ...vars) {
    if (!value) return null;
    return /** @type {Getter} */ (
      new Function(
        `{$this, $parent, $index, $key, ${vars.join(", ")}}`,
        `
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
      `
      )
    );
  }

  /**
   * @param {ChildNode | null} from
   * @param {ChildNode} to
   */
  function removeFromTo(from, to) {
    const previous = from?.previousSibling;
    if (!previous) return;
    while (previous.nextSibling && previous.nextSibling !== to) {
      previous.nextSibling.remove();
    }
  }

  /**
   * @param {Node} from
   * @param {Node} until
   * @param {Node} to
   */
  function moveFromUntilBeforeTo(from, until, to) {
    const previousSibling = from.previousSibling;
    if (!previousSibling) return;
    const parent = previousSibling.parentNode;
    if (!parent) return;
    while (previousSibling.nextSibling && previousSibling.nextSibling !== until) {
      parent.insertBefore(previousSibling.nextSibling, to);
    }
  }

  /**
   * @param {string} value
   */
  function kebabChainToCamelChain(value) {
    return value
      .split(".")
      .map((v) => v && kebabToCamel(v))
      .join(".");
  }

  /**
   * @param {string} value
   */
  function kebabToCamel(value) {
    return value
      .split("-")
      .map(([a, ...b], i) => (i === 0 ? a : a.toUpperCase()) + b.join(""))
      .join("");
  }

  return {
    /**
     * @param {Node} elm
     * @param {any} data
     *
     * @returns {void}
     */
    swap(elm, data) {
      swap(elm, createContext(data));
    },
    directives
  };
})();
