<div dir="rtl">

# ♞ מאמן שחמט בעברית – Hebrew Chess Coach

**מאמן שחמט "פרימיום" בחינם, עם ניתוח משחקים והסברים בעברית.** בהשראת Game Review ו-Coach של chess.com, אבל חינמי לגמרי, בלי הרשמה, ועובד גם בלי אינטרנט. מנוע Stockfish 19 רץ ישירות בדפדפן שלך.

🔗 **להפעלה אונליין:** https://igalyuze23.github.io/hebrew-chess-coach/

📱 **אפליקציית אנדרואיד:** [הורדת APK](https://igalyuze23.github.io/hebrew-chess-coach/download/hebrew-chess-coach.apk) (מתקינים מהקובץ ומאשרים התקנה ממקור לא ידוע; הניתוח והמשחק עובדים גם בלי אינטרנט)

![ניתוח משחק](docs/screenshot-review.png)

| שחק מול המאמן | מובייל |
|---|---|
| ![שחק מול המאמן](docs/screenshot-play.png) | <img src="docs/screenshot-mobile.png" width="260" alt="מובייל"> |

## ✨ יכולות

- **ייבוא משחקים** מ-Chess.com ומ-Lichess לפי שם משתמש (דרך ה-API הציבורי), או הדבקת PGN. שמות המשתמשים נשמרים בדפדפן.
- **ניתוח משחק מלא (Game Review):** Stockfish בודק כל מהלך (עומק 14 כברירת מחדל, אפשר 10–20).
- **סיווג מהלכים כמו ב-chess.com:** מבריק !!, מהלך גדול !, הטוב ביותר ★, מצוין, טוב, ספר (תיאוריה), אי-דיוק ?!, טעות ?, החמצה ✗, טעות גסה ??. הסיווג מבוסס על השינוי בסיכויי הניצחון.
- **אחוז דיוק** לכל צד, **פס הערכה**, **גרף הערכה** לחיץ, וחץ שמראה את המהלך הטוב ביותר.
- **הסברים בעברית לכל טעות:** מה היה המהלך הטוב יותר, כלי שנשאר תלוי, איום שלא טופל, לקיחה חינמית שפוספסה, מזלגות, הצמדות, מט ב-N, וכמה חומר המהלך עלה.
- **🔧 תקן את המהלך:** ליד כל אי-דיוק, טעות או טעות גסה יש כפתור שמחזיר את העמדה, משחק על הלוח את המהלך של המנוע ומסביר למה הוא טוב יותר (מה הוא תוקף, לוקח או מגן, שינוי ההערכה וסיכויי הניצחון, והמשך קצר של המנוע). אפשר להמשיך לשחק מהעמדה המתוקנת בווריאציה (גם עם "תשובת המנוע"), ואז ללחוץ "חזרה לניתוח המשחק" ולהמשיך מאותו מקום. אפשר גם פשוט להזיז כלי בכל עמדה כדי לפתוח וריאציה חופשית.
- **מונה חומר:** ליד הלוח מוצגים הכלים שכל צד לקח והפרש החומר (למשל +3, לפי רגלי 1, פרש/רץ 3, צריח 5, מלכה 9). מתעדכן בכל מהלך, בניווט קדימה ואחורה במשחק, בווריאציות, בתצוגת ההמשך ובמשחק מול המאמן, כולל הכתרות.
- **המשך מומלץ:** אחרי מהלך חלש (אי-דיוק, טעות, החמצה או טעות גסה) יש כפתור **הראה המשך מומלץ**. הלוח עובר לתצוגה בלבד של כל קו המנוע, עם **הבא** / **הקודם**, ו-**חזור למשחק** מחזיר את העמדה בדיוק. זה משולב עם "תקן את המהלך".
- **שלושה מהלכים מובילים:** בזמן ניתוח המנוע מחשב `MultiPV` 3 ומציג את שלושת המהלכים הטובים בעמדה עם הציון. החץ של הטוב ביותר בולט יותר. המהלך של המנוע עצמו נשאר על הקו הראשון בלבד, כדי לא להאט את המשחק.
- **שם הפתיחה** בעברית (רשימת ECO מקוצרת) וזיהוי מהלכי תיאוריה.
- **סיכום משחק:** רגעי מפתח ומה כדאי לתרגל, לפי סוג הטעויות שלך.
- **שחק מול המאמן:** 8 רמות (בערך 400 עד 2700+), כפתור **רמז**, והסבר **"למה?"** אחרי כל מהלך שלך.
- **🔊 קריין בעברית:** מקריא את המהלכים, הסיווג והסבר קצר (Web Speech API). כולל שליטה במהירות ו**ניגון אוטומטי** של כל המשחק. במצב משחק הקריין אומר את מהלך המאמן ואת המשוב על המהלך שלך.
- **עיצוב כהה ומודרני**, מתאים למחשב ולנייד. ניווט בחצים במקלדת.
- **פרטיות:** הכל רץ אצלך בדפדפן. אין שרת ואין מעקב.

גרסה 1.2.

## 🚀 איך משתמשים

**אונליין:** נכנסים ל-https://igalyuze23.github.io/hebrew-chess-coach/

**במחשב (אופליין):** מורידים את הריפו (Code ← Download ZIP), מחלצים, ולוחצים לחיצה כפולה על `index.html`. עובד ב-Chrome, Edge ו-Firefox. אין צורך בשרת או בהתקנה. ייבוא משחקים דורש אינטרנט, אבל הניתוח לא.

**קול עברי לקריין (Windows):** הגדרות ← זמן ושפה ← דיבור ← ניהול קולות ← הוספת קולות ← עברית (Microsoft Asaf), ואז להפעיל מחדש את הדפדפן. בדפדפן Edge יש קולות עבריים טבעיים מובנים.

## 🛠️ פיתוח

הקוד נמצא ב-`src/`. אחרי שינוי, מריצים `python3 build.py` כדי לבנות מחדש את `index.html`. הפקודה `python3 build.py --bundle` בונה מחדש גם את `lib/sf-bundle.js`.

## 🙏 קרדיטים ורישיונות

- [Stockfish](https://stockfishchess.org/) דרך [Stockfish.js 19](https://github.com/nmrugg/stockfish.js) (גרסת lite, חוט יחיד, WebAssembly). רישיון **GPLv3**.
- [chess.js](https://github.com/jhlywa/chess.js) 0.13.4 מאת Jeff Hlywa. רישיון **BSD-2-Clause**.
- ערכת הכלים **cburnett** מאת [Colin M.L. Burnett](https://en.wikipedia.org/wiki/User:Cburnett), דרך [Lichess](https://github.com/lichess-org/lila). רישיון **GPLv2+**.
- הפרויקט כולו מופץ ברישיון **GPLv3** (ראו `LICENSE`), כי Stockfish כלול בו. פרטים נוספים ב-[`lib/README.md`](lib/README.md).

> 🤖 הפרויקט נבנה בעזרת בינה מלאכותית. ההסברים נוצרים אוטומטית מניתוח המנוע וייתכנו בהם אי-דיוקים.

</div>

---

# ♞ Hebrew Chess Coach

**A free "premium" chess coach with game analysis and explanations in Hebrew.** It's inspired by chess.com's Game Review and Coach, but it's completely free, needs no sign-up, and works offline. Stockfish 19 runs right in your browser.

🔗 **Live:** https://igalyuze23.github.io/hebrew-chess-coach/

📱 **Android app:** [Download the APK](https://igalyuze23.github.io/hebrew-chess-coach/download/hebrew-chess-coach.apk) (sideload it and allow installing from unknown sources; analysis and play work offline)

## Features

- **Import games** from Chess.com or Lichess by username through their public APIs, or paste a PGN. Usernames are saved in the browser.
- **Full Game Review:** Stockfish checks every move, at depth 14 by default (adjustable from 10 to 20).
- **chess.com-style move classes:** brilliant, great, best, excellent, good, book, inaccuracy, mistake, miss and blunder. They're based on the change in expected win %.
- **Accuracy** for each side, an **eval bar**, a clickable **eval graph**, and a best-move arrow.
- **Rule-based Hebrew explanations** built on top of the engine output, with no paid API. They cover the better move, hanging pieces, ignored threats, missed free captures, forks, pins, mate-in-N, and the material lost compared with the best move.
- **🔧 Fix the move:** every inaccuracy, mistake or blunder gets a button that rewinds to the position, plays the engine's move on the board and explains in Hebrew why it's better (what it attacks, wins or defends, the eval and win-% change, and a short engine line). You can keep playing from the corrected position as a sideline (with an "engine reply" button), then press "back to game review" to continue where you were. Moving a piece in any review position also opens a free sideline.
- **Material counter:** captured pieces for each side and the material balance (e.g. +3, with P1 N3 B3 R5 Q9) next to the board. It updates on every move, when stepping through history, in sidelines, in the recommended-line preview and in play mode, promotions included.
- **Recommended continuation:** after a weak move there is a **הראה המשך מומלץ** button. The board becomes a read-only preview of the engine's full line, with **הבא** / **הקודם**, and **חזור למשחק** restores the position exactly. It sits next to "fix the move".
- **Top 3 moves:** analysis runs Stockfish with `MultiPV` 3 and lists the three best moves in the position with scores. The best arrow is the most prominent. The engine's own moves stay on a single line so playing speed is unchanged.
- **Opening names** in Hebrew from a small ECO list, plus book-move detection.
- **Game summary** with key moments and what to practise, based on your mistake patterns.
- **Play vs. the coach:** 8 levels (about 400 to 2700+), a **hint** button, and a **"why?"** explanation after each of your moves.
- **🔊 Hebrew narrator:** speaks each move, its class and a short explanation through the Web Speech API. It has speed control and an **autoplay** mode. In play mode it announces the coach's move and the feedback on your move.
- Dark, responsive design for desktop and mobile, with keyboard navigation.
- **Private:** everything runs locally in the browser, with no backend and no tracking.

Version 1.2.

## Usage

- **Online:** https://igalyuze23.github.io/hebrew-chess-coach/
- **Offline:** download the repo and double-click `index.html`. It works from `file://` because the engine's WASM file is bundled as base64 in `lib/sf-bundle.js`. Importing games needs internet; analysis doesn't.
- **Hebrew voice on Windows:** Settings → Time & Language → Speech → Manage voices → Add voices → Hebrew, then restart the browser. Edge also ships natural Hebrew online voices.

## Development

The sources are in `src/`. Run `python3 build.py` to regenerate `index.html`, and `python3 build.py --bundle` to also rebuild `lib/sf-bundle.js` from the Stockfish files.

## Credits & licenses

- [Stockfish](https://stockfishchess.org/) via [Stockfish.js 19](https://github.com/nmrugg/stockfish.js) (lite, single-threaded WASM). **GPLv3**.
- [chess.js](https://github.com/jhlywa/chess.js) 0.13.4 by Jeff Hlywa. **BSD-2-Clause**.
- The **cburnett** piece set by Colin M.L. Burnett, via [Lichess](https://github.com/lichess-org/lila). **GPLv2+**.
- The project as a whole is licensed under **GPLv3** (see `LICENSE`) because it bundles Stockfish. Third-party license files are in `lib/`.

> 🤖 Built with the help of AI. Explanations are generated automatically from engine output and may sometimes be imprecise.
