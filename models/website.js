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

class WebsiteXkcdClass {
  constructor(options) {
  }

  getCurrentId() {
    var self = this;
    return requestPromise("https://xkcd.com/").then(function(html) {
      var $ = cheerio.load(html);
      var href = $(".comicNav li a[rel=prev]").attr('href');
      self.currentId = Number(String(href).replace(/\D+/g, '')) + 1;
      return self.currentId;
    })
  }

  getAllUrls() {
    var self = this;
    return this.getCurrentId().then((currentId) => {
      self.urls = _(1).range(currentId + 1).without(404)
      .map(function(id) {
        return "https://xkcd.com/" + id + "/";
      })
      .value();
      return self.urls;
    });
  }

  getUndownloadedUrls() {
    var self = this;
    return this.getAllUrls().then((urls) => {
      return Promise.all(
        urls.map((url) => self.isDownloaded(url))
      )
      .then(function(isDownloaded) {
        var urlHash          = _.zipObject(urls, isDownloaded);
        var undownloadedUrls = _(urlHash).omitBy().keys().value();
        return undownloadedUrls;
      })
    })
  }

  isDownloaded(url) {
    return XKCDPage.where('url', url).count().then(function(count) {
      return count !== 0;
    });
  }

  parseUrl(url) {
    var self = this;
    return requestPromise(url).then(function(html) {
      var $ = cheerio.load(html);
      var data = {};
      data.id      = Number(url.replace(/\D+/g, ''));
      data.url     = url;
      data.title   = $("#ctitle").text();
      data.alttext = $("#comic img").attr('title');
      data.image   = $("#comic img").attr('src');
      return data;
    })
  }

  saveUrl(url) {
    var self = this;
    return this.parseUrl(url).then((data) => {
      return self.save(data)
    })
  }

  save(data) {
    return this.isDownloaded(data.url).then((isDownloaded) => {
      if( isDownloaded ) {
        return new XKCDPage({ id: data.id }).save(data);
      } else {
        return new XKCDPage().save(data);
      }
    });
  }

  scrapeAllUndownloaded() {
    var self = this;
    return this.getUndownloadedUrls().then((urls) => {
      return asyncQ.mapSeries(urls, (url) => {
        return self.saveUrl(url).then((model) => {
          console.info("SAVED: ", model.get('url'));
          return model;
        })
        .catch((error) => {
          console.error("ERROR: ", url, error);
        })
      })
    })
  }
}

module.exports = {
  XKCDPage:         XKCDPage,
  XKCDCollection:   XKCDCollection,
  WebsiteXkcdClass: WebsiteXkcdClass
};
