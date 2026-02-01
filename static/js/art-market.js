(function () {
  'use strict';

  var listingContainer = document.getElementById('listings');
  var emptyState = document.getElementById('empty-state');
  var listingCount = document.getElementById('listing-count');
  var listingValue = document.getElementById('listing-value');
  var searchInput = document.getElementById('search');
  var statusSelect = document.getElementById('status');
  var artistInput = document.getElementById('artist');
  var refreshButton = document.getElementById('refresh');
  var form = document.getElementById('listing-form');
  var formMessage = document.getElementById('form-message');

  function formatCurrency (value, currency) {
    if (value === undefined || value === null || value === '') {
      return 'Pris efter aftale';
    }
    try {
      return new Intl.NumberFormat('da-DK', {
        style: 'currency',
        currency: currency || 'DKK'
      }).format(value);
    } catch (err) {
      return value + ' ' + (currency || 'DKK');
    }
  }

  function statusLabel (status) {
    if (status === 'reserved') {
      return 'Reserveret';
    }
    if (status === 'sold') {
      return 'Solgt';
    }
    return 'Til salg';
  }

  function renderListings (listings) {
    listingContainer.innerHTML = '';
    if (!listings.length) {
      emptyState.hidden = false;
      listingCount.textContent = '0';
      listingValue.textContent = '–';
      return;
    }

    emptyState.hidden = true;

    var totalValue = listings.reduce(function (sum, listing) {
      return sum + (Number(listing.price) || 0);
    }, 0);

    listingCount.textContent = listings.length;
    listingValue.textContent = formatCurrency(totalValue, 'DKK');

    listings.forEach(function (listing) {
      var card = document.createElement('article');
      card.className = 'market__card';

      if (listing.imageUrl) {
        var image = document.createElement('img');
        image.src = listing.imageUrl;
        image.alt = listing.title || 'Kunstværk';
        card.appendChild(image);
      }

      var tag = document.createElement('span');
      tag.className = 'market__tag';
      tag.textContent = statusLabel(listing.status);
      card.appendChild(tag);

      var title = document.createElement('h3');
      title.textContent = listing.title || 'Uden titel';
      card.appendChild(title);

      var artist = document.createElement('p');
      artist.className = 'market__meta';
      artist.textContent = listing.artist || 'Ukendt kunstner';
      card.appendChild(artist);

      var price = document.createElement('p');
      price.className = 'market__price';
      price.textContent = formatCurrency(listing.price, listing.currency);
      card.appendChild(price);

      var meta = document.createElement('p');
      meta.className = 'market__meta';
      var details = [];
      if (listing.year) {
        details.push(listing.year);
      }
      if (listing.medium) {
        details.push(listing.medium);
      }
      if (listing.location) {
        details.push(listing.location);
      }
      meta.textContent = details.join(' • ');
      card.appendChild(meta);

      if (listing.description) {
        var description = document.createElement('p');
        description.textContent = listing.description;
        card.appendChild(description);
      }

      listingContainer.appendChild(card);
    });
  }

  function buildQuery () {
    var params = [];
    if (searchInput.value) {
      params.push('q=' + encodeURIComponent(searchInput.value));
    }
    if (statusSelect.value) {
      params.push('status=' + encodeURIComponent(statusSelect.value));
    }
    if (artistInput.value) {
      params.push('artist=' + encodeURIComponent(artistInput.value));
    }
    return params.length ? '?' + params.join('&') : '';
  }

  function loadListings () {
    listingContainer.parentElement.setAttribute('aria-busy', 'true');
    fetch('/api/v1/art/' + buildQuery())
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Kunne ikke hente annoncer');
        }
        return response.json();
      })
      .then(function (data) {
        renderListings(Array.isArray(data) ? data : []);
      })
      .catch(function () {
        renderListings([]);
        emptyState.textContent = 'Der opstod en fejl ved hentning af data.';
        emptyState.hidden = false;
      })
      .finally(function () {
        listingContainer.parentElement.setAttribute('aria-busy', 'false');
      });
  }

  function resetMessage () {
    formMessage.textContent = '';
  }

  function handleSubmit (event) {
    event.preventDefault();
    resetMessage();

    var formData = new FormData(form);
    var payload = {};

    formData.forEach(function (value, key) {
      if (key === 'apiSecret') {
        return;
      }
      if (value !== '') {
        payload[key] = value;
      }
    });

    if (payload.year) {
      payload.year = Number(payload.year);
    }
    if (payload.price) {
      payload.price = Number(payload.price);
    }

    var apiSecret = formData.get('apiSecret');
    var headers = {
      'Content-Type': 'application/json'
    };
    if (apiSecret) {
      headers['api-secret'] = apiSecret;
    }

    fetch('/api/v1/art/', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Kunne ikke gemme annonce');
        }
        return response.json();
      })
      .then(function () {
        form.reset();
        formMessage.textContent = 'Annonce gemt i databasen.';
        loadListings();
      })
      .catch(function () {
        formMessage.textContent = 'Annonce kunne ikke gemmes. Tjek API-secret og felter.';
        formMessage.style.color = '#b91c1c';
      });
  }

  refreshButton.addEventListener('click', loadListings);
  form.addEventListener('submit', handleSubmit);

  loadListings();
})();
