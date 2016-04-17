var _              = require('lodash');
var requestPromise = require('request-promise');
var asyncQ         = require("async-q");
var cheerio        = require('cheerio');

var knex      = require('./database').knex;
var bookshelf = require('./database').bookshelf;
//var ModelBase = require('bookshelf-modelbase')(bookshelf);
//bookshelf.plugin(require('bookshelf-modelbase').pluggable);

var XKCDPage = bookshelf.Model.extend({
  tableName: 'scrape_xkcd'
});
var XKCDCollection = bookshelf.Collection.extend({
  model: XKCDPage
});

class Website {
  constructor() {
  }
  getUrl(id) {
    return this.baseId + id + this.urlPostfix;
  }
  getLatestId() {
    var self = this;
    return requestPromise("https://xkcd.com/").then(function(html) {
      var $ = cheerio.load(html);
      var href = $(".comicNav li a[rel=prev]").attr('href');
      self.latestId = Number(String(href).replace(/\D+/g, '')) + 1;
      return self.latestId;
    })
  }

  getAllIds() {
    return this.getLatestId().then((latestId) => {
      return _(1).range(latestId + 1).without(404).value();
    });
  }
  getAllUrls() {
    return this.getAllIds().then((ids) => {
      return _.map(ids, this.getUrl, this);
    }, this);
  }

  getUndownloadedIds() {
    var self = this;
    return this.getAllIds().then((ids) => {
      return Promise.all(
        ids.map((id) => self.isDownloaded(id))
      )
      .then(function(isDownloaded) {
        var urlHash          = _.zipObject(ids, isDownloaded);
        var undownloadedIds = _(urlHash).omitBy().keys().value();
        return undownloadedIds;
      })
    })
  }

  isDownloaded(id) {
    return this.model.where('id', id).count().then(function(count) {
      return count !== 0;
    });
  }

  scrapeId(id) {
    var self = this;
    return this.parseId(id).then((data) => {
      return self.saveData(data)
    })
  }

  saveData(data) {
    return this.isDownloaded(data.id).then((isDownloaded) => {
      if( isDownloaded ) {
        return new this.model({ id: data.id }).save(data);
      } else {
        return new this.model().save(data);
      }
    });
  }

  scrapeAllUndownloaded() {
    var self = this;
    return this.getUndownloadedIds().then((ids) => {
      return asyncQ.mapSeries(ids, (id) => {
        return self.scrapeId(id).then((model) => {
          console.info("SAVED: ", model.get('id'), model.get('url'));
          return model;
        })
        .catch((error) => {
          console.error("ERROR: ", id, error);
        })
      })
    })
  }
}
class WebsiteXkcd extends Website {
  constructor() {
    super();
    this.baseId     = "https://xkcd.com/";
    this.urlPostfix = "/";
    this.model      = XKCDPage;
  }

  parseId(id) {
    var self = this;
    return requestPromise(this.getUrl(id)).then(function(html) {
      var $ = cheerio.load(html);
      var data = {};
      data.id      = id;
      data.url     = self.getUrl(id);
      data.title   = $("#ctitle").text();
      data.alttext = $("#comic img").attr('title');
      data.image   = $("#comic img").attr('src');
      return data;
    })
  }
}

module.exports = {
  XKCDPage:         XKCDPage,
  XKCDCollection:   XKCDCollection,
  WebsiteXkcdClass: WebsiteXkcd
};
