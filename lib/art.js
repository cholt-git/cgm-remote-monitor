'use strict';

function storage (env, ctx) {
  var ObjectID = require('mongodb').ObjectID;

  function normalizePrice (value) {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    var normalized = Number(value);
    return Number.isNaN(normalized) ? undefined : normalized;
  }

  function normalizeListing (obj) {
    var listing = obj || {};
    var price = normalizePrice(listing.price);
    if (price !== undefined) {
      listing.price = price;
    }
    listing.status = listing.status || 'available';
    listing.currency = listing.currency || 'DKK';
    return listing;
  }

  function create (obj, fn) {
    var listing = normalizeListing(obj);
    listing.created_at = (new Date()).toISOString();
    api().insert(listing, function (err, doc) {
      fn(err, doc && doc.ops ? doc.ops : []);
    });
  }

  function save (obj, fn) {
    var listing = normalizeListing(obj);
    listing._id = new ObjectID(listing._id);
    if (!listing.created_at) {
      listing.created_at = (new Date()).toISOString();
    }
    listing.updated_at = (new Date()).toISOString();
    api().save(listing, function (err, doc) {
      fn(err, doc);
    });
  }

  function list (query, fn) {
    var filter = query || {};
    return api().find(filter).sort({ created_at: -1 }).toArray(fn);
  }

  function remove (_id, fn) {
    return api().remove({ '_id': new ObjectID(_id) }, fn);
  }

  function api () {
    return ctx.store.collection(env.art_collection);
  }

  api.list = list;
  api.create = create;
  api.save = save;
  api.remove = remove;
  api.indexedFields = ['status', 'artist', 'created_at'];
  return api;
}

module.exports = storage;
