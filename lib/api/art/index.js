'use strict';

var consts = require('../../constants');

function configure (app, wares, ctx) {
  var express = require('express');
  var api = express.Router();

  api.use(wares.sendJSONStatus);
  api.use(wares.bodyParser.raw());
  api.use(wares.bodyParser.json());
  api.use(wares.bodyParser.urlencoded({ extended: true }));

  api.use(ctx.authorization.isPermitted('api:art:read'));

  function buildQuery (req) {
    var query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.artist) {
      query.artist = new RegExp(req.query.artist, 'i');
    }
    if (req.query.title) {
      query.title = new RegExp(req.query.title, 'i');
    }
    if (req.query.q) {
      var keyword = new RegExp(req.query.q, 'i');
      query.$or = [
        { title: keyword },
        { artist: keyword },
        { medium: keyword }
      ];
    }
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) {
        query.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        query.price.$lte = Number(req.query.maxPrice);
      }
    }
    return query;
  }

  api.get('/art/', function (req, res) {
    var query = buildQuery(req);
    ctx.art.list(query, function (err, listings) {
      if (err) {
        res.sendJSONStatus(res, consts.HTTP_INTERNAL_ERROR, 'Mongo Error', err);
        return;
      }
      res.json(listings);
    });
  });

  function configAuthed (app, api, wares, ctx) {
    api.post('/art/', ctx.authorization.isPermitted('api:art:create'), function (req, res) {
      var data = req.body;
      ctx.art.create(data, function (err, created) {
        if (err) {
          res.sendJSONStatus(res, consts.HTTP_INTERNAL_ERROR, 'Mongo Error', err);
          console.log('Error creating art listing');
          console.log(err);
        } else {
          res.json(created);
          console.log('art listing created', created);
        }
      });
    });

    api.put('/art/', ctx.authorization.isPermitted('api:art:update'), function (req, res) {
      var data = req.body;
      ctx.art.save(data, function (err, created) {
        if (err) {
          res.sendJSONStatus(res, consts.HTTP_INTERNAL_ERROR, 'Mongo Error', err);
          console.log('Error saving art listing');
          console.log(err);
        } else {
          res.json(created);
          console.log('art listing saved');
        }
      });
    });

    api.delete('/art/:_id', ctx.authorization.isPermitted('api:art:delete'), function (req, res) {
      ctx.art.remove(req.params._id, function () {
        res.json({});
      });
    });
  }

  if (app.enabled('api')) {
    configAuthed(app, api, wares, ctx);
  }

  return api;
}

module.exports = configure;
