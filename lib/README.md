# Third-party files

| File | Project | License |
|---|---|---|
| `stockfish-19-lite-single.js`, `stockfish-19-lite-single.wasm` | [Stockfish.js 19](https://github.com/nmrugg/stockfish.js) (Stockfish by the Stockfish developers, see AUTHORS in the upstream repo) | GPLv3, see `STOCKFISH-LICENSE.txt` |
| `sf-bundle.js` | The same Stockfish.js files, packed (JS as a string + WASM as base64) so the app also works from `file://` | GPLv3 |
| `chess-classic.js` | [chess.js 0.13.4](https://github.com/jhlywa/chess.js) by Jeff Hlywa, converted from an ES module to a classic script | BSD-2-Clause, see `CHESSJS-LICENSE.txt` |
| `pieces/*.svg` | cburnett piece set by Colin M.L. Burnett | GPLv2+, see `pieces/LICENSE.md` |

To regenerate `sf-bundle.js` from the two Stockfish files, run `python3 build.py --bundle` from the repo root.
