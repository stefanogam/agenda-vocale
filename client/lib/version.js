// client/lib/version.js
//
// __APP_VERSION__ viene sostituito da Vite in fase di build con il valore
// di "version" in package.json (vedi vite.config.js). Il fallback "dev"
// copre i contesti dove quella sostituzione non avviene, ad esempio i test.

export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
