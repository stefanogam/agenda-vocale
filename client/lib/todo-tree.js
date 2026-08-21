// client/lib/todo-tree.js
//
// I to-do sono salvati come elementi "piatti" con un `parent_id`.
// L'albero e la numerazione (1, 1.1, 1.1.2 …) si ricostruiscono qui al
// momento di mostrarli: così spostare o cancellare un'attività non
// obbliga a rinumerare nulla nel database.

// Ordina i fratelli e produce una lista già "appiattita" per il rendering,
// con numero gerarchico e livello di profondità.
export function buildTodoRows(todos) {
  const byParent = new Map();
  for (const t of todos) {
    const key = t.parent_id ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));
  }

  const rows = [];
  (function walk(parentKey, prefix, depth) {
    const children = byParent.get(parentKey) ?? [];
    children.forEach((t, i) => {
      const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      const descendants = countDescendants(byParent, t.id);
      rows.push({ ...t, number, depth, ...descendants });
      walk(t.id, number, depth + 1);
    });
  })("root", "", 0);

  return rows;
}

function countDescendants(byParent, id) {
  let total = 0, done = 0;
  const stack = [...(byParent.get(id) ?? [])];
  while (stack.length) {
    const t = stack.pop();
    total++;
    if (t.done) done++;
    stack.push(...(byParent.get(t.id) ?? []));
  }
  return { childTotal: total, childDone: done };
}

// Tutti i discendenti di un elemento: serve per cancellare un ramo intero
export function descendantIds(todos, rootId) {
  const byParent = new Map();
  for (const t of todos) {
    const key = t.parent_id ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  }
  const ids = [];
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length) {
    const t = stack.pop();
    ids.push(t.id);
    stack.push(...(byParent.get(t.id) ?? []));
  }
  return ids;
}
