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
        const getter = createGetter(attr.value, '$prev');
        let $prev = undefined;
        result.push(($ctx) => {
          if (getter === null) return false;
          if (getter({ ...$ctx, $prev })) {
            return false;
          } else {
            $prev = $ctx.$this;
            return $ctx;
          }
        });
        if (getter === null) {
          // stop processing of the array
          break;
        }
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

          const oldKeyIndexInNewList = newList.findIndex(
            ([key]) => key === oldKey
          );
          if (oldKeyIndexInNewList >= 0) {
            const newKeyIndexInOldList = oldList.findIndex(
              (c) => c.data === newKey
            );
            if (newKeyIndexInOldList >= 0) {
              const movingComment = oldList[newKeyIndexInOldList];
              // Move from old position to current position
              const oldNextComment = oldList[newKeyIndexInOldList + 1] ?? end;

              // move nodes
              const previousSibling = movingComment.previousSibling;
              while (
                previousSibling?.nextSibling &&
                previousSibling.nextSibling !== oldNextComment
              ) {
                oldComment.parentNode?.insertBefore(
                  previousSibling.nextSibling,
                  oldComment
                );
              }

              swapFromTo(
                movingComment,
                oldComment,
                createContext(item, $ctx, $index, newKey)
              );

              oldList.splice(newKeyIndexInOldList, 1);
              oldList.splice($index, 0, movingComment);
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
      if (keyGetter)
        console.warn("json-key is not used when json-each is an object");
      return Object.entries(items).map(([key, value]) => {
        if (Number(key) >= 0)
          console.warn(
            `Objects with integer keys will be iterated over in unexpected order!\nFound key ${key} in ${JSON.stringify(
              items
            )}`
          );
        return [key, value];
      });
    } else {
      console.warn(
        `each expects an array or object, got ${JSON.stringify(items)} on ${elm.outerHTML
        }`
      );
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
    if (!ifGetter) return null;
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

    const comment = getOrCreateNextComment(elseTmpl ?? tmpl, parentEnd);

    const end = getOrCreate(
      comment,
      "/json-if",
      findOrCreateComment,
      parentEnd
    );
    if (!end) throw new Error("Could not create end, that is weird...");


    if (ifGetter($ctx)) {
      if (comment.data !== 'json-if') {
        comment.data = 'json-if';
        removeFromTo(comment.nextSibling, end);
        ifTmpl.parentNode?.insertBefore(ifTmpl.content.cloneNode(true), end);
      }
    } else {
      let i = 0;
      for (; i < elseIfTmpls.length; i++) {
        const elseIfTmpl = elseIfTmpls[i];
        const getter = getGetter(elseIfTmpl, 'json-else-if');
        if (getter?.($ctx)) {
          const commentValue = `json-else-if ${i}`;
          if (comment.data !== commentValue) {
            comment.data = commentValue;
            removeFromTo(comment.nextSibling, end);
            elseIfTmpl.parentNode?.insertBefore(elseIfTmpl.content.cloneNode(true), end);
          }
          break;
        }
      }
      if (i === elseIfTmpls.length && comment.data !== 'json-else') {
        comment.data = 'json-else'
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
      return comment
    } else {
      const comment = document.createComment('');
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
   * @template {string[]} V
   * @param {String | null} value
   * @param {V} vars
   * @returns {Getter<Record<V[number], any> & Context> | null}
   */
  function createGetter(value, ...vars) {
    if (!value) return null;
    return /** @type {Getter} */ (
      new Function(
        `{$this, $parent, $index, $key, ${vars.join(', ')}}`,
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
