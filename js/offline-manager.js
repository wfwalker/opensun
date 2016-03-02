function updateFound() {
  var installingWorker = this.installing;

  // Wait for the new service worker to be installed before prompting to update.
  installingWorker.addEventListener('statechange', function() {
    switch (installingWorker.state) {
      case 'installed':
        // Only show the prompt if there is currently a controller so it is not
        // shown on first load.
        if (navigator.serviceWorker.controller &&
            window.confirm('An updated version of ShotClock is available, would you like to update?')) {
          window.location.reload();
          return;
        }
        break;

      case 'redundant':
        console.error('The installing service worker became redundant.');
        break;
    }
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('offline-worker.js').then(function(registration) {
    console.log('offline worker registered');
    registration.addEventListener('updatefound', updateFound);
  });
}
