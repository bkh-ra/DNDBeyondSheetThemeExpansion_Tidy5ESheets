// DDB-FORK: mechanical rename only (asset URL); no behaviour change
const loaded = new Set<string>();

let style: HTMLStyleElement;

export function loadConditionalStyles(fileName: string) {
  if (import.meta.env.DEV) {
    // Skip importing transpiled/chunked CSS, because it doesn't exist when using the dev server.
    return;
  }

  const importDeclaration = `@import url('modules/ddb5e-sheets/${fileName}.css') layer(modules);`;

  if (loaded.has(importDeclaration)) {
    return;
  }

  loaded.add(importDeclaration);

  const style = getOrCreateStyleTag();
  style.innerHTML += importDeclaration + ' \n';
}

function getOrCreateStyleTag() {
  if (!style) {
    style = document.createElement('style');
    style.id = 'tidy5e-sheet-dynamic-style-imports';
    document.head.appendChild(style);
  }

  return style;
}
