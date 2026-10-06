// Component settings chosen by the brand team in the Brand Console.
// "#settings" is a package import (see "imports" in package.json). Apps get dist/settings.json, the live version.
// Storybook and the component tests point it at build/draft/settings.json, so you see the draft while you work.
import settings from "#settings";
/** Returns the brand team's settings for one component, like comp("radio").style. */
export function comp(id) { return (settings.components && settings.components[id]) || {}; }
