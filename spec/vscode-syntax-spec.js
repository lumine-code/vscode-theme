const path = require("path");
const reference = require("./fixtures/vscode-reference.json");

const samples = [
  {
    extension: "css",
    packageName: "language-css",
    scope: "source.css",
    cases: [
      ["div", "cssSelector", "entity.name.tag.css"],
      ["card", "cssSelector", "entity.other.attribute-name.class.css"],
      ["main", "cssSelector", "entity.other.attribute-name.id.css"],
      ["hover", "cssSelector", "entity.other.attribute-name.pseudo-class.css"],
      ["color", "cssProperty", "support.type.property-name.css"],
      ["red", "cssValue", "support.constant.color.w3c-standard-color-name.css"],
      ["10", "numeric", "constant.numeric.css"],
    ],
  },
  ...["js", "ts"].map((extension) => ({
    extension,
    packageName: extension === "js" ? "language-javascript" : "language-typescript",
    scope: `source.${extension}`,
    cases: [
      ["const", "storage", `storage.type.const.${extension}`],
      ["count", "variable", `variable.other.assignment.${extension}`],
      ["10", "numeric", `constant.numeric.${extension}`],
      ["=", "jsOperator", `keyword.operator.assignment.${extension}`],
      ["10 + 2", "jsOperator", `keyword.operator.arithmetic.${extension}`, 3],
      ["console", "variable", `support.class.builtin.console.${extension}`],
      ["log", "function", `support.function.builtin.console.${extension}`],
      [
        "if",
        "keyword",
        `keyword.control.${extension === "js" ? "conditional." : ""}if.${extension}`,
      ],
      [
        "instanceof",
        "storage",
        `keyword.operator.${extension === "js" ? "expression." : ""}instanceof.${extension}`,
      ],
      ["^", "regexpAnchor", "keyword.control.anchor.regexp"],
      ["[", "regexpGroup", "punctuation.definition.character-class.begin.regexp"],
      ["a-z", "regexpClass", "constant.other.character-class.set.regexp"],
      ["+$/", "regexpQuantifier", "keyword.operator.quantifier.regexp"],
    ],
  })),
  {
    extension: "html",
    packageName: "language-html",
    scope: "text.html.basic",
    cases: [
      ["<", "tagPunctuation", "punctuation.definition.tag.begin.html"],
      ["div", "tag", "entity.name.tag.block.div.html"],
      ["class", "attribute", "entity.other.attribute-name.html"],
      ["card", "attributeString", "string.quoted.double.html"],
    ],
  },
  {
    extension: "xml",
    packageName: "language-xml",
    scope: "text.xml",
    cases: [
      ["<", "tagPunctuation", "punctuation.definition.tag.begin.xml"],
      ["item", "tag", "entity.name.tag.xml"],
      ["name", "attribute", "entity.other.attribute-name.xml"],
      ["value", "attributeString", "string.quoted.double.xml"],
    ],
  },
  {
    extension: "json",
    packageName: "language-json",
    scope: "source.json",
    cases: [
      ["name", "jsonKey", "meta.structure.key.json"],
      ["value", "string", "string.quoted.double.json"],
      ["10", "numeric", "constant.numeric.json"],
      ["true", "languageConstant", "constant.language.boolean.true.json"],
    ],
  },
  {
    extension: "md",
    packageName: "language-gfm",
    scope: "source.gfm",
    cases: [
      ["Heading", "heading", "markup.heading.heading-1.gfm", 0, { fontWeight: "700" }],
      ["strong", "markupBold", "markup.bold.gfm", 0, { fontWeight: "700" }],
      ["emphasis", "markupItalic", "markup.italic.gfm", 0, { fontStyle: "italic" }],
      ["raw", "markupRaw", "markup.raw.inline.gfm"],
      [">", "markupQuote", "punctuation.definition.blockquote.gfm"],
      ["- list", "markupList", "punctuation.definition.list-item.gfm"],
    ],
    decorations: [["strike", "markup.strike.gfm", "line-through"]],
  },
  {
    extension: "py",
    packageName: "language-python",
    scope: "source.python",
    cases: [
      ["def", "storage", "storage.type.function.python"],
      ["greet", "function", "entity.name.function.python"],
      ["name", "variable", "variable.parameter.function.python"],
      ["comment", "comment", "comment.line.number-sign.python"],
      ["and", "storage", "keyword.operator.logical.and.python"],
      ["True", "languageConstant", "constant.builtin.true.python"],
      ["hello", "string", "string.quoted.double.single-line.python"],
      ["\\n", "escape", "constant.character.escape.python"],
    ],
  },
];

function rgb(hex) {
  const value = hex.replace("#", "");
  return `rgb(${[0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).join(", ")})`;
}

describe("VS Code syntax in real grammar output", () => {
  let editor;

  afterEach(async () => {
    editor?.destroy();
    editor = null;
    for (const mode of ["day", "night"]) {
      await lumine.packages.deactivatePackage(`vscode-${mode}-syntax`);
    }
    await lumine.packages.deactivatePackage("vscode-theme");
  });

  for (const mode of ["day", "night"]) {
    it(`respects independent ${mode} public property, value, method and import roles`, async () => {
      await lumine.packages.activatePackage("vscode-theme");
      await lumine.packages.activatePackage(`vscode-${mode}-syntax`);
      const fixture = document.createElement("div");
      document.body.appendChild(fixture);
      try {
        for (const [role, scopes] of [
          ["property", ["property"]],
          ["property", ["variable", "other", "property"]],
          ["value", ["entity", "value"]],
          ["method", ["entity", "name", "function", "method"]],
          ["method", ["support", "function", "any-method"]],
          ["import", ["keyword", "control", "import"]],
        ]) {
          fixture.style.setProperty(`--syntax-color-${role}`, "rgb(1, 2, 3)");
          const token = document.createElement("span");
          token.className = scopes.map((scope) => `syntax--${scope}`).join(" ");
          fixture.appendChild(token);
          expect(getComputedStyle(token).color).withContext(scopes.join(" ")).toBe("rgb(1, 2, 3)");
          token.remove();
          fixture.style.removeProperty(`--syntax-color-${role}`);
        }
      } finally {
        fixture.remove();
      }
    });

    it(`distinguishes ${mode} IPython magic commands and percent signs from Python directives`, async () => {
      await lumine.packages.activatePackage("vscode-theme");
      await lumine.packages.activatePackage(`vscode-${mode}-syntax`);
      const colorOfToken = (classes, value = null) => {
        const token = document.createElement("span");
        token.className = classes.map((name) => `syntax--${name}`).join(" ");
        if (value) token.style.color = value;
        document.body.appendChild(token);
        const color = getComputedStyle(token).color;
        token.remove();
        return color;
      };
      const magicClasses = ["support", "function", "magic", "ipython"];
      const magicColor = colorOfToken([], "var(--syntax-color-magic)");
      expect(colorOfToken(magicClasses)).toBe(magicColor);
      expect(colorOfToken([...magicClasses, "punctuation", "definition"])).toBe(magicColor);
      for (const directiveClasses of [
        ["keyword", "control", "conditional", "if"],
        ["keyword", "control", "import"],
        ["storage", "type", "function"],
      ]) {
        expect(colorOfToken([...directiveClasses, "python"])).not.toBe(magicColor);
      }
      expect(colorOfToken(["support", "function", "magic", "python"])).toBe(
        colorOfToken(["support", "function", "python"]),
      );
    });

    it(`shares the ${mode} focus state with real selected block decorations`, async () => {
      await lumine.packages.activatePackage("vscode-theme");
      await lumine.packages.activatePackage(`vscode-${mode}-syntax`);
      editor = await lumine.workspace.open();
      editor.setText("zero\none\ntwo");
      const workspace = lumine.views.getView(lumine.workspace);
      jasmine.attachToDOM(workspace);
      const view = lumine.views.getView(editor);
      const component = view.getComponent();
      const item = document.createElement("div");
      item.textContent = "Block output";
      item.style.height = "10px";
      item.style.backgroundColor = "rgb(4, 5, 6)";
      editor.decorateMarker(editor.markBufferPosition([0, 4]), {
        type: "block",
        position: "after",
        item,
      });
      editor.setSelectedBufferRange([
        [0, 1],
        [1, 1],
      ]);
      view.focus();
      component.updateSync();
      expect(view.classList.contains("is-focused")).toBe(true);
      expect(item.hasAttribute("data-block-decoration-selected")).toBe(true);
      const colors = reference.modes[mode].colors;
      const activeColor = rgb(colors["editor.selectionBackground"]);
      const inactiveColor = rgb(colors["editor.inactiveSelectionBackground"]);
      expect(getComputedStyle(item).backgroundColor).toBe(activeColor);
      expect(getComputedStyle(view.querySelector(".selection .region")).backgroundColor).toBe(
        activeColor,
      );

      component.getHiddenInput().blur();
      component.updateSync();
      expect(view.classList.contains("is-focused")).toBe(false);
      expect(item.hasAttribute("data-block-decoration-selected")).toBe(true);
      expect(getComputedStyle(item).backgroundColor).toBe(inactiveColor);
      expect(getComputedStyle(view.querySelector(".selection .region")).backgroundColor).toBe(
        inactiveColor,
      );

      view.focus();
      component.updateSync();
      expect(getComputedStyle(item).backgroundColor).toBe(activeColor);
      editor.setCursorBufferPosition([1, 1]);
      component.updateSync();
      expect(item.hasAttribute("data-block-decoration-selected")).toBe(false);
      expect(getComputedStyle(item).backgroundColor).toBe("rgb(4, 5, 6)");
    });

    for (const sample of samples) {
      it(`matches the frozen ${mode} token reference in ${sample.extension}`, async () => {
        await lumine.packages.activatePackage("vscode-theme");
        await lumine.packages.activatePackage(`vscode-${mode}-syntax`);
        await lumine.packages.activatePackage("language-regex");
        await lumine.packages.activatePackage(sample.packageName);
        editor = await lumine.workspace.open(
          path.join(__dirname, "fixtures", "syntax", `sample.${sample.extension}`),
        );
        await editor.getBuffer().languageMode.ready;
        expect(editor.getGrammar().scopeName).toBe(sample.scope);

        const workspace = lumine.views.getView(lumine.workspace);
        jasmine.attachToDOM(workspace);
        const view = lumine.views.getView(editor);
        view.getComponent().updateSync();

        function tokenAt(needle, offset = 0) {
          const index = editor.getText().indexOf(needle);
          expect(index).not.toBe(-1);
          const point = editor.getBuffer().positionForCharacterIndex(index + offset);
          editor.scrollToBufferPosition(point, { center: true });
          view.getComponent().updateSync();
          const screenPoint = editor.screenPositionForBufferPosition(point);
          const line = view.querySelector(`.lines .line[data-screen-row="${screenPoint.row}"]`);
          expect(line).not.toBeNull();
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
          let column = 0;
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (column + node.textContent.length > screenPoint.column) {
              return { element: node.parentElement, point };
            }
            column += node.textContent.length;
          }
          throw new Error(`No rendered token at ${needle}`);
        }

        for (const [needle, role, scope, offset, properties] of sample.cases) {
          const { element, point } = tokenAt(needle, offset);
          expect(editor.scopeDescriptorForBufferPosition(point).getScopesArray()).toContain(scope);
          const style = getComputedStyle(element);
          expect(style.color).toBe(rgb(reference.modes[mode].tokens[role]));
          for (const [property, value] of Object.entries(properties ?? {})) {
            expect(style[property]).toBe(value);
          }
        }

        for (const [needle, scope, decoration] of sample.decorations ?? []) {
          const { element, point } = tokenAt(needle);
          expect(editor.scopeDescriptorForBufferPosition(point).getScopesArray()).toContain(scope);
          const ancestors = [];
          for (let parent = element; parent && parent !== view; parent = parent.parentElement) {
            ancestors.push(getComputedStyle(parent).textDecorationLine);
          }
          expect(ancestors).toContain(decoration);
        }
      });
    }
  }
});
