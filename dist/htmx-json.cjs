// @ts-check

const htmxJson = (function () {
  // @ts-ignore
  if (typeof htmx !== "undefined") {
    // @ts-ignore
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
    if ($ctx) {
      return {
        $this,
        $parent: { ...$ctx, __proto__: $ctx.$this },
        $index,
        $key,
      };
    } else {
      return {
        $this,
        $parent: undefined,
        $index,
        $key,
      };
    }
  }

  /**
   * @typedef {{
   *   $this: any,
   *   $parent: any | undefined,
   *   $index: number | undefined,
   *   $key: string | undefined
   * }} Context
   *
   * @typedef {($ctx: Context) => any} Getter
   */

  /**
   *
   * @param {Node} elm
   * @param {Context} $ctx
   * @returns {Node | null}
   */
  function swap(elm, $ctx) {
    if (elm instanceof Text) {
      const textGetter = getOrCreate(elm, "text", createTextGetter);
      if (!textGetter) return null;
      elm.textContent = textGetter($ctx);
      return elm;
    } else if (elm instanceof HTMLTemplateElement) {
      return handleEach(elm, $ctx) ?? handleIf(elm, $ctx) ?? elm;
    } else if (elm instanceof HTMLElement) {
      /** @type {false | Context} */
      let nextCtx = $ctx;
      const attrs = getOrCreate(elm, "attributes", createAttributeHandler);
      for (const attr of attrs) {
        if (!nextCtx) break;
        nextCtx = attr(nextCtx);
      }

      if (!nextCtx) {
        // there is a json-ignore in the attribute list
        // if that's the only attr then we can ignore this element completely
        return attrs.length === 1 ? null : elm;
      } else {
        let allIgnored = true;
        let child = elm.firstChild;
        while (child) {
          const result = swap(child, nextCtx);
          allIgnored &&= result === null;
          child = (result ?? child).nextSibling;
        }

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
   * @param {HTMLElement} elm
   * @returns {Array<($ctx: Context) => (Context | false)>}
   */
  function createAttributeHandler(elm) {
    /** @type {Array<($ctx: Context) => (Context | false)>} */
    const result = [];
    for (const attr of elm.attributes) {
      if (attr.name.startsWith("@")) {
        const name = attr.name.substring(1);
        const getter = createGetter(attr.value);
        if (!getter) continue;
        result.push(($ctx) => {
          const value = getter($ctx);
          if (value === null) {
            elm.removeAttribute(name);
          } else {
            elm.setAttribute(name, value);
          }
          return $ctx;
        });
      } else if (attr.name.startsWith(".")) {
        const getter = createGetter(attr.value);
        if (!getter) continue;
        const setter = createSetter(kebabChainToCamelChain(attr.name));
        result.push(($ctx) => {
          setter(elm, getter($ctx));
          return $ctx;
        });
      } else if (attr.name === "json-ignore") {
        result.push(($ctx) => false);
        // stop processing of the array
        break;
      } else if (attr.name === "json-with") {
        const getter = createGetter(attr.value);
        if (!getter) continue;
        result.push(($ctx) => {
          return createContext(getter($ctx), $ctx);
        });
      } else if (attr.name === "json-text") {
        const getter = createGetter(attr.value);
        if (!getter) continue;
        result.push(($ctx) => {
          elm.textContent = getter($ctx);
          return $ctx;
        });
      } else if (attr.name === "json-show") {
        const getter = createGetter(attr.value);
        if (!getter) continue;
        result.push(($ctx) => {
          elm.style.display = getter($ctx) ? "" : "none";
          return $ctx;
        });
      } else if (attr.name === "json-hide") {
        const getter = createGetter(attr.value);
        if (!getter) continue;
        result.push(($ctx) => {
          elm.style.display = getter($ctx) ? "none" : "";
          return $ctx;
        });
      } else if (attr.name === "name") {
        if (elm instanceof HTMLInputElement) {
          if (elm.type === "checkbox") {
            result.push(($ctx) => {
              if (attr.value in $ctx.$this) {
                elm.checked = $ctx.$this[attr.value];
              }
              return $ctx;
            });
          } else if (elm.type === "radio") {
            result.push(($ctx) => {
              if (attr.value in $ctx.$this) {
                elm.checked = $ctx.$this[attr.value] === elm.value;
              }
              return $ctx;
            });
          } else {
            result.push(($ctx) => {
              if (attr.value in $ctx.$this) {
                elm.value = $ctx.$this[attr.value];
              }
              return $ctx;
            });
          }
        }
      }
    }
    return result;
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {Context} $ctx
   */
  function handleEach(elm, $ctx) {
    const eachGetter = getGetter(elm, "json-each");
    if (!eachGetter) return null;
    const end = getOrCreate(elm, "/json-each", findOrCreateComment);
    if (!end) return elm;

    let existingComment = elm.nextSibling;

    const items = eachGetter($ctx);

    const keyGetter = getGetter(elm, "json-key");

    if (!Array.isArray(items)) {
      throw new Error("for-each only works with arrays");
    }

    for (let $index = 0; $index < items.length; $index++) {
      const item = items[$index];
      const newKey = keyGetter
        ? keyGetter(createContext(item))
        : $index.toString();

      if (existingComment instanceof Comment && existingComment !== end) {
        const oldKey = existingComment.data;

        if (oldKey === newKey) {
          // Same key
          // * update index
          // * recurse into children
          const child = existingComment.nextSibling;
          existingComment.data = newKey;
          existingComment = findComment(existingComment) ?? end;
          swapUntil(
            child,
            existingComment,
            createContext(item, $ctx, $index, newKey)
          );
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
          for (
            let i = $index;
            oldKeyExistsInList === false && i < items.length;
            i++
          ) {
            oldKeyExistsInList =
              oldKey === (keyGetter ? keyGetter(createContext(items[i])) : i);
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
              while (
                previousSibling?.nextSibling &&
                previousSibling.nextSibling !== oldNextComment
              ) {
                existingComment.parentNode?.insertBefore(
                  previousSibling.nextSibling,
                  existingComment
                );
              }

              swapUntil(
                movingComment,
                existingComment,
                createContext(item, $ctx, $index, newKey)
              );
            } else {
              // Insert new item
              const clone = elm.content.cloneNode(true);
              const comment = document.createComment(newKey);

              elm.parentNode?.insertBefore(comment, existingComment);
              elm.parentNode?.insertBefore(clone, existingComment);
              swapUntil(
                comment.nextSibling,
                existingComment,
                createContext(item, $ctx, $index, newKey)
              );
            }
          } else {
            // Remove current item

            // skip over this comment
            const nextComment = findComment(existingComment) ?? end;

            const previousSibling = existingComment.previousSibling;
            while (
              previousSibling?.nextSibling &&
              previousSibling.nextSibling !== nextComment
            ) {
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
        swapUntil(
          comment.nextSibling,
          end,
          createContext(item, $ctx, $index, newKey)
        );
      } else {
        throw new Error("This should not have happened");
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
   * @param {Context} $ctx
   */
  function handleIf(elm, $ctx) {
    const ifGetter = getGetter(elm, "json-if");
    if (!ifGetter) return null;
    const otherwise = getOrCreate(elm, "json-else", findTemplate);

    const elmOrOtherwise = otherwise ?? elm;

    const end = getOrCreate(elmOrOtherwise, "/json-if", findOrCreateComment);
    if (!end) return elmOrOtherwise;

    if (ifGetter($ctx)) {
      if (get(elm, "if") !== true) {
        set(elm, "if", true);
        while (
          elmOrOtherwise.nextSibling &&
          elmOrOtherwise.nextSibling !== end
        ) {
          elmOrOtherwise.nextSibling.remove();
        }
        elm.parentNode?.insertBefore(elm.content.cloneNode(true), end);
      }
      swapUntil(elmOrOtherwise.nextSibling, end, $ctx);
    } else if (otherwise) {
      if (get(elm, "if") !== false) {
        set(elm, "if", false);
        while (
          elmOrOtherwise.nextSibling &&
          elmOrOtherwise.nextSibling !== end
        ) {
          elmOrOtherwise.nextSibling.remove();
        }
        otherwise.parentNode?.insertBefore(
          otherwise.content.cloneNode(true),
          end
        );
      }
      swapUntil(elmOrOtherwise.nextSibling, end, $ctx);
    } else {
      if (get(elm, "if") !== false) {
        set(elm, "if", false);
        while (
          elmOrOtherwise.nextSibling &&
          elmOrOtherwise.nextSibling !== end
        ) {
          elmOrOtherwise.nextSibling.remove();
        }
      }
    }
    return end;
  }

  /**
   * @param {ChildNode} elm
   * @param {string} key
   */
  function findOrCreateComment(elm, key) {
    return (
      findComment(elm, key) ??
      elm.parentNode?.insertBefore(document.createComment(key), elm.nextSibling)
    );
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {string} key
   */
  function findTemplate(elm, key) {
    return elm.nextElementSibling instanceof HTMLTemplateElement &&
      elm.nextElementSibling.hasAttribute(key)
      ? elm.nextElementSibling
      : undefined;
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
   * @param {Context} $ctx
   *
   * @returns {void}
   */
  function swapUntil(start, end, $ctx) {
    while (start && start !== end) {
      start = (swap(start, $ctx) ?? start).nextSibling;
    }
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
   * @param {N} elm
   * @param {string} key
   * @param {(elm: N, key: string) => T} factory
   * @returns {T}
   */
  function getOrCreate(elm, key, factory) {
    const map = (elm[jsonMap] ??= new Map());
    let value = map.get(key);
    if (value === undefined) {
      value = factory(elm, key);
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

  /**
   *
   * @param {String | null} value
   * @returns {Getter | null}
   */
  function createGetter(value) {
    if (!value) return null;
    return /** @type {Getter} */ (
      new Function(
        "{$this, $parent, $index, $key}",
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
  };
})();
module.exports htmxJson;