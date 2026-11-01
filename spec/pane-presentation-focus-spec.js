const path = require("path");

jasmine.describeWithDocumentFocus("VS Code pane presentation focus markers", () => {
  let presentation, bar;

  beforeEach(async () => {
    jasmine.useRealClock();
    lumine.config.set("core.destroyEmptyPanes", false);
    lumine.config.set("theme.accentSource", "theme");
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
  });

  afterEach(async () => {
    presentation?.dispose();
    presentation = null;
    bar?.remove();
    for (const mode of ["day", "night"])
      await lumine.packages.deactivatePackage(`vscode-${mode}-ui`);
    await lumine.packages.deactivatePackage("vscode-theme");
  });

  for (const mode of ["day", "night"]) {
    it(`keeps the active accent while the live pane moves into its presentation in ${mode}`, async () => {
      await lumine.packages.activatePackage(`vscode-${mode}-ui`);
      const container = lumine.workspace.getMainWindow().getEditorContainer();
      const pane = container.getActivePane();
      pane.splitRight({ activate: false });
      const input = document.createElement("input");
      input.canCopy = () => false;
      input.getAllowedLocations = () => ["center"];
      pane.activateItem(input, { activatePane: true });
      bar = document.createElement("ul");
      bar.className = "tab-bar";
      bar.setAttribute("location", "center");
      bar.innerHTML = '<li class="tab active"><span class="title">Document</span></li>';
      pane.getElement().insertBefore(bar, pane.getElement().firstChild);
      input.focus();
      const tab = bar.querySelector(".tab.active");
      const probe = document.createElement("span");
      probe.style.color = "var(--accent-indicator-color)";
      bar.appendChild(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      const assertMarker = () => {
        const marker = getComputedStyle(tab, "::before");
        expect(marker.content).toBe('""');
        expect(marker.height).toBe("1px");
        expect(marker.backgroundColor).toBe(accent);
      };
      assertMarker();

      presentation = container.presentPane(pane);

      expect(document.activeElement).toBe(input);
      assertMarker();
      presentation.dispose();
      assertMarker();
    });
  }
});
