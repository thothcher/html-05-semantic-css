# H/05 · Classwork

Two classworks, ~12 minutes each, on **your own restaurant page** from H/04. The second one is done with an AI.
Le Bistro is the lecturer's demo — look at it for the pattern, don't copy it.

---

## Classwork 1 · Semantic rewrite (slide 12, before break)

Take the page you built in H/04 and replace every `<div>` with the right semantic element. No CSS yet — structure and meaning only.

### Base (everyone)

Open your `index.html` from H/04 and make these changes:

1. Wrap the logo / site name and navigation in `<header>`.
2. Put your navigation links inside `<nav>` → `<ul>` → `<li>` → `<a>`.
3. Wrap all main content in `<main>`.
4. Wrap the menu section in `<article>` (it is a self-contained piece of content).
5. Split the menu into two `<section>` blocks (for example: Starters and Mains). Each section needs a heading.
6. Replace the "About us" block with `<aside>` only if it is supplementary — use `<section>` if it is a primary part of the page.
7. Close the page with `<footer>` holding the copyright line.

If your page was already using semantic elements from H/04 (well done) — your job is to verify the nesting is correct and add `aria-label` to `<nav>`.

### Plus

- Add `aria-label="Main navigation"` to `<nav>`.
- Move the reservation link into the `<nav>`.
- Add an `<aside>` with opening hours alongside the menu.
- Make sure every `<section>` has a direct child heading (`<h2>` or `<h3>`).

### Pro

- Install the **axe DevTools** browser extension (free). Run it on your page and fix every issue it reports.
- Open DevTools → Elements → Accessibility panel. Screenshot the landmark tree and the heading outline.
- Navigate the page with only the keyboard. Can you jump directly to `<main>` without tabbing through the nav?

### Done when

- [ ] `<header>`, `<nav>`, `<main>`, `<footer>` are all present
- [ ] Navigation links are in `<ul>` → `<li>` → `<a>` inside `<nav>`
- [ ] `<main>` appears exactly once
- [ ] Every `<section>` has a heading
- [ ] Zero W3C validation errors

### Common problems (for the lecturer)

| Problem | Fix |
|---|---|
| `<section>` wrapped around everything, no heading | A section always needs a heading. Without one, use `<div>` or `<article>` |
| `<main>` used twice | Only one `<main>` per page, ever |
| `<article>` around every list item | An article is a standalone piece, not a list item. Each dish is an `<li>`, not an `<article>` |
| `<aside>` for the "About us" block | Only if About Us is supplementary to the menu. If it is a primary page section, use `<section>` |
| Nav outside header | Fine — `<nav>` can appear outside `<header>`. Position is a CSS concern, not an HTML one |

---

## Classwork 2 · First stylesheet with AI (slide 20, after break)

Your page looks like a browser default. Give it a personality. This time you write the prompt — the AI writes the first draft — and you read, verify, and adjust every rule.

Any AI tool works: Claude, ChatGPT, Copilot Chat.

### The task

- **Base:** A linked external stylesheet (`style.css`). Body font and background. Styled headings. Styled links with a hover state. A styled footer.
- **Plus:** A `.special` class for one dish. `nav a` styled differently from body links. A focused button outline.
- **Pro:** An `#hours` section with a distinct background. `li:last-child` styled. All headings share a `font-family` via a grouped selector.

### Your prompt, in five parts (CRAFT)

| | Part | What to write |
|---|---|---|
| C | **Context** | Your restaurant page: plain HTML, semantic structure, no CSS yet. Paste the full HTML. |
| R | **Role** | "A CSS teacher who writes clean, minimal CSS for a beginner." |
| A | **Action** | The Base task in your own words. Ask for Plus and Pro as follow-up prompts. |
| F | **Format** | "One `style.css` file, complete. Add a short comment above each selector group explaining what it targets." |
| T | **Target** | "I am in my first CSS week. Keep selectors simple. No frameworks, no variables, no `flex` or `grid` yet." |

### A sample prompt (Le Bistro)

```text
CONTEXT
Restaurant page for "Le Bistro", a French brasserie in Tbilisi.
The HTML uses semantic elements: header, nav, main, article, section, aside, footer.
No CSS exists yet. (full HTML pasted here)

ROLE
A CSS teacher who writes clean, minimal CSS for a beginner.

ACTION
Write a style.css that:
- sets body font to Georgia and background to #faf9f6
- styles h1 and h2 with color #1a1a1a
- styles all a links: no underline, color #c84718; a:hover adds underline
- gives footer a dark background (#1a1a1a) with white text

FORMAT
One style.css file, complete, with its path.
A short comment above each selector group.
No new libraries, no CSS variables, no flex or grid.

TARGET
I am in my first CSS week. Keep selectors simple and explain
each new property in a comment.
```

### The rules

1. **Read every line** before you add it to your file. If you can't explain it, ask the AI to explain it — don't skip it.
2. **Run it.** If the style doesn't apply, the next prompt is: "The selector `X` is not working. My HTML looks like this: (paste relevant HTML)."
3. **One step at a time.** Base only in the first prompt. Plus and Pro as separate follow-up prompts.
4. **Log it in `AI.md`:** your prompt, what the AI produced, one thing you changed and why.

### Done when

- [ ] `style.css` is linked from `<head>` with a `<link>` tag
- [ ] The page looks visibly different from the browser default
- [ ] At least two class selectors used
- [ ] At least one pseudo-class (`:hover` or `:focus-visible`) used
- [ ] You can explain every rule in your file

### What the AI tends to get wrong here (for the lecturer)

| The AI writes | The follow-up prompt |
|---|---|
| CSS variables (`--color-brand`) | "No CSS variables yet. Use plain hex values." |
| `flex` or `grid` layout | "No flex or grid yet. Only font, color, background, margin, padding." |
| `!important` anywhere | "Remove all `!important`. Use more specific selectors if needed." |
| Internal `<style>` block instead of a file | "Write a separate `style.css` file, linked from `<head>` with `<link rel='stylesheet' href='style.css'>`." |
| Hundreds of rules for everything | "Keep it to 15–20 rules maximum. Style only what I asked for." |

### What a good answer looks like

The Base result for Le Bistro — to check what the AI produced.

```css
/* body: base font and background colour */
body {
  font-family: Georgia, serif;
  background-color: #faf9f6;
  color: #1a1a1a;
  margin: 0;
  padding: 0 24px;
}

/* headings: shared colour */
h1, h2 {
  color: #1a1a1a;
}

/* links: remove underline, brand colour */
a {
  color: #c84718;
  text-decoration: none;
}

/* links: underline on hover for clarity */
a:hover {
  text-decoration: underline;
}

/* footer: dark background, light text */
footer {
  background-color: #1a1a1a;
  color: #ffffff;
  padding: 24px;
  margin-top: 48px;
}

footer a {
  color: #f0c080;
}
```

#### Plus addition

```css
/* .special: highlight a featured dish */
.special {
  color: #c84718;
  font-weight: 600;
}

/* nav links: different style from body links */
nav a {
  color: #1a1a1a;
  font-weight: 600;
  margin-right: 16px;
}

nav a:hover {
  color: #c84718;
}

/* button: visible focus ring for keyboard users */
button:focus-visible {
  outline: 3px solid #c84718;
  outline-offset: 2px;
}
```
