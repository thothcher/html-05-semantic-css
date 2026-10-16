/* Glossary for the AI-lab prompts.
   A prompt marks a loaded term as [[term]] or [[shown text|key]]. One loaded term replaces a paragraph
   of instructions, but only if you know what it means. "lec" is the lecture that teaches it
   (0 = before the React module). "d" is what the word makes the AI do. Keep each entry to one or two sentences. */
window.DECK_TERMS = {
  /* before React */
  'TypeScript': { lec: 0, d: 'Typed JavaScript. The AI has to write types for props and data, and the build fails when they do not match.' },
  'Tailwind v4': { lec: 0, d: 'Utility classes in JSX. Version 4 is set up in CSS with @import "tailwindcss" and has no tailwind.config.js, so naming the version stops old setup code.' },
  'conventional commits': { lec: 0, d: 'Commit messages like feat: or fix:. The AI suggests one small commit per change.' },

  /* lecture 1: the intro */
  'Vite': { lec: 1, d: 'The build tool and dev server. The AI expects index.html at the root, src/main.tsx as the entry, and npm run dev or npm run build.' },
  'JSX': { lec: 1, d: 'HTML-like syntax inside TypeScript. It brings its own rules: className, every tag closed, one root, values in { }.' },

  /* lecture 2: components and props */
  'component': { lec: 2, d: 'A function with a capital-letter name that returns JSX. Asks for small reusable pieces instead of one long page.' },
  'props': { lec: 2, d: 'The inputs of a component, passed by the parent. Data stays outside the component and comes in through its props.' },
  'typed props': { lec: 2, d: 'A Props type for every component, with no any. A missing or wrong prop becomes a build error, not a bug in the browser.' },
  'children': { lec: 2, d: 'Whatever goes between a component\'s tags. Asks for wrapper components like Section or Card instead of repeated markup.' },
  'ReactNode': { lec: 2, d: 'The type for anything React can render. The correct type for children.' },
  'map': { lec: 2, d: 'Render one component per item of an array. The content lives in data, not in copied JSX.' },
  'key': { lec: 2, d: 'A stable, unique id on every list item, never the index. React uses it to tell items apart between renders.' },
  'named exports': { lec: 2, d: 'export function Hero(), imported with braces. The name is fixed, so imports and renames stay safe.' },
  'one component per file': { lec: 2, d: 'Each component in its own PascalCase .tsx file in src/components. Stops the AI from putting everything in App.tsx.' },
  'optional prop': { lec: 2, d: 'A prop marked with ? that may be missing. The AI must handle the missing case, for example by not rendering a link.' },
  'default value': { lec: 2, d: 'A fallback in the destructuring, like featured = false. The prop stays optional without undefined checks everywhere.' },
  'data file': { lec: 2, d: 'A typed array in src/data. Text, links and images stay out of the components.' },
  'composition': { lec: 2, d: 'Big components built from small ones. App reads like a table of contents.' },
  'netlify.toml': { lec: 2, d: 'Deploy settings committed with the code: build command npm run build, publish folder dist.' },
  'npm run build': { lec: 2, d: 'The production build with a full type check. "Must pass the build" makes the AI fix type errors instead of leaving them.' },

  /* lecture 3: state and events */
  'useState': { lec: 3, d: 'The hook that gives a component memory. Calling the setter makes React render again with the new value.' },
  'event handler': { lec: 3, d: 'A function passed to onClick or onChange. onClick={fn} passes it; onClick={fn()} calls it during render, which is a bug.' },
  'updater function': { lec: 3, d: 'setQty((q) => q + 1). Needed when the next value depends on the previous one, so several updates in a row stay correct.' },
  'immutable updates': { lec: 3, d: 'Never change state in place. New arrays and objects with map, filter and spread; no push, splice, sort or ++ on state.' },
  'controlled input': { lec: 3, d: 'An input with value and onChange that both come from state. React state is the only source of truth for the field.' },
  'lift state up': { lec: 3, d: 'Move state to the closest common parent and pass it down, with callbacks to change it. Two components stay in sync.' },
  'derived state': { lec: 3, d: 'Values calculated during render from existing state, like a filtered list or a total. Never stored in a second useState.' },
  'callback prop': { lec: 3, d: 'A function prop like onAdd(dish). The child asks the parent to change state; it never gets the setter itself.' },
  'conditional rendering': { lec: 3, d: 'Show or hide UI with &&, a ternary or an early return. Covers empty states, badges and disabled buttons.' },
  'SubmitEvent': { lec: 3, d: 'The React 19.2 type for a form submit event. FormEvent is deprecated, so naming it avoids old typings.' },

  /* lecture 4: effects, refs, custom hooks */
  'useEffect': { lec: 4, d: 'Sync a component with something outside React: the network, storage, timers or the DOM. Runs after the render.' },
  'dependency array': { lec: 4, d: 'Every value the effect reads. The effect runs again when one of them changes; [] means once after the first render.' },
  'cleanup': { lec: 4, d: 'The function an effect returns. It undoes what the effect started: abort the request, clear the timer, remove the listener.' },
  'AbortController': { lec: 4, d: 'Cancels a fetch. One controller per effect run, aborted in the cleanup, so an old answer cannot overwrite a new one.' },
  'race condition': { lec: 4, d: 'Two requests at once, and the slow old one answers last and wins. Naming it makes the AI add cancellation.' },
  'res.ok': { lec: 4, d: 'fetch only fails on network errors. Checking res.ok turns 404, 429 and 500 into real errors you can show.' },
  'loading, error and success states': { lec: 4, d: 'Three screens for every request. The AI must render all three, not only the happy path.' },
  'useRef': { lec: 4, d: 'A box that keeps a value between renders without causing one. Used for DOM elements (focus) and for timer ids.' },
  'custom hook': { lec: 4, d: 'A function named useSomething that calls other hooks. Moves effect logic out of components so you can reuse it.' },
  'useLocalStorage': { lec: 4, d: 'A custom hook: useState that reads from and writes to localStorage, so the value survives a refresh.' },
  'useDebounce': { lec: 4, d: 'A custom hook that waits until a value stops changing. Fewer requests while the user types, so the rate limit holds.' },
  'Retry-After': { lec: 4, d: 'A header on a 429 response that says how many seconds to wait before the next try.' },
  'CORS': { lec: 4, d: 'The browser blocks answers from another origin unless the server allows yours. This API allows http://localhost:4200 only.' },
  'OpenAPI': { lec: 4, d: 'The machine-readable spec behind Swagger. The AI copies the real types and paths from it instead of guessing.' },
  'rules of hooks': { lec: 4, d: 'Call hooks only at the top level of a component or custom hook: never in conditions, loops or callbacks.' },
  'eslint-plugin-react-hooks': { lec: 4, d: 'The linter that checks the rules of hooks and the effect dependencies. Asking for zero warnings is a real test.' },
  'StrictMode': { lec: 4, d: 'In development React runs every effect, cleans it up and runs it again, to show effects that forget their cleanup.' },

  /* lecture 5: routing */
  'React Router 8': { lec: 5, d: 'Pins the version: one package, react-router, because react-router-dom no longer exists. Stops old v5 and v6 code.' },
  'declarative mode': { lec: 5, d: 'Routes written as <Routes> and <Route> in JSX inside <BrowserRouter>, not the data router with loaders.' },
  'layout route': { lec: 5, d: 'A parent <Route> with an element and no path. It renders the shared header and footer around an <Outlet />.' },
  'Outlet': { lec: 5, d: 'The place inside a layout where the matching child route renders.' },
  'NavLink': { lec: 5, d: 'A link that knows when its page is open, so the current menu item can be styled from isActive.' },
  'Link': { lec: 5, d: 'Navigation without a page reload. It replaces <a href> for every internal link, so state survives.' },
  'useParams': { lec: 5, d: 'Reads :id and other params from the URL. The values are always strings.' },
  'useSearchParams': { lec: 5, d: 'Reads and writes ?category= and other query values. Filters become URLs you can share and bookmark.' },
  'useNavigate': { lec: 5, d: 'Navigate from code, inside event handlers: after a save, a login or a checkout.' },
  'Navigate': { lec: 5, d: '<Navigate to replace /> redirects during render. Used in guards and for old URLs.' },
  'protected route': { lec: 5, d: 'A wrapper route that renders <Outlet /> for allowed users and redirects everyone else.' },
  'redirect back': { lec: 5, d: 'Save the current location in state.from before sending the user to /login, and return there after the login.' },
  'catch-all route': { lec: 5, d: 'path="*" as the last route. Every unknown URL gets a real 404 page instead of a blank screen.' },
  '_redirects': { lec: 5, d: 'The Netlify file with /* /index.html 200. A refresh on /menu/5 then serves the app instead of a 404.' }
};
