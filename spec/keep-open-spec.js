const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const themeNames = ["day", "night"].flatMap((mode) => [
  `vscode-${mode}-ui`,
  `vscode-${mode}-syntax`,
]);

describe("VS Code select-list keep-open presentation", () => {
  let host;

  beforeEach(async () => {
    jasmine.attachToDOM(lumine.workspace.getElement());
    lumine.config.transact(() => {
      lumine.config.set("theme.accentSource", "theme");
      lumine.config.set("theme.light", ["vscode-day-ui", "vscode-day-syntax"]);
      lumine.config.set("theme.dark", ["vscode-night-ui", "vscode-night-syntax"]);
    });
    await lumine.packages.activatePackage(packageRoot);
  });

  afterEach(async () => {
    await host?.destroy();
    host = null;
    await lumine.themes.deactivateThemes();
    for (const name of [...themeNames, "vscode-theme"])
      await lumine.packages.deactivatePackage(name);
  });

  for (const mode of ["day", "night"]) {
    it(`accents the ${mode} picker outline without changing its rounded card or shadow`, async () => {
      lumine.config.set("theme.mode", mode === "day" ? "light" : "dark");
      await lumine.themes.activateThemes();
      host = lumine.workspace.addSelectList({
        items: ["First", "Second"],
        renderItem: (item) => ({ primary: item }),
      });
      await host.show();
      const list = host.getModel();
      const panel = host.getPanel().getElement();
      const before = getComputedStyle(panel);
      const shadow = before.boxShadow;
      const radius = before.borderRadius;
      const outline = {
        style: before.outlineStyle,
        width: before.outlineWidth,
        color: before.outlineColor,
        offset: before.outlineOffset,
      };
      expect(before.borderBottomLeftRadius).toBe("6px");
      expect(before.borderBottomRightRadius).toBe("6px");

      const probe = document.createElement("span");
      probe.style.color = "var(--accent-indicator-color)";
      panel.appendChild(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();

      await list.runAction("select-list:toggle-keep-open");
      const active = getComputedStyle(panel);
      expect(list.isKeepOpen()).toBe(true);
      expect(active.outlineStyle).toBe("solid");
      expect(active.outlineWidth).toBe("2px");
      expect(active.outlineColor).toBe(accent);
      expect(active.borderRadius).toBe(radius);
      expect(active.boxShadow).toBe(shadow);

      await list.runAction("select-list:toggle-keep-open");
      const restored = getComputedStyle(panel);
      expect(list.isKeepOpen()).toBe(false);
      expect(restored.outlineStyle).toBe(outline.style);
      expect(restored.outlineWidth).toBe(outline.width);
      expect(restored.outlineColor).toBe(outline.color);
      expect(restored.outlineOffset).toBe(outline.offset);
      expect(restored.borderRadius).toBe(radius);
      expect(restored.boxShadow).toBe(shadow);
    });
  }
});
