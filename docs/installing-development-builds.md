# Installing a development build

Social Deck is not yet listed in Obsidian's Community plugins catalogue. GitHub Actions produces an installable ZIP after each successful build on `main`.

## Download the build

1. Open the repository's **Actions** tab.
2. Select the latest successful **Build plugin** run for `main`.
3. Under **Artifacts**, download **social-deck**.
4. Extract the downloaded artifact. It contains `social-deck.zip`; extract that ZIP as well.

The final files are:

```text
main.js
manifest.json
styles.css
```

## Install on Windows

1. In Obsidian, open **Settings → Files and links** and note the vault location.
2. Close Obsidian, or leave it open and reload it after copying the files.
3. In the vault, create this folder if it does not exist:

   ```text
   <vault>\.obsidian\plugins\social-deck\
   ```

4. Copy `main.js`, `manifest.json` and `styles.css` into that folder.
5. In Obsidian, open **Settings → Community plugins**.
6. Select **Reload plugins** or restart Obsidian.
7. Enable **Social Deck**.
8. Use the raven ribbon icon or run **Social Deck: Open Social Deck** from the command palette.

To update an existing development installation, replace the same three files and reload Obsidian.

## Test with the example note

Open Social Deck from the command palette or ribbon. Paste text into the sidebar
composer; Social Deck should display platform controls and a character count.
