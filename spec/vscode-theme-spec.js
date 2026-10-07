const fs = require("fs");
const path = require("path");
const reference = require("./fixtures/vscode-reference.json");
const packageRoot = path.resolve(__dirname, "..");
const themeNames = ["day", "night"].flatMap((mode) => [
  `vscode-${mode}-ui`,
  `vscode-${mode}-syntax`,
]);

function color(value) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.appendChild(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}
async function setMode(mode) {
  lumine.config.set("theme.mode", mode === "day" ? "light" : "dark");
  await lumine.themes.activateThemes();
}
async function loadAlternate() {
  const fixtures = path.join(lumine.application.getResourcePath(), "spec", "fixtures", "packages");
  for (const name of ["theme-modern-ui", "theme-modern-syntax"])
    await lumine.packages.activatePackage(path.join(fixtures, name));
  return ["theme-modern-ui", "theme-modern-syntax"];
}

describe("vscode-theme against the frozen VS Code Modern reference", () => {
  let disposables;
  beforeEach(async () => {
    disposables = [];
    jasmine.attachToDOM(lumine.views.getView(lumine.workspace));
    lumine.config.transact(() => {
      lumine.config.set("theme.accentSource", "theme");
      lumine.config.set("theme.light", ["vscode-day-ui", "vscode-day-syntax"]);
      lumine.config.set("theme.dark", ["vscode-night-ui", "vscode-night-syntax"]);
    });
    await lumine.packages.activatePackage(packageRoot);
  });
  afterEach(async () => {
    for (const disposable of disposables.reverse()) {
      if (typeof disposable.destroy === "function") await disposable.destroy();
      else disposable.dispose();
    }
    lumine.config.set("theme.accentSource", "theme");
    lumine.themes.systemAccentColor = null;
    lumine.themes.applyAccentColor();
    await lumine.themes.deactivateThemes();
    for (const name of [
      "theme-selector",
      "command-palette",
      "status-bar",
      "tabs",
      ...themeNames,
      "vscode-theme",
      "theme-modern-ui",
      "theme-modern-syntax",
    ])
      await lumine.packages.deactivatePackage(name);
  });

  it("registers both pairs and loads only its own theme styles", async () => {
    const pack = lumine.themes.getThemePacks().find(({ name }) => name === "VS Code Modern");
    expect(pack.light).toEqual(["vscode-day-ui", "vscode-day-syntax"]);
    expect(pack.dark).toEqual(["vscode-night-ui", "vscode-night-syntax"]);
    for (const mode of ["day", "night"]) {
      await setMode(mode);
      for (const name of [`vscode-${mode}-ui`, `vscode-${mode}-syntax`]) {
        const paths = lumine.packages.getLoadedPackage(name).getStylesheetPaths();
        expect(paths.length).toBeGreaterThan(0);
        for (const p of paths) {
          expect(path.relative(packageRoot, p).startsWith("..")).toBe(false);
          expect(lumine.themes.stylesheetElementForId(p)).not.toBeNull();
        }
      }
    }
    expect(lumine.packages.getLoadedPackage("one-theme")).toBeUndefined();
  });

  for (const mode of ["day", "night"])
    describe(mode, () => {
      const expected = reference.modes[mode].colors;
      beforeEach(async () => {
        await setMode(mode);
      });
      it("uses reference editor, tab and status-bar surfaces and heights", async () => {
        const statusPackage = await lumine.packages.activatePackage("status-bar");
        await lumine.packages.activatePackage("tabs");
        const editor = await lumine.workspace.open();
        disposables.push(editor);
        const element = lumine.views.getView(editor);
        element.focus();
        const status = statusPackage.mainModule.statusBar.element;
        const tab = lumine.workspace.getActivePane().getElement().querySelector(".tab.active");
        expect(getComputedStyle(element).backgroundColor).toBe(
          color(expected["editor.background"]),
        );
        expect(getComputedStyle(element).color).toBe(color(expected["editor.foreground"]));
        expect(getComputedStyle(tab).height).toBe(`${reference.geometry.tabHeight}px`);
        expect(getComputedStyle(tab).backgroundColor).toBe(color(expected["tab.activeBackground"]));
        expect(getComputedStyle(tab).color).toBe(color(expected["tab.activeForeground"]));
        expect(getComputedStyle(status).height).toBe(`${reference.geometry.statusbarHeight}px`);
        expect(getComputedStyle(status).backgroundColor).toBe(
          color(expected["statusBar.background"]),
        );
        expect(getComputedStyle(status).color).toBe(color(expected["statusBar.foreground"]));
      });
      it("uses the quick-input surface, compact rows and input focus in a real picker", async () => {
        const host = lumine.workspace.addSelectList({
          items: ["Open File"],
          renderItem: (item) => {
            const row = document.createElement("li");
            row.textContent = item;
            return row;
          },
        });
        disposables.push(host);
        await host.show();
        const panel = host.getPanel().getElement();
        const row = host.getModel().getElement().querySelector("li.selected");
        expect(getComputedStyle(panel).backgroundColor).toBe(
          color(expected["quickInput.background"]),
        );
        expect(parseFloat(getComputedStyle(panel).width)).toBe(
          Math.min(reference.geometry.quickInputWidth, window.innerWidth - 16),
        );
        expect(getComputedStyle(row).height).toBe(`${reference.geometry.quickInputRowHeight}px`);
        expect(getComputedStyle(row).backgroundColor).toBe(
          color(expected["list.activeSelectionBackground"]),
        );
        expect(getComputedStyle(row).color).toBe(color(expected["list.activeSelectionForeground"]));
        const input = host.getModel().getElement().querySelector("lumine-text-editor[mini]");
        input.focus();
        expect(getComputedStyle(input).backgroundColor).toBe(color(expected["input.background"]));
        expect(getComputedStyle(input).borderTopColor).toBe(color(expected.focusBorder));
        expect(getComputedStyle(input).boxShadow).toBe("none");
        // Overlay decorations must keep their viewport containing block.
        expect(getComputedStyle(panel).transform).toBe("none");
        const overlay = document.createElement("lumine-overlay");
        input.appendChild(overlay);
        overlay.style.cssText = "position: fixed; top: 50px; left: 70px; width: 10px; height: 10px";
        const control = document.createElement("div");
        control.style.cssText = overlay.style.cssText;
        lumine.views.getView(lumine.workspace).appendChild(control);
        expect(overlay.getBoundingClientRect().top).toBe(control.getBoundingClientRect().top);
        expect(overlay.getBoundingClientRect().left).toBe(control.getBoundingClientRect().left);
        control.remove();
      });
      it("keeps primary and selected tree controls on the accent pair independently of sidebar selection", async () => {
        spyOn(lumine.themes.applicationDelegate, "invokeApp").and.returnValue(
          Promise.resolve("#ddeeff"),
        );
        lumine.config.set("theme.accentSource", "system");
        await lumine.themes.refreshSystemAccentColor();
        expect(color("var(--accent-background-color)")).toBe(color("#ddeeff"));
        const tree = document.createElement("div");
        tree.className = "tree-view";
        tree.tabIndex = 0;
        tree.innerHTML =
          '<button class="btn selected">Selected</button><button class="btn btn-primary">Add Folders</button>';
        document.body.appendChild(tree);
        disposables.push({ dispose: () => tree.remove() });

        for (const focused of [false, true]) {
          if (focused) tree.focus();
          else tree.blur();
          expect(document.activeElement === tree).toBe(focused);
          for (const button of tree.children) {
            const style = getComputedStyle(button);
            expect(style.backgroundColor).toBe(color("#ddeeff"));
            expect(style.color).toBe(color("var(--accent-foreground-color)"));
          }
        }
      });
      it("keeps real command-palette rows compact until their descriptions are shown", async () => {
        const plainCommand = "aaa-vscode-ui:plain-action";
        const describedCommand = "aaa-vscode-ui:described-action";
        disposables.push(
          lumine.commands.add("lumine-workspace", {
            [plainCommand]: () => {},
            [describedCommand]: {
              description: "A visible second line for the command.",
              didDispatch: () => {},
            },
          }),
        );
        const { mainModule } = await lumine.packages.activatePackage("command-palette");
        const palette = mainModule.ensureList();
        await palette.show();
        const list = palette.selectList;
        // A picker may inherit semantic ink from the surface that opened it.
        // Ordinary labels keep their foreground while row utilities opt in.
        list.getElement().style.color = "var(--text-color-info)";
        const rowFor = (name) => list.getElement().querySelector(`li[data-event-name="${name}"]`);
        await list.selectItem(list.getItems().find((item) => item.name === describedCommand));

        for (const name of [plainCommand, describedCommand]) {
          const row = rowFor(name);
          expect(row).not.toBeNull();
          expect(row.querySelector(".secondary-line")).toBeNull();
          expect(getComputedStyle(row).height).toBe(`${reference.geometry.quickInputRowHeight}px`);
        }
        expect(getComputedStyle(rowFor(plainCommand).querySelector(".primary-line")).color).toBe(
          color(expected.foreground),
        );
        expect(rowFor(plainCommand).querySelector(".character-match")).toBeNull();
        const plainRow = rowFor(plainCommand);
        for (const [className, variable] of [
          ["text-subtle", "--text-color-subtle"],
          ["text-error", "--text-color-error"],
        ]) {
          plainRow.classList.add(className);
          expect(getComputedStyle(plainRow.querySelector(".primary-line")).color).toBe(
            color(`var(${variable})`),
          );
          plainRow.classList.remove(className);
        }
        expect(
          getComputedStyle(rowFor(describedCommand).querySelector(".primary-line")).color,
        ).toBe(color(expected["list.activeSelectionForeground"]));
        expect(getComputedStyle(rowFor(describedCommand)).outlineStyle).toBe("none");
        list.getElement().style.removeProperty("color");

        await palette.toggleDescriptions();
        expect(rowFor(describedCommand).querySelector(".secondary-line").textContent).toBe(
          "A visible second line for the command.",
        );
        expect(getComputedStyle(rowFor(describedCommand)).height).toBe(
          `${reference.geometry.quickInputRowHeight * 2}px`,
        );
        expect(getComputedStyle(rowFor(plainCommand)).height).toBe(
          `${reference.geometry.quickInputRowHeight}px`,
        );

        await palette.toggleDescriptions();
        expect(rowFor(describedCommand).querySelector(".secondary-line")).toBeNull();
        expect(getComputedStyle(rowFor(describedCommand)).height).toBe(
          `${reference.geometry.quickInputRowHeight}px`,
        );
      });
      it("uses dedicated menu colors in a real command popup", async () => {
        const anchor = document.createElement("button");
        anchor.style.cssText = "position: fixed; left: 100px; top: 100px";
        document.body.appendChild(anchor);
        disposables.push({ dispose: () => anchor.remove() });
        const popup = lumine.menu.showPopup({
          anchor,
          template: [{ label: "Open", command: "core:open-file" }],
        });
        disposables.push(popup);
        popup.rootList.selectItem(popup.rootList.items[0], { focus: true });
        const item = popup.element.querySelector(".menu-item");
        // Background-color transitions settle on the native rendering clock.
        await waitForFrames(
          () =>
            getComputedStyle(item).backgroundColor === color(expected["menu.selectionBackground"]),
          { description: "the menu selection color" },
        );
        expect(getComputedStyle(popup.rootList.element).backgroundColor).toBe(
          color(expected["menu.background"]),
        );
        expect(getComputedStyle(item).backgroundColor).toBe(
          color(expected["menu.selectionBackground"]),
        );
        expect(getComputedStyle(item).color).toBe(color(expected["menu.selectionForeground"]));
        expect(getComputedStyle(item.querySelector(".menu-item-keystroke")).color).toBe(
          color(expected["menu.selectionForeground"]),
        );
      });
      it("styles real popup scrollbars with reference width and opacity", async () => {
        const select = lumine.menu.createSelectBox({ items: ["Light", "Dark"], value: "Light" });
        disposables.push(select);
        document.body.appendChild(select.element);
        await select.open();
        const list = select.listElement;
        const thumb = getComputedStyle(list, "::-webkit-scrollbar-thumb");
        expect(getComputedStyle(list, "::-webkit-scrollbar").width).toBe(
          `${reference.geometry.popupScrollbarWidth}px`,
        );
        expect(getComputedStyle(list, "::-webkit-scrollbar-track").backgroundColor).toBe(
          "rgba(0, 0, 0, 0)",
        );
        expect(thumb.borderTopWidth).toBe("0px");
        expect(thumb.borderRadius).toBe("0px");
        expect(thumb.backgroundColor).toBe(color(expected["scrollbarSlider.background"]));
        expect(thumb.backgroundClip).toBe("border-box");
      });
      it("uses reference primary-button geometry and a single focus outline", () => {
        const button = document.createElement("button");
        button.className = "btn btn-primary";
        button.textContent = "Apply";
        document.body.appendChild(button);
        disposables.push({ dispose: () => button.remove() });
        const style = getComputedStyle(button);
        expect(style.height).toBe(`${reference.geometry.buttonHeight}px`);
        expect(style.fontSize).toBe(`${reference.geometry.buttonFontSize}px`);
        expect(style.lineHeight).toBe(`${reference.geometry.buttonLineHeight}px`);
        expect(style.paddingTop).toBe(`${reference.geometry.buttonPaddingVertical}px`);
        expect(style.paddingLeft).toBe(`${reference.geometry.buttonPaddingHorizontal}px`);
        expect(style.borderTopWidth).toBe(`${reference.geometry.buttonBorderWidth}px`);
        expect(style.backgroundColor).toBe(color(expected["button.background"]));
        expect(style.color).toBe(color(expected["button.foreground"]));
        button.focus();
        expect(getComputedStyle(button).outlineWidth).toBe("1px");
        expect(getComputedStyle(button).outlineColor).toBe(color(expected.focusBorder));
        expect(getComputedStyle(button).boxShadow).toBe("none");
      });
      it("preserves all sixteen reference terminal ANSI colors", () => {
        for (const [name, value] of Object.entries(reference.modes[mode].ansi)) {
          const suffix = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          expect(color(`var(--terminal-color-${suffix})`)).toBe(color(value));
        }
      });
    });

  it("removes VS Code styles when switching to an independent alternate pair", async () => {
    await setMode("day");
    await setMode("night");
    expect(lumine.themes.getActiveThemeNames().sort()).toEqual([
      "vscode-night-syntax",
      "vscode-night-ui",
    ]);
    const paths = lumine.themes.getActiveThemes().flatMap((theme) => theme.getStylesheetPaths());
    const pair = await loadAlternate();
    lumine.config.set("theme.dark", pair);
    await lumine.themes.queueThemeSwitch();
    for (const p of paths) expect(lumine.themes.stylesheetElementForId(p)).toBeNull();
    expect(color("var(--text-color)")).toBe(color("#123456"));
    expect(lumine.packages.getLoadedPackage("one-theme")).toBeUndefined();
  });
  it("restores both pairs and the palette after Theme Selector preview cancellation", async () => {
    const pair = await loadAlternate();
    const other = { name: "Reference alternate", light: pair, dark: pair };
    disposables.push(lumine.themes.registerThemePack(other));
    lumine.themes.setThemePack(other);
    await setMode("day");
    const pack = await lumine.packages.activatePackage("theme-selector");
    const selector = pack.mainModule.getSelector();
    await selector.show();
    selector.preview(lumine.themes.getThemePacks().find(({ name }) => name === "VS Code Modern"));
    await lumine.themes.queueThemeSwitch();
    expect(color("var(--text-color)")).toBe(color(reference.modes.day.colors.foreground));
    selector.cancel();
    await lumine.themes.queueThemeSwitch();
    expect(lumine.config.get("theme.light")).toEqual(pair);
    expect(lumine.config.get("theme.dark")).toEqual(pair);
    expect(color("var(--text-color)")).toBe(color("#123456"));
    for (const name of ["vscode-day-ui", "vscode-day-syntax"])
      for (const p of lumine.packages.getLoadedPackage(name).getStylesheetPaths())
        expect(lumine.themes.stylesheetElementForId(p)).toBeNull();
  });
  it("respects the system accent and restores the theme accent", async () => {
    await setMode("night");
    spyOn(lumine.themes.applicationDelegate, "invokeApp").and.returnValue(
      Promise.resolve("#112233"),
    );
    lumine.config.set("theme.accentSource", "system");
    await lumine.themes.refreshSystemAccentColor();
    expect(color("var(--accent-background-color)")).toBe(color("#112233"));
    expect(color("var(--progress-background-color)")).toBe(color("#112233"));
    const button = document.createElement("button");
    button.className = "btn selected";
    document.body.appendChild(button);
    disposables.push({ dispose: () => button.remove() });
    expect(getComputedStyle(button).backgroundColor).toBe(color("#112233"));
    expect(getComputedStyle(button).color).toBe(color("var(--accent-foreground-color)"));
    lumine.config.set("theme.accentSource", "theme");
    lumine.themes.applyAccentColor();
    expect(color("var(--accent-background-color)")).toBe(
      color(reference.modes.night.colors["button.background"]),
    );
  });
  it("keeps both modes on the same variable contracts", () => {
    for (const type of ["ui", "syntax"]) {
      const names = ["day", "night"].map((mode) => {
        const source = fs.readFileSync(
          path.join(packageRoot, "styles", `${mode}-${type}`, "variables.css"),
          "utf8",
        );
        return [...source.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => match[1]);
      });
      expect(names[0]).toEqual(names[1]);
    }
  });
});
