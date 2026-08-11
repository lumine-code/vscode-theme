const fs = require("fs");
const path = require("path");

const packageNames = [
  "vscode-day-ui",
  "vscode-day-syntax",
  "vscode-night-ui",
  "vscode-night-syntax",
];

const tokenColorCases = {
  day: {
    "syntax--string": "rgb(163, 21, 21)",
    "syntax--comment": "rgb(0, 128, 0)",
    "syntax--constant syntax--numeric": "rgb(9, 134, 88)",
    "syntax--constant syntax--language": "rgb(0, 0, 255)",
    "syntax--constant syntax--variable": "rgb(0, 112, 193)",
    "syntax--storage syntax--type": "rgb(0, 0, 255)",
    "syntax--string syntax--regexp": "rgb(129, 31, 63)",
    "syntax--variable syntax--language": "rgb(0, 0, 255)",
    "syntax--entity syntax--label": "rgb(0, 0, 0)",
    "syntax--markup syntax--heading": "rgb(128, 0, 0)",
    "syntax--markup syntax--inserted": "rgb(9, 134, 88)",
    "syntax--entity syntax--name syntax--function": "rgb(121, 94, 38)",
    "syntax--entity syntax--name syntax--tag": "rgb(128, 0, 0)",
  },
  night: {
    "syntax--string": "rgb(206, 145, 120)",
    "syntax--comment": "rgb(106, 153, 85)",
    "syntax--constant syntax--numeric": "rgb(181, 206, 168)",
    "syntax--constant syntax--language": "rgb(86, 156, 214)",
    "syntax--constant syntax--variable": "rgb(79, 193, 255)",
    "syntax--storage syntax--type": "rgb(86, 156, 214)",
    "syntax--string syntax--regexp": "rgb(209, 105, 105)",
    "syntax--variable syntax--language": "rgb(86, 156, 214)",
    "syntax--entity syntax--label": "rgb(200, 200, 200)",
    "syntax--markup syntax--heading": "rgb(86, 156, 214)",
    "syntax--markup syntax--inserted": "rgb(181, 206, 168)",
    "syntax--entity syntax--name syntax--function": "rgb(220, 220, 170)",
    "syntax--entity syntax--name syntax--tag": "rgb(86, 156, 214)",
  },
};

const focusedListColorCases = {
  day: { background: "#e8e8e8", text: "#000000" },
  night: { background: "#04395e", text: "#ffffff" },
};

const cssPropertyColorCases = {
  day: "rgb(229, 0, 0)",
  night: "rgb(156, 220, 254)",
};

describe("vscode-theme", () => {
  afterEach(async () => {
    for (const packageName of packageNames) {
      await lumine.packages.deactivatePackage(packageName);
    }
    await lumine.packages.deactivatePackage("vscode-theme");
  });

  it("registers its light and dark themes as a pack", async () => {
    await lumine.packages.activatePackage("vscode-theme");

    const themePack = lumine.themes.getThemePacks().find(({ name }) => name === "VS Code Modern");

    expect(themePack.light).toEqual(["vscode-day-ui", "vscode-day-syntax"]);
    expect(themePack.dark).toEqual(["vscode-night-ui", "vscode-night-syntax"]);
  });

  for (const mode of ["day", "night"]) {
    it(`inherits One's shared styles and applies its own ${mode} overrides`, async () => {
      await lumine.packages.activatePackage("vscode-theme");

      const uiPackageName = `vscode-${mode}-ui`;
      const syntaxPackageName = `vscode-${mode}-syntax`;
      const uiPaths = lumine.packages.getLoadedPackage(uiPackageName).getStylesheetPaths();
      const syntaxPaths = lumine.packages.getLoadedPackage(syntaxPackageName).getStylesheetPaths();
      const uiPathByName = new Map(
        uiPaths.map((stylePath) => [path.basename(stylePath), stylePath]),
      );
      const syntaxPathByName = new Map(
        syntaxPaths.map((stylePath) => [path.basename(stylePath), stylePath]),
      );

      expect(uiPathByName.get("02-badges.css")).toContain("one-theme");
      expect(uiPathByName.get("03-buttons.css")).toContain("one-theme");
      expect(uiPathByName.get("overrides.css")).toContain("vscode-theme");
      expect(uiPathByName.has("config.css")).toBe(false);
      expect(syntaxPathByName.get("04-base.css")).toContain("one-theme");
      expect(syntaxPathByName.get("variables.css")).toContain("vscode-theme");
      expect(syntaxPathByName.get("overrides.css")).toContain("vscode-theme");

      expect(uiPaths.indexOf(uiPathByName.get("03-buttons.css"))).toBeLessThan(
        uiPaths.indexOf(uiPathByName.get("overrides.css")),
      );
      expect(syntaxPaths.indexOf(syntaxPathByName.get("04-base.css"))).toBeLessThan(
        syntaxPaths.indexOf(syntaxPathByName.get("overrides.css")),
      );

      await lumine.packages.activatePackage(uiPackageName);
      await lumine.packages.activatePackage(syntaxPackageName);
      expect(
        lumine.themes.stylesheetElementForId(uiPathByName.get("03-buttons.css")),
      ).not.toBeNull();
      expect(
        lumine.themes.stylesheetElementForId(uiPathByName.get("overrides.css")),
      ).not.toBeNull();
      expect(
        lumine.themes.stylesheetElementForId(syntaxPathByName.get("04-base.css")),
      ).not.toBeNull();
      expect(
        lumine.themes.stylesheetElementForId(syntaxPathByName.get("overrides.css")),
      ).not.toBeNull();

      for (const [className, expectedColor] of Object.entries(tokenColorCases[mode])) {
        const token = document.createElement("span");
        token.className = className;
        document.body.appendChild(token);
        expect(getComputedStyle(token).color).toBe(expectedColor);
        token.remove();
      }

      const cssSource = document.createElement("span");
      const cssProperty = document.createElement("span");
      cssSource.className = "syntax--source syntax--css";
      cssProperty.className = "syntax--entity syntax--property syntax--support";
      cssSource.appendChild(cssProperty);
      document.body.appendChild(cssSource);
      expect(getComputedStyle(cssProperty).color).toBe(cssPropertyColorCases[mode]);
      cssSource.remove();

      const treeView = document.createElement("div");
      treeView.className = "tree-view";
      treeView.tabIndex = -1;
      document.body.appendChild(treeView);
      treeView.focus();
      const treeViewStyle = getComputedStyle(treeView);
      expect(treeViewStyle.getPropertyValue("--button-background-color-selected").trim()).toBe(
        focusedListColorCases[mode].background,
      );
      expect(treeViewStyle.getPropertyValue("--accent-bg-text-color").trim()).toBe(
        focusedListColorCases[mode].text,
      );
      treeView.remove();
    });
  }

  it("keeps day and night palettes on the same variable contracts", async () => {
    await lumine.packages.activatePackage("vscode-theme");

    for (const themeType of ["ui", "syntax"]) {
      const variableNames = packageNames
        .filter((packageName) => packageName.endsWith(`-${themeType}`))
        .map((packageName) => {
          const variablesPath = lumine.packages
            .getLoadedPackage(packageName)
            .getStylesheetPaths()
            .find(
              (stylePath) =>
                path.basename(stylePath) === "variables.css" && stylePath.includes("vscode-theme"),
            );
          const source = fs.readFileSync(variablesPath, "utf8");
          return [...source.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => match[1]);
        });

      expect(variableNames[0]).toEqual(variableNames[1]);
    }
  });
});
