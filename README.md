# vscode-theme

The VS Code day and night UI and syntax themes following the VS Code Modern look.

## Features

- **VS Code Modern look**: the Dark Modern and Light Modern palettes — #1f1f1f/#ffffff editor surfaces with #181818/#f8f8f8 chrome and the blue focus accent.
- **Compact interface**: 35px tabs, a 22px status bar, compact pickers, and flat primary buttons follow the Modern proportions.
- **Signature details**: a colored top border on the focused pane's active tab, separate focused and unfocused selections, and blue menu highlights.
- **Day and night pair**: `vscode-day-ui`/`vscode-day-syntax` and `vscode-night-ui`/`vscode-night-syntax` follow the system theme mode out of the box.
- **Dark+ and Light+ tokens**: the classic VS Code syntax colors, including the matching terminal ANSI palette.
- **Independent styles**: owns its UI and syntax rules on the editor's component contract, without inheriting another theme.

The reference is VS Code 1.139.1 with Dark Modern and Light Modern. The themes preserve the editor's layout and icons while adapting the reference colors and metrics to its existing surfaces.

## Installation

To install `vscode-theme` search for it in the Install pane of the Lumine settings, or run the command `lumine --install lumine-code/vscode-theme`.

## Theme pack

The package declares its four themes as the **VS Code Modern** pack. Use `theme-selector:toggle` to preview and select it.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
