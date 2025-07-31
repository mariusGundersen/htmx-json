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
   *
   * @typedef {($ctx: Context) => any} Getter
   */

  /**
   *
   * @param {Node} elm
   * @param {Context} $ctx
   * @param {Node} [end]
   * @returns {Node | null}
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
   * @param {Node} [parentEnd]
   */
  function handleEach(elm, $ctx, parentEnd) {
    const eachGetter = getGetter(elm, "json-each");
    if (!eachGetter) return null;
    const end = getOrCreate(elm, "/json-each", findOrCreateComment, parentEnd);
    if (!end) return elm;

    const existingList = getOrCreate(elm, "existingList", (elm) => {
      /** @type {Comment[]} */
      const existingList = [];

      let existingComment = elm.nextSibling;
      while (existingComment instanceof Comment && existingComment !== end) {
        existingList.push(existingComment);
        existingComment = findComment(existingComment) ?? end;
      }

      return existingList;
    });

    const keyToItem = getItemsMap(eachGetter, $ctx, elm);

    const entries = Array.from(keyToItem.entries());

    let $index;
    for ($index = 0; $index < entries.length; $index++) {
      const [newKey, item] = entries[$index];
      const existingComment = existingList[$index];

      if (existingComment instanceof Comment) {
        const oldKey = existingComment.data;

        if (oldKey === newKey) {
          // Same key
          // * update index
          // * recurse into children
          swapFromTo(
            existingComment.nextSibling,
            existingList[$index + 1] ?? end,
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

          let oldKeyExistsInList = keyToItem.has(oldKey);
          if (oldKeyExistsInList) {
            const movingCommentIndex = existingList.findIndex(
              (c) => c.data === newKey
            );
            if (movingCommentIndex >= 0) {
              const movingComment = existingList[movingCommentIndex];
              // Move from old position to current position
              // skipping over the stuff that will be moved
              const oldNextComment =
                existingList[movingCommentIndex + 1] ?? end;

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

              swapFromTo(
                movingComment,
                existingComment,
                createContext(item, $ctx, $index, newKey)
              );

              existingList.splice(movingCommentIndex, 1);
              existingList.splice($index, 0, movingComment);
            } else {
              // Insert new item
              const clone = elm.content.cloneNode(true);
              const comment = document.createComment(newKey);

              existingList.splice($index, 0, comment);

              elm.parentNode?.insertBefore(comment, existingComment);
              elm.parentNode?.insertBefore(clone, existingComment);
              swapFromTo(
                comment.nextSibling,
                existingComment,
                createContext(item, $ctx, $index, newKey)
              );
            }
          } else {
            // Remove current item

            // skip over this comment
            const nextComment = existingList[$index + 1] ?? end;

            const previousSibling = existingComment.previousSibling;
            while (
              previousSibling?.nextSibling &&
              previousSibling.nextSibling !== nextComment
            ) {
              previousSibling.nextSibling.remove();
            }

            existingList.splice($index, 1);
            // since we removed an item we need to subtract it from the current index
            $index--;
          }
        }
      } else {
        // Append item at the end
        const clone = elm.content.cloneNode(true);
        const comment = document.createComment(newKey);
        existingList.push(comment);

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
    const lastNode = existingList[$index]?.previousSibling;
    if (lastNode) {
      while (lastNode.nextSibling && lastNode.nextSibling !== end) {
        lastNode.nextSibling.remove();
      }
      existingList.splice($index, existingList.length - $index);
    }

    return end;
  }

  /**
   * @param {Getter} eachGetter
   * @param {Context} $ctx
   * @param {HTMLElement} elm
   */
  function getItemsMap(eachGetter, $ctx, elm) {
    const items = eachGetter($ctx);

    const keyGetter = getGetter(elm, "json-key");

    if (!items) {
      return new Map();
    } else if (Array.isArray(items)) {
      return new Map(
        items.map((item, index) => [
          keyGetter ? keyGetter(createContext(item)) : index.toString(),
          item,
        ])
      );
    } else if (typeof items === "object") {
      if (keyGetter)
        console.warn("json-key is not used when json-each is an object");
      return new Map(
        Object.entries(items).map(([key, value]) => {
          if (Number(key) >= 0)
            console.warn(
              `Objects with integer keys will be iterated over in unexpected order!\nFound key ${key} in ${JSON.stringify(
                items
              )}`
            );
          return [key, value];
        })
      );
    } else {
      console.warn(
        `each expects an array or object, got ${JSON.stringify(items)} on ${
          elm.outerHTML
        }`
      );
      return new Map();
    }
  }

  /**
   * @param {HTMLTemplateElement} elm
   * @param {Context} $ctx
   * @param {Node} [parentEnd]
   */
  function handleIf(elm, $ctx, parentEnd) {
    const ifGetter = getGetter(elm, "json-if");
    if (!ifGetter) return null;
    const otherwise = getOrCreate(elm, "json-else", findTemplate);

    const elmOrOtherwise = otherwise ?? elm;

    const end = getOrCreate(
      elmOrOtherwise,
      "/json-if",
      findOrCreateComment,
      parentEnd
    );
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
      swapFromTo(elmOrOtherwise.nextSibling, end, $ctx);
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
      swapFromTo(elmOrOtherwise.nextSibling, end, $ctx);
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
   * @param {any} end
   * @param {Context} $ctx
   *
   * @returns {void}
   */
  function swapFromTo(start, end, $ctx) {
    while (start && start !== end) {
      start = (swap(start, $ctx, end) ?? start).nextSibling;
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
