---
globs: **/*.ts,**/*.tsx
---

# You Might Not Need an Effect

Effects are an escape hatch for syncing with **external systems** (DOM, network, non-React widgets). Remove them when there's no external system involved.

## When NOT to use Effects

### 1. Transforming data for rendering

Calculate derived values directly during render instead of storing in state + Effect.

```js
// Bad
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// Good
const fullName = firstName + ' ' + lastName;
```

### 2. Caching expensive calculations

Use `useMemo` instead of state + Effect.

```js
const visibleTodos = useMemo(() => getFilteredTodos(todos, filter), [todos, filter]);
```

> Measure with `console.time` before memoizing — it's only worth it if >1ms.

### 3. Resetting all state when a prop changes

Pass a `key` to force React to treat it as a different component instance.

```js
// Bad: useEffect(() => { setComment(''); }, [userId]);

// Good
<Profile userId={userId} key={userId} />
```

### 4. Adjusting partial state on prop change

Store the ID (stable) instead of the object (reference changes), or adjust state during render using `prevItems` pattern. Best option: calculate during render.

```js
// Best: no state adjustment needed
const selection = items.find((item) => item.id === selectedId) ?? null;
```

### 5. Sharing logic between event handlers

Extract a shared function; call it from both handlers directly.

```js
// Bad: useEffect watching product.isInCart — fires on page load too

// Good
function buyProduct() { addToCart(product); showNotification(...); }
```

### 6. Sending a POST request triggered by user action

POST requests caused by user interaction belong in event handlers, not Effects.

```js
// Bad: useEffect watching jsonToSubmit state
// Good: post('/api/register', data) directly in handleSubmit
```

> Exception: analytics on component mount (`useEffect(() => post('/analytics/...'), [])`) is fine — it's caused by the component being displayed.

### 7. Chains of Effects

Replace chained Effects with calculations + single event handler logic.

```js
// Bad: 4 chained Effects triggering each other
// Good: calculate isGameOver during render; update all state in handlePlaceCard
```

### 8. Initializing app-level logic once

Use a module-level flag or top-level code instead of an Effect.

```js
let didInit = false;
function App() {
  useEffect(() => {
    if (!didInit) {
      didInit = true;
      loadDataFromLocalStorage();
      checkAuthToken();
    }
  }, []);
}
// Or even simpler — outside the component:
if (typeof window !== 'undefined') {
  checkAuthToken();
  loadDataFromLocalStorage();
}
```

### 9. Notifying parent about state changes

Update both parent and child state in the same event handler, or lift state up.

```js
// Bad: useEffect calling onChange after isOn updates
// Good: call setIsOn(next) and onChange(next) together in updateToggle()
```

### 10. Passing data to a parent

Data should flow **down** (parent → child). Have the parent fetch and pass data to child; don't have child fetch and pass up via Effect.

### 11. Subscribing to external stores

Use `useSyncExternalStore` instead of manual Effect subscriptions.

```js
return useSyncExternalStore(
  subscribe,
  () => navigator.onLine,
  () => true,
);
```

### 12. Fetching data

Fetching in Effects is acceptable, but always add cleanup to avoid race conditions.

```js
useEffect(() => {
  let ignore = false;
  fetchResults(query, page).then((json) => {
    if (!ignore) setResults(json);
  });
  return () => {
    ignore = true;
  };
}, [query, page]);
```

Prefer framework built-in data fetching or a custom `useData(url)` hook over raw Effects.

## Key Rules (Recap)

| Situation                                | Solution                                       |
| ---------------------------------------- | ---------------------------------------------- |
| Derived value from props/state           | Calculate during render                        |
| Expensive calculation                    | `useMemo`                                      |
| Reset all state on prop change           | `key` prop                                     |
| Partial state adjustment on prop change  | Calculate during render or `prevItems` pattern |
| Logic shared across event handlers       | Extract function, call from handlers           |
| User-triggered side effects              | Event handler                                  |
| Component-display-triggered side effects | Effect                                         |
| Multiple state updates                   | Batch in one event handler                     |
| Two state vars in sync                   | Lift state up                                  |
| Data fetching                            | Effect + cleanup (or framework mechanism)      |
| External store subscription              | `useSyncExternalStore`                         |

**Rule of thumb:** If the code runs because a component was _displayed_, use an Effect. If it runs because of a _user action_, use an event handler.
