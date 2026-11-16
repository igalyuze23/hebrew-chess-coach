#!/usr/bin/env python3
"""Build index.html from src/. Run from anywhere: python3 build.py [--bundle]

--bundle  also regenerate lib/sf-bundle.js from lib/stockfish-19-lite-single.{js,wasm}
"""
import base64, json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()

def build_html():
    js = '\n'.join(read(n) for n in ['core.js', 'review.js', 'narrator.js', 'play.js'])
    html = read('head.html') + '<script>\n' + js + '\n</script>\n</body>\n</html>\n'
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('index.html:', len(html), 'bytes')

def build_bundle():
    lib = os.path.join(ROOT, 'lib')
    with open(os.path.join(lib, 'stockfish-19-lite-single.js'), encoding='utf-8') as f:
        sf_js = f.read()
    with open(os.path.join(lib, 'stockfish-19-lite-single.wasm'), 'rb') as f:
        wasm = base64.b64encode(f.read()).decode('ascii')
    out = ('/* Stockfish.js 19 lite single-threaded (GPLv3, see STOCKFISH-LICENSE.txt). '
           'Bundled so the app works from file:// */\n'
           'window.SF_JS_SRC=' + json.dumps(sf_js) + ';\nwindow.SF_WASM_B64="' + wasm + '";\n')
    with open(os.path.join(lib, 'sf-bundle.js'), 'w', encoding='utf-8') as f:
        f.write(out)
    print('lib/sf-bundle.js:', len(out), 'bytes')

if __name__ == '__main__':
    if '--bundle' in sys.argv:
        build_bundle()
    build_html()
