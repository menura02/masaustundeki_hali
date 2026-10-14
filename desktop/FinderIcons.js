// Executed by /usr/bin/osascript -l JavaScript. Finder is read-only here.
function run() {
  try {
    var finder = Application('Finder');
    var items = finder.desktop.items();
    var icons = [];
    var lastError = null;
    for (var i = 0; i < items.length; i++) {
      try {
        var position = items[i].desktopPosition();
        if (position && position.length === 2 && isFinite(position[0]) && isFinite(position[1])) {
          // Finder desktop positions are icon centers in logical screen points.
          icons.push({ name: items[i].name(), x: position[0], y: position[1], width: 0, height: 0 });
        }
      } catch (error) {
        // A file may disappear between listing the desktop and reading its position.
        if (Number(error.errorNumber) === -1743 || /1743|not authorized|not permitted/i.test(String(error))) throw error;
        lastError = error;
      }
    }
    if(items.length && !icons.length && lastError) throw lastError;
    return JSON.stringify({ available: true, coordinateSpace: 'dip', icons: icons });
  } catch (error) {
    return JSON.stringify({ available: false, coordinateSpace: 'dip', icons: [],
      permissionRequired: Number(error.errorNumber) === -1743 || /not authorized|not permitted|1743/i.test(String(error)),
      error: String(error) });
  }
}
