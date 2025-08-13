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

          swap(target, { $this: json });

          return [target];
        }
      },
    });
  }

  /**
   * @param {Context} $ctx
   * @returns {Context}
   */
  function createParentContext($ctx) {
    // @ts-ignore
    return { ...$ctx, __proto__: $ctx.$this };
  }

  /**
   * @param {any} $this
   * @param {Context} $parent
   * @param {number} [$index]
   * @param {string} [$key]
   * @returns {Context}
   */
  function createContext($this, $parent, $index, $key) {
    return {
      $this,
      $parent,
      $index,
      $key,
    };
  }

  /**
   * @typedef {{
   *   $this: any,
   *   $parent?: any,
   *   $index?: number,
   *   $key?: string
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
    if (isText(elm)) {
      const textGetter = getOrCreate(elm, "text", createTextGetter);
      if (!textGetter) return null;
      elm.textContent = textGetter($ctx);
      return elm;
    } else if (isElement(elm)) {
      if (isTemplateElement(elm)) {
        return handleEach(elm, $ctx, end) ?? handleIf(elm, $ctx, end) ?? null;
      }

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
      return null;
    }
  }


  /**
   * @param {Element} elm
   * @returns {elm is HTMLTemplateElement}
   */
  function isTemplateElement(elm) {
    return elm.nodeName === 'TEMPLATE';
  }

  /**
   * @param {Node} elm
   * @returns {elm is Element}
   */
  function isElement(elm) {
    return elm.nodeType === 1;
  }

  /**
   * @param {Node} elm
   * @returns {elm is Text}
   */
  function isText(elm) {
    return elm.nodeType === 3;
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
   * @typedef {(elm: Element, attr: Attr, createGetter: CreateGetter) => (AttributeHandler | undefined | null)} AttributeHandlerFactory
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
          const $parent = createParentContext($ctx);
          return createContext(newThis, $parent);
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
        if (elm instanceof HTMLElement) {
          const getter = createGetter(attr.value);

          if (HTMX_JSON_DEBUG && !getter) {
            console.warn("Missing value for attribute json-show", elm);
            return undefined;
          } else if (!getter) return undefined;

          return ($ctx) => {
            elm.style.display = getter($ctx) ? "" : "none";
          };
        }
      },
    },
    {
      match: attr => attr.name === 'json-hide',
      factory(elm, attr, createGetter) {
        if (elm instanceof HTMLElement) {
          const getter = createGetter(attr.value);

          if (HTMX_JSON_DEBUG && !getter) {
            console.warn("Missing value for attribute json-hide", elm);
            return undefined;
          } else if (!getter) return undefined;

          return ($ctx) => {
            elm.style.display = getter($ctx) ? "none" : "";
          };
        }
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
   * @param {Element} elm
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

    const $parent = createParentContext($ctx);

    let $index;
    for ($index = 0; $index < newList.length && $index < oldList.length; $index++) {
      const [newKey, item] = newList[$index];

      const old = oldList[$index];
      const oldKey = old[0];
      const oldComment = old[1];

      if (oldKey === newKey) {
        // Same key

        swapFromTo(
          oldComment.nextSibling,
          oldList[$index + 1]?.[1] ?? end,
          createContext(item, $parent, $index, newKey)
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
            const moving = oldList[newKeyIndexInOldList];
            const movingComment = moving[1];
            const oldNextComment = oldList[newKeyIndexInOldList + 1]?.[1] ?? end;

            // move nodes
            moveFromUntilBeforeTo(movingComment, oldNextComment, oldComment);

            swapFromTo(
              movingComment,
              oldComment,
              createContext(item, $parent, $index, newKey)
            );

            oldList.splice(newKeyIndexInOldList, 1)
            oldList.splice($index, 0, moving);
          } else if (newKeyIndexInOldList >= 0) {
            // An existing item has been moved back from the front of the array
            // Move old item to the new position

            const nextComment = oldList[$index + 1]?.[1] ?? end;
            const newBefore = oldList[oldKeyIndexInNewList + 1]?.[1] ?? end;
            moveFromUntilBeforeTo(oldComment, nextComment, newBefore);

            // Don't swapFromTo here, since this item will be visited again later

            oldList.splice($index, 1);
            oldList.splice(oldKeyIndexInNewList, 0, old);
            $index--;
          } else {
            // Insert new item
            const clone = elm.content.cloneNode(true);
            const comment = document.createComment(newKey);


            oldComment.before(comment, clone);
            swapFromTo(
              comment.nextSibling,
              oldComment,
              createContext(item, $parent, $index, newKey)
            );

            oldList.splice($index, 0, [newKey, comment]);
          }
        } else {
          // Remove current item
          const nextComment = oldList[$index + 1]?.[1] ?? end;

          removeFromTo(oldComment, nextComment);

          oldList.splice($index, 1);
          // since we removed an item we need to subtract it from the current index
          $index--;
        }
      }
    }

    for (; $index < newList.length; $index++) {
      const [newKey, item] = newList[$index];
      // Append item at the end
      const clone = elm.content.cloneNode(true);
      const comment = document.createComment(newKey);

      end.before(comment, clone);

      swapFromTo(
        comment.nextSibling,
        end,
        createContext(item, $parent, $index, newKey)
      );

      oldList.push([newKey, comment]);
    }

    // Remove everything remaining
    const old = oldList[$index];
    if (old) {
      removeFromTo(old[1], end);
      oldList.splice($index, oldList.length - $index);
    }

    return end;
  }

  /**
   * @param {[string, Comment][]} list
   * @param {string} key
   */
  function findIndexInOldList(list, key, start = 0) {
    for (; start < list.length; start++) {
      if (list[start][0] === key) return start;
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
   * @returns {[string, unknown][]}
   */
  function getItemsMap(eachGetter, $ctx, elm) {
    const items = eachGetter($ctx);

    const keyGetter = getGetter(elm, "json-key");

    if (!items) {
      return [];
    } else if (Array.isArray(items)) {
      return keyGetter ? items.map((item) => [
        String(keyGetter({ $this: item })),
        item,
      ]) : items.map((item, index) => [
        index.toString(),
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
   * @returns {[string, Comment][]}
   */
  function getExistingList(elm, _, end) {
    /** @type {[string, Comment][]} */
    const existingList = [];

    let existingComment = elm.nextSibling;
    while (existingComment instanceof Text) {
      existingComment = existingComment.nextSibling;
    }
    while (existingComment instanceof Comment && existingComment !== end) {
      existingList.push([existingComment.data, existingComment]);
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
        end.before(ifTmpl.content.cloneNode(true));
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
            end.before(elseIfTmpl.content.cloneNode(true));
          }
          break;
        }
      }
      if (i === elseIfTmpls.length && comment.data !== "json-else") {
        comment.data = "json-else";
        removeFromTo(comment.nextSibling, end);
        if (elseTmpl) {
          end.before(elseTmpl.content.cloneNode(true));
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
      elm.after(comment);
      return comment;
    }
  }

  /**
   * @param {ChildNode} elm
   * @param {string} key
   * @param {Node} [end]
   */
  function findOrCreateComment(elm, key, end) {
    const found = findComment(elm, key, end);
    if (found) return found;
    const created = document.createComment(key);
    elm.after(created);
    return created;
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
      if (result === null) {
        start = start.nextSibling;
      } else {
        allIgnored = false;
        start = result.nextSibling;
      }
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
    const map = (elm[jsonMap] ??= {});
    return map[key];
  }

  /**
   * @param {Node} elm
   * @param {string} key
   * @param {any} value
   */
  function set(elm, key, value) {
    const map = (elm[jsonMap] ??= {});
    map[key] = value;
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
    const map = (elm[jsonMap] ??= {});
    let value = map[key];
    if (value === undefined) {
      value = factory(elm, key, ...args);
      map[key] = value;
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
   * @param {Comment} to
   */
  function moveFromUntilBeforeTo(from, until, to) {
    const parent = from.parentNode;
    if (!parent) return;
    const nodes = [];
    /** @type {Node | null} */
    let node = from;
    while (node && node !== until) {
      nodes.push(node)
      node = node.nextSibling;
    }
    to.before(...nodes);
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
      swap(elm, { $this: data });
    },
    directives
  };
})();
