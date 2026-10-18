# Unreal Editor Icons

**Open the site: <https://7udwig.github.io/Unreal-Editor-Icons/>**

A fast, searchable browser for the **editor icons of Unreal Engine** (4.25 - 5.8, 3,500 - 5,200 icons each).
Pick a version, search, change the display size of all icons at once, open an icon to compare it at 16/24/32/48 px on a dark,
light or checkerboard background, and copy its code name or the C++ line that uses it.

* **Version selector** with *NEW* and *GONE IN x* badges and filters for both. Only icons that are completely new or gone are marked.
* **Nothing is stored or sent** - no cookies, no local storage, no analytics, no external requests.
* The *name* is the path of the file below `Engine/Content`, e.g. `Editor/Slate/Starship/Actors/attach`. The **code name** (`FAppStyle::GetBrush("Icons.Plus")`) comes from the engine's style source files. Many icon files have none: about 40 % of the files in 5.8 are not referenced anywhere in the engine source (old, unused assets), and some are only used inside widget styles (check box, window buttons) which have no brush name.

## Where the data comes from

The icons are the `.svg`/`.png` files below `Engine/Content/Editor/Slate` and `Engine/Content/Slate` of each Unreal Engine version. The code names are read from the style source files of the same version.

**Releases before 4.25 are missing**: Epic has removed their content from its servers. For 4.25 - 5.1 the state of the last hotfix of the release branch is used; from 5.2 on the first release (`x.y.0`).

## License

* The icons are (c) Epic Games, Inc. and covered by the Unreal Engine EULA. They are shown only as a developer reference and are not offered under an open license. If Epic asks for removal, they will be removed.
* The code of this site (everything else) is MIT licensed, see `LICENSE`.

This is an unofficial project, not affiliated with or endorsed by Epic Games. "Unreal" and "Unreal Engine" are trademarks of Epic Games, Inc.
